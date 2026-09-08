import React, { useState, useEffect, useContext } from "react";
import { SettingsContext } from "../App";

import {
  PersonAdd,
  LockReset,
  People,
  School,
  SupervisorAccount,
  AdminPanelSettings,
  Info,
  Settings,
  TableChart,
  Security,
  Search,
  Badge,
  Assignment,
  FolderCopy,
} from "@mui/icons-material";

import { Link } from "react-router-dom";
import { Box, Typography } from "@mui/material";
import axios from "axios";
import Unauthorized from "../components/Unauthorized";
import LoadingOverlay from "../components/LoadingOverlay";
import API_BASE_URL from "../apiConfig";

const AccountDashboard = () => {
  const settings = useContext(SettingsContext);
  const colors = settings?.colors || {};
  const assets = settings?.assets || {};
  const titleColor = colors.title || "#000000";
  const borderColor = colors.border || "#000000";
  const mainButtonColor = colors.mainButton || "#1976d2";

  // Access control
  const [userID, setUserID] = useState("");
  const [userRole, setUserRole] = useState("");
  const [employeeID, setEmployeeID] = useState("");
  const [hasAccess, setHasAccess] = useState(null);
  const [loading, setLoading] = useState(false);

  // Access List Map
  const [userAccessList, setUserAccessList] = useState({});

  const pageId = 96; // ACCOUNT MANAGEMENT

  // Load user & access
  useEffect(() => {
    const email = localStorage.getItem("email");
    const role = localStorage.getItem("role");
    const id = localStorage.getItem("person_id");
    const empID = localStorage.getItem("employee_id");

    if (email && role && id && empID) {
      setUserID(id);
      setUserRole(role);
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
      const res = await axios.get(
        `${API_BASE_URL}/api/page_access/${employeeID}/${pageId}`
      );
      setHasAccess(res.data?.page_privilege === 1);
    } catch (err) {
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
      console.error("Access list error:", err);
    }
  };

  const groupedMenu = [
    {
      key: "accountCreation", label: "Account Creation", icon: PersonAdd,
      items: [
        { title: "Add Faculty Accounts", link: "/register_prof", icon: PersonAdd, page_id: 70 },
        { title: "Add Registrar Account", link: "/register_registrar", icon: AdminPanelSettings, page_id: 71 },
        { title: "Create Student Account", link: "/student_accounts", icon: School, page_id: 143 },
        { title: "Super Admin Application Process", link: "/application_super_admin", icon: School, page_id: 148 },
      ],
    },
    {
      key: "facultyManagement", label: "Faculty Management", icon: SupervisorAccount,
      items: [
        { title: "Professor Education", link: "/superadmin_professor_education", icon: School, page_id: 109 },
      ],
    },
    {
      key: "applicantManagement", label: "Applicant Management", icon: Badge,
      items: [
        { title: "Applicant Information", link: "/applicant_admin_personal_information", icon: Info, page_id: 75 },
        { title: "Applicant Online Requirements", link: "/applicant_online_requirements_admin", icon: Assignment, page_id: 84 },
        { title: "Archive", link: "/archived", icon: FolderCopy, page_id: 142 },
        { title: "Upload Applicants", link: "/upload_applicants", icon: FolderCopy, page_id: 166 },
      ],
    },
    {
      key: "studentManagement", label: "Student Management", icon: School,
      items: [
        { title: "Student Information", link: "/student_admin_personal_information", icon: Info, page_id: 86 },
        { title: "Student Online Requirements", link: "/student_online_requirements_admin", icon: Assignment, page_id: 150 },
        { title: "Edit Personal Information", link: "/admin_student_edit_permissions1", icon: FolderCopy, page_id: 155 },
        { title: "Edit Family Background", link: "/admin_student_edit_permissions2", icon: FolderCopy, page_id: 156 },
        { title: "Edit Educational Background", link: "/admin_student_edit_permissions3", icon: FolderCopy, page_id: 157 },
        { title: "Edit Health & Medical Records", link: "/admin_student_edit_permissions4", icon: FolderCopy, page_id: 158 },
        { title: "Edit Other Information", link: "/admin_student_edit_permissions5", icon: FolderCopy, page_id: 159 },
      ],
    },
    {
      key: "accessControl", label: "Access Control", icon: Security,
      items: [
        { title: "User Page Access", link: "/user_page_access", icon: Security, page_id: 72 },
        { title: "Page Table", link: "/page_crud", icon: TableChart, page_id: 72 },
      ],
    },
    {
      key: "passwordManagement", label: "Password Management", icon: LockReset,
      items: [
        { title: "Applicant Reset Password", link: "/superadmin_applicant_reset_password", icon: People, page_id: 81 },
        { title: "Student Reset Password", link: "/superadmin_student_reset_password", icon: School, page_id: 91 },
        { title: "Faculty Reset Password", link: "/superadmin_faculty_reset_password", icon: SupervisorAccount, page_id: 82 },
        { title: "Registrar Reset Password", link: "/superadmin_registrar_reset_password", icon: AdminPanelSettings, page_id: 83 },
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
              {/* Header */}
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

              {/* Items */}
              <div className="p-2 px-10 w-full grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {group.items.map((item, i) => {
                  const Icon = item.icon;
                  return (
                    <div className="relative" key={i}>
                      <Link to={item.link}> {/* ✅ Fixed: was item.path */}
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

export default AccountDashboard;
