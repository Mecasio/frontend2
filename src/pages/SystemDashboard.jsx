import React, { useState, useEffect, useContext } from "react";
import { SettingsContext } from "../App";
import axios from "axios";
import Unauthorized from "../components/Unauthorized";
import LoadingOverlay from "../components/LoadingOverlay";

import {
  Assignment,
  MeetingRoom,
  Class,
  Timeline,
  ChangeCircle,
  Update,
  Layers,
  CalendarToday,
  DateRange,
  Email,
  Settings,
  Campaign,
  School,           // âœ… Added
  Grade,            // âœ… Added
  EmojiEvents,      // âœ… Added
  AccountTree,      // âœ… Added
  People,           // âœ… Added
  Assessment,       // âœ… Added
  Payments,         // âœ… Added
  HistoryEdu,       // âœ… Added
  HelpOutline,      // âœ… Fixed: was imported as HelpOutlineIcon but used as HelpOutline
} from "@mui/icons-material";

import { Link } from "react-router-dom";
import { Box, Typography } from "@mui/material";
import API_BASE_URL from "../apiConfig";

const SystemDashboardPanel = () => {
  const settings = useContext(SettingsContext);

  const colors = settings?.colors || {};
  const assets = settings?.assets || {};
  const branding = settings?.branding || {};
  const titleColor = colors.title || "#000000";
  const borderColor = colors.border || "#000000";
  const mainButtonColor = colors.mainButton || "#1976d2";
  const shortTerm = branding.shortTerm || "";


  // Access Control
  const [userID, setUserID] = useState("");
  const [userRole, setUserRole] = useState("");
  const [employeeID, setEmployeeID] = useState("");
  const [hasAccess, setHasAccess] = useState(null);
  const [loading, setLoading] = useState(false);
  const [userAccessList, setUserAccessList] = useState({});

  const pageId = 95; // SYSTEM MANAGEMENT

  // Load user & access
  useEffect(() => {
    const email = localStorage.getItem("email");
    const role = localStorage.getItem("role");
    const id = localStorage.getItem("person_id");
    const empID = localStorage.getItem("employee_id");

    if (email && role && id && empID) {
      setUserRole(role);
      setUserID(id);
      setEmployeeID(empID);

      if (role === "registrar") {
        checkAccess(empID);
        fetchUserAccessList(empID);
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
      console.error("Access list failed:", err);
    }
  };

  const groupedMenu = [
    {
      key: "roomManagement", label: "Room Management", icon: MeetingRoom,
      items: [{ title: "Room Registration", link: "/room_registration", icon: MeetingRoom, page_id: 52 }]
    },
    {
      key: "requirementsManagement", label: "Requirements Management", icon: Assignment,
      items: [{ title: "Requirements Panel", link: "/requirements_form", icon: Assignment, page_id: 51 }]
    },
    {
      key: "profileSettings", label: "Profile & Settings", icon: Settings,
      items: [
        { title: `${shortTerm} Profile`, link: "/settings", icon: Settings, page_id: 74 },
        { title: "Signature Upload", link: "/signature_upload", icon: Settings, page_id: 114 },
      ]
    },
    {
      key: "academicConfiguration", label: "Academic Configuration", icon: School,
      items: [
        { title: "Grade Conversion Management", link: "/grade_conversion_admin", icon: Settings, page_id: 144 },
        { title: "Change Grading Period", link: "/change_grade_period", icon: ChangeCircle, page_id: 14 },
        { title: "Student Grade File", link: "/student_grade_file", icon: Grade, page_id: 126 },
        { title: "Academic Achiever Awardee's", link: "/honors_report", icon: EmojiEvents, page_id: 146 },
      ]
    },
    {
      key: "branchAdministration", label: "Branch Administration", icon: AccountTree,
      items: [{ title: "Branch Management", link: "/admin_branches", icon: AccountTree, page_id: 138 }]
    },
    {
      key: "communicationManagement", label: "Communication", icon: Campaign,
      items: [
        { title: "Email Sender", link: "/email_template_manager", icon: Email, page_id: 67 },
        { title: "Announcement", link: "/announcement", icon: Campaign, page_id: 66 },
      ]
    },
    {
      key: "slotConfiguration", label: "Slot Configuration", icon: School,
      items: [{ title: "Program Slot Remaining", link: "/program_slot_limit", icon: People, page_id: 110 }]
    },
    {
      key: "sectionManagement", label: "Section Management", icon: Class,
      items: [{ title: "Section Panel Form", link: "/section_panel", icon: Class, page_id: 57 }, { title: "Section Slot Management", link: "/section_slot_management", icon: MeetingRoom, page_id: 167 }]
    },
    {
      key: "semesterManagement", label: "Semester Management", icon: Timeline,
      items: [{ title: "Semester Panel Form", link: "/semester_panel", icon: Timeline, page_id: 58 }]
    },
    {
      key: "yearManagement", label: "Year Management", icon: CalendarToday,
      items: [
        { title: "Year Level Panel Form", link: "/year_level_panel", icon: Layers, page_id: 63 },
        { title: "Year Panel Form", link: "/year_panel", icon: CalendarToday, page_id: 64 },
        { title: "School Year Panel", link: "/school_year_panel", icon: DateRange, page_id: 55 },
      ]
    },
    {
      key: "evaluationManagement", label: "Evaluation Management", icon: Assessment,
      items: [
        { title: "Evaluation Management", link: "/evaluation_crud", icon: HelpOutline, page_id: 23 },
        { title: "TOSF CRUD", link: "/tosf_crud", icon: HelpOutline, page_id: 99 },
      ]
    },
    {
      key: "paymentManagement", label: "Payment Management", icon: Payments,
      items: [
        { title: "Payment Exporting Module", link: "/payment_exporting_module", icon: HelpOutline, page_id: 116 },
        { title: "Receipt Counter Assignment", link: "/assign_receipt_counter", icon: HelpOutline, page_id: 122 },
        { title: "Matriculation Payment", link: "/matriculation_payment", icon: HelpOutline, page_id: 121 },
      ]
    },
    {
      key: "scholarshipManagement", label: "Scholarship Management", icon: School,
      items: [{ title: "Student Scholarship List", link: "/student_scholarship_list", icon: HelpOutline, page_id: 116 }]
    },
    {
      key: "systemLogs", label: "System Logs", icon: HistoryEdu,
      items: [{ title: "Audit Logs", link: "/audit_logs", icon: HistoryEdu, page_id: 154 }]
    },
    {
      key: "registrarResetPasswords", label: "Reset Password", icon: Settings,
      items: [{ title: "Registrar Reset Password", link: "/registrar_reset_password", icon: Settings, page_id: 73 }]
    },
  ];

  if (loading || hasAccess === null)
    return <LoadingOverlay open={loading} message="Loading..." />;

  if (!hasAccess) return <Unauthorized />;

  const backgroundImage =
    assets.backgroundImage || "linear-gradient(to right, #e0e0e0, #bdbdbd)";


  // ðŸ”’ Disable right-click
  document.addEventListener("contextmenu", (e) => e.preventDefault());

  // ðŸ”’ Block DevTools shortcuts + Ctrl+P silently
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
              {/* HEADER */}
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
                  }}
                >
                  {group.label}
                </Typography>
              </Box>

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
                            e.currentTarget.style.border = `5px solid ${borderColor}`;
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = "#fff9ec";
                            e.currentTarget.style.color = titleColor;
                            e.currentTarget.style.border = `5px solid ${borderColor}`;
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

export default SystemDashboardPanel;