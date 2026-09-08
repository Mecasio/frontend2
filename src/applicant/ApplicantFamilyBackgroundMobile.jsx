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
  CircularProgress,
  Modal,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
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
import ExamPermit from "./ExamPermit";
import API_BASE_URL from "../apiConfig";
import PersonalDataForm from "./PersonalDataForm";
import OfficeOfTheRegistrar from "./OfficeOfTheRegistrar";
import AdmissionServices from "./ApplicantServicesSurvey";
import ECATApplicationForm from "./ECATApplicationForm";

// ─── Reusable field components (responsive) ──────────────────────────────────
const Field = ({ label, required, error, helperText, children }) => (
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
      </label>
    )}
    {children}
    {error && helperText && (
      <div style={{ color: "#d32f2f", fontSize: 11, marginTop: 3 }}>{helperText}</div>
    )}
  </div>
);

const baseControlStyle = (hasError) => ({
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
});

const MInput = ({ error, style, ...props }) => (
  <input style={{ ...baseControlStyle(error), ...style }} {...props} />
);

const MSelect = ({ error, style, children, ...props }) => (
  <select
    style={{
      ...baseControlStyle(error),
      appearance: "none",
      WebkitAppearance: "none",
      backgroundImage:
        "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%23666' stroke-width='1.5' fill='none'/%3E%3C/svg%3E\")",
      backgroundRepeat: "no-repeat",
      backgroundPosition: "right 12px center",
      paddingRight: 32,
      ...style,
    }}
    {...props}
  >
    {children}
  </select>
);

