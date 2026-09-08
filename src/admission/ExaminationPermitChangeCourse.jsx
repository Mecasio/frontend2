import React, { useState, useEffect, useContext, useRef } from "react";
import { SettingsContext } from "../App";
import axios from "axios";
import {
  Box,
  Typography,
  TextField,
  TableContainer,
  Paper,
  Table,
  TableHead,
  TableRow,
  TableCell,
  Container,
  TableBody,
  Card,
  Button,
  FormControl,
  Select,
  MenuItem,
  Checkbox,
} from "@mui/material";
import EaristLogo from "../assets/EaristLogo.png";
import "../styles/Print.css";
import API_BASE_URL from "../apiConfig";
import {
  getAuditConfig,
  getFlatAuditHeaders,
  postAuditEvent,
  getAuditHeaders,
} from "../utils/auditEvents";
import useAuditMac from "../utils/useAuditMac";
import { getLoginMacPayload } from "../utils/userMacAddress";
import { FcPrint } from "react-icons/fc";
import { useLocation, useNavigate } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import Unauthorized from "../components/Unauthorized";
import LoadingOverlay from "../components/LoadingOverlay";
import AdmissionProcessTabs from "../components/AdmissionProcessTabs";
import PrintingHistoryDialog, {
  DOWNLOAD_EXAM_PDF_ACTION,
} from "../components/PrintingHistoryDialog";
import SearchIcon from "@mui/icons-material/Search";
import Autocomplete from "@mui/material/Autocomplete";
import PrintIcon from "@mui/icons-material/Print";
import DownloadIcon from "@mui/icons-material/Download";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import DescriptionIcon from "@mui/icons-material/Description";
import ArticleIcon from "@mui/icons-material/Article";
import BadgeIcon from "@mui/icons-material/Badge";
import SwapHorizIcon from "@mui/icons-material/SwapHoriz";
import AssignmentIndIcon from "@mui/icons-material/AssignmentInd";
import EmptyAdmissionFormProcess from "./EmptyAdmissionFormProcess";
// ✅ Reused directly (not duplicated) so the "Admission Form (Process)"
// option below renders/downloads exactly like its standalone page.
import AdminAdmissionFormProcess from "./AdmissionFormProcess";
import PrintConfirmDialog from "../components/PrintConfirmDialog"

const FORM_OPTIONS = [
  {
    key: "permit",
    label: "Examination Permit",
    description: "Official exam permit with schedule, room, and QR code",
    icon: <BadgeIcon sx={{ fontSize: 36 }} />,
    color: "#1565c0",
    bg: "#e3f2fd",
  },
  {
    key: "changeCourse",
    label: "Change Course Form",
    description: "With Campus Dean approval (pre-filled applicant data)",
    icon: <SwapHorizIcon sx={{ fontSize: 36 }} />,
    color: "#2e7d32",
    bg: "#e8f5e9",
  },
  {
    key: "newForm",
    label: "Empty Change of Course Form",
    description: "Blank form with Campus Dean (no pre-filled name)",
    icon: <ArticleIcon sx={{ fontSize: 36 }} />,
    color: "#6a1b9a",
    bg: "#f3e5f5",
  },
  {
    key: "changeCourse1",
    label: "Change Course Form",
    description: "With Campus Director only (pre-filled applicant data)",
    icon: <SwapHorizIcon sx={{ fontSize: 36 }} />,
    color: "#e65100",
    bg: "#fff3e0",
  },
  {
    key: "newForm1",
    label: "Empty Change of Course Form",
    description: "Blank form with Campus Director only",
    icon: <DescriptionIcon sx={{ fontSize: 36 }} />,
    color: "#37474f",
    bg: "#eceff1",
  },
  // ✅ NEW — 6th form option, reusing AdminAdmissionFormProcess as-is.
  {
    key: "admissionFormProcess",
    label: "Admission Form (Process)",
    description: "Full admission workflow form with QR code and process steps",
    icon: <AssignmentIndIcon sx={{ fontSize: 36 }} />,
    color: "#8B0000",
    bg: "#fdecea",
  },
  {
    key: "emptyAdmissionFormProcess",
    label: "Empty Admission Form (Process)",
    description: "Blank admission form for applicants to fill in by hand",
    icon: <AssignmentIndIcon sx={{ fontSize: 36 }} />,
    color: "#455a64",
    bg: "#eceff1",
  },
];

// ✅ Maps each form key to the backend PDF route that renders it and the
// filename prefix used for the downloaded file. "permit" and
// "admissionFormProcess" reuse your existing routes; the four Change
// Course variants use the new router (changeCourseFormRoutes.js).
const FORM_ENDPOINTS = {
  permit: { url: "/api/generate-exam-permit-pdf", prefix: "Exam_Permit" },
  changeCourse: {
    url: "/api/generate-change-course-dean-pdf",
    prefix: "Change_Course_Dean",
  },
  newForm: {
    url: "/api/generate-empty-change-course-dean-pdf",
    prefix: "Empty_Change_Course_Dean",
  },
  changeCourse1: {
    url: "/api/generate-change-course-director-pdf",
    prefix: "Change_Course_Director",
  },
  newForm1: {
    url: "/api/generate-empty-change-course-director-pdf",
    prefix: "Empty_Change_Course_Director",
  },
  admissionFormProcess: {
    url: "/api/generate-admission-form-pdf",
    prefix: "Admission_Form_Process",
  },
  emptyAdmissionFormProcess: {
    url: "/api/generate-empty-admission-form-pdf",
    prefix: "Empty_Admission_Form_Process",
  },
};

