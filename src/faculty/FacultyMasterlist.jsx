import React, {
  useState,
  useEffect,
  useContext,
  useRef,
  useMemo,
  useCallback,
} from "react";
import { SettingsContext } from "../App";
import "../styles/TempStyles.css";
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableContainer,
  Paper,
  FormControl,
  Select,
  InputLabel,
  MenuItem,
  Button,
  TextField,
} from "@mui/material";
import axios from "axios";
import API_BASE_URL from "../apiConfig";
import { useNavigate, useLocation } from "react-router-dom";
import { FcPrint } from "react-icons/fc";
import SearchIcon from "@mui/icons-material/Search";
import EaristLogo from "../assets/EaristLogo.png";
import {
  buildClassListPrintHtml,
  mapStudentToPrintRow,
  resolveLogoDataUrl,
  CLASS_LIST_PRINT_CSS,
} from "../utils/classListPrintLayout";

const getStudentRegularStatus = (student) =>
  Number(student.is_regular ?? student.status);
const getStudentRegularLabel = (student) =>
  getStudentRegularStatus(student) === 1 ? "Regular" : "Irregular";

const StudentMasterlistRow = React.memo(function StudentMasterlistRow({
  student,
  rowNumber,
  borderColor,
  mainButtonColor,
  onNameClick,
}) {
  const uniqueRooms = useMemo(
    () => [
      ...new Set(
        (student.schedules || []).map((sch) => sch.room).filter(Boolean),
      ),
    ],
    [student.schedules],
  );

  return (
    <TableRow>
      <TableCell
        sx={{
          textAlign: "center",
          border: `1px solid ${borderColor}`,
        }}
      >
        {rowNumber}
      </TableCell>
      <TableCell
        sx={{
          textAlign: "center",
          border: `1px solid ${borderColor}`,
        }}
      >
        {student.student_number}
      </TableCell>
      <TableCell
        sx={{
          border: `1px solid ${borderColor}`,
          cursor: "pointer",
          transition: "all 0.2s ease",
          "&:hover": {
            color: mainButtonColor,
            textDecoration: "underline",
          },
        }}
        onClick={onNameClick}
      >
        {student.last_name}, {student.first_name} {student.middle_name}
      </TableCell>
      <TableCell
        sx={{
          textAlign: "center",
          border: `1px solid ${borderColor}`,
        }}
      >
        {student.program_code}-{student.section_description}
      </TableCell>
      <TableCell
        sx={{
          textAlign: "center",
          border: `1px solid ${borderColor}`,
        }}
      >
        {getStudentRegularLabel(student)}
      </TableCell>
      <TableCell
        sx={{
          textAlign: "center",
          border: `1px solid ${borderColor}`,
        }}
      >
        {uniqueRooms.map((room, i) => (
          <div key={i}>{room}</div>
        ))}
      </TableCell>
    </TableRow>
  );
});

