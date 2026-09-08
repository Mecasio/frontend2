import React, { useState, useEffect, useContext, useRef } from "react";
import axios from "axios";
import {
  Snackbar,
  Alert,
  Box,
  Container,
  TextField,
  InputAdornment,
  Button,
  Paper,
  Typography,
  IconButton,
  Tooltip,
  Modal,
  CircularProgress,
} from "@mui/material";
import { Link, useNavigate } from "react-router-dom";
import "../styles/Container.css";
import Logo from "../assets/Logo.png";
import {
  Email,
  Badge as BadgeIcon,
  Cake as CakeIcon,
  PhoneAndroid as PhoneAndroidIcon,
  CheckCircle as CheckCircleIcon,
  ContentCopy,
} from "@mui/icons-material";
import { SettingsContext } from "../App";
import API_BASE_URL from "../apiConfig";
import { useResponsive } from "../hooks/useResponsive";
import {
  getLoginMacPayload,
} from "../utils/userMacAddress";
import useAuditMac from "../utils/useAuditMac";

/* ═══════════════════════════════════════════════════════════
   APPLICANT FORGOT PASSWORD — TOTP MODAL
   Same "scan -> verify -> done" step machine as the registrar
   version, but talks to the same /api/forgot-password-* routes
   with type = "applicant".
════════════════════════════════════════════════════════════ */
const ApplicantForgotPasswordTotpModal = ({
  open,
  onClose,
  identifier,
  qrDataUrl,
  manualKey,
  mainButtonColor,
  borderColor,
  device, // "mobile" | "tablet" | "desktop"
  navigate,
}) => {
  const isMobile = device === "mobile";
  const isTablet = device === "tablet";

  const [step, setStep] = useState("scan"); // scan | verify | submitting | done
  const [showManualKey, setShowManualKey] = useState(false);
  const [totpCode, setTotpCode] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState("");
  const [tempPassword, setTempPassword] = useState("");
  const [copied, setCopied] = useState(false);
  const inputRefs = useRef([]);

  // Size tokens per device tier
  const modalWidth = isMobile ? "calc(100% - 24px)" : isTablet ? 440 : 480;
  const modalPadding = isMobile ? 2.5 : isTablet ? 3.5 : 4;
  const qrSize = isMobile ? 172 : isTablet ? 192 : 210;
  const digitBoxWidth = isMobile ? 38 : isTablet ? 48 : 54;
  const digitBoxHeight = isMobile ? 48 : isTablet ? 56 : 62;
  const digitGap = isMobile ? 0.75 : 1.5;

  useEffect(() => {
    if (!open) return;
    setStep("scan");
    setShowManualKey(false);
    setTotpCode(["", "", "", "", "", ""]);
    setError("");
    setTempPassword("");
    setCopied(false);
  }, [open]);

  const handleDigitChange = (value, index) => {
    const digit = value.replace(/\D/g, "").slice(-1);
    const next = [...totpCode];
    next[index] = digit;
    setTotpCode(next);
    setError("");
    if (digit && index < 5) inputRefs.current[index + 1]?.focus();
  };

  const handleDigitKeyDown = (e, index) => {
    if (e.key === "Backspace" && !totpCode[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === "Enter") handleConfirm();
  };

  const handleConfirm = async () => {
    const code = totpCode.join("");
    if (code.length !== 6) {
      setError("Please enter the full 6-digit code.");
      return;
    }

    setStep("submitting");
    setError("");

    try {
      const res = await axios.post(`${API_BASE_URL}/api/forgot-password-confirm`, {
        identifier: identifier.trim(),
        type: "applicant",
        token: code,
        ...getLoginMacPayload(),
      });

      if (res.data?.success) {
        setTempPassword(res.data.temp_password || "");
        localStorage.setItem("force_password_change", "true");
        setStep("done");
      } else {
        setError(res.data?.message || "Verification failed.");
        setStep("verify");
        setTotpCode(["", "", "", "", "", ""]);
        setTimeout(() => inputRefs.current[0]?.focus(), 100);
      }
    } catch (err) {
      const locked = err.response?.data?.locked;
      setError(err.response?.data?.message || "Verification failed. Please try again.");
      setStep("verify");
      if (!locked) {
        setTotpCode(["", "", "", "", "", ""]);
        setTimeout(() => inputRefs.current[0]?.focus(), 100);
      }
    }
  };

  const handleCopyPassword = async () => {
    if (!tempPassword) return;
    try {
      await navigator.clipboard.writeText(tempPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard unavailable — user can still select/copy manually
    }
  };

  if (!open) return null;

  const canClose = step !== "submitting";

  return (
    <Modal open={open} onClose={canClose ? onClose : undefined}>
      <Box
        sx={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: modalWidth,
          maxWidth: 480,
          bgcolor: "#fff",
          borderRadius: isMobile ? "16px" : "20px",
          boxShadow: "0 20px 60px rgba(0,0,0,0.18)",
          p: modalPadding,
          border: "1px solid #eee",
          outline: "none",
          maxHeight: "92dvh",
          overflowY: "auto",
          WebkitOverflowScrolling: "touch",
        }}
      >
        {canClose && (
          <button
            onClick={onClose}
            style={{
              position: "absolute",
              top: "12px",
              right: "12px",
              backgroundColor: "black",
              color: "white",
              border: "none",
              borderRadius: "50%",
              width: "36px",
              height: "36px",
              cursor: "pointer",
              fontSize: "16px",
              fontWeight: "bold",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              touchAction: "manipulation",
            }}
            aria-label="Close"
          >
            ✕
          </button>
        )}

        {/* ── STEP: scan QR ── */}
        {step === "scan" && (
          <>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2 }}>
              <Box
                sx={{
                  width: 42,
                  height: 42,
                  borderRadius: "50%",
                  bgcolor: mainButtonColor,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <PhoneAndroidIcon sx={{ color: "#fff", fontSize: 22 }} />
              </Box>
              <Box sx={{ minWidth: 0 }}>
                <Typography fontWeight={700} fontSize={isMobile ? 15 : 17}>
                  Set Up Google Authenticator
                </Typography>
                <Typography fontSize={12} color="#888">
                  Step 1 of 2 — Scan the QR code
                </Typography>
              </Box>
            </Box>

            <Box sx={{ bgcolor: "#f8f9ff", borderRadius: "12px", p: 2, mb: 2.5, border: "1px solid #e8eaff" }}>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1.25 }}>
                <Typography fontSize={13} color="#444" fontWeight={600}>
                  1. Open <strong>Google Authenticator</strong> on your phone.
                </Typography>
                <Typography fontSize={13} color="#444" lineHeight={1.6}>
                  <strong>2.</strong> Tap <strong>"+"</strong> → <strong>"Scan a QR code"</strong>.
                </Typography>
                <Typography fontSize={13} color="#444" lineHeight={1.6}>
                  <strong>3.</strong> Scan the QR code below. If you've used the authenticator
                  before, this creates a fresh entry — your old one keeps working until you finish
                  the next step.
                </Typography>
              </Box>
            </Box>

            <Box sx={{ textAlign: "center", mb: 2.5 }}>
              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt="Google Authenticator QR Code"
                  style={{
                    width: qrSize,
                    height: qrSize,
                    border: "3px solid #000",
                    borderRadius: "12px",
                    display: "inline-block",
                    maxWidth: "100%",
                  }}
                />
              ) : (
                <Box
                  sx={{
                    width: qrSize,
                    height: qrSize,
                    bgcolor: "#f5f5f5",
                    borderRadius: "12px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    mx: "auto",
                  }}
                >
                  <CircularProgress size={32} sx={{ color: mainButtonColor }} />
                </Box>
              )}
            </Box>

            {manualKey && (
              <Box sx={{ mb: 2.5 }}>
                <button
                  onClick={() => setShowManualKey((v) => !v)}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: mainButtonColor,
                    fontSize: "13px",
                    fontWeight: 600,
                    padding: 0,
                    textDecoration: "underline",
                    touchAction: "manipulation",
                  }}
                >
                  {showManualKey ? "Hide manual key" : "Can't scan? Enter key manually"}
                </button>
                {showManualKey && (
                  <Box
                    sx={{
                      mt: 1,
                      p: "10px 14px",
                      bgcolor: "#f5f5f5",
                      borderRadius: "8px",
                      border: "1px solid #ddd",
                      fontFamily: "monospace",
                      fontSize: isMobile ? "12px" : "13.5px",
                      letterSpacing: "0.08em",
                      color: "#222",
                      wordBreak: "break-all",
                      userSelect: "all",
                    }}
                  >
                    {manualKey}
                  </Box>
                )}
              </Box>
            )}

            <Box
              sx={{
                display: "flex",
                gap: 1,
                alignItems: "flex-start",
                bgcolor: "#fffbf2",
                border: "1px solid #f5a623",
                borderRadius: "8px",
                p: 1.5,
                mb: 2.5,
              }}
            >
              <span style={{ fontSize: 16, flexShrink: 0 }}>⏱️</span>
              <Typography fontSize={12} color="#5d4037" lineHeight={1.5}>
                This QR code expires in <strong>10 minutes</strong>. If it expires, close this
                dialog and start over.
              </Typography>
            </Box>

            <Button
              fullWidth
              variant="contained"
              onClick={() => {
                setStep("verify");
                setError("");
                setTotpCode(["", "", "", "", "", ""]);
                setTimeout(() => inputRefs.current[0]?.focus(), 150);
              }}
              disabled={!qrDataUrl}
              sx={{
                backgroundColor: mainButtonColor,
                color: "#fff",
                fontWeight: 700,
                fontSize: "15px",
                borderRadius: "12px",
                py: 1.5,
                textTransform: "none",
                minHeight: 48,
                "&:hover": { backgroundColor: mainButtonColor, opacity: 0.92 },
              }}
            >
              I've scanned it — Enter the code →
            </Button>
          </>
        )}

        {/* ── STEP: verify code ── */}
        {(step === "verify" || step === "submitting") && (
          <>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2 }}>
              <Box
                sx={{
                  width: 42,
                  height: 42,
                  borderRadius: "50%",
                  bgcolor: mainButtonColor,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <CheckCircleIcon sx={{ color: "#fff", fontSize: 22 }} />
              </Box>
              <Box sx={{ minWidth: 0 }}>
                <Typography fontWeight={700} fontSize={isMobile ? 15 : 17}>
                  Enter Authenticator Code
                </Typography>
                <Typography fontSize={12} color="#888">
                  Step 2 of 2 — Confirm & reset your password
                </Typography>
              </Box>
            </Box>

            <Box sx={{ bgcolor: "#f8f9ff", borderRadius: "12px", p: 2, mb: 2.5, border: "1px solid #e8eaff" }}>
              <Typography fontSize={13} color="#444" lineHeight={1.7}>
                Open <strong>Google Authenticator</strong> and enter the <strong>6-digit code</strong>{" "}
                for the entry you just scanned.
              </Typography>
              <Typography fontSize={12} color="#888" sx={{ mt: 0.5 }}>
                The code refreshes every 30 seconds — use the current one.
              </Typography>
            </Box>

            <Box
              sx={{
                display: "flex",
                justifyContent: "center",
                gap: digitGap,
                mb: 2.5,
                flexWrap: "nowrap",
              }}
            >
              {totpCode.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => (inputRefs.current[index] = el)}
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleDigitChange(e.target.value, index)}
                  onKeyDown={(e) => handleDigitKeyDown(e, index)}
                  disabled={step === "submitting"}
                  style={{
                    width: `${digitBoxWidth}px`,
                    height: `${digitBoxHeight}px`,
                    fontSize: isMobile ? "20px" : "24px",
                    fontWeight: 700,
                    textAlign: "center",
                    borderRadius: "12px",
                    border: error ? "2px solid #f44336" : "2px solid #ddd",
                    outline: "none",
                    background: step === "submitting" ? "#f5f5f5" : "#fff",
                    transition: "border 0.2s",
                  }}
                />
              ))}
            </Box>

            {error && (
              <Box sx={{ bgcolor: "#fff5f5", border: "1px solid #f44336", borderRadius: "8px", p: 1.5, mb: 2 }}>
                <Typography fontSize={13} color="#c62828">
                  {error}
                </Typography>
              </Box>
            )}

            <Button
              fullWidth
              variant="contained"
              onClick={handleConfirm}
              disabled={step === "submitting" || totpCode.join("").length !== 6}
              sx={{
                backgroundColor: mainButtonColor,
                color: "#fff",
                fontWeight: 700,
                fontSize: "15px",
                borderRadius: "12px",
                py: 1.5,
                textTransform: "none",
                minHeight: 48,
                mb: 1.5,
                "&:hover": { backgroundColor: mainButtonColor, opacity: 0.92 },
              }}
            >
              {step === "submitting" ? (
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                  <CircularProgress size={18} sx={{ color: "#fff" }} />
                  Verifying…
                </Box>
              ) : (
                "Confirm & Reset Password"
              )}
            </Button>

            <Button
              fullWidth
              variant="outlined"
              onClick={() => {
                setStep("scan");
                setError("");
              }}
              disabled={step === "submitting"}
              sx={{
                fontWeight: 600,
                fontSize: "13px",
                borderRadius: "12px",
                py: 1.25,
                textTransform: "none",
                color: "#555",
                borderColor: "#ddd",
                minHeight: 44,
                "&:hover": { borderColor: "#bbb", bgcolor: "#fafafa" },
              }}
            >
              ← Back to QR code
            </Button>
          </>
        )}

        {/* ── STEP: done ── */}
        {step === "done" && (
          <Box sx={{ textAlign: "center" }}>
            <Box
              sx={{
                width: 42,
                height: 42,
                borderRadius: "50%",
                bgcolor: "#2e7d32",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                mx: "auto",
                mb: 2,
              }}
            >
              <CheckCircleIcon sx={{ color: "#fff", fontSize: 22 }} />
            </Box>

            <Typography fontWeight={700} fontSize={isMobile ? 15 : 17} sx={{ mb: 1 }}>
              Account Recovered
            </Typography>
            <Typography fontSize={13} color="#666" sx={{ mb: 2 }}>
              Google Authenticator is linked and your password has been reset.
            </Typography>

            <Typography sx={{ fontWeight: 600, mb: 1 }}>Your temporary password:</Typography>
            <Paper
              variant="outlined"
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexWrap: "wrap",
                gap: 1,
                p: 1.5,
                mb: 2,
                border: `2px solid ${borderColor}`,
                borderRadius: "8px",
              }}
            >
              <Typography
                sx={{
                  fontFamily: "monospace",
                  fontSize: isMobile ? "0.95rem" : "1.1rem",
                  letterSpacing: 1,
                  wordBreak: "break-all",
                }}
              >
                {tempPassword}
              </Typography>
              <Tooltip title={copied ? "Copied!" : "Copy"}>
                <IconButton size="small" onClick={handleCopyPassword}>
                  <ContentCopy fontSize="small" />
                </IconButton>
              </Tooltip>
            </Paper>

            <Typography sx={{ fontSize: "13px", color: "rgba(0,0,0,0.6)", mb: 2 }}>
              Save this now — log in with it and you'll be asked to set a new password right away.
            </Typography>

            <Button
              onClick={() => navigate("/login_applicant")}
              variant="contained"
              sx={{
                width: "100%",
                py: 1.5,
                backgroundColor: mainButtonColor,
                border: `2px solid ${borderColor}`,
                color: "white",
                height: isMobile ? "48px" : "50px",
                borderRadius: "10px",
                fontSize: isMobile ? "14px" : "15px",
                textTransform: "none",
                fontWeight: 600,
              }}
            >
              Go to Login
            </Button>
          </Box>
        )}
      </Box>
    </Modal>
  );
};

