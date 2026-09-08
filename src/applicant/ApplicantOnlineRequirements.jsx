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
import EmailOutlinedIcon from "@mui/icons-material/EmailOutlined";
import DashboardOutlinedIcon from "@mui/icons-material/DashboardOutlined";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import SendIcon from "@mui/icons-material/Send";

const ApplicantOnlineRequirements = () => {
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
  const [subButtonColor, setSubButtonColor] = useState("#ffffff");
  const [stepperColor, setStepperColor] = useState("#000000");

  const [fetchedLogo, setFetchedLogo] = useState(null);
  const [companyName, setCompanyName] = useState("");
  const [shortTerm, setShortTerm] = useState("");
  const [campusAddress, setCampusAddress] = useState("");
  const [branches, setBranches] = useState([]);

  useEffect(() => {
    if (!settings) return;
    if (colors.title) setTitleColor(colors.title);
    if (colors.subtitle) setSubtitleColor(colors.subtitle);
    if (colors.border) setBorderColor(colors.border);
    if (colors.mainButton) setMainButtonColor(colors.mainButton);
    if (colors.subButton) setSubButtonColor(colors.subButton);
    if (colors.stepper) setStepperColor(colors.stepper);
    if (assets.logoUrl) setFetchedLogo(`${assets.logoUrl}`);
    if (branding.companyName) setCompanyName(branding.companyName);
    if (branding.shortTerm) setShortTerm(branding.shortTerm);
    if (branding.campusAddress) setCampusAddress(branding.campusAddress);
    setBranches(settings?.branches || []);
  }, [settings]);

  const getBranchLabel = (branchId) => {
    const branch = branches.find((item) => String(item.id) === String(branchId));
    return branch?.branch || "—";
  };

  const [requirements, setRequirements] = useState([]);
  const [uploads, setUploads] = useState([]);
  const [userID, setUserID] = useState("");
  const [selectedFiles, setSelectedFiles] = useState({});
  const [allRequirementsCompleted, setAllRequirementsCompleted] = useState(false);

  const [snack, setSnack] = useState({ open: false, message: "", severity: "success" });

  useEffect(() => {
    const id = localStorage.getItem("person_id");
    if (id) {
      setUserID(id);
      fetchUploads(id);
    }
    axios
      .get(`${API_BASE_URL}/api/requirements/${id}`)
      .then((res) => setRequirements(res.data))
      .catch((err) => console.error("Error loading requirements:", err));
  }, []);

  const [openModal, setOpenModal] = useState(false);
  const [openConfirmModal, setOpenConfirmModal] = useState(false);


  const [user, setUser] = useState("");
  const [userRole, setUserRole] = useState("");
  const [person, setPerson] = useState({
    applicant_number: "",
    profile_img: "",
    campus: "",
    academicProgram: "",
    classifiedAs: "",
    program: "",
    program2: "",
    program3: "",
    yearLevel: "",
    last_name: "",
    first_name: "",
    middle_name: "",
    extension: "",
    nickname: "",
    height: "",
    weight: "",
    lrnNumber: "",
    gender: "",
    pwdType: "",
    pwdId: "",
    birthOfDate: "",
    age: "",
    birthPlace: "",
    languageDialectSpoken: "",
    citizenship: "",
    religion: "",
    civilStatus: "",
    tribeEthnicGroup: "",
    otherEthnicGroup: "",
    cellphoneNumber: "",
    emailAddress: "",
    telephoneNumber: "",
    facebookAccount: "",
    presentStreet: "",
    presentBarangay: "",
    presentZipCode: "",
    presentRegion: "",
    presentProvince: "",
    presentMunicipality: "",
    presentDswdHouseholdNumber: "",
    permanentStreet: "",
    permanentBarangay: "",
    permanentZipCode: "",
    permanentRegion: "",
    permanentProvince: "",
    permanentMunicipality: "",
    permanentDswdHouseholdNumber: "",
    father_deceased: "",
    father_family_name: "",
    father_given_name: "",
    father_middle_name: "",
    father_ext: "",
    father_contact: "",
    father_occupation: "",
    father_income: "",
    father_email: "",
    mother_deceased: "",
    mother_family_name: "",
    mother_given_name: "",
    mother_middle_name: "",
    mother_contact: "",
    mother_occupation: "",
    mother_income: "",
    guardian: "",
    guardian_family_name: "",
    guardian_given_name: "",
    guardian_middle_name: "",
    guardian_ext: "",
    guardian_nickname: "",
    guardian_address: "",
    guardian_contact: "",
    guardian_email: "",
    schoolLevel: "",
    schoolLastAttended: "",
    schoolAddress: "",
    courseProgram: "",
    honor: "",
    generalAverage: "",
    yearGraduated: "",
    schoolLevel1: "",
    schoolLastAttended1: "",
    schoolAddress1: "",
    courseProgram1: "",
    honor1: "",
    generalAverage1: "",
    yearGraduated1: "",
    strand: "",
  });

  useEffect(() => {
    const storedUser = localStorage.getItem("email");
    const storedRole = localStorage.getItem("role");
    const storedID = localStorage.getItem("person_id");

    if (storedUser && storedRole && storedID) {
      setUser(storedUser);
      setUserRole(storedRole);
      setUserID(storedID);

      if (storedRole === "applicant" || storedRole === "registrar") {
        fetchPersonData(storedID);
      } else {
        window.location.href = "/login";
      }
    } else {
      window.location.href = "/login";
    }
  }, []);

  // ✅ Fetch person data from backend
  const fetchPersonData = async (id) => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/person/${id}`);
      setPerson(res.data); // make sure backend returns the correct format
    } catch (error) {
      console.error("Failed to fetch person:", error);
    }
  };

  const fetchUploads = async (personId) => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/uploads/${personId}`);
      const uploadsData = res.data;
      setUploads(uploadsData);

      const rebuiltSelectedFiles = {};
      uploadsData.forEach((upload) => {
        rebuiltSelectedFiles[upload.requirements_id] = upload.original_name;
      });
      setSelectedFiles(rebuiltSelectedFiles);

      // ✅ Actually fetch the status from the DB first
      const statusRes = await axios.get(`${API_BASE_URL}/api/applicant-status/${personId}`);
      const alreadySubmitted = statusRes.data.requirements === 1;

      if (!alreadySubmitted) {
        const reqRes = await axios.get(`${API_BASE_URL}/api/requirements/${personId}`);
        const verifiableRequirements = reqRes.data.filter(
          (r) => r.is_verifiable === 1 && r.category === "Main",
        );
        const uploadedIds = new Set(uploadsData.map((u) => u.requirements_id));
        const allRequiredUploaded =
          verifiableRequirements.length > 0 &&
          verifiableRequirements.every((r) => uploadedIds.has(r.id));

        if (uploadsData.length > 0 && allRequiredUploaded) {
          setOpenConfirmModal(true);
        }
      }

      setAllRequirementsCompleted(alreadySubmitted);
    } catch (err) {
      console.error("❌ Fetch uploads failed:", err);
    }
  };

  const handleUpload = async (key, file) => {
    if (!file) return;
    const personId = userID || localStorage.getItem("person_id");
    if (!personId) {
      setSnack({ open: true, severity: "error", message: "Unable to upload: applicant ID was not found." });
      return;
    }
    const maxSize = 4 * 1024 * 1024;
    if (file.size > maxSize) {
      setSnack({ open: true, severity: "error", message: "File must not exceed 4MB" });
      return;
    }
    setSelectedFiles((prev) => ({ ...prev, [key]: file.name }));
    const formData = new FormData();
    formData.append("file", file);
    formData.append("requirements_id", key);
    formData.append("person_id", personId);
    try {
      await axios.post(`${API_BASE_URL}/api/upload`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      await fetchUploads(personId);
      setSnack({ open: true, severity: "success", message: "File uploaded successfully." });
    } catch (err) {
      setSelectedFiles((prev) => { const next = { ...prev }; delete next[key]; return next; });
      setSnack({ open: true, severity: "error", message: err.response?.data?.error || "Upload failed" });
    }
  };

  const handleDelete = async (uploadId) => {
    try {
      await axios.delete(`${API_BASE_URL}/api/uploads/${uploadId}`, {
        headers: { "x-person-id": userID },
      });
      setSnack({ open: true, severity: "success", message: "File deleted successfully" });
      setTimeout(() => fetchUploads(userID), 300);
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
    return null;
  };

  const formatBirthDate = (dateValue) => {
    if (!dateValue) return "—";
    const d = new Date(dateValue);
    if (isNaN(d.getTime())) return dateValue; // fallback: show raw value if it can't be parsed
    return d.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

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

  // 🔒 Right-click / DevTools blocking was previously here and is left disabled,
  // matching the existing intent of this file. If re-enabled elsewhere, do it via
  // a useEffect with listener cleanup (see ApplicantResetPassword / ApplicantOtherInformation)
  // rather than attaching a new listener on every render.

  // Mobile / small-tablet card per document
  // Mobile / small-tablet card per document
  const renderMobileCard = (doc) => {
    const uploaded = uploads.find((u) => Number(u.requirements_id) === Number(doc.id));
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
          {doc.label}
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
            sx={{ backgroundColor: "#F0C03F", color: "white", fontWeight: "bold", textTransform: "none", flex: "1 1 auto", minWidth: "120px" }}
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
              href={`${API_BASE_URL}/api/uploads/preview/${uploaded.upload_id}`}
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
              sx={{ backgroundColor: "#9E0000", color: "white", fontWeight: "bold", textTransform: "none", flex: "1 1 auto", minWidth: "100px" }}
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
    const uploaded = uploads.find((u) => Number(u.requirements_id) === Number(doc.id));
    return (
      <TableRow key={doc.id}>
        <TableCell sx={{ fontWeight: "bold", width: "25%", border: `1px solid ${borderColor}`, fontSize: { md: 13, lg: 14 } }}>
          {doc.label}
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
                sx={{ backgroundColor: "#F0C03F", color: "white", fontWeight: "bold", height: "40px", textTransform: "none", minWidth: { md: 120, lg: 140 }, fontSize: { md: 12.5, lg: 14 } }}
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
              href={`${API_BASE_URL}/api/uploads/preview/${uploaded.upload_id}`}
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
              sx={{ backgroundColor: "#9E0000", color: "white", fontWeight: "bold", height: "40px", textTransform: "none", minWidth: { md: 120, lg: 140 }, fontSize: { md: 12.5, lg: 14 } }}
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

      {/* Success Dialog */}
      <Dialog open={openModal} onClose={() => setOpenModal(false)} maxWidth="sm" fullWidth fullScreen={isMobile}
        PaperProps={{ sx: { borderRadius: isMobile ? 0 : "16px", overflow: "hidden", boxShadow: "0 24px 60px rgba(0,0,0,0.25)" } }}
      >
        <DialogTitle sx={{ bgcolor: headerColor || "#1976d2", color: "white", display: "flex", alignItems: "center", fontWeight: "bold", px: 3, py: 2 }}>
          <Box display="flex" alignItems="center" gap={1.5}>
            <Box sx={{ backgroundColor: "rgba(255,255,255,0.2)", borderRadius: "50%", width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Typography fontSize={20}>🎉</Typography>
            </Box>
            <Box>
              <Typography fontWeight="bold" fontSize={16} color="white" lineHeight={1.2}>Application Submitted Successfully!</Typography>
              <Typography fontSize={12} color="rgba(255,255,255,0.8)" lineHeight={1.2}>Your application has been received</Typography>
            </Box>
          </Box>
        </DialogTitle>

        <DialogContent sx={{ px: { xs: 2, sm: 3 }, pt: 2.5, pb: 1 }}>
          <Box sx={{ display: "flex", justifyContent: "center", mb: 2.5, mt: 1 }}>
            <Box sx={{ width: 76, height: 76, borderRadius: "50%", backgroundColor: "rgba(255,255,255,0.9)", border: `3px solid ${headerColor || "#1976d2"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 34 }}>
              🎓
            </Box>
          </Box>
          <Box sx={{ textAlign: "center", mb: 2 }}>
            <Typography sx={{ fontSize: 17, fontWeight: 700, color: "#1a1a1a", mb: 1 }}>Congratulations, Applicant!</Typography>
            <Typography sx={{ fontSize: "13.5px", color: "#333", lineHeight: 1.65, mb: 1 }}>
              Your application to <strong style={{ color: headerColor || "#1976d2" }}>{companyName}</strong> has been successfully received.
            </Typography>
            <Typography sx={{ fontSize: "13.5px", color: "#333", lineHeight: 1.65 }}>
              The <strong style={{ color: headerColor || "#1976d2" }}>Admission Office</strong> will contact you regarding the evaluation of your submitted documents.
            </Typography>
          </Box>

          {/* Applicant summary card */}
          <Box
            sx={{
              border: `1.5px solid ${headerColor || "#1976d2"}`,
              borderRadius: "12px",
              overflow: "hidden",
              mb: 1,
            }}
          >
            <Box
              sx={{
                backgroundColor: headerColor || "#1976d2",
                px: 2,
                py: 1,
              }}
            >
              <Typography sx={{ color: "#fff", fontWeight: 700, fontSize: 13 }}>
                Your Application Details
              </Typography>
            </Box>

            <Box sx={{ p: 2, backgroundColor: "#fafcff" }}>
              <Typography sx={{ fontSize: 12.5, color: "#000", mb: 0.25 }}>
                Applicant Name
              </Typography>
              <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", mb: 1.5 }}>
                <Box sx={{ flex: "1 1 22%", minWidth: 100 }}>
                  <Typography sx={{ fontSize: 11, color: "#666" }}>First Name</Typography>
                  <Typography sx={{ fontSize: 14, fontWeight: 700, color: "#1a1a1a" }}>
                    {person.first_name || "—"}
                  </Typography>
                </Box>
                <Box sx={{ flex: "1 1 22%", minWidth: 100 }}>
                  <Typography sx={{ fontSize: 11, color: "#666" }}>Middle Name</Typography>
                  <Typography sx={{ fontSize: 14, fontWeight: 700, color: "#1a1a1a" }}>
                    {person.middle_name || "—"}
                  </Typography>
                </Box>
                <Box sx={{ flex: "1 1 22%", minWidth: 100 }}>
                  <Typography sx={{ fontSize: 11, color: "#666" }}>Last Name</Typography>
                  <Typography sx={{ fontSize: 14, fontWeight: 700, color: "#1a1a1a" }}>
                    {person.last_name || "—"}
                  </Typography>
                </Box>
                <Box sx={{ flex: "1 1 18%", minWidth: 80 }}>
                  <Typography sx={{ fontSize: 11, color: "#666" }}>Extension</Typography>
                  <Typography sx={{ fontSize: 14, fontWeight: 700, color: "#1a1a1a" }}>
                    {person.extension || "—"}
                  </Typography>
                </Box>
              </Box>

              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  backgroundColor: "#fff3cd",
                  border: "1.5px dashed #d4a017",
                  borderRadius: "8px",
                  p: 1.25,
                  mb: 1.5,
                }}
              >
                <Box sx={{ flex: 1 }}>
                  <Typography sx={{ fontSize: 11.5, color: "#7a5c00", fontWeight: 700, letterSpacing: "0.04em" }}>
                    ⚠️ PLEASE REMEMBER YOUR APPLICANT NUMBER
                  </Typography>
                  <Typography sx={{ fontSize: 18, fontWeight: 800, color: "#5d4500", textAlign: "center", letterSpacing: "0.03em", mt: 0.25 }}>
                    {person.applicant_number || "—"}
                  </Typography>
                </Box>
              </Box>

              <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
                <Box sx={{ flex: "1 1 45%", minWidth: 130 }}>
                  <Typography sx={{ fontSize: 11.5, color: "#000" }}>Birth Date</Typography>
                  <Typography sx={{ fontSize: 13.5, fontWeight: 600, color: "#222" }}>
                    {formatBirthDate(person.birthOfDate)}
                  </Typography>
                </Box>
                <Box sx={{ flex: "1 1 30%", minWidth: 90 }}>
                  <Typography sx={{ fontSize: 11.5, color: "#000" }}>Age</Typography>
                  <Typography sx={{ fontSize: 13.5, fontWeight: 600, color: "#222" }}>
                    {person.age || "—"}
                  </Typography>
                </Box>
                <Box sx={{ flex: "1 1 100%" }}>
                  <Typography sx={{ fontSize: 11.5, color: "#000" }}>Gmail / Email Address</Typography>
                  <Typography sx={{ fontSize: 13.5, fontWeight: 600, color: "#222", wordBreak: "break-all" }}>
                    {person.emailAddress || "—"}
                  </Typography>
                </Box>
              </Box>

              <Typography sx={{ fontSize: 11.5, color: "#888", mt: 1.5, fontStyle: "italic", lineHeight: 1.5 }}>
                Please verify that your birth date and Gmail address above are correct. These will be used to identify you and send important updates regarding your application.
              </Typography>
            </Box>
          </Box>

          <Box
            sx={{
              display: "flex",
              alignItems: "flex-start",
              gap: 1.25,
              backgroundColor: "#fdecea",
              border: "1.5px solid #c62828",
              borderRadius: "10px",
              p: 1.5,
              mb: 1,
            }}
          >
            <ErrorIcon sx={{ color: "#c62828", fontSize: 22, flexShrink: 0, mt: "1px" }} />
            <Box>
              <Typography sx={{ fontSize: 12.5, fontWeight: 800, color: "#c62828", letterSpacing: "0.02em" }}>
                REQUIRED: PRINT YOUR PERSONAL DATA FORM
              </Typography>
              <Typography sx={{ fontSize: 12.5, color: "#7a1f1f", lineHeight: 1.55, mt: 0.25 }}>
                Now that all your main requirements are uploaded, you must go to{" "}
                <strong>Personal Information → Printable Documents</strong> and print your{" "}
                <strong>Personal Data Form</strong>. Bring the printed copy with you for
                submission/verification — your application is not complete without it.
              </Typography>
            </Box>
          </Box>
          <Box sx={{ borderTop: "1px solid #e0e0e0", my: 2 }} />
          <Box sx={{ display: "flex", gap: 1.5, mb: 1, flexDirection: { xs: "column", sm: "row" } }}>
            {[
              { icon: <EmailOutlinedIcon sx={{ fontSize: 18, color: headerColor || "#1976d2", flexShrink: 0 }} />, label: "Check your Gmail for email updates from the Admission Office." },
              { icon: <DashboardOutlinedIcon sx={{ fontSize: 18, color: headerColor || "#1976d2", flexShrink: 0 }} />, label: "Monitor your Applicant Dashboard for real-time status updates." },
            ].map((item, i) => (
              <Box key={i} sx={{ flex: 1, backgroundColor: "#f0f7ff", borderLeft: `3px solid ${headerColor || "#1976d2"}`, borderRadius: "0 9px 9px 0", p: 1.5, display: "flex", gap: 1, alignItems: "flex-start" }}>
                {item.icon}
                <Typography sx={{ fontSize: 12.5, color: "#333", lineHeight: 1.5 }}>{item.label}</Typography>
              </Box>
            ))}
          </Box>
        </DialogContent>

        <DialogActions sx={{ px: { xs: 2, sm: 3 }, pb: 2.5, pt: 1.5 }}>
          <Button
            fullWidth
            variant="contained"
            endIcon={<ArrowForwardIcon />}
            onClick={() => { setOpenModal(false); window.location.href = "/applicant_dashboard"; }}
            sx={{ height: 44, borderRadius: "10px", backgroundColor: headerColor || "#1976d2", color: "#fff", fontWeight: 700, fontSize: 14, textTransform: "none", boxShadow: "none", "&:hover": { backgroundColor: headerColor || "#1976d2", opacity: 0.9, boxShadow: "none" } }}
          >
            Go to Applicant Dashboard
          </Button>
        </DialogActions>
      </Dialog>

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
              <strong>Notice:</strong> Ensure all uploaded documents are <strong>correct, clear, and valid</strong>. Incomplete or unclear files may delay the processing of your admission application.
            </Typography>
          </Box>

          <Box sx={{ display: "flex", flexDirection: "column", gap: 1, mb: 2 }}>
            {requirements.filter((r) => r.category === "Main").map((doc) => {
              const uploaded = uploads.find((u) => Number(u.requirements_id) === Number(doc.id));
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
                    <Button variant="contained" color="primary" href={`${API_BASE_URL}/api/uploads/preview/${uploaded.upload_id}`} target="_blank" startIcon={<VisibilityIcon />} size="small" sx={{ color: "white", fontWeight: "bold", textTransform: "none", minWidth: { xs: "80px", sm: "140px" } }}>
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
            endIcon={<SendIcon />}
            fullWidth={isMobile}
            onClick={async () => {
              if (!isFormValid()) return;
              try {
                await axios.post(`${API_BASE_URL}/api/submit-requirements`, {
                  person_id: userID || localStorage.getItem("person_id"),
                });
                setAllRequirementsCompleted(true);
                setOpenConfirmModal(false);
                setOpenModal(true);
              } catch (err) {
                setSnack({
                  open: true,
                  severity: "error",
                  message: "Failed to submit requirements. Please try again.",
                });
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
          APPLICANT'S DOCUMENTS
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
            <strong style={{ color: "#600000" }}>Notice:</strong> Applicants are required to submit all{" "}
            <strong>Main Requirements (required) documents</strong> to proceed. <strong>Optional documents</strong> are not required but may be uploaded. Only <strong>JPG, JPEG, PNG, or PDF</strong> files under <strong>4 MB</strong> are accepted.
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
                <Typography sx={{ textAlign: "center", fontSize: { xs: 13, sm: 15, md: 17 }, mt: 1.25, mb: { xs: 2, sm: 3.5 }, color: "#333" }}>
                  Complete the applicant form to secure your place for the upcoming academic year at{" "}
                  {shortTerm ? <><strong>{shortTerm.toUpperCase()}</strong> <br />{companyName || ""}</> : companyName || ""}.
                </Typography>
              )}
            </Container>

            {isMobile ? (
              <Box sx={{ px: { xs: 0.5, sm: 1 } }}>
                {docs.map((doc) => renderMobileCard({ id: doc.id, label: doc.description, is_required: doc.is_required, is_optional: doc.is_optional }))}
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
                  <TableBody>
                    {docs.map((doc) => renderRow({ id: doc.id, label: doc.description, is_required: doc.is_required, is_optional: doc.is_optional }))}
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

export default ApplicantOnlineRequirements;
