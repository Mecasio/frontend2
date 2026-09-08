// main.jsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import "./index.css";
import App from "./App.jsx";

// ⭐ Render React (ONLY ONCE)
createRoot(document.getElementById("root")).render(
  <StrictMode>
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <App />
    </LocalizationProvider>
  </StrictMode>
);

// // ⭐ Hide startup loader immediately after React loads
// const loader = document.getElementById("startup-loader");
// if (loader) {
//   loader.style.opacity = "0";
//   loader.style.transition = "opacity 0.5s ease";
//   setTimeout(() => loader.remove(), 500);
// }
