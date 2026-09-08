import React, { useState, useEffect, useContext, useRef } from "react";
import { SettingsContext } from "../App";
import axios from "axios";
import {
  Box,
  TextField,
  Typography,
  Card,
  Table,
  TableHead,
  TableBody,
  TableCell,
  TableRow,
  TableContainer,
  Paper,
  Snackbar,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  Button,
  FormControl,
  Select,
  MenuItem,
} from "@mui/material";
import '../styles/Print.css'
import CertificateOfRegistration from '../components/CORForScholarship';
import EaristLogo from "../assets/EaristLogo.png";
import SearchIcon from "@mui/icons-material/Search";
import ListAltIcon from "@mui/icons-material/ListAlt";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import GradeIcon from "@mui/icons-material/Grade";
import SchoolIcon from "@mui/icons-material/School";
import { useNavigate } from "react-router-dom";
import API_BASE_URL from "../apiConfig";

import UploadFileIcon from '@mui/icons-material/UploadFile';
import Unauthorized from "../components/Unauthorized";
import LoadingOverlay from "../components/LoadingOverlay";
import { getFlatAuditHeaders } from "../utils/auditEvents";
import useAuditMac from "../utils/useAuditMac";

const cleanSuggestionValue = (value) => {
  if (value === null || value === undefined) return "";
  const text = String(value).trim();
  return ["null", "undefined"].includes(text.toLowerCase()) ? "" : text;
};

const formatStudentSuggestionName = (student) =>
  [
    cleanSuggestionValue(student?.last_name),
    cleanSuggestionValue(student?.first_name),
    cleanSuggestionValue(student?.middle_name),
    cleanSuggestionValue(student?.extension),
  ]
    .filter(Boolean)
    .join(" ");

const getStudentSuggestionText = (student) =>
  [
    student?.student_number,
    student?.last_name,
    student?.first_name,
    student?.middle_name,
    student?.extension,
    student?.program_code,
    student?.program_description,
    student?.major,
  ]
    .map(cleanSuggestionValue)
    .join(" ")
    .toLowerCase();

