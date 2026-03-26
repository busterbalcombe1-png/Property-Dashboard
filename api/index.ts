import type { VercelRequest, VercelResponse } from '@vercel/node';
import app from '../artifacts/api-server/src/app';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  return new Promise((resolve, reject) => {
    app(req as any, res as any, (err: any) => {
      if (err) reject(err);
      else resolve(undefined);
    });
  });
}
