import React, { useState, useEffect, useContext, useRef } from "react";
import { SettingsContext } from "../App";

import axios from "axios";
import { Button, Box, TextField, Container, Card, Typography, FormHelperText, FormControl, InputLabel, Select, MenuItem, Modal, CircularProgress, } from "@mui/material";
import { Link } from "react-router-dom";
import PersonIcon from "@mui/icons-material/Person";
import FamilyRestroomIcon from "@mui/icons-material/FamilyRestroom";
import SchoolIcon from "@mui/icons-material/School";
import HealthAndSafetyIcon from "@mui/icons-material/HealthAndSafety";
import InfoIcon from "@mui/icons-material/Info";
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import ErrorIcon from '@mui/icons-material/Error';
import { useNavigate } from 'react-router-dom';
import { motion } from "framer-motion";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import ExamPermit from "./ExamPermit";
import API_BASE_URL from "../apiConfig";
import EaristLogo from "../assets/EaristLogo.png";
import { Snackbar, Alert } from "@mui/material";
import DownloadIcon from "@mui/icons-material/Download";
import PersonalDataForm from "./PersonalDataForm";
import OfficeOfTheRegistrar from "./OfficeOfTheRegistrar";
import AdmissionServices from "./ApplicantServicesSurvey";
import ECATApplicationForm from "./ECATApplicationForm";
const ApplicantEducationalAttainment = (props) => {
  const settings = useContext(SettingsContext);
  const colors = settings?.colors || {};
  const branding = settings?.branding || {};
  const assets = settings?.assets || {};
  const headerColor = colors.header || "#1976d2";

  const [titleColor, setTitleColor] = useState("#000000");
  const [subtitleColor, setSubtitleColor] = useState("#555555");
  const [borderColor, setBorderColor] = useState("#000000");
  const [mainButtonColor, setMainButtonColor] = useState("#1976d2");
  const [subButtonColor, setSubButtonColor] = useState("#ffffff");   // ✅ NEW
  const [stepperColor, setStepperColor] = useState("#000000");       // ✅ NEW

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
    if (colors.mainButton) setMainButtonColor(colors.mainButton);
    if (colors.subButton) setSubButtonColor(colors.subButton);   // ✅ NEW
    if (colors.stepper) setStepperColor(colors.stepper);           // ✅ NEW

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

  const applyingAsRaw = localStorage.getItem("applyingAs");

  const requiresSeniorHigh =
    ["1", "2", "3", "4"].includes(String(applyingAsRaw)) ||
    person.classifiedAs === "Freshman (First Year)";

  useEffect(() => {
    if (requiresSeniorHigh && !person.schoolLevel1) {
      setPerson(prev => ({
        ...prev,
        schoolLevel1: "Senior High School"
      }));
    }
  }, [requiresSeniorHigh]);

  // Add this state at the top if not already:
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "warning" });

  // Snackbar close handler
  const handleCloseSnackbar = (event, reason) => {
    if (reason === 'clickaway') return;
    setSnackbar(prev => ({ ...prev, open: false }));
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
    if (keys.step3) {
      navigate(`/applicant_educational_attainment/${keys.step3}`);
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

  const Asterisk = ({ show }) => {
    if (!show) return null;
    return <span style={{ color: "red" }}> *</span>;
  };


  // Do not alter
  const fetchPersonData = async (id) => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/person/${id}`);

      const safePerson = Object.fromEntries(
        Object.entries(res.data).map(([key, val]) => [key, val ?? ""])
      );

      setPerson(safePerson);
    } catch (error) {
      console.error("Failed to fetch person data", error);
    }
  };

  // Do not alter
  const handleUpdate = async (updatedPerson) => {
    try {
      // ✅ Check if data exists before sending
      if (!updatedPerson || Object.keys(updatedPerson).length === 0) {
        console.warn("⚠️ No data to update — skipping PUT request.");
        return;
      }

      console.log("🧠 Sending update:", updatedPerson);

      const response = await axios.put(
        `${API_BASE_URL}/api/person/${userID}`,
        updatedPerson
      );

      console.log("✅ Auto-saved successfully:", response.data);
    } catch (error) {
      console.error(
        "❌ Auto-save failed:",
        error.response?.data || error.message
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



  const keys = JSON.parse(localStorage.getItem("dashboardKeys") || "{}");

  const steps = [
    { label: "Personal Information", icon: <PersonIcon />, path: `/applicant_personal_information/${keys.step1}` },
    { label: "Family Background", icon: <FamilyRestroomIcon />, path: `/applicant_family_background/${keys.step2}` },
    { label: "Educational Attainment", icon: <SchoolIcon />, path: `/applicant_educational_attainment/${keys.step3}` },
    { label: "Health Medical Records", icon: <HealthAndSafetyIcon />, path: `/applicant_health_medical_records/${keys.step4}` },
    { label: "Other Information", icon: <InfoIcon />, path: `/applicant_other_information/${keys.step5}` },
  ];



  const [activeStep, setActiveStep] = useState(2);
  const [clickedSteps, setClickedSteps] = useState(Array(steps.length).fill(false));

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

  const [errors, setErrors] = useState({});

  const isFormValid = () => {
    let requiredFields = [
      // ✅ Always required (Junior High)
      "schoolLevel",
      "schoolLastAttended",
      "schoolAddress",
      "honor",
      "generalAverage",
      "yearGraduated",
    ];

    // ✅ CONDITION: if applyingAs is 1–4 → require Senior High
    if (requiresSeniorHigh) {
      requiredFields.push(
        "schoolLevel1",
        "schoolLastAttended1",
        "schoolAddress1",
        "honor1",
        "generalAverage1",
        "yearGraduated1",
        "strand"
      );
    }

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

    setErrors(newErrors);
    return isValid;
  };


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
      const res = await axios.get(`${API_BASE_URL}/api/verified-exam-applicants`);
      const verified = res.data.some(a => a.person_id === parseInt(userID));

      if (!verified) {
        setExamPermitError("❌ You cannot print the Exam Permit until all required documents are verified.");
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
      setExamPermitError("⚠️ Unable to check document verification status right now.");
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
    axios.get(`${API_BASE_URL}/api/verified-exam-applicants`)
      .then(res => {
        const verified = res.data.some(a => a.person_id === parseInt(userID));
        setCanPrintPermit(verified);
      });
  }, [userID]);


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
          EDUCATIONAL ATTAINMENT
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
          <h1 style={{ fontSize: "50px", fontWeight: "bold", textAlign: "center", color: subtitleColor, marginTop: "25px" }}>APPLICANT FORM</h1>
          <div style={{ textAlign: "center" }}>
            Complete the applicant form to secure your place for the upcoming academic year at{" "}
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
              <Typography style={{ fontSize: "20px", padding: "10px", fontFamily: "Poppins, sans-serif" }}>Step 3: Educational Attainment</Typography>
            </Box>
          </Container>

          <Container maxWidth="100%" sx={{ backgroundColor: "#f1f1f1", border: `1px solid ${borderColor}`, padding: 4, borderRadius: 2, boxShadow: 3 }}>
            <Typography style={{ fontSize: "20px", color: mainButtonColor, fontWeight: "bold" }}>Junior High School - Background:</Typography>
            <hr style={{ border: "1px solid #ccc", width: "100%" }} />
            <br />

            <Box
              sx={{
                display: "flex",
                flexWrap: "nowrap",   // 🔥 forces one row only
                gap: 2,
                mb: 2,
              }}
            >
              {/* Educational Attainment */}
              <Box sx={{ flex: "1" }}>
                <Typography variant="subtitle1" mb={1} sx={{ minHeight: "32px" }}>
                  Educational Attainment<span style={{ color: "red" }}> *</span>
                </Typography>

                <FormControl fullWidth size="small" required error={!!errors.schoolLevel}>
                  <InputLabel id="schoolLevel-label">Educational Attainment</InputLabel>
                  <Select
                    labelId="schoolLevel-label"
                    id="schoolLevel"
                    name="schoolLevel"
                    value={person.schoolLevel ?? ""}
                    label="Educational Attainment"
                    onChange={handleChange}
                    onBlur={() => handleUpdate(person)}
                  >
                    <MenuItem value="">
                      <em>Select School Level</em>
                    </MenuItem>
                    <MenuItem value="High School/Junior High School">
                      High School/Junior High School
                    </MenuItem>
                    <MenuItem value="ALS">ALS</MenuItem>
                  </Select>
                  {errors.schoolLevel && (
                    <FormHelperText>This field is required.</FormHelperText>
                  )}
                </FormControl>
              </Box>

              {/* School Last Attended */}
              <Box sx={{ flex: "1" }}>
                <Typography variant="subtitle1" mb={1} sx={{ minHeight: "32px" }}>
                  School Last Attended<span style={{ color: "red" }}> *</span>
                </Typography>

                <TextField
                  fullWidth
                  size="small"
                  required
                  name="schoolLastAttended"
                  placeholder="Enter School Last Attended"
                  value={person.schoolLastAttended || ""}
                  onChange={handleChange}
                  onBlur={() => handleUpdate(person)}
                  error={errors.schoolLastAttended}
                  helperText={
                    errors.schoolLastAttended ? "This field is required." : ""
                  }
                />
              </Box>

              {/* School Address */}
              <Box sx={{ flex: "1" }}>
                <Typography
                  variant="subtitle1"
                  mb={1}
                  sx={{ minHeight: "32px", fontSize: "12.5px" }}
                >
                  School Full Address (Street / BRGY / City)<span style={{ color: "red" }}> *</span>
                </Typography>

                <TextField
                  fullWidth
                  size="small"
                  required
                  name="schoolAddress"
                  placeholder="Enter your School Address"
                  value={person.schoolAddress || ""}
                  onChange={handleChange}
                  onBlur={() => handleUpdate(person)}
                  error={errors.schoolAddress}
                  helperText={errors.schoolAddress ? "This field is required." : ""}
                />
              </Box>

              {/* Course Program */}
              <Box sx={{ flex: "1" }}>
                <Typography variant="subtitle1" mb={1} sx={{ minHeight: "32px" }}>
                  Course Program
                </Typography>

                <TextField
                  fullWidth
                  size="small"
                  required
                  name="courseProgram"
                  placeholder="Enter your Course Program"
                  value={person.courseProgram || ""}
                  onChange={handleChange}
                  onBlur={() => handleUpdate(person)}
                  error={errors.courseProgram}
                  helperText={errors.courseProgram ? "This field is required." : ""}
                />
              </Box>
            </Box>

            <Box
              sx={{
                display: "flex",
                gap: 2,
                mb: 2,
              }}
            >
              <Box sx={{ flex: "1 1 33%" }}>
                <Typography variant="subtitle1" mb={1}>
                  Recognition / Awards<span style={{ color: "red" }}> *</span>
                </Typography>
                <TextField
                  fullWidth
                  size="small"
                  name="honor"
                  required
                  value={person.honor || ""}
                  placeholder="Enter your Recognition / Awards"
                  onChange={handleChange}
                  onBlur={() => handleUpdate(person)}

                  error={errors.honor}
                  helperText={errors.honor ? "This field is required." : ""}
                />
              </Box>

              <Box sx={{ flex: "1 1 33%" }}>
                <Typography variant="subtitle1" mb={1}>
                  General Average<span style={{ color: "red" }}> *</span>
                </Typography>
                <TextField
                  fullWidth
                  size="small"
                  required
                  name="generalAverage"
                  type="number"           // <-- allow number input
                  inputProps={{
                    step: "0.01",         // <-- allow decimal numbers
                    min: 0,               // optional: restrict negative values
                    max: 100              // optional: restrict max value
                  }}
                  value={person.generalAverage || ""}
                  placeholder="Enter your General Average"
                  onChange={handleChange}
                  onBlur={() => handleUpdate(person)}
                  error={errors.generalAverage}
                  helperText={errors.generalAverage ? "This field is required." : ""}
                />
              </Box>



              <Box sx={{ flex: "1 1 33%" }}>
                <Typography variant="subtitle1" mb={1}>
                  Year Graduated<span style={{ color: "red" }}> *</span>
                </Typography>
                <TextField
                  fullWidth
                  size="small"
                  required
                  name="yearGraduated"
                  type="number" // restrict to numbers
                  inputProps={{
                    min: 1900,          // optional: earliest acceptable year
                    max: new Date().getFullYear(), // optional: current year
                    step: 1             // only allow whole numbers
                  }}
                  placeholder="Enter your Year Graduated"
                  value={person.yearGraduated || ""}
                  onChange={handleChange}
                  onBlur={() => handleUpdate(person)}
                  error={errors.yearGraduated}
                  helperText={errors.yearGraduated ? "This field is required." : ""}
                />
              </Box>

            </Box>





            <Typography style={{ fontSize: "20px", color: mainButtonColor, fontWeight: "bold" }}>Senior High School - Background:</Typography>
            <hr style={{ border: "1px solid #ccc", width: "100%" }} />
            <br />

            <Box
              sx={{
                display: "flex",
                flexWrap: "nowrap",
                gap: 2,
                mb: 2,
              }}
            >
              {/* School Level 1 */}
              <Box sx={{ flex: "1" }}>
                <Typography variant="subtitle1" mb={1} sx={{ minHeight: "32px" }}>
                  Educational Attainment <Asterisk show={requiresSeniorHigh} />
                </Typography>

                <FormControl fullWidth size="small" >
                  <InputLabel id="schoolLevel1-label">Educational Attainment</InputLabel>
                  <Select
                    labelId="schoolLevel1-label"
                    id="schoolLevel1"
                    name="schoolLevel1"
                    value={person.schoolLevel1 ?? ""}
                    label="Educational Attainment"
                    onChange={handleChange}
                    onBlur={() => handleUpdate(person)}
                  >
                    <MenuItem value="">
                      <em>Select School Level</em>
                    </MenuItem>
                    <MenuItem value="Senior High School">Senior High School</MenuItem>
                    <MenuItem value="Undergraduate">Undergraduate</MenuItem>
                    <MenuItem value="Graduate">Graduate</MenuItem>
                    <MenuItem value="ALS">ALS</MenuItem>
                  </Select>


                </FormControl>
              </Box>

              {/* School Last Attended 1 */}
              <Box sx={{ flex: "1" }}>
                <Typography variant="subtitle1" mb={1} sx={{ minHeight: "32px" }}>
                  School Last Attended <Asterisk show={requiresSeniorHigh} />
                </Typography>

                <TextField
                  fullWidth
                  size="small"
                  required
                  name="schoolLastAttended1"
                  placeholder="Enter School Last Attended"
                  error={errors.schoolLastAttended1}
                  helperText={errors.schoolLastAttended1 ? "This field is required." : ""}
                  value={person.schoolLastAttended1 || ""}
                  onChange={handleChange}
                  onBlur={() => handleUpdate(person)}

                />
              </Box>

              {/* School Address 1 */}
              <Box sx={{ flex: "1" }}>
                <Typography
                  variant="subtitle1"
                  mb={1}
                  sx={{ minHeight: "32px", fontSize: "12.5px" }}
                >
                  School Full Address (Street / BRGY / City) <Asterisk show={requiresSeniorHigh} />
                </Typography>

                <TextField
                  fullWidth
                  size="small"
                  required={requiresSeniorHigh}
                  name="schoolAddress1"
                  error={errors.schoolAddress1}
                  helperText={errors.schoolAddress1 ? "This field is required." : ""}
                  placeholder="Enter your School Address"
                  value={person.schoolAddress1 || ""}
                  onChange={handleChange}
                  onBlur={() => handleUpdate(person)}

                />
              </Box>

              {/* Course Program 1 */}
              <Box sx={{ flex: "1" }}>
                <Typography variant="subtitle1" mb={1} sx={{ minHeight: "32px" }}>
                  Course Program <Asterisk show={requiresSeniorHigh} />
                </Typography>

                <TextField
                  fullWidth
                  size="small"
                  required={requiresSeniorHigh}
                  name="courseProgram1"
                  error={errors.courseProgram1}
                  helperText={errors.courseProgram1 ? "This field is required." : ""}
                  placeholder="Enter your Course Program"
                  value={person.courseProgram1 || ""}
                  onChange={handleChange}
                  onBlur={() => handleUpdate(person)}

                />
              </Box>
            </Box>


            <Box
              sx={{
                display: "flex",
                gap: 2,
                mb: 2,
              }}
            >
              {/* Honor 1 */}
              <Box sx={{ flex: "1 1 33%" }}>
                <Typography variant="subtitle1" mb={1}>
                  Recognition / Awards <Asterisk show={requiresSeniorHigh} />
                </Typography>
                <TextField
                  fullWidth
                  size="small"
                  required={requiresSeniorHigh}
                  name="honor1"
                  error={errors.honor1}
                  helperText={errors.honor1 ? "This field is required." : ""}
                  placeholder="Enter your Honor"
                  value={person.honor1 || ""}
                  onChange={handleChange}
                  onBlur={() => handleUpdate(person)}

                />
              </Box>

              {/* General Average 1 */}
              <Box sx={{ flex: "1 1 33%" }}>
                <Typography variant="subtitle1" mb={1}>
                  General Average <Asterisk show={requiresSeniorHigh} />
                </Typography>
                <TextField
                  fullWidth
                  size="small"
                  required={requiresSeniorHigh}
                  name="generalAverage1"
                  error={errors.generalAverage1}
                  helperText={errors.generalAverage1 ? "This field is required." : ""}
                  type="number" // allow only numeric input
                  inputProps={{
                    step: "0.01", // allow decimals
                    min: 0,       // optional: minimum value
                    max: 100      // optional: maximum value
                  }}
                  placeholder="Enter your General Average"
                  value={person.generalAverage1 || ""}
                  onChange={handleChange}
                  onBlur={() => handleUpdate(person)}

                />
              </Box>


              {/* Year Graduated 1 */}
              <Box sx={{ flex: "1 1 33%" }}>
                <Typography variant="subtitle1" mb={1}>
                  Year Graduated <Asterisk show={requiresSeniorHigh} />
                </Typography>
                <TextField
                  fullWidth
                  size="small"
                  required={requiresSeniorHigh}
                  name="yearGraduated1"
                  error={errors.yearGraduated1}
                  helperText={errors.yearGraduated1 ? "This field is required." : ""}
                  type="number" // restrict to numbers
                  inputProps={{
                    min: 1900, // optional: earliest year
                    max: new Date().getFullYear(), // optional: current year
                    step: 1 // only allow whole numbers
                  }}
                  placeholder="Enter your Year Graduated"
                  value={person.yearGraduated1 || ""}
                  onChange={handleChange}
                  onBlur={() => handleUpdate(person)}

                />
              </Box>

            </Box>

            <Typography style={{ fontSize: "20px", color: mainButtonColor, fontWeight: "bold" }}>
              Strand (For Senior High School)
            </Typography>
            <hr style={{ border: "1px solid #ccc", width: "100%" }} />
            <br />

            <Typography variant="subtitle1" mb={1}>
              Strand <Asterisk show={requiresSeniorHigh} />
            </Typography>
            <FormControl fullWidth size="small" className="mb-4">
              <InputLabel id="strand-label">Strand</InputLabel>
              <Select
                labelId="strand-label"
                id="strand-select"
                required={requiresSeniorHigh}
                name="strand"
                error={errors.strand}
                helperText={errors.strand ? "This field is required." : ""}
                value={person.strand ?? ""}
                label="Strand"
                onChange={handleChange}
                onBlur={() => handleUpdate(person)}

              >
                <MenuItem value="">
                  <em>Select Strand</em>
                </MenuItem>
                <MenuItem value="Accountancy, Business and Management (ABM)">
                  Accountancy, Business and Management (ABM)
                </MenuItem>
                <MenuItem value="Humanities and Social Sciences (HUMSS)">
                  Humanities and Social Sciences (HUMSS)
                </MenuItem>
                <MenuItem value="Science, Technology, Engineering, and Mathematics (STEM)">
                  Science, Technology, Engineering, and Mathematics (STEM)
                </MenuItem>
                <MenuItem value="General Academic (GAS)">General Academic (GAS)</MenuItem>
                <MenuItem value="Home Economics (HE)">Home Economics (HE)</MenuItem>
                <MenuItem value="Information and Communications Technology (ICT)">
                  Information and Communications Technology (ICT)
                </MenuItem>
                <MenuItem value="Agri-Fishery Arts (AFA)">Agri-Fishery Arts (AFA)</MenuItem>
                <MenuItem value="Industrial Arts (IA)">Industrial Arts (IA)</MenuItem>
                <MenuItem value="Sports Track">Sports Track</MenuItem>
                <MenuItem value="Design and Arts Track">Design and Arts Track</MenuItem>
              </Select>

            </FormControl>

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
              {/* Previous Step Button */}
              <Button
                variant="contained"
                onClick={async () => {
                  await handleUpdate(person);
                  // Remove isFormValid() check — just save and go back
                  setSnackbar({
                    open: true,
                    message: "Your record has been saved successfully!",
                    severity: "success",
                  });
                  setTimeout(() => {
                    navigate(`/applicant_family_background/${keys.step2}`);
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
                      navigate(`/applicant_health_medical_records/${keys.step4}`);
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
                endIcon={<ArrowForwardIcon sx={{ color: "#fff" }} />}
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


export default ApplicantEducationalAttainment;
