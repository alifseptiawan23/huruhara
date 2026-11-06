import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useCollaborationStore } from '../store/useCollaborationStore';
import { Lock, Sparkles, AlertCircle, ArrowRight } from 'lucide-react';

export const JoinRoomAuthModal: React.FC = () => {
  const { needsAuthToJoin, leaveRoom, roomId } = useCollaborationStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!needsAuthToJoin) return null;

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          // Redirect back to current room URL
          redirectTo: window.location.href,
        },
      });
      if (error) throw error;
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Gagal masuk dengan Google. Pastikan Google Provider aktif di Supabase.');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="bg-[#0d1117] border border-slate-700/80 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden ring-1 ring-white/10">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-slate-800 bg-slate-900/60 text-center relative">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 via-violet-600 to-pink-500 flex items-center justify-center shadow-xl shadow-indigo-500/25 mx-auto mb-3">
            <Lock size={22} className="text-white" />
          </div>
          <h2 className="text-base font-bold text-white tracking-tight">
            Sesi Kolaborasi Terkunci
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Anda diundang ke sesi diagram <span className="font-mono text-indigo-400">#{roomId}</span>
          </p>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {error && (
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-red-950/60 border border-red-800/80 text-red-300 text-xs leading-relaxed">
              <AlertCircle size={15} className="shrink-0 mt-0.5 text-red-400" />
              <span>{error}</span>
            </div>
          )}

          <div className="p-3.5 rounded-xl bg-indigo-950/20 border border-indigo-900/40 text-xs text-slate-300 space-y-1.5 leading-relaxed">
            <div className="flex items-center gap-1.5 font-semibold text-white">
              <Sparkles size={14} className="text-indigo-400" />
              <span>Login Diperlukan untuk Bergabung</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Untuk menjaga integritas skema dan menampilkan identitas kursor Anda secara real-time, Anda harus masuk dengan akun Google terlebih dahulu.
            </p>
          </div>

          {/* 1-Click Google Sign In */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl bg-white hover:bg-slate-100 active:scale-[0.98] text-slate-900 font-semibold text-sm transition-all shadow-lg shadow-white/5 border border-slate-200 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-slate-400 border-t-slate-800 rounded-full animate-spin" />
            ) : (
              <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
            )}
            <span>{loading ? 'Menghubungkan...' : 'Lanjutkan dengan Google'}</span>
          </button>

          {/* Fallback to personal canvas */}
          <div className="pt-2 text-center">
            <button
              onClick={leaveRoom}
              className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors"
            >
              <span>Tidak ingin bergabung? Buka canvas pribadi</span>
              <ArrowRight size={12} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

