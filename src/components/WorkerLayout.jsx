import { useState, useEffect, useMemo } from "react";
import {
  Layout,
  Menu,
  Button,
  Row,
  Col,
  Card,
  Typography,
  List,
  Spin,
} from "antd";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import {
  UploadOutlined,
  DownloadOutlined,
  RetweetOutlined,
  LogoutOutlined,
  UserOutlined,
  CheckOutlined,
  MenuOutlined,
} from "@ant-design/icons";
import axios from "axios";
import "../styles/WorkerLayout.css";

const { Header, Sider, Content } = Layout;
const { Title, Text } = Typography;
const API_URL = import.meta.env.VITE_API_URL;

const WorkerLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const username = localStorage.getItem("username") || "Worker";

  // Sidebar state for mobile
  const [collapsed, setCollapsed] = useState(window.innerWidth < 768);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Handle sidebar toggle
  const toggleSidebar = () => setCollapsed((prev) => !prev);

  // Handle Worker Panel click (navigate + toggle sidebar)
  const handleWorkerPanelClick = () => {
    navigate("/worker/");
    if (isMobile) toggleSidebar();
  };

  // Resize listener to adjust layout on different screen sizes
  useEffect(() => {
    const handleResize = () => {
      const mobileView = window.innerWidth < 768;
      setIsMobile(mobileView);
      if (!mobileView) setCollapsed(false); // Keep sidebar open on desktop
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Fetch recent transactions once on mount
  useEffect(() => {
    axios
      .get(`${API_URL}/worker/transactions`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          "ngrok-skip-browser-warning": "true",
        },
      })
      .then((response) => {
        if (Array.isArray(response.data)) {
          setTransactions(response.data);
        } else {
          console.error("Invalid data format received:", response.data);
          setTransactions([]);
        }
      })
      .catch(() => console.error("Error fetching transactions"))
      .finally(() => setLoading(false));
  }, []);

  // Memoized check to avoid unnecessary re-renders
  const isWorkerHome = useMemo(
    () => location.pathname === "/worker/",
    [location.pathname]
  );

  // Memoized transaction rendering function
  const renderTransactionItem = (item) => (
    <List.Item>
      <List.Item.Meta
        avatar={<CheckOutlined />}
        title={
          <Text strong>
            {item.action
              ? item.action.charAt(0).toUpperCase() + item.action.slice(1)
              : "Unknown Action"}
          </Text>
        }
        description={`Cylinder ID: ${item.cylinder_id || "N/A"} | Company: ${
          item.company_name || "Unknown"
        } | ${new Date(item.timestamp || Date.now()).toLocaleString()}`}
      />
    </List.Item>
  );

  // Logout function
  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    localStorage.removeItem("role");

    setTimeout(() => {
      window.location.href = "/";
    }, 100);
  };

  return (
    <Layout style={{ minHeight: "100vh" }}>
      {/* Sidebar */}
      <Sider
        collapsible
        collapsed={collapsed}
        collapsedWidth={isMobile ? 0 : 80}
        className="worker-sidebar"
        breakpoint="md"
      >
        {/* Clickable Worker Panel Logo (Navigates & Toggles Sidebar) */}
        <div
          className="worker-logo"
          onClick={handleWorkerPanelClick}
          style={{
            cursor: "pointer",
            textAlign: "center",
            padding: "12px 0",
            fontWeight: "bold",
            fontSize: "16px",
          }}
        >
          🚀 Worker Panel
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          onClick={({ key }) => {
            navigate(key);
            if (isMobile) toggleSidebar();
          }}
          items={[
            {
              key: "/worker/dispatch",
              icon: <UploadOutlined />,
              label: "Dispatch Cylinders",
            },
            {
              key: "/worker/receive",
              icon: <DownloadOutlined />,
              label: "Receive Cylinders",
            },
            {
              key: "/worker/refill",
              icon: <RetweetOutlined />,
              label: "Refill Cylinders",
            },
            {
              key: "/worker/complete-refill",
              icon: <CheckOutlined />,
              label: "Complete Refill",
            },
          ]}
        />
      </Sider>

      {/* Main Layout */}
      <Layout>
        <Header className="worker-header">
          <div className="header-left">
            {/* Show menu button in mobile mode */}
            {isMobile && (
              <Button
                type="text"
                icon={<MenuOutlined />}
                onClick={toggleSidebar}
                style={{
                  fontSize: "18px",
                  marginRight: "10px",
                  backgroundColor: "white",
                  border: "1px solid #ccc",
                  padding: "5px 10px",
                  borderRadius: "5px",
                }}
              />
            )}
            <UserOutlined /> <span>Welcome, {username}</span>
          </div>
          <Button
            type="primary"
            danger
            icon={<LogoutOutlined />}
            onClick={handleLogout}
          >
            Logout
          </Button>
        </Header>

        <Content className="worker-content">
          {isWorkerHome && (
            <>
              {/* Quick Action Cards */}
              <Row
                gutter={[16, 16]}
                justify="center"
                style={{ marginBottom: "20px" }}
              >
                <Col xs={24} sm={8}>
                  <Card
                    hoverable
                    className="worker-small-card"
                    onClick={() => navigate("/worker/dispatch")}
                  >
                    <UploadOutlined className="small-card-icon" />
                    <h3>Dispatch Cylinders</h3>
                  </Card>
                </Col>
                <Col xs={24} sm={8}>
                  <Card
                    hoverable
                    className="worker-small-card"
                    onClick={() => navigate("/worker/receive")}
                  >
                    <DownloadOutlined className="small-card-icon" />
                    <h3>Receive Cylinders</h3>
                  </Card>
                </Col>
                <Col xs={24} sm={8}>
                  <Card
                    hoverable
                    className="worker-small-card"
                    onClick={() => navigate("/worker/refill")}
                  >
                    <RetweetOutlined className="small-card-icon" />
                    <h3>Refill Cylinders</h3>
                  </Card>
                </Col>
              </Row>

              {/* Recent Transactions */}
              <Card className="recent-transactions-card">
                <Title level={4}>Recent Transactions</Title>
                {loading ? (
                  <Spin />
                ) : (
                  <List
                    itemLayout="horizontal"
                    dataSource={transactions}
                    renderItem={renderTransactionItem}
                  />
                )}
              </Card>
            </>
          )}

          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
};
//comment
export default WorkerLayout;
