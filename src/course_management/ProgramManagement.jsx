import React, { useState, useEffect, useContext, useRef } from "react";
import { SettingsContext } from "../App";
import axios from "axios";
import { Box, Typography, Snackbar, Alert, Button } from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import Unauthorized from "../components/Unauthorized";
import LoadingOverlay from "../components/LoadingOverlay";
import API_BASE_URL from "../apiConfig";
import { TextField } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import { FaFileExcel } from "react-icons/fa";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  Paper,
  Grid,
  FormControl,
  Select,
  MenuItem,
} from "@mui/material";
import SaveIcon from "@mui/icons-material/Save";
import { getFlatAuditHeaders } from "../utils/auditEvents";
import useAuditMac from "../utils/useAuditMac";

const cleanSearchValue = (value) => {
  if (value === null || value === undefined) return "";
  const text = String(value).trim();
  return ["null", "undefined"].includes(text.toLowerCase()) ? "" : text;
};

const getProgramSearchText = (program) =>
  [
    program?.program_code,
    program?.program_description,
    program?.major,
    program?.dprtmnt_name,
  ]
    .map(cleanSearchValue)
    .join(" ")
    .toLowerCase();

const getProgramSuggestionValue = (program) =>
  cleanSearchValue(program?.program_code) ||
  cleanSearchValue(program?.program_description);

