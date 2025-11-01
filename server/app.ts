// server/app.ts
import "dotenv/config";
import express, { Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";

declare module "http" { interface IncomingMessage { rawBody: unknown } }

let appInstance: express.Express | null = null;

export default async function createApp() {
  // Return cached instance if already initialized
  if (appInstance) return appInstance;

  const app = express();

  app.use(express.json({
    verify: (req: any, _res, buf) => { req.rawBody = buf; }
  }));
  app.use(express.urlencoded({ extended: false }));

  // lightweight API log
  app.use((req, res, next) => {
    const start = Date.now(); let body: any;
    const orig = res.json.bind(res);
    (res as any).json = (b: any) => { body = b; return orig(b); };
    res.on("finish", () => {
      if (req.path.startsWith("/api"))
        console.log(`${req.method} ${req.path} ${res.statusCode} in ${Date.now()-start}ms`);
    });
    next();
  });

  // ⬇️ mount all your routes under /api inside registerRoutes
  // IMPORTANT: registerRoutes is async because it sets up auth
  await registerRoutes(app);

  // health
  app.get("/api/health", (_req, res) => res.json({ ok: true }));

  // error handler
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    res.status(status).json({ message: err.message || "Internal Server Error" });
  });

  appInstance = app;
  return app;
}
