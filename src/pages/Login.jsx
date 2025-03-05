import { useState } from "react";
import { Form, Input, Button, Card, message, Typography, Spin } from "antd";
import { UserOutlined, LockOutlined } from "@ant-design/icons";
import axios from "axios";
import "../styles/Login.css";

const { Title } = Typography;

const Login = () => {
  const API_URL = import.meta.env.VITE_API_URL;
  const [loading, setLoading] = useState(false);

  const handleLogin = async (values) => {
    console.log("🔹 Attempting login with:", values);
    setLoading(true);

    try {
      // Send request to API
      const response = await axios.post(`${API_URL}/login`, values);
      console.log("🔹 API Response:", response.data);

      if (response.data.token) {
        // Store authentication details in localStorage
        localStorage.setItem("token", response.data.token);
        localStorage.setItem("username", response.data.user.username);
        localStorage.setItem("role", response.data.user.role);

        console.log("✅ Token stored successfully.");
        message.success("Login successful!");

        // Redirect based on user role
        setTimeout(() => {
          if (
            response.data.user.role === "admin" ||
            response.data.user.role === "owner"
          ) {
            window.location.href = "/admin";
          } else {
            window.location.href = "/worker/";
          }
        }, 500);
      } else {
        message.error("Invalid credentials.");
      }
    } catch (error) {
      console.error("❌ Login Error:", error);
      message.error("Incorrect username or password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <Card className="login-card">
        <Title level={2} className="login-title">
          Welcome Back
        </Title>

        <Form name="login-form" onFinish={handleLogin} layout="vertical">
          <Form.Item
            name="username"
            rules={[{ required: true, message: "Enter your username" }]}
          >
            <Input
              prefix={<UserOutlined />}
              placeholder="Username"
              size="large"
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: "Enter your password" }]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="Password"
              size="large"
            />
          </Form.Item>

          <Button
            type="primary"
            htmlType="submit"
            size="large"
            className="login-button"
            loading={loading}
            block
          >
            {loading ? <Spin /> : "Login"}
          </Button>
        </Form>
      </Card>
    </div>
  );
};

export default Login;
