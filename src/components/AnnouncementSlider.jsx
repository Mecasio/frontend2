import React, { useEffect, useState } from "react";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import API_BASE_URL from "../apiConfig";
import {
    FALLBACK_DETAIL_THEME,
    buildDetailThemesForSlides,
} from "../utils/announcementDetailColor";

import IconButton from "@mui/material/IconButton";
import ArrowBackIosNewIcon from "@mui/icons-material/ArrowBackIosNew";
import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos";
import CloseIcon from "@mui/icons-material/Close";
import ZoomInIcon from "@mui/icons-material/ZoomIn";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";

/* ─── Hook: detect mobile breakpoint ─── */
const useIsMobile = (breakpoint = 768) => {
    const [isMobile, setIsMobile] = useState(
        typeof window !== "undefined" ? window.innerWidth <= breakpoint : false
    );
    useEffect(() => {
        const handler = () => setIsMobile(window.innerWidth <= breakpoint);
        window.addEventListener("resize", handler);
        return () => window.removeEventListener("resize", handler);
    }, [breakpoint]);
    return isMobile;
};

/* ─── Formats announcement content into JSX with bullets / line-breaks ─── */
const FormattedContent = ({ text, bulletColor = "#fff" }) => {
    if (!text) return null;
    const lines = text.split("\n");
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            {lines.map((line, i) => {
                const trimmed = line.trim();
                if (!trimmed) return <div key={i} style={{ height: "6px" }} />;

                const bulletMatch = trimmed.match(/^([•\*\-–])\s+(.*)/);
                if (bulletMatch) {
                    return (
                        <div key={i} style={{ display: "flex", gap: "8px", alignItems: "flex-start" }}>
                            <span style={{ color: bulletColor, marginTop: "2px", flexShrink: 0, fontSize: "14px" }}>•</span>
                            <span style={{ color: "rgba(255,255,255,0.92)", fontSize: "13.5px", lineHeight: 1.55 }}>
                                {bulletMatch[2]}
                            </span>
                        </div>
                    );
                }

                const subBulletMatch = line.match(/^[\s\t]+([•\*\-–])\s+(.*)/);
                if (subBulletMatch) {
                    return (
                        <div key={i} style={{ display: "flex", gap: "8px", alignItems: "flex-start", paddingLeft: "18px" }}>
                            <span style={{ color: "rgba(255,255,255,0.55)", marginTop: "2px", flexShrink: 0, fontSize: "12px" }}>◦</span>
                            <span style={{ color: "rgba(255,255,255,0.8)", fontSize: "13px", lineHeight: 1.55 }}>
                                {subBulletMatch[2]}
                            </span>
                        </div>
                    );
                }

                const isHeading = trimmed === trimmed.toUpperCase() && trimmed.length > 3 && /[A-Z]/.test(trimmed);
                if (isHeading) {
                    return (
                        <p key={i} style={{ margin: "6px 0 2px", color: "#fff", fontWeight: 700, fontSize: "12px", letterSpacing: "0.08em", textTransform: "uppercase", opacity: 0.75 }}>
                            {trimmed}
                        </p>
                    );
                }

                return (
                    <p key={i} style={{ margin: 0, color: "rgba(255,255,255,0.9)", fontSize: "13.5px", lineHeight: 1.6 }}>
                        {trimmed}
                    </p>
                );
            })}
        </div>
    );
};

const DETAIL_TAB_STYLE = {
    border: "none",
    borderRadius: "12px 0 0 12px",
    padding: "27px 11px",
    minWidth: 42,
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "6px",
    boxShadow: "-2px 2px 10px rgba(0,0,0,0.35)",
};

const DETAIL_TAB_LABEL_STYLE = {
    color: "#fff",
    fontSize: "13px",
    fontWeight: 700,
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    writingMode: "vertical-rl",
    textOrientation: "mixed",
    transform: "rotate(180deg)",
    lineHeight: 1,
};

