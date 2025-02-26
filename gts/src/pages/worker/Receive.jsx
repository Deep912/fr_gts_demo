import { useState, useEffect } from "react";
import axios from "axios";
import {
  Select,
  Input,
  Button,
  Card,
  Row,
  Col,
  Switch,
  Modal,
  message,
} from "antd";
import {
  DownloadOutlined,
  SearchOutlined,
  ScanOutlined,
  FilePdfOutlined,
} from "@ant-design/icons";
import { Html5QrcodeScanner } from "html5-qrcode";
import jsPDF from "jspdf";
import "jspdf-autotable";
import "../../styles/Receive.css";

const SERVER_URL = "http://192.168.157.246:5000"; // Replace with your actual server IP

const Receive = () => {
  const [companies, setCompanies] = useState([]);
  const [companyId, setCompanyId] = useState("");
  const [dispatchedCylinders, setDispatchedCylinders] = useState([]);
  const [selectedCylinders, setSelectedCylinders] = useState([]);
  const [notEmptyCylinders, setNotEmptyCylinders] = useState([]);
  const [searchCylinder, setSearchCylinder] = useState("");
  const [scanning, setScanning] = useState(false);
  const [currentUser, setCurrentUser] = useState(""); // Store logged-in user

  // ✅ Fetch Logged-in User
  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem("user"));
    if (userData) setCurrentUser(userData.username);
  }, []);

  // ✅ Fetch Companies
  useEffect(() => {
    axios
      .get(`${SERVER_URL}/companies`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      })
      .then((response) => setCompanies(response.data))
      .catch(() => message.error("Error fetching companies"));
  }, []);

  // ✅ Fetch Dispatched Cylinders on Company Selection
  useEffect(() => {
    if (!companyId) return;
    axios
      .get(`${SERVER_URL}/dispatched-cylinders?companyId=${companyId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      })
      .then((response) => {
        setDispatchedCylinders(response.data);
        setSelectedCylinders([]);
        setNotEmptyCylinders([]);
      })
      .catch(() => message.error("Error fetching dispatched cylinders"));
  }, [companyId]);

  // ✅ Select Cylinder (Manual Selection)
  const handleCylinderSelection = (serialNumber) => {
    setSelectedCylinders((prev) =>
      prev.includes(serialNumber)
        ? prev.filter((sn) => sn !== serialNumber) // Deselect if already selected
        : [...prev, serialNumber]
    );
  };

  // ✅ Toggle "Not Empty" Status
  const toggleNotEmpty = (serialNumber, checked) => {
    setNotEmptyCylinders((prev) =>
      checked
        ? [...prev, serialNumber]
        : prev.filter((sn) => sn !== serialNumber)
    );
  };

  // ✅ Handle Manual Entry (Search & Select)
  const handleManualEntry = () => {
    if (!searchCylinder.trim()) return;
    const exists = dispatchedCylinders.some(
      (cylinder) => cylinder.serial_number === searchCylinder
    );
    if (exists) {
      handleCylinderSelection(searchCylinder);
      setSearchCylinder("");
    } else {
      message.warning("Cylinder not found in dispatched list");
    }
  };

  // ✅ Handle Confirm Receive & Generate PDF
  const handleConfirmReceive = () => {
    if (selectedCylinders.length === 0) {
      message.warning("Please select at least one cylinder");
      return;
    }

    axios
      .post(
        `${SERVER_URL}/receive-cylinder`,
        {
          emptySerialNumbers: selectedCylinders.filter(
            (sn) => !notEmptyCylinders.includes(sn)
          ),
          filledSerialNumbers: notEmptyCylinders,
          companyId,
        },
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }
      )
      .then(() => {
        message.success("Cylinders received successfully!");
        generatePDF();
        setSelectedCylinders([]);
        setNotEmptyCylinders([]);
        setDispatchedCylinders([]); // Reset the list after confirmation
      })
      .catch(() => message.error("Error receiving cylinders"));
  };

  // ✅ Generate PDF Receipt
  const generatePDF = () => {
    const doc = new jsPDF();
    const companyName =
      companies.find((c) => c.id === companyId)?.name || "Unknown Company";
    const dateTime = new Date().toLocaleString();

    doc.setFont("helvetica", "bold");
    doc.text("Cylinder Receipt", 105, 15, { align: "center" });
    doc.setFontSize(11);
    doc.text(`Company: ${companyName}`, 15, 30);
    doc.text(`Date: ${dateTime}`, 15, 40);
    doc.text(`Accepted by: ${currentUser}`, 15, 50);

    // ✅ Table Headers
    const tableColumn = ["Serial Number", "Gas Type", "Size", "Status"];
    const tableRows = selectedCylinders.map((serial) => {
      const cylinder = dispatchedCylinders.find(
        (c) => c.serial_number === serial
      );
      return [
        serial,
        cylinder?.gas_type || "Unknown",
        cylinder?.size || "N/A",
        notEmptyCylinders.includes(serial) ? "Not Empty" : "Empty",
      ];
    });

    doc.autoTable({
      head: [tableColumn],
      body: tableRows,
      startY: 60,
      theme: "striped",
    });

    doc.save(`Cylinder_Receipt_${dateTime}.pdf`);
  };

  return (
    <Card className="receive-card">
      <h2 className="receive-title">
        <DownloadOutlined /> Receive Cylinders
      </h2>

      {/* ✅ Select Company */}
      <label className="receive-label">Select Company:</label>
      <Select
        className="receive-select"
        placeholder="Search & Select Company..."
        showSearch
        optionFilterProp="children"
        onChange={(value) => setCompanyId(value)}
        value={companyId}
      >
        {companies.map((company) => (
          <Select.Option key={company.id} value={company.id}>
            {company.name}
          </Select.Option>
        ))}
      </Select>

      {/* ✅ Confirm Button */}
      <Button
        type="primary"
        className="receive-button"
        icon={<DownloadOutlined />}
        disabled={selectedCylinders.length === 0}
        onClick={handleConfirmReceive}
      >
        Confirm Receive
      </Button>

      {/* ✅ Generate PDF Button */}
      {selectedCylinders.length > 0 && (
        <Button
          type="default"
          className="pdf-button"
          icon={<FilePdfOutlined />}
          onClick={generatePDF}
          style={{ marginLeft: "10px" }}
        >
          Download Receipt
        </Button>
      )}
    </Card>
  );
};

export default Receive;
