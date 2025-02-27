import { useState, useEffect } from "react";
import API from "../../services/api"; // ✅ Centralized API handler
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
} from "@ant-design/icons";
import "../../styles/Dispatch.css";
import { Html5QrcodeScanner } from "html5-qrcode";

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

  // ✅ Fetch Companies
  useEffect(() => {
    API.get("/companies")
      .then((response) => {
        console.log("✅ Companies Response:", response.data);
        setCompanies(response.data);
      })
      .catch((error) => {
        console.error("❌ Error fetching companies:", error);
        message.error("Error fetching companies.");
      });
  }, []);

  // ✅ Fetch Products
  useEffect(() => {
    API.get("/products")
      .then((response) => {
        console.log("✅ Products Response:", response.data);
        setProducts(response.data);
      })
      .catch((error) => {
        console.error("❌ Error fetching products:", error);
        message.error("Error fetching products");
      });
  }, []);

  // ✅ Fetch Available Cylinders
  const fetchAvailableCylinders = async () => {
    if (!selectedProduct || !quantity) return;

    try {
      const response = await API.get(
        `/available-cylinders?product=${selectedProduct}`
      );
      console.log("✅ Available Cylinders:", response.data);
      setAvailableCylinders(response.data);
      setStep(2);
    } catch (error) {
      console.error("❌ Error fetching available cylinders:", error);
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

  // ✅ QR Code Scanner
  const handleScan = (decodedText) => {
    if (!decodedText) return;

    const serialNumber = decodedText.trim();
    console.log("🔹 Scanned QR Code:", serialNumber);

    setSelectedCylinders((prev) => {
      const updatedCylinders = [...prev, serialNumber];
      if (updatedCylinders.length >= quantity) {
        message.success("All cylinders scanned successfully!");
        setScanning(false);
        scannerInstance?.clear();
      }
      return updatedCylinders;
    });
  };

  const handleScanError = (error) => {
    console.error("QR Scan Error:", error);
    message.error("Error scanning QR code.");
  };

  const startScanner = () => {
    setScanning(true);

    setTimeout(() => {
      const scanner = new Html5QrcodeScanner("reader", {
        fps: 10,
        qrbox: { width: 300, height: 300 },
      });

      scanner.render(handleScan, handleScanError);
      setScannerInstance(scanner);
    }, 500);
  };

  // ✅ Dispatch Cylinders
  const handleConfirmDispatch = async () => {
    if (!companyId || !selectedProduct || !quantity) {
      message.error("Please select all required fields before dispatching.");
      return;
    }

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

    console.log("🚀 Dispatching Cylinders:", payload);

    try {
      await API.post("/dispatch-cylinder", payload);
      message.success("Cylinders Dispatched Successfully!");
      setStep(1);
      setSelectedCylinders([]);
      setAvailableCylinders([]);
      setCompanyId("");
      setSelectedProduct("");
      setQuantity("");
    } catch (error) {
      console.error("❌ Dispatch Error:", error.response?.data || error);
      message.error(
        `Error dispatching cylinders: ${
          error.response?.data?.error || "Unknown error"
        }`
      );
    }
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

        <div className="button-container">
          <Button
            type="primary"
            icon={<SearchOutlined />}
            className="next-button"
            onClick={fetchAvailableCylinders}
            style={{ marginRight: "10px" }}
          >
            Next
          </Button>

          <Button type="primary" icon={<ScanOutlined />} onClick={startScanner}>
            Scan QR Code
          </Button>
        </div>
      </div>

      {step === 2 && (
        <div className="cylinder-selection-container">
          <h3>Select {quantity} Cylinders:</h3>
          <Row gutter={[16, 16]}>
            {selectedCylinders.map((cylinder, index) => (
              <Col key={index} xs={24} sm={12} md={8}>
                <Checkbox checked>{cylinder}</Checkbox>
              </Col>
            ))}
          </Row>

          <Button
            type="primary"
            icon={<UploadOutlined />}
            onClick={handleConfirmDispatch}
          >
            Confirm Dispatch
          </Button>
        </div>
      )}
    </Card>
  );
};

export default Dispatch;
