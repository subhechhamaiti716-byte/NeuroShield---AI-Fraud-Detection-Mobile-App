import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator,
  Alert, ScrollView, Switch, StatusBar, Keyboard
} from 'react-native';
import api from '../api/api';
import * as Location from 'expo-location';
import * as Device from 'expo-device';

const CATEGORIES = [
  'Shopping', 'Groceries', 'Food & Drink',
  'Travel', 'Entertainment', 'Health', 'Bills', 'Other',
];

const AddTransactionScreen = ({ navigation }) => {
  const [amount,   setAmount]   = useState('');
  const [category, setCategory] = useState('');
  const [notes,    setNotes]    = useState('');
  const [loading,  setLoading]  = useState(false);

  const [locationData,          setLocationData]          = useState({ lat: null, lon: null, locationName: 'Fetching…' });
  const [manualLocationEnabled, setManualLocationEnabled] = useState(false);
  const [manualLocation,        setManualLocation]        = useState('');
  const [locationLoading,       setLocationLoading]       = useState(true);

  const [deviceData, setDeviceData] = useState({ deviceId: 'unknown', deviceModel: 'unknown', os: 'unknown' });

  // Refs for keyboard chaining
  const notesRef         = useRef(null);
  const manualLocRef     = useRef(null);

  useEffect(() => {
    setupDeviceAndLocation();
  }, []);

  const setupDeviceAndLocation = useCallback(async () => {
    // Device — synchronous reads, no async needed
    setDeviceData({
      deviceId:    Device.osBuildId || Device.deviceName || 'unknown',
      deviceModel: Device.modelName || 'unknown',
      os:          `${Device.osName || 'Unknown'} ${Device.osVersion || ''}`.trim(),
    });

    // Location
    setLocationLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationData(prev => ({ ...prev, locationName: 'Permission Denied' }));
        setManualLocationEnabled(true);
        setLocationLoading(false);
        return;
      }

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const geocode = await Location.reverseGeocodeAsync({
        latitude:  loc.coords.latitude,
        longitude: loc.coords.longitude,
      });

      const city = geocode?.[0]?.city
        || geocode?.[0]?.region
        || geocode?.[0]?.country
        || 'Unknown City';

      setLocationData({
        lat:          loc.coords.latitude,
        lon:          loc.coords.longitude,
        locationName: city,
      });
    } catch (err) {
      console.log('Location error', err?.message);
      setLocationData(prev => ({ ...prev, locationName: 'Location Error' }));
      setManualLocationEnabled(true);
    }
    setLocationLoading(false);
  }, []);

  const handleAdd = useCallback(async () => {
    Keyboard.dismiss();

    const parsedAmount = parseFloat(amount);
    if (!amount || isNaN(parsedAmount) || parsedAmount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount greater than 0.');
      return;
    }
    if (!category) {
      Alert.alert('Category Required', 'Please select a category.');
      return;
    }

    const finalLocation = manualLocationEnabled && manualLocation.trim()
      ? manualLocation.trim()
      : locationData.locationName;

    if (!finalLocation || finalLocation === 'Fetching…' || finalLocation === 'Location Error') {
      Alert.alert('Location Required', 'Enter a location manually or wait for GPS.');
      return;
    }

    setLoading(true);

    const txData = {
      amount:       parsedAmount,
      category,
      notes:        notes.trim(),
      location:     finalLocation,
      lat:          manualLocationEnabled ? null : locationData.lat,
      lon:          manualLocationEnabled ? null : locationData.lon,
      device_id:    deviceData.deviceId,
      device_model: deviceData.deviceModel,
      os:           deviceData.os,
    };

    try {
      await api.post('/transactions', txData);
      setLoading(false); 
      navigation.goBack();
    } catch (err) {
      console.log('Add transaction error', err?.message);
      Alert.alert('Error', err.response?.data?.detail || 'Failed to add transaction.');
      setLoading(false);
    }
  }, [amount, category, notes, manualLocationEnabled, manualLocation, locationData, deviceData, navigation]);

  const goBack       = useCallback(() => navigation.goBack(), [navigation]);
  const toggleManual = useCallback((val) => {
    setManualLocationEnabled(val);
    if (val) setTimeout(() => manualLocRef.current?.focus(), 100);
  }, []);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle="light-content" />

      <View style={styles.header}>
        <TouchableOpacity
          onPress={goBack}
          style={styles.backBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          disabled={loading}
        >
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>New Transaction</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.formContainer}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Amount ── */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Amount (₹)</Text>
          <TextInput
            style={[styles.input, styles.amountInput]}
            placeholder="0.00"
            placeholderTextColor="#64748b"
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
            returnKeyType="next"
            onSubmitEditing={() => notesRef.current?.focus()}
            blurOnSubmit={false}
            editable={!loading}
          />
        </View>

        {/* ── Category chips ── */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Category</Text>
          <View style={styles.chipsRow}>
            {CATEGORIES.map(cat => (
              <TouchableOpacity
                key={cat}
                style={[styles.chip, category === cat && styles.chipActive]}
                onPress={() => setCategory(cat)}
                activeOpacity={0.7}
                disabled={loading}
              >
                <Text style={[styles.chipText, category === cat && styles.chipTextActive]}>
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── Notes ── */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Notes (Optional)</Text>
          <TextInput
            ref={notesRef}
            style={styles.input}
            placeholder="e.g. Dinner with friends…"
            placeholderTextColor="#64748b"
            value={notes}
            onChangeText={setNotes}
            returnKeyType="done"
            onSubmitEditing={Keyboard.dismiss}
            editable={!loading}
          />
        </View>

        {/* ── Location block ── */}
        <View style={styles.metaContainer}>
          <View style={styles.metaRow}>
            <Text style={styles.metaIcon}>📍</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.metaLabel}>Detected Location</Text>
              {locationLoading
                ? <ActivityIndicator size="small" color="#38bdf8" style={{ marginTop: 4, alignSelf: 'flex-start' }} />
                : <Text style={styles.metaValue}>{locationData.locationName}</Text>
              }
            </View>
            <TouchableOpacity
              onPress={setupDeviceAndLocation}
              style={styles.refreshBtn}
              disabled={locationLoading || loading}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.refreshText}>↺</Text>
            </TouchableOpacity>
          </View>

          {/* Manual toggle */}
          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>Enter location manually</Text>
            <Switch
              value={manualLocationEnabled}
              onValueChange={toggleManual}
              trackColor={{ false: '#334155', true: '#0ea5e940' }}
              thumbColor={manualLocationEnabled ? '#0ea5e9' : '#64748b'}
              disabled={loading}
            />
          </View>

          {manualLocationEnabled && (
            <TextInput
              ref={manualLocRef}
              style={[styles.input, { marginTop: 10 }]}
              placeholder="e.g. Mumbai, Delhi, Bangalore…"
              placeholderTextColor="#64748b"
              value={manualLocation}
              onChangeText={setManualLocation}
              autoCorrect={false}
              returnKeyType="done"
              onSubmitEditing={Keyboard.dismiss}
              editable={!loading}
            />
          )}

          {/* Device info */}
          <View style={styles.deviceRow}>
            <Text style={styles.metaIcon}>📱</Text>
            <View>
              <Text style={styles.metaLabel}>Device Detected</Text>
              <Text style={styles.metaValue}>{deviceData.deviceModel}</Text>
              <Text style={[styles.metaLabel, { fontSize: 11, marginTop: 2 }]}>{deviceData.os}</Text>
            </View>
          </View>
        </View>

        {/* ── Submit ── */}
        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleAdd}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading
            ? <ActivityIndicator color="#fff" size="small" />
            : <Text style={styles.buttonText}>Submit Transaction →</Text>
          }
        </TouchableOpacity>

        {loading && (
          <Text style={styles.loadingHint}>Analysing transaction with AI…</Text>
        )}

      </ScrollView>
    </KeyboardAvoidingView>
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
  formContainer: { padding: 24, paddingBottom: 48 },
  inputContainer: { marginBottom: 22 },
  label: { color: '#94a3b8', marginBottom: 8, fontSize: 13, fontWeight: '600', letterSpacing: 0.3 },
  input: {
    backgroundColor: '#1e293b', borderRadius: 14,
    paddingHorizontal: 16, paddingVertical: 15,
    color: '#f8fafc', borderWidth: 1, borderColor: '#334155', fontSize: 16,
  },
  amountInput: {
    fontSize: 36, fontWeight: 'bold', color: '#38bdf8',
    textAlign: 'center', letterSpacing: 1,
  },
  chipsRow:     { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip:         { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20, backgroundColor: '#1e293b', borderWidth: 1, borderColor: '#334155', marginBottom: 4 },
  chipActive:   { backgroundColor: '#0ea5e920', borderColor: '#0ea5e9' },
  chipText:     { color: '#94a3b8', fontSize: 13, fontWeight: '500' },
  chipTextActive: { color: '#38bdf8' },
  metaContainer: {
    backgroundColor: '#1e293b', borderRadius: 16, padding: 16,
    marginBottom: 28, borderWidth: 1, borderColor: '#334155',
  },
  metaRow:    { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 4 },
  metaIcon:   { fontSize: 22, marginRight: 12, marginTop: 2 },
  metaLabel:  { color: '#94a3b8', fontSize: 12 },
  metaValue:  { color: '#cbd5e1', fontSize: 14, fontWeight: '500', marginTop: 2 },
  refreshBtn: { padding: 6, backgroundColor: '#334155', borderRadius: 8, marginLeft: 8 },
  refreshText:{ color: '#38bdf8', fontSize: 18, fontWeight: 'bold' },
  toggleRow:  {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#334155',
  },
  toggleLabel: { color: '#94a3b8', fontSize: 14 },
  deviceRow:   {
    flexDirection: 'row', alignItems: 'flex-start',
    marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#334155',
  },
  button: {
    backgroundColor: '#0ea5e9', paddingVertical: 18, borderRadius: 14,
    alignItems: 'center',
    shadowColor: '#0ea5e9', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4, shadowRadius: 10, elevation: 6,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText:     { color: '#fff', fontSize: 16, fontWeight: 'bold', letterSpacing: 0.5 },
  loadingHint:    { color: '#475569', textAlign: 'center', fontSize: 13, marginTop: 12 },
});

export default AddTransactionScreen;
