import React, { useState, useEffect, useContext, useRef } from "react";
import { SettingsContext } from "../App";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import ExamPermit from "./ExamPermit";
import { TextField, Button, Box, Typography } from "@mui/material";
import CameraAltIcon from "@mui/icons-material/CameraAlt";
import QRScanner from "../components/QRScanner"; // make sure path is correct
import API_BASE_URL from "../apiConfig";
const ExaminationProfile = () => {
    const { applicantNumber } = useParams();
    const navigate = useNavigate();

    const [personId, setPersonId] = useState(null);
    const [searchQuery, setSearchQuery] = useState(applicantNumber || "");
    const [scannerOpen, setScannerOpen] = useState(false);

    const [userID, setUserID] = useState("");
    const [user, setUser] = useState("");
    const [userRole, setUserRole] = useState("");
    const [hasAccess, setHasAccess] = useState(null);
    const [loading, setLoading] = useState(false);
  
 

    useEffect(() => {
        if (!searchQuery) return;

        const fetchPersonId = async () => {
            try {
                // 1. Get person_id by applicant_number
                const res = await axios.get(
                    `${API_BASE_URL}/api/person-by-applicant/${searchQuery}`
                );

                if (!res.data?.person_id) {
                    setPersonId(null);
                    alert("❌ Applicant not found.");
                    return;
                }

                const pid = res.data.person_id;

                // 2. Check if all 4 documents are verified
                const statusRes = await axios.get(
                    `${API_BASE_URL}/api/document_status/check/${searchQuery}`
                );

                if (!statusRes.data.verified) {
                    alert("❌ This applicant’s documents are not yet fully verified. Exam permit cannot be displayed.");
                    setPersonId(null);
                    return;
                }

                // ✅ Only set personId if verified
                setPersonId(pid);
            } catch (err) {
                console.error("Error fetching applicant:", err);
                setPersonId(null);
            }
        };

        fetchPersonId();
    }, [searchQuery]);


    const handleSearch = () => {
        if (searchQuery.trim()) {
            navigate(`/examination_profile/${searchQuery.trim()}`);
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
        <Box sx={{ p: 2 }}>
            <Box
                sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',

                    mb: 2,
                    px: 2,
                }}
            >
                <Typography
                    variant="h4"
                    sx={{
                        fontWeight: 'bold',
                        color: 'maroon',
                        fontSize: '36px',
                    }}
                >
                    EXAMINATION PROFILE
                </Typography>




            </Box>
            <hr style={{ border: "1px solid #ccc", width: "100%" }} />

            <br />


            <Box sx={{ display: "flex", gap: 2, mb: 3 }}>
                <TextField
                    label="Enter Applicant Number"
                    variant="outlined"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    size="small"
                />
                <Button variant="contained" onClick={handleSearch}>
                    Search
                </Button>
                <Button
                    variant="contained"
                    color="secondary"
                    startIcon={<CameraAltIcon />}
                    onClick={() => setScannerOpen(true)}
                >
                    Scan QR
                </Button>
            </Box>

            {/* 📷 QR Scanner Dialog */}
            {/* <QRScanner
                open={scannerOpen}
                onScan={async (text) => {
                    let scannedNumber = String(text || "").trim();
                    if (scannedNumber.includes("/")) {
                        scannedNumber = scannedNumber.split("/").pop();
                    }

                    setScannerOpen(false);
                    navigate(`/examination_profile/${scannedNumber}`);
                    setSearchQuery(scannedNumber);
                }}
                onClose={() => setScannerOpen(false)}
            /> */}

            {/* 📷 QR Scanner Dialog */}
            <QRScanner
                open={scannerOpen}
                onScan={async (text) => {
                    let scannedNumber = String(text || "").trim();
                    if (scannedNumber.includes("/")) {
                        scannedNumber = scannedNumber.split("/").pop();
                    }

                    setScannerOpen(false);
                    setSearchQuery(scannedNumber);

                    // ✅ Immediately trigger search after scan
                    setTimeout(() => {
                        handleSearch();
                    }, 300);
                }}
                onClose={() => setScannerOpen(false)}
            />


            {/* 📝 Display ExamPermit if person found */}
            {personId ? (
                <ExamPermit personId={personId} />
            ) : (
                searchQuery && <div>Invalid Applicant Number or not found.</div>
            )}
        </Box>
    );
};

export default ExaminationProfile;
