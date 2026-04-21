import { useState, useRef, useEffect } from 'react';
import { Send, User as UserIcon, Mountain, Plus, MessageSquare, History, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Message, Trail, ChatSession } from '../types';
import { supabase } from '../lib/supabase';
import { GoogleGenAI, Type } from "@google/genai";

interface TrailyAvatarProps {
  mood?: 'neutral' | 'thinking' | 'happy' | 'alert';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

function TrailyAvatar({ mood = 'neutral', size = 'md', className = '' }: TrailyAvatarProps) {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-24 h-24'
  };

  return (
    <motion.div 
      animate={{ 
        y: [0, -4, 0],
        scale: mood === 'thinking' ? [1, 1.05, 1] : 1
      }}
      transition={{ 
        duration: 3, 
        repeat: Infinity, 
        ease: "easeInOut" 
      }}
      className={`relative rounded-full flex items-center justify-center bg-trail-accent border-2 border-trail-moss/30 shadow-[0_0_20px_rgba(139,168,92,0.15)] ${sizeClasses[size]} ${className}`}
    >
      <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-trail-moss/20 to-transparent opacity-50" />
      
      {/* Screen Face */}
      <div className="relative w-[80%] h-[80%] rounded-full bg-black/80 border border-white/5 flex items-center justify-center overflow-hidden">
        {/* Glowing grid effect */}
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#8BA85C_1px,transparent_1px)] [background-size:4px_4px]" />
        
        {/* Eyes */}
        <div className="flex gap-2">
          <motion.div 
            animate={
              mood === 'thinking' ? { height: [4, 8, 4] } :
              mood === 'happy' ? { scaleY: 0.5, y: -2 } :
              mood === 'alert' ? { scale: [1, 1.2, 1], height: 8 } :
              { height: 6 }
            }
            transition={{ repeat: Infinity, duration: mood === 'alert' ? 0.5 : 1 }}
            className={`w-1.5 rounded-full bg-trail-moss shadow-[0_0_8px_#8BA85C] ${
              mood === 'happy' ? 'h-3 rounded-b-none transition-all' : 
              mood === 'alert' ? 'bg-amber-400 shadow-[0_0_8px_#fbbf24]' : 
              'h-1.5'
            }`} 
          />
          <motion.div 
            animate={
              mood === 'thinking' ? { height: [8, 4, 8] } :
              mood === 'happy' ? { scaleY: 0.5, y: -2 } :
              mood === 'alert' ? { scale: [1, 1.2, 1], height: 8 } :
              { height: 6 }
            }
            transition={{ repeat: Infinity, duration: mood === 'alert' ? 0.5 : 1 }}
            className={`w-1.5 rounded-full bg-trail-moss shadow-[0_0_8px_#8BA85C] ${
              mood === 'happy' ? 'h-3 rounded-b-none transition-all' : 
              mood === 'alert' ? 'bg-amber-400 shadow-[0_0_8px_#fbbf24]' : 
              'h-1.5'
            }`} 
          />
        </div>

        {/* Mouth/Indicator */}
        <motion.div 
          animate={mood === 'thinking' ? { opacity: [0.2, 1, 0.2] } : { opacity: 0.4 }}
          transition={{ repeat: Infinity, duration: 1.5 }}
          className="absolute bottom-1 w-2 h-0.5 bg-trail-moss rounded-full"
        />
      </div>

      {/* Decorative Antennae/Ears */}
      <div className="absolute -top-1 -left-1 w-3 h-3 bg-trail-moss/20 rounded-full blur-[2px]" />
      <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-trail-moss/20 rounded-full blur-[2px]" />
    </motion.div>
  );
}

interface ChatPanelProps {
  onSearch: (query: string) => Promise<number>;
  onSetTrails: (trails: Trail[]) => void;
  onNavigateToTab: (tab: 'discovery' | 'profile' | 'social') => void;
  onNavigateToProfile: (userId: string) => void;
  trails: Trail[];
  user?: any;
  userProfile?: any;
}

