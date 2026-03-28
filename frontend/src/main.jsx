import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import App from "./App";
import Welcome from "./pages/Welcome/Welcome";
import Login from "./pages/Login/Login";
import Register from "./pages/Register/Register";
import HowToStudy from "./pages/HowToStudy/HowToStudy";
import About from "./pages/About/About";

import Dashboard from "./pages/Dashboard/Dashboard";
import Schedule from "./pages/Schedule/Schedule";
import Tasks from "./pages/Tasks/Tasks";
import Progress from "./pages/Progress/Progress";
import Notes from "./pages/Notes/Notes";
import Habits from "./pages/Habits/Habits";
import Achievements from "./pages/Achievements/Achievements";

import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";

import "./index.css";
import "./styles/base/fonts.css";
import "./styles/base/globals.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <AuthProvider>
    <BrowserRouter>
      <Routes>
        {/* App is the layout (Navbar & Sidebar) */}
        <Route path="/" element={<App />}>
          <Route index element={<Welcome />} />
          <Route path="login" element={<Login />} />
          <Route path="register" element={<Register />} />
          <Route path="how-to-study" element={<HowToStudy />} />
          <Route path="about" element={<About />} />

          <Route path="dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="schedule" element={<ProtectedRoute><Schedule /></ProtectedRoute>} />
          <Route path="tasks" element={<ProtectedRoute><Tasks /></ProtectedRoute>} />
          <Route path="progress" element={<ProtectedRoute><Progress /></ProtectedRoute>} />
          <Route path="notes" element={<ProtectedRoute><Notes /></ProtectedRoute>} />
          <Route path="habits" element={<ProtectedRoute><Habits /></ProtectedRoute>} />
          <Route path="achievements" element={<ProtectedRoute><Achievements /></ProtectedRoute>} />
        </Route>
      </Routes>
    </BrowserRouter>
  </AuthProvider>
);
