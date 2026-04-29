# 🛡️ NeuroShield AI - Fraud Detection System

NeuroShield is an enterprise-grade fintech platform designed to detect and prevent fraudulent transactions in real-time. By combining a **FastAPI** backend with an **Isolation Forest** machine learning model and a high-performance **React Native (Expo)** mobile interface, NeuroShield provides sub-10ms anomaly detection and instant user alerts.

## 🚀 Live Links
- **Mobile Web App:** [https://neuro-shield-ai-fraud-detection-mobile-app.vercel.app](https://neuro-shield-ai-fraud-detection-mobile-app.vercel.app)
- **API Backend:** [https://neuroshield-ai-fraud-detection-mobile-app.onrender.com](https://neuroshield-ai-fraud-detection-mobile-app.onrender.com)
- **API Docs (Swagger):** [https://neuroshield-ai-fraud-detection-mobile-app.onrender.com/docs](https://neuroshield-ai-fraud-detection-mobile-app.onrender.com/docs)

## ✨ Key Features
- **Real-Time Fraud Detection:** Uses an Unsupervised Isolation Forest model to score every transaction based on location, amount, and historical behavior.
- **Background ML Retraining:** Automatically retrains the fraud model in the background whenever a user provides feedback on a suspicious transaction.
- **High-Speed Caching:** Integrated **Redis** layer for sub-10ms retrieval of aggregate user analytics and dashboard data.
- **Instant Alerts:** WebSocket-based real-time push notification system to alert users of suspicious activity immediately.
- **Enterprise Security:** JWT-based authentication with bcrypt password hashing and secure session management.
- **Cloud Infrastructure:** Fully containerized with Docker and optimized for Render (Backend) and Vercel (Frontend).

## 🛠️ Tech Stack
- **Frontend:** React Native (Expo), React Navigation, Axios, AsyncStorage.
- **Backend:** FastAPI (Python 3.10), SQLAlchemy, Pydantic.
- **Machine Learning:** Scikit-Learn (Isolation Forest), Pandas, NumPy.
- **DevOps:** Docker, Docker Compose, Render, Vercel.
- **Database/Cache:** SQLite (Production-ready) / PostgreSQL (Optional), Redis.

## 📂 Project Structure
```text
.
├── backend/                # FastAPI Application
│   ├── main.py             # API Routes, Webhooks, and Logic
│   ├── models.py           # Database Schema
│   ├── database.py         # SQLAlchemy Setup
│   └── requirements.txt    # Backend Dependencies
├── frontend/               # React Native (Expo) Application
│   ├── src/
│   │   ├── api/            # API Client Configuration
│   │   ├── screens/        # Dashboard, Login, Alerts, etc.
│   │   └── context/        # Auth State Management
│   └── App.js              # Navigation & Main Entry
├── docker-compose.yml      # Container Orchestration
└── render.yaml             # Cloud Infrastructure Config
```

## ⚙️ Local Setup

### Backend
1. Navigate to the backend folder: `cd backend`
2. Install dependencies: `pip install -r requirements.txt`
3. Start the server: `uvicorn main:app --reload`

### Frontend
1. Navigate to the frontend folder: `cd frontend`
2. Install dependencies: `npm install`
3. Start Expo: `npx expo start` (Press 'w' for Web, 'a' for Android)

## 🧠 Machine Learning Approach
NeuroShield uses an **Isolation Forest** algorithm. Unlike traditional models that need millions of labeled "fraud" examples, Isolation Forest works by isolating anomalies. This allows the system to detect **Zero-Day Fraud**—new patterns of fraud that have never been seen before.

When a user marks a transaction as "Safe" or "Fraud," the system saves that feedback and triggers a background thread to update the local model weights, ensuring the AI evolves with the user.

## 📜 License
This project is for demonstration purposes as part of the NeuroShield AG roadmap. All rights reserved.

---
*Built with ❤️ by the NeuroShield Engineering Team*
