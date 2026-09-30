import React, { useState, useEffect, useContext, useRef } from "react";
import { createPortal } from "react-dom";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";
import { Container, Box, Snackbar, Alert, Typography, Button } from "@mui/material";
import {
  Email as EmailIcon,
  Lock as LockIcon,
  Visibility,
  VisibilityOff,
  Person as PersonIcon,
  ArrowDropDown as ArrowDropDownIcon,
} from "@mui/icons-material";
import ArrowBackIosNewIcon from "@mui/icons-material/ArrowBackIosNew";
import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos";
import ZoomInIcon from "@mui/icons-material/ZoomIn";
import ZoomOutIcon from "@mui/icons-material/ZoomOut";
import CloseIcon from "@mui/icons-material/Close";
import CampaignIcon from "@mui/icons-material/Campaign";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import "../styles/Container.css";
import {
  UNIFORM_BORDER,
  UNIFORM_RADIUS,
  fieldBorder,
} from "../styles/formTokens";
import Logo from "../assets/Logo.png";
import { SettingsContext } from "../App";
import API_BASE_URL from "../apiConfig";
import AnnouncementSlider from "../components/AnnouncementSlider";
import { Link as RouterLink } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useResponsive } from "../hooks/useResponsive";
import {
  fetchAndStoreUserMacAddress,
  getLoginMacPayload,
} from "../utils/userMacAddress";

/* ─── Per-email localStorage lockout helpers ─── */
function lockoutKey(email) {
  return `login_lockout_until::${String(email).trim().toLowerCase()}`;
}
function getLockoutRemaining(email) {
  if (!email) return 0;
  const until = localStorage.getItem(lockoutKey(email));
  if (!until) return 0;
  const remaining = Math.ceil((Number(until) - Date.now()) / 1000);
  return remaining > 0 ? remaining : 0;
}
function saveLockout(email, seconds) {
  if (!email) return;
  localStorage.setItem(lockoutKey(email), String(Date.now() + seconds * 1000));
}
function clearLockout(email) {
  if (!email) return;
  localStorage.removeItem(lockoutKey(email));
}

/* ─── Formats announcement text with bullets / line-breaks ─── */
const FormattedContent = ({ text }) => {
  if (!text) return null;
  const lines = text.split("\n");
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
      {lines.map((line, i) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={i} style={{ height: "5px" }} />;

        const subBullet = line.match(/^[\s\t]{2,}[•*\-–]\s+(.*)/);
        if (subBullet) {
          return (
            <div
              key={i}
              style={{ display: "flex", gap: "6px", alignItems: "flex-start", paddingLeft: "14px" }}
            >
              <span style={{ color: "rgba(255,255,255,0.5)", fontSize: "11px", marginTop: "3px", flexShrink: 0 }}>◦</span>
              <span style={{ color: "rgba(255,255,255,0.8)", fontSize: "12.5px", lineHeight: 1.55 }}>{subBullet[1]}</span>
            </div>
          );
        }

        const bullet = trimmed.match(/^[•*\-–]\s+(.*)/);
        if (bullet) {
          return (
            <div key={i} style={{ display: "flex", gap: "7px", alignItems: "flex-start" }}>
              <span style={{ color: "#fff", fontSize: "13px", marginTop: "2px", flexShrink: 0 }}>•</span>
              <span style={{ color: "rgba(255,255,255,0.92)", fontSize: "13px", lineHeight: 1.55 }}>{bullet[1]}</span>
            </div>
          );
        }

        if (trimmed.startsWith("#")) {
          return (
            <p key={i} style={{ margin: "4px 0 0", color: "rgba(255,255,255,0.45)", fontSize: "11.5px", lineHeight: 1.5 }}>
              {trimmed}
            </p>
          );
        }

        return (
          <p key={i} style={{ margin: 0, color: "rgba(255,255,255,0.9)", fontSize: "13px", lineHeight: 1.6 }}>
            {trimmed}
          </p>
        );
      })}
    </div>
  );
};

