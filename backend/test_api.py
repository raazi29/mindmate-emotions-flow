import requests
import json
import time

BACKEND_URL = "http://localhost:8000"

def test_api_status():
    """Test the API status endpoint"""
    try:
        response = requests.get(f"{BACKEND_URL}/status", timeout=5)
        print(f"Status endpoint: {'✅ Working' if response.ok else '❌ Failed'} - {response.status_code}")
        return response.ok
    except Exception as e:
        print(f"Status endpoint: ❌ Failed - {str(e)}")
        return False

def test_wellness_assistant():
    """Test the wellness assistant endpoint"""
    try:
        payload = {
            "messages": [
                {"role": "user", "content": "I'm feeling a bit anxious today"}
            ],
            "current_emotion": "fear",
            "ai_model": "qwen"
        }
        
        print("Testing wellness assistant endpoint...")
        start_time = time.time()
        response = requests.post(
            f"{BACKEND_URL}/wellness-assistant", 
            json=payload,
            timeout=20
        )
        duration = time.time() - start_time
        
        if response.ok:
            result = response.json()
            print(f"Wellness Assistant: ✅ Working ({duration:.2f}s)")
            print(f"Model used: {result.get('model_used', 'unknown')}")
            print(f"Response: {result.get('message', '')[:100]}...")
            return True
        else:
            print(f"Wellness Assistant: ❌ Failed - {response.status_code}")
            print(response.text)
            return False
    except Exception as e:
        print(f"Wellness Assistant: ❌ Failed - {str(e)}")
        return False

def test_emotion_detection():
    """Test the emotion detection endpoint"""
    try:
        payload = {
            "text": "I'm feeling really happy and excited today!"
        }
        
        print("Testing emotion detection endpoint...")
        response = requests.post(
            f"{BACKEND_URL}/detect-emotion", 
            json=payload,
            timeout=10
        )
        
        if response.ok:
            result = response.json()
            print(f"Emotion Detection: ✅ Working")
            print(f"Detected emotion: {result.get('emotion')} (confidence: {result.get('confidence', 0):.2f})")
            return True
        else:
            print(f"Emotion Detection: ❌ Failed - {response.status_code}")
            return False
    except Exception as e:
        print(f"Emotion Detection: ❌ Failed - {str(e)}")
        return False

def run_all_tests():
    """Run all API tests"""
    print("=" * 50)
    print("MindMate Backend API Test")
    print("=" * 50)
    
    # Test basic connectivity
    if not test_api_status():
        print("\n❌ Basic connectivity test failed. Is the server running?")
        print("Start the backend server with: cd backend && .\\start_backend.bat")
        return
    
    # Test core endpoints
    test_emotion_detection()
    print()
    test_wellness_assistant()
    
    print("\n" + "=" * 50)
    print("Test complete!")
    print("=" * 50)

if __name__ == "__main__":
    run_all_tests() 