const FacultyMasterList = () => {
  const navigate = useNavigate();
  const settings = useContext(SettingsContext);
  const colors = settings?.colors || {};
  const branding = settings?.branding || {};
  const assets = settings?.assets || {};
  const headerColor = colors.header || "#1976d2";
  const location = useLocation();
  const { course_id, section_id, school_year_id, department_section_id } =
    location.state || {};
  const initialDepartmentSectionId = department_section_id || section_id;

  const [titleColor, setTitleColor] = useState("#000000");
  const [subtitleColor, setSubtitleColor] = useState("#555555");
  const [borderColor, setBorderColor] = useState("#000000");
  const [mainButtonColor, setMainButtonColor] = useState("#1976d2");
  const [subButtonColor, setSubButtonColor] = useState("#ffffff"); // âœ… NEW
  const [stepperColor, setStepperColor] = useState("#000000"); // âœ… NEW

  const [fetchedLogo, setFetchedLogo] = useState(null);
  const [companyName, setCompanyName] = useState("");
  const [shortTerm, setShortTerm] = useState("");
  const [campusAddress, setCampusAddress] = useState("");

  useEffect(() => {
    if (!settings) return;

    // Colors
    if (colors.title) setTitleColor(colors.title);
    if (colors.subtitle) setSubtitleColor(colors.subtitle);
    if (colors.border) setBorderColor(colors.border);
    if (colors.mainButton)
      setMainButtonColor(colors.mainButton);
    if (colors.subButton) setSubButtonColor(colors.subButton);
    if (colors.stepper) setStepperColor(colors.stepper);

    // Logo
    if (assets.logoUrl) {
      setFetchedLogo(assets.logoUrl);
    } else {
      setFetchedLogo(EaristLogo);
    }

    // School Information
    if (branding.companyName) setCompanyName(branding.companyName);
    if (branding.shortTerm) setShortTerm(branding.shortTerm);
    if (branding.campusAddress) setCampusAddress(branding.campusAddress);
  }, [settings]);

  const [userID, setUserID] = useState("");
  const [user, setUser] = useState("");
  const [userRole, setUserRole] = useState("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [profData, setPerson] = useState({
    prof_id: "",
    employee_id: "",
    fname: "",
    mname: "",
    lname: "",
  });
  const [schoolYears, setSchoolYears] = useState([]);
  const [schoolSemester, setSchoolSemester] = useState([]);
  const [selectedSchoolYear, setSelectedSchoolYear] = useState("");
  const [selectedSchoolSemester, setSelectedSchoolSemester] = useState("");
  const [selectedActiveSchoolYear, setSelectedActiveSchoolYear] = useState("");
  const [classListAndDetails, setClassListAndDetails] = useState([]);
  const [courseAssignedTo, setCoursesAssignedTo] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState("");
  const [sectionAssignedTo, setSectionAssignedTo] = useState([]);
  const [selectedSection, setSelectedSection] = useState("");
  const [masterlistBootstrapped, setMasterlistBootstrapped] = useState(false);
  const skipNextSectionFetchRef = useRef(false);
  const skipNextActiveYearResolveRef = useRef(false);
  const [selectedStatusFilter, setSelectedStatusFilter] = useState("Regular");
  const [sortOrder, setSortOrder] = useState("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [isGeneratingClassListPdf, setIsGeneratingClassListPdf] = useState(false);
  const itemsPerPage = 10;

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    const storedUser = localStorage.getItem("email");
    const storedRole = localStorage.getItem("role");
    const storedProfID = localStorage.getItem("prof_id");
    const storedEmployeeID = localStorage.getItem("employee_id");
    const storedID = storedProfID || storedEmployeeID;

    if (storedUser && storedRole && storedID) {
      setUser(storedUser);
      setUserRole(storedRole);
      setUserID(storedID);

      if (storedRole !== "faculty") {
        window.location.href = "/dashboard";
      } else {
        fetchPersonData(storedID);
      }
    } else {
      window.location.href = "/login";
    }
  }, []);

  const fetchPersonData = async (id) => {
    try {
      const storedProfID = localStorage.getItem("prof_id");
      const storedEmployeeID = localStorage.getItem("employee_id");
      const endpoint = storedProfID
        ? `/api/get_prof_data_by_prof/${storedProfID}`
        : storedEmployeeID
          ? `/api/get_prof_data_by_employee/${storedEmployeeID}`
          : `/api/get_prof_data/${id}`;
      const res = await axios.get(`${API_BASE_URL}${endpoint}`);
      const first = res.data[0];
      localStorage.setItem("prof_id", first.prof_id || "");
      localStorage.setItem("employee_id", first.employee_id || "");

      const profInfo = {
        prof_id: first.prof_id,
        employee_id: first.employee_id,
        fname: first.fname,
        mname: first.mname,
        lname: first.lname,
      };

      setPerson(profInfo);
    } catch (err) {
      setLoading(false);
      setMessage("Error Fetching Professor Personal Data");
    }
  };

  useEffect(() => {
    if (profData.prof_id) {
      axios
        .get(`${API_BASE_URL}/api/faculty_masterlist_bootstrap/${profData.prof_id}`)
        .then((res) => {
          const data = res.data || {};
          const active = data.activeSchoolYear || {};
          const courses = Array.isArray(data.courses) ? data.courses : [];
          const sections = Array.isArray(data.sections) ? data.sections : [];

          setCoursesAssignedTo(courses);
          setSectionAssignedTo(sections);
          setClassListAndDetails(Array.isArray(data.classDetails) ? data.classDetails : []);

          if (!school_year_id && active.year_id) setSelectedSchoolYear(active.year_id);
          if (active.semester_id) setSelectedSchoolSemester(active.semester_id);
          if (active.school_year_id) setSelectedActiveSchoolYear(active.school_year_id);

          if (!course_id && courses.length > 0) {
            setSelectedCourse(courses[0].course_id);
          }

          if (!initialDepartmentSectionId && sections.length > 0) {
            setSelectedSection(String(sections[0].department_section_id));
          }

          skipNextSectionFetchRef.current = true;
          skipNextActiveYearResolveRef.current = true;
          setMasterlistBootstrapped(true);
        })
        .catch((err) => {
          console.error(err);
          setMasterlistBootstrapped(true);
        });
    }
  }, [profData.prof_id, course_id, initialDepartmentSectionId, school_year_id]);

  const filteredCourses = useMemo(
    () =>
      courseAssignedTo.filter((course) => {
        if (!selectedSchoolYear && !selectedSchoolSemester) return true;

        const matchesYear =
          !selectedSchoolYear ||
          String(course.year_id) === String(selectedSchoolYear);

        const matchesSemester =
          !selectedSchoolSemester ||
          String(course.semester_id) === String(selectedSchoolSemester);

        return matchesYear && matchesSemester;
      }),
    [courseAssignedTo, selectedSchoolYear, selectedSchoolSemester],
  );

  useEffect(() => {
    if (course_id) setSelectedCourse(course_id);
    if (initialDepartmentSectionId) {
      setSelectedSection(String(initialDepartmentSectionId));
    }
    if (school_year_id) setSelectedSchoolYear(school_year_id);
  }, [course_id, initialDepartmentSectionId, school_year_id]);

  useEffect(() => {
    if (!masterlistBootstrapped) return;
    if (skipNextSectionFetchRef.current) {
      skipNextSectionFetchRef.current = false;
      return;
    }
    if (!profData.prof_id || !selectedCourse || !selectedActiveSchoolYear) return;

    axios
      .get(
        `${API_BASE_URL}/api/handle_section_of/${profData.prof_id}/${selectedCourse}/${selectedActiveSchoolYear}`,
      )
      .then((res) => {
        setSectionAssignedTo(res.data);

        const selectedSectionExists = res.data.some(
          (section) =>
            String(section.department_section_id) === String(selectedSection),
        );

        if (res.data.length > 0 && !selectedSectionExists) {
          setSelectedSection(String(res.data[0].department_section_id));
        } else if (res.data.length === 0) {
          setSelectedSection("");
        }
      })
      .catch((err) => console.error(err));
  }, [
    masterlistBootstrapped,
    profData.prof_id,
    selectedCourse,
    selectedActiveSchoolYear,
  ]);

  useEffect(() => {
    const currentYear = new Date().getFullYear();
    Promise.all([
      axios.get(`${API_BASE_URL}/api/get_school_year`),
      axios.get(`${API_BASE_URL}/api/get_school_semester/`),
    ])
      .then(([yearRes, semRes]) => {
        setSchoolYears(
          yearRes.data.filter(
            (yearObj) => Number(yearObj.current_year) <= currentYear,
          ),
        );
        setSchoolSemester(semRes.data);
      })
      .catch((err) => console.error(err));
  }, []);

  useEffect(() => {
    if (!selectedSchoolYear || !selectedSchoolSemester) return;
    if (skipNextActiveYearResolveRef.current) {
      skipNextActiveYearResolveRef.current = false;
      return;
    }
    axios
      .get(
        `${API_BASE_URL}/api/get_selecterd_year/${selectedSchoolYear}/${selectedSchoolSemester}`,
      )
      .then((res) => {
        if (res.data.length > 0) {
          setSelectedActiveSchoolYear(res.data[0].school_year_id);
        }
      })
      .catch((err) => console.error(err));
  }, [selectedSchoolYear, selectedSchoolSemester]);

  const handleSchoolYearChange = (event) => {
    setSelectedSchoolYear(event.target.value);
  };

  const handleSchoolSemesterChange = (event) => {
    setSelectedSchoolSemester(event.target.value);
  };

  const handleSelectCourseChange = (event) => {
    setSelectedCourse(event.target.value);
  };

  const handleSelectSectionChange = (event) => {
    setSelectedSection(String(event.target.value));
  };

  const findPastClass = async () => {
    try {
      if (!profData.prof_id || !selectedSchoolYear || !selectedSchoolSemester) {
        setMessage("Please select School Year and Semester first.");
        return;
      }

      // 1ï¸âƒ£ Fetch courses assigned to the professor
      const courseRes = await axios.get(
        `${API_BASE_URL}/api/course_assigned_to/${profData.prof_id}/${selectedSchoolYear}/${selectedSchoolSemester}`,
      );
      const courses = courseRes.data;
      setCoursesAssignedTo(courses);

      if (courses.length === 0) {
        setSectionAssignedTo([]);
        setSelectedCourse("");
        setSelectedSection("");
        setMessage("No courses found for this period.");
        return;
      }

      // 2ï¸âƒ£ Choose first course if none selected
      const selectedCourseExists = courses.some(
        (course) => String(course.course_id) === String(selectedCourse),
      );
      const courseId = selectedCourseExists ? selectedCourse : courses[0].course_id;
      setSelectedCourse(courseId);

      // 3ï¸âƒ£ Fetch sections for the selected course
      const sectionRes = await axios.get(
        `${API_BASE_URL}/api/handle_section_of/${profData.prof_id}/${courseId}/${selectedActiveSchoolYear}`,
      );

      const sections = sectionRes.data;
      setSectionAssignedTo(sections);
      if (sections.length > 0) {
        const selectedSectionExists = sections.some(
          (section) =>
            String(section.department_section_id) === String(selectedSection),
        );
        setSelectedSection(
          selectedSectionExists
            ? String(selectedSection)
            : String(sections[0].department_section_id),
        );
      } else {
        setSelectedSection("");
      }

      if (sections.length === 0) {
        setSectionAssignedTo([]);
        setSelectedSection("");
        setMessage("No sections found for this course.");
        return;
      }

      // 4ï¸âƒ£ Choose first section if none selected
      const sectionId = sections.some(
        (section) =>
          String(section.department_section_id) === String(selectedSection),
      )
        ? selectedSection
        : sections[0].department_section_id;
      setSelectedSection(String(sectionId));

      // 5ï¸âƒ£ Fetch students for this section
      const detailsRes = await axios.get(`${API_BASE_URL}/api/get_class_details/${profData.prof_id}`);
      setClassListAndDetails(detailsRes.data);
      setMessage("");
    } catch (err) {
      console.error("Error fetching past class data:", err);
      setMessage("Failed to fetch data.");
    }
  };

  const filteredStudents = useMemo(() => {
    const q = debouncedSearch.toLowerCase();

    return classListAndDetails
      .filter((s) => {
        const matchesSearch =
          q === "" ||
          s.student_number?.toString().includes(q) ||
          s.first_name?.toLowerCase().includes(q) ||
          s.middle_name?.toLowerCase().includes(q) ||
          s.last_name?.toLowerCase().includes(q) ||
          `${s.first_name} ${s.last_name}`.toLowerCase().includes(q) ||
          `${s.last_name} ${s.first_name}`.toLowerCase().includes(q);

        const matchesYear =
          selectedSchoolYear === "" ||
          String(s.year_id) === String(selectedSchoolYear);

        const matchesSemester =
          selectedSchoolSemester === "" ||
          String(s.semester_id) === String(selectedSchoolSemester);

        const matchesCourse =
          selectedCourse === "" ||
          String(s.course_id) === String(selectedCourse);

        const matchesSection =
          selectedSection === "" ||
          String(s.department_section_id) === String(selectedSection);

        const matchesStatus =
          selectedStatusFilter === "" ||
          (selectedStatusFilter === "Regular" &&
            getStudentRegularStatus(s) === 1) ||
          (selectedStatusFilter === "Irregular" &&
            getStudentRegularStatus(s) !== 1);

        return (
          matchesSearch &&
          matchesYear &&
          matchesSemester &&
          matchesCourse &&
          matchesSection &&
          matchesStatus
        );
      })
      .sort((a, b) => {
        const nameA = `${a.last_name} ${a.first_name}`.toLowerCase();
        const nameB = `${b.last_name} ${b.first_name}`.toLowerCase();

        return sortOrder === "asc"
          ? nameA.localeCompare(nameB)
          : nameB.localeCompare(nameA);
      });
  }, [
    classListAndDetails,
    debouncedSearch,
    selectedSchoolYear,
    selectedSchoolSemester,
    selectedCourse,
    selectedSection,
    selectedStatusFilter,
    sortOrder,
  ]);

  const groupedList = useMemo(() => {
    const grouped = filteredStudents.reduce((acc, student) => {
      const key = student.student_number;

      if (!acc[key]) {
        acc[key] = {
          ...student,
          schedules: [],
        };
      }

      acc[key].schedules.push({
        day: student.day,
        start: student.school_time_start,
        end: student.school_time_end,
        room: student.room_description,
      });

      return acc;
    }, {});

    return Object.values(grouped);
  }, [filteredStudents]);

  const totalPages = Math.max(1, Math.ceil(groupedList.length / itemsPerPage));

  const paginatedGroupedList = useMemo(
    () =>
      groupedList.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage,
      ),
    [groupedList, currentPage, itemsPerPage],
  );

  const selectedSchoolYearValue = useMemo(
    () =>
      schoolYears.some(
        (yearObj) => String(yearObj.year_id) === String(selectedSchoolYear),
      )
        ? selectedSchoolYear
        : "",
    [schoolYears, selectedSchoolYear],
  );

  const selectedSchoolSemesterValue = useMemo(
    () =>
      schoolSemester.some(
        (sem) => String(sem.semester_id) === String(selectedSchoolSemester),
      )
        ? selectedSchoolSemester
        : "",
    [schoolSemester, selectedSchoolSemester],
  );

  const selectedCourseValue = useMemo(
    () =>
      filteredCourses.some(
        (course) => String(course.course_id) === String(selectedCourse),
      )
        ? selectedCourse
        : "",
    [filteredCourses, selectedCourse],
  );

  const selectedSectionValue = useMemo(
    () =>
      sectionAssignedTo.some(
        (section) =>
          String(section.department_section_id) === String(selectedSection),
      )
        ? String(selectedSection)
        : "",
    [sectionAssignedTo, selectedSection],
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [
    debouncedSearch,
    selectedSchoolYear,
    selectedSchoolSemester,
    selectedCourse,
    selectedSection,
    selectedStatusFilter,
    sortOrder,
  ]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const handleNavigateToGradingSheet = useCallback(() => {
    navigate("/grading_sheet", {
      state: {
        course_id: selectedCourse,
        section_id: selectedSection,
        school_year_id: selectedSchoolYear,
        departmentSection: department_section_id,
      },
    });
  }, [
    navigate,
    selectedCourse,
    selectedSection,
    selectedSchoolYear,
    department_section_id,
  ]);

  const downloadClassListPdf = async () => {
    if (isGeneratingClassListPdf) return;
    if (!groupedList.length) {
      window.alert("No students available to generate the Class List PDF.");
      return;
    }

    setIsGeneratingClassListPdf(true);

    try {
      const meta = groupedList[0] || {};
      const selectedYear = schoolYears.find(
        (yearObj) => String(yearObj.year_id) === String(selectedSchoolYear),
      );
      const selectedSemester = schoolSemester.find(
        (sem) => String(sem.semester_id) === String(selectedSchoolSemester),
      );
      const printTimestamp = new Date().toLocaleString("en-PH", {
        month: "short",
        day: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      });
      const facultyName = [
        profData.lname,
        [profData.fname, profData.mname ? `${String(profData.mname)[0]}.` : ""]
          .filter(Boolean)
          .join(" "),
      ]
        .filter(Boolean)
        .join(", ");

      const logoDataUrl = await resolveLogoDataUrl(
        fetchedLogo || EaristLogo || "",
      );

      const footerCenter = `${meta.course_code || ""} - ${
        meta.course_description || "Class List"
      }`;

      const classSection = `${meta.program_code || ""} ${meta.section_description || ""}`
        .replace(/\s+/g, " ")
        .trim();

      const innerHtml = `
        <style>${CLASS_LIST_PRINT_CSS}</style>
        ${buildClassListPrintHtml({
          companyName,
          campusAddress: campusAddress || "Nagtahan Sampaloc Manila",
          logoUrl: logoDataUrl,
          courseTitle: (meta.course_description || "").toUpperCase(),
          departmentTitle: meta.dprtmnt_name || "",
          academicYearLabel: selectedYear
            ? `${selectedYear.current_year}-${selectedYear.next_year}`
            : `${meta.current_year || ""}-${meta.next_year || ""}`,
          semesterLabel:
            selectedSemester?.semester_description ||
            meta.semester_description ||
            "",
          programCode: meta.course_code || "",
          classSection,
          programDescription: meta.course_description || "",
          yearLevel: meta.year_level_description || "",
          departmentName: meta.dprtmnt_name || "",
          facultyName,
          students: groupedList.map(mapStudentToPrintRow),
          printInfoLeft: printTimestamp,
          printInfoCenter: footerCenter,
        })}
      `;

      const response = await axios.post(
        `${API_BASE_URL}/api/generate-class-list-pdf`,
        {
          html: innerHtml,
          footerLeft: printTimestamp,
          footerCenter,
        },
        {
          responseType: "blob",
          headers: {
            "x-employee-id":
              profData.employee_id ||
              localStorage.getItem("employee_id") ||
              "",
          },
        },
      );

      const blobUrl = window.URL.createObjectURL(
        new Blob([response.data], { type: "application/pdf" }),
      );
      const link = document.createElement("a");
      link.href = blobUrl;
      const safeCourse = String(meta.course_code || "Class")
        .trim()
        .replace(/\s+/g, "_");
      const safeSection = String(classSection || "List")
        .trim()
        .replace(/\s+/g, "_");
      link.setAttribute(
        "download",
        `Class_List_${safeCourse}_${safeSection}_${new Date().toISOString().slice(0, 10)}.pdf`,
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error("Failed to generate Class List PDF:", err);
      window.alert("Failed to generate Class List PDF. Please try again.");
    } finally {
      setIsGeneratingClassListPdf(false);
    }
  };

  // Disable right-click
  document.addEventListener("contextmenu", (e) => e.preventDefault());

  // Block DevTools shortcuts + Ctrl+P silently
  document.addEventListener("keydown", (e) => {
    const isBlockedKey =
      e.key === "F12" || // DevTools
      e.key === "F11" || // Fullscreen
      (e.ctrlKey &&
        e.shiftKey &&
        (e.key.toLowerCase() === "i" || e.key.toLowerCase() === "j")) || // Ctrl+Shift+I/J
      (e.ctrlKey && e.key.toLowerCase() === "u") || // Ctrl+U (View Source)
      (e.ctrlKey && e.key.toLowerCase() === "p"); // Ctrl+P (Print)

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
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 2,
          width: "100%",
        }}
      >
        {/* LEFT SIDE â€” TITLE */}
        <Typography
          variant="h4"
          sx={{
            fontWeight: "bold",
            color: titleColor,
            fontSize: "36px",
          }}
        >
          CLASS LIST
        </Typography>

        {/* RIGHT SIDE â€” SEARCH + PRINT */}
        <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
          <TextField
            size="small"
            placeholder="Search Student Number / Student Name"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            sx={{
              width: 450, // MATCHED WITH GRADING SHEET
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

          <button
            onClick={downloadClassListPdf}
            disabled={isGeneratingClassListPdf}
            style={{
              width: "308px", // MATCHED WITH GRADING SHEET
              padding: "10px 20px",
              border: "2px solid black",
              backgroundColor: "#f0f0f0",
              color: "black",
              borderRadius: "5px",
              cursor: isGeneratingClassListPdf ? "not-allowed" : "pointer",
              fontSize: "16px",
              fontWeight: "bold",
              marginRight: "30px",
              opacity: isGeneratingClassListPdf ? 0.6 : 1,
              transition: "background-color 0.3s, transform 0.2s",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
            }}
            onMouseEnter={(e) => {
              if (isGeneratingClassListPdf) return;
              e.currentTarget.style.backgroundColor = "#d3d3d3";
            }}
            onMouseLeave={(e) => {
              if (isGeneratingClassListPdf) return;
              e.currentTarget.style.backgroundColor = "#f0f0f0";
            }}
            onMouseDown={(e) => {
              if (isGeneratingClassListPdf) return;
              e.currentTarget.style.transform = "scale(0.95)";
            }}
            onMouseUp={(e) => {
              if (isGeneratingClassListPdf) return;
              e.currentTarget.style.transform = "scale(1)";
            }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <FcPrint size={20} />
              {isGeneratingClassListPdf
                ? "Generating PDF..."
                : "Download Class List"}
            </span>
          </button>
        </Box>
      </Box>

      <hr style={{ border: "1px solid #ccc", width: "100%" }} />

      <br />

      <TableContainer component={Paper} sx={{ width: "100%" }}>
        <Table size="small">
          <TableHead sx={{ backgroundColor: "#6D2323", color: "white" }}>
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
                  {/* Left: Total Count */}
                  <Typography fontSize="14px" fontWeight="bold" color="white">
                    Total Students: {groupedList.length}
                  </Typography>

                  {/* Right: Pagination Controls */}
                  <Box display="flex" alignItems="center" gap={1}>
                    {/* First & Prev */}
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

                    {/* Page Dropdown */}
                    <FormControl size="small" sx={{ minWidth: 80 }}>
                      <Select
                        value={currentPage <= totalPages ? currentPage : 1}
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
                            color: "white", // dropdown arrow icon color
                          },
                        }}
                        MenuProps={{
                          PaperProps: {
                            sx: {
                              maxHeight: 200,
                              backgroundColor: "#fff", // dropdown background
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
                      {totalPages} page{totalPages > 1 ? "s" : ""}
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
      <TableContainer
        component={Paper}
        sx={{ width: "100%", border: `1px solid ${borderColor}`, p: 2 }}
      >
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            margin: "1rem 0",
            padding: "0 1rem",
          }}
        >
          {/* LEFT SIDE: Course, Section, Student Status + Sort */}
          <Box display="flex" flexDirection="column" gap={2}>

            {/* Course */}
            <Box display="flex" alignItems="center" gap={1}>
              <Typography fontSize={13} sx={{ minWidth: "110px" }}>
                Course:
              </Typography>
              <FormControl sx={{ width: "550px" }}>
                <InputLabel id="demo-simple-select-label">Course</InputLabel>
                <Select
                  labelId="demo-simple-select-label"
                  id="demo-simple-select"
                  value={selectedCourseValue}
                  label="Course"
                  onChange={handleSelectCourseChange}
                >
                  {!courseAssignedTo || courseAssignedTo.length === 0 ? (
                    <MenuItem disabled>No Course Assigned this Academic Year</MenuItem>
                  ) : filteredCourses.length > 0 ? (
                    filteredCourses.map((course) => (
                      <MenuItem key={course.course_id} value={course.course_id}>
                        {course.course_code} - {course.course_description}
                      </MenuItem>
                    ))
                  ) : (
                    <MenuItem disabled>No Course Assigned this Academic Year</MenuItem>
                  )}
                </Select>
              </FormControl>
            </Box>

            {/* Section */}
            <Box display="flex" alignItems="center" gap={1}>
              <Typography fontSize={13} sx={{ minWidth: "110px" }}>
                Section:
              </Typography>
              <FormControl sx={{ width: "550px" }}>
                <InputLabel id="section-select-label">Section</InputLabel>
                <Select
                  labelId="section-select-label"
                  id="section-select"
                  label="Section"
                  value={selectedSectionValue}
                  onChange={handleSelectSectionChange}
                >
                  {!selectedCourse ? (
                    <MenuItem disabled>
                      <Typography variant="body2" color="text.secondary" sx={{ fontStyle: "italic" }}>
                        Please select a course first
                      </Typography>
                    </MenuItem>
                  ) : sectionAssignedTo.length > 0 ? (
                    sectionAssignedTo.map((section) => (
                      <MenuItem
                        key={section.department_section_id}
                        value={String(section.department_section_id)}
                      >
                        {section.program_code}-{section.section_description}
                      </MenuItem>
                    ))
                  ) : (
                    <MenuItem disabled>
                      <Typography variant="body2" color="text.secondary" sx={{ fontStyle: "italic" }}>
                        No sections available for this course
                      </Typography>
                    </MenuItem>
                  )}
                </Select>
              </FormControl>
            </Box>

            {/* Student Status + Sort beside it */}
            <Box display="flex" alignItems="center" gap={2}>
              <Typography fontSize={13} sx={{ minWidth: "110px" }}>
                Student Status:
              </Typography>
              <FormControl sx={{ width: "150px" }}>
                <Select
                  value={selectedStatusFilter}
                  onChange={(e) => setSelectedStatusFilter(e.target.value)}
                  displayEmpty
                >
                  <MenuItem value="">All</MenuItem>
                  <MenuItem value="Regular">Regular</MenuItem>
                  <MenuItem value="Irregular">Irregular</MenuItem>
                </Select>
              </FormControl>

              <Typography fontSize={13}>Sort:</Typography>
              <FormControl sx={{ width: "120px" }}>
                <InputLabel id="sort-label">Sort</InputLabel>
                <Select
                  labelId="sort-label"
                  label="Sort"
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value)}
                >
                  <MenuItem value="asc">A â€“ Z</MenuItem>
                  <MenuItem value="desc">Z â€“ A</MenuItem>
                </Select>
              </FormControl>
            </Box>

          </Box>

          {/* RIGHT SIDE: School Year, Semester, Find Last Grade */}
          <Box display="flex" flexDirection="column" gap={2} alignItems="flex-end">

            {/* School Year */}
            <Box display="flex" alignItems="center" gap={1}>
              <Typography fontSize={13} sx={{ minWidth: "100px" }} textAlign="right">
                School Year:
              </Typography>
              <FormControl sx={{ width: "180px" }}>
                <InputLabel id="school-year-label">School Year</InputLabel>
                <Select
                  labelId="school-year-label"
                  label="School Year"
                  value={selectedSchoolYearValue}
                  onChange={(e) => setSelectedSchoolYear(e.target.value)}
                >
                  <MenuItem value="" disabled>Select School Year</MenuItem>
                  {schoolYears.map((yearObj) => (
                    <MenuItem key={yearObj.year_id} value={yearObj.year_id}>
                      {yearObj.current_year} - {yearObj.next_year}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>

            {/* Semester */}
            <Box display="flex" alignItems="center" gap={1}>
              <Typography fontSize={13} sx={{ minWidth: "100px" }} textAlign="right">
                Semester:
              </Typography>
              <FormControl sx={{ width: "180px" }}>
                <InputLabel id="semester-label">Semester</InputLabel>
                <Select
                  labelId="semester-label"
                  label="Semester"
                  value={selectedSchoolSemesterValue}
                  onChange={(e) => setSelectedSchoolSemester(e.target.value)}
                >
                  <MenuItem value="" disabled>Select Semester</MenuItem>
                  {schoolSemester.map((sem) => (
                    <MenuItem key={sem.semester_id} value={sem.semester_id}>
                      {sem.semester_description}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>

            {/* Find Last Grade */}
            <Box display="flex" alignItems="center" gap={1}>
              <Typography fontSize={13} sx={{ minWidth: "100px" }} textAlign="right">
                Find Last Grade:
              </Typography>
              <FormControl sx={{ width: "150px" }}>
                <InputLabel id="find-grade-label">Action</InputLabel>
                <Select
                  labelId="find-grade-label"
                  label="Action"
                  value=""
                  onChange={(e) => {
                    if (e.target.value === "find") findPastClass();
                  }}
                  displayEmpty
                >
                  <MenuItem value="find">Run Search</MenuItem>
                </Select>
              </FormControl>
            </Box>

          </Box>
        </Box>
      </TableContainer>
      <TableContainer
        component={Paper}
        sx={{ width: "100%", marginTop: "2rem" }}
      >
        <Table size="small">
          <TableHead
            sx={{ backgroundColor: headerColor }}
          >
            <TableRow>
              <TableCell
                sx={{
                  color: "white",
                  textAlign: "center",
                  fontSize: "12px",
                  border: `1px solid ${borderColor}`,
                }}
              >
                #
              </TableCell>
              <TableCell
                sx={{
                  color: "white",
                  textAlign: "center",
                  fontSize: "12px",
                  border: `1px solid ${borderColor}`,
                }}
              >
                Student Number
              </TableCell>
              <TableCell
                sx={{
                  color: "white",
                  textAlign: "center",
                  fontSize: "12px",
                  border: `1px solid ${borderColor}`,
                }}
              >
                Student Name
              </TableCell>
              <TableCell
                sx={{
                  color: "white",
                  textAlign: "center",
                  fontSize: "12px",
                  border: `1px solid ${borderColor}`,
                }}
              >
                Section
              </TableCell>
              <TableCell
                sx={{
                  color: "white",
                  textAlign: "center",
                  fontSize: "12px",
                  border: `1px solid ${borderColor}`,
                }}
              >
                Student Status
              </TableCell>
              <TableCell
                sx={{
                  color: "white",
                  textAlign: "center",
                  fontSize: "12px",
                  border: `1px solid ${borderColor}`,
                }}
              >
                Room
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
            {paginatedGroupedList.length > 0 ? (
              paginatedGroupedList.map((student, index) => (
                <StudentMasterlistRow
                  key={student.student_number}
                  student={student}
                  rowNumber={(currentPage - 1) * itemsPerPage + index + 1}
                  borderColor={borderColor}
                  mainButtonColor={mainButtonColor}
                  onNameClick={handleNavigateToGradingSheet}
                />
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={7}
                  align="center"
                  sx={{ border: `1px solid ${borderColor}` }}
                >
                  No class details available
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default FacultyMasterList;
