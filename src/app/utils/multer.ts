import multer, { FileFilterCallback } from 'multer';
import path from 'path';
import fs from 'fs';
import { Request } from 'express';

const uploadDir = path.join(process.cwd(), 'uploads');

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (
    _req: Request,
    _file: Express.Multer.File,
    cb: (error: Error | null, destination: string) => void
  ) {
    cb(null, uploadDir + path.sep);
  },
  filename: function (
    _req: Request,
    file: Express.Multer.File,
    cb: (error: Error | null, filename: string) => void
  ) {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const extension = path.extname(file.originalname || '');
    const safeName = (file.fieldname || 'file').replace(/[^a-zA-Z0-9-_]/g, '_');
    cb(null, `${safeName}-${uniqueSuffix}${extension}`);
  },
});

const fileFilter = (
  req: Request,
  file: Express.Multer.File,
  cb: FileFilterCallback
) => {
  const allowedMimePrefixes = ['image/', 'video/', 'audio/'];
  const allowedExact = [
    'application/zip',
    'application/x-zip-compressed',
    'application/octet-stream',
  ];

  const isAllowed =
    allowedMimePrefixes.some(prefix => file.mimetype.startsWith(prefix)) ||
    allowedExact.includes(file.mimetype);

  if (isAllowed) {
    cb(null, true);
  } else {
    cb(new Error('Unsupported file type'));
  }
};

const limits = {
  fileSize: 500 * 1024 * 1024, // 500MB (to support large ZIP files)
};

const upload = multer({ storage, fileFilter, limits });

export default upload;
