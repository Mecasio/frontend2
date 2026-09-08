import React, { useState, useEffect, useContext, useRef } from "react";
import { SettingsContext } from "../App";
import axios from "axios";
import {
  Button,
  Box,
  Container,
  Typography,
  Card,
  Modal,
  Snackbar,
  Alert,
  CircularProgress,
  useMediaQuery,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import PersonIcon from "@mui/icons-material/Person";
import FamilyRestroomIcon from "@mui/icons-material/FamilyRestroom";
import SchoolIcon from "@mui/icons-material/School";
import HealthAndSafetyIcon from "@mui/icons-material/HealthAndSafety";
import InfoIcon from "@mui/icons-material/Info";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import FolderIcon from "@mui/icons-material/Folder";
import ErrorIcon from "@mui/icons-material/Error";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import ExamPermit from "./ExamPermit";
import API_BASE_URL from "../apiConfig";

// ── PDF form components (rendered off-screen, then serialized to HTML for the backend) ──
import ECATApplicationForm from "./ECATApplicationForm";
import PersonalDataForm from "./PersonalDataForm";
import OfficeOfTheRegistrar from "./OfficeOfTheRegistrar";
import AdmissionServices from "./ApplicantServicesSurvey";

/**
 * Responsive rewrite of ApplicantOtherInformationMobile.
 *
 * Instead of maintaining a separate desktop component (ApplicantOtherInformation)
 * and mobile component (ApplicantOtherInformationMobile), this single component
 * adapts fluidly across breakpoints:
 *   xs  (<600px)   -> phone
 *   sm  (600-900)  -> large phone / small tablet
 *   md  (900-1200) -> tablet / small laptop
 *   lg+ (1200px+)  -> desktop / web
 *
 * All fixed pixel values from the mobile-only version have been converted to
 * MUI `sx` breakpoint objects or CSS `clamp()` so type, spacing, and layout
 * scale smoothly instead of jumping between two hard-coded designs.
 *
 * PDF generation is now unified with the web/desktop behavior: clicking any
 * of the "Printable Documents" cards (ECAT, Personal Data Form, Registrar
 * form, Admission Services survey, Exam Permit) renders the matching hidden
 * form component, posts its HTML to the backend, and downloads the returned
 * PDF blob — instead of navigating to a separate route.
 */
const ApplicantOtherInformationMobile = (props) => {
  const settings = useContext(SettingsContext);
  const colors = settings?.colors || {};
  const branding = settings?.branding || {};
  const assets = settings?.assets || {};
  const headerColor = colors.header || "#1976d2";
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

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
  const [person, setPerson] = useState({ termsOfAgreement: "" });
  const [errors, setErrors] = useState({});

  // ── Active school year ──────────────────────────────────────────────────
  const [activeYearId, setActiveYearId] = useState(null);
  const [activeSemesterId, setActiveSemesterId] = useState(null);

  // ── Exam permit state ───────────────────────────────────────────────────
  const divToPrintRef = useRef();
  const [showPrintView, setShowPrintView] = useState(false);
  const [examPermitError, setExamPermitError] = useState("");
  const [examPermitModalOpen, setExamPermitModalOpen] = useState(false);
  const [canPrintPermit, setCanPrintPermit] = useState(false);

  // ── Snackbar ────────────────────────────────────────────────────────────
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "warning",
  });

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

  // ── Fetch active school year ────────────────────────────────────────────
  useEffect(() => {
    axios
      .get(`${API_BASE_URL}/api/active_school_year`)
      .then((res) => {
        const active = res.data?.[0];
        if (active) {
          setActiveYearId(active.year_id);
          setActiveSemesterId(active.semester_id);
        }
      })
      .catch((err) => console.error("Failed to fetch active school year", err));
  }, []);

  // ── Auth + load (do not alter) ──────────────────────────────────────────
  useEffect(() => {
    const storedUser = localStorage.getItem("email");
    const storedRole = localStorage.getItem("role");
    const storedID = localStorage.getItem("person_id");

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

  // ── handleUpdate (do not alter) ──────────────────────────────────────────
  const handleUpdate = async () => {
    const updatedPerson = {
      ...person,
      created_at: person.created_at,
    };
    try {
      await axios.put(`${API_BASE_URL}/api/person/${userID}`, updatedPerson);
      console.log("Auto-saved with created_at:", updatedPerson.created_at);
    } catch (error) {
      console.error("Auto-save failed:", error);
    }
  };

  // ── handleBlur (do not alter) ───────────────────────────────────────────
  const handleBlur = async () => {
    try {
      await axios.put(`${API_BASE_URL}/api/person/${userID}`, person);
      console.log("Auto-saved");
    } catch (err) {
      console.error("Auto-save failed", err);
    }
  };

  // ── handleChange ─────────────────────────────────────────────────────────
  const handleChange = (e) => {
    const { name, type, checked, value } = e.target;
    const updatedPerson = {
      ...person,
      [name]: type === "checkbox" ? (checked ? 1 : 0) : value,
    };
    setPerson(updatedPerson);
    handleUpdate(updatedPerson);
  };

  // ── isFormValid ──────────────────────────────────────────────────────────
  const isFormValid = () => {
    let newErrors = {};
    let isValid = true;
    if (person.termsOfAgreement !== 1) {
      newErrors.termsOfAgreement = true;
      isValid = false;
    }
    setErrors(newErrors);
    return isValid;
  };

  // ── submitFinalApplication (do not alter) ───────────────────────────────
  const submitFinalApplication = async () => {
    if (!isFormValid()) {
      showSnackbar("Please accept the Terms of Agreement.", "error");
      return;
    }

    if (!person.program) {
      showSnackbar("No program selected.", "error");
      return;
    }

    if (!activeYearId || !activeSemesterId) {
      showSnackbar("Active school year not found.", "error");
      return;
    }

    try {
      localStorage.setItem("currentStep", "6");
      showSnackbar(
        "Application submitted successfully. Please upload your documents.",
        "success"
      );
      setTimeout(() => navigate("/applicant_online_requirements"), 1500);
    } catch (error) {
      if (error.response?.status === 409) {
        showSnackbar(error.response.data.message, "error");
      } else {
        showSnackbar("Submission failed. Please try again.", "error");
      }
    }
  };

  // ── Exam permit verification ────────────────────────────────────────────
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

  // ── Keys & steps navigation ─────────────────────────────────────────────
  const keys = JSON.parse(localStorage.getItem("dashboardKeys") || "{}");

  const stepsWithPaths = [
    { label: "Personal Information", icon: <PersonIcon />, path: `/applicant_personal_information/${keys.step1}` },
    { label: "Family Background", icon: <FamilyRestroomIcon />, path: `/applicant_family_background/${keys.step2}` },
    { label: "Educational Attainment", icon: <SchoolIcon />, path: `/applicant_educational_attainment/${keys.step3}` },
    { label: "Health Medical Records", icon: <HealthAndSafetyIcon />, path: `/applicant_health_medical_records/${keys.step4}` },
    { label: "Other Information", icon: <InfoIcon />, path: `/applicant_other_information/${keys.step5}` },
  ];

  const [activeStep, setActiveStep] = useState(4);
  const [clickedSteps, setClickedSteps] = useState(Array(stepsWithPaths.length).fill(false));

  const handleStepClick = (index) => {
    if (isFormValid()) {
      setActiveStep(index);
      const newClickedSteps = [...clickedSteps];
      newClickedSteps[index] = true;
      setClickedSteps(newClickedSteps);
      showSnackbar("Your record has been saved successfully!", "success");
      setTimeout(() => navigate(stepsWithPaths[index].path), 1000);
    } else {
      showSnackbar("Please fill all required fields before proceeding.", "error");
    }
  };

  // ── Unified "which card is generating" state (same pattern as web) ─────
  const [generatingKey, setGeneratingKey] = useState(null); // e.g. "ecat" | "personalData" | ...
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

  // ── Links (now generate real PDFs instead of navigating to routes) ─────
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

  // ── Derived name helpers ────────────────────────────────────────────────
  const institutionName = shortTerm
    ? `${companyName || ""} (${shortTerm.toUpperCase()})`
    : companyName || "the institution";

  const shortName = shortTerm
    ? shortTerm.toUpperCase()
    : companyName || "the University";

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
      {/* Hidden print target for the exam permit PDF */}
      {showPrintView && (
        <div ref={divToPrintRef} style={{ position: "absolute", left: "-9999px", top: 0 }}>
          <ExamPermit />
        </div>
      )}

      {/* Hidden target for the other printable-document PDFs */}
      {generatingKey && FORM_CONFIGS[generatingKey] && (
        <div ref={hiddenFormRef} style={{ position: "absolute", left: "-9999px", top: 0 }}>
          {React.createElement(FORM_CONFIGS[generatingKey].Component)}
        </div>
      )}

      {/* Toast */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={2500}
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
      <Box sx={{ borderTop: "1px solid #ccc", width: "100%", mx: { xs: 0 } }} />

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
        <Box
          sx={{
            display: "flex",
            flexWrap: "wrap",
            gap: { xs: 1, md: 2 },
            justifyContent: "center",
          }}
        >
          {links.map((lnk, i) => {
            const isGenerating = generatingKey === lnk.key;
            const disabled = generatingKey !== null;

            return (
              <Box
                key={i}
                component={motion.div}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07, duration: 0.3 }}
                sx={{
                  // 2-up on phones, 3-up on tablets, ~30% (roughly 3-up) on desktop
                  width: {
                    xs: "calc(50% - 4px)",
                    sm: "calc(33.333% - 8px)",
                    md: "calc(30% - 16px)",
                  },
                }}
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
                    minHeight: { xs: 52, md: 60 },
                    width: "100%",
                    borderRadius: { xs: "12px", md: 2 },
                    border: `1px solid ${borderColor || "#6D2323"}`,
                    backgroundColor: "#fff",
                    transition: "all 0.25s ease-in-out",
                    opacity: disabled && !isGenerating ? 0.5 : 1,
                    pointerEvents: disabled ? "none" : "auto",
                    cursor: disabled ? "default" : "pointer",
                    "&:hover": !disabled && {
                      backgroundColor: headerColor || "#6D2323",
                      transform: { md: "scale(1.05)" },
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
                    <CircularProgress
                      size={isMobile ? 18 : 26}
                      sx={{ color: mainButtonColor || "#6D2323", mr: { md: 1.5 } }}
                    />
                  ) : (
                    <PictureAsPdfIcon
                      className="chip-icon"
                      sx={{
                        fontSize: { xs: 18, md: 35 },
                        color: mainButtonColor || "#6D2323",
                        flexShrink: 0,
                        mr: { md: 1.5 },
                      }}
                    />
                  )}
                  <Typography
                    className="chip-text"
                    sx={{
                      fontSize: { xs: 11, sm: 12, md: "0.85rem" },
                      fontWeight: "bold",
                      color: mainButtonColor || "#6D2323",
                      fontFamily: "Poppins, sans-serif",
                      lineHeight: 1.3,
                      textAlign: "center",
                    }}
                  >
                    {isGenerating ? "Generating PDF..." : lnk.label}
                  </Typography>
                </Card>
              </Box>
            );
          })}
        </Box>
      </Box>

      <Container maxWidth="lg" disableGutters={isMobile}>
        {/* ── Applicant Form Intro ──────────────────────────────────────── */}
        <Box sx={{ px: { xs: 1.5, md: 0 }, pt: 3, textAlign: "center" }}>
          <Typography
            sx={{
              fontSize: { xs: 24, sm: 32, md: 42, lg: 50 },
              fontWeight: "bold",
              color: subtitleColor,
              mb: 1,
            }}
          >
            APPLICANT FORM
          </Typography>
          <Typography sx={{ fontSize: { xs: 13, sm: 14, md: 16 }, color: "#555" }}>
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
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  cursor: "pointer",
                }}
                onClick={() => handleStepClick(index)}
              >
                <Box
                  sx={{
                    width: { xs: 40, sm: 46, md: 50 },
                    height: { xs: 40, sm: 46, md: 50 },
                    borderRadius: "50%",
                    border: `1px solid ${borderColor}`,
                    backgroundColor:
                      activeStep === index
                        ? headerColor || "#1976d2"
                        : "#E8C999",
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
            <Typography
              sx={{
                fontSize: { xs: 14, md: "20px" },
                p: { md: "10px" },
                fontFamily: "Poppins, sans-serif",
              }}
            >
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

              <Box
                sx={{
                  backgroundColor: "#fafafa",
                  border: "1px solid #e0e0e0",
                  borderRadius: 2,
                  p: { xs: "14px", md: 2 },
                }}
              >
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

              {/* Agreement Checkbox */}
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
                  onChange={handleChange}
                  onBlur={handleBlur}
                  style={{
                    width: 22,
                    height: 22,
                    accentColor: "#6D2323",
                    flexShrink: 0,
                    cursor: "pointer",
                  }}
                />
                <Typography sx={{ fontSize: { xs: 14, md: 15 }, fontWeight: 600, color: "#6D2323", flex: 1 }}>
                  I agree to the Terms of Agreement
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
                You are on the last step of the application form. Once you submit,
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
                onClick={() => {
                  handleUpdate(person);
                  showSnackbar("Your record has been saved successfully!", "success");
                  setTimeout(() => navigate(`/applicant_health_medical_records/${keys.step4}`), 1000);
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
                onClick={submitFinalApplication}
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

export default ApplicantOtherInformationMobile;
