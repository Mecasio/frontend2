// src/components/PhotoCaptureDialog.jsx
import React, { useContext, useEffect, useRef, useState } from "react";
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
import CameraAltIcon from "@mui/icons-material/CameraAlt";
import ReplayIcon from "@mui/icons-material/Replay";
import axios from "axios";
import { SettingsContext } from "../App";
import API_BASE_URL from "../apiConfig";

/*
 Props:
  - open (bool)
  - onClose()                 -> called when dialog closes
  - personId (string|number)  -> enrollment person_id whose profile_img gets updated
  - uploadUrl (string)        -> defaults to the existing enrollment upload endpoint
  - fieldName (string)        -> multipart field name expected by the backend
  - onUploaded(filename)      -> called with the new filename after a successful save
*/
export default function PhotoCaptureDialog({
  open,
  onClose,
  personId,
  uploadUrl = "/api/enrollment/upload-profile-picture",
  fieldName = "profile_picture",
  onUploaded,
}) {
  const settings = useContext(SettingsContext);
  const colors = settings?.colors || {};
  const headerColor = colors.header || "#1976d2";

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const [error, setError] = useState(null);
  const [initializing, setInitializing] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null); // data URL
  const [uploading, setUploading] = useState(false);

  const stopStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  const startStream = async () => {
    setError(null);
    setInitializing(true);

    if (typeof window !== "undefined" && !window.isSecureContext) {
      setError(
        "Camera access is blocked because this page isn't served over HTTPS (or http://localhost). " +
          "Open the app via https:// or via localhost on this device to use the camera.",
      );
      setInitializing(false);
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setError("This browser doesn't support camera access.");
      setInitializing(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      setInitializing(false);
    } catch (err) {
      console.error("Camera init error:", err);

      const name = err?.name || "";
      let message = "Failed to start the camera. Please try again.";

      if (name === "NotAllowedError" || name === "PermissionDeniedError") {
        message =
          "Camera permission was denied. Please allow camera access in your browser settings and try again.";
      } else if (name === "NotFoundError" || name === "DevicesNotFoundError") {
        message = "No camera was found on this device.";
      } else if (name === "NotReadableError" || name === "TrackStartError") {
        message = "The camera is already in use by another application.";
      } else if (err?.message) {
        message = err.message;
      }

      setError(message);
      setInitializing(false);
    }
  };

  useEffect(() => {
    if (!open) return;

    setCapturedImage(null);
    let cancelled = false;

    (async () => {
      await startStream();
      if (cancelled) stopStream();
    })();

    return () => {
      cancelled = true;
      stopStream();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleRetry = () => {
    startStream();
  };

  const handleCapture = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const width = video.videoWidth || 480;
    const height = video.videoHeight || 480;
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, width, height);

    setCapturedImage(canvas.toDataURL("image/jpeg", 0.92));
    stopStream();
  };

  const handleRetake = () => {
    setCapturedImage(null);
    startStream();
  };

  const handleUpload = async () => {
    if (!capturedImage) return;

    if (!personId) {
      setError("No student is selected, so there's nothing to save the photo to.");
      return;
    }

    try {
      setUploading(true);

      const blob = await (await fetch(capturedImage)).blob();
      const formData = new FormData();
      formData.append(fieldName, blob, `capture_${Date.now()}.jpg`);
      formData.append("person_id", personId);

      const res = await axios.post(`${API_BASE_URL}${uploadUrl}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (onUploaded) onUploaded(res.data?.filename);
      handleDialogClose();
    } catch (err) {
      console.error("Photo upload failed:", err);
      setError(
        err?.response?.data?.message ||
          "Failed to save the captured photo. Please try again.",
      );
    } finally {
      setUploading(false);
    }
  };

  const handleDialogClose = () => {
    stopStream();
    setCapturedImage(null);
    setError(null);
    if (onClose) onClose();
  };

  return (
    <Dialog open={open} onClose={handleDialogClose} maxWidth="sm" fullWidth>
      <DialogTitle
        sx={{
          bgcolor: headerColor || "#1976d2",
          color: "white",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        📷 Capture Student Photo
        <IconButton
          onClick={handleDialogClose}
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
          <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", py: 4, gap: 1 }}>
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

        <Box sx={{ width: "100%", display: error ? "none" : "flex", justifyContent: "center" }}>
          {!capturedImage ? (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              style={{ width: "100%", maxWidth: 420, borderRadius: 8, backgroundColor: "#000" }}
            />
          ) : (
            <img
              src={capturedImage}
              alt="Captured preview"
              style={{ width: "100%", maxWidth: 420, borderRadius: 8 }}
            />
          )}
        </Box>

        <canvas ref={canvasRef} style={{ display: "none" }} />
      </DialogContent>

      <DialogActions sx={{ p: 2, justifyContent: "space-between" }}>
        <Button onClick={handleDialogClose} color="error" variant="outlined">
          Cancel
        </Button>

        <Box sx={{ display: "flex", gap: 1 }}>
          {error && (
            <Button onClick={handleRetry} variant="contained" color="success" size="small" sx={{ minWidth: 140, height: 40 }}>
              RETRY
            </Button>
          )}

          {!error && !capturedImage && (
            <Button
              onClick={handleCapture}
              variant="contained"
              color="primary"
              size="small"
              disabled={initializing}
              startIcon={<CameraAltIcon />}
              sx={{ minWidth: 140, height: 40 }}
            >
              CAPTURE
            </Button>
          )}

          {!error && capturedImage && (
            <>
              <Button
                onClick={handleRetake}
                variant="outlined"
                size="small"
                startIcon={<ReplayIcon />}
                disabled={uploading}
                sx={{ minWidth: 120, height: 40 }}
              >
                RETAKE
              </Button>
              <Button
                onClick={handleUpload}
                variant="contained"
                color="success"
                size="small"
                disabled={uploading}
                sx={{ minWidth: 140, height: 40 }}
              >
                {uploading ? "SAVING..." : "USE PHOTO"}
              </Button>
            </>
          )}
        </Box>
      </DialogActions>
    </Dialog>
  );
}