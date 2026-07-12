
import React, { useState } from 'react';
import { X, Clock, Save, Sun, Moon } from 'lucide-react';
import { Shift } from '../types';

interface ShiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (shift: Omit<Shift, 'id'>) => void;
}

const ShiftModal: React.FC<ShiftModalProps> = ({ isOpen, onClose, onSave }) => {
  const [formData, setFormData] = useState<Omit<Shift, 'id'>>({
    name: '',
    startTime: '07:00',
    endTime: '19:00',
    type: 'Diurno'
  });

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      alert('Por favor, insira o nome do turno.');
      return;
    }
    onSave(formData);
    setFormData({ name: '', startTime: '07:00', endTime: '19:00', type: 'Diurno' });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="bg-[#1e293b] text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center text-blue-400">
              <Clock size={20} />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight uppercase">Novo Turno</h2>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Configuração de Horário</p>
            </div>
          </div>
          <button onClick={onClose} className="hover:bg-white/10 p-2 rounded-full transition-colors text-slate-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Nome do Turno</label>
              <input 
                type="text" 
                value={formData.name} 
                onChange={e => setFormData({...formData, name: e.target.value})}
                placeholder="Ex: Turno A, Diurno 1..."
                className="w-full mt-1.5 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Início</label>
                <input 
                  type="time" 
                  value={formData.startTime} 
                  onChange={e => setFormData({...formData, startTime: e.target.value})}
                  className="w-full mt-1.5 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Fim</label>
                <input 
                  type="time" 
                  value={formData.endTime} 
                  onChange={e => setFormData({...formData, endTime: e.target.value})}
                  className="w-full mt-1.5 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Tipo de Turno</label>
              <div className="grid grid-cols-2 gap-3 mt-1.5">
                <button
                  type="button"
                  onClick={() => setFormData({...formData, type: 'Diurno'})}
                  className={`flex items-center justify-center gap-2 py-3 rounded-2xl font-black text-[11px] uppercase transition-all border ${formData.type === 'Diurno' ? 'bg-orange-50 border-orange-200 text-orange-600 shadow-sm' : 'bg-slate-50 border-slate-100 text-slate-400 hover:bg-slate-100'}`}
                >
                  <Sun size={14} /> Diurno
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({...formData, type: 'Noturno'})}
                  className={`flex items-center justify-center gap-2 py-3 rounded-2xl font-black text-[11px] uppercase transition-all border ${formData.type === 'Noturno' ? 'bg-indigo-50 border-indigo-200 text-indigo-600 shadow-sm' : 'bg-slate-50 border-slate-100 text-slate-400 hover:bg-slate-100'}`}
                >
                  <Moon size={14} /> Noturno
                </button>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t border-slate-100">
            <button 
              type="button" 
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-white border border-slate-200 text-slate-500 rounded-2xl font-black text-[11px] uppercase hover:bg-slate-50 transition-all"
            >
              Cancelar
            </button>
            <button 
              type="submit"
              className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-2xl font-black text-[11px] uppercase shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
            >
              <Save size={16} /> Salvar Turno
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ShiftModal;
