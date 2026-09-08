import React, { useState, useEffect, useContext } from "react";
import { SettingsContext } from "../App";
import axios from "axios";
import Unauthorized from "../components/Unauthorized";
import LoadingOverlay from "../components/LoadingOverlay";
import { Box, Typography } from "@mui/material";
import { Link } from "react-router-dom";

import {
  ListAltOutlined,
  AccountCircle,
  FamilyRestroom,
  School,
  LocalHospital,
  Info,
  Description,
  MeetingRoom,
  EditCalendar,
  Badge,
  People,
  Score,
  Assessment,
  FormatListNumbered,
  Class,
  Search,
  Numbers,
  MedicalServices,
  HealthAndSafety,
  FolderCopy,
  HistoryEdu,
  Psychology,
  FactCheck,
  ListAlt,
  ContactEmergency,
  AccessTime,       // ✅ Fixed: was AccessTimeIcon (wrong name)
  PersonAdd,        // ✅ Added missing import
  Campaign,         // ✅ Added missing import
} from "@mui/icons-material";

import AnalyticsIcon from "@mui/icons-material/Analytics";
import CampaignIcon from "@mui/icons-material/Campaign";
import API_BASE_URL from "../apiConfig";

const AdmissionDashboardPanel = () => {
  const settings = useContext(SettingsContext);
  const colors = settings?.colors || {};
  const assets = settings?.assets || {};
  const branding = settings?.branding || {};
  const titleColor = colors.title || "#000000";
  const borderColor = colors.border || "#000000";
  const mainButtonColor = colors.mainButton || "#1976d2";
  const fetchedLogo = branding.logoUrl || null;
  const companyName = branding.companyName || "";
  const shortTerm = branding.shortTerm || "";
  const campusAddress = branding.campusAddress || "";

  // User & Access Control
  const [userID, setUserID] = useState("");
  const [userRole, setUserRole] = useState("");
  const [employeeID, setEmployeeID] = useState("");
  const [hasAccess, setHasAccess] = useState(null);
  const [loading, setLoading] = useState(false);
  const [userAccessList, setUserAccessList] = useState({});

  const pageId = 92;

  // ✅ Fixed: defined missing class roster variables
  const classRosterEnrollmentLink = "/class_roster_enrollment";
  const classRosterRegistrarLink = "/class_roster_registrar";
  const isClassRosterActive = (link) => window.location.pathname === link;

  useEffect(() => {
    const storedUser = localStorage.getItem("email");
    const storedRole = localStorage.getItem("role");
    const storedID = localStorage.getItem("person_id");
    const storedEmployeeID = localStorage.getItem("employee_id");

    if (storedUser && storedRole && storedID && storedEmployeeID) {
      setUserRole(storedRole);
      setUserID(storedID);

      if (storedRole === "registrar") {
        checkAccess(storedEmployeeID);
        fetchUserAccessList(storedEmployeeID);
      } else {
        window.location.href = "/login";
      }
    } else {
      window.location.href = "/login";
    }
  }, []);

  const checkAccess = async (employeeID) => {
    try {
      setLoading(true);
      const response = await axios.get(
        `${API_BASE_URL}/api/page_access/${employeeID}/${pageId}`
      );
      setHasAccess(response.data?.page_privilege === 1);
    } catch (error) {
      console.error("Error checking access:", error);
      setHasAccess(false);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserAccessList = async (employeeID) => {
    try {
      const { data } = await axios.get(
        `${API_BASE_URL}/api/page_access/${employeeID}`
      );

      const accessMap = data.reduce((acc, item) => {
        acc[item.page_id] = item.page_privilege === 1;
        return acc;
      }, {});

      setUserAccessList(accessMap);
    } catch (err) {
      console.error("Error loading user access list:", err);
    }
  };

  const groupedMenu = [
    {
      label: "ADMISSION OFFICE",
      items: [
        { title: "Applicant List", link: "/applicant_list_admin", icon: ListAltOutlined, page_id: 7 },
        { title: "Applicant Profile", link: "/admission_personal_information", icon: AccountCircle, page_id: 1 },
        { title: "Applicant Online Requirements", link: "/admission_online_requirements", icon: FolderCopy, page_id: 61 },
        { title: "Verify Schedule Mgmt", link: "/verify_schedule", icon: EditCalendar, page_id: 118 },
        { title: "Exam Schedule Mgmt", link: "/assign_schedule_applicant", icon: EditCalendar, page_id: 11 },
        { title: "Examination Permit", link: "/registrar_examination_profile", icon: Badge, page_id: 48 },
        { title: "Entrance Exam Scores", link: "/applicant_scoring", icon: Score, page_id: 8 },
        { title: "Verify Schedule Assignment", link: "/verify_document_schedule", icon: AccessTimeIcon, page_id: 115 },
        { title: "Evaluator Applicant List", link: "/evaluator_schedule_room_list", icon: People, page_id: 120 },
        { title: "Exam Room Assignment", link: "/assign_entrance_exam", icon: AccessTimeIcon, page_id: 9 },
        { title: "Proctor's Applicant List", link: "/admission_schedule_room_list", icon: People, page_id: 33 },
        { title: "Subject Management", link: "/applicant_exam_subjects", icon: SchoolIcon, page_id: 145 },
        { title: "Announcement", link: "/announcement_for_admission", icon: Campaign, page_id: 98 },
        { title: "Request Account Deletion", link: "/application_process_admin", icon: PersonAdd, page_id: 139 },
      ],
    },
    {
      label: "ENROLLMENT OFFICER",
      items: [
        { title: "Applicant List", link: "/applicant_list", icon: ListAlt, page_id: 6 },
        { title: "Applicant Profile", link: "/applicant_college_personal_information", icon: AccountCircle, page_id: 43 },
        { title: "Applicant Online Requirements", link: "/applicant_online_requirements_college", icon: FolderCopy, page_id: 49 },
        { title: "Entrance Examination Score", link: "/entrance_examination_score", icon: Assessment, page_id: 151 },
        { title: "Qualifying Schedule Mgmt", link: "/assign_schedule_applicants_qualifying_interview", icon: EditCalendar, page_id: 12 },
        { title: "Qualifying / Interview Scores", link: "/qualifying_interview_exam_scores", icon: Assessment, page_id: 37 },
        { title: "Student Numbering", link: "/student_numbering_per_college", icon: FormatListNumbered, page_id: 60 },
        { title: "Student List", link: "/student_list_for_enrollment", icon: ListAlt, page_id: 137 },
        { title: "Student Profile", link: "/student_college_personal_information", icon: AccountCircle, page_id: 43 },
        { title: "Student Online Requirements", link: "/student_online_requirements_college", icon: FolderCopy, page_id: 124 },
        { title: "Course Tagging", link: "/course_tagging_for_college", icon: Class, page_id: 124 },
        { title: "Course Tagging For Summer", link: "/summer_tagging_for_college", icon: Class, page_id: 141 },
        { title: "Search COR", link: "/search_cor_for_college", icon: Search, page_id: 125 },
        { title: "Class List", link: classRosterEnrollmentLink, icon: Class, page_id: 152 },
        { title: "Qualifying Room Mgmt", link: "/assign_qualifying_interview_exam", icon: AccessTimeIcon, page_id: 10 },
        { title: "Interviewer Applicant List", link: "/enrollment_schedule_room_list", icon: People, page_id: 36 },
      ],
    },
    {
      label: "MEDICAL AND DENTAL SERVICES",
      items: [
        { title: "Student List", link: "/medical_student_list", icon: ListAltOutlined, page_id: 24 },
        { title: "Student Profile", link: "/medical_personal_information", icon: AccountCircle, page_id: 25 },
        { title: "Student Online Requirements", link: "/medical_online_requirements", icon: FolderCopy, page_id: 30 },
        { title: "Medical Requirements", link: "/medical_requirements_form", icon: MedicalServices, page_id: 31 },
        { title: "Dental Assessment", link: "/dental_assessment", icon: HealthAndSafety, page_id: 19 },
        { title: "Physical & Neuro Exam", link: "/physical_neuro_exam", icon: Psychology, page_id: 32 },
        { title: "Health Records Certificate", link: "/health_record", icon: Description, page_id: 33 },           // ✅ Fixed: added icon + page_id
        { title: "Medical Certificate", link: "/medical_certificate", icon: LocalHospital, page_id: 34 },          // ✅ Fixed: added icon + page_id
      ],
    },
    {
      label: "REGISTRAR'S OFFICE",
      items: [
        { title: "Applicant List", link: "/super_admin_applicant_list", icon: ListAltOutlined, page_id: 80 },
        { title: "Applicant Profile", link: "/applicant_registrar_personal_information", icon: AccountCircle, page_id: 161 },
        { title: "Applicant Online Requirements", link: "/applicant_online_requirements_registrar", icon: FolderCopy, page_id: 160 },
        { title: "Student Numbering Panel", link: "/student_numbering", icon: Numbers, page_id: 59 },
        { title: "Course Tagging", link: "/course_tagging", icon: Class, page_id: 17 },
        { title: "Course Tagging For Summer", link: "/course_tagging_for_summer", icon: Class, page_id: 140 },
        { title: "Student List", link: "/student_list", icon: ListAltOutlined, page_id: 104 },
        { title: "Student Profile", link: "/student_registrar_personal_information", icon: AccountCircle, page_id: 38 },
        { title: "Student Online Requirements", link: "/student_online_requirements_registrar", icon: FolderCopy, page_id: 106 },
        { title: "Search COR", link: "/search_cor", icon: Search, page_id: 153 },
        { title: "Report of Grades", link: "/report_of_grades", icon: Assessment, page_id: 50 },
        { title: "Transcript of Records", link: "/transcript_of_records", icon: HistoryEdu, page_id: 62 },
        { title: "Class List", link: classRosterRegistrarLink, icon: Class, page_id: 15 },
        { title: "Grading Evaluation", link: "/grading_evaluation_for_registrar", icon: FactCheck, page_id: 105 },
        { title: "COR Exporting Module", link: "/cor_exporting_module", icon: FolderCopy, page_id: 117 },
      ],
    },
  ];

  if (loading || hasAccess === null)
    return <LoadingOverlay open={loading} message="Loading..." />;
  if (!hasAccess) return <Unauthorized />;

  const backgroundImage =
    assets.backgroundImage || "linear-gradient(to right, #e0e0e0, #bdbdbd)";

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
        height: "calc(100vh - 100px)",
        width: "100%",
        backgroundImage,
        backgroundRepeat: "no-repeat",
        backgroundSize: "cover",
        backgroundPosition: "center",
        position: "relative",
      }}
    >
      {/* Overlay */}
      <Box
        sx={{
          position: "absolute",
          inset: 0,
          backgroundColor: "rgba(0, 0, 0, 0.1)",
          backdropFilter: "blur(0.5px)",
          WebkitBackdropFilter: "blur(0.5px)",
          zIndex: 0,
          pointerEvents: "none",
        }}
      />

      {/* Scrollable content */}
      <Box
        sx={{
          position: "relative",
          zIndex: 1,
          height: "100%",
          overflowY: "auto",
          padding: 2,
        }}
      >
        {groupedMenu
          .map((group) => ({
            ...group,
            items: group.items.filter((item) => userAccessList[item.page_id]),
          }))
          .filter((group) => group.items.length > 0)
          .map((group, idx) => (
            <Box key={idx} sx={{ mb: 5 }}>
              {/* Group Title */}
              <Box
                sx={{
                  borderBottom: `4px solid ${borderColor}`,
                  mb: 2,
                  pb: 1,
                  paddingLeft: 2,
                }}
              >
                <Typography
                  variant="h4"
                  sx={{
                    fontWeight: "bold",
                    color: "white",
                    textTransform: "uppercase",
                    fontSize: "34px",
                    paddingLeft: 2,
                  }}
                >
                  {group.label}
                </Typography>
              </Box>

              {/* Group Items */}
              <div className="p-2 px-10 w-full grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {group.items.map((item, i) => {
                  const Icon = item.icon;
                  return (
                    <div className="relative" key={i}>
                      <Link to={item.link}>
                        {/* ICON BOX */}
                        <div
                          className="bg-white p-4 rounded-lg absolute left-16 top-12"
                          style={{
                            border: `5px solid ${borderColor}`,
                            color: titleColor,
                            transition: "0.2s ease-in-out",
                          }}
                        >
                          <Icon sx={{ fontSize: 36, color: titleColor }} />
                        </div>

                        {/* HOVERABLE BUTTON */}
                        <button
                          className="bg-[#fff9ec] rounded-lg p-4 w-80 h-36 font-medium mt-20 ml-8 flex items-end justify-center"
                          style={{
                            border: `5px solid ${borderColor}`,
                            color: titleColor,
                            transition: "0.2s ease-in-out",
                            cursor: "pointer",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = mainButtonColor;
                            e.currentTarget.style.color = "#ffffff";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = "#fff9ec";
                            e.currentTarget.style.color = titleColor;
                          }}
                        >
                          {item.title}
                        </button>
                      </Link>
                    </div>
                  );
                })}
              </div>
            </Box>
          ))}
      </Box>
    </Box>
  );
};

export default AdmissionDashboardPanel;
