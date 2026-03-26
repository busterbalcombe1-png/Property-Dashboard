import app from '../artifacts/api-server/src/app';
import type { IncomingMessage, ServerResponse } from 'http';

export default function handler(req: IncomingMessage, res: ServerResponse) {
  return new Promise<void>((resolve, reject) => {
    app.handle(req as any, res as any, (err: unknown) => {
      if (err) reject(err);
      else resolve();
    });
  });
}
