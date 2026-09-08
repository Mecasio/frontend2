import React, { useContext } from "react";
import { SettingsContext } from "../App";

const RedirectLoading = ({ message = "Loading..." }) => {
  const settings = useContext(SettingsContext);
  const assets = settings?.assets || {};

  const logo =
    assets.logoUrl
      ? `${assets.logoUrl}`
      : "/EaristLogo.png";

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "#fff9ec", // ⭐ same as your HTML loader
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "Poppins, sans-serif",
        zIndex: 9999
      }}
    >
      <div className="loader-wrapper">
        <div className="loader-circle"></div>
        <img src={logo} className="loader-logo" />
      </div>

      <div className="loader-text">{message}</div>

      <style>
        {`
        .loader-wrapper{
          position:relative;
          display:flex;
          align-items:center;
          justify-content:center;
        }

        .loader-circle{
          width:160px;
          height:160px;
          border:8px solid rgba(163,29,29,0.3);
          border-top-color:#A31D1D;
          border-radius:50%;
          animation:spin 0.9s linear infinite;
        }

        .loader-logo{
          position:absolute;
          width:120px;
          height:120px;
          border-radius:50%;
          box-shadow:0 0 20px rgba(163,29,29,0.6);
          animation:heartbeat 1.5s ease-in-out infinite;
        }

        .loader-text{
          margin-top:22px;
          font-size:24px;
          font-weight:700;
          color:#000; /* ⭐ black text like you asked */
        }

        @keyframes spin{
          to{transform:rotate(360deg);}
        }

        @keyframes heartbeat{
          0%{transform:scale(1);}
          25%{transform:scale(1.12);}
          50%{transform:scale(1);}
          75%{transform:scale(1.12);}
          100%{transform:scale(1);}
        }
        `}
      </style>
    </div>
  );
};

export default RedirectLoading;
