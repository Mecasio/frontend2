import React, { useState, useEffect, useContext, useRef } from "react";
import { SettingsContext } from "../App";
import EaristLogo from "../assets/EaristLogo.png";
import axios from "axios";
import {
  Box,
  Button,
  Typography,
  Paper,
  Table,
  TableBody,
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
} from "@mui/material";
import API_BASE_URL from "../apiConfig";
import { restrictToRegistrarCurriculum } from "../utils/registrarCurriculumRestriction";
import useRegistrarScopeRevision from "../hooks/useRegistrarScopeRevision";
import Search from "@mui/icons-material/Search";
import { Link, useLocation } from "react-router-dom";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import { io } from "socket.io-client";
import { Snackbar, Alert } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import Unauthorized from "../components/Unauthorized";
import LoadingOverlay from "../components/LoadingOverlay";
import VisibilityIcon from "@mui/icons-material/Visibility";
import { getFlatAuditHeaders } from "../utils/auditEvents";
import useAuditMac from "../utils/useAuditMac";
import CollegeEnrollmentTabs from "../components/CollegeEnrollmentTabs";

const cleanStudentValue = (value) => {
  if (value === null || value === undefined) return "";
  const text = String(value).trim();
  return ["null", "undefined"].includes(text.toLowerCase()) ? "" : text;
};

const formatStudentSuggestionName = (student) =>
  [
    cleanStudentValue(student?.last_name),
    cleanStudentValue(student?.first_name),
    cleanStudentValue(student?.middle_name),
    cleanStudentValue(student?.extension),
  ]
    .filter(Boolean)
    .join(" ");

const getStudentSuggestionText = (student) =>
  [
    student?.student_number,
    student?.first_name,
    student?.middle_name,
    student?.last_name,
    student?.extension,
    student?.emailAddress,
    student?.program_code,
    student?.program_description,
  ]
    .map(cleanStudentValue)
    .join(" ")
    .toLowerCase();

const getStudentSuggestionValue = (student) =>
  cleanStudentValue(student?.student_number) ||
  formatStudentSuggestionName(student) ||
  cleanStudentValue(student?.emailAddress);

