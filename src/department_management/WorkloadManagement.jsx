import React, { useState, useEffect, useContext, useRef } from "react";
import axios from "axios";
import {
    Box,
    Dialog,
    DialogTitle,
    DialogActions,
    DialogContent,
    DialogContentText,
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

const DEFAULT_WORKLOAD_COLOR = "#fde047";

const clampChannel = (value) => Math.max(0, Math.min(255, Number(value)));

const rgbToHex = (r, g, b) => {
    const toHex = (n) => clampChannel(n).toString(16).padStart(2, "0");
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};

const parseColorToHex = (input) => {
    if (!input || typeof input !== "string") return null;

    const trimmed = input.trim();
    const hexMatch = trimmed.match(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/);
    if (hexMatch) {
        let hex = hexMatch[1];
        if (hex.length === 3) {
            hex = hex.split("").map((char) => char + char).join("");
        }
        return `#${hex.toLowerCase()}`;
    }

    const rgbMatch = trimmed.match(
        /^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})(?:\s*,\s*(0|1|0?\.\d+))?\s*\)$/i
    );
    if (rgbMatch) {
        return rgbToHex(rgbMatch[1], rgbMatch[2], rgbMatch[3]);
    }

    return null;
};

const isValidCssColor = (input) => {
    if (!input?.trim()) return false;
    if (parseColorToHex(input)) return true;

    const el = document.createElement("div");
    el.style.color = input.trim();
    return el.style.color !== "";
};

const normalizeColorForSave = (input) => {
    const trimmed = input.trim();
    return parseColorToHex(trimmed) || trimmed;
};

