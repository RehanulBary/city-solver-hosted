import React from "react";
import { Navigate } from "react-router-dom";

export default function ProtectedRoute({ children, allowedRoles }) {
  try {
    const token = localStorage.getItem("token");
    const user = JSON.parse(localStorage.getItem("user"));

    // Not logged in
    if (!token || !user) {
      return <Navigate to="/signin" replace />;
    }

    // Role not allowed
    if (!user.role || (allowedRoles && !allowedRoles.includes(user.role))) {
      return <Navigate to="/signin" replace />;
    }

    return children;
  } catch {
    // Malformed user or JSON error
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    return <Navigate to="/signin" replace />;
  }
}
