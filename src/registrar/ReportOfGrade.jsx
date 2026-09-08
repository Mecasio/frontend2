import { Box, Typography, TextField, Snackbar, Alert, FormControl, InputLabel, Select, MenuItem, Paper, TableContainer, Table, TableHead, TableBody, TableRow, TableCell } from "@mui/material";
import React, { useState, useEffect, useContext, useRef } from "react";
import { flushSync } from "react-dom";
import { SettingsContext } from "../App";
import EaristLogo from "../assets/EaristLogo.png";
import { Search } from "@mui/icons-material";
import axios from 'axios';
import Unauthorized from "../components/Unauthorized";
import LoadingOverlay from "../components/LoadingOverlay";
import RegistrarEnrollmentTabs from "../components/RegistrarEnrollmentTabs";
import SearchIcon from "@mui/icons-material/Search";
import { FcPrint } from "react-icons/fc";
import { useLocation } from "react-router-dom";
import API_BASE_URL from "../apiConfig";
import { getFlatAuditHeaders } from "../utils/auditEvents";
import { filterSchoolYearsFromActive } from "../utils/schoolYearOptions";

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

const ReportOfGrade = () => {
    const settings = useContext(SettingsContext);
  const colors = settings?.colors || {};
  const branding = settings?.branding || {};
  const assets = settings?.assets || {};
  const headerColor = colors.header || "#1976d2";
    const location = useLocation();

    const [titleColor, setTitleColor] = useState("#000000");
    const [subtitleColor, setSubtitleColor] = useState("#555555");
    const [borderColor, setBorderColor] = useState("#000000");
    const [mainButtonColor, setMainButtonColor] = useState("#1976d2");
    const [subButtonColor, setSubButtonColor] = useState("#ffffff");   // ✅ NEW
    const [stepperColor, setStepperColor] = useState("#000000");       // ✅ NEW

    const [fetchedLogo, setFetchedLogo] = useState(null);
    const [companyName, setCompanyName] = useState("");
    const [shortTerm, setShortTerm] = useState("");
    const [branches, setBranches] = useState([]);
    const [gradeConversion, setGradeConversions] = useState([]);

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
            setFetchedLogo(EaristLogo);
        }

        // 🏷️ School Information
        if (branding.companyName) setCompanyName(branding.companyName);
        if (branding.shortTerm) setShortTerm(branding.shortTerm);
        setBranches(settings?.branches || []);

    }, [settings]);

    const words = companyName.trim().split(" ");
    const middle = Math.ceil(words.length / 2);
    const firstLine = words.slice(0, middle).join(" ");
    const secondLine = words.slice(middle).join(" ");

    const [campusAddress, setCampusAddress] = useState("");

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
    const [schoolYears, setSchoolYears] = useState([]);
    const [schoolSemester, setSchoolSemester] = useState([]);
    const [selectedSchoolYear, setSelectedSchoolYear] = useState('');
    const [selectedSchoolSemester, setSelectedSchoolSemester] = useState('');
    const [selectedActiveSchoolYear, setSelectedActiveSchoolYear] = useState('');

    const currentStudent = Array.isArray(studentData) ? studentData[0] : studentData;
    const currentStudentCampus = currentStudent?.campus;
    const studentFullName =
        currentStudent?.last_name && currentStudent?.first_name
            ? `${currentStudent.last_name}, ${currentStudent.first_name}${currentStudent.middle_name ? ` ${currentStudent.middle_name}` : ""}`
            : "";

    useEffect(() => {
        if (!settings) return;

        const branchId = currentStudentCampus;
        const matchedBranch = branches.find(
            (branch) => String(branch?.id) === String(branchId),
        );

        if (matchedBranch?.address) {
            setCampusAddress(matchedBranch.address);
            return;
        }

        if (branding.campusAddress) {
            setCampusAddress(branding.campusAddress);
            return;
        }

        setCampusAddress(branding.campusAddress || "");
    }, [
        settings,
        branches,
        currentStudentCampus,
        branding.campusAddress,
    ]);

    // Auto-fill/search from URL person_id or student_number (same pattern as Search COR)
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const studentNumberFromUrl = params.get("student_number")?.trim();
        const personIdFromUrl = params.get("person_id")?.trim();

        if (!studentNumberFromUrl && !personIdFromUrl) return;

        let cancelled = false;

        const applyStudentNumber = (resolvedStudentNumber) => {
            if (cancelled || !resolvedStudentNumber) return;
            setSearchQuery(resolvedStudentNumber);
            sessionStorage.setItem("edit_student_number", resolvedStudentNumber);
        };

        const skipAutoSearchForInactiveTerm = async () => {
            const listYearId = sessionStorage.getItem("edit_list_year_id");
            const listSemesterId = sessionStorage.getItem("edit_list_semester_id");

            // Only gate auto-search when the student was picked under a specific list term.
            if (!listYearId || !listSemesterId) return false;

            try {
                const res = await axios.get(`${API_BASE_URL}/api/active_school_year`);
                const active =
                    Array.isArray(res.data) && res.data.length > 0 ? res.data[0] : null;
                if (!active) return false;

                const sameYear = String(active.year_id) === String(listYearId);
                const sameSemester = String(active.semester_id) === String(listSemesterId);
                if (sameYear && sameSemester) return false;

                setSearchQuery("");
                setSelectedStudent(null);
                setStudentData([]);
                setStudentDetails([]);
                setSnackbarMessage(
                    "Selected student is from a different school year/semester than the active term. Search manually if needed.",
                );
                setOpenSnackbar(true);
                return true;
            } catch (err) {
                console.error("Failed to verify active school year for auto-search:", err);
                return false;
            }
        };

        const runAutoSearch = async () => {
            const shouldSkip = await skipAutoSearchForInactiveTerm();
            if (cancelled || shouldSkip) return;

            if (studentNumberFromUrl) {
                applyStudentNumber(studentNumberFromUrl);
                return;
            }

            setSearchQuery("");
            setSelectedStudent(null);
            setStudentData([]);
            setStudentDetails([]);

            try {
                const res = await axios.get(
                    `${API_BASE_URL}/api/student-person-data/${personIdFromUrl}`,
                );
                if (cancelled) return;
                const resolvedStudentNumber = res.data?.student_number;
                if (resolvedStudentNumber) {
                    applyStudentNumber(resolvedStudentNumber);
                    sessionStorage.setItem("edit_person_id", personIdFromUrl);
                } else {
                    setSnackbarMessage("No student number found for the selected person.");
                    setOpenSnackbar(true);
                }
            } catch (err) {
                console.error("Auto Report of Grades search failed:", err);
                setSnackbarMessage("Unable to load student number for the selected person.");
                setOpenSnackbar(true);
            }
        };

        runAutoSearch();
        return () => {
            cancelled = true;
        };
    }, [location.search]);

    const [hasAccess, setHasAccess] = useState(null);
    const [loading, setLoading] = useState(false);


    const pageId = 50;

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
            const response = await axios.get(`${API_BASE_URL}/api/page_access/${employeeID}/${pageId}`);
            if (response.data && response.data.page_privilege === 1) {
                setHasAccess(true);
            } else {
                setHasAccess(false);
            }
        } catch (error) {
            console.error('Error checking access:', error);
            setHasAccess(false);
            if (error.response && error.response.data.message) {
                console.log(error.response.data.message);
            } else {
                console.log("An unexpected error occurred.");
            }
            setLoading(false);
        }
    };




    useEffect(() => {
        const storedUser = localStorage.getItem("email");
        const storedRole = localStorage.getItem("role");
        const storedID = localStorage.getItem("person_id");

        if (storedUser && storedRole && storedID) {
            setUser(storedUser);
            setUserRole(storedRole);
            setUserID(storedID);

            if (storedRole !== "registrar") {
                window.location.href = "/login";
            } else {
                console.log("Hello")
            }
        } else {
            window.location.href = "/login";
        }
    }, []);

    useEffect(() => {
        if (!searchQuery || searchQuery.length < 9) {
            setSelectedStudent(null);
            setStudentData([]);
            return;
        }

        const fetchStudent = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/api/program_evaluation/${searchQuery}`);
                const data = await res.json();

                if (data) {
                    setSelectedStudent(data);
                    setStudentData(data);

                    if (data[0]?.student_number) {
                        localStorage.setItem("admin_edit_person_id", data[0].student_number);
                        setSearchQuery(data[0].student_number);
                    }

                    const detailsRes = await fetch(`${API_BASE_URL}/api/program_evaluation/details/${searchQuery}`);
                    const detailsData = await detailsRes.json();

                    if (Array.isArray(detailsData) && detailsData.length > 0) {
                        setStudentDetails(detailsData);
                    } else {
                        setStudentDetails([]);
                        setSnackbarMessage("No enrolled subjects found for this student.");
                        setOpenSnackbar(true);
                    }
                } else {
                    setSelectedStudent(null);
                    setStudentData([]);
                    setStudentDetails([]);
                    setSnackbarMessage("No student data found.");
                    setOpenSnackbar(true);
                }
            } catch (err) {
                console.error("Error fetching student", err);
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
                console.error("Failed to fetch Report of Grades student suggestions:", err);
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
                setSchoolYears(filterSchoolYearsFromActive(yearsRes.data || [], active));
                if (active) {
                    setSelectedSchoolYear(active.year_id);
                    setSelectedSchoolSemester(active.semester_id);
                }
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
        if (selectedSchoolYear && selectedSchoolSemester) {
            axios
                .get(`${API_BASE_URL}/api/get_selecterd_year/${selectedSchoolYear}/${selectedSchoolSemester}`)
                .then((res) => {
                    if (res.data.length > 0) {
                        setSelectedActiveSchoolYear(res.data[0].school_year_id);
                    }
                })
                .catch((err) => console.error(err));
        }
    }, [selectedSchoolYear, selectedSchoolSemester]);

    useEffect(() => {
        fetchGradeConversionDic();
    }, [])

    const fetchGradeConversionDic = async () => {
        try {
            const res = await axios.get(`${API_BASE_URL}/api/admin/grade-conversion`);
            setGradeConversions(res.data);

            console.log("Fetching Successfully");
        } catch (err) {
            setGradeConversions([]);
            console.log("Error Fetching Data", fallbackErr);
        }
    };

    const handleSchoolYearChange = (event) => {
        setSelectedSchoolYear(event.target.value);
    };

    const handleSchoolSemesterChange = (event) => {
        setSelectedSchoolSemester(event.target.value);
    };

    const handleGradeConversion = (grade) => {
        if (grade === null || grade === undefined || grade === "") return "";

        const normalizedGrade = String(grade).trim().toUpperCase();

        if (normalizedGrade === "0" || Number(normalizedGrade) === 0) return "";
        if (normalizedGrade === "INC") return "INC";
        if (normalizedGrade === "DROP" || normalizedGrade === "DRP") return "DRP";

        const numericGrade = Number(normalizedGrade);
        if (Number.isNaN(numericGrade)) return grade;

        if (numericGrade > 0 && numericGrade <= 5) {
            return Number.isInteger(numericGrade)
                ? String(numericGrade)
                : numericGrade.toFixed(2);
        }

        const findMatchingConversion = (score) => gradeConversion.find((row) => {
            const minScore = Number(row.min_score);
            const maxScore = Number(row.max_score);

            return (
                Number.isFinite(minScore) &&
                Number.isFinite(maxScore) &&
                score >= minScore &&
                score <= maxScore
            );
        });

        const matchedConversion =
            findMatchingConversion(numericGrade) ||
            findMatchingConversion(Math.round(numericGrade));

        if (!matchedConversion?.equivalent_grade) {
            return grade;
        }

        const equivalentGrade = Number(matchedConversion.equivalent_grade);
        return Number.isNaN(equivalentGrade)
            ? matchedConversion.equivalent_grade
            : equivalentGrade.toFixed(2);
    };

    const getConvertedFinalGrade = (subject) => {
        if (subject?.numeric_grade !== null && subject?.numeric_grade !== undefined && subject?.numeric_grade !== "") {
            return handleGradeConversion(subject.numeric_grade);
        }

        return handleGradeConversion(subject?.final_grade);
    };

    const getConvertedFinalGradeNumber = (subject) => {
        const convertedGrade = getConvertedFinalGrade(subject);
        const numericGrade = Number(convertedGrade);
        return Number.isFinite(numericGrade) && numericGrade > 0 ? numericGrade : null;
    };

    const getGradePointAverage = (subjects) => {
        const convertedGrades = subjects
            .map(getConvertedFinalGradeNumber)
            .filter((grade) => grade !== null);

        if (convertedGrades.length === 0) return "";

        const total = convertedGrades.reduce((sum, grade) => sum + grade, 0);
        return (total / convertedGrades.length).toFixed(2);
    };

    const filteredStudents = studentDetails
        .filter((s) => {
            const matchesYear =
                selectedSchoolYear === "" || String(s.year_id) === String(selectedSchoolYear);

            const matchesSemester =
                selectedSchoolSemester === "" || String(s.semester_id) === String(selectedSchoolSemester);

            return matchesYear && matchesSemester;
        })

    const getLevelBySection = (section) => {
        if (!section) return null;
        const yearNumber = parseInt(section[0]);
        // ISSUE: MAKE IT DYNAMIC
        switch (yearNumber) {
            case 1: return "First Year";
            case 2: return "Second Year";
            case 3: return "Third Year";
            case 4: return "Fourth Year";
            case 5: return "Fifth Year";
            default: return "unknown";
        }
    }

    const getShortTerm = (semester) => {
        if (!semester) return null;
        switch (semester) {
            case "First Semester": return "First";
            case "Second Semester": return "Second";
            case "Summer": return "Summer";
            default: return "unknown";
        }
    }

    const totalUnitPerSubject = (course_unit, lab_unit) => {
        const lec = Number(course_unit) || 0;
        const lab = Number(lab_unit) || 0;
        return lec + lab;
    };

    const divToPrintRef = useRef();

    // The printable report is authored at a fixed "design" width (matches
    // the sum of the rem-based widths used throughout the markup below,
    // ~80rem = 1280px) and shrunk down with a CSS transform so it reads at
    // a sensible size both on screen and on a physical A4 sheet. Because
    // the number of enrolled subjects varies per student, the report's
    // *height* is not fixed -- so instead of hardcoding a shrink factor
    // for height (which breaks for students with more/fewer subjects), we
    // measure the real rendered height with a ResizeObserver and size the
    // surrounding box to match exactly.
    const REPORT_DESIGN_WIDTH = 1280; // px, ~80rem
    const REPORT_SCALE = 0.55; // on-screen preview scale
    const [reportContentHeight, setReportContentHeight] = useState(0);

    // --- Exact-margin print geometry ----------------------------------
    // We want EXACTLY 1.5rem of white space on the left, right, and top
    // of the physical A4 sheet when printed. Getting an *exact* right-hand
    // margin (not just "whatever's left over") means the report's printed
    // width has to be calculated precisely as:
    //   pageWidth - leftMargin - rightMargin
    // We compute that here in plain geometry (assuming the standard
    // 16px = 1rem root font size and the standard 96 CSS-px-per-inch used
    // by browsers), then derive the transform scale needed to make the
    // ~1280px-wide design fit exactly that computed width.
    const PRINT_MARGIN_REM = 1.5;
    const PX_PER_REM = 16;
    const PX_PER_MM = 96 / 25.4; // ≈ 3.7795
    const A4_WIDTH_MM = 210;

    const printMarginPx = PRINT_MARGIN_REM * PX_PER_REM; // 24px ≈ 1.5rem
    const a4WidthPx = A4_WIDTH_MM * PX_PER_MM; // ≈ 793.7px
    const printContentWidthPx = a4WidthPx - printMarginPx * 2; // exact fit width
    const PRINT_SCALE = printContentWidthPx / REPORT_DESIGN_WIDTH; // ≈ 0.583

    // Inline styles can't branch on a CSS media query by themselves, so we
    // track whether we're actively printing with the beforeprint/afterprint
    // events and switch the scale/box size in JS. This lets the same box
    // be sized precisely for the screen preview (REPORT_SCALE) and for the
    // physical page (PRINT_SCALE) without fighting CSS specificity.
    //
    // IMPORTANT: window.print() can tell the browser to start laying out
    // the print document before React has actually re-rendered the DOM
    // with the new scale/margin values from a plain setIsPrinting(true) --
    // React normally batches/defers that update to the next tick, which
    // can be too late. flushSync forces the state update and the resulting
    // DOM changes to be applied synchronously, before this handler returns
    // control back to the browser's print pipeline.
    const [isPrinting, setIsPrinting] = useState(false);

    useEffect(() => {
        const handleBeforePrint = () => {
            flushSync(() => setIsPrinting(true));
        };
        const handleAfterPrint = () => {
            flushSync(() => setIsPrinting(false));
        };

        window.addEventListener("beforeprint", handleBeforePrint);
        window.addEventListener("afterprint", handleAfterPrint);

        return () => {
            window.removeEventListener("beforeprint", handleBeforePrint);
            window.removeEventListener("afterprint", handleAfterPrint);
        };
    }, []);

    const activeScale = isPrinting ? PRINT_SCALE : REPORT_SCALE;

    useEffect(() => {
        const node = divToPrintRef.current;
        if (!node) return;

        const measure = () => setReportContentHeight(node.scrollHeight);
        measure();

        const resizeObserver = new ResizeObserver(measure);
        resizeObserver.observe(node);

        return () => resizeObserver.disconnect();
    }, [filteredStudents, studentData, campusAddress, companyName]);

    const handleExportReportOfGradesPdf = async () => {
        const logoSrc = fetchedLogo || EaristLogo;
        const name = companyName?.trim() || "";
        const nameWords = name.split(" ");
        const middleIndex = Math.ceil(nameWords.length / 2);
        const firstLine = nameWords.slice(0, middleIndex).join(" ");
        const secondLine = nameWords.slice(middleIndex).join(" ");

        const semesterLine = filteredStudents.length > 0
            ? `${filteredStudents[0]?.semester_description}, School Year ${filteredStudents[0]?.current_year} - ${filteredStudents[0]?.next_year}`
            : "";
        const academicYearLine = filteredStudents.length > 0
            ? `${getShortTerm(filteredStudents[0]?.semester_description)} , ${filteredStudents[0]?.current_year} - ${filteredStudents[0]?.next_year}`
            : "";
        const yearLevelLine = filteredStudents.length > 0
            ? getLevelBySection(filteredStudents[0]?.section)
            : "";
        const genderLabel = studentData.gender === 0 ? "Male" : studentData.gender === 1 ? "Female" : "";

        const totalCreditsEnrolled = filteredStudents
            .reduce((total, subj) => total + (Number(subj.course_unit) || 0) + (Number(subj.lab_unit) || 0), 0)
            .toFixed(1);
        const totalCreditsEarned = filteredStudents
            .filter((subj) => subj.en_remarks === 1)
            .reduce((total, subj) => total + (Number(subj.course_unit) || 0) + (Number(subj.lab_unit) || 0), 0);
        const gpa = getGradePointAverage(filteredStudents);

        const rowsHtml = filteredStudents
            .map((p) => {
                const remarks =
                    p.en_remarks === 0 ? "Ongoing" :
                        p.en_remarks === 1 ? "PASSED" :
                            p.en_remarks === 2 ? "FAILED" :
                                p.en_remarks === 3 ? "INCOMPLETE" :
                                    p.en_remarks === 4 ? "DROPPED" : "";

                return `
              <tr style="display:flex; height:25px; align-items:start;">
                <td style="display:flex; align-items:center; justify-content:left; font-size:14px; width:8rem;">
                  <span style="padding-left:5px;">${p.course_code || ""}</span>
                </td>
                <td style="display:flex; width:26rem;">
                  <span style="margin:0; padding:0; font-size:14px;">${p.course_description || ""}</span>
                </td>
                <td style="display:flex; width:12rem; justify-content:center;">
                  <span style="margin:0; padding:0; font-size:14px;">${p.program_code || ""} ${p.section || ""}</span>
                </td>
                <td>
                  <span style="margin:0; padding:0; display:flex; justify-content:center; width:6rem;">${getConvertedFinalGrade(p)}</span>
                </td>
                <td>
                  <span style="margin:0; padding:0; display:flex; justify-content:center; width:6rem;"></span>
                </td>
                <td>
                  <span style="margin:0; padding:0; display:flex; justify-content:center; width:6rem;">
                    ${totalUnitPerSubject(p.course_unit, p.lab_unit)}
                  </span>
                </td>
                <td>
                  <span style="margin:0; padding:0; display:flex; justify-content:center; width:10rem;">${remarks}</span>
                </td>
              </tr>
            `;
            })
            .join("");

        // ── Header: plain flex row (no <table>), no negative-margin hacks ──
        const innerHtml = `
    <div style="display:flex; flex-direction:column; align-items:center; width:80rem;">
      <div style="display:flex; align-items:center; justify-content:center; gap:1rem; padding-top:1rem;">
        <img src="${logoSrc}" alt="School Logo" style="width:8rem; height:8rem; display:block; object-fit:cover; border-radius:50%; flex-shrink:0;" />
        <div style="text-align:center; font-family:Arial, sans-serif; font-size:10px; line-height:1.5;">
          <div style="font-family:Arial, sans-serif; font-size:13px;">Republic of the Philippines</div>
          ${name ? `
            <div style="font-family:'Times New Roman', serif; font-size:1.6rem; font-weight:600; letter-spacing:-1px; line-height:1.15;">
              ${firstLine}<br/>${secondLine}
            </div>
            ${campusAddress ? `<div style="font-size:12px; letter-spacing:1px;">${campusAddress}</div>` : ""}
          ` : ""}
        </div>
      </div>

      ${filteredStudents.length > 0 ? `
        <div style="margin-top:0.75rem; text-align:center; width:100%;">
          <div style="font-size:1.6rem; font-weight:500; letter-spacing:-1px; text-decoration:underline; text-underline-offset:0.4rem;">
            REPORT OF GRADES
          </div>
          <div style="font-size:1rem; letter-spacing:-1px;">${semesterLine}</div>
        </div>
      ` : ""}
    </div>

    <div style="display:flex; margin-top:0.5rem;">
      <div>
        <div style="padding:1rem; margin-left:1rem; width:70rem;">
          <div style="display:flex;">
            <div style="display:flex; width:38rem;">
              <div style="width:9rem; font-size:1.05rem; letter-spacing:-1px;">Full Name:</div>
              <div style="font-size:1.06rem; font-weight:500;">${studentFullName}</div>
            </div>
            <div style="display:flex; width:38rem;">
              <div style="width:9rem; font-size:1.05rem; letter-spacing:-1px;">Student No:</div>
              <div style="font-size:1.06rem; font-weight:500;">${studentData.student_number || ""}</div>
            </div>
          </div>
          <div style="display:flex;">
            <div style="display:flex; width:38rem;">
              <div style="width:9rem; font-size:1.05rem; letter-spacing:-1px;">Gender:</div>
              <div style="font-size:1.06rem; font-weight:500;">${genderLabel}</div>
            </div>
            <div style="display:flex; width:38rem;">
              <div style="width:9rem; font-size:1.05rem; letter-spacing:-1px;">Academic Year:</div>
              <div style="font-size:1.06rem; font-weight:500;">${academicYearLine}</div>
            </div>
          </div>
          <div style="display:flex;">
            <div style="display:flex; width:34rem;">
              <div style="width:9rem; font-size:1.05rem; letter-spacing:-1px;">College:</div>
              <div style="font-size:1.06rem; font-weight:500;">${studentData.dprtmnt_name || ""}</div>
            </div>
            <div style="display:flex;">
              <div style="width:9rem; font-size:1.05rem; letter-spacing:-1px;">Year Level:</div>
              <div style="font-size:1.06rem; font-weight:500;">${yearLevelLine}</div>
            </div>
          </div>
          <div style="display:flex; width:38rem;">
            <div style="width:9rem; font-size:1.05rem; letter-spacing:-1px;">Program:</div>
            <div style="font-size:1.06rem; font-weight:500;">${studentData.program_description || ""}</div>
          </div>
          <div style="display:flex;">
            <div style="display:flex; width:38rem;">
              <div style="width:9rem; font-size:1.05rem; letter-spacing:-1px;">Major:</div>
              <div style="font-size:1.06rem; font-weight:500;">${studentData.major || ""}</div>
            </div>
            <div style="display:flex; width:38rem;">
              <div style="width:9rem; font-size:1.05rem; letter-spacing:-1px;">Rentention Status:</div>
              <div style="font-size:1.06rem; font-weight:500;"></div>
            </div>
          </div>
        </div>

        <div style="display:flex; flex-wrap:wrap; margin-top:-1rem;">
          <div style="padding-left:1rem; flex:0 0 50%; margin-bottom:1rem; box-sizing:border-box;">
            <table style="border:black 1px solid;">
              <thead>
                <tr style="border-bottom:1px solid black;">
                  <td style="display:flex; height:35px; align-items:center; justify-content:center; font-weight:600;">${studentData.program_description || ""}</td>
                </tr>
                <tr style="display:flex; height:50px; border-bottom:solid 1px black;">
                  <td style="font-weight:700; display:flex; align-items:center; justify-content:center; width:10rem;"><span>CODE</span></td>
                  <td style="font-weight:700; display:flex; align-items:center; justify-content:center; width:24rem;"><span>TITLE</span></td>
                  <td style="font-weight:700; display:flex; align-items:center; justify-content:center; width:12rem;"><span>CLASS SECTION</span></td>
                  <td style="font-weight:700; display:flex; align-items:center; justify-content:center; width:6rem;"><span>GRADES</span></td>
                  <td style="font-weight:700; display:flex; align-items:center; justify-content:center; width:6rem;"><span>RE-EXAM</span></td>
                  <td style="font-weight:700; display:flex; align-items:center; justify-content:center; width:6rem;"><span style="text-align:center;">CREDIT UNIT</span></td>
                  <td style="font-weight:700; display:flex; align-items:center; justify-content:center; width:10rem;"><span style="text-align:center;">REMARKS</span></td>
                </tr>
              </thead>
              <tbody>
                ${rowsHtml}
                <tr>
                  <td style="display:flex; justify-content:center; align-items:center; margin-top:0.5rem;">
                    <div>***</div>
                    <div style="height:30px; margin:0 5px; font-size:0.9rem;">Nothing Follows</div>
                    <div>***</div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div style="display:flex; margin-top:-1rem;">
          <div style="max-width:47rem;">
            <div style="display:flex; justify-content:end;">
              <div style="width:45rem; display:flex; justify-content:end; font-size:0.9rem;">Total Subject Enrolled:</div>
              <div style="padding:0 0.5rem; display:flex; justify-content:end; font-size:0.9rem; width:3rem;">${filteredStudents.length}</div>
            </div>
            <div style="display:flex; justify-content:end;">
              <div style="width:45rem; display:flex; justify-content:end; font-size:0.9rem;">Total Credits Enrolled:</div>
              <div style="padding:0 0.5rem; display:flex; justify-content:end; font-size:0.9rem; width:3rem;">${totalCreditsEnrolled}</div>
            </div>
            <div style="display:flex; justify-content:end;">
              <div style="width:45rem; display:flex; justify-content:end; font-size:0.9rem;">Total Credits Earned:</div>
              <div style="padding:0 0.5rem; display:flex; justify-content:end; font-size:0.9rem; width:3rem;">${totalCreditsEarned}</div>
            </div>
            <div style="display:flex; justify-content:end;">
              <div style="width:45rem; display:flex; justify-content:end; font-size:0.9rem;">Grade Point Average:</div>
              <div style="padding:0 0.5rem; display:flex; justify-content:end; font-size:0.9rem; width:3rem;">${gpa}</div>
            </div>
          </div>
          <div style="height:4.5rem; margin-left:6rem; width:100%; display:flex; flex-direction:column; align-items:end; justify-content:end;">
            <div style="width:100%; text-align:center; margin:0; padding:0;">
              <div style="border-bottom:1px black solid; width:100%; margin-top:1rem;"></div>
              <div style="font-size:0.7rem; margin-bottom:-0.2rem;">Registrar</div>
            </div>
          </div>
        </div>

        <div style="border:black solid 1px; margin-left:1rem; margin-top:1rem; padding:0.5rem;">
          <div><div style="font-size:0.9rem;">Grading System</div></div>
          <div style="display:flex; align-items:center;">
            <div style="display:flex; margin-left:1.2rem;">
              <div>
                <div style="width:6.5rem; font-size:0.9rem;">1.00 (97 - 100)</div>
                <div style="font-size:0.9rem;">1.25 (94 - 96)</div>
                <div style="font-size:0.9rem;">1.50 (91 - 93)</div>
                <div style="font-size:0.9rem;">1.75 (88 - 90)</div>
                <div style="font-size:0.9rem;">2.00 (85 - 87)</div>
              </div>
              <div>
                <div style="width:20rem; font-size:0.9rem;">Marked Excellent</div>
                <div style="width:20rem; font-size:0.9rem;">Excellent</div>
                <div style="width:20rem; font-size:0.9rem;">Very Superior</div>
                <div style="width:20rem; font-size:0.9rem;">Superior</div>
                <div style="width:20rem; font-size:0.9rem;">Very Good</div>
              </div>
            </div>
            <div style="display:flex;">
              <div>
                <div style="width:6.5rem; font-size:0.9rem;">2.00 (82 - 84)</div>
                <div style="width:6.5rem; font-size:0.9rem;">2.25 (79 - 81)</div>
                <div style="width:6.5rem; font-size:0.9rem;">2.50 (76 - 78)</div>
                <div style="width:6.5rem; font-size:0.9rem;">3.00 (75)</div>
                <div style="width:6.5rem; font-size:0.9rem;">4.00 (70 - 74)</div>
              </div>
              <div>
                <div style="width:20rem; font-size:0.9rem;">Good</div>
                <div style="width:20rem; font-size:0.9rem;">Satisfactory</div>
                <div style="width:20rem; font-size:0.9rem;">Fair</div>
                <div style="width:20rem; font-size:0.9rem;">Passed</div>
                <div style="width:20rem; font-size:0.9rem;">Conditional Failure</div>
              </div>
            </div>
            <div style="display:flex;">
              <div>
                <div style="width:6rem; font-size:0.9rem;">5.00 (Below 70)</div>
                <div style="width:6rem; font-size:0.9rem;">INC</div>
                <div style="width:6rem; font-size:0.9rem;">DRP</div>
                <div style="width:6rem; font-size:0.9rem;"></div>
                <div style="width:6rem; font-size:0.9rem;"></div>
              </div>
              <div>
                <div style="font-size:0.9rem;">Failed</div>
                <div style="font-size:0.9rem;">Incomplete</div>
                <div style="font-size:0.9rem;">Drop Subject</div>
                <div style="font-size:0.9rem; height:20px;"></div>
                <div style="font-size:0.9rem; height:20px;"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

        try {
            const response = await axios.post(
                `${API_BASE_URL}/api/generate-report-of-grades-pdf`,
                {
                    html: innerHtml,
                    student_number: studentData.student_number || "",
                    last_name: currentStudent?.last_name || "",
                    first_name: currentStudent?.first_name || "",
                    audit_print_action: "PRINTING_STUDENT_DOCS",
                    document_label: "Report of Grades",
                },
                {
                    responseType: "blob",
                    headers: getFlatAuditHeaders({
                        "x-employee-id": employeeID,
                        "x-page-id": pageId,
                    }),
                },
            );

            const blobUrl = window.URL.createObjectURL(
                new Blob([response.data], { type: "application/pdf" }),
            );
            const link = document.createElement("a");
            link.href = blobUrl;
            link.setAttribute(
                "download",
                `Report_Of_Grades_${(currentStudent?.last_name || "Student").replace(/\s+/g, "_")}${studentData.student_number ? "_" + studentData.student_number : ""}.pdf`,
            );
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(blobUrl);
        } catch (err) {
            console.error("Failed to generate Report of Grades PDF:", err);
            setSnackbarMessage("Failed to generate Report of Grades PDF.");
            setOpenSnackbar(true);
        }
    };

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
            <Box className="no-print">
                <Box
                    sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        flexWrap: "wrap",
                        mb: 2,

                        background: "white",
                    }}
                >
                    {/* Title */}
                    <Typography
                        variant="h4"
                        sx={{
                            fontWeight: "bold",
                            color: titleColor,
                            fontSize: "36px",
                        }}
                    >
                        REPORT OF GRADES
                    </Typography>

                    {/* Right Section: Search Field + Print Button */}
                    <Box
                        sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 2,
                            flexWrap: "wrap",
                            mt: { xs: 2, sm: 0 },
                        }}
                    >
                        <Box sx={{ position: "relative", width: 450, mb: 2, mt: 1 }}>
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
                            onClick={handleExportReportOfGradesPdf}
                            style={{
                                padding: "5px 20px",
                                border: "2px solid black",
                                backgroundColor: "#f0f0f0",
                                color: "black",
                                borderRadius: "5px",
                                cursor: "pointer",
                                fontSize: "14px",
                                fontWeight: "bold",
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
                            Download Report of Grades
                        </button>

                    </Box>
                </Box>

                <hr style={{ border: "1px solid #ccc", width: "100%" }} />

                <br />
                <br />

                <RegistrarEnrollmentTabs />

                <br />
                <br />

                <style>
                    {`
                /* =========================================================
                   Screen-only "paper" look for the Report of Grades.
                   .rog-page-outer  -> gray backdrop, centers the sheet
                   .rog-page-card   -> a white bordered/shadowed "paper"
                                       frame; auto-sized (fit-content) around
                                       whatever is inside it, so it never
                                       needs a magic-number height itself.
                   .rog-scale-box   -> a box explicitly sized (via inline
                                       style, computed in JS from the real
                                       measured content height) to exactly
                                       match the scaled-down report. This
                                       avoids clipping/overlap when a
                                       student has more or fewer enrolled
                                       subjects than another.
                   .rog-content     -> the real printable content, scaled
                                       down with a CSS transform and
                                       absolutely positioned at the top
                                       left of .rog-scale-box.
                   None of this is inside @media print, so it only affects
                   normal on-screen viewing.
                   ========================================================= */
                .rog-page-outer {
                    display: flex;
                    justify-content: center;
                    background: #e7e7e7;
                    padding: 2rem 0;
                }
                .rog-page-card {
                
                    background: #ffffff;
                    border: 1px solid #b8b8b8;
                    box-shadow: 0 6px 18px rgba(0, 0, 0, 0.14);
                    box-sizing: content-box;
                    width: fit-content;
                    padding: 32px;
                    margin: 0 auto;
                }
                .rog-scale-box {
                    margin-top: -1.5rem !important;
                    margin-left: 1.5rem !important;
                    position: relative;
                    overflow: hidden;
                }

                @media print {
                    @page {
                        size: 210mm 297mm; /* A4, portrait */
                        margin: 0;
                    }

                    /* The sidebar and top header bar you see on every page
                       are rendered by a parent layout component that wraps
                       this page -- they live outside ReportOfGrade.jsx, so
                       a "no-print" class only defined/used inside this
                       component can never reach them. Hiding everything in
                       the whole document with visibility:hidden (a rule
                       that applies globally, regardless of which component
                       rendered an element) and then re-revealing only the
                       report solves that.

                       visibility:hidden alone would normally still reserve
                       the hidden elements' layout space, which is why the
                       report also gets position:fixed below -- that takes
                       it completely out of the normal document flow and
                       anchors it to the physical page's top-left corner
                       regardless of how much space any hidden sibling or
                       ancestor still occupies. */
                    .no-print {
                        display: none !important;
                    }

                    body * {
                        visibility: hidden !important;
                    }

                    .rog-page-outer,
                    .rog-page-outer * {
                        visibility: visible !important;
                    }

                    .rog-page-outer {
                        position: fixed !important;
                        top: 0;
                        left: 0;
                        width: 210mm;
                        margin: 0 !important;
                        padding: 0 !important;
                        background: none !important;
                        display: block !important;
                    }

                    .rog-page-card {
                        all: unset;
                        margin-top: 1.5rem !important;
                        margin-left: 1rem !important;
                        display: block !important;
                        visibility: visible !important;
                    }

                    /* Width/height/scale/margin for .rog-scale-box and
                       .rog-content are computed precisely in JS (see
                       PRINT_SCALE, PRINT_MARGIN_REM) and applied as inline
                       styles once printing starts, so the report gets
                       EXACTLY 1.5rem on the left, right, and top of the
                       physical page. */

                    button {
                        display: none !important;
                    }
                }
                `}
                </style>
                <TableContainer component={Paper} sx={{ width: '100%' }}>
                    <Table>
                        <TableHead sx={{ backgroundColor: headerColor, border: `1px solid ${borderColor}`, }}>
                            <TableRow>
                                {/* Left cell: Student Number */}
                                <TableCell sx={{ color: 'white', fontSize: '20px', fontFamily: "Poppins, sans-serif", border: 'none' }}>
                                    Student Number:&nbsp;
                                    <span style={{ fontFamily: "Poppins, sans-serif", fontWeight: "normal", textDecoration: "underline" }}>
                                        {studentData.student_number || "N/A"}

                                    </span>
                                </TableCell>

                                {/* Right cell: Student Name */}
                                <TableCell
                                    align="right"
                                    sx={{ color: 'white', fontSize: '20px', fontFamily: "Poppins, sans-serif", border: 'none' }}
                                >
                                    Student Name:&nbsp;
                                    <span style={{ fontFamily: "Poppins, sans-serif", fontWeight: "normal", textDecoration: "underline" }}>
                                        {studentFullName
                                            ? studentFullName.toUpperCase()
                                            : "N/A"}
                                    </span>
                                </TableCell>
                            </TableRow>
                        </TableHead>
                    </Table>
                </TableContainer>
                <TableContainer component={Paper} sx={{ maxWidth: '100%', border: `1px solid ${borderColor}`, p: 2, position: "relative", }}>
                    <Box sx={{ display: "flex", alignItems: "center", margin: "1rem 0", padding: "0 1rem" }} gap={4}>
                        <Box display="flex" alignItems="center" gap={1}>
                            <Typography fontSize={13} sx={{ minWidth: "100px" }}>
                                School Year:
                            </Typography>

                            <FormControl>
                                <InputLabel>School Years</InputLabel>
                                <Select
                                    style={{ width: "200px" }}
                                    value={selectedSchoolYear}
                                    label="School Years"
                                    onChange={handleSchoolYearChange}
                                >
                                    {schoolYears.length > 0 ? (
                                        schoolYears.map((sy) => (
                                            <MenuItem value={sy.year_id} key={sy.year_id}>
                                                {sy.current_year} - {sy.next_year}
                                            </MenuItem>
                                        ))
                                    ) : (
                                        <MenuItem disabled>School Year is not found</MenuItem>
                                    )}
                                </Select>
                            </FormControl>
                        </Box>

                        <Box display="flex" alignItems="center" gap={1}>
                            <Typography fontSize={13} sx={{ minWidth: "100px" }}>
                                Semester:
                            </Typography>

                            <FormControl>
                                <InputLabel>School Semester</InputLabel>
                                <Select
                                    style={{ width: "200px" }}
                                    value={selectedSchoolSemester}
                                    label="School Semester"
                                    onChange={handleSchoolSemesterChange}
                                >
                                    {schoolSemester.length > 0 ? (
                                        schoolSemester.map((sem) => (
                                            <MenuItem value={sem.semester_id} key={sem.semester_id}>
                                                {sem.semester_description}
                                            </MenuItem>
                                        ))
                                    ) : (
                                        <MenuItem disabled>School Semester is not found</MenuItem>
                                    )}
                                </Select>
                            </FormControl>
                        </Box>
                    </Box>
                </TableContainer>
            </Box>
            <Box className="rog-page-outer">
                <Box className="rog-page-card">
                    <Box
                        className="rog-scale-box"
                        style={{
                            width: REPORT_DESIGN_WIDTH * activeScale,
                            height: reportContentHeight
                                ? reportContentHeight * activeScale
                                : undefined,
                            marginTop: isPrinting ? `${PRINT_MARGIN_REM}rem` : undefined,
                            marginLeft: isPrinting ? `${PRINT_MARGIN_REM}rem` : undefined,
                        }}
                    >
                        <Box
                            className="print-container rog-content"
                            ref={divToPrintRef}
                            style={{
                                width: REPORT_DESIGN_WIDTH,
                                transform: `scale(${activeScale})`,
                                transformOrigin: "top left",
                                position: "absolute",
                                top: 0,
                                left: 0,
                            }}
                        >
                            <table>
                                <thead
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        width: "70rem",
                                        justifyContent: "center",
                                        gap: "0.5rem", // ✅ adds spacing between logo and text
                                    }}
                                >
                                    {/* LEFT - Logo */}
                                    <tr
                                        style={{
                                            paddingTop: "1.5rem",
                                            paddingRight: "3rem",
                                        }}
                                    >
                                        <td>
                                            <img
                                                src={fetchedLogo || EaristLogo} // ✅ Use dynamic logo with fallback
                                                alt="School Logo"
                                                style={{
                                                    width: "8rem",
                                                    height: "8rem",
                                                    display: "block",
                                                    objectFit: "cover",
                                                    borderRadius: "50%",
                                                }}
                                            />
                                        </td>
                                    </tr>

                                    {/* CENTER - School Info */}
                                    <tr style={{ marginTop: "1.5rem" }}>
                                        <td
                                            colSpan={15}
                                            style={{
                                                textAlign: "center",
                                                fontFamily: "Poppins, sans-serif",
                                                fontSize: "10px",
                                                lineHeight: "1.5",
                                            }}
                                        >
                                            <div style={{ fontFamily: "Arial", fontSize: "13px" }}>
                                                Republic of the Philippines
                                            </div>
                                            {/* ✅ Dynamically split company name into two lines */}
                                            {companyName ? (
                                                (() => {
                                                    const name = companyName.trim();
                                                    const words = name.split(" ");
                                                    const middleIndex = Math.ceil(words.length / 2);
                                                    const firstLine = words.slice(0, middleIndex).join(" ");
                                                    const secondLine = words.slice(middleIndex).join(" ");

                                                    return (
                                                        <>
                                                            <Typography
                                                                style={{
                                                                    textAlign: "center",
                                                                    marginTop: "0rem",
                                                                    lineHeight: "1",
                                                                    fontSize: "1.6rem",
                                                                    letterSpacing: "-1px",
                                                                    fontWeight: "600",
                                                                    fontFamily: "Times New Roman",
                                                                }}
                                                            >
                                                                {firstLine} <br />
                                                                {secondLine}
                                                            </Typography>

                                                            {/* ✅ Dynamic Campus Address */}
                                                            {campusAddress && (
                                                                <Typography
                                                                    style={{
                                                                        mt: 1,
                                                                        textAlign: "center",
                                                                        fontSize: "12px",
                                                                        letterSpacing: "1px",

                                                                    }}
                                                                >
                                                                    {campusAddress}
                                                                </Typography>
                                                            )}
                                                        </>
                                                    );
                                                })()
                                            ) : (
                                                <div style={{ height: "24px" }}></div>
                                            )}
                                        </td>
                                    </tr>
                                </thead>
                            </table>

                            {filteredStudents.length > 0 && (
                                <Box style={{ marginTop: "-1rem" }}>
                                    <Typography style={{ marginLeft: "1rem", textAlign: "center", width: "80rem", fontSize: "1.6rem", letterSpacing: "-1px", fontWeight: "500", textDecoration: "underline", textUnderlineOffset: "0.4rem", }}>REPORT OF GRADES</Typography>
                                    <Typography style={{ marginLeft: "1rem", marginTop: "-0.2rem", width: "80rem", textAlign: "center", letterSpacing: "-1px" }}>{filteredStudents[0]?.semester_description},  School Year {filteredStudents[0]?.current_year} - {filteredStudents[0]?.next_year}</Typography>
                                </Box>
                            )}

                            <Box style={{ display: "flex" }}>
                                <Box style={{ marginTop: "-1rem" }}>
                                    <Box sx={{ padding: "1rem", marginLeft: "1rem", width: "70rem" }}>
                                        <Box sx={{ display: "flex" }}>
                                            <Box style={{ display: "flex", width: "38rem" }}>
                                                <Typography style={{ width: "9rem", fontSize: "1.05rem", letterSpacing: "-1px" }}>Full Name:</Typography>
                                                <Typography style={{ fontSize: "1.06rem", fontWeight: "500" }}>{studentFullName}</Typography>
                                            </Box>
                                            <Box style={{ display: "flex", width: "38rem" }}>
                                                <Typography style={{ width: "9rem", fontSize: "1.05rem", letterSpacing: "-1px" }}>Student No:</Typography>
                                                <Typography style={{ fontSize: "1.06rem", fontWeight: "500" }}>{studentData.student_number}</Typography>
                                            </Box>
                                        </Box>
                                        <Box sx={{ display: "flex" }}>
                                            <Box style={{ display: "flex", width: "38rem" }}>
                                                <Typography style={{ width: "9rem", fontSize: "1.05rem", letterSpacing: "-1px" }}>Gender:</Typography>
                                                <Typography style={{ fontSize: "1.06rem", fontWeight: "500" }}>{studentData.gender === 0 ? "Male" : studentData.gender === 1 ? "Female" : ""}</Typography>
                                            </Box>
                                            <Box style={{ display: "flex", width: "38rem" }}>
                                                <Typography style={{ width: "9rem", fontSize: "1.05rem", letterSpacing: "-1px" }}>Academic Year:</Typography>
                                                {filteredStudents.length > 0 && (
                                                    <>
                                                        <Typography style={{ fontSize: "1.06rem", fontWeight: "500" }}>{getShortTerm(filteredStudents[0]?.semester_description)} , {filteredStudents[0]?.current_year} - {filteredStudents[0]?.next_year}</Typography>
                                                    </>
                                                )}
                                            </Box>
                                        </Box>
                                        <Box sx={{ display: "flex" }}>
                                            <Box style={{ display: "flex", width: "34rem" }}>
                                                <Typography style={{ width: "9rem", fontSize: "1.05rem", letterSpacing: "-1px" }}>College:</Typography>
                                                <Typography style={{ fontSize: "1.06rem", fontWeight: "500" }}>{studentData.dprtmnt_name}</Typography>
                                            </Box>
                                            <Box style={{ display: "flex" }}>
                                                <Typography style={{ width: "9rem", fontSize: "1.05rem", letterSpacing: "-1px" }}>Year Level:</Typography>
                                                {filteredStudents.length > 0 && (
                                                    <>
                                                        <Typography style={{ fontSize: "1.06rem", fontWeight: "500" }}>{getLevelBySection(filteredStudents[0]?.section)}</Typography>
                                                    </>
                                                )}
                                            </Box>
                                        </Box>
                                        <Box style={{ display: "flex", width: "38rem" }}>
                                            <Typography style={{ width: "9rem", fontSize: "1.05rem", letterSpacing: "-1px" }}>Program:</Typography>
                                            <Typography style={{ fontSize: "1.06rem", fontWeight: "500" }}>{studentData.program_description}</Typography>
                                        </Box>
                                        <Box sx={{ display: "flex" }}>
                                            <Box style={{ display: "flex", width: "38rem" }}>
                                                <Typography style={{ width: "9rem", fontSize: "1.05rem", letterSpacing: "-1px" }}>Major:</Typography>
                                                <Typography style={{ fontSize: "1.06rem", fontWeight: "500" }}>{studentData.major}</Typography>
                                            </Box>
                                            <Box style={{ display: "flex", width: "38rem" }}>
                                                <Typography style={{ width: "9rem", fontSize: "1.05rem", letterSpacing: "-1px" }}>Rentention Status: </Typography>
                                                <Typography style={{ fontSize: "1.06rem", fontWeight: "500" }}></Typography>
                                            </Box>
                                        </Box>
                                    </Box>
                                    <Box style={{ display: "flex", flexWrap: "wrap", marginTop: "-1rem" }}>
                                        <Box style={{ paddingLeft: "1rem", flex: "0 0 50%", marginBottom: "1rem", boxSizing: "border-box" }}>
                                            <table style={{ border: "black 1px solid" }}>
                                                <thead>
                                                    <tr style={{ borderBottom: "1px solid black" }}>
                                                        <td style={{ display: "flex", height: "35px", alignItems: "center", justifyContent: "center", fontWeight: "600" }}>{studentData.program_description}</td>
                                                    </tr>
                                                    <tr style={{ display: "flex", height: "50px", borderBottom: "solid 1px black" }}>
                                                        <td style={{ fontWeight: "700", display: "flex", alignItems: "center", justifyContent: "center", width: "10rem" }}>
                                                            <span>CODE</span>
                                                        </td>
                                                        <td style={{ fontWeight: "700", display: "flex", alignItems: "center", justifyContent: "center", width: "24rem" }}>
                                                            <span>TITLE</span>
                                                        </td>
                                                        <td style={{ fontWeight: "700", display: "flex", alignItems: "center", justifyContent: "center", width: "12rem" }}>
                                                            <span>CLASS SECTION</span>
                                                        </td>
                                                        <td style={{ fontWeight: "700", display: "flex", alignItems: "center", justifyContent: "center", width: "6rem" }}>
                                                            <span>GRADES</span>
                                                        </td>
                                                        <td style={{ fontWeight: "700", display: "flex", alignItems: "center", justifyContent: "center", width: "6rem" }}>
                                                            <span>RE-EXAM</span>
                                                        </td>
                                                        <td style={{ fontWeight: "700", display: "flex", alignItems: "center", justifyContent: "center", width: "6rem" }}>
                                                            <span style={{ textAlign: "center" }}>CREDIT UNIT</span>
                                                        </td>
                                                        <td style={{ fontWeight: "700", display: "flex", alignItems: "center", justifyContent: "center", width: "10rem" }}>
                                                            <span style={{ textAlign: "center" }}>REMARKS</span>
                                                        </td>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {filteredStudents.map((p) => (
                                                        <tr style={{ display: "flex", height: "25px", alignItems: "start" }} key={p.enrolled_id}>
                                                            <td style={{ display: "flex", alignItems: "center", justifyContent: "left", fontSize: "14px", width: "8rem" }}>
                                                                <span style={{ paddingLeft: "5px" }}>{p.course_code}</span>
                                                            </td>
                                                            <td style={{ display: "flex", width: "26rem" }}>
                                                                <span style={{ margin: "0", padding: "0", fontSize: "14px" }}>{p.course_description}</span>
                                                            </td>
                                                            <td style={{ display: "flex", width: "12rem", justifyContent: "center" }}>
                                                                <span style={{ margin: "0", padding: "0", fontSize: "14px" }}>{p.program_code} {p.section}</span>
                                                            </td>
                                                            <td>
                                                                <span style={{ margin: "0", padding: "0", display: "flex", justifyContent: "center", width: "6rem" }}>{getConvertedFinalGrade(p)}</span>
                                                            </td>
                                                            <td>
                                                                <span style={{ margin: "0", padding: "0", display: "flex", justifyContent: "center", width: "6rem" }}></span>
                                                            </td>
                                                            <td>
                                                                <span style={{ margin: "0", padding: "0", display: "flex", justifyContent: "center", width: "6rem" }}>
                                                                    {totalUnitPerSubject(p.course_unit, p.lab_unit)}
                                                                </span>
                                                            </td>
                                                            <td>
                                                                <span style={{ margin: "0", padding: "0", display: "flex", justifyContent: "center", width: "10rem" }}>
                                                                    {p.en_remarks === 0 ? "Ongoing" :
                                                                        p.en_remarks === 1 ? "PASSED" :
                                                                            p.en_remarks === 2 ? "FAILED" :
                                                                                p.en_remarks === 3 ? "INCOMPLETE" :
                                                                                    p.en_remarks === 4 ? "DROPPED" :
                                                                                        ""
                                                                    }
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                    <tr>
                                                        <td style={{ display: "flex", justifyContent: "center", alignItems: "center", marginTop: "0.5rem" }}>
                                                            <div>
                                                                ***
                                                            </div>
                                                            <div style={{ height: "30px", margin: "0px 5px", fontSize: "0.9rem" }}>
                                                                Nothing Follows
                                                            </div>
                                                            <div>
                                                                ***
                                                            </div>
                                                        </td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                        </Box>
                                    </Box>
                                    <Box style={{ display: "flex", marginTop: "-1rem" }}>
                                        <Box style={{ maxWidth: "47rem" }}>
                                            <Box style={{ display: "flex", justifyContent: "end" }}>
                                                <Typography style={{ width: "45rem", display: "flex", justifyContent: "end", fontSize: "0.9rem" }}>Total Subject Enrolled:</Typography>
                                                <Typography style={{ padding: "0rem 0.5rem", display: "flex", justifyContent: "end", fontSize: "0.9rem", width: "3rem" }}>
                                                    {filteredStudents.length}
                                                </Typography>
                                            </Box>
                                            <Box style={{ display: "flex", justifyContent: "end" }}>
                                                <Typography style={{ width: "45rem", display: "flex", justifyContent: "end", fontSize: "0.9rem" }}>Total Credits Enrolled:</Typography>
                                                <Typography style={{ padding: "0rem 0.5rem", display: "flex", justifyContent: "end", fontSize: "0.9rem", width: "3rem" }}>
                                                    {filteredStudents
                                                        .reduce((total, subj) => total + (Number(subj.course_unit) || 0) + (Number(subj.lab_unit) || 0), 0)
                                                        .toFixed(1)
                                                    }
                                                </Typography>
                                            </Box>
                                            <Box style={{ display: "flex", justifyContent: "end" }}>
                                                <Typography style={{ width: "45rem", display: "flex", justifyContent: "end", fontSize: "0.9rem" }}>Total Credits Earned:</Typography>
                                                <Typography style={{ padding: "0rem 0.5rem", display: "flex", justifyContent: "end", fontSize: "0.9rem", width: "3rem" }}>
                                                    {filteredStudents
                                                        .filter(subj => subj.en_remarks === 1)
                                                        .reduce((total, subj) => total + (Number(subj.course_unit) || 0) + (Number(subj.lab_unit) || 0), 0)
                                                    }
                                                </Typography>
                                            </Box>
                                            <Box style={{ display: "flex", justifyContent: "end" }}>
                                                <Typography style={{ width: "45rem", display: "flex", justifyContent: "end", fontSize: "0.9rem" }}>Grade Point Average:</Typography>
                                                <Typography style={{ padding: "0rem 0.5rem", display: "flex", justifyContent: "end", fontSize: "0.9rem", width: "3rem" }}>
                                                    {getGradePointAverage(filteredStudents)}
                                                </Typography>
                                            </Box>
                                        </Box>
                                        <Box style={{ height: "4.5rem", marginLeft: "6rem", width: "100%", display: "flex", flexDirection: "column", alignItems: "end", justifyContent: "end" }}>
                                            <Box style={{ width: "100%", textAlign: "center", margin: "0", padding: "0" }}>
                                                <Typography style={{ borderBottom: "1px black solid", width: "100%" }}></Typography>
                                                <Typography style={{ fontSize: "0.7rem", marginBottom: "-0.2rem" }}>Registrar</Typography>
                                            </Box>
                                        </Box>
                                    </Box>
                                    <Box style={{ border: "black solid 1px", marginLeft: "1rem", padding: "0.5rem" }}>
                                        <Box>
                                            <Typography style={{ fontSize: "0.9rem" }}>Grading System</Typography>
                                        </Box>
                                        <Box style={{ display: "flex", alignItems: "center" }}>
                                            <Box style={{ display: "flex", marginLeft: "1.2rem" }}>
                                                <Box>
                                                    <Typography style={{ width: "6.5rem", fontSize: "0.9rem" }}>1.00 (97 - 100)</Typography>
                                                    <Typography style={{ fontSize: "0.9rem" }}>1.25 (94 - 96)</Typography>
                                                    <Typography style={{ fontSize: "0.9rem" }}>1.50 (91 - 93)</Typography>
                                                    <Typography style={{ fontSize: "0.9rem" }}>1.75 (88 - 90)</Typography>
                                                    <Typography style={{ fontSize: "0.9rem" }}>2.00 (85 - 87)</Typography>
                                                </Box>
                                                <Box>
                                                    <Typography style={{ width: "20rem", fontSize: "0.9rem" }}>Marked Excellent</Typography>
                                                    <Typography style={{ width: "20rem", fontSize: "0.9rem" }}>Excellent</Typography>
                                                    <Typography style={{ width: "20rem", fontSize: "0.9rem" }}>Very Superior</Typography>
                                                    <Typography style={{ width: "20rem", fontSize: "0.9rem" }}>Superior</Typography>
                                                    <Typography style={{ width: "20rem", fontSize: "0.9rem" }}>Very Good</Typography>
                                                </Box>
                                            </Box>
                                            <Box style={{ display: "flex" }}>
                                                <Box>
                                                    <Typography style={{ width: "6.5rem", fontSize: "0.9rem" }}>2.00 (82 - 84)</Typography>
                                                    <Typography style={{ width: "6.5rem", fontSize: "0.9rem" }}>2.25 (79 - 81)</Typography>
                                                    <Typography style={{ width: "6.5rem", fontSize: "0.9rem" }}>2.50 (76 - 78)</Typography>
                                                    <Typography style={{ width: "6.5rem", fontSize: "0.9rem" }}>3.00 (75)</Typography>
                                                    <Typography style={{ width: "6.5rem", fontSize: "0.9rem" }}>4.00 (70 - 74)</Typography>
                                                </Box>
                                                <Box>
                                                    <Typography style={{ width: "20rem", fontSize: "0.9rem" }}>Good</Typography>
                                                    <Typography style={{ width: "20rem", fontSize: "0.9rem" }}>Satisfactory</Typography>
                                                    <Typography style={{ width: "20rem", fontSize: "0.9rem" }}>Fair</Typography>
                                                    <Typography style={{ width: "20rem", fontSize: "0.9rem" }}>Passed</Typography>
                                                    <Typography style={{ width: "20rem", fontSize: "0.9rem" }}>Conditional Failure</Typography>
                                                </Box>
                                            </Box>
                                            <Box style={{ display: "flex" }}>
                                                <Box>
                                                    <Typography style={{ width: "6rem", fontSize: "0.9rem" }}>5.00 (Below 70)</Typography>
                                                    <Typography style={{ width: "6rem", fontSize: "0.9rem" }}>INC</Typography>
                                                    <Typography style={{ width: "6rem", fontSize: "0.9rem" }}>DRP</Typography>
                                                    <Typography style={{ width: "6rem", fontSize: "0.9rem" }}></Typography>
                                                    <Typography style={{ width: "6rem", fontSize: "0.9rem" }}></Typography>
                                                </Box>
                                                <Box>
                                                    <Typography style={{ fontSize: "0.9rem" }}>Failed</Typography>
                                                    <Typography style={{ fontSize: "0.9rem" }}>Incomplete</Typography>
                                                    <Typography style={{ fontSize: "0.9rem" }}>Drop Subject</Typography>
                                                    <Typography style={{ fontSize: "0.9rem", height: "20px" }}></Typography>
                                                    <Typography style={{ fontSize: "0.9rem", height: "20px" }}></Typography>
                                                </Box>
                                            </Box>
                                        </Box>
                                    </Box>
                                    <Snackbar
                                        open={openSnackbar}
                                        autoHideDuration={4000}
                                        onClose={() => setOpenSnackbar(false)}
                                        anchorOrigin={{ vertical: "top", horizontal: "center" }}
                                    >
                                        <Alert onClose={() => setOpenSnackbar(false)} severity="warning" sx={{ width: "100%" }}>
                                            {snackbarMessage}
                                        </Alert>
                                    </Snackbar>
                                </Box>
                            </Box>
                        </Box>
                    </Box>
                </Box>
            </Box>
        </Box >
    )
}

export default ReportOfGrade;