const CheckRow = ({ checked, onChange, children }) => (
  <label
    style={{
      display: "flex",
      alignItems: "center",
      gap: 8,
      marginBottom: 12,
      fontSize: "clamp(12px, 1.5vw, 14px)",
      color: "#333",
      cursor: "pointer",
    }}
  >
    <input
      type="checkbox"
      checked={checked}
      onChange={onChange}
      style={{ width: 18, height: 18, accentColor: "#6D2323", cursor: "pointer" }}
    />
    {children}
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

// ─── Main Component ───────────────────────────────────────────────────────────
const ApplicantFamilyBackgroundMobile = (props) => {
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

  // ── Person state ───────────────────────────────────────────────────────────
  const [person, setPerson] = useState({
    solo_parent: "",
    father_deceased: "",
    father_family_name: "",
    father_given_name: "",
    father_middle_name: "",
    father_ext: "",
    father_nickname: "",
    father_education: "",
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
    mother_deceased: "",
    mother_family_name: "",
    mother_given_name: "",
    mother_middle_name: "",
    mother_ext: "",
    mother_nickname: "",
    mother_education: "",
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

  // ── Auth & init (do not alter) ──────────────────────────────────────────────
  useEffect(() => {
    const storedUser = localStorage.getItem("email");
    const storedRole = localStorage.getItem("role");
    const storedID = localStorage.getItem("person_id");
    const keys = JSON.parse(localStorage.getItem("dashboardKeys") || "{}");
    if (keys.step2) {
      navigate(`/applicant_family_background/${keys.step2}`);
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

  const keys = JSON.parse(localStorage.getItem("dashboardKeys") || "{}");

  const stepsWithPaths = [
    { label: "Personal Information", icon: <PersonIcon />, path: `/applicant_personal_information/${keys.step1}` },
    { label: "Family Background", icon: <FamilyRestroomIcon />, path: `/applicant_family_background/${keys.step2}` },
    { label: "Educational Attainment", icon: <SchoolIcon />, path: `/applicant_educational_attainment/${keys.step3}` },
    { label: "Health Medical Records", icon: <HealthAndSafetyIcon />, path: `/applicant_health_medical_records/${keys.step4}` },
    { label: "Other Information", icon: <InfoIcon />, path: `/applicant_other_information/${keys.step5}` },
  ];

  const [activeStep, setActiveStep] = useState(1);
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

  // ── Guardian auto-fill ─────────────────────────────────────────────────────
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
  };

  const addSibling = () => {
    const updatedSiblings = [
      ...(person.siblings || []),
      {
        id: Date.now(),
        name: "",
        age: "",
        schoolLevel: "",
        schoolLastAttended: "",
        schoolAddress: "",
        occupation: "",
        monthlyIncome: "",
      },
    ];
    const updatedPerson = { ...person, siblings: updatedSiblings };
    setPerson(updatedPerson);
    handleUpdate(updatedPerson);
  };

  const removeSibling = (index) => {
    const updatedSiblings = (person.siblings || []).filter((_, i) => i !== index);
    const updatedPerson = { ...person, siblings: updatedSiblings };
    setPerson(updatedPerson);
    handleUpdate(updatedPerson);
  };

  const handleSiblingFieldChange = (index, field, value) => {
    const updatedSiblings = [...(person.siblings || [])];
    updatedSiblings[index] = { ...updatedSiblings[index], [field]: value };
    setPerson((prev) => ({ ...prev, siblings: updatedSiblings }));
  };

  const handleSiblingFieldBlur = () => {
    handleUpdate(person);
  };

  const handleNoSiblingsCheck = (e) => {
    const checked = e.target.checked;
    const updatedPerson = {
      ...person,
      has_no_siblings: checked ? 1 : 0,
      siblings: checked ? [] : person.siblings,
    };
    setPerson(updatedPerson);
    handleUpdate(updatedPerson);
  };

  // ── Fetch person data (do not alter) ────────────────────────────────────────
  const fetchPersonData = async (id) => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/person/${id}`);

      const safePerson = Object.fromEntries(
        Object.entries(res.data).map(([key, val]) => [key, val ?? ""]),
      );

      // ✅ NEW — siblings must always be an array in state
      let siblingsVal = res.data.siblings;
      if (typeof siblingsVal === "string") {
        try {
          siblingsVal = JSON.parse(siblingsVal);
        } catch {
          siblingsVal = [];
        }
      }
      safePerson.siblings = Array.isArray(siblingsVal) ? siblingsVal : [];
      safePerson.has_no_siblings = res.data.has_no_siblings === 1 ? 1 : 0;

      setPerson(safePerson);

      if (res.data.solo_parent === 1) {
        if (res.data.father_deceased === 1) setSoloParentChoice("Mother");
        else if (res.data.mother_deceased === 1) setSoloParentChoice("Father");
      }
    } catch (error) {
      console.error("Failed to fetch person data:", error);
    }
  };

  // ── Auto-save (do not alter) ────────────────────────────────────────────────
  const handleUpdate = async (updatedPerson) => {
    try {
      if (!updatedPerson || Object.keys(updatedPerson).length === 0) {
        console.warn("⚠️ No data to update — skipping PUT request");
        return;
      }
      await axios.put(`${API_BASE_URL}/api/person/${userID}`, updatedPerson);
      console.log("✅ Auto-saved successfully!");
    } catch (error) {
      console.error("❌ Auto-save failed:", error.response?.data || error.message);
    }
  };

  // ── Handle change with income auto-calc ────────────────────────────────────
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

  // ── Deceased state derivations ──────────────────────────────────────────────
  const [isFatherDeceased, setIsFatherDeceased] = useState(false);
  const [isMotherDeceased, setIsMotherDeceased] = useState(false);

  useEffect(() => {
    setIsFatherDeceased(person.father_deceased === 1);
  }, [person.father_deceased]);

  useEffect(() => {
    setIsMotherDeceased(person.mother_deceased === 1);
  }, [person.mother_deceased]);

  useEffect(() => {
    if (person.parent_type === "Mother") {
      setPerson((prev) => ({ ...prev, father_deceased: 1, mother_deceased: 0 }));
    } else if (person.parent_type === "Father") {
      setPerson((prev) => ({ ...prev, mother_deceased: 1, father_deceased: 0 }));
    }
  }, [person.parent_type]);

  // ── Form validation (do not alter) ──────────────────────────────────────────
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

  // ── Solo parent ──────────────────────────────────────────────────────────────
  const [soloParentChoice, setSoloParentChoice] = useState("");

  // ── Exam permit / PDF generation ────────────────────────────────────────────
  const divToPrintRef = useRef();
  const [showPrintView, setShowPrintView] = useState(false);
  const [examPermitError, setExamPermitError] = useState("");
  const [examPermitModalOpen, setExamPermitModalOpen] = useState(false);
  const [canPrintPermit, setCanPrintPermit] = useState(false);

  const handleCloseExamPermitModal = () => {
    setExamPermitModalOpen(false);
    setExamPermitError("");
  };

  // ── Unified "which card is generating" state (matches web behavior) ───────
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

  useEffect(() => {
    if (!userID) return;
    axios
      .get(`${API_BASE_URL}/api/verified-exam-applicants`)
      .then((res) => {
        const verified = res.data.some((a) => a.person_id === parseInt(userID));
        setCanPrintPermit(verified);
      });
  }, [userID]);

  // Same cards, same behavior as the web version: every click generates a PDF.
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

      {/* Hidden print/PDF-source view for the Exam Permit */}
      {showPrintView && (
        <div ref={divToPrintRef} style={{ position: "absolute", left: "-9999px", top: 0 }}>
          <ExamPermit />
        </div>
      )}

      {/* Hidden mount for whichever form is currently being converted to PDF */}
      {generatingKey && FORM_CONFIGS[generatingKey] && (
        <div ref={hiddenFormRef} style={{ position: "absolute", left: "-9999px", top: 0 }}>
          {React.createElement(FORM_CONFIGS[generatingKey].Component)}
        </div>
      )}

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
                      transition: "all 0.25s ease-in-out",
                      opacity: disabled && !isGenerating ? 0.5 : 1,
                      pointerEvents: disabled ? "none" : "auto",
                      cursor: disabled ? "default" : "pointer",
                      "&:hover": !disabled && {
                        transform: { md: "scale(1.04)" },
                        backgroundColor: headerColor || "#6D2323",
                        "& .chip-icon": { color: "#fff" },
                        "& .chip-text": { color: "#fff" },
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
              onChange={(e) => {
                const checked = e.target.checked;
                const newPerson = {
                  ...person,
                  solo_parent: checked ? 1 : 0,
                  father_deceased: checked && soloParentChoice === "Mother" ? 1 : checked ? 0 : null,
                  mother_deceased: checked && soloParentChoice === "Father" ? 1 : checked ? 0 : null,
                };
                setPerson(newPerson);
                handleUpdate(newPerson);
              }}
            >
              Solo Parent
            </CheckRow>

            {person.solo_parent === 1 && (
              <Box sx={{ maxWidth: { md: 420 } }}>
                <Field label="Solo Parent Type">
                  <MSelect
                    value={soloParentChoice}
                    onChange={(e) => {
                      const choice = e.target.value;
                      setSoloParentChoice(choice);
                      const updated = {
                        ...person,
                        father_deceased: choice === "Mother" ? 1 : 0,
                        mother_deceased: choice === "Father" ? 1 : 0,
                      };
                      setPerson(updated);
                      handleUpdate(updated);
                    }}
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
                      name="father_family_name"
                      value={person.father_family_name || ""}
                      onChange={handleChange}
                      onBlur={() => handleUpdate(person)}
                      error={errors.father_family_name}
                      placeholder="Enter your Father Last Name"
                    />
                  </Field>
                  <Field label="First Name" required error={errors.father_given_name} helperText="Required">
                    <MInput
                      name="father_given_name"
                      value={person.father_given_name || ""}
                      onChange={handleChange}
                      onBlur={() => handleUpdate(person)}
                      error={errors.father_given_name}
                      placeholder="Enter your Father First Name"
                    />
                  </Field>
                </div>

                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: isPhone ? "1fr" : "1fr 140px",
                    gap: 2,
                  }}
                >
                  <Field label="Middle Name">
                    <MInput
                      name="father_middle_name"
                      value={person.father_middle_name || ""}
                      onChange={handleChange}
                      onBlur={() => handleUpdate(person)}
                      placeholder="Enter your Father Middle Name"
                    />
                  </Field>
                  <Field label="Extension">
                    <MSelect
                      name="father_ext"
                      value={person.father_ext || ""}
                      onChange={handleChange}
                      onBlur={() => handleUpdate(person)}
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

                <Field label="Nickname">
                  <MInput
                    name="father_nickname"
                    value={person.father_nickname || ""}
                    onChange={handleChange}
                    onBlur={() => handleUpdate(person)}
                    placeholder="Enter your Father Nickname"
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
                    <Field label="Education Level" required error={errors.father_education_level} helperText="Required">
                      <MInput
                        name="father_education_level"
                        value={person.father_education_level || ""}
                        onChange={handleChange}
                        onBlur={() => handleUpdate(person)}
                        error={errors.father_education_level}
                        placeholder="Enter your Father Education Level"
                      />
                    </Field>
                    <div style={gridCols2}>
                      <Field label="Last School Attended" required error={errors.father_last_school} helperText="Required">
                        <MInput
                          name="father_last_school"
                          value={person.father_last_school || ""}
                          onChange={handleChange}
                          onBlur={() => handleUpdate(person)}
                          error={errors.father_last_school}
                          placeholder="Enter your Father Last School"
                        />
                      </Field>
                      <Field label="Course" required error={errors.father_course} helperText="Required">
                        <MInput
                          name="father_course"
                          value={person.father_course || ""}
                          onChange={handleChange}
                          onBlur={() => handleUpdate(person)}
                          error={errors.father_course}
                          placeholder="Enter your Father Course"
                        />
                      </Field>
                    </div>
                    <div style={gridCols2}>
                      <Field label="Year Graduated" required error={errors.father_year_graduated} helperText="Required">
                        <MInput
                          type="number"
                          name="father_year_graduated"
                          value={person.father_year_graduated || ""}
                          onChange={handleChange}
                          onBlur={() => handleUpdate(person)}
                          error={errors.father_year_graduated}
                          placeholder="Enter your Father Year Graduated"
                        />
                      </Field>
                      <Field label="School Address" required error={errors.father_school_address} helperText="Required">
                        <MInput
                          name="father_school_address"
                          value={person.father_school_address || ""}
                          onChange={handleChange}
                          onBlur={() => handleUpdate(person)}
                          error={errors.father_school_address}
                          placeholder="Enter your Father School Address"
                        />
                      </Field>
                    </div>
                  </>
                )}

                <SubHeader>Father's Contact Information</SubHeader>
                <div style={gridCols2}>
                  <Field label="Contact Number" required error={errors.father_contact} helperText="Required">
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontWeight: 700, fontSize: 13, flexShrink: 0 }}>+63</span>
                      <MInput
                        name="father_contact"
                        value={person.father_contact || ""}
                        onChange={(e) =>
                          handleChange({
                            target: { name: "father_contact", value: e.target.value.replace(/\D/g, "") },
                          })
                        }
                        onBlur={() => handleUpdate(person)}
                        error={errors.father_contact}
                        placeholder="9XXXXXXXXX"
                        maxLength={10}
                        style={{ flex: 1 }}
                      />
                    </div>
                  </Field>
                  <Field label="Occupation" required error={errors.father_occupation} helperText="Required">
                    <MInput
                      name="father_occupation"
                      value={person.father_occupation || ""}
                      onChange={handleChange}
                      onBlur={() => handleUpdate(person)}
                      error={errors.father_occupation}
                      placeholder="Enter your Father Occupation"
                    />
                  </Field>
                </div>
                <div style={gridCols2}>
                  <Field label="Employer" required error={errors.father_employer} helperText="Required">
                    <MInput
                      name="father_employer"
                      value={person.father_employer || ""}
                      onChange={handleChange}
                      onBlur={() => handleUpdate(person)}
                      error={errors.father_employer}
                      placeholder="Enter your Father Employer"
                    />
                  </Field>
                  <Field label="Monthly Income" required error={errors.father_income} helperText="Required">
                    <MInput
                      type="number"
                      name="father_income"
                      value={person.father_income ?? ""}
                      onChange={(e) =>
                        handleChange({
                          target: {
                            name: "father_income",
                            value: e.target.value === "" ? null : Number(e.target.value),
                          },
                        })
                      }
                      onBlur={() => handleUpdate(person)}
                      error={errors.father_income}
                      placeholder="Enter your Father Income"
                    />
                  </Field>
                </div>
                <Box sx={{ maxWidth: { md: 480 } }}>
                  <Field label="Email Address">
                    <MInput
                      name="father_email"
                      value={person.father_email || ""}
                      onChange={(e) =>
                        handleChange({ target: { name: "father_email", value: e.target.value.replace(/\s/g, "") } })
                      }
                      onBlur={(e) => {
                        let value = e.target.value.trim();
                        if (value && !value.includes("@")) value += "@gmail.com";
                        handleChange({ target: { name: "father_email", value } });
                        handleUpdate(person);
                      }}
                      placeholder="Enter your Father Email Address"
                      type="email"
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
            Mother's Details (Maiden)
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
                      name="mother_family_name"
                      value={person.mother_family_name || ""}
                      onChange={handleChange}
                      onBlur={() => handleUpdate(person)}
                      error={errors.mother_family_name}
                      placeholder="Enter your Mother Last Name"
                    />
                  </Field>
                  <Field label="First Name" required error={errors.mother_given_name} helperText="Required">
                    <MInput
                      name="mother_given_name"
                      value={person.mother_given_name || ""}
                      onChange={handleChange}
                      onBlur={() => handleUpdate(person)}
                      error={errors.mother_given_name}
                      placeholder="Enter your Mother First Name"
                    />
                  </Field>
                </div>

                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: isPhone ? "1fr" : "1fr 140px",
                    gap: 2,
                  }}
                >
                  <Field label="Middle Name">
                    <MInput
                      name="mother_middle_name"
                      value={person.mother_middle_name || ""}
                      onChange={handleChange}
                      onBlur={() => handleUpdate(person)}
                      placeholder="Enter your Mother Middle Name"
                    />
                  </Field>
                  <Field label="Extension">
                    <MSelect
                      name="mother_ext"
                      value={person.mother_ext || ""}
                      onChange={handleChange}
                      onBlur={() => handleUpdate(person)}
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

                <Field label="Nickname">
                  <MInput
                    name="mother_nickname"
                    value={person.mother_nickname || ""}
                    onChange={handleChange}
                    onBlur={() => handleUpdate(person)}
                    placeholder="Enter your Mother Nickname"
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
                    <Field label="Education Level" required error={errors.mother_education_level} helperText="Required">
                      <MInput
                        name="mother_education_level"
                        value={person.mother_education_level || ""}
                        onChange={handleChange}
                        onBlur={() => handleUpdate(person)}
                        error={errors.mother_education_level}
                        placeholder="Enter your Mother Education Level"
                      />
                    </Field>
                    <div style={gridCols2}>
                      <Field label="Last School Attended" required error={errors.mother_last_school} helperText="Required">
                        <MInput
                          name="mother_last_school"
                          value={person.mother_last_school || ""}
                          onChange={handleChange}
                          onBlur={() => handleUpdate(person)}
                          error={errors.mother_last_school}
                          placeholder="Enter your Mother Last School"
                        />
                      </Field>
                      <Field label="Course" required error={errors.mother_course} helperText="Required">
                        <MInput
                          name="mother_course"
                          value={person.mother_course || ""}
                          onChange={handleChange}
                          onBlur={() => handleUpdate(person)}
                          error={errors.mother_course}
                          placeholder="Enter your Mother Course"
                        />
                      </Field>
                    </div>
                    <div style={gridCols2}>
                      <Field label="Year Graduated" required error={errors.mother_year_graduated} helperText="Required">
                        <MInput
                          type="number"
                          name="mother_year_graduated"
                          value={person.mother_year_graduated || ""}
                          onChange={handleChange}
                          onBlur={() => handleUpdate(person)}
                          error={errors.mother_year_graduated}
                          placeholder="Enter your Mother Year Graduated"
                        />
                      </Field>
                      <Field label="School Address" required error={errors.mother_school_address} helperText="Required">
                        <MInput
                          name="mother_school_address"
                          value={person.mother_school_address || ""}
                          onChange={handleChange}
                          onBlur={() => handleUpdate(person)}
                          error={errors.mother_school_address}
                          placeholder="Enter your Mother School Address"
                        />
                      </Field>
                    </div>
                  </>
                )}

                <SubHeader>Mother's Contact Information</SubHeader>
                <div style={gridCols2}>
                  <Field label="Contact Number" required error={errors.mother_contact} helperText="Required">
                    <MInput
                      name="mother_contact"
                      value={person.mother_contact || ""}
                      onChange={(e) =>
                        handleChange({
                          target: { name: "mother_contact", value: e.target.value.replace(/\D/g, "") },
                        })
                      }
                      onBlur={() => handleUpdate(person)}
                      error={errors.mother_contact}
                      placeholder="9XXXXXXXXX"
                    />
                  </Field>
                  <Field label="Occupation" required error={errors.mother_occupation} helperText="Required">
                    <MInput
                      name="mother_occupation"
                      value={person.mother_occupation || ""}
                      onChange={handleChange}
                      onBlur={() => handleUpdate(person)}
                      error={errors.mother_occupation}
                      placeholder="Enter your Mother Occupation"
                    />
                  </Field>
                </div>
                <div style={gridCols2}>
                  <Field label="Employer" required error={errors.mother_employer} helperText="Required">
                    <MInput
                      name="mother_employer"
                      value={person.mother_employer || ""}
                      onChange={handleChange}
                      onBlur={() => handleUpdate(person)}
                      error={errors.mother_employer}
                      placeholder="Enter your Mother Employer"
                    />
                  </Field>
                  <Field label="Monthly Income" required error={errors.mother_income} helperText="Required">
                    <MInput
                      type="number"
                      name="mother_income"
                      value={person.mother_income ?? ""}
                      onChange={(e) =>
                        handleChange({
                          target: {
                            name: "mother_income",
                            value: e.target.value === "" ? null : Number(e.target.value),
                          },
                        })
                      }
                      onBlur={() => handleUpdate(person)}
                      error={errors.mother_income}
                      placeholder="Enter your Mother Income"
                    />
                  </Field>
                </div>
                <Box sx={{ maxWidth: { md: 480 } }}>
                  <Field label="Email Address">
                    <MInput
                      name="mother_email"
                      value={person.mother_email || ""}
                      onChange={(e) =>
                        handleChange({ target: { name: "mother_email", value: e.target.value.replace(/\s/g, "") } })
                      }
                      onBlur={(e) => {
                        let value = e.target.value.trim();
                        if (value && !value.includes("@")) value += "@gmail.com";
                        handleChange({ target: { name: "mother_email", value } });
                        handleUpdate(person);
                      }}
                      placeholder="Enter your Mother Email Address"
                      type="email"
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
              <Field label="Guardian Relationship" required error={errors.guardian} helperText="This field is required.">
                <MSelect
                  name="guardian"
                  value={person.guardian || ""}
                  onChange={handleGuardianChange}
                  onBlur={() => handleUpdate(person)}
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
                  name="guardian_family_name"
                  value={person.guardian_family_name || ""}
                  onChange={handleChange}
                  onBlur={() => handleUpdate(person)}
                  error={errors.guardian_family_name}
                  placeholder="Enter your Guardian Last Name"
                />
              </Field>
              <Field label="First Name" required error={errors.guardian_given_name} helperText="Required">
                <MInput
                  name="guardian_given_name"
                  value={person.guardian_given_name || ""}
                  onChange={handleChange}
                  onBlur={() => handleUpdate(person)}
                  error={errors.guardian_given_name}
                  placeholder="Enter your Guardian First Name"
                />
              </Field>
            </div>

            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: isPhone ? "1fr" : "1fr 140px",
                gap: 2,
              }}
            >
              <Field label="Middle Name">
                <MInput
                  name="guardian_middle_name"
                  value={person.guardian_middle_name || ""}
                  onChange={handleChange}
                  onBlur={() => handleUpdate(person)}
                  placeholder="Enter your Guardian Middle Name"
                />
              </Field>
              <Field label="Extension">
                <MSelect
                  name="guardian_ext"
                  value={person.guardian_ext || ""}
                  onChange={handleChange}
                  onBlur={() => handleUpdate(person)}
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
              <Field label="Nickname">
                <MInput
                  name="guardian_nickname"
                  value={person.guardian_nickname || ""}
                  onChange={handleChange}
                  onBlur={() => handleUpdate(person)}
                  placeholder="Enter your Guardian Nickname"
                />
              </Field>

              <Field
                label="Complete Address"
                required
                error={errors.guardian_address}
                helperText="This field is required."
              >
                <MInput
                  name="guardian_address"
                  value={person.guardian_address || ""}
                  onChange={handleChange}
                  onBlur={() => handleUpdate(person)}
                  error={errors.guardian_address}
                  placeholder="Enter your Guardian Address"
                />
              </Field>
            </Box>

            <div style={gridCols2}>
              <Field label="Contact Number" required error={errors.guardian_contact} helperText="Required">
                <MInput
                  name="guardian_contact"
                  value={person.guardian_contact || ""}
                  onChange={(e) =>
                    handleChange({
                      target: { name: "guardian_contact", value: e.target.value.replace(/\D/g, "") },
                    })
                  }
                  onBlur={() => handleUpdate(person)}
                  error={errors.guardian_contact}
                  placeholder="9XXXXXXXXX"
                />
              </Field>
              <Field label="Email Address">
                <MInput
                  name="guardian_email"
                  value={person.guardian_email || ""}
                  onChange={(e) =>
                    handleChange({ target: { name: "guardian_email", value: e.target.value.replace(/\s/g, "") } })
                  }
                  onBlur={(e) => {
                    let value = e.target.value.trim();
                    if (value && !value.includes("@")) value += "@gmail.com";
                    handleChange({ target: { name: "guardian_email", value } });
                    handleUpdate(person);
                  }}
                  placeholder="Enter your Guardian Email Address"
                  type="email"
                />
              </Field>
            </div>
          </Box>
        </Box>

        {/* ── Siblings ───────────────────────────────────────────────────── */}
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
            Siblings (Mga Kapatid Mo)
          </Box>
          <Box sx={{ p: { xs: "14px", md: "20px" } }}>
            <CheckRow
              checked={person.has_no_siblings === 1}
              onChange={handleNoSiblingsCheck}
            >
              Check if there's no siblings
            </CheckRow>

            {errors.siblings && (
              <div style={{ color: "#d32f2f", fontSize: 12, marginBottom: 10 }}>
                Please add at least one sibling, or check "no siblings" above.
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
                      backgroundColor: "#fafafa",
                    }}
                  >
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        mb: 1,
                      }}
                    >
                      <Typography sx={{ fontWeight: 700, fontSize: 13 }}>
                        Sibling {index + 1}
                      </Typography>
                      <Button
                        size="small"
                        variant="outlined"
                        color="error"
                        onClick={() => removeSibling(index)}
                        sx={{ minWidth: 32, fontSize: 12, textTransform: "none" }}
                      >
                        − Remove
                      </Button>
                    </Box>

                    <div style={gridCols2}>
                      <Field
                        label="Name of Sibling"
                        required
                        error={errors[`sibling_name_${index}`]}
                        helperText="This field is required."
                      >
                        <MInput
                          value={sibling.name || ""}
                          onChange={(e) => handleSiblingFieldChange(index, "name", e.target.value)}
                          onBlur={handleSiblingFieldBlur}
                          error={errors[`sibling_name_${index}`]}
                          placeholder="Enter Sibling Name"
                        />
                      </Field>
                      <Field
                        label="Age"
                        required
                        error={errors[`sibling_age_${index}`]}
                        helperText="This field is required."
                      >
                        <MInput
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
                          value={sibling.schoolLevel || ""}
                          onChange={(e) => handleSiblingFieldChange(index, "schoolLevel", e.target.value)}
                          onBlur={handleSiblingFieldBlur}
                          placeholder="e.g. College"
                        />
                      </Field>
                      <Field label="School Last Attended">
                        <MInput
                          value={sibling.schoolLastAttended || ""}
                          onChange={(e) => handleSiblingFieldChange(index, "schoolLastAttended", e.target.value)}
                          onBlur={handleSiblingFieldBlur}
                          placeholder="Enter School Last Attended"
                        />
                      </Field>
                    </div>

                    <Field label="School Address">
                      <MInput
                        value={sibling.schoolAddress || ""}
                        onChange={(e) => handleSiblingFieldChange(index, "schoolAddress", e.target.value)}
                        onBlur={handleSiblingFieldBlur}
                        placeholder="Enter School Address"
                      />
                    </Field>

                    <div style={gridCols2}>
                      <Field label="Occupation">
                        <MInput
                          value={sibling.occupation || ""}
                          onChange={(e) => handleSiblingFieldChange(index, "occupation", e.target.value)}
                          onBlur={handleSiblingFieldBlur}
                          placeholder="Enter Occupation"
                        />
                      </Field>
                      <Field label="Monthly Income">
                        <MInput
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
              >
                <MSelect
                  name="annual_income"
                  value={person.annual_income || ""}
                  onChange={handleChange}
                  onBlur={() => handleUpdate(person)}
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
                  setTimeout(() => navigate(`/applicant_personal_information/${keys.step1}`), 1000);
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
                    setTimeout(() => navigate(`/applicant_educational_attainment/${keys.step3}`), 1000);
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

export default ApplicantFamilyBackgroundMobile;
