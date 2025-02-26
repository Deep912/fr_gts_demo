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
} from "@ant-design/icons";
import "../../styles/Dispatch.css";
import { Html5QrcodeScanner } from "html5-qrcode";

const SERVER_URL = "http://192.168.157.246:5000";

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

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) {
      message.error("Session expired. Please log in again.");
      window.location.href = "/login";
      return;
    }

    axios
      .get(`${SERVER_URL}/companies`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((response) => setCompanies(response.data))
      .catch(() => message.error("Error fetching companies."));
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("token");

    axios
      .get(`${SERVER_URL}/products`, {
        headers: { Authorization: `Bearer ${token}` },
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
          headers: { Authorization: `Bearer ${token}` },
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
    console.log("🔹 Scanned QR Code:", serialNumber);

    if (!selectedCylinders.includes(serialNumber)) {
      setSelectedCylinders((prev) => [...prev, serialNumber]);
      message.success(`Scanned: ${serialNumber}`);
    }

    // Stop scanning when the required number of QR codes is reached
    if (selectedCylinders.length + 1 >= quantity) {
      setScanning(false);
      scannerInstance?.clear();
      message.success("All cylinders scanned successfully!");
    }
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
        headers: { Authorization: `Bearer ${token}` },
      });

      message.success("Cylinders Dispatched Successfully!");
      setStep(1);
      setSelectedCylinders([]);
      setAvailableCylinders([]);
      setCompanyId("");
      setSelectedProduct("");
      setQuantity("");
    } catch (error) {
      console.error("Dispatch Error:", error.response?.data || error);
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

      {scanning && (
        <Modal
          title="Scan QR Codes"
          visible={scanning}
          onCancel={() => setScanning(false)}
          footer={null}
          width={400}
        >
          <div id="reader"></div>
          <p>
            Scanned {selectedCylinders.length} of {quantity}
          </p>
          {selectedCylinders.length < quantity && (
            <Button type="primary" onClick={startScanner}>
              Scan Next
            </Button>
          )}
        </Modal>
      )}

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
