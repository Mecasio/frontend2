import React, { useState, useEffect, useContext, useRef, useCallback, useMemo } from "react";
import { SettingsContext } from "../App";
import "../styles/TempStyles.css";
import axios from "axios";
import { FaFileExcel } from "react-icons/fa";
import * as XLSX from "xlsx-js-style";
import { saveAs } from "file-saver";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableContainer,
  TextField,
  Button,
  FormControl,
  Select,
  InputLabel,
  MenuItem,
  Box,
  Typography,
  Paper,
  Snackbar,
  Alert,
  ClickAwayListener,
  Popper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from "@mui/material";
import API_BASE_URL from "../apiConfig";
import { useLocation } from "react-router-dom";
import { FcPrint } from "react-icons/fc";
import SearchIcon from "@mui/icons-material/Search";
import EaristLogo from "../assets/EaristLogo.png";
import {
  convertRawToRatingDynamic,
  setRemarksFromRatingDynamic,
} from "../utils/gradeConversion";
import { postAuditEvent, getAuditHeaders } from "../utils/auditEvents";
import useAuditMac from "../utils/useAuditMac";
import {
  buildGradingReportPrintHtml,
  mapStudentToGradingPrintRow,
  resolveLogoDataUrl,
  GRADING_REPORT_PRINT_CSS,
} from "../utils/gradingReportPrintLayout";

// Defined OUTSIDE the component so the reference never changes
const gradeOptions = [
  ...Array.from({ length: 41 }, (_, i) => (100 - i).toString()),
  "INC",
  "DROP",
];

function validateGradeInput(rawValue) {
  if (rawValue === null || rawValue === undefined) return "";

  const value = String(rawValue).trim().toUpperCase();
  if (value === "") return "";

  if (/^INC/.test(value)) return "INC";
  if (/^(DRP|DROP)/.test(value)) return "DROP";

  if (/^[A-Z]+$/.test(value)) {
    return "";
  }

  if (!/^\d{1,3}$/.test(value)) {
    return "";
  }

  let num = Number(value);
  if (isNaN(num)) return "";

  if (num > 100) num = 100;
  if (num < 60) return "";

  return String(num);
}

const displayGradeValue = (rawValue) => {
  const normalized = String(rawValue ?? "").trim().toUpperCase();
  if (["", "0", "0.00", "NULL", "UNDEFINED"].includes(normalized)) return "";
  if (normalized === "DRP") return "DROP";
  return rawValue ?? "";
};

// â”€â”€ GradeSelect outside + React.memo = no unmount/remount on parent re-render â”€
const GradeSelect = React.memo(({ value, onChange, placeholder = "", disabled = false }) => {
  const [inputValue, setInputValue] = useState(displayGradeValue(value));
  const [open, setOpen] = useState(false);
  const anchorRef = useRef(null);

  useEffect(() => {
    if (!open) {
      setInputValue(displayGradeValue(value));
    }
  }, [value, open]);

  const commitValue = useCallback(
    (rawValue) => {
      const validated = validateGradeInput(rawValue);
      setInputValue(validated);
      if (validated !== displayGradeValue(value)) {
        onChange(validated);
      }
    },
    [value, onChange],
  );

  return (
    <ClickAwayListener
      onClickAway={() => {
        if (open) {
          setOpen(false);
          commitValue(inputValue);
        }
      }}
    >
      <Box sx={{ width: 80 }}>
        <TextField
          ref={anchorRef}
          placeholder={placeholder}
          size="small"
          variant="outlined"
          value={inputValue}
          disabled={disabled}
          onFocus={() => {
            if (!disabled) setOpen(true);
          }}
          onClick={() => {
            if (!disabled) setOpen(true);
          }}
          onChange={(event) => {
            if (disabled) return;
            const nextValue = event.target.value.toUpperCase();
            setInputValue(nextValue);
          }}
          onBlur={() => {
            if (!disabled) {
              setOpen(false);
              commitValue(inputValue);
            }
          }}
          onKeyDown={(e) => {
            if (disabled) return;
            if (e.key === "Enter") {
              e.preventDefault();
              setOpen(false);
              commitValue(inputValue);
            } else if (e.key === "Escape") {
              setOpen(false);
            }
          }}
          inputProps={{
            style: {
              textAlign: "center",
              fontFamily: "Poppins",
            },
          }}
          sx={{ width: "80px" }}
        />
        <Popper
          open={open}
          anchorEl={anchorRef.current}
          placement="bottom-start"
          sx={{ zIndex: 1500 }}
        >
          <Paper
            sx={{
              mt: 0.5,
              width: 96,
              maxHeight: 220,
              overflowY: "auto",
              border: "1px solid #D1D5DB",
              boxShadow: "0 8px 20px rgba(0,0,0,0.16)",
            }}
          >
            {gradeOptions.map((option) => (
              <Box
                key={option}
                component="button"
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                if (disabled) return;
                setOpen(false);
                commitValue(option);
                }}
                sx={{
                  width: "100%",
                  border: 0,
                  background: "white",
                  py: 0.75,
                  px: 1,
                  fontFamily: "Poppins",
                  fontSize: 13,
                  textAlign: "center",
                  cursor: "pointer",
                  "&:hover": {
                    backgroundColor: "#F3F4F6",
                  },
                }}
              >
                {option}
              </Box>
            ))}
          </Paper>
        </Popper>
      </Box>
    </ClickAwayListener>
  );
});
GradeSelect.displayName = "GradeSelect";

