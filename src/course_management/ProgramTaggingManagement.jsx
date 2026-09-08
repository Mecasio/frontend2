import React, { useState, useEffect, useContext, useRef } from "react";
import { SettingsContext } from "../App";
import axios from "axios";
import {
  Box,
  Typography,
  Button,
  Snackbar,
  Alert,
  FormControl,
  Select,
  MenuItem,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  Paper,
  Grid,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import Unauthorized from "../components/Unauthorized";
import LoadingOverlay from "../components/LoadingOverlay";
import API_BASE_URL from "../apiConfig";
import { Autocomplete, TextField } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import ProgramTaggingFilter from "./ProgramTaggingFilter";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import { FaFileExcel } from "react-icons/fa";
import SaveIcon from "@mui/icons-material/Save";
import { getFlatAuditHeaders } from "../utils/auditEvents";
import useAuditMac from "../utils/useAuditMac";

const cleanSearchValue = (value) => {
  if (value === null || value === undefined) return "";
  const text = String(value).trim();
  return ["null", "undefined"].includes(text.toLowerCase()) ? "" : text;
};

const getProgramTaggingSearchText = (tag) =>
  [
    tag?.curriculum_description,
    tag?.program_code,
    tag?.program_description,
    tag?.major,
    tag?.course_code,
    tag?.course_description,
    tag?.prereq,
    tag?.year_level_description,
    tag?.semester_description,
  ]
    .map(cleanSearchValue)
    .join(" ")
    .toLowerCase();

const getProgramTaggingSuggestionValue = (tag) =>
  cleanSearchValue(tag?.course_code) ||
  cleanSearchValue(tag?.course_description) ||
  cleanSearchValue(tag?.program_code);

const ProgramTagging = () => {
  useAuditMac();
  const settings = useContext(SettingsContext);
  const colors = settings?.colors || {};
  const titleColor = colors.title || "#000000";
  const borderColor = colors.border || "#000000";
  const headerColor = colors.header || "#1976d2";
  const branches = settings?.branches || [];

  const [selectedCurriculum, setSelectedCurriculum] = useState("");
  const [selectedYearLevel, setSelectedYearLevel] = useState("");
  const [selectedSemester, setSelectedSemester] = useState("");
  const [filteredPrograms, setFilteredPrograms] = useState([]);
  const [canCreate, setCanCreate] = useState(false);
  const [canDelete, setCanDelete] = useState(false);
  const [canEdit, setCanEdit] = useState(false);

  const [userID, setUserID] = useState("");
  const [user, setUser] = useState("");
  const [userRole, setUserRole] = useState("");
  const [hasAccess, setHasAccess] = useState(null);
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });
  const importInputRef = useRef(null);
  const [importingXlsx, setImportingXlsx] = useState(false);

  const pageId = 35;

  const [employeeID, setEmployeeID] = useState("");

  const [openFormDialog, setOpenFormDialog] = useState(false);

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
      const response = await axios.get(
        `${API_BASE_URL}/api/page_access/${employeeID}/${pageId}`,
      );
      if (response.data && response.data.page_privilege === 1) {
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

  const [progTag, setProgTag] = useState({
    curriculum_id: "",
    year_level_id: "",
    semester_id: "",
    course_id: "",
  });

  const [courseList, setCourseList] = useState([]);
  const [yearLevelList, setYearlevelList] = useState([]);
  const [semesterList, setSemesterList] = useState([]);
  const [curriculumList, setCurriculumList] = useState([]);
  const [taggedPrograms, setTaggedPrograms] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [courseSearch, setCourseSearch] = useState("");
  const [curriculumSearch, setCurriculumSearch] = useState("");

  const showSnackbar = (message, severity = "info") => {
    setSnackbar({
      open: true,
      message,
      severity,
    });
  };

  const getPermissionHeaders = (extraHeaders = {}) => ({
    headers: {
      ...getFlatAuditHeaders(),
      ...extraHeaders,
      "x-employee-id": employeeID,
      "x-audit-actor-id":
        employeeID ||
        localStorage.getItem("employee_id") ||
        localStorage.getItem("email") ||
        "unknown",
      "x-audit-actor-role": userRole || localStorage.getItem("role") || "registrar",
      "x-page-id": pageId,
    },
  });

  useEffect(() => {
    // Start with all programs
    let filtered = taggedPrograms;

    // ✅ Filter by dropdowns safely (convert both sides to Number)
    if (selectedCurriculum) {
      filtered = filtered.filter(
        (p) => Number(p.curriculum_id) === Number(selectedCurriculum),
      );
    }
    if (selectedYearLevel) {
      filtered = filtered.filter(
        (p) => Number(p.year_level_id) === Number(selectedYearLevel),
      );
    }
    if (selectedSemester) {
      filtered = filtered.filter(
        (p) => Number(p.semester_id) === Number(selectedSemester),
      );
    }

    // ✅ Filter by search query (case-insensitive)
    if (searchQuery) {
      const q = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(
        (p) =>
          (p.curriculum_description || "").toLowerCase().includes(q) ||
          (p.program_code || "").toLowerCase().includes(q) ||
          (p.major || "").toLowerCase().includes(q) ||
          (p.course_description || "").toLowerCase().includes(q) ||
          (p.year_level_description || "").toLowerCase().includes(q) ||
          (p.semester_description || "").toLowerCase().includes(q),
      );
    }

    // ✅ Update state
    setFilteredPrograms(filtered);
    setCurrentPage(1);
  }, [
    searchQuery,
    selectedCurriculum,
    selectedYearLevel,
    selectedSemester,
    taggedPrograms,
  ]);
  const programTaggingSuggestions =
    searchQuery.trim().length >= 2
      ? taggedPrograms
          .filter((tag) =>
            getProgramTaggingSearchText(tag).includes(
              searchQuery.trim().toLowerCase(),
            ),
          )
          .slice(0, 10)
      : [];

  const filteredCourses = courseList.filter((course) => {
    const words = courseSearch.toLowerCase().split(" ");

    const courseCode = (course.course_code || "").toLowerCase();
    const courseDesc = (course.course_description || "").toLowerCase();
    const coursePreq = (course.prereq || "").toLowerCase();

    return words.every(
      (word) =>
        courseCode.includes(word) ||
        courseDesc.includes(word) ||
        coursePreq.includes(word),
    );
  });

  useEffect(() => {
    fetchYearLevel();
    fetchSemester();
    fetchCurriculum();
    fetchTaggedPrograms();
  }, []);

  const fetchYearLevel = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/get_year_level`);
      setYearlevelList(res.data);
    } catch (err) {
      console.log(err);
    }
  };

  const fetchSemester = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/get_semester`);
      setSemesterList(res.data);
    } catch (err) {
      console.log(err);
    }
  };

  const fetchCurriculum = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/get_active_curriculum`);
      setCurriculumList(res.data);
    } catch (err) {
      console.log(err);
    }
  };

  const fetchCourse = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/course_list`);

      // 🔽 SORT COURSES alphabetically (course_code)
      setCourseList(
        res.data.sort((a, b) =>
          a.course_code.localeCompare(b.course_code, undefined, {
            numeric: true,
          }),
        ),
      );
    } catch (err) {
      console.log(err);
    }
  };

  // useEffect(() => {
  //   fetchCourse();
  // }, []);

  useEffect(() => {
    fetchCourse();
  }, []);

  const fetchTaggedPrograms = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/program_tagging_list`);

      const normalized = res.data;

      // ✅ REMOVE DUPLICATES BASED ON UNIQUE PROGRAM KEY
      const unique = [];
      const seen = new Set();

      normalized.forEach((p) => {
        const key = `${p.curriculum_id}-${p.year_level_id}-${p.semester_id}-${p.course_id}`;

        if (!seen.has(key)) {
          seen.add(key);
          unique.push(p);
        }
      });

      setTaggedPrograms(unique);
      setFilteredPrograms(unique);
    } catch (err) {
      console.log(err);
    }
  };

  const handleChangesForEverything = (e) => {
    const { name, value, type } = e.target;

    setProgTag((prev) => ({
      ...prev,
      [name]: type === "number" ? (value === "" ? "" : Number(value)) : value,
    }));
  };

  const handleInsertingProgTag = async () => {
    if (!employeeID) {
      showSnackbar("Employee ID is required to continue.", "error");
      return false;
    }

    if (editingId && !canEdit) {
      showSnackbar("You do not have permission to edit this item.", "error");
      return false;
    }

    if (!editingId && !canCreate) {
      showSnackbar(
        "You do not have permission to create items on this page.",
        "error",
      );
      return false;
    }

    const {
      curriculum_id,
      year_level_id,
      semester_id,
      course_id,
    } = progTag;

    // ✅ Required fields
    if (!curriculum_id || !year_level_id || !semester_id || !course_id) {
      showSnackbar("Please fill all fields", "error");
      return false;
    }

    // 🔍 Prevent duplicate (ignore self when editing)
    const isDuplicate = taggedPrograms.some(
      (p) =>
        Number(p.curriculum_id) === Number(curriculum_id) &&
        Number(p.year_level_id) === Number(year_level_id) &&
        Number(p.semester_id) === Number(semester_id) &&
        Number(p.course_id) === Number(course_id) &&
        Number(p.program_tagging_id) !== Number(editingId),
    );

    if (isDuplicate) {
      showSnackbar("This program tag already exists!", "error");
      return false;
    }

    try {
      if (editingId) {
        // ✅ Update existing program tag
        await axios.put(
          `${API_BASE_URL}/api/program_tagging/${editingId}`,
          {
            curriculum_id,
            year_level_id,
            semester_id,
            course_id,
          },
          getPermissionHeaders(),
        );

        // 🔥 Update state locally instead of refetch
        setTaggedPrograms((prev) =>
          prev.map((p) =>
            p.program_tagging_id === editingId
              ? {
                ...p,
                ...progTag,
              }
              : p,
          ),
        );

        fetchTaggedPrograms();

        showSnackbar("Program tag updated successfully!", "success");
      } else {
        // ✅ Insert new program tag
        const { data } = await axios.post(
          `${API_BASE_URL}/api/program_tagging`,
          {
            curriculum_id,
            year_level_id,
            semester_id,
            course_id,
          },
          getPermissionHeaders(),
        );

        // 🔥 Add new tag to state immediately
        setTaggedPrograms((prev) => [
          ...prev,
          {
            program_tagging_id: data.insertId, // Use returned insertId
            curriculum_id,
            year_level_id,
            semester_id,
            course_id,
          },
        ]);

        fetchTaggedPrograms();
        showSnackbar("Program tag inserted successfully!", "success");
      }

      // ✅ Reset form
      setProgTag({
        curriculum_id: "",
        year_level_id: "",
        semester_id: "",
        course_id: "",
      });

      setEditingId(null);
      return true;
    } catch (err) {
      console.error(err);
      showSnackbar(err.response?.data?.error || "Error saving data.", "error");
      return false;
    }
  };

  const handleEdit = (program) => {
    setEditingId(program.program_tagging_id);

    setProgTag({
      curriculum_id: program.curriculum_id,
      year_level_id: program.year_level_id,
      semester_id: program.semester_id,
      course_id: program.course_id,
    });
  };
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [programToDelete, setProgramToDelete] = useState(null);

  const [openDeleteAllDialog, setOpenDeleteAllDialog] = useState(false);

  const [deleteAllFilter, setDeleteAllFilter] = useState(null);
  const showCreateActions = canCreate;
  const showActionColumn = canEdit || canDelete;

  const handleDeleteAllTagged = async () => {
    if (!employeeID) {
      showSnackbar("Employee ID is required to continue.", "error");
      return;
    }

    if (!canDelete) {
      showSnackbar("You do not have permission to delete this item.", "error");
      return;
    }

    if (!deleteAllFilter) return;

    try {
      await axios.delete(`${API_BASE_URL}/api/program_tagging/delete_all`, {
        ...getPermissionHeaders(),
        data: deleteAllFilter,
      });

      // Remove from frontend state immediately
      setTaggedPrograms((prev) =>
        prev.filter(
          (p) =>
            !(
              Number(p.curriculum_id) ===
              Number(deleteAllFilter.curriculum_id) &&
              Number(p.year_level_id) ===
              Number(deleteAllFilter.year_level_id) &&
              Number(p.semester_id) === Number(deleteAllFilter.semester_id)
            ),
        ),
      );

      showSnackbar(
        "All matching program tags deleted successfully!",
        "success",
      );
    } catch (err) {
      showSnackbar("Error deleting all tagged programs.", "error");
    }
  };

  const handleDelete = async (id) => {
    if (!employeeID) {
      showSnackbar("Employee ID is required to continue.", "error");
      return;
    }

    if (!canDelete) {
      showSnackbar("You do not have permission to delete this item.", "error");
      return;
    }

    try {
      await axios.delete(
        `${API_BASE_URL}/api/program_tagging/${id}`,
        getPermissionHeaders(),
      );

      setTaggedPrograms((prev) =>
        prev.filter((p) => p.program_tagging_id !== id),
      );

      showSnackbar("Program tag deleted successfully!", "success");
    } catch (err) {
      showSnackbar(
        err.response?.data?.error || "Error deleting program tag.",
        "error",
      );
    }
  };

  const handleProgramTaggingImport = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!employeeID) {
      showSnackbar("Employee ID is required to continue.", "error");
      event.target.value = "";
      return;
    }

    if (!canCreate) {
      showSnackbar(
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
        `${API_BASE_URL}/api/import-program-tagging-xlsx`,
        formData,
        getPermissionHeaders({ "Content-Type": "multipart/form-data" }),
      );

      if (response.data?.success) {
        showSnackbar(
          response.data.message || "Program tagging import completed.",
          "success",
        );
        fetchTaggedPrograms();
      } else {
        showSnackbar(
          response.data?.error || "Program tagging import failed.",
          "error",
        );
      }
    } catch (error) {
      showSnackbar(
        error.response?.data?.error || "Program tagging import failed.",
        "error",
      );
    } finally {
      setImportingXlsx(false);
      event.target.value = "";
    }
  };

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 100;

  // total pages (cap at 100 like your original)
  const totalPages = Math.min(
    100,
    Math.ceil(filteredPrograms.length / itemsPerPage),
  );

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;

  const currentPrograms = filteredPrograms.slice(
    indexOfFirstItem,
    indexOfLastItem,
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCurriculum, selectedYearLevel, selectedSemester]);

  const [selectedCampus, setSelectedCampus] = useState("");
  const [selectedAcademicProgram, setSelectedAcademicProgram] = useState("");

  const getBranchLabel = (branchId) => {
    const branch = branches.find(
      (item) => Number(item.id) === Number(branchId),
    );
    return branch?.branch || " ";
  };

  const filteredCurriculumList = Array.from(
    new Map(
      curriculumList
        .filter((item) => {
          if (selectedCampus !== "") {
            if (Number(item.components) !== Number(selectedCampus)) return false;
          }
          if (selectedAcademicProgram !== "") {
            if (Number(item.academic_program) !== Number(selectedAcademicProgram)) return false;
          }
          return true;
        })
        .map((item) => [item.curriculum_id, item]),
    ).values(),
  ).sort((a, b) => Number(a.year_description) - Number(b.year_description)); // ← add this

  const formatSchoolYear = (yearDesc) => {
    if (!yearDesc) return "";
    const startYear = Number(yearDesc);
    if (isNaN(startYear)) return yearDesc;
    return `${startYear} - ${startYear + 1}`;
  };

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
          mb: 2,
        }}
      >
        <Typography
          variant="h4"
          sx={{ fontWeight: "bold", color: titleColor, fontSize: "36px" }}
        >
          PROGRAM TAGGING MANAGEMENT
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
              placeholder="Search Curriculum / Course / Year / Semester"
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
                {programTaggingSuggestions.length > 0 ? (
                  programTaggingSuggestions.map((tag) => (
                    <Box
                      key={tag.program_tagging_id}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setSearchQuery(getProgramTaggingSuggestionValue(tag));
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
                        {cleanSearchValue(tag.course_code) || "N/A"}
                      </Typography>
                      <Typography sx={{ fontSize: 14, color: "#555" }}>|</Typography>
                      <Typography sx={{ fontSize: 14 }} noWrap>
                        {cleanSearchValue(tag.course_description) || "Unnamed Course"} -{" "}
                        {cleanSearchValue(tag.program_code) || "No Program"}
                      </Typography>
                    </Box>
                  ))
                ) : (
                  <Box sx={{ px: 2, py: 1.25, fontSize: 13, color: "#666" }}>
                    No matching tagged programs found
                  </Box>
                )}
              </Box>
            )}
          </Box>
          <input
            ref={importInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleProgramTaggingImport}
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
                minWidth: 210,
                "&.Mui-disabled": {
                  backgroundColor: "#C9C9C9",
                  color: "#666666",
                },
              }}
            >
              <FaFileExcel style={{ marginRight: 8 }} />
              {importingXlsx ? "Importing..." : "Import Program Tagging"}
            </Button>
          )}
          <Button
            onClick={() => {
              window.location.href = `${API_BASE_URL}/api/program_tagging_template`;
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

      <div style={styles.container}>
        <TableContainer
          component={Paper}
          sx={{
            width: "100%",
            border: `1px solid ${borderColor}`,
            mb: "-30px",
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
                      Tagged Program Filters:
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
                            setEditingId(null);

                            setProgTag({
                              curriculum_id: "",
                              year_level_id: "",
                              semester_id: "",
                              course_id: "",
                            });

                            setOpenFormDialog(true);
                          }}
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
                        >
                          + Insert Program Tag
                        </Button>
                      )}
                    </Box>
                  </Box>
                </TableCell>
              </TableRow>
            </TableHead>
          </Table>
        </TableContainer>
      
          <ProgramTaggingFilter
            curriculumList={curriculumList}
            yearLevelList={yearLevelList}
            semesterList={semesterList}
            taggedPrograms={taggedPrograms}
            selectedCurriculum={selectedCurriculum}
            selectedYearLevel={selectedYearLevel}
            selectedSemester={selectedSemester}
            setSelectedCurriculum={setSelectedCurriculum}
            setSelectedYearLevel={setSelectedYearLevel}
            setSelectedSemester={setSelectedSemester}
            setFilteredPrograms={setFilteredPrograms}
          />


      <br />



        <div>
          <TableContainer component={Paper} sx={{ width: "100%", }}>
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
                      justifyContent="space-between" // Left & right sides
                      alignItems="center"
                      flexWrap="wrap"
                      gap={1}
                    >
                      {/* Left side: Total Tagged Programs */}
                      <Typography
                        fontSize="14px"
                        fontWeight="bold"
                        color="white"
                      >
                        Total Tagged Programs Records: {filteredPrograms.length}
                      </Typography>

                      {/* Right side: Pagination / Filtering Controls */}
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
                              "&.Mui-focused .MuiOutlinedInput-notchedOutline":
                                { borderColor: "white" },
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
          {taggedPrograms.length > 0 ? (
            <table style={{ mb: 4 }}>
              <thead>
                <tr>
                  <th
                    style={{
                      ...styles.th,
                      backgroundColor: "#f5f5f5",
                      border: `1px solid ${borderColor}`,
                      color: "black",
                      textAlign: "center",
                      fontSize: "13px",
                    }}
                  >
                    #
                  </th>
                  <th
                    style={{
                      ...styles.th,
                      backgroundColor: "#f5f5f5",
                      border: `1px solid ${borderColor}`,
                      color: "black",
                      textAlign: "center",
                      fontSize: "13px",
                    }}
                  >
                    Curriculum
                  </th>
                  <th
                    style={{
                      ...styles.th,
                      backgroundColor: "#f5f5f5",
                      border: `1px solid ${borderColor}`,
                      color: "black",
                      textAlign: "center",
                      fontSize: "13px",
                    }}
                  >
                    Course Code
                  </th>
                  <th
                    style={{
                      ...styles.th,
                      backgroundColor: "#f5f5f5",
                      border: `1px solid ${borderColor}`,
                      color: "black",
                      textAlign: "center",
                      fontSize: "13px",
                    }}
                  >
                    Course Description
                  </th>
                  <th
                    style={{
                      ...styles.th,
                      backgroundColor: "#f5f5f5",
                      border: `1px solid ${borderColor}`,
                      color: "black",
                      textAlign: "center",
                      fontSize: "13px",
                    }}
                  >
                    Prerequisite
                  </th>
                  <th
                    style={{
                      ...styles.th,
                      backgroundColor: "#f5f5f5",
                      border: `1px solid ${borderColor}`,
                      color: "black",
                      textAlign: "center",
                      fontSize: "13px",
                    }}
                  >
                    Lecture Unit
                  </th>
                  <th
                    style={{
                      ...styles.th,
                      backgroundColor: "#f5f5f5",
                      border: `1px solid ${borderColor}`,
                      color: "black",
                      textAlign: "center",
                      fontSize: "13px",
                    }}
                  >
                    Laboratory Unit
                  </th>
                  <th
                    style={{
                      ...styles.th,
                      backgroundColor: "#f5f5f5",
                      border: `1px solid ${borderColor}`,
                      color: "black",
                      textAlign: "center",
                      fontSize: "13px",
                    }}
                  >
                    Course Unit
                  </th>
                  <th
                    style={{
                      ...styles.th,
                      backgroundColor: "#f5f5f5",
                      border: `1px solid ${borderColor}`,
                      color: "black",
                      textAlign: "center",
                      fontSize: "13px",
                    }}
                  >
                    Year Level
                  </th>
                  <th
                    style={{
                      ...styles.th,
                      backgroundColor: "#f5f5f5",
                      border: `1px solid ${borderColor}`,
                      color: "black",
                      textAlign: "center",
                      fontSize: "13px",
                    }}
                  >
                    Semester
                  </th>
                  {showActionColumn && (
                    <th
                      style={{
                        ...styles.th,
                        backgroundColor: "#f5f5f5",
                        border: `1px solid ${borderColor}`,
                        color: "black",
                        textAlign: "center",
                        fontSize: "13px",
                      }}
                    >
                      Actions
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {currentPrograms.map((program, index) => (
                  <tr
                    key={program.program_tagging_id}
                    style={{
                      backgroundColor: index % 2 === 0 ? "#ffffff" : "lightgray",
                    }}
                  >
                    <td
                      style={{
                        ...styles.td,
                        border: `1px solid ${borderColor}`,
                        fontSize: "13px",
                      }}
                    >
                      {indexOfFirstItem + index + 1}
                    </td>
                    <td
                      style={{
                        ...styles.td,
                        border: `1px solid ${borderColor}`,
                        fontSize: "13px",
                      }}
                    >
                      {formatSchoolYear(program.year_description)} (
                      {program.program_code}) –{" "}
                      {program.curriculum_description}
                      {program.major ? ` (${program.major})` : ""}
                    </td>

                    <td
                      style={{
                        ...styles.td,
                        border: `1px solid ${borderColor}`,
                        fontSize: "13px",
                        textAlign: "center"
                      }}
                    >
                      {program.course_code}

                    </td>
                    <td
                      style={{
                        ...styles.td,
                        border: `1px solid ${borderColor}`,
                        fontSize: "13px",
                      }}
                    >
                      {program.course_description}

                    </td>


                    <td
                      style={{
                        ...styles.td,
                        border: `1px solid ${borderColor}`,
                        fontSize: "13px",
                        textAlign: "center"
                      }}
                    >
                      {program.prereq}

                    </td>
                    <td
                      style={{
                        ...styles.td,
                        border: `1px solid ${borderColor}`,
                        fontSize: "13px",
                        textAlign: "center"
                      }}
                    >
                      {program.lec_unit}

                    </td>
                    <td
                      style={{
                        ...styles.td,
                        border: `1px solid ${borderColor}`,
                        fontSize: "13px",
                        textAlign: "center"
                      }}
                    >
                      {program.lab_unit}

                    </td>
                    <td
                      style={{
                        ...styles.td,
                        border: `1px solid ${borderColor}`,
                        fontSize: "13px",
                        textAlign: "center"
                      }}
                    >
                      {program.course_unit}

                    </td>
                    <td
                      style={{
                        ...styles.td,
                        border: `1px solid ${borderColor}`,
                        textAlign: "center",
                        fontSize: "13px",
                      }}
                    >
                      {program.year_level_description}
                    </td>
                    <td
                      style={{
                        ...styles.td,
                        border: `1px solid ${borderColor}`,
                        textAlign: "center",
                        fontSize: "13px",
                      }}
                    >
                      {program.semester_description}
                    </td>

                    {showActionColumn && (
                      <td
                        style={{
                          ...styles.td,
                          whiteSpace: "nowrap",
                          border: `1px solid ${borderColor}`,
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            gap: "6px",
                            justifyContent: "center",
                            alignItems: "center",
                          }}
                        >
                          {canEdit && (
                            <button
                              onClick={() => {
                                handleEdit(program);
                                setOpenFormDialog(true);
                              }}
                              style={{
                                backgroundColor: "green",
                                color: "white",
                                border: "none",
                                borderRadius: "5px",
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
                                setDeleteId(program.program_tagging_id);
                                setProgramToDelete(program);
                                setOpenDeleteDialog(true);
                              }}
                              style={{
                                backgroundColor: "#9E0000",
                                color: "white",
                                border: "none",
                                borderRadius: "5px",
                                height: "40px",
                                cursor: "pointer",
                                width: "100px",
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
                ))}
              </tbody>
            </table>
          ) : (
            <p>No tagged programs available.</p>
          )}

          <TableContainer component={Paper} sx={{ width: "100%", }}>
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
                      justifyContent="space-between" // Left & right sides
                      alignItems="center"
                      flexWrap="wrap"
                      gap={1}
                    >
                      {/* Left side: Total Tagged Programs */}
                      <Typography
                        fontSize="14px"
                        fontWeight="bold"
                        color="white"
                      >
                      Total Tagged Programs Records: {filteredPrograms.length}
                      </Typography>

                      {/* Right side: Pagination / Filtering Controls */}
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
                              "&.Mui-focused .MuiOutlinedInput-notchedOutline":
                                { borderColor: "white" },
                              "& svg": { color: "white" },
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
      </div>



      <Dialog
        open={openFormDialog}
        onClose={() => setOpenFormDialog(false)}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            overflow: "hidden",
            boxShadow: 6,
          },
        }}
      >
        {/* HEADER */}
        <DialogTitle
          sx={{
            background: headerColor,
            color: "#fff",
            fontWeight: 700,
            fontSize: "1.2rem",
            py: 2,
          }}
        >
          {editingId ? "Edit Program Tag" : "Insert Program Tag"}
        </DialogTitle>

        {/* CONTENT */}
        <DialogContent sx={{ p: 3 }}>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            {/* CAMPUS */}
            <Grid item xs={12} md={6}>
              <Typography fontWeight={700} sx={{ mb: 1 }}>
                Campus
              </Typography>
              <TextField
                select
                fullWidth
                label="Campus"
                value={selectedCampus}
                onChange={(e) => {
                  setSelectedCampus(e.target.value);
                  setSelectedAcademicProgram("");
                  setProgTag((prev) => ({
                    ...prev,
                    curriculum_id: "",
                  }));
                }}
              >
                <MenuItem value="">Choose Campus</MenuItem>
                {branches.map((branch) => (
                  <MenuItem key={branch.id} value={branch.id}>
                    {branch.branch}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            {/* PROGRAM */}
            <Grid item xs={12} md={6}>
              <Typography fontWeight={700} sx={{ mb: 1 }}>
                Program
              </Typography>
              <TextField
                select
                fullWidth
                label="Academic Program"
                value={selectedAcademicProgram}
                onChange={(e) => {
                  setSelectedAcademicProgram(e.target.value);
                  setProgTag((prev) => ({
                    ...prev,
                    curriculum_id: "",
                  }));
                }}
              >
                <MenuItem value="">Select Program</MenuItem>
                <MenuItem value="0">Undergraduate</MenuItem>
                <MenuItem value="1">Graduate</MenuItem>
                <MenuItem value="2">Techvoc</MenuItem>
              </TextField>
            </Grid>

            {/* CURRICULUM */}
            <Grid item xs={12}>
              <Typography fontWeight={700} sx={{ mb: 1 }}>
                Curriculum
              </Typography>

              <Autocomplete
                fullWidth
                options={filteredCurriculumList}
                value={
                  filteredCurriculumList.find(
                    (item) => item.curriculum_id === progTag.curriculum_id,
                  ) || null
                }
                onChange={(event, newValue) => {
                  setProgTag((prev) => ({
                    ...prev,
                    curriculum_id: newValue?.curriculum_id || "",
                  }));
                }}
                getOptionLabel={(option) => {
                  const startYear = Number(option.year_description);
                  const yearRange = !isNaN(startYear)
                    ? `${startYear} - ${startYear + 1}`
                    : (option.year_description || "");
                  return `${yearRange}: (${option.program_code}) ${option.program_description}${option.major ? ` (${option.major})` : ""} (${getBranchLabel(option.components)})`;
                }}
                renderInput={(params) => (
                  <TextField {...params} label="Choose Curriculum" />
                )}
              />
            </Grid>

            <Grid item xs={12}>
              <Typography fontWeight={700} sx={{ mb: 1 }}>
                Course
              </Typography>

              <Autocomplete
                fullWidth
                options={courseList}
                value={
                  courseList.find(
                    (course) => course.course_id === progTag.course_id,
                  ) || null
                }
                onChange={(event, newValue) => {
                  setProgTag((prev) => ({
                    ...prev,
                    course_id: newValue?.course_id || "",
                  }));
                }}
                getOptionLabel={(option) =>
                  `${option.course_code} - ${option.course_description} (${option.prereq || "No prereq"})`
                }
                filterOptions={(options, { inputValue }) => {
                  const words = inputValue.toLowerCase().split(" ");

                  return options.filter((course) => {
                    const courseCode = (course.course_code || "").toLowerCase();
                    const courseDesc = (
                      course.course_description || ""
                    ).toLowerCase();
                    const coursePreq = (course.prereq || "").toLowerCase();

                    return words.every(
                      (word) =>
                        courseCode.includes(word) ||
                        courseDesc.includes(word) ||
                        coursePreq.includes(word),
                    );
                  });
                }}
                renderInput={(params) => (
                  <TextField {...params} label="Choose Course" />
                )}
              />
            </Grid>

            {/* YEAR */}
            <Grid item xs={6}>
              <Typography fontWeight={700} sx={{ mb: 1 }}>
                Year Level
              </Typography>
              <TextField
                select
                fullWidth
                label="Year Level"
                name="year_level_id"
                value={progTag.year_level_id}
                onChange={handleChangesForEverything}
              >
                {yearLevelList.map((year) => (
                  <MenuItem key={year.year_level_id} value={year.year_level_id}>
                    {year.year_level_description}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            {/* SEM */}
            <Grid item xs={6}>
              <Typography fontWeight={700} sx={{ mb: 1 }}>
                Semester
              </Typography>
              <TextField
                select
                fullWidth
                label="Semester"
                name="semester_id"
                value={progTag.semester_id}
                onChange={handleChangesForEverything}
              >
                {semesterList.map((semester) => (
                  <MenuItem
                    key={semester.semester_id}
                    value={semester.semester_id}
                  >
                    {semester.semester_description}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
          </Grid>
        </DialogContent>

        {/* ACTIONS */}
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
            onClick={() => setOpenFormDialog(false)}
          >
            Cancel
          </Button>

          <Button
            variant="contained"
            disabled={editingId ? !canEdit : !canCreate}
            onClick={async () => {
              const isSaved = await handleInsertingProgTag();
              if (isSaved) {
                setOpenFormDialog(false);
              }
            }}
            sx={{
              px: 4,
              fontWeight: 600,
              textTransform: "none",
              "&.Mui-disabled": {
                backgroundColor: "#C9C9C9",
                color: "#666666",
              },
            }}
          >
            <SaveIcon fontSize="small" /> Save
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={openDeleteDialog}
        onClose={() => setOpenDeleteDialog(false)}
      >
        <DialogTitle>Confirm Delete Program Tag</DialogTitle>

        <DialogContent>
          <Typography>
            Are you sure you want to delete the course{" "}
            <b>{programToDelete?.course_description}</b> from curriculum{" "}
            <b>{programToDelete?.curriculum_description}</b>?
          </Typography>
        </DialogContent>

        <DialogActions>
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
            disabled={!canDelete}
            onClick={() => {
              handleDelete(deleteId);
              setOpenDeleteDialog(false);
              setProgramToDelete(null);
            }}
          >
            Yes, Delete
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={openDeleteAllDialog}
        onClose={() => setOpenDeleteAllDialog(false)}
      >
        <DialogTitle>Confirm Delete ALL Program Tags</DialogTitle>

        <DialogContent>
          <Typography>
            Are you sure you want to delete ALL tagged courses under this:
            <br />
            <br />
            <b>Curriculum ID:</b> {deleteAllFilter?.curriculum_id} <br />
            <b>Year Level:</b> {deleteAllFilter?.year_level_id} <br />
            <b>Semester:</b> {deleteAllFilter?.semester_id}
          </Typography>
        </DialogContent>

        <DialogActions>
          <Button
            color="error"
            variant="outlined"
            onClick={() => setOpenDeleteAllDialog(false)}
          >
            Cancel
          </Button>

          <Button
            color="error"
            variant="contained"
            disabled={!canDelete}
            onClick={() => {
              handleDeleteAllTagged();
              setOpenDeleteAllDialog(false);
            }}
          >
            Yes, Delete All
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
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
    </Box>
  );
};

const styles = {
  container: {
    display: "flex",
    flexDirection: "column", // 👈 TOP & BOTTOM
    gap: "30px",
    width: "100%",

  },
  formSection: {
    width: "100%", // 👈 instead of minWidth: "48%"
    background: "#f8f8f8",
    padding: "25px",

    boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
  },

  displaySection: {
    width: "100%", // 👈 instead of minWidth: "48%"
    background: "#f8f8f8",
    padding: "25px",

    boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
    overflowY: "auto",
  },

  label: {
    fontWeight: "bold",
    display: "block",
    marginBottom: "8px",
  },
  select: {
    width: "100%",
    padding: "12px",
    fontSize: "16px",
    borderRadius: "5px",
    border: "1px solid #ccc",
  },

  table: {
    width: "100%",
    borderCollapse: "collapse",
    textAlign: "left",
  },
  th: {
    padding: "12px",
    borderBottom: "2px solid #ccc",
    backgroundColor: "#f1f1f1",
    fontWeight: "bold",
    fontSize: "15px",
    color: "#333",
  },
  td: {
    padding: "10px",
    borderBottom: "1px solid #ddd",
    fontSize: "14px",
    color: "#333",
  },
};

export default ProgramTagging;
