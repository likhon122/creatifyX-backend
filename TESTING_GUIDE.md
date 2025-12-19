# Testing the Updated File Upload System

## Quick Test Guide

### 1. Test ZIP File Upload with Multiple Previews

```bash
# Using curl (Windows PowerShell)
$uri = "http://localhost:5000/api/assets"
$token = "YOUR_AUTH_TOKEN"

$form = @{
    file = Get-Item "C:\path\to\project.zip"
    preview = @(
        Get-Item "C:\path\to\preview1.jpg"
        Get-Item "C:\path\to\preview2.png"
        Get-Item "C:\path\to\preview3.jpg"
    )
    data = @{
        title = "My Project Files"
        assetType = "web"
        categories = @("category_id_here")
        tags = @("project", "website", "template")
        isPremium = $true
    } | ConvertTo-Json
}

Invoke-WebRequest -Uri $uri -Method POST -Headers @{Authorization="Bearer $token"} -Form $form
```

### 2. Verify Temp File Cleanup

After any upload (success or failure), check the uploads directory:

```powershell
Get-ChildItem C:\Users\ADMIN\Desktop\CreatifyX\backend\uploads
```

The directory should be empty or only contain very recent uploads currently in progress.

### 3. Check Database

After successful upload, verify in MongoDB:

```javascript
// In MongoDB Compass or shell
db.assets.findOne(
  {},
  {
    title: 1,
    'previews.thumbnail': 1,
    'previews.images': 1,
    'storage.bytes': 1,
    'storage.resource_type': 1,
  }
);
```

For ZIP files with multiple previews, you should see:

- `previews.thumbnail`: First preview image
- `previews.images`: Array of all preview images (1-5 items)
- `storage.resource_type`: "raw"

---

## Validation Test Cases

### ✅ Should Pass:

1. **ZIP with 1 preview (minimum)**

   - File: project.zip (< 500MB)
   - Preview: preview1.jpg (500KB - 5MB)

2. **ZIP with 5 previews (maximum)**

   - File: project.zip (< 500MB)
   - Previews: 5 JPG/PNG files (each 500KB - 5MB)

3. **Video with preview**

   - File: video.mp4 (30MB-500MB, 5-300 seconds)
   - Preview: preview.mp4 (< 15 seconds)

4. **Image without preview**
   - File: photo.jpg (< 10MB, 4MP-25MP)
   - Preview: None (auto-generated)

### ❌ Should Fail:

1. **ZIP without preview**

   - Error: "At least 1 preview image is required for ZIP files."

2. **ZIP with too many previews**

   - 6 preview files
   - Error: "Maximum 5 preview images are allowed."

3. **ZIP with invalid preview format**

   - Preview: preview.pdf
   - Error: "Preview images must be in JPG or PNG format."

4. **ZIP with undersized preview**

   - Preview: small.jpg (200KB)
   - Error: "Each preview image must be between 500KB and 5MB."

5. **ZIP with oversized preview**

   - Preview: large.jpg (10MB)
   - Error: "Each preview image must be between 500KB and 5MB."

6. **ZIP over 500MB**
   - File: huge-project.zip (600MB)
   - Error: "ZIP files must be 500MB or smaller."

---

## Monitor Temp Files During Upload

Run this in a separate PowerShell window to monitor temp files in real-time:

```powershell
while ($true) {
    Clear-Host
    Write-Host "=== Uploads Directory Monitor ===" -ForegroundColor Cyan
    Write-Host "Time: $(Get-Date -Format 'HH:mm:ss')`n"

    $files = Get-ChildItem "C:\Users\ADMIN\Desktop\CreatifyX\backend\uploads" -File

    if ($files) {
        Write-Host "Temporary Files Found:" -ForegroundColor Yellow
        $files | Format-Table Name, Length, LastWriteTime -AutoSize
    } else {
        Write-Host "✓ No temporary files (Clean!)" -ForegroundColor Green
    }

    Start-Sleep -Seconds 2
}
```

Press `Ctrl+C` to stop monitoring.

---

## Expected Behavior

### On Successful Upload:

1. Files validated ✓
2. Main file uploaded to Cloudinary ✓
3. Preview(s) uploaded to Cloudinary ✓
4. Asset document created in MongoDB ✓
5. **All temp files deleted** ✓
6. Response returned to client ✓

### On Failed Upload:

1. Validation error detected ✗
2. **All temp files deleted immediately** ✓
3. Error response returned to client ✓

---

## Common Issues & Solutions

### Issue: Temp files not being deleted

**Check:**

- File permissions on `uploads/` directory
- Disk space available
- Error logs for file deletion failures

**Fix:**

```powershell
# Grant full permissions
icacls "C:\Users\ADMIN\Desktop\CreatifyX\backend\uploads" /grant Users:F /T
```

### Issue: "File too large" error with ZIP < 500MB

**Check:**

- Nginx/reverse proxy upload limit
- Express `body-parser` limit
- Multer configuration

**Fix already applied in code:**

```typescript
const limits = {
  fileSize: 500 * 1024 * 1024, // 500MB
};
```

### Issue: Preview images not showing watermark

**Check:**

- Watermark public_id configured in environment variables
- Cloudinary watermark image exists
- Cloudinary account has transformation enabled

**Verify:**

```typescript
// In src/app/config/index.ts
console.log('Watermark Public ID:', watermarkPublicId);
```
