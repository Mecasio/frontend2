import React, { useContext, useEffect, useState } from "react";
import { Box, Card, Typography } from "@mui/material";
import {
  People,
  School,
  SupervisorAccount,
  AdminPanelSettings,
} from "@mui/icons-material";
import { useLocation, useNavigate } from "react-router-dom";
import { SettingsContext } from "../App";

export const SUPERADMIN_RESET_PASSWORD_TABS = [
  {
    label: "Applicant Reset Password",
    to: "/superadmin_applicant_reset_password",
    iconKey: "people",
  },
  {
    label: "Student Reset Password",
    to: "/superadmin_student_reset_password",
    iconKey: "school",
  },
  {
    label: "Faculty Reset Password",
    to: "/superadmin_faculty_reset_password",
    iconKey: "faculty",
  },
  {
    label: "Registrar Reset Password",
    to: "/superadmin_registrar_reset_password",
    iconKey: "registrar",
  },
];

export const getSuperAdminResetPasswordActiveStep = (pathname) =>
  SUPERADMIN_RESET_PASSWORD_TABS.findIndex((tab) => tab.to === pathname);

const TAB_ICONS = {
  people: <People fontSize="large" />,
  school: <School fontSize="large" />,
  faculty: <SupervisorAccount fontSize="large" />,
  registrar: <AdminPanelSettings fontSize="large" />,
};

const SuperAdminResetPasswordTabs = () => {
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

  const activeStep = getSuperAdminResetPasswordActiveStep(location.pathname);

  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "space-between",
        flexWrap: "nowrap",
        width: "100%",
        mt: 1,
        gap: 2,
      }}
    >
      {SUPERADMIN_RESET_PASSWORD_TABS.map((tab, index) => (
        <Card
          key={tab.to}
          onClick={() => navigate(tab.to)}
          sx={{
            flex: `1 1 ${100 / SUPERADMIN_RESET_PASSWORD_TABS.length}%`,
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

export default SuperAdminResetPasswordTabs;
