import React, { useState, useEffect, useContext, useRef } from "react";
import { SettingsContext } from "../App";
import axios from "axios";
import {
  Box, Typography, Snackbar, Alert, Button, TextField, Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  Paper,
  MenuItem,
  Select,
  FormControl,
  Switch,
  IconButton,
  InputAdornment,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import CloseIcon from "@mui/icons-material/Close";
import { useNavigate } from "react-router-dom";
import Unauthorized from "../components/Unauthorized";
import LoadingOverlay from "../components/LoadingOverlay";
import API_BASE_URL from "../apiConfig";
import SaveIcon from "@mui/icons-material/Save";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import { getFlatAuditHeaders } from "../utils/auditEvents";
import useAuditMac from "../utils/useAuditMac";

const SchoolYearPanel = () => {
  useAuditMac();
  const settings = useContext(SettingsContext);
  const colors = settings?.colors || {};
  const headerColor = colors.header || "#1976d2";
  const navigate = useNavigate();

  const [titleColor, setTitleColor] = useState("#000000");
  const [borderColor, setBorderColor] = useState("#000000");

  const [userRole, setUserRole] = useState("");
  const [employeeID, setEmployeeID] = useState("");
  const [hasAccess, setHasAccess] = useState(null);
  const [canCreate, setCanCreate] = useState(false);
  const [canEdit, setCanEdit] = useState(false);
  const [canDelete, setCanDelete] = useState(false);
  const [loading, setLoading] = useState(false);

  const pageId = 55;

  // 🔐 Identity verification (password gate) state
  const [authOpen, setAuthOpen] = useState(true);
  const [authPassword, setAuthPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [authPassed, setAuthPassed] = useState(false);
  const [showAuthPassword, setShowAuthPassword] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [lockTimer, setLockTimer] = useState(0);
  const lockIntervalRef = useRef(null);

  const getAuditHeaders = () => ({
    headers: {
      ...getFlatAuditHeaders(),
      "x-employee-id": employeeID || localStorage.getItem("employee_id") || "",
      "x-page-id": pageId,
      "x-audit-actor-id": employeeID || localStorage.getItem("employee_id") || "",
      "x-audit-actor-role": userRole || localStorage.getItem("role") || "registrar",
    },
  });

  const [years, setYears] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [schoolYears, setSchoolYears] = useState([]);
  const [selectedYear, setSelectedYear] = useState("");
  const [selectedSemester, setSelectedSemester] = useState("");
  const [searchQuery, setSearchQuery] = useState(""); // 🔍 Search query

  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });
  const [editID, setEditID] = useState(null); // To track which school year is being edited

  useEffect(() => {
    if (!settings) return;
    if (colors.title) setTitleColor(colors.title);
    if (colors.border) setBorderColor(colors.border);
  }, [settings]);

  useEffect(() => {
    const storedUser = localStorage.getItem("email");
    const storedRole = localStorage.getItem("role");
    const storedID = localStorage.getItem("person_id");
    const storedEmployeeID = localStorage.getItem("employee_id");

    if (storedUser && storedRole && storedID) {
      setUserRole(storedRole);
      setEmployeeID(storedEmployeeID);

      if (storedRole === "registrar") checkAccess(storedEmployeeID);
      else window.location.href = "/login";
    } else {
      window.location.href = "/login";
    }
  }, []);

  const checkAccess = async (employeeID) => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/api/page_access/${employeeID}/${pageId}`);
      const allowed = response.data?.page_privilege === 1;
      setHasAccess(allowed);
      setCanCreate(allowed && Number(response.data?.can_create) === 1);
      setCanEdit(allowed && Number(response.data?.can_edit) === 1);
      setCanDelete(allowed && Number(response.data?.can_delete) === 1);
    } catch {
      setHasAccess(false);
      setCanCreate(false);
      setCanEdit(false);
      setCanDelete(false);
      setSnackbar({ open: true, message: "Failed to check access", severity: "error" });
    } finally {
      setLoading(false);
    }
  };

  // 🔐 Handle password verification submit
  const handleAuthSubmit = async () => {
    if (isLocked) return;
    if (!authPassword) {
      setAuthError("Password is required.");
      return;
    }
    try {
      const personId = localStorage.getItem("person_id");
      const res = await axios.post(`${API_BASE_URL}/api/verify-password`, {
        person_id: personId,
        password: authPassword,
      });

      if (res.data.success) {
        setAuthPassed(true);
        setAuthOpen(false);
        setIsLocked(false);
        setLockTimer(0);
        if (lockIntervalRef.current) clearInterval(lockIntervalRef.current);
      }
    } catch (err) {
      const data = err.response?.data;

      if (data?.locked) {
        // 🔒 Backend says locked — start countdown from remainingSeconds
        setIsLocked(true);
        setLockTimer(data.remainingSeconds);
        setAuthError(data.message);
        setAuthPassword("");

        if (lockIntervalRef.current) clearInterval(lockIntervalRef.current);

        lockIntervalRef.current = setInterval(() => {
          setLockTimer((prev) => {
            if (prev <= 1) {
              clearInterval(lockIntervalRef.current);
              setIsLocked(false);
              setAuthError("");
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      } else {
        // ❌ Wrong password but not locked yet
        setAuthPassword("");
        setAuthError(
          data?.attemptsLeft !== undefined
            ? `❌ Invalid password. ${data.attemptsLeft} attempt(s) remaining.`
            : data?.message || "❌ Invalid password.",
        );
      }
    }
  };

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (lockIntervalRef.current) clearInterval(lockIntervalRef.current);
    };
  }, []);

  // 🔒 Check lock status on mount (handles page reload)
  useEffect(() => {
    const personId = localStorage.getItem("person_id");
    if (!personId) return;

    axios
      .get(`${API_BASE_URL}/api/check-lock-status/${personId}`)
      .then((res) => {
        if (res.data.locked) {
          setIsLocked(true);
          setLockTimer(res.data.remainingSeconds);
          setAuthError(
            `Account locked. Try again in ${Math.ceil(res.data.remainingSeconds / 60)} minute(s).`,
          );

          if (lockIntervalRef.current) clearInterval(lockIntervalRef.current);

          lockIntervalRef.current = setInterval(() => {
            setLockTimer((prev) => {
              if (prev <= 1) {
                clearInterval(lockIntervalRef.current);
                setIsLocked(false);
                setAuthError("");
                return 0;
              }
              return prev - 1;
            });
          }, 1000);
        }
      })
      .catch((err) => console.error("Lock check failed:", err));
  }, []);

  const fetchYears = async () => {
    try { const res = await axios.get(`${API_BASE_URL}/api/year_table`); setYears(res.data); }
    catch { setSnackbar({ open: true, message: "Failed to fetch years", severity: "error" }); }
  };

  const fetchSemesters = async () => {
    try { const res = await axios.get(`${API_BASE_URL}/api/get_semester`); setSemesters(res.data); }
    catch { setSnackbar({ open: true, message: "Failed to fetch semesters", severity: "error" }); }
  };

  const fetchSchoolYears = async () => {
    try { const res = await axios.get(`${API_BASE_URL}/api/school_years`); setSchoolYears(res.data); }
    catch { setSnackbar({ open: true, message: "Failed to fetch school years", severity: "error" }); }
  };

  useEffect(() => {
    fetchYears();
    fetchSemesters();
    fetchSchoolYears();
  }, []);

  const formatYearRange = (year) => {
    const start = parseInt(year.year_description);
    return `${start}-${start + 1}`;
  };

  const [openDialog, setOpenDialog] = useState(false);
  const handleSubmitOrUpdate = async (e) => {
    if (e) e.preventDefault();
    if (editID && !canEdit) {
      setSnackbar({ open: true, message: "You do not have permission to edit school years", severity: "error" });
      return;
    }

    if (!editID && !canCreate) {
      setSnackbar({ open: true, message: "You do not have permission to create school years", severity: "error" });
      return;
    }

    if (!selectedYear || !selectedSemester) {
      setSnackbar({ open: true, message: "Please select both Year and Semester", severity: "warning" });
      return;
    }

    // If editing
    if (editID) {
      try {
        await axios.put(`${API_BASE_URL}/api/edit_school_years/${editID}`, {
          year_id: selectedYear,
          semester_id: selectedSemester,
        }, getAuditHeaders());
        setSnackbar({ open: true, message: "School year updated successfully!", severity: "success" });
        setEditID(null);
        setSelectedYear("");
        setSelectedSemester("");
        fetchSchoolYears();
      } catch {
        setSnackbar({ open: true, message: "Failed to update school year", severity: "error" });
      }
      return;
    }

    // Check duplicate
    const duplicate = schoolYears.find(
      (sy) => sy.year_id === selectedYear && sy.semester_id === selectedSemester
    );
    if (duplicate) {
      setSnackbar({ open: true, message: "This school year already exists", severity: "error" });
      return;
    }

    // Create new
    try {
      await axios.post(`${API_BASE_URL}/api/school_years`, {
        year_id: selectedYear,
        semester_id: selectedSemester,
        activator: 0,
      }, getAuditHeaders());
      setSelectedYear("");
      setSelectedSemester("");
      fetchSchoolYears();
      setSnackbar({ open: true, message: "School year added successfully!", severity: "success" });
    } catch {
      setSnackbar({ open: true, message: "Failed to save school year", severity: "error" });
    }
  };

  const handleEdit = (sy) => {
    if (!canEdit) {
      setSnackbar({ open: true, message: "You do not have permission to edit school years", severity: "error" });
      return;
    }

    setSelectedYear(sy.year_id);
    setSelectedSemester(sy.semester_id);
    setEditID(sy.school_year_id || sy.id);
  };

  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [schoolYearToDelete, setSchoolYearToDelete] = useState(null);
  const [openActivateDialog, setOpenActivateDialog] = useState(false);
  const [schoolYearToActivate, setSchoolYearToActivate] = useState(null);
  const [isActivating, setIsActivating] = useState(false);
  const [activatePassword, setActivatePassword] = useState("");
  const [activatePasswordError, setActivatePasswordError] = useState("");
  const [showActivatePassword, setShowActivatePassword] = useState(false);
  const [activateLocked, setActivateLocked] = useState(false);
  const [activateLockTimer, setActivateLockTimer] = useState(0);
  const activateLockIntervalRef = useRef(null);

  useEffect(() => {
    return () => {
      if (activateLockIntervalRef.current) clearInterval(activateLockIntervalRef.current);
    };
  }, []);

  const startActivateLockCountdown = (remainingSeconds, message) => {
    setActivateLocked(true);
    setActivateLockTimer(remainingSeconds);
    setActivatePasswordError(message);

    if (activateLockIntervalRef.current) clearInterval(activateLockIntervalRef.current);

    activateLockIntervalRef.current = setInterval(() => {
      setActivateLockTimer((prev) => {
        if (prev <= 1) {
          clearInterval(activateLockIntervalRef.current);
          setActivateLocked(false);
          setActivatePasswordError("");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const resetActivateDialogState = () => {
    setOpenActivateDialog(false);
    setSchoolYearToActivate(null);
    setActivatePassword("");
    setActivatePasswordError("");
    setShowActivatePassword(false);
  };

  const checkActivateLockStatus = async () => {
    const personId = localStorage.getItem("person_id");
    if (!personId) return;

    try {
      const res = await axios.get(`${API_BASE_URL}/api/check-lock-status/${personId}`);
      if (res.data.locked) {
        startActivateLockCountdown(
          res.data.remainingSeconds,
          `Account locked. Try again in ${Math.ceil(res.data.remainingSeconds / 60)} minute(s).`,
        );
      }
    } catch (err) {
      console.error("Lock check failed:", err);
    }
  };

  const handleConfirmDelete = async () => {
    if (!schoolYearToDelete) return;
    if (!canDelete) {
      setSnackbar({ open: true, message: "You do not have permission to delete school years", severity: "error" });
      return;
    }

    try {
      await axios.delete(
        `${API_BASE_URL}/api/school_years/${schoolYearToDelete.school_year_id || schoolYearToDelete.id}`,
        getAuditHeaders()
      );
      setSnackbar({
        open: true,
        message: "School year deleted successfully!",
        severity: "success",
      });
      fetchSchoolYears();
    } catch {
      setSnackbar({
        open: true,
        message: "Failed to delete school year",
        severity: "error",
      });
    } finally {
      setOpenDeleteDialog(false);
      setSchoolYearToDelete(null);
    }
  };


  // Toggle school year active status
  const applyToggleActivator = async (sy, updatedStatus) => {
    const schoolYearId = sy.school_year_id || sy.id;
    const previousSchoolYears = schoolYears;

    setSchoolYears((prev) =>
      prev.map((item) => {
        const itemId = item.school_year_id || item.id;
        if (updatedStatus === 1) {
          return { ...item, astatus: itemId === schoolYearId ? 1 : 0 };
        }
        return itemId === schoolYearId ? { ...item, astatus: 0 } : item;
      })
    );

    setSnackbar({
      open: true,
      message: `School year is now ${updatedStatus === 1 ? "Active" : "Inactive"}`,
      severity: "info",
    });

    try {
      const response = await axios.put(
        `${API_BASE_URL}/api/school_years/${schoolYearId}`,
        { activator: updatedStatus },
        getAuditHeaders()
      );

      const generationSummary = response.data?.studentStatusGeneration;
      const gradingPeriodReset = response.data?.gradingPeriodReset;
      const activationMessage =
        updatedStatus === 1
          ? getActivationSuccessMessage(generationSummary)
          : "School year deactivated!";

      setSnackbar({
        open: true,
        message:
          gradingPeriodReset?.reset
            ? `${activationMessage} Grading period was reset to Midterm.`
            : activationMessage,
        severity: "success",
      });
      fetchSchoolYears();
    } catch {
      setSchoolYears(previousSchoolYears);
      setSnackbar({ open: true, message: "Failed to update school year", severity: "error" });
    }
  };

  const handleToggleActivator = (sy) => {
    if (!canEdit) {
      setSnackbar({ open: true, message: "You do not have permission to edit school years", severity: "error" });
      return;
    }

    const currentStatus = Number(sy.astatus) === 1 ? 1 : 0;
    const updatedStatus = currentStatus === 1 ? 0 : 1;

    if (updatedStatus === 1) {
      setSchoolYearToActivate(sy);
      setActivatePassword("");
      setActivatePasswordError("");
      setShowActivatePassword(false);
      setActivateLocked(false);
      setActivateLockTimer(0);
      setOpenActivateDialog(true);
      checkActivateLockStatus();
      return;
    }

    applyToggleActivator(sy, updatedStatus);
  };

  const handleConfirmActivate = async () => {
    if (!schoolYearToActivate) return;
    if (!canEdit) {
      setSnackbar({ open: true, message: "You do not have permission to edit school years", severity: "error" });
      return;
    }
    if (activateLocked) return;

    if (!activatePassword) {
      setActivatePasswordError("Password is required.");
      return;
    }

    setIsActivating(true);
    try {
      const personId = localStorage.getItem("person_id");
      const verifyRes = await axios.post(`${API_BASE_URL}/api/verify-password`, {
        person_id: personId,
        password: activatePassword,
      });

      if (!verifyRes.data.success) {
        setActivatePassword("");
        setActivatePasswordError("Invalid password.");
        return;
      }

      await applyToggleActivator(schoolYearToActivate, 1);
      resetActivateDialogState();
    } catch (err) {
      const data = err.response?.data;

      if (data?.locked) {
        setActivatePassword("");
        startActivateLockCountdown(data.remainingSeconds, data.message);
        return;
      }

      setActivatePassword("");
      setActivatePasswordError(
        data?.attemptsLeft !== undefined
          ? `Invalid password. ${data.attemptsLeft} attempt(s) remaining.`
          : data?.message || "Invalid password.",
      );
    } finally {
      setIsActivating(false);
    }
  };

  const getSchoolYearLabel = (sy) => {
    if (!sy) return "";
    return `${sy.year_description}-${parseInt(sy.year_description, 10) + 1}`;
  };

  const getActivationSuccessMessage = (generationSummary) => {
    const generatedRows = generationSummary?.generatedRows ?? 0;

    if (generationSummary?.generationAllowed === false) {
      const previousYear = generationSummary.previousYearDescription;
      const expectedYear = generationSummary.expectedNextYearDescription;

      if (generationSummary.skippedReason === "TARGET_YEAR_BEFORE_PREVIOUS_ACTIVE") {
        return previousYear
          ? `School year activated. No student status rows were generated because the selected school year is below ${previousYear}.`
          : "School year activated. No student status rows were generated because the selected school year is before the previously active term.";
      }
      if (generationSummary.skippedReason === "TARGET_YEAR_SKIPPED_AHEAD") {
        return previousYear
          ? `School year activated. No student status rows were generated. You cannot skip ahead from school year ${previousYear} to ${generationSummary.targetYearDescription}.`
          : "School year activated. No student status rows were generated because the selected school year skips one or more years ahead.";
      }
      if (generationSummary.skippedReason === "TARGET_NOT_IMMEDIATE_NEXT_TERM") {
        return expectedYear
          ? `School year activated. No student status rows were generated. Only the immediate next term after school year ${previousYear} can generate records (expected: ${expectedYear}).`
          : "School year activated. No student status rows were generated because the selected term is not the immediate next school year.";
      }
      if (generationSummary.skippedReason === "NO_NEXT_SCHOOL_YEAR_DEFINED") {
        return "School year activated. No student status rows were generated because no next school year is defined after the previously active term.";
      }
      return "School year activated. Student status generation was skipped.";
    }

    return `School year activated! Generated ${generatedRows} student status row${generatedRows === 1 ? "" : "s"}.`;
  };

  const filteredSchoolYears = schoolYears
    .filter(sy =>
      String(sy.year_description).includes(searchQuery) ||
      sy.semester_description.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => Number(a.year_description) - Number(b.year_description)); // ← add this

  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 20;

  const totalPages = Math.ceil(filteredSchoolYears.length / rowsPerPage);

  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;

  const paginatedSchoolYears = filteredSchoolYears.slice(startIndex, endIndex);
  const showCreateActions = canCreate;
  const showActionColumn = canEdit || canDelete;

  if (loading || hasAccess === null) return <LoadingOverlay open={loading} message="Loading..." />;
  if (!hasAccess) return <Unauthorized />;

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

  // 🔐 Require password verification before showing the panel
  if (!authPassed) {
    const minutes = Math.floor(lockTimer / 60);
    const seconds = lockTimer % 60;

    return (
      <Dialog
        open={authOpen}
        onClose={(_, reason) => {
          if (reason === "backdropClick" || isLocked) return;
          setAuthOpen(false);
          navigate("/registrar_dashboard");
        }}
        PaperProps={{
          sx: {
            borderRadius: "16px",
            overflow: "hidden",
            minWidth: 420,
            boxShadow: "0 24px 60px rgba(0,0,0,0.25)",
          },
        }}
      >
        <DialogTitle
          sx={{
            bgcolor: isLocked ? "#7a0000" : headerColor,
            color: "white",
            display: "flex",
            justifyContent: "space-between",
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
                fontSize: 20,
              }}
            >
              {isLocked ? "🔒" : "🔐"}
            </Box>
            <Box>
              <Typography
                fontWeight="bold"
                fontSize={16}
                color="white"
                lineHeight={1.2}
              >
                {isLocked ? "Access Locked" : "Identity Verification"}
              </Typography>
              <Typography
                fontSize={12}
                color="rgba(255,255,255,0.8)"
                lineHeight={1.2}
              >
                {isLocked
                  ? "Too many failed attempts"
                  : "Confirm your credentials to access the School Year Panel"}
              </Typography>
            </Box>
          </Box>
          {!isLocked && (
            <IconButton
              onClick={() => {
                setAuthOpen(false);
                navigate("/registrar_dashboard");
              }}
              sx={{
                color: "white",
                border: "2px solid rgba(255,255,255,0.6)",
                borderRadius: "50%",
                width: 38,
                height: 38,
                padding: 0,
                "&:hover": {
                  backgroundColor: "rgba(255,255,255,0.2)",
                  border: "2px solid white",
                },
              }}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          )}
        </DialogTitle>

        <DialogContent sx={{ px: 3, pt: 2.5, pb: 1 }}>
          {isLocked ? (
            <Box textAlign="center" py={2}>
              <Box
                sx={{
                  width: 90,
                  height: 90,
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, #fff0f0, #ffe0e0)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 20px",
                  border: "3px solid #f44336",
                }}
              >
                <Typography fontSize={38}>🔒</Typography>
              </Box>
              <Typography
                fontWeight="bold"
                fontSize={18}
                color="#c62828"
                mb={1}
              >
                Account Temporarily Locked
              </Typography>
              <Typography fontSize={13} color="#555" mb={3}>
                You've exceeded the maximum number of password attempts. Please
                wait before trying again.
              </Typography>
              <Box
                sx={{
                  background: "linear-gradient(135deg, #fff3e0, #ffe0b2)",
                  borderRadius: "12px",
                  border: "1px solid #ffb74d",
                  py: 2.5,
                  px: 3,
                  mb: 2,
                }}
              >
                <Typography
                  fontSize={12}
                  color="#e65100"
                  fontWeight="bold"
                  mb={0.5}
                >
                  TIME REMAINING
                </Typography>
                <Typography
                  fontSize={40}
                  fontWeight="bold"
                  color="#bf360c"
                  fontFamily="monospace"
                  letterSpacing={4}
                >
                  {String(minutes).padStart(2, "0")}:
                  {String(seconds).padStart(2, "0")}
                </Typography>
                <Typography fontSize={11} color="#e65100" mt={0.5}>
                  minutes : seconds
                </Typography>
              </Box>
            </Box>
          ) : (
            <Box>
              <Typography
                fontSize={13}
                fontWeight="bold"
                color="#333"
                mb={0.5}
                mt={2}
              >
                Enter your account password
              </Typography>

              <Typography
                fontSize={12}
                color="#666"
                mb={1.5}
              >
                You must be logged in to your account to continue. For security purposes,
                you have a maximum of <strong>3 password attempts</strong>. After 3
                unsuccessful attempts, your account will be temporarily locked for
                <strong> 3 minutes</strong>. Please make sure you enter the correct password.
              </Typography>
              <TextField
                type={showAuthPassword ? "text" : "password"}
                fullWidth
                size="small"
                placeholder="••••••••"
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                autoComplete="new-password"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAuthSubmit();
                }}
                disabled={isLocked}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: "10px",
                    fontSize: 14,
                    "&.Mui-focused fieldset": {
                      borderColor: headerColor,
                      borderWidth: 2,
                    },
                  },
                }}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowAuthPassword(!showAuthPassword)}
                        size="small"
                        edge="end"
                      >
                        {showAuthPassword ? (
                          <VisibilityOff fontSize="small" />
                        ) : (
                          <Visibility fontSize="small" />
                        )}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />

              {authError && !isLocked && (
                <Box
                  sx={{
                    mt: 1.5,
                    p: 1.25,
                    backgroundColor: "#ffebee",
                    borderRadius: "8px",
                    border: "1px solid #ef9a9a",
                  }}
                >
                  <Typography fontSize={12.5} color="#c62828">
                    {authError}
                  </Typography>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 3, pt: 1.5, gap: 1 }}>
          {!isLocked && (
            <>
              <Button
                onClick={() => {
                  setAuthOpen(false);
                  navigate("/registrar_dashboard");
                }}
                color="error"
              variant="outlined"
              > 
                Cancel
              </Button>
              <Button
                variant="contained"
                onClick={handleAuthSubmit}
                disabled={isLocked}
                sx={{
                  borderRadius: "10px",
                  textTransform: "none",
                  px: 3,
                  fontWeight: "bold",
                  backgroundColor: headerColor,
                  "&:hover": { opacity: 0.9 },
                }}
              >
                Verify & Continue
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>
    );
  }

  return (
    <Box sx={{ height: "calc(100vh - 150px)", overflowY: "auto", padding: 2, mt: 1 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', mb: 2 }}>
        <Typography variant="h4" sx={{ fontWeight: 'bold', color: titleColor, fontSize: '36px' }}>
          SCHOOL YEAR PANEL
        </Typography>

        {/* Search Bar */}
        <TextField
          variant="outlined"
          placeholder="Search School Year..."
          size="small"
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setCurrentPage(1);
          }}
          sx={{
            width: 450,
            backgroundColor: "#fff",
            borderRadius: 1,
            "& .MuiOutlinedInput-root": {
              borderRadius: "10px",
            },
          }}
          InputProps={{
            startAdornment: <SearchIcon sx={{ mr: 1, color: "gray" }} />,
          }}
        />
      </Box>

      <hr style={{ border: "1px solid #ccc", width: "100%" }} />
      <br />

      <TableContainer component={Paper} sx={{ width: '100%', }}>
        <Table size="small">
          <TableHead sx={{ backgroundColor: '#6D2323', color: "white" }}>
            <TableRow>
              <TableCell colSpan={10} sx={{ border: `1px solid ${borderColor}`, py: 0.5, backgroundColor: headerColor, color: "white" }}>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Typography fontSize="14px" fontWeight="bold">
                    Total School Years Records: {filteredSchoolYears.length}
                  </Typography>


                  {/* Right: Pagination Controls */}
                  <Box display="flex" alignItems="center" gap={1}>
                    {/* First & Prev */}
                    <Button
                      onClick={() => setCurrentPage(1)}
                      disabled={currentPage === 1}
                      variant="outlined"
                      size="small"
                      sx={{
                        minWidth: 80,
                        color: "white",
                        borderColor: "white",
                        backgroundColor: "transparent",
                        '&:hover': {
                          borderColor: 'white',
                          backgroundColor: 'rgba(255,255,255,0.1)',
                        },
                        '&.Mui-disabled': {
                          color: "white",
                          borderColor: "white",
                          backgroundColor: "transparent",
                          opacity: 1,
                        }
                      }}
                    >
                      First
                    </Button>
                    <Button
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      variant="outlined"
                      size="small"
                      sx={{
                        minWidth: 80,
                        color: "white",
                        borderColor: "white",
                        backgroundColor: "transparent",
                        '&:hover': {
                          borderColor: 'white',
                          backgroundColor: 'rgba(255,255,255,0.1)',
                        },
                        '&.Mui-disabled': {
                          color: "white",
                          borderColor: "white",
                          backgroundColor: "transparent",
                          opacity: 1,
                        }
                      }}
                    >
                      Prev
                    </Button>


                    {/* Page Dropdown */}
                    <FormControl size="small" sx={{ minWidth: 80 }}>
                      <Select
                        value={currentPage}
                        onChange={(e) => setCurrentPage(Number(e.target.value))}
                        displayEmpty
                        sx={{
                          fontSize: '12px',
                          height: 36,
                          color: 'white',
                          border: '1px solid white',
                          backgroundColor: 'transparent',
                          '.MuiOutlinedInput-notchedOutline': {
                            borderColor: 'white',
                          },
                          '&:hover .MuiOutlinedInput-notchedOutline': {
                            borderColor: 'white',
                          },
                          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                            borderColor: 'white',
                          },
                          '& svg': {
                            color: 'white', // dropdown arrow icon color
                          }
                        }}
                        MenuProps={{
                          PaperProps: {
                            sx: {
                              maxHeight: 200,
                              backgroundColor: '#fff', // dropdown background
                            }
                          }
                        }}
                      >
                        {Array.from({ length: totalPages }, (_, i) => (
                          <MenuItem key={i + 1} value={i + 1}>
                            Page {i + 1}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>

                    <Typography fontSize="11px" color="white">
                      of {totalPages} page{totalPages > 1 ? 's' : ''}
                    </Typography>


                    {/* Next & Last */}
                    <Button
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      variant="outlined"
                      size="small"
                      sx={{
                        minWidth: 80,
                        color: "white",
                        borderColor: "white",
                        backgroundColor: "transparent",
                        '&:hover': {
                          borderColor: 'white',
                          backgroundColor: 'rgba(255,255,255,0.1)',
                        },
                        '&.Mui-disabled': {
                          color: "white",
                          borderColor: "white",
                          backgroundColor: "transparent",
                          opacity: 1,
                        }
                      }}
                    >
                      Next
                    </Button>

                    <Button
                      onClick={() => setCurrentPage(totalPages)}
                      disabled={currentPage === totalPages}
                      variant="outlined"
                      size="small"
                      sx={{
                        minWidth: 80,
                        color: "white",
                        borderColor: "white",
                        backgroundColor: "transparent",
                        '&:hover': {
                          borderColor: 'white',
                          backgroundColor: 'rgba(255,255,255,0.1)',
                        },
                        '&.Mui-disabled': {
                          color: "white",
                          borderColor: "white",
                          backgroundColor: "transparent",
                          opacity: 1,
                        }
                      }}
                    >
                      Last
                    </Button>

                    {showCreateActions && (
                      <Button
                        variant="contained"
                        onClick={() => {
                          setEditID(null); // reset edit
                          setSelectedYear("");
                          setSelectedSemester("");
                          setOpenDialog(true);
                        }}
                        sx={{
                          backgroundColor: "#1976d2", // ✅ Blue
                          color: "#fff",
                          fontWeight: "bold",
                          borderRadius: "8px",
                          width: "250px",
                          textTransform: "none",
                          px: 2,
                          mr: "15px",
                          '&:hover': {
                            backgroundColor: "#1565c0" // darker blue hover
                          }
                        }}
                      >
                        + Add School Year
                      </Button>
                    )}
                  </Box>
                </Box>
              </TableCell>
            </TableRow>
          </TableHead>
        </Table>
      </TableContainer>


      <Box sx={{ overflowY: "auto" }}>
        <table className="w-full text-sm" style={{ borderCollapse: "collapse", border: `1px solid ${borderColor}` }}>
          <thead>
            <tr style={{ backgroundColor: "#F5f5f5", color: "#000" }}>
              <th className="p-2 text-center" style={{ border: `1px solid ${borderColor}` }}>ID</th>
              <th className="p-2 text-center" style={{ border: `1px solid ${borderColor}` }}>Year Level</th>
              <th className="p-2 text-center" style={{ border: `1px solid ${borderColor}` }}>Semester</th>
              <th className="p-2 text-center" style={{ border: `1px solid ${borderColor}` }}>Active</th>
              {showActionColumn && (
                <th className="p-2 text-center" style={{ border: `1px solid ${borderColor}` }}>Actions</th>
              )}
            </tr>
          </thead>
          <tbody>
            {filteredSchoolYears.length > 0 ? paginatedSchoolYears.map((sy, index) => (
              <tr key={index} style={{
                backgroundColor: index % 2 === 0 ? "#ffffff" : "lightgray",
              }}>
                <td className="p-2 text-center" style={{ border: `1px solid ${borderColor}` }}>{startIndex + index + 1}</td>
                <td className="p-2 text-center" style={{ border: `1px solid ${borderColor}` }}>{`${sy.year_description}-${parseInt(sy.year_description) + 1}`}</td>
                <td className="p-2 text-center" style={{ border: `1px solid ${borderColor}` }}>{sy.semester_description}</td>
                <td className="p-2 text-center" style={{ border: `1px solid ${borderColor}` }}>
                  <Switch
                    checked={Number(sy.astatus) === 1}
                    onChange={() => handleToggleActivator(sy)}
                    disabled={!canEdit}
                    color="success"
                  />
                </td>
                {showActionColumn && (
                  <td
                    className="p-2 text-center"
                    style={{ border: `1px solid ${borderColor}` }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        gap: "10px", // space between buttons
                      }}
                    >
                      {canEdit && (
                        <Button
                          size="small"
                          sx={{
                            backgroundColor: "green",
                            color: "white",
                            borderRadius: "5px",
                            padding: "8px 14px",
                            width: "100px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "5px",
                            cursor: "pointer",
                          }}
                          onClick={() => {
                            handleEdit(sy);
                            setOpenDialog(true);
                          }}
                        >
                          <EditIcon fontSize="small" /> Edit
                        </Button>
                      )}

                      {canDelete && (
                        <Button
                          size="small"
                          sx={{
                            backgroundColor: "#9E0000",
                            color: "white",
                            borderRadius: "5px",
                            padding: "8px 14px",
                            width: "100px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "5px",
                            cursor: "pointer",
                          }}
                          onClick={() => {
                            setSchoolYearToDelete(sy);
                            setOpenDeleteDialog(true);
                          }}
                        >
                          <DeleteIcon fontSize="small" /> Delete
                        </Button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            )) : (
              <tr><td colSpan={showActionColumn ? 5 : 4} style={{ padding: 15, color: "#777" }}>No school years found.</td></tr>
            )}
          </tbody>
        </table>
      </Box>

      <TableContainer component={Paper} sx={{ width: '100%', }}>
        <Table size="small">
          <TableHead sx={{ backgroundColor: '#6D2323', color: "white" }}>
            <TableRow>
              <TableCell colSpan={10} sx={{ border: `1px solid ${borderColor}`, py: 0.5, backgroundColor: headerColor, color: "white" }}>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Typography fontSize="14px" fontWeight="bold" color="white">
                    Total School Years Records:  {filteredSchoolYears.length}
                  </Typography>


                  {/* Right: Pagination Controls */}
                  <Box display="flex" alignItems="center" gap={1}>
                    {/* First & Prev */}
                    <Button
                      onClick={() => setCurrentPage(1)}
                      disabled={currentPage === 1}
                      variant="outlined"
                      size="small"
                      sx={{
                        minWidth: 80,
                        color: "white",
                        borderColor: "white",
                        backgroundColor: "transparent",
                        '&:hover': {
                          borderColor: 'white',
                          backgroundColor: 'rgba(255,255,255,0.1)',
                        },
                        '&.Mui-disabled': {
                          color: "white",
                          borderColor: "white",
                          backgroundColor: "transparent",
                          opacity: 1,
                        }
                      }}
                    >
                      First
                    </Button>

                    <Button
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      variant="outlined"
                      size="small"
                      sx={{
                        minWidth: 80,
                        color: "white",
                        borderColor: "white",
                        backgroundColor: "transparent",
                        '&:hover': {
                          borderColor: 'white',
                          backgroundColor: 'rgba(255,255,255,0.1)',
                        },
                        '&.Mui-disabled': {
                          color: "white",
                          borderColor: "white",
                          backgroundColor: "transparent",
                          opacity: 1,
                        }
                      }}
                    >
                      Prev
                    </Button>


                    {/* Page Dropdown */}
                    <FormControl size="small" sx={{ minWidth: 80 }}>
                      <Select
                        value={currentPage}
                        onChange={(e) => setCurrentPage(Number(e.target.value))}
                        displayEmpty
                        sx={{
                          fontSize: '12px',
                          height: 36,
                          color: 'white',
                          border: '1px solid white',
                          backgroundColor: 'transparent',
                          '.MuiOutlinedInput-notchedOutline': {
                            borderColor: 'white',
                          },
                          '&:hover .MuiOutlinedInput-notchedOutline': {
                            borderColor: 'white',
                          },
                          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                            borderColor: 'white',
                          },
                          '& svg': {
                            color: 'white', // dropdown arrow icon color
                          }
                        }}
                        MenuProps={{
                          PaperProps: {
                            sx: {
                              maxHeight: 200,
                              backgroundColor: '#fff', // dropdown background
                            }
                          }
                        }}
                      >
                        {Array.from({ length: totalPages }, (_, i) => (
                          <MenuItem key={i + 1} value={i + 1}>
                            Page {i + 1}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>

                    <Typography fontSize="11px" color="white">
                      of {totalPages} page{totalPages > 1 ? 's' : ''}
                    </Typography>


                    {/* Next & Last */}
                    <Button
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      variant="outlined"
                      size="small"
                      sx={{
                        minWidth: 80,
                        color: "white",
                        borderColor: "white",
                        backgroundColor: "transparent",
                        '&:hover': {
                          borderColor: 'white',
                          backgroundColor: 'rgba(255,255,255,0.1)',
                        },
                        '&.Mui-disabled': {
                          color: "white",
                          borderColor: "white",
                          backgroundColor: "transparent",
                          opacity: 1,
                        }
                      }}
                    >
                      Next
                    </Button>

                    <Button
                      onClick={() => setCurrentPage(totalPages)}
                      disabled={currentPage === totalPages}
                      variant="outlined"
                      size="small"
                      sx={{
                        minWidth: 80,
                        color: "white",
                        borderColor: "white",
                        backgroundColor: "transparent",
                        '&:hover': {
                          borderColor: 'white',
                          backgroundColor: 'rgba(255,255,255,0.1)',
                        },
                        '&.Mui-disabled': {
                          color: "white",
                          borderColor: "white",
                          backgroundColor: "transparent",
                          opacity: 1,
                        }
                      }}
                    >
                      Last
                    </Button>
                  </Box>
                </Box>
              </TableCell>
            </TableRow>
          </TableHead>
        </Table>
      </TableContainer>

      <br />
      <br />



      {/* Table */}




      <Dialog
        open={openActivateDialog}
        onClose={(_, reason) => {
          if (isActivating || activateLocked) return;
          if (reason === "backdropClick") return;
          resetActivateDialogState();
        }}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: "16px",
            overflow: "hidden",
            boxShadow: "0 24px 60px rgba(0,0,0,0.25)",
          },
        }}
      >
        <DialogTitle
          sx={{
            bgcolor: activateLocked ? "#7a0000" : headerColor,
            color: "#fff",
            fontWeight: 700,
            fontSize: "1.1rem",
            py: 2,
            px: 3,
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
                fontSize: 20,
              }}
            >
              {activateLocked ? "🔒" : "🔐"}
            </Box>
            <Box>
              <Typography fontWeight="bold" fontSize={16} color="white" lineHeight={1.2}>
                {activateLocked ? "Access Locked" : "Activate School Year"}
              </Typography>
              <Typography fontSize={12} color="rgba(255,255,255,0.8)" lineHeight={1.2}>
                {activateLocked
                  ? "Too many failed attempts"
                  : "Confirm your credentials to continue"}
              </Typography>
            </Box>
          </Box>
        </DialogTitle>

        <DialogContent sx={{ p: 3, mt: 1 }}>
          {activateLocked ? (
            <Box textAlign="center" py={2}>
              <Typography fontWeight="bold" fontSize={18} color="#c62828" mb={1}>
                Account Temporarily Locked
              </Typography>
              <Typography fontSize={13} color="#555" mb={2}>
                {activatePasswordError}
              </Typography>
              <Typography
                fontSize={32}
                fontWeight="bold"
                color="#bf360c"
                fontFamily="monospace"
                letterSpacing={3}
              >
                {String(Math.floor(activateLockTimer / 60)).padStart(2, "0")}:
                {String(activateLockTimer % 60).padStart(2, "0")}
              </Typography>
            </Box>
          ) : (
            <>
              <DialogContentText sx={{ color: "#1a1a1a", mb: 2 }}>
                Are you sure you want to activate the school year{" "}
                <strong>{getSchoolYearLabel(schoolYearToActivate)}</strong>{" "}
                (<strong>{schoolYearToActivate?.semester_description}</strong>)?
              </DialogContentText>

              <DialogContentText sx={{ color: "#E65100", fontSize: "0.95rem", mb: 2.5 }}>
                Activating this school year will deactivate all other school years.
                All modules that filter by active school year — including Schedules,
                Subject/Curriculum Tagging, and Student Tagging — will switch to this
                new active term. Any subjects, schedules, or students tagged only
                under the previous school year will no longer appear until they are
                re-tagged under this new active school year.
                <br />
                <br />
                Student status records are generated only for the immediate next term after
                the currently active school year. If the active year is 2025, turning on
                years below 2025 or years 2027 and above will not generate new student
                status rows.
              </DialogContentText>

              <Typography
                fontSize={12}
                color="#666"
                mb={1.5}
              >
                To continue, verify your identity using your account password. You have a
                maximum of <strong>3 password attempts</strong>. After 3 incorrect attempts,
                your account will be temporarily locked for <strong>3 minutes</strong>.
                Please make sure your password is correct before submitting.
              </Typography>

              <Typography
                fontSize={13}
                fontWeight="bold"
                color="#333"
                mb={0.75}
              >
                Enter your account password
              </Typography>
              <TextField
                type={showActivatePassword ? "text" : "password"}
                fullWidth
                size="small"
                placeholder="••••••••"
                value={activatePassword}
                onChange={(e) => setActivatePassword(e.target.value)}
                autoComplete="current-password"
                disabled={isActivating}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleConfirmActivate();
                }}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: "10px",
                    fontSize: 14,
                    "&.Mui-focused fieldset": {
                      borderColor: headerColor,
                      borderWidth: 2,
                    },
                  },
                }}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowActivatePassword(!showActivatePassword)}
                        size="small"
                        edge="end"
                      >
                        {showActivatePassword ? (
                          <VisibilityOff fontSize="small" />
                        ) : (
                          <Visibility fontSize="small" />
                        )}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />

              {activatePasswordError && (
                <Box
                  sx={{
                    mt: 1.5,
                    p: 1.25,
                    backgroundColor: "#ffebee",
                    borderRadius: "8px",
                    border: "1px solid #ef9a9a",
                  }}
                >
                  <Typography fontSize={12.5} color="#c62828">
                    {activatePasswordError}
                  </Typography>
                </Box>
              )}
            </>
          )}
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2.5, pt: 0 }}>
          {!activateLocked && (
            <>
              <Button
                   color="error"
              variant="outlined"
                onClick={resetActivateDialogState}
                disabled={isActivating}
              >
                Cancel
              </Button>
              <Button
                variant="contained"
                color="primary"
                onClick={handleConfirmActivate}
                disabled={isActivating}
                sx={{
                  borderRadius: "10px",
                  textTransform: "none",
                  px: 3,
                  fontWeight: "bold",
                }}
              >
                {isActivating ? "Activating..." : "Yes, Activate"}
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>

      <Dialog
        open={openDeleteDialog}
        onClose={() => { setOpenDeleteDialog(false); setSchoolYearToDelete(null); }}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle
          sx={{
            background: colors.header || "#9E0000",
            color: "#fff",
            fontWeight: 700,
            fontSize: "1.2rem",
            py: 2,
          }}
        >
          Delete School Year
        </DialogTitle>

        <DialogContent sx={{ p: 3, mt: 2 }}>
          <Typography sx={{ mb: 2 }}>
            Are you sure you want to delete the school year{" "}
            <strong>
              {schoolYearToDelete
                ? `${schoolYearToDelete.year_description}-${parseInt(schoolYearToDelete.year_description) + 1}`
                : ""}
            </strong>{" "}
            (<strong>{schoolYearToDelete?.semester_description}</strong>)?
          </Typography>

          <Typography sx={{ color: "#d32f2f", fontSize: "0.95rem" }}>
            Deleting this school year will permanently remove it from the system.
            <br />
            All related semesters, schedules, and academic records tied to this
            school year may be affected.
          </Typography>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
          color="error"
              variant="outlined"
            onClick={() => { setOpenDeleteDialog(false); setSchoolYearToDelete(null); }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleConfirmDelete}
          >
            Yes, Delete
          </Button>
        </DialogActions>
      </Dialog>


      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}>
          {snackbar.message}
        </Alert>
      </Snackbar>

      <Dialog
        open={openDialog}
        onClose={() => {
          setOpenDialog(false);
          setEditID(null);
        }}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            overflow: "hidden",
            boxShadow: 6
          }
        }}
      >
        {/* ===== HEADER ===== */}
        <DialogTitle
          sx={{
            background: headerColor,
            color: "#fff",
            fontWeight: 700,
            fontSize: "1.1rem",
            py: 2
          }}
        >
          {editID ? "Edit School Year" : "Add School Year"}
        </DialogTitle>

        {/* ===== CONTENT ===== */}
        <DialogContent sx={{ p: 3 }}>
          <Box display="flex" flexDirection="column" gap={3}>

            {/* YEAR */}
            <Box>
              <Typography fontWeight="bold" mb={1} mt={2}>
                School Year
              </Typography>

              <FormControl fullWidth size="small">
                <Select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  displayEmpty
                  sx={{
                    borderRadius: "8px"
                  }}
                >
                  <MenuItem value="">
                    -- Select School Year --
                  </MenuItem>

                  {[...years]
                    .sort((a, b) => Number(a.year_description) - Number(b.year_description))
                    .map((year) => (
                      <MenuItem
                        key={year.year_id}
                        value={year.year_id}
                      >
                        {formatYearRange(year)}
                      </MenuItem>
                    ))}
                </Select>
              </FormControl>
            </Box>

            {/* SEMESTER */}
            <Box>
              <Typography fontWeight="bold" mb={1}>
                Semester
              </Typography>

              <FormControl fullWidth size="small">
                <Select
                  value={selectedSemester}
                  onChange={(e) => setSelectedSemester(e.target.value)}
                  displayEmpty
                  sx={{
                    borderRadius: "8px"
                  }}
                >
                  <MenuItem value="">
                    -- Select Semester --
                  </MenuItem>

                  {semesters.map((semester) => (
                    <MenuItem
                      key={semester.semester_id}
                      value={semester.semester_id}
                    >
                      {semester.semester_description}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>

          </Box>
        </DialogContent>

        {/* ===== ACTIONS ===== */}
        <DialogActions
          sx={{
            px: 3,
            py: 2,
            borderTop: "1px solid #e0e0e0"
          }}
        >
          <Button
            onClick={() => {
              setOpenDialog(false);
              setEditID(null);
            }}
            color="error"
            variant="outlined"
            sx={{
              textTransform: "none",
              fontWeight: 600
            }}
          >
            Cancel
          </Button>

          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={(e) => {
              handleSubmitOrUpdate(e);
              setOpenDialog(false);

            }}
            sx={{
              px: 4,
              fontWeight: 600,
              textTransform: "none",
            }}
          >
            {editID ? "Update" : "Save"}
          </Button>
        </DialogActions>
      </Dialog>

    </Box>
  );
};

export default SchoolYearPanel;
