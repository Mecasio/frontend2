import React, {
  useState,
  useEffect,
  useContext,
  useMemo,
  useRef,
} from "react";
import { SettingsContext } from "../App";
import axios from "axios";
import { useLocation } from "react-router-dom";
import {
  Box,
  Button,
  Typography,
  TextField,
  Paper,
  TableContainer,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Snackbar,
  Alert,
  Menu,
  MenuItem,
  Autocomplete,
} from "@mui/material";
import { Search as SearchIcon } from "@mui/icons-material";
import API_BASE_URL from "../apiConfig";
import Unauthorized from "../components/Unauthorized";
import LoadingOverlay from "../components/LoadingOverlay";
import CollegeEnrollmentTabs from "../components/CollegeEnrollmentTabs";
import {
  convertRawToRatingDynamic,
  setRemarksFromRatingDynamic,
} from "../utils/gradeConversion";

const bodyStyle = {
  fontSize: "15px",
  letterSpacing: "-0.9px",
  wordSpacing: "3px",
  color: "#333",
};


const PAGE_ID = 170;

const cleanStudentValue = (value) => {
  if (value === null || value === undefined) return "";
  const text = String(value).trim();
  return ["null", "undefined"].includes(text.toLowerCase()) ? "" : text;
};

const formatStudentSuggestionName = (student) =>
  [
    cleanStudentValue(student?.last_name),
    cleanStudentValue(student?.first_name),
    cleanStudentValue(student?.middle_name),
    cleanStudentValue(student?.extension),
  ]
    .filter(Boolean)
    .join(" ");

