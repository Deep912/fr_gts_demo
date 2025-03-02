import { useState, useEffect, useCallback } from "react";
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
  Spin,
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
  const [selectedCylinders, setSelectedCylinders] = useState(new Set());
  const [notEmptyCylinders, setNotEmptyCylinders] = useState(new Set());
  const [scanning, setScanning] = useState(false);
  const [scannerInstance, setScannerInstance] = useState(null);
  const [currentScan, setCurrentScan] = useState(null);
  const [loading, setLoading] = useState({
    companies: false,
    cylinders: false,
    submitting: false,
  });

  // Fetch Companies with loading state and cancellation
  const fetchCompanies = useCallback(async () => {
    setLoading((prev) => ({ ...prev, companies: true }));
    try {
      const response = await axios.get(`${SERVER_URL}/companies`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          "ngrok-skip-browser-warning": "true",
        },
        cancelToken: axios.CancelToken.source().token,
      });
      setCompanies(response.data);
    } catch (error) {
      if (!axios.isCancel(error)) {
        message.error(
          error.response?.data?.message || "Error fetching companies"
        );
      }
    } finally {
      setLoading((prev) => ({ ...prev, companies: false }));
    }
  }, []);

  // Fetch Dispatched Cylinders with loading state and cancellation
  const fetchDispatchedCylinders = useCallback(async () => {
    if (!companyId) return;

    setLoading((prev) => ({ ...prev, cylinders: true }));
    try {
      const response = await axios.get(
        `${SERVER_URL}/dispatched-cylinders?companyId=${companyId}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
            "ngrok-skip-browser-warning": "true",
          },
          cancelToken: axios.CancelToken.source().token,
        }
      );
      setDispatchedCylinders(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      if (!axios.isCancel(error)) {
        message.error(
          error.response?.data?.message || "Error fetching cylinders"
        );
      }
    } finally {
      setLoading((prev) => ({ ...prev, cylinders: false }));
    }
  }, [companyId]);

  // Scanner management with proper cleanup
  const initializeScanner = useCallback(() => {
    const scanner = new Html5QrcodeScanner("reader", {
      fps: 10,
      qrbox: { width: 300, height: 300 },
    });

    const scanSuccess = (decodedText) => {
      const serialNumber = decodedText.trim();
      if (!selectedCylinders.has(serialNumber)) {
        setCurrentScan(serialNumber);
        scanner.clear();
      }
    };

    const scanError = (error) => {
      console.error("QR Scan Error:", error);
      message.error("Error scanning QR code. Please try again.");
    };

    scanner.render(scanSuccess, scanError);
    setScannerInstance(scanner);
  }, [selectedCylinders]);

  // Scanner lifecycle management
  useEffect(() => {
    if (scanning) {
      initializeScanner();
    }

    return () => {
      if (scannerInstance) {
        scannerInstance.clear().catch((error) => {
          console.error("Failed to clear scanner:", error);
        });
      }
    };
  }, [scanning, initializeScanner]);

  // Handle scan confirmation
  const handleAcceptScan = useCallback(() => {
    if (!currentScan) return;

    const isValidCylinder = dispatchedCylinders.some(
      (cyl) => cyl.serial_number === currentScan
    );

    if (!isValidCylinder) {
      message.error("Scanned cylinder not found in dispatched list");
      setCurrentScan(null);
      return;
    }

    setSelectedCylinders((prev) => new Set([...prev, currentScan]));
    setCurrentScan(null);
    initializeScanner();
  }, [currentScan, dispatchedCylinders, initializeScanner]);

  // Confirm receive handler with loading state
  const handleConfirmReceive = async () => {
    if (selectedCylinders.size === 0) {
      message.warning("Please select at least one cylinder");
      return;
    }

    setLoading((prev) => ({ ...prev, submitting: true }));
    try {
      await axios.post(
        `${SERVER_URL}/receive-cylinder`,
        {
          emptySerialNumbers: [...selectedCylinders].filter(
            (sn) => !notEmptyCylinders.has(sn)
          ),
          filledSerialNumbers: [...notEmptyCylinders],
          companyId,
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
            "ngrok-skip-browser-warning": "true",
          },
        }
      );

      message.success("Cylinders received successfully!");
      setDispatchedCylinders((prev) =>
        prev.filter((cyl) => !selectedCylinders.has(cyl.serial_number))
      );
      setSelectedCylinders(new Set());
      setNotEmptyCylinders(new Set());
    } catch (error) {
      message.error(
        error.response?.data?.message || "Error receiving cylinders"
      );
    } finally {
      setLoading((prev) => ({ ...prev, submitting: false }));
    }
  };

  return (
    <Card className="receive-card">
      <Title level={3} className="receive-title">
        Receive Cylinders
      </Title>

      <Spin spinning={loading.companies} tip="Loading companies...">
        <Select
          className="receive-select"
          placeholder="Select Company..."
          showSearch
          optionFilterProp="children"
          onChange={setCompanyId}
          value={companyId}
          loading={loading.companies}
          disabled={loading.companies}
          filterOption={(input, option) =>
            option.children.toLowerCase().includes(input.toLowerCase())
          }
        >
          {companies.map((company) => (
            <Select.Option key={company.id} value={company.id}>
              {company.name}
            </Select.Option>
          ))}
        </Select>
      </Spin>

      <Button
        type="primary"
        icon={<ScanOutlined />}
        onClick={() => setScanning(true)}
        loading={loading.cylinders}
        style={{ margin: "16px 0" }}
        block
      >
        Scan QR Code
      </Button>

      <Modal
        title="Scan Cylinder QR Code"
        visible={scanning}
        onCancel={() => setScanning(false)}
        footer={null}
        destroyOnClose
      >
        <div id="reader" style={{ position: "relative" }} />
        {currentScan && (
          <div style={{ textAlign: "center", marginTop: 16 }}>
            <Text strong>Scanned Cylinder:</Text>
            <Text code block style={{ fontSize: 18, margin: 8 }}>
              {currentScan}
            </Text>
            <Button
              type="primary"
              onClick={handleAcceptScan}
              style={{ marginRight: 8 }}
            >
              Confirm
            </Button>
            <Button onClick={() => setCurrentScan(null)}>Cancel</Button>
          </div>
        )}
      </Modal>

      <Divider />

      <Spin spinning={loading.cylinders} tip="Loading cylinders...">
        <Row gutter={[16, 16]}>
          {dispatchedCylinders.map((cylinder) => (
            <Col key={cylinder.serial_number} xs={24} sm={12} md={8}>
              <Card
                className={`cylinder-card ${
                  selectedCylinders.has(cylinder.serial_number)
                    ? "selected"
                    : ""
                }`}
                onClick={() => {
                  setSelectedCylinders((prev) => {
                    const next = new Set(prev);
                    if (next.has(cylinder.serial_number)) {
                      next.delete(cylinder.serial_number);
                    } else {
                      next.add(cylinder.serial_number);
                    }
                    return next;
                  });
                }}
                hoverable
              >
                <Text strong>{cylinder.serial_number}</Text>
                <div style={{ marginTop: 8 }}>
                  <Switch
                    checked={notEmptyCylinders.has(cylinder.serial_number)}
                    onChange={(checked) => {
                      setNotEmptyCylinders((prev) => {
                        const next = new Set(prev);
                        if (checked) {
                          next.add(cylinder.serial_number);
                        } else {
                          next.delete(cylinder.serial_number);
                        }
                        return next;
                      });
                    }}
                    aria-label={`Mark ${cylinder.serial_number} as not empty`}
                  />
                  <Text type="secondary" style={{ marginLeft: 8 }}>
                    {notEmptyCylinders.has(cylinder.serial_number)
                      ? "Not Empty"
                      : "Empty"}
                  </Text>
                </div>
              </Card>
            </Col>
          ))}
        </Row>
      </Spin>

      <Divider />

      <Button
        type="primary"
        icon={<DownloadOutlined />}
        onClick={handleConfirmReceive}
        loading={loading.submitting}
        disabled={selectedCylinders.size === 0}
        block
        size="large"
      >
        {loading.submitting
          ? "Processing..."
          : `Confirm Receive (${selectedCylinders.size})`}
      </Button>
    </Card>
  );
};

export default Receive;
