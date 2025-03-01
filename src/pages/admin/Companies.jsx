import { useState, useEffect } from "react";
import { Card, Table, Button, Modal, Form, Input, message, Switch } from "antd";
import axios from "axios";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  UndoOutlined,
} from "@ant-design/icons";

const SERVER_URL = import.meta.env.VITE_API_URL;

const Companies = () => {
  const [companies, setCompanies] = useState([]);
  const [deletedCompanies, setDeletedCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDeleted, setShowDeleted] = useState(false);

  // 🔹 Modal States
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editCompany, setEditCompany] = useState(null);
  const [form] = Form.useForm();

  // 🔹 Fetch Active and Deleted Companies
  useEffect(() => {
    loadCompanies();
    loadDeletedCompanies();
  }, []);

  const loadCompanies = () => {
    setLoading(true);
    axios
      .get(`${SERVER_URL}/admin/companies`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          "ngrok-skip-browser-warning": "true",
        },
      })
      .then((response) => setCompanies(response.data))
      .catch(() => message.error("Error fetching companies"))
      .finally(() => setLoading(false));
  };

  const loadDeletedCompanies = () => {
    setLoading(true);
    axios
      .get(`${SERVER_URL}/admin/deleted-companies`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          "ngrok-skip-browser-warning": "true",
        },
      })
      .then((response) => setDeletedCompanies(response.data))
      .catch(() => message.error("Error fetching deleted companies"))
      .finally(() => setLoading(false));
  };

  // 🔹 Add or Update Company
  const handleSaveCompany = (values) => {
    if (editCompany) {
      // Update existing company
      axios
        .put(`${SERVER_URL}/admin/update-company/${editCompany.id}`, values, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
            "ngrok-skip-browser-warning": "true",
          },
        })
        .then(() => {
          message.success("Company updated successfully!");
          setIsModalVisible(false);
          form.resetFields();
          loadCompanies();
        })
        .catch(() => message.error("Failed to update company."));
    } else {
      // Add new company
      axios
        .post(`${SERVER_URL}/admin/add-company`, values, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
            "ngrok-skip-browser-warning": "true",
          },
        })
        .then(() => {
          message.success("Company added successfully!");
          setIsModalVisible(false);
          form.resetFields();
          loadCompanies();
        })
        .catch(() => message.error("Failed to add company."));
    }
  };

  // 🔹 Delete (Soft Delete) Company
  const handleDelete = (id) => {
    axios
      .post(
        `${SERVER_URL}/admin/delete-company`,
        { id },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
            "ngrok-skip-browser-warning": "true",
          },
        }
      )
      .then(() => {
        message.success("Company moved to deleted records.");
        loadCompanies();
        loadDeletedCompanies();
      })
      .catch(() => message.error("Failed to delete company."));
  };

  // 🔹 Restore Deleted Company
  const handleRecover = (id) => {
    axios
      .post(
        `${SERVER_URL}/admin/recover-company`,
        { id },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
            "ngrok-skip-browser-warning": "true",
          },
        }
      )
      .then(() => {
        message.success("Company restored successfully!");
        loadCompanies();
        loadDeletedCompanies();
      })
      .catch(() => message.error("Failed to recover company."));
  };

  return (
    <Card
      title="Company Management"
      extra={
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => {
            setEditCompany(null);
            form.resetFields();
            setIsModalVisible(true);
          }}
        >
          Add Company
        </Button>
      }
    >
      {/* Toggle Active / Deleted Companies */}
      <div
        style={{
          marginBottom: 10,
          display: "flex",
          justifyContent: "space-between",
        }}
      >
        <Switch
          checked={showDeleted}
          onChange={(checked) => setShowDeleted(checked)}
          checkedChildren="Show Deleted"
          unCheckedChildren="Show Active"
        />
      </div>

      {/* Companies Table */}
      <Table
        dataSource={showDeleted ? deletedCompanies : companies}
        loading={loading}
        rowKey="id"
        columns={[
          {
            title: "Company Name",
            dataIndex: "name",
            key: "name",
          },
          {
            title: "Address",
            dataIndex: "address",
            key: "address",
          },
          {
            title: "Contact",
            dataIndex: "contact",
            key: "contact",
          },
          showDeleted
            ? {
                title: "Actions",
                key: "actions",
                render: (_, record) => (
                  <Button
                    type="default"
                    icon={<UndoOutlined />}
                    onClick={() => handleRecover(record.id)}
                  >
                    Restore
                  </Button>
                ),
              }
            : {
                title: "Actions",
                key: "actions",
                render: (_, record) => (
                  <>
                    <Button
                      icon={<EditOutlined />}
                      onClick={() => {
                        setEditCompany(record);
                        form.setFieldsValue(record);
                        setIsModalVisible(true);
                      }}
                      style={{ marginRight: 8 }}
                    />
                    <Button
                      type="primary"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={() => handleDelete(record.id)}
                    />
                  </>
                ),
              },
        ]}
      />

      {/* Add/Edit Company Modal */}
      <Modal
        title={editCompany ? "Edit Company" : "Add New Company"}
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        footer={null}
      >
        <Form form={form} layout="vertical" onFinish={handleSaveCompany}>
          <Form.Item
            label="Company Name"
            name="name"
            rules={[{ required: true, message: "Please enter company name" }]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            label="Address"
            name="address"
            rules={[
              { required: true, message: "Please enter company address" },
            ]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            label="Contact"
            name="contact"
            rules={[
              { required: true, message: "Please enter contact details" },
            ]}
          >
            <Input />
          </Form.Item>

          <Button type="primary" htmlType="submit">
            {editCompany ? "Update Company" : "Add Company"}
          </Button>
        </Form>
      </Modal>
    </Card>
  );
};

export default Companies;
