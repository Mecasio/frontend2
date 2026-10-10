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
    Popover,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import SearchIcon from "@mui/icons-material/Search";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import { SettingsContext } from "../App";
import Unauthorized from "../components/Unauthorized";
import LoadingOverlay from "../components/LoadingOverlay";
import API_BASE_URL from "../apiConfig";
import { getFlatAuditHeaders } from "../utils/auditEvents";
import useAuditMac from "../utils/useAuditMac";

const DEFAULT_WORKLOAD_COLOR = "#fde047";
export const WORKLOAD_MANAGEMENT_PAGE_ID = 171;

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

const WorkloadManagement = ({ embedded = false, onWorkloadChange }) => {
    useAuditMac();
    const settings = useContext(SettingsContext);
  const colors = settings?.colors || {};
  const headerColor = colors.header || "#1976d2";
  const mainButtonColor = colors.mainButton || "#1976d2";

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
    const pageId = WORKLOAD_MANAGEMENT_PAGE_ID;

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
            "x-audit-actor-role": userRole || localStorage.getItem("role") || "administrator",
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
    const [addAnchorEl, setAddAnchorEl] = useState(null);
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
            const res = await axios.get(`${API_BASE_URL}/api/workload`, { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` } });
            const rows = Array.isArray(res.data) ? res.data : [];
            setWorkloadList(
                [...rows].sort((first, second) => Number(second.id) - Number(first.id))
            );
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
                setCurrentPage(1);
            }

            fetchWorkloads();
            onWorkloadChange?.();
            setWorkload({
                workloadDescription: "",
                workloadCode: "",
                workloadColor: DEFAULT_WORKLOAD_COLOR,
            });
            setEditMode(false);
            setSelectedId(null);
            setOpenModal(false);
            setAddAnchorEl(null);
        } catch (err) {
            showSnack(err.response?.data?.message || "Operation failed", "error");
        }
    };

    const handleEdit = (row) => {
        if (!canEdit) {
            showSnack("You do not have permission to edit this item", "error");
            return;
        }

        setAddAnchorEl(null);
        setWorkload({
            workloadDescription: row.workload_description,
            workloadCode: row.workload_code || "",
            workloadColor: row.workload_color || DEFAULT_WORKLOAD_COLOR,
        });
        setSelectedId(row.id);
        setEditMode(true);
        setOpenModal(!embedded);
    };

    const handleCancelEdit = () => {
        setEditMode(false);
        setSelectedId(null);
        setOpenModal(false);
        setWorkload({
            workloadDescription: "",
            workloadCode: "",
            workloadColor: DEFAULT_WORKLOAD_COLOR,
        });
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
            onWorkloadChange?.();
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
    const [itemsPerPage, setItemsPerPage] = useState(embedded ? 10 : 20);

    const totalPages = Math.ceil(filteredWorkloads.length / itemsPerPage) || 1;

    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentWorkloads = filteredWorkloads.slice(indexOfFirstItem, indexOfLastItem);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, itemsPerPage]);

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
    const inlineEditFieldSx = {
        "& .MuiOutlinedInput-root": {
            height: 30,
            borderRadius: "5px",
            backgroundColor: "#fff",
            fontSize: "11px",
            "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                borderColor: headerColor,
            },
        },
        "& input": { px: 1, py: 0.5 },
    };



    return (
        <Box
            sx={{
                height: embedded ? "auto" : "calc(100vh - 150px)",
                overflowY: embedded ? "visible" : "auto",
                paddingRight: embedded ? 0 : 1,
                backgroundColor: "transparent",
                mt: embedded ? 0 : 1,
                p: 2,
            }}
        >
            {!embedded && (
            <>
            <Box
                sx={{
                    display: "flex",
                    justifyContent: embedded ? "flex-end" : "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: 2,
                    mb: 2,
                }}
            >
                {!embedded && (
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
                )}

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



            </>
            )}

            {embedded && (
                <Box sx={{ color: "#334155" }}>
                    <Box
                        sx={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            gap: 2,
                            flexWrap: "wrap",
                            mb: 1.5,
                        }}
                    >
                        <Typography sx={{ fontSize: "14px", fontWeight: 700 }}>
                            Total Workload Records: {filteredWorkloads.length}
                        </Typography>
                        <TextField
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search Workload Description / Code..."
                            size="small"
                            sx={{
                                width: { xs: "100%", sm: 320 },
                                backgroundColor: "#fff",
                                "& .MuiOutlinedInput-root": {
                                    height: 34,
                                    borderRadius: "5px",
                                    fontSize: "12px",
                                    "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                                        borderColor: headerColor,
                                    },
                                    "&.Mui-focused .MuiSvgIcon-root": {
                                        color: headerColor,
                                    },
                                },
                            }}
                            InputProps={{
                                startAdornment: <SearchIcon sx={{ mr: 1, color: "#94a3b8", fontSize: 18 }} />,
                            }}
                        />
                    </Box>

                    <Box sx={{ borderTop: "1px solid #e2e8f0", pt: 1.25, mb: 1.25 }}>
                        <Box
                            sx={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                gap: 1.5,
                                flexWrap: "wrap",
                            }}
                        >
                            <FormControl size="small" sx={{ minWidth: 88 }}>
                                <Select
                                    value={itemsPerPage}
                                    onChange={(e) => setItemsPerPage(Number(e.target.value))}
                                    sx={{ height: 32, fontSize: "12px", borderRadius: 1.5 }}
                                >
                                    {[10, 20, 50].map((size) => (
                                        <MenuItem key={size} value={size} sx={{ fontSize: "12px" }}>
                                            Show {size}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>

                            <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, flexWrap: "wrap" }}>
                                {[
                                    { label: "« First", action: () => setCurrentPage(1), disabled: currentPage === 1 },
                                    { label: "‹ Prev", action: () => setCurrentPage((page) => Math.max(page - 1, 1)), disabled: currentPage === 1 },
                                ].map((item) => (
                                    <Button
                                        key={item.label}
                                        variant="outlined"
                                        size="small"
                                        disabled={item.disabled}
                                        onClick={item.action}
                                        sx={{ minWidth: 64, height: 32, fontSize: "11px", color: "#475569", borderColor: "#cbd5e1" }}
                                    >
                                        {item.label}
                                    </Button>
                                ))}
                                <FormControl size="small" sx={{ minWidth: 72 }}>
                                    <Select
                                        value={currentPage}
                                        onChange={(e) => setCurrentPage(Number(e.target.value))}
                                        sx={{ height: 32, fontSize: "11px", borderRadius: 1.5 }}
                                    >
                                        {Array.from({ length: totalPages }, (_, index) => (
                                            <MenuItem key={index + 1} value={index + 1} sx={{ fontSize: "12px" }}>
                                                Page {index + 1}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                                <Typography sx={{ fontSize: "11px", color: "#475569", whiteSpace: "nowrap" }}>
                                    of {totalPages} page{totalPages > 1 ? "s" : ""}
                                </Typography>
                                {[
                                    { label: "Next ›", action: () => setCurrentPage((page) => Math.min(page + 1, totalPages)), disabled: currentPage === totalPages },
                                    { label: "Last »", action: () => setCurrentPage(totalPages), disabled: currentPage === totalPages },
                                ].map((item) => (
                                    <Button
                                        key={item.label}
                                        variant="outlined"
                                        size="small"
                                        disabled={item.disabled}
                                        onClick={item.action}
                                        sx={{ minWidth: 64, height: 32, fontSize: "11px", color: "#475569", borderColor: "#cbd5e1" }}
                                    >
                                        {item.label}
                                    </Button>
                                ))}
                                {showCreateActions && (
                                    <Button
                                        variant="contained"
                                        size="small"
                                        onClick={(event) => {
                                            setEditMode(false);
                                            setWorkload({
                                                workloadDescription: "",
                                                workloadCode: "",
                                                workloadColor: DEFAULT_WORKLOAD_COLOR,
                                            });
                                            setAddAnchorEl(event.currentTarget);
                                        }}
                                        sx={{
                                            height: 32,
                                            px: 2,
                                            borderRadius: 1.5,
                                            backgroundColor: mainButtonColor,
                                            fontSize: "11px",
                                            fontWeight: 700,
                                            textTransform: "none",
                                            boxShadow: "none",
                                            "&:hover": { backgroundColor: mainButtonColor, filter: "brightness(0.92)", boxShadow: "none" },
                                        }}
                                    >
                                        + Add Workload
                                    </Button>
                                )}
                            </Box>
                        </Box>
                    </Box>

                    <TableContainer
                        component={Paper}
                        elevation={0}
                        sx={{ border: "1px solid #e2e8f0", borderRadius: 1.5, overflow: "hidden" }}
                    >
                        <Table size="small">
                            <TableHead>
                                <TableRow sx={{ backgroundColor: headerColor }}>
                                    {[
                                        { label: "#", align: "center", width: 52 },
                                        { label: "Workload Description", align: "left" },
                                        { label: "Code", align: "center", width: 150 },
                                        { label: "Color", align: "center", width: 140 },
                                        ...(showActionColumn ? [{ label: "Action", align: "center", width: 190 }] : []),
                                    ].map((column) => (
                                        <TableCell
                                            key={column.label}
                                            align={column.align}
                                            sx={{
                                                width: column.width,
                                                color: "#fff",
                                                fontSize: "11px",
                                                fontWeight: 700,
                                                py: 1,
                                                borderBottom: 0,
                                            }}
                                        >
                                            {column.label}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {workloadLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={showActionColumn ? 5 : 4} align="center" sx={{ py: 5 }}>
                                            <CircularProgress size={26} />
                                        </TableCell>
                                    </TableRow>
                                ) : currentWorkloads.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={showActionColumn ? 5 : 4} align="center" sx={{ py: 4, fontSize: "12px" }}>
                                            No workload records found.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    currentWorkloads.map((row, index) => (
                                        <TableRow
                                            key={row.id}
                                            sx={{
                                                backgroundColor: index % 2 === 0 ? "#ffffff" : "#f6f8fb",
                                                "&:hover": { backgroundColor: "#eef3f8" },
                                            }}
                                        >
                                            <TableCell align="center" sx={{ fontSize: "11px", color: "#475569", borderColor: "#e8edf3" }}>
                                                {indexOfFirstItem + index + 1}
                                            </TableCell>
                                            <TableCell sx={{ fontSize: "11px", color: "#475569", borderColor: "#e8edf3" }}>
                                                {editMode && selectedId === row.id ? (
                                                    <TextField
                                                        name="workloadDescription"
                                                        value={workload.workloadDescription}
                                                        onChange={handleChangesForEverything}
                                                        placeholder="Description"
                                                        size="small"
                                                        fullWidth
                                                        sx={inlineEditFieldSx}
                                                    />
                                                ) : (
                                                    <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
                                                        <Box
                                                            sx={{
                                                                width: 8,
                                                                height: 8,
                                                                borderRadius: "50%",
                                                                flexShrink: 0,
                                                                backgroundColor: row.workload_color || DEFAULT_WORKLOAD_COLOR,
                                                            }}
                                                        />
                                                        {row.workload_description}
                                                    </Box>
                                                )}
                                            </TableCell>
                                            <TableCell align="center" sx={{ fontSize: "11px", color: "#475569", borderColor: "#e8edf3" }}>
                                                {editMode && selectedId === row.id ? (
                                                    <TextField
                                                        name="workloadCode"
                                                        value={workload.workloadCode}
                                                        onChange={handleChangesForEverything}
                                                        placeholder="Code"
                                                        size="small"
                                                        fullWidth
                                                        sx={inlineEditFieldSx}
                                                    />
                                                ) : (
                                                    row.workload_code
                                                )}
                                            </TableCell>
                                            <TableCell align="center" sx={{ borderColor: "#e8edf3" }}>
                                                {editMode && selectedId === row.id ? (
                                                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                                                        <Box
                                                            component="input"
                                                            type="color"
                                                            value={parseColorToHex(workload.workloadColor) || DEFAULT_WORKLOAD_COLOR}
                                                            onChange={(event) =>
                                                                setWorkload((previous) => ({
                                                                    ...previous,
                                                                    workloadColor: event.target.value,
                                                                }))
                                                            }
                                                            aria-label="Select workload color"
                                                            sx={{
                                                                width: 30,
                                                                height: 30,
                                                                p: 0,
                                                                flexShrink: 0,
                                                                border: `1px solid ${headerColor}`,
                                                                borderRadius: "5px",
                                                                backgroundColor: "transparent",
                                                                cursor: "pointer",
                                                            }}
                                                        />
                                                        <TextField
                                                            name="workloadColor"
                                                            value={workload.workloadColor}
                                                            onChange={handleChangesForEverything}
                                                            placeholder="Color"
                                                            size="small"
                                                            fullWidth
                                                            sx={inlineEditFieldSx}
                                                        />
                                                    </Box>
                                                ) : (
                                                    <Box
                                                        sx={{
                                                            width: 18,
                                                            height: 18,
                                                            borderRadius: 1,
                                                            border: "1px solid rgba(15,23,42,0.12)",
                                                            backgroundColor: row.workload_color || DEFAULT_WORKLOAD_COLOR,
                                                            mx: "auto",
                                                        }}
                                                    />
                                                )}
                                            </TableCell>
                                            {showActionColumn && (
                                                <TableCell align="center" sx={{ borderColor: "#e8edf3" }}>
                                                    <Box sx={{ display: "flex", justifyContent: "center", gap: 0.75 }}>
                                                        {editMode && selectedId === row.id ? (
                                                            <>
                                                                <Button
                                                                    variant="contained"
                                                                    size="small"
                                                                    onClick={handleSavingWorkload}
                                                                    sx={{
                                                                        minWidth: 70,
                                                                        height: 28,
                                                                        borderRadius: "5px",
                                                                        backgroundColor: mainButtonColor,
                                                                        fontSize: "10px",
                                                                        textTransform: "none",
                                                                        boxShadow: "none",
                                                                        "&:hover": {
                                                                            backgroundColor: mainButtonColor,
                                                                            filter: "brightness(0.92)",
                                                                            boxShadow: "none",
                                                                        },
                                                                    }}
                                                                >
                                                                    Save
                                                                </Button>
                                                                <Button
                                                                    variant="outlined"
                                                                    size="small"
                                                                    onClick={handleCancelEdit}
                                                                    sx={{
                                                                        minWidth: 70,
                                                                        height: 28,
                                                                        borderRadius: "5px",
                                                                        borderColor: headerColor,
                                                                        color: headerColor,
                                                                        fontSize: "10px",
                                                                        textTransform: "none",
                                                                        "&:hover": {
                                                                            borderColor: headerColor,
                                                                            backgroundColor: "#f8fafc",
                                                                        },
                                                                    }}
                                                                >
                                                                    Cancel
                                                                </Button>
                                                            </>
                                                        ) : (
                                                            <>
                                                                {canEdit && (
                                                                    <Button
                                                                        variant="contained"
                                                                        size="small"
                                                                        onClick={() => handleEdit(row)}
                                                                        startIcon={<EditIcon sx={{ fontSize: "13px !important" }} />}
                                                                        sx={{
                                                                            minWidth: 70,
                                                                            height: 28,
                                                                            borderRadius: 1,
                                                                            backgroundColor: "#16a34a",
                                                                            fontSize: "10px",
                                                                            textTransform: "none",
                                                                            boxShadow: "none",
                                                                            "&:hover": { backgroundColor: "#15803d", boxShadow: "none" },
                                                                        }}
                                                                    >
                                                                        Edit
                                                                    </Button>
                                                                )}
                                                                {canDelete && (
                                                                    <Button
                                                                        variant="contained"
                                                                        size="small"
                                                                        onClick={() => {
                                                                            setWorkloadToDelete(row);
                                                                            setOpenDeleteDialog(true);
                                                                        }}
                                                                        startIcon={<DeleteIcon sx={{ fontSize: "13px !important" }} />}
                                                                        sx={{
                                                                            minWidth: 76,
                                                                            height: 28,
                                                                            borderRadius: 1,
                                                                            backgroundColor: "#dc2626",
                                                                            fontSize: "10px",
                                                                            textTransform: "none",
                                                                            boxShadow: "none",
                                                                            "&:hover": { backgroundColor: "#b91c1c", boxShadow: "none" },
                                                                        }}
                                                                    >
                                                                        Delete
                                                                    </Button>
                                                                )}
                                                            </>
                                                        )}
                                                    </Box>
                                                </TableCell>
                                            )}
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Box>
            )}

            <Popover
                open={Boolean(addAnchorEl)}
                anchorEl={addAnchorEl}
                onClose={() => setAddAnchorEl(null)}
                anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                transformOrigin={{ vertical: "top", horizontal: "right" }}
                PaperProps={{
                    sx: {
                        width: 240,
                        mt: 0.5,
                        p: 1,
                        border: `1px solid ${headerColor}`,
                        borderRadius: "5px",
                        backgroundColor: "#fff",
                        boxShadow: "0 5px 14px rgba(0, 0, 0, 0.28)",
                    },
                }}
            >
                <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
                    <TextField
                        name="workloadCode"
                        value={workload.workloadCode}
                        onChange={handleChangesForEverything}
                        placeholder="Code"
                        size="small"
                        fullWidth
                        inputProps={{ "aria-label": "Workload code" }}
                        sx={{
                            "& .MuiOutlinedInput-root": {
                                height: 30,
                                borderRadius: "5px",
                                backgroundColor: "#fff",
                                color: "#334155",
                                fontSize: "12px",
                                "& fieldset": { borderColor: "#cbd5e1" },
                                "&:hover fieldset": { borderColor: headerColor },
                                "&.Mui-focused fieldset": { borderColor: headerColor },
                            },
                            "& input": { py: 0.5, textAlign: "center" },
                            "& input::placeholder": { color: "#64748b", opacity: 1 },
                        }}
                    />

                    <TextField
                        name="workloadDescription"
                        value={workload.workloadDescription}
                        onChange={handleChangesForEverything}
                        placeholder="Description"
                        size="small"
                        fullWidth
                        inputProps={{ "aria-label": "Workload description" }}
                        sx={{
                            "& .MuiOutlinedInput-root": {
                                height: 30,
                                borderRadius: "5px",
                                backgroundColor: "#fff",
                                color: "#334155",
                                fontSize: "12px",
                                "& fieldset": { borderColor: "#cbd5e1" },
                                "&:hover fieldset": { borderColor: headerColor },
                                "&.Mui-focused fieldset": { borderColor: headerColor },
                            },
                            "& input": { py: 0.5, textAlign: "center" },
                            "& input::placeholder": { color: "#64748b", opacity: 1 },
                        }}
                    />

                    <Box sx={{ display: "flex", gap: 0.75 }}>
                        <Box
                            onClick={() => colorPickerRef.current?.click()}
                            sx={{
                                width: 30,
                                height: 30,
                                flexShrink: 0,
                                border: `1px solid ${headerColor}`,
                                borderRadius: "5px",
                                backgroundColor: isValidCssColor(workload.workloadColor)
                                    ? workload.workloadColor
                                    : "#fff",
                                cursor: "pointer",
                            }}
                        >
                            <input
                                ref={colorPickerRef}
                                type="color"
                                value={parseColorToHex(workload.workloadColor) || DEFAULT_WORKLOAD_COLOR}
                                onChange={(event) =>
                                    setWorkload((previous) => ({
                                        ...previous,
                                        workloadColor: event.target.value,
                                    }))
                                }
                                style={{ opacity: 0, width: 0, height: 0, position: "absolute" }}
                            />
                        </Box>
                        <TextField
                            name="workloadColor"
                            value={workload.workloadColor}
                            onChange={handleChangesForEverything}
                            placeholder="Color"
                            size="small"
                            fullWidth
                            inputProps={{ "aria-label": "Workload color" }}
                            sx={{
                                "& .MuiOutlinedInput-root": {
                                    height: 30,
                                    borderRadius: "5px",
                                    backgroundColor: "#fff",
                                    color: "#334155",
                                    fontSize: "12px",
                                    "& fieldset": { borderColor: "#cbd5e1" },
                                    "&:hover fieldset": { borderColor: headerColor },
                                    "&.Mui-focused fieldset": { borderColor: headerColor },
                                },
                                "& input": { py: 0.5, textAlign: "center" },
                                "& input::placeholder": { color: "#64748b", opacity: 1 },
                            }}
                        />
                    </Box>

                    <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0.75, mt: 0.75 }}>
                        <Button
                            variant="outlined"
                            onClick={() => setAddAnchorEl(null)}
                            sx={{
                                height: 30,
                                borderRadius: "5px",
                                borderColor: headerColor,
                                color: headerColor,
                                backgroundColor: "#fff",
                                fontSize: "11px",
                                textTransform: "none",
                                boxShadow: "none",
                                "&:hover": {
                                    borderColor: headerColor,
                                    backgroundColor: "#f8fafc",
                                    boxShadow: "none",
                                },
                            }}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="contained"
                            onClick={handleSavingWorkload}
                            sx={{
                                height: 30,
                                borderRadius: "5px",
                                backgroundColor: mainButtonColor,
                                fontSize: "11px",
                                textTransform: "none",
                                boxShadow: "none",
                                "&:hover": {
                                    backgroundColor: mainButtonColor,
                                    filter: "brightness(0.92)",
                                    boxShadow: "none",
                                },
                            }}
                        >
                            Add
                        </Button>
                    </Box>
                </Box>
            </Popover>

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
                    <Box
                        sx={{
                            display: "grid",
                            gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
                            gap: 2,
                            mt: 2,
                            "& .MuiInputBase-input": {
                                fontSize: "12px",
                            },
                            "& .MuiInputLabel-root": {
                                fontSize: "12px",
                            },
                            "& .MuiOutlinedInput-root.Mui-focused:not(.Mui-error) .MuiOutlinedInput-notchedOutline": {
                                borderColor: headerColor,
                            },
                            "& .MuiInputLabel-root.Mui-focused:not(.Mui-error)": {
                                color: headerColor,
                            },
                        }}
                    >
                        <TextField
                            label="Code"
                            placeholder="Workload Code"
                            name="workloadCode"
                            value={workload.workloadCode}
                            onChange={handleChangesForEverything}
                            fullWidth
                        />

                        <TextField
                            label="Description"
                            placeholder="Workload Description"
                            name="workloadDescription"
                            value={workload.workloadDescription}
                            onChange={handleChangesForEverything}
                            fullWidth
                        />

                        <Box
                            sx={{
                                display: "flex",
                                alignItems: "flex-start",
                                gap: 1.5,
                                gridColumn: "1 / -1",
                            }}
                        >
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
                        sx={{
                            px: 4,
                            fontWeight: 600,
                            textTransform: "none",
                            backgroundColor: mainButtonColor,
                            "&:hover": {
                                backgroundColor: mainButtonColor,
                                filter: "brightness(0.92)",
                            },
                        }}
                        onClick={handleSavingWorkload}
                    >
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
