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
  CircularProgress,
} from "@mui/material";
import { Link } from "react-router-dom";
import PersonIcon from "@mui/icons-material/Person";
import FamilyRestroomIcon from "@mui/icons-material/FamilyRestroom";
import SchoolIcon from "@mui/icons-material/School";
import HealthAndSafetyIcon from "@mui/icons-material/HealthAndSafety";
import InfoIcon from "@mui/icons-material/Info";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import FolderIcon from "@mui/icons-material/Folder";
import ErrorIcon from "@mui/icons-material/Error";
import LockIcon from "@mui/icons-material/Lock";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import LocalHospitalIcon from "@mui/icons-material/LocalHospital";
import HowToRegIcon from "@mui/icons-material/HowToReg";
import ListAltIcon from "@mui/icons-material/ListAlt";
import DescriptionIcon from "@mui/icons-material/Description";
import FactCheckIcon from "@mui/icons-material/FactCheck";
import API_BASE_URL from "../apiConfig";
import { Snackbar, Alert } from "@mui/material";
import useStudentEditPermissions from "../account_management/useStudentEditPermissions";
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
  if (permissions === null) return true;   // still loading — optimistic
  return permissions[fieldId] !== false;     // false = locked by admin
};

const StudentDashboard5 = () => {
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

  const location = useLocation();

  const navigate = useNavigate();
  const [explicitSelection, setExplicitSelection] = useState(false);

  const [userID, setUserID] = useState("");
  const [user, setUser] = useState("");
  const [userRole, setUserRole] = useState("");

  // Convenience: returns whether a given field is editable for the current user
  const isFieldEditable = (fieldId) => canStudentEdit(fieldPermissions, fieldId, userRole);

  const [selectedPerson, setSelectedPerson] = useState(null);

  const [person, setPerson] = useState({
    termsOfAgreement: "",
  });

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

  // Fetch person by ID (when navigating with ?person_id=... or sessionStorage)
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

  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "warning",
  });

  const handleCloseSnackbar = (event, reason) => {
    if (reason === "clickaway") return;
    setSnackbar((prev) => ({ ...prev, open: false }));
  };

  const handleChange = (e) => {
    // Respect permission lock — students cannot change a locked field
    if (!isFieldEditable(e.target.name)) return;

    const { name, type, checked, value } = e.target;
    const updatedPerson = {
      ...person,
      [name]: type === "checkbox" ? (checked ? 1 : 0) : value,
    };
    setPerson(updatedPerson);
    handleUpdate(updatedPerson);
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

  const [errors, setErrors] = useState({});
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

  const steps = [
    { label: "Personal Information", icon: <PersonIcon />, path: `/student_personal_information` },
    { label: "Family Background", icon: <FamilyRestroomIcon />, path: `/student_family_background` },
    { label: "Educational Attainment", icon: <SchoolIcon />, path: `/student_educational_attainment` },
    { label: "Health Medical Records", icon: <HealthAndSafetyIcon />, path: `/student_health_medical_records` },
    { label: "Other Information", icon: <InfoIcon />, path: `/student_other_information` },
  ];

  const [activeStep, setActiveStep] = useState(4);
  const [clickedSteps, setClickedSteps] = useState(Array(steps.length).fill(false));
  const [currentStep, setCurrentStep] = useState(0);

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

  return (
    <Box
      sx={{
        height: "calc(100vh - 150px)",
        overflowY: "auto",
        paddingRight: 1,
        backgroundColor: "transparent",
        mt: 1,
        padding: 2,
      }}
    >
      {generatingKey && FORM_CONFIGS[generatingKey] && (
        <div ref={hiddenFormRef} style={{ position: "absolute", left: "-9999px", top: 0 }}>
          {React.createElement(FORM_CONFIGS[generatingKey].Component)}
        </div>
      )}

      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          mb: 2,
        }}
      >
        <Typography
          variant="h4"
          sx={{
            fontWeight: "bold",
            color: titleColor,
            fontSize: "36px",
          }}
        >
          OTHER INFORMATION
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
              <Typography
                style={{
                  fontSize: "20px",
                  padding: "10px",
                  fontFamily: "Poppins, sans-serif",
                }}
              >
                Step 5: Other Information
              </Typography>
            </Box>
          </Container>

          <Container
            maxWidth="100%"
            sx={{
              backgroundColor: "#f1f1f1",
              border: `1px solid ${borderColor}`,
              padding: 4,
              borderRadius: 2,
              boxShadow: 3,
            }}
          >
            <Typography
              style={{
                fontSize: "20px",
                color: mainButtonColor,
                fontWeight: "bold",
              }}
            >
              Other Information:
            </Typography>
            <hr style={{ border: "1px solid #ccc", width: "100%" }} />

            <Typography style={{ fontWeight: "bold", textAlign: "Center" }}>
              Data Subject Consent Form
            </Typography>
            <br />

            {/* ── Static legal text — institution-managed, never editable by students ── */}
            <Typography
              style={{
                fontSize: "12px",
                fontFamily: "Poppins, sans-serif",
                textAlign: "Left",
              }}
            >
              In accordance with RA 10173 or Data Privacy Act of 2012, I give my
              consent to the following terms and conditions on the collection,
              use, processing, and disclosure of my personal data:
            </Typography>
            <br />
            <Typography
              style={{
                fontSize: "12px",
                fontFamily: "Poppins, sans-serif",
                textAlign: "left",
              }}
            >
              1. I am aware that the {companyName || "Your School Name"}{" "}
              {shortTerm ? `(${shortTerm.toUpperCase()})` : ""} has collected
              and stored my personal data during my admission/enrollment at{" "}
              {shortTerm
                ? shortTerm.toUpperCase()
                : companyName || "the institution"}
              . This data includes my demographic profile, contact details like
              home address, email address, landline numbers, and mobile numbers.
            </Typography>

            <Typography
              style={{
                fontSize: "12px",
                fontFamily: "Poppins, sans-serif",
                textAlign: "Left",
              }}
            >
              2. I agree to personally update these data through personal
              request from the Office of the registrar.
            </Typography>
            <Typography
              style={{
                fontSize: "12px",
                fontFamily: "Poppins, sans-serif",
                textAlign: "left",
              }}
            >
              3. In consonance with the above stated Act, I am aware that the
              University will protect my school records related to my being a
              student/graduate of{" "}
              {shortTerm ? shortTerm.toUpperCase() : "the University"}. However,
              I have the right to authorize a representative to claim the same
              subject to the policy of the University.
            </Typography>

            <Typography
              style={{
                fontSize: "12px",
                fontFamily: "Poppins, sans-serif",
                textAlign: "Left",
              }}
            >
              4. In order to promote efficient management of the organization's
              records, I authorize the University to manage my data for data
              sharing with industry partners, government agencies/embassies,
              other educational institutions, and other offices for the
              university for employment, statistics, immigration, transfer
              credentials, and other legal purposes that may serve me best.
            </Typography>
            <br />
            <Typography
              style={{
                fontSize: "12px",
                fontFamily: "Poppins, sans-serif",
                textAlign: "Left",
              }}
            >
              By clicking the submit button, I warrant that I have read,
              understood all of the above provisions, and agreed to its full
              implementation.
            </Typography>
            <br />
            <hr style={{ border: "1px solid #ccc", width: "100%" }} />
            <br />
            <Typography
              style={{
                fontSize: "12px",
                fontFamily: "Poppins, sans-serif",
                textAlign: "Left",
              }}
            >
              I certify that the information given above are true, complete, and
              accurate to the best of my knowledge and belief. I promise to
              abide by the rules and regulations of{" "}
              {companyName || "the institution"} regarding the ECAT and my
              possible admission. I am aware that any false or misleading
              information and/or statement may result in the refusal or
              disqualification of my admission to the institution.
            </Typography>

            {/* ── Terms of Agreement checkbox — permission-controlled ── */}
            <FormControl
              required
              error={!!errors.termsOfAgreement}
              component="fieldset"
              sx={{ mb: 2 }}
            >
              <FormControlLabel
                control={
                  <Checkbox
                    name="termsOfAgreement"
                    checked={person.termsOfAgreement === 1}
                    // Disabled when admin has locked this field for students
                    disabled={!isFieldEditable("termsOfAgreement")}
                    onChange={handleChange}
                    onBlur={handleBlur}
                  />
                }
                label={
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                    I agree Terms of Agreement
                    {!isFieldEditable("termsOfAgreement") && <LockedBadge />}
                  </Box>
                }
              />
              {errors.termsOfAgreement && (
                <FormHelperText>This field is required.</FormHelperText>
              )}
            </FormControl>

            <Box display="flex" justifyContent="space-between" mt={4}>
              {/* Previous Page Button */}
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
                    navigate("/student_health_medical_records");
                  }, 1000);
                }}
                startIcon={
                  <ArrowBackIcon
                    sx={{
                      color: "#000",
                      transition: "color 0.3s",
                    }}
                  />
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

              <Button
                variant="contained"
                onClick={async () => {
                  const valid = isFormValid();
                  if (!valid) {
                    setSnackbar({
                      open: true,
                      message: "Please agree to the Terms of Agreement before submitting.",
                      severity: "error",
                    });
                    return;
                  }
                  await handleUpdate(person);
                  setSnackbar({
                    open: true,
                    message: "Your record has been saved successfully!",
                    severity: "success",
                  });
                  setTimeout(() => {
                    navigate("/student_online_requirements");
                  }, 1200);
                }}
                endIcon={
                  <FolderIcon sx={{ color: "#fff", transition: "color 0.3s" }} />
                }
                sx={{
                  backgroundColor: mainButtonColor,
                  border: `1px solid ${borderColor}`,
                  color: "#fff",
                  "&:hover": {
                    backgroundColor: "#E8C999",
                    color: "#000",
                    "& .MuiSvgIcon-root": { color: "#000" },
                  },
                }}
              >
                Submit (Save Information)
              </Button>
            </Box>

            <Snackbar
              open={snackbar.open}
              autoHideDuration={snackbar.severity === "error" ? 5000 : 1500}
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

export default StudentDashboard5;
