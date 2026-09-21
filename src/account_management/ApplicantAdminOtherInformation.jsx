import React, { useState, useEffect, useContext, useRef } from "react";
import { SettingsContext } from "../App";
import axios from "axios";
import { Button, Box, TextField, Container, Typography, Card, TableContainer, Paper, Table, TableHead, TableRow, TableCell, FormHelperText, FormControl, InputLabel, Select, MenuItem, Modal, FormControlLabel, Checkbox, Snackbar, Alert, CircularProgress, } from "@mui/material";
import { Link, useLocation } from "react-router-dom";
import PersonIcon from "@mui/icons-material/Person";
import FamilyRestroomIcon from "@mui/icons-material/FamilyRestroom";
import SchoolIcon from "@mui/icons-material/School";
import HealthAndSafetyIcon from "@mui/icons-material/HealthAndSafety";
import InfoIcon from "@mui/icons-material/Info";
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import FolderIcon from '@mui/icons-material/Folder';
import ErrorIcon from '@mui/icons-material/Error';
import { useNavigate } from 'react-router-dom';
import { motion } from "framer-motion";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import ExamPermit from "../applicant/ExamPermit";
import Unauthorized from "../components/Unauthorized";
import LoadingOverlay from "../components/LoadingOverlay";
import AdminECATApplicationForm from "../admission/AdminECATApplicationForm";
import AdminOfficeOfTheRegistrar from "../admission/AdminOfficeOfTheRegistrar";
import AdminPersonalDataForm from "../admission/AdminPersonalDataForm";
import ApplicantServicesSurvey from "../applicant/ApplicantServicesSurvey";

