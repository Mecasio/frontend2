import React, { useState, useEffect, useContext } from "react";
import { SettingsContext } from "../App";
import axios from 'axios';
import {
  Box,
  Paper,
  TextField,
  Button,
  Typography,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TableContainer,
  Snackbar,
  Alert,
  FormControl,
  Select,
  Dialog,
  MenuItem,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import Unauthorized from "../components/Unauthorized";
import LoadingOverlay from "../components/LoadingOverlay";
import API_BASE_URL from "../apiConfig";
import SearchIcon from "@mui/icons-material/Search";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import SaveIcon from "@mui/icons-material/Save";
import { getFlatAuditHeaders } from "../utils/auditEvents";
import useAuditMac from "../utils/useAuditMac";

const SectionPanel = () => {
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

  const pageId = 57;

  const getAuditHeaders = () => ({
    headers: {
      ...getFlatAuditHeaders(),
      "x-employee-id": employeeID || localStorage.getItem("employee_id") || "",
      "x-page-id": pageId,
      "x-audit-actor-id": employeeID || localStorage.getItem("employee_id") || "",
      "x-audit-actor-role": userRole || localStorage.getItem("role") || "registrar",
    },
  });

  const [description, setDescription] = useState('');
  const [sections, setSections] = useState([]);
  const [editId, setEditId] = useState(null);

  const [openFormDialog, setOpenFormDialog] = useState(false);


  const handleEdit = (section) => {
    if (!canEdit) {
      setSnackbar({ open: true, message: "You do not have permission to edit sections", severity: "error" });
      return;
    }

    setEditId(section.id);
    setDescription(section.description);
    setOpenFormDialog(true);
  };

  const [sectionSearchQuery, setSectionSearchQuery] = useState("");

  const filteredSections = sections.filter((section) =>
    section.description.toLowerCase().includes(sectionSearchQuery.toLowerCase())
  );

  // Snackbar state
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
      const allowed = response.data?.page_privilege === 1;
      setHasAccess(allowed);
      setCanCreate(allowed && Number(response.data?.can_create) === 1);
      setCanEdit(allowed && Number(response.data?.can_edit) === 1);
      setCanDelete(allowed && Number(response.data?.can_delete) === 1);
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

  const fetchSections = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/section_table`);
      setSections(response.data);
    } catch (err) {
      console.log(err);
      setSnackbar({ open: true, message: "Failed to fetch sections", severity: "error" });
    }
  };

  useEffect(() => {
    fetchSections();
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (editId && !canEdit) {
      setSnackbar({ open: true, message: "You do not have permission to edit sections", severity: "error" });
      return;
    }

    if (!editId && !canCreate) {
      setSnackbar({ open: true, message: "You do not have permission to create sections", severity: "error" });
      return;
    }

    if (!description.trim()) {
      setSnackbar({ open: true, message: "Description required", severity: "warning" });
      return;
    }

    try {
      if (editId) {
        // UPDATE
        await axios.put(`${API_BASE_URL}/api/section_table/${editId}`, { description }, getAuditHeaders());
        setSnackbar({ open: true, message: "Section updated!", severity: "success" });
      } else {
        // INSERT
        await axios.post(`${API_BASE_URL}/api/section_table`, { description }, getAuditHeaders());
        setSnackbar({ open: true, message: "Section added!", severity: "success" });
      }

      setDescription("");
      setEditId(null);
      setOpenFormDialog(false);
      fetchSections();
    } catch (err) {
      const msg = err.response?.data?.error || "Error";
      setSnackbar({ open: true, message: msg, severity: "error" });
    }
  };

  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [sectionToDelete, setSectionToDelete] = useState(null);


  const handleConfirmDelete = async () => {
    if (!sectionToDelete) return;
    if (!canDelete) {
      setSnackbar({ open: true, message: "You do not have permission to delete sections", severity: "error" });
      return;
    }

    try {
      await axios.delete(`${API_BASE_URL}/api/section_table/${sectionToDelete.id}`, getAuditHeaders());
      setSnackbar({ open: true, message: "Section deleted!", severity: "success" });
      fetchSections();
    } catch (err) {
      setSnackbar({ open: true, message: "Delete failed!", severity: "error" });
    } finally {
      setOpenDeleteDialog(false);
      setSectionToDelete(null);
    }
  };



  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 20;

  const totalPages = Math.ceil(filteredSections.length / rowsPerPage);

  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;

  const paginatedSections = filteredSections.slice(startIndex, endIndex);

  if (loading || hasAccess === null) return <LoadingOverlay open={loading} message="Loading..." />;
  if (!hasAccess) return <Unauthorized />;
  const showActionColumn = canEdit || canDelete;
  const showCreateActions = canCreate;

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
    <Box sx={{ height: "calc(100vh - 150px)", overflowY: "auto", paddingRight: 1, backgroundColor: "transparent", padding: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', mb: 2 }}>
        <Typography variant="h4" sx={{ fontWeight: 'bold', color: titleColor, fontSize: '36px' }}>
          SECTION PANEL FORM
        </Typography>

        <TextField
          variant="outlined"
          placeholder="Search Section Description..."
          size="small"
          value={sectionSearchQuery}
          onChange={(e) => {
            setSectionSearchQuery(e.target.value);
            setCurrentPage(1);
          }}
          sx={{
            width: 450,
            backgroundColor: "#fff",
            borderRadius: 1,
            mb: 2,
            mt: 1,
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




      <br />

      <TableContainer component={Paper} sx={{ width: '100%', }}>
        <Table size="small">
          <TableHead sx={{ backgroundColor: '#6D2323', color: "white" }}>
            <TableRow>
              <TableCell colSpan={10} sx={{ border: `1px solid ${borderColor}`, py: 0.5, backgroundColor: headerColor, color: "white" }}>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  {/* Left: Total Count */}
                  <Typography fontSize="14px" fontWeight="bold" color="white">
             Total Sections Records: {filteredSections.length}
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

                    <Button
                      variant="contained"
                      onClick={() => {
                        if (!canCreate) {
                          setSnackbar({ open: true, message: "You do not have permission to create sections", severity: "error" });
                          return;
                        }
                        setEditId(null);
                        setDescription("");
                        setOpenFormDialog(true);
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
                        display: showCreateActions ? "inline-flex" : "none",
                        '&:hover': {
                          backgroundColor: "#1565c0" // darker blue hover
                        }
                      }}
                    >
                      + Add Section
                    </Button>
                  </Box>
                </Box>
              </TableCell>
            </TableRow>
          </TableHead>
        </Table>
      </TableContainer>









      <TableContainer sx={{ overflowY: 'auto' }}>
        <Table>
          <TableHead style={{ backgroundColor: headerColor, }}>
            <TableRow>
              <TableCell sx={{ fontWeight: "bold", textAlign: "center", border: `1px solid ${borderColor}`, backgroundColor: "#f5f5f5", color: "#000" }}>ID</TableCell>
              <TableCell sx={{ fontWeight: "bold", textAlign: "center", border: `1px solid ${borderColor}`, backgroundColor: "#f5f5f5", color: "#000" }}>Section Description</TableCell>
              {showActionColumn && (
                <TableCell sx={{ fontWeight: "bold", textAlign: "center", border: `1px solid ${borderColor}`, backgroundColor: "#f5f5f5", color: "#000" }}>Action</TableCell>
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
            {paginatedSections.map((section, index) => (

              <TableRow key={section.id}>
                <TableCell sx={{ border: `1px solid ${borderColor}`, textAlign: "center" }}>{startIndex + index + 1}</TableCell>
                <TableCell sx={{ border: `1px solid ${borderColor}`, textAlign: "center" }}>{section.description}</TableCell>

                {showActionColumn && (
                <TableCell sx={{ border: `1px solid ${borderColor}`, textAlign: "center" }}>
                  <Box sx={{ display: "flex", gap: 1, justifyContent: "center" }}>
                    {canEdit && (
                    <Button
                      variant="contained"
                      size="small"
                      sx={{
                        backgroundColor: "green",
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

                      }}
                      onClick={() => handleEdit(section)}
                    >
                      <EditIcon fontSize="small" /> Edit   </Button>
                    )}

                    {canDelete && (
                    <Button
                      variant="contained"
                      size="small"
                      sx={{
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

                      }}
                      onClick={() => {
                        setSectionToDelete(section);
                        setOpenDeleteDialog(true);
                      }}
                    >
                      <DeleteIcon fontSize="small" /> Delete
                    </Button>
                    )}
                  </Box>
                </TableCell>
                )}



              </TableRow>
            ))}
          </TableBody>

        </Table>
      </TableContainer>

      <TableContainer component={Paper} sx={{ width: '100%', }}>
        <Table size="small">
          <TableHead sx={{ backgroundColor: '#6D2323', color: "white" }}>
            <TableRow>
              <TableCell colSpan={10} sx={{ border: `1px solid ${borderColor}`, py: 0.5, backgroundColor: headerColor, color: "white" }}>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  {/* Left: Total Count */}
                  <Typography fontSize="14px" fontWeight="bold" color="white">
                    Total Sections Records: {filteredSections.length}
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

      <Dialog
        open={openFormDialog}
        onClose={() => {
          setOpenFormDialog(false);
          setEditId(null);
          setDescription("");
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
        {/* HEADER */}
        <DialogTitle
          sx={{
            background: headerColor,
            color: "#fff",
            fontWeight: 700,
            fontSize: "1.1rem",
            py: 2
          }}
        >
          {editId ? "Edit Section" : "Create Section"}
        </DialogTitle>

        {/* CONTENT */}
        <DialogContent sx={{ p: 3 }}>
          <Typography fontWeight="bold" mb={1} mt={1}>
            Section Description
          </Typography>

          <TextField
            fullWidth
            placeholder="Enter section description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            autoFocus
          />
        </DialogContent>

        {/* ACTIONS */}
        <DialogActions
          sx={{
            px: 3,
            py: 2,
            borderTop: "1px solid #e0e0e0"
          }}
        >
          <Button
            onClick={() => {
              setOpenFormDialog(false);
              setEditId(null);
              setDescription("");
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
            sx={{
              px: 4,
              fontWeight: 600,
              textTransform: "none",
              display: (editId ? canEdit : canCreate) ? "inline-flex" : "none",
            }}
            onClick={handleSubmit}
          >
            <SaveIcon fontSize="small" /> Save
          </Button>
        </DialogActions>
      </Dialog>


      <Dialog
        open={openDeleteDialog}
        onClose={() => {
          setOpenDeleteDialog(false);
          setSectionToDelete(null);
        }}
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
          Delete Section
        </DialogTitle>

        <DialogContent sx={{ p: 3, mt: 2 }}>
          <Typography sx={{ mb: 2 }}>
            Are you sure you want to delete the section{" "}
            <strong>{sectionToDelete?.description}</strong>?
          </Typography>

          <Typography sx={{ color: "#d32f2f", fontSize: "0.95rem" }}>
            Deleting this section will permanently remove it from the system.
            <br />
            Students and schedules currently assigned to this section may
            be affected.
          </Typography>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            variant="outlined"
            color="error"
            onClick={() => {
              setOpenDeleteDialog(false);
              setSectionToDelete(null);
            }}
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

export default SectionPanel;
