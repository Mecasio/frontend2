// Search COR

import React, {
  useState,
  useEffect,
  useContext,
  useRef,
  useCallback,
} from "react";
import { SettingsContext } from "../App";
import axios from "axios";
import {
  Box,
  TextField,
  Typography,
  Table,
  TableHead,
  TableCell,
  TableRow,
  TableContainer,
  Paper,
  Snackbar,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  LinearProgress,
} from "@mui/material";
import "../styles/Print.css";
import CertificateOfRegistration from "../registrar/CertificateOfRegistrationForRegistrar";
import SearchIcon from "@mui/icons-material/Search";
import { FcPrint } from "react-icons/fc";
import { MdOutlinePayment } from "react-icons/md";
import { IoMdSchool } from "react-icons/io";
import { useLocation } from "react-router-dom";
import API_BASE_URL from "../apiConfig";
import Unauthorized from "../components/Unauthorized";
import LoadingOverlay from "../components/LoadingOverlay";
import StudentHistoryDialog from "../components/StudentHistoryDialog";
import RegistrarEnrollmentTabs from "../components/RegistrarEnrollmentTabs";
import { postAuditEvent } from "../utils/auditEvents";
import useAuditMac from "../utils/useAuditMac";
import EaristLogo from "../assets/EaristLogo.png";
import { filterSchoolYearsFromActive } from "../utils/schoolYearOptions";

const cleanAuditValue = (value) => {
  if (value === null || value === undefined) return "";
  const text = String(value).trim();
  return ["null", "undefined"].includes(text.toLowerCase()) ? "" : text;
};

const formatStudentAuditName = (student) =>
  [
    cleanAuditValue(student?.first_name),
    cleanAuditValue(student?.middle_name),
    cleanAuditValue(student?.last_name),
  ]
    .filter(Boolean)
    .join(" ") || "Unknown Student";

const formatSuggestionName = (student) =>
  [
    cleanAuditValue(student?.first_name),
    cleanAuditValue(student?.middle_name),
    cleanAuditValue(student?.last_name),
  ]
    .filter(Boolean)
    .join(" ");

const logCorSearchAudit = async (student, fallbackStudentNumber) => {
  try {
    await postAuditEvent("student_cor_searched", {
      student_name: formatStudentAuditName(student),
      student_number:
        cleanAuditValue(student?.student_number) ||
        cleanAuditValue(fallbackStudentNumber) ||
        "N/A",
    });
  } catch (err) {
    console.error("COR search audit failed:", err);
  }
};

// Small blob-download helper (same pattern used in CORExportingModule)
const downloadBlob = (blob, fileName) => {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
};

