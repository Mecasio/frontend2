import React, { useState, useEffect, useContext, useRef } from "react";
import { SettingsContext } from "../App";
import EaristLogo from "../assets/EaristLogo.png";
import axios from "axios";
import {
    Box,
    TextField,
    Typography,
    Button,
    Grid,
    Card,
    TableContainer,
    TableHead,
    TableCell,
    TableRow,
    FormControlLabel,
    Checkbox,
    Container,
    Paper,
    Table,
    Snackbar,   // ✅ ADD
    Alert,      // ✅ ADD
    CircularProgress,
} from "@mui/material";
import HealthRecord from "./HealthRecord";
import MedicalCertificate from "./MedicalCertificate";
import API_BASE_URL from "../apiConfig";
import { useNavigate, useLocation } from "react-router-dom";
import SaveIcon from '@mui/icons-material/Save';
import { motion } from "framer-motion";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import Unauthorized from "../components/Unauthorized";
import LoadingOverlay from "../components/LoadingOverlay";
import MedicalProcessTabs from "../components/MedicalProcessTabs";
import SearchIcon from "@mui/icons-material/Search";
import { getFlatAuditHeaders } from "../utils/auditEvents";
import useAuditMac from "../utils/useAuditMac";

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

const PhysicalNeuroExam = () => {
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
    const [subButtonColor, setSubButtonColor] = useState("#ffffff");   // ✅ NEW
    const [stepperColor, setStepperColor] = useState("#000000");       // ✅ NEW

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
        if (branding.campusAddress) setCampusAddress(branding.campusAddress);

    }, [settings]);



    const [studentNumber, setStudentNumber] = useState("");
    const [studentSuggestions, setStudentSuggestions] = useState([]);
    const [suggestionsLoading, setSuggestionsLoading] = useState(false);
    const [suggestionsOpen, setSuggestionsOpen] = useState(false);
    const [person, setPerson] = useState(null);

    const [persons, setPersons] = useState([]);

    const [selectedPerson, setSelectedPerson] = useState(null);
    const [userID, setUserID] = useState("");
    const [user, setUser] = useState("");
    const [userRole, setUserRole] = useState("");

    const [explicitSelection, setExplicitSelection] = useState(false);


    const [hasAccess, setHasAccess] = useState(null);
    const [loading, setLoading] = useState(false);


    const pageId = 32;

    const [employeeID, setEmployeeID] = useState("");

    const getAuditHeaders = () => ({
        headers: {
            ...getFlatAuditHeaders(),
            "x-employee-id": employeeID || localStorage.getItem("employee_id") || "",
            "x-page-id": pageId,
            "x-audit-actor-id":
                employeeID ||
                localStorage.getItem("employee_id") ||
                localStorage.getItem("person_id") ||
                localStorage.getItem("email") ||
                "unknown",
            "x-audit-actor-role": userRole || localStorage.getItem("role") || "registrar",
        },
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


    const location = useLocation();

    const queryParams = new URLSearchParams(location.search);
    const queryPersonId = queryParams.get("person_id")?.trim() || "";

    const fetchByPersonId = async (personId) => {
        if (!personId) return;

        try {
            const res = await axios.get(`${API_BASE_URL}/api/student-person-data/${personId}`);
            if (res.data) {
                setPerson(res.data);
                setSelectedPerson(res.data);
                setUserID(personId);
                sessionStorage.setItem("edit_person_id", String(personId));

                if (res.data.student_number) {
                    setStudentNumber(res.data.student_number);
                    sessionStorage.setItem("edit_student_number", res.data.student_number);
                }
            } else {
                console.warn("No person found for ID:", personId);
            }
        } catch (err) {
            console.error("Failed to fetch person by ID:", err);
        }
    };

    useEffect(() => {
        const storedUser = localStorage.getItem("email");
        const storedRole = localStorage.getItem("role");
        const loggedInPersonId = localStorage.getItem("person_id");

        if (!storedUser || !storedRole || !loggedInPersonId) {
            window.location.href = "/login";
            return;
        }

        setUser(storedUser);
        setUserRole(storedRole);

        const allowedRoles = ["registrar", "applicant", "superadmin"];
        if (!allowedRoles.includes(storedRole)) {
            window.location.href = "/login";
            return;
        }

        // ⭐ CASE 1: URL HAS ?person_id=
        if (queryPersonId !== "") {
            sessionStorage.setItem("admin_edit_person_id", queryPersonId);
            setUserID(queryPersonId);
            return;
        }

        // Applicant self-service: use their own id when no URL param
        if (storedRole === "applicant") {
            setUserID(loggedInPersonId);
            return;
        }

        // ⭐ CASE 3: Staff with no URL ID → start blank
        setUserID("");
    }, [queryPersonId]);




    useEffect(() => {
        let consumedFlag = false;

        const tryLoad = async () => {
            if (queryPersonId) {
                await fetchByPersonId(queryPersonId);
                setExplicitSelection(true);
                consumedFlag = true;
                return;
            }

            // fallback only if it's a fresh selection from Applicant List
            const source = sessionStorage.getItem("admin_edit_person_id_source");
            const tsStr = sessionStorage.getItem("admin_edit_person_id_ts");
            const id = sessionStorage.getItem("admin_edit_person_id");
            const ts = tsStr ? parseInt(tsStr, 10) : 0;
            const isFresh =
                ["applicant_list", "medical_student_list", "medical_applicant_list"].includes(source) &&
                Date.now() - ts < 5 * 60 * 1000;

            if (id && isFresh) {
                await fetchByPersonId(id);
                setExplicitSelection(true);
                consumedFlag = true;
            }
        };

        tryLoad().finally(() => {
            // consume the freshness so it won't auto-load again later
            if (consumedFlag) {
                sessionStorage.removeItem("admin_edit_person_id_source");
                sessionStorage.removeItem("admin_edit_person_id_ts");
            }
        });
    }, [queryPersonId]);




    // Fetch person by ID (when navigating with ?person_id=... or sessionStorage)
    useEffect(() => {
        const fetchPersonById = async () => {
            if (!userID) return;

            try {
                const res = await axios.get(`${API_BASE_URL}/api/student-person-data/${userID}`);
                if (res.data) {
                    setPerson(res.data);
                    setSelectedPerson(res.data);
                    if (res.data.student_number) {
                        setStudentNumber(res.data.student_number);
                        sessionStorage.setItem("edit_student_number", res.data.student_number);
                    }
                } else {
                    console.warn("⚠️ No person found for ID:", userID);
                }
            } catch (err) {
                console.error("❌ Failed to fetch person by ID:", err);
            }
        };

        fetchPersonById();
    }, [userID]);

    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        if (!searchQuery.trim()) {
            // 🔹 If search is empty, clear everything
            setSelectedPerson(null);
            setPerson({
                profile_img: "",
                generalAverage1: "",
                height: "",
                applyingAs: "",
                document_status: "",
                last_name: "",
                first_name: "",
                middle_name: "",
                extension: "",
            });
            return;
        }

        // 🔹 Try to find a matching applicant from the list
        const match = persons.find((p) =>
            `${p.first_name} ${p.middle_name} ${p.last_name} ${p.emailAddress} ${p.applicant_number || ''}`
                .toLowerCase()
                .includes(searchQuery.toLowerCase())
        );

        if (match) {
            // ✅ If found, set this as the "selectedPerson"
            setSelectedPerson(match);
        } else {
            // ❌ If not found, clear again
            setSelectedPerson(null);
            setPerson({
                profile_img: "",
                generalAverage1: "",
                height: "",
                applyingAs: "",
                document_status: "",
                last_name: "",
                first_name: "",
                middle_name: "",
                extension: "",
            });
        }
    }, [searchQuery, persons]);



    useEffect(() => {
        let consumedFlag = false;

        const tryLoad = async () => {
            if (queryPersonId) {
                await fetchByPersonId(queryPersonId);
                setExplicitSelection(true);
                consumedFlag = true;
                return;
            }

            // fallback only if it's a fresh selection from Applicant List
            const source = sessionStorage.getItem("admin_edit_person_id_source");
            const tsStr = sessionStorage.getItem("admin_edit_person_id_ts");
            const id = sessionStorage.getItem("admin_edit_person_id");
            const ts = tsStr ? parseInt(tsStr, 10) : 0;
            const isFresh =
                ["applicant_list", "medical_student_list", "medical_applicant_list"].includes(source) &&
                Date.now() - ts < 5 * 60 * 1000;

            if (id && isFresh) {
                await fetchByPersonId(id);
                setExplicitSelection(true);
                consumedFlag = true;
            }
        };

        tryLoad().finally(() => {
            // consume the freshness so it won't auto-load again later
            if (consumedFlag) {
                sessionStorage.removeItem("admin_edit_person_id_source");
                sessionStorage.removeItem("admin_edit_person_id_ts");
            }
        });
    }, [queryPersonId]);




    const [form, setForm] = useState({
        student_number: "",
        pne_mental_status_check: 0,
        pne_mental_status_text: "",
        pne_sensory_check: 0,
        pne_sensory_text: "",
        pne_cranial_nerve_check: 0,
        pne_cranial_nerve_text: "",
        pne_cerebellar_check: 0,
        pne_cerebellar_text: "",
        pne_motor_check: 0,
        pne_motor_text: "",
        pne_reflexes_check: 0,
        pne_reflexes_text: "",
        pne_findings_psychological: "",
        pne_recommendations: "",
    });

    const navigate = useNavigate();

    // 🧠 Auto-fetch record
    useEffect(() => {
        if (studentNumber.trim().length >= 9) {
            const debounce = setTimeout(() => fetchRecord(studentNumber), 500);
            return () => clearTimeout(debounce);
        }
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
                const res = await axios.get(`${API_BASE_URL}/api/cor-student-suggestions`, {
                    params: { query, limit: 10 },
                });

                if (!cancelled) {
                    setStudentSuggestions(res.data || []);
                }
            } catch (err) {
                console.error("Failed to fetch student suggestions:", err);
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
        setSuggestionsOpen(false);
        setStudentSuggestions([]);
    };
  const renderStudentSuggestions = () => {
    if (!suggestionsOpen) return null;

    const currentQuery = studentNumber;
    if (String(currentQuery || "").trim().length < 2) return null;

    return (
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
                <Typography sx={{ fontSize: 14, color: "#555" }}>|</Typography>
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
    );
  };
    const fetchRecord = async (number) => {
        if (!number) return;
        try {
            const res = await axios.get(`${API_BASE_URL}/api/physical-neuro/${number}`);
            setForm(res.data);
        } catch {
            setForm((prev) => ({ ...prev, student_number: number }));
        }
    };

    const handleCheckbox = (e) => {
        const { name, checked } = e.target;
        setForm((prev) => ({ ...prev, [name]: checked ? 1 : 0 }));
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
    };

    const [snack, setSnack] = useState({
        open: false,
        message: "",
        severity: "success", // success | error | warning | info
    });

    const handleCloseSnack = () => {
        setSnack((prev) => ({ ...prev, open: false }));
    };

    const handleSave = async () => {
        if (!studentNumber) {
            setSnack({
                open: true,
                message: "Please enter a student number first.",
                severity: "warning",
            });
            return;
        }

        try {
            await axios.put(`${API_BASE_URL}/api/physical-neuro`, {
                ...form,
                student_number: studentNumber,
            }, getAuditHeaders());

            setSnack({
                open: true,
                message: "Record saved successfully!",
                severity: "success",
            });

        } catch (err) {
            console.error(err);

            setSnack({
                open: true,
                message: "Failed to save record. Please try again.",
                severity: "error",
            });
        }
    };

    const links = [
        { key: "healthRecord", label: "Student Health Record", onClick: () => generateFormPdf("healthRecord") },
        { key: "medicalCertificate", label: "Medical Certificate", onClick: () => generateFormPdf("medicalCertificate") },
    ];

    const [generatingKey, setGeneratingKey] = useState(null); // "healthRecord" | "medicalCertificate"
    const hiddenFormRef = useRef();

    const FORM_CONFIGS = {
        healthRecord: {
            label: "Student Health Record",
            endpoint: "/api/generate-health-record-pdf",
            filenamePrefix: "Health_Record",
            Component: HealthRecord,
        },
        medicalCertificate: {
            label: "Medical Certificate",
            endpoint: "/api/generate-medical-certificate-pdf",
            filenamePrefix: "Medical_Certificate",
            Component: MedicalCertificate,
        },
    };

    const generateFormPdf = async (key) => {
        const config = FORM_CONFIGS[key];
        if (!config || generatingKey) return;

        if (!studentNumber) {
            setSnack({
                open: true,
                message: "Please search and select a student first.",
                severity: "warning",
            });
            return;
        }

        setGeneratingKey(key);

        try {
            // give the hidden component time to mount + finish its own fetch
            await new Promise((resolve) => setTimeout(resolve, 1000));

            const node = hiddenFormRef.current;
            if (!node) throw new Error(`${config.label} did not render in time.`);

            const response = await axios.post(
                `${API_BASE_URL}${config.endpoint}`,
                {
                    html: node.innerHTML,
                    student_number: studentNumber,
                    last_name: person?.last_name || "",
                    first_name: person?.first_name || "",
                },
                { responseType: "blob" },
            );

            const blob = new Blob([response.data], { type: "application/pdf" });
            const url = window.URL.createObjectURL(blob);
            const safeLast = (person?.last_name || "Student").replace(/\s+/g, "_");
            const fileName = `${config.filenamePrefix}_${safeLast}.pdf`;

            const link = document.createElement("a");
            link.href = url;
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (err) {
            console.error(`Error generating ${config.label} PDF:`, err);
            setSnack({
                open: true,
                message: `Unable to generate ${config.label} PDF right now.`,
                severity: "error",
            });
        } finally {
            setGeneratingKey(null);
        }
    };

    const fields = [
        { label: "Mental Status", check: "pne_mental_status_check", text: "pne_mental_status_text" },
        { label: "Sensory", check: "pne_sensory_check", text: "pne_sensory_text" },
        { label: "Cranial Nerve", check: "pne_cranial_nerve_check", text: "pne_cranial_nerve_text" },
        { label: "Cerebellar", check: "pne_cerebellar_check", text: "pne_cerebellar_text" },
        { label: "Motor", check: "pne_motor_check", text: "pne_motor_text" },
        { label: "Reflexes", check: "pne_reflexes_check", text: "pne_reflexes_text" },
    ];


    useEffect(() => {
        const queryParams = new URLSearchParams(location.search);
        const studentNumberFromUrl = queryParams.get("student_number")?.trim();
        const personIdFromUrl = queryParams.get("person_id")?.trim();

        if (studentNumberFromUrl) {
            setStudentNumber(studentNumberFromUrl);
            sessionStorage.setItem("edit_student_number", studentNumberFromUrl);
            return;
        }

        if (!personIdFromUrl) return;

        // fetch info of that person
        axios
            .get(`${API_BASE_URL}/api/student-person-data/${personIdFromUrl}`)
            .then((res) => {
                if (res.data?.student_number) {

                    // AUTO-INSERT applicant_number into search bar
                    setStudentNumber(res.data.student_number);
                    sessionStorage.setItem("edit_person_id", personIdFromUrl);
                    sessionStorage.setItem("edit_student_number", res.data.student_number);

                    // If you have a fetchUploads() or fetchExamScore() — call it
                }
            })
            .catch((err) => console.error("Auto search failed:", err));
    }, [location.search]);

    const [medicalData, setMedicalData] = useState(null);
    const [personResults, setPersonResults] = useState([]);



    // Fetch person by student number or name
    const fetchByStudentNumber = async (number) => {
        if (!number.trim()) return;

        try {
            console.log("🔍 Searching for:", number);
            const res = await axios.get(`${API_BASE_URL}/api/search-person-student`, {
                params: { query: number },
            });

            console.log("✅ API response:", res.data);

            if (res.data && res.data.student_number) {
                setPerson(res.data); // ✅ directly set the object
                fetchMedicalData(res.data.student_number);
            } else {
                alert("⚠️ No matching student found.");
                setPerson(null);
            }
        } catch (err) {
            console.error("❌ Error fetching student:", err.response?.data || err.message);
            alert("Student not found or error fetching data.");
            setPerson(null);
        }
    };

    // Handle Enter key
    const handleSearch = async (e) => {
        if (e.key === "Enter") {
            await fetchByStudentNumber(studentNumber);
        }
    };

    // Handle button click
    const handleSearchClick = async () => {
        await fetchByStudentNumber(studentNumber);
    };

    const fetchMedicalData = async (studentNumber) => {
        try {
            const res = await axios.get(`${API_BASE_URL}/api/medical-requirements/${studentNumber}`);
            setMedicalData(res.data);
            console.log("✅ Loaded medical data for:", studentNumber, res.data);
        } catch (err) {
            if (err.response?.status === 404) {
                console.warn(`ℹ️ No medical record found for ${studentNumber}`);
                setMedicalData(null);
            } else {
                console.error("❌ Failed to load medical data:", err);
            }
        }
    };


    // 🔍 Auto search when studentNumber changes
    useEffect(() => {
        const delayDebounce = setTimeout(async () => {
            if (!studentNumber.trim()) {
                setPerson(null);
                return;
            }

            try {
                console.log("🔍 Auto-searching:", studentNumber);
                const res = await axios.get(`${API_BASE_URL}/api/search-person-student`, {
                    params: { query: studentNumber },
                });

                if (res.data && res.data.student_number) {
                    setPerson(res.data);
                    fetchMedicalData(res.data.student_number);
                    console.log("✅ Auto-search success:", res.data);
                } else {
                    console.warn("⚠️ No student found.");
                    setPerson(null);
                }
            } catch (err) {
                console.error("❌ Auto-search failed:", err);
                setPerson(null);
            }
        }, 500); // ⏱️ 0.5 second debounce

        return () => clearTimeout(delayDebounce);
    }, [studentNumber]);




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
            {generatingKey && FORM_CONFIGS[generatingKey] && (
                <div ref={hiddenFormRef} style={{ position: "absolute", left: "-9999px", top: 0 }}>
                    {React.createElement(FORM_CONFIGS[generatingKey].Component, { studentNumber })}
                </div>
            )}
            <Box
                display="flex"
                justifyContent="space-between"
                alignItems="center"
                mb={2}
            >
                <Typography variant="h4"
                    sx={{
                        fontWeight: 'bold',
                        color: titleColor,
                        fontSize: '36px',
                    }}
                >
                    PHYSICAL AND NEUROLOGICAL EXAMINATION
                </Typography>


                <Box sx={{ position: "relative", width: 450 }}>
                    <TextField
                        variant="outlined"
                        placeholder="Search Student Name / Email / Applicant ID "
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
                    {renderStudentSuggestions()}
                </Box>

            </Box>

            <hr style={{ border: "1px solid #ccc", width: "100%" }} />

            <br />
            <br />

            <MedicalProcessTabs />

            <br />
            <br />


            <TableContainer component={Paper} sx={{ width: '100%', }}>
                <Table>
                    <TableHead sx={{ backgroundColor: headerColor, }}>
                        <TableRow>
                            {/* Left cell: Student Number */}
                            <TableCell sx={{ color: 'white', fontSize: '20px', fontFamily: "Poppins, sans-serif", border: 'none' }}>
                                Student Number:&nbsp;
                                <span style={{ fontFamily: "Poppins, sans-serif", fontWeight: "normal", textDecoration: "underline" }}>
                                    {person?.student_number || "N/A"}
                                </span>
                            </TableCell>

                            {/* Right cell: Student Name */}
                            <TableCell
                                align="right"
                                sx={{ color: 'white', fontSize: '20px', fontFamily: "Poppins, sans-serif", border: 'none' }}
                            >
                                Student Name:&nbsp;
                                <span style={{ fontFamily: "Poppins, sans-serif", fontWeight: "normal", textDecoration: "underline" }}>
                                    {person?.last_name?.toUpperCase()}, {person?.first_name?.toUpperCase()}{" "}
                                    {person?.middle_name?.toUpperCase()} {person?.extension?.toUpperCase() || ""}
                                </span>
                            </TableCell>
                        </TableRow>
                    </TableHead>
                </Table>
            </TableContainer>
            <Container
                maxWidth="100%"
                sx={{
                    backgroundColor: "#f1f1f1",
                    border: `1px solid ${borderColor}`,
                    padding: 4,

                    boxShadow: 3,
                }}
            >
                <Box
                    sx={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: 2,
                        mt: 2,
                        pb: 2,
                        justifyContent: "flex-end",
                        pr: 1,
                    }}
                >
                    {links.map((lnk, i) => {
                        const isGenerating = generatingKey === lnk.key;
                        const disabled = generatingKey !== null;

                        return (
                            <motion.div
                                key={lnk.key}
                                style={{ flex: "0 0 260px" }}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.1, duration: 0.4 }}
                            >
                                <Card
                                    sx={{
                                        minHeight: 60,
                                        borderRadius: 2,
                                        border: `1px solid ${borderColor}`,
                                        backgroundColor: "#fff",
                                        display: "flex",
                                        flexDirection: "row",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        textAlign: "center",
                                        p: 1.5,
                                        cursor: disabled ? "default" : "pointer",
                                        opacity: disabled && !isGenerating ? 0.5 : 1,
                                        pointerEvents: disabled ? "none" : "auto",
                                        transition: "all 0.3s ease-in-out",
                                        "&:hover": {
                                            transform: disabled ? "none" : "scale(1.05)",
                                            backgroundColor: disabled
                                                ? "#fff"
                                                : headerColor,

                                            "& .card-text": {
                                                color: disabled ? mainButtonColor : "#fff",
                                            },
                                            "& .card-icon": {
                                                color: disabled ? mainButtonColor : "#fff",
                                            },
                                        },
                                    }}
                                    onClick={() => {
                                        if (disabled) return;

                                        if (lnk.onClick) {
                                            lnk.onClick();
                                        } else if (lnk.to) {
                                            navigate(lnk.to);
                                        }
                                    }}
                                >
                                    {/* Icon / Loading */}
                                    {isGenerating ? (
                                        <CircularProgress
                                            size={26}
                                            sx={{ color: mainButtonColor, mr: 1.5 }}
                                        />
                                    ) : (
                                        <PictureAsPdfIcon
                                            className="card-icon"
                                            sx={{ fontSize: 35, color: mainButtonColor, mr: 1.5 }}
                                        />
                                    )}

                                    {/* Label */}
                                    <Typography
                                        className="card-text"
                                        sx={{
                                            color: mainButtonColor,
                                            fontFamily: "Poppins, sans-serif",
                                            fontWeight: "bold",
                                            fontSize: "0.85rem",
                                        }}
                                    >
                                        {isGenerating ? "Generating PDF..." : lnk.label}
                                    </Typography>
                                </Card>
                            </motion.div>
                        );
                    })}
                </Box>

                <Box sx={{ mb: 3 }}>
                    <Typography fontWeight="bold" sx={{ mb: 1 }}>
                        Describe Abnormal Findings
                    </Typography>
                    <Grid container spacing={1}>
                        {fields.map((field) => (
                            <Grid item xs={12} key={field.label}>
                                <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                                    <FormControlLabel
                                        control={
                                            <Checkbox
                                                checked={!!form[field.check]}
                                                onChange={handleCheckbox}
                                                name={field.check}
                                            />
                                        }
                                        label={field.label}
                                        sx={{ minWidth: 160 }}
                                    />
                                    <TextField
                                        name={field.text}
                                        value={form[field.text]}
                                        onChange={handleChange}
                                        size="small"
                                        fullWidth
                                    />
                                </Box>
                            </Grid>
                        ))}
                    </Grid>
                </Box>



                <Box sx={{ mb: 3 }}>
                    <Typography fontWeight={600} mb={0.5}>
                        FINDINGS / ASSESSMENT / PSYCHOLOGICAL:
                    </Typography>
                    <TextField
                        label="Findings / Assessment / Psychological"
                        name="pne_findings_psychological"
                        value={form.pne_findings_psychological}
                        onChange={handleChange}
                        fullWidth
                        multiline
                        rows={3}
                        margin="dense"
                    />
                    <Typography fontWeight={600} mb={0.5}>
                        RECOMMENDATIONS:
                    </Typography>
                    <TextField
                        label="Recommendations"
                        name="pne_recommendations"
                        value={form.pne_recommendations}
                        onChange={handleChange}
                        fullWidth
                        multiline
                        rows={3}
                        margin="dense"
                    />
                </Box>

                {/* 💾 Save Button */}
                <Box sx={{ textAlign: "left", pb: 2 }}>
                    <Button
                        variant="contained"
                        startIcon={<SaveIcon />}
                        onClick={handleSave}
                        sx={{
                            backgroundColor: '#primary', // maroon color
                            '&:hover': {
                                backgroundColor: '#000000', // darker maroon on hover
                            },
                        }}
                    >
                        Save Record
                    </Button>

                </Box>
            </Container>


            {/* ✅ Snackbar */}
            <Snackbar
                open={snack.open}
                autoHideDuration={4000}
                onClose={handleCloseSnack}
                anchorOrigin={{ vertical: "top", horizontal: "center" }}
            >
                <Alert
                    severity={snack.severity}
                    onClose={handleCloseSnack}
                    sx={{ width: "100%" }}
                >
                    {snack.message}
                </Alert>
            </Snackbar>
        </Box>
    );
};

export default PhysicalNeuroExam;




