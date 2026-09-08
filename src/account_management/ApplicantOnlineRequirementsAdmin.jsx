import React, { useState, useEffect, useContext, useRef } from "react";
import { SettingsContext } from "../App";
import axios from "axios";
import {
  Box,
  Button,
  Typography,
  Paper,
  Table,
  TableBody,
  Card,
  TableCell,
  TableContainer,
  TableHead,
  TextField,
  DialogActions,
  Dialog,
  DialogContent,
  DialogTitle,
  TableRow,
  MenuItem,
  Modal,
  IconButton
} from "@mui/material";
import Search from "@mui/icons-material/Search";
import API_BASE_URL from "../apiConfig";
import EaristLogo from "../assets/EaristLogo.png";
import { getAuditConfig } from "../utils/auditEvents";
import useAccountAuditMac from "./useAccountAuditMac";
import { Link, useLocation } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import { Snackbar, Alert } from "@mui/material";
import SchoolIcon from "@mui/icons-material/School";
import DashboardIcon from "@mui/icons-material/Dashboard";
import AssignmentIcon from "@mui/icons-material/Assignment";
import MeetingRoomIcon from "@mui/icons-material/MeetingRoom";
import ScheduleIcon from "@mui/icons-material/Schedule";
import PersonSearchIcon from "@mui/icons-material/PersonSearch";
import PeopleIcon from "@mui/icons-material/People";
import FactCheckIcon from "@mui/icons-material/FactCheck";
import Unauthorized from "../components/Unauthorized";
import LoadingOverlay from "../components/LoadingOverlay";
import SearchIcon from "@mui/icons-material/Search";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import VisibilityIcon from "@mui/icons-material/Visibility";
import CloseIcon from "@mui/icons-material/Close";
import FormalExample from "../assets/formalexample.png";

const cleanSuggestionValue = (value) => {
  if (value === null || value === undefined) return "";
  const text = String(value).trim();
  return ["null", "undefined"].includes(text.toLowerCase()) ? "" : text;
};

const getApplicantSuggestionText = (applicant) =>
  [
    applicant?.applicant_number,
    applicant?.first_name,
    applicant?.middle_name,
    applicant?.last_name,
    applicant?.emailAddress,
    applicant?.email,
  ]
    .map(cleanSuggestionValue)
    .join(" ")
    .toLowerCase();

const getApplicantSuggestionValue = (applicant) =>
  cleanSuggestionValue(applicant?.applicant_number) ||
  cleanSuggestionValue(applicant?.emailAddress) ||
  cleanSuggestionValue(applicant?.email);

