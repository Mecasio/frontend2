import React, { useContext, useEffect, useState } from "react";
import { Box, Typography } from "@mui/material";
import { SettingsContext } from "../App";
import DefaultLogo from "../assets/EaristLogo.png";

const LoadingOverlay = ({ open, message }) => {
  const settings = useContext(SettingsContext);
  const branding = settings?.branding || {};
  const assets = settings?.assets || {};

  const [fetchedLogo, setFetchedLogo] = useState(DefaultLogo);
  const [companyName, setCompanyName] = useState("Loading...");
  const [bgImage, setBgImage] = useState(null);

  useEffect(() => {
    if (!settings) return;

    setFetchedLogo(
      assets.logoUrl ? `${assets.logoUrl}` : DefaultLogo
    );
    setBgImage(assets.backgroundImage ? `${assets.backgroundImage}` : null);
    setCompanyName(branding.companyName || "Your Institution");
  }, [settings]);

  if (!open) return null;

  return (
    <Box
      sx={{
        position: "fixed",
        inset: 0,
        width: "100vw",
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 3000,
        fontFamily: "Poppins, sans-serif",

        backgroundImage: bgImage ? `url(${bgImage})` : "none",
        backgroundSize: "cover",
        backgroundPosition: "center",

        "::before": {
          content: '""',
          position: "absolute",
          inset: 0,
          backdropFilter: "blur(6px)",
          backgroundColor: "#fff9eccc", // match index.html overlay tint
          zIndex: -1,
        },
      }}
    >

      {/* WRAPPER for circle + logo (same as index.html) */}
      <Box sx={{ position: "relative", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>

        {/* CUSTOM Circle Loader (HTML version, not MUI circular progress) */}
        <Box
          sx={{
            width: "160px",
            height: "160px",
            border: "8px solid rgba(163, 29, 29, 0.3)",
            borderTopColor: "#A31D1D",
            borderRadius: "50%",
            animation: "spin 0.9s linear infinite",
          }}
        />

        {/* Inner Logo exactly like index.html */}
        <Box
          component="img"
          src={fetchedLogo}
          alt={`${companyName} Logo`}
          sx={{
            position: "absolute",
            width: "120px",
            height: "120px",
            borderRadius: "50%",
            boxShadow: "0 0 20px rgba(163, 29, 29, 0.6)",
            animation: "heartbeat 1.5s ease-in-out infinite",
          }}
        />

      </Box>

      {/* Text */}
      <Typography
        sx={{
          mt: 3,
          fontSize: "24px",
          fontWeight: "700",
          color: "#A31D1D",
          animation: "pulse 1.3s infinite",
        }}
      >
        {message || `Loading...`}
      </Typography>

      <style>
        {`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
          @keyframes heartbeat {
            0%, 100% { transform: scale(1); }
            25%, 75% { transform: scale(1.12); }
            50% { transform: scale(1); }
          }
          @keyframes pulse {
            0% { opacity: 1; }
            50% { opacity: 0.5; }
            100% { opacity: 1; }
          }
        `}
      </style>

    </Box>
  );
};

export default LoadingOverlay;