const CollegeStudentGradeFile = () => {
  const settings = useContext(SettingsContext);
  const colors = settings?.colors || {};
  const headerColor = colors.header || "#1976d2";
  const location = useLocation();

  // Colors State
  const [titleColor, setTitleColor] = useState("#000000");
  const [borderColor, setBorderColor] = useState("#000000");
  const [mainButtonColor, setMainButtonColor] = useState("#1976d2");

  // Search
  const [globalSearch, setGlobalSearch] = useState("");
  const [allStudents, setAllStudents] = useState([]);
  const [selectedStudentNumber, setSelectedStudentNumber] = useState("");
  const [searchStatus, setSearchStatus] = useState("");
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [isLoadingStudentDirectory, setIsLoadingStudentDirectory] =
    useState(false);
  const [isLoadingStudentRecord, setIsLoadingStudentRecord] = useState(false);

  // Data State
  const [studentInfo, setStudentInfo] = useState(null);
  const [studentGradeList, setStudentGradeList] = useState([]);
  const [gradeConversions, setGradeConversions] = useState([]);
  const studentSearchAbortRef = useRef(null);

  // Auth & Loading
  const [userID, setUserID] = useState("");
  const [user, setUser] = useState("");
  const [userRole, setUserRole] = useState("");
  const [hasAccess, setHasAccess] = useState(null);
  const [loading, setLoading] = useState(false);
  const [employeeID, setEmployeeID] = useState("");

  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  // View menu (generate/print documents — read-only, doesn't mutate data)
  const [viewMenuAnchorEl, setViewMenuAnchorEl] = useState(null);

  // ==========================================
  // EFFECTS
  // ==========================================

  useEffect(() => {
    if (!settings) return;
    if (colors.title) setTitleColor(colors.title);
    if (colors.border) setBorderColor(colors.border);
    if (colors.mainButton) setMainButtonColor(colors.mainButton);
  }, [settings]);

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
        `${API_BASE_URL}/api/page_access/${employeeID}/${PAGE_ID}`,
      );
      setHasAccess(response.data?.page_privilege === 1);
    } catch (error) {
      console.error("Error checking access:", error);
      setHasAccess(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    // Dynamic grade conversion keeps the displayed ratings aligned with the
    // grade_conversion table — same as the editable Student Grade File.
    axios
      .get(`${API_BASE_URL}/api/admin/grade-conversion`)
      .then((res) => setGradeConversions(res.data))
      .catch((err) => {
        console.error("Failed to fetch grade conversions:", err);
        setGradeConversions([]);
      });
  }, []);

  // ==========================================
  // DATA HELPERS
  // ==========================================

  const groupedGrades = useMemo(() => {
    return studentGradeList.reduce((acc, curr) => {
      const year = curr.year_level_description;
      const sem = curr.semester_description;
      const sy = curr.active_school_year_id;

      acc[year] ??= {};
      acc[year][sem] ??= {};
      acc[year][sem][sy] ??= [];

      acc[year][sem][sy].push(curr);

      return acc;
    }, {});
  }, [studentGradeList]);

  const yearLevelOrder = [
    "First Year",
    "Second Year",
    "Third Year",
    "Fourth Year",
    "Fifth Year",
  ];
  const semesterOrder = ["First Semester", "Second Semester", "Summer"];

  const getYearLevelRank = (level) => {
    const index = yearLevelOrder.indexOf(level);
    return index === -1 ? Number.MAX_SAFE_INTEGER : index;
  };

  const getSemesterRank = (semester) => {
    const index = semesterOrder.indexOf(semester);
    return index === -1 ? Number.MAX_SAFE_INTEGER : index;
  };

  const sortedTermGroups = useMemo(() => {
    return Object.entries(groupedGrades)
      .flatMap(([yearLevel, semesters]) =>
        Object.entries(semesters).flatMap(([semester, schoolYears]) =>
          Object.entries(schoolYears).map(([schoolYearId, termData]) => ({
            yearLevel,
            semester,
            schoolYearId,
            termData: [...termData].sort((a, b) => a.id - b.id),
            currentYear: Number(termData?.[0]?.current_year) || 0,
          })),
        ),
      )
      .sort((a, b) => {
        if (a.currentYear !== b.currentYear) {
          return a.currentYear - b.currentYear;
        }

        const yearLevelDiff =
          getYearLevelRank(a.yearLevel) - getYearLevelRank(b.yearLevel);
        if (yearLevelDiff !== 0) {
          return yearLevelDiff;
        }

        const semesterDiff =
          getSemesterRank(a.semester) - getSemesterRank(b.semester);
        if (semesterDiff !== 0) {
          return semesterDiff;
        }

        return Number(a.schoolYearId) - Number(b.schoolYearId);
      });
  }, [groupedGrades]);

  const viewOptions = [
    "HISTORY LOGS",
    "EVALUATION",
    "TRANSCRIPT OF RECORDS",
    "PERMANENT RECORD",
    "HONORABLE DISMISSAL",
    "COPY OF GRADES",
    "REPORT OF GRADES",
    "GOOD MORAL",
    "CERTIFICATE OF HONORS",
    "CERTIFICATE OF GWA",
    "CERTIFICATE OF HONORS AND GWA",
    "APPLICATION FOR EVALUATION",
    "APPLICATION FOR GRADUATION",
    "RESULT OF EVALUATION",
    "CERTIFICATE OF COMPLETE ACADEMIC REPORTS",
  ];

  const convertRawToRating = (value) =>
    convertRawToRatingDynamic(value, gradeConversions);

  const remarkConversion = (enRemarks) => {
    if (enRemarks === 0) return "ONGOING";
    if (enRemarks === 1) return "PASSED";
    if (enRemarks === 2) return "FAILED";
    if (enRemarks === 3) return "INCOMPLETE";
    if (enRemarks === 4) return "DROPPED";
    if (enRemarks === 5) return "NO GRADE";
    if (enRemarks === 6) return "UNDEFINED GRADE";
    return "-";
  };

  // ✅ Read-only version — no `__edited` state exists here (nothing can be
  // edited), so this only ever reads the stored value from the database.
  const getDisplayedFinalGrade = (course) => {
    const storedGradeStatus = String(
      course?.grades_status ?? course?.grade_status ?? "",
    ).trim();

    if (storedGradeStatus) {
      return storedGradeStatus;
    }

    if (
      course?.numeric_grade !== null &&
      course?.numeric_grade !== undefined &&
      course?.numeric_grade !== ""
    ) {
      return String(course.numeric_grade);
    }

    const storedFinalGrade = course?.final_grade;
    const normalizedFinalGrade = String(storedFinalGrade ?? "")
      .trim()
      .toUpperCase();

    if (!normalizedFinalGrade || normalizedFinalGrade === "-") {
      return "";
    }

    if (normalizedFinalGrade === "INC") {
      return "Incomplete";
    }

    if (normalizedFinalGrade === "DRP" || normalizedFinalGrade === "DROP") {
      return "Dropped";
    }

    const numericFinalGrade = Number(storedFinalGrade);
    if (
      Number.isFinite(numericFinalGrade) &&
      numericFinalGrade > 0 &&
      numericFinalGrade <= 5
    ) {
      return numericFinalGrade.toFixed(2);
    }

    return convertRawToRating(storedFinalGrade) || String(storedFinalGrade);
  };

  // ==========================================
  // API CALLS (read-only — GET requests only)
  // ==========================================

  const searchStudents = async (query) => {
    const trimmedQuery = String(query || "").trim();
    if (trimmedQuery.length < 2) {
      setAllStudents([]);
      setSuggestionsOpen(false);
      return;
    }

    const empId = employeeID || localStorage.getItem("employee_id") || "";
    if (!empId) {
      setAllStudents([]);
      setSuggestionsOpen(false);
      setSearchStatus("Missing employee id for student search");
      return;
    }

    if (studentSearchAbortRef.current) {
      studentSearchAbortRef.current.abort();
    }
    const controller = new AbortController();
    studentSearchAbortRef.current = controller;

    try {
      setIsLoadingStudentDirectory(true);
      const res = await axios.get(`${API_BASE_URL}/api/student_enrollment`, {
        params: {
          employee_id: empId,
          q: trimmedQuery,
          limit: 10,
        },
        signal: controller.signal,
      });
      const rows = Array.isArray(res.data) ? res.data : [];
      setAllStudents(rows);
      setSearchStatus(
        rows.length
          ? `Showing ${rows.length} matching student${rows.length > 1 ? "s" : ""}`
          : "No students found",
      );
    } catch (err) {
      if (err?.code === "ERR_CANCELED" || err?.name === "CanceledError") {
        return;
      }
      console.error("Error searching students:", err);
      setAllStudents([]);
      setSearchStatus("Failed to search students");
    } finally {
      setIsLoadingStudentDirectory(false);
    }
  };

  const fetchStudentProfile = async (student_number) => {
    if (!student_number) {
      setStudentInfo(null);
      return;
    }

    try {
      const empId = employeeID || localStorage.getItem("employee_id") || "";
      const res = await axios.get(`${API_BASE_URL}/api/student-info`, {
        params: {
          searchQuery: student_number,
          ...(empId ? { employee_id: empId } : {}),
        },
      });
      setStudentInfo(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Error fetching student profile:", err);
      setStudentInfo(null);
      setSnackbar({
        open: true,
        message: "Failed to fetch student information",
        severity: "error",
      });
    }
  };

  const fetchStudentGrade = async (student_number) => {
    try {
      const empId = employeeID || localStorage.getItem("employee_id") || "";
      const res = await axios.get(
        `${API_BASE_URL}/api/student-info/${student_number}`,
        {
          params: empId ? { employee_id: empId } : undefined,
        },
      );
      setStudentGradeList(res.data);
    } catch {
      setStudentGradeList([]);
    }
  };

  useEffect(() => {
    if (!selectedStudentNumber) {
      setStudentInfo(null);
      setStudentGradeList([]);
      return;
    }

    const loadStudentRecord = async () => {
      setIsLoadingStudentRecord(true);
      await Promise.all([
        fetchStudentProfile(selectedStudentNumber),
        fetchStudentGrade(selectedStudentNumber),
      ]);
      setIsLoadingStudentRecord(false);
    };

    loadStudentRecord();
  }, [selectedStudentNumber]);

  useEffect(() => {
    const trimmedQuery = globalSearch.trim();

    if (trimmedQuery.length === 0) {
      setAllStudents([]);
      setSearchStatus("");
      setSuggestionsOpen(false);
      return undefined;
    }

    if (trimmedQuery.length < 2) {
      setAllStudents([]);
      setSearchStatus("Type at least 2 characters to search");
      setSuggestionsOpen(false);
      return undefined;
    }

    if (
      selectedStudentNumber &&
      String(trimmedQuery) === String(selectedStudentNumber)
    ) {
      return undefined;
    }

    const timer = setTimeout(() => {
      setSuggestionsOpen(true);
      searchStudents(trimmedQuery);
    }, 350);

    return () => {
      clearTimeout(timer);
      if (studentSearchAbortRef.current) {
        studentSearchAbortRef.current.abort();
      }
    };
  }, [globalSearch, selectedStudentNumber, employeeID]);

  const filteredStudents = allStudents;

  // ==========================================
  // HANDLERS (view-only)
  // ==========================================

  const handleSelectStudent = (student) => {
    if (!student?.student_number) return;

    setSelectedStudentNumber(student.student_number);
    setGlobalSearch(student.student_number);
    setSearchStatus(`Selected ${student.student_number}`);
    setSuggestionsOpen(false);
    sessionStorage.setItem("edit_student_number", student.student_number);
  };

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const studentNumberFromUrl = params.get("student_number")?.trim();
    const personIdFromUrl = params.get("person_id")?.trim();

    if (studentNumberFromUrl) {
      setSelectedStudentNumber(studentNumberFromUrl);
      setGlobalSearch(studentNumberFromUrl);
      setSearchStatus(`Selected ${studentNumberFromUrl}`);
      sessionStorage.setItem("edit_student_number", studentNumberFromUrl);
      return;
    }

    if (!personIdFromUrl) return;

    axios
      .get(`${API_BASE_URL}/api/student-person-data/${personIdFromUrl}`)
      .then((res) => {
        const resolvedStudentNumber = res.data?.student_number;
        if (resolvedStudentNumber) {
          setSelectedStudentNumber(resolvedStudentNumber);
          setGlobalSearch(resolvedStudentNumber);
          setSearchStatus(`Selected ${resolvedStudentNumber}`);
          sessionStorage.setItem("edit_person_id", personIdFromUrl);
          sessionStorage.setItem("edit_student_number", resolvedStudentNumber);
        } else {
          setSnackbar({
            open: true,
            message: "No student number found for the selected person.",
            severity: "warning",
          });
        }
      })
      .catch((err) => {
        console.error("Auto grade-file search failed:", err);
        setSnackbar({
          open: true,
          message: "Unable to load student for the selected person.",
          severity: "error",
        });
      });
  }, [location.search]);

  const handleOpenViewMenu = (event) => {
    setViewMenuAnchorEl(event.currentTarget);
  };

  const handleCloseViewMenu = () => {
    setViewMenuAnchorEl(null);
  };

  const handleSelectViewOption = (option) => {
    console.log("Selected view option:", option);
    // Hook up document generation here — this only reads/prints existing
    // data, so it stays available in the read-only view.
    handleCloseViewMenu();
  };

  const selectedStudent =
    allStudents.find(
      (student) =>
        String(student.student_number) === String(selectedStudentNumber),
    ) || null;

  if (loading || hasAccess === null)
    return <LoadingOverlay open={loading} message="Loading..." />;

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
    <Box
      sx={{
        height: "calc(100vh - 150px)",
        overflowY: "auto",
        paddingRight: 1,
        backgroundColor: "transparent",
        mt: 1,
        padding: 2,
        ...bodyStyle,
      }}
    >
      {/* HEADER & SEARCH */}
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={2}
        gap={2}
        flexWrap="wrap"
      >
        <Typography
          variant="h4"
          fontWeight="bold"
          style={{ color: titleColor }}
        >
          STUDENT GRADE FILE
        </Typography>

        <Box sx={{ width: 450, maxWidth: "100%" }}>
          <Autocomplete
            options={filteredStudents}
            filterOptions={(options) => options}
            loading={isLoadingStudentDirectory}
            loadingText="Searching..."
            noOptionsText={
              globalSearch.trim().length >= 2
                ? "No matching students found"
                : "Type at least 2 characters"
            }
            open={suggestionsOpen && globalSearch.trim().length >= 2}
            onOpen={() => {
              if (globalSearch.trim().length >= 2) setSuggestionsOpen(true);
            }}
            onClose={() => setSuggestionsOpen(false)}
            value={selectedStudent}
            inputValue={globalSearch}
            onChange={(_, student) => handleSelectStudent(student)}
            onInputChange={(_, value, reason) => {
              setGlobalSearch(value);
              setSuggestionsOpen(value.trim().length >= 2);

              if (reason === "clear" || value.trim().length === 0) {
                setSelectedStudentNumber("");
                setStudentInfo(null);
                setStudentGradeList([]);
                setAllStudents([]);
                setSuggestionsOpen(false);
              }
            }}
            getOptionLabel={(option) => {
              if (typeof option === "string") return option;

              const fullName = formatStudentSuggestionName(option);

              return fullName
                ? `${option.student_number} - ${fullName}`
                : String(option.student_number || "");
            }}
            isOptionEqualToValue={(option, value) =>
              String(option?.student_number) === String(value?.student_number)
            }
            renderInput={(params) => (
              <TextField
                {...params}
                variant="outlined"
                placeholder="Search by name or student number"
                size="small"
                onFocus={() => {
                  if (globalSearch.trim().length >= 2) setSuggestionsOpen(true);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && filteredStudents.length > 0) {
                    e.preventDefault();
                    handleSelectStudent(filteredStudents[0]);
                  }
                }}
                sx={{
                  backgroundColor: "#fff",
                  borderRadius: 1,
                  "& .MuiOutlinedInput-root": { borderRadius: "10px" },
                }}
                InputProps={{
                  ...params.InputProps,
                  startAdornment: <SearchIcon sx={{ mr: 1, color: "gray" }} />,
                }}
              />
            )}
            renderOption={(props, option) => {
              const studentNumber = cleanStudentValue(option?.student_number);
              const fullName = formatStudentSuggestionName(option);

              return (
                <Box
                  component="li"
                  {...props}
                  key={studentNumber || option?.person_id}
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
                    {studentNumber || "N/A"}
                  </Typography>
                  <Typography sx={{ fontSize: 14, color: "#555" }}>|</Typography>
                  <Typography sx={{ fontSize: 14 }} noWrap>
                    {fullName || "Unnamed Student"}
                  </Typography>
                </Box>
              );
            }}
            slotProps={{
              paper: {
                sx: {
                  border: "1px solid #d0d0d0",
                  borderRadius: "8px",
                  boxShadow: "0 8px 24px rgba(0,0,0,0.14)",
                  overflow: "hidden",
                  mt: 0.5,
                },
              },
              listbox: {
                sx: {
                  maxHeight: 320,
                  p: 0,
                },
              },
            }}
          />
          <Typography sx={{ mt: 0.75, fontSize: 12, color: "text.secondary" }}>
            {isLoadingStudentRecord
              ? "Loading selected student record..."
              : searchStatus}
          </Typography>
        </Box>
      </Box>

      <hr style={{ border: "1px solid #ccc", width: "100%" }} />
      <br />
      <br />

      <CollegeEnrollmentTabs />

      <br />
      <br />

      <TableContainer
        component={Paper}
        sx={{ width: "100%", border: `1px solid ${borderColor}` }}
      >
        <Table>
          <TableHead sx={{ backgroundColor: headerColor }}>
            <TableRow>
              <TableCell sx={{ color: "white", textAlign: "Center" }}>
                Student Personal Information
              </TableCell>
            </TableRow>
          </TableHead>
        </Table>
      </TableContainer>

      <TableContainer
        component={Paper}
        sx={{
          width: "100%",
          border: `1px solid ${borderColor}`,
          padding: "20px 0px",
        }}
      >
        <Table
          sx={{
            "& td, & th": {
              paddingTop: 0,
              paddingBottom: 0,
              border: "none",
              fontSize: "15px",
              letterSpacing: "-0.9px",
              wordSpacing: "3px",
            },
          }}
        >
          <TableHead>
            <TableRow>
              <TableCell>Student Name:</TableCell>
              <TableCell sx={{ fontWeight: "700" }}>
                {studentInfo?.[0] ? (
                  <>
                    {studentInfo[0].last_name?.toUpperCase() || ""}{" "}
                    {studentInfo[0].first_name?.toUpperCase() || ""}{" "}
                    {studentInfo[0].middle_name?.toUpperCase() || ""}
                  </>
                ) : (
                  "-"
                )}
              </TableCell>
              <TableCell>Applicant No./Student No.:</TableCell>
              <TableCell>
                {studentInfo?.[0]?.student_number?.toUpperCase() || "-"}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Program:</TableCell>
              <TableCell>
                {studentInfo?.[0] ? (
                  <>
                    {studentInfo[0].program_description} (
                    {studentInfo[0].campus === 1
                      ? "MANILA CAMPUS"
                      : "CAVITE CAMPUS"}
                    )
                  </>
                ) : (
                  "-"
                )}
              </TableCell>
              <TableCell>Year Level:</TableCell>
              <TableCell>
                {studentInfo?.[0]?.year_level_description || "-"}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Address:</TableCell>
              <TableCell>
                {studentInfo?.[0] ? (
                  <>
                    {studentInfo[0].presentStreet},{" "}
                    {studentInfo[0].presentBarangay},{" "}
                    {studentInfo[0].presentMunicipality},{" "}
                    {studentInfo[0].presentZipCode}
                  </>
                ) : (
                  "-"
                )}
              </TableCell>
              <TableCell>Contact No.:</TableCell>
              <TableCell>{studentInfo?.[0]?.cellphoneNumber || "-"}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Status:</TableCell>
              <TableCell>{studentInfo?.[0]?.student_status || "-"}</TableCell>
              <TableCell>Section:</TableCell>
              <TableCell>{studentInfo?.[0]?.section || "-"}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Curriculum:</TableCell>
              <TableCell>
                {studentInfo?.[0] ? (
                  <>
                    {studentInfo[0].year_description}-
                    {studentInfo[0].year_description + 1}
                  </>
                ) : (
                  "-"
                )}
              </TableCell>
              <TableCell>Email Address:</TableCell>
              <TableCell>{studentInfo?.[0]?.emailAddress || "-"}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>School Year</TableCell>
              <TableCell>
                {studentInfo?.[0] ? (
                  <>
                    {studentInfo[0].current_year}-
                    {studentInfo[0].current_year + 1}
                  </>
                ) : (
                  "-"
                )}
              </TableCell>
              <TableCell>Semester:</TableCell>
              <TableCell>
                {studentInfo?.[0]?.semester_description || "-"}
              </TableCell>
            </TableRow>
          </TableHead>
        </Table>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: "1rem",
            width: "100%",
            justifyContent: "end",
            padding: "0rem 1.5rem",
            marginTop: "1rem",
          }}
        >
          <Button
            variant="contained"
            sx={{ background: mainButtonColor }}
            onClick={handleOpenViewMenu}
          >
            VIEW
          </Button>
        </Box>
      </TableContainer>

      {/* GRADE LISTS - READ-ONLY, COMPACT TABLES */}
      {sortedTermGroups.map(
        ({ yearLevel, semester, schoolYearId, termData }) => (
          <Paper
            key={`${yearLevel}-${semester}-${schoolYearId}`}
            sx={{
              width: "100%",
              border: `1px solid ${borderColor}`,
              mb: 2,
              overflow: "hidden",
            }}
          >
            {/* Term Header Info — no action buttons, view-only */}
            <Box
              sx={{
                backgroundColor: headerColor,
                borderBottom: `1px solid ${borderColor}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Typography
                sx={{
                  color: "white",
                  padding: 1,
                  fontSize: "17px",
                  textAlign: "center",
                  fontWeight: "bold",
                }}
              >
                ( {yearLevel} ) {termData[0].current_year}-
                {termData[0].current_year + 1} - {semester}
              </Typography>
            </Box>

            {/* Compact Subject Table (read-only) */}
            <TableContainer>
              <Table size="small" sx={{ minWidth: 800 }}>
                <TableHead>
                  <TableRow>
                    <TableCell
                      sx={{
                        width: "3%",
                        py: 1,
                        px: 1,
                        border: `1px solid ${borderColor}`,
                        textAlign: "center",
                        backgroundColor: "#eee",
                      }}
                    >
                      #
                    </TableCell>
                    <TableCell
                      sx={{
                        width: "10%",
                        py: 1,
                        px: 1,
                        border: `1px solid ${borderColor}`,
                        backgroundColor: "#eee",
                      }}
                    >
                      Course Code
                    </TableCell>
                    <TableCell
                      sx={{
                        width: "10%",
                        py: 1,
                        px: 1,
                        border: `1px solid ${borderColor}`,
                        backgroundColor: "#eee",
                        textAlign: "center",
                      }}
                    >
                      Professor
                    </TableCell>
                    <TableCell
                      sx={{
                        width: "35%",
                        py: 1,
                        px: 1,
                        border: `1px solid ${borderColor}`,
                        backgroundColor: "#eee",
                      }}
                    >
                      Course Description
                    </TableCell>
                    <TableCell
                      sx={{
                        width: "5%",
                        py: 1,
                        px: 1,
                        border: `1px solid ${borderColor}`,
                        backgroundColor: "#eee",
                        textAlign: "center",
                      }}
                    >
                      Units
                    </TableCell>
                    <TableCell
                      sx={{
                        width: "8%",
                        py: 1,
                        px: 1,
                        border: `1px solid ${borderColor}`,
                        backgroundColor: "#eee",
                        textAlign: "center",
                      }}
                    >
                      Section
                    </TableCell>
                    <TableCell
                      sx={{
                        width: "8%",
                        py: 1,
                        px: 1,
                        border: `1px solid ${borderColor}`,
                        backgroundColor: "#eee",
                        textAlign: "center",
                      }}
                    >
                      Midterm
                    </TableCell>
                    <TableCell
                      sx={{
                        width: "8%",
                        py: 1,
                        px: 1,
                        border: `1px solid ${borderColor}`,
                        backgroundColor: "#eee",
                        textAlign: "center",
                      }}
                    >
                      Finals
                    </TableCell>
                    <TableCell
                      sx={{
                        width: "8%",
                        py: 1,
                        px: 1,
                        border: `1px solid ${borderColor}`,
                        backgroundColor: "#eee",
                        textAlign: "center",
                      }}
                    >
                      Final Grade
                    </TableCell>
                    <TableCell
                      sx={{
                        width: "5%",
                        py: 1,
                        px: 1,
                        border: `1px solid ${borderColor}`,
                        backgroundColor: "#eee",
                        textAlign: "center",
                      }}
                    >
                      Re-Exam
                    </TableCell>
                    <TableCell
                      sx={{
                        width: "8%",
                        py: 1,
                        px: 1,
                        border: `1px solid ${borderColor}`,
                        backgroundColor: "#eee",
                        textAlign: "center",
                      }}
                    >
                      Status
                    </TableCell>
                    <TableCell
                      sx={{
                        width: "8%",
                        py: 1,
                        px: 1,
                        border: `1px solid ${borderColor}`,
                        borderRight: "none",
                        backgroundColor: "#eee",
                        textAlign: "center",
                      }}
                    >
                      Remarks
                    </TableCell>
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
                  {termData.map((course, index) => (
                    <TableRow key={course.course_id} hover>
                      <TableCell
                        sx={{
                          py: 0.5,
                          px: 1,
                          border: `1px solid ${borderColor}`,
                          textAlign: "center",
                        }}
                      >
                        {index + 1}
                      </TableCell>
                      <TableCell
                        sx={{
                          py: 0.5,
                          px: 1,
                          border: `1px solid ${borderColor}`,
                        }}
                      >
                        {course.course_code}
                      </TableCell>
                      <TableCell
                        sx={{
                          py: 0.5,
                          px: 1,
                          border: `1px solid ${borderColor}`,
                          textAlign: "center",
                        }}
                      ></TableCell>
                      <TableCell
                        sx={{
                          py: 0.5,
                          px: 1,
                          border: `1px solid ${borderColor}`,
                        }}
                      >
                        {course.course_description}
                      </TableCell>
                      <TableCell
                        sx={{
                          py: 0.5,
                          px: 1,
                          border: `1px solid ${borderColor}`,
                          textAlign: "center",
                        }}
                      >
                        {course.course_unit || 0}
                      </TableCell>
                      <TableCell
                        sx={{
                          py: 0.5,
                          px: 1,
                          border: `1px solid ${borderColor}`,
                          textAlign: "center",
                        }}
                      ></TableCell>
                      {/* ✅ Read-only: plain text instead of GradeSelect */}
                      <TableCell
                        sx={{
                          py: 0.5,
                          px: 1,
                          border: `1px solid ${borderColor}`,
                          textAlign: "center",
                        }}
                      >
                        {course.midterm ?? ""}
                      </TableCell>
                      <TableCell
                        sx={{
                          py: 0.5,
                          px: 1,
                          border: `1px solid ${borderColor}`,
                          textAlign: "center",
                        }}
                      >
                        {course.finals ?? ""}
                      </TableCell>
                      <TableCell
                        sx={{
                          py: 0.5,
                          px: 1,
                          border: `1px solid ${borderColor}`,
                          textAlign: "center",
                          fontWeight: "bold",
                        }}
                      >
                        {getDisplayedFinalGrade(course)}
                      </TableCell>
                      <TableCell
                        sx={{
                          py: 0.5,
                          px: 1,
                          border: `1px solid ${borderColor}`,
                          textAlign: "center",
                        }}
                      >
                        {course.grades_status || "-"}
                      </TableCell>
                      <TableCell
                        sx={{
                          py: 0.5,
                          px: 1,
                          border: `1px solid ${borderColor}`,
                          textAlign: "center",
                          fontSize: "12px",
                        }}
                      >
                        {remarkConversion(course.en_remarks)}
                      </TableCell>
                      <TableCell
                        sx={{
                          py: 0.5,
                          px: 1,
                          border: `1px solid ${borderColor}`,
                          borderRight: "none",
                          textAlign: "center",
                          fontSize: "12px",
                        }}
                      >
                        {course.remarks?.toUpperCase()}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      sx={{
                        py: 0.5,
                        px: 1,
                        border: `1px solid ${borderColor}`,
                        textAlign: "right",
                        fontWeight: "700",
                        backgroundColor: "#fafafa",
                      }}
                    >
                      TOTAL UNITS:
                    </TableCell>
                    <TableCell
                      sx={{
                        py: 0.5,
                        px: 1,
                        border: `1px solid ${borderColor}`,
                        textAlign: "center",
                        fontWeight: "700",
                        backgroundColor: "#fafafa",
                      }}
                    >
                      {termData.reduce(
                        (sum, course) =>
                          sum + (Number(course.course_unit) || 0),
                        0,
                      )}
                    </TableCell>
                    <TableCell
                      colSpan={6}
                      sx={{ border: `1px solid ${borderColor}` }}
                    ></TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        ),
      )}

      {/* View Options Dropdown Menu — read-only, just generates/prints documents */}
      <Menu
        anchorEl={viewMenuAnchorEl}
        open={Boolean(viewMenuAnchorEl)}
        onClose={handleCloseViewMenu}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "right",
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "right",
        }}
        PaperProps={{
          style: {
            maxHeight: 400,
            width: "320px",
            marginTop: "8px",
          },
        }}
      >
        {viewOptions.map((option) => (
          <MenuItem
            key={option}
            onClick={() => handleSelectViewOption(option)}
            sx={{ fontSize: "14px", py: 1.5 }}
          >
            {option}
          </MenuItem>
        ))}
      </Menu>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
};

export default CollegeStudentGradeFile;
