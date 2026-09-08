import React, { useState, useEffect, useContext, useRef } from "react";
import { SettingsContext } from "../App";
import EaristLogo from "../assets/EaristLogo.png";
import axios from "axios";
import API_BASE_URL from "../apiConfig";
import {
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  Grid,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Table,
  Paper,
  TableBody,
  TableCell,
  TableHead,
  TableContainer,
  TableRow,
  Typography,
  IconButton,
  Autocomplete,
  TextField,
  Snackbar,
  Alert,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import Unauthorized from "../components/Unauthorized";
import LoadingOverlay from "../components/LoadingOverlay";
import EditIcon from "@mui/icons-material/Edit";
import { getFlatAuditHeaders } from "../utils/auditEvents";
import useAuditMac from "../utils/useAuditMac";




export default function DepartmentCurriculumPanel() {
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
  const [subButtonColor, setSubButtonColor] = useState("#ffffff");   // ✅ NEW
  const [stepperColor, setStepperColor] = useState("#000000");       // ✅ NEW

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
    if (colors.mainButton) setMainButtonColor(colors.mainButton);
    if (colors.subButton) setSubButtonColor(colors.subButton);   // ✅ NEW
    if (colors.stepper) setStepperColor(colors.stepper);           // ✅ NEW

    // 🏫 Logo
    if (assets.logoUrl) {
      setFetchedLogo(assets.logoUrl);
    } else {
      setFetchedLogo(EaristLogo);
    }

    // 🏷️ School Information
    if (branding.companyName) setCompanyName(branding.companyName);
    if (branding.shortTerm) setShortTerm(branding.shortTerm);
    if (branding.campusAddress) setCampusAddress(branding.campusAddress);
    setBranches(settings.branches || []);


  }, [settings]);

  const [departments, setDepartments] = useState([]);
  const [curriculums, setCurriculums] = useState([]);
  const [selectedDept, setSelectedDept] = useState("");
  const [selectedCurr, setSelectedCurr] = useState("");
  const [curriculumOpen, setCurriculumOpen] = useState(false);
  const [mappings, setMappings] = useState([]);
  const [adding, setAdding] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState({ open: false, id: null });
  // const [editDialog, setEditDialog] = useState({
  //   open: false,
  //   id: null,
  //   curriculum_id: "",
  // });

  const [userID, setUserID] = useState("");
  const [user, setUser] = useState("");
  const [userRole, setUserRole] = useState("");
  const [hasAccess, setHasAccess] = useState(null);
  const [canCreate, setCanCreate] = useState(false);
  const [canEdit, setCanEdit] = useState(false);
  const [canDelete, setCanDelete] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mappingsLoading, setMappingsLoading] = useState(false);
  const [snack, setSnack] = useState({
    open: false,
    message: "",
    severity: "success",
  });
  const pageId = 107;

  const [employeeID, setEmployeeID] = useState("");
  const permissionHeaders = {
    headers: {
      ...getFlatAuditHeaders(),
      "x-employee-id": employeeID,
      "x-page-id": pageId,
      "x-audit-actor-id": employeeID,
      "x-audit-actor-role": userRole || localStorage.getItem("role") || "registrar",
    },
  };

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
      const response = await axios.get(`${API_BASE_URL}/api/page_access/${employeeID}/${pageId}`);
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
      console.error('Error checking access:', error);
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



  // function openEditDialog(mapping) {
  //   setEditDialog({
  //     open: true,
  //     id: mapping.dprtmnt_curriculum_id,
  //     curriculum_id: mapping.curriculum_id,
  //   });
  // }

  // function closeEditDialog() {
  //   setEditDialog({ open: false, id: null, curriculum_id: "" });
  // }

  function openEditDialog() {
    if (!canEdit) {
      setSnack({
        open: true,
        message: "You do not have permission to edit this item",
        severity: "error",
      });
      return;
    }

    setSnack({
      open: true,
      message: "Edit mapping is not available on this panel yet.",
      severity: "info",
    });
  }


  // async function handleEditSave() {
  //   try {
  //     await axios.put(`${API_BASE_URL}/dprtmnt_curriculum/${editDialog.id}`, {
  //       curriculum_id: editDialog.curriculum_id,
  //       dprtmnt_id: selectedDept
  //     });

  //     fetchMappings(selectedDept);
  //     closeEditDialog();
  //   } catch (err) {
  //     console.error("Update error:", err);
  //     alert(err.response?.data?.message || "Failed to update mapping");
  //   }
  // }



  useEffect(() => {
    fetchDepartments();
    fetchCurriculums();
  }, []);

  useEffect(() => {
    setSelectedCurr("");
    setCurriculumOpen(false);
    if (selectedDept) fetchMappings(selectedDept);
    else setMappings([]);
  }, [selectedDept]);

  async function fetchDepartments() {
    try {
      const { data } = await axios.get(`${API_BASE_URL}/api/departments`);
      setDepartments(data);
    } catch (err) {
      console.error("Failed to fetch departments", err);
    }
  }
  const [program, setProgram] = useState({ name: "", code: "", major: "" });
  const [programs, setPrograms] = useState([]);

  const fetchProgram = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/get_program`);
      setPrograms(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchProgram();
  }, []);

  const getBranchLabel = (branchId) => {
    const branch = branches.find((item) => Number(item.id) === Number(branchId));
    return branch?.branch || "�";
  };


  async function fetchCurriculums() {
    try {
      const { data } = await axios.get(`${API_BASE_URL}/api/get_curriculum`);
      setCurriculums(data);
    } catch (err) {
      console.error("Failed to fetch curriculums", err);
    }
  }

  async function fetchMappings(dprtmnt_id) {
    setMappingsLoading(true);
    try {
      const { data } = await axios.get(`${API_BASE_URL}/api/dprtmnt_curriculum/${dprtmnt_id}`);
      setMappings(data || []);
    } catch (err) {
      console.error("Failed to fetch mappings", err);
      setMappings([]);
    } finally {
      setMappingsLoading(false);
    }
  }

  async function handleAddMapping() {
    if (!selectedDept || !selectedCurr) return;

    if (!canCreate) {
      setSnack({
        open: true,
        message: "You do not have permission to create items on this page",
        severity: "error",
      });
      return;
    }

    setAdding(true);
    try {
      await axios.post(`${API_BASE_URL}/api/dprtmnt_curriculum`, {
        dprtmnt_id: selectedDept,
        curriculum_id: selectedCurr,
      }, permissionHeaders);
      // refresh
      fetchMappings(selectedDept);
      setSelectedCurr("");
    } catch (err) {
      console.error("Error adding mapping:", err.response?.data || err);
      alert(err.response?.data?.message || "Failed to add data");
    } finally {
      setAdding(false);
    }
  }

  function openDeleteDialog(id) {
    setConfirmDelete({ open: true, id });
  }
  function closeDeleteDialog() {
    setConfirmDelete({ open: false, id: null });
  }

  async function handleDelete() {
    const id = confirmDelete.id;
    if (!id) return;

    if (!canDelete) {
      setSnack({
        open: true,
        message: "You do not have permission to delete this item",
        severity: "error",
      });
      closeDeleteDialog();
      return;
    }

    try {
      await axios.delete(`${API_BASE_URL}/api/dprtmnt_curriculum/${id}`, permissionHeaders);
      fetchMappings(selectedDept);
      closeDeleteDialog();
    } catch (err) {
      console.error("Error deleting mapping:", err);
      alert("Failed to delete mapping");
    }
  }

  const formatSchoolYear = (yearDesc) => {
    if (!yearDesc) return "";
    const startYear = Number(yearDesc);
    if (isNaN(startYear)) return yearDesc; // safe fallback
    return `${startYear} - ${startYear + 1}`;
  };



  // Put this at the very bottom before the return 
  if (loading || hasAccess === null) {
    return <LoadingOverlay open={loading} message="Loading..." />;
  }

  if (!hasAccess) {
    return (
      <Unauthorized />
    );
  }

  const showCreateActions = canCreate;
  const showActionColumn = canEdit || canDelete;
  const hasSelectedDept =
    selectedDept !== "" && selectedDept !== null && selectedDept !== undefined;
  const mappedCurriculumIds = new Set(
    mappings.map((mapping) => String(mapping.curriculum_id))
  );
  const filteredCurriculums = curriculums
    .filter(
      (curriculum, index, list) =>
        index ===
        list.findIndex(
          (item) => String(item.curriculum_id) === String(curriculum.curriculum_id)
        ) &&
        !mappedCurriculumIds.has(String(curriculum.curriculum_id))
    )
    .sort((a, b) => Number(a.year_description) - Number(b.year_description)); // ← add this

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
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: 4,
          alignItems: 'stretch',
          mb: 2,

        }}
      >
        <Typography
          variant="h4"
          sx={{
            fontWeight: 'bold',
            color: titleColor,
            fontSize: '36px',
          }}
        >
          DEPARTMENT CURRICULUM PANEL
        </Typography>




      </Box>
      <hr style={{ border: "1px solid #ccc", width: "100%" }} />

      <br />
      <br />
      <TableContainer component={Paper} sx={{ width: '100%', border: `1px solid ${borderColor}`, }}>
        <Table>
          <TableHead sx={{ backgroundColor: headerColor, }}>
            <TableRow>
              <TableCell sx={{ color: 'white', textAlign: "Center" }}>Select Department Curriculum Panel</TableCell>
            </TableRow>
          </TableHead>
        </Table>
      </TableContainer>
      <Paper
        elevation={3}
        sx={{
          p: 3,
          border: `1px solid ${borderColor}`,

        }}
      >

        <Grid container spacing={2} alignItems="center" sx={{ mb: 2 }}>
          <Grid item>
            <Typography variant="body1" fontWeight="bold">
              Select Department:
            </Typography>
          </Grid>

          <Grid item>
            <FormControl size="small" sx={{ minWidth: 240 }}>
              <InputLabel>Department</InputLabel>
              <Select
                label="Department"
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
              >
                <MenuItem value="">
                  <em>Choose department</em>
                </MenuItem>
                {departments.map((d) => (
                  <MenuItem key={d.dprtmnt_id} value={d.dprtmnt_id}>
                    {d.dprtmnt_name} ({d.dprtmnt_code})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item>
            <Typography variant="body1" fontWeight="bold">
              Select Curriculum:
            </Typography>
          </Grid>

          <Grid item>
            <Autocomplete
              sx={{ minWidth: 500 }}
              options={hasSelectedDept ? filteredCurriculums : []}
              disabled={!hasSelectedDept}
              open={hasSelectedDept && curriculumOpen}
              onOpen={() => {
                if (hasSelectedDept) setCurriculumOpen(true);
              }}
              onClose={() => setCurriculumOpen(false)}
              noOptionsText={
                hasSelectedDept
                  ? "No available curriculum for this department"
                  : "Select a department first"
              }
              getOptionLabel={(c) =>
                `${formatSchoolYear(c.year_description)}: (${c.program_code}) ${c.program_description}${c.major ? ` (${c.major})` : ""
                } (${getBranchLabel(c.components)})`
              }
              value={
                filteredCurriculums.find(
                  (c) => String(c.curriculum_id) === String(selectedCurr)
                ) || null
              }
              onChange={(event, newValue) => {
                if (!hasSelectedDept) return;
                setSelectedCurr(newValue ? newValue.curriculum_id : "");
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label={hasSelectedDept ? "Search Curriculum" : "Select department first"}
                  size="small"
                  disabled={!hasSelectedDept}
                />
              )}
            />
          </Grid>

          <Grid item>
            {showCreateActions && (
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={handleAddMapping}
                disabled={!hasSelectedDept || !selectedCurr || adding}
              >
                {adding ? <CircularProgress size={18} /> : "Add"}
              </Button>
            )}
          </Grid>
        </Grid>
      </Paper>


      <Box>
        {mappingsLoading ? (
          <CircularProgress />
        ) : (
          <>


            <Table size="small">
              <TableHead>
                <TableRow style={{
                  border: `1px solid ${borderColor}`,
                  backgroundColor: headerColor,
                  color: "#fff",
                  width: "10%",
                  textAlign: "center",
                }}>
                  <TableCell sx={{ color: "#fff", border: `1px solid ${borderColor}`, textAlign: "center", }}>#</TableCell>
                  <TableCell sx={{ color: "#fff", border: `1px solid ${borderColor}`, textAlign: "center", }}>Department</TableCell>
                  <TableCell sx={{ color: "#fff", border: `1px solid ${borderColor}`, textAlign: "center", }}>Program Code</TableCell>
                  <TableCell sx={{ color: "#fff", border: `1px solid ${borderColor}`, textAlign: "center", }}>Program Description</TableCell>
                  <TableCell sx={{ color: "#fff", border: `1px solid ${borderColor}`, textAlign: "center", }}>Major</TableCell>
                  <TableCell sx={{ color: "#fff", border: `1px solid ${borderColor}`, textAlign: "center", }}>Curriculum</TableCell>


                  {showActionColumn && (
                    <TableCell sx={{ color: "#fff", border: `1px solid ${borderColor}`, textAlign: "center", }}>Action</TableCell>
                  )}
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
                {mappings.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6}><em>No Department</em></TableCell>
                  </TableRow>
                ) : (
                  mappings.map((m, index) => (
                    <TableRow key={m.dprtmnt_curriculum_id}>

                      <TableCell sx={{ border: `1px solid ${borderColor}`, textAlign: "center" }}>{index + 1}</TableCell>

                      {/* Department */}
                      <TableCell sx={{ border: `1px solid ${borderColor}`, textAlign: "center" }}>
                        {m.dprtmnt_code} — {m.dprtmnt_name}
                      </TableCell>

                      <TableCell sx={{ border: `1px solid ${borderColor}`, textAlign: "center" }}>
                        {m.p_code || ""}

                      </TableCell>

                      <TableCell sx={{ border: `1px solid ${borderColor}`, textAlign: "center" }}>
                        {m.p_description || ""}

                      </TableCell>

                      <TableCell sx={{ border: `1px solid ${borderColor}`, textAlign: "center" }}>
                        {m.p_major && (
                          <Typography variant="body2">
                            {m.p_major}
                          </Typography>
                        )}
                      </TableCell>

                      {/* Program Code / Description */}
                      <TableCell sx={{ border: `1px solid ${borderColor}`, textAlign: "center" }}>
                        {m.year_description && (
                          <Typography variant="body2">
                            {formatSchoolYear(m.year_description)}
                          </Typography>
                        )}
                      </TableCell>


                      {/* Actions */}
                      {showActionColumn && (
                        <TableCell
                          sx={{
                            border: `1px solid ${borderColor}`,
                            textAlign: "center",
                            width: "250px",
                          }}
                        >
                          <Box
                            sx={{
                              display: "flex",
                              flexDirection: "row", // Changed from column to row
                              justifyContent: "center",
                              alignItems: "center",
                              gap: 1,
                            }}
                          >
                            {canEdit && (
                              <Button
                                variant="contained"
                                size="small"
                                sx={{
                                  backgroundColor: "green",
                                  color: "white",
                                  borderRadius: "5px",
                                  padding: "8px",
                                  width: "100px",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  gap: "5px",
                                  cursor: "pointer",
                                  "&:hover": {
                                    backgroundColor: "#0b7a0b",
                                  },
                                }}
                                onClick={() => openEditDialog(m)}
                              >
                                <EditIcon fontSize="small" /> Edit
                              </Button>
                            )}

                            {canDelete && (
                              <Button
                                variant="contained"
                                size="small"
                                sx={{
                                  backgroundColor: "#9E0000",
                                  color: "white",
                                  borderRadius: "5px",
                                  padding: "8px",
                                  width: "100px",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  gap: "5px",
                                  cursor: "pointer",
                                  "&:hover": {
                                    backgroundColor: "#7a0000",
                                  },
                                }}
                                onClick={() => openDeleteDialog(m.dprtmnt_curriculum_id)}
                              >
                                <DeleteIcon fontSize="small" /> Delete
                              </Button>
                            )}
                          </Box>
                        </TableCell>
                      )}


                    </TableRow>
                  ))
                )}
              </TableBody>


            </Table>
          </>
        )}
      </Box>


      <Dialog
        open={confirmDelete.open}
        onClose={closeDeleteDialog}
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
        <DialogTitle
          sx={{
            background: headerColor,
            color: "#fff",
            fontWeight: 700,
            fontSize: "1.2rem",
            py: 2,
          }}
        >
          Delete Department Curriculum Mapping
        </DialogTitle>

        <DialogContent sx={{ p: 3, mt: 2 }}>
          <Typography sx={{ mb: 2 }}>
            Are you sure you want to remove this department ↔ curriculum mapping?
          </Typography>

          <Typography
            sx={{
              color: "#d32f2f",
              fontSize: "0.95rem",
            }}
          >
            Deleting this mapping will permanently remove the association between the
            selected department and curriculum.
            <br />
            Any academic processes, curriculum assignments, or records that depend on
            this mapping may be affected.
          </Typography>
        </DialogContent>

        <DialogActions
          sx={{
            px: 3,
            py: 2,
            borderTop: "1px solid #e0e0e0",
          }}
        >
          <Button
            color="error"
            variant="outlined"
            onClick={closeDeleteDialog}
          >
            Cancel
          </Button>

          <Button
            color="error"
            variant="contained"
            onClick={handleDelete}
          >
            Yes, Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* <Dialog open={editDialog.open} onClose={closeEditDialog}>
        <DialogTitle>Edit Mapping</DialogTitle>

        <DialogContent>
          <FormControl fullWidth size="small" sx={{ mt: 2 }}>
            <InputLabel>Curriculum</InputLabel>
            <Select
              label="Curriculum"
              value={editDialog.curriculum_id}
              onChange={(e) =>
                setEditDialog({ ...editDialog, curriculum_id: e.target.value })
              }
            >
              {curriculums.map((c) => (
                <MenuItem key={c.curriculum_id} value={c.curriculum_id}>
                  {c.curriculum_id} — {c.program_description || c.program_code || c.p_description || c.p_code}
                  ({c.year_description})
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>

        <DialogActions>
          <Button onClick={closeEditDialog}>Cancel</Button>
          <Button variant="contained" onClick={handleEditSave}>
            Save Changes
          </Button>
        </DialogActions>
      </Dialog> */}

      <Snackbar
        open={snack.open}
        autoHideDuration={3000}
        onClose={() => setSnack((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          severity={snack.severity}
          onClose={() => setSnack((prev) => ({ ...prev, open: false }))}
          sx={{ width: "100%" }}
        >
          {snack.message}
        </Alert>
      </Snackbar>

    </Box>
  );
}