const ProgramManagement = () => {
  useAuditMac();
  const settings = useContext(SettingsContext);
  const colors = settings?.colors || {};
  const titleColor = colors.title || "#000000";
  const borderColor = colors.border || "#000000";
  const headerColor = colors.header || "#1976d2";
  const branches = settings?.branches || [];

  const [program, setProgram] = useState({
    name: "",
    code: "",
    major: "",
    components: "",
    academic_program: "",
  });

  const getDefaultCampusValue = () =>
    branches.length > 0 ? String(branches[0].id) : "";

  const [programs, setPrograms] = useState([]);
  const [canCreate, setCanCreate] = useState(false);
  const [canDelete, setCanDelete] = useState(false);
  const [canEdit, setCanEdit] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editId, setEditId] = useState(null);
  const [userID, setUserID] = useState("");
  const [user, setUser] = useState("");
  const [userRole, setUserRole] = useState("");
  const [hasAccess, setHasAccess] = useState(null);
  const [loading, setLoading] = useState(false);
  const pageId = 34;
  const [employeeID, setEmployeeID] = useState("");

  const getPermissionHeaders = () => ({
    ...getFlatAuditHeaders(),
    "x-employee-id": employeeID || localStorage.getItem("employee_id") || "",
    "x-audit-actor-id":
      employeeID ||
      localStorage.getItem("employee_id") ||
      localStorage.getItem("email") ||
      "unknown",
    "x-audit-actor-role": userRole || localStorage.getItem("role") || "administrator",
    "x-page-id": pageId,
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
      if (["administrator", "superadmin", "technical"].includes(storedRole)) {
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
        `${API_BASE_URL}/api/page_access/${employeeID}/${pageId}`, { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` } },
      );
      if (response.data && Number(response.data.page_privilege) === 1) {
        setHasAccess(true);
        setCanCreate(Number(response.data?.can_create) === 1);
        setCanDelete(Number(response.data?.can_delete) === 1);
        setCanEdit(Number(response.data?.can_edit) === 1);
      } else {
        setHasAccess(false);
        setCanCreate(false);
        setCanDelete(false);
        setCanEdit(false);
      }
    } catch (error) {
      console.error("Error checking access:", error);
      setHasAccess(false);
      setCanCreate(false);
      setCanDelete(false);
      setCanEdit(false);
      if (error.response && error.response.data.message) {
        console.log(error.response.data.message);
      } else {
        console.log("An unexpected error occurred.");
      }
      setLoading(false);
    }
  };

  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  const importInputRef = useRef(null);
  const [importingXlsx, setImportingXlsx] = useState(false);

  const fetchPrograms = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/get_program`, { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` } });
      setPrograms(res.data);
    } catch (err) {
      console.error("Error fetching programs:", err);
    }
  };

  useEffect(() => {
    fetchPrograms();
  }, []);

  const handleChangesForEverything = (e) => {
    const { name, value } = e.target;
    setProgram((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddingProgram = async () => {
    if (!program.name || !program.code) {
      setSnackbar({
        open: true,
        message: "Please fill all fields",
        severity: "error",
      });
      return false;
    }

    // ✅ Fixed: Changed editingId to editId
    if (editId && !canEdit) {
      setSnackbar({
        open: true,
        message: "You do not have permission to edit this item",
        severity: "error",
      });
      return false;
    }

    if (!editId && !canCreate) {
      setSnackbar({
        open: true,
        message: "You do not have permission to create items on this page",
        severity: "error",
      });
      return false;
    }

    const programPayload = {
      ...program,
      components: program.components || getDefaultCampusValue(),
    };

    try {
      if (editMode) {
        await axios.put(`${API_BASE_URL}/api/program/${editId}`, programPayload, {
          headers: getPermissionHeaders(),
        });
        setSnackbar({
          open: true,
          message: "Program updated successfully!",
          severity: "success",
        });
      } else {
        await axios.post(`${API_BASE_URL}/api/program`, programPayload, {
          headers: getPermissionHeaders(),
        });
        setSnackbar({
          open: true,
          message: "Program added successfully!",
          severity: "success",
        });
      }
      setProgram({
        name: "",
        code: "",
        major: "",
        components: "",
        academic_program: "",
      });
      setEditMode(false);
      setEditId(null);
      fetchPrograms();
      return true;
    } catch (err) {
      console.error("Error saving program:", err);
      setSnackbar({
        open: true,
        message: err.response?.data?.message || "Error saving program!",
        severity: "error",
      });
      return false;
    }
  };

  const [openProgramDialog, setOpenProgramDialog] = useState(false);

  const handleEdit = (prog) => {
    if (!canEdit) {
      setSnackbar({
        open: true,
        message: "You do not have permission to edit this item",
        severity: "error",
      });
      return;
    }

    setProgram({
      name: prog.program_description,
      code: prog.program_code,
      major: prog.major || "",
      components: String(prog.components ?? ""),
      academic_program: String(prog.academic_program ?? ""),  // already correct
    });
    setEditMode(true);
    setEditId(prog.program_id);
    setOpenProgramDialog(true);
  };
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [programToDelete, setProgramToDelete] = useState(null);

  const handleDelete = async (id) => {
    if (!canDelete) {
      setSnackbar({
        open: true,
        message: "You do not have permission to delete this item",
        severity: "error",
      });
      return;
    }

    try {
      await axios.delete(`${API_BASE_URL}/api/program/${id}`, {
        headers: getPermissionHeaders(),
      });
      fetchPrograms();
      setSnackbar({
        open: true,
        message: "Program deleted successfully!",
        severity: "success",
      });
    } catch (err) {
      console.error("Error deleting program:", err);
      setSnackbar({
        open: true,
        message: "Error deleting program!",
        severity: "error",
      });
    }
  };

  const [searchQuery, setSearchQuery] = useState("");
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);

  const getCampusName = (components) => {
    const branch = branches.find(
      (item) => Number(item.id) === Number(components),
    );
    return branch?.branch || "—";
  };

  const filteredPrograms = programs.filter((prog) => {
    const q = searchQuery.toLowerCase();
    return (
      prog.program_description?.toLowerCase().includes(q) ||
      prog.program_code?.toLowerCase().includes(q) ||
      prog.major?.toLowerCase().includes(q) ||
      getCampusName(prog.components).toLowerCase().includes(q)
    );
  });
  const programSuggestions =
    searchQuery.trim().length >= 2
      ? programs
          .filter((prog) =>
            getProgramSearchText(prog).includes(searchQuery.trim().toLowerCase()),
          )
          .slice(0, 10)
      : [];

  const handleCloseSnackbar = () => {
    setSnackbar((prev) => ({ ...prev, open: false }));
  };

  const handleProgramImport = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!canCreate) {
      setSnackbar({
        open: true,
        message: "You do not have permission to create items on this page.",
        severity: "error",
      });
      event.target.value = "";
      return;
    }

    try {
      setImportingXlsx(true);
      const formData = new FormData();
      formData.append("file", file);
      const response = await axios.post(
        `${API_BASE_URL}/api/import-program-xlsx`,
        formData,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
            ...getPermissionHeaders(),
            "Content-Type": "multipart/form-data",
          },
        },
      );
      if (response.data?.success) {
        setSnackbar({
          open: true,
          message: response.data.message || "Program import completed.",
          severity: "success",
        });
        fetchPrograms();
      } else {
        setSnackbar({
          open: true,
          message: response.data?.error || "Program import failed.",
          severity: "error",
        });
      }
    } catch (error) {
      setSnackbar({
        open: true,
        message: error.response?.data?.error || "Program import failed.",
        severity: "error",
      });
    } finally {
      setImportingXlsx(false);
      event.target.value = "";
    }
  };

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  const totalPages = Math.ceil(filteredPrograms.length / itemsPerPage);

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentPrograms = filteredPrograms.slice(
    indexOfFirstItem,
    indexOfLastItem,
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  if (loading || hasAccess === null) {
    return <LoadingOverlay open={loading} message="Loading..." />;
  }

  if (!hasAccess) {
    return <Unauthorized />;
  }

  const showCreateActions = canCreate;
  const showActionColumn = canEdit || canDelete;

  // ✅ Styles now INSIDE the component
  const styles = {
    container: {
      display: "flex",
      justifyContent: "space-between",
      gap: "20px",
      flexWrap: "wrap",
    },
    formGroup: { marginBottom: "20px" },
    label: {
      display: "block",
      marginBottom: "8px",
      fontWeight: "bold",
      color: "#444",
      fontSize: "16px",
    },
    input: {
      width: "100%",
      padding: "12px",
      fontSize: "16px",
      borderRadius: "5px",
      border: "1px solid #ccc",
    },
    table: { width: "100%", borderCollapse: "collapse" },
    th: {
      padding: "8px",
      textAlign: "center",
      fontWeight: "bold",
      border: `1px solid ${borderColor}`,
      fontSize: "16px",
      color: "#000",
    },
    td: {
      padding: "8px",
      textAlign: "left",
      borderBottom: "1px solid #ddd",
      fontSize: "16px",
      border: `1px solid ${borderColor}`,
    },
    editButton: {
      backgroundColor: "green",
      color: "white",
      border: "none",
      borderRadius: "5px",
      padding: "8px 14px",
      marginRight: "6px",
      cursor: "pointer",
      width: "100px",
      height: "40px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: "5px",
      transition: "opacity 0.2s",
    },
    deleteButton: {
      backgroundColor: "#9E0000",
      color: "white",
      border: "none",
      borderRadius: "5px",
      padding: "8px 14px",
      cursor: "pointer",
      width: "100px",
      height: "40px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: "5px",
      transition: "opacity 0.2s",
    },
  };

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
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          mb: 2,
        }}
      >
        <Typography
          variant="h4"
          sx={{ fontWeight: "bold", color: titleColor, fontSize: "36px" }}
        >
          PROGRAM MANAGEMENT
        </Typography>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            flexWrap: "wrap",
            justifyContent: "flex-end",
          }}
        >
          <Box sx={{ position: "relative", width: 450, maxWidth: "100%" }}>
            <TextField
              variant="outlined"
              placeholder="Search Program Description / Code / Major"
              size="small"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setSuggestionsOpen(true);
              }}
              onFocus={() => {
                if (searchQuery.trim().length >= 2) setSuggestionsOpen(true);
              }}
              onBlur={() => {
                setTimeout(() => setSuggestionsOpen(false), 150);
              }}
              sx={{
                width: "100%",
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
            {suggestionsOpen && searchQuery.trim().length >= 2 && (
              <Box
                sx={{
                  position: "absolute",
                  top: "calc(100% + 4px)",
                  left: 0,
                  right: 0,
                  zIndex: 20,
                  backgroundColor: "#fff",
                  border: "1px solid #d0d0d0",
                  borderRadius: "8px",
                  boxShadow: "0 8px 24px rgba(0,0,0,0.14)",
                  overflow: "hidden",
                  maxHeight: 320,
                }}
              >
                {programSuggestions.length > 0 ? (
                  programSuggestions.map((prog) => (
                    <Box
                      key={prog.program_id}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setSearchQuery(getProgramSuggestionValue(prog));
                        setCurrentPage(1);
                        setSuggestionsOpen(false);
                      }}
                      sx={{
                        px: 2,
                        py: 1,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                        fontSize: 14,
                        borderBottom: "1px solid #f0f0f0",
                        "&:hover": { backgroundColor: "#f5f7fb" },
                      }}
                    >
                      <Typography sx={{ fontSize: 14, fontWeight: 700 }}>
                        {cleanSearchValue(prog.program_code) || "N/A"}
                      </Typography>
                      <Typography sx={{ fontSize: 14, color: "#555" }}>|</Typography>
                      <Typography sx={{ fontSize: 14 }} noWrap>
                        {cleanSearchValue(prog.program_description) || "Unnamed Program"}
                        {prog.major ? ` (${prog.major})` : ""}
                      </Typography>
                    </Box>
                  ))
                ) : (
                  <Box sx={{ px: 2, py: 1.25, fontSize: 13, color: "#666" }}>
                    No matching programs found
                  </Box>
                )}
              </Box>
            )}
          </Box>
          <input
            ref={importInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleProgramImport}
            style={{ display: "none" }}
          />
          {showCreateActions && (
            <Button
              variant="contained"
              onClick={() => importInputRef.current?.click()}
              disabled={importingXlsx}
              sx={{
                height: 40,
                textTransform: "none",
                fontWeight: "bold",
                minWidth: 170,
              }}
            >
              <FaFileExcel style={{ marginRight: 8 }} />
              {importingXlsx ? "Importing..." : "Import Program"}
            </Button>
          )}
          <Button
            onClick={() => {
              window.location.href = `${API_BASE_URL}/api/program_panel_template`;
            }}
            sx={{
              height: 40,
              color: "black",
              border: "2px solid black",
              backgroundColor: "#f0f0f0",
              textTransform: "none",
              fontWeight: "bold",
              minWidth: 165,
            }}
          >
            📥 Download Template
          </Button>
        </Box>
      </Box>
      <hr style={{ border: "1px solid #ccc", width: "100%" }} />
      <br />
      <br />
      <div style={styles.formSection}>
        <TableContainer component={Paper} sx={{ width: "100%" }}>
          <Table size="small">
            <TableHead sx={{ backgroundColor: headerColor, color: "white" }}>
              <TableRow>
                <TableCell
                  colSpan={20}
                  sx={{
                    border: `1px solid ${borderColor}`,
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
                    sx={{ padding: "6px" }}
                  >
                    {/* LEFT SIDE - TOTAL PROGRAM */}
                    <Typography fontSize="14px" fontWeight="bold" color="white">
                      Total Programs Records: {filteredPrograms.length}
                    </Typography>
                    {/* RIGHT SIDE - PAGINATION */}
                    <Box
                      display="flex"
                      alignItems="center"
                      gap={1}
                      flexWrap="wrap"
                    >
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
                          "&:hover": {
                            borderColor: "white",
                            backgroundColor: "rgba(255,255,255,0.1)",
                          },
                          "&.Mui-disabled": {
                            color: "white",
                            borderColor: "white",
                            backgroundColor: "transparent",
                            opacity: 1,
                          },
                        }}
                      >
                        First
                      </Button>
                      <Button
                        onClick={() =>
                          setCurrentPage((prev) => Math.max(prev - 1, 1))
                        }
                        disabled={currentPage === 1}
                        variant="outlined"
                        size="small"
                        sx={{
                          minWidth: 80,
                          color: "white",
                          borderColor: "white",
                          backgroundColor: "transparent",
                          "&:hover": {
                            borderColor: "white",
                            backgroundColor: "rgba(255,255,255,0.1)",
                          },
                          "&.Mui-disabled": {
                            color: "white",
                            borderColor: "white",
                            backgroundColor: "transparent",
                            opacity: 1,
                          },
                        }}
                      >
                        Prev
                      </Button>
                      {/* Page Dropdown */}
                      <FormControl size="small" sx={{ minWidth: 80 }}>
                        <Select
                          value={currentPage}
                          onChange={(e) =>
                            setCurrentPage(Number(e.target.value))
                          }
                          displayEmpty
                          sx={{
                            fontSize: "12px",
                            height: 36,
                            color: "white",
                            border: "1px solid white",
                            backgroundColor: "transparent",
                            ".MuiOutlinedInput-notchedOutline": {
                              borderColor: "white",
                            },
                            "&:hover .MuiOutlinedInput-notchedOutline": {
                              borderColor: "white",
                            },
                            "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                              borderColor: "white",
                            },
                            "& svg": {
                              color: "white",
                            },
                          }}
                          MenuProps={{
                            PaperProps: {
                              sx: {
                                maxHeight: 200,
                                backgroundColor: "#fff",
                              },
                            },
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
                        of {totalPages} page{totalPages > 1 ? "s" : ""}
                      </Typography>
                      {/* Next & Last */}
                      <Button
                        onClick={() =>
                          setCurrentPage((prev) =>
                            Math.min(prev + 1, totalPages),
                          )
                        }
                        disabled={currentPage === totalPages}
                        variant="outlined"
                        size="small"
                        sx={{
                          minWidth: 80,
                          color: "white",
                          borderColor: "white",
                          backgroundColor: "transparent",
                          "&:hover": {
                            borderColor: "white",
                            backgroundColor: "rgba(255,255,255,0.1)",
                          },
                          "&.Mui-disabled": {
                            color: "white",
                            borderColor: "white",
                            backgroundColor: "transparent",
                            opacity: 1,
                          },
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
                          "&:hover": {
                            borderColor: "white",
                            backgroundColor: "rgba(255,255,255,0.1)",
                          },
                          "&.Mui-disabled": {
                            color: "white",
                            borderColor: "white",
                            backgroundColor: "transparent",
                            opacity: 1,
                          },
                        }}
                      >
                        Last
                      </Button>
                      {showCreateActions && (
                        <Button
                          variant="contained"
                          sx={{
                            backgroundColor: "#1976d2",
                            color: "#fff",
                            fontWeight: "bold",
                            borderRadius: "8px",
                            width: "250px",
                            textTransform: "none",
                            px: 2,
                            mr: "15px",
                            "&:hover": {
                              backgroundColor: "#1565c0",
                            },
                          }}
                          onClick={() => {
                            setProgram({
                              name: "",
                              code: "",
                              major: "",
                              components: getDefaultCampusValue(),
                              academic_program: "",
                            });
                            setEditMode(false);
                            setOpenProgramDialog(true);
                          }}
                        >
                          + Add Program
                        </Button>
                      )}
                    </Box>
                  </Box>
                </TableCell>
              </TableRow>
            </TableHead>
          </Table>
        </TableContainer>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={{ ...styles.th, backgroundColor: "#f5f5f5" }}>ID</th>
              <th style={{ ...styles.th, backgroundColor: "#f5f5f5" }}>
                Description
              </th>
              <th style={{ ...styles.th, backgroundColor: "#f5f5f5" }}>Code</th>
              <th style={{ ...styles.th, backgroundColor: "#f5f5f5" }}>
                Major
              </th>
              <th style={{ ...styles.th, backgroundColor: "#f5f5f5" }}>
                Campus
              </th>
              <th style={{ ...styles.th, backgroundColor: "#f5f5f5" }}>
                Academic Program
              </th>
              {showActionColumn && (
                <th style={{ ...styles.th, backgroundColor: "#f5f5f5" }}>
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {currentPrograms.map((prog, index) => (
              <tr key={prog.program_id}
                style={{
                  backgroundColor: index % 2 === 0 ? "#ffffff" : "lightgray",
                }}>
                <td style={styles.td}>{indexOfFirstItem + index + 1}</td>
                <td style={styles.td}>{prog.program_description}</td>
                <td style={styles.td}>{prog.program_code}</td>
                <td style={styles.td}>{prog.major || "—"}</td>
                <td style={styles.td}>{getCampusName(prog.components)}</td>
                <td style={styles.td}>
                  {prog.academic_program === 0
                    ? "Undergraduate"
                    : prog.academic_program === 1
                      ? "Graduate"
                      : prog.academic_program === 2
                        ? "Techvoc"
                        : "—"}
                </td>
                {showActionColumn && (
                  <td style={{ ...styles.td, textAlign: "center" }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "center",
                        gap: "8px",
                      }}
                    >
                      {canEdit && (
                        <button
                          onClick={() => handleEdit(prog)}
                          style={{
                            ...styles.editButton,
                            cursor: "pointer",
                          }}
                        >
                          <EditIcon fontSize="small" /> Edit
                        </button>
                      )}
                      {canDelete && (
                        <button
                          onClick={() => {
                            setProgramToDelete(prog);
                            setOpenDeleteDialog(true);
                          }}
                          style={{
                            ...styles.deleteButton,
                            cursor: "pointer",
                          }}
                        >
                          <DeleteIcon fontSize="small" /> Delete
                        </button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        {programs.length === 0 && <p>No programs available.</p>}
        <TableContainer component={Paper} sx={{ width: "100%" }}>
          <Table size="small">
            <TableHead sx={{ backgroundColor: "#6D2323", color: "white" }}>
              <TableRow>
                <TableCell
                  colSpan={20}
                  sx={{
                    border: `1px solid ${borderColor}`,
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
                    sx={{ padding: "6px" }}
                  >
                    {/* LEFT SIDE - TOTAL PROGRAM */}
                    <Typography fontSize="14px" fontWeight="bold" color="white">
                      Total Programs Records: {filteredPrograms.length}
                    </Typography>
                    {/* RIGHT SIDE - PAGINATION */}
                    <Box
                      display="flex"
                      alignItems="center"
                      gap={1}
                      flexWrap="wrap"

                    >
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
                          "&:hover": {
                            borderColor: "white",
                            backgroundColor: "rgba(255,255,255,0.1)",
                          },
                          "&.Mui-disabled": {
                            color: "white",
                            borderColor: "white",
                            backgroundColor: "transparent",
                            opacity: 1,
                          },
                        }}
                      >
                        First
                      </Button>
                      <Button
                        onClick={() =>
                          setCurrentPage((prev) => Math.max(prev - 1, 1))
                        }
                        disabled={currentPage === 1}
                        variant="outlined"
                        size="small"
                        sx={{
                          minWidth: 80,
                          color: "white",
                          borderColor: "white",
                          backgroundColor: "transparent",
                          "&:hover": {
                            borderColor: "white",
                            backgroundColor: "rgba(255,255,255,0.1)",
                          },
                          "&.Mui-disabled": {
                            color: "white",
                            borderColor: "white",
                            backgroundColor: "transparent",
                            opacity: 1,
                          },
                        }}
                      >
                        Prev
                      </Button>
                      {/* Page Dropdown */}
                      <FormControl size="small" sx={{ minWidth: 80 }}>
                        <Select
                          value={currentPage}
                          onChange={(e) =>
                            setCurrentPage(Number(e.target.value))
                          }
                          displayEmpty
                          sx={{
                            fontSize: "12px",
                            height: 36,
                            color: "white",
                            border: "1px solid white",
                            backgroundColor: "transparent",
                            ".MuiOutlinedInput-notchedOutline": {
                              borderColor: "white",
                            },
                            "&:hover .MuiOutlinedInput-notchedOutline": {
                              borderColor: "white",
                            },
                            "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                              borderColor: "white",
                            },
                            "& svg": {
                              color: "white",
                            },
                          }}
                          MenuProps={{
                            PaperProps: {
                              sx: {
                                maxHeight: 200,
                                backgroundColor: "#fff",
                              },
                            },
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
                        of {totalPages} page{totalPages > 1 ? "s" : ""}
                      </Typography>
                      {/* Next & Last */}
                      <Button
                        onClick={() =>
                          setCurrentPage((prev) =>
                            Math.min(prev + 1, totalPages),
                          )
                        }
                        disabled={currentPage === totalPages}
                        variant="outlined"
                        size="small"
                        sx={{
                          minWidth: 80,
                          color: "white",
                          borderColor: "white",
                          backgroundColor: "transparent",
                          "&:hover": {
                            borderColor: "white",
                            backgroundColor: "rgba(255,255,255,0.1)",
                          },
                          "&.Mui-disabled": {
                            color: "white",
                            borderColor: "white",
                            backgroundColor: "transparent",
                            opacity: 1,
                          },
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
                          "&:hover": {
                            borderColor: "white",
                            backgroundColor: "rgba(255,255,255,0.1)",
                          },
                          "&.Mui-disabled": {
                            color: "white",
                            borderColor: "white",
                            backgroundColor: "transparent",
                            opacity: 1,
                          },
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
      </div>

      <Dialog
        open={openProgramDialog}
        onClose={() => setOpenProgramDialog(false)}
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
        {/* ===== HEADER ===== */}
        <DialogTitle
          sx={{
            background: headerColor,
            color: "#fff",
            fontWeight: 700,
            fontSize: "1.2rem",
            py: 2,
          }}
        >
          {editMode ? "Edit Program" : "Add Program"}
        </DialogTitle>
        {/* ===== CONTENT ===== */}
        <DialogContent sx={{ p: 3 }}>
          <Grid container spacing={2}>
            {/* DESCRIPTION */}
            <Grid item xs={12} sx={{ marginTop: "20px" }}>
              <Typography fontWeight="bold">Program Description</Typography>
              <TextField
                fullWidth
                name="name"
                value={program.name}
                onChange={handleChangesForEverything}
                placeholder="Enter Program Description"
              />
            </Grid>
            {/* CODE */}
            <Grid item xs={12}>
              <Typography fontWeight="bold">Program Code</Typography>
              <TextField
                fullWidth
                name="code"
                value={program.code}
                onChange={handleChangesForEverything}
                placeholder="Enter Program Code"
              />
            </Grid>
            {/* MAJOR */}
            <Grid item xs={12}>
              <Typography fontWeight="bold">Major</Typography>
              <TextField
                fullWidth
                name="major"
                value={program.major}
                onChange={handleChangesForEverything}
                placeholder="Optional (e.g., Marketing Management)"
              />
            </Grid>
            {/* CAMPUS */}
            <Grid item xs={12}>
              <Typography fontWeight="bold">Campus</Typography>
              <TextField
                select
                fullWidth
                name="components"
                value={String(program.components || getDefaultCampusValue())}  // ← wrap with String()
                onChange={handleChangesForEverything}
              >
                <MenuItem value="">Select Campus</MenuItem>
                {branches.map((branch) => (
                  <MenuItem key={branch.id} value={String(branch.id)}>
                    {branch.branch}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            {/* ACADEMIC PROGRAM */}
            <Grid item xs={12}>
              <Typography fontWeight="bold">Academic Program</Typography>
              <TextField
                select
                fullWidth
                name="academic_program"
                value={String(program.academic_program ?? "")}   // ← wrap with String()
                onChange={handleChangesForEverything}
              >
                <MenuItem value="">Select Type</MenuItem>
                <MenuItem value="0">Undergraduate</MenuItem>
                <MenuItem value="1">Graduate</MenuItem>
                <MenuItem value="2">Techvoc</MenuItem>
              </TextField>
            </Grid>
          </Grid>
        </DialogContent>
        {/* ===== ACTIONS ===== */}
        <DialogActions
          sx={{
            px: 3,
            py: 2,
            borderTop: "1px solid #e0e0e0",
          }}
        >
          <Button
            onClick={() => {
              setOpenProgramDialog(false);
              setEditMode(false);
              setEditId(null);
            }}
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
              const saved = await handleAddingProgram();
              if (saved) setOpenProgramDialog(false);
            }}
          >
            <SaveIcon fontSize="small" sx={{ mr: 1 }} /> Save
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={openDeleteDialog}
        onClose={() => setOpenDeleteDialog(false)}
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
          Delete Program
        </DialogTitle>

        <DialogContent sx={{ p: 3, mt: 2 }}>
          <Typography sx={{ mb: 2 }}>
            Are you sure you want to delete the program{" "}
            <b>{programToDelete?.program_description}</b> (
            <b>{programToDelete?.program_code}</b>)?
          </Typography>

          <Typography
            sx={{
              color: "#d32f2f",
              fontSize: "0.95rem",
            }}
          >
            Deleting this program will permanently remove it from the program list.
            <br />
            Any curricula, courses, or academic records associated with this program
            may be affected.
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
            onClick={() => setOpenDeleteDialog(false)}
          >
            Cancel
          </Button>

          <Button
            color="error"
            variant="contained"
            onClick={() => {
              handleDelete(programToDelete.program_id);
              setOpenDeleteDialog(false);
              setProgramToDelete(null);
            }}
          >
            Yes, Delete
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ProgramManagement;
