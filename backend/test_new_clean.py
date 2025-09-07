"""
Comprehensive Test Suite for MindMate Backend
Tests all functionality including emotion detection and AI chat
"""

import requests
import json
import time
from typing import Dict, List

BACKEND_URL = "http://localhost:8000"

def print_separator(title: str):
    """Print a nice separator for test sections"""
    print("\n" + "="*60)
    print(f"🧪 {title}")
    print("="*60)

def print_result(test_name: str, success: bool, details: str = ""):
    """Print test result with formatting"""
    status = "✅ PASS" if success else "❌ FAIL"
    print(f"{status} {test_name}")
    if details:
        print(f"    {details}")

def test_server_connection():
    """Test basic server connectivity"""
    print_separator("Server Connection Test")
    
    try:
        response = requests.get(f"{BACKEND_URL}/", timeout=5)
        if response.ok:
            data = response.json()
            print_result("Server Connection", True, f"Version: {data.get('version', 'unknown')}")
            return True
        else:
            print_result("Server Connection", False, f"Status: {response.status_code}")
            return False
    except Exception as e:
        print_result("Server Connection", False, f"Error: {str(e)}")
        return False

def test_status_endpoint():
    """Test status endpoint"""
    print_separator("Status Endpoint Test")
    
    try:
        response = requests.get(f"{BACKEND_URL}/status", timeout=5)
        if response.ok:
            data = response.json()
            print_result("Status Endpoint", True)
            print(f"    APIs: {data.get('apis', {})}")
            print(f"    Features: {data.get('features', {})}")
            return data
        else:
            print_result("Status Endpoint", False, f"Status: {response.status_code}")
            return None
    except Exception as e:
        print_result("Status Endpoint", False, f"Error: {str(e)}")
        return None

def test_emotion_detection():
    """Test emotion detection with various inputs"""
    print_separator("Emotion Detection Tests")
    
    test_cases = [
        {
            "text": "I'm not feeling well", 
            "expected_emotion": "sadness",
            "description": "Negation handling"
        },
        {
            "text": "I'm feeling really happy and excited today!", 
            "expected_emotion": "joy",
            "description": "Positive emotion"
        },
        {
            "text": "This makes me quite sad and disappointed.", 
            "expected_emotion": "sadness", 
            "description": "Explicit sadness"
        },
        {
            "text": "I'm angry about what happened today.", 
            "expected_emotion": "anger",
            "description": "Explicit anger"
        },
        {
            "text": "I feel scared and worried about the future.", 
            "expected_emotion": "fear",
            "description": "Fear and anxiety"
        },
        {
            "text": "The weather is nice today.", 
            "expected_emotion": None,  # No specific expectation
            "description": "Neutral statement"
        }
    ]
    
    results = []
    
    for i, test_case in enumerate(test_cases, 1):
        try:
            print(f"\n🔍 Test {i}: {test_case['description']}")
            print(f"Input: '{test_case['text']}'")
            
            payload = {"text": test_case["text"]}
            start_time = time.time()
            response = requests.post(f"{BACKEND_URL}/api/detect-emotion", json=payload, timeout=10)
            duration = time.time() - start_time
            
            if response.ok:
                result = response.json()
                detected_emotion = result.get("emotion")
                confidence = result.get("confidence", 0)
                model_used = result.get("model_used", "unknown")
                
                print(f"Result: {detected_emotion} (confidence: {confidence:.2f})")
                print(f"Model: {model_used}")
                print(f"Time: {duration:.2f}s")
                
                # Check if result matches expectation
                if test_case["expected_emotion"]:
                    success = detected_emotion == test_case["expected_emotion"]
                    print_result(f"Emotion Match", success, 
                               f"Expected: {test_case['expected_emotion']}, Got: {detected_emotion}")
                else:
                    print_result(f"Emotion Detection", True, f"Got: {detected_emotion}")
                    success = True
                
                results.append({
                    "test": test_case["description"],
                    "input": test_case["text"],
                    "expected": test_case["expected_emotion"],
                    "detected": detected_emotion,
                    "confidence": confidence,
                    "model": model_used,
                    "duration": duration,
                    "success": success
                })
            else:
                print_result(f"API Call", False, f"Status: {response.status_code}")
                print(f"Error: {response.text}")
                results.append({
                    "test": test_case["description"],
                    "input": test_case["text"],
                    "error": f"HTTP {response.status_code}",
                    "success": False
                })
                
        except Exception as e:
            print_result(f"Test {i}", False, f"Error: {str(e)}")
            results.append({
                "test": test_case["description"],
                "input": test_case["text"],
                "error": str(e),
                "success": False
            })
    
    return results

