import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useEffect, useState } from "react";
import { FaEye, FaEyeSlash } from "react-icons/fa";

import "./Register.css";

import logo from "../../assets/images/logo.png";
import registerBg from "../../assets/images/login-reg-bg.png";

export default function Register() {
  const { isAuthenticated, register } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleGoogleSignIn = () => {
    const apiUrl = import.meta.env.VITE_API_URL;
    const redirectPath = import.meta.env.VITE_GOOGLE_REDIRECT_PATH || "/auth/google/redirect";
    window.location.href = `${apiUrl}${redirectPath}`;
  };

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/dashboard");
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();

    // Name can't be blank or only spaces
    if (!cleanName) {
      setError("Full name cannot be empty or only spaces.");
      return;
    }

    // Email must end with @gmail.com (case/space safe)
    if (!cleanEmail.endsWith("@gmail.com")) {
      setError("Email must end with @gmail.com");
      return;
    }

    // Password must be at least 8 characters
    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    // Confirm password match
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const result = await register(cleanName, cleanEmail, password);

      if (result.success) {
        alert(
          `🎉 Welcome to Lantern, ${cleanName}!\n\n` +
            `Your account has been successfully created.\n` +
            `We're excited to have you on board 🚀`
        );

        navigate("/dashboard");
      } else {
        setError(result.message);
      }
    } catch (err) {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="registerPage"
      style={{ backgroundImage: `url(${registerBg})` }}
    >
      <Link to="/" className="registerBrand" aria-label="Go to Home">
        <img className="registerBrandLogo" src={logo} alt="Lantern logo" />
        <span className="registerBrandText">LANTERN</span>
      </Link>

      <div className="registerCenter">
        <div className="registerCard">
          <div className="registerHeader">
            <h2 className="registerTitle">Register</h2>
            <p className="registerSubtitle">Create a new account</p>
          </div>

          {error && <div className="registerError">{error}</div>}

          <form onSubmit={handleSubmit} className="registerForm">
            <div className="registerField">
              <label className="registerLabel">Full Name</label>
              <input
                className="registerInput"
                type="text"
                placeholder="enter your name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
              />
            </div>

            <div className="registerField">
              <label className="registerLabel">Email</label>
              <input
                className="registerInput"
                type="email"
                placeholder="example@gmail.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>

            <div className="registerField">
              <label className="registerLabel">Password</label>
              <div className="registerPasswordWrap">
                <input
                  className="registerInput registerPasswordInput"
                  type={showPassword ? "text" : "password"}
                  placeholder="enter your password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="registerPasswordToggleBtn"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
            </div>

            <div className="registerField">
              <label className="registerLabel">Confirm Password</label>
              <div className="registerPasswordWrap">
                <input
                  className="registerInput registerPasswordInput"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="confirm your password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="registerPasswordToggleBtn"
                  onClick={() => setShowConfirmPassword((v) => !v)}
                  aria-label={
                    showConfirmPassword ? "Hide password" : "Show password"
                  }
                >
                  {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`registerButton ${loading ? "isLoading" : ""}`}
            >
              {loading ? "Registering..." : "Register"}
            </button>
          </form>

          <div className="registerDivider" aria-hidden="true">
            <span>or</span>
          </div>

          <button type="button" className="registerGoogleButton" onClick={handleGoogleSignIn}>
            Continue with Google
          </button>

          <p className="registerFooterText">
            Already have an account?{" "}
            <Link to="/login" className="registerFooterLink">
              Login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
