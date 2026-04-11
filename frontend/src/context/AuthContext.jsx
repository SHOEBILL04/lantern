import React, { createContext, useContext, useState, useEffect } from "react";
import api from "../api/client";
import { ENDPOINTS } from "../api/endpoints";

const AuthContext = createContext();

const normalizeServerMessage = (message) => {
  if (typeof message !== "string") {
    return "";
  }

  const trimmed = message.trim();
  const normalized = trimmed.toLowerCase();

  if (!trimmed) {
    return "";
  }

  if (normalized === "unauthorized") {
    return "Email or password is incorrect. Please try again.";
  }

  if (normalized.includes("google sign-in")) {
    return "This account uses Google sign-in. Please continue with Google.";
  }

  if (normalized.includes("please verify your email")) {
    return "Please verify your email first. Check your inbox for the OTP code.";
  }

  if (normalized.includes("email has already been taken")) {
    return "An account with this email already exists. Please log in instead.";
  }

  if (normalized.includes("already exists. please log in")) {
    return "An account with this email already exists. Please log in instead.";
  }

  if (normalized.includes("name field is required")) {
    return "Please enter your full name.";
  }

  if (normalized.includes("email field is required")) {
    return "Please enter your email address.";
  }

  if (normalized.includes("email must be a valid email address")) {
    return "Please enter a valid email address.";
  }

  if (normalized.includes("password field is required")) {
    return "Please enter your password.";
  }

  if (normalized.includes("password must be at least")) {
    return "Password must be at least 8 characters long.";
  }

  if (normalized.includes("invalid verification code")) {
    return "That verification code is invalid. Please try again.";
  }

  if (normalized.includes("invalid reset code")) {
    return "That reset code is invalid. Please try again.";
  }

  if (normalized.includes("code has expired")) {
    return "This OTP code has expired. Please request a new one.";
  }

  if (normalized.includes("too many incorrect attempts")) {
    return "Too many incorrect attempts. Please request a new OTP code.";
  }

  return trimmed;
};

const getFirstValidationMessage = (errors) => {
  if (!errors || typeof errors !== "object") {
    return "";
  }

  for (const fieldErrors of Object.values(errors)) {
    if (Array.isArray(fieldErrors) && fieldErrors.length > 0) {
      return normalizeServerMessage(fieldErrors[0]);
    }
  }

  return "";
};

