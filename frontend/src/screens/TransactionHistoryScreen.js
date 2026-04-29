import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, ActivityIndicator
} from 'react-native';
import api from '../api/api';

const CATEGORY_ICONS = {
  'Shopping': '🛍️', 'Groceries': '🛒', 'Food & Drink': '🍽️',
  'Travel': '✈️', 'Entertainment': '🎬', 'Health': '💊',
  'Bills': '📄', 'Other': '💸',
};

// Fixed row height → enables getItemLayout (no layout measurement on every row)
const ITEM_HEIGHT = 90;

// Memoised row — only re-renders if this item object changes
const TxRow = React.memo(({ item }) => (
  <View style={[styles.txCard, item.is_suspicious && styles.txCardSuspicious]}>
    <View style={[styles.txIconContainer, item.is_suspicious ? styles.txIconSuspiciousBg : styles.txIconSafeBg]}>
      <Text style={styles.txIcon}>
        {item.is_suspicious ? '🚨' : (CATEGORY_ICONS[item.category] || '💳')}
      </Text>
    </View>
    <View style={{ flex: 1 }}>
      <Text style={styles.txCategory} numberOfLines={1}>{item.category}</Text>
      <Text style={styles.txLocation}  numberOfLines={1}>📍 {item.location}</Text>
      <Text style={styles.txDate}>{new Date(item.date_time).toLocaleString()}</Text>
    </View>
    <View style={styles.txRight}>
      <Text style={[styles.txAmount, item.is_suspicious && { color: '#ef4444' }]}>
        ₹{item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
      </Text>
      {item.is_suspicious && (
        <View style={styles.riskBadge}>
          <Text style={styles.riskBadgeText}>Risk {(item.risk_score * 100).toFixed(0)}%</Text>
        </View>
      )}
      {item.user_feedback === 'fraud' && <Text style={styles.feedbackFraud}>✗ Fraud</Text>}
      {item.user_feedback === 'safe'  && <Text style={styles.feedbackSafe}>✓ Verified</Text>}
    </View>
  </View>
));

const FILTERS = ['All', 'Safe', 'Suspicious'];

const TransactionHistoryScreen = ({ navigation }) => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading]           = useState(true);
  const [filter, setFilter]             = useState('All');

  useEffect(() => { fetchHistory(); }, []);

  const fetchHistory = useCallback(async () => {
    try {
      const res = await api.get('/transactions');
      setTransactions(res.data);
    } catch (err) {
      console.log('History fetch error', err?.message);
    }
    setLoading(false);
  }, []);

  // Memoised filter — only recomputes when transactions or filter changes
  const filteredData = useMemo(() => {
    if (filter === 'Safe')       return transactions.filter(t => !t.is_suspicious);
    if (filter === 'Suspicious') return transactions.filter(t =>  t.is_suspicious);
    return transactions;
  }, [transactions, filter]);

  const goBack       = useCallback(() => navigation.goBack(), [navigation]);
  const keyExtractor = useCallback((item) => item.id.toString(), []);
  const renderItem   = useCallback(({ item }) => <TxRow item={item} />, []);

  // Constant-time layout calculation — eliminates FlatList measuring stutter
  const getItemLayout = useCallback((_, index) => ({
    length: ITEM_HEIGHT,
    offset: ITEM_HEIGHT * index,
    index,
  }), []);

  const ListEmpty = useMemo(() => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyIcon}>🔍</Text>
      <Text style={styles.emptyText}>No transactions found</Text>
    </View>
  ), []);

  return (
    <View style={styles.container}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={goBack} style={styles.backBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Transaction History</Text>
      </View>

      {/* ── Filter tabs ── */}
      <View style={styles.filterContainer}>
        {FILTERS.map(f => (
          <TouchableOpacity
            key={f}
            style={[styles.filterBtn, filter === f && styles.filterBtnActive]}
            onPress={() => setFilter(f)}
            activeOpacity={0.7}
          >
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>{f}</Text>
          </TouchableOpacity>
        ))}
        <Text style={styles.filterCount}>{filteredData.length} items</Text>
      </View>

      {loading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#38bdf8" />
        </View>
      ) : (
        <FlatList
          data={filteredData}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          getItemLayout={getItemLayout}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={ListEmpty}
          showsVerticalScrollIndicator={false}
          removeClippedSubviews={true}
          maxToRenderPerBatch={10}
          updateCellsBatchingPeriod={30}
          initialNumToRender={12}
          windowSize={7}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 24, paddingTop: 56, paddingBottom: 20,
    backgroundColor: '#1e293b', borderBottomWidth: 1, borderBottomColor: '#334155',
  },
  backBtn:  { marginRight: 16 },
  backText: { color: '#38bdf8', fontSize: 16 },
  title:    { color: '#f8fafc', fontSize: 20, fontWeight: 'bold' },
  filterContainer: {
    flexDirection: 'row', alignItems: 'center',
    padding: 14, paddingHorizontal: 20, gap: 8,
  },
  filterBtn: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
    backgroundColor: '#1e293b', borderWidth: 1, borderColor: '#334155',
  },
  filterBtnActive: { backgroundColor: '#38bdf820', borderColor: '#38bdf8' },
  filterText:       { color: '#94a3b8', fontWeight: '600', fontSize: 13 },
  filterTextActive: { color: '#38bdf8' },
  filterCount: { color: '#64748b', fontSize: 12, marginLeft: 'auto' },
  loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContainer: { padding: 16 },
  txCard: {
    backgroundColor: '#1e293b', borderRadius: 16, padding: 16,
    flexDirection: 'row', alignItems: 'center',
    marginBottom: 10, borderWidth: 1, borderColor: '#334155',
    height: ITEM_HEIGHT,
  },
  txCardSuspicious:    { borderColor: '#ef444450' },
  txIconContainer:     { width: 46, height: 46, borderRadius: 23, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  txIconSafeBg:        { backgroundColor: '#10b98120' },
  txIconSuspiciousBg:  { backgroundColor: '#ef444420' },
  txIcon:              { fontSize: 20 },
  txCategory:          { color: '#f8fafc', fontSize: 15, fontWeight: '600' },
  txLocation:          { color: '#94a3b8', fontSize: 12, marginTop: 2 },
  txDate:              { color: '#64748b', fontSize: 11, marginTop: 2 },
  txRight:             { alignItems: 'flex-end', minWidth: 90 },
  txAmount:            { color: '#f8fafc', fontSize: 15, fontWeight: 'bold' },
  riskBadge:           { backgroundColor: '#ef444420', borderRadius: 8, paddingHorizontal: 7, paddingVertical: 3, marginTop: 4 },
  riskBadgeText:       { color: '#ef4444', fontSize: 11, fontWeight: '700' },
  feedbackFraud:       { color: '#ef4444', fontSize: 11, fontWeight: '700', marginTop: 3 },
  feedbackSafe:        { color: '#10b981', fontSize: 11, fontWeight: '700', marginTop: 3 },
  emptyState:          { alignItems: 'center', paddingTop: 60 },
  emptyIcon:           { fontSize: 40, marginBottom: 12 },
  emptyText:           { color: '#64748b', fontSize: 16 },
});

export default TransactionHistoryScreen;
