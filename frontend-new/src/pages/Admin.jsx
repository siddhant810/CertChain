import { useState, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import API from "../api";
import "./Admin.css";

const CERT_TYPES = [
  { value: "Certificate of Completion",    icon: "🎓", desc: "Awarded upon finishing a course or program" },
  { value: "Certificate of Appreciation",  icon: "🏅", desc: "Recognizes outstanding contribution or service" },
  { value: "Certificate of Attendance",    icon: "📋", desc: "Confirms participation in an event or session" },
  { value: "Certificate of Achievement",   icon: "🏆", desc: "Honours exceptional performance or accomplishment" },
  { value: "Certificate of Excellence",    icon: "⭐", desc: "For exemplary work or top-rank distinction" },
  { value: "Certificate of Participation", icon: "🤝", desc: "Acknowledges active involvement in an activity" },
];

function formatDate(unixTimestamp) {
  const ts = Number(unixTimestamp);
  if (!ts) return "Unknown";
  return new Date(ts * 1000).toLocaleDateString("en-IN", {
    year: "numeric", month: "long", day: "numeric",
  });
}

function friendlyMessage(msg) {
  if (!msg) return "Certificate could not be verified.";
  const m = msg.toLowerCase();
  if (m.includes("revoked") || m.includes("invalid"))
    return "This certificate has been REVOKED or marked invalid by the issuing authority.";
  if (m.includes("not found") || m.includes("revert") || m.includes("illegal") || m.includes("character"))
    return "Certificate not found on blockchain. It may not have been issued through this system.";
  if (m.includes("network") || m.includes("timeout"))
    return "Network error. Could not reach the blockchain. Please try again.";
  return "Certificate could not be verified.";
}

// ── Issue Tab ──────────────────────────────────────────────────────────────
function IssueTab() {
  const [form, setForm] = useState({ studentName: "", course: "", issuer: "", certificateType: "" });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  const handleChange = (e) => { setForm(f => ({ ...f, [e.target.name]: e.target.value })); setMessage(null); };
  const selectType = (v) => { setForm(f => ({ ...f, certificateType: v })); setMessage(null); };

  const handleIssue = async (e) => {
    e.preventDefault();
    const { studentName, course, issuer, certificateType } = form;
    if (!studentName.trim() || !course.trim() || !issuer.trim() || !certificateType) {
      setMessage({ type: "error", text: "Please fill in all fields and select a certificate type." });
      return;
    }
    setLoading(true); setMessage(null);
    try {
      const res = await fetch(`${API}/issue-certificate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.message || "Server error"); }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${certificateType.replace(/\s+/g, "_")}-${studentName.replace(/\s+/g, "_")}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      setMessage({ type: "success", text: `Certificate issued successfully for ${studentName}!` });
      setForm({ studentName: "", course: "", issuer: "", certificateType: "" });
    } catch (err) {
      setMessage({ type: "error", text: err.message || "Failed to issue certificate." });
    } finally { setLoading(false); }
  };

  const selectedTypeObj = CERT_TYPES.find(t => t.value === form.certificateType);
  const courseLabel = form.certificateType === "Certificate of Attendance" ? "Event / Programme"
    : form.certificateType === "Certificate of Appreciation" ? "Reason / Contribution"
    : "Course / Programme";

  return (
    <div className="tab-content">
      <div className="card card-gold">
        <div className="card-header">
          <span className="card-icon">{selectedTypeObj ? selectedTypeObj.icon : "🎓"}</span>
          <div>
            <h2 className="card-title">Issue New Certificate</h2>
            <p className="card-desc">All fields are required</p>
          </div>
        </div>
        <form onSubmit={handleIssue} className="issue-form">
          <div className="form-group">
            <label className="form-label">Certificate Type</label>
            <div className="type-grid">
              {CERT_TYPES.map(t => (
                <button key={t.value} type="button"
                  className={`type-tile ${form.certificateType === t.value ? "selected" : ""}`}
                  onClick={() => selectType(t.value)}>
                  <span className="type-tile-icon">{t.icon}</span>
                  <span className="type-tile-label">{t.value.replace("Certificate of ", "")}</span>
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
          <div className="form-group">
            <label className="form-label">Recipient Name</label>
            <input className="form-input" name="studentName" value={form.studentName}
              onChange={handleChange} placeholder="e.g. Siddhant Gaikwad" autoComplete="off" />
          </div>
          <div className="form-group">
            <label className="form-label">{courseLabel}</label>
            <input className="form-input" name="course" value={form.course}
              onChange={handleChange} placeholder="e.g. Full Stack Web Development" autoComplete="off" />
          </div>
          <div className="form-group">
            <label className="form-label">Issuing Authority</label>
            <input className="form-input" name="issuer" value={form.issuer}
              onChange={handleChange} placeholder="e.g. APSIT, Thane" autoComplete="off" />
          </div>
          {message && <div className={`msg msg-${message.type === "error" ? "error" : "success"}`}>{message.text}</div>}
          <button type="submit" className="btn btn-gold btn-full" disabled={loading}>
            {loading ? <><span className="spinner" /> Writing to blockchain…</> : "Issue & Download Certificate"}
          </button>
        </form>
      </div>
    </div>
  );
}

// ── Verify Tab ─────────────────────────────────────────────────────────────
function VerifyTab() {
  const [verifyTab, setVerifyTab] = useState("file");
  const [file, setFile] = useState(null);
  const [hash, setHash] = useState("");
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const fileRef = useRef();

  const reset = () => { setResult(null); setFile(null); setHash(""); };

  const verifyFile = async () => {
    if (!file) return;
    setLoading(true); setResult(null);
    try {
      const fd = new FormData();
      fd.append("certificate", file);
      const res = await fetch(`${API}/verify-certificate-file`, { method: "POST", body: fd });
      setResult(await res.json());
    } catch { setResult({ valid: false, message: "Network error." }); }
    finally { setLoading(false); }
  };

  const verifyHash = async (e) => {
    e.preventDefault();
    if (!hash.trim()) return;
    setLoading(true); setResult(null);
    try {
      const res = await fetch(`${API}/verify-certificate-hash`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hash: hash.trim() }),
      });
      setResult(await res.json());
    } catch { setResult({ valid: false, message: "Network error." }); }
    finally { setLoading(false); }
  };

  const onDrop = (e) => {
    e.preventDefault(); setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f?.type === "application/pdf") { setFile(f); setResult(null); }
  };

  return (
    <div className="tab-content">
      <div className="verify-tabs">
        <button className={`verify-tab ${verifyTab === "file" ? "active" : ""}`}
          onClick={() => { setVerifyTab("file"); reset(); }}>📄 Upload PDF</button>
        <button className={`verify-tab ${verifyTab === "hash" ? "active" : ""}`}
          onClick={() => { setVerifyTab("hash"); reset(); }}>🔑 Enter Hash</button>
      </div>

      <div className="card">
        {verifyTab === "file" ? (
          <>
            <div className={`drop-zone ${dragging ? "dragging" : ""}`}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              onClick={() => fileRef.current?.click()}>
              <input ref={fileRef} type="file" accept=".pdf,application/pdf"
                style={{ display: "none" }} onChange={(e) => { setFile(e.target.files[0]); setResult(null); }} />
              {file ? (
                <><span className="drop-icon">✅</span>
                  <p style={{ color: "var(--green)", fontFamily: "var(--font-mono)", fontSize: 12 }}>{file.name}</p>
                  <p className="drop-hint">Click to change file</p></>
              ) : (
                <><span className="drop-icon">📂</span>
                  <p style={{ fontWeight: 500, marginBottom: 6 }}>Drop PDF here or click to browse</p>
                  <p className="drop-hint">Accepts .pdf certificate files only</p></>
              )}
            </div>
            {file && (
              <button className="btn btn-gold btn-full" style={{ marginTop: 16 }}
                onClick={verifyFile} disabled={loading}>
                {loading ? <><span className="spinner" /> Checking blockchain…</> : "Verify Certificate"}
              </button>
            )}
          </>
        ) : (
          <form onSubmit={verifyHash}>
            <div className="form-group">
              <label className="form-label">Certificate Hash (SHA-256)</label>
              <input className="form-input" value={hash}
                onChange={(e) => { setHash(e.target.value); setResult(null); }}
                placeholder="Enter 64-character hex hash"
                style={{ fontFamily: "var(--font-mono)", fontSize: 13 }}
                spellCheck={false} autoComplete="off" />
            </div>
            <button type="submit" className="btn btn-gold btn-full" disabled={loading || !hash.trim()}>
              {loading ? <><span className="spinner" /> Checking blockchain…</> : "Verify Hash"}
            </button>
          </form>
        )}
      </div>

      {result && (
        <div className={`result-box ${result.valid ? "valid" : "invalid"}`} style={{ marginTop: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
            <span className={`badge ${result.valid ? "badge-valid" : "badge-invalid"}`}>
              <span className="pulse-dot" />{result.valid ? "VALID" : "INVALID"}
            </span>
            <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>
              {result.valid ? "Authentic — verified on Sepolia blockchain." : friendlyMessage(result.message)}
            </span>
          </div>
          {result.valid && result.data && (
            <div className="data-grid">
              <div className="data-item"><div className="data-item-label">Student Name</div><div className="data-item-value">{result.data.studentName}</div></div>
              <div className="data-item"><div className="data-item-label">Course</div><div className="data-item-value">{result.data.course}</div></div>
              <div className="data-item"><div className="data-item-label">Issued By</div><div className="data-item-value">{result.data.issuer}</div></div>
              <div className="data-item"><div className="data-item-label">Issue Date</div><div className="data-item-value">{formatDate(result.data.issueDate)}</div></div>
              {result.hash && <div className="data-item" style={{ gridColumn: "1/-1" }}>
                <div className="data-item-label">Certificate Hash</div>
                <div className="data-item-value mono">{result.hash}</div>
              </div>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Revoke Tab ─────────────────────────────────────────────────────────────
function RevokeTab() {
  const [hash, setHash] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);

  const handleRevoke = async (e) => {
    e.preventDefault();
    if (!hash.trim()) { setMsg({ type: "error", text: "Enter a certificate hash." }); return; }
    if (!/^[a-f0-9]{64}$/i.test(hash.trim())) { setMsg({ type: "error", text: "Hash must be exactly 64 hex characters." }); return; }
    if (!window.confirm("Are you sure you want to revoke this certificate? This action is permanent on the blockchain.")) return;
    setLoading(true); setMsg(null);
    try {
      const res = await fetch(`${API}/revoke-certificate`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hash: hash.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setMsg({ type: "success", text: `Certificate successfully revoked on Sepolia. TX: ${data.txHash}` });
        setHash("");
      } else {
        setMsg({ type: "error", text: data.message || "Revoke failed." });
      }
    } catch { setMsg({ type: "error", text: "Network error. Is the backend running?" }); }
    finally { setLoading(false); }
  };

  return (
    <div className="tab-content">
      <div className="card revoke-card">
        <div className="card-header">
          <span className="card-icon">🚫</span>
          <div>
            <h2 className="card-title">Revoke Certificate</h2>
            <p className="card-desc">Permanently marks a certificate as invalid on the blockchain</p>
          </div>
        </div>

        <div className="revoke-warning">
          ⚠️ This action is <strong>irreversible</strong> on the blockchain. The certificate will be permanently marked as revoked and will fail all future verifications.
        </div>

        <form onSubmit={handleRevoke}>
          <div className="form-group">
            <label className="form-label">Certificate Hash</label>
            <textarea className="form-input hash-textarea"
              value={hash}
              onChange={(e) => { setHash(e.target.value); setMsg(null); }}
              placeholder="Paste the 64-character SHA-256 hash of the certificate to revoke"
              rows={3}
              spellCheck={false}
              style={{ fontFamily: "var(--font-mono)", fontSize: 12, resize: "vertical" }}
            />
          </div>
          {msg && (
            <div className={`msg msg-${msg.type === "error" ? "error" : "success"}`}
              style={{ fontSize: 12, wordBreak: "break-all", marginBottom: 12 }}>
              {msg.text}
            </div>
          )}
          <button type="submit" className="btn btn-danger btn-full" disabled={loading}>
            {loading ? <><span className="spinner" /> Revoking on blockchain…</> : "Revoke Certificate"}
          </button>
        </form>
      </div>
    </div>
  );
}

// ── Main Admin Page ────────────────────────────────────────────────────────
export default function Admin() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState("issue");

  const tabs = [
    { id: "issue",  label: "Issue",  icon: "📜" },
    { id: "verify", label: "Verify", icon: "🔍" },
    { id: "revoke", label: "Revoke", icon: "🚫" },
  ];

  return (
    <div className="admin-page">
      {/* Admin header */}
      <div className="admin-top-bar">
        <div className="admin-top-inner">
          <div className="admin-welcome">
            <span className="admin-welcome-icon">🛡️</span>
            <div>
              <div className="admin-welcome-name">Admin Dashboard</div>
              <div className="admin-welcome-sub">Logged in as <strong>{user?.username}</strong></div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <a href="/" className="btn btn-outline logout-btn">🏠 Home</a>
            <button className="btn btn-outline logout-btn" onClick={logout}>Sign out</button>
          </div>
        </div>
      </div>

      <div className="page" style={{ paddingTop: 32 }}>
        <div className="page-hero" style={{ marginBottom: 36 }}>
          <div className="page-tag">Admin Panel</div>
          <h1 className="page-title">Certificate <span>Management</span></h1>
          <p className="page-subtitle">Issue, verify, and revoke blockchain-secured certificates.</p>
        </div>

        {/* Tabs */}
        <div className="admin-tabs">
          {tabs.map(t => (
            <button key={t.id}
              className={`admin-tab ${activeTab === t.id ? "active" : ""}`}
              onClick={() => setActiveTab(t.id)}>
              <span>{t.icon}</span> {t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {activeTab === "issue"  && <IssueTab />}
        {activeTab === "verify" && <VerifyTab />}
        {activeTab === "revoke" && <RevokeTab />}
      </div>
    </div>
  );
}
