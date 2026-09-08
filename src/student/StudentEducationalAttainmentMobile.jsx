import React, { useState, useEffect, useContext, useRef } from "react";
import axios from "axios";
import { useNavigate, useLocation } from "react-router-dom";
import { SettingsContext } from "../App";
import API_BASE_URL from "../apiConfig";
import {
  Button,
  Box,
  Typography,
  Card,
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
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import { motion } from "framer-motion";
import useStudentEditPermissions from "../account_management/useStudentEditPermissions";
import { CircularProgress } from "@mui/material"; // add to your existing MUI import line
import StudentECATApplicationForm from "./StudentECATApplicationForm";
import StudentPersonalDataForm from "./StudentPersonalDataForm";
import StudentOfficeOfTheRegistrar from "./StudentOfficeOfTheRegistrar";
import StudentServicesSurvey from "./StudentServicesSurvey";
// ─── Locked badge (matches Personal Information screen) ──────────────────────
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

// ─── Reusable field wrapper (responsive, same visual language as the ───────
// ─── Applicant Educational Attainment screen) ────────────────────────────────
const Field = ({ label, required, error, helperText, locked, children }) => (
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
        {locked && <LockedBadge />}
      </label>
    )}
    {children}
    {error && helperText && (
      <div style={{ color: "#d32f2f", fontSize: 11, marginTop: 3 }}>{helperText}</div>
    )}
  </div>
);

const baseControlStyle = (hasError, locked = false) => ({
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
  cursor: locked ? "not-allowed" : undefined,
});

const MInput = ({ error, locked, style, ...props }) => (
  <input style={{ ...baseControlStyle(error, locked), ...style }} readOnly={locked} {...props} />
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
      ...style,
    }}
    disabled={locked}
    {...props}
  >
    {children}
  </select>
);

