import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  List,
  ListItem,
  ListItemText,
  MenuItem,
  Paper,
  Select,
  Snackbar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { Delete, FileUpload, PersonAdd, Save, Search } from "@mui/icons-material";
import API_BASE_URL from "../apiConfig";
import EaristLogo from "../assets/EaristLogo.png";
import { getAuditConfig } from "../utils/auditEvents";
import useAccountAuditMac from "./useAccountAuditMac";
import { SettingsContext } from "../App";
import Unauthorized from "../components/Unauthorized";
import LoadingOverlay from "../components/LoadingOverlay";

const UploadApplicants = () => {
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
  const [subButtonColor, setSubButtonColor] = useState("#ffffff");
  const [stepperColor, setStepperColor] = useState("#000000");

  const [fetchedLogo, setFetchedLogo] = useState(null);
  const [companyName, setCompanyName] = useState("");
  const [shortTerm, setShortTerm] = useState("");
  const [campusAddress, setCampusAddress] = useState("");

  useEffect(() => {
    if (!settings) return;

    if (colors.title) setTitleColor(colors.title);
    if (colors.subtitle) setSubtitleColor(colors.subtitle);
    if (colors.border) setBorderColor(colors.border);
    if (colors.mainButton) setMainButtonColor(colors.mainButton);
    if (colors.subButton) setSubButtonColor(colors.subButton);
    if (colors.stepper) setStepperColor(colors.stepper);

    if (assets.logoUrl) {
      setFetchedLogo(`${assets.logoUrl}`);
    } else {
      setFetchedLogo(EaristLogo);
    }

    if (branding.companyName) setCompanyName(branding.companyName);
    if (branding.shortTerm) setShortTerm(branding.shortTerm);
    if (branding.campusAddress) setCampusAddress(branding.campusAddress);
  }, [settings]);

  const [userID, setUserID] = useState("");
  const [user, setUser] = useState("");
  const [userRole, setUserRole] = useState("");

  const [hasAccess, setHasAccess] = useState(null);
  const [canCreate, setCanCreate] = useState(false);
  const [canEdit, setCanEdit] = useState(false);
  const [canDelete, setCanDelete] = useState(false);
  const [loading, setLoading] = useState(false);


  const fileInputRef = useRef(null);
  const assignCheckTimerRef = useRef(null);
  const editCheckTimerRef = useRef(null);

  const auditActorId =
    localStorage.getItem("employee_id") ||
    localStorage.getItem("person_id") ||
    localStorage.getItem("email") ||
    "unknown";
  const auditActorRole = localStorage.getItem("role") || "registrar";

  const pageId = 166;

  const [employeeID, setEmployeeID] = useState("");

  const getAuditHeaders = () =>
    getAuditConfig({
      "x-employee-id": employeeID || localStorage.getItem("employee_id") || "",
      "x-page-id": pageId,
      "x-audit-change-section": "personal_information",
      "x-audit-actor-id":
        employeeID ||
        localStorage.getItem("employee_id") ||
        localStorage.getItem("person_id") ||
        localStorage.getItem("email") ||
        "unknown",
      "x-audit-actor-role": userRole || localStorage.getItem("role") || "registrar",
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
      const response = await axios.get(
        `${API_BASE_URL}/api/page_access/${employeeID}/${pageId}`,
      );
      if (response.data && response.data.page_privilege === 1) {
        setHasAccess(true);
      } else {
        setHasAccess(false);
      }
    } catch (error) {
      console.error("Error checking access:", error);
      setHasAccess(false);
      if (error.response && error.response.data.message) {
        console.log(error.response.data.message);
      } else {
        console.log("An unexpected error occurred.");
      }
      setLoading(false);
    }
  };


  const [selectedFile, setSelectedFile] = useState(null);
  const [applicants, setApplicants] = useState([]);
  const [search, setSearch] = useState("");
  const [sortOption, setSortOption] = useState("id_desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [importing, setImporting] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [assignTarget, setAssignTarget] = useState(null);
  const [customStudentNumber, setCustomStudentNumber] = useState("");
  const [studentNumberError, setStudentNumberError] = useState("");
  const [checkingStudentNumber, setCheckingStudentNumber] = useState(false);
  const [studentNumberEdits, setStudentNumberEdits] = useState({});
  const [editStudentNumberErrors, setEditStudentNumberErrors] = useState({});
  const [checkingEditStudentNumberId, setCheckingEditStudentNumberId] = useState(null);
  const [changeWarningTarget, setChangeWarningTarget] = useState(null);
  const [skippedDialogOpen, setSkippedDialogOpen] = useState(false);
  const [skippedRows, setSkippedRows] = useState([]);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "info",
  });

  useEffect(() => {
    if (!settings) return;
    if (colors.title) setTitleColor(colors.title);
    if (colors.border) setBorderColor(colors.border);
    if (colors.mainButton) setMainButtonColor(colors.mainButton);
  }, [settings]);

  useEffect(() => {
    fetchApplicants();
  }, []);

  const filteredApplicants = useMemo(() => {
    const query = search.trim().toLowerCase();
    const rows = query
      ? applicants.filter((row) =>
        [
          row.applicant_number,
          row.last_name,
          row.first_name,
          row.middle_name,
          row.program,
          row.email_address,
          row.contact_num,
          row.address,
          row.date_applied,
          row.program_display,
          row.student_number,
        ]
          .join(" ")
          .toLowerCase()
          .includes(query),
      )
      : applicants;

    return [...rows].sort((a, b) => {
      if (sortOption === "lname_asc") {
        return String(a.last_name || "").localeCompare(String(b.last_name || ""), undefined, {
          sensitivity: "base",
        });
      }
      if (sortOption === "lname_desc") {
        return String(b.last_name || "").localeCompare(String(a.last_name || ""), undefined, {
          sensitivity: "base",
        });
      }
      return Number(b.id || 0) - Number(a.id || 0);
    });
  }, [applicants, search, sortOption]);

  const itemsPerPage = 10;
  const totalPages = Math.max(1, Math.ceil(filteredApplicants.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedApplicants = filteredApplicants.slice(startIndex, startIndex + itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, sortOption, applicants.length]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  useEffect(() => {
    if (!assignTarget) {
      setCustomStudentNumber("");
      setStudentNumberError("");
      setCheckingStudentNumber(false);
      return undefined;
    }

    const value = customStudentNumber.trim();
    if (!value) {
      setStudentNumberError("");
      setCheckingStudentNumber(false);
      return undefined;
    }

    setCheckingStudentNumber(true);
    assignCheckTimerRef.current = setTimeout(async () => {
      try {
        const res = await axios.get(
          `${API_BASE_URL}/api/uploaded-applicants/check-student-number`,
          { params: { student_number: value } },
        );
        setStudentNumberError(res.data?.exists ? "This student number already exists." : "");
      } catch {
        setStudentNumberError("Unable to verify student number.");
      } finally {
        setCheckingStudentNumber(false);
      }
    }, 400);

    return () => clearTimeout(assignCheckTimerRef.current);
  }, [assignTarget, customStudentNumber]);

  useEffect(() => {
    if (checkingEditStudentNumberId == null) return undefined;

    const row = applicants.find((item) => item.id === checkingEditStudentNumberId);
    const draftValue = studentNumberEdits[checkingEditStudentNumberId];
    const value = String(draftValue ?? "").trim();
    const currentValue = String(row?.student_number ?? "").trim();

    if (!value || value === currentValue) {
      setEditStudentNumberErrors((prev) => ({
        ...prev,
        [checkingEditStudentNumberId]: "",
      }));
      return undefined;
    }

    editCheckTimerRef.current = setTimeout(async () => {
      try {
        const res = await axios.get(
          `${API_BASE_URL}/api/uploaded-applicants/check-student-number`,
          {
            params: {
              student_number: value,
              exclude_student_number: currentValue || undefined,
            },
          },
        );
        setEditStudentNumberErrors((prev) => ({
          ...prev,
          [checkingEditStudentNumberId]: res.data?.exists
            ? "This student number already exists."
            : "",
        }));
      } catch {
        setEditStudentNumberErrors((prev) => ({
          ...prev,
          [checkingEditStudentNumberId]: "Unable to verify student number.",
        }));
      }
    }, 400);

    return () => clearTimeout(editCheckTimerRef.current);
  }, [checkingEditStudentNumberId, studentNumberEdits, applicants]);

  const fetchApplicants = async () => {
    try {
      const pageLimit = 500;
      let page = 1;
      let totalPages = 1;
      const allRows = [];

      do {
        const res = await axios.get(`${API_BASE_URL}/api/get_uploaded_applicants`, {
          params: { page, limit: pageLimit },
        });
        const rows = Array.isArray(res.data) ? res.data : res.data?.data;
        if (Array.isArray(rows) && rows.length > 0) {
          allRows.push(...rows);
        }
        totalPages = Number(res.data?.totalPages || 1);
        page += 1;
      } while (page <= totalPages);

      setApplicants(allRows);
    } catch (err) {
      setSnackbar({
        open: true,
        message: err.response?.data?.error || "Failed to fetch uploaded applicants.",
        severity: "error",
      });
    }
  };

  const handleDeleteApplicant = async () => {
    if (!deleteTarget) return;

    try {
      setActionLoadingId(deleteTarget.id);
      await axios.delete(`${API_BASE_URL}/api/uploaded-applicants/${deleteTarget.id}`);
      setApplicants((prev) => prev.filter((row) => row.id !== deleteTarget.id));
      setSnackbar({
        open: true,
        message: "Uploaded applicant deleted successfully.",
        severity: "success",
      });
      setDeleteTarget(null);
    } catch (err) {
      setSnackbar({
        open: true,
        message: err.response?.data?.error || "Failed to delete uploaded applicant.",
        severity: "error",
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleAssignStudentNumber = async () => {
    if (!assignTarget) return;

    const studentNumber = customStudentNumber.trim();
    if (!studentNumber || studentNumberError || checkingStudentNumber) return;

    try {
      setActionLoadingId(assignTarget.id);
      const res = await axios.post(`${API_BASE_URL}/api/uploaded-applicants/assign-student-number`, {
        uploaded_applicant_id: assignTarget.id,
        student_number: studentNumber,
        audit_actor_id: auditActorId,
        audit_actor_role: auditActorRole,
      });
      const result = res.data?.assigned?.[0];

      if (!res.data?.success && !res.data?.partial) {
        throw new Error(res.data?.skipped?.[0]?.reason || res.data?.error || "Failed to assign student number.");
      }

      setSnackbar({
        open: true,
        message: result?.message || res.data?.message || "Student number assigned successfully.",
        severity: result?.email_sent ? "success" : "warning",
      });
      setAssignTarget(null);
      setCustomStudentNumber("");
      setStudentNumberError("");
      await fetchApplicants();
    } catch (err) {
      setSnackbar({
        open: true,
        message: err.response?.data?.error || err.message || "Failed to assign student number.",
        severity: "error",
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleAutoAssignTraditionalStudentNumber = async () => {
    if (!assignTarget) return;

    try {
      setActionLoadingId(assignTarget.id);
      const res = await axios.post(
        `${API_BASE_URL}/api/uploaded-applicants/assign-student-number/traditional`,
        {
          uploaded_applicant_id: assignTarget.id,
          audit_actor_id: auditActorId,
          audit_actor_role: auditActorRole,
        },
      );

      const result = res.data?.assigned?.[0];

      if (!res.data?.success && !res.data?.partial) {
        throw new Error(
          res.data?.skipped?.[0]?.reason ||
            res.data?.error ||
            "Failed to auto-assign student number.",
        );
      }

      setSnackbar({
        open: true,
        message:
          result?.student_number
            ? `Assigned student number ${result.student_number}.`
            : result?.message || res.data?.message || "Student number assigned successfully.",
        severity: result?.email_sent ? "success" : "warning",
      });

      setAssignTarget(null);
      setCustomStudentNumber("");
      setStudentNumberError("");
      await fetchApplicants();
    } catch (err) {
      setSnackbar({
        open: true,
        message:
          err.response?.data?.error ||
          err.response?.data?.skipped?.[0]?.reason ||
          err.message ||
          "Failed to auto-assign student number.",
        severity: "error",
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleAutoAssignTraditionalStudentNumberForRow = async (row) => {
    if (!row?.id) return;

    try {
      setActionLoadingId(row.id);
      const res = await axios.post(
        `${API_BASE_URL}/api/uploaded-applicants/assign-student-number/traditional`,
        {
          uploaded_applicant_id: row.id,
          audit_actor_id: auditActorId,
          audit_actor_role: auditActorRole,
        },
      );

      const result = res.data?.assigned?.[0];

      if (!res.data?.success && !res.data?.partial) {
        throw new Error(
          res.data?.skipped?.[0]?.reason ||
            res.data?.error ||
            "Failed to auto-assign student number.",
        );
      }

      setSnackbar({
        open: true,
        message:
          result?.student_number
            ? `Assigned student number ${result.student_number}.`
            : result?.message || res.data?.message || "Student number assigned successfully.",
        severity: result?.email_sent ? "success" : "warning",
      });

      await fetchApplicants();
    } catch (err) {
      setSnackbar({
        open: true,
        message:
          err.response?.data?.error ||
          err.response?.data?.skipped?.[0]?.reason ||
          err.message ||
          "Failed to auto-assign student number.",
        severity: "error",
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleStudentNumberEditChange = (row, value) => {
    setStudentNumberEdits((prev) => ({ ...prev, [row.id]: value }));
    setEditStudentNumberErrors((prev) => ({ ...prev, [row.id]: "" }));
    setCheckingEditStudentNumberId(row.id);
  };

  const handleCancelStudentNumberEdit = (row) => {
    setStudentNumberEdits((prev) => {
      const next = { ...prev };
      delete next[row.id];
      return next;
    });
    setEditStudentNumberErrors((prev) => {
      const next = { ...prev };
      delete next[row.id];
      return next;
    });
    if (checkingEditStudentNumberId === row.id) {
      setCheckingEditStudentNumberId(null);
    }
  };

  const handleSaveStudentNumberEdit = (row) => {
    const draftValue = String(studentNumberEdits[row.id] ?? "").trim();
    const currentValue = String(row.student_number ?? "").trim();

    if (!draftValue || draftValue === currentValue || editStudentNumberErrors[row.id]) return;

    setChangeWarningTarget({
      ...row,
      currentStudentNumber: currentValue,
      nextStudentNumber: draftValue,
    });
  };

  const handleConfirmStudentNumberChange = async () => {
    if (!changeWarningTarget) return;

    try {
      setActionLoadingId(changeWarningTarget.id);
      const res = await axios.put(`${API_BASE_URL}/api/uploaded-applicants/change-student-number`, {
        uploaded_applicant_id: changeWarningTarget.id,
        student_number: changeWarningTarget.nextStudentNumber,
        audit_actor_id: auditActorId,
        audit_actor_role: auditActorRole,
      });

      setSnackbar({
        open: true,
        message: res.data?.message || "Student number updated successfully.",
        severity: "success",
      });
      setChangeWarningTarget(null);
      setStudentNumberEdits((prev) => {
        const next = { ...prev };
        delete next[changeWarningTarget.id];
        return next;
      });
      setEditStudentNumberErrors((prev) => {
        const next = { ...prev };
        delete next[changeWarningTarget.id];
        return next;
      });
      await fetchApplicants();
    } catch (err) {
      setSnackbar({
        open: true,
        message: err.response?.data?.error || "Failed to change student number.",
        severity: "error",
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleImport = async () => {
    if (!selectedFile) {
      setSnackbar({
        open: true,
        message: "Please choose an Excel file first.",
        severity: "warning",
      });
      return;
    }

    try {
      setImporting(true);
      const formData = new FormData();
      formData.append("file", selectedFile);

      const res = await axios.post(`${API_BASE_URL}/api/import-xlsx-into-uploaded-applicants`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          ...getAuditHeaders().headers,
        },
      });

      if (res.data?.success) {
        const skippedCount = Number(res.data?.skippedCount || 0);
        setSnackbar({
          open: true,
          message:
            skippedCount > 0
              ? `Import finished with ${skippedCount} skipped row(s).`
              : res.data.message || "Uploaded applicants imported successfully.",
          severity: skippedCount > 0 ? "warning" : "success",
        });
        setSkippedRows(Array.isArray(res.data?.skippedItems) ? res.data.skippedItems : []);
        setSkippedDialogOpen(skippedCount > 0);
        setSelectedFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
        await fetchApplicants();
      }
    } catch (err) {
      const skippedItems = err.response?.data?.skippedItems;
      if (Array.isArray(skippedItems) && skippedItems.length > 0) {
        setSkippedRows(skippedItems);
        setSkippedDialogOpen(true);
      }
      setSnackbar({
        open: true,
        message: err.response?.data?.error || "Import failed.",
        severity: "error",
      });
    } finally {
      setImporting(false);
    }
  };

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
        backgroundColor: "transparent",
        mt: 1,
        p: 2,
      }}
    >
      <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2} mb={2}>
        <Typography variant="h4" fontWeight="bold" sx={{ color: titleColor }}>
          UPLOAD APPLICANTS
        </Typography>

        <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={(event) => setSelectedFile(event.target.files?.[0] || null)}
            style={{ display: "none" }}
          />
          <Button
            variant="outlined"
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
            sx={{ height: 40, textTransform: "none", borderColor }}
          >
            {selectedFile ? selectedFile.name : "Choose File"}
          </Button>
          <Button
            variant="contained"
            startIcon={<FileUpload />}
            onClick={handleImport}
            disabled={importing}
            sx={{
              height: 40,
              textTransform: "none",
              fontWeight: "bold",
              backgroundColor: mainButtonColor,
            }}
          >
            {importing ? "Importing..." : "Import Applicants"}
          </Button>
        </Box>
      </Box>

      <hr style={{ border: "1px solid #ccc", width: "100%" }} />

      <Paper sx={{ p: 2, my: 2, border: `1px solid ${borderColor}` }}>
        <Box display="grid" gridTemplateColumns={{ xs: "1fr", md: "1fr 220px" }} gap={2}>
          <TextField
            size="small"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search applicant number, name, program, email, contact, address"
            InputProps={{ startAdornment: <Search sx={{ mr: 1, color: "text.secondary" }} /> }}
          />
          <FormControl size="small">
            <Select value={sortOption} onChange={(event) => setSortOption(event.target.value)}>
              <MenuItem value="id_desc">Upload Order (Newest)</MenuItem>
              <MenuItem value="lname_asc">Last Name (A-Z)</MenuItem>
              <MenuItem value="lname_desc">Last Name (Z-A)</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </Paper>

      <TableContainer component={Paper} sx={{ border: `1px solid ${borderColor}` }}>
        <Table size="small">
          <TableHead sx={{ backgroundColor: headerColor || "#1976d2" }}>
            <TableRow>
              {[
                "No.",
                "Applicant Number",
                "Last Name",
                "First Name",
                "Middle Name",
                "Program",
                "Email Address",
                "Contact Number",
                "Address",
                "Date Applied",
                "Student Number",
                "Action",
              ].map((label) => (
                <TableCell key={label} sx={{ color: "white", fontWeight: "bold", border: `1px solid ${borderColor}` }}>
                  {label}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedApplicants.map((row, index) => (
              <TableRow key={`${row.id}-${row.applicant_number}`}>
                <TableCell sx={{ color: "black", fontWeight: "bold", border: `1px solid ${borderColor}` }}>{startIndex + index + 1}</TableCell>
                <TableCell sx={{ color: "black", fontWeight: "bold", border: `1px solid ${borderColor}` }}>{row.applicant_number}</TableCell>
                <TableCell sx={{ color: "black", fontWeight: "bold", border: `1px solid ${borderColor}` }}>{row.last_name}</TableCell>
                <TableCell sx={{ color: "black", fontWeight: "bold", border: `1px solid ${borderColor}` }}>{row.first_name}</TableCell>
                <TableCell sx={{ color: "black", fontWeight: "bold", border: `1px solid ${borderColor}` }}>{row.middle_name}</TableCell>
                <TableCell sx={{ color: "black", fontWeight: "bold", border: `1px solid ${borderColor}` }}>{row.program_display || row.program}</TableCell>
                <TableCell sx={{ color: "black", fontWeight: "bold", border: `1px solid ${borderColor}` }}>{row.email_address}</TableCell>
                <TableCell sx={{ color: "black", fontWeight: "bold", border: `1px solid ${borderColor}` }}>{row.contact_num}</TableCell>
                <TableCell sx={{ color: "black", fontWeight: "bold", border: `1px solid ${borderColor}` }}>{row.address}</TableCell>
                <TableCell sx={{ color: "black", fontWeight: "bold", border: `1px solid ${borderColor}` }}>{row.date_applied}</TableCell>
                <TableCell sx={{ color: "black", fontWeight: "bold", border: `1px solid ${borderColor}` }}>
                  {row.student_number ? (
                    <Box display="flex" flexDirection="column" gap={0.5} minWidth={180}>
                      <TextField
                        size="small"
                        value={
                          studentNumberEdits[row.id] !== undefined
                            ? studentNumberEdits[row.id]
                            : row.student_number
                        }
                        onChange={(event) => handleStudentNumberEditChange(row, event.target.value)}
                        error={Boolean(editStudentNumberErrors[row.id])}
                        helperText={editStudentNumberErrors[row.id] || ""}
                        disabled={actionLoadingId === row.id}
                        sx={{ minWidth: 160 }}
                      />
                      {(() => {
                        const draftValue = String(
                          studentNumberEdits[row.id] !== undefined
                            ? studentNumberEdits[row.id]
                            : row.student_number,
                        ).trim();
                        const savedValue = String(row.student_number ?? "").trim();
                        const hasDraftChange = draftValue !== savedValue;

                        if (!hasDraftChange) return null;

                        return (
                          <Box display="flex" gap={0.5}>
                            <Button
                              size="small"
                              variant="contained"
                              startIcon={<Save />}
                              disabled={
                                actionLoadingId === row.id ||
                                !draftValue ||
                                Boolean(editStudentNumberErrors[row.id])
                              }
                              onClick={() => handleSaveStudentNumberEdit(row)}
                              sx={{ textTransform: "none", backgroundColor: mainButtonColor }}
                            >
                              Save
                            </Button>
                            <Button
                              size="small"
                              variant="outlined"
                              disabled={actionLoadingId === row.id}
                              onClick={() => handleCancelStudentNumberEdit(row)}
                              sx={{ textTransform: "none" }}
                            >
                              Cancel
                            </Button>
                          </Box>
                        );
                      })()}
                    </Box>
                  ) : (
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                      Not assigned
                    </Typography>
                  )}
                </TableCell>
                <TableCell>
                  <Box display="flex" gap={0.5} flexWrap="wrap">
                    {!row.student_number && (
                      <>
                        <Button
                          size="small"
                          variant="contained"
                          startIcon={<PersonAdd />}
                          disabled={actionLoadingId === row.id}
                          onClick={() => {
                            setCustomStudentNumber("");
                            setStudentNumberError("");
                            setAssignTarget(row);
                          }}
                          sx={{ textTransform: "none", backgroundColor: mainButtonColor }}
                        >
                          Assign
                        </Button>
                        <Button
                          size="small"
                          variant="outlined"
                          disabled={actionLoadingId === row.id}
                          onClick={() => handleAutoAssignTraditionalStudentNumberForRow(row)}
                          sx={{ textTransform: "none" }}
                        >
                          Auto Assign
                        </Button>
                      </>
                    )}
                    <Button
                      size="small"
                      variant="outlined"
                      color="error"
                      startIcon={<Delete />}
                      disabled={actionLoadingId === row.id}
                      onClick={() => setDeleteTarget(row)}
                      sx={{ textTransform: "none" }}
                    >
                      Delete
                    </Button>
                  </Box>
                </TableCell>
              </TableRow>
            ))}
            {paginatedApplicants.length === 0 && (
              <TableRow>
                <TableCell colSpan={12} align="center" sx={{ height: 120 }}>
                  No uploaded applicants found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1} mt={2}>
        <Typography fontSize="14px" fontWeight="bold">
          Total Applicants: {filteredApplicants.length}
        </Typography>
        <Box display="flex" alignItems="center" gap={1}>
          <Button size="small" variant="outlined" disabled={currentPage === 1} onClick={() => setCurrentPage(1)}>
            First
          </Button>
          <Button
            size="small"
            variant="outlined"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
          >
            Prev
          </Button>
          <Typography fontSize="13px">
            Page {currentPage} of {totalPages}
          </Typography>
          <Button
            size="small"
            variant="outlined"
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
          >
            Next
          </Button>
          <Button
            size="small"
            variant="outlined"
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage(totalPages)}
          >
            Last
          </Button>
        </Box>
      </Box>

      <Dialog open={skippedDialogOpen} onClose={() => setSkippedDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Skipped Applicant Rows</DialogTitle>
        <DialogContent dividers>
          {skippedRows.length === 0 ? (
            <Typography variant="body2">No skipped rows details provided.</Typography>
          ) : (
            <List dense>
              {skippedRows.map((item, index) => (
                <ListItem key={`${item.rowNumber || index}-${item.applicantNumber || "NA"}`} sx={{ px: 0 }}>
                  <ListItemText
                    primary={`${index + 1}. Row ${item.rowNumber || "?"} - ${item.applicantNumber || "Unknown applicant"}`}
                    secondary={item.reason || "No reason provided"}
                  />
                </ListItem>
              ))}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSkippedDialogOpen(false)} variant="contained">
            Close
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={Boolean(assignTarget)}
        onClose={() => setAssignTarget(null)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Assign Student Number</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" sx={{ mb: 1 }}>
            <strong>Applicant Number:</strong> {assignTarget?.applicant_number || "N/A"}
          </Typography>
          <Typography variant="body2" sx={{ mb: 1 }}>
            <strong>Name:</strong> {assignTarget?.first_name} {assignTarget?.middle_name}{" "}
            {assignTarget?.last_name}
          </Typography>
          <Typography variant="body2" sx={{ mb: 1 }}>
            <strong>Program:</strong> {assignTarget?.program_display || assignTarget?.program || "N/A"}
          </Typography>
          <Typography variant="body2" sx={{ mb: 1 }}>
            <strong>Email:</strong> {assignTarget?.email_address || "N/A"}
          </Typography>
          <Typography variant="body2" sx={{ mb: 2 }}>
            <strong>Contact:</strong> {assignTarget?.contact_num || "N/A"}
          </Typography>
          <TextField
            fullWidth
            size="small"
            label="Student Number"
            value={customStudentNumber}
            onChange={(event) => setCustomStudentNumber(event.target.value)}
            error={Boolean(studentNumberError)}
            helperText={
              checkingStudentNumber
                ? "Checking availability..."
                : studentNumberError || "Enter the student number to assign."
            }
            disabled={actionLoadingId === assignTarget?.id}
          />
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            This will create the student account, enrollment records, QR code, and send the student
            number email.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAssignTarget(null)} color="error" variant="outlined">
            Cancel
          </Button>
          <Button
            onClick={handleAutoAssignTraditionalStudentNumber}
            variant="outlined"
            disabled={actionLoadingId === assignTarget?.id}
          >
            Auto Assign
          </Button>
          <Button
            onClick={handleAssignStudentNumber}
            variant="contained"
            disabled={
              actionLoadingId === assignTarget?.id ||
              !customStudentNumber.trim() ||
              Boolean(studentNumberError) ||
              checkingStudentNumber
            }
            sx={{ backgroundColor: mainButtonColor }}
          >
            Assign
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={Boolean(changeWarningTarget)}
        onClose={() => setChangeWarningTarget(null)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Confirm Student Number Change</DialogTitle>
        <DialogContent dividers>
          <Typography sx={{ mb: 2 }}>
            Changing a student number may affect enrollment records, course tagging, payments,
            medical records, QR codes, and other modules that reference the old number.
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Only continue if you are sure the new student number is correct and you understand the
            possible consequences during the enrollment process.
          </Typography>
          <Typography variant="body2">
            <strong>Current:</strong> {changeWarningTarget?.currentStudentNumber}
          </Typography>
          <Typography variant="body2">
            <strong>New:</strong> {changeWarningTarget?.nextStudentNumber}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setChangeWarningTarget(null)} color="error" variant="outlined">
            Cancel
          </Button>
          <Button
            onClick={handleConfirmStudentNumberChange}
            variant="contained"
            color="warning"
            disabled={actionLoadingId === changeWarningTarget?.id}
          >
            Confirm Change
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Delete Uploaded Applicant</DialogTitle>
        <DialogContent dividers>
          <Typography>
            Delete{" "}
            <strong>
              {deleteTarget?.first_name} {deleteTarget?.last_name}
            </strong>{" "}
            from the uploaded applicants list?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)} color="error" variant="outlined">
            Cancel
          </Button>
          <Button
            onClick={handleDeleteApplicant}
            color="error"
            variant="contained"
            disabled={actionLoadingId === deleteTarget?.id}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3500}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
      >
        <Alert
          severity={snackbar.severity}
          variant="filled"
          onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default UploadApplicants;
