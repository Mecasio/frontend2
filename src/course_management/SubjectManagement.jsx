import React, { useState, useEffect, useContext, useRef } from "react";
import { SettingsContext } from "../App";
import axios from "axios";
import {
  Box,
  Typography,
  TextField,
  Grid,
  Radio,
  RadioGroup,
  FormControl,
  FormControlLabel,
  Button,
  Alert,
  Snackbar,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Paper,
  Select,
  MenuItem,
  TableContainer,
} from "@mui/material";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";

import Unauthorized from "../components/Unauthorized";
import LoadingOverlay from "../components/LoadingOverlay";
import TypeManagerSelect from "../components/TypeManagerSelect";
import API_BASE_URL from "../apiConfig";
import SearchIcon from "@mui/icons-material/Search";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import { FaFileExcel } from "react-icons/fa";
import SaveIcon from "@mui/icons-material/Save";
import { getFlatAuditHeaders } from "../utils/auditEvents";
import useAuditMac from "../utils/useAuditMac";

const cleanSearchValue = (value) => {
  if (value === null || value === undefined) return "";
  const text = String(value).trim();
  return ["null", "undefined"].includes(text.toLowerCase()) ? "" : text;
};

const getCourseSearchText = (course) =>
  [
    course?.course_code,
    course?.course_description,
    course?.course_unit,
  ]
    .map(cleanSearchValue)
    .join(" ")
    .toLowerCase();

const getCourseSuggestionValue = (course) =>
  cleanSearchValue(course?.course_code) ||
  cleanSearchValue(course?.course_description);

// ✅ NEW: default/blank filter state, reused for initial state + reset button
const initialFilters = {
  subject_type_id: "",
  category_type_id: "",
  has_prereq: "",
  has_coreq: "",
  is_academic_achiever: "",
  is_latin: "",
  is_gwa_included: "",
};

