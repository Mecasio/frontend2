import React, { useState, useEffect, useContext, useRef } from "react";
import { SettingsContext } from "../App";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  Paper,
  TableHead,
  TableRow,
  Avatar,
  FormControl,
  InputLabel,
  Stack,
  Select,
  Grid,
  MenuItem,
} from "@mui/material";
import { Add, Search, SortByAlpha, FileDownload } from "@mui/icons-material";
import axios from "axios";
import Unauthorized from "../components/Unauthorized";
import LoadingOverlay from "../components/LoadingOverlay";
import SearchIcon from "@mui/icons-material/Search";
import Snackbar from "@mui/material/Snackbar";
import Alert from "@mui/material/Alert";
import API_BASE_URL from "../apiConfig";
import EaristLogo from "../assets/EaristLogo.png";
import { getAuditConfig } from "../utils/auditEvents";
import useAccountAuditMac from "./useAccountAuditMac";
import * as XLSX from "xlsx";
import LockResetIcon from "@mui/icons-material/LockReset";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import ImageIcon from "@mui/icons-material/Image";
import SaveIcon from '@mui/icons-material/Save';
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import PrintIcon from "@mui/icons-material/Print";
import SendIcon from "@mui/icons-material/Send";
import AddCircleIcon from "@mui/icons-material/AddCircle";

const cleanSuggestionValue = (value) => {
  if (value === null || value === undefined) return "";
  const text = String(value).trim();
  return ["null", "undefined"].includes(text.toLowerCase()) ? "" : text;
};

const getFacultySuggestionText = (prof) =>
  [
    prof?.employeeNumber,
    prof?.employee_id,
    prof?.firstName,
    prof?.first_name,
    prof?.middleName,
    prof?.middle_name,
    prof?.lastName,
    prof?.last_name,
    prof?.email,
    prof?.dprtmnt_name,
  ]
    .map(cleanSuggestionValue)
    .join(" ")
    .toLowerCase();

const getFacultySuggestionValue = (prof) =>
  cleanSuggestionValue(prof?.email) ||
  cleanSuggestionValue(prof?.employeeNumber) ||
  cleanSuggestionValue(prof?.employee_id);

