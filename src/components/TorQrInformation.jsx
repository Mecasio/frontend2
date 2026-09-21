// src/components/TorQrInformation.jsx
import React, { useEffect, useState, useContext } from "react";
import { useParams } from "react-router-dom";
import { Box, Typography, Chip, CircularProgress, Divider, Avatar, Stack } from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import SearchOffIcon from "@mui/icons-material/SearchOff";
import WorkspacePremiumIcon from "@mui/icons-material/WorkspacePremium";
import axios from "axios";
import { SettingsContext } from "../App";
import EaristLogo from "../assets/EaristLogo.png";
import API_BASE_URL from "../apiConfig";

// academic_program: 0 = Undergraduate, 1 = Graduate, 2 = TechVoc (see program_table.academic_program)
const ACADEMIC_PROGRAM_STYLES = {
    0: { label: "Undergraduate", bg: "#e3f2fd", color: "#1565c0" },
    1: { label: "Graduate", bg: "#f3e5f5", color: "#6a1b9a" },
    2: { label: "TechVoc", bg: "#fff3e0", color: "#e65100" },
};

const getAcademicProgramMeta = (result) => {
    const code = result?.program?.academic_program;
    const apiLabel = result?.program?.academic_program_label;

    if (apiLabel) {
        return { ...(ACADEMIC_PROGRAM_STYLES[code] || { bg: "#eceff1", color: "#455a64" }), label: apiLabel };
    }
    if (code === null || code === undefined) return null;
    return ACADEMIC_PROGRAM_STYLES[code] || { label: "Unknown", bg: "#eceff1", color: "#455a64" };
};

