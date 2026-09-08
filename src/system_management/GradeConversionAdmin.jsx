import React, { useState, useEffect, useContext } from "react";
import { SettingsContext } from "../App";
import axios from "axios";
import {
    Box,
    Button,
    TextField,
    Typography,
    Paper,
    Divider,
    Snackbar,
    Alert,
    Table,
    TableHead,
    TableRow,
    TableCell,
    TableBody,
    TableContainer,
    MenuItem,
    Stack,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
} from "@mui/material";
import API_BASE_URL from "../apiConfig";
import Unauthorized from "../components/Unauthorized";
import LoadingOverlay from "../components/LoadingOverlay";
import EaristLogo from "../assets/EaristLogo.png";
import { postAuditEvent, getFlatAuditHeaders } from "../utils/auditEvents";
import useAuditMac from "../utils/useAuditMac";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import SaveIcon from "@mui/icons-material/Save";

// ─── Static design tokens ──────────────────────────────────────────────────
const C = {
    cream: "#fafaf7",
    textMain: "#1a1a2e",
    textMuted: "#6b6b80",
    white: "#ffffff",
    greenDark: "#1a5c36",
    greenMid: "#2e7d52",
    redDark: "#8b1a1a",
    redMid: "#b52020",
};

// ─── Main Component ────────────────────────────────────────────────────────
const GradeConversionAdmin = () => {
    useAuditMac();
    const settings = useContext(SettingsContext);
  const colors = settings?.colors || {};
  const branding = settings?.branding || {};
  const assets = settings?.assets || {};

    // ── Settings state ──
    const [titleColor, setTitleColor] = useState("#000000");
    const [borderColor, setBorderColor] = useState("#000000");
    const [mainButtonColor, setMainButtonColor] = useState("#1976d2");
    const [subButtonColor, setSubButtonColor] = useState("#ffffff");
    const [stepperColor, setStepperColor] = useState("#000000");
    const [fetchedLogo, setFetchedLogo] = useState(null);
    const [companyName, setCompanyName] = useState("");
    const [shortTerm, setShortTerm] = useState("");
    const [campusAddress, setCampusAddress] = useState("");
    const [branches, setBranches] = useState([]);

    const [snack, setSnack] = useState({ open: false, message: "", severity: "info" });
    const handleCloseSnack = (_, reason) => {
        if (reason !== "clickaway") setSnack((p) => ({ ...p, open: false }));
    };

    useEffect(() => {
        if (!settings) return;
        if (colors.title) setTitleColor(colors.title);
        if (colors.border) setBorderColor(colors.border);
        if (colors.mainButton) setMainButtonColor(colors.mainButton);
        if (colors.subButton) setSubButtonColor(colors.subButton);
        if (colors.stepper) setStepperColor(colors.stepper);
        if (assets.logoUrl) setFetchedLogo(assets.logoUrl);
        else setFetchedLogo(EaristLogo);
        if (branding.companyName) setCompanyName(branding.companyName);
        if (branding.shortTerm) setShortTerm(branding.shortTerm);
        if (branding.campusAddress) setCampusAddress(branding.campusAddress);
        setBranches(settings?.branches || []);
    }, [settings]);

    const resolvedHeader = colors.header || mainButtonColor || "#1976d2";
    const resolvedBorder = borderColor || "#000000";

    // ── Auth / access ──
    const [userID, setUserID] = useState("");
    const [user, setUser] = useState("");
    const [userRole, setUserRole] = useState("");
    const [hasAccess, setHasAccess] = useState(null);
    const [canCreate, setCanCreate] = useState(false);
    const [canEdit, setCanEdit] = useState(false);
    const [canDelete, setCanDelete] = useState(false);
    const [loading, setLoading] = useState(false);
    const pageId = 144;
    const [employeeID, setEmployeeID] = useState("");
    const getAuditHeaders = () => ({
        headers: {
            ...getFlatAuditHeaders(),
            "x-employee-id": employeeID || localStorage.getItem("employee_id") || "",
            "x-page-id": pageId,
            "x-audit-actor-id":
                employeeID ||
                localStorage.getItem("employee_id") ||
                localStorage.getItem("person_id") ||
                localStorage.getItem("email") ||
                "unknown",
            "x-audit-actor-role": userRole || localStorage.getItem("role") || "registrar",
        },
    });
    const permissionHeaders = getAuditHeaders();

    useEffect(() => {
        const storedUser = localStorage.getItem("email");
        const storedRole = localStorage.getItem("role");
        const storedID = localStorage.getItem("person_id");
        const storedEmployeeID = localStorage.getItem("employee_id");
        if (storedUser && storedRole && storedID) {
            setUser(storedUser);
            setUserRole(storedRole);
            setUserID(storedID);
            setEmployeeID(storedEmployeeID);
            if (storedRole === "registrar") checkAccess(storedEmployeeID);
            else window.location.href = "/login";
        } else {
            window.location.href = "/login";
        }
    }, []);

    const checkAccess = async (employeeID) => {
        try {
            const response = await axios.get(`${API_BASE_URL}/api/page_access/${employeeID}/${pageId}`);
            if (response.data && response.data.page_privilege === 1) {
                setHasAccess(true);
                setCanCreate(Number(response.data?.can_create) === 1);
                setCanEdit(Number(response.data?.can_edit) === 1);
                setCanDelete(Number(response.data?.can_delete) === 1);
            } else {
                setHasAccess(false);
                setCanCreate(false); setCanEdit(false); setCanDelete(false);
            }
        } catch (error) {
            console.error("Error checking access:", error);
            setHasAccess(false);
            setCanCreate(false); setCanEdit(false); setCanDelete(false);
            setLoading(false);
        }
    };

    // ── Grade Conversion state ──
    const insertAuditLog = async (eventType, details = {}) => {
        try {
            await postAuditEvent(eventType, details);
        } catch (err) {
            console.error("Error inserting audit log");
        }
    };

    const [rows, setRows] = useState([]);
    const EMPTY_GRADE_FORM = { id: null, min_score: "", max_score: "", equivalent_grade: "", descriptive_rating: "", is_disqualified: 0 };
    const [gradeDialogOpen, setGradeDialogOpen] = useState(false);
    const [gradeForm, setGradeForm] = useState(EMPTY_GRADE_FORM);
    const [gradeDeleteDialogOpen, setGradeDeleteDialogOpen] = useState(false);
    const [gradeToDelete, setGradeToDelete] = useState(null);

    const fetchData = async () => {
        try {
            setLoading(true);
            const res = await axios.get(`${API_BASE_URL}/api/admin/grade-conversion`);
            setRows(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (hasAccess) { fetchData(); fetchHonors(); }
    }, [hasAccess]);

    const openAddGradeDialog = () => {
        if (!canCreate) { setSnack({ open: true, message: "You do not have permission to create items on this page", severity: "error" }); return; }
        setGradeForm(EMPTY_GRADE_FORM);
        setGradeDialogOpen(true);
    };

    const openEditGradeDialog = (row) => {
        if (!canEdit) { setSnack({ open: true, message: "You do not have permission to edit this item", severity: "error" }); return; }
        setGradeForm(row);
        setGradeDialogOpen(true);
    };

    const handleSaveGrade = async () => {
        const hasScoreRange = gradeForm.min_score !== "" || gradeForm.max_score !== "";
        if (!gradeForm.equivalent_grade || (hasScoreRange && (gradeForm.min_score === "" || gradeForm.max_score === ""))) {
            setSnack({ open: true, message: "Equivalent grade is required. Fill both score fields or leave both blank for special grades.", severity: "warning" });
            return;
        }
        if (
            gradeForm.min_score !== "" &&
            gradeForm.max_score !== "" &&
            Number(gradeForm.min_score) > Number(gradeForm.max_score)
        ) {
            setSnack({ open: true, message: "Min score cannot be greater than max score", severity: "warning" });
            return;
        }
        try {
            const isUpdate = Boolean(gradeForm.id);
            const payload = {
                ...gradeForm,
                min_score: gradeForm.min_score === "" ? null : gradeForm.min_score,
                max_score: gradeForm.max_score === "" ? null : gradeForm.max_score,
                is_disqualified: Number(gradeForm.is_disqualified) === 1 ? 1 : 0,
            };
            await axios.post(`${API_BASE_URL}/api/admin/grade-conversion`, payload, permissionHeaders);
            setGradeDialogOpen(false);
            setGradeForm(EMPTY_GRADE_FORM);
            fetchData();
            setSnack({ open: true, message: "Grade entry saved successfully!", severity: "success" });
            await insertAuditLog("grade_conversion_saved", {
                is_update: isUpdate,
                min_score: gradeForm.min_score,
                max_score: gradeForm.max_score,
                equivalent_grade: gradeForm.equivalent_grade,
            });
        } catch (err) {
            console.error(err);
            setSnack({ open: true, message: "Save failed. Please try again.", severity: "error" });
        }
    };

    const handleDeleteGradeConfirm = async () => {
        if (!gradeToDelete) return;
        try {
            await axios.delete(`${API_BASE_URL}/api/admin/grade-conversion/${gradeToDelete.id}`, permissionHeaders);
            setGradeDeleteDialogOpen(false);
            setGradeToDelete(null);
            fetchData();
            setSnack({ open: true, message: "Entry deleted.", severity: "info" });
            await insertAuditLog("grade_conversion_deleted", {
                min_score: gradeToDelete.min_score,
                max_score: gradeToDelete.max_score,
                equivalent_grade: gradeToDelete.equivalent_grade,
            });
        } catch (err) {
            console.error(err);
            setSnack({ open: true, message: "Delete failed. Please try again.", severity: "error" });
        }
    };

    // ── Honors state ──
    const [honors, setHonors] = useState([]);
    const EMPTY_HONOR_FORM = {
        id: null,
        title: "",
        category: 0,
        min_gwa: "",
        max_gwa: "",
        max_subject_grade: "",
    };
    const [honorDialogOpen, setHonorDialogOpen] = useState(false);
    const [honorForm, setHonorForm] = useState(EMPTY_HONOR_FORM);
    const [honorDeleteDialogOpen, setHonorDeleteDialogOpen] = useState(false);
    const [honorToDelete, setHonorToDelete] = useState(null);

    const fetchHonors = async () => {
        try {
            const res = await axios.get(`${API_BASE_URL}/api/admin/honors-rules`);
            setHonors(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    const openAddHonorDialog = () => {
        if (!canCreate) { setSnack({ open: true, message: "You do not have permission to create items on this page", severity: "error" }); return; }
        setHonorForm(EMPTY_HONOR_FORM);
        setHonorDialogOpen(true);
    };

    const openEditHonorDialog = (row) => {
        if (!canEdit) { setSnack({ open: true, message: "You do not have permission to edit this item", severity: "error" }); return; }
        setHonorForm(row);
        setHonorDialogOpen(true);
    };

    const handleSaveHonor = async () => {
        if (
            !honorForm.title ||
            honorForm.min_gwa === "" ||
            honorForm.max_gwa === "" ||
            honorForm.max_subject_grade === ""
        ) {
            setSnack({ open: true, message: "Title is required", severity: "warning" });
            return;
        }
        try {
            const isUpdate = Boolean(honorForm.id);
            await axios.post(`${API_BASE_URL}/api/admin/honors-rules`, honorForm, permissionHeaders);
            setHonorDialogOpen(false);
            setHonorForm(EMPTY_HONOR_FORM);
            fetchHonors();
            setSnack({ open: true, message: "Honors rule saved!", severity: "success" });
            await insertAuditLog("honors_rule_saved", {
                is_update: isUpdate,
                title: honorForm.title,
            });
        } catch (err) {
            setSnack({ open: true, message: "Save failed. Please try again.", severity: "error" });
        }
    };

    const handleDeleteHonorConfirm = async () => {
        if (!honorToDelete) return;
        try {
            await axios.delete(`${API_BASE_URL}/api/admin/honors-rules/${honorToDelete.id}`, permissionHeaders);
            setHonorDeleteDialogOpen(false);
            setHonorToDelete(null);
            fetchHonors();
            setSnack({ open: true, message: "Honors rule deleted.", severity: "info" });
            await insertAuditLog("honors_rule_deleted", {
                title: honorToDelete.title,
            });
        } catch (err) {
            console.error(err);
            setSnack({ open: true, message: "Delete failed. Please try again.", severity: "error" });
        }
    };

    // ── Shared styles ──
    const thCellSx = {
        textAlign: "center",
        fontWeight: "bold",
        fontSize: "0.83rem",
        color: "black",
        backgroundColor: "#F5F5F5",
        border: `1px solid ${resolvedBorder}`,
        py: 1.1,
        px: 2,
    };

    const tdCellSx = {
        textAlign: "center",
        border: `1px solid ${resolvedBorder}`,
        py: 1.1,
        px: 2,
        fontSize: "0.83rem",
        color: C.textMain,
    };

    const pillSx = (bg, color) => ({
        display: "inline-block",
        px: 1.4,
        py: 0.25,
        borderRadius: "20px",
        background: bg,
        fontSize: "0.72rem",
        fontWeight: 700,
        color: color,
        whiteSpace: "nowrap",
    });

    const actionBtnSx = (bgColor, hoverColor) => ({
        backgroundColor: bgColor,
        color: "white",
        borderRadius: "5px",
        padding: "8px 14px",
        minWidth: "100px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "5px",
        "&:hover": { backgroundColor: hoverColor },
    });

    // ── Guards ──
    if (loading || hasAccess === null) return <LoadingOverlay open={loading} message="Loading..." />;
    if (!hasAccess) return <Unauthorized />;

    const showActionColumn = canEdit || canDelete;

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

    // ─────────────────────────────────────────────────────────────────────────
    return (
        <Box
            sx={{
                height: "calc(100vh - 150px)",
                overflowY: "auto",
                backgroundColor: "transparent",
                mt: 1,
                padding: 2,
                paddingRight: 1,
                "&::-webkit-scrollbar": { width: "6px" },
                "&::-webkit-scrollbar-track": { background: "transparent" },
                "&::-webkit-scrollbar-thumb": { background: "rgba(0,0,0,0.18)", borderRadius: "8px" },
            }}
        >
            {/* ── Page Title ── */}
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", mb: 2 }}>
                <Typography variant="h4" sx={{ fontWeight: "bold", color: titleColor, fontSize: "36px" }}>
                    GRADE MANAGEMENT / ACADEMIC'S AWARD
                </Typography>
            </Box>
            <hr style={{ border: "1px solid #ccc", width: "100%" }} />
            <br /><br />

            {/* ══════════════════════════════════════════════
                CARD 1 — GRADE CONVERSION
            ══════════════════════════════════════════════ */}

            {/* Top bar with Add button */}
            <TableContainer component={Paper} sx={{ width: "100%", borderRadius: 0, boxShadow: "none" }}>
                <Table size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell
                                colSpan={10}
                                sx={{
                                    py: 0.75,
                                    border: `1px solid ${resolvedBorder}`,
                                    backgroundColor: resolvedHeader,
                                    color: "white",
                                }}
                            >
                                <Box display="flex" justifyContent="space-between" alignItems="center">
                                    <Typography fontSize="14px" fontWeight="bold" color="white">
                                        Grade Management
                                    </Typography>
                                    {canCreate && (
                                        <Button
                                            variant="contained"
                                            onClick={openAddGradeDialog}
                                            sx={{
                                                backgroundColor: "#1976d2",
                                                color: "#fff",
                                                fontWeight: "bold",
                                                borderRadius: "8px",
                                                width: "250px",
                                                textTransform: "none",
                                                px: 2,
                                                mr: "15px",
                                                "&:hover": { backgroundColor: "#1565c0" },
                                            }}
                                        >
                                            + Add Grade Entry
                                        </Button>
                                    )}
                                </Box>
                            </TableCell>
                        </TableRow>
                    </TableHead>
                </Table>
            </TableContainer>

            <Divider sx={{ borderColor: resolvedBorder }} />

            {/* Grade Conversion Table */}
            <TableContainer>
                <Table size="small" sx={{ borderCollapse: "collapse" }}>
                    <TableHead>
                        <TableRow>
                            <TableCell sx={thCellSx}>Min Score</TableCell>
                            <TableCell sx={thCellSx}>Max Score</TableCell>
                            <TableCell sx={thCellSx}>Equivalent Grade</TableCell>
                            <TableCell sx={thCellSx}>Descriptive Rating</TableCell>
                            <TableCell sx={thCellSx}>Disqualified</TableCell>
                            {showActionColumn && <TableCell sx={thCellSx}>Actions</TableCell>}
                        </TableRow>
                    </TableHead>
                    <TableBody
                        sx={{
                            border: `1px solid ${borderColor}`,
                            "& .MuiTableRow-root:nth-of-type(odd)": {
                                backgroundColor: "#ffffff",
                            },
                            "& .MuiTableRow-root:nth-of-type(even)": {
                                backgroundColor: "lightgray",
                            },
                        }}
                    >
                        {rows.length === 0 ? (
                            <TableRow>
                                <TableCell
                                    colSpan={showActionColumn ? 5 : 4}
                                    sx={{
                                        textAlign: "center",
                                        py: 4,
                                        color: "rgba(107,107,128,0.5)",
                                        fontSize: "0.82rem",
                                        fontStyle: "italic",
                                        border: `1px solid ${resolvedBorder}`,
                                    }}
                                >
                                    No grade conversion entries yet. Click "+ Add Grade Entry" to add one.
                                </TableCell>
                            </TableRow>
                        ) : (
                            rows.map((row, idx) => (
                                <TableRow
                                    key={row.id}
                                    sx={{
                                        background: idx % 2 === 0 ? C.white : C.cream,
                                        "&:hover": { background: "rgba(0,0,0,0.03)" },
                                        transition: "background 0.12s",
                                    }}
                                >
                                    <TableCell sx={tdCellSx}>{row.min_score ?? "Special"}</TableCell>
                                    <TableCell sx={tdCellSx}>{row.max_score ?? "Special"}</TableCell>
                                    <TableCell sx={tdCellSx}>
                                        <Box sx={{ fontWeight: 700, color: resolvedHeader }}>
                                            {row.equivalent_grade}
                                        </Box>
                                    </TableCell>
                                    <TableCell sx={tdCellSx}>
                                        <Box sx={pillSx(`${resolvedHeader}18`, resolvedHeader)}>
                                            {row.descriptive_rating}
                                        </Box>
                                    </TableCell>
                                    <TableCell sx={tdCellSx}>
                                        <Box
                                            sx={pillSx(
                                                row.is_disqualified
                                                    ? "rgba(181,32,32,0.15)"
                                                    : "rgba(26,92,54,0.12)",
                                                row.is_disqualified
                                                    ? "#b52020"
                                                    : "#1a5c36"
                                            )}
                                        >
                                            {row.is_disqualified ? "YES" : "NO"}
                                        </Box>
                                    </TableCell>
                                    {showActionColumn && (
                                        <TableCell sx={tdCellSx}>
                                            <Stack direction="row" spacing={1} justifyContent="center">
                                                {canEdit && (
                                                    <Button
                                                        variant="contained"
                                                        sx={actionBtnSx("green", "#006400")}
                                                        onClick={() => openEditGradeDialog(row)}
                                                    >
                                                        <EditIcon fontSize="small" /> Edit
                                                    </Button>
                                                )}
                                                {canDelete && (
                                                    <Button
                                                        variant="contained"
                                                        sx={actionBtnSx("#9E0000", "#7a0000")}
                                                        onClick={() => { setGradeToDelete(row); setGradeDeleteDialogOpen(true); }}
                                                    >
                                                        <DeleteIcon fontSize="small" /> Delete
                                                    </Button>
                                                )}
                                            </Stack>
                                        </TableCell>
                                    )}
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            <br />
            <br />

            {/* ══════════════════════════════════════════════
                CARD 2 — HONORS RULES
            ══════════════════════════════════════════════ */}
            <Paper elevation={1} sx={{ border: `1px solid ${resolvedBorder}`, overflow: "hidden", mb: 3 }}>

                {/* Section Header */}

                {/* Top bar with Add button */}
                <TableContainer component={Paper} sx={{ width: "100%", borderRadius: 0, boxShadow: "none" }}>
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell
                                    colSpan={10}
                                    sx={{
                                        py: 0.75,
                                        border: `1px solid ${resolvedBorder}`,
                                        backgroundColor: resolvedHeader,
                                        color: "white",
                                    }}
                                >
                                    <Box display="flex" justifyContent="space-between" alignItems="center">
                                        <Typography fontSize="14px" fontWeight="bold" color="white">
                                            Academic's Award
                                        </Typography>
                                        {canCreate && (
                                            <Button
                                                variant="contained"
                                                onClick={openAddHonorDialog}
                                                sx={{
                                                    backgroundColor: "#1976d2",
                                                    color: "#fff",
                                                    fontWeight: "bold",
                                                    borderRadius: "8px",
                                                    width: "250px",
                                                    textTransform: "none",
                                                    px: 2,
                                                    mr: "15px",
                                                    "&:hover": { backgroundColor: "#1565c0" },
                                                }}
                                            >
                                                + Add Honor Rule
                                            </Button>
                                        )}
                                    </Box>
                                </TableCell>
                            </TableRow>
                        </TableHead>
                    </Table>
                </TableContainer>

                <Divider sx={{ borderColor: resolvedBorder }} />

                {/* Honors Table */}
                <TableContainer>
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell sx={thCellSx}>Title</TableCell>
                                <TableCell sx={thCellSx}>Min GWA</TableCell>
                                <TableCell sx={thCellSx}>Max GWA</TableCell>
                                <TableCell sx={thCellSx}>Max Subject Grade</TableCell>
                                <TableCell sx={thCellSx}>Category</TableCell>
                                {showActionColumn && <TableCell sx={thCellSx}>Actions</TableCell>}
                            </TableRow>
                        </TableHead>
                        <TableBody
                            sx={{
                                border: `1px solid ${borderColor}`,
                                "& .MuiTableRow-root:nth-of-type(odd)": {
                                    backgroundColor: "#ffffff",
                                },
                                "& .MuiTableRow-root:nth-of-type(even)": {
                                    backgroundColor: "lightgray",
                                },
                            }}
                        >
                            {honors.length === 0 ? (
                                <TableRow>
                                    <TableCell
                                        colSpan={showActionColumn ? 5 : 4}
                                        sx={{
                                            textAlign: "center",
                                            py: 4,
                                            color: "rgba(107,107,128,0.5)",
                                            fontSize: "0.82rem",
                                            fontStyle: "italic",
                                        }}
                                    >
                                        No honors rules configured yet. Click "+ Add Honor Rule" to add one.
                                    </TableCell>
                                </TableRow>
                            ) : honors.map((row, idx) => (
                                <TableRow
                                    key={row.id}
                                    sx={{
                                        background: idx % 2 === 0 ? C.white : C.cream,
                                        "&:hover": { background: "rgba(0,0,0,0.03)" },
                                        transition: "background 0.12s",
                                    }}
                                >
                                    <TableCell sx={tdCellSx}>
                                        <Stack direction="row" spacing={0.75} alignItems="center" justifyContent="center">
                                            <EmojiEventsIcon sx={{ fontSize: "14px", color: resolvedHeader, opacity: 0.75 }} />
                                            <Box sx={{ fontWeight: 700, color: C.textMain }}>{row.title}</Box>
                                        </Stack>
                                    </TableCell>
                                    <TableCell sx={tdCellSx}>
                                        <Box sx={pillSx("rgba(26,92,54,0.09)", C.greenDark)}>
                                            {row.min_gwa}
                                        </Box>
                                    </TableCell>

                                    <TableCell sx={tdCellSx}>
                                        <Box sx={pillSx("rgba(139,26,26,0.09)", C.redDark)}>
                                            {row.max_gwa}
                                        </Box>
                                    </TableCell>

                                    <TableCell sx={tdCellSx}>
                                        <Box sx={pillSx(`${resolvedHeader}20`, resolvedHeader)}>
                                            {row.max_subject_grade}
                                        </Box>
                                    </TableCell>

                                    <TableCell sx={tdCellSx}>
                                        <Box
                                            sx={pillSx(
                                                Number(row.category) === 1
                                                    ? `${resolvedHeader}20`
                                                    : "rgba(26,26,46,0.07)",
                                                Number(row.category) === 1
                                                    ? resolvedHeader
                                                    : C.textMain
                                            )}
                                        >
                                            {Number(row.category) === 1 ? "Graduation" : "Semester"}
                                        </Box>
                                    </TableCell>
                                    {showActionColumn && (
                                        <TableCell sx={tdCellSx}>
                                            <Stack direction="row" spacing={1} justifyContent="center">
                                                {canEdit && (
                                                    <Button
                                                        variant="contained"
                                                        sx={actionBtnSx("green", "#006400")}
                                                        onClick={() => openEditHonorDialog(row)}
                                                    >
                                                        <EditIcon fontSize="small" /> Edit
                                                    </Button>
                                                )}
                                                {canDelete && (
                                                    <Button
                                                        variant="contained"
                                                        sx={actionBtnSx("#9E0000", "#7a0000")}
                                                        onClick={() => { setHonorToDelete(row); setHonorDeleteDialogOpen(true); }}
                                                    >
                                                        <DeleteIcon fontSize="small" /> Delete
                                                    </Button>
                                                )}
                                            </Stack>
                                        </TableCell>
                                    )}
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>

            {/* ══════════════════════════════════════════════
                DIALOGS — Grade Conversion
            ══════════════════════════════════════════════ */}

            {/* Add / Edit Grade Dialog */}
            <Dialog open={gradeDialogOpen} onClose={() => setGradeDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ fontWeight: "bold", backgroundColor: resolvedHeader, color: "white" }}>
                    {gradeForm.id ? "Edit Grade Entry" : "Add Grade Entry"}
                </DialogTitle>
                <DialogContent sx={{ pt: 3 }}>
                    <Stack spacing={2} sx={{ mt: 1 }}>

                        <Typography fontWeight="bold" mb={1} mt={3}>
                            Min Score
                        </Typography>
                        <TextField
                            label="Min Score"
                            fullWidth
                            size="small"
                            value={gradeForm.min_score}
                            onChange={(e) => setGradeForm({ ...gradeForm, min_score: e.target.value })}
                        />
                        <Typography fontWeight="bold" mb={1} mt={3}>
                            Max Score
                        </Typography>
                        <TextField
                            label="Max Score"
                            fullWidth
                            size="small"
                            value={gradeForm.max_score}
                            onChange={(e) => setGradeForm({ ...gradeForm, max_score: e.target.value })}
                        />
                        <Typography fontWeight="bold" mb={1} mt={3}>
                            Equivalent Grade
                        </Typography>
                        <TextField
                            label="Equivalent Grade"
                            fullWidth
                            size="small"
                            value={gradeForm.equivalent_grade}
                            onChange={(e) => setGradeForm({ ...gradeForm, equivalent_grade: e.target.value })}
                        />
                        <Typography fontWeight="bold" mb={1} mt={3}>
                            Descriptive Rating
                        </Typography>
                        <TextField
                            label="Descriptive Rating"
                            fullWidth
                            size="small"
                            value={gradeForm.descriptive_rating}
                            onChange={(e) => setGradeForm({ ...gradeForm, descriptive_rating: e.target.value })}
                        />
                        <TextField
                            label="Disqualified"
                            fullWidth
                            size="small"
                            select
                            value={gradeForm.is_disqualified}
                            onChange={(e) =>
                                setGradeForm({
                                    ...gradeForm,
                                    is_disqualified: e.target.value,
                                })
                            }
                        >
                            <MenuItem value={0}>No</MenuItem>
                            <MenuItem value={1}>Yes</MenuItem>
                        </TextField>
                    </Stack>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button onClick={() => setGradeDialogOpen(false)} color="error"
                        variant="outlined">
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSaveGrade}
                        variant="contained"
                        startIcon={<SaveIcon />}
                        sx={{
                            px: 4,
                            fontWeight: 600,
                            textTransform: "none",
                        }}
                    >
                        Save
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Delete Grade Dialog */}
            <Dialog
                open={gradeDeleteDialogOpen}
                onClose={() => {
                    setGradeDeleteDialogOpen(false);
                    setGradeToDelete(null);
                }}
                maxWidth="sm"
                fullWidth
                PaperProps={{
                    sx: {
                        borderRadius: 3,
                        overflow: "hidden",
                        boxShadow: 6,
                    },
                }}
            >
                <DialogTitle
                    sx={{
                        background: colors.header || "#9E0000",
                        color: "#fff",
                        fontWeight: 700,
                        fontSize: "1.2rem",
                        py: 2,
                    }}
                >
                    Delete Grade Entry
                </DialogTitle>

                <DialogContent sx={{ p: 3, mt: 2 }}>
                    <Typography sx={{ mb: 2 }}>
                        Are you sure you want to delete grade entry{" "}
                        <b>{gradeToDelete?.equivalent_grade}</b>?
                    </Typography>

                    <Typography
                        sx={{
                            color: "#d32f2f",
                            fontSize: "0.95rem",
                        }}
                    >
                        This action will permanently remove this grade conversion rule.
                        <br />
                        Any students or records relying on this grading scale may be affected.
                    </Typography>
                </DialogContent>

                <DialogActions
                    sx={{
                        px: 3,
                        py: 2,
                        borderTop: "1px solid #e0e0e0",
                    }}
                >
                    <Button
                        color="error"
                        variant="outlined"
                        onClick={() => {
                            setGradeDeleteDialogOpen(false);
                            setGradeToDelete(null);
                        }}
                    >
                        Cancel
                    </Button>

                    <Button
                        variant="contained"
                        sx={{ backgroundColor: "#9E0000", color: "#fff" }}
                        onClick={handleDeleteGradeConfirm}
                    >
                        Yes, Delete
                    </Button>
                </DialogActions>
            </Dialog>

            {/* ══════════════════════════════════════════════
                DIALOGS — Honors
            ══════════════════════════════════════════════ */}

            {/* Add / Edit Honor Dialog */}
            <Dialog open={honorDialogOpen} onClose={() => setHonorDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ fontWeight: "bold", backgroundColor: resolvedHeader, color: "white" }}>
                    {honorForm.id ? "Edit Honor Rule" : "Add Honor Rule"}
                </DialogTitle>
                <DialogContent sx={{ pt: 3 }}>
                    <Stack spacing={2} sx={{ mt: 1 }}>
                        <Typography fontWeight="bold" mb={1} mt={3}>
                            Dean's Lister
                        </Typography>
                        <TextField
                            label="Title (e.g. Dean's Lister)"
                            fullWidth
                            size="small"
                            value={honorForm.title}
                            onChange={(e) => setHonorForm({ ...honorForm, title: e.target.value })}
                        />
                        <Typography fontWeight="bold" mb={1} mt={3}>
                            Min Grades
                        </Typography>
                        <TextField
                            label="Min GWA"
                            fullWidth
                            size="small"
                            value={honorForm.min_gwa}
                            onChange={(e) =>
                                setHonorForm({
                                    ...honorForm,
                                    min_gwa: e.target.value,
                                })
                            }
                        />

                        <TextField
                            label="Max GWA"
                            fullWidth
                            size="small"
                            value={honorForm.max_gwa}
                            onChange={(e) =>
                                setHonorForm({
                                    ...honorForm,
                                    max_gwa: e.target.value,
                                })
                            }
                        />

                        <TextField
                            label="Max Subject Grade"
                            fullWidth
                            size="small"
                            value={honorForm.max_subject_grade}
                            onChange={(e) =>
                                setHonorForm({
                                    ...honorForm,
                                    max_subject_grade: e.target.value,
                                })
                            }
                        />

                        <TextField
                            label="Category"
                            fullWidth
                            size="small"
                            select
                            value={honorForm.category}
                            onChange={(e) =>
                                setHonorForm({
                                    ...honorForm,
                                    category: e.target.value,
                                })
                            }
                        >
                            <MenuItem value={0}>Semester</MenuItem>
                            <MenuItem value={1}>Graduation</MenuItem>
                        </TextField>
                    </Stack>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button onClick={() => setHonorDialogOpen(false)} color="error"
                        variant="outlined">
                        Cancel
                    </Button>
                    <Button
                        startIcon={<SaveIcon />}
                        onClick={handleSaveHonor}
                        variant="contained"
                        sx={{
                            px: 4,
                            fontWeight: 600,
                            textTransform: "none",
                        }}
                    >
                        Save
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Delete Honor Dialog */}
            <Dialog
                open={honorDeleteDialogOpen}
                onClose={() => {
                    setHonorDeleteDialogOpen(false);
                    setHonorToDelete(null);
                }}
                maxWidth="sm"
                fullWidth
                PaperProps={{
                    sx: {
                        borderRadius: 3,
                        overflow: "hidden",
                        boxShadow: 6,
                    },
                }}
            >
                <DialogTitle
                    sx={{
                        background: colors.header || "#9E0000",
                        color: "#fff",
                        fontWeight: 700,
                        fontSize: "1.2rem",
                        py: 2,
                    }}
                >
                    Delete Honor Rule
                </DialogTitle>

                <DialogContent sx={{ p: 3, mt: 2 }}>
                    <Typography sx={{ mb: 2 }}>
                        Are you sure you want to delete honor rule{" "}
                        <b>{honorToDelete?.title}</b>?
                    </Typography>

                    <Typography
                        sx={{
                            color: "#d32f2f",
                            fontSize: "0.95rem",
                        }}
                    >
                        This will permanently remove this academic award rule.
                        <br />
                        Students who qualify under this rule will no longer be evaluated using it.
                    </Typography>
                </DialogContent>

                <DialogActions
                    sx={{
                        px: 3,
                        py: 2,
                        borderTop: "1px solid #e0e0e0",
                    }}
                >
                    <Button
                        color="error"
                        variant="outlined"
                        onClick={() => {
                            setHonorDeleteDialogOpen(false);
                            setHonorToDelete(null);
                        }}
                    >
                        Cancel
                    </Button>

                    <Button
                        variant="contained"
                        sx={{ backgroundColor: "#9E0000", color: "#fff" }}
                        onClick={handleDeleteHonorConfirm}
                    >
                        Yes, Delete
                    </Button>
                </DialogActions>
            </Dialog>

            {/* ── Snackbar ── */}
            <Snackbar
                open={snack.open}
                autoHideDuration={4000}
                onClose={handleCloseSnack}
                anchorOrigin={{ vertical: "top", horizontal: "center" }}
            >
                <Alert severity={snack.severity} onClose={handleCloseSnack} sx={{ width: "100%", fontWeight: 500, borderRadius: 2.5 }}>
                    {snack.message}
                </Alert>
            </Snackbar>
        </Box>
    );
};

export default GradeConversionAdmin;
