require("dotenv").config();

const express = require("express");
const cors    = require("cors");
const multer  = require("multer");
const crypto  = require("crypto");
const fs      = require("fs");
const https   = require("https");

const { makeContract, makeProvider } = require("./contract");
const generateCertificate = require("./generateCertificate");
const pdfParse = require("pdf-parse");

const app = express();

// ── CORS ──────────────────────────────────────────────────────────────────
const ALLOWED_ORIGINS = [
  "http://localhost:3000",
  "http://localhost:5173",
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || ALLOWED_ORIGINS.some(o => origin.startsWith(o))) return cb(null, true);
    // In case you forgot to set FRONTEND_URL, allow all *.vercel.app origins
    if (origin.endsWith(".vercel.app")) return cb(null, true);
    cb(new Error(`CORS blocked: ${origin}`));
  },
  credentials: true,
}));

app.use(express.json());
const upload = multer({ dest: "uploads/", limits: { fileSize: 10 * 1024 * 1024 } });
const txStore = {};

// ── Retry helper ──────────────────────────────────────────────────────────
async function withRetry(fn, retries = 3, delayMs = 3000) {
  let lastErr;
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      console.warn(`⚠️  Attempt ${i + 1}/${retries} failed: ${err.message}`);
      if (i < retries - 1) await new Promise(r => setTimeout(r, delayMs));
    }
  }
  throw lastErr;
}

// ── Health check ──────────────────────────────────────────────────────────
app.get("/", (req, res) => {
  res.json({ status: "CertChain API running", network: "Sepolia", version: "1.0.0" });
});

// ── DIAGNOSTIC endpoint — call this first to confirm connectivity ─────────
// GET https://your-backend.onrender.com/diagnose
app.get("/diagnose", async (req, res) => {
  const results = {
    env: {
      ALCHEMY_URL_length: (process.env.ALCHEMY_URL || "").length,
      ALCHEMY_URL_prefix: (process.env.ALCHEMY_URL || "").slice(0, 45) + "...",
      PRIVATE_KEY_exists: !!(process.env.PRIVATE_KEY || "").trim(),
      FRONTEND_URL: process.env.FRONTEND_URL || "(not set)",
    },
    blockchain: null,
    error: null,
  };

  try {
    const provider = makeProvider();
    const block = await provider.getBlockNumber();
    const contract = makeContract();
    results.blockchain = {
      connected: true,
      latestBlock: block,
      contractAddress: contract.address,
    };
  } catch (err) {
    results.error = err.message;
    results.blockchain = { connected: false };
  }

  res.json(results);
});

/* ──────────────────────────────────────────────────────────────────────────
   ISSUE CERTIFICATE
────────────────────────────────────────────────────────────────────────── */
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

    console.log(`📝 Issuing for ${studentName} — hash prefix: ${hash.slice(0, 16)}...`);

    // Fresh contract instance per request
    const contract = makeContract();

    const tx = await withRetry(() =>
      contract.issueCertificate(hash, studentName, course, issuer, "pending")
    );

    console.log(`⏳ TX submitted: ${tx.hash}`);
    const receipt = await tx.wait(1);
    console.log(`✅ Confirmed in block ${receipt.blockNumber}`);

    txStore[hash] = tx.hash;

    const filePath = await generateCertificate({ studentName, course, issuer, hash, certificateType });
    const filename = `${(certificateType || "Certificate").replace(/\s+/g, "_")}-${studentName.replace(/\s+/g, "_")}.pdf`;

    res.download(filePath, filename, (err) => {
      if (err) console.error("Download error:", err.message);
      fs.unlink(filePath, () => {});
    });

  } catch (err) {
    console.error("❌ Issue error:", err.message);
    // Give a helpful message if it's a network error
    const msg = err.code === "NETWORK_ERROR"
      ? "Cannot reach Sepolia network. Check ALCHEMY_URL env var on Render."
      : err.message;
    res.status(500).json({ success: false, message: msg });
  }
});

/* ──────────────────────────────────────────────────────────────────────────
   VERIFY PDF FILE
────────────────────────────────────────────────────────────────────────── */
app.post("/verify-certificate-file", upload.single("certificate"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ valid: false, message: "No file uploaded" });

    const buf = fs.readFileSync(req.file.path);
    const { text } = await pdfParse(buf);
    fs.unlinkSync(req.file.path);

    const match = text.match(/Hash:\s*([a-f0-9]{64})/i) || text.match(/([a-f0-9]{64})/i);
    if (!match) return res.json({ valid: false, message: "No certificate hash found in PDF" });

    const hash = match[1] || match[0];
    const contract = makeContract();

    let cert;
    try {
      cert = await withRetry(() => contract.getCertificate(hash));
    } catch {
      return res.json({ valid: false, message: "Certificate not found on blockchain" });
    }

    if (!cert?.[4]) return res.json({ valid: false, message: "Certificate has been revoked or marked invalid by the issuing authority." });

    return res.json({
      valid: true, hash,
      data: { studentName: cert[0], course: cert[1], issuer: cert[2], issueDate: cert[3].toString() },
      txHash: txStore[hash] || "N/A",
    });
  } catch (err) {
    console.error("❌ Verify file error:", err.message);
    res.status(500).json({ valid: false, message: err.message });
  }
});

/* ──────────────────────────────────────────────────────────────────────────
   VERIFY BY HASH
────────────────────────────────────────────────────────────────────────── */
app.post("/verify-certificate-hash", async (req, res) => {
  try {
    const { hash } = req.body;
    if (!hash || !/^[a-f0-9]{64}$/i.test(hash))
      return res.status(400).json({ valid: false, message: "Invalid hash — must be 64 hex characters" });

    const contract = makeContract();
    let cert;
    try {
      cert = await withRetry(() => contract.getCertificate(hash));
    } catch {
      return res.json({ valid: false, message: "Certificate not found on blockchain" });
    }

    if (!cert?.[4]) return res.json({ valid: false, message: "Certificate has been revoked or marked invalid by the issuing authority." });

    return res.json({
      valid: true, hash,
      data: { studentName: cert[0], course: cert[1], issuer: cert[2], issueDate: cert[3].toString() },
      txHash: txStore[hash] || "N/A",
    });
  } catch (err) {
    console.error("❌ Verify hash error:", err.message);
    res.status(500).json({ valid: false, message: err.message });
  }
});

/* ──────────────────────────────────────────────────────────────────────────
   REVOKE CERTIFICATE
────────────────────────────────────────────────────────────────────────── */
app.post("/revoke-certificate", async (req, res) => {
  try {
    const { hash } = req.body;
    if (!hash) return res.status(400).json({ success: false, message: "Hash is required" });

    const contract = makeContract();
    const tx = await withRetry(() => contract.revokeCertificate(hash));
    await tx.wait(1);

    return res.json({ success: true, txHash: tx.hash, message: "Certificate revoked successfully" });
  } catch (err) {
    console.error("❌ Revoke error:", err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`✅ CertChain API on port ${PORT}`));