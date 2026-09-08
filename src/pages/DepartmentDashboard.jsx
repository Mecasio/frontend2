import React, { useState, useEffect, useContext } from "react";
import { SettingsContext } from "../App";
import axios from "axios";
import Unauthorized from "../components/Unauthorized";
import LoadingOverlay from "../components/LoadingOverlay";
import {
  EventNote,
  Apartment,
  Assignment,
  MeetingRoom,
  MenuBook
} from "@mui/icons-material";
import { Link } from "react-router-dom";
import { Box, Typography } from "@mui/material";
import API_BASE_URL from "../apiConfig";
const DepartmentManagement = () => {
  const settings = useContext(SettingsContext);
  const colors = settings?.colors || {};
  const assets = settings?.assets || {};
  const titleColor = colors.title || "#000000";
  const borderColor = colors.border || "#000000";
  const mainButtonColor = colors.mainButton || "#1976d2";

  // Access Control
  const [userID, setUserID] = useState("");
  const [userRole, setUserRole] = useState("");
  const [employeeID, setEmployeeID] = useState("");
  const [hasAccess, setHasAccess] = useState(null);
  const [loading, setLoading] = useState(false);

  // ✅ access map
  const [userAccessList, setUserAccessList] = useState({});

  const pageId = 94; // Department Management

  // Load user and access
  useEffect(() => {
    const email = localStorage.getItem("email");
    const role = localStorage.getItem("role");
    const personID = localStorage.getItem("person_id");
    const empID = localStorage.getItem("employee_id");

    if (email && role && personID && empID) {
      setUserRole(role);
      setUserID(personID);
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

  // ✅ SAME FUNCTION FROM ADMISSION
  const fetchUserAccessList = async (employeeID) => {
    try {
      const { data } = await axios.get(
        `${API_BASE_URL}/api/page_access/${employeeID}`
      );

      const accessMap = data.reduce((acc, row) => {
        acc[row.page_id] = row.page_privilege === 1;
        return acc;
      }, {});

      setUserAccessList(accessMap);
    } catch (err) {
      console.error("Access list loading error:", err);
    }
  };

  // ✅ REAL PAGE IDS FROM YOUR TABLE
  const groupedMenu = [
    {
      label: "DEPARTMENT MANAGEMENT",
      items: [
        { title: "Schedule Plotting Form", link: "/select_college", icon: EventNote, page_id: 53 },
        { title: "Department Section Panel", link: "/department_section_panel", icon: Apartment, page_id: 20 },
        { title: "Department Panel", link: "/department_registration", icon: Assignment, page_id: 21 },
        { title: "Department Room Panel", link: "/department_room", icon: MeetingRoom, page_id: 22 },
        { title: "Department Section Tagging", link: "/department_section_tagging", icon: MeetingRoom, page_id: 149 },
        { title: "Slot Monitoring Panel", link: "/section_slot_monitoring", icon: MeetingRoom, page_id: 123 },
        { title: "Department Curriculum Panel", link: "/department_curriculum_panel", icon: MenuBook, page_id: 107 },
        { title: "College Schedule Plotting", link: "/college_schedule_plotting", icon: EventNote, page_id: 108 },
        { title: "Workload Management", link: "/workload_management", icon: EventNote },
      ],
    },
  ];

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

  if (loading || hasAccess === null)
    return <LoadingOverlay open={loading} message="Loading..." />;

  if (!hasAccess) return <Unauthorized />;

  const backgroundImage =
    assets.backgroundImage || "linear-gradient(to right, #e0e0e0, #bdbdbd)"

  return (
    <Box
      sx={{
        height: "calc(100vh - 100px)", // fixed viewport height
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
          height: "100%",        // take full height of parent
          overflowY: "auto",     // ✅ THIS allows scrolling
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

export default DepartmentManagement;
