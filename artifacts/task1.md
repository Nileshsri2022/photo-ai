# Task: Switch from Storj to Cloudinary

## Overview
Migrate the file storage system from Storj (S3-compatible) to Cloudinary for ZIP file uploads used in AI model training.

## Checklist

### Planning
- [x] Analyze current Storj implementation
- [x] Create implementation plan
- [ ] Get user approval

### Execution
- [ ] Install Cloudinary SDK in backend
- [ ] Create Cloudinary configuration utility
- [ ] Update `/pre-signed-url` endpoint for Cloudinary signed uploads
- [ ] Update frontend `Train.tsx` upload logic
- [ ] Update `.env` file with Cloudinary variables
- [ ] Remove unused Storj imports and dependencies

### Verification
- [ ] Test file upload flow
- [ ] Verify ZIP files are accessible via Cloudinary URL
- [ ] Create walkthrough documentation
