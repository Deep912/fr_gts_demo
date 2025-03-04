import React, { useState } from "react";
import { Card, Form, Input, Button, Select, message } from "antd";
import axios from "axios";
import { PlusOutlined } from "@ant-design/icons";

const { Option } = Select;
const SERVER_URL = import.meta.env.VITE_API_URL;

const AdminAddUser = () => {
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();

  const onFinish = async (values) => {
    setLoading(true);
    try {
      // Send a POST request to create a new user
      const response = await axios.post(
        `${SERVER_URL}/admin/add-user`,
        values,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
      message.success("User added successfully!");
      form.resetFields();
    } catch (error) {
      console.error("Error adding user", error);
      message.error("Failed to add user.");
    }
    setLoading(false);
  };

  return (
    <Card title="Add New User" style={{ margin: "20px" }}>
      <Form form={form} layout="vertical" onFinish={onFinish}>
        <Form.Item
          name="username"
          label="Username"
          rules={[{ required: true, message: "Please enter a username" }]}
        >
          <Input placeholder="Enter username" />
        </Form.Item>
        <Form.Item
          name="password"
          label="Password"
          rules={[{ required: true, message: "Please enter a password" }]}
        >
          <Input.Password placeholder="Enter password" />
        </Form.Item>
        <Form.Item
          name="role"
          label="Role"
          rules={[{ required: true, message: "Please select a role" }]}
        >
          <Select placeholder="Select role">
            <Option value="worker">Worker</Option>
            <Option value="admin">Admin</Option>
          </Select>
        </Form.Item>
        <Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            loading={loading}
            icon={<PlusOutlined />}
          >
            Add User
          </Button>
        </Form.Item>
      </Form>
    </Card>
  );
};

export default AdminAddUser;
