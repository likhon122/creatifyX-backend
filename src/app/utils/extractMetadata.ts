import fs from 'fs/promises';
import path from 'path';

// @ts-expect-error - third-party package lacks TypeScript declarations in this project
import ffmpeg from 'fluent-ffmpeg';
// @ts-expect-error - third-party package lacks TypeScript declarations in this project
import ffprobeStatic from 'ffprobe-static';
// @ts-expect-error - third-party package lacks TypeScript declarations in this project
import exifParser from 'exif-parser';

ffmpeg.setFfprobePath((ffprobeStatic as { path?: string }).path || '');

async function extractMetadata(filePath: string, mimetype?: string) {
  const result: {
    resolution?: string;
    duration?: number;
    fileFormat?: string;
    bytes?: number;
    width?: number;
    height?: number;
  } = {};

  try {
    const ext = path.extname(filePath).replace('.', '').toLowerCase();
    result.fileFormat = ext || undefined;

    const stat = await fs.stat(filePath);
    result.bytes = stat.size;

    if (mimetype && mimetype.startsWith('video')) {
      type FFProbeFormat = { duration?: number; format_name?: string };
      type FFProbeStream = { width?: number; height?: number };
      type FFProbeResult = {
        format?: FFProbeFormat;
        streams?: FFProbeStream[];
      };

      const info = await new Promise<FFProbeResult>((resolve, reject) => {
        ffmpeg.ffprobe(
          filePath,
          (err: Error | null, metadata: FFProbeResult | undefined) => {
            if (err) return reject(err);
            resolve((metadata as FFProbeResult) ?? {});
          }
        );
      });

      if (info && info.format) {
        result.duration = info.format.duration
          ? Math.floor(info.format.duration)
          : undefined;
        result.fileFormat = info.format.format_name || result.fileFormat;
      }

      if (info && Array.isArray(info.streams)) {
        const videoStream = info.streams.find(
          s => (s as FFProbeStream).width && (s as FFProbeStream).height
        ) as FFProbeStream | undefined;
        if (videoStream) {
          result.width = videoStream.width;
          result.height = videoStream.height;
          if (videoStream.width && videoStream.height) {
            result.resolution = `${videoStream.width}x${videoStream.height}`;
          }
        }
      }
    } else if (mimetype && mimetype.startsWith('image')) {
      const buffer = await fs.readFile(filePath);
      try {
        const parser = exifParser.create(buffer);
        const parsed = parser.parse();
        if (parsed && parsed.tags) {
          const w = parsed.tags.ImageWidth || parsed.tags.PixelXDimension;
          const h = parsed.tags.ImageHeight || parsed.tags.PixelYDimension;
          if (w && h) {
            result.width = w;
            result.height = h;
            result.resolution = `${w}x${h}`;
          }
        }
      } catch {
        // ignore exif parse errors
      }
    } else {
      result.fileFormat = result.fileFormat || 'bin';
    }
  } catch {
    // swallow errors
  }

  return result;
}

export default extractMetadata;
