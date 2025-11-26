import { Router, Response } from 'express';
import { tokenRequired, AuthRequest } from '../middleware/auth';
import { config } from '../config';
import * as path from 'path';
import * as fs from 'fs';

const router = Router();

router.get('/:file_path(*)', tokenRequired, (req: AuthRequest, res: Response) => {
  try {
    const filePath = req.params.file_path;
    const audioDir = path.resolve(config.audio.filesDir);
    const fullPath = path.join(audioDir, filePath);

    // Security check: ensure the file is within the audio directory
    if (!fullPath.startsWith(audioDir)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ error: 'Audio file not found' });
    }

    // Determine MIME type based on extension
    const ext = path.extname(fullPath).toLowerCase();
    let mimetype = 'audio/mpeg'; // Default

    if (ext === '.mp3') {
      mimetype = 'audio/mpeg';
    } else if (ext === '.ogg' || ext === '.oga') {
      mimetype = 'audio/ogg';
    } else if (ext === '.wav') {
      mimetype = 'audio/wav';
    }

    res.setHeader('Content-Type', mimetype);
    res.sendFile(fullPath);
  } catch (error: any) {
    console.error('Error serving audio file:', error);
    return res.status(500).json({ error: error.message });
  }
});

export default router;



