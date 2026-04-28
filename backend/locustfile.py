from locust import HttpUser, task, between
import random

class NeuroShieldLoadTest(HttpUser):
    # Simulates user think time between 1 and 3 seconds
    wait_time = between(1, 3)
    
    def on_start(self):
        """ Runs once per simulated user. Signs them up and logs them in. """
        rand_id = random.randint(100000, 999999)
        self.email = f"loadtest_{rand_id}@example.com"
        self.password = "LoadTest123!"
        
        # 1. Signup
        self.client.post("/signup", json={
            "name": f"Load Tester {rand_id}",
            "email": self.email,
            "phone": f"99{rand_id}",
            "password": self.password
        })
        
        # 2. Login to get JWT Token
        response = self.client.post("/login", data={
            "username": self.email,
            "password": self.password
        })
        
        if response.status_code == 200:
            token = response.json().get("access_token")
            self.headers = {"Authorization": f"Bearer {token}"}
        else:
            self.headers = {}

    @task(4)
    def submit_transaction(self):
        """ Simulates heavy write load: Submitting transactions & running AI """
        if not self.headers: return
        self.client.post("/transactions", headers=self.headers, json={
            "amount": round(random.uniform(10, 5000), 2),
            "category": random.choice(["Shopping", "Food & Drink", "Travel"]),
            "notes": "Load Test Transaction",
            "location": random.choice(["Mumbai", "Delhi", "Bangalore"]),
            "device_id": "locust_bot",
            "device_model": "LoadTester Pro",
            "os": "Locust OS",
            "lat": 19.0,
            "lon": 72.8
        })

    @task(2)
    def view_history(self):
        """ Simulates read load: Viewing history """
        if not self.headers: return
        self.client.get("/transactions", headers=self.headers)

    @task(1)
    def view_analytics(self):
        """ Simulates compute load: Generating analytics dashboard """
        if not self.headers: return
        self.client.get("/analytics", headers=self.headers)

# To run:
# pip install locust
# locust -f locustfile.py --host=http://127.0.0.1:8000
