import React, { useState, useEffect } from 'react';
import {
    View,
    StyleSheet,
    ScrollView,
    RefreshControl,
    TouchableOpacity,
    Alert,
    Modal,
    TextInput,
    Dimensions,
    StatusBar,
    Platform
} from 'react-native';
import { Text, Card } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import {
    collection,
    getDocs,
    query,
    where,
    orderBy,
    doc,
    updateDoc,
    deleteDoc,
    addDoc,
    setDoc
} from 'firebase/firestore';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { FIREBASE_AUTH, FIRESTORE_DB } from '../../../FirebaseConfig';
import { ApprovalService } from '../../../services/ApprovalService';

const { width, height } = Dimensions.get('window');

interface User {
    id: string;
    fullName: string;
    email: string;
    phone: string;
    role: string;
    isActive: boolean;
    createdAt: string;
}

interface ApprovalRequest {
    id: string;
    fullName: string;
    email: string;
    phone: string;
    role: string;
    password: string;
    requestedAt: string;
    status: string;
    approver: string;
    approverType: string;
}

const UserManagement = ({ navigation }: any) => {
    const [refreshing, setRefreshing] = useState(false);
    const [loading, setLoading] = useState(true);
    const [users, setUsers] = useState<User[]>([]);
    const [approvalRequests, setApprovalRequests] = useState<ApprovalRequest[]>([]);
    const [selectedTab, setSelectedTab] = useState('overview');
    const [userStats, setUserStats] = useState({
        totalUsers: 0,
        activeUsers: 0,
        drivers: 0,
        contractors: 0,
        swachhHR: 0,
        admins: 0,
        pendingApprovals: 0
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            await Promise.all([
                fetchUsers(),
                fetchApprovalRequests()
            ]);
        } catch (error) {
            console.error('Error fetching data:', error);
            Alert.alert('Error', 'Failed to fetch data');
        } finally {
            setLoading(false);
        }
    };

    const fetchUsers = async () => {
        try {
            const usersQuery = query(
                collection(FIRESTORE_DB, 'users'),
                orderBy('createdAt', 'desc')
            );
            const usersSnapshot = await getDocs(usersQuery);
            const usersList = usersSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as User[];

            setUsers(usersList);
            
            // Calculate stats
            const stats = {
                totalUsers: usersList.length,
                activeUsers: usersList.filter(u => u.isActive).length,
                drivers: usersList.filter(u => u.role === 'driver').length,
                contractors: usersList.filter(u => u.role === 'transport_contractor').length,
                swachhHR: usersList.filter(u => u.role === 'swachh_hr').length,
                admins: usersList.filter(u => u.role === 'admin').length,
                pendingApprovals: 0 // Will be updated when fetching approval requests
            };
            
            setUserStats(prev => ({ ...prev, ...stats }));
        } catch (error) {
            console.error('Error fetching users:', error);
        }
    };

    const fetchApprovalRequests = async () => {
        try {
            const requestsList = await ApprovalService.getAdminApprovalRequests();
            setApprovalRequests(requestsList);
            setUserStats(prev => ({ ...prev, pendingApprovals: requestsList.length }));
        } catch (error) {
            console.error('Error fetching approval requests:', error);
        }
    };

    const handleApproveRequest = async (request: ApprovalRequest) => {
        try {
            const currentUser = FIREBASE_AUTH.currentUser;
            if (!currentUser) {
                Alert.alert('Error', 'You must be logged in to approve requests');
                return;
            }

            await ApprovalService.approveRequest(request.id!, currentUser.uid);
            Alert.alert('Success', `${request.fullName}'s account has been approved and created.`);
            fetchData();
        } catch (error) {
            console.error('Error approving request:', error);
            Alert.alert('Error', 'Failed to approve request');
        }
    };

    const handleRejectRequest = async (request: ApprovalRequest) => {
        Alert.alert(
            'Reject Request',
            `Are you sure you want to reject ${request.fullName}'s registration request?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Reject',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const currentUser = FIREBASE_AUTH.currentUser;
                            if (!currentUser) {
                                Alert.alert('Error', 'You must be logged in to reject requests');
                                return;
                            }

                            await ApprovalService.rejectRequest(request.id!, currentUser.uid);
                            Alert.alert('Success', 'Request has been rejected.');
                            fetchData();
                        } catch (error) {
                            console.error('Error rejecting request:', error);
                            Alert.alert('Error', 'Failed to reject request');
                        }
                    }
                }
            ]
        );
    };

    const toggleUserStatus = async (user: User) => {
        try {
            await updateDoc(doc(FIRESTORE_DB, 'users', user.id), {
                isActive: !user.isActive,
                updatedAt: new Date().toISOString()
            });
            Alert.alert('Success', `User ${user.isActive ? 'deactivated' : 'activated'} successfully.`);
            fetchUsers();
        } catch (error) {
            console.error('Error updating user status:', error);
            Alert.alert('Error', 'Failed to update user status');
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchData();
        setRefreshing(false);
    };

    const renderOverviewTab = () => (
        <View style={styles.tabContent}>
            <View style={styles.statsGrid}>
                <Card style={styles.statCard}>
                    <LinearGradient colors={['#3b82f6', '#1d4ed8']} style={styles.statGradient}>
                        <MaterialIcons name="people" size={32} color="#fff" />
                        <Text style={styles.statNumber}>{userStats.totalUsers}</Text>
                        <Text style={styles.statLabel}>Total Users</Text>
                    </LinearGradient>
                </Card>

                <Card style={styles.statCard}>
                    <LinearGradient colors={['#10b981', '#059669']} style={styles.statGradient}>
                        <MaterialIcons name="check-circle" size={32} color="#fff" />
                        <Text style={styles.statNumber}>{userStats.activeUsers}</Text>
                        <Text style={styles.statLabel}>Active Users</Text>
                    </LinearGradient>
                </Card>

                <Card style={styles.statCard}>
                    <LinearGradient colors={['#f59e0b', '#d97706']} style={styles.statGradient}>
                        <MaterialIcons name="local-shipping" size={32} color="#fff" />
                        <Text style={styles.statNumber}>{userStats.drivers}</Text>
                        <Text style={styles.statLabel}>Drivers</Text>
                    </LinearGradient>
                </Card>

                <Card style={styles.statCard}>
                    <LinearGradient colors={['#8b5cf6', '#7c3aed']} style={styles.statGradient}>
                        <MaterialIcons name="engineering" size={32} color="#fff" />
                        <Text style={styles.statNumber}>{userStats.contractors}</Text>
                        <Text style={styles.statLabel}>Contractors</Text>
                    </LinearGradient>
                </Card>

                <Card style={styles.statCard}>
                    <LinearGradient colors={['#ef4444', '#dc2626']} style={styles.statGradient}>
                        <MaterialIcons name="pending-actions" size={32} color="#fff" />
                        <Text style={styles.statNumber}>{userStats.pendingApprovals}</Text>
                        <Text style={styles.statLabel}>Pending Approvals</Text>
                    </LinearGradient>
                </Card>

                <Card style={styles.statCard}>
                    <LinearGradient colors={['#06b6d4', '#0891b2']} style={styles.statGradient}>
                        <MaterialIcons name="admin-panel-settings" size={32} color="#fff" />
                        <Text style={styles.statNumber}>{userStats.admins}</Text>
                        <Text style={styles.statLabel}>Administrators</Text>
                    </LinearGradient>
                </Card>
            </View>
        </View>
    );

    const renderApprovalsTab = () => (
        <View style={styles.tabContent}>
            {approvalRequests.length === 0 ? (
                <Card style={styles.emptyCard}>
                    <View style={styles.emptyContainer}>
                        <MaterialIcons name="check-circle-outline" size={64} color="#10b981" />
                        <Text style={styles.emptyTitle}>No Pending Approvals</Text>
                        <Text style={styles.emptySubtitle}>All registration requests have been processed.</Text>
                    </View>
                </Card>
            ) : (
                approvalRequests.map((request) => (
                    <Card key={request.id} style={styles.requestCard}>
                        <View style={styles.requestHeader}>
                            <View style={styles.requestInfo}>
                                <Text style={styles.requestName}>{request.fullName}</Text>
                                <Text style={styles.requestRole}>
                                    {request.role === 'transport_contractor' ? 'Transport Contractor' :
                                     request.role === 'swachh_hr' ? 'Swachh HR' : request.role}
                                </Text>
                            </View>
                            <View style={styles.requestBadge}>
                                <Text style={styles.requestBadgeText}>PENDING</Text>
                            </View>
                        </View>

                        <View style={styles.requestDetails}>
                            <View style={styles.requestDetailRow}>
                                <MaterialIcons name="email" size={16} color="#6b7280" />
                                <Text style={styles.requestDetailText}>{request.email}</Text>
                            </View>
                            <View style={styles.requestDetailRow}>
                                <MaterialIcons name="phone" size={16} color="#6b7280" />
                                <Text style={styles.requestDetailText}>{request.phone}</Text>
                            </View>
                            <View style={styles.requestDetailRow}>
                                <MaterialIcons name="schedule" size={16} color="#6b7280" />
                                <Text style={styles.requestDetailText}>
                                    {new Date(request.requestedAt).toLocaleDateString()}
                                </Text>
                            </View>
                        </View>

                        <View style={styles.requestActions}>
                            <TouchableOpacity
                                style={styles.rejectButton}
                                onPress={() => handleRejectRequest(request)}
                            >
                                <MaterialIcons name="close" size={20} color="#fff" />
                                <Text style={styles.rejectButtonText}>Reject</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.approveButton}
                                onPress={() => handleApproveRequest(request)}
                            >
                                <MaterialIcons name="check" size={20} color="#fff" />
                                <Text style={styles.approveButtonText}>Approve</Text>
                            </TouchableOpacity>
                        </View>
                    </Card>
                ))
            )}
        </View>
    );

    const renderUsersTab = () => (
        <View style={styles.tabContent}>
            {users.map((user) => (
                <Card key={user.id} style={styles.userCard}>
                    <View style={styles.userHeader}>
                        <View style={styles.userInfo}>
                            <Text style={styles.userName}>{user.fullName}</Text>
                            <Text style={styles.userRole}>
                                {user.role === 'transport_contractor' ? 'Transport Contractor' :
                                 user.role === 'swachh_hr' ? 'Swachh HR' :
                                 user.role === 'admin' ? 'Administrator' : user.role}
                            </Text>
                        </View>
                        <View style={[
                            styles.userStatusBadge,
                            user.isActive ? styles.activeBadge : styles.inactiveBadge
                        ]}>
                            <Text style={[
                                styles.userStatusText,
                                user.isActive ? styles.activeText : styles.inactiveText
                            ]}>
                                {user.isActive ? 'ACTIVE' : 'INACTIVE'}
                            </Text>
                        </View>
                    </View>

                    <View style={styles.userDetails}>
                        <View style={styles.userDetailRow}>
                            <MaterialIcons name="email" size={16} color="#6b7280" />
                            <Text style={styles.userDetailText}>{user.email}</Text>
                        </View>
                        <View style={styles.userDetailRow}>
                            <MaterialIcons name="phone" size={16} color="#6b7280" />
                            <Text style={styles.userDetailText}>{user.phone}</Text>
                        </View>
                        <View style={styles.userDetailRow}>
                            <MaterialIcons name="schedule" size={16} color="#6b7280" />
                            <Text style={styles.userDetailText}>
                                Joined {new Date(user.createdAt).toLocaleDateString()}
                            </Text>
                        </View>
                    </View>

                    <View style={styles.userActions}>
                        <TouchableOpacity
                            style={[
                                styles.statusButton,
                                user.isActive ? styles.deactivateButton : styles.activateButton
                            ]}
                            onPress={() => toggleUserStatus(user)}
                        >
                            <MaterialIcons
                                name={user.isActive ? 'block' : 'check-circle'}
                                size={20}
                                color="#fff"
                            />
                            <Text style={styles.statusButtonText}>
                                {user.isActive ? 'Deactivate' : 'Activate'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </Card>
            ))}
        </View>
    );

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}
                >
                    <MaterialIcons name="arrow-back" size={24} color="#374151" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>User Management</Text>
                <TouchableOpacity style={styles.refreshButton} onPress={onRefresh}>
                    <MaterialIcons name="refresh" size={24} color="#374151" />
                </TouchableOpacity>
            </View>

            {/* Tab Navigation */}
            <View style={styles.tabContainer}>
                <TouchableOpacity
                    style={[styles.tab, selectedTab === 'overview' && styles.activeTab]}
                    onPress={() => setSelectedTab('overview')}
                >
                    <Text style={[styles.tabText, selectedTab === 'overview' && styles.activeTabText]}>
                        Overview
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, selectedTab === 'approvals' && styles.activeTab]}
                    onPress={() => setSelectedTab('approvals')}
                >
                    <Text style={[styles.tabText, selectedTab === 'approvals' && styles.activeTabText]}>
                        Approvals ({userStats.pendingApprovals})
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, selectedTab === 'users' && styles.activeTab]}
                    onPress={() => setSelectedTab('users')}
                >
                    <Text style={[styles.tabText, selectedTab === 'users' && styles.activeTabText]}>
                        All Users
                    </Text>
                </TouchableOpacity>
            </View>

            <ScrollView
                style={styles.content}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            >
                {selectedTab === 'overview' && renderOverviewTab()}
                {selectedTab === 'approvals' && renderApprovalsTab()}
                {selectedTab === 'users' && renderUsersTab()}
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f9fafb',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: Platform.OS === 'ios' ? 50 : 30,
        paddingBottom: 20,
        paddingHorizontal: 20,
        backgroundColor: '#ffffff',
        borderBottomWidth: 1,
        borderBottomColor: '#f3f4f6',
    },
    backButton: {
        padding: 8,
        borderRadius: 8,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#111827',
    },
    refreshButton: {
        padding: 8,
        borderRadius: 8,
    },
    tabContainer: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
    },
    tab: {
        flex: 1,
        paddingVertical: 16,
        alignItems: 'center',
    },
    activeTab: {
        borderBottomWidth: 2,
        borderBottomColor: '#3b82f6',
    },
    tabText: {
        fontSize: 14,
        color: '#6b7280',
        fontWeight: '500',
    },
    activeTabText: {
        color: '#3b82f6',
        fontWeight: '600',
    },
    content: {
        flex: 1,
    },
    tabContent: {
        padding: 20,
    },
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    statCard: {
        width: '48%',
        marginBottom: 16,
        borderRadius: 12,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    statGradient: {
        padding: 20,
        borderRadius: 12,
        alignItems: 'center',
    },
    statNumber: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#fff',
        marginTop: 8,
    },
    statLabel: {
        fontSize: 12,
        color: '#fff',
        marginTop: 4,
        textAlign: 'center',
    },
    // Empty state styles
    emptyCard: {
        padding: 40,
        alignItems: 'center',
        borderRadius: 12,
    },
    emptyContainer: {
        alignItems: 'center',
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#374151',
        marginTop: 16,
    },
    emptySubtitle: {
        fontSize: 14,
        color: '#6b7280',
        textAlign: 'center',
        marginTop: 8,
    },
    // Request card styles
    requestCard: {
        marginBottom: 16,
        borderRadius: 12,
        padding: 16,
    },
    requestHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    requestInfo: {
        flex: 1,
    },
    requestName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#374151',
    },
    requestRole: {
        fontSize: 14,
        color: '#6b7280',
        marginTop: 2,
    },
    requestBadge: {
        backgroundColor: '#fbbf24',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    requestBadgeText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#92400e',
    },
    requestDetails: {
        marginBottom: 16,
    },
    requestDetailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    requestDetailText: {
        fontSize: 14,
        color: '#6b7280',
        marginLeft: 8,
    },
    requestActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    rejectButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#ef4444',
        paddingVertical: 12,
        borderRadius: 8,
        marginRight: 8,
    },
    rejectButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        marginLeft: 4,
    },
    approveButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#10b981',
        paddingVertical: 12,
        borderRadius: 8,
        marginLeft: 8,
    },
    approveButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        marginLeft: 4,
    },
    // User card styles
    userCard: {
        marginBottom: 16,
        borderRadius: 12,
        padding: 16,
    },
    userHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    userInfo: {
        flex: 1,
    },
    userName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#374151',
    },
    userRole: {
        fontSize: 14,
        color: '#6b7280',
        marginTop: 2,
    },
    userStatusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    activeBadge: {
        backgroundColor: '#d1fae5',
    },
    inactiveBadge: {
        backgroundColor: '#fee2e2',
    },
    userStatusText: {
        fontSize: 12,
        fontWeight: 'bold',
    },
    activeText: {
        color: '#065f46',
    },
    inactiveText: {
        color: '#991b1b',
    },
    userDetails: {
        marginBottom: 16,
    },
    userDetailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    userDetailText: {
        fontSize: 14,
        color: '#6b7280',
        marginLeft: 8,
    },
    userActions: {
        flexDirection: 'row',
    },
    statusButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderRadius: 8,
    },
    activateButton: {
        backgroundColor: '#10b981',
    },
    deactivateButton: {
        backgroundColor: '#ef4444',
    },
    statusButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        marginLeft: 4,
    },
});

export default UserManagement;
