import React, { useState, useEffect, useContext, useRef } from "react";
import axios from "axios";
import { useNavigate, useLocation } from "react-router-dom";
import { SettingsContext } from "../App";
import API_BASE_URL from "../apiConfig";
import DateField from "../components/DateField";
import {
  Button,
  Box,
  Typography,
  Card,
  Checkbox,
  Snackbar,
  Alert,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import PersonIcon from "@mui/icons-material/Person";
import FamilyRestroomIcon from "@mui/icons-material/FamilyRestroom";
import SchoolIcon from "@mui/icons-material/School";
import HealthAndSafetyIcon from "@mui/icons-material/HealthAndSafety";
import InfoIcon from "@mui/icons-material/Info";
import ErrorIcon from "@mui/icons-material/Error";
import LockIcon from "@mui/icons-material/Lock";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { motion } from "framer-motion";
import { CircularProgress } from "@mui/material"; // add to your existing MUI import line
import StudentECATApplicationForm from "./StudentECATApplicationForm";
import StudentPersonalDataForm from "./StudentPersonalDataForm";
import StudentOfficeOfTheRegistrar from "./StudentOfficeOfTheRegistrar";
import StudentServicesSurvey from "./StudentServicesSurvey";
// ─────────────────────────────────────────────────────────────────────────────
// Field-level permission helper (unchanged logic):
//   • non-students → always editable
//   • still loading (null) → optimistic editable
//   • otherwise → follow stored permission (false = locked by admin)
// ─────────────────────────────────────────────────────────────────────────────
const canStudentEdit = (permissions, fieldId, userRole) => {
  if (userRole !== "student") return true;
  if (permissions === null) return true;
  return permissions[fieldId] !== false;
};

// ─── Locked badge — shown inline next to field labels ─────────────────────────
const LockedBadge = () => (
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
    <LockIcon style={{ fontSize: 10 }} />
    Locked by Admin
  </span>
);

// ─── Reusable field wrapper (responsive) ──────────────────────────────────────
const Field = ({ label, lockedBadge, children }) => (
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
        {lockedBadge && <LockedBadge />}
      </label>
    )}
    {children}
  </div>
);

const inputStyle = (hasError, locked, extra = {}) => ({
  width: "100%",
  height: 42,
  padding: "0 12px",
  border: `1px solid ${hasError ? "#d32f2f" : "#ccc"}`,
  borderRadius: 8,
  fontSize: "clamp(13px, 1.6vw, 14px)",
  backgroundColor: locked ? "#f5f5f5" : "#fff",
  boxSizing: "border-box",
  outline: "none",
  color: locked ? "#999" : "#222",
  cursor: locked ? "not-allowed" : "text",
  ...extra,
});

const textareaStyle = (locked) => ({
  width: "100%",
  padding: "10px 12px",
  border: "1px solid #ccc",
  borderRadius: 8,
  fontSize: "clamp(13px, 1.6vw, 14px)",
  backgroundColor: locked ? "#f5f5f5" : "#fff",
  boxSizing: "border-box",
  outline: "none",
  color: locked ? "#999" : "#222",
  cursor: locked ? "not-allowed" : "text",
  resize: locked ? "none" : "vertical",
  minHeight: 80,
  fontFamily: "'Segoe UI', sans-serif",
});

// ─── YES / NO toggle ──────────────────────────────────────────────────────────
const YesNo = ({ fieldKey, person, onChange, disabled }) => (
  <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
      <input
        type="checkbox"
        disabled={disabled}
        checked={person[fieldKey] === 1}
        onChange={() => {
          if (!disabled) onChange(fieldKey, person[fieldKey] === 1 ? null : 1);
        }}
        style={{ width: 16, height: 16, accentColor: "#6D2323" }}
      />
      <span style={{ fontSize: 13, color: disabled ? "#999" : "#333" }}>Yes</span>
    </div>
    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
      <input
        type="checkbox"
        disabled={disabled}
        checked={person[fieldKey] === 0}
        onChange={() => {
          if (!disabled) onChange(fieldKey, person[fieldKey] === 0 ? null : 0);
        }}
        style={{ width: 16, height: 16, accentColor: "#6D2323" }}
      />
      <span style={{ fontSize: 13, color: disabled ? "#999" : "#333" }}>No</span>
    </div>
  </div>
);

