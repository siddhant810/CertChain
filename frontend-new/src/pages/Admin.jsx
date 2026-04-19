import { useState } from "react";
import "./Admin.css";

const API = "https://certchain-backend-veyk.onrender.com";

const CERT_TYPES = [
  { value: "Certificate of Completion",    icon: "🎓", desc: "Awarded upon finishing a course or program" },
  { value: "Certificate of Appreciation",  icon: "🏅", desc: "Recognizes outstanding contribution or service" },
  { value: "Certificate of Attendance",    icon: "📋", desc: "Confirms participation in an event or session" },
  { value: "Certificate of Achievement",   icon: "🏆", desc: "Honours exceptional performance or accomplishment" },
  { value: "Certificate of Excellence",    icon: "⭐", desc: "For exemplary work or top-rank distinction" },
  { value: "Certificate of Participation", icon: "🤝", desc: "Acknowledges active involvement in an activity" },
];

export default function Admin() {
  const [form, setForm] = useState({ studentName: "", course: "", issuer: "", certificateType: "" });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  const [revokeHash, setRevokeHash] = useState("");
  const [revokeLoading, setRevokeLoading] = useState(false);
  const [revokeMsg, setRevokeMsg] = useState(null);

  const handleChange = (e) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
    setMessage(null);
  };

  const selectType = (value) => {
    setForm((f) => ({ ...f, certificateType: value }));
    setMessage(null);
  };

  const handleIssue = async (e) => {
    e.preventDefault();
    const { studentName, course, issuer, certificateType } = form;

    if (!studentName.trim() || !course.trim() || !issuer.trim() || !certificateType) {
      setMessage({ type: "error", text: "Please fill in all fields and select a certificate type." });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch(`${API}/issue-certificate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Server error");
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${certificateType.replace(/\s+/g, "_")}-${studentName.replace(/\s+/g, "_")}.pdf`;
      a.click();
      URL.revokeObjectURL(url);

      setMessage({ type: "success", text: "Certificate issued and downloaded successfully!" });
      setForm({ studentName: "", course: "", issuer: "", certificateType: "" });
    } catch (err) {
      setMessage({ type: "error", text: err.message || "Failed to issue certificate." });
    } finally {
      setLoading(false);
    }
  };

  const handleRevoke = async (e) => {
    e.preventDefault();
    if (!revokeHash.trim()) { setRevokeMsg({ type: "error", text: "Enter a certificate hash." }); return; }
    setRevokeLoading(true);
    setRevokeMsg(null);
    try {
      const res = await fetch(`${API}/revoke-certificate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hash: revokeHash.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setRevokeMsg({ type: "success", text: `Revoked. TX: ${data.txHash}` });
        setRevokeHash("");
      } else {
        setRevokeMsg({ type: "error", text: data.message || "Revoke failed." });
      }
    } catch {
      setRevokeMsg({ type: "error", text: "Network error. Is the backend running?" });
    } finally {
      setRevokeLoading(false);
    }
  };

  const selectedTypeObj = CERT_TYPES.find((t) => t.value === form.certificateType);

  // Dynamic label for "course" field based on type
  const courseLabel =
    form.certificateType === "Certificate of Attendance"   ? "Event / Programme" :
    form.certificateType === "Certificate of Appreciation" ? "Reason / Contribution" :
    "Course / Programme";

  const coursePlaceholder =
    form.certificateType === "Certificate of Attendance"   ? "e.g. National Tech Conference 2025" :
    form.certificateType === "Certificate of Appreciation" ? "e.g. Outstanding Mentorship" :
    "e.g. Full Stack Web Development";

  return (
    <div className="page">
      <div className="page-hero">
        <div className="page-tag">Admin Panel</div>
        <h1 className="page-title">Issue <span>Certificates</span></h1>
        <p className="page-subtitle">
          Create a blockchain-verified certificate. A PDF will be generated and downloaded automatically.
        </p>
      </div>

      <div className="admin-layout">
        {/* ── Issue Form ── */}
        <div className="card card-gold">
          <div className="card-header">
            <span className="card-icon">{selectedTypeObj ? selectedTypeObj.icon : "🎓"}</span>
            <div>
              <h2 className="card-title">New Certificate</h2>
              <p className="card-desc">All fields are required</p>
            </div>
          </div>

          <form onSubmit={handleIssue} className="issue-form">

            {/* Certificate Type */}
            <div className="form-group">
              <label className="form-label">Certificate Type</label>
              <div className="type-grid">
                {CERT_TYPES.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    className={`type-tile ${form.certificateType === t.value ? "selected" : ""}`}
                    onClick={() => selectType(t.value)}
                  >
                    <span className="type-tile-icon">{t.icon}</span>
                    <span className="type-tile-label">
                      {t.value.replace("Certificate of ", "")}
                    </span>
                  </button>
                ))}
              </div>
              {selectedTypeObj && (
                <div className="type-selected-info">
                  <span className="type-badge">{selectedTypeObj.icon} {selectedTypeObj.value}</span>
                  <span className="type-selected-desc">{selectedTypeObj.desc}</span>
                </div>
              )}
            </div>

            {/* Recipient */}
            <div className="form-group">
              <label className="form-label">Recipient Name</label>
              <input
                className="form-input"
                name="studentName"
                value={form.studentName}
                onChange={handleChange}
                placeholder="e.g. Siddhant Gaikwad"
                autoComplete="off"
              />
            </div>

            {/* Course (dynamic label) */}
            <div className="form-group">
              <label className="form-label">{courseLabel}</label>
              <input
                className="form-input"
                name="course"
                value={form.course}
                onChange={handleChange}
                placeholder={coursePlaceholder}
                autoComplete="off"
              />
            </div>

            {/* Issuer */}
            <div className="form-group">
              <label className="form-label">Issuing Authority</label>
              <input
                className="form-input"
                name="issuer"
                value={form.issuer}
                onChange={handleChange}
                placeholder="e.g. APSIT, Thane"
                autoComplete="off"
              />
            </div>

            {message && (
              <div className={`msg msg-${message.type === "error" ? "error" : "success"}`}>
                {message.text}
              </div>
            )}

            <button type="submit" className="btn btn-gold btn-full" disabled={loading}>
              {loading
                ? <><span className="spinner" /> Writing to blockchain…</>
                : "Issue & Download Certificate"}
            </button>
          </form>
        </div>

        {/* ── Side panel ── */}
        <div className="admin-side">
          <div className="card">
            <h3 className="side-title">What happens when you issue?</h3>
            <ol className="process-list">
              {[
                "A SHA-256 hash is derived from the input + timestamp",
                "The hash + metadata are written to the smart contract",
                "Transaction is mined and confirmed on-chain",
                "A PDF certificate is generated with the hash embedded",
                "The PDF is downloaded to your device",
              ].map((s, i) => (
                <li key={i} className="process-item">
                  <span className="process-n">{i + 1}</span>
                  <span>{s}</span>
                </li>
              ))}
            </ol>
          </div>

          <div className="card revoke-card">
            <div className="card-header">
              <span className="card-icon">🚫</span>
              <div>
                <h3 className="card-title">Revoke Certificate</h3>
                <p className="card-desc">Marks a certificate as invalid on-chain</p>
              </div>
            </div>
            <form onSubmit={handleRevoke}>
              <div className="form-group">
                <label className="form-label">Certificate Hash</label>
                <input
                  className="form-input"
                  value={revokeHash}
                  onChange={(e) => { setRevokeHash(e.target.value); setRevokeMsg(null); }}
                  placeholder="64-character hex hash"
                  autoComplete="off"
                  style={{ fontFamily: "var(--font-mono)", fontSize: "12px" }}
                />
              </div>
              {revokeMsg && (
                <div className={`msg msg-${revokeMsg.type === "error" ? "error" : "success"}`}
                  style={{ fontSize: "12px", wordBreak: "break-all" }}>
                  {revokeMsg.text}
                </div>
              )}
              <button type="submit" className="btn btn-danger btn-full" disabled={revokeLoading}>
                {revokeLoading ? <><span className="spinner" /> Revoking…</> : "Revoke Certificate"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}