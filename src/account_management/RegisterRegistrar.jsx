import React, { useState, useEffect, useContext, useRef } from "react";
import { SettingsContext } from "../App";
import axios from "axios";
import {
  Box,
  TextField,
  Button,
  Typography,
  Avatar,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Snackbar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  Paper,
  TableHead,
  TableRow,
  Alert,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Chip,
  Checkbox,
  FormControlLabel,
  Autocomplete
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import Unauthorized from "../components/Unauthorized";
import LoadingOverlay from "../components/LoadingOverlay";
import API_BASE_URL from "../apiConfig";
import EaristLogo from "../assets/EaristLogo.png";
import { getAuditConfig } from "../utils/auditEvents";
import useAccountAuditMac from "./useAccountAuditMac";
import SaveIcon from "@mui/icons-material/Save";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import SearchIcon from "@mui/icons-material/Search";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import { refreshRegistrarCurriculumId } from "../utils/registrarCurriculumRestriction";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import PrintIcon from "@mui/icons-material/Print";
import SendIcon from "@mui/icons-material/Send";
import AddCircleIcon from "@mui/icons-material/AddCircle";
import LockResetIcon from "@mui/icons-material/LockReset";
import ImageIcon from "@mui/icons-material/Image";

const cleanSuggestionValue = (value) => {
  if (value === null || value === undefined) return "";
  const text = String(value).trim();
  return ["null", "undefined"].includes(text.toLowerCase()) ? "" : text;
};

const getRegistrarSuggestionText = (registrar) =>
  [
    registrar?.employee_id,
    registrar?.first_name,
    registrar?.middle_name,
    registrar?.last_name,
    registrar?.email,
    registrar?.dprtmnt_name,
    registrar?.scopes_summary,
  ]
    .map(cleanSuggestionValue)
    .join(" ")
    .toLowerCase();

const getRegistrarSuggestionValue = (registrar) =>
  cleanSuggestionValue(registrar?.employee_id) ||
  cleanSuggestionValue(registrar?.email);

const RegisterRegistrar = () => {
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

  useEffect(() => {
    if (!settings) return;

    // 🎨 Colors
    if (colors.title) setTitleColor(colors.title);
    if (colors.subtitle) setSubtitleColor(colors.subtitle);
    if (colors.border) setBorderColor(colors.border);
    if (colors.mainButton)
      setMainButtonColor(colors.mainButton);
    if (colors.subButton) setSubButtonColor(colors.subButton); // ✅ NEW
    if (colors.stepper) setStepperColor(colors.stepper); // ✅ NEW

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

  const pageId = 71;

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
      "x-audit-actor-role":
        userRole || localStorage.getItem("role") || "registrar",
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
      const response = await axios.get(
        `${API_BASE_URL}/api/page_access/${employeeID}/${pageId}`,
      );
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

  const [department, setDepartment] = useState([]);
  const [accessLevels, setAccessLevels] = useState([]);
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState("success");

  const [registrars, setRegistrars] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [editData, setEditData] = useState(null);
  const [registrarToDelete, setRegistrarToDelete] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({
    employee_id: "",
    last_name: "",
    middle_name: "",
    first_name: "",
    email: "",
    password: "",
    status: "",
    dprtmnt_id: "",
    access_level: "",
    profile_picture: null,
    preview: "",
    curriculum_id: "",
  });
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [scopes, setScopes] = useState([]);
  const [scopeDeptPick, setScopeDeptPick] = useState("");
  const [scopeProgramPick, setScopeProgramPick] = useState("");

  const resetScopePicker = () => {
    setScopeDeptPick("");
    setScopeProgramPick("");
  };

  const uniqueProgramsForDept = (deptId) => {
    const map = new Map();
    programs
      .filter((p) => String(p.dprtmnt_id) === String(deptId))
      .forEach((p) => {
        if (!map.has(p.program_id)) map.set(p.program_id, p);
      });
    return [...map.values()];
  };

  const handleAddScope = () => {
    if (!scopeDeptPick || !scopeProgramPick) return;

    const alreadyTagged = scopes.some(
      (scope) =>
        String(scope.dprtmnt_id) === String(scopeDeptPick) &&
        String(scope.program_id) === String(scopeProgramPick),
    );
    if (alreadyTagged) return;

    const programMeta = programs.find(
      (p) => String(p.program_id) === String(scopeProgramPick),
    );
    const deptMeta = department.find(
      (d) => String(d.dprtmnt_id) === String(scopeDeptPick),
    );

    setScopes((prev) => [
      ...prev,
      {
        dprtmnt_id: Number(scopeDeptPick),
        program_id: Number(scopeProgramPick),
        dprtmnt_name: deptMeta?.dprtmnt_name || "",
        program_code: programMeta?.program_code || "",
        program_description: programMeta?.program_description || "",
      },
    ]);
    setScopeProgramPick("");
  };

  const handleRemoveScope = (index) => {
    setScopes((prev) => prev.filter((_, itemIndex) => itemIndex !== index));
  };

  const [scopeSearch, setScopeSearch] = useState("");
  const [openDepts, setOpenDepts] = useState(new Set());

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setScopeSearch("");
    setEditData(null);
    setShowPassword(false);
    setOpenDepts(new Set());
    setScopes([]);
    resetScopePicker();
  };

  const [selectedDepartmentFilter, setSelectedDepartmentFilter] = useState("");
  const [sortOrder, setSortOrder] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const filteredRegistrar = registrars
    .filter((r) => {
      const matchesDepartment = selectedDepartmentFilter
        ? r.dprtmnt_name === selectedDepartmentFilter
        : true;

      const search = searchTerm.toLowerCase();

      const matchesSearch =
        r.employee_id?.toLowerCase().includes(search) ||
        r.first_name?.toLowerCase().includes(search) ||
        r.middle_name?.toLowerCase().includes(search) ||
        r.last_name?.toLowerCase().includes(search) ||
        r.email?.toLowerCase().includes(search) ||
        r.dprtmnt_name?.toLowerCase().includes(search) ||
        r.scopes_summary?.toLowerCase().includes(search);

      return matchesDepartment && matchesSearch;
    })
    .sort((a, b) => {
      if (sortOrder === "asc") return a.last_name.localeCompare(b.last_name);
      if (sortOrder === "desc") return b.last_name.localeCompare(a.last_name);
      return 0;
    });

  const totalPages = Math.ceil(filteredRegistrar.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentRegistrar = filteredRegistrar.slice(
    indexOfFirstItem,
    indexOfLastItem,
  );
  const registrarSuggestions =
    searchTerm.trim().length >= 2
      ? registrars
          .filter((registrar) =>
            getRegistrarSuggestionText(registrar).includes(searchTerm.trim().toLowerCase()),
          )
          .slice(0, 10)
      : [];

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages || 1);
    }
  }, [filteredRegistrar.length, totalPages]);

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

  // Add near other state declarations
  const [programs, setPrograms] = useState([]);

  // Add fetch in useEffect
  useEffect(() => {
    fetchDepartments();
    fetchRegistrars();
    fetchAccessLevels();
    fetchPrograms(); // ✅ NEW
  }, []);

  const fetchPrograms = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/applied_program`);
      setPrograms(res.data || []);
    } catch (err) {
      console.error("❌ Program fetch error:", err);
    }
  };

  // 📥 Fetch Departments
  const fetchDepartments = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/get_department`);
      setDepartment(res.data);
    } catch (err) {
      console.error("❌ Department fetch error:", err);
      setErrorMessage("Failed to load department list");
    }
  };

  const fetchRegistrars = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/registrars`);
      setRegistrars(res.data);
    } catch (err) {
      console.error("❌ Registrar fetch error:", err);
      setErrorMessage("Failed to load registrar accounts");
    }
  };

  const fetchAccessLevels = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/access_table`);
      setAccessLevels(res.data || []);
    } catch (err) {
      console.error("❌ Access level fetch error:", err);
      setErrorMessage("Failed to load access levels");
    }
  };

  // Handle form field changes
  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // 🖨️ Registrar Account Slip — same layout/concept as the Faculty slip
  const printRegistrarSlip = (registrar, password, email) => {
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
        <title>Registrar Account Slip</title>
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

          <div class="title">Registrar Portal Account Slip</div>

          <table>
            <tr>
              <th>Employee ID</th>
              <td>${registrar.employee_id || ""}</td>
            </tr>
            <tr>
              <th>Last Name</th>
              <td>${registrar.last_name || ""}</td>
            </tr>
            <tr>
              <th>First Name</th>
              <td>${registrar.first_name || ""}</td>
            </tr>
            <tr>
              <th>Middle Name</th>
              <td>${registrar.middle_name || ""}</td>
            </tr>
            <tr>
              <th>Email</th>
              <td>${email}</td>
            </tr>
            <tr>
              <th>Username</th>
              <td>${email} / ${registrar.employee_id}</td>
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

  // 📧 Emails the typed/generated password to the registrar.
  //    NOTE: requires a backend route /api/send_registrar_password_reminder
  //    (mirrors /api/send_faculty_password_reminder on the Faculty side).
  const sendRegistrarPasswordEmail = async (employeeId, email, password) => {
    try {
      await axios.post(`${API_BASE_URL}/api/send_registrar_password_reminder`, {
        employee_id: employeeId,
        email,
        password,
      });
      return true;
    } catch (err) {
      console.error("Failed to send registrar password email:", err);
      return false;
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

  // 💾 SAVE — persists the registrar record only. It no longer auto-emails
  //    the password; use the "Send" button for that (mirrors the Faculty
  //    Accounts modal workflow).
  const handleSubmit = async (e, options = {}) => {
    const { silent = false } = options;
    if (e && typeof e.preventDefault === "function") e.preventDefault();

    if (editData && !canEdit) {
      setSnackbarMessage("You do not have permission to edit registrars.");
      setSnackbarSeverity("error");
      setOpenSnackbar(true);
      return false;
    }

    if (!editData && !canCreate) {
      setSnackbarMessage("You do not have permission to create registrars.");
      setSnackbarSeverity("error");
      setOpenSnackbar(true);
      return false;
    }

    try {
      const fd = new FormData();

      // append all fields
      Object.entries(form).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          fd.append(key, value);
        }
      });

      // Ensure numbers
      if (form.status !== "" && form.status !== undefined) fd.set("status", Number(form.status));
      if (form.access_level) fd.set("access_level", Number(form.access_level));
      fd.set("scopes", JSON.stringify(scopes));
      fd.delete("dprtmnt_id");
      fd.delete("curriculum_id");

      if (editData) {
        // EDIT registrar
        await axios.put(
          `${API_BASE_URL}/api/update_registrar/${editData.id}`,
          fd,
          {
            headers: {
              "Content-Type": "multipart/form-data",
              ...permissionHeaders.headers,
            },
          },
        );

        // ✅ SUCCESS SNACKBAR
        const editedEmployeeId = form.employee_id || editData.employee_id || "";
        const editedEmail = form.email || editData.email || "";
        const isEditingCurrentUser =
          String(editedEmployeeId) ===
          String(localStorage.getItem("employee_id") || "") ||
          String(editedEmail).toLowerCase() ===
          String(localStorage.getItem("email") || "").toLowerCase();

        if (isEditingCurrentUser) {
          localStorage.setItem("employee_id", String(editedEmployeeId));
          localStorage.setItem("email", String(editedEmail));
          await refreshRegistrarCurriculumId(String(editedEmployeeId));
          window.dispatchEvent(new Event("registrarAccountUpdated"));
        }

        if (!silent) {
          setSnackbarMessage("Registrar updated successfully.");
          setSnackbarSeverity("success");
        }
      } else {
        // ADD registrar
        await axios.post(`${API_BASE_URL}/api/register_registrar`, fd, {
          headers: {
            "Content-Type": "multipart/form-data",
            ...permissionHeaders.headers,
          },
        });

        if (!silent) {
          setSnackbarMessage("Registrar added successfully.");
          setSnackbarSeverity("success");
        }
      }

      if (!silent) {
        setOpenSnackbar(true);
      }

      fetchRegistrars();
      return true;
    } catch (err) {
      console.error("❌ Submit error:", err);

      const backendMessage = err.response?.data?.message;

      if (!silent) {
        // ERROR MESSAGES
        if (backendMessage === "Email already exists") {
          setSnackbarMessage(
            "Email already exists. Please use a different email.",
          );
        } else if (backendMessage === "All required fields must be filled") {
          setSnackbarMessage(
            "Please complete all required fields before submitting.",
          );
        } else {
          setSnackbarMessage(
            backendMessage || "Something went wrong. Please try again.",
          );
        }

        setSnackbarSeverity("error");
        setOpenSnackbar(true);
      }
      return false;
    }
  };

  // 📧 SEND — saves the record silently (so the latest password/status is
  //    persisted) and then emails the registrar their login credentials.
  //    Mirrors handleSendNotification on the Faculty Accounts page.
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

    const emailSent = await sendRegistrarPasswordEmail(
      form.employee_id,
      form.email,
      form.password,
    );

    setSnackbarMessage(
      emailSent ? "Password email sent!" : "Failed to send password email.",
    );
    setSnackbarSeverity(emailSent ? "success" : "error");
    setOpenSnackbar(true);

    printRegistrarSlip(form, form.password, form.email);
  };

  const handleEdit = (r) => {
    if (!canEdit) {
      setSnackbarMessage("You do not have permission to edit registrars.");
      setSnackbarSeverity("error");
      setOpenSnackbar(true);
      return;
    }

    setEditData(r);
    setScopes(
      Array.isArray(r.scopes)
        ? r.scopes.map((scope) => ({
          dprtmnt_id: scope.dprtmnt_id,
          program_id: scope.program_id,
          dprtmnt_name: scope.dprtmnt_name || "",
          program_code: scope.program_code || "",
          program_description: scope.program_description || "",
        }))
        : [],
    );
    resetScopePicker();
    setForm({
      employee_id: r.employee_id || "",
      first_name: r.first_name || "",
      middle_name: r.middle_name || "",
      last_name: r.last_name || "",
      email: r.email || "",
      password: "",
      status: Number(r.status),
      dprtmnt_id: "",
      access_level: r.access_level || "",
      curriculum_id: "",
    });
    setOpenDialog(true);
  };

  // Export CSV
  const handleExportCSV = () => {
    if (registrars.length === 0) return alert("No data to export!");

    const headers = [
      "Employee ID",
      "Full Name",
      "Email",
      "Department",
      "Status",
    ];
    const rows = registrars.map((r) => [
      r.employee_id,
      `${r.first_name} ${r.middle_name || ""} ${r.last_name}`,
      r.email,
      r.dprtmnt_name || "N/A",
      r.status === 1 ? "Active" : "Inactive",
    ]);
    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");

    const blob = new Blob(["\uFEFF" + csv], {
      type: "text/csv;charset=utf-8;",
    });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", "registrars.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDeleteClick = (registrar) => {
    if (!canDelete) {
      setSnackbarMessage("You do not have permission to delete this item");
      setSnackbarSeverity("error");
      setOpenSnackbar(true);
      return;
    }

    setRegistrarToDelete(registrar);
    setOpenDeleteDialog(true);
  };

  const handleDeleteConfirm = async () => {
    if (!registrarToDelete) return;

    try {
      await axios.delete(
        `${API_BASE_URL}/api/delete_registrar/${registrarToDelete.id}`,
        permissionHeaders,
      );

      setSnackbarMessage("Registrar deleted successfully.");
      setSnackbarSeverity("success");
      setOpenSnackbar(true);
      setOpenDeleteDialog(false);
      setRegistrarToDelete(null);
      fetchRegistrars();
    } catch (err) {
      console.error("Delete registrar failed:", err);
      setSnackbarMessage(
        err.response?.data?.message ||
        err.response?.data?.error ||
        "Failed to delete registrar",
      );
      setSnackbarSeverity("error");
      setOpenSnackbar(true);
    }
  };

  // Put this at the very bottom before the return
  if (loading || hasAccess === null) {
    return <LoadingOverlay open={loading} message="Loading..." />;
  }

  if (!hasAccess) {
    return <Unauthorized />;
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
          REGISTRAR ACCOUNTS
        </Typography>

        <Box sx={{ position: "relative", width: 450, maxWidth: "100%" }}>
          <TextField
            size="small"
            placeholder="Search registrar..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
              setSuggestionsOpen(true);
            }}
            onFocus={() => {
              if (searchTerm.trim().length >= 2) setSuggestionsOpen(true);
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
            }}
          />
          {suggestionsOpen && searchTerm.trim().length >= 2 && (
            <Box sx={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 20, backgroundColor: "#fff", border: "1px solid #d0d0d0", borderRadius: "8px", boxShadow: "0 8px 24px rgba(0,0,0,0.14)", overflow: "hidden", maxHeight: 320 }}>
              {registrarSuggestions.length > 0 ? registrarSuggestions.map((registrar) => {
                const employeeId = cleanSuggestionValue(registrar.employee_id);
                const name = [registrar.first_name, registrar.middle_name, registrar.last_name].map(cleanSuggestionValue).filter(Boolean).join(" ");
                return (
                  <Box key={`${employeeId}-${registrar.email}`} onMouseDown={(e) => { e.preventDefault(); setSearchTerm(getRegistrarSuggestionValue(registrar)); setCurrentPage(1); setSuggestionsOpen(false); }} sx={{ px: 2, py: 1, cursor: "pointer", display: "flex", alignItems: "center", gap: 1, fontSize: 14, borderBottom: "1px solid #f0f0f0", "&:hover": { backgroundColor: "#f5f7fb" } }}>
                    <Typography sx={{ fontSize: 14, fontWeight: 700 }}>{employeeId || "N/A"}</Typography>
                    <Typography sx={{ fontSize: 14, color: "#555" }}>|</Typography>
                    <Typography sx={{ fontSize: 14 }} noWrap>{name || cleanSuggestionValue(registrar.email) || "Unnamed Registrar"}</Typography>
                  </Box>
                );
              }) : (
                <Box sx={{ px: 2, py: 1.25, fontSize: 13, color: "#666" }}>No matching registrars found</Box>
              )}
            </Box>
          )}
        </Box>
      </Box>

      <hr style={{ border: "1px solid #ccc", width: "100%" }} />
      <br />
      <br />

      <TableContainer component={Paper} sx={{ width: "100%" }}>
        <Table size="small">
          <TableHead
            sx={{
              backgroundColor: headerColor || "#1976d2",
              color: "white",
            }}
          >
            <TableRow>
              <TableCell
                colSpan={10}
                sx={{
                  border: `1px solid ${borderColor}`,
                  py: 0.5,
                  backgroundColor: headerColor || "#1976d2",
                  color: "white",
                }}
              >
                <Box
                  display="flex"
                  justifyContent="space-between"
                  alignItems="center"
                >
                  {/* Left: Registrar List Count */}
                  <Typography fontSize="14px" fontWeight="bold" color="white">
                    Total Registrar's Records : {filteredRegistrar.length}{" "}
       
                  </Typography>

                  {/* Right: Pagination Controls */}
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
                      onClick={() =>
                        setCurrentPage((prev) => Math.max(prev - 1, 1))
                      }
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

                    {/* Page Dropdown */}
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
                      onClick={() =>
                        setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                      }
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
      {/* 🔧 Control Bar Section */}
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
                  {/* ➕ Left: Add Registrar Button */}
                  <Button
                    startIcon={<AddIcon />}
                    variant="contained"
                    onClick={() => {
                      setEditData(null); // ← clear editData so dialog shows "Add" not "Edit"
                      setForm({
                        employee_id: "",
                        last_name: "",
                        middle_name: "",
                        first_name: "",
                        email: "",
                        password: "",
                        status: "",
                        dprtmnt_id: "",
                        access_level: "",
                        curriculum_id: "",
                        profile_picture: null,
                        preview: "",
                      });
                      setScopes([]);
                      resetScopePicker();
                      setOpenDialog(true);
                    }}
                    sx={{
                      backgroundColor: "default",
                      color: "white",
                      textTransform: "none",
                      fontWeight: "bold",
                      width: "350px",
                      "&:hover": { backgroundColor: "#000" },
                    }}
                  >
                    Add Registrar
                  </Button>

                  {/* ⚙️ Right: Filter, Sort, Export */}
                  <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
                    {/* Department Filter */}
                    <FormControl sx={{ width: "350px" }} size="small">
                      <InputLabel id="filter-department-label">
                        Filter by Department
                      </InputLabel>
                      <Select
                        labelId="filter-department-label"
                        value={selectedDepartmentFilter}
                        onChange={(e) =>
                          setSelectedDepartmentFilter(e.target.value)
                        }
                        label="Filter by Department"
                      >
                        <MenuItem value="">All Departments</MenuItem>
                        {department.map((dep) => (
                          <MenuItem
                            key={dep.dprtmnt_id}
                            value={dep.dprtmnt_name}
                          >
                            {dep.dprtmnt_name} ({dep.dprtmnt_code})
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>

                    {/* Sort Order */}
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

                    {/* Export CSV */}
                    <Button
                      variant="outlined"
                      startIcon={<FileDownloadIcon />}
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
                </Box>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>

      <TableContainer
        component={Paper}
        sx={{ width: "100%", border: `1px solid ${borderColor}`,  }}
      >
        <Table>
          <TableHead
            sx={{ backgroundColor: headerColor || "#1976d2" }}
          >
            <TableRow>
              {[
                "EMPLOYEE ID",
                "Image",
                "Full Name",
                "Email",
                "Department",
                "Program",
                "Access Level",
                "Status",
                "Actions",
              ].map((header, idx) => (
                <TableCell
                  key={idx}
                  sx={{
                    color: "white",
                    fontWeight: "bold",
                    textAlign: "center",
                    border: `1px solid ${borderColor}`,
                  }}
                >
                  {header}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>

          <TableBody>
            {registrars.length > 0 ? (
              currentRegistrar.map((r, i) => (
                <TableRow
                  key={r.id}
                  sx={{
                    backgroundColor: i % 2 === 0 ? "#ffffff" : "lightgray",
                  }}
                >
                  <TableCell
                    sx={{
                      textAlign: "center",
                      border: `1px solid ${borderColor}`,
                    }}
                  >
                    {r.employee_id}
                  </TableCell>

                  <TableCell
                    sx={{
                      border: `1px solid ${borderColor}`,
                      textAlign: "center",
                    }}
                  >
                    <Avatar
                      src={
                        r.profile_picture
                          ? `${API_BASE_URL}/uploads/Admin1by1/${r.profile_picture}`
                          : undefined
                      }
                      alt={r.first_name}
                      sx={{
                        width: 60,
                        height: 60,
                        margin: "auto",
                        border: `1px solid ${borderColor}`,
                        bgcolor: r.profile_picture ? "transparent" : "#6D2323",
                      }}
                    >
                      {r.first_name?.[0] || "?"}
                    </Avatar>
                  </TableCell>

                  <TableCell
                    sx={{
                      textAlign: "center",
                      border: `1px solid ${borderColor}`,
                    }}
                  >
                    {`${r.first_name || ""} ${r.middle_name || ""} ${r.last_name || ""}`}
                  </TableCell>

                  <TableCell
                    sx={{
                      textAlign: "center",
                      border: `1px solid ${borderColor}`,
                    }}
                  >
                    {r.email}
                  </TableCell>

                  <TableCell
                    sx={{
                      textAlign: "center",
                      border: `1px solid ${borderColor}`,
                    }}
                  >
                    {r.dprtmnt_name || "N/A"}
                  </TableCell>
                  <TableCell
                    sx={{
                      textAlign: "center",
                      border: `1px solid ${borderColor}`,
                    }}
                  >
                    {r.scopes_summary ||
                      (r.program_description
                        ? `${r.program_description}${r.major ? ` — ${r.major}` : ""} (${r.program_code}${r.current_year ? `, ${r.current_year}-${r.next_year}` : ""})`
                        : "N/A")}
                  </TableCell>

                  <TableCell
                    sx={{
                      textAlign: "center",
                      border: `1px solid ${borderColor}`,
                    }}
                  >
                    {r.access_description || "N/A"}
                  </TableCell>

                  {/* ℹ️ Status is now changed from inside the Edit modal — this is a
                      read-only indicator, same concept as the Faculty Accounts table. */}
                  <TableCell
                    sx={{
                      border: `1px solid ${borderColor}`,
                      textAlign: "center",
                    }}
                  >
                    <Typography

                      sx={{ textAlign: "center" }}
                    >
                      {Number(r.status) === 1 ? "Active" : "Inactive"}
                    </Typography>
                  </TableCell>

                  <TableCell
                    sx={{
                      border: `1px solid ${borderColor}`,
                    }}
                  >
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        width: "100%",
                      }}
                    >
                      <Button
                        onClick={() => handleEdit(r)}
                        sx={{
                          backgroundColor: "green",
                          color: "white",
                          borderRadius: "5px",
                          padding: "8px 14px",
                          width: "100px",
                        }}
                      >
                        <EditIcon fontSize="small" sx={{ mr: 0.5 }} />
                        Edit
                      </Button>

                      {canDelete && (
                        <Button
                          onClick={() => handleDeleteClick(r)}
                          sx={{
                            backgroundColor: "#9E0000",
                            color: "white",
                            borderRadius: "5px",
                            padding: "8px 14px",
                            width: "100px",
                          }}
                        >
                          <DeleteIcon fontSize="small" sx={{ mr: 0.5 }} />
                          Delete
                        </Button>
                      )}
                    </Box>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={9} align="center">
                  No registrar accounts found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
          <TableContainer component={Paper} sx={{ width: "100%" }}>
        <Table size="small">
          <TableHead
            sx={{
              backgroundColor: headerColor || "#1976d2",
              color: "white",
            }}
          >
            <TableRow>
              <TableCell
                colSpan={10}
                sx={{
                  border: `1px solid ${borderColor}`,
                  py: 0.5,
                  backgroundColor: headerColor || "#1976d2",
                  color: "white",
                }}
              >
                <Box
                  display="flex"
                  justifyContent="space-between"
                  alignItems="center"
                >
                  {/* Left: Registrar List Count */}
                  <Typography fontSize="14px" fontWeight="bold" color="white">
                    Total Registrar's Records : {filteredRegistrar.length}{" "}
      
                  </Typography>

                  {/* Right: Pagination Controls */}
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
                      onClick={() =>
                        setCurrentPage((prev) => Math.max(prev - 1, 1))
                      }
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

                    {/* Page Dropdown */}
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
                      onClick={() =>
                        setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                      }
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

      <Dialog
        open={openDialog}
        onClose={handleCloseDialog}
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
        {/* HEADER */}
        <DialogTitle
          sx={{
            background: headerColor || "#1976d2",
            color: "#fff",
            fontWeight: 700,
            fontSize: "1.1rem",
            py: 2,
            mb: 2,
          }}
        >
          Registrar Registration
        </DialogTitle>

        {/* CONTENT */}
        <DialogContent sx={{ p: 3 }}>
          {/* 📸 Registrar 2x2 Profile Picture — same circular upload
              concept as the Faculty Accounts modal */}
          <Box display="flex" flexDirection="column" alignItems="center" mb={3} mt={1}>
            <Box position="relative" component="label" sx={{ cursor: "pointer", display: "inline-flex" }}>
              <Avatar
                src={
                  form.preview ||
                  (editData?.profile_picture
                    ? `${API_BASE_URL}/uploads/Admin1by1/${editData.profile_picture}`
                    : "")
                }
                sx={{
                  width: 110,
                  height: 110,
                  border: "1.5px solid black",
                  boxShadow: "0 2px 8px rgba(0,0,0,.15)",
                }}
              >
                {!form.preview && !editData?.profile_picture && (
                  <ImageIcon sx={{ fontSize: 40, color: "#999" }} />
                )}
              </Avatar>

              <label
                htmlFor="registrar-avatar-upload"
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
                id="registrar-avatar-upload"
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files[0];
                  if (file) {
                    setForm({
                      ...form,
                      profile_picture: file,
                      preview: URL.createObjectURL(file),
                    });
                  }
                }}
              />
            </Box>

            <Typography variant="caption" color="text.secondary" mt={1}>
              Click to upload 2x2 profile picture
            </Typography>
          </Box>

          {/* REGISTRAR INFO */}
          <Typography fontWeight={700} mt={2} mb={2}>
            Registrar Information
          </Typography>

          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                size="small"
                label="Employee ID"
                name="employee_id"
                value={form.employee_id}
                onChange={handleChange}
                fullWidth
              />
            </Grid>

            <Grid item xs={6}>
              <TextField
                size="small"
                label="First Name"
                name="first_name"
                value={form.first_name}
                onChange={handleChange}
                fullWidth
              />
            </Grid>

            <Grid item xs={6}>
              <TextField
                size="small"
                label="Last Name"
                name="last_name"
                value={form.last_name}
                onChange={handleChange}
                fullWidth
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                size="small"
                label="Middle Name"
                name="middle_name"
                value={form.middle_name}
                onChange={handleChange}
                fullWidth
              />
            </Grid>
          </Grid>

          {/* ACCOUNT */}
          <Typography fontWeight={700} mt={3} mb={2}>
            Account Details
          </Typography>

          <Stack spacing={2}>
            <TextField
              size="small"
              label="Email"
              name="email"
              value={form.email}
              onChange={handleChange}
              type="email"
              fullWidth
            />

            {/* PASSWORD FIELD — typable, matches the Faculty Accounts form.
                Use the Send button below to email it to the registrar. */}
            <TextField
              size="small"
              label={
                editData
                  ? "New Password (leave blank to keep current)"
                  : "Password"
              }
              name="password"
              value={form.password}
              onChange={handleChange}
              type={showPassword ? "text" : "password"}
              fullWidth
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPassword((prev) => !prev)}
                      edge="end"
                      size="small"
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              helperText={
                editData
                  ? "Leave blank to keep the current password unchanged. Use Send below to email a new password to the registrar."
                  : "Generate a password or type one here before saving."
              }
            />
          </Stack>

          {/* ✅ Generated Password preview — same concept as the Faculty
              and Student Accounts modals */}
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



          <Stack spacing={2}>

            {/* DEPARTMENT / PROGRAM SCOPES */}
            <Typography fontWeight={700} mt={3} mb={1} mt={2}>
              Department & Program Scopes
            </Typography>
            <Typography fontSize="13px" color="text.secondary" mb={1}>
              Use the search to quickly find programs, or expand departments to check individually.
            </Typography>

            {/* Autocomplete quick-add */}
            <Autocomplete
              size="small"
              options={programs.filter((p) => {
                // dedupe by program_id
                const seen = new Set(scopes.map((s) => `${s.dprtmnt_id}:${s.program_id}`));
                return !seen.has(`${p.dprtmnt_id}:${p.program_id}`);
              })}
              getOptionLabel={(p) =>
                `${p.program_code} - ${p.program_description}${p.major ? ` (${p.major})` : ""}`
              }
              groupBy={(p) => {
                const dept = department.find((d) => String(d.dprtmnt_id) === String(p.dprtmnt_id));
                return dept ? `${dept.dprtmnt_name} (${dept.dprtmnt_code})` : "Unknown";
              }}
              onChange={(_, value) => {
                if (!value) return;
                const deptMeta = department.find((d) => String(d.dprtmnt_id) === String(value.dprtmnt_id));
                const alreadyAdded = scopes.some(
                  (s) =>
                    String(s.dprtmnt_id) === String(value.dprtmnt_id) &&
                    String(s.program_id) === String(value.program_id)
                );
                if (!alreadyAdded) {
                  setScopes((prev) => [
                    ...prev,
                    {
                      dprtmnt_id: Number(value.dprtmnt_id),
                      program_id: Number(value.program_id),
                      dprtmnt_name: deptMeta?.dprtmnt_name || "",
                      program_code: value.program_code || "",
                      program_description: value.program_description || "",
                    },
                  ]);
                }
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  placeholder="Search and select a program…"
                  InputProps={{
                    ...params.InputProps,
                    startAdornment: (
                      <>
                        <SearchIcon sx={{ ml: 0.5, mr: 0.5, color: "gray", fontSize: 18 }} />
                        {params.InputProps.startAdornment}
                      </>
                    ),
                  }}
                />
              )}
              sx={{ mb: 2 }}
              value={null}
              blurOnSelect
              clearOnBlur
            />

            {/* Collapsible dept checkboxes */}
            {department.map((dept) => {
              const progs = uniqueProgramsForDept(dept.dprtmnt_id);
              if (progs.length === 0) return null;

              const checkedCount = progs.filter((p) =>
                scopes.some(
                  (s) =>
                    String(s.dprtmnt_id) === String(dept.dprtmnt_id) &&
                    String(s.program_id) === String(p.program_id)
                )
              ).length;
              const allChecked = checkedCount === progs.length && progs.length > 0;
              const isOpen = openDepts.has(dept.dprtmnt_id);

              return (
                <Box
                  key={dept.dprtmnt_id}
                  sx={{ border: "1px solid #e0e0e0", borderRadius: 2, mb: 1, overflow: "hidden" }}
                >
                  {/* Dept header row */}
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                      px: 1.5,
                      py: 0.75,
                      backgroundColor: "#f5f5f5",
                      cursor: "pointer",
                      userSelect: "none",
                    }}
                  >
                    {/* Check-all checkbox — stop propagation so it doesn't toggle collapse */}
                    <Checkbox
                      size="small"
                      checked={allChecked}
                      indeterminate={checkedCount > 0 && !allChecked}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => {
                        e.stopPropagation();
                        if (e.target.checked) {
                          const toAdd = progs
                            .filter(
                              (p) =>
                                !scopes.some(
                                  (s) =>
                                    String(s.dprtmnt_id) === String(dept.dprtmnt_id) &&
                                    String(s.program_id) === String(p.program_id)
                                )
                            )
                            .map((p) => ({
                              dprtmnt_id: Number(dept.dprtmnt_id),
                              program_id: Number(p.program_id),
                              dprtmnt_name: dept.dprtmnt_name,
                              program_code: p.program_code,
                              program_description: p.program_description,
                            }));
                          setScopes((prev) => [...prev, ...toAdd]);
                        } else {
                          setScopes((prev) =>
                            prev.filter((s) => String(s.dprtmnt_id) !== String(dept.dprtmnt_id))
                          );
                        }
                      }}
                    />

                    {/* Clickable area for collapse toggle */}
                    <Box
                      sx={{ display: "flex", alignItems: "center", gap: 1, flex: 1 }}
                      onClick={() =>
                        setOpenDepts((prev) => {
                          const next = new Set(prev);
                          next.has(dept.dprtmnt_id) ? next.delete(dept.dprtmnt_id) : next.add(dept.dprtmnt_id);
                          return next;
                        })
                      }
                    >
                      <Typography fontSize="13px" fontWeight={600} sx={{ flex: 1 }}>
                        {dept.dprtmnt_name}
                      </Typography>
                      <Chip label={dept.dprtmnt_code} size="small" />
                      {checkedCount > 0 && (
                        <Chip label={`${checkedCount}/${progs.length}`} size="small" color="primary" />
                      )}
                      {isOpen ? (
                        <ExpandLessIcon fontSize="small" sx={{ color: "text.secondary" }} />
                      ) : (
                        <ExpandMoreIcon fontSize="small" sx={{ color: "text.secondary" }} />
                      )}
                    </Box>
                  </Box>

                  {/* Program checkboxes — only shown when expanded */}
                  {isOpen && (
                    <Box sx={{ px: 2, py: 1, display: "grid", gap: 0.25 }}>
                      {progs.map((p) => {
                        const isChecked = scopes.some(
                          (s) =>
                            String(s.dprtmnt_id) === String(dept.dprtmnt_id) &&
                            String(s.program_id) === String(p.program_id)
                        );
                        return (
                          <FormControlLabel
                            key={p.program_id}
                            sx={{ m: 0 }}
                            control={
                              <Checkbox
                                size="small"
                                checked={isChecked}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setScopes((prev) => [
                                      ...prev,
                                      {
                                        dprtmnt_id: Number(dept.dprtmnt_id),
                                        program_id: Number(p.program_id),
                                        dprtmnt_name: dept.dprtmnt_name,
                                        program_code: p.program_code,
                                        program_description: p.program_description,
                                      },
                                    ]);
                                  } else {
                                    setScopes((prev) =>
                                      prev.filter(
                                        (s) =>
                                          !(
                                            String(s.dprtmnt_id) === String(dept.dprtmnt_id) &&
                                            String(s.program_id) === String(p.program_id)
                                          )
                                      )
                                    );
                                  }
                                }}
                              />
                            }
                            label={
                              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                <Typography fontSize="13px">{p.program_description}</Typography>
                                <Typography fontSize="11px" color="text.secondary">
                                  {p.program_code}
                                </Typography>
                              </Box>
                            }
                          />
                        );
                      })}
                    </Box>
                  )}
                </Box>
              );
            })}

            {/* Selected scopes chips */}
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mt: 1 }}>
              {scopes.length === 0 ? (
                <Typography fontSize="13px" color="text.secondary">
                  No scopes selected yet.
                </Typography>
              ) : (
                scopes.map((scope, index) => (
                  <Chip
                    key={`${scope.dprtmnt_id}-${scope.program_id}-${index}`}
                    label={`${scope.dprtmnt_name || scope.dprtmnt_id}: ${scope.program_code || scope.program_id}`}
                    onDelete={() => handleRemoveScope(index)}
                    color="primary"
                    variant="outlined"
                    size="small"
                  />
                ))
              )}
            </Box>



            <FormControl fullWidth size="small">
              <InputLabel>Access Level</InputLabel>
              <Select
                value={form.access_level}
                label="Access Level"
                onChange={(e) =>
                  setForm({ ...form, access_level: e.target.value })
                }
              >
                <MenuItem value="">Select Access Level</MenuItem>
                {accessLevels.map((access) => (
                  <MenuItem key={access.access_id} value={access.access_id}>
                    {access.access_description}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {editData && (
              <FormControl fullWidth size="small">
                <InputLabel>Status</InputLabel>
                <Select
                  name="status"
                  value={form.status}
                  label="Status"
                  onChange={handleChange}
                >
                  <MenuItem value={1}>Active</MenuItem>
                  <MenuItem value={0}>Inactive</MenuItem>
                </Select>
              </FormControl>
            )}
          </Stack>
        </DialogContent>

        {/* ACTIONS — same layout as the Faculty Accounts modal:
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
                printRegistrarSlip(form, form.password, form.email)
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
        onClose={() => {
          setOpenDeleteDialog(false);
          setRegistrarToDelete(null);
        }}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 3, overflow: "hidden", boxShadow: 6 },
        }}
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
          Delete Registrar
        </DialogTitle>

        <DialogContent sx={{ p: 3, mt: 2 }}>
          <Typography sx={{ mb: 2 }}>
            Are you sure you want to delete registrar{" "}
            <strong>
              {registrarToDelete
                ? `${registrarToDelete.first_name || ""} ${registrarToDelete.last_name || ""}`
                : ""}
            </strong>
            ?
          </Typography>

          <Typography sx={{ color: "#d32f2f", fontSize: "0.95rem" }}>
            Deleting this registrar will permanently remove their account from
            the system.
            <br />
            All access privileges and records associated with this registrar may
            be affected.
          </Typography>
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2, borderTop: "1px solid #e0e0e0" }}>
          <Button
            onClick={() => {
              setOpenDeleteDialog(false);
              setRegistrarToDelete(null);
            }}
            color="error"
            variant="outlined"
          >
            Cancel
          </Button>
          <Button
            onClick={handleDeleteConfirm}
            color="error"
            variant="contained"
          >
            Yes, Delete
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

export default RegisterRegistrar;
