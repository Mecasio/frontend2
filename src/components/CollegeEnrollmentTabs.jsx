import React, { useContext, useEffect, useState } from "react";
import { Box, Card, Typography } from "@mui/material";
import SchoolIcon from "@mui/icons-material/School";
import PersonIcon from "@mui/icons-material/Person";
import AssignmentIcon from "@mui/icons-material/Assignment";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import PersonSearchIcon from "@mui/icons-material/PersonSearch";
import { useLocation, useNavigate } from "react-router-dom";
import { SettingsContext } from "../App";
import GradingIcon from "@mui/icons-material/Grading";

export const COLLEGE_ENROLLMENT_TABS = [
  {
    label: "Student List",
    to: "/college_student_list",
    iconKey: "school",
  },
  {
    label: "Student Profile",
    to: "/student_college_personal_information",
    iconKey: "person",
  },
  {
    label: "Student Online Requirements",
    to: "/student_online_requirements_college",
    iconKey: "assignment",
  },
  {
    label: "Course Tagging",
    to: "/college_course_tagging",
    iconKey: "upload",
  },
  {
    label: "Search COR",
    to: "/college_search_certification_of_registration",
    iconKey: "menuBook",
  },
  {
    label: "Student Grade File",
    to: "/college_student_grade_file",
    iconKey: "grading",
  },
  {
    label: "Class List",
    to: "/college_class_list",
    iconKey: "personSearch",
  },
];

export const getCollegeEnrollmentActiveStep = (pathname) => {
  const exact = COLLEGE_ENROLLMENT_TABS.findIndex((tab) => tab.to === pathname);
  if (exact !== -1) return exact;

  if (
    pathname.startsWith("/student_college_personal_information") ||
    pathname.startsWith("/student_college_family_background") ||
    pathname.startsWith("/student_college_educational_attainment") ||
    pathname.startsWith("/student_college_health_medical_records") ||
    pathname.startsWith("/student_college_other_information")
  ) {
    return COLLEGE_ENROLLMENT_TABS.findIndex(
      (tab) => tab.to === "/student_college_personal_information",
    );
  }

  return -1;
};

const TAB_ICONS = {
  school: <SchoolIcon fontSize="large" />,
  person: <PersonIcon fontSize="large" />,
  assignment: <AssignmentIcon fontSize="large" />,
  upload: <UploadFileIcon fontSize="large" />,
  menuBook: <MenuBookIcon fontSize="large" />,
  grading: <GradingIcon fontSize="large" />,
  personSearch: <PersonSearchIcon fontSize="large" />,
};

const CollegeEnrollmentTabs = () => {
  const settings = useContext(SettingsContext);
  const colors = settings?.colors || {};
  const branding = settings?.branding || {};
  const assets = settings?.assets || {};
  const headerColor = colors.header || "#1976d2";
  const location = useLocation();
  const navigate = useNavigate();
  const [borderColor, setBorderColor] = useState("#000000");

  useEffect(() => {
    if (colors.border) {
      setBorderColor(colors.border);
    }
  }, [settings]);

  const activeStep = getCollegeEnrollmentActiveStep(location.pathname);

  const ROUTES_WITHOUT_PERSON_ID = new Set([
    "/college_class_list",
  ]);

  const clearStickyStudentSelection = () => {
    sessionStorage.removeItem("edit_person_id");
    sessionStorage.removeItem("edit_student_number");
    sessionStorage.removeItem("edit_list_year_id");
    sessionStorage.removeItem("edit_list_semester_id");
    sessionStorage.removeItem("admin_edit_person_id");
    sessionStorage.removeItem("admin_edit_person_id_source");
    sessionStorage.removeItem("admin_edit_person_id_ts");
    sessionStorage.removeItem("admin_edit_search_query");
    sessionStorage.removeItem("admin_edit_person_data");
    sessionStorage.removeItem("student_edit_person_id");
  };

  const handleStepClick = (to) => {
    if (to === "/college_student_list") {
      clearStickyStudentSelection();
      navigate(to);
      return;
    }

    // These screens should always open blank (no sticky student search)
    if (ROUTES_WITHOUT_PERSON_ID.has(to)) {
      navigate(to);
      return;
    }

    const pid = sessionStorage.getItem("edit_person_id");
    const sn = sessionStorage.getItem("edit_student_number");

    if (pid) {
      navigate(`${to}?person_id=${pid}`);
    } else if (sn) {
      navigate(`${to}?student_number=${sn}`);
    } else {
      navigate(to);
    }
  };

  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "space-between",
        flexWrap: "nowrap",
        width: "100%",
        gap: 2,
      }}
    >
      {COLLEGE_ENROLLMENT_TABS.map((tab, index) => (
        <Card
          key={tab.to}
          onClick={() => handleStepClick(tab.to)}
          sx={{
            flex: `1 1 ${100 / COLLEGE_ENROLLMENT_TABS.length}%`,
            height: 135,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            borderRadius: 2,
            border: `1px solid ${borderColor}`,
            backgroundColor:
              activeStep === index
                ? headerColor || "#1976d2"
                : "#E8C999",
            color: activeStep === index ? "#fff" : "#000",
            boxShadow:
              activeStep === index
                ? "0px 4px 10px rgba(0,0,0,0.3)"
                : "0px 2px 6px rgba(0,0,0,0.15)",
            transition: "0.3s ease",
            "&:hover": {
              backgroundColor: activeStep === index ? "#000000" : "#f5d98f",
            },
          }}
        >
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            <Box sx={{ fontSize: 40, mb: 1 }}>{TAB_ICONS[tab.iconKey]}</Box>
            <Typography
              sx={{ fontSize: 14, fontWeight: "bold", textAlign: "center" }}
            >
              {tab.label}
            </Typography>
          </Box>
        </Card>
      ))}
    </Box>
  );
};

export default CollegeEnrollmentTabs;
