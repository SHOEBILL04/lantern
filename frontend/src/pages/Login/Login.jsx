import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useEffect, useState } from "react";

export default function Login() {
  const { isAuthenticated, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/dashboard");
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    
    const result = await login(email, password);
    
    if (result.success) {
      navigate("/dashboard");
    } else {
      setError(result.message);
    }
    setLoading(false);
  };

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "400px",
          background: "#ffffff",
          padding: "2rem",
          borderRadius: "0.5rem",
          border: "1px solid #e5e7eb",
          boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.1)",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
          <h2 style={{ fontSize: "1.5rem", fontWeight: "bold" }}>Login</h2>
          <p style={{ color: "#6b7280" }}>Sign in to your account</p>
        </div>

        {error && (
          <div style={{ marginBottom: "1rem", color: "#ef4444", fontSize: "0.875rem", textAlign: "center", padding: "0.5rem", background: "#fef2f2", borderRadius: "0.375rem" }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
            <label style={{ fontSize: "0.875rem", fontWeight: 500 }}>Email</label>
            <input
              type="email"
              placeholder="email@example.com"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={inputStyle}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
            <label style={{ fontSize: "0.875rem", fontWeight: 500 }}>Password</label>
            <input
              type="password"
              placeholder="••••••••"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={inputStyle}
            />
          </div>

          <button type="submit" disabled={loading} style={{...submitButtonStyle, opacity: loading ? 0.7 : 1}}>
            {loading ? "Signing In..." : "Sign In"}
          </button>
        </form>

        <p style={{ marginTop: "1.5rem", textAlign: "center", color: "#6b7280", fontSize: "0.875rem" }}>
          Don't have an account?{" "}
          <Link to="/register" style={{ color: "#2563eb", textDecoration: "none", fontWeight: "bold" }}>
            Register
          </Link>
        </p>
      </div>
    </div>
  );
}

const inputStyle = {
  padding: "0.5rem 0.75rem",
  borderRadius: "0.375rem",
  border: "1px solid #d1d5db",
  fontSize: "1rem",
  outline: "none",
};

const submitButtonStyle = {
  marginTop: "0.5rem",
  padding: "0.6rem",
  borderRadius: "0.375rem",
  border: "none",
  background: "#2563eb",
  color: "#ffffff",
  fontWeight: "bold",
  fontSize: "1rem",
  cursor: "pointer",
};
