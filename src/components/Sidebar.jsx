import React, { useState, useEffect, useContext } from "react";
import { SettingsContext } from "../App";
import { Link, useNavigate } from "react-router-dom";
import {
  AccountCircle,
  AdminPanelSettings,
  Assessment,
  Assignment,
  Badge,
  CalendarToday,
  Campaign,
  ChangeCircle,
  Class,
  CollectionsBookmark,
  DateRange,
  EditCalendar,
  EditNote,
  Email,
  EventNote,
  FactCheck,
  FolderCopy,
  FormatListNumbered,
  HealthAndSafety,
  HelpOutline,
  HistoryEdu,
  Info,
  Layers,
  ListAlt,
  ListAltOutlined,
  MedicalServices,
  MeetingRoom,
  MenuBook,
  Numbers,
  PersonAdd,
  Psychology,
  School,
  Score,
  Search,
  Security,
  SupervisorAccount,
  TableChart,
  Timeline,
  Apartment,
  Business,
  LibraryBooks,
  People,
  LogoutOutlined,
  Settings,
  ExpandMore,
  ExpandLess,
  Menu,
  Grading,
  PhotoCamera,
} from "@mui/icons-material";

import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import ContactsIcon from "@mui/icons-material/Contacts";
import PaymentIcon from "@mui/icons-material/Payment";
import DashboardIcon from "@mui/icons-material/Dashboard";
import AssignmentIndIcon from "@mui/icons-material/AssignmentInd";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import LockResetIcon from "@mui/icons-material/LockReset";
import { Avatar, Tooltip, Divider } from "@mui/material";
import axios from "axios";
import EventNoteIcon from "@mui/icons-material/EventNote";
import GradeIcon from "@mui/icons-material/Grade";
import AssignmentTurnedInIcon from "@mui/icons-material/AssignmentTurnedIn";
import PersonIcon from "@mui/icons-material/Person";
import ListAltIcon from "@mui/icons-material/ListAlt";
import WorkIcon from "@mui/icons-material/Work";
import SchoolIcon from "@mui/icons-material/School";
import AddCircleIcon from "@mui/icons-material/AddCircle";
import API_BASE_URL from "../apiConfig";
import { syncRegistrarScopeFromEmployeeResponse } from "../utils/registrarCurriculumRestriction";
import { logout as logoutUser } from "../utils/authSession";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import {
  AccountTree,
  Payments,
  CloudUpload,
  Grade,
  EmojiEvents,
  LockReset,
} from "@mui/icons-material";
import HistoryIcon from "@mui/icons-material/History";

const GLOBAL_PAGE_IDS = [
  13, 15, 17, 38, 39, 40, 41, 42, 50, 56, 59, 62, 73, 80, 92, 96, 101, 104, 105,
  106, 117,
];
const GLOBAL_ACCESS_THRESHOLD = 10;

