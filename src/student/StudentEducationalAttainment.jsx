import React, { useState, useEffect, useContext, useRef } from "react";
import { SettingsContext } from "../App";
import axios from "axios";
import {
  Button, Box, TextField, Container, Card, Typography,
  FormControl, FormHelperText, InputLabel, Select, MenuItem, CircularProgress,
} from "@mui/material";
import { Link } from "react-router-dom";
import PersonIcon from "@mui/icons-material/Person";
import FamilyRestroomIcon from "@mui/icons-material/FamilyRestroom";
import SchoolIcon from "@mui/icons-material/School";
import HealthAndSafetyIcon from "@mui/icons-material/HealthAndSafety";
import InfoIcon from "@mui/icons-material/Info";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import ErrorIcon from "@mui/icons-material/Error";
import LockIcon from "@mui/icons-material/Lock";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import API_BASE_URL from "../apiConfig";
import { Snackbar, Alert } from "@mui/material";
import useStudentEditPermissions from "../account_management/useStudentEditPermissions";
import StudentECATApplicationForm from "./StudentECATApplicationForm";
import StudentPersonalDataForm from "./StudentPersonalDataForm";
import StudentOfficeOfTheRegistrar from "./StudentOfficeOfTheRegistrar";
import StudentServicesSurvey from "./StudentServicesSurvey";

