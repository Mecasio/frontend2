import React, { useEffect, useState } from "react";
import { Typography, Box } from "@mui/material";

// ✅ MUI Icons
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import AccessTimeIcon from "@mui/icons-material/AccessTime";

const Clock = () => {
  const [dateTime, setDateTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setDateTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formattedTime = dateTime.toLocaleTimeString("en-PH", {
    timeZone: "Asia/Manila",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  const formattedDate = dateTime.toLocaleDateString("en-PH", {
    timeZone: "Asia/Manila",
    weekday: "short",
    month: "long",
    day: "2-digit",
    year: "numeric",
  });

  return (
    <Box sx={{ textAlign: "right" }}>
      {/* DATE */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "flex-end",
          alignItems: "center",
          gap: 1,
        }}
      >
        <Typography sx={{ fontSize: "16px" }}>{formattedDate}</Typography>
      </Box>

      {/* TIME */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "flex-end",
          alignItems: "center",
          gap: 1,
        }}
      >
        <Typography sx={{ fontSize: "16px" }}>{formattedTime}</Typography>
      </Box>
    </Box>
  );
};

export default Clock;
