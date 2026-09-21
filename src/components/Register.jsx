import React, { useState, useRef, useEffect, useContext } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import "../styles/Container.css";
import Logo from "../assets/Logo.png";
import {
  Container,
  Box,
  Snackbar,
  Alert,
  TextField,
  Modal,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Button,
  Checkbox,
  CircularProgress,
  IconButton,
} from "@mui/material";
import {
  Email as EmailIcon,
  Lock as LockIcon,
  Visibility,
  VisibilityOff,
  Person as PersonIcon,
  ArrowDropDown as ArrowDropDownIcon,
  Badge as BadgeIcon,
  Cake as CakeIcon,
  PhoneAndroid as PhoneAndroidIcon,
  CheckCircle as CheckCircleIcon,
  AccessTime as AccessTimeIcon,
} from "@mui/icons-material";
import ArrowBackIosNewIcon from "@mui/icons-material/ArrowBackIosNew";
import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos";
import ZoomInIcon from "@mui/icons-material/ZoomIn";
import ZoomOutIcon from "@mui/icons-material/ZoomOut";
import CloseIcon from "@mui/icons-material/Close";
import CampaignIcon from "@mui/icons-material/Campaign";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import { SettingsContext } from "../App";
import API_BASE_URL from "../apiConfig";
import AnnouncementSlider from "../components/AnnouncementSlider";
import RedirectLoading from "../components/RedirectLoading";
import {
  fetchAndStoreUserMacAddress,
  getLoginMacPayload,
} from "../utils/userMacAddress";
import {
  FALLBACK_DETAIL_THEME,
  buildDetailThemesForSlides,
} from "../utils/announcementDetailColor";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import Autocomplete from "@mui/material/Autocomplete";
import { motion, AnimatePresence } from "framer-motion";
import MuiLink from "@mui/material/Link";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import Popover from "@mui/material/Popover";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import {
  UNIFORM_BORDER,
  UNIFORM_RADIUS,
  UNIFORM_FONT_SIZE,
  fieldBorder,
} from "../styles/formTokens";

dayjs.extend(customParseFormat);

/* ─── Device breakpoint hooks ───────────────────────────────────────────────
   Three tiers instead of one: phones get their own compact layout, tablets
   get a wider single-column layout (previously tablets fell into whichever
   bucket happened to straddle 768px, which broke iPads and Android tablets
   in portrait), and desktop/laptop keeps the original two-column layout.
════════════════════════════════════════════════════════════════════════════ */
const MOBILE_BP = 600; // phones
const TABLET_BP = 1024; // tablets (portrait + landscape up to ~1024px)

const useIsMobile = (bp = MOBILE_BP) => {
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" ? window.innerWidth <= bp : false,
  );
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth <= bp);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, [bp]);
  return isMobile;
};

const useIsTablet = (min = MOBILE_BP, max = TABLET_BP) => {
  const getVal = () =>
    typeof window !== "undefined" &&
    window.innerWidth > min &&
    window.innerWidth <= max;
  const [isTablet, setIsTablet] = useState(getVal);
  useEffect(() => {
    const handler = () => setIsTablet(getVal());
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, [min, max]);
  return isTablet;
};

/* ─── Formats announcement text with bullets / line-breaks ─── */
const FormattedContent = ({ text, style = {} }) => {
  if (!text) return null;
  const lines = text.split("\n");
  return (
    <div
      style={{ display: "flex", flexDirection: "column", gap: "3px", ...style }}
    >
      {lines.map((line, i) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={i} style={{ height: "5px" }} />;

        const subBullet = line.match(/^[\s\t]{2,}[•*\-–]\s+(.*)/);
        if (subBullet) {
          return (
            <div
              key={i}
              style={{
                display: "flex",
                gap: "6px",
                alignItems: "flex-start",
                paddingLeft: "14px",
              }}
            >
              <span
                style={{
                  color: "rgba(255,255,255,0.5)",
                  fontSize: "14px",
                  marginTop: "3px",
                  flexShrink: 0,
                }}
              >
                ◦
              </span>
              <span
                style={{
                  color: "rgba(255,255,255,0.8)",
                  fontSize: "15.5px",
                  lineHeight: 1.55,
                }}
              >
                {subBullet[1]}
              </span>
            </div>
          );
        }

        const bullet = trimmed.match(/^[•*\-–]\s+(.*)/);
        if (bullet) {
          return (
            <div
              key={i}
              style={{ display: "flex", gap: "7px", alignItems: "flex-start" }}
            >
              <span
                style={{
                  color: "#fff",
                  fontSize: "15px",
                  marginTop: "2px",
                  flexShrink: 0,
                }}
              >
                •
              </span>
              <span
                style={{
                  color: "rgba(255,255,255,0.92)",
                  fontSize: "15px",
                  lineHeight: 1.55,
                }}
              >
                {bullet[1]}
              </span>
            </div>
          );
        }

        if (trimmed.startsWith("#")) {
          return (
            <p
              key={i}
              style={{
                margin: "4px 0 0",
                color: "rgba(255,255,255,0.45)",
                fontSize: "14.5px",
                lineHeight: 1.5,
              }}
            >
              {trimmed}
            </p>
          );
        }

        return (
          <p
            key={i}
            style={{
              margin: 0,
              color: "rgba(255,255,255,0.9)",
              fontSize: "15px",
              lineHeight: 1.6,
            }}
          >
            {trimmed}
          </p>
        );
      })}
    </div>
  );
};

/* ─── Fullscreen Announcement Viewer Modal (mobile) ─── */
const AnnouncementViewerModal = ({ slides, startIndex, onClose, detailThemes = {} }) => {
  const [index, setIndex] = useState(startIndex || 0);
  const [scale, setScale] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [showContent, setShowContent] = useState(false);

  const current = slides[index];
  const theme =
    detailThemes[current?.id ?? current?.file_path] || FALLBACK_DETAIL_THEME;

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
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            flex: 1,
            minWidth: 0,
          }}
        >
          <CampaignIcon sx={{ color: "#fff", fontSize: 18, flexShrink: 0 }} />
          <span
            style={{
              color: "#fff",
              fontWeight: 600,
              fontSize: "15px",
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
                fontSize: "14px",
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
            background: showContent
              ? "rgba(255,255,255,0.12)"
              : "rgba(255,255,255,0.07)",
            border: "none",
            borderTop: "1px solid rgba(255,255,255,0.12)",
            color: "#fff",
            cursor: "pointer",
            fontSize: "15.5px",
            fontWeight: 600,
            transition: "background 0.2s",
          }}
        >
          {showContent ? (
            <KeyboardArrowDownIcon sx={{ fontSize: 18 }} />
          ) : (
            <KeyboardArrowUpIcon sx={{ fontSize: 18 }} />
          )}
          {showContent ? "Hide announcement details" : "Show full announcement"}
          {!showContent && (
            <span
              style={{
                background: "rgba(255,255,255,0.2)",
                borderRadius: "10px",
                padding: "1px 7px",
                fontSize: "14.5px",
                marginLeft: 2,
              }}
            >
              tap to read
            </span>
          )}
        </button>
      )}

      {hasContent && showContent && (
        <div
          style={{
            flex: hasImage ? "0 0 auto" : "1 1 auto",
            maxHeight: hasImage ? "48%" : "100%",
            overflowY: "auto",
            background: theme.panel,
            padding: "16px 18px 20px",
            borderTop: "1px solid rgba(255,255,255,0.1)",
            scrollbarWidth: "thin",
            scrollbarColor: "rgba(255,255,255,0.2) transparent",
          }}
        >
          <p
            style={{
              margin: "0 0 10px",
              color: "#fff",
              fontWeight: 700,
              fontSize: "15.5px",
              lineHeight: 1.4,
            }}
          >
            {current.title}
          </p>
          <div
            style={{
              width: 28,
              height: 2,
              background: theme.divider,
              borderRadius: 2,
              marginBottom: 12,
            }}
          />
          <FormattedContent text={current.content} />
        </div>
      )}

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
          <span
            style={{
              color: "rgba(255,255,255,0.5)",
              fontSize: "15px",
              marginLeft: 2,
            }}
          >
            {index + 1} / {slides.length}
          </span>
        )}
      </div>
    </div>
  );
};

