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
  console.log("DEBUG: Dispatch component loaded.");

  // ====================== State for data fetching ======================
  const [companies, setCompanies] = useState([]);
  const [companyId, setCompanyId] = useState(null);
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);

  // ====================== Dispatch states ======================
  const [quantity, setQuantity] = useState(null);
  const [availableCylinders, setAvailableCylinders] = useState([]);
  const [selectedCylinders, setSelectedCylinders] = useState(new Set()); // final selection
  const [step, setStep] = useState(1);

  // ====================== Scanner states & logic ======================
  const [scanning, setScanning] = useState(false); // toggles modal
  const [currentScan, setCurrentScan] = useState(null);
  const [tempScannedCylinders, setTempScannedCylinders] = useState([]);
  const scannerRef = useRef(null);

  // ====================== 1) Fetch Companies ======================
  useEffect(() => {
    console.log("DEBUG: Fetching companies...");

    axios
      .get(`${SERVER_URL}/companies`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          "ngrok-skip-browser-warning": "true",
        },
      })
      .then((res) => {
        console.log("DEBUG: companies response:", res.data);
        setCompanies(res.data);
      })
      .catch((err) => {
        console.error("DEBUG: error fetching companies:", err);
        message.error("Failed to load companies.");
      });
  }, []);

  // ====================== 2) Fetch Products ======================
  useEffect(() => {
    console.log("DEBUG: Fetching products...");

    axios
      .get(`${SERVER_URL}/products`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          "ngrok-skip-browser-warning": "true",
        },
      })
      .then((res) => {
        console.log("DEBUG: products response:", res.data);
        setProducts(res.data);
      })
      .catch((err) => {
        console.error("DEBUG: error fetching cylinder types:", err);
        message.error("Failed to load cylinder types.");
      });
  }, []);

  // ====================== 3) Fetch Available Cylinders ======================
  const fetchAvailableCylinders = async () => {
    console.log("DEBUG: fetchAvailableCylinders called:");
    console.log("DEBUG: selectedProduct:", selectedProduct);
    console.log("DEBUG: quantity:", quantity);

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
      console.log("DEBUG: availableCylinders response:", res.data);

      // Check if it's an array
      if (!Array.isArray(res.data) || res.data.length === 0) {
        message.warning("No cylinders available for this selection.");
        return;
      }
      setAvailableCylinders(res.data);
      setSelectedCylinders(new Set()); // clear old
      setStep(2);
    } catch (error) {
      console.error("DEBUG: fetchAvailableCylinders error:", error);
      message.error("Error fetching available cylinders.");
    }
  };

  // ====================== 4) Toggle Cylinder Selection ======================
  const toggleCylinderSelection = (serialNumber) => {
    console.log("DEBUG: toggleCylinderSelection called:", serialNumber);
    setSelectedCylinders((prev) => {
      const updatedSet = new Set(prev);
      if (updatedSet.has(serialNumber)) {
        updatedSet.delete(serialNumber);
      } else if (updatedSet.size < quantity) {
        updatedSet.add(serialNumber);
      }
      console.log("DEBUG: new selectedCylinders set:", updatedSet);
      return updatedSet;
    });
  };

  // ====================== 5) Scanner Logic (Single-Scan Approach) ======================
  const startScanner = () => {
    console.log("DEBUG: startScanner called. quantity:", quantity);
    if (!quantity) {
      message.warning("Please enter a quantity before scanning.");
      return;
    }
    setScanning(true);
    setTempScannedCylinders([]);
    setCurrentScan(null);
  };

  const handleScan = (decodedText) => {
    if (!decodedText) return;
    const serialNumber = decodedText.trim();

    console.log("DEBUG: handleScan -> scanned:", serialNumber);
    console.log("DEBUG: current tempScannedCylinders:", tempScannedCylinders);

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
    console.log("DEBUG: acceptCurrentScan -> currentScan:", currentScan);
    if (!currentScan) {
      message.warning("No cylinder scanned.");
      return;
    }
    if (tempScannedCylinders.includes(currentScan)) {
      message.error(`Cylinder ${currentScan} is already scanned!`);
      return;
    }

    const updated = [...tempScannedCylinders, currentScan];
    console.log("DEBUG: updated tempScannedCylinders:", updated);
    setTempScannedCylinders(updated);
    setCurrentScan(null);

    if (updated.length < quantity) {
      message.success(`Cylinder accepted. Please scan the next one.`);
      // re-launch
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
    console.log(
      "DEBUG: finalizeScanning -> tempScannedCylinders:",
      tempScannedCylinders
    );
    setSelectedCylinders(new Set(tempScannedCylinders));
    setScanning(false);
    message.success("Cylinders selected successfully!");
  };

  const closeScanner = () => {
    console.log("DEBUG: closeScanner -> discarding scans");
    setScanning(false);
    setTempScannedCylinders([]);
    setCurrentScan(null);
  };

  // scanner effect
  useEffect(() => {
    if (!scanning) return;
    console.log("DEBUG: scanning effect -> initializing scanner...");

    setTimeout(() => {
      const scanner = new Html5QrcodeScanner("reader", {
        fps: 10,
        qrbox: { width: 300, height: 300 },
      });
      scanner.render(handleScan, handleScanError);
      scannerRef.current = scanner;
    }, 500);

    return () => {
      console.log("DEBUG: cleaning up scanner effect...");
      if (scannerRef.current) {
        scannerRef.current.clear();
      }
    };
  }, [scanning]);

  // ====================== 6) Confirm Dispatch ======================
  const handleConfirmDispatch = async () => {
    console.log(
      "DEBUG: handleConfirmDispatch -> selectedCylinders:",
      selectedCylinders
    );

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
    console.log(
      "DEBUG: confirmDispatch -> final serialNumbers array:",
      serialNumbers
    );

    const payload = {
      transactionId,
      serialNumbers,
      companyId,
      selectedCompany,
      selectedProduct,
      quantity,
      date: transactionDate,
    };
    console.log("DEBUG: confirmDispatch -> payload:", payload);

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
    } catch (error) {
      console.error("DEBUG: dispatch error ->", error);
      message.error("Error dispatching cylinders.");
    }
  };

  // ====================== 7) Generate PDF Receipt ======================
  const generateReceipt = (payload) => {
    console.log("DEBUG: generateReceipt -> payload:", payload);

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

    // ensure array
    const arrayOfSerials = Array.isArray(payload.serialNumbers)
      ? payload.serialNumbers
      : [];
    console.log("DEBUG: generateReceipt -> arrayOfSerials:", arrayOfSerials);

    doc.autoTable({
      startY: 70,
      head: [["#", "Serial Number"]],
      body: arrayOfSerials.map((sn, idx) => [idx + 1, sn]),
    });

    doc.save(`Dispatch_Receipt_${payload.transactionId}.pdf`);
  };

  // ====================== Return JSX ======================
  return (
    <Card className="dispatch-card">
      <h2 className="dispatch-title">
        <UploadOutlined /> Dispatch Cylinders
      </h2>

      <Space direction="vertical" style={{ width: "100%" }}>
        {/* Company */}
        <label>Select Company:</label>
        <Select
          showSearch
          onChange={setCompanyId}
          value={companyId}
          placeholder="Choose a company"
          style={{ width: "100%" }}
        >
          {/* Debug: companies might not be an array -> safe approach */}
          {Array.isArray(companies)
            ? companies.map((comp) => (
                <Select.Option key={comp.id} value={comp.id}>
                  {comp.name}
                </Select.Option>
              ))
            : null}
        </Select>

        {/* Cylinder Type */}
        <label>Select Cylinder Type:</label>
        <Select
          showSearch
          onChange={setSelectedProduct}
          value={selectedProduct}
          placeholder="Choose a cylinder type"
          style={{ width: "100%" }}
        >
          {Array.isArray(products)
            ? products.map((prod) => (
                <Select.Option key={prod} value={prod}>
                  {prod}
                </Select.Option>
              ))
            : null}
        </Select>

        {/* Quantity */}
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

        {/* Scanner Modal */}
        <Modal
          title="QR Code Scanner"
          open={scanning}
          onCancel={closeScanner}
          footer={null}
        >
          <div id="reader" style={{ width: "100%", height: "auto" }} />

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

        {/* Cylinder Cards (Only if step=2) */}
        {step === 2 && (
          <Row gutter={[16, 16]} style={{ marginTop: 10 }}>
            {Array.isArray(availableCylinders)
              ? availableCylinders.map((cyl) => (
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
                ))
              : (console.log(
                  "DEBUG: availableCylinders is not an array:",
                  availableCylinders
                ),
                null)}
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
