import React, { useState, useEffect, useContext } from "react";
import axios from "axios";
import {
    Box,
    Dialog,
    DialogTitle,
    DialogActions,
    DialogContent,
    Typography,
    TextField,
    Button,
    IconButton,
    Snackbar,
    Alert,
    Table,
    TableHead,
    TableRow,
    TableCell,
    TableBody,
    Paper,
    TableContainer,
    CircularProgress,
    FormControl,
    Select,
    MenuItem,
    InputLabel,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import SearchIcon from "@mui/icons-material/Search";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import SaveIcon from "@mui/icons-material/Save";
import { SettingsContext } from "../App";
import Unauthorized from "../components/Unauthorized";
import LoadingOverlay from "../components/LoadingOverlay";
import API_BASE_URL from "../apiConfig";
import { getFlatAuditHeaders } from "../utils/auditEvents";
import useAuditMac from "../utils/useAuditMac";

const DAY_OPTIONS = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
];

const EMPTY_CONTACT = {
    branchId: "",
    email: "",
    contactNumber: "",
    officeDaysStart: "Monday",
    officeDaysEnd: "Friday",
    officeTimeStart: "08:00",
    officeTimeEnd: "17:00",
    facebookUrl: "",
};

const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || "").trim());

// backend returns "08:00:00" — trim seconds for the <input type="time">
const toTimeInputValue = (value) => (value ? value.slice(0, 5) : "");

const formatTimeDisplay = (time) => {
    if (!time) return "";
    const d = new Date(`1970-01-01T${time}`);
    if (isNaN(d.getTime())) return time;
    return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
};