const GradingSheet = () => {
  useAuditMac();
  const settings = useContext(SettingsContext);
  const colors = settings?.colors || {};
  const branding = settings?.branding || {};
  const assets = settings?.assets || {};
  const headerColor = colors.header || "#1976d2";
  const location = useLocation();
  const { course_id, section_id, school_year_id } = location.state || {};
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

  useEffect(() => {
    if (!settings) return;

    if (colors.title) setTitleColor(colors.title);
    if (colors.subtitle) setSubtitleColor(colors.subtitle);
    if (colors.border) setBorderColor(colors.border);
    if (colors.mainButton)
      setMainButtonColor(colors.mainButton);
    if (colors.subButton) setSubButtonColor(colors.subButton);
    if (colors.stepper) setStepperColor(colors.stepper);

    if (assets.logoUrl) {
      setFetchedLogo(assets.logoUrl);
    } else {
      setFetchedLogo(EaristLogo);
    }

    if (branding.companyName) setCompanyName(branding.companyName);
    if (branding.shortTerm) setShortTerm(branding.shortTerm);
    if (branding.campusAddress) setCampusAddress(branding.campusAddress);
  }, [settings]);

  const [userID, setUserID] = useState("");
  const [user, setUser] = useState("");
  const [userRole, setUserRole] = useState("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("No Student Found");
  const [students, setStudents] = useState([]);
  const [activeButton, setActiveButton] = useState(null);
  const [profData, setPerson] = useState({
    prof_id: "",
    employee_id: "",
    fname: "",
    mname: "",
    lname: "",
  });
  const [sectionsHandle, setSectionsHandle] = useState([]);
  const [courseAssignedTo, setCoursesAssignedTo] = useState([]);
  const [schoolYears, setSchoolYears] = useState([]);
  const [selectedSchoolYear, setSelectedSchoolYear] = useState("");
  const [schoolSemester, setSchoolSemester] = useState([]);
  const [selectedSchoolSemester, setSelectedSchoolSemester] = useState("");
  const [selectedActiveSchoolYear, setSelectedActiveSchoolYear] = useState("");
  const [selectedSectionID, setSelectedSectionID] = useState("");
  const [isGeneratingGradingPdf, setIsGeneratingGradingPdf] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState("");
  const [gradingSheetBootstrapped, setGradingSheetBootstrapped] = useState(false);
  const skipNextStudentFetchRef = useRef(false);
  const skipNextSectionFetchRef = useRef(false);
  const autoSaveTimersRef = useRef({});
  const pendingDraftsRef = useRef({});
  const [selectedFile, setSelectedFile] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortOrder, setSortOrder] = useState("asc");
  const [gradeConversions, setGradeConversions] = useState([]);
  const [gradeEditScope, setGradeEditScope] = useState({
    midtermOpen: false,
    finalsOpen: false,
  });
  const [snack, setSnack] = useState({
    open: false,
    message: "",
    severity: "info",
  });
  const [postDialogOpen, setPostDialogOpen] = useState(false);
  const [isPostingGrades, setIsPostingGrades] = useState(false);
  const itemsPerPage = 10;

  useEffect(() => {
    if (course_id) setSelectedCourse(course_id);
    if (section_id) setSelectedSectionID(section_id);
    if (school_year_id) setSelectedActiveSchoolYear(school_year_id);
  }, [course_id, section_id, school_year_id]);

  useEffect(() => {
    if (!gradingSheetBootstrapped) return;
    if (skipNextStudentFetchRef.current) {
      skipNextStudentFetchRef.current = false;
      return;
    }
    if (
      profData.prof_id &&
      selectedCourse &&
      selectedSectionID &&
      selectedActiveSchoolYear
    ) {
      handleFetchStudents(selectedSectionID);
    }
  }, [
    profData.prof_id,
    selectedCourse,
    selectedSectionID,
    selectedActiveSchoolYear,
    gradingSheetBootstrapped,
  ]);

  useEffect(() => {
    const storedUser = localStorage.getItem("email");
    const storedRole = localStorage.getItem("role");
    const storedProfID = localStorage.getItem("prof_id");
    const storedEmployeeID = localStorage.getItem("employee_id");
    const storedID = storedProfID || storedEmployeeID;

    if (storedUser && storedRole && storedID) {
      setUser(storedUser);
      setUserRole(storedRole);
      setUserID(storedID);
      if (storedRole !== "faculty") {
        window.location.href = "/dashboard";
      } else {
        fetchPersonData(storedID);
      }
    } else {
      window.location.href = "/login";
    }
  }, []);

  const fetchPersonData = async (id) => {
    try {
      const storedProfID = localStorage.getItem("prof_id");
      const storedEmployeeID = localStorage.getItem("employee_id");
      const endpoint = storedProfID
        ? `/api/get_prof_data_by_prof/${storedProfID}`
        : storedEmployeeID
          ? `/api/get_prof_data_by_employee/${storedEmployeeID}`
          : `/api/get_prof_data/${id}`;
      const res = await axios.get(`${API_BASE_URL}${endpoint}`);
      const first = res.data[0];
      localStorage.setItem("prof_id", first.prof_id || "");
      localStorage.setItem("employee_id", first.employee_id || "");

      const profInfo = {
        prof_id: first.prof_id,
        employee_id: first.employee_id,
        fname: first.fname || "",
        mname: first.mname || "",
        lname: first.lname || "",
      };

      setPerson(profInfo);
    } catch (err) {
      setLoading(false);
      setMessage("Error Fetching Professor Personal Data");
    }
  };

  useEffect(() => {
    if (!profData.prof_id) return;
    axios
      .get(`${API_BASE_URL}/api/grading_sheet_bootstrap/${profData.prof_id}`, {
        params: {
          course_id: course_id || undefined,
          department_section_id: section_id || undefined,
          active_school_year_id: school_year_id || undefined,
        },
      })
      .then((res) => {
        const data = res.data || {};
        const scope = data?.grade_edit_scope || {};
        setGradeEditScope({
          midtermOpen: Boolean(scope.midtermOpen),
          finalsOpen: Boolean(scope.finalsOpen),
        });
        const active = data.activeSchoolYear || {};
        const courses = Array.isArray(data.courses) ? data.courses : [];
        const sections = Array.isArray(data.sections) ? data.sections : [];
        const selectedCourseId = data.selectedCourse || courses[0]?.course_id || "";
        const selectedSectionId = data.selectedSection || sections[0]?.department_section_id || "";
        const bootstrapStudents = Array.isArray(data.students) ? data.students : [];

        setCoursesAssignedTo(courses);
        setSectionsHandle(sections);
        setSelectedCourse(selectedCourseId);
        setSelectedSectionID(selectedSectionId);

        if (active.year_id) setSelectedSchoolYear(active.year_id);
        if (active.semester_id) setSelectedSchoolSemester(active.semester_id);
        if (active.school_year_id) setSelectedActiveSchoolYear(active.school_year_id);

        setStudents(
          bootstrapStudents.map((student) => ({
            ...withInitialSaveStatus(student),
            selectedCourse: selectedCourseId,
            department_section_id: selectedSectionId,
          })),
        );
        setMessage(bootstrapStudents.length ? "" : "There are no currently enrolled students in this subject and section");

        skipNextStudentFetchRef.current = true;
        skipNextSectionFetchRef.current = true;
        setGradingSheetBootstrapped(true);
      })
      .catch((err) => {
        console.error(err);
        setGradingSheetBootstrapped(true);
      });
  }, [profData.prof_id]);

  useEffect(() => {
    if (!gradingSheetBootstrapped) return;
    if (skipNextSectionFetchRef.current) {
      skipNextSectionFetchRef.current = false;
      return;
    }
    if (profData.prof_id && selectedCourse && selectedActiveSchoolYear) {
      axios
        .get(
          `${API_BASE_URL}/api/handle_section_of/${profData.prof_id}/${selectedCourse}/${selectedActiveSchoolYear}`,
        )
        .then((res) => {
          setSectionsHandle(res.data);
          const selectedSectionExists = res.data.some(
            (section) =>
              String(section.department_section_id) ===
              String(selectedSectionID),
          );
          if (res.data.length > 0 && !selectedSectionExists) {
            setSelectedSectionID(res.data[0].department_section_id);
          } else if (res.data.length === 0) {
            setStudents([]);
            setSelectedSectionID("");
          }
        })
        .catch((err) => console.error(err));
    }
  }, [
    profData.prof_id,
    selectedCourse,
    selectedActiveSchoolYear,
    gradingSheetBootstrapped,
  ]);

  useEffect(() => {
    axios
      .get(`${API_BASE_URL}/api/get_school_year`)
      .then((res) => {
        const currentYear = new Date().getFullYear();
        const filteredYears = res.data.filter(
          (yearObj) => Number(yearObj.current_year) <= currentYear,
        );

        setSchoolYears(filteredYears);
      })
      .catch((err) => console.error(err));
  }, []);

  useEffect(() => {
    axios
      .get(`${API_BASE_URL}/api/get_school_semester/`)
      .then((res) => setSchoolSemester(res.data))
      .catch((err) => console.error(err));
  }, []);

  useEffect(() => {
    if (school_year_id) return;
    axios
      .get(`${API_BASE_URL}/api/active_school_year`)
      .then((res) => {
        if (res.data.length > 0) {
          setSelectedSchoolYear(res.data[0].year_id);
          setSelectedSchoolSemester(res.data[0].semester_id);
        }
      })
      .catch((err) => console.error(err));
  }, []);

  useEffect(() => {
    axios
      .get(`${API_BASE_URL}/api/admin/grade-conversion`)
      .then((res) => setGradeConversions(res.data))
      .catch((err) => {
        console.error("Failed to fetch grade conversions:", err);
        setGradeConversions([]);
      });
  }, []);

  useEffect(() => {
    if (selectedSchoolYear && selectedSchoolSemester) {
      axios
        .get(
          `${API_BASE_URL}/api/get_selecterd_year/${selectedSchoolYear}/${selectedSchoolSemester}`,
        )
        .then((res) => {
          if (res.data.length > 0) {
            setSelectedActiveSchoolYear(res.data[0].school_year_id);
          }
        })
        .catch((err) => console.error(err));
    }
  }, [selectedSchoolYear, selectedSchoolSemester]);

  const handleFetchStudents = async (department_section_id) => {
    if (!profData.prof_id) return;
    if (!selectedActiveSchoolYear) return;

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/enrolled_student_list/${profData.prof_id}/${selectedCourse}/${department_section_id}/${selectedActiveSchoolYear}`,
      );
      const data = await response.json();

      if (response.ok) {
        if (data.length === 0) {
          setStudents([]);
          setMessage(
            "There are no currently enrolled students in this subject and section",
          );
        } else {
          const studentsWithSubject = data.map((student) => ({
            ...withInitialSaveStatus(student),
            selectedCourse,
            department_section_id,
          }));

          setStudents(studentsWithSubject);
          setMessage("");
        }
      } else {
        setStudents([]);
        setMessage(data.message || "Failed to fetch students.");
      }
    } catch (error) {
      setLoading(false);
      setMessage("Fetch error");
    }
  };

  const [searchQuery, setSearchQuery] = useState("");

  // useMemo so filtering/sorting only reruns when students or searchQuery change
  const filteredStudents = useMemo(() =>
    students
      .filter((s) => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return (
          s.student_number?.toString().includes(q) ||
          s.first_name?.toLowerCase().includes(q) ||
          s.middle_name?.toLowerCase().includes(q) ||
          s.last_name?.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        if (!searchQuery) return 0;
        const q = searchQuery.toLowerCase();

        const aMatch =
          a.student_number?.toString().includes(q) ||
          a.first_name?.toLowerCase().includes(q) ||
          a.middle_name?.toLowerCase().includes(q) ||
          a.last_name?.toLowerCase().includes(q);

        const bMatch =
          b.student_number?.toString().includes(q) ||
          b.first_name?.toLowerCase().includes(q) ||
          b.middle_name?.toLowerCase().includes(q) ||
          b.last_name?.toLowerCase().includes(q);

        if (aMatch && !bMatch) return -1;
        if (!aMatch && bMatch) return 1;
        return 0;
      }),
    [students, searchQuery],
  );

  const findPastClass = async () => {
    try {
      if (!profData.prof_id || !selectedSchoolYear || !selectedSchoolSemester || !selectedActiveSchoolYear) {
        setSnack({
          open: true,
          message: "Please select School Year and Semester first!",
          severity: "warning",
        });
        return;
      }

      const res = await axios.get(`${API_BASE_URL}/api/grading_sheet_bootstrap/${profData.prof_id}`, {
        params: {
          course_id: selectedCourse || undefined,
          department_section_id: selectedSectionID || undefined,
          active_school_year_id: selectedActiveSchoolYear,
        },
      });

      const data = res.data || {};
      const courses = Array.isArray(data.courses) ? data.courses : [];
      const sections = Array.isArray(data.sections) ? data.sections : [];
      const selectedCourseId = data.selectedCourse || courses[0]?.course_id || "";
      const selectedSectionId = data.selectedSection || sections[0]?.department_section_id || "";
      const fetchedStudents = Array.isArray(data.students) ? data.students : [];

      if (courses.length === 0) {
        setSectionsHandle([]);
        setStudents([]);
        setSnack({
          open: true,
          message: "No courses found for this period.",
          severity: "info",
        });
        return;
      }

      setCoursesAssignedTo(courses);
      setSectionsHandle(sections);

      if (sections.length === 0) {
        setStudents([]);
        setSnack({
          open: true,
          message: "No sections found for this course.",
          severity: "info",
        });
        return;
      }

      skipNextSectionFetchRef.current = true;
      skipNextStudentFetchRef.current = true;
      setSelectedCourse(selectedCourseId);
      setSelectedSectionID(selectedSectionId);
      setStudents(
        fetchedStudents.map((student) => ({
          ...withInitialSaveStatus(student),
          selectedCourse: selectedCourseId,
          department_section_id: selectedSectionId,
        })),
      );
      setMessage(fetchedStudents.length ? "" : "There are no currently enrolled students in this subject and section");
    } catch (err) {
      console.error("Error fetching past class data:", err);
      setSnack({
        open: true,
        message: "Failed to fetch data.",
        severity: "error",
      });
    }
  };

  // useMemo so stats only recompute when filteredStudents changes
  const gradeStats = useMemo(() =>
    filteredStudents.reduce(
      (acc, student) => {
        switch (student.en_remarks) {
          case 0: acc.noGrade += 1; break;
          case 1: acc.passed += 1; break;
          case 2: acc.failed += 1; break;
          case 3: acc.incomplete += 1; break;
          case 4: acc.drop += 1; break;
          default: break;
        }
        return acc;
      },
      { noGrade: 0, passed: 0, failed: 0, incomplete: 0, drop: 0 },
    ),
    [filteredStudents],
  );

  const hasGrades = useMemo(() =>
    students?.some((s) => {
      const mid = Number(s.midterm);
      const fin = Number(s.finals);
      return !isNaN(mid) && mid !== 0 && !isNaN(fin) && fin !== 0;
    }),
    [students],
  );

  const sanitizeFilePart = (value, fallback = "") => {
    const cleaned = String(value ?? "")
      .trim()
      .replace(/[\\/:*?"<>|]/g, "")
      .replace(/\s+/g, "");
    return cleaned || fallback;
  };

  const getGradingSheetBaseName = (record = students[0] || filteredStudents[0] || {}) => {
    const curriculumYear = sanitizeFilePart(record.year_level_description);
    const program = sanitizeFilePart(record.program_code, "Program");
    const section = sanitizeFilePart(record.section_description, "Section");
    return `${curriculumYear}${program}${section}_GradingSheet`;
  };

  const sortStudentsByNameAsc = (list = []) =>
    [...list].sort((a, b) => {
      const lastNameCompare = String(a.last_name || "").localeCompare(String(b.last_name || ""), undefined, { sensitivity: "base" });
      if (lastNameCompare !== 0) return lastNameCompare;

      const firstNameCompare = String(a.first_name || "").localeCompare(String(b.first_name || ""), undefined, { sensitivity: "base" });
      if (firstNameCompare !== 0) return firstNameCompare;

      return String(a.student_number || "").localeCompare(String(b.student_number || ""), undefined, { numeric: true });
    });

  const exportToExcel = async () => {
    const exportStudents = sortStudentsByNameAsc(filteredStudents.length ? filteredStudents : students);

    if (!exportStudents || exportStudents.length === 0) {
      setSnack({
        open: true,
        message: "No Students .",
        severity: "error",
      });
      return;
    }

    const firstRecord = exportStudents[0];
    const program = firstRecord.program_code || "PROGRAM";
    const section = firstRecord.section_description || "SECTION";
    const sheetTitle = `${program} - ${section} GRADING SHEET`;
    const fileName = `${getGradingSheetBaseName(firstRecord)}.xlsx`;

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([]);

    const styles = {
      title: {
        font: { bold: true, sz: 14, color: { rgb: "FFFFFF" } },
        fill: { fgColor: { rgb: "333333" } },
        alignment: { horizontal: "center", vertical: "center" },
      },
      header: {
        font: { bold: true, sz: 11 },
        fill: { fgColor: { rgb: "F2F2F2" } },
        alignment: { horizontal: "center", vertical: "center" },
        border: {
          top: { style: "thin" },
          bottom: { style: "thin" },
          left: { style: "thin" },
          right: { style: "thin" },
        },
      },
      cellCenter: {
        alignment: { horizontal: "center", vertical: "center" },
        border: {
          top: { style: "thin" },
          bottom: { style: "thin" },
          left: { style: "thin" },
          right: { style: "thin" },
        },
      },
      cellLeft: {
        alignment: { horizontal: "left", vertical: "center" },
        border: {
          top: { style: "thin" },
          bottom: { style: "thin" },
          left: { style: "thin" },
          right: { style: "thin" },
        },
      },
    };

    XLSX.utils.sheet_add_aoa(ws, [[sheetTitle]], { origin: "A1" });

    const headers = [
      ["#", "Student Number", "Student Name", "Midterm", "Finals"],
    ];
    XLSX.utils.sheet_add_aoa(ws, headers, { origin: "A3" });

    const dataRows = exportStudents.map((s, index) => [
      index + 1,
      s.student_number,
      `${s.last_name}, ${s.first_name} ${s.middle_name || ""}`.trim(),
      s.midterm || "",
      s.finals || "",
    ]);

    XLSX.utils.sheet_add_aoa(ws, dataRows, { origin: "A4" });

    ws["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 1, c: 4 } }];

    ws["!cols"] = [
      { wch: 5 },
      { wch: 15 },
      { wch: 40 },
      { wch: 10 },
      { wch: 10 },
    ];

    for (let r = 0; r <= 1; r++) {
      for (let c = 0; c <= 4; c++) {
        const ref = XLSX.utils.encode_cell({ r, c });
        if (!ws[ref]) ws[ref] = { t: "s", v: "" };
        ws[ref].s = styles.title;
      }
    }

    const headerRowIndex = 2;
    for (let c = 0; c <= 4; c++) {
      const ref = XLSX.utils.encode_cell({ r: headerRowIndex, c });
      ws[ref].s = styles.header;
    }

    const startDataRow = 3;
    const endDataRow = startDataRow + dataRows.length;

    for (let r = startDataRow; r < endDataRow; r++) {
      for (let c = 0; c <= 4; c++) {
        const ref = XLSX.utils.encode_cell({ r, c });
        if (!ws[ref]) continue;
        ws[ref].s = c === 2 ? styles.cellLeft : styles.cellCenter;
      }
    }

    XLSX.utils.book_append_sheet(wb, ws, "Grading Sheet");
    const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    saveAs(
      new Blob([wbout], { type: "application/octet-stream" }),
      fileName,
    );

    try {
      await postAuditEvent(
        "faculty_grading_sheet_exported",
        buildClassAuditDetails(firstRecord, {
          file_name: fileName,
          student_count: exportStudents.length,
        }),
      );
    } catch (err) {
      console.error("Error inserting audit log");
    }
  };

  const setRemarksFromRating = useCallback(
    (rating) => setRemarksFromRatingDynamic(rating, gradeConversions),
    [gradeConversions],
  );

  const hasGradeValue = (value) => {
    if (value === null || value === undefined) return false;
    const normalized = String(value).trim();
    return normalized !== "" && normalized !== "0" && normalized !== "0.00";
  };

  const isDropGrade = (value) =>
    ["DRP", "DROP"].includes(String(value ?? "").trim().toUpperCase());

  const isIncompleteGrade = (value) =>
    String(value ?? "").trim().toUpperCase() === "INC";

  const getGradeCompletionStatus = (student) => {
    const hasMidterm = hasGradeValue(student.midterm);
    const hasFinals = hasGradeValue(student.finals);

    if (student._saveStatus === "failed") return "Not Yet Graded";
    if (student._saveStatus !== "saved") return "Not Yet Graded";
    if (hasMidterm && hasFinals) return "Graded";
    if (hasMidterm || hasFinals) return "Partial Graded";
    return "Not Yet Graded";
  };

  const getStudentKey = (student) =>
    `${student.student_number}-${student.course_id || selectedCourse}-${student.department_section_id || selectedSectionID}`;

  const saveStudentGrade = useCallback(async (student, { silent = true } = {}) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/add_grades`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          midterm: student.midterm,
          finals: student.finals,
          final_grade: student.final_grade,
          en_remarks: student.en_remarks,
          student_number: student.student_number,
          subject_id: selectedCourse,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save grades");
      }

      setStudents((prev) =>
        prev.map((row) =>
          getStudentKey(row) === getStudentKey(student)
            ? { ...row, _saveStatus: "saved" }
            : row,
        ),
      );
      delete pendingDraftsRef.current[getStudentKey(student)];

      if (!silent) {
        setSnack({
          open: true,
          message: "Grades saved successfully!",
          severity: "success",
        });
      }

      try {
        await postAuditEvent("faculty_grading_sheet_grade_submitted", {
          ...buildGradeAuditDetails(student),
        });
      } catch (err) {
        console.error("Error inserting audit log");
      }
    } catch {
      setStudents((prev) =>
        prev.map((row) =>
          getStudentKey(row) === getStudentKey(student)
            ? { ...row, _saveStatus: "failed" }
            : row,
        ),
      );

      if (!silent) {
        setSnack({
          open: true,
          message: "Failed to save grades!",
          severity: "error",
        });
      }
    }
  }, [selectedCourse]);

  const withInitialSaveStatus = (student) => ({
    ...student,
    _saveStatus: hasGradeValue(student.midterm) || hasGradeValue(student.finals)
      ? "saved"
      : "idle",
  });

  const scheduleAutoSave = useCallback((student) => {
    const key = getStudentKey(student);
    pendingDraftsRef.current[key] = student;
    clearTimeout(autoSaveTimersRef.current[key]);
    autoSaveTimersRef.current[key] = setTimeout(() => {
      const latestDraft = pendingDraftsRef.current[key] || student;
      saveStudentGrade(latestDraft);
      delete autoSaveTimersRef.current[key];
    }, 600);
  }, [saveStudentGrade]);

  // Cleanup auto-save timers on unmount and flush pending drafts.
  useEffect(() => {
    return () => {
      const timers = autoSaveTimersRef.current;
      Object.values(timers).forEach(clearTimeout);

      const pendingDrafts = Object.values(pendingDraftsRef.current);
      pendingDrafts.forEach((draft) => {
        saveStudentGrade(draft, { silent: true });
      });
    };
  }, [saveStudentGrade]);

  // useCallback + functional setState so the reference stays stable across renders.
  // This is what allows React.memo on GradeSelect to actually skip re-renders.
  const handleChanges = useCallback((student, field, value) => {
    setStudents((prev) => {
      const index = prev.findIndex((row) => getStudentKey(row) === getStudentKey(student));
      if (index === -1) return prev;

      const updatedStudents = [...prev];
      updatedStudents[index] = { ...updatedStudents[index], [field]: value?.toUpperCase() };

      if (isDropGrade(value)) {
        if (field === "midterm") {
          updatedStudents[index].finals = "DROP";
        } else if (field === "finals") {
          updatedStudents[index].midterm = "DROP";
        }
      }

      const midterm = updatedStudents[index].midterm;
      const finals = updatedStudents[index].finals;

      updatedStudents[index].final_grade = finals;

      if (isDropGrade(midterm) || isDropGrade(finals)) {
        updatedStudents[index].en_remarks = 4;
      } else if (isIncompleteGrade(midterm) || isIncompleteGrade(finals)) {
        updatedStudents[index].en_remarks = 3;
      } else if (!hasGradeValue(finals)) {
        updatedStudents[index].en_remarks = 0;
      } else {
        const rating = convertRawToRatingDynamic(finals, gradeConversions);
        updatedStudents[index].en_remarks = setRemarksFromRatingDynamic(rating, gradeConversions);
      }

      updatedStudents[index]._saveStatus = "saving";
      scheduleAutoSave(updatedStudents[index]);
      return updatedStudents;
    });
  }, [gradeConversions, scheduleAutoSave]);

  const remarkConversion = (student) => {
    if (
      !isDropGrade(student.midterm) &&
      !isDropGrade(student.finals) &&
      !isIncompleteGrade(student.midterm) &&
      !isIncompleteGrade(student.finals) &&
      !hasGradeValue(student.finals)
    ) {
      return "ONGOING";
    }

    if (student.en_remarks === 0) {
      return "ONGOING";
    } else if (student.en_remarks === 1) {
      return "PASSED";
    } else if (student.en_remarks === 2) {
      return "FAILED";
    } else if (student.en_remarks === 3) {
      return "INCOMPLETE";
    } else if (student.en_remarks === 4) {
      return "DROPPED";
    } else {
      console.log("Error in Remark Conversion");
    }
  };

  function convertRawToRating(value) {
    return convertRawToRatingDynamic(value, gradeConversions);
  }

  const getProfessorDisplayName = () => {
    const middleInitial = profData.mname ? ` ${profData.mname[0]}.` : "";
    return `Prof. ${profData.fname || ""}${middleInitial} ${profData.lname || ""}`
      .replace(/\s+/g, " ")
      .trim();
  };

  const getStudentDisplayName = (student) =>
    `${student.first_name || ""} ${student.middle_name || ""} ${student.last_name || ""}`
      .replace(/\s+/g, " ")
      .trim();

  const getSelectedCourseRecord = () =>
    courseAssignedTo.find(
      (course) => String(course.course_id) === String(selectedCourse),
    );

  const getSubjectAuditDetails = (student = {}) => {
    const selectedCourseRecord = getSelectedCourseRecord();

    return {
      subject_name:
        student.course_description ||
        selectedCourseRecord?.course_description ||
        "N/A",
      subject_code:
        student.course_code ||
        student.course_code2 ||
        selectedCourseRecord?.course_code ||
        "",
    };
  };

  const buildClassAuditDetails = (student = {}, extraDetails = {}) => ({
    prof_id: profData.prof_id,
    employee_id: profData.employee_id,
    professor_name: getProfessorDisplayName(),
    course_id: selectedCourse,
    ...getSubjectAuditDetails(student),
    section_id: student.department_section_id || selectedSectionID,
    section_name:
      student.section_description ||
      sectionsHandle.find(
        (section) =>
          String(section.department_section_id) === String(selectedSectionID),
      )?.section_description ||
      "",
    program_code: student.program_code || "",
    school_year_id: selectedActiveSchoolYear,
    ...extraDetails,
  });

  const buildGradeAuditDetails = (student) => ({
    prof_id: profData.prof_id,
    employee_id: profData.employee_id,
    professor_name: getProfessorDisplayName(),
    student_name: getStudentDisplayName(student),
    student_number: student.student_number,
    course_id: selectedCourse,
    ...getSubjectAuditDetails(student),
    section_id: student.department_section_id || selectedSectionID,
    school_year_id: selectedActiveSchoolYear,
    midterm_grade: student.midterm,
    midterm_equivalent_grade: convertRawToRating(student.midterm),
    finalterm_grade: student.finals,
    finalterm_equivalent_grade: convertRawToRating(student.finals),
    final_grade: student.final_grade,
    final_equivalent_grade: convertRawToRating(student.final_grade),
    remarks: remarkConversion(student),
  });

  const handleSelectCourseChange = (event) => {
    setSelectedCourse(event.target.value);
    setSelectedSectionID("");
    setStudents([]);
  };

  const handleSnackClose = (_, reason) => {
    if (reason === "clickaway") return;
    setSnack((prev) => ({ ...prev, open: false }));
  };

  const handleImport = async () => {
    try {
      if (!selectedFile) {
        setSnack({
          open: true,
          message: "Please choose a file first!",
          severity: "warning",
        });
        return;
      }

      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("course_id", selectedCourse);
      formData.append("active_school_year_id", selectedActiveSchoolYear);
      formData.append("department_section_id", selectedSectionID);

      const res = await axios.post(
        `${API_BASE_URL}/api/grades/import`,
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        },
      );

      if (res.data.success) {
        try {
          await postAuditEvent("faculty_grading_sheet_upload_succeeded", {
            ...buildClassAuditDetails(students[0], {
              file_name: selectedFile.name,
              imported_count:
                res.data.imported_count ||
                res.data.updated_count ||
                res.data.count ||
                "",
              student_count: students.length,
            }),
          });
        } catch (err) {
          console.error("Error inserting audit log");
        }

        setSnack({
          open: true,
          message: res.data.message || "Excel imported successfully!",
          severity: "success",
        });
        setSelectedFile(null);

        if (sectionsHandle.length > 0) {
          handleFetchStudents(sectionsHandle[0].department_section_id);
        }
      } else {
        try {
          await postAuditEvent("faculty_grading_sheet_upload_tried", {
            ...buildClassAuditDetails(students[0], {
              file_name: selectedFile.name,
              error_message: res.data.error || "Failed to import",
            }),
          });
        } catch (err) {
          console.error("Error inserting audit log");
        }
        setSnack({
          open: true,
          message: res.data.error || "Failed to import",
          severity: "error",
        });
      }
    } catch (err) {
      console.error("Import Error");
      try {
        await postAuditEvent("faculty_grading_sheet_upload_failed", {
          ...buildClassAuditDetails(students[0], {
            file_name: selectedFile?.name || "N/A",
            error_message: err.response?.data?.error || err.message,
          }),
        });
      } catch (err) {
        console.error("Error inserting audit log");
      }
      setSnack({
        open: true,
        message: "Import failed: " + (err.response?.data?.error || err.message),
        severity: "error",
      });
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const totalPages = Math.max(1, Math.ceil(students.length / itemsPerPage));
  const selectedSchoolYearValue = schoolYears.some(
    (yearObj) => String(yearObj.year_id) === String(selectedSchoolYear),
  )
    ? selectedSchoolYear
    : "";
  const selectedSchoolSemesterValue = schoolSemester.some(
    (sem) => String(sem.semester_id) === String(selectedSchoolSemester),
  )
    ? selectedSchoolSemester
    : "";
  const selectedCourseValue = courseAssignedTo.some(
    (course) => String(course.course_id) === String(selectedCourse),
  )
    ? selectedCourse
    : "";
  const selectedSectionValue = sectionsHandle.some(
    (section) => String(section.department_section_id) === String(selectedSectionID),
  )
    ? selectedSectionID
    : "";

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const paginatedStudents = students.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  const handleSort = () => {
    const newOrder = sortOrder === "asc" ? "desc" : "asc";
    setSortOrder(newOrder);

    const sorted = [...students].sort((a, b) => {
      const nameA = a.last_name.toLowerCase();
      const nameB = b.last_name.toLowerCase();

      return newOrder === "asc"
        ? nameA.localeCompare(nameB)
        : nameB.localeCompare(nameA);
    });

    setStudents(sorted);
  };

  const handlePostStudentGrades = async () => {
    if (students.length === 0) {
      setSnack({
        open: true,
        message: "No students to post grades for!",
        severity: "warning",
      });
      return;
    }

    if (!profData.prof_id || !selectedCourse || !selectedSectionID || !selectedActiveSchoolYear) {
      setSnack({
        open: true,
        message: "Please select a subject, section, and school year first.",
        severity: "warning",
      });
      return;
    }

    setIsPostingGrades(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/post_student_grades`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...getAuditHeaders(),
        },
        body: JSON.stringify({
          professor_id: profData.prof_id,
          course_id: selectedCourse,
          department_section_id: selectedSectionID,
          active_school_year_id: selectedActiveSchoolYear,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setSnack({
          open: true,
          message: data.message || "Failed to post student grades.",
          severity: "error",
        });
        return;
      }

      setStudents((prev) =>
        prev.map((student) => ({ ...student, is_posted: 1 })),
      );

      try {
        await postAuditEvent(
          "faculty_grading_sheet_grades_posted",
          buildClassAuditDetails(students[0] || {}, {
            posted_count: data.posted_count ?? students.length,
            student_count: students.length,
          }),
        );
      } catch (err) {
        console.error("Error inserting audit log");
      }

      setSnack({
        open: true,
        message: data.message || "Student grades posted successfully!",
        severity: "success",
      });
      setPostDialogOpen(false);
    } catch (error) {
      console.error("Error posting student grades:", error);
      setSnack({
        open: true,
        message: "An error occurred while posting student grades.",
        severity: "error",
      });
    } finally {
      setIsPostingGrades(false);
    }
  };

  const downloadGradingSheetPdf = async () => {
    if (isGeneratingGradingPdf) return;

    const printStudents = sortStudentsByNameAsc(
      filteredStudents.length ? filteredStudents : students,
    );

    if (!printStudents.length) {
      window.alert("No students available to generate the Grading Sheet PDF.");
      return;
    }

    setIsGeneratingGradingPdf(true);

    try {
      const meta = printStudents[0] || {};
      const lecUnit = Number(meta.course_unit) || 0;
      const labUnit = Number(meta.lab_unit) || 0;
      const creditUnit = lecUnit + labUnit;
      const facultyName = [
        profData.fname,
        profData.mname ? `${String(profData.mname)[0]}.` : "",
        profData.lname,
      ]
        .filter(Boolean)
        .join(" ");

      const academicYearTerm = [
        meta.current_year && meta.next_year
          ? `${meta.current_year}-${meta.next_year}`
          : "",
        meta.semester_description || "",
      ]
        .filter(Boolean)
        .join(", ");

      const sessionParts = [
        meta.day || meta.session_day || "",
        meta.school_time_start && meta.school_time_end
          ? `${meta.school_time_start}-${meta.school_time_end}`
          : meta.session || "",
      ].filter(Boolean);
      const session = sessionParts.join(" - ");

      const datePostedRaw =
        meta.date_posted || meta.posted_at || meta.grade_posted_at || "";
      const datePosted = datePostedRaw
        ? new Date(datePostedRaw).toLocaleDateString("en-PH", {
            month: "2-digit",
            day: "2-digit",
            year: "2-digit",
          })
        : "";

      const printTimestamp = new Date().toLocaleString("en-PH", {
        month: "2-digit",
        day: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      });

      const logoDataUrl = await resolveLogoDataUrl(
        fetchedLogo || EaristLogo || "",
      );

      const classSection = `${meta.program_code || ""} ${meta.section_description || ""}`
        .replace(/\s+/g, " ")
        .trim();

      const footerCenter = `${meta.course_code || ""} - ${
        meta.course_description || "Grade Sheet"
      }`;

      const fileNamePrefix = getGradingSheetBaseName(meta);

      const innerHtml = `
        <style>${GRADING_REPORT_PRINT_CSS}</style>
        ${buildGradingReportPrintHtml({
          companyName,
          campusAddress: campusAddress || "Nagtahan St, Sampaloc, Manila",
          logoUrl: logoDataUrl,
          subjectCode: meta.course_code || "",
          subjectTitle: (meta.course_description || "").toUpperCase(),
          academicYearTerm,
          classSection,
          lecUnit: lecUnit.toFixed(1),
          labUnit: labUnit.toFixed(1),
          creditUnit: creditUnit.toFixed(1),
          session,
          facultyName,
          datePosted,
          collegeName: meta.dprtmnt_name || "",
          students: printStudents.map((student) =>
            mapStudentToGradingPrintRow(student, {
              convertRawToRating,
              remarkConversion,
            }),
          ),
          stats: gradeStats,
          printInfoLabel: printTimestamp,
        })}
      `;

      const response = await axios.post(
        `${API_BASE_URL}/api/generate-grading-sheet-pdf`,
        {
          html: innerHtml,
          footerLeft: printTimestamp,
          footerCenter,
          fileNamePrefix,
        },
        {
          responseType: "blob",
          headers: {
            "x-employee-id":
              profData.employee_id ||
              localStorage.getItem("employee_id") ||
              "",
          },
        },
      );

      const blobUrl = window.URL.createObjectURL(
        new Blob([response.data], { type: "application/pdf" }),
      );
      const link = document.createElement("a");
      link.href = blobUrl;
      link.setAttribute("download", `${fileNamePrefix}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(blobUrl);

      try {
        await postAuditEvent(
          "faculty_grading_sheet_exported",
          buildClassAuditDetails(meta, {
            file_name: `${fileNamePrefix}.pdf`,
            student_count: printStudents.length,
          }),
        );
      } catch (auditErr) {
        console.warn("Grading sheet PDF audit log failed:", auditErr);
      }
    } catch (err) {
      console.error("Failed to generate Grading Sheet PDF:", err);
      window.alert("Failed to generate Grading Sheet PDF. Please try again.");
    } finally {
      setIsGeneratingGradingPdf(false);
    }
  };

  // Disable right-click
  // document.addEventListener("contextmenu", (e) => e.preventDefault());

  // // Block DevTools shortcuts + Ctrl+P silently
  // document.addEventListener("keydown", (e) => {
  //   const isBlockedKey =
  //     e.key === "F12" ||
  //     e.key === "F11" ||
  //     (e.ctrlKey &&
  //       e.shiftKey &&
  //       (e.key.toLowerCase() === "i" || e.key.toLowerCase() === "j")) ||
  //     (e.ctrlKey && e.key.toLowerCase() === "u") ||
  //     (e.ctrlKey && e.key.toLowerCase() === "p");

  //   if (isBlockedKey) {
  //     e.preventDefault();
  //     e.stopPropagation();
  //   }
  // });

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
          width: "100%",
        }}
      >
        {/* LEFT SIDE — TITLE */}
        <Typography
          variant="h4"
          sx={{
            fontWeight: "bold",
            color: titleColor,
            fontSize: "36px",
          }}
        >
          GRADING SHEET
        </Typography>

        {/* RIGHT SIDE — SEARCH + PRINT */}
        <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
          <TextField
            size="small"
            placeholder="Search Student Number / Name"
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

          <button
            onClick={downloadGradingSheetPdf}
            disabled={isGeneratingGradingPdf}
            style={{
              width: "308px",
              padding: "10px 20px",
              border: "2px solid black",
              backgroundColor: "#f0f0f0",
              color: "black",
              borderRadius: "5px",
              cursor: isGeneratingGradingPdf ? "not-allowed" : "pointer",
              fontSize: "16px",
              fontWeight: "bold",
              opacity: isGeneratingGradingPdf ? 0.6 : 1,
              transition: "background-color 0.3s, transform 0.2s",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            onMouseEnter={(e) => {
              if (isGeneratingGradingPdf) return;
              e.currentTarget.style.backgroundColor = "#d3d3d3";
            }}
            onMouseLeave={(e) => {
              if (isGeneratingGradingPdf) return;
              e.currentTarget.style.backgroundColor = "#f0f0f0";
            }}
            onMouseDown={(e) => {
              if (isGeneratingGradingPdf) return;
              e.currentTarget.style.transform = "scale(0.95)";
            }}
            onMouseUp={(e) => {
              if (isGeneratingGradingPdf) return;
              e.currentTarget.style.transform = "scale(1)";
            }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <FcPrint size={20} />
              {isGeneratingGradingPdf
                ? "Generating PDF..."
                : "Download Grade Sheet"}
            </span>
          </button>
        </Box>
      </Box>

      <hr style={{ border: "1px solid #ccc", width: "100%" }} />

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
                >
                  {/* Left: Total Count */}
                  <Typography fontSize="14px" fontWeight="bold" color="white">
                    Total Students: {students.length}
                  </Typography>

                  {/* Right: Pagination Controls */}
                  <Box display="flex" alignItems="center" gap={1}>
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

                    {totalPages > 0 && (
                      <FormControl size="small" sx={{ minWidth: 80 }}>
                        <Select
                          value={currentPage <= totalPages ? currentPage : 1}
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
                    )}
                    <Typography fontSize="11px" color="white">
                      {totalPages} page{totalPages > 1 ? "s" : ""}
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

      <TableContainer
        component={Paper}
        sx={{
          width: "100%",
          border: `1px solid ${borderColor}`,
          p: 2,
        }}
      >
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 2,
          }}
        >
          {/* â”€â”€ LEFT: Course / Section / Sort + School Year + Semester + Find â”€â”€ */}
          <Box display="flex" flexDirection="column" gap={2}>

            

            {/* Course */}
            <Box display="flex" alignItems="center" gap={1}>
              <Typography fontSize={13} sx={{ minWidth: "100px" }}>Course:</Typography>
              <FormControl sx={{ width: "510px" }}>
                <InputLabel id="demo-simple-select-label">Course</InputLabel>
                <Select
                  labelId="demo-simple-select-label"
                  id="demo-simple-select"
                  value={selectedCourseValue}
                  label="Course"
                  onChange={handleSelectCourseChange}
                >
                  {courseAssignedTo.length > 0 ? (
                    courseAssignedTo.map((course) => (
                      <MenuItem value={course.course_id} key={course.course_id}>
                        {course.course_description} ({course.course_code})
                      </MenuItem>
                    ))
                  ) : (
                    <MenuItem value="" disabled>No courses assigned</MenuItem>
                  )}
                </Select>
              </FormControl>
            </Box>

            {/* Section */}
            <Box display="flex" alignItems="center" gap={1}>
              <Typography fontSize={13} sx={{ minWidth: "100px" }}>Section:</Typography>
              <FormControl sx={{ width: "510px" }}>
                <InputLabel id="section-select-label">Section</InputLabel>
                <Select
                  labelId="section-select-label"
                  label="Section"
                  value={selectedSectionValue}
                  onChange={(event) => setSelectedSectionID(event.target.value)}
                  disabled={!selectedCourse || sectionsHandle.length === 0}
                >
                  {!selectedCourse ? (
                    <MenuItem value="" disabled>Please select a course first</MenuItem>
                  ) : sectionsHandle.length > 0 ? (
                    sectionsHandle.map((section) => (
                      <MenuItem key={section.department_section_id} value={section.department_section_id}>
                        {section.program_code}-{section.section_description}
                      </MenuItem>
                    ))
                  ) : (
                    <MenuItem value="" disabled>No sections available for this course</MenuItem>
                  )}
                </Select>
              </FormControl>

              {/* Sort — beside Section */}
              <Button
                onClick={handleSort}
                variant="outlined"
                size="small"
                sx={{
                  minWidth: 100,
                  color: "white",
                  borderColor: "white",
                  backgroundColor: "transparent",
                  "&:hover": { borderColor: "white", backgroundColor: "rgba(65,64,64,0.1)" },
                }}
              >
                Sort: {sortOrder === "asc" ? "A–Z" : "Z–A"}
              </Button>
            </Box>

            {/* School Year + Semester + Find Last Grade — all in one row */}
            <Box display="flex" alignItems="center" gap={2}>
              <Typography fontSize={13} sx={{ minWidth: "90px" }}>School Year:</Typography>
              <FormControl sx={{ width: "210px" }}>
                <InputLabel id="school-year-label">School Year</InputLabel>
                <Select
                  labelId="school-year-label"
                  label="School Year"
                  value={selectedSchoolYearValue}
                  onChange={(e) => setSelectedSchoolYear(e.target.value)}
                  sx={{
                    fontSize: "13px",
                    color: "inherit",
                    ".MuiOutlinedInput-notchedOutline": { borderColor: "rgba(0,0,0,0.23)" },
                    "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "rgba(0,0,0,0.87)" },
                    "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: "primary.main" },
                    "& svg": { color: "inherit" },
                  }}
                  MenuProps={{ PaperProps: { sx: { maxHeight: 200, backgroundColor: "#fff" } } }}
                >
                  <MenuItem value="" disabled>Select School Year</MenuItem>
                  {schoolYears.map((yearObj) => (
                    <MenuItem key={yearObj.year_id} value={yearObj.year_id}>
                      {yearObj.current_year} - {yearObj.next_year}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <Typography fontSize={13} sx={{ minWidth: "90px" }}>Semester:</Typography>
              <FormControl sx={{ width: "180px" }}>
                <InputLabel id="semester-label">Semester</InputLabel>
                <Select
                  labelId="semester-label"
                  label="Semester"
                  value={selectedSchoolSemesterValue}
                  onChange={(e) => setSelectedSchoolSemester(e.target.value)}
                  sx={{
                    fontSize: "13px",
                    color: "inherit",
                    ".MuiOutlinedInput-notchedOutline": { borderColor: "rgba(0,0,0,0.23)" },
                    "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "rgba(0,0,0,0.87)" },
                    "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: "primary.main" },
                    "& svg": { color: "inherit" },
                  }}
                  MenuProps={{ PaperProps: { sx: { maxHeight: 200, backgroundColor: "#fff" } } }}
                >
                  <MenuItem value="" disabled>Select Semester</MenuItem>
                  {schoolSemester.map((sem) => (
                    <MenuItem key={sem.semester_id} value={sem.semester_id}>
                      {sem.semester_description}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <Button
                onClick={findPastClass}
                variant="outlined"
                size="small"
                sx={{
                  minWidth: 130,
                  color: "white",
                  borderColor: "white",
                  backgroundColor: "transparent",
                  "&:hover": { borderColor: "white", backgroundColor: "rgba(255,255,255,0.1)" },
                }}
              >
                Find Last Grade
              </Button>
            </Box>
          </Box>

          {/* â”€â”€ RIGHT: File upload + actions â”€â”€ */}
          <Box display="flex" flexDirection="column" gap={1.5} alignItems="flex-end" sx={{ minWidth: 260 }}>

            {/* Import Excel button */}
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              style={{ display: "none" }}
              id="excel-upload"
            />
            <button
              onClick={() => document.getElementById("excel-upload").click()}
              style={{
                border: "2px solid green",
                backgroundColor: "#f0fdf4",
                color: "green",
                borderRadius: "5px",
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: "bold",
                height: "50px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                justifyContent: "center",
                userSelect: "none",
                width: "100%",
              }}
              type="button"
            >
              <FaFileExcel size={20} />
              Import Excel
            </button>

            {/* File preview */}
            {selectedFile && (
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1.5,
                  border: "1px solid #bbf7d0",
                  backgroundColor: "#f0fdf4",
                  borderRadius: "8px",
                  padding: "8px 12px",
                  width: "100%",
                }}
              >
                <FaFileExcel size={24} color="#16a34a" />
                <Box flex={1} minWidth={0}>
                  <Typography sx={{ fontSize: 13, fontWeight: 600, color: "#14532d", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {selectedFile.name}
                  </Typography>
                  <Typography sx={{ fontSize: 11, color: "#15803d" }}>
                    {(selectedFile.size / 1024).toFixed(1)} KB
                  </Typography>
                </Box>
                <Button
                  size="small"
                  onClick={() => { setSelectedFile(null); document.getElementById("excel-upload").value = ""; }}
                  sx={{ fontSize: 11, color: "#15803d", border: "1px solid #86efac", borderRadius: "6px", textTransform: "none", minWidth: "unset", px: 1.5, flexShrink: 0 }}
                >
                  Remove
                </Button>
              </Box>
            )}

            {/* Upload button */}
            <Button
              variant="contained"
              disabled={!selectedFile}
              onClick={handleImport}
              sx={{
                height: "50px",
                width: "100%",
                backgroundColor: selectedFile ? "green" : undefined,
                "&:hover": { backgroundColor: "#166534" },
                fontWeight: "bold",
              }}
            >
              Upload
            </Button>

            {/* Divider */}
            <Box sx={{ width: "100%", borderTop: "1px solid #e0e0e0", my: 0.5 }} />

            {/* Post Student Grades */}
            <Button
              onClick={() => setPostDialogOpen(true)}
              variant="contained"
              color="primary"
              disabled={students.length === 0 || isPostingGrades}
              sx={{ width: "100%", height: "50px", fontSize: "15px", fontWeight: "bold", borderRadius: "5px" }}
            >
              Post Student Grades
            </Button>

            {/* Download Template */}
            <button
              onClick={exportToExcel}
              style={{
                padding: "5px 20px",
                border: "2px solid black",
                backgroundColor: "#f0f0f0",
                color: "black",
                borderRadius: "5px",
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: "bold",
                height: "50px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                width: "100%",
                justifyContent: "center",
              }}
            >
              <FaFileExcel size={18} color="green" />
              Download Template
            </button>

          </Box>
        </Box>
      </TableContainer>

      <TableContainer
        component={Paper}
        sx={{ width: "100%", marginTop: "2rem" }}
      >
        <Table size="small">
          {/* Header */}
          <TableHead
            sx={{ backgroundColor: headerColor }}
          >
            <TableRow>
              <TableCell
                sx={{
                  color: "white",
                  textAlign: "center",
                  fontSize: "12px",
                  border: `1px solid ${borderColor}`,
                }}
              >
                #
              </TableCell>
              <TableCell
                sx={{
                  color: "white",
                  textAlign: "center",
                  fontSize: "12px",
                  border: `1px solid ${borderColor}`,
                }}
              >
                Student Number
              </TableCell>
              <TableCell
                sx={{
                  color: "white",
                  textAlign: "center",
                  fontSize: "12px",
                  border: `1px solid ${borderColor}`,
                }}
              >
                Name
              </TableCell>
              <TableCell
                sx={{
                  color: "white",
                  textAlign: "center",
                  fontSize: "12px",
                  border: `1px solid ${borderColor}`,
                }}
              >
                Section
              </TableCell>
              <TableCell
                sx={{
                  color: "white",
                  textAlign: "center",
                  fontSize: "12px",
                  border: `1px solid ${borderColor}`,
                }}
              >
                Midterm
              </TableCell>
              <TableCell
                sx={{
                  color: "white",
                  textAlign: "center",
                  fontSize: "12px",
                  border: `1px solid ${borderColor}`,
                }}
              >
                Equivalent
              </TableCell>
              <TableCell
                sx={{
                  color: "white",
                  textAlign: "center",
                  fontSize: "12px",
                  border: `1px solid ${borderColor}`,
                }}
              >
                Finals
              </TableCell>
              <TableCell
                sx={{
                  color: "white",
                  textAlign: "center",
                  fontSize: "12px",
                  border: `1px solid ${borderColor}`,
                }}
              >
                Equivalent
              </TableCell>
              <TableCell
                sx={{
                  color: "white",
                  textAlign: "center",
                  fontSize: "12px",
                  border: `1px solid ${borderColor}`,
                }}
              >
                Final Grade
              </TableCell>
              <TableCell
                sx={{
                  color: "white",
                  textAlign: "center",
                  fontSize: "12px",
                  border: `1px solid ${borderColor}`,
                }}
              >
                Remarks
              </TableCell>
              <TableCell
                sx={{
                  color: "white",
                  textAlign: "center",
                  fontSize: "12px",
                  border: `1px solid ${borderColor}`,
                }}
              >
                Status
              </TableCell>
            </TableRow>
          </TableHead>

          {/* Body */}
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
            {message ? (
              <TableRow>
                <TableCell
                  colSpan={11}
                  sx={{
                    textAlign: "center",
                    padding: "1rem",
                    border: "1px solid gray",
                  }}
                >
                  {message}
                </TableCell>
              </TableRow>
            ) : (
              filteredStudents.map((student, index) => (
                <TableRow key={getStudentKey(student)}>
                  <TableCell
                    sx={{
                      textAlign: "center",
                      border: `1px solid ${borderColor}`,
                    }}
                  >
                    {index + 1}
                  </TableCell>
                  <TableCell
                    sx={{
                      textAlign: "center",
                      border: `1px solid ${borderColor}`,
                    }}
                  >
                    {student.student_number}
                  </TableCell>
                  <TableCell
                    sx={{ border: `1px solid ${borderColor}`, width: "350px" }}
                  >
                    {student.last_name}, {student.first_name}{" "}
                    {student.middle_name}
                  </TableCell>
                  <TableCell
                    sx={{
                      textAlign: "center",
                      border: `1px solid ${borderColor}`,
                    }}
                  >
                    {student.program_code}-{student.section_description}
                  </TableCell>
                  <TableCell sx={{ border: `1px solid ${borderColor}` }}>
                    <GradeSelect
                      value={student.midterm}
                      onChange={(val) => handleChanges(student, "midterm", val)}
                      placeholder="Enter grade"
                      disabled={!gradeEditScope.midtermOpen}
                    />
                  </TableCell>
                  <TableCell
                    sx={{
                      border: `1px solid ${borderColor}`,
                      textAlign: "center",
                    }}
                  >
                    {convertRawToRating(student.midterm)}
                  </TableCell>
                  <TableCell sx={{ border: `1px solid ${borderColor}` }}>
                    <GradeSelect
                      value={student.finals}
                      onChange={(val) => handleChanges(student, "finals", val)}
                      placeholder="Enter grade"
                      disabled={!gradeEditScope.finalsOpen}
                    />
                  </TableCell>
                  <TableCell
                    sx={{
                      border: `1px solid ${borderColor}`,
                      textAlign: "center",
                    }}
                  >
                    {convertRawToRating(student.finals)}
                  </TableCell>
                  <TableCell sx={{ border: `1px solid ${borderColor}` }}>
                    <input
                      type="text"
                      value={convertRawToRating(student.finals)}
                      readOnly
                      style={{
                        border: "none",
                        textAlign: "center",
                        background: "none",
                        outline: "none",
                        width: "100%",
                        fontFamily: "Poppins",
                      }}
                    />
                  </TableCell>
                  <TableCell sx={{ border: `1px solid ${borderColor}` }}>
                    <span
                      className="w-full inline-block text-center"
                      style={{ width: 100 }}
                    >
                      {remarkConversion(student)}
                    </span>
                  </TableCell>
                  <TableCell
                    sx={{
                      textAlign: "center",
                      border: `1px solid ${borderColor}`,
                    }}
                  >
                    <Box
                      component="span"
                      sx={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        minWidth: 110,
                        height: 32,
                        px: 1,
                        borderRadius: "6px",
                        fontSize: 12,
                        fontWeight: 700,
                        color: getGradeCompletionStatus(student) === "Graded" ? "#1B5E20" : getGradeCompletionStatus(student) === "Partial Graded" ? "#7A4F00" : "#6B7280",
                        backgroundColor: getGradeCompletionStatus(student) === "Graded" ? "#E8F5E9" : getGradeCompletionStatus(student) === "Partial Graded" ? "#FFF8E1" : "#F3F4F6",
                        border: `1px solid ${getGradeCompletionStatus(student) === "Graded" ? "#A5D6A7" : getGradeCompletionStatus(student) === "Partial Graded" ? "#FFE082" : "#D1D5DB"}`,
                      }}
                    >
                      {getGradeCompletionStatus(student)}
                    </Box>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog
        open={postDialogOpen}
        onClose={() => !isPostingGrades && setPostDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700 }}>Post Student Grades</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to post grades for{" "}
            <strong>{students.length}</strong> student{students.length === 1 ? "" : "s"} in this class?
            Once posted, students who have completed faculty evaluation will be able to view their grades.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => setPostDialogOpen(false)}
            disabled={isPostingGrades}
          >
            Cancel
          </Button>
          <Button
            onClick={handlePostStudentGrades}
            variant="contained"
            color="primary"
            disabled={isPostingGrades}
          >
            {isPostingGrades ? "Posting..." : "Confirm Post"}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snack.open}
        autoHideDuration={3000}
        onClose={handleSnackClose}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          severity={snack.severity}
          onClose={handleSnackClose}
          sx={{ width: "100%" }}
        >
          {snack.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default GradingSheet;