const getFriendlyAuthMessage = (error, fallbackMessage) => {
  if (!error?.response) {
    return "We could not reach the server. Please check your internet connection and try again.";
  }

  const { status, data = {} } = error.response;
  const validationMessage = getFirstValidationMessage(data.errors);

  if (validationMessage) {
    return validationMessage;
  }

  const normalizedServerMessage = normalizeServerMessage(data.message || data.error);

  if (status === 401) {
    return normalizedServerMessage || "Email or password is incorrect. Please try again.";
  }

  if (status === 429) {
    return "Too many attempts. Please wait a moment and try again.";
  }

  if (status === 503) {
    return (
      normalizedServerMessage ||
      "Authentication is temporarily unavailable. Please check the server and database connection, then try again."
    );
  }

  if (status >= 500) {
    return "Something went wrong on our side. Please try again in a moment.";
  }

  return normalizedServerMessage || fallbackMessage;
};

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(
    localStorage.getItem("isAuthenticated") === "true"
  );
  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem("user");
      return (savedUser && savedUser !== "undefined") ? JSON.parse(savedUser) : null;
    } catch (e) {
      console.error("Failed to parse user from localStorage", e);
      return null;
    }
  });
  const [authLoading, setAuthLoading] = useState(true);

  const hasStoredAuthState = () => {
    const savedUser = localStorage.getItem("user");

    return (
      localStorage.getItem("token") ||
      localStorage.getItem("isAuthenticated") === "true" ||
      (savedUser && savedUser !== "undefined")
    );
  };

  const persistAuthenticatedUser = (authenticatedUser, token) => {
    setIsAuthenticated(true);
    setUser(authenticatedUser);
    localStorage.setItem("isAuthenticated", "true");
    localStorage.setItem("user", JSON.stringify(authenticatedUser));
    if (token) {
      localStorage.setItem("token", token);
    }
  };

  const clearAuthState = () => {
    setIsAuthenticated(false);
    setUser(null);
    localStorage.removeItem("isAuthenticated");
    localStorage.removeItem("user");
    localStorage.removeItem("token");
  };

  const login = async (email, password) => {
    try {
      const response = await api.post(ENDPOINTS.LOGIN, { email, password });
      persistAuthenticatedUser(response.data.user, response.data.access_token);
      return { success: true };
    } catch (error) {
      console.error("Login failed:", error);
      return {
        success: false,
        message: getFriendlyAuthMessage(
          error,
          "We could not sign you in right now. Please try again."
        ),
      };
    }
  };

  const register = async (name, email, password) => {
    try {
      const response = await api.post(ENDPOINTS.REGISTER, { name, email, password });
      const verificationRequired = response.data?.verification_required === true;

      if (verificationRequired) {
        return {
          success: true,
          verificationRequired: true,
          email: response.data?.email || email,
          otp: response.data?.otp || "",
          message:
            response.data?.message ||
            "Account created. Please verify your email using the OTP code.",
        };
      }

      if (response.data?.user && response.data?.access_token) {
        persistAuthenticatedUser(response.data.user, response.data.access_token);
      }

      return { success: true, verificationRequired: false };
    } catch (error) {
      console.error("Registration failed:", error);
      return {
        success: false,
        message: getFriendlyAuthMessage(
          error,
          "We could not create your account right now. Please try again."
        ),
      };
    }
  };

  const verifyEmailOtp = async (email, otp) => {
    try {
      const response = await api.post(ENDPOINTS.VERIFY_EMAIL_OTP, { email, otp });
      persistAuthenticatedUser(response.data.user, response.data.access_token);
      return { success: true };
    } catch (error) {
      console.error("Email OTP verification failed:", error);
      return {
        success: false,
        message: getFriendlyAuthMessage(
          error,
          "We could not verify your email right now. Please try again."
        ),
      };
    }
  };

  const resendEmailOtp = async (email) => {
    try {
      const response = await api.post(ENDPOINTS.RESEND_EMAIL_OTP, { email });
      return {
        success: true,
        message: response.data?.message || "A new OTP code has been sent.",
        otp: response.data?.otp || "",
      };
    } catch (error) {
      console.error("Resend email OTP failed:", error);
      return {
        success: false,
        message: getFriendlyAuthMessage(
          error,
          "We could not resend the OTP code right now. Please try again."
        ),
      };
    }
  };

  const requestPasswordResetOtp = async (email) => {
    try {
      const response = await api.post(ENDPOINTS.FORGOT_PASSWORD_REQUEST_OTP, { email });
      return {
        success: true,
        message:
          response.data?.message ||
          "If an account exists for this email, a reset code has been sent.",
      };
    } catch (error) {
      console.error("Password reset OTP request failed:", error);
      return {
        success: false,
        message: getFriendlyAuthMessage(
          error,
          "We could not process your request right now. Please try again."
        ),
      };
    }
  };

  const resetPasswordWithOtp = async (email, otp, password, passwordConfirmation) => {
    try {
      const response = await api.post(ENDPOINTS.FORGOT_PASSWORD_RESET, {
        email,
        otp,
        password,
        password_confirmation: passwordConfirmation,
      });

      return {
        success: true,
        message:
          response.data?.message ||
          "Password reset successful. Please log in with your new password.",
      };
    } catch (error) {
      console.error("Password reset failed:", error);
      return {
        success: false,
        message: getFriendlyAuthMessage(
          error,
          "We could not reset your password right now. Please try again."
        ),
      };
    }
  };

  const logout = async () => {
    try {
      await api.post(ENDPOINTS.LOGOUT);
    } catch (error) {
      console.error("Logout failed:", error);
    } finally {
      clearAuthState();
      setAuthLoading(false);
    }
  };

  const syncAuthFromServer = async () => {
    try {
      const response = await api.post(ENDPOINTS.ME);
      persistAuthenticatedUser(response.data);
      return { success: true, user: response.data };
    } catch (error) {
      if (error?.response?.status !== 401) {
        console.error("Auth check failed:", error);
      }
      clearAuthState();
      return { success: false };
    }
  };

  const checkAuth = async () => {
    setAuthLoading(true);
    try {
      if (!hasStoredAuthState()) {
        clearAuthState();
        return;
      }

      await syncAuthFromServer();
    } finally {
      setAuthLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        authLoading,
        user,
        login,
        register,
        verifyEmailOtp,
        resendEmailOtp,
        requestPasswordResetOtp,
        resetPasswordWithOtp,
        logout,
        syncAuthFromServer,
        checkAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
