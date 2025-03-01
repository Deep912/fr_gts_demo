import { useState, useEffect } from "react";
import axios from "axios";
import {
  Select,
  InputNumber,
  Button,
  Card,
  Row,
  Col,
  Checkbox,
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
  const [companyId, setCompanyId] = useState("");
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState("");
  const [quantity, setQuantity] = useState("");
  const [availableCylinders, setAvailableCylinders] = useState([]);
  const [selectedCylinders, setSelectedCylinders] = useState([]);
  const [step, setStep] = useState(1);
  const [scanning, setScanning] = useState(false);
  const [scannerInstance, setScannerInstance] = useState(null);
  const [dispatchCompleted, setDispatchCompleted] = useState(false); // ✅ Track if dispatch was successful

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      message.error("Session expired. Please log in again.");
      window.location.href = "/login";
      return;
    }

    axios
      .get(`${SERVER_URL}/companies`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "ngrok-skip-browser-warning": "true",
        },
      })
      .then((response) => setCompanies(response.data))
      .catch(() => message.error("Error fetching companies."));
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("token");
    axios
      .get(`${SERVER_URL}/products`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "ngrok-skip-browser-warning": "true",
        },
      })
      .then((response) => setProducts(response.data))
      .catch(() => message.error("Error fetching products"));
  }, []);

  const fetchAvailableCylinders = async () => {
    if (!selectedProduct || !quantity) return;
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(
        `${SERVER_URL}/available-cylinders?product=${selectedProduct}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "ngrok-skip-browser-warning": "true",
          },
        }
      );
      setAvailableCylinders(response.data);
      setStep(2);
    } catch (error) {
      message.error("Error fetching available cylinders");
    }
  };

  const toggleCylinderSelection = (serialNumber) => {
    setSelectedCylinders((prevSelected) =>
      prevSelected.includes(serialNumber)
        ? prevSelected.filter((sn) => sn !== serialNumber)
        : [...prevSelected, serialNumber]
    );
  };

  const handleScan = (decodedText) => {
    if (!decodedText) return;
    const serialNumber = decodedText.trim();
    if (!selectedCylinders.includes(serialNumber)) {
      setSelectedCylinders((prev) => [...prev, serialNumber]);
      message.success(`Scanned: ${serialNumber}`);
    }
    if (selectedCylinders.length + 1 >= quantity) {
      setScanning(false);
      scannerInstance?.clear();
      message.success("All cylinders scanned successfully!");
    }
  };

  const handleScanError = () => {
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

  const handleConfirmDispatch = async () => {
    if (selectedCylinders.length !== Number(quantity)) {
      message.warning(`Please select exactly ${quantity} cylinders`);
      return;
    }

    const payload = {
      serialNumbers: selectedCylinders,
      companyId,
      selectedProduct,
      quantity,
    };

    try {
      const token = localStorage.getItem("token");
      await axios.post(`${SERVER_URL}/dispatch-cylinder`, payload, {
        headers: {
          Authorization: `Bearer ${token}`,
          "ngrok-skip-browser-warning": "true",
        },
      });

      message.success("Cylinders Dispatched Successfully!");

      // ✅ Mark dispatch as completed to show "Download Receipt" button
      setDispatchCompleted(true);

      // ✅ Reset fields for a new dispatch
      setStep(1);
      setSelectedCylinders([]);
      setAvailableCylinders([]);
      setCompanyId("");
      setSelectedProduct("");
      setQuantity("");
    } catch (error) {
      message.error("Error dispatching cylinders");
    }
  };

  const generatePDF = () => {
    const doc = new jsPDF();
    const companyName =
      companies.find((c) => c.id === companyId)?.name || "Unknown Company";
    const dateTime = new Date().toLocaleString();

    doc.setFont("helvetica", "bold");
    doc.text("Cylinder Dispatch Receipt", 105, 15, { align: "center" });
    doc.setFontSize(11);
    doc.text(`Company: ${companyName}`, 15, 30);
    doc.text(`Date: ${dateTime}`, 15, 40);
    doc.text(`Dispatched Cylinders: ${selectedCylinders.length}`, 15, 50);

    const tableColumn = ["Serial Number", "Gas Type", "Size"];
    const tableRows = selectedCylinders.map((serial) => {
      const cylinder = availableCylinders.find(
        (c) => c.serial_number === serial
      );
      return [serial, cylinder?.gas_type || "Unknown", cylinder?.size || "N/A"];
    });

    doc.autoTable({
      head: [tableColumn],
      body: tableRows,
      startY: 60,
      theme: "striped",
    });

    doc.save(`Dispatch_Receipt_${dateTime}.pdf`);
  };

  return (
    <Card className="dispatch-card">
      <h2 className="dispatch-title">
        <UploadOutlined /> Dispatch Cylinders
      </h2>

      <div className="dispatch-form">
        <label className="dispatch-label">Select Company:</label>
        <Select
          className="dispatch-select"
          showSearch
          optionFilterProp="children"
          onChange={setCompanyId}
          value={companyId}
        >
          {companies.map((company) => (
            <Select.Option key={company.id} value={company.id}>
              {company.name}
            </Select.Option>
          ))}
        </Select>

        <label className="dispatch-label">Select Cylinder Type:</label>
        <Select
          className="dispatch-select"
          showSearch
          optionFilterProp="children"
          onChange={setSelectedProduct}
          value={selectedProduct}
        >
          {products.map((product, index) => (
            <Select.Option key={index} value={product}>
              {product}
            </Select.Option>
          ))}
        </Select>

        <label className="dispatch-label">Enter Quantity:</label>
        <InputNumber
          className="dispatch-quantity"
          min={1}
          value={quantity}
          onChange={setQuantity}
        />

        <Button
          type="primary"
          icon={<SearchOutlined />}
          onClick={fetchAvailableCylinders}
        >
          Next
        </Button>
        <Button type="primary" icon={<ScanOutlined />} onClick={startScanner}>
          Scan QR Code
        </Button>
      </div>

      <Button
        type="primary"
        icon={<UploadOutlined />}
        onClick={handleConfirmDispatch}
      >
        Confirm Dispatch
      </Button>

      {dispatchCompleted && (
        <Button
          type="default"
          icon={<FilePdfOutlined />}
          onClick={generatePDF}
          style={{ marginTop: "10px" }}
        >
          Download Receipt
        </Button>
      )}
    </Card>
  );
};

export default Dispatch;
