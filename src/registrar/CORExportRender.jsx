import React from "react";
import { useSearchParams } from "react-router-dom";
import CertificateOfRegistration from "../components/CertificateOfRegistration";
import API_BASE_URL from "../apiConfig";

const COR_PDF_MARGIN = "0 0.25in";

const CORExportRender = () => {
  const [searchParams] = useSearchParams();
  const jobId = searchParams.get("job_id") || "";
  const initialStudentNumber = searchParams.get("student_number") || "";
  const initialPersonId = searchParams.get("person_id") || "";
  const fastMode = searchParams.get("fast") !== "0";

  const [studentNumber, setStudentNumber] = React.useState(initialStudentNumber);
  const [personId, setPersonId] = React.useState(initialPersonId);
  const [preload, setPreload] = React.useState(null);
  const [isPreloadReady, setIsPreloadReady] = React.useState(!jobId);
  const [renderKey, setRenderKey] = React.useState(0);
  const pageRef = React.useRef(null);
  const contentRef = React.useRef(null);
  const loadSeqRef = React.useRef(0);

  const markReady = React.useCallback(() => {
    window.__COR_READY = true;
    window.__COR_FIT_COMPLETE = true;
    window.__COR_FITS_A4 = true;
  }, []);

  const fitToA4Fast = React.useCallback(async () => {
    window.__COR_READY = false;
    window.__COR_FIT_COMPLETE = false;
    window.__COR_FITS_A4 = false;

    const page = pageRef.current;
    const content = contentRef.current;
    if (!page || !content) {
      markReady();
      return;
    }

    // Fast export fit: one uniform scale (no X/Y stretch).
    content.style.transform = "none";
    content.style.left = "0px";
    content.style.top = "0px";
    content.style.width = "calc((210mm + 6.5rem) * 44 / 42 + 3rem)";
    content.style.height = "auto";
    content.style.transformOrigin = "top left";

    content.querySelectorAll("table, .fee-table-con").forEach((el) => {
      el.style.width = "100%";
      el.style.maxWidth = "100%";
      el.style.marginLeft = "0";
      el.style.marginRight = "0";
    });

    await new Promise((resolve) => requestAnimationFrame(resolve));

    const pageRect = page.getBoundingClientRect();
    const pageStyle = window.getComputedStyle(page);
    const paddingLeft = parseFloat(pageStyle.paddingLeft) || 0;
    const paddingRight = parseFloat(pageStyle.paddingRight) || 0;
    const paddingTop = parseFloat(pageStyle.paddingTop) || 0;
    const paddingBottom = parseFloat(pageStyle.paddingBottom) || 0;
    const availableWidth = pageRect.width - paddingLeft - paddingRight - 4;
    const availableHeight = pageRect.height - paddingTop - paddingBottom - 4;
    const naturalWidth = Math.max(content.scrollWidth, content.offsetWidth, 1);
    const naturalHeight = Math.max(content.scrollHeight, content.offsetHeight, 1);
    const scale = Math.min(
      0.98,
      availableWidth / naturalWidth,
      availableHeight / naturalHeight,
    );

    content.style.transform = `scale(${scale})`;
    content.style.width = `${naturalWidth}px`;
    // Center inside the printable area instead of stretching.
    content.style.left = `${paddingLeft + Math.max(0, (availableWidth - naturalWidth * scale) / 2)}px`;
    content.style.top = `${paddingTop}px`;
    window.__COR_SCALE = scale;

    await new Promise((resolve) => requestAnimationFrame(resolve));
    markReady();
  }, [markReady]);

  const handleReady = React.useCallback(() => {
    if (fastMode) {
      fitToA4Fast();
      return;
    }
    fitToA4Fast();
  }, [fastMode, fitToA4Fast]);

  const applyStudentPayload = React.useCallback(async (payload = {}) => {
    const nextStudentNumber = String(payload.student_number || "").trim();
    const nextPersonId = payload.person_id ? String(payload.person_id) : "";
    const nextPreload = payload.preload || null;
    const seq = ++loadSeqRef.current;

    window.__COR_READY = false;
    window.__COR_FIT_COMPLETE = false;
    window.__COR_FITS_A4 = false;
    window.__COR_ENROLLED_READY = false;
    window.__COR_SCALE = 1;

    setIsPreloadReady(false);
    setStudentNumber(nextStudentNumber);
    setPersonId(nextPersonId);
    setPreload(nextPreload);
    setRenderKey((value) => value + 1);

    // Allow React to commit before marking preload ready.
    await new Promise((resolve) => requestAnimationFrame(resolve));
    if (seq !== loadSeqRef.current) return false;
    setIsPreloadReady(true);
    return true;
  }, []);

  React.useEffect(() => {
    window.__loadCorForExport = async (payload) => applyStudentPayload(payload);
    window.__COR_EXPORT_BOOTSTRAPPED = true;
    return () => {
      delete window.__loadCorForExport;
      delete window.__COR_EXPORT_BOOTSTRAPPED;
    };
  }, [applyStudentPayload]);

  React.useEffect(() => {
    window.__COR_READY = false;
    window.__COR_SCALE = 1;
    window.__COR_FITS_A4 = false;
    window.__COR_FIT_COMPLETE = false;

    // When Puppeteer drives loads via __loadCorForExport, skip URL preload fetch.
    if (!jobId || !initialStudentNumber) {
      setIsPreloadReady(true);
      return;
    }

    let isMounted = true;
    setIsPreloadReady(false);

    fetch(
      `${API_BASE_URL}/api/cor-export/jobs/${jobId}/preload/${encodeURIComponent(
        initialStudentNumber,
      )}`,
    )
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (isMounted) setPreload(data?.preload || null);
      })
      .catch(() => {
        if (isMounted) setPreload(null);
      })
      .finally(() => {
        if (isMounted) setIsPreloadReady(true);
      });

    return () => {
      isMounted = false;
    };
  }, [jobId, initialStudentNumber]);

  return (
    <div
      id="server-cor-export"
      ref={pageRef}
      style={{
        width: "210mm",
        height: "297mm",
        minHeight: "297mm",
        overflow: "hidden",
        background: "#ffffff",
        position: "relative",
        margin: 0,
        padding: COR_PDF_MARGIN,
        boxSizing: "border-box",
        "--cor-print-margin": "0mm",
      }}
    >
      <style>
        {`
          @page { size: A4; margin: 0; }
          html, body, #root {
            width: 210mm;
            height: 297mm;
            margin: 0 !important;
            padding: 0 !important;
            overflow: hidden !important;
            background: #fff !important;
          }
          #server-cor-export * {
            box-sizing: border-box;
          }
        `}
      </style>
      <div
        ref={contentRef}
        style={{
          width: "calc((210mm + 6.5rem) * 44 / 42 + 3rem)",
          transformOrigin: "top left",
          position: "absolute",
          top: 0,
          left: 0,
        }}
      >
        {isPreloadReady && studentNumber ? (
          <CertificateOfRegistration
            key={`${studentNumber}-${renderKey}`}
            student_number={studentNumber}
            person_id={personId}
            preload={preload}
            containerId="server-cor-export"
            onReady={handleReady}
            suppressNotifications
          />
        ) : null}
      </div>
    </div>
  );
};

export default CORExportRender;
