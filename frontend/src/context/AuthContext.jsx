import React, { createContext, useContext, useState, useEffect } from "react";
import api from "../api/client";
import { ENDPOINTS } from "../api/endpoints";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  // Force cleanup of legacy token immediately on load
  if (localStorage.getItem("token")) {
    localStorage.removeItem("token");
  }

  const [isAuthenticated, setIsAuthenticated] = useState(
    localStorage.getItem("isAuthenticated") === "true"
  );
  const [user, setUser] = useState(JSON.parse(localStorage.getItem("user")) || null);

  const login = async (email, password) => {
    try {
      const response = await api.post(ENDPOINTS.LOGIN, { email, password });
      setIsAuthenticated(true);
      setUser(response.data.user);
      localStorage.setItem("isAuthenticated", "true");
      localStorage.setItem("user", JSON.stringify(response.data.user));
      return { success: true };
    } catch (error) {
      console.error("Login failed:", error);
      return {
        success: false,
        message: error.response?.data?.message || "Invalid credentials"
      };
    }
  };

  const register = async (name, email, password) => {
    try {
      const response = await api.post(ENDPOINTS.REGISTER, { name, email, password });
      setIsAuthenticated(true);
      setUser(response.data.user);
      localStorage.setItem("isAuthenticated", "true");
      localStorage.setItem("user", JSON.stringify(response.data.user));
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
      setIsAuthenticated(false);
      setUser(null);
      localStorage.removeItem("isAuthenticated");
      localStorage.removeItem("user");
      localStorage.removeItem("token"); // Cleanup legacy token
    }
  };

  const checkAuth = async () => {
    try {
      const response = await api.post(ENDPOINTS.ME); // Using POST as defined in api.php
      setIsAuthenticated(true);
      setUser(response.data);
    } catch (error) {
      console.error("Auth check failed:", error);
      setIsAuthenticated(false);
      setUser(null);
      localStorage.removeItem("isAuthenticated");
      localStorage.removeItem("user");
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
