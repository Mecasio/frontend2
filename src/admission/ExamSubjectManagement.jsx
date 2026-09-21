import React, { useState, useEffect, useContext } from "react";
import { SettingsContext } from "../App";
import axios from "axios";
import API_BASE_URL from "../apiConfig";
import { getAuditConfig } from "../utils/auditEvents";
import useAuditMac from "../utils/useAuditMac";

import {
    Box,
    Typography,
    Card,
    TextField,
    Button,
    Grid,
    Switch,
    Stack,
    Snackbar,
    Alert,
    InputAdornment,
    Tooltip,
    Chip,
    Divider,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Paper,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import SubjectIcon from "@mui/icons-material/Subject";
import CircleIcon from "@mui/icons-material/Circle";
import Unauthorized from "../components/Unauthorized";
import LoadingOverlay from "../components/LoadingOverlay";
import KeyIcon from "@mui/icons-material/Key";
import AdmissionRoomAssignmentTabs from "../components/AdmissionRoomAssignmentTabs";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import SaveIcon from "@mui/icons-material/Save";

const ExamSubjectManagement = () => {
  useAuditMac();
    const settings = useContext(SettingsContext);

    const colors = settings?.colors || {};
    const titleColor = colors.title || "#000000";
    const borderColor = colors.border || "#000000";
    const headerColor = colors.header || "#1976d2";

    const [userID, setUserID] = useState("");
    const [user, setUser] = useState("");
    const [userRole, setUserRole] = useState("");
    const [hasAccess, setHasAccess] = useState(null);
    const [canCreate, setCanCreate] = useState(false);
    const [canEdit, setCanEdit] = useState(false);
    const [canDelete, setCanDelete] = useState(false);
    const [loading, setLoading] = useState(false);
    const pageId = 145;
    const [employeeID, setEmployeeID] = useState("");
    const getAuditConfigForPage = () =>
    getAuditConfig({
"x-audit-actor-id":
                employeeID ||
                localStorage.getItem("employee_id") ||
                localStorage.getItem("email") ||
                "unknown",
            "x-audit-actor-role": userRole || localStorage.getItem("role") || "administrator",
    });

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
            if (["administrator", "superadmin", "technical"].includes(storedRole)) {
                checkAccess(storedEmployeeID);
            } else {
                window.location.href = "/login";
            }
        } else {
            window.location.href = "/login";
        }
    }, []);

    const checkAccess = async (employeeID) => {
        try {
            const response = await axios.get(`${API_BASE_URL}/api/page_access/${employeeID}/${pageId}`, { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` } });
            if (response.data && response.data.page_privilege === 1) {
                setHasAccess(true);
                setCanCreate(Number(response.data?.can_create) === 1);
                setCanEdit(Number(response.data?.can_edit) === 1);
                setCanDelete(Number(response.data?.can_delete) === 1);
            } else {
                setHasAccess(false);
                setCanCreate(false);
                setCanEdit(false);
                setCanDelete(false);
            }
        } catch (error) {
            console.error("Error checking access:", error);
            setHasAccess(false);
            setCanCreate(false);
            setCanEdit(false);
            setCanDelete(false);
            setLoading(false);
        }
    };

    // ── Subjects State ──
    const [subjects, setSubjects] = useState([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [snack, setSnack] = useState({ open: false, message: "", severity: "success" });

    // ── Modal State ──
    const [openDialog, setOpenDialog] = useState(false);
    const [editingSubject, setEditingSubject] = useState(null); // null = Add, object = Edit
    const [modalName, setModalName] = useState("");
    const [modalMaxScore, setModalMaxScore] = useState("");
    const [modalIsActive, setModalIsActive] = useState(1);

    useEffect(() => {
        fetchSubjects();
    }, []);

    const fetchSubjects = async () => {
        try {
            const res = await axios.get(`${API_BASE_URL}/api/subjects/all`, { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` } });
            setSubjects(res.data || []);
        } catch {
            setSubjects([]);
        }
    };

    const openAddDialog = () => {
        if (!canCreate) {
            setSnack({ open: true, message: "You do not have permission to create subjects.", severity: "error" });
            return;
        }

        setEditingSubject(null);
        setModalName("");
        setModalMaxScore("");
        setModalIsActive(1);
        setOpenDialog(true);
    };

    const openEditDialog = (subject) => {
        if (!canEdit) {
            setSnack({ open: true, message: "You do not have permission to edit subjects.", severity: "error" });
            return;
        }

        setEditingSubject(subject);
        setModalName(subject.name);
        setModalMaxScore(subject.max_score);
        setModalIsActive(subject.is_active);
        setOpenDialog(true);
    };

    const handleCloseDialog = () => {
        setOpenDialog(false);
        setEditingSubject(null);
    };

    const handleSave = async () => {
        if (editingSubject && !canEdit) {
            setSnack({ open: true, message: "You do not have permission to edit subjects.", severity: "error" });
            return;
        }

        if (!editingSubject && !canCreate) {
            setSnack({ open: true, message: "You do not have permission to create subjects.", severity: "error" });
            return;
        }

        if (!modalName || !modalMaxScore) {
            setSnack({ open: true, message: "Please fill in all fields.", severity: "warning" });
            return;
        }

        if (editingSubject) {
            // UPDATE
            try {
                await axios.put(`${API_BASE_URL}/api/subjects/${editingSubject.id}`, {
                    ...editingSubject,
                    name: modalName,
                    max_score: modalMaxScore,
                    is_active: modalIsActive,
                }, getAuditConfigForPage());
                setSnack({ open: true, message: "Subject updated successfully.", severity: "success" });
                handleCloseDialog();
                fetchSubjects();
            } catch {
                setSnack({ open: true, message: "Failed to update subject.", severity: "error" });
            }
        } else {
            // CREATE
            try {
                await axios.post(`${API_BASE_URL}/api/subjects`, {
                    name: modalName,
                    max_score: modalMaxScore,
                    is_active: modalIsActive,
                }, getAuditConfigForPage());
                setSnack({ open: true, message: "Subject created successfully.", severity: "success" });
                handleCloseDialog();
                fetchSubjects();
            } catch {
                setSnack({ open: true, message: "Failed to create subject.", severity: "error" });
            }
        }
    };

    const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
    const [subjectToDelete, setSubjectToDelete] = useState(null);
    const [openDeactivateDialog, setOpenDeactivateDialog] = useState(false);
    const [subjectToDeactivate, setSubjectToDeactivate] = useState(null);

    const updateSubjectStatus = async (subject, nextStatus) => {
        if (!canEdit) {
            setSnack({ open: true, message: "You do not have permission to edit subjects.", severity: "error" });
            return;
        }

        try {
            await axios.put(`${API_BASE_URL}/api/subjects/${subject.id}`, {
                name: subject.name,
                max_score: subject.max_score,
                is_active: nextStatus,
            }, getAuditConfigForPage());

            setSnack({
                open: true,
                message: `Subject ${nextStatus === 1 ? "activated" : "deactivated"} successfully.`,
                severity: "success",
            });

            fetchSubjects();
        } catch (err) {
            setSnack({
                open: true,
                message: `Failed to ${nextStatus === 1 ? "activate" : "deactivate"} subject.`,
                severity: "error",
            });
        }
    };

    const handleToggleActive = (subject) => {
        if (!canEdit) {
            setSnack({ open: true, message: "You do not have permission to edit subjects.", severity: "error" });
            return;
        }

        const isActive = Number(subject.is_active) === 1;

        if (isActive) {
            setSubjectToDeactivate(subject);
            setOpenDeactivateDialog(true);
            return;
        }

        updateSubjectStatus(subject, 1);
    };

    const confirmDeactivateSubject = async () => {
        if (!subjectToDeactivate) return;

        await updateSubjectStatus(subjectToDeactivate, 0);
        setOpenDeactivateDialog(false);
        setSubjectToDeactivate(null);
    };


    const filtered = subjects.filter((s) =>
        s.name?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const activeCount = subjects.filter((s) => s.is_active === 1).length;
    const avgScore = subjects.length
        ? Math.round(subjects.reduce((a, s) => a + Number(s.max_score || 0), 0) / subjects.length)
        : 0;

    if (loading || hasAccess === null) return <LoadingOverlay open={loading} message="Loading..." />;
    if (!hasAccess) return <Unauthorized />;

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
            <Box
                display="flex"
                justifyContent="space-between"
                alignItems="center"
                mb={2}
            >
                <Typography variant="h4"
                    sx={{
                        fontWeight: 'bold',
                        color: titleColor,
                        fontSize: '36px',
                    }}
                >
                    SUBJECT MANAGEMENT
                </Typography>


                <TextField
                    size="small"
                    placeholder="Search subjects…"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    sx={{ width: 320, backgroundColor: "#fff", borderRadius: 1, minWidth: 220, "& .MuiOutlinedInput-root": { borderRadius: "10px" } }}
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <SearchIcon sx={{ color: "gray", fontSize: 20 }} />
                            </InputAdornment>
                        ),
                    }}
                />
            </Box>

            <hr style={{ border: "1px solid #ccc", width: "100%" }} />

            <br />
            <br />

            <AdmissionRoomAssignmentTabs />

            <br />
            <br />

            {/* ── Stats + Add Button Row ── */}
            <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2} mb={2}>

                <Button
                    variant="contained"

                    onClick={openAddDialog}
                    sx={{ borderRadius: 2, textTransform: "none", fontWeight: 600 }}
                >
                    + Add New Subject
                </Button>
            </Stack>

            {/* ── Subject Cards ── */}
            {filtered.length === 0 ? (
                <Box sx={{ textAlign: "center", py: 6, color: "text.secondary" }}>
                    <SubjectIcon sx={{ fontSize: 48, mb: 1, opacity: 0.3 }} />
                    <Typography>No subjects found.</Typography>
                </Box>
            ) : (
                <Grid container spacing={2}>
                    {filtered.map((subj) => {
                        const isActive = subj.is_active === 1;
                        return (
                            <Grid item xs={12} md={6} key={subj.id}>
                                <Card
                                    elevation={0}
                                    sx={{
                                        p: 2.5,
                                        borderRadius: 2,
                                        border: "1px solid",
                                        border: `1px solid ${borderColor}`,
                                        transition: "box-shadow 0.2s",
                                        "&:hover": { boxShadow: 3 },
                                    }}
                                >
                                    {/* Card Header */}
                                    <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                                        <Stack direction="row" alignItems="center" gap={1}>
                                            <CircleIcon sx={{ fontSize: 10, color: isActive ? "success.main" : "text.disabled" }} />
                                            <Typography variant="subtitle1" fontWeight={700}>
                                                {subj.name || "Unnamed Subject"}
                                            </Typography>
                                        </Stack>
                                        <Chip
                                            label={isActive ? "Active" : "Inactive"}
                                            size="small"
                                            color={isActive ? "success" : "default"}
                                            variant="outlined"
                                            sx={{ fontSize: 11, height: 22 }}
                                        />
                                    </Stack>

                                    <Divider sx={{ mb: 2 }} />

                                    {/* Info Display */}
                                    <Stack direction="row" gap={2} mb={2}>
                                        <Box sx={{ flex: 1, backgroundColor: "#f5f7ff", borderRadius: 2, p: 1.5 }}>
                                            <Typography variant="caption" color="text.secondary" fontWeight={600} textTransform="uppercase" letterSpacing={0.5}>
                                                Subject Name
                                            </Typography>
                                            <Typography variant="body1" fontWeight={700} mt={0.5}>
                                                {subj.name}
                                            </Typography>
                                        </Box>
                                        <Box sx={{ width: 110, backgroundColor: "#f5f7ff", borderRadius: 2, p: 1.5 }}>
                                            <Typography variant="caption" color="text.secondary" fontWeight={600} textTransform="uppercase" letterSpacing={0.5}>
                                                Max Score
                                            </Typography>
                                            <Typography variant="body1" fontWeight={700} mt={0.5}>
                                                {subj.max_score}
                                            </Typography>
                                        </Box>
                                    </Stack>

                                    {/* Footer */}
                                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                                        <Tooltip title={isActive ? "Deactivate subject" : "Activate subject"}>
                                            <Stack direction="row" alignItems="center" spacing={0.5}>
                                                <Switch
                                                    size="small"
                                                    checked={isActive}
                                                    color="success"
                                                    onChange={() => handleToggleActive(subj)}
                                                />
                                                <Typography variant="caption" color="text.secondary">
                                                    {isActive ? "Active" : "Inactive"}
                                                </Typography>
                                            </Stack>
                                        </Tooltip>

                                        <Stack direction="row" spacing={1}>
                                            <Button
                                                variant="contained"
                                                size="small"
                                                sx={{
                                                    backgroundColor: "green",
                                                    color: "white",
                                                    borderRadius: "5px",
                                                    padding: "8px 14px",
                                                    width: "100px",
                                                    display: "flex",
                                                    alignItems: "center",
                                                    justifyContent: "center",
                                                    gap: "5px",
                                                }}
                                                onClick={() => openEditDialog(subj)}
                                            >
                                                <EditIcon fontSize="small" /> Edit
                                            </Button>

                                            <Button
                                                variant="contained"
                                                size="small"
                                                sx={{
                                                    backgroundColor: "#9E0000",
                                                    color: "white",
                                                    borderRadius: "5px",
                                                    padding: "8px 14px",
                                                    width: "100px",
                                                    display: "flex",
                                                    alignItems: "center",
                                                    justifyContent: "center",
                                                    gap: "5px",
                                                }}
                                                onClick={() => {
                                                    setSubjectToDelete(subj);
                                                    setOpenDeleteDialog(true);
                                                }}
                                            >
                                                <DeleteIcon fontSize="small" /> Delete
                                            </Button>
                                        </Stack>
                                    </Stack>
                                </Card>
                            </Grid>
                        );
                    })}
                </Grid>
            )}

            {/* ── Add / Edit Dialog ── */}
            <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ fontWeight: "bold", backgroundColor: headerColor, color: "white" }}>
                    {editingSubject ? "Edit Subject" : "Add New Subject"}
                </DialogTitle>
                <DialogContent sx={{ pt: 3 }}>
                    <Typography fontWeight="bold" mb={1} mt={2}>
                        Subject Name
                    </Typography>
                    <TextField
                        label="Subject Name"
                        fullWidth
                        value={modalName}
                        onChange={(e) => setModalName(e.target.value)}

                        sx={{ mb: 2, mt: 1 }}
                    />

                    <Typography fontWeight="bold" mb={1} mt={1}>
                        Max Score
                    </Typography>
                    <TextField
                        label="Max Score"
                        fullWidth
                        type="number"
                        value={modalMaxScore}
                        onChange={(e) => setModalMaxScore(e.target.value)}

                        sx={{ mb: 2 }}
                    />

                    <Typography fontWeight="bold" mb={1} mt={1}>
                        Status
                    </Typography>
                    <Stack direction="row" alignItems="center" spacing={1} mt={1}>
                        <Switch
                            checked={modalIsActive === 1}
                            color="success"
                            onChange={(e) => setModalIsActive(e.target.checked ? 1 : 0)}
                        />
                        <Typography variant="body2" color="text.secondary">
                            {modalIsActive === 1 ? "Active" : "Inactive"}
                        </Typography>
                    </Stack>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button onClick={handleCloseDialog}
                        color="error"
                        variant="outlined">
                        Cancel
                    </Button>
                    <Button onClick={handleSave} startIcon={<SaveIcon />} variant="contained" >
                        Save
                    </Button>
                </DialogActions>
            </Dialog>

            {/* ── Snackbar ── */}
            <Snackbar
                open={snack.open}
                autoHideDuration={3000}
                onClose={() => setSnack((s) => ({ ...s, open: false }))}
                anchorOrigin={{ vertical: "top", horizontal: "center" }}
            >
                <Alert severity={snack.severity} variant="filled" onClose={() => setSnack((s) => ({ ...s, open: false }))} sx={{ borderRadius: 2 }}>
                    {snack.message}
                </Alert>
            </Snackbar>

            <Dialog
                open={openDeleteDialog}
                onClose={() => { setOpenDeleteDialog(false); setSubjectToDelete(null); }}
                maxWidth="xs"
                fullWidth
            >
                <DialogTitle
                    sx={{
                        background: headerColor,
                        color: "#fff",
                        fontWeight: 700,
                        fontSize: "1.2rem",
                        py: 2,
                    }}
                >
                    Delete Subject
                </DialogTitle>

                <DialogContent sx={{ p: 3, mt: 2 }}>
                    <Typography sx={{ mb: 2 }}>
                        Are you sure you want to delete the subject{" "}
                        <strong>{subjectToDelete?.name}</strong>?
                    </Typography>

                    <Typography sx={{ color: "#d32f2f", fontSize: "0.95rem" }}>
                        Deleting this subject will permanently remove it from the system.
                        <br />
                        This action cannot be undone and may affect related schedules
                        and enrollment records.
                    </Typography>
                </DialogContent>

                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button
                        color="error"
                        variant="outlined"
                        onClick={() => { setOpenDeleteDialog(false); setSubjectToDelete(null); }}
                    >
                        Cancel
                    </Button>
                    <Button
                        color="error"
                        variant="contained"
                        onClick={async () => {
                            if (!subjectToDelete) return;
                            try {
                                await axios.delete(
                                    `${API_BASE_URL}/api/subjects/${subjectToDelete.id}`,
                                    getAuditConfigForPage(),
                                );
                                setSnack({ open: true, message: "Subject deleted successfully ✅", severity: "success" });
                                fetchSubjects();
                            } catch (err) {
                                setSnack({ open: true, message: "Failed to delete subject ❌", severity: "error" });
                            }
                            setOpenDeleteDialog(false);
                            setSubjectToDelete(null);
                        }}
                    >
                        Yes, Delete
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog
                open={openDeactivateDialog}
                onClose={() => { setOpenDeactivateDialog(false); setSubjectToDeactivate(null); }}
                maxWidth="xs"
                fullWidth
            >
                <DialogTitle
                    sx={{
                        background: headerColor,
                        color: "#fff",
                        fontWeight: 700,
                        fontSize: "1.2rem",
                        py: 2,
                    }}
                >
                    Deactivate Subject
                </DialogTitle>

                <DialogContent sx={{ p: 3, mt: 2 }}>
                    <Typography sx={{ mb: 2 }}>
                        Are you sure you want to deactivate the subject{" "}
                        <strong>{subjectToDeactivate?.name}</strong>?
                    </Typography>

                    <Typography sx={{ color: "#d32f2f", fontSize: "0.95rem" }}>
                        Deactivating this subject will set its status to inactive.
                        <br />
                        It will no longer be available for enrollment until reactivated.
                    </Typography>
                </DialogContent>

                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button
                        color="error"
                        variant="outlined"
                        onClick={() => { setOpenDeactivateDialog(false); setSubjectToDeactivate(null); }}
                    >
                        Cancel
                    </Button>
                    <Button color="warning" variant="contained" onClick={confirmDeactivateSubject}>
                        Yes, Deactivate
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default ExamSubjectManagement;
