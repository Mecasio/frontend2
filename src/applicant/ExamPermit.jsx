import React, { useState, useEffect, useContext, useRef } from "react";
import { SettingsContext } from "../App";
import axios from "axios";
import { QRCodeSVG } from "qrcode.react";
import EaristLogo from "../assets/EaristLogo.png";
import "../styles/Print.css";
import API_BASE_URL from "../apiConfig";

const ExamPermit = ({ personId }) => {
  const settings = useContext(SettingsContext);
  const colors = settings?.colors || {};
  const branding = settings?.branding || {};
  const assets = settings?.assets || {};
  const headerColor = colors.header || "#1976d2";

  const [titleColor, setTitleColor] = useState("#000000");
  const [subtitleColor, setSubtitleColor] = useState("#555555");
  const [borderColor, setBorderColor] = useState("#000000");
  const [mainButtonColor, setMainButtonColor] = useState("#1976d2");
  const [subButtonColor, setSubButtonColor] = useState("#ffffff");
  const [stepperColor, setStepperColor] = useState("#000000");

  const [fetchedLogo, setFetchedLogo] = useState(null);
  const [companyName, setCompanyName] = useState("");
  const [shortTerm, setShortTerm] = useState("");
  const [branches, setBranches] = useState([]);

  useEffect(() => {
    if (!settings) return;
    if (colors.title) setTitleColor(colors.title);
    if (colors.subtitle) setSubtitleColor(colors.subtitle);
    if (colors.border) setBorderColor(colors.border);
    if (colors.mainButton)
      setMainButtonColor(colors.mainButton);
    if (colors.subButton) setSubButtonColor(colors.subButton);
    if (colors.stepper) setStepperColor(colors.stepper);
    if (assets.logoUrl) {
      setFetchedLogo(`${assets.logoUrl}`);
    } else {
      setFetchedLogo(EaristLogo);
    }
    if (branding.companyName) setCompanyName(branding.companyName);
    if (branding.shortTerm) setShortTerm(branding.shortTerm);
    setBranches(settings?.branches || []);
  }, [settings]);

  const words = companyName.trim().split(" ");
  const middle = Math.ceil(words.length / 2);
  const firstLine = words.slice(0, middle).join(" ");
  const secondLine = words.slice(middle).join(" ");

  const divToPrintRef = useRef(null);
  const [examSchedule, setExamSchedule] = useState(null);
  const [curriculumOptions, setCurriculumOptions] = useState([]);
  const [scheduledBy, setScheduledBy] = useState("");

  const [person, setPerson] = useState({
    campus: "",
    profile_img: "",
    last_name: "",
    first_name: "",
    middle_name: "",
    extension: "",
    applicant_number: "",
  });

  const [campusAddress, setCampusAddress] = useState("");
  const [isVerified, setIsVerified] = useState(false);
  const [verifiedAt, setVerifiedAt] = useState(null);
  const [attendanceToken, setAttendanceToken] = useState(null);
  const [attendanceStatus, setAttendanceStatus] = useState(null);

  // ✅ PRIMARY fetch — gets person, applicant_number, verification, schedule, programs, registrar
  useEffect(() => {
    const pid = personId || localStorage.getItem("person_id");
    if (!pid) return;

    const fetchData = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/api/person/${pid}`);
        let personData = res.data;

        const applicantRes = await axios.get(
          `${API_BASE_URL}/api/applicant_number/${pid}`,
        );
        if (applicantRes.data?.applicant_number) {
          personData.applicant_number = applicantRes.data.applicant_number;
        }

        setPerson(personData);

        if (applicantRes.data?.applicant_number) {
          const applicant_number = applicantRes.data.applicant_number;

          try {
            const verifyRes = await axios.get(
              `${API_BASE_URL}/api/document-verification/${applicant_number}`,
            );
            setIsVerified(Boolean(verifyRes.data?.verified));
            setVerifiedAt(
              verifyRes.data?.verified ? verifyRes.data.verified_at : null,
            );
          } catch (verErr) {
            console.error("Error fetching verification status:", verErr);
          }

          // ✅ FIXED — correct endpoint (was /api/exam-schedule/:x, which doesn't exist)
          try {
            const schedRes = await axios.get(
              `${API_BASE_URL}/api/applicant-schedule/${applicant_number}`,
            );
            setExamSchedule(schedRes.data);
          } catch (schedErr) {
            console.error("Error fetching exam schedule:", schedErr);
            setExamSchedule(null);
          }

          try {
            const attRes = await axios.get(
              `${API_BASE_URL}/api/exam-attendance/token/${applicant_number}`,
            );
            setAttendanceToken(attRes.data?.qr_token || null);
            setAttendanceStatus(attRes.data?.status || null);
          } catch (attErr) {
            console.error("Error fetching attendance token:", attErr);
            setAttendanceToken(null);
            setAttendanceStatus(null);
          }
        }

        try {
          const progRes = await axios.get(
            `${API_BASE_URL}/api/applied_program`,
          );
          setCurriculumOptions(progRes.data);
        } catch (progErr) {
          console.error("Error fetching programs:", progErr);
        }

        try {
          const registrarRes = await axios.get(
            `${API_BASE_URL}/api/scheduled-by/registrar`,
          );
          if (registrarRes.data?.fullName)
            setScheduledBy(registrarRes.data.fullName);
        } catch (regErr) {
          console.error("Error fetching registrar name:", regErr);
        }
      } catch (err) {
        console.error("Error fetching exam permit data:", err);
      }
    };

    fetchData();
  }, [personId]);

  const getOrdinal = (n) => {
    if (n === null || n === undefined || n === "") return "";
    const numeric = Number(n);
    if (!Number.isFinite(numeric)) return String(n);
    const s = ["th", "st", "nd", "rd"];
    const v = numeric % 100;
    return numeric + (s[(v - 20) % 10] || s[v] || s[0]);
  };

  const [permitNumber, setPermitNumber] = useState("");

  useEffect(() => {
    if (!person?.person_id || !isVerified) {
      setPermitNumber("");
      return;
    }
    axios
      .post(`${API_BASE_URL}/api/generate-permit-number`, {
        person_id: person.person_id,
        applicant_number: person.applicant_number,
      })
      .then((res) => setPermitNumber(res.data?.control_number || ""))
      .catch((err) => {
        console.error("Failed to generate permit number:", err);
        setPermitNumber("");
      });
  }, [person, isVerified]);

  // Campus address resolution
  useEffect(() => {
    if (!settings) return;
    const branchId = person?.campus;
    const matchedBranch = branches.find(
      (branch) => String(branch?.id) === String(branchId),
    );
    if (matchedBranch?.address) {
      setCampusAddress(matchedBranch.address);
      return;
    }
    if (branding.campusAddress) {
      setCampusAddress(branding.campusAddress);
      return;
    }
    setCampusAddress(branding.campusAddress || "");
  }, [settings, branches, person?.campus]);

  if (!person) return <div>Loading Exam Permit...</div>;

  return (
    <div
      ref={divToPrintRef}
      className="exam-permit-container"
      style={{
        width: "8.5in",
        minHeight: "9in",
        backgroundColor: "white",
        padding: "20px",
        margin: "0 auto",
        position: "relative",
        marginTop: "10px",
        boxSizing: "border-box",
      }}
    >
      <style>{`
            @page {
              size: 8.5in 11in;
              margin: 0.25in 0.25in 0.25in 0.25in;
            }
            @media print {
              html, body {
                width: 8.5in;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
              button { display: none; }
            }
            `}</style>

      {/* VERIFIED / NOT VERIFIED Watermark */}
      <div
        style={{
          position: "absolute",
          top: "26%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          fontSize: "120px",
          fontWeight: "900",
          color: isVerified ? "rgba(0, 128, 0, 0.15)" : "rgba(255, 0, 0, 0.15)",
          textTransform: "uppercase",
          whiteSpace: "nowrap",
          pointerEvents: "none",
          userSelect: "none",
          zIndex: 0,
          fontFamily: "Arial",
          letterSpacing: "0.3rem",
        }}
      >
        {isVerified ? "VERIFIED" : "NOT VERIFIED"}
      </div>

      <style>{`
            @media print {
                div[style*="rotate(-30deg)"] {
                    color: ${isVerified ? "rgba(0, 128, 0, 0.25)" : "rgba(255, 0, 0, 0.25)"};
                }
                button { display: none; }
            }
            `}</style>

      {/* Header */}
      <table
        width="100%"
        style={{
          borderCollapse: "collapse",
          marginTop: "-40px",
          fontFamily: "Arial",
        }}
      >
        <tbody>
          <tr>
            <td style={{ width: "20%", textAlign: "center" }}>
              <img
                src={fetchedLogo}
                alt="School Logo"
                style={{
                  marginLeft: "-10px",
                  width: "120px",
                  height: "120px",
                  marginTop: "10px",
                  borderRadius: "50%",
                  objectFit: "cover",
                }}
              />
            </td>
            <td style={{ width: "60%", textAlign: "center", lineHeight: "1" }}>
              <div style={{ fontFamily: "Arial", fontSize: "13px" }}>
                Republic of the Philippines
              </div>
              <div
                style={{
                  fontWeight: "bold",
                  fontFamily: "Arial",
                  fontSize: "20px",
                }}
              >
                {firstLine}
              </div>
              {secondLine && (
                <div
                  style={{
                    fontWeight: "bold",
                    fontFamily: "Arial",
                    fontSize: "20px",
                  }}
                >
                  {secondLine}
                </div>
              )}
              {campusAddress && (
                <div style={{ fontFamily: "Arial", fontSize: "13px" }}>
                  {campusAddress}
                </div>
              )}
              <div
                style={{
                  fontWeight: "bold",
                  fontFamily: "Arial",
                  fontSize: "15px",
                  letterSpacing: "1px",
                  marginTop: "6px",
                }}
              >
                OFFICE OF THE ADMISSION SERVICES
              </div>
              <div style={{ marginTop: "30px" }}>
                <b
                  style={{
                    fontSize: "24px",
                    letterSpacing: "1px",
                    fontWeight: "bold",
                  }}
                >
                  EXAMINATION PERMIT
                </b>
              </div>
            </td>
            <td
              colSpan={4}
              rowSpan={6}
              style={{
                textAlign: "center",
                position: "relative",
                width: "4.5cm",
                height: "4.5cm",
              }}
            >
              <div
                style={{
                  width: "3.80cm",
                  height: "3.80cm",
                  marginRight: "10px",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  position: "relative",
                  border: "1px solid black",
                  overflow: "hidden",
                  borderRadius: "4px",
                  marginTop: "10px",
                }}
              >
                {person.profile_img ? (
                  <img
                    src={`${API_BASE_URL}/uploads/Applicant1by1/${person.profile_img}`}
                    alt="Profile"
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                  />
                ) : (
                  <span style={{ fontSize: "12px", color: "#888" }}>
                    No Image
                  </span>
                )}
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <div style={{ height: "20px" }} />

      {/* Applicant Details Table */}
      <table
        className="student-table"
        style={{
          borderCollapse: "collapse",
          fontFamily: "Arial",
          fontSize: "15px",
          width: "8in",
          margin: "0 auto",
          tableLayout: "fixed",
        }}
      >
        <tbody>
          {/* Applicant Number */}
          <tr style={{ fontFamily: "Arial", fontSize: "15px" }}>
            <td colSpan={40}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "flex-end",
                  width: "100%",
                  gap: "3px",
                }}
              >
                <label style={{ fontWeight: "bold", whiteSpace: "nowrap" }}>
                  Applicant No.:
                </label>
                <div
                  style={{
                    borderBottom: "1px solid black",
                    fontFamily: "Arial",
                    fontWeight: "normal",
                    fontSize: "15px",
                    minWidth: "278px",
                    height: "1.2em",
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  {person?.applicant_number}
                </div>
              </div>
            </td>
          </tr>

          {/* Name + Permit No. */}
          <tr>
            <td colSpan={20}>
              <div
                style={{ display: "flex", alignItems: "center", width: "100%" }}
              >
                <label style={{ fontWeight: "bold", marginRight: "10px" }}>
                  Name:
                </label>
                <span
                  style={{
                    flexGrow: 1,
                    borderBottom: "1px solid black",
                    fontFamily: "Arial",
                    minWidth: "250px",
                  }}
                >
                  {person?.last_name?.toUpperCase()},{" "}
                  {person?.first_name?.toUpperCase()}{" "}
                  {person?.middle_name?.toUpperCase() || ""}{" "}
                  {person?.extension?.toUpperCase() || ""}
                </span>
              </div>
            </td>
            <td colSpan={20}>
              <div
                style={{ display: "flex", alignItems: "center", width: "100%" }}
              >
                <label style={{ fontWeight: "bold", marginRight: "10px" }}>
                  Permit No.:
                </label>
                <span
                  style={{
                    flexGrow: 1,
                    borderBottom: "1px solid black",
                    minWidth: "200px",
                    fontFamily: "Arial",
                  }}
                >
                  {permitNumber || ""}
                </span>
              </div>
            </td>
          </tr>

          {/* Course + Major */}
          <tr>
            <td colSpan={20}>
              <div
                style={{ display: "flex", alignItems: "center", width: "100%" }}
              >
                <label style={{ fontWeight: "bold", marginRight: "10px" }}>
                  Course Applied:
                </label>
                <span
                  style={{
                    flexGrow: 1,
                    borderBottom: "1px solid black",
                    minWidth: "220px",
                    fontFamily: "Arial",
                  }}
                >
                  {curriculumOptions.find(
                    (c) =>
                      c.curriculum_id?.toString() ===
                      (person?.program ?? "").toString(),
                  )?.program_description || ""}
                </span>
              </div>
            </td>
            <td colSpan={20}>
              <div
                style={{ display: "flex", alignItems: "center", width: "100%" }}
              >
                <label style={{ fontWeight: "bold", marginRight: "10px" }}>
                  Major:
                </label>
                <span
                  style={{
                    flexGrow: 1,
                    borderBottom: "1px solid black",
                    minWidth: "200px",
                    height: "12px",
                    fontFamily: "Arial",
                  }}
                >
                  {curriculumOptions.find(
                    (c) =>
                      c.curriculum_id?.toString() ===
                      (person?.program ?? "").toString(),
                  )?.major || ""}
                </span>
              </div>
            </td>
          </tr>

          {/* Date of Exam + Time */}
          <tr style={{ fontFamily: "Arial", fontSize: "15px" }}>
            <td colSpan={20}>
              <div
                style={{ display: "flex", alignItems: "center", width: "100%" }}
              >
                <label
                  style={{
                    fontWeight: "bold",
                    whiteSpace: "nowrap",
                    marginRight: "10px",
                  }}
                >
                  Date of Exam:
                </label>
                <span
                  style={{
                    flexGrow: 1,
                    borderBottom: "1px solid black",
                    height: "1.2em",
                    fontFamily: "Arial",
                    textAlign: "left",
                  }}
                >
                  {examSchedule?.schedule_created_at
                    ? new Date(
                        examSchedule.schedule_created_at,
                      ).toLocaleDateString("en-US", {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })
                    : ""}
                </span>
              </div>
            </td>
            <td colSpan={20}>
              <div
                style={{ display: "flex", alignItems: "center", width: "100%" }}
              >
                <label
                  style={{
                    fontWeight: "bold",
                    whiteSpace: "nowrap",
                    marginRight: "10px",
                  }}
                >
                  Time:
                </label>
                <span
                  style={{
                    flexGrow: 1,
                    borderBottom: "1px solid black",
                    height: "1.2em",
                    fontFamily: "Arial",
                    textAlign: "left",
                  }}
                >
                  {examSchedule
                    ? new Date(
                        `1970-01-01T${examSchedule.start_time}`,
                      ).toLocaleTimeString("en-US", {
                        hour: "numeric",
                        minute: "2-digit",
                        hour12: true,
                      })
                    : ""}
                </span>
              </div>
            </td>
          </tr>

          {/* Bldg. / Floor / Room No. — 3 even columns */}
          <tr style={{ fontFamily: "Arial", fontSize: "15px" }}>
            <td colSpan={16}>
              <div
                style={{ display: "flex", alignItems: "center", gap: "6px" }}
              >
                <label style={{ fontWeight: "bold", whiteSpace: "nowrap" }}>
                  Building:
                </label>
                <span
                  style={{
                    flexGrow: 1,
                    borderBottom: "1px solid black",
                    height: "1.2em",
                    fontFamily: "Arial",
                    textAlign: "left",
                  }}
                >
                  {examSchedule?.building_description || ""}
                </span>
              </div>
            </td>
            <td colSpan={8}>
              <div
                style={{ display: "flex", alignItems: "center", gap: "6px" }}
              >
                <label style={{ fontWeight: "bold", whiteSpace: "nowrap" }}>
                  Floor :
                </label>
                <span
                  style={{
                    flexGrow: 1,
                    borderBottom: "1px solid black",
                    height: "1.2em",
                    fontFamily: "Arial",
                    textAlign: "center",
                  }}
                >
                  {examSchedule?.floor !== undefined &&
                  examSchedule?.floor !== null
                    ? getOrdinal(examSchedule.floor)
                    : ""}
                </span>
              </div>
            </td>
            <td colSpan={16}>
              <div
                style={{ display: "flex", alignItems: "center", gap: "6px" }}
              >
                <label style={{ fontWeight: "bold", whiteSpace: "nowrap" }}>
                  Room No.:
                </label>
                <span
                  style={{
                    flexGrow: 1,
                    borderBottom: "1px solid black",
                    height: "1.2em",
                    fontFamily: "Arial",
                    textAlign: "left",
                  }}
                >
                  {examSchedule?.room_description || ""}
                </span>
              </div>
            </td>
          </tr>

          {/* Date Verified / Scheduled by — 2 even columns */}
          <tr style={{ fontFamily: "Arial", fontSize: "15px" }}>
            <td colSpan={20}>
              <div
                style={{ display: "flex", alignItems: "center", width: "100%" }}
              >
                <label
                  style={{
                    fontWeight: "bold",
                    whiteSpace: "nowrap",
                    marginRight: "10px",
                  }}
                >
                  Date Verified:
                </label>
                <span
                  style={{
                    flexGrow: 1,
                    borderBottom: "1px solid black",
                    height: "1.2em",
                    fontFamily: "Arial",
                    textAlign: "left",
                  }}
                >
                  {verifiedAt
                    ? new Date(verifiedAt).toLocaleDateString("en-US", {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })
                    : ""}
                </span>
              </div>
            </td>
            <td colSpan={20}>
              <div
                style={{ display: "flex", alignItems: "center", width: "100%" }}
              >
                <label
                  style={{
                    fontWeight: "bold",
                    whiteSpace: "nowrap",
                    marginRight: "10px",
                  }}
                >
                  Scheduled by:
                </label>
                <span
                  style={{
                    flexGrow: 1,
                    borderBottom: "1px solid black",
                    height: "1.2em",
                    fontFamily: "Arial",
                    textAlign: "left",
                  }}
                >
                  {scheduledBy || "N/A"}
                </span>
              </div>
            </td>
          </tr>

          {/* Signature line (left) + Centered QR code (right), aligned to same height */}
          <tr>
            <td
              colSpan={20}
              style={{
                paddingTop: "24px",
                paddingBottom: "16px",
                verticalAlign: "middle",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  height: "200px",
                }}
              >
                <div style={{ width: "360px", textAlign: "center" }}>
                  {/* Space to sign */}
                  <div style={{ height: "30px" }} />
                  <div
                    style={{
                      borderTop: "1px solid black",
                      width: "100%",
                      marginBottom: "8px",
                    }}
                  />
                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: "600",
                      letterSpacing: "0.3px",
                      color: "black",
                    }}
                  >
                    Signature over Printed Name
                  </span>
                </div>
              </div>
            </td>

            <td
              colSpan={20}
              style={{
                paddingTop: "24px",
                paddingBottom: "16px",
                verticalAlign: "middle",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  alignItems: "center",
                  height: "200px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <div
                    style={{
                      width: "190px",
                      height: "190px",
                      borderRadius: "10px",
                      border: "1px solid black",
                      background: "#fff",
                      boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      position: "relative",
                      overflow: "hidden",
                    }}
                  >
                    {attendanceToken ? (
                      <>
                        <QRCodeSVG
                          value={attendanceToken}
                          size={150}
                          level="H"
                        />

                        {person?.applicant_number && (
                          <div
                            style={{
                              position: "absolute",
                              top: "50%",
                              left: "50%",
                              transform: "translate(-50%, -50%)",
                              fontSize: "12px",
                              fontWeight: "700",
                              color: "maroon",
                              background: "rgba(255,255,255,0.92)",
                              padding: "3px 7px",
                              borderRadius: "4px",
                              textAlign: "center",
                              whiteSpace: "nowrap",
                              boxShadow: "0 0 0 1px rgba(128,0,0,0.15)",
                            }}
                          >
                            {person.applicant_number}
                          </div>
                        )}
                      </>
                    ) : (
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          gap: "6px",
                        }}
                      >
                        <span
                          style={{
                            fontSize: "22px",
                            color: "#ccc",
                          }}
                        >
                          ⬚
                        </span>

                        <span
                          style={{
                            fontSize: "11px",
                            color: "#999",
                            textAlign: "center",
                            padding: "0 14px",
                            lineHeight: "1.4",
                          }}
                        >
                          No attendance QR yet
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <table
        className="student-table"
        style={{
          borderCollapse: "collapse",
          fontFamily: "Arial",
          width: "8in",
          margin: "0 auto",
          textAlign: "center",
          tableLayout: "fixed",
          border: "1px solid black",
        }}
      >
        <tbody>
          <tr>
            <td
              colSpan={40}
              style={{
                color: "black",
                padding: "12px",
                lineHeight: "1.6",
                textAlign: "left",
                fontSize: "14px",
                fontFamily: "Arial",
              }}
            >
              <strong>IMPORTANT REMINDERS FOR APPLICANTS:</strong>
              <ul style={{ marginTop: "8px" }}>
                <strong>Step 1:</strong> Check your Examination Date, Time, and
                Room Number indicated on your permit.
                <br />
                <strong>Step 2:</strong> Bring all required items on the exam
                day:
                <ul>
                  <li>
                    Official Examination Permit with VERIFIED watermark on it
                  </li>
                  <li>No. 2 Pencil (any brand)</li>
                  <li>2 Short bond papers</li>
                </ul>
                <strong>Step 3:</strong> Wear the proper attire:
                <ul>
                  <li>
                    Plain white T-shirt or plain white polo shirt{" "}
                    <strong>(no prints, no logos, no designs)</strong>
                  </li>
                  <li>Pants (Shorts and ripped jeans are not allowed)</li>
                  <li>Closed shoes (no crocs, sandals, slippers)</li>
                </ul>
                <strong>Step 4:</strong> Keep the two paper sheets attached to
                your exam permit.
                <br />
                <strong>Step 5:</strong> Please Arrive at least 1 hour before
                your examination time. Late applicants will NOT be allowed to
                enter once the exam room door closes.
                <br />
                <br />
                <div style={{ textAlign: "center", marginLeft: "-50px" }}>
                  <strong>GOOD LUCK TO ALL ASPIRING APPLICANTS!</strong>
                </div>
              </ul>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};

export default ExamPermit;
