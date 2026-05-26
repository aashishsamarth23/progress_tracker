import requests
import json
import os
from dotenv import load_dotenv
load_dotenv()

UPSTASH_URL = os.environ.get("UPSTASH_REDIS_REST_URL")
UPSTASH_TOKEN = os.environ.get("UPSTASH_REDIS_REST_TOKEN")

# Load your local syllabus data
with open("progress.json", "r") as f:
    data = json.load(f)

# Push to Upstash
headers = {"Authorization": f"Bearer {UPSTASH_TOKEN}"}
res = requests.post(f"{UPSTASH_URL}/set/progress", headers=headers, json=json.dumps(data))

print("Seed Complete! Response:", res.json())