def test_batch_emotion_detection():
    """Test batch emotion detection"""
    print_separator("Batch Emotion Detection Test")
    
    test_texts = [
        "I'm not feeling well",
        "I'm feeling really happy and excited today!",
        "This makes me quite sad and disappointed.",
        "I'm angry about what happened today.",
        "I feel scared and worried about the future."
    ]
    
    try:
        payload = {"texts": test_texts}
        start_time = time.time()
        response = requests.post(f"{BACKEND_URL}/api/batch-detect-emotion", json=payload, timeout=20)
        duration = time.time() - start_time
        
        if response.ok:
            result = response.json()
            results = result.get("results", [])
            total_time = result.get("total_time", duration)
            
            print_result("Batch Processing", True, f"Processed {len(results)} texts in {total_time:.2f}s")
            
            for i, (text, res) in enumerate(zip(test_texts, results)):
                emotion = res.get("emotion", "unknown")
                confidence = res.get("confidence", 0)
                model = res.get("model_used", "unknown")
                
                print(f"    {i+1}. '{text[:40]}...' -> {emotion} ({confidence:.2f}) [{model}]")
            
            return True
        else:
            print_result("Batch Processing", False, f"Status: {response.status_code}")
            return False
            
    except Exception as e:
        print_result("Batch Processing", False, f"Error: {str(e)}")
        return False

def test_ai_chat():
    """Test AI chat functionality"""
    print_separator("AI Chat Tests")
    
    test_scenarios = [
        {
            "model": "gemini",
            "messages": [{"role": "user", "content": "I'm feeling a bit anxious today"}],
            "current_emotion": "fear",
            "description": "Gemini with anxiety"
        },
        {
            "model": "openrouter", 
            "messages": [{"role": "user", "content": "I'm really happy about my new job!"}],
            "current_emotion": "joy",
            "description": "OpenRouter with joy"
        },
        {
            "model": "gemini",
            "messages": [
                {"role": "user", "content": "I've been feeling down lately"},
                {"role": "assistant", "content": "I understand that you're going through a difficult time."},
                {"role": "user", "content": "What can I do to feel better?"}
            ],
            "current_emotion": "sadness",
            "description": "Multi-turn conversation"
        }
    ]
    
    results = []
    
    for i, scenario in enumerate(test_scenarios, 1):
        try:
            print(f"\n💬 Test {i}: {scenario['description']}")
            print(f"Model: {scenario['model']}")
            print(f"Emotion: {scenario['current_emotion']}")
            print(f"Last message: '{scenario['messages'][-1]['content']}'")
            
            payload = {
                "messages": scenario["messages"],
                "current_emotion": scenario["current_emotion"],
                "ai_model": scenario["model"]
            }
            
            start_time = time.time()
            response = requests.post(f"{BACKEND_URL}/api/wellness-assistant", json=payload, timeout=30)
            duration = time.time() - start_time
            
            if response.ok:
                result = response.json()
                message = result.get("message", "")
                model_used = result.get("model_used", "unknown")
                
                print(f"Response ({duration:.2f}s): {message[:100]}...")
                print(f"Model used: {model_used}")
                
                success = len(message) > 10  # Basic validation
                print_result(f"AI Response", success, f"Length: {len(message)} chars")
                
                results.append({
                    "test": scenario["description"],
                    "model_requested": scenario["model"],
                    "model_used": model_used,
                    "response_length": len(message),
                    "duration": duration,
                    "success": success
                })
            else:
                print_result(f"AI Chat", False, f"Status: {response.status_code}")
                print(f"Error: {response.text}")
                results.append({
                    "test": scenario["description"],
                    "error": f"HTTP {response.status_code}",
                    "success": False
                })
                
        except Exception as e:
            print_result(f"Test {i}", False, f"Error: {str(e)}")
            results.append({
                "test": scenario["description"],
                "error": str(e),
                "success": False
            })
    
    return results

