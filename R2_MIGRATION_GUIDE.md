# Cloudflare R2 Migration Guide

This guide will help you migrate from UploadThing to Cloudflare R2.

## Prerequisites

1. Cloudflare account with R2 enabled
2. R2 bucket created
3. API tokens with R2:Read and R2:Write permissions

## Step 1: Install Dependencies

```bash
npm install @aws-sdk/client-s3 @aws-sdk/lib-storage
npm install -D dotenv
```

## Step 2: Configure Environment Variables

Add these to your `.env` file:

```env
# Cloudflare R2 Configuration
R2_ACCOUNT_ID=your_account_id
R2_ACCESS_KEY_ID=your_access_key_id
R2_SECRET_ACCESS_KEY=your_secret_access_key
R2_BUCKET_NAME=your-bucket-name
R2_PUBLIC_URL=https://your-bucket.r2.dev
# Or use custom domain: https://cdn.yourdomain.com
```

## Step 3: Setup CORS

Run the CORS setup script to enable video playback:

```bash
npm run setup-r2-cors
```

## Step 4: Backup Database URLs

Before migrating, backup your current database URLs:

```bash
npm run backup-db-urls
```

This creates a backup in the `backups/` directory.

## Step 5: Download Existing Files (Optional)

If you have files in UploadThing that need to be migrated:

1. Download all files from UploadThing to a local `downloads/` directory
2. Run the upload script:

```bash
npm run upload-to-r2
```

This will:
- Upload all files from `downloads/` to R2
- Create a mapping file: `uploadthing-to-r2-mapping.json`

**Note:** You may need to manually update the `uploadthingUrl` values in the mapping file to match your actual UploadThing URLs from the database.

## Step 6: Migrate Database URLs

After uploading files and creating the mapping, migrate your database:

```bash
npm run migrate-db-to-r2
```

This updates:
- User images (`User.image`)
- Course images (`Course.imageUrl`)
- Chapter videos (`Chapter.videoUrl`)
- Chapter attachments (`ChapterAttachment.url`)

## Step 7: Update Components

### Using R2FileUpload Component

Replace `FileUpload` with `R2FileUpload` in your components:

```tsx
import { R2FileUpload } from "@/components/r2-file-upload";

<R2FileUpload
  onChange={(res) => {
    if (res) {
      // res.url contains the R2 URL
      // res.name contains the file name
    }
  }}
  folder="images" // Optional: specify folder (images, videos, documents, etc.)
  accept="image/*" // Optional: file type filter
  maxSize={4 * 1024 * 1024} // Optional: max file size in bytes (4MB)
/>
```

### Video Player

The `PlyrVideoPlayer` component now supports R2 video URLs:

```tsx
<PlyrVideoPlayer
  videoUrl="https://your-bucket.r2.dev/videos/video.mp4"
  videoType="R2"
  onEnded={() => {}}
  onTimeUpdate={(time) => {}}
/>
```

## Features

✅ Real-time upload progress tracking via Server-Sent Events (SSE)
✅ Multipart uploads for large files (>5MB)
✅ Automatic Content-Type detection
✅ Organized folder structure (images/, videos/, documents/, etc.)
✅ CORS configuration for video playback
✅ Database migration with URL mapping
✅ Drag & drop file uploads
✅ Error handling and retry logic

## Troubleshooting

### Videos not playing
- Check CORS configuration: `npm run setup-r2-cors`
- Verify R2 bucket has public access enabled
- Check browser console for CORS errors

### Upload stuck at 10%
- Verify R2 credentials in `.env`
- Check R2 bucket name is correct
- Ensure R2_PUBLIC_URL is set correctly

### Progress not updating
- Check browser console for SSE stream errors
- Verify API route `/api/r2/upload` is accessible
- Check network tab for SSE connection

### Database migration fails
- Ensure mapping file exists: `uploadthing-to-r2-mapping.json`
- Verify database connection
- Check backup was created successfully

## Next Steps

1. Test file uploads with the new R2FileUpload component
2. Test video playback with R2 URLs
3. Verify all database URLs are updated correctly
4. Monitor R2 usage and costs in Cloudflare Dashboard

## Support

For issues or questions, check:
- Cloudflare R2 Documentation: https://developers.cloudflare.com/r2/
- AWS S3 SDK Documentation (R2 is S3-compatible): https://docs.aws.amazon.com/sdk-for-javascript/v3/