/* ─────────────────────────────────────────
   Style builder
───────────────────────────────────────── */
function buildStyles(
  s = {},
  hasDept = true,
  collapsed = false,
  isMobile = false,
) {
  const accent = s.main_button_color || "#8b1a1a";
  const border = s.border_color || "#e8e8e8";
  const subBtnColor = s.sub_button_color || "#f5f5f5";

  const effectiveCollapsed = isMobile ? false : collapsed;
  const W = effectiveCollapsed ? "75px" : "290px";

  return `
@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600&display=swap');

.sb-root {
  font-family:'Poppins',sans-serif;
  width:${W}; height:calc(100vh - 64px - 42px);
  background:#fff; display:flex; flex-direction:column;
  border-right:1px solid ${border};
  position:fixed; top:64px; bottom:42px; left:0;
  z-index:${isMobile ? 1300 : 100}; overflow:hidden;
  transition:width .34s cubic-bezier(.22,1,.36,1), transform .34s cubic-bezier(.22,1,.36,1);
  will-change:width, transform;
}

@media (max-width: 767px) {
  .sb-root {
    width: 290px !important;
    height: 100vh !important;
    height: 100dvh !important;
    top: 0 !important;
    bottom: 0 !important;
    left: 0 !important;
    transform: translateX(-100%);
    z-index: 1300;
    box-shadow: 4px 0 24px rgba(0,0,0,.18);
    display: flex !important;
    flex-direction: column !important;
    overflow: hidden !important;
    position: fixed !important;
  }
  .sb-root.mobile-open {
    transform: translateX(0);
  }
  .sb-root .sb-header {
    flex-shrink: 0 !important;
    overflow: visible !important;
  }
  .sb-root .sb-scroll {
    flex: 1 1 auto !important;
    overflow-y: auto !important;
    overflow-x: hidden !important;
    min-height: 0 !important;
    max-height: none !important;
    -webkit-overflow-scrolling: touch;
  }
  .sb-root .sb-footer {
    flex-shrink: 0 !important;
    position: relative !important;
    bottom: auto !important;
    margin-top: auto !important;
    border-top: 1px solid #f0f0f0;
    background: #fff;
  }
}
.sb-overlay {
  display: none;
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.45);
  z-index: 1299;
}
@media (max-width: 767px) {
  .sb-overlay.visible {
    display: block;
  }
}

.sb-header { background: lightgray; flex-shrink:0; }

.sb-topbar {
  display:flex; align-items:center;
  padding:${effectiveCollapsed ? "13px 0" : "11px 16px"};
  gap:${effectiveCollapsed ? "0" : "10px"};
  justify-content:${effectiveCollapsed ? "center" : "flex-start"};
  transition:padding .34s cubic-bezier(.22,1,.36,1), gap .34s cubic-bezier(.22,1,.36,1);
}
.sb-hamburger {
  display:flex; align-items:center; justify-content:center;
  cursor:pointer; color:black; background:transparent; border:none;
  padding:0; flex-shrink:0;
}
.sb-topbar-label {
  flex:1; color:black; font-size:13.5px; font-weight:500;
  white-space:nowrap; overflow:hidden;
  max-width:${effectiveCollapsed ? "0" : "180px"};
  opacity:${effectiveCollapsed ? "0" : "1"};
  transform:translateX(${effectiveCollapsed ? "-6px" : "0"});
  transition:max-width .3s cubic-bezier(.22,1,.36,1), opacity .18s ease, transform .28s ease;
}

.sb-profile {
  display:flex; align-items:center;
  gap:${effectiveCollapsed ? "0" : "12px"};
  padding:${effectiveCollapsed ? "8px 0 13px" : "8px 16px 16px"};
  justify-content:${effectiveCollapsed ? "center" : "flex-start"};
  transition:padding .34s cubic-bezier(.22,1,.36,1), gap .34s cubic-bezier(.22,1,.36,1);
}
.sb-avatar-wrap { position:relative; flex-shrink:0; }
.sb-upload-btn {
  position:absolute; bottom:-3px; right:-3px;
  cursor:pointer; display:flex; align-items:center; justify-content:center;
  background:#fff; border-radius:50%; width:18px; height:18px;
  box-shadow:0 1px 4px rgba(0,0,0,.25);
}
.sb-profile-info {
  overflow:hidden;
  max-width:${effectiveCollapsed ? "0" : "190px"};
  opacity:${effectiveCollapsed ? "0" : "1"};
  transform:translateX(${effectiveCollapsed ? "-6px" : "0"});
  transition:max-width .3s cubic-bezier(.22,1,.36,1), opacity .18s ease, transform .28s ease;
}
.sb-profile-name {
  font-size:14.5px; font-weight:600; color: black;
  white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:175px;
}
.sb-profile-role {
  font-size:11.5px; color:black; margin-top:2px;
  white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:175px;
}
.sb-profile-dept {
  font-size:11px; color:black; margin-top:1px;
  display:${hasDept ? "block" : "none"};
  opacity:${effectiveCollapsed ? "0" : "1"};
  transition:opacity .18s ease;
}

.sb-scroll {
  flex:1; overflow-y:auto; overflow-x:hidden;
  padding:${effectiveCollapsed ? "6px 6px 0" : "6px 10px 0"};
  scrollbar-width:thin; scrollbar-color:${border} transparent;
  transition:padding .34s cubic-bezier(.22,1,.36,1);
  -webkit-overflow-scrolling: touch;
}
.sb-scroll::-webkit-scrollbar { width:4px; }
.sb-scroll::-webkit-scrollbar-track { background:transparent; }
.sb-scroll::-webkit-scrollbar-thumb { background:${border}; border-radius:4px; }

.sb-section-label {
  font-size:12px; font-weight:700; text-transform:uppercase;
  letter-spacing:.07em; color:#000; padding:${effectiveCollapsed ? "0" : "9px 8px 3px"};
  white-space:nowrap; overflow:hidden;
  max-width:${effectiveCollapsed ? "0" : "220px"};
  height:${effectiveCollapsed ? "0" : "auto"};
  opacity:${effectiveCollapsed ? "0" : "1"};
  transform:translateX(${effectiveCollapsed ? "-6px" : "0"});
  transition:max-width .3s cubic-bezier(.22,1,.36,1), opacity .18s ease, transform .28s ease, padding .34s cubic-bezier(.22,1,.36,1);
}
.sb-item {
  display:flex; align-items:center;
  gap:${effectiveCollapsed ? "0" : "10px"};
  padding:${effectiveCollapsed ? "3px 0" : "8px 10px"};
  border-radius:8px; cursor:pointer;
  color:#111; font-size:13px; font-weight:400;
  transition:background .18s ease, color .18s ease, padding .34s cubic-bezier(.22,1,.36,1), gap .34s cubic-bezier(.22,1,.36,1);
  text-decoration:none; margin-bottom:2px;
  line-height:1.25;
  justify-content:${effectiveCollapsed ? "center" : "flex-start"};
  min-height: 44px;
}
.sb-item .sb-icon {
  display:flex; align-items:center; justify-content:center;
  flex-shrink:0; color:#111;
  min-width:${effectiveCollapsed ? "auto" : "22px"};
}
.sb-item:hover { background:${accent}; color:#fff; }
.sb-item:hover .sb-icon { color:#fff; }
.sb-item.active { background:${accent}; color:#fff !important; }
.sb-item.active .sb-icon { color:#fff !important; }
.sb-item-label {
  flex:1; min-width:0;
  white-space:${effectiveCollapsed ? "nowrap" : "normal"};
  word-break:break-word;
  overflow:${effectiveCollapsed ? "hidden" : "visible"};
  max-height:${effectiveCollapsed ? "0" : "200px"};
  max-width:${effectiveCollapsed ? "0" : "190px"};
  opacity:${effectiveCollapsed ? "0" : "1"};
  transform:translateX(${effectiveCollapsed ? "-6px" : "0"});
  transition:max-width .3s cubic-bezier(.22,1,.36,1), opacity .18s ease, transform .28s ease;
}
.sb-sub-item { padding-left:${effectiveCollapsed ? "0" : "20px"}; }
.sb-group-btn {
  display:flex; align-items:center;
  gap:${effectiveCollapsed ? "0" : "10px"};
  width:100%; padding:${effectiveCollapsed ? "3px 0" : "8px 10px"};
  border-radius:8px; border:none; background:transparent; cursor:pointer;
  color:#111; font-size:13px; font-weight:400;
  font-family:'Poppins',sans-serif;
  transition:background .18s ease, padding .34s cubic-bezier(.22,1,.36,1), gap .34s cubic-bezier(.22,1,.36,1);
  text-align:left; margin-bottom:2px; line-height:1.25;
  justify-content:${effectiveCollapsed ? "center" : "flex-start"};
  min-height: 44px;
}
.sb-group-btn .sb-icon { color:#111; min-width:${effectiveCollapsed ? "auto" : "22px"}; }
.sb-group-btn:hover { background:${accent}; color:#fff; }
.sb-group-btn:hover .sb-icon { color:#fff; }
.sb-group-btn.open { color:${accent}; background:${subBtnColor}; }
.sb-group-btn.open .sb-icon { color:${accent}; }
.sb-group-label {
  flex:1; min-width:0;
  white-space:${effectiveCollapsed ? "nowrap" : "normal"};
  word-break:break-word;
  overflow:${effectiveCollapsed ? "hidden" : "visible"};
  max-height:${effectiveCollapsed ? "0" : "200px"};
  max-width:${effectiveCollapsed ? "0" : "190px"};
  opacity:${effectiveCollapsed ? "0" : "1"};
  transform:translateX(${effectiveCollapsed ? "-6px" : "0"});
  transition:max-width .3s cubic-bezier(.22,1,.36,1), opacity .18s ease, transform .28s ease;
}
.sb-group-chevron {
  flex-shrink:0;
  max-width:${effectiveCollapsed ? "0" : "24px"};
  opacity:${effectiveCollapsed ? "0" : ".5"};
  overflow:hidden;
  transition:max-width .3s cubic-bezier(.22,1,.36,1), opacity .18s ease;
}

.sb-divider { height:1px; background:#f0f0f0; margin:${effectiveCollapsed ? "2px 0" : "6px 0"}; }
.sb-scroll .MuiDivider-root { margin:${effectiveCollapsed ? "2px 0 !important" : "5px 0 !important"}; }

.sb-footer {
  padding:${effectiveCollapsed ? "8px 6px" : "8px 10px"};
  border-top:1px solid #f0f0f0; flex-shrink:0;
  transition:padding .34s cubic-bezier(.22,1,.36,1);
}
.sb-logout {
  display:flex;
  align-items:center;
  gap:${effectiveCollapsed ? "0" : "10px"};
  padding:${effectiveCollapsed ? "3px 0" : "8px 10px"};
  border-radius:8px;
  cursor:pointer;
  font-size:13px;
  font-weight:500;
  color:white; /* changed from #111 */
}
.sb-logout:hover { background:${accent}; color:#fff; }
.sb-logout-icon { color:#111; display:flex; align-items:center; }
.sb-logout:hover .sb-logout-icon { color:#fff; }
.sb-logout-label {
  overflow:hidden; white-space:nowrap;
  max-width:${effectiveCollapsed ? "0" : "120px"};
  opacity:${effectiveCollapsed ? "0" : "1"};
  transform:translateX(${effectiveCollapsed ? "-6px" : "0"});
  transition:max-width .3s cubic-bezier(.22,1,.36,1), opacity .18s ease, transform .28s ease;
}
  `;
}

const SIDEBAR_ICON_SIZE = 24;

const ICON_CONTAINER_STYLE = {
  width: 34,
  height: 34,
  borderRadius: "10px",
  border: "gray",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  transition: "all .2s ease",
};

function injectStyles(settings, hasDept, collapsed, isMobile) {
  let tag = document.getElementById("sb-styles");
  if (!tag) {
    tag = document.createElement("style");
    tag.id = "sb-styles";
    document.head.appendChild(tag);
  }
  tag.textContent = buildStyles(settings, hasDept, collapsed, isMobile);
}

/* ─────────────────────────────────────────
   Sub-components
───────────────────────────────────────── */
function NavItem({
  to,
  icon: Icon,
  label,
  active,
  onClick,
  sub = false,
  collapsed = false,
  onNavClick,
}) {
  const cls = ["sb-item", active ? "active" : "", sub ? "sb-sub-item" : ""]
    .filter(Boolean)
    .join(" ");

  const handleClick = (e) => {
    if (onClick) onClick(e);
    if (onNavClick) onNavClick();
  };

  const inner = (
    <>
      {Icon && (
        <span
          className="sb-icon"
          style={{
            ...ICON_CONTAINER_STYLE,
            border: active
              ? "1.5px solid white"
              : "1.5px solid rgba(0,0,0,.08)",
          }}
        >
          <Icon sx={{ fontSize: SIDEBAR_ICON_SIZE }} />
        </span>
      )}
      <span className="sb-item-label">{label}</span>
    </>
  );

  const node = onClick ? (
    <div className={cls} onClick={handleClick}>
      {inner}
    </div>
  ) : (
    <Link to={to} className={cls} onClick={onNavClick}>
      {inner}
    </Link>
  );

  return collapsed ? (
    <Tooltip title={label} placement="right" arrow>
      {node}
    </Tooltip>
  ) : (
    node
  );
}

