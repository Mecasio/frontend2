import React, { useState, useEffect, useContext, useRef } from "react";
import { SettingsContext } from "../App";
import axios from "axios";
import {
  Button,
  Box,
  Container,
  Typography,
  Card,
  Snackbar,
  Alert,
  useMediaQuery,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import PersonIcon from "@mui/icons-material/Person";
import FamilyRestroomIcon from "@mui/icons-material/FamilyRestroom";
import SchoolIcon from "@mui/icons-material/School";
import HealthAndSafetyIcon from "@mui/icons-material/HealthAndSafety";
import InfoIcon from "@mui/icons-material/Info";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import FolderIcon from "@mui/icons-material/Folder";
import ErrorIcon from "@mui/icons-material/Error";
import LockIcon from "@mui/icons-material/Lock";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import API_BASE_URL from "../apiConfig";
import { CircularProgress } from "@mui/material"; // add to your existing MUI import line
import StudentECATApplicationForm from "./StudentECATApplicationForm";
import StudentPersonalDataForm from "./StudentPersonalDataForm";
import StudentOfficeOfTheRegistrar from "./StudentOfficeOfTheRegistrar";
import StudentServicesSurvey from "./StudentServicesSurvey";
// ─────────────────────────────────────────────────────────────────────────────
// Helper: returns true when the current user may edit the given field.
//   • Non-student roles (registrar, superadmin) → always editable
//   • Student → follow the stored permission value; default editable if missing
// ─────────────────────────────────────────────────────────────────────────────
const canStudentEdit = (permissions, fieldId, userRole) => {
  if (userRole !== "student") return true;
  if (permissions === null) return true; // still loading — optimistic
  return permissions[fieldId] !== false; // false = locked by admin
};

// Locked badge shown inline when a field is read-only for the student
const LockedBadge = () => (
  <Box
    component="span"
    sx={{
      display: "inline-flex",
      alignItems: "center",
      gap: 0.4,
      ml: 1,
      px: 0.8,
      py: 0.2,
      borderRadius: "4px",
      backgroundColor: "#fce4ec",
      color: "#c62828",
      fontSize: "11px",
      fontWeight: "bold",
      verticalAlign: "middle",
    }}
  >
    <LockIcon sx={{ fontSize: 12 }} />
    Locked by Admin
  </Box>
);

// ─── Main Component ───────────────────────────────────────────────────────────
const StudentOtherInformationResponsive = () => {
  const settings = useContext(SettingsContext);
  const colors = settings?.colors || {};
  const branding = settings?.branding || {};
  const assets = settings?.assets || {};
  const headerColor = colors.header || "#1976d2";
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const isPhone = useMediaQuery(theme.breakpoints.down("sm"));
  const isTablet = useMediaQuery(theme.breakpoints.between("sm", "md"));
  const isDesktop = useMediaQuery(theme.breakpoints.up("md"));

  // Two-column fields stack on phone, sit side-by-side from tablet up
  const gridCols2 = { display: "grid", gridTemplateColumns: isPhone ? "1fr" : "1fr 1fr", gap: 16 };


  // ── Theme state ─────────────────────────────────────────────────────────
  const [titleColor, setTitleColor] = useState("#000000");
  const [subtitleColor, setSubtitleColor] = useState("#555555");
  const [borderColor, setBorderColor] = useState("#000000");
  const [mainButtonColor, setMainButtonColor] = useState("#1976d2");
  const [subButtonColor, setSubButtonColor] = useState("#ffffff");
  const [companyName, setCompanyName] = useState("");
  const [shortTerm, setShortTerm] = useState("");

  // ── Field-level edit permissions fetched from the shared store ──────────
  const [fieldPermissions, setFieldPermissions] = useState(null);

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

  // ── Fetch field permissions ──────────────────────────────────────────────
  useEffect(() => {
    const loadPermissions = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/api/student_edit_permissions`);
        if (res.data && typeof res.data === "object") {
          setFieldPermissions(res.data);
        } else {
          setFieldPermissions({});
        }
      } catch (err) {
        console.warn("Could not load field permissions, defaulting to all editable:", err.message);
        setFieldPermissions({});
      }
    };
    loadPermissions();
  }, []);

  // ── User / person state ─────────────────────────────────────────────────
  const [explicitSelection, setExplicitSelection] = useState(false);
  const [userID, setUserID] = useState("");
  const [user, setUser] = useState("");
  const [userRole, setUserRole] = useState("");
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [person, setPerson] = useState({ termsOfAgreement: "" });
  const [errors, setErrors] = useState({});
  const [studentNumber, setStudentNumber] = useState("");

  // Convenience: returns whether a given field is editable for the current user
  const isFieldEditable = (fieldId) => canStudentEdit(fieldPermissions, fieldId, userRole);

  const queryParams = new URLSearchParams(location.search);
  const queryPersonId = queryParams.get("person_id");
  const queryStudentNumber = sessionStorage.getItem("student_number");

  useEffect(() => {
    if (!queryStudentNumber) return;
    const fetchPersonId = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/api/person_id/${queryStudentNumber}`);
        setUserID(res.data.person_id);
        setStudentNumber(queryStudentNumber);
        setPerson(res.data);
        setSelectedPerson(res.data);
      } catch (err) {
        console.error("Failed to fetch person_id:", err);
      }
    };
    fetchPersonId();
  }, [queryStudentNumber]);

  useEffect(() => {
    const storedUser = localStorage.getItem("email");
    const storedRole = localStorage.getItem("role");
    const loggedInPersonId = localStorage.getItem("person_id");
    const searchedPersonId = sessionStorage.getItem("student_edit_person_id");

    if (!storedUser || !storedRole || !loggedInPersonId) {
      window.location.href = "/login";
      return;
    }

    setUser(storedUser);
    setUserRole(storedRole);

    const allowedRoles = ["student", "registrar"];
    if (allowedRoles.includes(storedRole)) {
      const targetId = queryPersonId || searchedPersonId || loggedInPersonId;

      if (studentNumber) {
        sessionStorage.setItem("student_number", studentNumber);
      }

      setUserID(targetId);
      return;
    }

    window.location.href = "/login";
  }, [queryPersonId, studentNumber]);

  useEffect(() => {
    let consumedFlag = false;

    const tryLoad = async () => {
      if (queryPersonId) {
        await fetchByPersonId(queryPersonId);
        setExplicitSelection(true);
        consumedFlag = true;
        return;
      }

      const source = sessionStorage.getItem("student_edit_person_id_source");
      const tsStr = sessionStorage.getItem("student_edit_person_id_ts");
      const id = sessionStorage.getItem("student_edit_person_id");
      const ts = tsStr ? parseInt(tsStr, 10) : 0;
      const isFresh = source === "applicant_list" && Date.now() - ts < 5 * 60 * 1000;

      if (id && isFresh) {
        await fetchByPersonId(id);
        setExplicitSelection(true);
        consumedFlag = true;
      }
    };

    tryLoad().finally(() => {
      if (consumedFlag) {
        sessionStorage.removeItem("student_edit_person_id_source");
        sessionStorage.removeItem("student_edit_person_id_ts");
      }
    });
  }, [queryPersonId]);

  const fetchByPersonId = async (id) => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/student_data_as_applicant/${id}`);
      if (res.data) {
        setPerson(res.data);
        setSelectedPerson(res.data);
      }
    } catch (err) {
      console.error("Failed to fetch person by ID:", err);
    }
  };

  // Fetch person by ID (when navigating with ?person_id=... or sessionStorage)
  useEffect(() => {
    const fetchPersonById = async () => {
      if (!userID) return;
      try {
        const res = await axios.get(`${API_BASE_URL}/api/student_data_as_applicant/${userID}`);
        if (res.data) {
          setPerson(res.data);
          setSelectedPerson(res.data);
        } else {
          console.warn("No person found for ID:", userID);
        }
      } catch (err) {
        console.error("Failed to fetch person by ID:", err);
      }
    };
    fetchPersonById();
  }, [userID]);

  // ── Snackbar ────────────────────────────────────────────────────────────
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "warning" });

  const handleCloseSnackbar = (event, reason) => {
    if (reason === "clickaway") return;
    setSnackbar((prev) => ({ ...prev, open: false }));
  };

  const showSnackbar = (message, severity = "warning") => {
    setSnackbar({ open: true, message, severity });
  };

  // ── handleChange — respects the permission lock ───────────────────────────
  const handleChange = (e) => {
    if (!isFieldEditable(e.target.name)) return;
    const { name, type, checked, value } = e.target;
    const updatedPerson = { ...person, [name]: type === "checkbox" ? (checked ? 1 : 0) : value };
    setPerson(updatedPerson);
    handleUpdate(updatedPerson);
  };

  const handleUpdate = async (updatedData) => {
    try {
      const { person_id, created_at, current_step, ...personToSave } = updatedData;
      await axios.put(`${API_BASE_URL}/api/enrollment/person/${userID}`, personToSave);
    } catch (error) {
      console.error("Auto-save failed:", error);
    }
  };

  const handleBlur = async () => {
    try {
      const { person_id, created_at, current_step, ...personToSave } = person;
      await axios.put(`${API_BASE_URL}/api/enrollment/person/${userID}`, personToSave);
    } catch (err) {
      console.error("Auto-save failed on blur:", err);
    }
  };

  const isFormValid = () => {
    const newErrors = {};
    let isValid = true;
    if (person.termsOfAgreement !== 1) {
      newErrors.termsOfAgreement = true;
      isValid = false;
    }
    setErrors(newErrors);
    return isValid;
  };

  // ── Stepper (student routes preserved) ────────────────────────────────────
  const stepsWithPaths = [
    { label: "Personal Information", icon: <PersonIcon />, path: "/student_personal_information" },
    { label: "Family Background", icon: <FamilyRestroomIcon />, path: "/student_family_background" },
    { label: "Educational Attainment", icon: <SchoolIcon />, path: "/student_educational_attainment" },
    { label: "Health Medical Records", icon: <HealthAndSafetyIcon />, path: "/student_health_medical_records" },
    { label: "Other Information", icon: <InfoIcon />, path: "/student_other_information" },
  ];

  const [activeStep, setActiveStep] = useState(4);
  const [clickedSteps, setClickedSteps] = useState(Array(stepsWithPaths.length).fill(false));

  const handleStepClick = async (index) => {
    const valid = isFormValid();
    if (!valid) {
      showSnackbar("Please fill all required fields before proceeding.", "error");
      return;
    }
    await handleUpdate(person);
    showSnackbar("Your record has been saved successfully!", "success");
    setActiveStep(index);
    const newClickedSteps = [...clickedSteps];
    newClickedSteps[index] = true;
    setClickedSteps(newClickedSteps);
    setTimeout(() => navigate(stepsWithPaths[index].path), 1000);
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

  // ── Derived name helpers ────────────────────────────────────────────────
  const institutionName = shortTerm ? `${companyName || ""} (${shortTerm.toUpperCase()})` : companyName || "the institution";
  const shortName = shortTerm ? shortTerm.toUpperCase() : companyName || "the University";

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


  // ── Reusable responsive style tokens ────────────────────────────────────
  const consentText = {
    fontSize: "clamp(12px, 1.4vw, 14px)",
    color: "#444",
    lineHeight: 1.7,
    marginBottom: 10,
  };

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <Box
      sx={{
        minHeight: { xs: "100vh", md: "calc(100vh - 150px)" },
        overflowY: { md: "auto" },
        backgroundColor: { xs: "#f5f5f5", md: "transparent" },
        fontFamily: "'Segoe UI', sans-serif",
        pb: { xs: 10, md: 3 },
        px: { xs: 0, md: 2 },
        mt: { md: 1 },
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
        autoHideDuration={snackbar.severity === "error" ? 3500 : 2500}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: "100%" }}>
          {snackbar.message}
        </Alert>
      </Snackbar>

      {/* ── Page Header ─────────────────────────────────────────────────── */}
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
          OTHER INFORMATION
        </Typography>
      </Box>
      <Box sx={{ borderTop: "1px solid #ccc", width: "100%" }} />

      {/* ── Notice Banner ───────────────────────────────────────────────── */}
      <Box
        sx={{
          display: "flex",
          alignItems: "flex-start",
          gap: { xs: 1.5, md: 2 },
          mx: { xs: 1.5, md: 0 },
          mt: 2,
          p: { xs: "10px 12px", md: 2 },
          borderRadius: 2,
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
            borderRadius: "8px",
            width: { xs: 36, md: 60 },
            height: { xs: 36, md: 60 },
            flexShrink: 0,
          }}
        >
          <ErrorIcon sx={{ color: "white", fontSize: { xs: 22, md: 40 } }} />
        </Box>

        <Typography
          sx={{
            fontSize: { xs: 13, sm: 15, md: "20px" },
            fontFamily: "Poppins, sans-serif",
            color: "#3e3e3e",
            lineHeight: 1.5,
          }}
        >
          <strong style={{ color: "maroon" }}>Important Notice:</strong>
          <br />
          <span style={{ margin: "0 10px" }}>➔</span>
          Please indicate <strong>“NA”</strong> or <strong>“N/A”</strong> in fields where the
          requested information is not applicable or no response can be provided.
          <br />
          <span style={{ margin: "0 10px" }}>➔</span>
          To enter the letter <strong>“Ñ”</strong>, press and hold the ALT key while typing
          <strong> 165</strong>. For <strong>“ñ”</strong>, press and hold the ALT key while
          typing <strong> 164</strong>.
          <br />
          <span style={{ margin: "0 10px" }}>➔</span>
          Please complete all information from <strong>Personal Information</strong> up to
          <strong> Other Information</strong> before printing your documents.
        </Typography>
      </Box>

      {/* ── Printable Documents ─────────────────────────────────────────── */}
      <Box sx={{ px: { xs: 1.5, md: 0 }, pt: 3 }}>
        <Typography
          sx={{
            fontSize: { xs: 22, sm: 26, md: 30 },
            fontWeight: "bold",
            textAlign: "center",
            color: "black",
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

      <Container maxWidth="lg" disableGutters={isMobile}>
        {/* ── Student Form Intro ────────────────────────────────────────── */}
        <Box sx={{ px: { xs: 1.5, md: 0 }, pt: 3, textAlign: "center" }}>
          <Typography
            sx={{
              fontSize: { xs: 24, sm: 32, md: 42, lg: 50 },
              fontWeight: "bold",
              color: subtitleColor,
              mb: 1,
            }}
          >
            STUDENT FORM
          </Typography>
          <Typography sx={{ fontSize: { xs: 13, sm: 14, md: 16 }, color: "#555" }}>
            Please update your personal information to keep your student records
            accurate and up to date for the upcoming academic year at{" "}
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

        {/* ── Stepper ───────────────────────────────────────────────────── */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            width: "100%",
            px: { xs: 1, sm: 2, md: 4 },
            py: { xs: 1.5, md: 2 },
            mt: 2,
            borderBottom: { xs: "1px solid #e0e0e0", md: "none" },
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
                    width: { xs: 40, sm: 46, md: 50 },
                    height: { xs: 40, sm: 46, md: 50 },
                    borderRadius: "50%",
                    border: `1px solid ${borderColor}`,
                    backgroundColor: activeStep === index ? (headerColor || "#1976d2") : "#E8C999",
                    color: activeStep === index ? "#fff" : "#000",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transition: "all 0.2s",
                  }}
                >
                  {step.icon}
                </Box>
                <Typography
                  sx={{
                    mt: 0.75,
                    color: activeStep === index ? "#6D2323" : "#000",
                    fontWeight: activeStep === index ? "bold" : "normal",
                    fontSize: { xs: 10, sm: 12, md: 14 },
                    textAlign: "center",
                    maxWidth: { xs: 64, sm: 80, md: "none" },
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
                    alignSelf: "center",
                    mx: { xs: 1, md: 2 },
                    mb: { xs: 3, md: 0 },
                  }}
                />
              )}
            </React.Fragment>
          ))}
        </Box>

        <form>
          {/* ── Step Header Bar ─────────────────────────────────────────── */}
          <Box
            sx={{
              backgroundColor: headerColor || "#1976d2",
              border: `1px solid ${borderColor}`,
              color: "white",
              borderRadius: 2,
              boxShadow: 3,
              mx: { xs: 1.5, md: 0 },
              mt: { xs: 2, md: 0 },
              p: { xs: "10px 14px", md: "4px" },
            }}
          >
            <Typography sx={{ fontSize: { xs: 14, md: "20px" }, p: { md: "10px" }, fontFamily: "Poppins, sans-serif" }}>
              Step 5: Other Information
            </Typography>
          </Box>

          {/* ── Data Subject Consent Form ───────────────────────────────── */}
          <Box
            sx={{
              backgroundColor: { xs: "#fff", md: "#f1f1f1" },
              border: `1px solid ${borderColor}`,
              borderRadius: 2,
              boxShadow: 3,
              mx: { xs: 1.5, md: 0 },
              mt: { xs: 1.5, md: 2 },
              p: { xs: 0, md: 4 },
              overflow: "hidden",
            }}
          >
            <Box
              sx={{
                backgroundColor: { xs: headerColor || "#1976d2", md: "transparent" },
                color: { xs: "#fff", md: mainButtonColor },
                px: { xs: "14px", md: 0 },
                py: { xs: "10px", md: 0 },
              }}
            >
              <Typography
                sx={{
                  fontSize: { xs: 13, md: "20px" },
                  fontWeight: { xs: 700, md: "bold" },
                  letterSpacing: { xs: 0.3, md: 0 },
                }}
              >
                Data Subject Consent Form
              </Typography>
            </Box>

            <Box sx={{ px: { xs: "14px", md: 0 }, py: { xs: "14px", md: 0 } }}>
              <Box sx={{ borderTop: "1px solid #ccc", width: "100%", display: { xs: "none", md: "block" }, mb: 2 }} />

              <Typography sx={{ fontWeight: "bold", textAlign: "center", fontSize: { xs: 13, md: 16 } }}>
                Data Subject Consent Form
              </Typography>
              <br />

              <Typography sx={{ fontSize: { xs: 12, md: 13 }, fontFamily: "Poppins, sans-serif", mb: 1.5 }}>
                In accordance with RA 10173 or Data Privacy Act of 2012, I give my
                consent to the following terms and conditions on the collection,
                use, processing, and disclosure of my personal data:
              </Typography>

              <Box sx={{ backgroundColor: "#fafafa", border: "1px solid #e0e0e0", borderRadius: 2, p: { xs: "14px", md: 2 } }}>
                <Typography sx={consentText}>
                  <strong>1.</strong> I am aware that the {institutionName} has
                  collected and stored my personal data during my
                  admission/enrollment at {shortName}. This data includes my
                  demographic profile, contact details like home address, email
                  address, landline numbers, and mobile numbers.
                </Typography>

                <Typography sx={consentText}>
                  <strong>2.</strong> I agree to personally update these data
                  through personal request from the Office of the Registrar.
                </Typography>

                <Typography sx={consentText}>
                  <strong>3.</strong> In consonance with the above stated Act, I am
                  aware that the University will protect my school records related
                  to my being a student/graduate of {shortName}. However, I have
                  the right to authorize a representative to claim the same subject
                  to the policy of the University.
                </Typography>

                <Typography sx={consentText}>
                  <strong>4.</strong> In order to promote efficient management of
                  the organization's records, I authorize the University to manage
                  my data for data sharing with industry partners, government
                  agencies/embassies, other educational institutions, and other
                  offices for the university for employment, statistics,
                  immigration, transfer credentials, and other legal purposes that
                  may serve me best.
                </Typography>

                <Typography sx={{ ...consentText, mb: 0 }}>
                  By clicking the submit button, I warrant that I have read,
                  understood all of the above provisions, and agreed to its full
                  implementation.
                </Typography>
              </Box>

              <Box sx={{ borderTop: "1px solid #e0e0e0", width: "100%", my: 2 }} />

              <Typography sx={{ ...consentText, fontStyle: "italic", color: "#555" }}>
                I certify that the information given above are true, complete, and
                accurate to the best of my knowledge and belief. I promise to abide
                by the rules and regulations of {institutionName} regarding the ECAT
                and my possible admission. I am aware that any false or misleading
                information and/or statement may result in the refusal or
                disqualification of my admission to the institution.
              </Typography>

              {/* Agreement Checkbox — permission-controlled */}
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: { xs: 1.25, md: 1.5 },
                  backgroundColor: errors.termsOfAgreement ? "#fff5f5" : "#fff3f3",
                  border: errors.termsOfAgreement ? "1px solid #d32f2f" : "1px solid #6D2323",
                  borderRadius: 2,
                  p: { xs: "12px 14px", md: 2 },
                  mt: 2,
                }}
              >
                <input
                  type="checkbox"
                  name="termsOfAgreement"
                  checked={person.termsOfAgreement === 1}
                  disabled={!isFieldEditable("termsOfAgreement")}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  style={{
                    width: 22,
                    height: 22,
                    accentColor: "#6D2323",
                    flexShrink: 0,
                    cursor: isFieldEditable("termsOfAgreement") ? "pointer" : "not-allowed",
                  }}
                />
                <Typography sx={{ fontSize: { xs: 14, md: 15 }, fontWeight: 600, color: "#6D2323", flex: 1 }}>
                  I agree to the Terms of Agreement
                  {!isFieldEditable("termsOfAgreement") && <LockedBadge />}
                </Typography>
              </Box>

              {errors.termsOfAgreement && (
                <Typography sx={{ color: "#d32f2f", fontSize: 11, mt: 0.75, pl: 0.5 }}>
                  You must agree to the Terms of Agreement to proceed.
                </Typography>
              )}
            </Box>
          </Box>

          {/* ── Final Step / Navigation ─────────────────────────────────── */}
          <Box
            sx={{
              backgroundColor: "#fff",
              border: `1px solid ${borderColor}`,
              borderRadius: 2,
              boxShadow: { xs: "0 1px 4px rgba(0,0,0,0.08)", md: 3 },
              mx: { xs: 1.5, md: 0 },
              mt: 1.5,
              mb: 3,
              overflow: "hidden",
            }}
          >
            <Box
              sx={{
                display: { xs: "block", md: "none" },
                backgroundColor: headerColor || "#1976d2",
                color: "#fff",
                px: "14px",
                py: "10px",
                fontSize: 13,
                fontWeight: 700,
              }}
            >
              Final Step
            </Box>
            <Box sx={{ p: { xs: "14px", md: 0 } }}>
              <Typography sx={{ fontSize: { xs: 13, md: 14 }, color: "#333", lineHeight: 1.6, display: { md: "none" } }}>
                You are on the last step of the student form. Once you submit,
                your information will be saved and you will be directed to the
                online requirements page. Make sure all previous steps are
                completed before submitting.
              </Typography>
            </Box>

            <Box
              sx={{
                display: "flex",
                flexDirection: { xs: "column-reverse", sm: "row" },
                justifyContent: "space-between",
                gap: { xs: 1.5, sm: 0 },
                p: { xs: "0 14px 14px", md: 2 },
                mt: { md: 2 },
              }}
            >
              <Button
                variant="contained"
                onClick={async () => {
                  await handleUpdate(person);
                  showSnackbar("Your record has been saved successfully!", "success");
                  setTimeout(() => navigate("/student_health_medical_records"), 1000);
                }}
                startIcon={<ArrowBackIcon sx={{ color: "#000", transition: "color 0.3s" }} />}
                fullWidth={isMobile}
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
                variant="contained"
                onClick={async () => {
                  const valid = isFormValid();
                  if (!valid) {
                    showSnackbar("Please agree to the Terms of Agreement before submitting.", "error");
                    return;
                  }
                  await handleUpdate(person);
                  showSnackbar("Your record has been saved successfully!", "success");
                  setTimeout(() => navigate("/student_online_requirements"), 1200);
                }}
                endIcon={<FolderIcon sx={{ color: "#fff", transition: "color 0.3s" }} />}
                fullWidth={isMobile}
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
                Submit (Save Information)
              </Button>
            </Box>
          </Box>
        </form>
      </Container>
    </Box>
  );
};

export default StudentOtherInformationResponsive;