const WorkloadManagement = () => {
    useAuditMac();
    const settings = useContext(SettingsContext);
  const colors = settings?.colors || {};
  const headerColor = colors.header || "#1976d2";

    // 🎨 Theme colors (from company_settings, same as Department Registration)
    const [titleColor, setTitleColor] = useState("#000000");
    const [borderColor, setBorderColor] = useState("#000000");

    useEffect(() => {
        if (!settings) return;
        if (colors.title) setTitleColor(colors.title);
        if (colors.border) setBorderColor(colors.border);
    }, [settings]);

    // 🔐 Page access control (same pattern as Department Registration)
    // NOTE: replace this with the actual page_id assigned to Workload Management
    // in your page_access table (Department Registration uses 21).
    const pageId = 171;

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
            if (error.response && error.response.data.message) {
                console.log(error.response.data.message);
            } else {
                console.log("An unexpected error occurred.");
            }
            setLoading(false);
        }
    };

    // 📋 Workload data
    const [workloadList, setWorkloadList] = useState([]);
    const [workloadLoading, setWorkloadLoading] = useState(false);

    const [workload, setWorkload] = useState({
        workloadDescription: "",
        workloadCode: "",
        workloadColor: DEFAULT_WORKLOAD_COLOR,
    });
    const colorPickerRef = useRef(null);

    const [openModal, setOpenModal] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [selectedId, setSelectedId] = useState(null);

    const [snack, setSnack] = useState({
        open: false,
        message: "",
        severity: "success",
    });

    const showSnack = (message, severity = "success") => {
        setSnack({ open: true, message, severity });
    };

    useEffect(() => {
        fetchWorkloads();
    }, []);

    const fetchWorkloads = async () => {
        setWorkloadLoading(true);
        try {
            const res = await axios.get(`${API_BASE_URL}/api/workload`);
            setWorkloadList(res.data || []);
        } catch (err) {
            console.error(err);
            setWorkloadList([]);
        } finally {
            setWorkloadLoading(false);
        }
    };

    const handleChangesForEverything = (e) => {
        const { name, value } = e.target;
        setWorkload((prev) => ({ ...prev, [name]: value }));
    };

    const handleSavingWorkload = async () => {
        if (!workload.workloadDescription.trim()) {
            showSnack("Workload description is required", "warning");
            return;
        }

        if (workload.workloadColor.trim() && !isValidCssColor(workload.workloadColor)) {
            showSnack(
                "Enter a valid HEX (#99ccff) or RGB (rgb(153, 204, 255)) color",
                "warning"
            );
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

        const normalizedColor = normalizeColorForSave(workload.workloadColor);

        try {
            if (editMode) {
                await axios.put(
                    `${API_BASE_URL}/api/workload/${selectedId}`,
                    {
                        workloadDescription: workload.workloadDescription,
                        workloadCode: workload.workloadCode,
                        workloadColor: normalizedColor,
                    },
                    permissionHeaders
                );

                showSnack("Workload updated successfully!", "success");
            } else {
                await axios.post(
                    `${API_BASE_URL}/api/workload`,
                    {
                        workloadDescription: workload.workloadDescription,
                        workloadCode: workload.workloadCode,
                        workloadColor: normalizedColor,
                    },
                    permissionHeaders
                );

                showSnack("Workload added successfully!", "success");
            }

            fetchWorkloads();
            setWorkload({
                workloadDescription: "",
                workloadCode: "",
                workloadColor: DEFAULT_WORKLOAD_COLOR,
            });
            setEditMode(false);
            setSelectedId(null);
            setOpenModal(false);
        } catch (err) {
            showSnack(err.response?.data?.message || "Operation failed", "error");
        }
    };

    const handleEdit = (row) => {
        if (!canEdit) {
            showSnack("You do not have permission to edit this item", "error");
            return;
        }

        setWorkload({
            workloadDescription: row.workload_description,
            workloadCode: row.workload_code || "",
            workloadColor: row.workload_color || DEFAULT_WORKLOAD_COLOR,
        });
        setSelectedId(row.id);
        setEditMode(true);
        setOpenModal(true);
    };

    const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
    const [workloadToDelete, setWorkloadToDelete] = useState(null);

    const handleDelete = async (id) => {
        if (!canDelete) {
            showSnack("You do not have permission to delete this item", "error");
            return;
        }

        try {
            await axios.delete(`${API_BASE_URL}/api/workload/${id}`, permissionHeaders);
            showSnack("Workload deleted successfully!", "success");
            fetchWorkloads();
        } catch (err) {
            showSnack("Failed to delete workload", "error");
        }
    };

    // 🔎 Search
    const [searchQuery, setSearchQuery] = useState("");

    const filteredWorkloads = workloadList.filter((row) => {
        const q = searchQuery.toLowerCase();
        return (
            row.workload_description?.toLowerCase().includes(q) ||
            row.workload_code?.toLowerCase().includes(q)
        );
    });

    // 📄 Pagination (same behavior as Department Registration)
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 20;

    const totalPages = Math.ceil(filteredWorkloads.length / itemsPerPage) || 1;

    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentWorkloads = filteredWorkloads.slice(indexOfFirstItem, indexOfLastItem);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery]);

    // Put this at the very bottom before the return
    if (loading || hasAccess === null) {
        return <LoadingOverlay open={loading} message="Loading..." />;
    }

    if (!hasAccess) {
        return <Unauthorized />;
    }

    // 🔒 Disable right-click
    // document.addEventListener("contextmenu", (e) => e.preventDefault());

    // // 🔒 Block DevTools shortcuts + Ctrl+P silently
    // document.addEventListener("keydown", (e) => {
    //     const isBlockedKey =
    //         e.key === "F12" ||
    //         e.key === "F11" ||
    //         (e.ctrlKey &&
    //             e.shiftKey &&
    //             (e.key.toLowerCase() === "i" || e.key.toLowerCase() === "j")) ||
    //         (e.ctrlKey && e.key.toLowerCase() === "u") ||
    //         (e.ctrlKey && e.key.toLowerCase() === "p");

    //     if (isBlockedKey) {
    //         e.preventDefault();
    //         e.stopPropagation();
    //     }
    // });

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
                <Typography
                    variant="h4"
                    sx={{
                        fontWeight: "bold",
                        color: titleColor,
                        fontSize: "36px",
                    }}
                >
                    WORKLOAD MANAGEMENT
                </Typography>

                <Box
                    sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                        flexWrap: "wrap",
                        justifyContent: "flex-end",
                    }}
                >
                    <TextField
                        variant="outlined"
                        placeholder="Search Workload Description / Code"
                        size="small"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
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
            </Box>
            <hr style={{ border: "1px solid #ccc", width: "100%" }} />

            <br />
            <br />

            <TableContainer component={Paper} sx={{ width: "100%" }}>
                <Table size="small">
                    <TableHead sx={{ backgroundColor: headerColor, color: "white" }}>
                        <TableRow>
                            <TableCell
                                sx={{
                                    border: `1px solid ${borderColor}`,
                                    py: 0.5,
                                    backgroundColor: headerColor,
                                    color: "white",
                                }}
                            >
                                <Box
                                    display="flex"
                                    justifyContent="space-between"
                                    alignItems="center"
                                    flexWrap="wrap"
                                    sx={{ padding: "6px" }}
                                >
                                    <Typography fontSize="14px" fontWeight="bold" color="white">
                                        Total Workload Records: {filteredWorkloads.length}
                                    </Typography>

                                    <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
                                        <Button
                                            onClick={() => setCurrentPage(1)}
                                            disabled={currentPage === 1}
                                            variant="outlined"
                                            size="small"
                                            sx={{
                                                minWidth: 80,
                                                color: "white",
                                                borderColor: "white",
                                                backgroundColor: "transparent",
                                                "&:hover": {
                                                    borderColor: "white",
                                                    backgroundColor: "rgba(255,255,255,0.1)",
                                                },
                                                "&.Mui-disabled": {
                                                    color: "white",
                                                    borderColor: "white",
                                                    backgroundColor: "transparent",
                                                    opacity: 1,
                                                },
                                            }}
                                        >
                                            First
                                        </Button>
                                        <Button
                                            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                                            disabled={currentPage === 1}
                                            variant="outlined"
                                            size="small"
                                            sx={{
                                                minWidth: 80,
                                                color: "white",
                                                borderColor: "white",
                                                backgroundColor: "transparent",
                                                "&:hover": {
                                                    borderColor: "white",
                                                    backgroundColor: "rgba(255,255,255,0.1)",
                                                },
                                                "&.Mui-disabled": {
                                                    color: "white",
                                                    borderColor: "white",
                                                    backgroundColor: "transparent",
                                                    opacity: 1,
                                                },
                                            }}
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
                                                    ".MuiOutlinedInput-notchedOutline": {
                                                        borderColor: "white",
                                                    },
                                                    "&:hover .MuiOutlinedInput-notchedOutline": {
                                                        borderColor: "white",
                                                    },
                                                    "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                                                        borderColor: "white",
                                                    },
                                                    "& svg": {
                                                        color: "white",
                                                    },
                                                }}
                                                MenuProps={{
                                                    PaperProps: {
                                                        sx: {
                                                            maxHeight: 200,
                                                            backgroundColor: "#fff",
                                                        },
                                                    },
                                                }}
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
                                            sx={{
                                                minWidth: 80,
                                                color: "white",
                                                borderColor: "white",
                                                backgroundColor: "transparent",
                                                "&:hover": {
                                                    borderColor: "white",
                                                    backgroundColor: "rgba(255,255,255,0.1)",
                                                },
                                                "&.Mui-disabled": {
                                                    color: "white",
                                                    borderColor: "white",
                                                    backgroundColor: "transparent",
                                                    opacity: 1,
                                                },
                                            }}
                                        >
                                            Next
                                        </Button>
                                        <Button
                                            onClick={() => setCurrentPage(totalPages)}
                                            disabled={currentPage === totalPages}
                                            variant="outlined"
                                            size="small"
                                            sx={{
                                                minWidth: 80,
                                                color: "white",
                                                borderColor: "white",
                                                backgroundColor: "transparent",
                                                "&:hover": {
                                                    borderColor: "white",
                                                    backgroundColor: "rgba(255,255,255,0.1)",
                                                },
                                                "&.Mui-disabled": {
                                                    color: "white",
                                                    borderColor: "white",
                                                    backgroundColor: "transparent",
                                                    opacity: 1,
                                                },
                                            }}
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
                                                    "&:hover": {
                                                        backgroundColor: "#1565c0",
                                                    },
                                                }}
                                                onClick={() => {
                                                    setEditMode(false);
                                                    setWorkload({
                                                        workloadDescription: "",
                                                        workloadCode: "",
                                                        workloadColor: DEFAULT_WORKLOAD_COLOR,
                                                    });
                                                    setOpenModal(true);
                                                }}
                                            >
                                                + Add Workload
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
                {workloadLoading ? (
                    <CircularProgress />
                ) : (
                    <Table size="small">
                        <TableHead>
                            <TableRow
                                style={{
                                    border: `1px solid ${borderColor}`,
                                    backgroundColor: "#F5F5F5",
                                    color: "#000",
                                    width: "10%",
                                    textAlign: "center",
                                }}
                            >
                                <TableCell sx={{ color: "#000", border: `1px solid ${borderColor}`, textAlign: "center" }}>#</TableCell>
                                <TableCell sx={{ color: "#000", border: `1px solid ${borderColor}`, textAlign: "center" }}>Workload Description</TableCell>
                                <TableCell sx={{ color: "#000", border: `1px solid ${borderColor}`, textAlign: "center" }}>Code</TableCell>
                                <TableCell sx={{ color: "#000", border: `1px solid ${borderColor}`, textAlign: "center" }}>Color</TableCell>

                                {showActionColumn && (
                                    <TableCell sx={{ color: "#000", border: `1px solid ${borderColor}`, textAlign: "center" }}>Action</TableCell>
                                )}
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
                            {currentWorkloads.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5}><em>No Workload</em></TableCell>
                                </TableRow>
                            ) : (
                                currentWorkloads.map((row, index) => (
                                    <TableRow key={row.id}>
                                        <TableCell sx={{ border: `1px solid ${borderColor}`, textAlign: "center" }}>
                                            {indexOfFirstItem + index + 1}
                                        </TableCell>

                                        <TableCell sx={{ border: `1px solid ${borderColor}`, textAlign: "center" }}>
                                            {row.workload_description}
                                        </TableCell>

                                        <TableCell sx={{ border: `1px solid ${borderColor}`, textAlign: "center" }}>
                                            {row.workload_code}
                                        </TableCell>

                                        <TableCell sx={{ border: `1px solid ${borderColor}`, textAlign: "center" }}>
                                            <Box
                                                sx={{
                                                    width: 28,
                                                    height: 28,
                                                    borderRadius: 1,
                                                    border: "1px solid #ccc",
                                                    backgroundColor: row.workload_color || DEFAULT_WORKLOAD_COLOR,
                                                    mx: "auto",
                                                }}
                                            />
                                        </TableCell>

                                        {showActionColumn && (
                                            <TableCell
                                                sx={{
                                                    border: `1px solid ${borderColor}`,
                                                    textAlign: "center",
                                                    width: "250px",
                                                }}
                                            >
                                                <Box
                                                    sx={{
                                                        display: "flex",
                                                        flexDirection: "row",
                                                        justifyContent: "center",
                                                        alignItems: "center",
                                                        gap: 1,
                                                    }}
                                                >
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
                                                                "&:hover": {
                                                                    backgroundColor: "#0b7a0b",
                                                                },
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
                                                                "&:hover": {
                                                                    backgroundColor: "#7a0000",
                                                                },
                                                            }}
                                                            onClick={() => {
                                                                setWorkloadToDelete(row);
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
                {workloadList.length === 0 && !workloadLoading && <p>No workload records available.</p>}
            </Box>
            <TableContainer component={Paper} sx={{ width: "100%" }}>
                <Table size="small">
                    <TableHead sx={{ backgroundColor: headerColor, color: "white" }}>
                        <TableRow>
                            <TableCell
                                sx={{
                                    border: `1px solid ${borderColor}`,
                                    py: 0.5,
                                    backgroundColor: headerColor,
                                    color: "white",
                                }}
                            >
                                <Box
                                    display="flex"
                                    justifyContent="space-between"
                                    alignItems="center"
                                    flexWrap="wrap"
                                    sx={{ padding: "6px" }}
                                >
                                    <Typography fontSize="14px" fontWeight="bold" color="white">
                                        Total Workload Records: {filteredWorkloads.length}
                                    </Typography>

                                    <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
                                        <Button
                                            onClick={() => setCurrentPage(1)}
                                            disabled={currentPage === 1}
                                            variant="outlined"
                                            size="small"
                                            sx={{
                                                minWidth: 80,
                                                color: "white",
                                                borderColor: "white",
                                                backgroundColor: "transparent",
                                                "&:hover": {
                                                    borderColor: "white",
                                                    backgroundColor: "rgba(255,255,255,0.1)",
                                                },
                                                "&.Mui-disabled": {
                                                    color: "white",
                                                    borderColor: "white",
                                                    backgroundColor: "transparent",
                                                    opacity: 1,
                                                },
                                            }}
                                        >
                                            First
                                        </Button>
                                        <Button
                                            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                                            disabled={currentPage === 1}
                                            variant="outlined"
                                            size="small"
                                            sx={{
                                                minWidth: 80,
                                                color: "white",
                                                borderColor: "white",
                                                backgroundColor: "transparent",
                                                "&:hover": {
                                                    borderColor: "white",
                                                    backgroundColor: "rgba(255,255,255,0.1)",
                                                },
                                                "&.Mui-disabled": {
                                                    color: "white",
                                                    borderColor: "white",
                                                    backgroundColor: "transparent",
                                                    opacity: 1,
                                                },
                                            }}
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
                                                    ".MuiOutlinedInput-notchedOutline": {
                                                        borderColor: "white",
                                                    },
                                                    "&:hover .MuiOutlinedInput-notchedOutline": {
                                                        borderColor: "white",
                                                    },
                                                    "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                                                        borderColor: "white",
                                                    },
                                                    "& svg": {
                                                        color: "white",
                                                    },
                                                }}
                                                MenuProps={{
                                                    PaperProps: {
                                                        sx: {
                                                            maxHeight: 200,
                                                            backgroundColor: "#fff",
                                                        },
                                                    },
                                                }}
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
                                            sx={{
                                                minWidth: 80,
                                                color: "white",
                                                borderColor: "white",
                                                backgroundColor: "transparent",
                                                "&:hover": {
                                                    borderColor: "white",
                                                    backgroundColor: "rgba(255,255,255,0.1)",
                                                },
                                                "&.Mui-disabled": {
                                                    color: "white",
                                                    borderColor: "white",
                                                    backgroundColor: "transparent",
                                                    opacity: 1,
                                                },
                                            }}
                                        >
                                            Next
                                        </Button>
                                        <Button
                                            onClick={() => setCurrentPage(totalPages)}
                                            disabled={currentPage === totalPages}
                                            variant="outlined"
                                            size="small"
                                            sx={{
                                                minWidth: 80,
                                                color: "white",
                                                borderColor: "white",
                                                backgroundColor: "transparent",
                                                "&:hover": {
                                                    borderColor: "white",
                                                    backgroundColor: "rgba(255,255,255,0.1)",
                                                },
                                                "&.Mui-disabled": {
                                                    color: "white",
                                                    borderColor: "white",
                                                    backgroundColor: "transparent",
                                                    opacity: 1,
                                                },
                                            }}
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
                    {editMode ? "Edit Workload" : "Add New Workload"}

                    <IconButton onClick={() => setOpenModal(false)} sx={{ color: "white" }}>
                        <CloseIcon />
                    </IconButton>
                </DialogTitle>

                <DialogContent sx={{ p: 3 }}>
                    <Box display="flex" flexDirection="column" gap={2} mt={1}>
                        <Typography fontWeight="bold" mt={2}>
                            Workload Description:
                        </Typography>

                        <TextField
                            label="Workload Description"
                            name="workloadDescription"
                            value={workload.workloadDescription}
                            onChange={handleChangesForEverything}
                            fullWidth
                        />

                        <Typography fontWeight="bold" mt={1}>
                            Workload Code:
                        </Typography>

                        <TextField
                            label="Workload Code"
                            name="workloadCode"
                            value={workload.workloadCode}
                            onChange={handleChangesForEverything}
                            fullWidth
                        />

                        <Typography fontWeight="bold" mt={1}>
                            Color:
                        </Typography>

                        <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.5 }}>
                            <Box
                                onClick={() => colorPickerRef.current?.click()}
                                sx={{
                                    position: "relative",
                                    width: 44,
                                    height: 44,
                                    mt: 1,
                                    borderRadius: 1,
                                    border: `1px solid ${borderColor}`,
                                    backgroundColor: isValidCssColor(workload.workloadColor)
                                        ? workload.workloadColor
                                        : "#ffffff",
                                    cursor: "pointer",
                                    flexShrink: 0,
                                    overflow: "hidden",
                                    "&:hover": {
                                        boxShadow: "0 0 0 2px rgba(25, 118, 210, 0.35)",
                                    },
                                }}
                            >
                                <input
                                    ref={colorPickerRef}
                                    type="color"
                                    value={parseColorToHex(workload.workloadColor) || DEFAULT_WORKLOAD_COLOR}
                                    onChange={(e) =>
                                        setWorkload((prev) => ({ ...prev, workloadColor: e.target.value }))
                                    }
                                    style={{
                                        opacity: 0,
                                        width: 0,
                                        height: 0,
                                        position: "absolute",
                                    }}
                                />
                            </Box>

                            <TextField
                                label="Color"
                                placeholder="#99ccff or rgb(153, 204, 255)"
                                name="workloadColor"
                                value={workload.workloadColor}
                                onChange={handleChangesForEverything}
                                error={
                                    Boolean(workload.workloadColor.trim()) &&
                                    !isValidCssColor(workload.workloadColor)
                                }
                                helperText={
                                    workload.workloadColor.trim() && !isValidCssColor(workload.workloadColor)
                                        ? "Use HEX or RGB"
                                        : "HEX, RGB, or pick a color"
                                }
                                fullWidth
                            />
                        </Box>
                    </Box>
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
                        sx={{ textTransform: "none", fontWeight: 600 }}
                        onClick={() => setOpenModal(false)}
                    >
                        Cancel
                    </Button>

                    <Button
                        variant="contained"
                        sx={{ px: 4, fontWeight: 600, textTransform: "none" }}
                        onClick={handleSavingWorkload}
                    >
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
                <Alert
                    severity={snack.severity}
                    onClose={() => setSnack({ ...snack, open: false })}
                    sx={{ width: "100%" }}
                >
                    {snack.message}
                </Alert>
            </Snackbar>

            {/* DELETE CONFIRMATION */}
            <Dialog
                open={openDeleteDialog}
                onClose={() => {
                    setOpenDeleteDialog(false);
                    setWorkloadToDelete(null);
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
                        background: headerColor,
                        color: "#fff",
                        fontWeight: 700,
                        fontSize: "1.2rem",
                        py: 2,
                    }}
                >
                    Delete Workload
                </DialogTitle>

                <DialogContent sx={{ p: 3, mt: 2 }}>
                    <Typography sx={{ mb: 2 }}>
                        Are you sure you want to delete the workload{" "}
                        <b>{workloadToDelete?.workload_description}</b> (
                        <b>{workloadToDelete?.workload_code}</b>)?
                    </Typography>

                    <Typography sx={{ color: "#d32f2f", fontSize: "0.95rem" }}>
                        Deleting this workload will permanently remove it from the workload list.
                        <br />
                        Any schedules or records associated with this workload may be affected.
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
                            setOpenDeleteDialog(false);
                            setWorkloadToDelete(null);
                        }}
                    >
                        Cancel
                    </Button>

                    <Button
                        color="error"
                        variant="contained"
                        onClick={() => {
                            handleDelete(workloadToDelete.id);
                            setOpenDeleteDialog(false);
                            setWorkloadToDelete(null);
                        }}
                    >
                        Yes, Delete
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default WorkloadManagement;
