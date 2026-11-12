import React, { useCallback, useEffect, useState } from 'react';
import { RotateCcw, ShieldAlert, ShieldCheck, ShieldOff, UserCog, X } from 'lucide-react';
import { apiRequest } from '../utils/api.ts';

interface AdminUser {
  id: string;
  email: string;
  twoFactorEnabled: boolean;
  createdAt: string | null;
  isAdmin: boolean;
}

interface AdminUsersModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserId: string;
}

// Panel de administrador: lista de cuentas y reinicio de la verificación en
// dos pasos (para quien perdió o cambió el celular).
export const AdminUsersModal: React.FC<AdminUsersModalProps> = ({ isOpen, onClose, currentUserId }) => {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<AdminUser | null>(null);
  const [resetting, setResetting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setUsers(await apiRequest<AdminUser[]>('/api/admin/users'));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'No se pudo leer la lista de usuarios.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    setNotice(null);
    setConfirming(null);
    void load();
  }, [isOpen, load]);

  if (!isOpen) return null;

  const resetTwoFactor = async (target: AdminUser) => {
    setResetting(true);
    setError(null);
    setNotice(null);
    try {
      await apiRequest(`/api/admin/users/${encodeURIComponent(target.id)}/reset-2fa`, { method: 'POST' });
      setNotice(`Se reinició el 2FA de ${target.email}. En su próximo ingreso va a escanear un QR nuevo.`);
      setConfirming(null);
      await load();
    } catch (resetError) {
      setError(resetError instanceof Error ? resetError.message : 'No se pudo reiniciar el 2FA.');
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/65 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-users-title"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-50 text-violet-600 border border-violet-200 flex items-center justify-center">
              <UserCog className="w-5 h-5" />
            </div>
            <div>
              <h2 id="admin-users-title" className="font-bold text-slate-900">Administrar usuarios</h2>
              <p className="text-xs text-slate-500">Reiniciá la verificación en dos pasos de quien perdió el celular.</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer" aria-label="Cerrar">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
          {notice && (
            <p role="status" className="text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">{notice}</p>
          )}
          {error && (
            <p role="alert" className="text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">{error}</p>
          )}

          {confirming && (
            <div className="border border-amber-300 bg-amber-50 rounded-xl p-4 space-y-3">
              <div className="flex gap-2.5 text-sm text-amber-900">
                <ShieldAlert className="w-5 h-5 shrink-0 text-amber-600" />
                <div className="space-y-1">
                  <p className="font-bold">¿Reiniciar el 2FA de {confirming.email}?</p>
                  <p className="text-xs">
                    Se desvincula su app autenticadora y se cierran todas sus sesiones. Hasta que vuelva a ingresar,
                    cualquiera que sepa su contraseña podría vincular otra app: hacelo solo si confirmaste que es esa persona.
                  </p>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setConfirming(null)} disabled={resetting} className="px-3 py-1.5 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer">
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => void resetTwoFactor(confirming)}
                  disabled={resetting}
                  className="px-3 py-1.5 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-60 rounded-lg cursor-pointer"
                >
                  {resetting ? 'Reiniciando…' : 'Sí, reiniciar 2FA'}
                </button>
              </div>
            </div>
          )}

          {loading && users.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">Cargando usuarios…</p>
          ) : users.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">No hay usuarios.</p>
          ) : (
            <ul className="divide-y divide-slate-100 border border-slate-200 rounded-xl">
              {users.map((u) => {
                const isSelf = u.id === currentUserId;
                return (
                  <li key={u.id} className="flex items-center justify-between gap-3 px-4 py-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">
                        {u.email}
                        {isSelf && <span className="ml-1.5 text-[10px] font-bold text-slate-400">(vos)</span>}
                        {u.isAdmin && <span className="ml-1.5 text-[10px] font-bold text-violet-600 bg-violet-50 border border-violet-200 rounded px-1 py-0.5">ADMIN</span>}
                      </p>
                      <p className={`text-[11px] flex items-center gap-1 ${u.twoFactorEnabled ? 'text-emerald-700' : 'text-amber-700'}`}>
                        {u.twoFactorEnabled ? <ShieldCheck className="w-3.5 h-3.5" /> : <ShieldOff className="w-3.5 h-3.5" />}
                        {u.twoFactorEnabled ? '2FA activo' : 'Sin 2FA: vincula la app en su próximo ingreso'}
                        {u.createdAt && <span className="text-slate-400"> · alta {new Date(u.createdAt).toLocaleDateString('es-AR')}</span>}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setNotice(null);
                        setConfirming(u);
                      }}
                      disabled={isSelf || !u.twoFactorEnabled || resetting}
                      title={isSelf ? 'No podés reiniciar tu propio 2FA' : !u.twoFactorEnabled ? 'Todavía no tiene app vinculada' : 'Reiniciar 2FA'}
                      className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 hover:bg-amber-100 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Reiniciar 2FA
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};
