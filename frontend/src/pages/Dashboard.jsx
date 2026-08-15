// eslint-disable-next-line no-unused-vars
import React, { useState, useMemo } from "react";
import axios from "axios";
import { useAudioRecorder } from "../hooks/useAudioRecorder";

const tiers = {
  Beginner: [
    "What is great for the goose is great for the gander.",
    "The rain in Spain stays mainly in the plain."
  ],
  Intermediate: [
    "Specific Pacific traffic statistics can become problematic.",
    "Six slippery snails slid slowly seaward."
  ],
  Advanced: [
    "The sixth sick sheik's sixth sheep's sick.",
    "Pad pended plummet plummeting punctuated by particulate particles."
  ]
};

function AudioPlayer({ blob }) {
  const audioUrl = useMemo(() => {
    if (!blob) return "";
    return URL.createObjectURL(blob);
  }, [blob]);

  if (!audioUrl) return null;

  return (
    <audio 
      src={audioUrl} 
      controls 
      style={{ width: "100%", height: "35px" }} 
    />
  );
}

export default function Dashboard({ user, onUpdateUser, onLogout , onViewHistory}) {
  const [selectedTier, setSelectedTier] = useState(user.current_tier || "Beginner");
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState(0);
  const [fetchedSentence, setFetchedSentence] = useState("");
  
  const targetSentence = fetchedSentence || tiers[selectedTier][currentSentenceIndex];
  
  const { recording, audioBlob, startRecording, stopRecording } = useAudioRecorder();
  
  const [loading, setLoading] = useState(false);
  const [resultData, setResultData] = useState(null);

  const handleFetchRandomSentence = async () => {
    setResultData(null);
    try {
      const response = await axios.get(`http://127.0.0.1:8000/get-random-sentence?tier=${selectedTier}`);
      setFetchedSentence(response.data.sentence);
    } catch (err) {
      console.error("Failed to fetch random sentence:", err);
      alert("Make sure your backend is running to fetch random sentences!");
    }
  };

  const handleTierChange = (tier) => {
    setSelectedTier(tier);
    setCurrentSentenceIndex(0);
    setFetchedSentence(""); // Reset dynamic sentence on tier switch
    setResultData(null);
  };

  const handleNextSentence = () => {
    setResultData(null);
    setFetchedSentence(""); // Clear dynamic override to cycle through tier list
    setCurrentSentenceIndex((prev) => (prev + 1) % tiers[selectedTier].length);
  };

  const handleSubmitAudio = async () => {
    if (!audioBlob || loading) return;

    setLoading(true);
    const formData = new FormData();
    formData.append("audio", audioBlob, "recording.webm");
    formData.append("target_text", targetSentence); 

    try {
      // Evaluate pronunciation
      const response = await axios.post("http://127.0.0.1:8000/evaluate-speech", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setResultData(response.data);

      // Calculate earned XP and update backend database progress with current tier
      const earnedXp = Math.round(response.data.overall_score);
      const progResponse = await axios.post("http://127.0.0.1:8000/update-progress", {
        username: user.username,
        tier: selectedTier,
        earned_xp: earnedXp,
        score: response.data.overall_score,
        sentence: targetSentence,
        duration: response.data.duration_seconds
      });

      // Update active user session object locally including tier XPs
      onUpdateUser({
        ...user,
        xp: progResponse.data.xp,
        current_tier: progResponse.data.current_tier,
        beginner_xp: progResponse.data.beginner_xp,
        intermediate_xp: progResponse.data.intermediate_xp,
        advanced_xp: progResponse.data.advanced_xp
      });

    } catch (err) {
      console.error("Error evaluating speech:", err.response ? err.response.data : err.message);
      alert("Failed to evaluate speech or update progress.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ fontFamily: "sans-serif", maxWidth: "650px", margin: "40px auto", padding: "20px", textAlign: "center" }}>
      
      {/* Topmost user navigation header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#f8f9fa", padding: "12px 20px", borderRadius: "10px", marginBottom: "20px", border: "1px solid #e9ecef" }}>
        <div style={{ textAlign: "left" }}>
          <span style={{ fontWeight: "bold", color: "#2c3e50", fontSize: "15px" }}>👤 {user.username}</span>
          <span style={{ marginLeft: "15px", fontSize: "13px", background: "#e2e8f0", padding: "3px 10px", borderRadius: "12px", color: "#4a5568", fontWeight: "600" }}>⭐ XP: {user.xp}</span>
          <span style={{ marginLeft: "10px", fontSize: "13px", background: "#dbeafe", padding: "3px 10px", borderRadius: "12px", color: "#1e40af", fontWeight: "600" }}>🏆 Tier: {user.current_tier}</span>
        </div>
        {/* actions in the header  */}
        
          <button 
            onClick={onViewHistory}
            style={{ background: "#8b5cf6", color: "white", border: "none", padding: "8px 12px", borderRadius: "6px", cursor: "pointer", fontSize: "12px", fontWeight: "bold", marginRight: "8px" }}
          >
            History Log
          </button>
        <button 
          onClick={onLogout}
          style={{ background: "#ef4444", color: "white", border: "none", padding: "8px 14px", borderRadius: "6px", cursor: "pointer", fontSize: "12px", fontWeight: "bold" }}
        >
          Log Out
        </button>
      </div>

      <h1>🗣️ PronouncePath Dashboard</h1>
      
      {/* Tier Selector Navigation with Exact XP Milestones */}
      <div style={{ display: "flex", justifyContent: "center", gap: "10px", margin: "20px 0" }}>
        {Object.keys(tiers).map((tier) => {
          const isUnlocked = 
            tier === "Beginner" || 
            (tier === "Intermediate" && user.beginner_xp >= 500) || 
            (tier === "Advanced" && user.intermediate_xp >= 1200);

          return (
            <button
              key={tier}
              onClick={() => isUnlocked && handleTierChange(tier)}
              disabled={!isUnlocked}
              style={{
                padding: "8px 16px",
                borderRadius: "20px",
                border: "none",
                cursor: isUnlocked ? "pointer" : "not-allowed",
                fontWeight: "bold",
                backgroundColor: selectedTier === tier ? "#2563eb" : isUnlocked ? "#f1f5f9" : "#e2e8f0",
                color: selectedTier === tier ? "white" : isUnlocked ? "#475569" : "#94a3b8"
              }}
            >
              {tier} {!isUnlocked && (tier === "Intermediate" ? `🔒 (${user.beginner_xp}/500 XP)` : `🔒 (${user.intermediate_xp}/1200 XP)`)}
            </button>
          );
        })}
      </div>

      {/* Target Phrase Box & Randomizer Button */}
      <div style={{ background: "#f8f9fa", padding: "20px", borderRadius: "10px", margin: "20px 0", border: "1px solid #e9ecef", textAlign: "left" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
          <p style={{ fontSize: "14px", color: "#64748b", margin: "0" }}>
            {fetchedSentence ? "Random Sentence:" : `Practice Sentence (${currentSentenceIndex + 1} of ${tiers[selectedTier].length}):`}
          </p>
          <button
            onClick={handleFetchRandomSentence}
            style={{ background: "#8b5cf6", color: "white", border: "none", padding: "6px 12px", borderRadius: "6px", cursor: "pointer", fontSize: "12px", fontWeight: "bold" }}
          >
            🎲 Fetch Random Sentence
          </button>
        </div>
        <p style={{ fontSize: "20px", fontWeight: "bold", color: "#1e293b", margin: "0" }}>{targetSentence}</p>
      </div>

      {/* to record - start/end */}
      <div style={{ margin: "20px 0", display: "flex", flexDirection: "column", alignItems: "center", gap: "12px" }}>
        {!recording ? (
          <button 
            onClick={startRecording} 
            disabled={loading}
            style={{ background: "#dc2626", color: "white", padding: "12px 24px", border: "none", borderRadius: "8px", fontSize: "16px", cursor: "pointer", fontWeight: "bold", width: "240px" }}
          >
            🔴 Start Recording
          </button>
        ) : (
          <button 
            onClick={stopRecording} 
            style={{ background: "#1e293b", color: "white", padding: "12px 24px", border: "none", borderRadius: "8px", fontSize: "16px", cursor: "pointer", fontWeight: "bold", width: "240px" }}
          >
            ⏹️ Stop Recording
          </button>
        )}

        {/* Audio Playback */}
        {audioBlob && !recording && (
          <div style={{ width: "240px", textAlign: "center" }}>
            <p style={{ fontSize: "12px", color: "#64748b", margin: "0 0 4px 0" }}>Review your recording:</p>
            <AudioPlayer blob={audioBlob} />
          </div>
        )}

        <button 
          onClick={handleSubmitAudio} 
          disabled={!audioBlob || recording || loading}
          style={{ 
            background: (!audioBlob || recording || loading) ? "#cbd5e0" : "#16a34a", 
            color: "white", 
            padding: "12px 24px", 
            border: "none", 
            borderRadius: "8px", 
            fontSize: "16px", 
            cursor: (!audioBlob || recording || loading) ? "not-allowed" : "pointer", 
            fontWeight: "bold",
            width: "240px"
          }}
        >
          {loading ? "Analyzing Phonemes..." : "✨ Evaluate Pronunciation"}
        </button>
      </div>

      {/* Results Display Area */}
      <div style={{ minHeight: "150px" }}>
        {resultData && resultData.overall_score !== undefined && (
          <div style={{ marginTop: "20px", textAlign: "left", background: "#fff", border: "1.5px solid #e2e8f0", padding: "20px", borderRadius: "10px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h3>Score: <span style={{ color: resultData.overall_score > 70 ? "#16a34a" : "#dc2626" }}>{resultData.overall_score}%</span></h3>
                <p style={{ fontSize: "12px", color: "#64748b", margin: "0" }}>Duration: {resultData.duration_seconds}s</p>
              </div>
              <button 
                onClick={handleNextSentence}
                style={{ background: "#2563eb", color: "white", border: "none", padding: "6px 12px", borderRadius: "6px", cursor: "pointer", fontSize: "12px", fontWeight: "bold" }}
              >
                Next Sentence ➡️
              </button>
            </div>

            <p style={{ margin: "10px 0", color: "#334155" }}><strong>Feedback:</strong> {resultData.feedback}</p>
            <p style={{ margin: "15px 0 5px 0" }}><strong>Phonetic Word Breakdown:</strong></p>
            
            <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", marginTop: "10px" }}>
              {resultData.word_breakdown && resultData.word_breakdown.map((item, index) => (
                <div 
                  key={index} 
                  style={{
                    padding: "10px 14px",
                    borderRadius: "8px",
                    color: "white",
                    backgroundColor: item.status === "green" ? "#16a34a" : "#dc2626",
                    fontWeight: "bold",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-start",
                    minWidth: "110px",
                    boxShadow: "0 2px 4px rgba(0,0,0,0.05)"
                  }}
                >
                  <span style={{ fontSize: "16px" }}>{item.word}</span>
                  <span style={{ fontSize: "11px", fontWeight: "normal", opacity: 0.9, marginTop: "4px" }}>
                    Target: [{item.target_ipa}]
                  </span>
                  <span style={{ fontSize: "11px", fontWeight: "normal", opacity: 0.9 }}>
                    Spoken: [{item.recognized_ipa}]
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}