function GroupToggle({ label, icon: Icon, open, onToggle, collapsed = false }) {
  const btn = (
    <button
      type="button"
      className={`sb-group-btn${open ? " open" : ""}`}
      onClick={onToggle}
    >
      {Icon && (
        <span
          className="sb-icon"
          style={{
            ...ICON_CONTAINER_STYLE,
            border: open ? "1.5px solid black" : "1.5px solid rgba(0,0,0,.08)",
          }}
        >
          <Icon sx={{ fontSize: SIDEBAR_ICON_SIZE }} />
        </span>
      )}
      <span className="sb-group-label">{label}</span>
      <span className="sb-group-chevron">
        {open ? (
          <ExpandLess sx={{ fontSize: 18 }} />
        ) : (
          <ExpandMore sx={{ fontSize: 18 }} />
        )}
      </span>
    </button>
  );

  return collapsed ? (
    <Tooltip title={label} placement="right" arrow>
      {btn}
    </Tooltip>
  ) : (
    btn
  );
}

function ProfileUploadInput({ id, onChange }) {
  return (
    <input
      id={id}
      type="file"
      accept="image/*"
      onChange={onChange}
      style={{ display: "none" }}
    />
  );
}

/* ─────────────────────────────────────────
   SideBar
───────────────────────────────────────── */
const SideBar = ({
  setIsAuthenticated,
  profileImage,
  setProfileImage,
  onCollapseChange,
  mobileOpen,
  onMobileClose,
  onLogout,
}) => {
  const settings = useContext(SettingsContext);
  const colors = settings?.colors || {};
  const branding = settings?.branding || {};
  const headerColor = colors.header || "#1976d2";
  const navigate = useNavigate();

  const accentColor = colors.mainButton || "#8b1a1a";
  const shortTerm = branding.shortTerm || "EARIST";

  const [collapsed, setCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [role, setRole] = useState("");
  const [userRole, setUserRole] = useState("");
  const [employeeID, setEmployeeID] = useState("");
  const [personData, setPersonData] = useState({
    profile_image: "",
    fname: "",
    lname: "",
    role: "",
  });
  const [userAccessList, setUserAccessList] = useState({});
  const [accessDescription, setAccessDescription] = useState("");
  const [dir, setDir] = useState("Admin1by1");
  const [classRosterScope, setClassRosterScope] = useState(null);
  const [globalAccessCount, setGlobalAccessCount] = useState(0);
  const [groupOpen, setGroupOpen] = useState({});

  // ── Force password change gate ──
  // Reads the flag from localStorage on mount; also listens for the custom
  // "password_changed" event fired by the reset-password pages on success so
  // the sidebar unlocks immediately without a full page reload.
  const [forcePasswordChange, setForcePasswordChange] = useState(
    () => localStorage.getItem("force_password_change") === "true",
  );

  useEffect(() => {
    const syncFlag = () => {
      setForcePasswordChange(
        localStorage.getItem("force_password_change") === "true",
      );
    };
    // "storage" fires when another tab changes localStorage
    window.addEventListener("storage", syncFlag);
    // "password_changed" is a custom event fired in the same tab by reset-password pages
    window.addEventListener("password_changed", syncFlag);
    return () => {
      window.removeEventListener("storage", syncFlag);
      window.removeEventListener("password_changed", syncFlag);
    };
  }, []);

  // Detect mobile on resize
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (!mobile && mobileOpen) {
        onMobileClose?.();
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [mobileOpen, onMobileClose]);

  // Lock body scroll when mobile drawer is open
  useEffect(() => {
    if (isMobile && mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMobile, mobileOpen]);

  const toggleGroup = (key) => {
    if (collapsed && !isMobile) {
      setCollapsed(false);
      setTimeout(() => setGroupOpen((p) => ({ ...p, [key]: true })), 260);
    } else {
      setGroupOpen((p) => ({ ...p, [key]: !p[key] }));
    }
  };
  const isGroupOpen = (key) => {
    const effectiveCollapsed = isMobile ? false : collapsed;
    return !effectiveCollapsed && groupOpen[key] === true;
  };
  const hasDept = !!personData?.dprtmnt_code;

  const effectiveCollapsed = isMobile ? false : collapsed;

  useEffect(() => {
    injectStyles(settings, hasDept, collapsed, isMobile);
  }, [settings, hasDept, collapsed, isMobile]);
  useEffect(() => {
    onCollapseChange?.(isMobile ? false : collapsed);
  }, [collapsed, isMobile, onCollapseChange]);

  /* auth */
  useEffect(() => {
    const token = localStorage.getItem("token");
    const savedRole = localStorage.getItem("role");
    const storedID =
      savedRole === "faculty"
        ? localStorage.getItem("prof_id") || localStorage.getItem("employee_id")
        : localStorage.getItem("person_id");
    if (token && savedRole && storedID) {
      try {
        const decoded = JSON.parse(atob(token.split(".")[1]));
        if (decoded.exp < Date.now() / 1000) {
          ["token", "role", "person_id", "prof_id", "employee_id"].forEach(
            (k) => localStorage.removeItem(k),
          );
          setIsAuthenticated(false);
          navigate("/");
        } else {
          setRole(savedRole);
          fetchPersonData(storedID, savedRole);
          setIsAuthenticated(true);
        }
      } catch {
        ["token", "role", "prof_id", "employee_id"].forEach((k) =>
          localStorage.removeItem(k),
        );
        setIsAuthenticated(false);
        navigate("/");
      }
    } else {
      setIsAuthenticated(false);
      navigate("/");
    }
  }, []);

  /* access + scope */
  useEffect(() => {
    const email = localStorage.getItem("email");
    const r = localStorage.getItem("role");
    const id =
      r === "faculty"
        ? localStorage.getItem("prof_id") || localStorage.getItem("employee_id")
        : localStorage.getItem("person_id");
    const empID = localStorage.getItem("employee_id");
    if (!email || !r || !id) {
      window.location.href = "/login";
      return;
    }
    setUserRole(r);
    if (r === "applicant") {
      setIsAuthenticated(true);
      return;
    }
    if (r === "faculty") {
      if (empID) setEmployeeID(empID);
      setIsAuthenticated(true);
      return;
    }
    if (!empID) {
      window.location.href = "/login";
      return;
    }
    setEmployeeID(empID);
    fetchUserAccessList(empID);
    const determineScope = async (eid) => {
      try {
        const { data: emp } = await axios.get(
          `${API_BASE_URL}/api/employee/${eid}`, { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` } },
        );
        syncRegistrarScopeFromEmployeeResponse(emp);
        const mc = (emp?.accessList ?? []).filter((pid) =>
          GLOBAL_PAGE_IDS.includes(pid),
        ).length;
        setGlobalAccessCount(mc);
        if (mc > GLOBAL_ACCESS_THRESHOLD) {
          setClassRosterScope("GLOBAL");
          return;
        }
        const { data: adm } = await axios.get(
          `${API_BASE_URL}/api/admin_data/${localStorage.getItem("email")}`, { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` } },
        );
        const hasDepartmentScope =
          adm?.dprtmnt_id ||
          (Array.isArray(adm?.dprtmnt_ids) && adm.dprtmnt_ids.length > 0);
        setClassRosterScope(hasDepartmentScope ? "DEPARTMENT" : "GLOBAL");
      } catch {
        setClassRosterScope("GLOBAL");
      }
    };
    determineScope(empID);
  }, []);

  useEffect(() => {
    if (userRole === "faculty") return;
    if (!employeeID) return;
    axios
      .get(`${API_BASE_URL}/api/access_level/${employeeID}`, { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` } })
      .then((r) => setAccessDescription(r.data?.access_description || ""))
      .catch(() => { });
  }, [employeeID, userRole]);

  useEffect(() => {
    const map = {
      applicant: "Applicant1by1",
      student: "Student1by1",
      faculty: "Faculty1by1",
    };
    setDir(map[userRole] || "Admin1by1");
  }, [userRole]);

  const fetchPersonData = async (id, r) => {
    try {
      if (r === "faculty") {
        const profID = localStorage.getItem("prof_id");
        const employeeID = localStorage.getItem("employee_id");
        const endpoint = profID
          ? `/api/get_prof_data_by_prof/${profID}`
          : `/api/get_prof_data_by_employee/${employeeID || id}`;
        const res = await axios.get(`${API_BASE_URL}${endpoint}`, { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` } });
        const faculty = res.data[0] || {};
        localStorage.setItem("prof_id", faculty.prof_id || "");
        localStorage.setItem(
          "employee_id",
          faculty.employee_id || employeeID || "",
        );
        if (faculty.employee_id || employeeID)
          setEmployeeID(faculty.employee_id || employeeID);
        setPersonData(faculty);
        return;
      }
      const res = await axios.get(`${API_BASE_URL}/api/person_data/${id}/${r}`, { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` } });
      setPersonData(res.data);
    } catch { }
  };

  const fetchUserAccessList = async (eid) => {
    try {
      const { data } = await axios.get(
        `${API_BASE_URL}/api/page_access/${eid}`, { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` } },
      );
      const accessMap = (data || []).reduce((a, i) => {
        a[i.page_id] = i.page_privilege === 1;
        return a;
      }, {});
      const role = String(localStorage.getItem("role") || "").trim().toLowerCase();
      if (role === "superadmin" || role === "technical") {
        accessMap[69] = true;
      }
      setUserAccessList(accessMap);
    } catch { }
  };

  const Logout = () => {
    (onLogout || logoutUser)();
    setIsAuthenticated(false);
    onMobileClose?.();
  };

  const makeUploadHandler = (endpoint, uploadDir) => async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (role === "applicant") setProfileImage(URL.createObjectURL(file));
    try {
      const pid = localStorage.getItem("person_id");
      const employeeID = localStorage.getItem("employee_id");
      const r = localStorage.getItem("role");
      const fd = new FormData();
      fd.append("profile_picture", file);
      if (r === "faculty") fd.append("employee_id", employeeID);
      else fd.append("person_id", pid);
      await axios.post(`${API_BASE_URL}${endpoint}`, fd, { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` } });
      const upd =
        r === "faculty"
          ? await axios.get(
            `${API_BASE_URL}/api/get_prof_data_by_employee/${employeeID}`, { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` } },
          )
          : await axios.get(`${API_BASE_URL}/api/person_data/${pid}/${r}`, { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` } });
      const updatedData = r === "faculty" ? upd.data[0] : upd.data;
      setPersonData(updatedData);
      const updatedProfileImage = `${API_BASE_URL}/uploads/${uploadDir}/${updatedData.profile_image}?t=${Date.now()}`;
      setProfileImage(updatedProfileImage);
      window.dispatchEvent(
        new CustomEvent("profile-image-updated", {
          detail: {
            profileImage: updatedProfileImage,
            profileFile: updatedData.profile_image,
            role: r,
            uploadDir,
          },
        }),
      );
    } catch (error) {
      console.error("Profile upload failed:", error);
    } finally {
      e.target.value = "";
    }
  };

  const uploadHandlers = {
    registrar: makeUploadHandler("/api/update_registrar_profile", "Admin1by1"),
    applicant: makeUploadHandler(
      "/api/upload-profile-picture",
      "Applicant1by1",
    ),
    faculty: makeUploadHandler("/api/update_faculty", "Faculty1by1"),
    student: makeUploadHandler("/api/update_student", "Student1by1"),
  };

  const loc = typeof window !== "undefined" ? window.location.pathname : "";
  const isActive = (p) => loc === p;
  const isActivePrefix = (px) => loc.startsWith(px);
  const isClassRosterActive = (lp) => loc === lp;

  const avatarSrc =
    profileImage ||
    (personData?.profile_image
      ? `${API_BASE_URL}/uploads/${dir}/${personData.profile_image}?t=${Date.now()}`
      : null);
  const showUploadFor = [
    "administrator",
    "superadmin",
    "technical",
    "applicant",
    "faculty",
    "student",
  ].includes(role);

  const handleNavClick = () => {
    if (isMobile) onMobileClose?.();
  };

  /* ── Resolve which Change Password path to use for the current role ── */
  const changePasswordPath =
    role === "applicant"
      ? "/applicant_reset_password"
      : role === "faculty"
        ? "/faculty_reset_password"
        : role === "student"
          ? "/student_reset_password"
          : ["administrator", "superadmin", "technical"].includes(role)
            ? "/registrar_reset_password"
            : null;

  /* ── menu definitions ── */
  const admissionMenuGroups = [
    {
      key: "admissionOffice",
      label: "Admission Office",
      icon: AdminPanelSettings,
      items: [
        {
          title: "Applicant List",
          link: "/admission_applicant_list",
          icon: ListAltOutlined,
          page_id: 7,
        },
        {
          title: "Applicant Profile",
          link: "/admission_personal_information",
          icon: AccountCircle,
          page_id: 1,
        },
        {
          title: "Applicant Online Requirements",
          link: "/admission_online_requirements",
          icon: FolderCopy,
          page_id: 61,
        },
        {
          title: "Verify Document Schedule Management",
          link: "/verify_document_schedule_management",
          icon: EditCalendar,
          page_id: 115,
        },
        {
          title: "Entrance Exam Schedule Management",
          link: "/entrance_exam_schedule_management",
          icon: EditCalendar,
          page_id: 11,
        },
        {
          title: "Admission Printable Forms",
          link: "/admission_printable_forms",
          icon: Badge,
          page_id: 48,
        },
        {
          title: "Entrance Examination Scoring",
          link: "/applicant_entrance_exam_score",
          icon: Score,
          page_id: 8,
        },
        {
          title: "Verify Document Room Assignment",
          link: "/verify_document_room_assignment",
          icon: AccessTimeIcon,
          page_id: 118,
        },
        {
          title: "Evaluator Applicant List",
          link: "/evaluator_schedule_room_list",
          icon: People,
          page_id: 120,
        },
        {
          title: "Entrance Exam Room Assignment",
          link: "/entrance_exam_room_assignment",
          icon: AccessTimeIcon,
          page_id: 9,
        },
        {
          title: "Proctor's Applicant List",
          link: "/admission_schedule_room_list",
          icon: People,
          page_id: 33,
        },
        {
          title: "Entrance Exam QR Code Scanner",
          link: "/exam_attendance_scanner",
          icon: PhotoCamera,
          page_id: 171,
        },
        {
          title: "Exam Subject Management",
          link: "/exam_subject_management",
          icon: SchoolIcon,
          page_id: 145,
        },
        {
          title: "Announcement",
          link: "/admission_announcement",
          icon: Campaign,
          page_id: 98,
        },
        {
          title: "Request Account Deletion",
          link: "/application_process_admin",
          icon: PersonAdd,
          page_id: 139,
        },
        {
          title: "Admission Contact Management",
          link: "/admission_contact_management",
          icon: ContactsIcon,
          page_id: 172,
        },
      ],
    },
  ];

  const enrollmentMenuGroups = [
    {
      key: "enrollmentOfficer",
      label: "Enrollment Officer",
      icon: AssignmentIndIcon,
      items: [
        {
          title: "Applicant List",
          link: "/applicant_list_college",
          icon: ListAlt,
          page_id: 6,
        },
        {
          title: "Applicant Profile",
          link: "/applicant_college_personal_information",
          icon: AccountCircle,
          page_id: 43,
        },
        {
          title: "Applicant Online Requirements",
          link: "/applicant_online_requirements_college",
          icon: FolderCopy,
          page_id: 49,
        },
        {
          title: "Entrance Examination Score",
          link: "/college_entrance_examination_score",
          icon: Assessment,
          page_id: 151,
        },
        {
          title: "Qualifying / Interview Schedule Management",
          link: "/college_qualifying_interview_schedule_management",
          icon: EditCalendar,
          page_id: 12,
        },
        {
          title: "Qualifying / Interview Exam Score",
          link: "/college_qualifying_interview_score",
          icon: Assessment,
          page_id: 37,
        },
        // { title: "Student Numbering", link: "/student_numbering_per_college", icon: FormatListNumbered, page_id: 60 },
        {
          title: "Student List",
          link: "/college_student_list",
          icon: ListAlt,
          page_id: 137,
        },
        {
          title: "Student Profile",
          link: "/student_college_personal_information",
          icon: AccountCircle,
          page_id: 43,
        },
        {
          title: "Student Online Requirements",
          link: "/student_online_requirements_college",
          icon: FolderCopy,
          page_id: 124,
        },
        {
          title: "Course Tagging",
          link: "/college_course_tagging",
          icon: Class,
          page_id: 124,
        },
        {
          title: "Course Tagging For Summer",
          link: "/college_course_tagging_summer",
          icon: Class,
          page_id: 141,
        },
        {
          title: "Search Certificate of Registration",
          link: "/college_search_certification_of_registration",
          icon: Search,
          page_id: 125,
        },
        {
          title: "College Class List",
          link: "/college_class_list",
          icon: Class,
          page_id: 152,
        },
        {
          title: "Student Grade File",
          link: "/college_student_grade_file",
          icon: Grading,
          page_id: 170,
        },
        {
          title: "Qualifying / Interview Room Assignment",
          link: "/college_qualifying_interview_room_assignment",
          icon: AccessTimeIcon,
          page_id: 10,
        },
        {
          title: "Qualfying / Interviewer Applicant List",
          link: "/qualifying_interview_room_assignment",
          icon: People,
          page_id: 36,
        },
      ],
    },
  ];

  const medicalMenuGroups = [
    {
      key: "medicalDental",
      label: "Medical & Dental",
      icon: MedicalServices,
      items: [
        {
          title: "Student List",
          link: "/medical_student_list",
          icon: ListAltOutlined,
          page_id: 24,
        },
        {
          title: "Student Profile",
          link: "/medical_personal_information",
          icon: AccountCircle,
          page_id: 25,
        },
        {
          title: "Student Online Requirements",
          link: "/medical_online_requirements",
          icon: FolderCopy,
          page_id: 30,
        },
        {
          title: "Medical Requirements",
          link: "/medical_requirements_form",
          icon: MedicalServices,
          page_id: 31,
        },
        {
          title: "Dental Assessment",
          link: "/dental_assessment",
          icon: HealthAndSafety,
          page_id: 19,
        },
        {
          title: "Physical & Neuro Exam",
          link: "/physical_neuro_exam",
          icon: Psychology,
          page_id: 32,
        },
      ],
    },
  ];

  const registrarMenuGroups = [
    {
      key: "registrarOffice",
      label: "Registrar's Office",
      icon: HistoryEdu,
      items: [
        {
          title: "Applicant List",
          link: "/applicant_list_registrar",
          icon: ListAltOutlined,
          page_id: 80,
        },
        {
          title: "Applicant Profile",
          link: "/applicant_registrar_personal_information",
          icon: AccountCircle,
          page_id: 161,
        },
        {
          title: "Applicant Online Requirements",
          link: "/applicant_online_requirements_registrar",
          icon: FolderCopy,
          page_id: 160,
        },
        {
          title: "Entrance Examination Score",
          link: "/registrar_entrance_examination_score",
          icon: Assessment,
          page_id: 168,
        },
        {
          title: "Qualifying / Interview Scores",
          link: "/registrar_qualifying_interview_score",
          icon: Assessment,
          page_id: 169,
        },
        {
          title: "Student Numbering Panel",
          link: "/student_numbering",
          icon: Numbers,
          page_id: 59,
        },
        {
          title: "Student Number Admin",
          link: "/student_number_admin",
          icon: AdminPanelSettings,
          page_id: 167,
        },
        {
          title: "Student List",
          link: "/registrar_student_list",
          icon: ListAltOutlined,
          page_id: 104,
        },
        {
          title: "Student Profile",
          link: "/student_registrar_personal_information",
          icon: AccountCircle,
          page_id: 38,
        },
        {
          title: "Student Online Requirements",
          link: "/student_online_requirements_registrar",
          icon: FolderCopy,
          page_id: 106,
        },

        {
          title: "Registrar Search Certificate of Registration",
          link: "/registrar_search_certificate_of_registration",
          icon: Search,
          page_id: 153,
        },
        {
          title: "Student Grade File",
          link: "/registrar_student_grade_file",
          icon: Grading,
          page_id: 174,
        },
        {
          title: "Report of Grades",
          link: "/report_of_grades",
          icon: Assessment,
          page_id: 50,
        },
        {
          title: "Grading Evaluation",
          link: "/grading_evaluation_for_registrar",
          icon: FactCheck,
          page_id: 105,
        },
        {
          title: "Transcript of Records",
          link: "/transcript_of_records",
          icon: HistoryEdu,
          page_id: 62,
        },
        {
          title: "Registrar Class List",
          link: "/registrar_class_list",
          icon: Class,
          page_id: 15,
        },

        {
          title: "Registrar Course Tagging",
          link: "/registrar_course_tagging",
          icon: Class,
          page_id: 17,
        },
        {
          title: "Registrar Course Tagging Summer",
          link: "/registrar_course_tagging_summer",
          icon: Class,
          page_id: 140,
        },
        {
          title: "COR Exporting Module",
          link: "/cor_exporting_module",
          icon: FolderCopy,
          page_id: 117,
        },
      ],
    },
  ];

  const courseMenuGroups = [
    {
      key: "courseManagement",
      label: "Course Management",
      icon: MenuBook,
      items: [
        {
          title: "Program Management",
          link: "/program_management",
          icon: LibraryBooks,
          page_id: 34,
        },
        {
          title: "Curriculum Management",
          link: "/curriculum_management",
          icon: EditNote,
          page_id: 18,
        },
        {
          title: "Subject Management",
          link: "/subject_management",
          icon: MenuBook,
          page_id: 16,
        },

        {
          title: "Program Tagging Management",
          link: "/program_tagging_management",
          icon: CollectionsBookmark,
          page_id: 35,
        },
        {
          title: "Curriculum Fee Management",
          link: "/curriculum_fee_management",
          icon: LibraryBooks,
          page_id: 111,
        },
        {
          title: "Curriculum Unit Management",
          link: "/curriculum_unit_management",
          icon: MenuBook,
          page_id: 113,
        },
        {
          title: "Curriculum Requirements Management",
          link: "/curriculum_requirements_management",
          icon: MenuBook,
          page_id: 112,
        },
        {
          title: "NSTP Tagging Panel",
          link: "/nstp_tagging",
          icon: MenuBook,
          page_id: 148,
        },
      ],
    },
  ];

  const departmentMenuGroups = [
    {
      key: "departmentManagement",
      label: "Department Management",
      icon: Apartment,
      items: [
        {
          title: "Schedule Plotting Form",
          link: "/select_college",
          icon: EventNote,
          page_id: 53,
        },
        {
          title: "Department Section Panel",
          link: "/department_section_panel",
          icon: Apartment,
          page_id: 20,
        },
        {
          title: "Department Panel",
          link: "/department_registration",
          icon: Assignment,
          page_id: 21,
        },
        {
          title: "Department Room Panel",
          link: "/department_room",
          icon: MeetingRoom,
          page_id: 22,
        },
        {
          title: "Department Section Tagging",
          link: "/department_section_tagging",
          icon: MeetingRoom,
          page_id: 149,
        },
        {
          title: "Slot Monitoring Panel",
          link: "/section_slot_monitoring",
          icon: MeetingRoom,
          page_id: 123,
        },
        {
          title: "Department Curriculum Panel",
          link: "/department_curriculum_panel",
          icon: MenuBook,
          page_id: 107,
        },
        {
          title: "College Schedule Plotting",
          link: "/college_schedule_plotting",
          icon: EventNote,
          page_id: 108,
        },
        {
          title: "Workload Management",
          link: "/workload_management",
          icon: EventNote,
          page_id: 171,
        },
      ],
    },
  ];

  const systemMenuGroups = [
    {
      key: "roomManagement",
      label: "Room Management",
      icon: MeetingRoom,
      items: [
        {
          title: "Room Registration",
          link: "/room_registration",
          icon: MeetingRoom,
          page_id: 52,
        },
      ],
    },
    {
      key: "requirementsManagement",
      label: "Requirements Management",
      icon: Assignment,
      items: [
        {
          title: "Requirements Panel",
          link: "/requirements_form",
          icon: Assignment,
          page_id: 51,
        },
      ],
    },
    {
      key: "profileSettings",
      label: "Profile & Settings",
      icon: Settings,
      items: [
        {
          title: `${shortTerm} Profile`,
          link: "/settings",
          icon: Settings,
          page_id: 74,
        },
        {
          title: "Signature Upload",
          link: "/signature_upload",
          icon: Settings,
          page_id: 114,
        },
      ],
    },
    {
      key: "academicConfiguration",
      label: "Academic Configuration",
      icon: School,
      items: [
        {
          title: "Grade Conversion Management",
          link: "/grade_conversion_admin",
          icon: Settings,
          page_id: 144,
        },
        {
          title: "Change Grading Period",
          link: "/change_grade_period",
          icon: ChangeCircle,
          page_id: 14,
        },
        {
          title: "Student Grade File",
          link: "/student_grade_file",
          icon: Grade,
          page_id: 126,
        },
        {
          title: "Academic Achiever Awardee's",
          link: "/honors_report",
          icon: EmojiEvents,
          page_id: 146,
        },
      ],
    },
    {
      key: "branchAdministration",
      label: "Branch Administration",
      icon: AccountTree,
      items: [
        {
          title: "Branch Management",
          link: "/admin_branches",
          icon: Settings,
          page_id: 138,
        },
      ],
    },
    {
      key: "communicationManagement",
      label: "Communication",
      icon: Campaign,
      items: [
        {
          title: "Email Sender",
          link: "/email_template_manager",
          icon: Email,
          page_id: 67,
        },
        {
          title: "Announcement",
          link: "/announcement",
          icon: Campaign,
          page_id: 66,
        },
      ],
    },
    {
      key: "slotConfiguration",
      label: "Slot Configuration",
      icon: School,
      items: [
        {
          title: "Program Slot Remaining",
          link: "/program_slot_limit",
          icon: People,
          page_id: 110,
        },
      ],
    },
    {
      key: "sectionManagement",
      label: "Section Management",
      icon: Class,
      items: [
        {
          title: "Section Panel Form",
          link: "/section_panel",
          icon: Class,
          page_id: 57,
        },
        {
          title: "Section Slot Management",
          link: "/section_slot_management",
          icon: MeetingRoom,
          page_id: 167,
        },
      ],
    },
    {
      key: "semesterManagement",
      label: "Semester Management",
      icon: Timeline,
      items: [
        {
          title: "Semester Panel Form",
          link: "/semester_panel",
          icon: Timeline,
          page_id: 58,
        },
      ],
    },
    {
      key: "yearManagement",
      label: "Year Management",
      icon: CalendarToday,
      items: [
        {
          title: "Year Level Panel Form",
          link: "/year_level_panel",
          icon: Layers,
          page_id: 63,
        },
        {
          title: "Year Panel Form",
          link: "/year_panel",
          icon: CalendarToday,
          page_id: 64,
        },
        {
          title: "School Year Panel",
          link: "/school_year_panel",
          icon: DateRange,
          page_id: 55,
        },
      ],
    },
    {
      key: "evaluationManagement",
      label: "Evaluation Management",
      icon: Assessment,
      items: [
        {
          title: "Evaluation Management",
          link: "/evaluation_crud",
          icon: HelpOutline,
          page_id: 23,
        },
      ],
    },
    {
      key: "paymentManagement",
      label: "Payment Management",
      icon: Payments,
      items: [
        {
          title: "Payment Exporting Module",
          link: "/payment_exporting_module",
          icon: HelpOutline,
          page_id: 116,
        },
        {
          title: "Receipt Counter Assignment",
          link: "/assign_receipt_counter",
          icon: HelpOutline,
          page_id: 122,
        },
        {
          title: "Matriculation Payment",
          link: "/matriculation_payment",
          icon: HelpOutline,
          page_id: 121,
        },
        {
          title: "Student Balance List",
          link: "/student_balance_list",
          icon: HelpOutline,
          page_id: 175,
        },
        {
          title: "TOSF Management",
          link: "/tosf_crud",
          icon: HelpOutline,
          page_id: 99,
        },
      ],
    },
    {
      key: "scholarshipManagement",
      label: "Scholarship Management",
      icon: School,
      items: [
        {
          title: "Student Scholarship List",
          link: "/student_scholarship_list",
          icon: HelpOutline,
          page_id: 116,
        },
      ],
    },
    {
      key: "systemLogs",
      label: "System Logs",
      icon: HistoryEdu,
      items: [
        {
          title: "Audit Logs",
          link: "/audit_logs",
          icon: HistoryEdu,
          page_id: 154,
        },
      ],
    },
    {
      key: "registrarResetPasswords",
      label: "Reset Password",
      icon: Settings,
      items: [
        {
          title: "Registrar Reset Password",
          link: "/registrar_reset_password",
          icon: Settings,
          page_id: 73,
        },
      ],
    },
  ];

  const accountMenuGroups = [
    {
      key: "accountCreation",
      label: "Account Creation",
      icon: PersonAdd,
      items: [
        {
          title: "Add Faculty Accounts",
          link: "/register_prof",
          icon: PersonAdd,
          page_id: 70,
        },
        {
          title: "Add Registrar Account",
          link: "/register_registrar",
          icon: AdminPanelSettings,
          page_id: 71,
        },
        {
          title: "Create Student Account",
          link: "/student_accounts",
          icon: School,
          page_id: 143,
        },
        {
          title: "Add/Delete Applicant Account",
          link: "/application_process_super_admin",
          icon: School,
          page_id: 147,
        },
      ],
    },
    {
      key: "applicantManagement",
      label: "Applicant Management",
      icon: Badge,
      items: [
        {
          title: "Applicant Information",
          link: "/applicant_admin_personal_information",
          icon: Info,
          page_id: 75,
        },
        {
          title: "Applicant Online Requirements",
          link: "/applicant_online_requirements_admin",
          icon: Assignment,
          page_id: 84,
        },
        { title: "Archive", link: "/archived", icon: FolderCopy, page_id: 142 },
        {
          title: "Upload Applicants",
          link: "/upload_applicants",
          icon: FolderCopy,
          page_id: 166,
        },
      ],
    },
    {
      key: "studentManagement",
      label: "Student Management",
      icon: School,
      items: [
        {
          title: "Student Information",
          link: "/student_admin_personal_information",
          icon: Info,
          page_id: 86,
        },
        {
          title: "Student Online Requirements",
          link: "/student_online_requirements_admin",
          icon: Assignment,
          page_id: 150,
        },
        {
          title: "Edit Personal Information",
          link: "/admin_student_edit_permissions1",
          icon: FolderCopy,
          page_id: 155,
        },
        {
          title: "Edit Family Background",
          link: "/admin_student_edit_permissions2",
          icon: FolderCopy,
          page_id: 156,
        },
        {
          title: "Edit Educational Background",
          link: "/admin_student_edit_permissions3",
          icon: FolderCopy,
          page_id: 157,
        },
        {
          title: "Edit Health & Medical Records",
          link: "/admin_student_edit_permissions4",
          icon: FolderCopy,
          page_id: 158,
        },
        {
          title: "Edit Other Information",
          link: "/admin_student_edit_permissions5",
          icon: FolderCopy,
          page_id: 159,
        },
        {
          title: "Migration Data Panel",
          link: "/migration_data_panel",
          icon: Settings,
          page_id: 114,
        },
      ],
    },
    {
      key: "accessControl",
      label: "Access Control",
      icon: Security,
      items: [
        {
          title: "User Page Access",
          link: "/user_page_access",
          icon: Security,
          page_id: 69,
        },  
      ],
    },
    {
      key: "passwordManagement",
      label: "Password Management",
      icon: LockReset,
      items: [
        {
          title: "Applicant Reset Password",
          link: "/superadmin_applicant_reset_password",
          icon: People,
          page_id: 81,
        },
        {
          title: "Student Reset Password",
          link: "/superadmin_student_reset_password",
          icon: School,
          page_id: 91,
        },
        {
          title: "Faculty Reset Password",
          link: "/superadmin_faculty_reset_password",
          icon: SupervisorAccount,
          page_id: 82,
        },
        {
          title: "Registrar Reset Password",
          link: "/superadmin_registrar_reset_password",
          icon: AdminPanelSettings,
          page_id: 83,
        },
      ],
    },
  ];

  const sectionMenus = {
    admission: admissionMenuGroups,
    enrollment: enrollmentMenuGroups,
    medical: medicalMenuGroups,
    registrar: registrarMenuGroups,
    course: courseMenuGroups,
    department: departmentMenuGroups,
    system: systemMenuGroups,
    account: accountMenuGroups,
  };
  
  const managementItems = [
    {
      key: "admission",
      title: "Admission Management",
      path: "/admission_dashboard",
      icon: Business,
    },
    {
      key: "enrollment",
      title: "Enrollment Management",
      path: "/admission_dashboard",
      icon: Business,
    },
    {
      key: "medical",
      title: "Medical Management",
      path: "/admission_dashboard",
      icon: Business,
    },
    {
      key: "registrar",
      title: "Registrar Management",
      path: "/admission_dashboard",
      icon: Business,
    },
    {
      key: "course",
      title: "Course Management",
      path: "/course_management",
      icon: LibraryBooks,
    },
    {
      key: "department",
      title: "Department Management",
      path: "/department_dashboard",
      icon: Apartment,
    },
    {
      key: "system",
      title: "System Management",
      path: "/system_dashboard",
      icon: Settings,
    },
    {
      key: "account",
      title: "Account Management",
      path: "/account_dashboard",
      icon: People,
    },
  ];

  const renderSection = (item) => {
    const groups = sectionMenus[item.key];
    const hasVisible = groups
      ? groups.some((g) =>
        g.items.some(
          (si) => si.page_id === undefined || userAccessList[si.page_id],
        ),
      )
      : true;
    if (!hasVisible) return null;

    const isAcct = item.key === "account";
    const visGroups = groups
      ? groups.filter((g) =>
        g.items.some(
          (si) => si.page_id === undefined || userAccessList[si.page_id],
        ),
      )
      : [];
    const onlySettings =
      isAcct &&
      visGroups.length === 1 &&
      visGroups[0].key === "accountSettings";

    return (
      <div key={item.key}>
        <div className="sb-section-label">{item.title}</div>
        {onlySettings ? (
          visGroups[0].items
            .filter(
              (si) => si.page_id === undefined || userAccessList[si.page_id],
            )
            .map((si) => (
              <NavItem
                key={si.link}
                to={si.link}
                icon={si.icon}
                label={si.title}
                active={si.activeCheck ? si.activeCheck() : isActive(si.link)}
                collapsed={effectiveCollapsed}
                onNavClick={handleNavClick}
              />
            ))
        ) : groups ? (
          groups.map((group) => {
            const vis = group.items.filter(
              (si) => si.page_id === undefined || userAccessList[si.page_id],
            );
            if (!vis.length) return null;
            const gKey = `${item.key}_${group.key}`;
            const open = isGroupOpen(gKey);
            return (
              <div key={gKey}>
                <GroupToggle
                  label={group.label}
                  icon={group.icon}
                  open={open}
                  onToggle={() => toggleGroup(gKey)}
                  collapsed={effectiveCollapsed}
                />
                {open &&
                  !effectiveCollapsed &&
                  vis.map((si) => (
                    <NavItem
                      key={si.link}
                      to={si.link}
                      icon={si.icon}
                      label={si.title}
                      active={
                        si.activeCheck ? si.activeCheck() : isActive(si.link)
                      }
                      sub
                      collapsed={effectiveCollapsed}
                      onNavClick={handleNavClick}
                    />
                  ))}
              </div>
            );
          })
        ) : (
          <NavItem
            to={item.path}
            icon={item.icon}
            label={`Open ${item.title}`}
            active={isActive(item.path)}
            collapsed={effectiveCollapsed}
            onNavClick={handleNavClick}
          />
        )}
        <Divider sx={{ bgcolor: "#f0f0f0", my: "5px" }} />
      </div>
    );
  };

  /* ── render ── */
  return (
    <>
      {/* Mobile backdrop overlay */}
      <div
        className={`sb-overlay${isMobile && mobileOpen ? " visible" : ""}`}
        onClick={onMobileClose}
      />

      <div
        className={`sb-root hidden-print${isMobile && mobileOpen ? " mobile-open" : ""}`}
      >
        {/* ── header ── */}
        <div className="sb-header">
          <Tooltip
            title={
              effectiveCollapsed
                ? `${personData?.fname || ""} ${personData?.lname || ""}`.trim() ||
                role
                : ""
            }
            placement="right"
            arrow
          >
            <div
              style={{
                display: "flex",
                flexDirection: effectiveCollapsed ? "column" : "row",
                alignItems: "center",
                gap: effectiveCollapsed ? "10px" : "12px",
                padding: "10px 12px",
              }}
            >
              {!isMobile && (
                <button
                  className="sb-hamburger"
                  onClick={() => setCollapsed((c) => !c)}
                  title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                  style={{
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "black",
                  }}
                >
                  <div
                    style={{
                      ...ICON_CONTAINER_STYLE,
                      border: "1.5px solid black",
                    }}
                  >
                    <Menu
                      sx={{ fontSize: SIDEBAR_ICON_SIZE, color: "black" }}
                    />
                  </div>
                </button>
              )}

              <div
                style={{
                  position: "relative",
                  display: "flex",
                  alignItems: "center",
                }}
              >
                {avatarSrc ? (
                  <Avatar
                    src={avatarSrc}
                    sx={{
                      width: effectiveCollapsed ? 36 : 44,
                      height: effectiveCollapsed ? 36 : 44,
                      border: "1.5px solid black",
                      boxShadow: "0 2px 8px rgba(0,0,0,.15)",
                      transition: "all .25s ease",
                    }}
                  />
                ) : (
                  <Avatar
                    sx={{
                      width: effectiveCollapsed ? 36 : 44,
                      height: effectiveCollapsed ? 36 : 44,
                      bgcolor: "rgba(255,255,255,.2)",
                      fontSize: 15,
                      border: "1.5px solid black",
                      boxShadow: "0 2px 8px rgba(0,0,0,.15)",
                      transition: "all .25s ease",
                    }}
                  >
                    {personData?.fname?.[0] || "?"}
                  </Avatar>
                )}

                {showUploadFor &&
                  !effectiveCollapsed &&
                  !forcePasswordChange && (
                    <>
                      <label
                        htmlFor="sb-upload"
                        style={{
                          position: "absolute",
                          bottom: -2,
                          right: -2,
                          width: 18,
                          height: 18,
                          borderRadius: "50%",
                          background: "white",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          cursor: "pointer",
                        }}
                      >
                        <AddCircleIcon
                          sx={{ fontSize: 13, color: accentColor }}
                        />
                      </label>
                      <ProfileUploadInput
                        id="sb-upload"
                        onChange={uploadHandlers[role]}
                      />
                    </>
                  )}
              </div>

              {!effectiveCollapsed && (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    overflow: "hidden",
                    flex: 1,
                  }}
                >
                  <div
                    style={{
                      color: "black",
                      fontWeight: 600,
                      fontSize: 14,
                      lineHeight: 1.25,
                      wordBreak: "break-word",
                      overflowWrap: "break-word",
                      maxWidth: "100%",
                    }}
                  >
                    {personData?.fname
                      ? `${personData.fname} ${personData.lname}`
                      : role || "User"}
                  </div>
                  <div
                    style={{
                      color: "black",
                      fontSize: 12,
                      lineHeight: 1.2,
                      wordBreak: "break-word",
                      overflowWrap: "break-word",
                      maxWidth: "100%",
                    }}
                  >
                    {["administrator", "superadmin", "technical"].includes(role)
                      ? `${accessDescription} · ${personData?.employee_id || ""}`
                      : role === "student"
                        ? `Student · ${personData?.student_number || ""}`
                        : role === "faculty"
                          ? `Faculty · ${personData?.employee_id || ""}`
                          : role === "applicant"
                            ? `Applicant · ${personData?.applicant_number || ""}`
                            : role
                              ? role.charAt(0).toUpperCase() + role.slice(1)
                              : ""}
                  </div>
                  {hasDept && (
                    <div style={{ color: "black", fontSize: 11 }}>
                      {personData.dprtmnt_code} Department
                    </div>
                  )}
                </div>
              )}

              {isMobile && (
                <button
                  onClick={onMobileClose}
                  style={{
                    marginLeft: "auto",
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    padding: 4,
                  }}
                  aria-label="Close menu"
                >
                  <Menu sx={{ fontSize: 24, color: "black" }} />
                </button>
              )}
            </div>
          </Tooltip>
        </div>

        {/* ── scrollable nav ── */}
        <div className="sb-scroll">
          {/* ═══════════════════════════════════════════════════
              LOCKED STATE — force_password_change is true
              Only the Change Password item is shown.
          ════════════════════════════════════════════════════ */}
          {forcePasswordChange && changePasswordPath ? (
            <>
              <div className="sb-section-label">Action required</div>

              {/* Warning banner — hidden when sidebar is collapsed */}
              {!effectiveCollapsed && (
                <div
                  style={{
                    margin: "4px 8px 10px",
                    padding: "10px 12px",
                    borderRadius: 8,
                    background: "#fff3cd",
                    border: "1px solid #ffc107",
                    fontSize: 12,
                    color: "#856404",
                    lineHeight: 1.5,
                  }}
                >
                  You must change your password before accessing other features.
                </div>
              )}

              <NavItem
                to={changePasswordPath}
                icon={LockResetIcon}
                label="Change Password"
                active={isActive(changePasswordPath)}
                collapsed={effectiveCollapsed}
                onNavClick={handleNavClick}
              />
            </>
          ) : (
            /* ═══════════════════════════════════════════════════
                           NORMAL STATE — full navigation
                        ════════════════════════════════════════════════════ */
            <>
              {/* REGISTRAR */}
              {["administrator", "superadmin", "technical"].includes(role) && (
                <>
                  <div className="sb-section-label">Navigation</div>
                  <NavItem
                    to="/dashboard"
                    icon={DashboardIcon}
                    label="Dashboard"
                    active={isActive("/dashboard")}
                    collapsed={effectiveCollapsed}
                    onNavClick={handleNavClick}
                  />
                  <Divider sx={{ bgcolor: "#f0f0f0", my: "5px" }} />
                  {managementItems.map(renderSection)}
                  <div className="sb-divider" />
                </>
              )}

              {/* APPLICANT */}
              {role === "applicant" && (
                <>
                  <div className="sb-section-label">Navigation</div>
                  <NavItem
                    to="/dashboard"
                    icon={DashboardIcon}
                    label="Dashboard"
                    active={isActive("/dashboard")}
                    collapsed={effectiveCollapsed}
                    onNavClick={handleNavClick}
                  />
                  <NavItem
                    icon={AssignmentIndIcon}
                    label="Applicant Profile"
                    active={isActivePrefix("/applicant_personal_information/")}
                    collapsed={effectiveCollapsed}
                    onClick={() => {
                      let keys = JSON.parse(
                        localStorage.getItem("dashboardKeys"),
                      );
                      if (!keys) {
                        const g = () =>
                          Math.random().toString(36).substring(2, 10);
                        keys = {
                          step1: g(),
                          step2: g(),
                          step3: g(),
                          step4: g(),
                          step5: g(),
                        };
                        localStorage.setItem(
                          "dashboardKeys",
                          JSON.stringify(keys),
                        );
                      }
                      if (isMobile) onMobileClose?.();
                      window.location.href = `/applicant_personal_information/${keys.step1}`;
                    }}
                  />
                  <NavItem
                    to="/applicant_online_requirements"
                    icon={CloudUploadIcon}
                    label="Upload Requirements"
                    active={isActivePrefix("/applicant_online_requirements")}
                    collapsed={effectiveCollapsed}
                    onNavClick={handleNavClick}
                  />
                  <div className="sb-section-label">Setting</div>
                  <NavItem
                    to="/applicant_reset_password"
                    icon={LockResetIcon}
                    label="Change Password"
                    active={isActivePrefix("/applicant_reset_password")}
                    collapsed={effectiveCollapsed}
                    onNavClick={handleNavClick}
                  />
                </>
              )}

              {/* FACULTY */}
              {role === "faculty" && (
                <>
                  <div className="sb-section-label">Navigation</div>
                  <NavItem
                    to="/dashboard"
                    icon={DashboardIcon}
                    label="Dashboard"
                    active={isActive("/dashboard")}
                    collapsed={effectiveCollapsed}
                    onNavClick={handleNavClick}
                  />
                  <NavItem
                    to="/faculty_workload"
                    icon={WorkIcon}
                    label="Workload"
                    active={isActive("/faculty_workload")}
                    collapsed={effectiveCollapsed}
                    onNavClick={handleNavClick}
                  />
                  <NavItem
                    to="/faculty_classlist"
                    icon={ListAltIcon}
                    label="Class List"
                    active={isActive("/faculty_classlist")}
                    collapsed={effectiveCollapsed}
                    onNavClick={handleNavClick}
                  />
                  <NavItem
                    to="/faculty_grading_sheet"
                    icon={AssignmentTurnedInIcon}
                    label="Grading Management"
                    active={isActive("/faculty_grading_sheet")}
                    collapsed={effectiveCollapsed}
                    onNavClick={handleNavClick}
                  />
                  <NavItem
                    to="/faculty_evaluation"
                    icon={SchoolIcon}
                    label="Faculty Evaluation"
                    active={isActive("/faculty_evaluation")}
                    collapsed={effectiveCollapsed}
                    onNavClick={handleNavClick}
                  />
                  <div className="sb-section-label">Setting</div>
                  <NavItem
                    to="/faculty_reset_password"
                    icon={Settings}
                    label="Change Password"
                    active={isActive("/faculty_reset_password")}
                    collapsed={effectiveCollapsed}
                    onNavClick={handleNavClick}
                  />
                </>
              )}

              {/* STUDENT */}
              {role === "student" && (
                <>
                  <div className="sb-section-label">Navigation</div>
                  <NavItem
                    to="/dashboard"
                    icon={DashboardIcon}
                    label="Dashboard"
                    active={isActive("/dashboard")}
                    collapsed={effectiveCollapsed}
                    onNavClick={handleNavClick}
                  />
                  <NavItem
                    to="/student_schedule"
                    icon={EventNoteIcon}
                    label="Schedule"
                    active={isActive("/student_schedule")}
                    collapsed={effectiveCollapsed}
                    onNavClick={handleNavClick}
                  />
                  <NavItem
                    to="/student_grades_page"
                    icon={GradeIcon}
                    label="Grades"
                    active={isActive("/student_grades_page")}
                    collapsed={effectiveCollapsed}
                    onNavClick={handleNavClick}
                  />
                  <NavItem
                    to="/student_curriculum_subjects"
                    icon={MenuBook}
                    label="Curriculum"
                    active={isActive("/student_curriculum_subjects")}
                    collapsed={effectiveCollapsed}
                    onNavClick={handleNavClick}
                  />
               
                  <NavItem
                    to="/student_faculty_evaluation"
                    icon={AssignmentTurnedInIcon}
                    label="Faculty Evaluation"
                    active={isActive("/student_faculty_evaluation")}
                    collapsed={effectiveCollapsed}
                    onNavClick={handleNavClick}
                  />
                  <NavItem
                    to="/student_personal_information"
                    icon={PersonIcon}
                    label="Student Profile"
                    active={isActive("/student_personal_information")}
                    collapsed={effectiveCollapsed}
                    onNavClick={handleNavClick}
                  />
                  <NavItem
                    to="/student_online_requirements"
                    icon={FolderCopy}
                    label="Student Online Requirements"
                    active={isActive("/student_online_requirements")}
                    collapsed={effectiveCollapsed}
                    onNavClick={handleNavClick}
                  />
                  <NavItem
                    to="/student_account_balance"
                    icon={PaymentIcon}
                    label="Student Account Balance"
                    active={isActive("/student_account_balance")}
                    collapsed={effectiveCollapsed}
                    onNavClick={handleNavClick}
                  />
                  <NavItem
                    to="/student_history"
                    icon={HistoryIcon}
                    label="History Logs"
                    active={isActive("/student_history")}
                    collapsed={effectiveCollapsed}
                    onNavClick={handleNavClick}
                  />
                  <div className="sb-section-label">Setting</div>
                  <NavItem
                    to="/student_reset_password"
                    icon={Settings}
                    label="Change Password"
                    active={isActive("/student_reset_password")}
                    collapsed={effectiveCollapsed}
                    onNavClick={handleNavClick}
                  />
                </>
              )}

              <div style={{ height: 12 }} />
            </>
          )}
        </div>

        {/* ── footer ── */}
        <div className="sb-footer">
          <Tooltip
            title={effectiveCollapsed ? "Logout" : ""}
            placement="right"
            arrow
          >
            <div
              className="sb-logout"
              onClick={Logout}
              style={{ backgroundColor: "black" }}
            >
              <span
                className="sb-logout-icon"
                style={{
                  ...ICON_CONTAINER_STYLE,
                  border: "1.5px solid rgba(0,0,0,.08)",
                }}
              >
                <LogoutOutlined
                  sx={{ fontSize: SIDEBAR_ICON_SIZE, color: "white" }}
                />
              </span>
              <span className="sb-logout-label">Logout</span>
            </div>
          </Tooltip>
        </div>
      </div>
    </>
  );
};

export default SideBar;
