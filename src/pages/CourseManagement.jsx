import React, { useState, useEffect, useContext } from "react";
import { SettingsContext } from "../App";
import axios from "axios";
import Unauthorized from "../components/Unauthorized";
import LoadingOverlay from "../components/LoadingOverlay";
import {
  CollectionsBookmark,
  EditNote,
  MenuBook,
  LibraryBooks,
} from "@mui/icons-material";
import { Link } from "react-router-dom";
import { Box, Typography } from "@mui/material";
import API_BASE_URL from "../apiConfig";

const CourseManagement = () => {
  const settings = useContext(SettingsContext);
  const colors = settings?.colors || {};
  const assets = settings?.assets || {};
  const branding = settings?.branding || {};
  const titleColor = colors.title || "#000000";
  const borderColor = colors.border || "#000000";
  const mainButtonColor = colors.mainButton || "#1976d2";
  const fetchedLogo = branding.logoUrl || null;

  // Access Control
  const [userID, setUserID] = useState("");
  const [userRole, setUserRole] = useState("");
  const [employeeID, setEmployeeID] = useState("");
  const [hasAccess, setHasAccess] = useState(null);
  const [loading, setLoading] = useState(false);

  const [userAccessList, setUserAccessList] = useState({});

  const pageId = 93;

  useEffect(() => {
    const storedUser = localStorage.getItem("email");
    const storedRole = localStorage.getItem("role");
    const storedID = localStorage.getItem("person_id");
    const storedEmployeeID = localStorage.getItem("employee_id");

    if (storedUser && storedRole && storedID && storedEmployeeID) {
      setUserRole(storedRole);
      setUserID(storedID);
      setEmployeeID(storedEmployeeID);

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
      label: "COURSE MANAGEMENT",
      items: [
        { title: "Program Tagging Panel", link: "/program_tagging", icon: CollectionsBookmark, page_id: 35 },
        { title: "Program Panel", link: "/program_panel", icon: LibraryBooks, page_id: 34 },
        { title: "Curriculum Panel", link: "/curriculum_panel", icon: EditNote, page_id: 18 },
        { title: "Course Panel", link: "/course_panel", icon: MenuBook, page_id: 16 },
        { title: "NSTP Tagging Panel", link: "/nstp_tagging", icon: MenuBook, page_id: 148 },
        { title: "Program Payment", link: "/program_payment", icon: LibraryBooks, page_id: 111 },
        { title: "Program Units", link: "/program_unit", icon: MenuBook, page_id: 113 },
        { title: "Prerequisite", link: "/prerequisite", icon: MenuBook, page_id: 112 },
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
                    <Link key={i} to={item.link} className="relative"> {/* ✅ Fixed: was item.path */}
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
                  );
                })}
              </div>
            </Box>
          ))}
      </Box>
    </Box>
  );
};

export default CourseManagement;
