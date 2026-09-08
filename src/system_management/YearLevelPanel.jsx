import React, { useState, useEffect, useContext } from "react";
import { SettingsContext } from "../App";
import axios from "axios";
import {
  Box, Typography, Button, TextField, Snackbar, Alert, TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  Paper
} from "@mui/material";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from "@mui/material";

import Unauthorized from "../components/Unauthorized";
import LoadingOverlay from "../components/LoadingOverlay";
import API_BASE_URL from "../apiConfig";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import SaveIcon from '@mui/icons-material/Save';
import { getFlatAuditHeaders } from "../utils/auditEvents";
import useAuditMac from "../utils/useAuditMac";


const YearLevelPanel = () => {
  useAuditMac();
  const settings = useContext(SettingsContext);
  const colors = settings?.colors || {};
  const headerColor = colors.header || "#1976d2";

  const [titleColor, setTitleColor] = useState("#000000");
  const [subtitleColor, setSubtitleColor] = useState("#555555");
  const [borderColor, setBorderColor] = useState("#000000");

  const [userID, setUserID] = useState("");
  const [userRole, setUserRole] = useState("");
  const [employeeID, setEmployeeID] = useState("");
  const [hasAccess, setHasAccess] = useState(null);
  const [canCreate, setCanCreate] = useState(false);
  const [canEdit, setCanEdit] = useState(false);
  const [canDelete, setCanDelete] = useState(false);
  const [loading, setLoading] = useState(false);

  const pageId = 63;
  const permissionHeaders = {
    headers: {
      ...getFlatAuditHeaders(),
      "x-employee-id": employeeID,
      "x-page-id": pageId,
      "x-audit-actor-id": employeeID,
      "x-audit-actor-role": userRole || localStorage.getItem("role") || "registrar",
    },
  };

  const [yearLevelDescription, setYearLevelDescription] = useState("");
  const [yearLevelList, setYearLevelList] = useState([]);
  const [levelType, setLevelType] = useState("year");

  // 🌟 Snackbar state
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  useEffect(() => {
    if (!settings) return;
    if (colors.title) setTitleColor(colors.title);
    if (colors.subtitle) setSubtitleColor(colors.subtitle);
    if (colors.border) setBorderColor(colors.border);
  }, [settings]);

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

  const checkAccess = async (employeeID) => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/api/page_access/${employeeID}/${pageId}`);
      if (response.data?.page_privilege === 1) {
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
    } catch (err) {
      console.error("Error checking access:", err);
      setHasAccess(false);
      setCanCreate(false);
      setCanEdit(false);
      setCanDelete(false);
      setSnackbar({ open: true, message: "Failed to check access", severity: "error" });
    } finally {
      setLoading(false);
    }
  };

  const fetchYearLevelList = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/get_year_level`);
      setYearLevelList(res.data);
    } catch (err) {
      console.error("Failed to fetch year levels:", err);
      setSnackbar({ open: true, message: "Failed to fetch year levels", severity: "error" });
    }
  };

  useEffect(() => {
    fetchYearLevelList();
  }, []);

  const [openYearLevelDialog, setOpenYearLevelDialog] = useState(false);
  const [ordinalLabel, setOrdinalLabel] = useState("");

  const handleAddYearLevel = async () => {
    if (!yearLevelDescription.trim()) {
      setSnackbar({ open: true, message: "Year level description is required", severity: "warning" });
      return;
    }

    try {
      await axios.post(`${API_BASE_URL}/api/years_level`, {
        year_level_description: yearLevelDescription,
        level_type: levelType,
        ordinal_label: ordinalLabel,
      }, permissionHeaders);
      setYearLevelDescription("");
      setOrdinalLabel("");
      fetchYearLevelList();
      setSnackbar({ open: true, message: "Year level added successfully!", severity: "success" });
    } catch (err) {
      console.error("Error adding year level:", err);
      setSnackbar({ open: true, message: "Failed to add year level", severity: "error" });
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar((prev) => ({ ...prev, open: false }));
  };

  const [editMode, setEditMode] = useState(false);
  const [selectedId, setSelectedId] = useState(null);

  const handleEdit = (level) => {
    if (!canEdit) {
      setSnackbar({ open: true, message: "You do not have permission to edit this item", severity: "error" });
      return;
    }

    setEditMode(true);
    setSelectedId(level.year_level_id);
    setYearLevelDescription(level.year_level_description);
    setLevelType(level.level_type);
    setOrdinalLabel(level.ordinal_label || "");
    setOpenYearLevelDialog(true);
  };


  const handleSave = async () => {
    if (!yearLevelDescription.trim()) {
      setSnackbar({ open: true, message: "Required field", severity: "warning" });
      return;
    }

    if (editMode && !canEdit) {
      setSnackbar({ open: true, message: "You do not have permission to edit this item", severity: "error" });
      return;
    }

    if (!editMode && !canCreate) {
      setSnackbar({ open: true, message: "You do not have permission to create items on this page", severity: "error" });
      return;
    }

    try {
      if (editMode) {
        await axios.put(`${API_BASE_URL}/api/years_level/${selectedId}`, {
          year_level_description: yearLevelDescription,
          level_type: levelType,
          ordinal_label: ordinalLabel,
        }, permissionHeaders);

        setSnackbar({ open: true, message: "Updated successfully!", severity: "success" });
      } else {
        await axios.post(`${API_BASE_URL}/api/years_level`, {
          year_level_description: yearLevelDescription,
          level_type: levelType,
          ordinal_label: ordinalLabel,
        }, permissionHeaders);

        setSnackbar({ open: true, message: "Added successfully!", severity: "success" });
      }

      resetForm();
      fetchYearLevelList();
    } catch (err) {
      console.error(err);
      setSnackbar({ open: true, message: "Operation failed", severity: "error" });
    }
  };

  const resetForm = () => {
    setYearLevelDescription("");
    setLevelType("year");
    setOrdinalLabel("");
    setEditMode(false);
    setSelectedId(null);
    setOpenYearLevelDialog(false);
  };


  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [yearLevelToDelete, setYearLevelToDelete] = useState(null);

  const handleDelete = (level) => {
    if (!canDelete) {
      setSnackbar({ open: true, message: "You do not have permission to delete this item", severity: "error" });
      return;
    }
    setYearLevelToDelete(level);
    setOpenDeleteDialog(true);
  };

  const handleConfirmDelete = async () => {
    try {
      await axios.delete(`${API_BASE_URL}/api/years_level/${yearLevelToDelete.year_level_id}`, permissionHeaders);
      fetchYearLevelList();
      setSnackbar({ open: true, message: "Deleted successfully!", severity: "success" });
    } catch (err) {
      console.error(err);
      setSnackbar({ open: true, message: "Delete failed", severity: "error" });
    } finally {
      setOpenDeleteDialog(false);
      setYearLevelToDelete(null);
    }
  };

  if (loading || hasAccess === null) return <LoadingOverlay open={loading} message="Loading..." />;
  if (!hasAccess) return <Unauthorized />;

  const showCreateActions = canCreate;
  const showActionColumn = canEdit || canDelete;

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
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', mb: 2 }}>
        <Typography variant="h4" sx={{ fontWeight: 'bold', color: titleColor, fontSize: '36px' }}>
          YEAR LEVEL PANEL
        </Typography>
      </Box>
      <hr style={{ border: "1px solid #ccc", width: "100%" }} />
      <br />
      <br />



      <TableContainer
        component={Paper}
        sx={{
          width: "100%",
          border: `1px solid ${borderColor}`,

        }}
      >
        <Table size="small">
          <TableHead
            sx={{
              backgroundColor: headerColor,
            }}
          >
            <TableRow>
              <TableCell
                colSpan={20}
                sx={{

                  py: 0.5,
                  backgroundColor: headerColor,
                  color: "white",
                }}
              >
                <Box
                  display="flex"
                  justifyContent="space-between"
                  alignItems="center"
                  flexWrap="wrap"
                  sx={{ height: "50px" }}
                >
                  {/* LEFT SIDE */}
                  <Typography
                    fontSize="14px"
                    fontWeight="bold"
                    color="white"
                  >
                    Total Year Level Records: {yearLevelList.length}
                  </Typography>

                  {/* RIGHT SIDE */}
                  <Box
                    display="flex"
                    alignItems="center"
                    gap={1}
                    flexWrap="wrap"
                  >
                    {showCreateActions && (
                      <Button
                        variant="contained"
                        onClick={() => {
                          setEditMode(false);
                          setSelectedId(null);
                          setYearLevelDescription("");
                          setLevelType("year");
                          setOrdinalLabel("");
                          setOpenYearLevelDialog(true);
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
                        + Add Year Level
                      </Button>
                    )}
                  </Box>
                </Box>
              </TableCell>
            </TableRow>
          </TableHead>
        </Table>
      </TableContainer>


      <Box sx={{ overflowY: "auto", }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ backgroundColor: "#F5F5F5", color: "#000", border: `1px solid ${borderColor}` }}>
              <th style={styles.tableCell}>Year Level ID</th>
              <th style={styles.tableCell}>Year Level Description</th>
              <th style={styles.tableCell}>Type</th>
              <th style={styles.tableCell}>Ordinal Label</th>
              {showActionColumn && <th style={styles.tableCell}>Actions</th>}
            </tr>
          </thead>
          <tbody >
            {yearLevelList.map((level, index) => (
              <tr key={index} style={{
                backgroundColor: index % 2 === 0 ? "#ffffff" : "lightgray",
              }}>
                <td style={styles.tableCell}>{level.year_level_id}</td>
                <td style={styles.tableCell}>{level.year_level_description}</td>
                <td style={styles.tableCell}>{level.level_type}</td>
                <td style={styles.tableCell}>{level.ordinal_label}</td>
                {showActionColumn && (
                  <td style={styles.tableCell}>
                    <Box sx={{

                      textAlign: "center",

                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      gap: "10px", // space between buttons
                    }}
                    >
                      {canEdit && (
                        <Button
                          variant="contained"
                          size="small"
                          onClick={() => handleEdit(level)}
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
                        >
                          <EditIcon fontSize="small" /> Edit
                        </Button>
                      )}

                      {canDelete && (
                        <Button
                          variant="contained"
                          size="small"
                          onClick={() => handleDelete(level)}

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
                        >
                          <DeleteIcon fontSize="small" /> Delete
                        </Button>
                      )}
                    </Box>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </Box>

      <TableContainer
        component={Paper}
        sx={{
          width: "100%",
          border: `1px solid ${borderColor}`,

        }}
      >
        <Table size="small">
          <TableHead
            sx={{
              backgroundColor: headerColor,
            }}
          >
            <TableRow>
              <TableCell
                colSpan={20}
                sx={{

                  py: 0.5,
                  backgroundColor: headerColor,
                  color: "white",
                }}
              >
                <Box
                  display="flex"
                  justifyContent="space-between"
                  alignItems="center"
                  flexWrap="wrap"
                  sx={{ height: "50px" }}
                >
                  {/* LEFT SIDE */}
                  <Typography
                    fontSize="14px"
                    fontWeight="bold"
                    color="white"
                  >
                    Total Year Level Records: {yearLevelList.length}
                  </Typography>


                </Box>
              </TableCell>
            </TableRow>
          </TableHead>
        </Table>
      </TableContainer>


      <Dialog
        open={openYearLevelDialog}
        onClose={() => setOpenYearLevelDialog(false)}
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
          {editMode ? "Edit Year Level" : "Add Year Level"}
        </DialogTitle>

        {/* ===== CONTENT ===== */}
        <DialogContent sx={{ p: 3 }}>



          <Typography fontWeight="bold" mb={1} mt={2}>
            Year Level Description
          </Typography>

          <TextField
            fullWidth
            placeholder="Enter year level (e.g., 1st Year)"
            value={yearLevelDescription}
            onChange={(e) => setYearLevelDescription(e.target.value)}
          />

          <Typography fontWeight="bold" mt={2}>
            Level Type
          </Typography>

          <TextField
            select
            fullWidth
            value={levelType}
            onChange={(e) => setLevelType(e.target.value)}
            SelectProps={{ native: true }}
          >
            <option value="year">Year Level</option>
            <option value="special">Special Program</option>
            <option value="graduate">Graduate Level</option>
          </TextField>


          <Typography fontWeight="bold" mt={2}>
            Ordinal Label
          </Typography>

          <TextField
            fullWidth
            placeholder="e.g., 1st Year"
            value={ordinalLabel}
            onChange={(e) => setOrdinalLabel(e.target.value)}
          />
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
            onClick={() => setOpenYearLevelDialog(false)}
            color="error"
            variant="outlined"
            sx={{ textTransform: "none" }}
          >
            Cancel
          </Button>

          <Button
            variant="contained"

            sx={{
              px: 4,
              fontWeight: 600,
              textTransform: "none"
            }}
            onClick={handleSave}
          >
            <SaveIcon fontSize="small" /> Save

          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Year Level Dialog */}
      <Dialog
        open={openDeleteDialog}
        onClose={() => { setOpenDeleteDialog(false); setYearLevelToDelete(null); }}
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
          Delete Year Level
        </DialogTitle>

        <DialogContent sx={{ p: 3, mt: 2 }}>
          <Typography sx={{ mb: 2 }}>
            Are you sure you want to delete{" "}
            <strong>{yearLevelToDelete?.year_level_description}</strong>?
          </Typography>

          <Typography sx={{ color: "#d32f2f", fontSize: "0.95rem" }}>
            Deleting this year level will permanently remove it from the system.
            <br />
            Students and records currently associated with this year level may
            be affected.
          </Typography>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            variant="outlined"
            color="error"
            onClick={() => { setOpenDeleteDialog(false); setYearLevelToDelete(null); }}
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

const styles = {
  tableCell: {
    border: "1px solid #000000",
    padding: "10px",
    textAlign: "center",
  },
};

export default YearLevelPanel;
