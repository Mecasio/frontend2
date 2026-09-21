import React, { useState, useEffect, useContext, useRef } from "react";
import { SettingsContext } from "../App";
import axios from "axios";
import {
    Box,
    Button,
    Container,
    CssBaseline,
    TextField,
    Typography,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    IconButton,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Slide,
    Tooltip,
    Snackbar,
    Alert,
    FormControl,
    Select,
    MenuItem,
} from "@mui/material";
import API_BASE_URL from "../apiConfig";
import EaristLogo from "../assets/EaristLogo.png";
import { getAuditConfig } from "../utils/auditEvents";
import useAccountAuditMac from "./useAccountAuditMac";
import { IoMdAddCircle } from "react-icons/io";
import Unauthorized from "../components/Unauthorized";
import LoadingOverlay from "../components/LoadingOverlay";

import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import SaveIcon from '@mui/icons-material/Save';



const Transition = React.forwardRef(function Transition(props, ref) {
    return <Slide direction="up" ref={ref} {...props} />;
});

const PageManagement = () => {
    useAccountAuditMac();

    const settings = useContext(SettingsContext);
    const colors = settings?.colors || {};
    const branding = settings?.branding || {};
    const assets = settings?.assets || {};
    const headerColor = colors.header || "#1976d2";

    const [titleColor, setTitleColor] = useState("#000000");
    const [subtitleColor, setSubtitleColor] = useState("#555555");
    const [borderColor, setBorderColor] = useState("#000000");
    const [mainButtonColor, setMainButtonColor] = useState("#1976d2");
    const [subButtonColor, setSubButtonColor] = useState("#ffffff");   // ✅ NEW
    const [stepperColor, setStepperColor] = useState("#000000");       // ✅ NEW

    const [fetchedLogo, setFetchedLogo] = useState(null);
    const [companyName, setCompanyName] = useState("");
    const [shortTerm, setShortTerm] = useState("");
    const [campusAddress, setCampusAddress] = useState("");

    useEffect(() => {
        if (!settings) return;

        // 🎨 Colors
        if (colors.title) setTitleColor(colors.title);
        if (colors.subtitle) setSubtitleColor(colors.subtitle);
        if (colors.border) setBorderColor(colors.border);
        if (colors.mainButton) setMainButtonColor(colors.mainButton);
        if (colors.subButton) setSubButtonColor(colors.subButton);   // ✅ NEW
        if (colors.stepper) setStepperColor(colors.stepper);           // ✅ NEW

        // 🏫 Logo
        if (assets.logoUrl) {
            setFetchedLogo(`${assets.logoUrl}`);
        } else {
            setFetchedLogo(EaristLogo);
        }

        // 🏷️ School Information
        if (branding.companyName) setCompanyName(branding.companyName);
        if (branding.shortTerm) setShortTerm(branding.shortTerm);
        if (branding.campusAddress) setCampusAddress(branding.campusAddress);

    }, [settings]);






    // Also put it at the very top
    const [userID, setUserID] = useState("");
    const [user, setUser] = useState("");
    const [userRole, setUserRole] = useState("");

    const [hasAccess, setHasAccess] = useState(null);
    const [canCreate, setCanCreate] = useState(false);
    const [canEdit, setCanEdit] = useState(false);
    const [canDelete, setCanDelete] = useState(false);
    const [loading, setLoading] = useState(false);


    const pageId = 69;

    const [employeeID, setEmployeeID] = useState("");

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
            console.error('Error checking access:', error);
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

    const [pages, setPages] = useState([]);
    const [open, setOpen] = useState(false);
    const [currentPageId, setCurrentPageId] = useState(null);
    const [pageDescription, setPageDescription] = useState("");
    const [pageGroup, setPageGroup] = useState("");
    const [snackbar, setSnackbar] = useState({ open: false, message: "", type: "success" });

    const mainColor = "#7E0000";

    // ✅ NEW: pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 100;

    useEffect(() => {
        fetchPages();
    }, []);

    const fetchPages = async () => {
        try {
            const response = await axios.get(`${API_BASE_URL}/api/pages`, { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` } });
            const sortedPages = response.data.sort((a, b) => a.id - b.id);
            setPages(sortedPages);
        } catch (error) {
            console.error("Error fetching pages:", error);
        }
    };

    // ✅ NEW: reset to page 1 whenever the underlying data changes
    useEffect(() => {
        setCurrentPage(1);
    }, [pages.length]);

    // ✅ NEW: pagination derived values
    const totalPages = Math.max(1, Math.ceil(pages.length / itemsPerPage));
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentPages = pages.slice(indexOfFirstItem, indexOfLastItem);

    const [pageIdInput, setPageIdInput] = useState("");

    const getAuditConfigForPage = () =>
        getAuditConfig({
            "x-employee-id":
                employeeID ||
                localStorage.getItem("employee_id") ||
                localStorage.getItem("email") ||
                "unknown",
            "x-page-id": pageId,
            "x-audit-actor-id":
                employeeID ||
                localStorage.getItem("employee_id") ||
                localStorage.getItem("email") ||
                "unknown",
            "x-audit-actor-role": userRole || localStorage.getItem("role") || "administrator",
        });

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (currentPageId && !canEdit) {
            setSnackbar({
                open: true,
                message: "You do not have permission to edit pages.",
                type: "error",
            });
            return;
        }

        if (!currentPageId && !canCreate) {
            setSnackbar({
                open: true,
                message: "You do not have permission to create pages.",
                type: "error",
            });
            return;
        }

        try {
            if (currentPageId) {
                // UPDATE
                await axios.put(
                    `${API_BASE_URL}/api/pages/${currentPageId}`,
                    {
                        page_description: pageDescription,
                        page_group: pageGroup,
                    },
                    getAuditConfigForPage(),
                );

                setSnackbar({
                    open: true,
                    message: "Page updated successfully!",
                    type: "success",
                });

            } else {
                // ADD — detect duplicate
                await axios.post(
                    `${API_BASE_URL}/api/pages`,
                    {
                        id: pageIdInput,
                        page_description: pageDescription,
                        page_group: pageGroup,
                    },
                    getAuditConfigForPage(),
                );

                setSnackbar({
                    open: true,
                    message: "Page added successfully!",
                    type: "success",
                });
            }

            fetchPages();
            handleClose();

        } catch (error) {
            if (error.response && error.response.status === 400) {
                // Duplicate ID error
                setSnackbar({
                    open: true,
                    message: "Page ID already exists!",
                    type: "error",
                });
            } else {
                setSnackbar({
                    open: true,
                    message: "Error saving page",
                    type: "error",
                });
            }
        }
    };




    const handleEdit = (page) => {
        setCurrentPageId(String(page.id));
        setPageIdInput(String(page.id));

        setPageDescription(page.page_description);
        setPageGroup(page.page_group);
        setOpen(true);
    };


    // const handleDelete = async (id) => {
    //     try {
    //         await axios.delete(`${API_BASE_URL}/api/pages/${id}`);
    //         fetchPages();

    //         setSnackbar({
    //             open: true,
    //             message: "Page deleted successfully!",
    //             type: "success",
    //         });

    //     } catch (error) {
    //         console.error("Error deleting page:", error);

    //         setSnackbar({
    //             open: true,
    //             message: "Error deleting page",
    //             type: "error",
    //         });
    //     }
    // };

    const handleOpen = () => {
        resetForm();

        if (pages.length > 0) {
            const lastId = Math.max(...pages.map(p => Number(p.id)));
            setPageIdInput(lastId + 1);
        } else {
            setPageIdInput(1); // if no records yet
        }

        setOpen(true);
    };

    const handleClose = () => {
        setOpen(false);
        resetForm();
    };

    const resetForm = () => {
        setCurrentPageId(null);
        setPageIdInput("");
        setPageDescription("");
        setPageGroup("");
    };




    // Put this at the very bottom before the return 
    if (loading || hasAccess === null) {
        return <LoadingOverlay open={loading} message="Loading..." />;
    }

    if (!hasAccess) {
        return (
            <Unauthorized />
        );
    }





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

    // ✅ NEW: reusable pagination bar (used above and below the table)
    const renderPaginationBar = () => (
        <TableContainer component={Paper} sx={{ width: "100%" }}>
            <Table size="small" >
                <TableHead sx={{ backgroundColor: "#6D2323", color: "white" }}>
                    <TableRow>
                        <TableCell
                            colSpan={4}
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
                                gap={1}
                                sx={{ height: "50px" }}
                            >
                                <Typography fontSize="14px" fontWeight="bold" color="white">
                                    Total Pages Records: {pages.length}
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
                                                "& svg": { color: "white" },
                                            }}
                                            MenuProps={{
                                                PaperProps: {
                                                    sx: { maxHeight: 200, backgroundColor: "#fff" },
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
    );

    return (
        <Box sx={{ height: "calc(100vh - 150px)", overflowY: "auto", paddingRight: 1, backgroundColor: "transparent", mt: 1, padding: 2 }}>
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
                        fontWeight: "bold",
                        color: titleColor,
                        fontSize: "36px",
                    }}
                >
                    PAGE MANAGEMENT
                </Typography>
            </Box>
            <hr style={{ border: "1px solid #ccc", width: "100%" }} />
            <br />
            <br />

            {canCreate && (
                <Button
                    variant="contained"

                    onClick={handleOpen}

                    sx={{
                        px: 4,
                        fontWeight: 600,
                        textTransform: "none"
                    }}
                >
                    + Add New Page
                </Button>
            )}

            <div style={{ height: "30px" }}></div>


            {renderPaginationBar()}


            {/* Pages Table */}
            <Paper
                elevation={4}
                sx={{

                    overflow: "hidden",
                    backgroundColor: "#ffffff",
                }}
            >
                <TableContainer>
                    <Table>
                        <TableHead sx={{ backgroundColor: "#f5f5f5", }}>
                            <TableRow>
                                <TableCell sx={{ color: "black", fontWeight: "bold", border: `1px solid ${borderColor}` }}>#</TableCell>
                                <TableCell sx={{ color: "black", fontWeight: "bold", border: `1px solid ${borderColor}` }}>Page Description</TableCell>
                                <TableCell sx={{ color: "black", fontWeight: "bold", border: `1px solid ${borderColor}` }}>Page Group</TableCell>
                                <TableCell align="center" sx={{ color: "black", fontWeight: "bold", border: `1px solid ${borderColor}` }}>
                                    Actions
                                </TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {currentPages.length > 0 ? (
                                currentPages.map((page, i) => (
                                    <TableRow
                                        key={page.id}
                                        sx={{
                                            backgroundColor: i % 2 === 0 ? "#ffffff" : "lightgray",
                                        }}
                                    >
                                        <TableCell style={{ border: `1px solid ${borderColor}` }}>
                                            {page.id}
                                        </TableCell>
                                        <TableCell style={{ border: `1px solid ${borderColor}` }}>
                                            {page.page_description}
                                        </TableCell>
                                        <TableCell style={{ border: `1px solid ${borderColor}` }}>
                                            {page.page_group}
                                        </TableCell>
                                        <TableCell

                                            align="center"
                                            sx={{ border: `1px solid ${borderColor}` }}
                                        >
                                            <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "10px" }}>

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
                                                            height: "40px",
                                                            display: "flex",
                                                            alignItems: "center",
                                                            justifyContent: "center",
                                                            gap: "5px",
                                                        }}
                                                        onClick={() => handleEdit(page)}
                                                    >
                                                        <EditIcon fontSize="small" /> Edit
                                                    </Button>
                                                )}

                                                {/* <Button
                                                variant="contained"
                                                size="small"
                                                sx={{
                                                    backgroundColor: "#9E0000",
                                                    color: "white",
                                                    borderRadius: "5px",
                                                    padding: "8px 14px",
                                                    width: "100px",
                                                    height: "40px",
                                                    display: "flex",
                                                    alignItems: "center",
                                                    justifyContent: "center",
                                                    gap: "5px",
                                                }}
                                                onClick={() => handleDelete(page.id)}
                                            >
                                                <DeleteIcon fontSize="small" /> Delete
                                            </Button> */}
                                            </Box>

                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={4} align="center" >
                                        <Typography color="text.secondary">No pages found.</Typography>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>


            {renderPaginationBar()}

            {/* Add/Edit Dialog */}
            <Dialog
                open={open}
                onClose={handleClose}
                TransitionComponent={Transition}
                keepMounted
                fullWidth
                maxWidth="sm"
            >
                <DialogTitle
                    sx={{
                        bgcolor: mainColor,
                        color: "white",
                        fontWeight: "bold",
                        textAlign: "center",
                    }}
                >
                    {currentPageId ? "Edit Page" : "Add New Page"}
                </DialogTitle>
                <DialogContent dividers sx={{ py: 4 }}>
                    <form onSubmit={handleSubmit}>

                        {/* ADD MODE - ID editable */}
                        {currentPageId === null && (
                            <TextField
                                fullWidth
                                label="Page ID"
                                variant="outlined"
                                margin="normal"
                                type="number"
                                value={pageIdInput}
                                onChange={(e) => setPageIdInput(e.target.value)}
                                required
                                InputProps={{ readOnly: true }}
                            />
                        )}

                        {/* EDIT MODE - ID read-only */}
                        {currentPageId !== null && (
                            <TextField
                                fullWidth
                                label="Page ID"
                                variant="outlined"
                                margin="normal"
                                value={pageIdInput}
                                InputProps={{ readOnly: true }}
                            />
                        )}

                        <TextField
                            fullWidth
                            label="Page Description"
                            variant="outlined"
                            margin="normal"
                            value={pageDescription}
                            onChange={(e) => setPageDescription(e.target.value)}
                            required
                        />

                        <TextField
                            fullWidth
                            label="Page Group"
                            variant="outlined"
                            margin="normal"
                            value={pageGroup}
                            onChange={(e) => setPageGroup(e.target.value)}
                            required
                        />
                    </form>
                </DialogContent>

                <DialogActions sx={{ justifyContent: "space-between", px: 3, pb: 2 }}>
                    <Button onClick={handleClose}
                        color="error"
                        variant="outlined"

                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        variant="contained"
                        sx={{ px: 4, fontWeight: 600, textTransform: "none", }}
                    >
                        <SaveIcon fontSize="small" /> Save
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Snackbar */}
            <Snackbar
                open={snackbar.open}
                autoHideDuration={3000}
                onClose={() => setSnackbar({ ...snackbar, open: false })}
                anchorOrigin={{ vertical: "top", horizontal: "center" }}
            >
                <Alert
                    onClose={() => setSnackbar({ ...snackbar, open: false })}
                    severity={snackbar.type}
                    variant="filled"
                    sx={{ width: "100%" }}
                >
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Box>
    );
};

export default PageManagement;
