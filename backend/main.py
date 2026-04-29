from fastapi import FastAPI, Depends, HTTPException, status, WebSocket, WebSocketDisconnect, Query, Request, Header
from sqlalchemy.orm import Session
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
import bcrypt
from jose import JWTError, jwt
from datetime import datetime, timedelta
from typing import List, Optional, Dict
from fastapi.middleware.cors import CORSMiddleware
from collections import defaultdict
import asyncio
import json
import os
import hmac
import hashlib
import httpx
import logging
import sys
import redis.asyncio as redis

import contextlib

from database import engine, SessionLocal, Base
import models, schemas
from ml_model import fraud_detector

# ── Logging Setup ──────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger("neuroshield.api")

# ── Lifespan for Startup/Shutdown ──────────────────────────────────────────────
@contextlib.asynccontextmanager
async def lifespan(app: FastAPI):
    # Ensure tables are created
    Base.metadata.create_all(bind=engine)
    
    # Run seeding on startup
    db = SessionLocal()
    try:
        user_email = "subhechhamaiti716@gmail.com"
        exists = db.query(models.User).filter(models.User.email == user_email).first()
        if not exists:
            try:
                # Direct bcrypt hashing for Python 3.13 compatibility
                password_bytes = "Subhe@2006".encode('utf-8')
                salt = bcrypt.gensalt()
                hashed = bcrypt.hashpw(password_bytes, salt).decode('utf-8')
                
                new_user = models.User(
                    name="Subhechha",
                    email=user_email,
                    phone="+919167002580",
                    hashed_password=hashed,
                    role="admin"
                )
                db.add(new_user)
                db.commit()
                logger.info(f"Emergency seed user created: {user_email}")
            except Exception as e:
                logger.error(f"Failed to seed user: {e}")
        else:
            logger.info(f"Seed user {user_email} already exists.")
    finally:
        db.close()
    yield

app = FastAPI(title="NeuroShield API", lifespan=lifespan)

# ── Redis Setup ────────────────────────────────────────────────────────────────
REDIS_URL = os.getenv("REDIS_URL", None)
redis_client = None
if REDIS_URL:
    try:
        redis_client = redis.from_url(REDIS_URL, decode_responses=True)
        logger.info("Redis cache successfully connected.")
    except Exception as e:
        logger.warning(f"Redis connection failed: {e}")

# ── Push Notifications ─────────────────────────────────────────────────────────
async def send_push_notification(expo_push_token: str, title: str, body: str, data: dict = None):
    if not expo_push_token:
        return
    message = {
        "to": expo_push_token,
        "sound": "default",
        "title": title,
        "body": body,
        "data": data or {},
    }
    async with httpx.AsyncClient() as client:
        try:
            await client.post(
                "https://exp.host/--/api/v2/push/send",
                json=message,
                headers={"Accept": "application/json", "Accept-encoding": "gzip, deflate", "Content-Type": "application/json"}
            )
        except Exception as e:
            logger.error(f"Push notification failed: {e}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Health Check / Ping ────────────────────────────────────────────────────────
@app.get("/health")
def health_check():
    """Endpoint for uptime monitoring tools (like AWS/Render) to ping."""
    return {"status": "ok", "message": "NeuroShield API is running successfully"}
    
@app.get("/ping")
def ping():
    return {"ping": "pong"}

# ── Auth settings ──────────────────────────────────────────────────────────────
SECRET_KEY = os.getenv("SECRET_KEY", "neuroshield_secret_key_change_in_production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 1 week

def get_password_hash(password: str):
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')

# Note: Seeding moved to lifespan context manager above

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")


# ── DB dependency ──────────────────────────────────────────────────────────────
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ── Auth helpers ───────────────────────────────────────────────────────────────
def verify_password(plain_password: str, hashed_password: str):
    try:
        return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))
    except Exception as e:
        logger.error(f"Password verification error: {e}")
        return False





def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=15))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


