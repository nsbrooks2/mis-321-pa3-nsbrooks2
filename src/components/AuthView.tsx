import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Mountain, Mail, Lock, LogIn, UserPlus } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface AuthViewProps {
  onSuccess: (user: any) => void;
}

export default function AuthView({ onSuccess }: AuthViewProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (!supabase) throw new Error("Connection to Basecamp lost. Please check configuration.");
      if (isLogin) {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        onSuccess(data.user);
      } else {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        // Supabase usually sends a confirmation email, but data.user might be available
        if (data.user) onSuccess(data.user);
        setError("Account created! Check your email if verification is required.");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-trail-bg flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/dark-wood.png')] opacity-10 pointer-events-none" />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md glass-panel p-10 rounded-[40px] card-shadow relative z-10"
      >
        <div className="flex flex-col items-center mb-8">
          <Mountain className="w-16 h-16 text-trail-moss mb-4" />
          <h2 className="text-4xl font-black tracking-widest text-white">SUMMIT<span className="text-trail-moss">SCOUT</span></h2>
          <p className="text-trail-moss font-serif italic text-lg mt-2">The mountain is calling.</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-400 text-sm italic py-3">
             {error}
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-4">
          <div className="relative group">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30 group-focus-within:text-trail-moss transition-colors" />
            <input 
              type="email"
              required
              placeholder="Email Address"
              className="w-full bg-black/20 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white focus:outline-none focus:border-trail-moss/50 focus:ring-2 focus:ring-trail-moss/10 transition-all text-sm"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="relative group">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30 group-focus-within:text-trail-moss transition-colors" />
            <input 
              type="password"
              required
              placeholder="Password"
              className="w-full bg-black/20 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white focus:outline-none focus:border-trail-moss/50 focus:ring-2 focus:ring-trail-moss/10 transition-all text-sm"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-trail-moss text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 hover:bg-white hover:text-trail-forest transition-all shadow-xl disabled:opacity-50 active:scale-95 mb-6"
          >
            {loading ? 'Processing...' : (isLogin ? 'Establish Basecamp' : 'Join Expedition')}
            <LogIn className="w-4 h-4" />
          </button>
        </form>

        <div className="text-center pt-4 border-t border-white/5">
          <button 
            onClick={() => setIsLogin(!isLogin)}
            className="text-[10px] uppercase font-black tracking-widest text-white/30 hover:text-trail-moss transition-colors"
          >
            {isLogin ? "Don't have an account? Sign Up" : "Already have an account? Login"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
