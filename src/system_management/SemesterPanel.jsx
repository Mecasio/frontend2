import React, { useState, useEffect, useContext } from "react";
import { SettingsContext } from "../App";
import axios from "axios";
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Snackbar,
  Alert,
  TableContainer,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Select,
  MenuItem,
} from "@mui/material";
import Unauthorized from "../components/Unauthorized";
import LoadingOverlay from "../components/LoadingOverlay";
import API_BASE_URL from "../apiConfig";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import SearchIcon from "@mui/icons-material/Search";
import SaveIcon from "@mui/icons-material/Save";
import { getFlatAuditHeaders } from "../utils/auditEvents";
import useAuditMac from "../utils/useAuditMac";

const ROWS_PER_PAGE = 10;

const SemesterPanel = () => {
  useAuditMac();
  const settings = useContext(SettingsContext);
  const colors = settings?.colors || {};
  const branding = settings?.branding || {};
  const assets = settings?.assets || {};

  // ── Colors ──────────────────────────────────────────────────────────────────
  const [headerColor, setHeaderColor] = useState("#1976d2");
  const [titleColor, setTitleColor] = useState("#000000");
  const [subtitleColor, setSubtitleColor] = useState("#555555");
  const [borderColor, setBorderColor] = useState("#000000");
  const [mainButtonColor, setMainButtonColor] = useState("#1976d2");
  const [subButtonColor, setSubButtonColor] = useState("#ffffff");
  const [stepperColor, setStepperColor] = useState("#000000");

  // ── School info / logo ───────────────────────────────────────────────────────
  const [fetchedLogo, setFetchedLogo] = useState(null);
  const [companyName, setCompanyName] = useState("");
  const [shortTerm, setShortTerm] = useState("");
  const [campusAddress, setCampusAddress] = useState("");

  useEffect(() => {
    if (!settings) return;
    if (colors.title) setTitleColor(colors.title);
    if (colors.subtitle) setSubtitleColor(colors.subtitle);
    if (colors.border) setBorderColor(colors.border);
    if (colors.header) setHeaderColor(colors.header);
    if (colors.mainButton) setMainButtonColor(colors.mainButton);
    if (colors.subButton) setSubButtonColor(colors.subButton);
    if (colors.stepper) setStepperColor(colors.stepper);
    if (assets.logoUrl) setFetchedLogo(assets.logoUrl);
    if (branding.companyName) setCompanyName(branding.companyName);
    if (branding.shortTerm) setShortTerm(branding.shortTerm);
    if (branding.campusAddress) setCampusAddress(branding.campusAddress);
  }, [settings]);

  // ── Auth / access ────────────────────────────────────────────────────────────
  const [userID, setUserID] = useState("");
  const [userRole, setUserRole] = useState("");
  const [employeeID, setEmployeeID] = useState("");
  const [hasAccess, setHasAccess] = useState(null);
  const [loading, setLoading] = useState(false);

  // ── Permissions ──────────────────────────────────────────────────────────────
  const [canCreate, setCanCreate] = useState(false);
  const [canEdit, setCanEdit] = useState(false);
  const [canDelete, setCanDelete] = useState(false);

  const pageId = 58;

  const getAuditHeaders = () => ({
    headers: {
      ...getFlatAuditHeaders(),
      "x-employee-id": employeeID || localStorage.getItem("employee_id") || "",
      "x-page-id": pageId,
      "x-audit-actor-id": employeeID || localStorage.getItem("employee_id") || "",
      "x-audit-actor-role": userRole || localStorage.getItem("role") || "registrar",
    },
  });

  // ── Data ─────────────────────────────────────────────────────────────────────
  const [semesters, setSemesters] = useState([]);

  // ── Search & pagination ──────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  // ── Snackbar ──────────────────────────────────────────────────────────────────
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });

  // ── Edit dialog ───────────────────────────────────────────────────────────────
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [editingSemester, setEditingSemester] = useState(null);   // null → Add mode
  const [editDescription, setEditDescription] = useState("");
  const [editCode, setEditCode] = useState("");

  // ── Delete dialog ─────────────────────────────────────────────────────────────
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [semesterToDelete, setSemesterToDelete] = useState(null);
  const [editOrdinalLabel, setEditOrdinalLabel] = useState("");

  // ── Auth effect ───────────────────────────────────────────────────────────────
  useEffect(() => {
    const storedUser = localStorage.getItem("email");
    const storedRole = localStorage.getItem("role");
    const storedID = localStorage.getItem("person_id");
    const storedEmployeeID = localStorage.getItem("employee_id");

    if (storedUser && storedRole && storedID) {
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

  // ── Access check ──────────────────────────────────────────────────────────────
  const checkAccess = async (empID) => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/api/page_access/${empID}/${pageId}`);
      const privilege = response.data?.page_privilege;
      setHasAccess(privilege === 1);

      // Adjust permission flags based on your actual API shape
      setCanCreate(privilege === 1);
      setCanEdit(privilege === 1);
      setCanDelete(privilege === 1);
    } catch (err) {
      console.error("Error checking access:", err);
      setHasAccess(false);
      setSnackbar({ open: true, message: "Failed to check access", severity: "error" });
    } finally {
      setLoading(false);
    }
  };

  // ── Fetch semesters ───────────────────────────────────────────────────────────
  const fetchSemesters = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/get_semester`);
      setSemesters(res.data);
    } catch (err) {
      console.error("Error fetching semesters:", err);
      setSnackbar({ open: true, message: "Failed to fetch semesters", severity: "error" });
    }
  };

  useEffect(() => {
    fetchSemesters();
  }, []);

  // ── Derived: filtered & paginated ─────────────────────────────────────────────
  const filteredSemesters = semesters.filter((s) =>
    s.semester_description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.semester_code?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalPages = Math.max(1, Math.ceil(filteredSemesters.length / ROWS_PER_PAGE));
  const startIndex = (currentPage - 1) * ROWS_PER_PAGE;
  const paginated = filteredSemesters.slice(startIndex, startIndex + ROWS_PER_PAGE);

  // Reset to page 1 when search changes
  useEffect(() => { setCurrentPage(1); }, [searchQuery]);

  const handleEdit = (sem) => {
    setEditingSemester(sem);
    setEditDescription(sem.semester_description || "");
    setEditCode(sem.semester_code || "");
    setEditOrdinalLabel(sem.ordinal_label || "");
    setOpenEditDialog(true);
  };

  const handleOpenAddDialog = () => {
    setEditingSemester(null);
    setEditDescription("");
    setEditCode("");
    setEditOrdinalLabel("");
    setOpenEditDialog(true);
  };

  // ── Save (add or edit) ────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!editDescription.trim()) {
      setSnackbar({ open: true, message: "Semester description is required", severity: "warning" });
      return;
    }

    try {
      if (editingSemester) {
        await axios.put(`${API_BASE_URL}/api/semesters/${editingSemester.semester_id}`, {
          semester_description: editDescription,
          semester_code: editCode,
          ordinal_label: editOrdinalLabel,
        }, getAuditHeaders());
        setSnackbar({ open: true, message: "Semester updated successfully!", severity: "success" });
      } else {
        await axios.post(`${API_BASE_URL}/api/semesters`, {
          semester_description: editDescription,
          semester_code: editCode,
          ordinal_label: editOrdinalLabel,
        }, getAuditHeaders());
        setSnackbar({ open: true, message: "Semester added successfully!", severity: "success" });
      }

      setOpenEditDialog(false);
      fetchSemesters();
    } catch (err) {
      console.error("Error saving semester:", err);
      setSnackbar({ open: true, message: "Failed to save semester", severity: "error" });
    }
  };

  // ── Delete ────────────────────────────────────────────────────────────────────
  const handleDeleteConfirm = async () => {
    if (!semesterToDelete) return;
    try {
      await axios.delete(`${API_BASE_URL}/api/semesters/${semesterToDelete.semester_id}`, getAuditHeaders());
      setSnackbar({ open: true, message: "Semester deleted successfully!", severity: "success" });
      setOpenDeleteDialog(false);
      setSemesterToDelete(null);
      fetchSemesters();
    } catch (err) {
      console.error("Error deleting semester:", err);
      setSnackbar({ open: true, message: "Failed to delete semester", severity: "error" });
    }
  };

  const handleCloseSnackbar = () => setSnackbar((prev) => ({ ...prev, open: false }));

  // ── Guards ────────────────────────────────────────────────────────────────────
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

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <Box sx={{ height: "calc(100vh - 150px)", overflowY: "auto", padding: 2 }}>

      {/* HEADER */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", mb: 2 }}>
        <Typography variant="h4" sx={{ fontWeight: "bold", color: titleColor, fontSize: "36px" }}>
          SEMESTER PANEL FORM
        </Typography>

        <TextField
          placeholder="Search Semester..."
          size="small"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          sx={{
            width: 450,
            backgroundColor: "#fff",
            borderRadius: 1,
            "& .MuiOutlinedInput-root": { borderRadius: "10px" },
          }}
          InputProps={{
            startAdornment: <SearchIcon sx={{ mr: 1, color: "gray" }} />,
          }}
        />
      </Box>

      <hr style={{ border: "1px solid #ccc" }} />
      <br /><br />

      {/* TOP BAR */}
      <TableContainer component={Paper} sx={{ width: "100%" }}>
        <Table size="small">
          <TableHead sx={{ backgroundColor: "#6D2323", color: "white" }}>
            <TableRow>
              <TableCell
                colSpan={10}
                sx={{
                  border: `1px solid ${borderColor}`,
                  py: 0.5,
                  backgroundColor: headerColor,
                  color: "white",
                }}
              >
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Typography fontSize="14px" fontWeight="bold">
                    Total Semesters: {filteredSemesters.length}
                  </Typography>

                  <Box display="flex" alignItems="center" gap={1}>
                    {/* First */}
                    <Button
                      onClick={() => setCurrentPage(1)}
                      disabled={currentPage === 1}
                      variant="outlined"
                      size="small"
                      sx={{
                        minWidth: 80, color: "white", borderColor: "white", backgroundColor: "transparent",
                        "&:hover": { borderColor: "white", backgroundColor: "rgba(255,255,255,0.1)" },
                        "&.Mui-disabled": { color: "white", borderColor: "white", backgroundColor: "transparent", opacity: 1 },
                      }}
                    >
                      First
                    </Button>

                    {/* Prev */}
                    <Button
                      onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                      disabled={currentPage === 1}
                      variant="outlined"
                      size="small"
                      sx={{
                        minWidth: 80, color: "white", borderColor: "white", backgroundColor: "transparent",
                        "&:hover": { borderColor: "white", backgroundColor: "rgba(255,255,255,0.1)" },
                        "&.Mui-disabled": { color: "white", borderColor: "white", backgroundColor: "transparent", opacity: 1 },
                      }}
                    >
                      Prev
                    </Button>

                    {/* Page Select */}
                    <Select
                      size="small"
                      value={currentPage}
                      onChange={(e) => setCurrentPage(Number(e.target.value))}
                      sx={{
                        fontSize: "12px", height: 36, color: "white", border: "1px solid white",
                        backgroundColor: "transparent",
                        ".MuiOutlinedInput-notchedOutline": { borderColor: "white" },
                        "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "white" },
                        "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: "white" },
                        "& svg": { color: "white" },
                      }}
                      MenuProps={{ PaperProps: { sx: { maxHeight: 200, backgroundColor: "#fff" } } }}
                    >
                      {Array.from({ length: totalPages }, (_, i) => (
                        <MenuItem key={i + 1} value={i + 1}>Page {i + 1}</MenuItem>
                      ))}
                    </Select>

                    <Typography fontSize="11px" color="white">
                      of {totalPages} page{totalPages > 1 ? "s" : ""}
                    </Typography>

                    {/* Next */}
                    <Button
                      onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      variant="outlined"
                      size="small"
                      sx={{
                        minWidth: 80, color: "white", borderColor: "white", backgroundColor: "transparent",
                        "&:hover": { borderColor: "white", backgroundColor: "rgba(255,255,255,0.1)" },
                        "&.Mui-disabled": { color: "white", borderColor: "white", backgroundColor: "transparent", opacity: 1 },
                      }}
                    >
                      Next
                    </Button>

                    {/* Last */}
                    <Button
                      onClick={() => setCurrentPage(totalPages)}
                      disabled={currentPage === totalPages}
                      variant="outlined"
                      size="small"
                      sx={{
                        minWidth: 80, color: "white", borderColor: "white", backgroundColor: "transparent",
                        "&:hover": { borderColor: "white", backgroundColor: "rgba(255,255,255,0.1)" },
                        "&.Mui-disabled": { color: "white", borderColor: "white", backgroundColor: "transparent", opacity: 1 },
                      }}
                    >
                      Last
                    </Button>

                    {/* Add Button */}
                    {canCreate && (
                      <Button
                        variant="contained"
                        onClick={handleOpenAddDialog}
                        sx={{
                          backgroundColor: "#1976d2", color: "#fff", fontWeight: "bold",
                          borderRadius: "8px", width: "250px", textTransform: "none",
                          px: 2, mr: "15px",
                          "&:hover": { backgroundColor: "#1565c0" },
                        }}
                      >
                        + Add Semester
                      </Button>
                    )}
                  </Box>
                </Box>
              </TableCell>
            </TableRow>
          </TableHead>
        </Table>
      </TableContainer>

      {/* TABLE */}
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: "bold", textAlign: "center", border: `1px solid ${borderColor}`, backgroundColor: "#f5f5f5", color: "#000" }}>#</TableCell>
              <TableCell sx={{ fontWeight: "bold", textAlign: "center", border: `1px solid ${borderColor}`, backgroundColor: "#f5f5f5", color: "#000" }}>Semester Description</TableCell>
              <TableCell sx={{ fontWeight: "bold", textAlign: "center", border: `1px solid ${borderColor}`, backgroundColor: "#f5f5f5", color: "#000" }}>Code</TableCell>
              <TableCell sx={{ fontWeight: "bold", textAlign: "center", border: `1px solid ${borderColor}`, backgroundColor: "#f5f5f5", color: "#000" }}>Ordinal Label</TableCell>
              <TableCell sx={{ fontWeight: "bold", textAlign: "center", border: `1px solid ${borderColor}`, backgroundColor: "#f5f5f5", color: "#000" }}>Action</TableCell>
            </TableRow>
          </TableHead>

          <TableBody
            sx={{
              border: `1px solid ${borderColor}`,
              "& .MuiTableRow-root:nth-of-type(odd)": {
                backgroundColor: "#ffffff",
              },
              "& .MuiTableRow-root:nth-of-type(even)": {
                backgroundColor: "lightgray",
              },
            }}
          >
            {paginated.map((sem, i) => (
              <TableRow key={sem.semester_id}>
                <TableCell sx={{ border: `1px solid ${borderColor}`, textAlign: "center" }}>{startIndex + i + 1}</TableCell>
                <TableCell sx={{ border: `1px solid ${borderColor}`, textAlign: "center" }}>{sem.semester_description}</TableCell>
                <TableCell sx={{ border: `1px solid ${borderColor}`, textAlign: "center" }}>{sem.semester_code}</TableCell>
                <TableCell sx={{ border: `1px solid ${borderColor}`, textAlign: "center" }}>{sem.ordinal_label}</TableCell>
                <TableCell sx={{ border: `1px solid ${borderColor}`, textAlign: "center" }}>
                  <Box sx={{ display: "flex", gap: 1, justifyContent: "center" }}>
                    {canEdit && (
                      <Button
                        variant="contained"
                        sx={{ backgroundColor: "green", width: 100 }}
                        onClick={() => handleEdit(sem)}
                      >
                        <EditIcon fontSize="small" /> Edit
                      </Button>
                    )}
                    {canDelete && (
                      <Button
                        variant="contained"
                        sx={{ backgroundColor: "#9E0000", width: 100 }}
                        onClick={() => { setSemesterToDelete(sem); setOpenDeleteDialog(true); }}
                      >
                        <DeleteIcon fontSize="small" /> Delete
                      </Button>
                    )}
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <TableContainer component={Paper} sx={{ width: "100%" }}>
        <Table size="small">
          <TableHead sx={{ backgroundColor: "#6D2323", color: "white" }}>
            <TableRow>
              <TableCell
                colSpan={10}
                sx={{
                  border: `1px solid ${borderColor}`,
                  py: 0.5,
                  backgroundColor: headerColor,
                  color: "white",
                }}
              >
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Typography fontSize="14px" fontWeight="bold">
                    Total Semesters: {filteredSemesters.length}
                  </Typography>

                  <Box display="flex" alignItems="center" gap={1}>
                    {/* First */}
                    <Button
                      onClick={() => setCurrentPage(1)}
                      disabled={currentPage === 1}
                      variant="outlined"
                      size="small"
                      sx={{
                        minWidth: 80, color: "white", borderColor: "white", backgroundColor: "transparent",
                        "&:hover": { borderColor: "white", backgroundColor: "rgba(255,255,255,0.1)" },
                        "&.Mui-disabled": { color: "white", borderColor: "white", backgroundColor: "transparent", opacity: 1 },
                      }}
                    >
                      First
                    </Button>

                    {/* Prev */}
                    <Button
                      onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                      disabled={currentPage === 1}
                      variant="outlined"
                      size="small"
                      sx={{
                        minWidth: 80, color: "white", borderColor: "white", backgroundColor: "transparent",
                        "&:hover": { borderColor: "white", backgroundColor: "rgba(255,255,255,0.1)" },
                        "&.Mui-disabled": { color: "white", borderColor: "white", backgroundColor: "transparent", opacity: 1 },
                      }}
                    >
                      Prev
                    </Button>

                    {/* Page Select */}
                    <Select
                      size="small"
                      value={currentPage}
                      onChange={(e) => setCurrentPage(Number(e.target.value))}
                      sx={{
                        fontSize: "12px", height: 36, color: "white", border: "1px solid white",
                        backgroundColor: "transparent",
                        ".MuiOutlinedInput-notchedOutline": { borderColor: "white" },
                        "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "white" },
                        "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: "white" },
                        "& svg": { color: "white" },
                      }}
                      MenuProps={{ PaperProps: { sx: { maxHeight: 200, backgroundColor: "#fff" } } }}
                    >
                      {Array.from({ length: totalPages }, (_, i) => (
                        <MenuItem key={i + 1} value={i + 1}>Page {i + 1}</MenuItem>
                      ))}
                    </Select>

                    <Typography fontSize="11px" color="white">
                      of {totalPages} page{totalPages > 1 ? "s" : ""}
                    </Typography>

                    {/* Next */}
                    <Button
                      onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      variant="outlined"
                      size="small"
                      sx={{
                        minWidth: 80, color: "white", borderColor: "white", backgroundColor: "transparent",
                        "&:hover": { borderColor: "white", backgroundColor: "rgba(255,255,255,0.1)" },
                        "&.Mui-disabled": { color: "white", borderColor: "white", backgroundColor: "transparent", opacity: 1 },
                      }}
                    >
                      Next
                    </Button>

                    {/* Last */}
                    <Button
                      onClick={() => setCurrentPage(totalPages)}
                      disabled={currentPage === totalPages}
                      variant="outlined"
                      size="small"
                      sx={{
                        minWidth: 80, color: "white", borderColor: "white", backgroundColor: "transparent",
                        "&:hover": { borderColor: "white", backgroundColor: "rgba(255,255,255,0.1)" },
                        "&.Mui-disabled": { color: "white", borderColor: "white", backgroundColor: "transparent", opacity: 1 },
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

      {/* ── ADD / EDIT DIALOG ──────────────────────────────────────────────────── */}
      <Dialog open={openEditDialog} onClose={() => setOpenEditDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: "bold", backgroundColor: headerColor, color: "white" }}>
          {editingSemester ? "Edit Semester" : "Add Semester"}
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Typography fontWeight="bold" mb={1} mt={2}>
            Semester Description
          </Typography>

          <TextField
            label="Semester Description"
            fullWidth
            value={editDescription}
            onChange={(e) => setEditDescription(e.target.value)}
            sx={{ mb: 2, mt: 1 }}
          />

          <Typography fontWeight="bold" mb={1} mt={1}>
            Semester Code
          </Typography>

          <TextField
            label="Semester Code"
            fullWidth
            value={editCode}
            onChange={(e) => setEditCode(e.target.value)}
          />

          <Typography fontWeight="bold" mb={1} mt={2}>
            Ordinal Label
          </Typography>

          <TextField
            label="Ordinal Label"
            fullWidth
            placeholder="e.g., 1st Semester"
            value={editOrdinalLabel}
            onChange={(e) => setEditOrdinalLabel(e.target.value)}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setOpenEditDialog(false)} variant="outlined"
            color="error">
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            variant="contained"

          >
            <SaveIcon fontSize="small" /> Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── DELETE CONFIRM DIALOG ─────────────────────────────────────────────── */}
      <Dialog open={openDeleteDialog} onClose={() => setOpenDeleteDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle
          sx={{
            background: colors.header || "#9E0000",
            color: "#fff",
            fontWeight: 700,
            fontSize: "1.2rem",
            py: 2,
          }}
        >
          Delete Semester
        </DialogTitle>

        <DialogContent sx={{ p: 3, mt: 2 }}>
          <Typography sx={{ mb: 2 }}>
            Are you sure you want to delete{" "}
            <strong>{semesterToDelete?.semester_description}</strong>?
          </Typography>

          <Typography sx={{ color: "#d32f2f", fontSize: "0.95rem" }}>
            Deleting this semester will permanently remove it from the system.
            <br />
            All related records, schedules, and data associated with this semester
            may be affected.
          </Typography>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setOpenDeleteDialog(false)} variant="outlined" color="error">
            Cancel
          </Button>
          <Button
            onClick={handleDeleteConfirm}
            variant="contained"
            color="error"
          >
            Yes, Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── SNACKBAR ──────────────────────────────────────────────────────────── */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: "100%" }}>
          {snackbar.message}
        </Alert>
      </Snackbar>

    </Box>
  );
};

export default SemesterPanel;
