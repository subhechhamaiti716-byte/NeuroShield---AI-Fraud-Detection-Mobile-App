import React, { useContext, useEffect, useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  FlatList, RefreshControl, StatusBar
} from 'react-native';
import { AuthContext } from '../context/AuthContext';
import { useIsFocused } from '@react-navigation/native';
import api from '../api/api';

const CATEGORY_ICONS = {
  'Shopping': '🛍️', 'Groceries': '🛒', 'Food & Drink': '🍽️',
  'Travel': '✈️', 'Entertainment': '🎬', 'Health': '💊',
  'Bills': '📄', 'Other': '💸',
};

// ── Memoised transaction row — never re-renders unless its own data changes ──
const TxRow = React.memo(({ tx }) => (
  <View style={[styles.txCard, tx.is_suspicious && styles.txCardSuspicious]}>
    <View style={[styles.txIconContainer, tx.is_suspicious ? styles.txIconSuspicious : styles.txIconSafe]}>
      <Text style={styles.txIcon}>
        {tx.is_suspicious ? '🚨' : (CATEGORY_ICONS[tx.category] || '💳')}
      </Text>
    </View>
    <View style={{ flex: 1 }}>
      <Text style={styles.txCategory}>{tx.category}</Text>
      <Text style={styles.txLocation} numberOfLines={1}>📍 {tx.location}</Text>
    </View>
    <View style={styles.txRight}>
      <Text style={[styles.txAmount, tx.is_suspicious && styles.txAmountSusp]}>
        ₹{tx.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
      </Text>
      {tx.is_suspicious && (
        <View style={styles.suspBadge}>
          <Text style={styles.suspBadgeText}>⚠️ Suspicious</Text>
        </View>
      )}
    </View>
  </View>
));

// ── Memoised action button ──
const ActionBtn = React.memo(({ icon, label, onPress }) => (
  <TouchableOpacity style={styles.actionBtn} onPress={onPress} activeOpacity={0.7}>
    <View style={styles.iconCircle}>
      <Text style={styles.iconText}>{icon}</Text>
    </View>
    <Text style={styles.actionLabel}>{label}</Text>
  </TouchableOpacity>
));

const DashboardScreen = ({ navigation }) => {
  const { user, logout } = useContext(AuthContext);
  const [transactions, setTransactions] = useState([]);
  const [analytics, setAnalytics]       = useState(null);
  const [refreshing, setRefreshing]     = useState(false);
  const isFocused = useIsFocused();

  const fetchData = useCallback(async () => {
    try {
      const [txRes, anRes] = await Promise.all([
        api.get('/transactions'),
        api.get('/analytics'),
      ]);
      setTransactions(txRes.data.slice(0, 5));
      setAnalytics(anRes.data);
    } catch (err) {
      console.log('Dashboard fetch error', err?.message);
    }
  }, []);

  useEffect(() => {
    if (isFocused) fetchData();
  }, [isFocused, fetchData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData().finally(() => setRefreshing(false));
  }, [fetchData]);

  // Derived values — recomputed only when analytics changes
  const { safePercent, riskColor, riskLabel } = useMemo(() => {
    const pct = analytics?.safe_percent ?? 100;
    const color = pct > 90 ? '#10b981' : pct > 70 ? '#f59e0b' : '#ef4444';
    const label = pct > 90 ? 'Low Risk' : pct > 70 ? 'Medium Risk' : 'High Risk';
    return { safePercent: pct, riskColor: color, riskLabel: label };
  }, [analytics]);

  // Stable navigation callbacks
  const goAdd     = useCallback(() => navigation.navigate('AddTransaction'),     [navigation]);
  const goHistory = useCallback(() => navigation.navigate('TransactionHistory'), [navigation]);
  const goAnalytics = useCallback(() => navigation.navigate('Analytics'),        [navigation]);

  const keyExtractor = useCallback((item) => item.id.toString(), []);
  const renderItem   = useCallback(({ item }) => <TxRow tx={item} />, []);

  const ListHeader = useMemo(() => (
    <>
      {/* ── Balance card ── */}
      <View style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>Total Spent</Text>
        <Text style={styles.balanceAmount}>
          ₹{(analytics?.total_spent ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
        </Text>
        <View style={styles.statsRow}>
          <View style={styles.statPill}>
            <Text style={styles.statPillNum}>{analytics?.total_transactions ?? 0}</Text>
            <Text style={styles.statPillLabel}>Transactions</Text>
          </View>
          <View style={styles.statPill}>
            <Text style={[styles.statPillNum, { color: '#10b981' }]}>{analytics?.safe_count ?? 0}</Text>
            <Text style={styles.statPillLabel}>Safe</Text>
          </View>
          <View style={styles.statPill}>
            <Text style={[styles.statPillNum, { color: '#ef4444' }]}>{analytics?.fraud_count ?? 0}</Text>
            <Text style={styles.statPillLabel}>Flagged</Text>
          </View>
        </View>
        <View style={[styles.riskBadge, { backgroundColor: riskColor + '20', borderColor: riskColor + '60' }]}>
          <View style={[styles.riskDot, { backgroundColor: riskColor }]} />
          <Text style={[styles.riskText, { color: riskColor }]}>
            {safePercent.toFixed(0)}% Safe · {riskLabel}
          </Text>
        </View>
      </View>

      {/* ── Actions ── */}
      <View style={styles.actionsContainer}>
        <ActionBtn icon="➕" label={`Add\nTransaction`} onPress={goAdd} />
        <ActionBtn icon="📜" label="History"            onPress={goHistory} />
        <ActionBtn icon="📊" label="Analytics"          onPress={goAnalytics} />
      </View>

      {/* ── Section title ── */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Recent Transactions</Text>
        <TouchableOpacity onPress={goHistory} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.seeAll}>See All →</Text>
        </TouchableOpacity>
      </View>
    </>
  ), [analytics, riskColor, riskLabel, safePercent, goAdd, goHistory, goAnalytics]);

  const ListEmpty = useMemo(() => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyIcon}>💳</Text>
      <Text style={styles.emptyStateText}>No transactions yet</Text>
      <Text style={styles.emptyStateSub}>Add your first transaction above</Text>
    </View>
  ), []);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* ── Header ── */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hello, {user?.name?.split(' ')[0]} 👋</Text>
          <Text style={styles.subGreeting}>🛡️ NeuroShield is active</Text>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={logout} activeOpacity={0.8}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={transactions}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={ListEmpty}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#38bdf8" />}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews={true}
        maxToRenderPerBatch={5}
        initialNumToRender={5}
        windowSize={5}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 24, paddingTop: 56, paddingBottom: 20,
    backgroundColor: '#1e293b', borderBottomWidth: 1, borderBottomColor: '#334155',
  },
  greeting:    { color: '#f8fafc', fontSize: 22, fontWeight: 'bold' },
  subGreeting: { color: '#38bdf8', fontSize: 13, marginTop: 4 },
  logoutBtn:   { backgroundColor: '#334155', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  logoutText:  { color: '#f8fafc', fontSize: 13, fontWeight: '600' },
  scrollContent: { padding: 20, paddingBottom: 40 },
  balanceCard: {
    backgroundColor: '#1e293b', borderRadius: 24, padding: 24, marginBottom: 24,
    borderWidth: 1, borderColor: '#334155',
    shadowColor: '#0ea5e9', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15, shadowRadius: 16, elevation: 8,
  },
  balanceLabel:  { color: '#94a3b8', fontSize: 14, marginBottom: 6 },
  balanceAmount: { color: '#f8fafc', fontSize: 38, fontWeight: 'bold' },
  statsRow: { flexDirection: 'row', marginTop: 18, marginBottom: 16, gap: 10 },
  statPill: { flex: 1, backgroundColor: '#0f172a', borderRadius: 12, padding: 12, alignItems: 'center' },
  statPillNum:   { color: '#f8fafc', fontSize: 20, fontWeight: 'bold' },
  statPillLabel: { color: '#64748b', fontSize: 11, marginTop: 2 },
  riskBadge: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 20, borderWidth: 1, alignSelf: 'flex-start',
  },
  riskDot:  { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  riskText: { fontWeight: '700', fontSize: 13 },
  actionsContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 28 },
  actionBtn:  { alignItems: 'center', flex: 1 },
  iconCircle: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: '#1e293b', justifyContent: 'center', alignItems: 'center',
    marginBottom: 8, borderWidth: 1, borderColor: '#334155',
  },
  iconText:    { fontSize: 26 },
  actionLabel: { color: '#cbd5e1', fontSize: 12, fontWeight: '500', textAlign: 'center' },
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 14,
  },
  sectionTitle: { color: '#f8fafc', fontSize: 18, fontWeight: 'bold' },
  seeAll:       { color: '#38bdf8', fontSize: 13, fontWeight: '600' },
  txCard: {
    backgroundColor: '#1e293b', borderRadius: 16, padding: 16,
    flexDirection: 'row', alignItems: 'center',
    marginBottom: 10, borderWidth: 1, borderColor: '#334155',
  },
  txCardSuspicious: { borderColor: '#ef444450' },
  txIconContainer: {
    width: 46, height: 46, borderRadius: 23,
    justifyContent: 'center', alignItems: 'center', marginRight: 14,
  },
  txIconSafe:      { backgroundColor: '#10b98120' },
  txIconSuspicious:{ backgroundColor: '#ef444420' },
  txIcon:          { fontSize: 20 },
  txCategory:      { color: '#f8fafc', fontSize: 15, fontWeight: '600' },
  txLocation:      { color: '#94a3b8', fontSize: 12, marginTop: 3 },
  txRight:         { alignItems: 'flex-end' },
  txAmount:        { color: '#f8fafc', fontSize: 15, fontWeight: 'bold' },
  txAmountSusp:    { color: '#ef4444' },
  suspBadge:       { backgroundColor: '#ef444420', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2, marginTop: 4 },
  suspBadgeText:   { color: '#ef4444', fontSize: 10, fontWeight: '700' },
  emptyState:      { alignItems: 'center', paddingVertical: 50 },
  emptyIcon:       { fontSize: 48, marginBottom: 12 },
  emptyStateText:  { color: '#94a3b8', fontSize: 18, fontWeight: '600' },
  emptyStateSub:   { color: '#64748b', fontSize: 13, marginTop: 6 },
});

export default DashboardScreen;
