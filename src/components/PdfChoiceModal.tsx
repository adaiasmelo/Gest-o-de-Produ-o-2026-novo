import React from 'react';
import { FileText, Download, ExternalLink, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface PdfChoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onView: () => void;
  onDownload: () => void;
  title: string;
}

const PdfChoiceModal: React.FC<PdfChoiceModalProps> = ({
  isOpen,
  onClose,
  onView,
  onDownload,
  title
}) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        />
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          className="bg-white rounded-[2.5rem] w-full max-w-sm shadow-2xl relative overflow-hidden border border-slate-200 p-8 text-center"
        >
          <button 
            onClick={onClose}
            className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
          >
            <X size={20} />
          </button>

          <div className="w-20 h-20 mx-auto rounded-3xl mb-6 flex items-center justify-center bg-blue-50 text-blue-600 border border-blue-100 shadow-inner">
            <FileText size={32} />
          </div>

          <div className="space-y-3 mb-8">
            <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight leading-tight">
              PDF Gerado com Sucesso
            </h3>
            <p className="text-xs text-slate-500 font-bold uppercase tracking-widest leading-relaxed px-2 italic">
              {title}
            </p>
            <p className="text-sm text-slate-400 font-medium leading-relaxed px-2 mt-2">
              Como você deseja prosseguir com o documento?
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <button
              onClick={() => {
                onView();
                onClose();
              }}
              className="w-full py-4 bg-white border-2 border-blue-600 text-blue-600 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2 hover:bg-blue-50"
            >
              <ExternalLink size={16} />
              Visualizar PDF
            </button>
            <button
              onClick={() => {
                onDownload();
                onClose();
              }}
              className="w-full py-4 bg-blue-600 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2 hover:bg-blue-700 shadow-blue-200"
            >
              <Download size={16} />
              Baixar Arquivo
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default PdfChoiceModal;
