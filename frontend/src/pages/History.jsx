// eslint-disable-next-line no-unused-vars
import React, { useState, useEffect } from "react";
import axios from "axios";

export default function History({ user, onBackToDashboard }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const response = await axios.get(`http://127.0.0.1:8000/history/${user.username}`);
        setHistory(response.data);
      } catch (err) {
        console.error("Failed to fetch attempt history:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, [user.username]);

  return (
    <div style={{ fontFamily: "sans-serif", maxWidth: "750px", margin: "40px auto", padding: "20px" }}>
      
      {/* Top Header & Navigation */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <h2>📜 Practice History Log</h2>
        <button 
          onClick={onBackToDashboard}
          style={{ background: "#2563eb", color: "white", border: "none", padding: "8px 16px", borderRadius: "6px", cursor: "pointer", fontWeight: "bold" }}
        >
          ⬅️ Back to Dashboard
        </button>
      </div>

      <p style={{ color: "#64748b", marginBottom: "20px" }}>
        Review all your past speech evaluations, scores, and practice tiers.
      </p>

      {loading ? (
        <p>Loading history logs...</p>
      ) : history.length === 0 ? (
        <div style={{ background: "#f8f9fa", padding: "30px", borderRadius: "10px", textAlign: "center", border: "1px solid #e9ecef" }}>
          <p style={{ color: "#64748b" }}>No practice attempts recorded yet. Go record some sentences!</p>
        </div>
      ) : (
        <div style={{ overflowX: "auto", border: "1px solid #e2e8f0", borderRadius: "10px", background: "#fff" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "14px" }}>
            <thead>
              <tr style={{ background: "#f8f9fa", borderBottom: "1px solid #e2e8f0", color: "#475569" }}>
                <th style={{ padding: "12px 16px" }}>Tier</th>
                <th style={{ padding: "12px 16px" }}>Sentence</th>
                <th style={{ padding: "12px 16px" }}>Score</th>
                <th style={{ padding: "12px 16px" }}>Duration</th>
                <th style={{ padding: "12px 16px" }}>Date</th>
              </tr>
            </thead>
            <tbody>
              {history.map((item) => (
                <tr key={item.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <td style={{ padding: "12px 16px", fontWeight: "bold", color: "#1e293b" }}>{item.tier}</td>
                  <td style={{ padding: "12px 16px", color: "#334155", maxWidth: "250px" }}>{item.sentence}</td>
                  <td style={{ padding: "12px 16px", fontWeight: "bold", color: item.score >= 70 ? "#16a34a" : "#dc2626" }}>
                    {item.score}%
                  </td>
                  <td style={{ padding: "12px 16px", color: "#64748b" }}>{item.duration}s</td>
                  <td style={{ padding: "12px 16px", color: "#94a3b8", fontSize: "12px" }}>{item.timestamp}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}