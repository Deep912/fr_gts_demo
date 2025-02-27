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
      <Title level={3} className="refill-title">
        <RetweetOutlined /> Send Cylinders for Refill
      </Title>

      {/* ✅ Cylinders List (Grouped by Gas Type & Size) */}
      {emptyCylinders.length > 0 ? (
        <Collapse
          accordion
          items={emptyCylinders.map((category, index) => ({
            key: index.toString(),
            label: `${category.gas_type} - ${category.size}L`,
            children: (
              <Row gutter={[16, 16]} style={{ marginTop: "10px" }}>
                {category.cylinders.map((cylinder) => (
                  <Col key={cylinder.serial_number} xs={12} sm={8} md={6}>
                    <Checkbox
                      checked={selectedCylinders.includes(
                        cylinder.serial_number
                      )}
                      onChange={() => toggleSelection(cylinder.serial_number)}
                    >
                      {cylinder.serial_number}
                    </Checkbox>
                  </Col>
                ))}
              </Row>
            ),
          }))}
        />
      ) : (
        <Text type="secondary" style={{ marginTop: "20px", display: "block" }}>
          No empty cylinders available for refill.
        </Text>
      )}

      <Divider />

      {/* ✅ Send for Refill Button */}
      <Button
        type="primary"
        onClick={handleSendForRefill}
        disabled={selectedCylinders.length === 0}
        style={{ width: "100%", marginTop: "10px" }}
      >
        Send for Refill
      </Button>
    </Card>
  );
};

export default Refill;