const DetailToggleTab = ({
    open,
    onClick,
    tabColor = FALLBACK_DETAIL_THEME.tab,
}) => (
    <div
        onClick={onClick}
        title={open ? "Hide details" : "Show details"}
        style={{
            position: "absolute",
            // Flush to the poster’s right edge, directly under the zoom control.
            top: 44,
            right: 0,
            zIndex: 25,
            cursor: "pointer",
        }}
    >
        <div style={{ ...DETAIL_TAB_STYLE, background: tabColor }}>
            <motion.div
                animate={{ rotate: open ? 0 : 180 }}
                transition={{ duration: 0.3 }}
            >
                <ChevronRightIcon sx={{ color: "#fff", fontSize: 20 }} />
            </motion.div>
            <span style={DETAIL_TAB_LABEL_STYLE}>
                {open ? "Close" : "Details"}
            </span>
        </div>
    </div>
);

const AnnouncementSlider = ({ alignCenter = false, stack = false, embedded = false }) => {
    const desktopOffset = { margin: 0 };
    const desktopSize = alignCenter
        ? { width: "100%", height: "100%", position: "absolute", inset: 0 }
        : { width: "min(900px, 70vw)", height: "min(700px, 70vh)" };
    const [slides, setSlides] = useState([]);
    const [index, setIndex] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    // Compact register layout keeps the carousel image-first; details stay in lightbox.
    const [contentOpen, setContentOpen] = useState(!alignCenter && !stack);
    const isMobile = useIsMobile();
    const useStackLayout = stack || isMobile;

    const [lightboxOpen, setLightboxOpen] = useState(false);
    const [lightboxIndex, setLightboxIndex] = useState(0);
    const [detailThemes, setDetailThemes] = useState({});

    useEffect(() => {
        axios
            .get(`${API_BASE_URL}/api/announcements`, { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` } })
            .then(res => {
                if (Array.isArray(res.data.data)) {
                    setSlides(res.data.data);
                    setIndex(0);
                }
            })
            .catch(err => console.error("Announcement fetch error:", err));
    }, []);

    /* Sample each poster so the details panel + DETAILS/CLOSE tabs match it. */
    useEffect(() => {
        let cancelled = false;
        if (!slides.length) {
            setDetailThemes({});
            return undefined;
        }
        buildDetailThemesForSlides(slides, API_BASE_URL).then((map) => {
            if (!cancelled) setDetailThemes(map);
        });
        return () => { cancelled = true; };
    }, [slides]);

    /* Auto-advance */
    useEffect(() => {
        if (slides.length <= 1 || isDragging || isHovered || lightboxOpen) return;
        const timer = setTimeout(() => {
            setIndex(prev => (prev + 1) % slides.length);
        }, isMobile ? 10000 : 8000);  // ← 10s on mobile, 5s on desktop
        return () => clearTimeout(timer);
    }, [slides.length, index, isDragging, isHovered, lightboxOpen, isMobile]);

    /* Keyboard nav for lightbox */
    useEffect(() => {
        if (!lightboxOpen) return;
        const handleKey = (e) => {
            if (e.key === "Escape") closeLightbox();
            if (e.key === "ArrowRight") lightboxNext();
            if (e.key === "ArrowLeft") lightboxPrev();
        };
        window.addEventListener("keydown", handleKey);
        return () => window.removeEventListener("keydown", handleKey);
    }, [lightboxOpen, lightboxIndex, slides.length]);

    if (!slides.length) {
        return (
            <div style={{
                width: useStackLayout ? "100%" : desktopSize.width,
                height: useStackLayout ? undefined : desktopSize.height,
                aspectRatio: useStackLayout ? "16 / 9" : undefined,
                maxWidth: useStackLayout ? "100%" : desktopSize.maxWidth,
                background: "#f2f2f2",
                borderRadius: embedded ? "10px 10px 0 0" : "10px",
                ...(alignCenter ? { position: "absolute", inset: 0 } : {}),
                ...(useStackLayout ? {} : desktopOffset),
            }} />
        );
    }

    const handleDragEnd = (_, info) => {
        const threshold = 80;
        if (Math.abs(info.offset.x) < Math.abs(info.offset.y)) { setIsDragging(false); return; }
        if (info.offset.x < -threshold) setIndex(prev => (prev + 1) % slides.length);
        else if (info.offset.x > threshold) setIndex(prev => (prev - 1 + slides.length) % slides.length);
        setIsDragging(false);
    };

    const goNext = () => setIndex(prev => (prev + 1) % slides.length);
    const goPrev = () => setIndex(prev => (prev - 1 + slides.length) % slides.length);

    const openLightbox = () => { setLightboxIndex(index); setLightboxOpen(true); };
    const closeLightbox = () => setLightboxOpen(false);
    const lightboxNext = () => setLightboxIndex(prev => (prev + 1) % slides.length);
    const lightboxPrev = () => setLightboxIndex(prev => (prev - 1 + slides.length) % slides.length);

    const current = slides[index];
    const lightboxCurrent = slides[lightboxIndex];
    if (!current) return null;

    // Panel + DETAILS/CLOSE tabs share the poster-sampled theme (navy fallback).
    const themeFor = (slide) =>
        detailThemes[slide?.id ?? slide?.file_path] || FALLBACK_DETAIL_THEME;
    const theme = themeFor(current);
    const lightboxTheme = themeFor(lightboxCurrent);

    const hasImage = !!current.file_path;
    const hasContent = !!(current.content?.trim());

    /* ─────────────────────────────────────────
       LIGHTBOX — shared between mobile & desktop
       Image LEFT  |  Details RIGHT
    ───────────────────────────────────────── */
    const LightboxModal = () => (
        <AnimatePresence>
            {lightboxOpen && lightboxCurrent && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    onClick={closeLightbox}
                    style={{
                        position: "fixed", inset: 0, zIndex: 9999,
                        background: "rgba(0,0,0,0.92)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                    }}
                >
                    {/* Close */}
                    <IconButton
                        onClick={e => { e.stopPropagation(); closeLightbox(); }}
                        sx={{
                            position: "fixed", top: 18, left: 32, zIndex: 10000,
                            width: 45, height: 45,
                            background: "rgba(255,255,255,0.15)", color: "#fff",
                            "&:hover": { background: "rgba(220,50,50,0.75)" },
                        }}
                    >
                        <CloseIcon sx={{ fontSize: 18 }} />
                    </IconButton>

                    {/* Prev */}
                    <IconButton
                        onClick={e => { e.stopPropagation(); lightboxPrev(); }}
                        sx={{
                            position: "fixed", left: 32, top: "50%", transform: "translateY(-50%)",
                            zIndex: 10000, width: 45, height: 45,
                            background: "rgba(255,255,255,0.15)", color: "#fff",
                            "&:hover": { background: "rgba(255,255,255,0.3)" },
                        }}
                    >
                        <ArrowBackIosNewIcon sx={{ fontSize: 18 }} />
                    </IconButton>

                    {/* Next */}
                    <IconButton
                        onClick={e => { e.stopPropagation(); lightboxNext(); }}
                        sx={{
                            position: "fixed", right: 32, top: "50%", transform: "translateY(-50%)",
                            zIndex: 10000, width: 45, height: 45,
                            background: "rgba(255,255,255,0.15)", color: "#fff",
                            "&:hover": { background: "rgba(255,255,255,0.3)" },
                        }}
                    >
                        <ArrowForwardIosIcon sx={{ fontSize: 18 }} />
                    </IconButton>

                    {/* ── Main lightbox card: image left + details right ── */}
                    <motion.div
                        key={lightboxCurrent.id}
                        initial={{ opacity: 0, scale: 0.96 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.96 }}
                        transition={{ duration: 0.2 }}
                        onClick={e => e.stopPropagation()}
                        style={{
                            display: "flex",
                            flexDirection: isMobile ? "column" : "row",
                            width: isMobile ? "92vw" : "80vw",
                            maxWidth: "1200px",
                            maxHeight: isMobile ? "88vh" : "82vh",
                            borderRadius: "16px",
                            overflow: "hidden",
                            background: "#111",
                        }}
                    >
                        {/* LEFT — image */}
                        {lightboxCurrent.file_path && (
                            <div style={{
                                flex: isMobile ? "0 0 auto" : "0 0 60%",
                                width: isMobile ? "100%" : "60%",
                                maxHeight: isMobile ? "45vh" : "82vh",
                                background: "#000",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                overflow: "hidden",
                            }}>
                                <img
                                    src={`${API_BASE_URL}/uploads/Announcement/${lightboxCurrent.file_path}`}
                                    alt={lightboxCurrent.title}
                                    style={{
                                        width: "100%",
                                        height: "100%",
                                        objectFit: "contain",
                                        display: "block",
                                        userSelect: "none",
                                    }}
                                    draggable={false}
                                />
                            </div>
                        )}

                        {/* RIGHT — details */}
                        <div style={{
                            flex: 1,
                            display: "flex",
                            flexDirection: "column",
                            background: lightboxTheme.panel,
                            padding: isMobile ? "20px 16px" : "32px 28px",
                            overflowY: "auto",
                            scrollbarWidth: "thin",
                            scrollbarColor: "rgba(255,255,255,0.2) transparent",
                        }}>
                            {/* Title */}
                            <h2 style={{
                                margin: "0 0 4px",
                                color: "#fff",
                                fontSize: isMobile ? "16px" : "20px",
                                fontWeight: 700,
                                lineHeight: 1.4,
                            }}>
                                {lightboxCurrent.title}
                            </h2>

                            {/* Divider */}
                            <div style={{
                                width: "40px", height: "3px",
                                background: lightboxTheme.divider,
                                borderRadius: "2px",
                                margin: "10px 0 18px",
                            }} />

                            {/* Content */}
                            <div style={{ flex: 1 }}>
                                <FormattedContent text={lightboxCurrent.content} bulletColor={lightboxTheme.bullet} />
                            </div>

                            {/* Slide counter */}
                            {slides.length > 1 && (
                                <div style={{
                                    marginTop: "24px",
                                    display: "flex", alignItems: "center", gap: "6px",
                                }}>
                                    {slides.map((_, i) => (
                                        <div
                                            key={i}
                                            onClick={() => setLightboxIndex(i)}
                                            style={{
                                                width: i === lightboxIndex ? 18 : 6, height: 6,
                                                borderRadius: 3,
                                                background: i === lightboxIndex ? "#fff" : "rgba(255,255,255,0.3)",
                                                transition: "all 0.3s", cursor: "pointer",
                                            }}
                                        />
                                    ))}
                                    <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)", marginLeft: "4px" }}>
                                        {lightboxIndex + 1} / {slides.length}
                                    </span>
                                </div>
                            )}
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );

    /* ─────────────────────────────────────────
       STACKED LAYOUT (tablet / phone)
    ───────────────────────────────────────── */
    if (useStackLayout) {
        return (
            <>
                <div style={{ width: "100%", position: "relative" }}
                    onMouseEnter={() => setIsHovered(true)}
                    onMouseLeave={() => setIsHovered(false)}>
                    <div style={{
                        width: "100%",
                        background: "#111",
                        borderRadius: embedded ? "10px 10px 0 0" : "16px",
                        overflow: "hidden",
                        position: "relative",
                        aspectRatio: "16 / 9",
                    }}>
                        <AnimatePresence initial={false}>
                        <motion.div
                            key={current.id ?? index}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.35, ease: "easeInOut" }}
                            style={{ position: "absolute", inset: 0 }}
                        >
                        {hasImage ? (
                            <div
                                style={{ position: "relative", width: "100%", height: "100%", cursor: "zoom-in" }}
                                onClick={() => openLightbox()}
                            >
                                <img
                                    src={`${API_BASE_URL}/uploads/Announcement/${current.file_path}`}
                                    alt={current.title}
                                    style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", userSelect: "none" }}
                                    draggable={false}
                                />
                                <div style={{
                                    position: "absolute", top: 10, right: 10,
                                    background: "rgba(0,0,0,0.55)", borderRadius: "50%",
                                    padding: "6px", display: "flex", alignItems: "center", justifyContent: "center",
                                }}>
                                    <ZoomInIcon sx={{ color: "#fff", fontSize: 18 }} />
                                </div>
                            </div>
                        ) : (
                            <div style={{
                                width: "100%",
                                height: "100%",
                                background: theme.panel,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                padding: "16px",
                                boxSizing: "border-box",
                            }}>
                                <h3 style={{ margin: 0, color: "#fff", fontSize: "16px", textAlign: "center" }}>
                                    {current.title || "Announcement"}
                                </h3>
                            </div>
                        )}

                        </motion.div>
                        </AnimatePresence>

                        <IconButton onClick={e => { e.stopPropagation(); goPrev(); }}
                            sx={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", zIndex: 10, background: "rgba(0,0,0,0.7)", color: "#fff", width: 26, height: 26, "&:hover": { background: "rgba(0,0,0,0.9)" } }}>
                            <ArrowBackIosNewIcon sx={{ fontSize: 11 }} />
                        </IconButton>
                        <IconButton onClick={e => { e.stopPropagation(); goNext(); }}
                            sx={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", zIndex: 10, background: "rgba(0,0,0,0.7)", color: "#fff", width: 26, height: 26, "&:hover": { background: "rgba(0,0,0,0.9)" } }}>
                            <ArrowForwardIosIcon sx={{ fontSize: 11 }} />
                        </IconButton>
                    </div>

                    {slides.length > 1 && (
                        <div style={{ display: "flex", justifyContent: "center", gap: "8px", position: "absolute", bottom: 10, left: 0, right: 0 }}>
                            {slides.map((_, i) => (
                                <button
                                    key={i}
                                    type="button"
                                    aria-label={`Show announcement ${i + 1}`}
                                    aria-pressed={i === index}
                                    onClick={() => setIndex(i)}
                                    style={{
                                        width: i === index ? 18 : 8,
                                        height: 8,
                                        borderRadius: 4,
                                        border: "1px solid rgba(0,0,0,0.5)",
                                        padding: 0,
                                        background: i === index ? "#fff" : "#777",
                                        transition: "all 0.3s",
                                        cursor: "pointer",
                                    }}
                                />
                            ))}
                        </div>
                    )}
                </div>

                <LightboxModal />
            </>
        );
    }

    /* ─────────────────────────────────────────
       DESKTOP LAYOUT
    ───────────────────────────────────────── */
    return (
        <>
            <div
                className={alignCenter ? "registration-announcement" : undefined}
                style={{
                    ...desktopSize,
                    ...desktopOffset,
                    background: "#111", borderRadius: "10px",
                    overflow: "hidden", position: alignCenter ? "absolute" : "relative", display: "flex", flexDirection: "column",
                    flexShrink: 0,
                }}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
            >
                <IconButton onClick={goPrev}
                    sx={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", zIndex: 40, background: "rgba(0,0,0,0.7)", color: "#fff", width: 28, height: 28, "&:hover": { background: "rgba(0,0,0,0.9)" } }}>
                    <ArrowBackIosNewIcon sx={{ fontSize: 13 }} />
                </IconButton>
                <IconButton onClick={goNext}
                    sx={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", zIndex: 40, background: "rgba(0,0,0,0.7)", color: "#fff", width: 28, height: 28, "&:hover": { background: "rgba(0,0,0,0.9)" } }}>
                    <ArrowForwardIosIcon sx={{ fontSize: 13 }} />
                </IconButton>

                <div style={{ position: "absolute", inset: 0, overflow: "hidden", borderRadius: "inherit" }}>
                <AnimatePresence initial={false}>
                    <motion.div
                        key={current.id ?? index}
                        drag="x" dragDirectionLock
                        dragConstraints={{ left: 0, right: 0 }} dragElastic={0.02}
                        onDragStart={() => setIsDragging(true)}
                        onDragEnd={handleDragEnd}
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        transition={{ duration: 0.35, ease: "easeInOut" }}
                        style={{ width: "100%", height: "100%", display: "flex", flexDirection: "row", cursor: isDragging ? "grabbing" : "grab", position: "absolute", inset: 0, touchAction: "pan-y" }}
                    >
                        {/* Image pane */}
                        {hasImage && (
                            <motion.div
                                initial={false}
                                animate={{ flex: hasContent && contentOpen ? "0 0 55%" : "1 1 100%" }}
                                transition={{ duration: 0.4, ease: "easeInOut" }}
                                style={{ position: "relative", overflow: "hidden", background: "#000", flexShrink: 0 }}
                                onClick={() => !isDragging && openLightbox()}
                            >
                                <img
                                    src={`${API_BASE_URL}/uploads/Announcement/${current.file_path}`}
                                    alt={current.title}
                                    style={{ width: "100%", height: "100%", objectFit: "cover", userSelect: "none", pointerEvents: "none", display: "block" }}
                                    draggable={false}
                                />

                                <div style={{ position: "absolute", top: 10, right: 10, zIndex: 26, background: "rgba(0,0,0,0.55)", borderRadius: "50%", padding: "6px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                    <ZoomInIcon sx={{ color: "#fff", fontSize: 20 }} />
                                </div>

                                {(!hasContent || !contentOpen) && (
                                    <div style={{ position: "absolute", bottom: 0, width: "100%", padding: "1.2rem", background: "black", color: "#fff", pointerEvents: "none" }}>
                                        <h3 style={{ margin: 0, fontSize: "18px" }}>{current.title}</h3>
                                    </div>
                                )}

                                {hasContent && (
                                    <DetailToggleTab
                                        open={contentOpen}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setContentOpen((prev) => !prev);
                                        }}
                                        tabColor={theme.tab}
                                    />
                                )}
                            </motion.div>
                        )}

                        {/* Content pane */}
                        <AnimatePresence initial={false}>
                            {hasContent && contentOpen && (
                                <motion.div
                                    key="content-panel"
                                    initial={{ width: 0, opacity: 0 }} animate={{ width: "45%", opacity: 1 }} exit={{ width: 0, opacity: 0 }}
                                    transition={{ duration: 0.4, ease: "easeInOut" }}
                                    style={{
                                        position: "relative",
                                        flexShrink: 0,
                                        display: "flex",
                                        flexDirection: "column",
                                        background: theme.panel,
                                        overflow: "hidden",
                                    }}
                                >
                                    <div
                                        style={{
                                            flex: 1,
                                            minHeight: 0,
                                            display: "flex",
                                            flexDirection: "column",
                                            padding: "24px 20px 20px",
                                            overflowY: "auto",
                                            overflowX: "hidden",
                                            scrollbarWidth: "thin",
                                            scrollbarColor: "rgba(255,255,255,0.2) transparent",
                                        }}
                                    >
                                    <h3 style={{ margin: "0 0 4px", color: "#fff", fontSize: "15px", fontWeight: 700, lineHeight: 1.4, flexShrink: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                        {current.title}
                                    </h3>
                                    <div style={{ width: "36px", height: "3px", background: theme.divider, borderRadius: "2px", margin: "8px 0 14px", flexShrink: 0 }} />
                                    <div style={{ flex: 1, overflow: "visible" }}>
                                        <FormattedContent text={current.content} bulletColor={theme.bullet} />
                                    </div>
                                    {slides.length > 1 && (
                                        <div style={{ marginTop: "16px", display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
                                            {slides.map((_, i) => (
                                                <div key={i} onClick={e => { e.stopPropagation(); setIndex(i); }}
                                                    style={{ width: i === index ? 18 : 6, height: 6, borderRadius: 3, background: i === index ? "#fff" : "rgba(255,255,255,0.3)", transition: "all 0.3s", cursor: "pointer" }} />
                                            ))}
                                            <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)", marginLeft: "4px" }}>{index + 1} / {slides.length}</span>
                                        </div>
                                    )}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {hasImage && (!hasContent || !contentOpen) && slides.length > 1 && (
                            <div style={{ position: "absolute", bottom: 12, right: 16, display: "flex", gap: "6px", zIndex: 5 }}>
                                {slides.map((_, i) => (
                                    <div key={i} onClick={e => { e.stopPropagation(); setIndex(i); }}
                                        style={{ width: i === index ? 18 : 6, height: 6, borderRadius: 3, background: i === index ? "#fff" : "rgba(255,255,255,0.4)", transition: "all 0.3s", cursor: "pointer" }} />
                                ))}
                            </div>
                        )}
                    </motion.div>
                </AnimatePresence>
                </div>
            </div>

            <LightboxModal />
        </>
    );
};

export default AnnouncementSlider;
