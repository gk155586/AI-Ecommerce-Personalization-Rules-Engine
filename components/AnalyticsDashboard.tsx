'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, BarChart3, Users, Percent, Flame, CheckCircle2, XCircle, LogOut, Layers, RefreshCw } from 'lucide-react';
import { logoutAction, getAnalyticsDataAction } from '@/app/actions';

interface SessionData {
  id: string;
  user: string;
  events: string;
  rulePrediction: string | null;
  ruleExplanations: string | null;
  aiClassification: string | null;
  confidence: number | null;
  evidence: string | null;
  recommendedAction: string | null;
  reasoning: string | null;
  abVariant: string;
  isConversion: boolean;
  createdAt: string | Date;
}

interface ABStatData {
  id: string;
  classification: string;
  variant: string;
  recommendation: string;
  impressions: number;
  conversions: number;
}

export default function AnalyticsDashboard() {
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [abStats, setAbStats] = useState<ABStatData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  const loadData = async () => {
    try {
      const res = await getAnalyticsDataAction();
      if (res.success) {
        setSessions(res.sessions || []);
        setAbStats(res.abStats || []);
      } else {
        setError(res.error || 'Failed to load database logs.');
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected connection error occurred.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setMounted(true);
    loadData();
  }, []);

  // 1. Aggregate metrics
  const totalSessions = sessions.length;
  const totalConversions = sessions.filter(s => s.isConversion).length;
  const overallConversionRate = totalSessions > 0 ? (totalConversions / totalSessions) * 100 : 0;

  // Variant A vs Variant B Aggregates
  let impressionsA = 0;
  let conversionsA = 0;
  let impressionsB = 0;
  let conversionsB = 0;

  abStats.forEach(stat => {
    if (stat.variant === 'A') {
      impressionsA += stat.impressions;
      conversionsA += stat.conversions;
    } else if (stat.variant === 'B') {
      impressionsB += stat.impressions;
      conversionsB += stat.conversions;
    }
  });

  const conversionRateA = impressionsA > 0 ? (conversionsA / impressionsA) * 100 : 0;
  const conversionRateB = impressionsB > 0 ? (conversionsB / impressionsB) * 100 : 0;

  // Prepare Segment Data for Donut Chart
  const segmentCounts: Record<string, number> = {};
  sessions.forEach(s => {
    const classification = s.aiClassification || s.rulePrediction || 'Browser';
    segmentCounts[classification] = (segmentCounts[classification] || 0) + 1;
  });

  const totalSegments = Object.values(segmentCounts).reduce((a, b) => a + b, 0);
  const colors = [
    '#a855f7', // purple
    '#3b82f6', // blue
    '#ec4899', // pink
    '#14b8a6', // teal
    '#eab308', // yellow
    '#f97316', // orange
    '#ef4444', // red
    '#6366f1'  // indigo
  ];

  const segmentData = Object.entries(segmentCounts)
    .map(([name, count], index) => {
      const percentage = totalSegments > 0 ? (count / totalSegments) * 100 : 0;
      return {
        name,
        count,
        percentage,
        color: colors[index % colors.length]
      };
    })
    .sort((a, b) => b.count - a.count);

  // Donut SVG Calculations
  let currentOffset = 0;
  const radius = 60;
  const circumference = 2 * Math.PI * radius;

  // Group stats by Segment for the Bar Chart
  const segmentStatsMap: Record<string, { aImp: number; aConv: number; bImp: number; bConv: number }> = {};
  abStats.forEach(stat => {
    if (!segmentStatsMap[stat.classification]) {
      segmentStatsMap[stat.classification] = { aImp: 0, aConv: 0, bImp: 0, bConv: 0 };
    }
    if (stat.variant === 'A') {
      segmentStatsMap[stat.classification].aImp = stat.impressions;
      segmentStatsMap[stat.classification].aConv = stat.conversions;
    } else if (stat.variant === 'B') {
      segmentStatsMap[stat.classification].bImp = stat.impressions;
      segmentStatsMap[stat.classification].bConv = stat.conversions;
    }
  });

  const barChartSegments = Object.entries(segmentStatsMap).map(([name, val]) => {
    const rateA = val.aImp > 0 ? (val.aConv / val.aImp) * 100 : 0;
    const rateB = val.bImp > 0 ? (val.bConv / val.bImp) * 100 : 0;
    return {
      name,
      rateA,
      rateB,
      aImp: val.aImp,
      bImp: val.bImp
    };
  });

  // Render Skeleton Loading UI
  if (loading) {
    return (
      <div className="relative min-h-screen w-full bg-[#080611] text-slate-100 font-sans pb-16">
        <header className="sticky top-0 z-40 bg-[#080611]/80 backdrop-blur-md border-b border-purple-500/10 px-6 py-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#15112e] animate-pulse" />
              <div className="w-9 h-9 rounded-full bg-[#15112e] animate-pulse" />
              <div>
                <div className="w-32 h-5 bg-[#15112e] rounded animate-pulse mb-1" />
                <div className="w-40 h-3 bg-[#15112e] rounded animate-pulse" />
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-6 mt-8 space-y-8">
          {/* Card Skeletons */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-[#100c24]/50 border border-purple-500/10 rounded-xl p-5 h-28 animate-pulse flex flex-col justify-between">
                <div className="w-24 h-4 bg-[#15112e] rounded" />
                <div className="w-16 h-8 bg-[#15112e] rounded" />
                <div className="w-32 h-3 bg-[#15112e] rounded" />
              </div>
            ))}
          </div>

          {/* Chart Skeletons */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 bg-[#120f2b]/60 border border-purple-500/10 rounded-2xl p-6 h-80 animate-pulse space-y-6">
              <div className="w-48 h-5 bg-[#15112e] rounded" />
              {[1, 2, 3].map(i => (
                <div key={i} className="space-y-2">
                  <div className="flex justify-between"><div className="w-24 h-4 bg-[#15112e] rounded" /><div className="w-16 h-4 bg-[#15112e] rounded" /></div>
                  <div className="w-full h-2.5 bg-[#15112e] rounded" />
                  <div className="w-full h-2.5 bg-[#15112e] rounded" />
                </div>
              ))}
            </div>
            <div className="bg-[#120f2b]/60 border border-purple-500/10 rounded-2xl p-6 h-80 animate-pulse flex flex-col items-center justify-between">
              <div className="w-40 h-5 bg-[#15112e] rounded self-start" />
              <div className="w-32 h-32 rounded-full border-8 border-[#15112e]" />
              <div className="w-24 h-3 bg-[#15112e] rounded" />
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen w-full bg-[#080611] text-slate-100 font-sans pb-16 transition-opacity duration-300 ease-in opacity-100">
      {/* Decorative Radial Background Glowing Effects */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-purple-600/5 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute top-1/2 left-0 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-600/5 rounded-full blur-[140px] pointer-events-none" />

      {/* Header */}
      <header className="sticky top-0 z-40 bg-[#080611]/80 backdrop-blur-md border-b border-purple-500/10 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-slate-400 hover:text-slate-200 transition-colors p-1.5 hover:bg-[#15112e] rounded-lg">
              <ArrowLeft size={20} />
            </Link>
            <Image
              src="/logo.png"
              alt="Aura Logo"
              width={36}
              height={36}
              className="drop-shadow-[0_0_10px_rgba(168,85,247,0.3)]"
            />
            <div>
              <h1 className="text-lg font-bold bg-gradient-to-r from-purple-400 to-indigo-400 bg-clip-text text-transparent">
                Aura Analytics
              </h1>
              <p className="text-[10px] text-slate-400">Database & A/B Test Monitoring</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => {
                setLoading(true);
                loadData();
              }}
              className="p-2 text-slate-400 hover:text-purple-300 hover:bg-[#15112e] rounded-lg transition-colors cursor-pointer"
              title="Refresh Data"
            >
              <RefreshCw size={16} />
            </button>
            <Link
              href="/"
              className="text-xs bg-[#181335] hover:bg-[#231b4a] text-purple-300 font-medium px-4 py-2 rounded-lg border border-purple-500/20 transition-all"
            >
              Rules Engine Demo
            </Link>
            <form action={logoutAction}>
              <button
                type="submit"
                className="text-slate-400 hover:text-red-400 p-2 hover:bg-[#201524] rounded-lg transition-colors flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
              >
                <LogOut size={16} />
                <span>Logout</span>
              </button>
            </form>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-6 mt-8">
        {error && (
          <div className="bg-red-950/40 border border-red-500/20 rounded-xl p-4 text-red-400 text-xs mb-6 text-center">
            {error}
          </div>
        )}
        
        {/* Core Stats Overview */}
        <section className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-[#100c24]/50 border border-purple-500/10 rounded-xl p-5 shadow-lg shadow-purple-950/5">
            <div className="flex justify-between items-start text-slate-400 mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-[10px]">Total Impressions</span>
              <BarChart3 size={18} className="text-purple-400" />
            </div>
            <p className="text-3xl font-black text-slate-100">{totalSessions}</p>
            <p className="text-[10px] text-slate-500 mt-2">All sessions logged in dev.db</p>
          </div>

          <div className="bg-[#100c24]/50 border border-purple-500/10 rounded-xl p-5 shadow-lg shadow-purple-950/5">
            <div className="flex justify-between items-start text-slate-400 mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-[10px]">Total Conversions</span>
              <CheckCircle2 size={18} className="text-emerald-400" />
            </div>
            <p className="text-3xl font-black text-slate-100">{totalConversions}</p>
            <p className="text-[10px] text-slate-500 mt-2">Nudges clicked by shoppers</p>
          </div>

          <div className="bg-[#100c24]/50 border border-purple-500/10 rounded-xl p-5 shadow-lg shadow-purple-950/5">
            <div className="flex justify-between items-start text-slate-400 mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-[10px]">Avg Conversion Rate</span>
              <Percent size={18} className="text-indigo-400" />
            </div>
            <p className="text-3xl font-black text-slate-100">
              {overallConversionRate.toFixed(1)}%
            </p>
            <div className="w-full bg-[#1b153b] rounded-full h-1.5 mt-3">
              <div 
                className="bg-gradient-to-r from-purple-500 to-indigo-500 h-1.5 rounded-full" 
                style={{ width: `${Math.min(100, overallConversionRate)}%` }} 
              />
            </div>
          </div>

          <div className="bg-[#100c24]/50 border border-purple-500/10 rounded-xl p-5 shadow-lg shadow-purple-950/5">
            <div className="flex justify-between items-start text-slate-400 mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-[10px]">A/B Winning Variant</span>
              <Flame size={18} className="text-pink-400" />
            </div>
            <p className="text-3xl font-black text-slate-100">
              {conversionRateB > conversionRateA ? 'Variant B' : 'Variant A'}
            </p>
            <p className="text-[10px] text-slate-400 mt-2">
              A: {conversionRateA.toFixed(1)}% vs B: {conversionRateB.toFixed(1)}%
            </p>
          </div>
        </section>

        {/* Charts Section */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          {/* A/B Testing Variant Chart (Bar Chart) */}
          <div className="lg:col-span-2 bg-[#120f2b]/60 backdrop-blur-md border border-purple-500/10 rounded-2xl p-6 shadow-xl">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 mb-6 flex items-center gap-2">
              <BarChart3 size={16} className="text-purple-400" />
              Conversion Rate by Segment & A/B Variant
            </h3>

            {barChartSegments.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-slate-500 text-sm">
                No A/B testing stats seeded. Perform evaluations to generate logs.
              </div>
            ) : (
              <div className="space-y-6">
                {barChartSegments.map((segment, idx) => (
                  <div key={idx} className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-300 text-[11px]">{segment.name}</span>
                      <span className="text-slate-400 text-[10px]">
                        A: <span className="font-mono text-purple-400 font-bold">{segment.rateA.toFixed(1)}%</span> | 
                        B: <span className="font-mono text-indigo-400 font-bold">{segment.rateB.toFixed(1)}%</span>
                      </span>
                    </div>

                    {/* Bars */}
                    <div className="space-y-1.5">
                      {/* Variant A Bar */}
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-purple-400 font-bold w-6">A</span>
                        <div className="grow bg-[#171330] rounded-full h-2">
                          <div 
                            className="bg-purple-500 h-2 rounded-full transition-all duration-500" 
                            style={{ width: `${Math.min(100, segment.rateA)}%` }} 
                          />
                        </div>
                        <span className="text-[10px] text-slate-500 font-mono w-12 text-right">
                          {segment.rateA.toFixed(0)}%
                        </span>
                      </div>

                      {/* Variant B Bar */}
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-indigo-400 font-bold w-6">B</span>
                        <div className="grow bg-[#171330] rounded-full h-2">
                          <div 
                            className="bg-indigo-500 h-2 rounded-full transition-all duration-500" 
                            style={{ width: `${Math.min(100, segment.rateB)}%` }} 
                          />
                        </div>
                        <span className="text-[10px] text-slate-500 font-mono w-12 text-right">
                          {segment.rateB.toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Segment Distribution Chart (Donut Chart) */}
          <div className="bg-[#120f2b]/60 backdrop-blur-md border border-purple-500/10 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 mb-6 flex items-center gap-2">
                <Users size={16} className="text-indigo-400" />
                Shopper Segment Distribution
              </h3>

              {totalSessions === 0 ? (
                <div className="h-64 flex items-center justify-center text-slate-500 text-sm">
                  No shopper logs recorded yet.
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  {/* SVG Donut */}
                  <div className="relative w-44 h-44 mb-6">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 160 160">
                      <circle
                        cx="80"
                        cy="80"
                        r={radius}
                        fill="transparent"
                        stroke="#19153a"
                        strokeWidth="16"
                      />
                      {segmentData.map((seg, idx) => {
                        const strokeDashoffset = circumference - (seg.percentage / 100) * circumference;
                        const dasharray = `${circumference} ${circumference}`;
                        const offset = circumference - currentOffset;
                        currentOffset += (seg.percentage / 100) * circumference;

                        return (
                          <circle
                            key={idx}
                            cx="80"
                            cy="80"
                            r={radius}
                            fill="transparent"
                            stroke={seg.color}
                            strokeWidth="16"
                            strokeDasharray={dasharray}
                            strokeDashoffset={offset}
                            strokeLinecap="round"
                            className="transition-all duration-1000 ease-out"
                          />
                        );
                      })}
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-2xl font-black">{totalSessions}</span>
                      <span className="text-[10px] text-slate-500 uppercase tracking-widest">Sessions</span>
                    </div>
                  </div>

                  {/* Legend list */}
                  <div className="w-full grid grid-cols-2 gap-2.5 max-h-36 overflow-y-auto pr-1">
                    {segmentData.map((seg, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <div 
                          className="w-2.5 h-2.5 rounded-full shrink-0" 
                          style={{ backgroundColor: seg.color }} 
                        />
                        <div className="truncate text-left">
                          <p className="text-[11px] font-bold text-slate-300 truncate">{seg.name}</p>
                          <p className="text-[9px] text-slate-500 font-mono">
                            {seg.count} ({seg.percentage.toFixed(0)}%)
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Database Logging Audit Table */}
        <section className="bg-[#120f2b]/60 backdrop-blur-md border border-purple-500/10 rounded-2xl p-6 shadow-xl">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 mb-6 flex items-center gap-2">
            <Layers className="text-purple-400" size={16} />
            Historical Shopper Session Database Audit Log (SQLite dev.db)
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-purple-500/10 text-slate-400 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Shopper ID</th>
                  <th className="py-3 px-4">Rule Output</th>
                  <th className="py-3 px-4">AI Classification</th>
                  <th className="py-3 px-4 text-center">Variant</th>
                  <th className="py-3 px-4">Personalization Nudge Recommended</th>
                  <th className="py-3 px-4 text-center">Conversion</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-purple-500/5">
                {sessions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-500">
                      No customer sessions found in the database. Run the engine to see logs.
                    </td>
                  </tr>
                ) : (
                  sessions.map((session, idx) => {
                    const sessionDate = new Date(session.createdAt);
                    return (
                      <tr key={idx} className="hover:bg-[#1a1438]/20 transition-colors">
                        <td className="py-3.5 px-4 text-slate-400 font-mono">
                          {mounted ? sessionDate.toLocaleString() : ''}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-slate-300">
                          {session.user}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="bg-slate-900 border border-slate-700/50 text-slate-300 px-2 py-0.5 rounded font-medium">
                            {session.rulePrediction || 'None'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="bg-purple-950/40 border border-purple-500/20 text-purple-300 px-2 py-0.5 rounded font-bold">
                            {session.aiClassification || 'Evaluating...'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className={`font-black font-mono text-xs ${
                            session.abVariant === 'A' ? 'text-purple-400' : 'text-indigo-400'
                          }`}>
                            {session.abVariant}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-300 max-w-[240px] truncate" title={session.recommendedAction || ''}>
                          {session.recommendedAction || 'None'}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          {session.isConversion ? (
                            <span className="inline-flex items-center gap-1 bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 px-2 py-0.5 rounded-full font-semibold font-mono text-[10px]">
                              <CheckCircle2 size={10} />
                              <span>CONVERTED</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 bg-slate-900 border border-slate-700 text-slate-500 px-2 py-0.5 rounded-full font-medium font-mono text-[10px]">
                              <XCircle size={10} />
                              <span>NO ACTION</span>
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}