const StudentDashboard3 = () => {
  const settings = useContext(SettingsContext);
  const colors = settings?.colors || {};
  const branding = settings?.branding || {};
  const assets = settings?.assets || {};
  const headerColor = colors.header || "#1976d2";

  // ── HOOK MUST BE AT THE VERY TOP — before any other logic ────────────────
  const { canEdit: canEditField, permissionsLoaded } = useStudentEditPermissions();

  const [titleColor, setTitleColor] = useState("#000000");
  const [subtitleColor, setSubtitleColor] = useState("#555555");
  const [borderColor, setBorderColor] = useState("#000000");
  const [mainButtonColor, setMainButtonColor] = useState("#1976d2");
  const [subButtonColor, setSubButtonColor] = useState("#ffffff");
  const [stepperColor, setStepperColor] = useState("#000000");
  const [fetchedLogo, setFetchedLogo] = useState(null);
  const [companyName, setCompanyName] = useState("");
  const [shortTerm, setShortTerm] = useState("");
  const [campusAddress, setCampusAddress] = useState("");

  const [explicitSelection, setExplicitSelection] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [userID, setUserID] = useState("");
  const [user, setUser] = useState("");
  const [userRole, setUserRole] = useState("");
  const [errors, setErrors] = useState({});
  const [activeStep, setActiveStep] = useState(2);
  const [clickedSteps, setClickedSteps] = useState(Array(5).fill(false));
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "warning" });
  const [studentNumber, setStudentNumber] = useState("");

  const [person, setPerson] = useState({
    schoolLevel: "", schoolLastAttended: "", schoolAddress: "", courseProgram: "",
    honor: "", generalAverage: "", yearGraduated: "",
    schoolLevel1: "", schoolLastAttended1: "", schoolAddress1: "", courseProgram1: "",
    honor1: "", generalAverage1: "", yearGraduated1: "", strand: "",
  });

  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const queryPersonId = queryParams.get("person_id");
  const queryStudentNumber = sessionStorage.getItem("student_number");

  // ── canEdit wrapper — reads userRole from state ───────────────────────────
  // Defined as a regular function (not arrow at top level) so it always reads
  // the latest userRole from closure at call time.
  const canEdit = (fieldId) => canEditField(fieldId, userRole);

  // ── Locked badge component ─────────────────────────────────────────────────
  const LockedBadge = () => (
    <Box
      component="span"
      sx={{
        display: "inline-flex", alignItems: "center", gap: 0.4,
        ml: 1, px: 0.8, py: 0.2, borderRadius: "4px",
        backgroundColor: "#fce4ec", color: "#c62828",
        fontSize: "11px", fontWeight: "bold", verticalAlign: "middle",
      }}
    >
      <LockIcon sx={{ fontSize: 12 }} />
      Locked by Admin
    </Box>
  );

  // ── Locked field MUI styling ──────────────────────────────────────────────
  const lockedSx = {
    backgroundColor: "#f5f5f5",
    "& .MuiInputBase-input": { color: "#999", cursor: "not-allowed" },
  };

  // ── Effects ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!settings) return;
    if (colors.title) setTitleColor(colors.title);
    if (colors.subtitle) setSubtitleColor(colors.subtitle);
    if (colors.border) setBorderColor(colors.border);
    if (colors.mainButton) setMainButtonColor(colors.mainButton);
    if (colors.subButton) setSubButtonColor(colors.subButton);
    if (colors.stepper) setStepperColor(colors.stepper);
    if (assets.logoUrl) setFetchedLogo(`${assets.logoUrl}`);
    if (branding.companyName) setCompanyName(branding.companyName);
    if (branding.shortTerm) setShortTerm(branding.shortTerm);
    if (branding.campusAddress) setCampusAddress(branding.campusAddress);
  }, [settings]);

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
        console.error("❌ Failed to fetch person_id:", err);
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
      if (studentNumber) sessionStorage.setItem("student_number", studentNumber);
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

  useEffect(() => {
    const fetchPersonById = async () => {
      if (!userID) return;
      try {
        const res = await axios.get(`${API_BASE_URL}/api/student_data_as_applicant/${userID}`);
        if (res.data) { setPerson(res.data); setSelectedPerson(res.data); }
      } catch (err) {
        console.error("❌ Failed to fetch person by ID:", err);
      }
    };
    fetchPersonById();
  }, [userID]);

  const applyingAsRaw = localStorage.getItem("applyingAs");
  const requiresSeniorHigh =
    ["1", "2", "3", "4"].includes(String(applyingAsRaw)) ||
    person.classifiedAs === "Freshman (First Year)";

  useEffect(() => {
    if (requiresSeniorHigh && !person.schoolLevel1) {
      setPerson((prev) => ({ ...prev, schoolLevel1: "Senior High School" }));
    }
  }, [requiresSeniorHigh]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleUpdate = async (updatedData) => {
    try {
      const { person_id, created_at, current_step, ...personToSave } = updatedData;
      await axios.put(`${API_BASE_URL}/api/enrollment/person/${userID}`, personToSave);
      console.log("✅ Auto-saved to ENROLLMENT DB");
    } catch (error) {
      console.error("❌ Auto-save failed:", error);
    }
  };

  const handleBlur = async () => {
    try {
      const { person_id, created_at, current_step, ...personToSave } = person;
      await axios.put(`${API_BASE_URL}/api/enrollment/person/${userID}`, personToSave);
    } catch (err) {
      console.error("❌ Auto-save failed on blur:", err);
    }
  };

  const handleCloseSnackbar = (event, reason) => {
    if (reason === "clickaway") return;
    setSnackbar((prev) => ({ ...prev, open: false }));
  };

  const handleChange = (e) => {
    const { name, type, checked, value } = e.target;
    if (!canEdit(name)) return;
    const updatedPerson = { ...person, [name]: type === "checkbox" ? (checked ? 1 : 0) : value };
    setPerson(updatedPerson);
    handleUpdate(updatedPerson);
  };

  const isFormValid = () => {
    let requiredFields = ["schoolLevel", "schoolLastAttended", "schoolAddress", "honor", "generalAverage", "yearGraduated"];
    if (requiresSeniorHigh) {
      requiredFields.push("schoolLevel1", "schoolLastAttended1", "schoolAddress1", "honor1", "generalAverage1", "yearGraduated1", "strand");
    }
    let newErrors = {};
    let isValid = true;
    requiredFields.forEach((field) => {
      if (!person[field]?.toString().trim()) { newErrors[field] = true; isValid = false; }
    });
    setErrors(newErrors);
    return isValid;
  };

  const fetchByPersonId = async (personID) => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/student_data_as_applicant/${personID}`);
      if (res.data) { setPerson(res.data); setSelectedPerson(res.data); }
    } catch (err) {
      console.error("❌ Failed to fetch person by ID:", err);
    }
  };

  const steps = [
    { label: "Personal Information", icon: <PersonIcon />, path: `/student_personal_information` },
    { label: "Family Background", icon: <FamilyRestroomIcon />, path: `/student_family_background` },
    { label: "Educational Attainment", icon: <SchoolIcon />, path: `/student_educational_attainment` },
    { label: "Health Medical Records", icon: <HealthAndSafetyIcon />, path: `/student_health_medical_records` },
    { label: "Other Information", icon: <InfoIcon />, path: `/student_other_information` },

  ];

  const handleStepClick = async (index) => {
    const valid = isFormValid();
    if (!valid) {
      setSnackbar({
        open: true,
        message: "Please fill all required fields before proceeding.",
        severity: "error",
      });
      return; // hard stop — no navigation
    }
    await handleUpdate(person);
    setSnackbar({
      open: true,
      message: "Your record has been saved successfully!",
      severity: "success",
    });
    setActiveStep(index);
    const newClickedSteps = [...clickedSteps];
    newClickedSteps[index] = true;
    setClickedSteps(newClickedSteps);
    setTimeout(() => { navigate(steps[index].path); }, 1000);
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
    { key: "registrar", label: `Application For ${shortTerm ? shortTerm.toUpperCase() : ""} College Admission`, onClick: () => generateFormPdf("registrar") },
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

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <Box sx={{ height: "calc(100vh - 150px)", overflowY: "auto", paddingRight: 1, backgroundColor: "transparent", mt: 1, padding: 2 }}>



      {generatingKey && FORM_CONFIGS[generatingKey] && (
        <div ref={hiddenFormRef} style={{ position: "absolute", left: "-9999px", top: 0 }}>
          {React.createElement(FORM_CONFIGS[generatingKey].Component)}
        </div>
      )}


      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", mb: 2 }}>
        <Typography variant="h4" sx={{ fontWeight: "bold", color: titleColor, fontSize: "36px" }}>
          EDUCATIONAL ATTAINMENT
        </Typography>
      </Box>
      <hr style={{ border: "1px solid #ccc", width: "100%" }} />
      <br /><br />

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
              lineHeight: 1.3,
              whiteSpace: "normal",
              overflow: "hidden",
            }}
          >
            <strong style={{ color: "maroon" }}>Important Notice:</strong>
            <br />



            <span style={{ fontSize: "1.2em", margin: "0 15px" }}>➔</span>
            Please indicate <strong>“NA”</strong> or <strong>“N/A”</strong> in fields where the
            requested information is not applicable or no response can be provided.
            <br />

            <span style={{ fontSize: "1.2em", margin: "0 15px" }}>➔</span>
            To enter the letter <strong>“Ñ”</strong>, press and hold the ALT key while typing
            <strong> 165</strong>. For <strong>“ñ”</strong>, press and hold the ALT key while
            typing <strong> 164</strong>.
            <br />

            <span style={{ fontSize: "1.2em", margin: "0 15px" }}>➔</span>
            Please complete all information from <strong>Personal Information</strong> up to
            <strong> Other Information</strong> before printing your documents.
            <br />
          </Typography>
        </Box>
      </Box>


      <h1 style={{ fontSize: "30px", fontWeight: "bold", textAlign: "center", color: "black", marginTop: "25px" }}>
        PRINTABLE DOCUMENTS
      </h1>

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

        {/* Stepper */}
        <Box sx={{ display: "flex", justifyContent: "center", width: "100%", px: 4 }}>
          {steps.map((step, index) => (
            <React.Fragment key={index}>
              <Box
                sx={{ display: "flex", flexDirection: "column", alignItems: "center", cursor: "pointer" }}
                onClick={() => handleStepClick(index)}
              >
                <Box
                  sx={{
                    width: 50, height: 50, borderRadius: "50%",
                    border: `1px solid ${borderColor}`,
                    backgroundColor: activeStep === index ? headerColor || "#1976d2" : "#E8C999",
                    color: activeStep === index ? "#fff" : "#000",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}
                >
                  {step.icon}
                </Box>
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
              {index < steps.length - 1 && (
                <Box sx={{ height: "2px", backgroundColor: mainButtonColor, flex: 1, alignSelf: "center", mx: 2 }} />
              )}
            </React.Fragment>
          ))}
        </Box>
        <br />

        <form>
          <Container maxWidth="100%" sx={{ backgroundColor: headerColor || "#1976d2", border: `1px solid ${borderColor}`, color: "white", borderRadius: 2, boxShadow: 3, padding: "4px" }}>
            <Box sx={{ width: "100%" }}>
              <Typography style={{ fontSize: "20px", padding: "10px", fontFamily: "Poppins, sans-serif" }}>Step 3: Educational Attainment</Typography>
            </Box>
          </Container>

          <Container maxWidth="100%" sx={{ backgroundColor: "#f1f1f1", border: `1px solid ${borderColor}`, padding: 4, borderRadius: 2, boxShadow: 3 }}>

            {/* ── JUNIOR HIGH SCHOOL ── */}
            <Typography style={{ fontSize: "20px", color: mainButtonColor, fontWeight: "bold" }}>Junior High School - Background:</Typography>
            <hr style={{ border: "1px solid #ccc", width: "100%" }} /><br />

            <Box sx={{ display: "flex", flexWrap: "nowrap", gap: 2, mb: 2 }}>

              {/* Educational Attainment JHS */}
              <Box sx={{ flex: "1" }}>
                <Typography variant="subtitle1" mb={1} sx={{ minHeight: "32px", display: "flex", alignItems: "center" }}>
                  Educational Attainment <span style={{ color: "red" }}>*</span>
                  {!canEdit("schoolLevel") && <LockedBadge />}
                </Typography>
                <FormControl fullWidth size="small" required error={!!errors.schoolLevel} disabled={!canEdit("schoolLevel")} sx={!canEdit("schoolLevel") ? lockedSx : {}}>
                  <InputLabel id="schoolLevel-label">Educational Attainment</InputLabel>
                  <Select labelId="schoolLevel-label" name="schoolLevel" value={person.schoolLevel ?? ""} label="Educational Attainment" onChange={handleChange} onBlur={() => handleUpdate(person)} inputProps={{ readOnly: !canEdit("schoolLevel") }}>
                    <MenuItem value=""><em>Select School Level</em></MenuItem>
                    <MenuItem value="High School/Junior High School">High School/Junior High School</MenuItem>
                    <MenuItem value="ALS">ALS</MenuItem>
                  </Select>
                  {errors.schoolLevel && <FormHelperText>This field is required.</FormHelperText>}
                </FormControl>
              </Box>

              {/* School Last Attended JHS */}
              <Box sx={{ flex: "1" }}>
                <Typography variant="subtitle1" mb={1} sx={{ minHeight: "32px", display: "flex", alignItems: "center" }}>
                  School Last Attended <span style={{ color: "red" }}>*</span>
                  {!canEdit("schoolLastAttended") && <LockedBadge />}
                </Typography>
                <TextField fullWidth size="small" required name="schoolLastAttended" placeholder="Enter School Last Attended" value={person.schoolLastAttended || ""} onChange={handleChange} onBlur={() => handleUpdate(person)} disabled={!canEdit("schoolLastAttended")} InputProps={{ readOnly: !canEdit("schoolLastAttended") }} sx={!canEdit("schoolLastAttended") ? lockedSx : {}} error={errors.schoolLastAttended} helperText={errors.schoolLastAttended ? "This field is required." : ""} />
              </Box>

              {/* School Address JHS */}
              <Box sx={{ flex: "1" }}>
                <Typography variant="subtitle1" mb={1} sx={{ minHeight: "32px", fontSize: "12.5px", display: "flex", alignItems: "center" }}>
                  School Full Address (Street / BRGY / City) <span style={{ color: "red" }}>*</span>
                  {!canEdit("schoolAddress") && <LockedBadge />}
                </Typography>
                <TextField fullWidth size="small" required name="schoolAddress" placeholder="Enter your School Address" value={person.schoolAddress || ""} onChange={handleChange} onBlur={() => handleUpdate(person)} disabled={!canEdit("schoolAddress")} InputProps={{ readOnly: !canEdit("schoolAddress") }} sx={!canEdit("schoolAddress") ? lockedSx : {}} error={errors.schoolAddress} helperText={errors.schoolAddress ? "This field is required." : ""} />
              </Box>

              {/* Course Program JHS */}
              <Box sx={{ flex: "1" }}>
                <Typography variant="subtitle1" mb={1} sx={{ minHeight: "32px", display: "flex", alignItems: "center" }}>
                  Course Program
                  {!canEdit("courseProgram") && <LockedBadge />}
                </Typography>
                <TextField fullWidth size="small" name="courseProgram" placeholder="Enter your Course Program" value={person.courseProgram || ""} onChange={handleChange} onBlur={() => handleUpdate(person)} disabled={!canEdit("courseProgram")} InputProps={{ readOnly: !canEdit("courseProgram") }} sx={!canEdit("courseProgram") ? lockedSx : {}} error={errors.courseProgram} helperText={errors.courseProgram ? "This field is required." : ""} />
              </Box>
            </Box>

            <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
              {/* Honor JHS */}
              <Box sx={{ flex: "1 1 33%" }}>
                <Typography variant="subtitle1" mb={1} sx={{ display: "flex", alignItems: "center" }}>
                  Recognition / Awards <span style={{ color: "red" }}>*</span>
                  {!canEdit("honor") && <LockedBadge />}
                </Typography>
                <TextField fullWidth size="small" name="honor" required value={person.honor || ""} placeholder="Enter your Honor" onChange={handleChange} onBlur={() => handleUpdate(person)} disabled={!canEdit("honor")} InputProps={{ readOnly: !canEdit("honor") }} sx={!canEdit("honor") ? lockedSx : {}} error={errors.honor} helperText={errors.honor ? "This field is required." : ""} />
              </Box>

              {/* General Average JHS */}
              <Box sx={{ flex: "1 1 33%" }}>
                <Typography variant="subtitle1" mb={1} sx={{ display: "flex", alignItems: "center" }}>
                  General Average <span style={{ color: "red" }}>*</span>
                  {!canEdit("generalAverage") && <LockedBadge />}
                </Typography>
                <TextField fullWidth size="small" required name="generalAverage" value={person.generalAverage || ""} placeholder="Enter your General Average" onChange={handleChange} onBlur={() => handleUpdate(person)} disabled={!canEdit("generalAverage")} InputProps={{ readOnly: !canEdit("generalAverage") }} sx={!canEdit("generalAverage") ? lockedSx : {}} error={errors.generalAverage} helperText={errors.generalAverage ? "This field is required." : ""} />
              </Box>

              {/* Year Graduated JHS */}
              <Box sx={{ flex: "1 1 33%" }}>
                <Typography variant="subtitle1" mb={1} sx={{ display: "flex", alignItems: "center" }}>
                  Year Graduated <span style={{ color: "red" }}>*</span>
                  {!canEdit("yearGraduated") && <LockedBadge />}
                </Typography>
                <TextField fullWidth size="small" required name="yearGraduated" placeholder="Enter your Year Graduated" value={person.yearGraduated || ""} onChange={handleChange} onBlur={() => handleUpdate(person)} disabled={!canEdit("yearGraduated")} InputProps={{ readOnly: !canEdit("yearGraduated") }} sx={!canEdit("yearGraduated") ? lockedSx : {}} error={errors.yearGraduated} helperText={errors.yearGraduated ? "This field is required." : ""} />
              </Box>
            </Box>

            {/* ── SENIOR HIGH SCHOOL ── */}
            <Typography style={{ fontSize: "20px", color: mainButtonColor, fontWeight: "bold" }}>Senior High School - Background:</Typography>
            <hr style={{ border: "1px solid #ccc", width: "100%" }} /><br />

            <Box sx={{ display: "flex", gap: 2, mb: 2 }}>

              {/* Educational Attainment SHS */}
              <Box sx={{ flex: "1 1 25%" }}>
                <Typography variant="subtitle1" mb={1} sx={{ display: "flex", alignItems: "center" }}>
                  Educational Attainment <span style={{ color: "red" }}>*</span>
                  {!canEdit("schoolLevel1") && <LockedBadge />}
                </Typography>
                <FormControl fullWidth size="small" required error={!!errors.schoolLevel1} disabled={!canEdit("schoolLevel1")} sx={!canEdit("schoolLevel1") ? lockedSx : {}}>
                  <InputLabel id="schoolLevel1-label">Educational Attainment</InputLabel>
                  <Select labelId="schoolLevel1-label" name="schoolLevel1" value={person.schoolLevel1 ?? ""} onChange={handleChange} onBlur={() => handleUpdate(person)} label="School Level" inputProps={{ readOnly: !canEdit("schoolLevel1") }}>
                    <MenuItem value="Senior High School">Senior High School</MenuItem>
                    <MenuItem value="Undergraduate">Undergraduate</MenuItem>
                    <MenuItem value="Graduate">Graduate</MenuItem>
                    <MenuItem value="ALS">ALS</MenuItem>
                    <MenuItem value="Vocational/Trade Course">Vocational/Trade Course</MenuItem>
                  </Select>
                  {errors.schoolLevel1 && <FormHelperText>This field is required.</FormHelperText>}
                </FormControl>
              </Box>

              {/* School Last Attended SHS */}
              <Box sx={{ flex: "1 1 25%" }}>
                <Typography variant="subtitle1" mb={1} sx={{ display: "flex", alignItems: "center" }}>
                  School Last Attended <span style={{ color: "red" }}>*</span>
                  {!canEdit("schoolLastAttended1") && <LockedBadge />}
                </Typography>
                <TextField fullWidth size="small" required name="schoolLastAttended1" placeholder="Enter School Last Attended" value={person.schoolLastAttended1 || ""} onChange={handleChange} onBlur={() => handleUpdate(person)} disabled={!canEdit("schoolLastAttended1")} InputProps={{ readOnly: !canEdit("schoolLastAttended1") }} sx={!canEdit("schoolLastAttended1") ? lockedSx : {}} error={errors.schoolLastAttended1} helperText={errors.schoolLastAttended1 ? "This field is required." : ""} />
              </Box>

              {/* School Address SHS */}
              <Box sx={{ flex: "1 1 25%" }}>
                <Typography variant="subtitle1" mb={1} sx={{ display: "flex", alignItems: "center" }}>
                  School Address <span style={{ color: "red" }}>*</span>
                  {!canEdit("schoolAddress1") && <LockedBadge />}
                </Typography>
                <TextField fullWidth size="small" required name="schoolAddress1" placeholder="Enter your School Address" value={person.schoolAddress1 || ""} onChange={handleChange} onBlur={() => handleUpdate(person)} disabled={!canEdit("schoolAddress1")} InputProps={{ readOnly: !canEdit("schoolAddress1") }} sx={!canEdit("schoolAddress1") ? lockedSx : {}} error={errors.schoolAddress1} helperText={errors.schoolAddress1 ? "This field is required." : ""} />
              </Box>

              {/* Course Program SHS */}
              <Box sx={{ flex: "1 1 25%" }}>
                <Typography variant="subtitle1" mb={1} sx={{ display: "flex", alignItems: "center" }}>
                  Course Program <span style={{ color: "red" }}>*</span>
                  {!canEdit("courseProgram1") && <LockedBadge />}
                </Typography>
                <TextField fullWidth size="small" required name="courseProgram1" placeholder="Enter your Course Program" value={person.courseProgram1 || ""} onChange={handleChange} onBlur={() => handleUpdate(person)} disabled={!canEdit("courseProgram1")} InputProps={{ readOnly: !canEdit("courseProgram1") }} sx={!canEdit("courseProgram1") ? lockedSx : {}} error={errors.courseProgram1} helperText={errors.courseProgram1 ? "This field is required." : ""} />
              </Box>
            </Box>

            <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
              {/* Honor SHS */}
              <Box sx={{ flex: "1 1 33%" }}>
                <Typography variant="subtitle1" mb={1} sx={{ display: "flex", alignItems: "center" }}>
                  Recognition / Awards <span style={{ color: "red" }}>*</span>
                  {!canEdit("honor1") && <LockedBadge />}
                </Typography>
                <TextField fullWidth size="small" required name="honor1" placeholder="Enter your Recognition / Awards" value={person.honor1 || ""} onChange={handleChange} onBlur={() => handleUpdate(person)} disabled={!canEdit("honor1")} InputProps={{ readOnly: !canEdit("honor1") }} sx={!canEdit("honor1") ? lockedSx : {}} error={errors.honor1} helperText={errors.honor1 ? "This field is required." : ""} />
              </Box>

              {/* General Average SHS */}
              <Box sx={{ flex: "1 1 33%" }}>
                <Typography variant="subtitle1" mb={1} sx={{ display: "flex", alignItems: "center" }}>
                  General Average <span style={{ color: "red" }}>*</span>
                  {!canEdit("generalAverage1") && <LockedBadge />}
                </Typography>
                <TextField fullWidth size="small" required name="generalAverage1" placeholder="Enter your General Average" value={person.generalAverage1 || ""} onChange={handleChange} onBlur={() => handleUpdate(person)} disabled={!canEdit("generalAverage1")} InputProps={{ readOnly: !canEdit("generalAverage1") }} sx={!canEdit("generalAverage1") ? lockedSx : {}} error={errors.generalAverage1} helperText={errors.generalAverage1 ? "This field is required." : ""} />
              </Box>

              {/* Year Graduated SHS */}
              <Box sx={{ flex: "1 1 33%" }}>
                <Typography variant="subtitle1" mb={1} sx={{ display: "flex", alignItems: "center" }}>
                  Year Graduated <span style={{ color: "red" }}>*</span>
                  {!canEdit("yearGraduated1") && <LockedBadge />}
                </Typography>
                <TextField fullWidth size="small" required name="yearGraduated1" placeholder="Enter your Year Graduated" value={person.yearGraduated1 || ""} onChange={handleChange} onBlur={() => handleUpdate(person)} disabled={!canEdit("yearGraduated1")} InputProps={{ readOnly: !canEdit("yearGraduated1") }} sx={!canEdit("yearGraduated1") ? lockedSx : {}} error={errors.yearGraduated1} helperText={errors.yearGraduated1 ? "This field is required." : ""} />
              </Box>
            </Box>

            {/* ── STRAND ── */}
            <Typography style={{ fontSize: "20px", color: mainButtonColor, fontWeight: "bold" }}>Strand (For Senior High School)</Typography>
            <hr style={{ border: "1px solid #ccc", width: "100%" }} /><br />

            <Typography variant="subtitle1" mb={1} sx={{ display: "flex", alignItems: "center" }}>
              Strand <span style={{ color: "red" }}>*</span>
              {!canEdit("strand") && <LockedBadge />}
            </Typography>
            <FormControl fullWidth size="small" required error={!!errors.strand} disabled={!canEdit("strand")} sx={!canEdit("strand") ? { ...lockedSx, mb: 4 } : { mb: 4 }}>
              <InputLabel id="strand-label">Strand</InputLabel>
              <Select labelId="strand-label" name="strand" value={person.strand ?? ""} onChange={handleChange} onBlur={() => handleUpdate(person)} label="Strand" inputProps={{ readOnly: !canEdit("strand") }}>
                <MenuItem value=""><em>Select Strand</em></MenuItem>
                <MenuItem value="Accountancy, Business and Management (ABM)">Accountancy, Business and Management (ABM)</MenuItem>
                <MenuItem value="Humanities and Social Sciences (HUMSS)">Humanities and Social Sciences (HUMSS)</MenuItem>
                <MenuItem value="Science, Technology, Engineering, and Mathematics (STEM)">Science, Technology, Engineering, and Mathematics (STEM)</MenuItem>
                <MenuItem value="General Academic (GAS)">General Academic (GAS)</MenuItem>
                <MenuItem value="Home Economics (HE)">Home Economics (HE)</MenuItem>
                <MenuItem value="Information and Communications Technology (ICT)">Information and Communications Technology (ICT)</MenuItem>
                <MenuItem value="Agri-Fishery Arts (AFA)">Agri-Fishery Arts (AFA)</MenuItem>
                <MenuItem value="Industrial Arts (IA)">Industrial Arts (IA)</MenuItem>
                <MenuItem value="Sports Track">Sports Track</MenuItem>
                <MenuItem value="Design and Arts Track">Design and Arts Track</MenuItem>
              </Select>
              {errors.strand && <FormHelperText>This field is required.</FormHelperText>}
            </FormControl>

            {/* ── Navigation ── */}
            <Box display="flex" justifyContent="space-between" mt={4}>
              <Button
                variant="contained"
                onClick={async () => {
                  await handleUpdate(person);
                  setSnackbar({ open: true, message: "Your record has been saved successfully!", severity: "success" });
                  setTimeout(() => { navigate("/student_family_background"); }, 1000);
                }}
                startIcon={<ArrowBackIcon sx={{ color: "#000", transition: "color 0.3s" }} />}
                sx={{ backgroundColor: subButtonColor, border: `1px solid ${borderColor}`, color: "#000", "&:hover": { backgroundColor: "#000000", color: "#fff", "& .MuiSvgIcon-root": { color: "#fff" } } }}
              >
                Previous Step
              </Button>

              <Button
                variant="contained"
                onClick={async () => {
                  if (isFormValid()) {
                    await handleUpdate(person);
                    setSnackbar({ open: true, message: "Your record has been saved successfully!", severity: "success" });
                    setTimeout(() => { navigate("/student_health_medical_records"); }, 1000);
                  } else {
                    setSnackbar({ open: true, message: "Please complete all required fields before proceeding.", severity: "error" });
                  }
                }}
                endIcon={<ArrowForwardIcon sx={{ color: "#fff", transition: "color 0.3s" }} />}
                sx={{ backgroundColor: mainButtonColor, border: `1px solid ${borderColor}`, color: "#fff", "&:hover": { backgroundColor: "#000000", color: "#fff", "& .MuiSvgIcon-root": { color: "#fff" } } }}
              >
                Next Step
              </Button>
            </Box>

            <Snackbar open={snackbar.open} autoHideDuration={1000} onClose={handleCloseSnackbar} anchorOrigin={{ vertical: "top", horizontal: "center" }}>
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

export default StudentDashboard3;
