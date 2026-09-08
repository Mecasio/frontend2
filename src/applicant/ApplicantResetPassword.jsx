import React, { useState, useEffect, useContext } from "react";
import { SettingsContext } from "../App";
import {
  Button,
  TextField,
  InputLabel,
  Typography,
  Paper,
  Box,
  Divider,
  Snackbar,
  Alert,
  IconButton,
  InputAdornment,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import {
  Visibility,
  VisibilityOff,
  CheckCircle,
  Cancel,
  LockReset,
} from "@mui/icons-material";
import axios from "axios";
import API_BASE_URL from "../apiConfig";
import { useNavigate } from "react-router-dom";

const passwordRules = [
  {
    label: "Minimum of 8 characters",
    test: (pw) => pw.length >= 8,
  },
  {
    label: "At least one lowercase letter (e.g. abc)",
    test: (pw) => /[a-z]/.test(pw),
  },
  {
    label: "At least one uppercase letter (e.g. ABC)",
    test: (pw) => /[A-Z]/.test(pw),
  },
  {
    label: "At least one number (e.g. 123)",
    test: (pw) => /\d/.test(pw),
  },
  {
    label: "At least one special character (! # $ ^ * @ - . < > _ & % + = ?)",
    test: (pw) => /[!#$^*@\-.<>_&%+=?]/.test(pw),
  },
];


const ApplicantResetPassword = () => {
  const settings = useContext(SettingsContext);
  const colors = settings?.colors || {};
  const branding = settings?.branding || {};
  const assets = settings?.assets || {};
  const headerColor = colors.header || "#1976d2";
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const [titleColor, setTitleColor] = useState("#000000");
  const [subtitleColor, setSubtitleColor] = useState("#555555");
  const [borderColor, setBorderColor] = useState("#000000");
  const [mainButtonColor, setMainButtonColor] = useState("#1976d2");

  useEffect(() => {
    if (settings) {
      if (colors.title) setTitleColor(colors.title);
      if (colors.subtitle) setSubtitleColor(colors.subtitle);
      if (colors.border) setBorderColor(colors.border);
      if (colors.mainButton) setMainButtonColor(colors.mainButton);
    }
  }, [settings]);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [validations, setValidations] = useState([]);
  const [showPassword, setShowPassword] = useState({ current: false, new: false, confirm: false });
  const [snack, setSnack] = useState({ open: false, message: "", severity: "success" });

  useEffect(() => {
    const storedUser = localStorage.getItem("email");
    const storedRole = localStorage.getItem("role");
    const storedID = localStorage.getItem("person_id");
    if (!(storedUser && storedRole && storedID && storedRole === "applicant")) {
      window.location.href = "/login";
    }
  }, []);

  useEffect(() => {
    const results = passwordRules.map((rule) => rule.test(newPassword));
    setValidations(results);
  }, [newPassword]);

  const isValid = validations.every(Boolean) && newPassword === confirmPassword;

  const navigate = useNavigate();

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      const person_id = localStorage.getItem("person_id");
      const response = await axios.post(`${API_BASE_URL}/api/applicant-change-password`, {
        person_id, currentPassword, newPassword,
      });
      setSnack({ open: true, message: response.data.message, severity: "success" });
      setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
      localStorage.removeItem("force_password_change");
      window.dispatchEvent(new Event("password_changed"));
      setTimeout(() => navigate("/applicant_dashboard"), 1500);
    } catch (err) {
      setSnack({ open: true, message: err.response?.data?.message || "Error updating password.", severity: "error" });
    }
  };

  const toggleShowPassword = (field) =>
    setShowPassword((prev) => ({ ...prev, [field]: !prev[field] }));

  // 🔒 Disable right-click + block DevTools shortcuts / Ctrl+P
  // (moved into useEffect with cleanup — the original attached a fresh
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

  return (
    <Box
      sx={{
        minHeight: { xs: "100vh", md: "calc(100vh - 150px)" },
        overflowY: { md: "auto" },
        backgroundColor: { xs: "#f5f5f5", md: "transparent" },
        pr: { md: 1 },
        mt: { md: 1 },
        p: { xs: 0, sm: 2 },
        pb: { xs: 6, sm: 2 },
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "flex-start",
          alignItems: "center",
          flexWrap: "wrap",
          mb: 2,
          px: { xs: 2, sm: 0 },
          pt: { xs: 2, sm: 0 },
        }}
      >
        <Typography
          variant="h4"
          sx={{ fontWeight: "bold", color: titleColor, fontSize: { xs: 20, sm: 28, md: 34, lg: 36 } }}
        >
          APPLICANT RESET PASSWORD
        </Typography>
      </Box>

      <Box sx={{ borderTop: "1px solid #ccc", width: "100%" }} />
      <Box sx={{ height: { xs: 16, sm: 20 } }} />

      <Box sx={{ display: "flex", justifyContent: "center", px: { xs: 1.5, sm: 0 }, mt: { xs: 0, sm: 4 } }}>
        <Paper
          elevation={6}
          sx={{
            p: { xs: 2.5, sm: 3, md: 3.5 },
            width: { xs: "100%", sm: "80%", md: "55%", lg: "40%" },
            maxWidth: "540px",
            borderRadius: 4,
            backgroundColor: "#fff",
            border: `1px solid ${borderColor}`,
            boxShadow: "0px 4px 20px rgba(0,0,0,0.1)",
            mb: { xs: 4, sm: 12 },
          }}
        >
          {/* Lock Icon Header */}
          <Box textAlign="center" mb={2}>
            <LockReset
              sx={{
                fontSize: { xs: 56, sm: 70, md: 80 },
                color: "#000000",
                backgroundColor: "#f0f0f0",
                borderRadius: "50%",
                p: 1,
              }}
            />
            <Typography
              variant="h5"
              fontWeight="bold"
              sx={{ mt: 1, color: subtitleColor, fontSize: { xs: 18, sm: 20, md: 22 } }}
            >
              Reset Your Password
            </Typography>
            <Typography sx={{ fontSize: { xs: 12, sm: 13 } }} color="text.secondary">
              Update your password to keep your account secure.
            </Typography>

          </Box>

          <Divider sx={{ mb: 2 }} />

          <form onSubmit={handleUpdate}>
            {[
              {
                field: "current",
                label: "Current Password",
                value: currentPassword,
                setter: setCurrentPassword,
              },
              {
                field: "new",
                label: "New Password",
                value: newPassword,
                setter: setNewPassword,
              },
              {
                field: "confirm",
                label: "Confirm Password",
                value: confirmPassword,
                setter: setConfirmPassword,
              },
            ].map(({ field, label, value, setter }) => (
              <Box mb={2} key={field}>
                <InputLabel sx={{ fontSize: { xs: 13, sm: 14 } }}>
                  {label}
                </InputLabel>

                <TextField
                  fullWidth
                  type={showPassword[field] ? "text" : "password"}
                  size="small"
                  variant="outlined"
                  value={value}
                  onChange={(e) => setter(e.target.value)}
                  error={
                    field === "confirm" &&
                    Boolean(confirmPassword && confirmPassword !== newPassword)
                  }
                  helperText={
                    field === "confirm" &&
                      confirmPassword &&
                      confirmPassword !== newPassword
                      ? "Passwords do not match"
                      : ""
                  }
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => toggleShowPassword(field)}
                          edge="end"
                          size={isMobile ? "small" : "medium"}
                        >
                          {showPassword[field] ? <Visibility /> : <VisibilityOff />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
              </Box>
            ))}

            <Typography variant="subtitle2" sx={{ mt: 2, mb: 0.25, fontSize: { xs: 12, sm: 14 } }}>
              Your new password must include:
            </Typography>


            <List dense disablePadding>
              {passwordRules.map((rule, i) => (
                <ListItem key={i} sx={{ py: 0.35, px: 0, alignItems: "flex-start" }}>
                  <ListItemIcon sx={{ minWidth: 32, mt: "2px" }}>
                    {validations[i]
                      ? <CheckCircle sx={{ color: "green", fontSize: { xs: 18, sm: 22 } }} />
                      : <Cancel sx={{ color: "red", fontSize: { xs: 18, sm: 22 } }} />}
                  </ListItemIcon>
                  <ListItemText
                    primary={rule.label}
                    secondary={rule.labelTl}
                    primaryTypographyProps={{
                      fontSize: { xs: 12, sm: 14 },
                      color: validations[i] ? "green" : "inherit",
                      fontWeight: validations[i] ? 600 : 400,
                    }}
                    secondaryTypographyProps={{
                      fontSize: { xs: 11, sm: 12.5 },
                      fontStyle: "italic",
                      color: validations[i] ? "green" : "text.secondary",
                    }}
                  />
                </ListItem>
              ))}
            </List>

            <Typography variant="body2" color="warning.main" sx={{ mt: 1, fontSize: { xs: 11, sm: 13 } }}>
              Note: You are required to change your password to continue using the system securely.
            </Typography>

            <Button
              type="submit"
              fullWidth
              variant="contained"
              disabled={!isValid}
              sx={{
                py: 1.2,
                borderRadius: 2,
                backgroundColor: mainButtonColor,
                border: `1px solid ${borderColor}`,
                textTransform: "none",
                fontWeight: "bold",
                fontSize: { xs: 13, sm: 15 },
                "&:hover": { backgroundColor: mainButtonColor, opacity: 0.9 },
                "&.Mui-disabled": { backgroundColor: "#b0b8c8", color: "#fff", opacity: 0.7 },
              }}
            >
              Update Password
            </Button>
          </form>
        </Paper>
      </Box>

      <Snackbar
        open={snack.open}
        autoHideDuration={4000}
        onClose={() => setSnack((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert severity={snack.severity} onClose={() => setSnack((prev) => ({ ...prev, open: false }))} sx={{ width: "100%" }}>
          {snack.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ApplicantResetPassword;
