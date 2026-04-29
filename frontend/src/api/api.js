import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// For Android emulator, use 10.0.2.2 instead of localhost
// For iOS emulator or Web, use localhost
// For real device, use your computer's IP address
// For Production: Use the verified live Render backend
const API_URL = 'https://neuroshield-ai-fraud-detection-app.onrender.com';

const api = axios.create({
  baseURL: API_URL,
});

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const getWsUrl = (userId) => {
    const wsBase = API_URL.replace(/^http/, 'ws');
    return `${wsBase}/ws/${userId}`;
}

export default api;
