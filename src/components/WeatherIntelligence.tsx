import { Sun, Cloud, CloudRain, Wind, Thermometer, Droplets } from 'lucide-react';
import { motion } from 'motion/react';

interface WeatherIntelligenceProps {
  location: string;
}

export default function WeatherIntelligence({ location }: WeatherIntelligenceProps) {
  // Mock weather data based on location hash
  const getMockWeather = (loc: string) => {
    const hash = loc.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const conditions = ['Clear Skies', 'Partly Cloudy', 'Light Rain', 'Overcast', 'Mist'];
    const temps = [64, 72, 58, 45, 82];
    
    return {
      condition: conditions[hash % conditions.length],
      temp: temps[hash % temps.length],
      wind: (hash % 15) + 5,
      humidity: (hash % 60) + 20,
      uv: (hash % 10) + 1
    };
  };

  const weather = getMockWeather(location);

  const getIcon = (condition: string) => {
    switch (condition) {
      case 'Clear Skies': return <Sun className="w-8 h-8 text-amber-400" />;
      case 'Partly Cloudy': return <Cloud className="w-8 h-8 text-slate-400" />;
      case 'Light Rain': return <CloudRain className="w-8 h-8 text-blue-400" />;
      default: return <Cloud className="w-8 h-8 text-slate-300" />;
    }
  };

  return (
    <div className="bg-white/5 border border-white/10 rounded-[32px] p-8 overflow-hidden relative group">
      <div className="absolute -top-12 -right-12 w-32 h-32 bg-trail-moss/10 blur-3xl group-hover:bg-trail-moss/20 transition-all rounded-full" />
      
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h4 className="text-[10px] uppercase tracking-[0.4em] font-black text-white/20 mb-1">Live Conditions</h4>
            <p className="text-xl font-bold text-white">{location}</p>
          </div>
          <motion.div 
            animate={{ rotate: weather.condition === 'Clear Skies' ? 360 : 0 }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          >
            {getIcon(weather.condition)}
          </motion.div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-black/20 p-4 rounded-2xl border border-white/5 flex items-center gap-3">
            <Thermometer className="w-5 h-5 text-rose-400" />
            <div>
              <span className="block text-[8px] uppercase tracking-widest text-white/30 font-black">Temp</span>
              <span className="text-sm font-bold text-white">{weather.temp}°F</span>
            </div>
          </div>
          <div className="bg-black/20 p-4 rounded-2xl border border-white/5 flex items-center gap-3">
            <Wind className="w-5 h-5 text-cyan-400" />
            <div>
              <span className="block text-[8px] uppercase tracking-widest text-white/30 font-black">Wind</span>
              <span className="text-sm font-bold text-white">{weather.wind} mph</span>
            </div>
          </div>
          <div className="bg-black/20 p-4 rounded-2xl border border-white/5 flex items-center gap-3">
            <Droplets className="w-5 h-5 text-blue-400" />
            <div>
              <span className="block text-[8px] uppercase tracking-widest text-white/30 font-black">Humidity</span>
              <span className="text-sm font-bold text-white">{weather.humidity}%</span>
            </div>
          </div>
          <div className="bg-black/20 p-4 rounded-2xl border border-white/5 flex items-center gap-3">
            <Sun className="w-5 h-5 text-amber-400" />
            <div>
              <span className="block text-[8px] uppercase tracking-widest text-white/30 font-black">UV Index</span>
              <span className="text-sm font-bold text-white">{weather.uv} / 10</span>
            </div>
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-white/5">
          <p className="text-[10px] text-white/40 italic flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
            Live satellite link established. Conditions are optimal for scouting.
          </p>
        </div>
      </div>
    </div>
  );
}
