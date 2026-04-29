import React, { useState, useContext, useRef, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator,
  StatusBar, Keyboard, ScrollView
} from 'react-native';
import { AuthContext } from '../context/AuthContext';

// ── Password strength helpers ─────────────────────────────────────────────────
const getStrength = (pwd) => {
  if (!pwd) return { level: 0, label: '', color: '#334155' };
  let score = 0;
  if (pwd.length >= 8)              score++;
  if (/[A-Z]/.test(pwd))           score++;
  if (/[0-9]/.test(pwd))           score++;
  if (/[^A-Za-z0-9]/.test(pwd))    score++;
  if (pwd.length >= 12)             score++;

  const map = [
    { level: 1, label: 'Very Weak',  color: '#ef4444' },
    { level: 2, label: 'Weak',       color: '#f97316' },
    { level: 3, label: 'Fair',       color: '#f59e0b' },
    { level: 4, label: 'Strong',     color: '#22c55e' },
    { level: 5, label: 'Very Strong',color: '#10b981' },
  ];
  return map[Math.min(score - 1, 4)] ?? { level: 0, label: '', color: '#334155' };
};

const SignupScreen = ({ navigation }) => {
  const [name,     setName]     = useState('');
  const [email,    setEmail]    = useState('');
  const [phone,    setPhone]    = useState('');
  const [password, setPassword] = useState('');
  const [confirm,  setConfirm]  = useState('');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');
  const [showPwd,  setShowPwd]  = useState(false);
  const [showCfm,  setShowCfm]  = useState(false);

  const { signup } = useContext(AuthContext);

  // Refs for keyboard focus chaining
  const emailRef    = useRef(null);
  const phoneRef    = useRef(null);
  const passwordRef = useRef(null);
  const confirmRef  = useRef(null);

  const strength = getStrength(password);

  const validate = useCallback(() => {
    const trimName  = name.trim();
    const trimEmail = email.trim().toLowerCase();
    const trimPhone = phone.trim();

    if (!trimName)                          return 'Full name is required';
    if (!trimEmail)                         return 'Email is required';
    if (!/\S+@\S+\.\S+/.test(trimEmail))   return 'Enter a valid email address';
    if (!trimPhone)                         return 'Phone number is required';
    if (trimPhone.length < 7)              return 'Enter a valid phone number';
    if (!password)                          return 'Password is required';
    if (password.length < 8)              return 'Password must be at least 8 characters';
    if (strength.level < 2)               return 'Password is too weak — add numbers or symbols';
    if (password !== confirm)              return 'Passwords do not match';
    return null;
  }, [name, email, phone, password, confirm, strength]);

  const handleSignup = useCallback(async () => {
    Keyboard.dismiss();

    const validationError = validate();
    if (validationError) { setError(validationError); return; }

    setLoading(true);
    setError('');

    const result = await signup(
      name.trim(),
      email.trim().toLowerCase(),
      phone.trim(),
      password
    );

    if (!result.success) {
      setError(result.error || 'Signup failed. Please try again.');
      setLoading(false);
    }
    // On success → AuthContext sets user → navigator transitions automatically
  }, [name, email, phone, password, confirm, validate, signup]);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" />

      <ScrollView
        contentContainerStyle={styles.inner}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ── */}
        <View style={styles.header}>
          <Text style={styles.headerEmoji}>🛡️</Text>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Join NeuroShield today</Text>
        </View>

        {/* ── Error banner ── */}
        {!!error && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>⚠️  {error}</Text>
          </View>
        )}

        {/* ── Full Name ── */}
        <View style={styles.fieldWrap}>
          <Text style={styles.label}>Full Name</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Rahul Sharma"
            placeholderTextColor="#475569"
            value={name}
            onChangeText={t => { setName(t); setError(''); }}
            autoComplete="name"
            autoCapitalize="words"
            autoCorrect={false}
            returnKeyType="next"
            onSubmitEditing={() => emailRef.current?.focus()}
            blurOnSubmit={false}
            editable={!loading}
          />
        </View>

        {/* ── Email ── */}
        <View style={styles.fieldWrap}>
          <Text style={styles.label}>Email Address</Text>
          <TextInput
            ref={emailRef}
            style={styles.input}
            placeholder="you@example.com"
            placeholderTextColor="#475569"
            value={email}
            onChangeText={t => { setEmail(t); setError(''); }}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            returnKeyType="next"
            onSubmitEditing={() => phoneRef.current?.focus()}
            blurOnSubmit={false}
            editable={!loading}
          />
        </View>

        {/* ── Phone ── */}
        <View style={styles.fieldWrap}>
          <Text style={styles.label}>Phone Number</Text>
          <TextInput
            ref={phoneRef}
            style={styles.input}
            placeholder="+91 98765 43210"
            placeholderTextColor="#475569"
            value={phone}
            onChangeText={t => { setPhone(t); setError(''); }}
            keyboardType="phone-pad"
            autoComplete="tel"
            returnKeyType="next"
            onSubmitEditing={() => passwordRef.current?.focus()}
            blurOnSubmit={false}
            editable={!loading}
          />
        </View>

        {/* ── Password ── */}
        <View style={styles.fieldWrap}>
          <Text style={styles.label}>Password</Text>
          <View style={styles.pwdRow}>
            <TextInput
              ref={passwordRef}
              style={[styles.input, { flex: 1, paddingRight: 48 }]}
              placeholder="Min. 8 characters"
              placeholderTextColor="#475569"
              value={password}
              onChangeText={t => { setPassword(t); setError(''); }}
              secureTextEntry={!showPwd}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="new-password"
              returnKeyType="next"
              onSubmitEditing={() => confirmRef.current?.focus()}
              blurOnSubmit={false}
              editable={!loading}
            />
            <TouchableOpacity
              style={styles.eyeBtn}
              onPress={() => setShowPwd(v => !v)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={styles.eyeText}>{showPwd ? '🙈' : '👁️'}</Text>
            </TouchableOpacity>
          </View>

          {/* Strength meter */}
          {password.length > 0 && (
            <View style={styles.strengthWrap}>
              <View style={styles.strengthBar}>
                {[1, 2, 3, 4, 5].map(i => (
                  <View
                    key={i}
                    style={[
                      styles.strengthBlock,
                      { backgroundColor: i <= strength.level ? strength.color : '#334155' },
                    ]}
                  />
                ))}
              </View>
              <Text style={[styles.strengthLabel, { color: strength.color }]}>
                {strength.label}
              </Text>
            </View>
          )}
        </View>

        {/* ── Confirm Password ── */}
        <View style={styles.fieldWrap}>
          <Text style={styles.label}>Confirm Password</Text>
          <View style={styles.pwdRow}>
            <TextInput
              ref={confirmRef}
              style={[
                styles.input, { flex: 1, paddingRight: 48 },
                confirm && password !== confirm && styles.inputError,
                confirm && password === confirm && styles.inputOk,
              ]}
              placeholder="Repeat your password"
              placeholderTextColor="#475569"
              value={confirm}
              onChangeText={t => { setConfirm(t); setError(''); }}
              secureTextEntry={!showCfm}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="done"
              onSubmitEditing={handleSignup}
              editable={!loading}
            />
            <TouchableOpacity
              style={styles.eyeBtn}
              onPress={() => setShowCfm(v => !v)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={styles.eyeText}>{showCfm ? '🙈' : '👁️'}</Text>
            </TouchableOpacity>
          </View>
          {confirm && password !== confirm && (
            <Text style={styles.mismatch}>Passwords don't match</Text>
          )}
        </View>

        {/* ── Signup button ── */}
        <TouchableOpacity
          style={[styles.btn, loading && styles.btnDisabled]}
          onPress={handleSignup}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading
            ? <ActivityIndicator color="#fff" size="small" />
            : <Text style={styles.btnText}>Create Account →</Text>
          }
        </TouchableOpacity>

        {loading && (
          <Text style={styles.loadingHint}>Creating your account…</Text>
        )}

        {/* ── Footer ── */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('Login')}
            disabled={loading}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.link}>Log In</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  inner: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 64,
    paddingBottom: 48,
  },
  header: { marginBottom: 36 },
  headerEmoji: { fontSize: 36, marginBottom: 12 },
  title: { fontSize: 30, fontWeight: 'bold', color: '#f8fafc' },
  subtitle: { fontSize: 15, color: '#38bdf8', marginTop: 6 },

  errorBanner: {
    backgroundColor: '#ef444418',
    borderWidth: 1, borderColor: '#ef444450',
    borderRadius: 12, padding: 12, marginBottom: 20,
  },
  errorText: { color: '#ef4444', fontSize: 14, fontWeight: '500' },

  fieldWrap: { marginBottom: 20 },
  label: { color: '#94a3b8', fontSize: 13, fontWeight: '600', marginBottom: 8, letterSpacing: 0.3 },
  input: {
    backgroundColor: '#1e293b',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 15,
    color: '#f8fafc',
    borderWidth: 1,
    borderColor: '#334155',
    fontSize: 16,
  },
  inputError: { borderColor: '#ef4444' },
  inputOk:    { borderColor: '#10b981' },

  pwdRow: { flexDirection: 'row', alignItems: 'center' },
  eyeBtn: { position: 'absolute', right: 14, padding: 4 },
  eyeText: { fontSize: 18 },

  strengthWrap: { flexDirection: 'row', alignItems: 'center', marginTop: 10, gap: 10 },
  strengthBar:  { flexDirection: 'row', gap: 5, flex: 1 },
  strengthBlock: { flex: 1, height: 5, borderRadius: 3 },
  strengthLabel: { fontSize: 12, fontWeight: '700', minWidth: 70 },

  mismatch: { color: '#ef4444', fontSize: 12, marginTop: 6 },

  btn: {
    backgroundColor: '#0ea5e9',
    paddingVertical: 17,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#0ea5e9',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  btnDisabled: { opacity: 0.65 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: 'bold', letterSpacing: 0.4 },
  loadingHint: { color: '#475569', textAlign: 'center', fontSize: 13, marginTop: 10 },

  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 36 },
  footerText: { color: '#64748b', fontSize: 14 },
  link: { color: '#38bdf8', fontWeight: '700', fontSize: 14 },
});

export default SignupScreen;
