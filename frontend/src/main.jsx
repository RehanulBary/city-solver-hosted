import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./index.css";

import App from "./App.jsx";
import MapPage from "./Map.jsx";
import AuthorityDashboard from "./AuthorityDashboard.jsx";
import UserDashboard from "./UserDashboard.jsx";
import Signin from "./SignIn.jsx";
import SignUp from "./SignUp.jsx";
import ProtectedRoute from "./ProtectedRoute.jsx";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<App />} />
        <Route path="/signin" element={<Signin />} />
        <Route path="/signup" element={<SignUp />} />

        {/* Protected routes */}
        <Route
          path="/authority_dashboard"
          element={
            <ProtectedRoute allowedRoles={["authority"]}>
              <AuthorityDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/user_dashboard"
          element={
            <ProtectedRoute allowedRoles={["user"]}>
              <UserDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/objection"
          element={
            <ProtectedRoute allowedRoles={["user", "authority"]}>
              <MapPage />
            </ProtectedRoute>
          }
        />

        {/* Catch-all: redirect any unknown route to signin */}
        <Route path="*" element={<Signin />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