const SearchCertificateOfRegistration = () => {
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
  const [subButtonColor, setSubButtonColor] = useState("#ffffff"); // ✅ NEW
  const [stepperColor, setStepperColor] = useState("#000000"); // ✅ NEW

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
    if (colors.subButton) setSubButtonColor(colors.subButton); // ✅ NEW
    if (colors.stepper) setStepperColor(colors.stepper); // ✅ NEW

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
  }, [settings]);

  // Also put it at the very top
  const [userID, setUserID] = useState("");
  const [user, setUser] = useState("");
  const [userRole, setUserRole] = useState("");

  const [hasAccess, setHasAccess] = useState(null);
  const [loading, setLoading] = useState(false);
  const pageId = 56;

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
        `${API_BASE_URL}/api/page_access/${employeeID}/${pageId}`,
      );
      if (response.data && response.data.page_privilege === 1) {
        setHasAccess(true);
      } else {
        setHasAccess(false);
      }
    } catch (error) {
      console.error("Error checking access:", error);
      setHasAccess(false);
      if (error.response && error.response.data.message) {
        console.log(error.response.data.message);
      } else {
        console.log("An unexpected error occurred.");
      }
      setLoading(false);
    }
  };

  const location = useLocation();
  const REGISTRAR_COR_SEARCH_KEY = "registrar_cor_search_student_number";

  const [studentNumber, setStudentNumber] = useState(() => {
    return (
      sessionStorage.getItem(REGISTRAR_COR_SEARCH_KEY) ||
      localStorage.getItem("studentNumberForCOR") ||
      ""
    );
  });
  const [debouncedStudentNumber, setDebouncedStudentNumber] = useState("");
  const [studentSuggestions, setStudentSuggestions] = useState([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentData, setStudentData] = useState([]);
  const [studentDetails, setStudentDetails] = useState([]);
  const [corPreload, setCorPreload] = useState(null);
  const [corPreloadLoading, setCorPreloadLoading] = useState(false);
  const [schoolYears, setSchoolYears] = useState([]);
  const [schoolSemesters, setSchoolSemesters] = useState([]);
  const [selectedSchoolYear, setSelectedSchoolYear] = useState("");
  const [selectedSchoolSemester, setSelectedSchoolSemester] = useState("");
  const [selectedActiveSchoolYear, setSelectedActiveSchoolYear] = useState("");
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState("info");
  const showSnackbar = (message, severity = "info") => {
    setSnackbarMessage(message);
    setSnackbarSeverity(severity);
    setOpenSnackbar(true);
  };
  const handleCloseSnackbar = (_, reason) => {
    if (reason === "clickaway") return;
    setOpenSnackbar(false);
  };

  useEffect(() => {
    Promise.all([
      axios.get(`${API_BASE_URL}/api/get_school_year/`),
      axios.get(`${API_BASE_URL}/api/active_school_year`),
    ])
      .then(([yearsRes, activeRes]) => {
        const active =
          Array.isArray(activeRes.data) && activeRes.data.length > 0
            ? activeRes.data[0]
            : null;
        setSchoolYears(
          filterSchoolYearsFromActive(yearsRes.data || [], active),
        );
        if (active) {
          setSelectedSchoolYear(active.year_id);
          setSelectedSchoolSemester(active.semester_id);
        }
      })
      .catch((err) => console.error(err));

    axios
      .get(`${API_BASE_URL}/api/get_school_semester/`)
      .then((res) => setSchoolSemesters(res.data || []))
      .catch((err) => console.error(err));
  }, []);

  useEffect(() => {
    if (!selectedSchoolYear || !selectedSchoolSemester) {
      setSelectedActiveSchoolYear("");
      return;
    }

    axios
      .get(
        `${API_BASE_URL}/api/get_selecterd_year/${selectedSchoolYear}/${selectedSchoolSemester}`,
      )
      .then((res) => {
        if (Array.isArray(res.data) && res.data.length > 0) {
          setSelectedActiveSchoolYear(res.data[0].school_year_id);
        } else {
          setSelectedActiveSchoolYear("");
          showSnackbar(
            "No academic term found for the selected year/semester.",
            "warning",
          );
        }
      })
      .catch((err) => {
        console.error(err);
        setSelectedActiveSchoolYear("");
      });
  }, [selectedSchoolYear, selectedSchoolSemester]);

  useEffect(() => {
    const trimmed = studentNumber.trim();
    if (trimmed) {
      sessionStorage.setItem(REGISTRAR_COR_SEARCH_KEY, trimmed);
      sessionStorage.setItem("edit_student_number", trimmed);
    }
  }, [studentNumber]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const studentNumberFromUrl = params.get("student_number")?.trim();
    const personIdFromUrl = params.get("person_id")?.trim();

    if (studentNumberFromUrl) {
      setStudentNumber(studentNumberFromUrl);
      sessionStorage.setItem(REGISTRAR_COR_SEARCH_KEY, studentNumberFromUrl);
      sessionStorage.setItem("edit_student_number", studentNumberFromUrl);
      return;
    }

    if (!personIdFromUrl) return;

    setStudentNumber("");
    setDebouncedStudentNumber("");
    setSelectedStudent(null);
    setStudentData([]);
    setStudentDetails([]);
    setCorPreload(null);

    axios
      .get(`${API_BASE_URL}/api/student-person-data/${personIdFromUrl}`)
      .then((res) => {
        const resolvedStudentNumber = res.data?.student_number;
        if (resolvedStudentNumber) {
          setStudentNumber(resolvedStudentNumber);
          sessionStorage.setItem("edit_person_id", personIdFromUrl);
          sessionStorage.setItem("edit_student_number", resolvedStudentNumber);
          sessionStorage.setItem(
            REGISTRAR_COR_SEARCH_KEY,
            resolvedStudentNumber,
          );
        } else {
          showSnackbar(
            "No student number found for the selected person.",
            "warning",
          );
        }
      })
      .catch((err) => {
        console.error("Auto COR search failed:", err);
        showSnackbar(
          "Unable to load student number for the selected person.",
          "error",
        );
      });
  }, [location.search]);

  useEffect(() => {
    if (!debouncedStudentNumber || debouncedStudentNumber.length < 5) {
      setSelectedStudent(null);
      setStudentData([]);
      setCorPreload(null);
      setCorPreloadLoading(false);
      return;
    }

    if (!selectedActiveSchoolYear) {
      setCorPreload(null);
      return;
    }

    const fetchStudent = async () => {
      try {
        setCorPreload(null);
        setCorPreloadLoading(true);

        const [res, preloadRes] = await Promise.all([
          fetch(
            `${API_BASE_URL}/api/program_evaluation/${debouncedStudentNumber}`,
          ),
          axios
            .post(
              `${API_BASE_URL}/api/student-tagging`,
              {
                studentNumber: debouncedStudentNumber,
                active_school_year_id: selectedActiveSchoolYear,
              },
              { headers: { "Content-Type": "application/json" } },
            )
            .catch((err) => {
              console.error("COR preload failed:", err);
              showSnackbar(
                err.response?.data?.message ||
                  "No COR found for the selected academic term.",
                "warning",
              );
              return null;
            }),
        ]);

        setCorPreload(preloadRes?.data || null);

        // Match the first function's response handling
        if (!res.ok) {
          const errorBody = await res.json().catch(() => null);

          setSelectedStudent(null);
          setStudentData([]);
          setStudentDetails([]);

          showSnackbar(
            errorBody?.message ||
              "No enrolled-subject summary found. COR can still be generated from student record.",
            "info",
          );
          return;
        }

        const data = await res.json();

        console.log("Fetched student data:", data);

        if (data) {
          setSelectedStudent(data);
          setStudentData(data);

          await logCorSearchAudit(data, debouncedStudentNumber);

          // Same success snackbar as the first function
          showSnackbar("Student found successfully.", "success");

          const detailsRes = await fetch(
            `${API_BASE_URL}/api/program_evaluation/details/${debouncedStudentNumber}`,
          );
          const detailsData = await detailsRes.json();

          if (Array.isArray(detailsData) && detailsData.length > 0) {
            setStudentDetails(detailsData);
          } else {
            setStudentDetails([]);
            showSnackbar(
              "No enrolled subjects found for this student.",
              "info",
            );
          }
        } else {
          setSelectedStudent(null);
          setStudentData([]);
          setStudentDetails([]);
          setCorPreload(null);

          showSnackbar("No student data found.", "info");
        }
      } catch (err) {
        console.error("Error fetching student", err);
        setCorPreload(null);

        showSnackbar("Server error. Please try again.", "error");
      } finally {
        setCorPreloadLoading(false);
      }
    };

    fetchStudent();
  }, [debouncedStudentNumber, selectedActiveSchoolYear]);

  const divToPrintRef = useRef();
  const corPaymentActionsRef = useRef(null);
  const [paymentActionsState, setPaymentActionsState] = useState({
    disabled: false,
    ready: false,
    unifastLabel: "Save to Unifast",
    matriculationLabel: "Save Matriculation",
  });

  const handlePaymentActionsChange = useCallback((nextState) => {
    setPaymentActionsState((current) => {
      const next = {
        disabled: Boolean(nextState.disabled),
        ready: Boolean(nextState.ready),
        unifastLabel: nextState.unifastLabel || "Save to Unifast",
        matriculationLabel:
          nextState.matriculationLabel || "Save Matriculation",
      };

      if (
        current.disabled === next.disabled &&
        current.ready === next.ready &&
        current.unifastLabel === next.unifastLabel &&
        current.matriculationLabel === next.matriculationLabel
      ) {
        return current;
      }

      return next;
    });
  }, []);

  // --- Job-based PDF generation (same pipeline as CORExportingModule) ---
  const [pdfLoading, setPdfLoading] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportStatus, setExportStatus] = useState("");

  const handleGeneratePdf = async () => {
    if (pdfLoading) return;

    if (!debouncedStudentNumber) {
      showSnackbar("Please search for a student first.", "warning");
      return;
    }

    setPdfLoading(true);
    setExportProgress(0);
    setExportStatus("Starting export...");

    try {
      // corPreload comes from POST /api/student-tagging and typically
      // carries person_id2 as the person identifier.
      const personId =
        corPreload?.person_id2 ||
        corPreload?.person_id ||
        selectedStudent?.person_id ||
        "";

      // 1) Create the export job
      const startRes = await axios.post(`${API_BASE_URL}/api/cor-export/jobs`, {
        students: [
          {
            student_number: debouncedStudentNumber,
            person_id: personId,
            preload: corPreload || null,
          },
        ],
        file_name: `${debouncedStudentNumber}_Certificate_Of_Registration`,
        frontend_origin: window.location.origin,
      });

      const jobId = startRes.data?.job_id;
      if (!jobId) throw new Error("Server did not return an export job id.");

      // 2) Poll status until done/error
      let job = null;
      while (true) {
        await new Promise((resolve) => setTimeout(resolve, 500));
        const statusRes = await axios.get(
          `${API_BASE_URL}/api/cor-export/jobs/${jobId}`,
        );
        job = statusRes.data;

        setExportProgress(Number(job.progress || 0));
        setExportStatus(job.message || "Processing export...");

        if (job.status === "done") break;
        if (job.status === "error") {
          throw new Error(job.error || "Server export failed.");
        }
      }

      // 3) Download the finished PDF
      setExportStatus("Downloading PDF...");
      const downloadRes = await axios.get(
        `${API_BASE_URL}/api/cor-export/jobs/${jobId}/download`,
        { responseType: "blob" },
      );

      downloadBlob(
        downloadRes.data,
        job?.file_name ||
          `${debouncedStudentNumber}_Certificate_Of_Registration.pdf`,
      );

      setExportProgress(100);
      setExportStatus("Download complete.");
      showSnackbar("Certificate PDF generated successfully.", "success");
    } catch (err) {
      console.error("Generate PDF error:", err);
      showSnackbar(err.message || "PDF generation failed", "error");
    } finally {
      setPdfLoading(false);
      setExportProgress(0);
      setExportStatus("");
    }
  };

  useEffect(() => {
    const trimmed = studentNumber.trim();
    if (trimmed.length < 5) {
      setDebouncedStudentNumber("");
      return;
    }

    const delayDebounce = setTimeout(() => {
      setDebouncedStudentNumber(trimmed);
    }, 500);

    return () => clearTimeout(delayDebounce);
  }, [studentNumber]);

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
        const res = await axios.get(
          `${API_BASE_URL}/api/cor-student-suggestions`,
          {
            params: { query, limit: 10 },
          },
        );

        if (!cancelled) {
          setStudentSuggestions(res.data || []);
        }
      } catch (err) {
        console.error("Failed to fetch COR student suggestions:", err);
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
    setDebouncedStudentNumber(nextStudentNumber);
    setSuggestionsOpen(false);
    setStudentSuggestions([]);
  };

  useEffect(() => {
    if (studentNumber) {
      localStorage.removeItem("studentNumberForCOR");
    }
  }, [studentNumber]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      sessionStorage.removeItem(REGISTRAR_COR_SEARCH_KEY);
      localStorage.removeItem("studentNumberForCOR");
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);

  const paymentButtonsDisabled =
    paymentActionsState.disabled ||
    !debouncedStudentNumber ||
    !paymentActionsState.ready;

  const actionButtonStyle = (disabled) => ({
    marginBottom: "1rem",
    padding: "10px 20px",
    border: "2px solid black",
    backgroundColor: "#f0f0f0",
    color: "black",
    borderRadius: "5px",
    marginTop: "20px",
    cursor: disabled ? "not-allowed" : "pointer",
    fontSize: "16px",
    fontWeight: "bold",
    opacity: disabled ? 0.6 : 1,
    transition: "background-color 0.3s, transform 0.2s",
  });

  const handleSaveToUnifastClick = () => {
    if (paymentButtonsDisabled) return;
    corPaymentActionsRef.current?.openUnifastConfirm();
  };

  const handleSaveToMatriculationClick = () => {
    if (paymentButtonsDisabled) return;
    corPaymentActionsRef.current?.openScholarshipModal();
  };

  // Put this at the very bottom before the return
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
          }}
        >
          SEARCH CERTIFICATE OF REGISTRATION
        </Typography>

        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1.5,
            flexWrap: "wrap",
          }}
        >
          <Box sx={{ position: "relative", width: 450 }}>
            <TextField
              variant="outlined"
              placeholder="Search student number or name"
              size="small"
              value={studentNumber}
              onChange={(e) => {
                setStudentNumber(e.target.value);
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
          <StudentHistoryDialog
            studentNumber={debouncedStudentNumber || studentNumber}
            buttonColor={mainButtonColor}
          />
        </Box>
      </Box>

      <hr style={{ border: "1px solid #ccc", width: "100%" }} />
      <br />
      <br />

      <RegistrarEnrollmentTabs />

      <br />

      <br />
      <TableContainer component={Paper} sx={{ width: "100%" }}>
        <Table>
          <TableHead
            sx={{
              backgroundColor: headerColor,
              border: `1px solid ${borderColor}`,
            }}
          >
            <TableRow>
              {/* Left cell: Student Number */}
              <TableCell
                sx={{
                  color: "white",
                  fontSize: "20px",
                  fontFamily: "Poppins, sans-serif",
                  border: "none",
                }}
              >
                Student Number:&nbsp;
                <span
                  style={{
                    fontFamily: "Poppins, sans-serif",
                    fontWeight: "normal",
                    textDecoration: "underline",
                  }}
                >
                  {studentData.student_number || "N/A"}
                </span>
              </TableCell>

              {/* Right cell: Student Name */}
              <TableCell
                align="right"
                sx={{
                  color: "white",
                  fontSize: "20px",
                  fontFamily: "Poppins, sans-serif",
                  border: "none",
                }}
              >
                Student Name:&nbsp;
                <span
                  style={{
                    fontFamily: "Poppins, sans-serif",
                    fontWeight: "normal",
                    textDecoration: "underline",
                  }}
                >
                  {studentData && studentData.last_name
                    ? `${studentData.last_name?.toUpperCase()}, ${studentData.first_name?.toUpperCase()} ${studentData.middle_name?.toUpperCase() || ""}`
                    : "N/A"}
                </span>
              </TableCell>
            </TableRow>
          </TableHead>
        </Table>
      </TableContainer>
      <TableContainer
        component={Paper}
        sx={{ width: "100%", border: `1px solid ${borderColor}`, mb: 2 }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            p: 2,
            flexWrap: "wrap",
          }}
        >
          <Box display="flex" alignItems="center" gap={1}>
            <Typography fontSize={13} sx={{ minWidth: "90px" }}>
              School Year:
            </Typography>
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel>School Year</InputLabel>
              <Select
                value={selectedSchoolYear}
                label="School Year"
                onChange={(e) => setSelectedSchoolYear(e.target.value)}
              >
                {schoolYears.length > 0 ? (
                  schoolYears.map((sy) => (
                    <MenuItem value={sy.year_id} key={sy.year_id}>
                      {sy.current_year} - {sy.next_year}
                    </MenuItem>
                  ))
                ) : (
                  <MenuItem disabled>No school years found</MenuItem>
                )}
              </Select>
            </FormControl>
          </Box>

          <Box display="flex" alignItems="center" gap={1}>
            <Typography fontSize={13} sx={{ minWidth: "80px" }}>
              Semester:
            </Typography>
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel>Semester</InputLabel>
              <Select
                value={selectedSchoolSemester}
                label="Semester"
                onChange={(e) => setSelectedSchoolSemester(e.target.value)}
              >
                {schoolSemesters.length > 0 ? (
                  schoolSemesters.map((sem) => (
                    <MenuItem value={sem.semester_id} key={sem.semester_id}>
                      {sem.semester_description}
                    </MenuItem>
                  ))
                ) : (
                  <MenuItem disabled>No semesters found</MenuItem>
                )}
              </Select>
            </FormControl>
          </Box>
        </Box>
      </TableContainer>

      <Box display="flex" alignItems="center" gap={2} flexWrap="wrap">
        <button
          onClick={handleGeneratePdf}
          disabled={pdfLoading || !debouncedStudentNumber}
          style={actionButtonStyle(pdfLoading || !debouncedStudentNumber)}
          onMouseEnter={(e) =>
            (e.currentTarget.style.backgroundColor = "#d3d3d3")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.backgroundColor = "#f0f0f0")
          }
          onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.95)")}
          onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
        >
          <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <FcPrint size={20} />
            {pdfLoading ? "Generating..." : "Generate Certificate PDF"}
          </span>
        </button>

        <button
          onClick={handleSaveToUnifastClick}
          disabled={paymentButtonsDisabled}
          style={actionButtonStyle(paymentButtonsDisabled)}
          onMouseEnter={(e) =>
            (e.currentTarget.style.backgroundColor = "#d3d3d3")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.backgroundColor = "#f0f0f0")
          }
          onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.95)")}
          onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
        >
          <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <MdOutlinePayment size={20} />
            {paymentActionsState.unifastLabel}
          </span>
        </button>

        <button
          onClick={handleSaveToMatriculationClick}
          disabled={paymentButtonsDisabled}
          style={actionButtonStyle(paymentButtonsDisabled)}
          onMouseEnter={(e) =>
            (e.currentTarget.style.backgroundColor = "#d3d3d3")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.backgroundColor = "#f0f0f0")
          }
          onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.95)")}
          onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
        >
          <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <IoMdSchool size={20} />
            {paymentActionsState.matriculationLabel}
          </span>
        </button>
      </Box>

      <div
        ref={divToPrintRef}
        style={{
          transform: "scale(0.9)", // 👈 10% zoom out
          transformOrigin: "top center", // keeps it centered
        }}
      >
        <CertificateOfRegistration
          ref={corPaymentActionsRef}
          key={`${debouncedStudentNumber}-${selectedActiveSchoolYear || "none"}`}
          student_number={
            selectedActiveSchoolYear && (corPreload || !corPreloadLoading)
              ? debouncedStudentNumber
              : ""
          }
          activeSchoolYearId={selectedActiveSchoolYear || undefined}
          preload={corPreload}
          onPaymentActionsChange={handlePaymentActionsChange}
          onNotify={({ message, severity }) => showSnackbar(message, severity)}
        />
      </div>

      <Snackbar
        open={openSnackbar}
        autoHideDuration={4000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbarSeverity}
          variant="filled"
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default SearchCertificateOfRegistration;
