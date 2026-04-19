const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");

// Body text varies by certificate type
const BODY_TEXT = {
  "Certificate of Completion":    "has successfully completed the course",
  "Certificate of Appreciation":  "is hereby recognised and appreciated for",
  "Certificate of Attendance":    "has attended and participated in",
  "Certificate of Achievement":   "is hereby recognised for outstanding achievement in",
  "Certificate of Excellence":    "has demonstrated exemplary excellence in",
  "Certificate of Participation": "has actively participated in",
};

function generateCertificate({ studentName, course, issuer, hash, certificateType }) {
  // Fallback to Completion if type not provided (backwards compat)
  const certType = certificateType || "Certificate of Completion";
  const bodyText = BODY_TEXT[certType] || "has successfully completed";

  return new Promise((resolve, reject) => {
    const dir = path.join(__dirname, "certificates");
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const filePath = path.join(dir, `cert-${Date.now()}.pdf`);
    const doc = new PDFDocument({ size: "A4", layout: "landscape", margin: 60 });
    const stream = fs.createWriteStream(filePath);

    doc.pipe(stream);

    const W = doc.page.width;
    const H = doc.page.height;

    // Background
    doc.rect(0, 0, W, H).fill("#0a0e1a");

    // Outer border
    doc.rect(20, 20, W - 40, H - 40).lineWidth(2).stroke("#c9a84c");
    // Inner border
    doc.rect(30, 30, W - 60, H - 60).lineWidth(0.5).stroke("#c9a84c");

    // Corner ornaments
    [[40, 40], [W - 40, 40], [40, H - 40], [W - 40, H - 40]].forEach(([x, y]) => {
      doc.circle(x, y, 5).fill("#c9a84c");
    });

    // Header ribbon
    doc.rect(40, 40, W - 80, 60).fill("#1a2035");

    // ── Certificate Type Title ──
    doc
      .fillColor("#c9a84c")
      .fontSize(26)
      .font("Helvetica-Bold")
      .text(certType.toUpperCase(), 0, 58, { align: "center" });

    // Subtitle line
    doc
      .moveTo(W / 2 - 160, 113)
      .lineTo(W / 2 + 160, 113)
      .lineWidth(1)
      .stroke("#c9a84c");

    // "This certifies that"
    doc
      .fillColor("#8899bb")
      .fontSize(13)
      .font("Helvetica")
      .text("This is to certify that", 0, 128, { align: "center" });

    // Student Name
    doc
      .fillColor("#ffffff")
      .fontSize(36)
      .font("Helvetica-Bold")
      .text(studentName, 0, 152, { align: "center" });

    // Underline below name
    const nameWidth = doc.widthOfString(studentName, { fontSize: 36 });
    const nameX = (W - nameWidth) / 2;
    doc
      .moveTo(nameX - 10, 197)
      .lineTo(nameX + nameWidth + 10, 197)
      .lineWidth(1)
      .stroke("#c9a84c");

    // ── Dynamic body text ──
    doc
      .fillColor("#8899bb")
      .fontSize(13)
      .font("Helvetica")
      .text(bodyText, 0, 212, { align: "center" });

    // Course / Event / Reason
    doc
      .fillColor("#c9a84c")
      .fontSize(22)
      .font("Helvetica-Bold")
      .text(course, 60, 235, { align: "center", width: W - 120 });

    // Divider
    doc
      .moveTo(W / 2 - 200, 278)
      .lineTo(W / 2 + 200, 278)
      .lineWidth(0.5)
      .strokeColor("#3a4060")
      .stroke();

    // Issuer
    doc
      .fillColor("#8899bb")
      .fontSize(11)
      .font("Helvetica")
      .text("Issued by", W / 2 - 200, 292, { width: 180, align: "center" });

    doc
      .fillColor("#ffffff")
      .fontSize(14)
      .font("Helvetica-Bold")
      .text(issuer, W / 2 - 200, 310, { width: 180, align: "center" });

    // Date
    const issueDate = new Date().toLocaleDateString("en-US", {
      year: "numeric", month: "long", day: "numeric",
    });

    doc
      .fillColor("#8899bb")
      .fontSize(11)
      .font("Helvetica")
      .text("Date of Issue", W / 2 + 20, 292, { width: 180, align: "center" });

    doc
      .fillColor("#ffffff")
      .fontSize(14)
      .font("Helvetica-Bold")
      .text(issueDate, W / 2 + 20, 310, { width: 180, align: "center" });

    // Blockchain seal
    doc.rect(40, H - 130, W - 80, 80).fill("#0f1525");
    doc.rect(41, H - 129, W - 82, 78).lineWidth(0.5).stroke("#3a4060");

    doc
      .fillColor("#c9a84c")
      .fontSize(9)
      .font("Helvetica-Bold")
      .text("⛓  BLOCKCHAIN VERIFIED", 0, H - 120, { align: "center" });

    doc
      .fillColor("#4a5580")
      .fontSize(7.5)
      .font("Helvetica")
      .text("Certificate Hash (SHA-256):", 0, H - 106, { align: "center" });

    doc
      .fillColor("#6a7aaa")
      .fontSize(7)
      .font("Helvetica")
      .text(`Hash: ${hash}`, 60, H - 94, { align: "center", width: W - 120 });

    doc.end();

    stream.on("finish", () => resolve(filePath));
    stream.on("error", reject);
  });
}

module.exports = generateCertificate;