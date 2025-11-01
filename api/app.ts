// api/app.ts
import type { VercelRequest, VercelResponse } from "@vercel/node";
import createApp from "../server/app";

let appPromise: Promise<any> | null = null;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // Create app once and cache the promise
    if (!appPromise) {
      appPromise = createApp();
    }

    const app = await appPromise;
    return app(req, res);
  } catch (error) {
    console.error("Error initializing app:", error);
    res.status(500).json({
      message: "Server initialization failed",
      error: error instanceof Error ? error.message : String(error)
    });
  }
}
