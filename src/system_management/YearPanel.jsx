import React, { useState, useEffect, useContext } from "react";
import { SettingsContext } from "../App";
import axios from "axios";
import {
  Box, Typography, Snackbar, Alert, TextField, TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  Paper,
  FormControl,
  Select,
  MenuItem,
  Button,
} from "@mui/material";
import Unauthorized from "../components/Unauthorized";
import LoadingOverlay from "../components/LoadingOverlay";
import API_BASE_URL from "../apiConfig";
import SearchIcon from "@mui/icons-material/Search";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import SaveIcon from '@mui/icons-material/Save';
import { getFlatAuditHeaders } from "../utils/auditEvents";
import useAuditMac from "../utils/useAuditMac";


const YearPanel = () => {
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
  const [loading, setLoading] = useState(false);

  const [yearDescription, setYearDescription] = useState("");
  const [years, setYears] = useState([]);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState(null);

  const pageId = 64;

  const getAuditHeaders = () => ({
    headers: {
      ...getFlatAuditHeaders(),
      "x-employee-id": employeeID || localStorage.getItem("employee_id") || "",
      "x-page-id": pageId,
      "x-audit-actor-id": employeeID || localStorage.getItem("employee_id") || "",
      "x-audit-actor-role": userRole || localStorage.getItem("role") || "registrar",
    },
  });

  // 🎨 Dynamic colors
  useEffect(() => {
    if (!settings) return;
    if (colors.title) setTitleColor(colors.title);
    if (colors.subtitle) setSubtitleColor(colors.subtitle);
    if (colors.border) setBorderColor(colors.border);
  }, [settings]);

  // 👤 Access Check
  useEffect(() => {
    const storedUser = localStorage.getItem("email");
    const storedRole = localStorage.getItem("role");
    const storedID = localStorage.getItem("person_id");
    const storedEmployeeID = localStorage.getItem("employee_id");

    if (storedUser && storedRole && storedID) {
      setUserID(storedID);
      setUserRole(storedRole);
      setEmployeeID(storedEmployeeID);
      if (storedRole === "registrar") checkAccess(storedEmployeeID);
      else window.location.href = "/login";
    } else window.location.href = "/login";
  }, []);

  const checkAccess = async (employeeID) => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/api/page_access/${employeeID}/${pageId}`);
      setHasAccess(response.data?.page_privilege === 1);
    } catch {
      setHasAccess(false);
      setSnackbar({ open: true, message: "Failed to check access", severity: "error" });
    } finally {
      setLoading(false);
    }
  };

  // 📊 Fetch Year Data
  const fetchYears = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/year_table`);
      setYears(res.data);
    } catch {
      setSnackbar({ open: true, message: "Failed to fetch years", severity: "error" });
    }
  };

  useEffect(() => {
    fetchYears();
  }, []);

  const [openYearDialog, setOpenYearDialog] = useState(false);

  const handleSubmit = async () => {
    if (!yearDescription.trim()) return;

    try {
      await axios.post(`${API_BASE_URL}/api/years`, {
        year_description: yearDescription,
      }, getAuditHeaders());

      setYearDescription("");
      fetchYears();

      setSnackbar({
        open: true,
        message: "Year saved successfully!",
        severity: "success",
      });
    } catch {
      setSnackbar({
        open: true,
        message: "Failed to save year",
        severity: "error",
      });
    }
  };

  const toggleActivator = async (yearId, currentStatus) => {
    try {
      const newStatus = Number(currentStatus) === 1 ? 0 : 1;
      await axios.put(
        `${API_BASE_URL}/api/year_table/${yearId}`,
        { status: newStatus },
        getAuditHeaders()
      );
      fetchYears();
      setSnackbar({
        open: true,
        message: `Year ${newStatus === 1 ? "activated" : "deactivated"} successfully!`,
        severity: "success",
      });
    } catch {
      setSnackbar({
        open: true,
        message: "Failed to update year status",
        severity: "error",
      });
    }
  };

  const openConfirm = (year) => {
    setConfirmTarget(year);
    setConfirmOpen(true);
  };

  const closeConfirm = () => {
    setConfirmOpen(false);
    setConfirmTarget(null);
  };

  const handleConfirm = async () => {
    if (!confirmTarget) return;
    await toggleActivator(confirmTarget.year_id, confirmTarget.status);
    closeConfirm();
  };



  const [yearSearchQuery, setYearSearchQuery] = useState("");

  const filteredYears = years.filter((year) =>
    String(year.year_description).includes(yearSearchQuery)
  );


  const handleCloseSnackbar = () => setSnackbar((prev) => ({ ...prev, open: false }));

  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 20;

  const totalPages = Math.ceil(filteredYears.length / rowsPerPage);

  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;

  const paginatedYears = filteredYears.slice(startIndex, endIndex);



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

  return (
    <Box sx={{ height: "calc(100vh - 150px)", overflowY: "auto", paddingRight: 1, backgroundColor: "transparent", mt: 1, padding: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', mb: 2 }}>
        <Typography variant="h4" sx={{ fontWeight: "bold", color: titleColor, mb: 2, fontSize: "36px" }}>
          YEAR PANEL
        </Typography>


        <TextField
          variant="outlined"
          placeholder="Search Year..."
          size="small"
          value={yearSearchQuery}
          onChange={(e) => {
            setYearSearchQuery(e.target.value);
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
      <br />


      <TableContainer component={Paper} sx={{ width: '100%', }}>
        <Table size="small">
          <TableHead sx={{ backgroundColor: '#6D2323', color: "white" }}>
            <TableRow>
              <TableCell colSpan={10} sx={{ border: `1px solid ${borderColor}`, py: 0.5, backgroundColor: headerColor, color: "white" }}>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  {/* Left: Total Count */}
                  <Typography fontSize="14px" fontWeight="bold" color="white">
                    Total Year Records: {filteredYears.length}
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
                      onClick={() => {
                        setYearDescription("");
                        setOpenYearDialog(true);
                      }}
                    >
                      + Add Year
                    </Button>
                  </Box>
                </Box>
              </TableCell>
            </TableRow>
          </TableHead>
        </Table>
      </TableContainer>

      <table
        className="w-full border border-gray-300"
        style={{
          width: "100%",
          borderCollapse: "collapse",
          border: `1px solid ${borderColor}`,
          textAlign: "center",
        }}
      >
        <thead>
          <tr style={{ color: "#000" }}>
            <th style={{ border: `1px solid ${borderColor}`, padding: "10px", backgroundColor: "#f5f5f5", color: "#000" }}>Year</th>
            <th style={{ border: `1px solid ${borderColor}`, padding: "10px", backgroundColor: "#f5f5f5", color: "#000" }}>Status</th>
            <th style={{ border: `1px solid ${borderColor}`, padding: "10px", backgroundColor: "#f5f5f5", color: "#000" }}>Action</th>
          </tr>
        </thead>
        <tbody>
          {filteredYears.length > 0 ? (
            paginatedYears.map((year, index) => (

              <tr
                key={year.year_id}
                style={{
                  backgroundColor: index % 2 === 0 ? "#ffffff" : "lightgray",
                }}
              >
                <td style={{ border: `1px solid ${borderColor}`, padding: "8px" }}>
                  {year.year_description}
                </td>
                <td style={{ border: `1px solid ${borderColor}`, padding: "8px" }}>
                  {year.status === 1 ? "Active" : "Inactive"}
                </td>
                <td style={{ border: `1px solid ${borderColor}`, padding: "8px" }}>
                  <Button
                    variant="contained"
                    size="small"
                    sx={{
                      backgroundColor: year.status === 1 ? "#DC2626" : "#16A34A",
                      minWidth: 120,
                      textTransform: "none",
                      "&:hover": {
                        backgroundColor: year.status === 1 ? "#B91C1C" : "#15803D",
                      },
                    }}
                    onClick={() => openConfirm(year)}
                  >
                    {year.status === 1 ? "Deactivate" : "Activate"}
                  </Button>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="3" style={{ padding: "15px", color: "#777" }}>
                No year records found.
              </td>
            </tr>
          )}
        </tbody>

      </table>

      <TableContainer component={Paper} sx={{ width: '100%', }}>
        <Table size="small">
          <TableHead sx={{ backgroundColor: '#6D2323', color: "white" }}>
            <TableRow>
              <TableCell colSpan={10} sx={{ border: `1px solid ${borderColor}`, py: 0.5, backgroundColor: headerColor, color: "white" }}>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  {/* Left: Total Count */}
                  <Typography fontSize="14px" fontWeight="bold" color="white">
                    Total Year Records: {filteredYears.length}
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

      <Dialog
        open={openYearDialog}
        onClose={() => setOpenYearDialog(false)}
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
          Add Academic Year
        </DialogTitle>

        {/* ===== CONTENT ===== */}
        <DialogContent sx={{ p: 3 }}>
          <Typography fontWeight="bold" mb={1} mt={2}>
            Year
          </Typography>

          <TextField
            fullWidth
            placeholder="Enter year (e.g., 2026)"
            value={yearDescription}
            onChange={(e) => setYearDescription(e.target.value)}
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
            onClick={() => setOpenYearDialog(false)}
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
              textTransform: "none"
            }}
            onClick={(e) => {
              handleSubmit(e);
              setOpenYearDialog(false);
            }}
          >
            <SaveIcon fontSize="small" /> Save

          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={confirmOpen} onClose={closeConfirm} maxWidth="xs" fullWidth>
        <DialogTitle
          sx={{
            background: colors.header || "#9E0000",
            color: "#fff",
            fontWeight: 700,
            fontSize: "1.2rem",
            py: 2,
          }}
        >
          Confirm {confirmTarget?.status === 1 ? "Deactivation" : "Activation"}
        </DialogTitle>

        <DialogContent sx={{ p: 3, mt: 2 }}>
          <Typography sx={{ mb: 2 }}>
            Are you sure you want to {confirmTarget?.status === 1 ? "deactivate" : "activate"}{" "}
            <strong>{confirmTarget?.year_description || "this year"}</strong>?
          </Typography>

          <Typography sx={{ color: "#d32f2f", fontSize: "0.95rem" }}>
            {confirmTarget?.status === 1
              ? "Deactivating this year will mark it as inactive in the system. Records and schedules tied to this year may be affected."
              : "Activating this year will make it the current active year. Any previously active year may be affected by this change."}
          </Typography>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={closeConfirm} color="error" variant="outlined">
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            variant="contained"
            sx={{ backgroundColor: "green" }}
          >
            Yes, {confirmTarget?.status === 1 ? "Deactivate" : "Activate"}
          </Button>
        </DialogActions>
      </Dialog>

    </Box>
  );
};

export default YearPanel;
