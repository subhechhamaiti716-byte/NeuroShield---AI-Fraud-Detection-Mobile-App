import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, ScrollView, StatusBar, Alert
} from 'react-native';
import api from '../api/api';

const SuspiciousAlertScreen = ({ route, navigation }) => {
  const { alertData } = route.params;
  const [submitting, setSubmitting] = useState(false);

  const riskPct    = useMemo(() => Math.round((alertData?.risk_score ?? 0) * 100), [alertData]);
  const amount     = useMemo(() => Number(alertData?.amount ?? 0), [alertData]);
  const filledBlocks = useMemo(() => Math.round(riskPct / 20), [riskPct]);

  const riskColor = useMemo(() => {
    if (riskPct >= 85) return '#ef4444';
    if (riskPct >= 60) return '#f59e0b';
    return '#10b981';
  }, [riskPct]);

  const riskDesc = useMemo(() => {
    if (riskPct >= 85) return '🔴  Very High Risk – Likely Fraud';
    if (riskPct >= 60) return '🟡  Medium Risk – Unusual Activity';
    return '🟢  Low Risk – Possibly Safe';
  }, [riskPct]);

  const goBack = useCallback(() => navigation.goBack(), [navigation]);

  const handleFeedback = useCallback(async (status) => {
    setSubmitting(true);
    try {
      await api.post(
        `/transactions/${alertData.transaction_id}/feedback?feedback=${status}`
      );
      const isFraud = status === 'fraud';
      Alert.alert(
        isFraud ? '🚨 Fraud Reported' : '✅ Transaction Verified',
        isFraud
          ? 'We have flagged this transaction. Your account is being secured.'
          : 'Great! This transaction has been marked as safe.',
        [{ text: 'OK', onPress: goBack }]
      );
    } catch (err) {
      console.log('[Feedback] Error:', err?.message);
      Alert.alert('Error', 'Could not submit your response. Please try again.');
      setSubmitting(false);
    }
  }, [alertData, goBack]);

  const handleSafe  = useCallback(() => handleFeedback('safe'),  [handleFeedback]);
  const handleFraud = useCallback(() => handleFeedback('fraud'), [handleFeedback]);

  const detailRows = useMemo(() => [
    { label: '💰  Amount',   value: `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` },
    { label: '📍  Location', value: alertData?.location ?? 'Unknown' },
    { label: '🕐  Time',     value: alertData?.time ?? new Date().toLocaleTimeString() },
  ], [amount, alertData]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" />

      {/* ── Danger banner ── */}
      <View style={styles.dangerBanner}>
        <Text style={styles.bannerText}>⚠️  FRAUD ALERT DETECTED</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* ── Icon ── */}
        <View style={styles.iconWrap}>
          <View style={styles.iconCircle}>
            <Text style={styles.iconEmoji}>🚨</Text>
          </View>
        </View>

        <Text style={styles.headline}>Suspicious Transaction</Text>
        <Text style={styles.subHeadline}>
          Our AI detected unusual activity on your account.{'\n'}
          Please confirm whether this was you.
        </Text>

        {/* ── Transaction details ── */}
        <View style={styles.detailCard}>
          <Text style={styles.detailCardTitle}>Transaction Details</Text>
          {detailRows.map(({ label, value }, i) => (
            <View
              key={label}
              style={[styles.detailRow, i === detailRows.length - 1 && { borderBottomWidth: 0 }]}
            >
              <Text style={styles.detailLabel}>{label}</Text>
              <Text style={styles.detailValue} numberOfLines={1}>{value}</Text>
            </View>
          ))}
        </View>

        {/* ── Risk meter ── */}
        <View style={styles.riskCard}>
          <View style={styles.riskHeaderRow}>
            <Text style={styles.riskTitle}>Risk Score</Text>
            <Text style={[styles.riskPct, { color: riskColor }]}>{riskPct}%</Text>
          </View>
          <View style={styles.meterRow}>
            {[1, 2, 3, 4, 5].map(i => (
              <View
                key={i}
                style={[
                  styles.meterBlock,
                  { backgroundColor: i <= filledBlocks ? riskColor : '#334155' },
                ]}
              />
            ))}
          </View>
          <Text style={[styles.riskLabel, { color: riskColor }]}>{riskDesc}</Text>
        </View>

        {/* ── AI explanation ── */}
        <View style={styles.aiBox}>
          <Text style={styles.aiIcon}>🧠</Text>
          <Text style={styles.aiText}>
            NeuroShield's AI flagged this transaction because it deviates from your
            normal spending pattern — unusual amount, location, time, or device.
          </Text>
        </View>

        {/* ── Actions ── */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={styles.safeButton}
            onPress={handleSafe}
            disabled={submitting}
            activeOpacity={0.8}
          >
            {submitting
              ? <ActivityIndicator color="#10b981" />
              : (
                <>
                  <Text style={styles.safeButtonTitle}>✅  Yes, It's Me</Text>
                  <Text style={styles.safeButtonSub}>Mark this transaction as safe</Text>
                </>
              )
            }
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.fraudButton}
            onPress={handleFraud}
            disabled={submitting}
            activeOpacity={0.8}
          >
            {submitting
              ? <ActivityIndicator color="#fff" />
              : (
                <>
                  <Text style={styles.fraudButtonTitle}>🚫  Not Me — Report Fraud</Text>
                  <Text style={styles.fraudButtonSub}>Block & flag this transaction</Text>
                </>
              )
            }
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.dismissBtn}
          onPress={goBack}
          disabled={submitting}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.dismissText}>Review Later →</Text>
        </TouchableOpacity>

      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  dangerBanner: {
    backgroundColor: '#ef444415', borderBottomWidth: 1, borderBottomColor: '#ef444450',
    paddingVertical: 12, alignItems: 'center', paddingTop: 56,
  },
  bannerText: { color: '#ef4444', fontSize: 12, fontWeight: '800', letterSpacing: 2 },
  content:    { padding: 24, paddingBottom: 48 },
  iconWrap:   { alignItems: 'center', marginVertical: 20 },
  iconCircle: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: '#ef444420', borderWidth: 2, borderColor: '#ef444460',
    justifyContent: 'center', alignItems: 'center',
  },
  iconEmoji:    { fontSize: 44 },
  headline:     { color: '#f8fafc', fontSize: 26, fontWeight: 'bold', textAlign: 'center', marginBottom: 10 },
  subHeadline:  { color: '#94a3b8', fontSize: 14, textAlign: 'center', lineHeight: 22, marginBottom: 28 },
  detailCard: {
    backgroundColor: '#1e293b', borderRadius: 18, padding: 20, marginBottom: 16,
    borderWidth: 1, borderColor: '#334155', borderLeftWidth: 4, borderLeftColor: '#ef4444',
  },
  detailCardTitle: {
    color: '#94a3b8', fontSize: 11, fontWeight: '700',
    letterSpacing: 1.2, marginBottom: 14, textTransform: 'uppercase',
  },
  detailRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#334155',
  },
  detailLabel: { color: '#64748b', fontSize: 14 },
  detailValue: { color: '#f8fafc', fontSize: 14, fontWeight: '600', maxWidth: '60%', textAlign: 'right' },
  riskCard: {
    backgroundColor: '#1e293b', borderRadius: 18, padding: 20, marginBottom: 16,
    borderWidth: 1, borderColor: '#334155',
  },
  riskHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 },
  riskTitle:     { color: '#94a3b8', fontSize: 14, fontWeight: '600' },
  riskPct:       { fontSize: 22, fontWeight: 'bold' },
  meterRow:      { flexDirection: 'row', gap: 6, marginBottom: 12 },
  meterBlock:    { flex: 1, height: 10, borderRadius: 5 },
  riskLabel:     { fontSize: 13, fontWeight: '600' },
  aiBox: {
    flexDirection: 'row', backgroundColor: '#38bdf810',
    borderWidth: 1, borderColor: '#38bdf830',
    borderRadius: 14, padding: 16, marginBottom: 28,
  },
  aiIcon: { fontSize: 26, marginRight: 12 },
  aiText: { flex: 1, color: '#bae6fd', fontSize: 13, lineHeight: 20 },
  actionsContainer: { gap: 12, marginBottom: 16 },
  safeButton: {
    backgroundColor: '#10b98115', borderWidth: 1, borderColor: '#10b981',
    borderRadius: 16, paddingVertical: 18, alignItems: 'center',
  },
  safeButtonTitle: { color: '#10b981', fontSize: 16, fontWeight: '700' },
  safeButtonSub:   { color: '#10b98180', fontSize: 12, marginTop: 4 },
  fraudButton: {
    backgroundColor: '#ef4444', borderRadius: 16, paddingVertical: 18, alignItems: 'center',
    shadowColor: '#ef4444', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35, shadowRadius: 10, elevation: 6,
  },
  fraudButtonTitle: { color: '#fff', fontSize: 16, fontWeight: '700' },
  fraudButtonSub:   { color: '#ffffff80', fontSize: 12, marginTop: 4 },
  dismissBtn:       { alignItems: 'center', paddingVertical: 12 },
  dismissText:      { color: '#475569', fontSize: 14 },
});

export default SuspiciousAlertScreen;
