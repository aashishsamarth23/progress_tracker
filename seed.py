import requests
import json

UPSTASH_URL = "YOUR_UPSTASH_URL_HERE"
UPSTASH_TOKEN = "YOUR_UPSTASH_TOKEN_HERE"

# Load your local syllabus data
with open("progress.json", "r") as f:
    data = json.load(f)

# Push to Upstash
headers = {"Authorization": f"Bearer {UPSTASH_TOKEN}"}
res = requests.post(f"{UPSTASH_URL}/set/progress", headers=headers, json=json.dumps(data))

print("Seed Complete! Response:", res.json())