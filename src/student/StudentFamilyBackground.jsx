import React, { useState, useEffect, useContext, useRef } from "react";
import { SettingsContext } from "../App";
import axios from "axios";
import {
  Box, Button, TextField, Container, Card,
  Typography, FormControl, FormHelperText, InputLabel, Select,
  MenuItem, Checkbox, FormControlLabel, CircularProgress,
} from "@mui/material";
import { Link } from "react-router-dom";
import PersonIcon from "@mui/icons-material/Person";
import FamilyRestroomIcon from "@mui/icons-material/FamilyRestroom";
import SchoolIcon from "@mui/icons-material/School";
import HealthAndSafetyIcon from "@mui/icons-material/HealthAndSafety";
import InfoIcon from "@mui/icons-material/Info";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ErrorIcon from "@mui/icons-material/Error";
import LockIcon from "@mui/icons-material/Lock";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import { Snackbar, Alert } from "@mui/material";
import API_BASE_URL from "../apiConfig";
import useStudentEditPermissions from "../account_management/useStudentEditPermissions";
import StudentECATApplicationForm from "./StudentECATApplicationForm";
import StudentPersonalDataForm from "./StudentPersonalDataForm";
import StudentOfficeOfTheRegistrar from "./StudentOfficeOfTheRegistrar";
import StudentServicesSurvey from "./StudentServicesSurvey";

