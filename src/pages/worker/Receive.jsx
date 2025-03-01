import { useState, useEffect } from "react";
import axios from "axios";
import {
  Select,
  Button,
  Card,
  Row,
  Col,
  Switch,
  Modal,
  message,
  Divider,
  Typography,
} from "antd";
import { DownloadOutlined, ScanOutlined } from "@ant-design/icons";
import { Html5QrcodeScanner } from "html5-qrcode";
import "../../styles/Receive.css";

const { Title, Text } = Typography;
const SERVER_URL = import.meta.env.VITE_API_URL;

const Receive = () => {
  const [companies, setCompanies] = useState([]);
  const [companyId, setCompanyId] = useState("");
  const [dispatchedCylinders, setDispatchedCylinders] = useState([]);
  const [selectedCylinders, setSelectedCylinders] = useState([]);
  const [notEmptyCylinders, setNotEmptyCylinders] = useState([]);
  const [scanning, setScanning] = useState(false);
  const [scannerInstance, setScannerInstance] = useState(null);

  // ✅ Fetch Companies
  useEffect(() => {
    axios
      .get(`${SERVER_URL}/companies`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          "ngrok-skip-browser-warning": "true",
        },
      })
      .then((response) => setCompanies(response.data))
      .catch(() => message.error("Error fetching companies"));
  }, []);

  // ✅ Fetch Dispatched Cylinders on Company Selection
  useEffect(() => {
    if (!companyId) return;

    axios
      .get(`${SERVER_URL}/dispatched-cylinders?companyId=${companyId}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          "ngrok-skip-browser-warning": "true",
        },
      })
      .then((response) => {
        console.log("✅ Dispatched Cylinders:", response.data);
        setDispatchedCylinders(
          Array.isArray(response.data) ? response.data : []
        );
        setSelectedCylinders([]);
        setNotEmptyCylinders([]); // Default all as EMPTY
      })
      .catch(() => message.error("Error fetching dispatched cylinders"));
  }, [companyId]);

  // ✅ Select/Deselect Cylinder (Clickable Card)
  const toggleCylinderSelection = (serialNumber) => {
    setSelectedCylinders((prev) =>
      prev.includes(serialNumber)
        ? prev.filter((sn) => sn !== serialNumber)
        : [...prev, serialNumber]
    );
  };

  // ✅ Toggle "Not Empty" Status (Defaults to EMPTY)
  const toggleNotEmpty = (serialNumber, checked) => {
    setNotEmptyCylinders(
      (prev) =>
        checked
          ? [...prev, serialNumber] // Mark as NOT EMPTY
          : prev.filter((sn) => sn !== serialNumber) // Keep it EMPTY (default)
    );
  };

  // ✅ Handle QR Code Scan
  const handleScan = (decodedText) => {
    if (!decodedText) return;

    const serialNumber = decodedText.trim();
    console.log("🔹 Scanned QR Code:", serialNumber);

    if (dispatchedCylinders.some((c) => c.serial_number === serialNumber)) {
      toggleCylinderSelection(serialNumber);
      message.success(`Scanned: ${serialNumber}`);
    } else {
      message.warning("Scanned cylinder is not in the dispatched list.");
    }
  };

  const handleScanError = (error) => {
    console.error("QR Scan Error:", error);
    message.error("Error scanning QR code.");
  };

  const startScanner = () => {
    setScanning(true);
  };

  useEffect(() => {
    if (scanning) {
      setTimeout(() => {
        const scanner = new Html5QrcodeScanner("reader", {
          fps: 10,
          qrbox: { width: 300, height: 300 },
        });

        scanner.render(handleScan, handleScanError);
        setScannerInstance(scanner);
      }, 500);
    }

    return () => {
      if (scannerInstance) {
        scannerInstance.clear();
      }
    };
  }, [scanning]);

  // ✅ Confirm Receive Only Selected Cylinders
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
          filledSerialNumbers: selectedCylinders.filter((sn) =>
            notEmptyCylinders.includes(sn)
          ),
          companyId,
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
            "ngrok-skip-browser-warning": "true",
          },
        }
      )
      .then(() => {
        message.success("Selected cylinders received successfully!");
        setSelectedCylinders([]);
        setNotEmptyCylinders([]);
        setDispatchedCylinders((prev) =>
          prev.filter(
            (cylinder) => !selectedCylinders.includes(cylinder.serial_number)
          )
        );
      })
      .catch(() => message.error("Error receiving cylinders"));
  };

  return (
    <Card className="receive-card">
      <Title level={3} className="receive-title">
        Receive Cylinders
      </Title>

      {/* ✅ Select Company */}
      <label className="receive-label">Select Company:</label>
      <Select
        className="receive-select"
        placeholder="Search & Select Company..."
        showSearch
        optionFilterProp="children"
        onChange={(value) => setCompanyId(value)}
        value={companyId}
        style={{ width: "100%", marginBottom: "10px" }}
      >
        {companies.map((company) => (
          <Select.Option key={company.id} value={company.id}>
            {company.name}
          </Select.Option>
        ))}
      </Select>

      {/* ✅ Scan QR Code Button */}
      <Button
        type="primary"
        icon={<ScanOutlined />}
        onClick={startScanner}
        style={{
          width: "100%",
          background: "#1890ff",
          borderColor: "#1890ff",
          marginBottom: "10px",
        }}
      >
        Scan QR Code
      </Button>

      {/* ✅ QR Code Scanner Modal */}
      {/* ✅ QR Code Scanner Modal */}
      <Modal
        title="Scan QR Codes"
        open={scanning}
        onCancel={() => setScanning(false)}
        footer={null}
        width={400}
      >
        <div id="reader"></div>

        {/* ✅ Display Scanned Cylinders */}
        {selectedCylinders.length > 0 && (
          <div style={{ marginTop: "15px" }}>
            <Text strong>Scanned Cylinders:</Text>
            <ul>
              {selectedCylinders.map((sn) => (
                <li key={sn}>{sn}</li>
              ))}
            </ul>
          </div>
        )}

        {/* ✅ Control Buttons */}
        <div style={{ marginTop: "15px", textAlign: "center" }}>
          <Button type="primary" onClick={() => setScanning(false)}>
            Done (Save)
          </Button>
          <Button
            type="default"
            onClick={() => setScanning(false)}
            style={{ marginLeft: "10px" }}
          >
            Cancel
          </Button>
        </div>
      </Modal>

      <Divider />

      {/* ✅ Cylinder List with Clickable Cards */}
      <Row gutter={[16, 16]}>
        {dispatchedCylinders.map((cylinder) => (
          <Col key={cylinder.serial_number} xs={24} sm={12} md={8}>
            <Card
              className={`cylinder-card ${
                selectedCylinders.includes(cylinder.serial_number)
                  ? "selected"
                  : ""
              }`}
              onClick={() => toggleCylinderSelection(cylinder.serial_number)}
              style={{
                cursor: "pointer",
                background: selectedCylinders.includes(cylinder.serial_number)
                  ? "#1890ff"
                  : "#f5f5f5",
                color: selectedCylinders.includes(cylinder.serial_number)
                  ? "#fff"
                  : "#333",
                fontWeight: "bold",
                transition: "0.3s ease",
                textAlign: "center",
                padding: "15px",
                borderRadius: "8px",
              }}
            >
              {cylinder.serial_number}
            </Card>
            {/* ✅ "Not Empty" Toggle (Separate Below) */}
            <div style={{ textAlign: "center", marginTop: "8px" }}>
              <Switch
                checked={notEmptyCylinders.includes(cylinder.serial_number)}
                onChange={(checked) =>
                  toggleNotEmpty(cylinder.serial_number, checked)
                }
              />
              <Text style={{ marginLeft: "8px" }}>
                {notEmptyCylinders.includes(cylinder.serial_number)
                  ? "Not Empty"
                  : "Empty"}
              </Text>
            </div>
          </Col>
        ))}
      </Row>

      <Divider />

      {/* ✅ Confirm Button */}
      <Button
        type="primary"
        className="receive-button"
        icon={<DownloadOutlined />}
        disabled={selectedCylinders.length === 0}
        onClick={handleConfirmReceive}
        style={{ width: "100%", background: "#1890ff", borderColor: "#1890ff" }}
      >
        Confirm Receive
      </Button>
    </Card>
  );
};

export default Receive;
