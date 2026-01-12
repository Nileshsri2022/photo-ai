# Migrate Storage from Storj to Cloudinary

## Overview

This plan outlines the migration from **Storj** (S3-compatible storage) to **Cloudinary** for handling ZIP file uploads used in AI model training. Cloudinary provides a robust API for file uploads with built-in CDN delivery.

### Why Cloudinary?

| Feature | Benefit |
|---------|---------|
| **Signed Uploads** | Secure client-side uploads without exposing credentials |
| **CDN Delivery** | Fast global content delivery |
| **Raw File Support** | Supports ZIP, PDF, and other non-media files via `resource_type: 'raw'` |
| **Free Tier** | 25 credits/month (sufficient for development) |

---

## User Review Required

> [!IMPORTANT]
> You will need to create a **Cloudinary account** and obtain your credentials:
> - `CLOUDINARY_CLOUD_NAME`
> - `CLOUDINARY_API_KEY`  
> - `CLOUDINARY_API_SECRET`
>
> Get these from: [Cloudinary Dashboard](https://console.cloudinary.com/settings/api-keys)

> [!WARNING]
> The existing Storj environment variables (`S3_ACCESS_KEY`, `S3_SECRET_KEY`, `BUCKET_NAME`, `ENDPOINT`) will no longer be used after this migration. Any existing files stored in Storj will remain there but won't be accessible through the new system.

---

## Proposed Changes

### Backend Package

#### [NEW] [cloudinary.ts](file:///f:/vscode_programs/harkirat2.0/photo-ai/photo-ai/apps/backend/lib/cloudinary.ts)

New utility file to configure and export Cloudinary instance:

```typescript
import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export { cloudinary };
```

---

#### [MODIFY] [index.ts](file:///f:/vscode_programs/harkirat2.0/photo-ai/photo-ai/apps/backend/index.ts)

**Current Implementation (Storj S3):**
```typescript
import { S3Client } from "bun";

app.get("/pre-signed-url", async (req, res) => {
  const key = `models/${Date.now()}_${Math.random()}.zip`;
  const url = S3Client.presign(key, {
    method: "PUT",
    accessKeyId: process.env.S3_ACCESS_KEY,
    secretAccessKey: process.env.S3_SECRET_KEY,
    endpoint: process.env.ENDPOINT,
    bucket: process.env.BUCKET_NAME,
    expiresIn: 60 * 5,
    type: "application/zip",
  });

  res.json({ url, key });
});
```

**New Implementation (Cloudinary):**
```typescript
import { cloudinary } from "./lib/cloudinary";

app.get("/pre-signed-url", async (req, res) => {
  const timestamp = Math.round(new Date().getTime() / 1000);
  const publicId = `models/${Date.now()}_${Math.random().toString(36).substring(7)}`;
  
  const signature = cloudinary.utils.api_sign_request(
    { 
      timestamp, 
      public_id: publicId,
      resource_type: 'raw'  // For ZIP files
    },
    process.env.CLOUDINARY_API_SECRET!
  );

  res.json({
    url: `https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/raw/upload`,
    key: publicId,
    signature,
    timestamp,
    apiKey: process.env.CLOUDINARY_API_KEY,
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
  });
});
```

**Changes:**
- Remove `S3Client` import from "bun"
- Add Cloudinary import
- Replace presigned URL logic with Cloudinary signed upload parameters
- Return additional fields needed for frontend upload

---

### Frontend Package

#### [MODIFY] [Train.tsx](file:///f:/vscode_programs/harkirat2.0/photo-ai/photo-ai/apps/web/components/Train.tsx)

Update the `handleUpload` function to use Cloudinary's upload format:

**Current Implementation:**
```typescript
const { url, key } = presignedRes.data;

await axios.put(url, zipBlob, {
  headers: { "Content-Type": "application/zip" },
  onUploadProgress: (progressEvent) => { ... },
});

const zipUrl = `${process.env.NEXT_PUBLIC_STORJ_BASE_URL}/${key}`;
```

**New Implementation:**
```typescript
const { url, key, signature, timestamp, apiKey, cloudName } = presignedRes.data;

const formData = new FormData();
formData.append('file', zipBlob, 'images.zip');
formData.append('public_id', key);
formData.append('timestamp', timestamp.toString());
formData.append('signature', signature);
formData.append('api_key', apiKey);
formData.append('resource_type', 'raw');

const uploadRes = await axios.post(url, formData, {
  onUploadProgress: (progressEvent) => { ... },
});

const zipUrl = uploadRes.data.secure_url;
```

**Changes:**
- Switch from `PUT` to `POST` request
- Use `FormData` instead of raw binary upload
- Extract `secure_url` from Cloudinary response

---

### Environment Configuration

#### [MODIFY] [.env](file:///f:/vscode_programs/harkirat2.0/photo-ai/photo-ai/apps/backend/.env)

**Remove (no longer needed):**
```env
S3_ACCESS_KEY=...
S3_SECRET_KEY=...
BUCKET_NAME=...
ENDPOINT=...
```

**Add:**
```env
# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

---

## Verification Plan

### Automated Tests

1. **Backend Endpoint Test:**
   ```bash
   curl http://localhost:8080/pre-signed-url
   ```
   Expected response:
   ```json
   {
     "url": "https://api.cloudinary.com/v1_1/xxx/raw/upload",
     "key": "models/1234567890_abc123",
     "signature": "...",
     "timestamp": 1234567890,
     "apiKey": "...",
     "cloudName": "..."
   }
   ```

2. **Upload Test:**
   - Create a test ZIP file
   - Use the signed parameters to upload to Cloudinary
   - Verify the file is accessible via the returned `secure_url`

### Manual Verification

1. Navigate to `/dashboard` → **Train Model** tab
2. Upload sample images and proceed through the training wizard
3. Verify:
   - ✅ ZIP file is created successfully
   - ✅ Upload progress bar works correctly
   - ✅ Training starts with the correct Cloudinary URL
   - ✅ Check Cloudinary dashboard for uploaded files

---

## File Summary

| File | Action | Description |
|------|--------|-------------|
| `apps/backend/lib/cloudinary.ts` | NEW | Cloudinary configuration utility |
| `apps/backend/index.ts` | MODIFY | Update presigned URL endpoint |
| `apps/web/components/Train.tsx` | MODIFY | Update upload logic |
| `apps/backend/.env` | MODIFY | Add Cloudinary env vars |
| `apps/backend/package.json` | MODIFY | Add cloudinary dependency |
