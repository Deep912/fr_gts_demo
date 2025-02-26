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
} from "@ant-design/icons";
import axios from "axios";
import "../styles/AdminLayout.css";

const { Header, Sider, Content } = Layout;
const { Title, Text } = Typography;

const AdminLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const username = localStorage.getItem("username") || "Admin";

  // Sidebar state for mobile
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

  // Resize listener to adjust layout on different screen sizes
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
        const [statsRes, transactionsRes, cylinderStatsRes] = await Promise.all(
          [
            axios.get("http://localhost:5000/admin/stats", {
              headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`,
              },
            }),
            axios.get("http://localhost:5000/admin/transactions", {
              headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`,
              },
            }),
            axios.get(
              "http://localhost:5000/admin/reports/cylinder-movement-summary",
              {
                headers: {
                  Authorization: `Bearer ${localStorage.getItem("token")}`,
                },
              }
            ),
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

  // Handle menu clicks (auto-collapse sidebar on mobile)
  const handleMenuClick = ({ key }) => {
    navigate(key);
    if (isMobile) setCollapsed(true);
  };

  // Logout function
  const handleLogout = () => {
    localStorage.clear();
    navigate("/", { replace: true });
    window.location.reload();
  };

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
        <div className="admin-logo">🛠️ Admin Panel</div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          onClick={handleMenuClick}
          items={[
            {
              key: "/admin/dashboard",
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
          ]}
        />
      </Sider>

      {/* Main Layout */}
      <Layout>
        <Header className="admin-header">
          <div className="header-left">
            {/* Show hamburger button in mobile mode */}
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

        <Content className="admin-content">
          {location.pathname === "/admin/dashboard" && (
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
                          title={<Text strong>{item.action}</Text>}
                          description={`Cylinder: ${
                            item.serial_number
                          } | Date: ${new Date(
                            item.timestamp
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
