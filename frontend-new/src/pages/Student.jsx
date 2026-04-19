import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import API from "../api";
import "./Student.css";

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
    return "This certificate has been revoked by the issuing authority.";
  if (m.includes("not found") || m.includes("illegal") || m.includes("character"))
    return "No certificate found for this hash. Please check and try again.";
  return "Certificate could not be verified.";
}

export default function Student() {
  const { user, logout } = useAuth();

  const [hash, setHash]     = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult]   = useState(null);
  const [searched, setSearched] = useState(false);

  // Search history stored in session (lost on tab close — fine for students)
  const [history, setHistory] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem("cert_history") || "[]"); }
    catch { return []; }
  });

  const [copied, setCopied] = useState(false);

  const saveToHistory = (h, data) => {
    const entry = { hash: h, studentName: data.studentName, course: data.course,
      issuer: data.issuer, date: data.issueDate, lookedUpAt: Date.now() };
    const updated = [entry, ...history.filter(x => x.hash !== h)].slice(0, 5); // keep last 5
    setHistory(updated);
    sessionStorage.setItem("cert_history", JSON.stringify(updated));
  };

  const handleSearch = async (e, overrideHash) => {
    if (e) e.preventDefault();
    const h = (overrideHash || hash).trim();
    if (!h) return;
    setLoading(true); setResult(null); setSearched(false);
    try {
      const res = await fetch(`${API}/verify-certificate-hash`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hash: h }),
      });
      const data = await res.json();
      setResult(data);
      if (data.valid && data.data) saveToHistory(h, data.data);
    } catch {
      setResult({ valid: false, message: "Network error. Please try again." });
    } finally { setLoading(false); setSearched(true); }
  };

  const copyHash = (h) => {
    navigator.clipboard.writeText(h).then(() => {
      setCopied(h);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const shareResult = () => {
    const text = result?.valid && result.data
      ? `My certificate for "${result.data.course}" issued by ${result.data.issuer} is blockchain-verified! Hash: ${result.hash}`
      : "";
    if (navigator.share) {
      navigator.share({ title: "My Blockchain Certificate", text });
    } else {
      navigator.clipboard.writeText(text);
      alert("Certificate info copied to clipboard!");
    }
  };

  return (
    <div className="student-page">
      {/* Top bar */}
      <div className="student-top-bar">
        <div className="student-top-inner">
          <div className="student-welcome">
            <span className="student-welcome-icon">🎓</span>
            <div>
              <div className="student-welcome-name">Student Portal</div>
              <div className="student-welcome-sub">Logged in as <strong>{user?.username}</strong></div>
            </div>
          </div>
          <button className="btn btn-outline logout-btn" onClick={logout}>Sign out</button>
        </div>
      </div>

      <div className="page" style={{ paddingTop: 32 }}>
        <div className="page-hero" style={{ marginBottom: 36 }}>
          <div className="page-tag">Student Portal</div>
          <h1 className="page-title">Your <span>Credentials</span></h1>
          <p className="page-subtitle">
            Look up and verify your blockchain-secured certificates using your certificate hash.
          </p>
        </div>

        <div className="student-layout">
          {/* Left — search + history */}
          <div className="student-left">
            {/* Search */}
            <div className="card card-gold">
              <h2 className="card-title" style={{ marginBottom: 6 }}>Look up your certificate</h2>
              <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 20 }}>
                Your certificate hash is printed at the bottom of your PDF.
              </p>
              <form onSubmit={handleSearch}>
                <div className="form-group">
                  <label className="form-label">Certificate Hash</label>
                  <textarea
                    className="form-input"
                    value={hash}
                    onChange={(e) => { setHash(e.target.value); setResult(null); setSearched(false); }}
                    placeholder="Paste your 64-character certificate hash here…"
                    rows={3}
                    spellCheck={false}
                    style={{ fontFamily: "var(--font-mono)", fontSize: 12, resize: "vertical" }}
                  />
                </div>
                <button type="submit" className="btn btn-gold btn-full" disabled={loading || !hash.trim()}>
                  {loading ? <><span className="spinner" /> Checking blockchain…</> : "Verify My Certificate"}
                </button>
              </form>
            </div>

            {/* Where to find hash */}
            <div className="card how-to-find">
              <h3 className="how-title">📍 Where to find your hash</h3>
              <div className="pdf-mock">
                <div className="pdf-mock-header">
                  <div className="pdf-bar gold" />
                  <div className="pdf-bar short" />
                  <div className="pdf-bar short" />
                </div>
                <div className="pdf-mock-footer">
                  <span className="pdf-mock-hash">⛓ BLOCKCHAIN VERIFIED</span>
                  <span className="pdf-mock-hash dim">Hash: a3f2b1c4d5e6...</span>
                </div>
              </div>
              <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 10 }}>
                Look at the dark footer section at the bottom of your certificate PDF.
              </p>
            </div>

            {/* Recent lookups */}
            {history.length > 0 && (
              <div className="card">
                <h3 className="how-title">🕓 Recent lookups</h3>
                <div className="history-list">
                  {history.map((h, i) => (
                    <div key={i} className="history-item"
                      onClick={() => { setHash(h.hash); handleSearch(null, h.hash); }}>
                      <div className="history-name">{h.studentName}</div>
                      <div className="history-course">{h.course}</div>
                      <div className="history-hash">{h.hash.slice(0, 20)}…</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right — result */}
          <div className="student-right">
            {!searched && !loading && (
              <div className="empty-state">
                <span className="empty-icon">🔐</span>
                <p>Enter your certificate hash on the left to verify and view your credential details.</p>
              </div>
            )}

            {searched && result && (
              <div className={`result-box ${result.valid ? "valid" : "invalid"}`} style={{ margin: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
                  <span className={`badge ${result.valid ? "badge-valid" : "badge-invalid"}`}>
                    <span className="pulse-dot" />
                    {result.valid ? "VERIFIED" : "NOT FOUND"}
                  </span>
                </div>

                {result.valid && result.data ? (
                  <>
                    {/* Certificate card visual */}
                    <div className="cert-visual">
                      <div className="cert-visual-header">
                        <span>⛓ CertChain</span>
                        <span className="badge badge-valid" style={{ fontSize: 10 }}>
                          <span className="pulse-dot" /> Blockchain Verified
                        </span>
                      </div>
                      <div className="cert-visual-name">{result.data.studentName}</div>
                      <div className="cert-visual-sub">has successfully completed</div>
                      <div className="cert-visual-course">{result.data.course}</div>
                      <div className="cert-visual-meta">
                        <span>Issued by <strong>{result.data.issuer}</strong></span>
                        <span>{formatDate(result.data.issueDate)}</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="cert-actions">
                      <button className="btn btn-outline" onClick={() => copyHash(result.hash)}>
                        {copied === result.hash ? "✅ Copied!" : "📋 Copy Hash"}
                      </button>
                      <button className="btn btn-outline" onClick={shareResult}>
                        🔗 Share
                      </button>
                    </div>

                    {/* Hash */}
                    <div style={{ marginTop: 16 }}>
                      <div className="data-item-label" style={{ marginBottom: 6 }}>Certificate Hash</div>
                      <div className="hash-display">{result.hash}</div>
                    </div>

                    {result.txHash && result.txHash !== "N/A" && (
                      <div style={{ marginTop: 12 }}>
                        <div className="data-item-label" style={{ marginBottom: 6 }}>Transaction Hash</div>
                        <div className="hash-display" style={{ color: "var(--gold)" }}>{result.txHash}</div>
                        <a
                          href={`https://sepolia.etherscan.io/tx/${result.txHash}`}
                          target="_blank"
                          rel="noreferrer"
                          className="etherscan-link"
                        >
                          View on Sepolia Etherscan ↗
                        </a>
                      </div>
                    )}
                  </>
                ) : (
                  <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>
                    {friendlyMessage(result.message)}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
