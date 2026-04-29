import React, { useContext } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, Text, StyleSheet } from 'react-native';

import { AuthProvider, AuthContext } from './src/context/AuthContext';

// Screens
import LoginScreen               from './src/screens/LoginScreen';
import SignupScreen              from './src/screens/SignupScreen';
import DashboardScreen           from './src/screens/DashboardScreen';
import AddTransactionScreen      from './src/screens/AddTransactionScreen';
import TransactionHistoryScreen  from './src/screens/TransactionHistoryScreen';
import AnalyticsScreen           from './src/screens/AnalyticsScreen';
import SuspiciousAlertScreen     from './src/screens/SuspiciousAlertScreen';

// Background WebSocket listener (navigates to SuspiciousAlertScreen on fraud)
import FraudAlertModal from './src/components/FraudAlertModal';

const Stack = createNativeStackNavigator();

const AppNavigator = () => {
  const { user, isLoading } = useContext(AuthContext);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingEmoji}>🛡️</Text>
        <Text style={styles.loadingText}>NeuroShield</Text>
        <Text style={styles.loadingSubText}>Securing your transactions…</Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          /* ── Authenticated screens ── */
          <>
            <Stack.Screen name="Dashboard"          component={DashboardScreen} />
            <Stack.Screen name="AddTransaction"     component={AddTransactionScreen} />
            <Stack.Screen name="TransactionHistory" component={TransactionHistoryScreen} />
            <Stack.Screen name="Analytics"          component={AnalyticsScreen} />
            <Stack.Screen
              name="SuspiciousAlert"
              component={SuspiciousAlertScreen}
              options={{
                animation: 'slide_from_bottom',   // alert slides up dramatically
                gestureEnabled: false,            // user must explicitly respond
              }}
            />
          </>
        ) : (
          /* ── Auth screens ── */
          <>
            <Stack.Screen name="Login"  component={LoginScreen} />
            <Stack.Screen name="Signup" component={SignupScreen} />
          </>
        )}
      </Stack.Navigator>

      {/* Background WS listener — renders null, navigates on fraud alert */}
      {user && <FraudAlertModal />}
    </>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <NavigationContainer>
        <AppNavigator />
      </NavigationContainer>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    gap: 8,
  },
  loadingEmoji: {
    fontSize: 52,
    marginBottom: 8,
  },
  loadingText: {
    color: '#38bdf8',
    fontSize: 28,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  loadingSubText: {
    color: '#475569',
    fontSize: 14,
    marginTop: 4,
  },
});
