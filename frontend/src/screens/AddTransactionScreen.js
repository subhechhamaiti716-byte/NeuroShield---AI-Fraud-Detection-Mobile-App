import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator,
  Alert, ScrollView, StatusBar, Keyboard
} from 'react-native';
import api from '../api/api';

const CATEGORIES = [
  'Shopping', 'Food', 'Travel', 'Bills', 'Other'
];

const AddTransactionScreen = ({ navigation }) => {
  const [amount,   setAmount]   = useState('');
  const [location, setLocation] = useState('');
  const [category, setCategory] = useState('');
  const [notes,    setNotes]    = useState('');
  const [loading,  setLoading]  = useState(false);

  const locationRef = useRef(null);
  const notesRef = useRef(null);

  const handleAdd = useCallback(async () => {
    Keyboard.dismiss();

    const parsedAmount = parseFloat(amount);
    if (!amount || isNaN(parsedAmount) || parsedAmount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount greater than 0.');
      return;
    }
    if (!location.trim()) {
      Alert.alert('Location Required', 'Please enter a location.');
      return;
    }
    if (!category) {
      Alert.alert('Category Required', 'Please select a category.');
      return;
    }

    setLoading(true);
    
    const txData = {
      amount:       parsedAmount,
      category,
      notes:        notes.trim(),
      location:     location.trim(), 
      lat:          null,
      lon:          null,
      device_id:    'unknown',
      device_model: 'unknown',
      os:           'unknown',
    };

    try {
      await api.post('/transactions', txData);
      setLoading(false); 
      navigation.goBack();
    } catch (err) {
      console.log('Add transaction error', err?.response?.data || err.message);
      
      const detail = err.response?.data?.detail;
      let errorMsg = 'Failed to add transaction.';
      
      if (typeof detail === 'string') {
        errorMsg = detail;
      } else if (Array.isArray(detail)) {
        // Handle FastAPI validation error list
        errorMsg = detail.map(d => d.msg || d.message).join('\n') || 'Validation error.';
      } else if (err.message) {
        errorMsg = err.message;
      }

      Alert.alert('Error', errorMsg);
      setLoading(false);
    }
  }, [amount, location, category, notes, navigation]);

  const goBack = useCallback(() => navigation.goBack(), [navigation]);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle="light-content" backgroundColor="#1e293b" />

      <View style={styles.header}>
        <TouchableOpacity
          onPress={goBack}
          style={styles.backBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          disabled={loading}
        >
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Add Transaction</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.formContainer}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Amount ── */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Amount</Text>
          <View style={styles.amountWrapper}>
            <Text style={styles.rupeeIcon}>₹</Text>
            <TextInput
              style={styles.amountInput}
              placeholder="0"
              placeholderTextColor="#64748b"
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
              returnKeyType="next"
              onSubmitEditing={() => locationRef.current?.focus()}
              blurOnSubmit={false}
              editable={!loading}
            />
          </View>
        </View>

        {/* ── Location ── */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Location</Text>
          <TextInput
            ref={locationRef}
            style={styles.input}
            placeholder="e.g. Mumbai, New York"
            placeholderTextColor="#64748b"
            value={location}
            onChangeText={setLocation}
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
            style={[styles.input, styles.notesInput]}
            placeholder="What was this for?"
            placeholderTextColor="#64748b"
            value={notes}
            onChangeText={setNotes}
            returnKeyType="done"
            onSubmitEditing={Keyboard.dismiss}
            editable={!loading}
            multiline={true}
          />
        </View>

        {/* ── Submit ── */}
        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleAdd}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading
            ? <ActivityIndicator color="#0f172a" size="small" />
            : <Text style={styles.buttonText}>Confirm Transaction</Text>
          }
        </TouchableOpacity>

      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 50, paddingBottom: 16,
    backgroundColor: '#1e293b', borderBottomWidth: 1, borderBottomColor: '#334155',
  },
  backBtn:  { marginRight: 16 },
  backText: { color: '#f8fafc', fontSize: 24, fontWeight: '300' },
  title:    { color: '#f8fafc', fontSize: 18, fontWeight: '600' },
  formContainer: { padding: 20, paddingBottom: 48 },
  inputContainer: { marginBottom: 24 },
  label: { color: '#94a3b8', marginBottom: 10, fontSize: 13, fontWeight: '500' },
  input: {
    backgroundColor: '#1e293b', borderRadius: 8,
    paddingHorizontal: 16, paddingVertical: 14,
    color: '#f8fafc', borderWidth: 1, borderColor: '#334155', fontSize: 15,
  },
  amountWrapper: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#1e293b', borderRadius: 8,
    borderWidth: 1, borderColor: '#334155',
    paddingHorizontal: 16,
  },
  rupeeIcon: { color: '#10b981', fontSize: 18, marginRight: 8, fontWeight: 'bold' },
  amountInput: {
    flex: 1, color: '#f8fafc', fontSize: 15, paddingVertical: 14,
  },
  notesInput: {
    height: 80, textAlignVertical: 'top'
  },
  chipsRow:     { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chip:         { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 20, backgroundColor: '#1e293b', borderWidth: 1, borderColor: '#334155' },
  chipActive:   { backgroundColor: '#10b981', borderColor: '#10b981' },
  chipText:     { color: '#94a3b8', fontSize: 14, fontWeight: '500' },
  chipTextActive: { color: '#0f172a', fontWeight: '700' },
  button: {
    backgroundColor: '#10b981', paddingVertical: 16, borderRadius: 8,
    alignItems: 'center', marginTop: 10
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText:     { color: '#0f172a', fontSize: 16, fontWeight: '700' },
});

export default AddTransactionScreen;

