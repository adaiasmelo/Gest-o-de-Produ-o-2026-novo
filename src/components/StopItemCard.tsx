import React, { useMemo, useState, useEffect } from 'react';
import { Trash2, Wrench, ChevronRight, Layers, Sparkles } from 'lucide-react';
import { StopItem } from '../types';
import {
  FAULT_TREE_CATEGORIES,
  parseStopItemHierarchy,
  formatStopItemMotivo,
  FaultTreeCategory,
  FaultTreeComponent,
} from '../constants/downtimeReasons';

interface StopItemCardProps {
  stop: StopItem;
  type: 'manutencao' | 'processo' | 'outros';
  onUpdate: (id: string, field: keyof StopItem, value: string) => void;
  onRemove: (id: string) => void;
}

const getDiffMinutes = (startTimeStr: string, endTimeStr: string): number => {
  if (!startTimeStr || !endTimeStr) return 0;
  const [hStart, mStart] = startTimeStr.split(':').map(Number);
  const [hEnd, mEnd] = endTimeStr.split(':').map(Number);
  if (isNaN(hStart) || isNaN(mStart) || isNaN(hEnd) || isNaN(mEnd)) return 0;

  let startMin = hStart * 60 + mStart;
  let endMin = hEnd * 60 + mEnd;

  if (endMin < startMin) {
    endMin += 24 * 60;
  }
  return endMin - startMin;
};

