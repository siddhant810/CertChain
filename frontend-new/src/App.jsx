import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Navbar from "./components/Navbar";

import Home    from "./pages/Home";
import Login   from "./pages/Login";
import Admin   from "./pages/Admin";
import Student from "./pages/Student";
import Verify  from "./pages/Verify";
import "./index.css";

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route path="/"      element={<><Navbar /><div className="main-content"><Home /></div></>} />
          <Route path="/login" element={<Login />} />
          <Route path="/verify" element={<><Navbar /><div className="main-content"><Verify /></div></>} />

          {/* Protected — Admin only */}
          <Route path="/admin" element={
            <ProtectedRoute requiredRole="admin">
              <Admin />
            </ProtectedRoute>
          } />

          {/* Protected — Student only */}
          <Route path="/student" element={
            <ProtectedRoute requiredRole="student">
              <Student />
            </ProtectedRoute>
          } />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
