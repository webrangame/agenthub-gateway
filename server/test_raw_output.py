import requests
import json

# Test with increased verbosity
url = "http://localhost:8081/api/chat/stream"
payload = {"input": "Test Tokyo"}

print("Making POST request to:", url)
print("="*60)

try:
    response = requests.post(url, json=payload, stream=True, timeout=60)
    
    for line in response.iter_lines():
        if line:
            decoded = line.decode('utf-8')
           

 # Print every line to see raw output
            print(decoded)
            
except Exception as e:
    print(f"\nError: {e}")