/* ─── Compact mobile announcement banner ─── */
const MobileAnnouncementBanner = ({ slides }) => {
  const [openViewer, setOpenViewer] = useState(false);
  const [viewerStartIndex, setViewerStartIndex] = useState(0);
  const [index, setIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [bannerVisible, setBannerVisible] = useState(true);
  const [expandedContent, setExpandedContent] = useState(false);
  const [detailThemes, setDetailThemes] = useState({});

  useEffect(() => {
    if (slides.length <= 1) return;
    const t = setTimeout(
      () => setIndex((prev) => (prev + 1) % slides.length),
      4500,
    );
    return () => clearTimeout(t);
  }, [index, slides.length]);

  useEffect(() => {
    let cancelled = false;
    if (!slides?.length) {
      setDetailThemes({});
      return undefined;
    }
    buildDetailThemesForSlides(slides, API_BASE_URL).then((map) => {
      if (!cancelled) setDetailThemes(map);
    });
    return () => {
      cancelled = true;
    };
  }, [slides]);

  if (!slides.length) return null;
  const current = slides[index];
  if (!current) return null;

  const theme =
    detailThemes[current?.id ?? current?.file_path] || FALLBACK_DETAIL_THEME;

  const hasImage = !!current.file_path;
  const hasContent = !!current.content?.trim();

  const goNext = () => setIndex((prev) => (prev + 1) % slides.length);
  const goPrev = () =>
    setIndex((prev) => (prev - 1 + slides.length) % slides.length);

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
      {openViewer && (
        <AnnouncementViewerModal
          slides={slides}
          startIndex={viewerStartIndex}
          onClose={() => setOpenViewer(false)}
          detailThemes={detailThemes}
        />
      )}

      {!bannerVisible && (
        <button
          onClick={() => setBannerVisible(true)}
          style={{
            width: "100%",
            marginBottom: "14px",
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
            fontSize: "15px",
            fontWeight: 500,
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
            borderRadius: "14px",
            overflow: "hidden",
            marginBottom: "16px",
            boxShadow: "0 4px 18px rgba(0,0,0,0.25)",
            background: "#000",
            border: "1.5px solid rgba(0,0,0,0.15)",
          }}
        >
          {hasImage && (
            <div
              style={{
                position: "relative",
                aspectRatio: "16 / 9",
                background: "#000",
              }}
            >
              <button
                onClick={() => setBannerVisible(false)}
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
                  fontSize: "14px",
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
                  style={{
                    width: "100%",
                    height: "100%",
                    position: "relative",
                    touchAction: "pan-y",
                  }}
                >
                  <img
                    src={`${API_BASE_URL}/uploads/Announcement/${current.file_path}`}
                    alt={current.title}
                    onClick={handleOpenViewer}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      userSelect: "none",
                      display: "block",
                      cursor: "zoom-in",
                    }}
                    draggable={false}
                  />
                  <div
                    style={{
                      position: "absolute",
                      bottom: 0,
                      width: "100%",
                      padding: "1.8rem 0.9rem 0.6rem",
                      background:
                        "linear-gradient(transparent, rgba(0,0,0,0.78))",
                      color: "#fff",
                      pointerEvents: "none",
                    }}
                  >
                    <p
                      style={{
                        margin: 0,
                        fontWeight: 600,
                        fontSize: "0.82rem",
                        lineHeight: 1.3,
                      }}
                    >
                      {current.title}
                    </p>
                  </div>
                </motion.div>
              </AnimatePresence>

              {slides.length > 1 && (
                <div
                  style={{
                    position: "absolute",
                    bottom: 8,
                    right: 10,
                    display: "flex",
                    gap: 5,
                    zIndex: 10,
                  }}
                >
                  {slides.map((_, i) => (
                    <div
                      key={i}
                      onClick={() => setIndex(i)}
                      style={{
                        width: i === index ? 16 : 6,
                        height: 6,
                        borderRadius: 3,
                        background:
                          i === index ? "#fff" : "rgba(255,255,255,0.45)",
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
                  ? theme.panelCompactExpanded
                  : theme.panelCompact,
                border: "none",
                cursor: "pointer",
                borderTop: hasImage
                  ? "1px solid rgba(255,255,255,0.08)"
                  : "none",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                <CampaignIcon
                  sx={{ color: "rgba(255,255,255,0.7)", fontSize: 15 }}
                />
                <span
                  style={{ color: "#fff", fontSize: "15.5px", fontWeight: 600 }}
                >
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
                      fontSize: "14.5px",
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
                background: theme.panel,
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
                  <p
                    style={{
                      margin: "0 0 8px",
                      color: "#fff",
                      fontWeight: 700,
                      fontSize: "15.5px",
                      lineHeight: 1.4,
                    }}
                  >
                    {current.title}
                  </p>
                  <div
                    style={{
                      width: 28,
                      height: 2,
                      background: theme.divider,
                      borderRadius: 2,
                      marginBottom: 12,
                    }}
                  />
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

const SectionHeader = ({ icon, label, color }) => (
  <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 0.75, mb: 0.75, px: 1, py: 0.5, borderRadius: "6px", border: "1px solid #eadede", backgroundColor: label === "Personal Information" ? color : "#fff" }}>
    <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
    <Box
      sx={{
        width: 20,
        height: 20,
        borderRadius: "6px",
        backgroundColor: label === "Personal Information" ? "rgba(255,255,255,0.18)" : `${color}1a`, // ~10% tint of mainButtonColor
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 10,
        flexShrink: 0,
      }}
    >
      {icon}
    </Box>
    <Typography
      sx={{
        fontSize: 10.5,
        fontWeight: 700,
        color: label === "Personal Information" ? "#fff" : color,
        textTransform: "uppercase",
        letterSpacing: "0.05em",
      }}
    >
      {label}
    </Typography>
    </Box>
    {label === "Personal Information" && (
      <Box sx={{ color: "#fff", backgroundColor: color, borderRadius: "5px", px: 0.75, py: 0.25, fontSize: 9, fontWeight: 700 }}>
        🔒 Cannot be changed
      </Box>
    )}
  </Box>
);
/* ═══════════════════════════════════════════════════════════
   DATE FIELD
   Inlined here (previously ../components/DateField) so the
   birthday picker lives directly in the Register page.
════════════════════════════════════════════════════════════ */
const parseDateValue = (value) => {
  if (!value) return null;
  const parsed = dayjs(value, ["YYYY-MM-DD", "MM/DD/YYYY"], true);
  return parsed.isValid() ? parsed : null;
};

const formatDateInput = (value) => {
  const digits = String(value ?? "").replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
};

const BIRTH_WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

const calendarGridStart = (month) => {
  const start = month.startOf("month");
  const offset = (start.day() + 6) % 7;
  return start.subtract(offset, "day");
};

const DateField = React.forwardRef(function DateField(props, ref) {
  const settings = useContext(SettingsContext);
  const colors = settings?.colors || {};
  const mainButtonColor = colors.mainButton || "#1976d2";
  const {
    value,
    onChange,
    name,
    format = "MM/DD/YYYY",
    style = {},
    disabled,
    minDate = dayjs().subtract(100, "year").startOf("year"),
    maxDate = dayjs(),
    placeholder = "MM/DD/YYYY",
    ...rest
  } = props;

  const [anchorEl, setAnchorEl] = useState(null);
  const [text, setText] = useState("");
  const [viewMonth, setViewMonth] = useState(() =>
    dayjs().startOf("month"),
  );
  const [monthAnchor, setMonthAnchor] = useState(null);
  const [yearAnchor, setYearAnchor] = useState(null);
  const internalRef = useRef(null);
  const headerColor = colors.header || mainButtonColor;

  useEffect(() => {
    const parsed = parseDateValue(value);
    setText(parsed ? parsed.format(format) : "");
  }, [value, format]);

  const openCalendar = (e) => {
    if (disabled) return;
    const parsed = parseDateValue(value);
    setViewMonth(
      (parsed || dayjs()).startOf("month"),
    );
    setAnchorEl(e.currentTarget.closest("[data-datefield-root]"));
  };
  const closeCalendar = () => {
    setMonthAnchor(null);
    setYearAnchor(null);
    setAnchorEl(null);
  };

  const selectDate = (date) => {
    if (!date || !date.isValid()) return;
    if (date.isBefore(minDate, "day") || date.isAfter(maxDate, "day")) return;
    setText(date.format(format));
    onChange?.({ target: { name, value: date.format("YYYY-MM-DD") } });
    closeCalendar();
  };

  const handleTextChange = (e) => {
    const formatted = formatDateInput(e.target.value);
    setText(formatted);
    const parsed = dayjs(formatted, format, true);
    if (parsed.isValid()) {
      onChange?.({ target: { name, value: parsed.format("YYYY-MM-DD") } });
    } else if (formatted === "") {
      onChange?.({ target: { name, value: "" } });
    }
  };

  return (
    <div
      data-datefield-root
      style={{
        position: "relative",
        width: style.width ?? "100%",
        height: style.height,
        boxSizing: "border-box",
      }}
    >
      <input
        ref={(el) => {
          internalRef.current = el;
          if (typeof ref === "function") ref(el);
          else if (ref) ref.current = el;
        }}
        type="text"
        value={text}
        placeholder={placeholder}
        disabled={disabled}
        maxLength={10}
        onChange={handleTextChange}
        onClick={openCalendar}
        style={{
          width: "100%",
          height: style.height ?? "100%",
          boxSizing: "border-box",
          fontSize: style.fontSize,
          paddingLeft: style.paddingLeft ?? "14px",
          paddingRight: "40px",
          border: style.border || UNIFORM_BORDER,
          borderRadius: style.borderRadius ?? 0,
          backgroundColor: disabled ? "#f0f0f0" : "#fff",
          outline: "none",
        }}
        {...rest}
      />

      <IconButton
        onClick={openCalendar}
        disabled={disabled}
        size="small"
        sx={{
          position: "absolute",
          right: 4,
          top: "50%",
          transform: "translateY(-50%)",
          color: mainButtonColor,
        }}
      >
        <CalendarTodayIcon fontSize="small" />
      </IconButton>

      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={closeCalendar}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        slotProps={{
          paper: {
            sx: {
              mt: 0.75,
              width: 288,
              p: 1,
              borderRadius: "16px",
              bgcolor: "#f4f5f7",
              border: `1px solid ${headerColor}`,
              boxShadow: "0 16px 40px rgba(0,0,0,0.12)",
              overflow: "visible",
            },
          },
        }}
      >
        {(() => {
          const selected = parseDateValue(value);
          const gridStart = calendarGridStart(viewMonth);
          const days = Array.from({ length: 42 }, (_, index) =>
            gridStart.add(index, "day"),
          );
          const years = [];
          for (let year = maxDate.year(); year >= minDate.year(); year -= 1) {
            years.push(year);
          }
          const pillSx = {
            display: "flex",
            alignItems: "center",
            gap: 0.25,
            height: 28,
            px: 1,
            border: `1px solid ${headerColor}`,
            borderRadius: "8px",
            bgcolor: headerColor,
            color: "#fff",
            fontFamily: "Poppins, sans-serif",
            fontSize: 12,
            fontWeight: 700,
            cursor: "pointer",
            lineHeight: 1,
          };
          const arrowSx = {
            width: 28,
            height: 28,
            color: headerColor,
          };

          return (
            <Box>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  mb: 0.75,
                }}
              >
                <IconButton
                  size="small"
                  aria-label="Previous month"
                  sx={arrowSx}
                  onClick={() =>
                    setViewMonth((month) => month.subtract(1, "month"))
                  }
                >
                  <ArrowBackIosNewIcon sx={{ fontSize: 14 }} />
                </IconButton>
                <Box sx={{ display: "flex", gap: 0.5 }}>
                  <Box sx={{ position: "relative" }}>
                    <Box
                      component="button"
                      type="button"
                      sx={pillSx}
                      onClick={() => {
                        setYearAnchor(null);
                        setMonthAnchor((open) => !open);
                      }}
                    >
                      {viewMonth.format("MMMM")}
                      <KeyboardArrowDownIcon sx={{ fontSize: 14, color: "#fff" }} />
                    </Box>
                    {monthAnchor && (
                      <Box
                        sx={{
                          position: "absolute",
                          top: "calc(100% + 4px)",
                          left: 0,
                          zIndex: 2,
                          minWidth: "100%",
                          maxHeight: 180,
                          overflowY: "auto",
                          bgcolor: "#fff",
                          border: `1px solid ${headerColor}`,
                          borderRadius: "8px",
                          boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
                        }}
                      >
                        {Array.from({ length: 12 }, (_, monthIndex) => {
                          const selectedMonth = viewMonth.month() === monthIndex;
                          return (
                            <Box
                              key={monthIndex}
                              component="button"
                              type="button"
                              onClick={() => {
                                setViewMonth((month) => month.month(monthIndex));
                                setMonthAnchor(null);
                              }}
                              sx={{
                                display: "block",
                                width: "100%",
                                px: 1.25,
                                py: 0.6,
                                border: "none",
                                textAlign: "left",
                                fontFamily: "Poppins, sans-serif",
                                fontSize: 12,
                                fontWeight: 600,
                                cursor: "pointer",
                                bgcolor: selectedMonth ? mainButtonColor : "#fff",
                                color: selectedMonth ? "#fff" : "#1a1a1a",
                                "&:hover": {
                                  bgcolor: selectedMonth
                                    ? mainButtonColor
                                    : `${headerColor}14`,
                                },
                              }}
                            >
                              {dayjs().month(monthIndex).format("MMMM")}
                            </Box>
                          );
                        })}
                      </Box>
                    )}
                  </Box>
                  <Box sx={{ position: "relative" }}>
                    <Box
                      component="button"
                      type="button"
                      sx={pillSx}
                      onClick={() => {
                        setMonthAnchor(null);
                        setYearAnchor((open) => !open);
                      }}
                    >
                      {viewMonth.format("YYYY")}
                      <KeyboardArrowDownIcon sx={{ fontSize: 14, color: "#fff" }} />
                    </Box>
                    {yearAnchor && (
                      <Box
                        sx={{
                          position: "absolute",
                          top: "calc(100% + 4px)",
                          left: 0,
                          zIndex: 2,
                          minWidth: "100%",
                          maxHeight: 180,
                          overflowY: "auto",
                          bgcolor: "#fff",
                          border: `1px solid ${headerColor}`,
                          borderRadius: "8px",
                          boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
                        }}
                      >
                        {years.map((year) => {
                          const selectedYear = viewMonth.year() === year;
                          return (
                            <Box
                              key={year}
                              component="button"
                              type="button"
                              onClick={() => {
                                setViewMonth((month) => month.year(year));
                                setYearAnchor(null);
                              }}
                              sx={{
                                display: "block",
                                width: "100%",
                                px: 1.25,
                                py: 0.6,
                                border: "none",
                                textAlign: "left",
                                fontFamily: "Poppins, sans-serif",
                                fontSize: 12,
                                fontWeight: 600,
                                cursor: "pointer",
                                bgcolor: selectedYear ? mainButtonColor : "#fff",
                                color: selectedYear ? "#fff" : "#1a1a1a",
                                "&:hover": {
                                  bgcolor: selectedYear
                                    ? mainButtonColor
                                    : `${headerColor}14`,
                                },
                              }}
                            >
                              {year}
                            </Box>
                          );
                        })}
                      </Box>
                    )}
                  </Box>
                </Box>
                <IconButton
                  size="small"
                  aria-label="Next month"
                  sx={arrowSx}
                  onClick={() => setViewMonth((month) => month.add(1, "month"))}
                >
                  <ArrowForwardIosIcon sx={{ fontSize: 14 }} />
                </IconButton>
              </Box>

              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: "repeat(7, 1fr)",
                  gap: "4px",
                  mb: 0.5,
                }}
              >
                {BIRTH_WEEKDAYS.map((label) => (
                  <Box
                    key={label}
                    sx={{
                      textAlign: "center",
                      fontFamily: "Poppins, sans-serif",
                      fontSize: 11,
                      fontWeight: 600,
                      color: "#8b909a",
                    }}
                  >
                    {label}
                  </Box>
                ))}
              </Box>

              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: "repeat(7, 1fr)",
                  gap: "4px",
                }}
              >
                {days.map((day) => {
                  const inMonth = day.month() === viewMonth.month();
                  const isSelected = selected?.isSame(day, "day");
                  const isToday = dayjs().isSame(day, "day");
                  const outOfRange =
                    day.isBefore(minDate, "day") || day.isAfter(maxDate, "day");
                  return (
                    <Box
                      key={day.format("YYYY-MM-DD")}
                      component="button"
                      type="button"
                      disabled={outOfRange}
                      onClick={() => selectDate(day)}
                      sx={{
                        height: 32,
                        border: "none",
                        borderRadius: "8px",
                        fontFamily: "Poppins, sans-serif",
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: outOfRange ? "default" : "pointer",
                        bgcolor: isSelected
                          ? mainButtonColor
                          : isToday
                            ? `${mainButtonColor}22`
                            : inMonth
                              ? "#fff"
                              : "transparent",
                        color: isSelected
                          ? "#fff"
                          : outOfRange
                            ? "#c5c8ce"
                            : inMonth
                              ? "#1a1a1a"
                              : "#b0b4bc",
                        "&:hover": outOfRange
                          ? {}
                          : {
                              bgcolor: isSelected
                                ? mainButtonColor
                                : `${headerColor}18`,
                            },
                      }}
                    >
                      {day.date()}
                    </Box>
                  );
                })}
              </Box>
            </Box>
          );
        })()}
      </Popover>
    </div>
  );
});

const parseBirthDate = (dateString) => {
  if (!dateString) return null;
  const [y, m, d] = dateString.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
};

const getManilaToday = () => {
  const now = new Date();
  const manilaString = now.toLocaleString("en-PH", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const [month, day, year] = manilaString.split("/");
  return new Date(`${year}-${month}-${day}`);
};

const calculateAge = (birthDateString) => {
  const birthDate = parseBirthDate(birthDateString);
  if (!birthDate) return "";

  const today = getManilaToday();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  const dayDiff = today.getDate() - birthDate.getDate();

  if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
    age--;
  }

  return age < 0 ? "" : age;
};

/* ─── NEW: formats an academic program's daily registration window for
   display, e.g. "6:00 PM – 6:00 AM daily". Reads the "HH:MM" time part
   out of the program's start_date/end_date ("YYYY-MM-DDTHH:MM" strings).
   Returns "" when the program has no schedule (open all the time). ─── */
const formatProgramHours = (prog) => {
  if (!prog?.start_date || !prog?.end_date) return "";
  const startTime = prog.start_date.split("T")[1];
  const endTime = prog.end_date.split("T")[1];
  if (!startTime || !endTime) return "";

  const fmt = (t) => {
    const parsed = dayjs(t, "HH:mm", true);
    return parsed.isValid() ? parsed.format("h:mm A") : t;
  };

  return `${fmt(startTime)} – ${fmt(endTime)} daily`;
};

const passwordRules = [
  {
    label: "Minimum of 8 characters",
    test: (pw) => pw.length >= 8,
  },
  {
    label: "At least one lowercase letter (e.g. abc)",
    test: (pw) => /[a-z]/.test(pw),
  },
  {
    label: "At least one uppercase letter (e.g. ABC)",
    test: (pw) => /[A-Z]/.test(pw),
  },
  {
    label: "At least one number (e.g. 123)",
    test: (pw) => /\d/.test(pw),
  },
  {
    label: "At least one special character (! # $ ^ * @ - . < > _ & % + = ?)",
    test: (pw) => /[!#$^*@\-.<>_&%+=?]/.test(pw),
  },
];

const getPasswordRuleResults = (pw = "") =>
  passwordRules.map((rule) => ({ ...rule, passed: rule.test(pw) }));

/* ─── Bilingual password requirements notice + live checklist ─── */
const PasswordRulesNotice = ({
  password,
  isMobile,
  mainButtonColor,
  showChecklist,
}) => {
  const results = getPasswordRuleResults(password);

  return (
    <Box sx={{ mt: 1.5, mb: 1 }}>
      {/* Bilingual "important notice" explaining WHY, in plain terms */}
      <Box
        sx={{
          display: "none",
          gap: 1.25,
          alignItems: "flex-start",
          bgcolor: "#fff8e6",
          border: "1.5px solid #f5a623",
          borderRadius: "10px",
          p: 1.5,
          mb: showChecklist ? 1.25 : 0,
        }}
      >
        <span style={{ fontSize: 18, flexShrink: 0, marginTop: 1 }}>🔐</span>
        <Box>
          <Typography
            sx={{
              fontSize: isMobile ? "16px" : "15px",
              color: "#5d4037",
              fontWeight: 700,
              lineHeight: 1.5,
            }}
          >
            IMPORTANT: Your password MUST follow all the rules below.
          </Typography>
          <Typography
            sx={{
              fontSize: isMobile ? "14.5px" : "15.5px",
              color: "#5d4037",
              lineHeight: 1.6,
              mt: 0.4,
            }}
          >
            We're showing this now so you get familiar with it early — the same
            rules will be required every time you make or change a password on
            this system.
          </Typography>
        </Box>
      </Box>

      {/* Live checklist */}
        <Box
          sx={{
            border: "1.5px solid #ddd",
            borderRadius: "10px",
            p: 1.5,
            bgcolor: "#fafafa",
          }}
        >
          <Typography
            sx={{
              fontSize: isMobile ? "12px" : "14px",
              color: "#666",
              fontWeight: 700,
              mb: 1,
              letterSpacing: "0.03em",
            }}
          >
            PASSWORD REQUIREMENTS
          </Typography>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 0.9 }}>
            {results.map((rule, i) => (
              <Box
                key={i}
                sx={{ display: "flex", alignItems: "flex-start", gap: 1 }}
              >
                <span
                  style={{
                    flexShrink: 0,
                    marginTop: 1,
                    fontSize: 12,
                    color: rule.passed ? "#2e7d32" : "#bdbdbd",
                  }}
                >
                  {rule.passed ? "✅" : "⬜"}
                </span>
                <Box>
                  <Typography
                    sx={{
                      fontSize: isMobile ? "13px" : "13.5px",
                      color: rule.passed ? "#2e7d32" : "#000000",
                      fontWeight: rule.passed ? 700 : 500,
                      lineHeight: 1.45,
                    }}
                  >
                    {rule.label}
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: isMobile ? "12px" : "13px",
                      color: rule.passed ? "#2e7d32" : "#000000",
                      fontStyle: "italic",
                      lineHeight: 1.45,
                    }}
                  ></Typography>
                </Box>
              </Box>
            ))}
          </Box>
        </Box>
    </Box>
  );
};

