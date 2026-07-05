'use client';

import sampleShoppersData from '@/sample-data/sample-shoppers.json';
import { ShopperSession } from '@/types';

// Cast the imported JSON to the ShopperSession array type
const sampleShoppers = sampleShoppersData as ShopperSession[];

interface SampleDataLoaderProps {
  onLoadShoppers: (shoppers: ShopperSession[]) => void;
}

export default function SampleDataLoader({ onLoadShoppers }: SampleDataLoaderProps) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-slate-100">Load E-Commerce Sample Data</h3>
          <p className="text-sm text-slate-400">
            Select standard shopper profiles to populate the classification engine.
          </p>
        </div>
        <button
          onClick={() => onLoadShoppers(sampleShoppers)}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg transition duration-200 shadow-md shadow-indigo-600/20 whitespace-nowrap self-start sm:self-auto"
        >
          Load All 7 Profiles
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[30rem] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-800">
        {sampleShoppers.map((shopper, idx) => (
          <div
            key={idx}
            className="flex flex-col justify-between p-4 bg-slate-950/60 border border-slate-800 hover:border-slate-700/80 rounded-xl transition duration-200 group"
          >
            <div className="space-y-2">
              <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">
                Profile {idx + 1}
              </span>
              <h4 className="text-sm font-bold text-slate-200 group-hover:text-white transition">
                {shopper.user}
              </h4>
              
              {/* Event preview badges */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {shopper.events.map((event, eventIdx) => (
                  <span
                    key={eventIdx}
                    className="text-[10px] px-2 py-0.5 bg-slate-900 border border-slate-800 text-slate-400 rounded-md"
                  >
                    {event}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex justify-end pt-4 mt-auto">
              <button
                onClick={() => onLoadShoppers([shopper])}
                className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white text-xs font-medium rounded-lg transition"
              >
                Load Profile
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
