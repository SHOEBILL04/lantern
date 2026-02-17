import { useAuth } from "../../context/AuthContext";

export default function Dashboard() {
  const { user } = useAuth();
  
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "2rem" }}>
      <header style={{ marginBottom: "2rem" }}>
        <h1 style={{ fontSize: "2rem", fontWeight: "bold" }}>Dashboard</h1>
        <p style={{ color: "#4b5563" }}>Welcome back, {user?.name || "User"}!</p>
      </header>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1.5rem", marginBottom: "2rem" }}>
        <div style={statCardStyle}>
          <h3 style={statTitleStyle}>Total Tasks</h3>
          <p style={statValueStyle}>12</p>
        </div>
        <div style={statCardStyle}>
          <h3 style={statTitleStyle}>Completed</h3>
          <p style={statValueStyle}>8</p>
        </div>
        <div style={statCardStyle}>
          <h3 style={statTitleStyle}>Pending</h3>
          <p style={statValueStyle}>4</p>
        </div>
      </div>

      <div style={{ background: "#ffffff", padding: "1.5rem", borderRadius: "0.5rem", border: "1px solid #e5e7eb" }}>
        <h2 style={{ fontSize: "1.25rem", fontWeight: "bold", marginBottom: "1rem" }}>Recent Activity</h2>
        <ul style={{ listStyle: "none", padding: 0 }}>
          <li style={activityItemStyle}>Assignment 1 Completed</li>
          <li style={activityItemStyle}>Assignment 2 Completed</li>
          <li style={activityItemStyle}>Joined Study Group</li>
        </ul>
      </div>
    </div>
  );
}

const statCardStyle = {
  background: "#ffffff",
  padding: "1.5rem",
  borderRadius: "0.5rem",
  border: "1px solid #e5e7eb",
  textAlign: "center",
};

const statTitleStyle = {
  fontSize: "0.875rem",
  color: "#6b7280",
  marginBottom: "0.5rem",
};

const statValueStyle = {
  fontSize: "1.5rem",
  fontWeight: "bold",
};

const activityItemStyle = {
  padding: "0.75rem 0",
  borderBottom: "1px solid #f3f4f6",
  color: "#374151",
};
