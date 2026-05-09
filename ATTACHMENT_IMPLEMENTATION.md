# Attachment Support Implementation Guide

## Overview

The Amzur AI Chat now supports multi-type attachments including **images, videos, code files, tables, formulas, documents, and more**. Users can upload files directly in the chat interface, and the AI can process and respond to their content.

## Features

### ✅ Supported Attachments

| Type | Formats | Storage | LLM Processing |
|------|---------|---------|-----------------|
| **Images** | JPEG, PNG, GIF, WebP, SVG | Disk + DB metadata | Included as base64-encoded content |
| **Videos** | MP4, WebM, AVI, MOV, WMV | Disk + DB metadata | Noted as attachment (content not directly processed) |
| **Code** | .py, .js, .ts, .java, .cs, JSON, XML | Disk + DB metadata | Formatted code blocks with language detection |
| **Documents** | PDF, .doc, .docx, .xlsx, .csv | Disk + DB metadata | Text extracted and included |
| **Tables** | CSV, Excel, spreadsheets | Disk + DB metadata | Raw/extracted content included |

### ✨ User Experience

- **Drag & drop** file upload
- **Click to browse** files
- **Real-time validation** (MIME type, file size ≤ 20 MB)
- **Visual attachment previews** with download links
- **File type icons** and size display
- **Keyboard shortcut**: Ctrl+Enter / Cmd+Enter to send

## Architecture

### Backend Flow

```
User sends message with attachments
    ↓
Files uploaded to /messages/{message_id}/attachments
    ↓
Attachments stored on disk & metadata in DB
    ↓
AttachmentService extracts file content
    ↓
Content integrated into LLM chain
    ↓
LLM processes message + attachment content
    ↓
Response returned with attachments metadata
```

### Frontend Flow

```
User selects files (click/drag-drop)
    ↓
AttachmentInput validates & displays
    ↓
ChatInput shows preview with size
    ↓
User sends message
    ↓
ChatThread uploads files sequentially
    ↓
Response displays with FilePreviewGallery
```

## Implementation Details

### Backend Services

#### **AttachmentService** (`app/services/attachments.py`)

Responsible for extracting and formatting attachment content for LLM consumption.

**Key Methods:**
- `extract_text_content(file_path)` - Reads text files, PDFs, CSVs
- `encode_image_base64(file_path)` - Encodes images for LLM
- `get_attachment_content(attachment)` - Returns LLM-ready formatted content
- `get_message_attachment_contents(db, message_id)` - Batch fetch all attachments for a message

**Example Output:**
```python
# Text file
"Here is the file content..."

# Code file
"```python\nprint('hello')\n```"

# Image
{"type": "image", "filename": "photo.jpg", "mime_type": "image/jpeg", "base64": "..."}

# Video
"[Video attachment: movie.mp4 - Video content cannot be directly processed by LLM]"
```

#### **Updated build_messages()** (`app/ai/chains/chat.py`)

Now accepts attachments parameter and integrates content into the message:

```python
build_messages(
    system_prompt,           # SystemMessage with instructions
    conversation_history,    # List of previous messages
    user_message,           # Current user's text
    attachments=None        # NEW: List of attachment contents
)
```

### Frontend Components

#### **AttachmentInput** (`components/attachments/AttachmentInput.tsx`)

Handles file selection with drag & drop and validation.

```tsx
<AttachmentInput 
  onFilesSelected={(files) => setAttachments([...attachments, ...files])}
  maxFileSize={20 * 1024 * 1024}  // 20 MB
  disabled={isLoading}
/>
```

#### **FilePreview** (`components/attachments/FilePreview.tsx`)

Displays individual attachment with metadata.

```tsx
<FilePreview attachment={attachment} />
```

#### **FilePreviewGallery** (`components/attachments/FilePreview.tsx`)

Organizes multiple attachments by type with optimized layouts.

```tsx
<FilePreviewGallery attachments={message.attachments} />
```

## Database Schema

### Attachment Model

```python
class Attachment:
    id: UUID                    # Primary key
    message_id: UUID           # Foreign key to Message
    filename: str              # Original filename
    file_path: str             # Path on disk
    mime_type: str             # e.g., "image/jpeg"
    file_size: str             # Stored as string (converted to int in schema)
    file_type: str             # "image", "video", "code", "document", "table"
    created_at: DateTime
```

### Migration

Attachments table created in [migration 004](../backend/alembic/versions/004_add_attachments.py).

## API Endpoints

### Upload Attachment

```
POST /api/chat/messages/{message_id}/attachments
Content-Type: multipart/form-data

file: <binary>

Response:
{
  "attachment_id": "uuid"
}
```

### Download Attachment

```
GET /api/chat/attachments/{attachment_id}

Returns: File binary
```

### Send Message with Attachments

