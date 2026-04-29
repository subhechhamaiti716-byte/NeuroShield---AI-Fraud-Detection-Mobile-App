import React, { useState, useContext, useRef, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator,
  StatusBar, Keyboard, ScrollView
} from 'react-native';
import { AuthContext } from '../context/AuthContext';

const LoginScreen = ({ navigation }) => {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [showPwd, setShowPwd]   = useState(false);

  const { login } = useContext(AuthContext);

  // Refs for focus chaining — zero input-lag keyboard navigation
  const passwordRef = useRef(null);

  const handleLogin = useCallback(async () => {
    Keyboard.dismiss();

    const trimEmail = email.trim().toLowerCase();
    if (!trimEmail) { setError('Please enter your email'); return; }
    if (!password)  { setError('Please enter your password'); return; }

    setLoading(true);
    setError('');

    const result = await login(trimEmail, password);

    if (!result.success) {
      setError(result.error || 'Login failed. Please try again.');
      setLoading(false);
    }
    // On success, AuthContext sets user → navigator switches automatically
  }, [email, password, login]);

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
        {/* ── Branding ── */}
        <View style={styles.brand}>
          <Text style={styles.brandEmoji}>🛡️</Text>
          <Text style={styles.brandName}>NeuroShield</Text>
          <Text style={styles.brandTag}>AI Fraud Detection</Text>
        </View>

        {/* ── Error banner ── */}
        {!!error && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>⚠️  {error}</Text>
          </View>
        )}

        {/* ── Email ── */}
        <View style={styles.fieldWrap}>
          <Text style={styles.label}>Email Address</Text>
          <TextInput
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
              style={[styles.input, { flex: 1 }]}
              placeholder="Enter your password"
              placeholderTextColor="#475569"
              value={password}
              onChangeText={t => { setPassword(t); setError(''); }}
              secureTextEntry={!showPwd}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="password"
              returnKeyType="done"
              onSubmitEditing={handleLogin}
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
        </View>

        {/* ── Login button ── */}
        <TouchableOpacity
          style={[styles.btn, loading && styles.btnDisabled]}
          onPress={handleLogin}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading
            ? <ActivityIndicator color="#fff" size="small" />
            : <Text style={styles.btnText}>Log In →</Text>
          }
        </TouchableOpacity>

        {loading && (
          <Text style={styles.loadingHint}>Verifying your credentials…</Text>
        )}

        {/* ── Footer ── */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Don't have an account? </Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('Signup')}
            disabled={loading}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.link}>Sign Up</Text>
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
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 48,
  },
  brand: { alignItems: 'center', marginBottom: 44 },
  brandEmoji: { fontSize: 56, marginBottom: 10 },
  brandName: { fontSize: 34, fontWeight: 'bold', color: '#f8fafc', letterSpacing: 0.5 },
  brandTag: { fontSize: 15, color: '#38bdf8', marginTop: 6 },

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
  pwdRow: { flexDirection: 'row', alignItems: 'center' },
  eyeBtn: {
    position: 'absolute', right: 14, padding: 4,
  },
  eyeText: { fontSize: 18 },

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

export default LoginScreen;
