// src/components/ExamAttendanceQrInformation.jsx
import React, { useEffect, useState, useContext } from "react";
import { useParams } from "react-router-dom";
import {
  Box,
  Typography,
  Chip,
  CircularProgress,
  Divider,
  Avatar,
  Stack,
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import HourglassEmptyIcon from "@mui/icons-material/HourglassEmpty";
import EventBusyIcon from "@mui/icons-material/EventBusy";
import SearchOffIcon from "@mui/icons-material/SearchOff";
import VerifiedIcon from "@mui/icons-material/Verified";
import axios from "axios";
import { SettingsContext } from "../App";
import EaristLogo from "../assets/EaristLogo.png";
import API_BASE_URL from "../apiConfig";

// Same attendance-state logic as ExamAttendanceScanner.jsx, kept in sync so
// this public page and the registrar scanner always agree on the verdict.
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

const ExamAttendanceQrInformation = () => {
  const { applicant_number } = useParams();
  const settings = useContext(SettingsContext);
  const branding = settings?.branding || {};
  const assets = settings?.assets || {};

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [data, setData] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const fetchInfo = async () => {
      setLoading(true);
      setNotFound(false);
      setErrorMessage("");

      try {
        // Single combined endpoint (see note above the code block if your
        // backend instead splits this across /api/person, /api/applicant-schedule,
        // /api/exam-attendance/token, /api/document-verification like the scanner does).
        const res = await axios.get(
          `${API_BASE_URL}/api/exam-attendance/info/${applicant_number}`, { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` } },
        );
        if (!cancelled) setData(res.data);
      } catch (err) {
        if (cancelled) return;
        if (err.response?.status === 404) {
          setNotFound(true);
        } else {
          setErrorMessage(
            err.response?.data?.message ||
              "Unable to verify this exam permit right now. Please try again later.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    if (applicant_number) fetchInfo();
    return () => {
      cancelled = true;
    };
  }, [applicant_number]);

  const logoSrc = assets.logoUrl || EaristLogo;
  const companyName = branding.companyName || "";

  const person = data?.person || {};
  const examSchedule = data?.exam_schedule || null;
  const attendanceStatus = data?.attendance_status ?? null;
  const isVerified = Boolean(data?.document_verified);
  const scannedAt = data?.scanned_at || null;

  const attendanceState = getAttendanceState(attendanceStatus, examSchedule);
  const { Icon: StatusIcon } = attendanceState;

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

  return (
    <Box
      sx={{
        minHeight: "100dvh",
        width: "100%",
        display: "flex",
        alignItems: { xs: "flex-start", sm: "center" },
        justifyContent: "center",
        backgroundColor: "#f0f2f5",
        px: { xs: 1.5, sm: 2 },
        py: { xs: 2, sm: 4 },
        boxSizing: "border-box",
        overflowY: "auto",
      }}
    >
      <Box
        sx={{
          width: "100%",
          maxWidth: 520,
          mx: "auto",
          marginTop: 5,
          marginBottom: 15,
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
            src={logoSrc}
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
          {loading && (
            <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", py: 4 }}>
              <CircularProgress size={32} />
              <Typography sx={{ mt: 2, color: "#666", fontSize: { xs: 13, sm: 14 } }}>
                Verifying permit...
              </Typography>
            </Box>
          )}

          {!loading && notFound && (
            <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", py: 3, px: 1 }}>
              <SearchOffIcon sx={{ fontSize: { xs: 48, sm: 56 }, color: "#9e9e9e" }} />
              <Typography sx={{ mt: 1.5, fontWeight: 700, fontSize: { xs: 16, sm: 18 }, color: "#616161", textAlign: "center" }}>
                No Record Found
              </Typography>
              <Typography sx={{ mt: 0.5, color: "#888", fontSize: { xs: 12.5, sm: 13 }, textAlign: "center", wordBreak: "break-word" }}>
                Applicant number <strong>{applicant_number}</strong> does not match any exam permit in our system.
              </Typography>
            </Box>
          )}

          {!loading && !notFound && errorMessage && (
            <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", py: 3, px: 1 }}>
              <CancelIcon sx={{ fontSize: { xs: 48, sm: 56 }, color: "#e53935" }} />
              <Typography sx={{ mt: 1.5, fontWeight: 700, fontSize: { xs: 15, sm: 16 }, color: "#e53935", textAlign: "center" }}>
                Verification Failed
              </Typography>
              <Typography sx={{ mt: 0.5, color: "#888", fontSize: { xs: 12.5, sm: 13 }, textAlign: "center" }}>
                {errorMessage}
              </Typography>
            </Box>
          )}

          {!loading && !notFound && !errorMessage && data && (
            <>
              {/* Verdict banner */}
              <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  py: { xs: 1.5, sm: 2 },
                  mb: 2,
                  borderRadius: 2,
                  backgroundColor: attendanceState.bg,
                  px: 1,
                }}
              >
                <StatusIcon sx={{ fontSize: { xs: 48, sm: 60 }, color: attendanceState.color }} />
                <Typography
                  sx={{
                    mt: 1,
                    fontWeight: 800,
                    fontSize: { xs: 15, sm: 18 },
                    letterSpacing: 0.3,
                    color: attendanceState.color,
                    textAlign: "center",
                  }}
                >
                  {attendanceState.label}
                </Typography>

                {attendanceState.label === "PRESENT" && scannedAt && (
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
                {attendanceState.label === "NO SCHEDULE YET" && (
                  <Typography sx={{ mt: 0.25, fontSize: { xs: 11, sm: 11.5 }, fontStyle: "italic", color: "#888", textAlign: "center" }}>
                    No exam schedule has been generated for this applicant yet
                  </Typography>
                )}
                {attendanceState.label === "ABSENT" && (
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
                    Applicant No. {person?.applicant_number || applicant_number}
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

              {data?.program?.program_description && (
                <Box sx={{ mb: 2 }}>
                  <Typography sx={{ fontSize: { xs: 11, sm: 12 }, color: "#999", textTransform: "uppercase", fontWeight: 600, mb: 0.25 }}>
                    Course Applied
                  </Typography>
                  <Typography sx={{ fontSize: { xs: 13, sm: 14 }, wordBreak: "break-word" }}>
                    {data.program.program_description}
                    {data.program.major ? ` — ${data.program.major}` : ""}
                  </Typography>
                </Box>
              )}

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
                  </Stack>
                </>
              )}

              <Typography sx={{ mt: 3, fontSize: { xs: 10.5, sm: 11 }, color: "#bbb", textAlign: "center" }}>
                Checked on {new Date().toLocaleString("en-US")}
              </Typography>
            </>
          )}
        </Box>
      </Box>
    </Box>
  );
};

export default ExamAttendanceQrInformation;