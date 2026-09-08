// src/admission/ExamAttendanceScanner.jsx
import React, { useState, useEffect, useContext } from "react";
import { SettingsContext } from "../App";
import axios from "axios";
import { QRCodeSVG } from "qrcode.react";
import {
  Box,
  TextField,
  Autocomplete,
  Alert,
  Button,
  Typography,
  Stack,
  Chip,
  Avatar,
  Divider,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import CameraAltIcon from "@mui/icons-material/CameraAlt";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import HourglassEmptyIcon from "@mui/icons-material/HourglassEmpty";
import EventBusyIcon from "@mui/icons-material/EventBusy";
import VerifiedIcon from "@mui/icons-material/Verified";
import EaristLogo from "../assets/EaristLogo.png";
import API_BASE_URL from "../apiConfig";
import QRScanner from "../components/QRScanner";
import Unauthorized from "../components/Unauthorized";
import LoadingOverlay from "../components/LoadingOverlay";

const PAGE_ID = 171;

const cleanSuggestionValue = (value) => {
  if (value === null || value === undefined) return "";
  const text = String(value).trim();
  return ["null", "undefined"].includes(text.toLowerCase()) ? "" : text;
};

const getApplicantSuggestionText = (applicant) =>
  [
    applicant?.applicant_number,
    applicant?.first_name,
    applicant?.middle_name,
    applicant?.last_name,
    applicant?.emailAddress,
    applicant?.email,
  ]
    .map(cleanSuggestionValue)
    .join(" ")
    .toLowerCase();

const getApplicantSuggestionName = (applicant) =>
  [
    applicant?.last_name,
    applicant?.first_name,
    applicant?.middle_name,
    applicant?.extension,
  ]
    .map(cleanSuggestionValue)
    .filter(Boolean)
    .join(", ");

// Same attendance-state logic as ExamAttendanceQrInformation.jsx / TorQrInformation.jsx,
// kept in sync so every page that shows a verdict agrees and looks the same
// (icon + color + soft background).
const getAttendanceState = (attendanceStatus, examSchedule) => {
  const scanned =
    attendanceStatus === 1 ||
    attendanceStatus === "1" ||
    String(attendanceStatus || "").toLowerCase() === "present" ||
    String(attendanceStatus || "").toLowerCase() === "scanned";

  if (scanned) {
    return {
      label: "PRESENT",
      color: "#2e7d32",
      bg: "#e8f5e9",
      Icon: CheckCircleIcon,
    };
  }

  if (!examSchedule) {
    return {
      label: "NO SCHEDULE YET",
      color: "#e65100",
      bg: "#fff3e0",
      Icon: EventBusyIcon,
    };
  }

  if (examSchedule?.end_time) {
    const today = new Date();
    const [h, m, s] = String(examSchedule.end_time).split(":").map(Number);
    const examEnd = new Date(today);
    examEnd.setHours(h || 0, m || 0, s || 0, 0);

    if (today > examEnd) {
      return {
        label: "ABSENT",
        color: "#c62828",
        bg: "#fdecea",
        Icon: CancelIcon,
      };
    }
  }

  return {
    label: "NOT YET ARRIVED",
    color: "#616161",
    bg: "#eceff1",
    Icon: HourglassEmptyIcon,
  };
};

const ExamAttendanceScanner = () => {
  const settings = useContext(SettingsContext);
  const theme = useTheme();

  // ---------------- Responsive breakpoints ----------------
  const isMobile = useMediaQuery(theme.breakpoints.down("sm")); // <600px (phones)
  const isTablet = useMediaQuery(theme.breakpoints.down("md")); // <900px (phones + small tablets)

  const branding = settings?.branding || {};
  const assets = settings?.assets || {};
  const colors = settings?.colors || {};
  const titleColor = colors.title || "#000000";
  const fetchedLogo = assets.logoUrl || EaristLogo;
  const companyName = branding.companyName || "";

  const [examSchedule, setExamSchedule] = useState(null);
  const [curriculumOptions, setCurriculumOptions] = useState([]);
  const [scheduledBy, setScheduledBy] = useState("");

  const [person, setPerson] = useState({
    campus: "",
    profile_img: "",
    last_name: "",
    first_name: "",
    middle_name: "",
    extension: "",
    applicant_number: "",
  });

  const [isVerified, setIsVerified] = useState(false);
  const [verifiedAt, setVerifiedAt] = useState(null);
  const [attendanceToken, setAttendanceToken] = useState(null);
  const [attendanceStatus, setAttendanceStatus] = useState(null);
  const [scannedAt, setScannedAt] = useState(null);

  // ---------------- Access control ----------------
  const [hasAccess, setHasAccess] = useState(null);
  const [loading, setLoading] = useState(false);
  const [employeeID, setEmployeeID] = useState("");
  const [userRole, setUserRole] = useState("");

  useEffect(() => {
    const storedUser = localStorage.getItem("email");
    const storedRole = localStorage.getItem("role");
    const storedID = localStorage.getItem("person_id");
    const storedEmployeeID = localStorage.getItem("employee_id");

    if (!storedUser || !storedRole || !storedID) {
      window.location.href = "/login";
      return;
    }

    setUserRole(storedRole);
    setEmployeeID(storedEmployeeID);

    const allowedRoles = ["registrar", "superadmin"];
    if (!allowedRoles.includes(storedRole)) {
      window.location.href = "/login";
      return;
    }

    checkAccess(storedEmployeeID);
  }, []);

  const checkAccess = async (empID) => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/page_access/${empID}/${PAGE_ID}`,
      );
      setHasAccess(response.data?.page_privilege === 1);
    } catch (error) {
      console.error("Error checking access:", error);
      setHasAccess(false);
    } finally {
      setLoading(false);
    }
  };

  // ---------------- Manual search ----------------
  const [persons, setPersons] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);

  useEffect(() => {
    const fetchPersons = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/api/upload_documents`);
        setPersons(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        console.error("Error fetching applicants for manual search:", err);
      }
    };
    fetchPersons();
  }, []);

  // ---------------- QR scanner ----------------
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scanStatus, setScanStatus] = useState(null);
  const [busy, setBusy] = useState(false);
  const isSecureContext =
    typeof window !== "undefined" && window.isSecureContext;

  const handleOpenScanner = () => {
    setScanStatus(null);

    if (!isSecureContext) {
      setScanStatus({
        type: "error",
        message:
          "Camera access is blocked because this page isn't loaded over HTTPS (or localhost). " +
          "Open this app via https://, or via http://localhost on this device, to use the scanner.",
      });
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setScanStatus({
        type: "error",
        message: "This browser doesn't support camera access.",
      });
      return;
    }

    setScannerOpen(true);
  };

  const handleScan = async (decodedText) => {
    const token = String(decodedText || "").trim();
    if (!token) return;

    setBusy(true);
    setScanStatus(null);

    try {
      const res = await axios.post(`${API_BASE_URL}/api/exam-attendance/scan`, {
        token,
        scanned_by: employeeID,
        scanned_by_role: userRole,
      });
      setScanStatus({ type: "success", message: res.data.message });

      if (person?.applicant_number) {
        fetchAllForApplicant(person.applicant_number, person.person_id);
      }
    } catch (err) {
      setScanStatus({
        type: "error",
        message: err.response?.data?.message || "Failed to record attendance.",
      });
    } finally {
      setBusy(false);
    }
  };

  const fetchAllForApplicant = async (applicant_number, personIdFromSearch) => {
    try {
      const res = await axios.get(
        `${API_BASE_URL}/api/person/${personIdFromSearch}`,
      );
      let personData = res.data;
      personData.applicant_number = applicant_number;
      setPerson(personData);

      try {
        const verifyRes = await axios.get(
          `${API_BASE_URL}/api/document-verification/${applicant_number}`,
        );
        setIsVerified(Boolean(verifyRes.data?.verified));
        setVerifiedAt(
          verifyRes.data?.verified ? verifyRes.data.verified_at : null,
        );
      } catch (verErr) {
        console.error("Error fetching verification status:", verErr);
      }

      try {
        const schedRes = await axios.get(
          `${API_BASE_URL}/api/applicant-schedule/${applicant_number}`,
        );
        setExamSchedule(schedRes.data);
      } catch (schedErr) {
        console.error("Error fetching exam schedule:", schedErr);
        setExamSchedule(null);
      }

      try {
        const attRes = await axios.get(
          `${API_BASE_URL}/api/exam-attendance/token/${applicant_number}`,
        );
        setAttendanceToken(attRes.data?.qr_token || null);
        setAttendanceStatus(attRes.data?.status || null);
        setScannedAt(attRes.data?.scanned_at || null);
      } catch (attErr) {
        console.error("Error fetching attendance token:", attErr);
        setAttendanceToken(null);
        setAttendanceStatus(null);
        setScannedAt(null);
      }

      try {
        const progRes = await axios.get(`${API_BASE_URL}/api/applied_program`);
        setCurriculumOptions(progRes.data);
      } catch (progErr) {
        console.error("Error fetching programs:", progErr);
      }

      try {
        const registrarRes = await axios.get(
          `${API_BASE_URL}/api/scheduled-by/registrar`,
        );
        if (registrarRes.data?.fullName)
          setScheduledBy(registrarRes.data.fullName);
      } catch (regErr) {
        console.error("Error fetching registrar name:", regErr);
      }
    } catch (err) {
      console.error("Error fetching exam permit data:", err);
    }
  };

  const handleSelectPerson = (newValue) => {
    setSelectedPerson(newValue);
    setSearchQuery(newValue?.applicant_number || "");
    setScanStatus(null);

    if (newValue?.applicant_number && newValue?.person_id) {
      fetchAllForApplicant(newValue.applicant_number, newValue.person_id);
    } else {
      setPerson({
        campus: "",
        profile_img: "",
        last_name: "",
        first_name: "",
        middle_name: "",
        extension: "",
        applicant_number: "",
      });
      setExamSchedule(null);
      setAttendanceToken(null);
      setAttendanceStatus(null);
      setScannedAt(null);
      setIsVerified(false);
      setVerifiedAt(null);
    }
  };

  // ---------------- Attendance state (PRESENT / ABSENT / NOT YET ARRIVED) ----------------
  const attendanceState = person?.applicant_number
    ? getAttendanceState(attendanceStatus, examSchedule)
    : null;
  const StatusIcon = attendanceState?.Icon;

  const courseDescription = curriculumOptions.find(
    (c) => c.curriculum_id?.toString() === (person?.program ?? "").toString(),
  );

  const fullName = [
    person?.last_name?.toUpperCase(),
    ",",
    " ",
    person?.first_name?.toUpperCase(),
    person?.middle_name ? ` ${person.middle_name.toUpperCase()}` : "",
    person?.extension ? ` ${person.extension.toUpperCase()}` : "",
  ]
    .join("")
    .replace(/\s+,/, ",");

  if (loading || hasAccess === null) {
    return <LoadingOverlay open={loading} message="Loading..." />;
  }

  if (!hasAccess) {
    return <Unauthorized />;
  }

  return (
    <Box
      sx={{
        height: "calc(100vh - 150px)",
        overflowY: "scroll", // was "auto" — always show the scrollbar track
        overflowX: "hidden",
        scrollbarGutter: "stable", // reserves the gutter even if content doesn't overflow yet
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
          ENTRANCE EXAM QR CODE SCANNER
        </Typography>

        {/* RIGHT SIDE */}
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
            options={persons}
            value={selectedPerson}
            inputValue={searchQuery}
            open={suggestionsOpen && searchQuery.trim().length >= 2}
            onOpen={() => setSuggestionsOpen(true)}
            onClose={() => setSuggestionsOpen(false)}
            isOptionEqualToValue={(option, value) =>
              option?.applicant_number === value?.applicant_number
            }
            getOptionLabel={(option) =>
              option
                ? `${option.applicant_number || ""} - ${option.last_name || ""}, ${option.first_name || ""} ${option.middle_name || ""}`
                : ""
            }
            onInputChange={(event, newInputValue, reason) => {
              if (reason !== "reset") {
                setSearchQuery(newInputValue);
                setSuggestionsOpen(true);
              }
            }}
            filterOptions={(options, state) => {
              const query = state.inputValue.trim().toLowerCase();
              if (query.length < 2) return [];

              return options
                .filter((applicant) =>
                  getApplicantSuggestionText(applicant).includes(query),
                )
                .slice(0, 8);
            }}
            onChange={(event, newValue) => {
              handleSelectPerson(newValue);
              setSuggestionsOpen(false);
            }}
            noOptionsText="No matching applicants"
            sx={{ width: isTablet ? "100%" : 420 }}
            renderOption={(props, option) => {
              const { key, ...optionProps } = props;
              const applicantNumber = cleanSuggestionValue(option?.applicant_number);
              const name = getApplicantSuggestionName(option);
              const email = cleanSuggestionValue(option?.emailAddress || option?.email);

              return (
                <Box
                  component="li"
                  key={key}
                  {...optionProps}
                  sx={{
                    px: 2,
                    py: 1,
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                    fontSize: 14,
                    borderBottom: "1px solid #f0f0f0",
                    "&:hover": { backgroundColor: "#f5f7fb" },
                  }}
                >
                  <Typography component="span" sx={{ fontWeight: 700, minWidth: 120 }}>
                    {applicantNumber || "No applicant ID"}
                  </Typography>
                  <Typography
                    component="span"
                    sx={{
                      color: "#444",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {[name, email].filter(Boolean).join(" - ")}
                  </Typography>
                </Box>
              );
            }}
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
                  startAdornment: (
                    <>
                      <SearchIcon sx={{ mr: 1, color: "gray" }} />
                      {params.InputProps.startAdornment}
                    </>
                  ),
                }}
              />
            )}
          />
        </Stack>

        <Button
          variant="contained"
          color="secondary"
          startIcon={<CameraAltIcon />}
          onClick={handleOpenScanner}
          disabled={busy}
          fullWidth={isTablet}
          sx={{
            minWidth: isTablet ? "auto" : "175px",
            height: "44px",
            marginLeft: "15px",
            fontWeight: "bold",
          }}
        >
          {busy ? "Processing..." : "Scan QR"}
        </Button>
      </Box>

      <hr style={{ border: "1px solid #ccc", width: "100%" }} />
      <br />
      <br />
      {!isSecureContext && (
        <Alert severity="warning" sx={{ mb: 2, fontSize: "14px" }}>
          You're viewing this page over an insecure connection (
          {window.location.origin}). Camera scanning will be blocked until this
          is served over HTTPS or accessed via <code>http://localhost</code>.
        </Alert>
      )}

      {scanStatus && (
        <Alert
          severity={scanStatus.type === "success" ? "success" : "error"}
          sx={{ mb: 2, fontSize: "15px" }}
        >
          {scanStatus.message}
        </Alert>
      )}

      {/* ---------------- Applicant card — identical UI/UX to TorQrInformation.jsx ---------------- */}
      {person?.applicant_number && (
        <Box
          sx={{
            width: "100%",
            maxWidth: 520,
            mx: "auto",
            mt: 1,
            mb: 4,
            backgroundColor: "#fff",
            borderRadius: { xs: 2, sm: 3 },
            boxShadow: "0 8px 30px rgba(0,0,0,0.12)",
            overflow: "hidden",
          }}
        >
          {/* Header */}
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              padding: { xs: 2.5, sm: 3 },
              borderBottom: "1px solid #eee",
            }}
          >
            <Box
              component="img"
              src={fetchedLogo}
              alt="School Logo"
              sx={{
                width: { xs: 52, sm: 64 },
                height: { xs: 52, sm: 64 },
                borderRadius: "50%",
                objectFit: "cover",
              }}
            />
            <Typography sx={{ fontSize: { xs: 12, sm: 13 }, color: "#666", mt: 1, textAlign: "center" }}>
              Republic of the Philippines
            </Typography>
            {companyName && (
              <Typography
                sx={{
                  fontSize: { xs: 14, sm: 16 },
                  fontWeight: 700,
                  textAlign: "center",
                  mt: 0.5,
                  px: 1,
                  wordBreak: "break-word",
                }}
              >
                {companyName}
              </Typography>
            )}
            <Typography
              sx={{
                fontSize: { xs: 12.5, sm: 14 },
                fontWeight: 600,
                color: "#888",
                mt: 1,
                letterSpacing: 0.5,
                textAlign: "center",
              }}
            >
              EXAM ATTENDANCE VERIFICATION
            </Typography>
          </Box>

          {/* Body */}
          <Box sx={{ padding: { xs: 2, sm: 3 } }}>
            {/* Verdict banner */}
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                py: { xs: 1.5, sm: 2 },
                mb: 2,
                borderRadius: 2,
                backgroundColor: attendanceState?.bg || "#eceff1",
                px: 1,
              }}
            >
              {StatusIcon && (
                <StatusIcon sx={{ fontSize: { xs: 48, sm: 60 }, color: attendanceState.color }} />
              )}
              <Typography
                sx={{
                  mt: 1,
                  fontWeight: 800,
                  fontSize: { xs: 15, sm: 18 },
                  letterSpacing: 0.3,
                  color: attendanceState?.color || "#616161",
                  textAlign: "center",
                }}
              >
                {attendanceState?.label || "NO ATTENDANCE RECORD"}
              </Typography>

              {attendanceState?.label === "PRESENT" && scannedAt && (
                <Typography sx={{ mt: 0.25, fontSize: { xs: 12, sm: 12.5 }, fontWeight: 600, color: "#2e7d32", textAlign: "center" }}>
                  Scanned at{" "}
                  {new Date(scannedAt).toLocaleString("en-US", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </Typography>
              )}
              {attendanceState?.label === "NO SCHEDULE YET" && (
                <Typography sx={{ mt: 0.25, fontSize: { xs: 11, sm: 11.5 }, fontStyle: "italic", color: "#888", textAlign: "center" }}>
                  No exam schedule has been generated for this applicant yet
                </Typography>
              )}
              {attendanceState?.label === "ABSENT" && (
                <Typography sx={{ mt: 0.25, fontSize: { xs: 11, sm: 11.5 }, fontStyle: "italic", color: "#888", textAlign: "center" }}>
                  Applicant was not scanned before the exam window closed
                </Typography>
              )}
            </Box>

            {/* Applicant info */}
            <Stack direction="row" spacing={2} sx={{ alignItems: "center", mb: 2, flexWrap: "wrap" }}>
              <Avatar
                src={
                  person?.profile_img
                    ? `${API_BASE_URL}/uploads/Applicant1by1/${person.profile_img}`
                    : undefined
                }
                sx={{ width: { xs: 48, sm: 56 }, height: { xs: 48, sm: 56 }, border: "1px solid #ddd", flexShrink: 0 }}
                variant="rounded"
              />
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography sx={{ fontWeight: 700, fontSize: { xs: 14, sm: 15 }, wordBreak: "break-word" }}>
                  {fullName || "—"}
                </Typography>
                <Typography sx={{ fontSize: { xs: 12, sm: 12.5 }, color: "#888" }}>
                  Applicant No. {person?.applicant_number}
                </Typography>
              </Box>
              {isVerified && (
                <Chip
                  size="small"
                  icon={<VerifiedIcon sx={{ fontSize: 14 }} />}
                  label="Document Verified"
                  sx={{
                    backgroundColor: "#e8f5e9",
                    color: "#2e7d32",
                    fontWeight: 700,
                    fontSize: { xs: 10, sm: 10.5 },
                    height: 22,
                    "& .MuiChip-icon": { color: "#2e7d32" },
                  }}
                />
              )}
            </Stack>

            {courseDescription?.program_description && (
              <Box sx={{ mb: 2 }}>
                <Typography sx={{ fontSize: { xs: 11, sm: 12 }, color: "#999", textTransform: "uppercase", fontWeight: 600, mb: 0.25 }}>
                  Course Applied
                </Typography>
                <Typography sx={{ fontSize: { xs: 13, sm: 14 }, wordBreak: "break-word" }}>
                  {courseDescription.program_description}
                  {courseDescription.major ? ` — ${courseDescription.major}` : ""}
                </Typography>
              </Box>
            )}

            <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", mt: 3 }}>
              {attendanceToken ? (
                <Box
                  sx={{
                    width: { xs: 140, sm: 160 },
                    height: { xs: 140, sm: 160 },
                    border: "1px solid #eee",
                    borderRadius: 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: "#fff",
                  }}
                >
                  <QRCodeSVG value={attendanceToken} size={isMobile ? 120 : 140} level="H" />
                </Box>
              ) : (
                <Typography sx={{ fontSize: 12, color: "#999", textAlign: "center" }}>
                  No attendance QR code has been generated for this applicant yet.
                </Typography>
              )}
              <Typography sx={{ fontSize: { xs: 10.5, sm: 11 }, color: "#aaa", mt: 1, textAlign: "center" }}>
                Exam Attendance QR — scan to mark this applicant present
              </Typography>
            </Box>

            {examSchedule && (
              <>
                <Divider sx={{ my: 2 }} />
                <Typography sx={{ fontSize: { xs: 11, sm: 12 }, color: "#999", textTransform: "uppercase", fontWeight: 600, mb: 1 }}>
                  Exam Schedule
                </Typography>

                <Stack spacing={1}>
                  <Box sx={{ display: "flex", justifyContent: "space-between", gap: 1 }}>
                    <Typography sx={{ fontSize: { xs: 12.5, sm: 13.5 }, color: "#666" }}>Date</Typography>
                    <Typography sx={{ fontSize: { xs: 12.5, sm: 13.5 }, fontWeight: 600, textAlign: "right" }}>
                      {examSchedule.schedule_created_at
                        ? new Date(examSchedule.schedule_created_at).toLocaleDateString("en-US", {
                            month: "long",
                            day: "numeric",
                            year: "numeric",
                          })
                        : "—"}
                    </Typography>
                  </Box>
                  <Box sx={{ display: "flex", justifyContent: "space-between", gap: 1 }}>
                    <Typography sx={{ fontSize: { xs: 12.5, sm: 13.5 }, color: "#666" }}>Time</Typography>
                    <Typography sx={{ fontSize: { xs: 12.5, sm: 13.5 }, fontWeight: 600, textAlign: "right" }}>
                      {examSchedule.start_time
                        ? new Date(`1970-01-01T${examSchedule.start_time}`).toLocaleTimeString("en-US", {
                            hour: "numeric",
                            minute: "2-digit",
                            hour12: true,
                          })
                        : "—"}
                    </Typography>
                  </Box>
                  <Box sx={{ display: "flex", justifyContent: "space-between", gap: 1 }}>
                    <Typography sx={{ fontSize: { xs: 12.5, sm: 13.5 }, color: "#666" }}>Building / Floor</Typography>
                    <Typography sx={{ fontSize: { xs: 12.5, sm: 13.5 }, fontWeight: 600, textAlign: "right" }}>
                      {[examSchedule.building_description, examSchedule.floor].filter(Boolean).join(" • ") || "—"}
                    </Typography>
                  </Box>
                  <Box sx={{ display: "flex", justifyContent: "space-between", gap: 1 }}>
                    <Typography sx={{ fontSize: { xs: 12.5, sm: 13.5 }, color: "#666" }}>Room</Typography>
                    <Typography sx={{ fontSize: { xs: 12.5, sm: 13.5 }, fontWeight: 600, textAlign: "right" }}>
                      {examSchedule.room_description || "—"}
                    </Typography>
                  </Box>
                  <Box sx={{ display: "flex", justifyContent: "space-between", gap: 1 }}>
                    <Typography sx={{ fontSize: { xs: 12.5, sm: 13.5 }, color: "#666" }}>Date Verified</Typography>
                    <Typography sx={{ fontSize: { xs: 12.5, sm: 13.5 }, fontWeight: 600, textAlign: "right" }}>
                      {verifiedAt
                        ? new Date(verifiedAt).toLocaleDateString("en-US", {
                            month: "long",
                            day: "numeric",
                            year: "numeric",
                          })
                        : "—"}
                    </Typography>
                  </Box>
                  <Box sx={{ display: "flex", justifyContent: "space-between", gap: 1 }}>
                    <Typography sx={{ fontSize: { xs: 12.5, sm: 13.5 }, color: "#666" }}>Scheduled By</Typography>
                    <Typography sx={{ fontSize: { xs: 12.5, sm: 13.5 }, fontWeight: 600, textAlign: "right" }}>
                      {scheduledBy || "N/A"}
                    </Typography>
                  </Box>
                </Stack>
              </>
            )}

            <Typography sx={{ mt: 3, fontSize: { xs: 10.5, sm: 11 }, color: "#bbb", textAlign: "center" }}>
              Checked on {new Date().toLocaleString("en-US")}
            </Typography>
          </Box>
        </Box>
      )}

      <QRScanner
        open={scannerOpen}
        onScan={(text) => {
          setScannerOpen(false);
          handleScan(text);
        }}
        onClose={() => setScannerOpen(false)}
      />
    </Box>
  );
};

export default ExamAttendanceScanner;
