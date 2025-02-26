import { useState, useEffect } from "react";
import {
  Card,
  Table,
  Button,
  Select,
  Modal,
  Form,
  Input,
  message,
  Switch,
} from "antd";
import axios from "axios";
import {
  PlusOutlined,
  DeleteOutlined,
  EyeInvisibleOutlined,
  SyncOutlined,
} from "@ant-design/icons";

const { Option } = Select;

const Cylinders = () => {
  const [cylinders, setCylinders] = useState([]);
  const [deletedCylinders, setDeletedCylinders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [showDeleted, setShowDeleted] = useState(false);

  // 🔹 Modal States
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [cylinderId, setCylinderId] = useState("");

  // 🔹 Fetch Active and Deleted Cylinders
  useEffect(() => {
    loadCylinders();
    loadDeletedCylinders();
  }, []);

  const loadCylinders = () => {
    setLoading(true);
    axios
      .get("http://localhost:5000/admin/cylinders", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      })
      .then((response) => setCylinders(response.data))
      .catch(() => message.error("Error fetching cylinders"))
      .finally(() => setLoading(false));
  };

  const loadDeletedCylinders = () => {
    setLoading(true);
    axios
      .get("http://localhost:5000/admin/deleted-cylinders", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      })
      .then((response) => setDeletedCylinders(response.data))
      .catch(() => message.error("Error fetching deleted cylinders"))
      .finally(() => setLoading(false));
  };

  const handleDelete = (serial_number) => {
    console.log("Deleting Cylinder:", serial_number); // Debugging

    axios
      .post(
        "http://localhost:5000/admin/delete-cylinder",
        { serial_number },
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }
      )
      .then(() => {
        message.success("Cylinder moved to deleted records.");
        loadCylinders(); // Refresh active cylinders
        loadDeletedCylinders(); // Refresh deleted cylinders
      })
      .catch((error) => {
        console.error("Failed to delete cylinder:", error.response?.data);
        message.error("Failed to delete cylinder.");
      });
  };

  const handleRestore = (serial_number) => {
    console.log("Restoring Cylinder:", serial_number); // Debugging log

    axios
      .post(
        "http://localhost:5000/admin/restore-cylinder",
        { serial_number },
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }
      )
      .then(() => {
        message.success("Cylinder restored successfully.");
        loadCylinders(); // Refresh active cylinders
        loadDeletedCylinders(); // Refresh deleted cylinders
      })
      .catch((error) => {
        console.error("Failed to restore cylinder:", error.response?.data);
        message.error("Failed to restore cylinder.");
      });
  };
  const handleChangeStatus = (serial_number, status) => {
    console.log(`Updating status for ${serial_number} to ${status}`); // Debugging

    axios
      .post(
        "http://localhost:5000/admin/update-cylinder-status",
        { serial_number, status },
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }
      )
      .then(() => {
        message.success("Cylinder status updated.");
        loadCylinders(); // Refresh the list after update
      })
      .catch((error) => {
        console.error("Failed to update status:", error.response?.data);
        message.error("Failed to update status.");
      });
  };

  // 🔹 Generate Cylinder ID
  const generateCylinderId = async () => {
    try {
      const response = await axios.get(
        "http://localhost:5000/admin/generate-cylinder-id",
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }
      );
      setCylinderId(response.data.new_id);
      form.setFieldsValue({ serial_number: response.data.new_id }); // ✅ Set form value
    } catch (error) {
      message.error("Error generating cylinder ID");
    }
  };

  // 🔹 Add Cylinder
  const handleAddCylinder = (values) => {
    console.log("Submitting Cylinder:", values); // ✅ Debugging log

    axios
      .post("http://localhost:5000/admin/add-cylinder", values, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      })
      .then(() => {
        message.success("Cylinder added successfully!");
        setIsModalVisible(false);
        form.resetFields();
        loadCylinders();
      })
      .catch((error) => {
        console.error("Failed to add cylinder:", error.response?.data);
        message.error("Failed to add cylinder.");
      });
  };

  return (
    <Card
      title="Cylinders Management"
      extra={
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setIsModalVisible(true)}
        >
          Add Cylinder
        </Button>
      }
    >
      {/* Filter & Toggle Buttons */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 10,
        }}
      >
        {!showDeleted && (
          <Select
            placeholder="Filter by status"
            onChange={(value) => setStatusFilter(value)}
            allowClear
            style={{ width: 200 }}
          >
            <Option value="">All</Option>
            <Option value="available">Available</Option>
            <Option value="dispatched">Dispatched</Option>
            <Option value="empty">Empty</Option>
            <Option value="refilling">Refilling</Option>
          </Select>
        )}

        <Switch
          checked={showDeleted}
          onChange={(checked) => setShowDeleted(checked)}
          checkedChildren="Show Deleted"
          unCheckedChildren="Show Active"
          style={{ marginLeft: "auto" }}
        />
      </div>

      {/* Cylinders Table */}
      <Table
        dataSource={showDeleted ? deletedCylinders : cylinders}
        loading={loading}
        rowKey="serial_number"
        columns={[
          {
            title: "Serial Number",
            dataIndex: "serial_number",
            key: "serial_number",
          },
          {
            title: "Gas Type",
            dataIndex: "gas_type",
            key: "gas_type",
          },
          {
            title: "Size (L)",
            dataIndex: "size",
            key: "size",
          },
          ...(showDeleted
            ? [
                {
                  title: "Deleted By",
                  dataIndex: "deleted_by",
                  key: "deleted_by",
                },
                {
                  title: "Deleted On",
                  dataIndex: "deleted_at",
                  key: "deleted_at",
                },
                {
                  title: "Actions",
                  key: "actions",
                  render: (_, record) => (
                    <Button
                      icon={<SyncOutlined />}
                      type="primary"
                      onClick={() => handleRestore(record.serial_number)}
                    >
                      Restore
                    </Button>
                  ),
                },
              ]
            : [
                {
                  title: "Status",
                  dataIndex: "status",
                  key: "status",
                  render: (text, record) => (
                    <Select
                      value={text}
                      onChange={(value) =>
                        handleChangeStatus(record.serial_number, value)
                      }
                      style={{ width: 120 }}
                    >
                      <Option value="available">Available</Option>
                      <Option value="dispatched">Dispatched</Option>
                      <Option value="empty">Empty</Option>
                      <Option value="refilling">Refilling</Option>
                    </Select>
                  ),
                },
                {
                  title: "Actions",
                  key: "actions",
                  render: (_, record) => (
                    <Button
                      type="primary"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={() => handleDelete(record.serial_number)}
                    />
                  ),
                },
              ]),
        ]}
      />

      {/* Add Cylinder Modal */}
      <Modal
        title="Add New Cylinder"
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        footer={null}
      >
        <Form form={form} layout="vertical" onFinish={handleAddCylinder}>
          {/* Cylinder ID */}
          <Form.Item
            label="Cylinder ID"
            name="serial_number"
            rules={[
              { required: true, message: "Enter or generate a cylinder ID" },
            ]}
          >
            <Input
              value={cylinderId}
              onChange={(e) => {
                setCylinderId(e.target.value);
                form.setFieldsValue({ serial_number: e.target.value });
              }}
              addonAfter={
                <Button type="primary" onClick={generateCylinderId}>
                  Generate ID
                </Button>
              }
            />
          </Form.Item>

          {/* Gas Type */}
          <Form.Item
            label="Gas Type"
            name="gas_type"
            rules={[{ required: true }]}
          >
            <Select>
              <Option value="oxygen">Oxygen</Option>
              <Option value="propane">Propane</Option>
              <Option value="helium">Helium</Option>
            </Select>
          </Form.Item>

          <Form.Item label="Status" name="status" rules={[{ required: true }]}>
            <Select>
              <Option value="available">Available</Option>
              <Option value="empty">Empty</Option>
              <Option value="refilling">Refilling</Option>
            </Select>
          </Form.Item>

          {/* Size */}
          <Form.Item label="Size (L)" name="size" rules={[{ required: true }]}>
            <Select>
              <Option value={10}>10L</Option>
              <Option value={20}>20L</Option>
              <Option value={30}>30L</Option>
              <Option value={50}>50L</Option>
              <Option value={100}>100L</Option>
            </Select>
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit">
              Add Cylinder
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};

export default Cylinders;
