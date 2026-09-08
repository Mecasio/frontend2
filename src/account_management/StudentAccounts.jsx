import React, {
  useState,
  useEffect,
  useContext,
  useCallback,
  useMemo,
} from "react";
import { SettingsContext } from "../App";
import axios from "axios";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableContainer,
  Typography,
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  TextField,
  DialogActions,
  Select,
  MenuItem,
  Grid,
  FormControl,
  InputLabel
} from "@mui/material";
import API_BASE_URL from "../apiConfig";
import { getFlatAuditHeaders } from "../utils/auditEvents";
import useAccountAuditMac from "./useAccountAuditMac";
import EaristLogo from "../assets/EaristLogo.png";
import Unauthorized from "../components/Unauthorized";
import LoadingOverlay from "../components/LoadingOverlay";
import SearchIcon from "@mui/icons-material/Search";
import { Snackbar, Alert } from "@mui/material";

import PrintIcon from "@mui/icons-material/Print";
import VpnKeyIcon from "@mui/icons-material/VpnKey";
import SendIcon from "@mui/icons-material/Send";
import SaveIcon from "@mui/icons-material/Save";
import Avatar from "@mui/material/Avatar";
import ImageIcon from "@mui/icons-material/Image";
import AddCircleIcon from "@mui/icons-material/AddCircle";
import EditIcon from "@mui/icons-material/Edit";

const cleanSuggestionValue = (value) => {
  if (value === null || value === undefined) return "";
  const text = String(value).trim();
  return ["null", "undefined"].includes(text.toLowerCase()) ? "" : text;
};

const getStudentSuggestionText = (student) =>
  [
    student?.student_number,
    student?.first_name,
    student?.middle_name,
    student?.last_name,
    student?.emailAddress,
    student?.program_code,
    student?.program_description,
    student?.dprtmnt_name,
  ]
    .map(cleanSuggestionValue)
    .join(" ")
    .toLowerCase();

const getStudentSuggestionValue = (student) =>
  cleanSuggestionValue(student?.student_number) ||
  cleanSuggestionValue(student?.emailAddress);

const rowsPerPage = 100;

