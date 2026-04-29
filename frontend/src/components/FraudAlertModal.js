import React, { useEffect, useContext, useRef } from 'react';
import { Vibration } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { AuthContext } from '../context/AuthContext';
import { getWsUrl } from '../api/api';

/**
 * FraudAlertModal — invisible component that:
 *  1. Opens a WebSocket connection for the logged-in user.
 *  2. On a FRAUD_ALERT message, vibrates and navigates to SuspiciousAlertScreen.
 *
 * Rendered at root level inside AppNavigator so it always listens.
 */
const FraudAlertModal = () => {
  const { user } = useContext(AuthContext);
  const navigation = useNavigation();
  const wsRef = useRef(null);
  const timeoutRef = useRef(null);

  useEffect(() => {
    if (!user) return;

    const connect = () => {
      const ws = new WebSocket(getWsUrl(user.id));
      wsRef.current = ws;

      ws.onopen = () => console.log('[WS] Connected — user', user.id);

      ws.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          if (data.type === 'FRAUD_ALERT') {
            // Vibrate: short-long-short pattern
            Vibration.vibrate([0, 300, 100, 500, 100, 300]);
            // Navigate to the dedicated alert screen
            navigation.navigate('SuspiciousAlert', { alertData: data });
          }
        } catch (err) {
          console.error('[WS] Parse error', err);
        }
      };

      ws.onerror = (e) => console.log('[WS] Error:', e.message);

      ws.onclose = (e) => {
        console.log('[WS] Disconnected. Reconnecting in 3 s…', e.reason);
        timeoutRef.current = setTimeout(connect, 3000);
      };
    };

    connect();

    return () => {
      clearTimeout(timeoutRef.current);
      if (wsRef.current) wsRef.current.close();
    };
  }, [user]);

  // This component renders nothing — it's a background listener
  return null;
};

export default FraudAlertModal;
