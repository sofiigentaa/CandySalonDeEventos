import React, { useState } from 'react';
import { KeyRound, Lock, LogIn, ShieldCheck, Smartphone, UserPlus } from 'lucide-react';
import { CalandriaMark } from '../calandria/CalandriaUI.tsx';
import { PendingTwoFactor, useAuth } from '../contexts/AuthContext.tsx';

type FormMode = 'login' | 'signup' | 'forgot';

const inputClass =
  'w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-pink-500/30 focus:border-pink-500';

const CodeInput: React.FC<{ value: string; onChange: (v: string) => void; autoFocus?: boolean }> = ({ value, onChange, autoFocus }) => (
  <label className="block space-y-1.5">
    <span className="text-xs font-bold text-slate-700">Código de la app autenticadora</span>
    <input
      type="text"
      inputMode="numeric"
      autoComplete="one-time-code"
      pattern="[0-9 ]*"
      maxLength={7}
      required
      autoFocus={autoFocus}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="123456"
      className={`${inputClass} text-center text-lg tracking-[0.4em] font-mono`}
    />
  </label>
);

export const LoginScreen: React.FC = () => {
  const { logIn, signUp, verifyCode, resetPassword } = useAuth();
  const [mode, setMode] = useState<FormMode>('login');
  const [pending, setPending] = useState<PendingTwoFactor | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const reset = (nextMode: FormMode) => {
    setMode(nextMode);
    setPending(null);
    setError(null);
    setPassword('');
    setConfirmPassword('');
    setCode('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const cleanCode = code.replace(/\s/g, '');

    if (!pending && (mode === 'signup' || mode === 'forgot') && password !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    if ((pending || mode === 'forgot') && !/^\d{6}$/.test(cleanCode)) {
      setError('El código tiene 6 números.');
      return;
    }

    setSending(true);
    try {
      if (pending) {
        const result = await verifyCode(pending.pendingToken, cleanCode);
        if (result) {
          setError(result);
          setCode('');
        }
      } else if (mode === 'forgot') {
        const result = await resetPassword(email.trim(), cleanCode, password);
        if (result) setError(result);
      } else {
        const result = mode === 'signup' ? await signUp(email.trim(), password) : await logIn(email.trim(), password);
        if (result.error) setError(result.error);
        if (result.data) {
          setPending(result.data);
          setPassword('');
          setConfirmPassword('');
          setCode('');
        }
      }
    } finally {
      setSending(false);
    }
  };

  const title = pending
    ? 'Verificación en dos pasos'
    : mode === 'signup'
      ? 'Crear cuenta'
      : mode === 'forgot'
        ? 'Nueva contraseña'
        : 'Acceso al sistema';

  const submitLabel = sending
    ? 'Procesando…'
    : pending
      ? pending.step === 'enroll' ? 'Activar y entrar' : 'Verificar'
      : mode === 'signup'
        ? 'Continuar'
        : mode === 'forgot'
          ? 'Guardar contraseña'
          : 'Ingresar';

  const SubmitIcon = pending ? ShieldCheck : mode === 'signup' ? UserPlus : mode === 'forgot' ? KeyRound : LogIn;

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
            {pending ? <ShieldCheck className="w-3.5 h-3.5" /> : mode === 'forgot' ? <KeyRound className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
            {title}
          </p>
          {pending && <p className="text-[11px] text-slate-400">{pending.email}</p>}
        </div>

        {pending?.step === 'enroll' && (
          <div className="space-y-3 text-xs text-slate-600">
            <p>
              Para activar la cuenta, vinculá una app autenticadora en tu celular (Google Authenticator,
              Microsoft Authenticator, Authy…). Se hace una sola vez.
            </p>
            <ol className="list-decimal pl-4 space-y-1">
              <li>En la app elegí <b>agregar cuenta</b> → <b>escanear código QR</b>.</li>
              <li>Escaneá este código.</li>
              <li>Escribí abajo los 6 números que muestra la app.</li>
            </ol>
            {pending.qrCode && (
              <div className="flex justify-center">
                <img src={pending.qrCode} alt="Código QR para la app autenticadora" className="w-44 h-44 border border-slate-200 rounded-xl p-1 bg-white" />
              </div>
            )}
            {pending.secret && (
              <details className="text-[11px]">
                <summary className="cursor-pointer font-semibold text-pink-700">¿No podés escanear? Ingresá la clave a mano</summary>
                <code className="block mt-1.5 break-all bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 select-all">{pending.secret}</code>
              </details>
            )}
          </div>
        )}

        {pending?.step === 'verify' && (
          <p className="text-xs text-slate-600 flex gap-2">
            <Smartphone className="w-4 h-4 shrink-0 text-pink-600" />
            Abrí tu app autenticadora y escribí el código de 6 números de Golondrina.
          </p>
        )}

        {mode === 'forgot' && !pending && (
          <p className="text-xs text-slate-600">
            Para cambiar la contraseña, confirmá que sos vos con el código de tu app autenticadora.
          </p>
        )}

        {!pending && (
          <label className="block space-y-1.5">
            <span className="text-xs font-bold text-slate-700">Email</span>
            <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@email.com" className={inputClass} />
          </label>
        )}

        {!pending && (
          <label className="block space-y-1.5">
            <span className="text-xs font-bold text-slate-700">{mode === 'forgot' ? 'Nueva contraseña' : 'Contraseña'}</span>
            <input
              type="password"
              required
              minLength={8}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 8 caracteres"
              className={inputClass}
            />
          </label>
        )}

        {!pending && (mode === 'signup' || mode === 'forgot') && (
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
              className={inputClass}
            />
          </label>
        )}

        {(pending || mode === 'forgot') && <CodeInput value={code} onChange={setCode} autoFocus={Boolean(pending)} />}

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
          <SubmitIcon className="w-4 h-4" />
          {submitLabel}
        </button>

        <div className="flex flex-col items-center gap-2 text-xs">
          {!pending && mode === 'login' && (
            <>
              <button type="button" onClick={() => reset('forgot')} className="font-semibold text-pink-700 hover:text-pink-800 cursor-pointer">
                Olvidé mi contraseña
              </button>
              <p className="text-slate-500">
                ¿No tenés cuenta?{' '}
                <button type="button" onClick={() => reset('signup')} className="font-bold text-pink-700 hover:text-pink-800 cursor-pointer">
                  Registrarme
                </button>
              </p>
            </>
          )}
          {(pending || mode !== 'login') && (
            <button type="button" onClick={() => reset('login')} className="font-semibold text-pink-700 hover:text-pink-800 cursor-pointer">
              Volver a iniciar sesión
            </button>
          )}
          {pending?.step === 'verify' && (
            <p className="text-center text-[11px] text-slate-400">¿Perdiste el celular? Pedile al administrador que reinicie tu 2FA.</p>
          )}
          <p className="text-center text-[11px] text-slate-400 mt-2">una solución de <b className="text-slate-600">tecnoros.ar</b></p>
        </div>
      </form>
    </div>
  );
};