const ApplicantForgotPassword = () => {
  useAuditMac();
  const settings = useContext(SettingsContext);
  const colors = settings?.colors || {};
  const branding = settings?.branding || {};
  const assets = settings?.assets || {};
  const headerColor = colors.header || "#1976d2";
  const { device, isMobile, isTablet, isDesktop } = useResponsive();
  const navigate = useNavigate();

  const [borderColor, setBorderColor] = useState("#000000");
  const [mainButtonColor, setMainButtonColor] = useState("#1976d2");

  useEffect(() => {
    if (settings) {
      if (colors.border) setBorderColor(colors.border);
      if (colors.mainButton) setMainButtonColor(colors.mainButton);
    }
  }, [settings]);

  const [currentYear, setCurrentYear] = useState("");

  // form fields
  const [applicantNumber, setApplicantNumber] = useState("");
  const [email, setEmail] = useState("");
  const [birthdate, setBirthdate] = useState("");
  const [identifyLoading, setIdentifyLoading] = useState(false);

  // returned from /forgot-password-init, needed by the modal
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [manualKey, setManualKey] = useState("");
  const [showTotpModal, setShowTotpModal] = useState(false);

  const [snack, setSnack] = useState({ open: false, message: "", severity: "info" });

  useEffect(() => {
    const now = new Date().toLocaleString("en-US", { timeZone: "Asia/Manila" });
    setCurrentYear(new Date(now).getFullYear());
  }, []);

  const handleClose = (_, reason) => {
    if (reason === "clickaway") return;
    setSnack((prev) => ({ ...prev, open: false }));
  };

  // ── Layout tokens per device tier ──
  const cardWidth = isMobile ? "calc(100% - 32px)" : isTablet ? "min(520px, 92vw)" : undefined;
  const cardMaxWidth = isMobile ? 480 : isTablet ? 540 : undefined;
  const cardBorderWidth = isMobile ? "3px" : isTablet ? "4px" : "5px";
  const bodyPadding = isMobile ? "16px" : isTablet ? "20px" : "24px";
  const fieldHeight = isMobile ? "52px" : "54px";

  const fieldSx = {
    "& .MuiOutlinedInput-root": {
      height: fieldHeight,
      borderRadius: "10px",
      "& input": {
        height: fieldHeight,
        padding: "0 10px",
        boxSizing: "border-box",
        fontSize: "16px",
      },
    },
  };

  const logoSrc = assets.logoUrl ? `${assets.logoUrl}` : Logo;
  const backgroundImage = assets.backgroundImage
    ? `url(${assets.backgroundImage})`
    : "linear-gradient(to right, #f5f5f5, #fafafa)";

  const handleIdentify = async () => {
    if (identifyLoading) return;

    if (!applicantNumber.trim() || !email.trim() || !birthdate) {
      setSnack({ open: true, message: "Please fill in all fields.", severity: "warning" });
      return;
    }

    setIdentifyLoading(true);

    try {
      const res = await axios.post(`${API_BASE_URL}/api/forgot-password-init`, {
        identifier: applicantNumber.trim(),
        email: email.trim(),
        birthdate,
        ...getLoginMacPayload(),
      });

      if (res.data?.success) {
        setQrDataUrl(res.data.qrDataUrl);
        setManualKey(res.data.manualKey || "");
        setShowTotpModal(true);
      } else {
        setSnack({ open: true, message: res.data?.message || "Account not found.", severity: "error" });
      }
    } catch (err) {
      setSnack({
        open: true,
        message: err.response?.data?.message || "Something went wrong.",
        severity: "error",
      });
    } finally {
      setIdentifyLoading(false);
    }
  };

  document.addEventListener("contextmenu", (e) => e.preventDefault());

  // 🔒 Block DevTools shortcuts + Ctrl+P silently
  document.addEventListener("keydown", (e) => {
    const isBlockedKey =
      e.key === "F12" ||
      e.key === "F11" ||
      (e.ctrlKey &&
        e.shiftKey &&
        (e.key.toLowerCase() === "i" || e.key.toLowerCase() === "j")) ||
      (e.ctrlKey && e.key.toLowerCase() === "u") ||
      (e.ctrlKey && e.key.toLowerCase() === "p");

    if (isBlockedKey) {
      e.preventDefault();
      e.stopPropagation();
    }
  });

  const isButtonDisabled =
    identifyLoading || !applicantNumber.trim() || !email.trim() || !birthdate;

  return (
    <Box
      sx={{
        backgroundImage,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        width: "100%",
        minHeight: "100dvh",
        display: "flex",
        alignItems: isDesktop ? "center" : "flex-start",
        justifyContent: "center",
        marginTop: isDesktop ? "-50px" : 0,
        overflowY: isDesktop ? "hidden" : "auto",
        py: isDesktop ? 0 : isTablet ? 4 : 2,
        px: isMobile ? 0 : 2,
        pb: isMobile ? "calc(16px + env(safe-area-inset-bottom))" : undefined,
      }}
    >
      <Container
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: isMobile ? "0" : undefined,
          width: "100%",
        }}
        maxWidth={false}
      >
        <div
          className="Container"
          style={{
            border: `${cardBorderWidth} solid black`,
            width: cardWidth,
            maxWidth: cardMaxWidth,
          }}
        >
          <div
            className="Header"
            style={{
              backgroundColor: headerColor || "#1976d2",
              padding: isMobile ? "12px 10px" : isTablet ? "14px 12px" : "1rem 0",
              borderBottom: "3px solid black",
            }}
          >
            <div className="HeaderTitle">
              <div className="CircleCon">
                <img src={logoSrc} alt="Logo" />
              </div>
            </div>
            <div className="HeaderBody">
              <strong style={{ color: "white" }}>
                {(branding.companyName || "Company Name").split(" ").reduce((acc, word, index) => {
                  if (index % 4 === 0 && index !== 0) acc.push(<br key={`br-${index}`} />);
                  acc.push(word + " ");
                  return acc;
                }, [])}
              </strong>
              <p>Academic Information System</p>
            </div>
          </div>

          <div className="Body" style={{ padding: bodyPadding }}>
            <Typography fontWeight={700} fontSize={isMobile ? 15 : 17} sx={{ mb: 2 }}>
              Forgot Password
            </Typography>
            <Typography fontSize={13} color="#666" sx={{ mb: 2.5 }}>
              Enter your applicant number, email, and birthday. If they match, we'll walk you
              through linking Google Authenticator to recover your account.
            </Typography>

            <label style={{ fontWeight: 500, color: "rgba(0,0,0,0.6)", marginBottom: "5px", display: "block" }}>
              Applicant Number:
            </label>
            <TextField
              fullWidth
              placeholder="Enter Applicant Number"
              value={applicantNumber}
              onChange={(e) => setApplicantNumber(e.target.value)}
              sx={{ borderRadius: "5px", border: `2px solid ${borderColor}`, marginBottom: "15px", ...fieldSx }}
              InputProps={{ startAdornment: <InputAdornment position="start"><BadgeIcon /></InputAdornment> }}
            />

            <label style={{ fontWeight: 500, color: "rgba(0,0,0,0.6)", marginBottom: "5px", display: "block" }}>
              Email Address:
            </label>
            <TextField
              fullWidth
              type="email"
              placeholder="Enter your Email Address (e.g., username@gmail.com)"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              sx={{ borderRadius: "5px", border: `2px solid ${borderColor}`, marginBottom: "15px", ...fieldSx }}
              InputProps={{ startAdornment: <InputAdornment position="start"><Email /></InputAdornment> }}
            />

            <label style={{ fontWeight: 500, color: "rgba(0,0,0,0.6)", marginBottom: "5px", display: "block" }}>
              Birthday:
            </label>
            <TextField
              fullWidth
              type="date"
              value={birthdate}
              onChange={(e) => setBirthdate(e.target.value)}
              sx={{ borderRadius: "5px", border: `2px solid ${borderColor}`, marginBottom: "15px", ...fieldSx }}
              InputLabelProps={{ shrink: true }}
              InputProps={{ startAdornment: <InputAdornment position="start"><CakeIcon /></InputAdornment> }}
            />

            <Box sx={{ mt: 3, display: "flex", justifyContent: "center" }}>
              <Button
                onClick={handleIdentify}
                variant="contained"
                disabled={isButtonDisabled}
                sx={{
                  width: "100%",
                  py: 1.5,
                  backgroundColor: mainButtonColor,
                  border: `2px solid ${borderColor}`,
                  color: "white",
                  height: isMobile ? "48px" : "50px",
                  borderRadius: "10px",
                  fontSize: isMobile ? "14px" : "15px",
                  textTransform: "none",
                  fontWeight: 600,
                  touchAction: "manipulation",
                }}
              >
                {identifyLoading ? "Checking..." : "Continue"}
              </Button>
            </Box>

            <div className="LinkContainer" style={{ marginTop: "1rem" }}>
              <p>To go to login page,</p>
              <span>
                <Link to="/login_applicant" style={{ textDecoration: "underline" }}>
                  Click here
                </Link>
              </span>
            </div>
          </div>

          <div className="Footer">
            <div className="FooterText">
              &copy; {currentYear} {branding.companyName || "EARIST"} <br />
              Academic Information System. <br />
              All rights reserved.
            </div>
          </div>
        </div>
      </Container>

      <ApplicantForgotPasswordTotpModal
        open={showTotpModal}
        onClose={() => setShowTotpModal(false)}
        identifier={applicantNumber}
        qrDataUrl={qrDataUrl}
        manualKey={manualKey}
        mainButtonColor={mainButtonColor}
        borderColor={borderColor}
        device={device}
        navigate={navigate}
      />

      <Snackbar
        open={snack.open}
        autoHideDuration={5000}
        onClose={handleClose}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert severity={snack.severity} onClose={handleClose} sx={{ width: "100%" }}>
          {snack.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ApplicantForgotPassword;