// ─── Reusable school record block (JHS suffix="" / SHS suffix="1") ───────────
// isStacked: responsive layout (phone stacks fields, tablet/desktop use a grid)
// canEdit: permission-aware locking, preserved from the student component
const SchoolBlock = ({ suffix = "", person, errors, handleChange, isStacked, canEdit }) => {
  const f = (n) => `${n}${suffix}`;

  return (
    <>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: isStacked ? "1fr" : "repeat(2, 1fr)",
          gap: 2,
          mb: 0,
        }}
      >
        <Field
          label="Educational Attainment"
          required
          error={errors[f("schoolLevel")]}
          helperText="This field is required."
          locked={!canEdit(f("schoolLevel"))}
        >
          <MSelect
            name={f("schoolLevel")}
            value={person[f("schoolLevel")] || ""}
            onChange={handleChange}
            error={errors[f("schoolLevel")]}
            locked={!canEdit(f("schoolLevel"))}
          >
            <option value="">Select Level</option>
            {suffix === "" ? (
              <>
                <option value="High School/Junior High School">High School / Junior High School</option>
                <option value="ALS">ALS</option>
              </>
            ) : (
              <>
                <option value="Senior High School">Senior High School</option>
                <option value="Undergraduate">Undergraduate</option>
                <option value="Graduate">Graduate</option>
                <option value="ALS">ALS</option>
                <option value="Vocational/Trade Course">Vocational / Trade Course</option>
              </>
            )}
          </MSelect>
        </Field>

        <Field
          label="School Last Attended"
          required
          error={errors[f("schoolLastAttended")]}
          helperText="This field is required."
          locked={!canEdit(f("schoolLastAttended"))}
        >
          <MInput
            name={f("schoolLastAttended")}
            value={person[f("schoolLastAttended")] || ""}
            onChange={handleChange}
            error={errors[f("schoolLastAttended")]}
            locked={!canEdit(f("schoolLastAttended"))}
            placeholder="Enter your School Name"
          />
        </Field>

        <Field
          label="School Full Address (Street / Brgy / City)"
          required
          error={errors[f("schoolAddress")]}
          helperText="This field is required."
          locked={!canEdit(f("schoolAddress"))}
        >
          <MInput
            name={f("schoolAddress")}
            value={person[f("schoolAddress")] || ""}
            onChange={handleChange}
            error={errors[f("schoolAddress")]}
            locked={!canEdit(f("schoolAddress"))}
            placeholder="Street / Brgy / City"
          />
        </Field>

        <Field label="Course Program" locked={!canEdit(f("courseProgram"))}>
          <MInput
            name={f("courseProgram")}
            value={person[f("courseProgram")] || ""}
            onChange={handleChange}
            locked={!canEdit(f("courseProgram"))}
            placeholder="Course or Track"
          />
        </Field>
      </Box>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: isStacked ? "1fr" : "2fr 1fr 1fr",
          gap: 2,
        }}
      >
        <Field
          label="Recognition / Awards"
          required
          error={errors[f("honor")]}
          helperText="This field is required."
          locked={!canEdit(f("honor"))}
        >
          <MInput
            name={f("honor")}
            value={person[f("honor")] || ""}
            onChange={handleChange}
            error={errors[f("honor")]}
            locked={!canEdit(f("honor"))}
            placeholder='e.g. With Honors or "NA"'
          />
        </Field>

        <Field
          label="General Average"
          required
          error={errors[f("generalAverage")]}
          helperText="This field is required."
          locked={!canEdit(f("generalAverage"))}
        >
          <MInput
            type="number"
            step="0.01"
            min={0}
            max={100}
            name={f("generalAverage")}
            value={person[f("generalAverage")] || ""}
            onChange={handleChange}
            error={errors[f("generalAverage")]}
            locked={!canEdit(f("generalAverage"))}
            placeholder="e.g. 95.00"
          />
        </Field>

        <Field
          label="Year Graduated"
          required
          error={errors[f("yearGraduated")]}
          helperText="This field is required."
          locked={!canEdit(f("yearGraduated"))}
        >
          <MInput
            type="number"
            min={1900}
            max={new Date().getFullYear()}
            step={1}
            name={f("yearGraduated")}
            value={person[f("yearGraduated")] || ""}
            onChange={handleChange}
            error={errors[f("yearGraduated")]}
            locked={!canEdit(f("yearGraduated"))}
            placeholder="YYYY"
          />
        </Field>
      </Box>
    </>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const StudentEducationalAttainmentResponsive = () => {
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

  // ── Permissions (student-specific) ────────────────────────────────────────
  const { canEdit: canEditField, permissionsLoaded } = useStudentEditPermissions();
  const [userRole, setUserRole] = useState("");
  const canEdit = (fieldId) => canEditField(fieldId, userRole);

  // ── Theme state ─────────────────────────────────────────────────────────
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

  // ── User / person state (student shape preserved) ────────────────────────
  const [userID, setUserID] = useState("");
  const [person, setPerson] = useState({
    applyingAs: "",
    schoolLevel: "",
    schoolLastAttended: "",
    schoolAddress: "",
    courseProgram: "",
    honor: "",
    generalAverage: "",
    yearGraduated: "",
    schoolLevel1: "",
    schoolLastAttended1: "",
    schoolAddress1: "",
    courseProgram1: "",
    honor1: "",
    generalAverage1: "",
    yearGraduated1: "",
    strand: "",
  });

  const [errors, setErrors] = useState({});
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "warning" });

  const handleCloseSnackbar = (event, reason) => {
    if (reason === "clickaway") return;
    setSnackbar((prev) => ({ ...prev, open: false }));
  };

  const showSnackbar = (message, severity = "warning") => {
    setSnackbar({ open: true, message, severity });
    setTimeout(() => setSnackbar((p) => ({ ...p, open: false })), 3000);
  };

  // ── Auth + Person load (student-specific endpoints) ───────────────────────
  useEffect(() => {
    const storedRole = localStorage.getItem("role");
    const loggedInPersonId = localStorage.getItem("person_id");
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
      .catch((err) => console.error("Error fetching student data:", err));
  }, [userID]);

  // ── handleUpdate (student endpoint, strips non-editable meta) ─────────────
  const handleUpdate = async (updated) => {
    try {
      const { person_id, created_at, current_step, ...clean } = updated;
      await axios.put(`${API_BASE_URL}/api/enrollment/person/${userID}`, clean);
    } catch (err) {
      console.error("Auto-save failed:", err);
    }
  };

  // ── handleChange — guards against locked fields ──────────────────────────
  const handleChange = (e) => {
    const { name, type, checked, value } = e.target;
    if (!canEdit(name)) return;
    const updated = { ...person, [name]: type === "checkbox" ? (checked ? 1 : 0) : value };
    setPerson(updated);
    handleUpdate(updated);
  };

  // ── requiresSeniorHigh (student logic preserved) ──────────────────────────
  const requiresSeniorHigh = [1, 2, 3, 4].includes(Number(person.applyingAs));

  // ── isFormValid ────────────────────────────────────────────────────────────
  const isFormValid = () => {
    const required = ["schoolLevel", "schoolLastAttended", "schoolAddress", "honor", "generalAverage", "yearGraduated"];
    if (requiresSeniorHigh) {
      required.push("schoolLevel1", "schoolLastAttended1", "schoolAddress1", "honor1", "generalAverage1", "yearGraduated1", "strand");
    }
    const newErrors = {};
    required.forEach((f) => {
      if (!person[f]?.toString().trim()) newErrors[f] = true;
    });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ── Stepper (student routes preserved) ────────────────────────────────────
  const stepsWithPaths = [
    { label: "Personal Information", icon: <PersonIcon />, path: "/student_personal_information" },
    { label: "Family Background", icon: <FamilyRestroomIcon />, path: "/student_family_background" },
    { label: "Educational Attainment", icon: <SchoolIcon />, path: "/student_educational_attainment" },
    { label: "Health Medical Records", icon: <HealthAndSafetyIcon />, path: "/student_health_medical_records" },
    { label: "Other Information", icon: <InfoIcon />, path: "/student_other_information" },
  ];
  const [activeStep, setActiveStep] = useState(2);

  const handleStepClick = (index) => {
    if (isFormValid()) {
      setActiveStep(index);
      showSnackbar("Your record has been saved successfully!", "success");
      setTimeout(() => navigate(stepsWithPaths[index].path), 1000);
    } else {
      showSnackbar("Please fill all required fields before proceeding.", "error");
    }
  };

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
  const contentMaxWidth = isDesktop ? 1000 : "100%";

  if (!permissionsLoaded) return null;

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
            EDUCATIONAL ATTAINMENT
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
          <Typography sx={{ fontSize: { xs: "22px", md: "28px" }, fontWeight: "bold", textAlign: "center", color: "black", mt: "20px", mb: 2 }}>
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

        {/* ── Student Form Intro ──────────────────────────────────────── */}
        <Box sx={{ px: { xs: "14px", md: 0 }, pt: 2, textAlign: "center" }}>
          <Typography
            component="h1"
            sx={{ fontSize: { xs: "24px", sm: "32px", md: "42px" }, fontWeight: "bold", textAlign: "center", color: subtitleColor, mt: "20px" }}
          >
            STUDENT FORM
          </Typography>
          <Typography sx={{ fontSize: { xs: 13, md: 15 }, color: "#555" }}>
            Please update your personal information to keep your student records accurate and up to date for the upcoming academic year at{" "}
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
        <Box sx={{ display: "flex", justifyContent: "center", width: "100%", px: { xs: 2, md: 4 }, py: 1.5, borderBottom: "1px solid #e0e0e0", overflowX: "auto" }}>
          {stepsWithPaths.map((step, index) => (
            <React.Fragment key={index}>
              <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", cursor: "pointer" }} onClick={() => handleStepClick(index)}>
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

        {/* ── Step Header Bar ─────────────────────────────────────────── */}
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
            Step 3: Educational Attainment
          </Typography>
        </Box>

        {/* ── Junior High School ──────────────────────────────────────── */}
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
            Junior High School Background
          </Box>
          <Box sx={{ p: { xs: "14px", md: "20px" } }}>
            <SchoolBlock
              suffix=""
              person={person}
              errors={errors}
              handleChange={handleChange}
              isStacked={isPhone}
              canEdit={canEdit}
            />
          </Box>
        </Box>

        {/* ── Senior High School ──────────────────────────────────────── */}
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
            Senior High School Background
          </Box>
          <Box sx={{ p: { xs: "14px", md: "20px" } }}>
            {!requiresSeniorHigh && (
              <Box
                sx={{
                  backgroundColor: "#E8F5E9",
                  border: "1px solid #A5D6A7",
                  borderRadius: 2,
                  p: "10px 12px",
                  fontSize: 12,
                  color: "#2E7D32",
                  mb: 1.5,
                }}
              >
                Senior High fields are optional based on your selected "Applying As" category. Fill in if applicable.
              </Box>
            )}
            <SchoolBlock
              suffix="1"
              person={person}
              errors={errors}
              handleChange={handleChange}
              isStacked={isPhone}
              canEdit={canEdit}
            />
          </Box>
        </Box>

        {/* ── Strand + Navigation ─────────────────────────────────────── */}
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
            Senior High School Strand
          </Box>

          <Box sx={{ p: { xs: "14px", md: "20px" } }}>
            <Typography
              sx={{
                fontSize: 12,
                fontWeight: 700,
                color: "#6D2323",
                textTransform: "uppercase",
                letterSpacing: 0.5,
                mb: 1.25,
              }}
            >
              Strand (For Senior High School)
            </Typography>
            <Box sx={{ maxWidth: { md: 480 } }}>
              <Field
                label="SHS Strand"
                required={requiresSeniorHigh}
                error={errors.strand}
                helperText="This field is required."
                locked={!canEdit("strand")}
              >
                <MSelect
                  name="strand"
                  value={person.strand || ""}
                  onChange={handleChange}
                  error={errors.strand}
                  locked={!canEdit("strand")}
                >
                  <option value="">Select Strand</option>
                  <option value="Accountancy, Business and Management (ABM)">Accountancy, Business and Management (ABM)</option>
                  <option value="Humanities and Social Sciences (HUMSS)">Humanities and Social Sciences (HUMSS)</option>
                  <option value="Science, Technology, Engineering, and Mathematics (STEM)">Science, Technology, Engineering, and Mathematics (STEM)</option>
                  <option value="General Academic (GAS)">General Academic (GAS)</option>
                  <option value="Home Economics (HE)">Home Economics (HE)</option>
                  <option value="Information and Communications Technology (ICT)">Information and Communications Technology (ICT)</option>
                  <option value="Agri-Fishery Arts (AFA)">Agri-Fishery Arts (AFA)</option>
                  <option value="Industrial Arts (IA)">Industrial Arts (IA)</option>
                  <option value="Sports Track">Sports Track</option>
                  <option value="Design and Arts Track">Design and Arts Track</option>
                </MSelect>
              </Field>
            </Box>
          </Box>

          <Box
            sx={{
              display: "flex",
              flexDirection: { xs: "column-reverse", sm: "row" },
              justifyContent: "space-between",
              gap: 1.5,
              mx: { xs: "12px", md: "20px" },
              mb: 3,
              mt: 2,
            }}
          >
            <Button
              fullWidth={isPhone}
              variant="contained"
              onClick={() => {
                handleUpdate(person);
                showSnackbar("Your record has been saved successfully!", "success");
                setTimeout(() => navigate("/student_family_background"), 1000);
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
                if (isFormValid()) {
                  showSnackbar("Your record has been saved successfully!", "success");
                  setTimeout(() => navigate("/student_health_medical_records"), 1000);
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
  );
};

export default StudentEducationalAttainmentResponsive;