const ApplicantOnlineRequirementsAdmin = () => {
  useAccountAuditMac();
  const getAuditRequestConfig = (overrides = {}) => getAuditConfig(overrides);
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(2);

  // ------------------------------------
  const [requirements, setRequirements] = useState([]);

  const [selectedPerson, setSelectedPerson] = useState(null);
  useEffect(() => {
    axios
      .get(`${API_BASE_URL}/api/requirements`)
      .then((res) => {
        const allRequirements = res.data;

        if (selectedPerson) {
          // Filter by applicant's applyingAs value OR applicant_type === 0
          const filtered = allRequirements.filter(
            (req) =>
              Number(req.applicant_type) ===
              Number(selectedPerson.applyingAs) ||
              Number(req.applicant_type) === 0,
          );

          setRequirements(filtered);
        } else {
          // Default filter when no applicant is selected
          const filtered = allRequirements.filter(
            (req) =>
              Number(req.applicant_type) === 1 ||
              Number(req.applicant_type) === 0,
          );
          setRequirements(filtered);
        }
      })
      .catch((err) => console.error("Error loading requirements:", err));
  }, [selectedPerson]);
  // -------------------------------------

  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success", // success | error | warning | info
  })

  const showSnackbar = (message, severity = "success") => {
    setSnackbar({ open: true, message, severity });
  };

  const [explicitSelection, setExplicitSelection] = useState(false);

  const fetchByPersonId = async (personID) => {
    try {
      const res = await axios.get(
        `${API_BASE_URL}/api/person_with_applicant/${personID}`,
      );
      setPerson(res.data);
      setSelectedPerson(res.data);
      if (res.data?.applicant_number) {
        await fetchUploadsByApplicantNumber(res.data.applicant_number);
      }
    } catch (err) {
      console.error("❌ person_with_applicant failed:", err);
    }
  };



  const location = useLocation();
  const [uploads, setUploads] = useState([]);
  const [persons, setPersons] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState({});

  const [remarksMap, setRemarksMap] = useState({});
  const [userID, setUserID] = useState("");
  const [user, setUser] = useState("");
  const [userRole, setUserRole] = useState("");
  const [person, setPerson] = useState({
    profile_img: "",
    generalAverage1: "",
    height: "",
    program: "",
    strand: "",
    applyingAs: "",
    document_status: "",
    last_name: "",
    first_name: "",
    middle_name: "",
    extension: "",
    applicant_number: "",
  });


  const [curriculumOptions, setCurriculumOptions] = useState([]);

  useEffect(() => {
    const fetchCurriculums = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/api/applied_program`);
        setCurriculumOptions(response.data);
      } catch (error) {
        console.error("Error fetching curriculum options:", error);
      }
    };

    fetchCurriculums();
  }, []);

  {
    curriculumOptions.find(
      (item) =>
        item?.curriculum_id?.toString() === (person?.program ?? "").toString()
    )?.program_description || (person?.program ?? "")

  }


  const [editingRemarkId, setEditingRemarkId] = useState(null);
  const [newRemarkMode, setNewRemarkMode] = useState({}); // { [upload_id]: true|false }
  const [documentStatus, setDocumentStatus] = useState("");

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

  const [hasAccess, setHasAccess] = useState(null);
  const [canCreate, setCanCreate] = useState(false);
  const [canEdit, setCanEdit] = useState(false);
  const [canDelete, setCanDelete] = useState(false);
  const [loading, setLoading] = useState(false);

  const pageId = 84;

  const [employeeID, setEmployeeID] = useState("");

  const getAuditConfig = (extraHeaders = {}) => ({
    headers: {
      ...extraHeaders,
      "x-employee-id": employeeID || localStorage.getItem("employee_id") || "",
      "x-page-id": pageId,
      "x-audit-actor-id":
        employeeID ||
        localStorage.getItem("employee_id") ||
        localStorage.getItem("email") ||
        "unknown",
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
      const response = await axios.get(
        `${API_BASE_URL}/api/page_access/${employeeID}/${pageId}`,
      );
      if (response.data && response.data.page_privilege === 1) {
        setHasAccess(true);
        setCanCreate(response.data?.can_create === 1);
        setCanEdit(response.data?.can_edit === 1);
        setCanDelete(response.data?.can_delete === 1);
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

  useEffect(() => {
    const storedUser = localStorage.getItem("email");
    const storedRole = localStorage.getItem("role");
    const storedID = localStorage.getItem("person_id");
    setUserID(storedID);

    if (storedUser && storedRole && storedID) {
      setUser(storedUser);
      setUserRole(storedRole);
      setUserID(storedID);

      if (storedRole === "registrar") {
        if (storedID !== "undefined") {
        } else {
          console.warn("Stored person_id is invalid:", storedID);
        }
      } else {
        window.location.href = "/login";
      }
    } else {
      window.location.href = "/login";
    }
  }, []);

  const queryParams = new URLSearchParams(location.search);
  const queryPersonId = queryParams.get("person_id")?.trim() || "";

  useEffect(() => {
    let consumedFlag = false;

    const tryLoad = async () => {
      if (queryPersonId) {
        await fetchByPersonId(queryPersonId);
        setExplicitSelection(true);
        consumedFlag = true;
        return;
      }

      // fallback only if it's a fresh selection from Applicant List
      const source = sessionStorage.getItem("admin_edit_person_id_source");
      const tsStr = sessionStorage.getItem("admin_edit_person_id_ts");
      const id = sessionStorage.getItem("admin_edit_person_id");
      const ts = tsStr ? parseInt(tsStr, 10) : 0;
      const isFresh =
        source === "applicant_list" && Date.now() - ts < 5 * 60 * 1000;

      if (id && isFresh) {
        await fetchByPersonId(id);
        setExplicitSelection(true);
        consumedFlag = true;
      }
    };

    tryLoad().finally(() => {
      // consume the freshness so it won't auto-load again later
      if (consumedFlag) {
        sessionStorage.removeItem("admin_edit_person_id_source");
        sessionStorage.removeItem("admin_edit_person_id_ts");
      }
    });
  }, [queryPersonId]);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null); // "upload" or "delete"
  const [targetDoc, setTargetDoc] = useState(null); // document info

  // When clicking upload
  const handleConfirmUpload = (doc) => {
    if (!canCreate) {
      showSnackbar("You do not have permission to upload documents.", "warning");
      return;
    }
    setTargetDoc(doc);
    setConfirmAction("upload");
    setConfirmOpen(true);
  };

  // When clicking delete
  const handleConfirmDelete = (doc) => {
    if (!canDelete) {
      showSnackbar("You do not have permission to delete documents.", "warning");
      return;
    }
    setTargetDoc(doc);
    setConfirmAction("delete");
    setConfirmOpen(true);
  };

  // Execute action after confirm
  const handleConfirmAction = async () => {
    if (confirmAction === "upload") {
      // call your upload logic here
      await handleUploadSubmit(targetDoc);
      console.log(
        `📂 Document uploaded by: ${localStorage.getItem("username")}`,
      );
    } else if (confirmAction === "delete") {
      await handleDelete(targetDoc.upload_id);
      console.log(
        `🗑️ Document deleted by: ${localStorage.getItem("username")}`,
      );
    }
    setConfirmOpen(false);
  };

  useEffect(() => {
    fetchPersons();
  }, []);

  const fetchUploadsByApplicantNumber = async (applicant_number) => {
    if (!applicant_number) return;
    try {
      const res = await axios.get(
        `${API_BASE_URL}/api/uploads/by-applicant/${applicant_number}`,
      );
      setUploads(res.data);
    } catch (err) {
      console.error("Fetch uploads failed:", err);
      console.log("Fetching for applicant number:", applicant_number);
    }
  };

  const fetchPersonData = async (personID) => {
    if (!personID || personID === "undefined") {
      console.warn("Invalid personID for person data:", personID);
      return;
    }
    try {
      const res = await axios.get(
        `${API_BASE_URL}/api/person_with_applicant/${personID}`,
      );
      const safePerson = {
        ...res.data,
        document_status: res.data.document_status || "",
      };
      setPerson(safePerson); // ✅ only update person
      // ❌ don't call setSelectedPerson here
    } catch (error) {
      console.error(
        "❌ Failed to fetch person data:",
        error?.response?.data || error.message,
      );
    }
  };

  const fetchDocumentStatus = async (applicant_number) => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/document_status/${applicant_number}`,
      );
      setDocumentStatus(response.data.document_status);
      setPerson((prev) => ({
        ...prev,
        evaluator: response.data.evaluator || null,
      }));
    } catch (err) {
      console.error("Error fetching document status:", err);
    }
  };

  useEffect(() => {
    if (person.applicant_number) {
      fetchDocumentStatus(person.applicant_number); // <-- pass the param
    }
  }, [person.applicant_number]);

  useEffect(() => {
    if (selectedPerson?.person_id) {
      fetchPersonData(selectedPerson.person_id);
    }
  }, [selectedPerson]);

  useEffect(() => {
    // No search text: keep explicit selection if present
    if (!searchQuery.trim()) {
      if (!explicitSelection) {
        setSelectedPerson(null);
        setUploads([]);
        setSelectedFiles({});
        setPerson({
          profile_img: "",
          generalAverage1: "",
          program: "",
          strand: "",
          height: "",
          applyingAs: "",
          document_status: "",
          last_name: "",
          first_name: "",
          middle_name: "",
          extension: "",
        });
      }
      return;
    }

    // User started typing -> manual search takes over
    if (explicitSelection) setExplicitSelection(false);

    const match = persons.find((p) =>
      `${p.first_name} ${p.middle_name} ${p.last_name} ${p.emailAddress} ${p.applicant_number || ""}`
        .toLowerCase()
        .includes(searchQuery.toLowerCase()),
    );

    if (match) {
      setSelectedPerson(match);
      fetchUploadsByApplicantNumber(match.applicant_number);
    } else {
      setSelectedPerson(null);
      setUploads([]);
      setPerson({
        profile_img: "",
        generalAverage1: "",
        height: "",
        applyingAs: "",
        program: "",
        strand: "",
        document_status: "",
        last_name: "",
        first_name: "",
        middle_name: "",
        extension: "",
      });
    }
  }, [searchQuery, persons, explicitSelection]);

  const applicantSuggestions =
    searchQuery.trim().length >= 2
      ? persons
        .filter((applicant) =>
          getApplicantSuggestionText(applicant).includes(searchQuery.trim().toLowerCase()),
        )
        .slice(0, 8)
      : [];

  const fetchPersons = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/upload_documents`);
      setPersons(res.data);
    } catch (err) {
      console.error("Error fetching persons:", err);
    }
  };

  const handleStatusChange = async (uploadId, remarkValue) => {
    if (!canEdit) {
      showSnackbar("You do not have permission to update document status.", "warning");
      return;
    }

    try {
      await axios.put(`${API_BASE_URL}/api/uploads/status/${uploadId}`, {
        status: remarkValue,
        user_id: userID,
      }, getAuditConfig());

      // ✅ Optimistic update for UI
      setUploads((prev) =>
        prev.map((u) =>
          u.upload_id === uploadId
            ? { ...u, status: parseInt(remarkValue, 10) }
            : u,
        ),
      );

      // ✅ Refresh from backend to ensure sync
      if (selectedPerson?.applicant_number) {
        await fetchUploadsByApplicantNumber(selectedPerson.applicant_number);
      }
    } catch (err) {
      console.error("Error updating Status:", err);
    }
  };

  const handleDocumentStatus = async (event) => {
    if (!canEdit) {
      showSnackbar("You do not have permission to update document status.", "warning");
      return;
    }

    const newStatus = event.target.value;
    setDocumentStatus(newStatus);

    try {
      await axios.put(
        `${API_BASE_URL}/api/document_status/${person.applicant_number}`,
        {
          document_status: newStatus,
          user_id: localStorage.getItem("person_id"),
        },
        getAuditConfig(),
      );

      // ✅ Refresh evaluator and document status
      await fetchDocumentStatus(person.applicant_number);

      // ✅ Also refresh uploads list to update row values in the table
      if (person.applicant_number) {
        await fetchUploadsByApplicantNumber(person.applicant_number);
      }

      console.log("Document status updated and UI refreshed!");
    } catch (err) {
      console.error("Error updating document status:", err);
    }
  };

  const handleApplyingAsChange = async (event) => {
    if (!canEdit) {
      showSnackbar("You do not have permission to update Applying As.", "warning");
      return;
    }

    const newValue = event.target.value;
    if (!newValue || newValue === person.applyingAs) return;

    const personId = selectedPerson?.person_id || person?.person_id;
    if (!personId) {
      showSnackbar("Please select an applicant first.", "warning");
      return;
    }

    try {
      await axios.put(
        `${API_BASE_URL}/api/person/${personId}`,
        { applyingAs: newValue },
        getAuditConfig({ "x-audit-change-section": "personal_information" })
      );

      setPerson((prev) => ({ ...prev, applyingAs: newValue }));

      // ✅ keep selectedPerson in sync so the requirements-filter effect re-runs
      setSelectedPerson((prev) =>
        prev ? { ...prev, applyingAs: newValue } : prev
      );

      showSnackbar("✅ Applying As updated successfully.", "success");
    } catch (err) {
      console.error("Error updating applyingAs:", err);
      showSnackbar("❌ Failed to update Applying As.", "error");
    }
  };

  const handleUploadSubmit = async () => {
    if (!canCreate) {
      showSnackbar("You do not have permission to upload documents.", "warning");
      return;
    }

    if (!selectedFiles.requirements_id || !selectedPerson?.person_id) {
      alert("Please select a document type.");
      return;
    }

    const file = selectedFiles.file;

    if (!file) {
      showSnackbar("Please select a file first.", "warning");
      return;
    }

    const maxSize = 4 * 1024 * 1024; // 4MB

    if (file.size > maxSize) {
      showSnackbar("File must not exceed 4MB", "error");
      return;
    }


    // If remarks is chosen but no file selected
    if (selectedFiles.remarks && !selectedFiles.file) {
      alert("Please select a file for the chosen remarks.");
      return;
    }

    try {
      const formData = new FormData();
      if (selectedFiles.file) formData.append("file", selectedFiles.file);
      formData.append("requirements_id", selectedFiles.requirements_id);
      formData.append("person_id", selectedPerson.person_id);
      formData.append("remarks", selectedFiles.remarks || "");

      await axios.post(`${API_BASE_URL}/api/upload`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          "x-person-id": localStorage.getItem("person_id"), // ✅ now inside headers
          ...getAuditConfig().headers,
        },
      });

      showSnackbar("✅ Upload successful!", "success");

      setSelectedFiles({});
      if (selectedPerson?.applicant_number) {
        fetchUploadsByApplicantNumber(selectedPerson.applicant_number);
      }
    } catch (error) {
      console.error("Upload failed:", error);
      showSnackbar("❌ Upload failed.", "error");
    }
  };

  const [photoModalOpen, setPhotoModalOpen] = useState(false);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoSnackbar, setPhotoSnackbar] = useState({ open: false, message: "", severity: "success" });
  const [photoVersion, setPhotoVersion] = useState(Date.now()); // ✅ cache-buster


  const handlePhotoFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const validTypes = ["image/jpeg", "image/jpg", "image/png"];
    const maxSize = 2 * 1024 * 1024;

    if (!validTypes.includes(file.type)) {
      showSnackbar("Invalid file type. Please select a JPEG or PNG file.", "error");
      return;
    }
    if (file.size > maxSize) {
      showSnackbar("File is too large. Maximum allowed size is 2MB.", "error");
      return;
    }

    setPhotoFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setPhotoPreview(reader.result);
    reader.readAsDataURL(file);
  };

  const handlePhotoUpload = async () => {
    if (!photoFile) {
      showSnackbar("Please select a file first.", "warning");
      return;
    }

    const targetPersonId = selectedPerson?.person_id || person?.person_id;
    if (!targetPersonId) {
      showSnackbar("No applicant selected.", "warning");
      return;
    }

    const formData = new FormData();
    formData.append("profile_picture", photoFile);
    formData.append("person_id", targetPersonId);

    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/upload-profile-picture`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );

      const fileName = response.data.filename || response.data.profile_img;

      setPerson((prev) => ({ ...prev, profile_img: fileName }));
      setSelectedPerson((prev) =>
        prev ? { ...prev, profile_img: fileName } : prev
      );

      setPhotoVersion(Date.now()); // ✅ force <img> to re-fetch

      showSnackbar("✅ Photo uploaded successfully!", "success");
      setPhotoModalOpen(false);
      setPhotoFile(null);
      setPhotoPreview(null);
    } catch (error) {
      console.error("Photo upload failed:", error);
      showSnackbar("❌ Photo upload failed. Please try again.", "error");
    }
  };

  const handleDeleteExistingPhoto = async () => {
    const targetPersonId = selectedPerson?.person_id || person?.person_id;
    if (!targetPersonId) return;

    try {
      await axios.put(
        `${API_BASE_URL}/api/person/${targetPersonId}`,
        { profile_img: "" },
        getAuditConfig(),
      );

      setPerson((prev) => ({ ...prev, profile_img: "" }));
      setSelectedPerson((prev) =>
        prev ? { ...prev, profile_img: "" } : prev
      );

      setPhotoPreview(null);
      setPhotoFile(null);
      setPhotoVersion(Date.now()); // ✅ cache-buster

      showSnackbar("Image removed successfully.", "info");
    } catch (err) {
      console.error("Failed to remove photo:", err);
      showSnackbar("❌ Failed to remove photo.", "error");
    }
  };

  const handleDelete = async (uploadId) => {
    if (!canDelete) {
      showSnackbar(
        "You do not have permission to delete documents.",
        "warning"
      );
      return;
    }

    try {
      await axios.delete(`${API_BASE_URL}/api/admin/uploads/${uploadId}`, {
        headers: {
          "x-person-id": localStorage.getItem("person_id"),
          ...getAuditConfig().headers,
        },
        withCredentials: true,
      });

      // ✅ Refresh uploads
      if (selectedPerson?.applicant_number) {
        fetchUploadsByApplicantNumber(selectedPerson.applicant_number);
      }

      // ✅ SUCCESS SNACKBAR
      showSnackbar("🗑️ Document deleted successfully!", "success");

    } catch (err) {
      console.error("Delete error:", err);

      // ❌ ERROR SNACKBAR
      showSnackbar("❌ Failed to delete document.", "error");
    }
  };

  const actionButtonStyle = {
    height: "40px",
    width: "100px",
    minWidth: "100px",
    textTransform: "none",
    color: "white",
    fontWeight: "bold",
  };

  const renderRow = (doc) => {
    const uploaded = uploads.find((u) => u.description === doc.label);
    const uploadId = uploaded?.upload_id;

    const buttonStyle = {
      minWidth: 120,
      height: 40,
      fontWeight: "bold",
      fontSize: "14px",
      textTransform: "none",
    };

    return (
      <TableRow key={doc.key}>
        <TableCell
          sx={{
            fontWeight: "bold",
            width: "20%",
            border: `1px solid ${borderColor}`,
          }}
        >
          {doc.label}
          {Number(doc.is_optional) === 1 && (
            <span style={{ marginLeft: 2 }}>(Optional)</span>
          )}
        </TableCell>

        <TableCell sx={{ width: "20%", border: `1px solid ${borderColor}` }}>
          {uploadId && editingRemarkId === uploadId ? (
            // 🔥 TEXTFIELD ONLY
            <TextField
              size="small"
              fullWidth
              autoFocus
              placeholder="Enter remarks"
              value={remarksMap[uploadId] ?? uploaded?.remarks ?? ""}
              onChange={(e) =>
                setRemarksMap((prev) => ({
                  ...prev,
                  [uploadId]: e.target.value,
                }))
              }
              onBlur={async () => {
                const finalRemark = (remarksMap[uploadId] || "").trim();

                await axios.put(`${API_BASE_URL}/api/uploads/remarks/${uploadId}`, {
                  remarks: finalRemark,
                  status:
                    uploads.find((u) => u.upload_id === uploadId)?.status ||
                    "0",
                  user_id: userID,
                }, getAuditConfig());

                if (selectedPerson?.applicant_number) {
                  await fetchUploadsByApplicantNumber(
                    selectedPerson.applicant_number,
                  );
                }

                setEditingRemarkId(null);
              }}
              onKeyDown={async (e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  const finalRemark = (remarksMap[uploadId] || "").trim();

                  await axios.put(
                    `${API_BASE_URL}/api/uploads/remarks/${uploadId}`,
                    {
                      remarks: finalRemark,
                      status:
                        uploads.find((u) => u.upload_id === uploadId)?.status ||
                        "0",
                      user_id: userID,
                    },
                    getAuditConfig(),
                  );

                  if (selectedPerson?.applicant_number) {
                    await fetchUploadsByApplicantNumber(
                      selectedPerson.applicant_number,
                    );
                  }

                  setEditingRemarkId(null);
                }
              }}
            />
          ) : (
            // 📌 DISPLAY MODE with GRAY BORDER (click to edit)
            <Box
              onClick={() => {
                if (!uploadId) return;
                setEditingRemarkId(uploadId);
                setRemarksMap((prev) => ({
                  ...prev,
                  [uploadId]: uploaded?.remarks ?? "",
                }));
              }}
              sx={{
                cursor: uploadId ? "pointer" : "default",
                fontStyle: uploaded?.remarks ? "normal" : "italic",
                color: uploaded?.remarks ? "inherit" : "#888",
                minHeight: "40px",
                display: "flex",
                alignItems: "center",
                px: 1,

                // ⭐ Added border here
                border: "1px solid #bdbdbd",
                borderRadius: "4px",
                backgroundColor: "#fafafa",
              }}
            >
              {uploaded?.remarks || "Click to add remarks"}
            </Box>
          )}
        </TableCell>

        <TableCell
          align="center"
          sx={{ width: "15%", border: `1px solid ${borderColor}` }}
        >
          {uploaded ? (
            uploaded.status === 1 ? (
              <Box
                sx={{
                  backgroundColor: "#4CAF50",
                  color: "white",
                  borderRadius: 1,
                  width: 140,
                  height: 40,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto",
                }}
              >
                <Typography sx={{ fontWeight: "bold" }}>Verified</Typography>
              </Box>
            ) : uploaded.status === 2 ? (
              <Box
                sx={{
                  backgroundColor: "#F44336",
                  color: "white",
                  borderRadius: 1,
                  width: 140,
                  height: 40,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto",
                }}
              >
                <Typography sx={{ fontWeight: "bold" }}>Rejected</Typography>
              </Box>
            ) : (
              <Box display="flex" justifyContent="center" gap={1}>
                <Button
                  disabled
                  variant="contained"
                  onClick={() => handleStatusChange(uploaded.upload_id, "1")}
                  sx={{
                    ...buttonStyle,
                    backgroundColor: "green",
                    color: "white",
                  }}
                >
                  Verified
                </Button>
                <Button
                  disabled
                  variant="contained"
                  onClick={() => handleStatusChange(uploaded.upload_id, "2")}
                  sx={{
                    ...buttonStyle,
                    backgroundColor: "red",
                    color: "white",
                  }}
                >
                  Rejected
                </Button>
              </Box>
            )
          ) : null}
        </TableCell>

        <TableCell style={{ border: `1px solid ${borderColor}` }}>
          {uploaded?.created_at &&
            new Date(uploaded.created_at).toLocaleString("en-PH", {
              dateStyle: "medium",
              timeStyle: "short",
              timeZone: "Asia/Manila",
            })}
        </TableCell>

        <TableCell style={{ border: `1px solid ${borderColor}` }}>
          {selectedPerson?.applicant_number || person?.applicant_number
            ? `[${selectedPerson?.applicant_number || person?.applicant_number}] ${(selectedPerson?.last_name || person?.last_name || "").toUpperCase()}, ${(selectedPerson?.first_name || person?.first_name || "").toUpperCase()} ${(selectedPerson?.middle_name || person?.middle_name || "").toUpperCase()} ${(selectedPerson?.extension || person?.extension || "").toUpperCase()}`
            : ""}
        </TableCell>

        <TableCell style={{ border: `1px solid ${borderColor}` }}>
          <Box display="flex" justifyContent="center" gap={1}>
            {uploaded ? (
              <>
                {/* <Button
                  variant="contained"
                  size="small"
                  startIcon={<EditIcon />}
                  sx={{
                    ...actionButtonStyle,
                    backgroundColor: "green",
                  }}
                  onClick={() => {
                    setEditingRemarkId(uploaded.upload_id);
                    setRemarksMap((prev) => ({
                      ...prev,
                      [uploaded.upload_id]: uploaded.remarks || "",
                    }));
                  }}
                >
                  Edit
                </Button> */}

                <Button
                  variant="contained"
                  startIcon={<VisibilityIcon />}
                  sx={{
                    ...actionButtonStyle,
                    backgroundColor: "#1976d2",
                  }}
                  href={`${API_BASE_URL}/ApplicantOnlineDocuments/${uploaded.file_path}`}
                  target="_blank"
                >
                  Preview
                </Button>

                <Button
                  variant="contained"
                  onClick={() => handleConfirmDelete(uploaded)}
                  startIcon={<DeleteIcon />}
                  sx={{
                    ...actionButtonStyle,
                    backgroundColor: "#9E0000",
                  }}
                >
                  Delete
                </Button>
              </>
            ) : null}
          </Box>
        </TableCell>
      </TableRow>
    );
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
      {/* Top header: APPLICANT ONLINE REQUIREMENTS + Search */}
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
          APPLICANT ONLINE REQUIREMENTS
        </Typography>

        <Box sx={{ position: "relative", width: 450 }}>
          <TextField
            variant="outlined"
            placeholder="Search Applicant Name / Email / Applicant ID"
            size="small"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setSuggestionsOpen(true);
            }}
            onFocus={() => setSuggestionsOpen(true)}
            onBlur={() => setTimeout(() => setSuggestionsOpen(false), 150)}
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
          {suggestionsOpen && searchQuery.trim().length >= 2 && (
            <Box sx={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 10, mt: 0.5, maxHeight: 260, overflowY: "auto", backgroundColor: "#fff", border: "1px solid #d6d6d6", borderRadius: 1, boxShadow: "0 8px 20px rgba(0,0,0,0.12)" }}>
              {applicantSuggestions.length > 0 ? (
                applicantSuggestions.map((applicant) => {
                  const applicantNumber = cleanSuggestionValue(applicant?.applicant_number);
                  const name = [applicant?.last_name, applicant?.first_name, applicant?.middle_name]
                    .map(cleanSuggestionValue)
                    .filter(Boolean)
                    .join(", ");
                  const email = cleanSuggestionValue(applicant?.emailAddress || applicant?.email);

                  return (
                    <Box key={`${applicant?.person_id}-${applicantNumber}`} onMouseDown={(e) => { e.preventDefault(); setExplicitSelection(true); setSelectedPerson(applicant); setSearchQuery(getApplicantSuggestionValue(applicant)); fetchUploadsByApplicantNumber(applicant.applicant_number); setSuggestionsOpen(false); }} sx={{ px: 2, py: 1, cursor: "pointer", display: "flex", alignItems: "center", gap: 1, fontSize: 14, borderBottom: "1px solid #f0f0f0", "&:hover": { backgroundColor: "#f5f7fb" } }}>
                      <Typography component="span" sx={{ fontWeight: 700, minWidth: 120 }}>{applicantNumber || "No applicant ID"}</Typography>
                      <Typography component="span" sx={{ color: "#444", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{[name, email].filter(Boolean).join(" - ")}</Typography>
                    </Box>
                  );
                })
              ) : (
                <Box sx={{ px: 2, py: 1, color: "#777", fontSize: 14 }}>No matching applicants</Box>
              )}
            </Box>
          )}
        </Box>
      </Box>

      <hr style={{ border: "1px solid #ccc", width: "100%" }} />
      <br />

      <br />
      {/* Applicant ID and Name */}
      <TableContainer
        component={Paper}
        sx={{ width: "100%", border: `1px solid ${borderColor}` }}
      >
        <Table>
          <TableHead
            sx={{ backgroundColor: headerColor || "#1976d2" }}
          >
            <TableRow>
              {/* Left cell: Applicant ID */}
              <TableCell
                sx={{
                  color: "white",
                  fontSize: "20px",
                  fontFamily: "Poppins, sans-serif",
                }}
              >
                Applicant ID:&nbsp;
                <span
                  style={{
                    fontFamily: "Poppins, sans-serif",
                    fontWeight: "normal",
                    textDecoration: "underline",
                  }}
                >
                  {selectedPerson?.applicant_number ||
                    person?.applicant_number ||
                    "N/A"}
                </span>
              </TableCell>

              {/* Right cell: Applicant Name, right-aligned */}
              <TableCell
                align="right"
                sx={{
                  color: "white",
                  fontSize: "20px",
                  fontFamily: "Poppins, sans-serif",
                }}
              >
                Applicant Name:&nbsp;
                <span
                  style={{
                    fontFamily: "Poppins, sans-serif",
                    fontWeight: "normal",
                    textDecoration: "underline",
                  }}
                >
                  {(
                    selectedPerson?.last_name ||
                    person?.last_name ||
                    ""
                  ).toUpperCase()}
                  , &nbsp;
                  {(
                    selectedPerson?.first_name ||
                    person?.first_name ||
                    ""
                  ).toUpperCase()}{" "}
                  {(
                    selectedPerson?.middle_name ||
                    person?.middle_name ||
                    ""
                  ).toUpperCase()}{" "}
                  {(
                    selectedPerson?.extension ||
                    person?.extension ||
                    ""
                  ).toUpperCase()}
                </span>
              </TableCell>
            </TableRow>
          </TableHead>
        </Table>
      </TableContainer>

      <TableContainer
        component={Paper}
        sx={{ width: "100%", border: `1px solid ${borderColor}` }}
      >
        <Box sx={{ px: 2, mb: 2, mt: 2 }}>
          <Box sx={{ display: "flex", alignItems: "center", mb: 1, }}>
            <Typography
              sx={{
                fontSize: "14px",
                fontFamily: "Poppins, sans-serif",
                minWidth: "100px",

                mr: 1,
              }}
            >
              Program Applied:
            </Typography>
            <TextField
              size="small"
              name="program"
              value={curriculumOptions.length > 0
                ? curriculumOptions.find(
                  (item) =>
                    item?.curriculum_id?.toString() ===
                    (person?.program ?? "").toString()
                )?.program_description || (person?.program ?? "")
                : "Loading..."}
              sx={{ width: "500px" }}
              InputProps={{
                sx: {
                  height: 35, // control outer height
                },
              }}
              inputProps={{
                style: {
                  padding: "4px 8px", // control inner padding
                  fontSize: "12px",
                },
              }}
            />
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", mb: 1, }}>
            <Typography
              sx={{
                fontSize: "14px",
                fontFamily: "Poppins, sans-serif",
                minWidth: "100px",

                mr: 1,
              }}
            >
              Strand:
            </Typography>
            <TextField
              size="small"
              name="strand"
              value={person.strand || ""}
              sx={{ width: "350px" }}
              InputProps={{
                sx: {
                  height: 35, // control outer height
                },
              }}
              inputProps={{
                style: {
                  padding: "4px 8px", // control inner padding
                  fontSize: "12px",
                },
              }}
            />
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", mb: 1, }}>
            <Typography
              sx={{
                fontSize: "14px",
                fontFamily: "Poppins, sans-serif",
                minWidth: "100px",

                mr: 1,
              }}
            >
              SHS Gwa:
            </Typography>
            <TextField
              size="small"
              name="generalAverage1"
              value={person.generalAverage1 || ""}
              sx={{ width: "250px" }}
              InputProps={{
                sx: {
                  height: 35, // control outer height
                },
              }}
              inputProps={{
                style: {
                  padding: "4px 8px", // control inner padding
                  fontSize: "12px",
                },
              }}
            />
          </Box>

          <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
            <Typography
              sx={{
                fontSize: "14px",
                fontFamily: "Poppins, sans-serif",
                minWidth: "100px",
                mr: 1,
              }}
            >
              Height:
            </Typography>
            <TextField
              size="small"
              name="height"
              value={person.height || ""}
              sx={{ width: "100px" }}
              InputProps={{
                sx: {
                  height: 35,
                },
              }}
              inputProps={{
                style: {
                  padding: "4px 8px",
                  fontSize: "12px",
                },
              }}
            />
            <div style={{ fontSize: "12px", marginLeft: "10px" }}>cm.</div>
          </Box>
        </Box>
        <br />
        <br />

        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 2,
            px: 2,
          }}
        >
          {/* Left side: Applying As and Strand */}
          <Box>
            {/* Applying As */}
            <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
              <Typography
                sx={{
                  fontSize: "14px",
                  fontFamily: "Poppins, sans-serif",
                  minWidth: "120px",

                  mr: 4.8,
                }}
              >
                Applying As:
              </Typography>
              <TextField
                select
                size="small"
                name="applyingAs"
                value={person.applyingAs || ""}
                onChange={handleApplyingAsChange}
                placeholder="Select applyingAs"
                sx={{ width: "400px" }}
                InputProps={{ sx: { height: 35 } }}
                inputProps={{ style: { padding: "4px 8px", fontSize: "12px" } }}
              >
                <MenuItem value="">
                  <em>Select Applying</em>
                </MenuItem>
                <MenuItem value="1">Senior High School Graduate</MenuItem>
                <MenuItem value="2">
                  Senior High School Graduating Student
                </MenuItem>
                <MenuItem value="3">
                  ALS (Alternative Learning System) Passer
                </MenuItem>
                <MenuItem value="4">
                  Transferee from other University/College
                </MenuItem>
                <MenuItem value="5">Cross Enrolee Student</MenuItem>
                <MenuItem value="6">Foreign Applicant/Student</MenuItem>
                <MenuItem value="7">Baccalaureate Graduate</MenuItem>
                <MenuItem value="8">Master Degree Graduate</MenuItem>
              </TextField>
            </Box>

            <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
              <Typography
                sx={{
                  fontSize: "14px",
                  fontFamily: "Poppins, sans-serif",
                  minWidth: "140px",
                  mr: 2.3,
                }}
              >
                Document Status:
              </Typography>
              <TextField
                disabled
                select
                size="small"
                name="document_status"
                value={documentStatus}
                onChange={handleDocumentStatus}
                sx={{ width: "300px", mr: 2 }}
                InputProps={{ sx: { height: 35 } }}
                inputProps={{ style: { padding: "4px 8px", fontSize: "12px" } }}
              >
                <MenuItem value="">
                  <em>Select Document Status</em>
                </MenuItem>
                <MenuItem value="On Process">On Process</MenuItem>
                <MenuItem value="Documents Verified & ECAT">
                  Documents Verified & ECAT
                </MenuItem>
                <MenuItem value="Disapproved / Program Closed">
                  Disapproved / Program Closed
                </MenuItem>
              </TextField>

              {person?.evaluator?.evaluator_email && (
                <Typography variant="caption" sx={{ marginLeft: 1 }}>
                  Status Changed By:{" "}
                  {person.evaluator.evaluator_email.replace(
                    /@gmail\.com$/i,
                    "",
                  )}{" "}
                  ({person.evaluator.evaluator_lname || ""},{" "}
                  {person.evaluator.evaluator_fname || ""}{" "}
                  {person.evaluator.evaluator_mname || ""}
                  )
                  <br />
                  Updated At:{" "}
                  {new Date(person.evaluator.created_at).toLocaleString()}
                </Typography>
              )}
            </Box>

            {/* Document Type, Remarks, and Document File */}
            <Box sx={{ display: "flex", alignItems: "center", gap: 4, mb: 2 }}>
              {/* Document Type */}
              {/* ---------------------------------------------------------------------- */}
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Typography
                  sx={{
                    fontSize: "14px",
                    fontFamily: "Poppins, sans-serif",
                    width: "90px",
                  }}
                >
                  Document Type:
                </Typography>
                <TextField
                  select
                  size="small"
                  placeholder="Select Documents"
                  value={selectedFiles.requirements_id || ""}
                  onChange={(e) =>
                    setSelectedFiles((prev) => ({
                      ...prev,
                      requirements_id: e.target.value,
                    }))
                  }
                  sx={{ width: 200 }}
                  InputProps={{ sx: { height: 38 } }}
                  inputProps={{
                    style: { padding: "4px 8px", fontSize: "12px" },
                  }}
                >
                  <MenuItem value="">
                    <em>Select Documents</em>
                  </MenuItem>
                  {/* ✅ Dynamically map requirements from DB */}
                  {requirements.map((req) => (
                    <MenuItem key={req.id} value={req.id}>
                      {req.description}
                      {req.is_optional === 1 && (
                        <span
                          style={{
                            color: "#999",
                            fontStyle: "italic",
                            marginLeft: 6,
                          }}
                        >
                          (Optional)
                        </span>
                      )}
                    </MenuItem>
                  ))}
                </TextField>
              </Box>
              {/* ---------------------------------------------------------------------- */}
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  marginLeft: "-25px",
                }}
              >
                <Typography
                  sx={{
                    fontSize: "14px",
                    fontFamily: "Poppins, sans-serif",
                    width: "100px",
                    textAlign: "center",
                  }}
                >
                  Document File:
                </Typography>

                {/* 📂 Gray Box Always Visible */}
                <Box
                  sx={{
                    backgroundColor: "#e0e0e0",
                    padding: "6px 12px",
                    borderRadius: "4px",
                    fontSize: "14px",
                    fontWeight: "bold",
                    height: 38,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 250,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                  title={
                    selectedFiles.file
                      ? selectedFiles.file.name
                      : "No file selected"
                  }
                >
                  {selectedFiles.file
                    ? selectedFiles.file.name
                    : "No file selected"}
                </Box>

                {/* 📁 Browse Button */}
                <Button
                  variant="contained"
                  startIcon={<CloudUploadIcon />}
                  onClick={() => document.getElementById("fileInput").click()}
                  sx={{
                    backgroundColor: "#1976d2",
                    color: "white",
                    textTransform: "none",
                    width: 250,
                    height: 38,
                    fontSize: "15px",
                    fontWeight: "bold",
                    justifyContent: "center",
                    "&:hover": { backgroundColor: "#1565c0" },
                  }}
                >
                  Browse File
                </Button>

                <input
                  id="fileInput"
                  type="file"
                  hidden
                  accept=".jpg,.jpeg,.png,.pdf"
                  onChange={(e) =>
                    setSelectedFiles((prev) => ({
                      ...prev,
                      file: e.target.files[0],
                    }))
                  }
                />

                {/* 🟢 Submit Button */}
                <Button
                  variant="contained"
                  color="success"
                  sx={{
                    textTransform: "none",
                    fontWeight: "bold",
                    height: 38,
                    width: 250,
                  }}
                  onClick={() => handleConfirmUpload({ label: "New Document" })}
                  disabled={!selectedFiles.file}
                >
                  Submit Documents
                </Button>
              </Box>
            </Box>
          </Box>

          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              marginTop: "-360px",
              gap: 1,
            }}
          >
            <Box
              sx={{
                width: "2.10in",
                height: "2.10in",
                border: "1px solid #ccc",
                overflow: "hidden",
                borderRadius: "4px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "#f5f5f5",
              }}
            >
              {person.profile_img ? (
                <img
                  src={`${API_BASE_URL}/uploads/Applicant1by1/${person.profile_img}?v=${photoVersion}`}
                  alt="Profile"
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              ) : (
                <Typography fontSize={11} color="textSecondary" textAlign="center" px={1}>
                  No Photo Uploaded
                </Typography>
              )}
            </Box>

            <Button
              variant="contained"
              size="small"
              startIcon={<CloudUploadIcon />}
              onClick={() => setPhotoModalOpen(true)}
              disabled={!selectedPerson?.person_id && !person?.person_id}
              sx={{
                backgroundColor: mainButtonColor,
                color: "#fff",
                textTransform: "none",
                fontWeight: "bold",
                width: "2.10in",
                "&:hover": { backgroundColor: "#000" },
              }}
            >
              Upload Photo
            </Button>
          </Box>
        </Box>
      </TableContainer>

      <>
        <TableContainer
          component={Paper}
          sx={{ width: "100%", border: `1px solid ${borderColor}` }}
        >
          <Table>
            <TableHead
              sx={{ backgroundColor: headerColor || "#1976d2" }}
            >
              <TableRow>
                <TableCell
                  sx={{
                    color: "white",
                    textAlign: "Center",
                    border: `1px solid ${borderColor}`,
                  }}
                >
                  Document Type
                </TableCell>
                <TableCell
                  sx={{
                    color: "white",
                    textAlign: "Center",
                    border: `1px solid ${borderColor}`,
                  }}
                >
                  Remarks
                </TableCell>
                <TableCell
                  sx={{
                    color: "white",
                    textAlign: "Center",
                    border: `1px solid ${borderColor}`,
                  }}
                >
                  Status
                </TableCell>
                <TableCell
                  sx={{
                    color: "white",
                    textAlign: "Center",
                    border: `1px solid ${borderColor}`,
                  }}
                >
                  Date and Time Submitted
                </TableCell>
                <TableCell
                  sx={{
                    color: "white",
                    textAlign: "Center",
                    border: `1px solid ${borderColor}`,
                  }}
                >
                  User
                </TableCell>
                <TableCell
                  sx={{
                    color: "white",
                    textAlign: "Center",
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
              {requirements.map((doc) =>
                renderRow({
                  label: doc.description,
                  key: doc.short_label || doc.description.replace(/\s+/g, ""),
                  id: doc.id,
                  is_optional: doc.is_optional,
                }),
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <Snackbar
          open={snackbar.open}
          autoHideDuration={3000}
          onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
          anchorOrigin={{ vertical: "top", horizontal: "center" }}
        >
          <Alert
            onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
            severity={snackbar.severity}
            sx={{ width: "100%" }}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>
        {/* Confirmation Dialog */}
        <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)} fullWidth maxWidth="sm">
          <DialogTitle
            sx={{
              background: headerColor || "#9E0000",
              color: "#fff",
              fontWeight: 700,
              fontSize: "1.2rem",
              py: 2,
            }}
          >
            {confirmAction === "upload" ? "📤 Confirm Upload" : "🗑️ Confirm Deletion"}
          </DialogTitle>

          <DialogContent sx={{ maxHeight: 400, overflowY: "auto", p: 3, mt: 2 }}>
            <Box
              sx={{
                backgroundColor: "#fdfdfd",
                borderRadius: "8px",
                px: 2,
                py: 2,
                border: "1px solid #ddd",
                fontSize: "0.95rem",
                lineHeight: 1.8,
              }}
            >
              {confirmAction === "upload" ? (
                <Typography>
                  Are you sure you want to upload{" "}
                  <strong>{targetDoc?.label}</strong>?<br />
                  Added by:{" "}
                  <strong>{localStorage.getItem("username")}</strong>
                </Typography>
              ) : (
                <Typography>
                  Are you sure you want to delete{" "}
                  <strong>
                    {targetDoc?.label || targetDoc?.short_label || targetDoc?.file_path}
                  </strong>
                  ?<br />
                  Deleted by:{" "}
                  <strong>{localStorage.getItem("username")}</strong>
                </Typography>
              )}
            </Box>
          </DialogContent>

          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button
              color="error"
              variant="outlined"
              onClick={() => setConfirmOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={handleConfirmAction}
              sx={{
                backgroundColor: headerColor || "#9E0000",
                "&:hover": {
                  backgroundColor: headerColor
                    ? `${headerColor}cc`
                    : "#7a0000",
                },
              }}
            >
              Yes, Confirm
            </Button>
          </DialogActions>
        </Dialog>

        {/* Photo Upload Modal */}
        <Modal
          open={photoModalOpen}
          onClose={() => {
            setPhotoModalOpen(false);
            setPhotoFile(null);
            setPhotoPreview(null);
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: "100vh",
            }}
          >
            <Box
              sx={{
                position: "relative",
                width: 900,
                maxWidth: "95vw",
                bgcolor: "background.paper",
                borderRadius: 3,
                boxShadow: 24,
                maxHeight: "90vh",
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
              }}
            >
              {/* Header */}
              <Box
                sx={{
                  bgcolor: headerColor || "#1976d2",
                  color: "white",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  py: 2,
                  px: 3,
                }}
              >
                <Typography variant="h6" fontWeight="bold">
                  Upload Applicant 2×2 Photo
                </Typography>
                <IconButton
                  onClick={() => {
                    setPhotoModalOpen(false);
                    setPhotoFile(null);
                    setPhotoPreview(null);
                  }}
                  sx={{
                    color: "white",
                    border: "2px solid rgba(255,255,255,0.6)",
                    borderRadius: "50%",
                    width: 40,
                    height: 40,
                    padding: 0,
                    "&:hover": {
                      backgroundColor: "rgba(255,255,255,0.2)",
                      border: "2px solid white",
                    },
                  }}
                >
                  <CloseIcon sx={{ fontSize: 18 }} />
                </IconButton>
              </Box>

              {/* Body */}
              <Box
                sx={{
                  p: 3,
                  overflowY: "auto",
                  borderTop: "1px solid #e0e0e0",
                  borderBottom: "1px solid #e0e0e0",
                }}
              >
                <Box sx={{ display: "flex", gap: 3, alignItems: "flex-start" }}>
                  {/* LEFT SIDE — Sample/Reference Photo */}
                  <Box sx={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
                    <Typography variant="subtitle2" color="text.secondary" fontWeight={600}>
                      ✅ Sample Format (Follow this exactly)
                    </Typography>

                    <Box
                      component="img"
                      src={FormalExample}
                      alt="Formal Photo Example"
                      sx={{
                        width: "100%",
                        maxWidth: 420,
                        height: 260,
                        mx: "auto",
                        border: `1px solid ${borderColor}`,
                        borderRadius: 2,
                        backgroundColor: "#fff",
                      }}
                    />

                    <Box
                      sx={{
                        border: "2px dashed #ccc",
                        p: 2,
                        borderRadius: 2,
                        backgroundColor: "#f9f9f9",
                      }}
                    >
                      <Typography variant="body1" fontWeight="bold" mb={1}>
                        Guidelines:
                      </Typography>
                      <Box sx={{ ml: 1, fontSize: "14px" }}>
                        - Size: 2" x 2"
                        <br />
                        - Color: Your photo must be in colored.
                        <br />
                        - Background: White.
                        <br />
                        - Head size and position: Look directly into the camera at a
                        straight angle, face centered.
                        <br />
                        - File types: JPEG, JPG, PNG
                        <br />
                        - Attire must be formal.
                        <br />
                        - Required File Size: 2mb
                      </Box>
                    </Box>
                  </Box>

                  {/* RIGHT SIDE — Upload area */}
                  <Box sx={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
                    <Typography variant="subtitle2" color="text.secondary" fontWeight={600}>
                      📤 Applicant's Photo
                    </Typography>

                    {/* Preview */}
                    {(photoPreview || person.profile_img) && (
                      <Box sx={{ display: "flex", justifyContent: "center", position: "relative" }}>
                        <Box
                          component="img"
                          src={
                            photoPreview
                              ? photoPreview
                              : `${API_BASE_URL}/uploads/Applicant1by1/${person.profile_img}?v=${photoVersion}`
                          }
                          alt="Preview"
                          sx={{
                            width: "192px",
                            height: "192px",
                            objectFit: "cover",
                            border: `1px solid ${borderColor}`,
                            borderRadius: 2,
                          }}
                        />

                        <Button
                          size="small"
                          onClick={async () => {
                            if (photoPreview) {
                              // Just clear the newly selected file, don't touch saved photo
                              setPhotoFile(null);
                              setPhotoPreview(null);
                            } else {
                              // Actually delete the saved photo
                              await handleDeleteExistingPhoto();
                            }
                          }}
                          sx={{
                            position: "absolute",
                            top: -8,
                            right: "calc(50% - 103px)",
                            minWidth: 0,
                            width: 28,
                            height: 28,
                            fontSize: "18px",
                            p: 0,
                            color: "#fff",
                            bgcolor: "#d32f2f",
                            borderRadius: "50%",
                            "&:hover": { bgcolor: "#b71c1c" },
                          }}
                        >
                          ×
                        </Button>
                      </Box>
                    )}

                    {!photoPreview && !person.profile_img && (
                      <Box
                        sx={{
                          height: 192,
                          border: "1px dashed #ccc",
                          borderRadius: 2,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "text.secondary",
                          fontSize: 13,
                          textAlign: "center",
                          px: 2,
                        }}
                      >
                        No photo selected yet — match the sample on the left.
                      </Box>
                    )}

                    <Typography
                      sx={{ fontSize: "16px", color: mainButtonColor, fontWeight: "bold" }}
                    >
                      Select Your Image:
                    </Typography>
                    <input
                      type="file"
                      accept=".jpg,.jpeg,.png"
                      onClick={(e) => (e.target.value = null)}
                      onChange={handlePhotoFileChange}
                      style={{
                        display: "block",
                        width: "100%",
                        padding: "10px",
                        border: "1px solid #ccc",
                        borderRadius: "4px",
                      }}
                    />

                    <Typography variant="caption" color="text.secondary">
                      Click the × on your preview to remove it, choose a new file, then
                      press Upload.
                    </Typography>
                  </Box>
                </Box>
              </Box>

              {/* Footer */}
              <Box sx={{ p: 2, display: "flex", justifyContent: "space-between" }}>
                <Button
                  onClick={() => {
                    setPhotoModalOpen(false);
                    setPhotoFile(null);
                    setPhotoPreview(null);
                  }}
                  color="error"
                  variant="outlined"
                >
                  Cancel
                </Button>

                <Button
                  onClick={handlePhotoUpload}
                  variant="contained"
                  color="success"
                  size="small"
                  disabled={!photoFile}
                  sx={{ minWidth: "140px", height: "40px" }}
                >
                  Upload
                </Button>
              </Box>
            </Box>
          </Box>
        </Modal>
      </>
    </Box>
  );
};

export default ApplicantOnlineRequirementsAdmin;
