import React, {
  useState,
  useEffect,
  useContext,
  useRef,
  useLayoutEffect,
} from "react";
import { SettingsContext } from "../App";
import axios from "axios";
import { Box, Container, useMediaQuery, useTheme } from "@mui/material";
import EaristLogo from "../assets/EaristLogo.png";
import ForwardIcon from "@mui/icons-material/Forward";
import { QRCodeSVG } from "qrcode.react";
import "../styles/Print.css";
import API_BASE_URL from "../apiConfig";

// Fixed print width (8.5in @ 96dpi). The permit is built at this fixed width
// so print/PDF output never changes; on small screens we scale it down
// visually via CSS transform instead of rewriting the table layout.
// Same approach and same constant as ExamAttendanceScanner.jsx.
const PERMIT_WIDTH_PX = 816;

// ✅ Accept personId as a prop
const ApplicantExamPermit = ({ personId, steps }) => {
  const settings = useContext(SettingsContext);
  const colors = settings?.colors || {};
  const branding = settings?.branding || {};
  const assets = settings?.assets || {};
  const headerColor = colors.header || "#1976d2";
  const theme = useTheme();

  // ---------------- Responsive breakpoints (same as ExamAttendanceScanner) ----------------
  const isMobile = useMediaQuery(theme.breakpoints.down("sm")); // <600px (phones)
  const isTablet = useMediaQuery(theme.breakpoints.down("md")); // <900px (phones + small tablets)

  const [titleColor, setTitleColor] = useState("#000000");
  const [subtitleColor, setSubtitleColor] = useState("#555555");
  const [borderColor, setBorderColor] = useState("#000000");
  const [mainButtonColor, setMainButtonColor] = useState("#1976d2");
  const [subButtonColor, setSubButtonColor] = useState("#ffffff");
  const [stepperColor, setStepperColor] = useState("#000000");

  const [fetchedLogo, setFetchedLogo] = useState(null);
  const [companyName, setCompanyName] = useState("");
  const [shortTerm, setShortTerm] = useState("");
  const [campusAddress, setCampusAddress] = useState("");
  const [branches, setBranches] = useState([]);

  useEffect(() => {
    if (!settings) return;

    // 🎨 Colors
    if (colors.title) setTitleColor(colors.title);
    if (colors.subtitle) setSubtitleColor(colors.subtitle);
    if (colors.border) setBorderColor(colors.border);
    if (colors.mainButton)
      setMainButtonColor(colors.mainButton);
    if (colors.subButton) setSubButtonColor(colors.subButton);
    if (colors.stepper) setStepperColor(colors.stepper);

    // 🏫 Logo
    if (assets.logoUrl) {
      setFetchedLogo(`${assets.logoUrl}`);
    } else {
      setFetchedLogo(EaristLogo);
    }

    // 🏷️ School Info
    if (branding.companyName) setCompanyName(branding.companyName);
    if (branding.shortTerm) setShortTerm(branding.shortTerm);
    if (branding.campusAddress) setCampusAddress(branding.campusAddress);

    // ✅ Branches (JSON stored in DB)
    setBranches(settings?.branches || []);
  }, [settings]);

  const words = companyName.trim().split(" ");
  const middle = Math.ceil(words.length / 2);
  const firstLine = words.slice(0, middle).join(" ");
  const secondLine = words.slice(middle).join(" ");

  const [person, setPerson] = useState({
    campus: "",
    profile_img: "",
    last_name: "",
    first_name: "",
    middle_name: "",
    extension: "",
  });

  useEffect(() => {
    if (settings && branding.campusAddress) {
      setCampusAddress(branding.campusAddress);
    }
  }, [settings]);

  const [examSchedule, setExamSchedule] = useState(null);
  const [curriculumOptions, setCurriculumOptions] = useState([]);
  const [examScores, setExamScores] = useState({
    english: null,
    science: null,
    filipino: null,
    math: null,
    abstract: null,
    final: null,
    status: null,
  });

  const [scheduledBy, setScheduledBy] = useState("");

  // ✅ First data fetch
  useEffect(() => {
    const pid = personId || localStorage.getItem("person_id");
    if (!pid) return;

    const fetchData = async () => {
      try {
        // Fetch person
        const res = await axios.get(`${API_BASE_URL}/api/person/${pid}`, { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` } });
        let personData = res.data;

        // Fetch applicant number separately
        const applicantRes = await axios.get(
          `${API_BASE_URL}/api/applicant_number/${pid}`, { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` } },
        );
        if (applicantRes.data?.applicant_number) {
          personData.applicant_number = applicantRes.data.applicant_number;
        }

        setPerson(personData);

        if (applicantRes.data?.applicant_number) {
          const applicant_number = applicantRes.data.applicant_number;

          // ✅ Use new unified verification route
          const verifyStatusRes = await axios.get(
            `${API_BASE_URL}/api/verification-status/${applicant_number}`, { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` } },
          );

          const { verified, totalRequired, totalVerified, hasSchedule } =
            verifyStatusRes.data;

          // ✅ FIX: if applicant has schedule, treat as verified
          setIsVerified(verified || hasSchedule);

          if (!verified) {
            console.warn(
              `Applicant not verified. Verified ${totalVerified}/${totalRequired} requirements. Schedule: ${hasSchedule ? "Yes" : "No"}`,
            );
          }

          // Always load exam schedule (for display)
          const schedRes = await axios.get(
            `${API_BASE_URL}/api/exam-schedule/${applicant_number}`, { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` } },
          );
          setExamSchedule(schedRes.data);
        }

        // Fetch programs
        const progRes = await axios.get(`${API_BASE_URL}/api/applied_program`, { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` } });
        setCurriculumOptions(progRes.data);

        // ✅ Fetch registrar (Scheduled By)
        const registrarRes = await axios.get(
          `${API_BASE_URL}/api/scheduled-by/registrar`, { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` } },
        );
        if (registrarRes.data?.fullName) {
          setScheduledBy(registrarRes.data.fullName);
        }
      } catch (err) {
        console.error("Error fetching exam permit data:", err);
      }
    };

    fetchData();
  }, [personId]);

  // ✅ Secondary fetch for updates
  useEffect(() => {
    const pid = personId || localStorage.getItem("person_id");
    if (!pid) return;

    // fetch person
    axios
      .get(`${API_BASE_URL}/api/person/${pid}`, { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` } })
      .then(async (res) => {
        let personData = res.data;

        // fetch applicant_number separately
        const applicantRes = await axios.get(
          `${API_BASE_URL}/api/applicant_number/${pid}`, { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` } },
        );
        if (applicantRes.data?.applicant_number) {
          personData.applicant_number = applicantRes.data.applicant_number;
        }

        setPerson(personData);
      })
      .catch((err) => console.error(err));

    // fetch applicant number then schedule
    axios
      .get(`${API_BASE_URL}/api/applicant_number/${pid}`, { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` } })
      .then((res) => {
        const applicant_number = res.data?.applicant_number;
        if (applicant_number) {
          return axios.get(
            `${API_BASE_URL}/api/exam-schedule/${applicant_number}`, { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` } },
          );
        }
      })
      .then((res) => setExamSchedule(res?.data))
      .catch((err) => console.error(err));

    // fetch curriculum/programs
    axios
      .get(`${API_BASE_URL}/api/applied_program`, { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` } })
      .then((res) => setCurriculumOptions(res.data))
      .catch((err) => console.error(err));

    // ✅ Fetch registrar name again for refresh
    axios
      .get(`${API_BASE_URL}/api/scheduled-by/registrar`, { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` } })
      .then((res) => {
        if (res.data?.fullName) setScheduledBy(res.data.fullName);
      })
      .catch((err) => console.error("Error fetching registrar name:", err));
  }, [personId]);

  const [qualifyingResult, setQualifyingResult] = useState(null);
  const [interviewResult, setInterviewResult] = useState(null);
  const [totalAverage, setTotalAverage] = useState(null);

  // ✅ Fetch Exam Scores + Qualifying + Interview + Total Ave.
  useEffect(() => {
    const fetchScores = async () => {
      try {
        const applicantNumberRes = await axios.get(
          `${API_BASE_URL}/api/applicant_number/${personId}`, { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` } },
        );
        const applicantNumber = applicantNumberRes.data?.applicant_number;

        // 2️⃣ Entrance exam scores (already working)
        const res = await axios.get(
          `${API_BASE_URL}/api/applicants-with-number`, { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` } },
        );
        const applicants = Array.isArray(res.data)
          ? res.data
          : res.data?.data || [];
        const applicant = applicants.find(
          (a) => a.applicant_number === applicantNumber,
        );

        if (applicant) {
          const scores = applicant.scores || {};
          const scoreValues = Object.values(scores).map(Number);
          const english = Number(applicant.english ?? scoreValues[0]) || 0;
          const science = Number(applicant.science ?? scoreValues[1]) || 0;
          const filipino = Number(applicant.filipino ?? scoreValues[2]) || 0;
          const math = Number(applicant.math ?? scoreValues[3]) || 0;
          const abstract = Number(applicant.abstract ?? scoreValues[4]) || 0;
          const finalRating = applicant.final_rating
            ? Number(applicant.final_rating)
            : (english + science + filipino + math + abstract) / 5;

          setExamScores({
            english,
            science,
            filipino,
            math,
            abstract,
            final: finalRating.toFixed(2),
            status: applicant.exam_status ?? applicant.status ?? "N/A",
          });
        }

        // 3️⃣ Get Qualifying / Interview / Total Ave from person_status_table
        const statusRes = await axios.get(
          `${API_BASE_URL}/api/person_status/${personId}`, { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` } },
        );
        const data = statusRes.data;

        if (data) {
          setQualifyingResult(data.qualifying_result ?? null);
          setInterviewResult(data.interview_result ?? null);
          setTotalAverage(data.exam_result ?? null);
        }
      } catch (err) {
        console.error("❌ Failed to fetch applicant scores:", err);
      }
    };

    if (personId) fetchScores();
  }, [personId]);

  const [isVerified, setIsVerified] = useState(false);

  const renderStepStatus = (status) => {
    if (!status) return null;

    const label = String(status).toUpperCase();
    const color = label === "FAILED" ? "red" : "green";

    return <span style={{ color, fontWeight: "bold" }}>{label}</span>;
  };

  const renderCollegeApprovalStatus = (status) => {
    if (!status) return null;

    const label = String(status).toUpperCase();
    let color = "orange";

    if (label === "ACCEPTED") color = "green";
    else if (label === "REJECTED") color = "red";

    return <span style={{ color, fontWeight: "bold" }}>{label}</span>;
  };

  // ---------------- Mobile scaling for the printable permit ----------------
  // Same pattern as ExamAttendanceScanner.jsx: fixed-width content measured
  // internally (own ref — no longer dependent on a printRef prop from the
  // parent), scaled down via CSS transform to fit small screens, with the
  // wrapper height compensated so no blank space is left below the shrunk
  // content. Scale/height are rounded to avoid ResizeObserver feedback loops.
  const scaleWrapperRef = useRef(null);
  const contentRef = useRef(null);
  const [permitScale, setPermitScale] = useState(1);
  const [scaledHeight, setScaledHeight] = useState(null);

  useLayoutEffect(() => {
    let rafId = null;

    const computeScale = () => {
      const wrapper = scaleWrapperRef.current;
      const content = contentRef.current;
      if (!wrapper || !content) return;

      const available = wrapper.clientWidth;
      const rawScale =
        available > 0 && available < PERMIT_WIDTH_PX
          ? available / PERMIT_WIDTH_PX
          : 1;

      // Round to 2 decimal places so tiny sub-pixel differences don't
      // count as "changed" and re-trigger the observer forever.
      const nextScale = Math.round(rawScale * 100) / 100;
      const nextHeight = Math.round(content.scrollHeight * nextScale);

      setPermitScale((prev) => (prev === nextScale ? prev : nextScale));
      setScaledHeight((prev) => (prev === nextHeight ? prev : nextHeight));
    };

    const scheduleCompute = () => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(computeScale);
    };

    computeScale();

    window.addEventListener("resize", scheduleCompute);
    window.addEventListener("orientationchange", scheduleCompute);

    const ro =
      typeof ResizeObserver !== "undefined" && contentRef.current
        ? new ResizeObserver(scheduleCompute)
        : null;
    if (ro && contentRef.current) ro.observe(contentRef.current);

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      window.removeEventListener("resize", scheduleCompute);
      window.removeEventListener("orientationchange", scheduleCompute);
      if (ro) ro.disconnect();
    };
  }, [
    person,
    examSchedule,
    curriculumOptions,
    steps,
    qualifyingResult,
    interviewResult,
    totalAverage,
    isVerified,
  ]);

  if (!person) return <div>Loading Exam Permit...</div>;

  return (
    <Box
      sx={{
        backgroundColor: "transparent",
        mt: 1,
        p: isMobile ? 1.5 : 2,
      }}
    >
      {/* Scale wrapper: measures available width, shrinks the fixed-width
                permit to fit, and reserves the correct (shrunk) height so no
                blank space is left below it. Resets fully for print. */}
      <Box
        ref={scaleWrapperRef}
        className="exam-permit-scale-wrapper"
        sx={{
          width: "100%",
          maxWidth: `${PERMIT_WIDTH_PX}px`,
          margin: "10px auto 0",

          height: scaledHeight ? `${scaledHeight}px` : "auto",
        }}
      >
        <div
          ref={contentRef}
          className="exam-permit-container"
          style={{
            width: `${PERMIT_WIDTH_PX}px`,
            backgroundColor: "white",
            boxSizing: "border-box",
            transform: `scale(${permitScale})`,
            transformOrigin: "top left",
          }}
        >
          <style>{`
                        @media print {
                            .exam-permit-scale-wrapper {
                                height: auto !important;
                                max-width: none !important;
                                overflow: visible !important;
                            }
                            .exam-permit-container {
                                transform: none !important;
                                width: auto !important;
                            }
                        }
                    `}</style>

          <Container>
            <div
              className="student-table"
              style={{
                width: "8in", // matches table width assuming 8in for 40 columns
                maxWidth: "100%",
                margin: "0 auto",

                boxSizing: "border-box",
                padding: "10px 0",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between", // spread logo, text, profile+QR
                  flexWrap: "nowrap",
                }}
              >
                {/* Logo (Left Side) */}
                <div style={{ flexShrink: 0 }}>
                  <img
                    src={fetchedLogo}
                    alt="School Logo"
                    style={{
                      width: "120px",
                      height: "120px",
                      objectFit: "cover",
                      marginLeft: "10px",
                      marginTop: "-25px",
                      borderRadius: "50%", // ✅ Makes it perfectly circular
                    }}
                  />
                </div>

                {/* Text Block (Center) */}
                <div
                  style={{
                    flexGrow: 1,
                    textAlign: "center",
                    fontSize: "12px",
                    fontFamily: "Arial",
                    letterSpacing: "5",
                    lineHeight: 1.4,
                    paddingTop: 0,
                    paddingBottom: 0,
                  }}
                >
                  <div style={{ fontSize: "13px", fontFamily: "Arial" }}>
                    Republic of the Philippines
                  </div>
                  <div
                    style={{
                      fontWeight: "bold",
                      fontFamily: "Arial",
                      fontSize: "14px",
                      textTransform: "Uppercase",
                    }}
                  >
                    {firstLine}
                  </div>
                  {secondLine && (
                    <div
                      style={{
                        fontWeight: "bold",
                        fontFamily: "Arial",
                        fontSize: "14px",
                        textTransform: "Uppercase",
                      }}
                    >
                      {secondLine}
                    </div>
                  )}
                  {campusAddress && (
                    <div
                      style={{
                        fontSize: "13px",
                        fontFamily: "Arial",
                      }}
                    >
                      {campusAddress}
                    </div>
                  )}

                  <div style={{ fontSize: "13px", fontFamily: "Arial" }}>
                    <b>OFFICE OF THE ADMISSION SERVICES</b>
                  </div>

                  <br />

                  <div
                    style={{
                      fontSize: "13px",
                      fontFamily: "Arial",
                      fontWeight: "bold",
                      marginBottom: "5px",
                      marginTop: "0",
                      textAlign: "center",
                    }}
                  >
                    Admission Form (Process)
                  </div>
                </div>

                {/* Profile + QR Code (Right Side) */}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "row", // ✅ side by side
                    alignItems: "center",
                    marginRight: "10px",
                    gap: "10px", // ✅ 10px space between them
                  }}
                >
                  <div
                    style={{
                      width: "1.3in",
                      height: "1.3in",
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      border: "1px solid black", // ✅ same border as profile_img
                      background: "#fff", // ✅ same background
                      flexShrink: 0,
                      position: "relative", // ✅ needed for overlay text
                    }}
                  >
                    {person?.qr_code ? (
                      <img
                        src={`${API_BASE_URL}/uploads/${person.qr_code}`}
                        alt="QR Code"
                        style={{ width: "110px", height: "110px" }}
                      />
                    ) : (
                      <QRCodeSVG
                        value={`${window.location.origin}/applicant_profile/${person.applicant_number}`}
                        size={110}
                        level="H"
                      />
                    )}

                    {/* Overlay applicant_number in middle */}
                    <div
                      style={{
                        position: "absolute",
                        fontSize: "10px",
                        fontWeight: "bold",
                        color: "maroon",
                        background: "white",
                        padding: "2px",
                      }}
                    >
                      {person.applicant_number}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Container>
          <br />
          <br />
          <table
            style={{
              borderCollapse: "collapse",
              fontFamily: "Arial",
              width: "8in",
              margin: "0 auto",

              marginTop: "-30px",
              textAlign: "center",
              tableLayout: "fixed",
            }}
          >
            <tbody>
              {/* Name of Student Row */}
              <tr>
                <td
                  colSpan={40}
                  style={{
                    fontSize: "12px",
                    paddingTop: "5px",
                    marginTop: 0,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      width: "100%",
                    }}
                  >
                    <span
                      style={{
                        fontWeight: "bold",
                        whiteSpace: "nowrap",
                        marginRight: "10px",
                      }}
                    >
                      Name of Student:
                    </span>
                    <div
                      style={{
                        flexGrow: 1,
                        display: "flex",
                        justifyContent: "space-between",
                      }}
                    >
                      <span
                        style={{
                          width: "25%",
                          textAlign: "center",
                          fontSize: "14.5px",
                          borderBottom: "1px solid black",
                        }}
                      >
                        {person.last_name}
                      </span>
                      <span
                        style={{
                          width: "25%",
                          textAlign: "center",
                          fontSize: "14.5px",
                          borderBottom: "1px solid black",
                        }}
                      >
                        {person.first_name}
                      </span>
                      <span
                        style={{
                          width: "25%",
                          textAlign: "center",
                          fontSize: "14.5px",
                          borderBottom: "1px solid black",
                        }}
                      >
                        {person.middle_name}
                      </span>
                      <span
                        style={{
                          width: "25%",
                          textAlign: "center",
                          fontSize: "14.5px",
                          borderBottom: "1px solid black",
                        }}
                      >
                        {person.extension}
                      </span>
                    </div>
                  </div>
                </td>
              </tr>

              {/* Labels Row */}
              <tr>
                <td
                  colSpan={40}
                  style={{
                    fontSize: "12px",
                    paddingTop: "2px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginLeft: "120px",
                      marginTop: "-4px",
                    }}
                  >
                    <span style={{ width: "25%", textAlign: "center" }}>
                      Last Name
                    </span>
                    <span style={{ width: "25%", textAlign: "center" }}>
                      Given Name
                    </span>
                    <span style={{ width: "25%", textAlign: "center" }}>
                      Middle Name
                    </span>
                    <span style={{ width: "25%", textAlign: "center" }}>
                      Ext. Name
                    </span>
                  </div>
                </td>
              </tr>

              {/* Email & Applicant ID */}
              <tr style={{ fontSize: "13px" }}>
                <td colSpan={20}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      width: "100%",
                    }}
                  >
                    <label
                      style={{
                        fontWeight: "bold",
                        whiteSpace: "nowrap",
                        marginRight: "10px",
                      }}
                    >
                      Email:
                    </label>
                    <span
                      style={{
                        flexGrow: 1,
                        borderBottom: "1px solid black",
                        height: "1.3em",
                        fontSize: "12px",
                      }}
                    >
                      <div style={{ marginTop: "-3px" }} className="dataField">
                        {person.emailAddress}
                      </div>
                    </span>
                  </div>
                </td>
                <td colSpan={20}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      width: "100%",
                    }}
                  >
                    <label
                      style={{
                        fontWeight: "bold",
                        whiteSpace: "nowrap",
                        marginRight: "10px",
                      }}
                    >
                      Applicant Id No.:
                    </label>
                    <span
                      style={{
                        flexGrow: 1,
                        borderBottom: "1px solid black",
                        height: "1.3em",
                        fontSize: "12px",
                      }}
                    >
                      <div style={{ marginTop: "-3px" }} className="dataField">
                        {person.emailAddress}
                      </div>
                    </span>
                  </div>
                </td>
              </tr>

              {/* Permanent Address */}
              <tr style={{ fontSize: "13px" }}>
                <td colSpan={40}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      width: "100%",
                      marginTop: "2px",
                    }}
                  >
                    <label
                      style={{
                        fontWeight: "bold",
                        whiteSpace: "nowrap",
                        marginRight: "10px",
                      }}
                    >
                      Permanent Address:
                    </label>
                    <span
                      style={{
                        flexGrow: 1,
                        borderBottom: "1px solid black",
                        height: "1.3em",
                        fontSize: "12px",
                      }}
                    >
                      <div style={{ marginTop: "-3px" }} className="dataField">
                        {person.permanentStreet} {person.permanentBarangay}{" "}
                        {person.permanentMunicipality} {person.permanentRegion}{" "}
                        {person.permanentZipCode}
                      </div>
                    </span>
                  </div>
                </td>
              </tr>

              {/* Cellphone No, Civil Status, Gender */}
              <tr style={{ fontSize: "13px" }}>
                <td colSpan={13}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      width: "100%",
                    }}
                  >
                    <label
                      style={{
                        fontWeight: "bold",
                        whiteSpace: "nowrap",
                        marginRight: "10px",
                      }}
                    >
                      Cellphone No:
                    </label>
                    <span
                      style={{
                        flexGrow: 1,
                        borderBottom: "1px solid black",
                        height: "1.3em",
                        fontSize: "12px",
                      }}
                    >
                      <div style={{ marginTop: "-3px" }} className="dataField">
                        {person.cellphoneNumber}
                      </div>
                    </span>
                  </div>
                </td>
                <td colSpan={13}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      width: "100%",
                    }}
                  >
                    <label
                      style={{
                        fontWeight: "bold",
                        whiteSpace: "nowrap",
                        marginRight: "10px",
                      }}
                    >
                      Civil Status:
                    </label>
                    <span
                      style={{
                        flexGrow: 1,
                        borderBottom: "1px solid black",
                        height: "1.3em",
                        fontSize: "12px",
                      }}
                    >
                      <div style={{ marginTop: "-3px" }} className="dataField">
                        {person.civilStatus}
                      </div>
                    </span>
                  </div>
                </td>
                <td colSpan={14}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      width: "100%",
                    }}
                  >
                    <label
                      style={{
                        fontWeight: "bold",
                        whiteSpace: "nowrap",
                        marginRight: "10px",
                      }}
                    >
                      Gender:
                    </label>
                    <span
                      style={{
                        flexGrow: 1,
                        borderBottom: "1px solid black",
                        height: "1.3em",
                        fontSize: "12px",
                      }}
                    >
                      <div style={{ marginTop: "-3px" }} className="dataField">
                        {" "}
                        {person.gender === 0
                          ? "Male"
                          : person.gender === 1
                            ? "Female"
                            : ""}
                      </div>
                    </span>
                  </div>
                </td>
              </tr>

              {/* Date of Birth, Place of Birth, Age */}
              <tr style={{ fontSize: "13px" }}>
                <td colSpan={13}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      width: "100%",
                    }}
                  >
                    <label
                      style={{
                        fontWeight: "bold",
                        whiteSpace: "nowrap",
                        marginRight: "10px",
                      }}
                    >
                      Date of Birth:
                    </label>
                    <span
                      style={{
                        flexGrow: 1,
                        borderBottom: "1px solid black",
                        height: "1.3em",
                        fontSize: "12px",
                      }}
                    >
                      <div style={{ marginTop: "-3px" }} className="dataField">
                        {person.birthOfDate}
                      </div>
                    </span>
                  </div>
                </td>
                <td colSpan={14}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      width: "100%",
                    }}
                  >
                    <label
                      style={{
                        fontWeight: "bold",
                        whiteSpace: "nowrap",
                        marginRight: "10px",
                      }}
                    >
                      Place of Birth:
                    </label>
                    <span
                      style={{
                        flexGrow: 1,
                        borderBottom: "1px solid black",
                        height: "1.3em",
                        fontSize: "12px",
                      }}
                    >
                      <div style={{ marginTop: "-3px" }} className="dataField">
                        {person.birthPlace}
                      </div>
                    </span>
                  </div>
                </td>
                <td colSpan={13}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      width: "100%",
                    }}
                  >
                    <label
                      style={{
                        fontWeight: "bold",
                        whiteSpace: "nowrap",
                        marginRight: "10px",
                      }}
                    >
                      Age:
                    </label>
                    <span
                      style={{
                        flexGrow: 1,
                        borderBottom: "1px solid black",
                        height: "1.3em",
                        fontSize: "12px",
                      }}
                    >
                      <div style={{ marginTop: "-3px" }} className="dataField">
                        {person.age}
                      </div>
                    </span>
                  </div>
                </td>
              </tr>

              <tr style={{ fontSize: "13px" }}>
                {/* Please Check */}
                <td colSpan={10}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      width: "100%",
                    }}
                  >
                    <label
                      style={{
                        fontWeight: "bold",
                        whiteSpace: "nowrap",
                        marginRight: "10px",
                      }}
                    >
                      Please Check (✓):
                    </label>
                    <span
                      style={{
                        flexGrow: 1,
                        borderBottom: "1px solid black",
                        height: "1.3em",
                        display: "inline-block",
                      }}
                    >
                      {/* left blank intentionally */}
                    </span>
                  </div>
                </td>

                {/* Freshman */}
                <td colSpan={10}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      width: "100%",
                    }}
                  >
                    <label
                      style={{
                        fontWeight: "bold",
                        whiteSpace: "nowrap",
                        marginRight: "10px",
                      }}
                    >
                      Freshman:
                    </label>
                    <span
                      style={{
                        flexGrow: 1,
                        borderBottom: "1px solid black",
                        height: "1.3em",
                        textAlign: "center",
                        display: "inline-block",
                        fontSize: "12px",
                        fontWeight: "bold",
                      }}
                    >
                      <div style={{ marginTop: "-3px" }} className="dataField">
                        {person.classifiedAs === "Freshman (First Year)"
                          ? "✓"
                          : ""}
                      </div>
                    </span>
                  </div>
                </td>

                {/* Transferee */}
                <td colSpan={10}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      width: "100%",
                    }}
                  >
                    <label
                      style={{
                        fontWeight: "bold",
                        whiteSpace: "nowrap",
                        marginRight: "10px",
                      }}
                    >
                      Transferee:
                    </label>
                    <span
                      style={{
                        flexGrow: 1,
                        borderBottom: "1px solid black",
                        height: "1.3em",
                        textAlign: "center",
                        display: "inline-block",
                        fontSize: "12px",
                        fontWeight: "bold",
                      }}
                    >
                      <div style={{ marginTop: "-3px" }} className="dataField">
                        {["Transferee", "Returnee", "Shiftee"].includes(
                          person.classifiedAs,
                        )
                          ? "✓"
                          : ""}
                      </div>
                    </span>
                  </div>
                </td>

                {/* Others */}
                <td colSpan={10}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      width: "100%",
                    }}
                  >
                    <label
                      style={{
                        fontWeight: "bold",
                        whiteSpace: "nowrap",
                        marginRight: "10px",
                      }}
                    >
                      Others:
                    </label>
                    <span
                      style={{
                        flexGrow: 1,
                        borderBottom: "1px solid black",
                        height: "1.3em",
                        textAlign: "center",
                        display: "inline-block",
                        fontSize: "12px",
                        fontWeight: "bold",
                      }}
                    >
                      <div style={{ marginTop: "-3px" }} className="dataField">
                        {person.classifiedAs === "Foreign Student" ? "✓" : ""}
                      </div>
                    </span>
                  </div>
                </td>
              </tr>

              {/* Last School Attended */}
              <tr style={{ fontSize: "13px" }}>
                <td colSpan={40}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      width: "100%",
                    }}
                  >
                    <label
                      style={{
                        fontWeight: "bold",
                        whiteSpace: "nowrap",
                        marginRight: "10px",
                      }}
                    >
                      Last School Attended:
                    </label>
                    <span
                      style={{
                        flexGrow: 1,
                        borderBottom: "1px solid black",
                        height: "1.3em",
                        fontSize: "12px",
                      }}
                    >
                      <div style={{ marginTop: "-3px" }} className="dataField">
                        {person.schoolLastAttended1}
                      </div>
                    </span>
                  </div>
                </td>
              </tr>

              {/* Degree/Program & Major */}
              <tr style={{ fontSize: "13px" }}>
                <td colSpan={25} style={{ verticalAlign: "top" }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      width: "100%",
                    }}
                  >
                    <label
                      style={{
                        fontWeight: "bold",
                        whiteSpace: "nowrap",
                        marginRight: "10px",
                      }}
                    >
                      DEGREE/PROGRAM APPLIED:
                    </label>
                    <div
                      style={{
                        flexGrow: 1,
                        borderBottom: "1px solid black",
                        minHeight: "1.2em",
                        whiteSpace: "normal", // allow text wrapping
                        wordWrap: "break-word", // break long words
                        lineHeight: "1.4em",
                        paddingBottom: "2px",
                      }}
                    >
                      {curriculumOptions.length > 0
                        ? curriculumOptions.find(
                            (item) =>
                              item?.curriculum_id?.toString() ===
                              (person?.program ?? "").toString(),
                          )?.program_description ||
                          (person?.program ?? "")
                        : "Loading..."}
                    </div>
                  </div>
                </td>

                <td colSpan={15} style={{ verticalAlign: "top" }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      width: "100%",
                    }}
                  >
                    <label
                      style={{
                        fontWeight: "bold",
                        whiteSpace: "nowrap",
                        marginRight: "10px",
                      }}
                    >
                      MAJOR:
                    </label>
                    <div
                      style={{
                        flexGrow: 1,
                        borderBottom: "1px solid black",
                        minHeight: "1.2em",
                        whiteSpace: "normal",
                        wordWrap: "break-word",
                        lineHeight: "1.4em",
                        paddingBottom: "2px",
                      }}
                    >
                      {curriculumOptions.length > 0
                        ? curriculumOptions.find(
                            (item) =>
                              item?.curriculum_id?.toString() ===
                              (person?.program ?? "").toString(),
                          )?.major || ""
                        : "Loading..."}
                    </div>
                  </div>
                </td>
              </tr>

              <tr>
                <td colSpan="40" style={{ height: "0.5px" }}></td>
              </tr>

              <tr>
                <td
                  colSpan={40}
                  style={{
                    height: "0.2in",
                    fontSize: "72.5%",
                    color: "white", // This is just a fallback; overridden below
                  }}
                >
                  <div
                    style={{
                      color: "black",

                      fontSize: "12px",
                      textAlign: "left",
                      display: "block",
                    }}
                  >
                    <b>{"\u00A0\u00A0"}APPLICATION PROCEDURE:</b>
                    {
                      "\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0"
                    }
                    For Enrollment Officer: Please sign and put Remarks box if
                    they done
                  </div>
                </td>
              </tr>

              <tr>
                <td
                  colSpan={15}
                  style={{
                    border: "1px solid black",
                    textAlign: "left",
                    padding: "8px",
                    fontSize: "12px",
                  }}
                >
                  <b> Guidance Office</b> (as per Schedule)
                  <br />
                  <b> Step 1:</b> ECAT Examination
                </td>
                <td
                  colSpan={5}
                  style={{
                    height: "50px",
                    textAlign: "center",
                    verticalAlign: "middle",
                  }}
                ></td>

                <td
                  colSpan={16}
                  style={{
                    fontSize: "12px",
                    fontFamily: "Arial",
                    border: "1px solid black",
                    padding: "8px",
                    textAlign: "left",
                  }}
                >
                  {" "}
                  <b>College Dean's Office</b>
                  <br />
                  <b>Step 2: </b>College Interview, Qualifying / Aptitude Test
                  and College Approval
                </td>
                <td
                  colSpan={5}
                  style={{
                    textAlign: "center",
                    verticalAlign: "middle",
                    height: "35px",
                  }}
                ></td>
              </tr>
              <tr>
                <td
                  colSpan={15}
                  style={{
                    border: "1px solid black",
                    textAlign: "center",
                    padding: "8px",
                    fontSize: "18px",
                  }}
                >
                  {steps.step1 && renderStepStatus(steps.step1Status)}
                </td>
                <td
                  colSpan={5}
                  style={{
                    textAlign: "center",
                    verticalAlign: "middle",
                    height: "50px",
                  }}
                >
                  <ForwardIcon
                    sx={{
                      marginTop: "-53px",
                      fontSize: 70, // normal screen size
                      "@media print": {
                        fontSize: 14, // smaller print size
                        margin: 0,
                      },
                    }}
                  />
                </td>
                <td
                  colSpan={5}
                  style={{
                    border: "1px solid black",
                    textAlign: "center",
                    padding: "8px",
                    fontSize: "12px",
                  }}
                ></td>
                <td
                  colSpan={6}
                  style={{
                    border: "1px solid black",
                    textAlign: "center",
                    padding: "8px",
                    fontSize: "18px",
                  }}
                >
                  {steps.qualifyingDone &&
                    renderStepStatus(steps.qualifyingStatus)}
                </td>
                <td
                  colSpan={5}
                  style={{
                    border: "1px solid black",
                    textAlign: "center",
                    padding: "8px",
                    fontSize: "18px",
                  }}
                >
                  {steps.interviewDone &&
                    renderStepStatus(steps.interviewStatus)}
                </td>
                <td
                  colSpan={5}
                  style={{
                    textAlign: "center",
                    verticalAlign: "middle",
                  }}
                >
                  <ForwardIcon
                    sx={{
                      marginTop: "-53px",
                      fontSize: 70, // normal screen size
                      "@media print": {
                        fontSize: 14, // smaller print size
                        margin: 0,
                      },
                    }}
                  />
                </td>
              </tr>

              <tr>
                <td colSpan="40" style={{ height: "20px" }}></td>
              </tr>

              <tr>
                <td
                  colSpan={10}
                  style={{
                    border: "1px solid black",
                    textAlign: "left",
                    padding: "8px",
                    fontSize: "12px",
                  }}
                >
                  <b> Medical and Dental Service Office</b>
                  <br /> <b>Step 3:</b> Medical Examination
                </td>
                <td
                  colSpan={5}
                  style={{
                    textAlign: "center",
                    verticalAlign: "middle",
                  }}
                ></td>

                <td
                  colSpan={11}
                  style={{
                    fontSize: "12px",
                    fontFamily: "Arial",
                    border: "1px solid black",
                    padding: "8px",
                    textAlign: "left",
                  }}
                >
                  {" "}
                  <b>Registrar's Office</b>
                  <br />
                  <b>Step 4:</b> Submission of Original Cridentials
                </td>
                <td
                  colSpan={5}
                  style={{
                    textAlign: "center",
                    verticalAlign: "middle",
                  }}
                ></td>
                <td
                  colSpan={10}
                  style={{
                    fontSize: "12px",
                    fontFamily: "Arial",
                    border: "1px solid black",
                    padding: "8px",
                    textAlign: "left",
                  }}
                >
                  {" "}
                  <b>College Dean's Office</b>
                  <br />
                  <b>Step 5:</b>College Enrollment
                </td>
              </tr>

              <tr>
                <td
                  colSpan={10}
                  style={{
                    border: "1px solid black",
                    textAlign: "center",
                    padding: "8px",
                    fontSize: "18px",
                  }}
                >
                  {steps?.step3Status &&
                    renderCollegeApprovalStatus(steps.step3Status)}
                </td>
                <td
                  colSpan={5}
                  style={{
                    textAlign: "center",
                    verticalAlign: "middle",
                  }}
                >
                  <ForwardIcon
                    sx={{
                      marginTop: "-53px",
                      fontSize: 70, // normal screen size
                      "@media print": {
                        fontSize: 14, // smaller print size
                        margin: 0,
                      },
                    }}
                  />
                </td>

                <td
                  colSpan={11}
                  style={{
                    height: "50px",
                    fontSize: "18px",
                    fontFamily: "Arial",
                    border: "1px solid black",
                    padding: "8px",
                    textAlign: "center",
                  }}
                >
                  {steps.step4 && (
                    <span style={{ color: "green", fontWeight: "bold" }}>
                      ✔ DONE
                    </span>
                  )}
                </td>
                <td
                  colSpan={5}
                  style={{
                    textAlign: "center",
                    verticalAlign: "middle",
                  }}
                >
                  <ForwardIcon
                    sx={{
                      marginTop: "-53px",
                      fontSize: 70, // normal screen size
                      "@media print": {
                        fontSize: 14, // smaller print size
                        margin: 0,
                      },
                    }}
                  />
                </td>
                <td
                  colSpan={10}
                  style={{
                    fontSize: "18px",
                    fontFamily: "Arial",
                    border: "1px solid black",
                    padding: "8px",
                    textAlign: "center",
                  }}
                >
                  {steps.step5 && (
                    <span style={{ color: "green", fontWeight: "bold" }}>
                      ✔ DONE
                    </span>
                  )}
                </td>
              </tr>

              <tr>
                <td
                  colSpan={40}
                  style={{
                    height: "0.2in",
                    fontSize: "72.5%",
                    border: "transparent",
                    color: "white",
                  }}
                >
                  <div
                    style={{
                      fontWeight: "normal",
                      fontSize: "12px",
                      color: "black",
                      textAlign: "right",
                    }}
                  >
                    Dean's Copy
                  </div>
                </td>
              </tr>
            </tbody>
          </table>

          <hr
            style={{
              width: "100%",
              maxWidth: "770px",
              border: "none",
              borderTop: "1px dashed black",
              margin: "10px auto",
            }}
          />

          <Container>
            <div
              className="student-table"
              style={{
                width: "8in", // matches table width assuming 8in for 40 columns
                maxWidth: "100%",
                margin: "0 auto",

                boxSizing: "border-box",
                padding: "10px 0",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between", // spread logo, text, profile+QR
                  flexWrap: "nowrap",
                }}
              >
                {/* Logo (Left Side) */}
                <div style={{ flexShrink: 0 }}>
                  <img
                    src={fetchedLogo}
                    alt="School Logo"
                    style={{
                      width: "120px",
                      height: "120px",
                      objectFit: "cover",
                      marginLeft: "10px",
                      marginTop: "-25px",
                      borderRadius: "50%", // ✅ Makes it perfectly circular
                    }}
                  />
                </div>

                {/* Text Block (Center) */}
                <div
                  style={{
                    flexGrow: 1,
                    textAlign: "center",
                    fontSize: "12px",
                    fontFamily: "Arial",
                    letterSpacing: "5",
                    lineHeight: 1.4,
                    paddingTop: 0,
                    paddingBottom: 0,
                  }}
                >
                  <div style={{ fontSize: "13px", fontFamily: "Arial" }}>
                    Republic of the Philippines
                  </div>
                  <div
                    style={{
                      fontWeight: "bold",
                      fontFamily: "Arial",
                      fontSize: "14px",
                      textTransform: "Uppercase",
                    }}
                  >
                    {firstLine}
                  </div>
                  {secondLine && (
                    <div
                      style={{
                        fontWeight: "bold",
                        fontFamily: "Arial",
                        fontSize: "14px",
                        textTransform: "Uppercase",
                      }}
                    >
                      {secondLine}
                    </div>
                  )}
                  {campusAddress && (
                    <div
                      style={{
                        fontSize: "13px",
                        fontFamily: "Arial",
                      }}
                    >
                      {campusAddress}
                    </div>
                  )}

                  <div style={{ fontSize: "13px", fontFamily: "Arial" }}>
                    <b>OFFICE OF THE ADMISSION SERVICES</b>
                  </div>

                  <br />

                  <div
                    style={{
                      fontSize: "13px",
                      fontFamily: "Arial",
                      fontWeight: "bold",
                      marginBottom: "5px",
                      marginTop: "0",
                      textAlign: "center",
                    }}
                  >
                    Admission Form (Process)
                  </div>
                </div>

                {/* Profile + QR Code (Right Side) */}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "row", // ✅ side by side
                    alignItems: "center",
                    marginRight: "10px",
                    gap: "10px", // ✅ 10px space between them
                  }}
                >
                  <div
                    style={{
                      width: "1.3in",
                      height: "1.3in",
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      border: "1px solid black", // ✅ same border as profile_img
                      background: "#fff", // ✅ same background
                      flexShrink: 0,
                      position: "relative", // ✅ needed for overlay text
                    }}
                  >
                    {person?.qr_code ? (
                      <img
                        src={`${API_BASE_URL}/uploads/${person.qr_code}`}
                        alt="QR Code"
                        style={{ width: "110px", height: "110px" }}
                      />
                    ) : (
                      <QRCodeSVG
                        value={`${window.location.origin}/applicant_profile/${person.applicant_number}`}
                        size={110}
                        level="H"
                      />
                    )}

                    {/* Overlay applicant_number in middle */}
                    <div
                      style={{
                        position: "absolute",
                        fontSize: "10px",
                        fontWeight: "bold",
                        color: "maroon",
                        background: "white",
                        padding: "2px",
                      }}
                    >
                      {person.applicant_number}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Container>
          <br />
          <br />
          <table
            style={{
              borderCollapse: "collapse",
              fontFamily: "Arial",
              width: "8in",
              margin: "0 auto",

              marginTop: "-30px",
              textAlign: "center",
              tableLayout: "fixed",
            }}
          >
            <tbody>
              {/* Name of Student Row */}
              <tr>
                <td
                  colSpan={40}
                  style={{
                    fontSize: "12px",
                    paddingTop: "5px",
                    marginTop: 0,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      width: "100%",
                    }}
                  >
                    <span
                      style={{
                        fontWeight: "bold",
                        whiteSpace: "nowrap",
                        marginRight: "10px",
                      }}
                    >
                      Name of Student:
                    </span>
                    <div
                      style={{
                        flexGrow: 1,
                        display: "flex",
                        justifyContent: "space-between",
                      }}
                    >
                      <span
                        style={{
                          width: "25%",
                          textAlign: "center",
                          fontSize: "14.5px",
                          borderBottom: "1px solid black",
                        }}
                      >
                        {person.last_name}
                      </span>
                      <span
                        style={{
                          width: "25%",
                          textAlign: "center",
                          fontSize: "14.5px",
                          borderBottom: "1px solid black",
                        }}
                      >
                        {person.first_name}
                      </span>
                      <span
                        style={{
                          width: "25%",
                          textAlign: "center",
                          fontSize: "14.5px",
                          borderBottom: "1px solid black",
                        }}
                      >
                        {person.middle_name}
                      </span>
                      <span
                        style={{
                          width: "25%",
                          textAlign: "center",
                          fontSize: "14.5px",
                          borderBottom: "1px solid black",
                        }}
                      >
                        {person.extension}
                      </span>
                    </div>
                  </div>
                </td>
              </tr>

              {/* Labels Row */}
              <tr>
                <td
                  colSpan={40}
                  style={{
                    fontSize: "12px",
                    paddingTop: "2px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginLeft: "120px",
                      marginTop: "-4px",
                    }}
                  >
                    <span style={{ width: "25%", textAlign: "center" }}>
                      Last Name
                    </span>
                    <span style={{ width: "25%", textAlign: "center" }}>
                      Given Name
                    </span>
                    <span style={{ width: "25%", textAlign: "center" }}>
                      Middle Name
                    </span>
                    <span style={{ width: "25%", textAlign: "center" }}>
                      Ext. Name
                    </span>
                  </div>
                </td>
              </tr>

              {/* Email & Applicant ID */}
              <tr style={{ fontSize: "13px" }}>
                <td colSpan={20}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      width: "100%",
                    }}
                  >
                    <label
                      style={{
                        fontWeight: "bold",
                        whiteSpace: "nowrap",
                        marginRight: "10px",
                      }}
                    >
                      Email:
                    </label>
                    <span
                      style={{
                        flexGrow: 1,
                        borderBottom: "1px solid black",
                        height: "1.3em",
                        fontSize: "12px",
                      }}
                    >
                      <div style={{ marginTop: "-3px" }} className="dataField">
                        {person.emailAddress}
                      </div>
                    </span>
                  </div>
                </td>
                <td colSpan={20}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      width: "100%",
                    }}
                  >
                    <label
                      style={{
                        fontWeight: "bold",
                        whiteSpace: "nowrap",
                        marginRight: "10px",
                      }}
                    >
                      Applicant Id No.:
                    </label>
                    <span
                      style={{
                        flexGrow: 1,
                        borderBottom: "1px solid black",
                        height: "1.3em",
                        fontSize: "12px",
                      }}
                    >
                      <div style={{ marginTop: "-3px" }} className="dataField">
                        {person.emailAddress}
                      </div>
                    </span>
                  </div>
                </td>
              </tr>

              {/* Permanent Address */}
              <tr style={{ fontSize: "13px" }}>
                <td colSpan={40}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      width: "100%",
                      marginTop: "2px",
                    }}
                  >
                    <label
                      style={{
                        fontWeight: "bold",
                        whiteSpace: "nowrap",
                        marginRight: "10px",
                      }}
                    >
                      Permanent Address:
                    </label>
                    <span
                      style={{
                        flexGrow: 1,
                        borderBottom: "1px solid black",
                        height: "1.3em",
                        fontSize: "12px",
                      }}
                    >
                      <div style={{ marginTop: "-3px" }} className="dataField">
                        {person.permanentStreet} {person.permanentBarangay}{" "}
                        {person.permanentMunicipality} {person.permanentRegion}{" "}
                        {person.permanentZipCode}
                      </div>
                    </span>
                  </div>
                </td>
              </tr>

              {/* Cellphone No, Civil Status, Gender */}
              <tr style={{ fontSize: "13px" }}>
                <td colSpan={13}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      width: "100%",
                    }}
                  >
                    <label
                      style={{
                        fontWeight: "bold",
                        whiteSpace: "nowrap",
                        marginRight: "10px",
                      }}
                    >
                      Cellphone No:
                    </label>
                    <span
                      style={{
                        flexGrow: 1,
                        borderBottom: "1px solid black",
                        height: "1.3em",
                        fontSize: "12px",
                      }}
                    >
                      <div style={{ marginTop: "-3px" }} className="dataField">
                        {person.cellphoneNumber}
                      </div>
                    </span>
                  </div>
                </td>
                <td colSpan={13}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      width: "100%",
                    }}
                  >
                    <label
                      style={{
                        fontWeight: "bold",
                        whiteSpace: "nowrap",
                        marginRight: "10px",
                      }}
                    >
                      Civil Status:
                    </label>
                    <span
                      style={{
                        flexGrow: 1,
                        borderBottom: "1px solid black",
                        height: "1.3em",
                        fontSize: "12px",
                      }}
                    >
                      <div style={{ marginTop: "-3px" }} className="dataField">
                        {person.civilStatus}
                      </div>
                    </span>
                  </div>
                </td>
                <td colSpan={14}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      width: "100%",
                    }}
                  >
                    <label
                      style={{
                        fontWeight: "bold",
                        whiteSpace: "nowrap",
                        marginRight: "10px",
                      }}
                    >
                      Gender:
                    </label>
                    <span
                      style={{
                        flexGrow: 1,
                        borderBottom: "1px solid black",
                        height: "1.3em",
                        fontSize: "12px",
                      }}
                    >
                      <div style={{ marginTop: "-3px" }} className="dataField">
                        {" "}
                        {person.gender === 0
                          ? "Male"
                          : person.gender === 1
                            ? "Female"
                            : ""}
                      </div>
                    </span>
                  </div>
                </td>
              </tr>

              {/* Date of Birth, Place of Birth, Age */}
              <tr style={{ fontSize: "13px" }}>
                <td colSpan={13}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      width: "100%",
                    }}
                  >
                    <label
                      style={{
                        fontWeight: "bold",
                        whiteSpace: "nowrap",
                        marginRight: "10px",
                      }}
                    >
                      Date of Birth:
                    </label>
                    <span
                      style={{
                        flexGrow: 1,
                        borderBottom: "1px solid black",
                        height: "1.3em",
                        fontSize: "12px",
                      }}
                    >
                      <div style={{ marginTop: "-3px" }} className="dataField">
                        {person.birthOfDate}
                      </div>
                    </span>
                  </div>
                </td>
                <td colSpan={14}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      width: "100%",
                    }}
                  >
                    <label
                      style={{
                        fontWeight: "bold",
                        whiteSpace: "nowrap",
                        marginRight: "10px",
                      }}
                    >
                      Place of Birth:
                    </label>
                    <span
                      style={{
                        flexGrow: 1,
                        borderBottom: "1px solid black",
                        height: "1.3em",
                        fontSize: "12px",
                      }}
                    >
                      <div style={{ marginTop: "-3px" }} className="dataField">
                        {person.birthPlace}
                      </div>
                    </span>
                  </div>
                </td>
                <td colSpan={13}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      width: "100%",
                    }}
                  >
                    <label
                      style={{
                        fontWeight: "bold",
                        whiteSpace: "nowrap",
                        marginRight: "10px",
                      }}
                    >
                      Age:
                    </label>
                    <span
                      style={{
                        flexGrow: 1,
                        borderBottom: "1px solid black",
                        height: "1.3em",
                        fontSize: "12px",
                      }}
                    >
                      <div style={{ marginTop: "-3px" }} className="dataField">
                        {person.age}
                      </div>
                    </span>
                  </div>
                </td>
              </tr>

              <tr style={{ fontSize: "13px" }}>
                {/* Please Check */}
                <td colSpan={10}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      width: "100%",
                    }}
                  >
                    <label
                      style={{
                        fontWeight: "bold",
                        whiteSpace: "nowrap",
                        marginRight: "10px",
                      }}
                    >
                      Please Check (✓):
                    </label>
                    <span
                      style={{
                        flexGrow: 1,
                        borderBottom: "1px solid black",
                        height: "1.3em",
                        display: "inline-block",
                      }}
                    >
                      {/* left blank intentionally */}
                    </span>
                  </div>
                </td>

                {/* Freshman */}
                <td colSpan={10}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      width: "100%",
                    }}
                  >
                    <label
                      style={{
                        fontWeight: "bold",
                        whiteSpace: "nowrap",
                        marginRight: "10px",
                      }}
                    >
                      Freshman:
                    </label>
                    <span
                      style={{
                        flexGrow: 1,
                        borderBottom: "1px solid black",
                        height: "1.3em",
                        textAlign: "center",
                        display: "inline-block",
                        fontSize: "12px",
                        fontWeight: "bold",
                      }}
                    >
                      <div style={{ marginTop: "-3px" }} className="dataField">
                        {person.classifiedAs === "Freshman (First Year)"
                          ? "✓"
                          : ""}
                      </div>
                    </span>
                  </div>
                </td>

                {/* Transferee */}
                <td colSpan={10}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      width: "100%",
                    }}
                  >
                    <label
                      style={{
                        fontWeight: "bold",
                        whiteSpace: "nowrap",
                        marginRight: "10px",
                      }}
                    >
                      Transferee:
                    </label>
                    <span
                      style={{
                        flexGrow: 1,
                        borderBottom: "1px solid black",
                        height: "1.3em",
                        textAlign: "center",
                        display: "inline-block",
                        fontSize: "12px",
                        fontWeight: "bold",
                      }}
                    >
                      <div style={{ marginTop: "-3px" }} className="dataField">
                        {["Transferee", "Returnee", "Shiftee"].includes(
                          person.classifiedAs,
                        )
                          ? "✓"
                          : ""}
                      </div>
                    </span>
                  </div>
                </td>

                {/* Others */}
                <td colSpan={10}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      width: "100%",
                    }}
                  >
                    <label
                      style={{
                        fontWeight: "bold",
                        whiteSpace: "nowrap",
                        marginRight: "10px",
                      }}
                    >
                      Others:
                    </label>
                    <span
                      style={{
                        flexGrow: 1,
                        borderBottom: "1px solid black",
                        height: "1.3em",
                        textAlign: "center",
                        display: "inline-block",
                        fontSize: "12px",
                        fontWeight: "bold",
                      }}
                    >
                      <div style={{ marginTop: "-3px" }} className="dataField">
                        {person.classifiedAs === "Foreign Student" ? "✓" : ""}
                      </div>
                    </span>
                  </div>
                </td>
              </tr>

              {/* Last School Attended */}
              <tr style={{ fontSize: "13px" }}>
                <td colSpan={40}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      width: "100%",
                    }}
                  >
                    <label
                      style={{
                        fontWeight: "bold",
                        whiteSpace: "nowrap",
                        marginRight: "10px",
                      }}
                    >
                      Last School Attended:
                    </label>
                    <span
                      style={{
                        flexGrow: 1,
                        borderBottom: "1px solid black",
                        height: "1.3em",
                        fontSize: "12px",
                      }}
                    >
                      <div style={{ marginTop: "-3px" }} className="dataField">
                        {person.schoolLastAttended1}
                      </div>
                    </span>
                  </div>
                </td>
              </tr>

              {/* Degree/Program & Major */}
              <tr style={{ fontSize: "13px" }}>
                <td colSpan={25} style={{ verticalAlign: "top" }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      width: "100%",
                    }}
                  >
                    <label
                      style={{
                        fontWeight: "bold",
                        whiteSpace: "nowrap",
                        marginRight: "10px",
                      }}
                    >
                      DEGREE/PROGRAM APPLIED:
                    </label>
                    <div
                      style={{
                        flexGrow: 1,
                        borderBottom: "1px solid black",
                        minHeight: "1.2em",
                        whiteSpace: "normal", // allow text wrapping
                        wordWrap: "break-word", // break long words
                        lineHeight: "1.4em",
                        paddingBottom: "2px",
                      }}
                    >
                      {curriculumOptions.length > 0
                        ? curriculumOptions.find(
                            (item) =>
                              item?.curriculum_id?.toString() ===
                              (person?.program ?? "").toString(),
                          )?.program_description ||
                          (person?.program ?? "")
                        : "Loading..."}
                    </div>
                  </div>
                </td>

                <td colSpan={15} style={{ verticalAlign: "top" }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      width: "100%",
                    }}
                  >
                    <label
                      style={{
                        fontWeight: "bold",
                        whiteSpace: "nowrap",
                        marginRight: "10px",
                      }}
                    >
                      MAJOR:
                    </label>
                    <div
                      style={{
                        flexGrow: 1,
                        borderBottom: "1px solid black",
                        minHeight: "1.2em",
                        whiteSpace: "normal",
                        wordWrap: "break-word",
                        lineHeight: "1.4em",
                        paddingBottom: "2px",
                      }}
                    >
                      {curriculumOptions.length > 0
                        ? curriculumOptions.find(
                            (item) =>
                              item?.curriculum_id?.toString() ===
                              (person?.program ?? "").toString(),
                          )?.major || ""
                        : "Loading..."}
                    </div>
                  </div>
                </td>
              </tr>

              <tr>
                <td colSpan="40" style={{ height: "0.5px" }}></td>
              </tr>

              <tr>
                <td
                  colSpan={40}
                  style={{
                    height: "0.2in",
                    fontSize: "72.5%",
                    color: "white", // This is just a fallback; overridden below
                  }}
                >
                  <div
                    style={{
                      color: "black",

                      fontSize: "12px",
                      textAlign: "left",
                      display: "block",
                    }}
                  >
                    <b>{"\u00A0\u00A0"}APPLICATION PROCEDURE:</b>
                    {
                      "\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0"
                    }
                    For Enrollment Officer: Please sign and put Remarks box if
                    they done
                  </div>
                </td>
              </tr>

              <tr>
                <td
                  colSpan={15}
                  style={{
                    border: "1px solid black",
                    textAlign: "left",
                    padding: "8px",
                    fontSize: "12px",
                  }}
                >
                  <b> Guidance Office</b> (as per Schedule)
                  <br />
                  <b> Step 1:</b> ECAT Examination
                </td>
                <td
                  colSpan={5}
                  style={{
                    height: "50px",
                    textAlign: "center",
                    verticalAlign: "middle",
                  }}
                ></td>

                <td
                  colSpan={16}
                  style={{
                    fontSize: "12px",
                    fontFamily: "Arial",
                    border: "1px solid black",
                    padding: "8px",
                    textAlign: "left",
                  }}
                >
                  {" "}
                  <b>College Dean's Office</b>
                  <br />
                  <b>Step 2: </b>College Interview, Qualifying / Aptitude Test
                  and College Approval
                </td>
                <td
                  colSpan={5}
                  style={{
                    textAlign: "center",
                    verticalAlign: "middle",
                    height: "35px",
                  }}
                ></td>
              </tr>
              <tr>
                <td
                  colSpan={15}
                  style={{
                    border: "1px solid black",
                    textAlign: "center",
                    padding: "8px",
                    fontSize: "18px",
                  }}
                >
                  {steps.step1 && renderStepStatus(steps.step1Status)}
                </td>
                <td
                  colSpan={5}
                  style={{
                    textAlign: "center",
                    verticalAlign: "middle",
                    height: "50px",
                  }}
                >
                  <ForwardIcon
                    sx={{
                      marginTop: "-53px",
                      fontSize: 70, // normal screen size
                      "@media print": {
                        fontSize: 14, // smaller print size
                        margin: 0,
                      },
                    }}
                  />
                </td>
                <td
                  colSpan={5}
                  style={{
                    border: "1px solid black",
                    textAlign: "center",
                    padding: "8px",
                    fontSize: "12px",
                  }}
                ></td>
                <td
                  colSpan={6}
                  style={{
                    border: "1px solid black",
                    textAlign: "center",
                    padding: "8px",
                    fontSize: "18px",
                  }}
                >
                  {steps.qualifyingDone &&
                    renderStepStatus(steps.qualifyingStatus)}
                </td>
                <td
                  colSpan={5}
                  style={{
                    border: "1px solid black",
                    textAlign: "center",
                    padding: "8px",
                    fontSize: "18px",
                  }}
                >
                  {steps.interviewDone &&
                    renderStepStatus(steps.interviewStatus)}
                </td>
                <td
                  colSpan={5}
                  style={{
                    textAlign: "center",
                    verticalAlign: "middle",
                  }}
                >
                  <ForwardIcon
                    sx={{
                      marginTop: "-53px",
                      fontSize: 70, // normal screen size
                      "@media print": {
                        fontSize: 14, // smaller print size
                        margin: 0,
                      },
                    }}
                  />
                </td>
              </tr>

              <tr>
                <td colSpan="40" style={{ height: "20px" }}></td>
              </tr>

              <tr>
                <td
                  colSpan={10}
                  style={{
                    border: "1px solid black",
                    textAlign: "left",
                    padding: "8px",
                    fontSize: "12px",
                  }}
                >
                  <b> Medical and Dental Service Office</b>
                  <br /> <b>Step 3:</b> Medical Examination
                </td>
                <td
                  colSpan={5}
                  style={{
                    textAlign: "center",
                    verticalAlign: "middle",
                  }}
                ></td>

                <td
                  colSpan={11}
                  style={{
                    fontSize: "12px",
                    fontFamily: "Arial",
                    border: "1px solid black",
                    padding: "8px",
                    textAlign: "left",
                  }}
                >
                  {" "}
                  <b>Registrar's Office</b>
                  <br />
                  <b>Step 4:</b> Submission of Original Cridentials
                </td>
                <td
                  colSpan={5}
                  style={{
                    textAlign: "center",
                    verticalAlign: "middle",
                  }}
                ></td>
                <td
                  colSpan={10}
                  style={{
                    fontSize: "12px",
                    fontFamily: "Arial",
                    border: "1px solid black",
                    padding: "8px",
                    textAlign: "left",
                  }}
                >
                  {" "}
                  <b>College Dean's Office</b>
                  <br />
                  <b>Step 5:</b>College Enrollment
                </td>
              </tr>

              <tr>
                <td
                  colSpan={10}
                  style={{
                    border: "1px solid black",
                    textAlign: "center",
                    padding: "8px",
                    fontSize: "18px",
                  }}
                >
                  {steps?.step3Status &&
                    renderCollegeApprovalStatus(steps.step3Status)}
                </td>
                <td
                  colSpan={5}
                  style={{
                    textAlign: "center",
                    verticalAlign: "middle",
                  }}
                >
                  <ForwardIcon
                    sx={{
                      marginTop: "-53px",
                      fontSize: 70, // normal screen size
                      "@media print": {
                        fontSize: 14, // smaller print size
                        margin: 0,
                      },
                    }}
                  />
                </td>

                <td
                  colSpan={11}
                  style={{
                    height: "50px",
                    fontSize: "18px",
                    fontFamily: "Arial",
                    border: "1px solid black",
                    padding: "8px",
                    textAlign: "center",
                  }}
                >
                  {steps.step4 && (
                    <span style={{ color: "green", fontWeight: "bold" }}>
                      ✔ DONE
                    </span>
                  )}
                </td>
                <td
                  colSpan={5}
                  style={{
                    textAlign: "center",
                    verticalAlign: "middle",
                  }}
                >
                  <ForwardIcon
                    sx={{
                      marginTop: "-53px",
                      fontSize: 70, // normal screen size
                      "@media print": {
                        fontSize: 14, // smaller print size
                        margin: 0,
                      },
                    }}
                  />
                </td>
                <td
                  colSpan={10}
                  style={{
                    fontSize: "18px",
                    fontFamily: "Arial",
                    border: "1px solid black",
                    padding: "8px",
                    textAlign: "center",
                  }}
                >
                  {steps.step5 && (
                    <span style={{ color: "green", fontWeight: "bold" }}>
                      ✔ DONE
                    </span>
                  )}
                </td>
              </tr>

              <tr>
                <td
                  colSpan={40}
                  style={{
                    height: "0.2in",
                    fontSize: "72.5%",
                    border: "transparent",
                    color: "white",
                  }}
                >
                  <div
                    style={{
                      fontWeight: "normal",
                      fontSize: "12px",
                      color: "black",
                      textAlign: "right",
                    }}
                  >
                    Registrar's Copy
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Box>
    </Box>
  );
};

export default ApplicantExamPermit;