export default function ChatPanel({ onSearch, onSetTrails, onNavigateToTab, onNavigateToProfile, trails, user, userProfile }: ChatPanelProps) {
  const [input, setInput] = useState('');
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const aiRef = useRef<GoogleGenAI | null>(null);

  useEffect(() => {
    if (!aiRef.current) {
      const key = process.env.GEMINI_API_KEY || (process as any).env?.VITE_GEMINI_API_KEY;
      aiRef.current = new GoogleGenAI({ apiKey: key || '' });
    }
  }, []);

  const currentSession = sessions.find(s => s.id === currentSessionId);
  const messages = currentSession?.messages || [];

  useEffect(() => {
    if (user) {
      fetchSessions();
    }
  }, [user]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const fetchWithAuth = async (url: string, options: any = {}) => {
    if (!supabase) throw new Error("Supabase not configured");
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error("No active session");

    const headers = {
      ...options.headers,
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json'
    };

    return fetch(url, { ...options, headers });
  };

  const fetchSessions = async (retries = 5) => {
    if (!user) return;
    try {
      const response = await fetchWithAuth(`/api/chats/${user.id}`);
      if (response.ok) {
        const data = await response.json();
        setSessions(data);
        if (data.length > 0 && !currentSessionId) {
          setCurrentSessionId(data[0].id);
        } else if (data.length === 0) {
          createNewSession();
        }
      } else if ((response.status === 503 || response.status === 502) && retries > 0) {
        setTimeout(() => fetchSessions(retries - 1), 2000);
      }
    } catch (err) {
      console.error('Failed to fetch sessions:', err);
      if (retries > 0) {
        setTimeout(() => fetchSessions(retries - 1), 3000);
      }
    }
  };

  const createNewSession = () => {
    const newSession: ChatSession = {
      id: Date.now().toString(),
      user_id: user?.id || 'anonymous',
      title: 'New Expedition',
      messages: [
        {
          id: '1',
          role: 'assistant',
          content: "Beep-boop! Scanning the perimeter... I'm Traily, your dedicated Scout Bot! Ready to find some epic terrain?",
          timestamp: Date.now()
        }
      ],
      created_at: new Date().toISOString()
    };
    setSessions(prev => [newSession, ...prev]);
    setCurrentSessionId(newSession.id);
    if (user) saveSession(newSession);
  };

  const saveSession = async (session: ChatSession) => {
    if (!user) return;
    try {
      await fetchWithAuth('/api/chats', {
        method: 'POST',
        body: JSON.stringify({
          id: session.id,
          userId: user.id,
          title: session.title,
          messages: session.messages
        })
      });
    } catch (err) {
      console.error('Failed to save session:', err);
    }
  };

  const updateSessionMessages = (newMessages: Message[]) => {
    setSessions(prev => prev.map(s => {
      if (s.id === currentSessionId) {
        const updated = { ...s, messages: newMessages };
        if (user) saveSession(updated);
        return updated;
      }
      return s;
    }));
  };

  const handleSend = async () => {
    if (!input.trim() || isTyping || !currentSessionId) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: Date.now()
    };

    const updatedMessages = [...messages, userMessage];
    updateSessionMessages(updatedMessages);
    setInput('');
    setIsTyping(true);

    try {
      if (!aiRef.current) throw new Error("Intelligence core not initialized.");

      // Format history correctly: model (assistant) and user roles alternating.
      // Gemini expects 'user' and 'model'
      const aiHistory = messages.map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }]
      }));

      const terrainContext = "MISSION DATA: Known trails include Skyline Divide (WA), Heliotrope Ridge (WA), Mist Trail (Yosemite, CA), Black Tusk (BC), Abiqua Falls (OR), Angels Landing (UT), and Highline Trail (Glacier, MT).";

      const systemInstruction = `You are "Traily", a high-tech Scout Robot. 
          Your mission is to guide "Rangers" (users) to the best hiking coords. 
          
          IDENTITY: You are advising ${userProfile?.username || 'a Trekker'}.
          
          CRITICAL PROTOCOLS:
          1. NEVER list trail titles as plain text.
          2. ALWAYS use 'searchTrails' to find relevant routes.
          3. Confirm when you trigger a basecamp sync.
          
          ${terrainContext}`;

      const response = await aiRef.current.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          ...aiHistory,
          { role: 'user', parts: [{ text: input }] }
        ],
        config: {
          systemInstruction,
          tools: [
            {
              functionDeclarations: [
                {
                  name: "searchTrails",
                  description: "Search for hiking trails by keywords (e.g. 'glacier'), location (e.g. 'washington'), or difficulty (e.g. 'hard').",
                  parameters: {
                    type: Type.OBJECT,
                    properties: {
                      query: {
                        type: Type.STRING,
                        description: "Keywords for matching (e.g. 'dog friendly', 'steep')"
                      }
                    },
                    required: ["query"]
                  }
                }
              ]
            }
          ]
        }
      });

      const assistantText = response.text || "Scanning complete. No verbal output generated.";
      addAssistantMessage(assistantText);

      // Handle function calls if any
      const functionCalls = response.functionCalls;
      if (functionCalls) {
        console.log(`[Traily] Protocol Breach: AI requested ${functionCalls.length} tool activations.`);
        for (const call of functionCalls) {
          if (call.name === 'searchTrails' && call.args?.query) {
            console.log(`[Traily] Automating scan for: "${call.args.query}"`);
            const count = await onSearch(call.args.query as string);
            console.log(`[Traily] Basecamp sync complete. Found ${count} routes.`);
          }
        }
      }

    } catch (err: any) {
      console.error('Gemini Error:', err);
      // Detailed error for debugging deployment
      const errMsg = err.message?.includes('API_KEY_INVALID') 
        ? "Satellite link failed: API Key invalid. Please check Vercel secrets."
        : "I'm having trouble connecting to basecamp. Try again in a moment.";
      addAssistantMessage(errMsg);
    } finally {
      setIsTyping(false);
    }
  };

  const addAssistantMessage = (content?: string) => {
    if (!content) return;
    const newMessage: Message = {
      id: Date.now().toString(),
      role: 'assistant',
      content,
      timestamp: Date.now()
    };
    setSessions(prev => prev.map(s => {
      if (s.id === currentSessionId) {
        const updated = { ...s, messages: [...s.messages, newMessage] };
        if (user) saveSession(updated);
        return updated;
      }
      return s;
    }));
  };

  return (
    <div className="flex-1 flex h-full bg-trail-bg/30 relative overflow-hidden">
      {/* Session Sidebar */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div 
            initial={{ x: -300 }}
            animate={{ x: 0 }}
            exit={{ x: -300 }}
            className="absolute lg:relative z-40 w-[240px] h-full bg-trail-forest border-r border-white/5 p-4 flex flex-col gap-4 shadow-2xl"
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-black uppercase tracking-widest text-white/30">Expeditions</span>
              <button 
                onClick={createNewSession}
                className="p-2 bg-trail-moss rounded-xl text-white hover:bg-white hover:text-trail-forest transition-all"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar pr-2">
              {sessions.map(s => (
                <button 
                  key={s.id}
                  onClick={() => setCurrentSessionId(s.id)}
                  className={`w-full text-left p-3 rounded-2xl transition-all border ${
                    currentSessionId === s.id 
                    ? 'bg-trail-moss/20 border-trail-moss text-white' 
                    : 'bg-white/5 border-transparent text-white/40 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <MessageSquare className="w-4 h-4 shrink-0" />
                    <span className="text-xs font-bold truncate">{s.title}</span>
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-[8px] opacity-30">
                    <History className="w-2.5 h-2.5" />
                    {new Date(s.messages[0]?.timestamp).toLocaleDateString()}
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1 flex flex-col min-w-0">
        <div className="p-5 border-b border-white/5 flex items-center justify-between glass-panel sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 lg:p-2.5 rounded-xl bg-white/5 border border-white/10 text-white/40 hover:text-trail-moss transition-all"
            >
              {isSidebarOpen ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
            </button>
            <div className="flex items-center gap-3">
              <TrailyAvatar size="sm" mood={isTyping ? 'thinking' : 'neutral'} />
              <div className="flex flex-col">
                <span className="font-serif font-bold text-xl italic tracking-wide leading-none">Traily</span>
                <span className="text-[8px] font-black uppercase tracking-widest text-trail-moss animate-pulse mt-1">Status: Active Scout</span>
              </div>
            </div>
          </div>
        </div>

        <div 
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar"
        >
          <AnimatePresence mode="popLayout">
            {messages.map((m) => (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[85%] flex gap-3 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  <div className={`w-8 h-8 shrink-0 ${m.role === 'user' ? '' : ''}`}>
                    {m.role === 'user' ? (
                      <div className="w-full h-full rounded-full bg-trail-forest text-white flex items-center justify-center overflow-hidden">
                        {userProfile?.avatar_url ? (
                          <img src={userProfile.avatar_url} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <UserIcon className="w-5 h-5" />
                        )}
                      </div>
                    ) : <TrailyAvatar 
                          size="sm" 
                          mood={
                            m.content.includes('[DANGER]') || m.content.includes('[ALERT]') ? 'alert' :
                            m.content.includes('!') ? 'happy' : 
                            'neutral'
                          } 
                        />}
                  </div>
                  <div className={`p-4 rounded-2xl shadow-sm ${
                    m.role === 'user' 
                    ? 'bg-trail-moss text-white rounded-tr-none' 
                    : 'bg-trail-accent text-trail-ink rounded-tl-none border border-white/5'
                  }`}>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{m.content}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {isTyping && (
            <div className="flex justify-start">
              <div className="bg-trail-accent p-3 rounded-2xl rounded-tl-none flex gap-1 items-center border border-white/5">
                <span className="w-1.5 h-1.5 bg-trail-moss rounded-full animate-bounce [animation-delay:-0.3s]" />
                <span className="w-1.5 h-1.5 bg-trail-moss rounded-full animate-bounce [animation-delay:-0.15s]" />
                <span className="w-1.5 h-1.5 bg-trail-moss rounded-full animate-bounce" />
                <span className="text-[10px] text-trail-moss/50 ml-2 font-black uppercase tracking-widest">Consulting Topo...</span>
              </div>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-white/5 glass-panel">
          <div className="relative group">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Deploy intelligence query..."
              className="w-full bg-black/20 border border-white/10 rounded-3xl py-4 pl-4 pr-14 focus:outline-none focus:ring-2 focus:ring-trail-moss/20 focus:border-trail-moss/50 transition-all resize-none min-h-[60px] max-h-[150px] custom-scrollbar text-sm"
              rows={1}
            />
            <button 
              onClick={handleSend}
              disabled={!input.trim() || isTyping || !currentSessionId}
              className="absolute right-3 bottom-3 p-2.5 rounded-2xl bg-trail-moss text-white hover:bg-trail-moss/80 disabled:opacity-30 transition-all shadow-xl active:scale-95"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
