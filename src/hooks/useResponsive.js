import { useState, useEffect, useCallback } from "react";

/**
 * Breakpoints:
 *  - mobile:  <= 600px   (phones)
 *  - tablet:  601–1024px (tablets, small laptops, split-screen)
 *  - desktop: > 1024px
 *
 * Also exposes `isTouch` (coarse pointer) and `orientation`, since a tablet
 * in portrait vs. landscape often needs different treatment than a phone.
 */
const BREAKPOINTS = { mobile: 600, tablet: 1024 };

function computeDevice(width) {
  if (width <= BREAKPOINTS.mobile) return "mobile";
  if (width <= BREAKPOINTS.tablet) return "tablet";
  return "desktop";
}

function getSnapshot() {
  if (typeof window === "undefined") {
    return { width: 1280, device: "desktop", isTouch: false, orientation: "landscape" };
  }
  const width = window.innerWidth;
  const height = window.innerHeight;
  return {
    width,
    device: computeDevice(width),
    isTouch: window.matchMedia?.("(pointer: coarse)").matches ?? false,
    orientation: width >= height ? "landscape" : "portrait",
  };
}

export function useResponsive() {
  const [state, setState] = useState(getSnapshot);

  const handleChange = useCallback(() => {
    setState(getSnapshot());
  }, []);

  useEffect(() => {
    window.addEventListener("resize", handleChange);
    window.addEventListener("orientationchange", handleChange);
    return () => {
      window.removeEventListener("resize", handleChange);
      window.removeEventListener("orientationchange", handleChange);
    };
  }, [handleChange]);

  return {
    width: state.width,
    device: state.device,
    isMobile: state.device === "mobile",
    isTablet: state.device === "tablet",
    isDesktop: state.device === "desktop",
    // convenience flag for "small screen, needs the compact layout"
    isCompact: state.device !== "desktop",
    isTouch: state.isTouch,
    orientation: state.orientation,
  };
}

export default useResponsive;