/* ═══════════════════════════════════════════════════════════
   TOTP SETUP MODAL
   - Step 1: show QR code for user to scan (two columns —
             instructions on the left, QR code on the right)
   - Step 2: user enters the 6-digit code to confirm setup,
             then the full /register call is made
   Bilingual (English / Tagalog) throughout so applicants who
   are more comfortable in Tagalog aren't lost mid-setup.
════════════════════════════════════════════════════════════ */
const TotpSetupModal = ({
  open,
  onClose,
  onSuccess,
  email,
  mainButtonColor,
  isMobile,
  // All the registration payload fields passed through
  registrationPayload,
}) => {
  // step: "loading" | "scan" | "verify" | "submitting"
  const [step, setStep] = useState("loading");
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [qrScale, setQrScale] = useState(1);
  const [manualKey, setManualKey] = useState("");
  const [showManualKey, setShowManualKey] = useState(false);
  const [totpCode, setTotpCode] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState("");
  const [snack, setSnack] = useState({
    open: false,
    message: "",
    severity: "info",
  });
  const inputRefs = useRef([]);

  // Fetch QR code as soon as modal opens
  const [setupId, setSetupId] = useState("");

  useEffect(() => {
    if (!open || !email) return;
    setStep("loading");
    setError("");
    setTotpCode(["", "", "", "", "", ""]);
    setShowManualKey(false);
    setQrScale(1);
    setSetupId(""); // reset

    axios
      .post(`${API_BASE_URL}/api/register-totp-setup`, { email }, { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` } })
      .then((res) => {
        if (res.data.success) {
          setQrDataUrl(res.data.qrDataUrl);
          setManualKey(res.data.manualKey);
          setSetupId(res.data.setupId); // NEW
          setStep("scan");
        } else {
          setError(res.data.message || "Failed to generate QR code.");
          setStep("scan");
        }
      })
      .catch((err) => {
        setError(
          err.response?.data?.message ||
            "Failed to generate authenticator setup.",
        );
        setStep("scan");
      });
  }, [open, email]);

  const handleDigitChange = (value, index) => {
    if (!/^\d?$/.test(value)) return;
    const next = [...totpCode];
    next[index] = value;
    setTotpCode(next);
    if (value && index < 5) inputRefs.current[index + 1]?.focus();
  };

  const handleDigitKeyDown = (e, index) => {
    if (e.key === "Backspace") {
      if (totpCode[index]) {
        const next = [...totpCode];
        next[index] = "";
        setTotpCode(next);
      } else if (index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
    }
    if (e.key === "Enter") handleVerifyAndRegister();
  };

  const handleVerifyAndRegister = async () => {
    const code = totpCode.join("");
    if (!/^\d{6}$/.test(code)) {
      setError(
        "Please enter the complete 6-digit code from Google Authenticator.",
      );
      return;
    }
    setError("");
    setStep("submitting");

    try {
      const response = await axios.post(`${API_BASE_URL}/api/register`, {
        ...registrationPayload,
        otp: code,
        setupId, // NEW
      }, { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` } });

      if (!response.data.success) {
        setError(response.data.message || "Registration failed.");
        setStep("verify");
        return;
      }

      onSuccess(response.data);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Something went wrong. Please try again.",
      );
      setStep("verify");
    }
  };

  if (!open) return null;

  return (
    <Modal open={open} onClose={step === "submitting" ? undefined : onClose}>
      <Box
        sx={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: isMobile ? "calc(100% - 32px)" : step === "scan" ? 760 : 480,
          maxWidth: step === "scan" ? 760 : 480,
          bgcolor: "#fff",
          borderRadius: "20px",
          boxShadow: "0 20px 60px rgba(0,0,0,0.18)",

          outline: "none",
          maxHeight: "90vh",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* ── Colored header bar ── */}
        {step !== "loading" && (
          <Box
            sx={{
              bgcolor: mainButtonColor,
              color: "white",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              px: isMobile ? 2.5 : 3,
              py: 2,
              flexShrink: 0,
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: "50%",
                  bgcolor: "rgba(255,255,255,0.2)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                {step === "scan" ? (
                  <PhoneAndroidIcon sx={{ color: "#fff", fontSize: 21 }} />
                ) : (
                  <CheckCircleIcon sx={{ color: "#fff", fontSize: 21 }} />
                )}
              </Box>
              <Box>
                <Typography
                  fontWeight={700}
                  fontSize={isMobile ? 17 : 17}
                  color="white"
                  lineHeight={1.2}
                >
                  {step === "scan"
                    ? "Set Up Google Authenticator"
                    : "Enter Authenticator Code"}
                </Typography>
                <Typography
                  fontSize={15}
                  color="rgba(255,255,255,0.85)"
                  lineHeight={1.3}
                >
                  {step === "scan"
                    ? "One-time setup — Step 1 of 2"
                    : "Step 2 of 2 — Confirm & complete registration"}
                </Typography>
              </Box>
            </Box>

            <IconButton
              onClick={onClose}
              disabled={step === "submitting"}
              sx={{
                color: "white",
                border: "2px solid rgba(255,255,255,0.6)",
                borderRadius: "50%",
                width: 40,
                height: 40,
                padding: 0,
                flexShrink: 0,
                "&:hover": {
                  backgroundColor: "rgba(255,255,255,0.2)",
                  border: "2px solid white",
                },
              }}
            >
              <CloseIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Box>
        )}

        {/* ── Body (scrollable) ── */}
        <Box sx={{ p: isMobile ? 2.5 : 3.5, overflowY: "auto" }}>
          {/* ── Loading state ── */}
          {step === "loading" && (
            <Box sx={{ textAlign: "center", py: 5 }}>
              <CircularProgress sx={{ color: mainButtonColor }} />
              <Typography sx={{ mt: 2, color: "#666", fontSize: "16px" }}>
                Generating your authenticator QR code…
              </Typography>
            </Box>
          )}

          {/* ── Scan QR step: left = instructions, right = QR code ── */}
          {step === "scan" && (
            <Box
              sx={{
                display: "flex",
                flexDirection: isMobile ? "column" : "row",
                gap: isMobile ? 2.5 : 3.5,
                alignItems: "flex-start",
              }}
            >
              {/* LEFT: Instructions */}
              <Box sx={{ flex: 1.15, minWidth: 0, width: "100%" }}>
                <Box
                  sx={{
                    bgcolor: "#f8f9ff",
                    borderRadius: "12px",
                    p: 2,
                    mb: 2,
                    border: "1px solid #e8eaff",
                  }}
                >
                  <Box
                    sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}
                  >
                    {/* Step 1 label */}
                    <Box>
                      <Typography fontSize={15} color="#444" fontWeight={600}>
                        1. Download and install{" "}
                        <strong>Google Authenticator</strong>:
                      </Typography>
                    </Box>

                    {/* Download buttons — each on its own row */}
                    <Box
                      sx={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 0.75,
                        pl: 1,
                      }}
                    >
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 1,
                          bgcolor: "#fff",
                          border: "1px solid #dde3ff",
                          borderRadius: "8px",
                          px: 1.5,
                          py: 1,
                        }}
                      >
                        <span style={{ fontSize: 18, lineHeight: 1 }}>📱</span>
                        <MuiLink
                          href="https://apps.apple.com/app/google-authenticator/id388497605"
                          target="_blank"
                          rel="noopener noreferrer"
                          underline="always"
                          fontWeight="bold"
                          fontSize={15}
                          color="inherit"
                        >
                          App Store{" "}
                          <span style={{ fontWeight: 400, color: "#888" }}>
                            (iPhone / iPad)
                          </span>
                        </MuiLink>
                      </Box>

                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 1,
                          bgcolor: "#fff",
                          border: "1px solid #dde3ff",
                          borderRadius: "8px",
                          px: 1.5,
                          py: 1,
                        }}
                      >
                        <span style={{ fontSize: 18, lineHeight: 1 }}>🤖</span>
                        <MuiLink
                          href="https://play.google.com/store/apps/details?id=com.google.android.apps.authenticator2"
                          target="_blank"
                          rel="noopener noreferrer"
                          underline="always"
                          fontWeight="bold"
                          fontSize={15}
                          color="inherit"
                        >
                          Google Play{" "}
                          <span style={{ fontWeight: 400, color: "#888" }}>
                            (Android)
                          </span>
                        </MuiLink>
                      </Box>
                    </Box>

                    {/* Step 2 */}
                    <Box>
                      <Typography fontSize={15} color="#444" lineHeight={1.6}>
                        <strong>2.</strong> Open the app → tap{" "}
                        <strong>"+"</strong> → <strong>"Scan a QR code"</strong>
                        .
                      </Typography>
                    </Box>

                    {/* Step 3 */}
                    <Box>
                      <Typography fontSize={15} color="#444" lineHeight={1.6}>
                        <strong>3.</strong> Scan the QR code shown on the right.
                      </Typography>
                    </Box>
                  </Box>
                </Box>

                {/* Manual key fallback */}
                {manualKey && (
                  <Box sx={{ mb: 2 }}>
                    <button
                      onClick={() => setShowManualKey((v) => !v)}
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: mainButtonColor,
                        fontSize: "15px",
                        fontWeight: 600,
                        padding: 0,
                        textDecoration: "underline",
                      }}
                    >
                      {showManualKey
                        ? "Hide manual key"
                        : "Can't scan? Enter key manually"}
                    </button>

                    {showManualKey && (
                      <Box
                        sx={{
                          mt: 1,
                          p: "10px 14px",
                          bgcolor: "#f5f5f5",
                          borderRadius: "8px",
                          border: "1px solid #ddd",
                          fontFamily: "monospace",
                          fontSize: isMobile ? "15px" : "15.5px",
                          letterSpacing: "0.08em",
                          color: "#222",
                          wordBreak: "break-all",
                          userSelect: "all",
                        }}
                      >
                        {manualKey}
                      </Box>
                    )}
                    {showManualKey && (
                      <>
                        <Typography
                          fontSize={14.5}
                          color="#888"
                          sx={{ mt: 0.5 }}
                        >
                          In Google Authenticator: tap + → Enter a setup key →
                          paste this key, select "Time based".
                        </Typography>
                      </>
                    )}
                  </Box>
                )}

                {/* Warning about 10-min expiry */}
                <Box
                  sx={{
                    display: "flex",
                    gap: 1,
                    alignItems: "flex-start",
                    bgcolor: "#fffbf2",
                    border: "1px solid #f5a623",
                    borderRadius: "8px",
                    p: 1.5,
                  }}
                >
                  <span style={{ fontSize: 16, flexShrink: 0 }}>⏱️</span>
                  <Box>
                    <Typography fontSize={15} color="#5d4037" lineHeight={1.5}>
                      This QR code expires in <strong>10 minutes</strong>. If it
                      expires, close this dialog and click "Submit Application"
                      again.
                    </Typography>
                  </Box>
                </Box>
              </Box>

              {/* RIGHT: QR code */}
              <Box
                sx={{
                  flex: 1,
                  width: "100%",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  ...(isMobile
                    ? {}
                    : {
                        position: "sticky",
                        top: 0,
                        borderLeft: "1px solid #eee",
                        pl: 3.5,
                      }),
                }}
              >
                {error ? (
                  <Box
                    sx={{
                      border: "1px solid #f44336",
                      borderRadius: "12px",
                      p: 2,
                      textAlign: "center",
                      width: "100%",
                    }}
                  >
                    <Typography color="error" fontSize={15}>
                      {error}
                    </Typography>
                  </Box>
                ) : (
                  <Box sx={{ textAlign: "center" }}>
                    {qrDataUrl ? (
                      <img
                        src={qrDataUrl}
                        alt="Google Authenticator QR Code"
                        style={{
                          width: (isMobile ? 190 : 220) * qrScale,
                          height: (isMobile ? 190 : 220) * qrScale,
                          border: "3px solid #000",
                          borderRadius: "12px",
                          display: "inline-block",
                          transition: "width 0.2s ease, height 0.2s ease",
                        }}
                      />
                    ) : (
                      <Box
                        sx={{
                          width: 220,
                          height: 220,
                          bgcolor: "#f5f5f5",
                          borderRadius: "12px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          mx: "auto",
                        }}
                      >
                        <CircularProgress
                          size={32}
                          sx={{ color: mainButtonColor }}
                        />
                      </Box>
                    )}
                  </Box>
                )}

                {/* Zoom controls for the QR code */}
                {!error && qrDataUrl && (
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "center",
                      gap: 1,
                      mt: 1.5,
                    }}
                  >
                    <button
                      onClick={() => setQrScale((s) => Math.min(s + 0.25, 1.6))}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                        background: "#f0f0f0",
                        border: "1px solid #ddd",
                        borderRadius: "20px",
                        padding: "5px 12px",
                        fontSize: "15px",
                        fontWeight: 600,
                        color: "#333",
                        cursor: "pointer",
                      }}
                    >
                      <ZoomInIcon sx={{ fontSize: 16 }} /> Zoom in
                    </button>
                    <button
                      onClick={() => setQrScale((s) => Math.max(s - 0.25, 1))}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                        background: "#f0f0f0",
                        border: "1px solid #ddd",
                        borderRadius: "20px",
                        padding: "5px 12px",
                        fontSize: "15px",
                        fontWeight: 600,
                        color: "#333",
                        cursor: "pointer",
                      }}
                    >
                      <ZoomOutIcon sx={{ fontSize: 16 }} /> Zoom out
                    </button>
                  </Box>
                )}

                <Button
                  fullWidth
                  variant="contained"
                  onClick={() => {
                    setStep("verify");
                    setError("");
                    setTotpCode(["", "", "", "", "", ""]);
                    setTimeout(() => inputRefs.current[0]?.focus(), 150);
                  }}
                  disabled={!!error || !qrDataUrl}
                  sx={{
                    mt: 2.5,
                    backgroundColor: mainButtonColor,
                    color: "#fff",
                    fontWeight: 700,
                    fontSize: "17px",
                    borderRadius: "12px",
                    py: 1.25,
                    textTransform: "none",
                    "&:hover": {
                      backgroundColor: mainButtonColor,
                      opacity: 0.92,
                    },
                  }}
                >
                  I've scanned it — Enter the code →
                </Button>
              </Box>
            </Box>
          )}

          {/* ── Verify code step ── */}
          {(step === "verify" || step === "submitting") && (
            <>
              <Box
                sx={{
                  bgcolor: "#f8f9ff",
                  borderRadius: "12px",
                  p: 2,
                  mb: 2.5,
                  border: "1px solid #e8eaff",
                }}
              >
                <Typography fontSize={15} color="#444" lineHeight={1.7}>
                  Open <strong>Google Authenticator</strong> on your phone and
                  enter the <strong>6-digit code</strong> shown for this
                  account.
                </Typography>

                <Typography fontSize={15} color="#888" sx={{ mt: 0.8 }}>
                  The code refreshes every 30 seconds — use the current one.
                </Typography>
              </Box>

              {/* 6-digit input boxes */}
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "center",
                  gap: isMobile ? 1 : 1.5,
                  mb: 2.5,
                }}
              >
                {totpCode.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => (inputRefs.current[index] = el)}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleDigitChange(e.target.value, index)}
                    onKeyDown={(e) => handleDigitKeyDown(e, index)}
                    disabled={step === "submitting"}
                    style={{
                      width: isMobile ? "42px" : "54px",
                      height: isMobile ? "52px" : "62px",
                      fontSize: "24px",
                      fontWeight: 700,
                      textAlign: "center",
                      borderRadius: "12px",
                      border: error ? "2px solid #f44336" : "2px solid #ddd",
                      outline: "none",
                      background: step === "submitting" ? "#f5f5f5" : "#fff",
                      transition: "border 0.2s",
                    }}
                  />
                ))}
              </Box>

              {error && (
                <Box
                  sx={{
                    bgcolor: "#fff5f5",
                    border: "1px solid #f44336",
                    borderRadius: "8px",
                    p: 1.5,
                    mb: 2,
                  }}
                >
                  <Typography fontSize={15} color="#c62828">
                    {error}
                  </Typography>
                </Box>
              )}

              <Button
                fullWidth
                variant="contained"
                onClick={handleVerifyAndRegister}
                disabled={step === "submitting"}
                sx={{
                  backgroundColor: mainButtonColor,
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: "17px",
                  borderRadius: "12px",
                  py: 1.5,
                  textTransform: "none",
                  mb: 0.5,
                  "&:hover": {
                    backgroundColor: mainButtonColor,
                    opacity: 0.92,
                  },
                }}
              >
                {step === "submitting" ? (
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                    <CircularProgress size={18} sx={{ color: "#fff" }} />
                    Registering…
                  </Box>
                ) : (
                  "Verify & Complete Registration"
                )}
              </Button>

              {/* Back to QR scan */}
              <Button
                fullWidth
                color="error"
                variant="outlined"
                onClick={() => {
                  setStep("scan");
                  setError("");
                }}
                disabled={step === "submitting"}
                sx={{
                  fontWeight: 600,
                  fontSize: "15px",
                  borderRadius: "12px",
                  py: 1.25,
                  textTransform: "none",
                  color: "#555",
                  mt: 2,
                }}
              >
                ← Back to QR code
              </Button>
            </>
          )}
        </Box>
      </Box>
    </Modal>
  );
};

