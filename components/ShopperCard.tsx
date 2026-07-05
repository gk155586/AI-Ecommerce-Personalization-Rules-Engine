'use client';

import { useState } from 'react';
import { ShopperAnalysis, ShopperState } from '@/types';
import { trackConversionAction } from '@/app/actions';
import { Award, Zap, HelpCircle, ShieldCheck, ShoppingCart, Percent, Compass, Eye, RefreshCw, Layers, CheckCircle2 } from 'lucide-react';

interface ShopperCardProps {
  analysis: ShopperAnalysis;
}

const STATE_CONFIG: Record<
  ShopperState,
  {
    gradient: string;
    bg: string;
    text: string;
    icon: any;
    accent: string;
  }
> = {
  'Loyal Customer': {
    gradient: 'from-purple-500 to-indigo-600',
    bg: 'bg-purple-950/40 border-purple-900/60',
    text: 'text-purple-300',
    icon: Award,
    accent: 'bg-purple-500'
  },
  'Impulse Buyer': {
    gradient: 'from-pink-500 to-rose-600',
    bg: 'bg-rose-950/40 border-rose-900/60',
    text: 'text-rose-300',
    icon: Zap,
    accent: 'bg-rose-500'
  },
  'Cart Abandoner': {
    gradient: 'from-orange-500 to-amber-600',
    bg: 'bg-orange-950/40 border-orange-900/60',
    text: 'text-orange-300',
    icon: ShoppingCart,
    accent: 'bg-orange-500'
  },
  'Discount Seeker': {
    gradient: 'from-yellow-500 to-amber-500',
    bg: 'bg-amber-950/40 border-amber-900/60',
    text: 'text-amber-300',
    icon: Percent,
    accent: 'bg-amber-500'
  },
  'Comparer': {
    gradient: 'from-cyan-500 to-blue-600',
    bg: 'bg-cyan-950/40 border-cyan-900/60',
    text: 'text-cyan-300',
    icon: Compass,
    accent: 'bg-cyan-500'
  },
  'Browser': {
    gradient: 'from-blue-500 to-sky-600',
    bg: 'bg-blue-950/40 border-blue-900/60',
    text: 'text-blue-300',
    icon: Eye,
    accent: 'bg-blue-500'
  },
  'Returning Customer': {
    gradient: 'from-emerald-500 to-teal-600',
    bg: 'bg-emerald-950/40 border-emerald-900/60',
    text: 'text-emerald-300',
    icon: RefreshCw,
    accent: 'bg-emerald-500'
  },
  'Window Shopper': {
    gradient: 'from-slate-500 to-slate-700',
    bg: 'bg-slate-900/60 border-slate-800',
    text: 'text-slate-300',
    icon: HelpCircle,
    accent: 'bg-slate-500'
  }
};

