import React, { createContext, useContext, useState } from "react";
import api from "../api/client";
import { ENDPOINTS } from "../api/endpoints";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
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
      localStorage.setItem("token", response.data.token);
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
      localStorage.setItem("token", response.data.token);
      return { success: true };
    } catch (error) {
      console.error("Registration failed:", error);
      return { 
        success: false, 
        message: error.response?.data?.message || "Registration failed" 
      };
    }
  };

  const logout = () => {
    setIsAuthenticated(false);
    setUser(null);
    localStorage.removeItem("isAuthenticated");
    localStorage.removeItem("user");
    localStorage.removeItem("token");
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
