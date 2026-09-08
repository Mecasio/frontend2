import React, { useState, useEffect, useContext } from "react";
import { SettingsContext } from "../App";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import ApplicantExamPermit from "../components/ApplicantExamPermit";
import EaristLogo from "../assets/EaristLogo.png";
import {
  TextField,
  Button,
  Box,
  Typography,
  Snackbar,
  Alert,
  Autocomplete,
  useMediaQuery,
  useTheme,
  Stack,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import CameraAltIcon from "@mui/icons-material/CameraAlt";
import QRScanner from "./QRScanner";
import API_BASE_URL from "../apiConfig";
import { FcPrint } from "react-icons/fc";

const ApplicantProfile = () => {
  const settings = useContext(SettingsContext);
  const colors = settings?.colors || {};
  const branding = settings?.branding || {};
  const assets = settings?.assets || {};
  const headerColor = colors.header || "#1976d2";
  const theme = useTheme();

  // ---------------- Responsive breakpoints ----------------
  const isMobile = useMediaQuery(theme.breakpoints.down("sm")); // <600px (phones)
  const isTablet = useMediaQuery(theme.breakpoints.down("md")); // <900px (phones + small tablets)

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
  const [branches, setBranches] = useState([]);

  useEffect(() => {
    if (!settings) return;

    // 🎨 Colors
    if (colors.title) setTitleColor(colors.title);
    if (colors.subtitle) setSubtitleColor(colors.subtitle);
    if (colors.border) setBorderColor(colors.border);
    if (colors.mainButton)
      setMainButtonColor(colors.mainButton);
    if (colors.subButton) setSubButtonColor(colors.subButton);
    if (colors.stepper) setStepperColor(colors.stepper);

    // 🏫 Logo
    if (assets.logoUrl) {
      setFetchedLogo(`${assets.logoUrl}`);
    } else {
      setFetchedLogo(EaristLogo);
    }

    // 🏷️ School Info
    if (branding.companyName) setCompanyName(branding.companyName);
    if (branding.shortTerm) setShortTerm(branding.shortTerm);
    if (branding.campusAddress) setCampusAddress(branding.campusAddress);

    // ✅ Branches (JSON stored in DB)
    setBranches(settings?.branches || []);
  }, [settings]);

  const { applicantNumber } = useParams();
  const navigate = useNavigate();

  const [personId, setPersonId] = useState(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    type: "info",
  });

  const showSnackbar = (message, type = "info") => {
    setSnackbar({ open: true, message, type });
  };

  const handleCloseSnackbar = () => {
    setSnackbar((prev) => ({ ...prev, open: false }));
  };

  // ---------------- Autocomplete search (same pattern as ExamAttendanceScanner) ----------------
  const [applicants, setApplicants] = useState([]);
  const [searchQuery, setSearchQuery] = useState(applicantNumber || "");
  const [selectedApplicant, setSelectedApplicant] = useState(null);

  useEffect(() => {
    const fetchApplicants = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/api/upload_documents`);
        setApplicants(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        console.error("Error fetching applicants for search:", err);
      }
    };
    fetchApplicants();
  }, []);

  // 🔁 Auto-load when URL has applicant number
  useEffect(() => {
    if (applicantNumber) {
      setHasSearched(true);
      setSearchQuery(applicantNumber);
      fetchApplicantData(applicantNumber);
    }
  }, [applicantNumber]);

  const [finalDocsCompleted, setFinalDocsCompleted] = useState(false);

  const fetchSubmittedDocuments = async (pid) => {
    try {
      const res = await axios.get(
        `${API_BASE_URL}/api/applicant-documents/${pid}`,
      );

      if (Array.isArray(res.data)) {
        const allSubmitted = res.data.every(
          (doc) => Number(doc.submitted_documents) === 1,
        );

        setFinalDocsCompleted(allSubmitted);

        setSteps((prev) => ({
          ...prev,
          step4: allSubmitted,
          step5: allSubmitted && prev.step3, // example logic
        }));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const [steps, setSteps] = useState({
    step1: false,
    step1Status: "",
    qualifyingDone: false,
    qualifyingStatus: "",
    interviewDone: false,
    interviewStatus: "",
    step3: false,
    step3Status: "",
    step4: false,
    step5: false,
  });

  const [hasStudentNumber, setHasStudentNumber] = useState(false);
  const [studentNumber, setStudentNumber] = useState(null);

  const normalizeExamStatus = (status) => {
    if (status === 0 || String(status).trim() === "0") return "PASSED";
    if (status === 1 || String(status).trim() === "1") return "FAILED";

    const normalized = String(status ?? "")
      .trim()
      .toUpperCase();
    if (["PASSED", "PASS"].includes(normalized)) return "PASSED";
    if (["FAILED", "FAIL"].includes(normalized)) return "FAILED";
    return "";
  };

  const normalizeResultStatus = (status) => {
    if (
      status === null ||
      status === undefined ||
      String(status).trim() === ""
    ) {
      return "";
    }

    if (status === 0 || String(status).trim() === "0") return "PASSED";
    if (status === 1 || String(status).trim() === "1") return "FAILED";

    const normalized = String(status).trim().toUpperCase();
    if (["PASSED", "PASS"].includes(normalized)) return "PASSED";
    if (["FAILED", "FAIL"].includes(normalized)) return "FAILED";
    return "";
  };

  const normalizeCollegeApprovalStatus = (status) => {
    if (
      status === null ||
      status === undefined ||
      String(status).trim() === ""
    ) {
      return "";
    }

    // if (status === 0 || String(status).trim() === "0") return "WAITING LIST";
    if (status === 1 || String(status).trim() === "1") return "ACCEPTED";
    if (status === 2 || String(status).trim() === "2") return "REJECTED";

    const normalized = String(status).trim().toUpperCase();
    if (normalized === "ACCEPTED") return "ACCEPTED";
    if (normalized === "REJECTED") return "REJECTED";
    // if (
    //   normalized === "WAITING LIST" ||
    //   normalized === "WAITING" ||
    //   normalized === "ON PROCESS"
    // ) {
    //   return "WAITING LIST";
    // }

    return "";
  };

  const fetchApplicantData = async (query) => {
    if (!query) return;

    try {
      // 1️⃣ Get person_id
      const res = await axios.get(
        `${API_BASE_URL}/api/person-by-applicant/${query}`,
      );

      if (!res.data?.person_id) {
        showSnackbar("❌ Applicant not found.", "error");
        setPersonId(null);
        return;
      }

      const pid = res.data.person_id;

      // 2️⃣ Check document verification
      const verifiedRes = await axios.get(
        `${API_BASE_URL}/api/document_status/check/${query}`,
      );

      if (!verifiedRes.data.verified) {
        showSnackbar(
          "❌ Documents not yet verified. Not qualified for exam.",
          "error",
        );
        setPersonId(null);
        return;
      }

      let entrance_exam_status = null;
      let qualifying_status = null;
      let interview_status = null;

      try {
        const scoreRes = await axios.get(
          `${API_BASE_URL}/api/applicant-scores/${query}`,
        );

        entrance_exam_status = normalizeExamStatus(
          scoreRes.data?.entrance_exam_status,
        );
        qualifying_status = normalizeResultStatus(
          scoreRes.data?.qualifying_status,
        );
        interview_status = normalizeResultStatus(
          scoreRes.data?.interview_status,
        );
      } catch (err) {
        console.error("Score API failed:", err);
      }

      // 4️⃣ Get college approval status (waiting list / accepted / rejected)
      let collegeApprovalStatus = "";

      try {
        const statusRes = await axios.get(
          `${API_BASE_URL}/api/interview_applicants/${query}`,
        );

        collegeApprovalStatus = normalizeCollegeApprovalStatus(
          statusRes.data?.status,
        );
      } catch (err) {
        if (err.response?.status !== 404) {
          console.error("College approval status API failed:", err);
        }
      }

      const isAccepted = collegeApprovalStatus === "ACCEPTED";

      // 5️⃣ Registrar (STEP 4)
      let isRegistrarApproved = false;

      try {
        const registrarRes = await axios.get(
          `${API_BASE_URL}/api/submitted-status/${pid}`,
        );

        isRegistrarApproved =
          Number(registrarRes.data?.submitted_documents) === 1;
      } catch (err) {
        console.error("Registrar API failed:", err);
      }

      // 6️⃣ Student Number (STEP 5)
      let hasStudentNumberLocal = false;
      let student_number = null;

      try {
        const studentRes = await axios.get(
          `${API_BASE_URL}/api/student_status/${pid}`,
        );

        hasStudentNumberLocal = studentRes.data?.hasStudentNumber;
        student_number = studentRes.data?.student_number;
      } catch (err) {
        console.error("Student API failed:", err);
      }

      // 🔥 FINAL STEP LOGIC
      const newSteps = {
        step1:
          entrance_exam_status === "PASSED" ||
          entrance_exam_status === "FAILED",
        step1Status: entrance_exam_status,

        // separate step 2 states
        qualifyingDone:
          qualifying_status === "PASSED" || qualifying_status === "FAILED",
        qualifyingStatus: qualifying_status,
        interviewDone:
          interview_status === "PASSED" || interview_status === "FAILED",
        interviewStatus: interview_status,

        step3: isAccepted,
        step3Status: collegeApprovalStatus,
        step4: isRegistrarApproved,
        step5: isRegistrarApproved && hasStudentNumberLocal,
      };

      setSteps(newSteps);

      // ✅ Student number state
      if (hasStudentNumberLocal) {
        setStudentNumber(student_number);
        setHasStudentNumber(true);
      } else {
        setHasStudentNumber(false);
      }

      // 🧠 Snackbar logic
      if (!entrance_exam_status) {
        showSnackbar(
          "📝 The applicant is qualified to take the Entrance Examination. Please proceed with the examination process.",
          "info",
        );
      } else if (
        entrance_exam_status === "PASSED" &&
        !newSteps.qualifyingDone &&
        !newSteps.interviewDone
      ) {
        showSnackbar(
          "✅ The applicant has completed the Entrance Examination successfully and is now waiting to be contacted for the Qualifying Examination or Interview schedule.",
          "success",
        );
      } else if (newSteps.qualifyingDone || newSteps.interviewDone) {
        showSnackbar(
          "🎤 The applicant has completed the Qualifying Examination and/or Interview process successfully.",
          "success",
        );
      }

      if (collegeApprovalStatus === "ACCEPTED") {
        showSnackbar(
          "🏥 The applicant may now proceed with the Medical Examination as part of the admission requirements.",
          "success",
        );
      } else if (collegeApprovalStatus === "REJECTED") {
        showSnackbar(
          "❌ The applicant has been rejected by the college.",
          "error",
        );
      }
      // } else if (collegeApprovalStatus === "WAITING LIST") {
      //   showSnackbar(
      //     "⏳ The applicant is on the waiting list for college approval.",
      //     "info"
      //   );
      // }

      if (isRegistrarApproved) {
        showSnackbar(
          "📄 The applicant has successfully submitted the original documents to the Registrar's Office and is now waiting for the student number to be generated.",
          "success",
        );
      }

      if (hasStudentNumberLocal) {
        showSnackbar(
          "🎓 The student number has been successfully generated. The student is now waiting for subject tagging and class schedule assignment.",
          "success",
        );
      }

      setPersonId(pid);
    } catch (err) {
      console.error("❌ MAIN ERROR:", err);
      showSnackbar("⚠️ Error fetching applicant data.", "error");
      setPersonId(null);
    }
  };

  const handleSearch = () => {
    if (!searchQuery.trim()) return;

    setHasSearched(true);

    // ✅ stays on VITE (5173)
    navigate(`/applicant_profile/${searchQuery.trim()}`);
    fetchApplicantData(searchQuery.trim());
  };

  // ✅ Selecting an option from the Autocomplete searches immediately,
  // same behavior as ExamAttendanceScanner's handleSelectPerson
  const handleSelectApplicant = (newValue) => {
    setSelectedApplicant(newValue);
    setSearchQuery(newValue?.applicant_number || "");

    if (newValue?.applicant_number) {
      setHasSearched(true);
      navigate(`/applicant_profile/${newValue.applicant_number}`);
      fetchApplicantData(newValue.applicant_number);
    } else {
      setPersonId(null);
    }
  };

  return (
    <Box
      sx={{
        height: "calc(100vh - 150px)",
        overflowY: "auto",
        overflowX: "hidden",
        backgroundColor: "transparent",
        p: isMobile ? 1.5 : 2,
      }}
    >
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: isMobile ? "flex-start" : "center",
          gap: isMobile ? 1.5 : 3,
          mb: 3,
          flexDirection: isTablet ? "column" : "row",
          flexWrap: "wrap",
        }}
      >
        {/* LEFT SIDE */}
        <Typography
          variant={isMobile ? "h6" : "h4"}
          sx={{
            fontWeight: "bold",
            color: titleColor,
            whiteSpace: isMobile ? "normal" : "nowrap",
            lineHeight: 1.2,
          }}
        >
          APPLICANT PROFILE
        </Typography>

        {/* SEARCH FIELD */}
        <Stack
          direction={isMobile ? "column" : "row"}
          spacing={1.5}
          sx={{
            width: isTablet ? "100%" : "auto",
            alignItems: isMobile ? "stretch" : "center",
            flexWrap: "wrap",
            marginLeft: isTablet ? 0 : "auto",
          }}
        >
          <Autocomplete
            options={applicants}
            value={selectedApplicant}
            inputValue={searchQuery}
            isOptionEqualToValue={(option, value) =>
              option?.applicant_number === value?.applicant_number
            }
            getOptionLabel={(option) =>
              option
                ? `${option.applicant_number || ""} - ${option.last_name || ""}, ${option.first_name || ""} ${option.middle_name || ""}`
                : ""
            }
            onInputChange={(event, newInputValue, reason) => {
              if (reason !== "reset") setSearchQuery(newInputValue);
            }}
            filterOptions={(options, state) => {
              const query = state.inputValue.toLowerCase();
              return options.filter((p) => {
                const fullString =
                  `${p.first_name ?? ""} ${p.middle_name ?? ""} ${p.last_name ?? ""} ${p.emailAddress ?? ""}`.toLowerCase();
                return (
                  (p.applicant_number || "").toLowerCase().includes(query) ||
                  fullString.includes(query)
                );
              });
            }}
            onChange={(event, newValue) => handleSelectApplicant(newValue)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                handleSearch();
              }
            }}
            sx={{ width: isTablet ? "100%" : 420 }}
            renderInput={(params) => (
              <TextField
                {...params}
                variant="outlined"
                placeholder="Search Applicant Name / Applicant ID"
                size="small"
                sx={{
                  width: 450,
                  backgroundColor: "#fff",
                  borderRadius: 1,
                  "& .MuiOutlinedInput-root": {
                    borderRadius: "10px",
                  },
                }}
                InputProps={{
                  ...params.InputProps,
                  startAdornment: <SearchIcon sx={{ mr: 1, color: "gray" }} />,
                }}
              />
            )}
          />
        </Stack>

        {/* SEARCH BUTTON */}
        <Button
          variant="contained"
          onClick={handleSearch}
          fullWidth={isTablet}
          sx={{
            minWidth: isTablet ? "auto" : "160px",
            height: "44px",
            marginLeft: "40px",
            fontWeight: "bold",
          }}
        >
          Search
        </Button>

        {/* QR BUTTON */}
        <Button
          variant="contained"
          color="secondary"
          startIcon={<CameraAltIcon />}
          onClick={() => setScannerOpen(true)}
          fullWidth={isTablet}
          sx={{
            minWidth: isTablet ? "auto" : "175px",
            height: "44px",

            fontWeight: "bold",
          }}
        >
          Scan QR
        </Button>
      </Box>
      <hr style={{ border: "1px solid #ccc", width: "100%" }} />
      <br />
      <br />

      {/* Exam Permit — scales to fit mobile/tablet screens automatically */}
      {personId && <ApplicantExamPermit personId={personId} steps={steps} />}

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert severity={snackbar.type} variant="filled">
          {snackbar.message}
        </Alert>
      </Snackbar>

      <QRScanner
        open={scannerOpen}
        onScan={(text) => {
          setScannerOpen(false);
          setSearchQuery(text);
          setHasSearched(true);
          navigate(`/applicant_profile/${text}`);
          fetchApplicantData(text);
        }}
        onClose={() => setScannerOpen(false)}
      />
    </Box>
  );
};

export default ApplicantProfile;
