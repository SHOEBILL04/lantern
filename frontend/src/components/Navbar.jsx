import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
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
        to="/dashboard"
        style={{
          color: "#2563eb",
          textDecoration: "none",
          fontSize: "1.25rem",
          fontWeight: "bold",
        }}
      >
        LANTERN
      </Link>

      <div
        style={{
          display: "flex",
          gap: "1rem",
          overflowX: "auto",
          flexWrap: "wrap",
          justifyContent: "center",
          padding: "0 1rem",
        }}
      >
        <NavLink to="/dashboard" style={navLinkStyle}>Dashboard</NavLink>
        <NavLink to="/schedule" style={navLinkStyle}>Schedule</NavLink>
        <NavLink to="/tasks" style={navLinkStyle}>Tasks</NavLink>
        <NavLink to="/progress" style={navLinkStyle}>Progress</NavLink>
        <NavLink to="/subjects" style={navLinkStyle}>Subjects</NavLink>
        <NavLink to="/notes" style={navLinkStyle}>Notes</NavLink>
        <NavLink to="/habits" style={navLinkStyle}>Habits</NavLink>
        <NavLink to="/achievements" style={navLinkStyle}>Achievements</NavLink>
        <NavLink to="/resources" style={navLinkStyle}>Resources</NavLink>
      </div>

      <button onClick={handleLogout} style={logoutButtonStyle}>
        Logout
      </button>
    </nav>
  );
}

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

const navLinkStyle = ({ isActive }) => ({
  color: isActive ? "#2563eb" : "#4b5563",
  textDecoration: "none",
  fontSize: "0.875rem",
  fontWeight: isActive ? 600 : 500,
  padding: "0.5rem",
  borderRadius: "0.375rem",
  transition: "color 0.2s, background-color 0.2s",
});