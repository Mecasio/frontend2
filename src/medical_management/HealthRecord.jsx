import React, { useState, useEffect, useContext, useRef } from "react";
import { Box, Container, TextField, Button, Typography } from "@mui/material";
import axios from "axios";
import { FcPrint } from "react-icons/fc";
import { useLocation } from "react-router-dom";
import { SettingsContext } from "../App";
import EaristLogo from "../assets/EaristLogo.png";
import SearchIcon from "@mui/icons-material/Search";
import API_BASE_URL from "../apiConfig";

const HealthRecord = ({ studentNumber: studentNumberProp } = {}) => {

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

    const [campusAddress, setCampusAddress] = useState("");


    const words = companyName.trim().split(" ");
    const middle = Math.ceil(words.length / 2);
    const firstLine = words.slice(0, middle).join(" ");
    const secondLine = words.slice(middle).join(" ");

    const [userID, setUserID] = useState("");
    const [user, setUser] = useState("");
    const [userRole, setUserRole] = useState("");
    const [applicantNumber, setApplicantNumber] = useState("");
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



    const location = useLocation();
    const queryParams = new URLSearchParams(location.search);
    const queryPersonId = queryParams.get("person_id");
    const queryStudentNumber = queryParams.get("student_number");

    useEffect(() => {
        // Headless mode: mounted off-screen by another page with a prop.
        // Just fetch and render — no auth check, no redirect.
        if (studentNumberProp) {
            fetchPersonBySearch(studentNumberProp);
            return;
        }

        const storedUser = localStorage.getItem("email");
        const storedRole = localStorage.getItem("role");
        const storedID = localStorage.getItem("person_id");
        const storedStudentNumber = localStorage.getItem("student_number");

        if (queryStudentNumber) {
            fetchPersonBySearch(queryStudentNumber);
            return;
        }

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

    const [shortDate, setShortDate] = useState("");

    useEffect(() => {
        const now = new Date();
        const formattedShort = `${String(now.getMonth() + 1).padStart(2, "0")}/${String(
            now.getDate()
        ).padStart(2, "0")}/${now.getFullYear()}`;
        setShortDate(formattedShort);
    }, []);

    const divToPrintRef = useRef();
    const handleExportHealthRecordPdf = async () => {
        if (!divToPrintRef.current) return;
        try {
            const response = await axios.post(
                `${API_BASE_URL}/api/generate-health-record-pdf`,
                {
                    html: divToPrintRef.current.innerHTML,
                    student_number: person?.student_number,
                    last_name: person?.last_name,
                    first_name: person?.first_name,
                },
                { responseType: "blob" }
            );
            const blobUrl = window.URL.createObjectURL(new Blob([response.data], { type: "application/pdf" }));
            const link = document.createElement("a");
            link.href = blobUrl;
            link.setAttribute("download", `Health_Record_${(person?.last_name || "Student").replace(/\s+/g, "_")}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(blobUrl);
        } catch (err) {
            console.error("Failed to generate Health Record PDF:", err);
            alert("Failed to generate Health Record PDF.");
        }
    };

    const [curriculumOptions, setCurriculumOptions] = useState([]);
    useEffect(() => {
        axios
            .get(`${API_BASE_URL}/api/applied_program`)
            .then((res) => setCurriculumOptions(res.data))
            .catch((err) => console.error("Error fetching curriculum options:", err));
    }, []);

    const [medicalData, setMedicalData] = useState(null);

    useEffect(() => {
        const storedApplicant = sessionStorage.getItem("selected_applicant_number");
        if (storedApplicant) {
            setApplicantNumber(storedApplicant);
            fetchMedicalData(storedApplicant);
        }
    }, []);

    const [dataReady, setDataReady] = useState(false);

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


    useEffect(() => {
        if (autoDownload && dataReady) {
            // small delay so React has painted the table before we read innerHTML
            const t = setTimeout(handleExportHealthRecordPdf, 300);
            return () => clearTimeout(t);
        }
    }, [autoDownload, dataReady]);

    const [searchQuery, setSearchQuery] = useState("");
    const [personResults, setPersonResults] = useState([]);



    const [dental, setDental] = useState({});
    const [neuroData, setNeuroData] = useState(null);

    useEffect(() => {
        if (person?.last_name) {
            setDataReady(true);
        }
    }, [person, dental, neuroData, medicalData]);

    const fetchDentalData = async (studentNumber) => {
        try {
            const res = await axios.get(
                `${API_BASE_URL}/api/dental-assessment/${studentNumber}`
            );

            const parsed = {
                ...res.data,
                dental_upper_right: parseTeeth(res.data.dental_upper_right),
                dental_upper_left: parseTeeth(res.data.dental_upper_left),
                dental_lower_right: parseTeeth(res.data.dental_lower_right),
                dental_lower_left: parseTeeth(res.data.dental_lower_left),
            };

            setDental(parsed);


            console.log("✅ Dental loaded:", res.data);
        } catch (err) {
            console.warn("ℹ️ No dental record found");
            setDental(null);
        }
    };




    const fetchNeuroData = async (studentNumber) => {
        try {
            const res = await axios.get(`${API_BASE_URL}/api/physical-neuro/${studentNumber}`);
            setNeuroData(res.data);
        } catch (err) {
            console.warn("No neuro record found");
            setNeuroData(null);
        }
    };


    const fetchMedicalData = async (studentNumber) => {
        try {
            const res = await axios.get(`${API_BASE_URL}/api/medical-requirements/${studentNumber}`);
            setMedicalData(res.data);
        } catch (err) {
            console.warn("No medical record found");
            setMedicalData(null);
        }
    };



    const isChecked = (key) => {
        return Number(dental?.[key]) === 1;
    };

    const isProblem = (val) => {
        if (!val) return false;
        return val !== "Normal";
    };

    const parseTeeth = (val) => {
        if (!val) return [];

        // If already array, return
        if (Array.isArray(val)) return val;

        // If string, try parse JSON
        if (typeof val === "string") {
            try {
                return JSON.parse(val);
            } catch {
                return [];
            }
        }

        return [];
    };

    const fetchPersonBySearch = async (query) => {
        try {
            const res = await axios.get(`${API_BASE_URL}/api/search-person-student`, {
                params: { query }
            });

            setPersonResults(res.data ? [res.data] : []);
            setPerson(res.data);

            if (res.data?.student_number) {
                fetchDentalData(res.data.student_number);
                fetchNeuroData(res.data.student_number);  // ← add this
                fetchMedicalData(res.data.student_number);
            }


            console.log("✅ Person search results:", res.data);
        } catch (error) {
            if (error.response?.status === 404) {
                console.warn("ℹ️ No matching student found:", query);
                setPerson({});
                return;
            }
            console.error("❌ Failed to search person:", error);
        }
    };


    const [searchError, setSearchError] = useState("");
    useEffect(() => {
        const delayDebounce = setTimeout(async () => {
            if (searchQuery.trim() === "") return;

            try {
                const res = await axios.get(`${API_BASE_URL}/api/search-person-student`, {
                    params: { query: searchQuery }
                });

                console.log("Search result data:", res.data);
                setPerson(res.data);

                if (res.data?.student_number) {
                    fetchDentalData(res.data.student_number);
                    fetchNeuroData(res.data.student_number);  // ← add this
                    fetchMedicalData(res.data.student_number);  // ← ADD THIS

                }


                const idToStore = res.data.person_id || res.data.id;
                if (!idToStore) {
                    setSearchError("Invalid search result");
                    return;
                }

                sessionStorage.setItem("admin_edit_person_id", idToStore);
                sessionStorage.setItem("admin_edit_person_data", JSON.stringify(res.data));
                setUserID(idToStore);
                setSearchError("");
            } catch (err) {
                console.error("Search failed:", err);
                setSearchError("Applicant not found");
            }
        }, 500);

        return () => clearTimeout(delayDebounce);
    }, [searchQuery]);


    // 🔒 Disable right-click
    // document.addEventListener("contextmenu", (e) => e.preventDefault());

    // // 🔒 Block DevTools shortcuts + Ctrl+P silently
    // document.addEventListener("keydown", (e) => {
    //     const isBlockedKey =
    //         e.key === "F12" ||
    //         e.key === "F11" ||
    //         (e.ctrlKey &&
    //             e.shiftKey &&
    //             (e.key.toLowerCase() === "i" || e.key.toLowerCase() === "j")) ||
    //         (e.ctrlKey && e.key.toLowerCase() === "u") ||
    //         (e.ctrlKey && e.key.toLowerCase() === "p");

    //     if (isBlockedKey) {
    //         e.preventDefault();
    //         e.stopPropagation();
    //     }
    // });

    return (
        <Box sx={{ height: "calc(100vh - 150px)", overflowY: "auto", paddingRight: 1, backgroundColor: "transparent", mt: 1, padding: 2 }}>{/* Header with Search aligned right */}







            <div ref={divToPrintRef}>
                <table

                    style={{
                        borderCollapse: "collapse",
                        fontFamily: "Arial",
                        width: "8in",
                        margin: "0 auto",
                        textAlign: "center",
                        tableLayout: "fixed",
                        height: "100px",

                    }}
                >
                    <tbody>
                        <tr>
                            <td colSpan={40} style={{ padding: "8px" }}>
                                <div
                                    style={{
                                        width: "8in", // full width for colSpan 40
                                        margin: "0 auto",
                                        fontFamily: "Arial",
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
                                            width: "100%",
                                        }}
                                    >
                                        {/* ---------- LEFT: LOGO ---------- */}
                                        <div
                                            style={{
                                                flex: "0 0 120px", // fixed width for logo
                                                textAlign: "left",
                                            }}
                                        >
                                            <img
                                                src={fetchedLogo}
                                                alt="School Logo"
                                                style={{
                                                    width: "120px", // ✅ hardcoded width
                                                    height: "120px", // ✅ hardcoded height
                                                    borderRadius: "50%", // optional for circular look
                                                    objectFit: "cover",
                                                    marginLeft: "10px",
                                                    marginTop: "10px",
                                                }}
                                            />

                                        </div>

                                        {/* ---------- CENTER: TEXT BLOCK ---------- */}
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
                                            <div style={{
                                                fontSize: "13px",
                                                fontFamily: "Arial",
                                            }}>
                                                Republic of the Philippines
                                            </div>
                                            <div
                                                style={{

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
                                                        fontWeight: "bold",
                                                        fontFamily: "Arial",
                                                        fontSize: "16px",
                                                        textTransform: "Uppercase"
                                                    }}
                                                >
                                                    {secondLine}
                                                </div>
                                            )}
                                            {campusAddress && (
                                                <div style={{
                                                    fontSize: "13px",
                                                    fontFamily: "Arial",
                                                }}>
                                                    {campusAddress}
                                                </div>
                                            )}
                                        </div>

                                        {/* ---------- RIGHT: PROFILE IMAGE ---------- */}
                                        <div
                                            style={{
                                                flex: "0 0 120px", // fixed width for profile area
                                                textAlign: "right",
                                                marginRight: "10px",
                                            }}
                                        >
                                            <div
                                                style={{
                                                    width: "1.2in",
                                                    height: "1.2in",
                                                    border: "1px solid black",
                                                    overflow: "hidden",
                                                    marginLeft: "auto",
                                                    marginTop: "5px"
                                                }}
                                            >
                                                {person?.profile_img ? (
                                                    <img
                                                        src={`${API_BASE_URL}/uploads/Student1by1/${person.profile_img}`}
                                                        alt="Profile"
                                                        style={{
                                                            width: "100%",
                                                            height: "100%",
                                                            objectFit: "cover",
                                                        }}
                                                    />
                                                ) : (
                                                    <span style={{ fontSize: "12px", color: "#888" }}>No Image</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </td>
                        </tr>

                        <tr>

                            <td colSpan={40} style={{ padding: "1px" }}>


                                <div
                                    style={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "flex-start",
                                        width: "100%",
                                    }}
                                >
                                    {/* LEFT SIDE - Titles */}
                                    <div style={{ flex: 1, textAlign: "center" }}>
                                        <div
                                            style={{
                                                fontSize: "16px",
                                                marginTop: "-5px",
                                                letterSpacing: "1px",
                                                fontFamily: "Arial",
                                                fontWeight: "bold",
                                                marginLeft: "200px"
                                            }}
                                        >
                                            HEALTH SERVICE DIVISION
                                        </div>

                                        <div
                                            style={{
                                                fontSize: "16px",
                                                marginTop: "20px",
                                                letterSpacing: "1px",
                                                fontFamily: "Arial",
                                                fontWeight: "bold",
                                                marginLeft: "200px"

                                            }}
                                        >
                                            STUDENT HEALTH RECORD
                                        </div>
                                    </div>

                                    {/* RIGHT SIDE - Inputs */}
                                    <div
                                        style={{
                                            display: "flex",
                                            flexDirection: "column",
                                            alignItems: "flex-end",
                                            fontSize: "12px",
                                            fontFamily: "Arial",
                                            gap: "6px",
                                            marginTop: "-10px",
                                        }}
                                    >
                                        <div>
                                            OR No.:
                                            <input
                                                type="text"
                                                style={{
                                                    border: "none",
                                                    borderBottom: "1px solid black",
                                                    width: "150px",
                                                    marginLeft: "10px",
                                                    fontSize: "12px",
                                                    fontFamily: "Arial",
                                                    background: "none",
                                                    outline: "none",
                                                }}
                                            />
                                        </div>

                                        <div>
                                            Date Issued:
                                            <input
                                                type="text"
                                                style={{
                                                    border: "none",
                                                    borderBottom: "1px solid black",
                                                    width: "150px",
                                                    marginLeft: "10px",
                                                    fontSize: "12px",
                                                    fontFamily: "Arial",
                                                    background: "none",
                                                    outline: "none",
                                                }}
                                            />
                                        </div>

                                        <div>
                                            Course:
                                            <input
                                                type="text"
                                                style={{
                                                    border: "none",
                                                    borderBottom: "1px solid black",
                                                    width: "150px",
                                                    marginLeft: "20px",
                                                    fontSize: "12px",
                                                    fontFamily: "Arial",
                                                    background: "none",
                                                    outline: "none",
                                                }}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div style={{
                                    textAlign: "left", fontSize: "12px",
                                    fontFamily: "Arial",
                                    marginTop: "5px"
                                }}>
                                    INSTRUCTIONS: <span style={{ marginLeft: "50px" }}>Please fill up all blanks and provide necessary Information.</span></div>
                                <div style={{
                                    textAlign: "left", fontSize: "12px",
                                    fontFamily: "Arial",
                                }}> <span style={{ marginLeft: "145px" }}>(Sagutin ang lahat ng Patlang o talata na maaring bilugan)</span></div>
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


                        {/* Spacer */}
                        <tr>
                            <td style={{ height: "5px" }} colSpan={40}></td>
                        </tr>

                        {/* --- Row 1: Name and Sex --- */}
                        <tr style={{ fontFamily: "Arial", fontSize: "12px" }}>
                            <td colSpan={40} style={{ paddingTop: "5px" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                                    {/* Left Side: Name */}
                                    <div style={{ width: "80%" }}>
                                        <b>Name:</b>
                                        <span
                                            style={{
                                                display: "inline-block",
                                                borderBottom: "1px solid black",
                                                width: "93%",
                                                marginLeft: "5px",
                                            }}
                                        >
                                            <span style={{ display: "inline-block", width: "33%", textAlign: "center" }}>
                                                {person.last_name}
                                            </span>
                                            <span style={{ display: "inline-block", width: "33%", textAlign: "center" }}>
                                                {person.first_name}
                                            </span>
                                            <span style={{ display: "inline-block", width: "33%", textAlign: "center" }}>
                                                {person.middle_name}
                                            </span>
                                        </span>

                                        {/* Labels under name */}
                                        <div
                                            style={{
                                                display: "flex",
                                                justifyContent: "space-between",
                                                width: "90%",
                                                marginLeft: "45px",
                                                fontSize: "11px",
                                                marginTop: "2px",
                                            }}
                                        >
                                            <span style={{ width: "33%", textAlign: "center" }}>LAST NAME</span>
                                            <span style={{ width: "33%", textAlign: "center" }}>FIRST NAME</span>
                                            <span style={{ width: "33%", textAlign: "center" }}>MIDDLE NAME</span>
                                        </div>
                                    </div>

                                    {/* Right Side: Sex */}
                                    <div style={{ width: "20%", textAlign: "left" }}>
                                        <b>Sex:</b>
                                        <div
                                            style={{
                                                borderBottom: "1px solid black",
                                                width: "80%",
                                                marginLeft: "5px",
                                                display: "inline-block",
                                                textAlign: "center",
                                            }}
                                        >
                                            {person.gender === 0 ? "Male" : person.gender === 1 ? "Female" : ""}
                                        </div>
                                        <div style={{ fontSize: "11px", textAlign: "center", marginTop: "2px" }}>Age:
                                            <div
                                                style={{
                                                    borderBottom: "1px solid black",
                                                    width: "80%",
                                                    marginLeft: "5px",
                                                    display: "inline-block",
                                                    textAlign: "center",
                                                }}
                                            >
                                                {person.age}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </td>
                        </tr>

                        {/* --- Row 2: Status / Birth Date / Birth Place --- */}
                        <tr style={{ fontFamily: "Arial", fontSize: "12px" }}>
                            <td colSpan={40} style={{ paddingTop: "6px" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                    {/* Civil Status */}
                                    <div style={{ width: "33%" }}>
                                        <b>Status:</b>
                                        <span
                                            style={{
                                                display: "inline-block",
                                                borderBottom: "1px solid black",
                                                width: "83%",
                                                marginLeft: "5px",
                                                textAlign: "center",
                                            }}
                                        >
                                            {person.civilStatus}
                                        </span>
                                    </div>

                                    {/* Birth Date */}
                                    <div style={{ width: "33%" }}>
                                        <b>Birth Date:</b>
                                        <span
                                            style={{
                                                display: "inline-block",
                                                borderBottom: "1px solid black",
                                                width: "73%",
                                                marginLeft: "5px",
                                                textAlign: "center",
                                            }}
                                        >
                                            {person.birthOfDate &&
                                                new Date(person.birthOfDate).toLocaleDateString("en-US", {
                                                    month: "2-digit",
                                                    day: "2-digit",
                                                    year: "numeric",
                                                })}
                                        </span>
                                    </div>

                                    {/* Birth Place */}
                                    <div style={{ width: "33%" }}>
                                        <b>Birth Place:</b>
                                        <span
                                            style={{
                                                display: "inline-block",
                                                borderBottom: "1px solid black",
                                                width: "70%",
                                                marginLeft: "5px",
                                                textAlign: "center",
                                            }}
                                        >
                                            {person.birthPlace}
                                        </span>
                                    </div>
                                </div>
                            </td>
                        </tr>




                        {/* Contact */}
                        <tr style={{ fontFamily: "Arial", fontSize: "12px", textAlign: "left" }}>
                            <td colSpan={40}>
                                <b>PARENTS NAME:</b>
                                <span
                                    style={{
                                        borderBottom: "1px solid black",
                                        display: "inline-block",
                                        width: "231px",
                                        marginLeft: "10px",
                                    }}
                                >
                                    {person.father_given_name} {person.father_middle_name} {person.father_family_name}
                                </span>
                                <b style={{ marginLeft: "10px" }}>HOME ADDRESS:</b>
                                <span
                                    style={{
                                        borderBottom: "1px solid black",
                                        display: "inline-block",
                                        width: "296px",
                                        marginLeft: "10px",
                                    }}
                                >
                                    {person.emailAddress}
                                </span>
                            </td>
                        </tr>


                        {/* Permanent Address */}
                        <tr style={{ fontFamily: "Arial", fontSize: "12px", textAlign: "left" }}>
                            <td colSpan={40}>
                                <b style={{ marginRight: "10px" }}>ADDRESS while in school <span style={{ fontWeight: "normal" }}>(Boarding House):</span></b>
                                <span
                                    style={{
                                        display: "inline-block",
                                        borderBottom: "1px solid black",
                                        width: "100%",
                                        verticalAlign: "bottom",
                                    }}
                                >
                                    <span style={{ display: "inline-block", width: "40%", textAlign: "center", fontSize: "12px" }}>{person.presentStreet}</span>
                                    <span style={{ display: "inline-block", width: "10%", textAlign: "center", fontSize: "12px" }}>{person.presentBarangay}</span>
                                    <span style={{ display: "inline-block", width: "20%", textAlign: "center", fontSize: "12px" }}>{person.presentMunicipality}</span>
                                    <span style={{ display: "inline-block", width: "30%", textAlign: "center", fontSize: "12px" }}>{person.presentProvince}</span>

                                </span>
                            </td>
                        </tr>

                        {/* Contact */}
                        <tr style={{ fontFamily: "Arial", fontSize: "12px", textAlign: "left" }}>
                            <td colSpan={40}>
                                <b>GUARDIAN:</b>
                                <span
                                    style={{
                                        borderBottom: "1px solid black",
                                        display: "inline-block",
                                        width: "263px",
                                        marginLeft: "10px",
                                        marginBottom: "5px"
                                    }}
                                >
                                    {person.father_given_name} {person.father_middle_name} {person.last_name}
                                </span>
                                <b style={{ marginLeft: "10px" }}>CELLPHONE NO:</b>
                                <span
                                    style={{
                                        borderBottom: "1px solid black",
                                        display: "inline-block",
                                        width: "291px",
                                        marginLeft: "10px",
                                    }}
                                >
                                    {person.cellphoneNumber}
                                </span>
                            </td>
                        </tr>



                    </tbody>
                </table>





                <table
                    style={{
                        border: "2px solid black",
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
                            <td colSpan={40} style={{
                                fontSize: "12px",
                                textAlign: "justify",
                                color: "black",
                                fontFamily: "Arial",
                                padding: "8px",
                                lineHeight: "1.5",
                            }}>
                                <div style={{ textAlign: "center", fontsize: "12px", fontFamily: "Arial", fontWeight: "bold" }}>Informed Consent</div>
                                <strong>
                                    I,<span
                                        style={{
                                            display: "inline-block",
                                            borderBottom: "1px solid black",
                                            textTransform: "uppercase",
                                            textAlign: "center",
                                            paddingBottom: "2px",
                                            minWidth: "250px", // adjust width as needed
                                        }}
                                    >
                                        {person.last_name} {person.first_name} {person.middle_name}
                                    </span>
                                    ,
                                    <span
                                        style={{
                                            display: "inline-block",
                                            borderBottom: "1px solid black",
                                            marginLeft: "10px",
                                            paddingBottom: "2px",
                                            minWidth: "100px", // adjust width as needed
                                            textAlign: "center",
                                        }}
                                    >
                                        {person.age}
                                    </span>
                                    , years old accept and understand that I am required to undergo a physical examination to determine my fitness and well-being as a student.
                                    I fully understand that the result will be held as confidential medical records and will be used by the University for my care and treatment. My health information cannot be released to third person except with my consent or unless
                                    the disclosure of the information is required by law. I acknowledge that my records will be retained by the University for a period of 10 years from examination or health visit.


                                </strong>
                            </td>
                        </tr>
                        <tr>
                            <td colSpan={40}>
                                <div
                                    style={{
                                        display: "flex",
                                        justifyContent: "flex-end", // align to the right side
                                        padding: "20px 40px 0 40px",
                                        fontFamily: "Arial",
                                        fontsize: "12px",
                                    }}
                                >
                                    {/* RIGHT: Signature */}
                                    <div style={{ textAlign: "center" }}>
                                        <div
                                            style={{
                                                borderBottom: "1px solid black",
                                                width: "300px",
                                                marginBottom: "5px",
                                                paddingBottom: "3px",
                                                height: "10px",
                                                marginTop: "-15px"
                                            }}
                                        >
                                            &nbsp;
                                        </div>
                                        <div>(Signature)</div>
                                    </div>
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
                        fontSize: "12px",
                    }}
                >
                    <tbody>
                        {/* Title */}
                        <tr>
                            <td colSpan={40} style={{ textAlign: "left", fontsize: "12px", fontWeight: "bold", paddingBottom: "6px" }}>
                                DENTAL INFORMATION{" "}
                                <span style={{ fontWeight: "normal" }}>
                                    (to be filed up by authorized personnel)
                                </span>
                            </td>
                        </tr>

                        {/* Table Header Row */}
                        <tr>
                            <td colSpan={16} style={{ textAlign: "left", fontWeight: "bold" }}>General Condition </td>
                            <td colSpan={16} style={{ border: "1px solid black", fontWeight: "bold" }}>UPPER RIGHT</td>
                            <td colSpan={12} style={{ border: "1px solid black", fontWeight: "bold" }}></td>
                            <td colSpan={16} style={{ border: "1px solid black", fontWeight: "bold" }}>UPPER LEFT</td>


                        </tr>

                        {/* ================= UPPER PART ================= */}
                        {[...Array(12)].map((_, i) => (
                            <tr key={`upper-${i}`}>

                                {/* LEFT: General Condition */}
                                <td colSpan={16} style={{ textAlign: "left", paddingLeft: "4px" }}>
                                    {i < 10 && (
                                        <span
                                            style={{
                                                display: "inline-block",
                                                width: "20px",
                                                height: "10px",
                                                border: "1px solid black",
                                                backgroundColor: isChecked(
                                                    [
                                                        "dental_good_hygiene",
                                                        "dental_presence_of_calculus_plaque",
                                                        "dental_gingivitis",
                                                        "dental_pyorrhea",
                                                        "dental_denture_wearer_up",
                                                        "dental_denture_wearer_down",
                                                        "dental_with_braces_up",
                                                        "dental_with_braces_down",
                                                        "dental_with_oral_hygiene_reliner",
                                                        "others",
                                                    ][i]
                                                )
                                                    ? "black"
                                                    : "white",
                                                marginRight: "6px",
                                            }}
                                        />
                                    )}

                                    {[
                                        "Good Hygiene",
                                        "Presence of Calculus / Plaque",
                                        "Gingivitis",
                                        "Pyorrhea",
                                        "Denture wearer up",
                                        "Denture wearer down",
                                        "With ortho braces up",
                                        "With ortho braces down",
                                        "Wearing Hawley’s retainer",
                                        "Others",
                                    ][i] || ""}
                                </td>

                                {/* ===== UPPER RIGHT ===== */}
                                {[8, 7, 6, 5, 4, 3, 2, 1].map((num, idx) => (
                                    <td
                                        key={`ur-${i}-${num}`}
                                        colSpan={2}
                                        style={{
                                            border: "1px solid black",
                                            backgroundColor: isProblem(dental?.dental_upper_right?.[idx])
                                                ? "black"
                                                : "white",
                                            color: isProblem(dental?.dental_upper_right?.[idx])
                                                ? "white"
                                                : "black",
                                            fontWeight: "bold",
                                        }}
                                    >
                                        {num}
                                    </td>
                                ))}

                                {/* CENTER: Tooth Condition */}
                                <td
                                    colSpan={12}
                                    style={{
                                        border: "1px solid black",
                                        textAlign: "left",
                                        paddingLeft: "4px",
                                    }}
                                >
                                    {[
                                        "With Caries",
                                        "Amalgam",
                                        "Other Resto Mat",
                                        "Pontic",
                                        "Missing",
                                        "RF",
                                        "Unerrupted",
                                        "For Exo",
                                        "TF",
                                        "Abutment",
                                        "RCT",
                                        "Impacted",
                                    ][i] || ""}
                                </td>

                                {/* ===== UPPER LEFT ===== */}
                                {[1, 2, 3, 4, 5, 6, 7, 8].map((num, idx) => (
                                    <td
                                        key={`ul-${i}-${num}`}
                                        colSpan={2}
                                        style={{
                                            border: "1px solid black",
                                            backgroundColor: isProblem(dental?.dental_upper_left?.[idx])
                                                ? "black"
                                                : "white",
                                            color: isProblem(dental?.dental_upper_left?.[idx])
                                                ? "white"
                                                : "black",
                                            fontWeight: "bold",
                                        }}
                                    >
                                        {num}
                                    </td>
                                ))}
                            </tr>
                        ))}

                        {/* ================= LOWER HEADER ================= */}
                        <tr>
                            <td colSpan={16} style={{ fontWeight: "bold", textAlign: "left" }}>
                                Medical History
                            </td>
                            <td colSpan={16} style={{ border: "1px solid black", fontWeight: "bold" }}>
                                LOWER RIGHT
                            </td>
                            <td colSpan={12} style={{ border: "1px solid black" }}></td>
                            <td colSpan={16} style={{ border: "1px solid black", fontWeight: "bold" }}>
                                LOWER LEFT
                            </td>
                        </tr>

                        {/* ================= LOWER PART ================= */}
                        {[...Array(12)].map((_, i) => (
                            <tr key={`lower-${i}`}>

                                {/* LEFT: Medical History */}
                                <td colSpan={16} style={{ textAlign: "left", paddingLeft: "4px" }}>
                                    {i <= 6 && (
                                        <span
                                            style={{
                                                display: "inline-block",
                                                width: "20px",
                                                height: "10px",
                                                border: "1px solid black",
                                                backgroundColor: isChecked(
                                                    [
                                                        "dental_diabetes",
                                                        "dental_hypertension",
                                                        "dental_allergies",
                                                        "dental_heart_disease",
                                                        "dental_epilepsy",
                                                        "dental_mental_illness",
                                                        "dental_clotting_disorder",
                                                    ][i]
                                                )
                                                    ? "black"
                                                    : "white",
                                                marginRight: "6px",
                                            }}
                                        />
                                    )}

                                    {[
                                        "Diabetes",
                                        "Hypertension",
                                        "Allergies",
                                        "Heart Disease",
                                        "Epilepsy",
                                        "Mental Illness",
                                        "Clotting Disorder",
                                        "",
                                        "Other Remarks",
                                    ][i] || ""}
                                </td>

                                {/* ===== LOWER RIGHT ===== */}
                                {[8, 7, 6, 5, 4, 3, 2, 1].map((num, idx) => (
                                    <td
                                        key={`lr-${i}-${num}`}
                                        colSpan={2}
                                        style={{
                                            border: "1px solid black",
                                            backgroundColor: isProblem(dental?.dental_lower_right?.[idx])
                                                ? "black"
                                                : "white",
                                            color: isProblem(dental?.dental_lower_right?.[idx])
                                                ? "white"
                                                : "black",
                                            fontWeight: "bold",
                                        }}
                                    >
                                        {num}
                                    </td>
                                ))}

                                {/* CENTER: Tooth Condition */}
                                <td
                                    colSpan={12}
                                    style={{
                                        border: "1px solid black",
                                        textAlign: "left",
                                        paddingLeft: "4px",
                                    }}
                                >
                                    {[
                                        "With Caries",
                                        "Amalgam",
                                        "Other Resto Mat",
                                        "Pontic",
                                        "Missing",
                                        "RF",
                                        "Unerrupted",
                                        "For Exo",
                                        "TF",
                                        "Abutment",
                                        "RCT",
                                        "Impacted",
                                    ][i] || ""}
                                </td>

                                {/* ===== LOWER LEFT ===== */}
                                {[1, 2, 3, 4, 5, 6, 7, 8].map((num, idx) => (
                                    <td
                                        key={`ll-${i}-${num}`}
                                        colSpan={2}
                                        style={{
                                            border: "1px solid black",
                                            backgroundColor: isProblem(dental?.dental_lower_left?.[idx])
                                                ? "black"
                                                : "white",
                                            color: isProblem(dental?.dental_lower_left?.[idx])
                                                ? "white"
                                                : "black",
                                            fontWeight: "bold",
                                        }}
                                    >
                                        {num}
                                    </td>
                                ))}
                            </tr>
                        ))}

                        <tr>
                            <td colSpan={40} style={{ padding: 0, margin: 0, fontSize: "12px", fontFamily: "Arial" }}>
                                <div
                                    style={{
                                        marginTop: "5px",
                                        textAlign: "right", // since we’ll use margin for positioning
                                        marginRight: "-48%", // adjust until text sits between columns 6–8
                                        marginBottom: "110px"
                                    }}
                                >
                                    Page 1 of 2
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
                            <td colSpan={40} style={{ borderTop: "1px solid black" }} />
                        </tr>

                        <tr>
                            <td colSpan={40} style={{
                                textAlign: "left",
                                fontSize: "12px",
                                fontFamily: "Arial",
                                fontWeight: "bold",

                            }}
                            >
                                PAST MEDICAL HISTORY:
                            </td>
                        </tr>


                        <tr>
                            <td
                                colSpan={40}
                                style={{
                                    textAlign: "left",
                                    fontSize: "12px",
                                    fontFamily: "Arial",

                                }}
                            >
                                <b style={{ marginLeft: "40px" }}>Previous Illness:</b> (May naging dating karamdaman o sakit)
                            </td>
                        </tr>

                        <tr>
                            <td colSpan={40} style={{ padding: "1px" }}>
                                <div
                                    style={{
                                        width: "100%",
                                        display: "flex",
                                        justifyContent: "center",
                                        fontFamily: "Arial",
                                        fontSize: "12px",
                                    }}
                                >
                                    <table
                                        style={{
                                            width: "90%",
                                            borderCollapse: "collapse",
                                            textAlign: "left",
                                        }}
                                    >
                                        <tbody>
                                            <tr>
                                                <td style={{ width: "50%", padding: "2px 10px", fontSize: "12px", fontFamily: "Arial", }}>____ Convulsion / Epilepsy</td>
                                                <td style={{ width: "50%", padding: "2px 10px", fontSize: "12px", fontFamily: "Arial", }}>____ Dengue Fever</td>
                                            </tr>
                                            <tr>
                                                <td style={{ padding: "2px 10px", fontSize: "12px", fontFamily: "Arial", }}>____ Cough / Colds</td>
                                                <td style={{ padding: "2px 10px", fontSize: "12px", fontFamily: "Arial", }}>____ Malaria</td>
                                            </tr>
                                            <tr>
                                                <td style={{ padding: "2px 10px", fontSize: "12px", fontFamily: "Arial", }}>____ Tuberculosis (TB)</td>
                                                <td style={{ padding: "2px 10px", fontSize: "12px", fontFamily: "Arial", }}>____ Pneumonia</td>
                                            </tr>
                                            <tr>
                                                <td style={{ padding: "2px 10px", fontSize: "12px", fontFamily: "Arial", }}>____ Tonsillitis</td>
                                                <td style={{ padding: "2px 10px", fontSize: "12px", fontFamily: "Arial", }}>____ Urinary Tract Infection</td>
                                            </tr>
                                            <tr>
                                                <td style={{ padding: "2px 10px", fontSize: "12px", fontFamily: "Arial", }}>____ Measles (Tigdas)</td>
                                                <td style={{ padding: "2px 10px", fontSize: "12px", fontFamily: "Arial", }}>____ Typhoid Fever</td>
                                            </tr>
                                            <tr>
                                                <td style={{ padding: "2px 10px", fontSize: "12px", fontFamily: "Arial", }}>____ Chicken Pox (Bulutong)</td>
                                                <td style={{ padding: "2px 10px", fontSize: "12px", fontFamily: "Arial", }}>____ Asthma (Hika)</td>
                                            </tr>
                                            <tr>
                                                <td style={{ padding: "2px 10px", fontSize: "12px", fontFamily: "Arial", }}>____ Heart Problem / Fainting Attack (Sakit sa Puso)</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </td>
                        </tr>

                        <tr>
                            <td
                                colSpan={40}
                                style={{
                                    textAlign: "left",
                                    fontSize: "12px",
                                    fontFamily: "Arial",
                                    paddingBottom: "6px",
                                }}
                            >
                                <b style={{ marginLeft: "40px" }}>Immunization:</b> Paki check ( / ) ang mga natanggap ng bakuna.
                            </td>
                        </tr>

                        <tr>
                            <td
                                colSpan={40}
                                style={{
                                    textAlign: "left",
                                    fontSize: "12px",
                                    fontFamily: "Arial",
                                    paddingLeft: "60px",
                                }}
                            >
                                <table style={{ borderCollapse: "collapse", width: "100%" }}>
                                    <tbody>
                                        <tr>
                                            <td style={{ width: "120px", fontSize: "12px", fontFamily: "Arial", }}>___ BCG</td>
                                            <td style={{ width: "120px", fontSize: "12px", fontFamily: "Arial", }}>___ Hepa A</td>
                                            <td style={{ width: "140px", fontSize: "12px", fontFamily: "Arial", }}>___ Typhoid Fever</td>
                                            <td style={{ width: "120px", fontSize: "12px", fontFamily: "Arial", }}>___ Hepa B</td>
                                            <td style={{ width: "120px", fontSize: "12px", fontFamily: "Arial", }}>___ DPT</td>
                                            <td style={{ width: "120px", fontSize: "12px", fontFamily: "Arial", }}>___ MMR</td>
                                        </tr>
                                        <tr>
                                            <td style={{ width: "120px", fontSize: "12px", fontFamily: "Arial", }}>___ Tetanus Toxoid</td>
                                            <td style={{ width: "120px", fontSize: "12px", fontFamily: "Arial", }}>___ HIV</td>
                                            <td style={{ width: "120px", fontSize: "12px", fontFamily: "Arial", }}>___ OPV</td>
                                            <td style={{ width: "120px", fontSize: "12px", fontFamily: "Arial", }}>___ Influenza</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </td>
                        </tr>




                        <tr>
                            <td
                                colSpan={40}
                                style={{
                                    textAlign: "left",
                                    fontsize: "12px",
                                    paddingBottom: "1px",
                                    fontFamily: "Arial",
                                }}
                            >
                                <div
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        marginLeft: "35px",
                                        fontFamily: "Arial",
                                        fontSize: "12px",
                                    }}
                                >
                                    <span>
                                        &gt; Allergies: <i>(Meron, Wala)</i> Kung meron, Allergy Saan?
                                    </span>

                                    <span
                                        style={{
                                            flexGrow: 1,
                                            borderBottom: "1px solid black",
                                            marginLeft: "5px",
                                            marginRight: "10px",
                                            fontSize: "12px",
                                        }}
                                    ></span>

                                    <span style={{ whiteSpace: "nowrap", display: "flex", alignItems: "center" }}>
                                        Medications:
                                        <span
                                            style={{
                                                borderBottom: "1px solid black",
                                                display: "inline-block",
                                                width: "100px", // fixed width so it always shows the underline
                                                marginLeft: "5px",
                                            }}
                                        ></span>
                                    </span>
                                </div>

                            </td>
                        </tr>

                        <tr>
                            <td
                                colSpan={40}
                                style={{

                                    alignItems: "center",
                                    marginLeft: "35px",
                                    fontFamily: "Arial",
                                    fontSize: "12px",
                                }}
                            >
                                <div style={{ display: "flex", alignItems: "center", marginLeft: "35px" }}>
                                    <span>
                                        &gt; Previous Hospitalization/s <i>(OO, Hindi)</i> Saan?
                                    </span>
                                    <span
                                        style={{
                                            flexGrow: 1,
                                            borderBottom: "1px solid black",
                                            marginLeft: "5px",
                                        }}
                                    ></span>
                                </div>
                            </td>
                        </tr>

                        <tr>
                            <td
                                colSpan={40}
                                style={{
                                    alignItems: "center",
                                    marginLeft: "35px",
                                    fontFamily: "Arial",
                                    fontSize: "12px",
                                }}
                            >
                                <div style={{ display: "flex", alignItems: "center", marginLeft: "35px" }}>
                                    <span>
                                        &gt; Operations / Operasyon: <i>(Meron, Wala)</i> Kung meron, Ano?
                                    </span>
                                    <span
                                        style={{
                                            flexGrow: 1,
                                            borderBottom: "1px solid black",
                                            marginLeft: "5px",
                                        }}
                                    ></span>
                                </div>
                            </td>
                        </tr>

                        <tr>
                            <td
                                colSpan={40}
                                style={{
                                    alignItems: "center",
                                    marginLeft: "35px",
                                    fontFamily: "Arial",
                                    fontSize: "12px",
                                }}
                            >
                                <div style={{ display: "flex", alignItems: "center", marginLeft: "35px" }}>
                                    <span>
                                        &gt; Accidents: <i>(OO, Hindi)</i> Ano?
                                    </span>
                                    <span
                                        style={{
                                            flexGrow: 1,
                                            borderBottom: "1px solid black",
                                            marginLeft: "5px",
                                        }}
                                    ></span>
                                </div>
                            </td>
                        </tr>

                        <tr>
                            <td
                                colSpan={40}
                                style={{
                                    alignItems: "center",
                                    marginLeft: "35px",
                                    fontFamily: "Arial",
                                    fontSize: "12px",
                                    marginBottom: "5px"
                                }}
                            >
                                <div style={{ display: "flex", alignItems: "center", marginLeft: "35px", fontsize: "12px" }}>
                                    <span style={{ fontsize: "12px", marginBottom: "5px" }}>
                                        &gt; Disabilities (Kapansanan) / Congenital Abnormalities{" "}
                                        <i>(Meron, Wala)</i> Ano?
                                    </span>
                                    <span
                                        style={{
                                            flexGrow: 1,
                                            borderBottom: "1px solid black",
                                            marginLeft: "5px",
                                            paddingBottom: "3px"
                                        }}
                                    ></span>
                                </div>
                            </td>
                        </tr>
                        <tr>
                            <td colSpan={40} style={{ height: "10px" }} />
                        </tr>
                    </tbody>

                    {/* PUBERTAL HISTORY */}
                    <tr>
                        <td colSpan={40} style={{ borderBottom: "1px solid black" }} />
                    </tr>
                    <tr>
                        <td colSpan={40} style={{ height: "10px" }} />
                    </tr>
                    <tr>
                        <td colSpan={40} style={{
                            textAlign: "left",
                            fontSize: "12px",
                            fontWeight: "bold",
                            fontFamily: "Arial",

                            paddingBottom: "2px",
                        }}
                        >
                            PUBERTAL HISTORY:
                        </td>
                    </tr>

                    <tr>
                        <td
                            colSpan={40}
                            style={{
                                textAlign: "left",
                                fontSize: "12px",
                                fontFamily: "Arial",
                                paddingLeft: "40px",
                                paddingTop: "2px",
                                lineHeight: "1.4",
                            }}
                        >
                            <table
                                style={{
                                    width: "100%",
                                    borderCollapse: "collapse",
                                    fontFamily: "Arial",
                                    fontSize: "12px",
                                }}
                            >
                                <tbody>
                                    {/* Headers */}
                                    <tr>
                                        <td style={{ width: "50%", fontWeight: "bold", verticalAlign: "top" }}>
                                            MALE: <span style={{ fontWeight: "normal" }}>(Pagbibinata)</span>
                                        </td>
                                        <td style={{ width: "50%", fontWeight: "bold", verticalAlign: "top" }}>
                                            FEMALE: <span style={{ fontWeight: "normal" }}>(Pagdadalaga)</span>
                                        </td>
                                    </tr>

                                    {/* Row 1 */}
                                    <tr>
                                        <td>
                                            Age of onset (Edad):{" "}
                                            <span
                                                style={{
                                                    display: "inline-block",
                                                    width: "80px",
                                                    borderBottom: "1px solid #000",
                                                }}
                                            ></span>
                                            <br />
                                            Genital Enlargement (Edad):{" "}
                                            <span
                                                style={{
                                                    display: "inline-block",
                                                    width: "80px",
                                                    borderBottom: "1px solid #000",
                                                }}
                                            ></span>
                                            <br />
                                            Pubic Hair (Edad):{" "}
                                            <span
                                                style={{
                                                    display: "inline-block",
                                                    width: "80px",
                                                    borderBottom: "1px solid #000",
                                                }}
                                            ></span>
                                        </td>

                                        <td style={{ verticalAlign: "top" }}>
                                            Age of Onset (Edad):{" "}
                                            <span
                                                style={{
                                                    display: "inline-block",
                                                    width: "80px",
                                                    borderBottom: "1px solid #000",
                                                }}
                                            ></span>
                                            &nbsp;&nbsp;Breast:{" "}
                                            <span
                                                style={{
                                                    display: "inline-block",
                                                    width: "80px",
                                                    borderBottom: "1px solid #000",
                                                }}
                                            ></span>
                                            <br />
                                            Pubic Hair (Edad):{" "}
                                            <span
                                                style={{
                                                    display: "inline-block",
                                                    width: "80px",
                                                    borderBottom: "1px solid #000",
                                                }}
                                            ></span>
                                            <br />
                                            Menarche (Edad ng unang dinatnan ng regla):{" "}
                                            <span
                                                style={{
                                                    display: "inline-block",
                                                    width: "80px",
                                                    borderBottom: "1px solid #000",
                                                }}
                                            ></span>
                                            <br />
                                            LMP <span style={{ fontStyle: "italic" }}>
                                                (Petsa ng huling regla)
                                            </span>
                                            :{" "}
                                            <span
                                                style={{
                                                    display: "inline-block",
                                                    width: "80px",
                                                    borderBottom: "1px solid #000",
                                                }}
                                            ></span>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td colSpan={40} style={{ height: "10px" }} />
                                    </tr>
                                </tbody>
                            </table>
                        </td>
                    </tr>

                    <tr>
                        <td colSpan={40} style={{ borderBottom: "1px solid black" }} />
                    </tr>
                    <tr>
                        <td colSpan={40} style={{ height: "10px" }} />
                    </tr>
                    <tr>
                        <td colSpan={40} style={{
                            textAlign: "left",
                            fontSize: "12px",
                            fontFamily: "Arial",
                            fontWeight: "bold",

                            paddingBottom: "2px",
                        }}
                        >
                            FAMILY HISTORY:{" "}
                            <span style={{ fontWeight: "normal" }}>
                                (Mga sakit ng pamilya) Please check ( / ) Identify affected family member if possible.
                            </span>
                        </td>
                    </tr>

                    {/* CHECKBOX ROWS */}
                    <tr>
                        <td
                            colSpan={40}
                            style={{
                                textAlign: "left",
                                fontSize: "12px",
                                fontFamily: "Arial",
                                paddingLeft: "40px",
                                paddingTop: "2px",
                                lineHeight: "1.4",
                            }}
                        >
                            <table
                                style={{
                                    width: "100%",
                                    borderCollapse: "collapse",
                                    fontFamily: "Arial",
                                    fontSize: "12px",
                                }}
                            >
                                <tbody>
                                    <tr>
                                        <td style={{ width: "14%" }}>___ Hypertension</td>
                                        <td style={{ width: "12%" }}>___ Cancer</td>
                                        <td style={{ width: "15%" }}>___ Heart Disease</td>
                                        <td style={{ width: "16%" }}>___ Mental Illness</td>
                                        <td style={{ width: "17%" }}>___ Kidney Disease</td>
                                        <td style={{ width: "10%" }}>___ Allergy</td>
                                    </tr>
                                    <tr>
                                        <td style={{ width: "14%" }}>___ Asthma</td>
                                        <td style={{ width: "15%" }}>___ Others Illness</td>
                                        <td style={{ width: "20%" }}>___ Diabetes</td>
                                    </tr>
                                </tbody>
                            </table>
                        </td>
                    </tr>

                    {/* FATHER ROW */}
                    <tr style={{ fontFamily: "Arial", fontSize: "12px", lineHeight: "1.2" }}>
                        <td colSpan={40} style={{ paddingLeft: "40px", paddingTop: "4px" }}>
                            <table style={{ width: "100%", borderCollapse: "collapse" }}>
                                <tbody>
                                    <tr>
                                        <td style={{ width: "7%", fontWeight: "bold", fontSize: "12px" }}>Father:</td>
                                        <td
                                            style={{
                                                width: "33%",
                                                borderBottom: "1px solid #000",
                                                textTransform: "lowercase",
                                                fontSize: "12px", fontFamily: "Arial"
                                            }}
                                        >
                                            {person.father_given_name} {person.father_middle_name} {person.father_family_name}
                                        </td>
                                        <td style={{ width: "5%", fontWeight: "bold", textAlign: "right", fontSize: "12px", fontFamily: "Arial" }}>Age:</td>
                                        <td style={{ width: "8%", borderBottom: "1px solid #000" }}></td>
                                        <td style={{ width: "10%", fontWeight: "bold", textAlign: "right", fontSize: "12px", fontFamily: "Arial" }}>Education:</td>
                                        <td style={{ width: "12%", borderBottom: "1px solid #000" }}></td>
                                        <td style={{ width: "10%", fontWeight: "bold", textAlign: "right", fontSize: "12px", fontFamily: "Arial" }}>Occupation:</td>
                                        <td style={{ width: "15%", borderBottom: "1px solid #000", fontSize: "12px", fontFamily: "Arial" }}>
                                            {person.father_occupation}
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </td>
                    </tr>

                    {/* MOTHER ROW */}
                    <tr style={{ fontFamily: "Arial", fontSize: "12px", lineHeight: "1.2" }}>
                        <td colSpan={40} style={{ paddingLeft: "40px", paddingTop: "2px" }}>
                            <table style={{ width: "100%", borderCollapse: "collapse" }}>
                                <tbody>
                                    <tr>
                                        <td style={{ width: "7%", fontWeight: "bold", fontSize: "12px" }}>Mother:</td>
                                        <td
                                            style={{
                                                width: "33%",
                                                borderBottom: "1px solid #000",
                                                textTransform: "lowercase",
                                                fontSize: "12px", fontFamily: "Arial"
                                            }}
                                        >
                                            {person.mother_given_name} {person.mother_middle_name} {person.mother_family_name}
                                        </td>
                                        <td style={{ width: "5%", fontWeight: "bold", textAlign: "right", fontSize: "12px", fontFamily: "Arial" }}>Age:</td>
                                        <td style={{ width: "8%", borderBottom: "1px solid #000" }}></td>
                                        <td style={{ width: "10%", fontWeight: "bold", textAlign: "right", fontSize: "12px", fontFamily: "Arial" }}>Education:</td>
                                        <td style={{ width: "12%", borderBottom: "1px solid #000" }}></td>
                                        <td style={{ width: "10%", fontWeight: "bold", textAlign: "right", fontSize: "12px", fontFamily: "Arial" }}>Occupation:</td>
                                        <td style={{ width: "15%", borderBottom: "1px solid #000", fontSize: "12px", fontFamily: "Arial" }}>
                                            {person.mother_occupation}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td colSpan={40} style={{ height: "10px" }} />
                                    </tr>
                                </tbody>
                            </table>
                        </td>
                    </tr>


                    <tr>
                        <td colSpan={40} />
                    </tr>

                    <tr>
                        <td colSpan={40} style={{ borderBottom: "1px solid black" }} />
                    </tr>
                    <tr>
                        <td colSpan={40} style={{ height: "10px" }} />
                    </tr>
                    <tr>
                        <td colSpan={40}
                            style={{
                                fontFamily: "Arial",
                                fontSize: "12px",
                                fontWeight: "bold",
                                textAlign: "left",
                                paddingBottom: "5px",
                            }}>
                            PHYSICAL EXAMINATION:
                        </td>
                    </tr>
                    <tr>
                        <td colSpan={40} style={{ paddingTop: "3px", verticalAlign: "top" }}>
                            <table
                                style={{
                                    width: "100%",
                                    borderCollapse: "collapse",
                                    fontFamily: "Arial",
                                    fontSize: "12px",
                                }}
                            >
                                <tbody>
                                    <tr>
                                        {/* LEFT SIDE */}
                                        <td style={{ width: "50%", verticalAlign: "top" }}>
                                            <table
                                                style={{
                                                    width: "100%",
                                                    borderCollapse: "collapse",
                                                    textAlign: "left",
                                                    fontSize: "12px"
                                                }}
                                            >
                                                <tbody>
                                                    {/* Weight */}
                                                    <tr>
                                                        <td style={{ width: "45%", fontSize: "12px" }}>Weight (Timbang):</td>
                                                        <td style={{ borderBottom: "1px solid #000", width: "35%", textAlign: "center" }}>
                                                            {medicalData?.weight || ""}
                                                        </td>
                                                        <td style={{ width: "45%", fontSize: "12px" }}>kg</td>
                                                    </tr>
                                                    <tr>
                                                        <td style={{ width: "45%", fontSize: "12px" }}>Height (Tangkad):</td>
                                                        <td style={{ borderBottom: "1px solid #000", textAlign: "center" }}>
                                                            {medicalData?.height || ""}
                                                        </td>
                                                        <td style={{ width: "45%", fontSize: "12px" }}>m</td>
                                                    </tr>
                                                    <tr>
                                                        <td style={{ width: "45%", fontSize: "12px" }}>Body Mass Index (BMI):</td>
                                                        <td style={{ borderBottom: "1px solid #000", textAlign: "center" }}>
                                                            {medicalData?.bmi || ""}
                                                        </td>
                                                    </tr>
                                                    <tr>
                                                        <td style={{ width: "45%", fontSize: "12px" }}>Interpretation:</td>
                                                        <td style={{ borderBottom: "1px solid #000", textAlign: "center" }}>
                                                            {medicalData?.interpretation || ""}
                                                        </td>
                                                    </tr>
                                                    <tr>
                                                        <td style={{ width: "45%", fontSize: "12px" }}>Heart Rate:</td>
                                                        <td style={{ borderBottom: "1px solid #000", textAlign: "center" }}>
                                                            {medicalData?.heart_rate || ""}
                                                        </td>
                                                        <td>bpm</td>
                                                    </tr>
                                                    <tr>
                                                        <td style={{ width: "45%", fontSize: "12px" }}>Respiratory Rate:</td>
                                                        <td style={{ borderBottom: "1px solid #000" }}></td>
                                                        <td>cpm</td>
                                                    </tr>
                                                    <tr>
                                                        <td style={{ width: "45%", fontSize: "12px" }}>O₂ Saturation:</td>
                                                        <td style={{ borderBottom: "1px solid #000" }}></td>
                                                        <td>% SPO₂</td>
                                                    </tr>
                                                    <tr>
                                                        <td style={{ width: "45%", fontSize: "12px" }}>Blood Pressure:</td>
                                                        <td style={{ borderBottom: "1px solid #000" }}></td>
                                                        <td>mmHg</td>
                                                    </tr>
                                                    <tr>
                                                        <td style={{ width: "45%", fontSize: "12px" }}>Vision Acuity:</td>
                                                        <td style={{ borderBottom: "1px solid #000" }}></td>
                                                    </tr>
                                                    <tr>
                                                        <td style={{ width: "45%", fontSize: "12px" }}>(with glasses):</td>
                                                        <td style={{ borderBottom: "1px solid #000" }}></td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                        </td>

                                        {/* RIGHT SIDE */}
                                        <td style={{ width: "50%", verticalAlign: "top", paddingLeft: "15px" }}>
                                            <div
                                                style={{
                                                    fontWeight: "bold",
                                                    marginBottom: "3px",
                                                    fontSize: "12px",
                                                    marginTop: "-25px",
                                                }}
                                            >
                                                Please check ( / ) if Normal. Describe the abnormal findings on the space below{" "}
                                                <span style={{ fontStyle: "italic" }}>(Ipaliwanag ang abnormal)</span>
                                            </div>

                                            {/* Right Column Table */}

                                            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                                                <tbody>
                                                    {[
                                                        { label: "General Survey (Pangkalahatang anyo)", key: "general_survey" },
                                                        { label: "Skin (Balat)", key: "skin" },
                                                        { label: "Eyes (Mata)", key: "eyes" },
                                                        { label: "EENT (Mata, Taenga, Ilong, Lalamunan)", key: "ent" },
                                                        { label: "Neck (Leeg)", key: "neck" },
                                                        { label: "Heart (Puso)", key: "heart" },
                                                        { label: "Chest/Lungs (Dibdib/Baga)", key: "chest_lungs" },
                                                        { label: "Abdomen (Tiyan)", key: "abdomen" },
                                                        { label: "Musculoskeletal", key: "musculoskeletal" },
                                                        { label: "Breast Examination", key: "breast_exam" },
                                                    ].map(({ label, key }) => (
                                                        <tr key={key}>
                                                            <td style={{ width: "65%", fontSize: "12px" }}>
                                                                {medicalData?.[key] ? "✓" : "___"} {label}:
                                                            </td>
                                                            <td style={{ borderBottom: "1px solid #000", fontSize: "12px", paddingLeft: "4px" }}>
                                                                {medicalData?.[key] && medicalData[key] !== "Normal" ? medicalData[key] : ""}
                                                            </td>
                                                        </tr>
                                                    ))}

                                                    {/* Genitalia rows */}
                                                    <tr>
                                                        <td colSpan={2}>
                                                            <table style={{ width: "100%", borderCollapse: "collapse" }}>
                                                                <tbody>
                                                                    <tr>
                                                                        <td style={{ width: "25%", fontSize: "12px" }}>
                                                                            {medicalData?.genitalia_smr ? "✓" : "___"} Genitalia:
                                                                        </td>
                                                                        <td style={{ width: "25%", fontSize: "12px" }}>Male SMR:</td>
                                                                        <td style={{ borderBottom: "1px solid #000", width: "25%", fontSize: "12px", paddingLeft: "4px" }}>
                                                                            {medicalData?.genitalia_smr || ""}
                                                                        </td>
                                                                        <td style={{ width: "10%", fontSize: "12px" }}>Penis:</td>
                                                                        <td style={{ borderBottom: "1px solid #000", width: "25%", fontSize: "12px", paddingLeft: "4px" }}>
                                                                            {medicalData?.penis || ""}
                                                                        </td>
                                                                    </tr>
                                                                    <tr>
                                                                        <td></td>
                                                                        <td style={{ fontSize: "12px" }}>Female SMR:</td>
                                                                        <td style={{ borderBottom: "1px solid #000" }}></td>
                                                                        <td style={{ fontSize: "12px" }}>Breast:</td>
                                                                        <td style={{ borderBottom: "1px solid #000" }}></td>
                                                                    </tr>
                                                                    <tr>
                                                                        <td></td>
                                                                        <td></td>
                                                                        <td></td>
                                                                        <td style={{ fontSize: "12px" }}>Vagina:</td>
                                                                        <td style={{ borderBottom: "1px solid #000" }}></td>
                                                                    </tr>
                                                                    <tr>
                                                                        <td colSpan={40} style={{ height: "10px" }} />
                                                                    </tr>
                                                                </tbody>
                                                            </table>
                                                        </td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </td>
                    </tr>

                    {/* NEUROLOGICAL EXAMINATION */}
                    <tr>
                        <td colSpan={40} style={{ borderBottom: "1px solid black", height: "1px" }}></td>
                    </tr>
                    <tr>
                        <td colSpan={40} style={{ height: "10px" }} />
                    </tr>
                    <tr>
                        <td colSpan={40} style={{ fontFamily: "Arial", fontSize: "12px", fontWeight: "bold", paddingTop: "5px", textAlign: "left" }}>
                            NEUROLOGICAL EXAMINATION:
                        </td>
                    </tr>
                    <tr>
                        <td colSpan={40} style={{ fontFamily: "Arial", fontSize: "12px", paddingBottom: "4px", textAlign: "left" }}>
                            Describe Abnormal Findings
                        </td>
                    </tr>

                    <tr>
                        <td colSpan={40} style={{ fontFamily: "Arial", fontSize: "12px", padding: "4px 0" }}>
                            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontFamily: "Arial", fontSize: "12px" }}>
                                <tbody>
                                    <tr>
                                        <td style={{ width: "20%", padding: "2px 4px", fontSize: "12px" }}>
                                            {neuroData?.pne_mental_status_check ? "✓" : "___"} Mental Status:
                                        </td>
                                        <td style={{ width: "30%", borderBottom: "1px solid black", paddingLeft: "4px" }}>
                                            {neuroData?.pne_mental_status_text || ""}
                                        </td>
                                        <td style={{ width: "4%" }}></td>
                                        <td style={{ width: "16%", padding: "2px 4px", fontSize: "12px" }}>
                                            {neuroData?.pne_sensory_check ? "✓" : "___"} Sensory:
                                        </td>
                                        <td style={{ width: "30%", borderBottom: "1px solid black", paddingLeft: "4px" }}>
                                            {neuroData?.pne_sensory_text || ""}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style={{ padding: "2px 4px", fontSize: "12px" }}>
                                            {neuroData?.pne_cranial_nerve_check ? "✓" : "___"} Cranial Nerve:
                                        </td>
                                        <td style={{ borderBottom: "1px solid black", paddingLeft: "4px" }}>
                                            {neuroData?.pne_cranial_nerve_text || ""}
                                        </td>
                                        <td></td>
                                        <td style={{ padding: "2px 4px", fontSize: "12px" }}>
                                            {neuroData?.pne_cerebellar_check ? "✓" : "___"} Cerebellar:
                                        </td>
                                        <td style={{ borderBottom: "1px solid black", paddingLeft: "4px" }}>
                                            {neuroData?.pne_cerebellar_text || ""}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style={{ padding: "2px 4px", fontSize: "12px" }}>
                                            {neuroData?.pne_motor_check ? "✓" : "___"} Motor:
                                        </td>
                                        <td style={{ borderBottom: "1px solid black", paddingLeft: "4px" }}>
                                            {neuroData?.pne_motor_text || ""}
                                        </td>
                                        <td></td>
                                        <td style={{ padding: "2px 4px", fontSize: "12px" }}>
                                            {neuroData?.pne_reflexes_check ? "✓" : "___"} Reflexes:
                                        </td>
                                        <td style={{ borderBottom: "1px solid black", paddingLeft: "4px" }}>
                                            {neuroData?.pne_reflexes_text || ""}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td colSpan={40} style={{ height: "10px" }} />
                                    </tr>
                                </tbody>
                            </table>
                        </td>
                    </tr>

                    {/* Findings Section */}
                    <tr>
                        <td colSpan={40} style={{ fontFamily: "Arial", fontSize: "12px", fontWeight: "bold", paddingTop: "6px", borderTop: "1px solid black", textAlign: "left" }}>
                            FINDINGS / ASSESSMENT / PSYCHOLOGICAL:
                            <span style={{ fontWeight: "normal" }}> (Problems Identified)</span>
                        </td>
                    </tr>
                    <tr>
                        <td colSpan={40} style={{ borderBottom: "1px solid black", height: "14px", paddingLeft: "4px", fontSize: "12px", fontFamily: "Arial" }}>
                            {neuroData?.pne_findings_psychological || ""}
                        </td>
                    </tr>
                    <tr>
                        <td colSpan={40} style={{ borderBottom: "1px solid black", height: "14px" }}></td>
                    </tr>

                    {/* Recommendations Section */}
                    <tr>
                        <td colSpan={40} style={{ fontFamily: "Arial", fontSize: "12px", fontWeight: "bold", paddingTop: "6px", borderTop: "1px solid black", textAlign: "left" }}>
                            RECOMMENDATIONS:
                            <span style={{ fontWeight: "normal" }}> (Plan of management / Diagnostic / Therapeutic / Referral)</span>
                        </td>
                    </tr>
                    <tr>
                        <td colSpan={40} style={{ borderBottom: "1px solid black", height: "14px", paddingLeft: "4px", fontSize: "12px", fontFamily: "Arial" }}>
                            {neuroData?.pne_recommendations || ""}
                        </td>
                    </tr>

                    <tr>
                        <td colSpan={40} style={{ padding: 0 }}>
                            <div style={{ borderBottom: "1px solid black", minHeight: "20px" }} />
                        </td>
                    </tr>

                    <tr>
                        <td colSpan={40} style={{ padding: 0, margin: 0, fontSize: "12px", fontFamily: "Arial" }}>
                            <div
                                style={{
                                    marginTop: "10px",
                                    textAlign: "right", // since we’ll use margin for positioning
                                    marginRight: "1%", // adjust until text sits between columns 6–8

                                }}
                            >
                                Page 2 of 2
                            </div>
                        </td>
                    </tr>


                </table>
            </div>

        </Box >

    );
};

export default HealthRecord;
