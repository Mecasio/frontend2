import React, { useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";

const clearAuthStorage = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("email");
  localStorage.removeItem("role");
  localStorage.removeItem("person_id");
  localStorage.removeItem("employee_id");
  localStorage.removeItem("department");
  localStorage.removeItem("lastVisitedPath");
};

export const isTokenValid = (token) => {
  if (!token) return false;

  try {
    const payloadBase64 = token.split(".")[1];
    if (!payloadBase64) return false;

    const payload = JSON.parse(atob(payloadBase64));
    if (!payload?.exp) return false;

    return payload.exp * 1000 > Date.now();
  } catch (error) {
    return false;
  }
};

const normalizeRole = (role) => String(role || "").trim().toLowerCase();

const resolveAuthorization = (allowedRoles = []) => {
  const token = localStorage.getItem("token");
  const storedRole = normalizeRole(localStorage.getItem("role"));
  const storedEmail = localStorage.getItem("email");
  const normalizedAllowedRoles = Array.isArray(allowedRoles)
    ? allowedRoles.map(normalizeRole)
    : allowedRoles
      ? [normalizeRole(allowedRoles)]
      : [];

  if (!storedEmail || !isTokenValid(token)) {
    clearAuthStorage();
    return false;
  }

  if (
    normalizedAllowedRoles.length === 0 ||
    normalizedAllowedRoles.includes(storedRole)
  ) {
    return true;
  }

  return "unauthorized";
};

const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const location = useLocation();
  const isAuthorized = resolveAuthorization(allowedRoles);

  useEffect(() => {
    if (isAuthorized !== true) return;

    const currentPath = `${location.pathname}${location.search}${location.hash}`;
    if (
      !currentPath ||
      currentPath === "/" ||
      currentPath === "/login" ||
      currentPath === "/login_applicant"
    ) {
      return;
    }

    localStorage.setItem("lastVisitedPath", currentPath);
  }, [isAuthorized, location.pathname, location.search, location.hash]);

  if (isAuthorized === true) return children;
  if (isAuthorized === "unauthorized") return <Navigate to="/unauthorized" />;

  return <Navigate to="/" />;
};

export default ProtectedRoute;
