import React, { useState, useEffect, useContext, useRef } from "react";
import { SettingsContext } from "../App";
import EaristLogo from "../assets/EaristLogo.png";
import {
  Box,
  Paper,
  Typography,
  FormControl,
  Select,
  MenuItem,
  TextField,
  Button,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TableContainer,
  Dialog,
  DialogContent,
  DialogTitle,
  Grid,
  Card,
  CardContent,
  Chip,
  LinearProgress,
} from "@mui/material";
import axios from "axios";
import html2canvas from "html2canvas";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { jsPDF } from "jspdf";
import API_BASE_URL from "../apiConfig";
import LoadingOverlay from "../components/LoadingOverlay";
import CertificateOfRegistration from "../components/CertificateOfRegistration";
import { getFlatAuditHeaders } from "../utils/auditEvents";
import useAuditMac from "../utils/useAuditMac";
import { filterSchoolYearsFromActive } from "../utils/schoolYearOptions";

const CORExportingModule = () => {
  useAuditMac();
  const [yearId, setYearId] = useState("");
  const [semesterId, setSemesterId] = useState("");
  const [programs, setPrograms] = useState([]);
  const [selectedProgram, setSelectedProgram] = useState("");
  const [department, setDepartment] = useState([]);
  const [selectedDepartmentFilter, setSelectedDepartmentFilter] = useState("");
  const [schoolYears, setSchoolYears] = useState([]);
  const [semesters, setSchoolSemester] = useState([]);
  const [yearLevels, setYearLevels] = useState([]);
  const [selectedYearLevel, setSelectedYearLevel] = useState("");
  const [filteredData, setFilteredData] = useState([]);
  const [visibleData, setVisibleData] = useState([]);
  const [arrayOfStudentNumber, setArrayOfStudentNumber] = useState([]);
  const [batchByStudentNumber, setBatchByStudentNumber] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 1;
  const [exporting, setExporting] = useState(false);
  const [readyByStudentNumber, setReadyByStudentNumber] = useState({});
  const readyRef = useRef({});
  const [exportList, setExportList] = useState([]);
  const [exportTotal, setExportTotal] = useState(0);
  const [exportCurrent, setExportCurrent] = useState(0);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportStatus, setExportStatus] = useState("");

  const [campusFilter, setCampusFilter] = useState("");
  const [branches, setBranches] = useState([]);
  const [paymentType, setPaymentType] = useState(1);
  const [viewClicked, setViewClicked] = useState(false);

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

  // 🔹 Authentication and access states
  const [userID, setUserID] = useState("");
  const [user, setUser] = useState("");
  const [userRole, setUserRole] = useState("");
  const [employeeID, setEmployeeID] = useState("");
  const [hasAccess, setHasAccess] = useState(null);

  const [loading, setLoading] = useState(false);

  const pageId = 117;

  const getAuditHeaders = () => ({
    ...getFlatAuditHeaders(),
    "x-audit-actor-id":
      employeeID ||
      localStorage.getItem("employee_id") ||
      localStorage.getItem("email") ||
      "unknown",
    "x-audit-actor-role": userRole || localStorage.getItem("role") || "registrar",
  });

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
    const normalizedBranches = settings?.branches || [];
    setBranches(normalizedBranches);
    setCampusFilter((prev) => prev || normalizedBranches?.[0]?.id || "");
  }, [settings]);

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

  useEffect(() => {
    axios
      .get(`${API_BASE_URL}/api/get_student_number`)
      .then((res) => {
        setArrayOfStudentNumber(res.data);
        console.log("Fetched student data:", res.data);
      })
      .catch((err) => console.error(err));
  }, []);

  useEffect(() => {
    fetchDepartments();
  }, []);

  useEffect(() => {
    if (department.length > 0 && !selectedDepartmentFilter) {
      const firstDeptId = department[0].dprtmnt_id;
      setSelectedDepartmentFilter(firstDeptId);
      fetchPrograms(firstDeptId);
    }
  }, [department, selectedDepartmentFilter]);

  useEffect(() => {
    if (programs.length > 0 && !selectedProgram) {
      setSelectedProgram(programs[0].program_id);
    }
  }, [programs, selectedProgram]);

  useEffect(() => {
    Promise.all([
      axios.get(`${API_BASE_URL}/api/get_school_year/`),
      axios.get(`${API_BASE_URL}/api/active_school_year`),
    ])
      .then(([yearsRes, activeRes]) => {
        const active =
          Array.isArray(activeRes.data) && activeRes.data.length > 0
            ? activeRes.data[0]
            : null;
        setSchoolYears(filterSchoolYearsFromActive(yearsRes.data || [], active));
        if (active) {
          setYearId(active.year_id);
          setSemesterId(active.semester_id);
        }
      })
      .catch((err) => console.error(err));
  }, []);

  useEffect(() => {
    axios
      .get(`${API_BASE_URL}/api/get_school_semester/`)
      .then((res) => setSchoolSemester(res.data))
      .catch((err) => console.error(err));
  }, []);

  useEffect(() => {
    axios
      .get(`${API_BASE_URL}/api/get_year_level`)
      .then((res) => setYearLevels(res.data))
      .catch((err) => console.error(err));
  }, []);

  useEffect(() => {
    if (!arrayOfStudentNumber) return;

    let filtered = [...arrayOfStudentNumber];

    if (campusFilter !== "") {
      filtered = filtered.filter((d) => d.campus == campusFilter);
    }
    filtered = filtered.filter((d) => d.year_id == yearId);
    filtered = filtered.filter((d) => d.semester_id == semesterId);
    filtered = filtered.filter((d) => d.year_level_id == selectedYearLevel);
    if (selectedProgram) {
      filtered = filtered.filter((d) => d.curriculum_id == selectedProgram);
    }
    setFilteredData(filtered);
  }, [
    arrayOfStudentNumber,
    campusFilter,
    yearId,
    semesterId,
    selectedYearLevel,
    selectedProgram,
  ]);

  useEffect(() => {
    if (yearLevels.length > 0 && !selectedYearLevel) {
      const firstYearLevelId = yearLevels[0].year_level_id;
      setSelectedYearLevel(firstYearLevelId);
    }
  }, [yearLevels, selectedYearLevel]);

  useEffect(() => {
    setViewClicked(false);
    setVisibleData([]);
    setBatchByStudentNumber({});
    setCurrentPage(1);
  }, [campusFilter, yearId, semesterId, selectedYearLevel, selectedProgram, paymentType]);

  const fetchDepartments = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/get_department`);
      setDepartment(res.data);
      console.log(res.data);
    } catch (err) {
      console.error("Fetch error:", err);
    }
  };

  const fetchPrograms = async (dprtmnt_id) => {
    if (!dprtmnt_id) return;
    try {
      const res = await axios.get(
        `${API_BASE_URL}/api/applied_program/${dprtmnt_id}`,
      );
      setPrograms(res.data);
    } catch (err) {
      console.error("❌ Department fetch error:", err);
      setErrorMessage("Failed to load department list");
    }
  };

  const handleCollegeChange = (e) => {
    const selectedId = e.target.value;

    setSelectedDepartmentFilter(selectedId);
    setSelectedProgram("");
    setPrograms([]);
    fetchPrograms(selectedId);
  };

  const loadBatchStudentTagging = async (students) => {
    const studentNumbers = students.map(
      (student) => student.student_number,
    );
    const activeSchoolYearId = students[0]?.active_school_year_id || "";

    if (studentNumbers.length === 0) {
      setBatchByStudentNumber({});
      return {};
    }

    console.log("studentNumbers sent:", studentNumbers);

    const res = await axios.post(
      `${API_BASE_URL}/api/student-tagging-batch`,
      { studentNumbers, selectedYearLevel, activeSchoolYearId },
      { headers: { "Content-Type": "application/json" } },
    );

    const studentsWithPreload = res.data?.students || [];
    const byNumber = studentsWithPreload.reduce((acc, student) => {
      acc[student.student_number] = student;
      return acc;
    }, {});

    setBatchByStudentNumber(byNumber);
    return byNumber;
  };

  const handleViewRecord = async () => {
    if (filteredData.length === 0) {
      setBatchByStudentNumber({});
      setVisibleData([]);
      setViewClicked(true);
      return;
    }

    try {
      console.log("filteredData length:", filteredData.length);
      const byNumber = await loadBatchStudentTagging(filteredData);
      setBatchByStudentNumber(byNumber);
      setVisibleData(filteredData);
      setViewClicked(true);
      setCurrentPage(1);
    } catch (err) {
      console.error("Batch student tagging failed:", err);
      setBatchByStudentNumber({});
      setVisibleData(filteredData);
      setViewClicked(true);
      setCurrentPage(1);
    }
  };

  const totalPages = Math.max(1, Math.ceil(visibleData.length / pageSize));
  const clampedPage = Math.min(currentPage, totalPages);
  const startIndex = (clampedPage - 1) * pageSize;
  const pagedData = visibleData.slice(startIndex, startIndex + pageSize);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const handleCorReady = (studentNumber) => {
    if (!studentNumber) return;
    setReadyByStudentNumber((prev) => ({
      ...prev,
      [studentNumber]: true,
    }));
    readyRef.current[studentNumber] = true;
  };

  const waitForReady = (studentNumber, timeoutMs = 45000, prefix = "cor") =>
    new Promise((resolve) => {
      const start = Date.now();
      const check = () => {
        const elementExists = document.getElementById(
          `${prefix}-${studentNumber}`,
        );
        if (readyRef.current[studentNumber] && elementExists) {
          resolve(true);
          return;
        }
        if (Date.now() - start >= timeoutMs) {
          console.warn(`Timeout waiting for ready signal: ${studentNumber}`);
          resolve(false);
          return;
        }
        setTimeout(check, 150);
      };
      check();
    });

  const ensureCaptureStyles = (el) => {
    if (!el) return {};
    const orig = {
      backgroundColor: el.style.backgroundColor,
      width: el.style.width,
      minHeight: el.style.minHeight,
      height: el.style.height,
      visibility: el.style.visibility,
      display: el.style.display,
      position: el.style.position,
      left: el.style.left,
      top: el.style.top,
      zIndex: el.style.zIndex,
      opacity: el.style.opacity,
      transform: el.style.transform,
      boxSizing: el.style.boxSizing,
      margin: el.style.margin,
      padding: el.style.padding,
      overflow: el.style.overflow,
    };
    el.style.backgroundColor = "#ffffff";
    el.style.width = "calc((210mm + 6.5rem) * 44 / 42 + 3rem)"; // Match COR content width
    el.style.minHeight = "297mm"; // A4 height
    el.style.height = "auto";
    el.style.visibility = "visible";
    el.style.display = "block";
    el.style.position = "fixed";
    el.style.left = "-9999px";
    el.style.top = "0";
    el.style.zIndex = "10000";
    el.style.opacity = "1";
    el.style.transform = "none";
    el.style.boxSizing = "border-box";
    el.style.margin = "0";
    el.style.padding = "0";
    el.style.overflow = "visible";
    return orig;
  };

  const restoreCaptureStyles = (el, orig) => {
    if (!el || !orig) return;
    el.style.backgroundColor = orig.backgroundColor || "";
    el.style.width = orig.width || "";
    el.style.minHeight = orig.minHeight || "";
    el.style.height = orig.height || "";
    el.style.visibility = orig.visibility || "";
    el.style.display = orig.display || "";
    el.style.position = orig.position || "";
    el.style.left = orig.left || "";
    el.style.top = orig.top || "";
    el.style.zIndex = orig.zIndex || "";
    el.style.opacity = orig.opacity || "";
    el.style.transform = orig.transform || "";
    el.style.boxSizing = orig.boxSizing || "";
    el.style.margin = orig.margin || "";
    el.style.padding = orig.padding || "";
    el.style.overflow = orig.overflow || "";
  };

  const downloadBlob = (blob, fileName) => {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  };

  const runServerCorExport = async (listToExport) => {
    const selectedDept =
      department.find((d) => d.dprtmnt_id == selectedDepartmentFilter) || {};
    const deptCode =
      selectedDept.dprtmnt_code || selectedDept.dprtmnt_name || "dept";
    const yearLevel =
      yearLevels.find((y) => y.year_level_id == selectedYearLevel) || {};
    const yearLevelDesc =
      yearLevel.year_level_description || yearLevel.year_level_id || "year";
    const zipFileName = `certificate_of_registration(${deptCode}, ${yearLevelDesc})`;

    setExportStatus("Loading COR data for server export...");
    setExportProgress(0);
    const preloadedByNumber = await loadBatchStudentTagging(listToExport);

    setExportStatus("Starting server export...");

    const startRes = await axios.post(
      `${API_BASE_URL}/api/cor-export/jobs`,
      {
        students: listToExport.map((student) => ({
          student_number: student.student_number,
          person_id: student.person_id,
          preload:
            preloadedByNumber?.[student.student_number] ||
            batchByStudentNumber?.[student.student_number] ||
            null,
        })),
        file_name: zipFileName,
        frontend_origin: window.location.origin,
      },
      { headers: getAuditHeaders() },
    );

    const jobId = startRes.data?.job_id;
    if (!jobId) throw new Error("Server did not return an export job id.");

    let job = null;
    while (true) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      const statusRes = await axios.get(
        `${API_BASE_URL}/api/cor-export/jobs/${jobId}`,
      );
      job = statusRes.data;
      setExportCurrent(Number(job.current || 0));
      setExportTotal(Number(job.total || listToExport.length));
      setExportProgress(Number(job.progress || 0));
      setExportStatus(job.message || "Processing server export...");

      if (job.status === "done") break;
      if (job.status === "error") {
        throw new Error(job.error || "Server export failed.");
      }
    }

    setExportStatus("Downloading server ZIP...");
    const downloadRes = await axios.get(
      `${API_BASE_URL}/api/cor-export/jobs/${jobId}/download`,
      { responseType: "blob" },
    );
    downloadBlob(downloadRes.data, job?.file_name || `${zipFileName}.zip`);
    setExportProgress(100);
    setExportStatus("Download complete.");

    Promise.resolve().then(async () => {
      const selectedProgramInfo =
        programs.find((p) => p.program_id == selectedProgram) || {};
      try {
        await axios.post(
          `${API_BASE_URL}/api/cor-export/audit`,
          {
            exported_count: Number(job?.total || listToExport.length),
            department_label:
              selectedDept.dprtmnt_code || selectedDept.dprtmnt_name || "",
            program_label:
              selectedProgramInfo.program_code ||
              selectedProgramInfo.program_description ||
              "",
            year_level_label: yearLevelDesc,
          },
          { headers: getAuditHeaders() },
        );
      } catch (auditError) {
        console.error("Failed to insert COR export audit log:", auditError);
      }
    });
  };

  const handleExportPdfAll = async () => {
    if (exporting) return;
    const listToExport = filteredData.length ? filteredData : visibleData;
    if (!listToExport.length) return;

    setExporting(true);
    setExportTotal(listToExport.length);
    setExportCurrent(0);
    setExportProgress(0);
    setExportStatus("Preparing export...");
    const originalPage = currentPage;

    const updateExportProgress = (index, stageRatio, status) => {
      const progress =
        ((index + Math.max(0, Math.min(stageRatio, 1))) / listToExport.length) *
        100;
      setExportProgress(Math.min(99, Math.round(progress)));
      setExportStatus(status);
    };

    try {
      try {
        await runServerCorExport(listToExport);
        setExporting(false);
        setExportTotal(0);
        setExportCurrent(0);
        setExportProgress(0);
        setExportStatus("");
        setExportList([]);
        return;
      } catch (serverExportError) {
        console.error("Server COR export failed; falling back to browser export:", serverExportError);
        setExportStatus("Server export failed. Trying browser export...");
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      setExportStatus("Loading student COR data...");
      await loadBatchStudentTagging(listToExport);

      if (!visibleData.length) {
        setVisibleData(listToExport);
        setViewClicked(true);
        setCurrentPage(1);
        await new Promise((r) => requestAnimationFrame(r));
      }
      // Start with no export DOM to avoid overlap
      setExportList([]);
      await new Promise((r) => requestAnimationFrame(r));

      const selectedDept =
        department.find((d) => d.dprtmnt_id == selectedDepartmentFilter) || {};
      const deptCode =
        selectedDept.dprtmnt_code || selectedDept.dprtmnt_name || "dept";
      const yearLevel =
        yearLevels.find((y) => y.year_level_id == selectedYearLevel) || {};
      const yearLevelDesc =
        yearLevel.year_level_description || yearLevel.year_level_id || "year";
      const zipFileName = `certificate_of_registration(${deptCode}, ${yearLevelDesc}).zip`;

      const zip = new JSZip();

      let filesAdded = 0;
      for (let i = 0; i < listToExport.length; i += 1) {
        const student = listToExport[i];
        const studentNumber = student.student_number;
        const rootId = `export-cor-${studentNumber}`;
        const targetId = `${rootId}-pdf`;

        updateExportProgress(i, 0.05, `Preparing ${studentNumber}...`);
        readyRef.current[studentNumber] = false;
        setReadyByStudentNumber((prev) => ({
          ...prev,
          [studentNumber]: false,
        }));
        setExportList([student]);
        await new Promise((r) => requestAnimationFrame(r));

        updateExportProgress(i, 0.15, `Rendering COR for ${studentNumber}...`);
        const isReady = await waitForReady(studentNumber, 45000, "export-cor");
        if (!isReady) {
          console.warn(`COR not ready for student ${studentNumber}`);
          continue;
        }

        const element =
          document.getElementById(targetId) || document.getElementById(rootId);

        if (!element) {
          console.warn(`COR element not found for student ${studentNumber}`);
          continue;
        }

        // Wait for content to be actually rendered
        const waitForContent = async () => {
          const maxWait = 3000; // 5 seconds max
          const startTime = Date.now();

          while (Date.now() - startTime < maxWait) {
            const inputs = element.querySelectorAll('input[value]');
            const filledInputs = Array.from(inputs).filter(inp => inp.value && inp.value.trim() !== '');

            // Check if we have enough content (at least 10 filled inputs)
            if (filledInputs.length >= 10) {
              console.log(`Content ready for ${studentNumber}: ${filledInputs.length} filled inputs`);
              return true;
            }

            await new Promise((r) => setTimeout(r, 200));
          }

          console.warn(`Timeout waiting for content for ${studentNumber}`);
          return true; // Proceed anyway
        };

        updateExportProgress(i, 0.3, `Checking COR content for ${studentNumber}...`);
        await waitForContent();
        if (!element) {
          console.warn(`COR element not found for student ${studentNumber}`);
          continue;
        }

        const orig = ensureCaptureStyles(element);
        let canvas;
        try {
          updateExportProgress(i, 0.45, `Capturing COR image for ${studentNumber}...`);
          element.offsetHeight;

          const studentInputs = element.querySelectorAll('input[value]');
          const filledCount = Array.from(studentInputs).filter(inp => inp.value && inp.value.trim()).length;
          console.log('Capturing student:', studentNumber, 'Filled inputs:', filledCount);

          const rect = element.getBoundingClientRect();
          const elementWidth = element.scrollWidth || rect.width || 794; // 210mm in px
          const elementHeight = element.scrollHeight || rect.height || 1123; // 297mm in px

          canvas = await html2canvas(element, {
            scale: 1.5,
            useCORS: true,
            allowTaint: true,
            backgroundColor: "#ffffff",
            width: elementWidth,
            height: elementHeight,
            windowWidth: elementWidth,
            windowHeight: elementHeight,
            scrollX: 0,
            scrollY: 0,
            x: 0,
            y: 0,
            imageTimeout: 30000,
            logging: false,
            ignoreElements: () => {
              return false;
            },
            onclone: (clonedDoc) => {
              const root =
                clonedDoc.getElementById(targetId) ||
                clonedDoc.getElementById(rootId);
              if (!root) return;
              // Inject a small reset to remove top margins and normalize line-height
              try {
                const resetStyle = clonedDoc.createElement('style');
                resetStyle.type = 'text/css';
                resetStyle.textContent = `
                  /* Remove default top/bottom margins for common typographic elements */
                  p, h1, h2, h3, h4, h5, h6,
                  blockquote, pre, ul, ol, li, figure, figcaption {
                    margin-top: 0 !important;
                    margin-bottom: 0 !important;
                    padding: 0 !important;
                    line-height: 1.15 !important;
                  }

                  /* Prevent inline elements from shifting baseline during capture */
                  span, a, strong, b, em, i {
                    margin-top: 0 !important;
                    margin-bottom: 0 !important;
                    display: inline-block !important;
                    vertical-align: top !important;
                    line-height: 1.15 !important;
                  }

                  /* Keep tables tight */
                  table { border-collapse: collapse !important; table-layout: fixed !important; }
                  td, th { padding: 0 !important; margin: 0 !important; vertical-align: middle !important; }

                  /* Center-align all row/cell text content */
                  tr, td, th { text-align: center !important; }
                  td *, th * { text-align: center !important; vertical-align: middle !important; margin-top: 0 !important; margin-bottom: 0 !important; }

                  /* Small global safety */
                  * { box-sizing: border-box !important; }
                `;
                clonedDoc.head && clonedDoc.head.appendChild(resetStyle);
              } catch (e) {
                console.warn('Failed to inject reset style into cloned document', e);
              }

              // Match COR content width for PDF export (A4 + Rules gap)
              root.style.width = "calc((210mm + 6.5rem) * 44 / 42 + 3rem)";
              root.style.minHeight = "297mm";
              root.style.height = "auto";
              root.style.boxSizing = "border-box";
              root.style.transform = "none";
              root.style.margin = "0";
              root.style.padding = "0";
              root.style.overflow = "visible";

              // Hide all other CORs in the clone to prevent overlap
              clonedDoc
                .querySelectorAll(
                  '[data-cor-pdf="true"], [data-cor-root="true"]',
                )
                .forEach((el) => {
                  if (el.id !== targetId && el.id !== rootId) {
                    el.style.display = "none";
                  }
                });

              root.style.backgroundColor = "#ffffff";

              // Replace readonly inputs/textarea/select with text spans that won't introduce extra top margin
              root.querySelectorAll('input[readonly], textarea[readonly], select').forEach((input) => {
                const value = input.value || input.getAttribute('value') || '';
                if (!value) return;

                const span = clonedDoc.createElement('span');
                span.textContent = value;

                const computedStyle = window.getComputedStyle(input);

                // Copy essential visual styles but reset margins and line-height for stable layout
                span.style.cssText = input.style && input.style.cssText ? input.style.cssText : '';
                span.style.fontFamily = computedStyle.fontFamily || 'Arial';
                span.style.fontSize = computedStyle.fontSize || '12px';
                span.style.fontWeight = computedStyle.fontWeight || '400';
                span.style.color = '#000000';
                span.style.textAlign = computedStyle.textAlign || 'left';
                span.style.width = computedStyle.width || 'auto';
                span.style.display = 'inline-block';
                span.style.whiteSpace = 'pre-wrap';
                span.style.padding = computedStyle.padding || '0';
                span.style.marginTop = '0';
                span.style.marginBottom = '0';
                span.style.marginLeft = computedStyle.marginLeft || '0';
                span.style.marginRight = computedStyle.marginRight || '0';
                span.style.border = 'none';
                span.style.background = 'none';
                span.style.verticalAlign = computedStyle.verticalAlign || 'top';
                span.style.lineHeight = computedStyle.lineHeight || '1.15';

                input.parentNode.replaceChild(span, input);
              });

              // Ensure all text is visible and black
              root.querySelectorAll("*").forEach((el) => {
                el.style.opacity = "1";
                el.style.visibility = "visible";
                el.style.color = "#000000";
                el.style.setProperty("-webkit-text-fill-color", "#000000", "important");
              });

              // Ensure tables render properly
              root.querySelectorAll("table").forEach((table) => {
                table.style.borderCollapse = "collapse";
                table.style.width = "100%";
                table.style.tableLayout = "fixed";
              });

              // Ensure all table cells are visible
              root.querySelectorAll("td, th").forEach((cell) => {
                cell.style.visibility = "visible";
                cell.style.opacity = "1";
                cell.style.color = "#000000";
              });

              // Force all images to be visible and loaded
              root.querySelectorAll("img").forEach((img) => {
                img.style.visibility = "visible";
                img.style.opacity = "1";
                img.style.display = "block";
              });
            },
          });
        } finally {
          restoreCaptureStyles(element, orig);
        }

        if (!canvas) {
          console.warn(`Canvas not generated for student ${studentNumber}`);
          continue;
        }

        updateExportProgress(i, 0.7, `Creating PDF for ${studentNumber}...`);
        const imgData = canvas.toDataURL("image/jpeg", 0.92);
        const pdfDoc = new jsPDF({
          orientation: "portrait",
          unit: "pt",
          format: "a4",
          compress: true,
        });
        const pageWidth = pdfDoc.internal.pageSize.getWidth();
        const pageHeight = pdfDoc.internal.pageSize.getHeight();

        // Fit A4 with uniform scale (preserve aspect ratio — no stretch).
        const imgWidth = canvas.width;
        const imgHeight = canvas.height;
        let pdfWidth = pageWidth;
        let pdfHeight = (imgHeight / imgWidth) * pdfWidth;
        if (pdfHeight > pageHeight) {
          pdfHeight = pageHeight;
          pdfWidth = (imgWidth / imgHeight) * pdfHeight;
        }
        const imgX = (pageWidth - pdfWidth) / 2;
        const imgY = 0;

        pdfDoc.addImage(imgData, "JPEG", imgX, imgY, pdfWidth, pdfHeight, undefined, "FAST");
        const pdfBlob = pdfDoc.output("blob");

        updateExportProgress(i, 0.9, `Adding ${studentNumber} to ZIP...`);
        zip.file(`${studentNumber}_Certificate_Of_Registration.pdf`, pdfBlob);
        filesAdded += 1;
        setExportCurrent(i + 1);
        updateExportProgress(i + 1, 0, `Finished ${studentNumber}`);
        await new Promise((r) => requestAnimationFrame(r));
      }

      if (filesAdded === 0) {
        alert(
          "No files were generated. Please open View Record and try again.",
        );
        return;
      }

      setExportStatus("Generating ZIP file...");
      setExportProgress(99);
      const zipBlob = await zip.generateAsync({ type: "blob" });
      setExportStatus("Downloading ZIP file...");
      setExportProgress(100);
      saveAs(zipBlob, zipFileName);
      try {
        const selectedProgramInfo =
          programs.find((p) => p.program_id == selectedProgram) || {};
        await axios.post(
          `${API_BASE_URL}/api/cor-export/audit`,
          {
            exported_count: filesAdded,
            department_label:
              selectedDept.dprtmnt_code || selectedDept.dprtmnt_name || "",
            program_label:
              selectedProgramInfo.program_code ||
              selectedProgramInfo.program_description ||
              "",
            year_level_label: yearLevelDesc,
          },
          { headers: getAuditHeaders() },
        );
      } catch (auditError) {
        console.error("Failed to insert COR export audit log:", auditError);
      }
    } finally {
      setCurrentPage(originalPage);
      setExporting(false);
      setExportTotal(0);
      setExportCurrent(0);
      setExportProgress(0);
      setExportStatus("");
      setExportList([]);
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
        paddingRight: 1,
        backgroundColor: "transparent",
        mt: 1,
        padding: 2,
      }}
    >
      <Dialog open={exporting} maxWidth="xs" fullWidth>
        <DialogTitle>PROCESSING</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 1 }}>
            {exportTotal > 0 ? `${exportCurrent}/${exportTotal}` : "0/0"}
          </Typography>
          <Typography variant="caption" sx={{ mb: 1, display: "block" }}>
            {exportStatus || "Preparing export..."}
          </Typography>
          <LinearProgress
            variant="determinate"
            value={exportProgress}
          />
          <Typography variant="caption" sx={{ mt: 1, display: "block" }}>
            {exportProgress}%
          </Typography>
        </DialogContent>
      </Dialog>

      {exportList.length > 0 ? (
        <div
          style={{
            position: "fixed",
            left: "-10000px",
            top: 0,
            width: "calc((210mm + 6.5rem) * 44 / 42 + 3rem)",
            backgroundColor: "#ffffff",
          }}
        >
          {exportList.map((student) => (
            <CertificateOfRegistration
              key={`export-${student.student_number}`}
              student_number={student.student_number}
              person_id={student.person_id}
              preload={batchByStudentNumber[student.student_number]}
              containerId={`export-cor-${student.student_number}`}
              onReady={handleCorReady}
            />
          ))}
        </div>
      ) : null}
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={2}
      >
        <Typography
          variant="h4"
          sx={{
            fontWeight: "bold",
            color: titleColor,
          }}
        >
          COR EXPORTING MODULE
        </Typography>
      </Box>

      <hr style={{ border: "1px solid #ccc", width: "100%" }} />
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
              <TableCell sx={{ color: "white", textAlign: "Center" }}>
                COR Exporting Module
              </TableCell>
            </TableRow>
          </TableHead>
        </Table>
      </TableContainer>

      <Paper sx={{ p: 3, mb: 4, border: `1px solid ${borderColor}` }}>
        <Grid container spacing={2}>
          {/* ROW 1 */}
          <Grid item xs={12} md={1.5}>
            <FormControl fullWidth>
              <Select
                value={campusFilter}
                onChange={(e) => setCampusFilter(e.target.value)}
              >
                {branches.map((branch) => (
                  <MenuItem
                    key={branch.id ?? branch.branch}
                    value={branch.id ?? ""}
                  >
                    {branch.branch}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={1.5}>
            <FormControl fullWidth>
              <Select
                value={selectedYearLevel}
                onChange={(e) => setSelectedYearLevel(e.target.value)}
              >
                {yearLevels.map((yl) => (
                  <MenuItem key={yl.year_level_id} value={yl.year_level_id}>
                    {yl.year_level_description}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={6} />

          <Grid item xs={12} md={1.5}>
            <FormControl fullWidth>
              <Select
                value={yearId}
                onChange={(e) => setYearId(e.target.value)}
              >
                {schoolYears.map((sy) => (
                  <MenuItem key={sy.year_id} value={sy.year_id}>
                    {sy.current_year} - {sy.next_year}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={1.5}>
            <FormControl fullWidth>
              <Select
                value={semesterId}
                onChange={(e) => setSemesterId(e.target.value)}
              >
                {semesters.map((sem) => (
                  <MenuItem key={sem.semester_id} value={sem.semester_id}>
                    {sem.semester_description}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          {/* ROW 2 */}
          <Grid item xs={12} md={1.5}>
            <FormControl fullWidth>
              <Select
                value={selectedDepartmentFilter}
                onChange={handleCollegeChange}
              >
                {department.map((dep) => (
                  <MenuItem key={dep.dprtmnt_id} value={dep.dprtmnt_id}>
                    {dep.dprtmnt_name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={1.5}>
            <FormControl fullWidth>
              <Select
                value={selectedProgram}
                onChange={(e) => setSelectedProgram(e.target.value)}
                displayEmpty
              >
                <MenuItem value="">Select Program</MenuItem>
                {programs.map((p) => (
                  <MenuItem key={p.curriculum_id} value={p.curriculum_id}>
                    ({p.program_code}-{p.year_description}){" "}
                    {p.program_description} {p.program_major}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={6} />

          <Grid item xs={12} md={1.5}>
            <Button
              variant="contained"
              fullWidth
              onClick={handleViewRecord}
              disabled={!filteredData.length}
            >
              View Record
            </Button>
          </Grid>

          <Grid item xs={12} md={1.5}>
            <Button
              variant="contained"
              fullWidth
              onClick={handleExportPdfAll}
              disabled={!filteredData.length}
            >
              EXPORT PDF
            </Button>
          </Grid>
        </Grid>
      </Paper>

      <TableContainer component={Paper} sx={{ width: "100%" }}>
        <Table size="small">
          <TableHead
            sx={{
              backgroundColor: headerColor,
              color: "white",
            }}
          >
            <TableRow>
              <TableCell
                colSpan={10}
                sx={{
                  border: `1px solid ${borderColor}`,
                  py: 0.5,
                  backgroundColor: headerColor,
                  color: "white",
                }}
              >
                <Box
                  display="flex"
                  justifyContent="space-between"
                  alignItems="center"
                >
                  <Typography fontSize="14px" fontWeight="bold" color="white">
                    Total Student's Records: {filteredData.length}
                  </Typography>

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

      {viewClicked && visibleData.length > 0 ? (
        <>
          {pagedData.map((student) => (
            <CertificateOfRegistration
              key={student.student_number}
              student_number={student.student_number}
              person_id={student.person_id}
              preload={batchByStudentNumber[student.student_number]}
            />
          ))}
        </>
      ) : (
        <Paper
          sx={{
            padding: "6rem 0rem",
            textAlign: "center",
            border: `2px dashed ${borderColor}`,
            backgroundColor: "#f9f9f9",
  
          }}
        >
          <Typography variant="h6" color="textSecondary">
            There's no Certificate Of Registration currently being displayed.
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Click the "View COR" button to display data.
          </Typography>
        </Paper>
        
      )}
         <TableContainer component={Paper} sx={{ width: "100%" }}>
        <Table size="small">
          <TableHead
            sx={{
              backgroundColor: headerColor,
              color: "white",
            }}
          >
            <TableRow>
              <TableCell
                colSpan={10}
                sx={{
                  border: `1px solid ${borderColor}`,
                  py: 0.5,
                  backgroundColor: headerColor,
                  color: "white",
                }}
              >
                <Box
                  display="flex"
                  justifyContent="space-between"
                  alignItems="center"
                >
                  <Typography fontSize="14px" fontWeight="bold" color="white">
                    Total Student's Records: {filteredData.length}
                  </Typography>

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
    </Box>
    
  );
};

export default CORExportingModule;
