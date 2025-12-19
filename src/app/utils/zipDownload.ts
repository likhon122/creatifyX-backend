import archiver from 'archiver';
import { Response } from 'express';
import axios from 'axios';
import { Readable } from 'stream';

export interface FileToZip {
  url: string;
  filename: string;
}

/**
 * Download a file from URL and return as stream
 */
async function downloadFile(url: string): Promise<Readable> {
  const response = await axios({
    url,
    method: 'GET',
    responseType: 'stream',
  });
  return response.data;
}

/**
 * Create a zip archive and stream it to the response
 */
export async function createZipDownload(
  res: Response,
  files: FileToZip[],
  zipFilename: string
): Promise<void> {
  // Set response headers for zip download
  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename="${zipFilename}"`);

  // Create archiver instance
  const archive = archiver('zip', {
    zlib: { level: 9 }, // Maximum compression
  });

  // Handle errors
  archive.on('error', err => {
    throw err;
  });

  // Pipe archive to response
  archive.pipe(res);

  // Add each file to the archive
  for (const file of files) {
    try {
      const stream = await downloadFile(file.url);
      archive.append(stream, { name: file.filename });
    } catch (error) {
      console.error(`Failed to download ${file.filename}:`, error);
      // Continue with other files even if one fails
    }
  }

  // Finalize the archive
  await archive.finalize();
}
