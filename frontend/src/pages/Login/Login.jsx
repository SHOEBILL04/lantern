import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useEffect, useState } from "react";
import { FaEye, FaEyeSlash } from "react-icons/fa";

import "./Login.css";

import logo from "../../assets/images/logo.png";
import loginBg from "../../assets/images/login-reg-bg.png";

export default function Login() {
  const { isAuthenticated, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/dashboard");
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const errorCode = params.get("error");
    const debugHint = params.get("debug");
    const debugSuffix = import.meta.env.DEV && debugHint ? ` (Debug: ${debugHint})` : "";

    if (!errorCode) {
      setError("");
      return;
    }

    if (errorCode === "google_sync_failed") {
      setError("We could not complete Google sign-in. Please try again.");
      return;
    }

    if (errorCode === "google_auth_failed") {
      setError(`Google sign-in failed. Please try again.${debugSuffix}`);
      return;
    }

    if (errorCode === "google_auth_misconfigured") {
      setError(`Google sign-in is temporarily unavailable. Please try again later.${debugSuffix}`);
      return;
    }

    if (errorCode === "google_auth_incomplete_profile") {
      setError("Your Google account is missing required profile information. Please try a different account.");
      return;
    }

    setError("Google sign-in could not be completed. Please try again.");
  }, [location.search]);

  const handleGoogleSignIn = () => {
    const apiUrl = import.meta.env.VITE_API_URL;
    const redirectPath = import.meta.env.VITE_GOOGLE_REDIRECT_PATH || "/auth/google/redirect";

    if (!apiUrl) {
      setError("Google sign-in is unavailable right now. Please try email and password.");
      return;
    }

    window.location.href = `${apiUrl}${redirectPath}`;
  };

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
    <div className="loginPage" style={{ backgroundImage: `url(${loginBg})` }}>
      <Link to="/" className="loginBrand" aria-label="Go to Home">
        <img className="loginBrandLogo" src={logo} alt="Lantern logo" />
        <span className="loginBrandText">LANTERN</span>
      </Link>

      <div className="loginCenter">
        <div className="loginCard">
          <div className="loginHeader">
            <h2 className="loginTitle">Login</h2>
            <p className="loginSubtitle">Sign in to your account</p>
          </div>

          {error && <div className="loginError">{error}</div>}

          <form onSubmit={handleSubmit} className="loginForm">
            <div className="loginField">
              <label className="loginLabel">Email</label>
              <input
                className="loginInput"
                type="email"
                placeholder="email@example.com"
                required
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (error) {
                    setError("");
                  }
                }}
                autoComplete="email"
              />
            </div>

            <div className="loginField">
              <label className="loginLabel">Password</label>

              <div className="passwordWrap">
                <input
                  className="loginInput passwordInput"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  required
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (error) {
                      setError("");
                    }
                  }}
                  autoComplete="current-password"
                />

                <button
                  type="button"
                  className="passwordToggleBtn"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <FaEyeSlash className="passwordToggleIcon" />
                  ) : (
                    <FaEye className="passwordToggleIcon" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`loginButton ${loading ? "isLoading" : ""}`}
            >
              {loading ? "Signing In..." : "Login"}
            </button>
          </form>

          <div className="loginDivider" aria-hidden="true">
            <span>or</span>
          </div>

          <button type="button" className="loginGoogleButton" onClick={handleGoogleSignIn}>
            Continue with Google
          </button>

          <p className="loginFooterText">
            Don&apos;t have an account?{" "}
            <Link to="/register" className="loginFooterLink">
              Register
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