const StudentScholarshipList = () => {
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
  const [branches, setBranches] = useState([]);

  useEffect(() => {
    if (!settings) return;

    // 🎨 Colors
    if (colors.title) setTitleColor(colors.title);
    if (colors.subtitle) setSubtitleColor(colors.subtitle);
    if (colors.border) setBorderColor(colors.border);
    if (colors.mainButton) setMainButtonColor(colors.mainButton);
    if (colors.subButton) setSubButtonColor(colors.subButton);
    if (colors.stepper) setStepperColor(colors.stepper);

    // 🏫 Logo
    if (assets.logoUrl) {
      setFetchedLogo(assets.logoUrl);
    } else {
      setFetchedLogo(EaristLogo);
    }

    // 🏷️ School Info
    if (branding.companyName) setCompanyName(branding.companyName);
    if (branding.shortTerm) setShortTerm(branding.shortTerm);
    if (branding.campusAddress) setCampusAddress(branding.campusAddress);

    // ✅ Branches (JSON stored in DB)
    setBranches(settings?.branches || []);


  }, [settings]);

  // Also put it at the very top
  const [userID, setUserID] = useState("");
  const [user, setUser] = useState("");
  const [userRole, setUserRole] = useState("");

  const [hasAccess, setHasAccess] = useState(null);
  const [loading, setLoading] = useState(false);
  const pageId = 129;

  const [employeeID, setEmployeeID] = useState("");
  const [accessDescription, setAccessDescription] = useState("");

  const getAuditHeaders = () => ({
    ...getFlatAuditHeaders(),
    "Content-Type": "application/json",
    "x-employee-id": employeeID || localStorage.getItem("employee_id") || "",
    "x-page-id": pageId,
    "x-audit-actor-id": employeeID || localStorage.getItem("employee_id") || "",
    "x-audit-actor-role":
      accessDescription ||
      localStorage.getItem("access_description") ||
      userRole ||
      localStorage.getItem("role") ||
      "registrar",
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
        const userAccessDescription = response.data.access_description || "";
        setAccessDescription(userAccessDescription);
        if (userAccessDescription) {
          localStorage.setItem("access_description", userAccessDescription);
        }
        setHasAccess(true);
      } else {
        setHasAccess(false);
      }
    } catch (error) {
      console.error('Error checking access:', error);
      setHasAccess(false);
      if (error.response && error.response.data.message) {
        console.log(error.response.data.message);
      } else {
        console.log("An unexpected error occurred.");
      }
      setLoading(false);
    }
  };



  const navigate = useNavigate();

  const [activeStep, setActiveStep] = useState(3);
  const [clickedSteps, setClickedSteps] = useState([]);

  const tabs1 = [
    { label: "Student Records", to: "/student_list", icon: <ListAltIcon /> },
    { label: "Applicant Form", to: "/readmission_dashboard1", icon: <PersonAddIcon /> },
    { label: "Submitted Documents", to: "/submitted_documents", icon: <UploadFileIcon /> },
    { label: "Search Certificate of Registration", to: "/search_cor", icon: <ListAltIcon /> },
    { label: "Report of Grades", to: "/report_of_grades", icon: <GradeIcon /> },
    { label: "Transcript of Records", to: "/transcript_of_records", icon: <SchoolIcon /> },
  ];

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentData, setStudentData] = useState([]);
  const [studentDetails, setStudentDetails] = useState([]);
  const [notAssignedStudents, setNotAssignedStudents] = useState([]);
  const [notAssignedLoading, setNotAssignedLoading] = useState(false);
  const [refreshNotAssignedKey, setRefreshNotAssignedKey] = useState(0);
  const [openCorModal, setOpenCorModal] = useState(false);
  const [selectedCorStudentNumber, setSelectedCorStudentNumber] = useState("");
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState("info");
  const showSnackbar = (message, severity = "info") => {
    setSnackbarMessage(message);
    setSnackbarSeverity(severity);
    setOpenSnackbar(true);
  };
  const handleCloseSnackbar = (_, reason) => {
    if (reason === "clickaway") return;
    setOpenSnackbar(false);
  };

  useEffect(() => {
    if (!searchQuery || searchQuery.length < 9) {
      setSelectedStudent(null);
      setStudentData([]);
      return;
    }

    const fetchStudent = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/program_evaluation/${searchQuery}`);
        const data = await res.json();


        if (data) {
          setSelectedStudent(data);
          setStudentData(data);

          if (searchQuery) {
            localStorage.setItem("admin_edit_person_id", searchQuery);
          }

          const detailsRes = await fetch(`${API_BASE_URL}/api/program_evaluation/details/${searchQuery}`);
          const detailsData = await detailsRes.json();
          if (Array.isArray(detailsData) && detailsData.length > 0) {
            setStudentDetails(detailsData);
          } else {
            setStudentDetails([]);
            showSnackbar("No enrolled subjects found for this student.");
          }
        } else {
          setSelectedStudent(null);
          setStudentData([]);
          setStudentDetails([]);
          showSnackbar("No student data found.");
        }
      } catch (err) {
        console.error("Error fetching student", err);
        localStorage.removeItem("admin_edit_person_id");
        showSnackbar("Server error. Please try again.", "error");
      }
    };

    fetchStudent();
  }, [searchQuery]);


  const handleStepClick = (index, to) => {
    setActiveStep(index);

    const pid = localStorage.getItem("admin_edit_person_id");
    console.log(pid);
    if (pid && pid !== "undefined" && pid !== "null" && pid.length >= 9) {
      navigate(`${to}?student_number=${pid}`);
    } else {
      navigate(to);
    }
  };

  useEffect(() => {
    const storedId = localStorage.getItem("admin_edit_person_id");

    if (storedId && storedId !== "undefined" && storedId !== "null" && storedId.length >= 9) {
      setSearchQuery(storedId);
    }
  }, []);

  const [studentNumber, setStudentNumber] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [debouncedStudentNumber, setDebouncedStudentNumber] = useState("");
  const [page, setPage] = useState(1);
  const rowsPerPage = 20;

  const divToPrintRef = useRef();
  const [pdfLoading, setPdfLoading] = useState(false);

  const handleGeneratePdf = async () => {
    if (!divToPrintRef.current || pdfLoading) return;

    setPdfLoading(true);

    try {
      const html = `
      <html>
        <head>
          <link rel="stylesheet" href="${window.location.origin}/styles/Print.css" />
        </head>
        <body>
          ${divToPrintRef.current.innerHTML}
        </body>
      </html>
    `;

      const res = await fetch(`${API_BASE_URL}/api/generate-cor-pdf`, {
        method: "POST",
        headers: getAuditHeaders(),
        body: JSON.stringify({ html, student_number: studentNumber || searchQuery }),
      });

      if (!res.ok) throw new Error("PDF failed");

      const blob = await res.blob();

      const url = window.URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = "certificate_of_registration.pdf";
      a.click();

      window.URL.revokeObjectURL(url);

    } catch (err) {
      console.error(err);
      alert("PDF failed");
    }

    setPdfLoading(false);
  };

  useEffect(() => {
    if (studentNumber.trim().length >= 9) { // adjust min length if needed
      const delayDebounce = setTimeout(() => {
        setDebouncedStudentNumber(studentNumber);
      }, 500); // half-second debounce

      return () => clearTimeout(delayDebounce);
    }
  }, [studentNumber]);

  useEffect(() => {
    if (studentNumber) {
      localStorage.removeItem("studentNumberForCOR");
    }
  }, [studentNumber]);

  useEffect(() => {
    const fetchNotAssignedStudents = async () => {
      setNotAssignedLoading(true);
      try {
        const response = await axios.get(`${API_BASE_URL}/api/not_assigned`);
        setNotAssignedStudents(Array.isArray(response.data) ? response.data : []);
      } catch (error) {
        console.error("Failed to fetch not assigned students:", error);
        showSnackbar("Failed to load not assigned students.", "error");
      } finally {
        setNotAssignedLoading(false);
      }
    };

    fetchNotAssignedStudents();
  }, [refreshNotAssignedKey]);

  useEffect(() => {
    setPage(1);
  }, [notAssignedStudents.length, studentNumber]);

  const normalizedSearch = studentNumber.trim().toLowerCase();
  const filteredNotAssignedStudents = normalizedSearch
    ? notAssignedStudents.filter((student) => {
      const searchableText = [
        student.student_number,
        student.last_name,
        student.first_name,
        student.middle_name,
        student.extension,
        student.program_code,
        student.program_description,
        student.major,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchableText.includes(normalizedSearch);
    })
    : notAssignedStudents;

  const totalPages = Math.max(
    1,
    Math.ceil(filteredNotAssignedStudents.length / rowsPerPage),
  );

  const paginatedNotAssignedStudents = filteredNotAssignedStudents.slice(
    (page - 1) * rowsPerPage,
    page * rowsPerPage,
  );
  const searchSuggestions = normalizedSearch.length >= 2
    ? notAssignedStudents
      .filter((student) =>
        getStudentSuggestionText(student).includes(normalizedSearch),
      )
      .slice(0, 10)
    : [];
  const showSearchSuggestions = searchFocused && normalizedSearch.length >= 2;

  const paginationButtonStyles = {
    minWidth: 70,
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
  };

  const paginationSelectStyles = {
    fontSize: "12px",
    height: 36,
    color: "white",
    border: "1px solid white",
    backgroundColor: "transparent",
    ".MuiOutlinedInput-notchedOutline": { borderColor: "white" },
    "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "white" },
    "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: "white" },
    "& svg": { color: "white" },
  };

  const handleOpenCorModal = (studentNumberValue) => {
    setSelectedCorStudentNumber(studentNumberValue);
    setOpenCorModal(true);
  };

  const handleSelectSuggestion = (student) => {
    setStudentNumber(student.student_number || "");
    setPage(1);
    setSearchFocused(false);
    handleOpenCorModal(student.student_number);
  };

  const handleCloseCorModal = () => {
    setOpenCorModal(false);
    setSelectedCorStudentNumber("");
  };

  const handleCorSaved = (savedInfo = {}) => {
    setRefreshNotAssignedKey((prev) => prev + 1);
    handleCloseCorModal();
    const paymentType =
      savedInfo.type === "unifast" ? "UNIFAST" : "Matriculation";
    showSnackbar(
      `Student payment was saved successfully to ${paymentType}.`,
      "success",
    );
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
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",

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
          ASSIGN STUDENT SCHOLARSHIP
        </Typography>

        <Box sx={{ position: "relative", width: 450, maxWidth: "100%" }}>
          <TextField
            variant="outlined"
            placeholder="Search Student Number / Name / Program / Major"
            size="small"
            value={studentNumber}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setTimeout(() => setSearchFocused(false), 150)}
            onChange={(e) => {
              setStudentNumber(e.target.value);
              setPage(1);
              setSearchFocused(true);
            }}
            sx={{
              width: "100%",
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
          {showSearchSuggestions && (
            <Box
              onMouseDown={(event) => event.preventDefault()}
              sx={{
                position: "absolute",
                top: "calc(100% + 4px)",
                left: 0,
                right: 0,
                zIndex: 20,
                backgroundColor: "#fff",
                border: "1px solid #d0d0d0",
                borderRadius: "8px",
                boxShadow: "0 8px 24px rgba(0,0,0,0.14)",
                overflow: "hidden",
                maxHeight: 320,
              }}
            >
              {searchSuggestions.length > 0 ? (
                searchSuggestions.map((student) => {
                  const studentNumberValue = cleanSuggestionValue(
                    student?.student_number,
                  );
                  const name = formatStudentSuggestionName(student);
                  const program = cleanSuggestionValue(
                    student?.program_code || student?.program_description,
                  );

                  return (
                    <Box
                      key={`${studentNumberValue}-${student?.program_code || student?.major}`}
                      onMouseDown={(event) => {
                        event.preventDefault();
                        handleSelectSuggestion(student);
                      }}
                      sx={{
                        px: 2,
                        py: 1,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                        fontSize: 14,
                        borderBottom: "1px solid #f0f0f0",
                        "&:hover": { backgroundColor: "#f5f7fb" },
                      }}
                    >
                      <Typography sx={{ fontSize: 14, fontWeight: 700 }}>
                        {studentNumberValue || "No number"}
                      </Typography>
                      <Typography sx={{ fontSize: 14, color: "#555" }}>
                        |
                      </Typography>
                      <Typography sx={{ fontSize: 14 }} noWrap>
                        {[name || "Unnamed Student", program, student?.major]
                          .filter(Boolean)
                          .join(" - ")}
                      </Typography>
                    </Box>
                  );
                })
              ) : (
                <Box sx={{ px: 2, py: 1.25, fontSize: 13, color: "#666" }}>
                  No matching students found
                </Box>
              )}
            </Box>
          )}
        </Box>
      </Box>

      <hr style={{ border: "1px solid #ccc", width: "100%" }} />
      <br />
      <br />



      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead >
            <TableRow>
              <TableCell
                colSpan={8}
                sx={{
                  border: `1px solid ${borderColor}`,
                  py: 0.5,
                  backgroundColor: headerColor,
                  color: "white",
                  height: "60px",
                }}
              >
                <Box
                  display="flex"
                  justifyContent="space-between"
                  alignItems="center"
                  flexWrap="wrap"
                  sx={{ px: 1 }}
                >
                  <Typography fontSize="14px" fontWeight="bold" color="white">
                    Total Student's Records: {filteredNotAssignedStudents.length}
                  </Typography>

                  <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
                    <Button
                      onClick={() => setPage(1)}
                      disabled={page === 1}
                      variant="outlined"
                      size="small"
                      sx={paginationButtonStyles}
                    >
                      First
                    </Button>

                    <Button
                      onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                      disabled={page === 1}
                      variant="outlined"
                      size="small"
                      sx={paginationButtonStyles}
                    >
                      Prev
                    </Button>

                    <FormControl size="small" sx={{ minWidth: 80 }}>
                      <Select
                        value={page}
                        onChange={(e) => setPage(Number(e.target.value))}
                        displayEmpty
                        sx={paginationSelectStyles}
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
                      onClick={() =>
                        setPage((prev) => Math.min(prev + 1, totalPages))
                      }
                      disabled={page === totalPages}
                      variant="outlined"
                      size="small"
                      sx={paginationButtonStyles}
                    >
                      Next
                    </Button>

                    <Button
                      onClick={() => setPage(totalPages)}
                      disabled={page === totalPages}
                      variant="outlined"
                      size="small"
                      sx={paginationButtonStyles}
                    >
                      Last
                    </Button>
                  </Box>
                </Box>
              </TableCell>
            </TableRow>
            <TableRow >
              <TableCell sx={{
                border: `1px solid ${borderColor}`,
                padding: "10px",
                color: "black",
                textAlign: "center",
                backgroundColor: "#f5f5f5",
              }}
              >Student Number</TableCell>
              <TableCell sx={{
                border: `1px solid ${borderColor}`,
                padding: "10px",
                color: "black",
                textAlign: "center",
                backgroundColor: "#f5f5f5",
              }}
              >Last Name</TableCell>
              <TableCell sx={{
                border: `1px solid ${borderColor}`,
                padding: "10px",
                color: "black",
                textAlign: "center",
                backgroundColor: "#f5f5f5",
              }}
              >First Name</TableCell>
              <TableCell sx={{
                border: `1px solid ${borderColor}`,
                padding: "10px",
                color: "black",
                textAlign: "center",
                backgroundColor: "#f5f5f5",
              }}
              > Middle Name</TableCell>
              <TableCell sx={{
                border: `1px solid ${borderColor}`,
                padding: "10px",
                color: "black",
                textAlign: "center",
                backgroundColor: "#f5f5f5",
              }}
              >Extension</TableCell>
              <TableCell sx={{
                border: `1px solid ${borderColor}`,
                padding: "10px",
                color: "black",
                textAlign: "center",
                backgroundColor: "#f5f5f5",
              }}
              >Program Code</TableCell>
              <TableCell sx={{
                border: `1px solid ${borderColor}`,
                padding: "10px",
                color: "black",
                textAlign: "center",
                backgroundColor: "#f5f5f5",
              }}
              >Program Descriptio</TableCell>
              <TableCell sx={{
                border: `1px solid ${borderColor}`,
                padding: "10px",
                color: "black",
                textAlign: "center",
                backgroundColor: "#f5f5f5",
              }}
              >Major</TableCell>
            </TableRow>
          </TableHead>

          <TableBody
            sx={{
              border: `1px solid ${borderColor}`,
              "& .MuiTableRow-root:nth-of-type(odd)": {
                backgroundColor: "#ffffff",
              },
              "& .MuiTableRow-root:nth-of-type(even)": {
                backgroundColor: "#f5f5f5",
              },
            }}
          >
            {!notAssignedLoading && filteredNotAssignedStudents.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  {studentNumber
                    ? "No students match your search."
                    : "No not-assigned students found."}
                </TableCell>
              </TableRow>
            )}

            {paginatedNotAssignedStudents.map((student) => (
              <TableRow key={student.student_number} hover>
                <TableCell sx={{ border: `1px solid ${borderColor}` }}>
                  <Button
                    variant="text"
                    onClick={() => handleOpenCorModal(student.student_number)}
                    sx={{ textTransform: "none", p: 0, minWidth: 0 }}
                  >
                    {student.student_number}
                  </Button>
                </TableCell>
                <TableCell sx={{ border: `1px solid ${borderColor}` }}>{student.last_name || "-"}</TableCell>
                <TableCell sx={{ border: `1px solid ${borderColor}` }}>{student.first_name || "-"}</TableCell>
                <TableCell sx={{ border: `1px solid ${borderColor}` }}>{student.middle_name || "-"}</TableCell>
                <TableCell sx={{ border: `1px solid ${borderColor}` }}>{student.extension || "-"}</TableCell>
                <TableCell sx={{ border: `1px solid ${borderColor}` }}>{student.program_code || "-"}</TableCell>
                <TableCell sx={{ border: `1px solid ${borderColor}` }}>{student.program_description || "-"}</TableCell>
                <TableCell sx={{ border: `1px solid ${borderColor}` }}>{student.major || "-"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>


      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead >
            <TableRow>
              <TableCell
                colSpan={8}
                sx={{
                  border: `1px solid ${borderColor}`,
                  py: 0.5,
                  backgroundColor: headerColor,
                  color: "white",
                  height: "60px",
                }}
              >
                <Box
                  display="flex"
                  justifyContent="space-between"
                  alignItems="center"
                  flexWrap="wrap"
                  sx={{ px: 1 }}
                >
                  <Typography fontSize="14px" fontWeight="bold" color="white">
                    Total Student's Records: {filteredNotAssignedStudents.length}
                  </Typography>

                  <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
                    <Button
                      onClick={() => setPage(1)}
                      disabled={page === 1}
                      variant="outlined"
                      size="small"
                      sx={paginationButtonStyles}
                    >
                      First
                    </Button>

                    <Button
                      onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                      disabled={page === 1}
                      variant="outlined"
                      size="small"
                      sx={paginationButtonStyles}
                    >
                      Prev
                    </Button>

                    <FormControl size="small" sx={{ minWidth: 80 }}>
                      <Select
                        value={page}
                        onChange={(e) => setPage(Number(e.target.value))}
                        displayEmpty
                        sx={paginationSelectStyles}
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
                      onClick={() =>
                        setPage((prev) => Math.min(prev + 1, totalPages))
                      }
                      disabled={page === totalPages}
                      variant="outlined"
                      size="small"
                      sx={paginationButtonStyles}
                    >
                      Next
                    </Button>

                    <Button
                      onClick={() => setPage(totalPages)}
                      disabled={page === totalPages}
                      variant="outlined"
                      size="small"
                      sx={paginationButtonStyles}
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

      
      <Dialog
        open={openCorModal}
        onClose={handleCloseCorModal}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          Certificate of Registration - {selectedCorStudentNumber}
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ marginTop: "4rem" }}>
            {selectedCorStudentNumber && (
              <CertificateOfRegistration
                student_number={selectedCorStudentNumber}
                onSaved={handleCorSaved}
              />
            )}
          </Box>
        </DialogContent>
      </Dialog>


      <Snackbar
        open={openSnackbar}
        autoHideDuration={4000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbarSeverity}
          variant="filled"
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default StudentScholarshipList;
