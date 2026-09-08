import React, { useContext, useEffect, useState } from "react";
import { Box, Card, Typography } from "@mui/material";
import SchoolIcon from "@mui/icons-material/School";
import PersonIcon from "@mui/icons-material/Person";
import AssignmentIcon from "@mui/icons-material/Assignment";
import HealthAndSafetyIcon from "@mui/icons-material/HealthAndSafety";
import DescriptionIcon from "@mui/icons-material/Description";
import PsychologyIcon from "@mui/icons-material/Psychology";
import { useLocation, useNavigate } from "react-router-dom";
import { SettingsContext } from "../App";

export const MEDICAL_PROCESS_TABS = [
  {
    label: "Student List",
    to: "/medical_student_list",
    iconKey: "school",
  },
  {
    label: "Applicant Profile",
    to: "/medical_personal_information",
    iconKey: "person",
  },
  {
    label: "Student Online Requirements",
    to: "/medical_online_requirements",
    iconKey: "assignment",
  },
  {
    label: "Medical History",
    to: "/medical_requirements_form",
    iconKey: "health",
  },
  {
    label: "Dental Assessment",
    to: "/dental_assessment",
    iconKey: "description",
  },
  {
    label: "Physical and Neurological Examination",
    to: "/physical_neuro_exam",
    iconKey: "psychology",
  },
];

export const getMedicalProcessActiveStep = (pathname) => {
  const exact = MEDICAL_PROCESS_TABS.findIndex((tab) => tab.to === pathname);
  if (exact !== -1) return exact;

  if (
    pathname.startsWith("/medical_personal_information") ||
    pathname.startsWith("/medical_family_background") ||
    pathname.startsWith("/medical_educational_attainment") ||
    pathname.startsWith("/medical_health_medical_records") ||
    pathname.startsWith("/medical_other_information")
  ) {
    return MEDICAL_PROCESS_TABS.findIndex(
      (tab) => tab.to === "/medical_personal_information",
    );
  }

  return -1;
};

const TAB_ICONS = {
  school: <SchoolIcon fontSize="large" />,
  person: <PersonIcon fontSize="large" />,
  assignment: <AssignmentIcon fontSize="large" />,
  health: <HealthAndSafetyIcon fontSize="large" />,
  description: <DescriptionIcon fontSize="large" />,
  psychology: <PsychologyIcon fontSize="large" />,
};

const MedicalProcessTabs = () => {
  const settings = useContext(SettingsContext);
  const colors = settings?.colors || {};
  const headerColor = colors.header || "#1976d2";
  const location = useLocation();
  const navigate = useNavigate();
  const [borderColor, setBorderColor] = useState("#000000");

  useEffect(() => {
    if (colors.border) {
      setBorderColor(colors.border);
    }
  }, [settings]);

  const activeStep = getMedicalProcessActiveStep(location.pathname);

  const clearStickyStudentSelection = () => {
    sessionStorage.removeItem("edit_person_id");
    sessionStorage.removeItem("edit_student_number");
    sessionStorage.removeItem("admin_edit_person_id");
    sessionStorage.removeItem("admin_edit_person_id_source");
    sessionStorage.removeItem("admin_edit_person_id_ts");
    sessionStorage.removeItem("admin_edit_search_query");
    sessionStorage.removeItem("admin_edit_person_data");
    sessionStorage.removeItem("student_edit_person_id");
  };

  const handleStepClick = (to) => {
    if (to === "/medical_student_list") {
      clearStickyStudentSelection();
      navigate(to);
      return;
    }

    const pid =
      sessionStorage.getItem("admin_edit_person_id") ||
      sessionStorage.getItem("edit_person_id");
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
      {MEDICAL_PROCESS_TABS.map((tab, index) => (
        <Card
          key={tab.to}
          onClick={() => handleStepClick(tab.to)}
          sx={{
            flex: `1 1 ${100 / MEDICAL_PROCESS_TABS.length}%`,
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

export default MedicalProcessTabs;
