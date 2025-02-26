import React, { useEffect, useState } from "react";
import { Html5QrcodeScanner } from "html5-qrcode";

const SERVER_URL = "http://192.168.157.246:5000"; // Replace with your laptop's IP

const TestScanner = () => {
  const [cameraPermission, setCameraPermission] = useState("pending");

  useEffect(() => {
    // 🔹 Check Camera Permissions
    navigator.permissions
      .query({ name: "camera" })
      .then((permission) => {
        setCameraPermission(permission.state);
        alert(`🔹 Camera Permission Status: ${permission.state}`); // Debug Alert
      })
      .catch((error) => {
        alert(`❌ Failed to check camera permission: ${error.message}`);
      });

    // 🔹 Scan Success Handler
    const onScanSuccess = (decodedText) => {
      console.log("✅ Scanned code:", decodedText);
      alert(`✅ Scanned QR Code: ${decodedText}`); // Show Alert
    };

    // 🔹 Scan Error Handler
    const onScanError = (error) => {
      if (error.includes("No MultiFormat Readers")) return;
      console.warn("❌ Scan error:", error);
      alert(`❌ QR Scan Error: ${error}`); // Show Alert
    };

    // 🔹 Initialize QR Scanner
    const scanner = new Html5QrcodeScanner("reader", {
      fps: 10,
      qrbox: { width: 250, height: 250 },
    });

    scanner.render(onScanSuccess, onScanError);

    // 🔹 Cleanup Scanner on Unmount
    return () => {
      scanner.clear().catch((error) => {
        console.error("❌ Failed to clear scanner:", error);
      });
    };
  }, []);

  return (
    <div>
      <h2>QR Code Scanner</h2>
      <p>🔹 Camera Permission: {cameraPermission}</p>

      {/* 🔹 Scanner Container */}
      <div id="reader" style={{ width: "300px", margin: "auto" }}></div>

      {/* 🔹 Debugging Help */}
      <button onClick={() => alert(`Server URL: ${SERVER_URL}`)}>
        Show Server URL
      </button>
    </div>
  );
};

export default TestScanner;
