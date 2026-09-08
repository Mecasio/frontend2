import React, {
  useState,
  useEffect,
  useContext,
  useRef,
  forwardRef,
  useImperativeHandle,
} from "react";

import { SettingsContext } from "../App";
import { Box, Container } from "@mui/material";
import EaristLogo from "../assets/EaristLogo.png";
import ForwardIcon from "@mui/icons-material/Forward";
import API_BASE_URL from "../apiConfig";

/**
 * EmptyAdmissionFormProcess
 * ──────────────────────────────────────────────────────────────────────────
 * This is a 1:1 structural clone of AdmissionFormProcess.jsx — same table,
 * same colSpans, same widths/heights, same header layout, same two-copy
 * (College Dean's / Registrar's) print structure. The ONLY differences are:
 *   1. Every {person.xxx} value is blank (no data to fill in with).
 *   2. The QR code / 1x1 photo box on the right of the header is an empty
 *      bordered box of the exact same size — no QR code, no image needed.
 *
 * Because the markup is identical, it prints/exports pixel-for-pixel the
 * same as AdmissionFormProcess through the SAME backend route
 * (/api/generate-admission-form-pdf) — no new PDF route needed for layout,
 * only if you want a distinct filename/audit label (see chat notes).
 */
const EmptyAdmissionFormProcess = forwardRef((props, ref) => {
  const { controlNumber: controlNumberProp } = props;
  const settings = useContext(SettingsContext);
  const branding = settings?.branding || {};
  const assets = settings?.assets || {};

  const [fetchedLogo, setFetchedLogo] = useState(null);
  const [companyName, setCompanyName] = useState("");
  const [shortTerm, setShortTerm] = useState("");
  const [campusAddress, setCampusAddress] = useState("");

  useEffect(() => {
    if (!settings) return;

    if (assets.logoUrl) {
      setFetchedLogo(assets.logoUrl);
    } else {
      setFetchedLogo(EaristLogo);
    }

    if (branding.companyName) setCompanyName(branding.companyName);
    if (branding.shortTerm) setShortTerm(branding.shortTerm);
    setCampusAddress(branding.campusAddress || "");
  }, [settings]);

  const words = companyName.trim().split(" ");
  const middle = Math.ceil(words.length / 2);
  const firstLine = words.slice(0, middle).join(" ");
  const secondLine = words.slice(middle).join(" ");

  const controlNumber = controlNumberProp || null;

  const divToPrintRef = useRef();
  useImperativeHandle(ref, () => divToPrintRef.current, []);

  document.addEventListener("contextmenu", (e) => e.preventDefault());

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

  return (
    <Box
      sx={{
        height: "calc(100vh - 150px)",
        overflowY: "auto",
        paddingRight: 1,
        backgroundColor: "transparent",
        mt: 1,
        padding: 2,
      }}
    >
      <Container>
        <div ref={divToPrintRef} style={{ marginBottom: "10%" }}>
          {/* ─── COPY 1: College Dean's Copy ────────────────────────────── */}
          <Container>
            <div
              className="student-table"
              style={{
                width: "8in",
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
                  justifyContent: "space-between",
                  flexWrap: "nowrap",
                }}
              >
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
                      borderRadius: "50%",
                    }}
                  />
                  {controlNumber && (
                    <div
                      style={{
                        fontSize: "13px",
                        fontWeight: "bold",
                        color: "#8B0000",
                        textAlign: "center",
                      }}
                    >
                      Document No.: {controlNumber}
                    </div>
                  )}
                </div>

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
                  <div style={{ fontFamily: "Arial", fontSize: "13px" }}>
                    Republic of the Philippines
                  </div>
                  <div
                    style={{
                      fontWeight: "bold",
                      fontFamily: "Arial",
                      fontSize: "16px",
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
                        fontSize: "16px",
                        textTransform: "Uppercase",
                      }}
                    >
                      {secondLine}
                    </div>
                  )}
                  {campusAddress && (
                    <div style={{ fontSize: "13px", fontFamily: "Arial" }}>
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

                  <br />

                  <div
                    style={{
                      fontSize: "12px",
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

                <div
                  style={{
                    display: "flex",
                    flexDirection: "row",
                    alignItems: "center",
                    marginRight: "10px",
                    gap: "10px",
                  }}
                >
                  {/* Same size/position as the QR/photo box in the filled
                      form — left empty, no QR code or 1x1 photo needed. */}
                  <div
                    style={{
                      width: "1.3in",
                      height: "1.3in",
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      border: "1px solid black",
                      background: "#fff",
                      flexShrink: 0,
                      position: "relative",
                    }}
                  />
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
              <tr>
                <td
                  colSpan={40}
                  style={{ fontSize: "12px", paddingTop: "5px", marginTop: 0 }}
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
                          height: "20px",
                          textAlign: "center",
                          fontSize: "12px",
                          borderBottom: "1px solid black",
                        }}
                      />
                      <span
                        style={{
                          width: "25%",
                          height: "20px",
                          textAlign: "center",
                          fontSize: "12px",
                          borderBottom: "1px solid black",
                        }}
                      />
                      <span
                        style={{
                          width: "25%",
                          height: "20px",
                          textAlign: "center",
                          fontSize: "12px",
                          borderBottom: "1px solid black",
                        }}
                      />
                      <span
                        style={{
                          width: "25%",
                          height: "20px",
                          textAlign: "center",
                          fontSize: "12px",
                          borderBottom: "1px solid black",
                        }}
                      />
                    </div>
                  </div>
                </td>
              </tr>

              <tr>
                <td
                  colSpan={40}
                  style={{ fontSize: "12px", paddingTop: "2px" }}
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

              <tr style={{ fontSize: "12px" }}>
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
                      <div style={{ marginTop: "2px" }} className="dataField" />
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
                      <div style={{ marginTop: "2px" }} className="dataField" />
                    </span>
                  </div>
                </td>
              </tr>

              <tr style={{ fontSize: "12px" }}>
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
                      <div style={{ marginTop: "2px" }} className="dataField" />
                    </span>
                  </div>
                </td>
              </tr>

              <tr style={{ fontSize: "12px" }}>
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
                      <div style={{ marginTop: "2px" }} className="dataField" />
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
                      <div style={{ marginTop: "2px" }} className="dataField" />
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
                      <div style={{ marginTop: "2px" }} className="dataField" />
                    </span>
                  </div>
                </td>
              </tr>

              <tr style={{ fontSize: "12px" }}>
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
                      <div style={{ marginTop: "2px" }} className="dataField" />
                    </span>
                  </div>
                </td>
                <td colSpan={14}>
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
                      Place of Birth:
                    </label>
                    <span
                      style={{
                        flex: 1,
                        borderBottom: "1px solid black",
                        height: "1.3em",
                        fontSize: "12px",
                        minWidth: 0,
                        whiteSpace: "normal",
                        overflowWrap: "break-word",
                        wordBreak: "break-word",
                      }}
                    >
                      <div className="dataField">&nbsp;</div>
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
                      <div style={{ marginTop: "2px" }} className="dataField" />
                    </span>
                  </div>
                </td>
              </tr>

              <tr style={{ fontSize: "12px" }}>
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
                    />
                  </div>
                </td>

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
                      <div style={{ marginTop: "2px" }} className="dataField" />
                    </span>
                  </div>
                </td>

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
                      <div style={{ marginTop: "2px" }} className="dataField" />
                    </span>
                  </div>
                </td>

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
                      <div style={{ marginTop: "2px" }} className="dataField" />
                    </span>
                  </div>
                </td>
              </tr>

              <tr style={{ fontSize: "12px" }}>
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
                      <div style={{ marginTop: "2px" }} className="dataField" />
                    </span>
                  </div>
                </td>
              </tr>

              <tr style={{ fontSize: "12px" }}>
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
                        whiteSpace: "normal",
                        wordWrap: "break-word",
                        lineHeight: "1.4em",
                        paddingBottom: "2px",
                      }}
                    >
                      &nbsp;
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
                      &nbsp;
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
                  style={{ height: "0.2in", fontSize: "72.5%", color: "white" }}
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
                    fontSize: "12px",
                  }}
                ></td>
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
                      fontSize: 70,
                      "@media print": { fontSize: 14, margin: 0 },
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
                    fontSize: "12px",
                  }}
                ></td>
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
                  colSpan={5}
                  style={{ textAlign: "center", verticalAlign: "middle" }}
                >
                  <ForwardIcon
                    sx={{
                      marginTop: "-53px",
                      fontSize: 70,
                      "@media print": { fontSize: 14, margin: 0 },
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
                  style={{ textAlign: "center", verticalAlign: "middle" }}
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
                  style={{ textAlign: "center", verticalAlign: "middle" }}
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
                    fontSize: "12px",
                  }}
                ></td>
                <td
                  colSpan={5}
                  style={{ textAlign: "center", verticalAlign: "middle" }}
                >
                  <ForwardIcon
                    sx={{
                      marginTop: "-53px",
                      fontSize: 70,
                      "@media print": { fontSize: 14, margin: 0 },
                    }}
                  />
                </td>

                <td
                  colSpan={11}
                  style={{
                    height: "50px",
                    fontSize: "12px",
                    fontFamily: "Arial",
                    border: "1px solid black",
                    padding: "8px",
                    textAlign: "left",
                  }}
                ></td>
                <td
                  colSpan={5}
                  style={{ textAlign: "center", verticalAlign: "middle" }}
                >
                  <ForwardIcon
                    sx={{
                      marginTop: "-53px",
                      fontSize: 70,
                      "@media print": { fontSize: 14, margin: 0 },
                    }}
                  />
                </td>
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
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginTop: "10px",
                      fontSize: "12px",
                      color: "black",
                      fontWeight: "normal",
                    }}
                  >
                    <span>
                      {branding.shortTerm || shortTerm}-QSF-AS-001 Rev. 00
                      (7.3.25)
                    </span>
                    <span>College Dean's Copy</span>
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

          {/* ─── COPY 2: Registrar's Copy ───────────────────────────────── */}
          <Container>
            <div
              style={{
                width: "8in",
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
                  justifyContent: "space-between",
                  flexWrap: "nowrap",
                }}
              >
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
                      borderRadius: "50%",
                    }}
                  />
                  {controlNumber && (
                    <div
                      style={{
                        fontSize: "12px",
                        fontWeight: "bold",
                        color: "#8B0000",
                        textAlign: "center",
                      }}
                    >
                      Document No.: {controlNumber}
                    </div>
                  )}
                </div>

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
                  <div style={{ fontFamily: "Arial", fontSize: "13px" }}>
                    Republic of the Philippines
                  </div>
                  <div
                    style={{
                      fontWeight: "bold",
                      fontFamily: "Arial",
                      fontSize: "16px",
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
                        fontSize: "16px",
                        textTransform: "Uppercase",
                      }}
                    >
                      {secondLine}
                    </div>
                  )}
                  {campusAddress && (
                    <div style={{ fontSize: "13px", fontFamily: "Arial" }}>
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

                  <br />

                  <div
                    style={{
                      fontSize: "12px",
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

                <div
                  style={{
                    display: "flex",
                    flexDirection: "row",
                    alignItems: "center",
                    marginRight: "10px",
                    gap: "10px",
                  }}
                >
                  <div
                    style={{
                      width: "1.3in",
                      height: "1.3in",
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      border: "1px solid black",
                      background: "#fff",
                      flexShrink: 0,
                      position: "relative",
                    }}
                  />
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
              <tr>
                <td
                  colSpan={40}
                  style={{ fontSize: "12px", paddingTop: "5px", marginTop: 0 }}
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
                          fontSize: "12px",
                          borderBottom: "1px solid black",
                        }}
                      />
                      <span
                        style={{
                          width: "25%",
                          textAlign: "center",
                          fontSize: "12px",
                          borderBottom: "1px solid black",
                        }}
                      />
                      <span
                        style={{
                          width: "25%",
                          textAlign: "center",
                          fontSize: "12px",
                          borderBottom: "1px solid black",
                        }}
                      />
                      <span
                        style={{
                          width: "25%",
                          textAlign: "center",
                          fontSize: "12px",
                          borderBottom: "1px solid black",
                        }}
                      />
                    </div>
                  </div>
                </td>
              </tr>

              <tr>
                <td
                  colSpan={40}
                  style={{ fontSize: "12px", paddingTop: "2px" }}
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

              <tr style={{ fontSize: "12px" }}>
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
                      <div
                        style={{ marginTop: "-3px" }}
                        className="dataField"
                      />
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
                      <div
                        style={{ marginTop: "-3px" }}
                        className="dataField"
                      />
                    </span>
                  </div>
                </td>
              </tr>

              <tr style={{ fontSize: "12px" }}>
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
                      <div
                        style={{ marginTop: "-3px" }}
                        className="dataField"
                      />
                    </span>
                  </div>
                </td>
              </tr>

              <tr style={{ fontSize: "12px" }}>
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
                      <div
                        style={{ marginTop: "-3px" }}
                        className="dataField"
                      />
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
                      <div
                        style={{ marginTop: "-3px" }}
                        className="dataField"
                      />
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
                      <div
                        style={{ marginTop: "-3px" }}
                        className="dataField"
                      />
                    </span>
                  </div>
                </td>
              </tr>

              <tr style={{ fontSize: "12px" }}>
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
                      <div
                        style={{ marginTop: "-3px" }}
                        className="dataField"
                      />
                    </span>
                  </div>
                </td>
                <td colSpan={14}>
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
                      Place of Birth:
                    </label>
                    <span
                      style={{
                        flex: 1,
                        borderBottom: "1px solid black",
                        fontSize: "12px",
                        minWidth: 0,
                        whiteSpace: "normal",
                        overflowWrap: "break-word",
                        wordBreak: "break-word",
                      }}
                    >
                      <div className="dataField">&nbsp;</div>
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
                      <div
                        style={{ marginTop: "-3px" }}
                        className="dataField"
                      />
                    </span>
                  </div>
                </td>
              </tr>

              <tr style={{ fontSize: "12px" }}>
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
                    />
                  </div>
                </td>

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
                      <div
                        style={{ marginTop: "-3px" }}
                        className="dataField"
                      />
                    </span>
                  </div>
                </td>

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
                      <div
                        style={{ marginTop: "-3px" }}
                        className="dataField"
                      />
                    </span>
                  </div>
                </td>

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
                      <div
                        style={{ marginTop: "-3px" }}
                        className="dataField"
                      />
                    </span>
                  </div>
                </td>
              </tr>

              <tr style={{ fontSize: "12px" }}>
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
                      <div
                        style={{ marginTop: "-3px" }}
                        className="dataField"
                      />
                    </span>
                  </div>
                </td>
              </tr>

              <tr style={{ fontSize: "12px" }}>
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
                        whiteSpace: "normal",
                        wordWrap: "break-word",
                        lineHeight: "1.4em",
                        paddingBottom: "2px",
                      }}
                    >
                      &nbsp;
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
                      &nbsp;
                    </div>
                  </div>
                </td>
              </tr>

              <tr>
                <td colSpan="40" style={{ height: "10px" }}></td>
              </tr>

              <tr>
                <td
                  colSpan={40}
                  style={{ height: "0.2in", fontSize: "72.5%", color: "white" }}
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
                    fontSize: "12px",
                  }}
                ></td>
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
                      fontSize: 70,
                      "@media print": { fontSize: 14, margin: 0 },
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
                    fontSize: "12px",
                  }}
                ></td>
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
                  colSpan={5}
                  style={{ textAlign: "center", verticalAlign: "middle" }}
                >
                  <ForwardIcon
                    sx={{
                      marginTop: "-53px",
                      fontSize: 70,
                      "@media print": { fontSize: 14, margin: 0 },
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
                  style={{ textAlign: "center", verticalAlign: "middle" }}
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
                  style={{ textAlign: "center", verticalAlign: "middle" }}
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
                    fontSize: "12px",
                  }}
                ></td>
                <td
                  colSpan={5}
                  style={{ textAlign: "center", verticalAlign: "middle" }}
                >
                  <ForwardIcon
                    sx={{
                      marginTop: "-53px",
                      fontSize: 70,
                      "@media print": { fontSize: 14, margin: 0 },
                    }}
                  />
                </td>

                <td
                  colSpan={11}
                  style={{
                    height: "50px",
                    fontSize: "12px",
                    fontFamily: "Arial",
                    border: "1px solid black",
                    padding: "8px",
                    textAlign: "left",
                  }}
                ></td>
                <td
                  colSpan={5}
                  style={{ textAlign: "center", verticalAlign: "middle" }}
                >
                  <ForwardIcon
                    sx={{
                      marginTop: "-53px",
                      fontSize: 70,
                      "@media print": { fontSize: 14, margin: 0 },
                    }}
                  />
                </td>
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
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginTop: "10px",
                      fontSize: "12px",
                      color: "black",
                      fontWeight: "normal",
                    }}
                  >
                    <span>
                      {branding.shortTerm || shortTerm}-QSF-AS-001 Rev. 00
                      (7.3.25)
                    </span>
                    <span>Registrar's Copy</span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Container>
    </Box>
  );
});

export default EmptyAdmissionFormProcess;