const CourseManagement = () => {
  useAuditMac();
  const settings = useContext(SettingsContext);

  const colors = settings?.colors || {};
  const titleColor = colors.title || "#000000";
  const borderColor = colors.border || "#000000";
  const headerColor = colors.header || "#1976d2";

  const [userID, setUserID] = useState("");
  const [user, setUser] = useState("");
  const [userRole, setUserRole] = useState("");
  const [employeeID, setEmployeeID] = useState("");

  const [hasAccess, setHasAccess] = useState(null);
  const pageId = 16;

  const getPermissionHeaders = () => ({
    ...getFlatAuditHeaders(),
    "x-employee-id": employeeID || localStorage.getItem("employee_id") || "",
    "x-page-id": pageId,
    "x-audit-actor-id":
      employeeID ||
      localStorage.getItem("employee_id") ||
      localStorage.getItem("email") ||
      "unknown",
    "x-audit-actor-role":
      userRole || localStorage.getItem("role") || "administrator",
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);

  // ✅ NEW: filter state + subject/category type option lists for the filter dropdowns
  const [filters, setFilters] = useState(initialFilters);
  const [subjectTypes, setSubjectTypes] = useState([]);
  const [categoryTypes, setCategoryTypes] = useState([]);

  const [course, setCourse] = useState({
    course_code: "",
    course_description: "",
    course_unit: "",
    lec_unit: "",
    lab_unit: "",
    subject_type_id: "",
    subject_type_name: "",
    category_type_id: "",
    category_type_name: "",
    is_academic_achiever: 1,
    is_latin: 1,
    is_gwa_included: 1,
  });

  const [courseList, setCourseList] = useState([]);
  const [honorRules, setHonorRules] = useState([]);

  const [feeRules, setFeeRules] = useState([]);
  const [selectedGlobalFees, setSelectedGlobalFees] = useState([]);

  const [canCreate, setCanCreate] = useState(false);
  const [canEdit, setCanEdit] = useState(false);
  const [canDelete, setCanDelete] = useState(false);

  const [editMode, setEditMode] = useState(false);
  const [editId, setEditId] = useState(null);

  const [openCourseDialog, setOpenCourseDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [courseToDelete, setCourseToDelete] = useState(null);

  const [loading, setLoading] = useState(false);
  const [snack, setSnack] = useState({
    open: false,
    message: "",
    severity: "info",
    key: 0,
  });
  const showSnack = (message, severity) => {
    setSnack({
      open: true,
      message,
      severity,
      key: new Date().getTime(),
    });
  };

  const importInputRef = useRef(null);
  const [importingXlsx, setImportingXlsx] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 100;

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

  useEffect(() => {
    fetchFeeRules();
  }, []);

  useEffect(() => {
    fetchCourses();
  }, []);

  useEffect(() => {
    fetchHonorRules();
  }, []);

  // ✅ NEW: load subject/category type option lists for the filter bar
  useEffect(() => {
    fetchSubjectTypes();
    fetchCategoryTypes();
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

  const fetchCourses = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/course_list`, { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` } });
      const data = response.data.map((item) => ({
        ...item,
        is_academic_achiever: item.is_academic_achiever ?? 1,
        is_latin: item.is_latin ?? 1,
        is_gwa_included: item.is_gwa_included ?? 1,
      }));
      setCourseList(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchFeeRules = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/coursepanel/fee_rules`, { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` } });
      setFeeRules(res.data);
    } catch (err) {
      console.error("Error fetching fee rules:", err);
    }
  };

  const fetchHonorRules = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/admin/honors-rules`, { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` } });
      setHonorRules(res.data);
    } catch (err) {
      console.error("Error fetching honor rules:", err);
    }
  };

  // ✅ NEW
  const fetchSubjectTypes = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/subject-types`, { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` } });
      setSubjectTypes(res.data || []);
    } catch (err) {
      console.error("Error fetching subject types:", err);
    }
  };

  // ✅ NEW
  const fetchCategoryTypes = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/category-types`, { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` } });
      setCategoryTypes(res.data || []);
    } catch (err) {
      console.error("Error fetching category types:", err);
    }
  };

  const programFees = feeRules.filter(
    (fee) =>
      Number(fee.applies_to_all) === 1 &&
      [
        "COURSE_WITH_LAB_FEE",
        "COMPUTER_LABORATORY_FEE",
        "NSTP_SPECIAL_FEE",
      ].includes(fee.fee_code),
  );

  const totalPayment = programFees.reduce(
    (sum, f) => sum + Number(f.amount),
    0,
  );

  const globalTotal = feeRules
    .filter((fee) => selectedGlobalFees.includes(fee.fee_rule_id))
    .reduce((sum, fee) => sum + Number(fee.amount), 0);

  // ✅ UPDATED: search text match + all filter-bar criteria combined
  const filteredCourses = courseList.filter((c) => {
    const matchesSearch = [
      c.course_description,
      c.course_code,
      c.course_unit?.toString(),
    ]
      .join(" ")
      .toLowerCase()
      .includes(searchQuery.toLowerCase());

    const matchesSubjectType =
      filters.subject_type_id === "" ||
      String(c.subject_type_id) === String(filters.subject_type_id);

    const matchesCategoryType =
      filters.category_type_id === "" ||
      String(c.category_type_id) === String(filters.category_type_id);

    const hasPrereqValue = !!(c.prereq && String(c.prereq).trim());
    const matchesPrereq =
      filters.has_prereq === "" ||
      (filters.has_prereq === "yes" ? hasPrereqValue : !hasPrereqValue);

    const hasCoreqValue = !!(c.corequisite && String(c.corequisite).trim());
    const matchesCoreq =
      filters.has_coreq === "" ||
      (filters.has_coreq === "yes" ? hasCoreqValue : !hasCoreqValue);

    const matchesAcademicAchiever =
      filters.is_academic_achiever === "" ||
      Number(c.is_academic_achiever) === Number(filters.is_academic_achiever);

    const matchesLatin =
      filters.is_latin === "" ||
      Number(c.is_latin) === Number(filters.is_latin);

    const matchesGwa =
      filters.is_gwa_included === "" ||
      Number(c.is_gwa_included) === Number(filters.is_gwa_included);

    return (
      matchesSearch &&
      matchesSubjectType &&
      matchesCategoryType &&
      matchesPrereq &&
      matchesCoreq &&
      matchesAcademicAchiever &&
      matchesLatin &&
      matchesGwa
    );
  });

  const courseSuggestions =
    searchQuery.trim().length >= 2
      ? courseList
        .filter((course) =>
          getCourseSearchText(course).includes(searchQuery.trim().toLowerCase()),
        )
        .slice(0, 10)
      : [];

  const totalPages = Math.min(
    100,
    Math.ceil(filteredCourses.length / itemsPerPage),
  );

  const attachedFees = feeRules.filter(
    (fee) => Number(fee.applies_to_all) === 1,
  );

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;

  const currentCourses = filteredCourses.slice(
    indexOfFirstItem,
    indexOfLastItem,
  );

  // ✅ UPDATED: also reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filters]);

  const handleChangesForEverything = (e) => {
    const { name, value } = e.target;

    setCourse((prev) => {
      const updated = {
        ...prev,
        [name]: value,
      };

      if (name === "lec_unit" || name === "lab_unit") {
        const lec = parseFloat(updated.lec_unit) || 0;
        const lab = parseFloat(updated.lab_unit) || 0;
        updated.course_unit = (lec + lab).toFixed(2);
      }

      return updated;
    });
  };

  const handleClose = (_, reason) => {
    if (reason === "clickaway") return;
    setSnack((prev) => ({ ...prev, open: false }));
  };

  const handleAddingCourse = async () => {
    if (!course.course_code || !course.course_description) {
      showSnack("Please fill all fields", "warning");
      return;
    }

    if (!canCreate) {
      showSnack(
        "You do not have permission to create items on this page",
        "error",
      );
      return;
    }

    try {
      await axios.post(
        `${API_BASE_URL}/api/adding_course`,
        {
          ...course,
          course_unit: parseFloat(course.course_unit) || 0,
          lec_unit: parseFloat(course.lec_unit) || 0,
          lab_unit: parseFloat(course.lab_unit) || 0,
          is_academic_achiever: Number(course.is_academic_achiever) ?? 1,
          is_latin: Number(course.is_latin) ?? 1,
          is_gwa_included: Number(course.is_gwa_included) ?? 1,
        },
        { headers: getPermissionHeaders() },
      );
      setCourse({
        course_code: "",
        course_description: "",
        course_unit: "",
        lec_unit: "",
        lab_unit: "",
        subject_type_id: "",
        subject_type_name: "",
        category_type_id: "",
        category_type_name: "",
        is_academic_achiever: 1,
        is_latin: 1,
        is_gwa_included: 1,
      });

      showSnack("Course successfully added!", "success");
      setOpenCourseDialog(false);
      fetchCourses();
    } catch (err) {
      showSnack(
        err.response?.data?.message || "Failed to Add Subject.",
        "error",
      );
    }
  };

  const handleEdit = (item) => {
    if (!canEdit) {
      showSnack("You do not have permission to edit this item", "error");
      return;
    }

    setCourse({
      course_code: item.course_code ?? "",
      course_description: item.course_description ?? "",
      course_unit: Number(item.course_unit) || 0,
      lec_unit: Number(item.lec_unit) || 0,
      lab_unit: Number(item.lab_unit) || 0,
      subject_type_id: item.subject_type_id ?? "",
      subject_type_name: item.subject_type_name ?? "",
      category_type_id: item.category_type_id ?? "",
      category_type_name: item.category_type_name ?? "",
      is_academic_achiever: item.is_academic_achiever ?? 1,
      is_latin: item.is_latin ?? 1,
      is_gwa_included: item.is_gwa_included ?? 1,
    });

    setEditMode(true);
    setEditId(item.course_id);
    setOpenCourseDialog(true);
  };

  const handleUpdateCourse = async () => {
    if (!editId) {
      showSnack("Invalid course selected.", "error");
      return;
    }

    if (!canEdit) {
      showSnack("You do not have permission to edit this item", "error");
      return;
    }

    try {
      await axios.put(
        `${API_BASE_URL}/api/update_course/${editId}`,
        {
          ...course,
          course_unit: parseFloat(course.course_unit) || 0,
          lec_unit: parseFloat(course.lec_unit) || 0,
          lab_unit: parseFloat(course.lab_unit) || 0,
          is_gwa_included: Number(course.is_gwa_included) ?? 1,
        },
        { headers: getPermissionHeaders() },
      );

      await fetchCourses();

      showSnack("Course updated successfully!", "success");

      setOpenCourseDialog(false);

      setEditMode(false);
      setEditId(null);

      setCourse({
        course_code: "",
        course_description: "",
        course_unit: "",
        lec_unit: "",
        lab_unit: "",
        subject_type_id: "",
        subject_type_name: "",
        category_type_id: "",
        category_type_name: "",
        is_academic_achiever: 1,
        is_latin: 1,
        is_gwa_included: 1,
      });
    } catch (error) {
      showSnack(
        error.response?.data?.message || "Failed to update course.",
        "error",
      );
    }
  };

  const handleDelete = async (id) => {
    if (!canDelete) {
      showSnack("You do not have permission to delete this item", "error");
      return;
    }

    try {
      await axios.delete(`${API_BASE_URL}/api/delete_course/${id}`, {
        headers: getPermissionHeaders(),
      });

      setCourseList((prevList) =>
        prevList.filter((item) => item.course_id !== id),
      );

      showSnack("Course deleted successfully!", "success");
    } catch (err) {
      console.error(err);
      showSnack("Failed to delete course.", "error");
    }
  };

  const handleCourseImport = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!canCreate) {
      showSnack(
        "You do not have permission to create items on this page.",
        "error",
      );
      event.target.value = "";
      return;
    }

    try {
      setImportingXlsx(true);
      const formData = new FormData();
      formData.append("file", file);

      const response = await axios.post(
        `${API_BASE_URL}/api/import-course-xlsx`,
        formData,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
            "Content-Type": "multipart/form-data",
            ...getPermissionHeaders(),
          },
        },
      );

      if (response.data?.success) {
        showSnack(
          response.data.message || "Course import completed.",
          "success",
        );
        fetchCourses();
      } else {
        showSnack(response.data?.error || "Course import failed.", "error");
      }
    } catch (error) {
      showSnack(
        error.response?.data?.error || "Course import failed.",
        "error",
      );
    } finally {
      setImportingXlsx(false);
      event.target.value = "";
    }
  };

  if (loading || hasAccess === null) {
    return <LoadingOverlay open={loading} message="Loading..." />;
  }

  if (!hasAccess) {
    return <Unauthorized />;
  }

  const showCreateActions = canCreate;
  const showActionColumn = canEdit || canDelete;

  const styles = {
    section: {
      padding: 16,
      border: `1px solid ${borderColor}`,
      borderRadius: 6,
      marginBottom: 24,
      backgroundColor: "#fff",
    },
    tableContainer: {
      overflowY: "auto",
      border: "1px solid #ccc",
      borderRadius: "4px",
    },
    table: {
      width: "100%",
      borderCollapse: "collapse",
      textAlign: "center",
    },
    tableCell: {
      border: `1px solid ${borderColor}`,
      padding: "8px",
      textAlign: "center",
    },
  };

  document.addEventListener("contextmenu", (e) => e.preventDefault());

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
        p: 2,
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
          }}
        >
     SUBJECT MANAGEMENT
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
          <Box sx={{ position: "relative", width: 450, maxWidth: "100%", mb: 2 }}>
            <TextField
              variant="outlined"
              placeholder="Search Course Code / Description"
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
                {courseSuggestions.length > 0 ? (
                  courseSuggestions.map((course) => (
                    <Box
                      key={course.course_id}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setSearchQuery(getCourseSuggestionValue(course));
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
                        {cleanSearchValue(course.course_code) || "N/A"}
                      </Typography>
                      <Typography sx={{ fontSize: 14, color: "#555" }}>|</Typography>
                      <Typography sx={{ fontSize: 14 }} noWrap>
                        {cleanSearchValue(course.course_description) || "Unnamed Course"}
                      </Typography>
                    </Box>
                  ))
                ) : (
                  <Box sx={{ px: 2, py: 1.25, fontSize: 13, color: "#666" }}>
                    No matching courses found
                  </Box>
                )}
              </Box>
            )}
          </Box>
          <input
            ref={importInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleCourseImport}
            style={{ display: "none" }}
          />
          {showCreateActions && (
            <Button
              variant="contained"
              onClick={() => importInputRef.current?.click()}
              disabled={importingXlsx}
              sx={{
                height: 40,
                mb: 2,
                textTransform: "none",
                fontWeight: "bold",
                minWidth: 165,
              }}
            >
              <FaFileExcel style={{ marginRight: 8 }} />
              {importingXlsx ? "Importing..." : "Import Subject"}
            </Button>
          )}
          <Button
            onClick={() => {
              window.location.href = `${API_BASE_URL}/api/course_panel_template`;
            }}
            sx={{
              height: 40,
              mb: 2,
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
            gap={1}
            sx={{ height: "50px" }}
          >
            {/* LEFT SIDE */}
            <Typography fontSize="14px" fontWeight="bold" color="white">
            Subject Filters:
            </Typography>

            {/* RIGHT SIDE — all controls grouped together */}
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
                    setCourse({
                      course_code: "",
                      course_description: "",
                      course_unit: "",
                      lec_unit: "",
                      lab_unit: "",
                      subject_type_id: "",
                      subject_type_name: "",
                      category_type_id: "",
                      category_type_name: "",
                      is_academic_achiever: 1,
                      is_latin: 1,
                      is_gwa_included: 1,
                    });
                    setOpenCourseDialog(true);
                  }}
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
                >
                  + Add Subject
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
    display: "flex",
    alignItems: "center",
    gap: 1.5,
    flexWrap: "wrap",
    mb: 2,
    p: 1.5,
    border: "1px solid #ddd",
    borderRadius: "8px",
    backgroundColor: "#fafafa",
  }}
