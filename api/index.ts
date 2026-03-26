import app from '../artifacts/api-server/src/app';

// Express app is a valid Node.js request handler; cast resolves TS typing gap
export default app as any;