const ExaminationPermitChangeCourse = () => {
  useAuditMac();
  const settings = useContext(SettingsContext);
  const colors = settings?.colors || {};
  const branding = settings?.branding || {};
  const assets = settings?.assets || {};
  const headerColor = colors.header || "#1976d2";
  const [fetchedLogo, setFetchedLogo] = useState(null);
  const [companyName, setCompanyName] = useState("");
  const [campusAddress, setCampusAddress] = useState("");

  const [titleColor, setTitleColor] = useState("#000000");
  const [borderColor, setBorderColor] = useState("#000000");

  // NEW: which form is selected for preview
  const [selectedForm, setSelectedForm] = useState(null);
  const [controlNumbers, setControlNumbers] = useState({}); // { permit: "2026-0001", changeCourse: "2026-0003", ... }

  const REALIGNMENT_FORM_TYPES = [
    "changeCourse",
    "changeCourse1",
    "newForm",
    "newForm1",
  ];

  const fetchControlNumber = async (formType, actionType) => {
    try {
      const res = await axios.post(
        `${API_BASE_URL}/api/generate-control-number`,
        {
          form_type: formType,
          applicant_number: selectedPerson?.applicant_number,
          person_id: selectedPerson?.person_id,
          action_type: actionType,
        },
      );
      const number = res.data.control_number;
      const campusId = res.data.campus_id;
      setControlNumbers((prev) => ({ ...prev, [formType]: number }));

      // Track this issuance for the Admissions Report "Realignment" box.
      if (
        REALIGNMENT_FORM_TYPES.includes(formType) &&
        selectedPerson?.person_id
      ) {
        axios
          .post(`${API_BASE_URL}/api/reports/realignment/log`, {
            person_id: selectedPerson.person_id,
            campus_id: campusId,
            applicant_number: selectedPerson.applicant_number,
            form_type: formType,
            action_type: actionType,
            control_number: number,
            audit_actor_id:
              employeeID || localStorage.getItem("employee_id") || "unknown",
            audit_actor_role: localStorage.getItem("role") || "registrar",
          })
          .catch((logErr) =>
            console.error("Failed to log realignment:", logErr),
          );
      }

      return number;
    } catch (err) {
      console.error("Failed to generate control number:", err);
      return null;
    }
  };

  useEffect(() => {
    if (!settings) return;
    if (colors.title) setTitleColor(colors.title);
    if (colors.border) setBorderColor(colors.border);
    setFetchedLogo(
      assets.logoUrl ? assets.logoUrl : EaristLogo,
    );
    if (branding.companyName) setCompanyName(branding.companyName);
    if (branding.campusAddress) {
      setCampusAddress(branding.campusAddress);
    }
  }, [settings]);

  const words = companyName.trim().split(" ");
  const middle = Math.ceil(words.length / 2);
  const firstLine = words.slice(0, middle).join(" ");
  const secondLine = words.slice(middle).join(" ");

  const location = useLocation();
  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const personIdFromUrl = queryParams.get("person_id");
    if (!personIdFromUrl) return;
    axios
      .get(`${API_BASE_URL}/api/person_with_applicant/${personIdFromUrl}`)
      .then((res) => {
        if (res.data?.person_id) {
          setSelectedPerson(res.data);
          setPerson((prev) => ({ ...prev, ...res.data }));
          sessionStorage.setItem("admin_edit_person_id", res.data.person_id);
        }
        if (res.data?.applicant_number) {
          setSearchQuery(res.data.applicant_number);
          setApplicantNumber(res.data.applicant_number);
        }
      })
      .catch((err) => console.error("Auto search failed:", err));
  }, [location.search]);

  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState("");
  const [persons, setPersons] = useState([]);
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [person, setPerson] = useState({
    campus: "",
    profile_img: "",
    last_name: "",
    first_name: "",
    middle_name: "",
    extension: "",
    created_at: "",
  });

  const [hasAccess, setHasAccess] = useState(null);
  const [loading, setLoading] = useState(false);
  const [employeeID, setEmployeeID] = useState("");
  const pageId = 48;

  useEffect(() => {
    const storedUser = localStorage.getItem("email");
    const storedRole = localStorage.getItem("role");
    const storedID = localStorage.getItem("person_id");
    const storedEmployeeID = localStorage.getItem("employee_id");
    if (storedUser && storedRole && storedID) {
      if (storedRole === "registrar") {
        setEmployeeID(storedEmployeeID || "");
        checkAccess(storedEmployeeID);
      } else window.location.href = "/login";
    } else {
      window.location.href = "/login";
    }
  }, []);

  const checkAccess = async (employeeID) => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/page_access/${employeeID}/${pageId}`,
      );
      setHasAccess(response.data?.page_privilege === 1 ? true : false);
    } catch (error) {
      console.error("Error checking access:", error);
      setHasAccess(false);
      setLoading(false);
    }
  };

  const [selectedPreparedBy, setSelectedPreparedBy] = useState(null);

  const formatPersonName = (item) =>
    item?.full_name ||
    [
      item?.first_name,
      item?.middle_name,
      item?.last_name,
      item?.extension_name || item?.extension,
    ]
      .filter(Boolean)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();

  const handlePreparedByChange = async (signature) => {
    const isSelected = selectedPreparedBy?.id === signature.id;
    setSelectedPreparedBy(isSelected ? null : signature);
    if (isSelected) return;
    try {
      await postAuditEvent("examination_profile_prepared_by_set", {
        prepared_by_name: formatPersonName(signature),
        prepared_by_employee_id: signature.employee_id || signature.id || "N/A",
        applicant_name: formatPersonName(selectedPerson || person),
        applicant_number:
          selectedPerson?.applicant_number || applicantNumber || "N/A",
      });
    } catch (err) {
      console.error("Error inserting prepared by audit log:", err);
    }
  };

  const [curriculumOptions, setCurriculumOptions] = useState([]);
  const [examSchedule, setExamSchedule] = useState(null);
  const [applicantNumber, setApplicantNumber] = useState("");
  const [scheduledBy, setScheduledBy] = useState("");

  useEffect(() => {
    const fetchPersons = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/api/upload_documents`);
        setPersons(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        console.error("Error fetching persons:", err);
      }
    };
    fetchPersons();
  }, []);

  const fetchPersonData = async (id) => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/person/${id}`);
      setPerson(res.data);
    } catch (error) {
      console.error("Failed to fetch person:", error);
    }
  };

  useEffect(() => {
    if (selectedPerson?.person_id) {
      fetchPersonData(selectedPerson.person_id);
      if (selectedPerson.applicant_number)
        setApplicantNumber(selectedPerson.applicant_number);
    }
  }, [selectedPerson]);

  useEffect(() => {
    const fetchCurriculums = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/api/applied_program`);
        setCurriculumOptions(Array.isArray(response.data) ? response.data : []);
      } catch (error) {
        console.error("Error fetching curriculum options:", error);
      }
    };
    fetchCurriculums();
  }, []);

  const [isVerified, setIsVerified] = useState(false);
  const [verifiedAt, setVerifiedAt] = useState(null);

  // ✅ NEW — one-time attendance QR token (separate from applicant profile link)
  const [attendanceToken, setAttendanceToken] = useState(null);
  const [attendanceStatus, setAttendanceStatus] = useState(null);

  useEffect(() => {
    if (selectedPerson?.applicant_number) {
      axios
        .get(
          `${API_BASE_URL}/api/exam-attendance/token/${selectedPerson.applicant_number}`,
        )
        .then((res) => {
          setAttendanceToken(res.data?.qr_token || null);
          setAttendanceStatus(res.data?.status || null);
        })
        .catch((err) => {
          console.error("Error fetching attendance token:", err);
          setAttendanceToken(null);
          setAttendanceStatus(null);
        });
    } else {
      setAttendanceToken(null);
      setAttendanceStatus(null);
    }
  }, [selectedPerson]);

  useEffect(() => {
    if (selectedPerson?.applicant_number) {
      axios
        .get(
          `${API_BASE_URL}/api/document-verification/${selectedPerson.applicant_number}`,
        )
        .then((res) => {
          setIsVerified(Boolean(res.data?.verified));
          setVerifiedAt(res.data?.verified ? res.data.verified_at : null);
        })
        .catch(() => {
          setIsVerified(false);
          setVerifiedAt(null);
        });
    } else {
      setIsVerified(false);
      setVerifiedAt(null);
    }
  }, [selectedPerson]);

  useEffect(() => {
    if (selectedPerson?.applicant_number) {
      axios
        .get(
          `${API_BASE_URL}/api/applicant-schedule/${selectedPerson.applicant_number}`,
        )
        .then((res) => setExamSchedule(res.data))
        .catch((err) => {
          console.error("Error fetching exam schedule:", err);
          setExamSchedule(null);
        });
    } else {
      setExamSchedule(null);
    }
  }, [selectedPerson]);

  useEffect(() => {
    axios
      .get(`${API_BASE_URL}/api/scheduled-by/registrar`)
      .then((res) => {
        if (res.data?.fullName) setScheduledBy(res.data.fullName);
      })
      .catch((err) => console.error("Error fetching registrar name:", err));
  }, []);

  const getOrdinal = (n) => {
    if (!n) return "";
    const numeric = Number(n);
    if (!Number.isFinite(numeric)) return String(n);
    const s = ["th", "st", "nd", "rd"];
    const v = numeric % 100;
    return numeric + (s[(v - 20) % 10] || s[v] || s[0]);
  };

  const permitRef = useRef();
  const changeCourseRef = useRef();
  const newFormRef = useRef();
  const changeCourseRef1 = useRef();
  const newFormRef1 = useRef();
  // ✅ NEW — ref that will resolve to AdminAdmissionFormProcess's own
  // printable div, thanks to the useImperativeHandle it now exposes.
  const admissionFormProcessRef = useRef();
  const emptyAdmissionFormProcessRef = useRef();

  const refMap = {
    permit: permitRef,
    changeCourse: changeCourseRef,
    newForm: newFormRef,
    changeCourse1: changeCourseRef1,
    newForm1: newFormRef1,
    admissionFormProcess: admissionFormProcessRef,
    emptyAdmissionFormProcess: emptyAdmissionFormProcessRef,
  };

  const printDiv = (ref) => {
    const divToPrint = ref.current;
    if (divToPrint) {
      const newWin = window.open("", "Print-Window");
      newWin.document.open();
      newWin.document.write(`
        <html>
          <head>
            <title>Print</title>
            <style>
              @page { size: Legal; margin: 0; }
              body { margin: 0; padding: 0; font-family: Arial; }
              .student-table { margin-top: 35px !important; }
              button { display: none; }
            </style>
          </head>
          <body onload="window.print(); setTimeout(() => window.close(), 200);">
            <div class="print-container">${divToPrint.innerHTML}</div>
          </body>
        </html>
      `);
      newWin.document.close();
    }
  };

  const handlePrint = async () => {
    if (!selectedPerson || !selectedForm) return;
    await fetchPersonData(selectedPerson.person_id);
    await fetchControlNumber(selectedForm, "print"); // mint it, updates controlNumbers state
    setTimeout(() => printDiv(refMap[selectedForm]), 250); // small delay so the number renders into the DOM before printDiv reads innerHTML
  };

  // ✅ NEW — generic PDF download, same blob → <a download> pattern used by
  // AdminAdmissionFormProcess.jsx's own downloadPDF(). Works for all 6
  // form options via FORM_ENDPOINTS + refMap.
  const [downloadingKey, setDownloadingKey] = useState(null);

  const [pendingAction, setPendingAction] = useState(null); // { mode: "print" | "download" } | null
  const [confirmLoading, setConfirmLoading] = useState(false);

  const logDownloadExamPdf = async (documentLabel, { failed = false } = {}) => {
    try {
      const source = selectedPerson || person;
      const middleInitial = source?.middle_name
        ? ` ${String(source.middle_name).trim().charAt(0).toUpperCase()}.`
        : "";
      const applicantName = source?.last_name
        ? `${source.last_name}, ${source.first_name || ""}${middleInitial}`.trim()
        : [source?.first_name, source?.middle_name].filter(Boolean).join(" ") ||
        "Unknown Applicant";

      await postAuditEvent(DOWNLOAD_EXAM_PDF_ACTION, {
        document_label: documentLabel,
        applicant_name: applicantName,
        applicant_number:
          selectedPerson?.applicant_number || applicantNumber || "N/A",
        person_id: selectedPerson?.person_id || person?.person_id || "",
        failed,
      });
    } catch (err) {
      console.error("Download exam PDF audit failed:", err);
    }
  };

  const handleDownloadPdf = async () => {
    if (!selectedPerson || !selectedForm) return;

    const config = FORM_ENDPOINTS[selectedForm];
    const ref = refMap[selectedForm];
    const formLabel =
      FORM_OPTIONS.find((opt) => opt.key === selectedForm)?.label ||
      config?.prefix ||
      "exam document";

    if (!config || !ref?.current) {
      console.error("No endpoint/ref configured for form:", selectedForm);
      return;
    }

    setDownloadingKey(selectedForm);

    try {
      const controlNumber = await fetchControlNumber(selectedForm, "download");
      await fetchPersonData(selectedPerson.person_id);
      await new Promise((resolve) => setTimeout(resolve, 300));

      const node = ref.current;
      if (!node) throw new Error("Form did not render in time.");

      const response = await axios.post(
        `${API_BASE_URL}${config.url}`,
        {
          html: node.innerHTML,
          applicant_number: selectedPerson?.applicant_number || "",
          last_name: selectedPerson?.last_name || "",
          first_name: selectedPerson?.first_name || "",
          control_number: controlNumber, // 👈 pass it to the PDF route so the file matches what's on screen
          document_label: formLabel,
          audit_print_action: DOWNLOAD_EXAM_PDF_ACTION,
          audit_actor_id:
            employeeID || localStorage.getItem("employee_id") || "unknown",
          audit_actor_role: localStorage.getItem("role") || "registrar",
          ...getLoginMacPayload(),
        },
        {
          responseType: "blob",
          headers: getAuditHeaders(),
        },
      );

      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const lastName = (selectedPerson?.last_name || "Applicant")
        .trim()
        .replace(/\s+/g, "_");
      const firstName = (selectedPerson?.first_name || "")
        .trim()
        .replace(/\s+/g, "_");
      const applicantNo = selectedPerson?.applicant_number
        ? `_${selectedPerson.applicant_number}`
        : "";
      const fileName = `${config.prefix}_${lastName}${firstName ? "_" + firstName : ""}${applicantNo}.pdf`;

      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Failed to generate PDF:", error);
      // Still audit when download fails (e.g. IDM intercept) so history is recorded.
      await logDownloadExamPdf(formLabel, { failed: true });
      alert("Something went wrong while generating the PDF. Please try again.");
    } finally {
      setDownloadingKey(null);
    }
  };

  const [signatures, setSignatures] = useState([]);
  const [signaturePage, setSignaturePage] = useState(0);
  const SIGNATURES_PER_PAGE = 5;

  useEffect(() => {
    const fetchSignatures = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/api/signature`);
        setSignatures(res.data?.success ? res.data.data || [] : []);
        setSignaturePage(0);
      } catch (err) {
        setSignatures([]);
      }
    };
    fetchSignatures();
  }, []);

  const [permitNumber, setPermitNumber] = useState("");

  useEffect(() => {
    if (!selectedPerson?.person_id || !isVerified) {
      setPermitNumber("");
      return;
    }
    axios
      .post(`${API_BASE_URL}/api/generate-permit-number`, {
        person_id: selectedPerson.person_id,
        applicant_number: selectedPerson.applicant_number,
      })
      .then((res) => setPermitNumber(res.data?.control_number || ""))
      .catch((err) => {
        console.error("Failed to generate permit number:", err);
        setPermitNumber("");
      });
  }, [selectedPerson, isVerified]);

  const paginatedSignatures = signatures.slice(
    signaturePage * SIGNATURES_PER_PAGE,
    signaturePage * SIGNATURES_PER_PAGE + SIGNATURES_PER_PAGE,
  );
  const totalSignaturePages = Math.max(
    1,
    Math.ceil(signatures.length / SIGNATURES_PER_PAGE),
  );

  const getSignatureImageSrc = (signature) =>
    signature?.signature_image
      ? `${API_BASE_URL}/uploads/${signature.signature_image}`
      : "";

  if (loading || hasAccess === null)
    return <LoadingOverlay open={loading} message="Loading..." />;
  if (!hasAccess) return <Unauthorized />;

  // ─── Shared header block ──────────────────────────────────────────────────
  // ✅ UPDATED — logo + Document No. are now centered as a single column
  // (flex column, alignItems: center) instead of being left-shifted by a
  // negative margin, and the Document No. line is kept to one row with
  // whiteSpace: "nowrap" at 13px.
  const SchoolHeader = ({ showProfile = false }) => (
    <table
      style={{
        borderCollapse: "collapse",
        fontFamily: "Arial",
        width: "8in",
        margin: "0 auto",
        textAlign: "center",
        tableLayout: "fixed",
      }}
    >
      <tbody>
        <tr>
          <td colSpan={40} style={{ height: "0.5in", textAlign: "center" }}>
            <table
              width="100%"
              style={{
                borderCollapse: "collapse",
                marginTop: "-10px",
                fontFamily: "Arial",
              }}
            >
              <tbody>
                <tr>
                  <td style={{ width: "20%", textAlign: "center" }}>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                      }}
                    >
                      <img
                        src={fetchedLogo}
                        alt="School Logo"
                        style={{
                          width: "120px",
                          height: "120px",
                          marginTop: "10px",
                          borderRadius: "50%",
                          objectFit: "cover",
                        }}
                      />
                      {controlNumbers.permit && (
                        <div
                          style={{
                            fontSize: "13px",
                            fontWeight: "bold",
                            color: "#8B0000",
                            marginTop: "4px",
                            whiteSpace: "nowrap",
                          }}
                        >
                          Document No.: {controlNumbers.permit}
                        </div>
                      )}
                    </div>
                  </td>
                  <td
                    style={{
                      width: "60%",
                      textAlign: "center",
                      lineHeight: "1",
                    }}
                  >
                    <div style={{ fontSize: "13px", fontFamily: "Arial" }}>
                      Republic of the Philippines
                    </div>
                    <div
                      style={{
                        fontWeight: "bold",
                        fontFamily: "Arial",
                        fontSize: "20px",
                      }}
                    >
                      {firstLine}
                    </div>
                    {secondLine && (
                      <div
                        style={{
                          fontWeight: "bold",
                          fontFamily: "Arial",
                          fontSize: "20px",
                        }}
                      >
                        {secondLine}
                      </div>
                    )}
                    {campusAddress && (
                      <div style={{ fontSize: "13px", fontFamily: "Arial" }}>
                        {campusAddress}
                      </div>
                    )}
                    {showProfile && (
                      <>
                        <div
                          style={{
                            fontWeight: "bold",
                            fontFamily: "Arial",
                            fontSize: "15px",
                            letterSpacing: "1px",
                            marginTop: "6px",
                          }}
                        >
                          OFFICE OF THE ADMISSION SERVICES
                        </div>
                        <div style={{ marginTop: "30px" }}>
                          <b
                            style={{
                              fontSize: "24px",
                              letterSpacing: "1px",
                              fontWeight: "bold",
                            }}
                          >
                            EXAMINATION PERMIT
                          </b>
                        </div>
                      </>
                    )}
                  </td>
                  {showProfile && (
                    <td
                      colSpan={4}
                      rowSpan={6}
                      style={{
                        textAlign: "center",
                        position: "relative",
                        width: "4.5cm",
                        height: "4.5cm",
                      }}
                    >
                      <div
                        style={{
                          width: "3.80cm",
                          height: "3.80cm",
                          marginRight: "10px",
                          display: "flex",
                          justifyContent: "center",
                          alignItems: "center",
                          position: "relative",
                          border: "1px solid black",
                          overflow: "hidden",
                          borderRadius: "4px",
                          marginTop: "10px",
                        }}
                      >
                        {person.profile_img ? (
                          <img
                            src={`${API_BASE_URL}/uploads/Applicant1by1/${person.profile_img}`}
                            alt="Profile"
                            style={{
                              width: "100%",
                              height: "100%",
                              objectFit: "cover",
                            }}
                          />
                        ) : (
                          <span style={{ fontSize: "12px", color: "#888" }}>
                            No Image
                          </span>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              </tbody>
            </table>
          </td>
        </tr>
      </tbody>
    </table>
  );

  // ─── Change Course header (with profile photo on right) ───────────────────
  // ✅ UPDATED — same centering fix as SchoolHeader: logo + Document No.
  // stacked in a centered flex column, 13px, single-line (nowrap).
  const ChangeCourseHeader = () => (
    <div
      className="student-table"
      style={{
        width: "8in",
        maxWidth: "100%",
        margin: "0 auto",
        marginTop: "10px",
        boxSizing: "border-box",
        padding: "10px 0",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "nowrap",
        }}
      >
        <div
          style={{
            flexShrink: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <img
            src={fetchedLogo}
            alt="School Logo"
            style={{
              width: "120px",
              height: "120px",
              objectFit: "cover",
              marginTop: "-25px",
              borderRadius: "50%",
            }}
          />
          {controlNumbers[selectedForm] && (
            <div
              style={{
                fontSize: "13px",
                fontWeight: "bold",
                color: "#8B0000",
                textAlign: "center",
                whiteSpace: "nowrap",
              }}
            >
              Document No.: {controlNumbers[selectedForm]}
            </div>
          )}
        </div>
        <div
          style={{
            flexGrow: 1,
            textAlign: "center",
            fontSize: "12px",
            fontFamily: "Arial",
            lineHeight: 1.4,
          }}
        >
          <div style={{ fontSize: "13px" }}>Republic of the Philippines</div>
          <div
            style={{
              fontWeight: "bold",
              fontSize: "16px",
              textTransform: "Uppercase",
            }}
          >
            {firstLine}
          </div>
          {secondLine && (
            <div
              style={{
                fontWeight: "bold",
                fontSize: "16px",
                textTransform: "Uppercase",
              }}
            >
              {secondLine}
            </div>
          )}
          {campusAddress && (
            <div style={{ fontSize: "13px" }}>{campusAddress}</div>
          )}
          <div
            style={{
              fontWeight: "bold",
              fontSize: "13px",
              letterSpacing: "1px",
            }}
          >
            OFFICE OF THE ADMISSION SERVICES
          </div>
          <br />
          <div
            style={{
              fontSize: "20px",
              fontWeight: "bold",
              marginBottom: "5px",
            }}
          >
            Applicant's Change Course Form
          </div>
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            marginRight: "10px",
            gap: "10px",
          }}
        >
          <div
            style={{
              width: "1.3in",
              height: "1.3in",
              border: "1px solid black",
              overflow: "hidden",
              flexShrink: 0,
              marginTop: "-15px",
            }}
          >
            {person?.profile_img ? (
              <img
                src={`${API_BASE_URL}/uploads/Applicant1by1/${person.profile_img}`}
                alt="Profile"
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : (
              <span style={{ fontSize: "12px", color: "#888" }}>No Image</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  // ✅ UPDATED — same centering fix: logo + Document No. stacked centered,
  // 13px, single-line (nowrap).
  const EmptyFormHeader = () => (
    <div
      className="student-table"
      style={{
        width: "8in",
        maxWidth: "100%",
        margin: "0 auto",
        marginTop: "10px",
        boxSizing: "border-box",
        padding: "10px 0",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <img
            src={fetchedLogo}
            alt="School Logo"
            style={{
              width: "120px",
              height: "120px",
              objectFit: "cover",
              marginTop: "-25px",
              borderRadius: "50%",
            }}
          />
          {controlNumbers[selectedForm] && (
            <div
              style={{
                fontSize: "13px",
                fontWeight: "bold",
                color: "#8B0000",
                textAlign: "center",
                whiteSpace: "nowrap",
              }}
            >
              Document No.: {controlNumbers[selectedForm]}
            </div>
          )}
        </div>
        <div
          style={{
            textAlign: "center",
            fontSize: "12px",
            fontFamily: "Arial",
            lineHeight: 1.4,
          }}
        >
          <div style={{ fontSize: "13px" }}>Republic of the Philippines</div>
          <div
            style={{
              fontWeight: "bold",
              fontSize: "16px",
              textTransform: "Uppercase",
            }}
          >
            {firstLine}
          </div>
          {secondLine && (
            <div
              style={{
                fontWeight: "bold",
                fontSize: "16px",
                textTransform: "Uppercase",
              }}
            >
              {secondLine}
            </div>
          )}
          {campusAddress && (
            <div style={{ fontSize: "13px" }}>{campusAddress}</div>
          )}
          <div
            style={{
              fontWeight: "bold",
              fontSize: "13px",
              letterSpacing: "1px",
            }}
          >
            OFFICE OF THE ADMISSION SERVICES
          </div>
          <br />
          <div
            style={{
              fontSize: "20px",
              fontWeight: "bold",
              marginBottom: "5px",
            }}
          >
            Applicant's Change Course Form
          </div>
        </div>
      </div>
    </div>
  );

  const ChangeCourseBody = ({ showDean = true }) => (
    <table
      style={{
        borderCollapse: "collapse",
        fontFamily: "Arial",
        width: "8in",
        margin: "0 auto",
        marginTop: "-30px",
        textAlign: "center",
        tableLayout: "fixed",
      }}
    >
      <tbody>
        <tr style={{ fontSize: "13px" }}>
          <td colSpan={40}>
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                alignItems: "center",
                width: "100%",
              }}
            >
              <label
                style={{
                  fontWeight: "bold",
                  whiteSpace: "nowrap",
                  marginRight: "10px",
                  fontSize: "12px",
                }}
              >
                Applicant ID No.:
              </label>
              <div
                style={{
                  width: "200px",
                  borderBottom: "1px solid black",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  fontSize: "12px",
                  height: "1.3em",
                }}
              >
                {person.applicant_number}
              </div>
            </div>
          </td>
        </tr>
        <tr>
          <td colSpan={40} style={{ fontSize: "13px", paddingTop: "5px" }}>
            <div
              style={{ display: "flex", alignItems: "center", width: "100%" }}
            >
              <span
                style={{
                  fontWeight: "bold",
                  whiteSpace: "nowrap",
                  marginRight: "10px",
                  fontSize: "12px",
                }}
              >
                Name of Student:
              </span>
              <div
                style={{
                  flexGrow: 1,
                  display: "flex",
                  justifyContent: "space-between",
                }}
              >
                {["last_name", "first_name", "middle_name", "extension"].map(
                  (f) => (
                    <span
                      key={f}
                      style={{
                        width: "25%",
                        textAlign: "center",
                        fontSize: "14.5px",
                        borderBottom: "1px solid black",
                      }}
                    >
                      {person[f]}
                    </span>
                  ),
                )}
              </div>
            </div>
          </td>
        </tr>
        <tr>
          <td colSpan={40} style={{ fontSize: "12px", paddingTop: "2px" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginLeft: "-30px",
              }}
            >
              {[
                "(Pls. PRINT)",
                "Last Name",
                "Given Name",
                "Middle Name",
                "Ext. Name",
              ].map((l) => (
                <span key={l} style={{ width: "20%", textAlign: "center" }}>
                  {l}
                </span>
              ))}
            </div>
          </td>
        </tr>
        <tr style={{ fontSize: "13px" }}>
          <td colSpan={20}>
            <div
              style={{ display: "flex", alignItems: "center", width: "100%" }}
            >
              <label
                style={{
                  fontWeight: "bold",
                  whiteSpace: "nowrap",
                  marginRight: "10px",
                  fontSize: "12px",
                }}
              >
                Date Applied
              </label>
              <span
                style={{
                  flexGrow: 1,
                  borderBottom: "1px solid black",
                  height: "1.3em",
                  fontSize: "12px",
                }}
              >
                {(() => {
                  if (!person.created_at?.split("T")[0]) return "";
                  const d = new Date(person.created_at.split("T")[0]);
                  return isNaN(d)
                    ? person.created_at.split("T")[0]
                    : d.toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    });
                })()}
              </span>
            </div>
          </td>
          <td colSpan={20}>
            <div
              style={{ display: "flex", alignItems: "center", width: "100%" }}
            >
              <label
                style={{
                  fontWeight: "bold",
                  whiteSpace: "nowrap",
                  marginRight: "10px",
                  fontSize: "12px",
                }}
              >
                Date Examination:
              </label>
              <span
                style={{
                  flexGrow: 1,
                  borderBottom: "1px solid black",
                  height: "1.3em",
                  fontSize: "12px",
                }}
              >
                {examSchedule?.schedule_created_at
                  ? new Date(
                    examSchedule.schedule_created_at,
                  ).toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })
                  : ""}
              </span>
            </div>
          </td>
        </tr>
        <EcatRow />
        <ProgramRow filled />
        <ReasonsRow />
        {showDean ? <DeanApprovalRows /> : <DirectorApprovalRows />}
        <AcceptanceRow />
      </tbody>
    </table>
  );

  const EmptyChangeCourseBody = ({ showDean = true }) => (
    <table
      style={{
        borderCollapse: "collapse",
        fontFamily: "Arial",
        width: "8in",
        margin: "0 auto",
        marginTop: "-30px",
        textAlign: "center",
        tableLayout: "fixed",
      }}
    >
      <tbody>
        <tr style={{ fontSize: "13px" }}>
          <td colSpan={40}>
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                alignItems: "center",
                width: "100%",
              }}
            >
              <label
                style={{
                  fontWeight: "bold",
                  whiteSpace: "nowrap",
                  marginRight: "10px",
                  fontSize: "12px",
                }}
              >
                Applicant ID No.:
              </label>
              <div
                style={{
                  width: "200px",
                  borderBottom: "1px solid black",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  fontSize: "12px",
                  height: "1.3em",
                }}
              ></div>
            </div>
          </td>
        </tr>
        <tr>
          <td colSpan={40} style={{ fontSize: "13px", paddingTop: "5px" }}>
            <div
              style={{ display: "flex", alignItems: "center", width: "100%" }}
            >
              <span
                style={{
                  fontWeight: "bold",
                  whiteSpace: "nowrap",
                  marginRight: "10px",
                  fontSize: "12px",
                }}
              >
                Name of Student:
              </span>
              <div
                style={{
                  flexGrow: 1,
                  display: "flex",
                  justifyContent: "space-between",
                  height: "20px",
                }}
              >
                {[0, 1, 2, 3].map((i) => (
                  <span
                    key={i}
                    style={{
                      width: "25%",
                      textAlign: "center",
                      fontSize: "14.5px",
                      borderBottom: "1px solid black",
                    }}
                  ></span>
                ))}
              </div>
            </div>
          </td>
        </tr>
        <tr>
          <td colSpan={40} style={{ fontSize: "12px", paddingTop: "2px" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginLeft: "-30px",
              }}
            >
              {[
                "(Pls. PRINT)",
                "Last Name",
                "Given Name",
                "Middle Name",
                "Ext. Name",
              ].map((l) => (
                <span key={l} style={{ width: "20%", textAlign: "center" }}>
                  {l}
                </span>
              ))}
            </div>
          </td>
        </tr>
        <tr style={{ fontSize: "13px" }}>
          <td colSpan={20}>
            <div
              style={{ display: "flex", alignItems: "center", width: "100%" }}
            >
              <label
                style={{
                  fontWeight: "bold",
                  whiteSpace: "nowrap",
                  marginRight: "10px",
                  fontSize: "12px",
                }}
              >
                Date Applied
              </label>
              <span
                style={{
                  flexGrow: 1,
                  borderBottom: "1px solid black",
                  height: "1.3em",
                  fontSize: "12px",
                }}
              ></span>
            </div>
          </td>
          <td colSpan={20}>
            <div
              style={{ display: "flex", alignItems: "center", width: "100%" }}
            >
              <label
                style={{
                  fontWeight: "bold",
                  whiteSpace: "nowrap",
                  marginRight: "10px",
                  fontSize: "12px",
                }}
              >
                Date Examination:
              </label>
              <span
                style={{
                  flexGrow: 1,
                  borderBottom: "1px solid black",
                  height: "1.3em",
                  fontSize: "12px",
                }}
              ></span>
            </div>
          </td>
        </tr>
        <EcatRow />
        <ProgramRow filled={false} />
        <ReasonsRow />
        {showDean ? <DeanApprovalRows /> : <DirectorApprovalRows />}
        <AcceptanceRow />
      </tbody>
    </table>
  );

  const EcatRow = () => (
    <tr style={{ fontSize: "13px" }}>
      <td colSpan={40}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            width: "100%",
            marginTop: "10px",
          }}
        >
          <label
            style={{
              fontWeight: "bold",
              whiteSpace: "nowrap",
              fontSize: "12px",
              marginRight: "10px",
            }}
          >
            ECAT Examination Result/Score:
          </label>
          <span
            style={{
              display: "inline-block",
              width: "100px",
              height: "1px",
              marginRight: "15px",
              borderBottom: "1px solid black",
            }}
          ></span>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              marginRight: "20px",
            }}
          >
            <input
              type="checkbox"
              style={{ width: "30px", height: "30px", marginRight: "8px" }}
            />
            <span style={{ fontSize: "12px", fontWeight: "bold" }}>Passed</span>
          </div>
          <div style={{ display: "flex", alignItems: "center" }}>
            <input
              type="checkbox"
              style={{ width: "30px", height: "30px", marginRight: "8px" }}
            />
            <span style={{ fontSize: "12px", fontWeight: "bold" }}>Failed</span>
          </div>
        </div>
      </td>
    </tr>
  );

  const ProgramRow = ({ filled }) => {
    const programText =
      filled && curriculumOptions.length > 0
        ? `${curriculumOptions.find((i) => i?.curriculum_id?.toString() === (person?.program ?? "").toString())?.program_code || person?.program || ""} ${curriculumOptions.find(
          (c) =>
            c.curriculum_id?.toString() ===
            (person?.program ?? "").toString(),
        )?.major || ""
          }`.toUpperCase()
        : "";
    return (
      <tr>
        <td colSpan={19} style={{ padding: 0 }}>
          <span
            style={{
              fontSize: "12px",
              fontWeight: "bold",
              display: "block",
              marginBottom: "2px",
              textAlign: "left",
            }}
          >
            FROM DEGREE/PROGRAM APPLIED
          </span>
          <div
            style={{
              border: "1px solid black",
              width: "100%",
              height: "25px",
              lineHeight: "25px",
              fontSize: "12px",
            }}
          >
            {filled
              ? curriculumOptions.length > 0
                ? programText
                : "Loading..."
              : ""}
          </div>
        </td>
        <td colSpan={2}></td>
        <td colSpan={19} style={{ padding: 0 }}>
          <span
            style={{
              fontSize: "12px",
              display: "block",
              textAlign: "left",
              marginBottom: "2px",
            }}
          >
            Change to <b>NEW DEGREE/PROGRAM</b>
          </span>
          <div
            style={{
              border: "1px solid black",
              width: "100%",
              height: "25px",
              lineHeight: "25px",
              fontSize: "12px",
            }}
          ></div>
        </td>
      </tr>
    );
  };

  const ReasonsRow = () => (
    <tr style={{ fontSize: "13px" }}>
      <td colSpan={40} style={{ padding: 0 }}>
        <div
          style={{
            position: "relative",
            width: "100%",
            paddingTop: "6px",
            marginTop: "10px",
            paddingBottom: "6px",
            boxSizing: "border-box",
          }}
        >
          <div style={{ display: "flex", alignItems: "center" }}>
            <span
              style={{
                fontWeight: "700",
                whiteSpace: "nowrap",
                marginRight: "6px",
                fontSize: "12px",
              }}
            >
              Reason's for Change:
            </span>
            <div
              style={{
                flexGrow: 1,
                borderBottom: "1px solid #000",
                height: "1.15em",
                marginTop: "-4px",
                marginRight: "260px",
              }}
            ></div>
          </div>
          <div
            style={{
              position: "absolute",
              right: "6px",
              top: "6.50px",
              width: "240px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "4px",
            }}
          >
            <div
              style={{
                width: "100%",
                borderBottom: "1px solid #000",
                height: "1.15em",
                marginBottom: "-3px",
              }}
            ></div>
            <div
              style={{
                fontSize: "12px",
                whiteSpace: "nowrap",
                textAlign: "center",
              }}
            >
              Applicant's Signature
            </div>
          </div>
          <div
            style={{
              marginTop: "12px",
              width: "64.5%",
              borderBottom: "1px solid #000",
              height: "1.1em",
              marginLeft: "6px",
            }}
          ></div>
        </div>
      </td>
    </tr>
  );

  const DeanApprovalRows = () => (
    <>
      <tr style={{ fontSize: "13px" }}>
        <td colSpan={40}>
          <div
            style={{ fontWeight: "bold", textAlign: "left", fontSize: "12px" }}
          >
            College Approval from current program applied:
          </div>
        </td>
      </tr>
      <tr style={{ fontSize: "13px" }}>
        <td colSpan={40}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              width: "100%",
              marginTop: "5px",
            }}
          >
            {["College Code", "Program Head", "College Dean"].map((l) => (
              <div key={l} style={{ width: "30%" }}>
                <div
                  style={{ borderBottom: "1px solid black", height: "1.2em" }}
                ></div>
                <div style={{ marginTop: "3px" }}>{l}</div>
              </div>
            ))}
          </div>
        </td>
      </tr>
      <tr style={{ fontSize: "13px" }}>
        <td colSpan={40}>
          <div
            style={{ fontWeight: "bold", textAlign: "left", fontSize: "12px" }}
          >
            College Acceptance to new program applied:
          </div>
        </td>
      </tr>
      <tr style={{ fontSize: "13px" }}>
        <td colSpan={40}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              width: "100%",
              marginTop: "5px",
            }}
          >
            {["College Code", "Program Head", "College Dean"].map((l) => (
              <div key={l} style={{ width: "30%" }}>
                <div
                  style={{ borderBottom: "1px solid black", height: "1.2em" }}
                ></div>
                <div style={{ marginTop: "3px" }}>{l}</div>
              </div>
            ))}
          </div>
        </td>
      </tr>
    </>
  );

  const DirectorApprovalRows = () => (
    <tr>
      <td colSpan={40} style={{ padding: 0 }}>
        <div
          style={{
            width: "100%",
            marginTop: "18px",
            padding: "0 12px",
            boxSizing: "border-box",
            fontFamily: "Arial",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: "40px",
            }}
          >
            {[
              {
                title: "Approval from current program applied:",
                label: "Course Code",
              },
              {
                title: "Acceptance to new program applied:",
                label: "Course Code",
              },
            ].map(({ title }, i) => (
              <div key={i} style={{ width: "48%" }}>
                <div
                  style={{
                    fontSize: "12px",
                    fontWeight: "700",
                    marginBottom: "8px",
                    textAlign: "left",
                  }}
                >
                  {title}
                </div>
                <div style={{ display: "flex", gap: "18px" }}>
                  {["Course Code", "Program Head"].map((l) => (
                    <div key={l} style={{ flex: 1, textAlign: "center" }}>
                      <div
                        style={{
                          borderBottom: "1px solid #000",
                          height: "18px",
                          marginBottom: "3px",
                        }}
                      ></div>
                      <span style={{ fontSize: "12px" }}>{l}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          {selectedPreparedBy && (
            <div
              style={{
                marginTop: "28px",
                display: "flex",
                justifyContent: "center",
              }}
            >
              <div style={{ width: "260px", textAlign: "center" }}>
                <div
                  style={{
                    borderBottom: "1px solid #000",
                    minHeight: "18px",
                    marginBottom: "3px",
                  }}
                >
                  {selectedPreparedBy?.signature_image && (
                    <img
                      src={getSignatureImageSrc(selectedPreparedBy)}
                      alt="Signature"
                      style={{
                        width: "140px",
                        height: "34px",
                        objectFit: "contain",
                        display: "block",
                        margin: "-18px auto -2px",
                      }}
                    />
                  )}
                </div>
                <div style={{ fontSize: "12px", fontWeight: "700" }}>
                  {selectedPreparedBy.full_name?.toUpperCase() || ""}
                </div>
                <div style={{ fontSize: "12px" }}>
                  {selectedPreparedBy.designation || "Campus Administrator"}
                </div>
              </div>
            </div>
          )}
        </div>
      </td>
    </tr>
  );

  const AcceptanceRow = () => (
    <tr style={{ fontSize: "13px" }}>
      <td colSpan={40}>
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            alignItems: "center",
            gap: "20px",
            marginTop: "10px",
          }}
        >
          {["Accepted", "Not Accepted"].map((l) => (
            <label
              key={l}
              style={{ display: "flex", alignItems: "center", gap: "5px" }}
            >
              <input
                type="checkbox"
                style={{ width: "25px", height: "25px" }}
              />
              {l}
            </label>
          ))}
          <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
            <label
              style={{ display: "flex", alignItems: "center", gap: "5px" }}
            >
              <input
                type="checkbox"
                style={{ width: "25px", height: "25px" }}
              />
              Other/s:
            </label>
            <div
              style={{
                borderBottom: "1px solid black",
                width: "250px",
                marginTop: "15px",
              }}
            ></div>
          </div>
        </div>
      </td>
    </tr>
  );

  const CopyLabel = ({ leftLabel, label }) => (
    <div
      style={{
        width: "8in",
        maxWidth: "100%",
        margin: "0 auto",
        boxSizing: "border-box",
        padding: "10px 0",
        marginTop: "20px",
      }}
    >
      <hr
        style={{
          width: "100%",
          borderTop: "1px solid black",
          marginTop: "-5px",
        }}
      />

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginTop: "10px",
          fontWeight: "normal",
          fontSize: "12px",
          color: "black",
        }}
      >
        <span>{leftLabel}</span>
        <span>{label}</span>
      </div>
    </div>
  );

  const DashedSeparator = () => (
    <div
      style={{
        width: "8in",
        maxWidth: "100%",
        margin: "0 auto",
        boxSizing: "border-box",
        padding: "10px 0",
      }}
    >
      <hr
        style={{
          width: "100%",
          border: "none",
          borderTop: "1px dashed black",
          margin: "10px auto",
        }}
      />
    </div>
  );

  const Watermark = ({ top = "23%" }) => (
    <div
      style={{
        position: "absolute",
        top,
        left: "50%",
        transform: "translate(-50%, -50%)",
        fontSize: "120px",
        fontWeight: "900",
        color: isVerified ? "rgba(0,128,0,0.15)" : "rgba(255,0,0,0.18)",
        textTransform: "uppercase",
        whiteSpace: "nowrap",
        pointerEvents: "none",
        userSelect: "none",
        zIndex: 0,
        fontFamily: "Arial",
        letterSpacing: "0.3rem",
        textAlign: "center",
        lineHeight: isVerified ? "1" : "0.8",
      }}
    >
      {isVerified ? (
        "VERIFIED"
      ) : (
        <>
          <div>NOT</div>
          <div>VERIFIED</div>
        </>
      )}
    </div>
  );

  // ─── Form preview components ──────────────────────────────────────────────

  const PermitForm = () => (
    <div ref={permitRef} style={{ position: "relative" }}>
      <Watermark top="23%" />
      <div className="section">
        <SchoolHeader showProfile />
        <div style={{ height: "20px" }} />
        <table
          className="student-table"
          style={{
            borderCollapse: "collapse",
            fontFamily: "Arial",
            fontSize: "15px",
            width: "8in",
            margin: "0 auto",
            tableLayout: "fixed",
          }}
        >
          <tbody>
            {/* Applicant Number */}
            <tr style={{ fontFamily: "Arial", fontSize: "15px" }}>
              <td colSpan={40}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "flex-end",
                    width: "100%",
                    gap: "3px",
                  }}
                >
                  <label style={{ fontWeight: "bold", whiteSpace: "nowrap" }}>
                    Applicant No.:
                  </label>
                  <div
                    style={{
                      borderBottom: "1px solid black",
                      fontFamily: "Arial",
                      fontWeight: "normal",
                      fontSize: "15px",
                      minWidth: "278px",
                      height: "1.2em",
                      display: "flex",
                      alignItems: "center",
                    }}
                  >
                    {selectedPerson?.applicant_number}
                  </div>
                </div>
              </td>
            </tr>

            {/* Name + Permit No. */}
            <tr>
              <td colSpan={20}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    width: "100%",
                  }}
                >
                  <label style={{ fontWeight: "bold", marginRight: "10px" }}>
                    Name:
                  </label>
                  <span
                    style={{
                      flexGrow: 1,
                      borderBottom: "1px solid black",
                      fontFamily: "Arial",
                      minWidth: "250px",
                    }}
                  >
                    {selectedPerson?.last_name?.toUpperCase()},{" "}
                    {selectedPerson?.first_name?.toUpperCase()}{" "}
                    {selectedPerson?.middle_name?.toUpperCase() || ""}{" "}
                    {selectedPerson?.extension?.toUpperCase() || ""}
                  </span>
                </div>
              </td>
              <td colSpan={20}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    width: "100%",
                  }}
                >
                  <label style={{ fontWeight: "bold", marginRight: "10px" }}>
                    Permit No.:
                  </label>
                  <span
                    style={{
                      flexGrow: 1,
                      borderBottom: "1px solid black",
                      minWidth: "200px",
                      fontFamily: "Arial",
                    }}
                  >
                    {permitNumber || ""}
                  </span>
                </div>
              </td>
            </tr>

            {/* Course + Major */}
            <tr>
              <td colSpan={20}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    width: "100%",
                  }}
                >
                  <label style={{ fontWeight: "bold", marginRight: "10px" }}>
                    Course Applied:
                  </label>
                  <span
                    style={{
                      flexGrow: 1,
                      borderBottom: "1px solid black",
                      minWidth: "220px",
                      fontFamily: "Arial",
                    }}
                  >
                    {curriculumOptions.length > 0
                      ? curriculumOptions.find(
                        (c) =>
                          c.curriculum_id?.toString() ===
                          (person?.program ?? "").toString(),
                      )?.program_description || ""
                      : "Loading..."}
                  </span>
                </div>
              </td>
              <td colSpan={20}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    width: "100%",
                  }}
                >
                  <label style={{ fontWeight: "bold", marginRight: "10px" }}>
                    Major:
                  </label>
                  <span
                    style={{
                      flexGrow: 1,
                      borderBottom: "1px solid black",
                      minWidth: "200px",
                      height: "12px",
                      fontFamily: "Arial",
                    }}
                  >
                    {curriculumOptions.length > 0
                      ? curriculumOptions.find(
                        (c) =>
                          c.curriculum_id?.toString() ===
                          (person?.program ?? "").toString(),
                      )?.major || ""
                      : "Loading..."}
                  </span>
                </div>
              </td>
            </tr>

            {/* Date of Exam + Time */}
            <tr style={{ fontFamily: "Arial", fontSize: "15px" }}>
              <td colSpan={20}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    width: "100%",
                  }}
                >
                  <label
                    style={{
                      fontWeight: "bold",
                      whiteSpace: "nowrap",
                      marginRight: "10px",
                    }}
                  >
                    Date of Exam:
                  </label>
                  <span
                    style={{
                      flexGrow: 1,
                      borderBottom: "1px solid black",
                      height: "1.2em",
                      fontFamily: "Arial",
                      textAlign: "left",
                    }}
                  >
                    {examSchedule?.schedule_created_at
                      ? new Date(
                        examSchedule.schedule_created_at,
                      ).toLocaleDateString("en-US", {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })
                      : ""}
                  </span>
                </div>
              </td>
              <td colSpan={20}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    width: "100%",
                  }}
                >
                  <label
                    style={{
                      fontWeight: "bold",
                      whiteSpace: "nowrap",
                      marginRight: "10px",
                    }}
                  >
                    Time:
                  </label>
                  <span
                    style={{
                      flexGrow: 1,
                      borderBottom: "1px solid black",
                      height: "1.2em",
                      fontFamily: "Arial",
                      textAlign: "left",
                    }}
                  >
                    {examSchedule
                      ? new Date(
                        `1970-01-01T${examSchedule.start_time}`,
                      ).toLocaleTimeString("en-US", {
                        hour: "numeric",
                        minute: "2-digit",
                        hour12: true,
                      })
                      : ""}
                  </span>
                </div>
              </td>
            </tr>

            {/* Bldg. / Floor / Room No. — 3 even columns */}
            <tr style={{ fontFamily: "Arial", fontSize: "15px" }}>
              <td colSpan={16}>
                <div
                  style={{ display: "flex", alignItems: "center", gap: "6px" }}
                >
                  <label style={{ fontWeight: "bold", whiteSpace: "nowrap" }}>
                    Building:
                  </label>
                  <span
                    style={{
                      flexGrow: 1,
                      borderBottom: "1px solid black",
                      height: "1.2em",
                      fontFamily: "Arial",
                      textAlign: "left",
                    }}
                  >
                    {examSchedule?.building_description || ""}
                  </span>
                </div>
              </td>
              <td colSpan={8}>
                <div
                  style={{ display: "flex", alignItems: "center", gap: "6px" }}
                >
                  <label style={{ fontWeight: "bold", whiteSpace: "nowrap" }}>
                    Floor :
                  </label>
                  <span
                    style={{
                      flexGrow: 1,
                      borderBottom: "1px solid black",
                      height: "1.2em",
                      fontFamily: "Arial",
                      textAlign: "center",
                    }}
                  >
                    {examSchedule?.floor !== undefined &&
                      examSchedule?.floor !== null
                      ? getOrdinal(examSchedule.floor)
                      : ""}
                  </span>
                </div>
              </td>
              <td colSpan={16}>
                <div
                  style={{ display: "flex", alignItems: "center", gap: "6px" }}
                >
                  <label style={{ fontWeight: "bold", whiteSpace: "nowrap" }}>
                    Room No.:
                  </label>
                  <span
                    style={{
                      flexGrow: 1,
                      borderBottom: "1px solid black",
                      height: "1.2em",
                      fontFamily: "Arial",
                      textAlign: "left",
                    }}
                  >
                    {examSchedule?.room_description || ""}
                  </span>
                </div>
              </td>
            </tr>

            {/* Date Verified / Scheduled by — 2 even columns */}
            <tr style={{ fontFamily: "Arial", fontSize: "15px" }}>
              <td colSpan={20}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    width: "100%",
                  }}
                >
                  <label
                    style={{
                      fontWeight: "bold",
                      whiteSpace: "nowrap",
                      marginRight: "10px",
                    }}
                  >
                    Date Verified:
                  </label>
                  <span
                    style={{
                      flexGrow: 1,
                      borderBottom: "1px solid black",
                      height: "1.2em",
                      fontFamily: "Arial",
                      textAlign: "left",
                    }}
                  >
                    {verifiedAt
                      ? new Date(verifiedAt).toLocaleDateString("en-US", {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })
                      : ""}
                  </span>
                </div>
              </td>
              <td colSpan={20}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    width: "100%",
                  }}
                >
                  <label
                    style={{
                      fontWeight: "bold",
                      whiteSpace: "nowrap",
                      marginRight: "10px",
                    }}
                  >
                    Scheduled by:
                  </label>
                  <span
                    style={{
                      flexGrow: 1,
                      borderBottom: "1px solid black",
                      height: "1.2em",
                      fontFamily: "Arial",
                      textAlign: "left",
                    }}
                  >
                    {scheduledBy || "N/A"}
                  </span>
                </div>
              </td>
            </tr>

            {/* Signature line (left) + Centered QR code (right), aligned to same height */}
            <tr>
              {/* Signature */}
              <td
                colSpan={20}
                style={{
                  paddingTop: "24px",
                  paddingBottom: "16px",
                  verticalAlign: "middle",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    height: "200px",
                  }}
                >
                  <div
                    style={{
                      width: "360px",
                      textAlign: "center",
                    }}
                  >
                    {/* Space to sign */}
                    <div style={{ height: "30px" }} />

                    <div
                      style={{
                        borderTop: "1px solid black",
                        width: "100%",
                        marginBottom: "8px",
                      }}
                    />

                    <span
                      style={{
                        fontSize: "11px",
                        fontWeight: "600",
                        letterSpacing: "0.3px",
                        color: "black",
                      }}
                    >
                      Signature over Printed Name
                    </span>
                  </div>
                </div>
              </td>

              {/* QR Code */}
              <td
                colSpan={20}
                style={{
                  paddingTop: "24px",
                  paddingBottom: "16px",
                  verticalAlign: "middle",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    alignItems: "center",
                    height: "200px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <div
                      style={{
                        width: "190px",
                        height: "190px",
                        borderRadius: "10px",
                        border: "1px solid black",
                        background: "#fff",
                        boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        position: "relative",
                        overflow: "hidden",
                      }}
                    >
                      {attendanceToken ? (
                        <>
                          <QRCodeSVG
                            value={attendanceToken}
                            size={150}
                            level="H"
                          />

                          {selectedPerson?.applicant_number && (
                            <div
                              style={{
                                position: "absolute",
                                top: "50%",
                                left: "50%",
                                transform: "translate(-50%, -50%)",
                                fontSize: "12px",
                                fontWeight: "700",
                                color: "maroon",
                                background: "rgba(255,255,255,0.92)",
                                padding: "3px 7px",
                                borderRadius: "4px",
                                textAlign: "center",
                                whiteSpace: "nowrap",
                                boxShadow: "0 0 0 1px rgba(128,0,0,0.15)",
                              }}
                            >
                              {selectedPerson.applicant_number}
                            </div>
                          )}
                        </>
                      ) : (
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            gap: "6px",
                          }}
                        >
                          <span
                            style={{
                              fontSize: "22px",
                              color: "#ccc",
                            }}
                          >
                            ⬚
                          </span>

                          <span
                            style={{
                              fontSize: "11px",
                              color: "#999",
                              textAlign: "center",
                              padding: "0 14px",
                              lineHeight: "1.4",
                            }}
                          >
                            No attendance QR yet
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
        <table
          className="student-table"
          style={{
            borderCollapse: "collapse",
            fontFamily: "Arial",
            width: "8in",
            margin: "0 auto",
            textAlign: "center",
            tableLayout: "fixed",
            border: "1px solid black",
          }}
        >
          <tbody>
            <tr>
              <td
                colSpan={40}
                style={{
                  color: "black",
                  padding: "12px",
                  lineHeight: "1.6",
                  textAlign: "left",
                  fontSize: "14px",
                  fontFamily: "Arial",
                }}
              >
                <strong>IMPORTANT REMINDERS FOR APPLICANTS:</strong>
                <ul style={{ marginTop: "8px" }}>
                  <strong>Step 1:</strong> Check your Examination Date, Time,
                  and Room Number indicated on your permit.
                  <br />
                  <strong>Step 2:</strong> Bring all required items on the exam
                  day:
                  <ul>
                    <li>
                      Official Examination Permit with VERIFIED watermark on it
                    </li>
                    <li>No. 2 Pencil (any brand)</li>
                    <li>2 Short bond papers</li>
                  </ul>
                  <strong>Step 3:</strong> Wear the proper attire:
                  <ul>
                    <li>
                      Plain white T-shirt or plain white polo shirt{" "}
                      <strong>(no prints, no logos, no designs)</strong>
                    </li>
                    <li>Pants (Shorts and ripped jeans are not allowed)</li>
                    <li>Closed shoes (no crocs, sandals, slippers)</li>
                  </ul>
                  <strong>Step 4:</strong> Keep the two paper sheets attached to
                  your exam permit.
                  <br />
                  <strong>Step 5:</strong> Please Arrive at least 1 hour before
                  your examination time. Late applicants will NOT be allowed to
                  enter once the exam room door closes.
                  <br />
                  <br />
                  <div style={{ textAlign: "center", marginLeft: "-50px" }}>
                    <strong>GOOD LUCK TO ALL ASPIRING APPLICANTS!</strong>
                  </div>
                </ul>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );

  const ChangeCourseFormWithDean = ({ formRef, watermarkTop2 = "66%" }) => (
    <div ref={formRef} style={{ position: "relative" }}>
      <Container>
        <Watermark top="18%" />
        <ChangeCourseHeader />
        <br />
        <br />
        <ChangeCourseBody showDean />
      </Container>
      <CopyLabel
        leftLabel={`${branding.shortTerm || ""}-QSF-AS-003 Rev. 00 (7.3.25)`}
        label="College Dean's Copy"
      />
      <DashedSeparator />
      <Container>
        <div
          style={{
            position: "absolute",
            top: watermarkTop2,
            left: "50%",
            transform: "translate(-50%, -50%)",
            fontSize: "120px",
            fontWeight: "900",
            color: isVerified ? "rgba(0,128,0,0.15)" : "rgba(255,0,0,0.18)",
            textTransform: "uppercase",
            textAlign: "center",
            pointerEvents: "none",
            userSelect: "none",
            zIndex: 0,
            fontFamily: "Arial",
            letterSpacing: "0.3rem",
            lineHeight: isVerified ? "1" : "0.8",
            whiteSpace: "nowrap",
          }}
        >
          {isVerified ? (
            "VERIFIED"
          ) : (
            <>
              <div>NOT</div>
              <div>VERIFIED</div>
            </>
          )}
        </div>
        <ChangeCourseHeader />
        <br />
        <br />
        <ChangeCourseBody showDean />
        <CopyLabel
          leftLabel={`${branding.shortTerm || ""}-QSF-AS-003 Rev. 00 (7.3.25)`}
          label="Admission Services Copy"
        />
      </Container>
    </div>
  );

  const EmptyFormWithDean = ({ formRef }) => (
    <div ref={formRef} style={{ position: "relative" }}>
      <Container>
        <EmptyFormHeader />
        <br />
        <br />
        <EmptyChangeCourseBody showDean />
      </Container>
      <CopyLabel
        leftLabel={`${branding.shortTerm || ""}-QSF-AS-003 Rev. 00 (7.3.25)`}
        label="College Dean's Copy"
      />
      <DashedSeparator />
      <Container>
        <EmptyFormHeader />
        <br />
        <br />
        <EmptyChangeCourseBody showDean />
        <CopyLabel
          leftLabel={`${branding.shortTerm || ""}-QSF-AS-003 Rev. 00 (7.3.25)`}
          label="Admission Services Copy"
        />
      </Container>
    </div>
  );

  const ChangeCourseFormWithDirector = ({ formRef }) => (
    <div ref={formRef} style={{ position: "relative" }}>
      <Container>
        <Watermark top="18%" />
        <ChangeCourseHeader />
        <br />
        <br />
        <ChangeCourseBody showDean={false} />
      </Container>
      <DashedSeparator />
      <Container>
        <div
          style={{
            position: "absolute",
            top: "66%",
            left: "50%",
            transform: "translate(-50%,-50%)",
            fontSize: "120px",
            fontWeight: "900",
            color: isVerified ? "rgba(0,128,0,0.15)" : "rgba(255,0,0,0.18)",
            textTransform: "uppercase",
            textAlign: "center",
            pointerEvents: "none",
            userSelect: "none",
            zIndex: 0,
            fontFamily: "Arial",
            letterSpacing: "0.3rem",
            lineHeight: isVerified ? "1" : "0.8",
            whiteSpace: "nowrap",
          }}
        >
          {isVerified ? (
            "VERIFIED"
          ) : (
            <>
              <div>NOT</div>
              <div>VERIFIED</div>
            </>
          )}
        </div>
        <ChangeCourseHeader />
        <br />
        <br />
        <ChangeCourseBody showDean={false} />
      </Container>
    </div>
  );

  const EmptyFormWithDirector = ({ formRef }) => (
    <div ref={formRef} style={{ position: "relative" }}>
      <Container>
        <EmptyFormHeader />
        <br />
        <br />
        <EmptyChangeCourseBody showDean={false} />
      </Container>
      <DashedSeparator />
      <Container>
        <EmptyFormHeader />
        <br />
        <br />
        <EmptyChangeCourseBody showDean={false} />
        <br />
        <br />
      </Container>
    </div>
  );

  // ─── Render ───────────────────────────────────────────────────────────────
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
      {/* Title + Search */}
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={2}
      >
        <Typography
          variant="h4"
          sx={{ fontWeight: "bold", color: titleColor, fontSize: "36px" }}
        >
          EXAMINATION PERMIT CHANGE COURSE
        </Typography>
        <Box display="flex" alignItems="center" gap={2}>
          <Autocomplete
            options={persons}
            value={selectedPerson}
            inputValue={searchQuery}
            isOptionEqualToValue={(option, value) =>
              option?.person_id === value?.person_id ||
              option?.applicant_number === value?.applicant_number
            }
            getOptionLabel={(option) =>
              option
                ? `${option.applicant_number || ""} - ${option.last_name || ""}, ${option.first_name || ""} ${option.middle_name || ""} (${option.emailAddress || ""})`
                : ""
            }
            onInputChange={(event, newInputValue, reason) => {
              if (reason !== "reset") setSearchQuery(newInputValue);
            }}
            filterOptions={(options, state) => {
              const query = state.inputValue.toLowerCase();
              return options.filter((p) => {
                const fullString =
                  `${p.first_name ?? ""} ${p.middle_name ?? ""} ${p.last_name ?? ""} ${p.emailAddress ?? ""}`.toLowerCase();
                return (
                  (p.applicant_number || "").toLowerCase().includes(query) ||
                  fullString.includes(query)
                );
              });
            }}
            onChange={(event, newValue) => {
              if (newValue) {
                setSelectedPerson(newValue);
                fetchPersonData(newValue.person_id);
                setApplicantNumber(newValue.applicant_number);
                setSearchQuery(newValue.applicant_number || "");
                sessionStorage.setItem(
                  "admin_edit_person_id",
                  newValue.person_id,
                );
                setSelectedForm(null);
              } else {
                setSelectedPerson(null);
                setApplicantNumber("");
                setSearchQuery("");
                setSelectedForm(null);
              }
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                variant="outlined"
                placeholder="Search Applicant Name / Email / Applicant ID"
                size="small"
                sx={{
                  width: 450,
                  backgroundColor: "#fff",
                  borderRadius: 1,
                  "& .MuiOutlinedInput-root": { borderRadius: "10px" },
                }}
                InputProps={{
                  ...params.InputProps,
                  startAdornment: (
                    <>
                      <SearchIcon sx={{ mr: 1, color: "gray" }} />
                      {params.InputProps.startAdornment}
                    </>
                  ),
                }}
              />
            )}
          />
          <PrintingHistoryDialog
            employeeId={employeeID}
            action={DOWNLOAD_EXAM_PDF_ACTION}
            buttonLabel="View Download History"
            title="My Exam PDF Download History"
          />

          <PrintConfirmDialog
            open={Boolean(pendingAction)}
            mode={pendingAction?.mode}
            formLabel={FORM_OPTIONS.find((o) => o.key === selectedForm)?.label}
            applicantName={`${selectedPerson?.last_name || ""}, ${selectedPerson?.first_name || ""}`}
            applicantNumber={selectedPerson?.applicant_number}
            loading={confirmLoading}
            onCancel={() => setPendingAction(null)}
            onConfirm={async () => {
              setConfirmLoading(true);
              try {
                if (pendingAction.mode === "print") await handlePrint();
                else await handleDownloadPdf();
              } finally {
                setConfirmLoading(false);
                setPendingAction(null);
              }
            }}
          />

        </Box>
      </Box>

      <hr style={{ border: "1px solid #ccc", width: "100%" }} />
      <br />
      <br />

      <AdmissionProcessTabs />

      <br />
      <br />

      <TableContainer component={Paper} sx={{ width: "100%" }}>
        <Table>
          <TableHead
            sx={{
              backgroundColor: headerColor,
              border: "1px solid black",
            }}
          >
            <TableRow>
              <TableCell
                sx={{
                  color: "white",
                  fontSize: "20px",
                  fontFamily: "Arial",
                  border: "none",
                }}
              >
                Applicant ID:&nbsp;
                <span
                  style={{
                    fontFamily: "Arial",
                    fontWeight: "normal",
                    textDecoration: "underline",
                  }}
                >
                  {selectedPerson?.applicant_number || "N/A"}
                </span>
              </TableCell>
              <TableCell
                align="right"
                sx={{
                  color: "white",
                  fontSize: "20px",
                  fontFamily: "Arial",
                  border: "none",
                }}
              >
                Applicant Name:&nbsp;
                <span
                  style={{
                    fontFamily: "Arial",
                    fontWeight: "normal",
                    textDecoration: "underline",
                  }}
                >
                  {selectedPerson?.last_name?.toUpperCase()},{" "}
                  {selectedPerson?.first_name?.toUpperCase()}{" "}
                  {selectedPerson?.middle_name?.toUpperCase()}{" "}
                  {selectedPerson?.extension_name?.toUpperCase() || ""}
                </span>
              </TableCell>
            </TableRow>
          </TableHead>
        </Table>
      </TableContainer>

      <br />
      <br />

      {/* Signatures table */}
      <Box
        sx={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "center",
          width: "100%",
          mb: 4,
        }}
      >
        <Box sx={{ background: "white", width: "100%" }}>
          {[0, 1]
            .map((pos) => (
              <Box
                key={pos}
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: 1,
                  px: 2,
                  py: 1.5,
                  backgroundColor: headerColor,
                  color: "white",
                  borderTop: `1px solid ${borderColor}`,
                }}
              >
                <Typography fontSize="14px" fontWeight="bold" color="white">
                  Total Admin's Records {signatures.length}
                </Typography>
                <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
                  {[
                    {
                      label: "First",
                      action: () => setSignaturePage(0),
                      disabled: signaturePage === 0,
                    },
                    {
                      label: "Prev",
                      action: () => setSignaturePage((p) => Math.max(p - 1, 0)),
                      disabled: signaturePage === 0,
                    },
                  ].map(({ label, action, disabled }) => (
                    <Button
                      key={label}
                      onClick={action}
                      disabled={disabled}
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
                      {label}
                    </Button>
                  ))}
                  <FormControl size="small" sx={{ minWidth: 90 }}>
                    <Select
                      value={signaturePage + 1}
                      onChange={(e) =>
                        setSignaturePage(Number(e.target.value) - 1)
                      }
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
                        "& svg": { color: "white" },
                      }}
                      MenuProps={{
                        PaperProps: {
                          sx: { maxHeight: 200, backgroundColor: "#fff" },
                        },
                      }}
                    >
                      {Array.from({ length: totalSignaturePages }, (_, i) => (
                        <MenuItem key={i + 1} value={i + 1}>
                          Page {i + 1}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <Typography fontSize="11px" color="white">
                    of {totalSignaturePages} page
                    {totalSignaturePages > 1 ? "s" : ""}
                  </Typography>
                  {[
                    {
                      label: "Next",
                      action: () =>
                        setSignaturePage((p) =>
                          Math.min(p + 1, totalSignaturePages - 1),
                        ),
                      disabled: signaturePage >= totalSignaturePages - 1,
                    },
                    {
                      label: "Last",
                      action: () => setSignaturePage(totalSignaturePages - 1),
                      disabled: signaturePage >= totalSignaturePages - 1,
                    },
                  ].map(({ label, action, disabled }) => (
                    <Button
                      key={label}
                      onClick={action}
                      disabled={disabled}
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
                      {label}
                    </Button>
                  ))}
                </Box>
              </Box>
            ))
            .slice(0, 1)}

          <TableContainer
            component={Paper}
            elevation={2}
            sx={{ overflowX: "auto", width: "100%", margin: "0 auto" }}
          >
            <Table size="small">
              <TableHead>
                <TableRow>
                  {["#", "Full Name", "Designation", "Prepared By"].map(
                    (header) => (
                      <TableCell
                        key={header}
                        sx={{
                          border: "1px solid black",
                          fontWeight: 600,
                          color: titleColor,
                          textAlign: "center",
                          fontSize: "13px",
                          padding: "6px 10px",
                        }}
                      >
                        {header}
                      </TableCell>
                    ),
                  )}
                </TableRow>
              </TableHead>
              <TableBody>
                {paginatedSignatures.map((signature, index) => (
                  <TableRow key={signature.id}>
                    <TableCell
                      sx={{
                        border: "1px solid black",
                        textAlign: "center",
                        fontSize: "12px",
                        color: titleColor,
                        padding: "4px 8px",
                      }}
                    >
                      {signaturePage * SIGNATURES_PER_PAGE + index + 1}
                    </TableCell>
                    <TableCell
                      sx={{
                        border: "1px solid black",
                        textAlign: "center",
                        fontSize: "12px",
                        color: titleColor,
                        padding: "4px 8px",
                      }}
                    >
                      {signature.full_name}
                    </TableCell>
                    <TableCell
                      sx={{
                        border: "1px solid black",
                        textAlign: "center",
                        color: titleColor,
                        fontSize: "12px",
                        padding: "4px 8px",
                      }}
                    >
                      {signature.designation}
                    </TableCell>
                    <TableCell
                      sx={{
                        border: "1px solid black",
                        textAlign: "center",
                        color: titleColor,
                        padding: "2px 6px",
                      }}
                    >
                      <Box
                        display="flex"
                        justifyContent="center"
                        alignItems="center"
                      >
                        <Checkbox
                          size="small"
                          color="primary"
                          checked={selectedPreparedBy?.id === signature.id}
                          onChange={() => handlePreparedByChange(signature)}
                        />
                        <Typography fontSize="12px">Prepared By</Typography>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
                {paginatedSignatures.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      align="center"
                      sx={{
                        border: "1px solid black",
                        color: titleColor,
                        padding: "8px",
                        fontSize: "12px",
                      }}
                    >
                      No signatures found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>

          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 1,
              px: 2,
              py: 1.5,
              backgroundColor: headerColor,
              color: "white",
              borderTop: `1px solid ${borderColor}`,
            }}
          >
            <Typography fontSize="14px" fontWeight="bold" color="white">
              Total Admin's Records {signatures.length}
            </Typography>
            <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
              {[
                {
                  label: "First",
                  action: () => setSignaturePage(0),
                  disabled: signaturePage === 0,
                },
                {
                  label: "Prev",
                  action: () => setSignaturePage((p) => Math.max(p - 1, 0)),
                  disabled: signaturePage === 0,
                },
              ].map(({ label, action, disabled }) => (
                <Button
                  key={label}
                  onClick={action}
                  disabled={disabled}
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
                  {label}
                </Button>
              ))}
              <FormControl size="small" sx={{ minWidth: 90 }}>
                <Select
                  value={signaturePage + 1}
                  onChange={(e) => setSignaturePage(Number(e.target.value) - 1)}
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
                    "& svg": { color: "white" },
                  }}
                  MenuProps={{
                    PaperProps: {
                      sx: { maxHeight: 200, backgroundColor: "#fff" },
                    },
                  }}
                >
                  {Array.from({ length: totalSignaturePages }, (_, i) => (
                    <MenuItem key={i + 1} value={i + 1}>
                      Page {i + 1}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Typography fontSize="11px" color="white">
                of {totalSignaturePages} page
                {totalSignaturePages > 1 ? "s" : ""}
              </Typography>
              {[
                {
                  label: "Next",
                  action: () =>
                    setSignaturePage((p) =>
                      Math.min(p + 1, totalSignaturePages - 1),
                    ),
                  disabled: signaturePage >= totalSignaturePages - 1,
                },
                {
                  label: "Last",
                  action: () => setSignaturePage(totalSignaturePages - 1),
                  disabled: signaturePage >= totalSignaturePages - 1,
                },
              ].map(({ label, action, disabled }) => (
                <Button
                  key={label}
                  onClick={action}
                  disabled={disabled}
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
                  {label}
                </Button>
              ))}
            </Box>
          </Box>
        </Box>
      </Box>

      {/* ── FORM SELECTOR (shown when applicant is selected) ─────────────────── */}
      {selectedPerson && (
        <Box sx={{ mb: 3 }}>
          <Typography
            variant="h6"
            sx={{
              fontWeight: "bold",
              color: titleColor,
              mb: 2,
              fontSize: "18px",
            }}
          >
            Select a Form to Preview, Print &amp; Download
          </Typography>

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
              gap: 2,
              mb: 3,
            }}
          >
            {FORM_OPTIONS.map((opt) => {
              const isActive = selectedForm === opt.key;
              return (
                <Card
                  key={opt.key}
                  onClick={() => setSelectedForm(isActive ? null : opt.key)}
                  sx={{
                    p: 2.5,
                    cursor: "pointer",
                    borderRadius: 3,
                    border: isActive
                      ? `2.5px solid ${opt.color}`
                      : `1.5px solid #ddd`,
                    backgroundColor: isActive ? opt.bg : "#fff",
                    boxShadow: isActive
                      ? `0 4px 16px ${opt.color}33`
                      : "0 1px 4px rgba(0,0,0,0.1)",
                    transition: "all 0.2s ease",
                    "&:hover": {
                      boxShadow: `0 4px 14px ${opt.color}44`,
                      borderColor: opt.color,
                      backgroundColor: opt.bg,
                    },
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-start",
                    gap: 1,
                  }}
                >
                  <Box sx={{ color: isActive ? opt.color : "#888", mb: 0.5 }}>
                    {opt.icon}
                  </Box>
                  <Typography
                    sx={{
                      fontWeight: "bold",
                      fontSize: "13px",
                      color: isActive ? opt.color : "#333",
                      lineHeight: 1.3,
                    }}
                  >
                    {opt.label}
                  </Typography>
                  <Typography
                    sx={{ fontSize: "11px", color: "#666", lineHeight: 1.4 }}
                  >
                    {opt.description}
                  </Typography>
                  {isActive && (
                    <Box
                      sx={{
                        mt: 0.5,
                        px: 1,
                        py: 0.3,
                        backgroundColor: opt.color,
                        borderRadius: 1,
                      }}
                    >
                      <Typography
                        sx={{
                          fontSize: "10px",
                          color: "#fff",
                          fontWeight: "bold",
                        }}
                      >
                        SELECTED
                      </Typography>
                    </Box>
                  )}
                </Card>
              );
            })}
          </Box>

          {/* Action bar: shown once a form is selected */}
          {selectedForm && (
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 2,
                p: 2,
                backgroundColor: "#f5f5f5",
                borderRadius: 2,
                border: "1px solid #e0e0e0",
                flexWrap: "wrap",
              }}
            >
              <Typography
                sx={{
                  fontWeight: "bold",
                  fontSize: "14px",
                  color: "#333",
                  flexGrow: 1,
                }}
              >
                Ready:{" "}
                <span
                  style={{
                    color: FORM_OPTIONS.find((o) => o.key === selectedForm)
                      ?.color,
                  }}
                >
                  {FORM_OPTIONS.find((o) => o.key === selectedForm)?.label}
                </span>
              </Typography>

              <Button
                variant="outlined"
                startIcon={<ArrowBackIcon />}
                onClick={() => setSelectedForm(null)}
                sx={{
                  borderColor: "#bbb",
                  color: "#555",
                  minWidth: 180,
                  height: 40,
                  fontWeight: "bold",
                }}
              >
                Back to Selection
              </Button>

              <Button
                variant="contained"
                startIcon={
                  downloadingKey === selectedForm ? null : <DownloadIcon />
                }
                onClick={() => setPendingAction({ mode: "download" })}
                disabled={downloadingKey !== null}
                sx={{
                  backgroundColor: FORM_OPTIONS.find(
                    (o) => o.key === selectedForm,
                  )?.color,
                  "&:hover": { opacity: 0.88 },
                  minWidth: 180,
                  height: 40,
                  fontWeight: "bold",
                }}
              >
                {downloadingKey === selectedForm
                  ? "Generating PDF..."
                  : "Download PDF"}
              </Button>
            </Box>
          )}
        </Box>
      )}

      {/* ── Hidden print/download areas (always rendered when applicant selected) ─────── */}
      {selectedPerson && (
        <Box sx={{ display: "none" }}>
          <PermitForm />
          <ChangeCourseFormWithDean formRef={changeCourseRef} />
          <EmptyFormWithDean formRef={newFormRef} />
          <ChangeCourseFormWithDirector formRef={changeCourseRef1} />
          <EmptyFormWithDirector formRef={newFormRef1} />
          <AdminAdmissionFormProcess
            ref={admissionFormProcessRef}
            personId={selectedPerson?.person_id}
            controlNumber={controlNumbers.admissionFormProcess}
          />
          <EmptyAdmissionFormProcess
            ref={emptyAdmissionFormProcessRef}
            controlNumber={controlNumbers.emptyAdmissionFormProcess}
          />
        </Box>
      )}

      {/* ── Live preview of selected form ────────────────────────────────────── */}
      {selectedPerson && selectedForm && (
        <Box sx={{ mt: 2 }}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              mb: 2,
            }}
          >
            <Typography
              variant="h6"
              sx={{ fontWeight: "bold", color: titleColor, fontSize: "16px" }}
            >
              Preview —{" "}
              {FORM_OPTIONS.find((o) => o.key === selectedForm)?.label}
            </Typography>
          </Box>

          <Box
            sx={{
              border: "1px solid #ccc",
              borderRadius: 2,
              p: 3,
              backgroundColor: "#fff",
              overflowX: "auto",
              boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
            }}
          >
            {selectedForm === "permit" && <PermitForm />}
            {selectedForm === "changeCourse" && (
              <ChangeCourseFormWithDean formRef={{ current: null }} />
            )}
            {selectedForm === "newForm" && (
              <EmptyFormWithDean formRef={{ current: null }} />
            )}
            {selectedForm === "changeCourse1" && (
              <ChangeCourseFormWithDirector formRef={{ current: null }} />
            )}
            {selectedForm === "newForm1" && (
              <EmptyFormWithDirector formRef={{ current: null }} />
            )}
            {/* ✅ NEW — preview copy needs no functional ref, same as the others above */}
            {selectedForm === "admissionFormProcess" && (
              <AdminAdmissionFormProcess
                personId={selectedPerson?.person_id}
                controlNumber={controlNumbers.admissionFormProcess}
              />
            )}
            {selectedForm === "emptyAdmissionFormProcess" && (
              <EmptyAdmissionFormProcess
                controlNumber={controlNumbers.emptyAdmissionFormProcess}
              />
            )}
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default ExaminationPermitChangeCourse;
