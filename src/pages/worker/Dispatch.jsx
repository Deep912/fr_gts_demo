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
  const [tempScannedCylinders, setTempScannedCylinders] = useState([]); // scanned before finalizing
  const scannerRef = useRef(null); // store scanner instance

  // ✅ Fetch Companies
  useEffect(() => {
    axios
      .get(`${SERVER_URL}/companies`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      })
      .then((res) => setCompanies(res.data))
      .catch(() => message.error("Failed to load companies."));
  }, []);

  // ✅ Fetch Cylinder Products
  useEffect(() => {
    axios
      .get(`${SERVER_URL}/products`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      })
      .then((res) => setProducts(res.data))
      .catch(() => message.error("Failed to load cylinder types."));
  }, []);

  // ✅ Fetch Available Cylinders
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
      if (res.data.length === 0) {
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

  // ✅ Toggle Cylinder Selection
  const toggleCylinderSelection = (serialNumber) => {
    setSelectedCylinders((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(serialNumber)) {
        newSet.delete(serialNumber);
      } else if (newSet.size < quantity) {
        newSet.add(serialNumber);
      }
      return newSet;
    });
  };

  // ✅ Start QR Scanner
  const startScanner = () => {
    setScanning(true);
    setTempScannedCylinders([]);
    setCurrentScan(null);
  };

  // ✅ Handle Scanned QR
  const handleScan = (decodedText) => {
    if (!decodedText) return;
    const serialNumber = decodedText.trim();

    // prevent duplicates
    if (tempScannedCylinders.includes(serialNumber)) {
      message.error(`Cylinder ${serialNumber} is already scanned!`);
      return;
    }

    // store the newly scanned cylinder
    setCurrentScan(serialNumber);
  };

  // ✅ Accept the current scanned cylinder & move to next
  const acceptCurrentScan = () => {
    if (!currentScan) {
      message.warning("No cylinder scanned.");
      return;
    }

    // check duplicates again
    if (tempScannedCylinders.includes(currentScan)) {
      message.error(`Cylinder ${currentScan} is already scanned!`);
      return;
    }

    const updated = [...tempScannedCylinders, currentScan];
    setTempScannedCylinders(updated);
    setCurrentScan(null);

    if (updated.length < quantity) {
      message.success(
        `Cylinder ${currentScan} scanned. Please scan the next one.`
      );
    } else {
      message.success(
        "All required cylinders scanned! Click 'Done' to proceed."
      );
    }
  };

  // ✅ Finalize scanning & move them to selectedCylinders
  const finalizeScanning = () => {
    setSelectedCylinders(new Set(tempScannedCylinders));
    setScanning(false);
    message.success("Cylinders selected successfully!");
  };

  // ✅ Close scanner without selection
  const closeScanner = () => {
    setScanning(false);
    setTempScannedCylinders([]);
    setCurrentScan(null);
  };

  // ✅ Scanner initialization effect
  useEffect(() => {
    if (!scanning) return;

    // initialize scanner
    setTimeout(() => {
      const scanner = new Html5QrcodeScanner("reader", {
        fps: 10,
        qrbox: { width: 300, height: 300 },
      });

      scanner.render(
        (decodedText) => handleScan(decodedText),
        (err) => console.warn("Scanner error:", err)
      );
      scannerRef.current = scanner;
    }, 500);

    // cleanup
    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear();
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

    // build dispatch payload
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
      generateReceipt(payload);

      // reset form
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

  // ✅ Generate PDF receipt
  const generateReceipt = (payload) => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("Cylinder Dispatch Receipt", 70, 10);

    const selectedCompany =
      companies.find((c) => c.id === payload.companyId)?.name || "Unknown";
    doc.setFontSize(12);
    doc.text(`Transaction ID: ${payload.transactionId}`, 10, 20);
    doc.text(`Company: ${selectedCompany}`, 10, 30);
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

        {/* Fetch and Scan Buttons */}
        <Row gutter={[16, 16]}>
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
          open={scanning}
          onCancel={closeScanner}
          footer={null}
          title="QR Code Scanner"
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
              Close
            </Button>
          </div>
        </Modal>

        {/* Cylinders as Cards */}
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

        <Button
          type="primary"
          icon={<UploadOutlined />}
          block
          disabled={step !== 2}
          onClick={handleConfirmDispatch}
        >
          Confirm Dispatch
        </Button>
      </Space>
    </Card>
  );
};

export default Dispatch;
