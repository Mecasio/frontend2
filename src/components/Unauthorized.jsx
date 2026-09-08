import React, { useContext } from "react";
import { SettingsContext } from "../App"; // ✅ import your global context

const Unauthorized = () => {
    const settings = useContext(SettingsContext);
    const colors = settings?.colors || {};
    const assets = settings?.assets || {};
    const headerColor = colors.header || "#1976d2";

    const backgroundImage = assets.backgroundImage
        ? `url(${assets.backgroundImage})`
        : "linear-gradient(to right, #fafafa, #f5f5f5)"; // fallback color

    return (
        <div
            style={{
                display: "flex",
                height: "100vh",
                width: "100%",

                alignItems: "center",
                justifyContent: "center",
                backgroundImage,
                backgroundSize: "cover",
                backgroundPosition: "center",
                position: "relative",
            }}
        >
            {/* ✅ Frosted white blur overlay */}
            <div
                style={{
                    position: "absolute",
                    inset: 0,
                    backgroundColor: "rgba(255, 255, 255, 0.4)",
                    backdropFilter: "blur(1px)",
                    WebkitBackdropFilter: "blur(1px)",
                }}
            ></div>

            {/* ✅ Foreground content */}
            <div
                style={{
                    position: "relative",
                    zIndex: 1,
                    textAlign: "center",
                    backgroundColor: "rgba(255, 255, 255, 0.75)",
                    padding: "40px 80px",
                    borderRadius: "12px",
                    boxShadow: "0 6px 20px rgba(0,0,0,0.15)",
                    backdropFilter: "blur(5px)",
                }}
            >
                <h1
                    style={{
                        color: "#b71c1c",
                        fontWeight: "bold",
                        fontSize: "2.5rem",
                       
                        marginBottom: "10px",
                    }}
                >
                    UNATHORIZED ACCESS
                </h1>
                <p style={{ fontSize: "1rem", color: "#333" }}>
                    You do not have access to this page.
                    <br />
                    Please contact the administrator.
                </p>
            </div>
        </div>
    );
};

export default Unauthorized;
