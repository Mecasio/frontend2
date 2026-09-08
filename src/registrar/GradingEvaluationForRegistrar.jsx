import {
  Box,
  Typography,
  TextField,
  Snackbar,
  Alert,
  Autocomplete,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Button,
} from "@mui/material";
import React, { useState, useEffect, useContext, useRef } from "react";
import { SettingsContext } from "../App";
import EaristLogo from "../assets/EaristLogo.png";
import SearchIcon from "@mui/icons-material/Search";
import CloseIcon from "@mui/icons-material/Close";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import EditNoteIcon from "@mui/icons-material/EditNote";
import axios from "axios";
import { FcPrint } from "react-icons/fc";
import Unauthorized from "../components/Unauthorized";
import LoadingOverlay from "../components/LoadingOverlay";
import API_BASE_URL from "../apiConfig";
import { postAuditEvent } from "../utils/auditEvents";
import { getLoginMacPayload } from "../utils/userMacAddress";
import useAuditMac from "../utils/useAuditMac";
import RegistrarEnrollmentTabs from "../components/RegistrarEnrollmentTabs";

const cleanSuggestionValue = (value) => {
  if (value === null || value === undefined) return "";
  const text = String(value).trim();
  return ["null", "undefined"].includes(text.toLowerCase()) ? "" : text;
};

const formatSuggestionName = (student) =>
  [
    cleanSuggestionValue(student?.first_name),
    cleanSuggestionValue(student?.middle_name),
    cleanSuggestionValue(student?.last_name),
  ].filter(Boolean).join(" ");

const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const getOrdinalSuffix = (n) => {
  const v = n % 100;
  if (v >= 11 && v <= 13) return "th";
  switch (n % 10) {
    case 1: return "st";
    case 2: return "nd";
    case 3: return "rd";
    default: return "th";
  }
};

const formatYearLevelLabel = (yearLevelId) => {
  const n = Number(yearLevelId);
  if (!Number.isFinite(n) || n <= 0) return "";
  return `${n}${getOrdinalSuffix(n)} Year`;
};

const formatSemesterLabel = (semesterId) => {
  const n = Number(semesterId);
  if (!Number.isFinite(n) || n <= 0) return "";
  if (n === 3) return "Summer";
  return `${n}${getOrdinalSuffix(n)} Semester`;
};

// ── Default reminders shown the first time the page loads. These are now
//    editable at runtime via the "Edit Reminders" button/dialog below, so
//    this is only the initial seed value, not a hardcoded final list. ──────
const DEFAULT_IMPORTANT_REMINDERS = [
  "Please retain a copy of the Academic Program Evaluation. An additional copy will cost \u20B120 and will be released after 7 working days.",
  "If the 1st Semester subject grades are not yet included and there are any failing grades in the 1st Semester, it will be considered \u201Clacking\u201D and the subject must be retaken in the 2nd Semester.",
  "The last day for INC compliance for the 1st Semester is February 7, 2026. Failure to comply within the deadline will be considered as \u201Clacking\u201D.",
  "Failure to comply will result in the retake of the subject in the following semester.",
  "NSTP 1 & 2 components will be the same as CWTS 1 & CWTS 2.",
];

const REMINDERS_STORAGE_KEY = "program_evaluation_important_reminders";