const StudentOnlineRequirementsCollege = () => {
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
      setFetchedLogo(assets.logoUrl);
    } else {
      setFetchedLogo(EaristLogo);
    }

    // 🏷️ School Information
    if (branding.companyName) setCompanyName(branding.companyName);
    if (branding.shortTerm) setShortTerm(branding.shortTerm);
    if (branding.campusAddress) setCampusAddress(branding.campusAddress);
  }, [settings]);

  const socketRef = useRef(null);

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
  });

  const showSnackbar = (message, severity = "success") => {
    setSnackbar({ open: true, message, severity });
  };

  const [explicitSelection, setExplicitSelection] = useState(false);

  const location = useLocation();

  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const personIdFromUrl = queryParams.get("person_id");

    if (!personIdFromUrl) return;

    // fetch info of that person
    axios
      .get(`${API_BASE_URL}api/person_with_applicant/${personIdFromUrl}`)
      .then((res) => {
        if (res.data?.student_number) {
          // AUTO-INSERT applicant_number into search bar
          setSearchQuery(res.data.student_number);

          // If you have a fetchUploads() or fetchExamScore() — call it
          if (typeof fetchUploadsByApplicantNumber === "function") {
            fetchUploadsByApplicantNumber(res.data.student_number);
          }

          if (typeof fetchApplicants === "function") {
            fetchApplicants();
          }
        }
      })
      .catch((err) => console.error("Auto search failed:", err));
  }, [location.search]);

  useEffect(() => {
    const storedId = sessionStorage.getItem("edit_student_number");

    if (storedId) {
      setSearchQuery(storedId);
    }
  }, []);

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
    student_number: "",
  });


  const [curriculumOptions, setCurriculumOptions] = useState([]);

  const scopeRevision = useRegistrarScopeRevision();

  useEffect(() => {
    const fetchCurriculums = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/api/applied_program`);
        setCurriculumOptions(restrictToRegistrarCurriculum(response.data));
      } catch (error) {
        console.error("Error fetching curriculum options:", error);
      }
    };

    fetchCurriculums();
  }, [scopeRevision]);

  {
    curriculumOptions.find(
      (item) =>
        item?.curriculum_id?.toString() === (person?.program ?? "").toString()
    )?.program_description || (person?.program ?? "")

  }


  const [editingRemarkId, setEditingRemarkId] = useState(null);
  const [newRemarkMode, setNewRemarkMode] = useState({}); // { [upload_id]: true|false }
  const [documentStatus, setDocumentStatus] = useState("");

  const [hasAccess, setHasAccess] = useState(null);
  const [canCreate, setCanCreate] = useState(false);
  const [canEdit, setCanEdit] = useState(false);
  const [canDelete, setCanDelete] = useState(false);
  const [loading, setLoading] = useState(false);

  const pageId = 136;

  const [employeeID, setEmployeeID] = useState("");

  const getAuditConfig = (extraHeaders = {}) => ({
    headers: {
      ...getFlatAuditHeaders(),
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

      // fallback only if it's a fresh selection from Student List
      const source = sessionStorage.getItem("admin_edit_person_id_source");
      const tsStr = sessionStorage.getItem("admin_edit_person_id_ts");
      const id = sessionStorage.getItem("admin_edit_person_id");
      const ts = tsStr ? parseInt(tsStr, 10) : 0;
      const isFresh =
        source === "Student_list" && Date.now() - ts < 5 * 60 * 1000;

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

  const fetchUploadsByStudentNumber = async (student_number) => {
    if (!student_number) return;
    try {
      const res = await axios.get(
        `${API_BASE_URL}/api/uploads/by-student/${student_number}`,
      );
      setUploads(res.data);
    } catch (err) {
      console.error("Fetch uploads failed:", err);
      console.log("Fetching for Student number:", student_number);
    }
  };

  const fetchPersonData = async (personID) => {
    if (!personID || personID === "undefined") {
      console.warn("Invalid personID for person data:", personID);
      return;
    }
    try {
      const res = await axios.get(
        `${API_BASE_URL}/api/student_data_as_applicant/${personID}`,
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

  const fetchDocumentStatus = async (student_number) => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/document_status/${student_number}`,
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
    if (person.student_number) {
      fetchDocumentStatus(person.student_number); // <-- pass the param
    }
  }, [person.student_number]);

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
      return;
    }

    // User started typing -> manual search takes over
    if (explicitSelection) setExplicitSelection(false);

    const match = persons.find((p) =>
      `${p.first_name} ${p.middle_name} ${p.last_name} ${p.emailAddress} ${p.student_number || ""}`
        .toLowerCase()
        .includes(searchQuery.toLowerCase()),
    );

    if (match) {
      setSelectedPerson(match);
      fetchUploadsByStudentNumber(match.student_number);
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

  const studentSuggestions =
    searchQuery.trim().length >= 2
      ? persons
          .filter((student) =>
            getStudentSuggestionText(student).includes(
              searchQuery.trim().toLowerCase(),
            ),
          )
          .slice(0, 10)
      : [];

  const handleStudentSuggestionSelect = (student) => {
    const nextValue = getStudentSuggestionValue(student);
    setSearchQuery(nextValue);
    setSelectedPerson(student);
    setExplicitSelection(true);
    setSuggestionsOpen(false);

    if (student?.student_number) {
      fetchUploadsByStudentNumber(student.student_number);
    }
  };

  const fetchPersons = async () => {
    try {
      const res = await axios.get(
        `${API_BASE_URL}/api/student_upload_documents_data`,
      );

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

    const remarks = remarksMap[uploadId] || "";

    try {
      await axios.put(`${API_BASE_URL}/api/uploads/student/remarks/${uploadId}`, {
        status: remarkValue,
        remarks,
        user_id: userID,
      }, getAuditConfig());

      // ✅ Optimistically update uploads state
      setUploads((prev) =>
        prev.map((u) =>
          u.upload_id === uploadId
            ? { ...u, status: parseInt(remarkValue, 10), remarks }
            : u,
        ),
      );

      setEditingRemarkId(null);

      // still fetch to keep in sync with backend
      if (selectedPerson?.student_number) {
        fetchUploadsByStudentNumber(selectedPerson.student_number);
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
        `${API_BASE_URL}/api/document_status/${person.student_number}`,
        {
          document_status: newStatus,
          user_id: localStorage.getItem("person_id"),
        },
        getAuditConfig(),
      );

      // ✅ Refresh evaluator and document status
      await fetchDocumentStatus(person.student_number);

      // ✅ Also refresh uploads list to update row values in the table
      if (person.student_number) {
        await fetchUploadsByStudentNumber(person.student_number);
      }

      console.log("Document status updated and UI refreshed!");
    } catch (err) {
      console.error("Error updating document status:", err);
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

      await axios.post(`${API_BASE_URL}/api/student/upload`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          "x-person-id": localStorage.getItem("person_id"), // ✅ now inside headers
          ...getAuditConfig().headers,
        },
      });

      showSnackbar("✅ Upload successful!", "success");

      setSelectedFiles({});
      if (selectedPerson?.student_number) {
        fetchUploadsByStudentNumber(selectedPerson.student_number);
      }
    } catch (error) {
      console.error("Upload failed:", error);
      showSnackbar("❌ Upload failed.", "error");
    }
  };

  const handleDelete = async (uploadId) => {
    if (!canDelete) {
      showSnackbar("You do not have permission to delete documents.", "warning");
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

      if (selectedPerson?.student_number) {
        fetchUploadsByStudentNumber(selectedPerson.student_number);
      }
    } catch (err) {
      console.error("Delete error:", err);
    }
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
              disabled
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
                disabled
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
                disabled
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
          {selectedPerson?.student_number || person?.student_number
            ? `[${selectedPerson?.student_number || person?.student_number}] ${(selectedPerson?.last_name || person?.last_name || "").toUpperCase()}, ${(selectedPerson?.first_name || person?.first_name || "").toUpperCase()} ${(selectedPerson?.middle_name || person?.middle_name || "").toUpperCase()} ${(selectedPerson?.extension || person?.extension || "").toUpperCase()}`
            : ""}
        </TableCell>

        <TableCell style={{ border: `1px solid ${borderColor}` }}>
          <Box display="flex" justifyContent="center" gap={1}>
            {uploaded ? (
              <>
                {/* <Button
                  disabled
                  variant="contained"
                  size="small"
                  sx={{
                    backgroundColor: "green",
                    color: "white",
                    "&:hover": {
                      backgroundColor: "#006400",
                    },
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
                  sx={{ backgroundColor: "#1976d2", color: "white" }}
                  href={`${API_BASE_URL}/ApplicantOnlineDocuments/${uploaded.file_path}`}
                  target="_blank"
                  startIcon={<VisibilityIcon />}
                >
                  Preview
                </Button>

                {/* <Button
                  disabled
                  onClick={() => handleConfirmDelete(uploaded)}
                  sx={{
                    backgroundColor: uploaded.canDelete
                      ? "maroon"
                      : "lightgray",
                    color: uploaded.canDelete ? "white" : "#888",
                    cursor: uploaded.canDelete ? "pointer" : "not-allowed",
                    "&:hover": {
                      backgroundColor: uploaded.canDelete
                        ? "#600000"
                        : "lightgray",
                    },
                  }}
                >
                  Delete
                </Button> */}
              </>
            ) : null}
          </Box>
        </TableCell>
      </TableRow>
    );
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
        paddingRight: 1,
        backgroundColor: "transparent",
        mt: 1,
        padding: 2,
      }}
    >
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={2}
      >
        <Typography variant="h4"
          sx={{
            fontWeight: 'bold',
            color: titleColor,
            fontSize: '36px',
          }}
        >
          STUDENT ONLINE REQUIREMENTS
        </Typography>



        <Box sx={{ position: "relative", width: 450, maxWidth: "100%" }}>
          <TextField
            variant="outlined"
            placeholder="Search Student Name / Email / Student ID"
            size="small"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
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
            }}
          />
          {suggestionsOpen && searchQuery.trim().length >= 2 && (
            <Box
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
              {studentSuggestions.length > 0 ? (
                studentSuggestions.map((student) => {
                  const studentNumber = cleanStudentValue(student?.student_number);
                  const name = formatStudentSuggestionName(student);
                  return (
                    <Box
                      key={`${studentNumber || student?.person_id}-${name}`}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        handleStudentSuggestionSelect(student);
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
                        {studentNumber || "N/A"}
                      </Typography>
                      <Typography sx={{ fontSize: 14, color: "#555" }}>|</Typography>
                      <Typography sx={{ fontSize: 14 }} noWrap>
                        {name || cleanStudentValue(student?.emailAddress) || "Unnamed Student"}
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
      <CollegeEnrollmentTabs />
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
              {/* Left cell: Student ID */}
              <TableCell
                sx={{
                  color: "white",
                  fontSize: "20px",
                  fontFamily: "Poppins, sans-serif",
                  border: "none",
                }}
              >
                Student ID:&nbsp;
                <span
                  style={{
                    fontFamily: "Poppins, sans-serif",
                    fontWeight: "normal",
                    textDecoration: "underline",
                  }}
                >
                  {selectedPerson?.student_number ||
                    person?.student_number ||
                    "N/A"}
                </span>
              </TableCell>

              {/* Right cell: Student Name, right-aligned */}
              <TableCell
                align="right"
                sx={{
                  color: "white",
                  fontSize: "20px",
                  fontFamily: "Poppins, sans-serif",
                  border: "none",
                }}
              >
                Student Name:&nbsp;
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
        {/* SHS GWA and Height row below Student Name */}
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
                disabled
                select
                size="small"
                name="applyingAs"
                value={person.applyingAs || ""}
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
              {/* <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, }}>
                  <Typography sx={{ fontSize: "14px", fontFamily: "Poppins, sans-serif", width: "90px" }}>
                    Document Type:
                  </Typography>
                  <TextField
                    select
                    size="small"
                    placeholder="Select Documents"
                    value={selectedFiles.requirements_id || ''}
                    onChange={(e) =>
                      setSelectedFiles(prev => ({
                        ...prev,
                        requirements_id: e.target.value,
                      }))
                    }
                    sx={{ width: 200 }} // match width
                    InputProps={{ sx: { height: 38 } }} // match height
                    inputProps={{ style: { padding: "4px 8px", fontSize: "12px" } }}
                  >
                    <MenuItem value="">
                      <em>Select Documents</em>
                    </MenuItem>
                    <MenuItem value={1}>PSA Birth Certificate</MenuItem>
                    <MenuItem value={2}>Form 138 (With at least 3rd Quarter posting / No failing grade)</MenuItem>
                    <MenuItem value={3}>Certificate of Good Moral Character</MenuItem>
                    <MenuItem value={4}>Certificate Belonging to Graduating Class</MenuItem>
                  </TextField>
                </Box> */}

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
                  disabled
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
              {/*
                Remarks
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography sx={{ fontSize: "14px", fontFamily: "Poppins, sans-serif", width: "80px" }}>
                    Remarks
                  </Typography>
                  <TextField
                    select
                    size="small"
                    placeholder="Select Remarks"
                    value={selectedFiles.remarks || ''}
                    onChange={(e) =>
                      setSelectedFiles(prev => ({
                        ...prev,
                        remarks: e.target.value,
                      }))
                    }
                    sx={{ width: 250 }}
                    InputProps={{ sx: { height: 38 } }}
                    inputProps={{ style: { padding: "4px 8px", fontSize: "12px" } }}
                  >
                    <MenuItem value="">
                      <em>Select Remarks</em>
                    </MenuItem>
                    {remarksOptions.map((option, index) => (
                      <MenuItem key={index} value={option}>
                        {option}
                      </MenuItem>
                    ))}
                  </TextField>
                </Box>
*/}
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
                  disabled
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

          {/* Right side: ID Photo */}
          {person.profile_img && (
            <Box
              sx={{
                width: "2.10in", // standard 2×2 size
                height: "2.10in",
                border: "1px solid #ccc",
                overflow: "hidden",
                marginTop: "-400px",
                borderRadius: "4px",
              }}
            >
              <img
                src={`${API_BASE_URL}/uploads/Student1by1/${person.profile_img}`}
                alt="Profile"
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            </Box>
          )}
        </Box>
      </TableContainer>

      <>
        <TableContainer
          component={Paper}
          sx={{ width: "100%", border: `1px solid ${borderColor}` }}
        >
          <Table>
            <TableHead
              sx={{ backgroundColor: headerColor }}
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
        <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
          <DialogTitle>
            {confirmAction === "upload" ? "Confirm Upload" : "Confirm Deletion"}
          </DialogTitle>
          <DialogContent>
            {confirmAction === "upload" ? (
              <>
                Are you sure you want to upload{" "}
                <strong>{targetDoc?.label}</strong>?<br />
                Added by: <strong>{localStorage.getItem("username")}</strong>
              </>
            ) : (
              <>
                Are you sure you want to delete
                <strong>
                  {targetDoc?.label ||
                    targetDoc?.short_label ||
                    targetDoc?.file_path}
                </strong>
                ?<br />
                Deleted by: <strong>{localStorage.getItem("username")}</strong>
              </>
            )}
          </DialogContent>
          <DialogActions>
            <Button
              color="error"
              variant="outlined"
              onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleConfirmAction}
              variant="contained"
            >
              Yes, Confirm
            </Button>
          </DialogActions>
        </Dialog>
      </>
    </Box>
  );
};

export default StudentOnlineRequirementsCollege;
