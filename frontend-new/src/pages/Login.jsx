import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./Login.css";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [role, setRole] = useState(""); // "admin" | "student"
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const handleRoleSelect = (r) => {
    setRole(r);
    setError("");
    setUsername("");
    setPassword("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError("Please enter your credentials.");
      return;
    }
    setLoading(true);
    setError("");

    // Small delay for UX feel
    await new Promise((r) => setTimeout(r, 600));

    const result = login(username, password);
    setLoading(false);

    if (result.success) {
      navigate(result.role === "admin" ? "/admin" : "/student");
    } else {
      setError("Invalid username or password.");
    }
  };

  return (
    <div className="login-page">
      {/* Background grid */}
      <div className="login-grid-bg" aria-hidden="true" />
      <div className="login-glow" aria-hidden="true" />

      <div className="login-container">
        {/* Back button — top left corner of card */}
        <a href="/" className="back-home-btn">← Back to Home</a>

        {/* Logo */}
        <div className="login-brand">
          <span className="login-brand-icon">⛓</span>
          <span className="login-brand-name">CertChain</span>
        </div>

        <h1 className="login-title">Welcome back</h1>
        <p className="login-subtitle">Select your role to continue</p>

        {/* Role selector */}
        <div className="role-selector">
          <button
            type="button"
            className={`role-btn ${role === "admin" ? "active" : ""}`}
            onClick={() => handleRoleSelect("admin")}
          >
            <span className="role-icon">🛡️</span>
            <span className="role-label">Admin</span>
            <span className="role-desc">Issue &amp; manage certificates</span>
          </button>
          <button
            type="button"
            className={`role-btn ${role === "student" ? "active" : ""}`}
            onClick={() => handleRoleSelect("student")}
          >
            <span className="role-icon">🎓</span>
            <span className="role-label">Student</span>
            <span className="role-desc">View &amp; verify your credentials</span>
          </button>
        </div>

        {/* Login form — only shown after role selected */}
        {role && (
          <form className="login-form" onSubmit={handleSubmit}>
            <div className="login-form-header">
              <span className="login-role-tag">
                {role === "admin" ? "🛡️ Admin Login" : "🎓 Student Login"}
              </span>
            </div>

            <div className="form-group">
              <label className="form-label">Username</label>
              <input
                className="form-input"
                type="text"
                value={username}
                onChange={(e) => { setUsername(e.target.value); setError(""); }}
                placeholder={role === "admin" ? "admin" : "student"}
                autoComplete="username"
                autoFocus
              />
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <div className="password-wrap">
                <input
                  className="form-input"
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(""); }}
                  placeholder="Enter password"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="show-pass-btn"
                  onClick={() => setShowPass((p) => !p)}
                  tabIndex={-1}
                >
                  {showPass ? "🙈" : "👁"}
                </button>
              </div>
            </div>

            {error && (
              <div className="login-error">
                ⚠ {error}
              </div>
            )}

            <button type="submit" className="btn btn-gold btn-full login-btn" disabled={loading}>
              {loading ? (
                <><span className="spinner" /> Authenticating…</>
              ) : (
                `Sign in as ${role === "admin" ? "Admin" : "Student"}`
              )}
            </button>
          </form>
        )}

        <p className="login-footer">
          Blockchain-secured certificate management
        </p>
      </div>
    </div>
  );
}