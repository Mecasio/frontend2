import React, { useContext, useEffect, useRef, useState } from "react";
import axios from "axios";
import { Alert, Box, Button, FormControl, MenuItem, Select, Snackbar, Typography } from "@mui/material";
import { SettingsContext } from "../App";
import API_BASE_URL from "../apiConfig";
import { FaFileExcel } from "react-icons/fa";
import { getAuditHeaders } from "../utils/auditEvents";
import useAuditMac from "../utils/useAuditMac";

const UploadEnrolledSubject = () => {
  useAuditMac();
  const settings = useContext(SettingsContext);
  const colors = settings?.colors || {};

  const [titleColor, setTitleColor] = useState("#000000");
  const [branches, setBranches] = useState([]);
  const [campus, setCampus] = useState("");
  const [importingXlsx, setImportingXlsx] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "info",
  });

  const importInputRef = useRef(null);

  useEffect(() => {
    if (!settings) return;

    if (colors.title) setTitleColor(colors.title);

    const normalizedBranches = settings?.branches || [];
    setBranches(normalizedBranches);
    setCampus((prev) => prev || String(normalizedBranches?.[0]?.id ?? ""));
  }, [settings, colors.title]);

  const handleEnrolledSubjectImport = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!campus) {
      setSnackbar({
        open: true,
        message: "Please select a campus first.",
        severity: "warning",
      });
      event.target.value = "";
      return;
    }

    try {
      setImportingXlsx(true);
      const formData = new FormData();
      formData.append("file", file);
      formData.append("campus", campus);

      const response = await axios.post(`${API_BASE_URL}/import-xlsx-into-enrolled-subject`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          ...getAuditHeaders(),
        },
      });

      if (response.data?.success) {
        setSnackbar({
          open: true,
          message: response.data.message || "Enrolled subject import completed.",
          severity: "success",
        });
      } else {
        setSnackbar({
          open: true,
          message: response.data?.error || "Enrolled subject import failed.",
          severity: "error",
        });
      }
    } catch (error) {
      setSnackbar({
        open: true,
        message: error.response?.data?.error || "Enrolled subject import failed.",
        severity: "error",
      });
    } finally {
      setImportingXlsx(false);
      event.target.value = "";
    }
  };

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
    <Box sx={{ height: "calc(100vh - 150px)", overflowY: "auto", paddingRight: 1, backgroundColor: "transparent", mt: 1, p: 2 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", mb: 2 }}>
        <Typography variant="h4" sx={{ fontWeight: "bold", color: titleColor, fontSize: "36px" }}>
          UPLOAD ENROLLED SUBJECT
        </Typography>

        <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap", justifyContent: "flex-end" }}>
          <FormControl size="small" sx={{ minWidth: 180, backgroundColor: "#fff" }}>
            <Select value={campus} onChange={(e) => setCampus(e.target.value)} displayEmpty>
              {branches.map((branch) => (
                <MenuItem key={branch.id ?? branch.branch} value={String(branch.id ?? "")}>
                  {branch.branch}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <input
            ref={importInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleEnrolledSubjectImport}
            style={{ display: "none" }}
          />
          <Button
            variant="contained"
            onClick={() => importInputRef.current?.click()}
            disabled={importingXlsx}
            sx={{ height: 40, textTransform: "none", fontWeight: "bold", minWidth: 230 }}
          >
            <FaFileExcel style={{ marginRight: 8 }} />
            {importingXlsx ? "Importing..." : "Import Enrolled Subject"}
          </Button>
        </Box>
      </Box>

      <hr style={{ border: "1px solid #ccc", width: "100%" }} />

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
      >
        <Alert severity={snackbar.severity}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
};

export default UploadEnrolledSubject;
