import React, { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  Button,
} from "@mui/material";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import LoginIcon from "@mui/icons-material/Login";

/**
 * Drop this once inside your authenticated layout, e.g. right after your
 * <Routes> block in App.jsx:
 *
 * <InactivityLogoutModal
 *   isAuthenticatedPage={isAuthenticated}
 *   accentColor={settings?.colors?.header}   // optional, falls back to #1976d2
 *   onLogout={() => {
 *     clearAuthStorage();
 *     setIsAuthenticated(false);
 *     window.location.href = "/";
 *   }}
 * />
 *
 * Behavior:
 *  - `idleWarningTime` of silence  -> "Session Expiring Soon" dialog opens with a countdown
 *  - Countdown hits 0 (`autoLogoutTime` total idle) -> token cleared, "Session Expired" dialog shown
 *  - "Stay Logged In" resets the idle clock; "Logout Now" logs out immediately
 *  - "Back to Sign In" on the expired dialog calls onLogout
 */
export default function InactivityLogoutModal({
  isAuthenticatedPage,
  onLogout,
  accentColor = "#1976d2",
  mainButtonColor,
  idleWarningTime = 20 * 60 * 1000, // time of silence before the warning dialog appears
  autoLogoutTime = 30 * 60 * 1000,  // total idle time before hard logout
}) {
  const primaryColor = mainButtonColor || accentColor;
  const [idleWarningOpen, setIdleWarningOpen] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);

  const idleTimeoutRef = useRef(null);
  const logoutTimeoutRef = useRef(null);

  const COUNTDOWN_SECONDS = (autoLogoutTime - idleWarningTime) / 1000;

  const clearTimers = () => {
    if (idleTimeoutRef.current) clearTimeout(idleTimeoutRef.current);
    if (logoutTimeoutRef.current) clearTimeout(logoutTimeoutRef.current);
    idleTimeoutRef.current = null;
    logoutTimeoutRef.current = null;
  };

  const handleAutoLogout = () => {
    setIdleWarningOpen(false);
    localStorage.removeItem("token");
    sessionStorage.removeItem("token");
    clearTimers();
    setSessionExpired(true);
  };

  const resetIdleTimer = () => {
    if (!isAuthenticatedPage) return;
    clearTimers();
    idleTimeoutRef.current = setTimeout(() => {
      setIdleWarningOpen(true);
      logoutTimeoutRef.current = setTimeout(() => {
        handleAutoLogout();
      }, autoLogoutTime - idleWarningTime);
    }, idleWarningTime);
  };

  const handleLogoutNow = () => {
    localStorage.removeItem("token");
    sessionStorage.removeItem("token");
    setIdleWarningOpen(false);
    setSessionExpired(false);
    clearTimers();
    onLogout?.();
  };

  const handleSessionExpiredClose = () => {
    setSessionExpired(false);
    onLogout?.();
  };

  // Countdown ticker while the warning dialog is open
  useEffect(() => {
    let interval;
    if (idleWarningOpen) {
      setTimeLeft(COUNTDOWN_SECONDS);
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      setTimeLeft(0);
    }
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idleWarningOpen]);

  // Activity listeners + idle timer lifecycle
  useEffect(() => {
    if (!isAuthenticatedPage) {
      setIdleWarningOpen(false);
      clearTimers();
      return undefined;
    }
    const events = ["mousemove", "mousedown", "keydown", "scroll", "touchstart"];
    events.forEach((event) => window.addEventListener(event, resetIdleTimer));
    resetIdleTimer();
    return () => {
      events.forEach((event) => window.removeEventListener(event, resetIdleTimer));
      clearTimers();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticatedPage]);

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  return (
    <>
      {/* ── IDLE WARNING DIALOG ─────────────────────────────────────────── */}
      <Dialog
        open={idleWarningOpen && isAuthenticatedPage}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: "16px", overflow: "hidden", boxShadow: "0 24px 60px rgba(0,0,0,0.25)" } }}
      >
        <DialogTitle
          sx={{
            bgcolor: accentColor,
            color: "white",
            display: "flex",
            alignItems: "center",
            fontWeight: "bold",
            px: 3,
            py: 2,
          }}
        >
          <Box display="flex" alignItems="center" gap={1.5}>
            <Box
              sx={{
                backgroundColor: "rgba(255,255,255,0.2)",
                borderRadius: "50%",
                width: 40,
                height: 40,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <AccessTimeIcon sx={{ color: "white", fontSize: 22 }} />
            </Box>
            <Box>
              <Typography fontWeight="bold" fontSize={16} color="white" lineHeight={1.2}>
                Session Expiring Soon
              </Typography>
              <Typography fontSize={12} color="rgba(255,255,255,0.8)" lineHeight={1.2}>
                You've been inactive for a while
              </Typography>
            </Box>
          </Box>
        </DialogTitle>

        <DialogContent sx={{ px: { xs: 2, sm: 3 }, pt: 3, pb: 1, mt: 3 }}>
          <Box sx={{ textAlign: "center", mb: 2.5 }}>
            <Typography sx={{ fontSize: "13.5px", color: "#333", lineHeight: 1.65, mb: 2 }}>
              For your security, you'll be automatically logged out due to inactivity.
              Click below to stay signed in.
            </Typography>

            <Typography sx={{ fontSize: 52, fontWeight: 800, color: accentColor, letterSpacing: "0.03em" }}>
              {formatTime(timeLeft)}
            </Typography>
            <Typography sx={{ fontSize: 11.5, color: "#888", mt: 0.5 }}>
              remaining before automatic logout
            </Typography>

            <Box
              sx={{
                mt: 2,
                height: 6,
                borderRadius: "4px",
                backgroundColor: "#eee",
                overflow: "hidden",
              }}
            >
              <Box
                sx={{
                  height: "100%",
                  borderRadius: "4px",
                  backgroundColor: accentColor,
                  width: `${(timeLeft / COUNTDOWN_SECONDS) * 100}%`,
                  transition: "width 1s linear",
                }}
              />
            </Box>
          </Box>
        </DialogContent>

        <DialogActions sx={{ px: { xs: 2, sm: 3 }, pb: 2.5, pt: 1.5, gap: 1 }}>
          <Button
            fullWidth
            variant="outlined"
            color="error"
            onClick={handleLogoutNow}
            sx={{
              height: 44,
              borderRadius: "10px",
              textTransform: "none",
              fontWeight: 700,
              fontSize: 14,

            }}
          >
            Logout Now
          </Button>
          <Button
            fullWidth
            variant="contained"
            onClick={() => {
              setIdleWarningOpen(false);
              resetIdleTimer();
            }}
            sx={{
              height: 44,
              borderRadius: "10px",
              backgroundColor: primaryColor,
              color: "#fff",
              fontWeight: 700,
              fontSize: 14,
              textTransform: "none",
              boxShadow: "none",

            }}
          >
            Stay Logged In
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── SESSION EXPIRED DIALOG ──────────────────────────────────────── */}
      <Dialog
        open={sessionExpired}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: "16px", overflow: "hidden", boxShadow: "0 24px 60px rgba(0,0,0,0.25)" } }}
      >
        <DialogTitle
          sx={{
            bgcolor: accentColor,
            color: "white",
            display: "flex",
            alignItems: "center",
            fontWeight: "bold",
            px: 3,
            py: 2,
          }}
        >
          <Box display="flex" alignItems="center" gap={1.5}>
            <Box
              sx={{
                backgroundColor: "rgba(255,255,255,0.2)",
                borderRadius: "50%",
                width: 40,
                height: 40,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <LockOutlinedIcon sx={{ color: "white", fontSize: 22 }} />
            </Box>
            <Box>
              <Typography fontWeight="bold" fontSize={16} color="white" lineHeight={1.2}>
                Session Expired
              </Typography>
              <Typography fontSize={12} color="rgba(255,255,255,0.8)" lineHeight={1.2}>
                Please sign in again to continue
              </Typography>
            </Box>
          </Box>
        </DialogTitle>

        <DialogContent sx={{ px: { xs: 2, sm: 3 }, pt: 3, pb: 1 }}>
          <Box sx={{ display: "flex", justifyContent: "center", mb: 2.5, mt: 1 }}>
            <Box
              sx={{
                width: 76,
                height: 76,
                borderRadius: "50%",
                backgroundColor: "rgba(255,255,255,0.9)",
                border: `3px solid ${accentColor}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <LockOutlinedIcon sx={{ color: accentColor, fontSize: 34 }} />
            </Box>
          </Box>
          <Box sx={{ textAlign: "center", mb: 2 }}>
            <Typography sx={{ fontSize: 17, fontWeight: 700, color: "#1a1a1a", mb: 1 }}>
              You've been signed out
            </Typography>
            <Typography sx={{ fontSize: "13.5px", color: "#333", lineHeight: 1.65 }}>
              You were inactive for an extended period. For security purposes, your session has
              expired. Please sign in again to continue.
            </Typography>
          </Box>
        </DialogContent>

        <DialogActions sx={{ px: { xs: 2, sm: 3 }, pb: 2.5, pt: 1.5 }}>
          <Button
            fullWidth
            variant="contained"
            endIcon={<LoginIcon />}
            onClick={handleSessionExpiredClose}
            sx={{
              height: 44,
              borderRadius: "10px",
              backgroundColor: primaryColor,
              color: "#fff",
              fontWeight: 700,
              fontSize: 14,
              textTransform: "none",
              boxShadow: "none",

            }}
          >
            Back to Sign In
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
