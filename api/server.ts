import express from "express";
import { createClient } from "@supabase/supabase-js";

const trailsData = [
  {
    "id": "t1",
    "name": "Eagle Rock Waterfall Trail",
    "difficulty": "Moderate",
    "distance": "4.2 miles",
    "elevation_gain": "850 ft",
    "type": "Out & Back",
    "location": "Forest Hills State Park",
    "description": "A scenic trail featuring a stunning 40-foot waterfall at the midpoint. Best visited in spring.",
    "tags": ["waterfall", "family-friendly", "wildflowers"],
    "safety_warning": "Rocks near the waterfall can be slippery. Stay on marked paths.",
    "website_url": "https://www.alltrails.com/trail/us/north-carolina/eagle-rock-trail",
    "map_download_url": "https://www.ncparks.gov/sites/default/files/ncparks/maps-and-brochures/south-mountains-state-park-map.pdf",
    "directions_url": "https://www.google.com/maps/dir/?api=1&destination=35.5951,-82.5515",
    "coordinates": { "lat": 35.5951, "lng": -82.5515 },
    "best_time": "March - June",
    "terrain": ["Forest", "Rocks", "Stream Crossing"],
    "essential_gear": ["Waterproof boots", "Trekking poles", "Bug spray"]
  },
  {
    "id": "t2",
    "name": "Summit Ridge Traverse",
    "difficulty": "Challenging",
    "distance": "8.5 miles",
    "elevation_gain": "2,400 ft",
    "type": "Point-to-Point",
    "location": "High Peaks Wilderness",
    "description": "Exposed ridge walk with panoramic 360-degree views of the valley. Requires good stamina.",
    "tags": ["panoramic", "steep", "wildlife"],
    "safety_warning": "High exposure to wind and weather. Not recommended during storms. Bring extra layers.",
    "website_url": "https://www.alltrails.com/explore/trail/us/colorado/summit-ridge",
    "map_download_url": "https://caltopo.com/m/ABC-Example",
    "directions_url": "https://www.google.com/maps/dir/?api=1&destination=39.5501,-105.7821",
    "coordinates": { "lat": 39.5501, "lng": -105.7821 },
    "best_time": "July - September",
    "terrain": ["Alpine", "Glacial Scree", "Vast Meadows"],
    "essential_gear": ["Windbreaker", "Topographic map", "Extra layers"]
  },
  {
    "id": "t3",
    "name": "Misty Pine Loop",
    "difficulty": "Easy",
    "distance": "2.1 miles",
    "elevation_gain": "120 ft",
    "type": "Loop",
    "location": "Silver Lake Preserve",
    "description": "A gentle forest walk through ancient pine groves. Well-shaded and perfect for bird watching.",
    "tags": ["bird-watching", "shaded", "quiet"],
    "safety_warning": "Watch for loose pine needles on steep descents.",
    "website_url": "https://www.alltrails.com/trail/us/oregon/misty-pine-loop",
    "directions_url": "https://www.google.com/maps/dir/?api=1&destination=45.5231,-122.6765",
    "coordinates": { "lat": 45.5231, "lng": -122.6765 },
    "best_time": "Year-round",
    "terrain": ["Flat Dirt", "Pine Needles"],
    "essential_gear": ["Binoculars", "Light snacks"]
  },
  {
    "id": "t4",
    "name": "Canyon View Trail",
    "difficulty": "Moderate",
    "distance": "5.6 miles",
    "elevation_gain": "1,100 ft",
    "type": "Loop",
    "location": "Red Rock National Park",
    "description": "Dramatic canyon edge views with unique geological formations. Sunset is the best time for photos.",
    "tags": ["sunset", "photography", "geology"],
    "safety_warning": "Keep away from steep edges. Dehydration risk is high in summer; carry 2L of water.",
    "website_url": "https://www.alltrails.com/trail/us/nevada/canyon-view-loop",
    "directions_url": "https://www.google.com/maps/dir/?api=1&destination=36.1353,-115.4272",
    "coordinates": { "lat": 36.1353, "lng": -115.4272 },
    "best_time": "October - April",
    "terrain": ["Sandstone", "Desert Scrub"],
    "essential_gear": ["2L Water", "Sun protection", "Wide-angle lens"]
  },
  {
    "id": "t5",
    "name": "Emerald Lake Shortcut",
    "difficulty": "Easy",
    "distance": "1.5 miles",
    "elevation_gain": "50 ft",
    "type": "Out & Back",
    "location": "High Peaks Wilderness",
    "description": "A quick and easy path to the clearest alpine lake in the region. Swimming allowed in summer.",
    "tags": ["lake", "swimming", "short-hike"],
    "safety_warning": "Water is frigid year-round. Supervise children near the edge.",
    "website_url": "https://www.alltrails.com/trail/us/washington/emerald-lake",
    "directions_url": "https://www.google.com/maps/dir/?api=1&destination=47.6062,-122.3321",
    "coordinates": { "lat": 47.6062, "lng": -122.3321 },
    "best_time": "June - August",
    "terrain": ["Forest Path", "Rocky Coast"],
    "essential_gear": ["Towel", "Water shoes", "Polarized sunglasses"]
  }
];

export async function createServer() {
  const app = express();
  app.use(express.json());

  console.log(`[Server] Bootstrapped with ${trailsData.length} trails (embedded).`);

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

  const authenticate = async (req: any, res: any, next: any) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !supabase) return res.status(401).json({ error: "Unauthorized" });

    const token = authHeader.split(" ")[1];
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) return res.status(401).json({ error: "Unauthorized" });
    req.user = user;
    next();
  };

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", uptime: process.uptime() });
  });

  app.get("/api/trails", (req, res) => {
    const { q, difficulty, tags } = req.query;
    let filtered = [...trailsData];

    if (q) {
      const query = (q as string).toLowerCase();
      filtered = filtered.filter(t => 
        t.name.toLowerCase().includes(query) || 
        t.description.toLowerCase().includes(query) ||
        (t.location && t.location.toLowerCase().includes(query)) ||
        (t.tags && t.tags.some((tag: string) => tag.toLowerCase().includes(query)))
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

  return app;
}
