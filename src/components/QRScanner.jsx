// src/components/QRScanner.jsx
import React, { useContext, useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Box,
  Button,
  Alert,
  CircularProgress,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { SettingsContext } from "../App";

/*
 Props:
  - open (bool)
  - onClose()  -> called when dialog closes
  - onScan(text) -> called when QR code text is read
*/
export default function QRScanner({ open, onClose, onScan }) {
  const settings = useContext(SettingsContext);
  const colors = settings?.colors || {};
  const headerColor = colors.header || "#1976d2";

  const scannerRef = useRef(null);
  const html5QrRef = useRef(null);
  const [cameraId, setCameraId] = useState(null);

  const [error, setError] = useState(null);
  const [initializing, setInitializing] = useState(false);

  useEffect(() => {
    if (!open) return;

    let mounted = true;
    setError(null);
    setInitializing(true);

    (async () => {
      if (typeof window !== "undefined" && !window.isSecureContext) {
        if (mounted) {
          setError(
            "Camera access is blocked because this page isn't served over HTTPS (or http://localhost). " +
              "Open the app via https:// or via localhost on this device to use the scanner.",
          );
          setInitializing(false);
        }
        return;
      }

      if (!navigator.mediaDevices?.getUserMedia) {
        if (mounted) {
          setError("This browser doesn't support camera access.");
          setInitializing(false);
        }
        return;
      }

      try {
        const devices = await Html5Qrcode.getCameras();
        if (!mounted) return;

        if (!devices || devices.length === 0) {
          setError("No camera was found on this device.");
          setInitializing(false);
          return;
        }

        const back = devices.find((d) =>
          /back|rear|environment/i.test(d.label),
        );
        const chosen = back || devices[0];
        setCameraId(chosen?.id || null);

        html5QrRef.current = new Html5Qrcode(
          scannerRef.current.id || "qr-reader",
        );

        await html5QrRef.current.start(
          chosen?.id || { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 300, height: 300 },
            disableFlip: false,
          },
          (decodedText) => {
            if (onScan) onScan(decodedText);
            if (onClose) onClose();
          },
          () => {
            // ignore frequent no-read errors
          },
        );

        if (mounted) setInitializing(false);
      } catch (err) {
        console.error("QR init error:", err);
        if (!mounted) return;

        const name = err?.name || "";
        let message = "Failed to start the camera. Please try again.";

        if (name === "NotAllowedError" || name === "PermissionDeniedError") {
          message =
            "Camera permission was denied. Please allow camera access in your browser settings and try again.";
        } else if (
          name === "NotFoundError" ||
          name === "DevicesNotFoundError"
        ) {
          message = "No camera was found on this device.";
        } else if (name === "NotReadableError" || name === "TrackStartError") {
          message = "The camera is already in use by another application.";
        } else if (err?.message) {
          message = err.message;
        }

        setError(message);
        setInitializing(false);
      }
    })();

    return () => {
      mounted = false;
      if (html5QrRef.current) {
        const stopResult = html5QrRef.current.stop();

        if (stopResult && typeof stopResult.then === "function") {
          stopResult
            .catch((err) => {
              if (!String(err).includes("not running")) {
                console.warn("QR stop error:", err);
              }
            })
            .finally(() => {
              html5QrRef.current
                ?.clear()
                .catch(() => {})
                .finally(() => {
                  html5QrRef.current = null;
                });
            });
        } else {
          try {
            html5QrRef.current.clear();
          } catch (e) {}
          html5QrRef.current = null;
        }
      }
    };
  }, [open, onScan, onClose]);

  const handleRetry = () => {
    setError(null);
    setInitializing(true);
    setCameraId((prev) => prev);
    window.location.reload();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle
        sx={{
          bgcolor: headerColor || "#1976d2",
          color: "white",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        📷 Scan QR Code
        <IconButton
          onClick={onClose}
          sx={{
            color: "white",
            border: "2px solid rgba(255,255,255,0.6)",
            borderRadius: "50%",
            width: 48,
            height: 48,
            padding: 0,
            "&:hover": {
              backgroundColor: "rgba(255,255,255,0.2)",
              border: "2px solid white",
            },
          }}
        >
          <CloseIcon sx={{ fontSize: 18 }} />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ p: 3 }}>
        {initializing && !error && (
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              py: 4,
              gap: 1,
            }}
          >
            <CircularProgress size={32} />
            <Typography variant="body2" color="text.secondary">
              Starting camera...
            </Typography>
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box
          id="qr-reader-wrapper"
          sx={{
            width: "100%",
            display: error ? "none" : "flex",
            justifyContent: "center",
          }}
        >
          <div
            id="qr-reader"
            ref={scannerRef}
            style={{ width: "100%", maxWidth: 420 }}
          />
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 2, justifyContent: "space-between" }}>
        <Button onClick={onClose} color="error" variant="outlined">
          Cancel
        </Button>

        {error && (
          <Button
            onClick={handleRetry}
            variant="contained"
            color="success"
            size="small"
            sx={{ minWidth: 140, height: 40 }}
          >
            RETRY
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
