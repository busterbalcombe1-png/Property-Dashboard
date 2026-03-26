import type { IncomingMessage, ServerResponse } from 'http';

let appModule: any = null;
let loadError: string | null = null;

async function loadApp() {
  if (appModule) return appModule;
  if (loadError) throw new Error(loadError);
  try {
    const mod = await import('../artifacts/api-server/src/app.js');
    appModule = mod.default;
    return appModule;
  } catch (err: unknown) {
    loadError = err instanceof Error ? `${err.message}\n${err.stack}` : String(err);
    throw new Error(loadError);
  }
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  try {
    const app = await loadApp();
    await new Promise<void>((resolve, reject) => {
      app(req, res, (err?: unknown) => {
        if (err) reject(err);
        else resolve();
      });
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ crashed: true, error: message }));
  }
}
