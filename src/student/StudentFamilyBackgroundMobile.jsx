import React, { useState, useEffect, useContext, useRef } from "react";
import { SettingsContext } from "../App";
import axios from "axios";
import {
  Button,
  Box,
  Card,
  Typography,
  Snackbar,
  Alert,
  useTheme,
  useMediaQuery,

} from "@mui/material";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import PersonIcon from "@mui/icons-material/Person";
import FamilyRestroomIcon from "@mui/icons-material/FamilyRestroom";
import SchoolIcon from "@mui/icons-material/School";
import HealthAndSafetyIcon from "@mui/icons-material/HealthAndSafety";
import InfoIcon from "@mui/icons-material/Info";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ErrorIcon from "@mui/icons-material/Error";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import API_BASE_URL from "../apiConfig";
import useStudentEditPermissions from "../account_management/useStudentEditPermissions";
import { CircularProgress } from "@mui/material"; // add to your existing MUI import line
import StudentECATApplicationForm from "./StudentECATApplicationForm";
import StudentPersonalDataForm from "./StudentPersonalDataForm";
import StudentOfficeOfTheRegistrar from "./StudentOfficeOfTheRegistrar";
import StudentServicesSurvey from "./StudentServicesSurvey";
// ─── Reusable field components (responsive, with locked/admin-badge support) ──
const Field = ({ label, required, error, helperText, children, lockedBadge }) => (
  <div style={{ marginBottom: 14 }}>
    {label && (
      <label
        style={{
          display: "block",
          fontSize: "clamp(11px, 1.4vw, 13px)",
          fontWeight: 600,
          color: "#444",
          marginBottom: 5,
        }}
      >
        {label}
        {required && <span style={{ color: "#d32f2f" }}> *</span>}
        {lockedBadge && (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 3,
              marginLeft: 6,
              padding: "1px 6px",
              borderRadius: 4,
              backgroundColor: "#fce4ec",
              color: "#c62828",
              fontSize: 10,
              fontWeight: 700,
              verticalAlign: "middle",
            }}
          >
            🔒 Locked by Admin
          </span>
        )}
      </label>
    )}
    {children}
    {error && helperText && (
      <div style={{ color: "#d32f2f", fontSize: 11, marginTop: 3 }}>{helperText}</div>
    )}
  </div>
);

const baseControlStyle = (hasError, locked) => ({
  width: "100%",
  height: 42,
  padding: "0 12px",
  border: `1px solid ${hasError ? "#d32f2f" : "#ccc"}`,
  borderRadius: 8,
  fontSize: "clamp(13px, 1.6vw, 14px)",
  backgroundColor: locked ? "#f5f5f5" : "#fff",
  boxSizing: "border-box",
  outline: "none",
  color: "#222",
});

const MInput = ({ error, locked, style, ...props }) => (
  <input
    style={{ ...baseControlStyle(error, locked), ...style }}
    readOnly={locked || props.readOnly}
    {...props}
  />
);

const MSelect = ({ error, locked, style, children, ...props }) => (
  <select
    style={{
      ...baseControlStyle(error, locked),
      appearance: "none",
      WebkitAppearance: "none",
      backgroundImage:
        "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%23666' stroke-width='1.5' fill='none'/%3E%3C/svg%3E\")",
      backgroundRepeat: "no-repeat",
      backgroundPosition: "right 12px center",
      paddingRight: 32,
      cursor: locked ? "not-allowed" : "pointer",
      ...style,
    }}
    disabled={locked || props.disabled}
    {...props}
  >
    {children}
  </select>
);

const CheckRow = ({ checked, onChange, disabled, lockedBadge, children }) => (
  <label
    style={{
      display: "flex",
      alignItems: "center",
      gap: 8,
      marginBottom: 12,
      fontSize: "clamp(12px, 1.5vw, 14px)",
      color: "#333",
      cursor: disabled ? "not-allowed" : "pointer",
      opacity: disabled ? 0.7 : 1,
    }}
  >
    <input
      type="checkbox"
      checked={checked}
      onChange={onChange}
      disabled={disabled}
      style={{ width: 18, height: 18, accentColor: "#6D2323", cursor: disabled ? "not-allowed" : "pointer" }}
    />
    {children}
    {lockedBadge && (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 3,
          marginLeft: 2,
          padding: "1px 6px",
          borderRadius: 4,
          backgroundColor: "#fce4ec",
          color: "#c62828",
          fontSize: 10,
          fontWeight: 700,
        }}
      >
        🔒 Locked by Admin
      </span>
    )}
  </label>
);

const SubHeader = ({ children }) => (
  <div
    style={{
      fontSize: "clamp(12px, 1.5vw, 14px)",
      fontWeight: 700,
      color: "#6D2323",
      marginBottom: 8,
      marginTop: 14,
      paddingBottom: 4,
      borderBottom: "1px solid #e0e0e0",
    }}
  >
    {children}
  </div>
);

const DeceasedBanner = ({ children }) => (
  <div
    style={{
      backgroundColor: "#FFF3E0",
      border: "1px solid #FFA726",
      borderRadius: 8,
      padding: "10px 12px",
      fontSize: 12,
      color: "#E65100",
      marginBottom: 10,
      display: "flex",
      alignItems: "center",
      gap: 8,
    }}
  >
    {children}
  </div>
);

const EXT_OPTIONS = ["Jr.", "Sr.", "I", "II", "III", "IV", "V"];

const STEP_PATHS = [
  "/student_personal_information",
  "/student_family_background",
  "/student_educational_attainment",
  "/student_health_medical_records",
  "/student_other_information",
];

