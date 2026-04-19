import { NavLink } from "react-router-dom";
import "./Navbar.css";

export default function Navbar() {
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
          <NavLink to="/admin" className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}>
            Issue
          </NavLink>
          <NavLink to="/verify" className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}>
            Verify
          </NavLink>
          <NavLink to="/student" className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}>
            Student
          </NavLink>
        </div>

        <div className="navbar-status">
          <span className="pulse-dot" style={{ color: "#00e5a0" }}></span>
          <span className="status-text">Hardhat Local</span>
        </div>
      </div>
    </nav>
  );
}