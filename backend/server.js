const express = require("express");
const cors = require("cors");
const multer = require("multer");
const crypto = require("crypto");
const fs = require("fs");
const contract = require("./contract");
const generateCertificate = require("./generateCertificate");
const pdfParse = require("pdf-parse");

const app = express();

app.use(cors());
app.use(express.json());

const upload = multer({ dest: "uploads/" });

const txStore = {};

app.get("/", (req, res) => {
  res.json({ status: "Blockchain Certificate API running", version: "1.0.0" });
});

/* ─────────────────────────────────────────
   ISSUE CERTIFICATE
───────────────────────────────────────── */
app.post("/issue-certificate", async (req, res) => {
  try {
    const { studentName, course, issuer, certificateType } = req.body;

    if (!studentName || !course || !issuer) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    const hash = crypto
      .createHash("sha256")
      .update(studentName + course + issuer + Date.now())
      .digest("hex");

    // Pass placeholder txHash — real hash stored in txStore after mining
    const tx = await contract.issueCertificate(hash, studentName, course, issuer, "pending");
    await tx.wait();

    txStore[hash] = tx.hash;

    const filePath = await generateCertificate({
      studentName,
      course,
      issuer,
      hash,
      certificateType,  // passed to PDF generator
    });

    res.download(filePath, `${(certificateType || "Certificate").replace(/\s+/g, "_")}-${studentName.replace(/\s+/g, "_")}.pdf`);
  } catch (err) {
    console.error("Issue error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ─────────────────────────────────────────
   VERIFY PDF FILE
───────────────────────────────────────── */
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
      cert = await contract.getCertificate(hash);
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
        course: cert[1],
        issuer: cert[2],
        issueDate: cert[3].toString(),
      },
      txHash: txStore[hash] || "N/A",
    });
  } catch (err) {
    console.error("Verify file error:", err);
    res.status(500).json({ valid: false, message: err.message });
  }
});

/* ─────────────────────────────────────────
   VERIFY BY HASH
───────────────────────────────────────── */
app.post("/verify-certificate-hash", async (req, res) => {
  try {
    const { hash } = req.body;

    if (!hash || !/^[a-f0-9]{64}$/i.test(hash)) {
      return res.status(400).json({ valid: false, message: "Invalid hash format" });
    }

    let cert;
    try {
      cert = await contract.getCertificate(hash);
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
        course: cert[1],
        issuer: cert[2],
        issueDate: cert[3].toString(),
      },
      txHash: txStore[hash] || "N/A",
    });
  } catch (err) {
  console.error("Verify file error:", err);

  return res.json({
    valid: false,
    message: "The certificate is invalid or has been revoked"
  });
}
});

/* ─────────────────────────────────────────
   REVOKE CERTIFICATE
───────────────────────────────────────── */
app.post("/revoke-certificate", async (req, res) => {
  try {
    const { hash } = req.body;

    if (!hash) {
      return res.status(400).json({ success: false, message: "Hash is required" });
    }

    const tx = await contract.revokeCertificate(hash);
    await tx.wait();

    return res.json({ success: true, txHash: tx.hash, message: "Certificate revoked successfully" });
  } catch (err) {
    console.error("Revoke error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
