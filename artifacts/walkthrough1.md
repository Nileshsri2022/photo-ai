# Cloudinary Migration Walkthrough

## Summary

Successfully migrated the photo-ai project from **Storj S3** storage to **Cloudinary** for ZIP file uploads used in AI model training.

---

## Changes Made

### 1. Backend Changes

#### [NEW] [cloudinary.ts](file:///f:/vscode_programs/harkirat2.0/photo-ai/photo-ai/apps/backend/lib/cloudinary.ts)

Created a new Cloudinary configuration utility:

```typescript
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export { cloudinary };
```

---

#### [MODIFIED] [index.ts](file:///f:/vscode_programs/harkirat2.0/photo-ai/photo-ai/apps/backend/index.ts)

Updated the `/pre-signed-url` endpoint to generate Cloudinary signed upload parameters:

render_diffs(file:///f:/vscode_programs/harkirat2.0/photo-ai/photo-ai/apps/backend/index.ts)

---

### 2. Frontend Changes

#### [MODIFIED] [Train.tsx](file:///f:/vscode_programs/harkirat2.0/photo-ai/photo-ai/apps/web/components/Train.tsx)

Updated upload logic to use Cloudinary's FormData upload format:

render_diffs(file:///f:/vscode_programs/harkirat2.0/photo-ai/photo-ai/apps/web/components/Train.tsx)

---

#### [MODIFIED] [config.ts](file:///f:/vscode_programs/harkirat2.0/photo-ai/photo-ai/apps/web/app/config.ts)

Removed `CLOUDFLARE_URL` since Cloudinary provides the full URL in its response.

---

### 3. Configuration Changes

#### [MODIFIED] [.env](file:///f:/vscode_programs/harkirat2.0/photo-ai/photo-ai/apps/backend/.env)

Replaced Storj variables with Cloudinary:

```diff
- # Storj secrets
- S3_ACCESS_KEY="..."
- S3_SECRET_KEY="..."
- BUCKET_NAME="..."
- ENDPOINT="..."

+ # Cloudinary Configuration
+ CLOUDINARY_CLOUD_NAME="your_cloud_name"
+ CLOUDINARY_API_KEY="your_api_key"
+ CLOUDINARY_API_SECRET="your_api_secret"
```

#### [MODIFIED] [docker-compose.yml](file:///f:/vscode_programs/harkirat2.0/photo-ai/photo-ai/docker-compose.yml)

Updated environment variables for Docker deployment.

---

## Next Steps

> [!IMPORTANT]
> **Before testing**, you must add your Cloudinary credentials:

1. Go to [Cloudinary Dashboard](https://console.cloudinary.com/settings/api-keys)
2. Copy your credentials:
   - Cloud Name
   - API Key
   - API Secret
3. Update `apps/backend/.env`:
   ```env
   CLOUDINARY_CLOUD_NAME="your_actual_cloud_name"
   CLOUDINARY_API_KEY="your_actual_api_key"
   CLOUDINARY_API_SECRET="your_actual_api_secret"
   ```

---

## Testing

1. **Start the backend:**
   ```bash
   cd apps/backend
   npm run dev
   ```

2. **Test the presigned URL endpoint:**
   ```bash
   curl http://localhost:8080/pre-signed-url
   ```
   
   Expected response:
   ```json
   {
     "url": "https://api.cloudinary.com/v1_1/your_cloud_name/raw/upload",
     "key": "models/1234567890_abc123",
     "signature": "...",
     "timestamp": 1234567890,
     "apiKey": "...",
     "cloudName": "..."
   }
   ```

3. **Test full upload flow:**
   - Navigate to `/dashboard` → **Train Model** tab
   - Upload sample images
   - Verify ZIP file uploads successfully
   - Check [Cloudinary Media Library](https://console.cloudinary.com/console) for uploaded files

---

## Files Modified

| File | Change |
|------|--------|
| `apps/backend/lib/cloudinary.ts` | ✅ Created |
| `apps/backend/index.ts` | ✅ Updated endpoint |
| `apps/backend/.env` | ✅ Added Cloudinary vars |
| `apps/backend/package.json` | ✅ Added cloudinary dependency |
| `apps/web/components/Train.tsx` | ✅ Updated upload logic |
| `apps/web/app/config.ts` | ✅ Removed CLOUDFLARE_URL |
| `docker-compose.yml` | ✅ Updated env vars |
