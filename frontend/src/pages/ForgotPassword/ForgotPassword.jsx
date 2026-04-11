import { Link } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "../../context/AuthContext";

import "./ForgotPassword.css";

import logo from "../../assets/images/logo.png";
import authBg from "../../assets/images/login-reg-bg.png";

export default function ForgotPassword() {
  const { requestPasswordResetOtp, resetPasswordWithOtp } = useAuth();

  const [step, setStep] = useState("request");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRequestOtp = async (e) => {
    e?.preventDefault();
    setError("");
    setInfo("");

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setError("Please enter your email.");
      return;
    }

    setLoading(true);
    const result = await requestPasswordResetOtp(cleanEmail);
    setLoading(false);

    if (!result.success) {
      setError(result.message);
      return;
    }

    setInfo(result.message);
    setStep("reset");
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError("");
    setInfo("");

    const cleanEmail = email.trim().toLowerCase();
    const cleanOtp = otp.trim();

    if (!cleanEmail) {
      setError("Please enter your email.");
      return;
    }

    if (!/^\d{6}$/.test(cleanOtp)) {
      setError("Please enter the 6-digit reset OTP.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    const result = await resetPasswordWithOtp(cleanEmail, cleanOtp, password, confirmPassword);
    setLoading(false);

    if (!result.success) {
      setError(result.message);
      return;
    }

    setInfo(result.message);
    setOtp("");
    setPassword("");
    setConfirmPassword("");
  };

  return (
    <div className="forgotPasswordPage" style={{ backgroundImage: `url(${authBg})` }}>
      <Link to="/" className="forgotPasswordBrand" aria-label="Go to Home">
        <img className="forgotPasswordBrandLogo" src={logo} alt="Lantern logo" />
        <span className="forgotPasswordBrandText">LANTERN</span>
      </Link>

      <div className="forgotPasswordCenter">
        <div className="forgotPasswordCard">
          <div className="forgotPasswordHeader">
            <h2 className="forgotPasswordTitle">Forgot Password</h2>
            <p className="forgotPasswordSubtitle">
              {step === "request"
                ? "Request an OTP to reset your password"
                : "Enter OTP and set a new password"}
            </p>
          </div>

          {error && <div className="forgotPasswordError">{error}</div>}
          {!error && info && <div className="forgotPasswordInfo">{info}</div>}

          {step === "request" ? (
            <form onSubmit={handleRequestOtp} className="forgotPasswordForm">
              <div className="forgotPasswordField">
                <label className="forgotPasswordLabel">Email</label>
                <input
                  className="forgotPasswordInput"
                  type="email"
                  placeholder="email@example.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className={`forgotPasswordButton ${loading ? "isLoading" : ""}`}
              >
                {loading ? "Sending..." : "Send OTP"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleResetPassword} className="forgotPasswordForm">
              <div className="forgotPasswordField">
                <label className="forgotPasswordLabel">Email</label>
                <input
                  className="forgotPasswordInput"
                  type="email"
                  placeholder="email@example.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
              </div>

              <div className="forgotPasswordField">
                <label className="forgotPasswordLabel">OTP Code</label>
                <input
                  className="forgotPasswordInput"
                  type="text"
                  inputMode="numeric"
                  pattern="\d{6}"
                  maxLength={6}
                  placeholder="123456"
                  required
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                  autoComplete="one-time-code"
                />
              </div>

              <div className="forgotPasswordField">
                <label className="forgotPasswordLabel">New Password</label>
                <input
                  className="forgotPasswordInput"
                  type="password"
                  placeholder="enter new password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                />
              </div>

              <div className="forgotPasswordField">
                <label className="forgotPasswordLabel">Confirm New Password</label>
                <input
                  className="forgotPasswordInput"
                  type="password"
                  placeholder="confirm new password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className={`forgotPasswordButton ${loading ? "isLoading" : ""}`}
              >
                {loading ? "Resetting..." : "Reset Password"}
              </button>
            </form>
          )}

          {step === "reset" && (
            <button
              type="button"
              className={`forgotPasswordSecondaryButton ${loading ? "isLoading" : ""}`}
              disabled={loading}
              onClick={handleRequestOtp}
            >
              Resend OTP
            </button>
          )}

          <p className="forgotPasswordFooterText">
            Back to{" "}
            <Link to="/login" className="forgotPasswordFooterLink">
              Login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
