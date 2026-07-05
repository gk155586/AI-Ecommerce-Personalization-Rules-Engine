'use client';

import { useState } from 'react';
import { ShopperSession } from '@/types';

interface RawJsonEditorProps {
  onLoadShoppers: (shoppers: ShopperSession[]) => void;
}

export default function RawJsonEditor({ onLoadShoppers }: RawJsonEditorProps) {
  const [jsonText, setJsonText] = useState(
`[
  {
    "user": "U008 - Custom Shopper",
    "events": [
      "Visited Homepage",
      "Viewed Premium Running Shoes",
      "Added Premium Running Shoes to Cart",
      "Coupon Applied",
      "Left Website"
    ]
  }
]`
  );
  const [error, setError] = useState<string | null>(null);

  const handleValidateAndLoad = () => {
    setError(null);
    const trimmed = jsonText.trim();
    if (!trimmed) {
      setError('JSON editor is empty.');
      return;
    }

    try {
      const parsed = JSON.parse(trimmed);
      
      // Determine if it's an array of shoppers or a single shopper
      let shoppersArray: ShopperSession[] = [];
      
      if (Array.isArray(parsed)) {
        // Validate array items
        for (let i = 0; i < parsed.length; i++) {
          const item = parsed[i];
          if (!item.user || typeof item.user !== 'string') {
            throw new Error(`Shopper at index ${i} is missing a string "user" ID.`);
          }
          if (!item.events || !Array.isArray(item.events)) {
            throw new Error(`Shopper at index ${i} ("${item.user}") is missing an "events" array.`);
          }
        }
        shoppersArray = parsed;
      } else {
        // Validate single shopper
        if (!parsed.user || typeof parsed.user !== 'string') {
          throw new Error('Shopper is missing a string "user" ID.');
        }
        if (!parsed.events || !Array.isArray(parsed.events)) {
          throw new Error(`Shopper "${parsed.user}" is missing an "events" array.`);
        }
        shoppersArray = [parsed];
      }

      onLoadShoppers(shoppersArray);
    } catch (e: any) {
      setError(e.message || 'Invalid JSON syntax.');
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-slate-100">Paste JSON Event Stream</h3>
        <p className="text-sm text-slate-400">
          Input a single shopper object or an array of shoppers.
        </p>
      </div>

      <div className="relative">
        <textarea
          value={jsonText}
          onChange={(e) => setJsonText(e.target.value)}
          className="w-full h-64 font-mono text-xs bg-slate-950 text-emerald-400 border border-slate-800 rounded-xl p-4 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none resize-none scrollbar-thin scrollbar-thumb-slate-800"
          placeholder="Paste shopper JSON here..."
          spellCheck={false}
        />
      </div>

      {error && (
        <div className="text-xs text-rose-400 bg-rose-950/40 border border-rose-900/60 px-4 py-2.5 rounded-lg">
          <strong>Validation Error:</strong> {error}
        </div>
      )}

      <div className="flex justify-end">
        <button
          onClick={handleValidateAndLoad}
          className="px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-900 text-sm font-semibold rounded-xl transition duration-200 shadow-lg shadow-emerald-500/20"
        >
          Parse & Load Sessions
        </button>
      </div>
    </div>
  );
}
