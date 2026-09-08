import React, { useState, useEffect, useContext } from "react";
import { SettingsContext } from "../App";
import axios from "axios";
import {
  Box, Typography, Button, Snackbar, Alert,
  Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions
} from "@mui/material";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import Unauthorized from "../components/Unauthorized";
import LoadingOverlay from "../components/LoadingOverlay";
import API_BASE_URL from "../apiConfig";
import { postAuditEvent } from "../utils/auditEvents";
import useAuditMac from "../utils/useAuditMac";

const ChangeYearGradPer = () => {
  useAuditMac();
  const settings = useContext(SettingsContext);
  const colors = settings?.colors || {};

  const [titleColor, setTitleColor] = useState("#000000");
  const [subtitleColor, setSubtitleColor] = useState("#555555");
  const [borderColor, setBorderColor] = useState("#000000");

  const [gradingPeriod, setGradingPeriod] = useState([]);
  const [user, setUser] = useState("");
  const [userRole, setUserRole] = useState("");
  const [userID, setUserID] = useState("");
  const [employeeID, setEmployeeID] = useState("");
  const [hasAccess, setHasAccess] = useState(null);
  const [loading, setLoading] = useState(true);
  const pageId = 14;

  // ✅ Confirmation dialog state
  const [confirmDialog, setConfirmDialog] = useState({
    open: false,
    periodId: null,
    periodDescription: "",
  });

  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  const fetchYearPeriod = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/get-grading-period`);
      setGradingPeriod(response.data);
    } catch (error) {
      console.error("Error fetching grading periods", error);
      setSnackbar({ open: true, message: "Failed to fetch grading periods", severity: "error" });
    }
  };

  useEffect(() => {
    if (!settings) return;
    setTitleColor(colors.title || "#000000");
    setSubtitleColor(colors.subtitle || "#555555");
    setBorderColor(colors.border || "#000000");
  }, [settings]);

  useEffect(() => {
    const storedUser = localStorage.getItem("email");
    const storedRole = localStorage.getItem("role");
    const storedID = localStorage.getItem("person_id");
    const storedEmployeeID = localStorage.getItem("employee_id");

    if (storedUser && storedRole && storedID) {
      setUser(storedUser);
      setUserID(storedID);
      setUserRole(storedRole);
      setEmployeeID(storedEmployeeID);
      if (storedRole === "registrar") {
        checkAccess(storedEmployeeID);
      } else {
        window.location.href = "/login";
      }
    } else {
      window.location.href = "/login";
    }
  }, []);

  const checkAccess = async (employeeID) => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/api/page_access/${employeeID}/${pageId}`);
      setHasAccess(response.data?.page_privilege === 1);
    } catch (error) {
      console.error("Error checking access", error);
      setHasAccess(false);
      setSnackbar({ open: true, message: "Failed to check access", severity: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchYearPeriod();
  }, []);

  const insertAuditLog = async (eventType, details = {}) => {
    try {
      await postAuditEvent(eventType, details);
    } catch (err) {
      console.error("Error inserting audit log");
    }
  };

  // ✅ Opens the dialog instead of activating directly
  const handleActivateClick = (period) => {
    setConfirmDialog({
      open: true,
      periodId: period.id,
      periodDescription: period.description,
    });
  };

  // ✅ Called when user confirms
  const handleConfirmActivate = async () => {
    const { periodId, periodDescription } = confirmDialog;
    setConfirmDialog({ open: false, periodId: null, periodDescription: "" });
    try {
      await axios.post(`${API_BASE_URL}/api/grade_period_activate/${periodId}`);
      setSnackbar({ open: true, message: "Grading period activated!", severity: "success" });
      fetchYearPeriod();
      await insertAuditLog("grading_period_activated", {
        id: periodId,
        description: periodDescription,
      });
    } catch (error) {
      console.error("Error activating grading period:", error);
      setSnackbar({ open: true, message: "Failed to activate grading period", severity: "error" });
    }
  };

  const handleCancelDialog = () => {
    setConfirmDialog({ open: false, periodId: null, periodDescription: "" });
  };

  const handleCloseSnackbar = () => {
    setSnackbar((prev) => ({ ...prev, open: false }));
  };

  if (loading || hasAccess === null) {
    return <LoadingOverlay open={loading} message="Loading..." />;
  }

  if (!hasAccess) {
    return <Unauthorized />;
  }

  // 🔒 Disable right-click
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

  return (
    <Box sx={{ height: "calc(100vh - 150px)", overflowY: "auto", paddingRight: 1, backgroundColor: "transparent", mt: 1, padding: 2 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", mb: 2 }}>
        <Typography variant="h4" sx={{ fontWeight: "bold", color: titleColor, fontSize: "36px" }}>
          GRADING PERIOD
        </Typography>
      </Box>

      <hr style={{ border: "1px solid #ccc", width: "100%" }} />
      <br /><br />

      <Box sx={{ mt: 3 }}>
        {gradingPeriod.map((period) => (
          <Box
            key={period.id}
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              border: `1px solid ${borderColor}`,
              padding: "15px",
              backgroundColor: "#fff",
              margin: "20px auto",
              width: "50%",
              borderRadius: "6px",
              boxShadow: "0 2px 6px rgba(0, 0, 0, 0.1)",
            }}
          >
            <Typography sx={{ fontSize: "18px", fontWeight: 500, color: "#333" }}>
              {period.description}
            </Typography>
            <Box>
              {period.status === 1 ? (
                <Typography sx={{ color: "#757575", fontSize: "16px" }}>Activated</Typography>
              ) : (
                <Button
                  variant="contained"
                  onClick={() => handleActivateClick(period)}  // ✅ opens dialog
                  sx={{ backgroundColor: "#4CAF50", "&:hover": { backgroundColor: "#45a049" } }}
                >
                  Activate
                </Button>
              )}
            </Box>
          </Box>
        ))}
      </Box>

      {/* ✅ Confirmation Dialog */}
      {/* ✅ Confirmation Dialog */}
      <Dialog open={confirmDialog.open} onClose={handleCancelDialog} maxWidth="xs" fullWidth>
        <DialogTitle
          sx={{
            background: colors.header || "#9E0000",
            color: "#fff",
            fontWeight: 700,
            fontSize: "1.2rem",
            py: 2,
          }}
        >
          Change Grading Period
        </DialogTitle>

        <DialogContent sx={{ p: 3, mt: 2 }}>
          <Typography sx={{ mb: 2 }}>
            Are you sure you want to activate <strong>{confirmDialog.periodDescription}</strong>?
          </Typography>

          <Typography
            sx={{
              color: "#d32f2f",
              fontSize: "0.95rem",
            }}
          >
            Activating this grading period will deactivate the currently active one.
            <br />
            Any grades, records, or transactions tied to the current period may be
            affected by this change.
          </Typography>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleCancelDialog} color="error" variant="outlined">
            Cancel
          </Button>
          <Button
            onClick={handleConfirmActivate}
            variant="contained"
            sx={{ backgroundColor: "green" }}
          >
            Yes, activate
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: "100%" }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ChangeYearGradPer;
