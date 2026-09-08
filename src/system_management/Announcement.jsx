import React, { useState, useEffect, useContext, useRef } from "react";
import { SettingsContext } from "../App";
import axios from "axios";
import {
    Box,
    Typography,
    TextField,
    Button,
    Table,
    TableHead,
    TableRow,
    TableCell,
    Paper,
    Grid,
    Snackbar,
    Alert,
    TableContainer,
    MenuItem,
    FormControl,
    Select,
    InputLabel,
    IconButton,
} from "@mui/material";
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
} from "@mui/material";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import Unauthorized from "../components/Unauthorized";
import LoadingOverlay from "../components/LoadingOverlay";
import API_BASE_URL from "../apiConfig";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import Cropper from "react-easy-crop";
import SaveIcon from '@mui/icons-material/Save';
import SearchIcon from "@mui/icons-material/Search";
import { getFlatAuditHeaders } from "../utils/auditEvents";
import useAuditMac from "../utils/useAuditMac";

const Announcement = () => {
    useAuditMac();
  const settings = useContext(SettingsContext);
  const colors = settings?.colors || {};
  const headerColor = colors.header || "#1976d2";

    const [titleColor, setTitleColor] = useState("#000");
    const [subtitleColor, setSubtitleColor] = useState("#555");
    const [borderColor, setBorderColor] = useState("#000");
    const [mainButtonColor, setMainButtonColor] = useState("#1976d2");

    const [announcements, setAnnouncements] = useState([]);
    const [form, setForm] = useState({
        title: "",
        content: "",
        valid_days: "permanent",
        target_role: "",
        campus: ""
    });
    const [editingId, setEditingId] = useState(null);
    const [image, setImage] = useState(null);
    const [userRole, setUserRole] = useState("");
    const [employeeID, setEmployeeID] = useState("");
    const [hasAccess, setHasAccess] = useState(null);
    const [canCreate, setCanCreate] = useState(false);
    const [canEdit, setCanEdit] = useState(false);
    const [canDelete, setCanDelete] = useState(false);
    const [loading, setLoading] = useState(false);

    const pageId = 66;
    const permissionHeaders = {
        headers: {
            ...getFlatAuditHeaders(),
            "x-employee-id": employeeID,
            "x-page-id": pageId,
            "x-audit-actor-id":
                employeeID ||
                localStorage.getItem("employee_id") ||
                localStorage.getItem("email") ||
                "unknown",
            "x-audit-actor-role": userRole || localStorage.getItem("role") || "registrar",
        },
    };

    const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });
    const branches = Array.isArray(settings?.branches)
        ? settings.branches
        : [];
    const getBranchName = (branchId) => {
        if (!branchId) return "All Campus";
        const branch = branches.find((b) => String(b.id) === String(branchId));
        return branch?.branch || branchId;
    };

    // Fetch settings colors
    useEffect(() => {
        if (!settings) return;
        if (colors.title) setTitleColor(colors.title);
        if (colors.subtitle) setSubtitleColor(colors.subtitle);
        if (colors.border) setBorderColor(colors.border);
        if (colors.mainButton) setMainButtonColor(colors.mainButton);
    }, [settings]);

    // Check access
    useEffect(() => {
        const storedRole = localStorage.getItem("role");
        const storedEmployeeID = localStorage.getItem("employee_id");
        if (storedRole === "registrar") {
            setUserRole(storedRole);
            setEmployeeID(storedEmployeeID);
            checkAccess(storedEmployeeID);
        } else {
            window.location.href = "/login";
        }
    }, []);

    const checkAccess = async (employeeID) => {
        try {
            const res = await axios.get(`${API_BASE_URL}/api/page_access/${employeeID}/${pageId}`);
            if (res.data?.page_privilege === 1) {
                setHasAccess(true);
                setCanCreate(Number(res.data?.can_create) === 1);
                setCanEdit(Number(res.data?.can_edit) === 1);
                setCanDelete(Number(res.data?.can_delete) === 1);
            } else {
                setHasAccess(false);
                setCanCreate(false);
                setCanEdit(false);
                setCanDelete(false);
            }
        } catch (err) {
            setHasAccess(false);
            setCanCreate(false);
            setCanEdit(false);
            setCanDelete(false);
            console.error(err);
        }
    };

    useEffect(() => {
        fetchAnnouncements();
    }, []);

    const fetchAnnouncements = async () => {
        try {
            const res = await axios.get(`${API_BASE_URL}/api/announcements`);

            const list = (res.data?.data || res.data || []).map(a => ({
                ...a,
                valid_days: a.valid_days != null && a.valid_days !== 0 ? String(a.valid_days) : "permanent",
            }));
            setAnnouncements(list);
        } catch (err) {
            console.error(err);
            setAnnouncements([]);
        }
    };
    const [openFormDialog, setOpenFormDialog] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (editingId && !canEdit) {
            setSnackbar({ open: true, message: "You do not have permission to edit this item", severity: "error" });
            return;
        }
        if (!editingId && !canCreate) {
            setSnackbar({ open: true, message: "You do not have permission to create items on this page", severity: "error" });
            return;
        }
        try {
            const formData = new FormData();
            formData.append("title", form.title);
            formData.append("content", form.content);
            formData.append("valid_days", form.valid_days);
            formData.append("target_role", form.target_role);
            formData.append("campus", form.campus);

            if (image) formData.append("image", image);

            if (editingId) {
                await axios.put(`${API_BASE_URL}/api/announcements/${editingId}`, formData, {
                    headers: {
                        ...getFlatAuditHeaders(),
                        "Content-Type": "multipart/form-data",
                        "x-employee-id": employeeID,
                        "x-page-id": pageId,
                        "x-audit-actor-id":
                            employeeID ||
                            localStorage.getItem("employee_id") ||
                            localStorage.getItem("email") ||
                            "unknown",
                        "x-audit-actor-role": userRole || localStorage.getItem("role") || "registrar",
                    },
                });
                setSnackbar({ open: true, message: "Announcement updated!", severity: "success" });
            } else {
                await axios.post(`${API_BASE_URL}/api/announcements`, formData, {
                    headers: {
                        ...getFlatAuditHeaders(),
                        "Content-Type": "multipart/form-data",
                        "x-employee-id": employeeID,
                        "x-page-id": pageId,
                        "x-audit-actor-id":
                            employeeID ||
                            localStorage.getItem("employee_id") ||
                            localStorage.getItem("email") ||
                            "unknown",
                        "x-audit-actor-role": userRole || localStorage.getItem("role") || "registrar",
                    },
                });
                setSnackbar({ open: true, message: "Announcement created!", severity: "success" });
            }

            setForm({
                title: "",
                content: "",
                valid_days: "permanent",
                target_role: "",
                campus: ""
            });
            setEditingId(null);
            setImage(null);
            fetchAnnouncements();
        } catch (err) {
            console.error(err);
            setSnackbar({ open: true, message: "Error saving announcement!", severity: "error" });
        }
    };
    const formRef = useRef(null);


    const handleEdit = (announcement) => {
        if (!canEdit) {
            setSnackbar({ open: true, message: "You do not have permission to edit this item", severity: "error" });
            return;
        }
        setForm({
            title: announcement?.title ?? "",
            content: announcement?.content ?? "",
            valid_days:
                announcement.valid_days === null || announcement.valid_days === 0
                    ? "permanent"
                    : announcement.valid_days.toString(),
            target_role: announcement?.target_role ?? "",
            campus: announcement?.campus ?? "",
        });

        setEditingId(announcement?.id ?? null);
        setImage(null);

        setTimeout(() => {
            formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 100);
    };
    const [announcementPage, setAnnouncementPage] = useState(1);
    const announcementsPerPage = 20; // change if you want

    const [searchTerm, setSearchTerm] = useState("");

    const filteredAnnouncements = announcements.filter((a) => {
        const search = searchTerm.toLowerCase();

        return (
            a.title?.toLowerCase().includes(search) ||
            a.content?.toLowerCase().includes(search) ||
            a.target_role?.toLowerCase().includes(search) ||
            getBranchName(a.campus)?.toLowerCase().includes(search)
        );
    });

    const totalAnnouncementPages = Math.ceil(
        filteredAnnouncements.length / announcementsPerPage
    );

    const paginatedAnnouncements = filteredAnnouncements.slice(
        (announcementPage - 1) * announcementsPerPage,
        announcementPage * announcementsPerPage
    );

    const paginationButtonStyle = {
        minWidth: 70,
        color: "white",
        borderColor: "white",
        backgroundColor: "transparent",
        '&:hover': {
            borderColor: 'white',
            backgroundColor: 'rgba(255,255,255,0.1)',
        },
        '&.Mui-disabled': {
            color: "white",
            borderColor: "white",
            backgroundColor: "transparent",
            opacity: 1,
        }
    };

    const paginationSelectStyle = {
        fontSize: '12px',
        height: 36,
        color: 'white',
        border: '1px solid white',
        backgroundColor: 'transparent',
        '.MuiOutlinedInput-notchedOutline': { borderColor: 'white' },
        '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'white' },
        '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: 'white' },
        '& svg': { color: 'white' }
    };


    const createImage = (url) =>
        new Promise((resolve, reject) => {
            const image = new Image();
            image.addEventListener("load", () => resolve(image));
            image.addEventListener("error", (error) => reject(error));
            image.setAttribute("crossOrigin", "anonymous");
            image.src = url;
        });

    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
    const [openCrop, setOpenCrop] = useState(false);
    const [imageSrc, setImageSrc] = useState(null);


    const getCroppedImg = async (imageSrc, crop) => {
        const image = await createImage(imageSrc);
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        canvas.width = 900;  // ✅ force exact size
        canvas.height = 700;

        ctx.drawImage(
            image,
            crop.x,
            crop.y,
            crop.width,
            crop.height,
            0,
            0,
            900,
            700
        );

        return new Promise((resolve) => {
            canvas.toBlob((blob) => {
                const file = new File([blob], "cropped.jpg", {
                    type: "image/jpeg",
                });
                resolve(file);
            }, "image/jpeg");
        });
    };

    const handleCropSave = async () => {
        try {
            const croppedFile = await getCroppedImg(imageSrc, croppedAreaPixels);

            setImage(croppedFile); // ✅ THIS replaces original image
            setOpenCrop(false);

            setSnackbar({
                open: true,
                message: "Image cropped successfully!",
                severity: "success",
            });
        } catch (e) {
            console.error(e);
        }
    };




    const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
    const [announcementToDelete, setAnnouncementToDelete] = useState(null);

    const handleDelete = async (id) => {
        if (!canDelete) {
            setSnackbar({
                open: true,
                message: "You do not have permission to delete this item",
                severity: "error",
            });
            return;
        }
        setSnackbar({
            open: true,
            message: "⏳ Deleting announcement...",
            severity: "info",
        });

        try {
            await axios.delete(`${API_BASE_URL}/api/announcements/${id}`, permissionHeaders);

            setSnackbar({
                open: true,
                message: "🗑️ Announcement deleted successfully!",
                severity: "success",
            });

            fetchAnnouncements();
        } catch (err) {
            console.error(err);

            setSnackbar({
                open: true,
                message: "❌ Failed to delete announcement.",
                severity: "error",
            });
        }
    };


    const handleRemoveImage = () => {
        setImage(null);
    };


    if (loading || hasAccess === null) return <LoadingOverlay open={loading} message="Loading..." />;
    if (!hasAccess) return <Unauthorized />;

    const showCreateActions = canCreate;
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

    return (
        <Box sx={{ height: "calc(100vh - 150px)", overflowY: "auto", paddingRight: 1, backgroundColor: "transparent", mt: 1, padding: 2 }}>  {/* Header */}
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
                    ANNOUNCEMENT
                </Typography>

                <TextField
                    size="small"
                    placeholder="Search announcements..."
                    value={searchTerm}
                    onChange={(e) => {
                        setSearchTerm(e.target.value);
                        setAnnouncementPage(1);
                    }}
                    sx={{
                        width: 450,
                        backgroundColor: "#fff",
                        borderRadius: 1,
                        "& .MuiOutlinedInput-root": {
                            borderRadius: "10px",
                        },
                    }}
                    InputProps={{
                        startAdornment: <SearchIcon sx={{ mr: 1, color: "gray" }} />,
                    }}
                />
            </Box>


            <hr style={{ border: "1px solid #ccc", width: "100%" }} />

            <br />
            <br />
            <TableContainer
                component={Paper}
                sx={{ width: "100%", border: `1px solid ${borderColor}` }}
            >
                <Table size="small">
                    <TableHead
                        sx={{
                            backgroundColor: headerColor,
                        }}
                    >
                        <TableRow>
                            <TableCell
                                colSpan={7}
                                sx={{
                                    border: `1px solid ${borderColor}`,
                                    py: 0.5,
                                    color: "white",
                                }}
                            >
                                <Box
                                    display="flex"
                                    justifyContent="space-between"
                                    alignItems="center"
                                    flexWrap="wrap"
                                    gap={1}
                                >
                                    {/* LEFT SIDE */}
                                    <Typography fontSize="14px" fontWeight="bold" color="white">
                                        Total Announcements Records: {filteredAnnouncements.length}
                                    </Typography>

                                    {/* RIGHT SIDE */}
                                    <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">

                                        <Button
                                            onClick={() => setAnnouncementPage(1)}
                                            disabled={announcementPage === 1}
                                            variant="outlined"
                                            size="small"
                                            sx={paginationButtonStyle}
                                        >
                                            First
                                        </Button>

                                        <Button
                                            onClick={() =>
                                                setAnnouncementPage((prev) => Math.max(prev - 1, 1))
                                            }
                                            disabled={announcementPage === 1}
                                            variant="outlined"
                                            size="small"
                                            sx={paginationButtonStyle}
                                        >
                                            Prev
                                        </Button>

                                        <FormControl size="small" sx={{ minWidth: 80 }}>
                                            <Select
                                                value={announcementPage}
                                                onChange={(e) =>
                                                    setAnnouncementPage(Number(e.target.value))
                                                }
                                                sx={paginationSelectStyle}
                                                MenuProps={{
                                                    PaperProps: { sx: { maxHeight: 200 } }
                                                }}
                                            >
                                                {Array.from(
                                                    { length: totalAnnouncementPages },
                                                    (_, i) => (
                                                        <MenuItem key={i + 1} value={i + 1}>
                                                            Page {i + 1}
                                                        </MenuItem>
                                                    )
                                                )}
                                            </Select>
                                        </FormControl>

                                        <Typography fontSize="11px" color="white">
                                            of {totalAnnouncementPages} page
                                            {totalAnnouncementPages > 1 ? "s" : ""}
                                        </Typography>

                                        <Button
                                            onClick={() =>
                                                setAnnouncementPage((prev) =>
                                                    Math.min(prev + 1, totalAnnouncementPages)
                                                )
                                            }
                                            disabled={announcementPage === totalAnnouncementPages}
                                            variant="outlined"
                                            size="small"
                                            sx={paginationButtonStyle}
                                        >
                                            Next
                                        </Button>

                                        <Button
                                            onClick={() =>
                                                setAnnouncementPage(totalAnnouncementPages)
                                            }
                                            disabled={announcementPage === totalAnnouncementPages}
                                            variant="outlined"
                                            size="small"
                                            sx={paginationButtonStyle}
                                        >
                                            Last
                                        </Button>

                                        {showCreateActions && (
                                            <Button
                                                variant="contained"
                                                disabled={!canCreate}
                                                sx={{
                                                    backgroundColor: "#1976d2", // ✅ Blue
                                                    color: "#fff",
                                                    opacity: canCreate ? 1 : 0.5,
                                                    fontWeight: "bold",
                                                    borderRadius: "8px",
                                                    width: "250px",
                                                    textTransform: "none",
                                                    px: 2,
                                                    mr: "15px",
                                                    '&:hover': {
                                                        backgroundColor: "#1565c0" // darker blue hover
                                                    }
                                                }}
                                                onClick={() => {
                                                    if (!canCreate) {
                                                        setSnackbar({ open: true, message: "You do not have permission to create items on this page", severity: "error" });
                                                        return;
                                                    }
                                                    setEditingId(null);
                                                    setForm({
                                                        title: "",
                                                        content: "",
                                                        valid_days: "permanent",
                                                        target_role: "applicant",
                                                        campus: ""
                                                    });
                                                    setImage(null);
                                                    setOpenFormDialog(true);
                                                }}
                                            >
                                                + Create Announcement
                                            </Button>
                                        )}
                                    </Box>
                                </Box>
                            </TableCell>
                        </TableRow>
                    </TableHead>
                </Table>
            </TableContainer>
            <Grid item xs={12} md={8}>



                {filteredAnnouncements.length === 0 ? (
                    <Box
                        sx={{
                            height: "90%",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                        }}
                    >
                        <Typography color="text.secondary" textAlign="center">
                            No active announcements.
                        </Typography>
                    </Box>
                ) : (
                    <Box component="table" sx={{ width: "100%", borderCollapse: "collapse" }}>
                        <thead>
                            <tr>
                                <th
                                    style={{
                                        border: `1px solid ${borderColor}`,
                                        padding: "12px",
                                        backgroundColor: "#f5f5f5",
                                        color: "black",
                                        textAlign: "center",
                                    }}
                                >
                                    Title
                                </th>
                                <th
                                    style={{
                                        border: `1px solid ${borderColor}`,
                                        padding: "12px",
                                        backgroundColor: "#f5f5f5",
                                        color: "black",
                                        textAlign: "center",
                                    }}
                                >
                                    Content
                                </th>
                                <th
                                    style={{
                                        border: `1px solid ${borderColor}`,
                                        padding: "12px",
                                        backgroundColor: "#f5f5f5",
                                        color: "black",
                                        textAlign: "center",
                                    }}
                                >
                                    Image
                                </th>
                                <th
                                    style={{
                                        border: `1px solid ${borderColor}`,
                                        padding: "12px",
                                        backgroundColor: "#f5f5f5",
                                        color: "black",
                                        textAlign: "center",
                                    }}
                                >
                                    Valid Days
                                </th>
                                <th
                                    style={{
                                        border: `1px solid ${borderColor}`,
                                        padding: "12px",
                                        backgroundColor: "#f5f5f5",
                                        color: "black",
                                        textAlign: "center",
                                    }}
                                >
                                    Target Role
                                </th>
                                <th
                                    style={{
                                        border: `1px solid ${borderColor}`,
                                        padding: "12px",
                                        backgroundColor: "#f5f5f5",
                                        color: "black",
                                        textAlign: "center",
                                    }}
                                >
                                    Campus
                                </th>
                                {showActionColumn && (
                                    <th
                                        style={{
                                            border: `1px solid ${borderColor}`,
                                            padding: "12px",
                                            backgroundColor: "#f5f5f5",
                                            color: "black",
                                            textAlign: "center",
                                        }}
                                    >
                                        Actions
                                    </th>
                                )}
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedAnnouncements.map((a, index) => (
                                <tr key={a.id} style={{
                                    height: "75px",
                                    backgroundColor: index % 2 === 0 ? "#ffffff" : "lightgray",
                                }}>
                                    <td style={{ border: `1px solid ${borderColor}`, padding: "8px", textAlign: "center", width: "200px" }}>
                                        {a.title}
                                    </td>
                                    <td style={{ border: `1px solid ${borderColor}`, padding: "8px", textAlign: "center", width: "200px" }}>
                                        {a.content}
                                    </td>

                                    {/* Image Cell */}
                                    <td
                                        style={{
                                            border: `1px solid ${borderColor}`,
                                            padding: "8px",
                                            width: "200px",
                                            height: "150px",
                                            textAlign: "center",
                                            verticalAlign: "middle",
                                        }}
                                    >
                                        {a.file_path ? (
                                            <img
                                                src={`${API_BASE_URL}/uploads/Announcement/${a.file_path}`}
                                                alt={a.title}
                                                style={{
                                                    width: "200px",
                                                    height: "150px",
                                                    objectFit: "contain",
                                                    background: "#000",
                                                    borderRadius: "4px",
                                                }}
                                            />
                                        ) : (
                                            "No Image"
                                        )}
                                    </td>

                                    <td style={{ border: `1px solid ${borderColor}`, padding: "8px", textAlign: "center" }}>
                                        {a.valid_days === null || a.valid_days === 0 || a.valid_days === "permanent"
                                            ? "Permanent"
                                            : `${a.valid_days} Day(s)`
                                        }
                                    </td>
                                    <td style={{ border: `1px solid ${borderColor}`, padding: "8px", textAlign: "center" }}>
                                        {a.target_role}
                                    </td>
                                    <td style={{ border: `1px solid ${borderColor}`, padding: "8px", textAlign: "center" }}>
                                        {getBranchName(a.campus)}
                                    </td>

                                    {/* Actions Cell */}
                                    {showActionColumn && (
                                        <td
                                            style={{
                                                border: `1px solid ${borderColor}`,
                                                padding: "8px",
                                                textAlign: "center",
                                                width: "150px",
                                            }}
                                        >
                                            <Box sx={{ display: "flex", justifyContent: "center", gap: "8px" }}>
                                                {canEdit && (
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
                                                            cursor: "pointer",
                                                        }}

                                                        onClick={() => {
                                                            handleEdit(a);
                                                            setOpenFormDialog(true);
                                                        }}
                                                    >

                                                        <EditIcon fontSize="small" /> Edit
                                                    </Button>
                                                )}
                                                {canDelete && (
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
                                                            cursor: "pointer",
                                                        }}
                                                        onClick={() => {
                                                            setAnnouncementToDelete(a);
                                                            setOpenDeleteDialog(true);
                                                        }}
                                                    >

                                                        <DeleteIcon fontSize="small" /> Delete
                                                    </Button>
                                                )}
                                            </Box>
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>


                    </Box>
                )}

            </Grid>
            <TableContainer
                component={Paper}
                sx={{ width: "100%", border: `1px solid ${borderColor}` }}
            >
                <Table size="small">
                    <TableHead
                        sx={{
                            backgroundColor: headerColor,
                        }}
                    >
                        <TableRow>
                            <TableCell
                                colSpan={7}
                                sx={{
                                    border: `1px solid ${borderColor}`,
                                    py: 0.5,
                                    color: "white",
                                }}
                            >
                                <Box
                                    display="flex"
                                    justifyContent="space-between"
                                    alignItems="center"
                                    flexWrap="wrap"
                                    gap={1}
                                >
                                    {/* LEFT SIDE */}
                                    <Typography fontSize="14px" fontWeight="bold" color="white">
                                        Total Announcements Records: {filteredAnnouncements.length}

                                    </Typography>

                                    {/* RIGHT SIDE */}
                                    <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">

                                        <Button
                                            onClick={() => setAnnouncementPage(1)}
                                            disabled={announcementPage === 1}
                                            variant="outlined"
                                            size="small"
                                            sx={paginationButtonStyle}
                                        >
                                            First
                                        </Button>

                                        <Button
                                            onClick={() =>
                                                setAnnouncementPage((prev) => Math.max(prev - 1, 1))
                                            }
                                            disabled={announcementPage === 1}
                                            variant="outlined"
                                            size="small"
                                            sx={paginationButtonStyle}
                                        >
                                            Prev
                                        </Button>

                                        <FormControl size="small" sx={{ minWidth: 80 }}>
                                            <Select
                                                value={announcementPage}
                                                onChange={(e) =>
                                                    setAnnouncementPage(Number(e.target.value))
                                                }
                                                sx={paginationSelectStyle}
                                                MenuProps={{
                                                    PaperProps: { sx: { maxHeight: 200 } }
                                                }}
                                            >
                                                {Array.from(
                                                    { length: totalAnnouncementPages },
                                                    (_, i) => (
                                                        <MenuItem key={i + 1} value={i + 1}>
                                                            Page {i + 1}
                                                        </MenuItem>
                                                    )
                                                )}
                                            </Select>
                                        </FormControl>

                                        <Typography fontSize="11px" color="white">
                                            of {totalAnnouncementPages} page
                                            {totalAnnouncementPages > 1 ? "s" : ""}
                                        </Typography>

                                        <Button
                                            onClick={() =>
                                                setAnnouncementPage((prev) =>
                                                    Math.min(prev + 1, totalAnnouncementPages)
                                                )
                                            }
                                            disabled={announcementPage === totalAnnouncementPages}
                                            variant="outlined"
                                            size="small"
                                            sx={paginationButtonStyle}
                                        >
                                            Next
                                        </Button>

                                        <Button
                                            onClick={() =>
                                                setAnnouncementPage(totalAnnouncementPages)
                                            }
                                            disabled={announcementPage === totalAnnouncementPages}
                                            variant="outlined"
                                            size="small"
                                            sx={paginationButtonStyle}
                                        >
                                            Last
                                        </Button>

                                    </Box>
                                </Box>
                            </TableCell>
                        </TableRow>
                    </TableHead>
                </Table>
            </TableContainer>




            <Dialog open={openDeleteDialog} onClose={() => setOpenDeleteDialog(false)} maxWidth="xs" fullWidth>
                <DialogTitle
                    sx={{
                        background: colors.header || "#9E0000",
                        color: "#fff",
                        fontWeight: 700,
                        fontSize: "1.2rem",
                        py: 2,
                    }}
                >
                    Delete Announcement
                </DialogTitle>

                <DialogContent sx={{ p: 3, mt: 2 }}>
                    <Typography sx={{ mb: 2 }}>
                        Are you sure you want to delete the announcement titled{" "}
                        <strong>{announcementToDelete?.title}</strong>?
                    </Typography>

                    <Typography sx={{ color: "#d32f2f", fontSize: "0.95rem" }}>
                        Deleting this announcement will permanently remove it from the system.
                        <br />
                        Students and staff who rely on this announcement will no longer be able
                        to view its contents.
                    </Typography>
                </DialogContent>

                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button color="error" variant="outlined" onClick={() => setOpenDeleteDialog(false)}>
                        Cancel
                    </Button>
                    <Button
                        color="error"
                        variant="contained"
                        onClick={() => {
                            handleDelete(announcementToDelete.id);
                            setOpenDeleteDialog(false);
                            setAnnouncementToDelete(null);
                        }}
                    >
                        Yes, Delete
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog open={openCrop} onClose={() => setOpenCrop(false)} maxWidth="md">
                <DialogTitle>Crop Image (900 x 700)</DialogTitle>

                <DialogContent>
                    <Box sx={{ position: "relative", width: "500px", height: "375px" }}>
                        <Cropper
                            image={imageSrc}
                            crop={crop}
                            zoom={zoom}
                            aspect={1000 / 750} // ✅ IMPORTANT (4:3 ratio)
                            onCropChange={setCrop}
                            onZoomChange={setZoom}
                            onCropComplete={(croppedArea, croppedPixels) => {
                                setCroppedAreaPixels(croppedPixels);
                            }}
                        />
                    </Box>
                </DialogContent>

                <DialogActions>
                    <Button
                        color="error"
                        variant="outlined"

                        onClick={() => setOpenCrop(false)}>Cancel</Button>
                    <Button variant="contained" onClick={handleCropSave}>
                        Crop & Use Image
                    </Button>
                </DialogActions>
            </Dialog>

            <Snackbar
                open={snackbar.open}
                autoHideDuration={3000}
                onClose={() => setSnackbar({ ...snackbar, open: false })}
                anchorOrigin={{ vertical: "top", horizontal: "center" }}
            >
                <Alert severity={snackbar.severity} sx={{ width: "100%" }}>
                    {snackbar.message}
                </Alert>
            </Snackbar>

            <Dialog
                open={openFormDialog}
                onClose={() => setOpenFormDialog(false)}
                maxWidth="md"
                fullWidth
                PaperProps={{
                    sx: {
                        borderRadius: 3,
                        overflow: "hidden",
                        boxShadow: 6
                    }
                }}
            >
                {/* HEADER */}
                <DialogTitle
                    sx={{
                        background: headerColor,
                        color: "#fff",
                        fontWeight: 700,
                        fontSize: "1.2rem",
                        py: 2
                    }}
                >
                    {editingId ? "Edit Announcement" : "Create Announcement"}
                </DialogTitle>

                {/* CONTENT */}
                <DialogContent sx={{ p: 3 }}>
                    <Grid container spacing={2} mt={2}>
                        <Grid item xs={12} >
                            <Typography fontWeight={600}>Title</Typography>
                            <TextField
                                fullWidth
                                label="Title"
                                value={form.title}
                                onChange={(e) =>
                                    setForm({ ...form, title: e.target.value })
                                }
                            />
                        </Grid>

                        <Grid item xs={12}>
                            <Typography fontWeight={600}>Content</Typography>
                            <TextField
                                fullWidth
                                multiline
                                rows={4}
                                label="Content"
                                value={form.content}
                                onChange={(e) =>
                                    setForm({ ...form, content: e.target.value })
                                }
                            />
                        </Grid>

                        <Grid item xs={12} md={4}>
                            <Typography fontWeight={600}>Valid For</Typography>
                            <FormControl fullWidth>
                                <InputLabel>Valid For</InputLabel>
                                <Select
                                    value={form.valid_days}
                                    label="Valid For"
                                    onChange={(e) =>
                                        setForm({
                                            ...form,
                                            valid_days: e.target.value
                                        })
                                    }
                                >
                                    <MenuItem value="permanent">Permanent</MenuItem>
                                    {["1", "3", "7", "14", "30", "60", "90"].map((d) => (
                                        <MenuItem key={d} value={d}>
                                            {d} Day(s)
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>

                        <Grid item xs={12} md={4}>
                            <Typography fontWeight={600}>Target Role</Typography>
                            <FormControl fullWidth>
                                <InputLabel>Target Role</InputLabel>
                                <Select
                                    value={form.target_role}
                                    label="Target Role"
                                    onChange={(e) =>
                                        setForm({
                                            ...form,
                                            target_role: e.target.value
                                        })
                                    }
                                >
                                    <MenuItem value="student">Student</MenuItem>
                                    <MenuItem value="faculty">Faculty</MenuItem>
                                    <MenuItem value="applicant">Applicant</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>

                        <Grid item xs={12} md={4}>
                            <Typography fontWeight={600}>Campus</Typography>
                            <FormControl fullWidth>
                                <InputLabel>Campus</InputLabel>
                                <Select
                                    value={form.campus}
                                    label="Campus"
                                    onChange={(e) =>
                                        setForm({
                                            ...form,
                                            campus: e.target.value
                                        })
                                    }
                                >
                                    <MenuItem value="">All Campus</MenuItem>
                                    {branches.map((branch) => (
                                        <MenuItem key={branch.id} value={String(branch.id)}>
                                            {branch.branch}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>

                        <Grid item xs={12}>
                            <Button
                                variant="contained"
                                component="label"
                                startIcon={<CloudUploadIcon />}
                                fullWidth
                                sx={{ mt: 1 }}
                            >
                                {image ? "Change Image" : "Upload Image"}
                                <input
                                    type="file"
                                    hidden
                                    accept="image/*"
                                    onChange={(e) => {
                                        const file = e.target.files[0];
                                        if (!file) return;

                                        const reader = new FileReader();
                                        reader.onload = () => {
                                            setImageSrc(reader.result);
                                            setOpenCrop(true);
                                        };
                                        reader.readAsDataURL(file);
                                    }}
                                />
                            </Button>
                        </Grid>

                        {image && (
                            <Grid item xs={12}>
                                <Box
                                    sx={{
                                        mt: 1,
                                        p: 1,
                                        border: "1px solid #ddd",
                                        borderRadius: 2,
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 2
                                    }}
                                >
                                    <Box
                                        component="img"
                                        src={URL.createObjectURL(image)}
                                        alt="preview"
                                        sx={{
                                            width: 50,
                                            height: 50,
                                            objectFit: "cover"
                                        }}
                                    />

                                    <Typography sx={{ flexGrow: 1 }}>
                                        {image.name}
                                    </Typography>

                                    <IconButton onClick={handleRemoveImage}>
                                        ✕
                                    </IconButton>
                                </Box>
                            </Grid>
                        )}
                    </Grid>
                </DialogContent>

                {/* ACTIONS */}
                <DialogActions
                    sx={{
                        px: 3,
                        py: 2,
                        borderTop: "1px solid #e0e0e0"
                    }}
                >
                    <Button
                        color="error"
                        variant="outlined"
                        onClick={() => setOpenFormDialog(false)}
                    >
                        Cancel
                    </Button>

                    <Button
                        variant="contained"
                        onClick={(e) => {
                            if (editingId && !canEdit) {
                                setSnackbar({ open: true, message: "You do not have permission to edit this item", severity: "error" });
                                return;
                            }
                            if (!editingId && !canCreate) {
                                setSnackbar({ open: true, message: "You do not have permission to create items on this page", severity: "error" });
                                return;
                            }
                            handleSubmit(e);
                            setOpenFormDialog(false);
                        }}
                        sx={{
                            px: 4,
                            fontWeight: 600,
                            textTransform: "none"
                        }}
                    >
                        <SaveIcon fontSize="small" /> Save

                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default Announcement;
