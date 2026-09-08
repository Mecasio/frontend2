import React, { useContext, useEffect, useState } from "react";
import { Box, Card, Typography } from "@mui/material";
import SchoolIcon from "@mui/icons-material/School";
import PersonIcon from "@mui/icons-material/Person";
import AssignmentIcon from "@mui/icons-material/Assignment";
import ScoreIcon from "@mui/icons-material/Score";
import FormatListNumberedIcon from "@mui/icons-material/FormatListNumbered";
import { useLocation, useNavigate } from "react-router-dom";
import { SettingsContext } from "../App";

export const REGISTRAR_APPLICANT_PROCESS_TABS = [
  {
    label: "Applicant List",
    to: "/applicant_list_registrar",
    iconKey: "school",
  },
  {
    label: "Applicant Profile",
    to: "/applicant_registrar_personal_information",
    iconKey: "person",
  },
  {
    label: "Applicant Online Requirements",
    to: "/applicant_online_requirements_registrar",
    iconKey: "assignment",
  },
  {
    label: "Entrance Examination Score",
    to: "/registrar_entrance_examination_score",
    iconKey: "score",
  },
  {
    label: "Qualifying / Interview Exam Score",
    to: "/registrar_qualifying_interview_score",
    iconKey: "score",
  },
  {
    label: "Student Numbering Panel",
    to: "/student_numbering",
    iconKey: "numbering",
  },
];

export const getRegistrarApplicantProcessActiveStep = (pathname) => {
  const exact = REGISTRAR_APPLICANT_PROCESS_TABS.findIndex(
    (tab) => tab.to === pathname,
  );
  if (exact !== -1) return exact;

  if (
    pathname.startsWith("/applicant_registrar_personal_information") ||
    pathname.startsWith("/applicant_registrar_family_background") ||
    pathname.startsWith("/applicant_registrar_educational_attainment") ||
    pathname.startsWith("/applicant_registrar_health_medical_records") ||
    pathname.startsWith("/applicant_registrar_other_information")
  ) {
    return REGISTRAR_APPLICANT_PROCESS_TABS.findIndex(
      (tab) => tab.to === "/applicant_registrar_personal_information",
    );
  }

  return -1;
};

const TAB_ICONS = {
  school: <SchoolIcon fontSize="large" />,
  person: <PersonIcon fontSize="large" />,
  assignment: <AssignmentIcon fontSize="large" />,
  score: <ScoreIcon fontSize="large" />,
  numbering: <FormatListNumberedIcon fontSize="large" />,
};

const RegistrarApplicantProcessTabs = () => {
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

  const activeStep = getRegistrarApplicantProcessActiveStep(location.pathname);

  const ROUTES_WITHOUT_PERSON_ID = new Set([
    "/registrar_entrance_examination_score",
    "/registrar_qualifying_interview_score",
    "/student_numbering",
  ]);

  const clearStickyApplicantSelection = () => {
    sessionStorage.removeItem("admin_edit_person_id");
    sessionStorage.removeItem("admin_edit_person_id_source");
    sessionStorage.removeItem("admin_edit_person_id_ts");
    sessionStorage.removeItem("admin_edit_search_query");
    sessionStorage.removeItem("admin_edit_person_data");
    sessionStorage.removeItem("edit_person_id");
    sessionStorage.removeItem("edit_applicant_number");
  };

  const handleStepClick = (to) => {
    if (to === "/applicant_list_registrar") {
      clearStickyApplicantSelection();
      navigate(to);
      return;
    }

    // Score/numbering screens should always open blank (no sticky applicant search)
    if (ROUTES_WITHOUT_PERSON_ID.has(to)) {
      navigate(to);
      return;
    }

    const pid = sessionStorage.getItem("admin_edit_person_id");
    if (pid) {
      navigate(`${to}?person_id=${pid}`);
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
      {REGISTRAR_APPLICANT_PROCESS_TABS.map((tab, index) => (
        <Card
          key={tab.to}
          onClick={() => handleStepClick(tab.to)}
          sx={{
            flex: `1 1 ${100 / REGISTRAR_APPLICANT_PROCESS_TABS.length}%`,
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

export default RegistrarApplicantProcessTabs;
