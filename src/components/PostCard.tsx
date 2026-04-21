import React, { useState, useEffect } from 'react';
import { Heart, MessageCircle, Share2, MapPin, User, MoreHorizontal, ChevronLeft, ChevronRight, Send, Loader2 } from 'lucide-react';
import { Post, Comment } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { fetchWithAuth } from '../lib/api';

interface PostCardProps {
  key?: React.Key;
  post: Post;
  currentUserId?: string;
  onNavigateToProfile?: (userId: string) => void;
}

export default function PostCard({ post, currentUserId, onNavigateToProfile }: PostCardProps) {
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentImgIndex, setCurrentImgIndex] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(post.likes_count);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [commenting, setCommenting] = useState(false);

  useEffect(() => {
    if (currentUserId && post.user_id !== currentUserId) {
      checkFollowStatus();
    }
    setLikesCount(post.likes_count);
  }, [currentUserId, post.user_id, post.likes_count]);

  const checkFollowStatus = async () => {
    try {
      const resp = await fetchWithAuth(`/api/follows/${currentUserId}`);
      if (resp.ok) {
        const data = await resp.json();
        setIsFollowing(data.following.some((f: any) => f.following_id === post.user_id));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleLike = async () => {
    if (!currentUserId) return;
    try {
      const resp = await fetchWithAuth(`/api/posts/${post.id}/like`, {
        method: 'POST',
        body: JSON.stringify({ userId: currentUserId })
      });
      if (resp.ok) {
        const data = await resp.json();
        setIsLiked(data.liked);
        setLikesCount(prev => data.liked ? prev + 1 : prev - 1);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchComments = async () => {
    try {
      const resp = await fetchWithAuth(`/api/posts/${post.id}/comments`);
      if (resp.ok) {
        const data = await resp.json();
        setComments(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUserId || !newComment.trim() || commenting) return;
    setCommenting(true);
    try {
      const resp = await fetchWithAuth(`/api/posts/${post.id}/comments`, {
        method: 'POST',
        body: JSON.stringify({
          user_id: currentUserId,
          username: 'Me', 
          content: newComment
        })
      });
      if (resp.ok) {
        const data = await resp.json();
        setComments(prev => [...prev, data]);
        setNewComment('');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCommenting(false);
    }
  };

  useEffect(() => {
    if (showComments) fetchComments();
  }, [showComments]);

  const handleFollow = async () => {
    if (!currentUserId || loading) return;
    setLoading(true);
    try {
      if (isFollowing) {
        await fetchWithAuth('/api/follows', {
          method: 'DELETE',
          body: JSON.stringify({ followerId: currentUserId, followingId: post.user_id })
        });
        setIsFollowing(false);
      } else {
        await fetchWithAuth('/api/follows', {
          method: 'POST',
          body: JSON.stringify({ followerId: currentUserId, followingId: post.user_id })
        });
        setIsFollowing(true);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const nextImg = () => {
    if (post.photo_urls.length > 1) {
      setCurrentImgIndex((prev) => (prev + 1) % post.photo_urls.length);
    }
  };

  const prevImg = () => {
    if (post.photo_urls.length > 1) {
      setCurrentImgIndex((prev) => (prev - 1 + post.photo_urls.length) % post.photo_urls.length);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-trail-forest rounded-3xl border border-white/5 overflow-hidden card-shadow mb-6 group max-w-lg mx-auto"
    >
      {/* Header */}
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div 
            onClick={() => onNavigateToProfile?.(post.user_id)}
            className="w-8 h-8 rounded-full bg-trail-accent border border-white/10 overflow-hidden flex items-center justify-center cursor-pointer"
          >
            {post.avatar_url ? (
              <img src={post.avatar_url} alt={post.username} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <User className="w-4 h-4 text-trail-moss" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 
                onClick={() => onNavigateToProfile?.(post.user_id)}
                className="text-[12px] font-bold text-white tracking-wide cursor-pointer hover:text-trail-moss transition-colors"
              >
                {post.username}
              </h4>
              {currentUserId && post.user_id !== currentUserId && (
                <button 
                  onClick={handleFollow}
                  disabled={loading}
                  className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md transition-all ${
                    isFollowing 
                    ? 'bg-white/5 text-white/30' 
                    : 'bg-trail-moss/20 text-trail-moss'
                  }`}
                >
                  {isFollowing ? 'Following' : 'Follow'}
                </button>
              )}
            </div>
            {post.location_name && (
              <div className="flex items-center gap-1 text-[9px] text-white/40 font-bold uppercase tracking-widest">
                <MapPin className="w-2.5 h-2.5" />
                {post.location_name}
              </div>
            )}
          </div>
        </div>
        <MoreHorizontal className="w-4 h-4 text-white/20" />
      </div>

      {/* Content Carousel */}
      {post.photo_urls.length > 0 && (
        <div className="relative aspect-[4/5] bg-black/40 overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.img 
              key={currentImgIndex}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              src={post.photo_urls[currentImgIndex]} 
              alt="Hike photo" 
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </AnimatePresence>
          
          {post.photo_urls.length > 1 && (
            <>
              <button 
                onClick={prevImg}
                className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-black/40 backdrop-blur rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button 
                onClick={nextImg}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-black/40 backdrop-blur rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1 px-2 py-1 bg-black/40 backdrop-blur rounded-full">
                {post.photo_urls.map((_, i) => (
                   <div key={i} className={`w-1 h-1 rounded-full ${i === currentImgIndex ? 'bg-trail-moss' : 'bg-white/20'}`} />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="p-4 pt-3">
        <div className="flex items-center gap-5 mb-3">
          <button onClick={handleLike} className="flex items-center gap-1.5 group">
            <Heart className={`w-5 h-5 transition-colors ${isLiked ? 'text-rose-500 fill-rose-500' : 'text-white/40 group-hover:text-rose-500'}`} />
            <span className="text-[10px] font-bold text-white/40">{likesCount}</span>
          </button>
          <button onClick={() => setShowComments(!showComments)} className="flex items-center gap-1.5 group">
            <MessageCircle className="w-5 h-5 text-white/40 group-hover:text-trail-moss transition-colors" />
            <span className="text-[10px] font-bold text-white/40">{comments.length || post.comments_count || 0}</span>
          </button>
          <Share2 className="w-5 h-5 text-white/40 hover:text-white transition-colors cursor-pointer" />
        </div>

        <div className="space-y-1">
          <p className="text-[13px] text-white/90 leading-relaxed font-serif italic">
            <span 
              onClick={() => onNavigateToProfile?.(post.user_id)}
              className="font-sans font-black mr-2 not-italic text-white cursor-pointer hover:text-trail-moss transition-colors"
            >
              {post.username}
            </span>
            {post.caption}
          </p>
          <span className="text-[8px] text-white/20 font-black uppercase tracking-widest block pt-1">
            {new Date(post.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
          </span>
        </div>

        {/* Comments Section */}
        <AnimatePresence>
          {showComments && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="mt-4 pt-4 border-t border-white/5 space-y-4 overflow-hidden"
            >
              <div className="space-y-3 max-h-40 overflow-y-auto custom-scrollbar">
                {comments.length > 0 ? (
                  comments.map(c => (
                    <div key={c.id} className="flex gap-2">
                      <span className="text-[11px] font-black text-white shrink-0">{c.username}</span>
                      <p className="text-[11px] text-white/60">{c.content}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-[10px] text-white/20 italic">No field observations yet.</p>
                )}
              </div>
              
              <form onSubmit={handleComment} className="relative mt-2">
                <input 
                  type="text"
                  value={newComment}
                  onChange={e => setNewComment(e.target.value)}
                  placeholder="Add intel..."
                  className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-2 text-[11px] text-white focus:border-trail-moss transition-all pr-10"
                />
                <button 
                  type="submit"
                  disabled={!newComment.trim() || commenting}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-trail-moss disabled:opacity-20 transition-opacity"
                >
                  {commenting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                </button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