const RegisterProf = () => {
  useAccountAuditMac();
  const getAuditRequestConfig = (overrides = {}) => getAuditConfig(overrides);
  const settings = useContext(SettingsContext);
  const colors = settings?.colors || {};
  const branding = settings?.branding || {};
  const assets = settings?.assets || {};
  const headerColor = colors.header || "#1976d2";

  const [titleColor, setTitleColor] = useState("#000000");
  const [subtitleColor, setSubtitleColor] = useState("#555555");
  const [borderColor, setBorderColor] = useState("#000000");
  const [mainButtonColor, setMainButtonColor] = useState("#1976d2");
  const [subButtonColor, setSubButtonColor] = useState("#ffffff"); // ✅ NEW
  const [stepperColor, setStepperColor] = useState("#000000"); // ✅ NEW

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
    if (colors.mainButton)
      setMainButtonColor(colors.mainButton);
    if (colors.subButton) setSubButtonColor(colors.subButton);
    if (colors.stepper) setStepperColor(colors.stepper);

    // 🏫 Logo
    if (assets.logoUrl) {
      setFetchedLogo(`${assets.logoUrl}`);
    } else {
      setFetchedLogo(EaristLogo);
    }

    // 🏷️ School Info
    if (branding.companyName) setCompanyName(branding.companyName);
    if (branding.shortTerm) setShortTerm(branding.shortTerm);

    // ✅ Branches (JSON stored in DB)
    setBranches(settings?.branches || []);
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


  const pageId = 70;

  const [employeeID, setEmployeeID] = useState("");
  const permissionHeaders = {
    headers: {
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

  const [studentPhoto, setStudentPhoto] = useState(null);
  const [studentPhotoPreview, setStudentPhotoPreview] = useState("");

  const handleStudentPhotoChange = (e) => {
    const file = e.target.files?.[0] || null;
    setStudentPhoto(file);
    setStudentPhotoPreview(file ? URL.createObjectURL(file) : "");
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


  const [searchQuery, setSearchQuery] = useState("");
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [sortAsc, setSortAsc] = useState(true);
  const [professors, setProfessors] = useState([]);
  const [department, setDepartment] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [editData, setEditData] = useState(null);
  const [profToDelete, setProfToDelete] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);


  const [form, setForm] = useState({
    employee_id: "",
    fname: "",
    mname: "",
    lname: "",
    email: "",
    password: "",
    role: "faculty",
    dprtmnt_id: "",
    status: 1,
    profileImage: null,
    preview: "", // ✅ for image preview
  });

  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState("success"); // success | error | info | warning

  const printFacultySlip = (prof, password, email) => {
    const resolvedCampusAddress =
      campusAddress || "No address set in Settings";

    const logoSrc = fetchedLogo || EaristLogo;
    const name = companyName?.trim() || "";

    const words = name.split(" ");
    const middleIndex = Math.ceil(words.length / 2);
    const firstLine = words.slice(0, middleIndex).join(" ");
    const secondLine = words.slice(middleIndex).join(" ");

    const printWindow = window.open("", "_blank");

    printWindow.document.write(`
    <html>
      <head>
        <title>Faculty Account Slip</title>
        <style>
          @page { size: A5 portrait; margin: 8mm; }

          body { font-family: Arial; margin: 0; }

          .print-container { padding: 10px; }

          .header-top {
            display: flex;
            justify-content: center;
            align-items: center;
            gap: 12px;
          }

          .header-top img {
            width: 65px;
            height: 65px;
            border-radius: 50%;
          }

          .school-name {
            font-size: 15px;
            font-weight: bold;
          }

          .title {
            text-align: center;
            margin-top: 15px;
            font-size: 18px;
            font-weight: bold;
          }

          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 15px;
            border: 1.5px solid black;
          }

          th, td {
            border: 1.5px solid black;
            padding: 8px;
            font-size: 13px;
          }

          th {
            background: lightgray;
            width: 35%;
          }

          .password-box {
            margin-top: 20px;
            border: 2px dashed black;
            padding: 15px;
            text-align: center;
          }

          .password {
            font-size: 22px;
            font-weight: bold;
            color: red;
            letter-spacing: 2px;
          }

          .footer-note {
            margin-top: 15px;
            text-align: center;
            font-size: 12px;
          }
        </style>
      </head>

      <body onload="window.print(); setTimeout(() => window.close(), 100);">
        <div class="print-container">

          <div class="header-top">
            <img src="${logoSrc}" />
            <div>
              <div style="font-size:11px;">Republic of the Philippines</div>
              <div class="school-name">${firstLine}</div>
              ${secondLine ? `<div class="school-name">${secondLine}</div>` : ""}
              <div style="font-size:11px;">${resolvedCampusAddress}</div>
            </div>
          </div>

          <div class="title">Faculty Portal Account Slip</div>

          <table>
            <tr>
              <th>Employee ID</th>
              <td>${prof.employee_id || ""}</td>
            </tr>
            <tr>
              <th>Last Name</th>
              <td>${prof.lname || ""}</td>
            </tr>
            <tr>
              <th>First Name</th>
              <td>${prof.fname || ""}</td>
            </tr>
            <tr>
              <th>Middle Name</th>
              <td>${prof.mname || ""}</td>
            </tr>
            <tr>
              <th>Email</th>
              <td>${email}</td>
            </tr>
            <tr>
              <th>Username</th>
              <td>${email} / ${prof.employee_id}</td>
            </tr>
          </table>

          <div class="password-box">
            <div>Generated Password</div>
            <div class="password">${password}</div>
          </div>

          <div class="footer-note">
            Please change password after first login.
          </div>

        </div>
      </body>
    </html>
  `);

    printWindow.document.close();
  };

  const fetchProfessors = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/professors`);

      console.log("Fetched Professors:", res.data); // 👈 check what backend returns

      if (Array.isArray(res.data)) {
        setProfessors(res.data);
      } else if (res.data?.data && Array.isArray(res.data.data)) {
        // some backends wrap results in a `data` property
        setProfessors(res.data.data);
      } else {
        console.warn("Unexpected professors response:", res.data);
      }
    } catch (err) {
      console.error("Fetch error:", err);
    }
  };


  const fetchDepartments = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/get_department`);
      setDepartment(res.data);
      console.log(res.data);
    } catch (err) {
      console.error("Fetch error:", err);
    }
  };

  useEffect(() => {
    fetchProfessors();
    fetchDepartments();
  }, []);

  const [selectedDepartmentFilter, setSelectedDepartmentFilter] = useState("");


  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [sortOrder, setSortOrder] = useState("");

  const normalizeDepartmentId = (value) => {
    if (value === null || value === undefined) return "";
    return String(value);
  };

  const filteredProfessors = React.useMemo(() => {
    return professors
      .filter((p) => {
        // Search filter
        const fullText = `${p.fname || ""} ${p.mname || ""} ${p.lname || ""} ${p.email || ""}`.toLowerCase();
        const matchesSearch = fullText.includes(searchQuery);
        const selectedDepartment = normalizeDepartmentId(selectedDepartmentFilter);
        const professorDepartment = normalizeDepartmentId(p.dprtmnt_id);

        // Department filter
        const matchesDepartment =
          selectedDepartment === "" ||                  // All departments
          (selectedDepartment === "unassigned" && professorDepartment === "") || // Unassigned
          professorDepartment === selectedDepartment;          // Matches specific department

        return matchesSearch && matchesDepartment;
      })
      .sort((a, b) => {
        // Sorting by full name
        const nameA = `${a.fname} ${a.lname}`.toLowerCase();
        const nameB = `${b.fname} ${b.lname}`.toLowerCase();
        if (sortOrder === "asc") return nameA.localeCompare(nameB);
        if (sortOrder === "desc") return nameB.localeCompare(nameA);
        return 0;
      });
  }, [professors, searchQuery, selectedDepartmentFilter, sortOrder]);
  const professorSuggestions =
    searchQuery.trim().length >= 2
      ? professors
          .filter((prof) =>
            getFacultySuggestionText(prof).includes(searchQuery.trim().toLowerCase()),
          )
          .slice(0, 10)
      : [];



  const totalPages = Math.ceil(filteredProfessors.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentProfessors = filteredProfessors.slice(indexOfFirstItem, indexOfLastItem);

  const maxButtonsToShow = 5;
  let startPage = Math.max(1, currentPage - Math.floor(maxButtonsToShow / 2));
  let endPage = Math.min(totalPages, startPage + maxButtonsToShow - 1);

  if (endPage - startPage < maxButtonsToShow - 1) {
    startPage = Math.max(1, endPage - maxButtonsToShow + 1);
  }

  const visiblePages = [];
  for (let i = startPage; i <= endPage; i++) {
    visiblePages.push(i);
  }



  const handleExportCSV = async () => {
    const headers = ["Employee ID", "Full Name", "Email", "Role", "Status"];
    const rows = currentProfessors.map((p) => [
      p.employee_id,
      `${p.fname} ${p.mname || ""} ${p.lname}`,
      p.email,
      p.role,
      p.status === 1 ? "Active" : "Inactive",
    ]);
    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");

    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    const fileName = "professors.csv";

    try {
      await axios.post(
        `${API_BASE_URL}/api/professors/export-audit`,
        {
          exported_count: currentProfessors.length,
          file_name: fileName,
        },
        permissionHeaders,
      );
    } catch (err) {
      console.error("Professor export audit failed:", err);
    }

    link.setAttribute("download", fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleChange = (e) => {
    if (e.target.name === "profileImage") {
      const file = e.target.files?.[0] || null;
      setForm({
        ...form,
        profileImage: file,
        preview: file ? URL.createObjectURL(file) : "",
      });
    } else {
      setForm({ ...form, [e.target.name]: e.target.value });
    }
  };

  const handleSelect = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // ✅ Sends the typed/generated password to the professor's email using the
  //    existing /api/send_faculty_password_reminder backend route.
  const sendFacultyPasswordEmail = async (employeeId, email, password) => {
    try {
      await axios.post(`${API_BASE_URL}/api/send_faculty_password_reminder`, {
        employee_id: employeeId,
        email,
        password,
      });
      return true;
    } catch (err) {
      console.error("Failed to send faculty password email:", err);
      return false;
    }
  };

  // 💾 SAVE — persists the professor record (and status) only. It no longer
  //    auto-emails the password; use the "Send" button for that (mirrors
  //    the Student Accounts modal workflow).
  const handleSubmit = async (e, options = {}) => {
    const { silent = false } = options;
    if (e && typeof e.preventDefault === "function") e.preventDefault();

    const requiredFields = ["fname", "lname", "email"];

    // Only required when creating a new professor
    if (!editData) {
      requiredFields.push("password", "employee_id");
    }

    const missing = requiredFields.filter((key) => !form[key]);
    if (missing.length > 0) {
      if (!silent) {
        setSnackbarMessage(`Please fill out required fields: ${missing.join(", ")}`);
        setSnackbarSeverity("warning");
        setOpenSnackbar(true);
      }
      return false;
    }

    if (editData && !canEdit) {
      setSnackbarMessage("You do not have permission to edit professors.");
      setSnackbarSeverity("error");
      setOpenSnackbar(true);
      return false;
    }

    if (!editData && !canCreate) {
      setSnackbarMessage("You do not have permission to create professors.");
      setSnackbarSeverity("error");
      setOpenSnackbar(true);
      return false;
    }

    const formData = new FormData();

    Object.entries(form).forEach(([key, value]) => {
      // 💡 If editing and password is empty → DO NOT send it
      if (editData && key === "password" && value === "") return;

      if (key === "preview") return;
      if (value !== null && value !== undefined && value !== "") formData.append(key, value);
    });

    try {
      let response;
      if (editData) {
        response = await axios.put(
          `${API_BASE_URL}/api/update_prof/${editData.prof_id}`,
          formData,
          permissionHeaders,
        );
      } else {
        response = await axios.post(
          `${API_BASE_URL}/api/register_prof`,
          formData,
          permissionHeaders,
        );
      }

      if (response.data?.success === false) {
        setSnackbarMessage(response.data?.error || "Failed to save professor.");
        setSnackbarSeverity("error");
        setOpenSnackbar(true);
        return false;
      }

      // 🔘 Status (Active/Inactive) is now set from inside the modal —
      //    persist it via the existing status endpoint when editing.
      if (editData) {
        try {
          await axios.put(
            `${API_BASE_URL}/api/update_prof_status/${editData.prof_id}`,
            { status: Number(form.status) },
            permissionHeaders,
          );
        } catch (statusErr) {
          console.error("Status update failed:", statusErr);
        }
      }

      if (!silent) {
        setSnackbarMessage(
          editData ? "Professor updated successfully!" : "Professor registered successfully!",
        );
        setSnackbarSeverity("success");
        setOpenSnackbar(true);
      }

      setTimeout(() => {
        fetchProfessors();
      }, 500);

      return true;
    } catch (err) {
      console.error("Submit Error:", err);
      if (!silent) {
        setSnackbarMessage(err.response?.data?.error || "An error occurred");
        setSnackbarSeverity("error");
        setOpenSnackbar(true);
      }
      return false;
    }
  };

  // 📧 SEND — saves the record silently (so the latest password/status is
  //    persisted) and then emails the faculty their login credentials.
  //    Mirrors handleNotify on the Student Accounts page.
  const handleSendNotification = async () => {
    if (!form.password.trim()) {
      setSnackbarMessage("Please generate or type a password first");
      setSnackbarSeverity("warning");
      setOpenSnackbar(true);
      return;
    }

    if (!form.email.trim()) {
      setSnackbarMessage("Email address is required");
      setSnackbarSeverity("warning");
      setOpenSnackbar(true);
      return;
    }

    const saved = await handleSubmit(null, { silent: true });
    if (!saved) return;

    const emailSent = await sendFacultyPasswordEmail(
      form.employee_id,
      form.email,
      form.password,
    );

    setSnackbarMessage(
      emailSent ? "Password email sent!" : "Failed to send password email.",
    );
    setSnackbarSeverity(emailSent ? "success" : "error");
    setOpenSnackbar(true);

    printFacultySlip(form, form.password, form.email);
  };


  const handleEdit = (prof) => {
    if (!canEdit) {
      setSnackbarMessage("You do not have permission to edit professors.");
      setSnackbarSeverity("error");
      setOpenSnackbar(true);
      return;
    }

    setEditData(prof);
    setForm({
      employee_id: prof.employee_id || "",
      fname: prof.fname,
      mname: prof.mname || "",
      lname: prof.lname,
      email: prof.email,
      password: "", // empty means optional
      role: prof.role || "faculty",
      dprtmnt_id: prof.dprtmnt_id || "",
      status: prof.status === 0 ? 0 : 1,
      profileImage: null,
      preview: prof.profile_image ? `${API_BASE_URL}/uploads/Faculty1by1/${prof.profile_image}` : "",
    });
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setShowPassword(false);
    setEditData(null);
    setForm({
      employee_id: "",
      fname: "",
      mname: "",
      lname: "",
      email: "",
      password: "",
      role: "faculty",
      dprtmnt_id: "",
      status: 1,
      profileImage: null,
      preview: "",
    });
  };

  const handleDeleteClick = (prof) => {
    if (!canDelete) {
      setSnackbarMessage("You do not have permission to delete this item");
      setSnackbarSeverity("error");
      setOpenSnackbar(true);
      return;
    }

    setProfToDelete(prof);
    setOpenDeleteDialog(true);
  };

  const handleDeleteConfirm = async () => {
    if (!profToDelete) return;

    try {
      await axios.delete(
        `${API_BASE_URL}/api/delete_prof/${profToDelete.prof_id}`,
        permissionHeaders,
      );

      setSnackbarMessage("Professor deleted successfully!");
      setSnackbarSeverity("success");
      setOpenSnackbar(true);
      setOpenDeleteDialog(false);
      setProfToDelete(null);
      fetchProfessors();
    } catch (err) {
      console.error("Delete professor failed:", err);
      setSnackbarMessage(
        err.response?.data?.error ||
        err.response?.data?.message ||
        "Failed to delete professor",
      );
      setSnackbarSeverity("error");
      setOpenSnackbar(true);
    }
  };

  const [selectedFile, setSelectedFile] = useState(null);
  const [importedCredentials, setImportedCredentials] = useState([]);
  const [openImportResultDialog, setOpenImportResultDialog] = useState(false);

  const handleFileSelect = (e) => {
    setSelectedFile(e.target.files?.[0] || null);
  };

  const normalizeImportHeader = (value) =>
    String(value ?? "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");

  const getImportCell = (row, headerMap, headerNames, fallbackIndexes = []) => {
    for (const headerName of headerNames) {
      const index = headerMap[normalizeImportHeader(headerName)];
      if (index !== undefined && row[index] !== undefined && String(row[index]).trim() !== "") {
        return String(row[index]).trim();
      }
    }

    for (const index of fallbackIndexes) {
      if (row[index] !== undefined && String(row[index]).trim() !== "") {
        return String(row[index]).trim();
      }
    }

    return "";
  };

  const parseImportedFullName = (fullName) => {
    const text = String(fullName || "").trim();
    if (!text) return { firstName: "", middleName: "", lastName: "" };

    if (text.includes(",")) {
      const [lastName = "", rest = ""] = text.split(",").map((part) => part.trim());
      const parts = rest.split(/\s+/).filter(Boolean);
      return {
        firstName: parts.shift() || "",
        middleName: parts.join(" "),
        lastName,
      };
    }

    const parts = text.split(/\s+/).filter(Boolean);
    if (parts.length === 1) {
      return { firstName: parts[0], middleName: "", lastName: "" };
    }

    return {
      firstName: parts.shift() || "",
      middleName: parts.length > 1 ? parts.slice(0, -1).join(" ") : "",
      lastName: parts.pop() || "",
    };
  };

  const handleImportClick = async () => {
    if (!selectedFile) {
      setSnackbarMessage("Please select a file first");
      setSnackbarSeverity("warning");
      setOpenSnackbar(true);
      return;
    }

    if (!canCreate) {
      setSnackbarMessage("You do not have permission to import professors.");
      setSnackbarSeverity("error");
      setOpenSnackbar(true);
      return;
    }

    try {
      const data = await selectedFile.arrayBuffer();

      const workbook = XLSX.read(data);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];

      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
      const headerRow = rows[0] || [];
      const headerMap = headerRow.reduce((acc, header, index) => {
        const key = normalizeImportHeader(header);
        if (key) acc[key] = index;
        return acc;
      }, {});

      const professors = rows
        .slice(1)
        .map((row) => {
          const fullName = getImportCell(row, headerMap, ["Full Name", "Name"], [1]);
          const parsedName = parseImportedFullName(fullName);
          const hasSplitNameHeaders =
            headerMap[normalizeImportHeader("First Name")] !== undefined ||
            headerMap[normalizeImportHeader("Last Name")] !== undefined ||
            headerMap[normalizeImportHeader("Surname")] !== undefined;
          const fallbackNameIndexes = hasSplitNameHeaders ? [1, 2, 3] : [];

          return {
            employeeNumber: getImportCell(
              row,
              headerMap,
              ["Employee ID", "Employee Number", "Employee No", "Person ID"],
              [0],
            ),
            firstName:
              getImportCell(row, headerMap, ["First Name", "Firstname", "Given Name"], fallbackNameIndexes.slice(0, 1)) ||
              parsedName.firstName,
            middleName:
              getImportCell(row, headerMap, ["Middle Name", "Middlename"], fallbackNameIndexes.slice(1, 2)) ||
              parsedName.middleName,
            lastName:
              getImportCell(row, headerMap, ["Last Name", "Lastname", "Surname"], fallbackNameIndexes.slice(2, 3)) ||
              parsedName.lastName,
            email: getImportCell(row, headerMap, ["Email", "Email Address"], [4, 5]),
            departmentId: getImportCell(row, headerMap, ["Department ID", "Department"], []),
            departmentCode: getImportCell(row, headerMap, ["Department Code"], []),
            departmentName: getImportCell(row, headerMap, ["Department Name"], []),
          };
        })
        .filter((prof) => prof.employeeNumber || prof.firstName || prof.lastName || prof.email);

      if (professors.length === 0) {
        setSnackbarMessage("No professor rows were found in the selected file.");
        setSnackbarSeverity("warning");
        setOpenSnackbar(true);
        return;
      }

      const res = await axios.post(`${API_BASE_URL}/api/import_professors`, {
        professors,
      }, permissionHeaders);

      const importedCount = Number(res.data?.importedCount || 0);
      const skippedCount = Number(res.data?.skippedCount || 0);
      const generatedCredentials = Array.isArray(res.data?.imported) ? res.data.imported : [];
      setSnackbarMessage(
        `Imported ${importedCount} professor(s). Skipped ${skippedCount}. Temporary passwords were generated.`,
      );
      setSnackbarSeverity(importedCount > 0 ? "success" : "warning");
      setOpenSnackbar(true);
      setImportedCredentials(generatedCredentials);
      setOpenImportResultDialog(generatedCredentials.length > 0);
      setSelectedFile(null);
      fetchProfessors();
    } catch (err) {
      console.error("Import professors failed:", err);
      setSnackbarMessage(
        err.response?.data?.message ||
        err.response?.data?.error ||
        "Failed to import professors.",
      );
      setSnackbarSeverity("error");
      setOpenSnackbar(true);
    }
  };




  const handleGeneratePassword = () => {
    const newPassword = generatePassword(10);

    setForm((prev) => ({
      ...prev,
      password: newPassword,
    }));

    setSnackbarMessage("Password generated!");
    setSnackbarSeverity("info");
    setOpenSnackbar(true);
  };

  const generatePassword = (length = 10) => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let password = "";

    for (let i = 0; i < length; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    return password;
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




      {/* Top header: DOCUMENTS SUBMITTED + Search + Import */}
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
          FACULTY ACCOUNTS
        </Typography>


        <Box sx={{ position: "relative", width: 450, maxWidth: "100%" }}>
          <TextField
            variant="outlined"
            placeholder="Search by name or email"
            size="small"
            name="professor_account_search"
            autoComplete="new-password"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value.toLowerCase());
              setCurrentPage(1);
              setSuggestionsOpen(true);
            }}
            onFocus={() => {
              if (searchQuery.trim().length >= 2) setSuggestionsOpen(true);
            }}
            onBlur={() => {
              setTimeout(() => setSuggestionsOpen(false), 150);
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
              autoComplete: "new-password",
            }}
          />
          {suggestionsOpen && searchQuery.trim().length >= 2 && (
            <Box sx={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 20, backgroundColor: "#fff", border: "1px solid #d0d0d0", borderRadius: "8px", boxShadow: "0 8px 24px rgba(0,0,0,0.14)", overflow: "hidden", maxHeight: 320 }}>
              {professorSuggestions.length > 0 ? professorSuggestions.map((prof) => {
                const employeeId = cleanSuggestionValue(prof.employeeNumber || prof.employee_id);
                const name = [prof.firstName || prof.first_name, prof.middleName || prof.middle_name, prof.lastName || prof.last_name].map(cleanSuggestionValue).filter(Boolean).join(" ");
                return (
                  <Box key={`${employeeId}-${prof.email}`} onMouseDown={(e) => { e.preventDefault(); setSearchQuery(getFacultySuggestionValue(prof).toLowerCase()); setCurrentPage(1); setSuggestionsOpen(false); }} sx={{ px: 2, py: 1, cursor: "pointer", display: "flex", alignItems: "center", gap: 1, fontSize: 14, borderBottom: "1px solid #f0f0f0", "&:hover": { backgroundColor: "#f5f7fb" } }}>
                    <Typography sx={{ fontSize: 14, fontWeight: 700 }}>{employeeId || "N/A"}</Typography>
                    <Typography sx={{ fontSize: 14, color: "#555" }}>|</Typography>
                    <Typography sx={{ fontSize: 14 }} noWrap>{name || cleanSuggestionValue(prof.email) || "Unnamed Faculty"}</Typography>
                  </Box>
                );
              }) : (
                <Box sx={{ px: 2, py: 1.25, fontSize: 13, color: "#666" }}>No matching faculty found</Box>
              )}
            </Box>
          )}
        </Box>



      </Box>

      <hr style={{ border: "1px solid #ccc", width: "100%" }} />
      <br />
      <br />

      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", mb: 2 }}>


        <TableContainer component={Paper} sx={{ width: '100%' }}>
          <Table size="small">
            <TableHead sx={{ backgroundColor: '#6D2323', color: "white" }}>
              <TableRow>
                <TableCell
                  colSpan={10}
                  sx={{
                    border: `1px solid ${borderColor}`,
                    py: 0.5,
                    backgroundColor: headerColor || "#1976d2",
                    color: "white"
                  }}
                >
                  <Box display="flex" justifyContent="space-between" alignItems="center" >
                    {/* Left: Applicant List Count */}
                    <Typography fontSize="14px" fontWeight="bold" color="white">
                      Total Faculty's Records': {filteredProfessors.length}
                    </Typography>

                    {/* Right: Pagination Controls */}
                    <Box display="flex" alignItems="center" gap={1}>
                      {/* First & Prev */}
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

                      {/* Next & Last */}
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
            mb: -2,
          }}
        >
          <Table>
            <TableBody>
              <TableRow>
                <TableCell>
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between", // left vs right
                      alignItems: "center",
                      flexWrap: "wrap",
                      gap: 2,
                    }}
                  >
                    {/* Left: Add Professor */}
                    <Button
                      startIcon={<Add />}
                      variant="contained"
                      onClick={() => {
                        setEditData(null);
                        setSearchQuery("");
                        setForm((prev) => ({
                          ...prev,
                          employee_id: "",
                          fname: "",
                          mname: "",
                          lname: "",
                          email: "",
                          password: "",
                          role: "faculty",
                          dprtmnt_id: "",
                          status: 1,
                          profileImage: null,
                          preview: "",
                        }));
                        setTimeout(() => setOpenDialog(true), 0);
                      }}

                      sx={{
                        backgroundColor: "default",
                        color: "white",
                        textTransform: "none",
                        fontWeight: "bold",
                        width: "350px",

                      }}
                    >
                      Add Professor
                    </Button>

                    {/* Right: Filter, Sort, Export */}
                    <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
                      {/* Department Filter */}
                      <FormControl sx={{ width: "350px" }} size="small">
                        <InputLabel id="filter-department-label">Filter by Department</InputLabel>
                        <Select
                          labelId="filter-department-label"
                          value={selectedDepartmentFilter}
                          onChange={(e) => setSelectedDepartmentFilter(e.target.value)}
                          label="Filter by Department"
                        >
                          <MenuItem value="">All Departments</MenuItem>
                          {department.map((dep) => (
                            <MenuItem key={dep.dprtmnt_id} value={String(dep.dprtmnt_id)}>
                              {dep.dprtmnt_name} ({dep.dprtmnt_code})
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>


                      <FormControl size="small" sx={{ width: "200px" }}>
                        <Select
                          value={sortOrder}
                          onChange={(e) => setSortOrder(e.target.value)}
                          displayEmpty
                        >
                          <MenuItem value="">Select Order</MenuItem>
                          <MenuItem value="asc">Ascending</MenuItem>
                          <MenuItem value="desc">Descending</MenuItem>
                        </Select>
                      </FormControl>


                      {/* Export */}
                      <Button
                        variant="outlined"
                        startIcon={<FileDownload />}
                        onClick={handleExportCSV}
                        sx={{
                          borderColor: "#800000",
                          color: "#800000",
                          textTransform: "none",
                          fontWeight: "bold",
                          "&:hover": { borderColor: "#a52a2a", color: "#a52a2a" },
                        }}
                      >
                        Export CSV
                      </Button>


                    </Box>

                    <Box display="flex" gap={2}>
                      {/* SELECT FILE */}
                      <Button
                        variant="outlined"
                        component="label"
                      >
                        Select File
                        <input
                          hidden
                          type="file"
                          accept=".csv,.xls,.xlsx"
                          onChange={handleFileSelect}
                        />
                      </Button>

                      {selectedFile && (
                        <Typography variant="body2" mt={1}>
                          Selected: {selectedFile.name}
                        </Typography>
                      )}

                      {/* IMPORT BUTTON */}
                      <Button
                        variant="contained"
                        color="primary"
                        onClick={handleImportClick}
                        disabled={!selectedFile}
                      >
                        Import
                      </Button>
                    </Box>
                  </Box>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>


      </Box>
      <TableContainer component={Paper} sx={{ width: "100%", border: `1px solid ${borderColor}`, }}>
        <Table>
          <TableHead sx={{
            backgroundColor: headerColor || "#1976d2",

          }}>
            <TableRow

            >
              <TableCell
                sx={{
                  color: "white",
                  fontWeight: "bold",
                  textAlign: "center",
                  border: `1px solid ${borderColor}`,
                  border: `1px solid ${borderColor}`,
                }}
              >
                EMPLOYEE ID
              </TableCell>
              <TableCell
                sx={{
                  color: "white",
                  fontWeight: "bold",
                  textAlign: "center",
                  border: `1px solid ${borderColor}`,
                }}
              >
                Image
              </TableCell>
              <TableCell
                sx={{
                  color: "white",
                  fontWeight: "bold",
                  textAlign: "center",
                  border: `1px solid ${borderColor}`,
                }}
              >
                Full Name
              </TableCell>
              <TableCell
                sx={{
                  color: "white",
                  fontWeight: "bold",
                  textAlign: "center",
                  border: `1px solid ${borderColor}`,
                }}
              >
                Email
              </TableCell>
              <TableCell
                sx={{
                  color: "white",
                  fontWeight: "bold",
                  textAlign: "center",
                  border: `1px solid ${borderColor}`,
                }}
              >
                Department
              </TableCell>
              <TableCell
                sx={{
                  color: "white",
                  fontWeight: "bold",
                  textAlign: "center",
                  border: `1px solid ${borderColor}`,
                }}
              >
                Position
              </TableCell>
              <TableCell
                sx={{
                  color: "white",
                  fontWeight: "bold",
                  textAlign: "center",
                  border: `1px solid ${borderColor}`,

                }}
              >
                Status
              </TableCell>
              <TableCell
                sx={{
                  color: "white",
                  fontWeight: "bold",
                  textAlign: "center",
                  border: `1px solid ${borderColor}`,

                }}
              >
                Actions
              </TableCell>

            </TableRow>
          </TableHead>

          <TableBody>


            {currentProfessors.map((prof, i) => (
              <TableRow key={prof.prof_id}

                sx={{
                  backgroundColor: i % 2 === 0 ? "#ffffff" : "lightgray",
                }}>
                <TableCell sx={{ border: `1px solid ${borderColor}`, border: `1px solid ${borderColor}`, }}>{prof.employee_id || ""}</TableCell>
                <TableCell
                  sx={{
                    border: `1px solid ${borderColor}`,
                    textAlign: "center",
                  }}
                >
                  <Avatar
                    src={
                      prof.profile_image
                        ? `${API_BASE_URL}/uploads/Faculty1by1/${prof.profile_image}`
                        : undefined
                    }
                    alt={prof.fname}
                    sx={{
                      width: 60,
                      height: 60,
                      margin: "auto",
                      border: `1px solid ${borderColor}`,
                      bgcolor: prof.profile_picture ? "transparent" : "#6D2323",
                    }}
                  >
                    {prof.fname?.[0]}
                  </Avatar>
                </TableCell>
                <TableCell sx={{ border: `1px solid ${borderColor}` }}>{`${prof.fname} ${prof.mname || ""} ${prof.lname}`}</TableCell>
                <TableCell sx={{ border: `1px solid ${borderColor}` }}>{prof.email}</TableCell>
                <TableCell sx={{ border: `1px solid ${borderColor}` }}>{prof.dprtmnt_name} ({prof.dprtmnt_code})</TableCell>
                <TableCell sx={{ border: `1px solid ${borderColor}`, textAlign: "center" }}>{prof.role}</TableCell>
                <TableCell
                  sx={{ border: `1px solid ${borderColor}`, textAlign: "center" }}
                >
                  {Number(prof.status) === 1 ? "Active" : "Inactive"}
                </TableCell>
                <TableCell sx={{ border: `1px solid ${borderColor}`, textAlign: "center" }}>

                  <Box sx={{ display: "flex", justifyContent: "center", gap: 1, flexWrap: "wrap" }}>
                    <Button
                      onClick={() => handleEdit(prof)}
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
                    >
                      <EditIcon fontSize="small" /> Edit
                    </Button>
                    {canDelete && (
                      <Button
                        onClick={() => handleDeleteClick(prof)}
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
                      >
                        <DeleteIcon fontSize="small" /> Delete
                      </Button>
                    )}
                  </Box>
                </TableCell>


              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
            <TableContainer component={Paper} sx={{ width: '100%' }}>
          <Table size="small">
            <TableHead sx={{ backgroundColor: '#6D2323', color: "white" }}>
              <TableRow>
                <TableCell
                  colSpan={10}
                  sx={{
                    border: `1px solid ${borderColor}`,
                    py: 0.5,
                    backgroundColor: headerColor || "#1976d2",
                    color: "white"
                  }}
                >
                  <Box display="flex" justifyContent="space-between" alignItems="center" >
                    {/* Left: Applicant List Count */}
                    <Typography fontSize="14px" fontWeight="bold" color="white">
                      Total Faculty's Records': {filteredProfessors.length}
                    </Typography>

                    {/* Right: Pagination Controls */}
                    <Box display="flex" alignItems="center" gap={1}>
                      {/* First & Prev */}
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

                      {/* Next & Last */}
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

      <Dialog
        open={openDialog}
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 3, overflow: "hidden", boxShadow: 6 }
        }}
      >
        {/* HEADER */}
        <DialogTitle
          sx={{
            background: headerColor || "#1976d2",
            color: "#fff",
            fontWeight: 700,
            fontSize: "1.1rem",
            py: 2
          }}
        >
          FACULTY REGISTRATION
        </DialogTitle>

        <DialogContent sx={{ p: 3 }}>

          <Box display="flex" flexDirection="column" alignItems="center" mb={3} mt={3}>
            <Box position="relative" component="label" sx={{ cursor: "pointer", display: "inline-flex" }}>
              <Avatar
                src={form.preview}
                sx={{
                  width: 110,
                  height: 110,
                  border: "1.5px solid black",
                  boxShadow: "0 2px 8px rgba(0,0,0,.15)",
                }}
              >
                {!form.preview && <ImageIcon sx={{ fontSize: 40, color: "#999" }} />}
              </Avatar>

              <label
                htmlFor="prof-avatar-upload"
                style={{
                  position: "absolute",
                  bottom: 2,
                  right: 2,
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  background: "white",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  boxShadow: "0 1px 4px rgba(0,0,0,.3)",
                }}
              >
                <AddCircleIcon sx={{ fontSize: 26, color: mainButtonColor }} />
              </label>

              <input
                hidden
                id="prof-avatar-upload"
                type="file"
                name="profileImage"
                accept="image/*"
                onChange={handleChange}
              />
            </Box>

            <Typography variant="caption" color="text.secondary" mt={1}>
              Click to upload 2x2 profile picture
            </Typography>
          </Box>

          <Typography fontWeight={700} mt={2} mb={2}>
            Faculty Information
          </Typography>

          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                label="Employee ID"
                fullWidth
                name="employee_id"
                value={form.employee_id}
                onChange={handleChange}
                autoComplete="new-password"
                InputProps={{ readOnly: Boolean(editData) }}
              />
            </Grid>

            <Grid item xs={6}>
              <TextField
                label="First Name"
                fullWidth
                name="fname"
                value={form.fname}
                onChange={handleChange}
                autoComplete="new-password"
              />
            </Grid>

            <Grid item xs={6}>
              <TextField
                label="Last Name"
                fullWidth
                name="lname"
                value={form.lname}
                onChange={handleChange}
                autoComplete="new-password"
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                label="Middle Name"
                fullWidth
                name="mname"
                value={form.mname}
                onChange={handleChange}
                autoComplete="new-password"
              />
            </Grid>
          </Grid>

          <Typography fontWeight={700} mt={3} mb={2}>
            Account Details
          </Typography>

          <TextField
            label="Email"
            fullWidth
            value={form.email}
            name="email"
            onChange={handleChange}
            autoComplete="new-password"
            sx={{ mb: 2 }}
          />

          <TextField
            label={editData ? "New Password (leave blank to keep current)" : "Password"}
            fullWidth
            name="password"
            value={form.password}
            onChange={handleChange}
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            helperText="Generate a password or type one here before saving."
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton onClick={() => setShowPassword((p) => !p)} edge="end" size="small">
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />

          {form.password && (
            <Box
              mt={3}
              p={3}
              sx={{ border: "2px dashed #1976d2", borderRadius: 2, textAlign: "center", backgroundColor: "#f9f9f9" }}
            >
              <Typography variant="h6" gutterBottom>
                Generated Password
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: "bold", letterSpacing: 2, color: "#d32f2f" }}>
                {form.password}
              </Typography>
              <Typography variant="body2" mt={1}>
                Please print or save this password.
              </Typography>
            </Box>
          )}

          <FormControl fullWidth margin="dense" sx={{ mt: 3 }}>
            <InputLabel>Department</InputLabel>
            <Select
              name="dprtmnt_id"
              value={form.dprtmnt_id}
              onChange={handleSelect}
              label="Department"
            >
              <MenuItem value="">
                <em>No Department</em>
              </MenuItem>

              {department.map((dep) => (
                <MenuItem key={dep.dprtmnt_id} value={dep.dprtmnt_id}>
                  {dep.dprtmnt_name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* ✅ Status now lives inside the modal instead of the table */}
          {editData && (
            <FormControl fullWidth margin="dense" sx={{ mt: 3 }}>
              <InputLabel>Status</InputLabel>
              <Select
                name="status"
                value={form.status}
                onChange={handleSelect}
                label="Status"
              >
                <MenuItem value={1}>Active</MenuItem>
                <MenuItem value={0}>Inactive</MenuItem>
              </Select>
            </FormControl>
          )}




        </DialogContent>

        {/* ACTIONS — same layout as the Student Accounts modal:
            Cancel on the left, Generate / Print / Save / Send on the right */}
        <DialogActions
          sx={{
            px: 3,
            py: 2,
            borderTop: "1px solid #e0e0e0",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            backgroundColor: "#fafafa",
          }}
        >
          <Button
            onClick={handleCloseDialog}
            color="error"
            variant="outlined"
          >
            Cancel
          </Button>

          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              flexWrap: "nowrap",
            }}
          >
            <Button
              variant="outlined"
              size="small"
              startIcon={<LockResetIcon />}
              onClick={handleGeneratePassword}
              sx={{ fontWeight: 600 }}
            >
              Generate
            </Button>

            <Button
              variant="outlined"
              size="small"
              startIcon={<PrintIcon />}
              disabled={!form.password}
              onClick={() =>
                printFacultySlip(form, form.password, form.email)
              }
              sx={{ fontWeight: 600 }}
            >
              Print
            </Button>

            <Button
              variant="contained"
              size="small"
              startIcon={<SaveIcon />}
              disabled={!form.email}
              onClick={() => handleSubmit()}
              sx={{
                fontWeight: 700,
                px: 2.5,

              }}
            >
              Save
            </Button>

            <Button
              variant="contained"
              size="small"
              startIcon={<SendIcon />}
              disabled={!form.password || !form.email}
              onClick={handleSendNotification}
              sx={{
                fontWeight: 700,
                px: 2.5,
              }}
            >
              Send Email
            </Button>
          </Box>
        </DialogActions>
      </Dialog>

      <Dialog
        open={openDeleteDialog}
        onClose={() => { setOpenDeleteDialog(false); setProfToDelete(null); }}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3, overflow: "hidden", boxShadow: 6 } }}
      >
        <DialogTitle
          sx={{
            background: headerColor || "#9E0000",
            color: "#fff",
            fontWeight: 700,
            fontSize: "1.2rem",
            py: 2,
          }}
        >
          Delete Professor
        </DialogTitle>

        <DialogContent sx={{ p: 3, mt: 2 }}>
          <Typography sx={{ mb: 2 }}>
            Are you sure you want to delete professor{" "}
            <strong>
              {profToDelete ? `${profToDelete.fname || ""} ${profToDelete.lname || ""}` : ""}
            </strong>?
          </Typography>

          <Typography sx={{ color: "#d32f2f", fontSize: "0.95rem" }}>
            Deleting this professor will permanently remove them from the system.
            <br />
            All related schedules and assignments linked to this professor
            may be affected.
          </Typography>
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2, borderTop: "1px solid #e0e0e0" }}>
          <Button
            onClick={() => { setOpenDeleteDialog(false); setProfToDelete(null); }}
            color="error"
            variant="outlined"
          >
            Cancel
          </Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained">
            Yes, Delete
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={openImportResultDialog}
        onClose={() => setOpenImportResultDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ backgroundColor: headerColor || "#1976d2", color: "#fff" }}>
          Imported Faculty Temporary Passwords
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <TableContainer component={Paper} sx={{ mt: 1 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Employee ID</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Temporary Password</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {importedCredentials.map((credential) => (
                  <TableRow key={`${credential.employee_id}-${credential.email}`}>
                    <TableCell>{credential.employee_id}</TableCell>
                    <TableCell>{credential.email}</TableCell>
                    <TableCell>{credential.password}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        <DialogActions>
          <Button
            variant="contained"
            onClick={() => setOpenImportResultDialog(false)}
          >
            Done
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={openSnackbar}
        autoHideDuration={3000}
        onClose={() => setOpenSnackbar(false)}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert severity={snackbarSeverity} sx={{ width: "100%" }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>

  );
};

export default RegisterProf;
