require("dotenv").config();

const express = require("express");
const cors    = require("cors");
const multer  = require("multer");
const crypto  = require("crypto");
const fs      = require("fs");

const contract          = require("./contract");
const generateCertificate = require("./generateCertificate");
const pdfParse          = require("pdf-parse");

const app = express();

// ── CORS ────────────────────────────────────────────────────────────────────
// Allow your Vercel frontend URL + localhost for dev.
// Set FRONTEND_URL env var on Render to your Vercel URL, e.g. https://certchain.vercel.app
const ALLOWED_ORIGINS = [
  "http://localhost:3000",
  "http://localhost:5173",
  process.env.FRONTEND_URL,        // set this on Render
].filter(Boolean);

app.use(cors({
  origin: (origin, cb) => {
    // Allow requests with no origin (curl, Postman) and allowed origins
    if (!origin || ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
    cb(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
}));

app.use(express.json());

const upload = multer({ dest: "uploads/", limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB max

// In-memory tx store (replace with DB for persistence across restarts)
const txStore = {};

// ── Health check ────────────────────────────────────────────────────────────
app.get("/", (req, res) => {
  res.json({ status: "CertChain API running", network: "Sepolia", version: "1.0.0" });
});

// ── Retry helper ────────────────────────────────────────────────────────────
// Render cold starts + Sepolia can cause the first tx to time out. Retry once.
async function withRetry(fn, retries = 2) {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (err) {
      const isLastAttempt = i === retries - 1;
      if (isLastAttempt) throw err;
      console.warn(`Attempt ${i + 1} failed, retrying... (${err.message})`);
      await new Promise((r) => setTimeout(r, 2000)); // wait 2s before retry
    }
  }
}

/* ─────────────────────────────────────────────────────────────────────────
   ISSUE CERTIFICATE
───────────────────────────────────────────────────────────────────────── */
app.post("/issue-certificate", async (req, res) => {
  try {
    const { studentName, course, issuer, certificateType } = req.body;

    if (!studentName?.trim() || !course?.trim() || !issuer?.trim()) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    const hash = crypto
      .createHash("sha256")
      .update(studentName + course + issuer + Date.now())
      .digest("hex");

    console.log(`📝 Issuing certificate for ${studentName} | hash: ${hash.slice(0, 16)}...`);

    // Send transaction with retry
    const tx = await withRetry(() =>
      contract.issueCertificate(hash, studentName, course, issuer, "pending")
    );

    console.log(`⏳ TX sent: ${tx.hash} — waiting for confirmation...`);
    await tx.wait(1); // wait for 1 confirmation on Sepolia
    console.log(`✅ Confirmed: ${tx.hash}`);

    txStore[hash] = tx.hash;

    const filePath = await generateCertificate({
      studentName,
      course,
      issuer,
      hash,
      certificateType,
    });

    const filename = `${(certificateType || "Certificate").replace(/\s+/g, "_")}-${studentName.replace(/\s+/g, "_")}.pdf`;
    res.download(filePath, filename, (err) => {
      if (err) console.error("Download error:", err);
      // Clean up generated file after sending
      fs.unlink(filePath, () => {});
    });

  } catch (err) {
    console.error("Issue error:", err);
    res.status(500).json({ success: false, message: err.message || "Failed to issue certificate" });
  }
});

/* ─────────────────────────────────────────────────────────────────────────
   VERIFY PDF FILE
───────────────────────────────────────────────────────────────────────── */
app.post("/verify-certificate-file", upload.single("certificate"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ valid: false, message: "No file uploaded" });
    }

    const fileBuffer = fs.readFileSync(req.file.path);
    const data = await pdfParse(fileBuffer);
    fs.unlinkSync(req.file.path);

    const text = data.text;
    const match = text.match(/Hash:\s*([a-f0-9]{64})/i) || text.match(/([a-f0-9]{64})/i);

    if (!match) {
      return res.json({ valid: false, message: "No certificate hash found in PDF" });
    }

    const hash = match[1] || match[0];

    let cert;
    try {
      cert = await withRetry(() => contract.getCertificate(hash));
    } catch {
      return res.json({ valid: false, message: "Certificate not found on blockchain" });
    }

    if (!cert || !cert[4]) {
      return res.json({ valid: false, message: "Certificate has been revoked or is invalid" });
    }

    return res.json({
      valid: true,
      hash,
      data: {
        studentName: cert[0],
        course:      cert[1],
        issuer:      cert[2],
        issueDate:   cert[3].toString(),
      },
      txHash: txStore[hash] || "N/A",
    });
  } catch (err) {
    console.error("Verify file error:", err);
    res.status(500).json({ valid: false, message: err.message });
  }
});

/* ─────────────────────────────────────────────────────────────────────────
   VERIFY BY HASH
───────────────────────────────────────────────────────────────────────── */
app.post("/verify-certificate-hash", async (req, res) => {
  try {
    const { hash } = req.body;

    if (!hash || !/^[a-f0-9]{64}$/i.test(hash)) {
      return res.status(400).json({ valid: false, message: "Invalid hash — must be 64 hex characters" });
    }

    let cert;
    try {
      cert = await withRetry(() => contract.getCertificate(hash));
    } catch {
      return res.json({ valid: false, message: "Certificate not found on blockchain" });
    }

    if (!cert || !cert[4]) {
      return res.json({ valid: false, message: "Certificate has been revoked or is invalid" });
    }

    return res.json({
      valid: true,
      hash,
      data: {
        studentName: cert[0],
        course:      cert[1],
        issuer:      cert[2],
        issueDate:   cert[3].toString(),
      },
      txHash: txStore[hash] || "N/A",
    });
  } catch (err) {
    console.error("Verify hash error:", err);
    res.status(500).json({ valid: false, message: err.message });
  }
});

/* ─────────────────────────────────────────────────────────────────────────
   REVOKE CERTIFICATE
───────────────────────────────────────────────────────────────────────── */
app.post("/revoke-certificate", async (req, res) => {
  try {
    const { hash } = req.body;

    if (!hash) {
      return res.status(400).json({ success: false, message: "Hash is required" });
    }

    const tx = await withRetry(() => contract.revokeCertificate(hash));
    await tx.wait(1);

    return res.json({ success: true, txHash: tx.hash, message: "Certificate revoked successfully" });
  } catch (err) {
    console.error("Revoke error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── Start ───────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ CertChain API running on port ${PORT}`);
});