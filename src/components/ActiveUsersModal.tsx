import React, { useState, useEffect } from 'react';
import { X, Users, Search, LogOut, Clock, Smartphone, Monitor, ShieldCheck, Activity } from 'lucide-react';
import { ActiveSession } from '../types';

interface ActiveUsersModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeSessions: ActiveSession[];
  onDisconnectUser?: (sessionId: string) => Promise<void>;
  currentUserId?: string;
}

export const ActiveUsersModal: React.FC<ActiveUsersModalProps> = ({
  isOpen,
  onClose,
  activeSessions,
  onDisconnectUser,
  currentUserId
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [now, setNow] = useState(Date.now());

  // Update 'now' every 5 seconds for accurate "há X segundos" labels
  useEffect(() => {
    if (!isOpen) return;
    const interval = setInterval(() => setNow(Date.now()), 5000);
    return () => clearInterval(interval);
  }, [isOpen]);

  if (!isOpen) return null;

  // Filter sessions that have heartbeat within last 2 minutes (120,000 ms)
  const onlineSessions = activeSessions.filter(s => {
    if (!s.lastSeen) return false;
    const diff = now - new Date(s.lastSeen).getTime();
    return diff < 120000;
  });

  const filteredSessions = onlineSessions.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.registration.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatLastSeen = (isoString: string) => {
    if (!isoString) return 'Desconhecido';
    const diffSeconds = Math.floor((now - new Date(isoString).getTime()) / 1000);
    if (diffSeconds < 10) return 'Agora mesmo';
    if (diffSeconds < 60) return `Há ${diffSeconds}s`;
    const minutes = Math.floor(diffSeconds / 60);
    return `Há ${minutes} min`;
  };

  const formatTime = (isoString: string) => {
    if (!isoString) return '--:--';
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '--:--';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-2xl border border-emerald-500/30 flex items-center justify-center">
              <span className="relative flex h-3 w-3 mr-1">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
              <Users size={22} />
            </div>
            <div>
              <h2 className="text-lg font-black uppercase tracking-tight flex items-center gap-2">
                Usuários Logados em Tempo Real
              </h2>
              <p className="text-xs text-slate-300 font-medium">
                {onlineSessions.length} {onlineSessions.length === 1 ? 'colaborador conectado' : 'colaboradores conectados'} no sistema
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-all"
          >
            <X size={20} />
          </button>
        </div>

        {/* Search Bar & Summary */}
        <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center gap-3">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text"
              placeholder="Buscar por nome, matrícula ou cargo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 placeholder:text-slate-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
            />
          </div>
          <div className="px-3 py-2 bg-emerald-100/60 text-emerald-800 rounded-xl text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5 shrink-0">
            <Activity size={14} className="animate-spin text-emerald-600" /> Live Updates
          </div>
        </div>

        {/* User List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {filteredSessions.length === 0 ? (
            <div className="py-12 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
              <Users size={40} className="opacity-30" />
              <p className="text-xs font-bold uppercase tracking-wider">
                {searchTerm ? 'Nenhum usuário encontrado na busca' : 'Nenhum usuário conectado no momento'}
              </p>
            </div>
          ) : (
            filteredSessions.map((session) => {
              const isCurrentUser = session.id === currentUserId || session.registration === currentUserId;
              return (
                <div 
                  key={session.id}
                  className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    isCurrentUser 
                      ? 'bg-blue-50/60 border-blue-200' 
                      : 'bg-white border-slate-100 hover:border-slate-200 hover:shadow-sm'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative shrink-0">
                      <div className="w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center font-black text-sm uppercase shadow-sm">
                        {session.name.substring(0, 2)}
                      </div>
                      <span className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border-2 border-white"></span>
                      </span>
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-black text-slate-800 truncate uppercase">
                          {session.name}
                        </p>
                        {isCurrentUser && (
                          <span className="px-2 py-0.5 bg-blue-600 text-white text-[9px] font-black rounded-md uppercase tracking-wider">
                            Você
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-slate-500 font-bold mt-0.5">
                        <span>Matrícula: {session.registration}</span>
                        <span>•</span>
                        <span className="text-slate-600">{session.role}</span>
                      </div>
                    </div>
                  </div>

                  {/* Device & Activity Info */}
                  <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                    <div className="text-right">
                      <div className="flex items-center gap-1 text-[10px] font-bold text-slate-600 justify-end">
                        {session.device === 'Mobile' ? (
                          <Smartphone size={12} className="text-slate-400" />
                        ) : (
                          <Monitor size={12} className="text-slate-400" />
                        )}
                        <span>Entrou às {formatTime(session.loginTime)}</span>
                      </div>
                      <p className="text-[10px] text-emerald-600 font-extrabold flex items-center gap-1 justify-end mt-0.5">
                        <Clock size={11} /> {formatLastSeen(session.lastSeen)}
                      </p>
                    </div>

                    {onDisconnectUser && !isCurrentUser && (
                      <button
                        onClick={() => onDisconnectUser(session.id)}
                        className="px-2.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl text-[10px] font-black uppercase tracking-wider border border-red-100 transition-all flex items-center gap-1"
                        title="Desconectar este usuário"
                      >
                        <LogOut size={12} /> Desconectar
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span className="text-[10px] font-bold text-slate-400 uppercase">
            Atualização em tempo real via Firestore
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 hover:bg-black text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md"
          >
            Fechar
          </button>
        </div>

      </div>
    </div>
  );
};
