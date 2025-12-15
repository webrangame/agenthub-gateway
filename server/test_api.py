import requests
import json

# Test the chat stream endpoint
url = "http://localhost:8081/api/chat/stream"
payload = {"input": "Planning a trip to Tokyo"}

print("Making POST request to:", url)
print("Payload:", json.dumps(payload))
print("\n" + "="*60)
print("Streaming response:")
print("="*60 + "\n")

try:
    response = requests.post(url, json=payload, stream=True, timeout=60)
    
    if response.status_code != 200:
        print(f"Error: HTTP {response.status_code}")
        print(response.text)
    else:
        # Read the SSE stream
        for line in response.iter_lines():
            if line:
                decoded = line.decode('utf-8')
                print(decoded)
                
except Exception as e:
    print(f"\nError: {e}")
