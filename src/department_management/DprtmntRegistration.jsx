import React, { useState, useEffect, useContext, useRef } from "react";
import { SettingsContext } from "../App";
import EaristLogo from "../assets/EaristLogo.png";
import axios from 'axios';
import {
  Container,
  Dialog,
  DialogTitle,
  DialogActions,
  DialogContent,
  Grid,
  Typography,
  TextField,
  Button,
  Box,
  IconButton,
  Snackbar,
  Alert,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Paper,
  Select,
  MenuItem,
  TableContainer,
  CircularProgress,
  FormControl,
} from "@mui/material";
import CloseIcon from '@mui/icons-material/Close';
import SearchIcon from "@mui/icons-material/Search";
import Unauthorized from "../components/Unauthorized";
import LoadingOverlay from "../components/LoadingOverlay";
import API_BASE_URL from "../apiConfig";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import SaveIcon from '@mui/icons-material/Save';
import { getFlatAuditHeaders } from "../utils/auditEvents";
import useAuditMac from "../utils/useAuditMac";

const DprtmntRegistration = () => {
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
  const [subButtonColor, setSubButtonColor] = useState("#ffffff");
  const [stepperColor, setStepperColor] = useState("#000000");

  const [fetchedLogo, setFetchedLogo] = useState(null);
  const [companyName, setCompanyName] = useState("");
  const [shortTerm, setShortTerm] = useState("");
  const [campusAddress, setCampusAddress] = useState("");

  // 🏢 Branches (from company_settings.branches) - used for the "components" field
  const [branches, setBranches] = useState([]);

  useEffect(() => {
    if (!settings) return;

    // 🎨 Colors
    if (colors.title) setTitleColor(colors.title);
    if (colors.subtitle) setSubtitleColor(colors.subtitle);
    if (colors.border) setBorderColor(colors.border);
    if (colors.mainButton) setMainButtonColor(colors.mainButton);
    if (colors.subButton) setSubButtonColor(colors.subButton);
    if (colors.stepper) setStepperColor(colors.stepper);

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

    // 🏢 Branches (components dropdown source)
    setBranches(settings.branches || []);

  }, [settings]);

  // 🔎 Helper to get a branch name from its id
  const getBranchName = (componentId) => {
    if (!componentId) return "—";
    const match = branches.find(
      (b) => String(b.id) === String(componentId)
    );
    return match ? match.branch : `Branch #${componentId}`;
  };

  const [department, setDepartment] = useState({
    dep_name: "",
    dep_code: "",
    dept_number: "",
    components: "",
  });
  const [departmentList, setDepartmentList] = useState([]);
  const [openModal, setOpenModal] = useState(false);
  const [departmentLoading, setDepartmentLoading] = useState(false);

  const [userID, setUserID] = useState("");
  const [user, setUser] = useState("");
  const [userRole, setUserRole] = useState("");
  const [hasAccess, setHasAccess] = useState(null);
  const [canCreate, setCanCreate] = useState(false);
  const [canEdit, setCanEdit] = useState(false);
  const [canDelete, setCanDelete] = useState(false);
  const [loading, setLoading] = useState(false);
  const [snack, setSnack] = useState({
    open: false,
    message: "",
    severity: "success",
  });
  const pageId = 21;

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

  useEffect(() => {
    fetchDepartment();
  }, []);

  const fetchDepartment = async () => {
    setDepartmentLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/api/get_department`);
      setDepartmentList(response.data || []);
    } catch (err) {
      console.error(err);
      setDepartmentList([]);
    } finally {
      setDepartmentLoading(false);
    }
  };

  const [editMode, setEditMode] = useState(false);
  const [selectedId, setSelectedId] = useState(null);

  const handleAddingDepartment = async () => {
    if (
      !department.dep_name ||
      !department.dep_code ||
      !department.dept_number ||
      !department.components
    ) {
      setSnack({
        open: true,
        message: "Please fill all fields",
        severity: "warning",
      });
      return;
    }

    if (editMode && !canEdit) {
      setSnack({
        open: true,
        message: "You do not have permission to edit this item",
        severity: "error",
      });
      return;
    }

    if (!editMode && !canCreate) {
      setSnack({
        open: true,
        message: "You do not have permission to create items on this page",
        severity: "error",
      });
      return;
    }

    try {
      if (editMode) {
        await axios.put(
          `${API_BASE_URL}/api/department/${selectedId}`,
          department,
          permissionHeaders,
        );

        setSnack({
          open: true,
          message: "Department updated successfully!",
          severity: "success",
        });
      } else {
        await axios.post(`${API_BASE_URL}/api/department`, department, permissionHeaders);

        setSnack({
          open: true,
          message: "Department added successfully!",
          severity: "success",
        });
      }

      fetchDepartment();
      setDepartment({
        dep_name: "",
        dep_code: "",
        dept_number: "",
        components: "",
      });
      setEditMode(false);
      setSelectedId(null);
      setOpenModal(false);

    } catch (err) {
      setSnack({
        open: true,
        message: err.response?.data?.message || "Operation failed",
        severity: "error",
      });
    }
  };

  const handleEdit = (dept) => {
    if (!canEdit) {
      setSnack({
        open: true,
        message: "You do not have permission to edit this item",
        severity: "error",
      });
      return;
    }

    setDepartment({
      dep_name: dept.dprtmnt_name,
      dep_code: dept.dprtmnt_code,
      dept_number: dept.dept_number,
      components: dept.components ?? "",
    });
    setSelectedId(dept.dprtmnt_id);
    setEditMode(true);
    setOpenModal(true);
  };

  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [departmentToDelete, setDepartmentToDelete] = useState(null);

  const handleDelete = async (id) => {
    if (!canDelete) {
      setSnack({
        open: true,
        message: "You do not have permission to delete this item",
        severity: "error",
      });
      return;
    }

    try {
      await axios.delete(
        `${API_BASE_URL}/api/department/${id}`,
        permissionHeaders
      );

      setSnack({
        open: true,
        message: "Department deleted successfully!",
        severity: "success",
      });

      fetchDepartment();
    } catch (err) {
      setSnack({
        open: true,
        message: "Failed to delete department",
        severity: "error",
      });
    }
  };



  const handleChangesForEverything = (e) => {
    const { name, value } = e.target;
    setDepartment(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // 🔎 Search
  const [searchQuery, setSearchQuery] = useState("");

  const filteredDepartments = departmentList.filter((dept) => {
    const q = searchQuery.toLowerCase();
    return (
      dept.dprtmnt_name?.toLowerCase().includes(q) ||
      dept.dprtmnt_code?.toLowerCase().includes(q) ||
      String(dept.dept_number ?? "").toLowerCase().includes(q) ||
      getBranchName(dept.components).toLowerCase().includes(q)
    );
  });

  // 📄 Pagination (same behavior as Program Panel)
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  const totalPages = Math.ceil(filteredDepartments.length / itemsPerPage) || 1;

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentDepartments = filteredDepartments.slice(
    indexOfFirstItem,
    indexOfLastItem,
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

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

  const showCreateActions = canCreate;
  const showActionColumn = canEdit || canDelete;

  return (
    <Box sx={{ height: "calc(100vh - 150px)", overflowY: "auto", paddingRight: 1, backgroundColor: "transparent", mt: 1, padding: 2 }}>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 2,
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
          DEPARTMENT REGISTRATION
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
          <TextField
            variant="outlined"
            placeholder="Search Department Name / Code / Branch"
            size="small"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
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
      </Box>
      <hr style={{ border: "1px solid #ccc", width: "100%" }} />

      <br />
      <br />

      {/* Total Records + Pagination Bar (same style as Program Panel) */}
      <TableContainer component={Paper} sx={{ width: '100%' }}>
        <Table size="small">
          <TableHead sx={{ backgroundColor: headerColor, color: "white" }}>
            <TableRow>
              <TableCell
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
                  {/* LEFT SIDE - TOTAL DEPARTMENTS */}
                  <Typography fontSize="14px" fontWeight="bold" color="white">
                    Total Department Records: {filteredDepartments.length}
                  </Typography>

                  {/* RIGHT SIDE - PAGINATION */}
                  <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
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
                      onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
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
                      onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
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
                          setEditMode(false);
                          setDepartment({
                            dep_name: "",
                            dep_code: "",
                            dept_number: "",
                            components: "",
                          });
                          setOpenModal(true);
                        }}
                      >
                        + Add Department
                      </Button>
                    )}
                  </Box>
                </Box>
              </TableCell>
            </TableRow>
          </TableHead>
        </Table>
      </TableContainer>

      <Box>
        {departmentLoading ? (
          <CircularProgress />
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow style={{
                border: `1px solid ${borderColor}`,
                backgroundColor: "#F5F5F5",
                color: "#000",
                width: "10%",
                textAlign: "center",
              }}>
                <TableCell sx={{ color: "#000", border: `1px solid ${borderColor}`, textAlign: "center", }}>#</TableCell>
                <TableCell sx={{ color: "#000", border: `1px solid ${borderColor}`, textAlign: "center", }}>Department Name</TableCell>
                <TableCell sx={{ color: "#000", border: `1px solid ${borderColor}`, textAlign: "center", }}>Code</TableCell>
                <TableCell sx={{ color: "#000", border: `1px solid ${borderColor}`, textAlign: "center", }}>Dept No.</TableCell>
                <TableCell sx={{ color: "#000", border: `1px solid ${borderColor}`, textAlign: "center", }}>Branch</TableCell>

                {showActionColumn && (
                  <TableCell sx={{ color: "#000", border: `1px solid ${borderColor}`, textAlign: "center", }}>Action</TableCell>
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
              {currentDepartments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6}><em>No Department</em></TableCell>
                </TableRow>
              ) : (
                currentDepartments.map((dept, index) => (
                  <TableRow key={dept.dprtmnt_id}>
                    <TableCell sx={{ border: `1px solid ${borderColor}`, textAlign: "center" }}>{indexOfFirstItem + index + 1}</TableCell>

                    <TableCell sx={{ border: `1px solid ${borderColor}`, textAlign: "center" }}>
                      {dept.dprtmnt_name}
                    </TableCell>

                    <TableCell sx={{ border: `1px solid ${borderColor}`, textAlign: "center" }}>
                      {dept.dprtmnt_code}
                    </TableCell>

                    <TableCell sx={{ border: `1px solid ${borderColor}`, textAlign: "center" }}>
                      {dept.dept_number}
                    </TableCell>

                    <TableCell sx={{ border: `1px solid ${borderColor}`, textAlign: "center" }}>
                      {getBranchName(dept.components)}
                    </TableCell>

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
                            flexDirection: "row",
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
                              onClick={() => handleEdit(dept)}
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
                              onClick={() => {
                                setDepartmentToDelete(dept);
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
                ))
              )}
            </TableBody>
          </Table>
        )}
        {departmentList.length === 0 && !departmentLoading && <p>No departments available.</p>}
      </Box>

      {/* Total Records + Pagination Bar (same style as Program Panel) */}
      <TableContainer component={Paper} sx={{ width: '100%' }}>
        <Table size="small">
          <TableHead sx={{ backgroundColor: headerColor, color: "white" }}>
            <TableRow>
              <TableCell
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
                  {/* LEFT SIDE - TOTAL DEPARTMENTS */}
                  <Typography fontSize="14px" fontWeight="bold" color="white">
                    Total Department Records: {filteredDepartments.length}
                  </Typography>

                  {/* RIGHT SIDE - PAGINATION */}
                  <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
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
                      onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
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
                      onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
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


      <Dialog
        open={openModal}
        onClose={() => setOpenModal(false)}
        fullWidth
        maxWidth="sm"
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
            py: 2,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center"
          }}
        >
          {editMode ? "Edit Department" : "Add New Department"}

          <IconButton
            onClick={() => setOpenModal(false)}
            sx={{ color: "white" }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        {/* CONTENT */}
        <DialogContent sx={{ p: 3 }}>
          <Box display="flex" flexDirection="column" gap={2} mt={1}>
            <Typography fontWeight="bold" mt={2}>
              Department Name:
            </Typography>

            <TextField
              label="Department Name"
              name="dep_name"
              value={department.dep_name}
              onChange={handleChangesForEverything}
              fullWidth
            />

            <Typography fontWeight="bold" mt={1}>
              Department Code:
            </Typography>

            <TextField
              label="Department Code"
              name="dep_code"
              value={department.dep_code}
              onChange={handleChangesForEverything}
              fullWidth
            />

            <Typography fontWeight="bold" mt={1}>
              Department Number:
            </Typography>

            <TextField
              label="Department Number"
              name="dept_number"
              type="number"
              value={department.dept_number}
              onChange={handleChangesForEverything}
              fullWidth
            />

            <Typography fontWeight="bold" mt={1}>
              Branch:
            </Typography>

            <Select
              name="components"
              value={department.components}
              onChange={handleChangesForEverything}
              displayEmpty
              fullWidth
            >
              <MenuItem value="">
                <em>Select a branch</em>
              </MenuItem>
              {branches.map((branch) => (
                <MenuItem key={branch.id} value={branch.id}>
                  {branch.branch}
                </MenuItem>
              ))}
            </Select>
          </Box>
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
            color="error"
            variant="outlined"
            sx={{
              textTransform: "none",
              fontWeight: 600
            }}
            onClick={() => setOpenModal(false)}
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
            onClick={handleAddingDepartment}
          >
            <SaveIcon fontSize="small" style={{ marginRight: 6 }} />
            Save
          </Button>
        </DialogActions>
      </Dialog>


      <Snackbar
        open={snack.open}
        autoHideDuration={3000}
        onClose={() => setSnack({ ...snack, open: false })}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          severity={snack.severity}
          onClose={() => setSnack({ ...snack, open: false })}
          sx={{ width: "100%" }}
        >
          {snack.message}
        </Alert>
      </Snackbar>

      <Dialog
        open={openDeleteDialog}
        onClose={() => {
          setOpenDeleteDialog(false);
          setDepartmentToDelete(null);
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
          Delete Department
        </DialogTitle>

        <DialogContent sx={{ p: 3, mt: 2 }}>
          <Typography sx={{ mb: 2 }}>
            Are you sure you want to delete the department{" "}
            <b>{departmentToDelete?.dprtmnt_name}</b> (
            <b>{departmentToDelete?.dprtmnt_code}</b>)?
          </Typography>

          <Typography
            sx={{
              color: "#d32f2f",
              fontSize: "0.95rem",
            }}
          >
            Deleting this department will permanently remove it from the department
            list.
            <br />
            Any department sections, faculty assignments, or records associated with
            this department may be affected.
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
              setDepartmentToDelete(null);
            }}
          >
            Cancel
          </Button>

          <Button
            color="error"
            variant="contained"
            onClick={() => {
              handleDelete(departmentToDelete.dprtmnt_id);
              setOpenDeleteDialog(false);
              setDepartmentToDelete(null);
            }}
          >
            Yes, Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DprtmntRegistration;