/* ═══════════════════════════════════════════════════════════
   REVIEW / CONFIRM MODAL
   Shown when the applicant clicks "SUBMIT APPLICATION", before
   any request is sent to the server. Lets the applicant verify
   every field they filled in / selected, catch typos, and go
   back to edit if something is wrong, instead of only finding
   out about a mistake after the TOTP step.
════════════════════════════════════════════════════════════ */
const ReviewApplicationModal = ({
  open,
  onClose,
  onConfirm,
  isSubmitting,
  isMobile,
  mainButtonColor,
  data,
}) => {
  if (!open) return null;

  const Field = ({ label, value, size = 12 }) => (
    <Box>
      <Typography sx={{ fontSize: 9, color: "#666" }}>{label}</Typography>
      <Typography sx={{ fontSize: size, fontWeight: 700, color: "#1a1a1a" }}>
        {value?.toString().trim() ? value : "—"}
      </Typography>
    </Box>
  );

  return (
    <Dialog
      open={open}
      onClose={isSubmitting ? undefined : onClose}
      maxWidth="sm"
      fullWidth
      fullScreen={isMobile}
      PaperProps={{
        sx: {
          borderRadius: isMobile ? 0 : "16px",
          overflow: "hidden",
          boxShadow: "0 24px 60px rgba(0,0,0,0.25)",
        },
      }}
    >
      <DialogTitle
        sx={{
          bgcolor: mainButtonColor,
          color: "white",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontWeight: "bold",
          px: 2,
          py: 0.75,
        }}
      >
        <Box display="flex" alignItems="center" gap={1.5}>
          <Box
            sx={{
              backgroundColor: "rgba(255,255,255,0.2)",
              borderRadius: "50%",
              width: 36,
              height: 36,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Typography fontSize={20}>📝</Typography>
          </Box>
          <Box>
            <Typography
              fontWeight="bold"
              fontSize={14}
              color="white"
              lineHeight={1.2}
            >
              Review Your Information
            </Typography>
            <Typography
              fontSize={11}
              color="rgba(255,255,255,0.85)"
              lineHeight={1.2}
            >
              Please double-check everything before submitting
            </Typography>
          </Box>
        </Box>
        <IconButton
          onClick={onClose}
          disabled={isSubmitting}
          sx={{ color: "white", p: 0.5 }}
          aria-label="Close review information"
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ px: { xs: 1.5, sm: 2 }, pt: 0.75, pb: 0.5, backgroundColor: "#fff" }}>
        <br />
        {/* Icon, same visual language as the success modal */}
        <Box sx={{ display: "none", justifyContent: "center", mb: 2, mt: 4 }}>
          <Box
            sx={{
              width: 64,
              height: 64,
              borderRadius: "50%",
              backgroundColor: "rgba(255,255,255,0.9)",
              border: `3px solid ${mainButtonColor}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 28,
            }}
          >
            🔎
          </Box>
        </Box>

        <Box
          sx={{
            display: "flex",
            gap: 1,
            alignItems: "flex-start",
            bgcolor: "#fff8e6",
            border: "1px solid #f5c36a",
            borderRadius: "8px",
            p: 1,
            mb: 1,
          }}
        >
          <span style={{ fontSize: 16, flexShrink: 0 }}>⚠️</span>
          <Typography fontSize={9.5} color="#6d4c1d" lineHeight={1.4}>
            After you confirm, you'll be asked to set up Google Authenticator to
            secure your account. Some fields below cannot be changed later,
            please check them carefully.
          </Typography>
        </Box>

        {/* Single summary card, matching the reference layout */}
        {/* Single summary card, now organized into three clear sections */}
        <Box
          sx={{
            border: "none",
            borderRadius: "0",
            overflow: "hidden",
            mb: 1,
          }}
        >
          <Box sx={{ display: "none", backgroundColor: mainButtonColor, px: 2, py: 1 }}>
            <Typography sx={{ color: "#fff", fontWeight: 700, fontSize: 13 }}>
              Application Summary
            </Typography>
          </Box>

          <Box sx={{ p: 0, backgroundColor: "#fff" }}>
            {/* ══════════════ PERSONAL INFORMATION ══════════════ */}
            <SectionHeader
              icon="🧑"
              label="Personal Information"
              color={mainButtonColor}
            />

            <Box sx={{ mb: 1 }}>
              <Field label="Campus" value={data.campusLabel} size={12.5} />
            </Box>

            <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", mb: 1 }}>
              <Box sx={{ flex: "1 1 30%", minWidth: 100 }}>
                <Field label="First Name" value={data.firstName} />
              </Box>
              <Box sx={{ flex: "1 1 30%", minWidth: 100 }}>
                <Field label="Middle Name" value={data.middleName} />
              </Box>
              <Box sx={{ flex: "1 1 30%", minWidth: 100 }}>
                <Field label="Last Name" value={data.lastName} />
              </Box>
            </Box>

            <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
              <Box sx={{ flex: "1 1 45%", minWidth: 130 }}>
                <Field label="Birth Date" value={data.birthday} size={11.5} />
              </Box>
              <Box sx={{ flex: "1 1 45%", minWidth: 100 }}>
                <Field label="Age" value={data.age} size={11.5} />
              </Box>
            </Box>

            {/* Birth Date / Age callout now lives right where the fields are */}
            <Box
              sx={{
                display: "flex",
                gap: 1,
                alignItems: "flex-start",
                backgroundColor: "#fff0f3",
                border: "1px solid #f1ccd5",
                borderRadius: "8px",
                p: 0.9,
                mt: 0.75,
              }}
            >
              <span style={{ fontSize: 13, flexShrink: 0 }}>🎂</span>
              <Typography
                sx={{ fontSize: 9.5, color: "#5d4500", lineHeight: 1.4 }}
              >
                Double-check your <strong>Birth Date</strong> and{" "}
                <strong>Age</strong>, It used for eligibility checks and cannot be
                edited after submission.
              </Typography>
            </Box>

            <Box sx={{ borderTop: "1px solid #e8eaff", my: 1 }} />

            {/* ══════════════ ACADEMIC INFORMATION ══════════════ */}
            <SectionHeader
              icon="🎓"
              label="Academic Information"
              color={mainButtonColor}
            />

            <Box
              sx={{
                display: "flex",
                gap: 2,
                flexWrap: "wrap",
                mb: 1,
              }}
            >
              <Box sx={{ flex: "1 1 45%", minWidth: 150 }}>
                <Field
                  label="Program Level"
                  value={data.academicProgramLabel}
                  size={11.5}
                />
              </Box>
              <Box sx={{ flex: "1 1 45%", minWidth: 150 }}>
                <Field
                  label="Applying As"
                  value={data.applyingAsLabel}
                  size={11.5}
                />
              </Box>
            </Box>

            <Box
              sx={{
                backgroundColor: "#fff0f3",
                border: "1.5px dashed #f1ccd5",
                borderRadius: "8px",
                p: 1,
              }}
            >
              <Typography
                sx={{
                  fontSize: 9,
                  color: "#7a5c00",
                  fontWeight: 700,
                  letterSpacing: "0.04em",
                }}
              >
                COURSE APPLIED FOR
              </Typography>
              <Typography
                sx={{
                  fontSize: 11.5,
                  fontWeight: 700,
                  color: "#5d4500",
                  mt: 0.25,
                }}
              >
                {data.curriculumLabel || "—"}
              </Typography>
            </Box>

            <Box sx={{ borderTop: "1px solid #e8eaff", my: 1 }} />

            {/* ══════════════ ACCOUNT INFORMATION ══════════════ */}
            <SectionHeader
              icon="🔐"
              label="Account Information"
              color={mainButtonColor}
            />

            <Box sx={{ mb: 1 }}>
              <Field label="Email Address" value={data.email} size={11.5} />
            </Box>

            <Box
              sx={{
                display: "flex",
                gap: 1,
                alignItems: "flex-start",
                backgroundColor: "#f0f7ff",
                border: "1px solid #b3d4ff",
                borderRadius: "8px",
                p: 1,
              }}
            >
              <span style={{ fontSize: 14, flexShrink: 0 }}>ℹ️</span>
              <Typography
                sx={{ fontSize: 10, color: "#1a237e", lineHeight: 1.4 }}
              >
                Your <strong>Applicant Number</strong> will be generated after
                you complete the next step (Google Authenticator setup). You'll
                be able to use either your Applicant Number or your email to log
                in later.
              </Typography>
            </Box>

            <Typography
              sx={{
                fontSize: 9.5,
                color: "#888",
                mt: 1,
                fontStyle: "italic",
                lineHeight: 1.5,
              }}
            >
              Please verify that everything above is correct before continuing.
            </Typography>
          </Box>
        </Box>

        {/* ✅ NEW — Birth Date / Age verification note */}
        <Box
          sx={{
            display: "flex",
            gap: 1,
            alignItems: "flex-start",
            backgroundColor: "#fff3cd",
            border: "1px solid #d4a017",
            borderRadius: "8px",
            p: 1.25,
            mt: 1.5,
            display: "none",
          }}
        >
          <span style={{ fontSize: 14, flexShrink: 0 }}>🎂</span>
          <Typography sx={{ fontSize: 12, color: "#5d4500", lineHeight: 1.5 }}>
            Please double-check your <strong>Birth Date</strong> and computed{" "}
            <strong>Age</strong> above — this is used for eligibility checks and
            cannot be edited after your application is submitted.
          </Typography>
        </Box>
      </DialogContent>

      <DialogActions
        sx={{
          px: { xs: 1.5, sm: 2 },
          pb: 1.25,
          pt: 0.75,
          gap: 1,
          display: "flex",
          flexDirection: isMobile ? "column-reverse" : "row",
        }}
      >
        <Button
          fullWidth
          color="error"
          variant="outlined"
          disabled={isSubmitting}
          onClick={onClose}
          sx={{
            height: 40,
            borderRadius: "10px",
            fontWeight: 600,
            fontSize: 13,
            textTransform: "none",
          }}
        >
          Edit My Information
        </Button>
        <Button
          fullWidth
          variant="contained"
          disabled={isSubmitting}
          onClick={onConfirm}
          sx={{
            height: 40,
            borderRadius: "10px",
            backgroundColor: mainButtonColor,
            color: "#fff",
            fontWeight: 700,
            fontSize: 13,
            textTransform: "none",
            boxShadow: "none",
            "&:hover": {
              backgroundColor: mainButtonColor,
              opacity: 0.9,
              boxShadow: "none",
            },
          }}
        >
          {isSubmitting ? (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
              <CircularProgress size={18} sx={{ color: "#fff" }} />
              Checking Your Details…
            </Box>
          ) : (
            "Submit"
          )}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
/* ═══════════════════════════════════════════════════════════
   REGISTRATION SUCCESS MODAL
   Shown after the TOTP step completes and /api/register returns
   successfully. Displays the applicant number the same way the
   Applicant Dashboard does, so applicants are told to remember
   it before being redirected to the login page.
════════════════════════════════════════════════════════════ */
const RegistrationSuccessModal = ({
  open,
  applicantNumber,
  email,
  firstName,
  middleName,
  lastName,
  birthday,
  age,
  companyName,
  mainButtonColor,
  isMobile,
  onContinue,
}) => {
  if (!open) return null;

  return (
    <Dialog
      open={open}
      maxWidth="sm"
      fullWidth
      fullScreen={isMobile}
      PaperProps={{
        sx: {
          borderRadius: isMobile ? 0 : "16px",
          overflow: "hidden",
          boxShadow: "0 24px 60px rgba(0,0,0,0.25)",
        },
      }}
    >
      <DialogTitle
        sx={{
          bgcolor: mainButtonColor,
          color: "white",
          display: "flex",
          alignItems: "center",
          fontWeight: "bold",
          px: 3,
          py: 2,
        }}
      >
        <Box display="flex" alignItems="center" gap={1.5}>
          <Box
            sx={{
              backgroundColor: "rgba(255,255,255,0.2)",
              borderRadius: "50%",
              width: 40,
              height: 40,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Typography fontSize={20}>🎉</Typography>
          </Box>
          <Box>
            <Typography
              fontWeight="bold"
              fontSize={16}
              color="white"
              lineHeight={1.2}
            >
              Account Created Successfully!
            </Typography>
            <Typography
              fontSize={12}
              color="rgba(255,255,255,0.8)"
              lineHeight={1.2}
            >
              Your applicant account is ready
            </Typography>
          </Box>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ px: { xs: 2, sm: 3 }, pt: 2.5, pb: 1 }}>
        <Box sx={{ display: "flex", justifyContent: "center", mb: 2.5, mt: 3 }}>
          <Box
            sx={{
              width: 76,
              height: 76,
              borderRadius: "50%",
              backgroundColor: "rgba(255,255,255,0.9)",
              border: `3px solid ${mainButtonColor}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 34,
            }}
          >
            🎓
          </Box>
        </Box>

        <Box sx={{ textAlign: "center", mb: 2 }}>
          <Typography
            sx={{ fontSize: 17, fontWeight: 700, color: "#1a1a1a", mb: 1 }}
          >
            Congratulations, Applicant!
          </Typography>
          <Typography
            sx={{ fontSize: "13.5px", color: "#333", lineHeight: 1.65 }}
          >
            Your applicant account with{" "}
            <strong style={{ color: mainButtonColor }}>{companyName}</strong>{" "}
            has been created successfully. You can now log in using your{" "}
            <strong>applicant number</strong> or <strong>email address</strong>,
            along with your password.
          </Typography>
        </Box>

        {/* Applicant summary card */}
        <Box
          sx={{
            border: `1.5px solid ${mainButtonColor}`,
            borderRadius: "12px",
            overflow: "hidden",
            mb: 1,
          }}
        >
          <Box sx={{ backgroundColor: mainButtonColor, px: 2, py: 1 }}>
            <Typography sx={{ color: "#fff", fontWeight: 700, fontSize: 13 }}>
              Your Applicant Details
            </Typography>
          </Box>

          <Box sx={{ p: 2, backgroundColor: "#fafcff" }}>
            <Typography sx={{ fontSize: 12.5, color: "#000", mb: 0.25 }}>
              Applicant Name
            </Typography>
            <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", mb: 1.5 }}>
              <Box sx={{ flex: "1 1 30%", minWidth: 100 }}>
                <Typography sx={{ fontSize: 11, color: "#666" }}>
                  First Name
                </Typography>
                <Typography
                  sx={{ fontSize: 14, fontWeight: 700, color: "#1a1a1a" }}
                >
                  {firstName || "—"}
                </Typography>
              </Box>
              <Box sx={{ flex: "1 1 30%", minWidth: 100 }}>
                <Typography sx={{ fontSize: 11, color: "#666" }}>
                  Middle Name
                </Typography>
                <Typography
                  sx={{ fontSize: 14, fontWeight: 700, color: "#1a1a1a" }}
                >
                  {middleName || "—"}
                </Typography>
              </Box>
              <Box sx={{ flex: "1 1 30%", minWidth: 100 }}>
                <Typography sx={{ fontSize: 11, color: "#666" }}>
                  Last Name
                </Typography>
                <Typography
                  sx={{ fontSize: 14, fontWeight: 700, color: "#1a1a1a" }}
                >
                  {lastName || "—"}
                </Typography>
              </Box>
            </Box>

            {/* Applicant number callout — the one just generated for this user */}
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                backgroundColor: "#fff3cd",
                border: "1.5px dashed #d4a017",
                borderRadius: "8px",
                p: 1.25,
                mb: 1.5,
              }}
            >
              <Box sx={{ flex: 1 }}>
                <Typography
                  sx={{
                    fontSize: 11.5,
                    color: "#7a5c00",
                    fontWeight: 700,
                    letterSpacing: "0.04em",
                    textAlign: "center",
                  }}
                >
                  ⚠️ PLEASE REMEMBER YOUR APPLICANT NUMBER
                </Typography>
                <Typography
                  sx={{
                    fontSize: 20,
                    fontWeight: 800,
                    color: "#5d4500",
                    textAlign: "center",
                    letterSpacing: "0.03em",
                    mt: 0.25,
                  }}
                >
                  {applicantNumber || "—"}
                </Typography>
                <Typography
                  sx={{
                    fontSize: 10.5,
                    color: "#7a5c00",
                    textAlign: "center",
                    mt: 0.5,
                  }}
                >
                  You can use this to log in instead of your email
                </Typography>
              </Box>
            </Box>

            <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
              <Box sx={{ flex: "1 1 45%", minWidth: 130 }}>
                <Typography sx={{ fontSize: 11.5, color: "#000" }}>
                  Birth Date
                </Typography>
                <Typography
                  sx={{ fontSize: 13.5, fontWeight: 600, color: "#222" }}
                >
                  {birthday || "—"}
                </Typography>
              </Box>
              <Box sx={{ flex: "1 1 45%", minWidth: 100 }}>
                <Typography sx={{ fontSize: 11.5, color: "#000" }}>
                  Age
                </Typography>
                <Typography
                  sx={{ fontSize: 13.5, fontWeight: 600, color: "#222" }}
                >
                  {age || "—"}
                </Typography>
              </Box>
              <Box sx={{ flex: "1 1 100%" }}>
                <Typography sx={{ fontSize: 11.5, color: "#000" }}>
                  Email Address
                </Typography>
                <Typography
                  sx={{
                    fontSize: 13.5,
                    fontWeight: 600,
                    color: "#222",
                    wordBreak: "break-all",
                  }}
                >
                  {email || "—"}
                </Typography>
              </Box>
            </Box>

            <Typography
              sx={{
                fontSize: 11.5,
                color: "#888",
                mt: 1.5,
                fontStyle: "italic",
                lineHeight: 1.5,
              }}
            >
              Please verify that your details above are correct. Your applicant
              number and email can both be used to log in and identify you for
              important updates.
            </Typography>
          </Box>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: { xs: 2, sm: 3 }, pb: 2.5, pt: 1.5 }}>
        <Button
          fullWidth
          variant="contained"
          onClick={onContinue}
          sx={{
            height: 44,
            borderRadius: "10px",
            backgroundColor: mainButtonColor,
            color: "#fff",
            fontWeight: 700,
            fontSize: 14,
            textTransform: "none",
            boxShadow: "none",
            "&:hover": {
              backgroundColor: mainButtonColor,
              opacity: 0.9,
              boxShadow: "none",
            },
          }}
        >
          Continue to Login
        </Button>
      </DialogActions>
    </Dialog>
  );
};

