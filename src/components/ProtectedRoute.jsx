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

const ADMIN_ROLES = ["administrator", "superadmin", "technical"];

const APPLICANT_SELF_SERVICE_PATHS = [
  "/personal_data_form",
  "/ecat_application_form",
  "/office_of_the_registrar",
];

const isStaffApplicantPath = (path) =>
  path.startsWith("/applicant_admin_") ||
  path.startsWith("/applicant_college_") ||
  path.startsWith("/applicant_registrar_") ||
  path.startsWith("/applicant_list_") ||
  path === "/applicant_entrance_exam_score" ||
  path === "/applicant_exam_subjects" ||
  path === "/applicant_online_requirements_admin" ||
  path === "/applicant_online_requirements_college" ||
  path === "/applicant_online_requirements_registrar";

const isApplicantFacingPath = (path) => {
  if (APPLICANT_SELF_SERVICE_PATHS.includes(path)) return true;
  if (!path.startsWith("/applicant_")) return false;
  return !isStaffApplicantPath(path);
};

const isStaffStudentPath = (path) =>
  path.startsWith("/student_admin_") ||
  path.startsWith("/student_college_") ||
  path.startsWith("/student_registrar_") ||
  path === "/student_accounts" ||
  path === "/student_numbering" ||
  path === "/student_number_admin" ||
  path === "/student_enrollment" ||
  path === "/student_grade_file" ||
  path === "/student_scholarship_list" ||
  path === "/student_balance_list" ||
  path === "/student_online_requirements_admin" ||
  path === "/student_online_requirements_college" ||
  path === "/student_online_requirements_registrar";

const isStudentFacingPath = (path) => {
  if (!path.startsWith("/student_")) return false;
  return !isStaffStudentPath(path);
};

const getRouteRoles = (pathname) => {
  const path = String(pathname || "").toLowerCase();

  if (isStudentFacingPath(path)) {
    return ["student", "administrator"];
  }
  if (/^\/faculty(_|\/)/.test(path)) {
    return ["faculty", "administrator"];
  }
  if (isApplicantFacingPath(path)) {
    return ["applicant", "administrator"];
  }
  return ADMIN_ROLES;
};

const resolveAuthorization = (allowedRoles = [], pathname = "", strictRoles = false) => {
  const token = localStorage.getItem("token");
  const storedRole = normalizeRole(localStorage.getItem("role"));
  const storedEmail = localStorage.getItem("email");
  let normalizedAllowedRoles = Array.isArray(allowedRoles)
    ? allowedRoles.map(normalizeRole)
    : allowedRoles
      ? [normalizeRole(allowedRoles)]
      : [];

  if (normalizedAllowedRoles.length === 0) {
    normalizedAllowedRoles = getRouteRoles(pathname);
  } else if (!strictRoles) {
    if (normalizedAllowedRoles.includes("student")) {
      normalizedAllowedRoles.push("administrator");
    }
    if (normalizedAllowedRoles.includes("applicant") || normalizedAllowedRoles.includes("faculty")) {
      normalizedAllowedRoles.push("administrator");
    }
    normalizedAllowedRoles = [...new Set(normalizedAllowedRoles)];
  }

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

const ProtectedRoute = ({ children, allowedRoles = [], strictRoles = false }) => {
  const location = useLocation();
  const isAuthorized = resolveAuthorization(
    allowedRoles,
    location.pathname,
    strictRoles,
  );

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
