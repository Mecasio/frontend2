import React, { useContext, useEffect, useState } from "react";
import { Box, Card, Typography } from "@mui/material";
import MeetingRoomIcon from "@mui/icons-material/MeetingRoom";
import PeopleIcon from "@mui/icons-material/People";
import SchoolIcon from "@mui/icons-material/School";
import CampaignIcon from "@mui/icons-material/Campaign";
import { useLocation, useNavigate } from "react-router-dom";
import { SettingsContext } from "../App";

export const ADMISSION_ROOM_ASSIGNMENT_TABS = [
  {
    label: "Verify Documents Room Assignment",
    to: "/verify_document_room_assignment",
    iconKey: "meetingRoom",
  },
  {
    label: "Evaluator's Applicant List",
    to: "/evaluator_schedule_room_list",
    iconKey: "people",
  },
  {
    label: "Entrance Exam Room Assignment",
    to: "/entrance_exam_room_assignment",
    iconKey: "meetingRoom",
  },
  {
    label: "Proctor's Applicant List",
    to: "/admission_schedule_room_list",
    iconKey: "people",
  },
  {
    label: "Exam Subject Management",
    to: "/exam_subject_management",
    iconKey: "school",
  },
  {
    label: "Announcement",
    to: "/admission_announcement",
    iconKey: "campaign",
  },
];

export const getAdmissionRoomAssignmentActiveStep = (pathname) =>
  ADMISSION_ROOM_ASSIGNMENT_TABS.findIndex((tab) => tab.to === pathname);

const TAB_ICONS = {
  meetingRoom: <MeetingRoomIcon fontSize="large" />,
  people: <PeopleIcon fontSize="large" />,
  school: <SchoolIcon fontSize="large" />,
  campaign: <CampaignIcon fontSize="large" />,
};

const AdmissionRoomAssignmentTabs = () => {
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

  const activeStep = getAdmissionRoomAssignmentActiveStep(location.pathname);

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
      {ADMISSION_ROOM_ASSIGNMENT_TABS.map((tab, index) => (
        <Card
          key={tab.to}
          onClick={() => navigate(tab.to)}
          sx={{
            flex: `1 1 ${100 / ADMISSION_ROOM_ASSIGNMENT_TABS.length}%`,
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

export default AdmissionRoomAssignmentTabs;