const AdmissionContactManagement = () => {
    useAuditMac();
    const settings = useContext(SettingsContext);

    const colors = settings?.colors || {};
    const titleColor = colors.title || "#000000";
    const borderColor = colors.border || "#000000";
    const headerColor = colors.header || "#1976d2";

    // 🔐 Page access control
    // NOTE: replace with the actual page_id assigned to Admission Contact
    // Management in your page_access table.
    const pageId = 172;

    const [userID, setUserID] = useState("");
    const [user, setUser] = useState("");
    const [userRole, setUserRole] = useState("");
    const [employeeID, setEmployeeID] = useState("");
    const [hasAccess, setHasAccess] = useState(null);
    const [canCreate, setCanCreate] = useState(false);
    const [canEdit, setCanEdit] = useState(false);
    const [canDelete, setCanDelete] = useState(false);
    const [loading, setLoading] = useState(false);

    const permissionHeaders = {
        headers: {
            ...getFlatAuditHeaders(),
            "x-employee-id": employeeID,
            "x-page-id": pageId,
            "x-audit-actor-id": employeeID,
            "x-audit-actor-role": userRole || localStorage.getItem("role") || "registrar",
        },
    };

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

            if (storedRole === "registrar") {
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
            const response = await axios.get(`${API_BASE_URL}/api/page_access/${employeeID}/${pageId}`);
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

    // 📋 Data
    const [contactList, setContactList] = useState([]);
    const [contactLoading, setContactLoading] = useState(false);

    const [contact, setContact] = useState(EMPTY_CONTACT);

    const [openModal, setOpenModal] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [selectedId, setSelectedId] = useState(null);

    const [snack, setSnack] = useState({ open: false, message: "", severity: "success" });
    const showSnack = (message, severity = "success") => setSnack({ open: true, message, severity });

    useEffect(() => {
        fetchContacts();
    }, []);

    const fetchContacts = async () => {
        setContactLoading(true);
        try {
            const res = await axios.get(`${API_BASE_URL}/api/admission_contact`);
            setContactList(res.data || []);
        } catch (err) {
            console.error(err);
            setContactList([]);
        } finally {
            setContactLoading(false);
        }
    };

    const branches = settings?.branches || [];



    const getBranchName = (branchId) =>
        branches.find((b) => b.id === Number(branchId))?.branch || "Unknown";

    const handleChangesForEverything = (e) => {
        const { name, value } = e.target;
        setContact((prev) => ({ ...prev, [name]: value }));
    };

    const handleSavingContact = async () => {
        // ✅ CHANGED: Email and Contact Number are now optional. Only validate
        // the email's format if the admin actually typed one in.
        if (contact.email.trim() && !isValidEmail(contact.email)) {
            showSnack("Enter a valid email address", "warning");
            return;
        }

        if (!contact.officeTimeStart || !contact.officeTimeEnd) {
            showSnack("Office start and end time are required", "warning");
            return;
        }

        if (!contact.branchId) {
            showSnack("Please select a branch", "warning");
            return;
        }

        if (editMode && !canEdit) {
            showSnack("You do not have permission to edit this item", "error");
            return;
        }

        if (!editMode && !canCreate) {
            showSnack("You do not have permission to create items on this page", "error");
            return;
        }

        const payload = {
            branch_id: contact.branchId,
            email: contact.email.trim() || null,
            contact_number: contact.contactNumber.trim() || null,
            office_days_start: contact.officeDaysStart,
            office_days_end: contact.officeDaysEnd,
            office_time_start: contact.officeTimeStart,
            office_time_end: contact.officeTimeEnd,
            facebook_url: contact.facebookUrl.trim() || null,
        };

        try {
            if (editMode) {
                await axios.put(`${API_BASE_URL}/api/admission_contact/${selectedId}`, payload, permissionHeaders);
                showSnack("Admission contact updated successfully!", "success");
            } else {
                await axios.post(`${API_BASE_URL}/api/admission_contact`, payload, permissionHeaders);
                showSnack("Admission contact added successfully!", "success");
            }

            fetchContacts();
            setContact(EMPTY_CONTACT);
            setEditMode(false);
            setSelectedId(null);
            setOpenModal(false);
        } catch (err) {
            showSnack(err.response?.data?.error || "Operation failed", "error");
        }
    };

    const handleEdit = (row) => {
        if (!canEdit) {
            showSnack("You do not have permission to edit this item", "error");
            return;
        }

        setContact({
            branchId: row.branch_id || "",
            email: row.email || "",
            contactNumber: row.contact_number || "",
            officeDaysStart: row.office_days_start || "Monday",
            officeDaysEnd: row.office_days_end || "Friday",
            officeTimeStart: toTimeInputValue(row.office_time_start),
            officeTimeEnd: toTimeInputValue(row.office_time_end),
            facebookUrl: row.facebook_url || "",
        });
        setSelectedId(row.id);
        setEditMode(true);
        setOpenModal(true);
    };

    const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
    const [contactToDelete, setContactToDelete] = useState(null);

    const handleDelete = async (id) => {
        if (!canDelete) {
            showSnack("You do not have permission to delete this item", "error");
            return;
        }

        try {
            await axios.delete(`${API_BASE_URL}/api/admission_contact/${id}`, permissionHeaders);
            showSnack("Admission contact deleted successfully!", "success");
            fetchContacts();
        } catch (err) {
            showSnack("Failed to delete admission contact", "error");
        }
    };

    // 🔎 Search
    const [searchQuery, setSearchQuery] = useState("");

    const filteredContacts = contactList.filter((row) => {
        const q = searchQuery.toLowerCase();
        return (
            row.email?.toLowerCase().includes(q) ||
            row.contact_number?.toLowerCase().includes(q)
        );
    });

    // 📄 Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 20;
    const totalPages = Math.ceil(filteredContacts.length / itemsPerPage) || 1;
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentContacts = filteredContacts.slice(indexOfFirstItem, indexOfLastItem);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery]);

    if (loading || hasAccess === null) {
        return <LoadingOverlay open={loading} message="Loading..." />;
    }

    if (!hasAccess) {
        return <Unauthorized />;
    }

    const showCreateActions = canCreate;
    const showActionColumn = canEdit || canDelete;

    return (
        <Box sx={{ height: "calc(100vh - 150px)", overflowY: "auto", paddingRight: 1, backgroundColor: "transparent", mt: 1, padding: 2 }}>
            <Box
                sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: 2,
                    mb: 2,
                }}
            >
                <Typography variant="h4" sx={{ fontWeight: "bold", color: titleColor, fontSize: "36px" }}>
                    ADMISSION CONTACT MANAGEMENT
                </Typography>

                <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap", justifyContent: "flex-end" }}>
                    <TextField
                        variant="outlined"
                        placeholder="Search Email / Contact Number"
                        size="small"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        sx={{
                            width: 450,
                            backgroundColor: "#fff",
                            borderRadius: 1,
                            "& .MuiOutlinedInput-root": { borderRadius: "10px" },
                        }}
                        InputProps={{ startAdornment: <SearchIcon sx={{ mr: 1, color: "gray" }} /> }}
                    />
                </Box>
            </Box>
            <hr style={{ border: "1px solid #ccc", width: "100%" }} />

            <br />
            <br />

            <TableContainer component={Paper} sx={{ width: "100%" }}>
                <Table size="small">
                    <TableHead sx={{ backgroundColor: headerColor, color: "white" }}>
                        <TableRow>
                            <TableCell sx={{ border: `1px solid ${borderColor}`, py: 0.5, backgroundColor: headerColor, color: "white" }}>
                                <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" sx={{ padding: "6px" }}>
                                    <Typography fontSize="14px" fontWeight="bold" color="white">
                                        Total Admission Contact Records: {filteredContacts.length}
                                    </Typography>

                                    <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
                                        <Button
                                            onClick={() => setCurrentPage(1)}
                                            disabled={currentPage === 1}
                                            variant="outlined"
                                            size="small"
                                            sx={{ minWidth: 80, color: "white", borderColor: "white", backgroundColor: "transparent", "&:hover": { borderColor: "white", backgroundColor: "rgba(255,255,255,0.1)" }, "&.Mui-disabled": { color: "white", borderColor: "white", backgroundColor: "transparent", opacity: 1 } }}
                                        >
                                            First
                                        </Button>
                                        <Button
                                            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                                            disabled={currentPage === 1}
                                            variant="outlined"
                                            size="small"
                                            sx={{ minWidth: 80, color: "white", borderColor: "white", backgroundColor: "transparent", "&:hover": { borderColor: "white", backgroundColor: "rgba(255,255,255,0.1)" }, "&.Mui-disabled": { color: "white", borderColor: "white", backgroundColor: "transparent", opacity: 1 } }}
                                        >
                                            Prev
                                        </Button>

                                        <FormControl size="small" sx={{ minWidth: 80 }}>
                                            <Select
                                                value={currentPage}
                                                onChange={(e) => setCurrentPage(Number(e.target.value))}
                                                displayEmpty
                                                sx={{
                                                    fontSize: "12px",
                                                    height: 36,
                                                    color: "white",
                                                    border: "1px solid white",
                                                    backgroundColor: "transparent",
                                                    ".MuiOutlinedInput-notchedOutline": { borderColor: "white" },
                                                    "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "white" },
                                                    "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: "white" },
                                                    "& svg": { color: "white" },
                                                }}
                                                MenuProps={{ PaperProps: { sx: { maxHeight: 200, backgroundColor: "#fff" } } }}
                                            >
                                                {Array.from({ length: totalPages }, (_, i) => (
                                                    <MenuItem key={i + 1} value={i + 1}>
                                                        Page {i + 1}
                                                    </MenuItem>
                                                ))}
                                            </Select>
                                        </FormControl>
                                        <Typography fontSize="11px" color="white">
                                            of {totalPages} page{totalPages > 1 ? "s" : ""}
                                        </Typography>

                                        <Button
                                            onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                                            disabled={currentPage === totalPages}
                                            variant="outlined"
                                            size="small"
                                            sx={{ minWidth: 80, color: "white", borderColor: "white", backgroundColor: "transparent", "&:hover": { borderColor: "white", backgroundColor: "rgba(255,255,255,0.1)" }, "&.Mui-disabled": { color: "white", borderColor: "white", backgroundColor: "transparent", opacity: 1 } }}
                                        >
                                            Next
                                        </Button>
                                        <Button
                                            onClick={() => setCurrentPage(totalPages)}
                                            disabled={currentPage === totalPages}
                                            variant="outlined"
                                            size="small"
                                            sx={{ minWidth: 80, color: "white", borderColor: "white", backgroundColor: "transparent", "&:hover": { borderColor: "white", backgroundColor: "rgba(255,255,255,0.1)" }, "&.Mui-disabled": { color: "white", borderColor: "white", backgroundColor: "transparent", opacity: 1 } }}
                                        >
                                            Last
                                        </Button>

                                        {showCreateActions && (
                                            <Button
                                                variant="contained"
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
                                                onClick={() => {
                                                    setEditMode(false);
                                                    setContact(EMPTY_CONTACT);
                                                    setOpenModal(true);
                                                }}
                                            >
                                                + Add Admission Contact
                                            </Button>
                                        )}
                                    </Box>
                                </Box>
                            </TableCell>
                        </TableRow>
                    </TableHead>
                </Table>
            </TableContainer>

            <Box>
                {contactLoading ? (
                    <CircularProgress />
                ) : (
                    <Table size="small">
                        <TableHead>
                            <TableRow style={{ border: `1px solid ${borderColor}`, backgroundColor: "#F5F5F5", color: "#000" }}>
                                <TableCell sx={{ color: "#000", border: `1px solid ${borderColor}`, textAlign: "center" }}>#</TableCell>
                                <TableCell sx={{ color: "#000", border: `1px solid ${borderColor}`, textAlign: "center" }}>Branch</TableCell>
                                <TableCell sx={{ color: "#000", border: `1px solid ${borderColor}`, textAlign: "center" }}>Email</TableCell>
                                <TableCell sx={{ color: "#000", border: `1px solid ${borderColor}`, textAlign: "center" }}>Contact Number</TableCell>
                                <TableCell sx={{ color: "#000", border: `1px solid ${borderColor}`, textAlign: "center" }}>Office Days</TableCell>
                                <TableCell sx={{ color: "#000", border: `1px solid ${borderColor}`, textAlign: "center" }}>Office Hours</TableCell>
                                <TableCell sx={{ color: "#000", border: `1px solid ${borderColor}`, textAlign: "center" }}>Facebook</TableCell>
                                {showActionColumn && (
                                    <TableCell sx={{ color: "#000", border: `1px solid ${borderColor}`, textAlign: "center" }}>Action</TableCell>
                                )}
                            </TableRow>
                        </TableHead>

                        <TableBody
                            sx={{
                                border: `1px solid ${borderColor}`,
                                "& .MuiTableRow-root:nth-of-type(odd)": { backgroundColor: "#ffffff" },
                                "& .MuiTableRow-root:nth-of-type(even)": { backgroundColor: "lightgray" },
                            }}
                        >
                            {currentContacts.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7}><em>No Admission Contact Records</em></TableCell>
                                </TableRow>
                            ) : (
                                currentContacts.map((row, index) => (
                                    <TableRow key={row.id}>
                                        <TableCell sx={{ border: `1px solid ${borderColor}`, textAlign: "center" }}>
                                            {indexOfFirstItem + index + 1}
                                        </TableCell>
                                        <TableCell sx={{ border: `1px solid ${borderColor}`, textAlign: "center" }}>
                                            {getBranchName(row.branch_id)}
                                        </TableCell>
                                        <TableCell sx={{ border: `1px solid ${borderColor}`, textAlign: "center" }}>
                                            {row.email}
                                        </TableCell>

                                        <TableCell sx={{ border: `1px solid ${borderColor}`, textAlign: "center" }}>
                                            {row.contact_number}
                                        </TableCell>
                                        <TableCell sx={{ border: `1px solid ${borderColor}`, textAlign: "center" }}>
                                            {row.office_days_start && row.office_days_end
                                                ? `${row.office_days_start} – ${row.office_days_end}`
                                                : ""}
                                        </TableCell>
                                        <TableCell sx={{ border: `1px solid ${borderColor}`, textAlign: "center" }}>
                                            {row.office_time_start && row.office_time_end
                                                ? `${formatTimeDisplay(row.office_time_start)} – ${formatTimeDisplay(row.office_time_end)}`
                                                : ""}
                                        </TableCell>
                                        <TableCell sx={{ border: `1px solid ${borderColor}`, textAlign: "center" }}>
                                            {row.facebook_url ? (
                                                <a href={row.facebook_url} target="_blank" rel="noopener noreferrer">
                                                    {row.facebook_url}
                                                </a>
                                            ) : (
                                                "—"
                                            )}
                                        </TableCell>

                                        {showActionColumn && (
                                            <TableCell sx={{ border: `1px solid ${borderColor}`, textAlign: "center", width: "250px" }}>
                                                <Box sx={{ display: "flex", flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 1 }}>
                                                    {canEdit && (
                                                        <Button
                                                            variant="contained"
                                                            size="small"
                                                            sx={{
                                                                backgroundColor: "green",
                                                                color: "white",
                                                                borderRadius: "5px",
                                                                padding: "8px",
                                                                width: "100px",
                                                                display: "flex",
                                                                alignItems: "center",
                                                                justifyContent: "center",
                                                                gap: "5px",
                                                                cursor: "pointer",
                                                                "&:hover": { backgroundColor: "#0b7a0b" },
                                                            }}
                                                            onClick={() => handleEdit(row)}
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
                                                                padding: "8px",
                                                                width: "100px",
                                                                display: "flex",
                                                                alignItems: "center",
                                                                justifyContent: "center",
                                                                gap: "5px",
                                                                cursor: "pointer",
                                                                "&:hover": { backgroundColor: "#7a0000" },
                                                            }}
                                                            onClick={() => {
                                                                setContactToDelete(row);
                                                                setOpenDeleteDialog(true);
                                                            }}
                                                        >
                                                            <DeleteIcon fontSize="small" /> Delete
                                                        </Button>
                                                    )}
                                                </Box>
                                            </TableCell>
                                        )}
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                )}
                {contactList.length === 0 && !contactLoading && <p>No admission contact records available.</p>}
            </Box>

            <TableContainer component={Paper} sx={{ width: "100%" }}>
                <Table size="small">
                    <TableHead sx={{ backgroundColor: headerColor, color: "white" }}>
                        <TableRow>
                            <TableCell sx={{ border: `1px solid ${borderColor}`, py: 0.5, backgroundColor: headerColor, color: "white" }}>
                                <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" sx={{ padding: "6px" }}>
                                    <Typography fontSize="14px" fontWeight="bold" color="white">
                                        Total Admission Contact Records: {filteredContacts.length}
                                    </Typography>

                                    <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
                                        <Button
                                            onClick={() => setCurrentPage(1)}
                                            disabled={currentPage === 1}
                                            variant="outlined"
                                            size="small"
                                            sx={{ minWidth: 80, color: "white", borderColor: "white", backgroundColor: "transparent", "&:hover": { borderColor: "white", backgroundColor: "rgba(255,255,255,0.1)" }, "&.Mui-disabled": { color: "white", borderColor: "white", backgroundColor: "transparent", opacity: 1 } }}
                                        >
                                            First
                                        </Button>
                                        <Button
                                            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                                            disabled={currentPage === 1}
                                            variant="outlined"
                                            size="small"
                                            sx={{ minWidth: 80, color: "white", borderColor: "white", backgroundColor: "transparent", "&:hover": { borderColor: "white", backgroundColor: "rgba(255,255,255,0.1)" }, "&.Mui-disabled": { color: "white", borderColor: "white", backgroundColor: "transparent", opacity: 1 } }}
                                        >
                                            Prev
                                        </Button>

                                        <FormControl size="small" sx={{ minWidth: 80 }}>
                                            <Select
                                                value={currentPage}
                                                onChange={(e) => setCurrentPage(Number(e.target.value))}
                                                displayEmpty
                                                sx={{
                                                    fontSize: "12px",
                                                    height: 36,
                                                    color: "white",
                                                    border: "1px solid white",
                                                    backgroundColor: "transparent",
                                                    ".MuiOutlinedInput-notchedOutline": { borderColor: "white" },
                                                    "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "white" },
                                                    "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: "white" },
                                                    "& svg": { color: "white" },
                                                }}
                                                MenuProps={{ PaperProps: { sx: { maxHeight: 200, backgroundColor: "#fff" } } }}
                                            >
                                                {Array.from({ length: totalPages }, (_, i) => (
                                                    <MenuItem key={i + 1} value={i + 1}>
                                                        Page {i + 1}
                                                    </MenuItem>
                                                ))}
                                            </Select>
                                        </FormControl>
                                        <Typography fontSize="11px" color="white">
                                            of {totalPages} page{totalPages > 1 ? "s" : ""}
                                        </Typography>

                                        <Button
                                            onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                                            disabled={currentPage === totalPages}
                                            variant="outlined"
                                            size="small"
                                            sx={{ minWidth: 80, color: "white", borderColor: "white", backgroundColor: "transparent", "&:hover": { borderColor: "white", backgroundColor: "rgba(255,255,255,0.1)" }, "&.Mui-disabled": { color: "white", borderColor: "white", backgroundColor: "transparent", opacity: 1 } }}
                                        >
                                            Next
                                        </Button>
                                        <Button
                                            onClick={() => setCurrentPage(totalPages)}
                                            disabled={currentPage === totalPages}
                                            variant="outlined"
                                            size="small"
                                            sx={{ minWidth: 80, color: "white", borderColor: "white", backgroundColor: "transparent", "&:hover": { borderColor: "white", backgroundColor: "rgba(255,255,255,0.1)" }, "&.Mui-disabled": { color: "white", borderColor: "white", backgroundColor: "transparent", opacity: 1 } }}
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

            {/* ADD / EDIT MODAL */}
            <Dialog
                open={openModal}
                onClose={() => setOpenModal(false)}
                fullWidth
                maxWidth="sm"
                PaperProps={{ sx: { borderRadius: 3, overflow: "hidden", boxShadow: 6 } }}
            >
                <DialogTitle
                    sx={{
                        background: headerColor,
                        color: "#fff",
                        fontWeight: 700,
                        fontSize: "1.1rem",
                        py: 2,
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                    }}
                >
                    {editMode ? "Edit Admission Contact" : "Add New Admission Contact"}

                    <IconButton onClick={() => setOpenModal(false)} sx={{ color: "white" }}>
                        <CloseIcon />
                    </IconButton>
                </DialogTitle>

                <DialogContent sx={{ p: 3 }}>
                    <Box display="flex" flexDirection="column" gap={2} mt={1}>
                        <Typography fontWeight="bold" mt={1}>Branch:</Typography>
                        <FormControl fullWidth>
                            <InputLabel>Branch</InputLabel>
                            <Select
                                label="Branch"
                                name="branchId"
                                value={contact.branchId}
                                onChange={handleChangesForEverything}
                            >
                                {branches.map((b) => (
                                    <MenuItem key={b.id} value={b.id}>{b.branch}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        <Typography fontWeight="bold" mt={1}>Email Address:</Typography>
                        <TextField
                            label="Email Address"
                            name="email"
                            type="email"
                            value={contact.email}
                            onChange={handleChangesForEverything}
                            fullWidth
                        />

                        <Typography fontWeight="bold" mt={1}>Contact Number:</Typography>
                        <TextField
                            label="Contact Number"
                            name="contactNumber"
                            value={contact.contactNumber}
                            onChange={handleChangesForEverything}
                            placeholder="(032) 123-4567 loc. 100"
                            fullWidth
                        />

                        <Typography fontWeight="bold" mt={1}>Office Days:</Typography>
                        <Box sx={{ display: "flex", gap: 2 }}>
                            <FormControl fullWidth>
                                <InputLabel>From</InputLabel>
                                <Select
                                    label="From"
                                    name="officeDaysStart"
                                    value={contact.officeDaysStart}
                                    onChange={handleChangesForEverything}
                                >
                                    {DAY_OPTIONS.map((day) => (
                                        <MenuItem key={day} value={day}>{day}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>

                            <FormControl fullWidth>
                                <InputLabel>To</InputLabel>
                                <Select
                                    label="To"
                                    name="officeDaysEnd"
                                    value={contact.officeDaysEnd}
                                    onChange={handleChangesForEverything}
                                >
                                    {DAY_OPTIONS.map((day) => (
                                        <MenuItem key={day} value={day}>{day}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Box>

                        <Typography fontWeight="bold" mt={1}>Office Hours:</Typography>
                        <Box sx={{ display: "flex", gap: 2 }}>
                            <TextField
                                label="Start Time"
                                name="officeTimeStart"
                                type="time"
                                value={contact.officeTimeStart}
                                onChange={handleChangesForEverything}
                                InputLabelProps={{ shrink: true }}
                                fullWidth
                            />
                            <TextField
                                label="End Time"
                                name="officeTimeEnd"
                                type="time"
                                value={contact.officeTimeEnd}
                                onChange={handleChangesForEverything}
                                InputLabelProps={{ shrink: true }}
                                fullWidth
                            />
                        </Box>

                        <Typography fontWeight="bold" mt={1}>Facebook Account (optional):</Typography>
                        <TextField
                            label="Facebook URL"
                            name="facebookUrl"
                            value={contact.facebookUrl}
                            onChange={handleChangesForEverything}
                            placeholder="https://www.facebook.com/EARIST"
                            fullWidth
                        />
                    </Box>
                </DialogContent>

                <DialogActions sx={{ px: 3, py: 2, borderTop: "1px solid #e0e0e0" }}>
                    <Button color="error" variant="outlined" sx={{ textTransform: "none", fontWeight: 600 }} onClick={() => setOpenModal(false)}>
                        Cancel
                    </Button>

                    <Button variant="contained" sx={{ px: 4, fontWeight: 600, textTransform: "none" }} onClick={handleSavingContact}>
                        <SaveIcon fontSize="small" style={{ marginRight: 6 }} />
                        Save
                    </Button>
                </DialogActions>
            </Dialog>

            <Snackbar
                open={snack.open}
                autoHideDuration={3000}
                onClose={() => setSnack({ ...snack, open: false })}
                anchorOrigin={{ vertical: "top", horizontal: "center" }}
            >
                <Alert severity={snack.severity} onClose={() => setSnack({ ...snack, open: false })} sx={{ width: "100%" }}>
                    {snack.message}
                </Alert>
            </Snackbar>

            {/* DELETE CONFIRMATION */}
            <Dialog
                open={openDeleteDialog}
                onClose={() => {
                    setOpenDeleteDialog(false);
                    setContactToDelete(null);
                }}
                maxWidth="sm"
                fullWidth
                PaperProps={{ sx: { borderRadius: 3, overflow: "hidden", boxShadow: 6 } }}
            >
                <DialogTitle sx={{ background: headerColor, color: "#fff", fontWeight: 700, fontSize: "1.2rem", py: 2 }}>
                    Delete Admission Contact
                </DialogTitle>

                <DialogContent sx={{ p: 3, mt: 2 }}>
                    <Typography sx={{ mb: 2 }}>
                        Are you sure you want to delete the admission contact <b>{contactToDelete?.email}</b>?
                    </Typography>

                    <Typography sx={{ color: "#d32f2f", fontSize: "0.95rem" }}>
                        Deleting this record will permanently remove it, and it may stop showing on the applicant dashboard's "Need Help?" card.
                    </Typography>
                </DialogContent>

                <DialogActions sx={{ px: 3, py: 2, borderTop: "1px solid #e0e0e0" }}>
                    <Button
                        color="error"
                        variant="outlined"
                        onClick={() => {
                            setOpenDeleteDialog(false);
                            setContactToDelete(null);
                        }}
                    >
                        Cancel
                    </Button>

                    <Button
                        color="error"
                        variant="contained"
                        onClick={() => {
                            handleDelete(contactToDelete.id);
                            setOpenDeleteDialog(false);
                            setContactToDelete(null);
                        }}
                    >
                        Yes, Delete
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default AdmissionContactManagement;