def test_edge_cases():
    """Test edge cases and error handling"""
    print_separator("Edge Cases & Error Handling")
    
    edge_tests = [
        {
            "name": "Empty text emotion detection",
            "endpoint": "/api/detect-emotion",
            "payload": {"text": ""},
            "should_succeed": True
        },
        {
            "name": "Very long text emotion detection",
            "endpoint": "/api/detect-emotion", 
            "payload": {"text": "This is a very long text. " * 100},
            "should_succeed": True
        },
        {
            "name": "Special characters emotion detection",
            "endpoint": "/api/detect-emotion",
            "payload": {"text": "I'm feeling 😭😭😭 not good!!! @#$%"},
            "should_succeed": True
        },
        {
            "name": "Empty messages AI chat",
            "endpoint": "/api/wellness-assistant",
            "payload": {"messages": [], "ai_model": "gemini"},
            "should_succeed": False  # Should require at least one message
        },
        {
            "name": "Invalid AI model",
            "endpoint": "/api/wellness-assistant", 
            "payload": {
                "messages": [{"role": "user", "content": "Hello"}],
                "ai_model": "invalid_model"
            },
            "should_succeed": True  # Should fallback
        }
    ]
    
    results = []
    
    for test in edge_tests:
        try:
            print(f"\n🧪 {test['name']}")
            
            response = requests.post(f"{BACKEND_URL}{test['endpoint']}", json=test['payload'], timeout=10)
            
            if test['should_succeed']:
                success = response.ok
                print_result(test['name'], success, f"Status: {response.status_code}")
            else:
                success = not response.ok
                print_result(test['name'], success, f"Expected failure, got: {response.status_code}")
            
            results.append({
                "test": test['name'],
                "success": success,
                "status_code": response.status_code
            })
            
        except Exception as e:
            success = not test['should_succeed']  # Exception might be expected
            print_result(test['name'], success, f"Exception: {str(e)}")
            results.append({
                "test": test['name'],
                "success": success,
                "error": str(e)
            })
    
    return results

def generate_test_report(emotion_results, batch_result, chat_results, edge_results):
    """Generate a comprehensive test report"""
    print_separator("Test Report Summary")
    
    # Count successes
    emotion_success = sum(1 for r in emotion_results if r.get('success', False))
    chat_success = sum(1 for r in chat_results if r.get('success', False))
    edge_success = sum(1 for r in edge_results if r.get('success', False))
    
    total_tests = len(emotion_results) + len(chat_results) + len(edge_results) + (1 if batch_result else 0)
    total_success = emotion_success + chat_success + edge_success + (1 if batch_result else 0)
    
    print(f"📊 Overall Results: {total_success}/{total_tests} tests passed ({(total_success/total_tests)*100:.1f}%)")
    print(f"   Emotion Detection: {emotion_success}/{len(emotion_results)} passed")
    print(f"   Batch Processing: {'1/1' if batch_result else '0/1'} passed")
    print(f"   AI Chat: {chat_success}/{len(chat_results)} passed")
    print(f"   Edge Cases: {edge_success}/{len(edge_results)} passed")
    
    # Specific test results
    print(f"\n🎯 Key Test Results:")
    
    # Check the critical "I'm not feeling well" test
    not_feeling_well_test = next((r for r in emotion_results if "not feeling well" in r.get('input', '')), None)
    if not_feeling_well_test:
        if not_feeling_well_test.get('success'):
            print(f"   ✅ 'I'm not feeling well' correctly detected as: {not_feeling_well_test.get('detected')}")
        else:
            print(f"   ❌ 'I'm not feeling well' incorrectly detected as: {not_feeling_well_test.get('detected')}")
    
    # Check AI chat functionality
    working_chat_models = [r.get('model_used') for r in chat_results if r.get('success')]
    if working_chat_models:
        print(f"   ✅ AI Chat working with: {', '.join(set(working_chat_models))}")
    else:
        print(f"   ❌ AI Chat not working with any model")
    
    print(f"\n🚀 Backend Status: {'FULLY OPERATIONAL' if total_success == total_tests else 'NEEDS ATTENTION'}")
    
    return {
        "total_tests": total_tests,
        "total_success": total_success,
        "success_rate": (total_success/total_tests)*100,
        "emotion_detection_working": emotion_success > 0,
        "batch_processing_working": batch_result,
        "ai_chat_working": chat_success > 0,
        "critical_test_passed": not_feeling_well_test and not_feeling_well_test.get('success', False)
    }

def main():
    """Run all tests"""
    print("🧪 MindMate Backend Comprehensive Test Suite")
    print("=" * 60)
    
    # Test server connection first
    if not test_server_connection():
        print("\n❌ Cannot connect to server. Please ensure the backend is running on http://localhost:8000")
        print("Start the server with: python app_new_clean.py")
        return
    
    # Get server status
    status = test_status_endpoint()
    
    # Run all tests
    emotion_results = test_emotion_detection()
    batch_result = test_batch_emotion_detection()
    chat_results = test_ai_chat()
    edge_results = test_edge_cases()
    
    # Generate report
    report = generate_test_report(emotion_results, batch_result, chat_results, edge_results)
    
    print(f"\n⏰ Test completed at: {time.strftime('%Y-%m-%d %H:%M:%S')}")
    
    return report

if __name__ == "__main__":
    main()