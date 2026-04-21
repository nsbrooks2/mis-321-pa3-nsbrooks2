export interface Trail {
  id: string;
  name: string;
  difficulty: 'Easy' | 'Moderate' | 'Challenging';
  distance: string;
  elevation_gain: string;
  type: string;
  location: string;
  description: string;
  tags: string[];
  safety_warning: string;
  website_url?: string;
  map_download_url?: string;
  directions_url?: string;
  coordinates?: { lat: number; lng: number };
  best_time?: string;
  terrain?: string[];
  essential_gear?: string[];
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface Review {
  id: string;
  trail_id: string;
  user_id: string;
  username: string;
  avatar_url?: string;
  rating: number;
  comment: string;
  photo_urls: string[];
  created_at: string;
}

export interface ChatSession {
  id: string;
  user_id: string;
  title: string;
  messages: Message[];
  created_at: string;
}

export interface Post {
  id: string;
  user_id: string;
  username: string;
  avatar_url?: string;
  trail_id?: string;
  location_name?: string;
  caption: string;
  photo_urls: string[];
  likes_count: number;
  comments_count?: number;
  created_at: string;
}

export interface Comment {
  id: string;
  post_id: string;
  user_id: string;
  username: string;
  avatar_url?: string;
  content: string;
  created_at: string;
}

export interface Follow {
  follower_id: string;
  following_id: string;
  created_at: string;
}
