import React, { useState, useEffect, useContext } from "react";
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
  TableBody,
  Paper,
  Grid,
  Snackbar,
  Alert,
  FormControlLabel,
  Switch,
  FormControl,
  Select,
  MenuItem,
  TableContainer,
  Checkbox,
  Collapse,
  Chip,
  Tooltip,
  Autocomplete,
} from "@mui/material";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import Unauthorized from "../components/Unauthorized";
import LoadingOverlay from "../components/LoadingOverlay";
import API_BASE_URL from "../apiConfig";
const API = `${API_BASE_URL}/api/email-templates`;
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import SaveIcon from "@mui/icons-material/Save";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import PeopleIcon from "@mui/icons-material/People";
import PersonRemoveIcon from "@mui/icons-material/PersonRemove";
import SearchIcon from "@mui/icons-material/Search";
import { getFlatAuditHeaders } from "../utils/auditEvents";
import useAuditMac from "../utils/useAuditMac";

export default function EmailTemplateManager() {
  useAuditMac();
  const settings = useContext(SettingsContext);
  const colors = settings?.colors || {};
  const headerColor = colors.header || "#1976d2";
  const [titleColor, setTitleColor] = useState("#000000");
  const [borderColor, setBorderColor] = useState("#000000");

  useEffect(() => {
    if (!settings) return;
    if (colors.title) setTitleColor(colors.title);
    if (colors.border) setBorderColor(colors.border);
  }, [settings]);

  // ── Auth / Access ──────────────────────────────────────────────────────────
  const [userRole, setUserRole] = useState("");
  const [hasAccess, setHasAccess] = useState(null);
  const [canCreate, setCanCreate] = useState(false);
  const [canEdit, setCanEdit] = useState(false);
  const [canDelete, setCanDelete] = useState(false);
  const [loading, setLoading] = useState(false);
  const [employeeID, setEmployeeID] = useState("");

  const pageId = 67;

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
      setUserRole(storedRole);
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

  const checkAccess = async (empID) => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/page_access/${empID}/${pageId}`,
      );
      if (response.data && response.data.page_privilege === 1) {
        setHasAccess(true);
        setCanCreate(Number(response.data?.can_create) === 1);
        setCanEdit(Number(response.data?.can_edit) === 1);
        setCanDelete(Number(response.data?.can_delete) === 1);
      } else {
        setHasAccess(false);
      }
    } catch (error) {
      console.error("Error checking access:", error);
      setHasAccess(false);
      setLoading(false);
    }
  };

  // ── Master data ────────────────────────────────────────────────────────────
  const [rows, setRows] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [activeCurriculums, setActiveCurriculums] = useState([]);
  const [allEmployees, setAllEmployees] = useState([]);

  useEffect(() => {
    loadTemplates();
    fetchDepartments();
    fetchCurriculums();
    fetchAllEmployees();
  }, []);

  const loadTemplates = async () => {
    try {
      const res = await axios.get(API);
      setRows(res.data || []);
    } catch (err) {
      showSnack("Failed to load templates", "error");
    }
  };

  const fetchDepartments = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/departments`);
      setDepartments(res.data || []);
    } catch (err) {
      console.error("Failed to fetch departments", err);
    }
  };

  const fetchCurriculums = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/get_active_curriculum`);
      setActiveCurriculums(res.data || []);
    } catch (err) {
      console.error("Failed to fetch active curriculums", err);
    }
  };

  const fetchAllEmployees = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/registrars`);
      setAllEmployees(res.data || []);
    } catch (err) {
      console.error("Failed to fetch employees", err);
    }
  };

  // ── Snackbar ───────────────────────────────────────────────────────────────
  const [snack, setSnack] = useState({ open: false, message: "", severity: "info" });
  const showSnack = (message, severity = "info") =>
    setSnack({ open: true, message, severity });
  const handleCloseSnack = (_, reason) => {
    if (reason === "clickaway") return;
    setSnack((prev) => ({ ...prev, open: false }));
  };

  // ── Pagination ─────────────────────────────────────────────────────────────
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 50;
  const totalPages = Math.max(1, Math.ceil(rows.length / rowsPerPage));
  const paginatedRows = rows.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage,
  );

  // ── Expandable tagged-employees panel ──────────────────────────────────────
  const [expandedTemplateId, setExpandedTemplateId] = useState(null);
  const [taggedEmployeesByTemplate, setTaggedEmployeesByTemplate] = useState({});
  const [loadingTagged, setLoadingTagged] = useState({});

  const toggleExpandTemplate = async (templateId) => {
    if (expandedTemplateId === templateId) {
      setExpandedTemplateId(null);
      return;
    }
    setExpandedTemplateId(templateId);
    if (!taggedEmployeesByTemplate[templateId]) {
      setLoadingTagged((prev) => ({ ...prev, [templateId]: true }));
      try {
        const res = await axios.get(`${API}/${templateId}/employees`);
        setTaggedEmployeesByTemplate((prev) => ({
          ...prev,
          [templateId]: res.data || [],
        }));
      } catch (err) {
        showSnack("Failed to load tagged employees", "error");
      } finally {
        setLoadingTagged((prev) => ({ ...prev, [templateId]: false }));
      }
    }
  };

  // ── Untag confirm dialog ───────────────────────────────────────────────────
  const [openUntagDialog, setOpenUntagDialog] = useState(false);
  const [untagTarget, setUntagTarget] = useState(null);

  const handleOpenUntagDialog = (template, employee) => {
    if (!canDelete) {
      showSnack("You do not have permission to remove tagged employees", "error");
      return;
    }
    const employeeName =
      [employee.last_name, employee.first_name, employee.middle_name]
        .filter(Boolean)
        .join(", ") ||
      employee.email ||
      String(employee.employee_id);
    setUntagTarget({
      templateId: template.template_id,
      templateName: template.sender_name,
      employeeId: employee.employee_id,
      employeeName,
    });
    setOpenUntagDialog(true);
  };

  // ── Fixed untag: use already-loaded state, update directly ────────────────
  const handleConfirmUntag = async () => {
    if (!untagTarget) return;
    const { templateId, employeeId } = untagTarget;

    const currentTagged = taggedEmployeesByTemplate[templateId] || [];
    const remaining = currentTagged.filter(
      (e) => String(e.employee_id) !== String(employeeId),
    );

    if (remaining.length === 0) {
      showSnack("Cannot remove — at least one employee must remain tagged.", "warning");
      setOpenUntagDialog(false);
      setUntagTarget(null);
      return;
    }

    try {
      await axios.put(
        `${API}/${templateId}/employees`,
        { employee_ids: remaining.map((e) => String(e.employee_id)) },
        getAuditHeaders(),
      );
      showSnack("Employee removed successfully", "success");
      // Update local state directly — no re-fetch needed
      setTaggedEmployeesByTemplate((prev) => ({
        ...prev,
        [templateId]: remaining,
      }));
      loadTemplates(); // refresh employee count in main table
    } catch (err) {
      showSnack("Failed to remove employee from template", "error");
    } finally {
      setOpenUntagDialog(false);
      setUntagTarget(null);
    }
  };

  // ── Form state ─────────────────────────────────────────────────────────────
  // selectedPrograms: array of { curriculum_id, dprtmnt_id, program_code, program_description, major, dprtmnt_name }
  // mirrors how RegisterRegistrar uses `scopes`
  const [selectedPrograms, setSelectedPrograms] = useState([]);
  const [openProgDepts, setOpenProgDepts] = useState(new Set());

  const [form, setForm] = useState({
    sender_name: "",
    is_active: true,
  });

  const [taggedEmployees, setTaggedEmployees] = useState([]);
  const [openEmpDepts, setOpenEmpDepts] = useState(new Set());

  const [editing, setEditing] = useState(null);
  const [openFormDialog, setOpenFormDialog] = useState(false);

  const resetForm = () => {
    setForm({ sender_name: "", is_active: true });
    setSelectedPrograms([]);
    setOpenProgDepts(new Set());
    setTaggedEmployees([]);
    setOpenEmpDepts(new Set());
  };

  // ── Program helpers (mirrors RegisterRegistrar scope helpers) ──────────────
  const getProgramLabel = (p) => {
    if (!p) return "N/A";
    const major = p.major ? ` (${p.major})` : "";
    return `${p.program_code || "N/A"} - ${p.program_description || "Unknown"}${major}`;
  };

  // Programs grouped by dept — using activeCurriculums (same idea as programs in RegisterRegistrar)
  const uniqueProgramsForDept = (deptId) => {
    const map = new Map();
    activeCurriculums
      .filter((p) => String(p.dprtmnt_id) === String(deptId))
      .forEach((p) => {
        if (!map.has(p.curriculum_id)) map.set(p.curriculum_id, p);
      });
    return [...map.values()];
  };

  const isProgramSelected = (p) =>
    selectedPrograms.some(
      (s) =>
        String(s.curriculum_id) === String(p.curriculum_id) &&
        String(s.dprtmnt_id) === String(p.dprtmnt_id),
    );

  const toggleProgram = (p, deptName) => {
    if (isProgramSelected(p)) {
      setSelectedPrograms((prev) =>
        prev.filter(
          (s) =>
            !(
              String(s.curriculum_id) === String(p.curriculum_id) &&
              String(s.dprtmnt_id) === String(p.dprtmnt_id)
            ),
        ),
      );
    } else {
      setSelectedPrograms((prev) => [
        ...prev,
        {
          curriculum_id: p.curriculum_id,
          dprtmnt_id: p.dprtmnt_id,
          program_code: p.program_code,
          program_description: p.program_description,
          major: p.major,
          dprtmnt_name: deptName,
        },
      ]);
    }
  };

  const toggleDeptAllPrograms = (dept, progs, checked) => {
    if (checked) {
      const toAdd = progs.filter((p) => !isProgramSelected(p));
      setSelectedPrograms((prev) => [
        ...prev,
        ...toAdd.map((p) => ({
          curriculum_id: p.curriculum_id,
          dprtmnt_id: p.dprtmnt_id,
          program_code: p.program_code,
          program_description: p.program_description,
          major: p.major,
          dprtmnt_name: dept.dprtmnt_name,
        })),
      ]);
    } else {
      setSelectedPrograms((prev) =>
        prev.filter((s) => String(s.dprtmnt_id) !== String(dept.dprtmnt_id)),
      );
    }
  };

  const toggleProgDeptOpen = (deptId) => {
    setOpenProgDepts((prev) => {
      const next = new Set(prev);
      next.has(deptId) ? next.delete(deptId) : next.add(deptId);
      return next;
    });
  };

  // ── Employee helpers ───────────────────────────────────────────────────────
  const employeesByDept = departments.reduce((acc, dept) => {
    const emps = allEmployees.filter(
      (e) => String(e.dprtmnt_id) === String(dept.dprtmnt_id),
    );
    if (emps.length > 0) acc[dept.dprtmnt_id] = emps;
    return acc;
  }, {});

  const unassignedEmployees = allEmployees.filter(
    (e) => !departments.some((d) => String(d.dprtmnt_id) === String(e.dprtmnt_id)),
  );

  const getEmployeeFullName = (emp) => {
    const name = [emp.last_name, emp.first_name, emp.middle_name]
      .filter(Boolean)
      .join(", ");
    return name || emp.email || String(emp.employee_id);
  };

  const isEmployeeTagged = (emp) =>
    taggedEmployees.some((e) => String(e.employee_id) === String(emp.employee_id));

  const toggleEmployee = (emp, deptName) => {
    if (isEmployeeTagged(emp)) {
      setTaggedEmployees((prev) =>
        prev.filter((e) => String(e.employee_id) !== String(emp.employee_id)),
      );
    } else {
      setTaggedEmployees((prev) => [...prev, { ...emp, dprtmnt_name: deptName }]);
    }
  };

  const toggleDeptAllEmployees = (deptId, deptName, emps, checked) => {
    if (checked) {
      const toAdd = emps.filter((e) => !isEmployeeTagged(e));
      setTaggedEmployees((prev) => [
        ...prev,
        ...toAdd.map((e) => ({ ...e, dprtmnt_name: deptName })),
      ]);
    } else {
      const empIds = new Set(emps.map((e) => String(e.employee_id)));
      setTaggedEmployees((prev) =>
        prev.filter((e) => !empIds.has(String(e.employee_id))),
      );
    }
  };

  const toggleEmpDeptOpen = (deptId) => {
    setOpenEmpDepts((prev) => {
      const next = new Set(prev);
      next.has(deptId) ? next.delete(deptId) : next.add(deptId);
      return next;
    });
  };

  // ── Open Add dialog ────────────────────────────────────────────────────────
  const handleOpenAdd = () => {
    if (!canCreate) {
      showSnack("You do not have permission to create email templates", "error");
      return;
    }
    setEditing(null);
    resetForm();
    setOpenFormDialog(true);
  };

  // ── Open Edit dialog ───────────────────────────────────────────────────────
  const handleEdit = async (row) => {
    if (!canEdit) {
      showSnack("You do not have permission to edit email templates", "error");
      return;
    }
    setEditing(row.template_id);

    // Re-build selectedPrograms from row.programs (which now carry dprtmnt_id)
    const existingPrograms = (row.programs || []).map((p) => {
      const dept = departments.find((d) => String(d.dprtmnt_id) === String(p.dprtmnt_id));
      return {
        curriculum_id: p.curriculum_id,
        dprtmnt_id: p.dprtmnt_id,
        program_code: p.program_code,
        program_description: p.program_description,
        major: p.major,
        dprtmnt_name: dept?.dprtmnt_name || p.dprtmnt_name || "",
      };
    });

    // Load currently tagged employees
    let existingTagged = [];
    try {
      const empRes = await axios.get(`${API}/${row.template_id}/employees`);
      existingTagged = empRes.data || [];
    } catch (err) {
      console.error("Failed to load tagged employees for edit", err);
    }

    setForm({
      sender_name: row.sender_name || "",
      is_active: !!row.is_active,
    });
    setSelectedPrograms(existingPrograms);
    setOpenProgDepts(new Set());

    const preTagged = existingTagged.map((et) => {
      const full = allEmployees.find(
        (e) => String(e.employee_id) === String(et.employee_id),
      );
      return full
        ? { ...full }
        : {
          employee_id: et.employee_id,
          first_name: et.first_name,
          middle_name: et.middle_name,
          last_name: et.last_name,
          email: et.email,
          dprtmnt_id: et.dprtmnt_id,
        };
    });
    setTaggedEmployees(preTagged);
    setOpenEmpDepts(new Set());
    setOpenFormDialog(true);
  };

  // ── Save ───────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!form.sender_name.trim()) {
      showSnack("Sender name is required", "warning");
      return false;
    }
    if (selectedPrograms.length === 0) {
      showSnack("At least one program is required", "warning");
      return false;
    }

    const payload = {
      sender_name: form.sender_name,
      // Send array of { curriculum_id, dprtmnt_id } so backend stores both
      program_ids: selectedPrograms.map((p) => ({
        curriculum_id: String(p.curriculum_id),
        dprtmnt_id: p.dprtmnt_id ?? null,
      })),
      employee_ids: taggedEmployees.map((e) => String(e.employee_id)),
      is_active: form.is_active,
    };

    try {
      if (editing) {
        if (!canEdit) { showSnack("No permission to edit", "error"); return false; }
        await axios.put(`${API}/${editing}`, payload, getAuditHeaders());
        showSnack("Template updated successfully", "success");
        setTaggedEmployeesByTemplate((prev) => {
          const next = { ...prev };
          delete next[editing];
          return next;
        });
      } else {
        if (!canCreate) { showSnack("No permission to create", "error"); return false; }
        await axios.post(API, payload, getAuditHeaders());
        showSnack("Template added successfully", "success");
      }
      resetForm();
      setEditing(null);
      loadTemplates();
      return true;
    } catch (err) {
      console.error("Error saving template:", err);
      showSnack(err.response?.data?.error || "Failed to save template", "error");
      return false;
    }
  };

  // ── Delete ─────────────────────────────────────────────────────────────────
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState(null);

  const handleDelete = async (id) => {
    if (!canDelete) { showSnack("No permission to delete", "error"); return; }
    try {
      await axios.delete(`${API}/${id}`, getAuditHeaders());
      showSnack("Template deleted successfully", "success");
      loadTemplates();
    } catch (err) {
      showSnack("Failed to delete template", "error");
    }
  };

  // ── Pagination bar ─────────────────────────────────────────────────────────
  const PaginationControls = ({ showAddButton }) => (
    <TableCell
      colSpan={10}
      sx={{
        border: `1px solid ${borderColor}`,
        py: 0.5,
        backgroundColor: headerColor,
        color: "white",
      }}
    >
      <Box display="flex" justifyContent="space-between" alignItems="center">
        <Typography fontSize="14px" fontWeight="bold" color="white">
          Total Email Accounts Records: {rows.length}
        </Typography>
        <Box display="flex" alignItems="center" gap={1}>
          {[
            { label: "First", action: () => setCurrentPage(1), disabled: currentPage === 1 },
            { label: "Prev", action: () => setCurrentPage((p) => Math.max(p - 1, 1)), disabled: currentPage === 1 },
          ].map(({ label, action, disabled }) => (
            <Button key={label} onClick={action} disabled={disabled} variant="outlined" size="small"
              sx={{
                minWidth: 80, color: "white", borderColor: "white", backgroundColor: "transparent",
                "&:hover": { borderColor: "white", backgroundColor: "rgba(255,255,255,0.1)" },
                "&.Mui-disabled": { color: "white", borderColor: "white", opacity: 1 }
              }}>
              {label}
            </Button>
          ))}
          <FormControl size="small" sx={{ minWidth: 80 }}>
            <Select value={currentPage} onChange={(e) => setCurrentPage(Number(e.target.value))}
              sx={{
                fontSize: "12px", height: 36, color: "white", border: "1px solid white",
                backgroundColor: "transparent",
                ".MuiOutlinedInput-notchedOutline": { borderColor: "white" },
                "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "white" },
                "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: "white" },
                "& svg": { color: "white" }
              }}
              MenuProps={{ PaperProps: { sx: { maxHeight: 200 } } }}>
              {Array.from({ length: totalPages }, (_, i) => (
                <MenuItem key={i + 1} value={i + 1}>Page {i + 1}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <Typography fontSize="11px" color="white">of {totalPages} page{totalPages > 1 ? "s" : ""}</Typography>
          {[
            { label: "Next", action: () => setCurrentPage((p) => Math.min(p + 1, totalPages)), disabled: currentPage === totalPages },
            { label: "Last", action: () => setCurrentPage(totalPages), disabled: currentPage === totalPages },
          ].map(({ label, action, disabled }) => (
            <Button key={label} onClick={action} disabled={disabled} variant="outlined" size="small"
              sx={{
                minWidth: 80, color: "white", borderColor: "white", backgroundColor: "transparent",
                "&:hover": { borderColor: "white", backgroundColor: "rgba(255,255,255,0.1)" },
                "&.Mui-disabled": { color: "white", borderColor: "white", opacity: 1 }
              }}>
              {label}
            </Button>
          ))}
          {showAddButton && (
            <Button variant="contained" onClick={handleOpenAdd}
              sx={{
                backgroundColor: "#1976d2", color: "#fff", fontWeight: "bold",
                borderRadius: "8px", width: "250px", textTransform: "none", px: 2, border: "1px solid white"
              }}>
              + Add Email Account
            </Button>
          )}
        </Box>
      </Box>
    </TableCell>
  );

  // ── Guards ─────────────────────────────────────────────────────────────────
  if (loading || hasAccess === null) return <LoadingOverlay open={loading} message="Loading..." />;
  if (!hasAccess) return <Unauthorized />;

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

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <Box sx={{
      height: "calc(100vh - 150px)", overflowY: "auto", paddingRight: 1,
      backgroundColor: "transparent", mt: 1, padding: 2
    }}>

      {/* Header */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", mb: 2 }}>
        <Typography variant="h4" sx={{ fontWeight: "bold", color: titleColor, fontSize: "36px" }}>
          EMAIL TEMPLATE MANAGER
        </Typography>
      </Box>
      <hr style={{ border: "1px solid #ccc", width: "100%" }} />
      <br />

      {/* Top pagination */}
      <TableContainer component={Paper} sx={{ width: "100%" }}>
        <Table size="small"><TableHead><TableRow><PaginationControls showAddButton /></TableRow></TableHead></Table>
      </TableContainer>

      {/* Main table */}
      <Box sx={{ backgroundColor: "#f5f5f5", border: `1px solid ${borderColor}`, borderRadius: 1 }}>
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow>
              {["#", "Gmail Account", "Departments", "Programs", "Tagged Employees", "Active", "Actions"].map((h) => (
                <TableCell key={h} sx={{
                  border: `1px solid ${borderColor}`, backgroundColor: "#F5F5F5",
                  color: "#000", fontWeight: 600, ...(h === "Actions" ? { width: "220px", textAlign: "center" } : {})
                }}>
                  {h}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>

          <TableBody sx={{
            "& .MuiTableRow-root:nth-of-type(odd)": { backgroundColor: "#ffffff" },
            "& .MuiTableRow-root:nth-of-type(even)": { backgroundColor: "lightgray" },
          }}>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ border: `1px solid ${borderColor}` }}>
                  No templates found.
                </TableCell>
              </TableRow>
            ) : (
              paginatedRows.map((r, index) => {
                const isExpanded = expandedTemplateId === r.template_id;
                const tagged = taggedEmployeesByTemplate[r.template_id] || [];
                const isLoadingTagged = loadingTagged[r.template_id];
                const programs = r.programs || [];
                const deptNames = r.department_names || [];

                return (
                  <React.Fragment key={r.template_id}>
                    <TableRow>
                      <TableCell sx={{ border: `1px solid ${borderColor}` }}>
                        {(currentPage - 1) * rowsPerPage + index + 1}
                      </TableCell>
                      <TableCell sx={{ border: `1px solid ${borderColor}` }}>{r.sender_name}</TableCell>

                      {/* Departments — derived from programs */}
                      <TableCell sx={{ border: `1px solid ${borderColor}` }}>
                        {deptNames.length === 0 ? (
                          <Typography fontSize="12px" color="text.secondary">N/A</Typography>
                        ) : (
                          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                            {deptNames.map((name) => (
                              <Chip key={name} label={name} size="small"
                                sx={{ fontSize: "11px", height: 22, backgroundColor: "#e3f2fd" }} />
                            ))}
                          </Box>
                        )}
                      </TableCell>

                      {/* Programs chips */}
                      <TableCell sx={{ border: `1px solid ${borderColor}` }}>
                        {programs.length === 0 ? (
                          <Typography fontSize="12px" color="text.secondary">N/A</Typography>
                        ) : (
                          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                            {programs.map((p) => (
                              <Chip key={`${p.curriculum_id}-${p.dprtmnt_id}`}
                                label={`${p.program_code || "N/A"}${p.major ? ` (${p.major})` : ""}`}
                                size="small" sx={{ fontSize: "11px", height: 22 }}
                                title={p.program_description} />
                            ))}
                          </Box>
                        )}
                      </TableCell>

                      {/* Expand tagged employees */}
                      {/* Expand tagged employees */}
                      <TableCell sx={{ border: `1px solid ${borderColor}` }}>
                        <Tooltip title={isExpanded ? "Hide tagged employees" : "View tagged employees"}>
                          <Button size="small" variant="text"
                            onClick={() => toggleExpandTemplate(r.template_id)}
                            startIcon={<PeopleIcon fontSize="small" />}
                            endIcon={isExpanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
                            sx={{ textTransform: "none", color: "#1976d2", fontWeight: 600, fontSize: "13px", px: 1 }}>
                            {Number(r.tagged_employee_count || 0)} Employee
                            {Number(r.tagged_employee_count || 0) !== 1 ? "s" : ""}
                          </Button>
                        </Tooltip>
                      </TableCell>
                      <TableCell sx={{ border: `1px solid ${borderColor}` }}>
                        {r.is_active ? "Yes" : "No"}
                      </TableCell>

                      <TableCell sx={{ width: "220px", border: `1px solid ${borderColor}` }}>
                        <Box sx={{ display: "flex", gap: 1 }}>
                          <Button variant="contained" size="small" onClick={() => handleEdit(r)}
                            sx={{
                              backgroundColor: "green", color: "white", borderRadius: "5px",
                              padding: "8px 14px", width: "100px", height: "40px",
                              display: "flex", alignItems: "center", gap: "5px"
                            }}>
                            <EditIcon fontSize="small" /> Edit
                          </Button>
                          <Button variant="contained" size="small"
                            onClick={() => { setTemplateToDelete(r); setOpenDeleteDialog(true); }}
                            sx={{
                              backgroundColor: "#9E0000", color: "white", borderRadius: "5px",
                              padding: "8px 14px", width: "100px", height: "40px",
                              display: "flex", alignItems: "center", gap: "5px"
                            }}>
                            <DeleteIcon fontSize="small" /> Delete
                          </Button>
                        </Box>
                      </TableCell>
                    </TableRow>

                    {/* Expandable tagged-employees sub-table */}
                    <TableRow>
                      <TableCell colSpan={7} sx={{ p: 0, border: `1px solid ${borderColor}` }}>
                        <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                          <Box sx={{ p: 2, backgroundColor: "#f5f5f5" }}>

                            {/* Sub-table header label */}
                            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                              <PeopleIcon sx={{ color: headerColor, fontSize: 18 }} />
                              <Typography fontSize="13px" fontWeight={700} color={headerColor}>
                                Tagged Employees — {r.sender_name}
                              </Typography>
                              <Chip label={tagged.length} size="small"
                                sx={{ backgroundColor: headerColor, color: "white", fontSize: "11px", height: 20 }} />
                            </Box>

                            {isLoadingTagged ? (
                              <Typography fontSize="13px" color="text.secondary">Loading employees…</Typography>
                            ) : tagged.length === 0 ? (
                              <Box sx={{
                                py: 2, textAlign: "center", border: `1px dashed ${borderColor}`,
                                borderRadius: 1, backgroundColor: "#fff"
                              }}>
                                <Typography fontSize="13px" color="text.secondary">
                                  No employees tagged yet.
                                </Typography>
                                <Button size="small" variant="outlined"
                                  sx={{
                                    mt: 1, textTransform: "none", fontSize: "12px",
                                    borderColor: headerColor,
                                    color: headerColor
                                  }}
                                  onClick={() => handleEdit(r)}>
                                  Edit to Tag Employees
                                </Button>
                              </Box>
                            ) : (
                              <Table size="small" sx={{ border: `1px solid ${borderColor}` }}>
                                <TableHead>
                                  <TableRow sx={{ backgroundColor: headerColor }}>
                                    {["#", "Employee ID", "Name", "Email", "Position", "Action"].map((h) => (
                                      <TableCell key={h} align={h === "Action" ? "center" : "left"}
                                        sx={{
                                          color: "black", fontWeight: 700, fontSize: "12px",
                                          border: `1px solid ${borderColor}`, py: 0.8,
                                          ...(h === "Action" ? { width: 100 } : {})
                                        }}>
                                        {h}
                                      </TableCell>
                                    ))}
                                  </TableRow>
                                </TableHead>
                                <TableBody>
                                  {tagged.map((emp, ei) => (
                                    <TableRow key={emp.employee_id}
                                      sx={{ backgroundColor: ei % 2 === 0 ? "#ffffff" : "lightgray" }}>
                                      <TableCell sx={{ fontSize: "12px", border: `1px solid ${borderColor}`, py: 0.7 }}>{ei + 1}</TableCell>
                                      <TableCell sx={{ fontSize: "12px", border: `1px solid ${borderColor}`, py: 0.7 }}>{emp.employee_id}</TableCell>
                                      <TableCell sx={{ fontSize: "12px", border: `1px solid ${borderColor}`, py: 0.7 }}>
                                        {[emp.last_name, emp.first_name, emp.middle_name].filter(Boolean).join(", ") || "—"}
                                      </TableCell>
                                      <TableCell sx={{ fontSize: "12px", border: `1px solid ${borderColor}`, py: 0.7 }}>{emp.email || "—"}</TableCell>
                                      <TableCell sx={{ fontSize: "12px", border: `1px solid ${borderColor}`, py: 0.7 }}>{emp.position || "—"}</TableCell>
                                      <TableCell align="center" sx={{ border: `1px solid ${borderColor}`, py: 0.7 }}>
                                        <Tooltip title="Remove from template">
                                          <Button variant="contained" size="small"
                                            startIcon={<PersonRemoveIcon fontSize="small" />}
                                            sx={{
                                              backgroundColor: "#9E0000", color: "white", fontSize: "11px",
                                              textTransform: "none", height: 30, px: 1.5,
                                              "&:hover": { backgroundColor: "#7b0000" }
                                            }}
                                            onClick={() => handleOpenUntagDialog(r, emp)}>
                                            Remove
                                          </Button>
                                        </Tooltip>
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            )}
                          </Box>
                        </Collapse>
                      </TableCell>
                    </TableRow>
                  </React.Fragment>
                );
              })
            )}
          </TableBody>
        </Table>
      </Box>

      {/* Bottom pagination */}
      <TableContainer component={Paper} sx={{ width: "100%" }}>
        <Table size="small"><TableHead><TableRow><PaginationControls showAddButton={false} /></TableRow></TableHead></Table>
      </TableContainer>

      {/* ── Delete Dialog ── */}
      <Dialog open={openDeleteDialog} onClose={() => setOpenDeleteDialog(false)}>
        <DialogTitle>Confirm Delete Template</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete <b>{templateToDelete?.sender_name}</b>?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button color="error" variant="outlined" onClick={() => setOpenDeleteDialog(false)}>Cancel</Button>
          <Button color="error" variant="contained" onClick={() => {
            handleDelete(templateToDelete.template_id);
            setOpenDeleteDialog(false);
            setTemplateToDelete(null);
          }}>Yes, Delete</Button>
        </DialogActions>
      </Dialog>

      {/* ── Untag Dialog ── */}
      <Dialog open={openUntagDialog} onClose={() => setOpenUntagDialog(false)}>
        <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <PersonRemoveIcon sx={{ color: "#9E0000" }} /> Remove Tagged Employee
        </DialogTitle>
        <DialogContent>
          <Typography>
            Remove <b>{untagTarget?.employeeName}</b> from <b>{untagTarget?.templateName}</b>?
          </Typography>
          <Typography fontSize="13px" color="text.secondary" sx={{ mt: 1 }}>
            This employee will no longer receive emails sent through this template.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button color="error" variant="outlined"
            onClick={() => { setOpenUntagDialog(false); setUntagTarget(null); }}>Cancel</Button>
          <Button color="error" variant="contained" startIcon={<PersonRemoveIcon />} onClick={handleConfirmUntag}>
            Yes, Remove
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Add / Edit Dialog ── */}
      <Dialog open={openFormDialog} onClose={() => { setOpenFormDialog(false); resetForm(); setEditing(null); }}
        maxWidth="md" fullWidth
        PaperProps={{ sx: { borderRadius: 3, overflow: "hidden", boxShadow: 6 } }}>

        <DialogTitle sx={{
          background: headerColor, color: "#fff",
          fontWeight: 700, fontSize: "1.2rem", py: 2
        }}>
          {editing ? "Edit Email Template" : "New Email Registration"}
        </DialogTitle>

        <DialogContent sx={{ p: 3 }}>
          <Grid container spacing={2}>

            {/* ── Sender Name ── */}
            <Grid item xs={12} mt={2}>
              <Typography fontWeight={700} mb={1}>Email Account Details</Typography>
              <TextField fullWidth label="Sender Name (Gmail Account)"
                value={form.sender_name}
                onChange={(e) => setForm({ ...form, sender_name: e.target.value })} />
            </Grid>

            {/* ── Active toggle ── */}
            <Grid item xs={12}>
              <FormControlLabel
                control={<Switch checked={form.is_active}
                  onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />}
                label="Active" />
            </Grid>

            {/* ══════════════════════════════════════════════════════════════
                PROGRAMS — collapsible dept accordion (same as RegisterRegistrar scopes)
            ══════════════════════════════════════════════════════════════ */}
            <Grid item xs={12}>
              <Typography fontWeight={700} mb={0.5}>Programs</Typography>
              <Typography fontSize="13px" color="text.secondary" mb={1}>
                Select programs from <b>any department</b>. Use search or expand departments below.
              </Typography>

              {/* Autocomplete quick-search across ALL curriculums */}
              <Autocomplete
                size="small"
                options={activeCurriculums.filter((p) => !isProgramSelected(p))}
                getOptionLabel={(p) => getProgramLabel(p)}
                groupBy={(p) => {
                  const dept = departments.find((d) => String(d.dprtmnt_id) === String(p.dprtmnt_id));
                  return dept ? `${dept.dprtmnt_name} (${dept.dprtmnt_code || ""})` : "Other";
                }}
                onChange={(_, value) => {
                  if (!value) return;
                  const dept = departments.find((d) => String(d.dprtmnt_id) === String(value.dprtmnt_id));
                  if (!isProgramSelected(value)) {
                    setSelectedPrograms((prev) => [
                      ...prev,
                      {
                        curriculum_id: value.curriculum_id,
                        dprtmnt_id: value.dprtmnt_id,
                        program_code: value.program_code,
                        program_description: value.program_description,
                        major: value.major,
                        dprtmnt_name: dept?.dprtmnt_name || "",
                      },
                    ]);
                  }
                }}
                renderInput={(params) => (
                  <TextField {...params} placeholder="Search program by name or code…"
                    InputProps={{
                      ...params.InputProps,
                      startAdornment: (
                        <>
                          <SearchIcon sx={{ ml: 0.5, mr: 0.5, color: "gray", fontSize: 18 }} />
                          {params.InputProps.startAdornment}
                        </>
                      ),
                    }} />
                )}
                sx={{ mb: 2 }}
                value={null}
                blurOnSelect
                clearOnBlur
              />

              {/* Collapsible dept accordion for programs */}
              {departments.map((dept) => {
                const progs = uniqueProgramsForDept(dept.dprtmnt_id);
                if (progs.length === 0) return null;

                const checkedCount = progs.filter((p) => isProgramSelected(p)).length;
                const allChecked = checkedCount === progs.length && progs.length > 0;
                const isOpen = openProgDepts.has(dept.dprtmnt_id);

                return (
                  <Box key={dept.dprtmnt_id}
                    sx={{ border: "1px solid #e0e0e0", borderRadius: 2, mb: 1, overflow: "hidden" }}>
                    {/* Dept header */}
                    <Box sx={{
                      display: "flex", alignItems: "center", gap: 1,
                      px: 1.5, py: 0.75, backgroundColor: "#f5f5f5", cursor: "pointer", userSelect: "none"
                    }}>
                      <Checkbox size="small" checked={allChecked}
                        indeterminate={checkedCount > 0 && !allChecked}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => {
                          e.stopPropagation();
                          toggleDeptAllPrograms(dept, progs, e.target.checked);
                        }} />
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1, flex: 1 }}
                        onClick={() => toggleProgDeptOpen(dept.dprtmnt_id)}>
                        <Typography fontSize="13px" fontWeight={600} sx={{ flex: 1 }}>
                          {dept.dprtmnt_name}
                        </Typography>
                        {dept.dprtmnt_code && <Chip label={dept.dprtmnt_code} size="small" />}
                        {checkedCount > 0 && (
                          <Chip label={`${checkedCount}/${progs.length}`} size="small" color="primary" />
                        )}
                        {isOpen
                          ? <ExpandLessIcon fontSize="small" sx={{ color: "text.secondary" }} />
                          : <ExpandMoreIcon fontSize="small" sx={{ color: "text.secondary" }} />}
                      </Box>
                    </Box>

                    {/* Program checkboxes */}
                    {isOpen && (
                      <Box sx={{ px: 2, py: 1, display: "grid", gap: 0.25 }}>
                        {progs.map((p) => (
                          <FormControlLabel key={p.curriculum_id} sx={{ m: 0 }}
                            control={
                              <Checkbox size="small" checked={isProgramSelected(p)}
                                onChange={() => toggleProgram(p, dept.dprtmnt_name)} />
                            }
                            label={
                              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                <Typography fontSize="13px">{p.program_description}</Typography>
                                <Typography fontSize="11px" color="text.secondary">
                                  {p.program_code}{p.major ? ` (${p.major})` : ""}
                                </Typography>
                              </Box>
                            } />
                        ))}
                      </Box>
                    )}
                  </Box>
                );
              })}

              {/* Selected program chips */}
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, mt: 1 }}>
                {selectedPrograms.length === 0 ? (
                  <Typography fontSize="13px" color="text.secondary">No programs selected yet.</Typography>
                ) : (
                  selectedPrograms.map((p, idx) => (
                    <Chip
                      key={`${p.curriculum_id}-${p.dprtmnt_id}-${idx}`}
                      label={`${p.dprtmnt_name ? p.dprtmnt_name + ": " : ""}${p.program_code}${p.major ? ` (${p.major})` : ""}`}
                      size="small" color="primary" variant="outlined"
                      onDelete={() => setSelectedPrograms((prev) =>
                        prev.filter((_, i) => i !== idx)
                      )}
                      sx={{ fontSize: "11px" }} />
                  ))
                )}
              </Box>
            </Grid>

            {/* ══════════════════════════════════════════════════════════════
                EMPLOYEES — collapsible dept accordion (same pattern)
            ══════════════════════════════════════════════════════════════ */}
            <Grid item xs={12}>
              <Typography fontWeight={700} mb={0.5}>Tag Employees</Typography>
              <Typography fontSize="13px" color="text.secondary" mb={1}>
                Tag employees from <b>any department</b>. Use search or expand departments below.
              </Typography>

              {/* Autocomplete quick-search */}
              <Autocomplete
                size="small"
                options={allEmployees.filter((e) => !isEmployeeTagged(e))}
                getOptionLabel={(e) => `${e.employee_id} - ${getEmployeeFullName(e)}`}
                groupBy={(e) => {
                  const dept = departments.find((d) => String(d.dprtmnt_id) === String(e.dprtmnt_id));
                  return dept ? dept.dprtmnt_name : "Other";
                }}
                onChange={(_, value) => {
                  if (!value) return;
                  if (!isEmployeeTagged(value)) {
                    const dept = departments.find((d) => String(d.dprtmnt_id) === String(value.dprtmnt_id));
                    setTaggedEmployees((prev) => [
                      ...prev,
                      { ...value, dprtmnt_name: dept?.dprtmnt_name || "" },
                    ]);
                  }
                }}
                renderInput={(params) => (
                  <TextField {...params} placeholder="Search employee by name or ID…"
                    InputProps={{
                      ...params.InputProps,
                      startAdornment: (
                        <>
                          <SearchIcon sx={{ ml: 0.5, mr: 0.5, color: "gray", fontSize: 18 }} />
                          {params.InputProps.startAdornment}
                        </>
                      ),
                    }} />
                )}
                sx={{ mb: 2 }}
                value={null}
                blurOnSelect
                clearOnBlur
              />

              {/* Collapsible dept accordion for employees */}
              {departments.map((dept) => {
                const emps = employeesByDept[dept.dprtmnt_id];
                if (!emps || emps.length === 0) return null;

                const checkedCount = emps.filter((e) => isEmployeeTagged(e)).length;
                const allChecked = checkedCount === emps.length;
                const isOpen = openEmpDepts.has(dept.dprtmnt_id);

                return (
                  <Box key={dept.dprtmnt_id}
                    sx={{ border: "1px solid #e0e0e0", borderRadius: 2, mb: 1, overflow: "hidden" }}>
                    <Box sx={{
                      display: "flex", alignItems: "center", gap: 1,
                      px: 1.5, py: 0.75, backgroundColor: "#f5f5f5", cursor: "pointer", userSelect: "none"
                    }}>
                      <Checkbox size="small" checked={allChecked}
                        indeterminate={checkedCount > 0 && !allChecked}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => {
                          e.stopPropagation();
                          toggleDeptAllEmployees(dept.dprtmnt_id, dept.dprtmnt_name, emps, e.target.checked);
                        }} />
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1, flex: 1 }}
                        onClick={() => toggleEmpDeptOpen(dept.dprtmnt_id)}>
                        <Typography fontSize="13px" fontWeight={600} sx={{ flex: 1 }}>
                          {dept.dprtmnt_name}
                        </Typography>
                        {dept.dprtmnt_code && <Chip label={dept.dprtmnt_code} size="small" />}
                        {checkedCount > 0 && (
                          <Chip label={`${checkedCount}/${emps.length}`} size="small" color="primary" />
                        )}
                        {isOpen
                          ? <ExpandLessIcon fontSize="small" sx={{ color: "text.secondary" }} />
                          : <ExpandMoreIcon fontSize="small" sx={{ color: "text.secondary" }} />}
                      </Box>
                    </Box>

                    {isOpen && (
                      <Box sx={{ px: 2, py: 1, display: "grid", gap: 0.25 }}>
                        {emps.map((emp) => (
                          <FormControlLabel key={emp.employee_id} sx={{ m: 0 }}
                            control={
                              <Checkbox size="small" checked={isEmployeeTagged(emp)}
                                onChange={() => toggleEmployee(emp, dept.dprtmnt_name)} />
                            }
                            label={
                              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                <Typography fontSize="13px">{getEmployeeFullName(emp)}</Typography>
                                <Typography fontSize="11px" color="text.secondary">{emp.employee_id}</Typography>
                              </Box>
                            } />
                        ))}
                      </Box>
                    )}
                  </Box>
                );
              })}

              {/* Unassigned employees */}
              {unassignedEmployees.length > 0 && (
                <Box sx={{ border: "1px solid #e0e0e0", borderRadius: 2, mb: 1, overflow: "hidden" }}>
                  <Box sx={{
                    display: "flex", alignItems: "center", gap: 1,
                    px: 1.5, py: 0.75, backgroundColor: "#f5f5f5", cursor: "pointer"
                  }}
                    onClick={() => toggleEmpDeptOpen("__unassigned__")}>
                    <Typography fontSize="13px" fontWeight={600} sx={{ flex: 1 }}>Other / Unassigned</Typography>
                    {openEmpDepts.has("__unassigned__")
                      ? <ExpandLessIcon fontSize="small" />
                      : <ExpandMoreIcon fontSize="small" />}
                  </Box>
                  {openEmpDepts.has("__unassigned__") && (
                    <Box sx={{ px: 2, py: 1, display: "grid", gap: 0.25 }}>
                      {unassignedEmployees.map((emp) => (
                        <FormControlLabel key={emp.employee_id} sx={{ m: 0 }}
                          control={
                            <Checkbox size="small" checked={isEmployeeTagged(emp)}
                              onChange={() => toggleEmployee(emp, "Other")} />
                          }
                          label={
                            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                              <Typography fontSize="13px">{getEmployeeFullName(emp)}</Typography>
                              <Typography fontSize="11px" color="text.secondary">{emp.employee_id}</Typography>
                            </Box>
                          } />
                      ))}
                    </Box>
                  )}
                </Box>
              )}

              {/* Selected employee chips */}
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, mt: 1 }}>
                {taggedEmployees.length === 0 ? (
                  <Typography fontSize="13px" color="text.secondary">No employees tagged yet.</Typography>
                ) : (
                  taggedEmployees.map((emp) => (
                    <Chip key={emp.employee_id}
                      label={`${emp.dprtmnt_name ? emp.dprtmnt_name + ": " : ""}${getEmployeeFullName(emp)}`}
                      size="small" color="primary" variant="outlined"
                      onDelete={() => setTaggedEmployees((prev) =>
                        prev.filter((e) => String(e.employee_id) !== String(emp.employee_id))
                      )}
                      sx={{ fontSize: "11px" }} />
                  ))
                )}
              </Box>
            </Grid>
          </Grid>
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2, borderTop: "1px solid #e0e0e0" }}>
          <Button onClick={() => { setOpenFormDialog(false); resetForm(); setEditing(null); }}
            color="error" variant="outlined">Cancel</Button>
          <Button variant="contained" sx={{ px: 4, fontWeight: 600, textTransform: "none" }}
            onClick={async () => {
              const saved = await handleSave();
              if (saved) setOpenFormDialog(false);
            }}>
            <SaveIcon fontSize="small" sx={{ mr: 0.5 }} /> Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar open={snack.open} autoHideDuration={4000} onClose={handleCloseSnack}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}>
        <Alert severity={snack.severity} onClose={handleCloseSnack} sx={{ width: "100%" }}>
          {snack.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
