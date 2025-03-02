import { useState, useEffect, useRef } from "react";
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
  FilePdfOutlined, // from your original code
} from "@ant-design/icons";
import { Html5QrcodeScanner } from "html5-qrcode";
import jsPDF from "jspdf";
import "jspdf-autotable";
import "../../styles/Dispatch.css";

// ==================== Keep your SERVER_URL ====================
const SERVER_URL = import.meta.env.VITE_API_URL;

const Dispatch = () => {
  console.log("DEBUG: Dispatch component loaded.");

  // ===================== Original states from your code =====================
  const [companies, setCompanies] = useState([]);
  const [companyId, setCompanyId] = useState(null);
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [quantity, setQuantity] = useState(null);
  const [availableCylinders, setAvailableCylinders] = useState([]);
  const [selectedCylinders, setSelectedCylinders] = useState(new Set());

  const [step, setStep] = useState(1);

  // Possibly from your older code
  const [dispatchCompleted, setDispatchCompleted] = useState(false);
  const [showSummary, setShowSummary] = useState(false);

  // ===================== Single-scan approach states =====================
  const [scanning, setScanning] = useState(false);
  const [currentScan, setCurrentScan] = useState(null);
  const [tempScannedCylinders, setTempScannedCylinders] = useState([]);

  // This new state shows a big warning in the modal if code is a duplicate
  const [duplicateWarning, setDuplicateWarning] = useState(false);

  // hold scanner instance
  const scannerRef = useRef(null);

  // ============ 1) Fetch Companies (ngrok skip) =============
  useEffect(() => {
    axios
      .get(`${SERVER_URL}/companies`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          "ngrok-skip-browser-warning": "true",
        },
      })
      .then((res) => setCompanies(res.data))
      .catch(() => message.error("Failed to load companies."));
  }, []);

  // ============ 2) Fetch Products (ngrok skip) =============
  useEffect(() => {
    axios
      .get(`${SERVER_URL}/products`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          "ngrok-skip-browser-warning": "true",
        },
      })
      .then((res) => setProducts(res.data))
      .catch(() => message.error("Failed to load cylinder types."));
  }, []);

  // ============ 3) Fetch Available Cylinders (ngrok skip) =============
  const fetchAvailableCylinders = async () => {
    if (!selectedProduct || !quantity) {
      message.warning("Please select a cylinder type and quantity.");
      return;
    }

    try {
      const res = await axios.get(
        `${SERVER_URL}/available-cylinders?product=${selectedProduct}&quantity=${quantity}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
            "ngrok-skip-browser-warning": "true",
          },
        }
      );
      if (!Array.isArray(res.data) || res.data.length === 0) {
        message.warning("No cylinders available for this selection.");
        return;
      }
      setAvailableCylinders(res.data);
      setSelectedCylinders(new Set());
      setStep(2);
    } catch (error) {
      message.error("Error fetching available cylinders.");
    }
  };

  // ============ 4) Toggle Cylinder Selection =============
  const toggleCylinderSelection = (serialNumber) => {
    setSelectedCylinders((prev) => {
      const updated = new Set(prev);
      if (updated.has(serialNumber)) {
        updated.delete(serialNumber);
      } else if (updated.size < quantity) {
        updated.add(serialNumber);
      }
      return updated;
    });
  };

  // ============ 5) Start Single-Scan =============
  const startScanner = () => {
    if (!quantity) {
      message.warning("Please enter a quantity before scanning.");
      return;
    }
    setScanning(true);
    setTempScannedCylinders([]);
    setCurrentScan(null);
    setDuplicateWarning(false);
  };

  /*******************************************************
   * (5A) handleScan - with explicit on-screen duplicate warning
   *******************************************************/
  const handleScan = (decodedText) => {
    if (!decodedText) return;
    const serialNumber = decodedText.trim();

    // Merge partial + final
    const combined = new Set(tempScannedCylinders);
    selectedCylinders.forEach((sn) => combined.add(sn));

    if (combined.has(serialNumber)) {
      // It's a duplicate
      if (scannerRef.current) {
        scannerRef.current.clear();
      }
      setCurrentScan(serialNumber);
      setDuplicateWarning(true);
      return; // Stop here
    }

    // Otherwise normal flow
    if (scannerRef.current) {
      scannerRef.current.clear();
    }
    setCurrentScan(serialNumber);
    setDuplicateWarning(false);
    message.info(`Scanned: ${serialNumber}`);
  };
  const handleScanError = (error) => {
    console.warn("handleScanError ->", error);
  };

  /*******************************************************
   * (5B) acceptCurrentScan -> Next button
   *******************************************************/
  const acceptCurrentScan = () => {
    if (!currentScan) {
      message.warning("No cylinder scanned.");
      return;
    }
    // double-check duplicates
    const combined = new Set(tempScannedCylinders);
    selectedCylinders.forEach((sn) => combined.add(sn));

    if (combined.has(currentScan)) {
      setDuplicateWarning(true);
      message.error(`Cylinder ${currentScan} is already scanned!`);
      setCurrentScan(null);

      // re-render so user can try scanning different code
      if (scannerRef.current) {
        scannerRef.current.clear();
        scannerRef.current.render(handleScan, handleScanError);
      }
      return;
    }

    const updated = [...tempScannedCylinders, currentScan];
    setTempScannedCylinders(updated);

    const scanned = currentScan;
    setCurrentScan(null);
    setDuplicateWarning(false);

    if (updated.length < quantity) {
      message.success(`Cylinder ${scanned} accepted. Please scan next.`);
      if (scannerRef.current) {
        scannerRef.current.clear();
        scannerRef.current.render(handleScan, handleScanError);
      }
    } else {
      message.success(
        "All required cylinders scanned! Click 'Done' to finalize."
      );
    }
  };

  /*******************************************************
   * (5C) If duplicateWarning is true, user can click "Re-scan"
   *******************************************************/
  const handleRescan = () => {
    setDuplicateWarning(false);
    setCurrentScan(null);
    if (scannerRef.current) {
      scannerRef.current.clear();
      scannerRef.current.render(handleScan, handleScanError);
    }
  };

  const finalizeScanning = () => {
    setSelectedCylinders(new Set(tempScannedCylinders));
    setScanning(false);
    setDuplicateWarning(false);
    setCurrentScan(null);
    message.success("Cylinders selected successfully!");
  };

  const closeScanner = () => {
    setScanning(false);
    setTempScannedCylinders([]);
    setCurrentScan(null);
    setDuplicateWarning(false);
  };

  /*******************************************************
   * (5D) Scanner effect
   *******************************************************/
  useEffect(() => {
    if (!scanning) return;

    setTimeout(() => {
      const scanner = new Html5QrcodeScanner("reader", {
        fps: 10,
        qrbox: { width: 300, height: 300 },
      });
      scanner.render(handleScan, handleScanError);
      scannerRef.current = scanner;
    }, 500);

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear();
      }
    };
  }, [scanning]);

  // ============ 6) Confirm Dispatch =============
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
    const compObj = companies.find((c) => c.id === companyId);
    const selectedCompany = compObj ? compObj.name : "Unknown";

    const serialNumbers = Array.from(selectedCylinders);

    const payload = {
      transactionId,
      serialNumbers,
      companyId,
      selectedCompany,
      selectedProduct,
      quantity,
      date: transactionDate,
    };

    try {
      await axios.post(`${SERVER_URL}/dispatch-cylinder`, payload, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          "ngrok-skip-browser-warning": "true",
        },
      });

      message.success("Cylinders Dispatched Successfully!");
      generateReceipt(payload);

      // reset
      setStep(1);
      setSelectedCylinders(new Set());
      setAvailableCylinders([]);
      setCompanyId(null);
      setSelectedProduct(null);
      setQuantity(null);

      // keep old references
      setDispatchCompleted(true);
      setShowSummary(false);
    } catch (error) {
      message.error("Error dispatching cylinders.");
    }
  };

  const reRenderScanner = () => {
    setDuplicateWarning(false);
    setCurrentScan(null);
    if (scannerRef.current) {
      scannerRef.current.clear();
      scannerRef.current.render(handleScan, handleScanError);
    }
  };

  // ============ 7) generateReceipt =============
  const generateReceipt = (payload) => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("Cylinder Dispatch Receipt", 70, 10);

    const cobj = companies.find((c) => c.id === payload.companyId);
    const cName = cobj ? cobj.name : "Unknown Company";

    doc.setFontSize(12);
    doc.text(`Transaction ID: ${payload.transactionId}`, 10, 20);
    doc.text(`Company: ${cName}`, 10, 30);
    doc.text(`Cylinder Type: ${payload.selectedProduct}`, 10, 40);
    doc.text(`Quantity: ${payload.quantity}`, 10, 50);
    doc.text(`Date: ${payload.date}`, 10, 60);

    doc.autoTable({
      startY: 70,
      head: [["#", "Serial Number"]],
      body: payload.serialNumbers.map((sn, idx) => [idx + 1, sn]),
    });

    doc.save(`Dispatch_Receipt_${payload.transactionId}.pdf`);
  };

  // ============ Return full JSX =============
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
          {companies.map((co) => (
            <Select.Option key={co.id} value={co.id}>
              {co.name}
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
          {products.map((prod) => (
            <Select.Option key={prod} value={prod}>
              {prod}
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

        {/* Buttons */}
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

        {/* Single-scan Modal */}
        <Modal open={scanning} onCancel={closeScanner} footer={null}>
          <h3>QR Code Scanner</h3>
          <div id="reader"></div>

          {/* If we have a duplicate */}
          {duplicateWarning && currentScan && (
            <div style={{ marginTop: 16, color: "red" }}>
              <p>You scanned the same QR code: {currentScan}</p>
              <Button type="primary" onClick={reRenderScanner}>
                Re-Scan
              </Button>
            </div>
          )}

          {/* Normal flow for non-duplicate */}
          {!duplicateWarning && currentScan && (
            <>
              <p>
                <strong>Scanned Cylinder ID:</strong> {currentScan}
              </p>
              {/* Next or Done logic */}
            </>
          )}

          {/* The rest of your Done / Cancel logic */}
        </Modal>

        {/* If step=2, show cylinder cards */}
        {step === 2 && (
          <Row gutter={[16, 16]} style={{ marginTop: "10px" }}>
            {availableCylinders.map((cyl) => (
              <Col span={6} key={cyl.serial_number}>
                <Card
                  hoverable
                  onClick={() => toggleCylinderSelection(cyl.serial_number)}
                  style={{
                    background: selectedCylinders.has(cyl.serial_number)
                      ? "#3e95cd"
                      : "#fff",
                    color: selectedCylinders.has(cyl.serial_number)
                      ? "#fff"
                      : "#000",
                  }}
                >
                  <h3>{cyl.serial_number}</h3>
                </Card>
              </Col>
            ))}
          </Row>
        )}

        {/* Confirm Dispatch */}
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
