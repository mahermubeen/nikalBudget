// api/app.ts
import type { VercelRequest, VercelResponse } from "@vercel/node";
import createApp from "../server/app";

const app = createApp(); // build once, reuse

export default function handler(req: VercelRequest, res: VercelResponse) {
  return (app as any)(req, res);
}
