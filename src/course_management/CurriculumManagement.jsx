import React, { useState, useEffect, useContext, useRef } from "react";
import { SettingsContext } from "../App";
import axios from "axios";
import {
  Box,
  Typography,
  Button,
  Snackbar,
  FormControl,
  Select,
  InputLabel,
  MenuItem,
  Grid,
  Alert,
  Card,
  Paper,
  CardContent,
  TableContainer,
  Table,
  TableHead,
  TableCell,
  TableRow,
  TableBody,
  Switch,
  Autocomplete,
  TextField,
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
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import { FaFileExcel } from "react-icons/fa";
import { getFlatAuditHeaders } from "../utils/auditEvents";
import useAuditMac from "../utils/useAuditMac";
import SaveIcon from "@mui/icons-material/Save";

const cleanSearchValue = (value) => {
  if (value === null || value === undefined) return "";
  const text = String(value).trim();
  return ["null", "undefined"].includes(text.toLowerCase()) ? "" : text;
};

const getCurriculumSearchText = (item) =>
  [
    item?.year_description,
    item?.program_code,
    item?.program_description,
    item?.major,
    item?.branch,
    item?.components,
  ]
    .map(cleanSearchValue)
    .join(" ")
    .toLowerCase();

const getCurriculumSuggestionValue = (item) =>
  cleanSearchValue(item?.program_code) ||
  cleanSearchValue(item?.program_description) ||
  cleanSearchValue(item?.year_description);

const CurriculumManagement = () => {
  useAuditMac();
  const settings = useContext(SettingsContext);

  const colors = settings?.colors || {};
  const titleColor = colors.title || "#000000";
  const borderColor = colors.border || "#000000";
  const headerColor = colors.header || "#1976d2";
  const branches = settings?.branches || [];

  const [curriculum, setCurriculum] = useState({ year_id: "", program_id: "" });
  const [yearList, setYearList] = useState([]);
  const [programList, setProgramList] = useState([]);
  const [curriculumList, setCurriculumList] = useState([]);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });
  const importInputRef = useRef(null);
  const [importingXlsx, setImportingXlsx] = useState(false);

  const [userID, setUserID] = useState("");
  const [user, setUser] = useState("");
  const [userRole, setUserRole] = useState("");
  const [hasAccess, setHasAccess] = useState(null);
  const [loading, setLoading] = useState(false);

  // ✅ ADD PERMISSION STATES
  const [canCreate, setCanCreate] = useState(false);
  const [canDelete, setCanDelete] = useState(false);
  const [canEdit, setCanEdit] = useState(false);

  const pageId = 18;
  const [employeeID, setEmployeeID] = useState("");

  const getPermissionHeaders = () => ({
    ...getFlatAuditHeaders(),
    "x-employee-id": employeeID || localStorage.getItem("employee_id") || "",
    "x-page-id": pageId,
    "x-audit-actor-id":
      employeeID ||
      localStorage.getItem("employee_id") ||
      localStorage.getItem("email") ||
      "unknown",
    "x-audit-actor-role": userRole || localStorage.getItem("role") || "administrator",
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

  // ✅ UPDATED checkAccess to include permissions
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

  useEffect(() => {
    fetchYear();
    fetchProgram();
    fetchCurriculum();
  }, []);

  const fetchYear = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/year_table`, { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` } });
      setYearList(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchProgram = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/get_program`, { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` } });
      setProgramList(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchCurriculum = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/get_curriculum`, { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` } });
      setCurriculumList(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const getBranchLabel = (branchId) => {
    const branch = branches.find(
      (item) => Number(item.id) === Number(branchId),
    );
    return branch?.branch || "—";
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setCurriculum((prev) => ({ ...prev, [name]: value }));
  };

  // ✅ UPDATED handleAddCurriculum with permission checks
  const handleAddCurriculum = async () => {
    if (!curriculum.year_id || !curriculum.program_id) {
      setSnackbar({
        open: true,
        message: "Please fill all fields",
        severity: "warning",
      });
      return false;
    }

    // ✅ Check permissions
    if (editingId && !canEdit) {
      setSnackbar({
        open: true,
        message: "You do not have permission to edit this item",
        severity: "error",
      });
      return false;
    }

    if (!editingId && !canCreate) {
      setSnackbar({
        open: true,
        message: "You do not have permission to create items on this page",
        severity: "error",
      });
      return false;
    }

    try {
      if (editingId) {
        await axios.put(
          `${API_BASE_URL}/api/update_curriculum_data/${editingId}`,
          curriculum,
          { headers: getPermissionHeaders() },
        );

        setSnackbar({
          open: true,
          message: "Curriculum updated successfully!",
          severity: "success",
        });

        setEditingId(null);
      } else {
        await axios.post(`${API_BASE_URL}/api/curriculum`, curriculum, {
          headers: getPermissionHeaders(),
        });

        setSnackbar({
          open: true,
          message: "Curriculum successfully added!",
          severity: "success",
        });
      }

      setCurriculum({ year_id: "", program_id: "" });
      fetchCurriculum();
      return true;
    } catch (err) {
      console.error(err);
      setSnackbar({
        open: true,
        message: err.response?.data?.message || "Operation failed!",
        severity: "error",
      });
      return false;
    }
  };

  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [curriculumToDelete, setCurriculumToDelete] = useState(null);

  // ✅ UPDATED confirmDelete with permission check
  const confirmDelete = (item) => {
    if (!canDelete) {
      setSnackbar({
        open: true,
        message: "You do not have permission to delete this item",
        severity: "error",
      });
      return;
    }

    setCurriculumToDelete(item);
    setOpenDeleteDialog(true);
  };

  const handleDeleteConfirmed = async () => {
    if (!curriculumToDelete) return;

    try {
      await axios.delete(
        `${API_BASE_URL}/api/delete_curriculum/${curriculumToDelete.curriculum_id}`,
        { headers: getPermissionHeaders() },
      );

      setSnackbar({
        open: true,
        message: "Curriculum deleted successfully!",
        severity: "success",
      });

      fetchCurriculum();
    } catch (err) {
      console.error(err);

      setSnackbar({
        open: true,
        message: "Delete failed!",
        severity: "error",
      });
    } finally {
      setOpenDeleteDialog(false);
      setCurriculumToDelete(null);
    }
  };

  const [editingId, setEditingId] = useState(null);
  const [openCurriculumDialog, setOpenCurriculumDialog] = useState(false);

  // ✅ UPDATED handleEdit with permission check
  const handleEdit = (item) => {
    if (!canEdit) {
      setSnackbar({
        open: true,
        message: "You do not have permission to edit this item",
        severity: "error",
      });
      return;
    }

    setCurriculum({
      year_id: item.year_id,
      program_id: item.program_id,
    });

    setEditingId(item.curriculum_id);
    setOpenCurriculumDialog(true);
  };

  // ✅ UPDATED handleUpdateStatus with permission check
  const handleUpdateStatus = async (id, currentStatus) => {
    if (!canEdit) {
      setSnackbar({
        open: true,
        message: "You do not have permission to edit this item",
        severity: "error",
      });
      return;
    }

    const newStatus = currentStatus === 1 ? 0 : 1;

    // Instantly update UI
    setCurriculumList((prevList) =>
      prevList.map((item) =>
        item.curriculum_id === id ? { ...item, lock_status: newStatus } : item,
      ),
    );

    // Show instant feedback
    setSnackbar({
      open: true,
      message: `Curriculum #${id} is now ${newStatus === 1 ? "Active" : "Inactive"}`,
      severity: "info",
    });

    try {
      await axios.put(
        `${API_BASE_URL}/api/update_curriculum/${id}`,
        { lock_status: newStatus },
        { headers: getPermissionHeaders() },
      );

      // Confirm success
      setSnackbar({
        open: true,
        message: `Curriculum #${id} successfully set to ${newStatus === 1 ? "Active" : "Inactive"}`,
        severity: "success",
      });
    } catch (err) {
      console.error("Error updating status:", err);

      // Revert UI if failed
      setCurriculumList((prevList) =>
        prevList.map((item) =>
          item.curriculum_id === id
            ? { ...item, lock_status: currentStatus }
            : item,
        ),
      );

      setSnackbar({
        open: true,
        message: "Failed to update curriculum status. Please try again.",
        severity: "error",
      });
    }
  };

  // ✅ UPDATED handleCurriculumImport with permission check
  const handleCurriculumImport = async (event) => {
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
        `${API_BASE_URL}/api/import-curriculum-xlsx`,
        formData,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
            "Content-Type": "multipart/form-data",
            ...getPermissionHeaders(),
          },
        },
      );

      if (response.data?.success) {
        setSnackbar({
          open: true,
          message: response.data.message || "Curriculum import completed.",
          severity: "success",
        });
        fetchCurriculum();
      } else {
        setSnackbar({
          open: true,
          message: response.data?.error || "Curriculum import failed.",
          severity: "error",
        });
      }
    } catch (error) {
      setSnackbar({
        open: true,
        message: error.response?.data?.error || "Curriculum import failed.",
        severity: "error",
      });
    } finally {
      setImportingXlsx(false);
      event.target.value = "";
    }
  };

  const [searchQuery, setSearchQuery] = useState("");
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const formatAcademicYear = (year) => {
    if (!year) return "";

    if (typeof year === "string" && year.includes("-")) {
      return year;
    }

    const startYear = Number(year);

    if (isNaN(startYear)) return "";

    return `${startYear}-${startYear + 1}`;
  };

  const getYearLabel = (yearId) => {
    const year = yearList.find((y) => Number(y.year_id) === Number(yearId));

    if (!year) return "";

    return formatAcademicYear(year.year_description);
  };

  const filteredCurriculumList = curriculumList.filter((item) => {
    const words = searchQuery.trim().toLowerCase().split(" ").filter(Boolean);

    return words.every(
      (word) =>
        String(formatAcademicYear(item.year_description))
          .toLowerCase()
          .includes(word) ||
        String(item.program_code ?? "")
          .toLowerCase()
          .includes(word) ||
        String(item.program_description ?? "")
          .toLowerCase()
          .includes(word) ||
        String(item.major ?? "")
          .toLowerCase()
          .includes(word),
    );
  });
  const curriculumSuggestions =
    searchQuery.trim().length >= 2
      ? curriculumList
          .filter((item) =>
            getCurriculumSearchText(item).includes(searchQuery.trim().toLowerCase()),
          )
          .slice(0, 10)
      : [];

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  const totalPages = Math.ceil(filteredCurriculumList.length / itemsPerPage);

  const paginatedCurriculum = filteredCurriculumList.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  const buttonStyles = {
    minWidth: 70,
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
  };

  const selectStyles = {
    fontSize: "12px",
    height: 36,
    color: "white",
    border: "1px solid white",
    backgroundColor: "transparent",
    ".MuiOutlinedInput-notchedOutline": { borderColor: "white" },
    "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "white" },
    "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: "white" },
    "& svg": { color: "white" },
  };

  const showCreateActions = canCreate;
  const showActionColumn = canEdit || canDelete;

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
          sx={{
            fontWeight: "bold",
            color: titleColor,
            fontSize: "36px",
            mb: 2,
          }}
        >
          CURRICULUM MANAGEMENT
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
          <Box sx={{ position: "relative", width: 460, maxWidth: "100%" }}>
            <TextField
              variant="outlined"
              placeholder="Search Year / Program Code / Description / Major"
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
                {curriculumSuggestions.length > 0 ? (
                  curriculumSuggestions.map((item) => (
                    <Box
                      key={item.curriculum_id}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setSearchQuery(getCurriculumSuggestionValue(item));
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
                        {formatAcademicYear(item.year_description) || "N/A"}
                      </Typography>
                      <Typography sx={{ fontSize: 14, color: "#555" }}>|</Typography>
                      <Typography sx={{ fontSize: 14 }} noWrap>
                        ({cleanSearchValue(item.program_code) || "N/A"}){" "}
                        {cleanSearchValue(item.program_description) || "Unnamed Program"}
                        {item.major ? ` (${item.major})` : ""}
                      </Typography>
                    </Box>
                  ))
                ) : (
                  <Box sx={{ px: 2, py: 1.25, fontSize: 13, color: "#666" }}>
                    No matching curriculums found
                  </Box>
                )}
              </Box>
            )}
          </Box>
          <input
            ref={importInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleCurriculumImport}
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
                minWidth: 185,
              }}
            >
              <FaFileExcel style={{ marginRight: 8 }} />
              {importingXlsx ? "Importing..." : "Import Curriculum"}
            </Button>
          )}
          <Button
            onClick={() => {
              window.location.href = `${API_BASE_URL}/api/curriculum_panel_template`;
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

      {/* TOTAL + PAGINATION HEADER */}
      <TableContainer component={Paper} sx={{ width: "100%", mt: 2 }}>
        <Table size="small">
          <TableHead
            sx={{ backgroundColor: headerColor }}
          >
            <TableRow>
              <TableCell
                colSpan={showActionColumn ? 5 : 4}
                sx={{
                  border: `1px solid ${borderColor}`,
                  py: 0.5,
                  backgroundColor: headerColor,
                  color: "white",
                  height: "60px"
                }}
              >
                <Box
                  display="flex"
                  justifyContent="space-between"
                  alignItems="center"
                  flexWrap="wrap"
                  sx={{ px: 1 }}
                >
                  <Typography fontSize="14px" fontWeight="bold" color="white">
                    Total Curriculums Records: {filteredCurriculumList.length}
                  </Typography>

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
                      sx={buttonStyles}
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
                      sx={buttonStyles}
                    >
                      Prev
                    </Button>

                    <FormControl size="small" sx={{ minWidth: 80 }}>
                      <Select
                        value={currentPage}
                        onChange={(e) => setCurrentPage(Number(e.target.value))}
                        displayEmpty
                        sx={selectStyles}
                        MenuProps={{
                          PaperProps: {
                            sx: { maxHeight: 200, backgroundColor: "#fff" },
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

                    <Button
                      onClick={() =>
                        setCurrentPage((prev) =>
                          Math.min(prev + 1, totalPages)
                        )
                      }
                      disabled={currentPage === totalPages}
                      variant="outlined"
                      size="small"
                      sx={buttonStyles}
                    >
                      Next
                    </Button>

                    <Button
                      onClick={() => setCurrentPage(totalPages)}
                      disabled={currentPage === totalPages}
                      variant="outlined"
                      size="small"
                      sx={buttonStyles}
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

                          // ✅ DESIGN WIDTH & HEIGHT
                          width: "250px",
                          height: "36px",

                          textTransform: "none",
                          px: 2,
                          mr: "15px",

                          "&:hover": {
                            backgroundColor: "#1565c0",
                          },
                        }}
                        onClick={() => {
                          setOpenCurriculumDialog(true);
                        }}
                      >
                        + Add Curriculum
                      </Button>
                    )}
                  </Box>
                </Box>
              </TableCell>
            </TableRow>
          </TableHead>
        </Table>
      </TableContainer>
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell
                sx={{
                  border: `1px solid ${borderColor}`,
                  textAlign: "center",
                  color: "black",
                }}
              >
                ID
              </TableCell>
              <TableCell
                sx={{
                  border: `1px solid ${borderColor}`,
                  textAlign: "center",
                  color: "black",
                }}
              >
                Year
              </TableCell>
              <TableCell
                sx={{
                  border: `1px solid ${borderColor}`,
                  textAlign: "center",
                  color: "black",
                }}
              >
                Program
              </TableCell>
              <TableCell
                sx={{
                  border: `1px solid ${borderColor}`,
                  textAlign: "center",
                  color: "black",
                }}
                align="center"
              >
                Active
              </TableCell>
              {showActionColumn && (
                <TableCell
                  sx={{
                    border: `1px solid ${borderColor}`,
                    textAlign: "center",
                    color: "black",
                  }}
                  align="center"
                >
                  Actions
                </TableCell>
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
            {paginatedCurriculum.map((item, index) => (
              <TableRow
                key={item.curriculum_id}
                hover
                sx={{ "&:last-child td": { borderBottom: 0 } }}
              >
                <TableCell
                  sx={{
                    border: `1px solid ${borderColor}`,
                    textAlign: "center",
                  }}
                >
                  {(currentPage - 1) * itemsPerPage + index + 1}
                </TableCell>
                <TableCell
                  sx={{
                    border: `1px solid ${borderColor}`,
                    textAlign: "center",
                  }}
                >
                  {formatAcademicYear(item.year_description)}
                </TableCell>
                <TableCell sx={{ border: `1px solid ${borderColor}` }}>
                  <Typography fontWeight={500}>
                    {`(${item.program_code}): ${item.program_description} (${getBranchLabel(item.components)})`}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {item.major ? ` (${item.major})` : ""}
                  </Typography>
                </TableCell>
                <TableCell
                  sx={{ border: `1px solid ${borderColor}` }}
                  align="center"
                >
                  <Switch
                    checked={item.lock_status === 1}
                    onChange={() =>
                      handleUpdateStatus(item.curriculum_id, item.lock_status)
                    }
                    disabled={!canEdit}
                    color="success"
                  />
                </TableCell>
                {showActionColumn && (
                  <TableCell
                    sx={{ border: `1px solid ${borderColor}` }}
                    align="center"
                  >
                    {canEdit && (
                      <Button
                        variant="contained"
                        startIcon={<EditIcon />}
                        onClick={() => handleEdit(item)}
                        sx={{
                          backgroundColor: "green",
                          width: "100px",
                          height: "40px",
                          marginRight: canDelete ? "15px" : 0,
                          borderRadius: "5px",
                          textTransform: "none",
                          "&:hover": {
                            backgroundColor: "darkgreen",
                          },
                        }}
                      >
                        Edit
                      </Button>
                    )}

                    {canDelete && (
                      <Button
                        variant="contained"
                        startIcon={<DeleteIcon />}
                        onClick={() => confirmDelete(item)}
                        sx={{
                          backgroundColor: "#9E0000",
                          width: "100px",
                          height: "40px",
                          borderRadius: "5px",
                          textTransform: "none",
                          "&:hover": {
                            backgroundColor: "#7A0000",
                          },
                        }}
                      >
                        Delete
                      </Button>
                    )}
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <TableContainer component={Paper} sx={{ width: "100%" }}>
        <Table size="small">
          <TableHead
            sx={{ backgroundColor: headerColor }}
          >
            <TableRow>
              <TableCell
                colSpan={showActionColumn ? 5 : 4}
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
                  sx={{ height: "50px" }}
                >
                  <Typography fontSize="14px" fontWeight="bold" color="white">
                    Total Curriculums Records: {filteredCurriculumList.length}
                  </Typography>

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
                      sx={buttonStyles}
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
                      sx={buttonStyles}
                    >
                      Prev
                    </Button>

                    <FormControl size="small" sx={{ minWidth: 80 }}>
                      <Select
                        value={currentPage}
                        onChange={(e) => setCurrentPage(Number(e.target.value))}
                        displayEmpty
                        sx={selectStyles}
                        MenuProps={{
                          PaperProps: {
                            sx: { maxHeight: 200, backgroundColor: "#fff" },
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

                    <Button
                      onClick={() =>
                        setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                      }
                      disabled={currentPage === totalPages}
                      variant="outlined"
                      size="small"
                      sx={buttonStyles}
                    >
                      Next
                    </Button>

                    <Button
                      onClick={() => setCurrentPage(totalPages)}
                      disabled={currentPage === totalPages}
                      variant="outlined"
                      size="small"
                      sx={buttonStyles}
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
          Delete Curriculum
        </DialogTitle>

        <DialogContent sx={{ p: 3, mt: 2 }}>
          <Typography sx={{ mb: 2 }}>
            Are you sure you want to delete this curriculum?
            <br />
            <br />
            <b>
              {curriculumToDelete &&
                `${formatAcademicYear(
                  curriculumToDelete.year_description,
                )} — (${curriculumToDelete.program_code})`}
            </b>
          </Typography>

          <Typography
            sx={{
              color: "#d32f2f",
              fontSize: "0.95rem",
            }}
          >
            Deleting this curriculum will permanently remove it from the curriculum
            list.
            <br />
            Any students, academic records, or processes associated with this
            curriculum may be affected.
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
              setCurriculumToDelete(null);
            }}
          >
            Cancel
          </Button>

          <Button
            variant="contained"
            color="error"
            onClick={handleDeleteConfirmed}
          >
            Yes, Delete
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
          severity={snackbar.severity}
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>

      <Dialog
        open={openCurriculumDialog}
        onClose={() => setOpenCurriculumDialog(false)}
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
          {editingId ? "Edit Curriculum" : "Add Curriculum"}
        </DialogTitle>

        <DialogContent sx={{ p: 3 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} sx={{ marginTop: "20px" }}>
              <Typography fontWeight="bold">Curriculum Year</Typography>
              <TextField
                select
                fullWidth
                name="year_id"
                value={curriculum.year_id}
                onChange={handleChange}
              >
                <MenuItem value="">Select Year</MenuItem>
                {[...yearList]
                  .sort(
                    (a, b) =>
                      Number(a.year_description) - Number(b.year_description),
                  )
                  .map((year) => (
                    <MenuItem key={year.year_id} value={year.year_id}>
                      {formatAcademicYear(year.year_description)}
                    </MenuItem>
                  ))}
              </TextField>
            </Grid>

            <Grid item xs={12}>
              <Typography fontWeight="bold">Program</Typography>

              <Autocomplete
                fullWidth
                options={programList}
                value={
                  programList.find(
                    (program) => program.program_id === curriculum.program_id,
                  ) || null
                }
                onChange={(event, newValue) => {
                  setCurriculum((prev) => ({
                    ...prev,
                    program_id: newValue?.program_id || "",
                  }));
                }}
                filterOptions={(options, { inputValue }) => {
                  const words = inputValue
                    .trim()
                    .toLowerCase()
                    .split(" ")
                    .filter(Boolean);

                  return options.filter((program) =>
                    words.every(
                      (word) =>
                        getYearLabel(program.year_id)
                          .toLowerCase()
                          .includes(word) ||
                        (program.program_code || "")
                          .toLowerCase()
                          .includes(word) ||
                        (program.program_description || "")
                          .toLowerCase()
                          .includes(word) ||
                        (program.major || "").toLowerCase().includes(word) ||
                        getBranchLabel(program.components)
                          .toLowerCase()
                          .includes(word),
                    ),
                  );
                }}
                getOptionLabel={(program) =>
                  `${getYearLabel(program.year_id)} ` +
                  `(${program.program_code}): ${program.program_description}` +
                  `${program.major ? ` (${program.major})` : ""} ` +
                  `(${getBranchLabel(program.components)})`
                }
                renderInput={(params) => (
                  <TextField {...params} label="Select Program" fullWidth />
                )}
              />
            </Grid>
          </Grid>
        </DialogContent>

        <DialogActions
          sx={{
            px: 3,
            py: 2,
            borderTop: "1px solid #e0e0e0",
          }}
        >
          <Button
            onClick={() => {
              setOpenCurriculumDialog(false);
              setEditingId(null);
              setCurriculum({ year_id: "", program_id: "" });
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
              const saved = await handleAddCurriculum();
              if (saved) setOpenCurriculumDialog(false);
            }}
          >
            <SaveIcon fontSize="small" sx={{ mr: 1 }} /> Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CurriculumManagement;
