import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator,
  Alert, ScrollView, StatusBar, Keyboard
} from 'react-native';
import api from '../api/api';
import * as Location from 'expo-location';
import * as Device from 'expo-device';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';

const CATEGORIES = [
  'Shopping', 'Groceries', 'Food & Drink',
  'Travel', 'Entertainment', 'Health', 'Bills', 'Other',
];

const AddTransactionScreen = ({ navigation }) => {
  const [amount,   setAmount]   = useState('');
  const [category, setCategory] = useState('');
  const [notes,    setNotes]    = useState('');
  const [receiptImage, setReceiptImage] = useState(null);
  const [loading,  setLoading]  = useState(false);

  // Consolidated location state: automatic pre-fill, user can still edit
  const [location,      setLocation]      = useState('Fetching location…');
  const [latLon,        setLatLon]        = useState({ lat: null, lon: null });
  const [locationLoading, setLocationLoading] = useState(true);

  const [deviceData, setDeviceData] = useState({ deviceId: 'unknown', deviceModel: 'unknown', os: 'unknown' });

  // Refs for keyboard chaining
  const notesRef = useRef(null);

  useEffect(() => {
    setupDeviceAndLocation();
  }, []);

  const setupDeviceAndLocation = useCallback(async () => {
    // Device info
    setDeviceData({
      deviceId:    Device.osBuildId || Device.deviceName || 'unknown',
      deviceModel: Device.modelName || 'unknown',
      os:          `${Device.osName || 'Unknown'} ${Device.osVersion || ''}`.trim(),
    });

    // Start fetching location automatically
    fetchLocation();
  }, []);

  const fetchLocation = async () => {
    setLocationLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocation('Permission Denied (Enter manually)');
        setLocationLoading(false);
        return;
      }

      // Try to get location with timeout
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      setLatLon({
        lat: loc.coords.latitude,
        lon: loc.coords.longitude,
      });

      const geocode = await Location.reverseGeocodeAsync({
        latitude:  loc.coords.latitude,
        longitude: loc.coords.longitude,
      });

      const city = geocode?.[0]?.city
        || geocode?.[0]?.region
        || geocode?.[0]?.district
        || geocode?.[0]?.name
        || 'Unknown City';

      // Only update if the user hasn't started typing a custom location yet
      setLocation(city);
    } catch (err) {
      console.log('Location error', err?.message);
      setLocation('Location Error (Enter manually)');
    }
    setLocationLoading(false);
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'We need camera roll permissions to upload receipts.');
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      setReceiptImage(result.assets[0]);
    }
  };

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

    const finalLocation = location.trim();

    if (!finalLocation || finalLocation === 'Fetching location…' || finalLocation === 'Location Error (Enter manually)') {
      Alert.alert('Location Required', 'Please wait for GPS or enter a location manually.');
      return;
    }

    setLoading(true);
    
    let receiptUrl = null;
    if (receiptImage) {
        try {
            const formData = new FormData();
            formData.append('file', {
                uri: receiptImage.uri,
                name: 'receipt.jpg',
                type: 'image/jpeg',
            });
            
            const uploadRes = await api.post('/upload/receipt', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            receiptUrl = uploadRes.data.url;
        } catch (uploadErr) {
            console.log('Upload error', uploadErr);
            Alert.alert('Upload Failed', 'Could not upload receipt image. Submit anyway?', [
                { text: 'Cancel', onPress: () => { setLoading(false); return; }, style: 'cancel' },
                { text: 'Yes', onPress: () => proceedWithTx(null) }
            ]);
            return;
        }
    }
    
    await proceedWithTx(receiptUrl);
  }, [amount, category, notes, location, latLon, deviceData, receiptImage, navigation]);

  const proceedWithTx = async (receiptUrl) => {
    const parsedAmount = parseFloat(amount);

    const txData = {
      amount:       parsedAmount,
      category,
      notes:        notes.trim(),
      location:     location.trim(),
      lat:          latLon.lat,
      lon:          latLon.lon,
      device_id:    deviceData.deviceId,
      device_model: deviceData.deviceModel,
      os:           deviceData.os,
      receipt_url:  receiptUrl,
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
  };

  const goBack       = useCallback(() => navigation.goBack(), [navigation]);

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
          <View style={styles.inputContainer}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <Text style={styles.label}>Transaction Location</Text>
              {locationLoading && <ActivityIndicator size="small" color="#38bdf8" />}
            </View>
            <View style={styles.locationInputWrapper}>
              <Text style={styles.locationIcon}>📍</Text>
              <TextInput
                style={styles.locationInput}
                placeholder="Enter city or address…"
                placeholderTextColor="#64748b"
                value={location}
                onChangeText={setLocation}
                editable={!loading}
              />
              <TouchableOpacity
                onPress={fetchLocation}
                style={styles.refreshBtn}
                disabled={locationLoading || loading}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.refreshText}>↺</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.locationHint}>Detected automatically. You can edit if incorrect.</Text>
          </View>

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

        {/* ── Receipt Upload ── */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Receipt Evidence (Optional)</Text>
          {receiptImage ? (
            <View style={styles.receiptPreview}>
              <Image source={{ uri: receiptImage.uri }} style={styles.previewImg} />
              <TouchableOpacity style={styles.removeImg} onPress={() => setReceiptImage(null)}>
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>✕</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.uploadBox} onPress={pickImage} disabled={loading}>
              <Text style={styles.uploadIcon}>📸</Text>
              <Text style={styles.uploadText}>Attach Receipt Image</Text>
            </TouchableOpacity>
          )}
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
  locationInputWrapper: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#0f172a', borderRadius: 12,
    borderWidth: 1, borderColor: '#334155',
    paddingHorizontal: 12,
  },
  locationIcon: { fontSize: 18, marginRight: 8 },
  locationInput: {
    flex: 1, color: '#f8fafc', fontSize: 15,
    paddingVertical: 12,
  },
  locationHint: { color: '#64748b', fontSize: 11, marginTop: 6, fontStyle: 'italic' },
  metaRow:    { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 4 },
  metaIcon:   { fontSize: 22, marginRight: 12, marginTop: 2 },
  metaLabel:  { color: '#94a3b8', fontSize: 12 },
  metaValue:  { color: '#cbd5e1', fontSize: 14, fontWeight: '500', marginTop: 2 },
  refreshBtn: { padding: 4, marginLeft: 4 },
  refreshText:{ color: '#38bdf8', fontSize: 20, fontWeight: 'bold' },
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
  uploadBox: {
    backgroundColor: '#1e293b', borderStyle: 'dashed', borderWidth: 1, borderColor: '#38bdf8',
    borderRadius: 16, height: 100, justifyContent: 'center', alignItems: 'center',
  },
  uploadIcon: { fontSize: 28, marginBottom: 4 },
  uploadText: { color: '#38bdf8', fontSize: 13, fontWeight: '600' },
  receiptPreview: { width: '100%', height: 200, borderRadius: 16, overflow: 'hidden', backgroundColor: '#1e293b' },
  previewImg: { width: '100%', height: '100%' },
  removeImg: { position: 'absolute', top: 12, right: 12, backgroundColor: '#ef4444', width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
});

export default AddTransactionScreen;
