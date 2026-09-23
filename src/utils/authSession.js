const AUTH_STORAGE_KEYS = [
  "token",
  "email",
  "role",
  "person_id",
  "prof_id",
  "employee_id",
  "department",
  "lastVisitedPath",
  "accessList",
  "force_password_change",
];

let logoutHandler = null;
let redirectInProgress = false;

export const clearAuthStorage = () => {
  AUTH_STORAGE_KEYS.forEach((key) => localStorage.removeItem(key));
  sessionStorage.removeItem("token");
};

export const getTokenExpiryMs = (token = localStorage.getItem("token")) => {
  if (!token) return null;

  try {
    const payloadBase64 = token.split(".")[1];
    if (!payloadBase64) return null;
    const payload = JSON.parse(atob(payloadBase64));
    return payload?.exp ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
};

export const registerLogoutHandler = (handler) => {
  logoutHandler = handler;
  return () => {
    if (logoutHandler === handler) logoutHandler = null;
  };
};

export const logout = () => {
  if (redirectInProgress) return;
  redirectInProgress = true;
  clearAuthStorage();
  logoutHandler?.();
  window.location.replace("/");
};
