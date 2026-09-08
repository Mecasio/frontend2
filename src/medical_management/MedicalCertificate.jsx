import React, { useState, useEffect, useContext, useRef } from "react";
import axios from "axios";
import { Box, Container, Button, TextField, Typography } from "@mui/material";
import { SettingsContext } from "../App";
import EaristLogo from "../assets/EaristLogo.png";
import { FcPrint } from "react-icons/fc";
import { useLocation } from "react-router-dom";
import Search from '@mui/icons-material/Search';
import SearchIcon from "@mui/icons-material/Search";
import API_BASE_URL from "../apiConfig";

const MedicalCertificate = ({ studentNumber: studentNumberProp } = {}) => {

    const settings = useContext(SettingsContext);
  const colors = settings?.colors || {};
  const branding = settings?.branding || {};
  const assets = settings?.assets || {};

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

    useEffect(() => {
        if (!settings) return;

        // 🎨 Colors
        if (colors.title) setTitleColor(colors.title);
        if (colors.subtitle) setSubtitleColor(colors.subtitle);
        if (colors.border) setBorderColor(colors.border);
        if (colors.mainButton) setMainButtonColor(colors.mainButton);
        if (colors.subButton) setSubButtonColor(colors.subButton);   // ✅ NEW
        if (colors.stepper) setStepperColor(colors.stepper);           // ✅ NEW

        // 🏫 Logo
        if (assets.logoUrl) {
            setFetchedLogo(assets.logoUrl);
        } else {
            setFetchedLogo(EaristLogo);
        }

        // 🏷️ School Information
        if (branding.companyName) setCompanyName(branding.companyName);
        if (branding.shortTerm) setShortTerm(branding.shortTerm);
        if (branding.campusAddress) setCampusAddress(branding.campusAddress);

    }, [settings]);



    useEffect(() => {
        if (settings) {
            // ✅ load dynamic logo
            if (assets.logoUrl) {
                setFetchedLogo(assets.logoUrl);
            } else {
                setFetchedLogo(EaristLogo);
            }

            // ✅ load dynamic name + address
            if (branding.companyName) setCompanyName(branding.companyName);
            if (branding.campusAddress) setCampusAddress(branding.campusAddress);
        }
    }, [settings]);



    const [studentNumber, setStudentNumber] = useState("");
    const [medicalData, setMedicalData] = useState(null);

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
    });




    const location = useLocation();
    const queryParams = new URLSearchParams(location.search);
    const queryPersonId = queryParams.get("person_id");

    const incomingStudentNumber = queryParams.get("student_number");
    const autoDownload = queryParams.get("auto") === "1";

    useEffect(() => {
        if (studentNumberProp) {
            setUserID(studentNumberProp);
            fetchPersonBySearch(studentNumberProp);
            return;
        }

        const storedUser = localStorage.getItem("email");
        const storedRole = localStorage.getItem("role");
        const storedID = localStorage.getItem("person_id");
        const storedStudentNumber = localStorage.getItem("student_number");

        if (storedUser && storedRole && (storedStudentNumber || storedID)) {
            setUser(storedUser);
            setUserRole(storedRole);
            setUserID(storedStudentNumber || storedID);

            if (storedRole === "applicant" || storedRole === "registrar") {
                fetchPersonBySearch(storedStudentNumber || storedID);
            } else {
                window.location.href = "/login";
            }
        } else {
            window.location.href = "/login";
        }
    }, [studentNumberProp]);

    // Auto-fire the export once the person record has actually loaded
    useEffect(() => {
        if (autoDownload && person?.last_name) {
            handleExportMedicalCertificatePdf();
        }
    }, [autoDownload, person]);

    const [shortDate, setShortDate] = useState("");
    const [longDate, setLongDate] = useState("");

    useEffect(() => {
        const updateDates = () => {
            const now = new Date();

            // Format 1: MM/DD/YYYY
            const formattedShort = `${String(now.getMonth() + 1).padStart(2, "0")}/${String(now.getDate()).padStart(2, "0")}/${now.getFullYear()}`;
            setShortDate(formattedShort);

            // Format 2: MM DD, YYYY hh:mm:ss AM/PM
            const day = String(now.getDate()).padStart(2, "0");
            const month = String(now.getMonth() + 1).padStart(2, "0");
            const year = now.getFullYear();
            const hours = String(now.getHours() % 12 || 12).padStart(2, "0");
            const minutes = String(now.getMinutes()).padStart(2, "0");
            const seconds = String(now.getSeconds()).padStart(2, "0");
            const ampm = now.getHours() >= 12 ? "PM" : "AM";

            const formattedLong = `${month} ${day}, ${year} ${hours}:${minutes}:${seconds} ${ampm}`;
            setLongDate(formattedLong);
        };

        updateDates(); // Set initial values
        const interval = setInterval(updateDates, 1000); // Update every second

        return () => clearInterval(interval); // Cleanup on unmount
    }, []);

    const divToPrintRef = useRef();


    const handleExportMedicalCertificatePdf = async () => {
        const logoSrc = fetchedLogo; // EaristLogo isn't imported here — remove or import it if you need a fallback

        const buildCertificateBlock = () => `
    <div
      class="student-table"
      style="display:flex; align-items:center; justify-content:center; padding:10px 10px; width:100%; box-sizing:border-box;"
    >
      <div style="display:flex; align-items:center;">
        <div style="flex-shrink:0; margin-right:20px;">
          <img
            src="${logoSrc}"
            alt="School Logo"
            style="width:120px; height:120px; border-radius:50%; object-fit:cover; margin-top:-30px;"
          />
        </div>
        <div>
          <div style="font-size:12px; font-family:Arial; text-align:left; margin-bottom:5px;">
            Republic of the Philippines
          </div>
          <div style="font-size:18px; font-weight:bold; color:black; font-family:Arial; margin-bottom:5px;">
            ${companyName}
          </div>
          <div style="display:flex; justify-content:center; margin-bottom:5px;">
            <hr style="width:100%; max-width:700px; border:1px solid #000; margin:0;" />
          </div>
          <br />
          <div style="text-align:center; font-size:12px; font-weight:bold; font-family:Arial; margin-left:-95px; margin-top:-20px;">
            HEALTH SERVICE DIVISION
          </div>
          <div style="text-align:center; font-size:12px; font-weight:bold; font-family:Arial; margin-left:-100px; margin-top:30px;">
            MEDICAL CERTIFICATE
          </div>
        </div>
      </div>
    </div>

    <table style="border-collapse:collapse; width:8in; margin:0 auto; font-family:Arial; font-size:12px; line-height:1.3;">
      <tbody>
        <tr>
          <td colspan="40" style="text-align:left; padding-bottom:5px; font-weight:bold;">
            TO WHOM IT MAY CONCERN:
          </td>
        </tr>

        <tr>
          <td colspan="40" style="text-align:justify; padding-bottom:10px; width:100%; white-space:nowrap; vertical-align:top;">
            This is to certify that&nbsp;
            <span style="display:inline-flex; flex-direction:column; align-items:center; width:50%; border-bottom:1px solid black; text-align:center;">
              <span>${(person.last_name || "").toUpperCase()}, ${(person.first_name || "").toUpperCase()} ${(person.middle_name || "").toUpperCase()}</span>
            </span>
            &nbsp;
            <span style="display:inline-flex; flex-direction:column; align-items:center; width:10%; border-bottom:1px solid black; text-align:center; margin-left:5px; margin-right:5px;">
              <span>${person.age || ""}</span>
            </span>
            &nbsp;years old,&nbsp;
            <span style="display:inline-flex; flex-direction:column; align-items:center; width:15%; border-bottom:1px solid black; text-align:center;">
              <span>${person.gender === 0 ? "MALE" : person.gender === 1 ? "FEMALE" : ""}</span>
            </span>
            <div style="display:flex; justify-content:space-between; margin-left:140px;">
              <span style="width:15%; text-align:center; margin-left:150px;">(Name)</span>
              <span style="width:20%; text-align:center; margin-left:30px;">(Age)</span>
              <span style="width:10%; text-align:center; margin-right:10px;">(Sex)</span>
            </div>
          </td>
        </tr>

        <tr>
          <td colspan="40" style="text-align:justify; padding-bottom:3px; width:100%; white-space:nowrap;">
            <span style="display:inline-block; text-align:center; width:10%; vertical-align:top;">
              <div style="border-bottom:1px solid black; width:100%; text-align:center;">${person.civilStatus || ""}</div>
              <div style="font-size:12px; text-align:center;">(Civil Status)</div>
            </span>
            &nbsp;A resident of&nbsp;
            <span style="display:inline-block; text-align:center; width:50%; vertical-align:top;">
              <div style="border-bottom:1px solid black; width:100%; text-align:center;">
                ${person.permanentStreet || ""} ${person.permanentBarangay || ""} ${person.permanentMunicipality || ""}
              </div>
              <div style="font-size:12px; text-align:center;">(Address)</div>
            </span>
            &nbsp;was examined on&nbsp;
            <span style="display:inline-block; text-align:center; width:16%; vertical-align:bottom; white-space:nowrap;">
              <div style="border-bottom:1px solid black; text-align:center; width:100%; line-height:12px;"></div>
              <div style="font-size:12px; text-align:center; margin-top:1px; line-height:12px;">(Date)</div>
            </span>
          </td>
        </tr>

        <tr>
          <td colspan="40" style="text-align:left; padding-top:6px; width:100%;">
            <div style="display:flex; align-items:center; justify-content:flex-start; width:101.5%;">
              <span style="min-width:60px;">Due to:</span>
              <span style="flex-grow:1; border-bottom:1px solid black; display:inline-block; margin-left:5px;"></span>
            </div>
          </td>
        </tr>

        <tr>
          <td colspan="40" style="text-align:left; padding-top:5px; width:100%; font-size:12px; line-height:1.8;">
            And found:
            <br />
            <div style="margin-left:50px; margin-top:-20px;">
              <br />
              ( ) Physically and mentally fit.
              <br />
              ( ) With the impression of
              <span style="display:inline-block; border-bottom:1px solid black; width:300px; margin-left:5px;"></span>
              <br />
              And was advised to
              <span style="display:inline-block; border-bottom:1px solid black; width:335px; margin-left:5px;"></span>
              <br />
              <br />
              This certificate is issued upon request for medical purposes only.
            </div>
            <br />
            Official Receipt No.:
            <span style="display:inline-block; border-bottom:1px solid black; width:200px; margin-left:5px;"></span>
            <br />
            Date Issued:
            <span style="display:inline-block; border-bottom:1px solid black; width:245px; margin-left:5px;"></span>
            <br />
            MC No.:
            <span style="display:inline-block; border-bottom:1px solid black; width:265px; margin-left:5px;"></span>
            <br />
            <div style="text-align:center; margin-top:12px; margin-bottom:10px;">
              <span style="display:inline-block; border-bottom:1px solid black; width:300px; margin-left:250px;"></span>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  `;

        const innerHtml = `
    ${buildCertificateBlock()}
    <hr style="border:2px solid black; width:100%;" />
    ${buildCertificateBlock()}
  `;

        try {
            const response = await axios.post(
                `${API_BASE_URL}/api/generate-medical-certificate-pdf`,
                {
                    html: innerHtml,
                    student_number: userID,
                    last_name: person.last_name,
                    first_name: person.first_name,
                },
                {
                    responseType: "blob",
                },
            );

            const blobUrl = window.URL.createObjectURL(new Blob([response.data], { type: "application/pdf" }));
            const link = document.createElement("a");
            link.href = blobUrl;
            link.setAttribute(
                "download",
                `Medical_Certificate_${(person.last_name || "Student").replace(/\s+/g, "_")}.pdf`,
            );
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(blobUrl);
        } catch (err) {
            console.error("Failed to generate Medical Certificate PDF:", err);
            alert("Failed to generate Medical Certificate PDF.");
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
                item?.curriculum_id?.toString() === (person?.program ?? "").toString()
        )?.program_description || (person?.program ?? "")

    }

    const [searchQuery, setSearchQuery] = useState("");
    const [personResults, setPersonResults] = useState([]);
    const [searchError, setSearchError] = useState("");

    const fetchPersonBySearch = async (query) => {
        try {
            const res = await axios.get(`${API_BASE_URL}/api/search-person-student`, {
                params: { query }
            });

            setPersonResults(res.data ? [res.data] : []);
            if (res.data && res.data.student_number) {
                setPerson(res.data);
                fetchMedicalData(res.data.student_number);
            }
            console.log("✅ Person search results:", res.data);
        } catch (error) {
            console.error("❌ Failed to search person:", error);
            setPersonResults([]);
        }
    };


    const fetchMedicalData = async (studentNumber) => {
        try {
            const res = await axios.get(`${API_BASE_URL}/api/medical-requirements/${studentNumber}`);
            setMedicalData(res.data);
            console.log("✅ Loaded medical data for:", studentNumber, res.data);
        } catch (err) {
            if (err.response?.status === 404) {
                console.warn(`ℹ️ No medical record found for ${studentNumber}`);
                setMedicalData(null);
            } else {
                console.error("❌ Failed to load medical data:", err);
            }
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
        <Box sx={{ height: "calc(100vh - 150px)", overflowY: "auto", paddingRight: 1, backgroundColor: "transparent", mt: 1, padding: 2 }}>     {/* Header with Search aligned right */}


            <Container>
                <div ref={divToPrintRef}>
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


                    </div>

                    <Container>

                        <div
                            className="student-table"
                            style={{

                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center", // Center horizontally
                                padding: "10px 10px",
                                width: "100%",

                                boxSizing: "border-box"
                            }}>
                            {/* Wrapper to contain logo and text side by side without stretching */}
                            <div style={{
                                display: "flex",

                                alignItems: "center"
                            }}>
                                {/* Logo */}
                                <div style={{ flexShrink: 0, marginRight: "20px" }}>
                                    <img
                                        src={fetchedLogo}
                                        alt="School Logo"
                                        style={{
                                            width: "120px",   // ✅ hardcoded width
                                            height: "120px",  // ✅ hardcoded height
                                            borderRadius: "50%", // optional (use for circular look)
                                            objectFit: "cover",
                                            marginTop: "-30px",
                                        }}
                                    />
                                </div>


                                <div>
                                    {/* Top Line: Republic */}
                                    <div style={{
                                        fontSize: "12px",
                                        fontFamily: "Arial",
                                        textAlign: "left",
                                        marginBottom: "5px",
                                        marginTop: "15px",
                                    }}>
                                        Republic of the Philippines
                                    </div>

                                    {/* Institute Name */}
                                    <div
                                        style={{
                                            fontSize: "18px",
                                            fontWeight: "bold",
                                            color: "black",
                                            fontFamily: "Arial",
                                            marginBottom: "5px",
                                        }}
                                    >
                                        {companyName}
                                    </div>

                                    {/* Horizontal Line */}
                                    <div style={{ display: "flex", justifyContent: "center", marginBottom: "5px" }}>
                                        <hr style={{ width: "100%", maxWidth: "700px", border: "1px solid #000", margin: 0 }} />
                                    </div>
                                    <br />
                                    {/* Office Name */}
                                    <div style={{
                                        textAlign: "center",
                                        fontSize: "12px",
                                        fontWeight: "bold",
                                        fontFamily: "Arial",
                                        marginLeft: "-95px",
                                        marginTop: "-20px"
                                    }}>
                                        HEALTH SERVICE DIVISION

                                    </div>

                                    <div style={{
                                        textAlign: "center",
                                        fontSize: "12px",
                                        fontWeight: "bold",
                                        fontFamily: "Arial",
                                        marginLeft: "-100px",

                                        marginTop: "30px"
                                    }}>
                                        MEDICAL CERTIFICATE

                                    </div>
                                </div>
                            </div>
                        </div>

                        <table
                            style={{
                                borderCollapse: "collapse",
                                width: "8in",
                                margin: "0 auto",
                                fontFamily: "Arial",
                                fontSize: "12px",
                                lineHeight: "1.3",
                            }}
                        >
                            <tbody>
                                {/* Title */}

                                {/* Salutation */}
                                <tr>
                                    <td colSpan={40} style={{ textAlign: "left", paddingBottom: "5px", fontWeight: "bold" }}>
                                        TO WHOM IT MAY CONCERN:
                                    </td>
                                </tr>

                                {/* Certification Line */}
                                {/* Name, Age, Sex Line - Fully Fitted */}
                                <tr>
                                    <td
                                        colSpan={40}
                                        style={{
                                            textAlign: "justify",
                                            paddingBottom: "10px",
                                            width: "100%",
                                            whiteSpace: "nowrap",
                                            verticalAlign: "top",
                                        }}
                                    >
                                        This is to certify that&nbsp;
                                        <span
                                            style={{
                                                display: "inline-flex",
                                                flexDirection: "column",
                                                alignItems: "center",
                                                width: "50%",
                                                borderBottom: "1px solid black",
                                                textAlign: "center",
                                            }}
                                        >
                                            <span>
                                                {person.last_name.toUpperCase()}, {person.first_name.toUpperCase()}{" "}
                                                {person.middle_name.toUpperCase()}
                                            </span>

                                        </span>

                                        &nbsp;

                                        <span
                                            style={{
                                                display: "inline-flex",
                                                flexDirection: "column",
                                                alignItems: "center",
                                                width: "10%",
                                                borderBottom: "1px solid black",
                                                textAlign: "center",
                                                marginLeft: "5px",
                                                marginRight: "5px",
                                            }}
                                        >
                                            <span>{person.age}</span>

                                        </span>
                                        &nbsp;years old,&nbsp;
                                        <span
                                            style={{
                                                display: "inline-flex",
                                                flexDirection: "column",
                                                alignItems: "center",
                                                width: "15%",
                                                borderBottom: "1px solid black",
                                                textAlign: "center",
                                            }}
                                        >
                                            <span>
                                                {person.gender === 0
                                                    ? "MALE"
                                                    : person.gender === 1
                                                        ? "FEMALE"
                                                        : ""}
                                            </span>

                                        </span>
                                        <div
                                            style={{
                                                display: "flex",
                                                justifyContent: "space-between",
                                                marginLeft: "140px",
                                            }}
                                        >
                                            <span style={{ width: "15%", textAlign: "center", marginLeft: "150px" }}>(Name)</span>

                                            <span style={{ width: "20%", textAlign: "center", marginLeft: "30px" }}>(Age)</span>
                                            <span style={{ width: "10%", textAlign: "center", marginRight: "10px" }}>(Sex)</span>
                                        </div>
                                    </td>
                                </tr>


                                {/* Civil Status, Address, Date - All in One Row with Labels Below */}
                                <tr>
                                    <td
                                        colSpan={40}
                                        style={{
                                            textAlign: "justify",
                                            paddingBottom: "3px",
                                            width: "100%",
                                            whiteSpace: "nowrap",
                                        }}
                                    >
                                        {/* Civil Status */}
                                        <span
                                            style={{
                                                display: "inline-block",
                                                textAlign: "center",
                                                width: "10%",
                                                verticalAlign: "top",
                                            }}
                                        >
                                            <div
                                                style={{
                                                    borderBottom: "1px solid black",
                                                    width: "100%",
                                                    textAlign: "center",
                                                }}
                                            >
                                                {person.civilStatus}
                                            </div>
                                            <div style={{ fontSize: "12px", textAlign: "center" }}>(Civil Status)</div>
                                        </span>

                                        &nbsp;A resident of&nbsp;

                                        {/* Address */}
                                        <span
                                            style={{
                                                display: "inline-block",
                                                textAlign: "center",
                                                width: "50%",
                                                verticalAlign: "top",
                                            }}
                                        >
                                            <div
                                                style={{
                                                    borderBottom: "1px solid black",
                                                    width: "100%",
                                                    textAlign: "center",
                                                }}
                                            >
                                                {person.permanentStreet} {person.permanentBarangay}{" "}
                                                {person.permanentMunicipality}
                                            </div>
                                            <div style={{ fontSize: "12px", textAlign: "center" }}>(Address)</div>
                                        </span>

                                        &nbsp;was examined on&nbsp;

                                        {/* Date */}
                                        <span
                                            style={{
                                                display: "inline-block",
                                                textAlign: "center",
                                                width: "16%",
                                                verticalAlign: "bottom",
                                                whiteSpace: "nowrap",
                                            }}
                                        >
                                            <div
                                                style={{
                                                    borderBottom: "1px solid black",
                                                    textAlign: "center",
                                                    width: "100%",
                                                    lineHeight: "12px",
                                                }}
                                            >
                                                {/* Insert date here */}
                                            </div>
                                            <div
                                                style={{
                                                    fontSize: "12px",
                                                    textAlign: "center",
                                                    marginTop: "1px",
                                                    lineHeight: "12px",
                                                }}
                                            >
                                                (Date)
                                            </div>
                                        </span>
                                    </td>
                                </tr>

                                {/* ✅ Due to Line — perfectly matching width */}
                                <tr>
                                    <td
                                        colSpan={40}
                                        style={{
                                            textAlign: "left",
                                            paddingTop: "6px",
                                            width: "100%",
                                        }}
                                    >
                                        <div
                                            style={{
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "flex-start",
                                                width: "101.5%",
                                            }}
                                        >
                                            <span style={{ minWidth: "60px" }}>Due to:</span>
                                            <span
                                                style={{
                                                    flexGrow: 1,
                                                    borderBottom: "1px solid black",
                                                    display: "inline-block",
                                                    marginLeft: "5px",
                                                }}
                                            ></span>
                                        </div>
                                    </td>
                                </tr>

                                {/* --- Findings and Footer Section --- */}
                                <tr>
                                    <td
                                        colSpan={40}
                                        style={{
                                            textAlign: "left",
                                            paddingTop: "5px",
                                            width: "100%",
                                            fontSize: "12px",
                                            lineHeight: "1.8",
                                        }}
                                    >
                                        And found:
                                        <br />
                                        <div style={{ marginLeft: "50px", marginTop: "-20px" }}>
                                            <br />
                                            ( ) Physically and mentally fit.
                                            <br />
                                            ( ) With the impression of{" "}
                                            <span
                                                style={{
                                                    display: "inline-block",
                                                    borderBottom: "1px solid black",
                                                    width: "300px", // uniform underline width
                                                    marginLeft: "5px",
                                                }}
                                            ></span>
                                            <br />
                                            And was advised to{" "}
                                            <span
                                                style={{
                                                    display: "inline-block",
                                                    borderBottom: "1px solid black",
                                                    width: "335px", // same width
                                                    marginLeft: "5px",
                                                }}
                                            ></span>

                                            <br />
                                            <br />
                                            This certificate is issued upon request for medical purposes only.
                                        </div>
                                        <br />
                                        Official Receipt No.:{" "}
                                        <span
                                            style={{
                                                display: "inline-block",
                                                borderBottom: "1px solid black",
                                                width: "200px",
                                                marginLeft: "5px",
                                            }}
                                        ></span>
                                        <br />
                                        Date Issued:{" "}
                                        <span
                                            style={{
                                                display: "inline-block",
                                                borderBottom: "1px solid black",
                                                width: "245px",
                                                marginLeft: "5px",
                                            }}
                                        ></span>
                                        <br />
                                        MC No.:{" "}
                                        <span
                                            style={{
                                                display: "inline-block",
                                                borderBottom: "1px solid black",
                                                width: "265px",
                                                marginLeft: "5px",
                                            }}
                                        ></span>
                                        <br />
                                        {/* --- Centered line below MC No. --- */}
                                        <div
                                            style={{
                                                textAlign: "center",
                                                marginTop: "12px",
                                                marginBottom: "10px"
                                            }}
                                        >
                                            <span
                                                style={{
                                                    display: "inline-block",
                                                    borderBottom: "1px solid black",
                                                    width: "300px",
                                                    marginLeft: "250px"
                                                }}
                                            ></span>
                                        </div>
                                    </td>
                                </tr>


                            </tbody>
                        </table>
                    </Container>

                    <hr style={{ border: "1px solid black", width: "100%" }} />

                    <Container>

                        <div
                            className="student-table"
                            style={{

                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center", // Center horizontally
                                padding: "10px 10px",
                                width: "100%",
                                marginTop: "30px",
                                boxSizing: "border-box"
                            }}>
                            {/* Wrapper to contain logo and text side by side without stretching */}
                            <div style={{
                                display: "flex",

                                alignItems: "center"
                            }}>
                                {/* Logo */}
                                <div style={{ flexShrink: 0, marginRight: "20px" }}>
                                    <img
                                        src={fetchedLogo}
                                        alt="School Logo"
                                        style={{
                                            width: "120px",   // ✅ hardcoded width
                                            height: "120px",  // ✅ hardcoded height
                                            borderRadius: "50%", // optional (use for circular look)
                                            objectFit: "cover",
                                            marginTop: "5px",
                                        }}
                                    />
                                </div>


                                <div>
                                    {/* Top Line: Republic */}
                                    <div style={{
                                        fontSize: "12px",
                                        fontFamily: "Arial",
                                        textAlign: "left",
                                        marginBottom: "5px",
                                        marginTop: "15px",
                                    }}>
                                        Republic of the Philippines
                                    </div>

                                    {/* Institute Name */}
                                    <div
                                        style={{
                                            fontSize: "18px",
                                            fontWeight: "bold",
                                            color: "black",
                                            fontFamily: "Arial",
                                            marginBottom: "5px",
                                        }}
                                    >
                                        {companyName}
                                    </div>

                                    {/* Horizontal Line */}
                                    <div style={{ display: "flex", justifyContent: "center", marginBottom: "5px" }}>
                                        <hr style={{ width: "100%", maxWidth: "700px", border: "1px solid #000", margin: 0 }} />
                                    </div>
                                    <br />
                                    {/* Office Name */}
                                    <div style={{
                                        textAlign: "center",
                                        fontSize: "12px",
                                        fontWeight: "bold",
                                        fontFamily: "Arial",
                                        marginLeft: "-95px",
                                        marginTop: "-20px"
                                    }}>
                                        HEALTH SERVICE DIVISION

                                    </div>

                                    <div style={{
                                        textAlign: "center",
                                        fontSize: "12px",
                                        fontWeight: "bold",
                                        fontFamily: "Arial",
                                        marginLeft: "-100px",

                                        marginTop: "30px"
                                    }}>
                                        MEDICAL CERTIFICATE

                                    </div>
                                </div>
                            </div>
                        </div>

                        <table
                            style={{
                                borderCollapse: "collapse",
                                width: "8in",
                                margin: "0 auto",
                                fontFamily: "Arial",
                                fontSize: "12px",
                                lineHeight: "1.3",
                            }}
                        >
                            <tbody>
                                {/* Title */}

                                {/* Salutation */}
                                <tr>
                                    <td colSpan={40} style={{ textAlign: "left", paddingBottom: "5px", fontWeight: "bold" }}>
                                        TO WHOM IT MAY CONCERN:
                                    </td>
                                </tr>

                                {/* Certification Line */}
                                {/* Name, Age, Sex Line - Fully Fitted */}
                                <tr>
                                    <td
                                        colSpan={40}
                                        style={{
                                            textAlign: "justify",
                                            paddingBottom: "10px",
                                            width: "100%",
                                            whiteSpace: "nowrap",
                                            verticalAlign: "top",
                                        }}
                                    >
                                        This is to certify that&nbsp;
                                        <span
                                            style={{
                                                display: "inline-flex",
                                                flexDirection: "column",
                                                alignItems: "center",
                                                width: "50%",
                                                borderBottom: "1px solid black",
                                                textAlign: "center",
                                            }}
                                        >
                                            <span>
                                                {person.last_name.toUpperCase()}, {person.first_name.toUpperCase()}{" "}
                                                {person.middle_name.toUpperCase()}
                                            </span>

                                        </span>

                                        &nbsp;

                                        <span
                                            style={{
                                                display: "inline-flex",
                                                flexDirection: "column",
                                                alignItems: "center",
                                                width: "10%",
                                                borderBottom: "1px solid black",
                                                textAlign: "center",
                                                marginLeft: "5px",
                                                marginRight: "5px",
                                            }}
                                        >
                                            <span>{person.age}</span>

                                        </span>
                                        &nbsp;years old,&nbsp;
                                        <span
                                            style={{
                                                display: "inline-flex",
                                                flexDirection: "column",
                                                alignItems: "center",
                                                width: "15%",
                                                borderBottom: "1px solid black",
                                                textAlign: "center",
                                            }}
                                        >
                                            <span>
                                                {person.gender === 0
                                                    ? "MALE"
                                                    : person.gender === 1
                                                        ? "FEMALE"
                                                        : ""}
                                            </span>

                                        </span>
                                        <div
                                            style={{
                                                display: "flex",
                                                justifyContent: "space-between",
                                                marginLeft: "140px",
                                            }}
                                        >
                                            <span style={{ width: "15%", textAlign: "center", marginLeft: "150px" }}>(Name)</span>

                                            <span style={{ width: "20%", textAlign: "center", marginLeft: "30px" }}>(Age)</span>
                                            <span style={{ width: "10%", textAlign: "center", marginRight: "10px" }}>(Sex)</span>
                                        </div>
                                    </td>
                                </tr>


                                {/* Civil Status, Address, Date - All in One Row with Labels Below */}
                                <tr>
                                    <td
                                        colSpan={40}
                                        style={{
                                            textAlign: "justify",
                                            paddingBottom: "3px",
                                            width: "100%",
                                            whiteSpace: "nowrap",
                                        }}
                                    >
                                        {/* Civil Status */}
                                        <span
                                            style={{
                                                display: "inline-block",
                                                textAlign: "center",
                                                width: "10%",
                                                verticalAlign: "top",
                                            }}
                                        >
                                            <div
                                                style={{
                                                    borderBottom: "1px solid black",
                                                    width: "100%",
                                                    textAlign: "center",
                                                }}
                                            >
                                                {person.civilStatus}
                                            </div>
                                            <div style={{ fontSize: "12px", textAlign: "center" }}>(Civil Status)</div>
                                        </span>

                                        &nbsp;A resident of&nbsp;

                                        {/* Address */}
                                        <span
                                            style={{
                                                display: "inline-block",
                                                textAlign: "center",
                                                width: "50%",
                                                verticalAlign: "top",
                                            }}
                                        >
                                            <div
                                                style={{
                                                    borderBottom: "1px solid black",
                                                    width: "100%",
                                                    textAlign: "center",
                                                }}
                                            >
                                                {person.permanentStreet} {person.permanentBarangay}{" "}
                                                {person.permanentMunicipality}
                                            </div>
                                            <div style={{ fontSize: "12px", textAlign: "center" }}>(Address)</div>
                                        </span>

                                        &nbsp;was examined on&nbsp;

                                        {/* Date */}
                                        <span
                                            style={{
                                                display: "inline-block",
                                                textAlign: "center",
                                                width: "16%",
                                                verticalAlign: "bottom",
                                                whiteSpace: "nowrap",
                                            }}
                                        >
                                            <div
                                                style={{
                                                    borderBottom: "1px solid black",
                                                    textAlign: "center",
                                                    width: "100%",
                                                    lineHeight: "12px",
                                                }}
                                            >
                                                {/* Insert date here */}
                                            </div>
                                            <div
                                                style={{
                                                    fontSize: "12px",
                                                    textAlign: "center",
                                                    marginTop: "1px",
                                                    lineHeight: "12px",
                                                }}
                                            >
                                                (Date)
                                            </div>
                                        </span>
                                    </td>
                                </tr>

                                {/* ✅ Due to Line — perfectly matching width */}
                                <tr>
                                    <td
                                        colSpan={40}
                                        style={{
                                            textAlign: "left",
                                            paddingTop: "6px",
                                            width: "100%",
                                        }}
                                    >
                                        <div
                                            style={{
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "flex-start",
                                                width: "101.5%",
                                            }}
                                        >
                                            <span style={{ minWidth: "60px" }}>Due to:</span>
                                            <span
                                                style={{
                                                    flexGrow: 1,
                                                    borderBottom: "1px solid black",
                                                    display: "inline-block",
                                                    marginLeft: "5px",
                                                }}
                                            ></span>
                                        </div>
                                    </td>
                                </tr>

                                {/* --- Findings and Footer Section --- */}
                                <tr>
                                    <td
                                        colSpan={40}
                                        style={{
                                            textAlign: "left",
                                            paddingTop: "5px",
                                            width: "100%",
                                            fontSize: "12px",
                                            lineHeight: "1.8",
                                        }}
                                    >
                                        And found:
                                        <br />
                                        <div style={{ marginLeft: "50px", marginTop: "-20px" }}>
                                            <br />
                                            ( ) Physically and mentally fit.
                                            <br />
                                            ( ) With the impression of{" "}
                                            <span
                                                style={{
                                                    display: "inline-block",
                                                    borderBottom: "1px solid black",
                                                    width: "300px", // uniform underline width
                                                    marginLeft: "5px",
                                                }}
                                            ></span>
                                            <br />
                                            And was advised to{" "}
                                            <span
                                                style={{
                                                    display: "inline-block",
                                                    borderBottom: "1px solid black",
                                                    width: "335px", // same width
                                                    marginLeft: "5px",
                                                }}
                                            ></span>

                                            <br />
                                            <br />
                                            This certificate is issued upon request for medical purposes only.
                                        </div>
                                        <br />
                                        Official Receipt No.:{" "}
                                        <span
                                            style={{
                                                display: "inline-block",
                                                borderBottom: "1px solid black",
                                                width: "200px",
                                                marginLeft: "5px",
                                            }}
                                        ></span>
                                        <br />
                                        Date Issued:{" "}
                                        <span
                                            style={{
                                                display: "inline-block",
                                                borderBottom: "1px solid black",
                                                width: "245px",
                                                marginLeft: "5px",
                                            }}
                                        ></span>
                                        <br />
                                        MC No.:{" "}
                                        <span
                                            style={{
                                                display: "inline-block",
                                                borderBottom: "1px solid black",
                                                width: "265px",
                                                marginLeft: "5px",
                                            }}
                                        ></span>
                                        <br />
                                        {/* --- Centered line below MC No. --- */}
                                        <div
                                            style={{
                                                textAlign: "center",
                                                marginTop: "12px",
                                                marginBottom: "10px"
                                            }}
                                        >
                                            <span
                                                style={{
                                                    display: "inline-block",
                                                    borderBottom: "1px solid black",
                                                    width: "300px",
                                                    marginLeft: "250px"
                                                }}
                                            ></span>
                                        </div>
                                    </td>
                                </tr>


                            </tbody>
                        </table>
                    </Container>
                </div>





            </Container>


        </Box >

    );
};

export default MedicalCertificate;