const TorQrInformation = () => {
    const { student_number } = useParams();
    const settings = useContext(SettingsContext);
    const branding = settings?.branding || {};
    const assets = settings?.assets || {};

    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [result, setResult] = useState(null);

    useEffect(() => {
        let cancelled = false;

        const fetchVerification = async () => {
            setLoading(true);
            setNotFound(false);
            setErrorMessage("");

            try {
                const res = await axios.get(`${API_BASE_URL}/api/verify-graduate/${student_number}`, { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` } });
                if (!cancelled) setResult(res.data);
            } catch (err) {
                if (cancelled) return;
                if (err.response?.status === 404) {
                    setNotFound(true);
                } else {
                    setErrorMessage(
                        err.response?.data?.message || "Unable to verify this record right now. Please try again later.",
                    );
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        if (student_number) fetchVerification();
        return () => {
            cancelled = true;
        };
    }, [student_number]);

    const [torQrStatus, setTorQrStatus] = useState({ has_qr: false });

    useEffect(() => {
        let cancelled = false;
        const fetchStatus = async () => {
            try {
                const res = await axios.get(`${API_BASE_URL}/api/tor-qr-status/${student_number}`, { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` } });
                if (!cancelled) setTorQrStatus(res.data);
            } catch {
                if (!cancelled) setTorQrStatus({ has_qr: false });
            }
        };
        if (student_number) fetchStatus();
        return () => { cancelled = true; };
    }, [student_number]);

    const logoSrc = assets.logoUrl || EaristLogo;
    const companyName = branding.companyName || "";
    const academicProgramMeta = getAcademicProgramMeta(result);

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
                        GRADUATE RECORD VERIFICATION
                    </Typography>
                </Box>

                {/* Body */}
                <Box sx={{ padding: { xs: 2, sm: 3 } }}>
                    {loading && (
                        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", py: 4 }}>
                            <CircularProgress size={32} />
                            <Typography sx={{ mt: 2, color: "#666", fontSize: { xs: 13, sm: 14 } }}>
                                Verifying record...
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
                                Student number <strong>{student_number}</strong> does not match any record in our system.
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

                    {!loading && !notFound && !errorMessage && result && (
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
                                    backgroundColor: result.is_graduate ? "#e8f5e9" : "#fdecea",
                                    px: 1,
                                }}
                            >
                                {result.is_graduate ? (
                                    <CheckCircleIcon sx={{ fontSize: { xs: 48, sm: 60 }, color: "#2e7d32" }} />
                                ) : (
                                    <CancelIcon sx={{ fontSize: { xs: 48, sm: 60 }, color: "#c62828" }} />
                                )}
                                <Typography
                                    sx={{
                                        mt: 1,
                                        fontWeight: 800,
                                        fontSize: { xs: 15, sm: 18 },
                                        letterSpacing: 0.3,
                                        color: result.is_graduate ? "#2e7d32" : "#c62828",
                                        textAlign: "center",
                                    }}
                                >
                                    {result.is_graduate ? "VERIFIED GRADUATE" : "NOT A VERIFIED GRADUATE"}
                                </Typography>

                                {/* Only shown once the registrar has actually confirmed graduation
                                    via /api/mark-graduate — this is the persisted date, not a guess. */}
                                {result.officially_recorded && result.graduation_date && (
                                    <Typography sx={{ mt: 0.25, fontSize: { xs: 12, sm: 12.5 }, fontWeight: 600, color: "#2e7d32", textAlign: "center" }}>
                                        Graduated on{" "}
                                        {new Date(result.graduation_date).toLocaleDateString("en-US", {
                                            year: "numeric",
                                            month: "long",
                                            day: "numeric",
                                        })}
                                    </Typography>
                                )}
                                {result.is_graduate && result.officially_recorded === false && (
                                    <Typography sx={{ mt: 0.25, fontSize: { xs: 11, sm: 11.5 }, fontStyle: "italic", color: "#888", textAlign: "center" }}>
                                        Eligible, pending official registrar confirmation
                                    </Typography>
                                )}
                                {result.reason && (
                                    <Typography sx={{ mt: 0.5, fontSize: { xs: 12, sm: 12.5 }, color: "#888", textAlign: "center", px: 2 }}>
                                        {result.reason}
                                    </Typography>
                                )}
                            </Box>

                            {/* Student info */}
                            <Stack direction="row" spacing={2} sx={{ alignItems: "center", mb: 2, flexWrap: "wrap" }}>
                                <Avatar
                                    src={
                                        result.student?.profile_image
                                            ? `${API_BASE_URL}/uploads/Student1by1/${result.student.profile_image}`
                                            : undefined
                                    }
                                    sx={{ width: { xs: 48, sm: 56 }, height: { xs: 48, sm: 56 }, border: "1px solid #ddd", flexShrink: 0 }}
                                    variant="rounded"
                                />
                                <Box sx={{ minWidth: 0, flex: 1 }}>
                                    <Typography sx={{ fontWeight: 700, fontSize: { xs: 14, sm: 15 }, wordBreak: "break-word" }}>
                                        {result.student?.full_name || "—"}
                                    </Typography>
                                    <Typography sx={{ fontSize: { xs: 12, sm: 12.5 }, color: "#888" }}>
                                        Student No. {result.student?.student_number}
                                    </Typography>
                                </Box>
                            </Stack>

                            {result.program?.program_description && (
                                <Box sx={{ mb: 2 }}>
                                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.25, flexWrap: "wrap" }}>
                                        <Typography sx={{ fontSize: { xs: 11, sm: 12 }, color: "#999", textTransform: "uppercase", fontWeight: 600 }}>
                                            Program
                                        </Typography>
                                        {academicProgramMeta && (
                                            <Chip
                                                size="small"
                                                icon={<WorkspacePremiumIcon sx={{ fontSize: 14 }} />}
                                                label={academicProgramMeta.label}
                                                sx={{
                                                    backgroundColor: academicProgramMeta.bg,
                                                    color: academicProgramMeta.color,
                                                    fontWeight: 700,
                                                    fontSize: { xs: 10, sm: 10.5 },
                                                    height: 20,
                                                    "& .MuiChip-icon": { color: academicProgramMeta.color },
                                                }}
                                            />
                                        )}
                                    </Stack>
                                    <Typography sx={{ fontSize: { xs: 13, sm: 14 }, wordBreak: "break-word" }}>
                                        {result.program.program_description}
                                        {result.program.major ? ` — ${result.program.major}` : ""}
                                    </Typography>
                                </Box>
                            )}

                            <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", mt: 3 }}>
                                {torQrStatus.has_qr ? (
                                    <Box
                                        component="img"
                                        src={`${API_BASE_URL}/api/graduate-qr/${student_number}`}
                                        alt="Student TOR QR code"
                                        sx={{ width: { xs: 140, sm: 160 }, height: { xs: 140, sm: 160 }, border: "1px solid #eee", borderRadius: 1 }}
                                    />
                                ) : (
                                    <Typography sx={{ fontSize: 12, color: "#999", textAlign: "center" }}>
                                        No QR code has been issued for this student yet.
                                    </Typography>
                                )}
                                <Typography sx={{ fontSize: { xs: 10.5, sm: 11 }, color: "#aaa", mt: 1, textAlign: "center" }}>
                                    Official Transcript of Records QR — issued to this student's account
                                </Typography>
                            </Box>


                            {result.final_term && (
                                <>
                                    <Divider sx={{ my: 2 }} />
                                    <Typography
                                        sx={{
                                            fontSize: { xs: 11, sm: 12 },
                                            color: "#999",
                                            textTransform: "uppercase",
                                            fontWeight: 600,
                                            mb: 1,
                                        }}
                                    >
                                        Final Term — {result.final_term.year_level} {result.final_term.semester}
                                    </Typography>
                                    {result.final_term.subjects?.map((subject) => (
                                        <Box
                                            key={subject.course_code}
                                            sx={{
                                                display: "flex",
                                                flexWrap: "wrap",
                                                justifyContent: "space-between",
                                                alignItems: "center",
                                                gap: 1,
                                                py: 1,
                                                borderBottom: "1px solid #f2f2f2",
                                            }}
                                        >
                                            <Box sx={{ minWidth: 0, flex: "1 1 200px" }}>
                                                <Typography sx={{ fontSize: { xs: 12.5, sm: 13.5 }, fontWeight: 600, wordBreak: "break-word" }}>
                                                    {subject.course_description}
                                                </Typography>
                                                <Typography sx={{ fontSize: { xs: 11, sm: 12 }, color: "#999" }}>
                                                    {subject.course_code}
                                                    {subject.school_year ? ` • S.Y. ${subject.school_year}` : ""}
                                                </Typography>
                                            </Box>
                                            <Chip
                                                size="small"
                                                label={subject.passed ? `Passed (${subject.final_grade ?? "—"})` : "Not Completed"}
                                                sx={{
                                                    backgroundColor: subject.passed ? "#e8f5e9" : "#fdecea",
                                                    color: subject.passed ? "#2e7d32" : "#c62828",
                                                    fontWeight: 600,
                                                    fontSize: { xs: 10.5, sm: 11.5 },
                                                    flexShrink: 0,
                                                }}
                                            />
                                        </Box>
                                    ))}
                                </>
                            )}

                            <Typography sx={{ mt: 3, fontSize: { xs: 10.5, sm: 11 }, color: "#bbb", textAlign: "center" }}>
                                Verified on {new Date(result.verified_at).toLocaleString("en-US")}
                            </Typography>
                        </>
                    )}
                </Box>
            </Box>
        </Box>
    );
};

export default TorQrInformation;