export default function ShopperCard({ analysis }: ShopperCardProps) {
  const { user, rules, ai, error, abVariant, sessionId, ragHistoryUsed } = analysis;
  
  const [converted, setConverted] = useState(false);
  const [converting, setConverting] = useState(false);
  const [conversionError, setConversionError] = useState<string | null>(null);

  if (error) {
    return (
      <div className="bg-rose-950/20 border border-rose-950 rounded-2xl p-6 text-center space-y-3">
        <h4 className="text-sm font-semibold text-rose-400">Analysis Failed for {user}</h4>
        <p className="text-xs text-rose-300/80 leading-relaxed max-w-md mx-auto">{error}</p>
      </div>
    );
  }

  if (!ai) return null;

  const classification = ai.classification as ShopperState;
  const config = STATE_CONFIG[classification] || STATE_CONFIG['Window Shopper'];
  const StateIcon = config.icon;

  const ruleClassification = rules.preliminaryClassification as ShopperState | null;
  const rulesAgree = ruleClassification === classification;

  const handleConvertClick = async () => {
    if (!sessionId) return;
    setConverting(true);
    setConversionError(null);
    try {
      const res = await trackConversionAction(sessionId);
      if (res.success) {
        setConverted(true);
      } else {
        setConversionError(res.error || 'Failed to record conversion.');
      }
    } catch (err: any) {
      setConversionError(err.message || 'Error tracking conversion.');
    } finally {
      setConverting(false);
    }
  };

  return (
    <div className={`border rounded-2xl p-6 shadow-xl space-y-6 transition duration-300 hover:shadow-2xl ${config.bg}`}>
      
      {/* Header section with User ID and classification Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800/40 pb-4">
        <div>
          <span className="text-[10px] text-slate-500 font-mono tracking-wider block">SHOPPER ID</span>
          <h3 className="text-base font-bold text-slate-200">{user}</h3>
        </div>

        <div className="flex items-center gap-2">
          {abVariant && (
            <span className="text-[9px] bg-slate-950/80 border border-slate-800 text-slate-400 px-2 py-1 rounded font-black font-mono">
              AB TEST: VARIANT {abVariant}
            </span>
          )}
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r ${config.gradient} shadow-lg shadow-indigo-500/5`}>
            <StateIcon className="w-4 h-4 text-white" />
            <span className="text-xs font-bold text-white uppercase tracking-wider">
              {classification}
            </span>
          </div>
        </div>
      </div>

      {/* RAG Customer History visualizer */}
      {ragHistoryUsed && ragHistoryUsed.length > 0 && (
        <div className="bg-purple-950/15 border border-purple-500/10 rounded-xl p-3.5 space-y-2 text-xs">
          <div className="flex items-center gap-1.5 text-purple-400 font-semibold uppercase tracking-wider text-[10px]">
            <Layers className="w-3.5 h-3.5" />
            <span>RAG Active - Historical Customer Context Loaded</span>
          </div>
          <ul className="space-y-1.5 text-[11px] text-slate-400">
            {ragHistoryUsed.map((historyLog, index) => (
              <li key={index} className="list-disc pl-1 ml-3.5">
                {historyLog}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Confidence Score Bar */}
      <div className="space-y-2">
        <div className="flex justify-between items-center text-xs">
          <span className="text-slate-400 font-medium">Engine Classification Confidence</span>
          <span className={`font-bold ${config.text}`}>{ai.confidence}%</span>
        </div>
        <div className="h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800/50">
          <div
            className={`h-full rounded-full bg-gradient-to-r ${config.gradient} transition-all duration-1000`}
            style={{ width: `${ai.confidence}%` }}
          />
        </div>
      </div>

      {/* Rules Engine and AI Hybrid Comparison */}
      <div className="bg-slate-950/65 border border-slate-800/80 rounded-xl p-3.5 space-y-2 text-xs">
        <div className="flex items-center gap-1.5 text-indigo-400 font-semibold mb-1">
          <Layers className="w-3.5 h-3.5" />
          <span>Hybrid Engine Resolution</span>
        </div>
        <div className="grid grid-cols-2 gap-2 text-slate-400">
          <div>
            <span className="block text-[10px] text-slate-600">RULE ENGINE PREDICTION:</span>
            <span className="font-semibold text-slate-300">
              {ruleClassification ? ruleClassification : 'None (No Match)'}
            </span>
          </div>
          <div>
            <span className="block text-[10px] text-slate-600">DECISION MATCH:</span>
            {rulesAgree ? (
              <span className="inline-flex items-center gap-1 font-semibold text-emerald-400">
                <ShieldCheck className="w-3.5 h-3.5" />
                AI Confirmed Rule
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 font-semibold text-amber-400">
                <Layers className="w-3.5 h-3.5" />
                AI Refined Rule
              </span>
            )}
          </div>
        </div>
        {rules.matchedRules.length > 0 && (
          <div className="pt-1.5 border-t border-slate-900/60 mt-1">
            <span className="text-[10px] text-slate-600 block">TRIGGERED SYSTEM RULES:</span>
            <div className="flex flex-wrap gap-1 mt-1">
              {rules.matchedRules.map((ruleId) => (
                <span
                  key={ruleId}
                  className="text-[9px] font-mono px-1.5 py-0.5 bg-slate-900 border border-slate-850 rounded text-slate-500"
                >
                  {ruleId}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Evidence Bullet Points */}
      <div className="space-y-2.5">
        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Gathered Evidence</h4>
        <ul className="space-y-1.5">
          {ai.evidence.map((point, index) => (
            <li key={index} className="flex items-start gap-2.5 text-xs text-slate-300">
              <span className={`w-1.5 h-1.5 rounded-full ${config.accent} mt-1.5 shrink-0`} />
              <span>{point}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Recommended Site Action Box (With A/B Testing click conversion) */}
      <div className="bg-slate-950/40 border border-indigo-950/60 rounded-xl p-4 space-y-3">
        <div className="flex justify-between items-center text-xs font-semibold text-indigo-400">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 fill-current text-indigo-500" />
            <span>RECOMMENDED INTERVENTION / NUDGE</span>
          </div>
        </div>
        <p className="text-sm font-bold text-slate-100 pl-6 leading-snug">
          {ai.recommended_action}
        </p>

        {sessionId && (
          <div className="pl-6 pt-1">
            {converted ? (
              <span className="inline-flex items-center gap-1.5 text-xs text-emerald-400 font-semibold bg-emerald-950/30 border border-emerald-500/20 px-3 py-1.5 rounded-lg">
                <CheckCircle2 size={14} className="shrink-0" />
                <span>Conversion Recorded in SQLite Database (ABTestStats updated!)</span>
              </span>
            ) : (
              <div className="space-y-2">
                <button
                  onClick={handleConvertClick}
                  disabled={converting}
                  className="inline-flex items-center gap-1.5 text-xs bg-indigo-600/90 hover:bg-indigo-600 text-white font-semibold px-3.5 py-2 rounded-lg shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50"
                >
                  {converting ? 'Logging...' : 'Simulate Shopper Claiming Nudge (A/B Test Conversion)'}
                </button>
                {conversionError && (
                  <p className="text-[10px] text-rose-400 mt-1">{conversionError}</p>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* AI Reasoning */}
      <div className="space-y-2">
        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Personalization Reasoning</h4>
        <p className="text-xs text-slate-400 leading-relaxed pl-1">
          {ai.reasoning}
        </p>
      </div>
    </div>
  );
}
