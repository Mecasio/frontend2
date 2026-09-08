import React, { useState, useEffect, useContext, useRef } from "react";
import { SettingsContext } from "../App";
import axios from "axios";
import { Button, Box, TextField, Container, CircularProgress, Typography, Card, TableContainer, Paper, Table, TableHead, TableRow, TableCell, FormHelperText, FormControl, InputLabel, Select, MenuItem, Modal, FormControlLabel, Checkbox, FormGroup, TableBody, } from "@mui/material";
import { Link, useLocation } from "react-router-dom";
import PersonIcon from "@mui/icons-material/Person";
import FamilyRestroomIcon from "@mui/icons-material/FamilyRestroom";
import SchoolIcon from "@mui/icons-material/School";
import HealthAndSafetyIcon from "@mui/icons-material/HealthAndSafety";
import InfoIcon from "@mui/icons-material/Info";
import ErrorIcon from '@mui/icons-material/Error';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { useNavigate } from 'react-router-dom';
import { motion } from "framer-motion";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import ExamPermit from "../applicant/ExamPermit";
import Unauthorized from "../components/Unauthorized";
import LoadingOverlay from "../components/LoadingOverlay";
import API_BASE_URL from "../apiConfig";
import EaristLogo from "../assets/EaristLogo.png";
import { getAuditConfig } from "../utils/auditEvents";
import useAccountAuditMac from "./useAccountAuditMac";
import { Snackbar, Alert } from "@mui/material";
import StudentECATApplicationForm from "../student/StudentECATApplicationForm";
import StudentPersonalDataForm from "../student/StudentPersonalDataForm";
import StudentOfficeOfTheRegistrar from "../student/StudentOfficeOfTheRegistrar";
import StudentServicesSurvey from "../student/StudentServicesSurvey";
import SaveIcon from '@mui/icons-material/Save';

