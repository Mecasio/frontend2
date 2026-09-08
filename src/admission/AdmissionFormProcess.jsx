import React, {
  useState,
  useEffect,
  useContext,
  useRef,
  forwardRef,
  useImperativeHandle,
} from "react";

import { SettingsContext } from "../App";
import { Box, Container, Typography } from "@mui/material";
import EaristLogo from "../assets/EaristLogo.png";
import { FcPrint } from "react-icons/fc";
import axios from "axios";
import { useLocation } from "react-router-dom";
import ForwardIcon from "@mui/icons-material/Forward";
import API_BASE_URL from "../apiConfig";
import { getFlatAuditHeaders } from "../utils/auditEvents";
import useAuditMac from "../utils/useAuditMac";
import { QRCodeSVG } from "qrcode.react";
import DownloadIcon from "@mui/icons-material/Download";

const AdmissionFormProcess = forwardRef((props, ref) => {
  useAuditMac();
  const { personId: personIdProp, controlNumber: controlNumberProp } = props;
  const settings = useContext(SettingsContext);
  const branding = settings?.branding || {};
  const assets = settings?.assets || {};
  const [ownControlNumber, setOwnControlNumber] = useState(null);
  const controlNumber = controlNumberProp ?? ownControlNumber;

  const fetchedLogo = assets.logoUrl || EaristLogo;
  const companyName = branding.companyName || "";
  const shortTerm = branding.shortTerm || "";
  const campusAddressFallback = branding.campusAddress || "";
  const branches = settings?.branches || [];
  const [, setGeneratingPdf] = useState(false);

  const words = companyName.trim().split(" ");
  const middle = Math.ceil(words.length / 2);
  const firstLine = words.slice(0, middle).join(" ");
  const secondLine = words.slice(middle).join(" ");

  const [userID, setUserID] = useState("");
  const [user, setUser] = useState("");
  const [userRole, setUserRole] = useState("");
  const [person, setPerson] = useState({
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
    facebookAccount: "",
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
  });

  const matchedBranch = branches.find(
    (branch) => String(branch?.id) === String(person?.campus),
  );
  const campusAddress = matchedBranch?.address || campusAddressFallback;

  const fetchPersonData = async (id) => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/person/${id}`);
      setPerson(res.data);
    } catch (error) {
      console.error("Failed to fetch person:", error);
    }
  };

  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const queryPersonId = queryParams.get("person_id");

  useEffect(() => {
    const storedUser = localStorage.getItem("email");
    const storedRole = localStorage.getItem("role");
    const loggedInPersonId = localStorage.getItem("person_id");

    if (!storedUser || !storedRole || !loggedInPersonId) {
      window.location.href = "/login";
      return;
    }

    setUser(storedUser);
    setUserRole(storedRole);

    const allowedRoles = ["registrar", "applicant", "student"];
    if (!allowedRoles.includes(storedRole)) {
      window.location.href = "/login";
      return;
    }

    // ⬅️ prefer the id passed in from a parent (e.g. ExaminationProfile),
    // fall back to the query string for the standalone page.
    const effectivePersonId = personIdProp || queryPersonId;

    if (effectivePersonId && String(effectivePersonId).trim() !== "") {
      setUserID(effectivePersonId);
      fetchPersonData(effectivePersonId);
    } else {
      setUserID("");
      setPerson({});
    }
  }, [queryPersonId, personIdProp]); // ⬅️ add personIdProp to deps

  const [shortDate, setShortDate] = useState("");

  useEffect(() => {
    const updateDates = () => {
      const now = new Date();

      const formattedShort = `${String(now.getMonth() + 1).padStart(2, "0")}/${String(now.getDate()).padStart(2, "0")}/${now.getFullYear()}`;
      setShortDate(formattedShort);

      const day = String(now.getDate()).padStart(2, "0");
      const month = String(now.getMonth() + 1).padStart(2, "0");
      const year = now.getFullYear();
      const hours = String(now.getHours() % 12 || 12).padStart(2, "0");
      const minutes = String(now.getMinutes()).padStart(2, "0");
      const seconds = String(now.getSeconds()).padStart(2, "0");
      const ampm = now.getHours() >= 12 ? "PM" : "AM";
    };

    updateDates();
    const interval = setInterval(updateDates, 1000);

    return () => clearInterval(interval);
  }, []);

  const divToPrintRef = useRef();

  useImperativeHandle(ref, () => divToPrintRef.current, []);

  const printDiv = async () => {
    await fetchOwnControlNumber("print");
    setTimeout(() => {
      const divToPrint = divToPrintRef.current;
      if (!divToPrint) return console.error("divToPrintRef is not set.");

      const newWin = window.open("", "Print-Window");
      newWin.document.open();
      newWin.document.write(`
      <html>
        <head>
          <title>Print</title>
          <style>
              @page {
              size: A4;
              margin: 0;
            }

            html, body {
              margin: 0;
              padding: 0;
              width: 210mm;
              height: 297mm;
              font-family: Arial;
              overflow: hidden;
            }

            *, *::before, *::after {
              box-sizing: border-box;
              margin: 0;
              padding: 0;
            }

            .print-container {
              width: 100%;
              height: auto;
              padding: 10px 20px;
              transform: scale(0.88);
            }

            .student-table {
              margin-top: -70px !important;
            }

            button {
              display: none;
            }

            .dataField {
              margin-top: 2px !important;
            }

            svg.MuiSvgIcon-root {
              margin-top: -53px;
              width: 70px !important;
              height: 70px !important;
            }
          </style>
        </head>
        <body onload="window.print(); setTimeout(() => window.close(), 100);">
          <div class="print-container">
            ${divToPrint.innerHTML}
          </div>
        </body>
      </html>
    `);
      newWin.document.close();
    }, 200);
  };

  const fetchOwnControlNumber = async (actionType) => {
    try {
      const res = await axios.post(
        `${API_BASE_URL}/api/generate-control-number`,
        {
          form_type: "admissionFormProcess",
          applicant_number: person?.applicant_number,
          person_id: userID,
          action_type: actionType,
        },
      );
      setOwnControlNumber(res.data.control_number);
      return res.data.control_number;
    } catch (err) {
      console.error("Failed to generate control number:", err);
      return null;
    }
  };

  const downloadPDF = async () => {
    const divToPrint = divToPrintRef.current;
    if (!divToPrint) {
      console.error("divToPrintRef is not set.");
      return;
    }

    setGeneratingPdf(true);

    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/generate-admission-form-pdf`,
        {
          html: divToPrint.innerHTML,
          applicant_number: person?.applicant_number || "",
          last_name: person?.last_name || "",
          first_name: person?.first_name || "",
        },
        { responseType: "blob" },
      );

      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);

      const lastName = (person?.last_name || "Applicant")
        .trim()
        .replace(/\s+/g, "_");
      const firstName = (person?.first_name || "").trim().replace(/\s+/g, "_");
      const applicantNo = person?.applicant_number
        ? `_${person.applicant_number}`
        : "";
      const fileName = `Admission_Form_Process_${lastName}${firstName ? "_" + firstName : ""}${applicantNo}.pdf`;

      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Failed to generate PDF:", error);
      alert("Something went wrong while generating the PDF. Please try again.");
    } finally {
      setGeneratingPdf(false);
    }
  };

  const [curriculumOptions, setCurriculumOptions] = useState([]);

  useEffect(() => {
    const fetchCurriculums = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/api/applied_program`);
        setCurriculumOptions(response.data);
      } catch (error) {
        console.error("Error fetching curriculum options:", error);
      }
    };

    fetchCurriculums();
  }, []);

  {
    curriculumOptions.find(
      (item) =>
        item?.curriculum_id?.toString() === (person?.program ?? "").toString(),
    )?.program_description ||
      (person?.program ?? "");
  }

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
                    <div
                      style={{
                        fontSize: "13px",
                        fontFamily: "Arial",
                      }}
                    >
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
                          fontSize: "12px",
                          borderBottom: "1px solid black",
                        }}
                      >
                        {person.last_name}
                      </span>
                      <span
                        style={{
                          width: "25%",
                          textAlign: "center",
                          fontSize: "12px",
                          borderBottom: "1px solid black",
                        }}
                      >
                        {person.first_name}
                      </span>
                      <span
                        style={{
                          width: "25%",
                          textAlign: "center",
                          fontSize: "12px",
                          borderBottom: "1px solid black",
                        }}
                      >
                        {person.middle_name}
                      </span>
                      <span
                        style={{
                          width: "25%",
                          textAlign: "center",
                          fontSize: "12px",
                          borderBottom: "1px solid black",
                        }}
                      >
                        {person.extension}
                      </span>
                    </div>
                  </div>
                </td>
              </tr>

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
                        {person.applicant_number}
                      </div>
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
                      <div style={{ marginTop: "-3px" }} className="dataField">
                        {person.permanentStreet} {person.permanentBarangay}{" "}
                        {person.permanentMunicipality} {person.permanentRegion}{" "}
                        {person.permanentZipCode}
                      </div>
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
                      <div className="dataField">{person.birthPlace}</div>
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
                    ></span>
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
                      <div style={{ marginTop: "-3px" }} className="dataField">
                        {person.classifiedAs === "Freshman (First Year)"
                          ? "✓"
                          : ""}
                      </div>
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
                      <div style={{ marginTop: "-3px" }} className="dataField">
                        {person.schoolLastAttended1}
                      </div>
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
                    color: "white",
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
                      "@media print": {
                        fontSize: 14,
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
                  style={{
                    textAlign: "center",
                    verticalAlign: "middle",
                  }}
                >
                  <ForwardIcon
                    sx={{
                      marginTop: "-53px",
                      fontSize: 70,
                      "@media print": {
                        fontSize: 14,
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
                    fontSize: "12px",
                  }}
                ></td>
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
                      fontSize: 70,
                      "@media print": {
                        fontSize: 14,
                        margin: 0,
                      },
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
                  style={{
                    textAlign: "center",
                    verticalAlign: "middle",
                  }}
                >
                  <ForwardIcon
                    sx={{
                      marginTop: "-53px",
                      fontSize: 70,
                      "@media print": {
                        fontSize: 14,
                        margin: 0,
                      },
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
                      {shortTerm}-QSF-AS-001 Rev. 00
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
                    <div
                      style={{
                        fontSize: "13px",
                        fontFamily: "Arial",
                      }}
                    >
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
                          fontSize: "12px",
                          borderBottom: "1px solid black",
                        }}
                      >
                        {person.last_name}
                      </span>
                      <span
                        style={{
                          width: "25%",
                          textAlign: "center",
                          fontSize: "12px",
                          borderBottom: "1px solid black",
                        }}
                      >
                        {person.first_name}
                      </span>
                      <span
                        style={{
                          width: "25%",
                          textAlign: "center",
                          fontSize: "12px",
                          borderBottom: "1px solid black",
                        }}
                      >
                        {person.middle_name}
                      </span>
                      <span
                        style={{
                          width: "25%",
                          textAlign: "center",
                          fontSize: "12px",
                          borderBottom: "1px solid black",
                        }}
                      >
                        {person.extension}
                      </span>
                    </div>
                  </div>
                </td>
              </tr>

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
                        {person.applicant_number}
                      </div>
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
                      <div style={{ marginTop: "-3px" }} className="dataField">
                        {person.permanentStreet} {person.permanentBarangay}{" "}
                        {person.permanentMunicipality} {person.permanentRegion}{" "}
                        {person.permanentZipCode}
                      </div>
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
                      <div className="dataField">{person.birthPlace}</div>
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
                    ></span>
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
                      <div style={{ marginTop: "-3px" }} className="dataField">
                        {person.classifiedAs === "Freshman (First Year)"
                          ? "✓"
                          : ""}
                      </div>
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
                      <div style={{ marginTop: "-3px" }} className="dataField">
                        {person.schoolLastAttended1}
                      </div>
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
                <td colSpan="40" style={{ height: "10px" }}></td>
              </tr>

              <tr>
                <td
                  colSpan={40}
                  style={{
                    height: "0.2in",
                    fontSize: "72.5%",
                    color: "white",
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
                      "@media print": {
                        fontSize: 14,
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
                  style={{
                    textAlign: "center",
                    verticalAlign: "middle",
                  }}
                >
                  <ForwardIcon
                    sx={{
                      marginTop: "-53px",
                      fontSize: 70,
                      "@media print": {
                        fontSize: 14,
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
                    fontSize: "12px",
                  }}
                ></td>
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
                      fontSize: 70,
                      "@media print": {
                        fontSize: 14,
                        margin: 0,
                      },
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
                  style={{
                    textAlign: "center",
                    verticalAlign: "middle",
                  }}
                >
                  <ForwardIcon
                    sx={{
                      marginTop: "-53px",
                      fontSize: 70,
                      "@media print": {
                        fontSize: 14,
                        margin: 0,
                      },
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
                      {shortTerm}-QSF-AS-001 Rev. 00
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

export default AdmissionFormProcess;
