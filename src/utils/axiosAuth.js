import axios from "axios";
import { logout } from "./authSession";

let interceptorInstalled = false;

/**
 * Attach the login JWT to every axios request (HRIS-style Authorization header).
 * Public APIs still work when there is no token.
 */
export function ensureAxiosAuthInterceptor() {
  if (interceptorInstalled) return;
  interceptorInstalled = true;

  axios.interceptors.request.use((config) => {
    const token = localStorage.getItem("token");
    if (!token || token === "null" || token === "undefined") {
      return config;
    }

    const headers = config.headers || {};
    const existing =
      headers.Authorization ||
      headers.authorization ||
      (typeof headers.get === "function" ? headers.get("Authorization") : null);

    if (!existing) {
      if (typeof headers.set === "function") {
        headers.set("Authorization", `Bearer ${token}`);
      } else {
        headers.Authorization = `Bearer ${token}`;
      }
      config.headers = headers;
    }

    return config;
  });

  axios.interceptors.response.use(
    (response) => response,
    (error) => {
      const status = error.response?.status;
      const serverError = error.response?.data?.error;
      const requestUrl = String(error.config?.url || "");
      const isAuthRequest = /\/api\/(login|login_applicant|login-totp-setup|verify-login-totp)(?:$|[/?])/.test(requestUrl);
      const hasToken = Boolean(localStorage.getItem("token"));
      const isExpiredTokenResponse =
        status === 401 ||
        serverError === "TOKEN_EXPIRED" ||
        (status === 403 && serverError === "Invalid token");

      if (hasToken && !isAuthRequest && isExpiredTokenResponse) {
        logout();
      }

      return Promise.reject(error);
    },
  );
}

ensureAxiosAuthInterceptor();
