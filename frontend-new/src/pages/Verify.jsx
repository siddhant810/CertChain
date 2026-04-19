import { useState, useRef } from "react";
import "./Verify.css";

const API = "https://certchain-backend-veyk.onrender.com";

function formatDate(unixTimestamp) {
  const ts = Number(unixTimestamp);
  if (!ts) return "Unknown";
  return new Date(ts * 1000).toLocaleDateString("en-IN", {
    year: "numeric", month: "long", day: "numeric",
  });
}

export default function Verify() {
  const [tab, setTab] = useState("file"); // "file" | "hash"
  const [file, setFile] = useState(null);
  const [hash, setHash] = useState("");
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const fileRef = useRef();

  const reset = () => { setResult(null); setFile(null); setHash(""); };

  const verifyFile = async () => {
    if (!file) return;
    setLoading(true);
    setResult(null);
    try {
      const fd = new FormData();
      fd.append("certificate", file);
      const res = await fetch(`${API}/verify-certificate-file`, { method: "POST", body: fd });
      const data = await res.json();
      setResult(data);
    } catch {
      setResult({ valid: false, message: "Network error. Is the backend running?" });
    } finally {
      setLoading(false);
    }
  };

  const verifyHash = async (e) => {
    e.preventDefault();
    if (!hash.trim()) return;
    setLoading(true);
    setResult(null);
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
    }
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped && dropped.type === "application/pdf") {
      setFile(dropped);
      setResult(null);
    }
  };

  return (
    <div className="page">
      <div className="page-hero">
        <div className="page-tag">Certificate Verification</div>
        <h1 className="page-title">Is it <span>real?</span></h1>
        <p className="page-subtitle">
          Upload a certificate PDF or paste a hash to verify authenticity on the blockchain.
        </p>
      </div>

      {/* Tabs */}
      <div className="verify-tabs">
        <button
          className={`verify-tab ${tab === "file" ? "active" : ""}`}
          onClick={() => { setTab("file"); reset(); }}
        >
          📄 Upload PDF
        </button>
        <button
          className={`verify-tab ${tab === "hash" ? "active" : ""}`}
          onClick={() => { setTab("hash"); reset(); }}
        >
          🔑 Enter Hash
        </button>
      </div>

      <div className="verify-body">
        {tab === "file" ? (
          <div className="card">
            <div
              className={`drop-zone ${dragging ? "dragging" : ""}`}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              onClick={() => fileRef.current?.click()}
            >
              <input
                ref={fileRef}
                type="file"
                accept=".pdf,application/pdf"
                style={{ display: "none" }}
                onChange={(e) => { setFile(e.target.files[0]); setResult(null); }}
              />
              {file ? (
                <>
                  <span className="drop-icon">✅</span>
                  <p className="drop-filename">{file.name}</p>
                  <p className="drop-hint">Click to change file</p>
                </>
              ) : (
                <>
                  <span className="drop-icon">📂</span>
                  <p className="drop-label">Drop PDF here or click to browse</p>
                  <p className="drop-hint">Accepts .pdf certificate files only</p>
                </>
              )}
            </div>

            {file && (
              <button
                className="btn btn-gold btn-full"
                style={{ marginTop: 20 }}
                onClick={verifyFile}
                disabled={loading}
              >
                {loading ? <><span className="spinner" /> Checking blockchain…</> : "Verify Certificate"}
              </button>
            )}
          </div>
        ) : (
          <div className="card">
            <form onSubmit={verifyHash}>
              <div className="form-group">
                <label className="form-label">Certificate Hash (SHA-256)</label>
                <input
                  className="form-input"
                  value={hash}
                  onChange={(e) => { setHash(e.target.value); setResult(null); }}
                  placeholder="Enter 64-character hex hash"
                  style={{ fontFamily: "var(--font-mono)", fontSize: "13px" }}
                  spellCheck={false}
                  autoComplete="off"
                />
              </div>
              <button type="submit" className="btn btn-gold btn-full" disabled={loading || !hash.trim()}>
                {loading ? <><span className="spinner" /> Checking blockchain…</> : "Verify Hash"}
              </button>
            </form>
          </div>
        )}

        {/* Result */}
        {result && (
          <div className={`result-box ${result.valid ? "valid" : "invalid"}`}>
            <div className="result-header">
              <span className={`badge ${result.valid ? "badge-valid" : "badge-invalid"}`}>
                <span className="pulse-dot" />
                {result.valid ? "VALID" : "INVALID"}
              </span>
              <span className="result-message">
                {result.valid
                  ? "This certificate is authentic and verified on the blockchain."
                  : result.message || "Certificate could not be verified."}
              </span>
            </div>

            {result.valid && result.data && (
              <>
                <div className="data-grid">
                  <div className="data-item">
                    <div className="data-item-label">Student Name</div>
                    <div className="data-item-value">{result.data.studentName}</div>
                  </div>
                  <div className="data-item">
                    <div className="data-item-label">Course</div>
                    <div className="data-item-value">{result.data.course}</div>
                  </div>
                  <div className="data-item">
                    <div className="data-item-label">Issued By</div>
                    <div className="data-item-value">{result.data.issuer}</div>
                  </div>
                  <div className="data-item">
                    <div className="data-item-label">Issue Date</div>
                    <div className="data-item-value">{formatDate(result.data.issueDate)}</div>
                  </div>
                </div>

                {result.hash && (
                  <div>
                    <div className="data-item-label" style={{ marginTop: 16, marginBottom: 8 }}>Certificate Hash</div>
                    <div className="hash-display">{result.hash}</div>
                  </div>
                )}

                {result.txHash && result.txHash !== "N/A" && (
                  <div>
                    <div className="data-item-label" style={{ marginTop: 16, marginBottom: 8 }}>Transaction Hash</div>
                    <div className="hash-display" style={{ color: "var(--gold)" }}>{result.txHash}</div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}