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
  Autocomplete,
  Divider,
} from "@mui/material";
import CloseIcon from '@mui/icons-material/Close';
import SearchIcon from "@mui/icons-material/Search";
import Unauthorized from "../components/Unauthorized";
import LoadingOverlay from "../components/LoadingOverlay";
import API_BASE_URL from "../apiConfig";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import SaveIcon from '@mui/icons-material/Save';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
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
      "x-audit-actor-role": userRole || localStorage.getItem("role") || "administrator",
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
      const response = await axios.get(`${API_BASE_URL}/api/page_access/${employeeID}/${pageId}`, { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` } });
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
      const response = await axios.get(`${API_BASE_URL}/api/get_department`, { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` } });
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

  const [openOrganizationModal, setOpenOrganizationModal] = useState(false);
  const [organizationDepartment, setOrganizationDepartment] = useState(null);
  const [organizationLoading, setOrganizationLoading] = useState(false);
  const [organizationSaving, setOrganizationSaving] = useState(false);
  const [organizationData, setOrganizationData] = useState({
    curricula: [],
    faculty: [],
  });
  const [deanEmployeeId, setDeanEmployeeId] = useState("");
  const [chairAssignments, setChairAssignments] = useState({});

  const getFacultyLabel = (faculty) => {
    if (!faculty) return "";
    const middleInitial = faculty.mname
      ? ` ${String(faculty.mname).trim().charAt(0)}.`
      : "";
    const name = `${faculty.lname || ""}, ${faculty.fname || ""}${middleInitial}`
      .replace(/^,\s*/, "")
      .trim();
    return `${name || "Unnamed faculty"} (${faculty.employee_id})`;
  };

  const getCurriculumLabel = (curriculum) => {
    const major = curriculum.major ? ` - ${curriculum.major}` : "";
    const year = curriculum.year_description
      ? ` (${curriculum.year_description})`
      : "";
    return `${curriculum.program_code || "Program"}${major}${year}`;
  };

  const getFacultyByEmployeeId = (employeeId) =>
    organizationData.faculty.find(
      (faculty) => String(faculty.employee_id) === String(employeeId),
    ) || null;

  const handleOpenOrganization = async (dept) => {
    setOrganizationDepartment(dept);
    setOpenOrganizationModal(true);
    setOrganizationLoading(true);
    setDeanEmployeeId("");
    setChairAssignments({});
    setOrganizationData({ curricula: [], faculty: [] });

    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/department/${dept.dprtmnt_id}/organization`,
        { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` } },
      );
      const curricula = response.data?.curricula || [];
      const faculty = response.data?.faculty || [];
      const assignments = response.data?.assignments || [];
      const dean = assignments.find((item) => item.position === "DEAN");
      const chairs = assignments.reduce((result, item) => {
        if (item.position === "PROGRAM_CHAIR" && item.curriculum_id != null) {
          result[String(item.curriculum_id)] = String(item.employee_id);
        }
        return result;
      }, {});

      setOrganizationData({ curricula, faculty });
      setDeanEmployeeId(dean ? String(dean.employee_id) : "");
      setChairAssignments(chairs);
    } catch (err) {
      setSnack({
        open: true,
        message: err.response?.data?.message || "Failed to load department organization",
        severity: "error",
      });
    } finally {
      setOrganizationLoading(false);
    }
  };

  const handleSaveOrganization = async () => {
    if (!organizationDepartment || !canEdit) return;

    setOrganizationSaving(true);
    try {
      const chairs = organizationData.curricula
        .map((curriculum) => ({
          curriculum_id: curriculum.curriculum_id,
          employee_id: chairAssignments[String(curriculum.curriculum_id)] || "",
        }))
        .filter((chair) => chair.employee_id);

      await axios.put(
        `${API_BASE_URL}/api/department/${organizationDepartment.dprtmnt_id}/organization`,
        {
          dean_employee_id: deanEmployeeId || null,
          chairs,
        },
        permissionHeaders,
      );

      setSnack({
        open: true,
        message: "Department organization saved successfully!",
        severity: "success",
      });
      fetchDepartment();
      setOpenOrganizationModal(false);
    } catch (err) {
      setSnack({
        open: true,
        message: err.response?.data?.message || "Failed to save department organization",
        severity: "error",
      });
    } finally {
      setOrganizationSaving(false);
    }
  };

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
      getBranchName(dept.components).toLowerCase().includes(q) ||
      dept.dean_name?.toLowerCase().includes(q)
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

  useEffect(() => {
    setCurrentPage((previous) => Math.min(previous, totalPages));
  }, [totalPages]);

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

      <TableContainer
        component={Paper}
        elevation={0}
        sx={{
          width: "100%",
          backgroundColor: "#fff",
          border: "1px solid #e5e7eb",
          borderBottom: 0,
          borderRadius: "12px 12px 0 0",
          overflow: "hidden",
        }}
      >
        <Table size="small">
          <TableHead sx={{ backgroundColor: headerColor, color: "white" }}>
            <TableRow>
              <TableCell
                sx={{
                  border: 0,
                  py: 0.75,
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
                    Departments&nbsp;&nbsp;
                  </Typography>

                  {/* RIGHT SIDE - PAGINATION */}
                  <Box
                    display="flex"
                    alignItems="center"
                    gap={1}
                    flexWrap="wrap"
                    sx={{
                      "& > *:not(.add-department-button)": { display: "none" },
                    }}
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
                        className="add-department-button"
                        variant="contained"
                        sx={{
                          backgroundColor: "#fff",
                          color: headerColor,
                          fontWeight: "bold",
                          borderRadius: "7px",
                          minWidth: "auto",
                          textTransform: "none",
                          px: 2.25,
                          py: 0.75,
                          "&:hover": {
                            backgroundColor: "#f8fafc",
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
                        + Add department
                      </Button>
                    )}
                  </Box>
                </Box>
              </TableCell>
            </TableRow>
          </TableHead>
        </Table>
      </TableContainer>

      <Box
        sx={{
          backgroundColor: "#fff",
          borderLeft: "1px solid #e5e7eb",
          borderRight: "1px solid #e5e7eb",
        }}
      >
        {departmentLoading ? (
          <CircularProgress />
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow sx={{ backgroundColor: "#fafafa" }}>
                <TableCell sx={{ color: "#6b7280", borderBottom: "1px solid #e5e7eb", width: 40 }}>#</TableCell>
                <TableCell sx={{ color: "#6b7280", borderBottom: "1px solid #e5e7eb" }}>Department</TableCell>
                <TableCell sx={{ color: "#6b7280", borderBottom: "1px solid #e5e7eb", width: 100 }}>Code</TableCell>
                <TableCell sx={{ color: "#6b7280", borderBottom: "1px solid #e5e7eb", width: 100, textAlign: "center" }}>Dept No.</TableCell>
                <TableCell sx={{ color: "#6b7280", borderBottom: "1px solid #e5e7eb", width: 120 }}>Branch</TableCell>
                <TableCell sx={{ color: "#6b7280", borderBottom: "1px solid #e5e7eb", width: 210 }}>Dean</TableCell>

                {showActionColumn && (
                  <TableCell sx={{ color: "#6b7280", borderBottom: "1px solid #e5e7eb", width: 130, textAlign: "center" }}>
                    Action
                  </TableCell>
                )}
              </TableRow>
            </TableHead>

            <TableBody
              sx={{
                backgroundColor: "#fff",
                "& .MuiTableRow-root": { backgroundColor: "#fff" },
                "& .MuiTableRow-root:hover": { backgroundColor: "#fafafa" },
                "& .MuiTableCell-root": { borderBottom: "1px solid #eeeeee" },
              }}
            >
              {currentDepartments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={showActionColumn ? 7 : 6} sx={{ py: 5, textAlign: "center" }}>
                    <em>No Department</em>
                  </TableCell>
                </TableRow>
              ) : (
                currentDepartments.map((dept, index) => (
                  <TableRow key={dept.dprtmnt_id}>
                    <TableCell sx={{ color: "#6b7280" }}>{indexOfFirstItem + index + 1}</TableCell>

                    <TableCell sx={{ fontWeight: 600, color: "#111827" }}>
                      {dept.dprtmnt_name}
                    </TableCell>

                    <TableCell>
                      <Box
                        component="span"
                        sx={{
                          display: "inline-block",
                          px: 0.8,
                          py: 0.2,
                          borderRadius: "4px",
                          backgroundColor: "#f3f4f6",
                          color: "#374151",
                          fontSize: "0.75rem",
                          fontWeight: 700,
                        }}
                      >
                        {dept.dprtmnt_code}
                      </Box>
                    </TableCell>

                    <TableCell sx={{ color: "#4b5563", textAlign: "center" }}>
                      {dept.dept_number}
                    </TableCell>

                    <TableCell sx={{ color: "#4b5563" }}>
                      {getBranchName(dept.components)}
                    </TableCell>

                    <TableCell sx={{ color: dept.dean_name ? "#111827" : "#6b7280" }}>
                      {dept.dean_name || "Not assigned"}
                    </TableCell>

                    {showActionColumn && (
                      <TableCell
                        sx={{
                          width: 130,
                          py: 0.5,
                        }}
                      >
                        <Box
                          sx={{
                            display: "flex",
                            flexDirection: "row",
                            justifyContent: "center",
                            alignItems: "center",
                            gap: 0.25,
                          }}
                        >
                          {canEdit && (
                            <IconButton
                              aria-label="Manage organization"
                              title="Manage organization"
                              sx={{
                                color: "#2563eb",
                                p: 0.75,
                                "&:hover": { backgroundColor: "#eff6ff" },
                              }}
                              onClick={() => handleOpenOrganization(dept)}
                            >
                              <AccountTreeIcon sx={{ fontSize: 18 }} />
                            </IconButton>
                          )}

                          {canEdit && (
                            <IconButton
                              aria-label="Edit department"
                              title="Edit department"
                              sx={{
                                color: "#374151",
                                p: 0.75,
                                "&:hover": { backgroundColor: "#f3f4f6" },
                              }}
                              onClick={() => handleEdit(dept)}
                            >
                              <EditIcon sx={{ fontSize: 18 }} />
                            </IconButton>
                          )}

                          {canDelete && (
                            <IconButton
                              aria-label="Delete department"
                              title="Delete department"
                              sx={{
                                color: "#dc2626",
                                p: 0.75,
                                "&:hover": { backgroundColor: "#fef2f2" },
                              }}
                              onClick={() => {
                                setDepartmentToDelete(dept);
                                setOpenDeleteDialog(true);
                              }}
                            >
                              <DeleteIcon sx={{ fontSize: 18 }} />
                            </IconButton>
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
      </Box>

      <Box
        sx={{
          display: "none",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 1.5,
          px: 2,
          py: 1.1,
          backgroundColor: "#fff",
          border: "1px solid #e5e7eb",
          borderTop: 0,
          borderRadius: "0 0 12px 12px",
        }}
      >
        <Typography fontSize="0.8rem" color="#6b7280">
          Showing {filteredDepartments.length === 0 ? 0 : indexOfFirstItem + 1}–{Math.min(indexOfLastItem, filteredDepartments.length)} of {filteredDepartments.length}
        </Typography>

        <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
          <Button
            variant="outlined"
            size="small"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(1)}
            sx={{ minWidth: 52, textTransform: "none", color: "#374151", borderColor: "#d1d5db" }}
          >
            First
          </Button>
          <Button
            variant="outlined"
            size="small"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((previous) => Math.max(previous - 1, 1))}
            sx={{ minWidth: 48, textTransform: "none", color: "#374151", borderColor: "#d1d5db" }}
          >
            Prev
          </Button>
          <FormControl size="small">
            <Select
              value={currentPage}
              onChange={(event) => setCurrentPage(Number(event.target.value))}
              sx={{
                height: 32,
                minWidth: 82,
                fontSize: "0.8rem",
                backgroundColor: "#fff",
              }}
            >
              {Array.from({ length: totalPages }, (_, pageIndex) => (
                <MenuItem key={pageIndex + 1} value={pageIndex + 1}>
                  Page {pageIndex + 1}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Typography fontSize="0.8rem" color="#6b7280">
            of {totalPages}
          </Typography>
          <Button
            variant="outlined"
            size="small"
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage((previous) => Math.min(previous + 1, totalPages))}
            sx={{ minWidth: 48, textTransform: "none", color: "#374151", borderColor: "#d1d5db" }}
          >
            Next
          </Button>
          <Button
            variant="outlined"
            size="small"
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage(totalPages)}
            sx={{ minWidth: 48, textTransform: "none", color: "#374151", borderColor: "#d1d5db" }}
          >
            Last
          </Button>
        </Box>
      </Box>

      {/* Total Records + Pagination Bar (same style as Program Panel) */}
      <TableContainer component={Paper} sx={{ width: "100%" }}>
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

      <Dialog
        open={openOrganizationModal}
        onClose={() => {
          if (!organizationSaving) setOpenOrganizationModal(false);
        }}
        fullWidth
        maxWidth="md"
        PaperProps={{
          sx: {
            borderRadius: 3,
            overflow: "hidden",
            width: "min(920px, calc(100vw - 32px))",
            maxHeight: "82vh",
          },
        }}
      >
        <DialogTitle
          sx={{
            background: headerColor,
            color: "#fff",
            fontWeight: 700,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            px: 2.5,
            py: 1.25,
          }}
        >
          <Box>
            <Typography fontWeight={700} fontSize="1rem">Manage Organization</Typography>
            <Typography variant="body2" sx={{ opacity: 0.9, fontSize: "0.78rem" }}>
              {organizationDepartment?.dprtmnt_name} ({organizationDepartment?.dprtmnt_code})
            </Typography>
          </Box>
          <IconButton
            onClick={() => setOpenOrganizationModal(false)}
            disabled={organizationSaving}
            sx={{ color: "white" }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ p: 2 }}>
          {organizationLoading ? (
            <Box sx={{ minHeight: 280, display: "grid", placeItems: "center" }}>
              <CircularProgress />
            </Box>
          ) : (
            <Grid container spacing={2} sx={{ mt: 0 }}>
              <Grid item xs={12} md={6}>
                <Typography fontWeight={600} sx={{ mb: 1 }}>
                  Dean
                </Typography>
                <Autocomplete
                  size="small"
                  options={organizationData.faculty}
                  value={getFacultyByEmployeeId(deanEmployeeId)}
                  onChange={(_, value) =>
                    setDeanEmployeeId(value ? String(value.employee_id) : "")
                  }
                  getOptionLabel={getFacultyLabel}
                  isOptionEqualToValue={(option, value) =>
                    String(option.employee_id) === String(value.employee_id)
                  }
                  getOptionDisabled={(option) => Number(option.status) !== 1}
                  renderInput={(params) => (
                    <TextField {...params} label="Select Dean" placeholder="Search faculty" />
                  )}
                />

                <Divider sx={{ my: 2 }} />

                <Typography fontWeight={700} gutterBottom>
                  Program Chairs per Curriculum
                </Typography>
                {organizationData.curricula.length === 0 ? (
                  <Alert severity="info" sx={{ mt: 2 }}>
                    No curricula are currently mapped to this department.
                  </Alert>
                ) : (
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 1.25, mt: 1.5 }}>
                    {organizationData.curricula.map((curriculum) => {
                      const curriculumId = String(curriculum.curriculum_id);
                      return (
                        <Box
                          key={curriculum.curriculum_id}
                          sx={{ p: 1.25, border: "1px solid #ddd", borderRadius: 2 }}
                        >
                          <Typography fontSize="0.85rem" fontWeight={600} sx={{ mb: 0.75 }}>
                            {getCurriculumLabel(curriculum)}
                          </Typography>
                          <Autocomplete
                            options={organizationData.faculty}
                            value={getFacultyByEmployeeId(chairAssignments[curriculumId])}
                            onChange={(_, value) =>
                              setChairAssignments((previous) => ({
                                ...previous,
                                [curriculumId]: value ? String(value.employee_id) : "",
                              }))
                            }
                            getOptionLabel={getFacultyLabel}
                            isOptionEqualToValue={(option, value) =>
                              String(option.employee_id) === String(value.employee_id)
                            }
                            getOptionDisabled={(option) => Number(option.status) !== 1}
                            renderInput={(params) => (
                              <TextField
                                {...params}
                                size="small"
                                label="Select Program Chair"
                                placeholder="Search faculty"
                              />
                            )}
                          />
                        </Box>
                      );
                    })}
                  </Box>
                )}
              </Grid>

              <Grid item xs={12} md={6}>
                <Typography fontSize="1rem" fontWeight={700} gutterBottom>
                  Organization Chart Preview
                </Typography>
                <Box
                  sx={{
                    mt: 1.5,
                    p: 2,
                    minHeight: 230,
                    borderRadius: 2,
                    backgroundColor: "#f7f9fc",
                    border: "1px solid #dbe3ef",
                    textAlign: "center",
                  }}
                >
                  <Paper
                    elevation={2}
                    sx={{
                      display: "inline-block",
                      px: 2,
                      py: 1.25,
                      borderTop: `4px solid ${headerColor}`,
                      minWidth: 200,
                    }}
                  >
                    <Typography variant="caption" color="text.secondary" fontWeight={700}>
                      DEAN
                    </Typography>
                    <Typography fontWeight={700}>
                      {deanEmployeeId
                        ? getFacultyLabel(getFacultyByEmployeeId(deanEmployeeId))
                        : "Not assigned"}
                    </Typography>
                  </Paper>

                  <Box sx={{ width: 2, height: 24, backgroundColor: "#9aa7b5", mx: "auto" }} />

                  <Box
                    sx={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(175px, 1fr))",
                      gap: 1.25,
                    }}
                  >
                    {organizationData.curricula.map((curriculum) => {
                      const curriculumId = String(curriculum.curriculum_id);
                      const chair = getFacultyByEmployeeId(chairAssignments[curriculumId]);
                      return (
                        <Paper key={curriculumId} variant="outlined" sx={{ p: 1.25 }}>
                          <Typography variant="caption" color="text.secondary" fontWeight={700}>
                            PROGRAM CHAIR
                          </Typography>
                          <Typography fontSize="0.85rem" fontWeight={700} sx={{ my: 0.25 }}>
                            {chair ? getFacultyLabel(chair) : "Not assigned"}
                          </Typography>
                          <Typography variant="body2" fontSize="0.75rem" color="text.secondary">
                            {getCurriculumLabel(curriculum)}
                          </Typography>
                        </Paper>
                      );
                    })}
                  </Box>
                </Box>
              </Grid>
            </Grid>
          )}
        </DialogContent>

        <DialogActions sx={{ px: 2, py: 1.25, borderTop: "1px solid #e0e0e0" }}>
          <Button
            color="error"
            variant="outlined"
            disabled={organizationSaving}
            onClick={() => setOpenOrganizationModal(false)}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            disabled={organizationLoading || organizationSaving || !canEdit}
            onClick={handleSaveOrganization}
            startIcon={organizationSaving ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
          >
            {organizationSaving ? "Saving..." : "Save Organization"}
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
