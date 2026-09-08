import React, { useState, useEffect, useContext, useRef } from "react";
import { SettingsContext } from "../App";
import EaristLogo from "../assets/EaristLogo.png";
import axios from "axios";
import API_BASE_URL from "../apiConfig";

import {
  Box,
  Typography,
  Card,
  CardContent,
  Switch,
  TextField,
  Button,
  Grid,
  Snackbar,
  Alert,
  Stack,
  Divider,
  Chip,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  MenuItem,
} from "@mui/material";

import BusinessIcon from "@mui/icons-material/Business";
import SaveIcon from "@mui/icons-material/Save";
import EventIcon from "@mui/icons-material/Event";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import Unauthorized from "../components/Unauthorized";
import LoadingOverlay from "../components/LoadingOverlay";
import { getFlatAuditHeaders } from "../utils/auditEvents";
import useAuditMac from "../utils/useAuditMac";

const AdminBranchesManagement = () => {
  useAuditMac();
  const settings = useContext(SettingsContext);
  const colors = settings?.colors || {};
  const branding = settings?.branding || {};
  const assets = settings?.assets || {};
  const headerColor = colors.header || "#1976d2";

  const [titleColor, setTitleColor] = useState("#000000");
  const [subtitleColor, setSubtitleColor] = useState("#555555");
  const [borderColor, setBorderColor] = useState("#000000");
  const [mainButtonColor, setMainButtonColor] = useState("#1976d2");
  const [subButtonColor, setSubButtonColor] = useState("#ffffff"); // ✅ NEW
  const [stepperColor, setStepperColor] = useState("#000000"); // ✅ NEW

  const [fetchedLogo, setFetchedLogo] = useState(null);
  const [companyName, setCompanyName] = useState("");
  const [shortTerm, setShortTerm] = useState("");
  const [campusAddress, setCampusAddress] = useState("");
  const [branches, setBranches] = useState([]);

  useEffect(() => {
    if (!settings) return;

    // 🎨 Colors
    if (colors.title) setTitleColor(colors.title);
    if (colors.subtitle) setSubtitleColor(colors.subtitle);
    if (colors.border) setBorderColor(colors.border);
    if (colors.mainButton)
      setMainButtonColor(colors.mainButton);
    if (colors.subButton) setSubButtonColor(colors.subButton);
    if (colors.stepper) setStepperColor(colors.stepper);

    // 🏫 Logo
    if (assets.logoUrl) {
      setFetchedLogo(assets.logoUrl);
    } else {
      setFetchedLogo(EaristLogo);
    }

    // 🏷️ School Info
    if (branding.companyName) setCompanyName(branding.companyName);
    if (branding.shortTerm) setShortTerm(branding.shortTerm);
    if (branding.campusAddress) setCampusAddress(branding.campusAddress);

    // ✅ Branches (JSON stored in DB)
    setBranches(settings?.branches || []);
  }, [settings]);

  const [userID, setUserID] = useState("");
  const [user, setUser] = useState("");
  const [userRole, setUserRole] = useState("");
  const [hasAccess, setHasAccess] = useState(null);
  const [canCreate, setCanCreate] = useState(false);
  const [canEdit, setCanEdit] = useState(false);
  const [canDelete, setCanDelete] = useState(false);
  const [loading, setLoading] = useState(false);
  const pageId = 138;

  const [employeeID, setEmployeeID] = useState("");

  const getAuditHeaders = () => ({
    headers: {
      ...getFlatAuditHeaders(),
      "x-employee-id": employeeID || localStorage.getItem("employee_id") || "",
      "x-page-id": pageId,
      "x-audit-actor-id":
        employeeID || localStorage.getItem("employee_id") || "",
      "x-audit-actor-role":
        userRole || localStorage.getItem("role") || "registrar",
    },
  });

  useEffect(() => {
    const storedUser = localStorage.getItem("email");
    const storedRole = localStorage.getItem("role");
    const storedID = localStorage.getItem("person_id");
    const storedEmployeeID = localStorage.getItem("employee_id");

    if (storedUser && storedRole && storedID) {
      setUser(storedUser);
      setUserRole(storedRole);
      setUserID(storedID);
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
    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/page_access/${employeeID}/${pageId}`,
      );
      if (response.data && response.data.page_privilege === 1) {
        setHasAccess(true);
        setCanCreate(Number(response.data?.can_create) === 1);
        setCanEdit(Number(response.data?.can_edit) === 1);
        setCanDelete(Number(response.data?.can_delete) === 1);
      } else {
        setHasAccess(false);
        setCanCreate(false);
        setCanEdit(false);
        setCanDelete(false);
      }
    } catch (error) {
      console.error("Error checking access:", error);
      setHasAccess(false);
      setCanCreate(false);
      setCanEdit(false);
      setCanDelete(false);
      if (error.response && error.response.data.message) {
        console.log(error.response.data.message);
      } else {
        console.log("An unexpected error occurred.");
      }
      setLoading(false);
    }
  };

  const [openBranchDialog, setOpenBranchDialog] = useState(false);
  const [editingBranch, setEditingBranch] = useState(null);

  const [branchName, setBranchName] = useState("");
  const [branchAddress, setBranchAddress] = useState("");

  const [newBranch, setNewBranch] = useState("");
  const [newAddress, setNewAddress] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  const [snack, setSnack] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  useEffect(() => {
    fetchBranches();
  }, []);

  const fetchBranches = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/branches`);

      const safeData = res.data.map((b) => ({
        ...b,
        academicPrograms: b.academicPrograms || [
          { id: 0, name: "Undergraduate" },
          { id: 1, name: "Graduate" },
          { id: 2, name: "Techvoc" },
        ],
      }));

      setBranches(safeData);
    } catch (err) {
      console.error(err);
    }
  };

  const handleChange = (index, field, value) => {
    setIsEditing(true);
    const updated = [...branches];
    updated[index][field] = value;
    setBranches(updated);
  };

  const handleUpdate = async (branch) => {
    if (!canEdit) {
      setSnack({
        open: true,
        message: "You do not have permission to edit branches",
        severity: "error",
      });
      return;
    }

    try {
      await axios.put(
        `${API_BASE_URL}/api/branches/${branch.id}`,
        branch,
        getAuditHeaders(),
      );
      setIsEditing(false);
      setSnack({
        open: true,
        message: "Saved successfully",
        severity: "success",
      });
      fetchBranches();
    } catch {
      setSnack({ open: true, message: "Update failed", severity: "error" });
    }
  };

  const handleDelete = async (id) => {
    if (!canDelete) {
      setSnack({
        open: true,
        message: "You do not have permission to delete branches",
        severity: "error",
      });
      return;
    }

    try {
      await axios.delete(
        `${API_BASE_URL}/api/branches/${id}`,
        getAuditHeaders(),
      );
      setSnack({ open: true, message: "Deleted", severity: "success" });
      fetchBranches();
    } catch {
      setSnack({ open: true, message: "Delete failed", severity: "error" });
    }
  };

  const computeIsOpenPreview = (prog) => {
    const hasSchedule = !!(prog.start_date && prog.end_date);

    // NO SCHEDULE: pure manual mode, switch decides.
    if (!hasSchedule) {
      const manualEnabled =
        prog.manual_enabled === undefined || prog.manual_enabled === null
          ? true
          : Number(prog.manual_enabled) === 1;
      return manualEnabled;
    }

    // SCHEDULE SET: fully automatic, switch is not consulted.
    const [startDatePart, startTimePart] = prog.start_date.split("T");
    const [endDatePart, endTimePart] = prog.end_date.split("T");

    const nowManilaStr = new Date().toLocaleString("en-US", {
      timeZone: "Asia/Manila",
      hour12: false,
    });
    const now = new Date(nowManilaStr);

    const todayDateOnly = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );

    const [startYear, startMonthNum, startDay] = startDatePart
      .split("-")
      .map(Number);
    const startDateOnly = new Date(startYear, startMonthNum - 1, startDay);

    const [endYear, endMonthNum, endDay] = endDatePart.split("-").map(Number);
    const endDateOnly = new Date(endYear, endMonthNum - 1, endDay);

    const withinDateRange =
      todayDateOnly >= startDateOnly && todayDateOnly <= endDateOnly;
    if (!withinDateRange) return false;

    if (!startTimePart || !endTimePart) return withinDateRange;

    const [startHour, startMinute] = startTimePart.split(":").map(Number);
    const [endHour, endMinute] = endTimePart.split(":").map(Number);

    const nowTotal =
      now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
    const startTotal = startHour * 3600 + startMinute * 60;
    const endTotal = endHour * 3600 + endMinute * 60;

    let isOpen;
    if (startTotal < endTotal) {
      isOpen = nowTotal >= startTotal && nowTotal < endTotal;
    } else if (startTotal > endTotal) {
      isOpen = nowTotal >= startTotal || nowTotal < endTotal;
    } else {
      isOpen = true;
    }

    if (todayDateOnly > endDateOnly) isOpen = false;

    return isOpen;
  };

  const formatLocal = (date) => {
    if (!date) return "";
    return date.slice(0, 16); // ✅ NO conversion
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
    <Box
      sx={{
        height: "calc(100vh - 150px)",
        overflowY: "auto",
        paddingRight: 1,
        backgroundColor: "transparent",
        mt: 1,
        padding: 2,
      }}
    >
      <Typography
        variant="h4"
        sx={{
          fontWeight: "bold",
          color: titleColor,
          fontSize: "36px",
          background: "white",
          display: "flex",
          alignItems: "center",
          mb: 2,
        }}
      >
        BRANCH MANAGEMENT / REGISTRATION FOR APPLICANTS
      </Typography>

      <hr style={{ border: "1px solid #ccc", width: "100%" }} />
      <br />
      <br />

      {/* ADD FORM */}

      <Button
        variant="contained"
        startIcon={<AddIcon />}
        sx={{
          mb: 3,
          borderRadius: 2,
          fontWeight: 600,
        }}
        onClick={() => {
          setEditingBranch(null);
          setBranchName("");
          setBranchAddress("");
          setOpenBranchDialog(true);
        }}
      >
        Add New Branch
      </Button>

      {/* LIST */}
      <Grid container spacing={3}>
        {branches.map((b, index) => (
          <Grid item xs={12} md={6} key={b.id}>
            <Card
              sx={{
                border: `1px solid ${borderColor}`,
                boxShadow: 4,
                borderRadius: 3,
                overflow: "hidden",
              }}
            >
              {/* HEADER */}
              <Box
                sx={{
                  background: headerColor,
                  color: "#fff",
                  px: 2,
                  py: 2,
                }}
              >
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                >
                  <Typography
                    fontWeight={700}
                    variant="subtitle1"
                    sx={{ color: "#fff" }}
                  >
                    {b.branch} Branch #{b.id}
                  </Typography>

                  <Chip
                    label={b.registration_open ? "Open" : "Closed"}
                    size="small"
                    sx={{
                      backgroundColor: b.registration_open ? "green" : "red",
                      color: "white",
                      fontWeight: "bold",
                      border: "1px solid rgba(255,255,255,0.2)",
                    }}
                  />
                </Stack>
              </Box>

              <CardContent>
                <Stack spacing={2}>
                  <Typography fontWeight={600}>
                    Branch Name / Branch Address
                  </Typography>

                  {/* INPUTS */}
                  <TextField
                    label="Branch Name"
                    value={b.branch}
                    onChange={(e) =>
                      handleChange(index, "branch", e.target.value)
                    }
                    fullWidth
                  />

                  <TextField
                    label="Address"
                    value={b.address}
                    onChange={(e) =>
                      handleChange(index, "address", e.target.value)
                    }
                    fullWidth
                  />

                  {/* ACADEMIC PROGRAMS */}
                  <Divider />

                  <Typography fontWeight={600}>Academic Programs</Typography>

                  {(b.academicPrograms || []).map((prog, progIndex) => {
                    const hasSchedule = !!(prog.start_date && prog.end_date);
                    const manualEnabled =
                      prog.manual_enabled === undefined ||
                      prog.manual_enabled === null
                        ? true
                        : Number(prog.manual_enabled) === 1;
                    const isCurrentlyOpen = computeIsOpenPreview(prog);

                    return (
                      <Box
                        key={prog.id}
                        sx={{
                          border: "1px solid #e0e0e0",
                          borderRadius: 2,
                          p: 1.5,
                        }}
                      >
                        <Stack
                          direction="row"
                          alignItems="center"
                          justifyContent="space-between"
                        >
                          <Typography fontWeight={600}>{prog.name}</Typography>
                          <Stack
                            direction="row"
                            alignItems="center"
                            spacing={1}
                          >
                            <Chip
                              label={
                                !hasSchedule
                                  ? manualEnabled
                                    ? "Open (manual)"
                                    : "No set schedule yet"
                                  : isCurrentlyOpen
                                    ? "Open right now"
                                    : "Closed right now"
                              }
                              size="small"
                              sx={{
                                backgroundColor: !hasSchedule
                                  ? manualEnabled
                                    ? "green"
                                    : "#9e9e9e"
                                  : isCurrentlyOpen
                                    ? "green"
                                    : "red",
                                color: "white",
                                fontWeight: 600,
                              }}
                            />
                            {!hasSchedule && (
                              <Switch
                                checked={manualEnabled}
                                onChange={(e) => {
                                  const updated = [...branches];
                                  updated[index].academicPrograms[
                                    progIndex
                                  ].manual_enabled = e.target.checked ? 1 : 0;
                                  setBranches(updated);
                                  setIsEditing(true);
                                }}
                              />
                            )}
                          </Stack>
                        </Stack>

                        {/* Per-program daily window — independent hours for Undergrad/Grad/TechVoc */}
                        <Stack
                          direction={{ xs: "column", sm: "row" }}
                          spacing={1.5}
                          sx={{ mt: 1 }}
                        >
                          <TextField
                            type="datetime-local"
                            label={`${prog.name} Start`}
                            size="small"
                            InputLabelProps={{ shrink: true }}
                            value={formatLocal(prog.start_date)}
                            onChange={(e) => {
                              const updated = [...branches];
                              updated[index].academicPrograms[
                                progIndex
                              ].start_date = e.target.value || null;
                              setBranches(updated);
                              setIsEditing(true);
                            }}
                            fullWidth
                          />
                          <TextField
                            type="datetime-local"
                            label={`${prog.name} End`}
                            size="small"
                            InputLabelProps={{ shrink: true }}
                            value={formatLocal(prog.end_date)}
                            onChange={(e) => {
                              const updated = [...branches];
                              updated[index].academicPrograms[
                                progIndex
                              ].end_date = e.target.value || null;
                              setBranches(updated);
                              setIsEditing(true);
                            }}
                            fullWidth
                          />
                        </Stack>
                      </Box>
                    );
                  })}

                  {/* ACTIONS */}
                  <Stack direction="row" spacing={2}>
                    <Button
                      fullWidth
                      variant="contained"
                      startIcon={<SaveIcon />}
                      sx={{ borderRadius: 2 }}
                      onClick={() => handleUpdate(b)}
                    >
                      Save
                    </Button>

                    <Button
                      fullWidth
                      variant="outlined"
                      color="error"
                      startIcon={<DeleteIcon />}
                      sx={{
                        borderRadius: 2,
                        backgroundColor: "#9E0000",
                        color: "white",
                      }}
                      onClick={() => handleDelete(b.id)}
                    >
                      Delete
                    </Button>
                  </Stack>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* SNACK */}
      <Snackbar
        open={snack.open}
        autoHideDuration={3000}
        onClose={() => setSnack({ ...snack, open: false })}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert severity={snack.severity} sx={{ borderRadius: 2 }}>
          {snack.message}
        </Alert>
      </Snackbar>

      <Dialog
        open={openBranchDialog}
        onClose={() => setOpenBranchDialog(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            overflow: "hidden",
            boxShadow: 6,
          },
        }}
      >
        {/* HEADER */}
        <DialogTitle
          sx={{
            background: headerColor,
            color: "#fff",
            fontWeight: 700,
            fontSize: "1.2rem",
            py: 2,
          }}
        >
          {editingBranch
            ? "Edit Branch Information"
            : "New Branch Registration"}
        </DialogTitle>

        {/* CONTENT */}
        <DialogContent sx={{ p: 3 }}>
          <Typography
            variant="subtitle1"
            fontWeight={700}
            sx={{ mb: 1, mt: 1 }}
          >
            Branch Details
          </Typography>

          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Branch Name"
                value={branchName}
                onChange={(e) => setBranchName(e.target.value)}
              />
            </Grid>

            <Grid item xs={12}>
              <Typography
                variant="subtitle1"
                fontWeight={700}
                sx={{ mb: 1, mt: 1 }}
              >
                Branch Address
              </Typography>

              <TextField
                fullWidth
                label="Address"
                value={branchAddress}
                onChange={(e) => setBranchAddress(e.target.value)}
              />
            </Grid>
          </Grid>
        </DialogContent>

        {/* ACTIONS */}
        <DialogActions
          sx={{
            px: 3,
            py: 2,
            borderTop: "1px solid #e0e0e0",
          }}
        >
          <Button
            onClick={() => setOpenBranchDialog(false)}
            color="error"
            variant="outlined"
          >
            Cancel
          </Button>

          <Button
            variant="contained"
            sx={{
              px: 4,
              fontWeight: 600,
              textTransform: "none",
            }}
            onClick={async () => {
              if (!branchName || !branchAddress) return;

              try {
                if (editingBranch) {
                  await axios.put(
                    `${API_BASE_URL}/api/branches/${editingBranch.id}`,
                    {
                      branch: branchName,
                      address: branchAddress,
                    },
                    getAuditHeaders(),
                  );

                  setSnack({
                    open: true,
                    message: "Branch updated successfully",
                    severity: "success",
                  });
                } else {
                  await axios.post(
                    `${API_BASE_URL}/api/branches`,
                    {
                      branch: branchName,
                      address: branchAddress,
                    },
                    getAuditHeaders(),
                  );

                  setSnack({
                    open: true,
                    message: "Branch added successfully",
                    severity: "success",
                  });
                }

                fetchBranches();
                setOpenBranchDialog(false);
              } catch {
                setSnack({
                  open: true,
                  message: "Operation failed",
                  severity: "error",
                });
              }
            }}
          >
            <SaveIcon fontSize="small" /> Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminBranchesManagement;
