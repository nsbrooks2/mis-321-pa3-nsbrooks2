import { createServer } from '../server';

let cachedApp: any = null;

export default async (req: any, res: any) => {
  try {
    if (!cachedApp) {
      console.log("[Vercel] Initializing new Express instance...");
      cachedApp = await createServer();
    }
    return cachedApp(req, res);
  } catch (err: any) {
    console.error("[Vercel] Runtime Error in API entry point:", err);
    res.status(500).json({ 
      error: "Basecamp server failed to initialize.",
      message: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
};
