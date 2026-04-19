import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./Navbar.css";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLoginClick = () => navigate("/login");

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <NavLink to="/" className="navbar-brand">
          <span className="brand-icon">⛓</span>
          <span className="brand-name">CertChain</span>
        </NavLink>

        <div className="navbar-links">
          <NavLink to="/" className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`} end>
            Home
          </NavLink>
          <NavLink to="/verify" className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}>
            Verify
          </NavLink>
        </div>

        <div className="navbar-right">
          <div className="navbar-status">
            <span className="pulse-dot" style={{ color: "#00e5a0" }} />
            <span className="status-text">Sepolia Testnet</span>
          </div>

          {user ? (
            <div className="navbar-user">
              <span className="navbar-user-badge">
                {user.role === "admin" ? "🛡️" : "🎓"} {user.username}
              </span>
              <NavLink
                to={user.role === "admin" ? "/admin" : "/student"}
                className="btn btn-outline nav-btn"
              >
                Dashboard
              </NavLink>
            </div>
          ) : (
            <button className="btn btn-gold nav-btn" onClick={handleLoginClick}>
              Sign In
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
