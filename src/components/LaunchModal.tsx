
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { X, Save, Edit2, Package, Layers, Trash2, Clock, Wrench, CalendarX, Camera, Loader2, Search, Plus } from 'lucide-react';
import { ProductionEntry, Shift, Collaborator, Employee } from '../types';
import { extractProductionData } from '../services/aiService';

interface LaunchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (entry: Omit<ProductionEntry, 'id'> & { id?: string }) => void;
  collaborators: Collaborator[];
  employees: Employee[];
  activeMachines: string[];
  availableShifts: Shift[];
  initialData?: ProductionEntry | null;
  dashboardMonth?: string;
}

interface StopItem {
  id: string;
  de: string;
  ate: string;
  motivo: string;
}

const getYesterdayStr = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toLocaleDateString('sv-SE');
};

const formatWeight = (val: number) => {
  const absVal = Math.abs(val);
  if (absVal >= 1000) {
    return (val / 1000).toLocaleString('pt-BR', { minimumFractionDigits: 3, maximumFractionDigits: 3 }).replace(',', '.') + ' T';
  }
  return val.toLocaleString('pt-BR', { maximumFractionDigits: 0 }) + ' Kg';
};

const getDefaultDateForMonth = (dbMonth?: string) => {
  if (!dbMonth) return getYesterdayStr();
  const today = new Date();
  const todayYm = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  
  if (dbMonth === todayYm) {
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    const yesterdayYm = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}`;
    if (yesterdayYm === dbMonth) {
      return yesterday.toLocaleDateString('sv-SE');
    }
    return today.toLocaleDateString('sv-SE');
  } else {
    return `${dbMonth}-01`;
  }
};

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

const calcTotalMinutes = (stops: StopItem[]): number => {
  return stops.reduce((sum, item) => sum + getDiffMinutes(item.de, item.ate), 0);
};

const LaunchModal: React.FC<LaunchModalProps> = ({ isOpen, onClose, onSave, collaborators, employees, activeMachines, availableShifts, initialData, dashboardMonth }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [pendingEntries, setPendingEntries] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [formData, setFormData] = useState({
    date: getYesterdayStr(),
    operator: '',
    machine: '',
    shift: '',
    grossWeight: 0,
    tara: 0,
    netWeight: 0,
    volumes: 0,
    tubetes: 0,
    tubetesEcoB: 0,
    ecoA: 0,
    ecoBP: 0,
    ecoBM: 0,
    borraTotal: 0,
    ecoAMotivo: '',
    ecoBPMotivo: '',
    ecoBMMotivo: '',
    borraTotalMotivo: '',
    manutencaoMin: 0,
    manutencaoMotivo: '',
    processoMin: 0,
    processoMotivo: '',
    outrosMin: 0,
    outrosMotivo: '',
    isMaintenanceEntry: false,
    isNoWorkDay: false,
    noWorkReason: '',
    eremaWeight1: 0,
    eremaWeight2: 0,
    eremaWeight3: 0,
    eremaWeight4: 0,
    recycledUsed: 0,
    recycledBags: 0,
    materialType: 'LC3',
  });

  const [manutencaoStops, setManutencaoStops] = useState<StopItem[]>([]);
  const [processoStops, setProcessoStops] = useState<StopItem[]>([]);
  const [outrosStops, setOutrosStops] = useState<StopItem[]>([]);
  const [materials, setMaterials] = useState<Array<{
    id: string;
    materialType: string;
    volumes: number;
    tubetes: number;
    tubetesEcoB: number;
  }>>([]);
  const [confirmDeleteMatId, setConfirmDeleteMatId] = useState<string | null>(null);

  const handleAddMaterial = () => {
    setMaterials(prev => [
      ...prev,
      {
        id: `mat-${Date.now()}-${Math.random()}`,
        materialType: 'LC3',
        volumes: 0,
        tubetes: 0,
        tubetesEcoB: 0,
      }
    ]);
  };

  const handleUpdateMaterial = (id: string, field: 'materialType' | 'volumes' | 'tubetes' | 'tubetesEcoB', value: any) => {
    setMaterials(prev => prev.map(m => {
      if (m.id === id) {
        const updated = { ...m, [field]: value };
        if (field === 'volumes') {
          updated.tubetes = (Number(value) || 0) * 16;
        }
        return updated;
      }
      return m;
    }));
  };

  const handleRemoveMaterial = (id: string) => {
    setMaterials(prev => prev.filter(m => m.id !== id));
    setConfirmDeleteMatId(null);
  };

  const manutencaoMinCalculado = useMemo(() => calcTotalMinutes(manutencaoStops), [manutencaoStops]);
  const processoMinCalculado = useMemo(() => calcTotalMinutes(processoStops), [processoStops]);
  const outrosMinCalculado = useMemo(() => calcTotalMinutes(outrosStops), [outrosStops]);

  const [opSearchTerm, setOpSearchTerm] = useState('');
  const [isOpDropdownOpen, setIsOpDropdownOpen] = useState(false);

  const filteredOperators = useMemo(() => {
    const operatorMap = new Map<string, { id: string; name: string }>();

    // 1. Adicionar operadores cadastrados no cadastro de colaboradores geral
    if (collaborators && Array.isArray(collaborators)) {
      collaborators.forEach(c => {
        if (c.name && (c.role || '').toLowerCase().includes('operador')) {
          const nameClean = c.name.trim();
          if (nameClean) {
            operatorMap.set(nameClean.toLowerCase(), {
              id: c.id,
              name: nameClean
            });
          }
        }
      });
    }

    // 2. Adicionar funcionários dos slots de máquina ativos (para retrocompatibilidade)
    if (employees && Array.isArray(employees)) {
      employees.forEach(emp => {
        if (emp.name && emp.name !== 'Em Contratação' && (emp.role || '').toLowerCase().includes('operador')) {
          const nameClean = emp.name.trim();
          if (nameClean && !operatorMap.has(nameClean.toLowerCase())) {
            operatorMap.set(nameClean.toLowerCase(), {
              id: emp.id,
              name: nameClean
            });
          }
        }
      });
    }

    // 3. Garantir que o operador atual selecione se já estiver salvo no lançamento
    if (initialData && initialData.operator) {
      const opName = initialData.operator.trim();
      if (opName && !operatorMap.has(opName.toLowerCase())) {
        operatorMap.set(opName.toLowerCase(), {
          id: `initial-op-${Date.now()}`,
          name: opName
        });
      }
    }

    // Identificar operadores da máquina selecionada
    const machineOpNames = new Set<string>();
    if (formData.machine && employees && Array.isArray(employees)) {
      const selectedMachineNorm = formData.machine.toLowerCase().trim();
      employees.forEach(emp => {
        if (emp.name && emp.machine) {
          const empM = emp.machine.toLowerCase().trim();
          const isMatch = empM === selectedMachineNorm || empM.includes(selectedMachineNorm) || selectedMachineNorm.includes(empM);
          if (isMatch) {
            const nameClean = emp.name.trim().toLowerCase();
            if (nameClean && nameClean !== 'em contratação' && nameClean !== 'vaga disponível') {
              machineOpNames.add(nameClean);
            }
          }
        }
      });
    }

    return Array.from(operatorMap.values())
      .map(op => ({
        ...op,
        isMachineOp: machineOpNames.has(op.name.toLowerCase().trim())
      }))
      .sort((a, b) => {
        if (a.isMachineOp && !b.isMachineOp) return -1;
        if (!a.isMachineOp && b.isMachineOp) return 1;
        return a.name.localeCompare(b.name, 'pt-BR');
      });
  }, [collaborators, employees, initialData, formData.machine]);

  const isErema = formData.machine.toLowerCase().includes('erema');

  const parseMotivo = (motivo: string | undefined, min: number): StopItem[] => {
    if (!motivo) return [];
    try {
      if (motivo.startsWith('[') && motivo.endsWith(']')) {
        const parsed = JSON.parse(motivo);
        if (Array.isArray(parsed)) {
          return parsed.map((item, idx) => ({
            id: item.id || `stop-${idx}-${Date.now()}-${Math.random()}`,
            de: item.de || '',
            ate: item.ate || '',
            motivo: item.motivo || ''
          }));
        }
      }
    } catch (e) {
      // continua no fallback
    }
    if (min > 0 || motivo) {
      return [{ id: `stop-legacy-${Date.now()}-${Math.random()}`, de: '', ate: '', motivo: motivo || '' }];
    }
    return [];
  };

  const handleAddStop = (type: 'manutencao' | 'processo' | 'outros') => {
    const newItem: StopItem = {
      id: `stop-${Date.now()}-${Math.random()}`,
      de: '',
      ate: '',
      motivo: ''
    };
    if (type === 'manutencao') {
      setManutencaoStops(prev => [...prev, newItem]);
    } else if (type === 'processo') {
      setProcessoStops(prev => [...prev, newItem]);
    } else {
      setOutrosStops(prev => [...prev, newItem]);
    }
  };

  const handleUpdateStop = (type: 'manutencao' | 'processo' | 'outros', id: string, field: keyof StopItem, value: string) => {
    const updateFn = (prev: StopItem[]) => prev.map(item => item.id === id ? { ...item, [field]: value } : item);
    if (type === 'manutencao') {
      setManutencaoStops(updateFn);
    } else if (type === 'processo') {
      setProcessoStops(updateFn);
    } else {
      setOutrosStops(updateFn);
    }
  };

  const handleRemoveStop = (type: 'manutencao' | 'processo' | 'outros', id: string) => {
    const filterFn = (prev: StopItem[]) => prev.filter(item => item.id !== id);
    if (type === 'manutencao') {
      setManutencaoStops(filterFn);
    } else if (type === 'processo') {
      setProcessoStops(filterFn);
    } else {
      setOutrosStops(filterFn);
    }
  };

  useEffect(() => {
    if (isOpen) {
      const currentEntry = pendingEntries.length > 0 ? pendingEntries[currentIndex] : initialData;
      if (currentEntry) {
        setManutencaoStops(parseMotivo(currentEntry.manutencaoMotivo, currentEntry.manutencaoMin));
        setProcessoStops(parseMotivo(currentEntry.processoMotivo, currentEntry.processoMin));
        setOutrosStops(parseMotivo(currentEntry.outrosMotivo, currentEntry.outrosMin));
        
        const initMats = currentEntry.materials && currentEntry.materials.length > 0 
          ? currentEntry.materials 
          : [{
              id: `mat-init-${Date.now()}-${Math.random()}`,
              materialType: currentEntry.materialType || 'LC3',
              volumes: currentEntry.volumes || 0,
              tubetes: currentEntry.tubetes || 0,
              tubetesEcoB: currentEntry.tubetesEcoB || 0,
            }];
        setMaterials(initMats);
      } else {
        setManutencaoStops([]);
        setProcessoStops([]);
        setOutrosStops([]);
        setMaterials([{
          id: `mat-init-${Date.now()}`,
          materialType: 'LC3',
          volumes: 0,
          tubetes: 0,
          tubetesEcoB: 0,
        }]);
      }
    }
  }, [isOpen, currentIndex, initialData, pendingEntries]);

  useEffect(() => {
    if (isOpen) {
      setPendingEntries([]);
      setCurrentIndex(0);
      if (initialData) {
        setOpSearchTerm(initialData.operator);
        setFormData({
          date: initialData.date,
          operator: initialData.operator,
          machine: initialData.machine,
          shift: initialData.shift,
          grossWeight: initialData.grossWeight,
          tara: initialData.tara,
          netWeight: initialData.netWeight,
          volumes: initialData.volumes,
          tubetes: initialData.tubetes,
          tubetesEcoB: initialData.tubetesEcoB ?? 0,
          ecoA: initialData.ecoA,
          ecoBP: initialData.ecoBP,
          ecoBM: initialData.ecoBM,
          borraTotal: initialData.borraTotal,
          ecoAMotivo: initialData.ecoAMotivo || '',
          ecoBPMotivo: initialData.ecoBPMotivo || '',
          ecoBMMotivo: initialData.ecoBMMotivo || '',
          borraTotalMotivo: initialData.borraTotalMotivo || '',
          manutencaoMin: initialData.manutencaoMin,
          manutencaoMotivo: initialData.manutencaoMotivo || '',
          processoMin: initialData.processoMin,
          processoMotivo: initialData.processoMotivo || '',
          outrosMin: initialData.outrosMin,
          outrosMotivo: initialData.outrosMotivo || '',
          isMaintenanceEntry: initialData.isMaintenanceEntry || false,
          isNoWorkDay: initialData.isNoWorkDay || false,
          noWorkReason: initialData.noWorkReason || '',
          eremaWeight1: initialData.eremaWeight1 ?? 0,
          eremaWeight2: initialData.eremaWeight2 ?? 0,
          eremaWeight3: initialData.eremaWeight3 ?? 0,
          eremaWeight4: initialData.eremaWeight4 ?? 0,
          recycledUsed: initialData.recycledUsed ?? 0,
          recycledBags: initialData.recycledBags ?? (initialData.recycledUsed ? Number((initialData.recycledUsed / 1100).toFixed(2)) : 0),
          materialType: initialData.materialType || 'LC3',
        });
      } else {
        setFormData({
          date: getDefaultDateForMonth(dashboardMonth),
          operator: '',
          machine: activeMachines.length > 0 ? activeMachines[0] : '',
          shift: availableShifts.length > 0 ? availableShifts[0].name : '',
          grossWeight: 0,
          tara: 0,
          netWeight: 0,
          volumes: 0,
          tubetes: 0,
          tubetesEcoB: 0,
          ecoA: 0,
          ecoBP: 0,
          ecoBM: 0,
          borraTotal: 0,
          ecoAMotivo: '',
          ecoBPMotivo: '',
          ecoBMMotivo: '',
          borraTotalMotivo: '',
          manutencaoMin: 0,
          manutencaoMotivo: '',
          processoMin: 0,
          processoMotivo: '',
          outrosMin: 0,
          outrosMotivo: '',
          isMaintenanceEntry: false,
          isNoWorkDay: false,
          noWorkReason: '',
          eremaWeight1: 0,
          eremaWeight2: 0,
          eremaWeight3: 0,
          eremaWeight4: 0,
          recycledUsed: 0,
          recycledBags: 0,
          materialType: 'LC3',
        });
      }
    }
  }, [isOpen, initialData, activeMachines, availableShifts, dashboardMonth]);

  useEffect(() => {
    if (isErema) {
      setFormData(prev => {
        const sum = (prev.isMaintenanceEntry || prev.isNoWorkDay) ? 0 : (
          (Number(prev.eremaWeight1) || 0) +
          (Number(prev.eremaWeight2) || 0) +
          (Number(prev.eremaWeight3) || 0) +
          (Number(prev.eremaWeight4) || 0)
        );
        if (prev.netWeight !== sum) {
          return { ...prev, netWeight: sum };
        }
        return prev;
      });
    } else {
      setFormData(prev => {
        const calculated = (prev.isMaintenanceEntry || prev.isNoWorkDay) ? 0 : Math.max(0, prev.grossWeight - prev.tara);
        if (prev.netWeight !== calculated) {
          return { ...prev, netWeight: calculated };
        }
        return prev;
      });
    }
  }, [
    formData.grossWeight,
    formData.tara,
    formData.eremaWeight1,
    formData.eremaWeight2,
    formData.eremaWeight3,
    formData.eremaWeight4,
    formData.isMaintenanceEntry,
    formData.isNoWorkDay,
    isErema
  ]);

  useEffect(() => {
    if (!isErema && !formData.isNoWorkDay && !formData.isMaintenanceEntry && materials && materials.length > 0) {
      const sumVolumes = materials.reduce((acc, current) => acc + (Number(current.volumes) || 0), 0);
      const sumTubetes = materials.reduce((acc, current) => acc + (Number(current.tubetes) || 0), 0);
      const sumTubetesEcoB = materials.reduce((acc, current) => acc + (Number(current.tubetesEcoB) || 0), 0);
      const uniqueTypes = Array.from(new Set(materials.map(m => m.materialType).filter(Boolean)));
      const primaryType = uniqueTypes.join(', ') || 'LC3';

      setFormData(prev => {
        if (
          prev.volumes !== sumVolumes ||
          prev.tubetes !== sumTubetes ||
          prev.tubetesEcoB !== sumTubetesEcoB ||
          prev.materialType !== primaryType
        ) {
          return {
            ...prev,
            volumes: sumVolumes,
            tubetes: sumTubetes,
            tubetesEcoB: sumTubetesEcoB,
            materialType: primaryType
          };
        }
        return prev;
      });
    }
  }, [materials, isErema, formData.isNoWorkDay, formData.isMaintenanceEntry]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.operator && !formData.isNoWorkDay) {
      alert('Por favor, selecione um operador.');
      return;
    }
    if (!formData.machine) {
      alert('Nenhuma máquina ativa selecionada.');
      return;
    }
    if (!formData.shift) {
      alert('Por favor, selecione um turno.');
      return;
    }
    
    const isSpecialEntry = formData.isMaintenanceEntry || formData.isNoWorkDay;
    const compileEntry = (data: typeof formData) => {
      const isCurrent = data === formData;
      const finalManutencaoMin = isCurrent ? manutencaoMinCalculado : data.manutencaoMin;
      const finalProcessoMin = isCurrent ? processoMinCalculado : data.processoMin;
      const finalOutrosMin = isCurrent ? outrosMinCalculado : data.outrosMin;

      const finalManutencaoMotivo = isCurrent ? (manutencaoStops.length > 0 ? JSON.stringify(manutencaoStops) : '') : data.manutencaoMotivo;
      const finalProcessoMotivo = isCurrent ? (processoStops.length > 0 ? JSON.stringify(processoStops) : '') : data.processoMotivo;
      const finalOutrosMotivo = isCurrent ? (outrosStops.length > 0 ? JSON.stringify(outrosStops) : '') : data.outrosMotivo;

      const baseWithStops = {
        ...data,
        manutencaoMin: finalManutencaoMin,
        processoMin: finalProcessoMin,
        outrosMin: finalOutrosMin,
        manutencaoMotivo: finalManutencaoMotivo,
        processoMotivo: finalProcessoMotivo,
        outrosMotivo: finalOutrosMotivo,
        materials: isCurrent ? materials : (data as any).materials || [],
      };

      return isSpecialEntry ? {
        ...baseWithStops,
        grossWeight: 0,
        tara: 0,
        netWeight: 0,
        volumes: 0,
        tubetes: 0,
        tubetesEcoB: 0,
        ecoA: 0,
        ecoBP: 0,
        ecoBM: 0,
        borraTotal: 0,
        ecoAMotivo: '',
        ecoBPMotivo: '',
        ecoBMMotivo: '',
        borraTotalMotivo: '',
        recycledUsed: 0,
        recycledBags: 0,
        manutencaoMin: baseWithStops.isNoWorkDay ? 0 : baseWithStops.manutencaoMin,
        processoMin: baseWithStops.isNoWorkDay ? 0 : (baseWithStops.isMaintenanceEntry ? 0 : baseWithStops.processoMin),
        outrosMin: baseWithStops.isNoWorkDay ? 0 : (baseWithStops.isMaintenanceEntry ? 0 : baseWithStops.outrosMin),
      } : (isErema ? {
        ...baseWithStops,
        grossWeight: 0,
        tara: 0,
        ecoA: 0,
        ecoBP: 0,
        ecoBM: 0,
        borraTotal: 0,
        ecoAMotivo: '',
        ecoBPMotivo: '',
        ecoBMMotivo: '',
        borraTotalMotivo: '',
        recycledUsed: 0,
        recycledBags: 0,
        volumes: 0,
        tubetes: 0,
        tubetesEcoB: 0
      } : baseWithStops);
    };

    if (pendingEntries.length > 0) {
      pendingEntries.forEach((entry, idx) => {
        const targetData = idx === currentIndex ? formData : entry;
        onSave(compileEntry(targetData));
      });
    } else {
      onSave(initialData ? { ...compileEntry(formData), id: initialData.id } : compileEntry(formData));
    }
    onClose();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    let val: any;
    
    if (name === 'recycledBags') {
      const bagsVal = parseFloat(value) || 0;
      setFormData(prev => {
        const next = {
          ...prev,
          recycledBags: bagsVal,
          recycledUsed: Number((bagsVal * 1100).toFixed(0))
        };
        if (pendingEntries.length > 0) {
          const newPending = [...pendingEntries];
          newPending[currentIndex] = next;
          setPendingEntries(newPending);
        }
        return next;
      });
      return;
    }

    if (name === 'recycledUsed') {
      const weightVal = parseFloat(value) || 0;
      setFormData(prev => {
        const next = {
          ...prev,
          recycledUsed: weightVal,
          recycledBags: Number((weightVal / 1100).toFixed(2))
        };
        if (pendingEntries.length > 0) {
          const newPending = [...pendingEntries];
          newPending[currentIndex] = next;
          setPendingEntries(newPending);
        }
        return next;
      });
      return;
    }

    if (name === 'volumes') {
      const volVal = parseFloat(value) || 0;
      setFormData(prev => {
        const next = {
          ...prev,
          volumes: volVal,
          tubetes: volVal * 16
        };
        if (pendingEntries.length > 0) {
          const newPending = [...pendingEntries];
          newPending[currentIndex] = next;
          setPendingEntries(newPending);
        }
        return next;
      });
      return;
    }

    if (type === 'checkbox') {
      val = (e.target as HTMLInputElement).checked;
      
      if (name === 'isNoWorkDay' && val) {
        setFormData(prev => ({ ...prev, [name]: val, isMaintenanceEntry: false }));
        return;
      }
      if (name === 'isMaintenanceEntry' && val) {
        setFormData(prev => ({ ...prev, [name]: val, isNoWorkDay: false }));
        return;
      }
    } else {
      val = type === 'number' ? parseFloat(value) || 0 : value;
    }
    
    setFormData(prev => {
      const next = { ...prev, [name]: val };
      if (pendingEntries.length > 0) {
        const newPending = [...pendingEntries];
        newPending[currentIndex] = next;
        setPendingEntries(newPending);
      }
      return next;
    });
  };

  const handleScanAI = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsScanning(true);
    try {
      const newEntries: any[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        const extracted = await extractProductionData(base64);
        
        const entryData = {
          date: extracted.date || getYesterdayStr(),
          operator: extracted.operator || '',
          machine: extracted.machine ? (activeMachines.find(m => m.toLowerCase().includes(extracted.machine!.toLowerCase())) || extracted.machine) : (activeMachines.length > 0 ? activeMachines[0] : ''),
          shift: extracted.shift || (availableShifts.length > 0 ? availableShifts[0].name : ''),
          grossWeight: extracted.grossWeight ?? 0,
          tara: extracted.tara ?? 0,
          netWeight: extracted.netWeight ?? 0,
          volumes: extracted.volumes ?? 0,
          tubetes: extracted.tubetes ?? 0,
          ecoA: extracted.ecoA ?? 0,
          ecoBP: extracted.ecoBP ?? 0,
          ecoBM: extracted.ecoBM ?? 0,
          borraTotal: extracted.borraTotal ?? 0,
          manutencaoMin: extracted.manutencaoMin ?? 0,
          manutencaoMotivo: extracted.manutencaoMotivo || '',
          processoMin: extracted.processoMin ?? 0,
          processoMotivo: extracted.processoMotivo || '',
          outrosMin: extracted.outrosMin ?? 0,
          outrosMotivo: extracted.outrosMotivo || '',
          isMaintenanceEntry: false,
          isNoWorkDay: false,
          noWorkReason: '',
          eremaWeight1: 0,
          eremaWeight2: 0,
          eremaWeight3: 0,
          eremaWeight4: 0,
        };
        newEntries.push(entryData);
      }

      if (newEntries.length > 0) {
        setPendingEntries(newEntries);
        setCurrentIndex(0);
        setFormData(newEntries[0]);
      }
    } catch (error) {
      console.error("Erro ao escanear com IA:", error);
      alert("Falha ao extrair dados da imagem. Verifique a nitidez da foto e tente novamente.");
    } finally {
      setIsScanning(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (cameraInputRef.current) cameraInputRef.current.value = '';
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      const nextIndex = currentIndex - 1;
      setCurrentIndex(nextIndex);
      setFormData(pendingEntries[nextIndex]);
    }
  };

  const handleNext = () => {
    if (currentIndex < pendingEntries.length - 1) {
      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);
      setFormData(pendingEntries[nextIndex]);
    }
  };

  const handleRemoveEntry = () => {
    if (pendingEntries.length <= 1) {
      setPendingEntries([]);
      return;
    }
    const newPending = pendingEntries.filter((_, i) => i !== currentIndex);
    const nextIndex = Math.min(currentIndex, newPending.length - 1);
    setPendingEntries(newPending);
    setCurrentIndex(nextIndex);
    setFormData(newPending[nextIndex]);
  };

  const totalParadas = formData.manutencaoMin + formData.processoMin + formData.outrosMin;
  const isHiddenProduction = formData.isMaintenanceEntry || formData.isNoWorkDay;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl relative overflow-hidden my-auto">
        <div className="bg-[#1e293b] text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {initialData ? <Edit2 size={20} /> : <Save size={20} />}
            <h2 className="text-lg font-semibold tracking-tight uppercase">{initialData ? 'Editar Lançamento' : 'Novo Lançamento'}</h2>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex bg-blue-500 rounded-lg overflow-hidden shadow-lg shadow-blue-500/20">
              <button 
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isScanning}
                className="flex items-center gap-1.5 hover:bg-blue-600 disabled:bg-blue-400 text-white px-2.5 py-1.5 text-[9px] font-black uppercase border-r border-blue-400 transition-all"
                title="Carregar Imagem"
              >
                {isScanning ? <Loader2 size={12} className="animate-spin" /> : <Package size={12} />}
                {isScanning ? '...' : 'Imagem'}
              </button>
              <button 
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                disabled={isScanning}
                className="flex items-center gap-1.5 hover:bg-blue-600 disabled:bg-blue-400 text-white px-2.5 py-1.5 text-[9px] font-black uppercase transition-all"
                title="Usar Câmera"
              >
                {isScanning ? <Loader2 size={12} className="animate-spin" /> : <Camera size={12} />}
                {isScanning ? '...' : 'Câmera'}
              </button>
            </div>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleScanAI} 
              accept="image/*" 
              multiple
              className="hidden" 
            />
            <input 
              type="file" 
              ref={cameraInputRef} 
              onChange={handleScanAI} 
              accept="image/*" 
              capture="environment"
              className="hidden" 
            />
            <button onClick={onClose} className="hover:bg-white/10 p-1 rounded-full transition-colors">
              <X size={24} />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-5 max-h-[80vh] overflow-y-auto custom-scrollbar relative">
          {pendingEntries.length > 1 && (
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <button type="button" onClick={handlePrev} disabled={currentIndex === 0} className="p-1.5 bg-white rounded-lg border border-blue-200 text-blue-600 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-blue-50 transition-all">
                  <Clock size={16} className="rotate-180" />
                </button>
                <div className="text-center">
                  <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Documento</p>
                  <p className="text-sm font-black text-blue-700">{currentIndex + 1} de {pendingEntries.length}</p>
                </div>
                <button type="button" onClick={handleNext} disabled={currentIndex === pendingEntries.length - 1} className="p-1.5 bg-white rounded-lg border border-blue-200 text-blue-600 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-blue-50 transition-all">
                  <Clock size={16} />
                </button>
              </div>
              <button type="button" onClick={handleRemoveEntry} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-all" title="Remover este documento">
                <Trash2 size={18} />
              </button>
            </div>
          )}

          {isScanning && (
            <div className="absolute inset-0 z-50 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center animate-in fade-in duration-300">
              <div className="relative">
                <div className="w-24 h-24 border-4 border-blue-100 border-t-blue-500 rounded-full animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center animate-pulse">
                    <Camera className="text-white" size={32} />
                  </div>
                </div>
              </div>
              <div className="mt-6 text-center">
                <h3 className="text-lg font-black text-slate-800 uppercase tracking-tighter">Processando Documento</h3>
                <p className="text-sm font-bold text-blue-600 animate-bounce mt-1">A IA está extraindo as informações...</p>
                <div className="mt-4 flex gap-1 justify-center">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" />
                </div>
              </div>
            </div>
          )}
          
          <div className="grid grid-cols-2 gap-3">
            <div className={`p-3 rounded-xl flex items-center justify-between transition-colors border ${formData.isMaintenanceEntry ? 'bg-orange-50 border-orange-200' : 'bg-slate-50 border-slate-200'}`}>
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${formData.isMaintenanceEntry ? 'bg-orange-100 text-orange-600' : 'bg-slate-200 text-slate-500'}`}>
                  <Wrench size={16} />
                </div>
                <div><h3 className="text-[9px] font-black text-slate-800 uppercase">Manutenção</h3></div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" name="isMaintenanceEntry" checked={formData.isMaintenanceEntry} onChange={handleChange} className="sr-only peer" />
                <div className="w-8 h-4 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-orange-600"></div>
              </label>
            </div>

            <div className={`p-3 rounded-xl flex items-center justify-between transition-colors border ${formData.isNoWorkDay ? 'bg-red-50 border-red-200' : 'bg-slate-50 border-slate-200'}`}>
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${formData.isNoWorkDay ? 'bg-red-100 text-red-600' : 'bg-slate-200 text-slate-500'}`}>
                  <CalendarX size={16} />
                </div>
                <div><h3 className="text-[9px] font-black text-slate-800 uppercase">Parado</h3></div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" name="isNoWorkDay" checked={formData.isNoWorkDay} onChange={handleChange} className="sr-only peer" />
                <div className="w-8 h-4 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-red-600"></div>
              </label>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className={formData.isNoWorkDay ? 'col-span-2' : ''}>
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Data</label>
              <input type="date" name="date" value={formData.date} onChange={handleChange} className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
            </div>
            {!formData.isNoWorkDay && (
              <div className="relative">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Operador</label>
                <select 
                  name="operator"
                  value={formData.operator} 
                  onChange={handleChange}
                  className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20 appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2020%2020%22%3E%3Cpath%20stroke%3D%22%236b7280%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%221.5%22%20d%3D%22m6%208%204%204%204-4%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1.25rem_1.25rem] bg-right-[0.5rem]_center bg-no-repeat"
                >
                  <option value="" disabled>Selecionar Operador</option>
                  {filteredOperators.map(emp => (
                    <option key={emp.id} value={emp.name}>
                      {emp.name}{emp.isMachineOp ? ' (Operador desta Máquina)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Máquina</label>
              <select 
                name="machine" 
                value={formData.machine} 
                onChange={handleChange} 
                className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20 appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2020%2020%22%3E%3Cpath%20stroke%3D%22%236b7280%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%221.5%22%20d%3D%22m6%208%204%204%204-4%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1.25rem_1.25rem] bg-right-[0.5rem]_center bg-no-repeat"
              >
                <option value="" disabled>Selecionar Máquina</option>
                <option value="Cast 1">Cast 1</option>
                <option value="Cast 2">Cast 2</option>
                <option value="Erema">Erema</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Turno</label>
              <select 
                name="shift" 
                value={formData.shift} 
                onChange={handleChange} 
                className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20 appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2020%2020%22%3E%3Cpath%20stroke%3D%22%236b7280%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%221.5%22%20d%3D%22m6%208%204%204%204-4%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1.25rem_1.25rem] bg-right-[0.5rem]_center bg-no-repeat"
              >
                <option value="" disabled>Selecionar Turno</option>
                <option value="Diurno">Diurno</option>
                <option value="Noturno">Noturno</option>
              </select>
            </div>
          </div>



          {formData.isNoWorkDay && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-2xl space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="flex items-center gap-2 text-red-700 font-black text-[10px] uppercase tracking-widest"><CalendarX size={14} /> Motivo da Parada Total</div>
              <div>
                <label className="text-[9px] font-black text-red-500 uppercase">Descrição do Motivo</label>
                <input 
                  type="text" 
                  name="noWorkReason" 
                  value={formData.noWorkReason} 
                  onChange={handleChange} 
                  placeholder="Ex: Falta de energia, feriado, falta de pessoal..." 
                  className="w-full mt-1 bg-white border border-red-200 rounded-xl px-3 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-red-500/20" 
                />
              </div>
            </div>
          )}

          {!isHiddenProduction && (
            <div className="space-y-4">
              {isErema ? (
                <div className="p-4 bg-emerald-50/50 border border-emerald-100 rounded-2xl space-y-4 animate-in fade-in duration-300">
                  <div className="flex items-center gap-2 text-emerald-700 font-black text-[10px] uppercase tracking-widest"><Package size={14} /> Produção Reciclada (Peso Líquido)</div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[9px] font-black text-emerald-500 uppercase">Lançamento 1 (kg)</label>
                      <input 
                        type="number" 
                        name="eremaWeight1" 
                        value={formData.eremaWeight1 || ''} 
                        onChange={handleChange} 
                        className="w-full mt-1 bg-white border border-emerald-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500" 
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-black text-emerald-500 uppercase">Lançamento 2 (kg)</label>
                      <input 
                        type="number" 
                        name="eremaWeight2" 
                        value={formData.eremaWeight2 || ''} 
                        onChange={handleChange} 
                        className="w-full mt-1 bg-white border border-emerald-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500" 
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-black text-emerald-500 uppercase">Lançamento 3 (kg)</label>
                      <input 
                        type="number" 
                        name="eremaWeight3" 
                        value={formData.eremaWeight3 || ''} 
                        onChange={handleChange} 
                        className="w-full mt-1 bg-white border border-emerald-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500" 
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-black text-emerald-500 uppercase">Lançamento 4 (kg)</label>
                      <input 
                        type="number" 
                        name="eremaWeight4" 
                        value={formData.eremaWeight4 || ''} 
                        onChange={handleChange} 
                        className="w-full mt-1 bg-white border border-emerald-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500" 
                        placeholder="0"
                      />
                    </div>
                  </div>

                  <div className="bg-white p-3 rounded-xl border border-emerald-200 flex justify-between items-center shadow-sm">
                    <span className="text-[10px] font-black text-emerald-500 uppercase">Peso Líquido Total</span>
                    <span className="text-xl font-black text-emerald-600">{formatWeight(formData.netWeight)}</span>
                  </div>
                </div>
              ) : (
                <>
                  <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-2xl space-y-4">
                    <div className="flex items-center gap-2 text-blue-700 font-black text-[10px] uppercase tracking-widest"><Package size={14} /> Produção Líquida</div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[9px] font-black text-blue-500 uppercase">T. Bruto (kg)</label>
                        <input type="number" name="grossWeight" value={formData.grossWeight || ''} onChange={handleChange} className="w-full mt-1 bg-white border border-blue-200 rounded-xl px-3 py-2 text-sm font-bold" />
                      </div>
                      <div>
                        <label className="text-[9px] font-black text-blue-500 uppercase">Tara (kg)</label>
                        <input type="number" name="tara" value={formData.tara || ''} onChange={handleChange} className="w-full mt-1 bg-white border border-blue-200 rounded-xl px-3 py-2 text-sm font-bold" />
                      </div>
                    </div>
                    
                    <div className="border-t border-dashed border-blue-100 pt-3 space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-black text-blue-700 uppercase">Materiais Produzidos ({materials.length})</span>
                        <button
                          type="button"
                          onClick={handleAddMaterial}
                          className="inline-flex items-center gap-1 text-[9px] font-black text-blue-600 hover:text-blue-700 uppercase bg-blue-100 px-2.5 py-1 rounded-lg transition-all"
                        >
                          <Plus size={10} /> Add Material
                        </button>
                      </div>

                      {materials.map((item, idx) => {
                        const showDeleteConfirm = confirmDeleteMatId === item.id;
                        return (
                          <div key={item.id} className="p-3 bg-white border border-blue-100 rounded-xl space-y-2 relative shadow-sm">
                            <div className="flex justify-between items-center border-b border-dashed border-blue-50 pb-1.5">
                              <span className="text-[9px] font-black text-blue-500 uppercase">Item #{idx + 1}</span>
                              {materials.length > 1 && (
                                <div className="flex items-center gap-1">
                                  {showDeleteConfirm ? (
                                    <div className="flex items-center gap-1 animate-in fade-in zoom-in-95 duration-155">
                                      <span className="text-[8px] font-bold text-red-500 mr-1 uppercase">Excluir?</span>
                                      <button
                                        type="button"
                                        onClick={() => handleRemoveMaterial(item.id)}
                                        className="text-[8px] font-black bg-red-100 text-red-700 hover:bg-red-200 px-1.5 py-0.5 rounded cursor-pointer"
                                      >
                                        Sim
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setConfirmDeleteMatId(null)}
                                        className="text-[8px] font-black bg-slate-100 text-slate-700 hover:bg-slate-200 px-1.5 py-0.5 rounded cursor-pointer"
                                      >
                                        Não
                                      </button>
                                    </div>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => setConfirmDeleteMatId(item.id)}
                                      className="text-slate-400 hover:text-red-500 p-0.5 transition-colors cursor-pointer"
                                      title="Excluir Material"
                                    >
                                      <Trash2 size={12} />
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>

                            <div className="grid grid-cols-12 gap-2">
                              <div className="col-span-12 sm:col-span-3">
                                <label className="text-[9px] font-black text-slate-400 uppercase">Material</label>
                                <select
                                  value={item.materialType}
                                  onChange={(e) => handleUpdateMaterial(item.id, 'materialType', e.target.value)}
                                  className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold"
                                >
                                  <option value="LC3">LC3</option>
                                  <option value="LC2">LC2</option>
                                  <option value="ATX">ATX</option>
                                  <option value="ATX Plus">ATX Plus</option>
                                </select>
                              </div>

                              <div className="col-span-4 sm:col-span-3">
                                <label className="text-[9px] font-black text-slate-400 uppercase font-bold text-slate-700">Volumes</label>
                                <input
                                  type="number"
                                  value={item.volumes || ''}
                                  onChange={(e) => handleUpdateMaterial(item.id, 'volumes', parseFloat(e.target.value) || 0)}
                                  placeholder="0"
                                  className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold text-center"
                                />
                              </div>

                              <div className="col-span-4 sm:col-span-3">
                                <label className="text-[9px] font-black text-slate-400 uppercase font-bold text-slate-700">Tubetes Usados</label>
                                <input
                                  type="number"
                                  value={item.tubetes || ''}
                                  onChange={(e) => handleUpdateMaterial(item.id, 'tubetes', parseFloat(e.target.value) || 0)}
                                  placeholder="0"
                                  className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold text-center"
                                />
                              </div>

                              <div className="col-span-4 sm:col-span-3">
                                <label className="text-[9px] font-black text-slate-400 uppercase font-bold text-slate-700">Tubetes Eco B</label>
                                <input
                                  type="number"
                                  value={item.tubetesEcoB || ''}
                                  onChange={(e) => handleUpdateMaterial(item.id, 'tubetesEcoB', parseFloat(e.target.value) || 0)}
                                  placeholder="0"
                                  className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold text-center"
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="bg-white p-3 rounded-xl border border-blue-200 flex justify-between items-center">
                      <span className="text-[10px] font-black text-blue-400 uppercase">Peso Líquido Total</span>
                      <span className="text-xl font-black text-blue-600">{formatWeight(formData.netWeight)}</span>
                    </div>
                  </div>

                  {/* Card Eco A (Sede Curitiba) */}
                  <div className="p-4 bg-indigo-50/50 border border-indigo-100 rounded-2xl space-y-3">
                    <div className="flex items-center gap-2 text-indigo-700 font-black text-[10px] uppercase tracking-widest">
                      <Layers size={14} className="text-indigo-500" /> Envio Eco A (Sede Curitiba) (Kg)
                    </div>
                    <div className="bg-white p-2.5 rounded-xl border border-indigo-200/60 space-y-2">
                      <div className="flex items-center justify-between gap-3">
                        <label className="text-[10px] font-black text-indigo-600 uppercase">Eco A</label>
                        <input type="number" name="ecoA" value={formData.ecoA || ''} onChange={handleChange} className="w-24 bg-slate-50 border border-indigo-200 rounded-lg px-2 py-1 text-xs font-bold text-right" placeholder="0" />
                      </div>
                      {formData.ecoA > 0 && (
                        <div className="pt-1.5 border-t border-dashed border-slate-150">
                          <input type="text" name="ecoAMotivo" value={formData.ecoAMotivo || ''} onChange={handleChange} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-[11px] font-medium placeholder-slate-300 focus:bg-white" placeholder="Justificar perda de Eco A..." />
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="p-4 bg-orange-50/50 border border-orange-100 rounded-2xl space-y-3">
                    <div className="flex items-center gap-2 text-orange-700 font-black text-[10px] uppercase tracking-widest"><Layers size={14} /> Reciclagem (Kg)</div>
                    <div className="space-y-2">
                      {/* Eco B (P) */}
                      <div className="bg-white p-2.5 rounded-xl border border-orange-200/60 space-y-2">
                        <div className="flex items-center justify-between gap-3">
                          <label className="text-[10px] font-black text-orange-600 uppercase">Eco B (P)</label>
                          <input type="number" name="ecoBP" value={formData.ecoBP || ''} onChange={handleChange} className="w-24 bg-slate-50 border border-orange-200 rounded-lg px-2 py-1 text-xs font-bold text-right" placeholder="0" />
                        </div>
                        {formData.ecoBP > 0 && (
                          <div className="pt-1.5 border-t border-dashed border-slate-150">
                            <input type="text" name="ecoBPMotivo" value={formData.ecoBPMotivo || ''} onChange={handleChange} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-[11px] font-medium placeholder-slate-400 focus:bg-white" placeholder="Justificar perda de Eco B(P)..." />
                          </div>
                        )}
                      </div>

                      {/* Eco B (M) */}
                      <div className="bg-white p-2.5 rounded-xl border border-orange-200/60 space-y-2">
                        <div className="flex items-center justify-between gap-3">
                          <label className="text-[10px] font-black text-orange-600 uppercase">Eco B (M)</label>
                          <input type="number" name="ecoBM" value={formData.ecoBM || ''} onChange={handleChange} className="w-24 bg-slate-50 border border-orange-200 rounded-lg px-2 py-1 text-xs font-bold text-right" placeholder="0" />
                        </div>
                        {formData.ecoBM > 0 && (
                          <div className="pt-1.5 border-t border-dashed border-slate-150">
                            <input type="text" name="ecoBMMotivo" value={formData.ecoBMMotivo || ''} onChange={handleChange} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-[11px] font-medium placeholder-slate-400 focus:bg-white" placeholder="Justificar perda de Eco B(M)..." />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-red-50/50 border border-red-100 rounded-2xl space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <label className="text-[10px] font-black text-red-600 uppercase tracking-widest block">🗑️ Borra Total (Kg)</label>
                      <input type="number" name="borraTotal" value={formData.borraTotal || ''} onChange={handleChange} className="w-24 bg-white border border-red-200 rounded-lg px-2 py-1 text-xs font-black text-red-600 text-right" placeholder="0" />
                    </div>
                    {formData.borraTotal > 0 && (
                      <div className="pt-1.5 border-t border-dashed border-red-150">
                        <input type="text" name="borraTotalMotivo" value={formData.borraTotalMotivo || ''} onChange={handleChange} className="w-full bg-white/60 border border-red-200 rounded-lg px-2.5 py-1 text-[11px] font-medium placeholder-red-400 focus:bg-white text-red-700" placeholder="Justificar perda de Borra..." />
                      </div>
                    )}
                  </div>

                  <div className="p-4 bg-emerald-50/50 border border-emerald-100 rounded-3xl space-y-3">
                    <div>
                      <label className="text-[10px] font-black text-emerald-600 uppercase tracking-widest block mb-1">♻️ Saída de Reciclado (Reutilização no Cast)</label>
                      <span className="text-[9px] text-slate-500 block leading-tight">Cada volume (Bag) de pellet Erema reintroduzido no Cast possui peso padrão de <strong>{formatWeight(1100)}</strong>.</span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pb-1">
                      <div>
                        <label className="text-[9px] font-black text-emerald-500 uppercase">Quantidade (Bags)</label>
                        <input 
                          type="number" 
                          step="any"
                          name="recycledBags" 
                          value={formData.recycledBags || ''} 
                          onChange={handleChange} 
                          placeholder="Ex: 1" 
                          className="w-full mt-1 bg-white border border-emerald-200 rounded-xl px-3 py-2 text-sm font-black text-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/15 focus:border-emerald-500" 
                        />
                      </div>
                      <div>
                        <label className="text-[9px] font-black text-emerald-500 uppercase">Peso Abatido (Kg)</label>
                        <input 
                          type="number" 
                          name="recycledUsed" 
                          value={formData.recycledUsed || ''} 
                          onChange={handleChange} 
                          placeholder="Ex: 1100" 
                          className="w-full mt-1 bg-white border border-emerald-200 rounded-xl px-3 py-2 text-sm font-black text-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/15 focus:border-emerald-500" 
                        />
                      </div>
                    </div>

                    {formData.recycledBags > 0 && (
                      <div className="bg-emerald-50 text-[10px] text-emerald-700 font-extrabold p-2.5 rounded-xl border border-emerald-150 flex justify-between items-center transition-all animate-none">
                        <span>VOLUME REGISTRADO:</span>
                        <span>{formData.recycledBags} {formData.recycledBags === 1 ? 'BAG' : 'BAGS'} ({formatWeight(formData.recycledUsed)})</span>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {!formData.isNoWorkDay && (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-3xl space-y-4 shadow-inner">
              <div className="flex items-center gap-2 text-slate-700 font-black text-[10px] uppercase tracking-widest border-b border-slate-200 pb-2">
                <Clock size={14} /> Tempos de Parada
              </div>
              <div className="space-y-4">
                
                {/* Seção Manutenção */}
                <div className="p-3 bg-white border border-slate-100 rounded-2xl space-y-3 shadow-sm">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                    <div className="flex items-center gap-1.5 text-orange-600 font-black text-[10px] uppercase tracking-widest">
                      <Wrench size={13} /> Manutenção
                    </div>
                    <button
                      type="button"
                      onClick={() => handleAddStop('manutencao')}
                      className="inline-flex items-center gap-1 text-[9px] font-black text-blue-600 hover:text-blue-700 uppercase bg-blue-50 px-2.5 py-1 rounded-lg transition-all"
                    >
                      <Plus size={10} /> Add Horário
                    </button>
                  </div>
                  
                  {manutencaoStops.length === 0 ? (
                    <p className="text-[10px] font-bold text-slate-400 italic text-center py-2">Nenhuma parada de manutenção registrada</p>
                  ) : (
                    <div className="space-y-2">
                      {manutencaoStops.map((stop) => {
                        const min = getDiffMinutes(stop.de, stop.ate);
                        return (
                          <div key={stop.id} className="grid grid-cols-12 gap-1.5 items-center">
                            <div className="col-span-5 flex items-center gap-1">
                              <input
                                type="time"
                                value={stop.de}
                                onChange={(e) => handleUpdateStop('manutencao', stop.id, 'de', e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold text-center focus:outline-none focus:ring-1 focus:ring-blue-500"
                              />
                              <span className="text-[10px] font-black text-slate-400">às</span>
                              <input
                                type="time"
                                value={stop.ate}
                                onChange={(e) => handleUpdateStop('manutencao', stop.id, 'ate', e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold text-center focus:outline-none focus:ring-1 focus:ring-blue-500"
                              />
                            </div>
                            <div className="col-span-5">
                              <input
                                type="text"
                                value={stop.motivo}
                                onChange={(e) => handleUpdateStop('manutencao', stop.id, 'motivo', e.target.value)}
                                placeholder="Motivo da parada..."
                                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-[11px] font-medium focus:outline-none focus:ring-1 focus:ring-blue-500"
                              />
                            </div>
                            <div className="col-span-2 flex items-center justify-between pl-1">
                              <span className="text-[9px] font-black text-slate-500">{min > 0 ? `${min}m` : '0m'}</span>
                              <button
                                type="button"
                                onClick={() => handleRemoveStop('manutencao', stop.id)}
                                className="p-1 text-red-500 hover:bg-red-50 rounded-md transition-colors"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  <div className="flex justify-between items-center pt-2 border-t border-slate-50 px-1 text-[9px] font-black text-slate-400 uppercase">
                    <span>Subtotal Manutenção</span>
                    <span className="text-slate-700 font-bold">{manutencaoMinCalculado} min</span>
                  </div>
                </div>

                {!formData.isMaintenanceEntry && (
                  <>
                    {/* Seção Processo */}
                    <div className="p-3 bg-white border border-slate-100 rounded-2xl space-y-3 shadow-sm">
                      <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                        <div className="flex items-center gap-1.5 text-blue-600 font-black text-[10px] uppercase tracking-widest">
                          <Layers size={13} /> Processo
                        </div>
                        <button
                          type="button"
                          onClick={() => handleAddStop('processo')}
                          className="inline-flex items-center gap-1 text-[9px] font-black text-blue-600 hover:text-blue-700 uppercase bg-blue-50 px-2.5 py-1 rounded-lg transition-all"
                        >
                          <Plus size={10} /> Add Horário
                        </button>
                      </div>
                      
                      {processoStops.length === 0 ? (
                        <p className="text-[10px] font-bold text-slate-400 italic text-center py-2">Nenhuma parada de processo registrada</p>
                      ) : (
                        <div className="space-y-2">
                          {processoStops.map((stop) => {
                            const min = getDiffMinutes(stop.de, stop.ate);
                            return (
                              <div key={stop.id} className="grid grid-cols-12 gap-1.5 items-center">
                                <div className="col-span-5 flex items-center gap-1">
                                  <input
                                    type="time"
                                    value={stop.de}
                                    onChange={(e) => handleUpdateStop('processo', stop.id, 'de', e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold text-center focus:outline-none focus:ring-1 focus:ring-blue-500"
                                  />
                                  <span className="text-[10px] font-black text-slate-400">às</span>
                                  <input
                                    type="time"
                                    value={stop.ate}
                                    onChange={(e) => handleUpdateStop('processo', stop.id, 'ate', e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold text-center focus:outline-none focus:ring-1 focus:ring-blue-500"
                                  />
                                </div>
                                <div className="col-span-5">
                                  <input
                                    type="text"
                                    value={stop.motivo}
                                    onChange={(e) => handleUpdateStop('processo', stop.id, 'motivo', e.target.value)}
                                    placeholder="Motivo da parada..."
                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-[11px] font-medium focus:outline-none focus:ring-1 focus:ring-blue-500"
                                  />
                                </div>
                                <div className="col-span-2 flex items-center justify-between pl-1">
                                  <span className="text-[9px] font-black text-slate-500">{min > 0 ? `${min}m` : '0m'}</span>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveStop('processo', stop.id)}
                                    className="p-1 text-red-500 hover:bg-red-50 rounded-md transition-colors"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                      <div className="flex justify-between items-center pt-2 border-t border-slate-50 px-1 text-[9px] font-black text-slate-400 uppercase">
                        <span>Subtotal Processo</span>
                        <span className="text-slate-700 font-bold">{processoMinCalculado} min</span>
                      </div>
                    </div>

                    {/* Seção Outros */}
                    <div className="p-3 bg-white border border-slate-100 rounded-2xl space-y-3 shadow-sm">
                      <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                        <div className="flex items-center gap-1.5 text-slate-600 font-black text-[10px] uppercase tracking-widest">
                          <Package size={13} /> Outros
                        </div>
                        <button
                          type="button"
                          onClick={() => handleAddStop('outros')}
                          className="inline-flex items-center gap-1 text-[9px] font-black text-blue-600 hover:text-blue-700 uppercase bg-blue-50 px-2.5 py-1 rounded-lg transition-all"
                        >
                          <Plus size={10} /> Add Horário
                        </button>
                      </div>
                      
                      {outrosStops.length === 0 ? (
                        <p className="text-[10px] font-bold text-slate-400 italic text-center py-2">Nenhuma outra parada registrada</p>
                      ) : (
                        <div className="space-y-2">
                          {outrosStops.map((stop) => {
                            const min = getDiffMinutes(stop.de, stop.ate);
                            return (
                              <div key={stop.id} className="grid grid-cols-12 gap-1.5 items-center">
                                <div className="col-span-5 flex items-center gap-1">
                                  <input
                                    type="time"
                                    value={stop.de}
                                    onChange={(e) => handleUpdateStop('outros', stop.id, 'de', e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold text-center focus:outline-none focus:ring-1 focus:ring-blue-500"
                                  />
                                  <span className="text-[10px] font-black text-slate-400">às</span>
                                  <input
                                    type="time"
                                    value={stop.ate}
                                    onChange={(e) => handleUpdateStop('outros', stop.id, 'ate', e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold text-center focus:outline-none focus:ring-1 focus:ring-blue-500"
                                  />
                                </div>
                                <div className="col-span-5">
                                  <input
                                    type="text"
                                    value={stop.motivo}
                                    onChange={(e) => handleUpdateStop('outros', stop.id, 'motivo', e.target.value)}
                                    placeholder="Motivo da parada..."
                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-[11px] font-medium focus:outline-none focus:ring-1 focus:ring-blue-500"
                                  />
                                </div>
                                <div className="col-span-2 flex items-center justify-between pl-1">
                                  <span className="text-[9px] font-black text-slate-500">{min > 0 ? `${min}m` : '0m'}</span>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveStop('outros', stop.id)}
                                    className="p-1 text-red-500 hover:bg-red-50 rounded-md transition-colors"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                      <div className="flex justify-between items-center pt-2 border-t border-slate-50 px-1 text-[9px] font-black text-slate-400 uppercase">
                        <span>Subtotal Outros</span>
                        <span className="text-slate-700 font-bold">{outrosMinCalculado} min</span>
                      </div>
                    </div>
                  </>
                )}

                <div className="pt-2 border-t border-slate-200 flex justify-between items-center px-1">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Parado Geral</span>
                  <span className="text-sm font-black text-slate-700">{totalParadas} min</span>
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-4 border-t border-slate-100">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-3 bg-white border border-slate-200 text-slate-500 rounded-xl font-black text-[10px] uppercase hover:bg-slate-50 transition-all">Cancelar</button>
            <button type="submit" className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl font-black text-[10px] uppercase shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all flex items-center justify-center gap-2">
              <Save size={16} /> {initialData ? 'Atualizar' : (pendingEntries.length > 1 ? `Salvar Todos (${pendingEntries.length})` : 'Salvar')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LaunchModal;
