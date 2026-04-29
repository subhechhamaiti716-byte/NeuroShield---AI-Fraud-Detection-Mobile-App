import React, { createContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../api/api';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkToken();
  }, []);

  const checkToken = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (token) {
        const response = await api.get('/users/me');
        setUser(response.data);
      }
    } catch (e) {
      console.log('Failed to fetch user', e);
      await AsyncStorage.removeItem('token');
    }
    setIsLoading(false);
  };

  const login = async (email, password) => {
    try {
      console.log('Attempting login for:', email);
      
      const params = new URLSearchParams();
      params.append('username', email);
      params.append('password', password);
      
      const response = await api.post('/login', params, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });
      
      console.log('Login successful, token received.');
      const { access_token } = response.data;
      await AsyncStorage.setItem('token', access_token);
      await checkToken();
      return { success: true };
    } catch (error) {
      console.error('Login error:', error.response?.data || error.message);
      const detail = error.response?.data?.detail;
      const errorMsg = typeof detail === 'string' ? detail : (Array.isArray(detail) ? detail[0]?.msg : 'Login failed');
      return { success: false, error: errorMsg };
    }
  };

  const signup = async (name, email, phone, password) => {
    try {
      await api.post('/signup', { name, email, phone, password });
      return await login(email, password);
    } catch (error) {
      const detail = error.response?.data?.detail;
      const errorMsg = typeof detail === 'string' ? detail : (Array.isArray(detail) ? detail[0]?.msg : 'Signup failed');
      return { success: false, error: errorMsg };
    }
  };

  const logout = async () => {
    await AsyncStorage.removeItem('token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
