import { Link } from "react-router-dom";
import "./Home.css";

const features = [
  {
    icon: "🎓",
    title: "Issue Certificates",
    desc: "Generate tamper-proof academic certificates stored permanently on the Ethereum blockchain.",
    link: "/admin",
    label: "Go to Issue →",
    color: "gold",
  },
  {
    icon: "🔍",
    title: "Verify Authenticity",
    desc: "Upload a PDF or enter a hash to instantly verify a certificate's legitimacy on-chain.",
    link: "/verify",
    label: "Verify Now →",
    color: "cyan",
  },
  {
    icon: "🎒",
    title: "Student Portal",
    desc: "Students can look up their certificate status and view blockchain proof of completion.",
    link: "/student",
    label: "Check Status →",
    color: "green",
  },
];

const stats = [
  { value: "SHA-256", label: "Hashing Algorithm" },
  { value: "EVM", label: "Smart Contract" },
  { value: "Immutable", label: "On-chain Record" },
  { value: "PDF", label: "Certificate Format" },
];

export default function Home() {
  return (
    <div className="home">
      {/* Hero */}
      <section className="hero">
        <div className="hero-grid-bg" aria-hidden="true" />
        <div className="hero-glow" aria-hidden="true" />

        <div className="hero-content">
          <div className="page-tag">Blockchain-Powered Credentials</div>
          <h1 className="hero-title">
            Certificates that<br />
            <span>can't be faked.</span>
          </h1>
          <p className="hero-subtitle">
            Issue, store, and verify academic certificates on the Ethereum blockchain.
            Every credential is cryptographically secured and publicly auditable.
          </p>
          <div className="hero-actions">
            <Link to="/admin" className="btn btn-gold">Issue Certificate</Link>
            <Link to="/verify" className="btn btn-outline">Verify a Certificate</Link>
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <div className="stats-bar">
        {stats.map((s) => (
          <div key={s.label} className="stat-item">
            <div className="stat-value">{s.value}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Features */}
      <section className="features page">
        <div className="section-header">
          <div className="page-tag">What you can do</div>
          <h2 className="page-title">Everything in one place</h2>
        </div>
        <div className="features-grid">
          {features.map((f) => (
            <Link key={f.title} to={f.link} className={`feature-card feature-${f.color}`}>
              <span className="feature-icon">{f.icon}</span>
              <h3 className="feature-title">{f.title}</h3>
              <p className="feature-desc">{f.desc}</p>
              <span className="feature-link">{f.label}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="how-it-works page">
        <div className="section-header">
          <div className="page-tag">The Process</div>
          <h2 className="page-title">How it works</h2>
        </div>
        <div className="steps">
          {[
            { n: "01", title: "Admin Issues Certificate", desc: "Fill in student name, course, and issuer. The backend generates a unique SHA-256 hash." },
            { n: "02", title: "Stored on Blockchain", desc: "The hash and metadata are written to the smart contract on your local Hardhat chain (or mainnet)." },
            { n: "03", title: "PDF Downloaded", desc: "A beautifully formatted PDF certificate is generated containing the hash and all details." },
            { n: "04", title: "Verify Anytime", desc: "Upload the PDF or enter the hash — the system checks the blockchain and returns the full record." },
          ].map((s, i) => (
            <div key={i} className="step">
              <div className="step-number">{s.n}</div>
              <div className="step-content">
                <h4 className="step-title">{s.title}</h4>
                <p className="step-desc">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}