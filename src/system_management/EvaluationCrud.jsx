import React, { useState, useEffect, useContext, useRef } from "react";
import { SettingsContext } from "../App";
import EaristLogo from "../assets/EaristLogo.png";
import axios from "axios";
import { Box, Typography, TextField, TableContainer, Table, Snackbar, Alert, TableHead, TableBody, TableRow, TableCell, Paper, Divider, Button, FormControl, Select, MenuItem, InputLabel, Dialog, DialogTitle, DialogContent, DialogActions, Stack } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import Unauthorized from "../components/Unauthorized";
import LoadingOverlay from "../components/LoadingOverlay";
import API_BASE_URL from "../apiConfig";
import SaveIcon from '@mui/icons-material/Save';
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import { getFlatAuditHeaders } from "../utils/auditEvents";
import useAuditMac from "../utils/useAuditMac";

const EvaluationCrud = () => {
    useAuditMac();
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
            setFetchedLogo(assets.logoUrl);
        } else {
            setFetchedLogo(EaristLogo);
        }

        // 🏷️ School Information
        if (branding.companyName) setCompanyName(branding.companyName);
        if (branding.shortTerm) setShortTerm(branding.shortTerm);
        if (branding.campusAddress) setCampusAddress(branding.campusAddress);

    }, [settings]);



    const [openSnackbar, setOpenSnackbar] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState("");
    const [openDialog, setOpenDialog] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [schoolYears, setSchoolYears] = useState([]);
    const [schoolSemester, setSchoolSemester] = useState([]);
    const [selectedSchoolYear, setSelectedSchoolYear] = useState('');
    const [selectedSchoolSemester, setSelectedSchoolSemester] = useState('');
    const [selectedActiveSchoolYear, setSelectedActiveSchoolYear] = useState('');
    const [activeSchoolYearFilterYear, setActiveSchoolYearFilterYear] = useState('');
    const [selectedId, setSelectedId] = useState(null);
    const [reuseDialogOpen, setReuseDialogOpen] = useState(false);
    const [reuseTargetSchoolYear, setReuseTargetSchoolYear] = useState('');
    const [reuseTargetSchoolSemester, setReuseTargetSchoolSemester] = useState('');
    const [categories, setCategories] = useState([]);
    const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
    const [categoryEditMode, setCategoryEditMode] = useState(false);
    const [selectedCategoryId, setSelectedCategoryId] = useState(null);
    const [categoryFormData, setCategoryFormData] = useState({ title: "", description: "" });
    const [questions, setQuestions] = useState([]);
    const [formData, setFormData] = useState({
        category: "",
        question: "",
        choice1: "",
        choice2: "",
        choice3: "",
        choice4: "",
        choice5: ""
    });


    const [userID, setUserID] = useState("");
    const [user, setUser] = useState("");
    const [userRole, setUserRole] = useState("");
    const [hasAccess, setHasAccess] = useState(null);
    const [canCreate, setCanCreate] = useState(false);
    const [canEdit, setCanEdit] = useState(false);
    const [canDelete, setCanDelete] = useState(false);
    const [loading, setLoading] = useState(false);
    const pageId = 23;

    const [employeeID, setEmployeeID] = useState("");

    const getAuditHeaders = () => ({
        headers: {
            ...getFlatAuditHeaders(),
            "x-employee-id": employeeID || localStorage.getItem("employee_id") || "",
            "x-page-id": pageId,
            "x-audit-actor-id": employeeID || localStorage.getItem("employee_id") || "",
            "x-audit-actor-role": userRole || localStorage.getItem("role") || "registrar",
        },
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


    const fetchQuestions = async () => {
        try {
            const response = await axios.get(`${API_BASE_URL}/api/get_questions`);
            setQuestions(response.data);
        } catch (err) {
            console.error("Error fetching questions:", err);
        }
    };

    const fetchCategories = async () => {
        try {
            const response = await axios.get(`${API_BASE_URL}/api/get_category`);
            setCategories(response.data);
        } catch (err) {
            console.error("Error fetching categories:", err);
        }
    };

    const maxButtonsToShow = 5;
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(50);
    const totalPages = Math.ceil(questions.length / itemsPerPage);
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;

    useEffect(() => {
        fetchQuestions();
        fetchCategories();
    }, []);

    useEffect(() => {
        axios
            .get(`${API_BASE_URL}/api/get_school_year/`)
            .then((res) => setSchoolYears(res.data))
            .catch((err) => console.error(err));
    }, [])

    useEffect(() => {
        axios
            .get(`${API_BASE_URL}/api/get_school_semester/`)
            .then((res) => setSchoolSemester(res.data))
            .catch((err) => console.error(err));
    }, [])

    useEffect(() => {

        axios
            .get(`${API_BASE_URL}/api/active_school_year`)
            .then((res) => {
                if (res.data.length > 0) {
                    setSelectedSchoolYear(res.data[0].year_id);
                    setActiveSchoolYearFilterYear(res.data[0].year_id);
                    setSelectedSchoolSemester(res.data[0].semester_id);
                }
            })
            .catch((err) => console.error(err));

    }, []);

    useEffect(() => {
        if (selectedSchoolYear && selectedSchoolSemester) {
            axios
                .get(`${API_BASE_URL}/api/get_selecterd_year/${selectedSchoolYear}/${selectedSchoolSemester}`)
                .then((res) => {
                    if (res.data.length > 0) {
                        setSelectedActiveSchoolYear(res.data[0].school_year_id);
                    }
                })
                .catch((err) => console.error(err));
        }
    }, [selectedSchoolYear, selectedSchoolSemester]);


    useEffect(() => {
        if (currentPage > totalPages) {
            setCurrentPage(totalPages || 1);
        }
    }, [totalPages]);

    let startPage = Math.max(1, currentPage - Math.floor(maxButtonsToShow / 2));
    let endPage = Math.min(totalPages, startPage + maxButtonsToShow - 1);

    if (endPage - startPage < maxButtonsToShow - 1) {
        startPage = Math.max(1, endPage - maxButtonsToShow + 1);
    }

    const visiblePages = [];

    for (let i = startPage; i <= endPage; i++) {
        visiblePages.push(i);
    }

    const filteredQuestion = questions
        .filter((s) => {
            const matchesYear =
                selectedSchoolYear === "" || String(s.year_id) === String(selectedSchoolYear);

            const matchesSemester =
                selectedSchoolSemester === "" || String(s.semester_id) === String(selectedSchoolSemester);

            return matchesYear && matchesSemester
        })

    const activeSchoolYear = schoolYears.find((sy) => String(sy.year_id) === String(activeSchoolYearFilterYear));
    const activeCalendarYear = Number(activeSchoolYear?.current_year) || new Date().getFullYear();
    const recentSchoolYears = schoolYears.filter((sy) => {
        const year = Number(sy.current_year);
        return Number.isFinite(year) && year >= activeCalendarYear - 10 && year <= activeCalendarYear;
    });

    const handleSchoolYearChange = (event) => {
        setSelectedSchoolYear(event.target.value);
    };

    const handleSchoolSemesterChange = (event) => {
        setSelectedSchoolSemester(event.target.value);
    };

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleCategoryChange = (e) => {
        setCategoryFormData({ ...categoryFormData, [e.target.name]: e.target.value });
    };

    const handleCloseDialog = () => {
        setOpenDialog(false);
    };

    const handleCategoryDialogClose = () => {
        setCategoryDialogOpen(false);
        setCategoryEditMode(false);
        setCategoryFormData({ title: "", description: "" });
        setSelectedCategoryId(null);
    };

    const handleSaveQuestion = async () => {
        if (editMode && !canEdit) {
            alert("You do not have permission to edit questions");
            return;
        }

        if (!editMode && !canCreate) {
            alert("You do not have permission to create questions");
            return;
        }

        try {
            if (editMode) {
                const response = await axios.put(
                    `${API_BASE_URL}/api/update_question/${selectedId}`,
                    formData,
                    getAuditHeaders()
                );
                setSnackbarMessage(response.data.message);
                setOpenSnackbar(true);
            } else {
                const response = await axios.post(`${API_BASE_URL}/api/insert_question`, {
                    ...formData,
                    school_year_id: selectedActiveSchoolYear, // ✅ include this
                }, getAuditHeaders());
                setSnackbarMessage(response.data.message);
                setOpenSnackbar(true);
            }
            setFormData({ category: "", question: "", choice1: "", choice2: "", choice3: "", choice4: "", choice5: "" });
            setOpenDialog(false);
            setEditMode(false);
            setSelectedId(null);
            fetchQuestions();
        } catch (err) {
            console.error("Error saving question:", err);
            alert("Failed to save question");
        }
    };

    const handleSaveCategory = async () => {
        if (categoryEditMode && !canEdit) {
            alert("You do not have permission to edit categories");
            return;
        }

        if (!categoryEditMode && !canCreate) {
            alert("You do not have permission to create categories");
            return;
        }

        try {
            if (categoryEditMode) {
                await axios.put(`${API_BASE_URL}/api/update_category/${selectedCategoryId}`, categoryFormData, getAuditHeaders());
                setSnackbarMessage("Category updated successfully");
            } else {
                await axios.post(`${API_BASE_URL}/api/insert_category`, categoryFormData, getAuditHeaders());
                setSnackbarMessage("Category created successfully");
            }
            setOpenSnackbar(true);
            handleCategoryDialogClose();
            fetchCategories();
        } catch (err) {
            console.error(err);
            alert("Failed to save category");
        }
    };

    const handleEdit = (question) => {
        if (!canEdit) {
            alert("You do not have permission to edit questions");
            return;
        }

        setFormData({
            category: question.category,
            question: question.question_description,
            choice1: question.first_choice,
            choice2: question.second_choice,
            choice3: question.third_choice,
            choice4: question.fourth_choice,
            choice5: question.fifth_choice,
        });
        setSelectedId(question.question_id);
        setEditMode(true);
        setOpenDialog(true);
    };

    const handleEditCategory = (cat) => {
        if (!canEdit) {
            alert("You do not have permission to edit categories");
            return;
        }

        setCategoryFormData({ title: cat.title, description: cat.description });
        setSelectedCategoryId(cat.id);
        setCategoryEditMode(true);
        setCategoryDialogOpen(true);
    };

    const [openDeleteQuestionDialog, setOpenDeleteQuestionDialog] = useState(false);
    const [questionToDelete, setQuestionToDelete] = useState(null);
    const [openDeleteCategoryDialog, setOpenDeleteCategoryDialog] = useState(false);
    const [categoryToDelete, setCategoryToDelete] = useState(null);

    const handleDeleteCategory = (cat) => {
        if (!canDelete) {
            alert("You do not have permission to delete categories");
            return;
        }
        setCategoryToDelete(cat);
        setOpenDeleteCategoryDialog(true);
    };

    const handleConfirmDeleteCategory = async () => {
        try {
            await axios.delete(`${API_BASE_URL}/api/delete_category/${categoryToDelete.id}`, getAuditHeaders());
            setSnackbarMessage("Category deleted successfully");
            setOpenSnackbar(true);
            fetchCategories();
        } catch (err) {
            console.error("Error deleting category:", err);
            alert("Failed to delete category");
        } finally {
            setOpenDeleteCategoryDialog(false);
            setCategoryToDelete(null);
        }
    };

    const handleDeleteQuestion = (question) => {
        if (!canDelete) {
            alert("You do not have permission to delete questions");
            return;
        }
        setQuestionToDelete(question);
        setOpenDeleteQuestionDialog(true);
    };

    const handleConfirmDeleteQuestion = async () => {
        try {
            await axios.delete(`${API_BASE_URL}/api/delete_question/${questionToDelete.question_id}`, getAuditHeaders());
            setSnackbarMessage("Question deleted successfully");
            setOpenSnackbar(true);
            fetchQuestions();
        } catch (err) {
            console.error("Error deleting question:", err);
            alert("Failed to delete question");
        } finally {
            setOpenDeleteQuestionDialog(false);
            setQuestionToDelete(null);
        }
    };

    // 🔒 Disable right-click
    document.addEventListener('contextmenu', (e) => e.preventDefault());

    // 🔒 Block DevTools shortcuts + Ctrl+P silently
    document.addEventListener('keydown', (e) => {
        const isBlockedKey =
            e.key === 'F12' || // DevTools
            e.key === 'F11' || // Fullscreen
            (e.ctrlKey && e.shiftKey && (e.key.toLowerCase() === 'i' || e.key.toLowerCase() === 'j')) || // Ctrl+Shift+I/J
            (e.ctrlKey && e.key.toLowerCase() === 'u') || // Ctrl+U (View Source)
            (e.ctrlKey && e.key.toLowerCase() === 'p');   // Ctrl+P (Print)

        if (isBlockedKey) {
            e.preventDefault();
            e.stopPropagation();
        }
    });



    const getActiveSchoolYearId = async (yearId, semesterId) => {
        const res = await axios.get(`${API_BASE_URL}/api/get_selecterd_year/${yearId}/${semesterId}`);
        return res.data?.[0]?.school_year_id || null;
    };

    const handleReuseQuestions = async () => {
        if (!canCreate) {
            alert("You do not have permission to reuse questions");
            return;
        }

        if (!selectedActiveSchoolYear || !reuseTargetSchoolYear || !reuseTargetSchoolSemester) {
            alert("Please select a source filter and target semester.");
            return;
        }

        try {
            const targetActiveSchoolYear = await getActiveSchoolYearId(reuseTargetSchoolYear, reuseTargetSchoolSemester);

            if (!targetActiveSchoolYear) {
                alert("Target school year and semester were not found.");
                return;
            }

            const response = await axios.post(`${API_BASE_URL}/api/reuse_questions`, {
                source_school_year_id: selectedActiveSchoolYear,
                target_school_year_id: targetActiveSchoolYear,
            }, getAuditHeaders());

            setSnackbarMessage(response.data.message);
            setOpenSnackbar(true);
            setReuseDialogOpen(false);
            setReuseTargetSchoolYear("");
            setReuseTargetSchoolSemester("");
            fetchQuestions();
        } catch (err) {
            console.error("Error reusing questions:", err);
            alert(err.response?.data?.message || "Failed to reuse questions");
        }
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

    return (
        <Box sx={{ height: "calc(100vh - 150px)", overflowY: "auto", paddingRight: 1, backgroundColor: "transparent", mt: 1, padding: 2 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2} >
                <Typography variant="h4" fontWeight="bold" style={{ color: titleColor }}>
                    EVALUATION MANAGEMENT
                </Typography>
            </Box>
            <hr style={{ border: "1px solid #ccc", width: "100%" }} />
            <br />
            <br />
            <TableContainer component={Paper} sx={{ width: '100%' }}>
                <Table size="small">
                    <TableHead sx={{ backgroundColor: headerColor, color: "white" }}>
                        <TableRow>
                            <TableCell
                                colSpan={10}
                                sx={{
                                    border: `1px solid ${borderColor}`,
                                    py: 0.5,
                                    backgroundColor: headerColor,
                                    color: "white"
                                }}
                            >
                                <Box display="flex" justifyContent="space-between" alignItems="center">
                                    <Typography fontSize="14px" fontWeight="bold" color="white">
                                        QUESTION LISTS
                                    </Typography>

                                    <Box display="flex" alignItems="center" gap={1}>
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
                                                '&:hover': {
                                                    borderColor: 'white',
                                                    backgroundColor: 'rgba(255,255,255,0.1)',
                                                },
                                                '&.Mui-disabled': {
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
                                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                            disabled={currentPage === 1}
                                            variant="outlined"
                                            size="small"
                                            sx={{
                                                minWidth: 80,
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
                                                },
                                            }}
                                        >
                                            Prev
                                        </Button>

                                        {/* Page Dropdown */}
                                        <FormControl size="small" sx={{ minWidth: 80 }}>
                                            <Select
                                                value={currentPage}
                                                onChange={(e) => setCurrentPage(Number(e.target.value))}
                                                displayEmpty
                                                sx={{
                                                    fontSize: '12px',
                                                    height: 36,
                                                    color: 'white',
                                                    border: '1px solid white',
                                                    backgroundColor: 'transparent',
                                                    '.MuiOutlinedInput-notchedOutline': {
                                                        borderColor: 'white',
                                                    },
                                                    '&:hover .MuiOutlinedInput-notchedOutline': {
                                                        borderColor: 'white',
                                                    },
                                                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                                        borderColor: 'white',
                                                    },
                                                    '& svg': {
                                                        color: 'white',
                                                    }
                                                }}
                                                MenuProps={{
                                                    PaperProps: {
                                                        sx: {
                                                            maxHeight: 200,
                                                            backgroundColor: '#fff',
                                                        }
                                                    }
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
                                            of {totalPages} page{totalPages > 1 ? 's' : ''}
                                        </Typography>

                                        <Button
                                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                            disabled={currentPage === totalPages}
                                            variant="outlined"
                                            size="small"
                                            sx={{
                                                minWidth: 80,
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
                                                '&:hover': {
                                                    borderColor: 'white',
                                                    backgroundColor: 'rgba(255,255,255,0.1)',
                                                },
                                                '&.Mui-disabled': {
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
            <TableContainer
                component={Paper}
                sx={{
                    width: "100%",
                    border: `1px solid ${borderColor}`,
                }}
            >
                <Table>
                    <TableBody>
                        <TableRow>
                            <TableCell>
                                <Box
                                    sx={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "center",
                                        flexWrap: "wrap",
                                        gap: 2,
                                    }}
                                >
                                    <Button
                                        startIcon={<AddIcon />}
                                        variant="contained"
                                        onClick={() => {

                                            setOpenDialog(true);
                                        }}
                                        sx={{
                                            backgroundColor: "#1967d2",
                                            color: "white",
                                            textTransform: "none",
                                            fontWeight: "bold",
                                            width: "350px",
                                            "&:hover": { backgroundColor: "#000000" },
                                        }}
                                    >
                                        Add Evaluation Question
                                    </Button>

                                    <Button
                                        startIcon={<AddIcon />}
                                        variant="contained"
                                        sx={{ backgroundColor: "#1967d2", color: "white" }}
                                        onClick={() => setCategoryDialogOpen(true)}
                                    >
                                        Add Category
                                    </Button>

                                    <Button
                                        variant="contained"
                                        sx={{ backgroundColor: "#2e7d32", color: "white" }}
                                        onClick={() => setReuseDialogOpen(true)}
                                    >
                                        Reuse Questions
                                    </Button>


                                    <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
                                        <FormControl sx={{ width: "350px" }} size="small">
                                            <InputLabel>
                                                Filter by School Year
                                            </InputLabel>
                                            <Select
                                                label="Filter by School Year"
                                                value={selectedSchoolYear}
                                                onChange={handleSchoolYearChange}
                                            >
                                                {recentSchoolYears.length > 0 ? (
                                                    recentSchoolYears.map((sy) => (
                                                        <MenuItem value={sy.year_id} key={sy.year_id}>
                                                            {sy.current_year} - {sy.next_year}
                                                        </MenuItem>
                                                    ))
                                                ) : (
                                                    <MenuItem disabled>School Year is not found</MenuItem>
                                                )
                                                }
                                            </Select>
                                        </FormControl>
                                        <FormControl sx={{ width: "350px" }} size="small">
                                            <InputLabel>
                                                Filter by School Semester
                                            </InputLabel>
                                            <Select
                                                label="Filter by School Semester"
                                                value={selectedSchoolSemester}
                                                onChange={handleSchoolSemesterChange}
                                            >
                                                {schoolSemester.length > 0 ? (
                                                    schoolSemester.map((sem) => (
                                                        <MenuItem value={sem.semester_id} key={sem.semester_id}>
                                                            {sem.semester_description}
                                                        </MenuItem>
                                                    ))
                                                ) : (
                                                    <MenuItem disabled>School Semester is not found</MenuItem>
                                                )
                                                }
                                            </Select>
                                        </FormControl>
                                    </Box>
                                </Box>
                            </TableCell>
                        </TableRow>
                    </TableBody>
                </Table>
            </TableContainer>
            <TableContainer
                component={Paper}
                sx={{ border: `1px solid ${borderColor}`, marginTop: "2rem" }}
            >
                <Table>
                    <TableHead sx={{ backgroundColor: headerColor }}>
                        <TableRow>
                            <TableCell sx={{ color: "white", fontWeight: "bold", textAlign: "center", border: `1px solid ${borderColor}`, }}>#</TableCell>
                            <TableCell sx={{ color: "white", fontWeight: "bold", textAlign: "center", border: `1px solid ${borderColor}`, }}>Title</TableCell>
                            <TableCell sx={{ color: "white", fontWeight: "bold", textAlign: "center", border: `1px solid ${borderColor}`, }}>Description</TableCell>
                            <TableCell sx={{ color: "white", fontWeight: "bold", textAlign: "center", border: `1px solid ${borderColor}`, }}>Action</TableCell>
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
                        {categories.length > 0 ? (
                            categories.map((cat, index) => (
                                <TableRow key={cat.id}>
                                    <TableCell sx={{ textAlign: "center", border: `1px solid ${borderColor}`, }}>{index + 1}</TableCell>
                                    <TableCell sx={{ textAlign: "center", border: `1px solid ${borderColor}`, }}>{cat.title}</TableCell>
                                    <TableCell sx={{ textAlign: "center", border: `1px solid ${borderColor}`, }}>{cat.description}</TableCell>
                                    <TableCell sx={{ textAlign: "center", border: `1px solid ${borderColor}`, }}>
                                        <Box sx={{ display: "flex", gap: 1, justifyContent: "center" }}>
                                            <Button
                                                variant="contained"
                                                sx={{
                                                    backgroundColor: "green",
                                                    color: "white",
                                                    borderRadius: "5px",
                                                    padding: "8px 14px",
                                                    minWidth: "100px",
                                                    display: "flex",
                                                    alignItems: "center",
                                                    justifyContent: "center",
                                                    gap: "5px",
                                                    "&:hover": { backgroundColor: "#006400" },
                                                }}
                                                onClick={() => handleEditCategory(cat)}
                                            >
                                                <EditIcon fontSize="small" /> Edit
                                            </Button>
                                            <Button
                                                variant="contained"
                                                sx={{
                                                    backgroundColor: "#9E0000",
                                                    color: "white",
                                                    borderRadius: "5px",
                                                    padding: "8px 14px",
                                                    minWidth: "100px",
                                                    display: "flex",
                                                    alignItems: "center",
                                                    justifyContent: "center",
                                                    gap: "5px",

                                                }}
                                                onClick={() => handleDeleteCategory(cat)}
                                            >
                                                <DeleteIcon fontSize="small" /> Delete
                                            </Button>
                                        </Box>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={4} align="center">
                                    No categories found
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            <br />
            <br />
            <TableContainer
                component={Paper}
                sx={{ width: "100%", border: `1px solid ${borderColor}` }}
            >
                <Table>
                    <TableHead
                        sx={{ backgroundColor: headerColor }}
                    >
                        <TableRow>
                            <TableCell sx={{ color: "white", textAlign: "Center" }}>
                                Existing Question's:
                            </TableCell>
                        </TableRow>
                    </TableHead>
                </Table>
            </TableContainer>
            <TableContainer
                component={Paper}
                sx={{
                    border: `1px solid ${borderColor}`,

                }}
            >
                <Table>
                    <TableHead sx={{ backgroundColor: "#F5F5F5", color: "black" }}>


                        <TableRow>
                            <TableCell
                                sx={{
                                    color: "black",
                                    width: "1rem",
                                    textAlign: "center",
                                    border: `1px solid ${borderColor}`,
                                }}
                            >
                                #
                            </TableCell>

                            <TableCell
                                sx={{
                                    color: "black",
                                    width: "1rem",
                                    textAlign: "center",
                                    border: `1px solid ${borderColor}`,
                                }}
                            >
                                Category
                            </TableCell>

                            <TableCell
                                sx={{
                                    color: "black",
                                    width: "40rem",
                                    textAlign: "center",
                                    border: `1px solid ${borderColor}`,
                                }}
                            >
                                Description
                            </TableCell>

                            <TableCell
                                sx={{
                                    color: "black",
                                    width: "9rem",
                                    textAlign: "center",
                                    border: `1px solid ${borderColor}`,
                                }}
                            >
                                Choice 1
                            </TableCell>

                            <TableCell
                                sx={{
                                    color: "black",
                                    width: "9rem",
                                    textAlign: "center",
                                    border: `1px solid ${borderColor}`,
                                }}
                            >
                                Choice 2
                            </TableCell>

                            <TableCell
                                sx={{
                                    color: "black",
                                    width: "9rem",
                                    textAlign: "center",
                                    border: `1px solid ${borderColor}`,
                                }}
                            >
                                Choice 3
                            </TableCell>

                            <TableCell
                                sx={{
                                    color: "black",
                                    width: "9rem",
                                    textAlign: "center",
                                    border: `1px solid ${borderColor}`,
                                }}
                            >
                                Choice 4
                            </TableCell>

                            <TableCell
                                sx={{
                                    color: "black",
                                    width: "9rem",
                                    textAlign: "center",
                                    border: `1px solid ${borderColor}`,
                                }}
                            >
                                Choice 5
                            </TableCell>

                            <TableCell
                                sx={{
                                    color: "black",
                                    width: "9rem",
                                    textAlign: "center",
                                    border: `1px solid ${borderColor}`,
                                }}
                            >
                                Action
                            </TableCell>
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
                        {filteredQuestion.length > 0 ? (
                            filteredQuestion.map((q, index) => (
                                <TableRow key={q.question_id}>
                                    <TableCell
                                        style={{
                                            textAlign: "center",
                                            border: `1px solid ${borderColor}`,
                                        }}
                                    >
                                        {index + 1}
                                    </TableCell>

                                    <TableCell
                                        style={{
                                            textAlign: "center",
                                            border: `1px solid ${borderColor}`,
                                        }}
                                    >
                                        {q.category}
                                    </TableCell>

                                    <TableCell
                                        style={{
                                            padding: "0px 20px",
                                            border: `1px solid ${borderColor}`,

                                            color: "black",
                                            fontWeight: 100,
                                        }}
                                    >
                                        {q.question_description}
                                    </TableCell>

                                    <TableCell
                                        style={{
                                            textAlign: "center",
                                            border: `1px solid ${borderColor}`,
                                        }}
                                    >
                                        {q.first_choice}
                                    </TableCell>

                                    <TableCell
                                        style={{
                                            textAlign: "center",
                                            border: `1px solid ${borderColor}`,
                                        }}
                                    >
                                        {q.second_choice}
                                    </TableCell>

                                    <TableCell
                                        style={{
                                            textAlign: "center",
                                            border: `1px solid ${borderColor}`,
                                        }}
                                    >
                                        {q.third_choice}
                                    </TableCell>

                                    <TableCell
                                        style={{
                                            textAlign: "center",
                                            border: `1px solid ${borderColor}`,
                                        }}
                                    >
                                        {q.fourth_choice}
                                    </TableCell>

                                    <TableCell
                                        style={{
                                            textAlign: "center",
                                            border: `1px solid ${borderColor}`,
                                        }}
                                    >
                                        {q.fifth_choice}
                                    </TableCell>

                                    <TableCell
                                        style={{
                                            textAlign: "center",
                                            border: `1px solid ${borderColor}`,
                                        }}
                                    >
                                        <Box
                                            sx={{
                                                display: "flex",
                                                gap: 1,
                                                justifyContent: "center",
                                                flexWrap: "wrap",
                                            }}
                                        >
                                            <Button
                                                sx={{
                                                    backgroundColor: "green",
                                                    color: "white",
                                                    borderRadius: "5px",
                                                    padding: "8px 14px",
                                                    minWidth: "100px",
                                                    display: "flex",
                                                    alignItems: "center",
                                                    justifyContent: "center",
                                                    gap: "5px",
                                                    "&:hover": {
                                                        backgroundColor: "#006400",
                                                    },
                                                }}
                                                onClick={() => handleEdit(q)}
                                            >
                                                <EditIcon fontSize="small" />
                                                Edit
                                            </Button>

                                            <Button
                                                variant="contained"
                                                sx={{
                                                    backgroundColor: "#9E0000",
                                                    color: "white",
                                                    borderRadius: "5px",
                                                    padding: "8px 14px",
                                                    minWidth: "100px",
                                                    display: "flex",
                                                    alignItems: "center",
                                                    justifyContent: "center",
                                                    gap: "5px",
                                                }}
                                                onClick={() => handleDeleteQuestion(q)}

                                            >
                                                <DeleteIcon fontSize="small" />
                                                Delete
                                            </Button>
                                        </Box>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={10} align="center">
                                    No questions found
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>
            <Dialog
                open={openDialog}
                onClose={handleCloseDialog}
                fullWidth
                maxWidth="sm"
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
                        fontSize: "1.1rem",
                        py: 2,
                        mb: 2
                    }}
                >
                    {editMode ? "Edit Question" : "Add New Question"}
                </DialogTitle>

                {/* CONTENT */}
                <DialogContent sx={{ p: 3 }}>
                    <Stack spacing={2}>
                        <Typography
                            variant="subtitle1"
                            fontWeight={700}
                            sx={{ mb: 1, mt: 1 }}
                        >
                            Question Category:
                        </Typography>
                        <FormControl fullWidth size="small">
                            <InputLabel>Select Category</InputLabel>
                            <Select
                                name="category"
                                value={formData.category}
                                label="Select Category"
                                onChange={handleChange}
                            >
                                {categories.map((cat) => (
                                    <MenuItem key={cat.id} value={cat.id}>
                                        {cat.title}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <Typography
                            variant="subtitle1"
                            fontWeight={700}
                            sx={{ mb: 1, mt: 1 }}
                        >
                            Question Description:
                        </Typography>
                        <TextField size="small" label="Question Description" name="question" value={formData.question} onChange={handleChange} fullWidth />
                        <Typography
                            variant="subtitle1"
                            fontWeight={700}
                            sx={{ mb: 1, mt: 1 }}
                        >
                            Choice 1:
                        </Typography>
                        <TextField size="small" label="Choice 1" name="choice1" value={formData.choice1} onChange={handleChange} fullWidth />
                        <Typography
                            variant="subtitle1"
                            fontWeight={700}
                            sx={{ mb: 1, mt: 1 }}
                        >
                            Choice 2:
                        </Typography>
                        <TextField size="small" label="Choice 2" name="choice2" value={formData.choice2} onChange={handleChange} fullWidth />
                        <Typography
                            variant="subtitle1"
                            fontWeight={700}
                            sx={{ mb: 1, mt: 1 }}
                        >
                            Choice 3:
                        </Typography>
                        <TextField size="small" label="Choice 3" name="choice3" value={formData.choice3} onChange={handleChange} fullWidth />
                        <Typography
                            variant="subtitle1"
                            fontWeight={700}
                            sx={{ mb: 1, mt: 1 }}
                        >
                            Choice 4:
                        </Typography>
                        <TextField size="small" label="Choice 4" name="choice4" value={formData.choice4} onChange={handleChange} fullWidth />
                        <Typography
                            variant="subtitle1"
                            fontWeight={700}
                            sx={{ mb: 1, mt: 1 }}
                        >
                            Choice 5:
                        </Typography>
                        <TextField size="small" label="Choice 5" name="choice5" value={formData.choice5} onChange={handleChange} fullWidth />
                    </Stack>
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
                        sx={{ textTransform: "none", fontWeight: 600 }}
                        onClick={handleCloseDialog}
                    >
                        Cancel
                    </Button>

                    <Button
                        variant="contained"
                        sx={{ px: 4, fontWeight: 600, textTransform: "none" }}
                        onClick={handleSaveQuestion}
                    >
                        <SaveIcon fontSize="small" style={{ marginRight: 6 }} />
                        Save
                    </Button>
                </DialogActions>
            </Dialog>
            <Dialog
                open={reuseDialogOpen}
                onClose={() => setReuseDialogOpen(false)}
                fullWidth
                maxWidth="sm"
            >
                <DialogTitle
                    sx={{
                        background: headerColor,
                        color: "#fff",
                        fontWeight: 700,
                        fontSize: "1.1rem",
                        py: 2,
                        mb: 2
                    }}
                >
                    Reuse Evaluation Questions
                </DialogTitle>
                <DialogContent sx={{ p: 3 }}>
                    <Stack spacing={2}>
                        <Alert severity="info">
                            This will reuse all questions from the currently filtered school year and semester into the target semester.
                        </Alert>
                        <Typography fontWeight={700}>
                            Questions to Reuse ({filteredQuestion.length}):
                        </Typography>
                        <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 260 }}>
                            <Table size="small" stickyHeader>
                                <TableHead>
                                    <TableRow>
                                        <TableCell sx={{ fontWeight: 700, width: 56 }}>#</TableCell>
                                        <TableCell sx={{ fontWeight: 700 }}>Question</TableCell>
                                        <TableCell sx={{ fontWeight: 700, width: 120 }}>Category</TableCell>
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
                                    {filteredQuestion.length > 0 ? (
                                        filteredQuestion.map((question, index) => (
                                            <TableRow key={`${question.school_year}-${question.question_id}`}>
                                                <TableCell>{index + 1}</TableCell>
                                                <TableCell>{question.question_description}</TableCell>
                                                <TableCell>{question.category}</TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={3} align="center">
                                                No questions found for the selected source filter.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </TableContainer>
                        <Typography fontWeight={700}>
                            Target School Year:
                        </Typography>
                        <FormControl fullWidth size="small">
                            <InputLabel>Target School Year</InputLabel>
                            <Select
                                label="Target School Year"
                                value={reuseTargetSchoolYear}
                                onChange={(e) => setReuseTargetSchoolYear(e.target.value)}
                            >
                                {recentSchoolYears.map((sy) => (
                                    <MenuItem value={sy.year_id} key={sy.year_id}>
                                        {sy.current_year} - {sy.next_year}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <Typography fontWeight={700}>
                            Target Semester:
                        </Typography>
                        <FormControl fullWidth size="small">
                            <InputLabel>Target Semester</InputLabel>
                            <Select
                                label="Target Semester"
                                value={reuseTargetSchoolSemester}
                                onChange={(e) => setReuseTargetSchoolSemester(e.target.value)}
                            >
                                {schoolSemester.map((sem) => (
                                    <MenuItem value={sem.semester_id} key={sem.semester_id}>
                                        {sem.semester_description}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Stack>
                </DialogContent>
                <DialogActions sx={{ px: 3, py: 2, borderTop: "1px solid #e0e0e0" }}>
                    <Button color="error" variant="outlined" onClick={() => setReuseDialogOpen(false)}>
                        Cancel
                    </Button>
                    <Button variant="contained" onClick={handleReuseQuestions} disabled={filteredQuestion.length === 0}>
                        Reuse
                    </Button>
                </DialogActions>
            </Dialog>
            <Dialog
                open={categoryDialogOpen}
                onClose={handleCategoryDialogClose}
                fullWidth
                maxWidth="sm"
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
                        fontSize: "1.1rem",
                        py: 2,
                        mb: 2
                    }}
                >
                    {categoryEditMode ? "Edit Category" : "Add New Category"}
                </DialogTitle>

                {/* CONTENT */}
                <DialogContent sx={{ p: 3 }}>
                    <Stack spacing={2}>
                        <Typography
                            variant="subtitle1"
                            fontWeight={700}
                            sx={{ mb: 1, mt: 1 }}
                        >
                            Title:
                        </Typography>
                        <TextField
                            size="small"
                            label="Title"
                            name="title"
                            value={categoryFormData.title}
                            onChange={handleCategoryChange}
                            fullWidth
                        />
                        <Typography
                            variant="subtitle1"
                            fontWeight={700}
                            sx={{ mb: 1, mt: 1 }}
                        >
                            Description:
                        </Typography>
                        <TextField
                            size="small"
                            label="Description"
                            name="description"
                            value={categoryFormData.description}
                            onChange={handleCategoryChange}
                            fullWidth
                        />
                    </Stack>
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
                        sx={{ textTransform: "none", fontWeight: 600 }}
                        onClick={handleCategoryDialogClose}
                    >
                        Cancel
                    </Button>

                    <Button
                        variant="contained"
                        sx={{ px: 4, fontWeight: 600, textTransform: "none" }}
                        onClick={handleSaveCategory}
                    >
                        <SaveIcon fontSize="small" style={{ marginRight: 6 }} />
                        Save
                    </Button>
                </DialogActions>
            </Dialog>
            <Snackbar
                open={openSnackbar}
                autoHideDuration={3000}
                onClose={() => setOpenSnackbar(false)}
                anchorOrigin={{ vertical: "top", horizontal: "center" }}
            >
                <Alert severity="success" sx={{ width: "100%" }}>
                    {snackbarMessage}
                </Alert>
            </Snackbar>


            {/* Delete Category Dialog */}
            <Dialog
                open={openDeleteCategoryDialog}
                onClose={() => { setOpenDeleteCategoryDialog(false); setCategoryToDelete(null); }}
                maxWidth="xs"
                fullWidth
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
                    Delete Category
                </DialogTitle>

                <DialogContent sx={{ p: 3, mt: 2 }}>
                    <Typography sx={{ mb: 2 }}>
                        Are you sure you want to delete the category{" "}
                        <strong>{categoryToDelete?.title}</strong>?
                    </Typography>

                    <Typography sx={{ color: "#d32f2f", fontSize: "0.95rem" }}>
                        Deleting this category will permanently remove it from the system.
                        <br />
                        All evaluation questions currently linked to this category may
                        be affected.
                    </Typography>
                </DialogContent>

                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button
                        variant="outlined"
                        color="error"
                        onClick={() => { setOpenDeleteCategoryDialog(false); setCategoryToDelete(null); }}
                    >
                        Cancel
                    </Button>
                    <Button
                        variant="contained"
                        color="error"
                        onClick={handleConfirmDeleteCategory}
                    >
                        Yes, Delete
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Delete Question Dialog */}
            <Dialog
                open={openDeleteQuestionDialog}
                onClose={() => { setOpenDeleteQuestionDialog(false); setQuestionToDelete(null); }}
                maxWidth="xs"
                fullWidth
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
                    Delete Question
                </DialogTitle>

                <DialogContent sx={{ p: 3, mt: 2 }}>
                    <Typography sx={{ mb: 2 }}>
                        Are you sure you want to delete this question?
                    </Typography>

                    <Typography sx={{ color: "#d32f2f", fontSize: "0.95rem" }}>
                        Deleting this question will permanently remove it from the system.
                        <br />
                        Any evaluation results or reports that reference this question may
                        no longer display correctly.
                    </Typography>
                </DialogContent>

                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button
                        variant="outlined"
                        color="error"
                        onClick={() => { setOpenDeleteQuestionDialog(false); setQuestionToDelete(null); }}
                    >
                        Cancel
                    </Button>
                    <Button
                        variant="contained"
                        color="error"
                        onClick={handleConfirmDeleteQuestion}
                    >
                        Yes, Delete
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}

export default EvaluationCrud;

