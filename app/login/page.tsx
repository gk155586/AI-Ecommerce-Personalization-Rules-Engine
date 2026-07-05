'use client';

import { useState, useTransition } from 'react';
import Image from 'next/image';
import { loginAction } from '../actions';
import { KeyRound, User, AlertCircle, Loader2 } from 'lucide-react';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!username || !password) {
      setError('Please fill in all fields.');
      return;
    }

    startTransition(async () => {
      const result = await loginAction(username, password);
      if (result && result.error) {
        setError(result.error);
      }
    });
  };

  return (
    <main className="relative min-h-screen w-full flex items-center justify-center bg-[#090714] text-slate-100 overflow-hidden font-sans">
      {/* Decorative Radial Gradients */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md px-6 py-12 z-10">
        {/* Logo and Brand */}
        <div className="flex flex-col items-center mb-8 animate-fade-in">
          <Image
            src="/logo.png"
            alt="Brand Logo"
            width={64}
            height={64}
            className="mb-4 drop-shadow-[0_0_15px_rgba(168,85,247,0.4)]"
            priority
          />
          <h1 className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-purple-400 via-pink-400 to-indigo-400 bg-clip-text text-transparent">
            Aura Analytics
          </h1>
          <p className="text-sm text-slate-400 mt-1">Ecommerce Personalization Engine</p>
        </div>

        {/* Login Card */}
        <div className="bg-[#120f26]/60 backdrop-blur-xl border border-purple-500/10 rounded-2xl p-8 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)]">
          <h2 className="text-xl font-semibold mb-6 text-slate-200">Admin Sign In</h2>

          <form onSubmit={handleLogin} className="space-y-5">
            {/* Username Input */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Username
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 pointer-events-none">
                  <User size={16} />
                </span>
                <input
                  type="text"
                  placeholder="admin"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={isPending}
                  className="w-full bg-[#1b1736]/40 border border-purple-500/10 focus:border-purple-500/50 rounded-lg py-2.5 pl-10 pr-4 text-sm text-slate-100 placeholder-slate-500 outline-none transition-all duration-300 focus:ring-1 focus:ring-purple-500/30"
                />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Password
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 pointer-events-none">
                  <KeyRound size={16} />
                </span>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isPending}
                  className="w-full bg-[#1b1736]/40 border border-purple-500/10 focus:border-purple-500/50 rounded-lg py-2.5 pl-10 pr-4 text-sm text-slate-100 placeholder-slate-500 outline-none transition-all duration-300 focus:ring-1 focus:ring-purple-500/30"
                />
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="flex items-center gap-2 text-red-400 bg-red-950/20 border border-red-500/10 rounded-lg p-3 text-xs leading-relaxed">
                <AlertCircle size={16} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isPending}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 text-white font-semibold text-sm rounded-lg py-2.5 shadow-lg shadow-purple-900/30 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
            >
              {isPending ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Signing in...</span>
                </>
              ) : (
                <span>Sign In</span>
              )}
            </button>
          </form>

          {/* Test Credentials Tip */}
          <div className="mt-6 border-t border-purple-500/10 pt-4 text-center">
            <p className="text-[11px] text-slate-500">
              Testing Admin Credentials:<br />
              <span className="font-mono text-slate-400">admin</span> / <span className="font-mono text-slate-400">password123</span>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
