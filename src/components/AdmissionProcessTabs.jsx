import React, { useContext, useEffect, useState } from "react";
import { Box, Card, Typography } from "@mui/material";
import SchoolIcon from "@mui/icons-material/School";
import PersonIcon from "@mui/icons-material/Person";
import AssignmentIcon from "@mui/icons-material/Assignment";
import ScheduleIcon from "@mui/icons-material/Schedule";
import PersonSearchIcon from "@mui/icons-material/PersonSearch";
import ScoreIcon from "@mui/icons-material/Score";
import { useLocation, useNavigate } from "react-router-dom";
import { SettingsContext } from "../App";

export const ADMISSION_PROCESS_TABS = [
  {
    label: "Applicant List",
    to: "/admission_applicant_list",
    iconKey: "school",
  },
  {
    label: "Applicant Profile",
    to: "/admission_personal_information",
    iconKey: "person",
  },
  {
    label: "Applicant Online Requirements",
    to: "/admission_online_requirements",
    iconKey: "assignment",
  },
  {
    label: "Verify Schedule Management",
    to: "/verify_document_schedule_management",
    iconKey: "schedule",
  },
  {
    label: "Entrance Exam Schedule Management",
    to: "/entrance_exam_schedule_management",
    iconKey: "schedule",
  },
  {
    label: "Examination Permit",
    to: "/examination_permit_change_course",
    iconKey: "personSearch",
  },
  {
    label: "Entrance Examination Score",
    to: "/applicant_entrance_exam_score",
    iconKey: "score",
  },
];

export const getAdmissionProcessActiveStep = (pathname) =>
  ADMISSION_PROCESS_TABS.findIndex((tab) => tab.to === pathname);

const TAB_ICONS = {
  school: <SchoolIcon fontSize="large" />,
  person: <PersonIcon fontSize="large" />,
  assignment: <AssignmentIcon fontSize="large" />,
  schedule: <ScheduleIcon fontSize="large" />,
  personSearch: <PersonSearchIcon fontSize="large" />,
  score: <ScoreIcon fontSize="large" />,
};

const AdmissionProcessTabs = () => {
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

  const activeStep = getAdmissionProcessActiveStep(location.pathname);

  const ROUTES_WITHOUT_PERSON_ID = new Set([
    "/verify_document_schedule_management",
    "/entrance_exam_schedule_management",
    "/applicant_entrance_exam_score",
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
    if (to === "/admission_applicant_list") {
      clearStickyApplicantSelection();
      navigate(to);
      return;
    }

    // Schedule/score screens should always open blank (no sticky applicant search)
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
      {ADMISSION_PROCESS_TABS.map((tab, index) => (
        <Card
          key={tab.to}
          onClick={() => handleStepClick(tab.to)}
          sx={{
            flex: `1 1 ${100 / ADMISSION_PROCESS_TABS.length}%`,
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

export default AdmissionProcessTabs;
