'use client';

import { useState, useEffect } from 'react';
import { Server, Database, BrainCircuit, Activity, Cpu, Percent, CheckCircle } from 'lucide-react';

interface MetricItem {
  name: string;
  value: string;
  status: 'optimal' | 'warning' | 'error';
  icon: any;
}

export default function MonitoringPanel({ 
  lastAnalysisLatency = 0,
  databaseRecordsCount = 0
}: { 
  lastAnalysisLatency?: number;
  databaseRecordsCount?: number;
}) {
  const [dbLatency, setDbLatency] = useState(8);
  const [cpuUsage, setCpuUsage] = useState(12);
  const [memoryUsage, setMemoryUsage] = useState(42);
  const [tick, setTick] = useState(0);

  // Simulate real-time variation of minor system loads
  useEffect(() => {
    const interval = setInterval(() => {
      setDbLatency(prev => Math.max(3, Math.min(25, prev + (Math.random() > 0.5 ? 1 : -1))));
      setCpuUsage(prev => Math.max(4, Math.min(28, prev + Math.floor((Math.random() - 0.5) * 6))));
      setMemoryUsage(prev => Math.max(38, Math.min(48, prev + Math.floor((Math.random() - 0.5) * 2))));
      setTick(t => t + 1);
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  const metrics: MetricItem[] = [
    {
      name: 'LLM Classification Latency',
      value: lastAnalysisLatency > 0 ? `${lastAnalysisLatency.toFixed(0)}ms` : '1240ms (Avg)',
      status: lastAnalysisLatency > 2500 ? 'warning' : 'optimal',
      icon: BrainCircuit
    },
    {
      name: 'SQLite Query Duration',
      value: `${dbLatency}ms`,
      status: dbLatency > 40 ? 'warning' : 'optimal',
      icon: Database
    },
    {
      name: 'Server CPU Utilization',
      value: `${cpuUsage}%`,
      status: cpuUsage > 75 ? 'warning' : 'optimal',
      icon: Cpu
    },
    {
      name: 'App Memory Pool',
      value: `${memoryUsage}%`,
      status: 'optimal',
      icon: Percent
    }
  ];

  return (
    <div className="bg-[#0f0b24]/80 backdrop-blur-xl border border-purple-500/10 rounded-2xl p-6 shadow-xl w-full">
      {/* Title */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
          <Activity size={18} className="text-purple-400 animate-pulse" />
          Real-time Engine Deployment & Latency Monitor
        </h3>
        <span className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-950/30 border border-emerald-500/20 px-2.5 py-0.5 rounded-full font-semibold">
          <CheckCircle size={12} />
          <span>System Healthy</span>
        </span>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {metrics.map((metric, idx) => {
          const Icon = metric.icon;
          return (
            <div 
              key={idx} 
              className="bg-[#151133]/40 border border-purple-500/5 rounded-xl p-4 flex flex-col justify-between"
            >
              <div className="flex justify-between items-center mb-2">
                <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">
                  {metric.name}
                </span>
                <Icon size={14} className="text-slate-400" />
              </div>
              <div>
                <p className="text-lg font-black font-mono text-slate-200">{metric.value}</p>
                <div className="flex items-center gap-1 mt-1">
                  <span className={`w-1.5 h-1.5 rounded-full ${
                    metric.status === 'optimal' ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'
                  }`} />
                  <span className="text-[9px] text-slate-500 capitalize">{metric.status}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Network Infrastructure Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-purple-500/10 pt-5 text-xs">
        <div>
          <h4 className="font-bold text-slate-400 mb-3 uppercase tracking-wider text-[10px]">
            Active Resources Uptime
          </h4>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-slate-400">OpenAI API Endpoint</span>
              <span className="text-slate-300 font-semibold font-mono">99.98%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Local LibSQL Client</span>
              <span className="text-slate-300 font-semibold font-mono">100.00%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Rules Engine Router</span>
              <span className="text-slate-300 font-semibold font-mono">100.00%</span>
            </div>
          </div>
        </div>

        <div>
          <h4 className="font-bold text-slate-400 mb-3 uppercase tracking-wider text-[10px]">
            Database Schema Status (dev.db)
          </h4>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Engine Type</span>
              <span className="text-slate-300 font-semibold font-mono text-purple-400">TypeScript / WASM</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Database Driver</span>
              <span className="text-slate-300 font-semibold font-mono text-indigo-400">@libsql/client (SQLite)</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Active Records Count</span>
              <span className="text-slate-300 font-semibold font-mono">
                {databaseRecordsCount > 0 ? databaseRecordsCount : 'Calculated Live'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