import SaveIcon from '@mui/icons-material/Save';
import API_BASE_URL from "../apiConfig";
import EaristLogo from "../assets/EaristLogo.png";
import { getAuditConfig } from "../utils/auditEvents";
import useAccountAuditMac from "./useAccountAuditMac";
const ApplicantAdminOtherInformation = () => {
    useAccountAuditMac();
    const getAuditRequestConfig = (overrides = {}) => getAuditConfig(overrides);
    const getAuditHeaders = () =>
        getAuditConfig({
            "x-employee-id": employeeID || localStorage.getItem("employee_id") || "",
            "x-page-id": pageId,
            "x-audit-change-section": "other_information",
            "x-audit-actor-id":
                employeeID ||
                localStorage.getItem("employee_id") ||
                localStorage.getItem("person_id") ||
                localStorage.getItem("email") ||
                "unknown",
            "x-audit-actor-role": userRole || localStorage.getItem("role") || "administrator",
        });

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
    const [snack, setSnack] = useState({ open: false, message: "", severity: "info" });
    const [person, setPerson] = useState({
        termsOfAgreement: "",
    });



    const [hasAccess, setHasAccess] = useState(null);
    const [loading, setLoading] = useState(false);


    const pageId = 79;

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

            if (["administrator", "superadmin", "technical"].includes(storedRole)) {
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
            const response = await axios.get(`${API_BASE_URL}/api/page_access/${employeeID}/${pageId}`, { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` } });
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
        const allowedRoles = ["administrator", "superadmin", "technical"];
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
            const res = await axios.get(`${API_BASE_URL}/api/person_with_applicant/${personID}`, { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` } });
            setPerson(res.data);
            setSelectedPerson(res.data);
            if (res.data?.applicant_number) {
            }
        } catch (err) {
            console.error("❌ person_with_applicant failed:", err);
        }
    };



    const [activeStep, setActiveStep] = useState(4);
    const [clickedSteps, setClickedSteps] = useState([]);

    const steps = [
        { label: "Personal Information", icon: <PersonIcon />, path: "/applicant_admin_personal_information" },
        { label: "Family Background", icon: <FamilyRestroomIcon />, path: "/applicant_admin_family_background" },
        { label: "Educational Attainment", icon: <SchoolIcon />, path: "/applicant_admin_educational_attainment" },
        { label: "Health Medical Records", icon: <HealthAndSafetyIcon />, path: "/applicant_admin_health_medical_records" },
        { label: "Other Information", icon: <InfoIcon />, path: "/applicant_admin_other_information" },
    ];

    const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });
    const handleCloseSnackbar = () => setSnackbar((prev) => ({ ...prev, open: false }));

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

    // ✅ Auto-save update with correct applicant ID and safe SQL data
    const handleUpdate = async (updatedData) => {
        try {
            // ✅ Determine correct person_id to update (the applicant, not the admin)
            const targetId = selectedPerson?.person_id || queryPersonId || person.person_id;
            if (!targetId) {
                console.warn("⚠️ No valid applicant ID found — skipping update.");
                return;
            }

            // ✅ Proper MySQL-compatible date for created_at (YYYY-MM-DD)
            const currentDate = new Date();
            const formattedDate = currentDate.toISOString().split("T")[0]; // e.g., "2025-11-03"

            // ✅ Only allow valid fields (match your person_table)
            const allowedFields = [
                "person_id", "profile_img", "campus", "academicProgram", "classifiedAs", "applyingAs",
                "program", "program2", "program3", "yearLevel",
                "last_name", "first_name", "middle_name", "extension", "nickname",
                "height", "weight", "lrnNumber", "nolrnNumber", "gender",
                "pwdMember", "pwdType", "pwdId",
                "birthOfDate", "age", "birthPlace", "languageDialectSpoken",
                "citizenship", "religion", "civilStatus", "tribeEthnicGroup",
                "cellphoneNumber", "emailAddress",
                "presentStreet", "presentBarangay", "presentZipCode", "presentRegion",
                "presentProvince", "presentMunicipality", "presentDswdHouseholdNumber",
                "sameAsPresentAddress",
                "permanentStreet", "permanentBarangay", "permanentZipCode",
                "permanentRegion", "permanentProvince", "permanentMunicipality",
                "permanentDswdHouseholdNumber",
                "solo_parent",
                "father_deceased", "father_family_name", "father_given_name", "father_middle_name",
                "father_ext", "father_nickname", "father_education", "father_education_level",
                "father_last_school", "father_course", "father_year_graduated", "father_school_address",
                "father_contact", "father_occupation", "father_employer", "father_income", "father_email",
                "mother_deceased", "mother_family_name", "mother_given_name", "mother_middle_name",
                "mother_ext", "mother_nickname", "mother_education", "mother_education_level",
                "mother_last_school", "mother_course", "mother_year_graduated", "mother_school_address",
                "mother_contact", "mother_occupation", "mother_employer", "mother_income", "mother_email",
                "guardian", "guardian_family_name", "guardian_given_name", "guardian_middle_name",
                "guardian_ext", "guardian_nickname", "guardian_address", "guardian_contact", "guardian_email",
                "annual_income",
                "schoolLevel", "schoolLastAttended", "schoolAddress", "courseProgram",
                "honor", "generalAverage", "yearGraduated",
                "schoolLevel1", "schoolLastAttended1", "schoolAddress1", "courseProgram1",
                "honor1", "generalAverage1", "yearGraduated1",
                "strand",
                // 🩺 Health and medical
                "cough", "colds", "fever", "asthma", "faintingSpells", "heartDisease",
                "tuberculosis", "frequentHeadaches", "hernia", "chronicCough", "headNeckInjury",
                "hiv", "highBloodPressure", "diabetesMellitus", "allergies", "cancer",
                "smokingCigarette", "alcoholDrinking", "hospitalized", "hospitalizationDetails",
                "medications",
                // 🧬 Covid / Vaccination
                "hadCovid", "covidDate",
                "vaccine1Brand", "vaccine1Date", "vaccine2Brand", "vaccine2Date",
                "booster1Brand", "booster1Date", "booster2Brand", "booster2Date",
                // 🧪 Lab results / medical findings
                "chestXray", "cbc", "urinalysis", "otherworkups",
                // 🧍 Additional fields
                "symptomsToday", "remarks",
                // ✅ Agreement / Meta
                "termsOfAgreement", "created_at", "current_step"
            ];

            // ✅ Clean the payload — remove any unknown keys
            const cleanedData = Object.fromEntries(
                Object.entries(updatedData || person).filter(([key]) => allowedFields.includes(key))
            );

            // ✅ Ensure created_at is valid
            if (!cleanedData.created_at) cleanedData.created_at = formattedDate;

            // ✅ Execute update to backend
            await axios.put(`${API_BASE_URL}/api/person/${targetId}`, cleanedData, getAuditHeaders());
            console.log(`✅ Saved for applicant person_id: ${targetId}`);
        } catch (error) {
            console.error("❌ Save failed:", {
                message: error.message,
                status: error.response?.status,
                details: error.response?.data || error,
            });
            throw error;
        }
    };

    // Local form updates only (no auto-save)
    const handleChange = (e) => {
        const { name, type, checked, value } = e.target;

        const updatedValue = type === "checkbox" ? (checked ? 1 : 0) : value;

        const updatedPerson = {
            ...person,
            [name]: updatedValue,
        };

        setPerson(updatedPerson);
    };

    const [saving, setSaving] = useState(false);
    const handleManualSave = async () => {
        const targetId = selectedPerson?.person_id || queryPersonId || person?.person_id || userID;
        if (!targetId) {
            setSnackbar({ open: true, message: "No applicant selected.", severity: "warning" });
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



    // ✅ Safe handleBlur for SuperAdmin (updates correct applicant)
    const handleBlur = async () => {
        try {
            // ✅ Determine correct person_id to update (applicant)
            const targetId = selectedPerson?.person_id || queryPersonId || person.person_id;
            if (!targetId) {
                console.warn("⚠️ No valid applicant ID found — skipping update.");
                return;
            }

            // ✅ List of valid MySQL columns (from person_table)
            const allowedFields = [
                "profile_img", "campus", "academicProgram", "classifiedAs", "applyingAs",
                "program", "program2", "program3", "yearLevel",
                "last_name", "first_name", "middle_name", "extension", "nickname",
                "height", "weight", "lrnNumber", "nolrnNumber", "gender",
                "pwdMember", "pwdType", "pwdId", "birthOfDate", "age", "birthPlace",
                "languageDialectSpoken", "citizenship", "religion", "civilStatus",
                "tribeEthnicGroup", "cellphoneNumber", "emailAddress",
                "presentStreet", "presentBarangay", "presentZipCode",
                "presentRegion", "presentProvince", "presentMunicipality",
                "presentDswdHouseholdNumber", "sameAsPresentAddress",
                "permanentStreet", "permanentBarangay", "permanentZipCode",
                "permanentRegion", "permanentProvince", "permanentMunicipality",
                "permanentDswdHouseholdNumber",
                "father_family_name", "father_given_name", "father_middle_name",
                "father_ext", "father_nickname", "father_contact", "father_occupation",
                "father_employer", "father_income", "father_email",
                "mother_family_name", "mother_given_name", "mother_middle_name",
                "mother_ext", "mother_nickname", "mother_contact", "mother_occupation",
                "mother_employer", "mother_income", "mother_email",
                "guardian_family_name", "guardian_given_name", "guardian_middle_name",
                "guardian_ext", "guardian_nickname", "guardian_contact",
                "guardian_address", "guardian_email", "annual_income",
                "schoolLevel", "schoolLastAttended", "schoolAddress", "courseProgram",
                "honor", "generalAverage", "yearGraduated",
                "strand", "termsOfAgreement", "current_step"
            ];

            // ✅ Filter out invalid fields to prevent SQL errors
            const cleanedData = Object.fromEntries(
                Object.entries(person).filter(([key]) => allowedFields.includes(key))
            );

            if (Object.keys(cleanedData).length === 0) {
                console.warn("⚠️ No valid fields to update — skipping blur save.");
                return;
            }

            // ✅ Send update to backend
            await axios.put(`${API_BASE_URL}/api/person/${targetId}`, cleanedData, getAuditHeaders());
            console.log(`💾 Auto-saved (on blur) for person_id: ${targetId}`);
        } catch (err) {
            console.error("❌ Auto-save (on blur) failed:", {
                message: err.message,
                status: err.response?.status,
                details: err.response?.data || err,
            });
        }
    };


    const [errors, setErrors] = useState({});



    const handleClose = (_, reason) => {
        if (reason === 'clickaway') return;
        setSnack(prev => ({ ...prev, open: false }));
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


    const [generatingKey, setGeneratingKey] = useState(null); // "ecat" | "personalData" | "registrar" | "admissionServices" | "examPermitDownload"
    const hiddenFormRef = useRef();

    const FORM_CONFIGS = {
        ecat: {
            label: "ECAT Application Form",
            endpoint: "/api/generate-ecat-form-pdf",
            filenamePrefix: "ECAT_Application_Form",
            Component: AdminECATApplicationForm,
        },
        personalData: {
            label: "Personal Data Form",
            endpoint: "/api/generate-personal-data-form-pdf",
            filenamePrefix: "Personal_Data_Form",
            Component: AdminPersonalDataForm,
        },
        registrar: {
            label: `Application For ${shortTerm ? shortTerm.toUpperCase() : ""} College Admission`,
            endpoint: "/api/generate-registrar-form-pdf",
            filenamePrefix: "Office_Of_The_Registrar",
            Component: AdminOfficeOfTheRegistrar,
        },
        admissionServices: {
            label: "Application/Student Satisfactory Survey",
            endpoint: "/api/generate-admission-services-pdf",
            filenamePrefix: "Admission_Services_CSM_Form",
            Component: ApplicantServicesSurvey,
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

        // 🔒 Require a searched/selected applicant before generating anything
        if (!userID || !person?.person_id) {
            setSnackbar({
                open: true,
                message: "Please search and select an applicant first.",
                severity: "warning",
            });
            return;
        }

        setGeneratingKey(key);

        try {
            // give the hidden Admin component time to mount + finish its own
            // fetches for this applicant before we read its rendered HTML
            await new Promise((resolve) => setTimeout(resolve, 1000));

            const node = hiddenFormRef.current;
            if (!node) throw new Error(`${config.label} did not render in time.`);

            // ✅ FIX — sync live checkbox "checked" property onto the cloned markup
            // before serializing. node.innerHTML alone never reflects the DOM
            // property React set, so PDFs generated from it always show unchecked
            // boxes even when the database has values like gender/civilStatus set.
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
                    document_label: config.label,
                    audit_print_action: "PRINTING_APPLICANT_DOCS",
                    audit_actor_id: employeeID || localStorage.getItem("employee_id") || "unknown",
                    audit_actor_role: userRole || "administrator",
               
                },
                { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` }, responseType: "blob" },
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
            // Still audit when download fails (e.g. IDM intercept) so printing history is recorded.
            await logPrintingApplicantDocs(config.label, { failed: true });
            setSnackbar({
                open: true,
                message: `⚠️ Unable to generate ${config.label} PDF right now.`,
                severity: "error",
            });
        } finally {
            setGeneratingKey(null);
        }
    };


    const downloadExamPermitPDF = async () => {
        if (!userID || !person?.person_id) {
            setSnackbar({
                open: true,
                message: "Please search and select an applicant first.",
                severity: "warning",
            });
            return;
        }

        try {
            const res = await axios.get(`${API_BASE_URL}/api/verified-exam-applicants`, { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` } });
            const verified = res.data.some((a) => a.person_id === parseInt(userID));

            if (!verified) {
                setExamPermitError("❌ This applicant's documents are not yet verified.");
                setExamPermitModalOpen(true);
                return;
            }

            setGeneratingKey("examPermitDownload");
            setShowPrintView(true);
            await new Promise((resolve) => setTimeout(resolve, 800));

            const divToPrint = divToPrintRef.current;
            if (!divToPrint) throw new Error("Exam permit content did not render in time.");

            const response = await axios.post(
                `${API_BASE_URL}/api/generate-exam-permit-pdf`,
                {
                    html: divToPrint.innerHTML,
                    applicant_number: person?.applicant_number || "",
                    last_name: person?.last_name || "",
                    first_name: person?.first_name || "",
                },
                { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` }, responseType: "blob" },
            );

            const blob = new Blob([response.data], { type: "application/pdf" });
            const url = window.URL.createObjectURL(blob);
            const fileName = buildClientFilename("Exam_Permit", {
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
            console.error("Error downloading exam permit PDF:", err);
            setExamPermitError("⚠️ Unable to generate the Exam Permit PDF right now.");
            setExamPermitModalOpen(true);
        } finally {
            setShowPrintView(false);
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
        { key: "examPermitDownload", label: "Examination Permit", onClick: downloadExamPermitPDF },
    ];






    const [canPrintPermit, setCanPrintPermit] = useState(false);

    useEffect(() => {
        if (!userID) return;
        axios.get(`${API_BASE_URL}/api/verified-exam-applicants`, { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` } })
            .then(res => {
                const verified = res.data.some(a => a.person_id === parseInt(userID));
                setCanPrintPermit(verified);
            });
    }, [userID]);



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
                    OTHER INFORMATION
                </Typography>


            </Box>

            <hr style={{ border: "1px solid #ccc", width: "100%" }} />
            <br />
            <br />



            <TableContainer component={Paper} sx={{ width: '100%', mb: 1 }}>
                <Table>
                    <TableHead sx={{ backgroundColor: headerColor || "#1976d2", border: `1px solid ${borderColor}`, }}>
                        <TableRow>
                            {/* Left cell: Applicant ID */}
                            <TableCell sx={{ color: 'white', fontSize: '20px', fontFamily: "Poppins, sans-serif", border: 'none' }}>
                                Applicant ID:&nbsp;
                                <span style={{ fontFamily: "Poppins, sans-serif", fontWeight: "normal", textDecoration: "underline" }}>
                                    {person?.applicant_number || "N/A"}

                                </span>
                            </TableCell>

                            {/* Right cell: Applicant Name */}
                            <TableCell
                                align="right"
                                sx={{ color: 'white', fontSize: '20px', fontFamily: "Poppins, sans-serif", border: 'none' }}
                            >
                                Applicant Name:&nbsp;
                                <span style={{ fontFamily: "Poppins, sans-serif", fontWeight: "normal", textDecoration: "underline" }}>
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
                            fontFamily: "Poppins, sans-serif",
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
                      startIcon={<SaveIcon />}
                      disabled={saving || !(selectedPerson?.person_id || queryPersonId || person?.person_id || userID)}
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




            <Container maxWidth="lg">


                <Container>
                    <h1
                        style={{
                            fontSize: "50px",
                            fontWeight: "bold",
                            textAlign: "center",
                            color: subtitleColor,
                            marginTop: "25px",
                        }}
                    >
                        APPLICANT FORM
                    </h1>
                    <div style={{ textAlign: "center" }}>
                        Complete the applicant form to secure your place for the upcoming academic year at{" "}
                        {shortTerm ? (
                            <>
                                <strong>{shortTerm.toUpperCase()}</strong> <br />
                                {companyName || ""}
                            </>
                        ) : (
                            companyName || ""
                        )}
                        .
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
                    <Container maxWidth="100%" sx={{ backgroundColor: headerColor || "#1976d2", border: `1px solid ${borderColor}`, color: "white", borderRadius: 2, boxShadow: 3, padding: "4px" }}>
                        <Box sx={{ width: "100%" }}>
                            <Typography style={{ fontSize: "20px", padding: "10px", fontFamily: "Poppins, sans-serif" }}>Step 5: Other Information</Typography>
                        </Box>
                    </Container>
                    <Container maxWidth="100%" sx={{ backgroundColor: "#f1f1f1", border: `1px solid ${borderColor}`, padding: 4, borderRadius: 2, boxShadow: 3 }}>
                        <Typography style={{ fontSize: "20px", color: mainButtonColor, fontWeight: "bold" }}>
                            Other Information:
                        </Typography>
                        <hr style={{ border: "1px solid #ccc", width: "100%" }} />
                        <Typography style={{ fontWeight: "bold", textAlign: "Center" }}>
                            Data Subject Consent Form
                        </Typography>
                        < br />
                        <Typography style={{ fontSize: "12px", fontFamily: "Poppins, sans-serif", textAlign: "Left" }}>
                            In accordance with RA 10173 or Data Privacy Act of 2012, I give my consent to the following terms and conditions on the collection, use, processing, and disclosure of my personal data:
                        </Typography>
                        < br />
                        <Typography
                            style={{ fontSize: "12px", fontFamily: "Poppins, sans-serif", textAlign: "left" }}
                        >
                            1. I am aware that the{" "}
                            {companyName || "Your School Name"}{" "}
                            {shortTerm ? `(${shortTerm.toUpperCase()})` : ""}{" "}
                            has collected and stored my personal data during my admission/enrollment at{" "}
                            {shortTerm ? shortTerm.toUpperCase() : companyName || "the institution"}.
                            This data includes my demographic profile, contact details like home address,
                            email address, landline numbers, and mobile numbers.
                        </Typography>

                        <Typography style={{ fontSize: "12px", fontFamily: "Poppins, sans-serif", textAlign: "Left" }}>
                            2. I agree to personally update these data through personal request from the Office of the registrar.
                        </Typography>
                        <Typography
                            style={{ fontSize: "12px", fontFamily: "Poppins, sans-serif", textAlign: "left" }}
                        >
                            3. In consonance with the above stated Act, I am aware that the University will
                            protect my school records related to my being a student/graduate of{" "}
                            {shortTerm ? shortTerm.toUpperCase() : "the University"}. However, I have the
                            right to authorize a representative to claim the same subject to the policy of
                            the University.
                        </Typography>

                        <Typography style={{ fontSize: "12px", fontFamily: "Poppins, sans-serif", textAlign: "Left" }}>
                            4. In order to promote efficient management of the organization’s records, I authorize the University to manage my data for data sharing with industry partners, government agencies/embassies, other educational institutions, and other offices for the university for employment, statistics, immigration, transfer credentials, and other legal purposes that may serve me best.
                        </Typography>
                        < br />
                        <Typography style={{ fontSize: "12px", fontFamily: "Poppins, sans-serif", textAlign: "Left" }}>
                            By clicking the submit button, I warrant that I have read, understood all of the above provisions, and agreed to its full implementation.
                        </Typography>
                        <br />
                        <hr style={{ border: "1px solid #ccc", width: "100%" }} />
                        < br />
                        <Typography style={{ fontSize: "12px", fontFamily: "Poppins, sans-serif", textAlign: "Left" }}>
                            I certify that the information given above are true, complete, and accurate to the best of my knowledge and belief. I promise to abide by the rules and regulations of Eulogio "Amang" Rodriguez Institute of Science and Technology regarding the ECAT and my possible admission. I am aware that any false or misleading information and/or statement may result in the refusal or disqualification of my admission to the institution.
                        </Typography>

                        <FormControl required error={!!errors.termsOfAgreement} component="fieldset" sx={{ mb: 2 }}>
                            <FormControlLabel
                                control={
                                    <Checkbox
                                        name="termsOfAgreement"
                                        checked={person.termsOfAgreement === 1}
                                        onChange={handleChange}
                                    />
                                }
                                label="I agree Terms of Agreement"
                            />
                            {errors.termsOfAgreement && (
                                <FormHelperText>This field is required.</FormHelperText>
                            )}
                        </FormControl>

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
                                    width: { xs: "90%", sm: 420 },
                                    bgcolor: "background.paper",
                                    boxShadow: "0 24px 60px rgba(0,0,0,0.25)",
                                    borderRadius: "16px",
                                    overflow: "hidden",
                                }}
                            >
                                {/* Header bar */}
                                <Box
                                    sx={{
                                        bgcolor: mainButtonColor,
                                        color: "white",
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 1.5,
                                        px: 3,
                                        py: 2,
                                    }}
                                >
                                    <Box
                                        sx={{
                                            backgroundColor: "rgba(255,255,255,0.2)",
                                            borderRadius: "50%",
                                            width: 40,
                                            height: 40,
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            flexShrink: 0,
                                        }}
                                    >
                                        <ErrorIcon sx={{ fontSize: 22, color: "#fff" }} />
                                    </Box>
                                    <Box>
                                        <Typography
                                            id="exam-permit-error-title"
                                            fontWeight="bold"
                                            fontSize={16}
                                            color="white"
                                            lineHeight={1.2}
                                        >
                                            Exam Permit Notice
                                        </Typography>
                                        <Typography fontSize={12} color="rgba(255,255,255,0.8)" lineHeight={1.2}>
                                            Please review the message below
                                        </Typography>
                                    </Box>
                                </Box>

                                {/* Body */}
                                <Box sx={{ px: 3, pt: 3, pb: 1, textAlign: "center" }}>
                                    <Box sx={{ display: "flex", justifyContent: "center", mb: 2 }}>
                                        <Box
                                            sx={{
                                                width: 64,
                                                height: 64,
                                                borderRadius: "50%",
                                                backgroundColor: "rgba(255,255,255,0.9)",
                                                border: `3px solid ${mainButtonColor}`,
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                            }}
                                        >
                                            <ErrorIcon sx={{ color: mainButtonColor, fontSize: 30 }} />
                                        </Box>
                                    </Box>

                                    <Box
                                        sx={{
                                            border: `1.5px solid ${mainButtonColor}`,
                                            borderRadius: "12px",
                                            overflow: "hidden",
                                            mb: 1,
                                        }}
                                    >
                                        <Box sx={{ p: 2, backgroundColor: "#fafcff" }}>
                                            <Typography
                                                id="exam-permit-error-description"
                                                sx={{ fontSize: "13.5px", color: "#333", lineHeight: 1.65 }}
                                            >
                                                {examPermitError}
                                            </Typography>
                                        </Box>
                                    </Box>
                                </Box>

                                {/* Actions */}
                                <Box sx={{ px: 3, pb: 3, pt: 1.5 }}>
                                    <Button
                                        fullWidth
                                        onClick={handleCloseExamPermitModal}
                                        variant="contained"
                                        sx={{
                                            height: 44,
                                            borderRadius: "10px",
                                            backgroundColor: mainButtonColor,
                                            color: "#fff",
                                            fontWeight: 700,
                                            fontSize: 14,
                                            textTransform: "none",
                                            boxShadow: "none",
                                            "&:hover": {
                                                backgroundColor: "#8B0000",
                                                boxShadow: "none",
                                            },
                                        }}
                                    >
                                        Close
                                    </Button>
                                </Box>
                            </Box>
                        </Modal>







                        <Box display="flex" justifyContent="space-between" mt={4}>
                            {/* Previous Page Button */}
                            <Button
                                variant="contained"
                                onClick={() => {
                                    handleNavigateWithDelay(`/applicant_admin_health_medical_records?person_id=${userID}`);
                                }}
                                startIcon={<ArrowBackIcon sx={{ color: "#000", transition: "color 0.3s" }} />}
                                sx={{
                                    backgroundColor: subButtonColor,
                                    border: `1px solid ${borderColor}`,
                                    color: "#000",
                                    "&:hover": {
                                        backgroundColor: "#000000",
                                        color: "#fff",
                                        "& .MuiSvgIcon-root": { color: "#fff" },
                                    },
                                }}
                            >
                                Previous Step
                            </Button>
                            {/* Next Step (Submit) Button */}
                            <Button
                                variant="contained"
                                onClick={async () => {
                                    try {
                                        await handleUpdate(person);
                                        sessionStorage.setItem("admin_edit_person_data", JSON.stringify(person));
                                        setSnack({
                                            open: true,
                                            message:
                                                "Your account has been successfully registered! Wait for further announcement. Please upload your documents.",
                                            severity: "success",
                                        });
                                        setTimeout(() => {
                                            navigate("/applicant_online_requirements_admin");
                                        }, 2000);
                                    } catch (err) {
                                        setSnack({
                                            open: true,
                                            message: "Failed to save changes.",
                                            severity: "error",
                                        });
                                    }
                                }}
                                endIcon={
                                    <FolderIcon
                                        sx={{
                                            color: "#fff",
                                            transition: "color 0.3s",
                                        }}
                                    />
                                }
                                sx={{
                                    backgroundColor: mainButtonColor,
                                    border: `1px solid ${borderColor}`,
                                    color: '#fff',
                                    '&:hover': {
                                        backgroundColor: "#000000",
                                        color: '#fff',
                                        '& .MuiSvgIcon-root': {
                                            color: '#fff',
                                        },
                                    },
                                }}
                            >
                                Submit (Save Information)
                            </Button>


                        </Box>
                        <Snackbar
                            open={snackbar.open}
                            autoHideDuration={5000}
                            onClose={handleCloseSnackbar}
                            anchorOrigin={{ vertical: "top", horizontal: "center" }}
                        >
                            <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: "100%" }}>
                                {snackbar.message}
                            </Alert>
                        </Snackbar>

                    </Container>

                </form>

            </Container>


        </Box>

    );
};


export default ApplicantAdminOtherInformation;
