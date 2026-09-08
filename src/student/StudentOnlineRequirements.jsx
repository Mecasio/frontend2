import React, { useState, useEffect, useContext } from "react";
import { SettingsContext } from "../App";
import {
  Box,
  Button,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  Container,
  TableHead,
  TableRow,
  Snackbar,
  Alert,
  useMediaQuery,
  useTheme,
  Chip,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import VisibilityIcon from "@mui/icons-material/Visibility";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import HourglassEmptyIcon from "@mui/icons-material/HourglassEmpty";
import axios from "axios";
import ErrorIcon from "@mui/icons-material/Error";
import API_BASE_URL from "../apiConfig";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";

const StudentOnlineRequirements = () => {
  const settings = useContext(SettingsContext);
  const colors = settings?.colors || {};
  const branding = settings?.branding || {};
  const assets = settings?.assets || {};
  const headerColor = colors.header || "#1976d2";
  const theme = useTheme();
  // Card layout for phones + small tablets, table layout from md (tablet-landscape) up
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  const [titleColor, setTitleColor] = useState("#000000");
  const [subtitleColor, setSubtitleColor] = useState("#555555");
  const [borderColor, setBorderColor] = useState("#000000");
  const [mainButtonColor, setMainButtonColor] = useState("#1976d2");

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
    if (assets.logoUrl) setFetchedLogo(`${assets.logoUrl}`);
    if (branding.companyName) setCompanyName(branding.companyName);
    if (branding.shortTerm) setShortTerm(branding.shortTerm);
    if (branding.campusAddress) setCampusAddress(branding.campusAddress);
  }, [settings]);

  const [requirements, setRequirements] = useState([]);
  const [uploads, setUploads] = useState([]);
  const [userID, setUserID] = useState("");
  const [selectedFiles, setSelectedFiles] = useState({});
  const [allRequirementsCompleted, setAllRequirementsCompleted] = useState(false);

  const [snack, setSnack] = useState({ open: false, message: "", severity: "success" });

  const [openModal, setOpenModal] = useState(false);
  const [openConfirmModal, setOpenConfirmModal] = useState(false);

  useEffect(() => {
    const personId = localStorage.getItem("person_id");
    if (!personId) return;
    setUserID(personId);
    fetchStudentDocuments(personId);
  }, []);

  const fetchStudentDocuments = async (personId) => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/student-documents/${personId}`);
      const data = res.data.data;
      const normalized = data.map((doc) => ({
        id: doc.requirements_id,
        description: doc.description,
        category: doc.category,
        is_required: doc.is_required,
        is_optional: doc.is_optional,
        upload_id: doc.upload_id,
        original_name: doc.original_name,
        file_path: doc.file_path,
        status: doc.status,
        remarks: doc.remarks,
      }));

      setRequirements(normalized);
      setUploads(normalized);

      const rebuiltSelectedFiles = {};
      normalized.forEach((doc) => {
        if (doc.original_name) rebuiltSelectedFiles[doc.id] = doc.original_name;
      });
      setSelectedFiles(rebuiltSelectedFiles);

      // ✅ Check DB for submission status
      const statusRes = await axios.get(`${API_BASE_URL}/api/student-status/${personId}`);
      const alreadySubmitted = statusRes.data.requirements === 1;
      setAllRequirementsCompleted(alreadySubmitted);

      if (!alreadySubmitted) {
        const verifiableMain = normalized.filter(
          (r) => r.category === "Main" && r.is_optional !== 1
        );
        const uploadedIds = new Set(normalized.filter((r) => r.upload_id).map((r) => r.id));
        const allUploaded =
          verifiableMain.length > 0 &&
          verifiableMain.every((r) => uploadedIds.has(r.id));

        if (allUploaded) setOpenConfirmModal(true);
      }
    } catch (err) {
      console.error("Error fetching student documents:", err);
    }
  };

  const handleUpload = async (key, file) => {
    if (allRequirementsCompleted) return;
    if (!file) return;

    const maxSize = 4 * 1024 * 1024;
    if (file.size > maxSize) {
      setSnack({ open: true, severity: "error", message: "File must not exceed 4MB" });
      return;
    }

    setSelectedFiles((prev) => ({ ...prev, [key]: file.name }));

    const formData = new FormData();
    formData.append("file", file);
    formData.append("requirements_id", key);
    formData.append("person_id", userID);

    try {
      await axios.post(`${API_BASE_URL}/api/upload/enrollment`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setSnack({ open: true, severity: "success", message: "File uploaded successfully" });
      fetchStudentDocuments(localStorage.getItem("person_id"));
    } catch (err) {
      setSelectedFiles((prev) => { const next = { ...prev }; delete next[key]; return next; });
      setSnack({ open: true, severity: "error", message: err.response?.data?.error || "Upload failed" });
    }
  };

  const handleDelete = async (uploadId) => {
    if (allRequirementsCompleted) return;
    try {
      await axios.delete(`${API_BASE_URL}/api/student-upload/${uploadId}`);
      setSnack({ open: true, severity: "success", message: "File deleted successfully" });
      fetchStudentDocuments(localStorage.getItem("person_id"));
    } catch (err) {
      setSnack({ open: true, severity: "error", message: "Failed to delete file" });
    }
  };

  const isFormValid = () => {
    const requiredMain = requirements.filter(
      (r) => r.category === "Main" && Number(r.is_required) === 1,
    );
    const uploadedIds = new Set(uploads.map((u) => Number(u.requirements_id)));
    const missing = requiredMain.filter((req) => !uploadedIds.has(Number(req.id)));
    if (missing.length > 0) {
      setSnack({
        open: true,
        severity: "warning",
        message: `Please upload all required MAIN requirements: ${missing.map((m) => m.description).join(", ")}`,
      });
      return false;
    }
    return true;
  };

  const handleClose = (_, reason) => {
    if (reason === "clickaway") return;
    setSnack((prev) => ({ ...prev, open: false }));
  };

  const getStatusChip = (status) => {
    if (status == 1) return <Chip icon={<CheckCircleIcon />} label="Verified" color="success" size="small" sx={{ fontWeight: "bold" }} />;
    if (status == 2) return <Chip icon={<CancelIcon />} label="Rejected" color="error" size="small" sx={{ fontWeight: "bold" }} />;
    return <Chip icon={<HourglassEmptyIcon />} label="Pending" color="default" size="small" />;
  };

  // 🔒 Right-click / DevTools blocking, scoped with cleanup so listeners aren't
  // re-added on every render (see ApplicantOnlineRequirements for the equivalent).
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

  // Mobile / small-tablet card per document
  const renderMobileCard = (doc) => {
    const uploaded = doc.upload_id ? doc : null;
    return (
      <Box
        key={doc.id}
        sx={{
          border: `1px solid ${borderColor}`,
          borderRadius: "8px",
          p: { xs: 1.75, sm: 2 },
          mb: 2,
          backgroundColor: "#fff",
          boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
        }}
      >
        <Typography sx={{ fontWeight: "bold", fontSize: { xs: 14, sm: 15 }, mb: 1, lineHeight: 1.4 }}>
          {doc.description}
          {doc.is_required === 1 && <span style={{ color: "red", marginLeft: 4 }}>*</span>}
          {doc.is_optional === 1 && <span style={{ color: "#888", marginLeft: 4, fontSize: "12px" }}>(Optional)</span>}
        </Typography>

        {selectedFiles[doc.id] && (
          <Box
            sx={{
              backgroundColor: "#e0e0e0",
              px: 1.5,
              py: 0.75,
              borderRadius: "4px",
              fontSize: { xs: 12, sm: 13 },
              fontWeight: "bold",
              mb: 1.5,
              wordBreak: "break-all",
              overflowWrap: "break-word",
              whiteSpace: "normal",
            }}
          >
            📎 {selectedFiles[doc.id]}
          </Box>
        )}

        {(uploaded?.remarks?.trim() || uploaded?.status == 1 || uploaded?.status == 2) && (
          <Box sx={{ mb: 1.5 }}>
            {typeof uploaded?.remarks === "string" && uploaded.remarks.trim() !== "" && (
              <Typography sx={{ fontSize: { xs: 12, sm: 13 }, color: "#444", mb: 0.5 }}>{uploaded.remarks}</Typography>
            )}
            {getStatusChip(uploaded?.status)}
          </Box>
        )}

        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mt: 1 }}>
          <Button
            variant="contained"
            component="label"
            startIcon={<CloudUploadIcon />}
            size="small"
            disabled={allRequirementsCompleted}
            sx={{
              backgroundColor: "#F0C03F",
              color: "white",
              fontWeight: "bold",
              textTransform: "none",
              flex: "1 1 auto",
              minWidth: "120px",
              "&.Mui-disabled": {
                backgroundColor: "#F0C03F",
                color: "white",
                opacity: 0.6,
              },
            }}
          >
            Browse File
            <input
              key={selectedFiles[doc.id] || `empty-${doc.id}`}
              hidden
              type="file"
              accept=".jpg,.jpeg,.png,.pdf"
              onChange={(e) => handleUpload(doc.id, e.target.files[0])}
            />
          </Button>

          {uploaded && (
            <Button
              variant="contained"
              color="primary"
              href={`${API_BASE_URL}/api/student-upload/preview/${uploaded.upload_id}`}
              target="_blank"
              startIcon={<VisibilityIcon />}
              size="small"
              sx={{ fontWeight: "bold", textTransform: "none", flex: "1 1 auto", minWidth: "100px" }}
            >
              Preview
            </Button>
          )}

          {uploaded && (
            <Button
              onClick={() => handleDelete(uploaded.upload_id)}
              startIcon={<DeleteIcon />}
              size="small"
              disabled={allRequirementsCompleted}
              sx={{
                backgroundColor: "#9E0000",
                color: "white",
                fontWeight: "bold",
                textTransform: "none",
                flex: "1 1 auto",
                minWidth: "100px",
                "&.Mui-disabled": {
                  backgroundColor: "#9E0000",
                  color: "white",
                  opacity: 0.6,
                },
              }}
            >
              Delete
            </Button>
          )}
        </Box>
      </Box>
    );
  };

  // Desktop / tablet-landscape table row
  const renderRow = (doc) => {
    const uploaded = doc.upload_id ? doc : null;
    return (
      <TableRow key={doc.id}>
        <TableCell sx={{ fontWeight: "bold", width: "25%", border: `1px solid ${borderColor}`, fontSize: { md: 13, lg: 14 } }}>
          {doc.description}
          {doc.is_optional === 1 && <span style={{ marginLeft: 2 }}>(Optional)</span>}
          {doc.is_required === 1 && <span style={{ color: "red", marginLeft: 5 }}>*</span>}
        </TableCell>

        <TableCell sx={{ width: "25%", border: `1px solid ${borderColor}`, textAlign: "center", verticalAlign: "middle" }}>
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 1, width: "100%", flexWrap: { md: "wrap", lg: "nowrap" } }}>
            <Box sx={{ width: { md: 160, lg: 220 }, flexShrink: 0, textAlign: "center" }}>
              {selectedFiles[doc.id] ? (
                <Box
                  sx={{
                    backgroundColor: "#e0e0e0",
                    padding: "6px 12px",
                    borderRadius: "4px",
                    fontSize: { md: 12.5, lg: 14 },
                    fontWeight: "bold",
                    minHeight: "40px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    wordBreak: "break-all",
                    overflowWrap: "break-word",
                    whiteSpace: "normal",
                  }}
                >
                  {selectedFiles[doc.id]}
                </Box>
              ) : (
                <Box sx={{ height: "40px" }} />
              )}
            </Box>
            <Box sx={{ flexShrink: 0 }}>
              <Button
                variant="contained"
                component="label"
                startIcon={<CloudUploadIcon />}
                disabled={allRequirementsCompleted}
                sx={{
                  backgroundColor: "#F0C03F",
                  color: "white",
                  fontWeight: "bold",
                  height: "40px",
                  textTransform: "none",
                  minWidth: { md: 120, lg: 140 },
                  fontSize: { md: 12.5, lg: 14 },
                  "&.Mui-disabled": {
                    backgroundColor: "#F0C03F",
                    color: "white",
                    opacity: 0.6,
                  },
                }}
              >
                Browse File
                <input
                  key={selectedFiles[doc.id] || `empty-${doc.id}`}
                  hidden
                  type="file"
                  accept=".jpg,.jpeg,.png,.pdf"
                  onChange={(e) => handleUpload(doc.id, e.target.files[0])}
                />
              </Button>
            </Box>
          </Box>
        </TableCell>

        <TableCell sx={{ width: "25%", border: `1px solid ${borderColor}`, fontSize: { md: 12.5, lg: 14 } }}>
          {typeof uploaded?.remarks === "string" && uploaded.remarks.trim() !== "" && (
            <Typography sx={{ fontStyle: "normal", color: "inherit", fontSize: "inherit" }}>{uploaded.remarks}</Typography>
          )}
          {(uploaded?.status == 1 || uploaded?.status == 2) && (
            <Typography sx={{ mt: 0.5, fontSize: { md: 13, lg: 14 }, color: uploaded?.status == 1 ? "green" : "red", fontWeight: "bold" }}>
              {uploaded?.status == 1 ? "Verified" : "Rejected"}
            </Typography>
          )}
        </TableCell>

        <TableCell sx={{ width: "10%", border: `1px solid ${borderColor}` }}>
          {uploaded && (
            <Button
              variant="contained"
              color="primary"
              href={`${API_BASE_URL}/api/student-upload/preview/${uploaded.upload_id}`}
              target="_blank"
              startIcon={<VisibilityIcon />}
              sx={{ color: "white", fontWeight: "bold", height: "40px", textTransform: "none", minWidth: { md: 120, lg: 140 }, fontSize: { md: 12.5, lg: 14 } }}
            >
              Preview
            </Button>
          )}
        </TableCell>

        <TableCell sx={{ width: "10%", border: `1px solid ${borderColor}` }}>
          {uploaded && (
            <Button
              onClick={() => handleDelete(uploaded.upload_id)}
              startIcon={<DeleteIcon />}
              disabled={allRequirementsCompleted}
              sx={{
                backgroundColor: "#9E0000",
                color: "white",
                fontWeight: "bold",
                height: "40px",
                textTransform: "none",
                minWidth: { md: 120, lg: 140 },
                fontSize: { md: 12.5, lg: 14 },
                "&.Mui-disabled": {
                  backgroundColor: "#9E0000",
                  color: "white",
                  opacity: 0.6,
                },
              }}
            >
              Delete
            </Button>
          )}
        </TableCell>
      </TableRow>
    );
  };

  return (
    <Box
      sx={{
        minHeight: { xs: "100vh", md: "calc(100vh - 150px)" },
        overflowY: { md: "auto" },
        backgroundColor: { xs: "#f5f5f5", md: "transparent" },
        pr: { md: 1 },
        mt: { md: 1 },
        p: { xs: 0, sm: 2 },
        pb: { xs: 6, sm: 2 },
      }}
    >
      <Snackbar open={snack.open} autoHideDuration={5000} onClose={handleClose} anchorOrigin={{ vertical: "top", horizontal: "center" }}>
        <Alert severity={snack.severity} onClose={handleClose} sx={{ width: "100%" }}>{snack.message}</Alert>
      </Snackbar>

      {/* Review Dialog */}
      <Dialog open={openConfirmModal} onClose={() => setOpenConfirmModal(false)} maxWidth="md" fullWidth fullScreen={isMobile}
        PaperProps={{ sx: { borderRadius: isMobile ? 0 : "16px", overflow: "hidden", boxShadow: "0 24px 60px rgba(0,0,0,0.25)" } }}
      >
        <DialogTitle sx={{ bgcolor: headerColor || "#1976d2", color: "white", display: "flex", alignItems: "center", fontWeight: "bold", px: 3, py: 2 }}>
          <Box display="flex" alignItems="center" gap={1.5}>
            <Box sx={{ backgroundColor: "rgba(255,255,255,0.2)", borderRadius: "50%", width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>
              <Typography fontSize={20}>📄</Typography>
            </Box>
            <Box>
              <Typography fontWeight="bold" fontSize={16} color="white" lineHeight={1.2}>Review Your Uploaded Requirements</Typography>
              <Typography fontSize={12} color="rgba(255,255,255,0.8)" lineHeight={1.2}>Check all documents carefully before submitting</Typography>
            </Box>
          </Box>
        </DialogTitle>

        <DialogContent sx={{ pt: 2.5, px: { xs: 2, sm: 3 }, pb: 1 }}>
          <Box sx={{ border: "1px solid #f5a623", borderRadius: "8px", p: 1.5, mb: 2.5, mt: 2, display: "flex", gap: 1, alignItems: "flex-start", backgroundColor: "#fffbf2" }}>
            <span style={{ fontSize: 18, flexShrink: 0 }}>⚠️</span>
            <Typography fontSize={12.5} color="#5d4037" lineHeight={1.5}>
              <strong>Notice:</strong> Ensure all uploaded documents are <strong>correct, clear, and valid</strong>. Incomplete or unclear files may delay the processing of your enrollment records.
            </Typography>
          </Box>

          <Box sx={{ display: "flex", flexDirection: "column", gap: 1, mb: 2 }}>
            {requirements.filter((r) => r.category === "Main").map((doc) => {
              const uploaded = doc.upload_id ? doc : null;
              return (
                <Box key={doc.id} sx={{ display: "flex", alignItems: "center", gap: 1.5, backgroundColor: uploaded ? "#f0fff4" : "#fafafa", border: uploaded ? "1px solid #4caf50" : "1px solid #e0e0e0", borderRadius: "10px", p: "10px 14px" }}>
                  <Box sx={{ width: 36, height: 36, borderRadius: "50%", backgroundColor: uploaded ? "#4caf50" : "#e0e0e0", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Typography fontSize={16} color="white" fontWeight="bold">{uploaded ? "✓" : "–"}</Typography>
                  </Box>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography sx={{ fontSize: 13.5, fontWeight: 600, color: "#222", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{doc.description}</Typography>
                    <Typography sx={{ fontSize: 11.5, color: uploaded ? "#2e7d32" : "#999", mt: "1px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{uploaded?.original_name || "No file uploaded"}</Typography>
                  </Box>
                  {uploaded ? (
                    <Button variant="contained" color="primary" href={`${API_BASE_URL}/uploads/StudentOnlineDocuments/${uploaded.file_path}`} target="_blank" startIcon={<VisibilityIcon />} size="small" sx={{ color: "white", fontWeight: "bold", textTransform: "none", minWidth: { xs: "80px", sm: "140px" } }}>
                      {isMobile ? "View" : "Preview"}
                    </Button>
                  ) : (
                    <Chip label="Missing" size="small" sx={{ height: 24, fontSize: 11, fontWeight: 700, backgroundColor: "#FEE2E2", color: "#B91C1C", borderRadius: "6px", flexShrink: 0 }} />
                  )}
                </Box>
              );
            })}
          </Box>
        </DialogContent>

        <DialogActions sx={{ px: { xs: 2, sm: 3 }, pb: 2.5, pt: 1.5, display: "flex", justifyContent: "space-between", flexDirection: { xs: "column-reverse", sm: "row" }, gap: { xs: 1, sm: 0 } }}>
          <Button color="error" variant="outlined" fullWidth={isMobile} onClick={() => setOpenConfirmModal(false)}>Cancel</Button>
          <Button
            variant="contained"
            fullWidth={isMobile}
            onClick={async () => {
              if (!isFormValid()) return;
              try {
                await axios.post(`${API_BASE_URL}/api/student-submit-requirements`, {
                  person_id: userID || localStorage.getItem("person_id"),
                });
                setAllRequirementsCompleted(true);
                setOpenConfirmModal(false);
                setSnack({ open: true, severity: "success", message: "Requirements submitted successfully." });
                setTimeout(() => { window.location.href = "/student_dashboard"; }, 1500);
              } catch (err) {
                setSnack({ open: true, severity: "error", message: "Failed to submit. Please try again." });
              }
            }}
            sx={{ minWidth: { xs: "100%", sm: 200 }, height: 42, backgroundColor: headerColor || "#1976d2", color: "#fff", fontWeight: 700, fontSize: 14, textTransform: "none", boxShadow: "none", "&:hover": { backgroundColor: headerColor || "#1976d2", opacity: 0.9, boxShadow: "none" } }}
          >
            Submit Requirements
          </Button>
        </DialogActions>
      </Dialog>

      {/* Page Header */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", mb: 2, px: { xs: 2, sm: 0 }, pt: { xs: 2, sm: 0 } }}>
        <Typography variant="h4" sx={{ fontWeight: "bold", color: titleColor, fontSize: { xs: 20, sm: 28, md: 34, lg: 36 } }}>
          STUDENT'S REQUIREMENTS
        </Typography>
      </Box>
      <Box sx={{ borderTop: "1px solid #ccc", width: "100%" }} />
      <Box sx={{ height: { xs: 16, sm: 20 } }} />

      {/* Notice Box */}
      <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "center", width: "100%", px: { xs: 1.5, sm: 0 } }}>
        <Box sx={{ display: "flex", alignItems: "flex-start", gap: { xs: 1.5, sm: 2 }, width: "100%", p: { xs: 1.5, sm: 2 }, borderRadius: "10px", backgroundColor: "#fffaf5", border: "1px solid #6D2323", boxShadow: "0px 2px 8px rgba(0,0,0,0.05)" }}>
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#800000", borderRadius: "8px", width: { xs: 44, sm: 60 }, height: { xs: 44, sm: 60 }, flexShrink: 0 }}>
            <ErrorIcon sx={{ color: "white", fontSize: { xs: 28, sm: 40 } }} />
          </Box>
          <Typography sx={{ fontSize: { xs: 13, sm: 15, md: 17, lg: 18 }, fontFamily: "Poppins, sans-serif", color: "#3e3e3e", lineHeight: 1.6 }}>
            <strong style={{ color: "#600000" }}>Notice:</strong> Students are required to submit all{" "}
            <strong>Main Requirements (required documents)</strong> to complete their enrollment records. <strong>Optional documents</strong> are not required but may be uploaded if available. Only <strong>JPG, JPEG, PNG, or PDF</strong> files under <strong>4 MB</strong> are accepted.
          </Typography>
        </Box>
      </Box>

      {/* Requirements by Category */}
      <Box sx={{ px: { xs: 1.5, sm: 2 } }}>
        {Object.entries(
          requirements.reduce((acc, r) => {
            const cat = r.category || "Main";
            if (!acc[cat]) acc[cat] = [];
            acc[cat].push(r);
            return acc;
          }, {}),
        ).map(([category, docs]) => (
          <Box key={category} sx={{ mt: 4 }}>
            <Container disableGutters={isMobile} maxWidth="lg">
              <Typography
                sx={{
                  fontSize: { xs: 22, sm: 28, md: 36, lg: 42 },
                  fontWeight: "bold",
                  textAlign: "center",
                  color: subtitleColor,
                  mt: { xs: 1.5, sm: 3 },
                }}
              >
                {category === "Medical" ? "MEDICAL REQUIREMENTS" : category === "Others" ? "OTHER REQUIREMENTS" : "MAIN REQUIREMENTS"}
              </Typography>
              {category !== "Medical" && category !== "Others" && (
                <Typography
                  sx={{
                    textAlign: "center",
                    fontSize: { xs: 13, sm: 15, md: 17 },
                    mt: 1.25,
                    mb: { xs: 2, sm: 3.5 },
                    color: "#333",
                  }}
                >
                  Please upload your required documents for the upcoming academic year at{" "}
                  {shortTerm ? (
                    <>
                      <strong>{shortTerm.toUpperCase()}</strong>
                      <br />
                      {companyName || ""}
                    </>
                  ) : (
                    companyName || ""
                  )}
                  .
                  <br />
                  <strong>All required documents must be uploaded again</strong> to keep your records complete and up to date.
                </Typography>
              )}
            </Container>

            {isMobile ? (
              <Box sx={{ px: { xs: 0.5, sm: 1 } }}>
                {docs.map((doc) => renderMobileCard(doc))}
              </Box>
            ) : (
              <TableContainer
                component={Paper}
                sx={{
                  width: { md: "100%", lg: "95%" },
                  mx: { md: 0, lg: "auto" },
                  mt: 2,
                  border: `1px solid ${borderColor}`,
                  overflowX: "auto",
                }}
              >
                <Table sx={{ minWidth: 720 }}>
                  <TableHead sx={{ backgroundColor: headerColor || "#1976d2", border: `1px solid ${borderColor}` }}>
                    <TableRow>
                      {["Document", "Upload", "Remarks", "Preview", "Delete"].map((h) => (
                        <TableCell key={h} sx={{ color: "white", border: `1px solid ${borderColor}`, fontSize: { md: 13, lg: 14 } }}>{h}</TableCell>
                      ))}
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
                    {docs.map((doc) => renderRow(doc))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Box>
        ))}
      </Box>
    </Box>
  );
};

export default StudentOnlineRequirements;
