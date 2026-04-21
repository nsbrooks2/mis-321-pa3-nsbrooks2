import React, { useState, useEffect, useRef } from 'react';
import { Post } from '../types';
import PostCard from './PostCard';
import { Loader2, Compass, Plus, X, Image as ImageIcon, Search, User as UserIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../lib/supabase';
import { fetchWithAuth } from '../lib/api';

interface SocialFeedProps {
  user: any;
  userProfile: any;
  onNavigateToProfile?: (userId: string) => void;
}

export default function SocialFeed({ user, userProfile, onNavigateToProfile }: SocialFeedProps) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPosting, setIsPosting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [newPost, setNewPost] = useState<{
    caption: string;
    location: string;
    trailId: string;
    imageUrls: string[];
  }>({ caption: '', location: '', trailId: '', imageUrls: [] });
  
  const [trailSearch, setTrailSearch] = useState('');
  const [trailMatches, setTrailMatches] = useState<any[]>([]);
  const [showTrailMatches, setShowTrailMatches] = useState(false);

  const [userSearch, setUserSearch] = useState('');
  const [userMatches, setUserMatches] = useState<any[]>([]);
  const [searchingUsers, setSearchingUsers] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchPosts();
  }, []);

  useEffect(() => {
    if (trailSearch.length > 2) {
      const fetchMatches = async () => {
        const resp = await fetch(`/api/trails?q=${encodeURIComponent(trailSearch)}`);
        const data = await resp.json();
        setTrailMatches(data);
      }
      fetchMatches();
    } else {
      setTrailMatches([]);
    }
  }, [trailSearch]);

  useEffect(() => {
    if (userSearch.length > 2) {
      const searchUsers = async () => {
        setSearchingUsers(true);
        try {
          const resp = await fetchWithAuth(`/api/users/search?q=${encodeURIComponent(userSearch)}`);
          if (resp.ok) {
            const data = await resp.json();
            setUserMatches(data);
          }
        } catch (err) {
          console.error(err);
        } finally {
          setSearchingUsers(false);
        }
      };
      const timer = setTimeout(searchUsers, 500);
      return () => clearTimeout(timer);
    } else {
      setUserMatches([]);
    }
  }, [userSearch]);

  const fetchPosts = async () => {
    try {
      const response = await fetchWithAuth('/api/posts');
      if (response.ok) {
        const data = await response.json();
        setPosts(data);
      }
    } catch (err) {
      console.error('Failed to fetch posts:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !supabase) return;

    setIsUploading(true);
    try {
      const uploadedUrls: string[] = [];
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${i}.${fileExt}`;
        const filePath = `${user.id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('posts')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('posts')
          .getPublicUrl(filePath);
        
        uploadedUrls.push(publicUrl);
      }

      setNewPost(prev => ({ ...prev, imageUrls: [...prev.imageUrls, ...uploadedUrls] }));
    } catch (err: any) {
      alert('Upload failed: ' + err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleCreatePost = async () => {
    if (!newPost.caption || newPost.imageUrls.length === 0) return;

    try {
      const response = await fetchWithAuth('/api/posts', {
        method: 'POST',
        body: JSON.stringify({
          user_id: user.id,
          username: userProfile?.username || 'Anonymous',
          avatar_url: userProfile?.avatar_url,
          caption: newPost.caption,
          location_name: newPost.location,
          trail_id: newPost.trailId,
          photo_urls: newPost.imageUrls
        })
      });

      if (response.ok) {
        setIsPosting(false);
        setNewPost({ caption: '', location: '', trailId: '', imageUrls: [] });
        setTrailSearch('');
        fetchPosts();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to deploy log to the server.');
      }
    } catch (err: any) {
      alert(`Deployment failed: ${err.message}`);
    }
  };
   // ... keep rendering ...

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-trail-bg">
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/dark-wood.png')] opacity-10 pointer-events-none" />
      
      {/* Header */}
      <div className="p-12 pb-8 flex items-end justify-between z-10 gap-8">
        <div className="flex-1">
          <div className="flex items-center gap-6 mb-4">
            <span className="text-[10px] font-black uppercase tracking-[0.5em] text-trail-moss block">Field Logs</span>
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
              <input 
                type="text"
                value={userSearch}
                onChange={e => setUserSearch(e.target.value)}
                placeholder="Find Rangers..."
                className="w-full bg-white/5 border border-white/5 rounded-xl pl-10 pr-4 py-2 text-xs text-white focus:border-trail-moss transition-all"
              />
              <AnimatePresence>
                {userMatches.length > 0 && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute top-full left-0 right-0 mt-2 bg-trail-forest border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50"
                  >
                    {userMatches.map(match => (
                      <div 
                        key={match.id} 
                        onClick={() => {
                          onNavigateToProfile?.(match.id);
                          setUserMatches([]);
                          setUserSearch('');
                        }}
                        className="p-4 border-b border-white/5 last:border-0 hover:bg-white/5 flex items-start gap-4 cursor-pointer group transition-all"
                      >
                        <div className="w-10 h-10 rounded-full bg-trail-accent border border-white/10 overflow-hidden flex-shrink-0 flex items-center justify-center">
                          {match.avatar_url ? (
                            <img src={match.avatar_url} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            <UserIcon className="w-5 h-5 text-trail-moss" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-white group-hover:text-trail-moss transition-colors truncate">
                            {match.username}
                          </p>
                          {match.bio && (
                            <p className="text-[10px] text-white/40 line-clamp-1 italic font-serif">
                              {match.bio}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
          <h2 className="text-6xl font-black tracking-tighter text-white mb-2 leading-none">Discovery Feed</h2>
          <p className="text-white/40 font-serif italic text-xl">The shared silence of the summits.</p>
        </div>
        <button 
          onClick={() => setIsPosting(true)}
          className="flex items-center gap-3 bg-trail-moss hover:bg-white text-white hover:text-trail-forest px-8 py-4 rounded-2xl shadow-2xl transition-all font-black uppercase tracking-widest text-xs group"
        >
           <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform" />
           Share Intel
        </button>
      </div>

      {/* Feed */}
      <div className="flex-1 overflow-y-auto p-12 pt-4 custom-scrollbar z-10">
        {loading ? (
          <div className="h-full flex flex-col items-center justify-center text-trail-moss/30">
            <Loader2 className="w-12 h-12 animate-spin mb-4" />
            <p className="font-serif italic text-2xl tracking-widest uppercase opacity-50">Syncing Intelligence...</p>
          </div>
        ) : (
          <div className="max-w-[800px] mx-auto pb-24">
            <AnimatePresence mode="popLayout">
              {posts.length > 0 ? (
                posts.map((post) => (
                  <PostCard 
                    key={post.id} 
                    post={post} 
                    currentUserId={user?.id} 
                    onNavigateToProfile={onNavigateToProfile}
                  />
                ))
              ) : (
                <div className="py-32 text-center">
                   <Compass className="w-16 h-16 text-white/5 mx-auto mb-6" />
                   <p className="text-white/20 font-serif italic text-xl">No field logs found. Be the first to deploy intel.</p>
                </div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Create Post Modal */}
      <AnimatePresence>
        {isPosting && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsPosting(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-xl"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="glass-panel w-full max-w-2xl rounded-[40px] border border-white/10 overflow-hidden relative z-10"
            >
              <div className="p-10">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-3xl font-black text-white tracking-widest uppercase">New Expedition Log</h3>
                  <button onClick={() => setIsPosting(false)} className="p-2 hover:bg-white/10 rounded-xl text-white/40 transition-all">
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <div className="space-y-6">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-[0.3em] text-trail-moss mb-3 block">Deployment Capture (Photo)</label>
                    <div 
                      onClick={() => fileInputRef.current?.click()}
                      className={`relative min-h-[200px] rounded-3xl border-2 border-dashed transition-all flex items-center justify-center cursor-pointer p-4 gap-4 overflow-x-auto ${
                        newPost.imageUrls.length > 0 
                        ? 'border-trail-moss' 
                        : 'border-white/10 hover:border-white/20 hover:bg-white/5'
                      }`}
                    >
                      {newPost.imageUrls.length > 0 ? (
                        <div className="flex gap-4 w-full h-full overflow-x-auto py-2">
                          {newPost.imageUrls.map((url, i) => (
                            <div key={i} className="relative aspect-square h-32 shrink-0 rounded-xl overflow-hidden shadow-xl group/img">
                              <img 
                                src={url} 
                                alt="Preview" 
                                className="w-full h-full object-cover"
                                referrerPolicy="no-referrer"
                              />
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setNewPost(prev => ({ ...prev, imageUrls: prev.imageUrls.filter((_, idx) => idx !== i) }));
                                }}
                                className="absolute top-1 right-1 p-1 bg-black/60 text-white rounded-md opacity-0 group-hover/img:opacity-100 transition-opacity"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                          <div className="h-32 aspect-square shrink-0 rounded-xl border-2 border-dashed border-white/10 flex flex-col items-center justify-center text-white/20 hover:text-white/40 hover:border-white/20 transition-all">
                             <Plus className="w-6 h-6" />
                             <span className="text-[8px] font-black uppercase">More</span>
                          </div>
                        </div>
                      ) : (
                        <>
                          {isUploading ? (
                            <Loader2 className="w-10 h-10 text-trail-moss animate-spin" />
                          ) : (
                            <>
                              <ImageIcon className="w-10 h-10 text-white/10 mb-2" />
                              <span className="text-[10px] font-black uppercase tracking-widest text-white/20">Drop hike intelligence (Multi-upload)</span>
                            </>
                          )}
                        </>
                      )}
                    </div>
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      className="hidden" 
                      accept="image/*"
                      multiple
                      onChange={handleFileUpload}
                    />
                  </div>

                  <div className="relative">
                    <label className="text-[10px] font-black uppercase tracking-[0.3em] text-trail-moss mb-3 block">Deployment Sector (Trail Search)</label>
                    <div className="relative">
                      <input 
                        type="text" 
                        value={trailSearch || newPost.location}
                        onChange={(e) => {
                          setTrailSearch(e.target.value);
                          setNewPost({...newPost, location: e.target.value, trailId: ''});
                          setShowTrailMatches(true);
                        }}
                        placeholder="Search basecamp for a trail..."
                        className="w-full bg-black/40 border border-white/10 rounded-2xl p-5 text-white focus:border-trail-moss transition-all"
                      />
                      {newPost.trailId && (
                         <div className="absolute right-5 top-1/2 -translate-y-1/2 bg-trail-moss px-3 py-1 rounded-full text-[8px] font-black uppercase text-white animate-in zoom-in">
                            Matched
                         </div>
                      )}
                    </div>
                    
                    <AnimatePresence>
                      {showTrailMatches && trailMatches.length > 0 && (
                        <motion.div 
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="absolute z-50 left-0 right-0 mt-2 bg-trail-forest border border-white/10 rounded-2xl shadow-2xl max-h-48 overflow-y-auto overflow-x-hidden"
                        >
                          {trailMatches.map(trail => (
                            <button 
                              key={trail.id}
                              onClick={() => {
                                setNewPost({...newPost, location: trail.name, trailId: trail.id});
                                setTrailSearch(trail.name);
                                setShowTrailMatches(false);
                              }}
                              className="w-full p-4 text-left hover:bg-white/5 border-b border-white/5 last:border-0 transition-colors group"
                            >
                              <p className="text-white font-bold text-sm group-hover:text-trail-moss">{trail.name}</p>
                              <p className="text-[10px] text-white/40 uppercase tracking-widest">{trail.location}</p>
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase tracking-[0.3em] text-trail-moss mb-3 block">Field Observation (Caption)</label>
                    <textarea 
                      value={newPost.caption}
                      onChange={(e) => setNewPost({...newPost, caption: e.target.value})}
                      placeholder="Share your summit report..."
                      rows={4}
                      className="w-full bg-black/40 border border-white/10 rounded-2xl p-5 text-white focus:border-trail-moss transition-all resize-none"
                    />
                  </div>

                  <button 
                    onClick={handleCreatePost}
                    disabled={!newPost.caption || newPost.imageUrls.length === 0 || isUploading}
                    className="w-full bg-trail-moss text-white py-6 rounded-2xl font-black uppercase tracking-[0.4em] text-sm hover:bg-white hover:text-trail-forest transition-all shadow-2xl disabled:opacity-20 flex items-center justify-center gap-3"
                  >
                    Deploy Log
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
