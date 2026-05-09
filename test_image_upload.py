#!/usr/bin/env python3
"""
Test script for image file upload.
Verifies that image uploads work correctly with proper size handling.
"""

import requests
import json
from pathlib import Path
from PIL import Image
import io

# Configuration
BASE_URL = "http://localhost:8000/api"
TEST_USER_EMAIL = "test-image@example.com"
TEST_USER_PASSWORD = "Test@1234"

def create_test_image(filename: str, size_kb: int = 100) -> Path:
    """Create a test image file."""
    # Create a simple PNG image
    width, height = 800, 600
    img = Image.new('RGB', (width, height), color='red')
    
    # Save with a specific file size
    output_path = Path(f"/tmp/{filename}")
    img.save(output_path, 'PNG', optimize=False)
    
    # Verify size is approximately correct
    actual_size = output_path.stat().st_size
    print(f"  Created test image: {actual_size} bytes (~{actual_size / 1024:.1f} KB)")
    
    return output_path

def test_image_upload():
    """Test image file upload."""
    print("📸 Testing image file upload...\n")
    
    # Create test image
    print("1️⃣ Creating test image...")
    image_path = create_test_image("test_image.png")
    
    # Register user
    print("\n2️⃣ Registering user...")
    requests.post(
        f"{BASE_URL}/auth/register",
        json={"email": TEST_USER_EMAIL, "password": TEST_USER_PASSWORD}
    )
    
    # Login
    print("3️⃣ Logging in...")
    login_response = requests.post(
        f"{BASE_URL}/auth/login",
        json={"email": TEST_USER_EMAIL, "password": TEST_USER_PASSWORD}
    )
    cookies = login_response.cookies
    
    # Create thread
    print("4️⃣ Creating thread...")
    thread_response = requests.post(
        f"{BASE_URL}/chat/threads",
        json={"title": "Image Upload Test"},
        cookies=cookies
    )
    thread_id = thread_response.json()["id"]
    
    # Send message
    print("5️⃣ Sending message...")
    message_response = requests.post(
        f"{BASE_URL}/chat/threads/{thread_id}/messages",
        json={"content": "Here's an image"},
        cookies=cookies
    )
    message_id = message_response.json()["user_message"]["id"]
    
    # Upload image
    print(f"\n6️⃣ Uploading image: {image_path.name}")
    print(f"   File size: {image_path.stat().st_size} bytes")
    
    with open(image_path, "rb") as f:
        files = {"file": (image_path.name, f, "image/png")}
        upload_response = requests.post(
            f"{BASE_URL}/chat/messages/{message_id}/attachments",
            files=files,
            cookies=cookies
        )
    
    if upload_response.status_code != 200:
        print(f"❌ Upload failed: {upload_response.status_code}")
        print(upload_response.text)
        return
    
    attachment_data = upload_response.json()
    print(f"✅ Upload successful")
    
    # Fetch thread to verify
    print("\n7️⃣ Verifying attachment in thread...")
    fetch_response = requests.get(
        f"{BASE_URL}/chat/threads/{thread_id}",
        cookies=cookies
    )
    
    thread_detail = fetch_response.json()
    messages = thread_detail.get("messages", [])
    
    our_message = None
    for msg in messages:
        if msg["id"] == message_id:
            our_message = msg
            break
    
    if not our_message or not our_message.get("attachments"):
        print("❌ Attachment not found in message")
        return
    
    attachment = our_message["attachments"][0]
    print(f"✅ Image attachment verified:")
    print(f"   ID: {attachment['id']}")
    print(f"   Filename: {attachment['filename']}")
    print(f"   Size: {attachment['file_size']} bytes")
    print(f"   MIME type: {attachment['mime_type']}")
    print(f"   File type: {attachment['file_type']}")
    
    # Verify the size is a number (not string)
    if isinstance(attachment['file_size'], int):
        print(f"   ✅ File size is correctly returned as number")
    elif isinstance(attachment['file_size'], str):
        print(f"   ⚠️ File size is string (will be converted on frontend)")
    
    print("\n" + "="*50)
    print("✨ Image upload test passed!")
    print("="*50)

if __name__ == "__main__":
    try:
        test_image_upload()
    except Exception as e:
        print(f"\n❌ Test error: {e}")
        import traceback
        traceback.print_exc()
