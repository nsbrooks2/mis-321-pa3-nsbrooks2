import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { User, Edit3, Camera, CheckCircle, Bookmark, LogOut, Loader2, Upload, Grid, History, Mountain } from 'lucide-react';
import { Trail, Post } from '../types';
import { supabase } from '../lib/supabase';
import { fetchWithAuth } from '../lib/api';
import PostCard from './PostCard';

interface ProfileViewProps {
  user: any;
  viewingUserId?: string | null;
  onLogout: () => void;
  allTrails: Trail[];
  onProfileUpdate?: () => void;
  onNavigateToProfile?: (userId: string) => void;
}

export default function ProfileView({ user, viewingUserId, onLogout, allTrails, onProfileUpdate, onNavigateToProfile }: ProfileViewProps) {
  const [profile, setProfile] = useState<any>(null);
  const [userHikes, setUserHikes] = useState<any[]>([]);
  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [socialStats, setSocialStats] = useState({ followers: 0, following: 0 });
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  
  const effectiveUserId = viewingUserId || user?.id;
  const isOwnProfile = !viewingUserId || viewingUserId === user?.id;

  const [activeProfileTab, setActiveProfileTab] = useState<'hikes' | 'posts'>('posts');
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [uploading, setUploading] = useState<'avatar' | 'banner' | null>(null);

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  const [editForm, setEditForm] = useState({
    username: '',
    bio: '',
    avatar_url: '',
    banner_url: ''
  });

  useEffect(() => {
    if (effectiveUserId) {
      fetchProfile();
      fetchUserHikes();
      fetchUserPosts();
      fetchSocialStats();
      if (!isOwnProfile && user) checkFollowStatus();
    }
  }, [user, viewingUserId]);

  const checkFollowStatus = async () => {
    try {
      const resp = await fetchWithAuth(`/api/profile/${user.id}/followers`); // Note: I should fix the follow endpoints in server.ts too if they are wrong
      // Actually checking follow status usually needs a specific endpoint or checking the following list
      const socialResp = await fetchWithAuth(`/api/follows/${user.id}`);
      if (socialResp.ok) {
        const data = await socialResp.json();
        setIsFollowing(data.following.some((f: any) => f.following_id === viewingUserId));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleFollow = async () => {
    if (!user || followLoading || !viewingUserId) return;
    setFollowLoading(true);
    try {
      if (isFollowing) {
        await fetchWithAuth('/api/follows', {
          method: 'DELETE',
          body: JSON.stringify({ followerId: user.id, followingId: viewingUserId })
        });
        setIsFollowing(false);
        setSocialStats(prev => ({ ...prev, followers: prev.followers - 1 }));
      } else {
        await fetchWithAuth('/api/follows', {
          method: 'POST',
          body: JSON.stringify({ followerId: user.id, followingId: viewingUserId })
        });
        setIsFollowing(true);
        setSocialStats(prev => ({ ...prev, followers: prev.followers + 1 }));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setFollowLoading(false);
    }
  };

  const fetchProfile = async (retries = 3) => {
    try {
      const response = await fetch(`/api/profile/${effectiveUserId}`);
      if (response.ok) {
        const data = await response.json();
        setProfile(data);
        if (isOwnProfile) {
          setEditForm({
            username: data.username || '',
            bio: data.bio || '',
            avatar_url: data.avatar_url || '',
            banner_url: data.banner_url || ''
          });
        }
      } else if (response.status === 503 && retries > 0) {
        setTimeout(() => fetchProfile(retries - 1), 1000);
      }
    } catch (err) {
      if (retries > 0) {
        setTimeout(() => fetchProfile(retries - 1), 2000);
      }
    }
  };

  const fetchUserPosts = async () => {
    try {
      const response = await fetchWithAuth(`/api/posts?userId=${effectiveUserId}`);
      if (response.ok) {
        const data = await response.json();
        setUserPosts(data);
      }
    } catch (err) {
      console.error('Failed to fetch user posts:', err);
    }
  };

  const fetchSocialStats = async () => {
    try {
      const response = await fetchWithAuth(`/api/follows/${effectiveUserId}`);
      if (response.ok) {
        const data = await response.json();
        setSocialStats({
          followers: data.followers.length,
          following: data.following.length
        });
      }
    } catch (err) {
      console.error('Failed to fetch social stats:', err);
    }
  };

  const fetchUserHikes = async () => {
    try {
      const response = await fetchWithAuth(`/api/user-hikes/${effectiveUserId}`);
      if (response.ok) {
        const data = await response.json();
        setUserHikes(data);
      }
    } catch (err) {
      console.error('Failed to fetch user hikes:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'avatar' | 'banner') => {
    const file = e.target.files?.[0];
    if (!file || !supabase) return;

    setUploading(type);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${type}-${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('profiles')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('profiles')
        .getPublicUrl(filePath);

      setEditForm(prev => ({ 
        ...prev, 
        [type === 'avatar' ? 'avatar_url' : 'banner_url']: publicUrl 
      }));
    } catch (err: any) {
      setSaveError(`Upload failed: ${err.message}`);
    } finally {
      setUploading(null);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);
    try {
      const response = await fetchWithAuth('/api/profile', {
        method: 'POST',
        body: JSON.stringify({ id: user.id, ...editForm })
      });
      
      const result = await response.json();
      
      if (response.ok) {
        setProfile(result);
        setIsEditing(false);
        if (onProfileUpdate) onProfileUpdate();
      } else {
        throw new Error(result.error || 'Failed to save profile changes.');
      }
    } catch (err: any) {
      setSaveError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const getTrailsByStatus = (status: 'wishlist' | 'completed') => {
    // Collect all unique trails from both the global allTrails and the embedded trail_data
    const hikes = userHikes.filter(h => h.status === status);
    const trailsList: Trail[] = [];
    
    hikes.forEach(h => {
      // Prioritize the data embedded in the hike record if it exists
      if (h.trail_data) {
        trailsList.push(h.trail_data);
      } else {
        // Fallback to searching allTrails if trail_data is missing (for older records)
        const found = allTrails.find(t => t.id === h.trail_id);
        if (found) trailsList.push(found);
      }
    });

    return trailsList;
  };

  const HikeImage = ({ trail }: { trail: Trail }) => {
    return (
      <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/5 overflow-hidden shrink-0 flex items-center justify-center text-white/20">
        <Mountain className="w-8 h-8" />
      </div>
    );
  };

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar bg-trail-bg">
      <div className="max-w-4xl mx-auto p-8 pt-24">
        {/* Profile Header */}
        <div className="glass-panel rounded-[40px] mb-12 relative overflow-hidden card-shadow">
          {/* Profile Banner */}
          <div className="h-48 w-full bg-trail-forest/50 relative group/banner">
            {profile?.banner_url ? (
              <img 
                src={profile.banner_url || editForm.banner_url} 
                alt="Banner" 
                className="w-full h-full object-cover" 
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-trail-forest to-trail-bg opacity-50" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-trail-forest via-transparent to-transparent pointer-events-none" />
            
            {isEditing && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-sm opacity-0 group-hover/banner:opacity-100 transition-opacity">
                <button 
                  type="button"
                  onClick={() => bannerInputRef.current?.click()}
                  className="bg-trail-moss text-white px-6 py-2 rounded-xl font-bold text-xs uppercase tracking-widest flex items-center gap-2"
                  disabled={uploading === 'banner'}
                >
                  {uploading === 'banner' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  Update Banner
                </button>
              </div>
            )}
            <input 
              type="file" 
              ref={bannerInputRef} 
              className="hidden" 
              accept="image/*" 
              onChange={(e) => handleFileUpload(e, 'banner')} 
            />

            {isOwnProfile && (
              <div className="absolute top-4 right-4 z-20">
                <button onClick={onLogout} className="p-3 bg-black/40 backdrop-blur rounded-2xl hover:bg-rose-500/20 text-white/30 hover:text-rose-400 transition-all border border-white/5">
                    <LogOut className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>

          <div className="px-8 pb-8 -mt-16 relative z-10 flex flex-col md:flex-row gap-8 items-center md:items-end text-center md:text-left">
            <div className="relative group shrink-0">
               <div className="w-40 h-40 rounded-3xl bg-trail-accent border-4 border-trail-forest overflow-hidden shadow-2xl relative">
                  {(profile?.avatar_url || editForm.avatar_url) ? (
                    <img src={profile?.avatar_url || editForm.avatar_url} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-trail-moss">
                       <User className="w-20 h-20" />
                    </div>
                  )}
                  {uploading === 'avatar' && (
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center">
                      <Loader2 className="w-8 h-8 text-white animate-spin" />
                    </div>
                  )}
               </div>
               {isEditing ? (
                 <button 
                   type="button"
                   onClick={() => avatarInputRef.current?.click()}
                   className="absolute -bottom-2 -right-2 p-2 bg-trail-moss text-white rounded-xl shadow-lg hover:scale-110 transition-transform border-4 border-trail-forest"
                   disabled={uploading === 'avatar'}
                 >
                    <Upload className="w-4 h-4" />
                 </button>
               ) : isOwnProfile ? (
                 <button 
                  onClick={() => setIsEditing(true)}
                  className="absolute -bottom-2 -right-2 p-2 bg-trail-moss text-white rounded-xl shadow-lg hover:scale-110 transition-transform border-4 border-trail-forest"
                >
                    <Camera className="w-4 h-4" />
                 </button>
               ) : null}
               <input 
                  type="file" 
                  ref={avatarInputRef} 
                  className="hidden" 
                  accept="image/*" 
                  onChange={(e) => handleFileUpload(e, 'avatar')} 
                />
            </div>

            <div className="flex-1 w-full">
              {isEditing ? (
                <form onSubmit={handleUpdateProfile} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase tracking-widest text-white/40 font-black px-1">Display Name</label>
                      <input 
                        className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-trail-moss"
                        value={editForm.username}
                        onChange={e => setEditForm({...editForm, username: e.target.value})}
                        placeholder="Username"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase tracking-widest text-white/40 font-black px-1">Bio</label>
                      <textarea 
                        className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-trail-moss h-[46px] resize-none text-sm"
                        value={editForm.bio}
                        onChange={e => setEditForm({...editForm, bio: e.target.value})}
                        placeholder="Tell us about your hiking journey..."
                      />
                    </div>
                  </div>

                  {saveError && (
                    <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs italic">
                      {saveError}
                    </div>
                  )}

                  <div className="flex gap-2 justify-center md:justify-start">
                    <button 
                      type="submit" 
                      disabled={saving || !!uploading}
                      className="bg-trail-moss text-white px-8 py-2.5 rounded-xl font-bold text-sm tracking-widest uppercase hover:bg-white hover:text-trail-forest transition-all shadow-lg disabled:opacity-50 flex items-center gap-2"
                    >
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                      {saving ? "Saving..." : "Save Profile"}
                    </button>
                    <button 
                      type="button"
                      onClick={() => {
                        setIsEditing(false);
                        setSaveError(null);
                        setEditForm({
                          username: profile?.username || '',
                          bio: profile?.bio || '',
                          avatar_url: profile?.avatar_url || '',
                          banner_url: profile?.banner_url || ''
                        });
                      }} 
                      className="bg-white/5 text-white/50 px-8 py-2.5 rounded-xl font-bold text-sm tracking-widest uppercase hover:text-white transition-all"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <>
                  <div className="flex items-center justify-center md:justify-start gap-4 mb-2">
                    <h2 className="text-4xl font-black text-white uppercase tracking-tight">{profile?.username || 'Wild Trekker'}</h2>
                    {isOwnProfile ? (
                      <button onClick={() => setIsEditing(true)} className="p-2 text-white/20 hover:text-trail-moss transition-colors">
                        <Edit3 className="w-5 h-5" />
                      </button>
                    ) : (
                      <button 
                        onClick={handleFollow}
                        disabled={followLoading}
                        className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                          isFollowing 
                          ? 'bg-white/5 text-white/40 border border-white/5' 
                          : 'bg-trail-moss text-white'
                        }`}
                      >
                        {followLoading ? 'Syncing...' : isFollowing ? 'Following' : 'Follow Ranger'}
                      </button>
                    )}
                  </div>
                  <p className="text-trail-moss font-serif italic text-lg mb-6 max-w-lg">{profile?.bio || (isOwnProfile ? 'You haven\'t narrated your journey yet. Edit your profile to share your story with the scouting community.' : 'This ranger prefers the silence of the summits.')}</p>
                  <div className="flex items-center justify-center md:justify-start gap-6 text-white/40 uppercase tracking-widest text-[10px] font-black">
                     <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-full border border-white/5">
                        <CheckCircle className="w-4 h-4 text-trail-moss" />
                        <span>{userHikes.filter(h => h.status === 'completed').length} Summits</span>
                     </div>
                     <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-full border border-white/5">
                        <Bookmark className="w-4 h-4 text-trail-moss" />
                        <span>{userHikes.filter(h => h.status === 'wishlist').length} Wishes</span>
                     </div>
                     <div className="flex items-center gap-4 ml-4">
                        <div className="flex flex-col items-center">
                          <span className="text-white text-sm">{socialStats.followers}</span>
                          <span className="text-[8px] opacity-50">Followers</span>
                        </div>
                        <div className="flex flex-col items-center">
                          <span className="text-white text-sm">{socialStats.following}</span>
                          <span className="text-[8px] opacity-50">Following</span>
                        </div>
                     </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center justify-center gap-12 mb-12 border-b border-white/5 pb-6">
           <button 
             onClick={() => setActiveProfileTab('posts')}
             className={`flex items-center gap-3 text-xs font-black uppercase tracking-[0.3em] transition-all ${activeProfileTab === 'posts' ? 'text-trail-moss' : 'text-white/20 hover:text-white/40'}`}
           >
              <Grid className="w-5 h-5" />
              Field Logs
           </button>
           <button 
             onClick={() => setActiveProfileTab('hikes')}
             className={`flex items-center gap-3 text-xs font-black uppercase tracking-[0.3em] transition-all ${activeProfileTab === 'hikes' ? 'text-trail-moss' : 'text-white/20 hover:text-white/40'}`}
           >
              <History className="w-5 h-5" />
              Expeditions
           </button>
        </div>

        {activeProfileTab === 'posts' ? (
          <div className="max-w-[800px] mx-auto pb-24">
             {userPosts.length > 0 ? (
                userPosts.map(post => <PostCard key={post.id} post={post} currentUserId={user.id} />)
             ) : (
                <div className="py-24 text-center border-2 border-dashed border-white/5 rounded-[40px] text-white/20 italic font-serif">
                   Your field logs are empty. Capture some summits.
                </div>
             )}
          </div>
        ) : (
          /* Hike Lists */
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 pb-24">
            <section>
              <div className="flex items-center gap-3 mb-6">
                <CheckCircle className="w-6 h-6 text-trail-moss" />
                <h3 className="text-2xl font-bold text-white">Completed Expeditions</h3>
              </div>
              <div className="space-y-4">
                {getTrailsByStatus('completed').map(trail => (
                  <motion.div 
                    key={trail.id}
                    className="glass-panel p-4 rounded-3xl flex items-center gap-4 hover:border-trail-moss transition-colors group"
                  >
                    <HikeImage trail={trail} />
                    <div>
                      <h4 className="text-white font-bold">{trail.name}</h4>
                      <p className="text-xs text-white/40">{trail.distance} • {trail.elevation_gain}</p>
                    </div>
                  </motion.div>
                ))}
                {getTrailsByStatus('completed').length === 0 && (
                  <div className="p-12 text-center border-2 border-dashed border-white/5 rounded-[40px] text-white/20 italic font-serif">
                    No summits recorded yet. Time for an adventure.
                  </div>
                )}
              </div>
            </section>

            <section>
              <div className="flex items-center gap-3 mb-6">
                <Bookmark className="w-6 h-6 text-trail-moss" />
                <h3 className="text-2xl font-bold text-white">The Wishlist</h3>
              </div>
              <div className="space-y-4">
                {getTrailsByStatus('wishlist').map(trail => (
                  <motion.div 
                    key={trail.id}
                    className="glass-panel p-4 rounded-3xl flex items-center gap-4 hover:border-trail-moss transition-colors group"
                  >
                    <HikeImage trail={trail} />
                    <div>
                      <h4 className="text-white font-bold">{trail.name}</h4>
                      <p className="text-xs text-white/40">{trail.distance} • {trail.location}</p>
                    </div>
                  </motion.div>
                ))}
                {getTrailsByStatus('wishlist').length === 0 && (
                  <div className="p-12 text-center border-2 border-dashed border-white/5 rounded-[40px] text-white/20 italic font-serif">
                    Your scouting list is empty. Ask SummitScout for suggestions.
                  </div>
                )}
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