const StudentAdminHealthMedicalRecords = () => {
    useAccountAuditMac();

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
            setFetchedLogo(`${assets.logoUrl}`);
        } else {
            setFetchedLogo(EaristLogo);
        }

        // 🏷️ School Information
        if (branding.companyName) setCompanyName(branding.companyName);
        if (branding.shortTerm) setShortTerm(branding.shortTerm);
        if (branding.campusAddress) setCampusAddress(branding.campusAddress);

    }, [settings]);

    const navigate = useNavigate();
    const [userID, setUserID] = useState("");
    const [user, setUser] = useState("");
    const [userRole, setUserRole] = useState("");
    const [person, setPerson] = useState({
        cough: "", colds: "", fever: "", asthma: "", faintingSpells: "", heartDisease: "", tuberculosis: "",
        frequentHeadaches: "", hernia: "", chronicCough: "", headNeckInjury: "", hiv: "", highBloodPressure: "",
        diabetesMellitus: "", allergies: "", cancer: "", smokingCigarette: "", alcoholDrinking: "", hospitalized: "",
        hospitalizationDetails: "", medications: "", hadCovid: "", covidDate: "",
        vaccine1Brand: "", vaccine1Date: "", vaccine2Brand: "", vaccine2Date: "",
        booster1Brand: "", booster1Date: "", booster2Brand: "", booster2Date: "",
        chestXray: "", cbc: "", urinalysis: "", otherworkups: "", symptomsToday: "", remarks: ""
    });


    const [hasAccess, setHasAccess] = useState(null);
    const [loading, setLoading] = useState(false);


    const pageId = 89;

    const [employeeID, setEmployeeID] = useState("");

    const getAuditHeaders = () =>
        getAuditConfig({
            "x-employee-id": employeeID || localStorage.getItem("employee_id") || "",
            "x-page-id": pageId,
            "x-audit-change-section": "health_information",
            "x-audit-actor-id":
                employeeID ||
                localStorage.getItem("employee_id") ||
                localStorage.getItem("person_id") ||
                localStorage.getItem("email") ||
                "unknown",
            "x-audit-actor-role": userRole || localStorage.getItem("role") || "registrar",
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
    const queryPersonId = queryParams.get("person_id");

    useEffect(() => {
        const storedUser = localStorage.getItem("email");
        const storedRole = localStorage.getItem("role");
        const loggedInPersonId = localStorage.getItem("person_id");
        const searchedPersonId = sessionStorage.getItem("admin_edit_person_id");

        if (!storedUser || !storedRole || !loggedInPersonId) {
            window.location.href = "/login";
            return;
        }

        setUser(storedUser);
        setUserRole(storedRole);

        // Roles that can access
        const allowedRoles = ["registrar", "applicant", "superadmin"];
        if (allowedRoles.includes(storedRole)) {
            // ✅ Always take URL param first
            const targetId = queryPersonId || searchedPersonId || loggedInPersonId;

            // Save it so other pages (ECAT, forms) can use it
            sessionStorage.setItem("admin_edit_person_id", targetId);

            setUserID(targetId);
            fetchByPersonId(targetId);
            return;
        }

        window.location.href = "/login";
    }, [queryPersonId]);


    const [selectedPerson, setSelectedPerson] = useState(null);

    const fetchByPersonId = async (personID) => {
        try {
            const res = await axios.get(`${API_BASE_URL}/api/enrollment_person/${personID}`);
            setPerson(res.data);
            setSelectedPerson(res.data);
            if (res.data?.applicant_number) {
                // optional: whatever logic you want
            }
        } catch (err) {
            console.error("❌ person (DB3) fetch failed:", err);
        }
    };

    const [explicitSelection, setExplicitSelection] = useState(false);


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
            const isFresh = source === "student_list" && Date.now() - ts < 5 * 60 * 3000;

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






    // Saves only when Save Changes is clicked
    const handleUpdate = async (updatedPerson) => {
        try {
            await axios.put(
                `${API_BASE_URL}/api/enrollment/person/${userID}`,
                updatedPerson,
                getAuditHeaders(),
            );
            console.log("✅ Saved to ENROLLMENT DB3");
        } catch (error) {
            console.error("❌ Save failed:", error);
            throw error;
        }
    };

    // Local form updates only (no auto-save)
    const handleChange = (e) => {
        const { name, type, checked, value } = e.target;
        const updatedPerson = {
            ...person,
            [name]: type === "checkbox" ? (checked ? 1 : 0) : value,
        };
        setPerson(updatedPerson);
    };

    const [activeStep, setActiveStep] = useState(3);
    const [clickedSteps, setClickedSteps] = useState([]);

    const steps = [
        { label: "Personal Information", icon: <PersonIcon />, path: "/student_admin_personal_information" },
        { label: "Family Background", icon: <FamilyRestroomIcon />, path: "/student_admin_family_background" },
        { label: "Educational Attainment", icon: <SchoolIcon />, path: "/student_admin_educational_attainment" },
        { label: "Health Medical Records", icon: <HealthAndSafetyIcon />, path: "/student_admin_health_medical_records" },
        { label: "Other Information", icon: <InfoIcon />, path: "/student_admin_other_information" },

    ];

    const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });
    const handleCloseSnackbar = () => setSnackbar((prev) => ({ ...prev, open: false }));
    const [saving, setSaving] = useState(false);
    const handleManualSave = async () => {
        if (!userID) {
            setSnackbar({ open: true, message: "No student selected.", severity: "warning" });
            return;
        }
        try {
            setSaving(true);
            await handleUpdate(person);
            sessionStorage.setItem("admin_edit_person_data", JSON.stringify(person));
            setSnackbar({ open: true, message: "All changes saved successfully!", severity: "success" });
        } catch (err) {
            setSnackbar({ open: true, message: "Failed to save changes.", severity: "error" });
        } finally {
            setSaving(false);
        }
    };

    const handleStepClick = (index) => {
        setActiveStep(index);
        setClickedSteps((prev) => [...new Set([...prev, index])]);
        setSnackbar({ open: true, message: "Your record has been saved successfully!", severity: "success" });
        navigate(steps[index].path);
    };

    const handleNavigateWithDelay = (path) => {
        setSnackbar({ open: true, message: "Saving your record, please wait...", severity: "info" });
        setTimeout(() => {
            setSnackbar({ open: true, message: "Your record has been saved successfully!", severity: "success" });
            setTimeout(() => {
                navigate(path);
            }, 1000);
        }, 2000);
    };

    const inputStyle = {
        width: "100%",
        border: "1px solid #ccc",
        borderRadius: "8px",
        padding: "6px",
        boxSizing: "border-box",
        backgroundColor: "white",
        color: "black",
    };


    const divToPrintRef = useRef();
    const [showPrintView, setShowPrintView] = useState(false);

    const printDiv = () => {
        const divToPrint = divToPrintRef.current;
        if (divToPrint) {
            const newWin = window.open("", "Print-Window");
            newWin.document.open();
            newWin.document.write(`
        <html>
          <head>
            <title>Examination Permit</title>
            <style>
              @page { size: A4; margin: 0; }
              body {
                margin: 0;
                padding: 0;
                display: flex;
                margin-left: "
                justify-content: center;
                align-items: center;
                min-height: 100vh;
              }
              .print-container {
                width: 8.5in;
                min-height: 11in;
                margin: auto;
                background: white;
              }
              * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            </style>
          </head>
          <body onload="window.print(); setTimeout(() => window.close(), 100);">
            <div class="print-container">${divToPrint.innerHTML}</div>
          </body>
        </html>
      `);
            newWin.document.close();
        }
    };


    const [examPermitError, setExamPermitError] = useState("");
    const [examPermitModalOpen, setExamPermitModalOpen] = useState(false);

    const handleCloseExamPermitModal = () => {
        setExamPermitModalOpen(false);
        setExamPermitError("");
    };

    const handleExamPermitClick = async () => {
        try {
            const res = await axios.get(`${API_BASE_URL}/api/verified-exam-applicants`);
            const verified = res.data.some(a => a.person_id === parseInt(userID));

            if (!verified) {
                setExamPermitError("❌ You cannot print the Exam Permit until all required documents are verified.");
                setExamPermitModalOpen(true);
                return;
            }

            // ✅ Render permit and print
            setShowPrintView(true);
            setTimeout(() => {
                printDiv();
                setShowPrintView(false);
            }, 500);
        } catch (err) {
            console.error("Error verifying exam permit eligibility:", err);
            setExamPermitError("⚠️ Unable to check document verification status right now.");
            setExamPermitModalOpen(true);
        }
    };




    const [generatingKey, setGeneratingKey] = useState(null); // "ecat" | "personalData" | "registrar" | "admissionServices" | "examPermitDownload"
    const hiddenFormRef = useRef();

    const FORM_CONFIGS = {
        ecat: {
            label: "ECAT Application Form",
            endpoint: "/api/generate-ecat-form-pdf",
            filenamePrefix: "ECAT_Application_Form",
            Component: StudentECATApplicationForm,
        },
        personalData: {
            label: "Personal Data Form",
            endpoint: "/api/generate-personal-data-form-pdf",
            filenamePrefix: "Personal_Data_Form",
            Component: StudentPersonalDataForm,
        },
        registrar: {
            label: `Application For ${shortTerm ? shortTerm.toUpperCase() : ""} College Admission`,
            endpoint: "/api/generate-registrar-form-pdf",
            filenamePrefix: "Office_Of_The_Registrar",
            Component: StudentOfficeOfTheRegistrar,
        },
        admissionServices: {
            label: "Application/Student Satisfactory Survey",
            endpoint: "/api/generate-admission-services-pdf",
            filenamePrefix: "Admission_Services_CSM_Form",
            Component: StudentServicesSurvey,
            dateStamped: true,
        },
    };

    const buildClientFilename = (prefix, { lastName, firstName, applicantNumber }) => {
        const safeLast = (lastName || "Applicant").trim().replace(/\s+/g, "_");
        const safeFirst = (firstName || "").trim().replace(/\s+/g, "_");
        const suffix = applicantNumber ? `_${applicantNumber}` : "";
        return `${prefix}_${safeLast}${safeFirst ? "_" + safeFirst : ""}${suffix}.pdf`;
    };

    const generateFormPdf = async (key) => {
        const config = FORM_CONFIGS[key];
        if (!config || generatingKey) return;

        // 🔒 Require a searched/selected student before generating anything
        if (!userID || !person?.person_id) {
            setSnack({
                open: true,
                message: "Please search and select a student first.",
                severity: "warning",
            });
            return;
        }

        // 🔑 The Student* form components read this exact sessionStorage key
        // (not a "personId" prop) to determine which student to fetch. Without
        // this, they fall back to the logged-in registrar's own person_id.
        sessionStorage.setItem("student_edit_person_id", userID);

        setGeneratingKey(key);

        try {
            // give the hidden Student component time to mount + finish its own
            // fetch for this student before we read its rendered HTML
            await new Promise((resolve) => setTimeout(resolve, 1000));

            const node = hiddenFormRef.current;
            if (!node) throw new Error(`${config.label} did not render in time.`);

            // ✅ FIX — React's `checked` is a DOM property, not an HTML attribute,
            // so it never shows up in node.innerHTML. Clone the node and manually
            // stamp "checked" onto the markup based on the live checkbox state
            // before serializing, otherwise every checkbox renders unchecked in
            // the generated PDF regardless of the actual database value.
            const clonedNode = node.cloneNode(true);
            const liveCheckboxes = node.querySelectorAll('input[type="checkbox"]');
            const clonedCheckboxes = clonedNode.querySelectorAll('input[type="checkbox"]');
            liveCheckboxes.forEach((liveBox, i) => {
                const clonedBox = clonedCheckboxes[i];
                if (liveBox.checked) {
                    clonedBox.setAttribute("checked", "checked");
                } else {
                    clonedBox.removeAttribute("checked");
                }
            });

            const response = await axios.post(
                `${API_BASE_URL}${config.endpoint}`,
                {
                    html: clonedNode.innerHTML, // ⬅️ was node.innerHTML
                    applicant_number: person?.applicant_number || "",
                    last_name: person?.last_name || "",
                    first_name: person?.first_name || "",
                    audit_actor_id: employeeID || localStorage.getItem("employee_id") || "unknown",
                    audit_actor_role: userRole || "registrar",
                },
                { responseType: "blob" },
            );

            const blob = new Blob([response.data], { type: "application/pdf" });
            const url = window.URL.createObjectURL(blob);

            const fileName = config.dateStamped
                ? `${config.filenamePrefix}_${new Date().toISOString().slice(0, 10)}.pdf`
                : buildClientFilename(config.filenamePrefix, {
                    lastName: person?.last_name,
                    firstName: person?.first_name,
                    applicantNumber: person?.applicant_number,
                });

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
                message: `⚠️ Unable to generate ${config.label} PDF right now.`,
                severity: "error",
            });
        } finally {
            setGeneratingKey(null);
        }
    };








    const links = [
        { key: "ecat", label: "ECAT Application Form", onClick: () => generateFormPdf("ecat") },
        { key: "personalData", label: "Personal Data Form", onClick: () => generateFormPdf("personalData") },
        {
            key: "registrar",
            label: `Application For ${shortTerm ? shortTerm.toUpperCase() : ""} College Admission`,
            onClick: () => generateFormPdf("registrar"),
        },
        { key: "admissionServices", label: "Application/Student Satisfactory Survey", onClick: () => generateFormPdf("admissionServices") },

    ];




    const [canPrintPermit, setCanPrintPermit] = useState(false);

    useEffect(() => {
        if (!userID) return;
        axios.get(`${API_BASE_URL}/api/verified-exam-applicants`)
            .then(res => {
                const verified = res.data.some(a => a.person_id === parseInt(userID));
                setCanPrintPermit(verified);
            });
    }, [userID]);



    const [searchQuery, setSearchQuery] = useState("");
    const [searchError, setSearchError] = useState("");
    useEffect(() => {
        const savedPerson = sessionStorage.getItem("admin_edit_person_data");
        if (savedPerson) {
            try {
                const parsed = JSON.parse(savedPerson);
                setPerson(parsed);
            } catch (err) {
                console.error("Failed to parse saved person:", err);
            }
        }
    }, []);


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


    // dot not alter
    return (
        <Box sx={{ height: "calc(100vh - 150px)", overflowY: "auto", paddingRight: 1, backgroundColor: "transparent", mt: 1, padding: 2 }}>

            {showPrintView && (
                <div
                    ref={divToPrintRef}
                    style={{
                        position: "absolute",
                        left: "-9999px",
                        top: 0,
                        width: "8.5in",
                        background: "#fff",
                    }}
                >
                    <ExamPermit personId={userID} />
                </div>
            )}
            {generatingKey && FORM_CONFIGS[generatingKey] && (
                <div ref={hiddenFormRef} style={{ position: "absolute", left: "-9999px", top: 0 }}>
                    {React.createElement(FORM_CONFIGS[generatingKey].Component, { personId: userID })}
                </div>
            )}




            {/* Top header: DOCUMENTS SUBMITTED + Search */}
            <Box
                sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',

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
                    HEALTH MEDICAL RECORDS
                </Typography>


            </Box>

            <hr style={{ border: "1px solid #ccc", width: "100%" }} />
            <br />
            <br />


            <TableContainer component={Paper} sx={{ width: '100%', mb: 1 }}>
                <Table>
                    <TableHead sx={{ backgroundColor: headerColor || "#1976d2", border: `1px solid ${borderColor}`, }}>
                        <TableRow>
                            {/* Left cell: Student Number */}
                            <TableCell sx={{ color: 'white', fontSize: '20px', fontFamily: "Arial", border: 'none' }}>
                                Student Number:&nbsp;
                                <span style={{ fontFamily: "Arial", fontWeight: "normal", textDecoration: "underline" }}>
                                    {person?.student_number || "N/A"}
                                </span>
                            </TableCell>

                            {/* Right cell: Student Name */}
                            <TableCell
                                align="right"
                                sx={{ color: 'white', fontSize: '20px', fontFamily: "Arial", border: 'none' }}
                            >
                                Student Name:&nbsp;
                                <span style={{ fontFamily: "Arial", fontWeight: "normal", textDecoration: "underline" }}>
                                    {person?.last_name?.toUpperCase()}, {person?.first_name?.toUpperCase()}{" "}
                                    {person?.middle_name?.toUpperCase()} {person?.extension?.toUpperCase() || ""}
                                </span>
                            </TableCell>
                        </TableRow>
                    </TableHead>
                </Table>
            </TableContainer>

            <Box
                sx={{
                    display: "flex",
                    justifyContent: "center",
                    width: "100%",
                    mt: 2,
                }}
            >
                <Box
                    sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 2,
                        p: 2,
                        borderRadius: "10px",
                        backgroundColor: "#fffaf5",
                        border: "1px solid #6D2323",
                        boxShadow: "0px 2px 8px rgba(0, 0, 0, 0.05)",
                        width: "100%",
                        overflow: "hidden",
                    }}
                >
                    {/* Icon */}
                    <Box
                        sx={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            backgroundColor: "#800000",
                            borderRadius: "8px",
                            width: 60,
                            height: 60,
                            flexShrink: 0,
                        }}
                    >
                        <ErrorIcon sx={{ color: "white", fontSize: 40 }} />
                    </Box>

                    {/* Text */}
                    <Typography
                        sx={{
                            fontSize: "20px",
                            fontFamily: "Arial",
                            color: "#3e3e3e",
                            lineHeight: 1.3, // slightly tighter to fit in fewer rows
                            whiteSpace: "normal",
                            overflow: "hidden",
                        }}
                    >
                        <strong style={{ color: "maroon" }}>Notice:</strong> &nbsp;
                        <strong></strong> <span style={{ fontSize: '1.2em', margin: '0 15px' }}>➔</span> Kindly type 'NA' in boxes where there are no possible answers to the information being requested. &nbsp;  &nbsp; <br />
                        <strong></strong> <span style={{ fontSize: '1.2em', margin: '0 15px', marginLeft: "100px", }}>➔</span> To make use of the letter 'Ñ', please press ALT while typing "165", while for 'ñ', please press ALT while typing "164"

                    </Typography>
                </Box>
            </Box>

            <Box
                sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 2,
                    mt: "25px",
                    px: 2,
                    position: "relative",
                }}
            >
                <h1
                    style={{
                        fontSize: "30px",
                        fontWeight: "bold",
                        textAlign: "center",
                        color: "black",
                        margin: 0,
                    }}
                >
                    PRINTABLE DOCUMENTS
                </h1>
                <Button
                    variant="contained"
                    onClick={handleManualSave}
                    disabled={saving || !userID}
                    startIcon={<SaveIcon />}
                    sx={{
                        position: "absolute",
                        right: 16,

                        textTransform: "none",
                        fontWeight: "bold",

                    }}
                >
                    {saving ? "Saving..." : "Save Changes"}
                </Button>
            </Box>





            {/* Cards Section */}


            <Box
                sx={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 2,
                    mt: 2,
                    pb: 1,
                    justifyContent: "center",
                }}
            >
                {links.map((lnk, i) => {
                    const isGenerating = generatingKey === lnk.key;
                    const disabled = generatingKey !== null;

                    return (
                        <motion.div
                            key={i}
                            style={{ flex: "0 0 calc(30% - 16px)" }}
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
                                            : headerColor || "#1976d2",

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






            <Container>


                <Container>
                    <h1 style={{ fontSize: "50px", fontWeight: "bold", textAlign: "center", color: subtitleColor, marginTop: "25px" }}>
                        STUDENT FORM
                    </h1>
                    <div style={{ textAlign: "center" }}>
                        Please update your personal information to keep your student records accurate and up to date for the upcoming academic year at{" "}
                        {shortTerm ? <><strong>{shortTerm.toUpperCase()}</strong> - {companyName || ""}</> : companyName || ""}.
                    </div>



                </Container>

                <br />

                <Box sx={{ display: "flex", justifyContent: "center", width: "100%", px: 4 }}>
                    {steps.map((step, index) => (
                        <React.Fragment key={index}>
                            {/* Wrap the step with Link for routing */}
                            <Link to={step.path} style={{ textDecoration: "none" }}>
                                <Box
                                    sx={{
                                        display: "flex",
                                        flexDirection: "column",
                                        alignItems: "center",
                                        cursor: "pointer",
                                    }}
                                    onClick={() => handleStepClick(index)}
                                >
                                    {/* Step Icon */}
                                    <Box
                                        sx={{
                                            width: 50,
                                            height: 50,
                                            borderRadius: "50%",
                                            border: `1px solid ${borderColor}`,
                                            backgroundColor: activeStep === index ? headerColor || "#1976d2" : "#E8C999",
                                            color: activeStep === index ? "#fff" : "#000",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                        }}
                                    >
                                        {step.icon}
                                    </Box>

                                    {/* Step Label */}
                                    <Typography
                                        sx={{
                                            mt: 1,
                                            color: activeStep === index ? "#6D2323" : "#000",
                                            fontWeight: activeStep === index ? "bold" : "normal",
                                            fontSize: 14,
                                        }}
                                    >
                                        {step.label}
                                    </Typography>
                                </Box>
                            </Link>

                            {/* Connector Line */}
                            {index < steps.length - 1 && (
                                <Box
                                    sx={{
                                        height: "2px",
                                        backgroundColor: mainButtonColor,
                                        flex: 1,
                                        alignSelf: "center",
                                        mx: 2,
                                    }}
                                />
                            )}
                        </React.Fragment>
                    ))}
                </Box>
                <br />

                <form>
                    <Container
                        maxWidth="100%"
                        sx={{
                            backgroundColor: headerColor || "#1976d2",
                            border: `1px solid ${borderColor}`,
                            maxHeight: "500px",
                            overflowY: "auto",
                            color: "white",
                            borderRadius: 2,
                            boxShadow: 3,
                            padding: "4px",
                        }}
                    >
                        <Box sx={{ width: "100%" }}>
                            <Typography style={{ fontSize: "20px", padding: "10px", fontFamily: "Arial" }}>Step 4: Health and Medical Records</Typography>
                        </Box>
                    </Container>

                    <Container maxWidth="100%" sx={{ backgroundColor: "#f1f1f1", border: `1px solid ${borderColor}`, padding: 4, borderRadius: 2, boxShadow: 3 }}>
                        <Typography style={{ fontSize: "20px", color: mainButtonColor, fontWeight: "bold" }}>Health and Mecidal Record:</Typography>
                        <hr style={{ border: "1px solid #ccc", width: "100%" }} />
                        <br />


                        <Typography variant="subtitle1" mb={1}>
                            <div style={{ fontWeight: "bold" }}>I. Do you have any of the following symptoms today?</div>
                        </Typography>

                        <FormGroup row sx={{ ml: 2 }}>
                            {["cough", "colds", "fever"].map((symptom) => (
                                <FormControlLabel
                                    key={symptom}
                                    control={
                                        <Checkbox
                                            name={symptom}
                                            checked={person[symptom] === 1}
                                            onChange={(e) => {
                                                const { name, checked } = e.target;
                                                const updatedPerson = {
                                                    ...person,
                                                    [name]: checked ? 1 : 0,
                                                };
                                                setPerson(updatedPerson);

                                            }}
                                        />
                                    }
                                    label={symptom.charAt(0).toUpperCase() + symptom.slice(1)}
                                    sx={{ ml: 5 }}
                                />
                            ))}
                        </FormGroup>

                        <br />

                        <Typography variant="subtitle1" mb={1}>
                            <div style={{ fontWeight: "bold" }}>II. MEDICAL HISTORY: Have you suffered from, or been told you had, any of the following conditions:</div>
                        </Typography>


                        <table
                            style={{
                                width: "100%",
                                border: "1px solid black",
                                borderCollapse: "collapse",
                                fontFamily: "Arial, Helvetica, sans-serif",
                                tableLayout: "fixed",
                            }}
                        >
                            <tbody>
                                {/* Headers */}
                                <tr>
                                    <td colSpan={15} style={{ border: "1px solid black", height: "0.25in" }}></td>
                                    <td colSpan={12} style={{ border: "1px solid black", textAlign: "center" }}>Yes or No</td>
                                    <td colSpan={15} style={{ border: "1px solid black", height: "0.25in" }}></td>
                                    <td colSpan={12} style={{ border: "1px solid black", textAlign: "center" }}>Yes or No</td>
                                    <td colSpan={15} style={{ border: "1px solid black", height: "0.25in" }}></td>
                                    <td colSpan={12} style={{ border: "1px solid black", textAlign: "center" }}>Yes or No</td>
                                </tr>

                                {[
                                    { label: "Asthma", key: "asthma" },
                                    { label: "Fainting Spells and seizures", key: "faintingSpells" },
                                    { label: "Heart Disease", key: "heartDisease" },
                                    { label: "Tuberculosis", key: "tuberculosis" },
                                    { label: "Frequent Headaches", key: "frequentHeadaches" },
                                    { label: "Hernia", key: "hernia" },
                                    { label: "Chronic cough", key: "chronicCough" },
                                    { label: "Head or neck injury", key: "headNeckInjury" },
                                    { label: "H.I.V", key: "hiv" },
                                    { label: "High blood pressure", key: "highBloodPressure" },
                                    { label: "Diabetes Mellitus", key: "diabetesMellitus" },
                                    { label: "Allergies", key: "allergies" },
                                    { label: "Cancer", key: "cancer" },
                                    { label: "Smoking of cigarette/day", key: "smokingCigarette" },
                                    { label: "Alcohol Drinking", key: "alcoholDrinking" },
                                ]
                                    .reduce((rows, item, idx, arr) => {
                                        if (idx % 3 === 0) rows.push(arr.slice(idx, idx + 3));
                                        return rows;
                                    }, [])
                                    .map((rowGroup, rowIndex) => (
                                        <tr key={rowIndex}>
                                            {rowGroup.map(({ label, key }) => (
                                                <React.Fragment key={key}>
                                                    <td colSpan={15} style={{ border: "1px solid black", padding: "4px" }}>{label}</td>
                                                    <td colSpan={12} style={{ border: "1px solid black", padding: "4px" }}>
                                                        <div style={{ display: "flex", flexDirection: "column", gap: "1px" }}>
                                                            <div style={{ display: "flex", alignItems: "center", gap: "2px", marginLeft: "10px" }}>
                                                                {/* YES */}
                                                                <div style={{ display: "flex", alignItems: "center", gap: "1px", }}>
                                                                    <Checkbox
                                                                        name={key}
                                                                        checked={person[key] === 1}
                                                                        onChange={() => {
                                                                            const updatedPerson = {
                                                                                ...person,
                                                                                [key]: person[key] === 1 ? null : 1,
                                                                            };
                                                                            setPerson(updatedPerson);

                                                                        }}
                                                                    />
                                                                    <span style={{ fontSize: "15px", fontFamily: "Arial" }}>Yes</span>
                                                                </div>

                                                                {/* NO */}
                                                                <div style={{ display: "flex", alignItems: "center", gap: "1px" }}>
                                                                    <Checkbox
                                                                        name={key}
                                                                        checked={person[key] === 0}
                                                                        onChange={() => {
                                                                            const updatedPerson = {
                                                                                ...person,
                                                                                [key]: person[key] === 0 ? null : 0,
                                                                            };
                                                                            setPerson(updatedPerson);

                                                                        }}
                                                                    />
                                                                    <span style={{ fontSize: "15px", fontFamily: "Arial" }}>No</span>
                                                                </div>
                                                            </div>


                                                        </div>
                                                    </td>
                                                </React.Fragment>
                                            ))}
                                        </tr>
                                    ))}
                            </tbody>
                        </table>



                        <Box mt={1} flexDirection="column" display="flex" alignItems="flex-start">
                            <Box mt={1} flexDirection="column" display="flex" alignItems="flex-start">
                                <Box display="flex" alignItems="center" flexWrap="wrap">
                                    <Typography sx={{ marginRight: '16px' }}>
                                        Do you have any previous history of hospitalization or operation?
                                    </Typography>

                                    <Box display="flex" gap="16px" ml={4} alignItems="center">
                                        {/* YES */}
                                        <FormControlLabel
                                            control={
                                                <Checkbox
                                                    name="hospitalized"
                                                    checked={person.hospitalized === 1}
                                                    onChange={() => {
                                                        const updatedPerson = {
                                                            ...person,
                                                            hospitalized: person.hospitalized === 1 ? null : 1,
                                                        };
                                                        setPerson(updatedPerson);

                                                    }}
                                                />
                                            }
                                            label="Yes"
                                        />

                                        {/* NO */}
                                        <FormControlLabel
                                            control={
                                                <Checkbox
                                                    name="hospitalized"
                                                    checked={person.hospitalized === 0}
                                                    onChange={() => {
                                                        const updatedPerson = {
                                                            ...person,
                                                            hospitalized: person.hospitalized === 0 ? null : 0,
                                                        };
                                                        setPerson(updatedPerson);

                                                    }}
                                                />
                                            }
                                            label="No"
                                        />


                                    </Box>
                                </Box>
                            </Box>
                        </Box>




                        <Box width="100%" maxWidth={500} display="flex" alignItems="center">
                            <Typography component="label" sx={{ mr: 1, whiteSpace: 'nowrap' }}>
                                IF YES, PLEASE SPECIFY:
                            </Typography>
                            <TextField
                                fullWidth
                                name="hospitalizationDetails"
                                placeholder=""
                                variant="outlined"
                                size="small"
                                value={person.hospitalizationDetails || ""}
                                onChange={(e) => {
                                    const { name, value } = e.target;
                                    const updatedPerson = {
                                        ...person,
                                        [name]: value,
                                    };
                                    setPerson(updatedPerson);

                                }}
                            />
                        </Box>

                        <br />

                        <Typography variant="subtitle1" mb={1}>
                            <div style={{ fontWeight: "bold" }}>III. MEDICATION</div>
                        </Typography>



                        <Box mb={2}>
                            <TextField
                                fullWidth
                                multiline
                                minRows={3}
                                name="medications"
                                variant="outlined"
                                size="small"
                                value={person.medications || ""}
                                onChange={(e) => {
                                    const { name, value } = e.target;
                                    const updatedPerson = {
                                        ...person,
                                        [name]: value,
                                    };
                                    setPerson(updatedPerson);

                                }}
                            />
                        </Box>

                        {/* IV. COVID PROFILE */}
                        <Typography variant="subtitle1" mb={1}>
                            <div style={{ fontWeight: "bold" }}>IV. COVID PROFILE: </div>
                        </Typography>


                        <table
                            style={{
                                border: "1px solid black",
                                borderCollapse: "collapse",
                                fontFamily: "Arial, Helvetica, sans-serif",
                                width: "100%",
                                tableLayout: "fixed",
                            }}
                        >
                            <tbody>
                                <tr>
                                    <td
                                        style={{
                                            height: "90px",
                                            fontSize: "100%",
                                            border: "1px solid black",
                                            padding: "8px",
                                        }}
                                    >

                                        <Box display="flex" alignItems="center" gap={2} flexWrap="nowrap">
                                            <Typography>A. Do you have history of COVID-19?</Typography>

                                            {/* YES/NO Checkboxes */}
                                            <Box display="flex" alignItems="center" gap="10px" ml={1}>
                                                {/* YES */}
                                                <Box display="flex" alignItems="center" gap="1px">
                                                    <Checkbox
                                                        name="hadCovid"
                                                        checked={person.hadCovid === 1}
                                                        onChange={() => {
                                                            const updatedPerson = {
                                                                ...person,
                                                                hadCovid: person.hadCovid === 1 ? null : 1,
                                                            };
                                                            setPerson(updatedPerson);

                                                        }}
                                                    />
                                                    <span style={{ fontSize: "15px", fontFamily: "Arial" }}>YES</span>
                                                </Box>

                                                {/* NO */}
                                                <Box display="flex" alignItems="center" gap="1px">
                                                    <Checkbox
                                                        name="hadCovid"
                                                        checked={person.hadCovid === 0}
                                                        onChange={() => {
                                                            const updatedPerson = {
                                                                ...person,
                                                                hadCovid: person.hadCovid === 0 ? null : 0,
                                                            };
                                                            setPerson(updatedPerson);

                                                        }}
                                                    />
                                                    <span style={{ fontSize: "15px", fontFamily: "Arial" }}>NO</span>


                                                </Box>
                                            </Box>

                                            {/* IF YES, WHEN */}
                                            <span>IF YES, WHEN:</span>
                                            <input
                                                type="date"
                                                name="covidDate"
                                                value={person.covidDate || ""}
                                                onChange={(e) => {
                                                    const updatedPerson = {
                                                        ...person,
                                                        covidDate: e.target.value,
                                                    };
                                                    setPerson(updatedPerson);

                                                }}
                                                style={{
                                                    width: "200px",
                                                    height: "50px",
                                                    fontSize: "16px",
                                                    padding: "10px",
                                                    border: "1px solid #ccc",
                                                    borderRadius: "4px",
                                                }}
                                            />
                                        </Box>
                                    </td>
                                </tr>

                                <tr>
                                    <td
                                        style={{
                                            fontSize: "100%",
                                            border: "1px solid black",
                                            padding: "8px",
                                        }}
                                    >
                                        <div style={{ marginBottom: "8px" }}>
                                            B. COVID Vaccinations:
                                        </div>
                                        <table
                                            style={{
                                                borderCollapse: "collapse",
                                                width: "100%",
                                                fontFamily: "Arial, Helvetica, sans-serif",
                                                tableLayout: "fixed",
                                            }}
                                        >
                                            <thead>
                                                <tr>
                                                    <th style={{ textAlign: "left", width: "20%" }}></th>
                                                    <th style={{ textAlign: "center" }}>1st Dose</th>
                                                    <th style={{ textAlign: "center" }}>2nd Dose</th>
                                                    <th style={{ textAlign: "center" }}>Booster 1</th>
                                                    <th style={{ textAlign: "center" }}>Booster 2</th>
                                                </tr>
                                            </thead>

                                            <tbody>
                                                {/* Brand Row */}
                                                <tr>
                                                    <td style={{ padding: "4px 0" }}>Brand</td>

                                                    {["vaccine1Brand", "vaccine2Brand", "booster1Brand", "booster2Brand"].map((field) => (
                                                        <td key={field} style={{ padding: "4px" }}>
                                                            <input
                                                                type="text"
                                                                name={field}
                                                                value={person[field] || ""}
                                                                onChange={(e) => {
                                                                    const updatedPerson = {
                                                                        ...person,
                                                                        [field]: e.target.value,
                                                                    };
                                                                    setPerson(updatedPerson);

                                                                }}
                                                                style={inputStyle}
                                                            />
                                                        </td>
                                                    ))}
                                                </tr>

                                                {/* Date Row */}
                                                <tr>
                                                    <td style={{ padding: "4px 0" }}>Date</td>

                                                    {["vaccine1Date", "vaccine2Date", "booster1Date", "booster2Date"].map((field) => (
                                                        <td key={field} style={{ padding: "4px" }}>
                                                            <input
                                                                type="date"
                                                                name={field}
                                                                value={person[field] || ""}
                                                                onChange={(e) => {
                                                                    const updatedPerson = {
                                                                        ...person,
                                                                        [field]: e.target.value,
                                                                    };
                                                                    setPerson(updatedPerson);

                                                                }}
                                                                style={inputStyle}
                                                            />
                                                        </td>
                                                    ))}
                                                </tr>
                                            </tbody>
                                        </table>

                                    </td>
                                </tr>

                            </tbody>
                        </table>

                        <br />
                        {/* V. Please Indicate Result of the Following (Form Style, Table Layout) */}
                        <Typography variant="subtitle1" mb={1}>
                            <div style={{ fontWeight: "bold" }}>V. Please Indicate Result of the Following:</div>
                        </Typography>


                        <table className="w-full border border-black border-collapse table-fixed">
                            <tbody>
                                {/* Chest X-ray */}
                                <tr>
                                    <td className="border border-black p-2 w-1/3 font-medium">Chest X-ray:</td>
                                    <td className="border border-black p-2 w-2/3">
                                        <input
                                            type="text"
                                            name="chestXray"
                                            value={person.chestXray || ""}
                                            onChange={(e) => {
                                                const { name, value } = e.target;
                                                const updatedPerson = { ...person, [name]: value };
                                                setPerson(updatedPerson);

                                            }}
                                            className="w-full border px-3 py-2 rounded"
                                        />
                                    </td>
                                </tr>

                                {/* CBC */}
                                <tr>
                                    <td className="border border-black p-2 font-medium">CBC:</td>
                                    <td className="border border-black p-2">
                                        <input
                                            type="text"
                                            name="cbc"
                                            value={person.cbc || ""}
                                            onChange={(e) => {
                                                const { name, value } = e.target;
                                                const updatedPerson = { ...person, [name]: value };
                                                setPerson(updatedPerson);

                                            }}
                                            className="w-full border px-3 py-2 rounded"
                                        />
                                    </td>
                                </tr>

                                {/* Urinalysis */}
                                <tr>
                                    <td className="border border-black p-2 font-medium">Urinalysis:</td>
                                    <td className="border border-black p-2">
                                        <input
                                            type="text"
                                            name="urinalysis"
                                            value={person.urinalysis || ""}
                                            onChange={(e) => {
                                                const { name, value } = e.target;
                                                const updatedPerson = { ...person, [name]: value };
                                                setPerson(updatedPerson);

                                            }}
                                            className="w-full border px-3 py-2 rounded"
                                        />
                                    </td>
                                </tr>

                                {/* Other Workups */}
                                <tr>
                                    <td className="border border-black p-2 font-medium">Other Workups:</td>
                                    <td className="border border-black p-2">
                                        <input
                                            type="text"
                                            name="otherworkups"
                                            value={person.otherworkups || ""}
                                            onChange={(e) => {
                                                const { name, value } = e.target;
                                                const updatedPerson = { ...person, [name]: value };
                                                setPerson(updatedPerson);

                                            }}
                                            className="w-full border px-3 py-2 rounded"
                                        />
                                    </td>
                                </tr>
                            </tbody>
                        </table>



                        <div style={{ marginTop: "16px" }}>
                            <Typography variant="subtitle1" mb={1}>
                                <div style={{ fontWeight: "bold" }}>VI. Diagnosis :</div>
                            </Typography>

                            <table
                                style={{
                                    width: "100%",
                                    border: "1px solid black",
                                    borderCollapse: "collapse",
                                    fontFamily: "Arial, Helvetica, sans-serif",
                                    tableLayout: "fixed",
                                }}
                            >
                                <tbody>
                                    <tr>
                                        <td
                                            style={{
                                                height: "auto",
                                                fontSize: "100%",
                                                border: "1px solid black",
                                                padding: "8px",
                                            }}
                                        >
                                            {/* Question */}
                                            <Typography sx={{ fontSize: "15px", fontFamily: "Arial", marginBottom: "4px" }}>
                                                Do you have any of the following symptoms today?
                                            </Typography>

                                            {/* Answer checkboxes below (YES/NO) */}
                                            <div style={{ display: "flex", alignItems: "center", gap: "20px", marginTop: "8px" }}>
                                                {/* Physically Fit (0) */}
                                                <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                                                    <Checkbox
                                                        name="symptomsToday"
                                                        checked={person.symptomsToday === 0}
                                                        onChange={() => {
                                                            const updatedPerson = {
                                                                ...person,
                                                                symptomsToday: person.symptomsToday === 0 ? null : 0,
                                                            };
                                                            setPerson(updatedPerson);

                                                        }}
                                                    />
                                                    <span style={{ fontSize: "15px", fontFamily: "Arial" }}>Physically Fit</span>
                                                </div>

                                                {/* For Compliance (1) */}
                                                <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                                                    <Checkbox
                                                        name="symptomsToday"
                                                        checked={person.symptomsToday === 1}
                                                        onChange={() => {
                                                            const updatedPerson = {
                                                                ...person,
                                                                symptomsToday: person.symptomsToday === 1 ? null : 1,
                                                            };
                                                            setPerson(updatedPerson);

                                                        }}
                                                    />
                                                    <span style={{ fontSize: "15px", fontFamily: "Arial" }}>For Compliance</span>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>


                        {/* VII. Remarks Section */}
                        <div style={{ marginTop: "16px" }}>
                            <Typography variant="subtitle1" fontWeight="bold" mb={1}>
                                VII. Remarks:
                            </Typography>
                            <Table
                                sx={{
                                    width: "100%",
                                    border: "1px solid black",
                                    borderCollapse: "collapse",
                                    tableLayout: "fixed",
                                }}
                            >
                                <TableBody>
                                    <TableRow>
                                        <TableCell sx={{ border: "1px solid black", p: 1 }}>
                                            <TextField
                                                name="remarks"
                                                multiline
                                                minRows={2}
                                                fullWidth
                                                size="small"
                                                value={person.remarks || ""}
                                                onChange={(e) => {
                                                    const updatedPerson = {
                                                        ...person,
                                                        remarks: e.target.value,
                                                    };
                                                    setPerson(updatedPerson);

                                                }}
                                                sx={{
                                                    backgroundColor: "white",
                                                    borderRadius: "8px",
                                                    '& .MuiOutlinedInput-root': {
                                                        padding: '4px 8px',
                                                    },
                                                    '& .MuiInputBase-multiline': {
                                                        padding: 0,
                                                    },
                                                }}
                                            />
                                        </TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </div>

                        <Modal
                            open={examPermitModalOpen}
                            onClose={handleCloseExamPermitModal}
                            aria-labelledby="exam-permit-error-title"
                            aria-describedby="exam-permit-error-description"
                        >
                            <Box
                                sx={{
                                    position: "absolute",
                                    top: "50%",
                                    left: "50%",
                                    transform: "translate(-50%, -50%)",
                                    width: 400,
                                    bgcolor: "background.paper",
                                    border: `1px solid ${borderColor}`,
                                    boxShadow: 24,
                                    p: 4,
                                    borderRadius: 2,
                                    textAlign: "center",
                                }}
                            >
                                <ErrorIcon sx={{ color: mainButtonColor, fontSize: 50, mb: 2 }} />
                                <Typography id="exam-permit-error-title" variant="h6" component="h2" color="maroon">
                                    Exam Permit Notice
                                </Typography>
                                <Typography id="exam-permit-error-description" sx={{ mt: 2 }}>
                                    {examPermitError}
                                </Typography>
                                <Button
                                    onClick={handleCloseExamPermitModal}
                                    variant="contained"
                                    sx={{ mt: 3, backgroundcolor: mainButtonColor, "&:hover": { backgroundColor: "#8B0000" } }}
                                >
                                    Close
                                </Button>
                            </Box>
                        </Modal>







                        <Box display="flex" justifyContent="space-between" alignItems="center" mt={4}>
                            <Button
                                variant="contained"
                                onClick={() => {

                                    handleNavigateWithDelay(`/student_admin_educational_attainment?person_id=${userID}`);
                                }}
                                startIcon={<ArrowBackIcon sx={{ color: "#000", transition: "color 0.3s" }} />}
                                sx={{
                                    backgroundColor: subButtonColor,
                                    border: `1px solid ${borderColor}`,
                                    color: "#000",
                                    "&:hover": { backgroundColor: "#000000", color: "#fff", "& .MuiSvgIcon-root": { color: "#fff" } },
                                }}
                            >
                                Previous Step
                            </Button>

                            <Button
                                variant="contained"
                                onClick={() => {

                                    handleNavigateWithDelay(`/student_admin_other_information?person_id=${userID}`);
                                }}
                                endIcon={<ArrowForwardIcon sx={{ color: "#fff", transition: "color 0.3s" }} />}
                                sx={{
                                    backgroundColor: mainButtonColor,
                                    border: `1px solid ${borderColor}`,
                                    color: '#fff',
                                    '&:hover': { backgroundColor: "#000000", color: '#fff', '& .MuiSvgIcon-root': { color: '#fff' } },
                                }}
                            >
                                Next Step
                            </Button>
                        </Box>



                    </Container>
                </form>
            </Container>

            <Snackbar
                open={snackbar.open}
                autoHideDuration={3000}
                onClose={handleCloseSnackbar}
                anchorOrigin={{ vertical: "top", horizontal: "center" }}
            >
                <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: "100%" }}>
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Box>
    );
};


export default StudentAdminHealthMedicalRecords;
