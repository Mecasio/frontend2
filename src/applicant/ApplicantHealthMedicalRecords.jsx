import React, { useState, useEffect, useContext, useRef } from "react";
import { SettingsContext } from "../App";

import axios from "axios";
import { Button, Box, TextField, Container, Typography, Card, Table, TableBody, FormGroup, Modal, FormHelperText, FormControlLabel, Checkbox, TableCell, TableRow, Snackbar, Alert, CircularProgress, } from "@mui/material"; import { Link } from "react-router-dom";
import PersonIcon from "@mui/icons-material/Person";
import FamilyRestroomIcon from "@mui/icons-material/FamilyRestroom";
import SchoolIcon from "@mui/icons-material/School";
import HealthAndSafetyIcon from "@mui/icons-material/HealthAndSafety";
import InfoIcon from "@mui/icons-material/Info";
import ErrorIcon from '@mui/icons-material/Error';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { useNavigate } from 'react-router-dom';
import { motion } from "framer-motion";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import { useLocation } from "react-router-dom";
import ExamPermit from "./ExamPermit";
import API_BASE_URL from "../apiConfig";
import EaristLogo from "../assets/EaristLogo.png";
import DateField from "../components/DateField";
import DownloadIcon from "@mui/icons-material/Download";
import PersonalDataForm from "./PersonalDataForm";
import OfficeOfTheRegistrar from "./OfficeOfTheRegistrar";
import AdmissionServices from "./ApplicantServicesSurvey";
import ECATApplicationForm from "./ECATApplicationForm";
const ApplicantHealthMedicalRecords = (props) => {
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
    cough: "", colds: "", fever: "", asthma: "", faintingSpells: "", heartDisease: "", tuberculosis: "",
    frequentHeadaches: "", hernia: "", chronicCough: "", headNeckInjury: "", hiv: "", highBloodPressure: "",
    diabetesMellitus: "", allergies: "", cancer: "", smokingCigarette: "", alcoholDrinking: "", hospitalized: "",
    hospitalizationDetails: "", medications: "", hadCovid: "", covidDate: "",
    vaccine1Brand: "", vaccine1Date: "", vaccine2Brand: "", vaccine2Date: "",
    booster1Brand: "", booster1Date: "", booster2Brand: "", booster2Date: "",
    chestXray: "", cbc: "", urinalysis: "", otherworkups: "", symptomsToday: "", remarks: ""
  });



  // do not alter
  useEffect(() => {
    const storedUser = localStorage.getItem("email");
    const storedRole = localStorage.getItem("role");
    const storedID = localStorage.getItem("person_id");
    const keys = JSON.parse(localStorage.getItem("dashboardKeys") || "{}");
    if (keys.step4) {
      navigate(`/applicant_health_medical_records/${keys.step4}`);
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


  // Do not alter
  const fetchPersonData = async (id) => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/person/${id}`);
      setPerson(res.data);
    } catch (error) { }
  };


  // Do not alter
  const handleUpdate = async (updatedPerson) => {
    try {
      // ✅ Step 1: Validate that updatedPerson is not empty or undefined
      if (!updatedPerson || Object.keys(updatedPerson).length === 0) {
        console.warn("⚠️ No data to update — skipping request.");
        return;
      }

      // ✅ Step 2: Clean data before sending (convert undefined to null)
      const cleanedData = Object.fromEntries(
        Object.entries(updatedPerson).map(([key, value]) => [
          key,
          value === undefined ? null : value,
        ])
      );

      console.log("📤 Sending update to server:", cleanedData);

      // ✅ Step 3: Send the PUT request to backend
      const response = await axios.put(
        `${API_BASE_URL}/api/person/${userID}`,
        cleanedData
      );

      // ✅ Step 4: Log confirmation
      console.log("✅ Auto-saved successfully:", response.data);
    } catch (error) {
      // ✅ Step 5: Detailed error logging
      console.error(
        "❌ Auto-save failed:",
        error.response?.data || error.message
      );
    }
  };

  const keys = JSON.parse(localStorage.getItem("dashboardKeys") || "{}");

  const steps = [
    { label: "Personal Information", icon: <PersonIcon />, path: `/applicant_personal_information/${keys.step1}` },
    { label: "Family Background", icon: <FamilyRestroomIcon />, path: `/applicant_family_background/${keys.step2}` },
    { label: "Educational Attainment", icon: <SchoolIcon />, path: `/applicant_educational_attainment/${keys.step3}` },
    { label: "Health Medical Records", icon: <HealthAndSafetyIcon />, path: `/applicant_health_medical_records/${keys.step4}` },
    { label: "Other Information", icon: <InfoIcon />, path: `/applicant_other_information/${keys.step5}` },
  ];


  const [activeStep, setActiveStep] = useState(3);
  const [clickedSteps, setClickedSteps] = useState(Array(steps.length).fill(false));



  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  const handleStepClick = async (index) => {
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

  // dot not alter
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
          HEALTH MEDICAL RECORDS
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
              <Typography style={{ fontSize: "20px", padding: "10px", fontFamily: "Poppins, sans-serif" }}>Step 4: Health and Medical Records</Typography>
            </Box>
          </Container>

          <Container maxWidth="100%" sx={{ backgroundColor: "#f1f1f1", border: `1px solid ${borderColor}`, padding: 4, borderRadius: 2, boxShadow: 3 }}>
            <Typography style={{ fontSize: "20px", color: mainButtonColor, fontWeight: "bold" }}>Health and Mecidal Record:</Typography>
            <hr style={{ border: "1px solid #ccc", width: "100%" }} />
            <br />


            <Typography variant="subtitle1" mb={1}>
              <div style={{ fontWeight: "bold" }}>I. Do you have any of the following symptoms today?</div>
            </Typography>

            <FormGroup row sx={{ ml: 2 }}>
              {["cough", "colds", "fever"].map((symptom) => (
                <FormControlLabel
                  key={symptom}
                  control={
                    <Checkbox
                      name={symptom}
                      checked={person[symptom] === 1}
                      onChange={(e) => {
                        const { name, checked } = e.target;
                        const updatedPerson = {
                          ...person,
                          [name]: checked ? 1 : 0,
                        };
                        setPerson(updatedPerson);
                        handleUpdate(updatedPerson);
                      }}
                      onBlur={() => handleUpdate(person)}
                    />
                  }
                  label={symptom.charAt(0).toUpperCase() + symptom.slice(1)}
                  sx={{ ml: 5 }}
                />
              ))}
            </FormGroup>

            <br />

            <Typography variant="subtitle1" mb={1}>
              <div style={{ fontWeight: "bold" }}>II. MEDICAL HISTORY: Have you suffered from, or been told you had, any of the following conditions:</div>
            </Typography>


            <table
              style={{
                width: "100%",
                border: "1px solid black",
                borderCollapse: "collapse",
                fontFamily: "Poppins, sans-serif",
                tableLayout: "fixed",
              }}
            >
              <tbody>
                {/* Headers */}
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
                      {rowGroup.map(({ label, key }) => (
                        <React.Fragment key={key}>
                          <td colSpan={15} style={{ border: "1px solid black", padding: "4px" }}>{label}</td>
                          <td colSpan={12} style={{ border: "1px solid black", padding: "4px" }}>
                            <div style={{ display: "flex", flexDirection: "column", gap: "1px" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "2px", marginLeft: "10px" }}>
                                {/* YES */}
                                <div style={{ display: "flex", alignItems: "center", gap: "1px", }}>
                                  <Checkbox
                                    name={key}
                                    checked={person[key] === 1}
                                    onChange={() => {
                                      const updatedPerson = {
                                        ...person,
                                        [key]: person[key] === 1 ? null : 1,
                                      };
                                      setPerson(updatedPerson);
                                      handleUpdate(updatedPerson);
                                    }}
                                    onBlur={() => handleUpdate(person)}
                                  />
                                  <span style={{ fontSize: "15px", fontFamily: "Poppins, sans-serif" }}>Yes</span>
                                </div>

                                {/* NO */}
                                <div style={{ display: "flex", alignItems: "center", gap: "1px" }}>
                                  <Checkbox
                                    name={key}
                                    checked={person[key] === 0}
                                    onChange={() => {
                                      const updatedPerson = {
                                        ...person,
                                        [key]: person[key] === 0 ? null : 0,
                                      };
                                      setPerson(updatedPerson);
                                      handleUpdate(updatedPerson);
                                    }}
                                    onBlur={() => handleUpdate(person)}
                                  />
                                  <span style={{ fontSize: "15px", fontFamily: "Poppins, sans-serif" }}>No</span>
                                </div>
                              </div>


                            </div>
                          </td>
                        </React.Fragment>
                      ))}
                    </tr>
                  ))}
              </tbody>
            </table>



            <Box mt={1} flexDirection="column" display="flex" alignItems="flex-start">
              <Box mt={1} flexDirection="column" display="flex" alignItems="flex-start">
                <Box display="flex" alignItems="center" flexWrap="wrap">
                  <Typography sx={{ marginRight: '16px' }}>
                    Do you have any previous history of hospitalization or operation?
                  </Typography>

                  <Box display="flex" gap="16px" ml={4} alignItems="center">
                    {/* YES */}
                    <FormControlLabel
                      control={
                        <Checkbox
                          name="hospitalized"
                          checked={person.hospitalized === 1}
                          onChange={() => {
                            const updatedPerson = {
                              ...person,
                              hospitalized: person.hospitalized === 1 ? null : 1,
                            };
                            setPerson(updatedPerson);
                            handleUpdate(updatedPerson);
                          }}
                          onBlur={() => handleUpdate(person)}
                        />
                      }
                      label="Yes"
                    />

                    {/* NO */}
                    <FormControlLabel
                      control={
                        <Checkbox
                          name="hospitalized"
                          checked={person.hospitalized === 0}
                          onChange={() => {
                            const updatedPerson = {
                              ...person,
                              hospitalized: person.hospitalized === 0 ? null : 0,
                            };
                            setPerson(updatedPerson);
                            handleUpdate(updatedPerson);
                          }}
                          onBlur={() => handleUpdate(person)}
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
              </Typography>
              <TextField
                fullWidth
                name="hospitalizationDetails"
                placeholder=""
                variant="outlined"
                size="small"
                value={person.hospitalizationDetails || ""}
                onChange={(e) => {
                  const { name, value } = e.target;
                  const updatedPerson = {
                    ...person,
                    [name]: value,
                  };
                  setPerson(updatedPerson);
                  handleUpdate(updatedPerson);
                }}
                onBlur={() => handleUpdate(person)}
              />
            </Box>

            <br />

            <Typography variant="subtitle1" mb={1}>
              <div style={{ fontWeight: "bold" }}>III. MEDICATION</div>
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
                onChange={(e) => {
                  const { name, value } = e.target;
                  const updatedPerson = {
                    ...person,
                    [name]: value,
                  };
                  setPerson(updatedPerson);
                  handleUpdate(updatedPerson);
                }}
                onBlur={() => handleUpdate(person)}
              />
            </Box>

            {/* IV. COVID PROFILE */}
            <Typography variant="subtitle1" mb={1}>
              <div style={{ fontWeight: "bold" }}>IV. COVID PROFILE: </div>
            </Typography>


            <table
              style={{
                border: "1px solid black",
                borderCollapse: "collapse",
                fontFamily: "Poppins, sans-serif",
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
                    }}
                  >

                    <Box display="flex" alignItems="center" gap={2} flexWrap="nowrap">
                      <Typography>A. Do you have history of COVID-19?</Typography>

                      {/* YES/NO Checkboxes */}
                      <Box display="flex" alignItems="center" gap="10px" ml={1}>
                        {/* YES */}
                        <Box display="flex" alignItems="center" gap="1px">
                          <Checkbox
                            name="hadCovid"
                            checked={person.hadCovid === 1}
                            onChange={() => {
                              const updatedPerson = {
                                ...person,
                                hadCovid: person.hadCovid === 1 ? null : 1,
                              };
                              setPerson(updatedPerson);
                              handleUpdate(updatedPerson);
                            }}
                            onBlur={() => handleUpdate(person)}
                          />
                          <span style={{ fontSize: "15px", fontFamily: "Poppins, sans-serif" }}>YES</span>
                        </Box>

                        {/* NO */}
                        <Box display="flex" alignItems="center" gap="1px">
                          <Checkbox
                            name="hadCovid"
                            checked={person.hadCovid === 0}
                            onChange={() => {
                              const updatedPerson = {
                                ...person,
                                hadCovid: person.hadCovid === 0 ? null : 0,
                              };
                              setPerson(updatedPerson);
                              handleUpdate(updatedPerson);
                            }}
                            onBlur={() => handleUpdate(person)}
                          />
                          <span style={{ fontSize: "15px", fontFamily: "Poppins, sans-serif" }}>NO</span>


                        </Box>
                      </Box>

                      {/* IF YES, WHEN */}
                      <span>IF YES, WHEN:</span>
                      <DateField
                        size="small"
                        name="covidDate"
                        value={person.covidDate || ""}
                        onChange={(e) => {
                          const updatedPerson = {
                            ...person,
                            covidDate: e.target.value,
                          };
                          setPerson(updatedPerson);
                          handleUpdate(updatedPerson);
                        }}
                        onBlur={() => handleUpdate(person)}
                        style={{
                          width: "200px",
                          height: "50px",
                          fontSize: "16px",
                          padding: "10px",
                          border: "1px solid #ccc",
                          borderRadius: "4px",
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
                    <div style={{ marginBottom: "8px" }}>
                      B. COVID Vaccinations:
                    </div>
                    <table
                      style={{
                        borderCollapse: "collapse",
                        width: "100%",
                        fontFamily: "Poppins, sans-serif",
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
                                onChange={(e) => {
                                  const updatedPerson = {
                                    ...person,
                                    [field]: e.target.value,
                                  };
                                  setPerson(updatedPerson);
                                  handleUpdate(updatedPerson);
                                }}
                                onBlur={() => handleUpdate(person)}
                                style={inputStyle}
                              />
                            </td>
                          ))}
                        </tr>

                        {/* Date Row */}
                        <tr>
                          <td style={{ padding: "4px 0" }}>Date</td>

                          {["vaccine1Date", "vaccine2Date", "booster1Date", "booster2Date"].map((field) => (
                            <td key={field} style={{ padding: "4px" }}>
                              <DateField
                                size="small"
                                name={field}
                                value={person[field] || ""}
                                onChange={(e) => {
                                  const updatedPerson = {
                                    ...person,
                                    [field]: e.target.value,
                                  };
                                  setPerson(updatedPerson);
                                  handleUpdate(updatedPerson);
                                }}
                                onBlur={() => handleUpdate(person)}
                                style={inputStyle}
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
            {/* V. Please Indicate Result of the Following (Form Style, Table Layout) */}
            <Typography variant="subtitle1" mb={1}>
              <div style={{ fontWeight: "bold" }}>V. Please Indicate Result of the Following:</div>
            </Typography>


            <table className="w-full border border-black border-collapse table-fixed">
              <tbody>
                {/* Chest X-ray */}
                <tr>
                  <td className="border border-black p-2 w-1/3 font-medium">Chest X-ray:</td>
                  <td className="border border-black p-2 w-2/3">
                    <input
                      type="text"
                      name="chestXray"
                      value={person.chestXray || ""}
                      onChange={(e) => {
                        const { name, value } = e.target;
                        const updatedPerson = { ...person, [name]: value };
                        setPerson(updatedPerson);
                        handleUpdate(updatedPerson);
                      }}
                      onBlur={() => handleUpdate(person)}
                      className="w-full border px-3 py-2 rounded"
                    />
                  </td>
                </tr>

                {/* CBC */}
                <tr>
                  <td className="border border-black p-2 font-medium">CBC:</td>
                  <td className="border border-black p-2">
                    <input
                      type="text"
                      name="cbc"
                      value={person.cbc || ""}
                      onChange={(e) => {
                        const { name, value } = e.target;
                        const updatedPerson = { ...person, [name]: value };
                        setPerson(updatedPerson);
                        handleUpdate(updatedPerson);
                      }}
                      onBlur={() => handleUpdate(person)}
                      className="w-full border px-3 py-2 rounded"
                    />
                  </td>
                </tr>

                {/* Urinalysis */}
                <tr>
                  <td className="border border-black p-2 font-medium">Urinalysis:</td>
                  <td className="border border-black p-2">
                    <input
                      type="text"
                      name="urinalysis"
                      value={person.urinalysis || ""}
                      onChange={(e) => {
                        const { name, value } = e.target;
                        const updatedPerson = { ...person, [name]: value };
                        setPerson(updatedPerson);
                        handleUpdate(updatedPerson);
                      }}
                      onBlur={() => handleUpdate(person)}
                      className="w-full border px-3 py-2 rounded"
                    />
                  </td>
                </tr>

                {/* Other Workups */}
                <tr>
                  <td className="border border-black p-2 font-medium">Other Workups:</td>
                  <td className="border border-black p-2">
                    <input
                      type="text"
                      name="otherworkups"
                      value={person.otherworkups || ""}
                      onChange={(e) => {
                        const { name, value } = e.target;
                        const updatedPerson = { ...person, [name]: value };
                        setPerson(updatedPerson);
                        handleUpdate(updatedPerson);
                      }}
                      onBlur={() => handleUpdate(person)}
                      className="w-full border px-3 py-2 rounded"
                    />
                  </td>
                </tr>
              </tbody>
            </table>



            <div style={{ marginTop: "16px" }}>
              <Typography variant="subtitle1" mb={1}>
                <div style={{ fontWeight: "bold" }}>VI. Diagnosis :</div>
              </Typography>

              <table
                style={{
                  width: "100%",
                  border: "1px solid black",
                  borderCollapse: "collapse",
                  fontFamily: "Poppins, sans-serif",
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
                      }}
                    >
                      {/* Question */}
                      <Typography sx={{ fontSize: "15px", fontFamily: "Poppins, sans-serif", marginBottom: "4px" }}>
                        Do you have any of the following symptoms today?
                      </Typography>

                      {/* Answer checkboxes below (YES/NO) */}
                      <div style={{ display: "flex", alignItems: "center", gap: "20px", marginTop: "8px" }}>
                        {/* Physically Fit (0) */}
                        <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                          <Checkbox
                            name="symptomsToday"
                            checked={person.symptomsToday === 0}
                            onChange={() => {
                              const updatedPerson = {
                                ...person,
                                symptomsToday: person.symptomsToday === 0 ? null : 0,
                              };
                              setPerson(updatedPerson);
                              handleUpdate(updatedPerson);
                            }}
                            onBlur={() => handleUpdate(person)}
                          />
                          <span style={{ fontSize: "15px", fontFamily: "Poppins, sans-serif" }}>Physically Fit</span>
                        </div>

                        {/* For Compliance (1) */}
                        <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                          <Checkbox
                            name="symptomsToday"
                            checked={person.symptomsToday === 1}
                            onChange={() => {
                              const updatedPerson = {
                                ...person,
                                symptomsToday: person.symptomsToday === 1 ? null : 1,
                              };
                              setPerson(updatedPerson);
                              handleUpdate(updatedPerson);
                            }}
                            onBlur={() => handleUpdate(person)}
                          />
                          <span style={{ fontSize: "15px", fontFamily: "Poppins, sans-serif" }}>For Compliance</span>
                        </div>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>


            {/* VII. Remarks Section */}
            <div style={{ marginTop: "16px" }}>
              <Typography variant="subtitle1" fontWeight="bold" mb={1}>
                VII. Remarks:
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
                    <TableCell sx={{ border: "1px solid black", p: 1 }}>
                      <TextField
                        name="remarks"
                        multiline
                        minRows={2}
                        fullWidth
                        size="small"
                        value={person.remarks || ""}
                        onChange={(e) => {
                          const updatedPerson = {
                            ...person,
                            remarks: e.target.value,
                          };
                          setPerson(updatedPerson);
                          handleUpdate(updatedPerson);
                        }}
                        onBlur={() => handleUpdate(person)}
                        sx={{
                          backgroundColor: "white",
                          borderRadius: "8px",
                          '& .MuiOutlinedInput-root': {
                            padding: '4px 8px',
                          },
                          '& .MuiInputBase-multiline': {
                            padding: 0,
                          },
                        }}
                      />
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>

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




            <Box display="flex" justifyContent="space-between" alignItems="center" mt={4}>
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
                    navigate(`/applicant_educational_attainment/${keys.step3}`);
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

                  setSnackbar({
                    open: true,
                    message: "Your record has been saved successfully!",
                    severity: "success",
                  });

                  setTimeout(() => {
                    navigate(`/applicant_other_information/${keys.step5}`);
                  }, 1000);
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


export default ApplicantHealthMedicalRecords;
