import React, { useState, useEffect } from "react"
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Platform,
  Dimensions,
  Alert,
} from "react-native"
import { Card, Text } from "react-native-paper"
import { MaterialIcons } from "@expo/vector-icons"
import { signOut } from "firebase/auth"
import { FIREBASE_AUTH } from "../../../FirebaseConfig"
import { ApprovalService } from "../../../services/ApprovalService"
import AdminSidebar from "../../components/AdminSidebar"

const { width } = Dimensions.get("window")

const AdminDashboard = ({ navigation }: any) => {
  const [refreshing, setRefreshing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [userStats, setUserStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    drivers: 0,
    contractors: 0,
    swachhHR: 0,
    admins: 0,
    pendingApprovals: 0,
  })
  const [userName, setUserName] = useState("Administrator")
  const [sidebarVisible, setSidebarVisible] = useState(false)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    setLoading(true)
    try {
      const user = FIREBASE_AUTH.currentUser
      if (user) {
        // Get user statistics using ApprovalService
        const stats = await ApprovalService.getUserStatistics()
        setUserStats(stats)

        // Get current user name
        const users = await ApprovalService.getAllUsers()
        const currentUser = users.find(u => u.uid === user.uid)
        if (currentUser) {
          setUserName(currentUser.fullName || "Administrator")
        }
      }
    } catch (error) {
      console.log("Error fetching dashboard data:", error)
    } finally {
      setLoading(false)
    }
  }

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true)
    await fetchDashboardData()
    setRefreshing(false)
  }, [])

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          try {
            await signOut(FIREBASE_AUTH)
            navigation.replace("Login")
          } catch (error) {
            Alert.alert("Error", "Failed to logout")
          }
        },
      },
    ])
  }

  const adminActions = [
    {
      title: "User Management",
      description: "Manage users and approvals",
      screen: "UserManagement",
      icon: "people",
      color: "#3b82f6",
      bgColor: "#eff6ff",
    },
    {
      title: "Feeder Points",
      description: "Manage collection points",
      screen: "FeederPointManagement",
      icon: "location-on",
      color: "#10b981",
      bgColor: "#f0fdf4",
    },
    {
      title: "Point Assignments",
      description: "Assign points to contractors",
      screen: "FeederPointAssignment",
      icon: "assignment",
      color: "#f59e0b",
      bgColor: "#fffbeb",
    },
    {
      title: "Vehicle Management",
      description: "Register and manage vehicles",
      screen: "VehicleManagement",
      icon: "local-shipping",
      color: "#06b6d4",
      bgColor: "#ecfeff",
    },
    {
      title: "Vehicle Assignments",
      description: "Assign vehicles to contractors",
      screen: "VehicleAssignment",
      icon: "assignment-ind",
      color: "#ef4444",
      bgColor: "#fef2f2",
    },
    {
      title: "System Reports",
      description: "View system analytics",
      screen: "AdminReports",
      icon: "analytics",
      color: "#8b5cf6",
      bgColor: "#faf5ff",
    },
  ]

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <MaterialIcons name="admin-panel-settings" size={48} color="#3b82f6" />
        <Text style={styles.loadingText}>Loading Admin Dashboard...</Text>
      </View>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity
            onPress={() => setSidebarVisible(true)}
            style={styles.menuButton}
          >
            <MaterialIcons name="menu" size={24} color="#374151" />
          </TouchableOpacity>

          <View style={styles.headerLeft}>
            <View style={styles.adminBadge}>
              <MaterialIcons name="admin-panel-settings" size={24} color="#3b82f6" />
            </View>
            <View style={styles.headerText}>
              <Text style={styles.welcomeText}>Welcome back,</Text>
              <Text style={styles.userName}>{userName}</Text>
              <Text style={styles.roleText}>System Administrator</Text>
            </View>
          </View>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
            <MaterialIcons name="logout" size={20} color="#6b7280" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Statistics Overview */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>System Overview</Text>
          <View style={styles.statsGrid}>
            <Card style={styles.statCard}>
              <View style={styles.statContent}>
                <View style={[styles.statIcon, { backgroundColor: '#eff6ff' }]}>
                  <MaterialIcons name="people" size={24} color="#3b82f6" />
                </View>
                <View style={styles.statInfo}>
                  <Text style={styles.statNumber}>{userStats.totalUsers}</Text>
                  <Text style={styles.statLabel}>Total Users</Text>
                </View>
              </View>
            </Card>

            <Card style={styles.statCard}>
              <View style={styles.statContent}>
                <View style={[styles.statIcon, { backgroundColor: '#f0fdf4' }]}>
                  <MaterialIcons name="check-circle" size={24} color="#10b981" />
                </View>
                <View style={styles.statInfo}>
                  <Text style={styles.statNumber}>{userStats.activeUsers}</Text>
                  <Text style={styles.statLabel}>Active Users</Text>
                </View>
              </View>
            </Card>

            <Card style={styles.statCard}>
              <View style={styles.statContent}>
                <View style={[styles.statIcon, { backgroundColor: '#fef3c7' }]}>
                  <MaterialIcons name="local-shipping" size={24} color="#f59e0b" />
                </View>
                <View style={styles.statInfo}>
                  <Text style={styles.statNumber}>{userStats.drivers}</Text>
                  <Text style={styles.statLabel}>Drivers</Text>
                </View>
              </View>
            </Card>

            <Card style={styles.statCard}>
              <View style={styles.statContent}>
                <View style={[styles.statIcon, { backgroundColor: '#fef2f2' }]}>
                  <MaterialIcons name="pending-actions" size={24} color="#ef4444" />
                </View>
                <View style={styles.statInfo}>
                  <Text style={styles.statNumber}>{userStats.pendingApprovals}</Text>
                  <Text style={styles.statLabel}>Pending</Text>
                </View>
              </View>
            </Card>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            {adminActions.map((action, index) => (
              <TouchableOpacity
                key={index}
                onPress={() => navigation.navigate(action.screen)}
                activeOpacity={0.7}
              >
                <Card style={styles.actionCard}>
                  <View style={styles.actionContent}>
                    <View style={[styles.actionIcon, { backgroundColor: action.bgColor }]}>
                      <MaterialIcons name={action.icon as any} size={28} color={action.color} />
                    </View>
                    <View style={styles.actionInfo}>
                      <Text style={styles.actionTitle}>{action.title}</Text>
                      <Text style={styles.actionDescription}>{action.description}</Text>
                    </View>
                    <MaterialIcons name="chevron-right" size={20} color="#9ca3af" />
                  </View>
                </Card>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Role Distribution */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>User Distribution</Text>
          <Card style={styles.distributionCard}>
            <View style={styles.distributionContent}>
              <View style={styles.distributionItem}>
                <View style={styles.distributionRow}>
                  <View style={styles.distributionLabel}>
                    <View style={[styles.distributionDot, { backgroundColor: '#3b82f6' }]} />
                    <Text style={styles.distributionText}>Administrators</Text>
                  </View>
                  <Text style={styles.distributionValue}>{userStats.admins}</Text>
                </View>
              </View>

              <View style={styles.distributionItem}>
                <View style={styles.distributionRow}>
                  <View style={styles.distributionLabel}>
                    <View style={[styles.distributionDot, { backgroundColor: '#8b5cf6' }]} />
                    <Text style={styles.distributionText}>Contractors</Text>
                  </View>
                  <Text style={styles.distributionValue}>{userStats.contractors}</Text>
                </View>
              </View>

              <View style={styles.distributionItem}>
                <View style={styles.distributionRow}>
                  <View style={styles.distributionLabel}>
                    <View style={[styles.distributionDot, { backgroundColor: '#10b981' }]} />
                    <Text style={styles.distributionText}>Swachh HR</Text>
                  </View>
                  <Text style={styles.distributionValue}>{userStats.swachhHR}</Text>
                </View>
              </View>

              <View style={styles.distributionItem}>
                <View style={styles.distributionRow}>
                  <View style={styles.distributionLabel}>
                    <View style={[styles.distributionDot, { backgroundColor: '#f59e0b' }]} />
                    <Text style={styles.distributionText}>Drivers</Text>
                  </View>
                  <Text style={styles.distributionValue}>{userStats.drivers}</Text>
                </View>
              </View>
            </View>
          </Card>
        </View>
      </ScrollView>

      {/* Admin Sidebar */}
      <AdminSidebar
        navigation={navigation}
        isVisible={sidebarVisible}
        onClose={() => setSidebarVisible(false)}
        currentScreen="AdminDashboard"
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#ffffff",
  },
  loadingText: {
    fontSize: 16,
    color: "#6b7280",
    fontWeight: "500",
    marginTop: 16,
  },
  container: {
    flex: 1,
    backgroundColor: "#f9fafb",
  },
  header: {
    backgroundColor: "#ffffff",
    paddingTop: Platform.OS === "ios" ? 50 : 30,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  menuButton: {
    padding: 8,
    borderRadius: 8,
    marginRight: 12,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  adminBadge: {
    backgroundColor: "#eff6ff",
    borderRadius: 12,
    width: 48,
    height: 48,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  headerText: {
    flex: 1,
  },
  welcomeText: {
    fontSize: 14,
    color: "#6b7280",
    fontWeight: "500",
  },
  userName: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
    marginTop: 2,
  },
  roleText: {
    fontSize: 12,
    color: "#9ca3af",
    fontWeight: "500",
    marginTop: 2,
  },
  logoutButton: {
    padding: 8,
    borderRadius: 8,
  },
  content: {
    flex: 1,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 16,
  },
  // Statistics styles
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  statCard: {
    width: (width - 60) / 2,
    marginBottom: 16,
    borderRadius: 12,
    backgroundColor: "#ffffff",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  statContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  statInfo: {
    flex: 1,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 14,
    color: "#6b7280",
    fontWeight: "500",
  },
  // Actions styles
  actionsGrid: {
    gap: 12,
  },
  actionCard: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  actionContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  actionInfo: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 2,
  },
  actionDescription: {
    fontSize: 14,
    color: "#6b7280",
  },
  // Distribution styles
  distributionCard: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  distributionContent: {
    padding: 20,
  },
  distributionItem: {
    marginBottom: 16,
  },
  distributionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  distributionLabel: {
    flexDirection: "row",
    alignItems: "center",
  },
  distributionDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  distributionText: {
    fontSize: 14,
    color: "#374151",
    fontWeight: "500",
  },
  distributionValue: {
    fontSize: 16,
    color: "#111827",
    fontWeight: "600",
  },
})

export default AdminDashboard