const StudentDashboard2 = () => {
  const settings = useContext(SettingsContext);
  const colors = settings?.colors || {};
  const branding = settings?.branding || {};
  const assets = settings?.assets || {};
  const headerColor = colors.header || "#1976d2";

  // ── Hook at the very top ──────────────────────────────────────────────────
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
  const [userID, setUserID] = useState("");
  const [user, setUser] = useState("");
  const [userRole, setUserRole] = useState("");
  const [studentNumber, setStudentNumber] = useState("");
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "warning" });
  const [errors, setErrors] = useState({});
  const [activeStep, setActiveStep] = useState(1);
  const [clickedSteps, setClickedSteps] = useState(Array(5).fill(false));
  const [soloParentChoice, setSoloParentChoice] = useState("");
  const [isFatherDeceased, setIsFatherDeceased] = useState(false);
  const [isMotherDeceased, setIsMotherDeceased] = useState(false);
  const [persons, setPersons] = useState([]);
  const [selectedPerson, setSelectedPerson] = useState(null);

  const [person, setPerson] = useState({
    solo_parent: "", father_deceased: "", father_family_name: "", father_given_name: "",
    father_middle_name: "", father_ext: "", father_nickname: "", father_education: "",
    father_education_level: "", father_last_school: "", father_course: "",
    father_year_graduated: "", father_school_address: "", father_contact: "",
    father_occupation: "", father_employer: "", father_income: "", father_email: "",
    mother_deceased: "", mother_family_name: "", mother_given_name: "",
    mother_middle_name: "", mother_ext: "", mother_nickname: "", mother_education: "",
    mother_education_level: "", mother_last_school: "", mother_course: "",
    mother_year_graduated: "", mother_school_address: "", mother_contact: "",
    mother_occupation: "", mother_employer: "", mother_income: "", mother_email: "",
    guardian: "", guardian_family_name: "", guardian_given_name: "",
    guardian_middle_name: "", guardian_ext: "", guardian_nickname: "",
    guardian_address: "", guardian_contact: "", guardian_email: "", annual_income: "", has_no_siblings: 0,
    siblings: [],
  });

  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const queryPersonId = queryParams.get("person_id");
  const queryStudentNumber = sessionStorage.getItem("student_number");

  // ── canEdit wrapper — reads userRole from state ───────────────────────────
  const canEdit = (fieldId) => canEditField(fieldId, userRole);

  // ── LockedBadge component ─────────────────────────────────────────────────
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
  const lockedSx = { backgroundColor: "#f5f5f5" };

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
      } catch (err) { console.error("❌ Failed to fetch person_id:", err); }
    };
    fetchPersonId();
  }, [queryStudentNumber]);

  useEffect(() => {
    const storedUser = localStorage.getItem("email");
    const storedRole = localStorage.getItem("role");
    const loggedInPersonId = localStorage.getItem("person_id");
    const searchedPersonId = sessionStorage.getItem("student_edit_person_id");
    if (!storedUser || !storedRole || !loggedInPersonId) { window.location.href = "/login"; return; }
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


  const fetchByPersonId = async (personID) => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/enrollment_person/${personID}`);
      const safePerson = normalizePersonSiblings(res.data);
      setPerson(safePerson);
      setSelectedPerson(safePerson);
    } catch (err) { console.error("❌ person fetch failed:", err); }
  };

  useEffect(() => {
    let consumedFlag = false;
    const tryLoad = async () => {
      if (queryPersonId) { await fetchByPersonId(queryPersonId); setExplicitSelection(true); consumedFlag = true; return; }
      const source = sessionStorage.getItem("student_edit_person_id_source");
      const tsStr = sessionStorage.getItem("student_edit_person_id_ts");
      const id = sessionStorage.getItem("student_edit_person_id");
      const ts = tsStr ? parseInt(tsStr, 10) : 0;
      const isFresh = source === "applicant_list" && Date.now() - ts < 5 * 60 * 1000;
      if (id && isFresh) { await fetchByPersonId(id); setExplicitSelection(true); consumedFlag = true; }
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
        if (res.data) {
          const safePerson = normalizePersonSiblings(res.data);
          setPerson(safePerson);
          setSelectedPerson(safePerson);
        }
      } catch (err) { console.error("❌ Failed to fetch person by ID:", err); }
    };
    fetchPersonById();
  }, [userID]);

  useEffect(() => {
    const fetchPersons = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/api/enrollment_upload_documents`);
        setPersons(res.data);
      } catch (err) { console.error("❌ Failed to fetch persons list", err); }
    };
    fetchPersons();
  }, []);

  useEffect(() => { setIsFatherDeceased(person.father_deceased === 1); }, [person.father_deceased]);
  useEffect(() => { setIsMotherDeceased(person.mother_deceased === 1); }, [person.mother_deceased]);

  useEffect(() => {
    if (person.parent_type === "Mother") {
      setPerson((prev) => ({ ...prev, father_deceased: 1, mother_deceased: 0 }));
    } else if (person.parent_type === "Father") {
      setPerson((prev) => ({ ...prev, mother_deceased: 1, father_deceased: 0 }));
    }
  }, [person.parent_type]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleUpdate = async (updatedData) => {
    try {
      const { person_id, created_at, current_step, ...cleanPayload } = updatedData;
      await axios.put(`${API_BASE_URL}/api/enrollment/person/${userID}`, cleanPayload);
    } catch (err) { console.error("Real-time update failed", err); }
  };

  const handleBlur = async () => {
    try {
      const { person_id, created_at, current_step, ...cleanPayload } = person;
      await axios.put(`${API_BASE_URL}/api/enrollment/person/${userID}`, cleanPayload);
    } catch (err) { console.error("Auto-save failed", err); }
  };

  const handleCloseSnackbar = (event, reason) => {
    if (reason === "clickaway") return;
    setSnackbar((prev) => ({ ...prev, open: false }));
  };

  const handleChange = (e) => {
    const { name, type, checked, value } = e.target;
    const updatedPerson = { ...person, [name]: type === "checkbox" ? (checked ? 1 : 0) : value };
    if (name === "mother_income" || name === "father_income") {
      const motherIncome = parseFloat(name === "mother_income" ? value : updatedPerson.mother_income) || 0;
      const fatherIncome = parseFloat(name === "father_income" ? value : updatedPerson.father_income) || 0;
      const totalIncome = motherIncome + fatherIncome;
      let bracket = "";
      if (totalIncome <= 80000) bracket = "80,000 and below";
      else if (totalIncome <= 135000) bracket = "80,000 to 135,000";
      else if (totalIncome <= 250000) bracket = "135,000 to 250,000";
      else if (totalIncome <= 500000) bracket = "250,000 to 500,000";
      else if (totalIncome <= 1000000) bracket = "500,000 to 1,000,000";
      else bracket = "1,000,000 and above";
      updatedPerson.annual_income = bracket;
    }
    setPerson(updatedPerson);
    handleUpdate(updatedPerson);
  };

  const handleGuardianChange = (e) => {
    const { value } = e.target;
    let updatedPerson = { ...person, guardian: value };
    if (value === "Father") {
      updatedPerson = { ...updatedPerson, guardian_family_name: person.father_family_name || "", guardian_given_name: person.father_given_name || "", guardian_middle_name: person.father_middle_name || "", guardian_ext: person.father_ext || "", guardian_nickname: person.father_nickname || "", guardian_contact: person.father_contact || "", guardian_email: person.father_email || "" };
    }
    if (value === "Mother") {
      updatedPerson = { ...updatedPerson, guardian_family_name: person.mother_family_name || "", guardian_given_name: person.mother_given_name || "", guardian_middle_name: person.mother_middle_name || "", guardian_ext: person.mother_ext || "", guardian_nickname: person.mother_nickname || "", guardian_contact: person.mother_contact || "", guardian_email: person.mother_email || "" };
    }
    setPerson(updatedPerson);
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

  const isFormValid = () => {
    const requiredFields = [];
    if (person.father_deceased !== 1) {
      requiredFields.push("father_family_name", "father_given_name", "father_contact", "father_occupation", "father_employer", "father_income");
      if (person.father_education !== 1) {
        requiredFields.push("father_education_level", "father_last_school", "father_course", "father_year_graduated", "father_school_address");
      }
    }
    if (person.mother_deceased !== 1) {
      requiredFields.push("mother_family_name", "mother_given_name", "mother_contact", "mother_occupation", "mother_employer", "mother_income");
      if (person.mother_education !== 1) {
        requiredFields.push("mother_education_level", "mother_last_school", "mother_course", "mother_year_graduated", "mother_school_address");
      }
    }
    requiredFields.push("guardian", "guardian_family_name", "guardian_given_name", "guardian_address", "guardian_contact", "annual_income");
    let newErrors = {};
    let isValid = true;
    requiredFields.forEach((field) => {
      if (!person[field]?.toString().trim()) { newErrors[field] = true; isValid = false; }
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

  const steps = [
    { label: "Personal Information", icon: <PersonIcon />, path: `/student_personal_information` },
    { label: "Family Background", icon: <FamilyRestroomIcon />, path: `/student_family_background` },
    { label: "Educational Attainment", icon: <SchoolIcon />, path: `/student_educational_attainment` },
    { label: "Health Medical Records", icon: <HealthAndSafetyIcon />, path: `/student_health_medical_records` },
    { label: "Other Information", icon: <InfoIcon />, path: `/student_other_information` },

  ];

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
        <Typography variant="h4" sx={{ fontWeight: "bold", color: titleColor, fontSize: "36px" }}>FAMILY BACKGROUND</Typography>
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


      <h1 style={{ fontSize: "30px", fontWeight: "bold", textAlign: "center", color: "black", marginTop: "25px" }}>PRINTABLE DOCUMENTS</h1>
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
              <Typography style={{ fontSize: "20px", padding: "10px", fontFamily: "Poppins, sans-serif" }}>Step 2: Family Background</Typography>
            </Box>
          </Container>

          <Container maxWidth="100%" sx={{ backgroundColor: "#f1f1f1", border: `1px solid ${borderColor}`, padding: 4, borderRadius: 2, boxShadow: 3 }}>
            <Typography style={{ fontSize: "20px", color: mainButtonColor, fontWeight: "bold" }}>Family Background:</Typography>
            <hr style={{ border: "1px solid #ccc", width: "100%" }} /><br />

            {/* Solo Parent */}
            <Box display="flex" gap={3} width="100%" alignItems="center">
              <Box marginTop="10px" display="flex" alignItems="center" gap={1}>
                <Checkbox
                  name="solo_parent"
                  checked={person.solo_parent === 1}
                  disabled={!canEdit("solo_parent")}
                  onChange={(e) => {
                    if (!canEdit("solo_parent")) return;
                    const checked = e.target.checked;
                    const newPerson = { ...person, solo_parent: checked ? 1 : 0, father_deceased: checked && soloParentChoice === "Mother" ? 1 : checked ? 0 : null, mother_deceased: checked && soloParentChoice === "Father" ? 1 : checked ? 0 : null };
                    setPerson(newPerson);
                    handleUpdate(newPerson);
                  }}
                  onBlur={handleBlur}
                  sx={{ width: 25, height: 25 }}
                />
                <label style={{ fontFamily: "Poppins, sans-serif" }}>
                  Solo Parent
                  {!canEdit("solo_parent") && <LockedBadge />}
                </label>
              </Box>
              {person.solo_parent === 1 && (
                <FormControl size="small" style={{ width: "200px" }}>
                  <InputLabel id="parent-select-label">- Parent -</InputLabel>
                  <Select labelId="parent-select-label" value={soloParentChoice}
                    onChange={(e) => {
                      if (!canEdit("solo_parent")) return;
                      const choice = e.target.value;
                      setSoloParentChoice(choice);
                      const updatedPerson = { ...person, father_deceased: choice === "Mother" ? 1 : 0, mother_deceased: choice === "Father" ? 1 : 0 };
                      setPerson(updatedPerson);
                      handleUpdate(updatedPerson);
                    }}
                    inputProps={{ readOnly: !canEdit("solo_parent") }}
                  >
                    <MenuItem value="Father">Father</MenuItem>
                    <MenuItem value="Mother">Mother</MenuItem>
                  </Select>
                </FormControl>
              )}
            </Box>
            <br />

            {/* ════ FATHER'S DETAILS ════ */}
            <Typography style={{ fontSize: "20px", color: mainButtonColor, fontWeight: "bold" }}>Father's Details</Typography>
            <hr style={{ border: "1px solid #ccc", width: "100%" }} /><br />
            <Box sx={{ mb: 2 }}>
              <FormControlLabel
                control={
                  <Checkbox name="father_deceased" checked={person.father_deceased === 1}
                    onChange={(e) => { const checked = e.target.checked; handleChange(e); setPerson((prev) => ({ ...prev, father_deceased: checked ? 1 : 0 })); }}
                    onBlur={handleBlur}
                  />
                }
                label="Father Separated / Deceased"
              />
              <br />
              {!isFatherDeceased && (
                <>
                  {/* Father Name Row */}
                  <Box sx={{ display: "flex", gap: 2, mt: 2 }}>
                    {/* father_family_name — system-locked */}
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="subtitle2" mb={1}>Father Last Name <span style={{ color: "red" }}>*</span></Typography>
                      <TextField fullWidth size="small" name="father_family_name" value={person.father_family_name ?? ""} placeholder="Enter Father Last Name" InputProps={{ readOnly: true, sx: { textTransform: "uppercase" } }} sx={lockedSx} onChange={handleChange} onBlur={handleBlur} error={errors.father_family_name} helperText={errors.father_family_name ? "This field is required." : ""} />
                    </Box>
                    {/* father_given_name — system-locked */}
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="subtitle2" mb={1}>Father Given Name <span style={{ color: "red" }}>*</span></Typography>
                      <TextField fullWidth size="small" name="father_given_name" value={person.father_given_name ?? ""} placeholder="Enter Father First Name" InputProps={{ readOnly: true, sx: { textTransform: "uppercase" } }} sx={lockedSx} onChange={handleChange} onBlur={handleBlur} error={errors.father_given_name} helperText={errors.father_given_name ? "This field is required." : ""} />
                    </Box>
                    {/* father_middle_name — system-locked */}
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="subtitle2" mb={1}>Father Middle Name</Typography>
                      <TextField fullWidth size="small" name="father_middle_name" value={person.father_middle_name ?? ""} placeholder="Enter Father Middle Name" InputProps={{ readOnly: true, sx: { textTransform: "uppercase" } }} sx={lockedSx} onChange={handleChange} onBlur={handleBlur} />
                    </Box>
                    {/* father_ext — admin-controlled */}
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="subtitle2" mb={1}>
                        Father Extension
                        {!canEdit("father_ext") && <LockedBadge />}
                      </Typography>
                      <FormControl fullWidth size="small" error={!!errors.father_ext}>
                        <InputLabel id="father-ext-label">Extension</InputLabel>
                        <Select labelId="father-ext-label" name="father_ext" value={person.father_ext || ""} label="Extension" onChange={canEdit("father_ext") ? handleChange : undefined} inputProps={{ readOnly: !canEdit("father_ext") }} onBlur={handleBlur} sx={!canEdit("father_ext") ? lockedSx : {}}>
                          <MenuItem value=""><em>Select Extension</em></MenuItem>
                          {["Jr.", "Sr.", "I", "II", "III", "IV", "V"].map(v => <MenuItem key={v} value={v}>{v}</MenuItem>)}
                        </Select>
                      </FormControl>
                    </Box>
                    {/* father_nickname — admin-controlled */}
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="subtitle2" mb={1}>
                        Father Nickname
                        {!canEdit("father_nickname") && <LockedBadge />}
                      </Typography>
                      <TextField fullWidth size="small" name="father_nickname" value={person.father_nickname ?? ""} placeholder="Enter Father Nickname" InputProps={{ readOnly: !canEdit("father_nickname") }} sx={!canEdit("father_nickname") ? lockedSx : {}} onChange={handleChange} onBlur={handleBlur} />
                    </Box>
                  </Box>

                  {/* Father Education */}
                  <Typography sx={{ fontSize: "20px", color: mainButtonColor, fontWeight: "bold", mt: 3 }}>Father's Educational Background</Typography>
                  <hr style={{ border: "1px solid #ccc", width: "100%" }} /><br />
                  <Box display="flex" gap={3} alignItems="center">
                    <Checkbox name="father_education" checked={person.father_education === 1}
                      onChange={(e) => {
                        const isChecked = e.target.checked;
                        const updatedPerson = { ...person, father_education: isChecked ? 1 : 0, ...(isChecked ? { father_education_level: "", father_last_school: "", father_course: "", father_year_graduated: "", father_school_address: "" } : {}) };
                        setPerson(updatedPerson); handleUpdate(updatedPerson);
                      }}
                      onBlur={handleBlur} sx={{ width: 25, height: 25 }}
                    />
                    <label style={{ fontFamily: "Poppins, sans-serif" }}>Father's education not applicable</label>
                  </Box>

                  {person.father_education !== 1 && (
                    <Box sx={{ display: "flex", gap: 2, mt: 2, flexWrap: "wrap" }}>
                      {[
                        { name: "father_education_level", label: "Father Education Level" },
                        { name: "father_last_school", label: "Father Last School" },
                        { name: "father_course", label: "Father Course" },
                        { name: "father_year_graduated", label: "Father Year Graduated", type: "number" },
                        { name: "father_school_address", label: "Father School Address" },
                      ].map(({ name, label, type }) => (
                        <Box key={name} sx={{ flex: 1 }}>
                          <Typography variant="subtitle2" mb={1}>
                            {label} <span style={{ color: "red" }}>*</span>
                            {!canEdit(name) && <LockedBadge />}
                          </Typography>
                          <TextField fullWidth size="small" name={name} type={type || "text"} value={person[name] ?? ""} placeholder={`Enter ${label}`} InputProps={{ readOnly: !canEdit(name) }} sx={!canEdit(name) ? lockedSx : {}} onChange={handleChange} onBlur={handleBlur} error={errors[name]} helperText={errors[name] ? "This field is required." : ""} />
                        </Box>
                      ))}
                    </Box>
                  )}

                  {/* Father Contact Info */}
                  <Typography sx={{ fontSize: "20px", color: mainButtonColor, fontWeight: "bold", mt: 3 }}>Father's Contact Information</Typography>
                  <hr style={{ border: "1px solid #ccc", width: "100%" }} /><br />
                  <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
                    {/* father_contact */}
                    <Box flex={1} display="flex" flexDirection="column">
                      <Typography variant="subtitle2" mb={0.5}>
                        Father Contact <span style={{ color: "red" }}>*</span>
                        {!canEdit("father_contact") && <LockedBadge />}
                      </Typography>
                      <TextField fullWidth size="small" name="father_contact" placeholder="9XXXXXXXXX" value={person.father_contact || ""} onBlur={() => handleUpdate(person)} onChange={(e) => { if (!canEdit("father_contact")) return; handleChange({ target: { name: "father_contact", value: e.target.value.replace(/\D/g, "") } }); }} error={!!errors.father_contact} helperText={errors.father_contact && "This field is required."} InputProps={{ readOnly: !canEdit("father_contact"), startAdornment: <Typography sx={{ mr: 1, fontWeight: "bold" }}>+63</Typography> }} sx={!canEdit("father_contact") ? lockedSx : {}} />
                    </Box>
                    {/* father_occupation */}
                    <Box flex={1}>
                      <Typography variant="subtitle2" mb={0.5}>
                        Father Occupation <span style={{ color: "red" }}>*</span>
                        {!canEdit("father_occupation") && <LockedBadge />}
                      </Typography>
                      <TextField fullWidth size="small" name="father_occupation" value={person.father_occupation || ""} placeholder="Enter Father Occupation" InputProps={{ readOnly: !canEdit("father_occupation") }} sx={!canEdit("father_occupation") ? lockedSx : {}} onChange={handleChange} onBlur={() => handleUpdate(person)} error={errors.father_occupation} helperText={errors.father_occupation ? "This field is required." : ""} />
                    </Box>
                    {/* father_employer */}
                    <Box flex={1}>
                      <Typography variant="subtitle2" mb={0.5}>
                        Father Employer <span style={{ color: "red" }}>*</span>
                        {!canEdit("father_employer") && <LockedBadge />}
                      </Typography>
                      <TextField fullWidth size="small" name="father_employer" value={person.father_employer || ""} placeholder="Enter Father Employer" InputProps={{ readOnly: !canEdit("father_employer") }} sx={!canEdit("father_employer") ? lockedSx : {}} onChange={handleChange} onBlur={() => handleUpdate(person)} error={errors.father_employer} helperText={errors.father_employer ? "This field is required." : ""} />
                    </Box>
                    {/* father_income */}
                    <Box flex={1}>
                      <Typography variant="subtitle2" mb={0.5}>
                        Father Income <span style={{ color: "red" }}>*</span>
                        {!canEdit("father_income") && <LockedBadge />}
                      </Typography>
                      <TextField fullWidth size="small" name="father_income" value={person.father_income || ""} placeholder="Enter Father Income" InputProps={{ readOnly: !canEdit("father_income") }} sx={!canEdit("father_income") ? lockedSx : {}} onChange={(e) => { if (!canEdit("father_income")) return; handleChange({ target: { name: "father_income", value: e.target.value.replace(/\D/g, "") } }); }} onBlur={() => handleUpdate(person)} error={errors.father_income} helperText={errors.father_income ? "This field is required." : ""} />
                    </Box>
                  </Box>
                  {/* father_email */}
                  <Box flex={1}>
                    <Typography variant="subtitle2" mb={0.5}>
                      Father Email Address
                      {!canEdit("father_email") && <LockedBadge />}
                    </Typography>
                    <TextField fullWidth size="small" name="father_email" value={person.father_email || ""} placeholder="Enter Father Email Address" InputProps={{ readOnly: !canEdit("father_email") }} sx={!canEdit("father_email") ? lockedSx : {}}
                      onChange={(e) => { if (!canEdit("father_email")) return; handleChange({ target: { name: "father_email", value: e.target.value.replace(/\s/g, "") } }); }}
                      onBlur={(e) => { if (!canEdit("father_email")) return; let value = e.target.value.trim(); if (value && !value.includes("@")) value += "@gmail.com"; handleChange({ target: { name: "father_email", value } }); handleUpdate(person); }}
                    />
                  </Box>
                </>
              )}
            </Box>

            {/* ════ MOTHER'S DETAILS ════ */}
            <Typography style={{ fontSize: "20px", color: mainButtonColor, fontWeight: "bold" }}>Mother's Details</Typography>
            <hr style={{ border: "1px solid #ccc", width: "100%" }} /><br />
            <Box sx={{ mb: 2 }}>
              <FormControlLabel
                control={
                  <Checkbox name="mother_deceased" checked={person.mother_deceased === 1}
                    onChange={(e) => { const checked = e.target.checked; handleChange(e); setPerson((prev) => ({ ...prev, mother_deceased: checked ? 1 : 0 })); }}
                    onBlur={handleBlur}
                  />
                }
                label="Mother Separated / Deceased"
              />
              <br />
              {!isMotherDeceased && (
                <>
                  <Box sx={{ display: "flex", gap: 2, mt: 2 }}>
                    {/* mother_family_name — system-locked */}
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="subtitle2" mb={1}>Mother Last Name <span style={{ color: "red" }}>*</span></Typography>
                      <TextField fullWidth size="small" name="mother_family_name" value={person.mother_family_name ?? ""} placeholder="Enter Mother Last Name" InputProps={{ readOnly: true, sx: { textTransform: "uppercase" } }} sx={lockedSx} onChange={handleChange} onBlur={handleBlur} error={errors.mother_family_name} helperText={errors.mother_family_name ? "This field is required." : ""} />
                    </Box>
                    {/* mother_given_name — system-locked */}
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="subtitle2" mb={1}>Mother First Name <span style={{ color: "red" }}>*</span></Typography>
                      <TextField fullWidth size="small" name="mother_given_name" value={person.mother_given_name ?? ""} placeholder="Enter Mother First Name" InputProps={{ readOnly: true, sx: { textTransform: "uppercase" } }} sx={lockedSx} onChange={handleChange} onBlur={handleBlur} error={errors.mother_given_name} helperText={errors.mother_given_name ? "This field is required." : ""} />
                    </Box>
                    {/* mother_middle_name — system-locked */}
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="subtitle2" mb={1}>Mother Middle Name</Typography>
                      <TextField fullWidth size="small" name="mother_middle_name" value={person.mother_middle_name ?? ""} placeholder="Enter Mother Middle Name" InputProps={{ readOnly: true, sx: { textTransform: "uppercase" } }} sx={lockedSx} onChange={handleChange} onBlur={handleBlur} />
                    </Box>
                    {/* mother_ext — admin-controlled */}
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="subtitle2" mb={1}>
                        Mother Extension
                        {!canEdit("mother_ext") && <LockedBadge />}
                      </Typography>
                      <FormControl fullWidth size="small">
                        <InputLabel id="mother-ext-label">Extension</InputLabel>
                        <Select labelId="mother-ext-label" name="mother_ext" value={person.mother_ext || ""} label="Extension" onChange={canEdit("mother_ext") ? handleChange : undefined} inputProps={{ readOnly: !canEdit("mother_ext") }} onBlur={handleBlur} sx={!canEdit("mother_ext") ? lockedSx : {}}>
                          <MenuItem value=""><em>Select Extension</em></MenuItem>
                          {["Jr.", "Sr.", "I", "II", "III", "IV", "V"].map(v => <MenuItem key={v} value={v}>{v}</MenuItem>)}
                        </Select>
                      </FormControl>
                    </Box>
                    {/* mother_nickname — admin-controlled */}
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="subtitle2" mb={1}>
                        Mother Nickname
                        {!canEdit("mother_nickname") && <LockedBadge />}
                      </Typography>
                      <TextField fullWidth size="small" name="mother_nickname" value={person.mother_nickname ?? ""} placeholder="Enter Mother Nickname" InputProps={{ readOnly: !canEdit("mother_nickname") }} sx={!canEdit("mother_nickname") ? lockedSx : {}} onChange={handleChange} onBlur={handleBlur} />
                    </Box>
                  </Box>

                  {/* Mother Education */}
                  <Typography sx={{ fontSize: "20px", color: mainButtonColor, fontWeight: "bold", mt: 3 }}>Mother's Educational Background</Typography>
                  <hr style={{ border: "1px solid #ccc", width: "100%" }} /><br />
                  <Box display="flex" gap={3} alignItems="center">
                    <Checkbox name="mother_education" checked={person.mother_education === 1}
                      onChange={(e) => {
                        const isChecked = e.target.checked;
                        const updatedPerson = { ...person, mother_education: isChecked ? 1 : 0, ...(isChecked ? { mother_education_level: "", mother_last_school: "", mother_course: "", mother_year_graduated: "", mother_school_address: "" } : {}) };
                        setPerson(updatedPerson); handleUpdate(updatedPerson);
                      }}
                      onBlur={handleBlur} sx={{ width: 25, height: 25 }}
                    />
                    <label style={{ fontFamily: "Poppins, sans-serif" }}>Mother's education not applicable</label>
                  </Box>

                  {person.mother_education !== 1 && (
                    <Box sx={{ display: "flex", gap: 2, mt: 2, flexWrap: "wrap" }}>
                      {[
                        { name: "mother_education_level", label: "Mother Education Level" },
                        { name: "mother_last_school", label: "Mother Last School" },
                        { name: "mother_course", label: "Mother Course" },
                        { name: "mother_year_graduated", label: "Mother Year Graduated", type: "number" },
                        { name: "mother_school_address", label: "Mother School Address" },
                      ].map(({ name, label, type }) => (
                        <Box key={name} sx={{ flex: 1 }}>
                          <Typography variant="subtitle2" mb={1}>
                            {label} <span style={{ color: "red" }}>*</span>
                            {!canEdit(name) && <LockedBadge />}
                          </Typography>
                          <TextField fullWidth size="small" name={name} type={type || "text"} value={person[name] ?? ""} placeholder={`Enter ${label}`} InputProps={{ readOnly: !canEdit(name) }} sx={!canEdit(name) ? lockedSx : {}} onChange={handleChange} onBlur={handleBlur} error={errors[name]} helperText={errors[name] ? "This field is required." : ""} />
                        </Box>
                      ))}
                    </Box>
                  )}

                  {/* Mother Contact Info */}
                  <Typography sx={{ fontSize: "20px", color: mainButtonColor, fontWeight: "bold", mt: 3 }}>Mother's Contact Information</Typography>
                  <hr style={{ border: "1px solid #ccc", width: "100%" }} /><br />
                  <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
                    {[
                      { name: "mother_contact", label: "Mother Contact", required: true },
                      { name: "mother_occupation", label: "Mother Occupation", required: true },
                      { name: "mother_employer", label: "Mother Employer", required: true },
                      { name: "mother_income", label: "Mother Income", required: true },
                    ].map(({ name, label, required }) => (
                      <Box key={name} sx={{ flex: 1 }}>
                        <Typography variant="subtitle2" mb={0.5}>
                          {label} {required && <span style={{ color: "red" }}>*</span>}
                          {!canEdit(name) && <LockedBadge />}
                        </Typography>
                        <TextField fullWidth size="small" name={name} value={person[name] ?? ""} placeholder={`Enter ${label}`} InputProps={{ readOnly: !canEdit(name) }} sx={!canEdit(name) ? lockedSx : {}} onChange={handleChange} onBlur={handleBlur} error={errors[name]} helperText={errors[name] ? "This field is required." : ""} />
                      </Box>
                    ))}
                  </Box>
                  {/* mother_email */}
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" mb={1}>
                      Mother Email
                      {!canEdit("mother_email") && <LockedBadge />}
                    </Typography>
                    <TextField fullWidth size="small" name="mother_email" value={person.mother_email ?? ""} placeholder="Enter Mother Email Address" InputProps={{ readOnly: !canEdit("mother_email") }} sx={!canEdit("mother_email") ? lockedSx : {}} onChange={handleChange} onBlur={handleBlur} />
                  </Box>
                </>
              )}
            </Box>

            {/* ════ GUARDIAN ════ */}
            <Typography style={{ fontSize: "20px", color: mainButtonColor, fontWeight: "bold" }}>In Case of Emergency</Typography>
            <hr style={{ border: "1px solid #ccc", width: "100%" }} /><br />

            <Box sx={{ flex: 1 }}>
              <Typography variant="subtitle2" mb={1}>
                Guardian
                {!canEdit("guardian") && <LockedBadge />}
              </Typography>
              <FormControl style={{ marginBottom: "10px", width: "200px" }} size="small" required error={!!errors.guardian}>
                <InputLabel id="guardian-label">Guardian</InputLabel>
                <Select labelId="guardian-label" name="guardian" value={person.guardian || ""} label="Guardian" onChange={canEdit("guardian") ? handleGuardianChange : undefined} inputProps={{ readOnly: !canEdit("guardian") }} onBlur={handleBlur} sx={!canEdit("guardian") ? lockedSx : {}}>
                  <MenuItem value=""><em>Select Guardian</em></MenuItem>
                  {["Father", "Mother", "Brother/Sister", "Uncle", "Aunt", "StepFather", "StepMother", "Cousin", "Father in Law", "Mother in Law", "Sister in Law", "GrandMother", "GrandFather", "Spouse", "Others"].map(v => <MenuItem key={v} value={v}>{v}</MenuItem>)}
                </Select>
                {errors.guardian && <FormHelperText>This field is required.</FormHelperText>}
              </FormControl>
            </Box>

            <Box sx={{ display: "flex", gap: 2, mb: 2, flexWrap: "nowrap" }}>
              {/* guardian_family_name — system-locked */}
              <Box sx={{ flex: 1 }}>
                <Typography variant="subtitle2" mb={1}>Guardian Last Name <span style={{ color: "red" }}>*</span></Typography>
                <TextField fullWidth size="small" name="guardian_family_name" value={person.guardian_family_name ?? ""} placeholder="Enter Guardian Family Name" InputProps={{ readOnly: true, sx: { textTransform: "uppercase" } }} sx={lockedSx} onChange={handleChange} onBlur={handleBlur} error={!!errors.guardian_family_name} helperText={errors.guardian_family_name ? "This field is required." : ""} />
              </Box>
              {/* guardian_given_name — system-locked */}
              <Box sx={{ flex: 1 }}>
                <Typography variant="subtitle2" mb={1}>Guardian First Name <span style={{ color: "red" }}>*</span></Typography>
                <TextField fullWidth size="small" name="guardian_given_name" value={person.guardian_given_name ?? ""} placeholder="Enter Guardian First Name" InputProps={{ readOnly: true, sx: { textTransform: "uppercase" } }} sx={lockedSx} onChange={handleChange} onBlur={handleBlur} error={!!errors.guardian_given_name} helperText={errors.guardian_given_name ? "This field is required." : ""} />
              </Box>
              {/* guardian_middle_name — system-locked */}
              <Box sx={{ flex: 1 }}>
                <Typography variant="subtitle2" mb={1}>Guardian Middle Name</Typography>
                <TextField fullWidth size="small" name="guardian_middle_name" value={person.guardian_middle_name ?? ""} placeholder="Enter Guardian Middle Name" InputProps={{ readOnly: true, sx: { textTransform: "uppercase" } }} sx={lockedSx} onChange={handleChange} onBlur={handleBlur} />
              </Box>
              {/* guardian_ext — admin-controlled */}
              <Box sx={{ flex: 1 }}>
                <Typography variant="subtitle2" mb={1}>
                  Guardian Name Extension
                  {!canEdit("guardian_ext") && <LockedBadge />}
                </Typography>
                <FormControl fullWidth size="small" error={!!errors.guardian_ext}>
                  <InputLabel id="guardian-ext-label">Extension</InputLabel>
                  <Select labelId="guardian-ext-label" name="guardian_ext" value={person.guardian_ext || ""} label="Extension" onChange={canEdit("guardian_ext") ? handleChange : undefined} inputProps={{ readOnly: !canEdit("guardian_ext") }} onBlur={handleBlur} sx={!canEdit("guardian_ext") ? lockedSx : {}}>
                    <MenuItem value=""><em>Select Extension</em></MenuItem>
                    {["Jr.", "Sr.", "I", "II", "III", "IV", "V"].map(v => <MenuItem key={v} value={v}>{v}</MenuItem>)}
                  </Select>
                </FormControl>
              </Box>
              {/* guardian_nickname — admin-controlled */}
              <Box sx={{ flex: 1 }}>
                <Typography variant="subtitle2" mb={1}>
                  Guardian Nickname
                  {!canEdit("guardian_nickname") && <LockedBadge />}
                </Typography>
                <TextField fullWidth size="small" name="guardian_nickname" value={person.guardian_nickname ?? ""} placeholder="Enter Guardian Nickname" InputProps={{ readOnly: !canEdit("guardian_nickname") }} sx={!canEdit("guardian_nickname") ? lockedSx : {}} onChange={handleChange} onBlur={handleBlur} />
              </Box>
            </Box>

            {/* Guardian Contact Info */}
            <Typography style={{ fontSize: "20px", color: mainButtonColor, fontWeight: "bold" }}>Guardian's Contact Information</Typography>
            <hr style={{ border: "1px solid #ccc", width: "100%" }} /><br />

            <Box sx={{ width: "100%", mb: 2 }}>
              <Typography variant="subtitle2" mb={1}>
                Guardian Address <span style={{ color: "red" }}>*</span>
                {!canEdit("guardian_address") && <LockedBadge />}
              </Typography>
              <TextField fullWidth size="small" name="guardian_address" value={person.guardian_address ?? ""} placeholder="Enter Guardian Address" InputProps={{ readOnly: !canEdit("guardian_address") }} sx={!canEdit("guardian_address") ? lockedSx : {}} onChange={handleChange} onBlur={handleBlur} error={errors.guardian_address} helperText={errors.guardian_address ? "This field is required." : ""} />
            </Box>

            <Box sx={{ display: "flex", gap: 2, mb: 2, flexWrap: "wrap" }}>
              <Box sx={{ flex: 1 }}>
                <Typography variant="subtitle2" mb={1}>
                  Guardian Contact <span style={{ color: "red" }}>*</span>
                  {!canEdit("guardian_contact") && <LockedBadge />}
                </Typography>
                <TextField fullWidth size="small" name="guardian_contact" value={person.guardian_contact ?? ""} placeholder="Enter Guardian Contact Number" InputProps={{ readOnly: !canEdit("guardian_contact") }} sx={!canEdit("guardian_contact") ? lockedSx : {}} onChange={handleChange} onBlur={handleBlur} error={errors.guardian_contact} helperText={errors.guardian_contact ? "This field is required." : ""} />
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography variant="subtitle2" mb={1}>
                  Guardian Email
                  {!canEdit("guardian_email") && <LockedBadge />}
                </Typography>
                <TextField fullWidth size="small" name="guardian_email" value={person.guardian_email ?? ""} placeholder="Enter Guardian Email Address" InputProps={{ readOnly: !canEdit("guardian_email") }} sx={!canEdit("guardian_email") ? lockedSx : {}} onChange={handleChange} onBlur={handleBlur} />
              </Box>
            </Box>

            {/* Annual Income */}
            <Typography style={{ fontSize: "20px", color: mainButtonColor, fontWeight: "bold" }}>Family (Annual Income)</Typography>
            <hr style={{ border: "1px solid #ccc", width: "100%" }} /><br />
            <Box sx={{ width: "100%", mb: 2 }}>
              <Typography variant="subtitle2" mb={1}>
                Annual Income <span style={{ color: "red" }}>*</span>
                {!canEdit("annual_income") && <LockedBadge />}
              </Typography>
              <FormControl fullWidth size="small" required error={!!errors.annual_income}>
                <InputLabel id="annual-income-label">Annual Income</InputLabel>
                <Select labelId="annual-income-label" name="annual_income" value={person.annual_income || ""} label="Annual Income" onChange={canEdit("annual_income") ? handleChange : undefined} inputProps={{ readOnly: !canEdit("annual_income") }} onBlur={handleBlur} sx={!canEdit("annual_income") ? lockedSx : {}}>
                  <MenuItem value=""><em>Select Annual Income</em></MenuItem>
                  {["80,000 and below", "80,000 to 135,000", "135,000 to 250,000", "250,000 to 500,000", "500,000 to 1,000,000", "1,000,000 and above"].map(v => <MenuItem key={v} value={v}>{v}</MenuItem>)}
                </Select>
                {errors.annual_income && <FormHelperText>This field is required.</FormHelperText>}
              </FormControl>
            </Box>

            {/* ════ SIBLINGS ════ */}
            <Typography style={{ fontSize: "20px", color: mainButtonColor, fontWeight: "bold" }}>
              Siblings (Mga Kapatid Mo)
            </Typography>
            <hr style={{ border: "1px solid #ccc", width: "100%" }} />
            <br />

            <FormControlLabel
              control={
                <Checkbox
                  checked={person.has_no_siblings === 1}
                  onChange={handleNoSiblingsCheck}
                  disabled={!canEdit("siblings")}
                />
              }
              label={
                <Box component="span" sx={{ display: "inline-flex", alignItems: "center" }}>
                  Check if there's no siblings
                  {!canEdit("siblings") && <LockedBadge />}
                </Box>
              }
            />
            <br /><br />

            {person.has_no_siblings !== 1 && (
              <>
                {(person.siblings || []).map((sibling, index) => (
                  <Box
                    key={sibling.id || index}
                    sx={{
                      border: `1px solid ${borderColor}`,
                      borderRadius: 2,
                      p: 2,
                      mb: 2,
                      backgroundColor: canEdit("siblings") ? "#fff" : "#f5f5f5",
                    }}
                  >
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                      <Typography fontWeight="bold">Sibling {index + 1}</Typography>
                      <Button
                        size="small" variant="outlined" color="error"
                        onClick={() => removeSibling(index)}
                        disabled={!canEdit("siblings")}
                        sx={{ minWidth: 36 }}
                      >
                        − Remove
                      </Button>
                    </Box>

                    <Box display="flex" gap={2} flexWrap="wrap" mb={2}>
                      {[
                        { key: "name", label: "Name of Sibling", basis: "30%", err: `sibling_name_${index}` },
                        { key: "age", label: "Age", basis: "10%", err: `sibling_age_${index}`, type: "number" },
                        { key: "schoolLevel", label: "School Level", basis: "20%" },
                        { key: "schoolLastAttended", label: "School Last Attended", basis: "30%" },
                        { key: "schoolAddress", label: "School Address", basis: "45%" },
                        { key: "occupation", label: "Occupation", basis: "25%" },
                        { key: "monthlyIncome", label: "Monthly Income", basis: "25%", type: "number" },
                      ].map(({ key, label, basis, err, type }) => (
                        <Box key={key} flex={`1 1 ${basis}`}>
                          <Typography variant="subtitle2" mb={0.5}>{label}</Typography>
                          <TextField
                            fullWidth size="small" type={type || "text"}
                            placeholder={`Enter ${label}`}
                            value={sibling[key] || ""}
                            onChange={(e) => handleSiblingFieldChange(index, key, e.target.value)}
                            onBlur={handleSiblingFieldBlur}
                            error={err ? errors[err] : undefined}
                            InputProps={{ readOnly: !canEdit("siblings") }}
                            sx={!canEdit("siblings") ? { backgroundColor: "#f5f5f5" } : {}}
                          />
                        </Box>
                      ))}
                    </Box>
                  </Box>
                ))}

                {canEdit("siblings") ? (
                  <Button variant="contained" onClick={addSibling}
                    sx={{ backgroundColor: mainButtonColor, border: `1px solid ${borderColor}`, color: "#fff", mb: 2, "&:hover": { backgroundColor: "#000" } }}>
                    + Add Sibling
                  </Button>
                ) : (
                  <Typography variant="body2" sx={{ color: "#c62828", display: "flex", alignItems: "center" }}>
                    <LockedBadge /> Siblings information is locked by admin.
                  </Typography>
                )}
              </>
            )}

            {/* Nav Buttons */}
            <Box display="flex" justifyContent="space-between" mt={4}>
              <Button variant="contained"
                onClick={async () => { await handleUpdate(person); setSnackbar({ open: true, message: "Your record has been saved successfully!", severity: "success" }); setTimeout(() => { navigate("/student_personal_information"); }, 1000); }}
                startIcon={<ArrowBackIcon sx={{ color: "#000", transition: "color 0.3s" }} />}
                sx={{ backgroundColor: subButtonColor, border: `1px solid ${borderColor}`, color: "#000", "&:hover": { backgroundColor: "#000000", color: "#fff", "& .MuiSvgIcon-root": { color: "#fff" } } }}
              >
                Previous Step
              </Button>
              <Button variant="contained"
                onClick={async () => { if (isFormValid()) { await handleUpdate(person); setSnackbar({ open: true, message: "Your record has been saved successfully!", severity: "success" }); setTimeout(() => { navigate("/student_educational_attainment"); }, 1000); } else { setSnackbar({ open: true, message: "Please complete all required fields before proceeding.", severity: "error" }); } }}
                endIcon={<ArrowForwardIcon sx={{ color: "#fff", transition: "color 0.3s" }} />}
                sx={{ backgroundColor: mainButtonColor, border: `1px solid ${borderColor}`, color: "#fff", "&:hover": { backgroundColor: "#000000", color: "#fff" } }}
              >
                Next Step
              </Button>
            </Box>

            <Snackbar open={snackbar.open} autoHideDuration={1000} onClose={handleCloseSnackbar} anchorOrigin={{ vertical: "top", horizontal: "center" }}>
              <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: "100%" }}>{snackbar.message}</Alert>
            </Snackbar>
          </Container>
        </form>
      </Container>
    </Box>
  );
};

export default StudentDashboard2;
