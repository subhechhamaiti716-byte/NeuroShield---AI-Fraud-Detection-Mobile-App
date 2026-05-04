import pandas as pd
import numpy as np
from sklearn.ensemble import IsolationForest
from math import radians, sin, cos, sqrt, atan2
import logging

logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────
#  Haversine distance (km) between two lat/lon
# ─────────────────────────────────────────────
def haversine_km(lat1, lon1, lat2, lon2):
    R = 6371.0
    lat1, lon1, lat2, lon2 = map(radians, [lat1, lon1, lat2, lon2])
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = sin(dlat / 2) ** 2 + cos(lat1) * cos(lat2) * sin(dlon / 2) ** 2
    return R * 2 * atan2(sqrt(a), sqrt(1 - a))


class FraudDetector:
    """
    Isolation-Forest based fraud detector.

    Features used (6 total):
      1. amount               – raw transaction amount
      2. amount_z             – how many std-devs away from user's avg amount
      3. hour                 – hour of day (0-23), weighted: late night → higher risk
      4. known_device         – 1 if seen before, 0 if new
      5. known_location       – 1 if seen before, 0 if new
      6. location_distance_km – km jump from last transaction (0 if no history / no coords)
      7. tx_freq_today        – how many transactions already made today by this user
    """

    def __init__(self):
        self.model = IsolationForest(
            contamination=0.1,  # More sensitive
            n_estimators=100,
            random_state=42
        )
        self.is_fitted = False

        # Seed with synthetic "normal" data so the model works out-of-the-box
        rng = np.random.default_rng(42)
        n = 200
        dummy = pd.DataFrame({
            "amount":               rng.normal(800, 200, n).clip(50),
            "amount_z":             rng.normal(0, 0.5, n),
            "hour":                 rng.integers(8, 21, n).astype(float),
            "known_device":         rng.choice([1, 1, 1, 0], n).astype(float),
            "known_location":       rng.choice([1, 1, 1, 0], n).astype(float),
            "location_distance_km": rng.uniform(0, 5, n),
            "tx_freq_today":        rng.integers(0, 4, n).astype(float),
        })
        self.fit(dummy)

    # ── feature extraction ──────────────────────────────────────────────────────
    def extract_features(self, transactions, new_tx) -> pd.DataFrame:
        """
        Build a single-row feature DataFrame for one incoming transaction,
        using the user's existing transaction history for context.
        """
        hist = list(transactions)   # SQLAlchemy rows

        # ── 1. amount z-score ──────────────────────────────────────────────────
        if hist:
            amounts = [float(t.amount) for t in hist]
            avg_amt = np.mean(amounts)
            std_amt = np.std(amounts) if len(amounts) > 1 else 1.0
            std_amt = max(std_amt, 1.0)          # avoid div-by-zero
            amount_z = (float(new_tx.amount) - avg_amt) / std_amt
        else:
            amount_z = 0.0

        # ── 2. known device ────────────────────────────────────────────────────
        known_devices = {t.device_id for t in hist if t.device_id}
        if not known_devices:
            known_device = 1.0          # first transaction → assume known
        else:
            known_device = 1.0 if new_tx.device_id in known_devices else 0.0

        # ── 3. known location ──────────────────────────────────────────────────
        known_locations = {t.location for t in hist if t.location}
        if not known_locations:
            known_location = 1.0
        else:
            known_location = 1.0 if new_tx.location in known_locations else 0.0

        # ── 4. hour of day (time risk) ─────────────────────────────────────────
        try:
            # new_tx (TransactionCreate) usually doesn't have date_time until saved
            if hasattr(new_tx, "date_time") and new_tx.date_time:
                hour = float(new_tx.date_time.hour)
            else:
                from datetime import datetime, timezone
                hour = float(datetime.now(timezone.utc).hour)
        except Exception:
            hour = 12.0

        # ── 5. location distance km (from last tx that had coords) ─────────────
        location_distance_km = 0.0
        if new_tx.lat is not None and new_tx.lon is not None:
            for past in reversed(hist):
                if getattr(past, "lat", None) is not None and getattr(past, "lon", None) is not None:
                    location_distance_km = haversine_km(
                        past.lat, past.lon,
                        float(new_tx.lat), float(new_tx.lon)
                    )
                    break

        # ── 6. transaction frequency today ────────────────────────────────────
        from datetime import datetime, timezone
        today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        tx_freq_today = 0
        for t in hist:
            dt = getattr(t, "date_time", None)
            if dt and hasattr(dt, "strftime"):
                if dt.strftime("%Y-%m-%d") == today_str:
                    tx_freq_today += 1

        return pd.DataFrame([{
            "amount":               float(new_tx.amount),
            "amount_z":             float(amount_z),
            "hour":                 hour,
            "known_device":         known_device,
            "known_location":       known_location,
            "location_distance_km": float(location_distance_km),
            "tx_freq_today":        float(tx_freq_today),
        }])

    # ── model training ──────────────────────────────────────────────────────────
    def fit(self, df: pd.DataFrame):
        self.model.fit(df)
        self.is_fitted = True

    def retrain_from_history(self, transactions):
        """
        Retrain model using confirmed-safe transactions from history.
        Called after user provides feedback.
        """
        if len(transactions) < 10:
            return   # not enough data yet

        safe_rows = []
        for t in transactions:
            if t.user_feedback == "fraud":
                continue          # skip confirmed fraud from training
            safe_rows.append({
                "amount":               float(t.amount),
                "amount_z":             0.0,  # simplified for batch retrain
                "hour":                 float(t.date_time.hour) if t.date_time else 12.0,
                "known_device":         1.0,
                "known_location":       1.0,
                "location_distance_km": 0.0,
                "tx_freq_today":        1.0,
            })

        if len(safe_rows) < 5:
            return

        df = pd.DataFrame(safe_rows)
        try:
            self.fit(df)
            logger.info("Model retrained on %d safe transactions", len(safe_rows))
        except Exception as exc:
            logger.error("Retrain failed: %s", exc)

    # ── prediction ─────────────────────────────────────────────────────────────
    def predict_risk(self, feature_df: pd.DataFrame) -> float:
        if not self.is_fitted:
            return 0.1

        # decision_function: positive = normal, negative = anomaly
        raw_score = self.model.decision_function(feature_df)[0]
        
        # Map to [0, 1]:  score ~[-0.5, 0.5]  →  risk = 0.5 - score
        risk = float(np.clip(0.5 - raw_score, 0.0, 1.0))

        # ── Heuristic Boosts (Feature 40: Hybrid AI-Rules System) ───────────────
        amount = feature_df["amount"].iloc[0]
        amount_z = feature_df["amount_z"].iloc[0]
        is_new_loc = feature_df["known_location"].iloc[0] == 0

        # Rule 1: Extreme Amount (High Z-Score or absolute high)
        if amount_z > 3.0 or amount > 100000:
            risk = max(risk, 0.82)
            
        # Rule 2: High amount + New Location
        if is_new_loc and amount > 5000:
            risk = max(risk, 0.78)
            
        # Rule 3: Late night transaction (00:00 - 05:00)
        hour = feature_df["hour"].iloc[0]
        if hour < 5.0 and amount > 1000:
            risk = max(risk, 0.75)

        # Final amplification
        if risk > 0.6:
            risk = min(0.98, risk + 0.15)

        return risk


# Singleton used by main.py
fraud_detector = FraudDetector()
