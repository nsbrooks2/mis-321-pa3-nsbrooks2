import { useState, useEffect, useRef } from 'react';
import type { ChangeEvent } from 'react';
import { Trail, Review } from '../types';
import { 
  MapPin, 
  ArrowRight, 
  ShieldAlert, 
  Timer, 
  Mountain, 
  Route, 
  Bookmark, 
  CheckCircle, 
  ExternalLink, 
  Navigation, 
  Download, 
  Clock, 
  Backpack, 
  Layers,
  X,
  Star,
  MessageSquare,
  Upload,
  Camera,
  Loader2,
  User
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../lib/supabase';
import { fetchWithAuth } from '../lib/api';
import WeatherIntelligence from './WeatherIntelligence';
import PostCard from './PostCard';

interface TrailCardProps {
  trail: Trail;
  user?: any;
  userProfile?: any;
}

function TrailFieldLogs({ trailId, currentUserId }: { trailId: string, currentUserId?: string }) {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPosts();
  }, [trailId]);

  const fetchPosts = async () => {
    try {
      const resp = await fetchWithAuth(`/api/posts?trailId=${trailId}`);
      if (resp.ok) {
        const data = await resp.json();
        setPosts(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return null;
  if (posts.length === 0) return null;

  return (
    <div className="mt-16 space-y-10">
      <div className="flex items-center gap-4">
        <h4 className="text-[10px] uppercase tracking-[0.4em] font-black text-white/20 font-sans">Trail Field Logs</h4>
        <div className="h-px flex-1 bg-white/5" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {posts.map(post => (
          <PostCard key={post.id} post={post} currentUserId={currentUserId} />
        ))}
      </div>
    </div>
  );
}

export default function TrailCard({ trail, user, userProfile }: TrailCardProps) {
  const [loading, setLoading] = useState(false);
  const [localStatus, setLocalStatus] = useState<'wishlist' | 'completed' | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewPhotos, setReviewPhotos] = useState<string[]>([]);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (showDetail) {
      fetchReviews();
    }
  }, [showDetail]);

  const fetchReviews = async () => {
    try {
      const response = await fetchWithAuth(`/api/reviews/${trail.id}`);
      if (response.ok) {
        const data = await response.json();
        setReviews(data);
      }
    } catch (err) {
      console.error('Failed to fetch reviews:', err);
    }
  };

  const handlePhotoUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0] || !user) return;
    setLoading(true);
    try {
      const file = e.target.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('posts')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('posts')
        .getPublicUrl(filePath);

      setReviewPhotos(prev => [...prev, publicUrl]);
    } catch (err: any) {
      alert('Upload failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const submitReview = async () => {
    if (!user) return;
    setIsSubmittingReview(true);
    try {
      const response = await fetchWithAuth('/api/reviews', {
        method: 'POST',
        body: JSON.stringify({
          trail_id: trail.id,
          user_id: user.id,
          username: user.email.split('@')[0],
          avatar_url: '', 
          rating: reviewRating,
          comment: reviewComment,
          photo_urls: reviewPhotos
        })
      });

      if (response.ok) {
        setReviewComment('');
        setReviewPhotos([]);
        setShowReviewForm(false);
        fetchReviews();
      }
    } catch (err) {
      console.error('Review submission failed:', err);
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const getDifficultyStyles = (diff: Trail['difficulty']) => {
    switch (diff) {
      case 'Easy': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'Moderate': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'Challenging': return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      default: return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
    }
  };

  const setHikeStatus = async (status: 'wishlist' | 'completed') => {
    if (!user) return;
    setLoading(true);
    try {
      const response = await fetchWithAuth('/api/user-hikes', {
        method: 'POST',
        body: JSON.stringify({ userId: user.id, trailId: trail.id, status, trailDetail: trail })
      });
      if (response.ok) {
        setLocalStatus(status);
      }
    } catch (err) {
      console.error('Failed to set status:', err);
    } finally {
      setLoading(false);
    }
  };

  // Get first preview image from reviews if exists
  const previewImage = reviews.find(r => r.photo_urls.length > 0)?.photo_urls[0];

  return (
    <>
      <div className="group bg-trail-forest rounded-3xl border border-white/5 overflow-hidden card-shadow transition-all duration-500 hover:-translate-y-2 flex flex-col h-full relative">
        <div 
          className="h-44 relative overflow-hidden cursor-pointer flex items-center justify-center bg-black/40" 
          onClick={() => setShowDetail(true)}
        >
          {previewImage ? (
            <img 
              src={previewImage} 
              alt={trail.name}
              className="w-full h-full object-cover opacity-60 group-hover:scale-105 group-hover:opacity-80 transition-all duration-1000"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="flex flex-col items-center gap-3 text-white/20 group-hover:text-trail-moss/40 transition-colors">
               <Mountain className="w-16 h-16 transition-transform group-hover:scale-110 duration-700" />
               <span className="text-[10px] uppercase tracking-[0.3em] font-black">No Terrain Intel Yet</span>
            </div>
          )}
          
          <div className="absolute inset-0 bg-gradient-to-t from-trail-forest via-transparent to-transparent pointer-events-none" />
          <div className="absolute top-4 left-4 flex gap-2 z-20">
             <button 
               onClick={(e) => { e.stopPropagation(); setHikeStatus('completed'); }}
               className={`p-2 rounded-xl border transition-all ${localStatus === 'completed' ? 'bg-trail-moss border-trail-moss text-white' : 'bg-black/40 border-white/10 text-white/40 hover:text-white'}`}
               title="Mark as completed"
             >
                <CheckCircle className="w-4 h-4" />
             </button>
             <button 
               onClick={(e) => { e.stopPropagation(); setHikeStatus('wishlist'); }}
               className={`p-2 rounded-xl border transition-all ${localStatus === 'wishlist' ? 'bg-trail-moss border-trail-moss text-white' : 'bg-black/40 border-white/10 text-white/40 hover:text-white'}`}
               title="Add to wishlist"
             >
                <Bookmark className="w-4 h-4" />
             </button>
          </div>
          <div className="absolute top-4 right-4 flex flex-col gap-2 scale-90 origin-top-right">
            <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${getDifficultyStyles(trail.difficulty)} backdrop-blur-md`}>
              {trail.difficulty}
            </span>
            {trail.directions_url && (
              <a 
                href={trail.directions_url} 
                target="_blank" 
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="bg-black/60 backdrop-blur border border-white/10 p-2.5 rounded-2xl text-trail-moss hover:bg-trail-moss hover:text-white transition-all shadow-xl flex items-center justify-center"
                title="Get Directions"
              >
                <Navigation className="w-4 h-4" />
              </a>
            )}
            {trail.website_url && (
              <a 
                href={trail.website_url} 
                target="_blank" 
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="bg-black/60 backdrop-blur border border-white/10 p-2.5 rounded-2xl text-white/60 hover:text-white hover:bg-white/10 transition-all shadow-xl flex items-center justify-center"
                title="Trail Website"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            )}
          </div>
          <div className="absolute bottom-4 left-6 right-6">
             <div className="flex items-center gap-1 text-trail-moss text-[10px] font-bold uppercase tracking-widest mb-1">
               <MapPin className="w-3 h-3" />
               {trail.location}
             </div>
             <h3 className="text-3xl font-bold text-white leading-tight">{trail.name}</h3>
          </div>
        </div>

        <div className="p-6 flex-1 flex flex-col">
          {/* Stats Grid */}
          <div className="flex items-center gap-6 pb-6 border-b border-white/5">
            <div className="flex items-center gap-3">
              <Route className="w-4 h-4 text-trail-moss" />
              <div className="flex flex-col">
                <span className="text-[8px] text-white/30 uppercase font-black tracking-widest">Dist</span>
                <span className="text-xs font-bold text-white">{trail.distance}</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Mountain className="w-4 h-4 text-trail-moss" />
              <div className="flex flex-col">
                <span className="text-[8px] text-white/30 uppercase font-black tracking-widest">Gain</span>
                <span className="text-xs font-bold text-white">{trail.elevation_gain}</span>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="py-5 flex-1 cursor-pointer" onClick={() => setShowDetail(true)}>
            <p className="text-sm text-white/70 line-clamp-3 italic font-serif leading-relaxed">"{trail.description}"</p>
            
            <div className="mt-5 flex items-center justify-between">
              <div className="flex flex-wrap gap-2">
                {trail.tags.slice(0, 2).map(tag => (
                  <span key={tag} className="text-[9px] bg-white/5 text-white/50 px-2.5 py-1 rounded-full font-bold tracking-widest uppercase border border-white/5">
                    {tag}
                  </span>
                ))}
              </div>
              {reviews.length > 0 && (
                <div className="flex items-center gap-1.5 text-trail-moss font-black text-[10px]">
                   <Star className="w-3 h-3 fill-trail-moss" />
                   {(reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1)}
                </div>
              )}
            </div>
          </div>

          {/* Call to Action */}
          <div className="mt-auto flex gap-3">
            <button 
              onClick={() => setShowDetail(true)}
              className="flex-1 bg-trail-moss text-white py-4 rounded-2xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-white hover:text-trail-forest transition-all shadow-lg active:scale-95 duration-200 group/btn"
            >
               Expedition Intel <ArrowRight className="w-4 h-4 transition-transform group-hover/btn:translate-x-1" />
            </button>
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      <AnimatePresence>
        {showDetail && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 md:p-8">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowDetail(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="w-full max-w-6xl bg-trail-bg rounded-[40px] border border-white/10 shadow-2xl relative overflow-hidden flex flex-col h-[90vh]"
            >
               {/* Close Button */}
               <button 
                 onClick={() => setShowDetail(false)}
                 className="absolute top-6 right-6 z-50 p-3 bg-black/40 backdrop-blur rounded-2xl border border-white/10 text-white/60 hover:text-white transition-all shadow-xl"
               >
                  <X className="w-6 h-6" />
               </button>

               <div className="flex-1 overflow-y-auto custom-scrollbar">
                  {/* Hero Section */}
                  <div className="h-80 md:h-[450px] relative bg-black flex items-center justify-center">
                    {previewImage ? (
                      <img 
                        src={previewImage} 
                        alt={trail.name}
                        className="w-full h-full object-cover opacity-60"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <Mountain className="w-32 h-32 text-white/10" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-trail-bg via-trail-bg/40 to-transparent" />
                    
                    <div className="absolute bottom-12 left-12 right-12">
                       <span className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.3em] border ${getDifficultyStyles(trail.difficulty)} backdrop-blur-md mb-6 inline-block`}>
                          {trail.difficulty} EXPEDITION
                       </span>
                       <h2 className="text-5xl md:text-8xl font-black text-white tracking-tighter leading-none mb-6">{trail.name}</h2>
                       <div className="flex flex-wrap items-center gap-8 text-trail-moss uppercase tracking-widest font-black text-xs">
                          <div className="flex items-center gap-2">
                             <MapPin className="w-4 h-4" />
                             {trail.location}
                          </div>
                          {trail.best_time && (
                            <div className="flex items-center gap-2">
                               <Clock className="w-4 h-4" />
                               Season: {trail.best_time}
                            </div>
                          )}
                          <div className="flex items-center gap-2">
                             <MessageSquare className="w-4 h-4" />
                             {reviews.length} Intel Reports
                          </div>
                       </div>
                    </div>
                  </div>

                  <div className="p-12 grid grid-cols-1 lg:grid-cols-3 gap-16">
                     {/* Primary Info */}
                     <div className="lg:col-span-2 space-y-16">
                        <section className="flex flex-col md:flex-row md:items-start justify-between gap-8 pb-12 border-b border-white/5">
                           <div className="flex-1">
                              <h4 className="text-[10px] uppercase tracking-[0.4em] font-black text-white/20 mb-6 font-sans">Strategic Briefing</h4>
                              <p className="text-2xl md:text-3xl text-white/80 font-serif leading-relaxed italic border-l-4 border-trail-moss pl-8 py-2">
                                 "{trail.description}"
                              </p>
                           </div>
                           <div className="flex flex-wrap gap-4 shrink-0 pt-4">
                              {trail.directions_url && (
                                <a 
                                  href={trail.directions_url} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="px-8 py-5 bg-trail-moss text-white rounded-3xl text-[11px] font-black uppercase tracking-[0.2em] flex items-center gap-3 hover:scale-105 active:scale-95 transition-all shadow-xl shadow-trail-moss/20"
                                >
                                   <Navigation className="w-5 h-5" />
                                   Start Navigation
                                </a>
                              )}
                              {trail.website_url && (
                                <a 
                                  href={trail.website_url} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="px-8 py-5 bg-white/5 border border-white/10 text-white rounded-3xl text-[11px] font-black uppercase tracking-[0.2em] flex items-center gap-3 hover:bg-white/10 transition-all"
                                >
                                   <ExternalLink className="w-5 h-5" />
                                   Official Site
                                </a>
                              )}
                           </div>
                        </section>

                        <section className="grid grid-cols-2 md:grid-cols-4 gap-6">
                           {[
                             { icon: Route, label: 'Distance', val: trail.distance },
                             { icon: Mountain, label: 'Elevation', val: trail.elevation_gain },
                             { icon: Timer, label: 'Type', val: trail.type },
                             { icon: Layers, label: 'Terrain', val: trail.terrain?.join(', ') || 'Varied' }
                           ].map((stat, i) => (
                             <div key={i} className="bg-white/5 border border-white/10 p-6 rounded-[32px] text-center hover:bg-white/10 transition-colors">
                                <stat.icon className="w-8 h-8 text-trail-moss mx-auto mb-4" />
                                <span className="block text-[9px] uppercase tracking-[0.2em] text-white/30 font-black mb-1">{stat.label}</span>
                                <span className="text-base font-bold text-white">{stat.val}</span>
                             </div>
                           ))}
                        </section>

                        {/* Ranger Reviews Section */}
                        <section className="space-y-10">
                           <div className="flex items-center justify-between">
                              <h4 className="text-[10px] uppercase tracking-[0.4em] font-black text-white/20 font-sans">Field Intelligence</h4>
                              <button 
                                onClick={() => setShowReviewForm(!showReviewForm)}
                                className="text-[10px] font-black uppercase tracking-widest px-6 py-3 rounded-xl border border-trail-moss/30 text-trail-moss hover:bg-trail-moss hover:text-white transition-all flex items-center gap-2"
                              >
                                 {showReviewForm ? <X className="w-4 h-4" /> : <Camera className="w-4 h-4" />}
                                 {showReviewForm ? 'Cancel Report' : 'Submit Field Intel'}
                              </button>
                           </div>

                           {showReviewForm && (
                             <motion.div 
                               initial={{ opacity: 0, y: 10 }}
                               animate={{ opacity: 1, y: 0 }}
                               className="bg-white/5 border border-white/10 rounded-[32px] p-8 space-y-6"
                             >
                                <div className="flex items-center justify-between">
                                   <div className="flex gap-2">
                                      {[1, 2, 3, 4, 5].map((star) => (
                                        <button 
                                          key={star}
                                          onClick={() => setReviewRating(star)}
                                          className={`p-1 transition-colors ${reviewRating >= star ? 'text-amber-400' : 'text-white/10'}`}
                                        >
                                           <Star className={`w-6 h-6 ${reviewRating >= star ? 'fill-amber-400' : ''}`} />
                                        </button>
                                      ))}
                                   </div>
                                   <span className="text-[10px] font-black uppercase tracking-widest text-white/30">Select Rating</span>
                                </div>

                                <textarea 
                                  value={reviewComment}
                                  onChange={(e) => setReviewComment(e.target.value)}
                                  placeholder="Describe the trail conditions, terrain obstacles, or scenic highlights..."
                                  className="w-full bg-black/40 border border-white/10 rounded-2xl p-6 text-white text-sm focus:border-trail-moss focus:ring-1 focus:ring-trail-moss outline-none transition-all resize-none h-32"
                                />

                                <div className="flex flex-wrap gap-4">
                                   {reviewPhotos.map((url, i) => (
                                     <div key={i} className="w-24 h-24 rounded-2xl border border-white/10 overflow-hidden relative">
                                        <img src={url} className="w-full h-full object-cover" />
                                        <button 
                                          onClick={() => setReviewPhotos(prev => prev.filter((_, idx) => idx !== i))}
                                          className="absolute top-1 right-1 p-1 bg-black/60 rounded-lg text-white/50 hover:text-white"
                                        >
                                           <X className="w-3 h-3" />
                                        </button>
                                     </div>
                                   ))}
                                   <button 
                                     onClick={() => photoInputRef.current?.click()}
                                     className="w-24 h-24 rounded-2xl border-2 border-dashed border-white/10 flex flex-col items-center justify-center text-white/20 hover:text-trail-moss hover:border-trail-moss transition-all"
                                   >
                                      <Upload className="w-6 h-6 mb-2" />
                                      <span className="text-[8px] font-black uppercase tracking-widest">Add Photo</span>
                                   </button>
                                   <input ref={photoInputRef} type="file" hidden accept="image/*" onChange={handlePhotoUpload} />
                                </div>

                                <button 
                                  onClick={submitReview}
                                  disabled={!reviewComment.trim() || isSubmittingReview || !user}
                                  className="w-full bg-trail-moss text-white py-5 rounded-2xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-3 shadow-xl hover:shadow-trail-moss/20 transition-all disabled:opacity-30"
                                >
                                   {isSubmittingReview ? <Loader2 className="w-5 h-5 animate-spin" /> : <ArrowRight className="w-5 h-5" />}
                                   Archive Field Intelligence
                                </button>
                             </motion.div>
                           )}

                           <div className="space-y-8">
                              {reviews.length === 0 ? (
                                <div className="text-center py-20 bg-white/5 rounded-[40px] border border-dashed border-white/10">
                                   <MessageSquare className="w-12 h-12 text-white/5 mx-auto mb-4" />
                                   <p className="text-white/20 text-sm font-black uppercase tracking-[0.2em]">No intelligence reports registered</p>
                                </div>
                              ) : (
                                reviews.map((r) => (
                                  <div key={r.id} className="bg-white/5 border border-white/10 rounded-[32px] p-8 space-y-6 hover:bg-white/10 transition-colors">
                                     <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                           <div className="w-12 h-12 rounded-2xl bg-trail-accent flex items-center justify-center overflow-hidden border border-white/5">
                                              {r.avatar_url ? <img src={r.avatar_url} /> : <User className="text-trail-moss w-6 h-6" />}
                                           </div>
                                           <div>
                                              <h5 className="text-sm font-bold text-white uppercase tracking-widest">{r.username}</h5>
                                              <div className="flex gap-1 mt-1">
                                                 {[...Array(5)].map((_, i) => (
                                                   <Star key={i} className={`w-3 h-3 ${i < r.rating ? 'fill-amber-400 text-amber-400' : 'text-white/10'}`} />
                                                 ))}
                                              </div>
                                           </div>
                                        </div>
                                        <span className="text-[9px] text-white/20 font-black uppercase tracking-widest">
                                          {new Date(r.created_at).toLocaleDateString()}
                                        </span>
                                     </div>

                                     <p className="text-base text-white/70 leading-relaxed italic font-serif">"{r.comment}"</p>

                                     {r.photo_urls.length > 0 && (
                                       <div className="flex flex-wrap gap-4">
                                          {r.photo_urls.map((url, i) => (
                                            <div key={i} className="w-32 h-32 rounded-2xl overflow-hidden border border-white/10 group/img relative cursor-pointer">
                                               <img src={url} className="w-full h-full object-cover" />
                                               <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                  <X className="w-6 h-6 text-white rotate-45" />
                                               </div>
                                            </div>
                                          ))}
                                       </div>
                                     )}
                                  </div>
                                ))
                              )}
                           </div>
                        </section>

                        <TrailFieldLogs trailId={trail.id} currentUserId={user?.id} />
                     </div>

                     {/* Sidebar Actions */}
                     <div className="space-y-10">
                        <WeatherIntelligence location={trail.location} />

                        <section className="glass-panel p-10 rounded-[40px] border border-white/5 shadow-2xl space-y-8 sticky top-32">
                           <h4 className="text-[10px] uppercase tracking-[0.4em] font-black text-white/20 mb-2">Expedition Links</h4>
                           
                           <div className="space-y-4">
                              {trail.website_url && (
                                <a 
                                  href={trail.website_url} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="w-full bg-white/5 hover:bg-white/10 border border-white/10 p-5 rounded-2xl flex items-center justify-between group/link transition-all"
                                >
                                   <div className="flex items-center gap-4">
                                      <ExternalLink className="w-5 h-5 text-trail-moss" />
                                      <span className="text-xs font-bold text-white uppercase tracking-widest">Trail Page</span>
                                   </div>
                                   <ArrowRight className="w-4 h-4 text-white/20 group-hover/link:translate-x-1 transition-transform" />
                                </a>
                              )}

                              {trail.directions_url && (
                                <a 
                                  href={trail.directions_url} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="w-full bg-white/5 hover:bg-white/10 border border-white/10 p-5 rounded-2xl flex items-center justify-between group/link transition-all"
                                >
                                   <div className="flex items-center gap-4">
                                      <Navigation className="w-5 h-5 text-trail-moss" />
                                      <span className="text-xs font-bold text-white uppercase tracking-widest">Directions</span>
                                   </div>
                                   <ArrowRight className="w-4 h-4 text-white/20 group-hover/link:translate-x-1 transition-transform" />
                                </a>
                              )}

                              {trail.map_download_url && (
                                <a 
                                  href={trail.map_download_url} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="w-full bg-trail-moss text-white p-5 rounded-2xl flex items-center justify-between group/link transition-all shadow-lg hover:-translate-y-1"
                                >
                                   <div className="flex items-center gap-4">
                                      <Download className="w-5 h-5" />
                                      <span className="text-xs font-bold uppercase tracking-widest">Download Map</span>
                                   </div>
                                   <ArrowRight className="w-4 h-4 transition-transform group-hover/link:translate-x-1" />
                                </a>
                              )}
                           </div>

                           <div className="pt-8 border-t border-white/5 bg-rose-500/5 p-8 rounded-[32px] border border-rose-500/10 flex gap-6 items-start">
                              <ShieldAlert className="w-8 h-8 text-rose-400 shrink-0 mt-1" />
                              <div className="space-y-1">
                                 <span className="text-[10px] text-rose-400 font-black uppercase tracking-[0.3em]">Advisory</span>
                                 <p className="text-xs text-rose-200/60 leading-relaxed italic">{trail.safety_warning}</p>
                              </div>
                           </div>

                           <div className="h-64 rounded-[32px] bg-black/40 border border-white/5 overflow-hidden relative group mt-8">
                              {trail.coordinates ? (
                                <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
                                   <MapPin className="w-10 h-10 text-trail-moss mb-3" />
                                   <span className="text-[10px] text-white/30 uppercase font-black tracking-widest mb-1">Coordinates</span>
                                   <span className="text-xs font-mono text-white/50">{trail.coordinates.lat.toFixed(4)}°, {trail.coordinates.lng.toFixed(4)}°</span>
                                   <a 
                                     href={`https://www.google.com/maps/search/?api=1&query=${trail.coordinates.lat},${trail.coordinates.lng}`}
                                     target="_blank"
                                     rel="noopener noreferrer"
                                     className="mt-6 text-[10px] text-trail-moss font-black uppercase tracking-widest hover:text-white transition-colors"
                                   >
                                     Open Satellite View
                                   </a>
                                </div>
                              ) : (
                                <div className="h-full flex items-center justify-center text-white/10 italic text-sm">
                                   Satellite map unavailable
                                </div>
                              )}
                           </div>
                        </section>
                     </div>
                  </div>
               </div>

               {/* Sticky Footer for Status */}
               <div className="p-10 border-t border-white/5 bg-trail-forest/50 backdrop-blur-xl flex gap-6">
                  <button 
                    onClick={() => setHikeStatus('completed')}
                    className={`flex-1 py-5 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-4 border ${localStatus === 'completed' ? 'bg-trail-moss border-trail-moss text-white shadow-[0_0_20px_rgba(139,168,92,0.3)]' : 'bg-white/5 border-white/10 text-white/40 hover:text-white'}`}
                  >
                     <CheckCircle className={`w-6 h-6 ${localStatus === 'completed' ? 'text-white' : 'text-trail-moss'}`} />
                     Mission Accomplished
                  </button>
                  <button 
                    onClick={() => setHikeStatus('wishlist')}
                    className={`flex-1 py-5 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-4 border ${localStatus === 'wishlist' ? 'bg-trail-moss border-trail-moss text-white shadow-[0_0_20px_rgba(139,168,92,0.3)]' : 'bg-white/5 border-white/10 text-white/40 hover:text-white'}`}
                  >
                     <Bookmark className={`w-6 h-6 ${localStatus === 'wishlist' ? 'text-white' : 'text-trail-moss'}`} />
                     Target for scouting
                  </button>
               </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