async def get_current_user(
    token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)
):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
        token_data = schemas.TokenData(email=email)
    except JWTError:
        raise credentials_exception
    user = db.query(models.User).filter(models.User.email == token_data.email).first()
    if user is None:
        raise credentials_exception
    return user


# ── WebSocket manager ──────────────────────────────────────────────────────────
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[int, WebSocket] = {}

    async def connect(self, websocket: WebSocket, user_id: int):
        await websocket.accept()
        self.active_connections[user_id] = websocket

    def disconnect(self, user_id: int):
        self.active_connections.pop(user_id, None)

    async def send_personal_message(self, message: str, user_id: int):
        ws = self.active_connections.get(user_id)
        if ws:
            try:
                await ws.send_text(message)
            except Exception:
                self.disconnect(user_id)


manager = ConnectionManager()


@app.websocket("/ws/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: int):
    await manager.connect(websocket, user_id)
    try:
        while True:
            await websocket.receive_text()   # keep alive / handle ping
    except WebSocketDisconnect:
        manager.disconnect(user_id)


# ── Auth endpoints ─────────────────────────────────────────────────────────────
@app.post("/signup", response_model=schemas.UserResponse)
def create_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    if db.query(models.User).filter(models.User.email == user.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    if db.query(models.User).filter(models.User.phone == user.phone).first():
        raise HTTPException(status_code=400, detail="Phone already registered")

    db_user = models.User(
        name=user.name,
        email=user.email,
        phone=user.phone,
        role=user.role,
        push_token=user.push_token,
        hashed_password=get_password_hash(user.password),
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    logger.info(f"New user registered: {user.email}")
    return db_user


@app.post("/login", response_model=schemas.Token)
def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)
):
    # ── Emergency Admin Bypass ────────────────────────────────────────────────
    if form_data.username == "subhechhamaiti716@gmail.com" and form_data.password == "Subhe@2006":
        logger.info(f"Emergency bypass triggered for {form_data.username}")
        user = db.query(models.User).filter(models.User.email == form_data.username).first()
        if not user:
            # Create user on the fly if database was wiped
            user = models.User(
                name="Subhechha",
                email=form_data.username,
                phone="+919167002580",
                hashed_password=get_password_hash(form_data.password),
                role="admin"
            )
            db.add(user)
            db.commit()
            db.refresh(user)
        
        access_token = create_access_token(
            data={"sub": user.email},
            expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
        )
        return {"access_token": access_token, "token_type": "bearer"}
    # ──────────────────────────────────────────────────────────────────────────

    user = db.query(models.User).filter(models.User.email == form_data.username).first()
    
    if not user:
        logger.warning(f"Login failed: User {form_data.username} not found in database.")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    if not verify_password(form_data.password, user.hashed_password):
        logger.warning(f"Login failed: Incorrect password for user {form_data.username}.")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    logger.info(f"Successful login for user: {user.email}")
    access_token = create_access_token(
        data={"sub": user.email},
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
    )
    return {"access_token": access_token, "token_type": "bearer"}


@app.get("/users/me", response_model=schemas.UserResponse)
def read_users_me(current_user: models.User = Depends(get_current_user)):
    return current_user


# ── Transaction endpoints ──────────────────────────────────────────────────────
@app.post("/transactions", response_model=schemas.TransactionResponse)
async def create_transaction(
    transaction: schemas.TransactionCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Fetch this user's entire transaction history for feature extraction
    history = (
        db.query(models.Transaction)
        .filter(models.Transaction.owner_id == current_user.id)
        .order_by(models.Transaction.date_time.desc())
        .all()
    )

    features = fraud_detector.extract_features(history, transaction)
    risk_score = fraud_detector.predict_risk(features)
    is_suspicious = risk_score > 0.6

    db_tx = models.Transaction(
        **transaction.dict(),
        owner_id=current_user.id,
        risk_score=risk_score,
        is_suspicious=is_suspicious,
    )
    db.add(db_tx)
    db.commit()
    db.refresh(db_tx)
    
    logger.info(f"Transaction recorded for user {current_user.id}: ₹{transaction.amount} | Risk Score: {risk_score:.2f} | Suspicious: {is_suspicious}")

    # Real-time alert via WebSocket & Push Notification
    if is_suspicious:
        alert_msg = json.dumps({
            "type": "FRAUD_ALERT",
            "transaction_id": db_tx.id,
            "amount": db_tx.amount,
            "location": db_tx.location,
            "risk_score": risk_score,
            "message": "Suspicious transaction detected. Was this you?",
        })
        asyncio.create_task(manager.send_personal_message(alert_msg, current_user.id))
        
        # Feature 37: Push Notifications
        if current_user.push_token:
            asyncio.create_task(send_push_notification(
                current_user.push_token,
                "🚨 Fraud Alert",
                f"Suspicious transaction of ₹{db_tx.amount} detected.",
                {"transaction_id": db_tx.id}
            ))
            
    # Invalidate cache for this user
    if redis_client:
        asyncio.create_task(redis_client.delete(f"analytics_{current_user.id}"))

    return db_tx


@app.get("/transactions", response_model=List[schemas.TransactionResponse])
def read_transactions(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return (
        db.query(models.Transaction)
        .filter(models.Transaction.owner_id == current_user.id)
        .order_by(models.Transaction.date_time.desc())
        .all()
    )


@app.post("/transactions/{transaction_id}/feedback")
def provide_feedback(
    transaction_id: int,
    feedback: str = Query(..., regex="^(safe|fraud)$"),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    tx = (
        db.query(models.Transaction)
        .filter(
            models.Transaction.id == transaction_id,
            models.Transaction.owner_id == current_user.id,
        )
        .first()
    )
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")

    tx.user_feedback = feedback
    if feedback == "safe":
        tx.is_suspicious = False
        tx.risk_score = min(0.3, tx.risk_score)
    elif feedback == "fraud":
        tx.is_suspicious = True
        tx.risk_score = max(0.85, tx.risk_score)

    db.commit()

    # ── Retrain model on confirmed data ──────────────────────────────────────
    all_history = (
        db.query(models.Transaction)
        .filter(models.Transaction.owner_id == current_user.id)
        .all()
    )
    # Run retraining in background so the API response is instant
    import threading
    threading.Thread(
        target=fraud_detector.retrain_from_history,
        args=(all_history,),
        daemon=True,
    ).start()

    # Invalidate cache
    if redis_client:
        asyncio.create_task(redis_client.delete(f"analytics_{current_user.id}"))

    return {"status": "success", "message": "Feedback recorded. Model is being updated."}


# ── Analytics endpoint ─────────────────────────────────────────────────────────
@app.get("/analytics")
async def get_analytics(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Feature 39: Redis Caching (Faster response times)
    cache_key = f"analytics_{current_user.id}"
    if redis_client:
        cached_data = await redis_client.get(cache_key)
        if cached_data:
            return json.loads(cached_data)

    transactions = (
        db.query(models.Transaction)
        .filter(models.Transaction.owner_id == current_user.id)
        .all()
    )

    total = len(transactions)
    safe_count = sum(1 for t in transactions if not t.is_suspicious)
    fraud_count = total - safe_count
    total_spent = sum(t.amount for t in transactions if not t.is_suspicious)
    safe_percent = (safe_count / total * 100) if total > 0 else 100.0

    # Category breakdown (top-5)
    cat_map: Dict[str, float] = defaultdict(float)
    for t in transactions:
        if t.category:
            cat_map[t.category] += t.amount
    category_breakdown = sorted(
        [{"category": k, "amount": round(v, 2)} for k, v in cat_map.items()],
        key=lambda x: x["amount"],
        reverse=True,
    )[:5]

    # Average risk score
    avg_risk = (
        round(sum(t.risk_score for t in transactions) / total, 3)
        if total > 0
        else 0.0
    )

    result = {
        "total_spent": round(total_spent, 2),
        "safe_percent": round(safe_percent, 2),
        "fraud_count": fraud_count,
        "safe_count": safe_count,
        "total_transactions": total,
        "avg_risk_score": avg_risk,
        "category_breakdown": category_breakdown,
    }
    
    if redis_client:
        await redis_client.set(cache_key, json.dumps(result), ex=300) # Cache for 5 mins
        
    return result


# ── Webhook endpoints ──────────────────────────────────────────────────────────
RAZORPAY_WEBHOOK_SECRET = os.getenv("RAZORPAY_WEBHOOK_SECRET", "test_webhook_secret")

@app.post("/webhook/razorpay")
async def razorpay_webhook(
    request: Request,
    x_razorpay_signature: str = Header(None),
    db: Session = Depends(get_db)
):
    body = await request.body()
    
    # 1. Verify signature to ensure the webhook genuinely came from Razorpay
    if x_razorpay_signature is None:
        raise HTTPException(status_code=400, detail="Missing Razorpay signature")
        
    expected_signature = hmac.new(
        key=RAZORPAY_WEBHOOK_SECRET.encode(),
        msg=body,
        digestmod=hashlib.sha256
    ).hexdigest()
    
    if not hmac.compare_digest(expected_signature, x_razorpay_signature):
        raise HTTPException(status_code=400, detail="Invalid signature")
        
    # 2. Parse the verified payload
    try:
        payload = json.loads(body.decode('utf-8'))
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON payload")
        
    # 3. Only process payment.captured (successful payments)
    if payload.get("event") == "payment.captured":
        payment_entity = payload["payload"]["payment"]["entity"]
        amount_in_paise = payment_entity.get("amount", 0)
        amount = amount_in_paise / 100.0  # Convert paise to rupees
        
        email = payment_entity.get("email")
        phone = payment_entity.get("contact")
        
        # 4. Map the payment to a user in our system
        user = None
        if email:
            user = db.query(models.User).filter(models.User.email == email).first()
        if not user and phone:
            user = db.query(models.User).filter(models.User.phone == phone).first()
            
        if not user:
            # If the payment doesn't belong to any registered user, ignore it
            return {"status": "ignored", "reason": "User not found in system"}
            
        # 5. Format transaction details
        tx_create = schemas.TransactionCreate(
            amount=amount,
            category="Other", # Webhooks usually lack rich categories
            location="Online (Razorpay)",
            notes=f"Razorpay Payment ID: {payment_entity.get('id')}"
        )
        
        # 6. Run our AI Fraud Detection on the incoming bank data
        history = (
            db.query(models.Transaction)
            .filter(models.Transaction.owner_id == user.id)
            .order_by(models.Transaction.date_time.desc())
            .all()
        )
        
        features = fraud_detector.extract_features(history, tx_create)
        risk_score = fraud_detector.predict_risk(features)
        is_suspicious = risk_score > 0.7
        
        db_tx = models.Transaction(
            **tx_create.dict(),
            owner_id=user.id,
            risk_score=risk_score,
            is_suspicious=is_suspicious,
        )
        db.add(db_tx)
        db.commit()
        db.refresh(db_tx)
        
        logger.info(f"Razorpay Webhook Transaction for user {user.id}: ₹{amount} | Risk Score: {risk_score:.2f} | Suspicious: {is_suspicious}")
        
        # 7. Alert the user in real-time if suspicious!
        if is_suspicious:
            alert_msg = json.dumps({
                "type": "FRAUD_ALERT",
                "transaction_id": db_tx.id,
                "amount": db_tx.amount,
                "location": db_tx.location,
                "risk_score": risk_score,
                "message": "Suspicious Razorpay payment detected. Was this you?",
            })
            asyncio.create_task(manager.send_personal_message(alert_msg, user.id))
            
            if user.push_token:
                asyncio.create_task(send_push_notification(
                    user.push_token,
                    "🚨 Fraud Alert",
                    f"Suspicious Razorpay payment of ₹{db_tx.amount} detected.",
                    {"transaction_id": db_tx.id}
                ))
            
        if redis_client:
            asyncio.create_task(redis_client.delete(f"analytics_{user.id}"))
            
    return {"status": "success"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
