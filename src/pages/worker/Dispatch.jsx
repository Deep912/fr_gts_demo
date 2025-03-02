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
} from "@ant-design/icons";
import { Html5QrcodeScanner } from "html5-qrcode";
import jsPDF from "jspdf";
import "jspdf-autotable";
import "../../styles/Dispatch.css";

const SERVER_URL = import.meta.env.VITE_API_URL;

const Dispatch = () => {
  // ========= State for fetching data ========
  const [companies, setCompanies] = useState([]);
  const [companyId, setCompanyId] = useState(null);
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);

  // ========= Dispatch flow states =========
  const [quantity, setQuantity] = useState(null);
  const [availableCylinders, setAvailableCylinders] = useState([]);
  const [selectedCylinders, setSelectedCylinders] = useState(new Set()); // final selection
  const [step, setStep] = useState(1);

  // ========= Scanner states & logic ========
  const [scanning, setScanning] = useState(false); // toggles modal
  const [currentScan, setCurrentScan] = useState(null);
  const [tempScannedCylinders, setTempScannedCylinders] = useState([]);
  const scannerRef = useRef(null);

  // ======================= 1) Fetch Companies =======================
  useEffect(() => {
    axios
      .get(`${SERVER_URL}/companies`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      })
      .then((res) => {
        setCompanies(res.data);
      })
      .catch(() => {
        message.error("Failed to load companies.");
      });
  }, []);

  // ======================= 2) Fetch Cylinder Products =======================
  useEffect(() => {
    axios
      .get(`${SERVER_URL}/products`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      })
      .then((res) => {
        setProducts(res.data);
      })
      .catch(() => {
        message.error("Failed to load cylinder types.");
      });
  }, []);

  // ======================= 3) Fetch Available Cylinders =======================
  const fetchAvailableCylinders = async () => {
    if (!selectedProduct || !quantity) {
      message.warning("Please select a cylinder type and quantity.");
      return;
    }

    try {
      const res = await axios.get(
        `${SERVER_URL}/available-cylinders?product=${selectedProduct}&quantity=${quantity}`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
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

  // ======================= 4) Toggle Cylinder Selection =======================
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

  // ======================= 5) Scanner: Single-Scan Approach =======================
  const startScanner = () => {
    if (!quantity) {
      message.warning("Please enter a quantity first.");
      return;
    }
    setScanning(true);
    setTempScannedCylinders([]);
    setCurrentScan(null);
  };

  // single QR code read
  const handleScan = (decodedText) => {
    if (!decodedText) return;
    const serialNumber = decodedText.trim();

    // prevent duplicates
    if (tempScannedCylinders.includes(serialNumber)) {
      message.error(`Cylinder ${serialNumber} is already scanned!`);
      return;
    }
    // pause scanning
    if (scannerRef.current) {
      scannerRef.current.clear();
    }
    setCurrentScan(serialNumber);
    message.info(`Scanned: ${serialNumber}`);
  };

  const handleScanError = (error) => {
    console.warn("QR Scanner Error:", error);
  };

  const acceptCurrentScan = () => {
    if (!currentScan) {
      message.warning("No cylinder scanned.");
      return;
    }
    // check duplicates
    if (tempScannedCylinders.includes(currentScan)) {
      message.error(`Cylinder ${currentScan} is already scanned!`);
      return;
    }

    const updated = [...tempScannedCylinders, currentScan];
    setTempScannedCylinders(updated);
    setCurrentScan(null);

    // if not done, re-launch scanner
    if (updated.length < quantity) {
      message.success(
        `Cylinder ${currentScan} accepted. Please scan the next one.`
      );
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

  const finalizeScanning = () => {
    // move them to final set
    setSelectedCylinders(new Set(tempScannedCylinders));
    setScanning(false);
    message.success("Cylinders selected successfully!");
  };

  const closeScanner = () => {
    setScanning(false);
    setTempScannedCylinders([]);
    setCurrentScan(null);
  };

  // scanner effect
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

  // ======================= 6) Confirm Dispatch =======================
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
    const companyObj = companies.find((c) => c.id === companyId);
    const selectedCompany = companyObj ? companyObj.name : "Unknown";

    // convert set -> array
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
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
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
    } catch (error) {
      message.error("Error dispatching cylinders.");
    }
  };

  // ======================= 7) Generate PDF Receipt =======================
  const generateReceipt = (payload) => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("Cylinder Dispatch Receipt", 70, 10);

    const compName =
      companies.find((c) => c.id === payload.companyId)?.name ||
      "Unknown Company";

    doc.setFontSize(12);
    doc.text(`Transaction ID: ${payload.transactionId}`, 10, 20);
    doc.text(`Company: ${compName}`, 10, 30);
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

  // ======================= Return JSX =======================
  return (
    <Card className="dispatch-card">
      <h2 className="dispatch-title">
        <UploadOutlined /> Dispatch Cylinders
      </h2>

      <Space direction="vertical" style={{ width: "100%" }}>
        <label>Select Company:</label>
        <Select
          showSearch
          onChange={setCompanyId}
          value={companyId}
          placeholder="Choose a company"
          style={{ width: "100%" }}
        >
          {companies.map((comp) => (
            <Select.Option key={comp.id} value={comp.id}>
              {comp.name}
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
        <Row gutter={[16, 16]} style={{ marginBottom: 10 }}>
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

        {/* QR Scanner Modal */}
        <Modal
          title="QR Code Scanner"
          open={scanning}
          onCancel={closeScanner}
          footer={null}
        >
          <div id="reader" style={{ width: "100%", height: "auto" }}></div>

          {currentScan && (
            <>
              <p>
                <strong>Scanned Cylinder ID:</strong> {currentScan}
              </p>
              {tempScannedCylinders.length < quantity && (
                <Button type="primary" onClick={acceptCurrentScan}>
                  Next
                </Button>
              )}
            </>
          )}

          <div style={{ marginTop: 10 }}>
            {tempScannedCylinders.length === quantity && (
              <Button type="primary" onClick={finalizeScanning}>
                Done
              </Button>
            )}
            <Button style={{ marginLeft: 8 }} onClick={closeScanner}>
              Cancel
            </Button>
          </div>
        </Modal>

        {/* Cylinders Display (Step 2) */}
        {step === 2 && (
          <Row gutter={[16, 16]} style={{ marginTop: 10 }}>
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
