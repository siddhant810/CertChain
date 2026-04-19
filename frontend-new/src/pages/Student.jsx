import { useState } from "react";
import "./Student.css";

const API = "http://localhost:5000";

function formatDate(unixTimestamp) {
  const ts = Number(unixTimestamp);
  if (!ts) return "Unknown";
  return new Date(ts * 1000).toLocaleDateString("en-IN", {
    year: "numeric", month: "long", day: "numeric",
  });
}

export default function Student() {
  const [hash, setHash] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [searched, setSearched] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!hash.trim()) return;

    setLoading(true);
    setResult(null);
    setSearched(false);

    try {
      const res = await fetch(`${API}/verify-certificate-hash`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hash: hash.trim() }),
      });
      const data = await res.json();
      setResult(data);
    } catch {
      setResult({ valid: false, message: "Network error. Is the backend running?" });
    } finally {
      setLoading(false);
      setSearched(true);
    }
  };

  return (
    <div className="page">
      <div className="page-hero">
        <div className="page-tag">Student Portal</div>
        <h1 className="page-title">Your <span>Certificate</span></h1>
        <p className="page-subtitle">
          Enter your certificate hash (found at the bottom of your PDF) to view your credential details.
        </p>
      </div>

      <div className="student-layout">
        {/* Search panel */}
        <div className="student-search">
          <div className="card card-gold">
            <h2 className="card-title" style={{ marginBottom: 6 }}>Look up your certificate</h2>
            <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 24 }}>
              The hash is the long string starting with letters and numbers at the bottom of your PDF.
            </p>

            <form onSubmit={handleSearch}>
              <div className="form-group">
                <label className="form-label">Certificate Hash</label>
                <textarea
                  className="form-input hash-textarea"
                  value={hash}
                  onChange={(e) => { setHash(e.target.value); setResult(null); setSearched(false); }}
                  placeholder="Paste your 64-character certificate hash here…"
                  rows={3}
                  spellCheck={false}
                />
              </div>

              <button type="submit" className="btn btn-gold btn-full" disabled={loading || !hash.trim()}>
                {loading ? <><span className="spinner" /> Looking up…</> : "Check My Certificate"}
              </button>
            </form>
          </div>

          {/* Explainer */}
          <div className="card where-to-find">
            <h3 style={{ fontFamily: "var(--font-display)", fontSize: 15, fontWeight: 700, marginBottom: 12 }}>
              Where to find your hash
            </h3>
            <div className="pdf-diagram">
              <div className="pdf-preview">
                <div className="pdf-line gold-line" />
                <div className="pdf-line short-line" />
                <div className="pdf-line short-line" />
                <div className="pdf-footer">
                  <div className="pdf-hash-label">Hash: a3f2b1...</div>
                </div>
              </div>
              <p className="pdf-caption">At the bottom of your certificate PDF</p>
            </div>
          </div>
        </div>

        {/* Result panel */}
        <div className="student-result">
          {!searched && !loading && (
            <div className="empty-state">
              <span className="empty-icon">🎓</span>
              <p>Your certificate details will appear here after lookup.</p>
            </div>
          )}

          {searched && result && (
            <div className={`result-box ${result.valid ? "valid" : "invalid"}`} style={{ margin: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
                <span className={`badge ${result.valid ? "badge-valid" : "badge-invalid"}`}>
                  <span className="pulse-dot" />
                  {result.valid ? "AUTHENTIC" : "NOT FOUND"}
                </span>
              </div>

              {result.valid && result.data ? (
                <>
                  {/* Certificate card */}
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

                  {result.hash && (
                    <div style={{ marginTop: 20 }}>
                      <div className="data-item-label" style={{ marginBottom: 8 }}>Certificate Hash</div>
                      <div className="hash-display">{result.hash}</div>
                    </div>
                  )}

                  {result.txHash && result.txHash !== "N/A" && (
                    <div style={{ marginTop: 12 }}>
                      <div className="data-item-label" style={{ marginBottom: 8 }}>Transaction Hash</div>
                      <div className="hash-display" style={{ color: "var(--gold)" }}>{result.txHash}</div>
                    </div>
                  )}
                </>
              ) : (
                <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>
                  {result.message || "No certificate found for this hash."}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}