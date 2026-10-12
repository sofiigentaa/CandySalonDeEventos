import React, { useState } from 'react';
import { Lock, LogIn } from 'lucide-react';
import { CalandriaMark } from '../calandria/CalandriaUI.tsx';
import { useAuth } from '../contexts/AuthContext.tsx';

export const LoginScreen: React.FC = () => {
  const { logIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSending(true);
    const err = await logIn(email.trim(), password);
    setSending(false);
    if (err) setError(err);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm bg-white border border-slate-200 rounded-2xl shadow-sm p-7 space-y-5"
        data-testid="login-form"
      >
        <div className="flex flex-col items-center gap-2">
          <CalandriaMark className="w-14 h-16" />
          <div className="font-bold text-xl text-slate-900 tracking-tight">Calandria</div>
          <p className="text-xs text-slate-500 flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5" /> Acceso al sistema
          </p>
        </div>

        <label className="block space-y-1.5">
          <span className="text-xs font-bold text-slate-700">Email</span>
          <input
            type="email"
            required
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@email.com"
            className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-pink-500/30 focus:border-pink-500"
          />
        </label>

        <label className="block space-y-1.5">
          <span className="text-xs font-bold text-slate-700">Contraseña</span>
          <input
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-pink-500/30 focus:border-pink-500"
          />
        </label>

        {error && (
          <p role="alert" className="text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={sending}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-bold text-white bg-pink-600 hover:bg-pink-700 disabled:opacity-60 rounded-xl transition-colors cursor-pointer"
        >
          <LogIn className="w-4 h-4" />
          {sending ? 'Ingresando…' : 'Ingresar'}
        </button>
        <p className="text-center text-[11px] text-slate-400">una solución de <b className="text-slate-600">tecnoros.ar</b></p>
      </form>
    </div>
  );
};
