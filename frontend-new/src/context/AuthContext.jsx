import { createContext, useContext, useState, useEffect } from "react";

const AuthContext = createContext(null);

// Hardcoded credentials (no backend needed - fine for a college project)
// In production, replace with JWT + backend auth
const CREDENTIALS = {
  admin: {
    username: "admin",
    password: "certchain@admin",
    role: "admin",
    name: "Administrator",
  },
  student: {
    username: "student",
    password: "certchain@student",
    role: "student",
    name: "Student Portal",
  },
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    // Persist login across page refresh
    try {
      const saved = sessionStorage.getItem("certchain_user");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const login = (username, password) => {
    const match = Object.values(CREDENTIALS).find(
      (c) => c.username === username.trim() && c.password === password
    );
    if (match) {
      const userData = { username: match.username, role: match.role, name: match.name };
      setUser(userData);
      sessionStorage.setItem("certchain_user", JSON.stringify(userData));
      return { success: true, role: match.role };
    }
    return { success: false };
  };

  const logout = () => {
    setUser(null);
    sessionStorage.removeItem("certchain_user");
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
