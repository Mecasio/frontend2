// src/components/PrintConfirmDialog.jsx
import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Button,
  Box,
  CircularProgress,
  Divider,
} from "@mui/material";
import PrintIcon from "@mui/icons-material/Print";
import DownloadIcon from "@mui/icons-material/Download";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";

// mode: "print" | "download"
const PrintConfirmDialog = ({
  open,
  mode = "download",
  formLabel,
  applicantName,
  applicantNumber,
  loading = false,
  onCancel,
  onConfirm,
}) => {
  const isPrint = mode === "print";

  return (
    <Dialog open={open} onClose={loading ? undefined : onCancel} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        {isPrint ? <PrintIcon color="primary" /> : <DownloadIcon color="primary" />}
        Confirm {isPrint ? "Print" : "Download"}
      </DialogTitle>

      <DialogContent>
        <Typography variant="body2" sx={{ mb: 2 }}>
          You're about to {isPrint ? "print" : "generate and download"}:
        </Typography>

        <Box
          sx={{
            p: 1.5,
            borderRadius: 1,
            backgroundColor: "#f5f5f5",
            border: "1px solid #e0e0e0",
            mb: 2,
          }}
        >
          <Typography fontSize="14px" fontWeight="bold">
            {formLabel || "Selected form"}
          </Typography>
          <Typography fontSize="13px" color="text.secondary">
            {applicantName || "—"}
            {applicantNumber ? ` · ${applicantNumber}` : ""}
          </Typography>
        </Box>

        <Divider sx={{ mb: 1.5 }} />

        <Box sx={{ display: "flex", gap: 1, alignItems: "flex-start" }}>
          <WarningAmberIcon fontSize="small" color="warning" sx={{ mt: "2px" }} />
          <Typography fontSize="12.5px" color="text.secondary">
            This issues a new Document No. for this applicant's campus and
            cannot be undone or reused — only confirm once you're ready to
            {isPrint ? " print." : " keep the generated file."}
          </Typography>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onCancel} disabled={loading} color="inherit">
          Cancel
        </Button>
        <Button
          onClick={onConfirm}
          disabled={loading}
          variant="contained"
          startIcon={
            loading ? (
              <CircularProgress size={16} color="inherit" />
            ) : isPrint ? (
              <PrintIcon />
            ) : (
              <DownloadIcon />
            )
          }
        >
          {loading ? "Working..." : `Confirm ${isPrint ? "Print" : "Download"}`}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default PrintConfirmDialog;