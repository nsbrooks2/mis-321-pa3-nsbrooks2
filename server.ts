import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import { createClient } from "@supabase/supabase-js";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function createServer() {
  const app = express();
  const PORT = 3000;

  const trailsPath = path.resolve(__dirname, "src/data/trails.json");
  console.log(`[Server] Loading trails from: ${trailsPath}`);
  let trailsData = [];
  try {
    trailsData = JSON.parse(fs.readFileSync(trailsPath, "utf-8"));
    console.log(`[Server] Loaded ${trailsData.length} trails.`);
  } catch (err) {
    console.error(`[Server] FAILED to load trails:`, err);
  }

  app.use(express.json());

  // Initialize Supabase (Backend Service Role)
  function sanitizeSupabaseUrl(url: string | undefined): string {
    if (!url) return "";
    let sanitized = url.trim();
    sanitized = sanitized.replace(/\/+$/, "");
    sanitized = sanitized.replace(/\/rest\/v1$/, "");
    if (sanitized && !sanitized.startsWith('http')) {
      sanitized = `https://${sanitized}`;
    }
    return sanitized;
  }

  const supabaseUrl = sanitizeSupabaseUrl(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL);
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  const supabase = supabaseUrl && supabaseServiceKey ? createClient(supabaseUrl, supabaseServiceKey) : null;

  // Initialize Gemini
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

  // Auth Middleware
  const authenticate = async (req: any, res: any, next: any) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !supabase) return res.status(401).json({ error: "Unauthorized" });

    const token = authHeader.split(" ")[1];
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) return res.status(401).json({ error: "Unauthorized" });
    req.user = user;
    next();
  };

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ 
      status: "ok", 
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      env: process.env.NODE_ENV
    });
  });

  app.post("/api/chat", authenticate, async (req: any, res: any) => {
    const { history, message, systemInstruction } = req.body;
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          ...(history || []),
          { role: 'user', parts: [{ text: message }] }
        ],
        config: {
          systemInstruction: systemInstruction || "You are SummitScout, a rugged AI trail guide."
        }
      });
      
      res.json({ text: response.text });
    } catch (err: any) {
      console.error("[Gemini] Chat Error:", err);
      res.status(500).json({ error: "Intelligence sync failed." });
    }
  });

  app.get("/api/trails", (req, res) => {
    const { q, difficulty, tags } = req.query;
    let filtered = [...trailsData];

    if (q) {
      const query = (q as string).toLowerCase();
      filtered = filtered.filter(t => 
        t.name.toLowerCase().includes(query) || 
        t.description.toLowerCase().includes(query)
      );
    }

    if (difficulty) {
      filtered = filtered.filter(t => t.difficulty.toLowerCase() === (difficulty as string).toLowerCase());
    }

    if (tags) {
      const tagList = (tags as string).split(",");
      filtered = filtered.filter(t => tagList.every(tag => t.tags.includes(tag)));
    }

    res.json(filtered);
  });

  app.get("/api/favorites", authenticate, async (req, res) => {
    if (!supabase) return res.status(503).json({ error: "Supabase not configured" });
    
    const userId = (req as any).user.id;
    try {
      const { data, error } = await supabase
        .from('favorites')
        .select('*')
        .eq('user_id', userId);
      
      if (error) throw error;
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/favorites", authenticate, async (req, res) => {
    if (!supabase) return res.status(503).json({ error: "Supabase not configured" });
    
    const { trailId } = req.body;
    const userId = (req as any).user.id;
    try {
      const insertData: any = { trail_id: trailId, user_id: userId };
      
      const { data, error } = await supabase
        .from('favorites')
        .insert([insertData])
        .select();
      
      if (error) throw error;
      res.json(data[0]);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Auth Callback for OAuth popups
  app.get(['/auth/callback', '/auth/callback/'], (req, res) => {
    res.send(`
      <html>
        <body style="background: #0C1109; color: #F2F4EF; font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; flex-direction: column;">
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS' }, '*');
              window.close();
            } else {
              window.location.href = '/';
            }
          </script>
          <div style="border: 2px solid #8BA85C; border-radius: 20px; padding: 40px; text-align: center; background: rgba(255,255,255,0.05); backdrop-blur: 10px;">
            <h2 style="margin: 0 0 10px 0;">Summoning Identity...</h2>
            <p style="opacity: 0.5; font-size: 14px;">The basecamp link is established. This window will close automatically.</p>
          </div>
        </body>
      </html>
    `);
  });

  // Profile Endpoints
  app.get("/api/profile/:id", async (req, res) => {
    if (!supabase) return res.status(503).json({ error: "Supabase not configured" });
    const { id } = req.params;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/profile", authenticate, async (req, res) => {
    if (!supabase) return res.status(503).json({ error: "Supabase not configured" });
    const { id, username, bio, avatar_url, banner_url } = req.body;
    const authUser = (req as any).user;
    
    // Prevent spoofing profiles
    if (id !== authUser.id) return res.status(403).json({ error: "Forbidden" });

    try {
      const { data, error } = await supabase
        .from('profiles')
        .upsert({ id, username, bio, avatar_url, banner_url, updated_at: new Date() })
        .select();
      
      if (error) throw error;
      res.json(data[0]);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // User Hikes (Wishlist and Completed)
  app.get("/api/user-hikes/:userId", async (req, res) => {
    if (!supabase) return res.status(503).json({ error: "Supabase not configured" });
    const { userId } = req.params;
    try {
      const { data, error } = await supabase
        .from('user_hikes')
        .select('*')
        .eq('user_id', userId);
      
      if (error) throw error;
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/user-hikes", authenticate, async (req, res) => {
    if (!supabase) return res.status(503).json({ error: "Supabase not configured" });
    const { userId, trailId, status, trailDetail } = req.body; // status: 'wishlist' | 'completed'
    const authUser = (req as any).user;

    if (userId !== authUser.id) return res.status(403).json({ error: "Forbidden" });

    try {
      const { data, error } = await supabase
        .from('user_hikes')
        .upsert({ 
          user_id: userId, 
          trail_id: trailId, 
          status, 
          trail_data: trailDetail,
          updated_at: new Date() 
        }, { onConflict: 'user_id,trail_id' })
        .select();
      
      if (error) throw error;
      res.json(data[0]);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Chat History Endpoints
  app.get("/api/chats/:userId", authenticate, async (req, res) => {
    if (!supabase) return res.status(503).json({ error: "Supabase not configured" });
    const { userId } = req.params;
    const authUser = (req as any).user;

    if (userId !== authUser.id) return res.status(403).json({ error: "Forbidden" });

    try {
      const { data, error } = await supabase
        .from('chats')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/chats", authenticate, async (req, res) => {
    if (!supabase) return res.status(503).json({ error: "Supabase not configured" });
    const { id, userId, title, messages } = req.body;
    const authUser = (req as any).user;

    if (userId !== authUser.id) return res.status(403).json({ error: "Forbidden" });

    try {
      const { data, error } = await supabase
        .from('chats')
        .upsert({ id, user_id: userId, title, messages, created_at: new Date() })
        .select();
      
      if (error) throw error;
      res.json(data[0]);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Review Endpoints
  app.get("/api/reviews/:trailId", async (req, res) => {
    if (!supabase) return res.status(503).json({ error: "Supabase not configured" });
    const { trailId } = req.params;
    try {
      const { data, error } = await supabase
        .from('reviews')
        .select('*')
        .eq('trail_id', trailId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/reviews", authenticate, async (req, res) => {
    if (!supabase) return res.status(503).json({ error: "Supabase not configured" });
    const { trail_id, user_id, username, avatar_url, rating, comment, photo_urls } = req.body;
    const authUser = (req as any).user;

    if (user_id !== authUser.id) return res.status(403).json({ error: "Forbidden" });

    try {
      const { data, error } = await supabase
        .from('reviews')
        .insert([{ trail_id, user_id, username, avatar_url, rating, comment, photo_urls }])
        .select();
      
      if (error) throw error;
      res.json(data[0]);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Social Post Endpoints
  app.get("/api/posts", async (req, res) => {
    if (!supabase) return res.status(503).json({ error: "Supabase not configured" });
    const { userId, trailId, location } = req.query;
    try {
      let query = supabase.from('posts').select('*').order('created_at', { ascending: false });
      if (userId) query = query.eq('user_id', userId);
      if (trailId) query = query.eq('trail_id', trailId);
      if (location) query = query.ilike('location_name', `%${location}%`);
      
      const { data, error } = await query;
      if (error) throw error;
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/posts", authenticate, async (req, res) => {
    if (!supabase) return res.status(503).json({ error: "Supabase not configured" });
    const { user_id, username, avatar_url, trail_id, location_name, caption, photo_urls } = req.body;
    const authUser = (req as any).user;

    if (user_id !== authUser.id) return res.status(403).json({ error: "Forbidden" });

    try {
      const { data, error } = await supabase
        .from('posts')
        .insert([{ user_id, username, avatar_url, trail_id, location_name, caption, photo_urls }])
        .select();
      
      if (error) throw error;
      res.json(data[0]);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/posts/:postId/like", authenticate, async (req, res) => {
    if (!supabase) return res.status(503).json({ error: "Supabase not configured" });
    const { postId } = req.params;
    const { userId } = req.body;
    const authUser = (req as any).user;

    if (userId !== authUser.id) return res.status(403).json({ error: "Forbidden" });

    try {
      // Check if already liked
      const { data: existing } = await supabase
        .from('post_likes')
        .select('*')
        .eq('post_id', postId)
        .eq('user_id', userId)
        .single();

      if (existing) {
        // Unlike
        await supabase.from('post_likes').delete().eq('id', existing.id);
        await supabase.rpc('decrement_likes', { post_id: postId });
        return res.json({ liked: false });
      } else {
        // Like
        await supabase.from('post_likes').insert([{ post_id: postId, user_id: userId }]);
        await supabase.rpc('increment_likes', { post_id: postId });
        return res.json({ liked: true });
      }
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/posts/:postId/comments", async (req, res) => {
    if (!supabase) return res.status(503).json({ error: "Supabase not configured" });
    const { postId } = req.params;
    try {
      const { data, error } = await supabase
        .from('post_comments')
        .select('*')
        .eq('post_id', postId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/posts/:postId/comments", authenticate, async (req, res) => {
    if (!supabase) return res.status(503).json({ error: "Supabase not configured" });
    const { postId } = req.params;
    const { user_id, username, avatar_url, content } = req.body;
    const authUser = (req as any).user;

    if (user_id !== authUser.id) return res.status(403).json({ error: "Forbidden" });

    try {
      const { data, error } = await supabase
        .from('post_comments')
        .insert([{ post_id: postId, user_id, username, avatar_url, content }])
        .select();
      if (error) throw error;
      res.json(data[0]);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/users/search", async (req, res) => {
    if (!supabase) return res.status(503).json({ error: "Supabase not configured" });
    const { q } = req.query;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .ilike('username', `%${q}%`)
        .limit(10);
      if (error) throw error;
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Follow Endpoints
  app.get("/api/follows/:userId", async (req, res) => {
    if (!supabase) return res.status(503).json({ error: "Supabase not configured" });
    const { userId } = req.params;
    try {
      const { data: followers, error: fErr } = await supabase.from('follows').select('*').eq('following_id', userId);
      const { data: following, error: gErr } = await supabase.from('follows').select('*').eq('follower_id', userId);
      
      if (fErr) throw fErr;
      if (gErr) throw gErr;
      
      res.json({ followers, following });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/follows", authenticate, async (req, res) => {
    if (!supabase) return res.status(503).json({ error: "Supabase not configured" });
    const { followerId, followingId } = req.body;
    const authUser = (req as any).user;

    if (followerId !== authUser.id) return res.status(403).json({ error: "Forbidden" });

    try {
      const { data, error } = await supabase
        .from('follows')
        .insert([{ follower_id: followerId, following_id: followingId }])
        .select();
      
      if (error) throw error;
      res.json(data[0]);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/follows", authenticate, async (req, res) => {
    if (!supabase) return res.status(503).json({ error: "Supabase not configured" });
    const { followerId, followingId } = req.body;
    const authUser = (req as any).user;

    if (followerId !== authUser.id) return res.status(403).json({ error: "Forbidden" });

    try {
      const { error } = await supabase
        .from('follows')
        .delete()
        .eq('follower_id', followerId)
        .eq('following_id', followingId);
      
      if (error) throw error;
      res.json({ status: "unfollowed" });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Catch-all for API 404s to prevent HTML fallback
  app.all("/api/*", (req, res) => {
    res.status(404).json({ 
      error: "API Route Not Found", 
      path: req.path,
      method: req.method 
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  return app;
}

// Start only if not on Vercel (where createServer is called by api/index.ts)
if (!process.env.VERCEL) {
  createServer().then(app => {
    const PORT = 3000;
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  });
}