export default function StudentAccounts() {
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
    if (branding.campusAddress) setCampusAddress(branding.campusAddress);

    // ✅ Branches (JSON stored in DB)
    setBranches(settings?.branches || []);
  }, [settings]);

  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  const branchMap = useMemo(() => {
    return branches.reduce((acc, branch) => {
      acc[branch.id] = branch.branch;
      return acc;
    }, {});
  }, [branches]);

  const branchAddressMap = useMemo(() => {
    return branches.reduce((acc, branch) => {
      acc[branch.id] = branch.address;
      return acc;
    }, {});
  }, [branches]);

  const generatePassword = (length = 10) => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let password = "";

    for (let i = 0; i < length; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    return password;
  };

  const [status, setStatus] = useState(1);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState("");

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0] || null;
    setPhotoFile(file);
    setPhotoPreview(file ? URL.createObjectURL(file) : "");
  };


  const [userID, setUserID] = useState("");
  const [user, setUser] = useState("");
  const [userRole, setUserRole] = useState("");
  const [adminData, setAdminData] = useState({ dprtmnt_id: "" });

  const [hasAccess, setHasAccess] = useState(null);
  const [loading, setLoading] = useState(false);
  const [listLoading, setListLoading] = useState(false);

  const pageId = 143;

  const [employeeID, setEmployeeID] = useState("");

  const getAuditHeaders = () =>
    getFlatAuditHeaders({
      "x-audit-actor-id":
        employeeID ||
        localStorage.getItem("employee_id") ||
        localStorage.getItem("email") ||
        "unknown",
      "x-audit-actor-role":
        userRole || localStorage.getItem("role") || "registrar",
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

  const [persons, setPersons] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [generatedPassword, setGeneratedPassword] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);

  const fetchPersons = useCallback(
    async (signal) => {
      setListLoading(true);
      try {
        const res = await axios.get(`${API_BASE_URL}/api/student_list`, {
          params: {
            page: currentPage,
            limit: 100,
            search: searchQuery,
          },
          signal,
        });

        setPersons(res.data.data);
        setTotalPages(res.data.totalPages);
        setTotalStudents(res.data.total);
      } catch (err) {
        if (axios.isCancel(err) || err.name === "CanceledError") {
          return;
        }
        console.error(err);
      } finally {
        if (!signal?.aborted) {
          setListLoading(false);
        }
      }
    },
    [currentPage, searchQuery],
  );

  const [totalPages, setTotalPages] = useState(1);
  const [totalStudents, setTotalStudents] = useState(0);

  const handleOpen = (person) => {
    setSelectedPerson(person);
    setEmail(person.emailAddress || "");
    setGeneratedPassword("");
    setStatus(person.account_status === 0 ? 0 : 1);
    setPhotoFile(null);
    setPhotoPreview(
      person.profile_img ? `${API_BASE_URL}/uploads/Student1by1/${person.profile_img}` : "",
    );
    setOpen(true);
  };

  const updateSelectedPersonField = (field, value) => {
    setSelectedPerson((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSaveStudentAccount = async ({ silent = false } = {}) => {
    try {
      if (!selectedPerson?.person_id) {
        setSnackbar({ open: true, message: "Please select a student first", severity: "warning" });
        return false;
      }

      const trimmedEmail = email.trim();
      if (!trimmedEmail) {
        setSnackbar({ open: true, message: "Email address is required", severity: "warning" });
        return false;
      }

      setLoading(true);

      const formData = new FormData();
      formData.append("first_name", selectedPerson.first_name || "");
      formData.append("middle_name", selectedPerson.middle_name || "");
      formData.append("last_name", selectedPerson.last_name || "");
      formData.append("email", trimmedEmail);
      formData.append("status", status);
      if (generatedPassword) formData.append("password", generatedPassword);
      if (photoFile) formData.append("student_photo", photoFile);

      const res = await axios.put(
        `${API_BASE_URL}/api/student_account/${selectedPerson.person_id}`,
        formData,
        {
          headers: {
            ...getAuditHeaders(),
            "Content-Type": "multipart/form-data",
          },
        },
      );

      if (!res.data.success) {
        setSnackbar({
          open: true,
          message: res.data.message || "Failed to save student account",
          severity: "error",
        });
        return false;
      }

      const nextProfileImg = res.data.profile_img;

      setSelectedPerson((prev) => ({
        ...prev,
        emailAddress: trimmedEmail,
        account_status: status,
        profile_img: nextProfileImg,
      }));

      if (nextProfileImg) {
        setPhotoPreview(`${API_BASE_URL}/uploads/Student1by1/${nextProfileImg}`);
        setPhotoFile(null);
      }

      setPersons((prev) =>
        prev.map((person) =>
          person.person_id === selectedPerson.person_id
            ? {
              ...person,
              emailAddress: trimmedEmail,
              account_status: status,
              profile_img: nextProfileImg || person.profile_img,
            }
            : person,
        ),
      );

      if (!silent) {
        setSnackbar({
          open: true,
          message: res.data.message || "Student account saved successfully",
          severity: "success",
        });
      }

      return true;
    } catch (error) {
      console.error("Save student account error:", error);
      setSnackbar({
        open: true,
        message: error.response?.data?.message || "Failed to save student account",
        severity: "error",
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const printAccountSlip = (student, password, email) => {
    const branchAddress = branchAddressMap[student?.campus];
    const resolvedCampusAddress =
      branchAddress || campusAddress || "No address set in Settings";

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
        <title>Student Account Slip</title>
        <style>
          @page {
            size: A5 portrait;
            margin: 8mm;
          }

          body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 0;
          }

          .print-container {
            padding: 10px;
          }

          .print-header {
            text-align: center;
            margin-bottom: 15px;
          }

          .header-top {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 12px;
          }

          .header-top img {
            width: 65px;
            height: 65px;
            border-radius: 50%;
            object-fit: cover;
          }

          .header-text {
            text-align: center;
          }

          .school-name {
            font-size: 15px;
            font-weight: bold;
            letter-spacing: 1px;
          }

          .title {
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
            text-align: left;
          }

          th {
            background-color: lightgray;
            color: black;
            width: 35%;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
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
            font-size: 12px;
            text-align: center;
          }
        </style>
      </head>

      <body onload="window.print(); setTimeout(() => window.close(), 100);">
        <div class="print-container">

          <!-- HEADER -->
          <div class="print-header">
            <div class="header-top">
              <img src="${logoSrc}" alt="School Logo" />

              <div class="header-text">
                <div style="font-size: 11px;">
                  Republic of the Philippines
                </div>

                <div class="school-name">
                  ${firstLine}
                </div>

                ${secondLine
        ? `<div class="school-name">${secondLine}</div>`
        : ""
      }

                <div style="font-size: 11px;">
                  ${resolvedCampusAddress}
                </div>
              </div>
            </div>

            <div class="title">
              Student Portal Account Slip
            </div>
          </div>

          <!-- TABLE -->
          <table>
            <tr>
              <th>Student Number</th>
              <td>${student.student_number || ""}</td>
            </tr>

            <tr>
              <th>Last Name</th>
              <td>${student.last_name || ""}</td>
            </tr>

            <tr>
              <th>First Name</th>
              <td>${student.first_name || ""}</td>
            </tr>

            <tr>
              <th>Middle Name</th>
              <td>${student.middle_name || ""}</td>
            </tr>

            <tr>
              <th>Email Address</th>
              <td>${email}</td>
            </tr>

            <tr>
              <th>Username</th>
              <td>${email} / ${student.student_number}</td>
            </tr>
          </table>

          <!-- PASSWORD -->
          <div class="password-box">
            <div style="font-size:14px; margin-bottom:8px;">
              Generated Password
            </div>

            <div class="password">
              ${password}
            </div>
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

  const printNoEmailList = () => {
  useAccountAuditMac();
    const noEmailStudents = persons.filter((p) => !p.emailAddress);

    if (noEmailStudents.length === 0) {
      setSnackbar({
        open: true,
        message: "All students have email addresses!",
        severity: "info",
      });
      return;
    }

    const logoSrc = fetchedLogo;
    const name = companyName?.trim() || "";
    const words = name.split(" ");
    const middleIndex = Math.ceil(words.length / 2);
    const firstLine = words.slice(0, middleIndex).join(" ");
    const secondLine = words.slice(middleIndex).join(" ");

    const rows = noEmailStudents
      .map(
        (s, i) => `
        <tr>
            <td>${i + 1}</td>
            <td>${branchMap[s.campus] || ""}</td>
            <td>${s.student_number || ""}</td>
            <td>${s.last_name || ""}, ${s.first_name || ""} ${s.middle_name || ""}</td>
            <td>${s.dprtmnt_name || ""}</td>
            <td>${s.program_code || ""} - ${s.program_description || ""}</td>
        </tr>
    `,
      )
      .join("");

    const printWindow = window.open("", "_blank");
    printWindow.document.write(`
        <html>
        <head>
            <title>Students Without Email</title>
            <style>
                @page { size: A4 landscape; margin: 10mm; }
                body { font-family: Arial, sans-serif; margin: 0; padding: 0; }
                .header { text-align: center; margin-bottom: 15px; }
                .header-top { display: flex; align-items: center; justify-content: center; gap: 12px; }
                .header-top img { width: 60px; height: 60px; border-radius: 50%; object-fit: cover; }
                .school-name { font-size: 14px; font-weight: bold; letter-spacing: 1px; }
                .report-title { font-size: 16px; font-weight: bold; margin-top: 10px; }
                .meta { font-size: 11px; color: #555; margin-top: 4px; }
                table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 11px; }
                th { background-color: #1976d2; color: white; padding: 7px 8px; border: 1px solid #ccc; text-align: left; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                td { padding: 6px 8px; border: 1px solid #ccc; }
                tr:nth-child(even) { background-color: #f2f2f2; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                .footer { margin-top: 20px; font-size: 11px; text-align: right; color: #555; }
                .badge { display: inline-block; background: #d32f2f; color: white; padding: 2px 10px; border-radius: 12px; font-size: 12px; font-weight: bold; margin-top: 6px; }
            </style>
        </head>
        <body onload="window.print(); setTimeout(() => window.close(), 100);">
            <div class="header">
                <div class="header-top">
                    <img src="${logoSrc}" alt="Logo" />
                    <div>
                        <div style="font-size:11px;">Republic of the Philippines</div>
                        <div class="school-name">${firstLine}</div>
                        ${secondLine ? `<div class="school-name">${secondLine}</div>` : ""}
                        <div style="font-size:11px;">${campusAddress || ""}</div>
                    </div>
                </div>
                <div class="report-title">Students Without Email Address</div>
                <div class="badge">${noEmailStudents.length} Student${noEmailStudents.length > 1 ? "s" : ""} Found</div>
                <div class="meta">Generated: ${new Date().toLocaleString()}</div>
            </div>

            <table>
                <thead>
                    <tr>
                        <th>#</th>
                        <th>Campus</th>
                        <th>Student Number</th>
                        <th>Full Name</th>
                        <th>Department</th>
                        <th>Program</th>
                    </tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>

            <div class="footer">
                Total: ${noEmailStudents.length} student(s) without email &nbsp;|&nbsp; Page printed on ${new Date().toLocaleDateString()}
            </div>
        </body>
        </html>
    `);
    printWindow.document.close();
  };

  const handleNotify = async () => {
    try {
      if (!generatedPassword) {
        setSnackbar({
          open: true,
          message: "Please generate password first",
          severity: "warning",
        });
        return;
      }

      // Save the generated password before sending the login credentials.
      const saved = await handleSaveStudentAccount({ silent: true });
      if (!saved) return;

      setLoading(true);

      const res = await axios.post(
        `${API_BASE_URL}/api/send_student_password_reminder`,
        {
          person_id: selectedPerson.person_id,
          email: email.trim(),
          password: generatedPassword,
          audit_actor_id: getAuditHeaders()["x-audit-actor-id"],
          audit_actor_role: getAuditHeaders()["x-audit-actor-role"],
        },
      );

      if (!res.data.success) {
        setSnackbar({
          open: true,
          message: res.data.message || "Failed to send email",
          severity: "error",
        });
        return;
      }

      setSnackbar({
        open: true,
        message: "Email sent successfully!",
        severity: "success",
      });

      printAccountSlip(selectedPerson, generatedPassword, email.trim());
    } catch (error) {
      console.error(error);

      setSnackbar({
        open: true,
        message: error.response?.data?.message || "Failed to send email",
        severity: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!hasAccess) return undefined;

    const controller = new AbortController();
    const timeout = setTimeout(() => {
      fetchPersons(controller.signal);
    }, 500);

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [fetchPersons, hasAccess]);

  const startIndex = (currentPage - 1) * rowsPerPage;

  const currentData = useMemo(() => persons || [], [persons]);
  const studentSuggestions = useMemo(
    () =>
      searchQuery.trim().length >= 2
        ? currentData
          .filter((student) =>
            getStudentSuggestionText(student).includes(searchQuery.trim().toLowerCase()),
          )
          .slice(0, 8)
        : [],
    [currentData, searchQuery],
  );
  const pageOptions = useMemo(
    () => Array.from({ length: totalPages }, (_, i) => i + 1),
    [totalPages],
  );

  const paginationButtonStyle = {
    minWidth: 70,
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
  };

  const paginationSelectStyle = {
    fontSize: "12px",
    height: 36,
    color: "white",
    border: "1px solid white",
    backgroundColor: "transparent",
    ".MuiOutlinedInput-notchedOutline": { borderColor: "white" },
    "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "white" },
    "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: "white" },
    "& svg": { color: "white" },
  };

  // Put this at the very bottom before the return
  if (hasAccess === null) {
    return <LoadingOverlay open={true} message="Loading..." />;
  }

  if (!hasAccess) {
    return <Unauthorized />;
  }

  // // 🔒 Disable right-click
  // document.addEventListener("contextmenu", (e) => e.preventDefault());

  // // 🔒 Block DevTools shortcuts + Ctrl+P silently
  // document.addEventListener("keydown", (e) => {
  //   const isBlockedKey =
  //     e.key === "F12" ||
  //     e.key === "F11" ||
  //     (e.ctrlKey &&
  //       e.shiftKey &&
  //       (e.key.toLowerCase() === "i" || e.key.toLowerCase() === "j")) ||
  //     (e.ctrlKey && e.key.toLowerCase() === "u") ||
  //     (e.ctrlKey && e.key.toLowerCase() === "p");

  //   if (isBlockedKey) {
  //     e.preventDefault();
  //     e.stopPropagation();
  //   }
  // });

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
      <LoadingOverlay open={loading} message="Loading..." />

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
          STUDENT ACCOUNTS
        </Typography>

        <Box sx={{ position: "relative", width: 450 }}>
          <TextField
            variant="outlined"
            placeholder="Search Student Number / Name / Program / Department"
            size="small"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1); // reset to first page when searching
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
              {studentSuggestions.length > 0 ? (
                studentSuggestions.map((student) => {
                  const studentNumber = cleanSuggestionValue(student?.student_number);
                  const name = [student?.last_name, student?.first_name, student?.middle_name]
                    .map(cleanSuggestionValue)
                    .filter(Boolean)
                    .join(", ");
                  const program = cleanSuggestionValue(student?.program_code || student?.program_description);

                  return (
                    <Box key={`${studentNumber}-${student?.emailAddress}`} onMouseDown={(e) => { e.preventDefault(); setSearchQuery(getStudentSuggestionValue(student)); setCurrentPage(1); setSuggestionsOpen(false); }} sx={{ px: 2, py: 1, cursor: "pointer", display: "flex", alignItems: "center", gap: 1, fontSize: 14, borderBottom: "1px solid #f0f0f0", "&:hover": { backgroundColor: "#f5f7fb" } }}>
                      <Typography component="span" sx={{ fontWeight: 700, minWidth: 110 }}>{studentNumber || "No number"}</Typography>
                      <Typography component="span" sx={{ color: "#444", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{[name, program].filter(Boolean).join(" - ") || student?.emailAddress}</Typography>
                    </Box>
                  );
                })
              ) : (
                <Box sx={{ px: 2, py: 1, color: "#777", fontSize: 14 }}>No matching students</Box>
              )}
            </Box>
          )}
        </Box>
      </Box>

      <hr style={{ border: "1px solid #ccc", width: "100%" }} />
      <br />
      <br />

      <Button
        variant="contained"
        startIcon={<PrintIcon />}
        onClick={printNoEmailList}
        sx={{
          backgroundColor: "#d32f2f",
          color: "white",
          borderRadius: 2,
          fontWeight: 700,
          "&:hover": { backgroundColor: "#b71c1c" },
        }}
      >
        Print No Email List
      </Button>

      <br />
      <br />

      {/* TOP PAGINATION + TOTAL */}
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell
                colSpan={4}
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
                  flexWrap="wrap"
                  gap={1}
                >
                  {/* TOTAL STUDENTS */}
                  <Typography fontSize="14px" fontWeight="bold" color="white">
                    Total Student's Records: {totalStudents}
                  </Typography>

                  {/* PAGINATION */}
                  <Box
                    display="flex"
                    alignItems="center"
                    gap={1}
                    flexWrap="wrap"
                  >
                    <Button
                      onClick={() => setCurrentPage(1)}
                      disabled={currentPage === 1}
                      variant="outlined"
                      size="small"
                      sx={paginationButtonStyle}
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
                      sx={paginationButtonStyle}
                    >
                      Prev
                    </Button>

                    <FormControl size="small" sx={{ minWidth: 80 }}>
                      <Select
                        value={currentPage}
                        onChange={(e) => setCurrentPage(Number(e.target.value))}
                        sx={paginationSelectStyle}
                        MenuProps={{
                          PaperProps: {
                            sx: {
                              maxHeight: 200,
                            },
                          },
                        }}
                      >
                        {pageOptions.map((page) => (
                          <MenuItem key={page} value={page}>
                            Page {page}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>

                    <Typography fontSize="11px" color="white">
                      of {totalPages} page
                      {totalPages > 1 ? "s" : ""}
                    </Typography>

                    <Button
                      onClick={() =>
                        setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                      }
                      disabled={currentPage === totalPages}
                      variant="outlined"
                      size="small"
                      sx={paginationButtonStyle}
                    >
                      Next
                    </Button>

                    <Button
                      onClick={() => setCurrentPage(totalPages)}
                      disabled={currentPage === totalPages}
                      variant="outlined"
                      size="small"
                      sx={paginationButtonStyle}
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

      {/* TABLE */}
      <Box
        sx={{
          overflowY: "auto",
        }}
      >
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow>
              <TableCell
                sx={{
                  border: `1px solid ${borderColor}`,
                  backgroundColor: "#f5f5f5",
                }}
              >
                #
              </TableCell>
              <TableCell sx={{ border: `1px solid ${borderColor}`, backgroundColor: "#f5f5f5" }}>
                Image
              </TableCell>
              <TableCell
                sx={{
                  border: `1px solid ${borderColor}`,
                  backgroundColor: "#f5f5f5",
                }}
              >
                Campus
              </TableCell>
              <TableCell
                sx={{
                  border: `1px solid ${borderColor}`,
                  backgroundColor: "#f5f5f5",
                }}
              >
                Student Number
              </TableCell>

              <TableCell
                sx={{
                  border: `1px solid ${borderColor}`,
                  backgroundColor: "#f5f5f5",
                }}
              >
                Name
              </TableCell>

              <TableCell
                sx={{
                  border: `1px solid ${borderColor}`,
                  backgroundColor: "#f5f5f5",
                }}
              >
                Department
              </TableCell>

              <TableCell
                sx={{
                  border: `1px solid ${borderColor}`,
                  backgroundColor: "#f5f5f5",
                }}
              >
                Program
              </TableCell>
              <TableCell
                sx={{
                  border: `1px solid ${borderColor}`,
                  backgroundColor: "#f5f5f5",
                }}
              >
                Email Address
              </TableCell>
              <TableCell sx={{ border: `1px solid ${borderColor}`, backgroundColor: "#f5f5f5" }}>
                Status
              </TableCell>
              <TableCell
                sx={{
                  border: `1px solid ${borderColor}`,
                  backgroundColor: "#f5f5f5",
                }}
              >
                Actions
              </TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {listLoading ? (
              <TableRow>
                <TableCell
                  colSpan={8}
                  sx={{
                    border: `1px solid ${borderColor}`,
                    textAlign: "center",
                    py: 4,
                  }}
                >
                  Loading students...
                </TableCell>
              </TableRow>
            ) : currentData.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={8}
                  sx={{
                    border: `1px solid ${borderColor}`,
                    textAlign: "center",
                    py: 4,
                  }}
                >
                  No students found.
                </TableCell>
              </TableRow>
            ) : (
              currentData.map((row, index) => (
                <TableRow
                  key={row.person_id}
                  sx={{
                    backgroundColor: index % 2 === 0 ? "#ffffff" : "lightgray", // white / light gray
                  }}
                >
                  <TableCell
                    sx={{
                      border: `1px solid ${borderColor}`,
                    }}
                  >
                    {startIndex + index + 1}
                  </TableCell>
                  <TableCell
                    sx={{
                      border: `1px solid ${borderColor}`,
                      textAlign: "center",
                    }}
                  >
                    <Avatar
                      src={
                        row.profile_img
                          ? `${API_BASE_URL}/uploads/Student1by1/${row.profile_img}`
                          : undefined
                      }
                      alt={row.first_name}
                      sx={{
                        width: 60,
                        height: 60,
                        margin: "auto",
                        border: `1px solid ${borderColor}`,
                        bgcolor: row.profile_img ? "transparent" : "#6D2323",
                      }}
                    >
                      {row.first_name?.[0] || "?"}
                    </Avatar>
                  </TableCell>


                  <TableCell
                    sx={{
                      border: `1px solid ${borderColor}`,
                    }}
                  >
                    {branchMap[row.campus] || ""}
                  </TableCell>

                  <TableCell
                    sx={{
                      border: `1px solid ${borderColor}`,
                    }}
                  >
                    <Typography
                      sx={{
                        color: "blue",
                        cursor: "pointer",
                        textDecoration: "underline",
                      }}
                      onClick={() => handleOpen(row)}
                    >
                      {row.student_number}
                    </Typography>
                  </TableCell>

                  <TableCell
                    sx={{
                      border: `1px solid ${borderColor}`,
                    }}
                  >
                    {row.last_name},{row.first_name}
                    {row.middle_name}
                  </TableCell>

                  <TableCell
                    sx={{
                      border: `1px solid ${borderColor}`,
                    }}
                  >
                    {row.dprtmnt_name}
                  </TableCell>

                  <TableCell
                    sx={{
                      border: `1px solid ${borderColor}`,
                    }}
                  >
                    {row.program_code} - {row.program_description} ({row.major})
                  </TableCell>

                  <TableCell
                    sx={{
                      border: `1px solid ${borderColor}`,
                    }}
                  >
                    {row.emailAddress ? (
                      <Typography color="green">{row.emailAddress}</Typography>
                    ) : (
                      <Typography color="red">No Email</Typography>
                    )}
                  </TableCell>
                  <TableCell sx={{ border: `1px solid ${borderColor}`, textAlign: "center" }}>
                    {Number(row.account_status) === 1 ? "Active" : row.account_status === undefined ? "No Account" : "Inactive"}
                  </TableCell>
                  <TableCell
                    sx={{
                      border: `1px solid ${borderColor}`,
                    }}
                  >
                    <Button
                      variant="contained"
                      size="small"
                      onClick={() => handleOpen(row)}
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
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Box>

      {/* BOTTOM PAGINATION (same as top) */}

      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell
                colSpan={4}
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
                  flexWrap="wrap"
                  gap={1}
                >
                  <Typography fontSize="14px" fontWeight="bold" color="white">
                    Total Student's Records {totalStudents}
                  </Typography>

                  <Box
                    display="flex"
                    alignItems="center"
                    gap={1}
                    flexWrap="wrap"
                  >
                    <Button
                      onClick={() => setCurrentPage(1)}
                      disabled={currentPage === 1}
                      variant="outlined"
                      size="small"
                      sx={paginationButtonStyle}
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
                      sx={paginationButtonStyle}
                    >
                      Prev
                    </Button>

                    <FormControl size="small" sx={{ minWidth: 80 }}>
                      <Select
                        value={currentPage}
                        onChange={(e) => setCurrentPage(Number(e.target.value))}
                        sx={paginationSelectStyle}
                      >
                        {pageOptions.map((page) => (
                          <MenuItem key={page} value={page}>
                            Page {page}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>

                    <Typography fontSize="11px" color="white">
                      of {totalPages} page
                      {totalPages > 1 ? "s" : ""}
                    </Typography>

                    <Button
                      onClick={() =>
                        setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                      }
                      disabled={currentPage === totalPages}
                      variant="outlined"
                      size="small"
                      sx={paginationButtonStyle}
                    >
                      Next
                    </Button>

                    <Button
                      onClick={() => setCurrentPage(totalPages)}
                      disabled={currentPage === totalPages}
                      variant="outlined"
                      size="small"
                      sx={paginationButtonStyle}
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
        open={open}
        onClose={() => setOpen(false)}
        maxWidth="sm"
        fullWidth
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
          }}
        >
          STUDENT ACCOUNT REGISTRATION
        </DialogTitle>

        {/* CONTENT */}
        <DialogContent sx={{ p: 3 }}>

          {/* ✅ Avatar upload — same concept as Faculty */}
          <Box display="flex" flexDirection="column" alignItems="center" mb={3} mt={3}>
            <Box position="relative" component="label" sx={{ cursor: "pointer", display: "inline-flex" }}>
              <Avatar
                src={photoPreview}
                sx={{
                  width: 110,
                  height: 110,
                  border: "1.5px solid black",
                  boxShadow: "0 2px 8px rgba(0,0,0,.15)",
                }}
              >
                {!photoPreview && <ImageIcon sx={{ fontSize: 40, color: "#999" }} />}
              </Avatar>

              <label
                htmlFor="student-avatar-upload"
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
                id="student-avatar-upload"
                type="file"
                name="student_photo"
                accept="image/*"
                onChange={handlePhotoChange}
              />
            </Box>

            <Typography variant="caption" color="text.secondary" mt={1}>
              Click to upload 2x2 profile picture
            </Typography>
          </Box>

          <Typography
            variant="subtitle1"
            fontWeight={700}
            sx={{ mb: 2, mt: 1 }}
          >
            Student Information
          </Typography>

          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                label="Student Number"
                fullWidth
                value={selectedPerson?.student_number || ""}
                InputProps={{ readOnly: true }}
              />
            </Grid>

            <Grid item xs={6}>
              <TextField
                label="Last Name"
                fullWidth
                value={selectedPerson?.last_name || ""}
                onChange={(e) =>
                  updateSelectedPersonField("last_name", e.target.value)
                }
              />
            </Grid>

            <Grid item xs={6}>
              <TextField
                label="First Name"
                fullWidth
                value={selectedPerson?.first_name || ""}
                onChange={(e) =>
                  updateSelectedPersonField("first_name", e.target.value)
                }
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                label="Middle Name"
                fullWidth
                value={selectedPerson?.middle_name || ""}
                onChange={(e) =>
                  updateSelectedPersonField("middle_name", e.target.value)
                }
              />
            </Grid>
          </Grid>

          <Typography
            variant="subtitle1"
            fontWeight={700}
            sx={{ mt: 4, mb: 2 }}
          >
            Account Details
          </Typography>

          <TextField
            label="Email Address"
            fullWidth
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <TextField
            label="Password"
            fullWidth
            sx={{ mt: 2 }}
            value={generatedPassword}
            onChange={(e) => setGeneratedPassword(e.target.value)}
            helperText="Generate a password or type one here before saving."
          />

          {generatedPassword && (
            <Box
              mt={3}
              p={3}
              sx={{
                border: "2px dashed #1976d2",
                borderRadius: 2,
                textAlign: "center",
                backgroundColor: "#f9f9f9",
              }}
            >
              <Typography variant="h6" gutterBottom>
                Generated Password
              </Typography>

              <Typography
                variant="h4"
                sx={{
                  fontWeight: "bold",
                  letterSpacing: 2,
                  color: "#d32f2f",
                }}
              >
                {generatedPassword}
              </Typography>

              <Typography variant="body2" mt={1}>
                Please print or save this password.
              </Typography>
            </Box>
          )}

          {/* ✅ Status now lives inside the modal — same concept as Faculty */}
          {selectedPerson && (
            <FormControl fullWidth margin="dense" sx={{ mt: 3 }}>
              <InputLabel>Status</InputLabel>
              <Select
                value={status}
                onChange={(e) => setStatus(Number(e.target.value))}
                label="Status"
              >
                <MenuItem value={1}>Active</MenuItem>
                <MenuItem value={0}>Inactive</MenuItem>
              </Select>
            </FormControl>
          )}

        </DialogContent>

        {/* ACTIONS */}
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
          {/* CANCEL */}
          <Button
            onClick={() => setOpen(false)}
            color="error"
            variant="outlined"
          >
            Cancel
          </Button>

          {/* RIGHT SIDE - SINGLE LINE */}
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
              startIcon={<VpnKeyIcon />}
              onClick={() => {
                const pwd = generatePassword(10);
                setGeneratedPassword(pwd);
              }}
              sx={{ fontWeight: 600 }}
            >
              Generate
            </Button>

            <Button
              variant="outlined"
              size="small"
              startIcon={<PrintIcon />}
              disabled={!generatedPassword}
              onClick={() =>
                printAccountSlip(selectedPerson, generatedPassword, email)
              }
              sx={{ fontWeight: 600 }}
            >
              Print
            </Button>

            <Button
              variant="contained"
              size="small"
              startIcon={<SaveIcon />}
              disabled={!email}
              onClick={() => handleSaveStudentAccount()}
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
              disabled={!generatedPassword || !email}
              onClick={handleNotify}
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

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          severity={snackbar.severity}
          variant="filled"
          onClose={() => setSnackbar({ ...snackbar, open: false })}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