>
  <Typography sx={{ fontWeight: "bold", fontSize: 14 }}>
    Filters:
  </Typography>

  <FormControl size="small" sx={{ minWidth: 170 }}>
    <Select
      displayEmpty
      value={filters.subject_type_id}
      onChange={(e) =>
        setFilters((prev) => ({ ...prev, subject_type_id: e.target.value }))
      }
    >
      <MenuItem value="">Subject Type: All</MenuItem>
      {subjectTypes.map((st) => (
        <MenuItem key={st.subject_type_id} value={st.subject_type_id}>
          {st.subject_type_name}
        </MenuItem>
      ))}
    </Select>
  </FormControl>

  <FormControl size="small" sx={{ minWidth: 170 }}>
    <Select
      displayEmpty
      value={filters.category_type_id}
      onChange={(e) =>
        setFilters((prev) => ({ ...prev, category_type_id: e.target.value }))
      }
    >
      <MenuItem value="">Category: All</MenuItem>
      {categoryTypes.map((ct) => (
        <MenuItem key={ct.category_type_id} value={ct.category_type_id}>
          {ct.category_type_name}
        </MenuItem>
      ))}
    </Select>
  </FormControl>

  <FormControl size="small" sx={{ minWidth: 160 }}>
    <Select
      displayEmpty
      value={filters.has_prereq}
      onChange={(e) =>
        setFilters((prev) => ({ ...prev, has_prereq: e.target.value }))
      }
    >
      <MenuItem value="">Prereq: All</MenuItem>
      <MenuItem value="yes">Has Prereq</MenuItem>
      <MenuItem value="no">No Prereq</MenuItem>
    </Select>
  </FormControl>

  <FormControl size="small" sx={{ minWidth: 170 }}>
    <Select
      displayEmpty
      value={filters.has_coreq}
      onChange={(e) =>
        setFilters((prev) => ({ ...prev, has_coreq: e.target.value }))
      }
    >
      <MenuItem value="">Corequisite: All</MenuItem>
      <MenuItem value="yes">Has Corequisite</MenuItem>
      <MenuItem value="no">No Corequisite</MenuItem>
    </Select>
  </FormControl>

  <FormControl size="small" sx={{ minWidth: 190 }}>
    <Select
      displayEmpty
      value={filters.is_academic_achiever}
      onChange={(e) =>
        setFilters((prev) => ({
          ...prev,
          is_academic_achiever: e.target.value,
        }))
      }
    >
      <MenuItem value="">Academic Achiever: All</MenuItem>
      <MenuItem value={1}>YES</MenuItem>
      <MenuItem value={0}>NO</MenuItem>
    </Select>
  </FormControl>

  <FormControl size="small" sx={{ minWidth: 160 }}>
    <Select
      displayEmpty
      value={filters.is_latin}
      onChange={(e) =>
        setFilters((prev) => ({ ...prev, is_latin: e.target.value }))
      }
    >
      <MenuItem value="">Latin Honor: All</MenuItem>
      <MenuItem value={1}>YES</MenuItem>
      <MenuItem value={0}>NO</MenuItem>
    </Select>
  </FormControl>

  <FormControl size="small" sx={{ minWidth: 200 }}>
    <Select
      displayEmpty
      value={filters.is_gwa_included}
      onChange={(e) =>
        setFilters((prev) => ({
          ...prev,
          is_gwa_included: e.target.value,
        }))
      }
    >
      <MenuItem value="">Included in GWA: All</MenuItem>
      <MenuItem value={1}>YES</MenuItem>
      <MenuItem value={0}>NO</MenuItem>
    </Select>
  </FormControl>