// ─── Condition row ────────────────────────────────────────────────────────────
const ConditionRow = ({ label, fieldKey, person, onChange, locked }) => (
  <div
    style={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      borderBottom: "1px solid #f0f0f0",
      marginBottom: 8,
      paddingBottom: 8,
      gap: 12,
      flexWrap: "wrap",
    }}
  >
    <span
      style={{
        fontSize: "clamp(12px, 1.5vw, 14px)",
        color: locked ? "#999" : "#333",
        flex: 1,
        minWidth: 140,
        display: "flex",
        alignItems: "center",
        gap: 4,
      }}
    >
      {label}
      {locked && <LockIcon style={{ fontSize: 12, color: "#c62828" }} />}
    </span>
    <YesNo fieldKey={fieldKey} person={person} onChange={onChange} disabled={locked} />
  </div>
);

const medicalConditions = [
  { label: "Asthma", key: "asthma" },
  { label: "Fainting Spells and Seizures", key: "faintingSpells" },
  { label: "Heart Disease", key: "heartDisease" },
  { label: "Tuberculosis", key: "tuberculosis" },
  { label: "Frequent Headaches", key: "frequentHeadaches" },
  { label: "Hernia", key: "hernia" },
  { label: "Chronic Cough", key: "chronicCough" },
  { label: "Head or Neck Injury", key: "headNeckInjury" },
  { label: "H.I.V", key: "hiv" },
  { label: "High Blood Pressure", key: "highBloodPressure" },
  { label: "Diabetes Mellitus", key: "diabetesMellitus" },
  { label: "Allergies", key: "allergies" },
  { label: "Cancer", key: "cancer" },
  { label: "Smoking of Cigarette/Day", key: "smokingCigarette" },
  { label: "Alcohol Drinking", key: "alcoholDrinking" },
];

const vaccineColumns = [
  { label: "1st Dose", brandKey: "vaccine1Brand", dateKey: "vaccine1Date" },
  { label: "2nd Dose", brandKey: "vaccine2Brand", dateKey: "vaccine2Date" },
  { label: "Booster 1", brandKey: "booster1Brand", dateKey: "booster1Date" },
  { label: "Booster 2", brandKey: "booster2Brand", dateKey: "booster2Date" },
];

const stepsWithIcons = [
  { label: "Personal Information", icon: <PersonIcon /> },
  { label: "Family Background", icon: <FamilyRestroomIcon /> },
  { label: "Educational Attainment", icon: <SchoolIcon /> },
  { label: "Health Medical Records", icon: <HealthAndSafetyIcon /> },
  { label: "Other Information", icon: <InfoIcon /> },
];

const STEP_PATHS = [
  "/student_personal_information",
  "/student_family_background",
  "/student_educational_attainment",
  "/student_health_medical_records",
  "/student_other_information",
];

