import React, { useState, useEffect, useContext, useRef } from "react";
import { SettingsContext } from "../App";
import axios from "axios";
import {
  Button,
  Box,
  Typography,
  Card,
  Modal,
  Checkbox,
  Snackbar,
  Alert,
  CircularProgress,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import PersonIcon from "@mui/icons-material/Person";
import FamilyRestroomIcon from "@mui/icons-material/FamilyRestroom";
import SchoolIcon from "@mui/icons-material/School";
import HealthAndSafetyIcon from "@mui/icons-material/HealthAndSafety";
import InfoIcon from "@mui/icons-material/Info";
import ErrorIcon from "@mui/icons-material/Error";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import ExamPermit from "./ExamPermit";
import API_BASE_URL from "../apiConfig";
import DateField from "../components/DateField";
import PersonalDataForm from "./PersonalDataForm";
import OfficeOfTheRegistrar from "./OfficeOfTheRegistrar";
import AdmissionServices from "./ApplicantServicesSurvey";
import ECATApplicationForm from "./ECATApplicationForm";

// ─── Reusable field wrapper ───────────────────────────────────────────────────
const Field = ({ label, children }) => (
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
      </label>
    )}
    {children}
  </div>
);

const inputStyle = (hasError, extra = {}) => ({
  width: "100%",
  height: 42,
  padding: "0 12px",
  border: `1px solid ${hasError ? "#d32f2f" : "#ccc"}`,
  borderRadius: 8,
  fontSize: "clamp(13px, 1.6vw, 14px)",
  backgroundColor: "#fff",
  boxSizing: "border-box",
  outline: "none",
  color: "#222",
  ...extra,
});

const textareaStyle = {
  width: "100%",
  padding: "10px 12px",
  border: "1px solid #ccc",
  borderRadius: 8,
  fontSize: "clamp(13px, 1.6vw, 14px)",
  backgroundColor: "#fff",
  boxSizing: "border-box",
  outline: "none",
  color: "#222",
  resize: "vertical",
  minHeight: 80,
  fontFamily: "'Segoe UI', sans-serif",
};

// ─── YES / NO toggle ──────────────────────────────────────────────────────────
const YesNo = ({ fieldKey, value, onChange }) => (
  <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
      <input
        type="checkbox"
        checked={value === 1}
        onChange={() => onChange(fieldKey, value === 1 ? null : 1)}
        style={{ width: 16, height: 16, accentColor: "#6D2323" }}
      />
      <span style={{ fontSize: 13, color: "#333" }}>Yes</span>
    </div>
    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
      <input
        type="checkbox"
        checked={value === 0}
        onChange={() => onChange(fieldKey, value === 0 ? null : 0)}
        style={{ width: 16, height: 16, accentColor: "#6D2323" }}
      />
      <span style={{ fontSize: 13, color: "#333" }}>No</span>
    </div>
  </div>
);

// ─── Condition row ────────────────────────────────────────────────────────────
const ConditionRow = ({ label, fieldKey, person, onChange }) => (
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
    <span style={{ fontSize: "clamp(12px, 1.5vw, 14px)", color: "#333", flex: 1, minWidth: 140 }}>{label}</span>
    <YesNo fieldKey={fieldKey} value={person[fieldKey]} onChange={onChange} />
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
  { label: "Smoking of Cigarette/Day", key: "smoking" },
  { label: "Alcohol Drinking", key: "alcoholDrinking" },
];

const vaccineColumns = [
  { label: "1st Dose", brandKey: "vaccine1Brand", dateKey: "vaccine1Date" },
  { label: "2nd Dose", brandKey: "vaccine2Brand", dateKey: "vaccine2Date" },
  { label: "Booster 1", brandKey: "booster1Brand", dateKey: "booster1Date" },
  { label: "Booster 2", brandKey: "booster2Brand", dateKey: "booster2Date" },
];