// ─── Main Component ───────────────────────────────────────────────────────────
const StudentDashboard2Mobile = () => {
  const settings = useContext(SettingsContext);
  const colors = settings?.colors || {};
  const branding = settings?.branding || {};
  const assets = settings?.assets || {};
  const headerColor = colors.header || "#1976d2";
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();

  // Breakpoints: phone < 600px, tablet 600–959px, desktop >= 960px
  const isPhone = useMediaQuery(theme.breakpoints.down("sm"));
  const isTablet = useMediaQuery(theme.breakpoints.between("sm", "md"));
  const isDesktop = useMediaQuery(theme.breakpoints.up("md"));

  // Two-column fields stack on phone, sit side-by-side from tablet up
  const gridCols2 = { display: "grid", gridTemplateColumns: isPhone ? "1fr" : "1fr 1fr", gap: 16 };

  // ── Permissions hook (student-specific, unchanged) ─────────────────────────
  const { canEdit: canEditField, permissionsLoaded } = useStudentEditPermissions();

  // ── Theme / settings state ─────────────────────────────────────────────────
  const [titleColor, setTitleColor] = useState("#000000");
  const [subtitleColor, setSubtitleColor] = useState("#555555");
  const [borderColor, setBorderColor] = useState("#000000");
  const [mainButtonColor, setMainButtonColor] = useState("#1976d2");
  const [subButtonColor, setSubButtonColor] = useState("#ffffff");
  const [companyName, setCompanyName] = useState("");
  const [shortTerm, setShortTerm] = useState("");

  useEffect(() => {
    if (!settings) return;
    if (colors.title) setTitleColor(colors.title);
    if (colors.subtitle) setSubtitleColor(colors.subtitle);
    if (colors.border) setBorderColor(colors.border);
    if (colors.mainButton) setMainButtonColor(colors.mainButton);
    if (colors.subButton) setSubButtonColor(colors.subButton);
    if (branding.companyName) setCompanyName(branding.companyName);
    if (branding.shortTerm) setShortTerm(branding.shortTerm);
  }, [settings]);

  const [userID, setUserID] = useState("");
  const [userRole, setUserRole] = useState("");

  // canEdit wrapper — unchanged logic from the original mobile dashboard
  const canEdit = (fieldId) => canEditField(fieldId, userRole);

  // ── Person state ───────────────────────────────────────────────────────────
  const [person, setPerson] = useState({
    solo_parent: 0,
    father_deceased: 0,
    father_family_name: "",
    father_given_name: "",
    father_middle_name: "",
    father_ext: "",
    father_nickname: "",
    father_education: 0,
    father_education_level: "",
    father_last_school: "",
    father_course: "",
    father_year_graduated: "",
    father_school_address: "",
    father_contact: "",
    father_occupation: "",
    father_employer: "",
    father_income: "",
    father_email: "",
    mother_deceased: 0,
    mother_family_name: "",
    mother_given_name: "",
    mother_middle_name: "",
    mother_ext: "",
    mother_nickname: "",
    mother_education: 0,
    mother_education_level: "",
    mother_last_school: "",
    mother_course: "",
    mother_year_graduated: "",
    mother_school_address: "",
    mother_contact: "",
    mother_occupation: "",
    mother_employer: "",
    mother_income: "",
    mother_email: "",
    guardian: "",
    guardian_family_name: "",
    guardian_given_name: "",
    guardian_middle_name: "",
    guardian_ext: "",
    guardian_nickname: "",
    guardian_address: "",
    guardian_contact: "",
    guardian_email: "",
    annual_income: "",
    has_no_siblings: 0,
    siblings: [],
  });

  // ── Snackbar ───────────────────────────────────────────────────────────────
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "warning" });

  const handleCloseSnackbar = (event, reason) => {
    if (reason === "clickaway") return;
    setSnackbar((prev) => ({ ...prev, open: false }));
  };

  const showSnackbar = (message, severity = "warning") => {
    setSnackbar({ open: true, message, severity });
  };

  // ── Auth & init (student logic, unchanged) ──────────────────────────────────
  useEffect(() => {
    const storedRole = localStorage.getItem("role");
    const loggedInPersonId = localStorage.getItem("person_id");
    if (!loggedInPersonId) {
      window.location.href = "/login";
      return;
    }
    setUserRole(storedRole);
    const queryParams = new URLSearchParams(location.search);
    const queryPersonId = queryParams.get("person_id");
    setUserID(queryPersonId || loggedInPersonId);
  }, [location.search]);

  useEffect(() => {
    if (!userID) return;
    axios
      .get(`${API_BASE_URL}/api/student_data_as_applicant/${userID}`)
      .then((res) => {
        if (res.data) setPerson(normalizePersonSiblings(res.data));
      })
      .catch(console.error);
  }, [userID]);

  const stepsWithIcons = [
    { label: "Personal Information", icon: <PersonIcon /> },
    { label: "Family Background", icon: <FamilyRestroomIcon /> },
    { label: "Educational Attainment", icon: <SchoolIcon /> },
    { label: "Health Medical Records", icon: <HealthAndSafetyIcon /> },
    { label: "Other Information", icon: <InfoIcon /> },
  ];

  const [activeStep, setActiveStep] = useState(1);

  // ── Guardian auto-fill (unchanged) ──────────────────────────────────────────
  const handleGuardianChange = (e) => {
    const { value } = e.target;
    let updatedPerson = { ...person, guardian: value };

    if (value === "Father") {
      updatedPerson = {
        ...updatedPerson,
        guardian_family_name: person.father_family_name || "",
        guardian_given_name: person.father_given_name || "",
        guardian_middle_name: person.father_middle_name || "",
        guardian_ext: person.father_ext || "",
        guardian_nickname: person.father_nickname || "",
        guardian_contact: person.father_contact || "",
        guardian_email: person.father_email || "",
      };
    }

    if (value === "Mother") {
      updatedPerson = {
        ...updatedPerson,
        guardian_family_name: person.mother_family_name || "",
        guardian_given_name: person.mother_given_name || "",
        guardian_middle_name: person.mother_middle_name || "",
        guardian_ext: person.mother_ext || "",
        guardian_nickname: person.mother_nickname || "",
        guardian_contact: person.mother_contact || "",
        guardian_email: person.mother_email || "",
      };
    }

    setPerson(updatedPerson);
    handleUpdate(updatedPerson);
  };

  const normalizePersonSiblings = (data) => {
    let siblingsVal = data.siblings;
    if (typeof siblingsVal === "string") {
      try { siblingsVal = JSON.parse(siblingsVal); } catch { siblingsVal = []; }
    }
    return {
      ...data,
      siblings: Array.isArray(siblingsVal) ? siblingsVal : [],
      has_no_siblings: data.has_no_siblings === 1 ? 1 : 0,
    };
  };

  const handleNoSiblingsCheck = (e) => {
    if (!canEdit("siblings")) return;
    const checked = e.target.checked;
    const updated = { ...person, has_no_siblings: checked ? 1 : 0, siblings: checked ? [] : person.siblings };
    setPerson(updated);
    handleUpdate(updated);
  };

  const addSibling = () => {
    if (!canEdit("siblings")) return;
    const updated = {
      ...person,
      siblings: [...(person.siblings || []), { id: Date.now(), name: "", age: "", schoolLevel: "", schoolLastAttended: "", schoolAddress: "", occupation: "", monthlyIncome: "" }],
    };
    setPerson(updated);
    handleUpdate(updated);
  };

  const removeSibling = (index) => {
    if (!canEdit("siblings")) return;
    const updated = { ...person, siblings: (person.siblings || []).filter((_, i) => i !== index) };
    setPerson(updated);
    handleUpdate(updated);
  };

  const handleSiblingFieldChange = (index, field, value) => {
    if (!canEdit("siblings")) return;
    const updatedSiblings = [...(person.siblings || [])];
    updatedSiblings[index] = { ...updatedSiblings[index], [field]: value };
    setPerson((prev) => ({ ...prev, siblings: updatedSiblings }));
  };

  const handleSiblingFieldBlur = () => handleUpdate(person);

  // ── Auto-save (student endpoint, unchanged) ─────────────────────────────────
  const handleUpdate = async (updated) => {
    try {
      const { person_id, created_at, current_step, ...clean } = updated;
      await axios.put(`${API_BASE_URL}/api/enrollment/person/${userID}`, clean);
    } catch (err) {
      console.error("Auto-save failed:", err);
    }
  };

  // ── Handle change with income auto-calc (unchanged) ─────────────────────────
  const handleChange = (e) => {
    const { name, type, checked, value } = e.target;
    const updatedPerson = {
      ...person,
      [name]: type === "checkbox" ? (checked ? 1 : 0) : value,
    };

    if (name === "mother_income" || name === "father_income") {
      const motherIncome =
        parseFloat(name === "mother_income" ? value : updatedPerson.mother_income) || 0;
      const fatherIncome =
        parseFloat(name === "father_income" ? value : updatedPerson.father_income) || 0;
      const totalIncome = motherIncome + fatherIncome;

      let annualIncomeBracket = "";
      if (totalIncome <= 80000) {
        annualIncomeBracket = "80,000 and below";
      } else if (totalIncome <= 135000) {
        annualIncomeBracket = "80,000 to 135,000";
      } else if (totalIncome <= 250000) {
        annualIncomeBracket = "135,000 to 250,000";
      } else if (totalIncome <= 500000) {
        annualIncomeBracket = "250,000 to 500,000";
      } else if (totalIncome <= 1000000) {
        annualIncomeBracket = "500,000 to 1,000,000";
      } else {
        annualIncomeBracket = "1,000,000 and above";
      }
      updatedPerson.annual_income = annualIncomeBracket;
    }

    setPerson(updatedPerson);
    handleUpdate(updatedPerson);
  };

  const isFatherDeceased = person.father_deceased === 1;
  const isMotherDeceased = person.mother_deceased === 1;

  // ── Form validation (unchanged) ─────────────────────────────────────────────
  const [errors, setErrors] = useState({});

  const isFormValid = () => {
    const requiredFields = [];

    if (person.father_deceased !== 1) {
      requiredFields.push(
        "father_family_name",
        "father_given_name",
        "father_contact",
        "father_occupation",
        "father_employer",
        "father_income"
      );
      if (person.father_education !== 1) {
        requiredFields.push(
          "father_education_level",
          "father_last_school",
          "father_course",
          "father_year_graduated",
          "father_school_address"
        );
      }
    }

    if (person.mother_deceased !== 1) {
      requiredFields.push(
        "mother_family_name",
        "mother_given_name",
        "mother_contact",
        "mother_occupation",
        "mother_employer",
        "mother_income"
      );
      if (person.mother_education !== 1) {
        requiredFields.push(
          "mother_education_level",
          "mother_last_school",
          "mother_course",
          "mother_year_graduated",
          "mother_school_address"
        );
      }
    }

    requiredFields.push(
      "guardian",
      "guardian_family_name",
      "guardian_given_name",
      "guardian_address",
      "guardian_contact",
      "annual_income"
    );

    let newErrors = {};
    let isValid = true;

    requiredFields.forEach((field) => {
      const value = person[field];
      const stringValue = value?.toString().trim();
      if (!stringValue) {
        newErrors[field] = true;
        isValid = false;
      }
    });

    if (person.has_no_siblings !== 1) {
      const siblings = person.siblings || [];
      if (siblings.length === 0) {
        newErrors.siblings = true;
        isValid = false;
      } else {
        siblings.forEach((sib, idx) => {
          if (!sib.name || !sib.name.toString().trim()) {
            newErrors[`sibling_name_${idx}`] = true;
            isValid = false;
          }
          if (!sib.age || !sib.age.toString().trim()) {
            newErrors[`sibling_age_${idx}`] = true;
            isValid = false;
          }
        });
      }
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleStepClick = (index) => {
    if (isFormValid()) {
      setActiveStep(index);
      showSnackbar("Your record has been saved successfully!", "success");
      setTimeout(() => navigate(STEP_PATHS[index]), 1000);
    } else {
      showSnackbar("Please fill all required fields before proceeding.", "error");
    }
  };

  // ── Solo parent ──────────────────────────────────────────────────────────────
  const [soloParentChoice, setSoloParentChoice] = useState("");


  const [generatingKey, setGeneratingKey] = useState(null); // "ecat" | "personalData" | "registrar" | "admissionServices"
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

  const buildClientFilename = (prefix, { lastName, firstName, studentNo }) => {
    const safeLast = (lastName || "Student").trim().replace(/\s+/g, "_");
    const safeFirst = (firstName || "").trim().replace(/\s+/g, "_");
    const suffix = studentNo ? `_${studentNo}` : "";
    return `${prefix}_${safeLast}${safeFirst ? "_" + safeFirst : ""}${suffix}.pdf`;
  };

  const [studentNumber, setStudentNumber] = useState("");

  const generateFormPdf = async (key) => {
    const config = FORM_CONFIGS[key];
    if (!config || generatingKey) return;

    setGeneratingKey(key);

    try {
      await new Promise((resolve) => setTimeout(resolve, 1000)); // let hidden component finish fetching

      const node = hiddenFormRef.current;
      if (!node) throw new Error(`${config.label} did not render in time.`);

      // ✅ FIX — stamp the live "checked" DOM property onto a cloned copy
      // of the node before reading innerHTML. Without this, checkboxes
      // for gender/civilStatus/etc. always serialize as unchecked even
      // though they render correctly on screen.
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
          person_id: userID || "",
          last_name: person?.last_name || "",
          first_name: person?.first_name || "",
        },
        { responseType: "blob" },
      );

      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);

      const fileName = buildClientFilename(config.filenamePrefix, {
        lastName: person?.last_name,
        firstName: person?.first_name,
        studentNo: studentNumber,
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
      setSnackbar({
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
    { key: "registrar", label: `Application For ${shortTerm ? shortTerm.toUpperCase() : ""} Admission`, onClick: () => generateFormPdf("registrar") },
    { key: "admissionServices", label: "Application/Student Satisfactory Survey", onClick: () => generateFormPdf("admissionServices") },
  ];

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



  // Cards per row depending on viewport
  const cardBasis = isPhone ? "calc(50% - 6px)" : isTablet ? "calc(33.333% - 8px)" : "calc(20% - 13px)";

  // Content max width so it doesn't stretch edge-to-edge on large desktop monitors
  const contentMaxWidth = isDesktop ? 1000 : "100%";

  return (
    <Box
      sx={{
        minHeight: "100vh",
        backgroundColor: "#f5f5f5",
        fontFamily: "'Segoe UI', sans-serif",
        pb: { xs: 8, md: 4 },

      }}
    >

      {generatingKey && FORM_CONFIGS[generatingKey] && (
        <div ref={hiddenFormRef} style={{ position: "absolute", left: "-9999px", top: 0 }}>
          {React.createElement(FORM_CONFIGS[generatingKey].Component)}
        </div>
      )}

      {/* Toast notification */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={2000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: "100%" }}>
          {snackbar.message}
        </Alert>
      </Snackbar>

      <Box sx={{ maxWidth: contentMaxWidth, mx: "auto", px: { xs: 0, md: 2 } }}>
        {/* Page Title */}
        <Box sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          mb: 1,

          px: { xs: 2, md: 0 },
          pt: { xs: 2, md: 0 },
        }}>
          <Typography variant="h4" sx={{ fontWeight: "bold", color: titleColor, fontSize: { xs: "22px", sm: "28px", md: "36px" } }}>
            FAMILY BACKGROUND
          </Typography>
        </Box>
        <hr style={{ border: "1px solid #ccc", width: "100%" }} />
        <br />

        {/* Notice */}
        <Box
          sx={{
            display: "flex",
            alignItems: "flex-start",
            gap: 1.5,
            mx: { xs: "12px", md: 0 },
            mt: "12px",
            p: { xs: "10px 12px", md: "14px 16px" },
            borderRadius: "8px",
            backgroundColor: "#fffaf5",
            border: "1px solid #6D2323",
            boxShadow: "0px 2px 8px rgba(0,0,0,0.05)",
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "#800000",
              borderRadius: "6px",
              width: { xs: 36, md: 48 },
              height: { xs: 36, md: 48 },
              flexShrink: 0,
            }}
          >
            <ErrorIcon sx={{ color: "white", fontSize: { xs: 22, md: 30 } }} />
          </Box>

          <Typography
            sx={{
              fontSize: { xs: "13px", sm: "14px", md: "16px" },
              fontFamily: "Poppins, sans-serif",
              color: "#3e3e3e",
              lineHeight: 1.5,
            }}
          >
            <strong style={{ color: "maroon" }}>Important Notice:</strong>
            <br />
            <span style={{ margin: "0 8px" }}>➔</span>
            Please indicate <strong>“NA”</strong> or <strong>“N/A”</strong> in fields where the
            requested information is not applicable or no response can be provided.
            <br />
            <span style={{ margin: "0 8px" }}>➔</span>
            To enter the letter <strong>“Ñ”</strong>, press and hold the ALT key while typing
            <strong> 165</strong>. For <strong>“ñ”</strong>, press and hold the ALT key while
            typing <strong> 164</strong>.
            <br />
            <span style={{ margin: "0 8px" }}>➔</span>
            Please complete all information from <strong>Personal Information</strong> up to
            <strong> Other Information</strong> before printing your documents.
          </Typography>
        </Box>

        {/* Printable Documents */}
        <Box sx={{ px: { xs: "12px", md: 0 }, pt: "12px" }}>
          <Typography
            sx={{
              fontSize: { xs: "22px", md: "28px" },
              fontWeight: "bold",
              textAlign: "center",
              color: "black",
              mt: "20px",
              mb: 2,
            }}
          >
            PRINTABLE DOCUMENTS
          </Typography>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.25, justifyContent: "center" }}>
            {links.map((lnk, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06, duration: 0.3 }}
                style={{ width: cardBasis, minWidth: 140 }}
              >
                <Card
                  sx={{
                    display: "flex",
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 0.75,
                    px: 1.5,
                    py: 1.25,
                    height: { xs: 52, md: 60 },
                    width: "100%",
                    borderRadius: "12px",
                    border: `1px solid ${borderColor || "#6D2323"}`,
                    backgroundColor: "#fff",
                    cursor: generatingKey ? "default" : "pointer",
                    opacity: generatingKey && generatingKey !== lnk.key ? 0.5 : 1,
                    pointerEvents: generatingKey ? "none" : "auto",
                    transition: "all 0.25s ease-in-out",
                    "&:hover": {
                      transform: { md: "scale(1.04)" },
                      backgroundColor: headerColor || "#6D2323",
                      "& .chip-icon": { color: "#fff" },
                      "& .chip-text": { color: "#fff" },
                    },
                  }}
                  onClick={() => { if (generatingKey) return; lnk.onClick(); }}
                >
                  {generatingKey === lnk.key ? (
                    <CircularProgress size={18} sx={{ color: mainButtonColor || "#6D2323" }} />
                  ) : (
                    <PictureAsPdfIcon
                      className="chip-icon"
                      sx={{ fontSize: { xs: 18, md: 22 }, color: mainButtonColor || "#6D2323", flexShrink: 0 }}
                    />
                  )}
                  <Typography
                    className="chip-text"
                    sx={{
                      fontSize: { xs: 11, md: 13 },
                      fontWeight: 600,
                      color: mainButtonColor || "#6D2323",
                      fontFamily: "Poppins, sans-serif",
                      lineHeight: 1.3,
                      textAlign: "center",
                    }}
                  >
                    {generatingKey === lnk.key ? "Generating..." : lnk.label}
                  </Typography>
                </Card>
              </motion.div>
            ))}
          </Box>
        </Box>

        {/* Form intro */}
        <Box sx={{ px: { xs: "14px", md: 0 }, pt: 2, textAlign: "center" }}>
          <Typography
            component="h1"
            sx={{
              fontSize: { xs: "24px", sm: "32px", md: "42px" },
              fontWeight: "bold",
              textAlign: "center",
              color: subtitleColor,
              mt: "20px",
            }}
          >
            STUDENT FORM
          </Typography>
          <Typography sx={{ fontSize: { xs: 13, md: 15 }, color: "#555" }}>
            Please update your personal information to keep your student records accurate and
            up to date for the upcoming academic year at{" "}
            {shortTerm ? (
              <>
                <strong>{shortTerm.toUpperCase()}</strong>
                <br />
                {companyName || ""}
              </>
            ) : (
              companyName || ""
            )}
            .
          </Typography>
        </Box>

        {/* Stepper */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            width: "100%",
            px: { xs: 2, md: 4 },
            py: 1.5,
            borderBottom: "1px solid #e0e0e0",
            overflowX: "auto",
          }}
        >
          {stepsWithIcons.map((step, index) => (
            <React.Fragment key={index}>
              <Box
                sx={{ display: "flex", flexDirection: "column", alignItems: "center", cursor: "pointer" }}
                onClick={() => handleStepClick(index)}
              >
                <Box
                  sx={{
                    width: { xs: 42, md: 52 },
                    height: { xs: 42, md: 52 },
                    borderRadius: "50%",
                    border: `2px solid ${borderColor}`,
                    backgroundColor: activeStep === index ? (headerColor || "#6D2323") : "#E8C999",
                    color: activeStep === index ? "#fff" : "#333",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: { xs: 18, md: 22 },
                    transition: "all 0.2s",
                    flexShrink: 0,
                  }}
                >
                  {step.icon}
                </Box>
                <Typography
                  sx={{
                    mt: 0.75,
                    color: activeStep === index ? "#6D2323" : "#555",
                    fontWeight: activeStep === index ? 700 : 400,
                    fontSize: { xs: 10, sm: 12, md: 13 },
                    textAlign: "center",
                    maxWidth: { xs: 64, md: 96 },
                    lineHeight: 1.3,
                  }}
                >
                  {step.label}
                </Typography>
              </Box>
              {index < stepsWithIcons.length - 1 && (
                <Box
                  sx={{
                    height: "2px",
                    backgroundColor: mainButtonColor,
                    flex: 1,
                    minWidth: { xs: 16, md: 32 },
                    alignSelf: "center",
                    mx: { xs: 0.75, md: 1.5 },
                    mb: 3,
                  }}
                />
              )}
            </React.Fragment>
          ))}
        </Box>

        {/* ── Solo Parent ────────────────────────────────────────────────── */}
        <Box
          sx={{
            backgroundColor: "#fff",
            borderRadius: "10px",
            mx: { xs: "12px", md: 0 },
            mt: "12px",
            overflow: "hidden",
            boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
            border: `1px solid ${borderColor}`,
          }}
        >
          <Box
            sx={{
              backgroundColor: headerColor || "#1976d2",
              color: "#fff",
              p: { xs: "10px 14px", md: "12px 18px" },
              fontSize: { xs: 13, md: 15 },
              fontWeight: 700,
              letterSpacing: 0.3,
            }}
          >
            Family Information
          </Box>
          <Box sx={{ p: { xs: "14px", md: "20px" } }}>
            <CheckRow
              checked={person.solo_parent === 1}
              disabled={!canEdit("solo_parent")}
              lockedBadge={!canEdit("solo_parent")}
              onChange={
                canEdit("solo_parent")
                  ? (e) => {
                    const checked = e.target.checked;
                    const newPerson = { ...person, solo_parent: checked ? 1 : 0 };
                    if (!checked) {
                      newPerson.father_deceased = 0;
                      newPerson.mother_deceased = 0;
                    }
                    setPerson(newPerson);
                    handleUpdate(newPerson);
                  }
                  : undefined
              }
            >
              Solo Parent
            </CheckRow>

            {person.solo_parent === 1 && (
              <Box sx={{ maxWidth: { md: 420 } }}>
                <Field label="Solo Parent Type" lockedBadge={!canEdit("solo_parent")}>
                  <MSelect
                    value={soloParentChoice}
                    locked={!canEdit("solo_parent")}
                    onChange={
                      canEdit("solo_parent")
                        ? (e) => {
                          const choice = e.target.value;
                          setSoloParentChoice(choice);
                          const updated = {
                            ...person,
                            father_deceased: choice === "Mother" ? 1 : 0,
                            mother_deceased: choice === "Father" ? 1 : 0,
                          };
                          setPerson(updated);
                          handleUpdate(updated);
                        }
                        : undefined
                    }
                  >
                    <option value="">Select...</option>
                    <option value="Father">Father (Mother is solo parent)</option>
                    <option value="Mother">Mother (Father is solo parent)</option>
                  </MSelect>
                </Field>
              </Box>
            )}
          </Box>
        </Box>

        {/* ── Father's Details ───────────────────────────────────────────── */}
        <Box
          sx={{
            backgroundColor: "#fff",
            borderRadius: "10px",
            mx: { xs: "12px", md: 0 },
            mt: "12px",
            overflow: "hidden",
            boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
            border: `1px solid ${borderColor}`,
          }}
        >
          <Box
            sx={{
              backgroundColor: headerColor || "#1976d2",
              color: "#fff",
              p: { xs: "10px 14px", md: "12px 18px" },
              fontSize: { xs: 13, md: 15 },
              fontWeight: 700,
              letterSpacing: 0.3,
            }}
          >
            Father's Details
          </Box>
          <Box sx={{ p: { xs: "14px", md: "20px" } }}>
            <CheckRow
              checked={person.father_deceased === 1}
              onChange={(e) => {
                const checked = e.target.checked;
                const updated = { ...person, father_deceased: checked ? 1 : 0 };
                setPerson(updated);
                handleUpdate(updated);
              }}
            >
              Father Separated / Deceased
            </CheckRow>

            {isFatherDeceased ? (
              <DeceasedBanner>⚠️ Father marked as separated/deceased. Fields hidden.</DeceasedBanner>
            ) : (
              <>
                <div style={gridCols2}>
                  <Field label="Last Name" required error={errors.father_family_name} helperText="Required">
                    <MInput
                      locked
                      name="father_family_name"
                      value={(person.father_family_name || "").toUpperCase()}
                      onChange={(e) =>
                        handleChange({ target: { name: "father_family_name", value: e.target.value.toUpperCase() } })
                      }
                      error={errors.father_family_name}
                      placeholder="Father Last Name"
                    />
                  </Field>
                  <Field label="First Name" required error={errors.father_given_name} helperText="Required">
                    <MInput
                      locked
                      name="father_given_name"
                      value={(person.father_given_name || "").toUpperCase()}
                      onChange={(e) =>
                        handleChange({ target: { name: "father_given_name", value: e.target.value.toUpperCase() } })
                      }
                      error={errors.father_given_name}
                      placeholder="Father First Name"
                    />
                  </Field>
                </div>

                <Box sx={{ display: "grid", gridTemplateColumns: isPhone ? "1fr" : "1fr 140px", gap: 2 }}>
                  <Field label="Middle Name">
                    <MInput
                      locked
                      name="father_middle_name"
                      value={(person.father_middle_name || "").toUpperCase()}
                      onChange={(e) =>
                        handleChange({ target: { name: "father_middle_name", value: e.target.value.toUpperCase() } })
                      }
                      placeholder="Father Middle Name"
                    />
                  </Field>
                  <Field label="Extension" lockedBadge={!canEdit("father_ext")}>
                    <MSelect
                      name="father_ext"
                      value={person.father_ext || ""}
                      onChange={canEdit("father_ext") ? handleChange : undefined}
                      locked={!canEdit("father_ext")}
                    >
                      <option value="">None</option>
                      {EXT_OPTIONS.map((v) => (
                        <option key={v} value={v}>
                          {v}
                        </option>
                      ))}
                    </MSelect>
                  </Field>
                </Box>

                <Field label="Nickname" lockedBadge={!canEdit("father_nickname")}>
                  <MInput
                    name="father_nickname"
                    value={person.father_nickname || ""}
                    onChange={canEdit("father_nickname") ? handleChange : undefined}
                    locked={!canEdit("father_nickname")}
                    placeholder="Father Nickname"
                  />
                </Field>

                <SubHeader>Father's Educational Background</SubHeader>
                <CheckRow
                  checked={person.father_education === 1}
                  onChange={(e) => {
                    const isChecked = e.target.checked;
                    const updated = {
                      ...person,
                      father_education: isChecked ? 1 : 0,
                      ...(isChecked
                        ? {
                          father_education_level: "",
                          father_last_school: "",
                          father_course: "",
                          father_year_graduated: "",
                          father_school_address: "",
                        }
                        : {}),
                    };
                    setPerson(updated);
                    handleUpdate(updated);
                  }}
                >
                  Father's education not applicable
                </CheckRow>

                {person.father_education !== 1 && (
                  <>
                    <Field
                      label="Education Level"
                      required
                      error={errors.father_education_level}
                      helperText="Required"
                      lockedBadge={!canEdit("father_education_level")}
                    >
                      <MInput
                        name="father_education_level"
                        value={person.father_education_level || ""}
                        onChange={canEdit("father_education_level") ? handleChange : undefined}
                        locked={!canEdit("father_education_level")}
                        error={errors.father_education_level}
                        placeholder="Father Education Level"
                      />
                    </Field>
                    <div style={gridCols2}>
                      <Field
                        label="Last School Attended"
                        required
                        error={errors.father_last_school}
                        helperText="Required"
                        lockedBadge={!canEdit("father_last_school")}
                      >
                        <MInput
                          name="father_last_school"
                          value={person.father_last_school || ""}
                          onChange={canEdit("father_last_school") ? handleChange : undefined}
                          locked={!canEdit("father_last_school")}
                          error={errors.father_last_school}
                          placeholder="Father Last School"
                        />
                      </Field>
                      <Field
                        label="Course"
                        required
                        error={errors.father_course}
                        helperText="Required"
                        lockedBadge={!canEdit("father_course")}
                      >
                        <MInput
                          name="father_course"
                          value={person.father_course || ""}
                          onChange={canEdit("father_course") ? handleChange : undefined}
                          locked={!canEdit("father_course")}
                          error={errors.father_course}
                          placeholder="Father Course"
                        />
                      </Field>
                    </div>
                    <div style={gridCols2}>
                      <Field
                        label="Year Graduated"
                        required
                        error={errors.father_year_graduated}
                        helperText="Required"
                        lockedBadge={!canEdit("father_year_graduated")}
                      >
                        <MInput
                          type="number"
                          name="father_year_graduated"
                          value={person.father_year_graduated || ""}
                          onChange={canEdit("father_year_graduated") ? handleChange : undefined}
                          locked={!canEdit("father_year_graduated")}
                          error={errors.father_year_graduated}
                          placeholder="Father Year Graduated"
                        />
                      </Field>
                      <Field
                        label="School Address"
                        required
                        error={errors.father_school_address}
                        helperText="Required"
                        lockedBadge={!canEdit("father_school_address")}
                      >
                        <MInput
                          name="father_school_address"
                          value={person.father_school_address || ""}
                          onChange={canEdit("father_school_address") ? handleChange : undefined}
                          locked={!canEdit("father_school_address")}
                          error={errors.father_school_address}
                          placeholder="Father School Address"
                        />
                      </Field>
                    </div>
                  </>
                )}

                <SubHeader>Father's Contact Information</SubHeader>
                <div style={gridCols2}>
                  <Field
                    label="Contact Number"
                    required
                    error={errors.father_contact}
                    helperText="Required"
                    lockedBadge={!canEdit("father_contact")}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontWeight: 700, fontSize: 13, flexShrink: 0 }}>+63</span>
                      <MInput
                        name="father_contact"
                        value={person.father_contact || ""}
                        onChange={
                          canEdit("father_contact")
                            ? (e) =>
                              handleChange({
                                target: { name: "father_contact", value: e.target.value.replace(/\D/g, "") },
                              })
                            : undefined
                        }
                        locked={!canEdit("father_contact")}
                        error={errors.father_contact}
                        placeholder="9XXXXXXXXX"
                        maxLength={10}
                        style={{ flex: 1 }}
                      />
                    </div>
                  </Field>
                  <Field
                    label="Occupation"
                    required
                    error={errors.father_occupation}
                    helperText="Required"
                    lockedBadge={!canEdit("father_occupation")}
                  >
                    <MInput
                      name="father_occupation"
                      value={person.father_occupation || ""}
                      onChange={canEdit("father_occupation") ? handleChange : undefined}
                      locked={!canEdit("father_occupation")}
                      error={errors.father_occupation}
                      placeholder="Father Occupation"
                    />
                  </Field>
                </div>
                <div style={gridCols2}>
                  <Field
                    label="Employer"
                    required
                    error={errors.father_employer}
                    helperText="Required"
                    lockedBadge={!canEdit("father_employer")}
                  >
                    <MInput
                      name="father_employer"
                      value={person.father_employer || ""}
                      onChange={canEdit("father_employer") ? handleChange : undefined}
                      locked={!canEdit("father_employer")}
                      error={errors.father_employer}
                      placeholder="Father Employer"
                    />
                  </Field>
                  <Field
                    label="Monthly Income"
                    required
                    error={errors.father_income}
                    helperText="Required"
                    lockedBadge={!canEdit("father_income")}
                  >
                    <MInput
                      type="number"
                      name="father_income"
                      value={person.father_income || ""}
                      onChange={
                        canEdit("father_income")
                          ? (e) =>
                            handleChange({
                              target: { name: "father_income", value: e.target.value.replace(/\D/g, "") },
                            })
                          : undefined
                      }
                      locked={!canEdit("father_income")}
                      error={errors.father_income}
                      placeholder="Father Income"
                    />
                  </Field>
                </div>
                <Box sx={{ maxWidth: { md: 480 } }}>
                  <Field label="Email Address" lockedBadge={!canEdit("father_email")}>
                    <MInput
                      type="email"
                      name="father_email"
                      value={person.father_email || ""}
                      onChange={canEdit("father_email") ? handleChange : undefined}
                      locked={!canEdit("father_email")}
                      placeholder="Father Email Address"
                    />
                  </Field>
                </Box>
              </>
            )}
          </Box>
        </Box>

        {/* ── Mother's Details ───────────────────────────────────────────── */}
        <Box
          sx={{
            backgroundColor: "#fff",
            borderRadius: "10px",
            mx: { xs: "12px", md: 0 },
            mt: "12px",
            overflow: "hidden",
            boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
            border: `1px solid ${borderColor}`,
          }}
        >
          <Box
            sx={{
              backgroundColor: headerColor || "#1976d2",
              color: "#fff",
              p: { xs: "10px 14px", md: "12px 18px" },
              fontSize: { xs: 13, md: 15 },
              fontWeight: 700,
              letterSpacing: 0.3,
            }}
          >
            Mother's Details
          </Box>
          <Box sx={{ p: { xs: "14px", md: "20px" } }}>
            <CheckRow
              checked={person.mother_deceased === 1}
              onChange={(e) => {
                const checked = e.target.checked;
                const updated = { ...person, mother_deceased: checked ? 1 : 0 };
                setPerson(updated);
                handleUpdate(updated);
              }}
            >
              Mother Separated / Deceased
            </CheckRow>

            {isMotherDeceased ? (
              <DeceasedBanner>⚠️ Mother marked as separated/deceased. Fields hidden.</DeceasedBanner>
            ) : (
              <>
                <div style={gridCols2}>
                  <Field label="Last Name" required error={errors.mother_family_name} helperText="Required">
                    <MInput
                      locked
                      name="mother_family_name"
                      value={(person.mother_family_name || "").toUpperCase()}
                      onChange={(e) =>
                        handleChange({ target: { name: "mother_family_name", value: e.target.value.toUpperCase() } })
                      }
                      error={errors.mother_family_name}
                      placeholder="Mother Last Name"
                    />
                  </Field>
                  <Field label="First Name" required error={errors.mother_given_name} helperText="Required">
                    <MInput
                      locked
                      name="mother_given_name"
                      value={(person.mother_given_name || "").toUpperCase()}
                      onChange={(e) =>
                        handleChange({ target: { name: "mother_given_name", value: e.target.value.toUpperCase() } })
                      }
                      error={errors.mother_given_name}
                      placeholder="Mother First Name"
                    />
                  </Field>
                </div>

                <Box sx={{ display: "grid", gridTemplateColumns: isPhone ? "1fr" : "1fr 140px", gap: 2 }}>
                  <Field label="Middle Name">
                    <MInput
                      locked
                      name="mother_middle_name"
                      value={(person.mother_middle_name || "").toUpperCase()}
                      onChange={(e) =>
                        handleChange({ target: { name: "mother_middle_name", value: e.target.value.toUpperCase() } })
                      }
                      placeholder="Mother Middle Name"
                    />
                  </Field>
                  <Field label="Extension" lockedBadge={!canEdit("mother_ext")}>
                    <MSelect
                      name="mother_ext"
                      value={person.mother_ext || ""}
                      onChange={canEdit("mother_ext") ? handleChange : undefined}
                      locked={!canEdit("mother_ext")}
                    >
                      <option value="">None</option>
                      {EXT_OPTIONS.map((v) => (
                        <option key={v} value={v}>
                          {v}
                        </option>
                      ))}
                    </MSelect>
                  </Field>
                </Box>

                <Field label="Nickname" lockedBadge={!canEdit("mother_nickname")}>
                  <MInput
                    name="mother_nickname"
                    value={person.mother_nickname || ""}
                    onChange={canEdit("mother_nickname") ? handleChange : undefined}
                    locked={!canEdit("mother_nickname")}
                    placeholder="Mother Nickname"
                  />
                </Field>

                <SubHeader>Mother's Educational Background</SubHeader>
                <CheckRow
                  checked={person.mother_education === 1}
                  onChange={(e) => {
                    const isChecked = e.target.checked;
                    const updated = {
                      ...person,
                      mother_education: isChecked ? 1 : 0,
                      ...(isChecked
                        ? {
                          mother_education_level: "",
                          mother_last_school: "",
                          mother_course: "",
                          mother_year_graduated: "",
                          mother_school_address: "",
                        }
                        : {}),
                    };
                    setPerson(updated);
                    handleUpdate(updated);
                  }}
                >
                  Mother's education not applicable
                </CheckRow>

                {person.mother_education !== 1 && (
                  <>
                    <Field
                      label="Education Level"
                      required
                      error={errors.mother_education_level}
                      helperText="Required"
                      lockedBadge={!canEdit("mother_education_level")}
                    >
                      <MInput
                        name="mother_education_level"
                        value={person.mother_education_level || ""}
                        onChange={canEdit("mother_education_level") ? handleChange : undefined}
                        locked={!canEdit("mother_education_level")}
                        error={errors.mother_education_level}
                        placeholder="Mother Education Level"
                      />
                    </Field>
                    <div style={gridCols2}>
                      <Field
                        label="Last School Attended"
                        required
                        error={errors.mother_last_school}
                        helperText="Required"
                        lockedBadge={!canEdit("mother_last_school")}
                      >
                        <MInput
                          name="mother_last_school"
                          value={person.mother_last_school || ""}
                          onChange={canEdit("mother_last_school") ? handleChange : undefined}
                          locked={!canEdit("mother_last_school")}
                          error={errors.mother_last_school}
                          placeholder="Mother Last School"
                        />
                      </Field>
                      <Field
                        label="Course"
                        required
                        error={errors.mother_course}
                        helperText="Required"
                        lockedBadge={!canEdit("mother_course")}
                      >
                        <MInput
                          name="mother_course"
                          value={person.mother_course || ""}
                          onChange={canEdit("mother_course") ? handleChange : undefined}
                          locked={!canEdit("mother_course")}
                          error={errors.mother_course}
                          placeholder="Mother Course"
                        />
                      </Field>
                    </div>
                    <div style={gridCols2}>
                      <Field
                        label="Year Graduated"
                        required
                        error={errors.mother_year_graduated}
                        helperText="Required"
                        lockedBadge={!canEdit("mother_year_graduated")}
                      >
                        <MInput
                          type="number"
                          name="mother_year_graduated"
                          value={person.mother_year_graduated || ""}
                          onChange={canEdit("mother_year_graduated") ? handleChange : undefined}
                          locked={!canEdit("mother_year_graduated")}
                          error={errors.mother_year_graduated}
                          placeholder="Mother Year Graduated"
                        />
                      </Field>
                      <Field
                        label="School Address"
                        required
                        error={errors.mother_school_address}
                        helperText="Required"
                        lockedBadge={!canEdit("mother_school_address")}
                      >
                        <MInput
                          name="mother_school_address"
                          value={person.mother_school_address || ""}
                          onChange={canEdit("mother_school_address") ? handleChange : undefined}
                          locked={!canEdit("mother_school_address")}
                          error={errors.mother_school_address}
                          placeholder="Mother School Address"
                        />
                      </Field>
                    </div>
                  </>
                )}

                <SubHeader>Mother's Contact Information</SubHeader>
                <div style={gridCols2}>
                  <Field
                    label="Contact Number"
                    required
                    error={errors.mother_contact}
                    helperText="Required"
                    lockedBadge={!canEdit("mother_contact")}
                  >
                    <MInput
                      name="mother_contact"
                      value={person.mother_contact || ""}
                      onChange={
                        canEdit("mother_contact")
                          ? (e) =>
                            handleChange({
                              target: { name: "mother_contact", value: e.target.value.replace(/\D/g, "") },
                            })
                          : undefined
                      }
                      locked={!canEdit("mother_contact")}
                      error={errors.mother_contact}
                      placeholder="9XXXXXXXXX"
                    />
                  </Field>
                  <Field
                    label="Occupation"
                    required
                    error={errors.mother_occupation}
                    helperText="Required"
                    lockedBadge={!canEdit("mother_occupation")}
                  >
                    <MInput
                      name="mother_occupation"
                      value={person.mother_occupation || ""}
                      onChange={canEdit("mother_occupation") ? handleChange : undefined}
                      locked={!canEdit("mother_occupation")}
                      error={errors.mother_occupation}
                      placeholder="Mother Occupation"
                    />
                  </Field>
                </div>
                <div style={gridCols2}>
                  <Field
                    label="Employer"
                    required
                    error={errors.mother_employer}
                    helperText="Required"
                    lockedBadge={!canEdit("mother_employer")}
                  >
                    <MInput
                      name="mother_employer"
                      value={person.mother_employer || ""}
                      onChange={canEdit("mother_employer") ? handleChange : undefined}
                      locked={!canEdit("mother_employer")}
                      error={errors.mother_employer}
                      placeholder="Mother Employer"
                    />
                  </Field>
                  <Field
                    label="Monthly Income"
                    required
                    error={errors.mother_income}
                    helperText="Required"
                    lockedBadge={!canEdit("mother_income")}
                  >
                    <MInput
                      type="number"
                      name="mother_income"
                      value={person.mother_income || ""}
                      onChange={
                        canEdit("mother_income")
                          ? (e) =>
                            handleChange({
                              target: { name: "mother_income", value: e.target.value.replace(/\D/g, "") },
                            })
                          : undefined
                      }
                      locked={!canEdit("mother_income")}
                      error={errors.mother_income}
                      placeholder="Mother Income"
                    />
                  </Field>
                </div>
                <Box sx={{ maxWidth: { md: 480 } }}>
                  <Field label="Email Address" lockedBadge={!canEdit("mother_email")}>
                    <MInput
                      type="email"
                      name="mother_email"
                      value={person.mother_email || ""}
                      onChange={canEdit("mother_email") ? handleChange : undefined}
                      locked={!canEdit("mother_email")}
                      placeholder="Mother Email Address"
                    />
                  </Field>
                </Box>
              </>
            )}
          </Box>
        </Box>

        {/* ── Guardian ───────────────────────────────────────────────────── */}
        <Box
          sx={{
            backgroundColor: "#fff",
            borderRadius: "10px",
            mx: { xs: "12px", md: 0 },
            mt: "12px",
            overflow: "hidden",
            boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
            border: `1px solid ${borderColor}`,
          }}
        >
          <Box
            sx={{
              backgroundColor: headerColor || "#1976d2",
              color: "#fff",
              p: { xs: "10px 14px", md: "12px 18px" },
              fontSize: { xs: 13, md: 15 },
              fontWeight: 700,
              letterSpacing: 0.3,
            }}
          >
            In Case of Emergency — Guardian
          </Box>
          <Box sx={{ p: { xs: "14px", md: "20px" } }}>
            <Box sx={{ maxWidth: { md: 420 } }}>
              <Field
                label="Guardian Relationship"
                required
                error={errors.guardian}
                helperText="This field is required."
                lockedBadge={!canEdit("guardian")}
              >
                <MSelect
                  name="guardian"
                  value={person.guardian || ""}
                  onChange={canEdit("guardian") ? handleGuardianChange : undefined}
                  locked={!canEdit("guardian")}
                  error={errors.guardian}
                >
                  <option value="">Select Guardian</option>
                  {[
                    "Father",
                    "Mother",
                    "Brother/Sister",
                    "Uncle",
                    "Aunt",
                    "StepFather",
                    "StepMother",
                    "Cousin",
                    "Father in Law",
                    "Mother in Law",
                    "Sister in Law",
                    "GrandMother",
                    "GrandFather",
                    "Spouse",
                    "Others",
                  ].map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </MSelect>
              </Field>
            </Box>

            <div style={gridCols2}>
              <Field label="Last Name" required error={errors.guardian_family_name} helperText="Required">
                <MInput
                  locked
                  name="guardian_family_name"
                  value={(person.guardian_family_name || "").toUpperCase()}
                  onChange={(e) =>
                    handleChange({ target: { name: "guardian_family_name", value: e.target.value.toUpperCase() } })
                  }
                  error={errors.guardian_family_name}
                  placeholder="Guardian Last Name"
                />
              </Field>
              <Field label="First Name" required error={errors.guardian_given_name} helperText="Required">
                <MInput
                  locked
                  name="guardian_given_name"
                  value={(person.guardian_given_name || "").toUpperCase()}
                  onChange={(e) =>
                    handleChange({ target: { name: "guardian_given_name", value: e.target.value.toUpperCase() } })
                  }
                  error={errors.guardian_given_name}
                  placeholder="Guardian First Name"
                />
              </Field>
            </div>

            <Box sx={{ display: "grid", gridTemplateColumns: isPhone ? "1fr" : "1fr 140px", gap: 2 }}>
              <Field label="Middle Name">
                <MInput
                  locked
                  name="guardian_middle_name"
                  value={(person.guardian_middle_name || "").toUpperCase()}
                  onChange={(e) =>
                    handleChange({ target: { name: "guardian_middle_name", value: e.target.value.toUpperCase() } })
                  }
                  placeholder="Guardian Middle Name"
                />
              </Field>
              <Field label="Extension" lockedBadge={!canEdit("guardian_ext")}>
                <MSelect
                  name="guardian_ext"
                  value={person.guardian_ext || ""}
                  onChange={canEdit("guardian_ext") ? handleChange : undefined}
                  locked={!canEdit("guardian_ext")}
                >
                  <option value="">None</option>
                  {EXT_OPTIONS.map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </MSelect>
              </Field>
            </Box>

            <Box sx={{ maxWidth: { md: 480 } }}>
              <Field label="Nickname" lockedBadge={!canEdit("guardian_nickname")}>
                <MInput
                  name="guardian_nickname"
                  value={person.guardian_nickname || ""}
                  onChange={canEdit("guardian_nickname") ? handleChange : undefined}
                  locked={!canEdit("guardian_nickname")}
                  placeholder="Guardian Nickname"
                />
              </Field>

              <Field
                label="Complete Address"
                required
                error={errors.guardian_address}
                helperText="This field is required."
                lockedBadge={!canEdit("guardian_address")}
              >
                <MInput
                  name="guardian_address"
                  value={person.guardian_address || ""}
                  onChange={canEdit("guardian_address") ? handleChange : undefined}
                  locked={!canEdit("guardian_address")}
                  error={errors.guardian_address}
                  placeholder="Guardian Address"
                />
              </Field>
            </Box>

            <div style={gridCols2}>
              <Field
                label="Contact Number"
                required
                error={errors.guardian_contact}
                helperText="Required"
                lockedBadge={!canEdit("guardian_contact")}
              >
                <MInput
                  name="guardian_contact"
                  value={person.guardian_contact || ""}
                  onChange={
                    canEdit("guardian_contact")
                      ? (e) =>
                        handleChange({
                          target: { name: "guardian_contact", value: e.target.value.replace(/\D/g, "") },
                        })
                      : undefined
                  }
                  locked={!canEdit("guardian_contact")}
                  error={errors.guardian_contact}
                  placeholder="9XXXXXXXXX"
                />
              </Field>
              <Field label="Email Address" lockedBadge={!canEdit("guardian_email")}>
                <MInput
                  type="email"
                  name="guardian_email"
                  value={person.guardian_email || ""}
                  onChange={canEdit("guardian_email") ? handleChange : undefined}
                  locked={!canEdit("guardian_email")}
                  placeholder="Guardian Email Address"
                />
              </Field>
            </div>
          </Box>
        </Box>

        {/* ── Siblings ───────────────────────────────────────────────────── */}
        {/* ── Siblings ───────────────────────────────────────────────────── */}
        <Box sx={{ backgroundColor: "#fff", borderRadius: "10px", mx: { xs: "12px", md: 0 }, mt: "12px", overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.08)", border: `1px solid ${borderColor}` }}>
          <Box sx={{ backgroundColor: headerColor || "#1976d2", color: "#fff", p: { xs: "10px 14px", md: "12px 18px" }, fontSize: { xs: 13, md: 15 }, fontWeight: 700, letterSpacing: 0.3 }}>
            Siblings (Mga Kapatid Mo)
          </Box>
          <Box sx={{ p: { xs: "14px", md: "20px" } }}>
            <CheckRow
              checked={person.has_no_siblings === 1}
              onChange={handleNoSiblingsCheck}
              disabled={!canEdit("siblings")}
              lockedBadge={!canEdit("siblings")}
            >
              Check if there's no siblings
            </CheckRow>

            {errors.siblings && (
              <div style={{ color: "#d32f2f", fontSize: 12, marginBottom: 10 }}>
                Please add at least one sibling, or check "no siblings" above.
              </div>
            )}

            {!canEdit("siblings") && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  backgroundColor: "#fce4ec",
                  color: "#c62828",
                  fontSize: 12,
                  fontWeight: 600,
                  padding: "8px 10px",
                  borderRadius: 6,
                  marginBottom: 12,
                }}
              >
                🔒 Siblings information is locked by admin.
              </div>
            )}

            {person.has_no_siblings !== 1 && (
              <>
                {(person.siblings || []).map((sibling, index) => (
                  <Box
                    key={sibling.id || index}
                    sx={{
                      border: `1px solid ${borderColor}`,
                      borderRadius: 2,
                      p: { xs: 1.5, md: 2 },
                      mb: 2,
                      backgroundColor: canEdit("siblings") ? "#fafafa" : "#f0f0f0",
                    }}
                  >
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
                      <Typography sx={{ fontWeight: 700, fontSize: 13 }}>Sibling {index + 1}</Typography>
                      <Button
                        size="small"
                        variant="outlined"
                        color="error"
                        onClick={() => removeSibling(index)}
                        disabled={!canEdit("siblings")}
                        sx={{ minWidth: 32, fontSize: 12, textTransform: "none" }}
                      >
                        − Remove
                      </Button>
                    </Box>

                    <div style={gridCols2}>
                      <Field label="Name of Sibling" required error={errors[`sibling_name_${index}`]} helperText="This field is required.">
                        <MInput
                          locked={!canEdit("siblings")}
                          value={sibling.name || ""}
                          onChange={(e) => handleSiblingFieldChange(index, "name", e.target.value)}
                          onBlur={handleSiblingFieldBlur}
                          error={errors[`sibling_name_${index}`]}
                          placeholder="Enter Sibling Name"
                        />
                      </Field>
                      <Field label="Age" required error={errors[`sibling_age_${index}`]} helperText="This field is required.">
                        <MInput
                          locked={!canEdit("siblings")}
                          type="number"
                          value={sibling.age || ""}
                          onChange={(e) => handleSiblingFieldChange(index, "age", e.target.value)}
                          onBlur={handleSiblingFieldBlur}
                          error={errors[`sibling_age_${index}`]}
                          placeholder="Age"
                        />
                      </Field>
                    </div>

                    <div style={gridCols2}>
                      <Field label="School Level">
                        <MInput
                          locked={!canEdit("siblings")}
                          value={sibling.schoolLevel || ""}
                          onChange={(e) => handleSiblingFieldChange(index, "schoolLevel", e.target.value)}
                          onBlur={handleSiblingFieldBlur}
                          placeholder="e.g. College"
                        />
                      </Field>
                      <Field label="School Last Attended">
                        <MInput
                          locked={!canEdit("siblings")}
                          value={sibling.schoolLastAttended || ""}
                          onChange={(e) => handleSiblingFieldChange(index, "schoolLastAttended", e.target.value)}
                          onBlur={handleSiblingFieldBlur}
                          placeholder="Enter School Last Attended"
                        />
                      </Field>
                    </div>

                    <Field label="School Address">
                      <MInput
                        locked={!canEdit("siblings")}
                        value={sibling.schoolAddress || ""}
                        onChange={(e) => handleSiblingFieldChange(index, "schoolAddress", e.target.value)}
                        onBlur={handleSiblingFieldBlur}
                        placeholder="Enter School Address"
                      />
                    </Field>

                    <div style={gridCols2}>
                      <Field label="Occupation">
                        <MInput
                          locked={!canEdit("siblings")}
                          value={sibling.occupation || ""}
                          onChange={(e) => handleSiblingFieldChange(index, "occupation", e.target.value)}
                          onBlur={handleSiblingFieldBlur}
                          placeholder="Enter Occupation"
                        />
                      </Field>
                      <Field label="Monthly Income">
                        <MInput
                          locked={!canEdit("siblings")}
                          type="number"
                          value={sibling.monthlyIncome || ""}
                          onChange={(e) => handleSiblingFieldChange(index, "monthlyIncome", e.target.value)}
                          onBlur={handleSiblingFieldBlur}
                          placeholder="Enter Monthly Income"
                        />
                      </Field>
                    </div>
                  </Box>
                ))}

                <Button
                  fullWidth={isPhone}
                  variant="contained"
                  onClick={addSibling}
                  disabled={!canEdit("siblings")}
                  sx={{
                    backgroundColor: mainButtonColor,
                    border: `1px solid ${borderColor}`,
                    color: "#fff",
                    textTransform: "none",
                    fontWeight: 600,
                    "&:hover": { backgroundColor: "#000" },
                  }}
                >
                  + Add Sibling
                </Button>
              </>
            )}
          </Box>
        </Box>

        {/* ── Annual Income + Navigation ───────────────────────────────────── */}
        <Box
          sx={{
            backgroundColor: "#fff",
            borderRadius: "10px",
            mx: { xs: "12px", md: 0 },
            mt: "12px",
            mb: 3,
            overflow: "hidden",
            boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
            border: `1px solid ${borderColor}`,
          }}
        >
          <Box
            sx={{
              backgroundColor: headerColor || "#1976d2",
              color: "#fff",
              p: { xs: "10px 14px", md: "12px 18px" },
              fontSize: { xs: 13, md: 15 },
              fontWeight: 700,
              letterSpacing: 0.3,
            }}
          >
            Family Annual Income
          </Box>
          <Box sx={{ p: { xs: "14px", md: "20px" } }}>
            <Box sx={{ maxWidth: { md: 420 } }}>
              <Field
                label="Annual Income Bracket"
                required
                error={errors.annual_income}
                helperText="This field is required."
                lockedBadge={!canEdit("annual_income")}
              >
                <MSelect
                  name="annual_income"
                  value={person.annual_income || ""}
                  onChange={canEdit("annual_income") ? handleChange : undefined}
                  locked={!canEdit("annual_income")}
                  error={errors.annual_income}
                >
                  <option value="">Select Annual Income</option>
                  {[
                    "80,000 and below",
                    "80,000 to 135,000",
                    "135,000 to 250,000",
                    "250,000 to 500,000",
                    "500,000 to 1,000,000",
                    "1,000,000 and above",
                  ].map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </MSelect>
              </Field>
            </Box>

            <Box
              sx={{
                display: "flex",
                flexDirection: { xs: "column-reverse", sm: "row" },
                justifyContent: "space-between",
                gap: 1.5,
                mt: 3,
              }}
            >
              <Button
                fullWidth={isPhone}
                variant="contained"
                onClick={() => {
                  handleUpdate(person);
                  showSnackbar("Your record has been saved successfully!", "success");
                  setTimeout(() => navigate("/student_personal_information"), 1000);
                }}
                startIcon={<ArrowBackIcon sx={{ color: "#000", transition: "color 0.3s" }} />}
                sx={{
                  backgroundColor: subButtonColor,
                  border: `1px solid ${borderColor}`,
                  color: "#000",
                  textTransform: "none",
                  fontWeight: 600,
                  "&:hover": {
                    backgroundColor: "#000000",
                    color: "#fff",
                    "& .MuiSvgIcon-root": { color: "#fff" },
                  },
                }}
              >
                Previous Step
              </Button>

              <Button
                fullWidth={isPhone}
                variant="contained"
                onClick={() => {
                  handleUpdate(person);
                  if (isFormValid()) {
                    showSnackbar("Your record has been saved successfully!", "success");
                    setTimeout(() => navigate("/student_educational_attainment"), 1000);
                  } else {
                    showSnackbar("Please complete all required fields before proceeding.", "error");
                  }
                }}
                endIcon={<ArrowForwardIcon sx={{ color: "#fff", transition: "color 0.3s" }} />}
                sx={{
                  backgroundColor: mainButtonColor,
                  border: `1px solid ${borderColor}`,
                  color: "#fff",
                  textTransform: "none",
                  fontWeight: 600,
                  "&:hover": {
                    backgroundColor: "#000000",
                    color: "#fff",
                    "& .MuiSvgIcon-root": { color: "#fff" },
                  },
                }}
              >
                Next Step
              </Button>
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default StudentDashboard2Mobile;