```
POST /api/chat/threads/{thread_id}/messages
Content-Type: application/json

{
  "content": "Check out this code and video"
}

Response:
{
  "user_message": {
    "id": "uuid",
    "role": "user",
    "content": "Check out this code and video",
    "attachments": [
      {
        "id": "uuid",
        "filename": "script.py",
        "file_type": "code",
        "mime_type": "text/x-python",
        "file_size": 1024,
        "created_at": "2024-05-09T..."
      }
    ]
  },
  "assistant_message": { ... }
}
```

## Usage Examples

### For Users

1. **Send code for review**:
   - Click attachment button or drag a .py file
   - Type: "Can you review this code?"
   - Send → AI analyzes the code

2. **Upload and describe an image**:
   - Drag image to chat
   - Type: "What's in this image?"
   - Send → AI describes the image

3. **Share spreadsheet data**:
   - Upload .xlsx or .csv file
   - Type: "Analyze this sales data"
   - Send → AI processes the table data

### For Developers

#### Add a new file type:

1. Update `SUPPORTED_TYPES` in [AttachmentInput.tsx](../frontend/src/components/attachments/AttachmentInput.tsx)
2. Add MIME type handling in [AttachmentService.get_attachment_content()](../backend/app/services/attachments.py)
3. Update file type classification in [api/chat.py upload_attachment()](../backend/app/api/chat.py)

#### Extract content from new file format:

```python
# In AttachmentService
elif file_type == "spreadsheet":
    # Use a library like openpyxl for .xlsx
    content = extract_excel_data(file_path)
    return f"[Spreadsheet data]\n{content}"
```

## Configuration

### Environment Variables

```bash
MAX_UPLOAD_MB=20          # Max file size in MB
UPLOAD_DIR=./uploads      # Directory to store files
```

### Tailwind CSS Dark Mode

All components use `dark:` variants for dark mode support. No theme configuration needed.

## Known Limitations

1. **PDF Text Extraction**: Uses basic text extraction (complex layouts may not parse perfectly)
2. **Excel/Word Content**: Basic extraction; formatting is lost
3. **Video Processing**: AI cannot extract frames or analyze video content directly
4. **Image Size**: Large images may impact LLM context window
5. **File Cleanup**: Orphaned files not automatically deleted when messages are removed

## Future Enhancements

- [ ] OCR support for document images
- [ ] Audio file transcription
- [ ] Advanced PDF parsing with layout preservation
- [ ] Spreadsheet formula recognition
- [ ] Automatic file cleanup on message deletion
- [ ] File storage in S3/cloud instead of local disk
- [ ] Rate limiting on file uploads
- [ ] Virus/malware scanning
- [ ] Thumbnail generation for images

## Security Considerations

✅ **Implemented:**
- MIME type validation (server-side)
- File size limits (20 MB per file)
- User ownership verification (only users can access their own files)
- Secure file storage outside web root

⚠️ **Should Implement:**
- MIME type extension validation (prevent .exe renamed as .txt)
- Rate limiting on uploads
- Antivirus scanning for files
- Cleanup of temporary/orphaned files

## Testing

### Manual Test Cases

1. **Upload an image and ask AI to describe it**
   - Expected: AI mentions the image and provides description

2. **Upload code file and ask for review**
   - Expected: AI comments on the code

3. **Upload CSV and ask for analysis**
   - Expected: AI references the data in response

4. **Drag multiple files at once**
   - Expected: All files are added to queue

5. **Try uploading 30 MB file**
   - Expected: Error message about size limit

### Automated Tests

Backend test examples:

```python
@pytest.mark.asyncio
async def test_upload_attachment():
    # Create test user, thread, message
    # Upload file via /messages/{id}/attachments
    # Assert attachment saved to DB and disk

@pytest.mark.asyncio
async def test_attachment_in_llm_response():
    # Create message with attachment
    # Call /threads/{id}/messages endpoint
    # Assert attachment content included in LLM chain
```

## Troubleshooting

### Files not showing in chat

- Check if attachment endpoint returns 404 → verify message ownership
- Check browser console for CORS errors → verify API configuration
- Check if upload succeeded → verify `/uploads` directory has files

### LLM not seeing attachment content

- Verify `AttachmentService.get_attachment_content()` returns proper format
- Check if `build_messages()` is receiving attachment contents
- Check LLM token limit (large files may exceed context window)

### Files accumulating on disk

- No automatic cleanup implemented yet
- Implement periodic cleanup task or add to message deletion cascade

## References

- [Copilot Instructions](/copilot-instructions.md) - See "File & Attachment Handling"
- [ChatInput Component](../frontend/src/components/chat/ChatInput.tsx)
- [AttachmentService](../backend/app/services/attachments.py)
- [Chat API](../backend/app/api/chat.py)
- [Chat Models](../backend/app/models/chat.py)
