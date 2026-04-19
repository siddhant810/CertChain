import { BrowserRouter, Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import Admin from "./pages/Admin";
import Verify from "./pages/Verify";
import Student from "./pages/Student";
import "./index.css";

function App() {
  return (
    <BrowserRouter>
      <div className="app-shell">
        <Navbar />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/verify" element={<Verify />} />
            <Route path="/student" element={<Student />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;