/* ─── Fullscreen Announcement Viewer Modal ─── */
export const AnnouncementViewerModal = ({ slides, startIndex, onClose }) => {
  const [index, setIndex] = useState(startIndex || 0);
  const [scale, setScale] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [showContent, setShowContent] = useState(false);

  const current = slides[index];

  const goNext = () => {
    setIndex((prev) => (prev + 1) % slides.length);
    setScale(1);
    setShowContent(false);
  };
  const goPrev = () => {
    setIndex((prev) => (prev - 1 + slides.length) % slides.length);
    setScale(1);
    setShowContent(false);
  };

  const handleDragEnd = (_, info) => {
    if (scale > 1) return;
    if (Math.abs(info.offset.x) < Math.abs(info.offset.y)) {
      setIsDragging(false);
      return;
    }
    if (info.offset.x < -60) goNext();
    else if (info.offset.x > 60) goPrev();
    setIsDragging(false);
  };

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  if (!current) return null;

  const hasImage = !!current.file_path;
  const hasContent = !!current.content?.trim();

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99999,
        background: "rgba(0,0,0,0.97)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* ── Top Bar ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 14px",
          background: "rgba(0,0,0,0.8)",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 0 }}>
          <CampaignIcon sx={{ color: "#fff", fontSize: 18, flexShrink: 0 }} />
          <span
            style={{
              color: "#fff",
              fontWeight: 600,
              fontSize: "13px",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {current.title}
          </span>
        </div>
        <div style={{ display: "flex", gap: 6, flexShrink: 0, marginLeft: 8 }}>
          {hasImage && (
            <>
              <button
                onClick={() => setScale((s) => Math.min(s + 0.5, 3))}
                style={{
                  background: "rgba(255,255,255,0.15)",
                  border: "none",
                  borderRadius: "50%",
                  width: 34,
                  height: 34,
                  color: "#fff",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <ZoomInIcon sx={{ fontSize: 18 }} />
              </button>
              <button
                onClick={() => setScale((s) => Math.max(s - 0.5, 1))}
                style={{
                  background: "rgba(255,255,255,0.15)",
                  border: "none",
                  borderRadius: "50%",
                  width: 34,
                  height: 34,
                  color: "#fff",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <ZoomOutIcon sx={{ fontSize: 18 }} />
              </button>
            </>
          )}
          <button
            onClick={onClose}
            style={{
              background: "rgba(220,38,38,0.85)",
              border: "none",
              borderRadius: "50%",
              width: 34,
              height: 34,
              color: "#fff",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <CloseIcon sx={{ fontSize: 18 }} />
          </button>
        </div>
      </div>

      {/* ── Image Area ── */}
      {hasImage && (
        <div
          style={{
            flex: showContent ? "0 0 45%" : "1 1 auto",
            position: "relative",
            overflow: "hidden",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "flex 0.3s ease",
            minHeight: 0,
          }}
        >
          {slides.length > 1 && (
            <button
              onClick={goPrev}
              style={{
                position: "absolute",
                left: 10,
                top: "50%",
                transform: "translateY(-50%)",
                zIndex: 10,
                background: "rgba(255,255,255,0.18)",
                border: "none",
                borderRadius: "50%",
                width: 38,
                height: 38,
                color: "#fff",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <ArrowBackIosNewIcon sx={{ fontSize: 17 }} />
            </button>
          )}
          {slides.length > 1 && (
            <button
              onClick={goNext}
              style={{
                position: "absolute",
                right: 10,
                top: "50%",
                transform: "translateY(-50%)",
                zIndex: 10,
                background: "rgba(255,255,255,0.18)",
                border: "none",
                borderRadius: "50%",
                width: 38,
                height: 38,
                color: "#fff",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <ArrowForwardIosIcon sx={{ fontSize: 17 }} />
            </button>
          )}
          <AnimatePresence mode="wait">
            <motion.div
              key={current.id}
              drag={scale <= 1 ? "x" : false}
              dragDirectionLock
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.03}
              onDragStart={() => setIsDragging(true)}
              onDragEnd={handleDragEnd}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.25 }}
              style={{
                width: "100%",
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                touchAction: scale > 1 ? "pinch-zoom" : "pan-y",
              }}
            >
              <img
                src={`${API_BASE_URL}/uploads/Announcement/${current.file_path}`}
                alt={current.title}
                draggable={false}
                style={{
                  maxWidth: "100%",
                  maxHeight: "100%",
                  objectFit: "contain",
                  transform: `scale(${scale})`,
                  transformOrigin: "center center",
                  transition: "transform 0.2s ease",
                  userSelect: "none",
                  borderRadius: scale > 1 ? 0 : "6px",
                }}
              />
            </motion.div>
          </AnimatePresence>
          {scale > 1 && (
            <div
              style={{
                position: "absolute",
                bottom: 10,
                left: "50%",
                transform: "translateX(-50%)",
                background: "rgba(0,0,0,0.6)",
                color: "#fff",
                fontSize: "11px",
                padding: "4px 10px",
                borderRadius: "20px",
                pointerEvents: "none",
              }}
            >
              {Math.round(scale * 100)}% — tap − to zoom out
            </div>
          )}
        </div>
      )}

      {/* ── Content Toggle Tab ── */}
      {hasContent && (
        <button
          onClick={() => setShowContent((v) => !v)}
          style={{
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            padding: "9px 16px",
            background: showContent ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.07)",
            border: "none",
            borderTop: "1px solid rgba(255,255,255,0.12)",
            color: "#fff",
            cursor: "pointer",
            fontSize: "12.5px",
            fontWeight: 600,
            transition: "background 0.2s",
          }}
        >
          {showContent ? <KeyboardArrowDownIcon sx={{ fontSize: 18 }} /> : <KeyboardArrowUpIcon sx={{ fontSize: 18 }} />}
          {showContent ? "Hide announcement details" : "Show full announcement"}
          {!showContent && (
            <span
              style={{
                background: "rgba(255,255,255,0.2)",
                borderRadius: "10px",
                padding: "1px 7px",
                fontSize: "10.5px",
                marginLeft: 2,
              }}
            >
              tap to read
            </span>
          )}
        </button>
      )}

      {/* ── Content Panel ── */}
      {hasContent && showContent && (
        <div
          style={{
            flex: hasImage ? "0 0 auto" : "1 1 auto",
            maxHeight: hasImage ? "48%" : "100%",
            overflowY: "auto",
            background: "linear-gradient(160deg, #1a1a2e 0%, #16213e 60%, #0f3460 100%)",
            padding: "16px 18px 20px",
            borderTop: "1px solid rgba(255,255,255,0.1)",
            scrollbarWidth: "thin",
            scrollbarColor: "rgba(255,255,255,0.2) transparent",
          }}
        >
          <p style={{ margin: "0 0 10px", color: "#fff", fontWeight: 700, fontSize: "13.5px", lineHeight: 1.4 }}>
            {current.title}
          </p>
          <div style={{ width: 28, height: 2, background: "rgba(255,255,255,0.3)", borderRadius: 2, marginBottom: 12 }} />
          <FormattedContent text={current.content} />
        </div>
      )}

      {/* ── Bottom Bar: dots + counter ── */}
      <div
        style={{
          padding: "10px 14px",
          background: "rgba(0,0,0,0.8)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          gap: 10,
        }}
      >
        {slides.length > 1 &&
          slides.map((_, i) => (
            <div
              key={i}
              onClick={() => {
                setIndex(i);
                setScale(1);
                setShowContent(false);
              }}
              style={{
                width: i === index ? 18 : 7,
                height: 7,
                borderRadius: 4,
                background: i === index ? "#fff" : "rgba(255,255,255,0.35)",
                transition: "all 0.3s",
                cursor: "pointer",
              }}
            />
          ))}
        {slides.length > 1 && (
          <span style={{ color: "rgba(255,255,255,0.5)", fontSize: "12px", marginLeft: 2 }}>
            {index + 1} / {slides.length}
          </span>
        )}
      </div>
    </div>
  );
};

/* ─── Inline compact-device announcement banner (mobile + tablet) ─── */
const CompactAnnouncementBanner = ({ slides, flush = false, roundTop = false, narrow = false, onVisibilityChange }) => {
  const [openViewer, setOpenViewer] = useState(false);
  const [viewerStartIndex, setViewerStartIndex] = useState(0);
  const [index, setIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [bannerVisible, setBannerVisible] = useState(true);
  const [expandedContent, setExpandedContent] = useState(false);

  useEffect(() => {
    if (slides.length <= 1) return;
    const t = setTimeout(() => setIndex((prev) => (prev + 1) % slides.length), 4500);
    return () => clearTimeout(t);
  }, [index, slides.length]);

  if (!slides.length) return null;
  const current = slides[index];
  if (!current) return null;

  const hasImage = !!current.file_path;
  const hasContent = !!current.content?.trim();

  const goNext = () => setIndex((prev) => (prev + 1) % slides.length);
  const goPrev = () => setIndex((prev) => (prev - 1 + slides.length) % slides.length);

  const handleDragEnd = (_, info) => {
    if (Math.abs(info.offset.x) < Math.abs(info.offset.y)) {
      setIsDragging(false);
      return;
    }
    if (info.offset.x < -60) goNext();
    else if (info.offset.x > 60) goPrev();
    setIsDragging(false);
  };

  const handleOpenViewer = () => {
    setViewerStartIndex(index);
    setOpenViewer(true);
  };

  return (
    <>
      {openViewer && typeof document !== "undefined"
        ? createPortal(
            <AnnouncementViewerModal
              slides={slides}
              startIndex={viewerStartIndex}
              onClose={() => setOpenViewer(false)}
            />,
            document.body
          )
        : null}

      {!bannerVisible && (
        <button
          onClick={() => {
            setBannerVisible(true);
            onVisibilityChange?.(true);
          }}
          style={{
            width: flush ? "calc(100% - 32px)" : "100%",
            margin: flush ? "12px 16px 0" : "0 0 14px",
            padding: "10px",
            background: "rgba(0,0,0,0.08)",
            border: "1.5px dashed rgba(0,0,0,0.25)",
            borderRadius: "10px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            color: "rgba(0,0,0,0.55)",
            fontSize: "13px",
            fontWeight: 500,
            boxSizing: "border-box",
          }}
        >
          <CampaignIcon sx={{ fontSize: 16 }} />
          Show Announcements
        </button>
      )}

      {bannerVisible && (
        <div
          style={{
            width: "100%",
            borderRadius: flush
              ? roundTop
                ? "12px 12px 0 0"
                : 0
              : "14px",
            overflow: "hidden",
            marginBottom: flush ? 0 : "16px",
            boxShadow: flush ? "none" : "0 4px 18px rgba(0,0,0,0.25)",
            background: "#000",
            border: flush ? "none" : "1.5px solid rgba(0,0,0,0.15)",
            borderBottom: flush ? "1px solid rgba(0,0,0,0.12)" : undefined,
          }}
        >
          {hasImage && (
            <div style={{ position: "relative", aspectRatio: narrow ? "16 / 7" : "16 / 9", background: "#000" }}>
              <button
                onClick={() => {
                  setBannerVisible(false);
                  onVisibilityChange?.(false);
                }}
                style={{
                  position: "absolute",
                  top: 8,
                  right: 8,
                  zIndex: 20,
                  background: "rgba(0,0,0,0.6)",
                  border: "none",
                  borderRadius: "50%",
                  width: 28,
                  height: 28,
                  color: "#fff",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <CloseIcon sx={{ fontSize: 14 }} />
              </button>

              <button
                onClick={handleOpenViewer}
                style={{
                  position: "absolute",
                  top: 8,
                  left: 8,
                  zIndex: 20,
                  background: "rgba(0,0,0,0.6)",
                  border: "none",
                  borderRadius: "20px",
                  padding: "4px 10px",
                  color: "#fff",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  fontSize: "11px",
                  fontWeight: 600,
                }}
              >
                <ZoomInIcon sx={{ fontSize: 14 }} />
                View
              </button>

              <button
                onClick={goPrev}
                style={{
                  position: "absolute",
                  left: 8,
                  top: "50%",
                  transform: "translateY(-50%)",
                  zIndex: 10,
                  background: "rgba(0,0,0,0.55)",
                  border: "none",
                  borderRadius: "50%",
                  width: 34,
                  height: 34,
                  color: "#fff",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <ArrowBackIosNewIcon sx={{ fontSize: 16 }} />
              </button>

              <button
                onClick={goNext}
                style={{
                  position: "absolute",
                  right: 8,
                  top: "50%",
                  transform: "translateY(-50%)",
                  zIndex: 10,
                  background: "rgba(0,0,0,0.55)",
                  border: "none",
                  borderRadius: "50%",
                  width: 34,
                  height: 34,
                  color: "#fff",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <ArrowForwardIosIcon sx={{ fontSize: 16 }} />
              </button>

              <AnimatePresence mode="wait">
                <motion.div
                  key={current.id}
                  drag="x"
                  dragDirectionLock
                  dragConstraints={{ left: 0, right: 0 }}
                  dragElastic={0.03}
                  onDragStart={() => setIsDragging(true)}
                  onDragEnd={handleDragEnd}
                  initial={{ x: 120, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: -120, opacity: 0 }}
                  transition={{ duration: 0.35 }}
                  style={{ width: "100%", height: "100%", position: "relative", touchAction: "pan-y" }}
                >
                  <img
                    src={`${API_BASE_URL}/uploads/Announcement/${current.file_path}`}
                    alt={current.title}
                    onClick={handleOpenViewer}
                    style={{ width: "100%", height: "100%", objectFit: "cover", userSelect: "none", display: "block", cursor: "zoom-in" }}
                    draggable={false}
                  />
                  <div
                    style={{
                      position: "absolute",
                      bottom: 0,
                      width: "100%",
                      padding: "1.8rem 0.9rem 0.6rem",
                      background: "linear-gradient(transparent, rgba(0,0,0,0.78))",
                      color: "#fff",
                      pointerEvents: "none",
                    }}
                  >
                    <p style={{ margin: 0, fontWeight: 600, fontSize: "0.82rem", lineHeight: 1.3 }}>{current.title}</p>
                  </div>
                </motion.div>
              </AnimatePresence>

              {slides.length > 1 && (
                <div style={{ position: "absolute", bottom: 8, right: 10, display: "flex", gap: 5, zIndex: 10 }}>
                  {slides.map((_, i) => (
                    <div
                      key={i}
                      onClick={() => setIndex(i)}
                      style={{
                        width: i === index ? 16 : 6,
                        height: 6,
                        borderRadius: 3,
                        background: i === index ? "#fff" : "rgba(255,255,255,0.45)",
                        transition: "all 0.3s",
                        cursor: "pointer",
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {hasContent && (
            <button
              onClick={() => setExpandedContent((v) => !v)}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "10px 14px",
                background: expandedContent
                  ? "linear-gradient(135deg, #1a1a2e, #16213e)"
                  : "linear-gradient(135deg, #1a1a2e, #0f3460)",
                border: "none",
                cursor: "pointer",
                borderTop: hasImage ? "1px solid rgba(255,255,255,0.08)" : "none",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                <CampaignIcon sx={{ color: "rgba(255,255,255,0.7)", fontSize: 15 }} />
                <span style={{ color: "#fff", fontSize: "12.5px", fontWeight: 600 }}>
                  {expandedContent ? "Hide details" : "Read full announcement"}
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                {!expandedContent && (
                  <span
                    style={{
                      background: "rgba(255,255,255,0.18)",
                      borderRadius: "10px",
                      padding: "2px 8px",
                      fontSize: "10.5px",
                      color: "rgba(255,255,255,0.85)",
                    }}
                  >
                    tap to read
                  </span>
                )}
                {expandedContent ? (
                  <KeyboardArrowUpIcon sx={{ color: "#fff", fontSize: 18 }} />
                ) : (
                  <KeyboardArrowDownIcon sx={{ color: "#fff", fontSize: 18 }} />
                )}
              </div>
            </button>
          )}

          {hasContent && expandedContent && (
            <div
              style={{
                background: "linear-gradient(160deg, #1a1a2e 0%, #16213e 60%, #0f3460 100%)",
                padding: "14px 16px 18px",
                maxHeight: "260px",
                overflowY: "auto",
                scrollbarWidth: "thin",
                scrollbarColor: "rgba(255,255,255,0.2) transparent",
                borderTop: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              {!hasImage && (
                <>
                  <p style={{ margin: "0 0 8px", color: "#fff", fontWeight: 700, fontSize: "13.5px", lineHeight: 1.4 }}>
                    {current.title}
                  </p>
                  <div style={{ width: 28, height: 2, background: "rgba(255,255,255,0.3)", borderRadius: 2, marginBottom: 12 }} />
                </>
              )}
              <FormattedContent text={current.content} />
            </div>
          )}
        </div>
      )}
    </>
  );
};

/* ═══════════════════════════════════════════════════════════
   LOGIN PAGE
══════════════════════════════════════════════════════════════ */
const Login = ({ setIsAuthenticated }) => {
  const settings = useContext(SettingsContext);
  const { isMobile, isTablet, isCompact, width: viewportWidth, height: viewportHeight } = useResponsive();
  const colors = settings?.colors || {};
  const branding = settings?.branding || {};
  const assets = settings?.assets || {};
  const mainButtonColor = colors.mainButton || "#1976d2";
  const headerColor = colors.header || "#1976d2";
  const borderColor = colors.border || "#e6e6e6";
  const companyName = branding.companyName || "Company Name";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [snack, setSnack] = useState({ open: false, message: "", severity: "info" });
  const [currentYear, setCurrentYear] = useState("");
  const [loginType, setLoginType] = useState("applicant");
  const [compactSlides, setCompactSlides] = useState([]);
  const [compactAnnouncementVisible, setCompactAnnouncementVisible] = useState(true);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [tempLoginData, setTempLoginData] = useState(null);
  const [showOtpModal, setShowOtpModal] = useState(false);
  const navigate = useNavigate();

  /* ─── Lockout state ─── */
  const lockTimerRef = useRef(0);
  const [isLocked, setIsLocked] = useState(false);
  const [lockTimer, setLockTimer] = useState(0);

  useEffect(() => {
    const now = new Date().toLocaleString("en-US", { timeZone: "Asia/Manila" });
    setCurrentYear(new Date(now).getFullYear());
  }, []);

  useEffect(() => {
    fetchAndStoreUserMacAddress().catch((err) => {
      console.error("Unable to preload MAC address for audit logs:", err);
    });
  }, []);

  // Fetch the compact banner data for mobile/tablet; desktop uses AnnouncementSlider.
  useEffect(() => {
    if (!isCompact) return;
    axios
      .get(`${API_BASE_URL}/api/announcements`, { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` } })
      .then((res) => {
        if (Array.isArray(res.data.data)) setCompactSlides(res.data.data);
      })
      .catch(() => { });
  }, [isCompact]);

  /* ── Restore lockout for THIS email when the email field changes ── */
  useEffect(() => {
    if (!email) return;
    const remaining = getLockoutRemaining(email);
    if (remaining > 0 && !isLocked) {
      lockTimerRef.current = remaining;
      setLockTimer(remaining);
      setIsLocked(true);
    }
  }, [email]);

  /* ── Countdown tick ── */
  useEffect(() => {
    if (!isLocked) return;
    const interval = setInterval(() => {
      lockTimerRef.current -= 1;
      setLockTimer(lockTimerRef.current);
      if (lockTimerRef.current <= 0) {
        clearInterval(interval);
        clearLockout(email);
        setIsLocked(false);
        lockTimerRef.current = 0;
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [isLocked]); // eslint-disable-line react-hooks/exhaustive-deps

  const startLockout = (emailVal, seconds) => {
    saveLockout(emailVal, seconds);
    lockTimerRef.current = seconds;
    setLockTimer(seconds);
    setIsLocked(true);
  };

  const isFormValid = () => {
    let newErrors = {};
    let isValid = true;
    if (!email) {
      newErrors.email = true;
      isValid = false;
    }
    if (!password) {
      newErrors.password = true;
      isValid = false;
    }
    setErrors(newErrors);
    return isValid;
  };

  const handleLogin = async () => {
    if (!isFormValid()) {
      setSnack({ open: true, message: "Please fill in all fields", severity: "warning" });
      return;
    }

    const stillLocked = getLockoutRemaining(email);
    if (stillLocked > 0) {
      if (!isLocked) {
        lockTimerRef.current = stillLocked;
        setLockTimer(stillLocked);
        setIsLocked(true);
      }
      return;
    }

    try {
      setLoading(true);
      const apiUrl =
        loginType === "applicant"
          ? `${API_BASE_URL}/api/login_applicant`
          : `${API_BASE_URL}/api/login`;

      const res = await axios.post(apiUrl, {
        email,
        password,
        audit_log_db: "db3",
        ...getLoginMacPayload(),
      }, { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` } });

      if (res.data.locked) {
        const secs = res.data.remainingSeconds ?? 180;
        setSnack({ open: true, message: res.data.message, severity: "error" });
        startLockout(email, secs);
        return;
      }

      if (!res.data.success) {
        setSnack({ open: true, message: res.data.message, severity: "error" });
        return;
      }

      clearLockout(email);
      setTempLoginData(res.data);

      if (res.data.force_password_change) {
        localStorage.setItem("force_password_change", "true");
      } else {
        localStorage.removeItem("force_password_change");
      }

      const pendingKey = `pending_force_password_change::${(res.data.email || email).toLowerCase()}`;
      if (localStorage.getItem(pendingKey) === "true") {
        localStorage.setItem("force_password_change", "true");
        localStorage.removeItem(pendingKey);
      }

      const shouldForceChange = localStorage.getItem("force_password_change") === "true";

      if (loginType === "applicant") {
        localStorage.removeItem("lastVisitedPath");
        localStorage.setItem("token", res.data.token);
        localStorage.setItem("email", res.data.email);
        localStorage.setItem("role", res.data.role);
        localStorage.setItem("person_id", res.data.person_id);
        localStorage.setItem("applyingAs", res.data.applyingAs);
        localStorage.setItem("prof_id", "");
        localStorage.setItem("employee_id", "");
        localStorage.setItem("curriculum_id", "");
        setIsAuthenticated(true);
          navigate(shouldForceChange ? "/applicant_reset_password" : "/dashboard");
        return;
      }

      if (res.data.requireOtp === false) {
        localStorage.removeItem("lastVisitedPath");
        localStorage.setItem("token", res.data.token);
        localStorage.setItem("email", res.data.email);
        localStorage.setItem("role", res.data.role);
        localStorage.setItem("person_id", res.data.person_id);
        localStorage.setItem("prof_id", res.data.prof_id || "");
        localStorage.setItem("department", res.data.department || "");
        localStorage.setItem("employee_id", res.data.employee_id);
        localStorage.setItem("curriculum_id", res.data.curriculum_id || "");
        localStorage.setItem(
          "accessList",
          JSON.stringify(Array.isArray(res.data.accessList) ? res.data.accessList : []),
        );
        setIsAuthenticated(true);
        if (shouldForceChange) {
          const roleVal = res.data.role?.toLowerCase();
          const changePwPath =
            roleVal === "faculty"
              ? "/faculty_reset_password"
              : ["administrator", "superadmin", "technical"].includes(roleVal)
                ? "/registrar_reset_password"
                : "/student_reset_password";
          navigate(changePwPath);
        } else {
          const dashboard = getUserDashboard(res.data.role, res.data.accessList);
          navigate(dashboard);
        }
        return;
      }

      if (res.data.requireOtp === true) {
        setShowOtpModal(true);
        setSnack({ open: true, message: "OTP sent to your email", severity: "success" });
        return;
      }
    } catch (error) {
      const data = error.response?.data;
      const message = data?.message || "Login failed";
      const attemptsLeft = data?.remaining;
      const displayMsg =
        attemptsLeft != null
          ? `${message} (${attemptsLeft} attempt${attemptsLeft !== 1 ? "s" : ""} left)`
          : message;
      setSnack({ open: true, message: displayMsg, severity: "error" });
      if (
        data?.remainingSeconds ||
        message.toLowerCase().includes("too many") ||
        message.toLowerCase().includes("locked")
      ) {
        const secs = data?.remainingSeconds ?? 180;
        startLockout(email, secs);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClose = (_, reason) => {
    if (reason === "clickaway") return;
    setSnack((prev) => ({ ...prev, open: false }));
  };

  function getUserDashboard() {
    return "/dashboard";
  }

  const backgroundBase =
    assets.backgroundImage || "linear-gradient(to right, #f5f5f5, #fafafa)";
  const backgroundImage = `linear-gradient(to bottom, rgba(0, 0, 0, 0.65), rgba(0, 0, 0, 0.15)), ${backgroundBase}`;
  const logoSrc = assets.logoUrl || Logo;

  // 🔒 Disable right-click + block DevTools shortcuts.
  // Registered ONCE (not on every render) to avoid stacking listeners,
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

  // ── Layout tokens per device tier ──
  const fieldHeight = isMobile ? "48px" : "46px";
  const compactAnnouncementOpen = isCompact && compactSlides.length > 0 && compactAnnouncementVisible;
  const narrowAnnouncementOpen = isMobile && compactAnnouncementOpen && viewportWidth < 380;

  return (
    <Box
      sx={{
        backgroundImage,
        backgroundSize: "cover, cover",
        backgroundPosition: "center, center",
        backgroundRepeat: "no-repeat, no-repeat",
        width: "100%",
        // The app header and fixed footer are outside this content area.
        // Keep the login canvas inside the space between them.
        height: isCompact
          ? isMobile
            ? "calc(100dvh - 56px - 40px)"
            : "calc(100dvh - 64px - 40px)"
          : "calc(100vh - 64px - 40px)",
        minHeight: 0,
        display: "flex",
        // An open announcement makes the compact card taller than the
        // available mobile area. Start it at the safe content boundary so
        // centering cannot move its top behind the fixed app header.
        alignItems:
          isCompact && isMobile && compactAnnouncementOpen
            ? "flex-start"
            : "center",
        justifyContent: "center",
        overflowY: isCompact ? "auto" : "hidden",
        overflowX: "hidden",
        py: isCompact ? (isTablet ? 4 : 0) : 0,
        pt: 0,
        px: isCompact ? (isMobile ? 0 : 2) : 2,
        pb: 0,
        boxSizing: "border-box",
      }}
    >
      <Container
        style={{
          width: "100%",
          maxWidth: isCompact ? 672 : 1400,
          margin: "0 auto",
          display: "flex",
          flexDirection: isCompact ? "column" : "row",
          alignItems: "center",
          justifyContent: "center",
          gap: isCompact ? 16 : 28,
          padding: isCompact ? (isMobile ? "0" : "0 16px") : "0 24px",
          boxSizing: "border-box",
        }}
        maxWidth={false}
      >
        {!isCompact && (
          <Box
            sx={{
              width: "auto",
              flex: "1 1 auto",
              minWidth: 0,
              position: "relative",
              height: "min(690px, calc(100vh - 64px - 40px))",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <AnnouncementSlider alignCenter />
          </Box>
        )}

        <div
          style={{
            border: `1px solid ${borderColor}`,
            marginLeft: "auto",
            marginRight: "auto",
            marginTop:
              isCompact && isMobile && compactAnnouncementOpen
                ? 30
                : 0,
            marginBottom:
              isMobile && viewportHeight < 666
                ? 30
                : 0,
            width: isCompact
              ? isMobile
                ? "calc(100% - 32px)"
                : "min(520px, 92vw)"
              : 460,
            maxWidth: isCompact ? (isMobile ? 480 : 520) : 460,
            minWidth: 0,
            flex: isCompact ? "none" : "0 0 460px",
            // The compact login also contains the announcement and registration
            // prompt, so use a slightly smaller scale to keep the complete card
            // between the fixed header and footer on phone-sized screens.
            // Keep the compact form reduced while allowing its scaled height
            // to participate in layout, avoiding unused space before footer.
            zoom: narrowAnnouncementOpen
              ? isMobile && viewportHeight < 760
                ? 0.72
                : 0.82
              : 0.9,
            boxSizing: "border-box",
          }}
          className="Container login-card uniform-card"
        >
          {/* ── Header (hidden on mobile) ── */}
          {!isMobile && (
            <div
              className="Header"
              style={{
                backgroundColor: headerColor,
                padding: isTablet ? "14px 12px" : "1rem 0",
                borderBottom: "none",
              }}
            >
              <div className="HeaderTitle">
                <div className="CircleCon">
                  <img src={logoSrc} alt="Logo" />
                </div>
              </div>
              <div className="HeaderBody">
                <strong style={{ color: "white" }}>
                  {companyName.split(" ").reduce((acc, word, i) => {
                    if (i % 4 === 0 && i !== 0) acc.push(<br key={`br-${i}`} />);
                    acc.push(word + " ");
                    return acc;
                  }, [])}
                </strong>
                <p>Academic Portal System</p>
              </div>
            </div>
          )}

          {/* ── Body ── */}
          <div
            className="Body"
            style={
              isCompact && compactSlides.length > 0
                ? { padding: 0 }
                : undefined
            }
          >
            {isCompact && compactSlides.length > 0 && (
              <CompactAnnouncementBanner
                slides={compactSlides}
                flush
                roundTop={isMobile}
                narrow={isMobile && viewportWidth < 380}
                onVisibilityChange={setCompactAnnouncementVisible}
              />
            )}
            <div
              style={
                isCompact && compactSlides.length > 0
                  ? {
                      padding: isMobile
                        ? "16px 16px 0"
                        : "20px 18px 0",
                    }
                  : undefined
              }
            >
            {/* Login As */}
            <div className="TextField" style={{ position: "relative" }}>
              <label htmlFor="loginType">Login As</label>
              <select
                id="loginType"
                name="loginType"
                value={loginType}
                onChange={(e) => {
                  setLoginType(e.target.value);
                  if (e.target.value === "applicant") navigate("/login_applicant");
                  else navigate("/login");
                }}
                style={{
                  width: "100%",
                  padding: "0.8rem 2.5rem 0.8rem 2.80rem",
                  borderRadius: UNIFORM_RADIUS,
                  border: UNIFORM_BORDER,
                  fontSize: "16px",
                  height: fieldHeight,
                  backgroundColor: "white",
                  outline: "none",
                  appearance: "none",
                  WebkitAppearance: "none",
                  MozAppearance: "none",
                  cursor: "pointer",
                }}
              >
                <option value="user">Student / Faculty / Registrar</option>
                <option value="applicant">Applicant</option>
              </select>
              <PersonIcon style={{ position: "absolute", top: "2.80rem", left: "0.7rem", color: "rgba(0,0,0,0.4)" }} />
              <ArrowDropDownIcon
                style={{
                  position: "absolute",
                  top: "2.80rem",
                  right: "0.7rem",
                  fontSize: "30px",
                  color: "black",
                  pointerEvents: "none",
                }}
              />
            </div>

            {/* Email */}
            <div className="TextField" style={{ position: "relative" }}>
              <label htmlFor="email">Applicant ID / Email Address</label>
              <input
                type="email"
                id="email"
                name="email"
                placeholder="Enter your email address"
                className="border"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !isLocked && !loading && handleLogin()}
                style={{
                  paddingLeft: "2.80rem",
                  height: fieldHeight,
                  fontSize: "16px",
                  border: fieldBorder(errors.email),
                  borderRadius: UNIFORM_RADIUS,
                  width: "100%",
                }}
              />
              {errors.email && <span style={{ color: "red", fontSize: "15px" }}>Email is required</span>}
              <EmailIcon style={{ position: "absolute", top: "2.80rem", left: "0.7rem", color: "rgba(0,0,0,0.4)" }} />
            </div>

            {/* Password */}
            <div className="TextField" style={{ position: "relative" }}>
              <label htmlFor="password">Password</label>
              <input
                type={showPassword ? "text" : "password"}
                id="password"
                name="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !isLocked && !loading && handleLogin()}
                className="border"
                style={{
                  paddingLeft: "2.80rem",
                  height: fieldHeight,
                  fontSize: "16px",
                  border: fieldBorder(errors.password),
                  borderRadius: UNIFORM_RADIUS,
                  width: "100%",
                }}
              />
              {errors.password && <span style={{ color: "red", fontSize: "15px" }}>Password is required</span>}
              <LockIcon style={{ position: "absolute", top: "2.80rem", left: "0.7rem", color: "rgba(0,0,0,0.4)", fontSize: "22px" }} />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  color: "rgba(0,0,0,0.3)",
                  outline: "none",
                  position: "absolute",
                  top: "2.80rem",
                  right: "1rem",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  touchAction: "manipulation",
                }}
              >
                {showPassword ? (
                  <Visibility sx={{ fontSize: "22px", color: "rgba(0,0,0,0.4)" }} />
                ) : (
                  <VisibilityOff sx={{ fontSize: "22px", color: "rgba(0,0,0,0.4)" }} />
                )}
              </button>
            </div>
            <div style={{marginTop: "-10px"}}>
              <span>
                <Link to="/applicant_forgot_password">Forgot your password</Link>
              </span>
            </div>

            {/* Login Button */}
            <div
              tabIndex={0}
              style={{
                height: isMobile ? "48px" : "44px",
                borderRadius: UNIFORM_RADIUS,
                border: "none",
                backgroundColor: isLocked ? "#999" : loading ? "#ccc" : mainButtonColor,
                opacity: isLocked || loading ? 0.7 : 1,
                pointerEvents: isLocked || loading ? "none" : "auto",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: isLocked || loading ? "not-allowed" : "pointer",
                touchAction: "manipulation",
              }}
              className="Button"
              onClick={!isLocked && !loading ? handleLogin : undefined}
              onKeyDown={(e) => e.key === "Enter" && !isLocked && !loading && handleLogin()}
            >
              <span>{isLocked ? `Locked (${lockTimer}s)` : loading ? "Processing..." : "Log In"}</span>
            </div>

            {/* Forgot Password */}
            {/* <div className="LinkContainer">
              <span>
                <Link to="/applicant_forgot_password">Forgot your password</Link>
              </span>
            </div> */}

            <Box sx={{ mt: 2, display: "flex", flexDirection: "column", alignItems: "center", gap: 1 }}>
              {/*<Typography
                variant="body1"
                color="textSecondary"
                align="center"
                sx={{ lineHeight: 1.55 }}
              >
                Welcome! If you are a new applicant or have not yet finalized your registration, you may create an
                account now. Registering an account enables you to submit your application and access all required
                information.
              </Typography>*/}
              <div
                style={{
                  width: "100%",
                  marginTop: "-8px",
                  padding: "9px 10px",
                  boxSizing: "border-box",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "10px",
                  backgroundColor: "#fff1f1",
                  borderRadius: "6px",
                  border: "1px solid #f4d2d2",
                }}
              >
                <div style={{ textAlign: "left", lineHeight: 1.15 }}>
                  <div style={{ color: "#7a0000", fontWeight: 700, fontSize: isMobile ? "12px" : "11px" }}>
                    New applicant?
                  </div>
                  <div style={{ color: "#777", fontSize: isMobile ? "10px" : "9px", marginTop: "3px" }}>
                    Register for ECAT to create your applicant account.
                  </div>
                </div>
                <Link
                  to="/register"
                  style={{
                    flexShrink: 0,
                    padding: "6px 9px",
                    border: "1px solid #b40000",
                    borderRadius: "5px",
                    color: "#8b0000",
                    backgroundColor: "#fff",
                    fontSize: isMobile ? "10px" : "9px",
                    fontWeight: 700,
                    textDecoration: "none",
                    whiteSpace: "nowrap",
                  }}
                >
                  Register for ECAT <span aria-hidden="true">➜</span>
                </Link>
              </div>
              
              {/* <Button
                component={RouterLink}
                to="/register"
                variant="contained"
                sx={{
                  textTransform: "none",
                  fontWeight: "bold",
                  px: 3,
                  py: 1.2,
                  borderRadius: UNIFORM_RADIUS,
                  border: "none",
                  color: "#fff",
                  boxShadow: "none",
                  width: isCompact ? "100%" : undefined,
                  minHeight: 44,
                }}
              >
                REGISTER NOW
              </Button> */}
            </Box>
            </div>
          </div>

          {/* ── Footer ── */}
          <div
            className="Footer"
            style={{
              backgroundColor: headerColor,
              borderTop: "none",
              color: "white",
            }}
          >
            <div className="FooterText">
            </div>
          </div>
        </div>
      </Container>

      <Snackbar
        open={snack.open}
        autoHideDuration={4000}
        onClose={handleClose}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert severity={snack.severity} onClose={handleClose} sx={{ width: "100%" }}>
          {snack.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Login;
