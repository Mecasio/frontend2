import React, { useState, useEffect, useContext, useRef } from "react";
import { SettingsContext } from "../App";

import axios from "axios";
import {
  Button,
  Box,
  TextField,
  Container,
  Card,
  TableContainer,
  Paper,
  Table,
  TableHead,
  TableRow,
  TableCell,
  Typography,
  FormControl,
  FormHelperText,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  FormControlLabel,
  FormGroup,
  TableBody,
  CircularProgress,
} from "@mui/material";
import { Link } from "react-router-dom";
import PersonIcon from "@mui/icons-material/Person";
import FamilyRestroomIcon from "@mui/icons-material/FamilyRestroom";
import SchoolIcon from "@mui/icons-material/School";
import HealthAndSafetyIcon from "@mui/icons-material/HealthAndSafety";
import InfoIcon from "@mui/icons-material/Info";
import ErrorIcon from "@mui/icons-material/Error";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import LocalHospitalIcon from "@mui/icons-material/LocalHospital";
import HowToRegIcon from "@mui/icons-material/HowToReg";
import ListAltIcon from "@mui/icons-material/ListAlt";
import DescriptionIcon from "@mui/icons-material/Description";
import FactCheckIcon from "@mui/icons-material/FactCheck";
import LockIcon from "@mui/icons-material/Lock";
import API_BASE_URL from "../apiConfig";
import DateField from "../components/DateField";
import { Snackbar, Alert } from "@mui/material";
import StudentECATApplicationForm from "./StudentECATApplicationForm";
import StudentPersonalDataForm from "./StudentPersonalDataForm";
import StudentOfficeOfTheRegistrar from "./StudentOfficeOfTheRegistrar";
import StudentServicesSurvey from "./StudentServicesSurvey";
// ─────────────────────────────────────────────────────────────────────────────
// Helper: given a permissions object and a field key, returns true when a
// STUDENT is allowed to edit that field.
//
// Rules:
//   • If userRole !== "student"  → always editable (admins/registrar can edit all)
//   • If the field is not present in permissions at all → default editable
//   • Otherwise → follow the stored permission value
// ─────────────────────────────────────────────────────────────────────────────
const canStudentEdit = (permissions, fieldId, userRole) => {
  if (userRole !== "student") return true;
  if (permissions === null) return true;        // still loading — optimistic
  return permissions[fieldId] !== false;        // false = locked by admin
};

