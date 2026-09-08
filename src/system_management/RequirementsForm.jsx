import React, { useState, useEffect, useContext, useRef } from "react";
import { SettingsContext } from "../App";
import axios from "axios";
import {
  Typography,
  Box,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Snackbar,
  Alert,
  Button,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  Paper,
  TableBody

} from "@mui/material";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import Unauthorized from "../components/Unauthorized";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import LoadingOverlay from "../components/LoadingOverlay";
import API_BASE_URL from "../apiConfig";
import SaveIcon from '@mui/icons-material/Save';
import { getFlatAuditHeaders } from "../utils/auditEvents";
import useAuditMac from "../utils/useAuditMac";

const applicantTypeMap = {
  "0": "All Applicants",
  "1": "Senior High School Graduate",
  "2": "Graduating Student",
  "3": "ALS Passer",
  "4": "Transferee",
  "5": "Cross Enrollee",
  "6": "Foreign Applicant/Student",
  "7": "Baccalaureate Graduate",
  "8": "Master Degree Graduate"
};

const RequirementsForm = () => {
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
      setFetchedLogo(null);
    }

    // 🏷️ School Information
    if (branding.companyName) setCompanyName(branding.companyName);
    if (branding.shortTerm) setShortTerm(branding.shortTerm);
    if (branding.campusAddress) setCampusAddress(branding.campusAddress);

  }, [settings]);


  // Also put it at the very top
  const [userID, setUserID] = useState("");
  const [user, setUser] = useState("");
  const [userRole, setUserRole] = useState("");

  const [hasAccess, setHasAccess] = useState(null);
  const [canCreate, setCanCreate] = useState(false);
  const [canEdit, setCanEdit] = useState(false);
  const [canDelete, setCanDelete] = useState(false);
  const [loading, setLoading] = useState(false);


  const pageId = 51;

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


  const [applicantType, setApplicantType] = useState("All");
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState(null);


  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Main"); // ✅ Default category
  const [requirements, setRequirements] = useState([]);
  const [shortLabel, setShortLabel] = useState("");
  const [documentStatus, setDocumentStatus] = useState("On Process");
  const [requiresOriginal, setRequiresOriginal] = useState(false);
  const [xeroxCopies, setXeroxCopies] = useState(0);


  // ✅ Snackbar state
  const [snack, setSnack] = useState({
    open: false,
    message: "",
    severity: "info",
  });

  const handleCloseSnack = (_, reason) => {
    if (reason === "clickaway") return;
    setSnack((prev) => ({ ...prev, open: false }));
  };

  // ✅ Fetch all requirements
  const fetchRequirements = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/requirements`);
      const normalized = res.data.map(r => ({
        ...r,
        requires_original: r.requires_original === 1,
        xerox_copies: r.xerox_copies || 0,
        is_optional: r.is_optional === 1 // ✅ ADD THIS
      }));
      setRequirements(normalized);
    } catch (err) {
      console.error("Error fetching requirements:", err);
      setSnack({
        open: true,
        message: "Failed to load requirements",
        severity: "error",
      });
    }
  };

  useEffect(() => {
    fetchRequirements();
  }, []);

  const [openDialog, setOpenDialog] = useState(false);

  const handleOpenAddDialog = () => {
    if (!canCreate) {
      setSnack({
        open: true,
        message: "You do not have permission to create items on this page",
        severity: "error",
      });
      return;
    }

    setDescription("");
    setShortLabel("");
    setCategory("Main");
    setRequiresOriginal(false);
    setXeroxCopies(0);
    setIsOptional(false);
    setApplicantType("0");

    setIsEditing(false);
    setEditId(null);

    setOpenDialog(true);
  };

  const handleOpenEditDialog = (req) => {
    if (!canEdit) {
      setSnack({
        open: true,
        message: "You do not have permission to edit this item",
        severity: "error",
      });
      return;
    }

    setDescription(req.description);
    setShortLabel(req.short_label || "");
    setCategory(req.category || "Main");
    setRequiresOriginal(req.requires_original === true || req.requires_original === 1);
    setXeroxCopies(Number(req.xerox_copies || 0));

    setIsOptional(req.is_optional);
    setApplicantType(req.applicant_type || "0");

    setIsEditing(true);
    setEditId(req.id);

    setOpenDialog(true);
  };



  // ✅ Handle submission of a new requirement
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!description.trim()) {
      setSnack({
        open: true,
        message: "Please enter a requirement description.",
        severity: "warning",
      });
      return;
    }

    if (isEditing && !canEdit) {
      setSnack({
        open: true,
        message: "You do not have permission to edit this item.",
        severity: "error",
      });
      return;
    }

    if (!isEditing && !canCreate) {
      setSnack({
        open: true,
        message: "You do not have permission to create items on this page.",
        severity: "error",
      });
      return;
    }

    try {
      if (isEditing) {
        await axios.put(`${API_BASE_URL}/api/requirements/${editId}`, {
          requirements_description: description,
          short_label: shortLabel,
          category: category,

          is_optional: isOptional,
          applicant_type: applicantType
        }, permissionHeaders);

        setSnack({
          open: true,
          message: "Requirement updated successfully!",
          severity: "success",
        });

      } else {
        // ✅ CREATE
        await axios.post(`${API_BASE_URL}/api/requirements`, {
          requirements_description: description,
          short_label: shortLabel,
          category: category,
          xerox_copies: xeroxCopies,
          requires_original: requiresOriginal,
          is_optional: isOptional,
          applicant_type: applicantType
        }, permissionHeaders);

        setSnack({
          open: true,
          message: "Requirement saved successfully!",
          severity: "success",
        });
      }

      // RESET FORM
      setDescription("");
      setShortLabel("");
      setCategory("Main");
      setXeroxCopies(0);
      setRequiresOriginal(false);
      setIsOptional(false);
      setIsEditing(false);
      setEditId(null);
      setOpenDialog(false);


      fetchRequirements();

    } catch (err) {
      console.error(err);
      setSnack({
        open: true,
        message: "Error saving requirement.",
        severity: "error",
      });
    }
  };

  const [isOptional, setIsOptional] = useState(false);

  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [requirementToDelete, setRequirementToDelete] = useState(null);

  const handleDelete = async (id) => {
    if (!canDelete) {
      setSnack({
        open: true,
        message: "You do not have permission to delete this item.",
        severity: "error",
      });
      return;
    }

    try {
      await axios.delete(`${API_BASE_URL}/api/requirements/${id}`, permissionHeaders);
      fetchRequirements();
      setSnack({
        open: true,
        message: "Requirement deleted successfully!",
        severity: "success",
      });
    } catch (err) {
      console.error("Error deleting requirement:", err);
      setSnack({
        open: true,
        message: "Error deleting requirement.",
        severity: "error",
      });
    }
  };

  // ✅ Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 20;

  // total pages
  const totalPages = Math.ceil(requirements.length / rowsPerPage);

  // slice data
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;

  const paginatedRequirements = requirements.slice(
    startIndex,
    endIndex
  );
  const showCreateActions = canCreate;
  const showActionColumn = canEdit || canDelete;

  useEffect(() => {
    setCurrentPage(1);
  }, [requirements]);

  // ✅ Group requirements by category
  const groupedRequirements = requirements.reduce((acc, req) => {
    const cat = req.category || "Main";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(req);
    return acc;
  }, {});



  // Put this at the very bottom before the return 
  if (loading || hasAccess === null) {
    return <LoadingOverlay open={loading} message="Loading..." />;
  }

  if (!hasAccess) {
    return (
      <Unauthorized />
    );
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
          MANAGE REQUIREMENTS
        </Typography>
      </Box>

      <hr style={{ border: "1px solid #ccc", width: "100%" }} />
      <br />

      <br />

      <TableContainer component={Paper} sx={{ width: '100%', border: `1px solid ${borderColor}`, }}>
        <Table>
          <TableHead sx={{ backgroundColor: headerColor, }}>
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
                <Box
                  display="flex"
                  justifyContent="space-between"
                  alignItems="center"
                >
                  {/* Left: Total Count */}
                  <Typography fontSize="14px" fontWeight="bold" color="white">
                 Total Documents Records:
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
                        onChange={(e) => setCurrentPage(Number(e.target.value))}
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
                            color: "white", // dropdown arrow icon color
                          },
                        }}
                        MenuProps={{
                          PaperProps: {
                            sx: {
                              maxHeight: 200,
                              backgroundColor: "#fff", // dropdown background
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
                        setCurrentPage((prev) => Math.min(prev + 1, totalPages))
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
                        onClick={handleOpenAddDialog}
                        disabled={!canCreate}
                        sx={{
                          backgroundColor: "#1976d2", // ✅ Blue
                          color: "#fff",
                          opacity: canCreate ? 1 : 0.5,
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
                        + Add Requirements
                      </Button>
                    )}

                  </Box>
                </Box>
              </TableCell>
            </TableRow>





          </TableHead>
        </Table>
      </TableContainer>

      <TableContainer component={Paper} sx={{ border: `1px solid ${borderColor}` }}>
        <Table stickyHeader size="small">

          {/* HEADER */}
          <TableHead>
            <TableRow>
              <TableCell sx={{ border: `1px solid ${borderColor}`, textAlign: "center" }}>#</TableCell>
              <TableCell sx={{ border: `1px solid ${borderColor}`, textAlign: "center" }}>Description</TableCell>
              <TableCell sx={{ border: `1px solid ${borderColor}`, textAlign: "center" }}>Short Label</TableCell>
              <TableCell sx={{ border: `1px solid ${borderColor}`, textAlign: "center" }}>Category</TableCell>
              <TableCell sx={{ border: `1px solid ${borderColor}`, textAlign: "center" }}>
                Applicant Type
              </TableCell>

              <TableCell sx={{ border: `1px solid ${borderColor}`, textAlign: "center" }}>Optional</TableCell>
              {showActionColumn && (
                <TableCell sx={{ border: `1px solid ${borderColor}`, textAlign: "center" }}>Actions</TableCell>
              )}


            </TableRow>
          </TableHead>

          {/* BODY */}
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
            {paginatedRequirements.map((req, index) => (

              <TableRow key={req.id}>

                <TableCell sx={{ border: `1px solid ${borderColor}` }}>
                  {startIndex + index + 1}

                </TableCell>

                {/* DESCRIPTION */}
                <TableCell sx={{ border: `1px solid ${borderColor}` }}>
                  {req.description}
                </TableCell>

                {/* SHORT LABEL */}
                <TableCell sx={{ border: `1px solid ${borderColor}` }}>
                  {req.short_label || "N/A"}
                </TableCell>

                {/* CATEGORY */}
                <TableCell sx={{ border: `1px solid ${borderColor}` }}>
                  {req.category || "Main"}
                </TableCell>
                <TableCell sx={{ border: `1px solid ${borderColor}`, textAlign: "center" }}>
                  {applicantTypeMap[req.applicant_type] || "All Applicants"}
                </TableCell>


                <TableCell sx={{ border: `1px solid ${borderColor}`, textAlign: "center" }}>
                  {req.is_optional ? "Yes" : "No"}
                </TableCell>

                {/* ACTIONS */}
                {showActionColumn && (
                  <TableCell
                    sx={{
                      border: `1px solid ${borderColor}`,
                      textAlign: "center",
                      display: "flex",
                      gap: "10px",
                      justifyContent: "center"
                    }}
                  >
                    {canEdit && (
                      <Button
                        variant="contained"
                        size="small"
                        style={{
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
                        onClick={() => handleOpenEditDialog(req)}
                      >
                        <EditIcon fontSize="small" /> Edit
                      </Button>
                    )}

                    {canDelete && (
                      <Button
                        variant="contained"
                        size="small"
                        style={{

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
                          setRequirementToDelete(req);
                          setOpenDeleteDialog(true);
                        }}
                      >
                        <DeleteIcon fontSize="small" /> Delete
                      </Button>
                    )}
                  </TableCell>
                )}

              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <TableContainer component={Paper} sx={{ width: '100%', border: `1px solid ${borderColor}`, }}>
        <Table>
          <TableHead sx={{ backgroundColor: headerColor, }}>
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
                <Box
                  display="flex"
                  justifyContent="space-between"
                  alignItems="center"
                >
                  {/* Left: Total Count */}
                  <Typography fontSize="14px" fontWeight="bold" color="white">
                 Total Documents Records:
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
                        onChange={(e) => setCurrentPage(Number(e.target.value))}
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
                            color: "white", // dropdown arrow icon color
                          },
                        }}
                        MenuProps={{
                          PaperProps: {
                            sx: {
                              maxHeight: 200,
                              backgroundColor: "#fff", // dropdown background
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
                        setCurrentPage((prev) => Math.min(prev + 1, totalPages))
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

      {/* Right Side - Display Saved Requirements */}
      <Dialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle
          sx={{
            backgroundColor: headerColor,
            color: "white",
            fontWeight: "bold"
          }}
        >
          {isEditing
            ? "Edit Requirement"
            : "Add Requirement"}
        </DialogTitle>

        <DialogContent dividers>

          <Typography
            variant="subtitle1"
            fontWeight={700}
            sx={{ mb: 1, mt: 1 }}
          >
            Requirements Description
          </Typography>
          <input
            type="text"
            value={description}
            onChange={(e) =>
              setDescription(e.target.value)
            }
            placeholder="Enter requirement description"
            className="w-full p-3 border rounded"
          />

          <br />


          <Typography
            variant="subtitle1"
            fontWeight={700}
            sx={{ mb: 1, mt: 1 }}
          >
            Short Label
          </Typography>

          <input
            type="text"
            value={shortLabel}
            onChange={(e) =>
              setShortLabel(e.target.value)
            }
            placeholder="Enter short label"
            className="w-full p-3 border rounded"
          />

          <br />


          <Typography
            variant="subtitle1"
            fontWeight={700}
            sx={{ mb: 1, mt: 1 }}
          >
            Category
          </Typography>


          <FormControl fullWidth>
            <InputLabel>Category</InputLabel>
            <Select
              value={category}
              label="Category"
              onChange={(e) =>
                setCategory(e.target.value)
              }
            >
              <MenuItem value="Main">
                Main Requirements
              </MenuItem>

              <MenuItem value="Medical">
                Medical Requirements
              </MenuItem>

              <MenuItem value="Others">
                Other Requirements
              </MenuItem>
            </Select>
          </FormControl>



          <br />

          <Typography
            variant="subtitle1"
            fontWeight={700}
            sx={{ mb: 1, mt: 1 }}
          >
            Is Optional Requirements?
          </Typography>

          <FormControl fullWidth>
            <InputLabel>Optional</InputLabel>

            <Select
              value={
                isOptional ? "Yes" : "No"
              }
              label="Optional"
              onChange={(e) =>
                setIsOptional(
                  e.target.value === "Yes"
                )
              }
            >
              <MenuItem value="Yes">
                Yes
              </MenuItem>

              <MenuItem value="No">
                No
              </MenuItem>
            </Select>
          </FormControl>

          <br />

          <Typography
            variant="subtitle1"
            fontWeight={700}
            sx={{ mb: 1, mt: 1 }}
          >
            Applicant Type
          </Typography>

          <FormControl fullWidth>
            <InputLabel>
              Applicant Type
            </InputLabel>

            <Select
              value={applicantType}
              label="Applicant Type"
              onChange={(e) =>
                setApplicantType(
                  e.target.value
                )
              }
            >
              <MenuItem value="0">
                All Applicants
              </MenuItem>

              <MenuItem value="1">
                Senior High School Graduate
              </MenuItem>

              <MenuItem value="2">
                Graduating Student
              </MenuItem>

              <MenuItem value="3">
                ALS Passer
              </MenuItem>

              <MenuItem value="4">
                Transferee
              </MenuItem>

              <MenuItem value="5">
                Cross Enrollee
              </MenuItem>

              <MenuItem value="6">
                Foreign Applicant/Student
              </MenuItem>

              <MenuItem value="7">
                Baccalaureate Graduate
              </MenuItem>

              <MenuItem value="8">
                Master Degree Graduate
              </MenuItem>
            </Select>
          </FormControl>

        </DialogContent>

        <DialogActions>

          <Button

            color="error"
            variant="outlined"

            onClick={() =>
              setOpenDialog(false)
            }
          >
            Cancel
          </Button>

          <Button
            variant="contained"
            onClick={handleSubmit}

            sx={{
              px: 4,
              fontWeight: 600,
              textTransform: "none"
            }}
          >
            <SaveIcon fontSize="small" /> Save


          </Button>

        </DialogActions>
      </Dialog>

      <Dialog
        open={openDeleteDialog}
        onClose={() => {
          setOpenDeleteDialog(false);
          setRequirementToDelete(null);
        }}
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
          Delete Requirement
        </DialogTitle>

        <DialogContent sx={{ p: 3, mt: 2 }}>
          <Typography sx={{ mb: 2 }}>
            Are you sure you want to delete the requirement{" "}
            <b>{requirementToDelete?.description}</b>?
          </Typography>

          <Typography
            sx={{
              color: "#d32f2f",
              fontSize: "0.95rem",
            }}
          >
            Deleting this requirement will permanently remove it from the
            requirements list.
            <br />
            Any applicant records, submissions, or processes that depend on this
            requirement may be affected.
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
            onClick={() => {
              setOpenDeleteDialog(false);
              setRequirementToDelete(null);
            }}
          >
            Cancel
          </Button>

          <Button
            color="error"
            variant="contained"
            onClick={() => {
              handleDelete(requirementToDelete.id);
              setOpenDeleteDialog(false);
              setRequirementToDelete(null);
            }}
          >
            Yes, Delete
          </Button>
        </DialogActions>
      </Dialog>




      {/* ✅ Snackbar */}
      <Snackbar
        open={snack.open}
        autoHideDuration={4000}
        onClose={handleCloseSnack}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          onClose={handleCloseSnack}
          severity={snack.severity}
          sx={{ width: "100%" }}
        >
          {snack.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default RequirementsForm;
