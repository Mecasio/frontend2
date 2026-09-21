// src/components/StudentQrInformation.jsx
import React, { useEffect, useState, useContext } from "react";
import { useParams } from "react-router-dom";
import { Box, Typography, Chip, CircularProgress, Divider, Avatar, Stack } from "@mui/material";
import SearchOffIcon from "@mui/icons-material/SearchOff";
import CancelIcon from "@mui/icons-material/Cancel";
import SchoolIcon from "@mui/icons-material/School";
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

// Prefer a label the API already computed; otherwise map the raw
// academic_program code ourselves. Returns null if neither is present so
// the chip simply doesn't render (e.g. backend hasn't been updated yet).
const getAcademicProgramMeta = (result) => {
    const code = result?.program?.academic_program;
    const apiLabel = result?.program?.academic_program_label;

    if (apiLabel) {
        return { ...(ACADEMIC_PROGRAM_STYLES[code] || { bg: "#eceff1", color: "#455a64" }), label: apiLabel };
    }
    if (code === null || code === undefined) return null;
    return ACADEMIC_PROGRAM_STYLES[code] || { label: "Unknown", bg: "#eceff1", color: "#455a64" };
};

const StudentQrInformation = () => {
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

        const fetchInfo = async () => {
            setLoading(true);
            setNotFound(false);
            setErrorMessage("");

            try {
                const res = await axios.get(`${API_BASE_URL}/api/student-qr-information/${student_number}`, { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` } });
                if (!cancelled) setResult(res.data);
            } catch (err) {
                if (cancelled) return;
                if (err.response?.status === 404) {
                    setNotFound(true);
                } else {
                    setErrorMessage(
                        err.response?.data?.message || "Unable to load this record right now. Please try again later.",
                    );
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        if (student_number) fetchInfo();
        return () => {
            cancelled = true;
        };
    }, [student_number]);

    const logoSrc = assets.logoUrl || EaristLogo;
    const companyName = branding.companyName || "";
    const isEnrolled = result?.enrolled_status === 1;
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
                        STUDENT ENROLLMENT VERIFICATION
                    </Typography>
                </Box>

                {/* Body */}
                <Box sx={{ padding: { xs: 2, sm: 3 } }}>
                    {loading && (
                        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", py: 4 }}>
                            <CircularProgress size={32} />
                            <Typography sx={{ mt: 2, color: "#666", fontSize: { xs: 13, sm: 14 } }}>
                                Loading student record...
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
                                Student number <strong>{student_number}</strong> does not match any record, or has no portal account yet.
                            </Typography>
                        </Box>
                    )}

                    {!loading && !notFound && errorMessage && (
                        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", py: 3, px: 1 }}>
                            <CancelIcon sx={{ fontSize: { xs: 48, sm: 56 }, color: "#e53935" }} />
                            <Typography sx={{ mt: 1.5, fontWeight: 700, fontSize: { xs: 15, sm: 16 }, color: "#e53935", textAlign: "center" }}>
                                Lookup Failed
                            </Typography>
                            <Typography sx={{ mt: 0.5, color: "#888", fontSize: { xs: 12.5, sm: 13 }, textAlign: "center" }}>
                                {errorMessage}
                            </Typography>
                        </Box>
                    )}

                    {!loading && !notFound && !errorMessage && result && (
                        <>
                            {/* Enrollment status banner */}
                            <Box
                                sx={{
                                    display: "flex",
                                    flexDirection: "column",
                                    alignItems: "center",
                                    py: { xs: 1.5, sm: 2 },
                                    mb: 2,
                                    borderRadius: 2,
                                    backgroundColor: isEnrolled ? "#e8f5e9" : "#fdecea",
                                    px: 1,
                                }}
                            >
                                {isEnrolled ? (
                                    <SchoolIcon sx={{ fontSize: { xs: 48, sm: 60 }, color: "#2e7d32" }} />
                                ) : (
                                    <CancelIcon sx={{ fontSize: { xs: 48, sm: 60 }, color: "#c62828" }} />
                                )}
                                <Typography
                                    sx={{
                                        mt: 1,
                                        fontWeight: 800,
                                        fontSize: { xs: 15, sm: 18 },
                                        letterSpacing: 0.3,
                                        color: isEnrolled ? "#2e7d32" : "#c62828",
                                        textAlign: "center",
                                    }}
                                >
                                    {isEnrolled ? "CURRENTLY ENROLLED" : "NOT CURRENTLY ENROLLED"}
                                </Typography>
                                {(result.school_year_label || result.semester_label) && (
                                    <Typography sx={{ mt: 0.5, fontSize: { xs: 12, sm: 12.5 }, color: "#888", textAlign: "center", px: 2 }}>
                                        {[result.school_year_label, result.semester_label].filter(Boolean).join(" • ")}
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
                                        {result.year_level ? ` • ${result.year_level}` : ""}
                                        {result.section ? ` • ${result.section}` : ""}
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
                                <Box
                                    component="img"
                                    src={`${API_BASE_URL}${result.qr_image_url}`}
                                    alt="Student QR code"
                                    sx={{ width: { xs: 140, sm: 160 }, height: { xs: 140, sm: 160 }, border: "1px solid #eee", borderRadius: 1 }}
                                    onError={(e) => {
                                        e.currentTarget.style.display = "none";
                                    }}
                                />
                                <Typography sx={{ fontSize: { xs: 10.5, sm: 11 }, color: "#aaa", mt: 1, textAlign: "center" }}>
                                    Student QR — identifies enrollment status for the current term
                                </Typography>
                            </Box>

                            {/* Ongoing subjects — only shown when enrolled */}
                            {isEnrolled && (
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
                                        Currently Taking ({result.subjects?.length || 0})
                                    </Typography>

                                    {(!result.subjects || result.subjects.length === 0) && (
                                        <Typography sx={{ fontSize: 12.5, color: "#999", textAlign: "center", py: 2 }}>
                                            No subjects found for the active term.
                                        </Typography>
                                    )}

                                    {result.subjects?.map((subject) => (
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
                                                    {subject.schedule ? ` • ${subject.schedule}` : ""}
                                                    {subject.room ? ` • ${subject.room}` : ""}
                                                </Typography>
                                                {subject.instructor && (
                                                    <Typography sx={{ fontSize: { xs: 10.5, sm: 11.5 }, color: "#aaa" }}>
                                                        {subject.instructor}
                                                    </Typography>
                                                )}
                                            </Box>
                                            <Chip
                                                size="small"
                                                label={`${subject.units} unit(s)`}
                                                sx={{
                                                    backgroundColor: "#e3f2fd",
                                                    color: "#1565c0",
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
                                Verified on {new Date().toLocaleString("en-US")}
                            </Typography>
                        </>
                    )}
                </Box>
            </Box>
        </Box>
    );
};

export default StudentQrInformation;
