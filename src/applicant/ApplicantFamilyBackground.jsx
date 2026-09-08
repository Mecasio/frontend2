import React, { useState, useEffect, useContext, useRef } from "react";
import { SettingsContext } from "../App";

import axios from "axios";
import {
  Button,
  Box,
  TextField,
  Container,
  Card,
  Modal,
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
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ErrorIcon from "@mui/icons-material/Error";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import ExamPermit from "./ExamPermit";
import API_BASE_URL from "../apiConfig";
import EaristLogo from "../assets/EaristLogo.png";
import DownloadIcon from "@mui/icons-material/Download";
import PersonalDataForm from "./PersonalDataForm";
import OfficeOfTheRegistrar from "./OfficeOfTheRegistrar";
import AdmissionServices from "./ApplicantServicesSurvey";
import ECATApplicationForm from "./ECATApplicationForm";
import { Snackbar, Alert } from "@mui/material";
const ApplicantFamilyBackground = (props) => {
  const settings = useContext(SettingsContext);
  const colors = settings?.colors || {};
  const branding = settings?.branding || {};
  const assets = settings?.assets || {};
  const headerColor = colors.header || "#1976d2";

  const [titleColor, setTitleColor] = useState("#000000");
  const [subtitleColor, setSubtitleColor] = useState("#555555");
  const [borderColor, setBorderColor] = useState("#000000");
  const [mainButtonColor, setMainButtonColor] = useState("#1976d2");
  const [subButtonColor, setSubButtonColor] = useState("#ffffff"); // ✅ NEW
  const [stepperColor, setStepperColor] = useState("#000000"); // ✅ NEW

  const [fetchedLogo, setFetchedLogo] = useState(null);
  const [companyName, setCompanyName] = useState("");
  const [shortTerm, setShortTerm] = useState("");
  const [campusAddress, setCampusAddress] = useState("");

  useEffect(() => {
    if (!settings) return;

    // 🎨 Colors
    if (colors.title) setTitleColor(colors.title);
    if (colors.subtitle) setSubtitleColor(colors.subtitle);
    if (colors.border) setBorderColor(colors.border);
    if (colors.mainButton)
      setMainButtonColor(colors.mainButton);
    if (colors.subButton) setSubButtonColor(colors.subButton); // ✅ NEW
    if (colors.stepper) setStepperColor(colors.stepper); // ✅ NEW

    // 🏫 Logo
    if (assets.logoUrl) {
      setFetchedLogo(`${assets.logoUrl}`);
    } else {
      setFetchedLogo(EaristLogo);
    }

    // 🏷️ School Information
    if (branding.companyName) setCompanyName(branding.companyName);
    if (branding.shortTerm) setShortTerm(branding.shortTerm);
    if (branding.campusAddress) setCampusAddress(branding.campusAddress);
  }, [settings]);

  const navigate = useNavigate();
  const [userID, setUserID] = useState("");
  const [user, setUser] = useState("");
  const [userRole, setUserRole] = useState("");
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
    has_no_siblings: 0,      // ✅ NEW
    siblings: [],            // ✅ NEW
  });

  // Add this state at the top if not already:
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "warning",
  });

  // Snackbar close handler
  const handleCloseSnackbar = (event, reason) => {
    if (reason === "clickaway") return;
    setSnackbar((prev) => ({ ...prev, open: false }));
  };

  // Example: replace previous calls with this:
  const showSnackbar = (message) => {
    setSnackbar({ open: true, message, severity: "warning" });
  };

  // do not alter
  useEffect(() => {
    const storedUser = localStorage.getItem("email");
    const storedRole = localStorage.getItem("role");
    const storedID = localStorage.getItem("person_id");
    const keys = JSON.parse(localStorage.getItem("dashboardKeys") || "{}");
    if (keys.step2) {
      navigate(`/applicant_family_background/${keys.step2}`);
    }

    const overrideId = props?.adminOverridePersonId; // new

    if (overrideId) {
      // Admin editing other person
      setUserRole("superadmin");
      setUserID(overrideId);
      fetchPersonData(overrideId);
      return;
    }

    if (storedUser && storedRole && storedID) {
      setUser(storedUser);
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

  const steps = [
    { label: "Personal Information", icon: <PersonIcon />, path: `/applicant_personal_information/${keys.step1}` },
    { label: "Family Background", icon: <FamilyRestroomIcon />, path: `/applicant_family_background/${keys.step2}` },
    { label: "Educational Attainment", icon: <SchoolIcon />, path: `/applicant_educational_attainment/${keys.step3}` },
    { label: "Health Medical Records", icon: <HealthAndSafetyIcon />, path: `/applicant_health_medical_records/${keys.step4}` },
    { label: "Other Information", icon: <InfoIcon />, path: `/applicant_other_information/${keys.step5}` },
  ];

  const [activeStep, setActiveStep] = useState(1);
  const [clickedSteps, setClickedSteps] = useState(
    Array(steps.length).fill(false),
  );

  const handleStepClick = async (index) => {
    if (isFormValid()) {
      await handleUpdate(person);

      setSnackbar({
        open: true,
        message: `Your record has been saved successfully!`,
        severity: "success",
      });

      setActiveStep(index);

      const newClickedSteps = [...clickedSteps];
      newClickedSteps[index] = true;
      setClickedSteps(newClickedSteps);

      // Delay navigation so snackbar can be seen
      setTimeout(() => {
        navigate(steps[index].path);
      }, 1000);
    } else {
      setSnackbar({
        open: true,
        message: "Please fill all required fields before proceeding.",
        severity: "error",
      });
    }
  };



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

  // Do not alter
  const handleUpdate = async (updatedPerson) => {
    try {
      // prevent sending an empty object
      if (!updatedPerson || Object.keys(updatedPerson).length === 0) {
        console.warn("⚠️ No data to update — skipping PUT request");
        return;
      }

      console.log("🧠 Sending update:", updatedPerson);

      await axios.put(`${API_BASE_URL}/api/person/${userID}`, updatedPerson);
      console.log("✅ Auto-saved successfully!");
    } catch (error) {
      console.error(
        "❌ Auto-save failed:",
        error.response?.data || error.message,
      );
    }
  };

  // Real-time save on every character typed
  const handleChange = (e) => {
    const { name, type, checked, value } = e.target;

    const updatedPerson = {
      ...person,
      [name]: type === "checkbox" ? (checked ? 1 : 0) : value,
    };

    // If updating either mother_income or father_income, calculate total and set annual_income
    if (name === "mother_income" || name === "father_income") {
      const motherIncome =
        parseFloat(
          name === "mother_income" ? value : updatedPerson.mother_income,
        ) || 0;
      const fatherIncome =
        parseFloat(
          name === "father_income" ? value : updatedPerson.father_income,
        ) || 0;
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
    handleUpdate(updatedPerson); // No delay, real-time save
  };

  // const handleBlur = async () => {
  //   try {
  //     await axios.put(`${API_BASE_URL}/form/person/${userID}`, person);
  //     console.log("Auto-saved");
  //   } catch (err) {
  //     console.error("Auto-save failed", err);
  //   }
  // };

  const [isFatherDeceased, setIsFatherDeceased] = useState(false);
  const [isMotherDeceased, setIsMotherDeceased] = useState(false);

  useEffect(() => {
    setIsFatherDeceased(person.father_deceased === 1);
  }, [person.father_deceased]);

  useEffect(() => {
    setIsMotherDeceased(person.mother_deceased === 1);
  }, [person.mother_deceased]);

  // No need for local states like isFatherDeceased, etc. if you're using person state directly
  useEffect(() => {
    if (person.parent_type === "Mother") {
      setPerson((prev) => ({
        ...prev,
        father_deceased: 1,
        mother_deceased: 0,
      }));
    } else if (person.parent_type === "Father") {
      setPerson((prev) => ({
        ...prev,
        mother_deceased: 1,
        father_deceased: 0,
      }));
    }
  }, [person.parent_type]);

  const [errors, setErrors] = useState({});

  const isFormValid = () => {
    const requiredFields = [];

    // If father is NOT deceased, require father fields:
    if (person.father_deceased !== 1) {
      requiredFields.push(
        "father_family_name",
        "father_given_name",
        "father_contact",
        "father_occupation",
        "father_employer",
        "father_income",
      );

      // but only require education details if father_education !== 1
      if (person.father_education !== 1) {
        requiredFields.push(
          "father_education_level",
          "father_last_school",
          "father_course",
          "father_year_graduated",
          "father_school_address",
        );
      }
    }

    // If mother is NOT deceased, require mother fields:
    if (person.mother_deceased !== 1) {
      requiredFields.push(
        "mother_family_name",
        "mother_given_name",
        "mother_contact",
        "mother_occupation",
        "mother_employer",
        "mother_income",
      );

      // only require education details if mother_education !== 1
      if (person.mother_education !== 1) {
        requiredFields.push(
          "mother_education_level",
          "mother_last_school",
          "mother_course",
          "mother_year_graduated",
          "mother_school_address",
        );
      }
    }

    // Guardian fields always required:
    requiredFields.push(
      "guardian",
      "guardian_family_name",
      "guardian_given_name",
      "guardian_address",
      "guardian_contact",
    );

    // Annual income always required:
    requiredFields.push("annual_income");

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
  const [soloParentChoice, setSoloParentChoice] = useState("");

  const divToPrintRef = useRef();
  const [showPrintView, setShowPrintView] = useState(false);

  const printDiv = () => {
    const divToPrint = divToPrintRef.current;
    if (divToPrint) {
      const newWin = window.open("", "Print-Window");
      newWin.document.open();
      newWin.document.write(`
        <html>
          <head>
            <title>Examination Permit</title>
            <style>
              @page { size: A4; margin: 0; }
              body {
                margin: 0;
                padding: 0;
                display: flex;
                margin-left: "
                justify-content: center;
                align-items: center;
                min-height: 100vh;
              }
              .print-container {
                width: 8.5in;
                min-height: 11in;
                margin: auto;
                background: white;
              }
              * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            </style>
          </head>
          <body onload="window.print(); setTimeout(() => window.close(), 100);">
            <div class="print-container">${divToPrint.innerHTML}</div>
          </body>
        </html>
      `);
      newWin.document.close();
    }
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
      dateStamped: true, // this one has no applicant-specific filename (matches your backend route)
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

  const [examPermitError, setExamPermitError] = useState("");
  const [examPermitModalOpen, setExamPermitModalOpen] = useState(false);

  const handleCloseExamPermitModal = () => {
    setExamPermitModalOpen(false);
    setExamPermitError("");
  };

  const handleExamPermitClick = async () => {
    try {
      const res = await axios.get(
        `${API_BASE_URL}/api/verified-exam-applicants`,
      );
      const verified = res.data.some((a) => a.person_id === parseInt(userID));

      if (!verified) {
        setExamPermitError(
          "❌ You cannot print the Exam Permit until all required documents are verified.",
        );
        setExamPermitModalOpen(true);
        return;
      }

      // ✅ Render permit and print
      setShowPrintView(true);
      setTimeout(() => {
        printDiv();
        setShowPrintView(false);
      }, 500);
    } catch (err) {
      console.error("Error verifying exam permit eligibility:", err);
      setExamPermitError(
        "⚠️ Unable to check document verification status right now.",
      );
      setExamPermitModalOpen(true);
    }
  };

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


  const [canPrintPermit, setCanPrintPermit] = useState(false);

  useEffect(() => {
    if (!userID) return;
    axios
      .get(`${API_BASE_URL}/api/verified-exam-applicants`)
      .then((res) => {
        const verified = res.data.some((a) => a.person_id === parseInt(userID));
        setCanPrintPermit(verified);
      });
  }, [userID]);

  // 🔒 Disable right-click
  // document.addEventListener("contextmenu", (e) => e.preventDefault());

  // // 🔒 Block DevTools shortcuts + Ctrl+P silently
  // document.addEventListener("keydown", (e) => {
  //   const isBlockedKey =
  //     e.key === "F12" ||
  //     e.key === "F11" ||
  //     (e.ctrlKey &&
  //       e.shiftKey &&
  //       (e.key.toLowerCase() === "i" || e.key.toLowerCase() === "j")) ||
  //     (e.ctrlKey && e.key.toLowerCase() === "u") ||
  //     (e.ctrlKey && e.key.toLowerCase() === "p");

  //   if (isBlockedKey) {
  //     e.preventDefault();
  //     e.stopPropagation();
  //   }
  // });

  // dot not alter
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
      {showPrintView && (
        <div ref={divToPrintRef} style={{ position: "absolute", left: "-9999px", top: 0 }}>
          <ExamPermit />
        </div>
      )}

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
          FAMILY BACKGROUND
        </Typography>
      </Box>
      <hr style={{ border: "1px solid #ccc", width: "100%" }} />

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
          justifyContent: "center", // Centers all cards horizontally
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
                  transition: "all 0.3s ease-in-out",
                  opacity: disabled && !isGenerating ? 0.5 : 1,
                  pointerEvents: disabled ? "none" : "auto",
                  cursor: disabled ? "default" : "pointer",
                  "&:hover": !disabled && {
                    transform: "scale(1.05)",
                    backgroundColor: headerColor || "#1976d2",
                    "& .card-text": { color: "#fff" },
                    "& .card-icon": { color: "#fff" },
                  },
                }}
                onClick={() => {
                  if (disabled) return;
                  if (lnk.onClick) lnk.onClick();
                  else if (lnk.to) navigate(lnk.to);
                }}
              >
                {isGenerating ? (
                  <CircularProgress size={26} sx={{ color: mainButtonColor, mr: 1.5 }} />
                ) : (
                  <PictureAsPdfIcon className="card-icon" sx={{ fontSize: 35, color: mainButtonColor, mr: 1.5 }} />
                )}
                <Typography
                  className="card-text"
                  sx={{ color: mainButtonColor, fontFamily: "Poppins, sans-serif", fontWeight: "bold", fontSize: "0.85rem" }}
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
          <h1
            style={{
              fontSize: "50px",
              fontWeight: "bold",
              textAlign: "center",
              color: subtitleColor,
              marginTop: "25px",
            }}
          >
            APPLICANT FORM
          </h1>
          <div style={{ textAlign: "center" }}>
            Complete the applicant form to secure your place for the upcoming
            academic year at{" "}
            {shortTerm ? (
              <>
                <strong>{shortTerm.toUpperCase()}</strong> <br />
                {companyName || ""}
              </>
            ) : (
              companyName || ""
            )}
            .
          </div>
        </Container>
        <br />

        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            width: "100%",
            px: 4,
          }}
        >
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
                    backgroundColor:
                      activeStep === index
                        ? headerColor || "#1976d2"
                        : "#E8C999",
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
              <Typography
                style={{
                  fontSize: "20px",
                  padding: "10px",
                  fontFamily: "Poppins, sans-serif",
                }}
              >
                Step 2: Family Background
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
              Family Background:
            </Typography>
            <hr style={{ border: "1px solid #ccc", width: "100%" }} />
            <br />

            <Box display="flex" gap={3} width="100%" alignItems="center">
              {/* Solo Parent Checkbox */}
              <Box marginTop="10px" display="flex" alignItems="center" gap={1}>
                <Checkbox
                  name="solo_parent"
                  checked={person.solo_parent === 1}
                  onChange={(e) => {
                    const checked = e.target.checked;

                    const newPerson = {
                      ...person,
                      solo_parent: checked ? 1 : 0,
                      father_deceased:
                        checked && soloParentChoice === "Mother"
                          ? 1
                          : checked
                            ? 0
                            : null,
                      mother_deceased:
                        checked && soloParentChoice === "Father"
                          ? 1
                          : checked
                            ? 0
                            : null,
                    };

                    setPerson(newPerson);
                    handleUpdate(newPerson); // Save immediately
                  }}
                  onBlur={() => handleUpdate(person)}
                  sx={{ width: 25, height: 25 }}
                />
                <label style={{ fontFamily: "Poppins, sans-serif" }}>
                  Solo Parent
                </label>
              </Box>

              {/* Parent Type Dropdown */}
              {person.solo_parent === 1 && (
                <FormControl size="small" style={{ width: "200px" }}>
                  <InputLabel id="parent-select-label">- Parent- </InputLabel>
                  <Select
                    labelId="parent-select-label"
                    value={soloParentChoice}
                    onChange={(e) => {
                      const choice = e.target.value;
                      setSoloParentChoice(choice);

                      const updatedPerson = {
                        ...person,
                        father_deceased: choice === "Mother" ? 1 : 0,
                        mother_deceased: choice === "Father" ? 1 : 0,
                      };

                      setPerson(updatedPerson);
                      handleUpdate(updatedPerson);
                    }}
                  >
                    <MenuItem value="Father">Father</MenuItem>
                    <MenuItem value="Mother">Mother</MenuItem>
                  </Select>
                </FormControl>
              )}
            </Box>

            <br />

            <Typography
              style={{
                fontSize: "20px",
                color: mainButtonColor,
                fontWeight: "bold",
              }}
            >
              Father's Details
            </Typography>
            <hr style={{ border: "1px solid #ccc", width: "100%" }} />
            <br />

            <Box sx={{ mb: 2 }}>
              {/* Father Deceased Checkbox */}
              {/* Father Deceased Checkbox */}
              <FormControlLabel
                control={
                  <Checkbox
                    name="father_deceased"
                    value={person.father_deceased} // 👈 Added value
                    checked={person.father_deceased === 1}
                    onChange={(e) => {
                      const checked = e.target.checked;

                      // Call your form handler
                      handleChange(e);

                      // Update local state
                      setPerson((prev) => ({
                        ...prev,
                        father_deceased: checked ? 1 : 0,
                      }));
                    }}
                    onBlur={() => handleUpdate(person)}
                  />
                }
                label="Seperated / Deceased"
              />
              <br />

              {/* Show Father's Info ONLY if not deceased */}
              {!isFatherDeceased && (
                <>
                  <Box sx={{ display: "flex", gap: 2, mt: 2 }}>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="subtitle2" mb={1}>
                        Last Name<span style={{ color: "red" }}> *</span>
                      </Typography>
                      <TextField
                        fullWidth
                        size="small"
                        required
                        placeholder="Enter Father Last Name"
                        name="father_family_name"
                        value={person.father_family_name || ""}
                        onChange={handleChange}
                        onBlur={() => handleUpdate(person)}
                        error={errors.father_family_name}
                        helperText={
                          errors.father_family_name
                            ? "This field is required."
                            : ""
                        }
                      />
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="subtitle2" mb={1}>
                        First Name<span style={{ color: "red" }}> *</span>
                      </Typography>
                      <TextField
                        fullWidth
                        size="small"
                        required
                        name="father_given_name"
                        placeholder="Enter Father First Name"
                        value={person.father_given_name || ""}
                        onChange={handleChange}
                        onBlur={() => handleUpdate(person)}
                        error={errors.father_given_name}
                        helperText={
                          errors.father_given_name
                            ? "This field is required."
                            : ""
                        }
                      />
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="subtitle2" mb={1}>
                        Middle Name
                      </Typography>
                      <TextField
                        fullWidth
                        size="small"
                        required
                        name="father_middle_name"
                        placeholder="Enter Father Middle Name"
                        value={person.father_middle_name || ""}
                        onChange={handleChange}
                        onBlur={() => handleUpdate(person)}
                      />
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="subtitle2" mb={1}>
                        Name Extension
                      </Typography>
                      <FormControl
                        fullWidth
                        size="small"
                        required
                        error={!!errors.father_ext}
                      >
                        <Select
                          labelId="father-ext-label"
                          id="father_ext"
                          name="father_ext"
                          value={person.father_ext || ""}
                          onChange={handleChange}
                          onBlur={() => handleUpdate(person)}
                        >
                          <MenuItem value="">
                            <em>Select Extension</em>
                          </MenuItem>
                          <MenuItem value="Jr.">Jr.</MenuItem>
                          <MenuItem value="Sr.">Sr.</MenuItem>
                          <MenuItem value="I">I</MenuItem>
                          <MenuItem value="II">II</MenuItem>
                          <MenuItem value="III">III</MenuItem>
                          <MenuItem value="IV">IV</MenuItem>
                          <MenuItem value="V">V</MenuItem>
                        </Select>
                      </FormControl>
                    </Box>

                    <Box sx={{ flex: 1 }}>
                      <Typography variant="subtitle2" mb={1}>
                        Nickname
                      </Typography>
                      <TextField
                        fullWidth
                        size="small"
                        required
                        name="father_nickname"
                        placeholder="Enter Father Nickname"
                        value={person.father_nickname || ""}
                        onChange={handleChange}
                        onBlur={() => handleUpdate(person)}
                      />
                    </Box>
                  </Box>

                  <Typography
                    sx={{
                      fontSize: "20px",
                      color: mainButtonColor,
                      fontWeight: "bold",
                      mt: 3,
                    }}
                  >
                    Father's Educational Background
                  </Typography>
                  <hr style={{ border: "1px solid #ccc", width: "100%" }} />
                  <br />
                  <Box display="flex" gap={3} alignItems="center">
                    {/* Father's Education Not Applicable Checkbox */}
                    <Checkbox
                      name="father_education"
                      checked={person.father_education === 1}
                      onChange={(e) => {
                        const isChecked = e.target.checked;

                        const updatedPerson = {
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

                        setPerson(updatedPerson);
                        handleUpdate(updatedPerson); // Immediate update (optional)
                      }}
                      onBlur={() => handleUpdate(person)}
                      sx={{ width: 25, height: 25 }}
                    />
                    <label style={{ fontFamily: "Poppins, sans-serif" }}>
                      Father's education not applicable
                    </label>
                  </Box>

                  {/* Father Educational Details (conditionally rendered) */}
                  {person.father_education !== 1 && (
                    <Box
                      sx={{ display: "flex", gap: 2, mt: 2, flexWrap: "wrap" }}
                    >
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="subtitle2" mb={1}>
                          {" "}
                          Educational Attainment
                          <span style={{ color: "red" }}> *</span>
                        </Typography>
                        <TextField
                          fullWidth
                          size="small"
                          placeholder="Enter Father Education Level"
                          name="father_education_level"
                          value={person.father_education_level || ""}
                          onChange={handleChange}
                          onBlur={() => handleUpdate(person)}
                          error={errors.father_education_level}
                          helperText={
                            errors.father_education_level
                              ? "This field is required."
                              : ""
                          }
                        />
                      </Box>

                      <Box sx={{ flex: 1 }}>
                        <Typography variant="subtitle2" mb={1}>
                          Last School Attended
                          <span style={{ color: "red" }}> *</span>
                        </Typography>
                        <TextField
                          fullWidth
                          size="small"
                          name="father_last_school"
                          placeholder="Enter Father Last School"
                          value={person.father_last_school || ""}
                          onChange={handleChange}
                          onBlur={() => handleUpdate(person)}
                          error={errors.father_last_school}
                          helperText={
                            errors.father_last_school
                              ? "This field is required."
                              : ""
                          }
                        />
                      </Box>

                      <Box sx={{ flex: 1 }}>
                        <Typography variant="subtitle2" mb={1}>
                          Course<span style={{ color: "red" }}> *</span>
                        </Typography>
                        <TextField
                          fullWidth
                          size="small"
                          name="father_course"
                          placeholder="Enter Father Course"
                          value={person.father_course || ""}
                          onChange={handleChange}
                          onBlur={() => handleUpdate(person)}
                          error={errors.father_course}
                          helperText={
                            errors.father_course
                              ? "This field is required."
                              : ""
                          }
                        />
                      </Box>

                      <Box sx={{ flex: 1 }}>
                        <Typography variant="subtitle2" mb={1}>
                          Year Graduated<span style={{ color: "red" }}> *</span>
                        </Typography>
                        <TextField
                          fullWidth
                          size="small"
                          type="number"
                          name="father_year_graduated"
                          placeholder="Enter Father Year Graduated"
                          value={person.father_year_graduated || ""}
                          onChange={handleChange}
                          onBlur={() => handleUpdate(person)}
                          error={errors.father_year_graduated}
                          helperText={
                            errors.father_year_graduated
                              ? "This field is required."
                              : ""
                          }
                        />
                      </Box>

                      <Box sx={{ flex: 1 }}>
                        <Typography
                          variant="subtitle2"
                          mb={1.8}
                          sx={{
                            fontSize: "10px",
                            whiteSpace: "nowrap", // 👉 never wraps
                            overflow: "hidden",
                            textOverflow: "ellipsis", // 👉 adds "..."
                          }}
                        >
                          School Full Address (St/ Brgy / City)
                          <span style={{ color: "red" }}> *</span>
                        </Typography>
                        <TextField
                          fullWidth
                          size="small"
                          name="father_school_address"
                          placeholder="Enter Father School Address"
                          value={person.father_school_address || ""}
                          onChange={handleChange}
                          onBlur={() => handleUpdate(person)}
                          error={errors.father_school_address}
                          helperText={
                            errors.father_school_address
                              ? "This field is required."
                              : ""
                          }
                        />
                      </Box>
                    </Box>
                  )}

                  <Typography
                    sx={{
                      fontSize: "20px",
                      color: mainButtonColor,
                      fontWeight: "bold",
                      mt: 3,
                    }}
                  >
                    Father's Contact Information
                  </Typography>
                  <hr style={{ border: "1px solid #ccc", width: "100%" }} />
                  <br />

                  <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
                    {/* Father Contact */}
                    <Box flex={1} display="flex" flexDirection="column">
                      <Typography variant="subtitle2" mb={0.5}>
                        Contacts<span style={{ color: "red" }}> *</span>
                      </Typography>

                      <TextField
                        fullWidth
                        size="small"
                        name="father_contact"
                        placeholder="9XXXXXXXXX"
                        value={person.father_contact || ""}
                        onBlur={() => handleUpdate(person)}
                        onChange={(e) => {
                          const onlyNumbers = e.target.value.replace(/\D/g, "");
                          handleChange({
                            target: {
                              name: "father_contact",
                              value: onlyNumbers,
                            },
                          });
                        }}
                        error={!!errors.father_contact}
                        helperText={
                          errors.father_contact && "This field is required."
                        }
                        InputProps={{
                          startAdornment: (
                            <Typography sx={{ mr: 1, fontWeight: "bold" }}>
                              +63
                            </Typography>
                          ),
                        }}
                      />
                    </Box>

                    {/* Father Occupation */}
                    <Box flex={1}>
                      <Typography variant="subtitle2" mb={0.5}>
                        Occupation<span style={{ color: "red" }}> *</span>
                      </Typography>
                      <TextField
                        fullWidth
                        size="small"
                        required
                        name="father_occupation"
                        value={person.father_occupation || ""}
                        placeholder="Enter Father Occupation"
                        onChange={handleChange}
                        onBlur={() => handleUpdate(person)}
                        error={errors.father_occupation}
                        helperText={
                          errors.father_occupation
                            ? "This field is required."
                            : ""
                        }
                      />
                    </Box>

                    {/* Father Employer */}
                    <Box flex={1}>
                      <Typography variant="subtitle2" mb={0.5}>
                        Employer<span style={{ color: "red" }}> *</span>
                      </Typography>
                      <TextField
                        fullWidth
                        size="small"
                        required
                        name="father_employer"
                        placeholder="Enter Father Employer"
                        value={person.father_employer || ""}
                        onChange={handleChange}
                        onBlur={() => handleUpdate(person)}
                        error={errors.father_employer}
                        helperText={
                          errors.father_employer
                            ? "This field is required."
                            : ""
                        }
                      />
                    </Box>

                    {/* Father Income */}
                    <Box flex={1}>
                      <Typography variant="subtitle2" mb={0.5}>
                        Monthly Income<span style={{ color: "red" }}> *</span>
                      </Typography>

                      <TextField
                        fullWidth
                        size="small"
                        required
                        type="number"
                        name="father_income"
                        placeholder="Enter Father Income"
                        value={person.father_income ?? ""}
                        onChange={(e) => {
                          const num =
                            e.target.value === ""
                              ? null
                              : Number(e.target.value);
                          handleChange({
                            target: {
                              name: "father_income",
                              value: num,
                            },
                          });
                        }}
                        onBlur={() => handleUpdate(person)}
                        error={errors.father_income}
                        helperText={
                          errors.father_income ? "This field is required." : ""
                        }
                      />
                    </Box>

                    {/* Father Email */}
                  </Box>

                  <Box flex={1}>
                    <Typography variant="subtitle2" mb={0.5}>
                      Email Address
                    </Typography>
                    <TextField
                      fullWidth
                      size="small"
                      required
                      name="father_email"
                      placeholder="Enter Father Email Address"
                      value={person.father_email || ""}
                      onChange={(e) => {
                        const cleaned = e.target.value.replace(/\s/g, "");
                        handleChange({
                          target: { name: "father_email", value: cleaned },
                        });
                      }}
                      onBlur={(e) => {
                        let value = e.target.value.trim();
                        if (value && !value.includes("@")) {
                          value += "@gmail.com";
                        }
                        handleChange({
                          target: { name: "father_email", value },
                        });
                        handleUpdate(person);
                      }}
                    />
                  </Box>
                </>
              )}
            </Box>

            <Typography
              style={{
                fontSize: "20px",
                color: mainButtonColor,
                fontWeight: "bold",
              }}
            >
              Mother's Details (Maiden)
            </Typography>
            <hr style={{ border: "1px solid #ccc", width: "100%" }} />
            <br />
            <Box sx={{ mb: 2 }}>
              {/* Mother Deceased Checkbox */}

              <FormControlLabel
                control={
                  <Checkbox
                    name="mother_deceased"
                    value={person.mother_deceased || ""} // 👈 Added value
                    checked={person.mother_deceased === 1}
                    onChange={(e) => {
                      const checked = e.target.checked;

                      // Call your form handler
                      handleChange(e);

                      // Update local state
                      setPerson((prev) => ({
                        ...prev,
                        mother_deceased: checked ? 1 : 0,
                      }));
                    }}
                    onBlur={() => handleUpdate(person)}
                  />
                }
                label="Mother Seperated / Deceased"
              />
              <br />

              {/* Show Mother's Info ONLY if not deceased */}
              {!isMotherDeceased && (
                <>
                  <Box sx={{ display: "flex", gap: 2, mt: 2 }}>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="subtitle2" mb={1}>
                        Last Name<span style={{ color: "red" }}> *</span>
                      </Typography>
                      <TextField
                        fullWidth
                        size="small"
                        required
                        name="mother_family_name"
                        placeholder="Enter your Mother Last Name"
                        value={person.mother_family_name || ""}
                        onChange={handleChange}
                        onBlur={() => handleUpdate(person)}
                        error={errors.mother_family_name}
                        helperText={
                          errors.mother_family_name
                            ? "This field is required."
                            : ""
                        }
                      />
                    </Box>

                    <Box sx={{ flex: 1 }}>
                      <Typography variant="subtitle2" mb={1}>
                        First Name<span style={{ color: "red" }}> *</span>
                      </Typography>
                      <TextField
                        fullWidth
                        size="small"
                        required
                        name="mother_given_name"
                        placeholder="Enter your Mother First Name"
                        value={person.mother_given_name || ""}
                        onChange={handleChange}
                        onBlur={() => handleUpdate(person)}
                        error={errors.mother_given_name}
                        helperText={
                          errors.mother_given_name
                            ? "This field is required."
                            : ""
                        }
                      />
                    </Box>

                    <Box sx={{ flex: 1 }}>
                      <Typography variant="subtitle2" mb={1}>
                        Middle Name<span style={{ color: "red" }}> *</span>
                      </Typography>
                      <TextField
                        fullWidth
                        size="small"
                        required
                        name="mother_middle_name"
                        placeholder="Enter your Mother Middle Name"
                        value={person.mother_middle_name || ""}
                        onChange={handleChange}
                        onBlur={() => handleUpdate(person)}
                      />
                    </Box>

                    {/* Mother Extension */}
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="subtitle2" mb={1}>
                        Name Extension
                      </Typography>
                      <FormControl fullWidth size="small">
                        <Select
                          labelId="mother-ext-label"
                          id="mother_ext"
                          name="mother_ext"
                          value={person.mother_ext || ""}
                          onChange={handleChange}
                          onBlur={() => handleUpdate(person)}
                        >
                          <MenuItem value="">
                            <em>Select Extension</em>
                          </MenuItem>
                          <MenuItem value="Jr.">Jr.</MenuItem>
                          <MenuItem value="Sr.">Sr.</MenuItem>
                          <MenuItem value="I">I</MenuItem>
                          <MenuItem value="II">II</MenuItem>
                          <MenuItem value="III">III</MenuItem>
                          <MenuItem value="IV">IV</MenuItem>
                          <MenuItem value="V">V</MenuItem>
                        </Select>
                      </FormControl>
                    </Box>

                    <Box sx={{ flex: 1 }}>
                      <Typography variant="subtitle2" mb={1}>
                        Nickname
                      </Typography>
                      <TextField
                        fullWidth
                        size="small"
                        required
                        name="mother_nickname"
                        placeholder="Enter your Mother Nickname"
                        value={person.mother_nickname || ""}
                        onChange={handleChange}
                        onBlur={() => handleUpdate(person)}
                      />
                    </Box>
                  </Box>

                  <Typography
                    sx={{
                      fontSize: "20px",
                      color: "#6D2323",
                      fontWeight: "bold",
                      mt: 3,
                    }}
                  >
                    Mother's Educational Background
                  </Typography>
                  <hr style={{ border: "1px solid #ccc", width: "100%" }} />
                  <br />

                  <Box display="flex" gap={3} alignItems="center">
                    {/* Mother's Education Not Applicable Checkbox */}
                    <Checkbox
                      name="mother_education"
                      checked={person.mother_education === 1}
                      onChange={(e) => {
                        const isChecked = e.target.checked;

                        const updatedPerson = {
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

                        setPerson(updatedPerson);
                        handleUpdate(updatedPerson); // Optional: Immediate save
                      }}
                      onBlur={() => handleUpdate(person)}
                      sx={{ width: 25, height: 25 }}
                    />
                    <label style={{ fontFamily: "Poppins, sans-serif" }}>
                      Mother's education not applicable
                    </label>
                  </Box>

                  {/* Mother Educational Details (conditionally rendered) */}
                  {person.mother_education !== 1 && (
                    <Box
                      sx={{
                        display: "flex",
                        gap: 2,
                        mt: 2,
                        flexWrap: "nowrap",
                      }}
                    >
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="subtitle2" mb={1}>
                          Educational Attainment
                          <span style={{ color: "red" }}> *</span>
                        </Typography>
                        <TextField
                          fullWidth
                          size="small"
                          name="mother_education_level"
                          placeholder="Enter your Mother Education Level"
                          value={person.mother_education_level || ""}
                          onChange={handleChange}
                          onBlur={() => handleUpdate(person)}
                          error={errors.mother_education_level}
                          helperText={
                            errors.mother_education_level
                              ? "This field is required."
                              : ""
                          }
                        />
                      </Box>

                      <Box sx={{ flex: 1 }}>
                        <Typography variant="subtitle2" mb={1}>
                          Last School Attended
                          <span style={{ color: "red" }}> *</span>
                        </Typography>
                        <TextField
                          fullWidth
                          size="small"
                          name="mother_last_school"
                          placeholder="Enter your Mother Last School Attended"
                          value={person.mother_last_school || ""}
                          onChange={handleChange}
                          onBlur={() => handleUpdate(person)}
                          error={errors.mother_last_school}
                          helperText={
                            errors.mother_last_school
                              ? "This field is required."
                              : ""
                          }
                        />
                      </Box>

                      <Box sx={{ flex: 1 }}>
                        <Typography variant="subtitle2" mb={1}>
                          Course<span style={{ color: "red" }}> *</span>
                        </Typography>
                        <TextField
                          fullWidth
                          size="small"
                          name="mother_course"
                          placeholder="Enter your Mother Course"
                          value={person.mother_course || ""}
                          onChange={handleChange}
                          onBlur={() => handleUpdate(person)}
                          error={errors.mother_course}
                          helperText={
                            errors.mother_course
                              ? "This field is required."
                              : ""
                          }
                        />
                      </Box>

                      <Box sx={{ flex: 1 }}>
                        <Typography variant="subtitle2" mb={1}>
                          Year Graduated<span style={{ color: "red" }}> *</span>
                        </Typography>
                        <TextField
                          fullWidth
                          size="small"
                          type="number"
                          name="mother_year_graduated"
                          placeholder="Enter your Mother Year Graduated"
                          value={person.mother_year_graduated || ""}
                          onChange={handleChange}
                          onBlur={() => handleUpdate(person)}
                          error={errors.mother_year_graduated}
                          helperText={
                            errors.mother_year_graduated
                              ? "This field is required."
                              : ""
                          }
                        />
                      </Box>

                      <Box sx={{ flex: 1 }}>
                        <Typography
                          variant="subtitle2"
                          mb={1.8}
                          sx={{
                            fontSize: "10px",
                            whiteSpace: "nowrap", // 👉 never wraps
                            overflow: "hidden",
                            textOverflow: "ellipsis", // 👉 adds "..."
                          }}
                        >
                          School Full Address (St/ Brgy / City)
                          <span style={{ color: "red" }}> *</span>
                        </Typography>

                        <TextField
                          fullWidth
                          size="small"
                          name="mother_school_address"
                          placeholder="Enter your Mother School Address"
                          value={person.mother_school_address || ""}
                          onChange={handleChange}
                          onBlur={() => handleUpdate(person)}
                          error={errors.mother_school_address}
                          helperText={
                            errors.mother_school_address
                              ? "This field is required."
                              : ""
                          }
                        />
                      </Box>
                    </Box>
                  )}

                  <Typography
                    sx={{
                      fontSize: "20px",
                      color: "#6D2323",
                      fontWeight: "bold",
                      mt: 3,
                    }}
                  >
                    Mother's Contact Information
                  </Typography>
                  <hr style={{ border: "1px solid #ccc", width: "100%" }} />
                  <br />

                  <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
                    {/* Mother Contact */}
                    <Box flex={1} display="flex" flexDirection="column">
                      <Typography variant="subtitle2" mb={0.5}>
                        Contacts<span style={{ color: "red" }}> *</span>
                      </Typography>

                      <TextField
                        fullWidth
                        size="small"
                        name="mother_contact"
                        placeholder="9XXXXXXXXX"
                        value={person.mother_contact || ""}
                        onBlur={() => handleUpdate(person)}
                        onChange={(e) => {
                          const onlyNumbers = e.target.value.replace(/\D/g, "");
                          handleChange({
                            target: {
                              name: "mother_contact",
                              value: onlyNumbers,
                            },
                          });
                        }}
                        error={!!errors.mother_contact}
                        helperText={
                          errors.mother_contact && "This field is required."
                        }
                        InputProps={{
                          startAdornment: (
                            <Typography sx={{ mr: 1, fontWeight: "bold" }}>
                              +63
                            </Typography>
                          ),
                        }}
                      />
                    </Box>

                    {/* Mother Occupation */}
                    <Box flex={1}>
                      <Typography variant="subtitle2" mb={0.5}>
                        Occupation<span style={{ color: "red" }}> *</span>
                      </Typography>
                      <TextField
                        fullWidth
                        size="small"
                        required
                        name="mother_occupation"
                        placeholder="Enter Mother Occupation"
                        value={person.mother_occupation || ""}
                        onChange={handleChange}
                        onBlur={() => handleUpdate(person)}
                        error={errors.mother_occupation}
                        helperText={
                          errors.mother_occupation
                            ? "This field is required."
                            : ""
                        }
                      />
                    </Box>

                    {/* Mother Employer */}
                    <Box flex={1}>
                      <Typography variant="subtitle2" mb={0.5}>
                        Employer<span style={{ color: "red" }}> *</span>
                      </Typography>
                      <TextField
                        fullWidth
                        size="small"
                        required
                        name="mother_employer"
                        placeholder="Enter Mother Employer"
                        value={person.mother_employer || ""}
                        onChange={handleChange}
                        onBlur={() => handleUpdate(person)}
                        error={errors.mother_employer}
                        helperText={
                          errors.mother_employer
                            ? "This field is required."
                            : ""
                        }
                      />
                    </Box>

                    {/* Mother Income */}
                    <Box flex={1}>
                      <Typography variant="subtitle2" mb={0.5}>
                        Monthly Income<span style={{ color: "red" }}> *</span>
                      </Typography>

                      <TextField
                        fullWidth
                        size="small"
                        required
                        type="number"
                        name="mother_income"
                        placeholder="Enter Mother Income"
                        value={person.mother_income ?? ""}
                        onChange={(e) => {
                          const num =
                            e.target.value === ""
                              ? null
                              : Number(e.target.value);
                          handleChange({
                            target: {
                              name: "mother_income",
                              value: num,
                            },
                          });
                        }}
                        onBlur={() => handleUpdate(person)}
                        error={errors.mother_income}
                        helperText={
                          errors.mother_income ? "This field is required." : ""
                        }
                      />
                    </Box>

                    {/* Mother Email */}
                  </Box>

                  <Box flex={1}>
                    <Typography variant="subtitle2" mb={0.5}>
                      Email Address
                    </Typography>
                    <TextField
                      fullWidth
                      size="small"
                      required
                      name="mother_email"
                      placeholder="Enter Mother Email"
                      value={person.mother_email || ""}
                      onChange={(e) => {
                        const cleaned = e.target.value.replace(/\s/g, "");
                        handleChange({
                          target: { name: "mother_email", value: cleaned },
                        });
                      }}
                      onBlur={(e) => {
                        let value = e.target.value.trim();
                        if (value && !value.includes("@")) {
                          value += "@gmail.com";
                        }
                        handleChange({
                          target: { name: "mother_email", value },
                        });

                        handleUpdate(person);
                      }}
                    />
                  </Box>
                </>
              )}
            </Box>

            <Typography
              style={{
                fontSize: "20px",
                color: mainButtonColor,
                fontWeight: "bold",
              }}
            >
              In Case of Emergency
            </Typography>
            <hr style={{ border: "1px solid #ccc", width: "100%" }} />
            <br />

            <Box sx={{ flex: 1 }}>
              <Typography variant="subtitle2" mb={1}>
                Guardian<span style={{ color: "red" }}> *</span>
              </Typography>
              <FormControl
                style={{ marginBottom: "10px", width: "200px" }}
                size="small"
                required
                error={!!errors.guardian}
              >
                <InputLabel id="guardian-label">Guardian</InputLabel>
                <Select
                  labelId="guardian-label"
                  id="guardian"
                  name="guardian"
                  value={person.guardian || ""}
                  label="Guardian"
                  onChange={handleGuardianChange}
                  onBlur={() => handleUpdate(person)}
                >
                  <MenuItem value="">
                    <em>Select Guardian</em>
                  </MenuItem>
                  <MenuItem value="Father">Father</MenuItem>
                  <MenuItem value="Mother">Mother</MenuItem>
                  <MenuItem value="Brother/Sister">Brother/Sister</MenuItem>
                  <MenuItem value="Uncle">Uncle</MenuItem>
                  <MenuItem value="Aunt">Aunt</MenuItem>
                  <MenuItem value="StepFather">Stepfather</MenuItem>
                  <MenuItem value="StepMother">Stepmother</MenuItem>
                  <MenuItem value="Cousin">Cousin</MenuItem>
                  <MenuItem value="Father in Law">Father-in-law</MenuItem>
                  <MenuItem value="Mother in Law">Mother-in-law</MenuItem>
                  <MenuItem value="Sister in Law">Sister-in-law</MenuItem>
                  <MenuItem value="Sister in Law">Brother-in-law</MenuItem>
                  <MenuItem value="GrandMother">GrandMother</MenuItem>
                  <MenuItem value="GrandFather">GrandFather</MenuItem>
                  <MenuItem value="Spouse">Spouse</MenuItem>
                  <MenuItem value="Others">Others</MenuItem>
                </Select>
              </FormControl>
            </Box>

            <Box sx={{ display: "flex", gap: 2, mb: 2, flexWrap: "nowrap" }}>
              {/* Guardian Family Name */}
              <Box sx={{ flex: 1 }}>
                <Typography variant="subtitle2" mb={1}>
                  Last Name<span style={{ color: "red" }}> *</span>
                </Typography>
                <TextField
                  fullWidth
                  size="small"
                  required
                  name="guardian_family_name"
                  placeholder="Enter your Guardian Family Name"
                  value={person.guardian_family_name || ""}
                  onChange={handleChange}
                  onBlur={() => handleUpdate(person)}
                  error={!!errors.guardian_family_name}
                  helperText={
                    errors.guardian_family_name ? "This field is required." : ""
                  }
                />
              </Box>

              {/* Guardian First Name */}
              <Box sx={{ flex: 1 }}>
                <Typography variant="subtitle2" mb={1}>
                  First Name<span style={{ color: "red" }}> *</span>
                </Typography>
                <TextField
                  fullWidth
                  size="small"
                  required
                  name="guardian_given_name"
                  placeholder="Enter your Guardian First Name"
                  value={person.guardian_given_name || ""}
                  onChange={handleChange}
                  onBlur={() => handleUpdate(person)}
                  error={!!errors.guardian_given_name}
                  helperText={
                    errors.guardian_given_name ? "This field is required." : ""
                  }
                />
              </Box>

              {/* Guardian Middle Name */}
              <Box sx={{ flex: 1 }}>
                <Typography variant="subtitle2" mb={1}>
                  Middle Name
                </Typography>
                <TextField
                  fullWidth
                  size="small"
                  required
                  name="guardian_middle_name"
                  placeholder="Enter your Guardian Middle Name"
                  value={person.guardian_middle_name || ""}
                  onChange={handleChange}
                  onBlur={() => handleUpdate(person)}
                />
              </Box>

              {/* Guardian Name Extension */}
              <Box sx={{ flex: 1 }}>
                <Typography variant="subtitle2" mb={1}>
                  Name Extension
                </Typography>
                <FormControl
                  fullWidth
                  size="small"
                  required
                  error={!!errors.guardian_ext}
                >
                  <Select
                    labelId="guardian-ext-label"
                    id="guardian_ext"
                    name="guardian_ext"
                    value={person.guardian_ext || ""}
                    onChange={handleChange}
                    onBlur={() => handleUpdate(person)}
                  >
                    <MenuItem value="">
                      <em>Select Extension</em>
                    </MenuItem>
                    <MenuItem value="Jr.">Jr.</MenuItem>
                    <MenuItem value="Sr.">Sr.</MenuItem>
                    <MenuItem value="I">I</MenuItem>
                    <MenuItem value="II">II</MenuItem>
                    <MenuItem value="III">III</MenuItem>
                    <MenuItem value="IV">IV</MenuItem>
                    <MenuItem value="V">V</MenuItem>
                  </Select>
                  {errors.guardian_ext && (
                    <FormHelperText>This field is required.</FormHelperText>
                  )}
                </FormControl>
              </Box>

              {/* Guardian Nickname */}
              <Box sx={{ flex: 1 }}>
                <Typography variant="subtitle2" mb={1}>
                  Nickname
                </Typography>
                <TextField
                  fullWidth
                  size="small"
                  required
                  name="guardian_nickname"
                  placeholder="Enter your Guardian Nickname"
                  value={person.guardian_nickname || ""}
                  onChange={handleChange}
                  onBlur={() => handleUpdate(person)}
                  error={!!errors.guardian_nickname}
                  helperText={
                    errors.guardian_nickname ? "This field is required." : ""
                  }
                />
              </Box>
            </Box>

            <Typography
              style={{
                fontSize: "20px",
                color: mainButtonColor,
                fontWeight: "bold",
              }}
            >
              Guardian's Contact Information
            </Typography>
            <hr style={{ border: "1px solid #ccc", width: "100%" }} />
            <br />

            <Box sx={{ width: "100%", mb: 2 }}>
              <Typography variant="subtitle2" mb={1}>
                Present Address<span style={{ color: "red" }}> *</span>
              </Typography>
              <TextField
                fullWidth
                size="small"
                required
                name="guardian_address"
                placeholder="Enter your Guardian Address"
                value={person.guardian_address || ""}
                onChange={handleChange}
                onBlur={() => handleUpdate(person)}
                error={errors.guardian_address}
                helperText={
                  errors.guardian_address ? "This field is required." : ""
                }
              />
            </Box>

            <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
              {/* Guardian Contact */}
              <Box flex={1} display="flex" flexDirection="column">
                <Typography variant="subtitle2" mb={0.5}>
                  Contacts<span style={{ color: "red" }}> *</span>
                </Typography>

                <TextField
                  fullWidth
                  size="small"
                  name="guardian_contact"
                  placeholder="9XXXXXXXXX"
                  value={person.guardian_contact || ""}
                  onChange={(e) => {
                    const onlyNumbers = e.target.value.replace(/\D/g, ""); // numbers only
                    handleChange({
                      target: {
                        name: "guardian_contact",
                        value: onlyNumbers,
                      },
                    });
                  }}
                  onBlur={() => handleUpdate(person)}
                  error={!!errors.guardian_contact}
                  helperText={
                    errors.guardian_contact && "This field is required."
                  }
                  InputProps={{
                    startAdornment: (
                      <Typography sx={{ mr: 1, fontWeight: "bold" }}>
                        +63
                      </Typography>
                    ),
                  }}
                />
              </Box>

              {/* Guardian Email */}
              <Box flex={1} display="flex" flexDirection="column">
                <Typography variant="subtitle2" mb={0.5}>
                  Email Address
                </Typography>

                <TextField
                  fullWidth
                  size="small"
                  required
                  name="guardian_email"
                  placeholder="Enter Guardian Email (e.g., username@gmail.com)"
                  value={person.guardian_email || ""}
                  onChange={(e) => {
                    const cleaned = e.target.value.replace(/\s/g, "");
                    handleChange({
                      target: { name: "guardian_email", value: cleaned },
                    });
                  }}
                  onBlur={(e) => {
                    let value = e.target.value.trim();

                    if (value && !value.includes("@")) {
                      value += "@gmail.com"; // auto-domain
                    }

                    handleChange({
                      target: { name: "guardian_email", value },
                    });

                    handleUpdate(person);
                  }}
                  error={errors.guardian_email}
                  helperText={
                    errors.guardian_email
                      ? "Please enter a valid email address."
                      : ""
                  }
                />
              </Box>
            </Box>

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
                />
              }
              label="Check if there's no siblings"
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
                      backgroundColor: "#fff",
                    }}
                  >
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                      <Typography fontWeight="bold">Sibling {index + 1}</Typography>
                      <Button
                        size="small"
                        variant="outlined"
                        color="error"
                        onClick={() => removeSibling(index)}
                        sx={{ minWidth: 36 }}
                      >
                        − Remove
                      </Button>
                    </Box>

                    <Box display="flex" gap={2} flexWrap="wrap" mb={2}>
                      <Box flex="1 1 30%">
                        <Typography variant="subtitle2" mb={0.5}>Name of Sibling</Typography>
                        <TextField
                          fullWidth
                          size="small"
                          placeholder="Enter Sibling Name"
                          value={sibling.name || ""}
                          onChange={(e) => handleSiblingFieldChange(index, "name", e.target.value)}
                          onBlur={handleSiblingFieldBlur}
                        />
                      </Box>

                      <Box flex="1 1 10%">
                        <Typography variant="subtitle2" mb={0.5}>Age</Typography>
                        <TextField
                          fullWidth
                          size="small"
                          type="number"
                          placeholder="Age"
                          value={sibling.age || ""}
                          onChange={(e) => handleSiblingFieldChange(index, "age", e.target.value)}
                          onBlur={handleSiblingFieldBlur}
                        />
                      </Box>

                      <Box flex="1 1 20%">
                        <Typography variant="subtitle2" mb={0.5}>School Level</Typography>
                        <TextField
                          fullWidth
                          size="small"
                          placeholder="e.g. College"
                          value={sibling.schoolLevel || ""}
                          onChange={(e) => handleSiblingFieldChange(index, "schoolLevel", e.target.value)}
                          onBlur={handleSiblingFieldBlur}
                        />
                      </Box>

                      <Box flex="1 1 30%">
                        <Typography variant="subtitle2" mb={0.5}>School Last Attended</Typography>
                        <TextField
                          fullWidth
                          size="small"
                          placeholder="Enter School Last Attended"
                          value={sibling.schoolLastAttended || ""}
                          onChange={(e) => handleSiblingFieldChange(index, "schoolLastAttended", e.target.value)}
                          onBlur={handleSiblingFieldBlur}
                        />
                      </Box>

                      <Box flex="1 1 45%">
                        <Typography variant="subtitle2" mb={0.5}>School Address</Typography>
                        <TextField
                          fullWidth
                          size="small"
                          placeholder="Enter School Address"
                          value={sibling.schoolAddress || ""}
                          onChange={(e) => handleSiblingFieldChange(index, "schoolAddress", e.target.value)}
                          onBlur={handleSiblingFieldBlur}
                        />
                      </Box>

                      <Box flex="1 1 25%">
                        <Typography variant="subtitle2" mb={0.5}>Occupation</Typography>
                        <TextField
                          fullWidth
                          size="small"
                          placeholder="Enter Occupation"
                          value={sibling.occupation || ""}
                          onChange={(e) => handleSiblingFieldChange(index, "occupation", e.target.value)}
                          onBlur={handleSiblingFieldBlur}
                        />
                      </Box>

                      <Box flex="1 1 25%">
                        <Typography variant="subtitle2" mb={0.5}>Monthly Income</Typography>
                        <TextField
                          fullWidth
                          size="small"
                          type="number"
                          placeholder="Enter Monthly Income"
                          value={sibling.monthlyIncome || ""}
                          onChange={(e) => handleSiblingFieldChange(index, "monthlyIncome", e.target.value)}
                          onBlur={handleSiblingFieldBlur}
                        />
                      </Box>
                    </Box>
                  </Box>
                ))}

                <Button
                  variant="contained"
                  onClick={addSibling}
                  sx={{
                    backgroundColor: mainButtonColor,
                    border: `1px solid ${borderColor}`,
                    color: "#fff",
                    mb: 2,
                    "&:hover": { backgroundColor: "#000" },
                  }}
                >
                  + Add Sibling
                </Button>
              </>
            )}

            <br />

            <Typography
              style={{
                fontSize: "20px",
                color: mainButtonColor,
                fontWeight: "bold",
              }}
            >
              Family (Annual Income)
            </Typography>
            <hr style={{ border: "1px solid #ccc", width: "100%" }} />
            <br />

            {/* Annual Income */}
            <Box sx={{ width: "100%", mb: 2 }}>
              <Typography variant="subtitle2" mb={1}>
                Annual Income<span style={{ color: "red" }}> *</span>
              </Typography>
              <FormControl
                fullWidth
                size="small"
                required
                error={!!errors.annual_income}
              >
                <InputLabel id="annual-income-label">Annual Income</InputLabel>
                <Select
                  labelId="annual-income-label"
                  name="annual_income"
                  value={person.annual_income || ""}
                  label="Annual Income"
                  onChange={handleChange}
                  onBlur={() => handleUpdate(person)}
                >
                  <MenuItem value="">
                    <em>Select Annual Income</em>
                  </MenuItem>
                  <MenuItem value="80,000 and below">80,000 and below</MenuItem>
                  <MenuItem value="80,000 to 135,000">
                    80,000 to 135,000
                  </MenuItem>
                  <MenuItem value="135,000 to 250,000">
                    135,000 to 250,000
                  </MenuItem>
                  <MenuItem value="250,000 to 500,000">
                    250,000 to 500,000
                  </MenuItem>
                  <MenuItem value="500,000 to 1,000,000">
                    500,000 to 1,000,000
                  </MenuItem>
                  <MenuItem value="1,000,000 and above">
                    1,000,000 and above
                  </MenuItem>
                </Select>
                {errors.annual_income && (
                  <FormHelperText>This field is required.</FormHelperText>
                )}
              </FormControl>
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

            <Box display="flex" justifyContent="space-between" mt={4}>
              {/* Previous Step Button */}
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
                    navigate(`/applicant_personal_information/${keys.step1}`);
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
                    "& .MuiSvgIcon-root": {
                      color: "#fff",
                    },
                  },
                }}
              >
                Previous Step
              </Button>

              {/* Next Step Button */}
              <Button
                variant="contained"
                onClick={async () => {
                  await handleUpdate(person);

                  if (isFormValid()) {
                    setSnackbar({
                      open: true,
                      message: "Your record has been saved successfully!",
                      severity: "success",
                    });

                    setTimeout(() => {
                      navigate(`/applicant_educational_attainment/${keys.step3}`);
                    }, 1000);
                  } else {
                    setSnackbar({
                      open: true,
                      message:
                        "Please complete all required fields before proceeding.",
                      severity: "error",
                    });
                  }
                }}
                endIcon={
                  <ArrowForwardIcon
                    sx={{
                      color: "#fff",
                      transition: "color 0.3s",
                    }}
                  />
                }
                sx={{
                  backgroundColor: mainButtonColor,
                  border: `1px solid ${borderColor}`,
                  color: "#fff",
                  "&:hover": {
                    backgroundColor: "#000000",
                    color: "#fff",
                    "& .MuiSvgIcon-root": {
                      color: "#fff",
                    },
                  },
                }}
              >
                Next Step
              </Button>
            </Box>
            <Snackbar
              open={snackbar.open}
              autoHideDuration={1000} // 3 seconds
              onClose={() =>
                setSnackbar((prev) => ({ ...prev, open: false }))
              }
              anchorOrigin={{ vertical: "top", horizontal: "center" }}
            >
              <Alert
                onClose={() =>
                  setSnackbar((prev) => ({ ...prev, open: false }))
                }
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

export default ApplicantFamilyBackground;
