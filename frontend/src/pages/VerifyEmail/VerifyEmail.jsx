import { Link, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../context/AuthContext";

import "./VerifyEmail.css";

import logo from "../../assets/images/logo.png";
import authBg from "../../assets/images/login-reg-bg.png";

const getEmailFromQuery = (search) => {
  const params = new URLSearchParams(search);
  return (params.get("email") || "").trim().toLowerCase();
};

export default function VerifyEmail() {
  const { isAuthenticated, verifyEmailOtp, resendEmailOtp } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const defaultEmail = useMemo(() => getEmailFromQuery(location.search), [location.search]);
  const prefilledOtp = typeof location.state?.otp === "string" ? location.state.otp : "";
  const stateMessage = typeof location.state?.message === "string" ? location.state.message : "";

  const [email, setEmail] = useState(defaultEmail);
  const [otp, setOtp] = useState(prefilledOtp);
  const [error, setError] = useState("");
  const [info, setInfo] = useState(
    stateMessage
      ? prefilledOtp
        ? `${stateMessage} Use OTP: ${prefilledOtp}`
        : stateMessage
      : defaultEmail
        ? `We sent a 6-digit verification code to ${defaultEmail}.`
        : "Enter your email and the 6-digit code sent to your inbox."
  );
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/dashboard");
    }
  }, [isAuthenticated, navigate]);

  const handleVerify = async (e) => {
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
      setError("Please enter the 6-digit OTP code.");
      return;
    }

    setLoading(true);
    const result = await verifyEmailOtp(cleanEmail, cleanOtp);
    setLoading(false);

    if (result.success) {
      navigate("/dashboard");
      return;
    }

    setError(result.message);
  };

  const handleResend = async () => {
    setError("");
    setInfo("");

    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
      setError("Please enter your email first.");
      return;
    }

    setResending(true);
    const result = await resendEmailOtp(cleanEmail);
    setResending(false);

    if (!result.success) {
      setError(result.message);
      return;
    }

    setInfo(
      result.otp
        ? `${result.message || "A new OTP code has been sent."} Use OTP: ${result.otp}`
        : result.message || "A new OTP code has been sent."
    );
  };

  return (
    <div className="verifyEmailPage" style={{ backgroundImage: `url(${authBg})` }}>
      <Link to="/" className="verifyEmailBrand" aria-label="Go to Home">
        <img className="verifyEmailBrandLogo" src={logo} alt="Lantern logo" />
        <span className="verifyEmailBrandText">LANTERN</span>
      </Link>

      <div className="verifyEmailCenter">
        <div className="verifyEmailCard">
          <div className="verifyEmailHeader">
            <h2 className="verifyEmailTitle">Verify Email</h2>
            <p className="verifyEmailSubtitle">Complete signup with the OTP code</p>
          </div>

          {error && <div className="verifyEmailError">{error}</div>}
          {!error && info && <div className="verifyEmailInfo">{info}</div>}

          <form onSubmit={handleVerify} className="verifyEmailForm">
            <div className="verifyEmailField">
              <label className="verifyEmailLabel">Email</label>
              <input
                className="verifyEmailInput"
                type="email"
                placeholder="email@example.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>

            <div className="verifyEmailField">
              <label className="verifyEmailLabel">OTP Code</label>
              <input
                className="verifyEmailInput"
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

            <button
              type="submit"
              disabled={loading}
              className={`verifyEmailButton ${loading ? "isLoading" : ""}`}
            >
              {loading ? "Verifying..." : "Verify & Continue"}
            </button>
          </form>

          <button
            type="button"
            className={`verifyEmailSecondaryButton ${resending ? "isLoading" : ""}`}
            onClick={handleResend}
            disabled={resending}
          >
            {resending ? "Sending..." : "Resend OTP"}
          </button>

          <p className="verifyEmailFooterText">
            Already verified?{" "}
            <Link to="/login" className="verifyEmailFooterLink">
              Login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
