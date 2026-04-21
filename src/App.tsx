import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mountain, Menu, X, ShieldAlert, User as UserIcon } from 'lucide-react';
import ChatPanel from './components/ChatPanel';
import DiscoveryDeck from './components/DiscoveryDeck';
import ProfileView from './components/ProfileView';
import SocialFeed from './components/SocialFeed';
import AuthView from './components/AuthView';
import { Trail } from './types';
import { supabase } from './lib/supabase';
import { fetchWithAuth } from './lib/api';

export default function App() {
  const [activeTab, setActiveTab] = useState<'discovery' | 'profile' | 'social'>('discovery');
  const [viewingUserId, setViewingUserId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);

  const handleNavigateToProfile = (userId: string) => {
    setViewingUserId(userId);
    setActiveTab('profile');
  };

  const handleNavigateToTab = (tab: 'discovery' | 'profile' | 'social') => {
    if (tab === 'profile') setViewingUserId(null); 
    setActiveTab(tab);
  };
  const [authLoading, setAuthLoading] = useState(true);
  const [trails, setTrails] = useState<Trail[]>([]);
  const [loading, setLoading] = useState(true);
  const [serverReady, setServerReady] = useState(false);

  useEffect(() => {
    checkServerHealth();
  }, []);

  const [healthCheckStatus, setHealthCheckStatus] = useState<'checking' | 'retrying' | 'failed'>('checking');

  const checkServerHealth = async (retries = 20) => {
    try {
      const resp = await fetch('/api/health');
      if (resp.ok) {
        const data = await resp.json();
        if (data.status === 'ok') {
          setServerReady(true);
          return;
        }
      }
      throw new Error('Not ready');
    } catch (err) {
      if (retries > 0) {
        setHealthCheckStatus('retrying');
        setTimeout(() => checkServerHealth(retries - 1), 2000);
      } else {
        setHealthCheckStatus('failed');
      }
    }
  };

  useEffect(() => {
    if (!supabase) {
      setAuthLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null;
      setUser(u);
      if (u) {
        setActiveTab('discovery');
      } else {
        setUserProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (serverReady) {
      fetchTrails();
    }
  }, [serverReady]);

  useEffect(() => {
    if (user && serverReady) {
      fetchUserProfile(user.id);
    }
  }, [user, serverReady]);

  const fetchUserProfile = async (userId: string, retries = 5) => {
    try {
      const response = await fetchWithAuth(`/api/profile/${userId}`);
      if (response.ok) {
        const data = await response.json();
        setUserProfile(data);
      } else if ((response.status === 503 || response.status === 502) && retries > 0) {
        setTimeout(() => fetchUserProfile(userId, retries - 1), 2000);
      }
    } catch (err: any) {
      if (retries > 0) {
        setTimeout(() => fetchUserProfile(userId, retries - 1), 3000);
      }
    }
  };

  const handleProfileUpdate = () => {
    if (user) fetchUserProfile(user.id);
  };

  const fetchTrails = async (query = '') => {
    setLoading(true);
    console.log(`[Basecamp] Fetching trails for query: "${query}"`);
    try {
      const response = await fetchWithAuth(`/api/trails${query ? `?q=${encodeURIComponent(query)}` : ''}`);
      const data = await response.json();
      console.log(`[Basecamp] Received ${data.length} trails.`);
      setTrails(data);
      return data.length;
    } catch (err) {
      console.error(`[Basecamp] Trail Sync Error:`, err);
      return 0;
    } finally {
      setLoading(false);
    }
  };

  const handleResetTrails = () => {
    fetchTrails();
  };

  const handleLogout = async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }
    setUser(null);
    setActiveTab('discovery');
  };

  if (authLoading) {
    return (
      <div className="h-screen bg-trail-bg flex items-center justify-center">
         <Mountain className="w-12 h-12 text-trail-moss animate-pulse" />
      </div>
    );
  }

  if (user && !serverReady) {
    return (
      <div className="h-screen bg-trail-bg flex flex-col items-center justify-center p-8 text-center">
         <Mountain className="w-12 h-12 text-trail-moss animate-pulse mb-4" />
         <h2 className="text-xl font-bold text-white tracking-widest uppercase opacity-50">
           {healthCheckStatus === 'failed' ? 'Intelligence Offline' : 'Syncing Intelligence...'}
         </h2>
         <p className="text-[10px] text-trail-moss mt-4 opacity-30">
           {healthCheckStatus === 'failed' 
             ? 'Basecamp servers are unreachable. Please check your deployment logs.' 
             : 'Connecting to SummitScout basecamp servers (establishing satellite link)...'}
         </p>
         {healthCheckStatus === 'failed' && (
           <button 
             onClick={() => window.location.reload()}
             className="mt-6 text-white bg-white/5 px-6 py-2 rounded-full text-[10px] uppercase tracking-widest hover:bg-white/10 transition-all"
           >
             Retry Signal
           </button>
         )}
      </div>
    );
  }

  // If Supabase is missing, we show a helpful setup screen rather than the login form which would crash
  if (!supabase) {
    return (
      <div className="h-screen bg-trail-bg flex flex-col items-center justify-center p-8 text-center">
         <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/dark-wood.png')] opacity-10 pointer-events-none" />
         <Mountain className="w-20 h-20 text-trail-moss mb-6" />
         <h2 className="text-3xl font-black text-white mb-2 tracking-widest uppercase">Basecamp Required</h2>
         <p className="text-trail-moss font-serif italic text-xl max-w-md mb-8">
           To start your journey, you need to connect your Supabase account.
         </p>
         <div className="glass-panel p-6 rounded-3xl max-w-lg border border-white/10 card-shadow text-left">
            <h3 className="text-white font-bold mb-4 flex items-center gap-2">
               <ShieldAlert className="w-5 h-5 text-trail-moss" />
               Configuration Checklist:
            </h3>
            <ul className="space-y-3 text-sm text-white/50 font-sans">
               <li className="flex items-start gap-2">
                  <span className="text-trail-moss font-bold">1.</span>
                  <span>Add <code className="text-white bg-white/5 px-2 py-0.5 rounded">VITE_SUPABASE_URL</code> to AI Studio Secrets.</span>
               </li>
               <li className="flex items-start gap-2">
                  <span className="text-trail-moss font-bold">2.</span>
                  <span>Add <code className="text-white bg-white/5 px-2 py-0.5 rounded">VITE_SUPABASE_ANON_KEY</code> to AI Studio Secrets.</span>
               </li>
               <li className="flex items-start gap-2">
                  <span className="text-trail-moss font-bold">3.</span>
                  <span>Add <code className="text-white bg-white/5 px-2 py-0.5 rounded">SUPABASE_SERVICE_ROLE_KEY</code> to AI Studio Secrets.</span>
               </li>
            </ul>
            <p className="mt-8 text-[10px] text-white/20 uppercase tracking-[0.2em] font-black text-center">
               The trail waits for no one.
            </p>
         </div>
         <button 
           onClick={() => window.location.reload()}
           className="mt-8 text-white/40 hover:text-white transition-colors text-xs font-bold uppercase tracking-widest"
         >
           Refresh once secrets are added
         </button>
      </div>
    );
  }

  if (!user) {
    return <AuthView onSuccess={setUser} />;
  }

  return (
    <div className="flex h-screen bg-trail-bg overflow-hidden text-trail-ink selection:bg-trail-moss/30">
      {/* Navigation / Header */}
      <header className="absolute top-0 left-0 right-0 h-20 flex items-center justify-between px-8 z-50 pointer-events-none">
        <div 
          className="flex items-center gap-3 cursor-pointer pointer-events-auto group"
          onClick={() => setActiveTab('discovery')}
        >
          <Mountain className="w-10 h-10 text-trail-moss group-hover:rotate-12 transition-transform" />
          <h1 className="text-3xl font-black tracking-widest text-white">SUMMIT<span className="text-trail-moss">SCOUT</span></h1>
        </div>
        
        <div className="flex items-center gap-4 pointer-events-auto">
          <div className="flex bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-1 shadow-2xl">
             <button 
               onClick={() => handleNavigateToTab('discovery')}
               className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'discovery' ? 'bg-trail-moss text-white shadow-lg' : 'text-white/40 hover:text-white/60'}`}
             >
                Discovery
             </button>
             <button 
               onClick={() => handleNavigateToTab('social')}
               className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'social' ? 'bg-trail-moss text-white shadow-lg' : 'text-white/40 hover:text-white/60'}`}
             >
                Feed
             </button>
             <button 
               onClick={() => handleNavigateToTab('profile')}
               className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'profile' ? 'bg-trail-moss text-white shadow-lg' : 'text-white/40 hover:text-white/60'}`}
             >
                Expeditions
             </button>
          </div>

          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-3 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 hover:bg-white/10 transition-all shadow-xl active:scale-95"
          >
            {isSidebarOpen ? <X className="w-6 h-6 text-white" /> : <Menu className="w-6 h-6 text-white" />}
          </button>
          
          <div 
            onClick={() => handleNavigateToTab('profile')}
            className="w-12 h-12 rounded-2xl bg-trail-accent border border-white/10 flex items-center justify-center cursor-pointer hover:border-trail-moss transition-all group overflow-hidden"
          >
             {userProfile?.avatar_url ? (
               <img 
                 src={userProfile.avatar_url} 
                 alt="Profile" 
                 className="w-full h-full object-cover group-hover:scale-110 transition-transform" 
                 referrerPolicy="no-referrer"
               />
             ) : (
               <UserIcon className="w-6 h-6 text-trail-moss group-hover:scale-110 transition-transform" />
             )}
          </div>
        </div>
      </header>

      <main className="flex flex-1 pt-20 overflow-hidden">
        {/* Left Panel: Chat Interface (Always visible if active discovery) */}
        <AnimatePresence mode="wait">
          {activeTab === 'discovery' && (
            <motion.div 
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -20, opacity: 0 }}
              className="w-full lg:w-[450px] xl:w-[500px] border-r border-white/5 flex flex-col bg-black/20 overflow-hidden"
            >
              <ChatPanel 
                onSearch={async (query) => {
                  const count = await fetchTrails(query);
                  return count;
                }}
                onSetTrails={(newTrails) => setTrails(newTrails)}
                onNavigateToTab={handleNavigateToTab}
                onNavigateToProfile={handleNavigateToProfile}
                trails={trails} 
                user={user} 
                userProfile={userProfile} 
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Dynamic Content Panel */}
        <div className="flex-1 flex overflow-hidden relative">
          <AnimatePresence mode="wait">
            {activeTab === 'discovery' ? (
              <motion.div 
                key="discovery"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.02 }}
                className="flex-1 flex"
              >
                <AnimatePresence mode="wait">
                  {isSidebarOpen && (
                    <motion.div 
                      initial={{ x: 20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      exit={{ x: 20, opacity: 0 }}
                      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                      className="flex-1 flex flex-col bg-trail-bg overflow-hidden relative"
                    >
                      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/dark-wood.png')] opacity-10 pointer-events-none" />
                      <DiscoveryDeck 
                        trails={trails} 
                        loading={loading} 
                        user={user} 
                        userProfile={userProfile} 
                        onReset={handleResetTrails}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ) : activeTab === 'social' ? (
              <motion.div 
                key="social"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 20, opacity: 0 }}
                className="flex-1 flex overflow-hidden"
              >
                <SocialFeed 
                  user={user} 
                  userProfile={userProfile} 
                  onNavigateToProfile={handleNavigateToProfile} 
                />
              </motion.div>
            ) : (
              <motion.div 
                key="profile"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 20, opacity: 0 }}
                className="flex-1 flex overflow-hidden"
              >
                <ProfileView 
                  user={user} 
                  viewingUserId={viewingUserId}
                  onLogout={handleLogout} 
                  allTrails={trails} 
                  onProfileUpdate={handleProfileUpdate}
                  onNavigateToProfile={handleNavigateToProfile}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
