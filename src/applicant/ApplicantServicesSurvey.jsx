import React, { useState, useEffect, useContext, useRef, forwardRef, useImperativeHandle } from "react";

import { SettingsContext } from "../App";
import { Box, Container, Typography } from "@mui/material";
import SentimentVerySatisfiedIcon from '@mui/icons-material/SentimentVerySatisfied';
import SentimentSatisfiedAltIcon from '@mui/icons-material/SentimentSatisfiedAlt';
import MoodBadIcon from '@mui/icons-material/MoodBad';
import SentimentVeryDissatisfiedIcon from '@mui/icons-material/SentimentVeryDissatisfied';
import SentimentSatisfiedIcon from '@mui/icons-material/SentimentSatisfied';
import { FcPrint } from "react-icons/fc";
import axios from "axios";
import API_BASE_URL from "../apiConfig";
import EaristLogo from "../assets/EaristLogo.png";
import DownloadIcon from "@mui/icons-material/Download";

const ApplicantServicesSurvey = forwardRef((props, ref) => {
    const settings = useContext(SettingsContext);
  const colors = settings?.colors || {};
  const branding = settings?.branding || {};
  const assets = settings?.assets || {};
  const headerColor = colors.header || "#1976d2";

    const [titleColor, setTitleColor] = useState("#000000");
    const [subtitleColor, setSubtitleColor] = useState("#555555");
    const [borderColor, setBorderColor] = useState("#000000");
    const [mainButtonColor, setMainButtonColor] = useState("#1976d2");
    const [subButtonColor, setSubButtonColor] = useState("#ffffff");   // ✅ NEW
    const [stepperColor, setStepperColor] = useState("#000000");       // ✅ NEW
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
        if (colors.mainButton) setMainButtonColor(colors.mainButton);
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

        // ✅ Branches (JSON stored in DB)
        setBranches(settings?.branches || []);


    }, [settings]);

    const words = companyName.trim().split(" ");
    const middleIndex = Math.ceil(words.length / 2);
    const firstLine = words.slice(0, middleIndex).join(" ");
    const secondLine = words.slice(middleIndex).join(" ");
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
        father_family_name: "", father_given_name: "", father_middle_name: "", father_ext: "", father_contact: "", father_occupation: "",
        father_income: "", father_email: "", mother_deceased: "", mother_family_name: "", mother_given_name: "", mother_middle_name: "",
        mother_contact: "", mother_occupation: "", mother_income: "", guardian: "", guardian_family_name: "", guardian_given_name: "",
        guardian_middle_name: "", guardian_ext: "", guardian_nickname: "", guardian_address: "", guardian_contact: "", guardian_email: "",
    });
    const [generatingPdf, setGeneratingPdf] = useState(false);


    useEffect(() => {
        if (!settings) return;

        const branchId = person?.campus;
        const matchedBranch = branches.find(
            (branch) => String(branch?.id) === String(branchId)
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

    const fetchPersonData = async (id) => {
        try {
            const res = await axios.get(`${API_BASE_URL}/api/person/${id}`);
            setPerson(res.data);
        } catch (error) {
            console.error("Failed to fetch person:", error);
        }
    };

    const [userID, setUserID] = useState("");
    const [user, setUser] = useState("");
    const [userRole, setUserRole] = useState("");

    // do not alter
    useEffect(() => {
        const storedUser = localStorage.getItem("email");
        const storedRole = localStorage.getItem("role");
        const storedID = localStorage.getItem("person_id");

        if (storedUser && storedRole && storedID) {
            setUser(storedUser);
            setUserRole(storedRole);
            setUserID(storedID);

            if (storedRole === "applicant" || storedRole === "registrar") {
                fetchPersonData(storedID);
            } else {
                window.location.href = "/login";
            }
        } else {
            window.location.href = "/login";
        }
    }, []);




    const divToPrintRef = useRef();
    useImperativeHandle(ref, () => divToPrintRef.current);

    const printDiv = () => {
        const divToPrint = divToPrintRef.current;
        if (divToPrint) {
            const newWin = window.open('', 'Print-Window');
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

            .print-container {
              width: 115%;
              height: 100%;
              box-sizing: border-box;
              transform: scale(0.85);
              transform-origin: top left;
                     margin-left: 10px;
            }

            input[type="checkbox"] {
              width: 12px;
              height: 12px;
              transform: scale(1);
              margin: 2px;
            }

            * {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }

            button {
              display: none;
            }

              /* FIX ICON SIZE ON PRINT */
        svg.MuiSvgIcon-root {
          width: 50px !important;
          height: 50xpx !important;
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
        } else {
            console.error("divToPrintRef is not set.");
        }
    };

   



    // 🔒 Disable right-click
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

    return (
        <Box sx={{ height: "calc(100vh - 150px)", overflowY: "auto", paddingRight: 1, backgroundColor: "transparent", mt: 1, padding: 2 }}>
    

    

            <Container className="mt-8">

                <div ref={divToPrintRef} style={{ marginBottom: "10%" }}>
                    <div>
                        <style>
                            {`
          @media print {
            button {
              display: none;
            }
          }
        `}
                        </style>

                        <br />

                        <div className="section">

                            <Container>
                                <div style={{
                                    width: "8in", // matches table width assuming 8in for 40 columns
                                    maxWidth: "100%",
                                    margin: "0 auto", // center the content

                                    boxSizing: "border-box",
                                    padding: "10px 0", // reduced horizontal padding
                                }}>

                                    <div style={{
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        flexWrap: "wrap"
                                    }}>
                                        {/* Logo */}
                                        <div style={{ flexShrink: 0, marginRight: "20px" }}>
                                            <img
                                                src={fetchedLogo}
                                                alt="School Logo"
                                                style={{
                                                    width: "120px",       // ✅ same width
                                                    height: "120px",      // ✅ same height
                                                    objectFit: "cover",   // ✅ ensures image fills circle correctly
                                                    marginLeft: "10px",
                                                    marginTop: "-25px",
                                                    borderRadius: "50%",  // ✅ perfectly circular

                                                }}
                                            />
                                        </div>


                                        <div style={{
                                            flexGrow: 1,
                                            textAlign: "center",
                                            fontSize: "12px",
                                            fontFamily: "Arial",
                                            lineHeight: 1.4,
                                            paddingTop: 0,
                                            paddingBottom: 0,
                                        }}>
                                            <div style={{
                                                marginLeft: "-145px",
                                                fontSize: "13px",
                                                fontFamily: "Arial",

                                            }}>
                                                Republic of the Philippines
                                            </div>

                                            <div
                                                style={{
                                                    marginLeft: "-145px",
                                                    fontWeight: "bold",
                                                    fontFamily: "Arial",
                                                    fontSize: "16px",
                                                    textTransform: "Uppercase"
                                                }}
                                            >
                                                {firstLine}
                                            </div>

                                            {secondLine && (
                                                <div
                                                    style={{
                                                        marginLeft: "-145px",
                                                        fontWeight: "bold",
                                                        fontFamily: "Arial",
                                                        fontSize: "16px",
                                                        textTransform: "Uppercase"
                                                    }}
                                                >
                                                    {secondLine}
                                                </div>
                                            )}

                                            <div style={{
                                                marginLeft: "-145px",
                                                fontFamily: "Arial", fontSize: "13px"

                                            }}>
                                                {/* ✅ Only dynamic campus address */}
                                                {campusAddress && (
                                                    <div style={{
                                                        fontSize: "13px",
                                                        fontFamily: "Arial",
                                                    }}>
                                                        {campusAddress}
                                                    </div>
                                                )}
                                            </div>

                                            <br />


                                            <div style={{
                                                fontSize: "20px",
                                                fontFamily: "Arial",
                                                fontWeight: "bold",
                                                marginBottom: "5px",
                                                marginTop: "0",
                                                marginLeft: "-145px",
                                                textAlign: "center",
                                            }}>
                                                HELP US SERVE YOU BETTER!
                                            </div>


                                            <br />

                                            <table style={{ width: "100%", fontFamily: "Arial", fontSize: "12px", fontWeight: "bold", marginBottom: "5px", marginTop: "0" }}>
                                                <tbody>
                                                    <tr>

                                                        <td style={{ textAlign: "right" }}>
                                                            Date: ______________________
                                                        </td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>

                            </Container>


                            {/* PERSONAL DATA FORM - Description Table */}
                            <table
                                style={{
                                    borderCollapse: "collapse",
                                    fontFamily: "Arial",
                                    width: "8in",
                                    margin: "0 auto",
                                    textAlign: "center",
                                    tableLayout: "fixed",
                                }}
                            >
                                <tbody>
                                    <tr>
                                        <td colSpan="2" style={{ textAlign: 'justify', fontSize: '12px' }}>
                                            This Client Satisfaction Measurement (CSM) tracks the customer experience of government offices.
                                            Your feedback on your recently concluded transaction will help this office provide a better service.
                                            Personal information shared will be kept confidential and you always have the option to not answer this form.
                                        </td>
                                    </tr>
                                </tbody>
                            </table>

                            {/* Client Type Table */}
                            <table
                                style={{
                                    borderCollapse: "collapse",
                                    fontFamily: "Arial",
                                    width: "8in",
                                    margin: "20px auto 0 auto",
                                    textAlign: "left",
                                    tableLayout: "fixed",
                                    fontSize: "12px",
                                    marginTop: "1px"
                                }}
                            >
                                <tbody>
                                    <tr>
                                        <td style={{ fontSize: "12px" }}>
                                            Client Type:
                                            <label style={{ marginLeft: "20px", marginRight: "10px" }}>
                                                <input type="checkbox" name="clientType" /> Citizens
                                            </label>
                                            <label style={{ marginRight: "10px" }}>
                                                <input type="checkbox" name="clientType" /> Business
                                            </label>
                                            <label>
                                                <input type="checkbox" name="clientType" /> Government (Employee or Another Agency)
                                            </label>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>

                            {/* Date, Sex, Age, Region Table */}
                            <table
                                style={{
                                    borderCollapse: "collapse",
                                    fontFamily: "Arial",
                                    width: "8in",
                                    margin: "20px auto 0 auto",
                                    textAlign: "left",
                                    tableLayout: "fixed",
                                    fontSize: "12px",
                                    marginTop: "8px"
                                }}
                            >
                                <tbody>
                                    <tr>
                                        <td colSpan="2">
                                            <label style={{ marginRight: "10px" }}>Date:</label>
                                            <input
                                                type="text"
                                                name="date"
                                                style={{
                                                    border: "none",
                                                    borderBottom: "1px solid black",
                                                    outline: "none",
                                                    width: "150px",
                                                    marginRight: "10px"
                                                }}
                                            />

                                            <label style={{ marginRight: "10px" }}>Sex:</label>
                                            <label style={{ marginRight: "10px" }}>
                                                <input type="checkbox" name="sex" value="Male" /> Male
                                            </label>
                                            <label style={{ marginRight: "20px" }}>
                                                <input type="checkbox" name="sex" value="Female" /> Female
                                            </label>

                                            <label style={{ marginRight: "10px" }}>Age:</label>
                                            <input
                                                type="text"
                                                name="age"
                                                style={{
                                                    border: "none",
                                                    borderBottom: "1px solid black",
                                                    outline: "none",
                                                    width: "60px",
                                                    marginRight: "20px"
                                                }}
                                            />

                                            <label style={{ marginRight: "10px" }}>Region of Residence:</label>
                                            <input
                                                type="text"
                                                name="region"
                                                style={{
                                                    border: "none",
                                                    borderBottom: "1px solid black",
                                                    outline: "none",
                                                    width: "159px"
                                                }}
                                            />
                                        </td>
                                    </tr>
                                </tbody>
                            </table>

                            {/* Service Availed Table */}
                            <table
                                style={{
                                    borderCollapse: "collapse",
                                    fontFamily: "Arial",
                                    width: "8in",
                                    margin: "20px auto 0 auto",
                                    textAlign: "left",
                                    tableLayout: "fixed",
                                    marginTop: "8px"
                                }}
                            >
                                <tbody>
                                    <tr>
                                        <td style={{ fontSize: "12px", fontFamily: "Arial" }}>
                                            <div style={{ display: "flex", alignItems: "flex-end" }}>
                                                <span style={{ marginRight: "5px" }}>
                                                    Services Availed:
                                                </span>
                                                <span
                                                    style={{
                                                        display: "inline-block",
                                                        borderBottom: "1px solid black",
                                                        width: "87%",
                                                        height: "20px"
                                                    }}
                                                ></span>
                                            </div>

                                            <div
                                                style={{
                                                    borderBottom: "1px solid black",
                                                    width: "100%",
                                                    height: "20px",
                                                    marginTop: "5px"
                                                }}
                                            ></div>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>

                            <div style={{ height: "40px" }}></div>
                            <table
                                style={{
                                    borderCollapse: "collapse",
                                    fontFamily: "Arial",
                                    width: "8in",
                                    margin: "0 auto",
                                    textAlign: "left",
                                    tableLayout: "fixed",
                                    marginTop: "-30px"
                                }}
                            >
                                <tbody>
                                    {/* INSTRUCTIONS */}
                                    <tr>
                                        <td colSpan={2} style={{ textAlign: 'justify', fontSize: '12px' }}>
                                            <strong>INSTRUCTIONS:</strong>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td colSpan={2} style={{ textAlign: 'justify', fontSize: '12px' }}>
                                            Check mark (✓) your answer to the Citizen's Charter (CC) questions. The Citizen's Charter is an official document that reflects the service of a government agency/office including its requirements, fees, and processing times among others.
                                        </td>
                                    </tr>

                                    {/* CC1 QUESTION */}
                                    <tr>
                                        <td colSpan={2} style={{ marginTop: "10px", fontWeight: 'bold', fontSize: '12px', textAlign: 'justify' }}>
                                            CC1 - Which of the following best describes your awareness of a CC?
                                        </td>
                                    </tr>

                                    {/* CC1 OPTIONS */}
                                    {[
                                        "1. I know what a CC is and I saw this office's CC.",
                                        "2. I know what a CC is but I did NOT see this office's CC.",
                                        "3. I learned of the CC only when I saw this office's CC.",
                                        "4. I do not know what a CC is and I did not see one in this office. (Answer 'N/A' on CC2 and CC3)"
                                    ].map((text, index) => (
                                        <tr key={`cc1-${index}`}>
                                            <td colSpan={2}>
                                                <label style={{ display: 'flex', alignItems: 'center', marginLeft: "20px", fontSize: "12px" }}>
                                                    <input type="checkbox" name="cc1" style={{ marginRight: '8px' }} />
                                                    {text}
                                                </label>
                                            </td>
                                        </tr>
                                    ))}

                                    {/* CC2 QUESTION */}
                                    <tr>
                                        <td colSpan={2} style={{ fontWeight: 'bold', fontSize: '12px', textAlign: 'justify' }}>
                                            CC2 - If aware of CC (answered 1-3 in CC1), would you say that the CC of this office was...?
                                        </td>
                                    </tr>

                                    {/* CC2 OPTIONS */}
                                    {[
                                        ["1. Easy to see", "4. Not visible at all"],
                                        ["2. Somewhat easy to see", "5. N/A"],
                                        ["3. Difficult to see", ""]
                                    ].map((row, i) => (
                                        <tr key={`cc2-${i}`}>
                                            {row.map((text, j) => (
                                                <td key={j} style={{ width: '50%' }}>
                                                    {text && (
                                                        <label style={{ display: 'flex', alignItems: 'center', marginLeft: "20px", fontSize: "12px" }}>
                                                            <input type="checkbox" name="cc2" style={{ marginRight: '8px' }} />
                                                            {text}
                                                        </label>
                                                    )}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}

                                    {/* CC3 QUESTION */}
                                    <tr>
                                        <td colSpan={2} style={{ fontWeight: 'bold', fontSize: '12px', textAlign: 'justify' }}>
                                            CC3 - If aware of CC (answered codes 1-3 in CC1), how much did the CC help you in your transaction?
                                        </td>
                                    </tr>

                                    {/* CC3 OPTIONS */}
                                    {[
                                        ["1. Helped very much", "3. Did not help"],
                                        ["2. Somewhat helped", "4. N/A"]
                                    ].map((row, i) => (
                                        <tr key={`cc3-${i}`}>
                                            {row.map((text, j) => (
                                                <td key={j} style={{ width: '50%' }}>
                                                    <label style={{ display: 'flex', alignItems: 'center', marginLeft: "20px", fontSize: "12px" }}>
                                                        <input type="checkbox" name="cc3" style={{ marginRight: '8px' }} />
                                                        {text}
                                                    </label>

                                                </td>

                                            ))}

                                        </tr>



                                    ))}

                                </tbody>
                            </table>
                            <br />



                            <table
                                style={{
                                    borderCollapse: "collapse",
                                    fontFamily: "Arial",
                                    width: "8in",
                                    margin: "0 auto",
                                    textAlign: "center",
                                    tableLayout: "fixed",
                                    marginTop: "-15px"
                                }}
                            >
                                <tbody>
                                    <tr>
                                        <td
                                            colSpan="40"
                                            style={{
                                                textAlign: "justify",
                                                fontSize: "12px"
                                            }}
                                        >
                                            <div>
                                                <strong>INSTRUCTIONS:</strong>
                                            </div>

                                            <div>
                                                For SQD 0–8, please put a check mark (✓) on the column that best
                                                corresponds to your answer.
                                            </div>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>


                            <table
                                style={{

                                    borderCollapse: "collapse",
                                    fontFamily: "Arial",
                                    width: "8in",
                                    margin: "0 auto",
                                    textAlign: "center",
                                    tableLayout: "fixed",
                                }}
                            >
                                <tbody>
                                    <tr>
                                        <td
                                            colSpan={16}
                                            style={{
                                                border: "1px solid black",
                                                textAlign: "left",
                                                padding: "8px",
                                                fontWeight: "bold",
                                                fontSize: "12px",
                                            }}
                                        >


                                        </td>
                                        <td
                                            colSpan={4}
                                            style={{
                                                border: "1px solid black",
                                                padding: "8px",
                                                textAlign: "center",
                                                fontFamily: "Arial",
                                                fontSize: "12px",
                                                verticalAlign: "middle",
                                            }}
                                        >
                                            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                                                <MoodBadIcon style={{ fontSize: 48, color: "black", marginBottom: 4 }} /><span>Strongly Disagree</span>
                                                <br />
                                                <br />


                                            </div>
                                        </td>

                                        <td
                                            colSpan={4}
                                            style={{
                                                border: "1px solid black",
                                                padding: "8px",
                                                textAlign: "center",
                                                fontFamily: "Arial",
                                                fontSize: "12px",
                                                verticalAlign: "middle",
                                            }}
                                        >
                                            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                                                <SentimentVeryDissatisfiedIcon style={{ fontSize: 48, color: "black", marginBottom: 4 }} /><span>Disagree</span>
                                                <br />
                                                <br />
                                                <br />


                                            </div>
                                        </td>

                                        <td
                                            colSpan={4}
                                            style={{
                                                border: "1px solid black",
                                                padding: "8px",
                                                textAlign: "center",
                                                fontFamily: "Arial",
                                                fontSize: "12px",
                                                verticalAlign: "middle",
                                            }}
                                        >
                                            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                                                <SentimentSatisfiedIcon style={{ fontSize: 48, color: "black", marginBottom: 4 }} /><span>Neither Agree nor Disagree</span>

                                            </div>
                                        </td>

                                        <td
                                            colSpan={4}
                                            style={{
                                                border: "1px solid black",
                                                padding: "8px",
                                                textAlign: "center",
                                                fontFamily: "Arial",
                                                fontSize: "12px",
                                                verticalAlign: "middle",
                                            }}
                                        >
                                            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                                                <SentimentSatisfiedAltIcon style={{ fontSize: 48, color: "black", marginBottom: 4 }} />
                                                <span>Agree</span>
                                                <br />
                                                <br />

                                                <br />
                                            </div>
                                        </td>

                                        <td
                                            colSpan={4}
                                            style={{
                                                border: "1px solid black",
                                                padding: "8px",
                                                textAlign: "center",
                                                fontFamily: "Arial",
                                                fontSize: "12px",
                                                verticalAlign: "middle",
                                            }}
                                        >

                                            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                                                <SentimentVerySatisfiedIcon style={{ fontSize: 48, color: "black", marginBottom: 4 }} />
                                                <span>Strongly Agree</span>
                                                <br />
                                                <br />

                                            </div>
                                        </td>

                                        <td
                                            colSpan={4}
                                            style={{
                                                border: "1px solid black",
                                                padding: "8px",
                                                textAlign: "center",
                                                fontFamily: "Arial",
                                                fontSize: "12px",
                                                verticalAlign: "middle",
                                            }}
                                        >
                                            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                                                <div style={{ fontSize: "30px", fontWeight: "bold" }}>N/A</div>
                                                <br />
                                                <span>Not Applicable</span>



                                                <br />
                                                <br />

                                            </div>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td
                                            colSpan={16}
                                            style={{
                                                border: "1px solid black",
                                                textAlign: "left",
                                                padding: "8px",

                                                fontSize: "12px",
                                                fontFamily: "Arial",
                                            }}
                                        >
                                            <b>SQD0.</b> I am satisfied with the service that I availed.


                                        </td>
                                        <td
                                            colSpan={4}
                                            style={{
                                                border: "1px solid black",
                                                padding: "8px",
                                                textAlign: "Center",
                                            }}
                                        >

                                        </td>
                                        <td
                                            colSpan={4}
                                            style={{
                                                border: "1px solid black",
                                                padding: "8px",
                                                textAlign: "Center",
                                            }}
                                        >

                                        </td>

                                        <td
                                            colSpan={4}
                                            style={{
                                                border: "1px solid black",
                                                padding: "8px",
                                                textAlign: "Center",
                                            }}
                                        >

                                        </td>

                                        <td
                                            colSpan={4}
                                            style={{
                                                border: "1px solid black",
                                                padding: "8px",
                                                textAlign: "Center",
                                            }}
                                        >

                                        </td>

                                        <td
                                            colSpan={4}
                                            style={{
                                                border: "1px solid black",
                                                padding: "8px",
                                                textAlign: "Center",
                                            }}
                                        >

                                        </td>

                                        <td
                                            colSpan={4}
                                            style={{
                                                border: "1px solid black",
                                                padding: "8px",
                                                textAlign: "Center",
                                            }}
                                        >

                                        </td>
                                    </tr>
                                    <tr>
                                        <td
                                            colSpan={16}
                                            style={{
                                                border: "1px solid black",
                                                textAlign: "left",
                                                padding: "8px",

                                                fontSize: "11px",
                                                fontFamily: "Arial",
                                            }}
                                        >
                                            <b>SQD1.</b>  I spent a reasonable amount of time for my transaction

                                        </td>
                                        <td
                                            colSpan={4}
                                            style={{
                                                border: "1px solid black",
                                                padding: "8px",
                                                textAlign: "Center",
                                            }}
                                        >

                                        </td>
                                        <td
                                            colSpan={4}
                                            style={{
                                                border: "1px solid black",
                                                padding: "8px",
                                                textAlign: "Center",
                                            }}
                                        >

                                        </td>

                                        <td
                                            colSpan={4}
                                            style={{
                                                border: "1px solid black",
                                                padding: "8px",
                                                textAlign: "Center",
                                            }}
                                        >

                                        </td>

                                        <td
                                            colSpan={4}
                                            style={{
                                                border: "1px solid black",
                                                padding: "8px",
                                                textAlign: "Center",
                                            }}
                                        >

                                        </td>

                                        <td
                                            colSpan={4}
                                            style={{
                                                border: "1px solid black",
                                                padding: "8px",
                                                textAlign: "Center",
                                            }}
                                        >

                                        </td>

                                        <td
                                            colSpan={4}
                                            style={{
                                                border: "1px solid black",
                                                padding: "8px",
                                                textAlign: "Center",
                                            }}
                                        >

                                        </td>
                                    </tr>
                                    <tr>
                                        <td
                                            colSpan={16}
                                            style={{
                                                border: "1px solid black",
                                                textAlign: "left",
                                                padding: "8px",

                                                fontSize: "11px",
                                            }}
                                        >
                                            <b>SQD2.</b>  The office followed the transaction's requirements and steps based on the information provided.

                                        </td>
                                        <td
                                            colSpan={4}
                                            style={{
                                                border: "1px solid black",
                                                padding: "8px",
                                                textAlign: "Center",
                                            }}
                                        >

                                        </td>
                                        <td
                                            colSpan={4}
                                            style={{
                                                border: "1px solid black",
                                                padding: "8px",
                                                textAlign: "Center",
                                            }}
                                        >

                                        </td>

                                        <td
                                            colSpan={4}
                                            style={{
                                                border: "1px solid black",
                                                padding: "8px",
                                                textAlign: "Center",
                                            }}
                                        >

                                        </td>

                                        <td
                                            colSpan={4}
                                            style={{
                                                border: "1px solid black",
                                                padding: "8px",
                                                textAlign: "Center",
                                            }}
                                        >

                                        </td>

                                        <td
                                            colSpan={4}
                                            style={{
                                                border: "1px solid black",
                                                padding: "8px",
                                                textAlign: "Center",
                                            }}
                                        >

                                        </td>

                                        <td
                                            colSpan={4}
                                            style={{
                                                border: "1px solid black",
                                                padding: "8px",
                                                textAlign: "Center",
                                            }}
                                        >

                                        </td>
                                    </tr>
                                    <tr>
                                        <td
                                            colSpan={16}
                                            style={{
                                                border: "1px solid black",
                                                textAlign: "left",
                                                padding: "8px",

                                                fontSize: "11px",
                                                fontFamily: "Arial",
                                            }}
                                        >
                                            <b>SQD3.</b>  The steps (including payment) I needed to do for my transaction were easy and simple.

                                        </td>
                                        <td
                                            colSpan={4}
                                            style={{
                                                border: "1px solid black",
                                                padding: "8px",
                                                textAlign: "Center",
                                            }}
                                        >

                                        </td>
                                        <td
                                            colSpan={4}
                                            style={{
                                                border: "1px solid black",
                                                padding: "8px",
                                                textAlign: "Center",
                                            }}
                                        >

                                        </td>

                                        <td
                                            colSpan={4}
                                            style={{
                                                border: "1px solid black",
                                                padding: "8px",
                                                textAlign: "Center",
                                            }}
                                        >

                                        </td>

                                        <td
                                            colSpan={4}
                                            style={{
                                                border: "1px solid black",
                                                padding: "8px",
                                                textAlign: "Center",
                                            }}
                                        >

                                        </td>

                                        <td
                                            colSpan={4}
                                            style={{
                                                border: "1px solid black",
                                                padding: "8px",
                                                textAlign: "Center",
                                            }}
                                        >

                                        </td>

                                        <td
                                            colSpan={4}
                                            style={{
                                                border: "1px solid black",
                                                padding: "8px",
                                                textAlign: "Center",
                                            }}
                                        >

                                        </td>
                                    </tr>
                                    <tr>
                                        <td
                                            colSpan={16}
                                            style={{
                                                border: "1px solid black",
                                                textAlign: "left",
                                                padding: "8px",

                                                fontFamily: "Arial",
                                                fontSize: "11px",
                                            }}
                                        >
                                            <b>SQD4.</b> I easily found information about my transaction from the office or its website.

                                        </td>
                                        <td
                                            colSpan={4}
                                            style={{
                                                border: "1px solid black",
                                                padding: "8px",
                                                textAlign: "Center",
                                            }}
                                        >

                                        </td>
                                        <td
                                            colSpan={4}
                                            style={{
                                                border: "1px solid black",
                                                padding: "8px",
                                                textAlign: "Center",
                                            }}
                                        >

                                        </td>

                                        <td
                                            colSpan={4}
                                            style={{
                                                border: "1px solid black",
                                                padding: "8px",
                                                textAlign: "Center",
                                            }}
                                        >

                                        </td>

                                        <td
                                            colSpan={4}
                                            style={{
                                                border: "1px solid black",
                                                padding: "8px",
                                                textAlign: "Center",
                                            }}
                                        >

                                        </td>

                                        <td
                                            colSpan={4}
                                            style={{
                                                border: "1px solid black",
                                                padding: "8px",
                                                textAlign: "Center",
                                            }}
                                        >

                                        </td>

                                        <td
                                            colSpan={4}
                                            style={{
                                                border: "1px solid black",
                                                padding: "8px",
                                                textAlign: "Center",
                                            }}
                                        >

                                        </td>
                                    </tr>
                                    <tr>
                                        <td
                                            colSpan={16}
                                            style={{
                                                border: "1px solid black",
                                                textAlign: "left",
                                                padding: "8px",

                                                fontSize: "11px",
                                                fontFamily: "Arial",
                                            }}
                                        >
                                            <b>SQD5.</b> I paid reasonable amount of fees for my transaction. (if service was free, mark the 'N/A' column)

                                        </td>
                                        <td
                                            colSpan={4}
                                            style={{
                                                border: "1px solid black",
                                                padding: "8px",
                                                textAlign: "Center",
                                            }}
                                        >

                                        </td>
                                        <td
                                            colSpan={4}
                                            style={{
                                                border: "1px solid black",
                                                padding: "8px",
                                                textAlign: "Center",
                                            }}
                                        >

                                        </td>

                                        <td
                                            colSpan={4}
                                            style={{
                                                border: "1px solid black",
                                                padding: "8px",
                                                textAlign: "Center",
                                            }}
                                        >

                                        </td>

                                        <td
                                            colSpan={4}
                                            style={{
                                                border: "1px solid black",
                                                padding: "8px",
                                                textAlign: "Center",
                                            }}
                                        >

                                        </td>

                                        <td
                                            colSpan={4}
                                            style={{
                                                border: "1px solid black",
                                                padding: "8px",
                                                textAlign: "Center",
                                            }}
                                        >

                                        </td>

                                        <td
                                            colSpan={4}
                                            style={{
                                                border: "1px solid black",
                                                padding: "8px",
                                                textAlign: "Center",
                                            }}
                                        >

                                        </td>
                                    </tr>
                                    <tr>
                                        <td
                                            colSpan={16}
                                            style={{
                                                border: "1px solid black",
                                                textAlign: "left",
                                                padding: "8px",

                                                fontSize: "11px",
                                                fontFamily: "Arial",
                                            }}
                                        >
                                            <b>SQD6.</b> I feel the office was fair to everyone, or "walang palakasan", during my transaction.

                                        </td>
                                        <td
                                            colSpan={4}
                                            style={{
                                                border: "1px solid black",
                                                padding: "8px",
                                                textAlign: "Center",
                                            }}
                                        >

                                        </td>
                                        <td
                                            colSpan={4}
                                            style={{
                                                border: "1px solid black",
                                                padding: "8px",
                                                textAlign: "Center",
                                            }}
                                        >

                                        </td>

                                        <td
                                            colSpan={4}
                                            style={{
                                                border: "1px solid black",
                                                padding: "8px",
                                                textAlign: "Center",
                                            }}
                                        >

                                        </td>

                                        <td
                                            colSpan={4}
                                            style={{
                                                border: "1px solid black",
                                                padding: "8px",
                                                textAlign: "Center",
                                            }}
                                        >

                                        </td>

                                        <td
                                            colSpan={4}
                                            style={{
                                                border: "1px solid black",
                                                padding: "8px",
                                                textAlign: "Center",
                                            }}
                                        >

                                        </td>

                                        <td
                                            colSpan={4}
                                            style={{
                                                border: "1px solid black",
                                                padding: "8px",
                                                textAlign: "Center",
                                            }}
                                        >

                                        </td>
                                    </tr>
                                    <tr>
                                        <td
                                            colSpan={16}
                                            style={{
                                                border: "1px solid black",
                                                textAlign: "left",
                                                padding: "8px",

                                                fontSize: "11px",
                                                fontFamily: "Arial",
                                            }}
                                        >
                                            <b>SQD7.</b> I was treated courteously by the staff, and (if asked for help) the staff was helpful.

                                        </td>
                                        <td
                                            colSpan={4}
                                            style={{
                                                border: "1px solid black",
                                                padding: "8px",
                                                textAlign: "Center",
                                            }}
                                        >

                                        </td>
                                        <td
                                            colSpan={4}
                                            style={{
                                                border: "1px solid black",
                                                padding: "8px",
                                                textAlign: "Center",
                                            }}
                                        >

                                        </td>

                                        <td
                                            colSpan={4}
                                            style={{
                                                border: "1px solid black",
                                                padding: "8px",
                                                textAlign: "Center",
                                            }}
                                        >

                                        </td>

                                        <td
                                            colSpan={4}
                                            style={{
                                                border: "1px solid black",
                                                padding: "8px",
                                                textAlign: "Center",
                                            }}
                                        >

                                        </td>

                                        <td
                                            colSpan={4}
                                            style={{
                                                border: "1px solid black",
                                                padding: "8px",
                                                textAlign: "Center",
                                            }}
                                        >

                                        </td>

                                        <td
                                            colSpan={4}
                                            style={{
                                                border: "1px solid black",
                                                padding: "8px",
                                                textAlign: "Center",
                                            }}
                                        >

                                        </td>
                                    </tr>
                                    <tr>
                                        <td
                                            colSpan={16}
                                            style={{
                                                border: "1px solid black",
                                                textAlign: "left",
                                                padding: "8px",

                                                fontSize: "11px",
                                                fontFamily: "Arial",
                                            }}
                                        >
                                            <b>SQD8.</b> I got what I needed from the government office, or  (if denied) denial of request was sufficiently explained to me.

                                        </td>
                                        <td
                                            colSpan={4}
                                            style={{
                                                border: "1px solid black",
                                                padding: "8px",
                                                textAlign: "Center",
                                            }}
                                        >

                                        </td>
                                        <td
                                            colSpan={4}
                                            style={{
                                                border: "1px solid black",
                                                padding: "8px",
                                                textAlign: "Center",
                                            }}
                                        >

                                        </td>

                                        <td
                                            colSpan={4}
                                            style={{
                                                border: "1px solid black",
                                                padding: "8px",
                                                textAlign: "Center",
                                            }}
                                        >

                                        </td>

                                        <td
                                            colSpan={4}
                                            style={{
                                                border: "1px solid black",
                                                padding: "8px",
                                                textAlign: "Center",
                                            }}
                                        >

                                        </td>

                                        <td
                                            colSpan={4}
                                            style={{
                                                border: "1px solid black",
                                                padding: "8px",
                                                textAlign: "Center",
                                            }}
                                        >

                                        </td>

                                        <td
                                            colSpan={4}
                                            style={{
                                                border: "1px solid black",
                                                padding: "12px",
                                                textAlign: "Center",
                                            }}
                                        >

                                        </td>
                                    </tr>

                                    <tr>
                                        <td colSpan={40} style={{ textAlign: "left", fontSize: "12px", paddingTop: "5px" }}>
                                            <span style={{ fontWeight: "bold", marginRight: "10px", paddingBottom: "20px" }}>Suggestion on how we can further improve our services (optional):</span>{" "}

                                            <br />
                                            <span style={{ marginTop: "20px", display: "inline-block", borderBottom: "1px solid black", width: "100%", paddingLeft: "10px" }}>
                                                {/* Full name goes here */}
                                            </span>
                                        </td>
                                    </tr>


                                    <tr>
                                        <td colSpan={40} style={{ textAlign: "left", fontSize: "12px", paddingTop: "15px" }}>
                                            <span style={{ fontWeight: "bold", marginRight: "10px" }}>Email Address: (optional)</span>{" "}

                                            <span style={{ marginTop: "10px", display: "inline-block", borderBottom: "1px solid black", width: "50%", paddingLeft: "10px" }}>
                                                {/* Full name goes here */}
                                            </span>
                                        </td>
                                    </tr>

                                </tbody>
                            </table>

                            <br />
                            <div style={{ fontSize: "20px", fontWeight: "bold", fontFamily: "Arial", textAlign: "Center" }}>THANK YOU!</div>



                        </div>
                    </div>

                </div>



            </Container>
        </Box>
    );
});

export default ApplicantServicesSurvey;
