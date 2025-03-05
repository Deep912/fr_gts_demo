import { useState, useEffect } from "react";
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
  DashboardOutlined,
  DatabaseOutlined,
  ApartmentOutlined,
  BarChartOutlined,
  LogoutOutlined,
  UserOutlined,
  MenuOutlined,
  AuditOutlined, // Make sure this icon is available; if not, choose another appropriate icon
} from "@ant-design/icons";
import axios from "axios";
import "../styles/AdminLayout.css";

const { Header, Sider, Content } = Layout;
const { Title, Text } = Typography;
const SERVER_URL = import.meta.env.VITE_API_URL;

const AdminLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const username = localStorage.getItem("username") || "Admin";
  const role = localStorage.getItem("role"); // retrieve role from localStorage

  // Sidebar state & responsiveness
  const [collapsed, setCollapsed] = useState(window.innerWidth < 768);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [stats, setStats] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [cylinderStats, setCylinderStats] = useState(null);
  const [loading, setLoading] = useState(true);

  // Handle sidebar toggle
  const toggleSidebar = () => {
    setCollapsed(!collapsed);
  };

  // Adjust layout on window resize
  useEffect(() => {
    const handleResize = () => {
      const mobileView = window.innerWidth < 768;
      setIsMobile(mobileView);
      if (!mobileView) setCollapsed(false);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Fetch dashboard data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("token");

        const [statsRes, transactionsRes, cylinderStatsRes] = await Promise.all(
          [
            axios.get(`${SERVER_URL}/admin/stats`, {
              headers: {
                Authorization: `Bearer ${token}`,
                "ngrok-skip-browser-warning": "true",
              },
            }),
            axios.get(`${SERVER_URL}/admin/transactions`, {
              headers: {
                Authorization: `Bearer ${token}`,
                "ngrok-skip-browser-warning": "true",
              },
            }),
            axios.get(`${SERVER_URL}/admin/reports/cylinder-movement-summary`, {
              headers: {
                Authorization: `Bearer ${token}`,
                "ngrok-skip-browser-warning": "true",
              },
            }),
          ]
        );

        setStats(statsRes.data);
        setTransactions(transactionsRes.data);
        setCylinderStats(cylinderStatsRes.data);
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Handle menu clicks & collapse sidebar on mobile
  const handleMenuClick = ({ key }) => {
    navigate(key === "/admin/dashboard" ? "/admin" : key);
    if (isMobile) setCollapsed(true);
  };

  // Logout function
  const handleLogout = () => {
    localStorage.clear();
    navigate("/", { replace: true });
    window.location.reload();
  };

  // Build menu items with conditional Audit Logs item
  const menuItems = [
    {
      key: "/admin",
      icon: <DashboardOutlined />,
      label: "Dashboard",
    },
    {
      key: "/admin/cylinders",
      icon: <DatabaseOutlined />,
      label: "Cylinders",
    },
    {
      key: "/admin/companies",
      icon: <ApartmentOutlined />,
      label: "Companies",
    },
    {
      key: "/admin/reports",
      icon: <BarChartOutlined />,
      label: "Reports",
    },
    {
      key: "/admin/add-user",
      icon: <UserOutlined />,
      label: "Add User",
    },
    // Only show Audit Logs for owners
    ...(role === "owner"
      ? [
          {
            key: "/admin/audit-logs",
            icon: <AuditOutlined />,
            label: "Audit Logs",
          },
        ]
      : []),
  ];

  return (
    <Layout style={{ minHeight: "100vh" }}>
      {/* Sidebar */}
      <Sider
        collapsible
        collapsed={collapsed}
        collapsedWidth={isMobile ? 0 : 80}
        className="admin-sidebar"
        breakpoint="md"
      >
        <div
          className="admin-logo"
          onClick={() => {
            navigate("/admin");
            if (isMobile) setCollapsed(true);
          }}
          style={{
            cursor: "pointer",
            padding: "16px",
            textAlign: "center",
            fontSize: "18px",
            fontWeight: "bold",
            backgroundColor: "#001529",
            color: "#fff",
            borderBottom: "1px solid rgba(255,255,255,0.2)",
          }}
        >
          🛠️ Admin Panel
        </div>

        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          onClick={handleMenuClick}
          items={menuItems}
        />
      </Sider>

      {/* Main Layout */}
      <Layout>
        <Header className="admin-header">
          <div className="header-left">
            {/* Show sidebar toggle button in mobile mode */}
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
            <UserOutlined style={{ marginRight: "8px" }} />
            <span>Welcome, {username}</span>
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

        <Content className="admin-content">
          {location.pathname === "/admin" && (
            <>
              {/* Quick Overview Cards */}
              <Row
                gutter={[16, 16]}
                justify="center"
                style={{ marginBottom: "20px" }}
              >
                <Col xs={24} sm={12} md={6}>
                  <Card className="admin-stat-card">
                    <Title level={4}>Total Cylinders</Title>
                    <Text strong>
                      {loading ? <Spin /> : stats?.total_cylinders || 0}
                    </Text>
                  </Card>
                </Col>
                <Col xs={24} sm={12} md={6}>
                  <Card className="admin-stat-card">
                    <Title level={4}>Total Transactions</Title>
                    <Text strong>
                      {loading ? (
                        <Spin />
                      ) : (
                        cylinderStats?.total_transactions || 0
                      )}
                    </Text>
                  </Card>
                </Col>
                <Col xs={24} sm={12} md={6}>
                  <Card className="admin-stat-card">
                    <Title level={4}>Unique Cylinders Moved</Title>
                    <Text strong>
                      {loading ? (
                        <Spin />
                      ) : (
                        cylinderStats?.unique_cylinders || 0
                      )}
                    </Text>
                  </Card>
                </Col>
              </Row>

              {/* Recent Transactions */}
              <Card className="recent-transactions-card">
                <Title level={4}>Recent Cylinder Transactions</Title>
                {loading ? (
                  <Spin />
                ) : (
                  <List
                    itemLayout="horizontal"
                    dataSource={transactions.slice(0, 10)}
                    renderItem={(item) => (
                      <List.Item>
                        <List.Item.Meta
                          title={
                            <Text strong>
                              {item.action || "Unknown Action"}
                            </Text>
                          }
                          description={`Cylinder: ${
                            item.serial_number || "N/A"
                          } | Date: ${new Date(
                            item.timestamp || Date.now()
                          ).toLocaleString()}`}
                        />
                      </List.Item>
                    )}
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

export default AdminLayout;
