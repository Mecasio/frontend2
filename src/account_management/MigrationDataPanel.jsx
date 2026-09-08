import React, { useState, useEffect, useContext, useRef } from 'react';
import { SettingsContext } from "../App";
import axios from 'axios';
import {
    Box, Button, Typography, Paper,
    TableContainer, Table, TableHead, TableBody, TableRow, TableCell,
    Snackbar, Alert, Select, MenuItem, FormControl, InputLabel,
    Chip, Fade
} from '@mui/material';
import { FaFileExcel } from "react-icons/fa";
import { FileUpload, Download, PictureAsPdf } from '@mui/icons-material';
import API_BASE_URL from '../apiConfig';
import Unauthorized from "../components/Unauthorized";
import LoadingOverlay from "../components/LoadingOverlay";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import EaristLogo from "../assets/EaristLogo.png";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { getFlatAuditHeaders } from "../utils/auditEvents";
import useAccountAuditMac from "./useAccountAuditMac";
/* ─────────────────────────────────────────────
   Main Component
───────────────────────────────────────────── */
const MigrationDataPanel = () => {
    useAccountAuditMac();
    const settings = useContext(SettingsContext);
  const colors = settings?.colors || {};
  const branding = settings?.branding || {};
  const assets = settings?.assets || {};
  const headerColor = colors.header || "#1976d2";

    const [titleColor, setTitleColor] = useState("#000000");
    const [borderColor, setBorderColor] = useState("#000000");
    const [mainButtonColor, setMainButtonColor] = useState("#1976d2");
    const [fetchedLogo, setFetchedLogo] = useState(null);
    const [companyName, setCompanyName] = useState("");
    const [campusAddress, setCampusAddress] = useState("");
    const [campusFilter, setCampusFilter] = useState("");
    const [branches, setBranches] = useState([]);

    const [selectedFile, setSelectedFile] = useState(null);
    const [excelFile, setExcelFile] = useState(null);
    const [missingCourses, setMissingCourses] = useState([]);

    const [skippedNotFoundStudents, setSkippedNotFoundStudents] = useState([]);
    const [skippedNotFoundCount, setSkippedNotFoundCount] = useState(0);

    const [snack1, setSnack1] = useState({ open: false, message: "", severity: "success" });
    const [snack2, setSnack2] = useState({ open: false, message: "", severity: "success" });

    const [userID, setUserID] = useState("");
    const [userRole, setUserRole] = useState("");
    const [employeeID, setEmployeeID] = useState("");
    const [hasAccess, setHasAccess] = useState(null);
    const [loading, setLoading] = useState(false);

    const excelInputRef = useRef(null);
    const pageId = 114;

    const getAuditHeaders = () =>
    getFlatAuditHeaders({
      "x-audit-actor-id":
        employeeID ||
        localStorage.getItem("employee_id") ||
        localStorage.getItem("email") ||
        "unknown",
      "x-audit-actor-role": userRole || localStorage.getItem("role") || "registrar",
    });

    /* ── settings ── */
    useEffect(() => {
        if (!settings) return;
        if (colors.title) setTitleColor(colors.title);
        if (colors.border) setBorderColor(colors.border);
        if (colors.mainButton) setMainButtonColor(colors.mainButton);
        setFetchedLogo(assets.logoUrl ? `${assets.logoUrl}` : EaristLogo);
        if (branding.companyName) setCompanyName(branding.companyName);
        if (branding.campusAddress) setCampusAddress(branding.campusAddress);
        const normalizedBranches = settings?.branches || [];
        setBranches(normalizedBranches);
        setCampusFilter(prev => prev || normalizedBranches?.[0]?.id || "");
    }, [settings]);

    /* ── auth ── */
    useEffect(() => {
        const email = localStorage.getItem("email");
        const role = localStorage.getItem("role");
        const id = localStorage.getItem("person_id");
        const empID = localStorage.getItem("employee_id");
        if (email && role && id) {
            setUserRole(role); setUserID(id); setEmployeeID(empID);
            if (role === "registrar") checkAccess(empID);
            else window.location.href = "/login";
        } else window.location.href = "/login";
    }, []);

    const checkAccess = async (empID) => {
        try {
            const res = await axios.get(`${API_BASE_URL}/api/page_access/${empID}/${pageId}`);
            setHasAccess(res.data?.page_privilege === 1);
        } catch { setHasAccess(false); }
    };

    /* ── helpers ── */
    const displayValue = (v) => (v === null || v === undefined || v === "" ? "—" : v);

    const getBase64FromUrl = async (url) => {
        const blob = await (await fetch(url)).blob();
        return new Promise(res => { const r = new FileReader(); r.onloadend = () => res(r.result); r.readAsDataURL(blob); });
    };

    const handleRemoveFile = () => {
        setSelectedFile(null);
        const el = document.getElementById("grades-excel-upload");
        if (el) el.value = "";
    };

    /* ── import grades ── */
    const handleImport = async () => {
        setMissingCourses([]);
        if (!selectedFile) {
            setSnack1({ open: true, message: "Please choose a file first!", severity: "warning" });
            return;
        }
        try {
            const fd = new FormData();
            fd.append("file", selectedFile);
            fd.append("campus", campusFilter);
            const res = await axios.post(`${API_BASE_URL}/api/import-xlsx`, fd, {
                headers: {
                    "Content-Type": "multipart/form-data",
                    ...getAuditHeaders(),
                }
            });
            if (res.data.success) {
                setSnack1({ open: true, message: res.data.message || "Grades imported successfully!", severity: "success" });
                setSelectedFile(null);
            } else {
                setSnack1({ open: true, message: res.data.error || "Failed to import", severity: "error" });
            }
        } catch (err) {
            const rd = err.response?.data || {};
            const missing = rd.missing_courses?.length
                ? rd.missing_courses
                : (rd.missing_course_codes || []).map(c => ({ course_code: c, course_description: "", course_unit: "" }));
            setMissingCourses(missing);
            setSnack1({ open: true, message: "Import failed: " + (rd.error || err.message), severity: "error" });
        }
    };

    /* ── import personal info ── */
    const handleImportExcel = async () => {
        if (!excelFile) {
            setSnack2({ open: true, message: "Please select a file to import.", severity: "warning" });
            return;
        }
        const formData = new FormData();
        formData.append("file", excelFile);
        try {
            const res = await axios.post(`${API_BASE_URL}/api/person/import`, formData, {
                headers: {
                    "Content-Type": "multipart/form-data",
                    ...getAuditHeaders(),
                }
            });
            if (res.data.success) {
                setSnack2({
                    open: true,
                    message: `Imported: ${res.data.totalRows} · Updated: ${res.data.updated} · Skipped: ${res.data.skipped}`,
                    severity: "success"
                });
                setSkippedNotFoundCount(res.data.missingStudents?.length || 0);
                setSkippedNotFoundStudents(res.data.missingStudents || []);
                setExcelFile(null);
                if (excelInputRef.current) excelInputRef.current.value = "";
            } else {
                setSnack2({ open: true, message: res.data.error || "Import failed.", severity: "warning" });
            }
        } catch (error) {
            console.error(error);
            setSnack2({ open: true, message: "Server error while importing Excel.", severity: "error" });
            setSkippedNotFoundCount(0);
            setSkippedNotFoundStudents([]);
        }
    };

    /* ── export excel ── */
    const exportExcel = async () => {
        const { data: students } = await axios.get(`${API_BASE_URL}/api/get_students_grouped`);
        const wb = new ExcelJS.Workbook();
        const grouped = students.reduce((acc, s) => { (acc[s.program_code] ||= []).push(s); return acc; }, {});
        for (const program in grouped) {
            const list = grouped[program]; const first = list[0]; const ws = wb.addWorksheet(program);
            ws.mergeCells("A1:D1"); ws.getCell("A1").value = companyName || "School Name"; ws.getCell("A1").font = { bold: true, size: 16 }; ws.getCell("A1").alignment = { horizontal: "center" };
            ws.mergeCells("A2:D2"); ws.getCell("A2").value = campusAddress || ""; ws.getCell("A2").alignment = { horizontal: "center" };
            ws.mergeCells("A4:D4"); ws.getCell("A4").value = `${first.dprtmnt_code} - ${first.dprtmnt_name}`; ws.getCell("A4").font = { bold: true }; ws.getCell("A4").alignment = { horizontal: "center" };
            ws.mergeCells("A5:D5"); ws.getCell("A5").value = `${first.program_code} - ${first.program_description} ${first.major || ""}`; ws.getCell("A5").font = { bold: true }; ws.getCell("A5").alignment = { horizontal: "center" };
            ws.mergeCells("A6:D6"); ws.getCell("A6").value = "STUDENT LIST"; ws.getCell("A6").font = { bold: true, size: 14 }; ws.getCell("A6").alignment = { horizontal: "center" };
            ws.addRow([]); ws.addRow(["#", "Student Number", "Name", "Year Level"]);
            ws.columns = [{ width: 5 }, { width: 20 }, { width: 35 }, { width: 15 }];
            list.forEach((s, i) => ws.addRow([i + 1, s.student_number, `${s.last_name}, ${s.first_name} ${s.middle_name || ""}`, s.year_level_description]));
            ws.eachRow(row => row.eachCell(cell => { cell.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } }; }));
        }
        saveAs(new Blob([await wb.xlsx.writeBuffer()]), "Students_By_Program.xlsx");
    };

    /* ── export pdf ── */
    const exportPDF = async () => {
        try {
            const { data: students } = await axios.get(`${API_BASE_URL}/api/get_students_grouped`);
            if (!students.length) return alert("No students found");
            const doc = new jsPDF("landscape", "mm", "a4");
            const grouped = students.reduce((acc, s) => { (acc[s.program_code] ||= []).push(s); return acc; }, {});
            let logoBase64 = null;
            if (fetchedLogo) { try { logoBase64 = await getBase64FromUrl(fetchedLogo); } catch { } }
            let firstPage = true;
            for (const program in grouped) {
                if (!firstPage) doc.addPage(); firstPage = false;
                const list = grouped[program]; const first = list[0];
                if (logoBase64) doc.addImage(logoBase64, "PNG", 10, 10, 25, 25);
                doc.setFont("Times", "Bold"); doc.setFontSize(12); doc.text("Republic of the Philippines", 150, 15, { align: "center" });
                doc.setFontSize(18); doc.text(companyName || "School Name", 150, 25, { align: "center" });
                doc.setFontSize(11); doc.text(campusAddress || "", 150, 32, { align: "center" });
                doc.setFontSize(14); doc.text(`${first.dprtmnt_code} - ${first.dprtmnt_name}`, 150, 45, { align: "center" });
                doc.setFontSize(12); doc.text(`${first.program_code} - ${first.program_description} ${first.major || ""}`, 150, 52, { align: "center" });
                doc.setFontSize(16); doc.text("STUDENT LIST", 150, 62, { align: "center" });
                autoTable(doc, {
                    startY: 70, head: [["#", "Student Number", "Name", "Year Level"]],
                    body: list.map((s, i) => [i + 1, s.student_number, `${s.last_name}, ${s.first_name} ${s.middle_name || ""}`, s.year_level_description]),
                    theme: "grid", styles: { fontSize: 9 }, headStyles: { fillColor: [128, 0, 0] },
                });
            }
            doc.save("Students_By_Program.pdf");
        } catch (err) { console.error(err); alert("PDF export failed"); }
    };

    /* ── guards ── */
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

    /* ── render ── */
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
            {/* ═══════════════════════════════════
                HEADER
            ═══════════════════════════════════ */}
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h4" fontWeight="bold" sx={{ color: titleColor }}>
                    MIGRATION PANEL
                </Typography>
            </Box>

            <hr style={{ border: "1px solid #ccc", width: "100%" }} />
            <br />
            <br />

            {/* ═══════════════════════════════════
                MISSING STUDENTS TABLE
            ═══════════════════════════════════ */}
            {skippedNotFoundStudents.length > 0 && (
                <Fade in>
                    <Box mt={2.5} mb={1}>
                        <Box display="flex" alignItems="center" gap={1.5} mb={1.5}>
                            <Typography variant="h6" sx={{ fontWeight: 700, color: "#8B0000" }}>
                                Missing Students List
                            </Typography>
                            <Chip
                                label={skippedNotFoundStudents.length}
                                size="small"
                                sx={{
                                    backgroundColor: "#fecaca",
                                    color: "#7f1d1d",
                                    fontWeight: 700,
                                    fontSize: 12,
                                    height: 22,
                                }}
                            />
                        </Box>

                        <TableContainer
                            component={Paper}
                            elevation={0}
                            sx={{ border: "1px solid #fecaca", overflow: "hidden" }}
                        >
                            <Table size="small">
                                <TableHead sx={{ backgroundColor: headerColor || "#1976d2" }}>
                                    <TableRow>
                                        {["#", "Student Number", "Student Name"].map((h) => (
                                            <TableCell
                                                key={h}
                                                sx={{
                                                    color: "white",
                                                    fontWeight: 700,
                                                    fontSize: 12,
                                                    letterSpacing: "0.04em",
                                                    border: `1px solid ${borderColor}`,
                                                }}
                                            >
                                                {h}
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {skippedNotFoundStudents.map((student, index) => (
                                        <TableRow
                                            key={index}
                                            sx={{ "&:nth-of-type(even)": { backgroundColor: "lightgray" } }}
                                        >
                                            <TableCell sx={{ fontWeight: 600, border: `1px solid ${borderColor}`, color: "#7f1d1d", width: 50 }}>
                                                {index + 1}
                                            </TableCell>
                                            <TableCell sx={{ fontWeight: 600, border: `1px solid ${borderColor}` }}>
                                                {student.studentNumber}
                                            </TableCell>
                                            <TableCell sx={{ fontWeight: 600, border: `1px solid ${borderColor}` }}>
                                                {student.last_name}, {student.first_name} {student.middle_name}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Box>
                </Fade>
            )}

            <TableContainer
                component={Paper}
                sx={{ width: "100%", border: `1px solid ${borderColor}` }}
            >
                <Table>
                    <TableHead
                        sx={{ backgroundColor: headerColor || "#1976d2" }}
                    >
                        <TableRow>
                            <TableCell sx={{ color: "white", textAlign: "Center" }}>
                                Student Grades Migration
                            </TableCell>
                        </TableRow>
                    </TableHead>
                </Table>
            </TableContainer>
            <Paper
                elevation={0}
                sx={{
                    p: 3, mb: 3,
                    border: `1px solid ${borderColor}`,
                    backgroundColor: "#fff",
                }}
            >



                <Typography variant="body1" color="black" mt={0.5} mb={2}>
                    Upload Excel files containing student grades and academic records.
                </Typography>
                <input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={(e) => e.target.files?.[0] && setSelectedFile(e.target.files[0])}
                    style={{ display: "none" }}
                    id="grades-excel-upload"
                />

                <Box
                    sx={{
                        border: "1px dashed #cbd5e1",
                        borderRadius: 4,
                        p: 3,
                        background: "linear-gradient(135deg, #f8fafc 0%, #ffffff 100%)",
                    }}
                >
                    <Box display="flex" alignItems="center" gap={2} flexWrap="wrap">
                        {/* CAMPUS */}
                        <FormControl
                            size="small"
                            sx={{
                                minWidth: 180,
                                "& .MuiOutlinedInput-root": { borderRadius: 2, backgroundColor: "#fff" },
                            }}
                        >
                            <InputLabel>Campus</InputLabel>
                            <Select
                                value={campusFilter}
                                label="Campus"
                                onChange={(e) => setCampusFilter(e.target.value)}
                            >
                                {branches.map((b) => (
                                    <MenuItem key={b.id ?? b.branch} value={b.id ?? ""}>
                                        {b.branch}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        {/* CHOOSE */}
                        <Button
                            variant="outlined"
                            startIcon={<FaFileExcel />}
                            onClick={() => document.getElementById("grades-excel-upload").click()}
                            sx={{
                                height: 42, px: 3, borderRadius: 2.5,
                                textTransform: "none", fontWeight: 700,
                                border: "2px solid #16a34a", color: "#15803d",
                                backgroundColor: "#f0fdf4",
                                "&:hover": { backgroundColor: "#dcfce7", borderColor: "#15803d" },
                            }}
                        >
                            Choose Excel File
                        </Button>

                        {/* IMPORT */}
                        <Button
                            variant="contained"
                            disabled={!selectedFile}
                            startIcon={<FileUpload />}
                            onClick={handleImport}
                            sx={{
                                height: 42, px: 3, borderRadius: 2.5,
                                textTransform: "none", fontWeight: 700, boxShadow: "none",
                                background: selectedFile
                                    ? "linear-gradient(to right, #16a34a, #15803d)"
                                    : undefined,
                                "&:hover": {
                                    background: "linear-gradient(to right, #15803d, #166534)",
                                    boxShadow: "0 6px 16px rgba(22,163,74,0.25)",
                                },
                            }}
                        >
                            Import Grades
                        </Button>
                    </Box>

                    {/* FILE PREVIEW */}
                    {selectedFile && (
                        <Fade in>
                            <Box
                                mt={2.5}
                                sx={{
                                    display: "flex", alignItems: "center", gap: 2, p: 2,
                                    borderRadius: 3, border: "1px solid #bbf7d0",
                                    background: "linear-gradient(to right, #f0fdf4, #ffffff)",
                                }}
                            >
                                <Box
                                    sx={{
                                        width: 52, height: 52, borderRadius: 2,
                                        backgroundColor: "#dcfce7",
                                        display: "flex", alignItems: "center", justifyContent: "center",
                                    }}
                                >
                                    <FaFileExcel size={28} color="#16a34a" />
                                </Box>
                                <Box flex={1} minWidth={0}>
                                    <Typography sx={{ fontWeight: 700, fontSize: 14, color: "#14532d", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                        {selectedFile.name}
                                    </Typography>
                                    <Typography sx={{ fontSize: 12, color: "#15803d", mt: 0.3 }}>
                                        {selectedFile.type || "Excel Workbook"} •{" "}
                                        {selectedFile.size < 1024 * 1024
                                            ? (selectedFile.size / 1024).toFixed(1) + " KB"
                                            : (selectedFile.size / (1024 * 1024)).toFixed(1) + " MB"}
                                    </Typography>
                                </Box>
                                <Button
                                    size="small"
                                    onClick={handleRemoveFile}
                                    sx={{
                                        textTransform: "none", borderRadius: 2, fontWeight: 600,
                                        color: "#dc2626", border: "1px solid #fecaca", backgroundColor: "#fff",
                                        "&:hover": { backgroundColor: "#fef2f2" },
                                    }}
                                >
                                    Remove
                                </Button>
                            </Box>
                        </Fade>
                    )}
                </Box>

                {/* MISSING COURSES */}
                {missingCourses.length > 0 && (
                    <Paper
                        elevation={0}
                        sx={{ mt: 3, overflow: "hidden", borderRadius: 3, border: "1px solid #fecaca" }}
                    >
                        <Box
                            sx={{
                                p: 2,
                                background: "linear-gradient(to right, #fff1f2, #ffffff)",
                                borderBottom: "1px solid #fecaca",
                                display: "flex", alignItems: "center", gap: 1.5,
                            }}
                        >
                            <Box>
                                <Typography fontWeight={700} color="error.main" fontSize={14}>
                                    Missing courses detected
                                </Typography>
                                <Typography variant="body2" color="text.secondary" mt={0.5}>
                                    Please add these courses first before re-importing the file.
                                </Typography>
                            </Box>
                            <Chip
                                label={`${missingCourses.length} course${missingCourses.length !== 1 ? "s" : ""}`}
                                size="small"
                                sx={{ ml: "auto", backgroundColor: "#fecaca", color: "#7f1d1d", fontWeight: 700 }}
                            />
                        </Box>
                        <TableContainer sx={{ maxHeight: 320 }}>
                            <Table stickyHeader size="small">
                                <TableHead>
                                    <TableRow>
                                        {["Course Code", "Description", "Units"].map(h => (
                                            <TableCell
                                                key={h}
                                                align={h === "Units" ? "center" : "left"}
                                                sx={{ fontWeight: 700, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", backgroundColor: "#fafafa" }}
                                            >
                                                {h}
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {missingCourses.map((c, i) => (
                                        <TableRow key={`${c.course_code}-${i}`} hover>
                                            <TableCell>{displayValue(c.course_code)}</TableCell>
                                            <TableCell>{displayValue(c.course_description || c.description)}</TableCell>
                                            <TableCell align="center">{displayValue(c.course_unit || c.units)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Paper>
                )}
            </Paper>

            <TableContainer
                component={Paper}
                sx={{ width: "100%", border: `1px solid ${borderColor}` }}
            >
                <Table>
                    <TableHead
                        sx={{ backgroundColor: headerColor || "#1976d2" }}
                    >
                        <TableRow>
                            <TableCell sx={{ color: "white", textAlign: "Center" }}>
                                Personal Information
                            </TableCell>
                        </TableRow>
                    </TableHead>
                </Table>
            </TableContainer>
            <Paper
                elevation={0}
                sx={{
                    p: 3,
                    backgroundColor: "#fff",
                    border: `1px solid ${borderColor}`
                }}
            >
                <Typography variant="body1" color="black" mt={0.5} mb={2}>
                    Import student personal records from Excel.
                </Typography>

                <input
                    ref={excelInputRef}
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={(e) => e.target.files?.[0] && setExcelFile(e.target.files[0])}
                    style={{ display: "none" }}
                    id="excel-upload"
                />

                <Box sx={{ border: "1px dashed #cbd5e1", borderRadius: 4, p: 3, background: "linear-gradient(135deg, #f8faff 0%, #ffffff 100%)" }}>

                    <Box display="flex" gap={2} flexWrap="wrap" alignItems="center">


                        <Button
                            variant="outlined"
                            startIcon={<FaFileExcel />}
                            onClick={() => document.getElementById("excel-upload").click()}
                            sx={{
                                height: 42, px: 3, borderRadius: 2.5,
                                textTransform: "none", fontWeight: 700,
                                border: "2px solid #2563eb", color: "#2563eb",
                                backgroundColor: "#eff6ff",
                                "&:hover": { backgroundColor: "#dbeafe", borderColor: "#1d4ed8" },
                            }}
                        >
                            Choose Excel File
                        </Button>

                        <Button
                            variant="contained"
                            startIcon={<FileUpload />}
                            onClick={handleImportExcel}
                            sx={{
                                height: 42, px: 3, borderRadius: 2.5,
                                textTransform: "none", fontWeight: 700, boxShadow: "none",
                                background: "linear-gradient(to right, #2563eb, #1d4ed8)",
                                "&:hover": {
                                    background: "linear-gradient(to right, #1d4ed8, #1e40af)",
                                    boxShadow: "0 6px 16px rgba(37,99,235,0.25)",
                                },
                            }}
                        >
                            Import Information
                        </Button>
                    </Box>

                    {/* FILE PREVIEW — Section 2 */}
                    {excelFile && (
                        <Fade in>
                            <Box
                                mt={2.5}
                                sx={{
                                    display: "flex", alignItems: "center", gap: 2, p: 2,
                                    borderRadius: 3, border: "1px solid #bfdbfe",
                                    background: "linear-gradient(to right, #eff6ff, #ffffff)",
                                }}
                            >
                                <Box
                                    sx={{
                                        width: 52, height: 52, borderRadius: 2,
                                        backgroundColor: "#dbeafe",
                                        display: "flex", alignItems: "center", justifyContent: "center",
                                    }}
                                >
                                    <FaFileExcel size={28} color="#2563eb" />
                                </Box>
                                <Box flex={1} minWidth={0}>
                                    <Typography sx={{ fontWeight: 700, fontSize: 14, color: "#1e3a8a", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                        {excelFile.name}
                                    </Typography>
                                    <Typography sx={{ fontSize: 12, color: "#2563eb", mt: 0.3 }}>
                                        {excelFile.type || "Excel Workbook"} •{" "}
                                        {excelFile.size < 1024 * 1024
                                            ? (excelFile.size / 1024).toFixed(1) + " KB"
                                            : (excelFile.size / (1024 * 1024)).toFixed(1) + " MB"}
                                    </Typography>
                                </Box>
                                <Button
                                    size="small"
                                    onClick={() => { setExcelFile(null); if (excelInputRef.current) excelInputRef.current.value = ""; }}
                                    sx={{
                                        textTransform: "none", borderRadius: 2, fontWeight: 600,
                                        color: "#dc2626", border: "1px solid #fecaca", backgroundColor: "#fff",
                                        "&:hover": { backgroundColor: "#fef2f2" },
                                    }}
                                >
                                    Remove
                                </Button>
                            </Box>
                        </Fade>
                    )}

                    {/* EXPORT */}
                    <Box mt={3} pt={2} sx={{ borderTop: "1px solid #e2e8f0" }}>
                        <Typography fontSize={13} fontWeight={600} mb={1.5} color="text.secondary">
                            Export Student List
                        </Typography>
                        <Box display="flex" gap={1.5}>
                            <Button
                                variant="outlined"
                                startIcon={<Download />}
                                onClick={exportExcel}
                                sx={{ borderRadius: 2, textTransform: "none", fontWeight: 600 }}
                            >
                                Export Excel
                            </Button>
                            <Button
                                variant="outlined"
                                startIcon={<PictureAsPdf />}
                                onClick={exportPDF}
                                sx={{ borderRadius: 2, textTransform: "none", fontWeight: 600 }}
                            >
                                Export PDF
                            </Button>
                        </Box>
                    </Box>
                </Box>
            </Paper>

            {/* ═══════════════════════════════════
                SNACKBAR — Section 1 (Grades)
            ═══════════════════════════════════ */}
            <Snackbar
                open={snack1.open}
                onClose={() => setSnack1(s => ({ ...s, open: false }))}
                anchorOrigin={{ vertical: "top", horizontal: "center" }}
                autoHideDuration={4000}
            >
                <Alert
                    onClose={() => setSnack1(s => ({ ...s, open: false }))}
                    severity={snack1.severity}
                    sx={{ width: "100%" }}
                >
                    {snack1.message}
                </Alert>
            </Snackbar>

            {/* ═══════════════════════════════════
                SNACKBAR — Section 2 (Personal Info)
            ═══════════════════════════════════ */}
            <Snackbar
                open={snack2.open}
                onClose={() => setSnack2(s => ({ ...s, open: false }))}
                anchorOrigin={{ vertical: "top", horizontal: "center" }}
                autoHideDuration={4000}
            >
                <Alert
                    onClose={() => setSnack2(s => ({ ...s, open: false }))}
                    severity={snack2.severity}
                    sx={{ width: "100%" }}
                >
                    {snack2.message}
                </Alert>
            </Snackbar>

        </Box>
    );
};

export default MigrationDataPanel;
