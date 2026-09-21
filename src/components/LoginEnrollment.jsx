import React, { useState, useRef, useEffect, useContext } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";
import { Modal } from "@mui/material";
import {
  Box,
  Snackbar,
  Alert,
  Typography,
  Button,
  CircularProgress,
  IconButton,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import {
  Email as EmailIcon,
  Lock as LockIcon,
  Visibility,
  VisibilityOff,
  Person as PersonIcon,
  ArrowDropDown as ArrowDropDownIcon,
  PhoneAndroid as PhoneAndroidIcon,
  CheckCircle as CheckCircleIcon,
} from "@mui/icons-material";
import ZoomInIcon from "@mui/icons-material/ZoomIn";
import ZoomOutIcon from "@mui/icons-material/ZoomOut";
import "../styles/Container.css";
import {
  UNIFORM_BORDER,
  UNIFORM_RADIUS,
  fieldBorder,
} from "../styles/formTokens";
import Logo from "../assets/Logo.png";
import { SettingsContext } from "../App";
import LoadingOverlay from "./LoadingOverlay";
import API_BASE_URL from "../apiConfig";
import MuiLink from "@mui/material/Link";
import { useResponsive } from "../hooks/useResponsive";
import {
  fetchAndStoreUserMacAddress,
  getLoginMacPayload,
} from "../utils/userMacAddress";

function accessToSet(list = []) {
  return new Set(list.map(Number));
}
function getRegistrarDashboard(accessSet) {
  if (accessSet.has(101)) return "/registrar_dashboard";
  if (accessSet.has(102)) return "/enrollment_officer_dashboard";
  if (accessSet.has(103)) return "/admission_officer_dashboard";
  return "/registrar_dashboard";
}
function getUserDashboard(role, accessList = []) {
  const accessSet = accessToSet(accessList);
  const normalizedRole = String(role || "").trim().toLowerCase();
  // Superadmin / technical always open on Registrar Dashboard.
  if (["superadmin", "technical"].includes(normalizedRole)) {
    return "/registrar_dashboard";
  }
  // Administrator: registrar by default; admission/enrollment officers by page access.
  if (normalizedRole === "administrator") {
    return getRegistrarDashboard(accessSet);
  }
  if (normalizedRole === "faculty") return "/faculty_dashboard";
  return "/student_dashboard";
}

/* ─── Per-email localStorage lockout helpers ─── */
function lockoutKey(email) {
  return `enrollment_lockout_until::${String(email).trim().toLowerCase()}`;
}
function getLockoutRemaining(email) {
  if (!email) return 0;
  const until = localStorage.getItem(lockoutKey(email));
  if (!until) return 0;
  const remaining = Math.ceil((Number(until) - Date.now()) / 1000);
  return remaining > 0 ? remaining : 0;
}
function saveLockout(email, seconds) {
  if (!email) return;
  localStorage.setItem(lockoutKey(email), String(Date.now() + seconds * 1000));
}
function clearLockout(email) {
  if (!email) return;
  localStorage.removeItem(lockoutKey(email));
}

/* ══════════════════════════════════════════════════════════════════════════
   TOTP LOGIN MODAL
══════════════════════════════════════════════════════════════════════════ */
const TotpLoginModal = ({
  open,
  onClose,
  onSuccess,
  loginData,
  mainButtonColor,
  device, // "mobile" | "tablet" | "desktop"
}) => {
  const isMobile = device === "mobile";
  const isTablet = device === "tablet";

  const [step, setStep] = useState("verify");
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [manualKey, setManualKey] = useState("");
  const [showManualKey, setShowManualKey] = useState(false);
  const [qrScale, setQrScale] = useState(1);
  const [totpCode, setTotpCode] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState("");
  // NEW: true once the user has asked to regenerate their QR because they
  // lost/deleted the entry in their authenticator app. This reuses the same
  // "isSetup" verification path as first-time setup (which overwrites
  // totp_secret in the DB), so no separate identity flow is needed — the
  // user already proved identity via password on /login.
  const [regenerating, setRegenerating] = useState(false);
  const inputRefs = useRef([]);

  const isSetupFlow = loginData?.requireTotpSetup === true;

  // Size tokens per device tier
  const modalWidth = isMobile ? "calc(100% - 24px)" : isTablet ? 440 : 480;
  const modalMaxWidth = isMobile ? undefined : 480;
  const modalPadding = isMobile ? 2.5 : isTablet ? 3.5 : 4;
  const qrSize = isMobile ? 168 : isTablet ? 188 : 200;
  const digitBoxWidth = isMobile ? 38 : isTablet ? 48 : 54;
  const digitBoxHeight = isMobile ? 48 : isTablet ? 56 : 62;
  const digitGap = isMobile ? 0.75 : 1.5;

  useEffect(() => {
    if (!open || !loginData) return;
    setTotpCode(["", "", "", "", "", ""]);
    setError("");
    setShowManualKey(false);
    setQrScale(1);
    setRegenerating(false);

    if (isSetupFlow) {
      setStep("loading_qr");
      axios
        .post(`${API_BASE_URL}/api/login-totp-setup`, {
          loginSetupId: loginData.loginSetupId,
          email: loginData.email,
          source: loginData.source || "user",
        }, { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` } })
        .then((res) => {
          if (res.data.success) {
            setQrDataUrl(res.data.qrDataUrl);
            setManualKey(res.data.manualKey);
            setStep("scan");
          } else {
            setError(res.data.message || "Failed to generate QR code.");
            setStep("scan");
          }
        })
        .catch((err) => {
          setError(err.response?.data?.message || "Failed to generate setup.");
          setStep("scan");
        });
    } else {
      setStep("verify");
      setTimeout(() => inputRefs.current[0]?.focus(), 150);
    }
  }, [open, loginData?.email]);

  const handleDigitChange = (value, index) => {
    if (!/^\d?$/.test(value)) return;
    const next = [...totpCode];
    next[index] = value;
    setTotpCode(next);
    if (value && index < 5) inputRefs.current[index + 1]?.focus();
  };

  const handleDigitKeyDown = (e, index) => {
    if (e.key === "Backspace") {
      if (totpCode[index]) {
        const next = [...totpCode];
        next[index] = "";
        setTotpCode(next);
      } else if (index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
    }
    if (e.key === "Enter") handleVerifyAndRegister();
  };

  // NEW: called from the "Lost access to your authenticator?" link on the
  // verify screen for RETURNING users (isSetupFlow === false). Unlike the
  // old "Back to QR code" button, this actually calls the backend to fetch
  // a brand-new QR — it doesn't just flip local UI state. Requires the
  // backend to issue a loginSetupId on every /login response where TOTP is
  // required (not just the first-ever-login/no-secret-yet branch).
  const handleRegenerateQr = () => {
    if (!loginData?.loginSetupId) {
      setError(
        "Can't regenerate right now — please log in again to get a fresh setup reference."
      );
      return;
    }
    setRegenerating(true);
    setError("");
    setStep("loading_qr");
    axios
      .post(`${API_BASE_URL}/api/login-totp-setup`, {
        loginSetupId: loginData.loginSetupId,
        email: loginData.email,
        source: loginData.source || "user",
      }, { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` } })
      .then((res) => {
        if (res.data.success) {
          setQrDataUrl(res.data.qrDataUrl);
          setManualKey(res.data.manualKey);
          setStep("scan");
        } else {
          setError(res.data.message || "Failed to generate QR code.");
          setStep("verify");
        }
      })
      .catch((err) => {
        setError(err.response?.data?.message || "Failed to generate setup.");
        setStep("verify");
      });
  };

  const handleVerifyAndRegister = async () => {
    const totpToken = totpCode.join("");
    if (!/^\d{6}$/.test(totpToken)) {
      setError("Please enter the complete 6-digit code from Google Authenticator.");
      return;
    }
    setError("");
    setStep("submitting");

    try {
      const verifyRes = await axios.post(`${API_BASE_URL}/api/verify-login-totp`, {
        loginSetupId: loginData.loginSetupId,
        email: loginData.email,
        token: totpToken,
        // Regenerating counts as a setup verification too — it needs to
        // persist the newly generated secret to the DB, overwriting the
        // old (deleted-from-the-app) one.
        isSetup: isSetupFlow || regenerating,
        source: loginData.source || "user",
        audit_log_db: "db3",
        ...getLoginMacPayload(),
      }, { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` } });

      if (!verifyRes.data.success) {
        setError(verifyRes.data.message || "Verification failed.");
        setStep("verify");
        return;
      }

      onSuccess();
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong. Please try again.");
      setStep("verify");
    }
  };

  if (!open) return null;

  const canClose = step !== "submitting";

  return (
    <Modal open={open} onClose={step === "submitting" ? undefined : onClose}>
      <Box sx={{
        position: "absolute", top: "50%", left: "50%",
        transform: "translate(-50%, -50%)",
        width: isMobile ? "calc(100% - 32px)" : (step === "scan" ? 760 : 480),
        maxWidth: step === "scan" ? 760 : 480,
        bgcolor: "#fff",
        borderRadius: "20px",
        boxShadow: "0 20px 60px rgba(0,0,0,0.18)",

        outline: "none",
        maxHeight: "90vh",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}>
        {/* ── Colored header bar ── */}
        {step !== "loading" && (
          <Box sx={{
            bgcolor: mainButtonColor,
            color: "white",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            px: isMobile ? 2.5 : 3,
            py: 2,
            flexShrink: 0,
          }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
              <Box sx={{
                width: 40, height: 40, borderRadius: "50%",
                bgcolor: "rgba(255,255,255,0.2)",
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
              }}>
                {step === "scan" ? (
                  <PhoneAndroidIcon sx={{ color: "#fff", fontSize: 21 }} />
                ) : (
                  <CheckCircleIcon sx={{ color: "#fff", fontSize: 21 }} />
                )}
              </Box>
              <Box>
                <Typography fontWeight={700} fontSize={isMobile ? 15 : 17} color="white" lineHeight={1.2}>
                  {step === "scan"
                    ? (regenerating ? "Re-link Google Authenticator" : "Set Up Google Authenticator")
                    : "Enter Authenticator Code"}
                </Typography>
                <Typography fontSize={12} color="rgba(255,255,255,0.85)" lineHeight={1.3}>
                  {step === "scan"
                    ? (regenerating
                        ? "Scan this new QR code with your authenticator app"
                        : "One-time setup — Step 1 of 2")
                    : "Step 2 of 2 — Confirm & complete registration"}
                </Typography>

              </Box>
            </Box>

            <IconButton
              onClick={onClose}
              disabled={step === "submitting"}
              sx={{
                color: "white",
                border: "2px solid rgba(255,255,255,0.6)",
                borderRadius: "50%",
                width: 40,
                height: 40,
                padding: 0,
                flexShrink: 0,
                "&:hover": {
                  backgroundColor: "rgba(255,255,255,0.2)",
                  border: "2px solid white",
                },
              }}
            >
              <CloseIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Box>
        )}

        {/* ── Body (scrollable) ── */}
        <Box sx={{ p: isMobile ? 2.5 : 3.5, overflowY: "auto" }}>

          {/* ── Loading state ── */}
          {step === "loading" && (
            <Box sx={{ textAlign: "center", py: 5 }}>
              <CircularProgress sx={{ color: mainButtonColor }} />
              <Typography sx={{ mt: 2, color: "#666", fontSize: "14px" }}>
                Generating your authenticator QR code…
              </Typography>

            </Box>
          )}

          {/* ── Scan QR step: left = instructions, right = QR code ── */}
          {step === "scan" && (
            <Box sx={{
              display: "flex",
              flexDirection: isMobile ? "column" : "row",
              gap: isMobile ? 2.5 : 3.5,
              alignItems: "flex-start",
            }}>
              {/* LEFT: Instructions */}
              <Box sx={{ flex: 1.15, minWidth: 0, width: "100%" }}>
                {regenerating && (
                  <Box sx={{
                    bgcolor: "#fff8e1",
                    border: "1px solid #f5c542",
                    borderRadius: "10px",
                    p: 1.5,
                    mb: 2,
                  }}>
                    <Typography fontSize={12.5} color="#5d4a00" lineHeight={1.5}>
                      Your old authenticator entry for this account will stop working
                      once you finish scanning and confirming this new code.
                    </Typography>
                  </Box>
                )}
                <Box
                  sx={{
                    bgcolor: "#f8f9ff",
                    borderRadius: "12px",
                    p: 2,
                    mb: 2,
                    border: "1px solid #e8eaff",
                  }}
                >
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>

                    {/* Step 1 label */}
                    <Box>
                      <Typography fontSize={13} color="#444" fontWeight={600}>
                        1. Download and install <strong>Google Authenticator</strong>:
                      </Typography>

                    </Box>

                    {/* Download buttons — each on its own row */}
                    <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75, pl: 1 }}>
                      <Box sx={{
                        display: "flex", alignItems: "center", gap: 1,
                        bgcolor: "#fff", border: "1px solid #dde3ff",
                        borderRadius: "8px", px: 1.5, py: 1,
                      }}>
                        <span style={{ fontSize: 18, lineHeight: 1 }}>📱</span>
                        <MuiLink
                          href="https://apps.apple.com/app/google-authenticator/id388497605"
                          target="_blank"
                          rel="noopener noreferrer"
                          underline="always"
                          fontWeight="bold"
                          fontSize={13}
                          color="inherit"
                        >
                          App Store <span style={{ fontWeight: 400, color: "#888" }}>(iPhone / iPad)</span>
                        </MuiLink>
                      </Box>

                      <Box sx={{
                        display: "flex", alignItems: "center", gap: 1,
                        bgcolor: "#fff", border: "1px solid #dde3ff",
                        borderRadius: "8px", px: 1.5, py: 1,
                      }}>
                        <span style={{ fontSize: 18, lineHeight: 1 }}>🤖</span>
                        <MuiLink
                          href="https://play.google.com/store/apps/details?id=com.google.android.apps.authenticator2"
                          target="_blank"
                          rel="noopener noreferrer"
                          underline="always"
                          fontWeight="bold"
                          fontSize={13}
                          color="inherit"
                        >
                          Google Play <span style={{ fontWeight: 400, color: "#888" }}>(Android)</span>
                        </MuiLink>
                      </Box>
                    </Box>

                    {/* Step 2 */}
                    <Box>
                      <Typography fontSize={13} color="#444" lineHeight={1.6}>
                        <strong>2.</strong> Open the app → tap <strong>"+"</strong> → <strong>"Scan a QR code"</strong>.
                      </Typography>

                    </Box>

                    {/* Step 3 */}
                    <Box>
                      <Typography fontSize={13} color="#444" lineHeight={1.6}>
                        <strong>3.</strong> Scan the QR code shown on the right.
                      </Typography>

                    </Box>

                  </Box>
                </Box>

                {/* Manual key fallback */}
                {manualKey && (
                  <Box sx={{ mb: 2 }}>
                    <button
                      onClick={() => setShowManualKey((v) => !v)}
                      style={{
                        background: "none", border: "none", cursor: "pointer",
                        color: mainButtonColor, fontSize: "13px", fontWeight: 600,
                        padding: 0, textDecoration: "underline",
                      }}
                    >
                      {showManualKey ? "Hide manual key" : "Can't scan? Enter key manually"}
                    </button>
                    <Typography fontSize={11} color="#aaa" fontStyle="italic" sx={{ mt: 0.3 }}>
                      {showManualKey ? "Itago ang manual key" : "Hindi ma-scan? Ilagay ang key nang manu-mano"}
                    </Typography>
                    {showManualKey && (
                      <Box sx={{
                        mt: 1, p: "10px 14px",
                        bgcolor: "#f5f5f5", borderRadius: "8px",
                        border: "1px solid #ddd",
                        fontFamily: "monospace",
                        fontSize: isMobile ? "12px" : "13.5px",
                        letterSpacing: "0.08em",
                        color: "#222",
                        wordBreak: "break-all",
                        userSelect: "all",
                      }}>
                        {manualKey}
                      </Box>
                    )}
                    {showManualKey && (
                      <>
                        <Typography fontSize={11.5} color="#888" sx={{ mt: 0.5 }}>
                          In Google Authenticator: tap + → Enter a setup key → paste this key, select "Time based".
                        </Typography>

                      </>
                    )}
                  </Box>
                )}

                {/* Warning about 10-min expiry */}
                <Box sx={{
                  display: "flex", gap: 1, alignItems: "flex-start",
                  bgcolor: "#fffbf2", border: "1px solid #f5a623",
                  borderRadius: "8px", p: 1.5,
                }}>
                  <span style={{ fontSize: 16, flexShrink: 0 }}>⏱️</span>
                  <Box>
                    <Typography fontSize={12} color="#5d4037" lineHeight={1.5}>
                      This QR code expires in <strong>10 minutes</strong>. If it expires, close this dialog and click "Submit Application" again.
                    </Typography>

                  </Box>
                </Box>
              </Box>

              {/* RIGHT: QR code */}
              <Box sx={{
                flex: 1,
                width: "100%",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                ...(isMobile ? {} : {
                  position: "sticky",
                  top: 0,
                  borderLeft: "1px solid #eee",
                  pl: 3.5,
                }),
              }}>
                {error ? (
                  <Box sx={{
                    border: "1px solid #f44336", borderRadius: "12px",
                    p: 2, textAlign: "center", width: "100%",
                  }}>
                    <Typography color="error" fontSize={13}>{error}</Typography>
                  </Box>
                ) : (
                  <Box sx={{ textAlign: "center" }}>
                    {qrDataUrl ? (
                      <img
                        src={qrDataUrl}
                        alt="Google Authenticator QR Code"
                        style={{
                          width: (isMobile ? 190 : 220) * qrScale,
                          height: (isMobile ? 190 : 220) * qrScale,
                          border: "3px solid #000",
                          borderRadius: "12px",
                          display: "inline-block",
                          transition: "width 0.2s ease, height 0.2s ease",
                        }}
                      />
                    ) : (
                      <Box sx={{
                        width: 220, height: 220,
                        bgcolor: "#f5f5f5", borderRadius: "12px",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        mx: "auto",
                      }}>
                        <CircularProgress size={32} sx={{ color: mainButtonColor }} />
                      </Box>
                    )}
                  </Box>
                )}

                {/* Zoom controls for the QR code */}
                {!error && qrDataUrl && (
                  <Box sx={{ display: "flex", justifyContent: "center", gap: 1, mt: 1.5 }}>
                    <button
                      onClick={() => setQrScale((s) => Math.min(s + 0.25, 1.6))}
                      style={{
                        display: "flex", alignItems: "center", gap: 4,
                        background: "#f0f0f0", border: "1px solid #ddd", borderRadius: "20px",
                        padding: "5px 12px", fontSize: "12px", fontWeight: 600, color: "#333",
                        cursor: "pointer",
                      }}
                    >
                      <ZoomInIcon sx={{ fontSize: 16 }} /> Zoom in
                    </button>
                    <button
                      onClick={() => setQrScale((s) => Math.max(s - 0.25, 1))}
                      style={{
                        display: "flex", alignItems: "center", gap: 4,
                        background: "#f0f0f0", border: "1px solid #ddd", borderRadius: "20px",
                        padding: "5px 12px", fontSize: "12px", fontWeight: 600, color: "#333",
                        cursor: "pointer",
                      }}
                    >
                      <ZoomOutIcon sx={{ fontSize: 16 }} /> Zoom out
                    </button>
                  </Box>
                )}

                <Button
                  fullWidth
                  variant="contained"
                  onClick={() => {
                    setStep("verify");
                    setError("");
                    setTotpCode(["", "", "", "", "", ""]);
                    setTimeout(() => inputRefs.current[0]?.focus(), 150);
                  }}
                  disabled={!!error || !qrDataUrl}
                  sx={{
                    mt: 2.5,
                    backgroundColor: mainButtonColor,
                    color: "#fff", fontWeight: 700,
                    fontSize: "15px", borderRadius: "12px",
                    py: 1.25, textTransform: "none",
                    "&:hover": { backgroundColor: mainButtonColor, opacity: 0.92 },
                  }}
                >
                  I've scanned it — Enter the code →
                </Button>

              </Box>
            </Box>
          )}

          {/* ── Verify code step ── */}
          {(step === "verify" || step === "submitting") && (
            <>
              <Box sx={{
                bgcolor: "#f8f9ff", borderRadius: "12px",
                p: 2, mb: 2.5, border: "1px solid #e8eaff",
              }}>
                <Typography fontSize={13} color="#444" lineHeight={1.7}>
                  Open <strong>Google Authenticator</strong> on your phone and enter the <strong>6-digit code</strong> shown for this account.
                </Typography>

                <Typography fontSize={12} color="#888" sx={{ mt: 0.8 }}>
                  The code refreshes every 30 seconds — use the current one.
                </Typography>

              </Box>

              {/* 6-digit input boxes */}
              <Box sx={{ display: "flex", justifyContent: "center", gap: isMobile ? 1 : 1.5, mb: 2.5 }}>
                {totpCode.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => (inputRefs.current[index] = el)}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleDigitChange(e.target.value, index)}
                    onKeyDown={(e) => handleDigitKeyDown(e, index)}
                    disabled={step === "submitting"}
                    style={{
                      width: isMobile ? "42px" : "54px",
                      height: isMobile ? "52px" : "62px",
                      fontSize: "24px",
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
                <Box sx={{
                  bgcolor: "#fff5f5", border: "1px solid #f44336",
                  borderRadius: "8px", p: 1.5, mb: 2,
                }}>
                  <Typography fontSize={13} color="#c62828">{error}</Typography>
                </Box>
              )}

              <Button
                fullWidth
                variant="contained"
                onClick={handleVerifyAndRegister}
                disabled={step === "submitting"}
                sx={{
                  backgroundColor: mainButtonColor,
                  color: "#fff", fontWeight: 700,
                  fontSize: "15px", borderRadius: "12px",
                  py: 1.5, textTransform: "none", mb: 0.5,
                  "&:hover": { backgroundColor: mainButtonColor, opacity: 0.92 },
                }}
              >
                {step === "submitting" ? (
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                    <CircularProgress size={18} sx={{ color: "#fff" }} />
                    Registering…
                  </Box>
                ) : "Verify & Complete Registration"}
              </Button>
              <Typography fontSize={11} color="#aaa" fontStyle="italic" textAlign="center" sx={{ mb: 1.5 }}>
                {step === "submitting" ? "Nirerehistro…" : "I-verify at Tapusin ang Pagpaparehistro"}
              </Typography>

              {/* Back to QR scan — only valid during first-time setup, where
                  a pending (not-yet-persisted) secret already exists for
                  loginSetupId and can just be re-displayed. */}
              {isSetupFlow && (
                <Button
                  fullWidth
                  color="error"
                  variant="outlined"
                  onClick={() => { setStep("scan"); setError(""); }}
                  disabled={step === "submitting"}
                  sx={{
                    fontWeight: 600, fontSize: "13px",
                    borderRadius: "12px", py: 1.25,
                    textTransform: "none", color: "#555",
                  }}
                >
                  ← Back to QR code
                </Button>
              )}

              {/* Lost access — for RETURNING users who already have a
                  totp_secret saved but deleted the entry from their app.
                  Actually calls the backend to generate + persist a fresh
                  secret, instead of the old dead-end local step flip. */}
              {!isSetupFlow && step === "verify" && (
                <Typography fontSize={16} color="#888" textAlign="center" sx={{ mt: 1.5 }}>
                  Lost access to your authenticator app?{" "}
                  <button
                    type="button"
                    onClick={handleRegenerateQr}
                    style={{
                      background: "none", border: "none", padding: 0,
                      color: mainButtonColor, fontWeight: 600,
                      cursor: "pointer", textDecoration: "underline",
                      font: "inherit",
                    }}
                  >
                    Get a new QR code
                  </button>
                </Typography>
              )}

            </>
          )}
        </Box>
      </Box>
    </Modal>
  );
};

/* ══════════════════════════════════════════════════════════════════════════
   LOGIN ENROLLMENT
══════════════════════════════════════════════════════════════════════════ */
const LoginEnrollment = ({ setIsAuthenticated }) => {
  const settings = useContext(SettingsContext);
  const { device, isMobile, isTablet, isDesktop } = useResponsive();
  const colors = settings?.colors || {};
  const branding = settings?.branding || {};
  const assets = settings?.assets || {};
  const mainButtonColor = colors.mainButton || "#1976d2";
  const headerColor = colors.header || "#1976d2";
  const borderColor = colors.border || "#e6e6e6";
  const companyName = branding.companyName || "Company Name";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [snack, setSnack] = useState({ open: false, message: "", severity: "info" });

  const [showTotpModal, setShowTotpModal] = useState(false);
  const [tempLoginData, setTempLoginData] = useState(null);

  const [loading, setLoading] = useState(false);
  const [loginType, setLoginType] = useState("user");
  const [errors, setErrors] = useState({});
  const navigate = useNavigate();

  const lockTimerRef = useRef(0);
  const [lockout, setLockout] = useState(false);
  const [lockoutTimer, setLockoutTimer] = useState(0);

  useEffect(() => {
    fetchAndStoreUserMacAddress().catch((err) => {
      console.error("Unable to preload MAC address for audit logs:", err);
    });
  }, []);

  useEffect(() => {
    if (!email) return;
    const remaining = getLockoutRemaining(email);
    if (remaining > 0 && !lockout) {
      lockTimerRef.current = remaining;
      setLockoutTimer(remaining);
      setLockout(true);
    }
  }, [email]);

  useEffect(() => {
    if (!lockout) return;
    const interval = setInterval(() => {
      lockTimerRef.current -= 1;
      setLockoutTimer(lockTimerRef.current);
      if (lockTimerRef.current <= 0) {
        clearInterval(interval);
        clearLockout(email);
        setLockout(false);
        lockTimerRef.current = 0;
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [lockout]); // eslint-disable-line react-hooks/exhaustive-deps

  const startLockout = (emailVal, seconds) => {
    saveLockout(emailVal, seconds);
    lockTimerRef.current = seconds;
    setLockoutTimer(seconds);
    setLockout(true);
  };

  const backgroundBase =
    assets.backgroundImage || "linear-gradient(to right, #f5f5f5, #fafafa)";
  const backgroundImage = `linear-gradient(to bottom, rgba(0, 0, 0, 0.65), rgba(0, 0, 0, 0.15)), ${backgroundBase}`;
  const logoSrc = assets.logoUrl || Logo;

  const isFormValid = () => {
    let newErrors = {};
    let isValid = true;
    if (!email) {
      newErrors.email = true;
      isValid = false;
    }
    if (!password) {
      newErrors.password = true;
      isValid = false;
    }
    setErrors(newErrors);
    return isValid;
  };

  const completeLogin = (data, shouldForceChange) => {
    localStorage.removeItem("lastVisitedPath");
    localStorage.setItem("token", data.token);
    localStorage.setItem("email", data.email);
    localStorage.setItem("role", data.role);
    localStorage.setItem("person_id", data.person_id);
    localStorage.setItem("prof_id", data.prof_id || "");
    localStorage.setItem("department", data.department || "");
    localStorage.setItem("employee_id", data.employee_id);
    localStorage.setItem("curriculum_id", data.curriculum_id || "");
    localStorage.setItem(
      "accessList",
      JSON.stringify(Array.isArray(data.accessList) ? data.accessList : []),
    );
    setIsAuthenticated(true);

    if (shouldForceChange) {
      const roleVal = data.role?.toLowerCase();
      const changePwPath =
        roleVal === "faculty"
          ? "/faculty_reset_password"
          : ["administrator", "superadmin", "technical"].includes(roleVal)
            ? "/registrar_reset_password"
            : "/student_reset_password";
      navigate(changePwPath);
    } else {
      navigate(getUserDashboard(data.role, data.accessList));
    }
  };

  const handleLogin = async () => {
    if (!isFormValid()) {
      setSnack({ open: true, message: "Please fill in all fields", severity: "warning" });
      return;
    }
    const stillLocked = getLockoutRemaining(email);
    if (stillLocked > 0) {
      if (!lockout) {
        lockTimerRef.current = stillLocked;
        setLockoutTimer(stillLocked);
        setLockout(true);
      }
      return;
    }

    try {
      setLoading(true);
      const apiUrl =
        loginType === "applicant"
          ? `${API_BASE_URL}/api/login_applicant`
          : `${API_BASE_URL}/api/login`;

      const res = await axios.post(apiUrl, {
        email,
        password,
        audit_log_db: "db3",
        ...getLoginMacPayload(),
      }, { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` } });

      if (res.data.locked) {
        const secs = res.data.remainingSeconds ?? 180;
        setSnack({ open: true, message: res.data.message, severity: "error" });
        startLockout(email, secs);
        return;
      }

      if (!res.data.success) {
        setSnack({ open: true, message: res.data.message, severity: "error" });
        return;
      }

      clearLockout(email);

      if (res.data.force_password_change) {
        localStorage.setItem("force_password_change", "true");
      } else {
        localStorage.removeItem("force_password_change");
      }
      const pendingKey = `pending_force_password_change::${(res.data.email || email).toLowerCase()}`;
      if (localStorage.getItem(pendingKey) === "true") {
        localStorage.setItem("force_password_change", "true");
        localStorage.removeItem(pendingKey);
      }

      if (loginType === "applicant") {
        const shouldForceChange = localStorage.getItem("force_password_change") === "true";
        localStorage.setItem("token", res.data.token);
        localStorage.setItem("email", res.data.email);
        localStorage.setItem("role", res.data.role);
        localStorage.setItem("person_id", res.data.person_id);
        localStorage.setItem("applyingAs", res.data.applyingAs || "");
        localStorage.setItem("prof_id", "");
        localStorage.setItem("employee_id", "");
        localStorage.setItem("curriculum_id", "");
        setIsAuthenticated(true);
        navigate(shouldForceChange ? "/applicant_reset_password" : "/applicant_dashboard");
        return;
      }

      if (res.data.requireTotpSetup || res.data.requireTotp) {
        setTempLoginData(res.data);
        setShowTotpModal(true);
        setSnack({
          open: true,
          message: res.data.requireTotpSetup
            ? "Please set up Google Authenticator to continue."
            : "Enter the code from Google Authenticator.",
          severity: "info",
        });
        return;
      }

      const shouldForceChange = localStorage.getItem("force_password_change") === "true";
      completeLogin(res.data, shouldForceChange);
    } catch (error) {
      const data = error.response?.data;
      const message = data?.message || "Login failed";
      const attemptsLeft = data?.remaining;
      const displayMsg =
        attemptsLeft != null
          ? `${message} (${attemptsLeft} attempt${attemptsLeft !== 1 ? "s" : ""} left)`
          : message;
      setSnack({ open: true, message: displayMsg, severity: "error" });
      if (
        data?.remainingSeconds ||
        message.toLowerCase().includes("too many") ||
        message.toLowerCase().includes("locked")
      ) {
        startLockout(email, data?.remainingSeconds ?? 180);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleTotpSuccess = () => {
    setShowTotpModal(false);
    const shouldForceChange = localStorage.getItem("force_password_change") === "true";
    completeLogin(tempLoginData, shouldForceChange);
  };

  const handleClose = (_, reason) => {
    if (reason === "clickaway") return;
    setSnack((prev) => ({ ...prev, open: false }));
  };

  // document.addEventListener("contextmenu", (e) => e.preventDefault());

  // // 🔒 Block DevTools shortcuts + Ctrl+P silently
  // document.addEventListener("keydown", (e) => {
  //   const isBlockedKey =
  //     e.key === "F12" ||
  //     e.key === "F11" ||
  //     (e.ctrlKey &&
  //       e.shiftKey &&
  //       (e.key.toLowerCase() === "i" || e.key.toLowerCase() === "j")) ||
  //     (e.ctrlKey && e.key.toLowerCase() === "u") ||
  //     (e.ctrlKey && e.key.toLowerCase() === "p");

  //   if (isBlockedKey) {
  //     e.preventDefault();
  //     e.stopPropagation();
  //   }
  // });

  // ── Layout tokens per device tier ──
  const fieldHeight = isMobile ? "52px" : "54px";

  return (
    <>
      <Box
        sx={{
          backgroundImage,
          backgroundSize: "cover, cover",
          backgroundPosition: "center, center",
          backgroundRepeat: "no-repeat, no-repeat",
          width: "100%",
          height: isDesktop ? "calc(100vh - 100px)" : undefined,
          minHeight: isDesktop ? 0 : "100dvh",
          display: "flex",
          alignItems: isDesktop ? "center" : "flex-start",
          justifyContent: "center",
          position: "relative",
          overflowY: isDesktop ? "hidden" : "auto",
          overflowX: "hidden",
          py: isDesktop ? 0 : isTablet ? 4 : 2,
          px: 2,
          pb: isMobile ? "calc(16px + env(safe-area-inset-bottom))" : undefined,
          boxSizing: "border-box",
        }}
      >
        <Box
          sx={{
            width: "100%",
            maxWidth: isMobile ? 400 : isTablet ? 380 : 460,
            display: "flex",
            justifyContent: "center",
            mx: "auto",
          }}
        >
          <div
            style={{
              border: `1px solid ${borderColor}`,
              width: "100%",
              margin: 0,
              transform: isMobile ? "scale(0.9)" : "none",
              transformOrigin: "top center",
              boxSizing: "border-box",
            }}
            className="Container login-card uniform-card"
          >
            <div
              className="Header"
              style={{
                backgroundColor: headerColor,
                padding: isMobile ? "12px 10px" : isTablet ? "14px 12px" : "1rem 0",
                borderBottom: "none",
              }}
            >
              <div className="HeaderTitle">
                <div className="CircleCon">
                  <img src={logoSrc} alt="Logo" />
                </div>
              </div>
              <div className="HeaderBody">
                <strong style={{ color: "white" }}>
                  {companyName
                    .split(" ")
                    .reduce((acc, word, i) => {
                      if (i % 4 === 0 && i !== 0) acc.push(<br key={`br-${i}`} />);
                      acc.push(word + " ");
                      return acc;
                    }, [])}
                </strong>
                <p>Academic Portal System</p>
              </div>
            </div>

            <div className="Body">
              <div className="TextField" style={{ position: "relative" }}>
                <label htmlFor="loginType">Login As</label>
                <select
                  id="loginType"
                  name="loginType"
                  value={loginType}
                  onChange={(e) => {
                    setLoginType(e.target.value);
                    if (e.target.value === "applicant") navigate("/login_applicant");
                    else navigate("/login");
                  }}
                  style={{
                    width: "100%",
                    padding: "0.8rem 2.5rem 0.8rem 2.80rem",
                    borderRadius: UNIFORM_RADIUS,
                    border: UNIFORM_BORDER,
                    fontSize: "16px",
                    height: fieldHeight,
                    backgroundColor: "white",
                    outline: "none",
                    appearance: "none",
                    WebkitAppearance: "none",
                    MozAppearance: "none",
                    cursor: "pointer",
                  }}
                >
                  <option value="user">Student / Faculty / Registrar</option>
                  <option value="applicant">Applicant</option>
                </select>
                <PersonIcon
                  style={{
                    position: "absolute",
                    top: "2.80rem",
                    left: "0.7rem",
                    color: "rgba(0,0,0,0.4)",
                  }}
                />
                <ArrowDropDownIcon
                  style={{
                    position: "absolute",
                    top: "2.80rem",
                    right: "0.7rem",
                    fontSize: "30px",
                    color: "black",
                    pointerEvents: "none",
                  }}
                />
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!lockout && !loading) handleLogin();
                }}
              >
                <div className="TextField" style={{ position: "relative" }}>
                  <label htmlFor="email">Email Address</label>
                  <input
                    type="text"
                    id="email"
                    name="email"
                    placeholder="Enter your email address"
                    className="border"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    style={{
                      paddingLeft: "2.80rem",
                      height: fieldHeight,
                      fontSize: "16px",
                      border: fieldBorder(errors.email),
                      borderRadius: UNIFORM_RADIUS,
                      width: "100%",
                    }}
                    autoFocus={isDesktop}
                  />
                  {errors.email && (
                    <span style={{ color: "red", fontSize: "15px" }}>Email is required</span>
                  )}
                  <EmailIcon
                    style={{
                      position: "absolute",
                      top: "2.80rem",
                      left: "0.7rem",
                      color: "rgba(0,0,0,0.4)",
                    }}
                  />
                </div>

                <div className="TextField" style={{ position: "relative" }}>
                  <label htmlFor="password">Password</label>
                  <input
                    type={showPassword ? "text" : "password"}
                    id="password"
                    name="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="border"
                    style={{
                      paddingLeft: "2.80rem",
                      height: fieldHeight,
                      fontSize: "16px",
                      border: fieldBorder(errors.password),
                      borderRadius: UNIFORM_RADIUS,
                      width: "100%",
                    }}
                  />
                  {errors.password && (
                    <span style={{ color: "red", fontSize: "15px" }}>Password is required</span>
                  )}
                  <LockIcon
                    style={{
                      position: "absolute",
                      top: "2.80rem",
                      left: "0.7rem",
                      color: "rgba(0,0,0,0.4)",
                      fontSize: "22px",
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      color: "rgba(0,0,0,0.3)",
                      outline: "none",
                      position: "absolute",
                      top: "2.80rem",
                      right: "1rem",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      touchAction: "manipulation",
                    }}
                  >
                    {showPassword ? (
                      <Visibility sx={{ fontSize: "22px", color: "rgba(0,0,0,0.4)" }} />
                    ) : (
                      <VisibilityOff sx={{ fontSize: "22px", color: "rgba(0,0,0,0.4)" }} />
                    )}
                  </button>
                </div>

                <div style={{ marginTop: "-10px" }}>
                  <span>
                    <Link to="/forgot_password">Forgot your password</Link>
                  </span>
                </div>

                <button
                  type="submit"
                  tabIndex={0}
                  disabled={lockout || loading}
                  className="Button"
                  style={{
                    width: "100%",
                    height: isMobile ? "48px" : "44px",
                    borderRadius: UNIFORM_RADIUS,
                    border: "none",
                    backgroundColor: lockout ? "#999" : loading ? "#ccc" : mainButtonColor,
                    opacity: lockout || loading ? 0.7 : 1,
                    color: "white",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: lockout || loading ? "not-allowed" : "pointer",
                    touchAction: "manipulation",
                    marginTop: "30px",
                    fontSize: "16px",
                    fontWeight: "bold",
                    padding: 0,
                  }}
                >
                  {lockout ? `Locked (${lockoutTimer}s)` : loading ? "Processing..." : "Log In"}
                </button>
              </form>
            </div>

            <div
              className="Footer"
              style={{
                backgroundColor: headerColor,
                borderTop: "none",
                color: "white",
              }}
            >
              <div className="FooterText" />
            </div>
          </div>
        </Box>

        <TotpLoginModal
          open={showTotpModal}
          onClose={() => setShowTotpModal(false)}
          onSuccess={handleTotpSuccess}
          loginData={tempLoginData}
          mainButtonColor={mainButtonColor}
          device={device}
        />

        <Snackbar
          open={snack.open}
          autoHideDuration={4000}
          onClose={handleClose}
          anchorOrigin={{ vertical: "top", horizontal: "center" }}
        >
          <Alert severity={snack.severity} onClose={handleClose} sx={{ width: "100%" }}>
            {snack.message}
          </Alert>
        </Snackbar>

        <LoadingOverlay open={loading} preserve />
      </Box>
    </>
  );
};

export default LoginEnrollment;
