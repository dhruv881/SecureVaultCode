import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { storage } from "./storage";

// User type for passport
interface User {
  id: string;
  email: string;
  name: string;
  picture?: string;
}

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'fallback-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Passport configuration
app.use(passport.initialize());
app.use(passport.session());

// Passport Google OAuth Strategy
const callbackURL = process.env.NODE_ENV === 'production' 
  ? `https://${process.env.REPLIT_DEV_DOMAIN}/auth/google/callback`
  : `http://localhost:${process.env.PORT || '5000'}/auth/google/callback`;

console.log('🔧 OAuth Config:');
console.log('  - Client ID:', process.env.GOOGLE_CLIENT_ID ? '✅ Set' : '❌ Missing');
console.log('  - Client Secret:', process.env.GOOGLE_CLIENT_SECRET ? '✅ Set' : '❌ Missing');
console.log('  - Callback URL:', callbackURL);

passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID!,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
  callbackURL: callbackURL
}, async (accessToken, refreshToken, profile, done) => {
  try {
    const user: User = {
      id: profile.id,
      email: profile.emails?.[0].value || '',
      name: profile.displayName || '',
      picture: profile.photos?.[0].value
    };
    return done(null, user);
  } catch (error) {
    return done(error, undefined);
  }
}));

passport.serializeUser((user: any, done) => {
  done(null, user);
});

passport.deserializeUser((user: any, done) => {
  done(null, user);
});

// Authentication routes
app.get('/auth/google', (req, res, next) => {
  console.log('🚀 Starting Google OAuth flow');
  console.log('  - Request URL:', req.url);
  console.log('  - Host:', req.get('Host'));
  console.log('  - Protocol:', req.protocol);
  console.log('  - Full URL:', `${req.protocol}://${req.get('Host')}${req.url}`);
  passport.authenticate('google', { scope: ['profile', 'email'] })(req, res, next);
});

app.get('/auth/google/callback',
  (req, res, next) => {
    console.log('🔄 Google OAuth callback received');
    console.log('  - Request URL:', req.url);
    console.log('  - Host:', req.get('Host'));
    console.log('  - Protocol:', req.protocol);
    console.log('  - Query params:', req.query);
    next();
  },
  passport.authenticate('google', { 
    failureRedirect: '/login',
    failureMessage: true
  }),
  (req, res) => {
    console.log('✅ OAuth success, redirecting to /');
    res.redirect('/');
  }
);

app.post('/auth/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({ error: 'Logout failed' });
    }
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: 'Session destruction failed' });
      }
      res.json({ success: true });
    });
  });
});

// Get current user
app.get('/api/auth/user', (req, res) => {
  if (req.isAuthenticated()) {
    res.json(req.user);
  } else {
    res.status(401).json({ error: 'Not authenticated' });
  }
});

// Authentication middleware for API routes
const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: 'Authentication required' });
};

// Apply auth middleware to all API routes except auth endpoints
app.use('/api', (req, res, next) => {
  if (req.path.startsWith('/auth/')) {
    return next();
  }
  return requireAuth(req, res, next);
});

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Enable OCR scanning for expiry dates
  process.env.ENABLE_REMOTE_OCR = 'true';
  
  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  const host = process.env.NODE_ENV === 'production' ? "0.0.0.0" : "localhost";
  server.listen(port, host, () => {
    log(`serving on http://${host}:${port}`);
  });
})();
