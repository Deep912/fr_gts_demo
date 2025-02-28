import { useState, useEffect } from "react";
import axios from "axios";
import {
  Button,
  Card,
  Row,
  Col,
  Checkbox,
  Collapse,
  message,
  Divider,
  Typography,
} from "antd";
import { RetweetOutlined } from "@ant-design/icons";
import "../../styles/Refill.css";

const { Title, Text } = Typography;
const { Panel } = Collapse;
const SERVER_URL = import.meta.env.VITE_API_URL;

const Refill = () => {
  const [emptyCylinders, setEmptyCylinders] = useState([]);
  const [selectedCylinders, setSelectedCylinders] = useState([]);

  // ✅ Fetch Empty Cylinders (For Sending to Refill)
  useEffect(() => {
    axios
      .get(`${SERVER_URL}/empty-cylinders-grouped`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          "ngrok-skip-browser-warning": "true",
        },
      })
      .then((response) => {
        console.log("✅ Empty Cylinders:", response.data);
        setEmptyCylinders(Array.isArray(response.data) ? response.data : []);
      })
      .catch(() => message.error("Error fetching empty cylinders"));
  }, []);

  // ✅ Select/Deselect Cylinder
  const toggleSelection = (serialNumber) => {
    setSelectedCylinders((prev) =>
      prev.includes(serialNumber)
        ? prev.filter((sn) => sn !== serialNumber)
        : [...prev, serialNumber]
    );
  };

  // ✅ Send Selected Cylinders for Refill
  const handleSendForRefill = async () => {
    if (selectedCylinders.length === 0) {
      message.warning("Please select at least one cylinder to send for refill");
      return;
    }

    try {
      await axios.post(
        `${SERVER_URL}/refill-cylinder`,
        { cylinderIds: selectedCylinders },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
            "ngrok-skip-browser-warning": "true",
          },
        }
      );

      message.success("Cylinders sent for refilling!");

      // ✅ Remove sent cylinders from the list
      setEmptyCylinders(
        (prev) =>
          prev
            .map((category) => ({
              ...category,
              cylinders: category.cylinders.filter(
                (c) => !selectedCylinders.includes(c.serial_number)
              ),
            }))
            .filter((category) => category.cylinders.length > 0) // Remove empty categories
      );

      setSelectedCylinders([]);
    } catch (error) {
      message.error("Error sending cylinders for refilling");
    }
  };

  return (
    <Card className="refill-card">
      <Title
        level={3}
        className="refill-title"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
        }}
      >
        <RetweetOutlined /> Send Cylinders for Refill
      </Title>

      {/* ✅ Cylinders List (Grouped by Gas Type & Size) */}
      {emptyCylinders.length > 0 ? (
        <Collapse
          accordion
          style={{ marginTop: "16px", borderRadius: "8px", background: "#fff" }}
        >
          {emptyCylinders.map((category, index) => (
            <Panel
              key={index}
              header={
                <Text strong style={{ fontSize: "16px" }}>
                  {`${category.gas_type} - ${category.size}L`}
                </Text>
              }
              style={{ background: "#f5f5f5", borderRadius: "8px" }}
            >
              <Row gutter={[12, 12]} style={{ padding: "8px 16px" }}>
                {category.cylinders.map((cylinder) => (
                  <Col key={cylinder.serial_number} xs={12} sm={8} md={6}>
                    <Checkbox
                      checked={selectedCylinders.includes(
                        cylinder.serial_number
                      )}
                      onChange={() => toggleSelection(cylinder.serial_number)}
                      style={{
                        padding: "8px",
                        borderRadius: "6px",
                        background: selectedCylinders.includes(
                          cylinder.serial_number
                        )
                          ? "#1890ff"
                          : "#f5f5f5",
                        color: selectedCylinders.includes(
                          cylinder.serial_number
                        )
                          ? "#fff"
                          : "#333",
                        fontWeight: "bold",
                        cursor: "pointer",
                        transition: "0.3s ease",
                      }}
                    >
                      {cylinder.serial_number}
                    </Checkbox>
                  </Col>
                ))}
              </Row>
            </Panel>
          ))}
        </Collapse>
      ) : (
        <Text
          type="secondary"
          style={{
            marginTop: "20px",
            display: "block",
            textAlign: "center",
            fontSize: "16px",
          }}
        >
          No empty cylinders available for refill.
        </Text>
      )}

      <Divider />

      {/* ✅ Send for Refill Button */}
      <Button
        type="primary"
        onClick={handleSendForRefill}
        disabled={selectedCylinders.length === 0}
        style={{
          width: "100%",
          padding: "12px",
          fontSize: "16px",
          fontWeight: "bold",
          backgroundColor: "#1890ff",
          borderColor: "#1890ff",
          borderRadius: "8px",
        }}
      >
        Send for Refill
      </Button>
    </Card>
  );
};

export default Refill;
