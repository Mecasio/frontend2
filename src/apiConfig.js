// src/apiConfig.js
const PUBLIC_URL = import.meta.env.VITE_API_BASE_URL_PUBLIC;
const LOCAL_URL = import.meta.env.VITE_API_BASE_URL_LOCAL;

let API_BASE_URL;

// Current hostname
if (
  window.location.hostname === "localhost" ||
  window.location.hostname.startsWith("192.168.")
) {
  // LAN / localhost
  API_BASE_URL = LOCAL_URL;
} else {
  // public
  API_BASE_URL = PUBLIC_URL;
}

export default API_BASE_URL;