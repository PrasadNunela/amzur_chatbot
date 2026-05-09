#!/usr/bin/env python3
"""
Test script for file upload functionality.
Run this to verify the file upload endpoint works correctly.
"""

import requests
import json
import time
from pathlib import Path

# Configuration
BASE_URL = "http://localhost:8000/api"
TEST_USER_EMAIL = "test@example.com"
TEST_USER_PASSWORD = "Test@1234"

# Create test file
TEST_FILE_PATH = Path("/tmp/test_file.txt")
TEST_FILE_PATH.write_text("This is a test file for upload.\n" * 10)

def test_upload_flow():
    """Test the complete upload flow."""
    print("🧪 Starting file upload test...\n")
    
    # Step 0: Register user if needed
    print("0️⃣ Registering/preparing user...")
    register_response = requests.post(
        f"{BASE_URL}/auth/register",
        json={"email": TEST_USER_EMAIL, "password": TEST_USER_PASSWORD}
    )
    
    if register_response.status_code not in [201, 409]:  # 409 = user already exists
        print(f"⚠️ Registration response: {register_response.status_code}")
    else:
        print(f"✅ User ready")
    
    # Step 1: Login
    print("\n1️⃣ Logging in...")
    login_response = requests.post(
        f"{BASE_URL}/auth/login",
        json={"email": TEST_USER_EMAIL, "password": TEST_USER_PASSWORD}
    )
    
    if login_response.status_code != 200:
        print(f"❌ Login failed: {login_response.status_code}")
        print(login_response.text)
        return
    
    print(f"✅ Login successful")
    cookies = login_response.cookies
    
    # Step 2: Create a thread
    print("\n2️⃣ Creating a thread...")
    thread_response = requests.post(
        f"{BASE_URL}/chat/threads",
        json={"title": "Upload Test Thread"},
        cookies=cookies
    )
    
    if thread_response.status_code not in [200, 201]:
        print(f"❌ Thread creation failed: {thread_response.status_code}")
        print(thread_response.text)
        return
    
    thread_data = thread_response.json()
    thread_id = thread_data["id"]
    print(f"✅ Thread created: {thread_id}")
    
    # Step 3: Send a message
    print("\n3️⃣ Sending a message...")
    message_response = requests.post(
        f"{BASE_URL}/chat/threads/{thread_id}/messages",
        json={"content": "Test message with file"},
        cookies=cookies
    )
    
    if message_response.status_code not in [200, 201]:
        print(f"❌ Message creation failed: {message_response.status_code}")
        print(message_response.text)
        return
    
    message_data = message_response.json()
    message_id = message_data["user_message"]["id"]
    print(f"✅ Message created: {message_id}")
    
    # Step 4: Upload file
    print(f"\n4️⃣ Uploading file: {TEST_FILE_PATH.name}")
    print(f"   File size: {TEST_FILE_PATH.stat().st_size} bytes")
    
    with open(TEST_FILE_PATH, "rb") as f:
        files = {"file": (TEST_FILE_PATH.name, f, "text/plain")}
        upload_response = requests.post(
            f"{BASE_URL}/chat/messages/{message_id}/attachments",
            files=files,
            cookies=cookies
        )
    
    if upload_response.status_code != 200:
        print(f"❌ Upload failed: {upload_response.status_code}")
        print(upload_response.text)
        return
    
    upload_data = upload_response.json()
    attachment_id = upload_data["attachment_id"]
    print(f"✅ Upload successful: {attachment_id}")
    
    # Step 5: Fetch thread to verify attachment
    print("\n5️⃣ Fetching thread to verify attachment...")
    fetch_response = requests.get(
        f"{BASE_URL}/chat/threads/{thread_id}",
        cookies=cookies
    )
    
    if fetch_response.status_code != 200:
        print(f"❌ Fetch failed: {fetch_response.status_code}")
        print(fetch_response.text)
        return
    
    thread_detail = fetch_response.json()
    messages = thread_detail.get("messages", [])
    
    if not messages:
        print("❌ No messages found in thread")
        return
    
    # Find our message and check attachments
    our_message = None
    for msg in messages:
        if msg["id"] == message_id:
            our_message = msg
            break
    
    if not our_message:
        print(f"❌ Original message not found")
        return
    
    attachments = our_message.get("attachments", [])
    
    if not attachments:
        print("❌ No attachments found in message")
        return
    
    attachment = attachments[0]
    print(f"✅ Attachment found:")
    print(f"   ID: {attachment['id']}")
    print(f"   Filename: {attachment['filename']}")
    print(f"   Size: {attachment['file_size']} bytes")
    print(f"   Type: {attachment['file_type']}")
    
    # Verify file was saved to disk
    print("\n6️⃣ Verifying file on disk...")
    # Files are saved relative to where the backend is running (backend/ directory)
    expected_path = Path(f"./backend/uploads/{message_id}_{TEST_FILE_PATH.name}")
    
    if not expected_path.exists():
        print(f"❌ File not found on disk at: {expected_path}")
        return
    
    disk_file_size = expected_path.stat().st_size
    db_file_size = int(attachment['file_size'])
    
    if disk_file_size != db_file_size:
        print(f"❌ File size mismatch!")
        print(f"   Disk: {disk_file_size} bytes")
        print(f"   DB:   {db_file_size} bytes")
        return
    
    print(f"✅ File verified on disk: {disk_file_size} bytes")
    
    print("\n" + "="*50)
    print("✨ All tests passed! Upload feature is working!")
    print("="*50)

if __name__ == "__main__":
    try:
        test_upload_flow()
    except Exception as e:
        print(f"\n❌ Test error: {e}")
        import traceback
        traceback.print_exc()