// ─── Main Component ───────────────────────────────────────────────────────────
const StudentDashboard4Mobile = () => {
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

  // ── Field-level permissions (student-specific, unchanged) ──────────────────
  const [fieldPermissions, setFieldPermissions] = useState(null);
  const [userRole, setUserRole] = useState("");
  const isFieldEditable = (fieldId) => canStudentEdit(fieldPermissions, fieldId, userRole);

  useEffect(() => {
    const loadPermissions = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/api/student_edit_permissions`);
        setFieldPermissions(res.data && typeof res.data === "object" ? res.data : {});
      } catch (err) {
        console.warn("Could not load field permissions, defaulting to all editable:", err.message);
        setFieldPermissions({});
      }
    };
    loadPermissions();
  }, []);

  const [userID, setUserID] = useState("");

  // ── Person state ───────────────────────────────────────────────────────────
  const [person, setPerson] = useState({
    cough: "", colds: "", fever: "",
    asthma: "", faintingSpells: "", heartDisease: "", tuberculosis: "",
    frequentHeadaches: "", hernia: "", chronicCough: "", headNeckInjury: "",
    hiv: "", highBloodPressure: "", diabetesMellitus: "", allergies: "",
    cancer: "", smokingCigarette: "", alcoholDrinking: "",
    hospitalized: "", hospitalizationDetails: "",
    medications: "",
    hadCovid: "", covidDate: "",
    vaccine1Brand: "", vaccine1Date: "",
    vaccine2Brand: "", vaccine2Date: "",
    booster1Brand: "", booster1Date: "",
    booster2Brand: "", booster2Date: "",
    chestXray: "", cbc: "", urinalysis: "", otherworkups: "",
    symptomsToday: "",
    remarks: "",
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
    const loggedInPersonId = localStorage.getItem("person_id");
    const storedRole = localStorage.getItem("role");
    if (!loggedInPersonId) {
      window.location.href = "/login";
      return;
    }
    if (storedRole) setUserRole(storedRole);
    const queryParams = new URLSearchParams(location.search);
    const queryPersonId = queryParams.get("person_id");
    setUserID(queryPersonId || loggedInPersonId);
  }, [location.search]);

  useEffect(() => {
    if (!userID) return;
    axios
      .get(`${API_BASE_URL}/api/student_data_as_applicant/${userID}`)
      .then((res) => {
        if (res.data) setPerson(res.data);
      })
      .catch(console.error);
  }, [userID]);

  // ── Auto-save (student endpoint, unchanged) ─────────────────────────────────
  const handleUpdate = async (updated) => {
    try {
      const { person_id, created_at, current_step, ...clean } = updated;
      await axios.put(`${API_BASE_URL}/api/enrollment/person/${userID}`, clean);
    } catch (err) {
      console.error("Auto-save failed:", err);
    }
  };

  // ── Change helpers, all guarded by field permission (unchanged logic) ──────
  const handleChange = (e) => {
    const { name, type, checked, value } = e.target;
    if (!isFieldEditable(name)) return;
    const updated = { ...person, [name]: type === "checkbox" ? (checked ? 1 : 0) : value };
    setPerson(updated);
    handleUpdate(updated);
  };

  const handleToggle = (fieldKey, newValue) => {
    if (!isFieldEditable(fieldKey)) return;
    const updated = { ...person, [fieldKey]: newValue };
    setPerson(updated);
    handleUpdate(updated);
  };

  const handleTextChange = (name, value) => {
    if (!isFieldEditable(name)) return;
    const updated = { ...person, [name]: value };
    setPerson(updated);
    handleUpdate(updated);
  };

  const [activeStep, setActiveStep] = useState(3);

  const handleStepClick = (index) => {
    showSnackbar("Your record has been saved successfully!", "success");
    setTimeout(() => {
      setActiveStep(index);
      navigate(STEP_PATHS[index]);
    }, 1000);
  };

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

  // Cards per row depending on viewport
  const cardBasis = isPhone ? "calc(50% - 6px)" : isTablet ? "calc(33.333% - 8px)" : "calc(20% - 13px)";

  // Content max width so it doesn't stretch edge-to-edge on large desktop monitors
  const contentMaxWidth = isDesktop ? 1000 : "100%";

  const symptomsAllLocked = !isFieldEditable("cough") && !isFieldEditable("colds") && !isFieldEditable("fever");

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

      {/* Toast */}
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
            HEALTH MEDICAL RECORDS
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

        {/* ── Step Header Bar ────────────────────────────────────────── */}
        <Box
          sx={{
            backgroundColor: headerColor || "#1976d2",
            border: `1px solid ${borderColor}`,
            color: "white",
            borderRadius: 2,
            mx: { xs: "12px", md: 0 },
            mt: "12px",
            p: { xs: "10px 14px", md: "12px 18px" },
          }}
        >
          <Typography sx={{ fontSize: { xs: 14, md: 16 }, fontFamily: "Poppins, sans-serif" }}>
            Step 4: Health and Medical Records
          </Typography>
        </Box>

        {/* ── I. Symptoms Today ────────────────────────────────────────── */}
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
            I. Symptoms Today
          </Box>
          <Box sx={{ p: { xs: "14px", md: "20px" } }}>
            <div style={{ fontSize: 12, color: "#555", marginBottom: 12, display: "flex", alignItems: "center" }}>
              Do you have any of the following symptoms today?
              {symptomsAllLocked && <LockedBadge />}
            </div>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: { xs: 0, md: 4 } }}>
              {["cough", "colds", "fever"].map((symptom) => {
                const locked = !isFieldEditable(symptom);
                return (
                  <div key={symptom} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <Checkbox
                      name={symptom}
                      disabled={locked}
                      checked={person[symptom] === 1}
                      onChange={(e) => {
                        if (locked) return;
                        const updated = { ...person, [symptom]: e.target.checked ? 1 : 0 };
                        setPerson(updated);
                        handleUpdate(updated);
                      }}
                      sx={{ p: 0.5, "& .MuiSvgIcon-root": { fontSize: 20 } }}
                    />
                    <span style={{ fontSize: 14, color: locked ? "#999" : "#333", display: "flex", alignItems: "center", gap: 4 }}>
                      {symptom.charAt(0).toUpperCase() + symptom.slice(1)}
                      {locked && <LockIcon style={{ fontSize: 12, color: "#c62828" }} />}
                    </span>
                  </div>
                );
              })}
            </Box>
          </Box>
        </Box>

        {/* ── II. Medical History ─────────────────────────────────────── */}
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
            II. Medical History
          </Box>
          <Box sx={{ p: { xs: "14px", md: "20px" } }}>
            <div style={{ fontSize: 12, color: "#555", marginBottom: 12 }}>
              Have you suffered from, or been told you had, any of the following
              conditions?
            </div>

            <Box
              sx={{
                columnCount: { xs: 1, md: 2 },
                columnGap: "32px",
              }}
            >
              {medicalConditions.map(({ label, key }) => (
                <Box key={key} sx={{ breakInside: "avoid" }}>
                  <ConditionRow
                    label={label}
                    fieldKey={key}
                    person={person}
                    onChange={handleToggle}
                    locked={!isFieldEditable(key)}
                  />
                </Box>
              ))}
            </Box>

            <hr style={{ border: "none", borderTop: "1px solid #e0e0e0", margin: "14px 0 10px" }} />

            {/* Hospitalization */}
            <div
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: "#6D2323",
                textTransform: "uppercase",
                letterSpacing: 0.5,
                marginBottom: 10,
                display: "flex",
                alignItems: "center",
              }}
            >
              Hospitalization History
              {!isFieldEditable("hospitalized") && <LockedBadge />}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 10 }}>
              <span style={{ fontSize: 13, color: !isFieldEditable("hospitalized") ? "#999" : "#333" }}>
                Do you have any previous history of hospitalization or operation?
              </span>
              <YesNo
                fieldKey="hospitalized"
                person={person}
                onChange={handleToggle}
                disabled={!isFieldEditable("hospitalized")}
              />
            </div>

            <Box sx={{ maxWidth: { md: 480 } }}>
              <Field label="If Yes, Please Specify:" lockedBadge={!isFieldEditable("hospitalizationDetails")}>
                <input
                  type="text"
                  name="hospitalizationDetails"
                  readOnly={!isFieldEditable("hospitalizationDetails")}
                  value={person.hospitalizationDetails || ""}
                  onChange={(e) => handleTextChange("hospitalizationDetails", e.target.value)}
                  style={inputStyle(false, !isFieldEditable("hospitalizationDetails"))}
                  placeholder="Enter details..."
                />
              </Field>
            </Box>
          </Box>
        </Box>

        {/* ── III. Medication ─────────────────────────────────────────── */}
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
            III. Medication
          </Box>
          <Box sx={{ p: { xs: "14px", md: "20px" } }}>
            <Field label="List all current medications:" lockedBadge={!isFieldEditable("medications")}>
              <textarea
                name="medications"
                readOnly={!isFieldEditable("medications")}
                value={person.medications || ""}
                onChange={(e) => handleTextChange("medications", e.target.value)}
                style={textareaStyle(!isFieldEditable("medications"))}
                placeholder="Enter medications or type NA"
              />
            </Field>
          </Box>
        </Box>

        {/* ── IV. COVID Profile ────────────────────────────────────────── */}
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
            IV. COVID Profile
          </Box>
          <Box sx={{ p: { xs: "14px", md: "20px" } }}>
            <div
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: "#6D2323",
                textTransform: "uppercase",
                letterSpacing: 0.5,
                marginBottom: 10,
                display: "flex",
                alignItems: "center",
              }}
            >
              A. COVID-19 History
              {!isFieldEditable("hadCovid") && <LockedBadge />}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 10 }}>
              <span style={{ fontSize: 13, color: !isFieldEditable("hadCovid") ? "#999" : "#333" }}>
                Do you have history of COVID-19?
              </span>
              <YesNo
                fieldKey="hadCovid"
                person={person}
                onChange={handleToggle}
                disabled={!isFieldEditable("hadCovid")}
              />
            </div>

            <Box sx={{ maxWidth: { md: 300 } }}>
              <Field label="If Yes, When:" lockedBadge={!isFieldEditable("covidDate")}>
                <DateField
                  size="small"
                  name="covidDate"
                  readOnly={!isFieldEditable("covidDate")}
                  value={person.covidDate || ""}
                  onChange={(e) => handleTextChange("covidDate", e.target.value)}
                  style={inputStyle(false, !isFieldEditable("covidDate"))}
                />
              </Field>
            </Box>

            <hr style={{ border: "none", borderTop: "1px solid #e0e0e0", margin: "14px 0 10px" }} />

            {/* B. Vaccinations */}
            <div
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: "#6D2323",
                textTransform: "uppercase",
                letterSpacing: 0.5,
                marginBottom: 10,
              }}
            >
              B. COVID Vaccinations
            </div>

            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
                gap: 1.5,
              }}
            >
              {vaccineColumns.map(({ label, brandKey, dateKey }) => {
                const brandLocked = !isFieldEditable(brandKey);
                const dateLocked = !isFieldEditable(dateKey);
                return (
                  <Box
                    key={brandKey}
                    sx={{
                      backgroundColor: "#fafafa",
                      border: "1px solid #e8e8e8",
                      borderRadius: 2,
                      p: "10px 12px",
                    }}
                  >
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#6D2323", marginBottom: 8 }}>{label}</div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <div style={{ flex: 1 }}>
                        <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#444", marginBottom: 4 }}>
                          Brand
                          {brandLocked && <LockedBadge />}
                        </label>
                        <input
                          type="text"
                          name={brandKey}
                          readOnly={brandLocked}
                          value={person[brandKey] || ""}
                          onChange={(e) => handleTextChange(brandKey, e.target.value)}
                          style={inputStyle(false, brandLocked, { height: 38 })}
                          placeholder="Brand name"
                        />
                      </div>
                      <div style={{ flex: 1 }}>
                        <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#444", marginBottom: 4 }}>
                          Date
                          {dateLocked && <LockedBadge />}
                        </label>
                        <DateField
                          size="small"
                          name={dateKey}
                          readOnly={dateLocked}
                          value={person[dateKey] || ""}
                          onChange={(e) => handleTextChange(dateKey, e.target.value)}
                          style={inputStyle(false, dateLocked, { height: 38 })}
                        />
                      </div>
                    </div>
                  </Box>
                );
              })}
            </Box>
          </Box>
        </Box>

        {/* ── V. Laboratory Results ───────────────────────────────────── */}
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
            V. Laboratory Results
          </Box>
          <Box sx={{ p: { xs: "14px", md: "20px" } }}>
            <div style={{ fontSize: 12, color: "#555", marginBottom: 12 }}>
              Please indicate the result of the following:
            </div>
            <div style={gridCols2}>
              {[
                { label: "Chest X-ray", key: "chestXray" },
                { label: "CBC", key: "cbc" },
                { label: "Urinalysis", key: "urinalysis" },
                { label: "Other Workups", key: "otherworkups" },
              ].map(({ label, key }) => {
                const locked = !isFieldEditable(key);
                return (
                  <Field key={key} label={label} lockedBadge={locked}>
                    <input
                      type="text"
                      name={key}
                      readOnly={locked}
                      value={person[key] || ""}
                      onChange={(e) => handleTextChange(key, e.target.value)}
                      style={inputStyle(false, locked)}
                      placeholder="Enter result or NA"
                    />
                  </Field>
                );
              })}
            </div>
          </Box>
        </Box>

        {/* ── VI. Diagnosis — system-locked for students ───────────────── */}
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
            VI. Diagnosis
          </Box>
          <Box sx={{ p: { xs: "14px", md: "20px" }, backgroundColor: userRole === "student" ? "#fafafa" : undefined }}>
            <div
              style={{
                fontSize: 13,
                color: userRole === "student" ? "#999" : "#333",
                marginBottom: 12,
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              Diagnosis Result:
              {userRole === "student" && <LockedBadge />}
            </div>
            <Box sx={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
              <div style={{ display: "flex", alignItems: "center" }}>
                <Checkbox
                  name="symptomsToday"
                  disabled={userRole === "student"}
                  checked={person.symptomsToday === 0}
                  onChange={() => {
                    if (userRole === "student") return;
                    const updated = { ...person, symptomsToday: person.symptomsToday === 0 ? null : 0 };
                    setPerson(updated);
                    handleUpdate(updated);
                  }}
                  sx={{ p: 0.5 }}
                />
                <span style={{ fontSize: 13, marginLeft: 4, color: userRole === "student" ? "#999" : "#333" }}>
                  Physically Fit
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center" }}>
                <Checkbox
                  name="symptomsToday"
                  disabled={userRole === "student"}
                  checked={person.symptomsToday === 1}
                  onChange={() => {
                    if (userRole === "student") return;
                    const updated = { ...person, symptomsToday: person.symptomsToday === 1 ? null : 1 };
                    setPerson(updated);
                    handleUpdate(updated);
                  }}
                  sx={{ p: 0.5 }}
                />
                <span style={{ fontSize: 13, marginLeft: 4, color: userRole === "student" ? "#999" : "#333" }}>
                  For Compliance
                </span>
              </div>
            </Box>
          </Box>
        </Box>

        {/* ── VII. Remarks + Navigation — system-locked for students ────── */}
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
            VII. Remarks
          </Box>
          <Box sx={{ p: { xs: "14px", md: "20px" }, backgroundColor: userRole === "student" ? "#fafafa" : undefined }}>
            <label
              style={{
                display: "flex",
                alignItems: "center",
                fontSize: "clamp(11px, 1.4vw, 13px)",
                fontWeight: 600,
                color: "#444",
                marginBottom: 5,
              }}
            >
              Remarks:
              {userRole === "student" && <LockedBadge />}
            </label>
            <textarea
              name="remarks"
              readOnly={userRole === "student"}
              value={person.remarks || ""}
              onChange={(e) => {
                if (userRole === "student") return;
                handleTextChange("remarks", e.target.value);
              }}
              style={textareaStyle(userRole === "student")}
              placeholder="Remarks from physician..."
            />

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
                  setTimeout(() => navigate("/student_educational_attainment"), 1000);
                }}
                startIcon={<ArrowBackIcon sx={{ color: "#000", transition: "color 0.3s" }} />}
                sx={{
                  backgroundColor: subButtonColor,
                  border: `1px solid ${borderColor}`,
                  color: "#000",
                  textTransform: "none",
                  fontWeight: 600,
                  "&:hover": {
                    backgroundColor: "#000",
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
                  showSnackbar("Your record has been saved successfully!", "success");
                  setTimeout(() => navigate("/student_other_information"), 1000);
                }}
                endIcon={<ArrowForwardIcon sx={{ color: "#fff", transition: "color 0.3s" }} />}
                sx={{
                  backgroundColor: mainButtonColor,
                  border: `1px solid ${borderColor}`,
                  color: "#fff",
                  textTransform: "none",
                  fontWeight: 600,
                  "&:hover": {
                    backgroundColor: "#000",
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

export default StudentDashboard4Mobile;