export const StopItemCard: React.FC<StopItemCardProps> = ({
  stop,
  type,
  onUpdate,
  onRemove,
}) => {
  const diffMin = getDiffMinutes(stop.de, stop.ate);

  // Parse initial hierarchy from stop properties or formatted string
  const initialHierarchy = useMemo(
    () => parseStopItemHierarchy(stop.motivo, stop.category, stop.component, stop.defect),
    [stop.motivo, stop.category, stop.component, stop.defect]
  );

  const [selectedCategoryName, setSelectedCategoryName] = useState<string>(initialHierarchy.category);
  const [selectedComponentName, setSelectedComponentName] = useState<string>(initialHierarchy.component);
  const [selectedDefectName, setSelectedDefectName] = useState<string>(initialHierarchy.defect);
  const [isCustomDefect, setIsCustomDefect] = useState<boolean>(false);
  const [customDefectInput, setCustomDefectInput] = useState<string>('');

  // Synchronize internal state if stop props change externally
  useEffect(() => {
    const parsed = parseStopItemHierarchy(stop.motivo, stop.category, stop.component, stop.defect);
    setSelectedCategoryName(parsed.category);
    setSelectedComponentName(parsed.component);
    
    // Check if defect matches known defects
    const foundCat = FAULT_TREE_CATEGORIES.find(c => c.name === parsed.category);
    const foundComp = foundCat?.components.find(c => c.name === parsed.component);
    const isKnownDefect = foundComp?.defects.includes(parsed.defect);

    if (parsed.defect && !isKnownDefect) {
      setIsCustomDefect(true);
      setCustomDefectInput(parsed.defect);
      setSelectedDefectName('__CUSTOM__');
    } else {
      setIsCustomDefect(false);
      setSelectedDefectName(parsed.defect || (foundComp?.defects[0] ?? ''));
    }
  }, [stop.motivo, stop.category, stop.component, stop.defect]);

  // Find active category & component objects
  const activeCategory: FaultTreeCategory = useMemo(() => {
    return (
      FAULT_TREE_CATEGORIES.find(c => c.name === selectedCategoryName) ||
      FAULT_TREE_CATEGORIES[0]
    );
  }, [selectedCategoryName]);

  const activeComponentList: FaultTreeComponent[] = useMemo(() => {
    return activeCategory.components;
  }, [activeCategory]);

  const activeComponent: FaultTreeComponent = useMemo(() => {
    return (
      activeComponentList.find(c => c.name === selectedComponentName) ||
      activeComponentList[0] || { id: 'other', name: 'Geral', defects: [] }
    );
  }, [activeComponentList, selectedComponentName]);

  const availableDefects: string[] = useMemo(() => {
    return activeComponent.defects || [];
  }, [activeComponent]);

  // Handle Category Change (Nível 1)
  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newCatName = e.target.value;
    const catObj = FAULT_TREE_CATEGORIES.find(c => c.name === newCatName) || FAULT_TREE_CATEGORIES[0];
    const firstComp = catObj.components[0] || { name: 'Geral', defects: [] };
    const firstDefect = firstComp.defects[0] || 'Ocorrência Geral';

    setSelectedCategoryName(catObj.name);
    setSelectedComponentName(firstComp.name);
    setSelectedDefectName(firstDefect);
    setIsCustomDefect(false);

    const formattedMotivo = formatStopItemMotivo(catObj.name, firstComp.name, firstDefect);

    onUpdate(stop.id, 'category', catObj.name);
    onUpdate(stop.id, 'component', firstComp.name);
    onUpdate(stop.id, 'defect', firstDefect);
    onUpdate(stop.id, 'motivo', formattedMotivo);
  };

  // Handle Component Change (Nível 2)
  const handleComponentChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newCompName = e.target.value;
    const compObj = activeComponentList.find(c => c.name === newCompName) || activeComponentList[0];
    const firstDefect = compObj?.defects[0] || 'Ocorrência Geral';

    setSelectedComponentName(newCompName);
    setSelectedDefectName(firstDefect);
    setIsCustomDefect(false);

    const formattedMotivo = formatStopItemMotivo(selectedCategoryName, newCompName, firstDefect);

    onUpdate(stop.id, 'category', selectedCategoryName);
    onUpdate(stop.id, 'component', newCompName);
    onUpdate(stop.id, 'defect', firstDefect);
    onUpdate(stop.id, 'motivo', formattedMotivo);
  };

  // Handle Defect Change (Nível 3)
  const handleDefectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === '__CUSTOM__') {
      setIsCustomDefect(true);
      setSelectedDefectName('__CUSTOM__');
      const defectText = customDefectInput || 'Outro Defeito';
      const formattedMotivo = formatStopItemMotivo(selectedCategoryName, selectedComponentName, defectText);
      onUpdate(stop.id, 'category', selectedCategoryName);
      onUpdate(stop.id, 'component', selectedComponentName);
      onUpdate(stop.id, 'defect', defectText);
      onUpdate(stop.id, 'motivo', formattedMotivo);
    } else {
      setIsCustomDefect(false);
      setSelectedDefectName(val);
      const formattedMotivo = formatStopItemMotivo(selectedCategoryName, selectedComponentName, val);
      onUpdate(stop.id, 'category', selectedCategoryName);
      onUpdate(stop.id, 'component', selectedComponentName);
      onUpdate(stop.id, 'defect', val);
      onUpdate(stop.id, 'motivo', formattedMotivo);
    }
  };

  // Handle Custom Defect Input
  const handleCustomDefectInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value;
    setCustomDefectInput(text);
    const formattedMotivo = formatStopItemMotivo(selectedCategoryName, selectedComponentName, text);
    onUpdate(stop.id, 'category', selectedCategoryName);
    onUpdate(stop.id, 'component', selectedComponentName);
    onUpdate(stop.id, 'defect', text);
    onUpdate(stop.id, 'motivo', formattedMotivo);
  };

  // Card Theme accents based on stop type
  const typeBadgeColor =
    type === 'manutencao'
      ? 'border-orange-300 bg-orange-50/70'
      : type === 'processo'
      ? 'border-blue-300 bg-blue-50/70'
      : 'border-slate-300 bg-slate-50/70';

  const currentDefectDisplay = isCustomDefect ? customDefectInput || 'Outro Defeito' : selectedDefectName;

  return (
    <div className={`p-3 bg-white border rounded-2xl space-y-3 shadow-xs transition-all ${typeBadgeColor}`}>
      {/* Horário & Duração */}
      <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
        <div className="flex items-center gap-1.5 flex-1 flex-wrap">
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span> Horário:
          </span>
          <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg px-1.5 py-0.5 shadow-2xs">
            <input
              type="time"
              value={stop.de}
              onChange={(e) => onUpdate(stop.id, 'de', e.target.value)}
              className="bg-transparent text-xs font-black text-slate-800 text-center focus:outline-none cursor-pointer"
            />
            <span className="text-[10px] font-black text-slate-400">às</span>
            <input
              type="time"
              value={stop.ate}
              onChange={(e) => onUpdate(stop.id, 'ate', e.target.value)}
              className="bg-transparent text-xs font-black text-slate-800 text-center focus:outline-none cursor-pointer"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] font-black text-slate-700 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-lg shadow-2xs">
            {diffMin > 0 ? `${diffMin} min` : '0 min'}
          </span>
          <button
            type="button"
            onClick={() => onRemove(stop.id)}
            className="p-1.5 text-red-500 hover:text-white hover:bg-red-500 rounded-lg transition-all cursor-pointer"
            title="Remover esta parada"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Estrutura em 3 Níveis (Árvore de Falhas) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1">
            <Layers size={11} className="text-orange-500" />
            <span>Árvore de Falhas (3 Níveis)</span>
          </span>
          <span className="text-[9px] font-bold text-slate-400">Hierarquia Obrigatória</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          {/* Nível 1: Categoria Principal */}
          <div className="space-y-1">
            <label className="block text-[9px] font-black text-slate-600 uppercase tracking-wider">
              1. Categoria Principal:
            </label>
            <select
              value={selectedCategoryName}
              onChange={handleCategoryChange}
              className="w-full bg-white text-slate-900 border border-slate-300 rounded-xl px-2 py-1.5 text-xs font-black focus:ring-2 focus:ring-orange-400 focus:outline-none shadow-2xs cursor-pointer truncate"
            >
              {FAULT_TREE_CATEGORIES.map((cat) => (
                <option key={cat.id} value={cat.name}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Nível 2: Componente / Subconjunto */}
          <div className="space-y-1">
            <label className="block text-[9px] font-black text-slate-600 uppercase tracking-wider">
              2. Componente / Peça:
            </label>
            <select
              value={selectedComponentName}
              onChange={handleComponentChange}
              className="w-full bg-white text-slate-900 border border-slate-300 rounded-xl px-2 py-1.5 text-xs font-bold focus:ring-2 focus:ring-orange-400 focus:outline-none shadow-2xs cursor-pointer truncate"
            >
              {activeComponentList.map((comp) => (
                <option key={comp.id} value={comp.name}>
                  ⚙️ {comp.name}
                </option>
              ))}
            </select>
          </div>

          {/* Nível 3: Defeito / Ação */}
          <div className="space-y-1">
            <label className="block text-[9px] font-black text-slate-600 uppercase tracking-wider">
              3. Defeito / Ação:
            </label>
            <select
              value={isCustomDefect ? '__CUSTOM__' : selectedDefectName}
              onChange={handleDefectChange}
              className="w-full bg-white text-slate-900 border border-slate-300 rounded-xl px-2 py-1.5 text-xs font-bold focus:ring-2 focus:ring-orange-400 focus:outline-none shadow-2xs cursor-pointer truncate"
            >
              {availableDefects.map((def, idx) => (
                <option key={idx} value={def}>
                  🔹 {def}
                </option>
              ))}
              <option value="__CUSTOM__">✍️ Outro Defeito (Digitar...)</option>
            </select>
          </div>
        </div>

        {/* Input para defeito customizado se selecionado */}
        {isCustomDefect && (
          <div className="pt-1">
            <input
              type="text"
              value={customDefectInput}
              onChange={handleCustomDefectInput}
              placeholder="Digite o defeito/ocorrência específico..."
              className="w-full bg-amber-50/80 border border-amber-300 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-2xs"
            />
          </div>
        )}

        {/* Banner de Visualização do Apontamento Hierárquico */}
        <div className="p-2 bg-slate-900 text-white rounded-xl flex items-center gap-1.5 flex-wrap text-[10px] shadow-2xs">
          <span className="font-black text-amber-400 uppercase tracking-wider text-[9px] mr-1 flex items-center gap-1">
            <Sparkles size={11} /> RASTREAMENTO:
          </span>
          <span className="font-extrabold text-slate-200">{selectedCategoryName}</span>
          <ChevronRight size={11} className="text-slate-400" />
          <span className="font-extrabold text-orange-300 bg-orange-950/70 border border-orange-500/30 px-1.5 py-0.5 rounded-md">
            {selectedComponentName}
          </span>
          <ChevronRight size={11} className="text-slate-400" />
          <span className="font-black text-emerald-300 bg-emerald-950/70 border border-emerald-500/30 px-1.5 py-0.5 rounded-md">
            {currentDefectDisplay}
          </span>
        </div>
      </div>

      {/* Explicação / Detalhamento */}
      <div>
        <input
          type="text"
          value={stop.explicacao || ''}
          onChange={(e) => onUpdate(stop.id, 'explicacao', e.target.value)}
          placeholder="Explicação / Detalhamento complementar do problema (opcional)..."
          className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-[11px] font-medium text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-2xs"
        />
      </div>
    </div>
  );
};
