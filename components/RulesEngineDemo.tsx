'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { runDeterministicRules } from '@/lib/rules';
import { ShopperAnalysis, ShopperSession } from '@/types';
import { analyzeShopperAction, logoutAction, getDatabaseMetricsAction } from '@/app/actions';
import SampleDataLoader from './SampleDataLoader';
import RawJsonEditor from './RawJsonEditor';
import SessionSimulator from './SessionSimulator';
import ShopperCard from './ShopperCard';
import MonitoringPanel from './MonitoringPanel';
import { Database, Code, Sliders, Play, AlertCircle, RefreshCw, Sparkles, AlertTriangle, LogOut, BarChart3, Terminal } from 'lucide-react';

export default function RulesEngineDemo() {
  const [activeTab, setActiveTab] = useState<'samples' | 'json' | 'simulator'>('samples');
  const [analyses, setAnalyses] = useState<ShopperAnalysis[]>([]);
  const [isBulkLoading, setIsBulkLoading] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [useMockMode, setUseMockMode] = useState(false);
  
  // Real-time latency and DB metrics states
  const [lastLatency, setLastLatency] = useState(0);
  const [dbCount, setDbCount] = useState(0);

  // AI Streaming States
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [streamingUser, setStreamingUser] = useState<string | null>(null);

  // Load database metrics on mount
  useEffect(() => {
    updateDbMetrics();
  }, []);

  const updateDbMetrics = async () => {
    try {
      const res = await getDatabaseMetricsAction();
      if (res.success) {
        setDbCount(res.count);
      }
    } catch (e) {
      console.warn('Failed to load DB metrics:', e);
    }
  };

  // Load new shopper sessions from Sample Loader or JSON Editor
  const handleLoadShoppers = (sessions: ShopperSession[]) => {
    setGlobalError(null);
    const newAnalyses = sessions.map(session => ({
      user: session.user,
      events: session.events,
      rules: runDeterministicRules(session.events),
      ai: null,
      error: null,
      loading: false
    }));
    setAnalyses(newAnalyses);
  };

  // Run analysis for all currently loaded shoppers in parallel (Server Action)
  const handleAnalyzeAll = async () => {
    if (analyses.length === 0) return;
    setIsBulkLoading(true);
    setGlobalError(null);

    // Set all cards to loading state
    setAnalyses(prev => prev.map(a => ({ ...a, loading: true, error: null })));

    const startTime = performance.now();
    try {
      await Promise.all(
        analyses.map(async (analysis, index) => {
          const response = await analyzeShopperAction({
            user: analysis.user,
            events: analysis.events
          }, useMockMode);

          setAnalyses(prev => {
            const updated = [...prev];
            if (response.success && response.data) {
              updated[index] = {
                ...updated[index],
                rules: response.data.rules,
                ai: response.data.ai,
                abVariant: response.data.abVariant,
                sessionId: response.data.sessionId,
                ragHistoryUsed: response.data.ragHistoryUsed,
                loading: false,
                error: null
              };
            } else {
              updated[index] = {
                ...updated[index],
                loading: false,
                error: response.error || 'Failed to complete AI analysis.'
              };
            }
            return updated;
          });
        })
      );
      setLastLatency(performance.now() - startTime);
      updateDbMetrics();
    } catch (err: any) {
      setGlobalError(err.message || 'An unexpected error occurred during bulk analysis.');
    } finally {
      setIsBulkLoading(false);
    }
  };

  // Handle a direct run from the live session simulator (supporting Real-time AI Streaming)
  const handleAnalyzeSimulatorSession = async (session: ShopperSession) => {
    setGlobalError(null);
    setIsStreaming(false);
    setStreamingText('');
    setStreamingUser(null);
    
    const initialAnalysis: ShopperAnalysis = {
      user: session.user,
      events: session.events,
      rules: runDeterministicRules(session.events),
      ai: null,
      loading: true,
      error: null
    };

    // Prepend/update simulator card in list
    setAnalyses(prev => {
      const filtered = prev.filter(a => a.user !== session.user);
      return [initialAnalysis, ...filtered];
    });

    const startTime = performance.now();

    if (useMockMode) {
      // Mock Mode - Fast Server Action response
      try {
        const response = await analyzeShopperAction(session, true);
        setAnalyses(prev => {
          const next = [...prev];
          const idx = next.findIndex(a => a.user === session.user);
          if (idx !== -1) {
            if (response.success && response.data) {
              next[idx] = {
                ...next[idx],
                rules: response.data.rules,
                ai: response.data.ai,
                abVariant: response.data.abVariant,
                sessionId: response.data.sessionId,
                ragHistoryUsed: response.data.ragHistoryUsed,
                loading: false,
                error: null
              };
            } else {
              next[idx] = {
                ...next[idx],
                loading: false,
                error: response.error || 'Failed to analyze simulator session.'
              };
            }
          }
          return next;
        });
        setLastLatency(performance.now() - startTime);
        updateDbMetrics();
      } catch (err: any) {
        setGlobalError(err.message || 'Simulator mock failure');
      }
    } else {
      // Real-time AI Streaming Mode
      setStreamingUser(session.user);
      setIsStreaming(true);

      try {
        const response = await fetch('/api/analyze/stream', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user: session.user, events: session.events })
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.error || 'Failed to initialize AI stream');
        }

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let fullStreamText = '';

        if (!reader) throw new Error('Readable stream not supported.');

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value);
          fullStreamText += chunk;
          
          // Render only the thoughts/live text and strip JSON blocks from raw terminal display if desired
          // For aesthetic purposes, we show the raw streaming text in the console
          setStreamingText(fullStreamText);
        }

        setIsStreaming(false);
        setStreamingUser(null);
        setLastLatency(performance.now() - startTime);

        // Parse structured JSON block from streamed payload
        const jsonMatch = fullStreamText.match(/<JSON_RESPONSE>([\s\S]*?)<\/JSON_RESPONSE>/);
        const metaMatch = fullStreamText.match(/<METADATA_RESPONSE>([\s\S]*?)<\/METADATA_RESPONSE>/);

        if (jsonMatch && jsonMatch[1]) {
          const ai = JSON.parse(jsonMatch[1].trim());
          let sessionId: string | undefined;
          let abVariant: string | undefined;
          let ragHistoryUsed: string[] | undefined;

          if (metaMatch && metaMatch[1]) {
            const meta = JSON.parse(metaMatch[1].trim());
            sessionId = meta.sessionId;
            abVariant = meta.abVariant;
            ragHistoryUsed = meta.ragHistoryUsed;
          }

          setAnalyses(prev => {
            const next = [...prev];
            const idx = next.findIndex(a => a.user === session.user);
            if (idx !== -1) {
              next[idx] = {
                ...next[idx],
                ai,
                sessionId,
                abVariant,
                ragHistoryUsed,
                loading: false,
                error: null
              };
            }
            return next;
          });
          updateDbMetrics();
        } else {
          throw new Error('LLM output did not contain valid JSON tags.');
        }

      } catch (err: any) {
        setIsStreaming(false);
        setStreamingUser(null);
        setAnalyses(prev => {
          const next = [...prev];
          const idx = next.findIndex(a => a.user === session.user);
          if (idx !== -1) {
            next[idx] = {
              ...next[idx],
              loading: false,
              error: err.message || 'Stream processing failed.'
            };
          }
          return next;
        });
      }
    }
  };

  const hasUnanalyzedShoppers = analyses.some(a => !a.ai && !a.error);
  const isLoadingAny = analyses.some(a => a.loading);

  return (
    <div className="space-y-8">
      {/* Rate limit helper banner */}
      {!useMockMode && (
        <div className="flex items-start gap-2.5 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-400">
          <AlertTriangle className="w-4 h-4 shrink-0 text-amber-500 mt-0.5" />
          <p>
            <strong>Rate Limit Notice:</strong> If your OpenAI API key is new, free-tier, or unfunded, running bulk requests might trigger a 429 error. Enable <strong>Mock AI Mode</strong> on the right to simulate classification reports instantly!
          </p>
        </div>
      )}

      {/* Input Selection Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-800 pb-3 gap-4">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveTab('samples')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl transition duration-150 ${
              activeTab === 'samples'
                ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent'
            }`}
          >
            <Database className="w-4 h-4" />
            1. Preloaded Profiles
          </button>
          <button
            onClick={() => setActiveTab('json')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl transition duration-150 ${
              activeTab === 'json'
                ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent'
            }`}
          >
            <Code className="w-4 h-4" />
            2. Paste Custom JSON
          </button>
          <button
            onClick={() => setActiveTab('simulator')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl transition duration-150 ${
              activeTab === 'simulator'
                ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent'
            }`}
          >
            <Sliders className="w-4 h-4" />
            3. Interactive Simulator
          </button>
        </div>

        {/* Global toggles and actions */}
        <div className="flex items-center gap-3">
          {/* Analytics Dashboard link */}
          <Link
            href="/analytics"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#15122e] hover:bg-[#201c40] text-purple-300 border border-purple-500/25 rounded-xl text-xs font-semibold transition"
          >
            <BarChart3 size={14} />
            <span>A/B Analytics & DB Logs</span>
          </Link>

          {/* Mock Mode Toggle */}
          <div className="flex items-center gap-2.5 px-3 py-1.5 bg-slate-950 border border-slate-850 rounded-xl">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Mock AI Mode</span>
            <button
              type="button"
              onClick={() => setUseMockMode(!useMockMode)}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                useMockMode ? 'bg-emerald-500' : 'bg-slate-800'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-slate-950 shadow transition duration-200 ease-in-out ${
                  useMockMode ? 'translate-x-4 bg-emerald-100' : 'translate-x-0 bg-slate-400'
                }`}
              />
            </button>
          </div>

          {/* Bulk run button */}
          {activeTab !== 'simulator' && analyses.length > 0 && (
            <button
              onClick={handleAnalyzeAll}
              disabled={isBulkLoading || isLoadingAny || !hasUnanalyzedShoppers}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-400 hover:to-indigo-500 disabled:from-slate-900 disabled:to-slate-900 disabled:border-slate-800 disabled:text-slate-600 border border-transparent text-xs font-bold rounded-xl transition shadow-lg shadow-indigo-600/10"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Run {useMockMode ? 'Mock' : 'AI'} Rules Engine ({analyses.filter(a => !a.ai).length} pending)
            </button>
          )}

          {/* Logout button */}
          <form action={logoutAction}>
            <button
              type="submit"
              className="text-slate-500 hover:text-red-400 p-2 hover:bg-[#201524] rounded-xl transition-colors cursor-pointer"
              title="Logout from admin panel"
            >
              <LogOut size={16} />
            </button>
          </form>
        </div>
      </div>

      {/* Render Selected Input Tab */}
      <div className="transition-all duration-300">
        {activeTab === 'samples' && (
          <SampleDataLoader onLoadShoppers={handleLoadShoppers} />
        )}
        {activeTab === 'json' && (
          <RawJsonEditor onLoadShoppers={handleLoadShoppers} />
        )}
        {activeTab === 'simulator' && (
          <SessionSimulator onAnalyze={handleAnalyzeSimulatorSession} isLoading={isLoadingAny || isStreaming} />
        )}
      </div>

      {/* Real-time Streaming Reasoning Console */}
      {isStreaming && streamingUser && (
        <div className="bg-[#0b091c]/90 border border-indigo-500/20 rounded-2xl p-5 shadow-2xl space-y-3 relative overflow-hidden animate-pulse-slow">
          <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-purple-500 via-indigo-500 to-pink-500 animate-shimmer" />
          <div className="flex justify-between items-center border-b border-indigo-950 pb-2 text-[10px] text-indigo-400 font-bold font-mono">
            <span className="flex items-center gap-1.5">
              <Terminal size={14} />
              Live AI Reasoning Stream (Shopper: {streamingUser})
            </span>
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-ping" />
              <span>Receiving Tokens...</span>
            </span>
          </div>
          <pre className="whitespace-pre-wrap font-mono text-[11px] leading-relaxed max-h-48 overflow-y-auto text-slate-300 text-left bg-slate-950/40 p-4 border border-slate-900 rounded-lg">
            {streamingText || 'Handshaking and authenticating stream...'}
          </pre>
        </div>
      )}

      {globalError && (
        <div className="flex items-start gap-3 p-4 bg-rose-950/40 border border-rose-900/60 rounded-2xl text-xs text-rose-300">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          <div>
            <h4 className="font-bold mb-0.5">Execution Failed</h4>
            <p>{globalError}</p>
          </div>
        </div>
      )}

      {/* Loaded Sessions and Classification Results */}
      {analyses.length > 0 && (
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-slate-850 pb-2">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
              Shopper Analyses & Personalization Profiles
              <span className="text-xs font-mono font-normal px-2 py-0.5 bg-slate-900 text-indigo-400 border border-slate-800 rounded-full">
                {analyses.length} Total
              </span>
            </h3>
            
            <button
              onClick={() => setAnalyses([])}
              className="text-xs text-slate-500 hover:text-rose-400 transition cursor-pointer"
            >
              Clear Workspace
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {analyses.map((analysis, idx) => (
              <div key={`${analysis.user}-${idx}`} className="relative">
                {analysis.loading ? (
                  /* Loading Skeleton */
                  <div className="border border-slate-800 bg-slate-900/40 rounded-2xl p-6 shadow-xl space-y-6 animate-pulse min-h-[30rem] flex flex-col justify-between">
                    <div className="space-y-4">
                      <div className="flex justify-between items-center pb-4 border-b border-slate-800/40">
                        <div className="space-y-2">
                          <div className="h-2.5 w-16 bg-slate-850 rounded" />
                          <div className="h-4 w-32 bg-slate-800 rounded" />
                        </div>
                        <div className="h-6 w-24 bg-slate-800 rounded-full" />
                      </div>
                      <div className="space-y-2">
                        <div className="h-3 w-40 bg-slate-850 rounded" />
                        <div className="h-3 w-full bg-slate-800 rounded" />
                      </div>
                      <div className="bg-slate-950/40 rounded-xl p-4 space-y-2">
                        <div className="h-3 w-32 bg-slate-850 rounded" />
                        <div className="h-4 w-full bg-slate-800 rounded" />
                      </div>
                      <div className="space-y-2">
                        <div className="h-3 w-20 bg-slate-850 rounded" />
                        <div className="h-3 w-5/6 bg-slate-800 rounded" />
                        <div className="h-3 w-4/6 bg-slate-800 rounded" />
                      </div>
                    </div>
                    <div className="flex items-center gap-2 justify-center py-2 text-indigo-400/80 text-xs font-semibold">
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Consulting AI Rules Engine...</span>
                    </div>
                  </div>
                ) : (
                  <ShopperCard analysis={analysis} />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Deployment Monitoring Panel */}
      <section className="mt-12">
        <MonitoringPanel 
          lastAnalysisLatency={lastLatency}
          databaseRecordsCount={dbCount}
        />
      </section>
    </div>
  );
}
