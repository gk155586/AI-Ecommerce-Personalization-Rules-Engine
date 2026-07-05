'use client';

import { useState } from 'react';
import { ShopperSession } from '@/types';
import { Plus, RotateCcw, Trash2, User, Play, Sparkles } from 'lucide-react';

interface SessionSimulatorProps {
  onAnalyze: (session: ShopperSession) => void;
  isLoading: boolean;
}

const SAMPLE_PRODUCTS = ['Running Shoes', 'Leather Jacket', 'Wireless Earbuds', 'Mechanical Keyboard', 'Coffee Maker'];

export default function SessionSimulator({ onAnalyze, isLoading }: SessionSimulatorProps) {
  const [userId, setUserId] = useState('SIM-404');
  const [events, setEvents] = useState<string[]>([
    'Visited Homepage'
  ]);
  const [customEvent, setCustomEvent] = useState('');
  const [productIndex, setProductIndex] = useState(0);

  const addEvent = (eventText: string) => {
    setEvents(prev => [...prev, eventText]);
  };

  const handleAddProductView = () => {
    const product = SAMPLE_PRODUCTS[productIndex % SAMPLE_PRODUCTS.length];
    addEvent(`Viewed ${product}`);
    setProductIndex(prev => prev + 1);
  };

  const handleAddToCart = () => {
    // Try to find the last viewed product to make it realistic
    let product = 'Product';
    for (let i = events.length - 1; i >= 0; i--) {
      if (events[i].startsWith('Viewed ')) {
        product = events[i].substring(7);
        break;
      }
    }
    addEvent(`Added ${product} to Cart`);
  };

  const handleRemoveFromCart = () => {
    let product = 'Product';
    for (let i = events.length - 1; i >= 0; i--) {
      if (events[i].startsWith('Added ') && events[i].endsWith(' to Cart')) {
        product = events[i].substring(6, events[i].length - 8);
        break;
      }
    }
    addEvent(`Removed ${product} from Cart`);
  };

  const handleAddCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (customEvent.trim()) {
      addEvent(customEvent.trim());
      setCustomEvent('');
    }
  };

  const removeEventAtIndex = (index: number) => {
    setEvents(prev => prev.filter((_, i) => i !== index));
  };

  const handleReset = () => {
    setEvents(['Visited Homepage']);
    setProductIndex(0);
  };

  const handleRunAnalysis = () => {
    onAnalyze({
      user: userId.trim() || 'Simulator Shopper',
      events: events
    });
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-400" />
            Live Session Simulator
          </h3>
          <p className="text-sm text-slate-400">
            Build a shopper session event-by-event and see recommendations update instantly.
          </p>
        </div>
        
        <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 border border-slate-800 rounded-lg w-full sm:w-auto">
          <User className="w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            className="bg-transparent text-slate-200 text-xs font-semibold focus:outline-none w-full sm:w-28"
            placeholder="User ID"
          />
        </div>
      </div>

      {/* Control Buttons */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        <button
          onClick={handleAddProductView}
          className="flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-950 border border-slate-800 hover:border-indigo-500/50 hover:bg-slate-900 text-slate-300 hover:text-indigo-300 text-xs font-medium rounded-lg transition"
        >
          <Plus className="w-3.5 h-3.5" />
          Viewed Product
        </button>
        <button
          onClick={handleAddToCart}
          className="flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-950 border border-slate-800 hover:border-emerald-500/50 hover:bg-slate-900 text-slate-300 hover:text-emerald-300 text-xs font-medium rounded-lg transition"
        >
          <Plus className="w-3.5 h-3.5" />
          Added to Cart
        </button>
        <button
          onClick={handleRemoveFromCart}
          className="flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-950 border border-slate-800 hover:border-rose-500/50 hover:bg-slate-900 text-slate-300 hover:text-rose-300 text-xs font-medium rounded-lg transition"
        >
          <Plus className="w-3.5 h-3.5" />
          Removed From Cart
        </button>
        <button
          onClick={() => addEvent('Coupon Applied')}
          className="flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-950 border border-slate-800 hover:border-amber-500/50 hover:bg-slate-900 text-slate-300 hover:text-amber-300 text-xs font-medium rounded-lg transition"
        >
          <Plus className="w-3.5 h-3.5" />
          Coupon Applied
        </button>
        <button
          onClick={() => addEvent('Checkout Started')}
          className="flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-950 border border-slate-800 hover:border-cyan-500/50 hover:bg-slate-900 text-slate-300 hover:text-cyan-300 text-xs font-medium rounded-lg transition"
        >
          <Plus className="w-3.5 h-3.5" />
          Checkout Started
        </button>
        <button
          onClick={() => addEvent('Purchase Completed')}
          className="flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-950 border border-slate-800 hover:border-teal-500/50 hover:bg-slate-900 text-slate-300 hover:text-teal-300 text-xs font-medium rounded-lg transition"
        >
          <Plus className="w-3.5 h-3.5" />
          Purchase Completed
        </button>
      </div>

      {/* Custom Event Form */}
      <form onSubmit={handleAddCustom} className="flex gap-2">
        <input
          type="text"
          value={customEvent}
          onChange={(e) => setCustomEvent(e.target.value)}
          placeholder="Type custom event (e.g., Compared Products, Left Website)..."
          className="flex-1 px-3 py-2 bg-slate-950 border border-slate-800 focus:border-indigo-500 text-slate-200 text-xs rounded-lg focus:outline-none placeholder-slate-600"
        />
        <button
          type="submit"
          className="px-3 py-2 bg-slate-850 hover:bg-slate-800 border border-slate-850 text-slate-200 text-xs font-medium rounded-lg transition"
        >
          Add Custom
        </button>
      </form>

      {/* Event Stream List */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-slate-500 font-semibold px-1">
          <span>EVENT STREAM ({events.length})</span>
          <button
            onClick={handleReset}
            className="flex items-center gap-1 hover:text-rose-400 transition"
          >
            <RotateCcw className="w-3 h-3" />
            Reset
          </button>
        </div>

        <div className="border border-slate-850 rounded-xl bg-slate-950/40 p-3 min-h-[8rem] max-h-[14rem] overflow-y-auto space-y-1.5 scrollbar-thin scrollbar-thumb-slate-800">
          {events.length === 0 ? (
            <div className="h-24 flex items-center justify-center text-slate-600 text-xs">
              No events added yet. Click controls above to build session.
            </div>
          ) : (
            events.map((event, idx) => (
              <div
                key={idx}
                className="group flex items-center justify-between px-3 py-1.5 bg-slate-950 border border-slate-900 hover:border-slate-800 rounded-lg text-xs text-slate-300 transition"
              >
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-600 font-mono">#{idx + 1}</span>
                  <span className="font-medium">{event}</span>
                </div>
                <button
                  onClick={() => removeEventAtIndex(idx)}
                  className="text-slate-700 hover:text-rose-400 transition opacity-0 group-hover:opacity-100"
                  title="Delete event"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Submit Trigger */}
      <div className="flex justify-end pt-2">
        <button
          onClick={handleRunAnalysis}
          disabled={isLoading || events.length === 0}
          className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-400 hover:to-violet-500 disabled:from-indigo-900/40 disabled:to-violet-900/40 disabled:text-slate-500 text-white text-sm font-semibold rounded-xl transition duration-200 shadow-lg shadow-indigo-500/20 w-full sm:w-auto justify-center"
        >
          <Play className="w-4 h-4 fill-current" />
          {isLoading ? 'Analyzing Session...' : 'Analyze Simulator Session'}
        </button>
      </div>
    </div>
  );
}
