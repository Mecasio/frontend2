import axios from "axios";

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
}

ensureAxiosAuthInterceptor();
