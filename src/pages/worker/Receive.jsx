import { useState, useEffect, useRef } from "react";
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
  Divider,
  Typography,
  Badge,
  Grid, // NEW
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
  const [currentScan, setCurrentScan] = useState(null);
  const [scannedIds, setScannedIds] = useState([]); // Temporary storage for scanned IDs
  const scannerInstanceRef = useRef(null); // Use ref for scanner instance

  // NEW: For desktop vs. mobile detection
  const screens = Grid.useBreakpoint();
  const isMobileOrTablet = !screens.md; // If md is false => treat as mobile/tablet

  // NEW: Desktop search term
  const [searchTerm, setSearchTerm] = useState("");

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
        setDispatchedCylinders(
          Array.isArray(response.data) ? response.data : []
        );
        setSelectedCylinders([]);
        setNotEmptyCylinders([]);
      })
      .catch(() => message.error("Error fetching dispatched cylinders"));
  }, [companyId]);

  // ✅ Handle QR Code Scan
  const handleScan = (decodedText) => {
    if (!decodedText) return;
    const serialNumber = decodedText.trim();

    // ✅ Prevent duplicate scans (in scannedIds or selectedCylinders)
    if (
      scannedIds.includes(serialNumber) ||
      selectedCylinders.includes(serialNumber)
    ) {
      message.warning(`Cylinder ${serialNumber} is already scanned.`);
      return;
    }

    // ✅ Validate if scanned ID exists in dispatched cylinders
    const isValidCylinder = dispatchedCylinders.some(
      (cyl) => cyl.serial_number === serialNumber
    );
    if (!isValidCylinder) {
      message.error(`Cylinder ${serialNumber} not found in dispatched list.`);
      return;
    }

    // ✅ Save the scanned cylinder and pause scanning
    setCurrentScan(serialNumber);
    if (scannerInstanceRef.current) {
      scannerInstanceRef.current.clear();
    }
  };

  // ✅ Start Scanner
  const startScanner = () => {
    if (!companyId) {
      message.warning("Please select a company first.");
      return;
    }
    setScanning(true);
    setScannedIds([]); // Reset scanned IDs
  };

  // ✅ Initialize/Render Scanner
  useEffect(() => {
    if (scanning) {
      const scanner = new Html5QrcodeScanner("reader", {
        fps: 10,
        qrbox: { width: 300, height: 300 },
      });

      scanner.render(
        (decodedText) => handleScan(decodedText),
        (err) => console.warn("QR Scanner Error:", err)
      );

      scannerInstanceRef.current = scanner;
    }

    return () => {
      // Cleanup on unmount or when scanning toggles off
      if (scannerInstanceRef.current) {
        scannerInstanceRef.current.clear();
      }
    };
  }, [scanning]);

  // ✅ "Next" Button
  const handleNext = () => {
    if (!currentScan) {
      message.warning("No cylinder scanned.");
      return;
    }

    // ✅ Prevent duplicates again (just in case)
    if (
      selectedCylinders.includes(currentScan) ||
      scannedIds.includes(currentScan)
    ) {
      message.warning(`Cylinder ${currentScan} is already scanned.`);
      setCurrentScan(null);
      return;
    }

    // ✅ Save the scan
    setScannedIds((prev) => [...prev, currentScan]);
    setCurrentScan(null);

    // ✅ Restart scanning
    if (scannerInstanceRef.current) {
      scannerInstanceRef.current.clear();
      scannerInstanceRef.current.render(handleScan, (err) =>
        console.warn("QR Scanner Error:", err)
      );
    }
  };

  // ✅ "Done" Button
  const handleDone = () => {
    if (scannedIds.length === 0) {
      message.warning("No cylinders scanned.");
      return;
    }
    // ✅ Merge scanned IDs into selectedCylinders
    setSelectedCylinders((prev) => [...prev, ...scannedIds]);
    message.success(`${scannedIds.length} cylinders scanned successfully!`);

    // ✅ Reset scanning state
    setScannedIds([]);
    setCurrentScan(null);
    setScanning(false);

    if (scannerInstanceRef.current) {
      scannerInstanceRef.current.clear();
    }
  };

  // ✅ "Cancel" Button
  const handleCancel = () => {
    if (scannedIds.length > 0 || currentScan) {
      Modal.confirm({
        title: "Are you sure you want to cancel?",
        content: "All scanned cylinders will be lost.",
        onOk: () => {
          setScanning(false);
          setScannedIds([]);
          setCurrentScan(null);

          if (scannerInstanceRef.current) {
            scannerInstanceRef.current.clear();
          }
        },
      });
    } else {
      setScanning(false);
      setScannedIds([]);
      setCurrentScan(null);

      if (scannerInstanceRef.current) {
        scannerInstanceRef.current.clear();
      }
    }
  };

  // ✅ Toggle Cylinder Selection
  const toggleCylinderSelection = (serialNumber) => {
    setSelectedCylinders((prev) =>
      prev.includes(serialNumber)
        ? prev.filter((sn) => sn !== serialNumber)
        : [...prev, serialNumber]
    );
  };

  // ✅ Toggle "Not Empty" Status
  const toggleNotEmpty = (serialNumber, checked) => {
    setNotEmptyCylinders(
      (prev) =>
        checked
          ? [...prev, serialNumber] // Mark as NOT EMPTY
          : prev.filter((sn) => sn !== serialNumber) // Remain EMPTY
    );
  };

  // ✅ Confirm Receive
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
          prev.filter((cyl) => !selectedCylinders.includes(cyl.serial_number))
        );
      })
      .catch(() => message.error("Error receiving cylinders"));
  };

  // NEW: We'll store a desktop searchTerm & filter if not mobile
  // const [searchTerm, setSearchTerm] = useState("");
  // const screens = Grid.useBreakpoint();
  // const isMobileOrTablet = !screens.md;

  // Filter dispatchedCylinders on desktop only
  const displayedCylinders = isMobileOrTablet
    ? dispatchedCylinders
    : dispatchedCylinders.filter((cyl) =>
        cyl.serial_number.includes(searchTerm)
      );

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

      {/* If mobile => show SCAN button, else => show search input */}
      {isMobileOrTablet ? (
        <Badge count={scannedIds.length} offset={[10, 0]}>
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
        </Badge>
      ) : (
        <Input
          placeholder="Search Cylinder ID"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          allowClear
          style={{
            width: "100%",
            marginBottom: "10px",
          }}
        />
      )}

      {/* ✅ QR Code Scanner Modal */}
      <Modal
        title="Scan QR Codes"
        open={scanning}
        onCancel={handleCancel}
        footer={null}
        width={400}
      >
        <div id="reader"></div>

        {/* ✅ Show scanned cylinder ID */}
        {currentScan && (
          <div style={{ marginTop: "15px", textAlign: "center" }}>
            <Text strong>Scanned Cylinder ID:</Text>
            <p>{currentScan}</p>
          </div>
        )}

        {/* ✅ Control Buttons */}
        <div style={{ marginTop: "15px", textAlign: "center" }}>
          {/* Show "Next" if there's a scanned cylinder */}
          {currentScan && (
            <Button type="primary" onClick={handleNext}>
              Next
            </Button>
          )}

          {/* Show "Done" when user decides to stop */}
          {scannedIds.length > 0 && (
            <Button
              type="primary"
              onClick={handleDone}
              style={{ marginLeft: "10px" }}
            >
              Done
            </Button>
          )}

          {/* Always show "Cancel" to exit without saving */}
          <Button
            type="default"
            onClick={handleCancel}
            style={{ marginLeft: "10px" }}
          >
            Cancel
          </Button>
        </div>
      </Modal>

      <Divider />

      {/* ✅ Cylinder List with Clickable Cards (filtered on desktop) */}
      <Row gutter={[16, 16]}>
        {displayedCylinders.map((cylinder) => (
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

            {/* ✅ "Not Empty" Toggle */}
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