/* ═══════════════════════════════════════
   REGISTER PAGE
════════════════════════════════════════ */
const Register = () => {
  const settings = useContext(SettingsContext);
  const colors = settings?.colors || {};
  const branding = settings?.branding || {};
  const assets = settings?.assets || {};
  const mainButtonColor = colors.mainButton || "#1976d2";
  const headerColor = colors.header || "#1976d2";
  const borderColor = colors.border || "#e6e6e6";
  const companyName = branding.companyName || "Company Name";
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();
  // isCompact = "not enough width for the two-column desktop layout" —
  // covers both phones and tablets so neither breaks the container.
  const isCompact = isMobile || isTablet;

  const [openReminder, setOpenReminder] = useState(true);
  const [registerStep, setRegisterStep] = useState(1);

  const getBranchLabel = (branchId) => {
    const branch = branches.find(
      (item) => String(item.id) === String(branchId),
    );
    return branch?.branch || "—";
  };

  const [person, setPerson] = useState({
    applicant_number: "",
    profile_img: "",
    campus: "",
    academicProgram: "",
    classifiedAs: "",
    program: "",
    program2: "",
    program3: "",
    yearLevel: "",
    last_name: "",
    first_name: "",
    middle_name: "",
    extension: "",
    nickname: "",
    height: "",
    weight: "",
    lrnNumber: "",
    gender: "",
    pwdType: "",
    pwdId: "",
    birthOfDate: "",
    age: "",
    birthPlace: "",
    languageDialectSpoken: "",
    citizenship: "",
    religion: "",
    civilStatus: "",
    tribeEthnicGroup: "",
    otherEthnicGroup: "",
    cellphoneNumber: "",
    emailAddress: "",
    telephoneNumber: "",
    facebook_account: "",
    spouse: "",
    presentStreet: "",
    presentBarangay: "",
    presentZipCode: "",
    presentRegion: "",
    presentProvince: "",
    presentMunicipality: "",
    presentDswdHouseholdNumber: "",
    permanentStreet: "",
    permanentBarangay: "",
    permanentZipCode: "",
    permanentRegion: "",
    permanentProvince: "",
    permanentMunicipality: "",
    permanentDswdHouseholdNumber: "",
    father_deceased: "",
    father_family_name: "",
    father_given_name: "",
    father_middle_name: "",
    father_ext: "",
    father_contact: "",
    father_occupation: "",
    father_income: "",
    father_email: "",
    mother_deceased: "",
    mother_family_name: "",
    mother_given_name: "",
    mother_middle_name: "",
    mother_contact: "",
    mother_occupation: "",
    mother_income: "",
    guardian: "",
    guardian_family_name: "",
    guardian_given_name: "",
    guardian_middle_name: "",
    guardian_ext: "",
    guardian_nickname: "",
    guardian_address: "",
    guardian_contact: "",
    guardian_email: "",
    schoolLevel: "",
    schoolLastAttended: "",
    schoolAddress: "",
    courseProgram: "",
    honor: "",
    generalAverage: "",
    yearGraduated: "",
    schoolLevel1: "",
    schoolLastAttended1: "",
    schoolAddress1: "",
    courseProgram1: "",
    honor1: "",
    generalAverage1: "",
    yearGraduated1: "",
    strand: "",
  });

  const [usersData, setUserData] = useState({ email: "", password: "" });
  const [emailDomainStatus, setEmailDomainStatus] = useState(null); // null | "checking" | "valid" | "invalid"
  const [emailDomainSuggestion, setEmailDomainSuggestion] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [snack, setSnack] = useState({
    open: false,
    message: "",
    severity: "info",
  });
  const navigate = useNavigate();

  const passwordRuleResults = getPasswordRuleResults(usersData.password);
  const allPasswordRulesPassed = passwordRuleResults.every((r) => r.passed);
  const passwordTouched = passwordFocused || usersData.password.length > 0;

  const handleChanges = (e) => {
    const { name, value } = e.target;
    setUserData((prev) => ({ ...prev, [name]: value }));
  };

  const handleEmailBlur = async () => {
    const email = usersData.email.trim();
    const at = email.lastIndexOf("@");
    if (at === -1 || at === email.length - 1) {
      setEmailDomainStatus(null);
      setEmailDomainSuggestion(null);
      return;
    }
    const domain = email.slice(at + 1).toLowerCase();
    if (!domain) {
      setEmailDomainStatus(null);
      setEmailDomainSuggestion(null);
      return;
    }

    setEmailDomainStatus("checking");
    try {
      const res = await axios.get(`${API_BASE_URL}/api/check-domain-mx`, { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` },
        params: { domain },
      });
      setEmailDomainStatus(res.data.valid ? "valid" : "invalid");
      setEmailDomainSuggestion(res.data.suggestion || null);

      if (res.data.suggestion) {
        setSnack({
          open: true,
          message: `This looks like a typo. Did you mean "${res.data.suggestion}"? Please correct it before submitting.`,
          severity: "warning",
        });
      }
    } catch {
      setEmailDomainStatus(null);
      setEmailDomainSuggestion(null);
    }
  };

  const [agreeChecked, setAgreeChecked] = useState(false);
  const [reminderChecked, setReminderChecked] = useState(false);
  const [currentYear, setCurrentYear] = useState("");

  useEffect(() => {
    const now = new Date().toLocaleString("en-US", { timeZone: "Asia/Manila" });
    setCurrentYear(new Date(now).getFullYear());
  }, []);

  const handleClose = (_, reason) => {
    if (reason === "clickaway") return;
    setSnack((prev) => ({ ...prev, open: false }));
  };

  const [lastName, setLastName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [birthday, setBirthday] = useState("");
  const [age, setAge] = useState("");

  useEffect(() => {
    setAge(birthday ? calculateAge(birthday) : "");
  }, [birthday]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [academicProgram, setAcademicProgram] = useState("");
  const [applyingAs, setApplyingAs] = useState("");
  const [selectedCurriculum, setSelectedCurriculum] = useState("");
  const [curriculumOptions, setCurriculumOptions] = useState([]);
  const [branches, setBranches] = useState([]);
  const [branchId, setBranchId] = useState("");

  // ── NEW: TOTP modal state ──────────────────────────────────────────────────
  const [showTotpModal, setShowTotpModal] = useState(false);
  const [tempEmail, setTempEmail] = useState("");
  // Snapshot of the full payload to pass into TotpSetupModal
  const [registrationPayload, setRegistrationPayload] = useState(null);
  // ──────────────────────────────────────────────────────────────────────────

  // ── NEW: Review-before-submit modal state ──────────────────────────────────
  const [showReviewModal, setShowReviewModal] = useState(false);
  // ──────────────────────────────────────────────────────────────────────────

  // ── NEW: Post-registration success modal (shows the applicant number) ──────
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [applicantNumber, setApplicantNumber] = useState("");
  // ──────────────────────────────────────────────────────────────────────────

  const [redirectLoading, setRedirectLoading] = useState(false);

  // Compact (mobile + tablet) announcement slides
  const [mobileSlides, setMobileSlides] = useState([]);
  useEffect(() => {
    if (!isCompact) return;
    axios
      .get(`${API_BASE_URL}/api/announcements`, { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` } })
      .then((res) => {
        if (Array.isArray(res.data.data)) setMobileSlides(res.data.data);
      })
      .catch(() => {});
  }, [isCompact]);

  useEffect(() => {
    fetchAndStoreUserMacAddress().catch((err) => {
      console.error("Unable to preload MAC address for audit logs:", err);
    });
  }, []);

  // ── UPDATED: branches now poll every 60s so per-program registration
  //     hours (e.g. Undergraduate 6pm-6am, Graduate 6am-6pm, TechVoc's own
  //     custom hours) flip open/closed live without needing a page reload. ──
  useEffect(() => {
    const fetchBranchesList = () => {
      axios
        .get(`${API_BASE_URL}/api/branches`, { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` } })
        .then((res) => setBranches(res.data))
        .catch((err) => console.error(err));
    };
    fetchBranchesList();
    const interval = setInterval(fetchBranchesList, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    axios
      .get(`${API_BASE_URL}/api/applied_program`, { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` } })
      .then((res) => setCurriculumOptions(res.data))
      .catch((err) => console.error("Error fetching curriculum options:", err));
  }, []);

  const [errors, setErrors] = useState({});

  const [programAvailability, setProgramAvailability] = useState([]);
  const [activeSchoolYearId, setActiveSchoolYearId] = useState(null);
  const [activeYearId, setActiveYearId] = useState(null);
  const [activeSemesterId, setActiveSemesterId] = useState(null);

  useEffect(() => {
    const fetchActiveYearAndAvailability = async () => {
      const yearRes = await axios.get(`${API_BASE_URL}/api/active_school_year`, { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` } });
      const activeYear = yearRes.data[0];
      if (activeYear) {
        setActiveSchoolYearId(activeYear.school_year_id);
        setActiveYearId(activeYear.year_id);
        setActiveSemesterId(activeYear.semester_id);
        const availRes = await axios.get(
          `${API_BASE_URL}/api/programs/availability`,
          { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` },
            params: {
              year_id: activeYear.year_id,
              semester_id: activeYear.semester_id,
            },
          },
        );
        setProgramAvailability(availRes.data);
      }
    };
    fetchActiveYearAndAvailability();
  }, []);

  const availabilityMap = React.useMemo(() => {
    const map = {};
    programAvailability.forEach((p) => {
      map[p.curriculum_id] = {
        remaining: Number(p.remaining),
        isFull: Number(p.remaining) <= 0,
      };
    });
    return map;
  }, [programAvailability]);

  useEffect(() => {
    if (!selectedCurriculum) return;
    const availability = availabilityMap[selectedCurriculum];
    if (availability?.isFull) {
      setSelectedCurriculum("");
      setSnack({
        open: true,
        message: "Selected course is now FULL. Please choose another.",
        severity: "warning",
      });
    }
  }, [availabilityMap]);

  const isFormValid = () => {
    let newErrors = {};
    let isValid = true;
    if (!branchId) {
      newErrors.campus = true;
      isValid = false;
    }
    if (!lastName) {
      newErrors.lastName = true;
      isValid = false;
    }
    if (!firstName) {
      newErrors.firstName = true;
      isValid = false;
    }
    if (!birthday) {
      newErrors.birthday = true;
      isValid = false;
    }
    if (!academicProgram) {
      newErrors.academicProgram = true;
      isValid = false;
    }
    if (!applyingAs) {
      newErrors.applyingAs = true;
      isValid = false;
    }
    if (!selectedCurriculum) {
      newErrors.selectedCurriculum = true;
      isValid = false;
    }
    if (!usersData.email) {
      newErrors.email = true;
      isValid = false;
    }
    if (!usersData.password) {
      newErrors.password = true;
      isValid = false;
    } else if (!allPasswordRulesPassed) {
      newErrors.password = true;
      newErrors.passwordRules = true;
      isValid = false;
    }
    if (!confirmPassword) {
      newErrors.confirmPassword = true;
      isValid = false;
    }
    setErrors(newErrors);
    return isValid;
  };

  // Icons sit inside the input row. A fixed offset keeps them centered even
  // when validation text is rendered below the field.
  const getIconTop = () => "25px";

  const validateStep1 = () => {
    const newErrors = {
      campus: !branchId,
      lastName: !lastName,
      firstName: !firstName,
      birthday: !birthday,
    };
    setErrors((prev) => ({ ...prev, ...newErrors }));
    return !newErrors.campus && !newErrors.lastName && !newErrors.firstName && !newErrors.birthday;
  };

  const validateStep2 = () => {
    const newErrors = {
      academicProgram: !academicProgram,
      applyingAs: !applyingAs,
      selectedCurriculum: !selectedCurriculum,
      email: !usersData.email,
    };
    setErrors((prev) => ({ ...prev, ...newErrors }));
    return (
      !newErrors.academicProgram &&
      !newErrors.applyingAs &&
      !newErrors.selectedCurriculum &&
      !newErrors.email
    );
  };

  const validatePasswordStep = () => {
    const newErrors = {
      password: !usersData.password,
      passwordRules: !!(usersData.password && !allPasswordRulesPassed),
      confirmPassword: !confirmPassword || usersData.password !== confirmPassword,
    };
    if (usersData.password && !allPasswordRulesPassed) {
      newErrors.password = true;
    }
    setErrors((prev) => ({ ...prev, ...newErrors }));
    return (
      !newErrors.password &&
      !newErrors.passwordRules &&
      !newErrors.confirmPassword
    );
  };

  const goToStep2 = () => {
    if (!branchSelected) {
      setSnack({
        open: true,
        message: "Please select a branch first!",
        severity: "warning",
      });
      return;
    }
    if (!registrationOpen) {
      setSnack({
        open: true,
        message: "Registration is currently closed for this campus.",
        severity: "error",
      });
      return;
    }
    if (!validateStep1()) {
      setSnack({
        open: true,
        message: "Please fill up all required fields!",
        severity: "warning",
      });
      return;
    }
    setRegisterStep(2);
  };

  const goToStep3 = () => {
    const chosenProgram = selectedBranch?.academicPrograms?.find(
      (p) => String(p.id) === String(academicProgram),
    );
    if (chosenProgram && Number(chosenProgram.open) !== 1) {
      const hours = formatProgramHours(chosenProgram);
      setSnack({
        open: true,
        message: `${chosenProgram.name} registration is currently closed.${hours ? ` Hours: ${hours}.` : ""}`,
        severity: "error",
      });
      return;
    }
    if (emailDomainSuggestion || emailDomainStatus === "invalid") {
      setSnack({
        open: true,
        message: "Please correct the email address typo before continuing.",
        severity: "warning",
      });
      return;
    }
    if (!validateStep2()) {
      setSnack({
        open: true,
        message: "Please fill up all required fields!",
        severity: "warning",
      });
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(usersData.email)) {
      setSnack({
        open: true,
        message: "Please enter a valid email address!",
        severity: "error",
      });
      return;
    }
    setRegisterStep(3);
  };

  const goToStep4 = () => {
    if (usersData.password && !allPasswordRulesPassed) {
      setSnack({
        open: true,
        message:
          "Your password doesn't meet all the requirements yet. Please check the checklist below the password field.",
        severity: "warning",
      });
      return;
    }
    if (!validatePasswordStep()) {
      setSnack({
        open: true,
        message: "Please fill up all required fields!",
        severity: "warning",
      });
      return;
    }
    if (usersData.password !== confirmPassword) {
      setSnack({
        open: true,
        message: "Passwords do not match!",
        severity: "error",
      });
      return;
    }
    setRegisterStep(4);
  };

  // ── Human-readable labels for the review modal ─────────────────────────────
  const selectedBranchForReview = branches.find(
    (b) => String(b.id) === String(branchId),
  );
  const selectedProgramForReview =
    selectedBranchForReview?.academicPrograms?.find(
      (prog) => String(prog.id) === String(academicProgram),
    );
  const applyingAsLabelMap = {
    1: "Senior High School Graduate",
    2: "Senior High School Graduating Student",
    3: "ALS Passer",
    4: "Transferee",
    5: "Cross Enrollee",
    6: "Foreign Applicant",
    7: "Baccalaureate Graduate",
    8: "Master Degree Graduate",
  };
  const selectedCurriculumForReview = curriculumOptions.find(
    (c) => String(c.curriculum_id) === String(selectedCurriculum),
  );

  const reviewData = {
    campusLabel: getBranchLabel(branchId),
    lastName,
    firstName,
    middleName,
    birthday,
    age,
    academicProgramLabel: selectedProgramForReview?.name || "",
    applyingAsLabel: applyingAsLabelMap[applyingAs] || "",
    curriculumLabel: selectedCurriculumForReview
      ? `(${selectedCurriculumForReview.program_code}): ${selectedCurriculumForReview.program_description}${selectedCurriculumForReview.major ? ` (${selectedCurriculumForReview.major})` : ""}`
      : "",
    email: usersData.email,
  };

  // ── Runs all pre-submit validation, and if everything passes, opens the
  //    Review modal instead of immediately hitting the server. ──────────────
  const handleOpenReview = () => {
    if (!branchSelected) {
      setSnack({
        open: true,
        message: "Please select a branch first!",
        severity: "warning",
      });
      return;
    }
    if (!registrationOpen) {
      setSnack({
        open: true,
        message: "Registration is currently closed for this campus.",
        severity: "error",
      });
      return;
    }

    // NEW — per-academic-program daily window check (client-side pre-check;
    // /api/register re-validates this server-side no matter what, so this
    // is purely to give the applicant a clear message before they go
    // through the whole TOTP flow only to be rejected at the end).
    const chosenProgram = selectedBranch?.academicPrograms?.find(
      (p) => String(p.id) === String(academicProgram),
    );
    if (chosenProgram && Number(chosenProgram.open) !== 1) {
      const hours = formatProgramHours(chosenProgram);
      setSnack({
        open: true,
        message: `${chosenProgram.name} registration is currently closed.${hours ? ` Hours: ${hours}.` : ""}`,
        severity: "error",
      });
      return;
    }

    if (!reminderChecked) {
      setSnack({
        open: true,
        message: "Please agree to the Terms and Conditions before registering.",
        severity: "warning",
      });
      return;
    }
    if (emailDomainSuggestion || emailDomainStatus === "invalid") {
      setSnack({
        open: true,
        message: "Please correct the email address typo before submitting.",
        severity: "warning",
      });
      return;
    }
    if (usersData.password && !allPasswordRulesPassed) {
      setSnack({
        open: true,
        message:
          "Your password doesn't meet all the requirements yet. Please check the checklist below the password field.",
        severity: "warning",
      });
      return;
    }
    if (!isFormValid()) {
      setSnack({
        open: true,
        message: "Please fill up all required fields!",
        severity: "warning",
      });
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(usersData.email)) {
      setSnack({
        open: true,
        message: "Please enter a valid email address!",
        severity: "error",
      });
      return;
    }
    if (usersData.password !== confirmPassword) {
      setSnack({
        open: true,
        message: "Passwords do not match!",
        severity: "error",
      });
      return;
    }

    // All good — let the applicant review everything before it's sent anywhere.
    setShowReviewModal(true);
  };

  // ── UPDATED: handleRegister now opens TotpSetupModal instead of email OTP ─
  // Called only after the applicant confirms the Review modal.
  const handleRegister = async () => {
    if (isSubmitting) return;

    const normalizedEmail = usersData.email.trim().toLowerCase();
    setIsSubmitting(true);

    try {
      // Step 1: duplicate check (same as before)
      await axios.post(`${API_BASE_URL}/api/check-registration-duplicate`, {
        email: normalizedEmail,
        firstName,
        lastName,
        birthday,
      }, { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` } });

      // Step 2: Build and stash the full registration payload
      // The `otp` field will be filled in by TotpSetupModal when the user
      // enters their Google Authenticator code.
      setTempEmail(normalizedEmail);
      setRegistrationPayload({
        ...usersData,
        email: normalizedEmail,
        campus: branchId,
        lastName,
        firstName,
        middleName,
        birthday,
        age,
        academicProgram,
        applyingAs,
        program: selectedCurriculum,
        active_school_year_id: activeSchoolYearId,
        audit_log_db: "db",
        ...getLoginMacPayload(),
      });

      // Step 3: Close the review modal and open the TOTP modal
      // (it calls /register-totp-setup internally)
      setShowReviewModal(false);
      setShowTotpModal(true);
    } catch (error) {
      setSnack({
        open: true,
        message:
          error.response?.data?.message ||
          "Validation failed. Please try again.",
        severity: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Called by TotpSetupModal on successful /register response.
  // `data` is the response body from POST /api/register — it's expected to
  // include the newly-created applicant_number, same as the applicant
  // dashboard displays after document submission.
  const handleTotpSuccess = (data) => {
    setShowTotpModal(false);
    setApplicantNumber(data?.applicant_number || data?.applicantNumber || "");
    setShowSuccessModal(true);
  };

  const handleContinueToLogin = () => {
    setShowSuccessModal(false);
    setRedirectLoading(true);
    setTimeout(() => navigate("/login_applicant"), 1200);
  };

  const [registrationOpen, setRegistrationOpen] = useState(true);
  const [openClosedDialog, setOpenClosedDialog] = useState(false);
  const [openBranchDialog, setOpenBranchDialog] = useState(false);

  const handleBranchSelect = (e) => {
    const selectedId = e.target.value;
    const campusChanged = String(selectedId) !== String(branchId);

    setBranchId(selectedId);
    setAcademicProgram("");
    setApplyingAs("");
    setSelectedCurriculum("");

    // A campus change invalidates the later campus-specific steps. Always
    // return the applicant to the first step so the name and birth details
    // can be reviewed before continuing with the new campus.
    if (campusChanged) {
      setRegisterStep(1);
      setErrors({});
    }
  };

  useEffect(() => {
    if (!branchId) return;
    const fetchRegistrationStatus = async () => {
      try {
        const res = await axios.get(
          `${API_BASE_URL}/api/registration-status/${branchId}`, { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` } },
        );
        const isOpen = res.data.registration_open === 1;
        setRegistrationOpen(isOpen);
        if (!isOpen) setOpenBranchDialog(true);
      } catch (err) {
        console.error(err);
      }
    };
    fetchRegistrationStatus();
  }, [branchId]);

  const branchSelected = !!branchId;
  const fieldDisabled = !branchSelected || !registrationOpen;
  const selectedBranch = branches.find((b) => b.id.toString() === branchId);

  const primaryActionStyle = {
    opacity:
      reminderChecked &&
      registrationOpen &&
      branchSelected &&
      !emailDomainSuggestion &&
      emailDomainStatus !== "invalid"
        ? 1
        : 0.5,
    cursor:
      !reminderChecked ||
      emailDomainSuggestion ||
      emailDomainStatus === "invalid"
        ? "not-allowed"
        : "pointer",
    marginTop: isMobile ? "20px" : "18px",
    backgroundColor: mainButtonColor,
    height: isMobile ? "48px" : "44px",
    border: "none",
    borderRadius: UNIFORM_RADIUS,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "white",
    fontWeight: 700,
    fontSize: "14px",
    textTransform: "none",
  };

  const nextActionStyle = {
    opacity: registrationOpen && branchSelected ? 1 : 0.5,
    cursor: !registrationOpen || !branchSelected ? "not-allowed" : "pointer",
    marginTop: isMobile ? "32px" : "30px",
    backgroundColor: mainButtonColor,
    height: isMobile ? "48px" : "44px",
    border: "none",
    borderRadius: UNIFORM_RADIUS,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "white",
    fontWeight: 700,
    fontSize: "14px",
    textTransform: "none",
  };

  // ── NEW: hours note for whichever program is currently selected, shown
  //     under the Academic Program / Applying As row for transparency. ──────
  const selectedProgramObj = selectedBranch?.academicPrograms?.find(
    (p) => String(p.id) === String(academicProgram),
  );
  const selectedProgramHours = formatProgramHours(selectedProgramObj);

  const filteredCurriculum = React.useMemo(() => {
    const filtered = curriculumOptions.filter((item) => {
      if (branchId && Number(item.components) !== Number(branchId))
        return false;
      if (
        academicProgram &&
        Number(item.academic_program) !== Number(academicProgram)
      )
        return false;
      return true;
    });

    // Dedupe by the program itself (code + major + branch), not by curriculum_id.
    // curriculum_table has one row per year level for the same program, so the
    // same course was showing up multiple times (once per year level). We only
    // want the entry-level (lowest year_id) curriculum row per program, since
    // applicants are always applying as incoming freshmen.
    const uniqueMap = new Map();
    filtered.forEach((item) => {
      const key = `${item.program_code}__${item.major || ""}__${item.components}`;
      const existing = uniqueMap.get(key);
      if (!existing || Number(item.year_id) < Number(existing.year_id)) {
        uniqueMap.set(key, item);
      }
    });

    return Array.from(uniqueMap.values());
  }, [curriculumOptions, branchId, academicProgram]);

  const handleKeyDownRegister = (e) => {
    if (e.key === "Enter" && !isSubmitting) {
      if (registerStep === 1) {
        goToStep2();
        return;
      }
      if (registerStep === 2) {
        goToStep3();
        return;
      }
      if (registerStep === 3) {
        goToStep4();
        return;
      }
      if (!branchId) {
        setSnack({
          open: true,
          message: "Please select a branch!",
          severity: "warning",
        });
        return;
      }
      if (!registrationOpen) {
        setSnack({
          open: true,
          message: "Registration is closed for this campus.",
          severity: "error",
        });
        return;
      }
      handleOpenReview();
    }
  };

  const backgroundBase = assets.backgroundImage || "url(/default-bg.jpg)";
  const backgroundImage = `linear-gradient(to bottom, rgba(0, 0, 0, 0.65), rgba(0, 0, 0, 0.15)), ${backgroundBase}`;

  // 🔒 Right-click / DevTools-shortcut blocking — desktop (mouse + keyboard)
  // only. Previously this ran on every render with no cleanup (piling up
  // duplicate listeners) and unconditionally blocked the context menu,
  // which on many mobile browsers also blocks the long-press "Paste" menu —
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

  if (redirectLoading)
    return (
      <RedirectLoading message="Account created! Redirecting to login..." />
    );

  const inputH = isMobile ? "42px" : "38px";

  return (
    <>
      <Box
        sx={{
          backgroundImage,
          backgroundSize: "cover, cover",
          backgroundPosition: "center, center",
          backgroundRepeat: "no-repeat, no-repeat",
          width: "100%",
          height: "calc(100vh - 100px)",
          minHeight: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflowY: "hidden",
          overflowX: "hidden",
          py: 0,
          px: isCompact ? 0 : 2,
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
            padding: isCompact ? "0 16px" : "0 24px",
            boxSizing: "border-box",
          }}
          maxWidth={false}
        >
          {!isCompact && <Box
            sx={{
              width: isCompact ? "100%" : "auto",
              flex: "1 1 auto",
              minWidth: 0,
              position: "relative",
              height: isCompact ? "auto" : "min(690px, calc(100vh - 100px))",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <AnnouncementSlider
              campusId={branchId}
              targetRole="applicant"
              alignCenter={!isCompact}
              stack={isCompact}
            />
          </Box>}

          <div
            style={{
              border: `1px solid ${borderColor}`,
              marginLeft: 0,
              marginTop: 0,
              width: isCompact ? "100%" : 460,
              maxWidth: isCompact ? 640 : 460,
              minWidth: 0,
              flex: isCompact ? "none" : "0 0 460px",
              transform: "none",
              boxSizing: "border-box",
            }}
            className="Container registration-card uniform-card"
          >
            {/* Header */}
            {isCompact ? (
              <AnnouncementSlider campusId={branchId} targetRole="applicant" stack embedded />
            ) : <div
              className="Header"
              style={{
                backgroundColor: headerColor,
                padding: isMobile ? "8px 10px" : "0.4rem 0",
                borderBottom: "none",
              }}
            >
              <div className="HeaderTitle">
                <div
                  className="CircleCon"
                  style={
                    isCompact
                      ? undefined
                      : { borderWidth: "3px" }
                  }
                >
                  <img
                    src={assets.logoUrl || Logo}
                    alt="Logo"
                    style={
                      isCompact
                        ? undefined
                        : { width: 52, height: 52 }
                    }
                  />
                </div>
              </div>
              <div className="HeaderBody">
                <strong style={{ color: "white" }}>
                  {companyName
                    .split(" ")
                    .reduce((acc, word, i) => {
                      if (i % 5 === 0 && i !== 0)
                        acc.push(<br key={`br-${i}`} />);
                      acc.push(word + " ");
                      return acc;
                    }, [])}
                </strong>
                <p>Academic Portal System</p>
              </div>
            </div>}

            {/* Body */}
            <div
              className="Body"
              style={
                isCompact
                  ? undefined
                  : {
                      padding: "8px 14px 0 14px",
                    }
              }
            >
              {/* Campus */}
              <div className="TextField" style={{ marginTop: "12px" }}>
                <label style={{ color: "#333" }}>
                  Campus<span style={{ color: "red" }}> *</span>
                </label>
                <select
                  value={branchId}
                  onChange={handleBranchSelect}
                  className="border"
                  required
                  style={{
                    height: inputH,
                    fontSize: "16px",
                    border: fieldBorder(errors.campus),
                    borderRadius: UNIFORM_RADIUS,
                    width: "100%",
                    appearance: "none",
                    WebkitAppearance: "none",
                    MozAppearance: "none",
                    paddingRight: "2.2rem",
                    outline: "none",
                  }}
                >
                  <option value="">Select Campus</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.branch}
                    </option>
                  ))}
                </select>
                <ArrowDropDownIcon
                  sx={{
                    position: "absolute",
                    right: "10px",
                    top: "25px",
                    transform: "translateY(-50%)",
                    fontSize: "30px",
                    color: "black",
                    pointerEvents: "none",
                  }}
                />
              </div>

              {registerStep === 1 && (
              <>
                <div className="TextField" style={{ position: "relative" }}>
                  <label style={{ color: "#333" }}>
                    Last Name<span style={{ color: "red" }}> *</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Enter your last name"
                    required
                    disabled={fieldDisabled}
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value.toUpperCase())}
                    onKeyDown={handleKeyDownRegister}
                    className="border"
                    style={{
                      paddingLeft: "2.80rem",
                      height: inputH,
                      fontSize: "16px",
                      border: fieldBorder(errors.lastName),
                      borderRadius: UNIFORM_RADIUS,
                      width: "100%",
                    }}
                  />
                  <BadgeIcon
                    style={{
                      position: "absolute",
                      top: "25px",
                      left: "0.7rem",
                      fontSize: "20px",
                    }}
                  />
                  {errors.lastName && (
                    <span style={{ color: "red", fontSize: "15px" }}>
                      This field is required
                    </span>
                  )}
                </div>

                <div className="TextField" style={{ position: "relative" }}>
                  <label style={{ color: "#333" }}>
                    First Name<span style={{ color: "red" }}> *</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Enter your first name"
                    value={firstName}
                    disabled={fieldDisabled}
                    onChange={(e) => setFirstName(e.target.value.toUpperCase())}
                    onKeyDown={handleKeyDownRegister}
                    className="border"
                    style={{
                      paddingLeft: "2.80rem",
                      height: inputH,
                      fontSize: "16px",
                      border: fieldBorder(errors.firstName),
                      borderRadius: UNIFORM_RADIUS,
                      width: "100%",
                    }}
                  />
                  <PersonIcon
                    style={{
                      position: "absolute",
                      top: "25px",
                      left: "0.7rem",
                      fontSize: "20px",
                    }}
                  />
                  {errors.firstName && (
                    <span style={{ color: "red", fontSize: "15px" }}>
                      This field is required
                    </span>
                  )}
                </div>

                <div className="TextField" style={{ position: "relative" }}>
                  <label style={{ color: "#333" }}>
                    Middle Name (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="Enter your middle name"
                    value={middleName}
                    disabled={fieldDisabled}
                    onChange={(e) =>
                      setMiddleName(e.target.value.toUpperCase())
                    }
                    onKeyDown={handleKeyDownRegister}
                    className="border"
                    style={{
                      paddingLeft: "2.80rem",
                      height: inputH,
                      fontSize: "16px",
                      border: UNIFORM_BORDER,
                      borderRadius: UNIFORM_RADIUS,
                      width: "100%",
                    }}
                  />
                  <PersonIcon
                    style={{
                      position: "absolute",
                      top: "25px",
                      left: "0.7rem",
                      fontSize: "20px",
                    }}
                  />
                </div>

                <div
                  style={{
                    display: "flex",
                    gap: "0.75rem",
                  }}
                >
                  <div
                    className="TextField"
                    style={{
                      flex: 2.3,
                      position: "relative",
                    }}
                  >
                    <label style={{ color: "#333" }}>
                      Birth Date<span style={{ color: "red" }}> *</span>
                    </label>
                    <DateField
                      required
                      value={birthday}
                      disabled={fieldDisabled}
                      onChange={(e) => setBirthday(e.target.value)}
                      style={{
                        paddingLeft: "1rem",
                        height: inputH,
                        borderRadius: UNIFORM_RADIUS,
                        fontSize: "16px",
                        border: fieldBorder(errors.birthday),
                        width: "100%",
                      }}
                    />
                    {errors.birthday && (
                      <span style={{ color: "red", fontSize: "15px" }}>
                        This field is required
                      </span>
                    )}
                  </div>

                  <div
                    className="TextField"
                    style={{
                      flex: 1,
                      position: "relative",
                    }}
                  >
                    <label style={{ color: "#333" }}>Age</label>
                    <input
                      type="text"
                      readOnly
                      disabled
                      value={age}
                      placeholder="—"
                      className="border"
                      style={{
                        height: inputH,
                        fontSize: "16px",
                        textAlign: "center",
                        border: UNIFORM_BORDER,
                        borderRadius: UNIFORM_RADIUS,
                        width: "100%",
                        backgroundColor: "#f5f5f5",
                        color: "#333",
                      }}
                    />
                  </div>
                </div>

                <div
                  tabIndex={0}
                  onClick={goToStep2}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") goToStep2();
                  }}
                  style={nextActionStyle}
                >
                  NEXT
                </div>
              </>
              )}

              {registerStep === 2 && (
              <>

              <div
                style={{
                  display: "flex",
                  gap: "0",
                  flexWrap: "wrap",
                  flexDirection: "column",
                }}
              >
                <div
                  className="TextField"
                  style={{ position: "relative", flex: 1 }}
                >
                  <label style={{ color: "#333" }}>
                    Academic Program<span style={{ color: "red" }}> *</span>
                  </label>
                  <select
                    required
                    value={academicProgram}
                    disabled={fieldDisabled}
                    onChange={(e) => {
                      const prog = selectedBranch?.academicPrograms?.find(
                        (p) => String(p.id) === String(e.target.value),
                      );
                      if (prog && Number(prog.open) !== 1) {
                        const hours = formatProgramHours(prog);
                        setSnack({
                          open: true,
                          message: `${prog.name} registration is currently closed.${hours ? ` Hours: ${hours}.` : ""}`,
                          severity: "warning",
                        });
                        return;
                      }
                      setAcademicProgram(e.target.value);
                      setApplyingAs("");
                      setSelectedCurriculum("");
                    }}
                    className="border"
                    style={{
                      paddingLeft: "1rem",
                      height: inputH,
                      fontSize: "16px",
                      border: fieldBorder(errors.academicProgram),
                      borderRadius: UNIFORM_RADIUS,
                      width: "100%",
                      outline: "none",
                      boxShadow: "none",
                      appearance: "none",
                      paddingRight: "2.2rem",
                    }}
                  >
                    <option value="">Select Program</option>
                    {selectedBranch?.academicPrograms?.map((prog) => {
                      const isOpen = Number(prog.open) === 1;
                      const hours = formatProgramHours(prog);
                      return (
                        <option
                          key={prog.id}
                          value={prog.id}
                          disabled={!isOpen}
                        >
                          {prog.name}
                          {!isOpen
                            ? ` — Closed${hours ? ` (${hours})` : ""}`
                            : ""}
                        </option>
                      );
                    })}
                  </select>
                  {errors.academicProgram && (
                    <span style={{ color: "red", fontSize: "15px" }}>
                      This field is required
                    </span>
                  )}
                  <ArrowDropDownIcon
                    sx={{
                      position: "absolute",
                      right: "10px",
                      top: getIconTop(errors.academicProgram),
                      transform: "translateY(-50%)",
                      fontSize: "30px",
                      pointerEvents: "none",
                    }}
                  />
                </div>

                <div
                  className="TextField"
                  style={{ position: "relative", flex: 1 }}
                >
                  <label style={{ color: "#333" }}>
                    Applying As<span style={{ color: "red" }}> *</span>
                  </label>
                  <select
                    required
                    value={applyingAs}
                    disabled={fieldDisabled}
                    onChange={(e) => {
                      if (!academicProgram) {
                        setSnack({
                          open: true,
                          message: "Please select Academic Program first.",
                          severity: "warning",
                        });
                        return;
                      }
                      setApplyingAs(e.target.value);
                      setSelectedCurriculum("");
                    }}
                    className="border"
                    style={{
                      paddingLeft: "1rem",
                      height: inputH,
                      fontSize: "16px",
                      border: fieldBorder(errors.applyingAs),
                      borderRadius: UNIFORM_RADIUS,
                      width: "100%",
                      outline: "none",
                      boxShadow: "none",
                      appearance: "none",
                      paddingRight: "2.2rem",
                    }}
                  >
                    <option value="">Select Applying</option>
                    {(() => {
                      const selectedProgram =
                        selectedBranch?.academicPrograms?.find(
                          (prog) => prog.id.toString() === academicProgram,
                        );
                      if (!selectedProgram) return null;
                      const name = selectedProgram.name.toLowerCase();
                      if (name.includes("undergraduate"))
                        return (
                          <>
                            <option value="1">
                              Senior High School Graduate
                            </option>
                            <option value="2">
                              Senior High School Graduating Student
                            </option>
                            <option value="3">ALS Passer</option>
                            <option value="4">Transferee</option>
                            <option value="5">Cross Enrollee</option>
                          </>
                        );
                      if (
                        name.includes("graduate") ||
                        name.includes("master") ||
                        name.includes("baccalaureate")
                      )
                        return (
                          <>
                            <option value="7">Baccalaureate Graduate</option>
                            <option value="8">Master Degree Graduate</option>
                            <option value="6">Foreign Applicant</option>
                            <option value="5">Cross Enrollee</option>
                          </>
                        );
                      return null;
                    })()}
                  </select>
                  {errors.applyingAs && (
                    <span style={{ color: "red", fontSize: "15px" }}>
                      This field is required
                    </span>
                  )}
                  <ArrowDropDownIcon
                    sx={{
                      position: "absolute",
                      right: "10px",
                      top: getIconTop(errors.applyingAs),
                      transform: "translateY(-50%)",
                      fontSize: "30px",
                      pointerEvents: "none",
                    }}
                  />
                </div>
              </div>

              {/* NEW — shows the currently-selected program's daily registration
                  hours (Undergraduate 6pm-6am, Graduate 6am-6pm, TechVoc's own
                  custom hours, etc.), and flags it clearly if it just closed. */}
              {selectedProgramObj && selectedProgramHours && (
                <Box
                  sx={{
                    display: "flex",
                    gap: 1,
                    alignItems: "flex-start",
                    bgcolor:
                      Number(selectedProgramObj.open) === 1
                        ? "#f0f7ff"
                        : "#fff3cd",
                    border: `1px solid ${Number(selectedProgramObj.open) === 1 ? "#b3d4ff" : "#d4a017"}`,
                    borderRadius: "8px",
                    p: 1.25,
                    mt: 1,
                  }}
                >
                  <AccessTimeIcon
                    sx={{
                      fontSize: 16,
                      color:
                        Number(selectedProgramObj.open) === 1
                          ? "#1565c0"
                          : "#9a6700",
                      flexShrink: 0,
                      mt: 0.2,
                    }}
                  />
                  <Typography
                    sx={{
                      fontSize: 13,
                      color:
                        Number(selectedProgramObj.open) === 1
                          ? "#1a237e"
                          : "#5d4500",
                      lineHeight: 1.5,
                    }}
                  >
                    {selectedProgramObj.name} registration hours:{" "}
                    <strong>{selectedProgramHours}</strong> (Manila time).
                    {Number(selectedProgramObj.open) !== 1
                      ? " Currently closed — please come back during those hours."
                      : ""}
                  </Typography>
                </Box>
              )}

              <div className="TextField" style={{ position: "relative" }}>
                <label style={{ color: "#333" }}>
                  Course Applied<span style={{ color: "red" }}> *</span>
                </label>
                <Autocomplete
                  disabled={fieldDisabled || !academicProgram}
                  options={filteredCurriculum}
                  getOptionLabel={(option) =>
                    `(${option.program_code}): ${option.program_description}${option.major ? ` (${option.major})` : ""} (${getBranchLabel(option.components)})`
                  }
                  value={
                    filteredCurriculum.find(
                      (c) =>
                        String(c.curriculum_id) === String(selectedCurriculum),
                    ) || null
                  }
                  onChange={(event, selected) => {
                    if (!selected) {
                      setSelectedCurriculum("");
                      return;
                    }
                    const availability =
                      availabilityMap[selected.curriculum_id];
                    if (availability?.isFull) {
                      setSnack({
                        open: true,
                        message: "This course is already FULL.",
                        severity: "error",
                      });
                      return;
                    }
                    setSelectedCurriculum(selected.curriculum_id);
                  }}
                  isOptionEqualToValue={(option, value) =>
                    option.curriculum_id === value.curriculum_id
                  }
                  getOptionDisabled={(option) =>
                    availabilityMap[option.curriculum_id]?.isFull
                  }
                  slotProps={{
                    paper: {
                      sx: {
                        mt: 0.5,
                        border: `1px solid ${headerColor}`,
                        borderRadius: "8px",
                        boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
                        overflow: "hidden",
                        fontFamily: "Poppins, sans-serif",
                      },
                    },
                    listbox: {
                      sx: {
                        fontFamily: "Poppins, sans-serif",
                        fontSize: 12,
                        py: 0.5,
                        maxHeight: 240,
                        "& .MuiAutocomplete-option": {
                          fontSize: 12,
                          fontWeight: 600,
                          lineHeight: 1.35,
                          borderRadius: "6px",
                          mx: 0.5,
                          my: 0.25,
                          alignItems: "flex-start",
                        },
                        "& .MuiAutocomplete-option.Mui-focused": {
                          bgcolor: `${headerColor}14`,
                        },
                        "& .MuiAutocomplete-option[aria-selected='true']": {
                          bgcolor: `${mainButtonColor} !important`,
                          color: "#fff",
                        },
                      },
                    },
                  }}
                  renderOption={(props, option) => {
                    const availability = availabilityMap[option.curriculum_id];
                    const remaining = availability?.remaining ?? 0;
                    const isFull = availability?.isFull;
                    const selected = props["aria-selected"];
                    return (
                      <li
                        {...props}
                        style={{
                          ...props.style,
                          fontFamily: "Poppins, sans-serif",
                          fontSize: 12,
                          fontWeight: 600,
                          color: selected ? "#fff" : isFull ? "#c62828" : "#1a1a1a",
                        }}
                      >
                        {`(${option.program_code}): ${option.program_description}${option.major ? ` (${option.major})` : ""} (${getBranchLabel(option.components)})`}
                        <span
                          style={{
                            color: selected ? "#fff" : isFull ? "#c62828" : "#2e7d32",
                            fontWeight: 500,
                          }}
                        >
                          {isFull
                            ? " — FULL (0 slots left)"
                            : ` — (${remaining} slots left)`}
                        </span>
                      </li>
                    );
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      required
                      placeholder="Select Curriculum / Course"
                      error={!!errors.selectedCurriculum}
                      helperText={
                        errors.selectedCurriculum
                          ? "This field is required"
                          : ""
                      }
                      sx={{
                        "& .MuiOutlinedInput-root": {
                          height: inputH,
                          fontSize: UNIFORM_FONT_SIZE,
                          borderRadius: UNIFORM_RADIUS,
                          "& fieldset": {
                            border: fieldBorder(errors.selectedCurriculum),
                          },
                          "&:hover fieldset": {
                            border: fieldBorder(errors.selectedCurriculum),
                          },
                          "&.Mui-focused fieldset": {
                            border: fieldBorder(errors.selectedCurriculum),
                          },
                        },
                      }}
                    />
                  )}
                />
              </div>

              <div className="TextField" style={{ position: "relative" }}>
                <label style={{ color: "#333" }}>
                  Email Address<span style={{ color: "red" }}> *</span>
                  <span
                    style={{
                      color: "red",
                      fontSize: "8px",
                      fontWeight: 500,
                      marginLeft: "6px",
                    }}
                  >
                    Each email can only be used once.
                  </span>
                </label>
                <input
                  required
                  type="email"
                  disabled={fieldDisabled}
                  className="border"
                  id="email"
                  name="email"
                  placeholder="Enter your email address"
                  value={usersData.email}
                  onChange={(e) => {
                    handleChanges(e);
                    setEmailDomainStatus(null);
                    setEmailDomainSuggestion(null);
                  }}
                  onBlur={handleEmailBlur}
                  onKeyDown={handleKeyDownRegister}
                  style={{
                    paddingLeft: "2.80rem",
                    height: inputH,
                    fontSize: "16px",
                    border: fieldBorder(
                      errors.email || emailDomainStatus === "invalid",
                    ),
                    borderRadius: UNIFORM_RADIUS,
                  }}
                />
                <EmailIcon
                  style={{
                    position: "absolute",
                    top: "25px",
                    left: "0.7rem",
                    color: "rgba(0,0,0,0.4)",
                    fontSize: "20px",
                  }}
                />
                {errors.email && (
                  <span style={{ color: "red", fontSize: "15px" }}>
                    This field is required
                  </span>
                )}
                {emailDomainStatus === "checking" && (
                  <span
                    style={{
                      fontSize: "16px",
                      color: "#888",
                      marginTop: "4px",
                      display: "block",
                    }}
                  >
                    Checking email domain…
                  </span>
                )}
                {emailDomainStatus === "invalid" && (
                  <span
                    style={{
                      fontSize: "16px",
                      color: "#c62828",
                      marginTop: "4px",
                      display: "block",
                      fontWeight: 600,
                    }}
                  >
                    ⚠️ This domain doesn't appear to accept email. Please check
                    for typos.
                  </span>
                )}
                {emailDomainSuggestion && (
                  <span
                    style={{
                      fontSize: "16px",
                      color: "#b36b00",
                      marginTop: "4px",
                      display: "block",
                    }}
                  >
                    Did you mean{" "}
                    <button
                      type="button"
                      onClick={() => {
                        const at = usersData.email.lastIndexOf("@");
                        const fixed =
                          usersData.email.slice(0, at + 1) +
                          emailDomainSuggestion;
                        setUserData((prev) => ({ ...prev, email: fixed }));
                        setEmailDomainSuggestion(null);
                        setEmailDomainStatus(null);
                        // re-validate the corrected domain
                        setTimeout(() => handleEmailBlur(), 0);
                      }}
                      style={{
                        background: "none",
                        border: "none",
                        padding: 0,
                        color: "#1565c0",
                        textDecoration: "underline",
                        cursor: "pointer",
                        fontWeight: 600,
                      }}
                    >
                      {usersData.email.slice(
                        0,
                        usersData.email.lastIndexOf("@") + 1,
                      )}
                      {emailDomainSuggestion}
                    </button>
                    ?
                  </span>
                )}
              </div>

                <div
                  tabIndex={0}
                  onClick={goToStep3}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") goToStep3();
                  }}
                  style={nextActionStyle}
                >
                  NEXT
                </div>
                <div
                  onClick={() => setRegisterStep(1)}
                  style={{
                    textAlign: "center",
                    marginTop: "12px",
                    cursor: "pointer",
                    fontWeight: 600,
                    color: mainButtonColor,
                    fontSize: UNIFORM_FONT_SIZE,
                  }}
                >
                  ← Back
                </div>
              </>
              )}

              {registerStep === 3 && (
              <>
              {/* Bilingual password requirements notice — shown BEFORE the fields
                  so applicants get familiar with the rule before they start typing */}
              <div
                style={{
                  display: "flex",
                  gap: "1rem",
                  flexDirection: isMobile ? "column" : "row",
                }}
              >
                <div
                  className="TextField"
                  style={{ position: "relative", flex: 1 }}
                >
                  <label style={{ color: "#333" }}>
                    Password<span style={{ color: "red" }}> *</span>
                  </label>
                  <input
                    type={showPassword ? "text" : "password"}
                    className="border"
                    id="password"
                    disabled={fieldDisabled}
                    name="password"
                    placeholder="Enter your password"
                    value={usersData.password}
                    onChange={handleChanges}
                    onFocus={() => setPasswordFocused(true)}
                    onBlur={() => setPasswordFocused(false)}
                    onKeyDown={handleKeyDownRegister}
                    required
                    style={{
                      paddingLeft: "2.80rem",
                      height: inputH,
                      fontSize: "16px",
                      border: fieldBorder(errors.password),
                      borderRadius: UNIFORM_RADIUS,
                      width: "100%",
                    }}
                  />
                  <LockIcon
                    style={{
                      position: "absolute",
                      top: "25px",
                      left: "0.7rem",
                      color: "rgba(0,0,0,0.4)",
                      fontSize: "22px",
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: "absolute",
                      top: "25px",
                      right: "1rem",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                    }}
                  >
                    {showPassword ? <Visibility /> : <VisibilityOff />}
                  </button>
                  {errors.passwordRules && (
                    <span style={{ color: "red", fontSize: "15px" }}>
                      Password does not meet all requirements
                    </span>
                  )}
                  {!errors.passwordRules && errors.password && (
                    <span style={{ color: "red", fontSize: "15px" }}>
                      This field is required
                    </span>
                  )}
                </div>

                <div
                  className="TextField"
                  style={{ position: "relative", flex: 1 }}
                >
                  <label style={{ color: "#333" }}>
                    Confirm Password<span style={{ color: "red" }}> *</span>
                  </label>
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    className="border"
                    id="confirmPassword"
                    name="confirmPassword"
                    placeholder="Re-enter your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    onKeyDown={handleKeyDownRegister}
                    required
                    disabled={!usersData.password}
                    style={{
                      paddingLeft: "2.80rem",
                      height: inputH,
                      fontSize: "16px",
                      border: fieldBorder(errors.confirmPassword),
                      borderRadius: UNIFORM_RADIUS,
                      width: "100%",
                      backgroundColor: !usersData.password
                        ? "#f5f5f5"
                        : "white",
                      cursor: !usersData.password ? "not-allowed" : "text",
                    }}
                  />
                  <LockIcon
                    style={{
                      position: "absolute",
                    top: "25px",
                      left: "0.7rem",
                      color: "rgba(0,0,0,0.4)",
                      fontSize: "22px",
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    style={{
                      position: "absolute",
                      top: "25px",
                      right: "1rem",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                    }}
                  >
                    {showConfirmPassword ? <Visibility /> : <VisibilityOff />}
                  </button>
                  {errors.confirmPassword && (
                    <span style={{ color: "red", fontSize: "15px" }}>
                      Passwords do not match
                    </span>
                  )}
                </div>
              </div>

              <PasswordRulesNotice
                password={usersData.password}
                isMobile={isMobile}
                mainButtonColor={mainButtonColor}
                showChecklist={true}
              />

                <div
                  tabIndex={0}
                  onClick={goToStep4}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") goToStep4();
                  }}
                  style={nextActionStyle}
                >
                  NEXT
                </div>
                <div
                  onClick={() => setRegisterStep(2)}
                  style={{
                    textAlign: "center",
                    marginTop: "12px",
                    cursor: "pointer",
                    fontWeight: 600,
                    color: mainButtonColor,
                    fontSize: UNIFORM_FONT_SIZE,
                  }}
                >
                  ← Back
                </div>
              </>
              )}

              {registerStep === 4 && (
              <>
              {/* Google Authenticator notice */}
              <Box
                sx={{
                  display: "flex",
                  gap: 1.25,
                  alignItems: "flex-start",
                  bgcolor: "#fffaf3",
                  border: UNIFORM_BORDER,
                  borderRadius: "12px",
                  p: 2,
                  mt: 1,
                }}
              >
                <PhoneAndroidIcon
                  sx={{
                    color: mainButtonColor,
                    fontSize: 18,
                    flexShrink: 0,
                    mt: 0.2,
                  }}
                />
                <Box>
                  <Typography
                    sx={{ fontSize: 13, color: "#333", lineHeight: 1.45 }}
                  >
                    <strong>Two-factor authentication required.</strong> After
                    clicking Submit, you will be asked to scan a QR code using{" "}
                    <strong>Google Authenticator</strong> on your phone. Please
                    have it ready.
                  </Typography>
                </Box>
              </Box>

              <Box
                component="label"
                htmlFor="reminderCheck"
                sx={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 1.25,
                  backgroundColor: "#fff",
                  border: UNIFORM_BORDER,
                  borderRadius: "12px",
                  px: 1.75,
                  py: 1.5,
                  mt: 2,
                  cursor: "pointer",
                }}
              >
                <Checkbox
                  id="reminderCheck"
                  checked={reminderChecked}
                  onChange={(e) => setReminderChecked(e.target.checked)}
                  size="small"
                  sx={{
                    p: 0,
                    mt: 0.15,
                    color: "#b0b8c8",
                    "&.Mui-checked": { color: mainButtonColor },
                  }}
                />
                <Typography
                  sx={{
                    fontSize: 13,
                    color: "#333",
                    lineHeight: 1.55,
                    userSelect: "none",
                  }}
                >
                  I have read and understood the admission rules and application
                  guidelines. I confirm that I have never taken the University's
                  admission examination before and that I will select the correct
                  application type and "Applying As" category based on my
                  qualifications.
                </Typography>
              </Box>

              <div
                tabIndex={0}
                onClick={() => {
                  if (!isSubmitting) handleOpenReview();
                }}
                onKeyDown={(e) => {
                  if (e.key !== "Enter") return;
                  if (!isSubmitting) handleOpenReview();
                }}
                style={primaryActionStyle}
              >
                {!registrationOpen
                  ? "REGISTRATION CLOSED"
                  : !reminderChecked
                    ? "AGREE TO TERMS TO CONTINUE"
                    : emailDomainSuggestion || emailDomainStatus === "invalid"
                      ? "FIX EMAIL TO CONTINUE"
                      : isSubmitting
                        ? "VALIDATING..."
                        : "SUBMIT APPLICATION"}
              </div>
                <div
                  onClick={() => setRegisterStep(3)}
                  style={{
                    textAlign: "center",
                    marginTop: "12px",
                    cursor: "pointer",
                    fontWeight: 600,
                    color: mainButtonColor,
                    fontSize: UNIFORM_FONT_SIZE,
                  }}
                >
                  ← Back
                </div>
              </>
              )}

              <div
                style={{
                  width: "100%",
                  margin: "10px 0 0",
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
                    Already have an account?
                  </div>
                  <div style={{ color: "#777", fontSize: isMobile ? "10px" : "9px", marginTop: "3px" }}>
                    Login to continue your application.
                  </div>
                </div>
                <Link
                  to="/login_applicant"
                  style={{
                    flexShrink: 0,
                    padding: "6px 14px",
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
                  Login here <span aria-hidden="true">➜</span>
                </Link>
              </div>
            </div>

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

        {/* ── Review / Confirm Modal (shown BEFORE anything is submitted) ── */}
        <ReviewApplicationModal
          open={showReviewModal}
          onClose={() => setShowReviewModal(false)}
          onConfirm={handleRegister}
          isSubmitting={isSubmitting}
          isMobile={isCompact}
          mainButtonColor={mainButtonColor}
          data={reviewData}
        />

        {/* ── TOTP Setup Modal (replaces old email OTP modal) ── */}
        <TotpSetupModal
          open={showTotpModal}
          onClose={() => setShowTotpModal(false)}
          onSuccess={handleTotpSuccess}
          email={tempEmail}
          mainButtonColor={mainButtonColor}
          isMobile={isCompact}
          registrationPayload={registrationPayload}
        />

        {/* ── Registration Success Modal (shows the applicant number) ── */}
        <RegistrationSuccessModal
          open={showSuccessModal}
          applicantNumber={applicantNumber}
          email={tempEmail}
          firstName={firstName}
          middleName={middleName}
          lastName={lastName}
          birthday={birthday}
          age={age}
          companyName={companyName}
          mainButtonColor={mainButtonColor}
          isMobile={isCompact}
          onContinue={handleContinueToLogin}
        />

        <Snackbar
          open={snack.open}
          autoHideDuration={4000}
          onClose={handleClose}
          anchorOrigin={{ vertical: "top", horizontal: "center" }}
        >
          <Alert
            severity={snack.severity}
            onClose={handleClose}
            sx={{
              width: "100%",
              fontSize: "12px",
              "& .MuiAlert-message": {
                fontSize: "12px",
              },
            }}
          >
            {snack.message}
          </Alert>
        </Snackbar>

        {/* Dialog: Important Reminder */}
        <Dialog
          open={openReminder}
          onClose={() => setOpenReminder(false)}
          maxWidth="md"
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: "16px",
              overflow: "hidden",
              mx: isMobile ? 2 : "auto",
              maxWidth: 980,
              maxHeight: "90vh",
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 24px 60px rgba(0,0,0,0.18)",
            },
          }}
        >
          <DialogTitle
            sx={{
              bgcolor: mainButtonColor,
              color: "white",
              display: "flex",
              alignItems: "center",
              fontWeight: "bold",
              px: { xs: 2.5, sm: 3 },
              py: 2,
              flexShrink: 0,
            }}
          >
            <Box display="flex" alignItems="center" gap={1.5}>
              <Box
                sx={{
                  backgroundColor: "rgba(255,255,255,0.2)",
                  borderRadius: "50%",
                  width: 40,
                  height: 40,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <WarningAmberIcon sx={{ color: "white", fontSize: 22 }} />
              </Box>
              <Box>
                <Typography
                  fontWeight="bold"
                  fontSize={16}
                  color="white"
                  lineHeight={1.2}
                >
                  Important Reminder for Applicants
                </Typography>
                <Typography
                  fontSize={12}
                  color="rgba(255,255,255,0.8)"
                  lineHeight={1.2}
                >
                  Please read carefully before proceeding.
                </Typography>
              </Box>
            </Box>
          </DialogTitle>

          <DialogContent
            sx={{
              px: { xs: 2.5, sm: 4 },
              pb: 1.5,
              overflowY: "auto",
              zoom: 0.9,
              "&.MuiDialogContent-root": {
                paddingTop: "20px",
              },
            }}
          >
            <Box
              sx={{
                display: "flex",
                justifyContent: "center",
                mb: 2,
              }}
            >
              <Box
                sx={{
                  width: 56,
                  height: 56,
                  borderRadius: "50%",
                  border: "1.5px solid #e8c4c4",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <WarningAmberIcon sx={{ color: "#e6a23c", fontSize: 28 }} />
              </Box>
            </Box>

            <Box sx={{ textAlign: "center", mb: 3, maxWidth: 620, mx: "auto" }}>
              <Typography
                sx={{
                  fontSize: 14,
                  color: "#333",
                  lineHeight: 1.7,
                }}
              >
                This online admission portal is intended only for{" "}
                <strong style={{ color: mainButtonColor }}>
                  first-time applicants
                </strong>
                .
                <br />
                Applicants who have previously taken the University's admission
                examination are no longer eligible to register for a new
                applicant account.
              </Typography>
            </Box>

            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
                gap: 2.5,
                alignItems: "stretch",
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 2,
                }}
              >
                <Box
                  sx={{
                    border: "1px solid #e6e6e6",
                    borderRadius: "12px",
                    overflow: "hidden",
                    backgroundColor: "#fff",
                  }}
                >
                  <Box
                    sx={{
                      backgroundColor: mainButtonColor,
                      px: 2,
                      py: 1,
                    }}
                  >
                    <Typography
                      sx={{
                        color: "#fff",
                        fontWeight: 700,
                        fontSize: 13,
                      }}
                    >
                      Admission Rules
                    </Typography>
                  </Box>
                  <Box sx={{ p: 2 }}>
                    {[
                      <>
                        Register only if you have <strong>never taken</strong>{" "}
                        the University's admission examination.
                      </>,
                      <>
                        Applicants who have previously taken the admission
                        examination are <strong>not eligible</strong> to create
                        another applicant account or submit a new application.
                      </>,
                      <>
                        The University reserves the right to verify all
                        applicant records. Any duplicate or invalid application
                        may be rejected or disqualified.
                      </>,
                    ].map((item, index) => (
                      <Box
                        key={index}
                        sx={{
                          display: "flex",
                          gap: 1,
                          alignItems: "flex-start",
                          mb: index === 2 ? 0 : 0.6,
                        }}
                      >
                        <Typography
                          component="span"
                          sx={{ fontSize: 13, lineHeight: 1.45, color: "#333" }}
                        >
                          •
                        </Typography>
                        <Typography
                          sx={{ fontSize: 13, lineHeight: 1.45, color: "#333" }}
                        >
                          {item}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                </Box>

                <Box
                  sx={{
                    border: "1px solid #e6e6e6",
                    borderRadius: "12px",
                    backgroundColor: "#fff",
                    p: 2,
                    flex: 1,
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: 14,
                      fontWeight: 700,
                      color: "#1a1a1a",
                      mb: 1,
                    }}
                  >
                    Application Types
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: 13,
                      color: "#333",
                      lineHeight: 1.45,
                      mb: 0.4,
                    }}
                  >
                    Before continuing, determine which application type matches
                    the program you intend to pursue.
                  </Typography>
                  {[
                    <>
                      <strong>Undergraduate</strong> — For applicants applying
                      to bachelor's degree programs.
                    </>,
                    <>
                      <strong>Graduate</strong> — For applicants pursuing
                      graduate studies, including master's or doctoral degree
                      programs.
                    </>,
                    <>
                      <strong>TechVoc</strong> — For applicants enrolling in
                      Technical-Vocational Education and Training (TVET)
                      programs focused on practical and industry-based skills.
                    </>,
                  ].map((item, index) => (
                    <Box
                      key={index}
                      sx={{
                        display: "flex",
                        gap: 1,
                        alignItems: "flex-start",
                        mb: index === 2 ? 0 : 0.55,
                      }}
                    >
                      <Typography
                        component="span"
                        sx={{ fontSize: 13, lineHeight: 1.45, color: "#333" }}
                      >
                        •
                      </Typography>
                      <Typography
                        sx={{ fontSize: 13, lineHeight: 1.45, color: "#333" }}
                      >
                        {item}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </Box>

              <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 2,
                }}
              >
                <Box
                  sx={{
                    backgroundColor: "#fffaf3",
                    borderRadius: "12px",
                    p: 2.25,
                    flex: 1,
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: mainButtonColor,
                      letterSpacing: "0.02em",
                      mb: 0.4,
                    }}
                  >
                    UNDERGRADUATE APPLICANTS
                  </Typography>
                  {[
                    "Senior High School Graduate",
                    "Senior High School Graduating Student",
                    "ALS Passer",
                    "Transferee",
                    "Second-Course Applicant",
                  ].map((item) => (
                    <Box
                      key={item}
                      sx={{ display: "flex", gap: 1, alignItems: "flex-start" }}
                    >
                      <Typography sx={{ fontSize: 13, lineHeight: 1.45, color: "#333" }}>
                        •
                      </Typography>
                      <Typography sx={{ fontSize: 13, lineHeight: 1.45, color: "#333" }}>
                        {item}
                      </Typography>
                    </Box>
                  ))}

                  <Typography
                    sx={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: mainButtonColor,
                      letterSpacing: "0.02em",
                      mt: 1.15,
                      mb: 0.4,
                    }}
                  >
                    UNDERGRADUATE OR GRADUATE
                  </Typography>
                  <Box sx={{ display: "flex", gap: 1, alignItems: "flex-start" }}>
                    <Typography sx={{ fontSize: 13, lineHeight: 1.45, color: "#333" }}>
                      •
                    </Typography>
                    <Typography sx={{ fontSize: 13, lineHeight: 1.45, color: "#333" }}>
                      Cross Enrollee
                    </Typography>
                  </Box>

                  <Typography
                    sx={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: mainButtonColor,
                      letterSpacing: "0.02em",
                      mt: 1.15,
                      mb: 0.4,
                    }}
                  >
                    GRADUATE APPLICANTS
                  </Typography>
                  {["Baccalaureate Graduate", "Master Degree Graduate"].map(
                    (item) => (
                      <Box
                        key={item}
                        sx={{ display: "flex", gap: 1, alignItems: "flex-start" }}
                      >
                        <Typography sx={{ fontSize: 13, lineHeight: 1.45, color: "#333" }}>
                          •
                        </Typography>
                        <Typography sx={{ fontSize: 13, lineHeight: 1.45, color: "#333" }}>
                          {item}
                        </Typography>
                      </Box>
                    ),
                  )}

                  <Typography
                    sx={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: "#c62828",
                      letterSpacing: "0.02em",
                      mt: 1.15,
                      mb: 0.4,
                    }}
                  >
                    FOREIGN APPLICANTS
                  </Typography>
                  <Typography
                    sx={{ fontSize: 13, lineHeight: 1.45, color: "#333" }}
                  >
                    Foreign Applicant/Student registration is currently available
                    only for <strong>Baccalaureate Graduate</strong> and{" "}
                    <strong>Master Degree Graduate</strong> applicants.
                    Undergraduate foreign admissions are not yet available
                    through this online portal.
                  </Typography>
                </Box>

                <Box
                  component="label"
                  htmlFor="agreeCheck"
                  sx={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 1.25,
                    backgroundColor: "#fff",
                    border: "1px solid #e6e6e6",
                    borderRadius: "12px",
                    px: 1.75,
                    py: 1.5,
                    cursor: "pointer",
                  }}
                >
                  <Checkbox
                    id="agreeCheck"
                    checked={agreeChecked}
                    onChange={(e) => setAgreeChecked(e.target.checked)}
                    sx={{
                      p: 0,
                      mt: 0.15,
                      color: "#b0b8c8",
                      "&.Mui-checked": {
                        color: mainButtonColor,
                      },
                    }}
                    size="small"
                  />
                  <Typography
                    sx={{
                      fontSize: 13,
                      color: "#333",
                      lineHeight: 1.55,
                      userSelect: "none",
                    }}
                  >
                    I have read and understood the admission rules. I confirm
                    that I have never taken the admission examination before and
                    that the information I provide is true and accurate.
                  </Typography>
                </Box>
              </Box>
            </Box>
          </DialogContent>

          <DialogActions
            sx={{
              px: { xs: 2.5, sm: 4 },
              pb: 3,
              pt: 2,
            }}
          >
            <Button
              fullWidth
              variant="contained"
              disabled={!agreeChecked}
              onClick={() => setOpenReminder(false)}
              sx={{
                height: 44,
                borderRadius: "10px",
                backgroundColor: agreeChecked ? mainButtonColor : "#b0b8c8",
                color: "#fff",
                fontWeight: 700,
                fontSize: 14,
                textTransform: "none",
                boxShadow: "none",
                "&:hover": {
                  backgroundColor: agreeChecked ? mainButtonColor : "#b0b8c8",
                  opacity: 0.9,
                  boxShadow: "none",
                },
                "&.Mui-disabled": {
                  backgroundColor: "#b0b8c8",
                  color: "#fff",
                  opacity: 0.7,
                },
              }}
            >
              Continue to Registration
            </Button>
          </DialogActions>
        </Dialog>
        {/* Dialog: Registration Closed */}
        <Dialog
          open={openClosedDialog}
          maxWidth="sm"
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: "16px",
              overflow: "hidden",
              mx: isMobile ? 2 : "auto",
              boxShadow: "0 24px 60px rgba(0,0,0,0.25)",
            },
          }}
        >
          <DialogTitle
            sx={{
              bgcolor: "#7a0000",
              color: "white",
              display: "flex",
              alignItems: "center",
              fontWeight: "bold",
              px: 3,
              py: 2,
            }}
          >
            <Box display="flex" alignItems="center" gap={1.5}>
              <Box
                sx={{
                  backgroundColor: "rgba(255,255,255,0.2)",
                  borderRadius: "50%",
                  width: 40,
                  height: 40,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Typography fontSize={20}>🚫</Typography>
              </Box>
              <Box>
                <Typography
                  fontWeight="bold"
                  fontSize={isMobile ? 16 : 16}
                  color="white"
                  lineHeight={1.2}
                >
                  Registration Closed
                </Typography>
                <Typography
                  fontSize={15}
                  color="rgba(255,255,255,0.8)"
                  lineHeight={1.2}
                >
                  Applications are not being accepted
                </Typography>
              </Box>
            </Box>
          </DialogTitle>
          <DialogContent sx={{ px: 3, pt: 3, pb: 1 }}>
            <Box textAlign="center" py={1}>
              <Box
                sx={{
                  width: 80,
                  height: 80,
                  borderRadius: "50%",
                  backgroundColor: "#fff0f0",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 16px",
                  border: "3px solid #f44336",
                }}
              >
                <Typography fontSize={34}>🚫</Typography>
              </Box>
              <Typography
                fontWeight="bold"
                fontSize={17}
                color="#c62828"
                mb={1}
              >
                Registration is Currently Closed
              </Typography>
              <Typography fontSize={15.5} color="#555" lineHeight={1.6}>
                Please wait for the official announcement before attempting to
                register.
              </Typography>
            </Box>
          </DialogContent>
          <DialogActions
            sx={{ justifyContent: "center", px: 3, pb: 2.5, pt: 1.5 }}
          >
            <Button
              variant="contained"
              onClick={() => navigate("/login_applicant")}
              fullWidth={isMobile}
              sx={{
                backgroundColor: "#7a0000",
                color: "#fff",
                fontWeight: 600,
                fontSize: "16px",
                px: 4,
                py: 1.25,
                borderRadius: "10px",
                textTransform: "none",
                boxShadow: "none",
              }}
            >
              Go to Login
            </Button>
          </DialogActions>
        </Dialog>

        {/* Dialog: Branch Admissions Closed */}
        <Dialog
          open={openBranchDialog}
          onClose={() => setOpenBranchDialog(false)}
          maxWidth="sm"
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: "16px",
              overflow: "hidden",
              mx: isMobile ? 2 : "auto",
              boxShadow: "0 24px 60px rgba(0,0,0,0.25)",
            },
          }}
        >
          <DialogTitle
            sx={{
              bgcolor: mainButtonColor,
              color: "white",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              fontWeight: "bold",
              px: 3,
              py: 2,
            }}
          >
            <Box display="flex" alignItems="center" gap={1.5}>
              <Box
                sx={{
                  backgroundColor: "rgba(255,255,255,0.2)",
                  borderRadius: "50%",
                  width: 40,
                  height: 40,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <CampaignIcon sx={{ color: "white", fontSize: 22 }} />
              </Box>
              <Box>
                <Typography
                  fontWeight="bold"
                  fontSize={isMobile ? 16 : 16}
                  color="white"
                  lineHeight={1.2}
                >
                  Admissions Currently Closed
                </Typography>
                <Typography
                  fontSize={15}
                  color="rgba(255,255,255,0.8)"
                  lineHeight={1.2}
                >
                  This campus is not accepting applications
                </Typography>
              </Box>
            </Box>
          </DialogTitle>
          <DialogContent sx={{ px: 3, pt: 2.5, pb: 1 }}>
            <Box
              sx={{
                border: "1px solid #f5a623",
                borderRadius: "8px",
                p: 1.5,
                mb: 2,
                mt: 2,
                display: "flex",
                gap: 1,
                alignItems: "flex-start",
                backgroundColor: "#fffbf2",
              }}
            >
              <span style={{ fontSize: 18, flexShrink: 0 }}>⚠️</span>
              <Typography fontSize={15.5} color="#5d4037" lineHeight={1.5}>
                Registration is only available during the officially designated
                hours. Submissions outside this period{" "}
                <strong>cannot be processed</strong>.
              </Typography>
            </Box>
            <Typography
              sx={{
                fontSize: "15.5px",
                color: "#333",
                lineHeight: 1.6,
                mb: 1.5,
              }}
            >
              Kindly return during the authorized registration hours to complete
              your application.
            </Typography>
            {/* Registration hours are now per-Academic-Program (Undergraduate,
                Graduate, TechVoc, etc.) instead of one branch-wide season, so
                we list the hours for every program on this branch that has
                its own schedule configured, rather than a single date range. */}
            {selectedBranch?.academicPrograms?.some(
              (p) => p.start_date && p.end_date,
            ) && (
              <Box
                sx={{
                  mt: 2,
                  p: 2,
                  background: "#fff9ec",
                  borderRadius: "8px",
                  border: "1.5px solid #e2e8f0",
                }}
              >
                <Typography
                  sx={{
                    fontSize: "14px",
                    color: "red",
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    fontWeight: 700,
                    mb: 1,
                    textAlign: "center",
                  }}
                >
                  Registration Hours by Program
                </Typography>
                <Box
                  sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}
                >
                  {selectedBranch.academicPrograms.map((prog) => {
                    const hours = formatProgramHours(prog);
                    if (!hours) return null;
                    return (
                      <Box key={prog.id} sx={{ textAlign: "center" }}>
                        <Typography
                          sx={{
                            fontSize: isMobile ? "13px" : "14px",
                            color: "#666",
                            fontWeight: 600,
                          }}
                        >
                          {prog.name}
                        </Typography>
                        <Typography
                          sx={{
                            fontSize: isMobile ? "17px" : "20px",
                            fontWeight: 700,
                            color: "#1a1a2e",
                            fontFamily: "'DM Sans', sans-serif",
                          }}
                        >
                          {hours}
                        </Typography>
                      </Box>
                    );
                  })}
                </Box>
              </Box>
            )}
            <Typography
              sx={{
                fontSize: "15px",
                color: "#888",
                lineHeight: 1.6,
                textAlign: "center",
                fontStyle: "italic",
                mt: 2,
                mb: 0.5,
              }}
            >
              We sincerely appreciate your patience and understanding.
            </Typography>
          </DialogContent>
          <DialogActions
            sx={{
              px: 3,
              pb: 2.5,
              pt: 1.5,
              gap: 1.5,
              display: "flex",
              flexDirection: isMobile ? "column" : "row",
            }}
          >
            <Button
              variant="outlined"
              color="error"
              onClick={() => setOpenBranchDialog(false)}
              fullWidth
              sx={{
                height: 48,
                textTransform: "none",
                fontWeight: 600,
                fontSize: "16px",
              }}
            >
              Close
            </Button>
            <Button
              variant="contained"
              onClick={() => navigate("/login_applicant")}
              fullWidth
              sx={{
                height: 48,
                backgroundColor: mainButtonColor,
                color: "#fff",
                fontWeight: 600,
                fontSize: "16px",
                textTransform: "none",
                boxShadow: "none",
              }}
            >
              Go to Login
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </>
  );
};

export default Register;
