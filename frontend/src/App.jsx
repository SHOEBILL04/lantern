import { Link, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";

export default function App() {
  const { isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f3f4f6",
        color: "#1f2937",
        display: "flex",
        flexDirection: "column",
        fontFamily: "sans-serif",
      }}
    >
      {/* Navbar */}
      <nav
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "1rem 2rem",
          background: "#ffffff",
          borderBottom: "1px solid #e5e7eb",
          position: "sticky",
          top: 0,
          zIndex: 50,
        }}
      >
        <Link
          to={isAuthenticated ? "/dashboard" : "/"}
          style={{
            color: "#2563eb",
            textDecoration: "none",
            fontSize: "1.25rem",
            fontWeight: "bold",
          }}
        >
          LANTERN
        </Link>

        <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
          {!isAuthenticated ? (
            <>
              <Link to="/login" style={secondaryButtonStyle}>
                Login
              </Link>
              <Link to="/register" style={primaryButtonStyle}>
                Register
              </Link>
            </>
          ) : (
            <button onClick={handleLogout} style={logoutButtonStyle}>
              Logout
            </button>
          )}
        </div>
      </nav>

      {/* Main Content Area */}
      <main style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <Outlet />
      </main>

      {/* Footer */}
      <footer
        style={{
          padding: "1.5rem",
          borderTop: "1px solid #e5e7eb",
          textAlign: "center",
          fontSize: "0.875rem",
          color: "#6b7280",
          background: "#ffffff",
        }}
      >
        © 2026 Lantern. All rights reserved.
      </footer>
    </div>
  );
}

const primaryButtonStyle = {
  padding: "0.5rem 1rem",
  borderRadius: "0.375rem",
  background: "#2563eb",
  color: "#ffffff",
  fontWeight: 600,
  textDecoration: "none",
  fontSize: "0.875rem",
};

const secondaryButtonStyle = {
  padding: "0.5rem 1rem",
  borderRadius: "0.375rem",
  border: "1px solid #d1d5db",
  color: "#374151",
  textDecoration: "none",
  fontSize: "0.875rem",
  fontWeight: 500,
};

const logoutButtonStyle = {
  padding: "0.5rem 1rem",
  borderRadius: "0.375rem",
  background: "#ef4444",
  color: "#ffffff",
  fontWeight: 600,
  border: "none",
  cursor: "pointer",
  fontSize: "0.875rem",
};
