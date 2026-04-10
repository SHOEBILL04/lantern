import React, { createContext, useContext, useState, useEffect } from "react";
import api from "../api/client";
import { ENDPOINTS } from "../api/endpoints";

const AuthContext = createContext();

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
        message: error.response?.data?.error || error.response?.data?.message || "Invalid credentials"
      };
    }
  };

  const register = async (name, email, password) => {
    try {
      const response = await api.post(ENDPOINTS.REGISTER, { name, email, password });
      persistAuthenticatedUser(response.data.user, response.data.access_token);
      return { success: true };
    } catch (error) {
      console.error("Registration failed:", error);
      return {
        success: false,
        message: error.response?.data?.message || "Registration failed"
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
      console.error("Auth check failed:", error);
      clearAuthState();
      return { success: false };
    }
  };

  const checkAuth = async () => {
    setAuthLoading(true);
    try {
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
