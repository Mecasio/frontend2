import React, { useState, useEffect, useContext, useRef, forwardRef, useImperativeHandle } from "react";

import { SettingsContext } from "../App";
import axios from "axios";
import { Box, Container, Typography } from "@mui/material";
import EaristLogo from "../assets/EaristLogo.png";
import { FcPrint } from "react-icons/fc";
import { useLocation } from "react-router-dom";

import API_BASE_URL from "../apiConfig";
const StudentOfficeOfTheRegistrar = forwardRef((props, ref) => {
  const settings = useContext(SettingsContext);
  const colors = settings?.colors || {};
  const branding = settings?.branding || {};
  const assets = settings?.assets || {};
  const headerColor = colors.header || "#1976d2";

  const [titleColor, setTitleColor] = useState("#000000");
  const [subtitleColor, setSubtitleColor] = useState("#555555");
  const [borderColor, setBorderColor] = useState("#000000");
  const [mainButtonColor, setMainButtonColor] = useState("#1976d2");
  const [subButtonColor, setSubButtonColor] = useState("#ffffff"); // ✅ NEW
  const [stepperColor, setStepperColor] = useState("#000000"); // ✅ NEW

  const [fetchedLogo, setFetchedLogo] = useState(null);
  const [companyName, setCompanyName] = useState("");
  const [shortTerm, setShortTerm] = useState("");
  const [branches, setBranches] = useState([]);

  useEffect(() => {
    if (!settings) return;

    // 🎨 Colors
    if (colors.title) setTitleColor(colors.title);
    if (colors.subtitle) setSubtitleColor(colors.subtitle);
    if (colors.border) setBorderColor(colors.border);
    if (colors.mainButton)
      setMainButtonColor(colors.mainButton);
    if (colors.subButton) setSubButtonColor(colors.subButton); // ✅ NEW
    if (colors.stepper) setStepperColor(colors.stepper); // ✅ NEW

    // 🏫 Logo
    if (assets.logoUrl) {
      setFetchedLogo(`${assets.logoUrl}`);
    } else {
      setFetchedLogo(EaristLogo);
    }

    // 🏷️ School Information
    if (branding.companyName) setCompanyName(branding.companyName);
    if (branding.shortTerm) setShortTerm(branding.shortTerm);
    setBranches(settings?.branches || []);
  }, [settings]);

  const words = companyName.trim().split(" ");
  const middleIndex = Math.ceil(words.length / 2);
  const firstLine = words.slice(0, middleIndex).join(" ");
  const secondLine = words.slice(middleIndex).join(" ");

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
    father_family_name: "",
    father_given_name: "",
    father_middle_name: "",
    father_ext: "",
    father_contact: "",
    father_occupation: "",
    father_income: "",
    father_email: "",
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
    schoolLevel: "",
    schoolLastAttended: "",
    schoolAddress: "",
    courseProgram: "",
    honor: "",
    generalAverage: "",
    yearGraduated: "",
    schoolLevel1: "",
    schoolLastAttended1: "",
    schoolAddress1: "",
    courseProgram1: "",
    honor1: "",
    generalAverage1: "",
    yearGraduated1: "",
    strand: "",
    created_at: "",
  });

  const [campusAddress, setCampusAddress] = useState("");
  const [activeSchoolYear, setActiveSchoolYear] = useState(null);

  useEffect(() => {
    const fetchActiveSchoolYear = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/api/active_school_year`);
        setActiveSchoolYear(res.data?.[0] || null);
      } catch (error) {
        console.error("Failed to fetch active school year:", error);
      }
    };

    fetchActiveSchoolYear();
  }, []);

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

  const activeCurrentYear = activeSchoolYear?.current_year || "";
  const activeNextYear =
    activeSchoolYear?.next_year ||
    (activeCurrentYear ? Number(activeCurrentYear) + 1 : "");
  const activeSemesterId = Number(activeSchoolYear?.semester_id);
  const activeSemesterLabel = `(${activeSemesterId === 1 ? "/" : " "}) 1st (${activeSemesterId === 2 ? "/" : " "}) 2nd`;

  const fetchPersonData = async (id) => {
    try {
      const res = await axios.get(
        `${API_BASE_URL}/api/student-person-data/${id}`,
      );
      setPerson(res.data); // make sure backend returns the correct format
    } catch (error) {
      console.error("Failed to fetch person:", error);
    }
  };

  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const queryPersonId = queryParams.get("person_id");

  // do not alter
  useEffect(() => {
    const storedUser = localStorage.getItem("email");
    const storedRole = localStorage.getItem("role");
    const loggedInPersonId = localStorage.getItem("person_id");
    const searchedPersonId = sessionStorage.getItem("student_edit_person_id");

    if (!storedUser || !storedRole || !loggedInPersonId) {
      window.location.href = "/login";
      return;
    }

    setUser(storedUser);
    setUserRole(storedRole);

    // Allow Applicant, Admin, SuperAdmin to view ECAT
    const allowedRoles = ["registrar", "applicant", "student"];
    if (allowedRoles.includes(storedRole)) {
      const targetId = searchedPersonId || queryPersonId || loggedInPersonId;
      setUserID(targetId);
      fetchPersonData(targetId);
      return;
    }

    window.location.href = "/login";
  }, [queryPersonId]);

  const divToPrintRef = useRef();
  useImperativeHandle(ref, () => divToPrintRef.current);

  const printDiv = () => {
    const divToPrint = divToPrintRef.current;
    if (divToPrint) {
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
     margin: 1;
   margin: 0;        
   margin-top: 0; 
     padding: 0;
     width: 210mm;
     height: 297mm;
     font-family: Arial;
   }
 
   *, *::before, *::after {
     box-sizing: border-box;
     margin: 1;
     padding: 0;
   }
 
 .print-container {
   width: 100%;
   height: auto;
   padding: 10px ;
 }
 
 
   button {
     display: none;
   }
 
     .student-table {
     margin-top: -10px !important;
   }
 
 
 
 
   svg.MuiSvgIcon-root {
     width: 24px !important;
     height: 24px !important;
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
      (e.ctrlKey && e.key.toLowerCase() === "u");

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
        <div ref={divToPrintRef}>
          <br />

          <Container>
            <div
              className="student-table"
              style={{
                width: "8in", // matches table width assuming 8in for 40 columns
                maxWidth: "100%",
                margin: "0 auto", // center the content
                fontFamily: "Arial",
                boxSizing: "border-box",

                padding: "5px", // reduced horizontal padding
                fontSize: "12px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexWrap: "wrap",
                }}
              >
                {/* Logo */}
                <div style={{ flexShrink: 0, marginRight: "20px" }}>
                  <img
                    src={fetchedLogo}
                    alt="School Logo"
                    style={{
                      width: "120px",
                      height: "120px",
                      objectFit: "cover",
                      marginLeft: "10px",
                      marginTop: "-10px",
                      borderRadius: "50%", // ✅ Perfect circle
                    }}
                  />
                </div>

                <div
                  style={{
                    flexGrow: 1,
                    textAlign: "center",

                    fontFamily: "Arial",
                    lineHeight: 1.4,
                    paddingTop: 0,
                    paddingBottom: 0,
                    letterSpacing: "1px",
                  }}
                >
                  <div
                    style={{
                      marginLeft: "-155px",
                      fontFamily: "Arial",
                      fontSize: "13px",
                    }}
                  >
                    Republic of the Philippines
                  </div>
                  <div
                    style={{
                      marginLeft: "-155px",
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
                        marginLeft: "-155px",
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
                        marginLeft: "-155px",
                      }}
                    >
                      {campusAddress}
                    </div>
                  )}

                  <div
                    style={{
                      fontSize: "12px",
                      fontFamily: "Arial",
                      fontWeight: "bold",
                      marginBottom: "5px",
                      marginTop: "20px",

                      marginLeft: "-145px",
                      marginBottom: "20px",
                      fontFamily: "Arial",
                      textAlign: "center",
                    }}
                  >
                    OFFICE OF THE REGISTRAR
                    <br />
                    APPLICATION FOR {shortTerm
                      ? shortTerm.toUpperCase()
                      : ""}{" "}
                    COLLEGE ADMISSION
                  </div>
                </div>
              </div>
            </div>
          </Container>

          <table
            style={{
              borderCollapse: "collapse",
              fontFamily: "Arial",
              width: "8in",
              marginTop: "-50px",
              margin: "0 auto",
              textAlign: "center",
              tableLayout: "fixed",
            }}
          >
            <tbody>
              <tr>
                <td
                  colSpan={23}
                  style={{
                    fontFamily: "Arial",
                    fontSize: "12px",
                    paddingTop: "5px", // you can reduce this if needed
                    marginTop: -10,

                    textAlign: "left",
                  }}
                >
                  <span
                    style={{
                      fontWeight: "bold",
                      marginRight: "30px",
                      textAlign: "left",
                    }}
                  >
                    Application Information: <span>(Pls. PRINT)</span>
                  </span>{" "}
                </td>
                <td
                  colSpan={7}
                  style={{
                    fontFamily: "Arial",
                    fontSize: "12px",
                    paddingTop: "5px", // you can reduce this if needed
                    marginTop: -10,
                    textAlign: "right",
                  }}
                >
                  Search App. No.
                </td>
                <td
                  colSpan={10}
                  style={{
                    border: "1px solid black",
                    textAlign: "left",
                    fontFamily: "Arial",
                    fontWeight: "bold",
                    fontSize: "12px",
                    verticalAlign: "middle", // ✅ changed from "top" to "middle"
                    padding: 0,
                  }}
                >
                  <input
                    type="text"
                    value={person.applicant_number || ""}
                    readOnly
                    style={{
                      width: "100%",
                      boxSizing: "border-box",
                      marginTop: 0, // ✅ removed the 5px marginTop
                      padding: "3px 0", // ✅ use padding instead
                      fontWeight: "normal",
                      border: "none",
                      textAlign: "center",
                      outline: "none",
                      fontSize: "12px",
                      fontFamily: "Arial",
                      background: "transparent", // ✅ prevents white box overlap
                      display: "block", // ✅ ensures it fills the td cleanly
                    }}
                  />
                </td>
              </tr>

              <tr>
                <td
                  colSpan={10}
                  style={{
                    fontFamily: "Arial",
                    fontSize: "12px",
                    paddingTop: "5px", // you can reduce this if needed
                    marginTop: 0,
                    textAlign: "center",
                    border: "1px solid black",
                    height: "30px",
                  }}
                >
                  Academic Year & Term
                </td>
                <td
                  colSpan={20}
                  style={{
                    fontFamily: "Arial",
                    fontSize: "12px",
                    paddingTop: "5px",
                    marginTop: 0,
                    textAlign: "left",
                    border: "1px solid black",
                    fontWeight: "bold",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      width: "100%",
                    }}
                  >
                    <span>SY {activeCurrentYear}</span>
                    <span>SY {activeNextYear}</span>
                    <span>{activeSemesterLabel}</span>
                    <span>O.R. No.</span>
                  </div>
                </td>

                <td
                  colSpan={10}
                  style={{
                    fontFamily: "Arial",
                    fontSize: "12px",
                    paddingTop: "5px", // you can reduce this if needed
                    marginTop: 0,
                    textAlign: "right",
                    border: "1px solid black",
                  }}
                ></td>
              </tr>
              <tr>
                <td
                  colSpan={10}
                  style={{
                    fontFamily: "Arial",
                    fontSize: "12px",
                    paddingTop: "5px", // you can reduce this if needed
                    marginTop: 0,
                    textAlign: "center",
                    borderLeft: "1px solid black",
                    borderRight: "1px solid black",
                    height: "30px",
                  }}
                >
                  Application Type:
                </td>
                <td
                  colSpan={20}
                  style={{
                    fontFamily: "Arial",
                    fontSize: "12px",
                    paddingTop: "5px",
                    fontWeight: "bold",
                    textAlign: "left",
                  }}
                >
                  <div
                    style={{ display: "flex", justifyContent: "space-between" }}
                  >
                    <span>
                      ({person.classifiedAs?.includes("Freshman") ? "✓" : " "})
                      Freshman
                    </span>
                    <span>
                      ({person.classifiedAs?.includes("Returnee") ? "✓" : " "})
                      Returnee
                    </span>
                    <span>Trans. No.</span>
                  </div>
                </td>
                <td
                  colSpan={10}
                  style={{
                    fontFamily: "Arial",
                    fontSize: "12px",
                    paddingTop: "5px", // you can reduce this if needed
                    marginTop: 0,
                    textAlign: "right",
                    border: "1px solid black",
                  }}
                ></td>
              </tr>
              <tr>
                <td
                  colSpan={10}
                  style={{
                    fontFamily: "Arial",
                    fontSize: "12px",
                    paddingTop: "5px", // you can reduce this if needed
                    marginTop: 0,
                    textAlign: "center",
                    borderBottom: "1px solid black",
                    borderLeft: "1px solid black",
                    borderRight: "1px solid black",
                  }}
                ></td>
                <td
                  colSpan={20}
                  style={{
                    fontFamily: "Arial",
                    fontSize: "12px",
                    paddingTop: "5px",
                    fontWeight: "bold",
                    textAlign: "left",
                  }}
                >
                  <div
                    style={{ display: "flex", justifyContent: "space-between" }}
                  >
                    <span>
                      ({person.classifiedAs?.includes("Transferee") ? "✓" : " "}
                      ) Transferee
                    </span>
                    <span>
                      ({person.classifiedAs?.includes("Old") ? "✓" : " "}) Old
                    </span>
                    <span>Application Date</span>
                  </div>
                </td>

                <td
                  colSpan={10}
                  style={{
                    fontFamily: "Arial",
                    fontSize: "12px",
                    paddingTop: "5px",
                    marginTop: 0,
                    textAlign: "center",
                    border: "1px solid black",
                  }}
                >
                  {person.created_at
                    ? new Date(person.created_at).toLocaleDateString("en-US", {
                      month: "short", // ✅ “Oct”
                      day: "2-digit", // ✅ “18”
                      year: "numeric", // ✅ “2025”
                      timeZone: "Asia/Manila", // ✅ force PH time
                    })
                    : ""}
                </td>
              </tr>

              <tr>
                <td
                  colSpan={10}
                  style={{
                    fontFamily: "Arial",
                    fontSize: "12px",
                    paddingTop: "5px",
                    marginTop: 0,
                    textAlign: "left",
                  }}
                >
                  <span style={{ fontWeight: "bold", marginRight: "5px" }}>
                    Course Applied:
                  </span>
                </td>
                <td
                  colSpan={20}
                  style={{
                    fontFamily: "Arial",
                    fontSize: "12px",
                    paddingTop: "5px",
                    marginTop: 0,
                    textAlign: "center",
                    border: "1px solid black",
                    height: "30px",
                  }}
                >
                  {curriculumOptions.length > 0
                    ? curriculumOptions
                      .find(
                        (item) =>
                          item?.curriculum_id?.toString() ===
                          (person?.program ?? "").toString(),
                      )
                      ?.program_description?.toUpperCase() ||
                    (person?.program?.toString()?.toUpperCase() ?? "")
                    : "LOADING..."}
                </td>

                <td
                  colSpan={10}
                  style={{
                    fontFamily: "Arial",
                    fontSize: "12px",
                    paddingTop: "5px", // you can reduce this if needed
                    marginTop: 0,
                    textAlign: "right",
                    border: "1px solid black",
                  }}
                ></td>
              </tr>
              <tr>
                <td
                  colSpan={10}
                  style={{
                    fontFamily: "Arial",
                    fontSize: "12px",
                    paddingTop: "5px", // you can reduce this if needed
                    marginTop: 0,
                    textAlign: "left",
                    fontWeight: "bold",
                  }}
                >
                  Major Study:
                </td>
                <td
                  colSpan={20}
                  style={{
                    fontFamily: "Arial",
                    fontSize: "12px",
                    paddingTop: "5px",
                    marginTop: 0,
                    textAlign: "center",
                    border: "1px solid black",
                    height: "30px",
                    textTransform: "uppercase",
                  }}
                >
                  {curriculumOptions.find(
                    (c) =>
                      c.curriculum_id?.toString() ===
                      (person?.program ?? "").toString(),
                  )?.major || ""}
                </td>
                <td
                  colSpan={10}
                  style={{
                    fontFamily: "Arial",
                    fontSize: "12px",
                    paddingTop: "5px", // you can reduce this if needed
                    marginTop: 0,
                    textAlign: "right",
                    border: "1px solid black",
                  }}
                ></td>
              </tr>

              <tr>
                <td
                  colSpan={40}
                  style={{
                    fontFamily: "Arial",
                    fontSize: "12px",
                    paddingTop: "5px", // you can reduce this if needed
                    marginTop: 0,
                    textAlign: "left",
                  }}
                >
                  <span
                    style={{
                      fontWeight: "bold",
                      marginRight: "30px",
                      textAlign: "left",
                    }}
                  >
                    Personal Information: <span>(Pls. PRINT)</span>
                  </span>{" "}
                </td>
              </tr>

              <tr>
                <td
                  colSpan={7}
                  style={{
                    fontFamily: "Arial",
                    fontSize: "12px",
                    paddingTop: "5px", // you can reduce this if needed
                    marginTop: 0,
                    textAlign: "left",
                    border: "1px solid black",
                  }}
                >
                  Last Name:
                </td>
                <td
                  colSpan={13}
                  style={{
                    fontFamily: "Arial",
                    fontSize: "12px",
                    paddingTop: "5px", // you can reduce this if needed
                    marginTop: 0,

                    textAlign: "center",
                    border: "1px solid black",
                    height: "10px",
                  }}
                >
                  <div
                    style={{
                      width: "100%",
                      textAlign: "left",
                      textTransform: "uppercase",
                    }}
                  >
                    {person.last_name}
                  </div>
                </td>

                <td
                  colSpan={2}
                  style={{
                    fontFamily: "Arial",
                    fontSize: "12px",
                    paddingTop: "5px", // you can reduce this if needed
                    marginTop: 0,
                    fontWeight: "bold",
                    textAlign: "center",

                    height: "10px",
                  }}
                ></td>
                <td
                  colSpan={9}
                  style={{
                    fontFamily: "Arial",
                    fontSize: "12px",
                    paddingTop: "5px", // you can reduce this if needed
                    marginTop: 0,
                    textAlign: "left",
                    fontWeight: "bold",
                  }}
                >
                  Present Address:
                </td>
                <td
                  colSpan={9}
                  style={{
                    fontFamily: "Arial",
                    fontSize: "12px",
                    paddingTop: "5px",
                    marginTop: 0,
                    textAlign: "left",
                    border: "1px solid black",
                  }}
                >
                  <span style={{ marginRight: "5px" }}>Street:</span>
                  {person.presentStreet || ""}
                </td>
              </tr>

              <tr>
                <td
                  colSpan={7}
                  style={{
                    fontFamily: "Arial",
                    fontSize: "12px",
                    paddingTop: "5px", // you can reduce this if needed
                    marginTop: 0,
                    textAlign: "left",
                    border: "1px solid black",
                  }}
                >
                  Given Name:
                </td>
                <td
                  colSpan={13}
                  style={{
                    fontFamily: "Arial",
                    fontSize: "12px",
                    paddingTop: "5px", // you can reduce this if needed
                    marginTop: 0,

                    textAlign: "center",
                    border: "1px solid black",
                    height: "10px",
                  }}
                >
                  <div
                    style={{
                      width: "100%",
                      textAlign: "left",
                      textTransform: "uppercase",
                    }}
                  >
                    {person.first_name}
                  </div>
                </td>

                <td
                  colSpan={2}
                  style={{
                    fontFamily: "Arial",
                    fontSize: "12px",
                    paddingTop: "5px", // you can reduce this if needed
                    marginTop: 0,
                    fontWeight: "bold",
                    textAlign: "center",

                    height: "10px",
                  }}
                ></td>
                <td
                  colSpan={9}
                  style={{
                    fontFamily: "Arial",
                    fontSize: "12px",
                    paddingTop: "5px",
                    marginTop: 0,
                    textAlign: "left",
                    border: "1px solid black",
                  }}
                >
                  <span style={{ marginRight: "5px" }}>Brgy:</span>
                  {person.presentBarangay || ""}
                </td>

                <td
                  colSpan={9}
                  style={{
                    fontFamily: "Arial",
                    fontSize: "12px",
                    paddingTop: "5px",
                    marginTop: 0,
                    textAlign: "left",
                    border: "1px solid black",
                  }}
                >
                  <span style={{ marginRight: "5px" }}>Town/City:</span>
                  {person.presentMunicipality || ""}
                </td>
              </tr>
              <tr>
                <td
                  colSpan={7}
                  style={{
                    fontFamily: "Arial",
                    fontSize: "12px",
                    paddingTop: "5px", // you can reduce this if needed
                    marginTop: 0,
                    textAlign: "left",
                    border: "1px solid black",
                  }}
                >
                  Middle Name:
                </td>
                <td
                  colSpan={13}
                  style={{
                    fontFamily: "Arial",
                    fontSize: "12px",
                    paddingTop: "5px", // you can reduce this if needed
                    marginTop: 0,

                    textAlign: "center",
                    border: "1px solid black",
                    height: "10px",
                  }}
                >
                  <div
                    style={{
                      width: "100%",
                      textAlign: "left",
                      textTransform: "uppercase",
                    }}
                  >
                    {person.middle_name}
                  </div>
                </td>

                <td
                  colSpan={2}
                  style={{
                    fontFamily: "Arial",
                    fontSize: "12px",
                    paddingTop: "5px", // you can reduce this if needed
                    marginTop: 0,
                    fontWeight: "bold",
                    textAlign: "center",

                    height: "10px",
                  }}
                ></td>
                <td
                  colSpan={9}
                  style={{
                    fontFamily: "Arial",
                    fontSize: "12px",
                    paddingTop: "5px",
                    marginTop: 0,
                    textAlign: "left",
                    border: "1px solid black",
                  }}
                >
                  <span style={{ marginRight: "5px" }}>Province:</span>
                  {person.presentProvince || ""}
                </td>

                <td
                  colSpan={9}
                  style={{
                    fontFamily: "Arial",
                    fontSize: "12px",
                    paddingTop: "5px",
                    marginTop: 0,
                    textAlign: "left",
                    border: "1px solid black",
                  }}
                >
                  <span style={{ marginRight: "5px" }}>Zip Code:</span>
                  {person.presentZipCode || ""}
                </td>
              </tr>
              <tr>
                <td
                  colSpan={7}
                  style={{
                    fontFamily: "Arial",
                    fontSize: "12px",
                    paddingTop: "5px", // you can reduce this if needed
                    marginTop: 0,
                    textAlign: "left",
                    border: "1px solid black",
                  }}
                >
                  Gender:
                </td>
                <td
                  colSpan={13}
                  style={{
                    fontFamily: "Arial",
                    fontSize: "12px",
                    paddingTop: "5px",
                    marginTop: 0,

                    textAlign: "left",
                    border: "1px solid black",
                    height: "10px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      padding: "0 50px",
                    }}
                  >
                    <span>({person.gender === 0 ? "✓" : " "}) Male</span>
                    <span>({person.gender === 1 ? "✓" : " "}) Female</span>
                  </div>
                </td>

                <td
                  colSpan={2}
                  style={{
                    fontFamily: "Arial",
                    fontSize: "12px",
                    paddingTop: "5px", // you can reduce this if needed
                    marginTop: 0,
                    fontWeight: "bold",
                    textAlign: "center",

                    height: "10px",
                  }}
                ></td>
                <td
                  colSpan={9}
                  style={{
                    fontFamily: "Arial",
                    fontSize: "12px",
                    paddingTop: "5px", // you can reduce this if needed
                    marginTop: 0,
                    textAlign: "left",

                    fontWeight: "bold",
                  }}
                >
                  Permanent Address
                </td>
                <td
                  colSpan={9}
                  style={{
                    fontFamily: "Arial",
                    fontSize: "12px",
                    paddingTop: "5px",
                    marginTop: 0,
                    textAlign: "left",
                    border: "1px solid black",
                  }}
                >
                  <span style={{ marginRight: "5px" }}>Street:</span>
                  {person.permanentStreet || ""}
                </td>
              </tr>
              <tr>
                <td
                  colSpan={7}
                  style={{
                    fontFamily: "Arial",
                    fontSize: "12px",
                    paddingTop: "5px", // you can reduce this if needed
                    marginTop: 0,
                    textAlign: "left",
                    border: "1px solid black",
                  }}
                >
                  Civil Status:
                </td>
                <td
                  colSpan={13}
                  style={{
                    fontFamily: "Arial",
                    fontSize: "12px",
                    paddingTop: "5px",
                    marginTop: 0,

                    textAlign: "left",
                    border: "1px solid black",
                    height: "10px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      padding: "0 50px",
                    }}
                  >
                    <span>
                      ({person.civilStatus === "Single" ? "✓" : " "}) Single
                    </span>
                    <span>
                      ({person.civilStatus === "Married" ? "✓" : " "}) Married
                    </span>
                  </div>
                </td>

                <td
                  colSpan={2}
                  style={{
                    fontFamily: "Arial",
                    fontSize: "12px",
                    paddingTop: "5px", // you can reduce this if needed
                    marginTop: 0,
                    fontWeight: "bold",
                    textAlign: "center",

                    height: "10px",
                  }}
                ></td>
                <td
                  colSpan={9}
                  style={{
                    fontFamily: "Arial",
                    fontSize: "12px",
                    paddingTop: "5px",
                    marginTop: 0,
                    textAlign: "left",
                    border: "1px solid black",
                  }}
                >
                  <span style={{ marginRight: "5px" }}>Brgy:</span>
                  {person.permanentBarangay || ""}
                </td>

                <td
                  colSpan={9}
                  style={{
                    fontFamily: "Arial",
                    fontSize: "12px",
                    paddingTop: "5px",
                    marginTop: 0,
                    textAlign: "left",
                    border: "1px solid black",
                  }}
                >
                  <span style={{ marginRight: "5px" }}>Town/City:</span>
                  {person.permanentMunicipality || ""}
                </td>
              </tr>

              <tr>
                <td
                  colSpan={7}
                  style={{
                    fontFamily: "Arial",
                    fontSize: "12px",
                    paddingTop: "5px", // you can reduce this if needed
                    marginTop: 0,
                    textAlign: "left",
                    border: "1px solid black",
                  }}
                >
                  Date of Birth
                </td>
                <td
                  colSpan={13}
                  style={{
                    fontFamily: "Arial",
                    fontSize: "12px",
                    paddingTop: "5px",
                    marginTop: 0,

                    textAlign: "center",
                    border: "1px solid black",
                    height: "10px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-around",
                      width: "100%",
                    }}
                  >
                    <span>
                      Month:{" "}
                      {new Date(person.birthOfDate).toLocaleDateString(
                        "en-US",
                        { month: "2-digit" },
                      )}
                    </span>
                    <span>
                      Day:{" "}
                      {new Date(person.birthOfDate).toLocaleDateString(
                        "en-US",
                        { day: "2-digit" },
                      )}
                    </span>
                    <span>
                      Year:{" "}
                      {new Date(person.birthOfDate).toLocaleDateString(
                        "en-US",
                        { year: "numeric" },
                      )}
                    </span>
                  </div>
                </td>

                <td
                  colSpan={2}
                  style={{
                    fontFamily: "Arial",
                    fontSize: "12px",
                    paddingTop: "5px", // you can reduce this if needed
                    marginTop: 0,
                    fontWeight: "bold",
                    textAlign: "center",

                    height: "10px",
                  }}
                ></td>
                <td
                  colSpan={9}
                  style={{
                    fontFamily: "Arial",
                    fontSize: "12px",
                    paddingTop: "5px",
                    marginTop: 0,
                    textAlign: "left",
                    border: "1px solid black",
                  }}
                >
                  <span style={{ marginRight: "5px" }}>Province:</span>
                  {person.permanentProvince || ""}
                </td>

                <td
                  colSpan={9}
                  style={{
                    fontFamily: "Arial",
                    fontSize: "12px",
                    paddingTop: "5px",
                    marginTop: 0,
                    textAlign: "left",
                    border: "1px solid black",
                  }}
                >
                  <span style={{ marginRight: "5px" }}>Zip Code:</span>
                  {person.permanentZipCode || ""}
                </td>
              </tr>

              <tr>
                <td
                  colSpan={7}
                  style={{
                    fontFamily: "Arial",
                    fontSize: "12px",
                    paddingTop: "5px", // you can reduce this if needed
                    marginTop: 0,
                    textAlign: "left",
                    border: "1px solid black",
                  }}
                >
                  Place of Birth:
                </td>
                <td
                  colSpan={13}
                  style={{
                    fontFamily: "Arial",
                    fontSize: "12px",
                    paddingTop: "5px", // you can reduce this if needed
                    marginTop: 0,

                    textAlign: "center",
                    border: "1px solid black",
                    height: "10px",
                  }}
                >
                  <div style={{ width: "100%", textAlign: "left" }}>
                    {person.birthPlace}
                  </div>
                </td>

                <td
                  colSpan={2}
                  style={{
                    fontFamily: "Arial",
                    fontSize: "12px",
                    paddingTop: "5px", // you can reduce this if needed
                    marginTop: 0,
                    fontWeight: "bold",
                    textAlign: "center",

                    height: "10px",
                  }}
                ></td>
                <td
                  colSpan={9}
                  style={{
                    fontFamily: "Arial",
                    fontSize: "12px",
                    paddingTop: "5px", // you can reduce this if needed
                    marginTop: 0,
                    textAlign: "left",
                    fontWeight: "bold",
                  }}
                >
                  Family Background
                </td>
                <td
                  colSpan={9}
                  style={{
                    fontFamily: "Arial",
                    fontSize: "12px",
                    paddingTop: "5px", // you can reduce this if needed
                    marginTop: 0,
                    textAlign: "left",
                  }}
                ></td>
              </tr>

              <tr>
                <td
                  colSpan={7}
                  style={{
                    fontFamily: "Arial",
                    fontSize: "12px",
                    paddingTop: "5px", // you can reduce this if needed
                    marginTop: 0,
                    textAlign: "left",
                    border: "1px solid black",
                  }}
                >
                  Nationality
                </td>
                <td
                  colSpan={13}
                  style={{
                    fontFamily: "Arial",
                    fontSize: "12px",
                    paddingTop: "5px",
                    marginTop: 0,
                    textAlign: "left",
                    border: "1px solid black",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      marginLeft: "10px",
                    }}
                  >
                    <span>
                      (
                      {person.citizenship?.toLowerCase() === "filipino"
                        ? "✓"
                        : " "}
                      ) Filipino
                    </span>
                    <span>
                      (
                      {person.citizenship &&
                        person.citizenship.toLowerCase() !== "filipino"
                        ? "✓"
                        : " "}
                      ) Foreign:
                      {person.citizenship &&
                        person.citizenship.toLowerCase() !== "filipino" && (
                          <span
                            style={{
                              marginLeft: "5px",
                              textDecoration: "underline",
                            }}
                          >
                            {person.citizenship}
                          </span>
                        )}
                    </span>
                  </div>
                </td>

                <td
                  colSpan={2}
                  style={{
                    fontFamily: "Arial",
                    fontSize: "12px",
                    paddingTop: "5px", // you can reduce this if needed
                    marginTop: 0,
                    fontWeight: "bold",
                    textAlign: "center",

                    height: "10px",
                  }}
                ></td>
                <td
                  colSpan={18}
                  style={{
                    fontFamily: "Arial",
                    fontSize: "12px",
                    paddingTop: "5px",
                    marginTop: 0,
                    textAlign: "left",
                    border: "1px solid black",
                  }}
                >
                  <span style={{ marginRight: "5px" }}>Father's Name:</span>
                  {`${person.father_given_name || ""} ${person.father_middle_name || ""} ${person.father_family_name || ""}`}
                </td>
              </tr>

              <tr>
                <td
                  colSpan={7}
                  style={{
                    fontFamily: "Arial",
                    fontSize: "12px",
                    paddingTop: "5px", // you can reduce this if needed
                    marginTop: 0,
                    textAlign: "left",
                    border: "1px solid black",
                  }}
                >
                  Religion
                </td>
                <td
                  colSpan={13}
                  style={{
                    fontFamily: "Arial",
                    fontSize: "12px",
                    paddingTop: "5px", // you can reduce this if needed
                    marginTop: 0,

                    textAlign: "center",
                    border: "1px solid black",
                    height: "10px",
                  }}
                >
                  <div style={{ width: "100%", textAlign: "left" }}>
                    {person.religion}
                  </div>
                </td>

                <td
                  colSpan={2}
                  style={{
                    fontFamily: "Arial",
                    fontSize: "12px",
                    paddingTop: "5px", // you can reduce this if needed
                    marginTop: 0,
                    fontWeight: "bold",
                    textAlign: "center",

                    height: "10px",
                  }}
                ></td>
                <td
                  colSpan={18}
                  style={{
                    fontFamily: "Arial",
                    fontSize: "12px",
                    paddingTop: "5px",
                    marginTop: 0,
                    textAlign: "left",
                    border: "1px solid black",
                  }}
                >
                  <span style={{ marginRight: "5px" }}>Occupation:</span>
                  {person.father_occupation || ""}
                </td>
              </tr>

              <tr>
                <td
                  colSpan={7}
                  style={{
                    fontFamily: "Arial",
                    fontSize: "12px",
                    paddingTop: "5px", // you can reduce this if needed
                    marginTop: 0,
                    textAlign: "left",
                    borderLeft: "1px solid black",
                  }}
                >
                  Cellphone No:
                </td>
                <td
                  colSpan={13}
                  style={{
                    fontFamily: "Arial",
                    fontSize: "12px",
                    paddingTop: "5px",
                    marginTop: 0,
                    textAlign: "center",
                    border: "1px solid black",
                    height: "10px",
                    padding: "0 50px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      width: "100%",
                    }}
                  >
                    <div style={{ width: "50%", textAlign: "left" }}>
                      {person.cellphoneNumber}
                    </div>
                    <div></div>
                  </div>
                </td>

                <td
                  colSpan={2}
                  style={{
                    fontFamily: "Arial",
                    fontSize: "12px",
                    paddingTop: "5px", // you can reduce this if needed
                    marginTop: 0,
                    fontWeight: "bold",
                    textAlign: "center",

                    height: "10px",
                  }}
                ></td>
                <td
                  colSpan={18}
                  style={{
                    fontFamily: "Arial",
                    fontSize: "12px",
                    paddingTop: "5px",
                    marginTop: 0,
                    textAlign: "left",
                    border: "1px solid black",
                  }}
                >
                  <span style={{ marginRight: "5px" }}>Mother's Name:</span>
                  {`${person.mother_given_name || ""} ${person.mother_middle_name || ""} ${person.mother_family_name || ""}`}
                </td>
              </tr>

              <tr>
                <td
                  colSpan={7}
                  style={{
                    fontFamily: "Arial",
                    fontSize: "12px",
                    paddingTop: "5px", // you can reduce this if needed
                    marginTop: 0,
                    textAlign: "left",
                    border: "1px solid black",
                  }}
                >
                  Email :
                </td>
                <td
                  colSpan={13}
                  style={{
                    fontFamily: "Arial",
                    fontSize: "12px",
                    paddingTop: "5px", // you can reduce this if needed
                    marginTop: 0,

                    textAlign: "center",
                    border: "1px solid black",
                    height: "10px",
                  }}
                >
                  <div style={{ width: "100%", textAlign: "left" }}>
                    {person.emailAddress}
                  </div>
                </td>

                <td
                  colSpan={2}
                  style={{
                    fontFamily: "Arial",
                    fontSize: "12px",
                    paddingTop: "5px", // you can reduce this if needed
                    marginTop: 0,
                    fontWeight: "bold",
                    textAlign: "center",

                    height: "10px",
                  }}
                ></td>
                <td
                  colSpan={18}
                  style={{
                    fontFamily: "Arial",
                    fontSize: "12px",
                    paddingTop: "5px",
                    marginTop: 0,
                    textAlign: "left",
                    border: "1px solid black",
                  }}
                >
                  <span style={{ marginRight: "5px" }}>Occupation:</span>
                  {person.mother_occupation || ""}
                </td>
              </tr>

              <tr>
                <td
                  colSpan={7}
                  style={{
                    fontFamily: "Arial",
                    fontSize: "12px",
                    paddingTop: "5px", // you can reduce this if needed
                    marginTop: 0,
                    textAlign: "left",
                    border: "1px solid black",
                  }}
                >
                  Testing Date/Time :
                </td>
                <td
                  colSpan={13}
                  style={{
                    fontFamily: "Arial",
                    fontSize: "12px",
                    paddingTop: "5px", // you can reduce this if needed
                    marginTop: 0,
                    fontWeight: "bold",
                    textAlign: "center",
                    border: "1px solid black",

                    height: "10px",
                  }}
                ></td>
                <td
                  colSpan={2}
                  style={{
                    fontFamily: "Arial",
                    fontSize: "12px",
                    paddingTop: "5px", // you can reduce this if needed
                    marginTop: 0,
                    fontWeight: "bold",
                    textAlign: "center",

                    height: "10px",
                  }}
                ></td>
                <td
                  colSpan={18}
                  style={{
                    fontFamily: "Arial",
                    fontSize: "12px",
                    paddingTop: "5px", // you can reduce this if needed
                    marginTop: 0,
                    textAlign: "left",
                    border: "1px solid black",
                  }}
                >
                  <span style={{ marginRight: "5px" }}>Address:</span>
                  {person.guardian_address || ""}
                </td>
              </tr>

              <tr>
                <td
                  colSpan={13}
                  style={{
                    fontFamily: "Arial",
                    fontSize: "12px",
                    paddingTop: "5px", // you can reduce this if needed
                    marginTop: 0,
                    textAlign: "left",
                  }}
                >
                  <span
                    style={{
                      fontWeight: "bold",
                      marginRight: "30px",
                      textAlign: "left",
                    }}
                  >
                    Education Background
                  </span>{" "}
                </td>
                <td
                  colSpan={7}
                  style={{
                    fontFamily: "Arial",
                    fontSize: "12px",
                    paddingTop: "5px", // you can reduce this if needed
                    marginTop: 0,
                    fontWeight: "bold",
                    textAlign: "center",

                    height: "10px",
                  }}
                ></td>
                <td
                  colSpan={2}
                  style={{
                    fontFamily: "Arial",
                    fontSize: "12px",
                    paddingTop: "5px", // you can reduce this if needed
                    marginTop: 0,
                    fontWeight: "bold",
                    textAlign: "center",

                    height: "10px",
                  }}
                ></td>
                <td
                  colSpan={18}
                  style={{
                    fontFamily: "Arial",
                    fontSize: "12px",
                    paddingTop: "5px", // you can reduce this if needed
                    marginTop: 0,
                    textAlign: "left",
                    border: "1px solid black",
                  }}
                >
                  <span style={{ fontWeight: "bold", marginRight: "5px" }}>
                    Contact No.:
                  </span>
                  {person.guardian_contact || ""}
                </td>
              </tr>

              <tr>
                <td
                  colSpan={13}
                  style={{
                    fontFamily: "Arial",
                    fontSize: "12px",
                    paddingTop: "5px", // you can reduce this if needed
                    marginTop: 0,
                    textAlign: "left",
                  }}
                >
                  <span
                    style={{
                      fontWeight: "bold",
                      marginRight: "30px",
                      textAlign: "left",
                    }}
                  >
                    Junior High School:
                  </span>{" "}
                </td>
                <td
                  colSpan={7}
                  style={{
                    fontFamily: "Arial",
                    fontSize: "12px",
                    paddingTop: "5px", // you can reduce this if needed
                    marginTop: 0,
                    fontWeight: "bold",
                    textAlign: "center",

                    height: "10px",
                  }}
                ></td>
                <td
                  colSpan={2}
                  style={{
                    fontFamily: "Arial",
                    fontSize: "12px",
                    paddingTop: "5px", // you can reduce this if needed
                    marginTop: 0,
                    fontWeight: "bold",
                    textAlign: "center",

                    height: "10px",
                  }}
                ></td>
                <td
                  colSpan={9}
                  style={{
                    fontFamily: "Arial",
                    fontSize: "12px",
                    paddingTop: "5px", // you can reduce this if needed
                    marginTop: 0,
                    textAlign: "left",

                    fontWeight: "bold",
                  }}
                >
                  Voc'l. School:
                </td>
                <td
                  colSpan={9}
                  style={{
                    fontFamily: "Arial",
                    fontSize: "12px",
                    paddingTop: "5px", // you can reduce this if needed
                    marginTop: 0,
                    textAlign: "left",
                  }}
                ></td>
              </tr>

              <tr>
                <td
                  colSpan={20}
                  style={{
                    fontFamily: "Arial",
                    fontSize: "12px",
                    paddingTop: "5px", // you can reduce this if needed
                    marginTop: 0,
                    textAlign: "left",
                    border: "1px solid black",
                  }}
                >
                  Name of School: {person.schoolLastAttended}
                </td>

                <td
                  colSpan={2}
                  style={{
                    fontFamily: "Arial",
                    fontSize: "12px",
                    paddingTop: "5px", // you can reduce this if needed
                    marginTop: 0,
                    fontWeight: "bold",
                    textAlign: "center",

                    height: "10px",
                  }}
                ></td>
                <td
                  colSpan={18}
                  style={{
                    fontFamily: "Arial",
                    fontSize: "12px",
                    paddingTop: "5px", // you can reduce this if needed
                    marginTop: 0,
                    textAlign: "left",
                    border: "1px solid black",
                  }}
                >
                  Name of School:
                </td>
              </tr>

              <tr>
                <td
                  colSpan={20}
                  style={{
                    fontFamily: "Arial",
                    fontSize: "12px",
                    paddingTop: "5px", // you can reduce this if needed
                    marginTop: 0,
                    textAlign: "left",
                    border: "1px solid black",
                  }}
                >
                  Address: {person.schoolAddress}
                </td>

                <td
                  colSpan={2}
                  style={{
                    fontFamily: "Arial",
                    fontSize: "12px",
                    paddingTop: "5px", // you can reduce this if needed
                    marginTop: 0,
                    fontWeight: "bold",
                    textAlign: "center",

                    height: "10px",
                  }}
                ></td>
                <td
                  colSpan={18}
                  style={{
                    fontFamily: "Arial",
                    fontSize: "12px",
                    paddingTop: "5px", // you can reduce this if needed
                    marginTop: 0,
                    textAlign: "left",
                    border: "1px solid black",
                  }}
                >
                  Address:
                </td>
              </tr>

              <tr>
                <td
                  colSpan={20}
                  style={{
                    fontFamily: "Arial",
                    fontSize: "12px",
                    paddingTop: "5px", // you can reduce this if needed
                    marginTop: 0,
                    textAlign: "left",
                    border: "1px solid black",
                  }}
                >
                  Inclusive Dates:
                </td>

                <td
                  colSpan={2}
                  style={{
                    fontFamily: "Arial",
                    fontSize: "12px",
                    paddingTop: "5px", // you can reduce this if needed
                    marginTop: 0,
                    fontWeight: "bold",
                    textAlign: "center",

                    height: "10px",
                  }}
                ></td>
                <td
                  colSpan={18}
                  style={{
                    fontFamily: "Arial",
                    fontSize: "12px",
                    paddingTop: "5px", // you can reduce this if needed
                    marginTop: 0,
                    textAlign: "left",
                    border: "1px solid black",
                  }}
                >
                  Inclusive Dates:
                </td>
              </tr>

              <tr>
                <td
                  colSpan={13}
                  style={{
                    fontFamily: "Arial",
                    fontSize: "12px",
                    paddingTop: "5px", // you can reduce this if needed
                    marginTop: 0,
                    textAlign: "left",

                    fontWeight: "bold",
                  }}
                >
                  Senior High School:
                </td>
                <td
                  colSpan={7}
                  style={{
                    fontFamily: "Arial",
                    fontSize: "12px",
                    paddingTop: "5px", // you can reduce this if needed
                    marginTop: 0,
                    fontWeight: "bold",
                    textAlign: "center",

                    height: "10px",
                  }}
                ></td>
                <td
                  colSpan={2}
                  style={{
                    fontFamily: "Arial",
                    fontSize: "12px",
                    paddingTop: "5px", // you can reduce this if needed
                    marginTop: 0,
                    fontWeight: "bold",
                    textAlign: "center",

                    height: "10px",
                  }}
                ></td>
                <td
                  colSpan={9}
                  style={{
                    fontFamily: "Arial",
                    fontSize: "12px",
                    paddingTop: "5px", // you can reduce this if needed
                    marginTop: 0,
                    textAlign: "left",
                    fontWeight: "bold",
                  }}
                >
                  Graduate Studies:
                </td>
                <td
                  colSpan={9}
                  style={{
                    fontFamily: "Arial",
                    fontSize: "12px",
                    paddingTop: "5px", // you can reduce this if needed
                    marginTop: 0,
                    textAlign: "left",
                  }}
                ></td>
              </tr>

              <tr>
                <td
                  colSpan={20}
                  style={{
                    fontFamily: "Arial",
                    fontSize: "12px",
                    paddingTop: "5px", // you can reduce this if needed
                    marginTop: 0,
                    textAlign: "left",
                    border: "1px solid black",
                  }}
                >
                  Name of School: {person.schoolLastAttended1}
                </td>

                <td
                  colSpan={2}
                  style={{
                    fontFamily: "Arial",
                    fontSize: "12px",
                    paddingTop: "5px", // you can reduce this if needed
                    marginTop: 0,
                    fontWeight: "bold",
                    textAlign: "center",

                    height: "10px",
                  }}
                ></td>
                <td
                  colSpan={18}
                  style={{
                    fontFamily: "Arial",
                    fontSize: "12px",
                    paddingTop: "5px", // you can reduce this if needed
                    marginTop: 0,
                    textAlign: "left",
                    border: "1px solid black",
                  }}
                >
                  Name of School:
                </td>
              </tr>

              <tr>
                <td
                  colSpan={20}
                  style={{
                    fontFamily: "Arial",
                    fontSize: "12px",
                    paddingTop: "5px", // you can reduce this if needed
                    marginTop: 0,
                    textAlign: "left",
                    border: "1px solid black",
                  }}
                >
                  Address: {person.schoolAddress1}
                </td>

                <td
                  colSpan={2}
                  style={{
                    fontFamily: "Arial",
                    fontSize: "12px",
                    paddingTop: "5px", // you can reduce this if needed
                    marginTop: 0,
                    fontWeight: "bold",
                    textAlign: "center",

                    height: "10px",
                  }}
                ></td>
                <td
                  colSpan={18}
                  style={{
                    fontFamily: "Arial",
                    fontSize: "12px",
                    paddingTop: "5px", // you can reduce this if needed
                    marginTop: 0,
                    textAlign: "left",
                    border: "1px solid black",
                  }}
                >
                  Address:
                </td>
              </tr>

              <tr>
                <td
                  colSpan={20}
                  style={{
                    fontFamily: "Arial",
                    fontSize: "12px",
                    paddingTop: "5px", // you can reduce this if needed
                    marginTop: 0,
                    textAlign: "left",
                    border: "1px solid black",
                  }}
                >
                  Inclusive Dates:
                </td>

                <td
                  colSpan={2}
                  style={{
                    fontFamily: "Arial",
                    fontSize: "12px",
                    paddingTop: "5px", // you can reduce this if needed
                    marginTop: 0,
                    fontWeight: "bold",
                    textAlign: "center",

                    height: "10px",
                  }}
                ></td>
                <td
                  colSpan={18}
                  style={{
                    fontFamily: "Arial",
                    fontSize: "12px",
                    paddingTop: "5px", // you can reduce this if needed
                    marginTop: 0,
                    textAlign: "left",
                    border: "1px solid black",
                  }}
                >
                  Degree / Courses:
                </td>
              </tr>

              <tr>
                <td
                  colSpan={7}
                  style={{
                    fontFamily: "Arial",
                    fontSize: "12px",
                    paddingTop: "5px", // you can reduce this if needed
                    marginTop: 0,
                    textAlign: "left",
                    borderTop: "1px solid black",
                    borderLeft: "1px solid black",

                    borderRight: "1px solid black",
                  }}
                ></td>
                <td
                  colSpan={13}
                  style={{
                    fontFamily: "Arial",
                    fontSize: "12px",
                    paddingTop: "5px", // you can reduce this if needed
                    marginTop: 0,
                    fontWeight: "bold",
                    textAlign: "center",
                    border: "1px solid black",

                    height: "10px",
                  }}
                ></td>
                <td
                  colSpan={2}
                  style={{
                    fontFamily: "Arial",
                    fontSize: "12px",
                    paddingTop: "5px", // you can reduce this if needed
                    marginTop: 0,
                    fontWeight: "bold",
                    textAlign: "center",

                    height: "10px",
                  }}
                ></td>
                <td
                  colSpan={18}
                  style={{
                    fontFamily: "Arial",
                    fontSize: "12px",
                    paddingTop: "5px", // you can reduce this if needed
                    marginTop: 0,
                    textAlign: "left",
                    border: "1px solid black",
                  }}
                >
                  Inclusive Dates:
                </td>
              </tr>

              <tr>
                <td
                  colSpan={7}
                  style={{
                    fontFamily: "Arial",
                    fontSize: "12px",
                    paddingTop: "5px", // you can reduce this if needed
                    marginTop: 0,
                    textAlign: "center",
                    border: "1px solid black",
                  }}
                >
                  F 138 GWA %
                </td>
                <td
                  colSpan={13}
                  style={{
                    fontFamily: "Arial",
                    fontSize: "12px",
                    paddingTop: "5px", // you can reduce this if needed
                    marginTop: 0,

                    textAlign: "center",
                    border: "1px solid black",

                    height: "10px",
                  }}
                >
                  {person.generalAverage1 || ""}
                </td>
                <td
                  colSpan={2}
                  style={{
                    fontFamily: "Arial",
                    fontSize: "12px",
                    paddingTop: "5px", // you can reduce this if needed
                    marginTop: 0,
                    fontWeight: "bold",
                    textAlign: "center",

                    height: "10px",
                  }}
                ></td>
                <td
                  colSpan={9}
                  style={{
                    fontFamily: "Arial",
                    fontSize: "12px",
                    paddingTop: "5px", // you can reduce this if needed
                    marginTop: 0,
                    textAlign: "left",
                  }}
                ></td>
                <td
                  colSpan={9}
                  style={{
                    fontFamily: "Arial",
                    fontSize: "12px",
                    paddingTop: "5px", // you can reduce this if needed
                    marginTop: 0,
                    textAlign: "left",
                  }}
                ></td>
              </tr>

              <tr>
                <td
                  colSpan={7}
                  style={{
                    fontFamily: "Arial",
                    fontSize: "12px",
                    paddingTop: "5px", // you can reduce this if needed
                    marginTop: 0,
                    textAlign: "left",
                    border: "1px solid black",
                  }}
                ></td>
                <td
                  colSpan={13}
                  style={{
                    fontFamily: "Arial",
                    fontSize: "12px",
                    paddingTop: "5px", // you can reduce this if needed
                    marginTop: 0,
                    fontWeight: "bold",
                    textAlign: "center",
                    border: "1px solid black",

                    height: "10px",
                  }}
                ></td>
                <td
                  colSpan={2}
                  style={{
                    fontFamily: "Arial",
                    fontSize: "12px",
                    paddingTop: "5px", // you can reduce this if needed
                    marginTop: 0,
                    fontWeight: "bold",
                    textAlign: "center",
                    borderRight: "1px solid  black",

                    height: "10px",
                  }}
                ></td>
                <td
                  colSpan={9}
                  style={{
                    fontFamily: "Arial",
                    fontSize: "12px",
                    paddingTop: "5px", // you can reduce this if needed
                    marginTop: 0,
                    textAlign: "left",
                    borderLeft: "1px solid black",
                    borderTop: "1px solid black",
                  }}
                >
                  Documents Presented:
                </td>
                <td
                  colSpan={9}
                  style={{
                    fontFamily: "Arial",
                    fontSize: "12px",
                    paddingTop: "5px", // you can reduce this if needed
                    marginTop: 0,
                    textAlign: "left",
                    borderTop: "1px solid black",
                    borderRight: "1px solid black",
                  }}
                >
                  ( ) Original
                </td>
              </tr>

              <tr>
                <td
                  colSpan={7}
                  style={{
                    fontFamily: "Arial",
                    fontSize: "12px",
                    paddingTop: "5px", // you can reduce this if needed
                    marginTop: 0,
                    textAlign: "left",
                    fontWeight: "bold",
                  }}
                >
                  College:
                </td>
                <td
                  colSpan={13}
                  style={{
                    fontFamily: "Arial",
                    fontSize: "12px",
                    paddingTop: "5px", // you can reduce this if needed
                    marginTop: 0,
                    fontWeight: "bold",
                    textAlign: "center",

                    height: "10px",
                  }}
                ></td>
                <td
                  colSpan={2}
                  style={{
                    fontFamily: "Arial",
                    fontSize: "12px",
                    paddingTop: "5px", // you can reduce this if needed
                    marginTop: 0,
                    fontWeight: "bold",
                    textAlign: "center",

                    height: "10px",
                  }}
                ></td>
                <td
                  colSpan={9}
                  style={{
                    fontFamily: "Arial",
                    fontSize: "12px",
                    paddingTop: "5px", // you can reduce this if needed
                    marginTop: 0,
                    textAlign: "left",
                    borderLeft: "1px solid black",
                  }}
                >
                  ( ) F138 Report Card
                </td>
                <td
                  colSpan={9}
                  style={{
                    fontFamily: "Arial",
                    fontSize: "12px",
                    paddingTop: "5px", // you can reduce this if needed
                    marginTop: 0,
                    textAlign: "left",
                    borderRight: "1px solid black",
                  }}
                >
                  ( ) ACR
                </td>
              </tr>

              <tr>
                <td
                  colSpan={20}
                  style={{
                    fontFamily: "Arial",
                    fontSize: "12px",
                    paddingTop: "5px", // you can reduce this if needed
                    marginTop: 0,
                    textAlign: "left",
                    border: "1px solid black",
                  }}
                >
                  Name of School: {branding.companyName || companyName}
                </td>
                <td
                  colSpan={2}
                  style={{
                    fontFamily: "Arial",
                    fontSize: "12px",
                    paddingTop: "5px", // you can reduce this if needed
                    marginTop: 0,
                    fontWeight: "bold",
                    textAlign: "center",

                    height: "10px",
                  }}
                ></td>
                <td
                  colSpan={9}
                  style={{
                    fontFamily: "Arial",
                    fontSize: "12px",
                    paddingTop: "5px", // you can reduce this if needed
                    marginTop: 0,
                    textAlign: "left",

                    borderLeft: "1px solid black",
                  }}
                >
                  ( ) F137 H.S. Transcript
                </td>
                <td
                  colSpan={9}
                  style={{
                    fontFamily: "Arial",
                    fontSize: "12px",
                    paddingTop: "5px", // you can reduce this if needed
                    marginTop: 0,
                    textAlign: "left",

                    borderRight: "1px solid black",
                  }}
                >
                  ( ) Study Permit
                </td>
              </tr>

              <tr>
                <td
                  colSpan={20}
                  style={{
                    fontFamily: "Arial",
                    fontSize: "12px",
                    paddingTop: "5px", // you can reduce this if needed
                    marginTop: 0,
                    textAlign: "left",
                    border: "1px solid black",
                  }}
                >
                  Address:
                  {campusAddress}
                </td>
                <td
                  colSpan={2}
                  style={{
                    fontFamily: "Arial",
                    fontSize: "12px",
                    paddingTop: "5px", // you can reduce this if needed
                    marginTop: 0,
                    fontWeight: "bold",
                    textAlign: "center",

                    height: "10px",
                  }}
                ></td>
                <td
                  colSpan={9}
                  style={{
                    fontFamily: "Arial",
                    fontSize: "12px",
                    paddingTop: "5px", // you can reduce this if needed
                    marginTop: 0,
                    textAlign: "left",
                    borderLeft: "1px solid black",
                  }}
                >
                  ( ) Good Moral Character Form
                </td>
                <td
                  colSpan={9}
                  style={{
                    fontFamily: "Arial",
                    fontSize: "12px",
                    paddingTop: "5px", // you can reduce this if needed
                    marginTop: 0,
                    textAlign: "left",
                    borderRight: "1px solid black",
                  }}
                >
                  ( ) ALS Certificate
                </td>
              </tr>

              <tr>
                <td
                  colSpan={20}
                  style={{
                    fontFamily: "Arial",
                    fontSize: "12px",
                    paddingTop: "5px", // you can reduce this if needed
                    marginTop: 0,
                    textAlign: "left",
                    border: "1px solid black",
                  }}
                >
                  Degree/Courses:
                </td>

                <td
                  colSpan={2}
                  style={{
                    fontFamily: "Arial",
                    fontSize: "12px",
                    paddingTop: "5px", // you can reduce this if needed
                    marginTop: 0,
                    fontWeight: "bold",
                    textAlign: "center",

                    height: "10px",
                  }}
                ></td>
                <td
                  colSpan={9}
                  style={{
                    fontFamily: "Arial",
                    fontSize: "12px",
                    paddingTop: "5px", // you can reduce this if needed
                    marginTop: 0,
                    textAlign: "left",
                    borderLeft: "1px solid black",
                  }}
                >
                  ( ) Transcript of Records
                </td>
                <td
                  colSpan={9}
                  style={{
                    fontFamily: "Arial",
                    fontSize: "12px",
                    paddingTop: "5px", // you can reduce this if needed
                    marginTop: 0,
                    textAlign: "left",

                    borderRight: "1px solid black",
                  }}
                >
                  ( ) PEPT Certificate
                </td>
              </tr>

              <tr>
                <td
                  colSpan={20}
                  style={{
                    fontFamily: "Arial",
                    fontSize: "12px",
                    paddingTop: "5px", // you can reduce this if needed
                    marginTop: 0,
                    textAlign: "left",
                    border: "1px solid black",
                  }}
                >
                  Inclusive Dates:
                </td>
                <td
                  colSpan={2}
                  style={{
                    fontFamily: "Arial",
                    fontSize: "12px",
                    paddingTop: "5px", // you can reduce this if needed
                    marginTop: 0,
                    fontWeight: "bold",
                    textAlign: "center",

                    height: "10px",
                  }}
                ></td>
                <td
                  colSpan={9}
                  style={{
                    fontFamily: "Arial",
                    fontSize: "12px",
                    paddingTop: "5px", // you can reduce this if needed
                    marginTop: 0,
                    textAlign: "left",
                    borderLeft: "1px solid black",
                  }}
                >
                  ( ) Copy of Grades
                </td>
                <td
                  colSpan={9}
                  style={{
                    fontFamily: "Arial",
                    fontSize: "12px",
                    paddingTop: "5px", // you can reduce this if needed
                    marginTop: 0,
                    textAlign: "left",
                    borderRight: "1px solid black",
                  }}
                >
                  ( ) NSO Birth Certificate
                </td>
              </tr>

              <tr>
                <td
                  colSpan={7}
                  style={{
                    fontFamily: "Arial",
                    fontSize: "12px",
                    paddingTop: "5px", // you can reduce this if needed
                    marginTop: 0,
                    textAlign: "left",
                  }}
                ></td>
                <td
                  colSpan={13}
                  style={{
                    fontFamily: "Arial",
                    fontSize: "12px",
                    paddingTop: "5px", // you can reduce this if needed
                    marginTop: 0,
                    fontWeight: "bold",
                    textAlign: "center",

                    height: "10px",
                  }}
                ></td>
                <td
                  colSpan={2}
                  style={{
                    fontFamily: "Arial",
                    fontSize: "12px",
                    paddingTop: "5px", // you can reduce this if needed
                    marginTop: 0,
                    fontWeight: "bold",
                    textAlign: "center",

                    height: "10px",
                  }}
                ></td>
                <td
                  colSpan={9}
                  style={{
                    fontFamily: "Arial",
                    fontSize: "12px",
                    paddingTop: "5px", // you can reduce this if needed
                    marginTop: 0,
                    textAlign: "left",
                    borderLeft: "1px solid black",
                  }}
                >
                  ( ) Transfer Credential/Hon. Dismissal
                </td>
                <td
                  colSpan={9}
                  style={{
                    fontFamily: "Arial",
                    fontSize: "12px",
                    paddingTop: "5px", // you can reduce this if needed
                    marginTop: 0,
                    textAlign: "left",
                    borderRight: "1px solid black",
                  }}
                >
                  ( ) Promissory Note
                </td>
              </tr>

              <tr>
                <td
                  colSpan={7}
                  style={{
                    fontFamily: "Arial",
                    fontSize: "12px",
                    paddingTop: "5px", // you can reduce this if needed
                    marginTop: 0,
                    textAlign: "left",
                  }}
                ></td>
                <td
                  colSpan={13}
                  style={{
                    fontFamily: "Arial",
                    fontSize: "12px",
                    paddingTop: "5px", // you can reduce this if needed
                    marginTop: 0,
                    fontWeight: "bold",
                    textAlign: "center",

                    height: "10px",
                  }}
                ></td>
                <td
                  colSpan={2}
                  style={{
                    fontFamily: "Arial",
                    fontSize: "12px",
                    paddingTop: "5px", // you can reduce this if needed
                    marginTop: 0,
                    fontWeight: "bold",
                    textAlign: "center",

                    height: "10px",
                  }}
                ></td>
                <td
                  colSpan={9}
                  style={{
                    fontFamily: "Arial",
                    fontSize: "12px",
                    paddingTop: "5px", // you can reduce this if needed
                    marginTop: 0,
                    textAlign: "left",
                    borderLeft: "1px solid black",
                    borderBottom: "1px solid black",
                  }}
                >
                  ( ) Letter of Recommendation
                </td>
                <td
                  colSpan={9}
                  style={{
                    fontFamily: "Arial",
                    fontSize: "12px",
                    paddingTop: "5px", // you can reduce this if needed
                    marginTop: 0,
                    textAlign: "left",
                    borderBottom: "1px solid black",
                    borderRight: "1px solid black",
                  }}
                >
                  ( ) Other _____________
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Container>
    </Box>
  );
});

export default StudentOfficeOfTheRegistrar;
