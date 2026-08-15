// eslint-disable-next-line no-unused-vars
import React, { useState } from "react";
import AuthPage from "./pages/AuthPage";
import Dashboard from "./pages/Dashboard";
import History from "./pages/History";

function App() {
  const [user, setUser] = useState(null); // null means logged out
  const [currentView, setCurrentView] = useState("dashboard");
  if (!user) {
    return <AuthPage onLoginSuccess={(userData) => setUser(userData)} />;
  }
  if(currentView === "history")
  {
    return <History user={user} onBackToDashboard={() => setCurrentView("dashboard")} />;
  }
  return ( 
    <Dashboard 
      user={user} 
      onUpdateUser={setUser} 
      onLogout={() => {setUser(null); setCurrentView("dashboard");}}
      onViewHistory = {() => setCurrentView("history")}
    />
  );
}

export default App;