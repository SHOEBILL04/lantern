import { Outlet, useLocation } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import Navbar from "./components/Navbar";

export default function App() {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  const isWelcomeRoute = location.pathname === "/";

  return (
    <div
      style={{
        minHeight: "100vh",

        // Dark background handled by Welcome page itself
        background: isAuthenticated && !isWelcomeRoute ? "#f3f4f6" : "transparent",

        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* ✅ Show global navbar ONLY when logged in AND not on welcome */}
      {isAuthenticated && !isWelcomeRoute && <Navbar />}

      <main style={{ flex: 1 }}>
        <Outlet />
      </main>

      {/* ✅ Footer only when logged in AND not on welcome */}
      {isAuthenticated && !isWelcomeRoute && (
        <footer
          style={{
            paddingTop: "1.5rem",
            paddingBottom: "1.5rem",
            borderTop: "1px solid #21262d",
            textAlign: "center",
            fontSize: "0.75rem",
            color: "#475569",
            fontFamily: "var(--font-sans, sans-serif)",
            background: "#0d1117",
          }}
        >
          © {new Date().getFullYear()} Lantern. All rights reserved.
        </footer>
      )}
    </div>
  );
}
