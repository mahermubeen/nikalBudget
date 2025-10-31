import { createClient, SupabaseClient } from "@supabase/supabase-js";
import session from "express-session";
import connectPg from "connect-pg-simple";
import type { Express, RequestHandler } from "express";
import { storage } from "./storage";

// Extend Express Request to include Supabase user
declare global {
  namespace Express {
    interface Request {
      supabaseUser?: {
        id: string;
        email: string;
      };
    }
  }
}

// Initialize Supabase client
let supabase: SupabaseClient | null = null;

function getSupabaseClient() {
  if (supabase) return supabase;

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.warn("⚠️  Supabase credentials not found - running in DEV mode");
    return null;
  }

  supabase = createClient(supabaseUrl, supabaseKey);
  return supabase;
}

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: sessionTtl,
    },
  });
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());

  const supabaseClient = getSupabaseClient();

  // Development mode - simple bypass auth
  if (!supabaseClient) {
    console.log("⚠️  Running in DEVELOPMENT mode without authentication");
    console.log("📝 Auto-login available at /api/login (demo-user-123)");

    app.get("/api/login", async (req: any, res) => {
      const devUser = {
        id: "demo-user-123",
        email: "demo@budgetnikal.com",
        firstName: "Demo",
        lastName: "User",
      };

      // Store user in session
      req.session.user = devUser;

      // Ensure user exists in database
      await storage.upsertUser({
        ...devUser,
        profileImageUrl: null,
      });

      res.redirect("/");
    });

    app.get("/api/logout", (req: any, res) => {
      req.session.destroy(() => {
        res.redirect("/");
      });
    });

    app.post("/api/auth/signup", async (req, res) => {
      res.status(400).json({
        message: "Signup is disabled in development mode. Use /api/login instead."
      });
    });

    app.post("/api/auth/signin", async (req, res) => {
      res.redirect("/api/login");
    });

    return;
  }

  // Production mode - Supabase Auth
  console.log("✅ Supabase Auth enabled");

  // Sign up endpoint
  app.post("/api/auth/signup", async (req, res) => {
    try {
      const { email, password, firstName, lastName } = req.body;

      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }

      const { data, error } = await supabaseClient.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName || "",
            last_name: lastName || "",
          },
        },
      });

      if (error) {
        return res.status(400).json({ message: error.message });
      }

      if (!data.user) {
        return res.status(400).json({ message: "Failed to create user" });
      }

      // Store user in our database
      await storage.upsertUser({
        id: data.user.id,
        email: data.user.email!,
        firstName: firstName || "",
        lastName: lastName || "",
        profileImageUrl: data.user.user_metadata?.avatar_url || null,
      });

      // Store in session
      (req.session as any).user = {
        id: data.user.id,
        email: data.user.email!,
      };

      res.json({
        message: "Signup successful. Please check your email to verify your account.",
        user: {
          id: data.user.id,
          email: data.user.email,
        }
      });
    } catch (error: any) {
      console.error("Signup error:", error);
      res.status(500).json({ message: "Signup failed" });
    }
  });

  // Sign in endpoint
  app.post("/api/auth/signin", async (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }

      const { data, error } = await supabaseClient.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return res.status(401).json({ message: error.message });
      }

      if (!data.user) {
        return res.status(401).json({ message: "Authentication failed" });
      }

      // Store user in our database
      await storage.upsertUser({
        id: data.user.id,
        email: data.user.email!,
        firstName: data.user.user_metadata?.first_name || "",
        lastName: data.user.user_metadata?.last_name || "",
        profileImageUrl: data.user.user_metadata?.avatar_url || null,
      });

      // Store in session
      (req.session as any).user = {
        id: data.user.id,
        email: data.user.email!,
        accessToken: data.session?.access_token,
        refreshToken: data.session?.refresh_token,
      };

      res.json({
        message: "Login successful",
        user: {
          id: data.user.id,
          email: data.user.email,
        },
      });
    } catch (error: any) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  // Legacy endpoints for compatibility
  app.get("/api/login", (req, res) => {
    res.status(400).json({
      message: "Please use POST /api/auth/signin to log in"
    });
  });

  app.get("/api/logout", async (req: any, res) => {
    const sessionUser = req.session.user;

    if (sessionUser?.accessToken) {
      await supabaseClient.auth.signOut();
    }

    req.session.destroy(() => {
      res.redirect("/");
    });
  });
}

export const isAuthenticated: RequestHandler = async (req: any, res, next) => {
  const supabaseClient = getSupabaseClient();

  // Development mode - check session only
  if (!supabaseClient) {
    if (req.session?.user) {
      req.supabaseUser = req.session.user;
      return next();
    }
    return res.status(401).json({ message: "Unauthorized. Please visit /api/login" });
  }

  // Production mode - validate Supabase session
  const sessionUser = req.session?.user;

  if (!sessionUser) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  // Verify token is still valid with Supabase
  if (sessionUser.accessToken) {
    const { data, error } = await supabaseClient.auth.getUser(sessionUser.accessToken);

    if (error || !data.user) {
      // Token expired or invalid, try to refresh
      if (sessionUser.refreshToken) {
        const { data: refreshData, error: refreshError } =
          await supabaseClient.auth.refreshSession({
            refresh_token: sessionUser.refreshToken,
          });

        if (refreshError || !refreshData.session) {
          return res.status(401).json({ message: "Session expired. Please log in again." });
        }

        // Update session with new tokens
        req.session.user = {
          id: refreshData.user!.id,
          email: refreshData.user!.email!,
          accessToken: refreshData.session.access_token,
          refreshToken: refreshData.session.refresh_token,
        };

        req.supabaseUser = {
          id: refreshData.user!.id,
          email: refreshData.user!.email!,
        };

        return next();
      }

      return res.status(401).json({ message: "Session expired. Please log in again." });
    }

    req.supabaseUser = {
      id: data.user.id,
      email: data.user.email!,
    };
  } else {
    // Session exists but no token (dev mode or old session)
    req.supabaseUser = sessionUser;
  }

  next();
};

// Helper to get user ID from request (works in both dev and prod)
export function getUserId(req: any): string {
  return req.supabaseUser?.id || req.session?.user?.id;
}