// ─── Main Component ───────────────────────────────────────────────────────────
const ApplicantHealthMedicalRecordsMobile = (props) => {
  const settings = useContext(SettingsContext);
  const colors = settings?.colors || {};
  const branding = settings?.branding || {};
  const assets = settings?.assets || {};
  const headerColor = colors.header || "#1976d2";
  const navigate = useNavigate();
  const theme = useTheme();

  // Breakpoints: phone < 600px, tablet 600–959px, desktop >= 960px
  const isPhone = useMediaQuery(theme.breakpoints.down("sm"));
  const isTablet = useMediaQuery(theme.breakpoints.between("sm", "md"));
  const isDesktop = useMediaQuery(theme.breakpoints.up("md"));

  // Two-column fields stack on phone, sit side-by-side from tablet up
  const gridCols2 = { display: "grid", gridTemplateColumns: isPhone ? "1fr" : "1fr 1fr", gap: 16 };
  // Vaccine grid: 2 cols on desktop/tablet, 1 col on very small screens (already narrow inputs, keep 2 unless phone-tiny)
  const vaccineGrid = { display: "flex", gap: 8, flexWrap: isPhone ? "wrap" : "nowrap" };

  // ── Theme state ─────────────────────────────────────────────────────────
  const [titleColor, setTitleColor] = useState("#000000");
  const [subtitleColor, setSubtitleColor] = useState("#555555");
  const [borderColor, setBorderColor] = useState("#000000");
  const [mainButtonColor, setMainButtonColor] = useState("#1976d2");
  const [subButtonColor, setSubButtonColor] = useState("#ffffff");
  const [companyName, setCompanyName] = useState("");
  const [shortTerm, setShortTerm] = useState("");

  // ── User / person state ─────────────────────────────────────────────────
  const [userID, setUserID] = useState("");
  const [userRole, setUserRole] = useState("");
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

  // ── Exam permit state ───────────────────────────────────────────────────
  const divToPrintRef = useRef();
  const [showPrintView, setShowPrintView] = useState(false);
  const [examPermitError, setExamPermitError] = useState("");
  const [examPermitModalOpen, setExamPermitModalOpen] = useState(false);
  const [canPrintPermit, setCanPrintPermit] = useState(false);

  // ── Snackbar ───────────────────────────────────────────────────────────────
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "warning" });

  const handleCloseSnackbar = (event, reason) => {
    if (reason === "clickaway") return;
    setSnackbar((prev) => ({ ...prev, open: false }));
  };

  const showSnackbar = (message, severity = "warning") => {
    setSnackbar({ open: true, message, severity });
  };

  // ── Apply settings ──────────────────────────────────────────────────────
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

  // ── Auth + load (do not alter) ──────────────────────────────────────────
  useEffect(() => {
    const storedUser = localStorage.getItem("email");
    const storedRole = localStorage.getItem("role");
    const storedID = localStorage.getItem("person_id");
    const keys = JSON.parse(localStorage.getItem("dashboardKeys") || "{}");
    if (keys.step4) {
      navigate(`/applicant_health_medical_records/${keys.step4}`);
    }
    const overrideId = props?.adminOverridePersonId;

    if (overrideId) {
      setUserRole("superadmin");
      setUserID(overrideId);
      fetchPersonData(overrideId);
      return;
    }

    if (storedUser && storedRole && storedID) {
      setUserRole(storedRole);
      setUserID(storedID);
      if (storedRole === "applicant") {
        fetchPersonData(storedID);
      } else {
        window.location.href = "/login";
      }
    } else {
      window.location.href = "/login";
    }
  }, []);

  // ── Fetch person (do not alter) ─────────────────────────────────────────
  const fetchPersonData = async (id) => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/person/${id}`);
      setPerson(res.data);
    } catch (error) { }
  };

  // ── handleUpdate (do not alter) ─────────────────────────────────────────
  const handleUpdate = async (updatedPerson) => {
    try {
      if (!updatedPerson || Object.keys(updatedPerson).length === 0) {
        console.warn("⚠️ No data to update — skipping request.");
        return;
      }
      const cleanedData = Object.fromEntries(
        Object.entries(updatedPerson).map(([key, value]) => [
          key,
          value === undefined ? null : value,
        ])
      );
      const response = await axios.put(
        `${API_BASE_URL}/api/person/${userID}`,
        cleanedData
      );
      console.log("✅ Auto-saved successfully:", response.data);
    } catch (error) {
      console.error("❌ Auto-save failed:", error.response?.data || error.message);
    }
  };

  // ── Toggle helper for yes/no fields ───────────────────────────────────────
  const handleToggle = (fieldKey, newValue) => {
    const updated = { ...person, [fieldKey]: newValue };
    setPerson(updated);
    handleUpdate(updated);
  };

  // ── Text change helper ─────────────────────────────────────────────────────
  const handleTextChange = (name, value) => {
    const updated = { ...person, [name]: value };
    setPerson(updated);
    handleUpdate(updated);
  };

  // ── Exam permit eligibility ─────────────────────────────────────────────
  useEffect(() => {
    if (!userID) return;
    axios
      .get(`${API_BASE_URL}/api/verified-exam-applicants`)
      .then((res) => {
        const verified = res.data.some(
          (a) => a.person_id === parseInt(userID)
        );
        setCanPrintPermit(verified);
      });
  }, [userID]);

  const handleCloseExamPermitModal = () => {
    setExamPermitModalOpen(false);
    setExamPermitError("");
  };

  // ── Unified "which card is generating" state ────────────────────────────
  const [generatingKey, setGeneratingKey] = useState(null); // e.g. "ecat" | "admissionForm" | ...
  const hiddenFormRef = useRef();

  const FORM_CONFIGS = {
    ecat: {
      label: "ECAT Application Form",
      endpoint: "/api/generate-ecat-form-pdf",
      filenamePrefix: "ECAT_Application_Form",
      Component: ECATApplicationForm,
    },
    personalData: {
      label: "Personal Data Form",
      endpoint: "/api/generate-personal-data-form-pdf",
      filenamePrefix: "Personal_Data_Form",
      Component: PersonalDataForm,
    },
    registrar: {
      label: "Office of the Registrar",
      endpoint: "/api/generate-registrar-form-pdf",
      filenamePrefix: "Office_Of_The_Registrar",
      Component: OfficeOfTheRegistrar,
    },
    admissionServices: {
      label: "Application/Student Satisfactory Survey",
      endpoint: "/api/generate-admission-services-pdf",
      filenamePrefix: "Admission_Services_CSM_Form",
      Component: AdmissionServices,
      dateStamped: true, // no applicant-specific filename (matches backend route)
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
    if (!config || generatingKey) return; // ignore clicks while something's already generating

    // ✅ NEW — block printing until Terms of Agreement step is completed
    if (person.termsOfAgreement !== 1) {
      setSnackbar({
        open: true,
        message:
          "⚠️ Please complete all steps and accept the Terms of Agreement before printing your documents.",
        severity: "warning",
      });
      return;
    }

    setGeneratingKey(key);

    try {
      // Give the hidden component time to mount AND finish its own internal
      // fetches (person data, curriculum options, active school year, etc.)
      // before we read its rendered HTML — same trick as downloadExamPermitPDF.
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
    if (generatingKey) return; // ignore clicks while something's already generating
    try {
      const res = await axios.get(`${API_BASE_URL}/api/verified-exam-applicants`);
      const verified = res.data.some((a) => a.person_id === parseInt(userID));

      if (!verified) {
        setExamPermitError("❌ You cannot download the Exam Permit until all required documents are verified.");
        setExamPermitModalOpen(true);
        return;
      }

      setGeneratingKey("examPermitDownload"); // ← unified spinner
      setShowPrintView(true);
      await new Promise((resolve) => setTimeout(resolve, 800));

      const divToPrint = divToPrintRef.current;
      if (!divToPrint) throw new Error("Exam permit content did not render in time.");

      const applicantRes = await axios.get(`${API_BASE_URL}/api/applicant_number/${userID}`);
      const applicantNumber = applicantRes.data?.applicant_number || "";

      const response = await axios.post(
        `${API_BASE_URL}/api/generate-exam-permit-pdf`,
        {
          html: divToPrint.innerHTML,
          applicant_number: applicantNumber,
          last_name: person?.last_name || "",
          first_name: person?.first_name || "",
        },
        { responseType: "blob" },
      );

      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const lastName = (person?.last_name || "Applicant").trim().replace(/\s+/g, "_");
      const firstName = (person?.first_name || "").trim().replace(/\s+/g, "_");
      const applicantNo = applicantNumber ? `_${applicantNumber}` : "";
      const fileName = `Exam_Permit_${lastName}${firstName ? "_" + firstName : ""}${applicantNo}.pdf`;

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

  // ── Keys & steps navigation ──────────────────────────────────────────────
  const keys = JSON.parse(localStorage.getItem("dashboardKeys") || "{}");

  const stepsWithPaths = [
    { label: "Personal Information", icon: <PersonIcon />, path: `/applicant_personal_information/${keys.step1}` },
    { label: "Family Background", icon: <FamilyRestroomIcon />, path: `/applicant_family_background/${keys.step2}` },
    { label: "Educational Attainment", icon: <SchoolIcon />, path: `/applicant_educational_attainment/${keys.step3}` },
    { label: "Health Medical Records", icon: <HealthAndSafetyIcon />, path: `/applicant_health_medical_records/${keys.step4}` },
    { label: "Other Information", icon: <InfoIcon />, path: `/applicant_other_information/${keys.step5}` },
  ];

  const [activeStep, setActiveStep] = useState(3);
  const [clickedSteps, setClickedSteps] = useState(Array(stepsWithPaths.length).fill(false));

  const handleStepClick = (index) => {
    setActiveStep(index);
    const newClickedSteps = [...clickedSteps];
    newClickedSteps[index] = true;
    setClickedSteps(newClickedSteps);
    showSnackbar("Your record has been saved successfully!", "success");
    setTimeout(() => navigate(stepsWithPaths[index].path), 1000);
  };

  // ── Links (now generate PDFs directly, same as the web version) ─────────
  const links = [
    { key: "ecat", label: "ECAT Application Form", onClick: () => generateFormPdf("ecat") },
    { key: "personalData", label: "Personal Data Form", onClick: () => generateFormPdf("personalData") },
    {
      key: "registrar",
      label: `Application For ${shortTerm ? shortTerm.toUpperCase() : ""} College Admission`,
      onClick: () => generateFormPdf("registrar"),
    },
    {
      key: "admissionServices",
      label: "Application/Student Satisfactory Survey",
      onClick: () => generateFormPdf("admissionServices"),
    },
    { key: "examPermitDownload", label: "Examination Permit", onClick: downloadExamPermitPDF },
  ];

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
      {/* Hidden print target for the exam permit PDF */}
      {showPrintView && (
        <div ref={divToPrintRef} style={{ position: "absolute", left: "-9999px", top: 0 }}>
          <ExamPermit />
        </div>
      )}

      {/* Hidden render target used to build each generated PDF's HTML */}
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
        {/* ── Page Header ─────────────────────────────────────────────── */}
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

        {/* ── Notice Banner ───────────────────────────────────────────── */}
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

        {/* ── Printable Documents ─────────────────────────────────────── */}
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
            {links.map((lnk, i) => {
              const isGenerating = generatingKey === lnk.key;
              const disabled = generatingKey !== null;

              return (
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
                      cursor: disabled ? "default" : "pointer",
                      opacity: disabled && !isGenerating ? 0.5 : 1,
                      pointerEvents: disabled ? "none" : "auto",
                      transition: "all 0.25s ease-in-out",
                      "&:hover": !disabled && {
                        transform: { md: "scale(1.04)" },
                        backgroundColor: headerColor || "#6D2323",
                        "& .chip-icon": { color: "#fff" },
                        "& .chip-text": { color: "#fff" },
                      },
                    }}
                    onClick={() => {
                      if (disabled) return;
                      if (lnk.onClick) lnk.onClick();
                      else if (lnk.to) navigate(lnk.to);
                    }}
                  >
                    {isGenerating ? (
                      <CircularProgress size={20} sx={{ color: mainButtonColor || "#6D2323" }} />
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
                      {isGenerating ? "Generating PDF..." : lnk.label}
                    </Typography>
                  </Card>
                </motion.div>
              );
            })}
          </Box>
        </Box>

        {/* ── Applicant Form Intro ────────────────────────────────────── */}
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
            APPLICANT FORM
          </Typography>
          <Typography sx={{ fontSize: { xs: 13, md: 15 }, color: "#555" }}>
            Complete the applicant form to secure your place for the upcoming
            academic year at{" "}
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

        {/* ── Stepper ─────────────────────────────────────────────────── */}
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
          {stepsWithPaths.map((step, index) => (
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
              {index < stepsWithPaths.length - 1 && (
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
            <div style={{ fontSize: 12, color: "#555", marginBottom: 12 }}>
              Do you have any of the following symptoms today?
            </div>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: { xs: 0, md: 4 } }}>
              {["cough", "colds", "fever"].map((symptom) => (
                <div key={symptom} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <Checkbox
                    name={symptom}
                    checked={person[symptom] === 1}
                    onChange={(e) => {
                      const updated = { ...person, [symptom]: e.target.checked ? 1 : 0 };
                      setPerson(updated);
                      handleUpdate(updated);
                    }}
                    onBlur={() => handleUpdate(person)}
                    sx={{ p: 0.5, "& .MuiSvgIcon-root": { fontSize: 20 } }}
                  />
                  <span style={{ fontSize: 14, color: "#333" }}>
                    {symptom.charAt(0).toUpperCase() + symptom.slice(1)}
                  </span>
                </div>
              ))}
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
                  <ConditionRow label={label} fieldKey={key} person={person} onChange={handleToggle} />
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
              }}
            >
              Hospitalization History
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 10 }}>
              <span style={{ fontSize: 13, color: "#333" }}>
                Do you have any previous history of hospitalization or operation?
              </span>
              <YesNo fieldKey="hospitalized" value={person.hospitalized} onChange={handleToggle} />
            </div>

            <Box sx={{ maxWidth: { md: 480 } }}>
              <Field label="If Yes, Please Specify:">
                <input
                  type="text"
                  name="hospitalizationDetails"
                  value={person.hospitalizationDetails || ""}
                  onChange={(e) => handleTextChange("hospitalizationDetails", e.target.value)}
                  onBlur={() => handleUpdate(person)}
                  style={inputStyle(false)}
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
            <Field label="List all current medications:">
              <textarea
                name="medications"
                value={person.medications || ""}
                onChange={(e) => handleTextChange("medications", e.target.value)}
                onBlur={() => handleUpdate(person)}
                style={textareaStyle}
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
              }}
            >
              A. COVID-19 History
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 10 }}>
              <span style={{ fontSize: 13, color: "#333" }}>Do you have history of COVID-19?</span>
              <YesNo fieldKey="hadCovid" value={person.hadCovid} onChange={handleToggle} />
            </div>

            <Box sx={{ maxWidth: { md: 300 } }}>
              <Field label="If Yes, When:">
                <DateField
                  size="small"
                  name="covidDate"
                  value={person.covidDate || ""}
                  onChange={(e) => handleTextChange("covidDate", e.target.value)}
                  onBlur={() => handleUpdate(person)}
                  style={inputStyle(false)}
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
              {vaccineColumns.map(({ label, brandKey, dateKey }) => (
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
                      </label>
                      <input
                        type="text"
                        name={brandKey}
                        value={person[brandKey] || ""}
                        onChange={(e) => handleTextChange(brandKey, e.target.value)}
                        onBlur={() => handleUpdate(person)}
                        style={inputStyle(false, { height: 38 })}
                        placeholder="Brand name"
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#444", marginBottom: 4 }}>
                        Date
                      </label>
                      <DateField
                        size="small"
                        name={dateKey}
                        value={person[dateKey] || ""}
                        onChange={(e) => handleTextChange(dateKey, e.target.value)}
                        onBlur={() => handleUpdate(person)}
                        style={inputStyle(false, { height: 38 })}
                      />
                    </div>
                  </div>
                </Box>
              ))}
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
              ].map(({ label, key }) => (
                <Field key={key} label={label}>
                  <input
                    type="text"
                    name={key}
                    value={person[key] || ""}
                    onChange={(e) => handleTextChange(key, e.target.value)}
                    onBlur={() => handleUpdate(person)}
                    style={inputStyle(false)}
                    placeholder="Enter result or NA"
                  />
                </Field>
              ))}
            </div>
          </Box>
        </Box>

        {/* ── VI. Diagnosis ────────────────────────────────────────────── */}
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
          <Box sx={{ p: { xs: "14px", md: "20px" } }}>
            <div style={{ fontSize: 13, color: "#333", marginBottom: 12 }}>
              Do you have any of the following symptoms today?
            </div>
            <Box sx={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
              <div style={{ display: "flex", alignItems: "center" }}>
                <Checkbox
                  name="symptomsToday"
                  checked={person.symptomsToday === 0}
                  onChange={() => {
                    const updated = { ...person, symptomsToday: person.symptomsToday === 0 ? null : 0 };
                    setPerson(updated);
                    handleUpdate(updated);
                  }}
                  onBlur={() => handleUpdate(person)}
                  sx={{ p: 0.5 }}
                />
                <span style={{ fontSize: 13, marginLeft: 4 }}>Physically Fit</span>
              </div>
              <div style={{ display: "flex", alignItems: "center" }}>
                <Checkbox
                  name="symptomsToday"
                  checked={person.symptomsToday === 1}
                  onChange={() => {
                    const updated = { ...person, symptomsToday: person.symptomsToday === 1 ? null : 1 };
                    setPerson(updated);
                    handleUpdate(updated);
                  }}
                  onBlur={() => handleUpdate(person)}
                  sx={{ p: 0.5 }}
                />
                <span style={{ fontSize: 13, marginLeft: 4 }}>For Compliance</span>
              </div>
            </Box>
          </Box>
        </Box>

        {/* ── VII. Remarks + Navigation ───────────────────────────────── */}
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
          <Box sx={{ p: { xs: "14px", md: "20px" } }}>
            <textarea
              name="remarks"
              value={person.remarks || ""}
              onChange={(e) => handleTextChange("remarks", e.target.value)}
              onBlur={() => handleUpdate(person)}
              style={textareaStyle}
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
                  showSnackbar("Your record has been saved successfully!", "success");
                  setTimeout(() => navigate(`/applicant_educational_attainment/${keys.step3}`), 1000);
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
                  setTimeout(() => navigate(`/applicant_other_information/${keys.step5}`), 1000);
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

      {/* ── Exam Permit Error Modal ─────────────────────────────────────── */}
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
    </Box>
  );
};

export default ApplicantHealthMedicalRecordsMobile;
