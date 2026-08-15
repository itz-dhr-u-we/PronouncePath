// eslint-disable-next-line no-unused-vars
import React, { useState } from "react";
import axios from "axios";

export default function AuthPage({ onLoginSuccess }) {
  const [authMode, setAuthMode] = useState("login"); // "login" or "signup"
  const [authUsername, setAuthUsername] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authError, setAuthError] = useState("");

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthError("");
    const endpoint = authMode === "signup" ? "http://127.0.0.1:8000/signup" : "http://127.0.0.1:8000/login";
    
    try {
      const response = await axios.post(endpoint, {
        username: authUsername,
        password: authPassword
      });

      if (authMode === "signup") {
        alert("Account created successfully! Please log in.");
        setAuthMode("login");
        setAuthPassword("");
      } else {
        onLoginSuccess({
          username: response.data.username,
          current_tier: response.data.current_tier,
          xp: response.data.xp
        });
      }
    } catch (err) {
      setAuthError(err.response?.data?.detail || "Authentication failed. Make sure backend is running.");
    }
  };

  return (
    <div style={{ fontFamily: "sans-serif", maxWidth: "420px", margin: "100px auto", padding: "40px", textAlign: "center", background: "#ffffff", borderRadius: "16px", boxShadow: "0 10px 25px rgba(0,0,0,0.08)", border: "1px solid #e2e8f0" }}>
      <h1 style={{ color: "#1e293b", marginBottom: "8px" }}>🗣️ PronouncePath</h1>
      <p style={{ color: "#64748b", fontSize: "14px", marginBottom: "30px" }}>Sign in to track your pronunciation journey</p>

      {/* Tab Switcher */}
      <div style={{ display: "flex", marginBottom: "24px", background: "#f1f5f9", borderRadius: "8px", padding: "4px" }}>
        <button 
          type="button"
          onClick={() => { setAuthMode("login"); setAuthError(""); }}
          style={{ flex: 1, padding: "10px", border: "none", background: authMode === "login" ? "#ffffff" : "transparent", borderRadius: "6px", fontWeight: "bold", color: authMode === "login" ? "#0f172a" : "#64748b", cursor: "pointer", boxShadow: authMode === "login" ? "0 2px 4px rgba(0,0,0,0.05)" : "none", transition: "all 0.2s" }}
        >
          Login
        </button>
        <button 
          type="button"
          onClick={() => { setAuthMode("signup"); setAuthError(""); }}
          style={{ flex: 1, padding: "10px", border: "none", background: authMode === "signup" ? "#ffffff" : "transparent", borderRadius: "6px", fontWeight: "bold", color: authMode === "signup" ? "#0f172a" : "#64748b", cursor: "pointer", boxShadow: authMode === "signup" ? "0 2px 4px rgba(0,0,0,0.05)" : "none", transition: "all 0.2s" }}
        >
          Sign Up
        </button>
      </div>

      {authError && <div style={{ background: "#fee2e2", color: "#991b1b", padding: "10px", borderRadius: "6px", fontSize: "13px", marginBottom: "20px" }}>{authError}</div>}

      <form onSubmit={handleAuthSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px", textAlign: "left" }}>
        <div>
          <label style={{ fontSize: "12px", fontWeight: "bold", color: "#475569", display: "block", marginBottom: "6px" }}>USERNAME</label>
          <input 
            type="text" 
            placeholder="Enter your username" 
            value={authUsername}
            onChange={(e) => setAuthUsername(e.target.value)}
            required
            style={{ width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid #cbd5e0", fontSize: "14px", boxSizing: "border-box" }}
          />
        </div>
        <div>
          <label style={{ fontSize: "12px", fontWeight: "bold", color: "#475569", display: "block", marginBottom: "6px" }}>PASSWORD</label>
          <input 
            type="password" 
            placeholder="Enter your password" 
            value={authPassword}
            onChange={(e) => setAuthPassword(e.target.value)}
            required
            style={{ width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid #cbd5e0", fontSize: "14px", boxSizing: "border-box" }}
          />
        </div>
        <button 
          type="submit"
          style={{ background: "#2563eb", color: "white", padding: "12px", border: "none", borderRadius: "8px", fontSize: "16px", fontWeight: "bold", cursor: "pointer", marginTop: "10px", width: "100%" }}
        >
          {authMode === "signup" ? "Create Account" : "Log In"}
        </button>
      </form>
    </div>
  );
}