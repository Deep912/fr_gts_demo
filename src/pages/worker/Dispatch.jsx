import { useState, useEffect } from "react";

import axios from "axios";
import {
  Select,
  InputNumber,
  Button,
  Card,
  Row,
  Col,
  Space,
  message,
  Modal,
} from "antd";
import {
  UploadOutlined,
  SearchOutlined,
  ScanOutlined,
  FilePdfOutlined,
} from "@ant-design/icons";
import { Html5QrcodeScanner } from "html5-qrcode";
import jsPDF from "jspdf";
import "jspdf-autotable";
import "../../styles/Dispatch.css";

const SERVER_URL = import.meta.env.VITE_API_URL;

const Dispatch = () => {
  const [companies, setCompanies] = useState([]);
  const [companyId, setCompanyId] = useState(null);
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [quantity, setQuantity] = useState(null);
  const [availableCylinders, setAvailableCylinders] = useState([]);
  const [selectedCylinders, setSelectedCylinders] = useState(new Set());
  const [step, setStep] = useState(1);
  const [scanning, setScanning] = useState(false);
  const [currentScan, setCurrentScan] = useState(null);
  const [tempScannedCylinders, setTempScannedCylinders] = useState([]); // Temporary storage before confirmation

  const [dispatchCompleted, setDispatchCompleted] = useState(false);

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
      .catch(() => message.error("Failed to load companies."));
  }, []);

  // ✅ Fetch Cylinder Products
  useEffect(() => {
    axios
      .get(`${SERVER_URL}/products`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          "ngrok-skip-browser-warning": "true",
        },
      })
      .then((response) => setProducts(response.data))
      .catch(() => message.error("Failed to load cylinder types."));
  }, []);

  // ✅ Fetch Available Cylinders
  const fetchAvailableCylinders = async () => {
    if (!selectedProduct || !quantity) {
      message.warning("Please select a cylinder type and quantity.");
      return;
    }

    try {
      const response = await axios.get(
        `${SERVER_URL}/available-cylinders?product=${selectedProduct}&quantity=${quantity}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
            "ngrok-skip-browser-warning": "true",
          },
        }
      );

      if (response.data.length === 0) {
        message.warning("No cylinders available for this selection.");
        return;
      }

      setAvailableCylinders(response.data);
      setSelectedCylinders(new Set()); // ✅ Clear selection on refresh
      setStep(2);
    } catch (error) {
      message.error("Error fetching available cylinders.");
    }
  };

  // ✅ Toggle Cylinder Selection (Now Works)
  const toggleCylinderSelection = (serialNumber) => {
    setSelectedCylinders((prevSelected) => {
      const newSelection = new Set(prevSelected);
      if (newSelection.has(serialNumber)) {
        newSelection.delete(serialNumber);
      } else {
        if (newSelection.size < quantity) newSelection.add(serialNumber);
      }
      return newSelection;
    });
  };

  // ✅ Start QR Scanner
  const startScanner = () => {
    setScanning(true);
    setTempScannedCylinders([]); // Reset temp list
    setCurrentScan(null);
  };

  // ✅ Handle Scanned QR Code (Scans One at a Time)
  const handleScan = (decodedText) => {
    if (!decodedText) return;
    const serialNumber = decodedText.trim();

    if (tempScannedCylinders.includes(serialNumber)) {
      message.warning(`Cylinder ${serialNumber} is already scanned.`);
      return;
    }

    setCurrentScan(serialNumber);
  };

  // ✅ Accept Current Scan & Move to Next
  // ✅ Accept Current Scan & Move to Next
  const acceptCurrentScan = () => {
    if (!currentScan) {
      message.warning("No cylinder scanned.");
      return;
    }

    setTempScannedCylinders((prev) => {
      const newScans = [...prev, currentScan];

      // ✅ Reset for next scan
      setCurrentScan(null);

      // ✅ Ensure "Next" keeps working until quantity is met
      if (newScans.length < quantity) {
        message.success(
          `Cylinder ${currentScan} scanned. Please scan the next one.`
        );
      } else {
        message.success(
          "All required cylinders scanned! Click 'Done' to proceed."
        );
      }

      return newScans;
    });
  };

  // ✅ Finalize Scanning & Select Cylinders
  const finalizeScanning = () => {
    setSelectedCylinders(new Set(tempScannedCylinders));
    setScanning(false);
    message.success("Cylinders selected successfully!");
  };

  // ✅ Close Scanner Without Selection
  const closeScanner = () => {
    setScanning(false);
    setTempScannedCylinders([]);
    setCurrentScan(null);
  };

  // ✅ Effect to Start Scanner
  useEffect(() => {
    let scanner;

    if (scanning) {
      try {
        setTimeout(() => {
          scanner = new Html5QrcodeScanner("reader", {
            fps: 10,
            qrbox: { width: 300, height: 300 },
            disableFlip: false,
          });

          scanner.render(
            (decodedText) => {
              handleScan(decodedText); // Process scanned QR
            },
            (err) => {
              console.warn("QR Scanner Error:", err);
            }
          );
        }, 500);
      } catch (error) {
        console.error("Camera Initialization Error:", error);
        message.error("Failed to access camera. Please check permissions.");
        setScanning(false);
      }
    }

    return () => {
      if (scanner) {
        scanner.clear();
      }
    };
  }, [scanning]);

  // ✅ Confirm Dispatch

  const handleConfirmDispatch = async () => {
    if (!companyId) {
      message.warning("Please select a company.");
      return;
    }
    if (!selectedProduct) {
      message.warning("Please select a cylinder type.");
      return;
    }
    if (selectedCylinders.size !== Number(quantity)) {
      message.warning(`Please select exactly ${quantity} cylinders.`);
      return;
    }

    const transactionId = `TXN-${Date.now()}`;
    const transactionDate = new Date().toLocaleString();
    const selectedCompany =
      companies.find((c) => c.id === companyId)?.name || "Unknown";

    const payload = {
      transactionId,
      serialNumbers: Array.from(selectedCylinders),
      companyId,
      selectedCompany,
      selectedProduct,
      quantity,
      date: transactionDate,
    };

    try {
      await axios.post(`${SERVER_URL}/dispatch-cylinder`, payload, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });

      message.success("Cylinders Dispatched Successfully!");

      // ✅ Generate and download PDF receipt
      generateReceipt(payload);

      // ✅ Reset form after dispatch
      setStep(1);
      setSelectedCylinders(new Set());
      setAvailableCylinders([]);
      setCompanyId(null);
      setSelectedProduct(null);
      setQuantity(null);
      setShowSummary(false); // Close modal after dispatch
    } catch (error) {
      message.error("Error dispatching cylinders.");
    }
  };

  const generateReceipt = (payload) => {
    const doc = new jsPDF();

    // 🔷 Title
    doc.setFontSize(18);
    doc.text("Cylinder Dispatch Receipt", 70, 10);

    // 🔷 Transaction Details
    const selectedCompany =
      companies.find((c) => c.id === payload.companyId)?.name ||
      "Unknown Company";
    doc.setFontSize(12);
    doc.text(`Transaction ID: ${payload.transactionId}`, 10, 20);
    doc.text(`Company: ${selectedCompany}`, 10, 30);
    doc.text(`Cylinder Type: ${payload.selectedProduct}`, 10, 40);
    doc.text(`Quantity: ${payload.quantity}`, 10, 50);
    doc.text(`Date: ${payload.date}`, 10, 60);

    // 🔷 Table for Cylinder Serial Numbers
    doc.autoTable({
      startY: 70,
      head: [["#", "Serial Number"]],
      body: payload.serialNumbers.map((serial, index) => [index + 1, serial]),
    });

    // 🔷 Save the PDF
    doc.save(`Dispatch_Receipt_${payload.transactionId}.pdf`);
  };

  return (
    <Card className="dispatch-card">
      <h2 className="dispatch-title">
        <UploadOutlined /> Dispatch Cylinders
      </h2>

      <Space
        direction="vertical"
        style={{ width: "100%", paddingBottom: "15px" }}
      >
        <label>Select Company:</label>
        <Select
          showSearch
          onChange={setCompanyId}
          value={companyId}
          placeholder="Choose a company"
          style={{ width: "100%" }}
        >
          {companies.map((company) => (
            <Select.Option key={company.id} value={company.id}>
              {company.name}
            </Select.Option>
          ))}
        </Select>

        <label>Select Cylinder Type:</label>
        <Select
          showSearch
          onChange={setSelectedProduct}
          value={selectedProduct}
          placeholder="Choose a cylinder type"
          style={{ width: "100%" }}
        >
          {products.map((product) => (
            <Select.Option key={product} value={product}>
              {product}
            </Select.Option>
          ))}
        </Select>

        <label>Enter Quantity:</label>
        <InputNumber
          min={1}
          value={quantity}
          onChange={setQuantity}
          style={{ width: "100%" }}
        />

        {/* ✅ Fetch and Scan Buttons */}
        <Row gutter={[16, 16]} style={{ marginBottom: "10px" }}>
          <Col span={12}>
            <Button
              type="primary"
              icon={<SearchOutlined />}
              block
              onClick={fetchAvailableCylinders}
            >
              Fetch Cylinders
            </Button>
          </Col>
          <Col span={12}>
            <Button
              type="default"
              icon={<ScanOutlined />}
              block
              onClick={startScanner}
            >
              Scan QR Code
            </Button>
          </Col>
        </Row>

        {/* ✅ QR Scanner Modal */}
        <Modal open={scanning} onCancel={closeScanner} footer={null}>
          <h3>QR Code Scanner</h3>

          {/* ✅ QR Scanner UI */}
          <div id="reader" style={{ width: "100%", height: "auto" }}></div>

          {/* ✅ Show the last scanned Cylinder ID */}
          {currentScan && (
            <>
              <p>
                <strong>Scanned Cylinder ID:</strong> {currentScan}
              </p>

              {/* ✅ Show "Next" until the required quantity is scanned */}
              {tempScannedCylinders.length < quantity - 1 && (
                <Button type="primary" onClick={acceptCurrentScan}>
                  Next
                </Button>
              )}

              {/* ✅ Show "Done" when all scans are completed */}
              {tempScannedCylinders.length === quantity - 1 && (
                <Button type="primary" onClick={acceptCurrentScan}>
                  Scan Last Cylinder
                </Button>
              )}
            </>
          )}

          <div style={{ marginTop: "15px" }}>
            {/* ✅ Show "Done" after scanning required quantity */}
            {tempScannedCylinders.length === quantity && (
              <Button type="primary" onClick={finalizeScanning}>
                Done
              </Button>
            )}

            {/* ✅ Always show "Close" to cancel scanning */}
            <Button type="default" onClick={closeScanner}>
              Close
            </Button>
          </div>
        </Modal>

        {/* ✅ Cylinders Display as Cards (Now Clickable) */}
        {step === 2 && (
          <Row gutter={[16, 16]} style={{ marginTop: "10px" }}>
            {availableCylinders.map((cylinder) => (
              <Col span={6} key={cylinder.serial_number}>
                <Card
                  hoverable
                  onClick={() =>
                    toggleCylinderSelection(cylinder.serial_number)
                  }
                  style={{
                    background: selectedCylinders.has(cylinder.serial_number)
                      ? "#3e95cd"
                      : "#fff",
                    color: selectedCylinders.has(cylinder.serial_number)
                      ? "#fff"
                      : "#000",
                  }}
                >
                  <h3>{cylinder.serial_number}</h3>
                </Card>
              </Col>
            ))}
          </Row>
        )}

        <Button
          type="primary"
          icon={<UploadOutlined />}
          block
          onClick={handleConfirmDispatch}
          disabled={step !== 2}
        >
          Confirm Dispatch
        </Button>
      </Space>
    </Card>
  );
};

export default Dispatch;
