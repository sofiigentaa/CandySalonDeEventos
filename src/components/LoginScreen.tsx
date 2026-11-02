import React, { useState } from 'react';
import { KeyRound, Lock, LogIn, Mail, UserPlus } from 'lucide-react';
import { CalandriaMark } from '../calandria/CalandriaUI.tsx';
import { useAuth } from '../contexts/AuthContext.tsx';

type FormMode = 'login' | 'signup' | 'forgot';

export const LoginScreen: React.FC = () => {
  const { isConfigured, passwordRecovery, logIn, signUp, requestPasswordReset, updatePassword } = useAuth();
  const [mode, setMode] = useState<FormMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const changeMode = (nextMode: FormMode) => {
    setMode(nextMode);
    setError(null);
    setNotice(null);
    setPassword('');
    setConfirmPassword('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);

    if ((mode === 'signup' || passwordRecovery) && password !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setSending(true);
    try {
      let result: string | null;
      if (passwordRecovery) {
        result = await updatePassword(password);
        if (!result) {
          setNotice('Tu contraseña se actualizó. Ya podés iniciar sesión.');
          setPassword('');
          setConfirmPassword('');
        }
      } else if (mode === 'signup') {
        result = await signUp(email.trim(), password);
        if (!result) {
          setNotice('Te enviamos un correo para verificar tu cuenta. Confirmá tu email antes de iniciar sesión.');
          setMode('login');
          setPassword('');
          setConfirmPassword('');
        }
      } else if (mode === 'forgot') {
        result = await requestPasswordReset(email.trim());
        if (!result) setNotice('Si existe una cuenta con ese email, te enviamos un enlace para restablecer la contraseña.');
      } else {
        result = await logIn(email.trim(), password);
      }
      if (result) setError(result);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'No se pudo completar la solicitud.');
    } finally {
      setSending(false);
    }
  };

  const title = passwordRecovery
    ? 'Nueva contraseña'
    : mode === 'signup'
      ? 'Crear cuenta'
      : mode === 'forgot'
        ? 'Recuperar contraseña'
        : 'Acceso al sistema';

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm bg-white border border-slate-200 rounded-2xl shadow-sm p-7 space-y-5"
        data-testid="login-form"
      >
        <div className="flex flex-col items-center gap-2">
          <CalandriaMark className="w-14 h-16" />
          <div className="font-bold text-xl text-slate-900 tracking-tight">Golondrina</div>
          <p className="text-xs text-slate-500 flex items-center gap-1.5">
            {passwordRecovery ? <KeyRound className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
            {title}
          </p>
        </div>

        {!isConfigured && (
          <p role="alert" className="text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
            Falta configurar VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY.
          </p>
        )}

        {!passwordRecovery && mode !== 'login' && mode !== 'forgot' && (
          <p className="text-xs text-slate-600">Creá una cuenta. Te enviaremos un email para verificarla.</p>
        )}

        {!passwordRecovery && (
          <label className="block space-y-1.5">
            <span className="text-xs font-bold text-slate-700">Email</span>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@email.com"
              className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-pink-500/30 focus:border-pink-500"
            />
          </label>
        )}

        {mode !== 'forgot' && (
          <label className="block space-y-1.5">
            <span className="text-xs font-bold text-slate-700">
              {passwordRecovery ? 'Nueva contraseña' : 'Contraseña'}
            </span>
            <input
              type="password"
              required
              minLength={8}
              autoComplete={passwordRecovery ? 'new-password' : mode === 'signup' ? 'new-password' : 'current-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 8 caracteres"
              className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-pink-500/30 focus:border-pink-500"
            />
          </label>
        )}

        {(mode === 'signup' || passwordRecovery) && (
          <label className="block space-y-1.5">
            <span className="text-xs font-bold text-slate-700">Repetir contraseña</span>
            <input
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Volvé a escribir la contraseña"
              className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-pink-500/30 focus:border-pink-500"
            />
          </label>
        )}

        {notice && (
          <p role="status" className="text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
            {notice}
          </p>
        )}
        {error && (
          <p role="alert" className="text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={sending || !isConfigured}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-bold text-white bg-pink-600 hover:bg-pink-700 disabled:opacity-60 rounded-xl transition-colors cursor-pointer"
        >
          {mode === 'signup' ? <UserPlus className="w-4 h-4" /> : mode === 'forgot' ? <Mail className="w-4 h-4" /> : <LogIn className="w-4 h-4" />}
          {sending
            ? 'Procesando…'
            : passwordRecovery
              ? 'Guardar contraseña'
              : mode === 'signup'
                ? 'Crear cuenta'
                : mode === 'forgot'
                  ? 'Enviar enlace'
                  : 'Ingresar'}
        </button>

        {!passwordRecovery && (
          <div className="flex flex-col items-center gap-2 text-xs">
            {mode === 'login' && (
              <>
                <button type="button" onClick={() => changeMode('forgot')} className="font-semibold text-pink-700 hover:text-pink-800 cursor-pointer">
                  Olvidé mi contraseña
                </button>
                <p className="text-slate-500">
                  ¿No tenés cuenta?{' '}
                  <button type="button" onClick={() => changeMode('signup')} className="font-bold text-pink-700 hover:text-pink-800 cursor-pointer">
                    Registrarme
                  </button>
                </p>
              </>
            )}
            {mode !== 'login' && (
              <button type="button" onClick={() => changeMode('login')} className="font-semibold text-pink-700 hover:text-pink-800 cursor-pointer">
                Volver a iniciar sesión
              </button>
            )}
            <p className="text-center text-[11px] text-slate-400 mt-2">una solución de <b className="text-slate-600">tecnoros.ar</b></p>
          </div>
        )}
      </form>
    </div>
  );
};
