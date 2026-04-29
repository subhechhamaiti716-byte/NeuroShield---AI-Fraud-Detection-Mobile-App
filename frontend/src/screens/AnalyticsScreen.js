import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator
} from 'react-native';
import api from '../api/api';

const BAR_TOTAL_WIDTH = 160;

const AnalyticsScreen = ({ navigation }) => {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading]     = useState(true);

  useEffect(() => { fetchAnalytics(); }, []);

  const fetchAnalytics = useCallback(async () => {
    try {
      const res = await api.get('/analytics');
      setAnalytics(res.data);
    } catch (err) {
      console.log('Analytics fetch error', err?.message);
    }
    setLoading(false);
  }, []);

  const goBack = useCallback(() => navigation.goBack(), [navigation]);

  // All derived display values in one memo — zero redundant recalcs
  const derived = useMemo(() => {
    const safePercent = analytics?.safe_percent ?? 100;
    const avgRisk     = analytics?.avg_risk_score ?? 0;
    const categories  = analytics?.category_breakdown ?? [];
    const maxCat      = categories.length > 0 ? categories[0].amount : 1;

    const riskColor = safePercent > 90 ? '#10b981'
                    : safePercent > 70 ? '#f59e0b'
                    : '#ef4444';

    const riskLabel = safePercent > 90 ? 'Safe'
                    : safePercent > 70 ? 'Medium Risk'
                    : 'High Risk';

    const avgRiskColor = avgRisk < 0.3 ? '#10b981'
                       : avgRisk < 0.6 ? '#f59e0b'
                       : '#ef4444';

    return { safePercent, avgRisk, categories, maxCat, riskColor, riskLabel, avgRiskColor };
  }, [analytics]);

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#38bdf8" />
      </View>
    );
  }

  const { safePercent, avgRisk, categories, maxCat, riskColor, riskLabel, avgRiskColor } = derived;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={goBack}
          style={styles.backBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Insights</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* ── Safety Score Circle ── */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Safety Score</Text>
          <View style={[styles.scoreCircle, { borderColor: riskColor }]}>
            <Text style={[styles.scoreText, { color: riskColor }]}>
              {safePercent.toFixed(0)}%
            </Text>
            <Text style={[styles.scoreSubText, { color: riskColor }]}>{riskLabel}</Text>
          </View>
          <Text style={styles.cardDesc}>
            Based on {analytics?.total_transactions ?? 0} transactions
          </Text>
        </View>

        {/* ── Stats Grid ── */}
        <View style={styles.statsGrid}>
          {[
            {
              label: 'Total Spent',
              value: `₹${(analytics?.total_spent ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
              color: '#f8fafc',
            },
            { label: 'Total Tx',  value: analytics?.total_transactions ?? 0, color: '#f8fafc' },
            { label: 'Safe',      value: analytics?.safe_count ?? 0,          color: '#10b981' },
            { label: 'Flagged',   value: analytics?.fraud_count ?? 0,         color: '#ef4444' },
          ].map(s => (
            <View key={s.label} style={styles.statBox}>
              <Text style={styles.statLabel}>{s.label}</Text>
              <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
            </View>
          ))}
        </View>

        {/* ── Avg Risk Bar ── */}
        <View style={styles.riskCard}>
          <View style={styles.riskHeaderRow}>
            <Text style={styles.riskCardLabel}>Average Risk Score</Text>
            <Text style={[styles.riskCardValue, { color: avgRiskColor }]}>
              {(avgRisk * 100).toFixed(1)}%
            </Text>
          </View>
          <View style={styles.riskBarBg}>
            <View style={[
              styles.riskBarFill,
              { width: `${Math.min(avgRisk * 100, 100)}%`, backgroundColor: avgRiskColor },
            ]} />
          </View>
        </View>

        {/* ── Category Breakdown ── */}
        {categories.length > 0 && (
          <View style={[styles.card, { alignItems: 'flex-start' }]}>
            <Text style={[styles.cardLabel, { marginBottom: 16 }]}>Top Spending Categories</Text>
            {categories.map((cat, idx) => (
              <View key={idx} style={styles.catRow}>
                <Text style={styles.catName} numberOfLines={1}>{cat.category}</Text>
                <View style={styles.catBarBg}>
                  <View style={[
                    styles.catBarFill,
                    { width: (cat.amount / maxCat) * BAR_TOTAL_WIDTH },
                  ]} />
                </View>
                <Text style={styles.catAmount}>
                  ₹{cat.amount.toLocaleString('en-IN', { minimumFractionDigits: 0 })}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* ── AI info ── */}
        <View style={styles.infoBox}>
          <Text style={styles.infoIcon}>🧠</Text>
          <Text style={styles.infoText}>
            NeuroShield's AI learns your spending habits — analysing amount,
            location, device, time, and frequency to protect you in real time.
          </Text>
        </View>

      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  center:    { justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 24, paddingTop: 56, paddingBottom: 20,
    backgroundColor: '#1e293b', borderBottomWidth: 1, borderBottomColor: '#334155',
  },
  backBtn:  { marginRight: 16 },
  backText: { color: '#38bdf8', fontSize: 16 },
  title:    { color: '#f8fafc', fontSize: 20, fontWeight: 'bold' },
  content:  { padding: 20, paddingBottom: 40 },
  card: {
    backgroundColor: '#1e293b', borderRadius: 20, padding: 20,
    alignItems: 'center', marginBottom: 16,
    borderWidth: 1, borderColor: '#334155',
  },
  cardLabel:   { color: '#94a3b8', fontSize: 14, marginBottom: 16 },
  scoreCircle: {
    width: 150, height: 150, borderRadius: 75,
    borderWidth: 8, justifyContent: 'center', alignItems: 'center', marginBottom: 16,
  },
  scoreText:    { fontSize: 36, fontWeight: 'bold' },
  scoreSubText: { fontSize: 13, fontWeight: '600', marginTop: 2 },
  cardDesc:     { color: '#64748b', textAlign: 'center', fontSize: 13 },
  statsGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
    justifyContent: 'space-between', marginBottom: 16,
  },
  statBox: {
    width: '48%', backgroundColor: '#1e293b',
    borderRadius: 16, padding: 18, marginBottom: 12,
    borderWidth: 1, borderColor: '#334155',
  },
  statLabel: { color: '#94a3b8', fontSize: 13, marginBottom: 8 },
  statValue: { fontSize: 22, fontWeight: 'bold' },
  riskCard: {
    backgroundColor: '#1e293b', borderRadius: 16, padding: 18,
    marginBottom: 16, borderWidth: 1, borderColor: '#334155',
  },
  riskHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  riskCardLabel: { color: '#94a3b8', fontSize: 13 },
  riskCardValue: { fontSize: 18, fontWeight: 'bold' },
  riskBarBg:   { height: 10, backgroundColor: '#334155', borderRadius: 5, overflow: 'hidden' },
  riskBarFill: { height: '100%', borderRadius: 5 },
  catRow: {
    flexDirection: 'row', alignItems: 'center',
    width: '100%', marginBottom: 14,
  },
  catName:   { color: '#cbd5e1', fontSize: 12, width: 80 },
  catBarBg:  { flex: 1, height: 8, backgroundColor: '#334155', borderRadius: 4, overflow: 'hidden', marginHorizontal: 10 },
  catBarFill:{ height: '100%', backgroundColor: '#0ea5e9', borderRadius: 4 },
  catAmount: { color: '#94a3b8', fontSize: 12, width: 72, textAlign: 'right' },
  infoBox: {
    flexDirection: 'row', backgroundColor: '#38bdf810',
    padding: 16, borderRadius: 16,
    borderWidth: 1, borderColor: '#38bdf840',
  },
  infoIcon: { fontSize: 26, marginRight: 12 },
  infoText: { flex: 1, color: '#bae6fd', fontSize: 13, lineHeight: 20 },
});

export default AnalyticsScreen;