const StudentDashboard4 = () => {
  const settings = useContext(SettingsContext);
  const colors = settings?.colors || {};
  const branding = settings?.branding || {};
  const assets = settings?.assets || {};
  const headerColor = colors.header || "#1976d2";

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

  // ── Field-level edit permissions fetched from the shared store ──────────
  const [fieldPermissions, setFieldPermissions] = useState(null);

  useEffect(() => {
    if (!settings) return;

    if (colors.title) setTitleColor(colors.title);
    if (colors.subtitle) setSubtitleColor(colors.subtitle);
    if (colors.border) setBorderColor(colors.border);
    if (colors.mainButton) setMainButtonColor(colors.mainButton);
    if (colors.subButton) setSubButtonColor(colors.subButton);
    if (colors.stepper) setStepperColor(colors.stepper);

    if (assets.logoUrl) {
      setFetchedLogo(`${assets.logoUrl}`);
    }

    if (branding.companyName) setCompanyName(branding.companyName);
    if (branding.shortTerm) setShortTerm(branding.shortTerm);
    if (branding.campusAddress) setCampusAddress(branding.campusAddress);
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

  const navigate = useNavigate();

  const [explicitSelection, setExplicitSelection] = useState(false);

  const [userID, setUserID] = useState("");
  const [user, setUser] = useState("");
  const [userRole, setUserRole] = useState("");

  // Convenience: returns whether a given field is editable for the current user
  const isFieldEditable = (fieldId) => canStudentEdit(fieldPermissions, fieldId, userRole);

  const [person, setPerson] = useState({
    cough: "",
    colds: "",
    fever: "",
    asthma: "",
    faintingSpells: "",
    heartDisease: "",
    tuberculosis: "",
    frequentHeadaches: "",
    hernia: "",
    chronicCough: "",
    headNeckInjury: "",
    hiv: "",
    highBloodPressure: "",
    diabetesMellitus: "",
    allergies: "",
    cancer: "",
    smokingCigarette: "",
    alcoholDrinking: "",
    hospitalized: "",
    hospitalizationDetails: "",
    medications: "",
    hadCovid: "",
    covidDate: "",
    vaccine1Brand: "",
    vaccine1Date: "",
    vaccine2Brand: "",
    vaccine2Date: "",
    booster1Brand: "",
    booster1Date: "",
    booster2Brand: "",
    booster2Date: "",
    chestXray: "",
    cbc: "",
    urinalysis: "",
    otherworkups: "",
    symptomsToday: "",
    remarks: "",
  });
  const [selectedPerson, setSelectedPerson] = useState(null);

  const location = useLocation();
  const [studentNumber, setStudentNumber] = useState("");
  const queryParams = new URLSearchParams(location.search);
  const queryPersonId = queryParams.get("person_id");

  const queryStudentNumber = sessionStorage.getItem("student_number");

  useEffect(() => {
    if (!queryStudentNumber) return;
    const fetchPersonId = async () => {
      try {
        const res = await axios.get(
          `${API_BASE_URL}/api/person_id/${queryStudentNumber}`,
        );
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
      const isFresh =
        source === "applicant_list" && Date.now() - ts < 5 * 60 * 1000;

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
      const res = await axios.get(
        `${API_BASE_URL}/api/student_data_as_applicant/${id}`,
      );
      if (res.data) {
        setPerson(res.data);
        setSelectedPerson(res.data);
      }
    } catch (err) {
      console.error("❌ Failed to fetch person by ID:", err);
    }
  };

  const handleUpdate = async (updatedData) => {
    try {
      const { person_id, created_at, current_step, ...personToSave } = updatedData;
      await axios.put(
        `${API_BASE_URL}/api/enrollment/person/${userID}`,
        personToSave,
      );
      console.log("✅ Auto-saved to ENROLLMENT DB");
    } catch (error) {
      console.error("❌ Auto-save failed:", error);
    }
  };

  const handleBlur = async () => {
    try {
      const { person_id, created_at, current_step, ...personToSave } = person;
      await axios.put(
        `${API_BASE_URL}/api/enrollment/person/${userID}`,
        personToSave,
      );
      console.log("✅ Auto-saved on blur");
    } catch (err) {
      console.error("❌ Auto-save failed on blur:", err);
    }
  };

  useEffect(() => {
    const fetchPersonById = async () => {
      if (!userID) return;

      try {
        const res = await axios.get(
          `${API_BASE_URL}/api/student_data_as_applicant/${userID}`,
        );
        if (res.data) {
          setPerson(res.data);
          setSelectedPerson(res.data);
        } else {
          console.warn("⚠️ No person found for ID:", userID);
        }
      } catch (err) {
        console.error("❌ Failed to fetch person by ID:", err);
      }
    };

    fetchPersonById();
  }, [userID]);

  const steps = [
    { label: "Personal Information", icon: <PersonIcon />, path: `/student_personal_information` },
    { label: "Family Background", icon: <FamilyRestroomIcon />, path: `/student_family_background` },
    { label: "Educational Attainment", icon: <SchoolIcon />, path: `/student_educational_attainment` },
    { label: "Health Medical Records", icon: <HealthAndSafetyIcon />, path: `/student_health_medical_records` },
    { label: "Other Information", icon: <InfoIcon />, path: `/student_other_information` },
  ];

  const [activeStep, setActiveStep] = useState(3);
  const [clickedSteps, setClickedSteps] = useState(
    Array(steps.length).fill(false),
  );

  const [errors, setErrors] = useState({});

  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "warning",
  });

  const handleCloseSnackbar = (event, reason) => {
    if (reason === "clickaway") return;
    setSnackbar((prev) => ({ ...prev, open: false }));
  };

  const handleStepClick = async (index) => {
    try {
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

      setTimeout(() => {
        navigate(steps[index].path);
      }, 1000);
    } catch (error) {
      console.error(error);

      setSnackbar({
        open: true,
        message: "Failed to save record.",
        severity: "error",
      });
    }
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

  // ── Locked-field overlay style: visually shows the field is read-only ───
  const lockedInputStyle = {
    ...inputStyle,
    backgroundColor: "#f5f5f5",
    color: "#999",
    cursor: "not-allowed",
    pointerEvents: "none",
  };

  // Returns the correct style depending on whether the field is editable
  const getInputStyle = (fieldId) =>
    isFieldEditable(fieldId) ? inputStyle : lockedInputStyle;

  // ── Locked indicator chip shown next to a section title when all its
  //    fields are locked by the admin ──────────────────────────────────────
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

  return (
    <Box sx={{ height: "calc(100vh - 150px)", overflowY: "auto", paddingRight: 1, backgroundColor: "transparent", mt: 1, padding: 2 }}>
      {generatingKey && FORM_CONFIGS[generatingKey] && (
        <div ref={hiddenFormRef} style={{ position: "absolute", left: "-9999px", top: 0 }}>
          {React.createElement(FORM_CONFIGS[generatingKey].Component)}
        </div>
      )}

      {/* Top header */}
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


      <h1
        style={{
          fontSize: "30px",
          fontWeight: "bold",
          textAlign: "center",
          color: "black",
          marginTop: "25px",
        }}
      >
        PRINTABLE DOCUMENTS
      </h1>

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
            <Typography style={{ fontSize: "20px", color: mainButtonColor, fontWeight: "bold" }}>Health and Medical Record:</Typography>
            <hr style={{ border: "1px solid #ccc", width: "100%" }} />
            <br />

            {/* ── I. Current Symptoms ── */}
            <Typography variant="subtitle1" mb={1}>
              <div style={{ fontWeight: "bold" }}>
                I. Do you have any of the following symptoms today?
                {!isFieldEditable("cough") && !isFieldEditable("colds") && !isFieldEditable("fever") && (
                  <LockedBadge />
                )}
              </div>
            </Typography>

            <FormGroup row sx={{ ml: 2 }}>
              {["cough", "colds", "fever"].map((symptom) => (
                <FormControlLabel
                  key={symptom}
                  control={
                    <Checkbox
                      name={symptom}
                      checked={person[symptom] === 1}
                      disabled={!isFieldEditable(symptom)}
                      onChange={(e) => {
                        if (!isFieldEditable(symptom)) return;
                        const { name, checked } = e.target;
                        const updatedPerson = {
                          ...person,
                          [name]: checked ? 1 : 0,
                        };
                        setPerson(updatedPerson);
                        handleUpdate(updatedPerson);
                      }}
                      onBlur={handleBlur}
                    />
                  }
                  label={
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                      {symptom.charAt(0).toUpperCase() + symptom.slice(1)}
                      {!isFieldEditable(symptom) && <LockIcon sx={{ fontSize: 13, color: "#c62828" }} />}
                    </Box>
                  }
                  sx={{ ml: 5 }}
                />
              ))}
            </FormGroup>

            <br />

            {/* ── II. Medical History ── */}
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
                      {rowGroup.map(({ label, key }) => {
                        const editable = isFieldEditable(key);
                        return (
                          <React.Fragment key={key}>
                            <td
                              colSpan={15}
                              style={{
                                border: "1px solid black",
                                padding: "4px",
                                backgroundColor: !editable ? "#fafafa" : undefined,
                                color: !editable ? "#999" : undefined,
                              }}
                            >
                              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                                {label}
                                {!editable && <LockIcon sx={{ fontSize: 12, color: "#c62828" }} />}
                              </Box>
                            </td>
                            <td colSpan={12} style={{ border: "1px solid black", padding: "4px", backgroundColor: !editable ? "#fafafa" : undefined }}>
                              <div style={{ display: "flex", flexDirection: "column", gap: "1px" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "2px", marginLeft: "10px" }}>
                                  {/* YES */}
                                  <div style={{ display: "flex", alignItems: "center", gap: "1px" }}>
                                    <Checkbox
                                      name={key}
                                      checked={person[key] === 1}
                                      disabled={!editable}
                                      onChange={() => {
                                        if (!editable) return;
                                        const updatedPerson = {
                                          ...person,
                                          [key]: person[key] === 1 ? null : 1,
                                        };
                                        setPerson(updatedPerson);
                                        handleUpdate(updatedPerson);
                                      }}
                                      onBlur={handleBlur}
                                    />
                                    <span style={{ fontSize: "15px", fontFamily: "Arial", color: !editable ? "#999" : undefined }}>Yes</span>
                                  </div>

                                  {/* NO */}
                                  <div style={{ display: "flex", alignItems: "center", gap: "1px" }}>
                                    <Checkbox
                                      name={key}
                                      checked={person[key] === 0}
                                      disabled={!editable}
                                      onChange={() => {
                                        if (!editable) return;
                                        const updatedPerson = {
                                          ...person,
                                          [key]: person[key] === 0 ? null : 0,
                                        };
                                        setPerson(updatedPerson);
                                        handleUpdate(updatedPerson);
                                      }}
                                      onBlur={handleBlur}
                                    />
                                    <span style={{ fontSize: "15px", fontFamily: "Arial", color: !editable ? "#999" : undefined }}>No</span>
                                  </div>
                                </div>
                              </div>
                            </td>
                          </React.Fragment>
                        );
                      })}
                    </tr>
                  ))}
              </tbody>
            </table>

            {/* ── Hospitalization ── */}
            <Box mt={1} flexDirection="column" display="flex" alignItems="flex-start">
              <Box mt={1} flexDirection="column" display="flex" alignItems="flex-start">
                <Box display="flex" alignItems="center" flexWrap="wrap">
                  <Typography sx={{ marginRight: '16px' }}>
                    Do you have any previous history of hospitalization or operation?
                    {!isFieldEditable("hospitalized") && <LockIcon sx={{ fontSize: 13, color: "#c62828", ml: 0.5, verticalAlign: "middle" }} />}
                  </Typography>

                  <Box display="flex" gap="16px" ml={4} alignItems="center">
                    <FormControlLabel
                      control={
                        <Checkbox
                          name="hospitalized"
                          checked={person.hospitalized === 1}
                          disabled={!isFieldEditable("hospitalized")}
                          onChange={() => {
                            if (!isFieldEditable("hospitalized")) return;
                            const updatedPerson = {
                              ...person,
                              hospitalized: person.hospitalized === 1 ? null : 1,
                            };
                            setPerson(updatedPerson);
                            handleUpdate(updatedPerson);
                          }}
                          onBlur={handleBlur}
                        />
                      }
                      label="Yes"
                    />

                    <FormControlLabel
                      control={
                        <Checkbox
                          name="hospitalized"
                          checked={person.hospitalized === 0}
                          disabled={!isFieldEditable("hospitalized")}
                          onChange={() => {
                            if (!isFieldEditable("hospitalized")) return;
                            const updatedPerson = {
                              ...person,
                              hospitalized: person.hospitalized === 0 ? null : 0,
                            };
                            setPerson(updatedPerson);
                            handleUpdate(updatedPerson);
                          }}
                          onBlur={handleBlur}
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
                {!isFieldEditable("hospitalizationDetails") && <LockIcon sx={{ fontSize: 13, color: "#c62828", ml: 0.5, verticalAlign: "middle" }} />}
              </Typography>
              <TextField
                fullWidth
                name="hospitalizationDetails"
                placeholder=""
                variant="outlined"
                size="small"
                value={person.hospitalizationDetails || ""}
                disabled={!isFieldEditable("hospitalizationDetails")}
                onChange={(e) => {
                  if (!isFieldEditable("hospitalizationDetails")) return;
                  const { name, value } = e.target;
                  const updatedPerson = { ...person, [name]: value };
                  setPerson(updatedPerson);
                  handleUpdate(updatedPerson);
                }}
                onBlur={handleBlur}
                sx={!isFieldEditable("hospitalizationDetails") ? { "& .MuiInputBase-input": { backgroundColor: "#f5f5f5", color: "#999" } } : {}}
              />
            </Box>

            <br />

            {/* ── III. Medication ── */}
            <Typography variant="subtitle1" mb={1}>
              <div style={{ fontWeight: "bold" }}>
                III. MEDICATION
                {!isFieldEditable("medications") && <LockedBadge />}
              </div>
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
                disabled={!isFieldEditable("medications")}
                onChange={(e) => {
                  if (!isFieldEditable("medications")) return;
                  const { name, value } = e.target;
                  const updatedPerson = { ...person, [name]: value };
                  setPerson(updatedPerson);
                  handleUpdate(updatedPerson);
                }}
                onBlur={handleBlur}
                sx={!isFieldEditable("medications") ? { "& .MuiInputBase-root": { backgroundColor: "#f5f5f5" }, "& .MuiInputBase-input": { color: "#999" } } : {}}
              />
            </Box>

            {/* ── IV. COVID Profile ── */}
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
                      backgroundColor: (!isFieldEditable("hadCovid") && !isFieldEditable("covidDate")) ? "#fafafa" : undefined,
                    }}
                  >
                    <Box display="flex" alignItems="center" gap={2} flexWrap="nowrap">
                      <Typography>
                        A. Do you have history of COVID-19?
                        {!isFieldEditable("hadCovid") && <LockIcon sx={{ fontSize: 13, color: "#c62828", ml: 0.5, verticalAlign: "middle" }} />}
                      </Typography>

                      <Box display="flex" alignItems="center" gap="10px" ml={1}>
                        <Box display="flex" alignItems="center" gap="1px">
                          <Checkbox
                            name="hadCovid"
                            checked={person.hadCovid === 1}
                            disabled={!isFieldEditable("hadCovid")}
                            onChange={() => {
                              if (!isFieldEditable("hadCovid")) return;
                              const updatedPerson = { ...person, hadCovid: person.hadCovid === 1 ? null : 1 };
                              setPerson(updatedPerson);
                              handleUpdate(updatedPerson);
                            }}
                            onBlur={handleBlur}
                          />
                          <span style={{ fontSize: "15px", fontFamily: "Arial", color: !isFieldEditable("hadCovid") ? "#999" : undefined }}>YES</span>
                        </Box>

                        <Box display="flex" alignItems="center" gap="1px">
                          <Checkbox
                            name="hadCovid"
                            checked={person.hadCovid === 0}
                            disabled={!isFieldEditable("hadCovid")}
                            onChange={() => {
                              if (!isFieldEditable("hadCovid")) return;
                              const updatedPerson = { ...person, hadCovid: person.hadCovid === 0 ? null : 0 };
                              setPerson(updatedPerson);
                              handleUpdate(updatedPerson);
                            }}
                            onBlur={handleBlur}
                          />
                          <span style={{ fontSize: "15px", fontFamily: "Arial", color: !isFieldEditable("hadCovid") ? "#999" : undefined }}>NO</span>
                        </Box>
                      </Box>

                      <span style={{ color: !isFieldEditable("covidDate") ? "#999" : undefined }}>
                        IF YES, WHEN:
                        {!isFieldEditable("covidDate") && <LockIcon sx={{ fontSize: 13, color: "#c62828", ml: 0.5, verticalAlign: "middle" }} />}
                      </span>
                      <input
                        type="date"
                        name="covidDate"
                        value={person.covidDate || ""}
                        disabled={!isFieldEditable("covidDate")}
                        onChange={(e) => {
                          if (!isFieldEditable("covidDate")) return;
                          const updatedPerson = { ...person, covidDate: e.target.value };
                          setPerson(updatedPerson);
                          handleUpdate(updatedPerson);
                        }}
                        onBlur={handleBlur}
                        style={{
                          width: "200px",
                          height: "50px",
                          fontSize: "16px",
                          padding: "10px",
                          border: "1px solid #ccc",
                          borderRadius: "4px",
                          ...(!isFieldEditable("covidDate") ? { backgroundColor: "#f5f5f5", color: "#999", cursor: "not-allowed" } : {}),
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
                    <div style={{ marginBottom: "8px" }}>B. COVID Vaccinations:</div>
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
                                disabled={!isFieldEditable(field)}
                                onChange={(e) => {
                                  if (!isFieldEditable(field)) return;
                                  const updatedPerson = { ...person, [field]: e.target.value };
                                  setPerson(updatedPerson);
                                  handleUpdate(updatedPerson);
                                }}
                                onBlur={handleBlur}
                                style={getInputStyle(field)}
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
                                disabled={!isFieldEditable(field)}
                                onChange={(e) => {
                                  if (!isFieldEditable(field)) return;
                                  const updatedPerson = { ...person, [field]: e.target.value };
                                  setPerson(updatedPerson);
                                  handleUpdate(updatedPerson);
                                }}
                                onBlur={handleBlur}
                                style={getInputStyle(field)}
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

            {/* ── V. Lab Results ── */}
            <Typography variant="subtitle1" mb={1}>
              <div style={{ fontWeight: "bold" }}>V. Please Indicate Result of the Following:</div>
            </Typography>

            <table className="w-full border border-black border-collapse table-fixed">
              <tbody>
                {[
                  { label: "Chest X-ray:", field: "chestXray" },
                  { label: "CBC:", field: "cbc" },
                  { label: "Urinalysis:", field: "urinalysis" },
                  { label: "Other Workups:", field: "otherworkups" },
                ].map(({ label, field }) => (
                  <tr key={field}>
                    <td className="border border-black p-2 w-1/3 font-medium">
                      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                        {label}
                        {!isFieldEditable(field) && <LockIcon sx={{ fontSize: 13, color: "#c62828" }} />}
                      </Box>
                    </td>
                    <td className="border border-black p-2 w-2/3" style={{ backgroundColor: !isFieldEditable(field) ? "#fafafa" : undefined }}>
                      <input
                        type="text"
                        name={field}
                        value={person[field] || ""}
                        disabled={!isFieldEditable(field)}
                        onChange={(e) => {
                          if (!isFieldEditable(field)) return;
                          const { name, value } = e.target;
                          const updatedPerson = { ...person, [name]: value };
                          setPerson(updatedPerson);
                          handleUpdate(updatedPerson);
                        }}
                        onBlur={handleBlur}
                        className="w-full border px-3 py-2 rounded"
                        style={!isFieldEditable(field) ? { backgroundColor: "#f5f5f5", color: "#999", cursor: "not-allowed" } : {}}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* ── VI. Diagnosis — always system-locked for students ── */}
            <div style={{ marginTop: "16px" }}>
              <Typography variant="subtitle1" mb={1}>
                <div style={{ fontWeight: "bold" }}>
                  VI. Diagnosis :
                  {userRole === "student" && <LockedBadge />}
                </div>
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
                        backgroundColor: userRole === "student" ? "#fafafa" : undefined,
                      }}
                    >
                      <Typography sx={{ fontSize: "15px", fontFamily: "Arial", marginBottom: "4px", color: userRole === "student" ? "#999" : undefined }}>
                        Diagnosis Result:
                      </Typography>

                      <div style={{ display: "flex", alignItems: "center", gap: "20px", marginTop: "8px" }}>
                        {/* Physically Fit */}
                        <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                          <Checkbox
                            name="symptomsToday"
                            checked={person.symptomsToday === 0}
                            // System-locked for students — diagnosis is admin/medical-staff only
                            disabled={userRole === "student"}
                            onChange={() => {
                              if (userRole === "student") return;
                              const updatedPerson = {
                                ...person,
                                symptomsToday: person.symptomsToday === 0 ? null : 0,
                              };
                              setPerson(updatedPerson);
                              handleUpdate(updatedPerson);
                            }}
                            onBlur={handleBlur}
                          />
                          <span style={{ fontSize: "15px", fontFamily: "Arial", color: userRole === "student" ? "#999" : undefined }}>Physically Fit</span>
                        </div>

                        {/* For Compliance */}
                        <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                          <Checkbox
                            name="symptomsToday"
                            checked={person.symptomsToday === 1}
                            disabled={userRole === "student"}
                            onChange={() => {
                              if (userRole === "student") return;
                              const updatedPerson = {
                                ...person,
                                symptomsToday: person.symptomsToday === 1 ? null : 1,
                              };
                              setPerson(updatedPerson);
                              handleUpdate(updatedPerson);
                            }}
                            onBlur={handleBlur}
                          />
                          <span style={{ fontSize: "15px", fontFamily: "Arial", color: userRole === "student" ? "#999" : undefined }}>For Compliance</span>
                        </div>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* ── VII. Remarks — always system-locked for students ── */}
            <div style={{ marginTop: "16px" }}>
              <Typography variant="subtitle1" fontWeight="bold" mb={1}>
                VII. Remarks:
                {userRole === "student" && <LockedBadge />}
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
                    <TableCell sx={{ border: "1px solid black", p: 1, backgroundColor: userRole === "student" ? "#fafafa" : undefined }}>
                      <TextField
                        name="remarks"
                        multiline
                        minRows={2}
                        fullWidth
                        size="small"
                        value={person.remarks || ""}
                        // System-locked for students — remarks filled by medical staff only
                        disabled={userRole === "student"}
                        onChange={(e) => {
                          if (userRole === "student") return;
                          const updatedPerson = { ...person, remarks: e.target.value };
                          setPerson(updatedPerson);
                          handleUpdate(updatedPerson);
                        }}
                        onBlur={handleBlur}
                        sx={{
                          backgroundColor: "white",
                          borderRadius: "8px",
                          '& .MuiOutlinedInput-root': { padding: '4px 8px' },
                          '& .MuiInputBase-multiline': { padding: 0 },
                          ...(userRole === "student" ? { "& .MuiInputBase-root": { backgroundColor: "#f5f5f5" }, "& .MuiInputBase-input": { color: "#999" } } : {}),
                        }}
                      />
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>

            <Box display="flex" justifyContent="space-between" mt={4}>
              {/* Previous Step */}
              <Button
                variant="contained"
                onClick={async () => {
                  await handleUpdate(person);
                  setSnackbar({
                    open: true,
                    message: "Your record has been saved successfully!",
                    severity: "success",
                  });
                  setTimeout(() => {
                    navigate("/student_educational_attainment");
                  }, 1000);
                }}
                startIcon={
                  <ArrowBackIcon sx={{ color: "#000", transition: "color 0.3s" }} />
                }
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

              {/* Next Step */}
              <Button
                variant="contained"
                onClick={async () => {
                  try {
                    await handleUpdate(person);

                    setSnackbar({
                      open: true,
                      message: "Your record has been saved successfully!",
                      severity: "success",
                    });

                    setTimeout(() => {
                      navigate("/student_other_information");
                    }, 1000);
                  } catch (error) {
                    console.error(error);

                    setSnackbar({
                      open: true,
                      message: "Failed to save record.",
                      severity: "error",
                    });
                  }
                }}
                endIcon={
                  <ArrowForwardIcon sx={{ color: "#fff", transition: "color 0.3s" }} />
                }
                sx={{
                  backgroundColor: mainButtonColor,
                  border: `1px solid ${borderColor}`,
                  color: "#fff",
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

            <Snackbar
              open={snackbar.open}
              autoHideDuration={1000}
              onClose={handleCloseSnackbar}
              anchorOrigin={{ vertical: "top", horizontal: "center" }}
            >
              <Alert
                onClose={handleCloseSnackbar}
                severity={snackbar.severity}
                sx={{ width: "100%" }}
              >
                {snackbar.message}
              </Alert>
            </Snackbar>
          </Container>
        </form>
      </Container>
    </Box>
  );
};

export default StudentDashboard4;
