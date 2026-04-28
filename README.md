# NeuroShield

An AI Fraud Detection App using React Native + FastAPI + Scikit-Learn.

## System Architecture

- **Mobile App**: React Native (Expo) - captures transaction details, location, and device metrics.
- **Backend API**: FastAPI - handles authentication, stores data, and orchestrates fraud checking.
- **AI Model**: Isolation Forest (scikit-learn) - detects anomalies in transaction behavior dynamically based on amount, location, time, and device history.
- **Real-time Alerts**: WebSockets - sends instant alerts to the user device if a transaction's risk score exceeds the threshold.

## How to Run

### 1. Start the Backend

Open a terminal in the `backend` directory:
```bash
cd backend
# Activate virtual environment (Windows)
.\venv\Scripts\activate
# Or on Mac/Linux:
# source venv/bin/activate

# Start the server
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```
The backend will run at `http://localhost:8000`.

### 2. Start the Frontend App

Open another terminal in the `frontend` directory:
```bash
cd frontend

# Start the Expo bundler
npm start
# Press 'a' to open in Android Emulator, 'i' for iOS Simulator, or 'w' for web.
```

## Features Implemented:
- JWT Authentication (Signup/Login)
- AI Fraud Detection matching User's spending patterns
- Device and Location tracking integration
- Real-time WebSocket modal alerts for suspicious transactions
- Transaction history with risk scores
- Analytics dashboard tracking safe vs flagged expenditures