</Box>


      <br />
      <br />

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
                <Box
                  display="flex"
                  justifyContent="space-between"
                  alignItems="center"
                  flexWrap="wrap"
                  gap={1}
                  sx={{ height: "50px" }}
                >
                  <Typography fontSize="14px" fontWeight="bold" color="white">
                    Total Subjects Records: {filteredCourses.length}
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
                          "& svg": { color: "white" },
                        }}
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

              
                  </Box>
                </Box>
              </TableCell>
            </TableRow>
          </TableHead>
        </Table>
      </TableContainer>

      <div style={styles.tableContainer}>
        <table style={styles.table}>
          <thead>
            <tr>
              {[
                "#",
                "Code",
                "Description",
                "Lec Unit",
                "Lab Unit",
                "Credit Unit",
                "Subject Type",
                "Category",
                "Academic Achiever",
                "Latin Honor",
                "Include in GWA Calculation",
                ...(showActionColumn ? ["Actions"] : []),
              ].map((header) => (
                <th
                  key={header}
                  style={{
                    border: `1px solid ${borderColor}`,
                    backgroundColor: "#f5f5f5",
                    color: "#000",
                    padding: "8px",
                  }}
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {currentCourses.map((c, index) => {
              const courseFee = feeRules.find((fee) => {
                if (fee.fee_code === "NSTP_SPECIAL_FEE") {
                  return Number(c.is_nstp) === 1;
                }
                if (fee.fee_code === "COMPUTER_LABORATORY_FEE") {
                  return Number(c.iscomputer_lab) === 1;
                }
                if (fee.fee_code === "COURSE_WITH_LAB_FEE") {
                  return Number(c.isnon_computer_lab) === 1;
                }
                return false;
              });

              return (
                <tr
                  key={c.course_id}
                  style={{
                    backgroundColor: index % 2 === 0 ? "#ffffff" : "lightgray",
                  }}
                >
                  <td style={styles.tableCell}>
                    {indexOfFirstItem + index + 1}
                  </td>
                  <td style={styles.tableCell}>{c.course_code}</td>
                  <td style={styles.tableCell}>{c.course_description}</td>
                  <td style={styles.tableCell}>{c.lec_unit}</td>
                  <td style={styles.tableCell}>{c.lab_unit}</td>
                  <td style={styles.tableCell}>{c.course_unit}</td>
                  <td style={styles.tableCell}>{c.subject_type_name}</td>
                  <td style={styles.tableCell}>{c.category_type_name}</td>

                  <td style={styles.tableCell}>
                    {Number(c.is_academic_achiever) === 1 ? "YES" : "NO"}
                  </td>

                  <td style={styles.tableCell}>
                    {Number(c.is_latin) === 1 ? "YES" : "NO"}
                  </td>

                  <td style={styles.tableCell}>
                    {Number(c.is_gwa_included) === 1 ? "YES" : "NO"}
                  </td>

                  {showActionColumn && (
                    <td style={styles.tableCell}>
                      <div
                        style={{
                          display: "flex",
                          gap: 8,
                          justifyContent: "center",
                        }}
                      >
                        {canEdit && (
                          <button
                            onClick={() => handleEdit(c)}
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
                          >
                            <EditIcon fontSize="small" /> Edit
                          </button>
                        )}
                        {canDelete && (
                          <button
                            onClick={() => {
                              setCourseToDelete(c);
                              setOpenDeleteDialog(true);
                            }}
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
                          >
                            <DeleteIcon fontSize="small" /> Delete
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Bottom pagination table - same as top */}
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
                <Box
                  display="flex"
                  justifyContent="space-between"
                  alignItems="center"
                  flexWrap="wrap"
                  gap={1}
                >
                  <Typography fontSize="14px" fontWeight="bold" color="white">
                    Total Subjects Records: {filteredCourses.length}
                  </Typography>
                  <Box
                    display="flex"
                    alignItems="center"
                    gap={1}
                    flexWrap="wrap"
                    sx={{ height: "50px" }}
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
                          "& svg": { color: "white" },
                        }}
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
          Delete Course
        </DialogTitle>

        <DialogContent sx={{ p: 3, mt: 2 }}>
          <Typography sx={{ mb: 2 }}>
            Are you sure you want to delete the course{" "}
            <b>{courseToDelete?.course_description}</b> (
            <b>{courseToDelete?.course_code}</b>)?
          </Typography>

          <Typography
            sx={{
              color: "#d32f2f",
              fontSize: "0.95rem",
            }}
          >
            Deleting this course will remove it permanently from the course
            list. Any curriculum referencing this course may be affected.
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
            onClick={() => setOpenDeleteDialog(false)}
            color="error"
            variant="outlined"
          >
            Cancel
          </Button>

          <Button
            color="error"
            variant="contained"
            onClick={() => {
              handleDelete(courseToDelete.course_id);
              setOpenDeleteDialog(false);
              setCourseToDelete(null);
            }}
          >
            Yes, Delete
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        key={snack.key}
        open={snack.open}
        autoHideDuration={4000}
        onClose={handleClose}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          onClose={handleClose}
          severity={snack.severity}
          sx={{ width: "100%" }}
        >
          {snack.message}
        </Alert>
      </Snackbar>

      <Dialog
        open={openCourseDialog}
        onClose={() => setOpenCourseDialog(false)}
        maxWidth="md"
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
            mb: 2,
          }}
        >
          {editMode ? "Edit Subject" : "Add New Subject"}
        </DialogTitle>

        <DialogContent sx={{ p: 3 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <Typography fontWeight="bold">Subject Code</Typography>
              <TextField
                fullWidth
                name="course_code"
                required
                value={course.course_code}
                onChange={handleChangesForEverything}
              />
            </Grid>

            <Grid item xs={12} md={8}>
              <Typography fontWeight="bold">Subject Description</Typography>
              <TextField
                fullWidth
                name="course_description"
                required
                value={course.course_description}
                onChange={handleChangesForEverything}
              />
            </Grid>

            {/* ✅ NEW: Lec Unit and Lab Unit, placed before Course Unit */}
            <Grid item xs={12} md={4}>
              <Typography fontWeight="bold">Lec Unit</Typography>
              <TextField
                fullWidth
                name="lec_unit"
                type="number"
                value={course.lec_unit}
                onChange={handleChangesForEverything}
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <Typography fontWeight="bold">Lab Unit</Typography>
              <TextField
                fullWidth
                name="lab_unit"
                type="number"
                value={course.lab_unit}
                onChange={handleChangesForEverything}
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <Typography fontWeight="bold">Subject Unit</Typography>
              <TextField
                fullWidth
                name="course_unit"
                type="number"
                value={course.course_unit}
                onChange={handleChangesForEverything}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <Typography fontWeight="bold">Subject Type</Typography>
              <TypeManagerSelect
                label="Subject Type"
                apiUrl={`${API_BASE_URL}/api/subject-types`}
                idKey="subject_type_id"
                nameKey="subject_type_name"
                value={course.subject_type_id}
                onChange={(id, name) =>
                  setCourse((prev) => ({ ...prev, subject_type_id: id, subject_type_name: name }))
                }
                headers={getPermissionHeaders()}
                canCreate={canCreate}
                canEdit={canEdit}
                canDelete={canDelete}
                onSnack={showSnack}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <Typography fontWeight="bold">Category</Typography>
              <TypeManagerSelect
                label="Category"
                apiUrl={`${API_BASE_URL}/api/category-types`}
                idKey="category_type_id"
                nameKey="category_type_name"
                value={course.category_type_id}
                onChange={(id, name) =>
                  setCourse((prev) => ({ ...prev, category_type_id: id, category_type_name: name }))
                }
                headers={getPermissionHeaders()}
                canCreate={canCreate}
                canEdit={canEdit}
                canDelete={canDelete}
                onSnack={showSnack}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <Typography fontWeight="bold">Academic Achiever</Typography>

              <Select
                fullWidth
                value={course.is_academic_achiever ?? 1}
                onChange={(e) =>
                  setCourse((prev) => ({
                    ...prev,
                    is_academic_achiever: Number(e.target.value),
                  }))
                }
              >
                <MenuItem value={1}>YES</MenuItem>
                <MenuItem value={0}>NO</MenuItem>
              </Select>
            </Grid>

            <Grid item xs={12} md={6}>
              <Typography fontWeight="bold">Latin Honor</Typography>

              <Select
                fullWidth
                value={course.is_latin ?? 1}
                onChange={(e) =>
                  setCourse((prev) => ({
                    ...prev,
                    is_latin: Number(e.target.value),
                  }))
                }
              >
                <MenuItem value={1}>YES</MenuItem>
                <MenuItem value={0}>NO</MenuItem>
              </Select>
            </Grid>

            <Grid item xs={12} md={6}>
              <Typography fontWeight="bold">Included in GWA</Typography>
              <Select
                fullWidth
                value={course.is_gwa_included ?? 1}
                onChange={(e) =>
                  setCourse((prev) => ({
                    ...prev,
                    is_gwa_included: Number(e.target.value),
                  }))
                }
              >
                <MenuItem value={1}>YES</MenuItem>
                <MenuItem value={0}>NO — Exclude from GWA</MenuItem>
              </Select>
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
            onClick={() => setOpenCourseDialog(false)}
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
            onClick={() => {
              if (editMode) {
                handleUpdateCourse();
              } else {
                handleAddingCourse();
              }
            }}
          >
            <SaveIcon fontSize="small" sx={{ mr: 1 }} /> Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CourseManagement;
