import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useEffect, useState } from "react";
import { FaEye, FaEyeSlash } from "react-icons/fa";

import "./Login.css";

import logo from "../../assets/images/logo.png";
import loginBg from "../../assets/images/login-reg-bg.png";

export default function Login() {
  const { isAuthenticated, login } = useAuth();
  const navigate = useNavigate();

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
                onChange={(e) => setEmail(e.target.value)}
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
                  onChange={(e) => setPassword(e.target.value)}
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