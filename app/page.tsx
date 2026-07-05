import RulesEngineDemo from '@/components/RulesEngineDemo';
import { Sparkles, Brain, Cpu, ShieldCheck } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default function Home() {
  return (
    <main className="relative min-h-screen pb-20 selection:bg-indigo-500 selection:text-white">
      {/* Background glow graphics */}
      <div className="bg-glow-purple" />
      <div className="bg-glow-indigo" />

      {/* Main Container */}
      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 sm:pt-20">
        
        {/* Header / Hero Section */}
        <div className="text-center space-y-6 max-w-3xl mx-auto mb-16">
          <div className="flex justify-center">
            <img 
              src="/logo.png" 
              alt="AI Ecommerce Personalization Rules Engine Logo" 
              className="w-20 h-20 object-contain rounded-2xl shadow-xl shadow-indigo-500/10 border border-slate-800 p-2.5 bg-slate-950/80 backdrop-blur"
            />
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-900 border border-slate-800 rounded-full text-indigo-400 text-xs font-semibold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI-Powered Personalization Engine</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-100 tracking-tight leading-[1.1]">
            AI Ecommerce <br className="sm:hidden" />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-violet-400 to-teal-400">
              Personalization Rules Engine
            </span>
          </h1>

          <p className="text-base sm:text-lg text-slate-400 font-medium leading-relaxed">
            Analyze online shopping event streams in real time. Map session activity to customer intents using a hybrid of high-speed deterministic rules and advanced LLM reasoning.
          </p>

          {/* SaaS Feature Highlights */}
          <div className="flex flex-wrap items-center justify-center gap-6 pt-4 text-xs font-semibold text-slate-500">
            <div className="flex items-center gap-1.5">
              <Cpu className="w-4 h-4 text-indigo-500" />
              <span>DETERMINISTIC RULES</span>
            </div>
            <div className="w-1.5 h-1.5 rounded-full bg-slate-800 hidden sm:block" />
            <div className="flex items-center gap-1.5">
              <Brain className="w-4 h-4 text-violet-500" />
              <span>GPT-4O-MINI ORCHESTRATION</span>
            </div>
            <div className="w-1.5 h-1.5 rounded-full bg-slate-800 hidden sm:block" />
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-teal-500" />
              <span>HYBRID RESOLUTION</span>
            </div>
          </div>
        </div>

        {/* Dashboard Area */}
        <div className="bg-slate-950/60 border border-slate-900 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-md">
          <RulesEngineDemo />
        </div>

        {/* Footer */}
        <footer className="mt-20 text-center text-xs text-slate-600 border-t border-slate-900/60 pt-6">
          <p>© {new Date().getFullYear()} AI Ecommerce Rules Engine. Created for the Helium SWE Build Assignment.</p>
        </footer>

      </div>
    </main>
  );
}
