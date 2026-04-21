import { Trail } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import TrailCard from './TrailCard';
import { Compass, Loader2 } from 'lucide-react';

interface DiscoveryDeckProps {
  trails: Trail[];
  loading: boolean;
  user?: any;
  userProfile?: any;
}

export default function DiscoveryDeck({ trails, loading, user, userProfile }: DiscoveryDeckProps) {
  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      <div className="p-12 pb-8 flex items-end justify-between z-10">
        <div>
          <span className="text-[10px] font-black uppercase tracking-[0.5em] text-trail-moss mb-4 block">Sector Intelligence</span>
          <h2 className="text-6xl font-black tracking-tighter text-white mb-2 leading-none">Discovery Deck</h2>
          <p className="text-white/40 font-serif italic text-xl">Where silence meets the peak.</p>
        </div>
        <div className="flex items-center gap-3 bg-white/5 backdrop-blur-xl px-6 py-3 rounded-2xl border border-white/10 shadow-2xl mb-1">
           <Compass className="w-5 h-5 text-trail-moss animate-spin-slow" />
           <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/50">{trails.length} ROUTES MAPPED</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-12 pt-4 custom-scrollbar z-10">
        {loading ? (
          <div className="h-full flex flex-col items-center justify-center text-trail-moss/30">
            <Loader2 className="w-12 h-12 animate-spin mb-4" />
            <p className="font-serif italic text-2xl tracking-widest uppercase opacity-50">Mapping Terrain...</p>
          </div>
        ) : (
          <div className="max-w-[1400px] mx-auto grid grid-cols-1 xl:grid-cols-2 gap-10 pb-24">
            <AnimatePresence mode="popLayout">
              {trails.length > 0 ? (
                trails.map((trail, idx) => (
                  <motion.div
                    key={trail.id}
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ delay: idx * 0.1, duration: 0.5, ease: "easeOut" }}
                    layout
                  >
                    <TrailCard trail={trail} user={user} userProfile={userProfile} />
                  </motion.div>
                ))
              ) : (
                <div className="col-span-full h-64 flex flex-col items-center justify-center text-slate-400">
                   <p className="font-serif italic text-2xl">No trails found in the current sector.</p>
                   <p className="text-sm mt-2">Try adjusting your search criteria.</p>
                </div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-trail-bg to-transparent pointer-events-none z-10" />
    </div>
  );
}
