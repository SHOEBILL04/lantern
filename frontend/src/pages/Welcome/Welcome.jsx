import { Link } from "react-router-dom";

export default function Welcome() {
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "2rem", textAlign: "center" }}>
      <h1 style={{ fontSize: "3rem", fontWeight: "bold", marginBottom: "1rem" }}>
        Welcome to Lantern
      </h1>
      <p style={{ fontSize: "1.25rem", color: "#4b5563", marginBottom: "2rem", maxWidth: "600px" }}>
        Your simple and effective workspace for students. Organize your tasks and achieve your goals.
      </p>
      <div style={{ display: "flex", gap: "1rem" }}>
        <Link to="/register" style={primaryButtonStyle}>
          Get Started
        </Link>
        <Link to="/login" style={secondaryButtonStyle}>
          Login
        </Link>
      </div>
    </div>
  );
}

const primaryButtonStyle = {
  padding: "0.75rem 1.5rem",
  borderRadius: "0.375rem",
  background: "#2563eb",
  color: "#ffffff",
  fontWeight: "600",
  textDecoration: "none",
};

const secondaryButtonStyle = {
  padding: "0.75rem 1.5rem",
  borderRadius: "0.375rem",
  border: "1px solid #d1d5db",
  color: "#374151",
  textDecoration: "none",
  fontWeight: "600",
};