const GradingEvaluationForRegistrar = () => {
  useAuditMac();
  const settings = useContext(SettingsContext);
  const colors = settings?.colors || {};
  const branding = settings?.branding || {};
  const assets = settings?.assets || {};
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

  // ── Grade conversion table fetched from backend ──────────────────────────
  const [gradeConversion, setGradeConversion] = useState([]);

  useEffect(() => {
    axios
      .get(`${API_BASE_URL}/api/admin/grade-conversion`)
      .then((res) => setGradeConversion(res.data))
      .catch((err) => {
        console.error("Failed to fetch grade conversions:", err);
        setGradeConversion([]);
      });
  }, []);

  // ── Important Reminders — editable via dialog, persisted in localStorage ─
  const [reminders, setReminders] = useState(() => {
    try {
      const stored = localStorage.getItem(REMINDERS_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (err) {
      console.error("Failed to load saved reminders:", err);
    }
    return DEFAULT_IMPORTANT_REMINDERS;
  });
  const [remindersDialogOpen, setRemindersDialogOpen] = useState(false);
  const [remindersDraft, setRemindersDraft] = useState([]);

  const openRemindersDialog = () => {
    setRemindersDraft(reminders.length > 0 ? [...reminders] : [""]);
    setRemindersDialogOpen(true);
  };

  const closeRemindersDialog = () => {
    setRemindersDialogOpen(false);
  };

  const handleReminderDraftChange = (index, value) => {
    setRemindersDraft((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  const handleAddReminderDraft = () => {
    setRemindersDraft((prev) => [...prev, ""]);
  };

  const handleRemoveReminderDraft = (index) => {
    setRemindersDraft((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSaveReminders = () => {
    const cleaned = remindersDraft.map((r) => r.trim()).filter(Boolean);
    setReminders(cleaned);
    try {
      localStorage.setItem(REMINDERS_STORAGE_KEY, JSON.stringify(cleaned));
    } catch (err) {
      console.error("Failed to save reminders:", err);
    }
    setRemindersDialogOpen(false);
  };

  // ── Convert a stored final_grade value to its display equivalent ─────────
  // Returns "" for null / undefined / 0 / "0" / "0.00"
  // Returns "INC" / "DRP" as-is
  // If the value is between 1–5 (rating scale), returns it formatted directly
  // Otherwise looks up in gradeConversion min_score/max_score table
  const handleGradeConversion = (grade) => {
    if (grade === null || grade === undefined || grade === "") return "";

    const normalizedGrade = String(grade).trim().toUpperCase();

    // Zero in any form → blank (currently enrolled / no grade yet)
    if (normalizedGrade === "0" || Number(normalizedGrade) === 0) return "";

    if (normalizedGrade === "INC") return "INC";
    if (normalizedGrade === "DROP" || normalizedGrade === "DRP") return "DRP";

    const numericGrade = Number(normalizedGrade);
    if (Number.isNaN(numericGrade)) return grade;

    // Already on the 1.0–5.0 rating scale — return as-is formatted
    if (numericGrade > 0 && numericGrade <= 5) {
      return Number.isInteger(numericGrade)
        ? String(numericGrade)
        : numericGrade.toFixed(2);
    }

    // Raw percentage — look up in conversion table
    const matchedConversion = gradeConversion.find((row) => {
      const minScore = Number(row.min_score);
      const maxScore = Number(row.max_score);
      return (
        Number.isFinite(minScore) &&
        Number.isFinite(maxScore) &&
        numericGrade >= minScore &&
        numericGrade <= maxScore
      );
    });

    if (!matchedConversion?.equivalent_grade) return grade;

    const equivalentGrade = Number(matchedConversion.equivalent_grade);
    return Number.isNaN(equivalentGrade)
      ? matchedConversion.equivalent_grade
      : equivalentGrade.toFixed(2);
  };

  // ── Sanitize grade input — only allow digits, one decimal point, INC, DRP ─
  const sanitizeGradeInput = (value) => {
    if (!value) return value;

    const upper = String(value).toUpperCase();

    // Allow INC / DRP keywords as typed
    if (upper === "INC" || upper === "DRP") return upper;

    // Allow partial typing of keywords
    if ("INC".startsWith(upper) || "DRP".startsWith(upper)) return upper;

    // Strip everything that is not a digit or decimal point
    const stripped = upper.replace(/[^0-9.]/g, "");

    // Only one decimal point allowed
    const parts = stripped.split(".");
    if (parts.length > 2) return parts[0] + "." + parts.slice(1).join("");

    return stripped;
  };

  // ── Allowed grade options — same as GradingSheet ─────────────────────────
  const gradeOptions = [
    ...Array.from({ length: 41 }, (_, i) => String(100 - i)), // "100" down to "60"
    "INC",
    "DRP",
  ];

  // ── Validate/clamp a grade value on blur or Enter ─────────────────────────
  const validateGradeInput = (rawValue) => {
    if (rawValue === null || rawValue === undefined) return "";

    let value = String(rawValue).trim().toUpperCase();

    if (/^INC/.test(value)) return "INC";
    if (/^DRP/.test(value)) return "DRP";

    // Gibberish letters → minimum passing
    if (/^[A-Z]+$/.test(value)) return "60";

    // Parse as float first to handle decimals like "99.99" → 99
    const parsed = parseFloat(value);
    if (isNaN(parsed)) return "60";

    // Truncate to integer — no decimals allowed in grade column
    let num = Math.trunc(parsed);
    if (num > 100) num = 100;
    if (num < 60) num = 60;

    return String(num);
  };

  // ── Autocomplete dropdown grade selector — mirrors GradingSheet ───────────
  const GradeSelect = ({ value, onChange, disabled = false }) => {
    const [inputValue, setInputValue] = React.useState(value ?? "");

    useEffect(() => {
      setInputValue(value ?? "");
    }, [value]);

    return (
      <Autocomplete
        freeSolo
        disableClearable
        disabled={disabled}
        options={gradeOptions}
        inputValue={inputValue}
        value={inputValue}
        onInputChange={(event, newInputValue, reason) => {
          if (reason === "input") {
            setInputValue(newInputValue.toUpperCase());
          }
        }}
        onChange={(event, newValue) => {
          if (newValue !== null) {
            const validated = validateGradeInput(newValue);
            setInputValue(validated);
            onChange(validated);
          }
        }}
        renderInput={(params) => (
          <TextField
            {...params}
            size="small"
            variant="outlined"
            onBlur={() => {
              const validated = validateGradeInput(inputValue);
              setInputValue(validated);
              onChange(validated);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                const validated = validateGradeInput(inputValue);
                setInputValue(validated);
                onChange(validated);
              }
            }}
            sx={{ textAlign: "center", width: "90px" }}
          />
        )}
        sx={{
          "& .MuiAutocomplete-inputRoot": {
            textAlign: "center",
            fontSize: "0.85rem",
          },
        }}
      />
    );
  };

  useEffect(() => {
    if (!settings) return;

    if (colors.title) setTitleColor(colors.title);
    if (colors.subtitle) setSubtitleColor(colors.subtitle);
    if (colors.border) setBorderColor(colors.border);
    if (colors.mainButton) setMainButtonColor(colors.mainButton);
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

  const words = companyName.trim().split(" ");
  const middle = Math.ceil(words.length / 2);
  const firstLine = words.slice(0, middle).join(" ");
  const secondLine = words.slice(middle).join(" ");

  useEffect(() => {
    if (branding.campusAddress) {
      setCampusAddress(branding.campusAddress);
    }
  }, [branding.campusAddress]);

  const [userID, setUserID] = useState("");
  const [user, setUser] = useState("");
  const [userRole, setUserRole] = useState("");
  const [studentData, setStudentData] = useState([]);
  const [studentNumber, setStudentNumber] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [studentSuggestions, setStudentSuggestions] = useState([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [studentDetails, setStudentDetails] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState("warning");
  const [gradeEdits, setGradeEdits] = useState({});
  const [isEditing, setIsEditing] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);

  const [hasAccess, setHasAccess] = useState(null);
  const [loading, setLoading] = useState(false);

  const pageId = 105;
  const [employeeID, setEmployeeID] = useState("");

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
        `${API_BASE_URL}/api/page_access/${employeeID}/${pageId}`
      );
      if (response.data && response.data.page_privilege === 1) {
        setHasAccess(true);
      } else {
        setHasAccess(false);
      }
    } catch (error) {
      console.error("Error checking access:", error);
      setHasAccess(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!searchQuery || searchQuery.length < 9) {
      setSelectedStudent(null);
      setStudentData([]);
      return;
    }

    const fetchStudent = async () => {
      try {
        const res = await fetch(
          `${API_BASE_URL}/api/program_evaluation/${searchQuery}`
        );
        const data = await res.json();

        if (data) {
          setSelectedStudent(data);
          setStudentData(data);

          const detailsRes = await fetch(
            `${API_BASE_URL}/api/program_evaluation/details/${searchQuery}`
          );
          const detailsData = await detailsRes.json();
          if (Array.isArray(detailsData) && detailsData.length > 0) {
            setStudentDetails(detailsData);
          } else {
            setStudentDetails([]);
            setSnackbarSeverity("warning");
            setSnackbarMessage("No enrolled subjects found for this student.");
            setOpenSnackbar(true);
          }
        } else {
          setSelectedStudent(null);
          setStudentData([]);
          setStudentDetails([]);
          setSnackbarSeverity("warning");
          setSnackbarMessage("No student data found.");
          setOpenSnackbar(true);
        }
      } catch (err) {
        console.error("Error fetching student", err);
        setSnackbarSeverity("error");
        setSnackbarMessage("Server error. Please try again.");
        setOpenSnackbar(true);
      }
    };

    fetchStudent();
  }, [searchQuery]);

  useEffect(() => {
    const query = studentNumber.trim();

    if (!suggestionsOpen || query.length < 2) {
      setStudentSuggestions([]);
      setSuggestionsLoading(false);
      return;
    }

    let cancelled = false;
    setSuggestionsLoading(true);

    const delayDebounce = setTimeout(async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/api/cor-student-suggestions`, {
          params: { query, limit: 10 },
        });

        if (!cancelled) {
          setStudentSuggestions(res.data || []);
        }
      } catch (err) {
        console.error("Failed to fetch Grading Evaluation student suggestions:", err);
        if (!cancelled) setStudentSuggestions([]);
      } finally {
        if (!cancelled) setSuggestionsLoading(false);
      }
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(delayDebounce);
    };
  }, [studentNumber, suggestionsOpen]);

  const handleSuggestionSelect = (suggestion) => {
    const nextStudentNumber = String(suggestion?.student_number || "");
    if (!nextStudentNumber) return;

    setStudentNumber(nextStudentNumber);
    setSearchQuery(nextStudentNumber);
    setSuggestionsOpen(false);
    setStudentSuggestions([]);
  };

  const handleGradeChange = async (courseId, value, studentNumber) => {
    // value already comes validated from GradeSelect's onChange
    setGradeEdits((prev) => ({ ...prev, [courseId]: value }));

    try {
      await axios.post(`${API_BASE_URL}/api/update-grade`, {
        final_grade: value,
        student_number: studentNumber,
        course_id: courseId,
        audit_actor_id:
          employeeID ||
          localStorage.getItem("employee_id") ||
          localStorage.getItem("email") ||
          "unknown",
        audit_actor_role: userRole || localStorage.getItem("role") || "registrar",
        ...getLoginMacPayload(),
      });

      try {
        await postAuditEvent("program_evaluation_grade_submitted");
      } catch (err) {
        console.error("Error inserting audit log");
      }
    } catch (error) {
      console.error("Failed to save grade:", error);
    }
  };

  const getLevelBySection = (section) => {
    if (!section) return null;
    const yearNumber = parseInt(section[0]);
    switch (yearNumber) {
      case 1: return "First Year";
      case 2: return "Second Year";
      case 3: return "Third Year";
      case 4: return "Fourth Year";
      case 5: return "Fifth Year";
      default: return "unknown";
    }
  };

  const toWholeUnit = (unit) => {
    const value = Number(unit);
    return Number.isFinite(value) ? Math.round(value) : 0;
  };

  const formatStudentName = (data = {}) => {
    const lastName = (data.last_name ?? "").toString().trim();
    const firstName = (data.first_name ?? "").toString().trim();
    const middleName = (data.middle_name ?? "").toString().trim();
    const givenNames = [firstName, middleName].filter(Boolean).join(" ");

    if (!lastName && !givenNames) return "";
    if (!lastName) return givenNames;
    if (!givenNames) return lastName;
    return `${lastName}, ${givenNames}`;
  };

  const formatCurriculumLabel = (data = {}) => {
    const parts = [
      (data.program_code ?? "").toString().trim(),
      (data.year_description ?? "").toString().trim(),
    ].filter(Boolean);

    if (!parts.length) return "";
    return `${parts.join(" ")} RP (ORIGINAL)`;
  };

  const totalLec = (course_unit) => toWholeUnit(course_unit);
  const totalLab = (lab_unit) => toWholeUnit(lab_unit);

  const groupedDetails = {};
  if (Array.isArray(studentDetails)) {
    studentDetails.forEach((item) => {
      const key = `${item.school_year}-${item.semester_description}`;
      if (!groupedDetails[key]) groupedDetails[key] = [];
      groupedDetails[key].push(item);
    });
  }

  const getSemesterBucket = (semesterDescription = "") => {
    const value = semesterDescription.toLowerCase();
    if (value.includes("second")) return "second";
    if (value.includes("summer") || value.includes("mid")) return "summer";
    if (value.includes("first")) return "first";
    return "other";
  };

  const printSemesterGroups = Object.entries(groupedDetails)
    .map(([key, courses]) => ({
      key,
      courses,
      bucket: getSemesterBucket(courses[0]?.semester_description),
      yearOrder: parseInt(String(courses[0]?.section || "")[0], 10) || 99,
    }))
    .sort((a, b) => a.yearOrder - b.yearOrder || a.key.localeCompare(b.key));

  const printLeftGroups = printSemesterGroups.filter((group) => group.bucket === "first" || group.bucket === "other");
  const printRightGroups = printSemesterGroups.filter((group) => group.bucket === "second");
  const printSummerGroups = printSemesterGroups.filter((group) => group.bucket === "summer");

  const renderPrintSemesterBlock = (group) => {
    const { key, courses } = group;
    return (
      <Box
        className="print-semester-block"
        style={{
          paddingLeft: "1rem",
          marginBottom: "0.75rem",
          boxSizing: "border-box",
          width: "100%",
          height: "fit-content",
        }}
        key={key}
      >
        <table style={{ height: "auto" }}>
          <thead>
            <tr>
              <td style={{ textAlign: "center" }}>{getLevelBySection(courses[0].section)} - {courses[0].semester_description}</td>
            </tr>
            <tr style={{ display: "flex", borderBottom: "solid 1px rgba(0,0,0,0.1)" }}>
              <td style={{ fontWeight: "700", display: "flex", alignItems: "center", justifyContent: "center", width: "6rem" }}>
                <span>GRADE</span>
              </td>
              <td style={{ fontWeight: "700", display: "flex", alignItems: "center", justifyContent: "center", width: "28rem" }}>
                <span>COURSE CODE / TITLE</span>
              </td>
              <td>
                <div style={{ margin: "-1px", fontWeight: "700", textAlign: "center", width: "5rem" }}>UNIT</div>
                <div style={{ display: "flex", alignItems: "center" }}>
                  <div style={{ fontWeight: "700", fontSize: "0.9rem", textAlign: "center", width: "50%" }}>
                    <span>LEC</span>
                  </div>
                  <div style={{ textAlign: "center", fontWeight: "700", fontSize: "0.9rem", width: "50%" }}>
                    <span>LAB</span>
                  </div>
                </div>
              </td>
            </tr>
          </thead>
          <tbody>
            {courses.map((p) => {
              const rawGrade = gradeEdits[p.course_id] ?? p.final_grade ?? "";
              const printableGrade = handleGradeConversion(rawGrade);

              return (
                <tr style={{ display: "flex", borderBottom: "solid 1px rgba(0,0,0,0.1)" }} key={p.enrolled_id}>
                  <td style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "6rem" }}>
                    <span>{printableGrade}</span>
                  </td>
                  <td className="print-course-cell" style={{ display: "flex", width: "28rem", alignItems: "flex-start", minWidth: 0 }}>
                    <span className="print-course-code" style={{ width: "100px", flexShrink: 0 }}>{p.course_code}</span>
                    <span
                      className="print-course-title"
                      style={{
                        margin: "0",
                        padding: "0",
                        whiteSpace: "normal",
                        overflowWrap: "break-word",
                        wordBreak: "normal",
                        lineHeight: 1.15,
                        flex: 1,
                        minWidth: 0,
                      }}
                    >
                      {p.course_description}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: "flex", alignItems: "center" }}>
                      <div style={{ fontSize: "0.9rem", width: "2.5rem", textAlign: "center" }}>
                        <span>{toWholeUnit(p.course_unit)}</span>
                      </div>
                      <div style={{ fontSize: "0.9rem", width: "2.5rem", textAlign: "center" }}>
                        <span>{toWholeUnit(p.lab_unit)}</span>
                      </div>
                    </div>
                  </td>
                </tr>
              );
            })}
            <tr style={{ display: "flex", fontWeight: "700" }}>
              <td style={{ width: "6rem" }}></td>
              <td style={{ width: "28rem", textAlign: "right", paddingRight: "1rem" }}></td>
              <td style={{ display: "flex", alignItems: "center" }}>
                <div style={{ fontSize: "0.9rem", width: "2.5rem", textAlign: "center" }}>
                  <span>{courses.reduce((sum, p) => sum + totalLec(p.course_unit), 0)}</span>
                </div>
                <div style={{ fontSize: "0.9rem", width: "2.5rem", textAlign: "center" }}>
                  <span>{courses.reduce((sum, p) => sum + totalLab(p.lab_unit), 0)}</span>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </Box>
    );
  };

  const divToPrintRef = useRef();

   const buildProgramEvaluationInnerHtml = () => {
    const logoSrc = fetchedLogo || EaristLogo;
    const name = companyName?.trim() || "";
    const nameWords = name.split(" ");
    const nameMiddle = Math.ceil(nameWords.length / 2);
    const fl = nameWords.slice(0, nameMiddle).join(" ");
    const sl = nameWords.slice(nameMiddle).join(" ");
    const resolvedCampusAddress = campusAddress || "No address set in Settings";

    const getSemesterBucketById = (semesterId) => {
      const n = Number(semesterId);
      if (n === 2) return "second";
      if (n === 3) return "summer";
      if (n === 1) return "first";
      return "other";
    };

    const semesterGroups = Object.entries(groupedDetails)
      .map(([key, courses]) => ({
        key,
        courses,
        bucket: getSemesterBucketById(courses[0]?.semester_id),
        yearOrder: Number(courses[0]?.year_level_id) || 99,
        semesterOrder: Number(courses[0]?.semester_id) || 99,
      }))
      .sort(
        (a, b) =>
          a.yearOrder - b.yearOrder ||
          a.semesterOrder - b.semesterOrder ||
          a.key.localeCompare(b.key),
      );

    const leftGroups = semesterGroups.filter(
      (g) => g.bucket === "first" || g.bucket === "other",
    );
    const rightGroups = semesterGroups.filter((g) => g.bucket === "second");
    const summerGroups = semesterGroups.filter((g) => g.bucket === "summer");

    const renderBlockHtml = (group) => {
      const { key, courses } = group;
      const first = courses[0] || {};
      const yearLabel =
        formatYearLevelLabel(first.year_level_id) ||
        first.year_level_description ||
        "";
      const semesterLabel =
        formatSemesterLabel(first.semester_id) ||
        first.semester_description ||
        "";
      const titleParts = [yearLabel, semesterLabel].filter(Boolean).join(" - ");

      const rowsHtml = courses
        .map((p) => {
          const rawGrade = gradeEdits[p.course_id] ?? p.final_grade ?? "";
          const printableGrade = handleGradeConversion(rawGrade);
          return `
            <tr class="pe-print-row">
              <td class="pe-col-grade">${escapeHtml(printableGrade)}</td>
              <td class="pe-col-course">
                <span class="pe-course-code">${escapeHtml(p.course_code)}</span>
                <span class="pe-course-title">${escapeHtml(p.course_description)}</span>
              </td>
              <td class="pe-col-unit">
                <div class="pe-unit-values">
                  <span>${toWholeUnit(p.course_unit)}</span>
                  <span>${toWholeUnit(p.lab_unit)}</span>
                </div>
              </td>
            </tr>`;
        })
        .join("");

      const totalLecUnits = courses.reduce(
        (sum, p) => sum + totalLec(p.course_unit),
        0,
      );
      const totalLabUnits = courses.reduce(
        (sum, p) => sum + totalLab(p.lab_unit),
        0,
      );

      return `
        <div class="pe-print-block" key="${escapeHtml(key)}">
          <table>
            <thead>
              <tr class="pe-print-header-row1">
                <td colspan="3" class="pe-print-block-title">${escapeHtml(titleParts)}</td>
              </tr>
              <tr class="pe-print-header-row2">
                <td class="pe-col-grade">GRADE</td>
                <td class="pe-col-course">COURSE CODE / TITLE</td>
                <td class="pe-col-unit">
                  <div class="pe-unit-label">UNIT</div>
                  <div class="pe-unit-sub"><span>LEC</span><span>LAB</span></div>
                </td>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
              <tr class="pe-print-totals-row">
                <td></td>
                <td class="pe-totals-label">Total</td>
                <td>
                  <div class="pe-unit-values">
                    <span>${totalLecUnits}</span>
                    <span>${totalLabUnits}</span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>`;
    };

    const leftBlocksHtml = leftGroups.map(renderBlockHtml).join("");
    const rightBlocksHtml = rightGroups.map(renderBlockHtml).join("");
    const summerBlocksHtml = summerGroups.map(renderBlockHtml).join("");

    // ── Reminders are now sourced from editable state instead of the old
    //    hardcoded IMPORTANT_REMINDERS constant. ────────────────────────────
    const remindersHtml = reminders
      .map((line) => `<li>${escapeHtml(line)}</li>`)
      .join("");

    return `
      <div class="pe-print-layout">
        <div class="pe-print-header-row">
          <div class="pe-print-logo-wrap">
            <img src="${logoSrc}" alt="School Logo" class="pe-print-logo" />
          </div>
          <div class="pe-print-header-text">
            <div style="font-size: 12px; font-family: Arial">Republic of the Philippines</div>
            ${
              companyName
                ? `<div class="pe-print-school-name">${escapeHtml(fl)}${sl ? `<br/>${escapeHtml(sl)}` : ""}</div>`
                : `<div style="height:24px;"></div>`
            }
            <div style="font-size: 12px; font-family: Arial">${escapeHtml(resolvedCampusAddress)}</div>
          </div>
        </div>

        <div class="pe-print-office-title">OFFICE OF THE REGISTRAR</div>
        <div class="pe-print-main-title">ACADEMIC PROGRAM EVALUATION</div>

        <div class="pe-print-student-info">
          <div class="row">
            <div class="col-wide">
              <span class="label">Student Name:</span>
              <span class="value">${escapeHtml(formatStudentName(studentData))}</span>
            </div>
            <div class="col">
              <span class="label label-narrow">College:</span>
              <span class="value">${escapeHtml(studentData.dprtmnt_name)}</span>
            </div>
          </div>
          <div class="row">
            <div class="col-wide">
              <span class="label">Student No. :</span>
              <span class="value">${escapeHtml(studentData.student_number)}</span>
            </div>
            <div class="col">
              <span class="label label-narrow">Program:</span>
              <span class="value">${escapeHtml(studentData.program_description)} ${escapeHtml(studentData.major || "")}</span>
            </div>
          </div>
          <div class="row">
            <span class="label">Curriculum:</span>
            <span class="value">${escapeHtml(formatCurriculumLabel(studentData))}</span>
          </div>
        </div>

        <div class="pe-print-semester-row">
          <div class="pe-print-semester-column">
            ${leftBlocksHtml}
          </div>
          <div class="pe-print-semester-column">
            ${rightBlocksHtml}
          </div>
        </div>

        ${summerBlocksHtml ? `<div class="pe-print-summer-row">${summerBlocksHtml}</div>` : ""}

        <div class="pe-print-reminders">
          <div class="pe-print-reminders-title">Important Reminders:</div>
          <ol>
            ${remindersHtml}
          </ol>
        </div>
      </div>
    `;
  };

  // ── Generate + download the Program Evaluation PDF ───────────────────────
  // Same pattern as handleExportApplicantListPdf: axios POST the inner HTML,
  // get back a blob, trigger a download link.
  const handleGeneratePdf = async () => {
    if (pdfLoading) return;

    if (!studentData?.student_number) {
      setSnackbarSeverity("warning");
      setSnackbarMessage("Please search for a student first.");
      setOpenSnackbar(true);
      return;
    }

    setPdfLoading(true);

    try {
      const innerHtml = buildProgramEvaluationInnerHtml();

      const response = await axios.post(
        `${API_BASE_URL}/api/generate-program-evaluation-pdf`,
        {
          html: innerHtml,
          student_number: studentData.student_number,
          last_name: studentData.last_name,
          first_name: studentData.first_name,
          audit_actor_id:
            employeeID ||
            localStorage.getItem("employee_id") ||
            localStorage.getItem("email") ||
            "unknown",
          audit_actor_role: userRole || localStorage.getItem("role") || "registrar",
        },
        { responseType: "blob" },
      );

      const blobUrl = window.URL.createObjectURL(
        new Blob([response.data], { type: "application/pdf" }),
      );
      const link = document.createElement("a");
      link.href = blobUrl;
      link.setAttribute(
        "download",
        `Program_Evaluation_${studentData.student_number}.pdf`,
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error("Failed to generate Program Evaluation PDF:", err);
      setSnackbarSeverity("error");
      setSnackbarMessage("Failed to generate Program Evaluation PDF.");
      setOpenSnackbar(true);
    } finally {
      setPdfLoading(false);
    }
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
    <Box sx={{ height: "calc(100vh - 150px)", overflowY: "auto", paddingRight: 1, backgroundColor: "transparent", mt: 1, padding: 2 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", mb: 2 }}>
        <Typography variant="h4" sx={{ fontWeight: "bold", color: titleColor, fontSize: "36px", background: "white", display: "flex", alignItems: "center" }}>
          PROGRAM EVALUATION
        </Typography>

        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Box sx={{ position: "relative", width: 450 }}>
            <TextField
              variant="outlined"
              placeholder="Search student number or name"
              size="small"
              value={studentNumber}
              onChange={(e) => {
                const nextValue = e.target.value;
                const trimmedValue = nextValue.trim();
                setStudentNumber(nextValue);
                setSearchQuery(/^\d/.test(trimmedValue) ? nextValue : "");
                setSuggestionsOpen(true);
              }}
              onFocus={() => {
                if (studentNumber.trim().length >= 2) setSuggestionsOpen(true);
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
            {suggestionsOpen && studentNumber.trim().length >= 2 && (
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
                {suggestionsLoading ? (
                  <Box sx={{ px: 2, py: 1.25, fontSize: 13, color: "#666" }}>
                    Searching...
                  </Box>
                ) : studentSuggestions.length > 0 ? (
                  studentSuggestions.map((suggestion) => {
                    const name = formatSuggestionName(suggestion);
                    return (
                      <Box
                        key={`${suggestion.student_number}-${suggestion.person_id}`}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          handleSuggestionSelect(suggestion);
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
                          "&:hover": {
                            backgroundColor: "#f5f7fb",
                          },
                        }}
                      >
                        <Typography sx={{ fontSize: 14, fontWeight: 700 }}>
                          {suggestion.student_number}
                        </Typography>
                        <Typography sx={{ fontSize: 14, color: "#555" }}>
                          |
                        </Typography>
                        <Typography sx={{ fontSize: 14 }} noWrap>
                          {name || "Unnamed Student"}
                        </Typography>
                      </Box>
                    );
                  })
                ) : (
                  <Box sx={{ px: 2, py: 1.25, fontSize: 13, color: "#666" }}>
                    No matching students found
                  </Box>
                )}
              </Box>
            )}
          </Box>
          <button
            onClick={handleGeneratePdf}
            disabled={pdfLoading}
            style={{
              padding: "5px 20px",
              border: "2px solid black",
              backgroundColor: "#f0f0f0",
              color: "black",
              borderRadius: "5px",
              cursor: pdfLoading ? "not-allowed" : "pointer",
              fontSize: "14px",
              fontWeight: "bold",
              opacity: pdfLoading ? 0.6 : 1,
              transition: "background-color 0.3s, transform 0.2s",
              height: "40px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              userSelect: "none",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.backgroundColor = "#d3d3d3")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.backgroundColor = "#f0f0f0")
            }
            onMouseDown={(e) =>
              (e.currentTarget.style.transform = "scale(0.95)")
            }
            onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
            type="button"
          >
            <FcPrint size={20} />
            {pdfLoading ? "Generating..." : "Download Program Evaluation"}
          </button>
        </Box>

      </Box>


      <hr style={{ border: "1px solid #ccc", width: "100%" }} />
      <br />
      <br />
      <RegistrarEnrollmentTabs />
      <br />
      <br />
      <Box sx={{ display: "flex", gap: 1.5, mb: 2 }}>
        <button
          onClick={() => setIsEditing(!isEditing)}
          style={{
            padding: "8px 12px", cursor: "pointer",
            fontWeight: "bold", backgroundColor: "#1976d2", color: "white",
            border: "none", borderRadius: "5px",
          }}
        >
          {isEditing ? "Cancel Editing" : "Edit Student Grade"}
        </button>

        <button
          onClick={openRemindersDialog}
          style={{
            padding: "8px 12px", cursor: "pointer",
            fontWeight: "bold", backgroundColor: "#ffffff", color: "#1976d2",
            border: "2px solid #1976d2", borderRadius: "5px",
            display: "flex", alignItems: "center", gap: "6px",
          }}
          type="button"
        >
          <EditNoteIcon fontSize="small" />
          Edit Reminders
        </button>
      </Box>

      <br />
      <style>
        {`
          .col-raw-grade { display: flex; }
          .col-raw-grade-header { display: flex; }
          .col-equivalent-grade { display: flex; }
          .col-equivalent-grade-header { display: flex; }
          .screen-only-label { display: inline; }
          .print-only-label { display: none; }
        `}
      </style>

      <Box>
        <Box
          className="print-container screen-evaluation-container"
          style={{
            backgroundColor: "#ffffff",
            border: "1px solid #b8b8b8",
            boxShadow: "0 6px 18px rgba(0, 0, 0, 0.14)",
            boxSizing: "border-box",
            minHeight: "297mm",
            padding: "12mm",
            margin: "-1rem auto 2rem",
            maxWidth: "84rem",
            width: "100%",
            overflowX: "auto",
          }}
          ref={divToPrintRef}
        >
          {/* ── School Header ─────────────────────────────────────────────── */}
          <Box
            style={{
              display: "grid",
              gridTemplateColumns: "8rem minmax(0, 1fr) 8rem",
              alignItems: "center",
              columnGap: "1.5rem",
              width: "48rem",
              maxWidth: "100%",
              margin: "0 auto",
            }}
          >
            <Box style={{ display: "flex", justifyContent: "center", paddingTop: "1.5rem" }}>
              <img
                src={fetchedLogo || EaristLogo}
                alt="School Logo"
                style={{ width: "8rem", height: "8rem", display: "block", objectFit: "cover", borderRadius: "50%" }}
              />
            </Box>

            <Box style={{ marginTop: "1.5rem" }}>
              <div colSpan={15} style={{ textAlign: "center", fontSize: "10px", lineHeight: "1.5" }}>
                <div style={{ fontFamily: "Arial", fontSize: "13px" }}>Republic of the Philippines</div>

                {companyName ? (() => {
                  const name = companyName.trim();
                  const ws = name.split(" ");
                  const mi = Math.ceil(ws.length / 2);
                  const fl = ws.slice(0, mi).join(" ");
                  const sl = ws.slice(mi).join(" ");
                  return (
                    <>
                      <Typography style={{ textAlign: "center", marginTop: "0rem", lineHeight: "1", fontSize: "1.6rem", letterSpacing: "-1px", fontWeight: "600" }}>
                        {fl} <br /> {sl}
                      </Typography>
                      {campusAddress && (
                        <Typography style={{ fontFamily: "Arial", fontSize: "13px" }}>
                          {campusAddress}
                        </Typography>
                      )}
                    </>
                  );
                })() : <div style={{ height: "24px" }}></div>}
              </div>
            </Box>
            <Box />
          </Box>

          <Box style={{ display: "flex", justifyContent: "center", width: "100%" }}>
            <Typography style={{ width: "100%", fontSize: "1.6rem", letterSpacing: "-1px", fontWeight: "500", textAlign: "center" }}>
              OFFICE OF THE REGISTRAR
            </Typography>
          </Box>

          <Box style={{ display: "flex", justifyContent: "center", width: "100%" }}>
            <Typography style={{ width: "100%", marginTop: "-0.2rem", fontSize: "1.8rem", letterSpacing: "-1px", fontWeight: "600", textAlign: "center" }}>
              ACADEMIC PROGRAM EVALUATION
            </Typography>
          </Box>

          {/* ── Student Info ──────────────────────────────────────────────── */}
          <Box style={{ display: "flex", width: "100%" }}>
            <Box style={{ width: "100%" }}>
              <Box
                sx={{
                  padding: "1rem",
                  borderBottom: "1px solid #000",
                  boxSizing: "border-box",
                  width: "100%",
                }}
              >
                <Box style={{ display: "flex" }}>
                  <Box style={{ display: "flex", width: "38rem" }}>
                    <Typography style={{ width: "9rem", fontSize: "1.05rem", letterSpacing: "-1px" }}>Student Name:</Typography>
                    <Typography style={{ fontSize: "1.06rem", fontWeight: "500" }}>
                      {formatStudentName(studentData)}
                    </Typography>
                  </Box>
                  <Box style={{ display: "flex" }}>
                    <Typography style={{ width: "6rem", fontSize: "1.05rem", letterSpacing: "-1px" }}>College:</Typography>
                    <Typography style={{ fontSize: "1.06rem", fontWeight: "500" }}>{studentData.dprtmnt_name}</Typography>
                  </Box>
                </Box>
                <Box style={{ display: "flex" }}>
                  <Box style={{ display: "flex", width: "38rem" }}>
                    <Typography style={{ width: "9rem", marginTop: "0.7rem", fontSize: "1.05rem", letterSpacing: "-1px" }}>Student No. :</Typography>
                    <Typography style={{ fontSize: "1.06rem", fontWeight: "500", marginTop: "0.7rem" }}>{studentData.student_number}</Typography>
                  </Box>
                  <Box style={{ display: "flex" }}>
                    <Typography style={{ width: "6rem", marginTop: "0.7rem", fontSize: "1.05rem", letterSpacing: "-1px" }}>Program:</Typography>
                    <Typography style={{ fontSize: "1.06rem", fontWeight: "500", marginTop: "0.7rem" }}>
                      {studentData.program_description} {studentData.major || ""}
                    </Typography>
                  </Box>
                </Box>
                <Box style={{ display: "flex" }}>
                  <Typography style={{ width: "9rem", marginTop: "0.7rem", fontSize: "1.05rem", letterSpacing: "-1px" }}>Curriculum:</Typography>
                  <Typography style={{ fontSize: "1.06rem", fontWeight: "500", marginTop: "0.7rem" }}>
                    {formatCurriculumLabel(studentData)}
                  </Typography>
                </Box>
              </Box>

              {/* ── Semester Blocks ──────────────────────────────────────── */}
              <Box style={{ display: "flex", flexWrap: "wrap" }}>
                {Object.entries(groupedDetails).map(([key, courses]) => (
                  <Box
                    style={{ paddingLeft: "1rem", marginBottom: "1rem", boxSizing: "border-box", width: "100%" }}
                    key={key}
                  >
                    <table style={{ width: "100%" }}>
                      <thead>
                        <tr>
                          <td style={{ textAlign: "center" }}>
                            {courses[0].year_level_description} {courses[0].semester_description}
                          </td>
                        </tr>
                        <tr style={{ display: "flex", borderBottom: "solid 1px rgba(0,0,0,0.1)" }}>
                          {/* CODE */}
                          <td style={{ fontWeight: "700", display: "flex", alignItems: "center", justifyContent: "center", width: "6rem" }}>
                            <span>CODE</span>
                          </td>
                          {/* DESCRIPTION */}
                          <td style={{ fontWeight: "700", display: "flex", alignItems: "center", justifyContent: "center", width: "28rem" }}>
                            <span>DESCRIPTION</span>
                          </td>
                          {/* PRE-REQUISITE */}
                          <td style={{ fontWeight: "700", display: "flex", alignItems: "center", justifyContent: "center", width: "10rem" }}>
                            <span>Pre-requisite</span>
                          </td>
                          {/* HRS/WK */}
                          <td>
                            <div style={{ margin: "-1px", fontWeight: "700", textAlign: "center", width: "5rem" }}>HRS/WK</div>
                            <div style={{ display: "flex", alignItems: "center" }}>
                              <div style={{ fontWeight: "700", fontSize: "0.9rem", textAlign: "center", width: "50%" }}><span>LEC</span></div>
                              <div style={{ textAlign: "center", fontWeight: "700", fontSize: "0.9rem", width: "50%" }}><span>LAB</span></div>
                            </div>
                          </td>
                          {/* UNITS */}
                          <td>
                            <div style={{ margin: "-1px", fontWeight: "700", textAlign: "center", width: "5rem" }}>UNITS</div>
                            <div style={{ display: "flex", alignItems: "center" }}>
                              <div style={{ fontWeight: "700", fontSize: "0.9rem", textAlign: "center", width: "50%" }}><span>LEC</span></div>
                              <div style={{ textAlign: "center", fontWeight: "700", fontSize: "0.9rem", width: "50%" }}><span>LAB</span></div>
                            </div>
                          </td>
                          {/* TOTAL UNITS */}
                          <td style={{ fontWeight: "700", display: "flex", alignItems: "center", justifyContent: "center", width: "6rem" }}>
                            <span>TOTAL <br /> UNITS</span>
                          </td>

                          {/* GRADE — raw input, screen only, hidden on print */}
                          <td className="col-raw-grade-header" style={{ fontWeight: "700", display: "flex", alignItems: "center", justifyContent: "center", width: "7rem" }}>
                            <span>GRADE</span>
                          </td>

                          {/* EQUIVALENT GRADE — shown on screen as "EQUIVALENT", shown on print as "GRADE" */}
                          <td className="col-equivalent-grade-header" style={{ fontWeight: "700", display: "flex", alignItems: "center", justifyContent: "center", width: "7rem" }}>
                            <span className="screen-only-label">EQUIVALENT</span>
                            <span className="print-only-label">GRADE</span>
                          </td>
                        </tr>
                      </thead>

                      <tbody>
                        {courses.map((p) => {
                          const rawGrade = gradeEdits[p.course_id] ?? p.final_grade ?? "";
                          const equivalentGrade = handleGradeConversion(rawGrade);

                          // Strip decimals for display in the GRADE column
                          // e.g. "99.99" → "99", "INC"/"DRP" pass through, "" stays ""
                          const displayGrade = (() => {
                            if (!rawGrade && rawGrade !== 0) return "";
                            const upper = String(rawGrade).trim().toUpperCase();
                            if (upper === "INC" || upper === "DRP" || upper === "") return upper;
                            const parsed = parseFloat(upper);
                            if (isNaN(parsed)) return upper;
                            return String(Math.trunc(parsed));
                          })();

                          return (
                            <tr style={{ display: "flex", borderBottom: `solid 1px ${borderColor}` }} key={p.enrolled_id}>
                              {/* Code */}
                              <td style={{ display: "flex", width: "6rem" }}>
                                <span style={{ width: "100px" }}>{p.course_code}</span>
                              </td>
                              {/* Description */}
                              <td style={{ display: "flex", width: "28rem" }}>
                                <span style={{ margin: "0", padding: "0", whiteSpace: "normal", lineHeight: 1.25 }}>{p.course_description}</span>
                              </td>
                              {/* Pre-req */}
                              <td style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "10rem" }}>
                                <span>None</span>
                              </td>
                              {/* HRS/WK */}
                              <td>
                                <div style={{ display: "flex", alignItems: "center" }}>
                                  <div style={{ fontSize: "0.9rem", width: "2.5rem", textAlign: "center" }}><span>{toWholeUnit(p.course_unit)}</span></div>
                                  <div style={{ fontSize: "0.9rem", width: "2.5rem", textAlign: "center" }}><span>{toWholeUnit(p.lab_unit)}</span></div>
                                </div>
                              </td>
                              {/* UNITS */}
                              <td>
                                <div style={{ display: "flex", alignItems: "center" }}>
                                  <div style={{ fontSize: "0.9rem", width: "2.5rem", textAlign: "center" }}><span>{toWholeUnit(p.course_unit)}</span></div>
                                  <div style={{ fontSize: "0.9rem", width: "2.5rem", textAlign: "center" }}><span>{toWholeUnit(p.lab_unit)}</span></div>
                                </div>
                              </td>
                              {/* Total Units */}
                              <td style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "6rem" }}>
                                {toWholeUnit(p.course_unit) + toWholeUnit(p.lab_unit)}
                              </td>

                              {/* GRADE — GradeSelect dropdown, screen only */}
                              <td className="col-raw-grade" style={{ display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", width: "7rem" }}>
                                <GradeSelect
                                  value={displayGrade}
                                  disabled={!isEditing}
                                  onChange={(val) =>
                                    handleGradeChange(p.course_id, val, studentData.student_number)
                                  }
                                />
                              </td>

                              {/* EQUIVALENT GRADE — read-only converted value, always visible */}
                              <td className="col-equivalent-grade" style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "7rem" }}>
                                <span style={{ width: "7rem", textAlign: "center", display: "block", fontSize: "0.9rem" }}>
                                  {equivalentGrade}
                                </span>
                              </td>
                            </tr>
                          );
                        })}

                        {/* Totals row */}
                        <tr style={{ display: "flex", fontWeight: "700", borderBottom: `solid 1px ${borderColor}`, borderRight: `solid 1px ${borderColor}`, borderLeft: `solid 1px ${borderColor}` }}>
                          <td style={{ display: "flex", justifyContent: "center", alignContent: "center", width: "44rem" }}>
                            <span>Total</span>
                          </td>
                          <td style={{ margin: 0, padding: 0 }}>
                            <div style={{ display: "flex", alignItems: "center", margin: 0, padding: 0 }}>
                              <div style={{ fontSize: "0.9rem", width: "2.5rem", textAlign: "center", borderLeft: `solid 1px ${borderColor}`, borderRight: `solid 1px ${borderColor}`, margin: 0, padding: 0 }}>
                                <span>{courses.reduce((sum, p) => sum + totalLec(p.course_unit), 0)}</span>
                              </div>
                              <div style={{ fontSize: "0.9rem", width: "2.5rem", textAlign: "center", borderRight: `solid 1px ${borderColor}`, margin: 0, padding: 0 }}>
                                <span>{courses.reduce((sum, p) => sum + totalLab(p.lab_unit), 0)}</span>
                              </div>
                            </div>
                          </td>
                          <td>
                            <div style={{ display: "flex", alignItems: "center" }}>
                              <div style={{ fontSize: "0.9rem", width: "2.5rem", textAlign: "center" }}>
                                <span>{courses.reduce((sum, p) => sum + totalLec(p.course_unit), 0)}</span>
                              </div>
                              <div style={{ fontSize: "0.9rem", width: "2.5rem", textAlign: "center" }}>
                                <span>{courses.reduce((sum, p) => sum + totalLab(p.lab_unit), 0)}</span>
                              </div>
                            </div>
                          </td>
                          <td style={{ display: "flex", alignItems: "center" }}>
                            <div style={{ fontSize: "0.9rem", width: "6rem", textAlign: "center" }}>
                              <span>{courses.reduce((sum, p) => sum + totalLec(p.course_unit) + totalLab(p.lab_unit), 0)}</span>
                            </div>
                          </td>
                          {/* Empty grade cells in totals row */}
                          <td className="col-raw-grade" style={{ width: "7rem" }}></td>
                          <td className="col-equivalent-grade" style={{ width: "7rem" }}></td>
                        </tr>

                        {/* Evaluator / Date / GWA / Status row */}
                        <tr style={{ display: "flex", gap: "1rem" }}>
                          <td style={{ display: "flex", gap: "1.5rem", width: "20rem" }}>
                            <div>Evaluator:</div><span></span>
                          </td>
                          <td style={{ display: "flex", gap: "1.5rem", width: "13rem" }}>
                            <div>Date:</div><span></span>
                          </td>
                          <td style={{ display: "flex", gap: "1.5rem", width: "13rem" }}>
                            <div>GWA:</div><span></span>
                          </td>
                          <td style={{ display: "flex", gap: "1.5rem", width: "15rem" }}>
                            <div>Status:</div><span></span>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </Box>
                ))}
              </Box>

              <Snackbar
                open={openSnackbar}
                autoHideDuration={4000}
                onClose={() => setOpenSnackbar(false)}
                anchorOrigin={{ vertical: "top", horizontal: "center" }}
              >
                <Alert onClose={() => setOpenSnackbar(false)} severity={snackbarSeverity} sx={{ width: "100%" }}>
                  {snackbarMessage}
                </Alert>
              </Snackbar>
            </Box>
          </Box>
        </Box>
      </Box>

      {/* ── Edit Important Reminders Dialog ─────────────────────────────── */}
      <Dialog
        open={remindersDialogOpen}
        onClose={closeRemindersDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle
          sx={{
            bgcolor: mainButtonColor || "#1976d2",
            color: "white",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          📝 Edit Important Reminders
          <IconButton
            onClick={closeRemindersDialog}
            sx={{
              color: "white",
              border: "2px solid rgba(255,255,255,0.6)",
              borderRadius: "50%",
              width: 40,
              height: 40,
              padding: 0,
              "&:hover": {
                backgroundColor: "rgba(255,255,255,0.2)",
                border: "2px solid white",
              },
            }}
          >
            <CloseIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </DialogTitle>

        <DialogContent dividers sx={{ p: 3 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            These reminders appear at the bottom of every generated Academic
            Program Evaluation. Edit, remove, or add new ones below.
          </Typography>

          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {remindersDraft.map((reminder, index) => (
              <Box key={index} sx={{ display: "flex", alignItems: "flex-start", gap: 1 }}>
                <TextField
                  fullWidth
                  multiline
                  minRows={2}
                  size="small"
                  label={`Reminder ${index + 1}`}
                  value={reminder}
                  onChange={(e) =>
                    handleReminderDraftChange(index, e.target.value)
                  }
                />
                <IconButton
                  onClick={() => handleRemoveReminderDraft(index)}
                  color="error"
                  sx={{ mt: 0.5 }}
                  disabled={remindersDraft.length <= 1}
                  title="Remove reminder"
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Box>
            ))}
          </Box>

          <Button
            onClick={handleAddReminderDraft}
            startIcon={<AddIcon />}
            variant="outlined"
            size="small"
            sx={{ mt: 2 }}
          >
            Add Reminder
          </Button>
        </DialogContent>

        <DialogActions sx={{ p: 2, justifyContent: "space-between" }}>
          <Button onClick={closeRemindersDialog} color="error" variant="outlined">
            Cancel
          </Button>
          <Button onClick={handleSaveReminders} variant="contained" color="success">
            Save Reminders
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default GradingEvaluationForRegistrar;
