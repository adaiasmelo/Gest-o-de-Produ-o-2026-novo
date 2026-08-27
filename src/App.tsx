import React, { useState, useMemo, useEffect, useRef } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { 
  Plus, Settings, Cpu, ShieldCheck, Database, Target, TrendingUp, Clock, FileDown, 
  Users, HardHat, Factory, Briefcase, History, RotateCcw, X, Edit2, Trash2, 
  LogOut, Search, Activity, Package, ChevronRight, TrendingDown, Upload, Info,
  UserPlus, Download, AlertCircle, FileSpreadsheet, Scale, FileText, Menu, Fingerprint, Smartphone, Bell, Volume2, Share, ExternalLink, Mail, Copy, Filter,
  Home as HomeIcon, WifiOff, Image as ImageIcon, LayoutDashboard, BarChart3, ChevronDown,
  Eye, Calculator, Sparkles, Layers, Wrench, Award, Maximize2, Minimize2, Calendar, Utensils, Tv, Presentation
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Tooltip as RechartsTooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line, AreaChart, Area, ComposedChart,
  ScatterChart, Scatter, ZAxis, ReferenceLine
} from 'recharts';
import html2canvas from 'html2canvas';
import { db, auth, messaging, OperationType, handleFirestoreError, seedInitialData } from './lib/firebase';
import { getToken, onMessage } from 'firebase/messaging';
import { onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import { collection, onSnapshot, doc, setDoc, deleteDoc, query, where, getDocs, writeBatch } from 'firebase/firestore';
import { ProductionEntry, Shift, Employee, Collaborator, PersonnelLog, SystemUser, UserPermissions, TrainingRecord, TrainingTemplate, StockItem, StockEntry, RibbonCuttingEntry, StopItem, OperatorTrainingSheet, Vacation, ActiveSession, AccessLog, OperatorPenalty, CompanyNotice } from './types';
import { DEFAULT_COMPANY_NOTICES } from './data/defaultNotices';
import * as XLSX from 'xlsx';

import PdfChoiceModal from './components/PdfChoiceModal';
import { ActiveUsersModal } from './components/ActiveUsersModal';
import { WeeklyProductionSummaryModal } from './components/WeeklyProductionSummaryModal';
import { IMPORTED_COLLABORATORS } from './constants/importedCollaborators';
import { INITIAL_DATA, GOAL_VALUE, DEFAULT_OPERATORS, INITIAL_EMPLOYEES, INITIAL_LOGS } from './constants';
import { extractDowntimeMotives } from './constants/downtimeReasons';
import { isBiometricAvailable, registerBiometrics, authenticateBiometrics } from './services/biometricService';
import LaunchModal from './components/LaunchModal';
import EmployeeModal from './components/EmployeeModal';
import CollaboratorModal from './components/CollaboratorModal';
import HistoryModal from './components/HistoryModal';
import ShiftModal from './components/ShiftModal';
import RoleModal from './components/RoleModal';
import DatabaseModal from './components/DatabaseModal';
import { QuickAllocationModal } from './components/QuickAllocationModal';
import TrainingModal from './components/TrainingModal';
import TrainingTemplateModal from './components/TrainingTemplateModal';
import ConfirmDialog from './components/ConfirmDialog';
import { MaintenanceTab } from './components/MaintenanceTab';
import { VacationPlanning } from './components/VacationPlanning';
import { OperationalTraining } from './components/OperationalTraining';
import { LunchSchedule } from './components/LunchSchedule';
import { ProjectionDashboard } from './components/ProjectionDashboard';
import { DowntimeReasonsModal } from './components/DowntimeReasonsModal';
import { DowntimeAnalyticsModal } from './components/DowntimeAnalyticsModal';


const TRAINING_MODULES = [
  { id: 'm1', label: 'Leitura de Ordem de Produ√ß√£o (OP)', weight: 10, description: 'Interpreta√ß√£o de especifica√ß√µes do cliente, largura, espessura, di√¢metro de tubete, OP n¬∫, e valida√ß√£o de libera√ß√£o financeira.' },
  { id: 'm2', label: 'Abastecimento & Troca de Mat√©ria-Prima', weight: 10, description: 'Abastecimento de PEBDL, opera√ß√£o do sistema de v√°cuo, caneta de suc√ß√£o, e troca correta de lote sem entrada de ar na rosca.' },
  { id: 'm3', label: 'Controle do Sistema de Resfriamento', weight: 10, description: 'Configura√ß√£o de bombas e √°gua do Chill-Roll 1, Chill-Roll 2 e Recircula√ß√£o, e gerenciamento de Setpoint vs Real (Visu).' },
  { id: 'm4', label: 'Partida de Linha e Purga de Extrus√£o', weight: 10, description: 'Inicializa√ß√£o na velocidade de purga (10 m/min), ligar extrusoras A, B, C e D em rota√ß√µes de purga e verificar caimento na matriz.' },
  { id: 'm5', label: 'Passagem de Corda Guia e Filme', weight: 10, description: 'Percurso t√©cnico da corda guia e filme pelos rolos do Chill-Roll, sensores, rolo expansor (banana), traino 1, traino 2 e biela.' },
  { id: 'm6', label: 'Ajuste de Perif√©ricos de Cast', weight: 10, description: 'Acionamento do motor da cola (Vistamaxx), controle de exaust√£o do Aspirazione Fumi, parametriza√ß√£o da Lam√°ria e voltagem do Fixa-Borda (Spannung).' },
  { id: 'm7', label: 'Regulagem de Espessura e Linha de N√©voa', weight: 10, description: 'Ajuste de parafusos de press√£o/tra√ß√£o na matriz flat die (cabe√ßote plano) e leitura visual da linha de geada (Frost Line) para uniformidade.' },
  { id: 'm8', label: 'Controle de Qualidade do Filme Stretch', weight: 10, description: 'Execu√ß√£o do Teste de Gramatura (FIT 014), Controle Visual (DOC 023), pesagem de bobinas, e teste de ader√™ncia do adesivo (Pega).' },
  { id: 'm9', label: 'Embalagem, Rotulagem & N√£o Conformidades', weight: 10, description: 'Conformidade de paletiza√ß√£o (50kg por palete, 8 bobinas por piso, 16 por palete) e classifica√ß√£o de Eco Stretch A (amarela) e B (vermelha).' },
  { id: 'm10', label: 'Procedimentos de Parada & Limpeza T√©cnica', weight: 10, description: 'Desacelera√ß√£o controlada F3, desligamento de perif√©ricos e extrusoras, limpeza de matriz com esp√°tula de lat√£o, e limpeza do lam√°rio/silos.' },
];
import { BiAnalyticsView } from './components/BiAnalyticsView';
import { RibbonBiAnalyticsView } from './components/RibbonBiAnalyticsView';
import PermissionOverlay from './components/PermissionOverlay';
import InstallExperience from './components/InstallExperience';
import UpdateModal from './components/UpdateModal';
import { EvaluationsTab } from './components/EvaluationsTab';

const MANUAL_MAP: Record<string, { registration: string; name: string }> = {
  "marcelo": { registration: "1611", name: "MARCELO DA SILVA CASTRO" },
  "marcelo da silva castro": { registration: "1611", name: "MARCELO DA SILVA CASTRO" },
  "marcio": { registration: "1694", name: "MARCIO PONTES NEVES" },
  "marcio pontes neves": { registration: "1694", name: "MARCIO PONTES NEVES" },
  "everson": { registration: "1794", name: "EVERSON PEREIRA DA SILVA" },
  "everson pereira da silva": { registration: "1794", name: "EVERSON PEREIRA DA SILVA" },
  "adriano": { registration: "1834", name: "ADRIANO DA SILVA MACIEL" },
  "adriano da silva maciel": { registration: "1834", name: "ADRIANO DA SILVA MACIEL" },
  "gilsimar": { registration: "1844", name: "GILCIMAR CARLOS CORREA ARAUJO" },
  "gilcimar carlos correa araujo": { registration: "1844", name: "GILCIMAR CARLOS CORREA ARAUJO" },
  "cidonei": { registration: "1673", name: "CIDONEIDE OLIVEIRA DE LIMA" },
  "cidoneide oliveira de lima": { registration: "1673", name: "CIDONEIDE OLIVEIRA DE LIMA" },
  "joao vitor": { registration: "1736", name: "JOAO VITOR CARVALHO DE MORAES" },
  "joao vitor carvalho de moraes": { registration: "1736", name: "JOAO VITOR CARVALHO DE MORAES" },
  "diones": { registration: "1856", name: "DIONISON FONSECA CORREA" },
  "dionison fonseca correa": { registration: "1856", name: "DIONISON FONSECA CORREA" },
  "deyvis": { registration: "1607", name: "DEYWIS JUNIO SOUZA MENEZES" },
  "deyvis junio souza menezes": { registration: "1607", name: "DEYWIS JUNIO SOUZA MENEZES" },
  "deywis": { registration: "1607", name: "DEYWIS JUNIO SOUZA MENEZES" },
  "deywis junio souza menezes": { registration: "1607", name: "DEYWIS JUNIO SOUZA MENEZES" },
  "carlos": { registration: "1828", name: "CARLOS ALBERTO DUARTE DOS ANJOS" },
  "carlos alberto duarte dos anjos": { registration: "1828", name: "CARLOS ALBERTO DUARTE DOS ANJOS" },
  "neto": { registration: "1855", name: "ARINETO ALVES DE ANDRADE" },
  "arineto alves de andrade": { registration: "1855", name: "ARINETO ALVES DE ANDRADE" },
  "erivan": { registration: "1745", name: "ERIVAN FONTES DE SOUZA" },
  "erivan fontes de souza": { registration: "1745", name: "ERIVAN FONTES DE SOUZA" },
  "cristian": { registration: "1807", name: "CHRISTIAN DA SILVA PIMENTEL" },
  "chritian": { registration: "1807", name: "CHRISTIAN DA SILVA PIMENTEL" },
  "chritian da silva pimentel": { registration: "1807", name: "CHRISTIAN DA SILVA PIMENTEL" },
  "christian da silva pimentel": { registration: "1807", name: "CHRISTIAN DA SILVA PIMENTEL" },
  "oeuler": { registration: "1725", name: "OEULER FERREIRA SOARES" },
  "oeuler ferreira soares": { registration: "1725", name: "OEULER FERREIRA SOARES" },
  "nahim": { registration: "1704", name: "NAHIM VIEIRA DA SILVA" },
  "nahim vieira da silva": { registration: "1704", name: "NAHIM VIEIRA DA SILVA" },
  "leno": { registration: "1808", name: "LENO DA SILVA FERREIRA" },
  "leno da silva ferreira": { registration: "1808", name: "LENO DA SILVA FERREIRA" },
  "philip": { registration: "1698", name: "CARLOS PHILLIP BATISTA DA SILVA" },
  "carlos phillip batista da silva": { registration: "1698", name: "CARLOS PHILLIP BATISTA DA SILVA" },
  "joao augusto": { registration: "1801", name: "JOAO AUGUSTO CARVALHO DIAS" },
  "joao augusto carvalho dias": { registration: "1801", name: "JOAO AUGUSTO CARVALHO DIAS" },
  "vitor": { registration: "1827", name: "PAULO VITOR BARROS DE SOUZA" },
  "paulo vitor barros de souza": { registration: "1827", name: "PAULO VITOR BARROS DE SOUZA" },
  "edilson": { registration: "1662", name: "EDILSON DA SILVA BENTES" },
  "edilson da silva bentes": { registration: "1662", name: "EDILSON DA SILVA BENTES" },
  "endrew": { registration: "1792", name: "ENDREY LIMA VIANA" },
  "endrey lima viana": { registration: "1792", name: "ENDREY LIMA VIANA" },
  "alessandro de brito marques": { registration: "1796", name: "ALESSANDRO DE BRITO MARQUES" },
  "fabio": { registration: "1806", name: "FABIO ANDRE BELCHIOR MATOS" },
  "fabio andre belchior matos": { registration: "1806", name: "FABIO ANDRE BELCHIOR MATOS" },
  "f√°bio": { registration: "1806", name: "FABIO ANDRE BELCHIOR MATOS" },
  "f√°bio andre belchior matos": { registration: "1806", name: "FABIO ANDRE BELCHIOR MATOS" },
  "f√°bio andr√© belchior matos": { registration: "1806", name: "FABIO ANDRE BELCHIOR MATOS" },
  "jorge": { registration: "1795", name: "JORGE BARBOSA OLIVEIRA" },
  "jorge barbosa oliveira": { registration: "1795", name: "JORGE BARBOSA OLIVEIRA" },
  "mauricio": { registration: "1622", name: "MAURIZIO TAGLIATTI" },
  "maurizio tagliatti": { registration: "1622", name: "MAURIZIO TAGLIATTI" },
  "andre": { registration: "1575", name: "ANDRE PAULO DA SILVA" },
  "andre paulo da silva": { registration: "1575", name: "ANDRE PAULO DA SILVA" },
  "keven": { registration: "1702", name: "KEVEN AUGUSTO SILVA E SILVA" },
  "keven augusto silva e silva": { registration: "1702", name: "KEVEN AUGUSTO SILVA E SILVA" },
  "giovane": { registration: "1840", name: "FRANCISCO GEOVANY MOREIRA DA SILVA" },
  "francisco geovany moreira da silva": { registration: "1840", name: "FRANCISCO GEOVANY MOREIRA DA SILVA" },
  "edmilson": { registration: "1849", name: "ADMILSON SENA DA SILVA" },
  "admilson sena da silva": { registration: "1849", name: "ADMILSON SENA DA SILVA" },
  "mario": { registration: "1857", name: "MARIO SANTOS DA SILVA JUNIOR" },
  "mario santos da silva junior": { registration: "1857", name: "MARIO SANTOS DA SILVA JUNIOR" }
};

const REGISTRATION_MAP: Record<string, { name: string; role: string }> = {};
// Pre-populate with all IMPORTED_COLLABORATORS
IMPORTED_COLLABORATORS.forEach(c => {
  REGISTRATION_MAP[c.registration] = { name: c.name, role: c.role || 'Auxiliar de Produ√ß√£o' };
});
Object.values(MANUAL_MAP).forEach(item => {
  if (!REGISTRATION_MAP[item.registration]) {
    REGISTRATION_MAP[item.registration] = { name: item.name, role: 'Auxiliar de Produ√ß√£o' };
  }
});

const findManualMapKey = (normName: string): string | undefined => {
  let foundKey = Object.keys(MANUAL_MAP).find(k => k === normName);
  if (foundKey) return foundKey;

  // Se o nome for curto/√∫nico (sem sobrenome) e tiver mais de um colaborador com esse nome, n√£o autocompleta para evitar conflito
  const matchesCount = IMPORTED_COLLABORATORS.filter(c => 
    c.name.toLowerCase().includes(normName)
  ).length;

  if (matchesCount > 1) {
    // √â amb√≠guo (ex: "alessandro"), n√£o podemos mapear automaticamente usando sub-strings
    return undefined;
  }

  return Object.keys(MANUAL_MAP).find(k => {
    if (k === normName) return true;
    if (!k.includes(' ')) {
      if (!normName.includes(' ')) {
        return normName.includes(k) || k.includes(normName);
      }
      return false;
    }
    return normName.includes(k) || k.includes(normName);
  });
};

const APP_BUILD_TIME = "2026-06-10T18:25:00Z";

const JUMBO_MICRAS_MAP: Record<string, number> = {
  'AR9': 45,
  'AA 38': 38,
  'AS 50': 50,
  'HOTMAILT': 38,
};

const getJumboMicras = (jumboType: string): number => {
  if (!jumboType) return 0;
  const clean = jumboType.toUpperCase().replace(/\s+/g, '').trim();
  if (clean.includes('AR9')) return 45;
  if (clean.includes('AA38') || clean.includes('AA40')) return 38;
  if (clean.includes('AS50')) return 50;
  if (clean.includes('HOTMALT') || clean.includes('HOTMAILT')) return 38;
  
  const exactKey = jumboType.toUpperCase().trim();
  if (JUMBO_MICRAS_MAP[exactKey]) {
    return JUMBO_MICRAS_MAP[exactKey];
  }
  return 0;
};

const calculateLostM2 = (weightKg: number, jumboType: string) => {
  if (!weightKg || !jumboType) return 0;
  const micras = getJumboMicras(jumboType);
  if (!micras) return 0;
  const gr = micras * 0.92;
  return (weightKg * 1000) / gr;
};

const cleanUndefined = (obj: any): any => {
  if (Array.isArray(obj)) {
    return obj.map(cleanUndefined);
  } else if (obj !== null && typeof obj === 'object') {
    return Object.keys(obj).reduce((acc: any, key) => {
      if (obj[key] !== undefined) {
        acc[key] = cleanUndefined(obj[key]);
      }
      return acc;
    }, {});
  }
  return obj;
};

const upgradeEmployee = (emp: Employee): Employee  => {
  let updatedRole = emp.role;
  if (emp.role === 'Auxiliar 1' || emp.role === 'Auxiliar 2' || emp.role === 'Auxiliar de Produ√ß√£o 1' || emp.role === 'Auxiliar de Produ√ß√£o 2') {
    updatedRole = 'Auxiliar de Produ√ß√£o';
  }
  if (emp.role === 'Supervisor') {
    updatedRole = 'Supervisor de Produ√ß√£o';
  }

  // Identifica√ß√£o e reconhecimento priorit√°rio pela MATR√çCULA para evitar conflito com nomes iguais
  if (emp.registration) {
    const regInfo = REGISTRATION_MAP[emp.registration];
    if (regInfo) {
      if (emp.name === regInfo.name && emp.role === updatedRole) {
        return emp;
      }
      return {
        ...emp,
        role: updatedRole,
        name: regInfo.name,
        updatedAt: new Date().toISOString()
      };
    }
  }

  const normName = emp.name.trim().toLowerCase();
  
  let foundKey = findManualMapKey(normName);

  if (foundKey) {
    const updated = MANUAL_MAP[foundKey];
    if (emp.registration === updated.registration && emp.name === updated.name && emp.role === updatedRole) {
      return emp;
    }
    return {
      ...emp,
      role: updatedRole,
      registration: updated.registration,
      name: updated.name,
      updatedAt: new Date().toISOString()
    };
  }

  if (emp.role !== updatedRole) {
    return {
      ...emp,
      role: updatedRole,
      updatedAt: new Date().toISOString()
    };
  }

  return emp;
};

const upgradeName = (name: string | undefined): string => {
  if (!name) return '';
  const normName = name.trim().toLowerCase();
  
  let foundKey = findManualMapKey(normName);
  
  if (foundKey) {
    return MANUAL_MAP[foundKey].name;
  }
  return name.trim();
};

const getStoppageReason = (entry: ProductionEntry): string => {
  if (entry.isNoWorkDay) {
    return entry.noWorkReason || "Sem Produ√ß√£o / Parada de M√°quina";
  }
  if (entry.isMaintenanceEntry) {
    if (entry.manutencaoMotivo) {
      try {
        const text = entry.manutencaoMotivo.trim();
        if (text.startsWith('[') && text.endsWith(']')) {
          const parsed = JSON.parse(text);
          if (Array.isArray(parsed)) {
            const reasons = parsed.map((p: any) => {
              const m = (p.motivo || p.keyword || '').trim();
              const exp = (p.explicacao || p.justification || p.observacao || p.observacoes || p.descricao || '').trim();
              if (m && exp && m.toLowerCase() !== exp.toLowerCase()) return `${m} (${exp})`;
              return exp || m;
            }).filter((m: any) => m && m.trim() !== '');
            if (reasons.length > 0) return reasons.join('; ');
          }
        }
      } catch (err) {
        // Ignora erro e continua para tratar como texto bruto
      }
      return entry.manutencaoMotivo;
    }
    return "Manuten√ß√£o Corretiva";
  }
  return "";
};

const upgradeCollaborator = (col: Collaborator): Collaborator => {
  let updatedRole = col.role;
  if (col.role === 'Auxiliar 1' || col.role === 'Auxiliar 2' || col.role === 'Auxiliar de Produ√ß√£o 1' || col.role === 'Auxiliar de Produ√ß√£o 2') {
    updatedRole = 'Auxiliar de Produ√ß√£o';
  }

  // Identifica√ß√£o e reconhecimento priorit√°rio pela MATR√çCULA para evitar conflito com nomes iguais
  if (col.registration) {
    const regInfo = REGISTRATION_MAP[col.registration];
    if (regInfo) {
      if (col.name === regInfo.name && col.role === updatedRole) {
        return col;
      }
      return {
        ...col,
        role: updatedRole,
        name: regInfo.name,
        updatedAt: new Date().toISOString()
      };
    }
  }

  const normName = col.name.trim().toLowerCase();
  
  let foundKey = findManualMapKey(normName);

  if (foundKey) {
    const updated = MANUAL_MAP[foundKey];
    if (col.registration === updated.registration && col.name === updated.name && col.role === updatedRole) {
      return col;
    }
    return {
      ...col,
      role: updatedRole,
      registration: updated.registration,
      name: updated.name,
      updatedAt: new Date().toISOString()
    };
  }

  if (col.role !== updatedRole) {
    return {
      ...col,
      role: updatedRole,
      updatedAt: new Date().toISOString()
    };
  }

  return col;
};

const upgradeParticipant = (p: { registration: string; name: string }) => {
  // Identifica√ß√£o e reconhecimento priorit√°rio pela MATR√çCULA para evitar conflito com nomes iguais
  if (p.registration) {
    const regInfo = REGISTRATION_MAP[p.registration];
    if (regInfo) {
      if (p.name === regInfo.name) {
        return p;
      }
      return {
        registration: p.registration,
        name: regInfo.name
      };
    }
  }

  const normName = p.name.trim().toLowerCase();
  
  let foundKey = findManualMapKey(normName);

  if (foundKey) {
    const updated = MANUAL_MAP[foundKey];
    if (p.registration === updated.registration && p.name === updated.name) {
      return p;
    }
    return {
      registration: updated.registration,
      name: updated.name
    };
  }
  return p;
};

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316', '#64748b', '#1e293b', '#64748b', '#475569', '#94a3b8'];

interface BiComposedTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
  formatWeight: (val: number) => string;
}

const BiComposedTooltip = ({ active, payload, label, formatWeight }: BiComposedTooltipProps) => {
  if (active && payload && payload.length) {
    const isLine = payload.some((p: any) => p.dataKey === 'prod');
    if (!isLine) return null;

    const data = payload[0].payload;
    if (!data) return null;

    const metrics = [
      { name: 'Eco B Produ√ß√£o', value: data.ecoBP, color: '#3b82f6' },
      { name: 'Eco B Manuten√ß√£o', value: data.ecoBM, color: '#8b5cf6' },
      { name: 'Res√≠duo Borra', value: data.borra, color: '#f43f5e' },
      { name: 'Produ√ß√£o L√≠quida', value: data.prod, color: '#10b981', isMain: true }
    ];

    return (
      <div className="bg-white/95 backdrop-blur-md text-slate-850 p-4 rounded-2xl shadow-xl border border-slate-150 text-xs max-w-[280px] z-50">
        <p className="font-extrabold border-b border-slate-100 pb-2 mb-2 text-slate-500 uppercase tracking-wider text-[10px]">
          Data: {data.date ? data.date.split('-').reverse().join('/') : label}
        </p>
        <div className="space-y-1.5">
          {metrics.map((p: any, i: number) => (
            <div key={i} className={`flex justify-between gap-4 items-center ${p.isMain ? 'border-t border-slate-100 pt-1.5 mt-1.5' : ''}`}>
              <span className="font-semibold text-slate-600 flex items-center gap-1.5">
                <span className={`rounded-full inline-block ${p.isMain ? 'w-2.5 h-2.5 bg-[#10b981]' : 'w-2 h-2'}`} style={p.isMain ? {} : { backgroundColor: p.color }} />
                {p.name}:
              </span>
              <span className={`font-black ${p.isMain ? 'text-emerald-600' : 'text-slate-900'}`}>{formatWeight(Number(p.value || 0))}</span>
            </div>
          ))}
        </div>
        
        {data.totalVolumes !== undefined && (
          <div className="mt-3 pt-2.5 border-t border-slate-100 space-y-2">
            <div className="flex justify-between font-black text-indigo-600 uppercase text-[10.5px]">
              <span>Volumes Totais:</span>
              <span>{data.totalVolumes} {data.totalVolumes === 1 ? 'vol' : 'vols'}</span>
            </div>
            
            {data.volumesByShiftMachine && Object.keys(data.volumesByShiftMachine).length > 0 && (
              <div className="space-y-2">
                {Object.entries(data.volumesByShiftMachine).map(([shift, machines]) => {
                  const machineEntries = Object.entries(machines as Record<string, number>)
                    .sort((a, b) => b[1] - a[1]);
                  
                  if (machineEntries.length === 0) return null;

                  return (
                    <div key={shift} className="text-[10px] text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-150">
                      <span className="font-black text-slate-700 uppercase tracking-wide text-[9px] block mb-1">
                        {shift}
                      </span>
                      <div className="space-y-1 pl-1 border-l border-slate-200">
                        {machineEntries.map(([machine, vol]) => (
                          <div key={machine} className="flex justify-between items-center gap-2">
                            <span className="text-slate-500 truncate max-w-[120px]" title={machine}>{machine}:</span>
                            <span className="font-extrabold text-slate-800 shrink-0">{vol} {vol === 1 ? 'vol' : 'vols'}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }
  return null;
};

interface CustomBiDotProps {
  cx?: number;
  cy?: number;
}

const CustomBiDot = (props: CustomBiDotProps) => {
  const { cx, cy } = props;
  if (cx === undefined || cy === undefined) return null;
  return (
    <circle
      cx={cx}
      cy={cy}
      r={5}
      fill="#10b981"
      className="cursor-default"
    />
  );
};

const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
  if (percent < 0.05) return null;
  const RADIAN = Math.PI / 180;
  const radius = outerRadius * 1.15;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="#1e293b" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" className="text-[10px] font-black">
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

const compressImage = (base64Str: string, maxWidth = 800, maxHeight = 600): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;
      if (width > height) {
        if (width > maxWidth) {
          height *= maxWidth / width;
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width *= maxHeight / height;
          height = maxHeight;
        }
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', 0.6));
    };
    img.onerror = () => resolve(base64Str);
  });
};

const sanitizeShift = (sh: string | undefined, sectorOrMachine?: string): string => {
  if (!sh) return 'Diurno';
  const trimmed = sh.trim();
  const lower = trimmed.toLowerCase();
  
  const ctx = (sectorOrMachine || '').toLowerCase();
  const isExtrusion = ctx.includes('cast') || ctx.includes('extrus');
  
  if (lower === 'comercial') {
    return isExtrusion ? 'Diurno 1' : 'Comercial';
  }
  if (lower === 'integral') return isExtrusion ? 'Diurno 1' : 'Diurno';
  if (lower === 'dia') return isExtrusion ? 'Diurno 1' : 'Diurno';
  if (lower === 'noite') return isExtrusion ? 'Noturno 1' : 'Noturno';
  
  if (lower.includes('comercial')) {
    return isExtrusion ? 'Diurno 1' : 'Comercial';
  }
  return trimmed;
};

const formatStoppageMotiveClean = (motivoRaw: string | undefined): string => {
  if (!motivoRaw) return '';
  const trimmed = motivoRaw.trim();
  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) {
      if (parsed.length === 0) return '';
      return parsed.map((item: any) => {
        const de = (item.de || '').trim();
        const ate = (item.ate || '').trim();
        const motivo = (item.motivo || item.keyword || '').trim();
        const explicacao = (item.explicacao || item.justification || item.observacao || item.observacoes || item.descricao || '').trim();
        let fullDesc = '';
        if (motivo && explicacao && motivo.toLowerCase() !== explicacao.toLowerCase()) {
          fullDesc = `${motivo} (${explicacao})`;
        } else {
          fullDesc = explicacao || motivo || '';
        }
        if (de && ate) {
          return `${de} √†s ${ate}${fullDesc ? `: ${fullDesc}` : ''}`;
        }
        return fullDesc || '';
      }).filter(Boolean).join('; ');
    }
  } catch (e) {
    // Fallback if parsing fails
  }
  return trimmed;
};

// Helper to draw the favicon with a badge dynamically
const drawFallbackFavicon = (showBadge: boolean, faviconElement: HTMLLinkElement) => {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Beautiful slate round fallback
    ctx.beginPath();
    ctx.arc(32, 32, 28, 0, 2 * Math.PI);
    ctx.fillStyle = '#0f172a';
    ctx.fill();

    // Small graphic representation inside (M letter or bar charts)
    ctx.fillStyle = '#3b82f6';
    ctx.fillRect(18, 24, 6, 24);
    ctx.fillStyle = '#10b981';
    ctx.fillRect(29, 16, 6, 32);
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(40, 28, 6, 20);

    if (showBadge) {
      // Glow
      ctx.beginPath();
      ctx.arc(50, 14, 11, 0, 2 * Math.PI);
      ctx.fillStyle = 'rgba(239, 68, 68, 0.4)';
      ctx.fill();

      // Red badge
      ctx.beginPath();
      ctx.arc(50, 14, 8, 0, 2 * Math.PI);
      ctx.fillStyle = '#ef4444';
      ctx.fill();

      // White border
      ctx.beginPath();
      ctx.arc(50, 14, 8, 0, 2 * Math.PI);
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = '#ffffff';
      ctx.stroke();
    }

    faviconElement.href = canvas.toDataURL('image/png');
  } catch (err) {
    console.error("Error drawing fallback favicon:", err);
  }
};

const updateDynamicFavicon = (systemLogo: string | null, hasBadge: boolean, isFlashOn: boolean) => {
  const faviconElement = document.getElementById('favicon') as HTMLLinkElement || document.querySelector("link[rel*='icon']") as HTMLLinkElement;
  if (!faviconElement) return;

  const logoUrl = systemLogo || "https://static.wixstatic.com/media/765089_472b535780514937a09c07be49495392~mv2.png";

  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 64;
      canvas.height = 64;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.drawImage(img, 0, 0, 64, 64);

      if (hasBadge && isFlashOn) {
        // Red glow
        ctx.beginPath();
        ctx.arc(50, 14, 11, 0, 2 * Math.PI);
        ctx.fillStyle = 'rgba(239, 68, 68, 0.4)';
        ctx.fill();

        // Red badge
        ctx.beginPath();
        ctx.arc(50, 14, 8, 0, 2 * Math.PI);
        ctx.fillStyle = '#ef4444';
        ctx.fill();

        // White border
        ctx.beginPath();
        ctx.arc(50, 14, 8, 0, 2 * Math.PI);
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = '#ffffff';
        ctx.stroke();
      }

      faviconElement.href = canvas.toDataURL('image/png');
    } catch (e) {
      drawFallbackFavicon(hasBadge && isFlashOn, faviconElement);
    }
  };
  img.onerror = () => {
    drawFallbackFavicon(hasBadge && isFlashOn, faviconElement);
  };
  img.src = logoUrl;
};

export const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.error(`Erro ao tentar ativar tela cheia: ${err.message}`);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch((err) => {
          console.error(`Erro ao tentar sair da tela cheia: ${err.message}`);
        });
      }
    }
  };

  const [loggedUser, setLoggedUser] = useState<SystemUser | null>(() => {
    try {
      const saved = localStorage.getItem('manupackaging_user');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      console.error('Failed to parse logged user from localStorage', e);
      return null;
    }
  });

  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    type: 'danger' | 'warning' | 'info';
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    type: 'danger'
  });

  const openConfirm = (title: string, message: string, onConfirm: () => void, type: 'danger' | 'warning' | 'info' = 'danger') => {
    setConfirmDialog({
      isOpen: true,
      title,
      message,
      onConfirm: async () => {
        try {
          await onConfirm();
        } catch (e) {
          console.error("Confirm action failed:", e);
        }
      },
      type
    });
  };

  const [systemUsers, setSystemUsers] = useState<SystemUser[]>([]);
  const [activeSessions, setActiveSessions] = useState<ActiveSession[]>([]);
  const [accessLogs, setAccessLogs] = useState<AccessLog[]>([]);
  const [isActiveUsersModalOpen, setIsActiveUsersModalOpen] = useState(false);
  const [systemName, setSystemName] = useState(() => localStorage.getItem('manupackaging_system_name') || 'CONTROLE DE PRODU√á√ÉO');
  const [loginSystemName, setLoginSystemName] = useState(() => localStorage.getItem('manupackaging_login_name') || 'CONTROLE DE PRODU√á√ÉO');
  const [loginSystemSubtitle, setLoginSystemSubtitle] = useState(() => localStorage.getItem('manupackaging_login_subtitle') || '');
  const [systemLogo, setSystemLogo] = useState<string | null>(() => localStorage.getItem('manupackaging_system_logo'));
  const [systemCoverImage, setSystemCoverImage] = useState<string | null>(() => localStorage.getItem('manupackaging_system_cover'));
  const [isUserManagementOpen, setIsUserManagementOpen] = useState(false);
  const [isDowntimeReasonsModalOpen, setIsDowntimeReasonsModalOpen] = useState(false);
  const [isDowntimeAnalyticsModalOpen, setIsDowntimeAnalyticsModalOpen] = useState(false);
  const [downtimeReasonsVersion, setDowntimeReasonsVersion] = useState(0);
  const [stopsSearchTerm, setStopsSearchTerm] = useState<string>('');

  useEffect(() => {
    const handleUpdate = () => setDowntimeReasonsVersion(v => v + 1);
    window.addEventListener('downtime_reasons_updated', handleUpdate);
    return () => window.removeEventListener('downtime_reasons_updated', handleUpdate);
  }, []);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [activeTab, setActiveTab] = useState<'home' | 'extrusion' | 'ribbon' | 'personnel' | 'evaluations' | 'maintenance' | 'projection'>('home');
  const [personnelSubView, setPersonnelSubView] = useState<'board' | 'vacations' | 'training' | 'lunch'>('board');
  const [isExtrusionMenuOpen, setIsExtrusionMenuOpen] = useState(false);
  const [isRibbonMenuOpen, setIsRibbonMenuOpen] = useState(false);
  const [extrusionSubTab, setExtrusionSubTab] = useState<'dashboard' | 'reports' | 'stock'>('reports');
  const [stockEntries, setStockEntries] = useState<StockEntry[]>([]);
  const [ribbonEntries, setRibbonEntries] = useState<RibbonCuttingEntry[]>([]);
  const [isGeneratingMock, setIsGeneratingMock] = useState(false);

  // Corte de Fita form state
  const [ribbonDate, setRibbonDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toLocaleDateString('sv-SE');
  });
  const [ribbonOperator, setRibbonOperator] = useState('');
  const [ribbonShift, setRibbonShift] = useState('');
  const [ribbonProducedM2, setRibbonProducedM2] = useState('');
  const [ribbonRejectedM2, setRibbonRejectedM2] = useState('');
  const [ribbonWasteWeight, setRibbonWasteWeight] = useState('');
  const [ribbonJumboM2, setRibbonJumboM2] = useState('');
  const [ribbonJumboType, setRibbonJumboType] = useState('');
  const [ribbonMachine, setRibbonMachine] = useState('');
  const [ribbonRollsCount, setRibbonRollsCount] = useState('');
  const [ribbonRollWidth, setRibbonRollWidth] = useState('');
  const [ribbonRollLength, setRibbonRollLength] = useState('');
  const [ribbonOrderNumber, setRibbonOrderNumber] = useState('');
  const [ribbonRollsTipo1, setRibbonRollsTipo1] = useState('');
  const [ribbonRollsTipo2, setRibbonRollsTipo2] = useState('');
  const [ribbonM2Tipo1, setRibbonM2Tipo1] = useState('');
  const [ribbonM2Tipo2, setRibbonM2Tipo2] = useState('');
  const [ribbonStoppedMinutes, setRibbonStoppedMinutes] = useState('');
  const [ribbonStoppedReason, setRibbonStoppedReason] = useState('');
  const [ribbonManutencaoStops, setRibbonManutencaoStops] = useState<StopItem[]>([]);
  const [ribbonProcessoStops, setRibbonProcessoStops] = useState<StopItem[]>([]);
  const [ribbonOutrosStops, setRibbonOutrosStops] = useState<StopItem[]>([]);
  
  const [ribbonJumboItems, setRibbonJumboItems] = useState<Array<{
    id: string;
    jumboType: string;
    jumboM2: number;
    producedM2: number;
    rejectedM2: number;
    wasteWeight: number;
    orderNumber?: string;
    rollsCount?: number;
    rollWidth?: number;
    rollLength?: number;
    rollsTipo1?: number;
    rollsTipo2?: number;
    m2Tipo1?: number;
    m2Tipo2?: number;
  }>>([]);
  const [tempJumboType, setTempJumboType] = useState('');
  const [tempJumboM2, setTempJumboM2] = useState('');
  const [tempProducedM2, setTempProducedM2] = useState('');
  const [tempRejectedM2, setTempRejectedM2] = useState('');
  const [tempWasteWeight, setTempWasteWeight] = useState('');
  
  const [tempOrderNumber, setTempOrderNumber] = useState('');
  const [tempRollsCount, setTempRollsCount] = useState('');
  const [tempRollWidth, setTempRollWidth] = useState('');
  const [tempRollLength, setTempRollLength] = useState('');
  const [tempRollsTipo1, setTempRollsTipo1] = useState('');
  const [tempRollsTipo2, setTempRollsTipo2] = useState('');
  const [tempM2Tipo1, setTempM2Tipo1] = useState('');
  const [tempM2Tipo2, setTempM2Tipo2] = useState('');
  
  const [editingRibbonId, setEditingRibbonId] = useState<string | null>(null);
  const [showRibbonForm, setShowRibbonForm] = useState(false);
  const [ribbonFilterOperator, setRibbonFilterOperator] = useState('all');
  const [ribbonFilterShift, setRibbonFilterShift] = useState('all');
  const [ribbonFilterJumboType, setRibbonFilterJumboType] = useState('all');
  const [ribbonSubTab, setRibbonSubTab] = useState<'dashboard' | 'reports'>('dashboard');
  const [ribbonDashboardSubTab, setRibbonDashboardSubTab] = useState<'summary' | 'charts' | 'comparison'>('summary');
  const [ribbonBiOperatorFilter, setRibbonBiOperatorFilter] = useState<string>('all');
  const [ribbonBiShiftFilter, setRibbonBiShiftFilter] = useState<string>('all');
  const [ribbonBiMachineFilter, setRibbonBiMachineFilter] = useState<string>('all');
  const [ribbonBiStartDate, setRibbonBiStartDate] = useState<string>('');
  const [ribbonBiEndDate, setRibbonBiEndDate] = useState<string>('');
  const [ribbonBiDrilldownModal, setRibbonBiDrilldownModal] = useState<{ isOpen: boolean; title: string; operator?: string; items: any[] }>({ isOpen: false, title: '', items: [] });
  const [ribbonShareDate, setRibbonShareDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toLocaleDateString('sv-SE');
  });
  const [selectedRibbonIds, setSelectedRibbonIds] = useState<string[]>([]);
  const [ribbonStopsGroupBy, setRibbonStopsGroupBy] = useState<'machine' | 'operator'>('machine');
  
  const [dashboardSubTab, setDashboardSubTab] = useState<'summary' | 'charts' | 'comparison'>('summary');
  const [selectedChartId, setSelectedChartId] = useState<string | null>('all');
  const [biMachineFilter, setBiMachineFilter] = useState<string>('all');
  const [biOperatorFilter, setBiOperatorFilter] = useState<string>('all');
  const [biShiftFilter, setBiShiftFilter] = useState<string>('all');
  const [biStartDate, setBiStartDate] = useState<string>('');
  const [biEndDate, setBiEndDate] = useState<string>('');
  const [biDynamicGroup, setBiDynamicGroup] = useState<'operator' | 'machine' | 'shift'>('operator');
  const [biDynamicMetric, setBiDynamicMetric] = useState<string>('prod');
  const [promotionTimeframe, setPromotionTimeframe] = useState<'current' | '2_months' | '3_months' | '6_months' | '1_year'>('current');
  const [biDrilldownModal, setBiDrilldownModal] = useState<{ isOpen: boolean; title: string; type?: 'machine' | 'operator' | 'shift'; filterValue?: string; stops: any[] }>({
    isOpen: false,
    title: '',
    stops: []
  });
  const [stackedGroupBy, setStackedGroupBy] = useState<'machine' | 'operator'>('machine');
  const [productionData, setProductionData] = useState<ProductionEntry[]>(() => {
    try {
      const saved = localStorage.getItem('manupackaging_production');
      const loaded: ProductionEntry[] = saved ? JSON.parse(saved) : [];
      return loaded
        .map(e => ({ ...e, shift: sanitizeShift(e.shift, e.machine) }))
        .filter(entry => {
          if (!entry || !entry.date) return false;
          const year = parseInt(entry.date.split('-')[0], 10);
          return !isNaN(year) && year >= 2026;
        });
    } catch (e) {
      return [];
    }
  });
  const [dashboardMonth, setDashboardMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const downtimeSuggestions = useMemo(() => {
    return extractDowntimeMotives(productionData, ribbonEntries);
  }, [productionData, ribbonEntries, downtimeReasonsVersion]);

  const [filterOperator, setFilterOperator] = useState('Todos');
  const [filterDay, setFilterDay] = useState('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [shareDate, setShareDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toLocaleDateString('sv-SE');
  });

  const [goals, setGoals] = useState<Record<string, number>>(() => {
    try {
      const saved = localStorage.getItem('manupackaging_goals');
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      return {};
    }
  });
  const [ribbonGoals, setRibbonGoals] = useState<Record<string, number>>(() => {
    try {
      const saved = localStorage.getItem('manupackaging_ribbon_goals');
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      return {};
    }
  });
  const [operators, setOperators] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('manupackaging_operators');
      return saved ? JSON.parse(saved) : DEFAULT_OPERATORS;
    } catch (e) {
      return DEFAULT_OPERATORS;
    }
  });
  const [availableRoles, setAvailableRoles] = useState<string[]>(['Operador', 'Operador 1', 'Operador 2', 'Operador 3', 'Auxiliar de Produ√ß√£o', 'Em Experi√™ncia', 'L√≠der', 'Supervisor de Produ√ß√£o', 'Gerente']);
  const [employees, setEmployees] = useState<Employee[]>(() => {
    try {
      const saved = localStorage.getItem('manupackaging_employees');
      const loaded: Employee[] = saved ? JSON.parse(saved) : [];
      return loaded.map(e => upgradeEmployee({ ...e, shift: sanitizeShift(e.shift, e.sector || e.machine) }));
    } catch (e) {
      return [];
    }
  });
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [personnelLogs, setPersonnelLogs] = useState<PersonnelLog[]>([]);
  const [availableShifts, setAvailableShifts] = useState<Shift[]>([]);
  const [operatorPenalties, setOperatorPenalties] = useState<OperatorPenalty[]>(() => {
    try {
      const saved = localStorage.getItem('manupackaging_operator_penalties');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [companyNotices, setCompanyNotices] = useState<CompanyNotice[]>(() => {
    try {
      const saved = localStorage.getItem('manupackaging_company_notices');
      if (saved) {
        return JSON.parse(saved);
      }
      return DEFAULT_COMPANY_NOTICES;
    } catch {
      return DEFAULT_COMPANY_NOTICES;
    }
  });

  const handleSaveNotice = async (notice: CompanyNotice) => {
    try {
      await setDoc(doc(db, 'company_notices', notice.id), notice);
    } catch (e) {
      console.warn('Firestore offline, saving notice locally', e);
    }
    setCompanyNotices((prev) => {
      const idx = prev.findIndex((n) => n.id === notice.id);
      let updated: CompanyNotice[];
      if (idx >= 0) {
        updated = [...prev];
        updated[idx] = notice;
      } else {
        updated = [notice, ...prev];
      }
      try {
        localStorage.setItem('manupackaging_company_notices', JSON.stringify(updated));
        localStorage.setItem('manupackaging_notices_modified', 'true');
      } catch {}
      return updated;
    });
  };

  const handleDeleteNotice = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'company_notices', id));
    } catch (e) {
      console.warn('Firestore offline, deleting notice locally', e);
    }
    setCompanyNotices((prev) => {
      const updated = prev.filter((n) => n.id !== id);
      try {
        localStorage.setItem('manupackaging_company_notices', JSON.stringify(updated));
        localStorage.setItem('manupackaging_notices_modified', 'true');
      } catch {}
      return updated;
    });
  };

  const handleAddPenalty = async (penalty: Omit<OperatorPenalty, 'id' | 'createdAt'>) => {
    const id = 'pen_' + Date.now();
    const newPen: OperatorPenalty = {
      ...penalty,
      id,
      createdAt: new Date().toISOString(),
    };
    try {
      await setDoc(doc(db, 'operator_penalties', id), newPen);
    } catch (e) {
      console.warn('Firestore offline, saving penalty locally', e);
    }
    setOperatorPenalties((prev) => {
      const updated = [...prev, newPen];
      try { localStorage.setItem('manupackaging_operator_penalties', JSON.stringify(updated)); } catch {}
      return updated;
    });
  };

  const handleDeletePenalty = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'operator_penalties', id));
    } catch (e) {
      console.warn('Firestore offline, deleting penalty locally', e);
    }
    setOperatorPenalties((prev) => {
      const updated = prev.filter((p) => p.id !== id);
      try { localStorage.setItem('manupackaging_operator_penalties', JSON.stringify(updated)); } catch {}
      return updated;
    });
  };
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [activeSettingsTab, setActiveSettingsTab] = useState<'filters' | 'goals' | 'config' | 'system' | 'app'>('filters');
  const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false);
  const [isCollaboratorModalOpen, setIsCollaboratorModalOpen] = useState(false);
  const [selectedCollaborator, setSelectedCollaborator] = useState<Collaborator | null>(null);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isOperatorModalOpen, setIsOperatorModalOpen] = useState(false);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
  const [isUpdateAvailable, setIsUpdateAvailable] = useState(false);
  const [updateDismissed, setUpdateDismissed] = useState(false);
  const [updateNotes, setUpdateNotes] = useState<string>('');
  const sessionLoadedBuildTimeRef = useRef<string | null>(null);
  const [isDatabaseModalOpen, setIsDatabaseModalOpen] = useState(false);
  const [isQuickAllocModalOpen, setIsQuickAllocModalOpen] = useState(false);
  const [quickAllocSector, setQuickAllocSector] = useState('Extrus√£o');
  const [isTrainingModalOpen, setIsTrainingModalOpen] = useState(false);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [isPermissionModalOpen, setIsPermissionModalOpen] = useState(false);
  const [showInstallExperience, setShowInstallExperience] = useState(false);
  const [isPreviewConciliationOpen, setIsPreviewConciliationOpen] = useState(false);
  const [vacations, setVacations] = useState<Vacation[]>([]);
  
  // Stock State Managers
  const [pendingUpload, setPendingUpload] = useState<{
    fileName: string;
    items: StockItem[];
    totalWeight: number;
  } | null>(null);
  const [stockReferenceDate, setStockReferenceDate] = useState(() => {
    return new Date().toLocaleDateString('sv-SE');
  });
  const [selectedStockDate, setSelectedStockDate] = useState<string>('');
  const [hasAutoSelectedStock, setHasAutoSelectedStock] = useState<boolean>(false);

  const [trainingTemplate, setTrainingTemplate] = useState<TrainingTemplate>({
    id: 'main',
    companyName: 'MANU',
    subCompanyName: 'PACKAGING',
    subtitle: 'FITASA & AMAZ√îNIA',
    formCode: 'FMRH 010',
    baseFontSize: 11,
    titleFontSize: 14,
    footerText: 'Revis√£o: 004 Data emiss√£o: 08/01/2016 Data revis√£o: 22/01/2024 Elabora√ß√£o: Leila Silva Aprova√ß√£o: Lara Andrade',
  });

  const [trainingRecords, setTrainingRecords] = useState<TrainingRecord[]>([]);
  const [operatorTrainingSheets, setOperatorTrainingSheets] = useState<OperatorTrainingSheet[]>([]);
  const [activeOpSheet, setActiveOpSheet] = useState<OperatorTrainingSheet | null>(null);
  const [isCreatingOpSheet, setIsCreatingOpSheet] = useState(false);
  const [newSheetEmployeeId, setNewSheetEmployeeId] = useState('');
  const [newSheetInstructor, setNewSheetInstructor] = useState('');
  const [newSheetStartDate, setNewSheetStartDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [evalSelectedOperator, setEvalSelectedOperator] = useState('');
  const [showEremaChart, setShowEremaChart] = useState(false);
  const [editingEntry, setEditingEntry] = useState<ProductionEntry | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<any>(null);
  const [selectedEntries, setSelectedEntries] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loginMatricula, setLoginMatricula] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [pdfModal, setPdfModal] = useState<{
    isOpen: boolean;
    doc: any;
    filename: string;
    title: string;
  }>({ isOpen: false, doc: null, filename: '', title: '' });
  const [confirmLoginPass, setConfirmLoginPass] = useState('');
  const [discoveredUser, setDiscoveredUser] = useState<SystemUser | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isExtraMenuOpen, setIsExtraMenuOpen] = useState(false);
  const [employeeDetailData, setEmployeeDetailData] = useState<any>(null);
  const [fullscreenChart, setFullscreenChart] = useState<string | null>(null);
  const [isWeeklySummaryOpen, setIsWeeklySummaryOpen] = useState<boolean>(false);
  
  const [biometricSupported, setBiometricSupported] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showBiometricPrompt, setShowBiometricPrompt] = useState(false);
  const [biometricUser, setBiometricUser] = useState<SystemUser | null>(null);
  
  // States for interactive biometric scanner modal
  const [isBiometricModalOpen, setIsBiometricModalOpen] = useState(false);
  const [biometricModalType, setBiometricModalType] = useState<'register' | 'login'>('login');
  const [biometricModalUser, setBiometricModalUser] = useState<SystemUser | null>(null);
  const [biometricScanStatus, setBiometricScanStatus] = useState<'idle' | 'scanning' | 'success' | 'error'>('idle');
  const [biometricScanError, setBiometricScanError] = useState<string | null>(null);
  const [isIframe, setIsIframe] = useState(false);
  const [notifications, setNotifications] = useState<{ id: string, message: string, type: 'success' | 'info', operator: string }[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const notificationAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    notificationAudioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
    try {
      setIsIframe(window.self !== window.top);
    } catch (e) {
      setIsIframe(true);
    }
  }, []);

  useEffect(() => {
    const handleResetUnread = () => {
      setUnreadCount(0);
    };

    window.addEventListener('focus', handleResetUnread);
    window.addEventListener('click', handleResetUnread);

    return () => {
      window.removeEventListener('focus', handleResetUnread);
      window.removeEventListener('click', handleResetUnread);
    };
  }, []);

  useEffect(() => {
    const originalTitle = "Manupackaging - Controle de Produ√ß√£o";
    let flashInterval: NodeJS.Timeout | null = null;
    let isFlashOn = false;

    // 1. App Badge API (PWA icon badge on taskbar/desktop/dock)
    if (typeof navigator !== 'undefined' && 'setAppBadge' in navigator) {
      if (unreadCount > 0) {
        (navigator as any).setAppBadge(unreadCount).catch((err: any) => {
          console.log('App Badging API error:', err);
        });
      } else {
        (navigator as any).clearAppBadge().catch((err: any) => {
          console.log('App Badging API clear error:', err);
        });
      }
    }

    if (unreadCount > 0) {
      // 2. Title and Favicon Blinking
      flashInterval = setInterval(() => {
        isFlashOn = !isFlashOn;
        document.title = isFlashOn ? `üî¥ (${unreadCount}) NOVO LAN√áAMENTO!` : originalTitle;
        updateDynamicFavicon(systemLogo, true, isFlashOn);
      }, 1000);
    } else {
      document.title = originalTitle;
      updateDynamicFavicon(systemLogo, false, false);
    }

    return () => {
      if (flashInterval) clearInterval(flashInterval);
      document.title = originalTitle;
      
      const faviconElement = document.getElementById('favicon-link') as HTMLLinkElement || document.getElementById('favicon') as HTMLLinkElement || document.querySelector("link[rel*='icon']") as HTMLLinkElement;
      if (faviconElement) {
        faviconElement.href = systemLogo || "https://static.wixstatic.com/media/765089_472b535780514937a09c07be49495392~mv2.png";
      }
    };
  }, [unreadCount, systemLogo]);

  const addNotification = (message: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setNotifications(prev => [...prev as any, { id, message, type: 'success', operator: 'Sistema' }]);
    setUnreadCount(prev => prev + 1);
    if (notificationAudioRef.current) {
        notificationAudioRef.current.play().catch(e => console.error("Audio play failed:", e));
    }
    setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    }, 6000);
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const personnelRef = useRef<HTMLDivElement>(null);

  const activeMachines = useMemo(() => ["Cast 1", "Cast 2", "Erema 1", "Ghezzi", "Lintech", "Wutec"], []);

  useEffect(() => {
    setSelectedEntries([]);
  }, [activeTab, searchTerm, filterDay, filterStartDate, filterEndDate, filterOperator, dashboardMonth]);

  useEffect(() => {
    if (ribbonMachine === 'Ghezze') {
      setRibbonRollWidth('45');
      setTempRollWidth('45');
    }
  }, [ribbonMachine]);

  // Auto-calcular m2 produzido, m2 Tipo 1 e m2 Tipo 2 para o lan√ßamento principal (formul√°rio direto)
  useEffect(() => {
    const width = parseFloat(ribbonRollWidth) || 0;
    const length = parseFloat(ribbonRollLength) || 0;
    
    // produced m2
    const rolls = parseFloat(ribbonRollsCount) || 0;
    if (width > 0 && length > 0 && rolls > 0) {
      const calcM2 = (width / 1000) * length * rolls;
      setRibbonProducedM2(calcM2.toFixed(2));
    }
    
    // Tipo 1
    const t1Rolls = parseFloat(ribbonRollsTipo1) || 0;
    let t1M2 = 0;
    if (width > 0 && length > 0 && t1Rolls > 0) {
      t1M2 = (width / 1000) * length * t1Rolls;
      setRibbonM2Tipo1(t1M2.toFixed(2));
    } else if (t1Rolls === 0) {
      setRibbonM2Tipo1('');
    }
    
    // Tipo 2
    const t2Rolls = parseFloat(ribbonRollsTipo2) || 0;
    let t2M2 = 0;
    if (width > 0 && length > 0 && t2Rolls > 0) {
      t2M2 = (width / 1000) * length * t2Rolls;
      setRibbonM2Tipo2(t2M2.toFixed(2));
    } else if (t2Rolls === 0) {
      setRibbonM2Tipo2('');
    }

    // Total rejeitados (n√£o conforme)
    const totalRej = t1M2 + t2M2;
    if (totalRej > 0) {
      setRibbonRejectedM2(totalRej.toFixed(2));
    } else if (t1Rolls === 0 && t2Rolls === 0) {
      setRibbonRejectedM2('');
    }
  }, [ribbonRollWidth, ribbonRollLength, ribbonRollsCount, ribbonRollsTipo1, ribbonRollsTipo2]);

  // Auto-calcular m2 produzido, m2 Tipo 1 e m2 Tipo 2 para o item tempor√°rio (lista de jumbos)
  useEffect(() => {
    const width = parseFloat(tempRollWidth) || 0;
    const length = parseFloat(tempRollLength) || 0;
    
    // produced m2
    const rolls = parseFloat(tempRollsCount) || 0;
    let prodM2Val = 0;
    if (width > 0 && length > 0 && rolls > 0) {
      prodM2Val = (width / 1000) * length * rolls;
      setTempProducedM2(prodM2Val.toFixed(2));
    } else {
      setTempProducedM2('');
    }
    
    // Tipo 1
    const t1Rolls = parseFloat(tempRollsTipo1) || 0;
    let t1M2 = 0;
    if (width > 0 && length > 0 && t1Rolls > 0) {
      t1M2 = (width / 1000) * length * t1Rolls;
      setTempM2Tipo1(t1M2.toFixed(2));
    } else if (t1Rolls === 0) {
      setTempM2Tipo1('');
    }
    
    // Tipo 2
    const t2Rolls = parseFloat(tempRollsTipo2) || 0;
    let t2M2 = 0;
    if (width > 0 && length > 0 && t2Rolls > 0) {
      t2M2 = (width / 1000) * length * t2Rolls;
      setTempM2Tipo2(t2M2.toFixed(2));
    } else if (t2Rolls === 0) {
      setTempM2Tipo2('');
    }

    // Total rejeitados (n√£o conforme)
    const totalRej = t1M2 + t2M2;
    if (totalRej > 0) {
      setTempRejectedM2(totalRej.toFixed(2));
    } else if (t1Rolls === 0 && t2Rolls === 0) {
      setTempRejectedM2('');
    }

    // Auto-calcular metros quadrados do jumbo utilizado
    const wasteWeightKg = parseFloat(tempWasteWeight) || 0;
    const lostM2 = calculateLostM2(wasteWeightKg, tempJumboType);
    const totalUtilizedM2 = prodM2Val + t1M2 + t2M2 + lostM2;
    if (totalUtilizedM2 > 0) {
      setTempJumboM2(totalUtilizedM2.toFixed(2));
    } else {
      setTempJumboM2('');
    }
  }, [tempRollWidth, tempRollLength, tempRollsCount, tempRollsTipo1, tempRollsTipo2, tempWasteWeight, tempJumboType]);

  useEffect(() => {
    if (ribbonJumboItems.length > 0) {
      const totalJumboM2 = ribbonJumboItems.reduce((acc, item) => acc + item.jumboM2, 0);
      const totalProducedM2 = ribbonJumboItems.reduce((acc, item) => acc + item.producedM2, 0);
      const totalRejectedM2 = ribbonJumboItems.reduce((acc, item) => acc + item.rejectedM2, 0);
      const totalWasteWeight = ribbonJumboItems.reduce((acc, item) => acc + item.wasteWeight, 0);
      
      const totalRollsCount = ribbonJumboItems.reduce((acc, item) => acc + (item.rollsCount || 0), 0);
      const totalRollsTipo1 = ribbonJumboItems.reduce((acc, item) => acc + (item.rollsTipo1 || 0), 0);
      const totalRollsTipo2 = ribbonJumboItems.reduce((acc, item) => acc + (item.rollsTipo2 || 0), 0);
      const totalM2Tipo1 = ribbonJumboItems.reduce((acc, item) => acc + (item.m2Tipo1 || 0), 0);
      const totalM2Tipo2 = ribbonJumboItems.reduce((acc, item) => acc + (item.m2Tipo2 || 0), 0);

      const mainJumboType = ribbonJumboItems[0]?.jumboType || '';

      setRibbonJumboM2(String(totalJumboM2));
      setRibbonProducedM2(String(totalProducedM2));
      setRibbonRejectedM2(String(totalRejectedM2));
      setRibbonWasteWeight(String(totalWasteWeight));
      setRibbonJumboType(mainJumboType);
      
      setRibbonRollsCount(totalRollsCount > 0 ? String(totalRollsCount) : '');
      setRibbonRollsTipo1(totalRollsTipo1 > 0 ? String(totalRollsTipo1) : '');
      setRibbonRollsTipo2(totalRollsTipo2 > 0 ? String(totalRollsTipo2) : '');
      setRibbonM2Tipo1(totalM2Tipo1 > 0 ? String(totalM2Tipo1.toFixed(2)) : '');
      setRibbonM2Tipo2(totalM2Tipo2 > 0 ? String(totalM2Tipo2.toFixed(2)) : '');
    }
  }, [ribbonJumboItems]);

  useEffect(() => {
    if (isAuthenticated && loggedUser) {
      const hasAsked = localStorage.getItem('manupackaging_permissions_asked');
      if (!hasAsked) {
        setTimeout(() => {
          setIsPermissionModalOpen(true);
          localStorage.setItem('manupackaging_permissions_asked', 'true');
        }, 2000);
      }
    }
  }, [isAuthenticated, loggedUser]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUser(user);
        setIsAuthenticated(true);
        // Register for push notifications
        if (messaging) {
          onMessage(messaging, (payload) => {
            console.log('PWA: Notifica√ß√£o recebida em primeiro plano:', payload);
            if (payload.notification) {
              addNotification(`${payload.notification.title}: ${payload.notification.body}`);
            }
          });

          const setupPush = async () => {
            try {
              const permission = await Notification.requestPermission();
              if (permission === 'granted') {
                const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
                if (!vapidKey) return;

                // Primeiro, garante que o Service Worker est√° registrado
                let registration;
                if ('serviceWorker' in navigator) {
                  // Como estamos usando VitePWA, o SW principal √© /sw.js ou o que o plugin gera.
                  // Mas o Firebase quer o que tem o messaging.
                  // Na configura√ß√£o do vite.config.ts, estamos injetando o firebase-messaging-sw.js no sw.js.
                  registration = await navigator.serviceWorker.getRegistration();
                  if (!registration) {
                    registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
                  }
                }

                const token = await getToken(messaging, { 
                  vapidKey,
                  serviceWorkerRegistration: registration 
                });
                
                if (token) {
                  await setDoc(doc(db, 'fcm_tokens', user.uid), {
                    userId: user.uid,
                    token: token,
                    updatedAt: new Date().toISOString()
                  });
                  console.log('PWA: FCM Token registrado com sucesso');
                }
              }
            } catch (error) {
              console.warn('PWA: Erro ao registrar notifica√ß√µes push:', error);
            }
          };
          setupPush();
        }
      } else {
        signInAnonymously(auth).catch(console.error);
      }
    });
    return () => unsubscribe();
  }, []);

  const handleInstallClick = async () => {
    setShowInstallExperience(true);
  };

  useEffect(() => {
    isBiometricAvailable().then(setBiometricSupported);

    // Detectar iOS e se √© standalone
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /ipad|iphone|ipod/.test(userAgent) && !(window as any).MSStream;
    const checkStandalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true || window.location.search.includes('standalone=true');
    
    setIsIOS(isIOSDevice);
    setIsStandalone(checkStandalone);

    const handleBeforeInstall = (e: any) => {
      console.log('PWA: beforeinstallprompt disparado!');
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    const handleAppInstalled = () => {
      console.log('PWA: Aplicativo instalado com sucesso');
      setIsInstallable(false);
      setDeferredPrompt(null);
      setIsStandalone(true);
    };

    console.log('PWA: Inicializando listeners de instala√ß√£o. Standalone:', checkStandalone);

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);

    const handleUpdateAvailable = () => {
      console.log('App: Capturou evento de atualiza√ß√£o');
      setIsUpdateAvailable(true);
    };
    window.addEventListener('pwa-update-available', handleUpdateAvailable);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Limpar badge ao focar na janela
    const clearBadge = () => {
      if ('clearAppBadge' in navigator) {
        (navigator as any).clearAppBadge().catch(console.error);
      }
    };
    window.addEventListener('focus', clearBadge);
    clearBadge();

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('pwa-update-available', handleUpdateAvailable);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('focus', clearBadge);
    };
  }, []);

  useEffect(() => {
    if (!settingsLoaded) return;

    // Update Favicon
    const favicon = document.getElementById('favicon-link') as HTMLLinkElement;
    if (favicon) {
      favicon.href = systemLogo || "https://static.wixstatic.com/media/765089_472b535780514937a09c07be49495392~mv2.png";
    }
  }, [systemLogo, settingsLoaded, loggedUser]);

  useEffect(() => {
    if (!currentUser) return;

    const audioRef = { current: new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3') };
    audioRef.current.volume = 0.5;

    const sessionStartTime = new Date().toISOString();
    let isInitialLoad = true;
    const unsubProduction = onSnapshot(collection(db, 'productionEntries'), (snap) => {
      const docsFiltered: ProductionEntry[] = [];
      
      snap.docs.forEach(docRef => {
        const raw = docRef.data() as ProductionEntry;
        const cleaned = { ...raw, shift: sanitizeShift(raw.shift, raw.machine), id: docRef.id };
        const upgraded = { ...cleaned, operator: upgradeName(cleaned.operator) };
        
        // Exclude and delete older entries from firebase if prior to 2026-01-01
        if (upgraded.date) {
          const year = parseInt(upgraded.date.split('-')[0], 10);
          if (!isNaN(year) && year < 2026) {
            deleteDoc(doc(db, 'productionEntries', docRef.id)).catch(err => {
              console.error('Erro ao excluir apontamento antigo da nuvem:', err);
            });
            return;
          }
        } else {
          // Skip mapping or delete if invalid
          deleteDoc(doc(db, 'productionEntries', docRef.id)).catch(() => {});
          return;
        }

        if (upgraded.operator !== raw.operator || upgraded.shift !== raw.shift) {
          // Asynchronously update Firestore in background
          setDoc(doc(db, 'productionEntries', docRef.id), upgraded).catch(err => {
            console.error('Erro ao migrar dados em productionEntries:', err);
          });
        }
        docsFiltered.push(upgraded);
      });

      setProductionData(docsFiltered.sort((a, b) => (b.date || '').localeCompare(a.date || '') || (b.id || '').localeCompare(a.id || '')));
      if (docsFiltered.length > 0) {
        localStorage.setItem('manupackaging_production', JSON.stringify(docsFiltered));
      }

      // Notify on new entries
      snap.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const newEntry = change.doc.data() as ProductionEntry;
          const entryTime = newEntry.updatedAt || '';
          
          // Only trigger if added/updated after sessionStartTime
          if (entryTime >= sessionStartTime) {
            const id = Math.random().toString(36).substring(7);
            
            // Play sound
            audioRef.current.play().catch(e => console.log('Autoplay blocked or audio error:', e));

            // Add notification
            setNotifications(prev => [
              { 
                id, 
                message: `Novo lan√ßamento: ${formatWeight(newEntry.netWeight)} na m√°quina ${newEntry.machine}`, 
                type: 'success',
                operator: upgradeName(newEntry.operator)
              },
              ...prev
            ]);
            setUnreadCount(prev => prev + 1);

            // Auto remove
            setTimeout(() => {
              setNotifications(prev => prev.filter(n => n.id !== id));
            }, 5000);
          }
        }
      });
      isInitialLoad = false;
    }, (err) => {
      console.warn('Erro ao escutar productionEntries, carregando dados locais.', err);
      try { handleFirestoreError(err, OperationType.LIST, 'productionEntries'); } catch (_) {}
      setIsInitializing(false);
    });

    const unsubEmployees = onSnapshot(collection(db, 'employees'), (snap) => {
      const data = snap.docs.map(docRef => {
        const raw = docRef.data() as Employee;
        const cleaned = { ...raw, shift: sanitizeShift(raw.shift, raw.sector || raw.machine), id: docRef.id };
        const upgraded = upgradeEmployee(cleaned);
        
        if (upgraded.name !== raw.name || upgraded.registration !== raw.registration || upgraded.role !== raw.role || upgraded.shift !== raw.shift) {
          // Asynchronously update Firestore in background
          setDoc(doc(db, 'employees', docRef.id), upgraded).catch(err => {
            console.error('Erro ao migrar colaborador no Firestore:', err);
          });
        }
        return upgraded;
      });
      setEmployees(data);
      if (data.length > 0) {
        localStorage.setItem('manupackaging_employees', JSON.stringify(data));
      }
    }, (err) => {
      console.warn('Erro ao escutar employees, carregando dados locais.', err);
      try { handleFirestoreError(err, OperationType.LIST, 'employees'); } catch (_) {}
      setIsInitializing(false);
    });

    const unsubCollaborators = onSnapshot(collection(db, 'collaborators'), (snap) => {
      const data = snap.docs.map(docRef => {
        const raw = docRef.data() as Collaborator;
        const cleaned = { ...raw, id: docRef.id };
        const upgraded = upgradeCollaborator(cleaned);
        
        if (upgraded.name !== cleaned.name || upgraded.registration !== cleaned.registration || upgraded.role !== cleaned.role) {
          // Asynchronously update Firestore in background
          setDoc(doc(db, 'collaborators', docRef.id), upgraded).catch(err => {
            console.error('Erro ao migrar colaborador no cadastro global (collaborators):', err);
          });
        }
        return upgraded;
      });
      setCollaborators(data);
    }, (err) => {
      console.warn('Erro ao carregar colaboradores do banco.', err);
      try { handleFirestoreError(err, OperationType.LIST, 'collaborators'); } catch (_) {}
    });

    const unsubTraining = onSnapshot(collection(db, 'training_records'), (snap) => {
      const data = snap.docs.map(docRef => {
        const raw = docRef.data() as TrainingRecord;
        const cleaned = { ...raw, id: docRef.id };
        
        let changed = false;
        const upgradedParticipants = (cleaned.participants || []).map(p => {
          const upgradedP = upgradeParticipant(p);
          if (upgradedP.name !== p.name || upgradedP.registration !== p.registration) {
            changed = true;
          }
          return upgradedP;
        });
        
        const upgradedName = upgradeName(cleaned.instructor);
        if (upgradedName !== cleaned.instructor) {
          cleaned.instructor = upgradedName;
          changed = true;
        }
        
        const upgraded = { ...cleaned, participants: upgradedParticipants };
        
        if (changed) {
          // Asynchronously update Firestore in background
          setDoc(doc(db, 'training_records', docRef.id), upgraded).catch(err => {
            console.error('Erro ao migrar participante no registro de treino:', err);
          });
        }
        return upgraded;
      });
      setTrainingRecords(data.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')));
    }, (err) => {
      console.warn('Erro ao escutar training_records.', err);
      try { handleFirestoreError(err, OperationType.LIST, 'training_records'); } catch (_) {}
    });

    const unsubOperatorTraining = onSnapshot(collection(db, 'operator_training_sheets'), (snap) => {
      const data = snap.docs.map(docRef => ({
        ...docRef.data(),
        id: docRef.id
      })) as OperatorTrainingSheet[];
      setOperatorTrainingSheets(data.sort((a, b) => b.lastUpdated.localeCompare(a.lastUpdated)));
    }, (err) => {
      console.warn('Erro ao escutar operator_training_sheets.', err);
      try { handleFirestoreError(err, OperationType.LIST, 'operator_training_sheets'); } catch (_) {}
    });

    const unsubTemplate = onSnapshot(doc(db, 'settings', 'training_template'), (snap) => {
      if (snap.exists()) {
        const data = snap.data() as TrainingTemplate;
        // Forced Migration: If footer is still the old one, update it automatically
        const newFooter = 'Revis√£o: 004 Data emiss√£o: 08/01/2016 Data revis√£o: 22/01/2024 Elabora√ß√£o: Leila Silva Aprova√ß√£o: Lara Andrade';
        
        if (data.footerText && (data.footerText.includes('Gest√£o Industrial') || data.footerText.includes('13/05/2026') || data.footerText.includes('Status: Aprovado') || data.footerText.includes('Rev.: 00'))) {
          if (data.footerText !== newFooter) {
            setDoc(doc(db, 'settings', 'training_template'), { ...data, footerText: newFooter }, { merge: true });
            setTrainingTemplate({ ...data, footerText: newFooter });
          } else {
            setTrainingTemplate(data);
          }
        } else {
          setTrainingTemplate(data);
        }
      }
    }, (err) => {
      console.warn('Erro ao escutar settings/training_template.', err);
      try { handleFirestoreError(err, OperationType.GET, 'settings/training_template'); } catch (_) {}
    });

    const unsubLogs = onSnapshot(collection(db, 'personnelLogs'), (snap) => {
      const data = snap.docs.map(docRef => {
        const raw = docRef.data() as PersonnelLog;
        const cleaned = { ...raw, id: docRef.id };
        const upgradedName = upgradeName(cleaned.employeeName);
        
        if (upgradedName !== cleaned.employeeName) {
          const upgraded = { ...cleaned, employeeName: upgradedName };
          setDoc(doc(db, 'personnelLogs', docRef.id), upgraded).catch(err => {
            console.error('Erro ao migrar nome do colaborador no personnelLog:', err);
          });
          return upgraded;
        }
        return cleaned;
      });
      setPersonnelLogs(data.sort((a, b) => (b.date || '').localeCompare(a.date || '')));
    }, (err) => {
      console.warn('Erro ao escutar personnelLogs.', err);
      try { handleFirestoreError(err, OperationType.LIST, 'personnelLogs'); } catch (_) {}
    });

    const unsubShifts = onSnapshot(collection(db, 'shifts'), (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Shift));
      if (data.length > 0) {
        setAvailableShifts(data);
      }
    }, (err) => {
      console.error('Shifts error:', err);
    });

    const unsubUsers = onSnapshot(collection(db, 'system_users'), (snap) => {
      const data = snap.docs.map(docRef => {
        const raw = docRef.data() as SystemUser;
        const cleaned = { ...raw, id: docRef.id };
        
        const normName = cleaned.name.trim().toLowerCase();
        let foundKey = findManualMapKey(normName);
        
        if (foundKey) {
          const updated = MANUAL_MAP[foundKey];
          if (cleaned.name !== updated.name || cleaned.registration !== updated.registration) {
            const upgraded = { ...cleaned, name: updated.name, registration: updated.registration };
            setDoc(doc(db, 'system_users', docRef.id), upgraded).catch(err => {
              console.error('Erro ao migrar system_users:', err);
            });
            return upgraded;
          }
        }
        return cleaned;
      });
      setSystemUsers(data);
      setIsInitializing(false);
    }, (err) => {
      console.error('Users error:', err);
      try { handleFirestoreError(err, OperationType.LIST, 'system_users'); } catch (_) {}
      setIsInitializing(false);
    });

    const unsubSettings = onSnapshot(doc(db, 'settings', 'global'), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.systemLogo) {
          setSystemLogo(data.systemLogo);
          localStorage.setItem('manupackaging_system_logo', data.systemLogo);
        }
        if (data.systemCoverImage) {
          setSystemCoverImage(data.systemCoverImage);
          localStorage.setItem('manupackaging_system_cover', data.systemCoverImage);
        }
        if (data.systemName) {
          setSystemName(data.systemName);
          localStorage.setItem('manupackaging_system_name', data.systemName);
        }
        if (data.loginSystemName) {
          setLoginSystemName(data.loginSystemName);
          localStorage.setItem('manupackaging_login_name', data.loginSystemName);
        }
        if (data.loginSystemSubtitle) {
          setLoginSystemSubtitle(data.loginSystemSubtitle);
          localStorage.setItem('manupackaging_login_subtitle', data.loginSystemSubtitle);
        }
        if (data.operators) {
          const upgradedOps = Array.from(new Set((data.operators as string[]).map(op => upgradeName(op))));
          
          let changed = false;
          if (upgradedOps.length !== data.operators.length) {
            changed = true;
          } else {
            for (let i = 0; i < upgradedOps.length; i++) {
              if (upgradedOps[i] !== data.operators[i]) {
                changed = true;
                break;
              }
            }
          }
          
          if (changed) {
            setDoc(doc(db, 'settings', 'global'), { ...data, operators: upgradedOps }, { merge: true }).catch(err => {
              console.error('Erro ao atualizar operador em settings/global:', err);
            });
          }
          
          setOperators(upgradedOps);
          localStorage.setItem('manupackaging_operators', JSON.stringify(upgradedOps));
        }
        if (data.goals) {
          setGoals(data.goals);
          localStorage.setItem('manupackaging_goals', JSON.stringify(data.goals));
        }
        if (data.ribbonGoals) {
          setRibbonGoals(data.ribbonGoals);
          localStorage.setItem('manupackaging_ribbon_goals', JSON.stringify(data.ribbonGoals));
        }
        if (data.availableRoles) {
          const rolesList = [...data.availableRoles];
          let changed = false;
          if (!rolesList.includes('Em Experi√™ncia')) {
            rolesList.push('Em Experi√™ncia');
            changed = true;
          }
          if (!rolesList.includes('Operador 3')) {
            rolesList.push('Operador 3');
            changed = true;
          }
          setAvailableRoles(rolesList);
          if (changed) {
            setDoc(doc(db, 'settings', 'global'), { availableRoles: rolesList }, { merge: true })
              .catch(err => console.error('Erro ao atualizar cargos em settings/global:', err));
          }
        }

        // Detector de Atualiza√ß√µes e Edi√ß√µes do Sistema em Tempo Real (PC e Mobile)
        const remoteVersion = data.appBuildTime || data.systemVersion || data.lastUpdated || APP_BUILD_TIME;
        
        if (!sessionLoadedBuildTimeRef.current) {
          sessionLoadedBuildTimeRef.current = remoteVersion;
        } else if (remoteVersion !== sessionLoadedBuildTimeRef.current) {
          console.log('App: Nova altera√ß√£o/atualiza√ß√£o de sistema detectada!', remoteVersion);
          setIsUpdateAvailable(true);
          setUpdateDismissed(false);
          if (data.updateNotes) {
            setUpdateNotes(data.updateNotes);
          }

          // Notifica√ß√£o nativa em dispositivos/navegadores que deram permiss√£o
          if ('Notification' in window && Notification.permission === 'granted') {
            try {
              new Notification('üöÄ Nova Atualiza√ß√£o do Sistema!', {
                body: data.updateNotes || 'Uma nova altera√ß√£o ou vers√£o do sistema de produ√ß√£o foi disponibilizada. Clique no aplicativo para atualizar.',
                icon: data.systemLogo || 'https://static.wixstatic.com/media/765089_472b535780514937a09c07be49495392~mv2.png',
                tag: 'system-update'
              });
            } catch (err) {
              console.warn('Erro ao disparar notifica√ß√£o nativa:', err);
            }
          }
        }
      }
      setSettingsLoaded(true);
    }, (err) => {
      console.warn('Erro ao carregar settings/global.', err);
      try { handleFirestoreError(err, OperationType.GET, 'settings/global'); } catch (_) {}
      setSettingsLoaded(true);
      setIsInitializing(false);
    });

    const unsubStock = onSnapshot(collection(db, 'stock_entries'), (snap) => {
      const data = snap.docs.map(docRef => {
        const raw = docRef.data() as StockEntry;
        return { ...raw, id: docRef.id };
      });
      setStockEntries(data.sort((a, b) => b.date.localeCompare(a.date)));
    }, (err) => {
      console.warn('Erro ao escutar stock_entries:', err);
      try { handleFirestoreError(err, OperationType.LIST, 'stock_entries'); } catch (_) {}
    });

    const unsubRibbon = onSnapshot(collection(db, 'ribbon_cutting_entries'), (snap) => {
      const data = snap.docs.map(docRef => {
        const raw = docRef.data() as RibbonCuttingEntry;
        return { ...raw, id: docRef.id };
      });
      setRibbonEntries(data.sort((a, b) => b.date.localeCompare(a.date)));
    }, (err) => {
      console.warn('Erro ao escutar ribbon_cutting_entries:', err);
      try { handleFirestoreError(err, OperationType.LIST, 'ribbon_cutting_entries'); } catch (_) {}
    });

    const unsubVacations = onSnapshot(collection(db, 'vacations'), (snap) => {
      const data = snap.docs.map(docRef => {
        const raw = docRef.data() as Vacation;
        return { ...raw, id: docRef.id };
      });
      setVacations(data);
    }, (err) => {
      console.warn('Erro ao escutar vacations:', err);
    });

    const unsubActiveSessions = onSnapshot(collection(db, 'active_sessions'), (snap) => {
      const data = snap.docs.map(docRef => ({
        ...docRef.data(),
        id: docRef.id
      })) as ActiveSession[];
      setActiveSessions(data);
    }, (err) => {
      console.warn('Erro ao escutar active_sessions:', err);
    });

    const unsubAccessLogs = onSnapshot(collection(db, 'access_logs'), (snap) => {
      const data = snap.docs.map(docRef => ({
        ...docRef.data(),
        id: docRef.id
      })) as AccessLog[];
      setAccessLogs(data);
    }, (err) => {
      console.warn('Erro ao escutar access_logs:', err);
    });

    const unsubPenalties = onSnapshot(collection(db, 'operator_penalties'), (snap) => {
      const data = snap.docs.map(docRef => ({
        ...docRef.data(),
        id: docRef.id
      })) as OperatorPenalty[];
      setOperatorPenalties(data);
      try { localStorage.setItem('manupackaging_operator_penalties', JSON.stringify(data)); } catch {}
    }, (err) => {
      console.warn('Erro ao escutar operator_penalties:', err);
    });

    const unsubNotices = onSnapshot(collection(db, 'company_notices'), (snap) => {
      if (snap.docs.length > 0) {
        const data = snap.docs.map(docRef => ({
          ...docRef.data(),
          id: docRef.id
        })) as CompanyNotice[];
        setCompanyNotices(data);
        try { localStorage.setItem('manupackaging_company_notices', JSON.stringify(data)); } catch {}
      } else {
        const isModified = localStorage.getItem('manupackaging_notices_modified') === 'true';
        if (isModified) {
          setCompanyNotices([]);
          try { localStorage.setItem('manupackaging_company_notices', JSON.stringify([])); } catch {}
        } else {
          setCompanyNotices(DEFAULT_COMPANY_NOTICES);
          try { localStorage.setItem('manupackaging_company_notices', JSON.stringify(DEFAULT_COMPANY_NOTICES)); } catch {}
        }
      }
    }, (err) => {
      console.warn('Erro ao escutar company_notices:', err);
    });

    return () => {
      unsubProduction();
      unsubEmployees();
      unsubCollaborators();
      unsubTraining();
      unsubOperatorTraining();
      unsubLogs();
      unsubShifts();
      unsubUsers();
      unsubSettings();
      unsubStock();
      unsubRibbon();
      unsubVacations();
      unsubActiveSessions();
      unsubAccessLogs();
      unsubPenalties();
      unsubNotices();
    };
  }, [currentUser]);

  // Auto-migrar funcion√°rios existentes para colaboradores se n√£o existirem
  const migrationRef = useRef(false);
  useEffect(() => {
    if (!settingsLoaded || employees.length === 0 || isInitializing || migrationRef.current) return;

    const migration = async () => {
      migrationRef.current = true;
      const currentCollaborators = [...collaborators].filter(c => c && c.id); // snapshot of current state with valid IDs
      
      // Ensure all INITIAL_EMPLOYEES exist in both employees and collaborators collections (Self-healing)
      for (const initialEmp of INITIAL_EMPLOYEES) {
        if (!initialEmp.name || initialEmp.name === 'VAGA DISPON√çVEL' || initialEmp.name === 'Em Contrata√ß√£o') continue;
        const existsInEmployees = employees.some(e => e.id === initialEmp.id || (e.registration && e.registration === initialEmp.registration) || e.name === initialEmp.name);
        const existsInCollaborators = currentCollaborators.some(c => (c.registration && c.registration === initialEmp.registration) || c.name === initialEmp.name);

        if (!existsInEmployees) {
          try {
            console.log(`Self-healing: Seeding missing initial employee: ${initialEmp.name}`);
            await setDoc(doc(db, 'employees', initialEmp.id), {
              ...initialEmp,
              userId: currentUser?.uid || 'system',
              updatedAt: new Date().toISOString()
            });
          } catch (err) {
            console.error(`Erro ao auto-semear colaborador ${initialEmp.name}:`, err);
          }
        } else {
          // If they exist but status is "vaga excluida", restore them to "Ativo" if they are part of Lintech or other main slots
          const foundEmp = employees.find(e => e.id === initialEmp.id || (e.registration && e.registration === initialEmp.registration) || e.name === initialEmp.name);
          const foundEmpStatusNorm = foundEmp && foundEmp.status ? foundEmp.status.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, "") : '';
          if (foundEmp && foundEmpStatusNorm === 'vaga excluida' && (initialEmp.registration === "1702" || initialEmp.registration === "1840")) {
            try {
              console.log(`Self-healing: Restoring excluded employee to Ativo: ${initialEmp.name}`);
              await setDoc(doc(db, 'employees', foundEmp.id), { status: 'Ativo' }, { merge: true });
            } catch (err) {
              console.error(`Erro ao restaurar status do colaborador ${initialEmp.name}:`, err);
            }
          }
        }

        if (!existsInCollaborators) {
          try {
            console.log(`Self-healing: Seeding missing initial collaborator: ${initialEmp.name}`);
            const colId = `col_${initialEmp.registration || initialEmp.id}`;
            const colRef = doc(db, 'collaborators', colId);
            await setDoc(colRef, {
              id: colId,
              name: initialEmp.name,
              registration: initialEmp.registration || '',
              role: initialEmp.role || 'Operador 1',
              updatedAt: new Date().toISOString()
            });
            currentCollaborators.push({
              id: colId,
              name: initialEmp.name,
              registration: initialEmp.registration || '',
              role: initialEmp.role || 'Operador 1',
              updatedAt: new Date().toISOString()
            });
          } catch (err) {
            console.error(`Erro ao auto-semear cadastro central do colaborador ${initialEmp.name}:`, err);
          }
        }
      }

      // Corre√ß√£o e restaura√ß√£o de dados para Alessandro Nunes da Silva (1872) e Alessandro de Brito Marques (1796)
      for (const col of currentCollaborators) {
        if (!col.id) continue;
        if (col.registration === "1872" && col.name !== "ALESSANDRO NUNES DA SILVA") {
          console.log(`Corrigindo cadastro de matr√≠cula 1872 para ALESSANDRO NUNES DA SILVA`);
          await setDoc(doc(db, 'collaborators', col.id), { name: "ALESSANDRO NUNES DA SILVA" }, { merge: true });
          col.name = "ALESSANDRO NUNES DA SILVA";
        }
        if (col.name === "ALESSANDRO NUNES DA SILVA" && col.registration !== "1872") {
          console.log(`Corrigindo matr√≠cula de ALESSANDRO NUNES DA SILVA para 1872`);
          await setDoc(doc(db, 'collaborators', col.id), { registration: "1872" }, { merge: true });
          col.registration = "1872";
        }
        if (col.registration === "1796" && col.name !== "ALESSANDRO DE BRITO MARQUES") {
          console.log(`Corrigindo cadastro de matr√≠cula 1796 para ALESSANDRO DE BRITO MARQUES`);
          await setDoc(doc(db, 'collaborators', col.id), { name: "ALESSANDRO DE BRITO MARQUES" }, { merge: true });
          col.name = "ALESSANDRO DE BRITO MARQUES";
        }
      }

      // Auto-marcar membros iniciais da brigada de inc√™ndio homologados
      const BRIGADE_REGS = ['1575', '1834', '1695', '1807', '1544', '1792', '1702', '1694', '1758', '1829', '1840', '1850', '1854', '1844', '1808'];
      for (const col of currentCollaborators) {
        if (col.registration && BRIGADE_REGS.includes(col.registration) && !col.isBrigadista) {
          try {
            await setDoc(doc(db, 'collaborators', col.id), { isBrigadista: true }, { merge: true });
            col.isBrigadista = true;
          } catch (err) {
            console.error('Erro ao marcar brigadista inicial', col.name, err);
          }
        }
      }

      // Limpeza de duplicatas por matr√≠cula para evitar registros redundantes
      const regGroups = new Map<string, Collaborator[]>();
      currentCollaborators.forEach(c => {
        if (c.registration) {
          if (!regGroups.has(c.registration)) regGroups.set(c.registration, []);
          regGroups.get(c.registration)!.push(c);
        }
      });
      for (const [reg, cols] of regGroups.entries()) {
        if (cols.length > 1) {
          // Ordenar para garantir que o registro oficial com ID est√°vel 'col_matricula' fique no √≠ndice 0 e seja mantido
          cols.sort((a, b) => {
            if (a.id === `col_${reg}`) return -1;
            if (b.id === `col_${reg}`) return 1;
            return 0;
          });
          console.log(`Removendo registros duplicados para a matr√≠cula ${reg}`);
          for (let i = 1; i < cols.length; i++) {
            if (cols[i].id) {
              await deleteDoc(doc(db, 'collaborators', cols[i].id));
              const idx = currentCollaborators.findIndex(item => item.id === cols[i].id);
              if (idx >= 0) currentCollaborators.splice(idx, 1);
            }
          }
        }
      }
      
      // Cleanup Duplicates if they already exist
      const nameGroups = new Map<string, Collaborator[]>();
      currentCollaborators.forEach(c => {
        if (!nameGroups.has(c.name)) nameGroups.set(c.name, []);
        nameGroups.get(c.name)!.push(c);
      });

      for (const [name, cols] of nameGroups.entries()) {
        if (cols.length > 1) {
          // Ordenar para priorizar manter o de ID est√°vel 'col_matricula'
          cols.sort((a, b) => {
            const aStable = a.registration ? a.id === `col_${a.registration}` : false;
            const bStable = b.registration ? b.id === `col_${b.registration}` : false;
            if (aStable && !bStable) return -1;
            if (!aStable && bStable) return 1;
            return 0;
          });
          // Keep the first one, delete others
          console.log(`Cleaning up duplicates for ${name}`);
          for (let i = 1; i < cols.length; i++) {
            if (cols[i].id) {
              await deleteDoc(doc(db, 'collaborators', cols[i].id));
            }
          }
        }
      }

      // Track names being added to avoid duplicates within the same migration loop
      const namesAdded = new Set<string>(currentCollaborators.map(c => c.name));
      let nextRegNumber = Math.max(0, ...currentCollaborators.map(c => parseInt(c.registration) || 0)) + 1;

      for (const emp of employees) {
        if (!emp.name || emp.name === 'VAGA DISPON√çVEL' || emp.name === 'Em Contrata√ß√£o') continue;
        
        // Auto-heal/migrate Lintech employees to Comercial shift
        if ((emp.registration === "1702" || emp.registration === "1840") && emp.machine === "Lintech" && emp.shift !== "Comercial") {
          try {
            await setDoc(doc(db, 'employees', emp.id), { shift: "Comercial" }, { merge: true });
          } catch (err) {
            console.error('Erro ao migrar turno de Lintech', emp.name, err);
          }
        }

        // Auto-heal/migrate Supervisor role to Supervisor de Produ√ß√£o
        if (emp.role === "Supervisor") {
          try {
            await setDoc(doc(db, 'employees', emp.id), { role: "Supervisor de Produ√ß√£o" }, { merge: true });
          } catch (err) {
            console.error('Erro ao migrar fun√ß√£o Supervisor', emp.name, err);
          }
        }
        
        let targetColId = emp.collaboratorId;
        let existingCol = currentCollaborators.find(c => 
          (emp.collaboratorId && c.id === emp.collaboratorId) || 
          (emp.registration && c.registration === emp.registration) || 
          (c.name === emp.name)
        );

        if (!existingCol && !namesAdded.has(emp.name)) {
          try {
            const colRef = doc(collection(db, 'collaborators'));
            const colId = colRef.id;
            const registration = emp.registration || String(nextRegNumber++).padStart(4, '0');
            
            await setDoc(colRef, {
              id: colId,
              name: emp.name,
              registration: registration,
              role: emp.role || 'Colaborador',
              updatedAt: new Date().toISOString()
            });
            namesAdded.add(emp.name);
            targetColId = colId;
            
            // Also link the employee to this new collaborator ID
            if (emp.id) {
              await setDoc(doc(db, 'employees', emp.id), { 
                collaboratorId: colId,
                registration: registration 
              }, { merge: true });
            }
          } catch (err) {
            console.error('Migration error for', emp.name, err);
          }
        } else if (existingCol) {
          // Ensure sync: employee should have the same registration as collaborator
          const updates: any = {};
          if (!emp.collaboratorId && existingCol.id) updates.collaboratorId = existingCol.id;
          if (emp.registration !== existingCol.registration && existingCol.registration) {
            updates.registration = existingCol.registration;
          }
          
          if (Object.keys(updates).length > 0 && emp.id) {
            await setDoc(doc(db, 'employees', emp.id), updates, { merge: true });
          }
          
          // Also check if the collaborator itself needs a registration
          if (!existingCol.registration && existingCol.id) {
             const registration = emp.registration || String(nextRegNumber++).padStart(4, '0');
             await setDoc(doc(db, 'collaborators', existingCol.id), { registration }, { merge: true });
          }
        }
      }
    };
    
    migration().catch(console.error);
  }, [settingsLoaded, employees.length > 0, isInitializing]);

  const formatDisplayName = (fullName: string) => {
    if (!fullName || fullName === 'VAGA DISPON√çVEL') return fullName;
    const parts = fullName.trim().split(/\s+/);
    if (parts.length === 1) return `${parts[0]} Junior`;
    return `${parts[0]} ${parts[parts.length - 1]}`;
  };

  const handleSyncLocalToCloud = async () => {
    try {
      setIsInitializing(true);
      
      const dataToSeed = {
        productionEntries: productionData,
        employees: employees,
        logs: personnelLogs,
        operators: operators,
        roles: availableRoles,
        goals: goals
      };

      await seedInitialData(dataToSeed);
      
      // Also sync specific settings
      await setDoc(doc(db, 'settings', 'global'), {
        operators,
        availableRoles,
        goals,
        systemName,
        loginSystemName,
        loginSystemSubtitle,
        systemLogo,
        systemCoverImage,
        lastSynced: new Date().toISOString()
      }, { merge: true });

      openConfirm('Sincroniza√ß√£o Conclu√≠da', 'Todos os seus dados locais foram enviados para o banco de dados na nuvem com sucesso.', () => {}, 'info');
    } catch (error) {
      console.error('Sync error:', error);
      alert('Erro ao sincronizar dados. Verifique sua conex√£o.');
    } finally {
      setIsInitializing(false);
    }
  };

  const handleDeleteSelected = () => {
    if (selectedEntries.length === 0) return;
    
    openConfirm(
      'Confirmar Exclus√£o em Massa',
      `Deseja realmente excluir os ${selectedEntries.length} lan√ßamentos selecionados? Esta a√ß√£o n√£o pode ser desfeita.`,
      async () => {
        try {
          setIsInitializing(true);
          const batches = [];
          for (let i = 0; i < selectedEntries.length; i += 500) {
              const batch = writeBatch(db);
              selectedEntries.slice(i, i + 500).forEach(id => {
                  batch.delete(doc(db, 'productionEntries', id));
              });
              batches.push(batch.commit());
          }
          await Promise.all(batches);
          const count = selectedEntries.length;
          setSelectedEntries([]);
          addNotification(`${count} registros exclu√≠dos com sucesso.`);
        } catch (error) {
          console.error('Error deleting batch:', error);
          alert('Erro ao excluir registros. Verifique sua conex√£o.');
        } finally {
          setIsInitializing(false);
        }
      },
      'danger'
    );
  };

  const syncOperatorsSetting = async (updatedEmployees?: Employee[], updatedCollaborators?: Collaborator[]) => {
    try {
      const currentEmployees = updatedEmployees || employees;
      const operatorNamesSet = new Set<string>();
      
      currentEmployees.forEach(e => {
        const nameNorm = (e.name || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, "");
        const statusNorm = (e.status || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, "");
        if (nameNorm.includes('excluid') || statusNorm.includes('excluid') || nameNorm.includes('desligad') || statusNorm.includes('desligad')) {
          return;
        }
        if (e.name && e.name !== 'Em Contrata√ß√£o' && isEmployed(e.status) && (e.role || '').toLowerCase().includes('operador')) {
          operatorNamesSet.add(upgradeName(e.name));
        }
      });
      
      const uniqueOps = Array.from(operatorNamesSet).sort();
      await setDoc(doc(db, 'settings', 'global'), { operators: uniqueOps }, { merge: true });
      setOperators(uniqueOps);
    } catch (err) {
      console.error('Error syncing operators setting:', err);
    }
  };

  const handleSaveCollaborator = async (data: Partial<Collaborator>) => {
    try {
      // Usar ID est√°vel baseado na matr√≠cula 'col_matricula' se for novo cadastro para evitar duplica√ß√µes
      const colRef = data.id 
        ? doc(db, 'collaborators', data.id) 
        : (data.registration 
            ? doc(db, 'collaborators', `col_${data.registration}`) 
            : doc(collection(db, 'collaborators')));
      const finalCollaboratorData = {
        id: colRef.id,
        ...data,
        updatedAt: new Date().toISOString()
      };
      await setDoc(colRef, finalCollaboratorData, { merge: true });
      
      const updatedEmployeesList = [...employees];
      // Update names, registrations and roles in employee slots if they were changed
      if (data.id && (data.name || data.registration || data.role)) {
        const affectedEmployees = employees.filter(e => e.collaboratorId === data.id);
        for (const emp of affectedEmployees) {
          const updates: any = {};
          if (data.name && emp.name !== data.name) {
            updates.name = data.name;
            emp.name = data.name;
          }
          if (data.registration && emp.registration !== data.registration) {
            updates.registration = data.registration;
            emp.registration = data.registration;
          }
          if (data.role && emp.role !== data.role) {
            updates.role = data.role;
            emp.role = data.role;
          }
          
          if (Object.keys(updates).length > 0) {
            await setDoc(doc(db, 'employees', emp.id), updates, { merge: true });
          }
        }
      }

      let updatedCollaborators = [...collaborators];
      const index = updatedCollaborators.findIndex(c => c.id === colRef.id);
      if (index >= 0) {
        updatedCollaborators[index] = { ...updatedCollaborators[index], ...data } as Collaborator;
      } else {
        updatedCollaborators.push(finalCollaboratorData as Collaborator);
      }
      
      await syncOperatorsSetting(updatedEmployeesList, updatedCollaborators);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'collaborators');
    }
  };

  // User Presence & Heartbeat em tempo real
  useEffect(() => {
    if (!loggedUser) return;

    const sessionId = loggedUser.id || loggedUser.registration;
    const storageKey = `login_time_${sessionId}`;
    let loginTime = localStorage.getItem(storageKey);
    if (!loginTime) {
      loginTime = new Date().toISOString();
      localStorage.setItem(storageKey, loginTime);
    }

    const updatePresence = async () => {
      const now = new Date().toISOString();
      try {
        await setDoc(doc(db, 'active_sessions', sessionId), {
          id: sessionId,
          name: loggedUser.name,
          registration: loggedUser.registration,
          role: loggedUser.role,
          lastSeen: now,
          loginTime: loginTime,
          device: typeof window !== 'undefined' && window.innerWidth < 768 ? 'Mobile' : 'Desktop'
        }, { merge: true });
      } catch (e) {
        console.error('Erro ao atualizar presen√ßa em tempo real:', e);
      }
    };

    updatePresence();
    const interval = setInterval(updatePresence, 20000);

    const handleBeforeUnload = () => {
      updatePresence();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      clearInterval(interval);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [loggedUser]);

  const recordAccessLog = async (user: { name: string; registration: string; role: string }, action: 'login' | 'logout' | 'disconnect') => {
    if (!user || !user.name) return;
    try {
      const id = Math.random().toString(36).substring(2, 15);
      const now = new Date().toISOString();
      const device = typeof window !== 'undefined' && window.innerWidth < 768 ? 'Mobile' : 'Desktop';
      await setDoc(doc(db, 'access_logs', id), {
        id,
        name: user.name,
        registration: user.registration,
        role: user.role,
        action,
        timestamp: now,
        device
      });
    } catch (e) {
      console.error('Erro ao registrar hist√≥rico de acesso:', e);
    }
  };

  const handleClearAccessLogs = async () => {
    if (!confirm('Tem certeza que deseja limpar todo o hist√≥rico de acessos?')) return;
    try {
      const batch = writeBatch(db);
      accessLogs.forEach(log => {
        batch.delete(doc(db, 'access_logs', log.id));
      });
      await batch.commit();
      addNotification('Hist√≥rico de acessos limpo com sucesso.');
    } catch (e) {
      console.error('Erro ao limpar hist√≥rico:', e);
      alert('Erro ao limpar hist√≥rico de acessos.');
    }
  };

  const onlineUsers = useMemo(() => {
    const nowMs = Date.now();
    return activeSessions.filter(s => {
      if (!s.lastSeen) return false;
      const diff = nowMs - new Date(s.lastSeen).getTime();
      return diff < 120000;
    });
  }, [activeSessions]);

  const handleDisconnectUser = async (sessionId: string) => {
    try {
      const targetSession = activeSessions.find(s => s.id === sessionId);
      if (targetSession) {
        recordAccessLog({
          name: targetSession.name,
          registration: targetSession.registration,
          role: targetSession.role
        }, 'disconnect');
      }
      await deleteDoc(doc(db, 'active_sessions', sessionId));
      addNotification('Sess√£o encerrada com sucesso.');
    } catch (e) {
      console.error('Erro ao desconectar usu√°rio:', e);
      alert('Erro ao desconectar usu√°rio.');
    }
  };

  const handleLogout = async () => {
    if (loggedUser) {
      const sessionId = loggedUser.id || loggedUser.registration;
      recordAccessLog(loggedUser, 'logout');
      try {
        await deleteDoc(doc(db, 'active_sessions', sessionId));
      } catch (e) {
        console.error('Erro ao remover presen√ßa ao sair:', e);
      }
    }
    setLoggedUser(null);
    setLoginMatricula('');
    setLoginPass('');
    setConfirmLoginPass('');
    setDiscoveredUser(null);
    localStorage.removeItem('manupackaging_user');
  };

  const lastBiometricAttemptRef = useRef<string>('');

  const handleMatriculaChange = (val: string) => {
    setLoginMatricula(val);
    
    if (val.length >= 3) {
      let user = systemUsers.find(u => u.registration === val);
      
      // Fallback for admin 1010 if not in database yet
      if (!user && val === '1010') {
        user = {
          id: 'admin_1010',
          registration: '1010',
          name: 'Administrador 1010',
          role: 'Administrador',
          isFirstAccess: false,
          password: '1010',
          permissions: {
            canManagePersonnel: true,
            canManageSettings: true,
            canViewHistory: true,
            canManageUsers: true
          }
        };
      }

      if (user) {
        setDiscoveredUser(user);
        // Direct call within the event loop to satisfy user gesture requirement
        if (user.biometricId && biometricSupported && !loggedUser && lastBiometricAttemptRef.current !== val) {
          lastBiometricAttemptRef.current = val;
          handleBiometricLogin(user);
        }
      } else {
        setDiscoveredUser(null);
        lastBiometricAttemptRef.current = '';
      }
    } else {
      setDiscoveredUser(null);
      lastBiometricAttemptRef.current = '';
    }
  };

  const handleGuestLogin = () => {
    const guestUser: SystemUser = {
      id: 'guest_visitante',
      name: 'Visitante (Leitura)',
      registration: '9999',
      role: 'Modo Leitura',
      isFirstAccess: false,
      permissions: {
        canViewDashboard: true,
        canViewReports: true,
        canViewPersonnel: true,
        canManageSettings: false,
        canEditProduction: false,
        canManagePersonnel: false,
        isReadOnly: true
      }
    };
    recordAccessLog(guestUser, 'login');
    setLoggedUser(guestUser);
    localStorage.setItem('manupackaging_user', JSON.stringify(guestUser));
  };

  const handleLogin = async (matricula: string, pass: string, confirmPas?: string) => {
    // Default Admin Check
    if (matricula === '1010' && pass === '1010') {
      const defaultAdmin: SystemUser = {
        id: 'admin_1010',
        name: 'Administrador Padr√£o',
        registration: '1010',
        role: 'Administrador',
        password: '1010',
        isFirstAccess: false,
        permissions: {
          canViewDashboard: true,
          canViewReports: true,
          canViewPersonnel: true,
          canManageSettings: true,
          canEditProduction: true,
          canManagePersonnel: true,
          isReadOnly: false
        }
      };
      recordAccessLog(defaultAdmin, 'login');
      setLoggedUser(defaultAdmin);
      localStorage.setItem('manupackaging_user', JSON.stringify(defaultAdmin));
      return;
    }

    const user = discoveredUser || systemUsers.find(u => u.registration === matricula);
    if (!user) {
      alert('Matr√≠cula n√£o encontrada.');
      return;
    }

    if (user.isFirstAccess) {
      if (!pass || pass.length < 4) {
        alert('A senha deve ter pelo menos 4 caracteres.');
        return;
      }
      if (pass !== confirmPas) {
        alert('As senhas n√£o coincidem.');
        return;
      }

      try {
        const updated = { ...user, password: pass, isFirstAccess: false };
        await setDoc(doc(db, 'system_users', user.id), updated);
        recordAccessLog(updated, 'login');
        setLoggedUser(updated);
        localStorage.setItem('manupackaging_user', JSON.stringify(updated));

        // Prompt for biometrics immediately after first access
        if (biometricSupported) {
          setBiometricUser(updated);
          setShowBiometricPrompt(true);
        }
      } catch (err) {
        alert('Erro ao salvar senha.');
      }
      return;
    }

    if (user.password === pass) {
      recordAccessLog(user, 'login');
      setLoggedUser(user);
      localStorage.setItem('manupackaging_user', JSON.stringify(user));
      
      // Check if user should be prompted to register biometrics
      if (biometricSupported && !user.biometricId) {
        setBiometricUser(user);
        setShowBiometricPrompt(true);
      }
    } else {
      alert('Senha incorreta.');
    }
  };

  const handleOpenBiometricLoginModal = (user: SystemUser) => {
    setBiometricModalUser(user);
    setBiometricModalType('login');
    setIsBiometricModalOpen(true);
    setBiometricScanStatus('idle');
    setBiometricScanError(null);
    
    // Automatically trigger the biometric scan on open!
    setTimeout(() => {
      triggerBiometricProcess('login', user);
    }, 400);
  };

  const handleOpenBiometricRegisterModal = (user: SystemUser) => {
    setBiometricModalUser(user);
    setBiometricModalType('register');
    setIsBiometricModalOpen(true);
    setBiometricScanStatus('idle');
    setBiometricScanError(null);
    setShowBiometricPrompt(false);
    
    // Automatically trigger the biometric scan on open!
    setTimeout(() => {
      triggerBiometricProcess('register', user);
    }, 400);
  };

  const getWebAuthnErrorMessage = (err: any): string => {
    if (!err) return 'Erro desconhecido ao acessar leitor biom√©trico.';
    const name = err.name;
    const message = err.message || '';
    
    if (name === 'NotAllowedError') {
      return 'O escaneamento foi cancelado pelo usu√°rio ou o acesso √† biometria foi negado pelo sistema operacional/navegador.';
    }
    if (name === 'SecurityError') {
      return 'Erro de Seguran√ßa: Acesso biom√©trico bloqueado. Navegadores pro√≠bem biometria (Touch ID / Face ID) dentro de iframes (pain√©is de visualiza√ß√£o). Por favor, abra o aplicativo em uma ABA CHEIA do navegador para funcionar de verdade.';
    }
    if (name === 'InvalidStateError') {
      return 'Chave inv√°lida ou este dispositivo j√° possui este usu√°rio biom√©trico registrado.';
    }
    if (name === 'NotSupportedError') {
      return 'Este dispositivo ou navegador n√£o possui suporte de hardware ou driver ativo para chaves biom√©tricas.';
    }
    return `Falha f√≠sica: ${message || name}. Certifique-se de que o leitor de digital/facial est√° ativado no aparelho.`;
  };

  const triggerBiometricProcess = async (type: 'register' | 'login', user: SystemUser) => {
    setBiometricScanStatus('scanning');
    setBiometricScanError(null);
    
    if (type === 'register') {
      try {
        const biometricId = await registerBiometrics(user);
        if (biometricId) {
          const updated = { ...user, biometricId };
          await setDoc(doc(db, 'system_users', user.id), updated);
          setLoggedUser(updated);
          localStorage.setItem('manupackaging_user', JSON.stringify(updated));
          setBiometricScanStatus('success');
          setTimeout(() => {
            setIsBiometricModalOpen(false);
            setBiometricModalUser(null);
          }, 1500);
        } else {
          setBiometricScanStatus('error');
          setBiometricScanError('Nenhum dado biom√©trico foi gerado pelo dispositivo.');
        }
      } catch (err: any) {
        console.error('WebAuthn register error:', err);
        setBiometricScanStatus('error');
        setBiometricScanError(getWebAuthnErrorMessage(err));
      }
    } else {
      try {
        if (!user.biometricId) {
          setBiometricScanStatus('error');
          setBiometricScanError('Nenhum cadastro biom√©trico de alta seguran√ßa encontrado para este usu√°rio.');
          return;
        }
        
        const success = await authenticateBiometrics(user.biometricId);
        if (success) {
          recordAccessLog(user, 'login');
          setLoggedUser(user);
          localStorage.setItem('manupackaging_user', JSON.stringify(user));
          setBiometricScanStatus('success');
          setTimeout(() => {
            setIsBiometricModalOpen(false);
            setBiometricModalUser(null);
          }, 1500);
        } else {
          setBiometricScanStatus('error');
          setBiometricScanError('A verifica√ß√£o biom√©trica n√£o p√¥de ser completada.');
        }
      } catch (err: any) {
        console.error('WebAuthn login error:', err);
        setBiometricScanStatus('error');
        setBiometricScanError(getWebAuthnErrorMessage(err));
      }
    }
  };

  const handleBiometricLogin = async (userParam?: SystemUser) => {
    const user = userParam || systemUsers.find(u => u.registration === loginMatricula);
    if (!user || !user.biometricId) return;
    handleOpenBiometricLoginModal(user);
  };

  const handleRegisterBiometrics = async () => {
    if (!biometricUser) return;
    handleOpenBiometricRegisterModal(biometricUser);
  };

  const handleTriggerUpdateNotification = async (customNotes?: string) => {
    try {
      const now = new Date().toISOString();
      const notes = customNotes || 'Uma nova altera√ß√£o ou atualiza√ß√£o do sistema foi realizada pelo administrador.';
      await setDoc(doc(db, 'settings', 'global'), {
        appBuildTime: now,
        lastUpdated: now,
        updateNotes: notes,
        updatedBy: loggedUser?.name || 'Administrador'
      }, { merge: true });
      alert('Notifica√ß√£o de atualiza√ß√£o disparada com sucesso para todos os dispositivos instalados (PC e Celulares)!');
    } catch (err) {
      console.error('Erro ao disparar notifica√ß√£o de atualiza√ß√£o:', err);
      alert('Erro ao enviar notifica√ß√£o de atualiza√ß√£o para os dispositivos.');
    }
  };

  const handleSaveSettings = async () => {
    try {
      const now = new Date().toISOString();
      const settingsData = {
        operators,
        availableRoles,
        goals,
        systemName,
        loginSystemName,
        loginSystemSubtitle,
        systemLogo,
        systemCoverImage,
        appBuildTime: now,
        lastUpdated: now,
        updateNotes: 'As configura√ß√µes e par√¢metros do sistema foram alterados e salvas.'
      };
      
      // Check for size limit (1MB)
      const estimatedSize = JSON.stringify(settingsData).length;
      if (estimatedSize > 1048576) {
        alert('As imagens selecionadas s√£o muito pesadas e excedem o limite de salvamento (1MB). Por favor, use imagens menores.');
        return;
      }

      await setDoc(doc(db, 'settings', 'global'), settingsData);
      alert('Configura√ß√µes salvas e notifica√ß√£o de atualiza√ß√£o sincronizada com sucesso!');
    } catch (err) {
      console.error("Erro ao salvar configura√ß√µes:", err);
      alert('Erro cr√≠tico ao salvar no banco de dados. Verifique sua conex√£o ou se a imagem √© muito grande.');
    }
  };

  const formatWeight = (val: number) => {
    const absVal = Math.abs(val);
    if (absVal >= 1000) {
      return (val / 1000).toLocaleString('pt-BR', { minimumFractionDigits: 3, maximumFractionDigits: 3 }).replace(',', '.') + ' T';
    }
    return val.toLocaleString('pt-BR', { maximumFractionDigits: 0 }) + ' Kg';
  };
  const formatM2 = (val: number) => {
    return val.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 1 }) + ' m¬≤';
  };
  const formatShareWeight = formatWeight;
  const formatMinutes = (val: number) => val >= 60 ? `${Math.floor(val / 60)}h ${val % 60}m` : `${val} min`;

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
            motivo: item.motivo || item.keyword || '',
            keyword: item.keyword || item.motivo || '',
            explicacao: item.explicacao || item.justification || item.observacao || item.observacoes || item.descricao || '',
            justification: item.justification || item.explicacao || item.observacao || item.observacoes || item.descricao || ''
          }));
        }
      }
    } catch (e) {
      // continua no fallback
    }
    if (min > 0 || motivo) {
      return [{ id: `stop-legacy-${Date.now()}-${Math.random()}`, de: '', ate: '', motivo: motivo || '', explicacao: '' }];
    }
    return [];
  };

  const downloadTemplate = () => {
    const data = [
      ["C√≥digo", "Descri√ß√£o", "Quantidade (Kg)", "Local"],
      ["BUT01", "BUTENO", 15000, "F√°brica"],
      ["BUT01", "BUTENO", 25000, "Galp√£o"],
      ["HEX02", "HEXENO", 8000, "F√°brica"],
      ["HEX02", "HEXENO", 12000, "Galp√£o"],
      ["MET03", "METALOCENO", 5000, "F√°brica"],
      ["MET03", "METALOCENO", 7000, "Galp√£o"],
      ["PEBD04", "VIRGEM PEBD", 9500, "Galp√£o"]
    ];
    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Contagem Estoque");
    const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([wbout], { type: "application/octet-stream" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "modelo_contagem_estoque.xlsx";
    a.click();
  };

  const [dragActive, setDragActive] = useState(false);
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      parseFile(e.dataTransfer.files[0]);
    }
  };

  const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    parseFile(file);
  };

  const parseFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];
        
        const items: StockItem[] = [];
        let detectedTotal = 0;
        
        // Detector de colunas din√¢mico para mapeamento flex√≠vel (F√°brica / Galp√£o em colunas separadas)
        let isTwoColumnLayout = false;
        let colCodeIdx = -1;
        let colDescIdx = -1;
        let colFabricaIdx = -1;
        let colGalpaoIdx = -1;

        for (let r = 0; r < Math.min(data.length, 5); r++) {
          const row = data[r];
          if (!row || row.length < 2) continue;
          
          let hasFabrica = false;
          let hasGalpao = false;

          row.forEach((cell, idx) => {
            if (cell === undefined || cell === null) return;
            const cellStr = String(cell).toLowerCase().trim();
            if (cellStr.includes('c√≥digo') || cellStr.includes('codigo')) {
              colCodeIdx = idx;
            } else if (cellStr.includes('descri')) {
              colDescIdx = idx;
            } else if (cellStr.includes('f√°brica') || cellStr.includes('fabrica')) {
              colFabricaIdx = idx;
              hasFabrica = true;
            } else if (cellStr.includes('galp√£o') || cellStr.includes('galpao')) {
              colGalpaoIdx = idx;
              hasGalpao = true;
            }
          });

          if (hasFabrica || hasGalpao) {
            isTwoColumnLayout = true;
            if (colCodeIdx === -1) colCodeIdx = 0;
            if (colDescIdx === -1) colDescIdx = 1;
            break;
          }
        }

        if (isTwoColumnLayout) {
          for (let r = 0; r < data.length; r++) {
            const row = data[r];
            if (!row || row.length < 2) continue;

            const codeCell = colCodeIdx !== -1 ? row[colCodeIdx] : undefined;
            const descCell = colDescIdx !== -1 ? row[colDescIdx] : undefined;

            if (codeCell === undefined || codeCell === null) continue;

            const codeStr = String(codeCell).toLowerCase().trim();
            if (codeStr.includes('c√≥digo') || codeStr.includes('codigo') || codeStr.includes('material') || codeStr.includes('descri') || codeStr.includes('f√°brica') || codeStr.includes('fabrica') || codeStr.includes('galp√£o') || codeStr.includes('galpao')) {
              continue;
            }

            const codeVal = String(codeCell).trim().toUpperCase();
            const nameVal = descCell !== undefined && descCell !== null ? String(descCell).trim().toUpperCase() : '';

            let fabricaQty = 0;
            let galpaoQty = 0;

            if (colFabricaIdx !== -1 && row[colFabricaIdx] !== undefined && row[colFabricaIdx] !== null) {
              const valStr = String(row[colFabricaIdx]).replace(/\s/g, '').replace(/\./g, '').replace(',', '.');
              const parsed = parseFloat(valStr);
              if (!isNaN(parsed)) fabricaQty = parsed;
            }

            if (colGalpaoIdx !== -1 && row[colGalpaoIdx] !== undefined && row[colGalpaoIdx] !== null) {
              const valStr = String(row[colGalpaoIdx]).replace(/\s/g, '').replace(/\./g, '').replace(',', '.');
              const parsed = parseFloat(valStr);
              if (!isNaN(parsed)) galpaoQty = parsed;
            }

            if (nameVal !== '') {
              // Adiciona registro de F√°brica se houver valor
              items.push({
                code: codeVal,
                name: nameVal,
                quantity: fabricaQty,
                location: 'F√°brica'
              });
              detectedTotal += fabricaQty;

              // Adiciona registro de Galp√£o se houver valor
              items.push({
                code: codeVal,
                name: nameVal,
                quantity: galpaoQty,
                location: 'Galp√£o'
              });
              detectedTotal += galpaoQty;
            }
          }
        } else {
          for (let r = 0; r < data.length; r++) {
            const row = data[r];
            if (!row || row.length < 2) continue;
            
            const colA = row[0];
            const colB = row[1];
            const colC = row[2];
            const colD = row[3];
            
            if (colA === undefined || colA === null) continue;
            
            const colAStr = String(colA).toLowerCase();
            if (colAStr.includes('c√≥digo') || colAStr.includes('codigo') || colAStr.includes('material') || colAStr.includes('descri') || colAStr.includes('local') || colAStr.includes('quantidade')) {
              continue;
            }
            
            let codeVal = '';
            let nameVal = '';
            let qtyVal = 0;
            let locVal = 'F√°brica';
            
            if (colC !== undefined && colC !== null && String(colC).trim() !== '') {
              // Se temos A, B e C, significa que temos C√≥digo, Descri√ß√£o e Quantidade.
              codeVal = String(colA).trim().toUpperCase();
              nameVal = String(colB).trim().toUpperCase();
              qtyVal = parseFloat(String(colC).replace(/\s/g, '').replace(/\./g, '').replace(',', '.'));
              
              // Se tiver coluna D para o Local, n√≥s o usamos
              if (colD !== undefined && colD !== null && String(colD).trim() !== '') {
                locVal = String(colD).trim();
              } else {
                locVal = 'F√°brica';
              }
            } else if (colB !== undefined && colB !== null && String(colB).trim() !== '') {
              // Se s√≥ temos A e B, significam Descri√ß√£o e Quantidade.
              nameVal = String(colA).trim().toUpperCase();
              codeVal = nameVal.substring(0, 6);
              qtyVal = parseFloat(String(colB).replace(/\s/g, '').replace(/\./g, '').replace(',', '.'));
              locVal = 'F√°brica';
            }
            
            if (!isNaN(qtyVal) && nameVal !== '') {
              items.push({
                code: codeVal,
                name: nameVal,
                quantity: qtyVal,
                location: locVal
              });
              detectedTotal += qtyVal;
            }
          }
        }
        
        if (items.length === 0) {
          alert("N√£o foi poss√≠vel detectar itens v√°lidos na primeira planilha. Verifique as colunas de material, c√≥digo e peso.");
          return;
        }
        
        setPendingUpload({
          fileName: file.name,
          items,
          totalWeight: detectedTotal
        });
      } catch (err) {
        console.error("Erro ao analisar arquivo:", err);
        alert("Erro ao ler planilha excel. Verifique a formata√ß√£o do arquivo.");
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleSaveStock = async () => {
    if (!pendingUpload) return;
    try {
      await setDoc(doc(db, 'stock_entries', stockReferenceDate), {
        id: stockReferenceDate,
        date: stockReferenceDate,
        items: pendingUpload.items,
        totalWeight: pendingUpload.totalWeight,
        updatedAt: new Date().toISOString(),
        userId: loggedUser?.id || 'anonymous'
      });
      alert('Contagem f√≠sica de estoque salva com sucesso!');
      setPendingUpload(null);
      setSelectedStockDate(stockReferenceDate);
    } catch (err) {
      console.error('Erro ao salvar estoque:', err);
      alert('N√£o foi poss√≠vel salvar o seu estoque f√≠sico.');
    }
  };

  // Automatically select latest stock date once loaded
  useEffect(() => {
    if (stockEntries.length > 0 && !selectedStockDate && !hasAutoSelectedStock) {
      setSelectedStockDate(stockEntries[0].date);
      setHasAutoSelectedStock(true);
    } else if (stockEntries.length === 0 && hasAutoSelectedStock) {
      setHasAutoSelectedStock(false);
    }
  }, [stockEntries, selectedStockDate, hasAutoSelectedStock]);


  const isAdmin = loggedUser?.registration === '1010' || loggedUser?.role === 'Administrador';
  const isSupervisor = (loggedUser?.role || '').toLowerCase().includes('supervisor');
  const canViewActiveUsers = isAdmin || isSupervisor;
  const isReadOnlyAccount = !isAdmin && loggedUser?.permissions?.isReadOnly;
  const canViewDashboard = isAdmin || loggedUser?.permissions?.canViewDashboard || isReadOnlyAccount;
  const canViewReports = isAdmin || loggedUser?.permissions?.canViewReports || isReadOnlyAccount;
  const canViewPersonnel = isAdmin || loggedUser?.permissions?.canViewPersonnel || isReadOnlyAccount;
  const canManageSettings = !isReadOnlyAccount;
  const canEditProduction = !isReadOnlyAccount;
  const canManagePersonnel = !isReadOnlyAccount;

  // Corte de fita derived States & Memos
  const filteredRibbonEntries = useMemo(() => {
    return ribbonEntries.filter(entry => {
      const matchOp = ribbonFilterOperator === 'all' || entry.operator === ribbonFilterOperator;
      const matchShift = ribbonFilterShift === 'all' || entry.shift === ribbonFilterShift;
      const matchJumboType = ribbonFilterJumboType === 'all' || entry.jumboType === ribbonFilterJumboType;
      return matchOp && matchShift && matchJumboType;
    });
  }, [ribbonEntries, ribbonFilterOperator, ribbonFilterShift, ribbonFilterJumboType]);

  const ribbonStats = useMemo(() => {
    let totProd = 0;
    let totRej = 0;
    let totWaste = 0;
    let totJumbo = 0;
    let totWasteM2 = 0;
    
    filteredRibbonEntries.forEach(e => {
      totProd += e.producedM2 || 0;
      totRej += e.rejectedM2 || 0;
      totWaste += e.wasteWeight || 0;
      totJumbo += e.jumboM2 || 0;
      totWasteM2 += calculateLostM2(e.wasteWeight || 0, e.jumboType || '');
    });

    const yieldPercent = totProd > 0 ? ((totProd - totRej) / totProd) * 100 : 0;
    const lossPercent = totProd > 0 ? (totRej / totProd) * 100 : 0;
    const jumboCount = totJumbo / 8200;

    return {
      totProd,
      totRej,
      totWaste,
      totWasteM2,
      totJumbo,
      yieldPercent,
      lossPercent,
      jumboCount
    };
  }, [filteredRibbonEntries]);

  const ribbonDailyTrendData = useMemo(() => {
    return [...filteredRibbonEntries].reverse().map(e => {
      const prodLiquida = (e.producedM2 || 0) - (e.rejectedM2 || 0);
      const t1 = e.m2Tipo1 || 0;
      const t2 = e.m2Tipo2 || 0;
      // Trata registros legados se houver rejei√ß√£o preenchida mas sem subdivis√£o
      const hasOldRej = (e.rejectedM2 || 0) > 0 && (t1 + t2) === 0;
      return {
        label: e.date.split('-').slice(1).reverse().join('/'),
        tipo1: hasOldRej ? (e.rejectedM2 || 0) : t1,
        tipo2: t2,
        residuoWeight: e.wasteWeight || 0,
        residuoM2: calculateLostM2(e.wasteWeight || 0, e.jumboType || ''),
        prod: prodLiquida > 0 ? prodLiquida : 0,
        date: e.date
      };
    });
  }, [filteredRibbonEntries]);

  const ribbonScatterData = useMemo(() => {
    const operatorMap: Record<string, { name: string; prod: number; wastes: number; stopsProcess: number; color: string }> = {};
    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f43f5e', '#06b6d4'];
    
    filteredRibbonEntries.forEach(e => {
      const op = e.operator || 'N/A';
      if (!operatorMap[op]) {
        operatorMap[op] = {
          name: op,
          prod: 0,
          wastes: 0,
          stopsProcess: 0,
          color: colors[Object.keys(operatorMap).length % colors.length]
        };
      }
      operatorMap[op].prod += (e.producedM2 || 0) - (e.rejectedM2 || 0); // Produ√ß√£o L√≠quida
      operatorMap[op].wastes += e.wasteWeight || 0;
      const pMin = e.manutencaoMin || e.stoppedMinutes || 0; // standard process stop min or overall fallback
      operatorMap[op].stopsProcess += pMin;
    });

    return Object.values(operatorMap);
  }, [filteredRibbonEntries]);

  const ribbonProportionalStopsData = useMemo(() => {
    const stopsGroupMap: Record<string, { name: string, manut: number, proc: number, outros: number }> = {};
    filteredRibbonEntries.forEach(e => {
      const key = ribbonStopsGroupBy === 'machine' ? (e.machine || 'Sem M√°quina') : (e.operator || 'Sem Operador');
      if (!stopsGroupMap[key]) {
        stopsGroupMap[key] = { name: key, manut: 0, proc: 0, outros: 0 };
      }
      stopsGroupMap[key].manut += (e.manutencaoMin || 0);
      stopsGroupMap[key].proc += (e.processoMin || 0);
      stopsGroupMap[key].outros += (e.outrosMin || 0);
    });
    return Object.values(stopsGroupMap).map(d => {
      const total = d.manut + d.proc + d.outros;
      return {
        name: d.name,
        manutPct: total > 0 ? Number(((d.manut / total) * 100).toFixed(1)) : 0,
        procPct: total > 0 ? Number(((d.proc / total) * 100).toFixed(1)) : 0,
        outrosPct: total > 0 ? Number(((d.outros / total) * 100).toFixed(1)) : 0,
        totalMin: total
      };
    }).filter(d => d.totalMin > 0);
  }, [filteredRibbonEntries, ribbonStopsGroupBy]);

  const ribbonDashboardStats = useMemo(() => {
    const currentGoal = ribbonGoals[dashboardMonth] || 1000000;
    const res = { 
      month: 0, 
      yesterday: 0, 
      goal: currentGoal, 
      projection: 0, 
      avgReq: 0, 
      prevMonthTotal: 0, 
      prevMonthGoal: 0,
      totWaste: 0,
      totJumbo: 0,
      yieldPercent: 100,
      lossPercent: 0,
      stoppedMinutes: 0,
      jumboBreakdown: {} as Record<string, { used: number; rolls: number; waste: number }>
    };

    const [year, month] = dashboardMonth.split('-').map(Number);
    const prevDate = new Date(year, month - 2, 1);
    const prevMonthStr = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;
    
    ribbonEntries.filter(e => e && typeof e.date === 'string' && e.date.startsWith(prevMonthStr)).forEach(e => {
      res.prevMonthTotal += (e.producedM2 || 0);
    });
    res.prevMonthGoal = ribbonGoals[prevMonthStr] || 1000000;

    const yesterdayDate = new Date(); yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterdayStr = yesterdayDate.toLocaleDateString('sv-SE');
    ribbonEntries.filter(e => e && typeof e.date === 'string' && e.date === yesterdayStr).forEach(e => {
      res.yesterday += (e.producedM2 || 0);
    });

    const activePeriodEntries = ribbonEntries.filter(e => e && typeof e.date === 'string' && e.date.startsWith(dashboardMonth));

    activePeriodEntries.forEach(e => {
      res.month += (e.producedM2 || 0);
      res.totWaste += (e.wasteWeight || 0);
      res.totJumbo += (e.jumboM2 || 0);
      res.stoppedMinutes += (e.stoppedMinutes || 0);

      const type = e.jumboType || 'Outros';
      if (!res.jumboBreakdown[type]) {
        res.jumboBreakdown[type] = { used: 0, rolls: 0, waste: 0 };
      }
      res.jumboBreakdown[type].used += (e.jumboM2 || 0);
      res.jumboBreakdown[type].waste += (e.wasteWeight || 0);
      
      if (e.jumboItems && e.jumboItems.length > 0) {
        e.jumboItems.forEach(item => {
          res.jumboBreakdown[type].rolls += (item.rollsCount || 0);
        });
      } else if (e.rollsCount) {
        res.jumboBreakdown[type].rolls += e.rollsCount;
      }
    });

    res.yieldPercent = res.month > 0 ? ((res.month - res.totWaste) / res.month) * 100 : 100;
    res.lossPercent = res.month > 0 ? (res.totWaste / res.month) * 100 : 0;

    const today = new Date();
    const [yNum, mNum] = dashboardMonth.split('-').map(Number);
    const totalDaysInMonth = (yNum && mNum) ? new Date(yNum, mNum, 0).getDate() : 30;
    const currentDay = dashboardMonth === today.toISOString().slice(0, 7) ? today.getDate() : totalDaysInMonth;
    res.projection = (res.month / Math.max(1, currentDay)) * totalDaysInMonth;
    res.avgReq = Math.max(0, (res.goal - res.month) / Math.max(1, totalDaysInMonth - currentDay));
    
    return res;
  }, [ribbonEntries, dashboardMonth, ribbonGoals]);

  const ribbonDailyShareMetrics = useMemo(() => {
    const dayEntries = ribbonEntries.filter(e => e.date === ribbonShareDate);
    
    let totProd = 0;
    let totRej = 0;
    let totWaste = 0;
    let totJumbo = 0;
    let totRolls = 0;
    let totStops = 0;
    const stopsList: string[] = [];

    dayEntries.forEach(e => {
      totProd += e.producedM2 || 0;
      totRej += e.rejectedM2 || 0;
      totWaste += e.wasteWeight || 0;
      totJumbo += e.jumboM2 || 0;
      
      let entryRolls = 0;
      if (e.jumboItems && e.jumboItems.length > 0) {
        e.jumboItems.forEach(it => entryRolls += (it.rollsCount || 0));
      } else {
        entryRolls = e.rollsCount || 0;
      }
      totRolls += entryRolls;

      if (e.stoppedMinutes && e.stoppedMinutes > 0) {
        totStops += e.stoppedMinutes;
        stopsList.push(`${e.operator}: ${e.stoppedMinutes}min (${e.stoppedReason || 'N√£o justificado'})`);
      }
    });

    const yieldPercent = totProd > 0 ? ((totProd - totRej) / totProd) * 100 : 100;

    return {
      totProd,
      totRej,
      totWaste,
      totJumbo,
      totRolls,
      totStops,
      yieldPercent,
      stopsText: stopsList.length > 0 ? stopsList.join(' | ') : 'Nenhuma parada',
      entries: dayEntries
    };
  }, [ribbonEntries, ribbonShareDate]);

  const copyRibbonOutlookToClipboard = () => {
    const formattedDate = ribbonShareDate.split('-').reverse().join('/');
    const text = `*RELAT√ìRIO DI√ÅRIO DE PRODU√á√ÉO - CORTE DE FITA (${formattedDate})*

üìä *Indicadores Consolidados:*
- M¬≤ Produzido Total: ${formatM2(ribbonDailyShareMetrics.totProd)}
- Jumbo Consumido: ${formatM2(ribbonDailyShareMetrics.totJumbo)}
- Ajuste Aproveitamento: ${ribbonDailyShareMetrics.yieldPercent.toFixed(2).replace('.', ',')}%
- Rolos Finais Produzidos: ${ribbonDailyShareMetrics.totRolls.toLocaleString('pt-BR')} rolos
- Res√≠duo Lixo Coletado: ${formatWeight(ribbonDailyShareMetrics.totWaste)}
- Tempo Total de Paradas: ${formatMinutes(ribbonDailyShareMetrics.totStops)}

‚ö†Ô∏è *Detalhamento de Paradas:*
${ribbonDailyShareMetrics.stopsText}

üìù *Lan√ßamentos Registrados:*
${ribbonDailyShareMetrics.entries.map((e, idx) => {
  return `${idx + 1}. Operador: ${e.operator} | Turno: ${e.shift} | M√°quina: ${e.machine || 'Cortadeira'} | Jumbo: ${e.jumboType} | Prod: ${formatM2(e.producedM2)} | Lixo: ${formatWeight(e.wasteWeight)}`;
}).join('\n') || 'Nenhum lan√ßamento para a data selecionada.'}

--
Gerado automaticamente pelo Sistema de Gest√£o Manupackaging.`;

    navigator.clipboard.writeText(text)
      .then(() => alert('Relat√≥rio de Corte de Fita copiado com sucesso! Cole diretamente no seu Outlook.'))
      .catch(err => {
        console.error('Erro ao copiar para clipboard:', err);
        alert('Erro ao copiar relat√≥rio. Favor copiar manualmente.');
      });
  };

  const handleAddRibbonStop = (type: 'manutencao' | 'processo' | 'outros') => {
    const newItem: StopItem = {
      id: `stop-${Date.now()}-${Math.random()}`,
      de: '',
      ate: '',
      motivo: '',
      explicacao: ''
    };
    if (type === 'manutencao') {
      setRibbonManutencaoStops(prev => [...prev, newItem]);
    } else if (type === 'processo') {
      setRibbonProcessoStops(prev => [...prev, newItem]);
    } else {
      setRibbonOutrosStops(prev => [...prev, newItem]);
    }
  };

  const handleUpdateRibbonStop = (type: 'manutencao' | 'processo' | 'outros', id: string, field: keyof StopItem, value: string) => {
    const updateFn = (prev: StopItem[]) => prev.map(item => item.id === id ? { ...item, [field]: value } : item);
    if (type === 'manutencao') {
      setRibbonManutencaoStops(updateFn);
    } else if (type === 'processo') {
      setRibbonProcessoStops(updateFn);
    } else {
      setRibbonOutrosStops(updateFn);
    }
  };

  const handleRemoveRibbonStop = (type: 'manutencao' | 'processo' | 'outros', id: string) => {
    const filterFn = (prev: StopItem[]) => prev.filter(item => item.id !== id);
    if (type === 'manutencao') {
      setRibbonManutencaoStops(filterFn);
    } else if (type === 'processo') {
      setRibbonProcessoStops(filterFn);
    } else {
      setRibbonOutrosStops(filterFn);
    }
  };

  // Handle ribbon entry saving
  const handleSaveRibbonEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEditProduction) return;

    if (!ribbonOperator || !ribbonShift) {
      alert('Por favor, preencha todos os campos obrigat√≥rios!');
      return;
    }

    const prodVal = parseFloat(ribbonProducedM2) || 0;
    const rejVal = parseFloat(ribbonRejectedM2) || 0;
    const wasteVal = parseFloat(ribbonWasteWeight) || 0;
    const jumboVal = parseFloat(ribbonJumboM2) || 0;

    const manutencaoMinCalculado = calcTotalMinutes(ribbonManutencaoStops);
    const processoMinCalculado = calcTotalMinutes(ribbonProcessoStops);
    const outrosMinCalculado = calcTotalMinutes(ribbonOutrosStops);
    const totalStoppedMinutes = manutencaoMinCalculado + processoMinCalculado + outrosMinCalculado;

    let parts: string[] = [];
    if (manutencaoMinCalculado > 0) parts.push(`Manuten√ß√£o: ${manutencaoMinCalculado}min`);
    if (processoMinCalculado > 0) parts.push(`Processo: ${processoMinCalculado}min`);
    if (outrosMinCalculado > 0) parts.push(`Outros: ${outrosMinCalculado}min`);
    const ribbonStoppedReasonCombined = parts.join(', ') || 'Nenhum';

    const entryId = editingRibbonId || `ribbon_${Date.now()}`;
    const payload: RibbonCuttingEntry = {
      id: entryId,
      date: ribbonDate,
      operator: ribbonOperator,
      shift: ribbonShift,
      producedM2: prodVal,
      rejectedM2: rejVal,
      wasteWeight: wasteVal,
      jumboM2: jumboVal,
      jumboType: ribbonJumboType,
      updatedAt: new Date().toISOString(),
      userId: currentUser?.uid || 'anonymous',
      machine: ribbonMachine || undefined,
      rollsCount: ribbonRollsCount ? parseInt(ribbonRollsCount) || 0 : undefined,
      rollWidth: ribbonRollWidth ? parseFloat(ribbonRollWidth) || 0 : undefined,
      rollLength: ribbonRollLength ? parseFloat(ribbonRollLength) || 0 : undefined,
      orderNumber: ribbonOrderNumber || undefined,
      rollsTipo1: ribbonRollsTipo1 ? parseInt(ribbonRollsTipo1) || 0 : undefined,
      rollsTipo2: ribbonRollsTipo2 ? parseInt(ribbonRollsTipo2) || 0 : undefined,
      m2Tipo1: ribbonM2Tipo1 ? parseFloat(ribbonM2Tipo1) || 0 : undefined,
      m2Tipo2: ribbonM2Tipo2 ? parseFloat(ribbonM2Tipo2) || 0 : undefined,
      jumboItems: ribbonJumboItems.length > 0 ? ribbonJumboItems : undefined,
      stoppedMinutes: totalStoppedMinutes,
      stoppedReason: ribbonStoppedReasonCombined,
      manutencaoMin: manutencaoMinCalculado,
      manutencaoMotivo: ribbonManutencaoStops.length > 0 ? JSON.stringify(ribbonManutencaoStops) : '',
      processoMin: processoMinCalculado,
      processoMotivo: ribbonProcessoStops.length > 0 ? JSON.stringify(ribbonProcessoStops) : '',
      outrosMin: outrosMinCalculado,
      outrosMotivo: ribbonOutrosStops.length > 0 ? JSON.stringify(ribbonOutrosStops) : '',
    };

    try {
      await setDoc(doc(db, 'ribbon_cutting_entries', entryId), cleanUndefined(payload));
      alert(editingRibbonId ? 'Lan√ßamento de Corte de Fita atualizado!' : 'Lan√ßamento de Corte de Fita cadastrado!');
      setRibbonOperator('');
      setRibbonShift('');
      setRibbonProducedM2('');
      setRibbonRejectedM2('');
      setRibbonWasteWeight('');
      setRibbonJumboM2('');
      setRibbonJumboType('');
      setRibbonMachine('');
      setRibbonRollsCount('');
      setRibbonRollWidth('');
      setRibbonRollLength('');
      setRibbonOrderNumber('');
      setRibbonRollsTipo1('');
      setRibbonRollsTipo2('');
      setRibbonM2Tipo1('');
      setRibbonM2Tipo2('');
      setRibbonStoppedMinutes('');
      setRibbonStoppedReason('');
      setRibbonManutencaoStops([]);
      setRibbonProcessoStops([]);
      setRibbonOutrosStops([]);
      setRibbonJumboItems([]);
      setEditingRibbonId(null);
      setShowRibbonForm(false);
    } catch (err) {
      console.error('Erro ao salvar no Firestore:', err);
      try { handleFirestoreError(err, OperationType.WRITE, `ribbon_cutting_entries/${entryId}`); } catch (_) {}
      alert('Erro ao salvar lan√ßamento.');
    }
  };

  const handleGenerateMockRibbonEntries = async () => {
    if (!canEditProduction) {
      alert('Voc√™ n√£o tem permiss√£o para realizar esta opera√ß√£o.');
      return;
    }
    setIsGeneratingMock(true);
    try {
      const jumboTypes = ['AR9', 'AA 38', 'AS 50', 'HOTMAILT'];
      const fakeOperators = operators.length > 0 ? operators : ['Carlos Silva', 'Marcos Santos', 'Jo√£o Oliveira', 'Felipe Lima', 'Reginaldo Costa'];
      const fakeShifts = availableShifts.length > 0 ? availableShifts.map(s => s.name) : ['A', 'B', 'C', 'D'];
      const machines = ['Ghezze', 'Lintech', 'Wutec'];

      const batch = writeBatch(db);
      const today = new Date();

      for (let i = 1; i <= 20; i++) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];

        const operator = fakeOperators[Math.floor(Math.random() * fakeOperators.length)];
        const shift = fakeShifts[Math.floor(Math.random() * fakeShifts.length)];
        const machine = machines[Math.floor(Math.random() * machines.length)];
        const jumboType = jumboTypes[Math.floor(Math.random() * jumboTypes.length)];

        const rollsCount = Math.floor(Math.random() * 300) + 150;
        const rollWidth = 0.048;
        const rollLength = 1000;

        const producedM2 = rollsCount * rollWidth * rollLength;
        const rejectedM2 = Math.floor(Math.random() * 200) + 50;
        const wasteWeight = Math.floor(Math.random() * 250) + 50;
        const jumboM2 = Math.round(producedM2 + rejectedM2 + (wasteWeight * 2));
        const orderNumber = String(10000 + Math.floor(Math.random() * 9000));

        const jumboItem = {
          id: Math.random().toString(36).substring(2),
          jumboType,
          jumboM2,
          producedM2,
          rejectedM2,
          wasteWeight,
          orderNumber,
          rollsCount,
          rollWidth: 48,
          rollLength,
          rollsTipo1: rollsCount,
          rollsTipo2: 0,
          m2Tipo1: producedM2,
          m2Tipo2: 0
        };

        const payload = {
          date: dateStr,
          operator,
          shift,
          machine,
          producedM2,
          rejectedM2,
          wasteWeight,
          jumboM2,
          jumboType,
          rollsCount,
          rollWidth: 48,
          rollLength,
          orderNumber,
          rollsTipo1: rollsCount,
          rollsTipo2: 0,
          m2Tipo1: producedM2,
          m2Tipo2: 0,
          stoppedMinutes: Math.floor(Math.random() * 60),
          stoppedReason: 'Ajustes programados / Carga de jumbo',
          jumboItems: [jumboItem],
          updatedAt: new Date().toISOString(),
          userId: currentUser?.uid || 'test-user'
        };

        const docRef = doc(collection(db, 'ribbon_cutting_entries'));
        batch.set(docRef, payload);
      }

      await batch.commit();
      alert('20 Lan√ßamentos de teste gerados com sucesso!');
    } catch (err) {
      console.error('Erro ao gerar lan√ßamentos de teste:', err);
      alert('Erro ao se conectar ou enviar os lan√ßamentos para o banco de dados.');
    } finally {
      setIsGeneratingMock(false);
    }
  };

  const handleDeleteRibbonEntry = (id: string) => {
    if (!canEditProduction) return;
    openConfirm(
      'Confirmar Exclus√£o',
      'Deseja realmente excluir este lan√ßamento do setor de Corte de Fita? Esta a√ß√£o √© permanente e remover√° as informa√ß√µes do sistema e do banco de dados.',
      async () => {
        try {
          await deleteDoc(doc(db, 'ribbon_cutting_entries', id));
          setSelectedRibbonIds(prev => prev.filter(item => item !== id));
        } catch (err) {
          console.error('Erro ao excluir no Firestore:', err);
          try { handleFirestoreError(err, OperationType.DELETE, `ribbon_cutting_entries/${id}`); } catch (_) {}
          alert('Erro ao excluir lan√ßamento.');
        }
      }
    );
  };

  const handleDeleteSelectedRibbon = () => {
    if (!canEditProduction) return;
    if (selectedRibbonIds.length === 0) return;

    openConfirm(
      'Confirmar Exclus√£o em Massa',
      `Deseja realmente excluir os ${selectedRibbonIds.length} lan√ßamentos selecionados do setor de Corte de Fita? Esta a√ß√£o √© permanente e remover√° as informa√ß√µes do sistema e do banco de dados.`,
      async () => {
        try {
          setIsInitializing(true);
          const batches = [];
          for (let i = 0; i < selectedRibbonIds.length; i += 500) {
            const batch = writeBatch(db);
            selectedRibbonIds.slice(i, i + 500).forEach(id => {
              batch.delete(doc(db, 'ribbon_cutting_entries', id));
            });
            batches.push(batch.commit());
          }
          await Promise.all(batches);
          const count = selectedRibbonIds.length;
          setSelectedRibbonIds([]);
          addNotification(`${count} registros de Corte de Fita exclu√≠dos com sucesso.`);
        } catch (error) {
          console.error('Error deleting ribbon batch:', error);
          alert('Erro ao excluir registros. Verifique sua conex√£o.');
        } finally {
          setIsInitializing(false);
        }
      },
      'danger'
    );
  };

  const handleEditRibbonEntry = (entry: RibbonCuttingEntry) => {
    setEditingRibbonId(entry.id);
    setRibbonDate(entry.date);
    setRibbonOperator(entry.operator);
    setRibbonShift(entry.shift);
    setRibbonProducedM2(String(entry.producedM2));
    setRibbonRejectedM2(String(entry.rejectedM2));
    setRibbonWasteWeight(String(entry.wasteWeight));
    setRibbonJumboM2(String(entry.jumboM2));
    setRibbonJumboType(entry.jumboType || '');
    setRibbonMachine(entry.machine || '');
    setRibbonRollsCount(entry.rollsCount ? String(entry.rollsCount) : '');
    setRibbonRollWidth(entry.rollWidth ? String(entry.rollWidth) : '');
    setRibbonRollLength(entry.rollLength ? String(entry.rollLength) : '');
    setRibbonOrderNumber(entry.orderNumber || '');
    setRibbonRollsTipo1(entry.rollsTipo1 ? String(entry.rollsTipo1) : '');
    setRibbonRollsTipo2(entry.rollsTipo2 ? String(entry.rollsTipo2) : '');
    setRibbonM2Tipo1(entry.m2Tipo1 ? String(entry.m2Tipo1) : '');
    setRibbonM2Tipo2(entry.m2Tipo2 ? String(entry.m2Tipo2) : '');
    setRibbonStoppedMinutes(entry.stoppedMinutes ? String(entry.stoppedMinutes) : '');
    setRibbonStoppedReason(entry.stoppedReason || '');
    setRibbonManutencaoStops(parseMotivo(entry.manutencaoMotivo, entry.manutencaoMin || 0));
    setRibbonProcessoStops(parseMotivo(entry.processoMotivo, entry.processoMin || 0));
    setRibbonOutrosStops(parseMotivo(entry.outrosMotivo, entry.outrosMin || 0));
    setRibbonJumboItems(entry.jumboItems || []);
    setShowRibbonForm(true);
    window.scrollTo({ top: 300, behavior: 'smooth' });
  };

  const exportRibbonToExcel = () => {
    if (filteredRibbonEntries.length === 0) {
      alert('Nenhum registro para exportar.');
      return;
    }
    const dataToExport = filteredRibbonEntries.map(e => {
      const lostM2Value = e.wasteWeight > 0 && e.jumboType ? calculateLostM2(e.wasteWeight, e.jumboType) : 0;
      return {
        'Data': e.date.split('-').reverse().join('/'),
        'Operador': e.operator,
        'Turno': e.shift,
        'Tipo de Jumbo': e.jumboType || '',
        'M¬≤ Produzido': e.producedM2,
        'M¬≤ N√£o Conforme': e.rejectedM2,
        'Aproveitamento (%)': e.producedM2 > 0 ? (((e.producedM2 - e.rejectedM2) / e.producedM2) * 100).toFixed(2) + '%' : '0%',
        'Lixo peso (Kg)': e.wasteWeight,
        'Lixo Perdido (m¬≤ Perda)': lostM2Value > 0 ? parseFloat(lostM2Value.toFixed(1)) : 0,
        'Jumbos Metros Quadrados': e.jumboM2,
        'Jumbos Equivalentes (Qtd)': (e.jumboM2 / 8200).toFixed(2)
      };
    });

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Corte de Fita");
    XLSX.writeFile(wb, `corte_fita_export_${new Date().toLocaleDateString('en-CA')}.xlsx`);
  };

  // Centraliza a filtragem de dados para respeitar os novos filtros
  const filteredDashboardData = useMemo(() => {
    if (!Array.isArray(productionData)) return [];
    return productionData.filter(e => {
      if (!e || !e.date) return false;

      // Exclui lan√ßamentos do Cast 2 para os meses de Maio e Junho apenas se forem registros antigos importados/existentes
      const isExcludedMonth = e.date.substring(5, 7) === '05' || e.date.substring(5, 7) === '06';
      const isExistingPastEntry = !e.updatedAt || e.updatedAt < '2026-06-12T17:44:00Z';
      if (isExcludedMonth && e.machine.toLowerCase().includes('cast 2') && isExistingPastEntry) {
        return false;
      }

      const matchRange = (filterStartDate && filterEndDate) 
        ? (e.date >= filterStartDate && e.date <= filterEndDate) 
        : true;
      const matchDay = (filterDay && !(filterStartDate && filterEndDate)) ? e.date === filterDay : true;
      const matchMonth = (!filterDay && !(filterStartDate && filterEndDate)) ? e.date.startsWith(dashboardMonth) : true;
      const matchOperator = filterOperator === 'Todos' ? true : e.operator === filterOperator;
      return matchRange && matchDay && matchMonth && matchOperator;
    });
  }, [productionData, dashboardMonth, filterOperator, filterDay, filterStartDate, filterEndDate]);

  const pdfDailyTrendData = useMemo(() => {
    const dailyTrendMap: Record<string, { date: string, label: string, ecoBP: number, ecoBM: number, borra: number, prod: number }> = {};
    filteredDashboardData.forEach(e => {
      const d = e.date;
      const label = d.split('-').reverse().slice(0, 2).join('/');
      if (!dailyTrendMap[d]) {
        dailyTrendMap[d] = { date: d, label, ecoBP: 0, ecoBM: 0, borra: 0, prod: 0 };
      }
      dailyTrendMap[d].ecoBP += (e.ecoBP || 0);
      dailyTrendMap[d].ecoBM += (e.ecoBM || 0);
      dailyTrendMap[d].borra += (e.borraTotal || 0);
      if (!e.machine.toLowerCase().includes('erema')) {
        dailyTrendMap[d].prod += (e.netWeight || 0);
      }
    });
    return Object.values(dailyTrendMap).sort((a, b) => a.date.localeCompare(b.date));
  }, [filteredDashboardData]);

  const pdfScatterData = useMemo(() => {
    const scatterMap: Record<string, { name: string, prod: number, wastes: number, stopsProcess: number, color: string }> = {};
    filteredDashboardData.forEach((e, idx) => {
      const op = e.operator;
      if (!scatterMap[op]) {
        scatterMap[op] = { name: op, prod: 0, wastes: 0, stopsProcess: 0, color: COLORS[idx % COLORS.length] };
      }
      if (!e.machine.toLowerCase().includes('erema')) {
        scatterMap[op].prod += (e.netWeight || 0);
      }
      scatterMap[op].wastes += (e.ecoBP || 0) + (e.ecoBM || 0) + (e.borraTotal || 0);
      scatterMap[op].stopsProcess += (e.processoMin || 0);
    });
    return Object.values(scatterMap).filter(d => d.prod > 0 || d.wastes > 0);
  }, [filteredDashboardData]);

  const pdfProportionalStopsData = useMemo(() => {
    const stopsGroupMap: Record<string, { name: string, manut: number, proc: number, outros: number }> = {};
    filteredDashboardData.forEach(e => {
      const key = e.machine;
      if (!stopsGroupMap[key]) {
        stopsGroupMap[key] = { name: key, manut: 0, proc: 0, outros: 0 };
      }
      stopsGroupMap[key].manut += (e.manutencaoMin || 0);
      stopsGroupMap[key].proc += (e.processoMin || 0);
      stopsGroupMap[key].outros += (e.outrosMin || 0);
    });

    // Inje√ß√£o de minutos de m√°quina parada do Cast 2 de 01/06 a 25/06 (junho/2026)
    if (dashboardMonth === '2026-06') {
      const key = 'Cast 2';
      if (!stopsGroupMap[key]) {
        stopsGroupMap[key] = { name: key, manut: 0, proc: 0, outros: 0 };
      }
      stopsGroupMap[key].outros += 34560; // 24 dias * 1440 min de inatividade
    }

    return Object.values(stopsGroupMap).map(d => {
      const total = d.manut + d.proc + d.outros;
      return {
        name: d.name,
        manutPct: total > 0 ? Number(((d.manut / total) * 100).toFixed(1)) : 0,
        procPct: total > 0 ? Number(((d.proc / total) * 100).toFixed(1)) : 0,
        outrosPct: total > 0 ? Number(((d.outros / total) * 100).toFixed(1)) : 0,
        totalMin: total
      };
    }).filter(d => d.totalMin > 0);
  }, [filteredDashboardData, dashboardMonth]);

  const pdfMassBalanceData = useMemo(() => {
    const extruderEcoB = filteredDashboardData.filter(e => !e.machine.toLowerCase().includes('erema')).reduce((acc, e) => acc + (e.ecoBP || 0) + (e.ecoBM || 0), 0);
    const eremaRecycled = filteredDashboardData.filter(e => e.machine.toLowerCase().includes('erema')).reduce((acc, e) => acc + (e.netWeight || 0), 0);
    return [
      { name: 'Eco B Gerado (Cast)', value: extruderEcoB },
      { name: 'Reciclado (Erema)', value: eremaRecycled }
    ].filter(d => d.value > 0);
  }, [filteredDashboardData]);

  const dashboardStats = useMemo(() => {
    const currentGoal = goals[dashboardMonth] || GOAL_VALUE;
    const res = { month: 0, eremaMonth: 0, yesterday: 0, goal: currentGoal, projection: 0, avgReq: 0, prevMonthTotal: 0, prevMonthGoal: 0 };
    
    // Dados para o m√™s anterior (comparativo)
    const [year, month] = dashboardMonth.split('-').map(Number);
    const prevDate = new Date(year, month - 2, 1);
    const prevMonthStr = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;
    productionData.filter(e => e && typeof e.date === 'string' && e.date.startsWith(prevMonthStr)).forEach(e => { 
      // Se o m√™s anterior for junho, exclui Cast 2 antigos
      const isPrevMonthJune = prevMonthStr.endsWith('-06');
      const isExistingPastEntry = !e.updatedAt || e.updatedAt < '2026-06-12T17:44:00Z';
      if (isPrevMonthJune && e.machine.toLowerCase().includes('cast 2') && isExistingPastEntry) {
        return;
      }
      if (!e.machine.toLowerCase().includes('erema')) res.prevMonthTotal += (e.netWeight || 0); 
    });
    res.prevMonthGoal = goals[prevMonthStr] || GOAL_VALUE;

    // Produ√ß√£o "Ontem" (Dia anterior ao atual real)
    const yesterdayDate = new Date(); yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterdayStr = yesterdayDate.toLocaleDateString('sv-SE');
    productionData.filter(e => e && typeof e.date === 'string' && e.date === yesterdayStr).forEach(e => { 
      // Se ontem foi em junho, exclui Cast 2 antigos
      const isYesterdayJune = yesterdayStr.includes('-06-');
      const isExistingPastEntry = !e.updatedAt || e.updatedAt < '2026-06-12T17:44:00Z';
      if (isYesterdayJune && e.machine.toLowerCase().includes('cast 2') && isExistingPastEntry) {
        return;
      }
      if (!e.machine.toLowerCase().includes('erema')) res.yesterday += (e.netWeight || 0); 
    });

    // L√≥gica principal baseada nos dados filtrados (Dia/Operador/M√™s/Ano)
    filteredDashboardData.forEach(e => { 
      if (e.machine.toLowerCase().includes('erema')) res.eremaMonth += (e.netWeight || 0); 
      else res.month += (e.netWeight || 0); 
    });

    const today = new Date();
    const [yNum, mNum] = dashboardMonth.split('-').map(Number);
    const totalDaysInMonth = (yNum && mNum) ? new Date(yNum, mNum, 0).getDate() : 30;
    const currentDay = dashboardMonth === today.toISOString().slice(0, 7) ? today.getDate() : totalDaysInMonth;
    res.projection = (res.month / Math.max(1, currentDay)) * totalDaysInMonth;
    res.avgReq = Math.max(0, (res.goal - res.month) / Math.max(1, totalDaysInMonth - currentDay));
    return res;
  }, [productionData, dashboardMonth, goals, filteredDashboardData]);

  const dailyShareMetrics = useMemo(() => {
    const records = productionData.filter(e => e.date === shareDate);
    
    const isNightShift = (sh: string) => {
      const s = (sh || '').toLowerCase();
      return s.includes('noturno') || s.includes('noite') || s.includes('n1') || s.includes('n2');
    };

    const filterByMachineAndShift = (machine: string, isNight: boolean) => {
      return records.filter(e => {
        const matchMachine = e.machine.toLowerCase().includes(machine.toLowerCase());
        const matchNight = isNightShift(e.shift);
        return matchMachine && (isNight ? matchNight : !matchNight);
      });
    };

    // Cast 1 Dia / Noite
    const c1D = filterByMachineAndShift('Cast 1', false);
    const c1N = filterByMachineAndShift('Cast 1', true);

    // Cast 2 Dia / Noite
    const c2D = filterByMachineAndShift('Cast 2', false);
    const c2N = filterByMachineAndShift('Cast 2', true);

    // Erema Dia / Noite
    const erD = filterByMachineAndShift('erema', false);
    const erN = filterByMachineAndShift('erema', true);

    const formatMotivoForSharing = (motivoRaw: string | undefined): string => {
      if (!motivoRaw) return '';
      const trimmed = motivoRaw.trim();
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          if (parsed.length === 0) return '';
          return parsed.map((item: any) => {
            const de = (item.de || '').trim();
            const ate = (item.ate || '').trim();
            const motivo = (item.motivo || item.keyword || '').trim();
            const explicacao = (item.explicacao || item.justification || item.observacao || item.observacoes || item.descricao || '').trim();
            let desc = '';
            if (motivo && explicacao && motivo.toLowerCase() !== explicacao.toLowerCase()) {
              desc = `${motivo} (${explicacao})`;
            } else {
              desc = explicacao || motivo || 'Sem motivo';
            }
            if (de && ate) {
              return `${de} √†s ${ate}${desc ? `: ${desc}` : ''}`;
            }
            return desc || 'Sem motivo';
          }).filter(Boolean).join('; ');
        }
      } catch (e) {
        // Fallback
      }
      return trimmed;
    };

    const formatStopsForEmail = (entries: typeof records) => {
      let isNoWork = false;
      let noWorkReason = '';
      
      const allStopsList: { de: string; ate: string; motivo: string; min: number }[] = [];
      let totalStops = 0;

      const getDiffMin = (de: string, ate: string) => {
        if (!de || !ate) return 0;
        try {
          const [hStart, mStart] = de.split(':').map(Number);
          const [hEnd, mEnd] = ate.split(':').map(Number);
          if (isNaN(hStart) || isNaN(mStart) || isNaN(hEnd) || isNaN(mEnd)) return 0;
          let diff = (hEnd * 60 + mEnd) - (hStart * 60 + mStart);
          if (diff < 0) diff += 24 * 60;
          return diff;
        } catch (err) {
          return 0;
        }
      };

      const parseStopsJSON = (raw: string | undefined, defaultCategory: string, defaultMin: number): { de: string; ate: string; motivo: string }[] => {
        if (!raw) {
          if (defaultMin > 0) {
            return [{ de: '', ate: '', motivo: defaultCategory }];
          }
          return [];
        }
        const trimmed = raw.trim();
        if (!trimmed) {
          if (defaultMin > 0) {
            return [{ de: '', ate: '', motivo: defaultCategory }];
          }
          return [];
        }
        try {
          const parsed = JSON.parse(trimmed);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const list = parsed.map((item: any) => {
              const de = (item.de || '').trim();
              const ate = (item.ate || '').trim();
              const motivoStr = (item.motivo || item.descricao || item.tipo || '').trim();
              const expStr = (item.explicacao || item.observacao || item.justificativa || item.causa || '').trim();
              const fullMotivo = [motivoStr, expStr].filter(Boolean).join(' - ');
              return {
                de,
                ate,
                motivo: fullMotivo || defaultCategory
              };
            }).filter(item => item.de || item.ate || item.motivo);

            if (list.length > 0) return list;
          }
        } catch (e) {
          // Plain string fallback
          return [{ de: '', ate: '', motivo: trimmed }];
        }
        
        if (defaultMin > 0) {
          return [{ de: '', ate: '', motivo: defaultCategory }];
        }
        return [];
      };

      entries.forEach(e => {
        if (e.isNoWorkDay) {
          isNoWork = true;
          if (e.noWorkReason) {
            noWorkReason = e.noWorkReason;
          }
        }

        const mMin = Number(e.manutencaoMin || 0);
        const pMin = Number(e.processoMin || 0);
        const oMin = Number(e.outrosMin || 0);
        totalStops += (mMin + pMin + oMin);

        const mList = parseStopsJSON(e.manutencaoMotivo, 'Manuten√ß√£o', mMin);
        const pList = parseStopsJSON(e.processoMotivo, 'Processo', pMin);
        const oList = parseStopsJSON(e.outrosMotivo, 'Outros', oMin);

        [...mList, ...pList, ...oList].forEach(item => {
          const min = getDiffMin(item.de, item.ate);
          allStopsList.push({ ...item, min });
        });
      });

      if (isNoWork) {
        return `720 min (Parada Total${noWorkReason ? `: ${noWorkReason}` : ''})`;
      }

      if (totalStops === 0 && allStopsList.length === 0) {
        return 'Sem paradas';
      }

      if (allStopsList.length > 0) {
        const formattedStops = allStopsList.map(stop => {
          const timeRange = (stop.de && stop.ate) ? `${stop.de} √†s ${stop.ate}` : '';
          const minText = stop.min > 0 ? ` (${stop.min} min)` : '';
          const motivoText = stop.motivo ? `: ${stop.motivo}` : '';
          
          if (timeRange) {
            return `${timeRange}${minText}${motivoText}`;
          } else if (stop.min > 0) {
            return `${stop.min} min${motivoText}`;
          } else {
            return stop.motivo || 'Sem justificativa';
          }
        });

        return `${totalStops} min - ${formattedStops.join(' | ')}`;
      }

      return `${totalStops} min`;
    };

    const sumMetrics = (entries: typeof records) => {
      const net = entries.reduce((acc, e) => acc + (e.netWeight || 0), 0);
      const ecoA = entries.reduce((acc, e) => acc + (e.ecoA || 0), 0);
      const ecoB = entries.reduce((acc, e) => acc + (e.ecoBP || 0) + (e.ecoBM || 0), 0);
      
      let stopsTotal = 0;
      let isNoWork = false;
      let noWorkReasonText = '';

      entries.forEach(e => {
        if (e.isNoWorkDay) {
          isNoWork = true;
          if (e.noWorkReason) {
            noWorkReasonText = e.noWorkReason;
          }
        }

        const mMin = Number(e.manutencaoMin || 0);
        const pMin = Number(e.processoMin || 0);
        const oMin = Number(e.outrosMin || 0);
        stopsTotal += (mMin + pMin + oMin);
      });

      if (isNoWork) {
        stopsTotal = 720;
      }

      const ecoAJusts = entries
        .filter(e => (e.ecoA || 0) > 0 && e.ecoAMotivo && e.ecoAMotivo.trim())
        .map(e => e.ecoAMotivo!.trim());
      
      const ecoBJusts: string[] = [];
      entries.forEach(e => {
        if ((e.ecoBP || 0) > 0 && e.ecoBPMotivo && e.ecoBPMotivo.trim()) {
          ecoBJusts.push(e.ecoBPMotivo.trim());
        }
        if ((e.ecoBM || 0) > 0 && e.ecoBMMotivo && e.ecoBMMotivo.trim()) {
          ecoBJusts.push(e.ecoBMMotivo.trim());
        }
      });

      const borraJusts = entries
        .filter(e => (e.borraTotal || 0) > 0 && e.borraTotalMotivo && e.borraTotalMotivo.trim())
        .map(e => e.borraTotalMotivo!.trim());

      const ecoAJustText = ecoAJusts.length > 0 ? ` - ${ecoAJusts.join('; ')}` : '';
      const ecoBJustText = ecoBJusts.length > 0 ? ` - ${ecoBJusts.join('; ')}` : '';
      const borraJustText = borraJusts.length > 0 ? ` - ${borraJusts.join('; ')}` : '';

      const stopsFormatted = formatStopsForEmail(entries);

      return {
        net,
        ecoA,
        ecoB,
        stopsTotal,
        stopsText: stopsFormatted,
        stopsFormatted,
        ecoAJustText,
        ecoBJustText,
        borraJustText
      };
    };

    const cast1Dia = sumMetrics(c1D);
    const cast1Noite = sumMetrics(c1N);
    const cast2Dia = sumMetrics(c2D);
    const cast2Noite = sumMetrics(c2N);

    const eremaDia = sumMetrics(erD);
    const eremaNoite = sumMetrics(erN);

    // Totals
    const cast1Total = {
      net: cast1Dia.net + cast1Noite.net,
      ecoA: cast1Dia.ecoA + cast1Noite.ecoA,
      ecoB: cast1Dia.ecoB + cast1Noite.ecoB,
      stopsTotal: cast1Dia.stopsTotal + cast1Noite.stopsTotal,
      ecoAJustText: '',
      ecoBJustText: '',
      borraJustText: ''
    };
    const cast2Total = {
      net: cast2Dia.net + cast2Noite.net,
      ecoA: cast2Dia.ecoA + cast2Noite.ecoA,
      ecoB: cast2Dia.ecoB + cast2Noite.ecoB,
      stopsTotal: cast2Dia.stopsTotal + cast2Noite.stopsTotal,
      ecoAJustText: '',
      ecoBJustText: '',
      borraJustText: ''
    };

    const cast12Total = {
      net: cast1Total.net + cast2Total.net,
      ecoA: cast1Total.ecoA + cast2Total.ecoA,
      ecoB: cast1Total.ecoB + cast2Total.ecoB,
      stopsTotal: cast1Total.stopsTotal + cast2Total.stopsTotal,
      stopsText: (cast1Total.stopsTotal + cast2Total.stopsTotal) > 0 
        ? `${cast1Total.stopsTotal + cast2Total.stopsTotal} min` 
        : 'Sem paradas',
      stopsFormatted: (cast1Total.stopsTotal + cast2Total.stopsTotal) > 0 
        ? `${cast1Total.stopsTotal + cast2Total.stopsTotal} min` 
        : 'Sem paradas',
      ecoAJustText: '',
      ecoBJustText: '',
      borraJustText: ''
    };

    const eremaTotal = {
      net: eremaDia.net + eremaNoite.net,
      stopsTotal: eremaDia.stopsTotal + eremaNoite.stopsTotal,
      stopsText: (eremaDia.stopsTotal + eremaNoite.stopsTotal) > 0 
        ? `${eremaDia.stopsTotal + eremaNoite.stopsTotal} min` 
        : 'Sem paradas',
      stopsFormatted: (eremaDia.stopsTotal + eremaNoite.stopsTotal) > 0 
        ? `${eremaDia.stopsTotal + eremaNoite.stopsTotal} min` 
        : 'Sem paradas'
    };

    return {
      cast1Dia,
      cast1Noite,
      cast2Dia,
      cast2Noite,
      cast1Total,
      cast2Total,
      cast12Total,
      eremaDia,
      eremaNoite,
      eremaTotal,
    };
  }, [productionData, shareDate]);

  const dashboardChartsData = useMemo(() => {
    const ops: any = {};
    const machines: any = {};
    const shifts: any = {};
    
    let totalManut = 0;
    let totalProc = 0;
    let totalOutros = 0;
    let totalNetCast = 0;
    let totalNetErema = 0;
    let totalBorraGeral = 0;
    let totalEcoA = 0;
    let totalEcoBP = 0;
    let totalEcoBM = 0;

    const dailyMap: Record<string, { rawDate: string, date: string, castNet: number, eremaNet: number, borra: number }> = {};

    filteredDashboardData.forEach(e => {
      totalManut += (e.manutencaoMin || 0);
      totalProc += (e.processoMin || 0);
      totalOutros += (e.outrosMin || 0);
      totalBorraGeral += (e.borraTotal || 0);
      totalEcoA += (e.ecoA || 0);
      totalEcoBP += (e.ecoBP || 0);
      totalEcoBM += (e.ecoBM || 0);

      const dKey = e.date; // YYYY-MM-DD
      const [year, month, day] = dKey.split('-');
      const formattedDate = day && month ? `${day}/${month}` : dKey;
      if (!dailyMap[dKey]) {
        dailyMap[dKey] = { rawDate: dKey, date: formattedDate, castNet: 0, eremaNet: 0, borra: 0 };
      }

      if (e.machine.toLowerCase().includes('erema')) {
        totalNetErema += (e.netWeight || 0);
        dailyMap[dKey].eremaNet += (e.netWeight || 0);
      } else {
        totalNetCast += (e.netWeight || 0);
        dailyMap[dKey].castNet += (e.netWeight || 0);
      }
      dailyMap[dKey].borra += (e.borraTotal || 0);

      if (!ops[e.operator]) ops[e.operator] = { name: e.operator, net: 0, borra: 0, ecoA: 0, ecoBP: 0, ecoBM: 0, ecoTotal: 0, manut: 0, proc: 0, outros: 0, stops: 0 };
      if (!machines[e.machine]) machines[e.machine] = { name: e.machine, net: 0, borra: 0, stops: 0, manut: 0, proc: 0, outros: 0 };
      if (!shifts[e.shift]) shifts[e.shift] = { name: e.shift, net: 0, borra: 0 };

      if (!e.machine.toLowerCase().includes('erema')) {
        ops[e.operator].net += (e.netWeight || 0);
        machines[e.machine].net += (e.netWeight || 0);
        shifts[e.shift].net += (e.netWeight || 0);
      }
      ops[e.operator].borra += (e.borraTotal || 0);
      ops[e.operator].ecoA += (e.ecoA || 0);
      ops[e.operator].ecoBP += (e.ecoBP || 0);
      ops[e.operator].ecoBM += (e.ecoBM || 0);
      ops[e.operator].ecoTotal += (e.ecoA || 0) + (e.ecoBP || 0) + (e.ecoBM || 0);
      ops[e.operator].manut += (e.manutencaoMin || 0);
      ops[e.operator].proc += (e.processoMin || 0);
      ops[e.operator].outros += (e.outrosMin || 0);
      ops[e.operator].stops += (e.manutencaoMin || 0) + (e.processoMin || 0) + (e.outrosMin || 0);

      machines[e.machine].borra += (e.borraTotal || 0);
      machines[e.machine].manut += (e.manutencaoMin || 0);
      machines[e.machine].proc += (e.processoMin || 0);
      machines[e.machine].outros += (e.outrosMin || 0);
      machines[e.machine].stops += (e.manutencaoMin || 0) + (e.processoMin || 0) + (e.outrosMin || 0);

      shifts[e.shift].borra += (e.borraTotal || 0);
    });

    const dailyTrends = Object.values(dailyMap).sort((a, b) => a.rawDate.localeCompare(b.rawDate));
    const globalStops = [
      { name: 'Manuten√ß√£o', value: totalManut, color: '#f59e0b' },
      { name: 'Processo', value: totalProc, color: '#3b82f6' },
      { name: 'Outros', value: totalOutros, color: '#64748b' }
    ].filter(s => s.value > 0);

    return {
      ops: Object.values(ops).sort((a: any, b: any) => b.net - a.net),
      machines: Object.values(machines).sort((a: any, b: any) => b.net - a.net),
      shifts: Object.values(shifts).sort((a: any, b: any) => b.net - a.net),
      dailyTrends,
      globalStops,
      totals: {
        totalNetCast,
        totalNetErema,
        totalBorraGeral,
        totalStops: totalManut + totalProc + totalOutros,
        totalManut,
        totalProc,
        totalOutros,
        totalEcoA,
        totalEcoBP,
        totalEcoBM,
        totalEcoTotal: totalEcoA + totalEcoBP + totalEcoBM
      }
    };
  }, [filteredDashboardData]);

  // Hook para calcular o balan√ßo acumulado de Eco B vs Produ√ß√£o Erema.
  // "a sobra do eco b do mes deve acumular para o proximo mes"
  const ecoBalance = useMemo(() => {
    const monthlyData: Record<string, { ecoB: number, recycled: number, recycledUsed: number }> = {};
    
    productionData.forEach(e => {
      // Exclui lan√ßamentos do Cast 2 para os meses de Maio e Junho apenas se forem registros antigos importados/existentes
      const isExcludedMonth = e.date.substring(5, 7) === '05' || e.date.substring(5, 7) === '06';
      const isExistingPastEntry = !e.updatedAt || e.updatedAt < '2026-06-12T17:44:00Z';
      if (isExcludedMonth && e.machine.toLowerCase().includes('cast 2') && isExistingPastEntry) {
        return;
      }

      const monthStr = e.date.substring(0, 7); // M√™s YYYY-MM
      if (!monthlyData[monthStr]) monthlyData[monthStr] = { ecoB: 0, recycled: 0, recycledUsed: 0 };
      
      const totalEcoBMonth = (e.ecoBP || 0) + (e.ecoBM || 0);
      monthlyData[monthStr].ecoB += totalEcoBMonth;
      
      if (e.machine.toLowerCase().includes('erema')) {
        monthlyData[monthStr].recycled += (e.netWeight || 0);
      } else {
        monthlyData[monthStr].recycledUsed += (e.recycledUsed || 0);
      }
    });

    const sortedMonths = Object.keys(monthlyData).sort();
    let accumulatedSurplus = 0;
    let accumulatedRecycledSurplus = 0;
    const balances: Record<string, { 
      monthEcoB: number, 
      monthRecycled: number, 
      startingSurplus: number, 
      endingSurplus: number, 
      totalAvailable: number,
      startingRecycledSurplus: number,
      monthRecycledUsed: number,
      totalRecycledAvailable: number,
      endingRecycledSurplus: number
    }> = {};
    
    if (sortedMonths.length > 0) {
      const firstMonthStr = sortedMonths[0];
      let [currYear, currMonth] = firstMonthStr.split('-').map(Number);
      const [endYear, endMonth] = dashboardMonth.split('-').map(Number);
      
      while(currYear < endYear || (currYear === endYear && currMonth <= endMonth)) {
        const mStr = `${currYear}-${String(currMonth).padStart(2, '0')}`;
        const ecoB = monthlyData[mStr]?.ecoB || 0;
        const recycled = monthlyData[mStr]?.recycled || 0;
        const recycledUsed = monthlyData[mStr]?.recycledUsed || 0;
        
        const startingSurplus = accumulatedSurplus;
        const totalAvailable = startingSurplus + ecoB;
        const endingSurplus = Math.max(0, totalAvailable - recycled);
        accumulatedSurplus = endingSurplus;
        
        const startingRecycledSurplus = accumulatedRecycledSurplus;
        const totalRecycledAvailable = startingRecycledSurplus + recycled;
        const endingRecycledSurplus = Math.max(0, totalRecycledAvailable - recycledUsed);
        accumulatedRecycledSurplus = endingRecycledSurplus;
        
        balances[mStr] = {
          monthEcoB: ecoB,
          monthRecycled: recycled,
          startingSurplus,
          totalAvailable,
          endingSurplus,
          startingRecycledSurplus,
          monthRecycledUsed: recycledUsed,
          totalRecycledAvailable,
          endingRecycledSurplus
        };
        
        currMonth++;
        if (currMonth > 12) { currMonth = 1; currYear++; }
      }
    }

    return balances;
  }, [productionData, dashboardMonth]);

  // Nova l√≥gica para motivos de parada detalhados
  const machineStopsDetails = useMemo(() => {
    const results: Record<string, { total: number; motifs: { type: string; min: number; reason: string; operator: string; date: string }[] }> = {};
    
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

    const addMotif = (machine: string, type: string, minInput: number, reasonInput: string | undefined, operator: string, date: string) => {
      if (!reasonInput) {
        results[machine].motifs.push({ type, min: minInput, reason: 'N√£o informado', operator, date });
        return;
      }
      
      try {
        if (reasonInput.startsWith('[') && reasonInput.endsWith(']')) {
          const parsed = JSON.parse(reasonInput);
          if (Array.isArray(parsed) && parsed.length > 0) {
            parsed.forEach((item: any) => {
              const de = (item.de || '').trim();
              const ate = (item.ate || '').trim();
              const motivo = (item.motivo || item.keyword || '').trim();
              const explicacao = (item.explicacao || item.justification || item.observacao || item.observacoes || item.descricao || '').trim();
              
              let desc = '';
              if (motivo && explicacao && motivo.toLowerCase() !== explicacao.toLowerCase()) {
                desc = `${motivo} - ${explicacao}`;
              } else {
                desc = explicacao || motivo || 'N√£o informado';
              }
              
              const itemMin = de && ate ? getDiffMinutes(de, ate) : 0;
              
              const reasonStr = de && ate ? `${de} √†s ${ate} - ${desc}` : desc;
              
              results[machine].motifs.push({ 
                type, 
                min: itemMin > 0 ? itemMin : minInput, 
                reason: reasonStr, 
                operator, 
                date 
              });
            });
            return;
          }
        }
      } catch (err) {
        // Fallback
      }
      
      results[machine].motifs.push({ type, min: minInput, reason: reasonInput || 'N√£o informado', operator, date });
    };

    filteredDashboardData.forEach(e => {
      if (!results[e.machine]) results[e.machine] = { total: 0, motifs: [] };
      
      const entryTotal = (e.manutencaoMin || 0) + (e.processoMin || 0) + (e.outrosMin || 0);
      results[e.machine].total += entryTotal;

      if (e.manutencaoMin > 0) {
        addMotif(e.machine, 'Manuten√ß√£o', e.manutencaoMin, e.manutencaoMotivo, e.operator, e.date);
      }
      if (e.processoMin > 0) {
        addMotif(e.machine, 'Processo', e.processoMin, e.processoMotivo, e.operator, e.date);
      }
      if (e.outrosMin > 0) {
        addMotif(e.machine, 'Outros', e.outrosMin, e.outrosMotivo, e.operator, e.date);
      }
    });

    return Object.entries(results)
      .sort(([a], [b]) => a.localeCompare(b))
      .filter(([_, data]) => data.total > 0);
  }, [filteredDashboardData]);

  const filteredMachineStopsDetails = useMemo(() => {
    if (!stopsSearchTerm.trim()) {
      return machineStopsDetails;
    }
    const query = stopsSearchTerm.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    return machineStopsDetails.map(([machine, data]) => {
      const filteredMotifs = data.motifs.filter(m => {
        const normReason = (m.reason || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const normOp = (m.operator || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const normType = (m.type || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const normMac = machine.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        return normReason.includes(query) || normOp.includes(query) || normType.includes(query) || normMac.includes(query);
      });

      const newTotal = filteredMotifs.reduce((sum, item) => sum + item.min, 0);

      return [machine, { total: newTotal, motifs: filteredMotifs }] as [string, { total: number; motifs: typeof data.motifs }];
    }).filter(([_, data]) => data.motifs.length > 0);
  }, [machineStopsDetails, stopsSearchTerm]);

  const eremaOperatorStats = useMemo(() => {
    const stats: any = {};
    filteredDashboardData
      .filter(e => e.machine.toLowerCase().includes('erema'))
      .forEach(e => {
        if (!stats[e.operator]) stats[e.operator] = 0;
        stats[e.operator] += (e.netWeight || 0);
      });
    return Object.entries(stats)
      .map(([name, value]) => ({ name, value: value as number }))
      .sort((a, b) => b.value - a.value);
  }, [filteredDashboardData]);

  const filteredReportData = useMemo(() => {
    return filteredDashboardData.filter(e => {
      const matchSearch = e.operator.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          e.machine.toLowerCase().includes(searchTerm.toLowerCase());
      return matchSearch;
    }).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  }, [filteredDashboardData, searchTerm]);

  const reportTotals = useMemo(() => {
    return filteredReportData.reduce((acc, curr) => ({
      grossWeight: acc.grossWeight + (curr.grossWeight || 0),
      tara: acc.tara + (curr.tara || 0),
      netWeight: acc.netWeight + (curr.netWeight || 0),
      ecoA: acc.ecoA + (curr.ecoA || 0),
      ecoBP: acc.ecoBP + (curr.ecoBP || 0),
      ecoBM: acc.ecoBM + (curr.ecoBM || 0),
      borraTotal: acc.borraTotal + (curr.borraTotal || 0),
      manutencaoMin: acc.manutencaoMin + (curr.manutencaoMin || 0),
      processoMin: acc.processoMin + (curr.processoMin || 0),
      outrosMin: acc.outrosMin + (curr.outrosMin || 0),
      recycledUsed: acc.recycledUsed + (curr.recycledUsed || 0),
      recycledBags: acc.recycledBags + (curr.recycledBags || 0),
    }), { 
      grossWeight: 0, tara: 0, netWeight: 0, ecoA: 0, ecoBP: 0, ecoBM: 0, borraTotal: 0, manutencaoMin: 0, processoMin: 0, outrosMin: 0,
      recycledUsed: 0, recycledBags: 0
    });
  }, [filteredReportData]);

  const exportToCSV = () => {
    const csvRows = [];
    const BOM = "\uFEFF";
    
    const formattedPeriod = (filterStartDate && filterEndDate)
      ? `${filterStartDate.split('-').reverse().join('/')}_a_${filterEndDate.split('-').reverse().join('/')}`
      : (filterDay || dashboardMonth);

    csvRows.push('RELAT√ìRIO DE PRODU√á√ÉO - ' + formattedPeriod);
    csvRows.push('');
    csvRows.push([
      'Data', 'Operador', 'M√°quina', 'Turno', 'Motivo',
      'Peso Bruto (kg)', 'Tara (kg)', 'Peso L√≠quido (kg)', 
      'Eco A (kg)', 'Justificativa Eco A', 'Eco B(P) (kg)', 'Justificativa Eco B(P)', 'Eco B(M) (kg)', 'Justificativa Eco B(M)', 
      'Borra (kg)', 'Justificativa Borra', 'Consumo Reciclado (Bags)', 'Consumo Reciclado (Kg)', 'Manuten√ß√£o (min)', 'Processo (min)', 'Outros (min)'
    ].join(';'));

    filteredReportData.forEach(e => {
      const isStopped = e.isNoWorkDay || e.isMaintenanceEntry;
      csvRows.push([
        e.date.split('-').reverse().join('/'),
        isStopped ? '(PROCESSO PARADO)' : e.operator,
        e.machine,
        e.shift,
        getStoppageReason(e),
        e.grossWeight,
        e.tara,
        e.netWeight,
        e.ecoA,
        e.ecoAMotivo || '',
        e.ecoBP,
        e.ecoBPMotivo || '',
        e.ecoBM,
        e.ecoBMMotivo || '',
        e.borraTotal,
        e.borraTotalMotivo || '',
        e.recycledBags || 0,
        e.recycledUsed || 0,
        e.manutencaoMin,
        e.processoMin,
        e.outrosMin
      ].join(';'));
    });

    csvRows.push([
      'SOMAT√ìRIA TOTAL', '', '', '', '',
      reportTotals.grossWeight,
      reportTotals.tara,
      reportTotals.netWeight,
      reportTotals.ecoA,
      '',
      reportTotals.ecoBP,
      '',
      reportTotals.ecoBM,
      '',
      reportTotals.borraTotal,
      '',
      reportTotals.recycledBags,
      reportTotals.recycledUsed,
      reportTotals.manutencaoMin,
      reportTotals.processoMin,
      reportTotals.outrosMin
    ].join(';'));

    csvRows.push('');
    csvRows.push('');
    csvRows.push('RESUMO PARA INDICADORES (DADOS DOS GR√ÅFICOS)');
    csvRows.push('');
    
    csvRows.push('PRODU√á√ÉO POR OPERADOR');
    csvRows.push('Nome;Produ√ß√£o L√≠quida (kg);Borra Total (kg);Perda Eco Total (kg);Tempo Parado (min)');
    dashboardChartsData.ops.forEach(op => {
      csvRows.push(`${op.name};${op.net};${op.borra};${op.ecoTotal};${op.stops}`);
    });

    csvRows.push('');
    csvRows.push('PRODU√á√ÉO POR M√ÅQUINA');
    csvRows.push('Nome;Produ√ß√£o L√≠quida (kg);Borra (kg);Tempo Parado (min)');
    dashboardChartsData.machines.forEach(m => {
      csvRows.push(`${m.name};${m.net};${m.borra};${m.stops}`);
    });

    csvRows.push('');
    csvRows.push('PRODU√á√ÉO POR TURNO');
    csvRows.push('Turno;Produ√ß√£o L√≠quida (kg)');
    dashboardChartsData.shifts.forEach(s => {
      csvRows.push(`${s.name};${s.net}`);
    });

    const csvString = csvRows.join('\n');
    const blob = new Blob([BOM + csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Manupackaging_Export_${formattedPeriod}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportStopsToCSV = () => {
    const csvRows = [];
    const BOM = "\uFEFF";
    let totalManut = 0;
    let totalProc = 0;
    let totalOutros = 0;

    const formattedPeriod = (filterStartDate && filterEndDate)
      ? `${filterStartDate.split('-').reverse().join('/')}_a_${filterEndDate.split('-').reverse().join('/')}`
      : (filterDay || dashboardMonth);

    csvRows.push('RELAT√ìRIO DETALHADO DE PARADAS - ' + formattedPeriod);
    csvRows.push('');
    csvRows.push(['Equipamento', 'Data', 'Operador', 'Tipo de Parada', 'Motivo', 'Dura√ß√£o (min)'].join(';'));

    machineStopsDetails.forEach(([machine, data]) => {
      data.motifs.forEach(m => {
        csvRows.push([
          machine,
          m.date.split('-').reverse().join('/'),
          m.operator,
          m.type,
          m.reason.replace(/;/g, ','), // Evita quebra de coluna se o usu√°rio usou ponto e v√≠rgula
          m.min
        ].join(';'));

        if (m.type === 'Manuten√ß√£o') totalManut += m.min;
        if (m.type === 'Processo') totalProc += m.min;
        if (m.type === 'Outros') totalOutros += m.min;
      });
    });

    csvRows.push('');
    csvRows.push('RESUMO TOTAL POR MOTIVO');
    csvRows.push('Tipo;Dura√ß√£o Total (min);Dura√ß√£o Formatada');
    csvRows.push(`Manuten√ß√£o;${totalManut};${formatMinutes(totalManut)}`);
    csvRows.push(`Processo;${totalProc};${formatMinutes(totalProc)}`);
    csvRows.push(`Outros;${totalOutros};${formatMinutes(totalOutros)}`);
    csvRows.push(`GERAL;${totalManut + totalProc + totalOutros};${formatMinutes(totalManut + totalProc + totalOutros)}`);

    const csvString = csvRows.join('\n');
    const blob = new Blob([BOM + csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Relatorio_Paradas_${formattedPeriod}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadBackup = () => {
    const backupData = {
      productionData,
      employees,
      collaborators,
      trainingRecords,
      operators,
      availableRoles,
      availableShifts,
      goals,
      dashboardMonth,
      personnelLogs,
      systemUsers
    };
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `manupackaging_backup_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadChartAsPNG = async (id: string, title: string) => {
    const element = document.getElementById(id);
    if (!element) return;
    
    const btns = element.querySelectorAll('.chart-download-btn');
    btns.forEach((btn: any) => btn.style.display = 'none');
    
    try {
      const canvas = await html2canvas(element, {
        backgroundColor: '#ffffff',
        scale: 2,
        logging: false,
        useCORS: true,
        onclone: (clonedDoc) => {
          // Replace all oklch color references in all style sheets to prevent html2canvas oklch crash
          const styleElements = clonedDoc.querySelectorAll('style');
          styleElements.forEach((style) => {
            if (style.innerHTML) {
              style.innerHTML = style.innerHTML.replace(/oklch\([^)]+\)/g, 'rgb(100, 116, 139)');
            }
          });

          // Also scan inline styles for any oklch colors
          const allElements = clonedDoc.querySelectorAll('*');
          allElements.forEach((el) => {
            const htmlEl = el as HTMLElement;
            if (htmlEl.style) {
              for (let i = 0; i < htmlEl.style.length; i++) {
                const styleName = htmlEl.style[i];
                const value = htmlEl.style.getPropertyValue(styleName);
                if (value && value.includes('oklch')) {
                  htmlEl.style.setProperty(styleName, value.replace(/oklch\([^)]+\)/g, 'rgb(100, 116, 139)'));
                }
              }
            }
          });

          const clonedEl = clonedDoc.getElementById(id);
          if (clonedEl) {
            clonedEl.style.height = 'auto';
            clonedEl.style.minHeight = 'auto';
            clonedEl.style.maxHeight = 'none';
            clonedEl.style.overflow = 'visible';
            
            const truncates = clonedEl.querySelectorAll('.truncate');
            truncates.forEach((node: any) => {
              node.style.whiteSpace = 'normal';
              node.style.overflow = 'visible';
              node.style.textOverflow = 'clip';
              node.classList.remove('truncate');
            });
          }
        }
      });
      
      const link = document.createElement('a');
      link.download = `Indicador_${title.replace(/\s+/g, '_')}_${dashboardMonth}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (error) {
      console.error('Erro ao exportar gr√°fico:', error);
      alert('Ocorreu um erro ao gerar a imagem do gr√°fico.');
    } finally {
      btns.forEach((btn: any) => btn.style.display = 'flex');
    }
  };

  const exportStockAndConciliationPDF = (stockDate: string) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const nowFull = new Date().toLocaleString('pt-BR');

    const entry = stockEntries.find(e => e.date === stockDate);
    if (!entry) {
      alert('Registro de estoque n√£o encontrado para gera√ß√£o de PDF.');
      return;
    }

    const sortedEntries = [...stockEntries].sort((a, b) => a.date.localeCompare(b.date));
    const selectedIdx = sortedEntries.findIndex(e => e.date === stockDate);
    const previousEntry = selectedIdx > 0 ? sortedEntries[selectedIdx - 1] : null;

    let prevProdDate = '';
    if (stockDate) {
      const sDate = new Date(stockDate + 'T12:00:00');
      sDate.setDate(sDate.getDate() - 1);
      prevProdDate = sDate.toISOString().split('T')[0];
    }

    const prevDayProdEntries = (previousEntry && stockDate)
      ? productionData.filter(e => e.date >= previousEntry.date && e.date < stockDate && !e.machine.toLowerCase().includes('erema'))
      : (prevProdDate ? productionData.filter(e => e.date === prevProdDate && !e.machine.toLowerCase().includes('erema')) : []);

    let totalWeightLC3 = 0;
    let totalWeightATX = 0;
    let totalWeightLC2 = 0;
    let totalWeightATXPlus = 0;
    let totalWeightOther = 0;

    prevDayProdEntries.forEach(e => {
      const weight = (e.netWeight || 0) + (e.ecoA || 0) + (e.ecoBP || 0) + (e.ecoBM || 0);
      const mType = (e.materialType || 'LC3').trim().toUpperCase();
      if (mType === 'LC3') {
        totalWeightLC3 += weight;
      } else if (mType === 'ATX') {
        totalWeightATX += weight;
      } else if (mType === 'LC2') {
        totalWeightLC2 += weight;
      } else if (mType === 'ATX PLUS' || mType === 'ATXPLUS') {
        totalWeightATXPlus += weight;
      } else {
        totalWeightOther += weight;
      }
    });

    const consumedButeno = (totalWeightLC3 * 0.95) + (totalWeightATX * 0.05) + (totalWeightLC2 * 0.05) + (totalWeightATXPlus * 0.05);
    const consumedMetaloceno = (totalWeightLC3 * 0.05) + (totalWeightATX * 0.10) + (totalWeightLC2 * 0.05) + (totalWeightATXPlus * 0.10);
    const consumedHexeno = (totalWeightATX * 0.85) + (totalWeightATXPlus * 0.85);
    const consumedReciclado = (totalWeightLC2 * 0.90);
    const consumedOther = totalWeightOther;

    const drawHeaderAndFooter = (docInstance: any, pageNum: number, totalPages: number) => {
      // Top accent bar
      docInstance.setFillColor(79, 70, 229); // Indigo-600
      docInstance.rect(14, 10, pageWidth - 28, 4, 'F');

      docInstance.setFont('helvetica', 'bold');
      docInstance.setFontSize(14);
      docInstance.setTextColor(30, 41, 59); // Slate-800
      docInstance.text('MANUPACKAGING', 14, 22);

      docInstance.setFontSize(9);
      docInstance.setFont('helvetica', 'normal');
      docInstance.setTextColor(100, 116, 139); // Slate-500
      docInstance.text('CONCILIA√á√ÉO INDUSTRIAL E GEST√ÉO DE ESTOQUE', 14, 27);

      const logoSize = 13;
      const logoSrc = systemLogo || "https://static.wixstatic.com/media/765089_472b535780514937a09c07be49495392~mv2.png";
      if (logoSrc) {
        try {
          docInstance.addImage(logoSrc, 'PNG', pageWidth - 14 - logoSize, 14, logoSize, logoSize);
        } catch (err) {
          console.error("Error adding logo to PDF:", err);
        }
      }

      docInstance.setDrawColor(226, 232, 240); // Slate-200
      docInstance.setLineWidth(0.5);
      docInstance.line(14, 31, pageWidth - 14, 31);

      // Footer
      docInstance.setFont('helvetica', 'normal');
      docInstance.setFontSize(8);
      docInstance.setTextColor(148, 163, 184); // Slate-400
      docInstance.text(`P√°gina ${pageNum} de ${totalPages}`, pageWidth - 14, pageHeight - 12, { align: 'right' });
      docInstance.text(`Sistema de Gest√£o de Produ√ß√£o ‚Äî Emitido em ${nowFull}`, 14, pageHeight - 12);
    };

    // First page
    drawHeaderAndFooter(doc, 1, 2);

    let yPos = 38;

    // Bloco de Identifica√ß√£o
    doc.setFillColor(248, 250, 252); // Slate-50
    doc.rect(14, yPos, pageWidth - 28, 24, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.rect(14, yPos, pageWidth - 28, 24, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(30, 41, 59);
    doc.text('JUSTIFICATIVA DE CONSUMO E CONCILIA√á√ÉO DE COMPONENTES', 18, yPos + 6);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    doc.text(`Data do Invent√°rio F√≠sico: ${stockDate.split('-').reverse().join('/')}`, 18, yPos + 12);
    doc.text(`Data do Per√≠odo Produtivo Correlacionado: ${prevProdDate ? prevProdDate.split('-').reverse().join('/') : 'N/A'} (Dia de produ√ß√£o anterior)`, 18, yPos + 17);
    doc.text(`Emitido por Usu√°rio: ${loggedUser?.name || 'Acesso Direto'} em ${nowFull}`, 18, yPos + 22);

    yPos += 30;

    // Se√ß√£o de Metodologia e Justificativa de Consumo
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(79, 70, 229);
    doc.text('1. L√ìGICA E METODOLOGIA DO C√ÅLCULO DE CONSUMO TE√ìRICO', 14, yPos);
    yPos += 5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(51, 65, 85);
    
    const explications = [
      "Para justificar as oscila√ß√µes do estoque f√≠sico real e mensurar as perdas/aproveitamento, o sistema",
      "implementa regras r√≠gidas de c√°lculo de consumo baseadas nas receitas de extrus√£o ativa do dia anterior:",
      "",
      "  ‚Ä¢ FILME LC3 (Composi√ß√£o do produto: 95% Buteno / 5% Metaloceno)",
      "  ‚Ä¢ FILME ATX (Composi√ß√£o do produto: 5% Buteno / 85% Hexeno / 10% Metaloceno)",
      "  ‚Ä¢ FILME LC2 (Composi√ß√£o do produto: 90% Reciclado / 5% Metaloceno / 5% Buteno)",
      "  ‚Ä¢ FILME ATX PLUS (Composi√ß√£o do produto: 5% Buteno / 85% Hexeno / 10% Metaloceno)",
      "  ‚Ä¢ OUTROS FILMES / RESINAS: 100% Outros Apontamentos / Mat√©rias-Primas Diversas",
      "",
      "Durante os processos nas extrusoras Cast 1 e Cast 2, o peso acumulado produzido (incluindo peso l√≠quido,",
      "Eco A, Eco BP e Eco BM) √© decomposto multiplicando-se cada receita por suas fra√ß√µes constituintes de insumos.",
      "Isso estabelece o Consumo Te√≥rico que √© confrontado com o Consumo Real (Saldo Inicial - Saldo Final Atual)."
    ];

    explications.forEach(line => {
      doc.text(line, 14, yPos);
      yPos += 3.7;
    });

    yPos += 5;

    // Se√ß√£o de Resumo por Tipo de Filme Produzido
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(79, 70, 229);
    doc.text('2. RESUMO DE PRODU√á√ÉO ACUMULADA POR TIPO DE FILME', 14, yPos);
    yPos += 5;

    const prodSummaryHead = [['TIPO DE PRODUTO / FILME', 'COMPOSI√á√ÉO CONSOLIDADA', 'VOLUME DECLARADO DO DIA']];
    const prodSummaryBody = [
      ['FILME LC3', '95% Buteno / 5% Metaloceno', formatWeight(totalWeightLC3)],
      ['FILME ATX', '5% Buteno / 85% Hexeno / 10% Metaloceno', formatWeight(totalWeightATX)],
      ['FILME LC2', '90% Reciclado / 5% Metaloceno / 5% Buteno', formatWeight(totalWeightLC2)],
      ['FILME ATX PLUS', '5% Buteno / 85% Hexeno / 10% Metaloceno', formatWeight(totalWeightATXPlus)],
      ['OUTROS APONTAMENTOS', '100% Outros / Resinas Adicionais', formatWeight(totalWeightOther)]
    ];

    autoTable(doc, {
      startY: yPos,
      head: prodSummaryHead,
      body: prodSummaryBody,
      theme: 'grid',
      headStyles: {
        fillColor: [79, 70, 229],
        textColor: [255, 255, 255],
        fontSize: 8,
        fontStyle: 'bold'
      },
      styles: {
        fontSize: 7.5,
        cellPadding: 3.5
      },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 50 },
        1: { textColor: [100, 116, 139], cellWidth: 80 },
        2: { fontStyle: 'bold', halign: 'right', cellWidth: 50 }
      }
    });

    yPos = (doc as any).lastAutoTable.finalY + 8;

    // Pr√≥xima p√°gina para a Tabela Detalhada de Lan√ßamento de Produ√ß√£o e Estoque
    doc.addPage();
    drawHeaderAndFooter(doc, 2, 2);
    yPos = 38;

    // Se√ß√£o de Detalhamento por Lan√ßamento de Produ√ß√£o
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(79, 70, 229);
    doc.text('3. DETALHAMENTO DE LAN√áAMENTOS INDIVIDUAIS DE PRODU√á√ÉO DO DIA CORRELACIONADO', 14, yPos);
    yPos += 5;

    if (prevDayProdEntries.length > 0) {
      const detailProdHead = [['M√ÅQUINA', 'TURNO', 'OPERADOR', 'MATERIAL', 'P. L√çQUIDO', 'ECO A', 'ECO B (P+M)', 'RES√çDUO BORRA']];
      const detailProdBody = prevDayProdEntries.map(e => [
        e.machine || '-',
        e.shift || '-',
        e.operator || 'Sistema',
        e.materialType || 'LC3',
        formatWeight(e.netWeight || 0),
        formatWeight(e.ecoA || 0),
        formatWeight((e.ecoBP || 0) + (e.ecoBM || 0)),
        formatWeight(e.borraTotal || 0)
      ]);

      autoTable(doc, {
        startY: yPos,
        head: detailProdHead,
        body: detailProdBody,
        theme: 'grid',
        headStyles: {
          fillColor: [71, 85, 105], // Slate-600
          textColor: [255, 255, 255],
          fontSize: 7,
          fontStyle: 'bold'
        },
        styles: {
          fontSize: 6.5,
          cellPadding: 2.5
        },
        columnStyles: {
          0: { fontStyle: 'bold' },
          1: { halign: 'center' },
          4: { halign: 'right' },
          5: { halign: 'right' },
          6: { halign: 'right' },
          7: { halign: 'right' }
        }
      });
      yPos = (doc as any).lastAutoTable.finalY + 8;
    } else {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text('Nenhum registro de produ√ß√£o ativo foi identificado no dia correlacionado.', 14, yPos);
      yPos += 8;
    }

    // Se√ß√£o de Concilia√ß√£o F√≠sica de Insumos em Estoque
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(79, 70, 229);
    doc.text('4. CONCILIA√á√ÉO FINAL DO BALAN√áO DE INSUMOS E CONSUMO DE ESTOQUE', 14, yPos);
    yPos += 5;

    const groupedItems: { 
      [key: string]: { 
        code: string; 
        name: string; 
        fabrica: number; 
        galpao: number; 
        total: number; 
        prevTotal: number;
      } 
    } = {};

    entry.items.forEach(item => {
      const codeKey = (item.code || '').trim();
      const nameKey = (item.name || '').trim().toUpperCase();
      const key = codeKey ? codeKey : nameKey;
      
      if (!groupedItems[key]) {
        groupedItems[key] = {
          code: item.code || '',
          name: item.name || '',
          fabrica: 0,
          galpao: 0,
          total: 0,
          prevTotal: 0
        };
      }
      
      const locName = (item.location || 'F√°brica').trim().toUpperCase();
      if (locName.includes('GALP')) {
        groupedItems[key].galpao += item.quantity;
      } else {
        groupedItems[key].fabrica += item.quantity;
      }
      groupedItems[key].total += item.quantity;
    });

    if (previousEntry) {
      previousEntry.items.forEach(item => {
        const codeKey = (item.code || '').trim();
        const nameKey = (item.name || '').trim().toUpperCase();
        const key = codeKey ? codeKey : nameKey;
        
        if (!groupedItems[key]) {
          groupedItems[key] = {
            code: item.code || '',
            name: item.name || '',
            fabrica: 0,
            galpao: 0,
            total: 0,
            prevTotal: 0
          };
        }
        groupedItems[key].prevTotal += item.quantity;
      });
    }

    const reconciliationHead = [['C√ìDIGO', 'DESCRI√á√ÉO', 'F√ÅBRICA', 'GALP√ÉO', 'TOTAL', 'CONSUMO DO DIA', 'EM ESTOQUE']];
    const reconciliationBody = Object.values(groupedItems).map(gItem => {
      const normName = (gItem.name || '').trim().toUpperCase();
      const normCode = (gItem.code || '').trim().toUpperCase();
      let itemConsumo = 0;
      
      if (normName.includes('BUTENO') || normCode.includes('BUT')) {
        itemConsumo = consumedButeno;
      } else if (normName.includes('HEXENO') || normCode.includes('HEX')) {
        itemConsumo = consumedHexeno;
      } else if (normName.includes('METALOCENO') || normName.includes('METALOGENO') || normCode.includes('MET')) {
        itemConsumo = consumedMetaloceno;
      } else if (normName.includes('RECICLADO') || normName.includes('RECICLA') || normCode.includes('REC') || normName.includes('PELLETS') || normName.includes('EREMA')) {
        itemConsumo = consumedReciclado;
      } else if (normName.includes('OUTRO') || normName.includes('RESINA') || normCode.includes('OUTR')) {
        itemConsumo = consumedOther;
      }

      return [
        gItem.code || '-',
        gItem.name,
        formatWeight(gItem.fabrica),
        formatWeight(gItem.galpao),
        formatWeight(gItem.total),
        itemConsumo > 0 ? formatWeight(itemConsumo) : '0 Kg',
        formatWeight(gItem.total - itemConsumo)
      ];
    });

    autoTable(doc, {
      startY: yPos,
      head: reconciliationHead,
      body: reconciliationBody,
      theme: 'grid',
      headStyles: {
        fillColor: [30, 41, 59], // Slate-800
        textColor: [255, 255, 255],
        fontSize: 7.5,
        fontStyle: 'bold'
      },
      styles: {
        fontSize: 7,
        cellPadding: 3
      },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 20 },
        1: { fontStyle: 'bold', cellWidth: 50 },
        2: { halign: 'right', cellWidth: 20 },
        3: { halign: 'right', cellWidth: 20 },
        4: { halign: 'right', fontStyle: 'bold', cellWidth: 25 },
        5: { halign: 'right', fontStyle: 'bold', textColor: [194, 65, 12], cellWidth: 25 },
        6: { halign: 'right', fontStyle: 'bold', textColor: [79, 70, 229], cellWidth: 25 }
      }
    });

    yPos = (doc as any).lastAutoTable.finalY + 8;

    if (yPos > pageHeight - 35) {
      doc.addPage();
      drawHeaderAndFooter(doc, 3, 3);
      yPos = 38;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(30, 41, 59);
    doc.text('VALIDA√á√ÉO E ASSINATURA INDUSTRIAL DO PER√çODO:', 14, yPos);
    yPos += 14;

    // Draw lines for sign-off
    doc.setDrawColor(203, 213, 225); // Slate-300
    doc.setLineWidth(0.5);
    doc.line(14, yPos, 85, yPos);
    doc.line(110, yPos, 182, yPos);

    doc.setFont('helvetica', 'normal');
    doc.text('Respons√°vel T√©cnico / Planejamento (PCP)', 14, yPos + 4.5);
    doc.text('Supervisor de Produ√ß√£o Industrial', 110, yPos + 4.5);

    // Save consolidated report
    setPdfModal({
      isOpen: true,
      doc,
      filename: `Relatorio-Consumo-Conciliado-${stockDate}.pdf`,
      title: `Relat√≥rio de Consumo Conciliado ‚Äî Ref: ${stockDate}`
    });
  };

  const [selectedEmployeeInfo, setSelectedEmployeeInfo] = useState<{ sector: string, machine: string, shift: string, role: string } | null>(null);

  const exportPersonnelToPDF = () => {
    const doc = new jsPDF();
    const now = new Date().toLocaleDateString('pt-BR');
    const nowFull = new Date().toLocaleString('pt-BR');
    
    // Configura√ß√µes Globais
    doc.setFont('helvetica', 'bold');
    
    // T√≠tulo Principal
    doc.setFontSize(22);
    doc.text('CONTROLE DE PESSOAL ‚Äî MANUPACKAGING', 105, 20, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Espelho de Quadro ‚Äî Gerado em: ${nowFull}`, 105, 28, { align: 'center' });
    
    let yPos = 40;

    // Helper to sort by role priority (Operador > others)
    const sortByRole = (a: Employee, b: Employee) => {
        const priority = (role: string) => (role || '').toLowerCase().includes('operador') ? 0 : 1;
        return priority(a.role) - priority(b.role);
    };

    // Fun√ß√£o auxiliar para desenhar tabelas por se√ß√£o
    const addSectionTable = (title: string, sectorEmployees: Employee[]) => {
        if (sectorEmployees.length === 0) return;

        if (yPos > 240) { doc.addPage(); yPos = 20; }

        // Cabe√ßalho da Se√ß√£o (Faixa cinza claro)
        doc.setFillColor(241, 245, 249);
        doc.rect(14, yPos, 182, 10, 'F');
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(30, 41, 59);
        doc.text(title.toUpperCase(), 16, yPos + 7);
        yPos += 12;

        const tableData = sectorEmployees
            .map(emp => [
                emp.status === 'Em Contrata√ß√£o' ? 'VAGA DISPON√çVEL' : emp.name,
                emp.role,
                emp.machine,
                emp.shift,
                emp.status
            ]);

        autoTable(doc, {
            startY: yPos,
            head: [['NOME', 'FUN√á√ÉO', 'M√ÅQUINA/POSTO', 'TURNO', 'STATUS']],
            body: tableData,
            theme: 'grid',
            headStyles: { 
                fillColor: [30, 41, 59], 
                textColor: [255, 255, 255],
                fontSize: 10,
                fontStyle: 'bold',
                halign: 'center'
            },
            styles: { 
                fontSize: 11, 
                cellPadding: 4,
                valign: 'middle'
            },
            columnStyles: {
                0: { cellWidth: 55 },
                1: { cellWidth: 40 },
                2: { cellWidth: 35 },
                3: { cellWidth: 30 },
                4: { cellWidth: 22, halign: 'center' }
            },
            didParseCell: (data) => {
                if (data.row.cells[0].text[0] === 'VAGA DISPON√çVEL') {
                    data.cell.styles.fontStyle = 'bold';
                    data.cell.styles.textColor = [220, 38, 38]; // Red-600
                }
            },
            margin: { left: 14, right: 14 },
            didDrawPage: (data) => {
                yPos = data.cursor ? data.cursor.y : yPos;
            }
        });
        
        yPos += 15;
    };

    // 1. Lideran√ßa
    const lideran√ßa = employees.filter(e => normalize(e.sector) === 'lideranca' && isEmployed(e.status) && e.status !== 'F√©rias').sort(sortByRole);
    if (lideran√ßa.length > 0) {
        addSectionTable('LIDERAN√áA E GEST√ÉO', lideran√ßa.map(e => {
            let displayShift = e.shift;
            if (displayShift === 'Dia') displayShift = 'Diurno';
            if (displayShift === 'Noite') displayShift = 'Noturno';
            if (displayShift === 'Integral') displayShift = 'Diurno';
            return { ...e, shift: displayShift };
        }));
    }

    // Fun√ß√£o para renderizar setor agrupado por turno e m√°quina
    const addGroupedSector = (sectorTitle: string, sectorKey: string, machines: string[], shifts: string[], minCapacity: number) => {
        const sectorEmps = employees.filter(e => normalize(e.sector) === normalize(sectorKey));
        
        const isVisible = (statusStr: string) => {
            const n = normalize(statusStr);
            return ['ativo', 'atestado', 'em contratacao'].includes(n);
        };

        if (yPos > 240) { doc.addPage(); yPos = 20; }

        doc.setFillColor(30, 41, 59);
        doc.rect(14, yPos, 182, 10, 'F');
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(255, 255, 255);
        doc.text(sectorTitle.toUpperCase(), 105, yPos + 7, { align: 'center' });
        yPos += 18;

        shifts.forEach(shift => {
            const validMachines = machines.filter(machine => {
                const isLintech = normalize(machine) === 'lintech';
                const isComercial = normalize(shift) === 'comercial';
                if (isLintech) return isComercial;
                return !isComercial;
            });

            if (validMachines.length === 0) return;

            if (yPos > 250) { doc.addPage(); yPos = 20; }
            
            doc.setFillColor(241, 245, 249);
            doc.rect(14, yPos, 182, 8, 'F');
            doc.setFontSize(11);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(37, 99, 235);
            doc.text(`TURNO: ${shift.toUpperCase()}`, 105, yPos + 6, { align: 'center' });
            yPos += 12;

            validMachines.forEach(machine => {
                const machineEmps = employees.filter(e => 
                    normalize(e.sector) === normalize(sectorKey) && 
                    normalize(e.machine) === normalize(machine) && 
                    normalize(e.shift) === normalize(shift) && 
                    isVisible(e.status)
                ).sort((a, b) => {
                    const getRank = (r: string) => (r || '').toLowerCase().includes('operador') ? 0 : 1;
                    return getRank(a.role) - getRank(b.role);
                });
                
                const excludedCount = employees.filter(e =>
                    normalize(e.sector) === normalize(sectorKey) && 
                    normalize(e.machine) === normalize(machine) && 
                    normalize(e.shift) === normalize(shift) && 
                    normalize(e.status) === 'vaga excluida'
                ).length;

                const adjustedCapacity = Math.max(0, minCapacity - excludedCount);

                // If no capacity and no active employees, skip this machine for this shift
                if (adjustedCapacity === 0 && machineEmps.length === 0) return;

                if (yPos > 260) { doc.addPage(); yPos = 20; }

                doc.setFontSize(9);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(71, 85, 105);
                doc.text(`EQUIPAMENTO: ${machine.toUpperCase()}`, 16, yPos);
                yPos += 4;

                const slots: { name: string; role: string; status: string }[] = [];
                
                // Existing employees in slots
                machineEmps.forEach(emp => {
                    slots.push({
                        name: emp.status === 'Em Contrata√ß√£o' ? 'VAGA EM CONTRATA√á√ÉO' : emp.name,
                        role: emp.role,
                        status: emp.status
                    });
                });

                // Vacancy slots up to adjustedCapacity
                for (let i = machineEmps.length; i < adjustedCapacity; i++) {
                    const isOpSlot = i === 0 && !machineEmps.some(e => e.role.toLowerCase().includes('operador'));
                    const defaultRole = isOpSlot ? 'Operador 1' : 'Auxiliar de Produ√ß√£o';
                    
                    slots.push({
                        name: 'VAGA DISPON√çVEL',
                        role: defaultRole,
                        status: 'Dispon√≠vel'
                    });
                }

                const tableData = slots.map(slot => [
                    slot.name,
                    slot.role,
                    slot.status
                ]);

                autoTable(doc, {
                    startY: yPos,
                    head: [['NOME', 'FUN√á√ÉO', 'STATUS']],
                    body: tableData,
                    theme: 'grid',
                    headStyles: { fillColor: [71, 85, 105], fontSize: 10, halign: 'center' },
                    styles: { fontSize: 11, cellPadding: 3.5 },
                    columnStyles: {
                        0: { cellWidth: 100 },
                        1: { cellWidth: 52 },
                        2: { cellWidth: 30, halign: 'center' }
                    },
                    didParseCell: (data) => {
                        const cellText = data.row.cells[0].text[0];
                        if (cellText && (cellText.startsWith('VAGA DISPON√çVEL') || cellText.startsWith('VAGA EM CONTRATA√á√ÉO'))) {
                            data.cell.styles.fontStyle = 'bold';
                            data.cell.styles.textColor = [220, 38, 38];
                        }
                    },
                    margin: { left: 14, right: 14 },
                    didDrawPage: (data) => { yPos = data.cursor ? data.cursor.y : yPos; }
                });
                yPos += 10;
            });
            yPos += 5;
        });
        yPos += 10;
    };

    // 2. Extrus√£o
    addGroupedSector('SETOR: EXTRUS√ÉO', 'extrusao', ['Cast 1', 'Cast 2'], ['Diurno 1', 'Noturno 1', 'Diurno 2', 'Noturno 2'], 3);

    // 3. Reciclagem
    addGroupedSector('SETOR: RECICLAGEM', 'reciclagem', ['Erema 1'], ['Diurno 1', 'Diurno 2'], 1);

    // 4. Fita
    addGroupedSector('SETOR: FITA ADESIVA', 'fita', ['Ghezzi', 'Lintech', 'Wutec'], ['Diurno 1', 'Diurno 2', 'Comercial'], 2);

    // Rodap√© com n√∫mero de p√°ginas
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(100);
        doc.text(`P√°gina ${i} de ${pageCount} ‚Äî Manu Packaging Ind√∫stria`, 200, 285, { align: 'right' });
    }

    setPdfModal({
      isOpen: true,
      doc,
      filename: `Quadro_Pessoal_Planilha_${now.replace(/\//g, '-')}.pdf`,
      title: `Espelho de Quadro ‚Äî Gerado em: ${nowFull}`
    });
  };

  const exportMonthlyReportToPDF = async () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const nowFull = new Date().toLocaleString('pt-BR');
    
    const [year, month] = dashboardMonth.split('-');
    const formattedMonth = `${month}/${year}`;
    const isRange = !!(filterStartDate && filterEndDate);
    const refPeriod = isRange
      ? `${filterStartDate.split('-').reverse().join('/')} a ${filterEndDate.split('-').reverse().join('/')}`
      : (filterDay ? filterDay.split('-').reverse().join('/') : formattedMonth);
    const isDaily = !!filterDay || isRange;

    // Configura√ß√£o de Estilos e Cabe√ßalho Padr√£o
    const drawHeader = (docInstance: any, pageNum: number) => {
      // Linha superior de destaque
      docInstance.setFillColor(37, 99, 235); // Blue-600
      docInstance.rect(14, 10, pageWidth - 28, 4, 'F');

      docInstance.setFont('helvetica', 'bold');
      docInstance.setFontSize(14);
      docInstance.setTextColor(30, 41, 59); // Slate-800
      docInstance.text('MANUPACKAGING', 14, 22);

      docInstance.setFontSize(10);
      docInstance.setFont('helvetica', 'normal');
      docInstance.setTextColor(100, 116, 139); // Slate-500
      docInstance.text('SISTEMA DE GEST√ÉO E CONTROLE DE PRODU√á√ÉO', 14, 27);

      // On the right side, add logo and shift the right text slightly to the left
      const logoSize = 13;
      const logoX = pageWidth - 14 - logoSize;
      const logoY = 15;
      const rightTextX = logoX - 4;

      docInstance.setFont('helvetica', 'bold');
      docInstance.setTextColor(37, 99, 235);
      docInstance.text(isRange ? 'RELAT√ìRIO DE PER√çODO' : (isDaily ? 'RELAT√ìRIO DI√ÅRIO DE INTELIG√äNCIA' : 'RELAT√ìRIO MENSAL DE INDICADORES'), rightTextX, 22, { align: 'right' });

      docInstance.setFont('helvetica', 'normal');
      docInstance.setTextColor(100, 116, 139);
      docInstance.text(`REF: ${refPeriod}`, rightTextX, 27, { align: 'right' });

      // Drawing the system logo on the right side
      const logoSrc = systemLogo || "https://static.wixstatic.com/media/765089_472b535780514937a09c07be49495392~mv2.png";
      if (logoSrc) {
        try {
          let format = 'PNG';
          if (logoSrc.includes('data:image/jpeg') || logoSrc.includes('.jpg') || logoSrc.includes('.jpeg')) {
            format = 'JPEG';
          } else if (logoSrc.includes('data:image/webp') || logoSrc.includes('.webp')) {
            format = 'WEBP';
          }
          docInstance.addImage(logoSrc, format, logoX, logoY, logoSize, logoSize);
        } catch (err) {
          console.error("Error adding logo to PDF:", err);
        }
      }

      docInstance.setDrawColor(226, 232, 240); // Slate-200
      docInstance.setLineWidth(0.5);
      docInstance.line(14, 31, pageWidth - 14, 31);
    };

    let yPos = 38;

    const checkYPage = (needed: number) => {
      if (yPos + needed > pageHeight - 20) {
        doc.addPage();
        yPos = 38;
        drawHeader(doc, (doc as any).internal.getNumberOfPages());
      }
    };

    let secIdx = 0;
    const roman = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];

    // 1. T√çTULO E METADADOS DO PER√çODO
    drawHeader(doc, 1);

    // Bloco de Identifica√ß√£o
    doc.setFillColor(248, 250, 252); // Slate-50
    doc.rect(14, yPos, pageWidth - 28, 22, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.rect(14, yPos, pageWidth - 28, 22, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(30, 41, 59);
    doc.text(isDaily ? 'RESUMO DOS INDICADORES OPERACIONAIS DI√ÅRIOS' : 'RESUMO GERAL DOS INDICADORES MENSAIS', 18, yPos + 6);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    doc.text(`Operador Selecionado: ${filterOperator === 'Todos' ? 'Todos os Operadores' : filterOperator}`, 18, yPos + 12);
    doc.text(`Emitido por: ${loggedUser?.name || 'Acesso Direto'} - ${loggedUser?.role || 'Fun√ß√£o'} em ${nowFull}`, 18, yPos + 17);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(37, 99, 235);
    const metaPercent = dashboardStats.goal > 0 ? ((dashboardStats.month/dashboardStats.goal)*100).toFixed(1) : '0';
    doc.text(`DESEMPENHO: ${metaPercent}%`, pageWidth - 18, yPos + 12, { align: 'right' });
    
    yPos += 28;

    // Grid de Indicadores Principais (Formato Tabela Compacta)
    const indicatorsData = [
      ['OBJETIVO (META)', formatWeight(dashboardStats.goal), 'FALTA PARA ALCAN√áAR', formatWeight(Math.max(0, dashboardStats.goal - dashboardStats.month))],
      ['PRODU√á√ÉO EXTRUS√ÉO L√çQUIDA', formatWeight(dashboardStats.month), 'PROJE√á√ÉO ESTIMADA', formatWeight(dashboardStats.projection)],
      ['PRODU√á√ÉO EREMA REALIZADA', formatWeight(dashboardStats.eremaMonth), 'M√âDIA DI√ÅRIA NECESS√ÅRIA', `${formatWeight(dashboardStats.avgReq)}/dia`]
    ];

    autoTable(doc, {
      startY: yPos,
      body: indicatorsData,
      theme: 'plain',
      styles: {
        fontSize: 9,
        cellPadding: 4,
        textColor: [51, 65, 85]
      },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 62 },
        1: { fontStyle: 'bold', textColor: [37, 99, 235], cellWidth: 33 },
        2: { fontStyle: 'bold', cellWidth: 62 },
        3: { fontStyle: 'bold', textColor: [220, 38, 38], cellWidth: 33 }
      }
    });

    yPos = (doc as any).lastAutoTable.finalY + 8;

    // C√°lculo e renderiza√ß√£o do Comparativo com o M√™s Anterior (Somente no relat√≥rio consolidado mensal)
    if (!isDaily) {
      checkYPage(45);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(30, 41, 59);
      doc.text(`${roman[secIdx++] || 'I'}. AN√ÅLISE COMPARATIVA COM O M√äS ANTERIOR`, 14, yPos);
      yPos += 5;

      const [currYear, currMonth] = dashboardMonth.split('-').map(Number);
      const prevDate = new Date(currYear, currMonth - 2, 1);
      const prevMonthStr = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;
      const prevMonthFormatted = `${String(prevDate.getMonth() + 1).padStart(2, '0')}/${prevDate.getFullYear()}`;

      const prevMonthGoal = goals[prevMonthStr] || GOAL_VALUE;
      let prevCastTotal = 0;
      let prevEremaTotal = 0;

      productionData.filter(e => e && typeof e.date === 'string' && e.date.startsWith(prevMonthStr)).forEach(e => {
        const isPrevMonthJune = prevMonthStr.endsWith('-06');
        const isExistingPastEntry = !e.updatedAt || e.updatedAt < '2026-06-12T17:44:00Z';
        if (isPrevMonthJune && e.machine.toLowerCase().includes('cast 2') && isExistingPastEntry) {
          return;
        }
        if (e.machine.toLowerCase().includes('erema')) {
          prevEremaTotal += (e.netWeight || 0);
        } else {
          prevCastTotal += (e.netWeight || 0);
        }
      });

      const currentCast = dashboardStats.month;
      const currentErema = dashboardStats.eremaMonth;
      const currentGoal = dashboardStats.goal;

      const diffCast = currentCast - prevCastTotal;
      const pctCast = prevCastTotal > 0 ? (diffCast / prevCastTotal) * 100 : 0;

      const diffErema = currentErema - prevEremaTotal;
      const pctErema = prevEremaTotal > 0 ? (diffErema / prevEremaTotal) * 100 : 0;

      const diffGoal = currentGoal - prevMonthGoal;
      const pctGoal = prevMonthGoal > 0 ? (diffGoal / prevMonthGoal) * 100 : 0;

      const comparisonTableHead = [['M√âTRICA / INDICADOR', `M√äS ANTERIOR (${prevMonthFormatted})`, `M√äS ATUAL (${formattedMonth})`, 'VARIA√á√ÉO VALOR', 'VARIA√á√ÉO (%)']];

      const formatPct = (pct: number) => {
        const sign = pct > 0 ? '+' : '';
        return `${sign}${pct.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
      };

      const formatDiff = (diff: number) => {
        const sign = diff > 0 ? '+' : '';
        return `${sign}${formatWeight(diff)}`;
      };

      const comparisonTableBody = [
        [
          'OBJETIVO / META DE PRODU√á√ÉO',
          formatWeight(prevMonthGoal),
          formatWeight(currentGoal),
          formatDiff(diffGoal),
          formatPct(pctGoal)
        ],
        [
          'PRODU√á√ÉO EXTRUS√ÉO L√çQUIDA (CAST)',
          formatWeight(prevCastTotal),
          formatWeight(currentCast),
          formatDiff(diffCast),
          formatPct(pctCast)
        ],
        [
          'PRODU√á√ÉO RECICLAGEM (EREMA)',
          formatWeight(prevEremaTotal),
          formatWeight(currentErema),
          formatDiff(diffErema),
          formatPct(pctErema)
        ]
      ];

      autoTable(doc, {
        startY: yPos,
        head: comparisonTableHead,
        body: comparisonTableBody,
        theme: 'grid',
        headStyles: {
          fillColor: [37, 99, 235], // Blue-600
          textColor: [255, 255, 255],
          fontSize: 8.5,
          fontStyle: 'bold',
          halign: 'center'
        },
        styles: {
          fontSize: 8,
          cellPadding: 4,
          halign: 'center'
        },
        columnStyles: {
          0: { fontStyle: 'bold', halign: 'left', cellWidth: 60 },
          1: { cellWidth: 32 },
          2: { cellWidth: 32 },
          3: { cellWidth: 32, fontStyle: 'bold' },
          4: { cellWidth: 26, fontStyle: 'bold' }
        },
        didParseCell: function(data) {
          if (data.section === 'body' && (data.column.index === 3 || data.column.index === 4)) {
            const valStr = String(data.cell.raw);
            if (valStr.startsWith('-')) {
              data.cell.styles.textColor = [220, 38, 38]; // Red-600
            } else if (valStr.startsWith('+')) {
              data.cell.styles.textColor = [16, 185, 129]; // Emerald-600
            }
          }
        }
      });

      yPos = (doc as any).lastAutoTable.finalY + 8;
    }

    // 2. DESEMPENHO POR EQUIPAMENTO (Cast 1, Cast 2, Erema)
    const machinesGrouped: Record<string, any> = {};
    const machineList = ['Cast 1', 'Cast 2', 'Erema'];
    
    machineList.forEach(m => {
      machinesGrouped[m] = {
        name: m,
        net: 0,
        gross: 0,
        tara: 0,
        borra: 0,
        ecoA: 0,
        ecoBP: 0,
        ecoBM: 0,
        manut: 0,
        proc: 0,
        outros: 0,
        stops: 0
      };
    });

    filteredDashboardData.forEach(e => {
      let mKey = '';
      if (e.machine.toLowerCase().includes('cast 1')) mKey = 'Cast 1';
      else if (e.machine.toLowerCase().includes('cast 2')) mKey = 'Cast 2';
      else if (e.machine.toLowerCase().includes('erema')) mKey = 'Erema';

      if (mKey && machinesGrouped[mKey]) {
        machinesGrouped[mKey].net += (e.netWeight || 0);
        machinesGrouped[mKey].gross += (e.grossWeight || 0);
        machinesGrouped[mKey].tara += (e.tara || 0);
        machinesGrouped[mKey].borra += (e.borraTotal || 0);
        machinesGrouped[mKey].ecoA += (e.ecoA || 0);
        machinesGrouped[mKey].ecoBP += (e.ecoBP || 0);
        machinesGrouped[mKey].ecoBM += (e.ecoBM || 0);
        machinesGrouped[mKey].manut += (e.manutencaoMin || 0);
        machinesGrouped[mKey].proc += (e.processoMin || 0);
        machinesGrouped[mKey].outros += (e.outrosMin || 0);
        machinesGrouped[mKey].stops += (e.manutencaoMin || 0) + (e.processoMin || 0) + (e.outrosMin || 0);
      }
    });

    // Inje√ß√£o de minutos de m√°quina parada do Cast 2 de 01/06 a 25/06 (junho/2026)
    if (!isDaily && dashboardMonth === '2026-06') {
      if (machinesGrouped['Cast 2']) {
        // Cast 2 come√ßou a produzir apenas no dia 25/06. Do dia 01/06 ao dia 25/06 (24 dias completos), a m√°quina ficou parada.
        // 24 dias * 24 horas/dia * 60 min/hora = 34560 minutos de inatividade pr√©-opera√ß√£o
        machinesGrouped['Cast 2'].outros += 34560;
        machinesGrouped['Cast 2'].stops += 34560;
      }
    }

    checkYPage(10);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(30, 41, 59);
    doc.text(`${roman[secIdx++]}. DESEMPENHO CONSOLIDADO POR EQUIPAMENTO`, 14, yPos);
    yPos += 4;

    const machineTableHead = [['M√ÅQUINA', 'PROD. L√çQUIDA', 'BORRA TOTAL', 'PERDA ECO A', 'ECO B (P)', 'ECO B (M)', 'PARADA MANUT.', 'PARADA PROC.', 'PARADA OUTROS', 'PARADA TOTAL']];
    const machineTableBody = Object.values(machinesGrouped).map((m: any) => [
      m.name,
      formatWeight(m.net),
      formatWeight(m.borra),
      formatWeight(m.ecoA),
      formatWeight(m.ecoBP),
      formatWeight(m.ecoBM),
      `${m.manut} min`,
      `${m.proc} min`,
      `${m.outros} min`,
      `${m.stops} min`
    ]);

    autoTable(doc, {
      startY: yPos,
      head: machineTableHead,
      body: machineTableBody,
      theme: 'grid',
      headStyles: {
        fillColor: [30, 41, 59],
        textColor: [255, 255, 255],
        fontSize: 8,
        fontStyle: 'bold',
        halign: 'center'
      },
      styles: {
        fontSize: 7.5,
        cellPadding: 3,
        halign: 'center'
      },
      columnStyles: {
        0: { fontStyle: 'bold', halign: 'left' }
      }
    });

    yPos = (doc as any).lastAutoTable.finalY + 8;

    // Nota explicativa sobre inatividade pr√©-opera√ß√£o do Cast 2 em junho/2026
    if (!isDaily && dashboardMonth === '2026-06') {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(7);
      doc.setTextColor(100, 116, 139);
      const noteText = '* Nota: Para a extrusora Cast 2, foi inclu√≠do o per√≠odo de inatividade de 01/06 a 25/06 (24 dias = 34.560 minutos / 576,0 h) referente √† parada pr√©-opera√ß√£o antes do in√≠cio das atividades de produ√ß√£o.';
      const splitNote = doc.splitTextToSize(noteText, 180);
      const noteHeight = splitNote.length * 3;
      checkYPage(noteHeight + 6);
      doc.text(splitNote, 14, yPos - 2);
      yPos += noteHeight + 2;
    }

    // 2. PERFORMANCE POR TURNO (DESEMPENHO POR TURNO)
    if (dashboardChartsData.shifts && dashboardChartsData.shifts.length > 0) {
      checkYPage(15);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(30, 41, 59);
      doc.text(`${roman[secIdx++]}. DESEMPENHO POR TURNO`, 14, yPos);
      yPos += 4;

      const shiftTableHead = [['TURNO DO PER√çODO', 'PRODUC√ÉO L√çQUIDA TOTAL (KG)']];
      const shiftTableBody = dashboardChartsData.shifts.map((s: any) => [
        s.name.toUpperCase(),
        formatWeight(s.net)
      ]);

      autoTable(doc, {
        startY: yPos,
        head: shiftTableHead,
        body: shiftTableBody,
        theme: 'grid',
        headStyles: {
          fillColor: [71, 85, 105],
          textColor: [255, 255, 255],
          fontSize: 8,
          fontStyle: 'bold',
          halign: 'center'
        },
        styles: {
          fontSize: 8,
          cellPadding: 4,
          halign: 'center'
        },
        columnStyles: {
          0: { fontStyle: 'bold', halign: 'left', cellWidth: 100 }
        }
      });

      yPos = (doc as any).lastAutoTable.finalY + 8;
    }

    // 3. DESEMPENHO POR OPERADOR (SEPARADO POR EXTRUS√ÉO E RECICLAGEM)
    const extrusionOps: Record<string, any> = {};
    const recyclingOps: Record<string, any> = {};

    filteredDashboardData.forEach(e => {
      if (!e) return;
      if (e.isNoWorkDay || e.isMaintenanceEntry || !e.operator || e.operator.trim() === '') return;
      const isErema = e.machine && e.machine.toLowerCase().includes('erema');
      const target = isErema ? recyclingOps : extrusionOps;
      
      if (!target[e.operator]) {
        target[e.operator] = {
          name: e.operator,
          net: 0,
          borra: 0,
          ecoA: 0,
          ecoBP: 0,
          ecoBM: 0,
          manut: 0,
          proc: 0,
          outros: 0,
          stops: 0
        };
      }
      
      const op = target[e.operator];
      op.net += (e.netWeight || 0);
      op.borra += (e.borraTotal || 0);
      op.ecoA += (e.ecoA || 0);
      op.ecoBP += (e.ecoBP || 0);
      op.ecoBM += (e.ecoBM || 0);
      op.manut += (e.manutencaoMin || 0);
      op.proc += (e.processoMin || 0);
      op.outros += (e.outrosMin || 0);
      op.stops += (e.manutencaoMin || 0) + (e.processoMin || 0) + (e.outrosMin || 0);
    });

    const extrusionOpsList = Object.values(extrusionOps).sort((a: any, b: any) => b.net - a.net);
    const recyclingOpsList = Object.values(recyclingOps).sort((a: any, b: any) => b.net - a.net);

    // INDICADORES EXTRUS√ÉO
    if (extrusionOpsList.length > 0) {
      checkYPage(20);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(30, 41, 59);
      doc.text(`${roman[secIdx++]}. INDICADORES DETALHADOS POR OPERADOR - EXTRUS√ÉO`, 14, yPos);
      yPos += 4;

      const operatorTableHead = [['OPERADOR', 'PROD. L√çQUIDA', 'BORRA (PERDA)', 'ECO A', 'ECO B (PROD)', 'ECO B (MANUT)', 'MANUT. (MIN)', 'PROCESSO (MIN)', 'OUTROS (MIN)', 'TOTAL STOP']];
      const operatorTableBody = extrusionOpsList.map((op: any) => [
        op.name.toUpperCase(),
        formatWeight(op.net),
        formatWeight(op.borra),
        formatWeight(op.ecoA),
        formatWeight(op.ecoBP),
        formatWeight(op.ecoBM),
        `${op.manut} min`,
        `${op.proc} min`,
        `${op.outros} min`,
        `${op.stops} min`
      ]);

      autoTable(doc, {
        startY: yPos,
        head: operatorTableHead,
        body: operatorTableBody,
        theme: 'grid',
        headStyles: {
          fillColor: [37, 99, 235],
          textColor: [255, 255, 255],
          fontSize: 8,
          fontStyle: 'bold',
          halign: 'center'
        },
        styles: {
          fontSize: 7.5,
          cellPadding: 3,
          halign: 'center'
        },
        columnStyles: {
          0: { fontStyle: 'bold', halign: 'left' }
        }
      });

      yPos = (doc as any).lastAutoTable.finalY + 8;
    }

    // INDICADORES RECICLAGEM
    if (recyclingOpsList.length > 0) {
      checkYPage(20);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(30, 41, 59);
      doc.text(`${roman[secIdx++]}. INDICADORES DETALHADOS POR OPERADOR - RECICLAGEM (EREMA)`, 14, yPos);
      yPos += 4;

      const operatorTableHead = [['OPERADOR', 'PROD. L√çQUIDA', 'BORRA (PERDA)', 'ECO A', 'ECO B (PROD)', 'ECO B (MANUT)', 'MANUT. (MIN)', 'PROCESSO (MIN)', 'OUTROS (MIN)', 'TOTAL STOP']];
      const operatorTableBody = recyclingOpsList.map((op: any) => [
        op.name.toUpperCase(),
        formatWeight(op.net),
        formatWeight(op.borra),
        formatWeight(op.ecoA),
        formatWeight(op.ecoBP),
        formatWeight(op.ecoBM),
        `${op.manut} min`,
        `${op.proc} min`,
        `${op.outros} min`,
        `${op.stops} min`
      ]);

      const totalNet = recyclingOpsList.reduce((acc, op) => acc + (op.net || 0), 0);
      const totalBorra = recyclingOpsList.reduce((acc, op) => acc + (op.borra || 0), 0);
      const totalEcoA = recyclingOpsList.reduce((acc, op) => acc + (op.ecoA || 0), 0);
      const totalEcoBP = recyclingOpsList.reduce((acc, op) => acc + (op.ecoBP || 0), 0);
      const totalEcoBM = recyclingOpsList.reduce((acc, op) => acc + (op.ecoBM || 0), 0);
      const totalManut = recyclingOpsList.reduce((acc, op) => acc + (op.manut || 0), 0);
      const totalProc = recyclingOpsList.reduce((acc, op) => acc + (op.proc || 0), 0);
      const totalOutros = recyclingOpsList.reduce((acc, op) => acc + (op.outros || 0), 0);
      const totalStops = recyclingOpsList.reduce((acc, op) => acc + (op.stops || 0), 0);

      const operatorTableFoot = [[
        'TOTAL GERAL',
        formatWeight(totalNet),
        formatWeight(totalBorra),
        formatWeight(totalEcoA),
        formatWeight(totalEcoBP),
        formatWeight(totalEcoBM),
        `${totalManut} min`,
        `${totalProc} min`,
        `${totalOutros} min`,
        `${totalStops} min`
      ]];

      autoTable(doc, {
        startY: yPos,
        head: operatorTableHead,
        body: operatorTableBody,
        foot: operatorTableFoot,
        theme: 'grid',
        headStyles: {
          fillColor: [16, 185, 129],
          textColor: [255, 255, 255],
          fontSize: 8,
          fontStyle: 'bold',
          halign: 'center'
        },
        footStyles: {
          fillColor: [241, 245, 249],
          textColor: [30, 41, 59],
          fontSize: 7.5,
          fontStyle: 'bold',
          halign: 'center'
        },
        styles: {
          fontSize: 7.5,
          cellPadding: 3,
          halign: 'center'
        },
        columnStyles: {
          0: { fontStyle: 'bold', halign: 'left' }
        }
      });

      yPos = (doc as any).lastAutoTable.finalY + 8;
    }

    // BALAN√áO DE ECO B VS RECICLAGEM
    const currentEcoBalance = ecoBalance[dashboardMonth];
    if (currentEcoBalance && !isDaily) {
      checkYPage(20);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(30, 41, 59);
      doc.text(`${roman[secIdx++]}. INVENT√ÅRIO DO BALAN√áO DE ECO B (S√çNTESE ACUMULADA)`, 14, yPos);
      yPos += 5;

      // Track A Title
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(194, 65, 12); // Red/Orange-700
      doc.text(`TRACK A: FLUXO DE COLETAS E RETIRADA DE RES√çDUO (M√âTRICA ECO B)`, 14, yPos);
      yPos += 3.5;

      const ecoTableHead = [['INDICADOR DO ECO B (RES√çDUOS)', 'VALOR ACUMULADO']];
      const ecoTableBody = [
        ['SOBRA DETECTADA DE PER√çODO ANTERIOR (ECO B ACUMULADO)', formatWeight(currentEcoBalance.startingSurplus)],
        ['GERADO NO M√äS CORRENTE (COLETA CAST 1 & CAST 2)', `+ ${formatWeight(currentEcoBalance.monthEcoB)}`],
        ['TOTAL DISPON√çVEL COLETADO PARA PROCESSAMENTO', formatWeight(currentEcoBalance.totalAvailable)],
        ['RECICLADO E PROCESSADO NA M√ÅQUINA EREMA', `- ${formatWeight(currentEcoBalance.monthRecycled)}`],
        ['SOBRA FINAL DE ECO B PENDENTE NO PROCESSO', formatWeight(currentEcoBalance.endingSurplus)]
      ];

      autoTable(doc, {
        startY: yPos,
        head: ecoTableHead,
        body: ecoTableBody,
        theme: 'grid',
        headStyles: {
          fillColor: [249, 115, 22], // Orange-500
          textColor: [255, 255, 255],
          fontSize: 8,
          fontStyle: 'bold',
          halign: 'center'
        },
        styles: {
          fontSize: 7.5,
          cellPadding: 3.5,
          textColor: [30, 41, 59]
        },
        columnStyles: {
          0: { fontStyle: 'bold', cellWidth: 130 },
          1: { fontStyle: 'bold', halign: 'right', textColor: [194, 65, 12] }
        }
      });

      yPos = (doc as any).lastAutoTable.finalY + 6;

      checkYPage(20);
      // Track B Title
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(4, 120, 87); // Emerald-700
      doc.text(`TRACK B: RETORNO DE PELLETS RECICLADOS PARA PRODU√á√ÉO (FEEDBACK)`, 14, yPos);
      yPos += 3.5;

      const pelletsTableHead = [['INDICADOR DE PELLETS RECICLADOS', 'VALOR ACUMULADO']];
      const pelletsTableBody = [
        ['ESTOQUE DE PELLETS RECICLADOS DO PER√çODO ANTERIOR', formatWeight(currentEcoBalance.startingRecycledSurplus)],
        ['PRODUZIDO NA EREMA (ENTRADA DE PELLETS NO ESTOQUE)', `+ ${formatWeight(currentEcoBalance.monthRecycled)}`],
        ['TOTAL DISPON√çVEL DE PELLETS EM ESTOQUE', formatWeight(currentEcoBalance.totalRecycledAvailable)],
        ['REUTILIZADO E ABATIDO NO PROCESSO DE EXTRUS√ÉO (CAST 1 & 2)', `- ${formatWeight(currentEcoBalance.monthRecycledUsed)}`],
        ['SALDO ATUAL DE PELLETS RECICLADOS DISPON√çVEL EM ESTOQUE', formatWeight(currentEcoBalance.endingRecycledSurplus)]
      ];

      autoTable(doc, {
        startY: yPos,
        head: pelletsTableHead,
        body: pelletsTableBody,
        theme: 'grid',
        headStyles: {
          fillColor: [16, 185, 129], // Emerald-500
          textColor: [255, 255, 255],
          fontSize: 8,
          fontStyle: 'bold',
          halign: 'center'
        },
        styles: {
          fontSize: 7.5,
          cellPadding: 3.5,
          textColor: [30, 41, 59]
        },
        columnStyles: {
          0: { fontStyle: 'bold', cellWidth: 130 },
          1: { fontStyle: 'bold', halign: 'right', textColor: [4, 120, 87] }
        }
      });

      yPos = (doc as any).lastAutoTable.finalY + 8;
    }

    // RESUMO DE PARADAS POR M√ÅQUINA E POR OPERADOR (CONSOLIDADO EM HORAS)
    if (machineStopsDetails && machineStopsDetails.length > 0) {
      checkYPage(20);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(30, 41, 59);
      doc.text(`${roman[secIdx++]}. RESUMO DE HORAS DE PARADAS`, 14, yPos);
      yPos += 5;

      const formatHours = (min: number) => {
        const hrs = min / 60;
        return hrs.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + ' h';
      };

      // Tabela de Paradas por M√°quina
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(51, 65, 85);
      doc.text('RESUMO DE PARADAS POR M√ÅQUINA', 14, yPos);
      yPos += 4;

      const machineStopsHead = [['M√ÅQUINA', 'PARADA MANUTEN√á√ÉO', 'PARADA PROCESSO', 'OUTRAS PARADAS', 'TOTAL DE PARADAS']];
      const machineStopsBody = Object.values(machinesGrouped).map((m: any) => [
        m.name.toUpperCase(),
        formatHours(m.manut),
        formatHours(m.proc),
        formatHours(m.outros),
        formatHours(m.stops)
      ]);

      const mTotalManut = Object.values(machinesGrouped).reduce((acc: number, m: any) => acc + (m.manut || 0), 0);
      const mTotalProc = Object.values(machinesGrouped).reduce((acc: number, m: any) => acc + (m.proc || 0), 0);
      const mTotalOutros = Object.values(machinesGrouped).reduce((acc: number, m: any) => acc + (m.outros || 0), 0);
      const mTotalStops = Object.values(machinesGrouped).reduce((acc: number, m: any) => acc + (m.stops || 0), 0);

      const machineStopsFoot = [[
        'TOTAL GERAL',
        formatHours(mTotalManut),
        formatHours(mTotalProc),
        formatHours(mTotalOutros),
        formatHours(mTotalStops)
      ]];

      autoTable(doc, {
        startY: yPos,
        head: machineStopsHead,
        body: machineStopsBody,
        foot: machineStopsFoot,
        theme: 'grid',
        headStyles: {
          fillColor: [220, 38, 38], // Red-600
          textColor: [255, 255, 255],
          fontSize: 8,
          fontStyle: 'bold',
          halign: 'center'
        },
        footStyles: {
          fillColor: [241, 245, 249],
          textColor: [30, 41, 59],
          fontSize: 8,
          fontStyle: 'bold',
          halign: 'center'
        },
        styles: {
          fontSize: 7.5,
          cellPadding: 3,
          halign: 'center'
        },
        columnStyles: {
          0: { fontStyle: 'bold', halign: 'left' }
        }
      });

      yPos = (doc as any).lastAutoTable.finalY + 8;

      // Nota explicativa sobre inatividade pr√©-opera√ß√£o do Cast 2 em junho/2026
      if (!isDaily && dashboardMonth === '2026-06') {
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(7);
        doc.setTextColor(100, 116, 139);
        const noteText = '* Nota: Para a extrusora Cast 2, foi inclu√≠do o per√≠odo de inatividade de 01/06 a 25/06 (24 dias = 576,0 h) referente √† parada pr√©-opera√ß√£o antes do in√≠cio das atividades de produ√ß√£o.';
        const splitNote = doc.splitTextToSize(noteText, 180);
        const noteHeight = splitNote.length * 3;
        checkYPage(noteHeight + 6);
        doc.text(splitNote, 14, yPos - 2);
        yPos += noteHeight + 2;
      }

      // Tabela de Paradas por Operador
      checkYPage(20);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(51, 65, 85);
      doc.text('RESUMO DE PARADAS POR OPERADOR', 14, yPos);
      yPos += 4;

      const operatorStops: Record<string, { name: string; manut: number; proc: number; outros: number; stops: number }> = {};
      filteredDashboardData.forEach(e => {
        if (!e) return;
        if (e.isNoWorkDay || e.isMaintenanceEntry || !e.operator || e.operator.trim() === '') return;
        const opName = e.operator.toUpperCase();
        if (!operatorStops[opName]) {
          operatorStops[opName] = { name: opName, manut: 0, proc: 0, outros: 0, stops: 0 };
        }
        operatorStops[opName].manut += (e.manutencaoMin || 0);
        operatorStops[opName].proc += (e.processoMin || 0);
        operatorStops[opName].outros += (e.outrosMin || 0);
        operatorStops[opName].stops += (e.manutencaoMin || 0) + (e.processoMin || 0) + (e.outrosMin || 0);
      });

      const operatorStopsList = Object.values(operatorStops)
        .filter(op => op.stops > 0)
        .sort((a, b) => b.stops - a.stops);

      const operatorStopsHead = [['OPERADOR', 'PARADA MANUTEN√á√ÉO', 'PARADA PROCESSO', 'OUTRAS PARADAS', 'TOTAL DE PARADAS']];
      const operatorStopsBody = operatorStopsList.map((op: any) => [
        op.name,
        formatHours(op.manut),
        formatHours(op.proc),
        formatHours(op.outros),
        formatHours(op.stops)
      ]);

      const opTotalManut = operatorStopsList.reduce((acc: number, op: any) => acc + (op.manut || 0), 0);
      const opTotalProc = operatorStopsList.reduce((acc: number, op: any) => acc + (op.proc || 0), 0);
      const opTotalOutros = operatorStopsList.reduce((acc: number, op: any) => acc + (op.outros || 0), 0);
      const opTotalStops = operatorStopsList.reduce((acc: number, op: any) => acc + (op.stops || 0), 0);

      const operatorStopsFoot = [[
        'TOTAL GERAL',
        formatHours(opTotalManut),
        formatHours(opTotalProc),
        formatHours(opTotalOutros),
        formatHours(opTotalStops)
      ]];

      autoTable(doc, {
        startY: yPos,
        head: operatorStopsHead,
        body: operatorStopsBody,
        foot: operatorStopsFoot,
        theme: 'grid',
        headStyles: {
          fillColor: [37, 99, 235], // Blue-600
          textColor: [255, 255, 255],
          fontSize: 8,
          fontStyle: 'bold',
          halign: 'center'
        },
        footStyles: {
          fillColor: [241, 245, 249],
          textColor: [30, 41, 59],
          fontSize: 8,
          fontStyle: 'bold',
          halign: 'center'
        },
        styles: {
          fontSize: 7.5,
          cellPadding: 3,
          halign: 'center'
        },
        columnStyles: {
          0: { fontStyle: 'bold', halign: 'left' }
        }
      });

      yPos = (doc as any).lastAutoTable.finalY + 8;
    }

    // 9. GR√ÅFICOS DE INDICADORES (AN√ÅLISE DE PERDAS, DESEMPENHO E BALAN√áO)
    const captureChartImage = async (id: string): Promise<string | null> => {
      const element = document.getElementById(id);
      if (!element) return null;
      try {
        const canvas = await html2canvas(element, {
          backgroundColor: '#ffffff',
          scale: 1.2, // Reduzido de 2 para 1.2 para otimizar tamanho do PDF
          logging: false,
          useCORS: true,
          onclone: (clonedDoc) => {
            // Replace all oklch color references in all style sheets to prevent html2canvas oklch crash
            const styleElements = clonedDoc.querySelectorAll('style');
            styleElements.forEach((style) => {
              if (style.innerHTML) {
                style.innerHTML = style.innerHTML.replace(/oklch\([^)]+\)/g, 'rgb(100, 116, 139)');
              }
            });

            // Also scan inline styles for any oklch colors
            const allElements = clonedDoc.querySelectorAll('*');
            allElements.forEach((el) => {
              const htmlEl = el as HTMLElement;
              if (htmlEl.style) {
                for (let i = 0; i < htmlEl.style.length; i++) {
                  const styleName = htmlEl.style[i];
                  const value = htmlEl.style.getPropertyValue(styleName);
                  if (value && value.includes('oklch')) {
                    htmlEl.style.setProperty(styleName, value.replace(/oklch\([^)]+\)/g, 'rgb(100, 116, 139)'));
                  }
                }
              }
            });
          }
        });
        return canvas.toDataURL('image/jpeg', 0.6); // Convertido para JPEG com qualidade 0.6 para excelente compress√£o
      } catch (err) {
        console.error(`Erro ao renderizar gr√°fico ${id} para o PDF:`, err);
        return null;
      }
    };

    try {
      // Adiciona uma p√°gina espec√≠fica para os gr√°ficos de Evolu√ß√£o de Perdas e Dispers√£o
      doc.addPage();
      yPos = 38;
      const currentPagesCount1 = (doc as any).internal.getNumberOfPages();
      drawHeader(doc, currentPagesCount1);
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(30, 41, 59);
      doc.text(`${roman[secIdx++] || 'IX'}. AN√ÅLISE GR√ÅFICA: PERDAS, PRODU√á√ÉO E DISPERS√ÉO`, 14, yPos);
      yPos += 6;

      const imgComposed = await captureChartImage('pdf-chart-composed');
      if (imgComposed) {
        doc.addImage(imgComposed, 'JPEG', 14, yPos, pageWidth - 28, 70);
        yPos += 70 + 4;
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(71, 85, 105);
        const explanation1 = "An√°lise da Evolu√ß√£o de Perdas vs Produ√ß√£o L√≠quida: Este gr√°fico apresenta o comportamento di√°rio do volume de produ√ß√£o em kg comparativamente aos res√≠duos de processo (Eco B de Produ√ß√£o, Eco B de Manuten√ß√£o e Res√≠duo Borra). A rela√ß√£o visual ajuda a identificar tend√™ncias de aumento de refugo operacional ou desvios mec√¢nicos ao longo do per√≠odo.";
        const splitExplanation1 = doc.splitTextToSize(explanation1, pageWidth - 28);
        doc.text(splitExplanation1, 14, yPos);
        yPos += splitExplanation1.length * 4 + 8;
      }

      const imgScatter = await captureChartImage('pdf-chart-scatter');
      if (imgScatter) {
        doc.addImage(imgScatter, 'JPEG', 14, yPos, pageWidth - 28, 70);
        yPos += 70 + 4;
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(71, 85, 105);
        const explanation2 = "An√°lise de Dispers√£o do Desempenho por Operador: Este indicador mapeia individualmente cada operador com base na sua produ√ß√£o l√≠quida total (Eixo X) e no volume de desperd√≠cio gerado (Eixo Y). O di√¢metro do ponto reflete o tempo despendido em paradas de processo. O quadrante ideal est√° localizado no canto inferior direito (alta produtividade com baixo desperd√≠cio).";
        const splitExplanation2 = doc.splitTextToSize(explanation2, pageWidth - 28);
        doc.text(splitExplanation2, 14, yPos);
      }

      // Adiciona outra p√°gina espec√≠fica para os gr√°ficos de Breakdown de Paradas e Balan√ßo de Massa
      doc.addPage();
      yPos = 38;
      const currentPagesCount2 = (doc as any).internal.getNumberOfPages();
      drawHeader(doc, currentPagesCount2);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(30, 41, 59);
      doc.text(`${roman[secIdx++] || 'X'}. AN√ÅLISE GR√ÅFICA: PARADAS E BALAN√áO DE MASSA`, 14, yPos);
      yPos += 6;

      const imgStacked = await captureChartImage('pdf-chart-stacked');
      if (imgStacked) {
        doc.addImage(imgStacked, 'JPEG', 14, yPos, pageWidth - 28, 70);
        yPos += 70 + 4;
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(71, 85, 105);
        const explanation3 = "An√°lise Proporcional de Motivos de Paradas de M√°quina: Este gr√°fico detalha a distribui√ß√£o percentual acumulada (100%) dos motivos de paradas que causaram indisponibilidade nos principais equipamentos de extrus√£o e reciclagem. A separa√ß√£o em categorias (Manuten√ß√£o, Processo e Outras Paradas) facilita a elabora√ß√£o de planos de a√ß√£o priorit√°rios para aumento do OEE.";
        const splitExplanation3 = doc.splitTextToSize(explanation3, pageWidth - 28);
        doc.text(splitExplanation3, 14, yPos);
        yPos += splitExplanation3.length * 4 + 8;
      }

      const imgDonut = await captureChartImage('pdf-chart-donut');
      if (imgDonut) {
        doc.addImage(imgDonut, 'JPEG', 14, yPos, pageWidth - 28, 70);
        yPos += 70 + 4;
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(71, 85, 105);
        const explanation4 = "An√°lise do Balan√ßo de Massa de Materiais: O balan√ßo de massa correlaciona o total de res√≠duos termopl√°sticos industriais coletados (Eco B Gerado) no setor de extrus√£o com a quantidade efetivamente reprocessada e recuperada de forma sustent√°vel (Reciclado Erema). Este indicador √© crucial para medir a taxa de efici√™ncia de circularidade da planta.";
        const splitExplanation4 = doc.splitTextToSize(explanation4, pageWidth - 28);
        doc.text(splitExplanation4, 14, yPos);
      }
    } catch (chartErr) {
      console.error('Erro ao adicionar gr√°ficos ao PDF:', chartErr);
    }

    // N√∫meros de P√°gina e Rodap√©
    const totalPages = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text(`Relat√≥rio de Prod. e Indicadores ‚Äî Ref: ${refPeriod}`, 14, pageHeight - 10);
      doc.text(`P√°gina ${i} de ${totalPages}`, pageWidth - 14, pageHeight - 10, { align: 'right' });
    }

    const docTitle = isRange ? `Relat√≥rio de Per√≠odo ‚Äî Refer√™ncia: ${refPeriod}` : (isDaily ? `Relat√≥rio Di√°rio ‚Äî Refer√™ncia: ${refPeriod}` : `Relat√≥rio Mensal Consolidado ‚Äî Refer√™ncia: ${refPeriod}`);
    const cleanPeriodString = refPeriod.replace(/\//g, '-').replace(/\s+/g, '_');
    setPdfModal({
      isOpen: true,
      doc,
      filename: `Relatorio_Producao_Indicadores_${cleanPeriodString}.pdf`,
      title: docTitle
    });
  };

  const handleSaveTraining = async (data: Partial<TrainingRecord>) => {
    try {
      const id = data.id || doc(collection(db, 'training_records')).id;
      const record = {
        ...data,
        id,
        createdAt: data.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      await setDoc(doc(db, 'training_records', id), record, { merge: true });
      await exportTrainingToPDF(record as TrainingRecord);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'training_records');
    }
  };

  const handleDeleteTraining = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'training_records', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `training_records/${id}`);
    }
  };

  const handleSaveOperatorTrainingSheet = async (sheet: Partial<OperatorTrainingSheet>) => {
    try {
      const id = sheet.id || doc(collection(db, 'operator_training_sheets')).id;
      const record = {
        ...sheet,
        id,
        lastUpdated: new Date().toISOString()
      };
      await setDoc(doc(db, 'operator_training_sheets', id), record, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'operator_training_sheets');
    }
  };

  const handleDeleteOperatorTrainingSheet = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'operator_training_sheets', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `operator_training_sheets/${id}`);
    }
  };

  const confirmDeleteOperatorTrainingSheet = (id: string, name: string) => {
    openConfirm(
      'Confirmar Exclus√£o de Ficha',
      `Deseja realmente EXCLUIR a ficha de treinamento de ${name}? Esta a√ß√£o √© permanente e remover√° todas as informa√ß√µes do sistema e do banco de dados.`,
      () => handleDeleteOperatorTrainingSheet(id)
    );
  };

  const exportPromotionEvaluationPDF = (operatorName: string) => {
    const [refYearStr, refMonthStr] = dashboardMonth.split('-');
    const refYear = parseInt(refYearStr, 10);
    const refMonth = parseInt(refMonthStr, 10);

    const opDataList = productionData.filter(e => {
      if (e.operator !== operatorName) return false;
      if (!e.date) return false;
      if (e.isNoWorkDay || e.isMaintenanceEntry) return false;

      const [entryYearStr, entryMonthStr] = e.date.split('-');
      const entryYear = parseInt(entryYearStr, 10);
      const entryMonth = parseInt(entryMonthStr, 10);
      if (isNaN(entryYear) || isNaN(entryMonth)) return false;

      const monthsDiff = (refYear - entryYear) * 12 + (refMonth - entryMonth);

      let limit = 1;
      if (promotionTimeframe === '2_months') limit = 2;
      else if (promotionTimeframe === '3_months') limit = 3;
      else if (promotionTimeframe === '6_months') limit = 6;
      else if (promotionTimeframe === '1_year') limit = 12;

      return monthsDiff >= 0 && monthsDiff < limit;
    });

    if (opDataList.length === 0) {
      const tfLabelStr = promotionTimeframe === 'current' ? 'o m√™s atual' :
                        promotionTimeframe === '2_months' ? 'os √∫ltimos 2 meses' :
                        promotionTimeframe === '3_months' ? 'os √∫ltimos 3 meses' :
                        promotionTimeframe === '6_months' ? 'os √∫ltimos 6 meses' : 'o √∫ltimo 1 ano';
      alert(`N√£o h√° registros de produ√ß√£o no per√≠odo de avalia√ß√£o selecionado (${tfLabelStr}) para o operador ${operatorName}.`);
      return;
    }
    
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const nowFull = new Date().toLocaleString('pt-BR');

    // Sum up metrics for this operator
    let prod = 0;
    let ecoA = 0;
    let ecoBP = 0;
    let ecoBM = 0;
    let borra = 0;
    let wastes = 0;
    let manut = 0;
    let proc = 0;
    let outros = 0;
    let stopsTotal = 0;
    let totalNetForReject = 0;
    let totalEcoBForReject = 0;
    const totalEntries = opDataList.length;

    opDataList.forEach(e => {
      prod += (e.netWeight || 0);
      ecoA += (e.ecoA || 0);
      ecoBP += (e.ecoBP || 0);
      ecoBM += (e.ecoBM || 0);
      borra += (e.borraTotal || 0);
      wastes += (e.ecoBP || 0) + (e.ecoBM || 0) + (e.borraTotal || 0);
      manut += (e.manutencaoMin || 0);
      proc += (e.processoMin || 0);
      outros += (e.outrosMin || 0);
      stopsTotal += (e.manutencaoMin || 0) + (e.processoMin || 0) + (e.outrosMin || 0);

      if (!e.machine.toLowerCase().includes('erema')) {
        totalNetForReject += (e.netWeight || 0);
      }
      totalEcoBForReject += (e.ecoBP || 0) + (e.ecoBM || 0);
    });

    const rejectCoefValue = (totalNetForReject + totalEcoBForReject) > 0
      ? (totalEcoBForReject / (totalNetForReject + totalEcoBForReject)) * 100
      : 0;

    // Calculate metrics for all other operators in the exact same timeframe
    const otherEntries = productionData.filter(e => {
      if (e.operator === operatorName) return false;
      if (!e.date) return false;
      if (e.isNoWorkDay || e.isMaintenanceEntry) return false;

      const [entryYearStr, entryMonthStr] = e.date.split('-');
      const entryYear = parseInt(entryYearStr, 10);
      const entryMonth = parseInt(entryMonthStr, 10);
      if (isNaN(entryYear) || isNaN(entryMonth)) return false;

      const monthsDiff = (refYear - entryYear) * 12 + (refMonth - entryMonth);

      let limit = 1;
      if (promotionTimeframe === '2_months') limit = 2;
      else if (promotionTimeframe === '3_months') limit = 3;
      else if (promotionTimeframe === '6_months') limit = 6;
      else if (promotionTimeframe === '1_year') limit = 12;

      return monthsDiff >= 0 && monthsDiff < limit;
    });

    const uniqueOtherOps = Array.from(new Set(otherEntries.map(e => e.operator).filter(Boolean)));
    const otherOpsCount = uniqueOtherOps.length || 1;

    let otherProdSum = 0;
    let otherWastesSum = 0;
    otherEntries.forEach(e => {
      otherProdSum += (e.netWeight || 0);
      otherWastesSum += (e.ecoBP || 0) + (e.ecoBM || 0) + (e.borraTotal || 0);
    });

    const avgOtherProd = otherProdSum / otherOpsCount;
    const avgOtherWastes = otherWastesSum / otherOpsCount;

    // 1. Productivity Index
    // Let's assume an average cast production of 2500 kg per record is optimal (100 points)
    const avgProdPerEntry = totalEntries > 0 ? prod / totalEntries : 0;
    const prodScore = Math.max(0, Math.min(100, Math.round((avgProdPerEntry / 2500) * 100)));

    // 2. Quality/Waste Index (Based on Reject Coefficient)
    // If reject coef is <= 1.5% -> 100 points. If >= 8% -> 0 points.
    let qualityScore = 100;
    if (rejectCoefValue <= 1.5) {
      qualityScore = 100;
    } else if (rejectCoefValue >= 8) {
      qualityScore = 0;
    } else {
      qualityScore = Math.round(100 - ((rejectCoefValue - 1.5) / (8 - 1.5)) * 100);
    }

    // 3. Critical Waste Index (Borra)
    // Borra / Production ratio. If <= 0.2% -> 100 points. If >= 2% -> 0 points.
    const borraPercent = prod > 0 ? (borra / prod) * 100 : 0;
    let borraScore = 100;
    if (borraPercent <= 0.2) {
      borraScore = 100;
    } else if (borraPercent >= 2) {
      borraScore = 0;
    } else {
      borraScore = Math.round(100 - ((borraPercent - 0.2) / (2 - 0.2)) * 100);
    }

    // 4. Time Efficiency Index (Stoppage time per entry)
    // If average stoppage time per entry is <= 15 min -> 100 points. If >= 90 min -> 0 points.
    const avgStopsPerEntry = totalEntries > 0 ? stopsTotal / totalEntries : 0;
    let timeScore = 100;
    if (avgStopsPerEntry <= 15) {
      timeScore = 100;
    } else if (avgStopsPerEntry >= 90) {
      timeScore = 0;
    } else {
      timeScore = Math.round(100 - ((avgStopsPerEntry - 15) / (90 - 15)) * 100);
    }

    // Overall Score: Weighted average
    // Productivity: 35%, Quality: 30%, Time: 20%, Borra: 15%
    const finalScore = Math.round(
      (prodScore * 0.35) + 
      (qualityScore * 0.30) + 
      (timeScore * 0.20) + 
      (borraScore * 0.15)
    );

    // Rating & Recommendations
    let rating = '';
    let ratingColor: [number, number, number] = [0, 0, 0]; // RGB
    let recommendation = '';
    let profileSummary = '';

    if (finalScore >= 90) {
      rating = 'A - ALTAMENTE RECOMENDADO';
      ratingColor = [16, 185, 129]; // Emerald
      recommendation = 'Eleg√≠vel para promo√ß√£o imediata a Operador L√≠der / N√≠vel S√™nior.';
      profileSummary = 'Operador de alt√≠ssima performance, com excepcional equil√≠brio entre velocidade de extrus√£o, disciplina t√©cnica e absoluto zelo pela redu√ß√£o de desperd√≠cios (refugos m√≠nimos).';
    } else if (finalScore >= 80) {
      rating = 'B - RECOMENDADO';
      ratingColor = [59, 130, 246]; // Blue
      recommendation = 'Eleg√≠vel para promo√ß√£o de n√≠vel operacional (ex: Pleno/S√™nior).';
      profileSummary = 'Operador s√≥lido e altamente confi√°vel. Mant√©m a m√°quina est√°vel com bom volume produzido e baixas taxas de paradas t√©cnicas, demonstrando prontid√£o para novas responsabilidades.';
    } else if (finalScore >= 70) {
      rating = 'C - ELEG√çVEL COM RESSALVAS';
      ratingColor = [245, 158, 11]; // Amber
      recommendation = 'Aguardar pr√≥ximo ciclo. Sugerido treinamento de reciclagem t√©cnica.';
      profileSummary = 'Operador cumpre as metas b√°sicas, mas apresenta pontos de oscila√ß√£o na qualidade (taxa de refugo ou borra elevada) ou tempos prolongados de paradas operacionais. Recomenda-se acompanhamento por um tutor.';
    } else {
      rating = 'D - EM DESENVOLVIMENTO';
      ratingColor = [239, 68, 68]; // Red
      recommendation = 'Necessita de plano de melhoria de desempenho (PIP) imediato.';
      profileSummary = 'Desempenho abaixo das diretrizes de efici√™ncia esperadas. Apresenta gargalos severos de produtividade ou alto volume de desperd√≠cio. Requer reciclagem urgente sobre setups e regulagem de m√°quina.';
    }

    // --- PAGE 1: DECORATIVE HEADER, CORE SCORE & PARECER ---
    doc.setFillColor(15, 23, 42); // slate-900
    doc.rect(0, 0, pageWidth, 26, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text("MANUPACKAGING - GEST√ÉO E CONTROLE DE PRODU√á√ÉO", 12, 10);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text("DOSSI√ä T√âCNICO DE AVALIA√á√ÉO DE DESEMPENHO OPERACIONAL PARA FINS DE PROMO√á√ÉO", 12, 16);
    doc.setFont('helvetica', 'bold');
    doc.text(`CANDIDATO(A): ${operatorName.toUpperCase()}`, 12, 21);

    // Date & Sub-filters
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    const dates = opDataList.map(e => e.date).sort();
    const pStart = dates.length > 0 ? dates[0].split('-').reverse().join('/') : 'In√≠cio';
    const pEnd = dates.length > 0 ? dates[dates.length - 1].split('-').reverse().join('/') : 'Fim';
    const tfLabel = promotionTimeframe === 'current' ? 'M√™s Atual' :
                    promotionTimeframe === '2_months' ? '√öltimos 2 Meses' :
                    promotionTimeframe === '3_months' ? '√öltimos 3 Meses' :
                    promotionTimeframe === '6_months' ? '√öltimos 6 Meses' : '√öltimo 1 Ano';
    doc.text(`Per√≠odo do Dossi√™: ${tfLabel} (${pStart} at√© ${pEnd})`, 12, 33);
    doc.text(`Base de Dados: ${totalEntries} lan√ßamentos analisados`, 12, 37);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(`Emitido em: ${nowFull}`, pageWidth - 12, 33, { align: 'right' });

    // Divider
    doc.setDrawColor(226, 232, 240);
    doc.line(12, 41, pageWidth - 12, 41);

    // Score block container
    doc.setFillColor(248, 250, 252); // slate-50
    doc.rect(12, 45, pageWidth - 24, 30, 'F');
    doc.setDrawColor(203, 213, 225);
    doc.rect(12, 45, pageWidth - 24, 30, 'D');

    // Big Score Square decoration
    doc.setFillColor(ratingColor[0], ratingColor[1], ratingColor[2]);
    doc.rect(16, 49, 22, 22, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(`${finalScore}`, 27, 60, { align: 'center' });
    doc.setFontSize(6.5);
    doc.text("PONTOS", 27, 65, { align: 'center' });

    // Score Details
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text("SCORE GERAL DE ELEGIBILIDADE OPERACIONAL (SGEO)", 44, 52);

    doc.setFontSize(10);
    doc.setTextColor(ratingColor[0], ratingColor[1], ratingColor[2]);
    doc.text(`PARECER: ${rating}`, 44, 58);

    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.setFont('helvetica', 'normal');
    doc.text(`Recomenda√ß√£o T√©cnica: ${recommendation}`, 44, 63);
    
    doc.setFontSize(7.5);
    const splitSummary = doc.splitTextToSize(`Sum√°rio do Perfil: ${profileSummary}`, pageWidth - 12 - 44);
    doc.text(splitSummary, 44, 68);

    // Section 1: Radar/Bar Chart comparing criteria
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text("1. GR√ÅFICO - RADAR DE CAPACIDADES OPERACIONAIS (NOTAS 0-100)", 12, 82);

    const chartY = 87;
    const barMaxWidth = 150;
    const pillars = [
      { label: "Produtividade de Extrus√£o", score: prodScore, weight: "35%", desc: "Volume m√©dio de bobinas extrudadas/embaladas por per√≠odo ativo.", color: [79, 70, 229] },
      { label: "Controle de Qualidade (Refugos)", score: qualityScore, weight: "30%", desc: "Baixo √≠ndice de desperd√≠cio Eco B gerado em produ√ß√£o.", color: [16, 185, 129] },
      { label: "Efici√™ncia Operacional de Tempo", score: timeScore, weight: "20%", desc: "Setup r√°pido e baixo tempo de m√°quina inativa nas paradas.", color: [245, 158, 11] },
      { label: "Zelo Tecnol√≥gico (Borra Cabe√ßote)", score: borraScore, weight: "15%", desc: "Baixo √≠ndice de borra s√≥lida purgada do cabe√ßote.", color: [225, 29, 72] }
    ];

    pillars.forEach((p, idx) => {
      const itemY = chartY + idx * 14;
      const scoreWidth = (p.score / 100) * barMaxWidth;
      const thresholdWidth = (80 / 100) * barMaxWidth;

      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(47, 55, 69);
      doc.text(`${p.label} (Peso: ${p.weight})`, 12, itemY + 3);

      // Bar outline background starting at x = 12
      doc.setFillColor(241, 245, 249);
      doc.rect(12, itemY + 5, barMaxWidth, 4, 'F');
      // Bar value fill
      doc.setFillColor(p.color[0], p.color[1], p.color[2]);
      doc.rect(12, itemY + 5, scoreWidth, 4, 'F');

      // Red dashed vertical line for Promotion Target (80 points)
      doc.setDrawColor(220, 38, 38); // red-600
      doc.setLineDashPattern([1, 1], 0);
      doc.line(12 + thresholdWidth, itemY + 4, 12 + thresholdWidth, itemY + 10);
      doc.setLineDashPattern([], 0); // reset

      // Print value & rating next to the bar
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      const valColor = p.score >= 80 ? [22, 163, 74] : [220, 38, 38];
      doc.setTextColor(valColor[0], valColor[1], valColor[2]);
      doc.text(`${p.score} pts`, 12 + barMaxWidth + 3, itemY + 8.5);
    });

    // Promotion Threshold Legend
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(220, 38, 38);
    doc.text("--- Linha tracejada vermelha representa a meta de 80 pontos para recomenda√ß√£o de promo√ß√£o.", 12, chartY + 58);

    // Explanation Block for Chart 1
    doc.setFillColor(248, 250, 252);
    doc.rect(12, chartY + 62, pageWidth - 24, 16, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.rect(12, chartY + 62, pageWidth - 24, 16, 'D');

    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text("Explica√ß√£o das M√©tricas de Avalia√ß√£o Operacional:", 16, chartY + 66);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    const desc1 = "Este gr√°fico de pilares avalia as compet√™ncias cr√≠ticas do operador em rela√ß√£o ao ideal fabril (80 pontos ou mais). Operadores excelentes mant√™m alta produtividade (kg/h) ao mesmo tempo em que mitigam perdas mec√¢nicas (tempo inativo) e perdas f√≠sicas de mat√©ria-prima (aparas de Eco B e borra s√≥lida), otimizando a rentabilidade do equipamento.";
    const splitDesc1 = doc.splitTextToSize(desc1, pageWidth - 32);
    doc.text(splitDesc1, 16, chartY + 70);


    // Section 2: Gr√°fico - Efici√™ncia de Extrus√£o vs Desperd√≠cio
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text("2. GR√ÅFICO - BALAN√áO DE RENDIMENTO DE MAT√âRIA-PRIMA", 12, 172);

    const chart2Y = 177;
    const rawTotal = prod + wastes;
    const prodPct = rawTotal > 0 ? (prod / rawTotal) * 100 : 0;
    const wastePct = rawTotal > 0 ? (wastes / rawTotal) * 100 : 0;

    const pBarWidth = (prodPct / 100) * barMaxWidth;
    const wBarWidth = (wastePct / 100) * barMaxWidth;

    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105);
    doc.text("Aproveitamento de Resina %", 12, chart2Y + 3);
    doc.setFillColor(241, 245, 249);
    doc.rect(12, chart2Y + 5, barMaxWidth, 4, 'F');
    doc.setFillColor(79, 70, 229);
    doc.rect(12, chart2Y + 5, pBarWidth, 4, 'F');
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(8);
    doc.text(`${prodPct.toFixed(2)}%`, 12 + barMaxWidth + 3, chart2Y + 8.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    doc.text("√çndice Geral de Perda %", 12, chart2Y + 12);
    doc.setFillColor(241, 245, 249);
    doc.rect(12, chart2Y + 14, barMaxWidth, 4, 'F');
    doc.setFillColor(225, 29, 72);
    doc.rect(12, chart2Y + 14, wBarWidth, 4, 'F');
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(8);
    doc.text(`${wastePct.toFixed(2)}%`, 12 + barMaxWidth + 3, chart2Y + 17.5);

    // Explanation Block for Chart 2
    doc.setFillColor(248, 250, 252);
    doc.rect(12, chart2Y + 21, pageWidth - 24, 16, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.rect(12, chart2Y + 21, pageWidth - 24, 16, 'D');

    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text("Explica√ß√£o do Gr√°fico (Rendimento de Mat√©ria-Prima):", 16, chart2Y + 25);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    const desc2 = "Este gr√°fico demonstra o aproveitamento real da mat√©ria-prima alimentada na m√°quina durante as opera√ß√µes do candidato. Para fins de promo√ß√£o, a taxa de perda deve idealmente se manter abaixo de 3% (e o aproveitamento acima de 97%). Uma taxa de desperd√≠cio controlada atesta excel√™ncia na regulagem da matriz e calandra.";
    const splitDesc2 = doc.splitTextToSize(desc2, pageWidth - 32);
    doc.text(splitDesc2, 16, chart2Y + 29);

    // Section 3: Gr√°fico - Comparativo de Produ√ß√£o e Perdas (vs Outros Operadores)
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text("3. GR√ÅFICO - COMPARATIVO DE PRODU√á√ÉO E PERDAS (vs OUTROS OPERADORES)", 12, 220);

    const chart3Y = 225;
    const maxProd = Math.max(prod, avgOtherProd, 1);
    const maxWastes = Math.max(wastes, avgOtherWastes, 1);

    const cProdWidth = (prod / maxProd) * barMaxWidth;
    const oProdWidth = (avgOtherProd / maxProd) * barMaxWidth;

    const cWastesWidth = (wastes / maxWastes) * barMaxWidth;
    const oWastesWidth = (avgOtherWastes / maxWastes) * barMaxWidth;

    // Produ√ß√£o L√≠quida
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105);
    doc.text("Prod. L√≠quida (Candidato)", 12, chart3Y + 3);
    doc.setFillColor(241, 245, 249);
    doc.rect(12, chart3Y + 5, barMaxWidth, 3, 'F');
    doc.setFillColor(79, 70, 229); // indigo-600
    doc.rect(12, chart3Y + 5, cProdWidth, 3, 'F');
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(8);
    doc.text(formatWeight(prod), 12 + barMaxWidth + 3, chart3Y + 7.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text("M√©dia de Outros Operadores (Produ√ß√£o)", 12, chart3Y + 11);
    doc.setFillColor(241, 245, 249);
    doc.rect(12, chart3Y + 13, barMaxWidth, 3, 'F');
    doc.setFillColor(148, 163, 184); // slate-400
    doc.rect(12, chart3Y + 13, oProdWidth, 3, 'F');
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(8);
    doc.text(formatWeight(avgOtherProd), 12 + barMaxWidth + 3, chart3Y + 15.5);

    // Perdas (Desperd√≠cio)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    doc.text("Perdas Totais (Candidato)", 12, chart3Y + 19);
    doc.setFillColor(241, 245, 249);
    doc.rect(12, chart3Y + 21, barMaxWidth, 3, 'F');
    doc.setFillColor(225, 29, 72); // rose-600
    doc.rect(12, chart3Y + 21, cWastesWidth, 3, 'F');
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(8);
    doc.text(formatWeight(wastes), 12 + barMaxWidth + 3, chart3Y + 23.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text("M√©dia de Outros Operadores (Perdas)", 12, chart3Y + 27);
    doc.setFillColor(241, 245, 249);
    doc.rect(12, chart3Y + 29, barMaxWidth, 3, 'F');
    doc.setFillColor(148, 163, 184); // slate-400
    doc.rect(12, chart3Y + 29, oWastesWidth, 3, 'F');
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(8);
    doc.text(formatWeight(avgOtherWastes), 12 + barMaxWidth + 3, chart3Y + 31.5);

    // Explanation Block for Chart 3
    doc.setFillColor(248, 250, 252);
    doc.rect(12, chart3Y + 35, pageWidth - 24, 15, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.rect(12, chart3Y + 35, pageWidth - 24, 15, 'D');

    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text("Explica√ß√£o do Gr√°fico Comparativo:", 16, chart3Y + 39);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    const desc3 = "Compara o desempenho absoluto de produ√ß√£o l√≠quida e gera√ß√£o de res√≠duos (Eco B + Borra) do candidato contra a m√©dia dos demais operadores ativos no mesmo per√≠odo. Candidatos recomendados √† promo√ß√£o devem idealmente superar ou se igualar √† produ√ß√£o m√©dia do time, mantendo perdas significativamente inferiores.";
    const splitDesc3 = doc.splitTextToSize(desc3, pageWidth - 32);
    doc.text(splitDesc3, 16, chart3Y + 43);

    // Footer Page 1
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(148, 163, 184);
    doc.text("P√°gina 1 de 2", pageWidth / 2, pageHeight - 10, { align: 'center' });


    // --- PAGE 2: TABLE WITH HARD DATA & AUTOTEXT FOR SIGNATURES ---
    doc.addPage();

    // Page 2 header band
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, pageWidth, 16, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(`DOSSI√ä DE PROMO√á√ÉO ‚Äî CANDIDATO: ${operatorName.toUpperCase()}`, 12, 10.5);

    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.text("4. TABELA DETALHADA DE M√âTRICAS OPERACIONAIS REAIS", 12, 26);

    const tableHead = [['INDICADOR T√âCNICO', 'M√âTRICA REAL', 'PONTUA√á√ÉO', 'CRIT√âRIO DE EXCEL√äNCIA (META)']];
    const tableBody = [
      ['Produ√ß√£o Total Embalada (Cast)', formatWeight(prod), `${prodScore} / 100`, 'M√©dia >= 2.500 Kg por lan√ßamento'],
      ['Envio de Refugo Limpo (Eco A)', formatWeight(ecoA), 'Informativo', 'Redestina√ß√£o positiva de aparas de filme'],
      ['√çndice de Descartes (Eco B P. + M.)', formatWeight(ecoBP + ecoBM), `${qualityScore} / 100`, 'Descarte total de Eco B <= 1.5% da Prod.'],
      ['Res√≠duo de Borra Purga Cabe√ßote', formatWeight(borra), `${borraScore} / 100`, 'Res√≠duo de Borra <= 0.2% da Prod.'],
      ['Tempo de M√°quina Parada (Total)', formatMinutes(stopsTotal), `${timeScore} / 100`, 'M√©dia de Parada <= 15 min por lanc.'],
      ['Coeficiente de Rejeito Real (%)', `${rejectCoefValue.toFixed(2)}%`, 'Pilar de Qualidade', 'Manter abaixo de 3.00%'],
      ['SCORE FINAL DE PROMO√á√ÉO (SGEO)', `${finalScore} PONTOS`, `${finalScore >= 80 ? 'APROVADO' : 'AGUARDAR'}`, 'M√≠nimo de 80 pontos para Elegibilidade']
    ];

    autoTable(doc, {
      startY: 31,
      head: tableHead,
      body: tableBody,
      theme: 'grid',
      headStyles: {
        fillColor: [15, 23, 42],
        textColor: [255, 255, 255],
        fontSize: 8,
        fontStyle: 'bold'
      },
      styles: {
        fontSize: 7.5,
        cellPadding: 3
      },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 55 },
        1: { fontStyle: 'bold', halign: 'left', cellWidth: 35 },
        2: { fontStyle: 'bold', halign: 'center', cellWidth: 30, textColor: [79, 70, 229] },
        3: { textColor: [100, 116, 139] }
      }
    });

    // Section 4: Parecer do Comit√™ de Avalia√ß√£o
    const section4Y = (doc as any).lastAutoTable.finalY + 10;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text("5. PARECER DO COMIT√ä DE AVALIA√á√ÉO DE PROMO√á√ïES", 12, section4Y);

    doc.setFillColor(250, 250, 250);
    doc.rect(12, section4Y + 4, pageWidth - 24, 34, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.rect(12, section4Y + 4, pageWidth - 24, 34, 'D');

    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(47, 55, 69);
    
    doc.rect(18, section4Y + 9, 3, 3);
    if (finalScore >= 80) {
      doc.setFont('helvetica', 'bold');
      doc.text("X", 19, section4Y + 11.5);
    }
    doc.text("APROVADO PARA PROMO√á√ÉO", 24, section4Y + 11.5);

    doc.rect(80, section4Y + 9, 3, 3);
    if (finalScore < 80 && finalScore >= 70) {
      doc.setFont('helvetica', 'bold');
      doc.text("X", 81, section4Y + 11.5);
    }
    doc.text("RETIDO COM RECOMENDA√á√ÉO DE TREINAMENTO", 86, section4Y + 11.5);

    doc.rect(160, section4Y + 9, 3, 3);
    if (finalScore < 70) {
      doc.setFont('helvetica', 'bold');
      doc.text("X", 161, section4Y + 11.5);
    }
    doc.text("DESCLASSIFICADO", 166, section4Y + 11.5);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(148, 163, 184);
    doc.text("Justificativa do Comit√™: ____________________________________________________________________________________", 18, section4Y + 20);
    doc.text("_________________________________________________________________________________________________________", 18, section4Y + 26);
    doc.text("Data da Delibera√ß√£o: ____/____/2026", 18, section4Y + 32);

    const sigY = pageHeight - 35;
    doc.setDrawColor(203, 213, 225);
    doc.line(20, sigY, 85, sigY);
    doc.line(125, sigY, 190, sigY);

    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text(operatorName.toUpperCase(), 52.5, sigY + 4, { align: 'center' });
    doc.text("Assinatura do Candidato", 52.5, sigY + 8, { align: 'center' });

    doc.text("DIRETORIA / SUPERVIS√ÉO DE PRODU√á√ÉO", 157.5, sigY + 4, { align: 'center' });
    doc.text("Manupackaging Brasil", 157.5, sigY + 8, { align: 'center' });

    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(148, 163, 184);
    doc.text("P√°gina 2 de 2", pageWidth / 2, pageHeight - 10, { align: 'center' });

    setPdfModal({
      isOpen: true,
      doc,
      filename: `Dossie_Promocao_${operatorName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`,
      title: `Dossi√™ de Promo√ß√£o - Candidato: ${operatorName}`
    });
  };

  const handleSaveTrainingTemplate = async (template: TrainingTemplate) => {
    try {
      await setDoc(doc(db, 'settings', 'training_template'), template);
      setIsTemplateModalOpen(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'settings/training_template');
    }
  };

  const exportTrainingToPDF = async (training: TrainingRecord) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 10;
    const footerH = 15;
    let y = 10;

    // Helper to parse HTML rich text into structured blocks with formatting and alignment preserved natively in jsPDF
    const parseHtmlToFormattedBlocks = (html: string) => {
      if (!html || !html.trim()) return [];

      const parser = new DOMParser();
      const parsedDoc = parser.parseFromString(html, 'text/html');

      interface FormattedSegment {
        text: string;
        isBold: boolean;
        isItalic: boolean;
        isUnderline: boolean;
      }

      interface FormattedLine {
        segments: FormattedSegment[];
        align: 'left' | 'center' | 'right' | 'justify';
        isListItem?: boolean;
        isFirstLineOfListItem?: boolean;
        headerLevel?: number;
        isExtraSpacingAfter?: boolean;
      }

      interface RawBlock {
        element: HTMLElement;
        tag: string;
        listType?: 'bullet' | 'ordered';
        listIndex?: number;
        align: 'left' | 'center' | 'right' | 'justify';
        headerLevel: number;
        isListItem: boolean;
      }

      const blocks: RawBlock[] = [];

      const processNode = (node: Node, parentListType?: 'bullet' | 'ordered', listCounter = { val: 1 }) => {
        if (node.nodeType !== Node.ELEMENT_NODE) return;
        const el = node as HTMLElement;
        const tag = el.tagName.toLowerCase();

        let align: 'left' | 'center' | 'right' | 'justify' = 'left';
        const className = el.className || '';
        const styleAttr = el.getAttribute('style') || '';

        if (className.includes('ql-align-center') || /text-align\s*:\s*center/i.test(styleAttr)) align = 'center';
        else if (className.includes('ql-align-right') || /text-align\s*:\s*right/i.test(styleAttr)) align = 'right';
        else if (className.includes('ql-align-justify') || /text-align\s*:\s*justify/i.test(styleAttr)) align = 'justify';
        else if (className.includes('ql-align-left') || /text-align\s*:\s*left/i.test(styleAttr)) align = 'left';

        if (tag === 'ul') {
          const counter = { val: 1 };
          Array.from(el.childNodes).forEach(child => processNode(child, 'bullet', counter));
          return;
        }

        if (tag === 'ol') {
          const counter = { val: 1 };
          Array.from(el.childNodes).forEach(child => processNode(child, 'ordered', counter));
          return;
        }

        if (tag === 'li') {
          const dataList = el.getAttribute('data-list');
          const currentListType = dataList === 'ordered' ? 'ordered' : (dataList === 'bullet' ? 'bullet' : (parentListType || 'bullet'));
          const idx = listCounter.val++;
          blocks.push({
            element: el,
            tag: 'li',
            listType: currentListType,
            listIndex: idx,
            align,
            headerLevel: 0,
            isListItem: true
          });
          return;
        }

        if (tag === 'p' || tag === 'div' || tag === 'blockquote' || /^h[1-6]$/.test(tag)) {
          let headerLevel = 0;
          if (/^h[1-6]$/.test(tag)) {
            headerLevel = parseInt(tag.charAt(1));
          }
          blocks.push({
            element: el,
            tag,
            align,
            headerLevel,
            isListItem: false
          });
          return;
        }

        Array.from(el.childNodes).forEach(child => processNode(child, parentListType, listCounter));
      };

      Array.from(parsedDoc.body.childNodes).forEach(child => processNode(child));

      if (blocks.length === 0) {
        const p = parsedDoc.createElement('p');
        p.textContent = parsedDoc.body.textContent || html;
        blocks.push({ element: p, tag: 'p', align: 'left', headerLevel: 0, isListItem: false });
      }

      const traverseInline = (node: Node, currentStyle: { isBold: boolean; isItalic: boolean; isUnderline: boolean }, segments: FormattedSegment[]) => {
        if (node.nodeType === Node.TEXT_NODE) {
          const text = node.textContent || '';
          if (text) {
            segments.push({ text, ...currentStyle });
          }
          return;
        }

        if (node.nodeType === Node.ELEMENT_NODE) {
          const el = node as HTMLElement;
          const tag = el.tagName.toLowerCase();

          // Ignore Quill UI bullet/number spans if present inside li
          if (el.classList.contains('ql-ui')) return;

          const style = { ...currentStyle };
          if (tag === 'b' || tag === 'strong' || el.style.fontWeight === 'bold' || parseInt(el.style.fontWeight) >= 600) {
            style.isBold = true;
          }
          if (tag === 'i' || tag === 'em' || el.style.fontStyle === 'italic') {
            style.isItalic = true;
          }
          if (tag === 'u' || el.style.textDecoration?.includes('underline')) {
            style.isUnderline = true;
          }

          Array.from(el.childNodes).forEach(child => traverseInline(child, style, segments));
        }
      };

      const formattedLines: FormattedLine[] = [];

      blocks.forEach((block) => {
        const rawSegments: FormattedSegment[] = [];
        traverseInline(block.element, { isBold: block.headerLevel > 0, isItalic: false, isUnderline: false }, rawSegments);

        const segments: FormattedSegment[] = [];
        if (block.isListItem) {
          const prefix = block.listType === 'ordered' ? `${block.listIndex}. ` : '‚Ä¢ ';
          const fullRawText = rawSegments.map(s => s.text).join('').trimStart();
          const startsWithNumber = /^\d+[\.\)]\s/.test(fullRawText);
          const startsWithBullet = /^[\u2022\u25CF\u2218\*\-]\s/.test(fullRawText);

          if (!startsWithNumber && !startsWithBullet) {
            segments.push({ text: prefix, isBold: false, isItalic: false, isUnderline: false });
          }
        }

        rawSegments.forEach(s => segments.push(s));

        const totalText = segments.map(s => s.text).join('').trim();
        if (!totalText) {
          formattedLines.push({
            segments: [{ text: '', isBold: false, isItalic: false, isUnderline: false }],
            align: block.align,
            headerLevel: block.headerLevel,
            isListItem: false,
            isExtraSpacingAfter: true
          });
          return;
        }

        interface StyledWord {
          text: string;
          isBold: boolean;
          isItalic: boolean;
          isUnderline: boolean;
        }

        const words: StyledWord[] = [];
        segments.forEach(seg => {
          const parts = seg.text.split(/(\s+)/);
          parts.forEach(part => {
            if (part) {
              words.push({
                text: part,
                isBold: seg.isBold,
                isItalic: seg.isItalic,
                isUnderline: seg.isUnderline
              });
            }
          });
        });

        if (words.length === 0) return;

        const maxLineWidth = pageWidth - 30; // 180mm inside 190mm box
        let currentLineWords: StyledWord[] = [];
        let isFirstLineOfBlock = true;

        const getWordsWidth = (wordList: StyledWord[]) => {
          let w = 0;
          wordList.forEach(item => {
            let fontStyle = 'normal';
            if (item.isBold && item.isItalic) fontStyle = 'bolditalic';
            else if (item.isBold) fontStyle = 'bold';
            else if (item.isItalic) fontStyle = 'italic';

            doc.setFont('helvetica', fontStyle);
            doc.setFontSize(block.headerLevel > 0 ? (12 - block.headerLevel) : 9);
            w += doc.getTextWidth(item.text);
          });
          return w;
        };

        const pushLine = (lineWords: StyledWord[], isFirst: boolean) => {
          const lineSegments: FormattedSegment[] = [];
          lineWords.forEach(w => {
            const last = lineSegments[lineSegments.length - 1];
            if (last && last.isBold === w.isBold && last.isItalic === w.isItalic && last.isUnderline === w.isUnderline) {
              last.text += w.text;
            } else {
              lineSegments.push({ text: w.text, isBold: w.isBold, isItalic: w.isItalic, isUnderline: w.isUnderline });
            }
          });

          formattedLines.push({
            segments: lineSegments,
            align: block.align,
            isListItem: block.isListItem,
            isFirstLineOfListItem: block.isListItem && isFirst,
            headerLevel: block.headerLevel
          });
        };

        words.forEach(word => {
          const testLine = [...currentLineWords, word];
          const allowedWidth = (block.isListItem && !isFirstLineOfBlock) ? (maxLineWidth - 5) : maxLineWidth;

          if (currentLineWords.length === 0 || getWordsWidth(testLine) <= allowedWidth) {
            currentLineWords.push(word);
          } else {
            pushLine(currentLineWords, isFirstLineOfBlock);
            isFirstLineOfBlock = false;
            if (word.text.trim() === '' && word.text.length > 0) {
              currentLineWords = [];
            } else {
              currentLineWords = [word];
            }
          }
        });

        if (currentLineWords.length > 0) {
          pushLine(currentLineWords, isFirstLineOfBlock);
        }
      });

      return formattedLines;
    };

    const formattedContentLines = parseHtmlToFormattedBlocks(training.content);
    const contentLineHeight = 5.0;
    const contentH = Math.max(25, (formattedContentLines.length * contentLineHeight) + 10);

    const drawHeader = (startY: number) => {
      doc.setLineWidth(0.4);
      doc.setDrawColor(0);
      doc.rect(10, startY, 50, 18);  // Logo Box
      doc.rect(60, startY, 100, 18); // Title Box
      doc.rect(160, startY, 40, 18); // Code Box

      if (trainingTemplate.logoBase64) {
        try {
          doc.addImage(trainingTemplate.logoBase64, 'PNG', 12, startY + 1, 46, 16);
        } catch (e) {
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(trainingTemplate.titleFontSize - 4);
          doc.text(trainingTemplate.companyName, 12, startY + 6);
          doc.text(trainingTemplate.subCompanyName, 12, startY + 11);
          doc.setFontSize(trainingTemplate.baseFontSize - 5);
          doc.setFont('helvetica', 'normal');
          doc.text(trainingTemplate.subtitle, 12, startY + 15);
        }
      } else {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(trainingTemplate.titleFontSize - 4);
        doc.text(trainingTemplate.companyName, 12, startY + 6);
        doc.text(trainingTemplate.subCompanyName, 12, startY + 11);
        doc.setFontSize(trainingTemplate.baseFontSize - 5);
        doc.setFont('helvetica', 'normal');
        doc.text(trainingTemplate.subtitle, 12, startY + 15);
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(trainingTemplate.titleFontSize);
      doc.text('LISTA DE PRESEN√áA', 110, startY + 11, { align: 'center' }); 
      
      doc.setFontSize(trainingTemplate.baseFontSize + 1);
      doc.setFont('helvetica', 'bold');
      doc.text(trainingTemplate.formCode, 180, startY + 11, { align: 'center' });
    };

    const drawFooter = () => {
      const pageCount = (doc as any).internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(trainingTemplate.baseFontSize - 4);
        doc.setFont('helvetica', 'normal');
        doc.text(trainingTemplate.footerText, 10, pageHeight - 8);
        doc.text(`P√°gina ${i} de ${pageCount}`, pageWidth - 10, pageHeight - 8, { align: 'right' });
      }
    };

    const checkPageBreak = (neededH: number, repeatHeader: boolean = true) => {
      if (y + neededH > pageHeight - footerH) {
        doc.addPage();
        y = 10;
        if (repeatHeader) {
          drawHeader(y);
          y += 18;
        }
        // Always reset to a default state, or caller must re-set
        doc.setFont('helvetica', 'normal');
        return true;
      }
      return false;
    };

    // --- Page 1 Start ---
    drawHeader(y);
    y += 18;

    const rowH = 7;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(trainingTemplate.baseFontSize - 2.5);

    // Info Rows
    const infoRows = [
      { label: 'TREINAMENTO:', val: training.training, cols: [50, 140] },
      { label: 'DATA:', val: training.date.split('-').reverse().join('/'), label2: 'CARGA HOR√ÅRIA (H):', val2: training.duration, cols: [50, 40, 60, 40] },
      { label: 'LOCAL:', val: training.location, cols: [50, 140] },
      { label: 'INSTRUTOR:', val: training.instructor, cols: [50, 140] }
    ];

    infoRows.forEach(row => {
      checkPageBreak(rowH);
      let xPos = 10;
      if (row.cols.length === 2) {
        doc.rect(xPos, y, row.cols[0], rowH);
        doc.text(row.label, xPos + 2, y + 4.5);
        doc.rect(xPos + row.cols[0], y, row.cols[1], rowH);
        doc.setFont('helvetica', 'normal');
        doc.text(row.val, xPos + row.cols[0] + 2, y + 4.5);
        doc.setFont('helvetica', 'bold');
      } else {
        doc.rect(10, y, 50, rowH); doc.text('DATA:', 12, y + 4.5);
        doc.rect(60, y, 40, rowH); doc.setFont('helvetica', 'normal'); doc.text(row.val, 62, y + 4.5);
        doc.rect(100, y, 60, rowH); doc.setFont('helvetica', 'bold'); doc.text('CARGA HOR√ÅRIA (H):', 102, y + 4.5);
        doc.rect(160, y, 40, rowH); doc.setFont('helvetica', 'normal'); doc.text(row.val2 || '', 162, y + 4.5);
      }
      y += rowH;
    });

    y += 2; // Spacer

    // Table Header
    const colWidths = [10, 25, 100, 55]; // Reduzi Nome completo (115 -> 100), aumentei Visto (40 -> 55)
    const colLabels = ['N¬∫', 'Matr√≠cula', 'Nome completo (leg√≠vel)', 'Visto'];
    checkPageBreak(rowH);
    let xHead = 10;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    colWidths.forEach((w, i) => {
      doc.rect(xHead, y, w, rowH);
      doc.text(colLabels[i], xHead + w/2, y + 4.5, { align: 'center' });
      xHead += w;
    });
    y += rowH;

    // Participants Rows with fixed row height of 9 and font size of 9 (no dynamic scaling)
    const totalRows = Math.max(13, training.participants.length);
    const participantRowH = 9; 
    const textOffset = 6.0; // Perfectly centers size 9 font vertically in an 9px row height

    doc.setFont('helvetica', 'normal'); 
    doc.setFontSize(9);
    for (let i = 0; i < totalRows; i++) {
        if (checkPageBreak(participantRowH)) {
            // Re-apply participant font style after page break
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(9);
        }
        const participant = training.participants[i];
        let xPos = 10;
        colWidths.forEach((w, j) => {
            doc.rect(xPos, y, w, participantRowH);
            if (participant) {
                if (j === 0) doc.text((i + 1).toString().padStart(2, '0'), xPos + w/2, y + textOffset, { align: 'center' });
                if (j === 1) doc.text(participant.registration, xPos + w/2, y + textOffset, { align: 'center' });
                if (j === 2) doc.text(participant.name.toUpperCase(), xPos + 2, y + textOffset);
            } else if (j === 0) {
              doc.text((i + 1).toString().padStart(2, '0'), xPos + w/2, y + textOffset, { align: 'center' });
            }
            xPos += w;
        });
        y += participantRowH;
    }

    // Programming Content Section
    y += 4;
    checkPageBreak(16 + 25);

    // Programming Content Header
    doc.rect(10, y, pageWidth - 20, 8);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('Conte√∫do Program√°tico', pageWidth/2, y + 5.5, { align: 'center' });
    y += 8;

    doc.rect(10, y, pageWidth - 20, 8);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('Obs.: Preencha o conte√∫do aplicado no treinamento ou curso', 12, y + 5);
    y += 8;

    if (formattedContentLines.length > 0) {
      const boxLeftMargin = 15;
      const boxRightMargin = pageWidth - 15;
      const boxWidth = pageWidth - 20;

      let currentBoxStartY = y;

      formattedContentLines.forEach((lineObj) => {
        if (checkPageBreak(contentLineHeight)) {
          currentBoxStartY = y;
        }

        const fontSize = lineObj.headerLevel ? (12 - lineObj.headerLevel) : 9;

        // Calculate total width of all segments in lineObj
        let totalLineWidth = 0;
        lineObj.segments.forEach((seg) => {
          let style = 'normal';
          if (seg.isBold && seg.isItalic) style = 'bolditalic';
          else if (seg.isBold) style = 'bold';
          else if (seg.isItalic) style = 'italic';

          doc.setFont('helvetica', style);
          doc.setFontSize(fontSize);
          totalLineWidth += doc.getTextWidth(seg.text);
        });

        // Determine starting X based on alignment & list item indent
        let currentX = boxLeftMargin;
        if (lineObj.isListItem && !lineObj.isFirstLineOfListItem) {
          currentX = boxLeftMargin + 4;
        }

        if (lineObj.align === 'center') {
          currentX = (pageWidth / 2) - (totalLineWidth / 2);
        } else if (lineObj.align === 'right') {
          currentX = boxRightMargin - totalLineWidth;
        }

        const lineY = y + 4.5;

        // Render each segment in the line
        lineObj.segments.forEach((seg) => {
          let style = 'normal';
          if (seg.isBold && seg.isItalic) style = 'bolditalic';
          else if (seg.isBold) style = 'bold';
          else if (seg.isItalic) style = 'italic';

          doc.setFont('helvetica', style);
          doc.setFontSize(fontSize);

          doc.text(seg.text, currentX, lineY);

          const segW = doc.getTextWidth(seg.text);
          if (seg.isUnderline) {
            doc.setLineWidth(0.2);
            doc.line(currentX, lineY + 0.5, currentX + segW, lineY + 0.5);
          }

          currentX += segW;
        });

        y += contentLineHeight;
        if (lineObj.isExtraSpacingAfter) {
          y += 2.0;
        }
      });

      // Ensure a minimum height for the box if lines were few
      const renderH = y - currentBoxStartY;
      const minBoxH = Math.max(renderH, 20);
      doc.rect(10, currentBoxStartY, boxWidth, minBoxH);
      if (minBoxH > renderH) {
        y = currentBoxStartY + minBoxH;
      }
    } else {
      const emptyBoxH = 25;
      doc.rect(10, y, pageWidth - 20, emptyBoxH);
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(9);
      doc.text('Obs.: Conte√∫do program√°tico n√£o preenchido', 15, y + 6.5);
      y += emptyBoxH;
    }

    // Final Footer
    drawFooter();
    setPdfModal({
      isOpen: true,
      doc,
      filename: `Ficha_Treinamento_${training.date}.pdf`,
      title: `Ficha de Treinamento ‚Äî ${training.training}`
    });
  };

  const findEmployee = (s: string, m: string, sh: string, r: string) => 
    employees.find(e => e.sector === s && e.machine === m && e.shift === sh && e.role === r && (e.status === 'Ativo' || e.status === 'Em Contrata√ß√£o'));

  const normalize = (s: string | undefined | null) => 
    (s || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, "");

  const isEmployed = (s: string) => {
    const n = normalize(s);
    return ['ativo', 'ferias', 'atestado'].includes(n);
  };

  const isRelevantSector = (s: string) => {
    const n = normalize(s);
    return ['extrusao', 'reciclagem', 'fita', 'lideranca'].includes(n);
  };

  const totalAtivos = employees.filter(e => isEmployed(e.status) && normalize(e.sector) !== 'lideranca' && isRelevantSector(e.sector)).length;
  const totalOperadoresAtivos = employees.filter(e => isEmployed(e.status) && normalize(e.sector) !== 'lideranca' && e.role?.toLowerCase().includes('operador')).length;
  const totalAuxiliaresAtivos = employees.filter(e => isEmployed(e.status) && normalize(e.sector) !== 'lideranca' && e.role?.toLowerCase().includes('auxiliar')).length;
  
  const handleSaveVacation = async (vac: Vacation) => {
    try {
      const docRef = doc(db, 'vacations', vac.id);
      await setDoc(docRef, vac);
    } catch (err) {
      console.error('Erro ao salvar f√©rias:', err);
      throw err;
    }
  };

  const handleDeleteVacation = async (vacationId: string) => {
    try {
      const docRef = doc(db, 'vacations', vacationId);
      await deleteDoc(docRef);
    } catch (err) {
      console.error('Erro ao excluir f√©rias:', err);
      throw err;
    }
  };

  const handleGenerateVacationPlan = async (generatedVacations: Vacation[]) => {
    try {
      const existing2026 = vacations.filter(v => v.year === 2026);
      const deletePromises = existing2026.map(v => deleteDoc(doc(db, 'vacations', v.id)));
      await Promise.all(deletePromises);

      const savePromises = generatedVacations.map(v => setDoc(doc(db, 'vacations', v.id), v));
      await Promise.all(savePromises);
    } catch (err) {
      console.error('Erro ao gerar plano de f√©rias:', err);
      throw err;
    }
  };

  const handleDeleteVacancySlot = (sector: string, machine: string, shift: string, role: string, employee?: Employee) => {
    openConfirm(
      'Confirmar Exclus√£o de Vaga',
      `Deseja realmente EXCLUIR esta vaga do setor ${sector}, m√°quina ${machine}, turno ${shift}? Esta a√ß√£o remover√° as informa√ß√µes do sistema e do banco de dados.`,
      async () => {
        try {
          const now = new Date().toISOString();
          const logId = Math.random().toString(36).substring(2, 15);

          if (employee && employee.id) {
            await setDoc(doc(db, 'employees', employee.id), {
              status: 'Vaga Exclu√≠da',
              name: 'Vaga Exclu√≠da',
              updatedAt: now,
              userId: currentUser?.uid || 'anonymous'
            }, { merge: true });

            await setDoc(doc(db, 'personnelLogs', logId), {
              id: logId,
              userId: currentUser?.uid || 'anonymous',
              date: now,
              employeeName: employee.name || 'Vaga',
              action: 'Exclus√£o' as any,
              details: `Vaga de contrata√ß√£o exclu√≠da permanentemente (${sector} - ${machine} - ${shift})`,
              user: loggedUser?.name || 'Sistema'
            });

            const simulatedEmps = employees.map(e => e.id === employee.id ? { ...e, name: 'Vaga Exclu√≠da', status: 'Vaga Exclu√≠da' as any } : e);
            await syncOperatorsSetting(simulatedEmps);
          } else {
            const id = Math.random().toString(36).substring(2, 15);
            const empData: Employee = {
              id,
              registration: '',
              name: 'Vaga Exclu√≠da',
              role,
              sector,
              machine,
              shift,
              status: 'Vaga Exclu√≠da',
              updatedAt: now
            };
            await setDoc(doc(db, 'employees', id), {
              ...empData,
              userId: currentUser?.uid || 'anonymous'
            });

            await setDoc(doc(db, 'personnelLogs', logId), {
              id: logId,
              userId: currentUser?.uid || 'anonymous',
              date: now,
              employeeName: 'Vaga',
              action: 'Exclus√£o' as any,
              details: `Vaga exclu√≠da permanentemente (${sector} - ${machine} - ${shift} - ${role})`,
              user: loggedUser?.name || 'Sistema'
            });

            const simulatedEmps = [...employees, empData];
            await syncOperatorsSetting(simulatedEmps);
          }
        } catch (err) {
          console.error("Erro ao excluir vaga:", err);
        }
      }
    );
  };

  const totalVacancies = useMemo(() => {
    let count = 0;
    const isOccupying = (s: string) => {
      const n = normalize(s);
      return ['ativo', 'atestado'].includes(n);
    };
    
    // Extrus√£o: 24 slots (4 turns * 2 machines * 3 staff)
    ['Cast 1', 'Cast 2'].forEach(ma => {
      ['Diurno 1', 'Noturno 1', 'Diurno 2', 'Noturno 2'].forEach(sh => {
        const occupied = employees.filter(e => normalize(e.sector) === 'extrusao' && normalize(e.machine) === normalize(ma) && normalize(e.shift) === normalize(sh) && isOccupying(e.status)).length;
        const excluded = employees.filter(e => normalize(e.sector) === 'extrusao' && normalize(e.machine) === normalize(ma) && normalize(e.shift) === normalize(sh) && normalize(e.status) === 'vaga excluida').length;
        count += Math.max(0, (3 - excluded) - occupied);
      });
    });
    
    // Reciclagem: 2 slots (2 turns * 1 staff)
    ['Diurno 1', 'Diurno 2'].forEach(sh => {
      const occupied = employees.filter(e => normalize(e.sector) === 'reciclagem' && normalize(e.machine) === 'erema 1' && normalize(e.shift) === normalize(sh) && isOccupying(e.status)).length;
      const excluded = employees.filter(e => normalize(e.sector) === 'reciclagem' && normalize(e.machine) === 'erema 1' && normalize(e.shift) === normalize(sh) && normalize(e.status) === 'vaga excluida').length;
      count += Math.max(0, (1 - excluded) - occupied);
    });

    // Fita:
    ['Ghezzi', 'Lintech', 'Wutec'].forEach(ma => {
        const isLintech = normalize(ma) === 'lintech';
        const machineShifts = isLintech ? ['Comercial'] : ['Diurno 1', 'Diurno 2'];
        machineShifts.forEach(sh => {
            const occupied = employees.filter(e => normalize(e.sector) === 'fita' && normalize(e.machine) === normalize(ma) && normalize(e.shift) === normalize(sh) && isOccupying(e.status)).length;
            const excluded = employees.filter(e => normalize(e.sector) === 'fita' && normalize(e.machine) === normalize(ma) && normalize(e.shift) === normalize(sh) && normalize(e.status) === 'vaga excluida').length;
            count += Math.max(0, (2 - excluded) - occupied);
        });
    });

    return count;
  }, [employees]);

  const formatDateBR = (dateStr?: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  };

  const renderSlot = (sector: string, machine: string, shift: string, role: string, label: string, employee?: Employee, keySuffix?: string) => {
    const emp = employee;
    const isHiring = emp?.status === 'Em Contrata√ß√£o';
    const isVacant = !emp || isHiring;

    // Determine if employee is part of the Fire Brigade
    const isBrigadista = emp && collaborators.find(c => 
      (emp.collaboratorId && c.id === emp.collaboratorId) || 
      (emp.registration && c.registration === emp.registration)
    )?.isBrigadista;

    // Find if someone is on vacation for this slot
    const vacationing = employees.find(e => 
      e.id !== emp?.id &&
      normalize(e.sector) === normalize(sector) &&
      normalize(e.machine) === normalize(machine) &&
      normalize(e.shift) === normalize(shift) &&
      normalize(e.role) === normalize(role || emp?.role || '') &&
      e.status === 'F√©rias'
    );
    
    return (
      <div 
        key={emp ? emp.id : `${sector}-${machine}-${shift}-${role}${keySuffix || ''}`} 
        onClick={() => { 
            if (emp && !isHiring) {
              setEmployeeDetailData(emp);
              setIsDetailModalOpen(true);
            } else {
              if (!canManagePersonnel) return;
              setSelectedSlot({ sector, machine, shift, role: isHiring ? emp.role : role });
              if (isHiring && emp) setSelectedEmployee(emp);
              setIsEmployeeModalOpen(true); 
            }
        }} 
        draggable={!!emp && !isHiring && canManagePersonnel}
        onDragStart={(e) => {
          if (emp) {
            e.dataTransfer.setData('text/plain', emp.id);
            e.dataTransfer.effectAllowed = 'move';
          }
        }}
        onDragOver={(e) => {
          if (canManagePersonnel) {
            e.preventDefault();
          }
        }}
        onDrop={async (e) => {
          e.preventDefault();
          const draggedId = e.dataTransfer.getData('text/plain');
          if (!draggedId || !emp || draggedId === emp.id) return;
          
          const draggedEmp = employees.find(x => x.id === draggedId);
          if (!draggedEmp) return;
          
          if (
            normalize(draggedEmp.sector) !== normalize(sector) ||
            normalize(draggedEmp.machine) !== normalize(machine) ||
            normalize(draggedEmp.shift) !== normalize(shift)
          ) {
            return;
          }
          
          const cardEmps = employees.filter(x => 
            normalize(x.sector) === normalize(sector) && 
            normalize(x.machine) === normalize(machine) && 
            normalize(x.shift) === normalize(shift) &&
            ['ativo', 'atestado', 'em contratacao'].includes(normalize(x.status))
          ).sort((a, b) => {
            if (a.orderIndex !== undefined && b.orderIndex !== undefined) {
              return a.orderIndex - b.orderIndex;
            }
            if (a.orderIndex !== undefined) return -1;
            if (b.orderIndex !== undefined) return 1;
            const getRank = (r: string) => (r || '').toLowerCase().includes('operador') ? 0 : 1;
            return getRank(a.role) - getRank(b.role);
          });
          
          const fromIndex = cardEmps.findIndex(x => x.id === draggedId);
          const toIndex = cardEmps.findIndex(x => x.id === emp.id);
          if (fromIndex === -1 || toIndex === -1) return;
          
          const reordered = [...cardEmps];
          const [removed] = reordered.splice(fromIndex, 1);
          reordered.splice(toIndex, 0, removed);
          
          const batchPromises = reordered.map((x, idx) => {
            const docRef = doc(db, 'employees', x.id);
            return setDoc(docRef, { ...x, orderIndex: idx }, { merge: true });
          });
          
          try {
            await Promise.all(batchPromises);
          } catch (err) {
            console.error('Erro ao salvar nova ordena√ß√£o:', err);
          }
        }}
        className={`flex items-center justify-between p-2.5 rounded-xl transition-all border cursor-pointer select-none active:opacity-60 ${isVacant ? (isHiring ? 'bg-orange-50/40 border-orange-200' : 'bg-red-50/10 border-dashed border-red-100') : 'bg-white border-slate-100 hover:border-blue-400 shadow-sm'}`}
      >
        <div className="flex flex-col gap-0.5">
          <span className={`text-[13px] font-bold truncate max-w-[150px] slot-name flex items-center gap-1.5 ${isVacant ? (isHiring ? 'text-orange-600' : 'text-slate-400 italic') : 'text-slate-800'}`}>
            {isHiring ? `Em Contrata√ß√£o` : !emp ? `(Vaga)` : formatDisplayName(emp.name)}
            {!isVacant && isBrigadista && (
              <span className="text-red-500 animate-pulse shrink-0" title="Membro da Brigada de Inc√™ndio" style={{ animationDuration: '2s' }}>üî•</span>
            )}
          </span>
          {!isVacant && vacationing && (
            <span className="text-[10px] font-bold text-orange-600 leading-tight">
              substituindo {formatDisplayName(vacationing.name)} f√©rias retorna em {formatDateBR(vacationing.returnDate)}
            </span>
          )}
          {isVacant && vacationing && (
            <span className="text-[10px] font-semibold text-amber-600/90 leading-tight">
              f√©rias: {formatDisplayName(vacationing.name)} f√©rias retorna em {formatDateBR(vacationing.returnDate)}
            </span>
          )}
          {isVacant && !vacationing && <span className="text-[9px] font-black text-slate-400/50 uppercase tracking-tighter slot-role">{label || role}</span>}
        </div>
        {!isVacant ? (
          <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-tighter shrink-0 slot-tag ${emp.role.toLowerCase().includes('operador') ? 'bg-blue-100 text-blue-600' : 'bg-orange-100 text-orange-600'}`}>
            {emp.role.includes('Operador') ? 'OPE' : emp.role.includes('Auxiliar') ? 'AUX' : emp.role.substring(0,3).toUpperCase()}
          </span>
        ) : (
          <div className="flex items-center gap-1.5">
            {isHiring ? <UserPlus size={12} className="text-orange-400" /> : <div className="w-1.5 h-1.5 rounded-full bg-slate-200" />}
            {canManagePersonnel && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteVacancySlot(sector, machine, shift, role, emp);
                }}
                className="p-1 hover:bg-red-100 hover:text-red-600 rounded-md transition-colors text-slate-400"
                title="Excluir Vaga"
              >
                <Trash2 size={13} />
              </button>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderMachineGroup = (sector: string, machine: string, shift: string, minCapacity: number) => {
    const isVisible = (s: string) => {
      const n = normalize(s);
      return ['ativo', 'atestado', 'em contratacao'].includes(n);
    };
    const machineEmps = employees.filter(e => 
      normalize(e.sector) === normalize(sector) && 
      normalize(e.machine) === normalize(machine) && 
      normalize(e.shift) === normalize(shift) && 
      isVisible(e.status)
    ).sort((a, b) => {
      if (a.orderIndex !== undefined && b.orderIndex !== undefined) {
        return a.orderIndex - b.orderIndex;
      }
      if (a.orderIndex !== undefined) return -1;
      if (b.orderIndex !== undefined) return 1;
      const getRank = (r: string) => (r || '').toLowerCase().includes('operador') ? 0 : 1;
      return getRank(a.role) - getRank(b.role);
    });
    
    const excludedCount = employees.filter(e =>
      normalize(e.sector) === normalize(sector) && 
      normalize(e.machine) === normalize(machine) && 
      normalize(e.shift) === normalize(shift) && 
      normalize(e.status) === 'vaga excluida'
    ).length;

    const adjustedCapacity = Math.max(0, minCapacity - excludedCount);
    const slots = [];
    
    // Render existing employees
    machineEmps.forEach(emp => {
      slots.push(renderSlot(sector, machine, shift, emp.role, '', emp));
    });
    
    // Render remaining slots as vacancies up to adjustedCapacity
    for (let i = machineEmps.length; i < adjustedCapacity; i++) {
        const isOpSlot = i === 0 && !machineEmps.some(e => e.role.toLowerCase().includes('operador'));
        const defaultRole = isOpSlot ? 'Operador 1' : 'Auxiliar de Produ√ß√£o';
        const label = isOpSlot ? 'OPE' : 'AUX';
        slots.push(renderSlot(sector, machine, shift, defaultRole, label, undefined, `-${i}`));
    }
    
    return <div className="space-y-3">{slots}</div>;
  };

  const renderPersonnelStat = (label: string, value: number, sub: string, icon: React.ReactNode, color: string) => (
    <div className="bg-white p-4 sm:p-5 md:p-6 rounded-2xl md:rounded-[1.8rem] border border-slate-100 shadow-sm flex items-center justify-between group transition-all hover:shadow-md">
      <div>
        <p className={`text-[9px] sm:text-[10px] font-black uppercase tracking-widest mb-0.5 sm:mb-1 ${color}`}>{label}</p>
        <p className="text-2xl sm:text-3xl font-black text-slate-800">{value}</p>
        <p className="text-[8px] sm:text-[10px] font-bold text-slate-400 uppercase mt-0.5 sm:mt-1">{sub}</p>
      </div>
      <div className={`w-10 h-10 sm:w-11 sm:h-11 md:w-12 md:h-12 rounded-lg sm:rounded-2xl flex items-center justify-center transition-transform group-hover:rotate-12 ${color.replace('text', 'bg').replace('-400', '-50')}`}>
        {icon}
      </div>
    </div>
  );

  const renderTwoColumnLegend = (props: any, chartType?: string) => {
    const { payload } = props;
    return (
      <ul className="grid grid-cols-2 gap-x-3 gap-y-1.5 mt-6 px-2">
        {payload.map((entry: any, i: number) => (
          <li key={i} className="flex items-center gap-2 text-[9px] font-black text-slate-700 uppercase">
            <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />
            <span className="truncate">
              {entry.value} ‚Äî {chartType === 'time' ? formatMinutes(entry.payload.value) : formatWeight(entry.payload.value)}
            </span>
          </li>
        ))}
      </ul>
    );
  };

  const handleRestoreData = async () => {
    if (!window.confirm('Isso ir√° restaurar todos os dados iniciais do sistema. Continuar?')) return;
    setIsInitializing(true);
    try {
      await seedInitialData({
        productionEntries: INITIAL_DATA,
        employees: INITIAL_EMPLOYEES,
        logs: INITIAL_LOGS,
        operators: DEFAULT_OPERATORS,
        roles: availableRoles,
        goals: { [dashboardMonth]: GOAL_VALUE }
      });
      alert('Dados restaurados com sucesso!');
      window.location.reload();
    } catch (e) {
      alert('Erro ao restaurar dados.');
      console.error(e);
    } finally {
      setIsInitializing(false);
    }
  };

  if (showInstallExperience) {
    return (
      <InstallExperience onComplete={async () => {
        setShowInstallExperience(false);
        localStorage.setItem('manupackaging_experience_shown', 'true');
        
        // Se o usu√°rio n√£o estiver logado, garante que a aba ativa seja a de dashboard/login
        if (!loggedUser) {
          setActiveTab('extrusion');
          setExtrusionSubTab('reports');
        }

        if (deferredPrompt) {
          try {
            // Dispara o prompt real do navegador imediatamente ap√≥s a nossa anima√ß√£o
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            if (outcome === 'accepted') {
              setIsInstallable(false);
              setDeferredPrompt(null);
            }
          } catch (e) {
            console.log("PWA prompt skipped or failed after experience", e);
          }
        }
      }} />
    );
  }

  if (isInitializing && !loggedUser) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-6 shadow-2xl"></div>
        <h2 className="text-white font-black text-xs uppercase tracking-widest animate-pulse">Iniciando Sistema...</h2>
        <p className="text-slate-500 text-[10px] uppercase font-bold mt-4 tracking-tighter">Estamos preparando seu ambiente de trabalho</p>
      </div>
    );
  }

  if (!loggedUser) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 bg-[url('https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&q=80')] bg-cover bg-center">
        <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-sm"></div>
        <div className="w-full max-w-md bg-white rounded-[3rem] px-10 pt-10 pb-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-500">
           <div className="flex flex-col items-center mb-10">
              <div className="w-24 h-24 bg-blue-600 rounded-[2.5rem] flex items-center justify-center text-white shadow-2xl mb-6 relative overflow-hidden">
                <div className="absolute inset-0 bg-blue-400 rounded-[2.5rem] animate-pulse blur-xl opacity-30"></div>
                {systemLogo ? (
                  <img src={systemLogo} alt="Logo" className="w-full h-full object-cover relative z-10" />
                ) : (
                  <img src="https://static.wixstatic.com/media/765089_472b535780514937a09c07be49495392~mv2.png" alt="Default Logo" className="w-full h-full object-contain p-2 relative z-10" />
                )}
              </div>
              <h2 className="text-3xl font-black text-slate-800 uppercase tracking-tighter text-center leading-[0.9]">
                {loginSystemName}
              </h2>
              {loginSystemSubtitle && (
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest text-center mt-3 max-w-[280px] leading-relaxed">
                  {loginSystemSubtitle}
                </p>
              )}
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-4 flex items-center gap-2">
                <ShieldCheck size={14} className="text-emerald-500"/> √Årea Restrita
              </p>
           </div>

           <div className="space-y-6">
                <div className="relative group">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">N√∫mero de Matr√≠cula</label>
                  <div className="relative">
                    <input 
                      type="text" 
                      value={loginMatricula} 
                      onChange={e => handleMatriculaChange(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 font-bold text-sm outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all pr-12"
                      placeholder="Sua matr√≠cula"
                    />
                    {discoveredUser && (
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                      </div>
                    )}
                  </div>
                  
                  {discoveredUser && (
                    <p className="mt-2 text-[10px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-1.5 animate-in fade-in slide-in-from-top-1">
                      <ShieldCheck size={12} /> {discoveredUser.name.split(' ')[0]} Identificado
                    </p>
                  )}
                  
                  {!discoveredUser && loginMatricula.length < 3 && (
                    <div className="mt-4 space-y-3 animate-in fade-in duration-500">
                      <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
                          <Info size={16} />
                        </div>
                        <div className="space-y-1">
                          <p className="text-[10px] font-black text-slate-800 uppercase leading-none">Primeiro Acesso?</p>
                          <p className="text-[9px] font-bold text-slate-400 uppercase leading-tight tracking-tighter">Insira sua matr√≠cula para cadastrar sua senha de 4 d√≠gitos.</p>
                        </div>
                      </div>
                      
                      <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
                          <Fingerprint size={16} />
                        </div>
                        <div className="space-y-1">
                          <p className="text-[10px] font-black text-slate-800 uppercase leading-none">Acesso R√°pido</p>
                          <p className="text-[9px] font-bold text-slate-400 uppercase leading-tight tracking-tighter">Ap√≥s o primeiro login, voc√™ poder√° usar sua digital ou rosto para entrar.</p>
                        </div>
                      </div>

                      <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600 shrink-0">
                          <Smartphone size={16} />
                        </div>
                        <div className="space-y-1">
                          <p className="text-[10px] font-black text-slate-800 uppercase leading-none">Seguran√ßa</p>
                          <p className="text-[9px] font-bold text-slate-400 uppercase leading-tight tracking-tighter">Seus dados est√£o protegidos por criptografia de ponta a ponta.</p>
                        </div>
                      </div>

                    </div>
                  )}

                  {((isInstallable && !isStandalone) || (isIOS && !isStandalone)) && (
                    <div className="mt-4 space-y-3 animate-in fade-in duration-700">
                      {isInstallable && !isStandalone && (
                        <button 
                          onClick={handleInstallClick}
                          className="w-full py-4 bg-emerald-600 text-white rounded-2xl flex items-center justify-center gap-3 active:scale-95 transition-all shadow-lg shadow-emerald-100 border-2 border-white/20"
                        >
                          <Download size={20} className="animate-bounce" />
                          <div className="text-left font-sans text-white">
                            <p className="text-[12px] font-black uppercase leading-none">Baixar Aplicativo</p>
                            <p className="text-[9px] font-bold opacity-80 uppercase tracking-tighter">Instala√ß√£o Avan√ßada PWA</p>
                          </div>
                        </button>
                      )}

                      {isIOS && !isStandalone && (
                        <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100">
                           <div className="flex gap-3 items-start text-left">
                             <div className="w-8 h-8 bg-blue-600 text-white rounded-lg flex items-center justify-center shrink-0 shadow-md">
                               <Share size={16} />
                             </div>
                             <div className="flex-1">
                               <p className="text-[10px] font-black text-slate-800 uppercase leading-none mb-1">Instalar no iPhone (iOS)</p>
                               <p className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter leading-tight">Clique no bot√£o <span className="text-blue-600 font-black">"Compartilhar"</span> e selecione <span className="text-blue-600 font-black">"Adicionar √† Tela de In√≠cio"</span>.</p>
                             </div>
                           </div>
                        </div>
                      )}

                      {!isInstallable && !isIOS && !isStandalone && (
                         <div className="p-4 bg-amber-50/50 rounded-2xl border border-amber-100">
                           <div className="flex gap-3 items-start text-left">
                             <div className="w-8 h-8 bg-amber-500 text-white rounded-lg flex items-center justify-center shrink-0 shadow-md">
                               <Smartphone size={16} />
                             </div>
                             <div className="flex-1">
                               <p className="text-[10px] font-black text-amber-800 uppercase leading-none mb-1">Instalar no Android/PC</p>
                               <p className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter leading-tight italic">No menu do navegador, selecione "Instalar Aplicativo" ou "Adicionar √† Tela Inicial".</p>
                             </div>
                           </div>
                         </div>
                      )}
                    </div>
                  )}
                </div>

                {!discoveredUser?.isFirstAccess ? (
                  <div className={`space-y-6 transition-all duration-500 ${discoveredUser ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none hidden'}`}>
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Senha de Acesso</label>
                      <input 
                        type="password" 
                        value={loginPass} 
                        onChange={e => setLoginPass(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 font-bold text-sm outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all"
                        placeholder="‚Ä¢‚Ä¢‚Ä¢‚Ä¢‚Ä¢‚Ä¢‚Ä¢‚Ä¢"
                      />
                    </div>
                    <button 
                      onClick={() => handleLogin(loginMatricula, loginPass)}
                      className="w-full py-5 bg-blue-600 text-white rounded-[1.8rem] font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-200 hover:bg-blue-700 active:scale-95 transition-all flex items-center justify-center gap-3 mt-4 disabled:opacity-50"
                      disabled={isInitializing || !loginPass}
                    >
                      {isInitializing ? 'Carregando...' : 'Entrar no Sistema'} <ChevronRight size={18} />
                    </button>
                    {discoveredUser?.biometricId && biometricSupported && (
                      <button 
                        onClick={() => handleBiometricLogin(discoveredUser)}
                        className="w-full py-4 text-[10px] font-black text-blue-500 uppercase tracking-widest hover:text-blue-700 transition-colors flex items-center justify-center gap-2"
                      >
                        <Fingerprint size={16} /> Usar Biometria Agora
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-500">
                    <div className="bg-amber-50 p-5 rounded-[1.5rem] border border-amber-100 mb-2">
                      <p className="text-xs font-bold text-amber-700 text-center leading-relaxed">Ol√°, <span className="text-slate-900 font-black">{discoveredUser.name.split(' ')[0]}</span>!<br/>Este √© o seu primeiro acesso. Por favor, crie uma senha de seguran√ßa.</p>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Nova Senha</label>
                        <input 
                          type="password" 
                          value={loginPass} 
                          onChange={e => setLoginPass(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 font-bold text-sm outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500"
                          placeholder="Senha"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Confirmar</label>
                        <input 
                          type="password" 
                          value={confirmLoginPass} 
                          onChange={e => setConfirmLoginPass(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 font-bold text-sm outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500"
                          placeholder="Confirmar"
                        />
                      </div>
                    </div>

                    <button 
                      onClick={() => handleLogin(loginMatricula, loginPass, confirmLoginPass)}
                      className="w-full py-5 bg-emerald-600 text-white rounded-[1.8rem] font-black text-xs uppercase tracking-widest shadow-xl shadow-emerald-200 hover:bg-emerald-700 active:scale-95 transition-all flex items-center justify-center gap-3 mt-4"
                    >
                      Ativar Conta e Biometria <Target size={18} />
                    </button>
                  </div>
                )}
            </div>

            {/* Bot√£o de Acesso Modo Leitura */}
            <div className="mt-4 pt-4 border-t border-slate-100">
              <button 
                type="button"
                id="btn-login-visitante"
                onClick={handleGuestLogin}
                className="w-full py-4.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 border border-slate-200 active:scale-95 shadow-sm"
              >
                <Eye size={16} className="text-slate-500" /> Acessar Modo Leitura (Apenas Visualiza√ß√£o)
              </button>
            </div>

            <div className={`mt-2 pt-4 border-t border-slate-100 flex flex-col gap-2 items-center ${!discoveredUser && loginMatricula.length < 3 ? 'mt-1' : ''}`}>
              <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest leading-none">Criado por Adaias Melo</p>
              <p className="text-[8px] font-bold text-slate-300 uppercase tracking-tighter opacity-50">Vers√£o PWA 1.2.0 ‚Ä¢ Build Clean Slate</p>
            </div>
        </div>
 
        {/* Biometric Registration Prompt Modal */}
        {showBiometricPrompt && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white rounded-[2.5rem] p-8 max-w-sm w-full shadow-2xl border border-slate-100 text-center space-y-6">
              <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-[2rem] flex items-center justify-center mx-auto shadow-inner border border-blue-100">
                <Fingerprint size={40} />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Ativar Biometria?</h3>
                <p className="text-xs text-slate-500 font-norma leading-relaxed">
                  Deseja cadastrar sua digital ou senha do aparelho para acessos futuros mais r√°pidos neste dispositivo?
                </p>
              </div>
              <div className="flex flex-col gap-3">
                <button 
                  onClick={handleRegisterBiometrics}
                  className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all shadow-lg shadow-blue-200 cursor-pointer"
                >
                  Sim, Cadastrar Agora
                </button>
                <button 
                  onClick={() => {
                    setShowBiometricPrompt(false);
                    setBiometricUser(null);
                  }}
                  className="w-full py-4 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all cursor-pointer"
                >
                  Agora N√£o
                </button>
              </div>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter italic">Voc√™ poder√° configurar isso mais tarde no perfil.</p>
            </div>
          </div>
        )}

        {/* INTERACTIVE BIOMETRIC SCANNER MODAL (100% NATIVE WEBAUTHN) */}
        {isBiometricModalOpen && biometricModalUser && (
          <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-slate-900 border border-slate-800 text-white rounded-[2.5rem] p-8 max-w-md w-full shadow-2xl relative overflow-hidden flex flex-col items-center">
              
              {/* Close Button */}
              {biometricScanStatus !== 'scanning' && biometricScanStatus !== 'success' && (
                <button 
                  onClick={() => setIsBiometricModalOpen(false)}
                  className="absolute top-5 right-5 p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 rounded-full transition-all cursor-pointer"
                >
                  <X size={16} />
                </button>
              )}

              {/* Status Indicator & Title */}
              <div className="text-center space-y-2 mt-4 w-full">
                <p className="text-[10px] font-black tracking-widest text-blue-400 uppercase">
                  {biometricModalType === 'register' ? 'Cadastro de Biometria Real' : 'Autentica√ß√£o Biom√©trica Real'}
                </p>
                <h3 className="text-xl font-black uppercase tracking-tight text-white">
                  {biometricScanStatus === 'idle' && 'Aguardando Leitor'}
                  {biometricScanStatus === 'scanning' && 'Escaneando Digital / Rosto...'}
                  {biometricScanStatus === 'success' && 'Leitura Conclu√≠da!'}
                  {biometricScanStatus === 'error' && 'Erro no Escaneamento'}
                </h3>
                <p className="text-xs text-slate-400 max-w-xs mx-auto font-medium">
                  {biometricModalType === 'register' 
                    ? `Associando identifica√ß√£o digital ao cadastro de ${biometricModalUser.name.split(' ')[0]}`
                    : `Confirme sua identidade digital para entrar como ${biometricModalUser.name.split(' ')[0]}`
                  }
                </p>
              </div>

              {/* Iframe Warning Box */}
              {isIframe && (
                <div className="mt-5 w-full bg-amber-500/10 border border-amber-500/20 text-amber-300 rounded-2xl p-4 text-xs font-semibold leading-relaxed space-y-2 text-left">
                  <p className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-amber-400">
                    <AlertCircle size={14} /> Ambiente com Restri√ß√£o (IFrame)
                  </p>
                  <p>
                    O navegador bloqueia o uso de biometria f√≠sica (TouchID/FaceID) dentro de pain√©is de visualiza√ß√£o embutidos. Para que funcione de verdade com o leitor do seu aparelho, clique no bot√£o abaixo para abrir em uma nova aba cheia do navegador.
                  </p>
                  <a 
                    href={window.location.href} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black uppercase text-[10px] tracking-widest mt-1 cursor-pointer transition-all shadow-md shadow-blue-900/30"
                  >
                    <ExternalLink size={12} /> Abrir em Nova Aba Real
                  </a>
                </div>
              )}

              {/* Central Scanner Graphic Component */}
              <div className="my-8 relative flex items-center justify-center w-36 h-36">
                {/* Pulsing Outer Rings */}
                <div className={`absolute inset-0 rounded-full border border-blue-500/10 ${biometricScanStatus === 'scanning' ? 'animate-ping duration-1000' : ''}`} />
                <div className={`absolute inset-3 rounded-full border border-blue-500/20 ${biometricScanStatus === 'scanning' ? 'animate-pulse' : ''}`} />
                
                {/* Background Ring */}
                <div className="absolute inset-6 rounded-[2rem] bg-slate-950 border border-slate-800 flex items-center justify-center w-24 h-24 overflow-hidden">
                  
                  {/* Scanner Laser effect */}
                  {biometricScanStatus === 'scanning' && (
                    <div className="absolute left-0 right-0 h-1 bg-blue-500 shadow-lg shadow-blue-500/80 animate-pulse z-10 top-0" style={{
                      animation: 'scan-move 1.5s infinite ease-in-out'
                    }} />
                  )}

                  {/* Fingerprint / Face icon with dynamic colors */}
                  <div className={`text-slate-400 transition-all duration-300 flex items-center justify-center ${
                    biometricScanStatus === 'scanning' ? 'text-blue-400 scale-110' : 
                    biometricScanStatus === 'success' ? 'text-emerald-400 scale-110' :
                    biometricScanStatus === 'error' ? 'text-rose-400 scale-95' : 'text-slate-400 hover:text-blue-400 cursor-pointer'
                  }`}>
                    {biometricScanStatus === 'success' ? (
                      <ShieldCheck size={48} className="text-emerald-400 animate-in zoom-in duration-300" />
                    ) : biometricScanStatus === 'error' ? (
                      <AlertCircle size={48} className="text-rose-400 animate-in shake duration-300" />
                    ) : (
                      <Fingerprint size={48} />
                    )}
                  </div>
                </div>
              </div>

              {/* Status Info / Help messages */}
              <div className="text-center w-full min-h-[50px] flex items-center justify-center px-4">
                {biometricScanStatus === 'idle' && (
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider animate-pulse">Toque abaixo para acionar o sensor</p>
                )}
                {biometricScanStatus === 'scanning' && (
                  <p className="text-xs font-bold text-blue-400 uppercase tracking-widest animate-pulse">Efetue a leitura digital ou facial...</p>
                )}
                {biometricScanStatus === 'success' && (
                  <div className="flex items-center gap-2 text-emerald-400 text-xs font-black uppercase tracking-wider justify-center">
                    <ShieldCheck size={16} /> Identidade Confirmada com Sucesso
                  </div>
                )}
                {biometricScanStatus === 'error' && (
                  <div className="space-y-3">
                    <p className="text-[11px] font-bold text-rose-400 leading-relaxed max-w-xs mx-auto">
                      {biometricScanError}
                    </p>
                  </div>
                )}
              </div>

              {/* Interactive Control Buttons */}
              <div className="mt-6 w-full space-y-3">
                {(biometricScanStatus === 'idle' || biometricScanStatus === 'error') && (
                  <button
                    onClick={() => triggerBiometricProcess(biometricModalType, biometricModalUser)}
                    className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25"
                  >
                    <Activity size={14} /> Ativar Leitor do Dispositivo
                  </button>
                )}

                {biometricScanStatus === 'scanning' && (
                  <div className="py-4 text-center text-slate-500 font-bold text-[10px] uppercase tracking-widest animate-pulse">
                    Aguardando resposta do leitor...
                  </div>
                )}

                {biometricScanStatus === 'success' && (
                  <div className="py-4 text-center text-emerald-500 font-bold text-[10px] uppercase tracking-widest animate-pulse">
                    Acesso autorizado! Redirecionando...
                  </div>
                )}

                {biometricScanStatus !== 'scanning' && biometricScanStatus !== 'success' && (
                  <button
                    onClick={() => setIsBiometricModalOpen(false)}
                    className="w-full py-3 bg-transparent hover:bg-slate-800/50 text-slate-500 hover:text-slate-400 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all cursor-pointer"
                  >
                    Cancelar
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }


  if (isInitializing) return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4">
      <div className="w-20 h-20 bg-blue-600 rounded-[2.5rem] flex items-center justify-center text-white shadow-2xl mb-8 animate-pulse">
         <Activity size={40} />
      </div>
      <div className="w-16 h-1 border-2 border-blue-500/20 rounded-full overflow-hidden w-48">
        <div className="h-full bg-blue-500 animate-loading-bar"></div>
      </div>
      <p className="mt-6 text-blue-400 font-black text-[10px] uppercase tracking-widest">Carregando Ambiente</p>
    </div>
  );

  return (
    <div className={`min-h-screen bg-[#f8fafc] ${isStandalone ? 'pt-safe' : ''} pb-24`}>
      {!isOnline && (
        <div className="bg-red-600 text-white text-[10px] font-black uppercase tracking-widest py-2 px-4 flex items-center justify-center gap-2 sticky top-0 z-[100] animate-in slide-in-from-top duration-300">
          <WifiOff size={14} /> Voc√™ est√° offline. Alguns dados podem estar desatualizados.
        </div>
      )}
      {updateDismissed && (
        <div 
          onClick={() => {
            setIsUpdateAvailable(true);
            setUpdateDismissed(false);
          }}
          className="bg-emerald-600 hover:bg-emerald-700 cursor-pointer text-white text-[10px] font-black uppercase tracking-widest py-2.5 px-4 flex items-center justify-center gap-2 sticky top-[40px] z-[100] animate-in slide-in-from-top duration-300 shadow-md border-b border-emerald-500"
        >
          <Bell size={14} className="animate-bounce animate-duration-1000" /> Nova atualiza√ß√£o dispon√≠vel! Clique para ver os novos recursos e recarregar.
        </div>
      )}
      <header className="bg-white px-4 py-3 md:px-6 md:py-5 flex items-center justify-between sticky top-0 z-40 border-b border-slate-100 no-print">
        <div className="flex items-center gap-2 md:gap-4 flex-1 min-w-0">
          <div className="w-9 h-9 md:w-11 md:h-11 bg-blue-600 rounded-xl flex-shrink-0 flex items-center justify-center text-white shadow-lg overflow-hidden border border-blue-500">
            {systemLogo ? (
              <img src={systemLogo} alt="Logo" className="w-full h-full object-cover" />
            ) : (
              <img src="https://static.wixstatic.com/media/765089_472b535780514937a09c07be49495392~mv2.png" alt="Default Logo" className="w-full h-full object-contain p-1" />
            )}
          </div>
          <div className="min-w-0">
            <h1 className="text-sm md:text-xl font-black text-slate-800 uppercase tracking-tight truncate leading-tight">{systemName}</h1>
            <p className="text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest truncate">{loggedUser.name} ‚Äî {loggedUser.role}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 md:gap-3 ml-2">
          {canViewActiveUsers && (
            <button 
              onClick={() => setIsActiveUsersModalOpen(true)}
              className="p-2.5 md:p-3 px-3 md:px-4 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl md:rounded-2xl transition-all shadow-sm hover:bg-emerald-100 flex items-center gap-2 active:scale-95 cursor-pointer"
              title="Ver Usu√°rios Logados em Tempo Real"
            >
              <span className="relative flex h-2.5 w-2.5 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <span className="text-[10px] md:text-xs font-black uppercase tracking-wider hidden sm:inline whitespace-nowrap">{onlineUsers.length} On-line</span>
              <Users size={18} className="text-emerald-600 shrink-0 md:w-5 md:h-5" />
            </button>
          )}
          {canEditProduction && (
            <button onClick={() => { setEditingEntry(null); setIsModalOpen(true); }} className="bg-blue-600 text-white p-2.5 md:p-3.5 rounded-xl md:rounded-2xl shadow-xl hover:bg-blue-700 active:scale-95 transition-all"><Plus size={18} className="md:w-[22px] md:h-[22px]" /></button>
          )}
          <button 
            onClick={() => {
              setActiveTab('projection');
              if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen().catch(() => {});
              }
            }}
            className="p-2 md:p-3 px-2.5 md:px-4 bg-indigo-600 text-white border border-indigo-500 rounded-xl md:rounded-2xl transition-all shadow-md hover:bg-indigo-700 flex items-center gap-1.5 md:gap-2 active:scale-95 cursor-pointer"
            title="Projetar em TV / Tela Cheia"
          >
            <Tv size={18} className="text-indigo-200 shrink-0 md:w-5 md:h-5 animate-pulse" />
            <span className="text-[10px] md:text-xs font-black uppercase tracking-wider whitespace-nowrap">Proje√ß√£o TV</span>
          </button>
          {canManageSettings && (
            <button onClick={() => setIsSettingsModalOpen(true)} className="p-3 md:p-3.5 text-blue-600 bg-blue-50 border border-blue-100 rounded-xl md:rounded-2xl transition-all shadow-sm active:scale-95" title="Configura√ß√µes"><Settings size={20} className="md:w-[22px] md:h-[22px]" /></button>
          )}
          <button 
            onClick={toggleFullscreen} 
            className="p-3 md:p-3.5 text-slate-600 bg-slate-50 border border-slate-100 rounded-xl md:rounded-2xl transition-all shadow-sm active:scale-95 hover:bg-slate-100" 
            title={isFullscreen ? "Sair da Tela Cheia" : "Tela Cheia"}
          >
            {isFullscreen ? <Minimize2 size={20} className="md:w-[22px] md:h-[22px]" /> : <Maximize2 size={20} className="md:w-[22px] md:h-[22px]" />}
          </button>
          <button 
            onClick={() => {
              setBiometricUser(loggedUser);
              handleOpenBiometricRegisterModal(loggedUser);
            }} 
            className="p-3 md:p-3.5 text-blue-600 bg-blue-50 border border-blue-100 rounded-xl md:rounded-2xl transition-all shadow-sm active:scale-95 hover:bg-blue-100" 
            title="Cadastrar / Atualizar Biometria"
          >
            <Fingerprint size={20} className="md:w-[22px] md:h-[22px]" />
          </button>
          <button onClick={handleLogout} className="p-3 md:p-3.5 text-red-600 bg-red-50 border border-red-100 rounded-xl md:rounded-2xl transition-all shadow-sm active:scale-95" title="Sair do Sistema"><LogOut size={20} className="md:w-[22px] md:h-[22px]" /></button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 md:px-6 mt-4 md:mt-8 no-print flex flex-col md:flex-row items-center justify-center gap-4">
        <div className="flex overflow-x-auto md:overflow-visible p-1.5 bg-slate-200/50 rounded-2xl md:rounded-[1.8rem] w-full max-w-4xl shadow-sm mx-auto gap-1.5 md:gap-1 scrollbar-none [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden min-w-0">
          <button onClick={() => setActiveTab('home')} className={`flex-1 shrink-0 min-w-max flex items-center justify-center gap-1.5 px-3 py-2 md:px-6 md:py-3.5 rounded-xl md:rounded-[1.4rem] text-[10px] md:text-[11px] font-black uppercase transition-all ${activeTab === 'home' ? 'bg-white text-blue-600 shadow-md' : 'text-slate-500'}`}><HomeIcon className="w-3.5 h-3.5 md:w-[18px] md:h-[18px] shrink-0 mr-0.5"/> <span className="whitespace-nowrap">In√≠cio</span></button>
          
          <div className="flex-1 shrink-0 min-w-max relative">
            <button 
              onClick={() => {
                setActiveTab('extrusion');
                setExtrusionSubTab('dashboard');
                setDashboardSubTab('summary');
              }} 
              className={`w-full h-full flex items-center justify-center gap-1 md:gap-1.5 px-3 py-2 md:px-4 md:py-3.5 rounded-xl md:rounded-[1.4rem] text-[10px] md:text-[11px] font-black uppercase transition-all ${activeTab === 'extrusion' ? 'bg-white text-blue-600 shadow-md' : 'text-slate-500'}`}
            >
              <Factory className="w-3.5 h-3.5 md:w-[18px] md:h-[18px] shrink-0 mr-0.5"/> 
              <span className="whitespace-nowrap">Extrus√£o</span>
              <span 
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveTab('extrusion');
                  setIsExtrusionMenuOpen(!isExtrusionMenuOpen);
                }}
                className="p-0.5 hover:bg-slate-100 rounded-md cursor-pointer ml-1 inline-flex items-center justify-center transition-colors text-slate-400 hover:text-blue-600 active:scale-90"
                title="Menu Extrus√£o"
              >
                <Menu className="w-3.5 h-3.5 md:w-4.5 md:h-4.5" />
              </span>
            </button>
            
            {/* Menu Flutuante */}
            <AnimatePresence>
              {isExtrusionMenuOpen && activeTab === 'extrusion' && (
                <>
                  <div 
                    className="fixed inset-0 z-40 bg-slate-900/10 backdrop-blur-[1px] md:bg-transparent md:backdrop-blur-none" 
                    onClick={() => setIsExtrusionMenuOpen(false)} 
                  />
                  <motion.div 
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="fixed md:absolute md:top-full md:left-1/2 md:-translate-x-1/2 mt-2 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 md:translate-y-0 w-52 bg-white rounded-2xl shadow-xl border border-slate-100/90 p-2 z-50 text-left font-sans normal-case tracking-normal"
                  >
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-3 py-1.5 border-b border-slate-50 mb-1">Menu Extrus√£o</p>
                    
                    {canViewDashboard && (
                      <div className="space-y-0.5 mt-1">
                        <div className="flex items-center gap-2 px-3 py-1 text-[10px] font-black text-slate-400 uppercase tracking-wider select-none">
                          <Activity className="w-3.5 h-3.5 shrink-0" />
                          <span>Indicadores</span>
                        </div>
                        <div className="pl-3 space-y-0.5">
                          <button
                            type="button"
                            onClick={() => {
                              setExtrusionSubTab('dashboard');
                              setDashboardSubTab('summary');
                              setIsExtrusionMenuOpen(false);
                            }}
                            className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${extrusionSubTab === 'dashboard' && dashboardSubTab === 'summary' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}
                          >
                            <span>- Vis√£o Geral</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setExtrusionSubTab('dashboard');
                              setDashboardSubTab('charts');
                              setIsExtrusionMenuOpen(false);
                            }}
                            className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${extrusionSubTab === 'dashboard' && dashboardSubTab === 'charts' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}
                          >
                            <span>- Gr√°ficos</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setExtrusionSubTab('dashboard');
                              setDashboardSubTab('comparison');
                              setIsExtrusionMenuOpen(false);
                            }}
                            className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${extrusionSubTab === 'dashboard' && dashboardSubTab === 'comparison' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}
                          >
                            <span>- Comparativos BI</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {canViewReports && (
                      <button
                        type="button"
                        onClick={() => {
                          setExtrusionSubTab('reports');
                          setIsExtrusionMenuOpen(false);
                        }}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-all mt-1 ${extrusionSubTab === 'reports' ? 'bg-blue-50 text-blue-600' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'}`}
                      >
                        <FileDown className="w-4 h-4 shrink-0 text-slate-400" />
                        <span>Relat√≥rios</span>
                      </button>
                    )}

                    <div className="border-t border-slate-100/50 my-1.5" />

                    <button
                      type="button"
                      onClick={() => {
                        setExtrusionSubTab('stock');
                        setIsExtrusionMenuOpen(false);
                      }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${extrusionSubTab === 'stock' ? 'bg-blue-50 text-blue-600' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'}`}
                    >
                      <FileSpreadsheet className="w-4 h-4 shrink-0 text-slate-400" />
                      <span>Estoque</span>
                    </button>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
          
          <div className="flex-1 shrink-0 min-w-max relative">
            <button 
              id="tab-corte"
              onClick={() => {
                setActiveTab('ribbon');
                setRibbonSubTab('dashboard');
                setRibbonDashboardSubTab('summary');
              }} 
              className={`w-full h-full flex items-center justify-center gap-1 md:gap-1.5 px-3 py-2 md:px-6 md:py-3.5 rounded-xl md:rounded-[1.4rem] text-[10px] md:text-[11px] font-black uppercase transition-all ${activeTab === 'ribbon' ? 'bg-white text-blue-600 shadow-md' : 'text-slate-500'}`}
            >
              <BarChart3 className="w-3.5 h-3.5 md:w-[18px] md:h-[18px] shrink-0 mr-0.5"/> 
              <span className="whitespace-nowrap">Corte de Fita</span>
              <span 
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveTab('ribbon');
                  setIsRibbonMenuOpen(!isRibbonMenuOpen);
                }}
                className="p-0.5 hover:bg-slate-100 rounded-md cursor-pointer ml-1 inline-flex items-center justify-center transition-colors text-slate-400 hover:text-blue-600 active:scale-90"
                title="Menu Corte de Fita"
              >
                <Menu className="w-3.5 h-3.5 md:w-4.5 md:h-4.5" />
              </span>
            </button>
            
            {/* Menu Flutuante Corte de Fita */}
            <AnimatePresence>
              {isRibbonMenuOpen && activeTab === 'ribbon' && (
                <>
                  <div 
                    className="fixed inset-0 z-40 bg-slate-900/10 backdrop-blur-[1px] md:bg-transparent md:backdrop-blur-none" 
                    onClick={() => setIsRibbonMenuOpen(false)} 
                  />
                  <motion.div 
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="fixed md:absolute md:top-full md:left-1/2 md:-translate-x-1/2 mt-2 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 md:translate-y-0 w-52 bg-white rounded-2xl shadow-xl border border-slate-100/90 p-2 z-50 text-left font-sans normal-case tracking-normal"
                  >
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-3 py-1.5 border-b border-slate-50 mb-1">Menu Corte de Fita</p>
                    
                    {canViewDashboard && (
                      <div className="space-y-0.5 mt-1">
                        <div className="flex items-center gap-2 px-3 py-1 text-[10px] font-black text-slate-400 uppercase tracking-wider select-none">
                           <Activity className="w-3.5 h-3.5 shrink-0" />
                           <span>Indicadores</span>
                        </div>
                        <div className="pl-3 space-y-0.5">
                          <button
                            type="button"
                            onClick={() => {
                              setRibbonSubTab('dashboard');
                              setRibbonDashboardSubTab('summary');
                              setIsRibbonMenuOpen(false);
                            }}
                            className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${ribbonSubTab === 'dashboard' && ribbonDashboardSubTab === 'summary' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}
                          >
                            <span>- Vis√£o Geral</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setRibbonSubTab('dashboard');
                              setRibbonDashboardSubTab('charts');
                              setIsRibbonMenuOpen(false);
                            }}
                            className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${ribbonSubTab === 'dashboard' && ribbonDashboardSubTab === 'charts' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}
                          >
                            <span>- Gr√°ficos</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setRibbonSubTab('dashboard');
                              setRibbonDashboardSubTab('comparison');
                              setIsRibbonMenuOpen(false);
                            }}
                            className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${ribbonSubTab === 'dashboard' && ribbonDashboardSubTab === 'comparison' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}
                          >
                            <span>- Comparativos BI</span>
                          </button>
                        </div>
                      </div>
                    )}
 
                    {canViewReports && (
                      <button
                        type="button"
                        onClick={() => {
                          setRibbonSubTab('reports');
                          setIsRibbonMenuOpen(false);
                        }}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-all mt-1 ${ribbonSubTab === 'reports' ? 'bg-blue-50 text-blue-600' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'}`}
                      >
                        <FileDown className="w-4 h-4 shrink-0 text-slate-400" />
                        <span>Relat√≥rio Lan√ßamentos</span>
                      </button>
                    )}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
          
          {canViewPersonnel && (
            <>
              <button onClick={() => { setActiveTab('personnel'); setPersonnelSubView('board'); }} className={`flex-1 shrink-0 min-w-max flex items-center justify-center gap-1 px-3 py-2 md:px-6 md:py-3.5 rounded-xl md:rounded-[1.4rem] text-[10px] md:text-[11px] font-black uppercase transition-all ${activeTab === 'personnel' ? 'bg-white text-blue-600 shadow-md' : 'text-slate-500'}`}><Users className="w-3.5 h-3.5 md:w-[18px] md:h-[18px] shrink-0 mr-0.5"/> <span className="whitespace-nowrap">Pessoal</span></button>
              <button onClick={() => setActiveTab('evaluations')} className={`flex-1 shrink-0 min-w-max flex items-center justify-center gap-1 px-3 py-2 md:px-6 md:py-3.5 rounded-xl md:rounded-[1.4rem] text-[10px] md:text-[11px] font-black uppercase transition-all ${activeTab === 'evaluations' ? 'bg-white text-blue-600 shadow-md' : 'text-slate-500'}`}><Award className="w-3.5 h-3.5 md:w-[18px] md:h-[18px] shrink-0 mr-0.5"/> <span className="whitespace-nowrap">Avalia√ß√µes</span></button>
            </>
          )}
 
          <button onClick={() => setActiveTab('maintenance')} className={`flex-1 shrink-0 min-w-max flex items-center justify-center gap-1 px-3 py-2 md:px-6 md:py-3.5 rounded-xl md:rounded-[1.4rem] text-[10px] md:text-[11px] font-black uppercase transition-all ${activeTab === 'maintenance' ? 'bg-white text-blue-600 shadow-md' : 'text-slate-500'}`}><Wrench className="w-3.5 h-3.5 md:w-[18px] md:h-[18px] shrink-0 mr-0.5"/> <span className="whitespace-nowrap">Manuten√ß√£o</span></button>
          <button onClick={() => setActiveTab('projection')} className={`flex-1 shrink-0 min-w-max flex items-center justify-center gap-1 px-3 py-2 md:px-6 md:py-3.5 rounded-xl md:rounded-[1.4rem] text-[10px] md:text-[11px] font-black uppercase transition-all ${activeTab === 'projection' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-800'}`}><Tv className="w-3.5 h-3.5 md:w-[18px] md:h-[18px] shrink-0 mr-0.5 text-indigo-400 animate-pulse"/> <span className="whitespace-nowrap">Proje√ß√£o</span></button>
        </div>
      </div>

      <main className="max-w-7xl mx-auto p-6 space-y-8">
        {activeTab === 'home' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
             {systemCoverImage && (
                <div className="w-full h-48 md:h-64 rounded-[3rem] overflow-hidden border border-slate-100 shadow-xl animate-in zoom-in-95 duration-500">
                   <img src={systemCoverImage} alt="Imagem de Capa" className="w-full h-full object-cover" />
                </div>
             )}



             <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                <button 
                  onClick={() => setIsCollaboratorModalOpen(true)}
                  className="bg-blue-600 p-6 rounded-[2.5rem] text-white flex flex-col items-center gap-4 shadow-xl shadow-blue-100 active:scale-95 transition-all group"
                >
                   <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform"><UserPlus size={32} /></div>
                   <span className="text-[10px] font-black uppercase tracking-widest text-center">Cadastrar Colaborador</span>
                </button>

                <button 
                  onClick={() => exportPersonnelToPDF()}
                  className="bg-white p-6 rounded-[2.5rem] border border-slate-100 text-slate-800 flex flex-col items-center gap-4 shadow-sm active:scale-95 transition-all group"
                >
                   <div className="w-14 h-14 bg-emerald-50 text-emerald-500 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform"><FileText size={32} /></div>
                   <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 text-center">Baixar PDF Pessoal</span>
                </button>

                <button 
                  onClick={() => setIsHistoryModalOpen(true)}
                  className="bg-white p-6 rounded-[2.5rem] border border-slate-100 text-slate-800 flex flex-col items-center gap-4 shadow-sm active:scale-95 transition-all group"
                >
                   <div className="w-14 h-14 bg-blue-50 text-blue-500 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform"><History size={32} /></div>
                   <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 text-center">Hist√≥rico Pessoal</span>
                </button>

                <button 
                  onClick={() => setIsDatabaseModalOpen(true)}
                  className="bg-white p-6 rounded-[2.5rem] border border-slate-100 text-slate-800 flex flex-col items-center gap-4 shadow-sm active:scale-95 transition-all group"
                >
                   <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform"><Database size={32} /></div>
                   <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 text-center">Banco de Dados</span>
                </button>

                <button 
                  onClick={() => setIsTrainingModalOpen(true)}
                  className="bg-white p-6 rounded-[2.5rem] border border-slate-100 text-slate-800 flex flex-col items-center gap-4 shadow-sm active:scale-95 transition-all group"
                >
                   <div className="w-14 h-14 bg-slate-50 text-blue-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform"><FileText size={32} /></div>
                   <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 text-center">Treinamento / DDP</span>
                </button>

                <button 
                  onClick={() => setIsWeeklySummaryOpen(true)}
                  className="bg-gradient-to-br from-blue-600 to-indigo-700 p-6 rounded-[2.5rem] text-white flex flex-col items-center gap-4 shadow-xl shadow-blue-200/50 border border-blue-400/30 active:scale-95 transition-all group cursor-pointer"
                  title="Abrir Resumo Semanal de Produ√ß√£o para Reuni√£o de Resultados"
                >
                   <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform"><Presentation size={32} className="text-amber-300 animate-pulse" /></div>
                   <span className="text-[10px] font-black uppercase tracking-widest text-center">Resumo Semanal (Reuni√£o)</span>
                </button>

                <button 
                  onClick={() => setIsDowntimeAnalyticsModalOpen(true)}
                  className="bg-gradient-to-br from-slate-900 to-blue-950 p-6 rounded-[2.5rem] text-white flex flex-col items-center gap-4 shadow-xl shadow-slate-900/20 border border-blue-500/30 active:scale-95 transition-all group cursor-pointer"
                  title="Abrir M√≥dulo BI de An√°lise Detalhada de Paradas de M√°quina"
                >
                   <div className="w-14 h-14 bg-blue-500/20 text-blue-400 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform"><BarChart3 size={32} /></div>
                   <span className="text-[10px] font-black uppercase tracking-widest text-center">An√°lise BI de Paradas</span>
                </button>
             </div>

             <div className="bg-slate-900 p-8 rounded-[3rem] text-white overflow-hidden relative group">
                <div className="flex items-center justify-between mb-6">
                   <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center"><Smartphone size={20} /></div>
                      <h3 className="text-sm font-black uppercase tracking-tight">Experi√™ncia App</h3>
                   </div>
                   <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                </div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-loose mb-6">
                   Este sistema foi otimizado para uso como aplicativo. Para uma melhor experi√™ncia, adicione-o √† sua tela de in√≠cio.
                </p>
                {isStandalone ? (
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/10 text-emerald-500 rounded-full text-[9px] font-black uppercase">
                     <ShieldCheck size={14} /> Modo Aplicativo Ativo
                  </div>
                ) : (
                  <button 
                    onClick={handleInstallClick}
                    className="w-full py-4 bg-white text-slate-900 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-100 transition-all flex items-center justify-center gap-2"
                  >
                     <Download size={16} /> Instalar Agora
                  </button>
                )}
             </div>
          </div>
        )}

        {false && activeTab === 'extrusion' && (
          <aside className="w-full lg:w-64 shrink-0 no-print">
            <div className="bg-white rounded-3xl p-3 lg:p-5 border border-slate-100 shadow-sm flex flex-row lg:flex-col gap-2 overflow-x-auto lg:overflow-x-visible lg:sticky lg:top-6 scrollbar-none justify-start lg:justify-start">
              <p className="hidden lg:block text-[10px] font-black text-slate-400 uppercase tracking-widest px-3.5 mb-3">Menu Extrus√£o</p>
              
              {canViewReports && (
                <button
                  type="button"
                  onClick={() => setExtrusionSubTab('reports')}
                  className={`flex items-center gap-2 px-4 py-2.5 lg:py-3.5 rounded-2xl font-black text-[11px] lg:text-xs uppercase tracking-wider transition-all duration-200 shrink-0 ${extrusionSubTab === 'reports' ? 'bg-blue-600 text-white shadow-md shadow-blue-100' : 'bg-slate-50 text-slate-500 hover:text-slate-800 hover:bg-slate-100'}`}
                >
                  <FileDown className="w-4 h-4 shrink-0" />
                  <span>Relat√≥rios</span>
                </button>
              )}

              {canViewDashboard && (
                <div className="flex flex-row lg:flex-col lg:space-y-1.5 gap-2 lg:gap-0 shrink-0">
                  <button
                    type="button"
                    onClick={() => setExtrusionSubTab('dashboard')}
                    className={`flex items-center gap-2 px-4 py-2.5 lg:py-3.5 rounded-2xl font-black text-[11px] lg:text-xs uppercase tracking-wider transition-all duration-200 shrink-0 ${extrusionSubTab === 'dashboard' ? 'bg-blue-600 text-white shadow-md shadow-blue-100' : 'bg-slate-50 text-slate-500 hover:text-slate-800 hover:bg-slate-100'}`}
                  >
                    <Activity className="w-4 h-4 shrink-0" />
                    <span>Indicadores</span>
                  </button>
                  
                  {/* Sub-abas de Indicadores (terceiro n√≠vel) - Aninhadas no Desktop */}
                  {extrusionSubTab === 'dashboard' && (
                    <div className="hidden lg:flex flex-col pl-6 pr-2 py-1.5 space-y-1.5 border-l-2 border-slate-100 ml-6 mt-1.5">
                      <button
                        type="button"
                        onClick={() => setDashboardSubTab('summary')}
                        className={`w-full text-left px-3.5 py-2 rounded-xl font-black text-[10px] uppercase tracking-wider transition-all duration-150 ${dashboardSubTab === 'summary' ? 'text-blue-600 bg-blue-50/50' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}
                      >
                        Vis√£o Geral
                      </button>
                      <button
                        type="button"
                        onClick={() => setDashboardSubTab('charts')}
                        className={`w-full text-left px-3.5 py-2 rounded-xl font-black text-[10px] uppercase tracking-wider transition-all duration-150 ${dashboardSubTab === 'charts' ? 'text-blue-600 bg-blue-50/50' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}
                      >
                        Gr√°ficos
                      </button>
                      <button
                        type="button"
                        onClick={() => setDashboardSubTab('comparison')}
                        className={`w-full text-left px-3.5 py-2 rounded-xl font-black text-[10px] uppercase tracking-wider transition-all duration-150 ${dashboardSubTab === 'comparison' ? 'text-blue-600 bg-blue-50/50' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}
                      >
                        Comparativos BI
                      </button>
                    </div>
                  )}
                </div>
              )}

              <button
                type="button"
                onClick={() => setExtrusionSubTab('stock')}
                className={`flex items-center gap-2 px-4 py-2.5 lg:py-3.5 rounded-2xl font-black text-[11px] lg:text-xs uppercase tracking-wider transition-all duration-200 shrink-0 ${extrusionSubTab === 'stock' ? 'bg-blue-600 text-white shadow-md shadow-blue-100' : 'bg-slate-50 text-slate-500 hover:text-slate-800 hover:bg-slate-100'}`}
              >
                <FileSpreadsheet className="w-4 h-4 shrink-0" />
                <span>Estoque</span>
              </button>

              {/* Sub-abas de Indicadores (terceiro n√≠vel) - No Mobile (horizontal) */}
              {extrusionSubTab === 'dashboard' && (
                <div className="lg:hidden flex gap-1 py-1 px-1 bg-slate-50/50 rounded-2xl shrink-0 border border-slate-100 items-center">
                  <button
                    type="button"
                    onClick={() => setDashboardSubTab('summary')}
                    className={`px-3 py-2 rounded-xl font-black text-[9px] uppercase tracking-wider transition-all duration-155 ${dashboardSubTab === 'summary' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                  >
                    V. Geral
                  </button>
                  <button
                    type="button"
                    onClick={() => setDashboardSubTab('charts')}
                    className={`px-3 py-2 rounded-xl font-black text-[9px] uppercase tracking-wider transition-all duration-155 ${dashboardSubTab === 'charts' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                  >
                    Gr√°ficos
                  </button>
                  <button
                    type="button"
                    onClick={() => setDashboardSubTab('comparison')}
                    className={`px-3 py-2 rounded-xl font-black text-[9px] uppercase tracking-wider transition-all duration-155 ${dashboardSubTab === 'comparison' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                  >
                    Comp. BI
                  </button>
                </div>
              )}
            </div>
          </aside>
        )}

        {activeTab === 'extrusion' && extrusionSubTab === 'dashboard' && (
          <div className="space-y-6 animate-in fade-in duration-300">

            {dashboardSubTab === 'summary' && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div className="bg-[#2563eb] text-white p-8 rounded-[2.5rem] shadow-xl relative overflow-hidden flex flex-col">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="text-[10px] font-bold opacity-80 uppercase tracking-widest flex items-center gap-1">
                    DESEMPENHO
                    <span className="group relative inline-block cursor-help align-middle">
                      <span className="w-3.5 h-3.5 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white"><Info size={9} /></span>
                      <span className="pointer-events-none absolute top-full left-1/2 -translate-x-1/2 mt-1.5 w-48 bg-slate-900 border border-slate-700 text-white text-[9px] font-semibold py-1.5 px-2 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-[100] text-center normal-case tracking-normal">
                        Mede a efic√°cia e o percentual de atingimento da meta de produ√ß√£o f√≠sica planejada para as extrusoras.
                      </span>
                    </span>
                  </p>
                  <h2 className="text-2xl font-black uppercase tracking-tight">
                    {filterStartDate && filterEndDate 
                      ? `RESULTADO DE ${filterStartDate.split('-').reverse().join('/')} A ${filterEndDate.split('-').reverse().join('/')}` 
                      : filterDay 
                        ? `RESULTADO EM ${filterDay.split('-').reverse().join('/')}` 
                        : 'META MENSAL'}
                  </h2>
                </div>
                <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center border border-white/20"><Activity size={24} /></div>
              </div>
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-4xl md:text-5xl font-black">{formatWeight(dashboardStats.month)}</span>
                {!(filterDay || (filterStartDate && filterEndDate)) && <span className="text-lg font-bold opacity-80">/ {((dashboardStats.month/dashboardStats.goal)*100).toFixed(1)}%</span>}
              </div>
              
              <div className="mb-8"></div>

              <div className="space-y-4 mb-8">
                {/* Linha do Tempo M√™s Atual */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[8px] font-black uppercase tracking-widest opacity-60">
                    <span>{(filterDay || (filterStartDate && filterEndDate)) ? 'Filtrado' : 'M√™s Atual'} ‚Äî {formatWeight(dashboardStats.month)}</span>
                    {!(filterDay || (filterStartDate && filterEndDate)) && <span>Meta: {formatWeight(dashboardStats.goal)}</span>}
                  </div>
                  <div className="w-full bg-white/20 h-2.5 rounded-full overflow-hidden">
                    <div className="bg-white h-full rounded-full transition-all duration-1000 shadow-[0_0_10px_rgba(255,255,255,0.5)]" style={{ width: `${Math.min((dashboardStats.month/dashboardStats.goal)*100, 100)}%` }}></div>
                  </div>
                </div>

                {/* Linha do Tempo M√™s Anterior */}
                {!(filterDay || (filterStartDate && filterEndDate)) && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-[8px] font-black uppercase tracking-widest opacity-60">
                      <span>Resultado M√™s Anterior ‚Äî {formatWeight(dashboardStats.prevMonthTotal)}</span>
                      <span>{((dashboardStats.prevMonthTotal/dashboardStats.prevMonthGoal)*100).toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-emerald-400/60 h-full rounded-full transition-all duration-1000" style={{ width: `${Math.min((dashboardStats.prevMonthTotal/dashboardStats.prevMonthGoal)*100, 100)}%` }}></div>
                    </div>
                  </div>
                )}
              </div>

              {!(filterDay || (filterStartDate && filterEndDate)) && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-white/10 p-4 rounded-2xl border border-white/10 backdrop-blur-sm"><p className="text-[9px] font-black opacity-60 uppercase mb-1">OBJETIVO</p><p className="text-base font-bold">{formatWeight(dashboardStats.goal)}</p></div>
                  <div className="bg-white/10 p-4 rounded-2xl border border-white/10 backdrop-blur-sm"><p className="text-[9px] font-black opacity-60 uppercase mb-1">FALTA</p><p className="text-base font-bold">{formatWeight(Math.max(0, dashboardStats.goal - dashboardStats.month))}</p></div>
                  <div className="bg-white/10 p-4 rounded-2xl border border-white/10 backdrop-blur-sm"><p className="text-[9px] font-black opacity-60 uppercase mb-1">M√âDIA NEC.</p><p className="text-base font-bold">{formatWeight(dashboardStats.avgReq)}/dia</p></div>
                  <div className="bg-white/10 p-4 rounded-2xl border border-white/10 backdrop-blur-sm"><p className="text-[9px] font-black opacity-60 uppercase mb-1">PROJE√á√ÉO</p><p className="text-base font-bold">{formatWeight(dashboardStats.projection)}</p></div>
                </div>
              )}

              <div className="mt-6 pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-left">
                  <p className="text-xs font-bold text-white uppercase tracking-wide">Relat√≥rio de Produ√ß√£o e Indicadores (PDF)</p>
                  <p className="text-[9px] font-bold text-blue-100 uppercase tracking-widest mt-1 opacity-70">Documento oficial formatado com todos os detalhes de metas, m√°quinas, operadores e balan√ßos.</p>
                </div>
                <button
                  onClick={exportMonthlyReportToPDF}
                  className="w-full sm:w-auto bg-white text-blue-600 hover:bg-blue-50 text-[10px] font-black uppercase tracking-widest px-6 py-3.5 rounded-2xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 border border-white shrink-0"
                >
                  <FileText size={14} />
                  Baixar Relat√≥rio (PDF)
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-5 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] border border-slate-100 shadow-sm flex justify-between items-center group transition-all hover:shadow-md">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                      DI√ÅRIO
                      <span className="group relative inline-block cursor-help align-middle">
                        <Info size={10} className="text-slate-400 hover:text-slate-600 inline focus:outline-none" />
                        <span className="pointer-events-none absolute top-full left-1/2 -translate-x-1/2 mt-1.5 w-48 bg-slate-900 border border-slate-700 text-white text-[9px] font-semibold py-1.5 px-2 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-[100] text-center normal-case tracking-normal">
                          Total l√≠quido extrudado e pesado durante o dia operacional anterior completo (das 06h √†s 06h).
                        </span>
                      </span>
                    </p>
                    <h3 className="text-lg sm:text-xl font-black text-slate-800 uppercase tracking-tight">PRODU√á√ÉO ONTEM</h3>
                    <p className="text-3xl sm:text-5xl font-black text-slate-800 mt-3">{formatWeight(dashboardStats.yesterday)}</p>
                  </div>
                  <div className="w-12 h-12 sm:w-16 sm:h-16 bg-slate-50 text-slate-300 rounded-2xl sm:rounded-[1.8rem] flex items-center justify-center border border-slate-100"><TrendingUp size={24} className="sm:w-8 sm:h-8"/></div>
                </div>

                <div 
                  onClick={() => setShowEremaChart(true)} 
                  className="bg-white p-5 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] border border-slate-100 shadow-sm flex justify-between items-center group transition-all hover:shadow-md cursor-pointer active:scale-[0.98]"
                >
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest flex items-center gap-1">
                      RECICLAGEM
                      <span className="group relative inline-block cursor-help align-middle">
                        <Info size={10} className="text-emerald-400 inline focus:outline-none" />
                        <span className="pointer-events-none absolute top-full left-1/2 -translate-x-1/2 mt-1.5 w-48 bg-slate-900 border border-slate-700 text-white text-[9px] font-semibold py-1.5 px-2 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-[100] text-center normal-case tracking-normal">
                          Indica a produ√ß√£o secund√°ria na Recicladora EREMA que reaproveita borras e sobras do setor.
                        </span>
                      </span>
                    </p>
                    <h3 className="text-lg sm:text-xl font-black text-slate-800 uppercase tracking-tight">PRODU√á√ÉO EREMA ({(filterDay || (filterStartDate && filterEndDate)) ? 'FILTRADO' : 'M√äS'})</h3>
                    <p className="text-3xl sm:text-5xl font-black text-slate-800 mt-3">{formatWeight(dashboardStats.eremaMonth)}</p>
                  </div>
                  <div className="w-12 h-12 sm:w-16 sm:h-16 bg-emerald-50 text-emerald-300 rounded-2xl sm:rounded-[1.8rem] flex items-center justify-center border border-emerald-100"><RotateCcw size={24} className="sm:w-8 sm:h-8"/></div>
                </div>
            </div>

            {/* CARD DE COMPARTILHAMENTO DI√ÅRIO OUTLOOK */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-6 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] shadow-xl relative overflow-hidden flex flex-col gap-6">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
              
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-5">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-500/20 text-blue-400 rounded-2xl flex items-center justify-center border border-blue-500/30">
                    <Mail size={22} />
                  </div>
                  <div>
                    <span className="text-[9px] font-black tracking-widest text-blue-400 uppercase">COMPARTILHAMENTO DI√ÅRIO</span>
                    <h3 className="text-lg sm:text-xl font-black uppercase tracking-tight">Relat√≥rio de Produ√ß√£o (Outlook / WhatsApp)</h3>
                  </div>
                </div>
                
                {/* Seletor de Data */}
                <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2 self-start md:self-auto">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Data do Relat√≥rio:</span>
                  <input 
                    type="date" 
                    value={shareDate} 
                    onChange={(e) => setShareDate(e.target.value)} 
                    className="bg-transparent border-none text-white text-xs font-black focus:outline-none focus:ring-0 cursor-pointer [color-scheme:dark]"
                  />
                </div>
              </div>

              {/* Grid dos dados */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* CAST 1 */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-5 relative">
                  <span className="absolute top-3 right-3 text-[10px] font-black text-blue-400 bg-blue-500/15 px-2 py-0.5 rounded-full uppercase tracking-wider">CAST 1</span>
                  <h4 className="text-sm font-black text-slate-300 uppercase tracking-widest mb-4">Extrusora Cast 1</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Dia */}
                    <div className="bg-white/5 border border-white/5 rounded-xl p-3">
                      <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-2">Cast 1 Dia</p>
                      <div className="space-y-1.5 text-xs">
                        <div className="flex justify-between">
                          <span className="text-slate-400">Prod. L√≠quida:</span>
                          <span className="font-extrabold text-white">{formatShareWeight(dailyShareMetrics.cast1Dia.net)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Eco B:</span>
                          <span className="font-extrabold text-orange-400">{formatShareWeight(dailyShareMetrics.cast1Dia.ecoB)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Eco A:</span>
                          <span className="font-extrabold text-emerald-400">{formatShareWeight(dailyShareMetrics.cast1Dia.ecoA)}</span>
                        </div>
                        <div className="text-[10px] text-amber-305 font-medium pt-1 mt-1 border-t border-white/5 truncate" title={dailyShareMetrics.cast1Dia.stopsText}>
                          Paradas: {dailyShareMetrics.cast1Dia.stopsText}
                        </div>
                      </div>
                    </div>
                    {/* Noite */}
                    <div className="bg-white/5 border border-white/5 rounded-xl p-3">
                      <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-2">Cast 1 Noite</p>
                      <div className="space-y-1.5 text-xs">
                        <div className="flex justify-between">
                          <span className="text-slate-400">Prod. L√≠quida:</span>
                          <span className="font-extrabold text-white">{formatShareWeight(dailyShareMetrics.cast1Noite.net)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Eco B:</span>
                          <span className="font-extrabold text-orange-400">{formatShareWeight(dailyShareMetrics.cast1Noite.ecoB)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Eco A:</span>
                          <span className="font-extrabold text-emerald-400">{formatShareWeight(dailyShareMetrics.cast1Noite.ecoA)}</span>
                        </div>
                        <div className="text-[10px] text-amber-305 font-medium pt-1 mt-1 border-t border-white/5 truncate" title={dailyShareMetrics.cast1Noite.stopsText}>
                          Paradas: {dailyShareMetrics.cast1Noite.stopsText}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* CAST 2 */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-5 relative">
                  <span className="absolute top-3 right-3 text-[10px] font-black text-indigo-400 bg-indigo-500/15 px-2 py-0.5 rounded-full uppercase tracking-wider">CAST 2</span>
                  <h4 className="text-sm font-black text-slate-300 uppercase tracking-widest mb-4">Extrusora Cast 2</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Dia */}
                    <div className="bg-white/5 border border-white/5 rounded-xl p-3">
                      <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-2">Cast 2 Dia</p>
                      <div className="space-y-1.5 text-xs">
                        <div className="flex justify-between">
                          <span className="text-slate-400">Prod. L√≠quida:</span>
                          <span className="font-extrabold text-white">{formatShareWeight(dailyShareMetrics.cast2Dia.net)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Eco B:</span>
                          <span className="font-extrabold text-orange-400">{formatShareWeight(dailyShareMetrics.cast2Dia.ecoB)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Eco A:</span>
                          <span className="font-extrabold text-emerald-400">{formatShareWeight(dailyShareMetrics.cast2Dia.ecoA)}</span>
                        </div>
                        <div className="text-[10px] text-amber-305 font-medium pt-1 mt-1 border-t border-white/5 truncate" title={dailyShareMetrics.cast2Dia.stopsText}>
                          Paradas: {dailyShareMetrics.cast2Dia.stopsText}
                        </div>
                      </div>
                    </div>
                    {/* Noite */}
                    <div className="bg-white/5 border border-white/5 rounded-xl p-3">
                      <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-2">Cast 2 Noite</p>
                      <div className="space-y-1.5 text-xs">
                        <div className="flex justify-between">
                          <span className="text-slate-400">Prod. L√≠quida:</span>
                          <span className="font-extrabold text-white">{formatShareWeight(dailyShareMetrics.cast2Noite.net)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Eco B:</span>
                          <span className="font-extrabold text-orange-400">{formatShareWeight(dailyShareMetrics.cast2Noite.ecoB)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Eco A:</span>
                          <span className="font-extrabold text-emerald-400">{formatShareWeight(dailyShareMetrics.cast2Noite.ecoA)}</span>
                        </div>
                        <div className="text-[10px] text-amber-305 font-medium pt-1 mt-1 border-t border-white/5 truncate" title={dailyShareMetrics.cast2Noite.stopsText}>
                          Paradas: {dailyShareMetrics.cast2Noite.stopsText}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* PRODU√á√ÉO TOTAL (CAST 1 + CAST 2) */}
                <div className="bg-gradient-to-r from-blue-900/40 to-indigo-900/40 border border-blue-500/20 rounded-2xl p-5 relative lg:col-span-2">
                  <span className="absolute top-3 right-3 text-[10px] font-black text-blue-300 bg-blue-500/20 px-2.5 py-1 rounded-full uppercase tracking-wider">TOTAL INTEGRADO</span>
                  <h4 className="text-sm font-black text-white uppercase tracking-widest mb-2">Produ√ß√£o Total</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mt-2">
                    <div className="bg-white/5 rounded-xl p-3 hover:bg-white/10 transition-colors">
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Prod. L√≠quida Total:</p>
                      <p className="text-base font-black text-white">{formatShareWeight(dailyShareMetrics.cast12Total.net)}</p>
                    </div>
                    <div className="bg-white/5 rounded-xl p-3 hover:bg-white/10 transition-colors">
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Eco B Total:</p>
                      <p className="text-base font-black text-orange-400">{formatShareWeight(dailyShareMetrics.cast12Total.ecoB)}</p>
                    </div>
                    <div className="bg-white/5 rounded-xl p-3 hover:bg-white/10 transition-colors">
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Eco A Total:</p>
                      <p className="text-base font-black text-emerald-400">{formatShareWeight(dailyShareMetrics.cast12Total.ecoA)}</p>
                    </div>
                    <div className="bg-white/5 rounded-xl p-3 hover:bg-white/10 transition-colors">
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Tempo Parado Total:</p>
                      <p className="text-base font-black text-amber-305">{dailyShareMetrics.cast12Total.stopsText}</p>
                    </div>
                  </div>
                </div>

                {/* EREMA */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-5 relative lg:col-span-2">
                  <span className="absolute top-3 right-3 text-[10px] font-black text-emerald-400 bg-emerald-500/15 px-2 py-0.5 rounded-full uppercase tracking-wider">EREMA</span>
                  <h4 className="text-sm font-black text-slate-300 uppercase tracking-widest mb-2">Erema</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-2">
                    <div className="bg-white/5 rounded-xl p-3 hover:bg-white/10 transition-colors">
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Dia:</p>
                      <p className="text-base font-black text-emerald-400">{formatShareWeight(dailyShareMetrics.eremaDia.net)}</p>
                      <p className="text-[10px] text-amber-305 mt-1 pt-1 border-t border-white/5 truncate" title={dailyShareMetrics.eremaDia.stopsText}>Paradas: {dailyShareMetrics.eremaDia.stopsText}</p>
                    </div>
                    <div className="bg-white/5 rounded-xl p-3 hover:bg-white/10 transition-colors">
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Noite:</p>
                      <p className="text-base font-black text-emerald-400">{formatShareWeight(dailyShareMetrics.eremaNoite.net)}</p>
                      <p className="text-[10px] text-amber-305 mt-1 pt-1 border-t border-white/5 truncate" title={dailyShareMetrics.eremaNoite.stopsText}>Paradas: {dailyShareMetrics.eremaNoite.stopsText}</p>
                    </div>
                    <div className="bg-white/5 rounded-xl p-3 hover:bg-white/10 transition-colors">
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Produ√ß√£o total:</p>
                      <p className="text-base font-black text-emerald-305">{formatShareWeight(dailyShareMetrics.eremaTotal.net)}</p>
                      <p className="text-[10px] text-amber-305 mt-1 pt-1 border-t border-white/5 truncate" title={dailyShareMetrics.eremaTotal.stopsText}>Parada Total: {dailyShareMetrics.eremaTotal.stopsText}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bot√µes de A√ß√£o */}
              <div className="flex flex-col sm:flex-row flex-wrap items-center gap-3 mt-2 border-t border-white/10 pt-5">
                <button
                  type="button"
                  onClick={() => {
                    const formattedDate = shareDate.split('-').reverse().join('/');
                    const subject = `Relat√≥rio de Produ√ß√£o - Cast 1, Cast 2 e Erema - ${formattedDate}`;
                    
                    const dayRecords = productionData.filter(e => e.date === shareDate);
                    const body = `Bom dia.
Segue o relat√≥rio de produ√ß√£o referente ao dia ${formattedDate}:

---------------------------------------------------
CAST 1 DIA
---------------------------------------------------
‚Ä¢ Prod. L√≠quida: ${formatShareWeight(dailyShareMetrics.cast1Dia.net)}
‚Ä¢ Eco B: ${formatShareWeight(dailyShareMetrics.cast1Dia.ecoB)}${dailyShareMetrics.cast1Dia.ecoBJustText}
‚Ä¢ Eco A: ${formatShareWeight(dailyShareMetrics.cast1Dia.ecoA)}${dailyShareMetrics.cast1Dia.ecoAJustText}
‚Ä¢ Tempo Parado: ${dailyShareMetrics.cast1Dia.stopsFormatted}

---------------------------------------------------
CAST 1 NOITE
---------------------------------------------------
‚Ä¢ Prod. L√≠quida: ${formatShareWeight(dailyShareMetrics.cast1Noite.net)}
‚Ä¢ Eco B: ${formatShareWeight(dailyShareMetrics.cast1Noite.ecoB)}${dailyShareMetrics.cast1Noite.ecoBJustText}
‚Ä¢ Eco A: ${formatShareWeight(dailyShareMetrics.cast1Noite.ecoA)}${dailyShareMetrics.cast1Noite.ecoAJustText}
‚Ä¢ Tempo Parado: ${dailyShareMetrics.cast1Noite.stopsFormatted}

---------------------------------------------------
CAST 2 DIA
---------------------------------------------------
‚Ä¢ Prod. L√≠quida: ${formatShareWeight(dailyShareMetrics.cast2Dia.net)}
‚Ä¢ Eco B: ${formatShareWeight(dailyShareMetrics.cast2Dia.ecoB)}${dailyShareMetrics.cast2Dia.ecoBJustText}
‚Ä¢ Eco A: ${formatShareWeight(dailyShareMetrics.cast2Dia.ecoA)}${dailyShareMetrics.cast2Dia.ecoAJustText}
‚Ä¢ Tempo Parado: ${dailyShareMetrics.cast2Dia.stopsFormatted}

---------------------------------------------------
CAST 2 NOITE
---------------------------------------------------
‚Ä¢ Prod. L√≠quida: ${formatShareWeight(dailyShareMetrics.cast2Noite.net)}
‚Ä¢ Eco B: ${formatShareWeight(dailyShareMetrics.cast2Noite.ecoB)}${dailyShareMetrics.cast2Noite.ecoBJustText}
‚Ä¢ Eco A: ${formatShareWeight(dailyShareMetrics.cast2Noite.ecoA)}${dailyShareMetrics.cast2Noite.ecoAJustText}
‚Ä¢ Tempo Parado: ${dailyShareMetrics.cast2Noite.stopsFormatted}

---------------------------------------------------
Produ√ß√£o Total:
---------------------------------------------------
‚Ä¢ Prod. L√≠quida: ${formatShareWeight(dailyShareMetrics.cast12Total.net)}
‚Ä¢ Eco B: ${formatShareWeight(dailyShareMetrics.cast12Total.ecoB)}
‚Ä¢ Eco A: ${formatShareWeight(dailyShareMetrics.cast12Total.ecoA)}
‚Ä¢ Tempo Parado Total (Cast 1 + 2): ${dailyShareMetrics.cast12Total.stopsFormatted}

---------------------------------------------------
EREMA - DIA
---------------------------------------------------
‚Ä¢ Prod. Reciclada: ${formatShareWeight(dailyShareMetrics.eremaDia.net)}
‚Ä¢ Tempo Parado: ${dailyShareMetrics.eremaDia.stopsFormatted}

---------------------------------------------------
EREMA - NOITE
---------------------------------------------------
‚Ä¢ Prod. Reciclada: ${formatShareWeight(dailyShareMetrics.eremaNoite.net)}
‚Ä¢ Tempo Parado: ${dailyShareMetrics.eremaNoite.stopsFormatted}

Produ√ß√£o total:
‚Ä¢ Prod. Reciclada Total: ${formatShareWeight(dailyShareMetrics.eremaTotal.net)}
‚Ä¢ Tempo Parado Total: ${dailyShareMetrics.eremaTotal.stopsFormatted}

Atenciosamente,
Gest√£o de Produ√ß√£o`;

                    const mailtoUrl = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
                    window.location.href = mailtoUrl;
                  }}
                  className="w-full sm:w-auto bg-blue-600 hover:bg-blue-500 text-white text-xs font-black uppercase tracking-widest px-6 py-4 rounded-xl transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Mail size={16} />
                  Compartilhar no Outlook
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const formattedDate = shareDate.split('-').reverse().join('/');
                    const whatsappText = `Bom dia.
Segue o relat√≥rio de produ√ß√£o referente ao dia *( ${formattedDate} )*:

---------------------------------------------------
*( CAST 1 DIA )*
---------------------------------------------------
‚Ä¢ *(Prod. L√≠quida):* ${formatShareWeight(dailyShareMetrics.cast1Dia.net)}
‚Ä¢ *(Eco B):* ${formatShareWeight(dailyShareMetrics.cast1Dia.ecoB)}${dailyShareMetrics.cast1Dia.ecoBJustText}
‚Ä¢ *(Eco A):* ${formatShareWeight(dailyShareMetrics.cast1Dia.ecoA)}${dailyShareMetrics.cast1Dia.ecoAJustText}
‚Ä¢ *(Tempo Parado):* ${dailyShareMetrics.cast1Dia.stopsFormatted}

---------------------------------------------------
*( CAST 1 NOITE )*
---------------------------------------------------
‚Ä¢ *(Prod. L√≠quida):* ${formatShareWeight(dailyShareMetrics.cast1Noite.net)}
‚Ä¢ *(Eco B):* ${formatShareWeight(dailyShareMetrics.cast1Noite.ecoB)}${dailyShareMetrics.cast1Noite.ecoBJustText}
‚Ä¢ *(Eco A):* ${formatShareWeight(dailyShareMetrics.cast1Noite.ecoA)}${dailyShareMetrics.cast1Noite.ecoAJustText}
‚Ä¢ *(Tempo Parado):* ${dailyShareMetrics.cast1Noite.stopsFormatted}

---------------------------------------------------
*( CAST 2 DIA )*
---------------------------------------------------
‚Ä¢ *(Prod. L√≠quida):* ${formatShareWeight(dailyShareMetrics.cast2Dia.net)}
‚Ä¢ *(Eco B):* ${formatShareWeight(dailyShareMetrics.cast2Dia.ecoB)}${dailyShareMetrics.cast2Dia.ecoBJustText}
‚Ä¢ *(Eco A):* ${formatShareWeight(dailyShareMetrics.cast2Dia.ecoA)}${dailyShareMetrics.cast2Dia.ecoAJustText}
‚Ä¢ *(Tempo Parado):* ${dailyShareMetrics.cast2Dia.stopsFormatted}

---------------------------------------------------
*( CAST 2 NOITE )*
---------------------------------------------------
‚Ä¢ *(Prod. L√≠quida):* ${formatShareWeight(dailyShareMetrics.cast2Noite.net)}
‚Ä¢ *(Eco B):* ${formatShareWeight(dailyShareMetrics.cast2Noite.ecoB)}${dailyShareMetrics.cast2Noite.ecoBJustText}
‚Ä¢ *(Eco A):* ${formatShareWeight(dailyShareMetrics.cast2Noite.ecoA)}${dailyShareMetrics.cast2Noite.ecoAJustText}
‚Ä¢ *(Tempo Parado):* ${dailyShareMetrics.cast2Noite.stopsFormatted}

---------------------------------------------------
*( PRODU√á√ÉO TOTAL - CAST 1 + 2 )*:
---------------------------------------------------
‚Ä¢ *(Prod. L√≠quida Total):* ${formatShareWeight(dailyShareMetrics.cast12Total.net)}
‚Ä¢ *(Eco B Total):* ${formatShareWeight(dailyShareMetrics.cast12Total.ecoB)}
‚Ä¢ *(Eco A Total):* ${formatShareWeight(dailyShareMetrics.cast12Total.ecoA)}
‚Ä¢ *(Tempo Parado Total):* ${dailyShareMetrics.cast12Total.stopsFormatted}

---------------------------------------------------
*( EREMA - DIA )*
---------------------------------------------------
‚Ä¢ *(Prod. Reciclada):* ${formatShareWeight(dailyShareMetrics.eremaDia.net)}
‚Ä¢ *(Tempo Parado):* ${dailyShareMetrics.eremaDia.stopsFormatted}

---------------------------------------------------
*( EREMA - NOITE )*
---------------------------------------------------
‚Ä¢ *(Prod. Reciclada):* ${formatShareWeight(dailyShareMetrics.eremaNoite.net)}
‚Ä¢ *(Tempo Parado):* ${dailyShareMetrics.eremaNoite.stopsFormatted}

---------------------------------------------------
*( PRODU√á√ÉO TOTAL EREMA )*:
---------------------------------------------------
‚Ä¢ *(Prod. Reciclada Total):* ${formatShareWeight(dailyShareMetrics.eremaTotal.net)}
‚Ä¢ *(Tempo Parado Total):* ${dailyShareMetrics.eremaTotal.stopsFormatted}

Atenciosamente,
*(Gest√£o de Produ√ß√£o)*`;

                    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(whatsappText)}`;
                    window.open(waUrl, '_blank');
                  }}
                  className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black uppercase tracking-widest px-6 py-4 rounded-xl transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Share size={16} />
                  Compartilhar no WhatsApp
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const formattedDate = shareDate.split('-').reverse().join('/');
                    const textToCopy = `Bom dia.
Segue o relat√≥rio de produ√ß√£o referente ao dia *( ${formattedDate} )*:

---------------------------------------------------
*( CAST 1 DIA )*
---------------------------------------------------
‚Ä¢ *(Prod. L√≠quida):* ${formatShareWeight(dailyShareMetrics.cast1Dia.net)}
‚Ä¢ *(Eco B):* ${formatShareWeight(dailyShareMetrics.cast1Dia.ecoB)}${dailyShareMetrics.cast1Dia.ecoBJustText}
‚Ä¢ *(Eco A):* ${formatShareWeight(dailyShareMetrics.cast1Dia.ecoA)}${dailyShareMetrics.cast1Dia.ecoAJustText}
‚Ä¢ *(Tempo Parado):* ${dailyShareMetrics.cast1Dia.stopsFormatted}

---------------------------------------------------
*( CAST 1 NOITE )*
---------------------------------------------------
‚Ä¢ *(Prod. L√≠quida):* ${formatShareWeight(dailyShareMetrics.cast1Noite.net)}
‚Ä¢ *(Eco B):* ${formatShareWeight(dailyShareMetrics.cast1Noite.ecoB)}${dailyShareMetrics.cast1Noite.ecoBJustText}
‚Ä¢ *(Eco A):* ${formatShareWeight(dailyShareMetrics.cast1Noite.ecoA)}${dailyShareMetrics.cast1Noite.ecoAJustText}
‚Ä¢ *(Tempo Parado):* ${dailyShareMetrics.cast1Noite.stopsFormatted}

---------------------------------------------------
*( CAST 2 DIA )*
---------------------------------------------------
‚Ä¢ *(Prod. L√≠quida):* ${formatShareWeight(dailyShareMetrics.cast2Dia.net)}
‚Ä¢ *(Eco B):* ${formatShareWeight(dailyShareMetrics.cast2Dia.ecoB)}${dailyShareMetrics.cast2Dia.ecoBJustText}
‚Ä¢ *(Eco A):* ${formatShareWeight(dailyShareMetrics.cast2Dia.ecoA)}${dailyShareMetrics.cast2Dia.ecoAJustText}
‚Ä¢ *(Tempo Parado):* ${dailyShareMetrics.cast2Dia.stopsFormatted}

---------------------------------------------------
*( CAST 2 NOITE )*
---------------------------------------------------
‚Ä¢ *(Prod. L√≠quida):* ${formatShareWeight(dailyShareMetrics.cast2Noite.net)}
‚Ä¢ *(Eco B):* ${formatShareWeight(dailyShareMetrics.cast2Noite.ecoB)}${dailyShareMetrics.cast2Noite.ecoBJustText}
‚Ä¢ *(Eco A):* ${formatShareWeight(dailyShareMetrics.cast2Noite.ecoA)}${dailyShareMetrics.cast2Noite.ecoAJustText}
‚Ä¢ *(Tempo Parado):* ${dailyShareMetrics.cast2Noite.stopsFormatted}

---------------------------------------------------
*( PRODU√á√ÉO TOTAL - CAST 1 + 2 )*:
---------------------------------------------------
‚Ä¢ *(Prod. L√≠quida Total):* ${formatShareWeight(dailyShareMetrics.cast12Total.net)}
‚Ä¢ *(Eco B Total):* ${formatShareWeight(dailyShareMetrics.cast12Total.ecoB)}
‚Ä¢ *(Eco A Total):* ${formatShareWeight(dailyShareMetrics.cast12Total.ecoA)}
‚Ä¢ *(Tempo Parado Total):* ${dailyShareMetrics.cast12Total.stopsFormatted}

---------------------------------------------------
*( EREMA - DIA )*
---------------------------------------------------
‚Ä¢ *(Prod. Reciclada):* ${formatShareWeight(dailyShareMetrics.eremaDia.net)}
‚Ä¢ *(Tempo Parado):* ${dailyShareMetrics.eremaDia.stopsFormatted}

---------------------------------------------------
*( EREMA - NOITE )*
---------------------------------------------------
‚Ä¢ *(Prod. Reciclada):* ${formatShareWeight(dailyShareMetrics.eremaNoite.net)}
‚Ä¢ *(Tempo Parado):* ${dailyShareMetrics.eremaNoite.stopsFormatted}

---------------------------------------------------
*( PRODU√á√ÉO TOTAL EREMA )*:
---------------------------------------------------
‚Ä¢ *(Prod. Reciclada Total):* ${formatShareWeight(dailyShareMetrics.eremaTotal.net)}
‚Ä¢ *(Tempo Parado Total):* ${dailyShareMetrics.eremaTotal.stopsFormatted}

Atenciosamente,
*(Gest√£o de Produ√ß√£o)*`;

                    navigator.clipboard.writeText(textToCopy)
                      .then(() => alert('Relat√≥rio copiado com sucesso para a √°rea de transfer√™ncia! Cole no WhatsApp, Outlook ou onde desejar.'))
                      .catch((err) => console.error('Erro ao copiar:', err));
                  }}
                  className="w-full sm:w-auto bg-white/10 hover:bg-white/15 border border-white/15 text-white text-xs font-black uppercase tracking-widest px-6 py-4 rounded-xl transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Copy size={16} />
                  Copiar Texto Formatado
                </button>
              </div>
            </div>

            {/* RELAT√ìRIO DE CONSUMO DI√ÅRIO DO DIA ANTERIOR */}
            {(() => {
              if (!shareDate) return null;
              const uniqueDates = Array.from(new Set(
                productionData
                  .filter(e => !e.machine.toLowerCase().includes('erema') && e.netWeight > 0)
                  .map(e => e.date)
              )).sort() as string[];
              
              let prevDate = '';
              if (shareDate) {
                const sDate = new Date(shareDate + 'T12:00:00');
                sDate.setDate(sDate.getDate() - 1);
                prevDate = sDate.toISOString().split('T')[0];
              }

              if (!prevDate) {
                return (
                  <div className="bg-white border border-slate-100 p-8 rounded-[2.5rem] text-center space-y-2 shadow-sm">
                    <p className="text-xs font-black text-slate-500 uppercase tracking-widest">Relat√≥rio de Consumo de Mat√©ria-Prima</p>
                    <p className="text-[10px] text-slate-400 font-bold">Nenhum lan√ßamento de produ√ß√£o anterior encontrado para calcular o consumo di√°rio de mat√©ria-prima.</p>
                  </div>
                );
              }

              const sortedStockEntries = [...stockEntries].sort((a, b) => a.date.localeCompare(b.date));
              const selectedStockIdx = sortedStockEntries.findIndex(e => e.date === shareDate);
              const prevStockEntry = selectedStockIdx > 0 ? sortedStockEntries[selectedStockIdx - 1] : null;

              const prevDayProd = (prevStockEntry && shareDate)
                ? productionData.filter(e => e.date >= prevStockEntry.date && e.date < shareDate && !e.machine.toLowerCase().includes('erema'))
                : (prevDate ? productionData.filter(e => e.date === prevDate && !e.machine.toLowerCase().includes('erema')) : []);
              
              let totalWeightLC3 = 0;
              let totalWeightATX = 0;
              let totalWeightLC2 = 0;
              let totalWeightATXPlus = 0;
              let totalWeightOther = 0;

              prevDayProd.forEach(e => {
                const weight = (e.netWeight || 0) + (e.ecoA || 0) + (e.ecoBP || 0) + (e.ecoBM || 0);
                const mType = (e.materialType || 'LC3').trim().toUpperCase();
                if (mType === 'LC3') {
                  totalWeightLC3 += weight;
                } else if (mType === 'ATX') {
                  totalWeightATX += weight;
                } else if (mType === 'LC2') {
                  totalWeightLC2 += weight;
                } else if (mType === 'ATX PLUS' || mType === 'ATXPLUS') {
                  totalWeightATXPlus += weight;
                } else {
                  totalWeightOther += weight;
                }
              });

              const prevDayTotalProd = totalWeightLC3 + totalWeightATX + totalWeightLC2 + totalWeightATXPlus + totalWeightOther;

              // F√≥rmulas de descontos:
              // LC3: 95% buteno, 5% metaloceno
              // ATX: 85% hexeno, 5% buteno, 10% metaloceno
              // LC2: 90% reciclado, 5% metaloceno, 5% buteno
              // ATX Plus: 85% hexeno, 5% buteno, 10% metaloceno
              // Outros: 100% outras resinas
              const consumedButeno = (totalWeightLC3 * 0.95) + (totalWeightATX * 0.05) + (totalWeightLC2 * 0.05) + (totalWeightATXPlus * 0.05);
              const consumedMetaloceno = (totalWeightLC3 * 0.05) + (totalWeightATX * 0.10) + (totalWeightLC2 * 0.05) + (totalWeightATXPlus * 0.10);
              const consumedHexeno = (totalWeightATX * 0.85) + (totalWeightATXPlus * 0.85);
              const consumedReciclado = (totalWeightLC2 * 0.90);
              const consumedOther = totalWeightOther;

              return (
                <div className="bg-white border border-slate-100 p-6 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] shadow-sm space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
                    <div>
                      <span className="text-[10px] font-black tracking-widest text-[#2563eb] uppercase bg-[#2563eb]/10 px-2.5 py-1 rounded-full">RELAT√ìRIO DE CONSUMO ‚Ä¢ DIA ANTERIOR</span>
                      <h3 className="text-lg sm:text-l font-black uppercase text-slate-800 mt-2">Consumo Proporcional de Mat√©ria-Prima</h3>
                      <p className="text-[10px] font-medium text-slate-400 mt-0.5 font-sans">Baseado nos lan√ßamentos de produ√ß√£o real apontados para o dia anterior: <strong>{prevDate.split('-').reverse().join('/')}</strong>.</p>
                    </div>
                    <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 text-right">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Produ√ß√£o Total Apontada</span>
                      <span className="text-sm font-black text-slate-800 font-mono">{formatWeight(prevDayTotalProd)}</span>
                    </div>
                  </div>

                  {prevDayTotalProd === 0 ? (
                    <div className="text-center py-6 text-slate-400 text-xs font-bold font-sans">
                      Nenhuma produ√ß√£o com peso l√≠quido registrada no dia anterior ({prevDate.split('-').reverse().join('/')}) para estimativa de insumos.
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-blue-50/40 border border-blue-100 p-5 rounded-3xl relative overflow-hidden flex flex-col justify-between">
                          <span className="text-[9px] font-black text-blue-500 uppercase tracking-widest">BUTENO CONSUMIDO</span>
                          <span className="text-xl md:text-2xl font-black text-blue-800 font-mono mt-3">{formatWeight(consumedButeno)}</span>
                          <div className="mt-2 text-[10px] font-bold text-blue-600/80 uppercase tracking-wider font-sans">
                            {prevDayTotalProd > 0 ? ((consumedButeno / prevDayTotalProd) * 100).toFixed(1).replace('.', ',') : '0'}% do total produzido
                          </div>
                        </div>

                        <div className="bg-indigo-50/40 border border-indigo-100 p-5 rounded-3xl relative overflow-hidden flex flex-col justify-between">
                          <span className="text-[9px] font-black text-indigo-500 uppercase tracking-widest font-sans">HEXENO CONSUMIDO</span>
                          <span className="text-xl md:text-2xl font-black text-indigo-800 font-mono mt-3">{formatWeight(consumedHexeno)}</span>
                          <div className="mt-2 text-[10px] font-bold text-indigo-600/80 uppercase tracking-wider font-sans">
                            {prevDayTotalProd > 0 ? ((consumedHexeno / prevDayTotalProd) * 100).toFixed(1).replace('.', ',') : '0'}% do total produzido
                          </div>
                        </div>

                        <div className="bg-purple-50/40 border border-purple-100 p-5 rounded-3xl relative overflow-hidden flex flex-col justify-between">
                          <span className="text-[9px] font-black text-purple-500 uppercase tracking-widest font-sans">METALOCENO CONSUMIDO</span>
                          <span className="text-xl md:text-2xl font-black text-purple-800 font-mono mt-3">{formatWeight(consumedMetaloceno)}</span>
                          <div className="mt-2 text-[10px] font-bold text-purple-600/80 uppercase tracking-wider font-sans">
                            {prevDayTotalProd > 0 ? ((consumedMetaloceno / prevDayTotalProd) * 100).toFixed(1).replace('.', ',') : '0'}% do total produzido
                          </div>
                        </div>
                      </div>

                      <div className="bg-slate-50 border border-slate-100 rounded-3xl p-5 space-y-4">
                        <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest block font-sans">Resumo F√≠sico de Lan√ßamentos de Materiais ({prevDate.split('-').reverse().join('/')})</span>
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                          <div className="bg-white p-3 rounded-2xl border border-slate-100">
                            <span className="text-[9px] font-bold text-slate-400 block uppercase font-sans">LC3 Produzido</span>
                            <span className="text-xs font-black text-slate-700 font-mono">{formatWeight(totalWeightLC3)}</span>
                          </div>
                          <div className="bg-white p-3 rounded-2xl border border-slate-100">
                            <span className="text-[9px] font-bold text-slate-400 block uppercase font-sans">LC2 Produzido</span>
                            <span className="text-xs font-black text-slate-700 font-mono">{formatWeight(totalWeightLC2)}</span>
                          </div>
                          <div className="bg-white p-3 rounded-2xl border border-slate-100">
                            <span className="text-[9px] font-bold text-slate-400 block uppercase font-sans">ATX Base Prod.</span>
                            <span className="text-xs font-black text-slate-700 font-mono">{formatWeight(totalWeightATX)}</span>
                          </div>
                          <div className="bg-white p-3 rounded-2xl border border-slate-100">
                            <span className="text-[9px] font-bold text-slate-400 block uppercase font-sans">ATX Plus Prod.</span>
                            <span className="text-xs font-black text-slate-700 font-mono">{formatWeight(totalWeightATXPlus)}</span>
                          </div>
                          <div className="bg-white p-3 rounded-2xl border border-slate-100">
                            <span className="text-[9px] font-bold text-slate-400 block uppercase font-sans">Outros Prod.</span>
                            <span className="text-xs font-black text-slate-700 font-mono">{formatWeight(totalWeightOther)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            {!filterDay && ecoBalance[dashboardMonth] && (
              <div className="bg-white p-5 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col gap-6 sm:gap-8">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-4">
                  <div className="flex items-center gap-3 sm:gap-4 text-slate-800">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-orange-50 text-orange-500 rounded-xl sm:rounded-[1.2rem] flex items-center justify-center border border-orange-100"><Scale size={20} className="sm:w-6 sm:h-6" /></div>
                    <div>
                      <h3 className="text-lg sm:text-xl font-black uppercase tracking-tight leading-tight">Ciclo do Balan√ßo de Eco B & Reciclagem</h3>
                      <p className="text-[9px] sm:text-[10px] uppercase font-bold text-slate-400 tracking-widest">Acompanhamento Circular Estruturado ‚Ä¢ M√äS DE REFER√äNCIA: {dashboardMonth}</p>
                    </div>
                  </div>
                  <div className="bg-indigo-50 border border-indigo-100 text-indigo-700 text-[9px] sm:text-[10px] font-black uppercase px-3 py-1 rounded-full self-start sm:self-center tracking-wider">
                    Ciclo Fechado Eco-eficiente
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 leading-none">
                  {/* TRACK 1: ECO B (Res√≠duos Coletados para Reciclabilidade) */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-orange-600 font-extrabold text-xs uppercase tracking-wider">
                      <span className="w-2.5 h-2.5 rounded-full bg-orange-500 animate-pulse"></span>
                      1. Coleta de Res√≠duos (Eco B)
                    </div>
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-tight">Material de refugo oriundo do processo de extrus√£o das Cast 1 e 2.</p>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="bg-slate-50 p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-100 flex items-center justify-between gap-2 shadow-sm">
                        <p className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest">Sobra M√™s Anterior</p>
                        <p className="text-base sm:text-lg font-black text-slate-500">{formatWeight(ecoBalance[dashboardMonth].startingSurplus)}</p>
                      </div>
                      <div className="bg-orange-50/40 p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-orange-150/40 flex items-center justify-between gap-2 shadow-sm">
                        <p className="text-[9px] sm:text-[10px] font-black text-orange-500 uppercase tracking-widest flex items-center gap-1"><TrendingUp size={10}/> Gerado Cast 1/2</p>
                        <p className="text-base sm:text-lg font-black text-orange-500">+{formatWeight(ecoBalance[dashboardMonth].monthEcoB)}</p>
                      </div>
                      <div className="bg-slate-50 p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-200 flex items-center justify-between gap-2 shadow-sm">
                        <p className="text-[9px] sm:text-[10px] font-black text-slate-600 uppercase tracking-widest">Total Dispon√≠vel</p>
                        <p className="text-base sm:text-lg font-black text-slate-800">{formatWeight(ecoBalance[dashboardMonth].totalAvailable)}</p>
                      </div>
                      <div className="bg-amber-50/40 p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-amber-100 flex items-center justify-between gap-2 shadow-sm">
                        <p className="text-[9px] sm:text-[10px] font-black text-amber-600 uppercase tracking-widest">Processado Erema</p>
                        <p className="text-base sm:text-lg font-black text-amber-600">-{formatWeight(ecoBalance[dashboardMonth].monthRecycled)}</p>
                      </div>
                    </div>
                    <div className="bg-amber-900 text-amber-100 p-3.5 rounded-xl sm:rounded-2xl flex items-center justify-between gap-2 shadow-md">
                      <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest">Sobra Eco B (Pendente)</span>
                      <span className="text-base sm:text-lg font-black">{formatWeight(ecoBalance[dashboardMonth].endingSurplus)}</span>
                    </div>
                  </div>

                  {/* TRACK 2: PELLETS RECICLADOS (Retorno Direto √† Produ√ß√£o) */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-emerald-600 font-extrabold text-xs uppercase tracking-wider">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      2. Retorno √† Extrus√£o (Pellets Reciclados)
                    </div>
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-tight">Pellets gerados na Erema reintroduzidos como mat√©ria-prima no Cast.</p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="bg-slate-50 p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-100 flex items-center justify-between gap-2 shadow-sm">
                        <div className="leading-tight">
                          <p className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest">Estoque de Pellets Ant.</p>
                          <span className="text-[8px] sm:text-[9px] text-slate-400 font-bold uppercase tracking-wider">{(ecoBalance[dashboardMonth].startingRecycledSurplus / 1100).toFixed(1).replace('.', ',')} {(ecoBalance[dashboardMonth].startingRecycledSurplus / 1100) === 1 ? 'Bag' : 'Bags'}</span>
                        </div>
                        <p className="text-base sm:text-lg font-black text-slate-500">{formatWeight(ecoBalance[dashboardMonth].startingRecycledSurplus)}</p>
                      </div>
                      <div className="bg-emerald-50/30 p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-emerald-100/30 flex items-center justify-between gap-2 shadow-sm">
                        <div className="leading-tight">
                          <p className="text-[9px] sm:text-[10px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-1"><Package size={10}/> Produzido Erema</p>
                          <span className="text-[8px] sm:text-[9px] text-emerald-500/75 font-bold uppercase tracking-wider">{(ecoBalance[dashboardMonth].monthRecycled / 1100).toFixed(1).replace('.', ',')} {((ecoBalance[dashboardMonth].monthRecycled / 1100) === 1) ? 'Bag' : 'Bags'}</span>
                        </div>
                        <p className="text-base sm:text-lg font-black text-emerald-600">+{formatWeight(ecoBalance[dashboardMonth].monthRecycled)}</p>
                      </div>
                      <div className="bg-slate-50 p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-200 flex items-center justify-between gap-2 shadow-sm">
                        <div className="leading-tight">
                          <p className="text-[9px] sm:text-[10px] font-black text-slate-600 uppercase tracking-widest">Total Dispon√≠vel Pellets</p>
                          <span className="text-[8px] sm:text-[9px] text-slate-400 font-bold uppercase tracking-wider">{(ecoBalance[dashboardMonth].totalRecycledAvailable / 1100).toFixed(1).replace('.', ',')} {((ecoBalance[dashboardMonth].totalRecycledAvailable / 1100) === 1) ? 'Bag' : 'Bags'}</span>
                        </div>
                        <p className="text-base sm:text-lg font-black text-slate-800">{formatWeight(ecoBalance[dashboardMonth].totalRecycledAvailable)}</p>
                      </div>
                      <div className="bg-red-50/40 p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-red-100 flex items-center justify-between gap-2 shadow-sm">
                        <div className="leading-tight">
                          <p className="text-[9px] sm:text-[10px] font-black text-red-500 uppercase tracking-widest flex items-center gap-1"><TrendingDown size={10}/> Abatido Cast 1/2</p>
                          <span className="text-[8px] sm:text-[9px] text-red-400 font-bold uppercase tracking-wider">{(ecoBalance[dashboardMonth].monthRecycledUsed / 1100).toFixed(1).replace('.', ',')} {((ecoBalance[dashboardMonth].monthRecycledUsed / 1100) === 1) ? 'Bag' : 'Bags'}</span>
                        </div>
                        <p className="text-base sm:text-lg font-black text-red-500">-{formatWeight(ecoBalance[dashboardMonth].monthRecycledUsed)}</p>
                      </div>
                    </div>
                    <div className="bg-emerald-800 text-emerald-100 p-3.5 rounded-xl sm:rounded-2xl flex items-center justify-between gap-2 shadow-md">
                      <div className="leading-tight">
                        <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-nowrap">Pellets em Estoque Atual</span>
                        <span className="text-[8px] sm:text-[9px] text-emerald-100/75 font-bold uppercase tracking-wider block mt-0.5">{(ecoBalance[dashboardMonth].endingRecycledSurplus / 1100).toFixed(1).replace('.', ',')} {((ecoBalance[dashboardMonth].endingRecycledSurplus / 1100) === 1) ? 'Bag' : 'Bags'}</span>
                      </div>
                      <span className="text-base sm:text-lg font-black">{formatWeight(ecoBalance[dashboardMonth].endingRecycledSurplus)}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'extrusion' && extrusionSubTab === 'dashboard' && dashboardSubTab === 'charts' && (() => {
              // Extract lists dynamically from productionData to ensure up-to-date options
              const biMachinesList = Array.from(new Set(productionData.map(e => e.machine))).filter(Boolean);
              const biOperatorsList = Array.from(new Set(productionData.map(e => e.operator))).filter(Boolean).sort();
              const biShiftsList = Array.from(new Set(productionData.map(e => e.shift))).filter(Boolean).sort();

              // Calculate active filtered subset based on cross-filters (Slicers)
              const biFilteredData = productionData.filter(e => {
                if (!e || !e.date) return false;

                // Exclui lan√ßamentos do Cast 2 para os meses de Maio e Junho apenas se forem registros antigos importados/existentes
                const isExcludedMonth = e.date.substring(5, 7) === '05' || e.date.substring(5, 7) === '06';
                const isExistingPastEntry = !e.updatedAt || e.updatedAt < '2026-06-12T17:44:00Z';
                if (isExcludedMonth && e.machine.toLowerCase().includes('cast 2') && isExistingPastEntry) {
                  return false;
                }

                const matchMachine = biMachineFilter === 'all' ? true : e.machine.toLowerCase().includes(biMachineFilter.toLowerCase());
                const matchOperator = biOperatorFilter === 'all' ? true : e.operator === biOperatorFilter;
                const matchShift = biShiftFilter === 'all' ? true : e.shift === biShiftFilter;
                
                // Se nenhum filtro de data espec√≠fico de BI estiver preenchido, filtramos pelo m√™s de refer√™ncia ativo (dashboardMonth) por padr√£o
                const hasBiDateFilter = biStartDate !== '' || biEndDate !== '';
                const matchSubDate = hasBiDateFilter
                  ? (biStartDate ? e.date >= biStartDate : true) && (biEndDate ? e.date <= biEndDate : true)
                  : e.date.startsWith(dashboardMonth);

                return matchMachine && matchOperator && matchShift && matchSubDate;
              });

              // 1. KPI Calculation metrics
              const totalNetCast = biFilteredData.filter(e => !e.machine.toLowerCase().includes('erema')).reduce((acc, e) => acc + (e.netWeight || 0), 0);
              const totalNetErema = biFilteredData.filter(e => e.machine.toLowerCase().includes('erema')).reduce((acc, e) => acc + (e.netWeight || 0), 0);
              const totalEcoB_P = biFilteredData.reduce((acc, e) => acc + (e.ecoBP || 0), 0);
              const totalEcoB_M = biFilteredData.reduce((acc, e) => acc + (e.ecoBM || 0), 0);
              const totalBorra = biFilteredData.reduce((acc, e) => acc + (e.borraTotal || 0), 0);
              const totalEcoB = totalEcoB_P + totalEcoB_M;
              const totalWaste = totalEcoB + totalBorra;

              // Formula requested: Total Eco B / (Produ√ß√£o L√≠quida + Total Eco B)
              const rejectCoef = (totalNetCast + totalEcoB) > 0 ? (totalEcoB / (totalNetCast + totalEcoB)) * 100 : 0;
              const totalEcoA = biFilteredData.reduce((acc, e) => acc + (e.ecoA || 0), 0);

              // Stoppage time availability calculation
              const getShiftDuration = (shiftName: string) => {
                const shift = availableShifts.find(s => s.name === shiftName);
                if (!shift) return 720;
                const [h1, m1] = shift.startTime.split(':').map(Number);
                const [h2, m2] = shift.endTime.split(':').map(Number);
                let minutes = (h2 * 60 + m2) - (h1 * 60 + m1);
                if (minutes < 0) minutes += 1440;
                return minutes === 0 ? 1440 : minutes;
              };

              let totalAvailableMinutes = 0;
              let totalDowntimeMinutes = 0;

              biFilteredData.forEach(e => {
                const duration = getShiftDuration(e.shift);
                totalAvailableMinutes += duration;
                if (e.isNoWorkDay) {
                  totalDowntimeMinutes += duration;
                } else {
                  totalDowntimeMinutes += (e.manutencaoMin || 0) + (e.processoMin || 0) + (e.outrosMin || 0);
                }
              });

              const availabilityPct = totalAvailableMinutes > 0 ? Math.max(0, Math.min(100, ((totalAvailableMinutes - totalDowntimeMinutes) / totalAvailableMinutes) * 100)) : 100;

              // Scatter Plot Data: Operators vs Efficiency
              const scatterMap: Record<string, { name: string, prod: number, wastes: number, stopsProcess: number, color: string }> = {};
              biFilteredData.forEach((e, idx) => {
                const op = e.operator;
                if (!scatterMap[op]) {
                  scatterMap[op] = { name: op, prod: 0, wastes: 0, stopsProcess: 0, color: COLORS[idx % COLORS.length] };
                }
                if (!e.machine.toLowerCase().includes('erema')) {
                  scatterMap[op].prod += (e.netWeight || 0);
                }
                scatterMap[op].wastes += (e.ecoBP || 0) + (e.ecoBM || 0) + (e.borraTotal || 0);
                scatterMap[op].stopsProcess += (e.processoMin || 0);
              });
              const scatterData = Object.values(scatterMap).filter(d => d.prod > 0 || d.wastes > 0);

              // Daily trend composite (Composed Chart Data)
              const dailyTrendMap: Record<string, { 
                date: string; 
                label: string; 
                ecoBP: number; 
                ecoBM: number; 
                borra: number; 
                prod: number;
                totalVolumes: number;
                volumesByShiftMachine: Record<string, Record<string, number>>;
              }> = {};
              biFilteredData.forEach(e => {
                const d = e.date;
                const label = d.split('-').reverse().slice(0, 2).join('/');
                if (!dailyTrendMap[d]) {
                  dailyTrendMap[d] = { 
                    date: d, 
                    label, 
                    ecoBP: 0, 
                    ecoBM: 0, 
                    borra: 0, 
                    prod: 0,
                    totalVolumes: 0,
                    volumesByShiftMachine: {}
                  };
                }
                dailyTrendMap[d].ecoBP += (e.ecoBP || 0);
                dailyTrendMap[d].ecoBM += (e.ecoBM || 0);
                dailyTrendMap[d].borra += (e.borraTotal || 0);
                
                const machineUpper = (e.machine || '').trim().toUpperCase();
                const isErema = machineUpper.includes('EREMA');
                
                if (!isErema) {
                  dailyTrendMap[d].prod += (e.netWeight || 0);
                  const vol = e.volumes || 0;
                  dailyTrendMap[d].totalVolumes += vol;
                  
                  if (vol > 0) {
                    const s = (e.shift || '').trim().toUpperCase() || 'N√ÉO ESPECIFICADO';
                    const m = machineUpper || 'N√ÉO ESPECIFICADO';
                    if (!dailyTrendMap[d].volumesByShiftMachine[s]) {
                      dailyTrendMap[d].volumesByShiftMachine[s] = {};
                    }
                    dailyTrendMap[d].volumesByShiftMachine[s][m] = (dailyTrendMap[d].volumesByShiftMachine[s][m] || 0) + vol;
                  }
                }
              });
              const dailyTrendData = Object.values(dailyTrendMap).sort((a, b) => a.date.localeCompare(b.date));

              // 100% Proportional Stops Breakdown
              const stopsGroupMap: Record<string, { name: string, manut: number, proc: number, outros: number }> = {};
              biFilteredData.forEach(e => {
                const key = stackedGroupBy === 'machine' ? e.machine : e.operator;
                if (!stopsGroupMap[key]) {
                  stopsGroupMap[key] = { name: key, manut: 0, proc: 0, outros: 0 };
                }
                stopsGroupMap[key].manut += (e.manutencaoMin || 0);
                stopsGroupMap[key].proc += (e.processoMin || 0);
                stopsGroupMap[key].outros += (e.outrosMin || 0);
              });
              const proportionalStopsData = Object.values(stopsGroupMap).map(d => {
                const total = d.manut + d.proc + d.outros;
                return {
                  name: d.name,
                  manutPct: total > 0 ? Number(((d.manut / total) * 100).toFixed(1)) : 0,
                  procPct: total > 0 ? Number(((d.proc / total) * 100).toFixed(1)) : 0,
                  outrosPct: total > 0 ? Number(((d.outros / total) * 100).toFixed(1)) : 0,
                  totalMin: total
                };
              }).filter(d => d.totalMin > 0);

              // Extrusion waste vs Erema Recycling Mass Balance
              const extruderEcoB = biFilteredData.filter(e => !e.machine.toLowerCase().includes('erema')).reduce((acc, e) => acc + (e.ecoBP || 0) + (e.ecoBM || 0), 0);
              const eremaRecycled = biFilteredData.filter(e => e.machine.toLowerCase().includes('erema')).reduce((acc, e) => acc + (e.netWeight || 0), 0);
              const massBalanceData = [
                { name: 'Eco B Gerado (Cast)', value: extruderEcoB },
                { name: 'Reciclado (Erema)', value: eremaRecycled }
              ].filter(d => d.value > 0);

              // Dynamic Metrics dropdown specifications
              const dynamicMetricsList = [
                { id: 'prod', label: 'Produ√ß√£o L√≠quida kg/t', getValue: (e: any) => (e.netWeight || 0), formatter: formatWeight },
                { id: 'ecoA', label: 'Envio Eco A (Sede Curitiba) (kg)', getValue: (e: any) => (e.ecoA || 0), formatter: formatWeight },
                { id: 'ecoBP', label: 'Eco B Produ√ß√£o (kg)', getValue: (e: any) => (e.ecoBP || 0), formatter: formatWeight },
                { id: 'ecoBM', label: 'Eco B Manuten√ß√£o (kg)', getValue: (e: any) => (e.ecoBM || 0), formatter: formatWeight },
                { id: 'borra', label: 'Res√≠duo Borra (kg)', getValue: (e: any) => (e.borraTotal || 0), formatter: formatWeight },
                { id: 'p_manut', label: 'Tempo Manuten√ß√£o (min)', getValue: (e: any) => (e.manutencaoMin || 0), formatter: formatMinutes },
                { id: 'p_proc', label: 'Tempo Processo (min)', getValue: (e: any) => (e.processoMin || 0), formatter: formatMinutes },
                { id: 'p_outros', label: 'Tempo Outros (min)', getValue: (e: any) => (e.outrosMin || 0), formatter: formatMinutes },
                { id: 'wastes', label: 'Res√≠duos Totais (kg)', getValue: (e: any) => (e.ecoBP || 0) + (e.ecoBM || 0) + (e.borraTotal || 0), formatter: formatWeight },
                { id: 'stops_total', label: 'Paradas Totais (min)', getValue: (e: any) => (e.manutencaoMin || 0) + (e.processoMin || 0) + (e.outrosMin || 0), formatter: formatMinutes },
                { id: 'rejeito_coef', label: 'Coeficiente de Rejeito (%)', getValue: null, formatter: (val: any) => `${Number(val).toFixed(2)}%` }
              ];

              const selectedMetricDef = dynamicMetricsList.find(m => m.id === biDynamicMetric) || dynamicMetricsList[0];
              const dynamicMap: Record<string, { name: string, value: number, totalNet: number, totalEcoB: number }> = {};
              biFilteredData.forEach(e => {
                const groupKey = e[biDynamicGroup] || 'N/A';
                if (!dynamicMap[groupKey]) {
                  dynamicMap[groupKey] = { name: groupKey, value: 0, totalNet: 0, totalEcoB: 0 };
                }
                if (selectedMetricDef.id === 'rejeito_coef') {
                  if (!e.machine.toLowerCase().includes('erema')) {
                    dynamicMap[groupKey].totalNet += (e.netWeight || 0);
                  }
                  dynamicMap[groupKey].totalEcoB += (e.ecoBP || 0) + (e.ecoBM || 0);
                } else {
                  dynamicMap[groupKey].value += selectedMetricDef.getValue ? selectedMetricDef.getValue(e) : 0;
                }
              });

              const dynamicChartData = Object.values(dynamicMap).map(item => {
                if (selectedMetricDef.id === 'rejeito_coef') {
                  const rate = (item.totalNet + item.totalEcoB) > 0 ? (item.totalEcoB / (item.totalNet + item.totalEcoB)) * 100 : 0;
                  return { name: item.name, value: Number(rate.toFixed(2)) };
                }
                return { name: item.name, value: Number(item.value.toFixed(1)) };
              }).sort((a, b) => b.value - a.value);

              // Stop reasons compiler for high-fidelity drilldown lists
              const allCompiledStops: any[] = [];
              biFilteredData.forEach(e => {
                if (e.manutencaoMin > 0) {
                  allCompiledStops.push({ id: `${e.id}-manut`, date: e.date, machine: e.machine, operator: e.operator, shift: e.shift, type: 'Manuten√ß√£o', minutes: e.manutencaoMin, motive: formatStoppageMotiveClean(e.manutencaoMotivo) || 'Ajuste perif√©rico / Troca de feltros' });
                }
                if (e.processoMin > 0) {
                  allCompiledStops.push({ id: `${e.id}-proc`, date: e.date, machine: e.machine, operator: e.operator, shift: e.shift, type: 'Processo', minutes: e.processoMin, motive: formatStoppageMotiveClean(e.processoMotivo) || 'Limpeza de matriz / Ajuste de perfil' });
                }
                if (e.outrosMin > 0) {
                  allCompiledStops.push({ id: `${e.id}-outr`, date: e.date, machine: e.machine, operator: e.operator, shift: e.shift, type: 'Outros', minutes: e.outrosMin, motive: formatStoppageMotiveClean(e.outrosMotivo) || 'Troca de bobinas / Aguardando material' });
                }
              });
              const sortedCompiledStops = allCompiledStops.sort((a, b) => b.minutes - a.minutes);

              const handleOpenDrilldown = (type: 'machine' | 'operator' | 'shift', filterValue: string) => {
                const matchingEntries = biFilteredData.filter(e => {
                  if (type === 'machine') return e.machine.toLowerCase() === filterValue.toLowerCase();
                  if (type === 'operator') return e.operator === filterValue;
                  return e.shift === filterValue;
                });

                const compiledStops: any[] = [];
                matchingEntries.forEach(e => {
                  if (e.manutencaoMin > 0) {
                    compiledStops.push({
                      id: `${e.id}-manut`,
                      date: e.date,
                      machine: e.machine,
                      operator: e.operator,
                      shift: e.shift,
                      type: 'Manuten√ß√£o',
                      minutes: e.manutencaoMin,
                      motive: formatStoppageMotiveClean(e.manutencaoMotivo) || 'Manuten√ß√£o mec√¢nica preventiva / Ajuste de cilindros',
                      severity: 'high'
                    });
                  }
                  if (e.processoMin > 0) {
                    compiledStops.push({
                      id: `${e.id}-proc`,
                      date: e.date,
                      machine: e.machine,
                      operator: e.operator,
                      shift: e.shift,
                      type: 'Processo',
                      minutes: e.processoMin,
                      motive: formatStoppageMotiveClean(e.processoMotivo) || 'Reset operacional / Ajuste de espessura de filme',
                      severity: 'medium'
                    });
                  }
                  if (e.outrosMin > 0) {
                    compiledStops.push({
                      id: `${e.id}-outr`,
                      date: e.date,
                      machine: e.machine,
                      operator: e.operator,
                      shift: e.shift,
                      type: 'Outros',
                      minutes: e.outrosMin,
                      motive: formatStoppageMotiveClean(e.outrosMotivo) || 'Parada operacional t√©cnica / Ajuste de tubetes',
                      severity: 'low'
                    });
                  }
                });

                setBiDrilldownModal({
                  isOpen: true,
                  title: `Detalhamento de Paradas ‚Äî ${type === 'machine' ? 'Equipamento' : type === 'operator' ? 'Operador' : 'Turno'}: ${filterValue}`,
                  type,
                  filterValue,
                  stops: compiledStops.sort((a, b) => b.minutes - a.minutes)
                });
              };

              const clearBiFilters = () => {
                setBiMachineFilter('all');
                setBiOperatorFilter('all');
                setBiShiftFilter('all');
                setBiStartDate('');
                setBiEndDate('');
              };

              const exportOperatorsMetricsPDF = () => {
                const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
                const pageWidth = doc.internal.pageSize.getWidth();
                const pageHeight = doc.internal.pageSize.getHeight();
                const nowFull = new Date().toLocaleString('pt-BR');

                // Header block background
                doc.setFillColor(15, 23, 42); // slate-900
                doc.rect(0, 0, pageWidth, 24, 'F');

                doc.setTextColor(255, 255, 255);
                doc.setFontSize(13);
                doc.setFont('helvetica', 'bold');
                doc.text("MANUPACKAGING - GEST√ÉO E CONTROLE DE PRODU√á√ÉO", 12, 11);
                doc.setFontSize(9);
                doc.setFont('helvetica', 'normal');
                doc.text("RELAT√ìRIO CONSOLIDADO DE M√âTRICAS POR OPERADOR (DADOS DIN√ÇMICOS)", 12, 17);

                // Date/Time
                doc.setTextColor(15, 23, 42);
                doc.setFontSize(9);
                doc.setFont('helvetica', 'bold');
                const pStart = biStartDate ? biStartDate.split('-').reverse().join('/') : 'In√≠cio';
                const pEnd = biEndDate ? biEndDate.split('-').reverse().join('/') : 'Fim';
                doc.text(`Filtros Ativos - Per√≠odo: ${pStart} at√© ${pEnd}`, 12, 32);

                if (biMachineFilter !== 'all') {
                  doc.setFontSize(8);
                  doc.setFont('helvetica', 'normal');
                  doc.text(`M√°quina: ${biMachineFilter}`, 12, 36);
                }

                doc.setFontSize(8);
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(100, 116, 139);
                doc.text(`Emitido em: ${nowFull}`, pageWidth - 12, 32, { align: 'right' });

                // Construct metrics per operator
                const operatorsMap: Record<string, {
                  name: string;
                  prod: number;
                  ecoA: number;
                  ecoBP: number;
                  ecoBM: number;
                  borra: number;
                  wastes: number;
                  manut: number;
                  proc: number;
                  outros: number;
                  stopsTotal: number;
                  totalNetForReject: number;
                  totalEcoBForReject: number;
                }> = {};

                biFilteredData.forEach(e => {
                  const op = e.operator || 'N/A';
                  if (!operatorsMap[op]) {
                    operatorsMap[op] = {
                      name: op,
                      prod: 0,
                      ecoA: 0,
                      ecoBP: 0,
                      ecoBM: 0,
                      borra: 0,
                      wastes: 0,
                      manut: 0,
                      proc: 0,
                      outros: 0,
                      stopsTotal: 0,
                      totalNetForReject: 0,
                      totalEcoBForReject: 0
                    };
                  }

                  const opData = operatorsMap[op];
                  opData.prod += (e.netWeight || 0);
                  opData.ecoA += (e.ecoA || 0);
                  opData.ecoBP += (e.ecoBP || 0);
                  opData.ecoBM += (e.ecoBM || 0);
                  opData.borra += (e.borraTotal || 0);
                  opData.wastes += (e.ecoBP || 0) + (e.ecoBM || 0) + (e.borraTotal || 0);
                  opData.manut += (e.manutencaoMin || 0);
                  opData.proc += (e.processoMin || 0);
                  opData.outros += (e.outrosMin || 0);
                  opData.stopsTotal += (e.manutencaoMin || 0) + (e.processoMin || 0) + (e.outrosMin || 0);

                  if (!e.machine.toLowerCase().includes('erema')) {
                    opData.totalNetForReject += (e.netWeight || 0);
                  }
                  opData.totalEcoBForReject += (e.ecoBP || 0) + (e.ecoBM || 0);
                });

                const sortedOperators = Object.values(operatorsMap).sort((a, b) => b.prod - a.prod);

                const tableHead = [[
                  'OPERADOR',
                  'PROD. L√çQUIDA',
                  'ENVIO ECO A',
                  'ECO B PROD.',
                  'ECO B MANUT.',
                  'BORRA',
                  'RES√çDUOS TOT.',
                  'PARADA MANUT.',
                  'PARADA PROC.',
                  'OUTRAS PARADAS',
                  'PARADAS TOT.',
                  'COEF. REJEITO'
                ]];

                const tableBody = sortedOperators.map(op => {
                  const rejectCoefValue = (op.totalNetForReject + op.totalEcoBForReject) > 0
                    ? (op.totalEcoBForReject / (op.totalNetForReject + op.totalEcoBForReject)) * 100
                    : 0;

                  return [
                    op.name,
                    formatWeight(op.prod),
                    formatWeight(op.ecoA),
                    formatWeight(op.ecoBP),
                    formatWeight(op.ecoBM),
                    formatWeight(op.borra),
                    formatWeight(op.wastes),
                    formatMinutes(op.manut),
                    formatMinutes(op.proc),
                    formatMinutes(op.outros),
                    formatMinutes(op.stopsTotal),
                    `${rejectCoefValue.toFixed(2)}%`
                  ];
                });

                autoTable(doc, {
                  startY: biMachineFilter !== 'all' ? 40 : 36,
                  head: tableHead,
                  body: tableBody,
                  theme: 'grid',
                  headStyles: {
                    fillColor: [79, 70, 229], // indigo-600
                    textColor: [255, 255, 255],
                    fontSize: 7.5,
                    fontStyle: 'bold',
                    halign: 'center',
                    valign: 'middle'
                  },
                  styles: {
                    fontSize: 7,
                    cellPadding: 2.5,
                    valign: 'middle'
                  },
                  columnStyles: {
                    0: { fontStyle: 'bold', halign: 'left', cellWidth: 38 },
                    1: { halign: 'right', fontStyle: 'bold' },
                    2: { halign: 'right' },
                    3: { halign: 'right' },
                    4: { halign: 'right' },
                    5: { halign: 'right' },
                    6: { halign: 'right', fontStyle: 'bold' },
                    7: { halign: 'right' },
                    8: { halign: 'right' },
                    9: { halign: 'right' },
                    10: { halign: 'right', fontStyle: 'bold' },
                    11: { halign: 'center', fontStyle: 'bold', textColor: [220, 38, 38] } // red-600
                  }
                });

                const finalY = (doc as any).lastAutoTable.finalY || 180;
                doc.setFontSize(8);
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(148, 163, 184);
                doc.text(`Relat√≥rio de M√©tricas por Operador ‚Äî Gerado por ${currentUser?.displayName || currentUser?.email || 'Sistema'}`, pageWidth / 2, pageHeight - 10, { align: 'center' });

                setPdfModal({
                  isOpen: true,
                  doc,
                  filename: `Relatorio_Metricas_Operadores_${new Date().toISOString().split('T')[0]}.pdf`,
                  title: `Relat√≥rio Consolidado de M√©tricas por Operador`
                });
              };

              const exportSingleOperatorPDF = (operatorName: string) => {
                const opDataList = biFilteredData.filter(e => e.operator === operatorName);
                
                const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
                const pageWidth = doc.internal.pageSize.getWidth();
                const pageHeight = doc.internal.pageSize.getHeight();
                const nowFull = new Date().toLocaleString('pt-BR');

                // Sum up metrics for this operator
                let prod = 0;
                let ecoA = 0;
                let ecoBP = 0;
                let ecoBM = 0;
                let borra = 0;
                let wastes = 0;
                let manut = 0;
                let proc = 0;
                let outros = 0;
                let stopsTotal = 0;
                let totalNetForReject = 0;
                let totalEcoBForReject = 0;

                opDataList.forEach(e => {
                  prod += (e.netWeight || 0);
                  ecoA += (e.ecoA || 0);
                  ecoBP += (e.ecoBP || 0);
                  ecoBM += (e.ecoBM || 0);
                  borra += (e.borraTotal || 0);
                  wastes += (e.ecoBP || 0) + (e.ecoBM || 0) + (e.borraTotal || 0);
                  manut += (e.manutencaoMin || 0);
                  proc += (e.processoMin || 0);
                  outros += (e.outrosMin || 0);
                  stopsTotal += (e.manutencaoMin || 0) + (e.processoMin || 0) + (e.outrosMin || 0);

                  if (!e.machine.toLowerCase().includes('erema')) {
                    totalNetForReject += (e.netWeight || 0);
                  }
                  totalEcoBForReject += (e.ecoBP || 0) + (e.ecoBM || 0);
                });

                const rejectCoefValue = (totalNetForReject + totalEcoBForReject) > 0
                  ? (totalEcoBForReject / (totalNetForReject + totalEcoBForReject)) * 100
                  : 0;

                // --- PAGE 1: HEADER & KPIs ---
                // Header block
                doc.setFillColor(15, 23, 42); // slate-900
                doc.rect(0, 0, pageWidth, 26, 'F');

                doc.setTextColor(255, 255, 255);
                doc.setFontSize(12);
                doc.setFont('helvetica', 'bold');
                doc.text("MANUPACKAGING - GEST√ÉO E CONTROLE DE PRODU√á√ÉO", 12, 10);
                doc.setFontSize(8.5);
                doc.setFont('helvetica', 'normal');
                doc.text("RELAT√ìRIO INDIVIDUAL DE DESEMPENHO E M√âTRICAS OPERACIONAIS", 12, 16);
                doc.setFont('helvetica', 'bold');
                doc.text(`OPERADOR: ${operatorName.toUpperCase()}`, 12, 21);

                // Date/Time
                doc.setTextColor(15, 23, 42);
                doc.setFontSize(8);
                doc.setFont('helvetica', 'bold');
                const pStart = biStartDate ? biStartDate.split('-').reverse().join('/') : 'In√≠cio';
                const pEnd = biEndDate ? biEndDate.split('-').reverse().join('/') : 'Fim';
                doc.text(`Filtros Ativos - Per√≠odo: ${pStart} at√© ${pEnd}`, 12, 33);
                doc.text(`Registros analisados: ${opDataList.length} lan√ßamentos`, 12, 37);

                doc.setFontSize(8);
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(100, 116, 139);
                doc.text(`Emitido em: ${nowFull}`, pageWidth - 12, 33, { align: 'right' });

                // Divider line
                doc.setDrawColor(226, 232, 240);
                doc.line(12, 41, pageWidth - 12, 41);

                // Section 1: KPI Cards Grid
                doc.setTextColor(15, 23, 42);
                doc.setFontSize(10);
                doc.setFont('helvetica', 'bold');
                doc.text("1. M√âTRICAS PRINCIPAIS (RESUMO EXECUTIVO)", 12, 47);

                // Draw 4 boxes for KPIs
                const cardWidth = (pageWidth - 24 - 9) / 4; // 4 cards, 3 gaps of 3mm
                const cardHeight = 18;
                const cardY = 51;

                const kpiList = [
                  { label: "PRODU√á√ÉO L√çQUIDA", value: formatWeight(prod), color: [79, 70, 229] }, // indigo
                  { label: "RES√çDUOS TOTAIS", value: formatWeight(wastes), color: [225, 29, 72] }, // rose
                  { label: "TEMPO PARADO", value: formatMinutes(stopsTotal), color: [217, 119, 6] }, // amber
                  { label: "COEF. DE REJEITO", value: `${rejectCoefValue.toFixed(2)}%`, color: [220, 38, 38] } // red
                ];

                kpiList.forEach((kpi, index) => {
                  const cardX = 12 + index * (cardWidth + 3);
                  // Draw card background
                  doc.setFillColor(248, 250, 252); // slate-50
                  doc.rect(cardX, cardY, cardWidth, cardHeight, 'F');
                  // Left accent border
                  doc.setFillColor(kpi.color[0], kpi.color[1], kpi.color[2]);
                  doc.rect(cardX, cardY, 1.5, cardHeight, 'F');
                  // Card stroke
                  doc.setDrawColor(226, 232, 240);
                  doc.rect(cardX, cardY, cardWidth, cardHeight, 'D');

                  // Text inside
                  doc.setFontSize(7);
                  doc.setFont('helvetica', 'bold');
                  doc.setTextColor(100, 116, 139);
                  doc.text(kpi.label, cardX + 4, cardY + 6);

                  doc.setFontSize(10);
                  doc.setFont('helvetica', 'bold');
                  doc.setTextColor(15, 23, 42);
                  doc.text(kpi.value, cardX + 4, cardY + 13);
                });

                // Section 2: Gr√°fico 1 - Balan√ßo de Massa
                doc.setFontSize(10);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(15, 23, 42);
                doc.text("2. BALAN√áO DE PRODU√á√ÉO E RES√çDUOS", 12, 78);

                // We will draw a horizontal bar chart comparing Production with Waste
                const chartY = 83;
                const maxVal = Math.max(prod, wastes, 1);
                
                // Labels & Bars
                const barMaxWidth = 110;
                const pWidth = (prod / maxVal) * barMaxWidth;
                const wWidth = (wastes / maxVal) * barMaxWidth;

                // Production Bar
                doc.setFontSize(8);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(71, 85, 105);
                doc.text("Produ√ß√£o L√≠quida kg/t", 12, chartY + 5);
                // Background bar
                doc.setFillColor(241, 245, 249);
                doc.rect(50, chartY + 1, barMaxWidth, 5, 'F');
                // Fill bar
                doc.setFillColor(79, 70, 229); // indigo
                doc.rect(50, chartY + 1, pWidth, 5, 'F');
                // Label value
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(15, 23, 42);
                doc.text(formatWeight(prod), 50 + barMaxWidth + 3, chartY + 5);

                // Waste Bar
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(71, 85, 105);
                doc.text("Res√≠duos Totais (kg)", 12, chartY + 13);
                // Background bar
                doc.setFillColor(241, 245, 249);
                doc.rect(50, chartY + 9, barMaxWidth, 5, 'F');
                // Fill bar
                doc.setFillColor(225, 29, 72); // rose
                doc.rect(50, chartY + 9, wWidth, 5, 'F');
                // Label value
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(15, 23, 42);
                doc.text(formatWeight(wastes), 50 + barMaxWidth + 3, chartY + 13);

                // Explanation Block for Chart 1
                doc.setFillColor(248, 250, 252);
                doc.rect(12, chartY + 18, pageWidth - 24, 18, 'F');
                doc.setDrawColor(226, 232, 240);
                doc.rect(12, chartY + 18, pageWidth - 24, 18, 'D');

                doc.setFontSize(7.5);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(15, 23, 42);
                doc.text("Explica√ß√£o do Gr√°fico (Balan√ßo de Massa):", 16, chartY + 23);
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(71, 85, 105);
                const desc1 = "Este gr√°fico compara a massa l√≠quida embalada contra o total de res√≠duos gerados pelo operador. O objetivo operacional √© maximizar a barra de Produ√ß√£o L√≠quida e encolher a barra de Res√≠duos. O equil√≠brio adequado reflete processos est√°veis, menor gera√ß√£o de borra e poucas paradas por quebra de filme.";
                const splitDesc1 = doc.splitTextToSize(desc1, pageWidth - 32);
                doc.text(splitDesc1, 16, chartY + 27);


                // Section 3: Gr√°fico 2 - Detalhamento de Descartes
                doc.setFontSize(10);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(15, 23, 42);
                doc.text("3. DETALHAMENTO DE DESCARTE DE RES√çDUOS (kg/t)", 12, 126);

                const chart2Y = 131;
                const maxWasteVal = Math.max(ecoA, ecoBP, ecoBM, borra, 1);
                const categories = [
                  { label: "Envio Eco A (Sede)", val: ecoA, fill: [59, 130, 246] }, // blue
                  { label: "Eco B Produ√ß√£o", val: ecoBP, fill: [245, 158, 11] }, // amber
                  { label: "Eco B Manuten√ß√£o", val: ecoBM, fill: [239, 68, 68] }, // red
                  { label: "Res√≠duo Borra", val: borra, fill: [100, 116, 139] } // slate
                ];

                categories.forEach((cat, idx) => {
                  const itemY = chart2Y + idx * 8;
                  const catWidth = (cat.val / maxWasteVal) * barMaxWidth;

                  doc.setFontSize(8);
                  doc.setFont('helvetica', 'bold');
                  doc.setTextColor(71, 85, 105);
                  doc.text(cat.label, 12, itemY + 5);

                  // Background bar
                  doc.setFillColor(241, 245, 249);
                  doc.rect(50, itemY + 1, barMaxWidth, 4, 'F');
                  // Fill bar
                  doc.setFillColor(cat.fill[0], cat.fill[1], cat.fill[2]);
                  doc.rect(50, itemY + 1, catWidth, 4, 'F');
                  // Value label
                  doc.setFont('helvetica', 'bold');
                  doc.setTextColor(15, 23, 42);
                  doc.text(formatWeight(cat.val), 50 + barMaxWidth + 3, itemY + 5);
                });

                // Explanation Block for Chart 2
                doc.setFillColor(248, 250, 252);
                doc.rect(12, chart2Y + 34, pageWidth - 24, 18, 'F');
                doc.setDrawColor(226, 232, 240);
                doc.rect(12, chart2Y + 34, pageWidth - 24, 18, 'D');

                doc.setFontSize(7.5);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(15, 23, 42);
                doc.text("Explica√ß√£o do Gr√°fico (Detalhamento de Res√≠duos):", 16, chart2Y + 39);
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(71, 85, 105);
                const desc2 = "Este gr√°fico divide os descartes gerados em quatro categorias principais. Res√≠duos Eco B originados em Manuten√ß√£o apontam perdas no momento do setup ou trocas de especifica√ß√£o. Eco B em Produ√ß√£o aponta inconst√¢ncias no fluxo corrido. J√° a Borra quantifica perdas na limpeza do cabe√ßote ou purgas.";
                const splitDesc2 = doc.splitTextToSize(desc2, pageWidth - 32);
                doc.text(splitDesc2, 16, chart2Y + 43);

                // Footer for Page 1
                doc.setFontSize(7.5);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(148, 163, 184);
                doc.text("P√°gina 1 de 2", pageWidth / 2, pageHeight - 10, { align: 'center' });


                // --- PAGE 2: TIMETABLE & STOPPAGE BREAKDOWN & STOPS CHART ---
                doc.addPage();

                // Page 2 header band
                doc.setFillColor(15, 23, 42);
                doc.rect(0, 0, pageWidth, 16, 'F');
                doc.setTextColor(255, 255, 255);
                doc.setFontSize(10);
                doc.setFont('helvetica', 'bold');
                doc.text(`DESEMPENHO INDIVIDUAL ‚Äî OPERADOR: ${operatorName.toUpperCase()}`, 12, 10.5);

                doc.setFontSize(10);
                doc.setTextColor(15, 23, 42);
                doc.setFont('helvetica', 'bold');
                doc.text("4. DISTRIBUI√á√ÉO E AN√ÅLISE DE TEMPO DE PARADAS (min)", 12, 26);

                const chart3Y = 31;
                const maxStopsVal = Math.max(manut, proc, outros, 1);
                const stopCategories = [
                  { label: "Tempo Manuten√ß√£o", val: manut, fill: [239, 68, 68] }, // red
                  { label: "Tempo Processo", val: proc, fill: [245, 158, 11] }, // amber
                  { label: "Tempo Outros", val: outros, fill: [100, 116, 139] } // slate
                ];

                stopCategories.forEach((cat, idx) => {
                  const itemY = chart3Y + idx * 8;
                  const catWidth = (cat.val / maxStopsVal) * barMaxWidth;

                  doc.setFontSize(8);
                  doc.setFont('helvetica', 'bold');
                  doc.setTextColor(71, 85, 105);
                  doc.text(cat.label, 12, itemY + 5);

                  // Background bar
                  doc.setFillColor(241, 245, 249);
                  doc.rect(50, itemY + 1, barMaxWidth, 4, 'F');
                  // Fill bar
                  doc.setFillColor(cat.fill[0], cat.fill[1], cat.fill[2]);
                  doc.rect(50, itemY + 1, catWidth, 4, 'F');
                  // Value label
                  doc.setFont('helvetica', 'bold');
                  doc.setTextColor(15, 23, 42);
                  doc.text(formatMinutes(cat.val), 50 + barMaxWidth + 3, itemY + 5);
                });

                // Explanation Block for Chart 3
                doc.setFillColor(248, 250, 252);
                doc.rect(12, chart3Y + 26, pageWidth - 24, 18, 'F');
                doc.setDrawColor(226, 232, 240);
                doc.rect(12, chart3Y + 26, pageWidth - 24, 18, 'D');

                doc.setFontSize(7.5);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(15, 23, 42);
                doc.text("Explica√ß√£o do Gr√°fico (Tempo de Paradas):", 16, chart3Y + 31);
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(71, 85, 105);
                const desc3 = "Este gr√°fico divide o tempo ocioso da m√°quina. Manuten√ß√£o retrata problemas mec√¢nicos/el√©tricos no equipamento. Processo engloba tarefas inerentes da rotina, como setups, regulagens e trocas de bobinas. Outros engloba problemas externos de suporte. Permite identificar se o tempo inativo √© t√©cnico ou operacional.";
                const splitDesc3 = doc.splitTextToSize(desc3, pageWidth - 32);
                doc.text(splitDesc3, 16, chart3Y + 35);


                // Section 5: Detailed Support Table
                doc.setFontSize(10);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(15, 23, 42);
                doc.text("5. TABELA COMPLETA DE M√âTRICAS INDIVIDUAIS", 12, 85);

                const tableHead = [['M√âTRICA DE DESEMPENHO', 'VALOR REGISTRADO', 'M√âTODO DE C√ÅLCULO / ESPECIFICA√á√ÉO']];
                const tableBody = [
                  ['Produ√ß√£o L√≠quida kg/t', formatWeight(prod), 'Soma do peso l√≠quido embalado (Kg ou T)'],
                  ['Envio Eco A (Sede Curitiba)', formatWeight(ecoA), 'Res√≠duo de filme limpo enviado para a sede'],
                  ['Eco B Produ√ß√£o', formatWeight(ecoBP), 'Apara limpa de filme gerada durante a opera√ß√£o normal'],
                  ['Eco B Manuten√ß√£o', formatWeight(ecoBM), 'Apara de filme limpo gerada em paradas ou manuten√ß√£o'],
                  ['Res√≠duo Borra', formatWeight(borra), 'Res√≠duo s√≥lido purgado do cabe√ßote da extrusora'],
                  ['Tempo Manuten√ß√£o', formatMinutes(manut), 'Minutos de parada por falhas t√©cnicas/mec√¢nicas'],
                  ['Tempo Processo', formatMinutes(proc), 'Minutos de parada por setups, ajustes e trocas'],
                  ['Tempo Outros', formatMinutes(outros), 'Minutos de parada por motivos diversos/limpeza'],
                  ['Res√≠duos Totais', formatWeight(wastes), 'Soma de Eco B Produ√ß√£o + Eco B Manuten√ß√£o + Borra'],
                  ['Paradas Totais', formatMinutes(stopsTotal), 'Tempo inativo somado de todas as paradas registradas'],
                  ['Coeficiente de Rejeito', `${rejectCoefValue.toFixed(2)}%`, 'Percentual de Res√≠duo Eco B em rela√ß√£o √† produ√ß√£o total']
                ];

                autoTable(doc, {
                  startY: 89,
                  head: tableHead,
                  body: tableBody,
                  theme: 'striped',
                  headStyles: {
                    fillColor: [15, 23, 42],
                    textColor: [255, 255, 255],
                    fontSize: 8,
                    fontStyle: 'bold'
                  },
                  styles: {
                    fontSize: 7.5,
                    cellPadding: 3
                  },
                  columnStyles: {
                    0: { fontStyle: 'bold', cellWidth: 55 },
                    1: { fontStyle: 'bold', halign: 'left', cellWidth: 35 },
                    2: { textColor: [100, 116, 139] }
                  }
                });

                // Signatures / Footer for Page 2
                const finalY = (doc as any).lastAutoTable.finalY || 180;
                
                // Add signature placeholders at the bottom of page 2
                const sigY = pageHeight - 35;
                doc.setDrawColor(203, 213, 225);
                doc.line(20, sigY, 85, sigY);
                doc.line(125, sigY, 190, sigY);

                doc.setFontSize(7.5);
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(71, 85, 105);
                doc.text(operatorName.toUpperCase(), 52.5, sigY + 4, { align: 'center' });
                doc.text("Assinatura do Operador", 52.5, sigY + 8, { align: 'center' });

                doc.text("SUPERVIS√ÉO DE PRODU√á√ÉO", 157.5, sigY + 4, { align: 'center' });
                doc.text("Manupackaging Brasil", 157.5, sigY + 8, { align: 'center' });

                doc.setFontSize(7.5);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(148, 163, 184);
                doc.text("P√°gina 2 de 2", pageWidth / 2, pageHeight - 10, { align: 'center' });

                setPdfModal({
                  isOpen: true,
                  doc,
                  filename: `Relatorio_Metricas_${operatorName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`,
                  title: `Relat√≥rio de M√©tricas - Operador: ${operatorName}`
                });
              };

              const isAnyFilterActive = biMachineFilter !== 'all' || biOperatorFilter !== 'all' || biShiftFilter !== 'all' || biStartDate !== '' || biEndDate !== '';

              return (
                <div className="space-y-8 animate-in cubic-bezier(0.4, 0, 0.2, 1) duration-300">
                  {/* power bi interactive cross-filters panel */}
                  <div className="bg-slate-900 text-white rounded-[2rem] p-6 shadow-xl border border-slate-800 space-y-6 no-print transition-all duration-300">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-emerald-500/20 text-emerald-400 rounded-xl flex items-center justify-center border border-emerald-500/30">
                          <LayoutDashboard size={20} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-black text-slate-100 uppercase tracking-wider leading-none">Power BI Cross-Filters</h3>
                            <span className="bg-emerald-500 text-[8px] text-slate-950 font-black px-1.5 py-0.5 rounded uppercase tracking-widest animate-pulse">Ativo</span>
                          </div>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Slicers integrados: mude qualquer filtro para recalcular todas as m√©tricas</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-start sm:self-auto">
                        <button 
                          onClick={() => setIsWeeklySummaryOpen(true)}
                          className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white border border-blue-400/30 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center gap-2 transition-all shadow-md active:scale-95 cursor-pointer"
                          title="Gerar Resumo Geral Semanal para Reuni√£o de Resultados"
                        >
                          <Tv size={13} className="text-amber-300 animate-pulse" />
                          <span>Resumo Semanal (Reuni√£o)</span>
                        </button>

                        {isAnyFilterActive && (
                          <button 
                            onClick={clearBiFilters}
                            className="px-4 py-2 bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500 hover:text-white rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 transition-all active:scale-95"
                          >
                            <RotateCcw size={12} className="animate-spin-slow" />
                            Limpar Filtros
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      {/* Slicer: Machine */}
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Filtrar Equipamento</label>
                        <select 
                          value={biMachineFilter} 
                          onChange={(e) => setBiMachineFilter(e.target.value)}
                          className="w-full bg-slate-800/80 border border-slate-700/80 rounded-xl px-3 py-2.5 text-[11px] font-bold text-slate-200 outline-none focus:ring-2 focus:ring-emerald-500 transition-all cursor-pointer uppercase tracking-wider"
                        >
                          <option value="all">‚ö° Todos Equipamentos</option>
                          <option value="cast 1">üéüÔ∏è Cast 1 (Extrusora)</option>
                          <option value="cast 2">üéüÔ∏è Cast 2 (Extrusora)</option>
                          <option value="erema">üîã Erema (Reciclador)</option>
                        </select>
                      </div>

                      {/* Slicer: Operator */}
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Filtrar Operador</label>
                        <select 
                          value={biOperatorFilter} 
                          onChange={(e) => setBiOperatorFilter(e.target.value)}
                          className="w-full bg-slate-800/80 border border-slate-700/80 rounded-xl px-3 py-2.5 text-[11px] font-bold text-slate-200 outline-none focus:ring-2 focus:ring-emerald-500 transition-all cursor-pointer uppercase tracking-wider"
                        >
                          <option value="all">üë§ Todos Operadores</option>
                          {biOperatorsList.map(op => (
                            <option key={op} value={op}>üë§ {op}</option>
                          ))}
                        </select>
                      </div>

                      {/* Slicer: Shift */}
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Filtrar Turno</label>
                        <select 
                          value={biShiftFilter} 
                          onChange={(e) => setBiShiftFilter(e.target.value)}
                          className="w-full bg-slate-800/80 border border-slate-700/80 rounded-xl px-3 py-2.5 text-[11px] font-bold text-slate-200 outline-none focus:ring-2 focus:ring-emerald-500 transition-all cursor-pointer uppercase tracking-wider"
                        >
                          <option value="all">üïí Todos os Turnos</option>
                          {biShiftsList.map(sh => (
                            <option key={sh} value={sh}>üïí {sh}</option>
                          ))}
                        </select>
                      </div>

                      {/* Slicer: Sub-Date Period */}
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Per√≠odo (In√≠cio / Fim)</label>
                        <div className="grid grid-cols-2 gap-2">
                          <input 
                            type="date"
                            value={biStartDate}
                            onChange={(e) => setBiStartDate(e.target.value)}
                            className="bg-slate-800/80 border border-slate-700/80 rounded-xl px-3 py-2 text-[10px] font-bold text-slate-200 outline-none focus:ring-2 focus:ring-emerald-500 transition-all cursor-pointer"
                          />
                          <input 
                            type="date"
                            value={biEndDate}
                            onChange={(e) => setBiEndDate(e.target.value)}
                            className="bg-slate-800/80 border border-slate-700/80 rounded-xl px-3 py-2 text-[10px] font-bold text-slate-200 outline-none focus:ring-2 focus:ring-emerald-500 transition-all cursor-pointer"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* interactive kpis cards grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 animate-in fade-in duration-500">
                    {/* KPI 1: Produ√ß√£o L√≠quida Cast */}
                    <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100 flex flex-col justify-between transition-all duration-300 hover:shadow-md border-t-4 border-t-emerald-500">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Produ√ß√£o L√≠quida Cast</span>
                          <span className="p-2 bg-emerald-50 text-emerald-600 rounded-xl"><Package size={16} /></span>
                        </div>
                        <h4 className="text-2xl font-black text-slate-800 tracking-tight leading-none pt-2">{formatWeight(totalNetCast)}</h4>
                      </div>
                      <div className="mt-4 pt-3 border-t border-slate-50 flex items-center justify-between text-[10px] text-slate-500">
                        <span className="font-bold">Erema (Reciclado):</span>
                        <span className="font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg">{formatWeight(totalNetErema)}</span>
                      </div>
                    </div>

                    {/* KPI 2: Coeficiente de Rejeito (Eco B) */}
                    <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100 flex flex-col justify-between transition-all duration-300 hover:shadow-md border-t-4 border-t-red-500">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">√çndice Rejeito Coef. Eco B</span>
                          <span className="p-2 bg-rose-50 text-rose-500 rounded-xl"><TrendingDown size={16} /></span>
                        </div>
                        <h4 className="text-2xl font-black text-slate-800 tracking-tight leading-none pt-2">{rejectCoef.toFixed(2)}%</h4>
                      </div>
                      <div className="mt-4">
                        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                          <div 
                            className={`h-full transition-all duration-500 ${rejectCoef < 5 ? 'bg-emerald-500' : rejectCoef < 10 ? 'bg-amber-500' : 'bg-red-500'}`}
                            style={{ width: `${Math.min(100, rejectCoef * 5)}%` }}
                          />
                        </div>
                        <p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest mt-1 text-right">Meta Tolera: Max 5,0%</p>
                      </div>
                    </div>

                    {/* KPI 3: Gera√ß√£o de Eco A (Envio Sede) */}
                    <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100 flex flex-col justify-between transition-all duration-300 hover:shadow-md border-t-4 border-t-blue-500">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Envio Eco A (Sede Curitiba)</span>
                          <span className="p-2 bg-blue-50 text-blue-500 rounded-xl"><Scale size={16} /></span>
                        </div>
                        <h4 className="text-2xl font-black text-slate-800 tracking-tight leading-none pt-2">{formatWeight(totalEcoA)}</h4>
                      </div>
                      <div className="mt-4 pt-3 border-t border-slate-50 flex items-center justify-between text-[10px] text-slate-500">
                        <span className="font-bold">Em rela√ß√£o √† extru:</span>
                        <span className="font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-lg">{totalNetCast > 0 ? ((totalEcoA / totalNetCast) * 100).toFixed(1) : '0'}%</span>
                      </div>
                    </div>

                    {/* KPI 4: Disponibilidade de Tempo (%) */}
                    <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100 flex flex-col justify-between transition-all duration-300 hover:shadow-md border-t-4 border-t-violet-500">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Disponibilidade Ativa (OEE)</span>
                          <span className="p-2 bg-violet-50 text-violet-500 rounded-xl"><Clock size={16} /></span>
                        </div>
                        <h4 className="text-2xl font-black text-slate-800 tracking-tight leading-none pt-2">{availabilityPct.toFixed(1)}%</h4>
                      </div>
                      <div className="mt-4 pt-3 border-t border-slate-50 flex items-center justify-between text-[10px] text-slate-500">
                        <span className="font-bold">Tempo Parado:</span>
                        <span className="font-black text-violet-600 bg-violet-50 px-2 py-0.5 rounded-lg">{formatMinutes(totalDowntimeMinutes)}</span>
                      </div>
                    </div>
                  </div>

                  {/* matrix of bi charts */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Chart 1: Composed Chart (Line + Stacked Bar) - Tempo vs Prod */}
                    <div id="bi-chart-composed" className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-150 flex flex-col min-h-[420px] hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-50">
                        <div>
                          <h4 className="text-xs font-black uppercase text-slate-800 tracking-wider">Evolu√ß√£o de Perdas vs Produ√ß√£o L√≠quida</h4>
                          <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Barras (Eco B P+M + Borra) vs Linha de Produ√ß√£o (Eixo Secund√°rio)</p>
                        </div>
                        <div className="flex gap-1">
                          <button 
                            onClick={() => downloadChartAsPNG('bi-chart-composed', 'Evolu√ß√£o de Perdas vs Produ√ß√£o L√≠quida')}
                            className="p-1.5 text-slate-350 hover:text-emerald-500 hover:bg-emerald-50/50 rounded-lg transition-all"
                            title="Baixar Imagem"
                          >
                            <Download size={15} />
                          </button>
                          <button 
                            onClick={() => setFullscreenChart('bi-chart-composed')}
                            className="p-1.5 text-slate-350 hover:text-indigo-500 hover:bg-indigo-50/50 rounded-lg transition-all"
                            title="Visualizar em Tela Cheia"
                          >
                            <Maximize2 size={15} />
                          </button>
                        </div>
                      </div>
                      <div className="flex-1 min-h-[300px]">
                        {dailyTrendData.length > 0 ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={dailyTrendData} margin={{ top: 10, right: 10, left: -25, bottom: 5 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                              <XAxis dataKey="label" stroke="#94a3b8" style={{ fontSize: 9, fontWeight: 'bold' }} />
                              <YAxis stroke="#475569" style={{ fontSize: 9, fontWeight: 'bold' }} unit=" kg" />
                              <YAxis yAxisId="right" orientation="right" stroke="#10b981" style={{ fontSize: 9, fontWeight: 'bold' }} unit=" kg" />
                              <RechartsTooltip shared={false} content={<BiComposedTooltip formatWeight={formatWeight} />} cursor={false} />
                              <Legend iconType="circle" wrapperStyle={{ fontSize: 9, fontWeight: 'bold', paddingTop: 10 }} />
                              <Bar dataKey="ecoBP" name="Eco B Produ√ß√£o" stackId="loss" fill="#3b82f6" />
                              <Bar dataKey="ecoBM" name="Eco B Manuten√ß√£o" stackId="loss" fill="#8b5cf6" />
                              <Bar dataKey="borra" name="Res√≠duo Borra" stackId="loss" fill="#f43f5e" />
                              <Line yAxisId="right" type="monotone" dataKey="prod" name="Produ√ß√£o L√≠quida" stroke="#10b981" strokeWidth={3} dot={<CustomBiDot />} activeDot={false} />
                            </ComposedChart>
                          </ResponsiveContainer>
                        ) : (
                          <div className="h-full flex items-center justify-center text-slate-300 font-bold text-[10px] uppercase">Sem dados para o per√≠odo</div>
                        )}
                      </div>
                    </div>

                    {/* Chart 2: Scatter / Bubble Chart - Operator vs Efficiency */}
                    <div id="bi-chart-scatter" className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-150 flex flex-col min-h-[420px] hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-50">
                        <div>
                          <h4 className="text-xs font-black uppercase text-slate-800 tracking-wider">Dispers√£o: Produ√ß√£o vs Res√≠duos Operador</h4>
                          <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">X = Produ√ß√£o (kg) | Y = Res√≠duos (kg) | Tamanho = Paradas de Processo (min)</p>
                        </div>
                        <div className="flex gap-1">
                          <button 
                            onClick={() => downloadChartAsPNG('bi-chart-scatter', 'Dispers√£o Performance Operador')}
                            className="p-1.5 text-slate-350 hover:text-emerald-500 hover:bg-emerald-50/50 rounded-lg transition-all"
                            title="Baixar Imagem"
                          >
                            <Download size={15} />
                          </button>
                          <button 
                            onClick={() => setFullscreenChart('bi-chart-scatter')}
                            className="p-1.5 text-slate-350 hover:text-indigo-500 hover:bg-indigo-50/50 rounded-lg transition-all"
                            title="Visualizar em Tela Cheia"
                          >
                            <Maximize2 size={15} />
                          </button>
                        </div>
                      </div>
                      <div className="flex-1 min-h-[300px]">
                        {scatterData.length > 0 ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <ScatterChart margin={{ top: 15, right: 15, bottom: 10, left: -25 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                              <XAxis type="number" dataKey="prod" name="Produ√ß√£o L√≠quida" unit=" kg" stroke="#94a3b8" style={{ fontSize: 9, fontWeight: 'bold' }} />
                              <YAxis type="number" dataKey="wastes" name="Desperd√≠cio Total" unit=" kg" stroke="#475569" style={{ fontSize: 9, fontWeight: 'bold' }} />
                              <ZAxis type="number" dataKey="stopsProcess" range={[50, 450]} name="Ajuste Processo" unit=" min" />
                              <RechartsTooltip 
                                cursor={{ strokeDasharray: '3 3' }}
                                content={({ active, payload }: any) => {
                                  if (active && payload && payload.length) {
                                    const item = payload[0].payload;
                                    return (
                                      <div className="bg-slate-900 text-white rounded-2xl p-4 shadow-xl border border-slate-700 text-[10px] space-y-1 font-semibold">
                                        <p className="font-extrabold uppercase tracking-wider text-emerald-400 border-b border-slate-800 pb-1.5 mb-1.5">{item.name}</p>
                                        <p>üèÜ Produ√ß√£o: <span className="font-black text-slate-100">{formatWeight(item.prod)}</span></p>
                                        <p>üóëÔ∏è Res√≠duos: <span className="font-black text-slate-100">{formatWeight(item.wastes)}</span></p>
                                        <p>‚è±Ô∏è Paradas Processo: <span className="font-black text-slate-100">{item.stopsProcess} min</span></p>
                                      </div>
                                    );
                                  }
                                  return null;
                                }}
                              />
                              <Legend iconType="circle" wrapperStyle={{ fontSize: 9, fontWeight: 'bold', paddingTop: 10 }} />
                              {scatterData.map((entry, index) => (
                                <Scatter 
                                  key={index} 
                                  name={entry.name} 
                                  data={[entry]} 
                                  fill={entry.color} 
                                  onClick={() => handleOpenDrilldown('operator', entry.name)}
                                  className="cursor-zoom-in"
                                />
                              ))}
                            </ScatterChart>
                          </ResponsiveContainer>
                        ) : (
                          <div className="h-full flex items-center justify-center text-slate-300 font-bold text-[10px] uppercase">Sem dados para an√°lise</div>
                        )}
                      </div>
                    </div>

                    {/* Chart 3: Proportional 100% Stacked Bar (Timestops) */}
                    <div id="bi-chart-stacked" className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-150 flex flex-col min-h-[420px] hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-50">
                        <div>
                          <h4 className="text-xs font-black uppercase text-slate-800 tracking-wider">Breakdown Proporcional de Paradas (100%)</h4>
                          <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Exibe a distribui√ß√£o interna de motivos de inatividade</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {/* Slicing trigger: Group By SFT / EQP */}
                          <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                            <button 
                              type="button"
                              onClick={() => setStackedGroupBy('machine')}
                              className={`px-2.5 py-1 rounded-md text-[8px] font-black uppercase tracking-wider transition-all ${stackedGroupBy === 'machine' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
                            >
                              M√°quinas
                            </button>
                            <button 
                              type="button"
                              onClick={() => setStackedGroupBy('operator')}
                              className={`px-2.5 py-1 rounded-md text-[8px] font-black uppercase tracking-wider transition-all ${stackedGroupBy === 'operator' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
                            >
                              Operador
                            </button>
                          </div>
                          
                          <div className="flex gap-1">
                            <button 
                              onClick={() => downloadChartAsPNG('bi-chart-stacked', 'Distribui√ß√£o Proporcional de Paradas')}
                              className="p-1.5 text-slate-350 hover:text-emerald-500 hover:bg-emerald-50/50 rounded-lg transition-all"
                              title="Baixar Imagem"
                            >
                              <Download size={15} />
                            </button>
                            <button 
                              onClick={() => setFullscreenChart('bi-chart-stacked')}
                              className="p-1.5 text-slate-350 hover:text-indigo-500 hover:bg-indigo-50/50 rounded-lg transition-all"
                              title="Visualizar em Tela Cheia"
                            >
                              <Maximize2 size={15} />
                            </button>
                          </div>
                        </div>
                      </div>
                      <div className="h-[300px] w-full">
                        {proportionalStopsData.length > 0 ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={proportionalStopsData} margin={{ top: 10, right: 10, left: -25, bottom: 5 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                              <XAxis dataKey="name" stroke="#94a3b8" style={{ fontSize: 9, fontWeight: 'bold' }} />
                              <YAxis tickFormatter={(tick) => `${tick}%`} stroke="#475569" style={{ fontSize: 9, fontWeight: 'bold' }} />
                              <RechartsTooltip formatter={(val) => `${val}%`} />
                              <Legend iconType="rect" wrapperStyle={{ fontSize: 9, fontWeight: 'bold', paddingTop: 10 }} />
                              <Bar dataKey="manutPct" name="Parada Manuten√ß√£o" stackId="stops-pct" fill="#ef4444" unit="%" />
                              <Bar dataKey="procPct" name="Parada Processo" stackId="stops-pct" fill="#f59e0b" unit="%" />
                              <Bar dataKey="outrosPct" name="Outras Paradas" stackId="stops-pct" fill="#64748b" unit="%" />
                            </BarChart>
                          </ResponsiveContainer>
                        ) : (
                          <div className="h-full flex items-center justify-center text-slate-300 font-bold text-[10px] uppercase">Sem inatividades registradas</div>
                        )}
                      </div>
                    </div>

                    {/* Chart 4: Mass Balance Donut (Eco B vs Recycled Output) */}
                    <div id="bi-chart-donut" className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-150 flex flex-col min-h-[420px] hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-50">
                        <div>
                          <h4 className="text-xs font-black uppercase text-slate-800 tracking-wider">Balan√ßo de Massa: Res√≠duo vs Reciclado</h4>
                          <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Rela√ß√£o direta de mat√©ria coletada na extrusura vs reprocessada no Erema</p>
                        </div>
                        <div className="flex gap-1">
                          <button 
                            onClick={() => downloadChartAsPNG('bi-chart-donut', 'Balan√ßo de Massa Residuo vs Reciclado')}
                            className="p-1.5 text-slate-350 hover:text-emerald-500 hover:bg-emerald-50/50 rounded-lg transition-all"
                            title="Baixar Imagem"
                          >
                            <Download size={15} />
                          </button>
                          <button 
                            onClick={() => setFullscreenChart('bi-chart-donut')}
                            className="p-1.5 text-slate-350 hover:text-indigo-500 hover:bg-indigo-50/50 rounded-lg transition-all"
                            title="Visualizar em Tela Cheia"
                          >
                            <Maximize2 size={15} />
                          </button>
                        </div>
                      </div>
                      <div className="flex-1 min-h-[300px] flex flex-col justify-between">
                        <div className="flex-1 min-h-[240px]">
                          {massBalanceData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie 
                                  data={massBalanceData} 
                                  cx="50%" 
                                  cy="50%" 
                                  innerRadius={65} 
                                  outerRadius={90} 
                                  dataKey="value"
                                  nameKey="name"
                                  label={renderCustomizedLabel} 
                                  paddingAngle={3}
                                >
                                  <Cell fill="#f59e0b" stroke="none" />
                                  <Cell fill="#10b981" stroke="none" />
                                </Pie>
                                <RechartsTooltip formatter={(val: any) => formatWeight(Number(val))} />
                                <Legend iconType="circle" wrapperStyle={{ fontSize: 9, fontWeight: 'bold' }} />
                              </PieChart>
                            </ResponsiveContainer>
                          ) : (
                            <div className="h-full flex items-center justify-center text-slate-300 font-bold text-[10px] uppercase">Sem descartes coletados</div>
                          )}
                        </div>
                        <div className="bg-slate-50 rounded-2xl p-3 text-[10px] leading-relaxed text-slate-600 border border-slate-100 flex items-center gap-2 font-medium">
                          <Info size={14} className="text-blue-500 shrink-0" />
                          <span>
                            Diferencial de Reclaiming: <strong className="text-slate-800">{formatWeight(Math.abs(extruderEcoB - eremaRecycled))}</strong> 
                            {extruderEcoB > eremaRecycled ? ' gerados acima do reprocessado (Ac√∫mulo de estoque).' : ' reprocessados acima do volume descartado (Consumo de res√≠duos).'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* advanced feature: dynamic dimensions & metrics explorer */}
                  <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-150 space-y-6">
                    <div className="border-b border-slate-50 pb-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                          <Activity size={20} />
                        </div>
                        <div>
                          <h3 className="text-xs font-black text-slate-800 uppercase tracking-tight">Ranking e M√©tricas Din√¢micas</h3>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Defina o eixo de agrupamento e a m√©trica desejada para redesenhar o gr√°fico</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => setFullscreenChart('bi-chart-dynamic')}
                        className="p-1.5 text-slate-350 hover:text-indigo-500 hover:bg-indigo-50/50 rounded-lg transition-all border border-slate-100"
                        title="Visualizar em Tela Cheia"
                      >
                        <Maximize2 size={15} />
                      </button>
                    </div>

                    <div className="flex flex-wrap items-end gap-4 bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                      {/* Selector: Agrupar por */}
                      <div className="flex flex-col gap-1 min-w-[140px] flex-1 sm:flex-initial">
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Agrupar por (Dimens√£o)</span>
                        <select 
                          value={biDynamicGroup} 
                          onChange={(e: any) => setBiDynamicGroup(e.target.value)}
                          className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-[10px] font-black text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer uppercase tracking-wider h-[34px]"
                        >
                          <option value="operator">üë§ Operador</option>
                          <option value="machine">üéüÔ∏è Equipamento</option>
                          <option value="shift">üïí Turno</option>
                        </select>
                      </div>

                      {/* Selector: Metrica Principal */}
                      <div className="flex flex-col gap-1 min-w-[180px] flex-1 sm:flex-initial">
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">M√©trica Principal</span>
                        <select 
                          value={biDynamicMetric} 
                          onChange={(e) => setBiDynamicMetric(e.target.value)}
                          className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-[10px] font-black text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer uppercase tracking-wider h-[34px]"
                        >
                          {dynamicMetricsList.map(item => (
                            <option key={item.id} value={item.id}>{item.label}</option>
                          ))}
                        </select>
                      </div>

                      {/* Selector: Per√≠odo da Promo√ß√£o */}
                      <div className="flex flex-col gap-1 min-w-[120px] flex-1 sm:flex-initial">
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Per√≠odo da Promo√ß√£o</span>
                        <select 
                          value={promotionTimeframe} 
                          onChange={(e) => setPromotionTimeframe(e.target.value as any)}
                          className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-[10px] font-black text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer uppercase tracking-wider h-[34px]"
                        >
                          <option value="current">M√™s Atual</option>
                          <option value="2_months">2 Meses</option>
                          <option value="3_months">3 Meses</option>
                          <option value="6_months">6 Meses</option>
                          <option value="1_year">1 Ano</option>
                        </select>
                      </div>

                      {/* Selector: PDF por Operador */}
                      <div className="flex flex-col gap-1 min-w-[280px] flex-1 lg:flex-initial">
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">PDF por Operador</span>
                        <div className="flex gap-1.5 items-center">
                          <select 
                            id="individual-operator-pdf-select"
                            className="bg-white border border-slate-200 rounded-xl px-2 py-2 text-[10px] font-black text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer uppercase tracking-wider min-w-[120px] h-[34px]"
                            defaultValue=""
                          >
                            <option value="">Selecione...</option>
                            {biOperatorsList.map(op => (
                              <option key={op} value={op}>{op}</option>
                            ))}
                          </select>
                          <button
                            type="button"
                            onClick={() => {
                              const sel = document.getElementById('individual-operator-pdf-select') as HTMLSelectElement;
                              if (sel && sel.value) {
                                exportSingleOperatorPDF(sel.value);
                              } else {
                                alert('Por favor, selecione um operador na lista ao lado para baixar seu PDF exclusivo.');
                              }
                            }}
                            className="flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-xl px-3 py-2 text-[10px] font-black uppercase tracking-wider transition-all shadow-sm cursor-pointer h-[34px]"
                            title="Baixar PDF Exclusivo do Operador"
                          >
                            <FileText size={13} />
                            <span>Exclusivo</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="md:col-span-2 min-h-[300px]">
                        {dynamicChartData.length > 0 ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={dynamicChartData} layout="vertical" margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#f8fafc" />
                              <XAxis type="number" stroke="#94a3b8" style={{ fontSize: 9, fontWeight: 'bold' }} />
                              <YAxis type="category" dataKey="name" stroke="#475569" style={{ fontSize: 9, fontWeight: 'bold' }} />
                              <RechartsTooltip formatter={(val: any) => selectedMetricDef.formatter(val)} />
                              <Bar 
                                dataKey="value" 
                                fill="#4f46e5" 
                                radius={[0, 8, 8, 0]}
                                name={selectedMetricDef.label}
                                onClick={(data: any) => {
                                  if (biDynamicGroup === 'operator' || biDynamicGroup === 'machine' || biDynamicGroup === 'shift') {xúÏ}€n‹Hñ‡˚|E¥¶jîÍR¶R7ó¨ñ\–ÕnO[e¡Ru˜¨aåôdH…6ìÃ"ô∂Tj≥ÿáÿÏˆmÅûÍ]†—‘”`Å¡ºÍOÊf>aœâ$#»`fJ∂´ú®í3yâÎ9'Œ˝¸±¯ù–ËÛ1c?ºË]ÿ¯áW°3Ú›'q4/œIù\†Kø¯ãÊoüπi~ƒú$˘∫‹]p'q≈›Ô¢h‘ı√ÖÜW56}ÌÒ…ù8=ƒ©çúqßÛ∑Àƒ_"ªèH«bé;4»zµ{ÌﬂêsX∏›ÎÉÁœûø8}Èìœ	ˇ⁄hxë_›êïÊQ--5- Œ æ◊7ƒaÛ™{ngÂM∆Qò¯oÈA¶é“öÜó»vÌöÏx˛[uøÜ›Û	,Œy@/âü“Q“uiò“ò¸ní§˛˘ï¸ô“À¥õNJªÎ˝>9áëtQ‡Ò/W˚„ÀWd2”ÿu∫ËÎ€ˇë·Ì˜$p¬€?AWa%ƒ£dGﬁ‰ˆOx€çFc'Ω˝·-ıìùXÕ¥LÎ-ﬁ3‹Ω^˘9y·Ño»©Ô—ÅìC
$‰Á+∆K4∏”ﬁÏ@∞–£^wÌ2 „ÓD±k√ˇè≠‚Í‡j‚üÆŸJh˙é“p¡<Àrﬂ…ÿqi˜™ª^Ûº5‹T_R7ÑoS‡∏oÚΩQ∑ÚKl√m?ºËæÉ5ä=ª˝˛•l≥iBG@mÜ—Œ p≥vÜ°ØëësŸ¬Ä∂ÿà¢∑4>¢wpÀô§ÄCwµvvFÄ–
T¿ª¥¢l|úxó7ÍHÕ†/6LÇ¯*é|’]Ìm -T˜N∑ÂÌnøan∫•´Ë¬√Bñp.€Aã.†ÿêPÈÂ˙ı; ‡!¸œg˜'«ææBﬂ*‰®o¶ü·⁄í››]“'_ëE¿g4ÄeÿÏ˜Å,…õ´‚&ü¿FÒÊZ·Õ/˘Õ¸ÈıÕ˛‚ÕÎõG¨ß/»ÍÕŒ
NlöXH„IËB£Bﬂ!  Ñ.@€0GvÇ∂h˝∫x≥π,FÄrN≈ã‰Ø˛ Í§2 ÓˇjqÈGA#ﬁ(ç&iÖñOí^çëÚ±óöé¸ÖÅÔæŸΩÓ0å§ó„(NOÅ≤0éÖ-ƒ…·„N∂∫çgh˛)ì7?Ù¸ã®˚ màe[Ω∫≈âúò©ÖHÇ£8z›ºÏ…8ÚqÌÁñ˙iÄH≥Ô¯ópå¿<`~n0ÅS9BB˘ô4ØmÁeª}∞Åè˝Äû¡I‚„X]-ê0?Ä+X∞·\D{+|sÌûo8õÛè≈éZ∂UAVFè`bßL"ºNh@›îz«4ç}˜êû˜Œ£x‰§∞À‚ﬁ:¡@Œ£-FYœ64PœµT©¿8ÌÆÀ£&≠ú9ı‹¡∏ ‰ƒ>£¡ú‡è®ÁOF@i¿dP«C∆ ƒï,àI
G1'KDhÁixÈ°vî2îLÜ±æÈˆâä√pd4Ç3Põo'î–˘v‚81'é‚E‰"æ˝˛‹w#‚∏˛»!—Ñ0ZÏE1π˝GB|⁄s»ÿÅ«c
≥˝∞:"L™Í¢XÖHÌáNÍøı=«£IØv≥«ç[›˙¶Òñvê€M“hå3J@b …d4r‚+R#ÒÚ©Ü\\ OÔj`Ö5l0g∆›¸r-¶£WF68¬ÇøÎ&#PÄKIâd¿¶ô*3gzNòıÒ†ªaN;û´éÔ.∑¶¸¸Å•ä‡¯π`£`@ù˝ÃEàKô´∏Æ¢ëF|ﬂhú¯±{ÀÒn≠_+‘6—™R∏3\ØPòÀDe JÉg≥"âH—#ı/ÜÈ¬£ &\4|» û ÜzNB:'4æ˝!Ú¢%êD÷€<.È(;M4#Ba(I	–(†pøˆì	£|pë¿6PŸÍ&0ê~Ñ”X6¶~í≤ÔwI¨0(∏.ô¿eÑùk‡ã‡¸< ôxÔËH"t"‰cËÕÏß$l`j∂‚=O2î h`Ãgå Ç∫›Láp
5ú1i\ UFŸL9˝Ù‡π°OçÏ6åµphÉÙ€€\xÑ"Î Ÿ$AàNáç<:˙v‚èπŒƒˆïÁ‚x≥}˛ÃGπl_9úƒl_8éÄÊ€>]A⁄ò”Ñ=À.·âZ}∂– I;È ÚÆ‘Åxx¸√yEƒóÏpQπ%~4J„Z4c˙<π[Ë3 ÊµÍ.)Z´ïMç8d£ñHΩ4ØÛi't‰óô≠6j‡÷aÆ=^Ï%„¿O;ã›≈•^La‰	Ì,ı~‚Ygqe—ñ]œZ.êÅ í»˝rÀé¸/àë%Cˇ<µÓ ´Å@iñ”¨Ã·C9Ód∫Î∆≈{RÂ–‚≈©¥G„ÀÓ*√êÉó<Mp°.∑V˜»%’.ﬂõœ¯êQ€¿ı%«N8Ii»0~Q(Ç‚(…)ˆ•˛"kƒ.Ør]Q©…ì8riídÕIçoèˇ™6»ØØñµOŸía;WFe}ﬁÃhe`Ü~◊\‚=ˆqì#˛c…
Så3ó© Ñd®tÕ$5°·]"’ßrUƒØ©∫Wè Â:b•”()´tÜµEÅÉãÀDEIKµïJ:/ë`™„Fa˜¡DÄ˘ˇæYPvuUë' ˜rA:ßˆ»[~zEòÏ∆ÖØ0z;cíùYgä&ç=n£≥S ÂbµÕ6ZÎ¶lÄ™â-hV‰0¶†éágÃØÈÅz{\Eœs’›‚ †1ªI¢ï	W•≥Îîé§‰!LmB	#2“az2Ä‡k•√¢L©ïPÙ*«ëíÇZ‡ \˙¿˘ .  ∆ÿ§ëÿ} oÙ$-∫ÜG=ºƒ`÷UœO≠Î4eÄI=8™ö6}«¯Ω&Y}\£l‡kÄ≥Ù‚h\c{Ñ° Ωå¬é®*˝–€	vØØâ¿m—j-ı_Ω¬+´ıØ–K?m”Eâ¶¬ÚÌó6£3&è±∑◊§◊Î·/`yŸmìs' xSèè 69É$
&x(âù ŒÈá¿ı>Ëg+é$ƒ¿ëô†≠‘ËbqÔFh]¿:ÿm¬§Ñ˘Ób‚:ÖÓ=‹\&∏3œ;+öYemÙó[ÔÙ,√»Ol	π°m≤êå·L∫X@Øx¬ãm≤∂â«©~[∂Mê™’6´lx¶EÃîëÚÙ[øàP9pûe„2êÜÁ≠Õ∑C≈Ó<Ù=»Å–M¢%ﬂ äoÜù6VqTûÊP*πIaqùR’Ÿ,z5iÿ3Î®ñQaWÈµs^Ω∂D±Ñ∞cå·Põv|˚Oﬁ$à»Súd»Ãg/8¥(◊xêŒ˛”%K3ÕpCßzLFúãIF´‰ÒP=3?LÎp£IÈ–∏¥ñ\È}–N¸Äëy2\(™Ÿíà¨pÑ9Z(lÖ—tÇ¡O„^˛VZâ∂]∞lXƒ&õ9ÀÓ)˝WÕÚìÒ:å’ÇËhñ@ÒÄr6ª	úJaHMLéyt±Ô¸É‘(¡1ç∂ÛüÎÃ^Q«ÇË[mÌ›¥iÂ—“ÇòX)^üªQﬂ˛ﬂ–ıÅù=ãR∆,%Ì™9 m/FÎ◊¯WIB¢(ƒo$k]´›˝€º5€"Ù+ç#ïsﬁ—Ì∂ú——8b˚ê{>
Û‹ñLﬂ√w≈∆ß®1lcLΩâK;«uó—'$fD~ë/ÿO©7Y&˝fí⁄` ñèLR_’ôŒJ2Ñ›Ò$h∞Æàn[ÄEÆ1´Åã'±√ÕÊ‰¯ˆœûÔÃ(2◊∞PQãŒÃæe•»¯ä¡ÎÿIá=∂-ÛÄ4≤Bj«π¥d7 m≤k„áãpê˚~O‡€|‡ÚÛ—¶¿ÅH¢s>7Õ|Œ„hƒ$7z+nÚn Ò˜Í\vEˇS9œ≤7ÁÎ@ÀÄ√π†#‰lúIg%{ctﬁÊ~–MŒ¥∫ÈN„Q(9zÛí!≠mÍúr-P °Í∆˘«–Œæ ≤icc`íÄg_¢ﬂkŸH¶q,:q√õÏ{Ω√Ôµrs◊÷Z±y€ªj†∏èñdÀ6¨]ä[¥ÿ %èõ#ò€›|ç|¶±0{‘*◊±+)±_1Y∏m&8(Tì3ì≤Ìôı	0+≥˙‡è¬]π˙∑ÌLŸ´Ÿ±igPbÕ∑2(’ÏSÉœ_Yç‹k¬l†ñÇ∏“ª≠Ø®xºz‚gf%ùK‚8F!á’m¬öYò±©∆hÈ)ñ[_úI Ïó%QÕ∫úq•/»∂°•¸Ë ëB‚´b?fﬂzˇµTB'W(∂]Ω@C6fπ“ã'á‹‚Ÿf‰-`¬ﬁz©Ò°¶p≠¨œqYS1≠ïËkyÑétk‹'ÿxáŸä∏«M∆‘Ω˝·‹w+<≥è≥Â'h•·Ÿ Í°o®ñˆyÆ'*ê\B· 5ŒMZW;≈_!÷‚C‘^∞qW6çÆê´ÆKÏ‘√íñ∞ëü.0–s’*>¶Ó–âI—Ås^∫EÛÌ‹˛3ÖwßvwvV*ÊœÈm§h(I‹xUSá∂—óãøãkD4 ¡ﬁ‚2…/&.ã•(^KQL+>ÁE@~ãWxX‘‚´û∫¡ƒB]Íiz„¨
s+[eìﬂ»õãıvFsﬁLvºô,x”ôÓº	p [Y≥6ŒUlr"8†¡–∂¥¢`π{ fVª¢Vo3Ô‚Èås®å¯%uºFeº÷ägt2∂∞„ú3Áaº”∏‡ê≤N„Ñﬂ,˚ó…™‰±zÒËmL§€<SãÒ6!'y¯≥€æù¯û≥ÿ¨hmËZ)÷Û°LKú@€jo–˜ö‹˛‡M¢ÑHNy]Z(ªNc0Òyó–˚8äô◊ç”0{ßúÿ≤.˜hœV˘ ƒ#9M>e◊Ò¢9t*Ë9ÎÉÎv”Ùb‰ÏÓ°ﬁ˛qÑ_;käÂ`œhî¬…Ù±ÛÔ}8KHÁ»ç»>9˘‚ò|Aˆ#∏∂Ñ´˛Ãá€Ò˛:G˛eDN©TÚˆ˚ÿèñÊ˜ø%ªÖ˛ﬁ\,ëﬂìøÅ´9‹ããgŒ»	áæ >VÊ1K: JÕcp*f]˙JÇ¯ ƒëkI#ÿM4$CÓ∏““áª0aR~4_ú…√ç<?¶)€)8Åoˇ˚àH\ÚÇ4tô∆ì$πË- JcæBÏfDé‡òõÌR—ÍıﬁE<;|Í€‰≥Ü‡ÚØ»‚øˇ·øˇüúöÅP©{C˙≥Ú˛€˛Ìüˇû(°&L5ıÔ¯üˇÉ∞`ï≈Äâ’8àjàm‡h–Ô‹(2⁄HÉs“hZ;	óD-∞Ç»Òÿ÷Ì%'_?)s±¿Û>ëQß{£q‡#µµ0ãÇîµöπ`¿%Èt≥Y–nΩ4‰CÍ¸4JA&∂¨Ÿ˝ó{}/àò¯ß#ƒÊŸ3˛Ïä•∂˜±wûv˚A⁄x\‹ÓNøß‹^©˜ 67SyUdSnaÊ`ªÉ\Jû√÷µ·±›≥9®Åê—?∞ı›‘ìöÓ*»à[-e’a&ÁàîKp∫¢	nc≥ocj√ï4+=«ÆŒbz,üNk´›é&'6+Ó. ‡}æ@Ü•	ÒÀRØz &¡'àyÃvØã#ΩÅÛ9æπái4ﬁ&k˝e¬"D¯W∑	¿˛2l4¿÷/Ék≠>Äûi‚;·t∑BO˙7Ù–X∫´›Öu≤æ ÆÓ.¸Â˘Í˘Ê˘√6i7~ªwÈ'lfø¢–;?ïn8ÎÉ-ºp0= ≤µßÄQ ˛Ø.≥_ø°|∂ã»Ï.¬‘ZÙ˛7¨˜¨∑ç/77<lŸ€$ÙaW…õã6”Ê_·ﬂßﬁÓÈ!QÏ#»‘ÚZ6∏’˛‡·÷Í}Ó#~irEAÍèQaSo˜ö)Ko§”˜ÓıŒæ/T> Õ|ª◊Í/‹ñA•≥¶Ï«Ùå^†“XâåÈá]œø@0t∏ºSÕ™¨ÈVeô ân∏gà-´õÌ §õX©Ìü,êêë2!Ôdbn∞˘∏ªAî$<Àﬁ¬_8Øù?h≥ï>èã}™1Ç¶^∑õÓΩPÄìΩfRÙ>ø™ÔÒ|c˝|≥Uêi%∏1`Öúã–\6$Ãö'G§Qùh/¸Ü—‰Îç``Ü&	P≈}ˇ0JÑ:.OÒ^; ›Y)Pk´¯ºvôÂ«⁄Dv'ôìQ9ƒ
d”HX…Ú∏*Kõ`ìA¯…Ÿ¯ U–ºh‚Èâ8ÂC‚s´?ÏÛ^9¯?∏√û£t8Aê6≠úe˜À¸ŒI`±‰ê—"{∑?∏æp ÷èx*√~ƒˇ°nƒÃìLh≥Àû≥{çY˛ñ	¸Èø∫sŸCÇêÎΩ≤â É>aÌ2!πÑÎ2¬ö .⁄d‡ïü,ÈÆ,„Ÿ6q¬´e6SˆïI≥/Ò'ß•…£nËıg◊Ï’\Å◊@}U∆¶Û5[fﬁ¯“o˘ïÌ ?:Hê#)R¡Üx¿≈ÖÇﬁH^`„|„m„≠ß∂"“√—√∂˘ ˛∑Ò~£ŒÛøv·k˜≥k÷–ÕÎrˆcº:]d˘±qè£ZãiÀ`®G¡'˛‚·/e~Û¢çô·+eÜ/ñÈÊC‚4dÚmÅ…⁄±˛»ÙH≈Óùù›7èïS	3ä«~ø˘®“}ÒÂ3∫t\Ê'$.?ËñziÙ›N:´Kl∏≠è±˜(∂W∏õLÄuÊ%•üA€Ãx∂¸–—v!≈“)ªxÊè∆Ù;}”Áõi0u”™BÅ¬‡•Ìâûo¿g>=S˜ˆè°©ß5èùÄõ3èÖ9≥{˚#√§‹ç≠á≠®ä~Û;pÜÈ˜~c∞ÂL?ôÁLh¢m˘¡∆ó[ˆ[oWq!˙GƒO(È`2gﬂ®©ÍB6•ªf+r£|Û ç`≈ò∑ãKßd't¶‰Ã…l‰ÂÅ>⁄mpx¶±]huﬁ≤e9Ùˆ ËÒ]wue›ﬁ÷Ì¨AYãw¡±ÜO|jç(ÍKˆb/~8ÎU⁄—õvm∏óªõ8’vo]MÛñè°˚/œü$ª◊˚-Gıœﬁ^]o˚zFôÏmüª?»˘Â,`´Wôë
¯#dê∆]∑zühÚbÔÈﬁ◊dó∞†ŸìßdÖ¨nımjU€∫Ü]_Ü=\&#ﬂ€√
ÀÍﬁ,´KΩLÿzqMπÅ∞ôL◊qÃöÑ6îﬁ»§£ÙG∫ÍÕ%Ús“ÔmN◊€%t‰bù—Ìœ˘⁄πQ“È â√Eæ≤VÂû™}\aWï>?úG1M'qÿJ{¡?;xöëÀ›ÎÀrµ{}%µ+<3;ÎˆBw≈ª0J5C^4Ó3L˜·Ë√,ìªHπcTM÷ÁßVÃ÷„Ñ£ç}ÿ&˚ü–èŸ+Ó≤yØ‡ €é£Âæ¥P(‚G»"vØ◊€º‹n"\qUbÎ•lF≠J\hZ,ö∆¶jqgŒ∏V/Xãú-Î“R+}`´ì{J6óøj4Wìx∆‡ÄÜ)‹4’dDÙÜ éW0RYΩ{˛Iü@ ı/ S<‹‘Ñ˝g–F˚«—[Íß2âwS")ÛBïÚ˛¨Y&˙©]yY…aΩê=¿êm∂ ÒŸRÆÚÜÒ<3Ã`^Q—≈aJ§v~ÖEn*P¥ƒµæÏø˙äô!øˇ=È∑èjo9˝#€VÙ¢æ√mÕ›g[oÏÍ}nÏL±È•|AÓjÜÑ<CAcƒ“Ï±ÎïËO◊·H*èäÑîº†N0sH∫9>*O-î¡H+<)ã≤
Q˙âËZ)´6Ú∑QäÄùR—dõÙo>oÑÔ;ﬁV◊Ù°™œJÑnîÛ¡(œî»◊ﬂr1ÕôıgïÃÑ#ØíôpKËÀ¶‘îAã–XA∏˚aÈ…JVƒÚÍﬁê¿πä&–[ß¿Ç0Z2)ÆÊ&≈ıÃ§®Z[95±Aµ≥*nù;Án[9HÁ‹tOÜE÷øÍ´Ñï	.¢¯j¡hÈº[≥"êµúWW©ÂΩ∂£≠d=bªóã>.ÌﬁçÖÍÛ%Û¿‚ˇ˜≠}á¯á9‚C—ÓL31è2‰Íg˛%…’èΩSKs©Ú „ôÜ°ò9ÛÅI&™/‹›Ó´(S\¥9_4©	kmÎzg°ä69	õÁñï˚^ÔO[Óª¯ôKÒoÕÿg) ‚Ã±x˝õ“éÕTº‘•¶D¯& ˝f!Éœè∫Fx˝ÇT+ÜØÕP1º–S;›èaxπ^£yπÏπWJûqmN™ª“£¸ò%XñÌmx˚Ωcì…πÔb‘ù(VJ0∞í∆¢˙±,ö<?¡∂v˙ñÅΩÊ€˜íeÀ™…í˝Ìf©£Jı◊< ÍÃp…ùßìÄ°3ë=˚u:dèx ≠"'Êû∂Ÿ/ı˘ub?Õ®∑≥ÔÔÖNpÖı~Ì”wE6CO&..›°Ù|U~óÂ"r‡ÿŸ?≈;¿?—•p7˚Z|"
Y=µË]ò˙#öH	©öTÓ≤$v¯^V•l@-∂¯Çgå÷∂'Ó’¥¶∞‘ÖΩ¬XqXiLüìe…ÀS¬ãö”Q_k7HTﬂÆÓ‚ΩÔâ ï.BÒ9‡:ºΩ`PËo≤ƒ≈›≠ä)l¥ù_Èm∂-∆}¡RÉ»lÒ~Hí ≥D˚aìpwπ˛°ªë%cµ˛4aÌOﬂ'o†Y`˙Ú‡SîÌFÖ¸±*€Ω6K›n%si=e‘îﬁ∏ÀﬁD_ƒªÆLÜMoﬁ4g|2◊ÔæãöÕáºñ7∑.`¢!%!a%,ìSÍƒÓå∆#é˙◊ø˚#yÏÃíΩ∞Y˘±õåöZl»	4me∫[vIrHu±.W s£É:`¶M¶b´Ù)YÍzâ,ò‚,:8˝uÉøõ2pÈ ¡ti»Ãö%Œ«ê¯Fó2G≈ﬂR*ë$±€ÁÙ∞À_óW§≥ﬁqN$S9b≥Ü
fL:Gó.ñ¶KPÎêFO«1uºdHi*©AøÅ4%Vi∑è∆Hãï3÷Ä≈•;Q,µ_™nzø  Ú!¡MΩÌ•HÔeø5)è4˚}óª)ƒ÷¬~f◊ÓsG≥Ù¡1∞Ω‰‡õ©ÔLΩø«Œ•?Ç≠]õ«S^$‰pYÈ=.ï~n4#ú√qvÃ6Wõ"©bïF≠¶L?x∞∞_
Ì€ÕX/dÁÜﬂJ‚˜ö≤+[zé™<ﬁåÒÂùL<¶Xê<ìïÆÊ(öÈÿ¯ #òÛ~ó¡ “ªPdQåˆµ?OR√÷s˚∂dµ1∞Ct“?çwNh‹K‚»tây‘GØ◊#zπM®-„Ì(^¥â\gôú;¯˜≠Ûg{åßSÌV∏√”sﬂ°í†ú_Ì–î4Ì’ªÀVc&2·»îSXIù60/ƒ8Ó>îj€jÇ¸w´¨Ívâ’å&)+aœ ZûGÓ$Ÿ∆ß¿U)?‰9¥≤÷ó’∫›õ˝~ôb	ztôË◊ﬁ ;˛¥.è6'!FS•˛ÂÕZ¨Àf®√f’ÊnBí±,â^StRMf\T+ıò©∞ ﬂ<81ÿazæÜ˛fyÌÍƒ∞z*m–7´f[o≠-”__K~ç◊€XgUÍ≤{4K≠»•b?˘Uú≠Dç˘/ì„ÿ™NÚcÌ’[9ÆœŸ†®wÃ≥ûÚònêˆ¸ Ø ñLFÀ‰Âﬂ.Ôá˙…à|AºÁpÑ˝K≥…äèùdâtJeGfÈ(EÁG^e–§N≠◊√ﬂZ€ïEì;-–Å(FzIF@Ö€cG›©Œ('k¶k‰ïÍˆ∂—q™ù£‘π*~S&EXÌ¿òÖÙ•»ˆªÃ¸=^’⁄Isã®xÈ¶…ê˛rµ∑≈‘ç®ú4©”^¢2•Úˆ™∫BM…60§õ,£oÉÜbÄ÷ﬁƒπï›¨À÷≤ŸêfG¬Eµf°÷”jS.ﬂy‰Ä˘c˙Ωf†ﬂ®˝m*Ã‹öàsõdë†"¿r hcÖl45™Fµé∞Æ‹ï·Aø‚≈‡≤,z]ç£  k7§ûæfs«
√Ok˜≥ªB[ó≈ ßi„å—mù<+˛˙∫≥˙“~j?k2/™«Õ3j6YµO—’´ ^∑o™^‘ƒZãíÀ⁄ó(–X–™otz∞‰µ(0hi"∑˜h†¯´\≥⁄m,ÈòuΩ`;Cµ÷¢†ê§í à‹K@O°Â08^†ˆf¡™ Z˚≥kú"CÄÙU…¨
Ø◊¨ˇñqæ
€ár¿ªÈw]Ï˙<KÑŒ£Æ\ùOJÌÀuﬁu‚_ÂaÉI•–Ô≤Œ“q˜ºﬁT∫≥áÍA¨n ŸÇç¢"L*S◊˙∂äÆ2öe,ÔRr^4ãye9πfcø"Øø¶·p2rÑ4GhàÈùŸWÊ£∑Â’4	dÉDDJ5œ
ñëŸ€åñ¿Z“F∑”,Œ,ñkn0]Z¶TxP,XÆ˛grY-õiLz±:=}*Õè‘ãNmAiÖΩ≈gKOewïÎ3˙
≈éâﬁœD√⁄>P]>ŒÊÒë˚x†Üªrß®4·—sgîÌÈ5A®πX≤n≈ëöΩFÙœÌï˚R±oTÁoÿ+ÛkÀ\pïæ™º7®È{ΩﬁB¶UœIé¢:ßWÕ:sΩvº)∏æË†÷VF¨^óÚL≈ÉªQ’ΩjRu´sÕÈ†E#-ˇƒıòl1°^$aÑ?5;û˘∫ë˜iAe»‚:·ëÁß'ôˇõâ∆÷öO3¬
[ÊÙ∫LÈ©ËXOP5ÂU◊Ee^b\GK◊4˛8ÇçÕ	j£o_CÅv¨ò2˚ñ’9/í_Nå∂YQ…Ó√Mïp|Å¨C… ÉrÓ,ví·ZéG+è»—•L¸ò∞µ√<úË±⁄1Ï°V]j&„:ùüÿ‘íªäT)n—ñ≤E™´…}oìÏ€b´ÿ®8…7‚áp0AoÉ“NÊΩ¢—ñöñπ≤¶“⁄øk1◊-kÓ£Æ≠,,nY2¸ﬂŸJã˛¶ZË‹^ÄÊì'X0hCÑ>\·ëø>}˛µ~c–ó≈®7¶–b_Ø"Çi4îVw…t¶O·jZ™ÿj·<öΩq©Wµôåˆ∞X’ÖYçX9L‡.gåÎjÀ‰˚R«´Od£≤√Fµü∆ 9äé'ﬂT+√O´›kD+]Ñ‡É¨¥"íwH›7ÉË“2∞î=éµzÁ<≤«“PÚÇq…jƒ;ˆÊõ¿"ÿ©∆*n∂⁄Hˇú‰ºúò…Rã‹zå+,Lª£ôÍöI{æ∑dù'ÏÜP,?”h^æ≤ÔŒNøi˜XÅlêaû•àóÎe-¨é≠-U⁄≥Kù(Ë∆»ƒ‰,f∆Êe´Hﬂk-Á:Á$=è∞'™∑Êµ∑“∆Ó¨§√Ÿ(€jûB%§NoâS+Rà∏hC1À˝ÛçL∂ıC&IÒÙI2á4'/¬Æ»Ñh©Ø}ûGíªËWm~ZóÃºÍ(ä}ÍÂÚÃBuÈ[X◊Ñ√ô8ér8;æô\ﬁgzq`ù˚πp˚∞Øónø‹,∞êe†IË»g≠∞ûx≠©˛E“À∆çTa≈ÂÇ<DæCªGˇïz$ìYø†[ÑP~—:h˜ê(écVÔaªƒâ2-doŒ6{ÂªÕs?Q
 k«|¢˜E6ÏT éˇs?IX…4e8@.0,…s»Ëˆ˚o'~Ë|¢ -8õÛâ|‚ÊD‘∞En%äb4FF±AGü®¿HŒ&q}"üH¿úH É'¬|w\ŒîDÑŒﬁ2Ÿ_&À‰	öñ>QÖê*0ŸOd·YòY¯k¶æ˜]Ñ
á8cL¿'˝ùÄE'/œ®'—KÇx˛Ìünˇ¶â9¬ˇ$?sò≥y›ˆyZY0√tî„Ñ&Ÿè'È'Í1ı‡¡äü»G˘√†äc¿F†ÉFÑ!º˝7† i¿rﬁ´ñ·√69|xD‚»˛'Úpo‰·«ØÉDÚÄû‘#ÃèAG@í	öüiÚì§
ô·¯#"
'=ÚÏˆáo'æ˜±±lµMIÄ>h ”`◊†E"¶¿?tsJF4åvΩGƒ{§™ÈGD$æI∞¸éÎC7ôêK^ /¢Óƒ'bÒﬁâÖG	&µçís;·$‡§C¿+X:∏xèÔëlàX‰èLﬁ¿r}{µ+]b+îl∞üh≈˚§˚LÂê ≠ oùÿ…&i¯÷g©&ôf”!ßËIÁ`√ŒíÃwŒ¬PJ`ºü¶ˆ‚„%'˚ùì¶‘Ûl8ü( 'äb≥ò9E¡¸3~‡w˚˝[Í≥XÓo'NÌcÁùëÉÂr.(œgã—›"µã˘FOlôÙÄ<d›˛£‰^P1“9zqtº˜”îy>fjs¸â⁄|¢6Ôó⁄`ûy◊ô$º∏¯H…\Ùâ‹Ë»Ü3d:ÿ˝(˛Ë,3∏Ã%*#W˛âyØﬁ†ó„I|!·¸—Ìücﬂ≈ÍO∑ˇ¯¨öq˚s˚ÉÎG¯)∆OS•ÚQZpYﬁ∫ŒËccJ>f+Óèû^∞ÃõWùxÁ7Œ±.ŒJÅ◊Q˜ˆè°Ô:Ë+FÉ€?c¡ü¶˙‰£$òåÚÂ¯D9Óír†ñ5°) –«•q*$LYÚâX|,ƒ‚˘~"ü»≈…+<O∆¬«˘åà¡∞iÑ’…ÉË‚ˆÄ]XV¢¯¬	˝Ôx8ãˇ”Ù'≥¶2„œ_€ÊÒ¿5IÜ}Íx5§É»ªRÁ„a(Ì(Ò/Y^$>=û∫m&§kSRõ0çØlÚÌ†◊@J¸”ùé©Gv	{µÁ'_Gøâ‚7áŒ˘˝Ô≥ã«‚wËÑ.≈D6WM)lb8Î‚–¢‡ÛNÛ4Ó¢'O%]◊Ø≥Lgr’V6h k›àö≠üU21ﬂl Üél}IM8≠≠Û$„ã÷I¬wRO¨Î-ÛKâ∆Ó.ÀîË†EÆ)˛ô*„ˇÛNUw¡æºy!ïT´LR¸É˘§ö«”&√ˇh2;ïª·(⁄Ò=5¸˝ŸnÜd-rNÒOÎÃS∆QæÏız•ë.g√≤œM%Ü’‚iÀ<U¸sóŸ™Ú“M÷≤dã£œB’LÛèUY Úßî»˙∑áÎ¿6áı•_Ç‡•
‡øÄÕi◊]ëÆ1ÊK≠•ULa]¨ÏeÖ—À™‡®Õî”Q9˝M•È(∏f*%g˙»úï,ÁÆÇb¯_õ6Ï!?;ÿ”Z^s¶‡±◊ÎV»P÷+¶ñ?÷Ñ‹≤&4≠·Ø
OöŒbma^NÉS:ª‚
sáRI¬r≈ÆsﬁL_GÀ0ñ≤d&“'K~ì•RﬁÏ «Ë9Ó"≤ä§»-∏B:'/ûùû>''{/ˆü€Hœb>≠†ÿT#¬–v%ZÁ<¢û?ïJüdê3UkDπ+ÿﬂPfê‡öπØíA-ó¬˚JÜ˛y:Áû¯!/'â’®ﬁ¡9±…
8ÕBí…ÜØ/xAá±sA_∞J5‚ºydºÖbÖπçö)=à¥6ïB_ø°¯§`JA¢I~e.§hÜ°§ìrc–T=Sxàïµ4¶"I5UU+Ã0§iæ‘÷|Æ;¢Ö∑Q0—aßøƒ2È√7π~ìMÎÔπ—~~©%«Xû<ß‚¨ƒPIYí„ME·ÄJ9<
‘–≤ﬁìµvTY”∫|E^v]∏yC~Øπ>M’ıÖ>»ø˛›âÏH<qCŒ&ÉŸ;*nñ©3|äu»˝ÂZw€m±ª¿‚Ï¨Qáîí Ä ´õˆ|_≈ò∫Wn@Ω}Á"QaFΩﬁK£”%Ωrp¨òHg±∑∏LóÅ#xóΩ¯‚7	„®†¡éÊ∆
Yﬁf	Z~Ï_RØ≥Z€≤˝Ü^ÎA:üÈËë˙ÿ“ÕRÀÆ~¶YA (?”aQ*¿Óã?1ÉO^V∞ïMK—©Ìµ$Ê◊˘õ≤J~ÖÁjGóıd˘aFñ_˛ÂCg}cuÌ’ √óÃuÂÀ≤ÄúW`\…K=0^r¨Fûz≤K∆h£¿a¡a¨ ê1HÂ)∂®ïH»ø˛Øˇ˙oˇ¸˜§⁄Hˆæ≈›}o@∫25îÓüT¿tˇ‰«ßré≥j÷ 'HU{©É‘„È!ı∏
©«?H=û§ˇX!µËòéJ©LW’Üa4Ì }«œd¡Ïˆêõø_ﬂ¸˙]¿0.¿ó˘Z ÄnîÅo¨ı7W÷ÔrÀ”õ|+M˝à`ÿ†û°Æ˚·úï&Ü.•ŸΩu»}SÊŸ]Kª9~f∑≥Mi∑)_Í¶\ˇmjù∫ÇL_TûU≠nä:m´`^”‡P©_2x=s¬€?Ò∞ÖGE€‘˙Õ £ˆ£ÜiŸ¡ºæ·Aû˚Ò®›÷Ûœ¢xóı&	VΩ_û¢!’X≥xH˙;áe˜±√T‘pdˆ√ _”º.ÚW(Öønı‚geãƒWØßπì\Ö.ô∆µB~–„h∫7°˜wéü¬l∞:Ëa‰v<¸∞L«Z'Ö≈Â©ù'‰«I›!V$ªfPQ@{4é£∏√käF€ø”zÏF¥óUQ3¨væÀgãEßG⁄vÍH2ÁCπﬁ)OtXø∞7µıÎô◊^ùWﬂy•⁄á[≈“ú’“õzˇ>ÇŒúoÆÄ ßX…1´íòñú_•7´öàpˆF¡Èÿ	wØîÀç≤sx£‡”jˆ©‘xÎvÀ˛∫8‰”∏Ò€ä}á0˛œfõ,¬F¡	º»ËÛ"ﬂ¨á§Ω…l÷Ìc=)G˘FøËjÌ8
Ê´9FÕVO#Œ^∆X–Fgv „#
xb´Ô‘,]I”ﬁ¥r˜ TRs}/=qı„˝tu<gËƒ”Æ-¶UÛöw°ãˆ‡ù¥˘¶Ë¢ùêgÏ@›`Gõjtø«ÉXˇ ‹ƒr«’õ6ûKÄY»æ_sg¬3g¿JÁ.RVH8”E¶íøN'ÉÏë$ç‹7ãeÅ¥,nr~‡™ª•Vê?w<Z® øYaÆW~N~IîﬂV»æÜÂÁ+EB®©W}ÇÜ|7ç‡Ã>è±ÄtvñøıY›˚!˙äE ΩJâÎ1y‰m/∫¶Ú>y®M‚T*u≠Ÿ“8Â·g±D2Ñcä˙§ã™Æ5¯'∆ﬁu†´É•r:¨ﬁ j>Üál‹]áaj¢ñF5úny<Ÿø±ô»ç‹∞(Â-ÇæÙ~¨k®«[œºiï9¨ïÊ¿ñ˝2Q˘ÕÜH—ÿz≈˚VÈe]∞Ô<ˆz:π‘KÜî¶π*YyD@ÜRPrËﬂ~˚L8=ÓÔœ¿˝uObÄlådóAR)´F±û=¿˚æQ¨mØôp IŸò5OCé øùÄ(ç„t˝@$∆€YÆi0Æ	ú„?GŸhXzÆZ]ì
WÈ8É`\åvQ_ÄîÀH"òG9Ò‰Úajˆ˝`»3€∏Xúì◊xjÿtŒoH|7‚âoƒZèq≠{‰9lOêÂÄ∏∏ì¿!2Ihîø&˙¢¸[ñ:0JD1¶gHÿ`®®ú_ ßU\L¸≤Vç=€Y7„¿85D±‘∫æg⁄" 2!ÆÿçqwÙ, èd·Í∂Ì±2«≈Ç¿-Æ}Yk∞—˚◊{JlF–±GÊX¸$»n2“Õ“pTä%îòº¡0yﬂÒ/ùòG8Ú\∫4–ÌìQá†ßû∆∏rÆ}√qah˘+ÚK ‰≥)D®Å∫ãÿ˜˛¡ÂIÄé€˘œu∂°[‡√Æü—ÛàD0Ö€‰Èy!r‚Ñ4®ÙYÌ:ÅˆªËÃI∑8)Y5ù®Ÿ>fÁ…ÓÄp¯ô6z@”wîÜÜ”FãX√ı
ey6ƒT5†Æc4@‹ÂÀ∞r i”cFY†´Î⁄ò(ÎF?ãÑ\EMIâtbT⁄jê<XôW åNÅ\zæ#Sú≤*–0‚*u“	íbX}$ûN¸Ì≠zpÑiCêíXÑé†∂àmÄ§XdGd(SV/J¥©Õ˛¡H£Ó∫Å-‘qu{ÃÓŒ  ∂b_¨ƒ—òÈKqkxp:ﬂtå2≈™ŸûÁ«ÎŒ
Îÿ8¨Ü8DN´1*√ZÛ÷	&@™k˝Çû”Ñ,zh$ˇ¯QB)Sp'ÃÁªÙ~á¢&ÁÇ¶=÷Eçû∞ï∆ÿ∞‹é•Cu5§©JÁ´Ò)"x‡äùFÃó_™&ÂÄßbà¨i·D:bú›CË44Öá±É∂+Ô^√J{≈¶‰è?€ÊÈg‘yKmè∆˘ì—ÿÙ§_,÷uMÓ∞;C :9}Œ®≥™-≠}&©uù!q‰á›!†Âó/?3õO<òÚì?Y‰rT)=Yxƒ€À~Ô·÷+ÊŸYH¡Ωî£(U ZÎ/tÛZø™FƒÁπ∫ÊÔ`5á(A–¸[ag>ª.ŒY^p∆RV¿πîÕ±H≥0ò€±©9à$F"üÎË–“x6¬VÌ≈¿ßxÙú∂ùÏ¡¢eÖçÉ$⁄Ë∞]¡Å–Îı¢	ê1¬ê0?^ÜÜ|<Ãú0oQMü÷'F)Z∂ñôAÄí4p-$ÎJbg}$eoR	˝W§"÷(£YÙ3Ê…àÅ•dÁ∫Y∑‘+œO©sêÖÎ@◊•„tw°w$óÀ¯∑ÓÈ¸à‚Ñãq‹iÍ4€ vqÕäπ3&‘ùŸF{üIt7!◊c"?'ËÄ¡EC# >0Xƒ6uãNoñ>˚“e
.a^[À’iÎFãöFeÊå–ÒfÒ£Z≥Ä¸1dÏ2¶"ÂÚcœÏÕ∂≥–8=c7†ö¿€} ⁄Ì ∏u™≥ Ö∑u‰Œ¿\ÆŒ¡‘‡éñH≠Í≤±qn’P ÖGi|äeóYÈUœ©!WçDíw
‰yÂ°J' 9æ·T°{òèÅb[7≥˜˙PíÊ¸»@Md≠Uå{“î∫)–±mR¥S« JKJ£Vª4bΩÄÜÈ.¨…T;_Û[%»Å	Æìqö±∫9bÚ5Y„ûä®fæÜô˛˜äπf®Àbè„Ü”Œ≥‹t¸tô¯ﬁ%„ÈÎ˝~ÿ,XÇxæ`˙f®Zí®ã<õ‚ö)¡ï0ÓbÇ))XÎ[Ö/ÍêKl»Àø¸rk}≥˛™Ä\“ÖSxvÆ„jgéú~⁄√bûõ¯®y»hΩ~˘ô¸uÛJW≥¶-£VÖâuæØ‹§«É•si?
£i*égT;K:ëS'%0Rıóï>¥<üpZ~Ë	,à√ÏaQ¬èoø†vj—:‹j«ç©⁄2°ÆjHØñ,ª¥€i|d©÷u¶NaæŸ(rñ1µ>ıQcŒîí´aB”ï∏tB8k¶Ÿ¨L∆OiÃ\òk˝JÌZfS»x^‘$v”≥“±i»Ê]?§ I¢Üœ∏µı^dˆ¬˘ﬁSÛôjÊNˆ¿^yW; Öó<#°ËΩn[ÔŒ©ºEüUÆ|õjã⁄2¯‰–c0*“_0ä.5È'√´ÑiŸˆí}‰œ–ÇCû˘ ÙµS≠ØÕ¨ZüF°Æ„üËÌW: ïıñå∂Ÿ˜8záﬂº¸.Û"HÒ¶“œK◊øË◊~¬U„1y¡ËQ¬Ä/JLä~6[e[õ)ˇH°ûxÕÜÀLÎ/5˝û–¸;!Ã aäi≈
g1Ò(ÿC mú“àöp+™ëõ6Ú“uWZÀºpúkó1E&ˆµ¬~ÉH˚NjÎ§6É†ú‘ßµ xı|·Ç∆Ä≠?≤;,õDùRE™ıEJ:F$Íµ˙Ω~π{µæA±œ¸0÷˚s÷ÎKg>·jE¶§2Ç6»I—ò±µJ.N4«‹»˝Q.5±úˇ˛á¯/§E¢≠≤É¶H£°J¿ıéô;+|”Û∞˙¶`cµ≠öIAÃÕ…Ω:1<É´ÿ^Rÿ˜sÄß≈∑)€ÊîVÈ⁄Ï0œõN∞\ΩÃ	]∞ÃëJ7Øz¯Dß„,ì™√∑E§ÄD# ø¥3`kB6DgbtOΩKúç⁄5õŒS¿µÀŸÁ4 Ù£Ir$óMÈñ{%∫~©ﬁÔí’W £§`Ï”ç˛L‰ë9pıìû·ë<h˘ÈEfsÖ?!/ÁâÁ&ïÔ·IÙ˝yüïr ºÿ€¬Ó ≥·G1ÅÉIÇ%+5Æ()WÌÉ3Ùˆ˚üõæôùù˙çJÙÄÚ%∆†<›ªdq±v±™;XK$`E4“wÑQ˙*V}AœV◊∂˚}¯o±.2Ñµ’ÉÛÉ7ƒ~]à_K∏Âu/ó¶ ﬂN£ßßœ≥º4Çˆù-.ΩÏø26uS∑è9ÁU⁄ú“ñFG˙Ìë«Ó÷ ”Ø$t<P3^:W8ô·;Elf•∫[Ê≈˘ä‰1\,?µ»á´‚£›"FÚ´ËUÀøÌT{‰©ld;XÌg—;8ÏP…2˚.R‡˝ù≈•öÒmÛ˘e˚g3^§9Öó⁄˙|â)vÎ–G9˜û¨√.ÙçPSz|ÔÏ∑mv∞÷≤ıì`í¥yÂy:∆âΩ`z£
w=‡éå“kàH‰Ä˚éıÑ¿JÛ8ëùÎº»Ú˘Ôüî/Û5®Œ{ù]ç)ÔL˙±+®Ñ›Ê0Í`˛®oêøÊêP”,í@—(˙ç≥6ÍÉ)KÒ≈ÆXÇöNDÚËR_∞°-˙B‡öæ/ÄµVÛZõm^‰‰Ÿ7ßã∏+≈ÎÏr´93êo1€¶9jX5l<3j	áV.ÓRoR"€¸úÙ{7î∂ÔÙ+wpcÙw‰Râª\òÿ1J‡ëkú∂#vgµ?›‡Vk∞º8∏_“ÀÍ¿d˜[µùlYØ¿^ô‘´. üÃCÎ·Jb[2„Î5GÅ^.0…NËïòh`Úâ`l¿p0ôòzƒDoix≤¢–*™¡∂kÉˇ_ÇT∫"ÚTØÍ≈∆=*˛EÌìhÿ≤{Ú‹avd˛—6SˇÖåù»ÓY∂[vè‚™üØ£FF™ r}c¶"∆ûôZÂIåø¨c\˙_Qî´ÿ;‹≤àgcv06û∞∏'j¯ªÿÑıŸ |√ì#˚*˚∂-ª™i°˛‹˛ô
¿¢Øéñ Û∏ı Ã•≈lHÛ¿¡∫¥zÔd ﬁoxPw”s∞õSÄ∫_˜‰Õ4'd›r‡Ä√≈Ú⁄Ù÷›©∏:—¥"<Ÿ{v≤ÿTj§#=æ‚»+∞!JåºHµ≠:2ﬂ™∂œ ¬æı:ˆ◊∑p’.jQ¬lM⁄ÊB‹ÓÄºÕÉ¿’a»îDn*27°õé‘µ vˆ‰Œö‡Ÿìºz¢◊êz¶ä~Y∑≠‹ÄfïUsÌØ∂/Ü◊2Á≤KÓ\&-2⁄k≤⁄‰ñ‡Ã–“`œÿaQÂëh€çÇ¿'fˇh¶Í0∏¨`'BG£fßùÜzs É±6?&|∏Yé‚“:öqõ¨—0(sÖUfhó≠TÊØ…õ|ΩlC”î»;∏˝á√ßOû€ú«ùºxz˚üoˇ”]wZI¿gXÇ«∑ˇqˇ≈”ÉΩd8»„|(ãSi˘rs·—ŸÛ≥Ωg÷C≥@9ã¨TÕ#≥ï∞+πjï|á\?¸Ñvn˚N:Íy∞ƒ}h/GÓFkï¡MU9† Çµ°-]qÖÜvâŒ_≈#…âÛ&f‚å4≠ Wëµ^eﬁ¶iı›xîdb÷ç>V!˚%◊E#ˆø9;˙˙˘"´S#'Vº›(d®ùÜ_‘⁄ÕE—¬jF˚À£ﬂ÷çnœ>ZÆ©õ«hèèÄB<?(åX˚»ì∫I¡#≥O*◊çŒcb/éû<€;4œK<aú‹7æ{rÙÏŸ—Ÿ©Ò˛—ã£„ΩŸó$SñŒcEûsˆ¢n5Nü~m^|yˆ˘‘Îgãs±y ∫Ë.˚dïwÀÅ’¿ª™?±u&»Rb(õ¬Ã˝ø¿ññjç’T2jìü˜∫ttÌKÙÿÁ>ûa*%ØK·®˘M1kõ¿é{õn•@Y ¥ŒuÙlhã•(∏ûÒu˙˚*≈?°µ·
ëèni h¥Uäxﬂ∏É•Jyû¡;Y)Ko#†‡«Üﬂ≠K†õ˜WüGW>•œ”Wx∆ÏM-—˘⁄◊∆Ûí◊™1J¨ÍéFiì&J»’&!€¬#ôïÏ±HA#í‰ZDtÈ;∆»Üº„™(¨Ñ‘5:€Z£y{⁄Ôé1)ò“(hi √j®◊”‰m ÙùLá¨LûZø	ÆÌè¯ß®Ç≥è;2‘µñÆM]>ñ}¶òµDhBG^•Xv1D˝å„èÆhû}ìå)1%E˛öA∂,ìÚ«ı `ïª‹≤Äzπ˙@#	lYl`Í‚ØœËà∏4NÈwA*·Ò∫ ≤@$c\Xé6ôÕäπsó–œ™~ÊMN¯_a0ôCxrDÓk<éòÛ( $Á‘OùûUÅÅˆ⁄0`ûÈK≥bUWUÎÃ˚¶d P.2[˜€ºà%ñz∑WÎV\¯h£S[ΩˇK'Ÿõ§Q°QƒRf•Há∆±ΩÿZ¨ë∞xˇ' ‡PB·6÷fÄv[ÆØ©9Îïµa≠nl@v—√h¢ÿîÙ(ˇ4ÏÊéŒí,„ıfvî‰’¢äyGf=>ÚBÖ¬´úÒ^ÁE„◊jNñår≈
<3éàî≥Œ|X4ƒæ◊ﬁ6 √ÕRGÁun.MØÕä ô¢+Ll‹Î "]UÅfΩﬂ"ô¥øÆõ„ÎÀÄÕirﬂ·àá¯GfÁOÇÑ.Lë£¶]rö"Û]ÑMVÕÖG_”p8eyÇecûPX§Y≤≈hy±î…h·—7	RBwîÖ◊¯<ß&?ÅŸiÓÚ1‡âü–âíô≤öò¸Ω∫îcçπ™74úÒ¨˘]_PW·¡ô;È	çôH∫òV8ˆ™9^5asö»Yc¿‹˝Ñ≥›uõ∞ΩM $¬Tøˆ3h®ªZ¬f_õstú°}èGzàrmªñ7˙Õœ¢n∏w?OLÕ|˛uw÷Õ[Ü£¯öbIa|¿&√7⁄ÈÄT¸ó%ÅP|°	5Y÷è‰ÕaJõˆÛ®ã¶˜€6mÄ©ÎåÈ∞è&zbˇpÂæ»'ô}›7B7å3(≈ò \Cîæ*9Ù)∫ BıÌ¬-MK€⁄»§ï≤œC#ô,UåπÀÇÌúHóùÑé`p,PíeÙÉ´FÈUYÀò…¡ísåíú.<rˆ∏HçwŸ¸?ÿ≈˜öh^ıìåLjÇˆÊF+y?Ç^∂Ï»ñhf}ÏO’«T‘3Ûë·TZêœ|Uø(ŒΩ”LJ=ˇ¸ú¡›ØôÜüG˚≤JA™}?“∫û~e¶û›j#mÍÚ»Lœ«…hL`YâKÆ∂Jd^u?Q™\òﬁ⁄’±¡D
Ä∂L .2úgô9+åÍ®™ˇëh™≠{P’’H°mCw‡˜#<d∫^uäã;Èë#mÃ8í{◊ëV∫öq–¥/éún>H€Ÿ 7ôcÕ©Ê5]‘Yé4¨Œ≥»Eƒë´ÍÊ/Mãl÷q:rö¬”µıÚHá›Vƒë_–Rp¨∆∏H$“èÛËˆ˚I¬P=Xfƒ^}+„O˘∞^ç q¯˛˚ÕQÒ˛˚Œ‚˛ªÊàuﬂ˝ÍÄ“2˛™6 láºÉ¨f˘®Ô¯Ãkiô¯™Ø^õÖ¯°§Ph√ÁßoGDÛqmÇD{≥E‡ÍKËÅG›<…¯†gtSóp¢!~Ø“¡„<rœ∂Ì’J√YºêU≥∫`!çáÀ©ÚôVÂDí†ì„ÈÅéBÊ:Iô7ËÿÊ«±MåcõßM*ú9p¶I~sOYoÊùÓ¶Eûõ6	n⁄g∂iì“¶}.õ6IlÊõΩ¶m⁄öZB—.QMï"hc∑ÖyH#`Ö1!áêñ¶2®%%Me`ÛNGSÈ`™T4ïVÃih™å ™ƒœóñåÇË<´ÃBæø˘∏î©≈ÿìbé√SçÈV
ºu˝cÕ=*úxÕ∞D6mõyäG-Ê*û¨{FŸ„∫«P#Yw-Ωì¿1o£QÛ/O†"∞`Òm Ωƒ¨/5–S<ZR?¶˜*Äó`xz¸ï7ø,7BÛ.øe~U¿ÖÊMvGˇb:KØ*˜Ã/úﬂ2ø™pv«0”2põWôt[œ®å∆m–∑]ªEôvHﬂfÕZ≠rjÍﬂ·»◊ôbhÀ≥Ï$√`‰‚∂…√Õœó	ú€ø¿±ì}!x ·/ù_ùV√QãõBc‹7˘”·¶ÚnK‹Tﬁlãõ‚’©pSy∑%n*oNÉõ’UV‡ÃvF&‹¨lÉæÌv∏Yﬁ!}õS‡&Á—¨p≥≈J∏Y◊Iéõ∑äò∏5/TTl!-–1k:î,Ωﬂ-Ko∑EMÂı©–≥Ù~K-Ω=öÍW_ª634°´vãÃ}¥C[›ö€û}sŸœ
ÖßO	ïõ:,µ’ìvµ_@p¯9œ≠-;{i:Ù.æﬁªã/∑EÓ¸Ì©pª¯zK‘.æ<fk◊]ƒ≥3·µnoå=¥√jÕŒ[ûß3≠ÜJ∑L	°zSÒ–¯·º–ï[…
3ÓùûΩ‚¥ÚÚ&¶√\Â›ñh´ºŸg≈´S!¨ÚnKlUﬁúU´´¨ÄóÌåLHZŸ}€Ì–≥ºC˙6ß@L¶¥B C(°cM9*Æˆ˚üìÁV`coåFºä5+◊^I_LñFTÕÖÖÓ¯}¶≈Wb EeúÍeñ˜
±Zß\œÀΩƒƒ˙ìàÍfÏ+s±ÛYtm¬ëôèùpHa7'…Ì˜› ÓÜI±§óC(	1
≈i@N–uîÏ?’ªxê†èN®û¥µ&b0pizº‚⁄8çü/6 „‚˙Üú:»õ0òœ*^eÔqΩ≠D]*g˙z*¬qqÄÒSye9L5ö”{ﬂ„(>ÑŸ˙õ]√4¥ <ÁÂÇô›õãÛ2aÆƒ:›/n∂'f]S€D}¨¶¶I±5c-ìRku5L‘GÎkóËw“¶t…ΩU-ô¡íVµJ‘}n(s1My>¶jææ"â
W”é~ "$eXµÎæ©5´z#:◊Cn·~.Zœ-πÍ∂+f\uªÉ®∫ÃöÀEEä„(oÀc©∂Æöm[å≈PC§8ñ‹^[ÓpÀ‹≤°pH±ÂÇ°∂<lC¡êb^∞–ô¬•ö≠æ†ÈYŒ∞ —;fNV”˚›œ—Û~éæ˜wîuSZE|i§'sOßYF]ﬁÃ Ofi¥M	1?Íò•π6d∫|èô-Kïî§çØ†hBÀÇÈ+” À˛M(“•ñkÜˇÜŒ[ j"´°CÀÓFåµ• …HñﬁH›$oÙ+zïú≤7åöÑo;úä=2Ñ¸48©ñöÌ9û◊È‰Óß~cíc}ŒöFøÍ;Í◊∞|5¬,‰^;WΩÛ8uJ√‚y®Y˘ä˙#"qF„Ä≈.≈∑…Èc≈[6˜VÛdLå†ˆX·›c|]9\˘:w˘yVXÇØ≤NÚ°}•85◊ûë¸®-µ'á™∂ó_ﬂûˆ"`ÍaVV]AF'ù8A›4˘HûE.+ˆΩRãªeµ´tÕ0MoÑkZåπ∏ßÛ,Áå¡t˚[ìoIu47;ó7÷óQñóÓ„Ä ◊§ÙË[T˛(,%i|GOÎMD⁄èô|´™ïŸÄ'W‹!g xñt‰ epSº–hä%fÓbt	%tíJáG~‡‘R[z9Œc˘µó:g•óñ0ÌüS@¶€?±d2„gG~Ÿì˙∆nvoo¬·P¶ó◊_P'–´‹ı=™OÀ£W⁄PX´2‘Cö º+#E"m% ®¿ú÷u¯ø∫8ÀOk9ê¬◊Ì∂pBcóü˘≈ù·…h:≤ìï‚Ì%êÑ1=÷∂	ëM”ˇg-Uπ1,6I¢AúÔY˚XΩˆ À°$|æb‡ÖçZ…ÔF^«<õ»–S¬;~”=Ü¶˜î˝kx…ÜÈë_NàÃ„œV÷ÙH
å˝(kozF V›m±ª£OÍ©ù)™—pëD#ßÆ{¿uqîåreÑuô¸4Rr.˜ˆ{l.BK¬8äY∆÷öƒ˙qÊ◊œıÇ UÈÏ—¢M«ÙxÉëù≤5µ˙{ÀB¡K’clıGÆ«_.á±‘ç∫"◊≥◊ï◊N—QO◊fm¿®NISΩ˘D?Œ≈åncm«j ˜ÍU´`e¡tC≥
1@‹íÿÄ˙ÖS¿.a8˝’…”N‚0¨∑„Müƒ∑ﬂ>U≥gÄ¢¨≈Èd‘,®p,9Âh~Ô8RßˆQn€Ä^/“!NÊÑR3¢ßvM*@#Œ«“E„9ﬁ∞t¨˘F∂≠∫éÏ=qòËsÂö¶ô˝ù'\œMÒQfPG%Vúí⁄nc'¿©"L–ƒLﬁ«Tº"2ÛÙœ	π‡óTY0N >k9Y#6P3GiNvqK›^ëÉAz—+u˘UÖ°√aœ$∑∞≠Kﬁt]£Z»µ£ÙÓ,îﬁmKÈôÅÿO∆Åsı™°ûp4ßC°‘n]™b ¯™q†–Ö0îª®…¡cÍbÊ3•<ÜÜ¥:¶qî’˘ö{ö1‰*¸ëQy?“©ÌÀ£Æœéc¥™òTÚÖÒJe|π˚,≈Œ4"˜Tõ4Ò∞XÂÙkˆ4G≥:…bõpl≤‡áQä≈«å8RKUÃ≤ØÔô
(û¡ Ôm…kÚåﬁ˛S¨;ß˘«ìdﬂïL?◊C1—óç‰míIºMÕV_∂6ŒÜs¥‹w˝±HüDK™‡´∞æ√0s∆«p,(6 ∞§íÊ{H{=NYô◊Ç§]Yf<«uyÊû(◊uÅı¬üΩ“67ÊÕG‹f<*öÎò4LgëÕd£¨∞ôx’Ò>ˆ©8Öµ·®zeD)Uˇ´Ìπ]Á° Wç•©«fuì˙ärc+∫ásÂ≈√Mlk›ökßØ∆5/A	ñîe(›ô})J6,áv5*◊^i ®¶¢ü)i˙Vñv›…π„±ì¿g_∫háÎ¢4Ö6à7âŸ¬™Ü\ÎÂnd’lãúÙΩMñï~C ´ng√4Êv«,·¨N-Qÿ˘ÑÏ«‘yçÑ‰å’„.ÁW®O)¨…n±™µïâvjã∞'Üˆ≈¢äe JU∏G,NU÷Jo_bÚî›\ëú˛Œ p£ax3VV_µ(n]GΩZ/›∂TªË«≤b:1MﬂÏÎÛ˜ÁïDñˇñ≈“m÷Iôá:∂ÒeóUﬁÿ–™„t∂¸ˆœ∞Á›ìàÄu≠Î∫Óî
{⁄˙„
œv]ı6n™;tÁC¨ÏúÉÊ¿ÓÉMV êˇÿÏØ¨ıs§˙(¶!KãÒyà_b"≤ñÖd[…u≈œ˚ΩO®:ﬁÎ¿eV‰ñ^QfÈZ∫á’´J(§Û´ gÔ´˜œÔæcKd^á›˘\k=µ°mÌLl—ÍºŸaµ1’9√°ãlŸ_‰ŸcuD\7)eQã÷q·Œ2Ò=Àé¥(…2Ás⁄¯XÓˆ_BåUa3çPç	ˇ°øÅüæç=\ÈHØÉeÇ1f ®.ö∫z+q˘√e%'æ	} ]h,:è	áºéNà“}zΩﬁÛ¡Ô®õˆﬁ–´Ñ-DO1S.Ÿ‘3µ#MïvS{µ¥ƒKÀËÕz’OA¡â˝µ‘qÍ€:O∂Ì‘û˙ˆ¸$¶µ÷r∂k˛òVöüQ˝h◊ø’Cä*XSrìøXÁÚªp!∂æË.Ñ+±ƒ™Z4⁄ƒå&›ßn¸–ã~
ç˝ô◊nñìâÓ”Æ™ΩZ÷ûΩ˙“ˆ+≥U∑/W¨ŒN±6µ£ıµru≈¸ZµäGDÜÏµBØaT⁄B√/fÖY©ÌRÂÒå-r•X9p¶ü◊§m9ô‚Ñ¨´jÀ…ÿîV.}ÏKwÛ. Î•/F˜•æ]äœ¬£Îåﬁ€îaÆL≤QQ¸\Œ[≈‹^¥0Ãä2æMV£•µU˝¨Ü…†>À$xÍq¶¶-lÀ›bÑ[π©˙zA¥B.≥†¸∑Ve)g•‹3€|∏;9˛yÂL8`è'@á¶¿
X Xç∂1N V¥Eã∂@Ÿ¢}‡Ω-=Ïi≠V$évd€·3h`ÙR®¥ eÿ3∂íªNÅ¸wàÀ
·/i≈§z¥/P{8æ$«â‰8>jU6Ÿu∆~ Ú¡√"ﬁmãΩ2¿ÉÓîî‹Gﬂ%Ï)‡Aø-ˆ·ÁBÒˇ  ˇˇÏ}€n#Iv‡Øƒ∞ªáîG§(JTïIï§Í©©K[í´=[(L•ò!1ªìLvfR%ï,¿Ü±ª0ˆa`ÿã}ÒÓ∏˝bxÄyÿ10ˆqÙ'ÛûOÿs""3#ØARó™&—≠‚%3"2‚‹Øè≈Ö˝A≈%ç¿¸P˘^$Úçﬁ^§c∂?Õ›0Ä)újNˇ»Ùø8qkŒ4ØN!˙ıªB√rF:œa(˘¸:oˇ‡ ı4›ØìíøtS∫î®oπvtq=çBıõwFpY∫Æ9"lYæLıùı6˘≈y˝£8±(%hª¸R◊…'Â{ùÈ1•ÛÓ'ü`ª∏f·ÊÃZÒÛ|Ûı7?Ÿ∫»†)VÙ6z≥ó¥BÔπsIÌF›ç#`‰¥Qo’I}ë]_ˇ‚û‡Ædì‰¸‘í´ôô±‘é<”=57XòúÇÆª8óéu˚FaaJÙ*„fñX‡å"ÄG≈≈W`‹Uîó–<Ø\ ≥≤g˝SœÚm≤ã #ØÿD˘Ä1ŸÿÆ
√£Qs-ñ,◊¿XnwÏy.qœ7ÿ{ﬂ{èÔS6ıo∆AËú]5Oi¯û“!3QÆí—)¸…Ô$væ%Ô¨:å]U*"¬ƒ"÷aãΩ®,qpÜÆ3§0'&÷æov@îÔ≥ø—ë¿™d3h;0ç› §`}¥‹ﬁ~Ô:@œ^ê&yfπ÷ˆ_0W1r’Ô9√€î«kKè°åicWçÚzÃÚrFëÈ∆4ê⁄ŒxP€~Ìcî1⁄˙ˇ“ +…à‰/ã’õÅc±≠`6}ÿ˜¨/@r˚€aœ±»Ì?üˆ(®õK#5jkÄä¥UﬁÛPÇÎœöAàâGÄÏˇ]~êH<ÛBBﬂÉßçs◊´iÇXÈÈ8Ω°úÑW#§ÏÚö∆ı¿ÄêD⁄[◊4Ã¶ ÍŸ‹"mˆ‚w]ß˜Ì÷u√ @]¥ÚdFé◊ÄÜ«‚^f¸ÿ0l`à çæë«níÂ∑,$J”Å≠Û–7:…B	 NÌÓH¥ÉC£‡åÑ;^≥N·éMŸN;Âëµ\W“û£ÉﬁÄ=8!»HÌ‰;iéd‚ÃØôµwu†+tBv@Üwımz§¯‚<ª
§wµFŒ◊›™Ω!≠aÔ[¥;p´¿.z®k‰¬°Ôüyó[µ6∂ùU¯OSh€Ya_z tøgç∂jÏ k“∑eó˘˙k«˚[5`5bo’óªdy›m>i>!ç,ÈK¡#kêÌ%é˚ïÚ
!A‚∏ƒ*V`¢ÖÌ!—¢H⁄ÈS©ºfú1GQΩpñßêêßÎıƒ_†P}kx4(£QÖÑ∂Ä¶ü”∞≈&”‘•ß∑@ﬁ∞ ÛX¥›ÿú€\!#ø˘ïë,ˆKÆO	˝SqÌÖ#í_∑ÌçÉo2…ÉM∆øJﬁç/≈R>Ã∫Hpöìd ≤ 9mé<÷cP…ı∞Á:E§ôëí≤§Û‰¶«≥cô]í∆·Æ7åH_È´:˙Õﬂˇ"›™
û’÷ä¯b55#≠qÅ0–’¬±ÇZßÅÁé·®ù!† û	SèõE21Ä.ä±ö∞√0‡–&‰™vL~û^Ø0ayi‚“ÏYRÌuÇDI∂6—÷&€⁄f`µ2 _í¥y‰ﬂ˛€•3‡bÁcî6∑∑Hö8o˜&Ñnñ.·Œd”üÃe”G õ ÿ1óM◊I◊e4é‹ô`™∫Nù®A´ç[¡ 1n¡{•q–RÒl´	zt–ÏvâˆØ+∆4ÀÑΩ•ï∂ñêßc&cV££®»„÷÷A>2mËŸïÙÇg;Y+wÇÈ¿…ó:AZi<≥∫†k!„Û¸ÒˇÉŸÊπS§¡j˘i.lF–å‹|◊`=õË¨èíÓ+Å\” ù«®d¯Fgcã≥öZÈÇ‹Ë4fLŸD–éû)Ê:ÓY.®6ŒPñ◊Úq™ Îê:„Dd…ÏúNq’"Í±ç◊∆.Ô0Î≠¥°{31ﬂÖïı‹wlÇê†ö∫Á…« ïÎ_L¬uΩûGˆÉÔ∆‘∑”{Ûä¬ë`Y>[SË-I__IÑüQ≥õ¢˙eË+”z∆%Jd8íÆH–ÔñYUπÛOrπÛ⁄ÍVÍò'¿ff•àYi*M˝ÆÆ^Yòi¡3ÃÛ–S^xÌ«zEœ6&In&÷Èπ∫ä•¶ÎH;¿h`Õ Û
√ﬁ]≠`=0JJ)F5=F f+ph%9Ÿ≥’‚\Å∑ø˚nÏÿûÜ£™b˙4Û»‘ÆHb9†¶„_’æ¢!Ü∑iÆ¬ ‘¨‡l¢pÓçÆ<†ËR.ˆŒ¸à§¿òäC⁄«∫À3?°hn˝3ÇuÏ‹€!≈â‹™#‚ﬁ—%2’«ÛlÊ«√g6:úgwq8wItG!*e(&du’îÿ :ú¥éJ%oUâ,Bó∏d"¡†ñÿ3íLíäRJ=◊SÅY1SA…ÙÙÍÈÀ1^∏Á⁄¿ü ˆ|ÏÒz‘~(æmdfÚÚû„SUâHyàjQD%ˇ&P#ŸJÊ"Ù,DËÃŒG’’[ÚEg…§õÀHŒgdÔ»d[ ◊π¨ö^÷ÌL+Î∆¨zı±≥ÍùàzZ,‹ÔFsIñwk;s”4∫®r∂I8∏öf∂±~‡Êi7Æ≈∏E˘ƒ¬«!KäRﬁ¢ÆƒBPº\Påâ
ıõ/Ù™≤∞Ω1
(æ'·7eüØD©îY~Ê8%N5R≈L∑ÒäG?Œ±$CdµT¨ •ªìì@
6¶/” √rÜﬂŒ»˜.∞ôQW‘◊2êàg^ˆ‰∫a‚=«Ø5tÂP◊Njﬂí®®sOVbéhWñB´zïØ∆	æÙ<,÷îZ÷ˆYgπú©o7∑`ñÆ˛Ü≈tµiñí∞Îw9√ ¨X˛˙¸Z<˝OI=e≠I€-ûà<!∏ÑÂEø≥OÃ3Ü%ÕºŸ£.Îîì¯,ÿ|;CÀuÀı¡ç≤WÃÛWä∂S≠6ögﬁ U…aoä∫ÕÚy75í•pÇπ8mµv∂Ü≠À"Ê1ˇ™Â€º'ÓÌøÜXãk3Üé+µ1ı•Ê\]¡ ÂÍJyæVyç±Uª¨4TÄiíXœtPÑπél" Îò’≥e'∑–vËgˆeÀú1û¬å4;ë-†¯I›Û
~µêï”J4XcµDhë¬YÃ@“jûˆÆõ‡©‚™O∞ô+ü	˘Dtﬁ¯°˚â∫+UàªÄs#SUm;“πÊP>K(ïç#Á(B˚ã!Üéﬂ~Ô;è“Öàùıƒy˘uæ≈YQÜæ™ÛÁ“Ùü‰”Ù◊LÑÓ“ÂJ$‰.,®ìPpç^ƒÁÑ(i4Y+”hÙv_`}¢Ò$;ïF â∫3ÉΩÆ{ß>´È, ≈≥	è0∑U˛rñ{9ß@:ÉæxëËÏ¥!5vöû ≈Oäíz[”∫bÏú2¨%°U≤BéŸÂ[É·LºΩ“õˆ€÷HKÖù i[YI£∂Á$-iyˆK“◊P3ıZë…} â-ÿØq€óæc€pÜ‹Œ
G=πH ”Î≥I0fˇ *zMﬁcÿ˛y˜y¡!ﬁ|Òé‹‹lœ&éDkÓÂâÁækÄ∆%J[¿ó®∏KΩjY„⁄ŸôRzˇ≤n»+.lπïç/ı·´=ˆŸu¬≤`EMD®ÊS¢d	»2à±‘a≥Ù≥ã6O¿W‘Â∑P®hp‰çh7§ÊP–™„ÉœÓ~ø˘¶”eåè=ÊÚä#xÁÇ¬”Ñ»≈>G–≠∂"Øë>ìÙƒ'MrÃÚyw]∞{ÎZn,xCñÓëÑﬁhÉ,∑y")ãÕß¯;ﬁ*mÉtë Ë∫≥va8÷êa OQ¬:v≥ÿ™≠êïJÀ4À≠Î3ÀËMúKıŸŸÚY˜l];7Ê˚ãùK'`è˘
„cı$7Î≥ıUkÂÙiç·1K#Xøaæõäú¨F`5ﬂbzUº ˝˘…Ê◊6‹ÊV¶}gÍåÓJ?´ˆ≠ŸM1∫Ò9SR@6⁄∫n\0øTJmπ–v‚Îü =ÚœsCgd≤G“Z7à5ºb~ìZÒWc‰ß∞\Íoıw√µN©{±ﬁ‰<–Érkº ?[¶ùıïS¯&:k¯âh]/+îøzp/Òx∆S ≠ÁåæÔFÛú±W}QpÑWñÌåú´sEﬂ‚Á—%amv»g¥CüûµßZö˛I–s:¥	PÌ!á¯ß7˙ ˜Hmd¥é6[v~kam≥ÕdΩ7∑jEl•ñ–òLO’(-Ù≥vÁÈjÔIç¯l?∑Æﬂ¨.¯(i˚-R›KòÅ?œj◊¿Có¢ﬁº6,´u∞Hí∆FF>Õ]
‚.´¿Æoõ=ø˘˘5ÔÚÓÜ?å®¶êy“»ÚŸr˚t˝È2”ô≈S◊v⁄§¬ÍÊl⁄GòèÕ(>HaÃçœrmemÌlYÛ,ıK	D|YO≤.Ó’ŒÄÚjßÖ·ø ;•¥ÚTøe9;hJ°uı ¥Ó9NêÈd-∂ı'§¢ãun˘©mIH%Q›üÇ""ëYCªB⁄]â≥G’FõËmbƒEd°	ŸÀ≠ZAˇÜ+√ú·0bŒåÃhﬂË4≈7>—™«_#À∂¢wÜÁ»dWıoåI*´„£˚à˙ÉÛ¨m6`8©˚œ∫Î¥}j¢d,<}ÏrË«.≤C∏kÊ©ïÕ√bM8Ö<≠≈0–fCÕJêyívJõ®+H1gEdyjC}m˚ÿãSÓ2˜ÁÈqùŸ®Ò¢ÜÙõ€£º,Ô±`Ω«£ÕÚ∂ì9*∏Ã3°ôª4pµ®Ùjéà©≤êST†7≤Ïøl·≠IM^|ÒÆù≥ë+sûH˝0
‡æ∂]Â–)*#~/ﬁìq·¿äíÊ¨èí
¸p˜I˜ÌÚYiâ»‰Ä4^[æ#*X/d¢X∏ì‡RﬂÕbÏmüïÜ:s˝Táãà†Ãû%æ“ÿsŒ®Oá∑ˇb	ô%∑Bßæe[™,$’µ∞|yiU^æ\W	RÅObı0?ûıı=!«@¥±!îáÅÄäèGLUÊfê§“y+Ï‘r.=¯~ü`Á`§ûPÔÈeè⁄,¶ﬁã
Í-Â©+®®ˆ3ˇ”®ÎÂ{∫_œ”√˙ùÃºNì˙ú&Ò8MÏoö–€4C_ìÓﬁO®ﬂõk˜"œF[«ø_O”#µ'Ëü"„b=VVì\m]∑%b–;µªt9]aÛ§Q}M<Ç°6~qNñ»âÏ~∞£∏ƒªåtF˙YÇKK‰5p,J0fÖÛ∆`øP∑ÔÒo9K31E!≥∆˝‰°-"JwG€≈hJn¶Ïë#ÍluÂ¨ÀÉ7u´ÁÊ¸a0Mﬁ!&Vã†ü{•kt–Ùqô¯è&2ÄÈK„_P˘s…ÜïﬁSÚC.;≥‡R_•& åø≈ÔØ≠˙FN¨S≤µµEÍæszÍÎŸ∂¢euSû∆ÌÇú!9≥lˆØ=ˆÛ
;©e°Û3äu G(ã˜|áKúY-•∫<Ó¿N „¬{çﬁO≈•:Y…ù”f>N∂∏œ”føì⁄Q˜)7ı≈JJ»õÌ4w⁄<∞Æ®§U˚5PÏ◊¯$ßÓòGéß[6ìpDﬂs)˙2è)⁄rôw$J|Û˝¸√.ı;[êW[@¨Í∏tÄEBy˘"ΩﬁÅŸEVπç∫GîÑª´6¶NNY˚•Q≥>ÚΩÇ¢äv≈¥f%◊¬ ÈÎû5‹∑ùê'Ç3í\“i∑™Ω∫¯ºfex¨ª Ωb˙¬Æ*˙–p?}uc˙RER-‹¡/}â
.P£^◊π¸∏ÔúÖö◊FIıáÕ^—oX)zÌæ∂Çê
ISÔéü#òièœÆ>ÅC≠∫æå'bÌ˝æ˜ûèÑ"}„GAÍs…à%r°ñq1Uı˚<°¢&Ω¯ÜSÅπŸ'KÃ.…#’+f†Åù-õœy FÄ≈çõÎÖ•Óã‰Êë;Œ–;QòæD,ΩNÔ äL/{c7·?è]f›a‚”WﬁÖG$RTò˚R^^föÒÏ˜D$íûN%"ÇjzΩoãA#&*}khªT‹BÒæW¢◊√Ï +I‚ç!+)7îÎù–˝h¡-ªˇp_¬Á°ÌµZ-g¯—'ù∂kÛîi WH*0äÅÇ^éÄÌs@8ÒX5å¢uôÉAa}’N6Û-Å©kÆ à)T†íÇä¸äX{ﬁ˚°ÎY∂>Ï≥ÌÉ#f;W 4gÅ$_$µ∞>≠® ∏L>≥@Î±ç4=€r…Kÿ9◊∫Z»À;\<bñŸ^.ñ#K'ÅLi“ÆúÖ—°©M>4ñfú˘e5#XΩG8a€˜F%^äÕÅákk¡*
1“i“AsÁ5‘e4Áñ)‰‰‘≈Àe”K'‘VSÜ3 åD2}ÅÃP3∆LE1AÃLÀã[ÃÓ:πêï¸8’nΩ€^Zk3„ Ç1
T>+uì∫•Bó‚Gˆƒ_1C‘X$åM¬ª÷zwë tç–%`ô›]äyÙ1ô:°Â8FdP¿[;GG|Vz2;â'UxπcààXóM`ó¸]ø˘fΩ}—õ$R^Òñ¿¡2ûO}≠„3∑O∏a\b;∂.h"©]•˙Ç`7ìÅΩ1j>’h£ùsÌVAV*(π:a˙æ[^Ö=îòJ4b Æ3j7J|¸«_ˇ«øˇö 59@íÛH#eQY`·ü~Û˜ˇã0Ì„=w;ﬂs∏◊9{yπ9µ∫ä∫ûn<£NuÊfqóâ©!uãÜπ!uΩÆ…!uìÆŸ!uì∂È!uóñ˘!áä˜≈˜p@˛™tB…$6.NN∏&Kı	I…Ñ1v…+l∏'ŸQU¿*˙„Ωˆò¬øDû3«e˘Ux˛«¸»W›Æ*Äß¢É6@»–î0*ºT›¬™(û¶≤˝SKS€^nëCÊ™ÂQEıX'®
dQ&ëõ2)á¢ÎÒ\∞TÊâPU›dŒ„I√çX'b˛⁄v‘ÖZ"˚õKl Èù·hV¢+'—ÿ}ß:Ω@tÊûuõÈ¢ˆ“Ø‚{Õ˙J˚Ùª±„SªÚ¢|]ä—%ˆöŒ∑ô.l‰ôÜ⁄L\‰Sç˛“å◊£Î©bï^nU4B)„\∂"˛¡!5Z•xÚÆØ˙pÒÓIa/Ê˝¸≈J≈, Q·ã›ƒ˘÷◊j€¨y/|C[≠ñ^˚ÓkOÏ4ohÓçt≤iS]ÃΩQ‹Ωﬁn„Ω©´ì`’ù¬u0ÒdÏ´#\ŸÔô0<)rIzé}ØY`üua9.z?ÿ~«MªEΩqfoFÙ≤·S¥;∆·†Öa[Ä«‚çﬁÉ 6W#;®∫™eΩ©Ô`4˛3¸≥ãˆÍo˘Cı'y™~ÚL}|û˛ÃûÂÓÈ÷·Ì˜ÄL√G.ÎF´ºÍuhı˙Äπì“/q˚úÇU=J9#VÇ⁄ƒ,3⁄ó}˙·≠mÛ'‚ ç„Ω~m[ºôhêØ«pkmõ˝£3Ä6ˇ¯)ÿ:-Úszuƒ„≠@É»ê†ı>wz}´“"†ì“"—ó“8¶§Ôç/®6∞V¸~<‡¡aòj"¢ƒlû±“ ¯hÄw8Åõê/íqË∏ŒJ<LΩ¿ÄCëŒ¬‚{-€A¥∏˝æÈzAãºX°\ò/†>^€≥‹ﬁÿe[Åk¨€ºGÛˇ¿¬Ñ¥–≤îóäTóíØëEèOõÃ;ÄÜÒ
>QöæÖùÏJ{
=I√\TëK§≤∏Á$ñüÍ6dLñwF¨‘
É?E÷Z)kT§î≤FEã…YâıÚj5§ãåô$ú˘(∂ı™¬¨ãÿ‰â<Äõ,·Å^ˇx9ÎëÁÉÓπ>¨∂v)#∫ß“sÉÏºZØm√“XÌíÅ”Û≠`a“°v» Sˇ!¯ ·é	ˆìfˇê6Àöj∏üΩ<9‹yqpR€éﬁôØQÕNu2\ˇø∫˝LSd’ñl,œﬁxyîèu…}œÑ «√äW≠G‘F·»,ås´™Œ∞åÁ>`ı∑j˚óòg∏⁄Ì®ÓíËÕKƒfû°5)≈ëÜxÑ4ßz/*SüÙ@¯œôê¡Í≤˛˚«ªÇâ=IÄ7Y/,ó4v@ûyx–›Ω˝•-è‡r@Ä±nù!◊<Ï`√ÅœØ(Jﬂcõ…#QéCﬂû7Í£∞˘ÏU}·˜ ˚‘wπ¥'Ç:UpÎSÀ~9tØÓºÛÕ3≠EPYaHC/Dˇ™˜û⁄wé(U—Ä•>6H‹—“´ù5Ï¯©Ä7Èh´÷n-õS¯¬hg˘%!Ü¢0)yó£>EÚÆ¯π“§∑ÎœúÛ±/*(`#%œe
„Ê7Ã´éu&‘˙MIÿVAáP†]’ä’Ñ-AeíÇà"™k`˝ãûs
oÊ!EHPe¶;vµZXOJEf( .¿ŸﬂËQM:bFI2$bUIRé“eπ‡Í¥ﬁ2aJ ƒΩëefΩNÓ√√·!}Îú^4>`\Vü@òªl:p‰cÃ·Òa‡ë≥á˘m¶èQ|R8W¯+í¡.ú∞RÄ™I>∆$Ô$•£$oˇÆ≈Ñµ∑8/ì“«C)hö&>ÕÚîÄ…∆òÊΩ ¶Á„1T@fÁQBÊ”… ≥3»Ï¸ !söÈk'[hÁ„J€†#˚3çÙ–ƒi-á<ÄÇFt\ÄíCåÄúÏ¶ÊÀ∆‰WUΩ©á¯}"r03‚(¬°ÔœÛ9J¸ —≠¬ 6I·ƒÙwâë∞Y«F¡lÃ)éO˜iß™~î8Â^< aáëÛ‰9ƒ˙≈C™ò}äNˆ)ÓË(rÎa’<ÄuÅ'ò7ƒö≤ï?ú≥ÉZíhî<\Ú]Ú|m|7ìgTQã¬í9Q ∂,Ö
Ü®NE”OF3LG„er~îÚúìø¸KÚ#Ÿ˙ØQŒr©6jGûOŒ¨œ_$A6Âëê˘˝EÅ"ÇÅTÉHÂoäÖµT·»~TSdh·ãiS]ß¥Æ≤äsÉŒkÄ√-åi	Ës◊≥¬îÁ7£≠öâè4äW8VB
MÜÛÈ7Ö£%–n2⁄{¥Bé'Ÿßı‘öoHﬂø¿ú-‡qÏÚ#v~ı˘5&ÿ¥Üﬁ˚∆¬|:¥¬~ãï
4–	%‹O+k≠`|OùE“]∏y∑®úÁõ¬7H
‡5Ô<ÏlphQ_?äO|#ıM~|∞‚’˜ºOo#>cım^‚rÊ{!˘†PL9sÜ‘÷Xu¨õÛë]4µC∏Ò/ŒÄLŒÛ5ÔQõ≤ªF≥H˝4È4‹˙ïÃ√?Oƒõt&Æ;J	˘çcøL5O'3OßtûŒ$Û:“√$bTfœƒìO–ë'ËîMP*n°"{Ètb$nA„M´’Ú3_.F¥Ô≠íìÂBŒî˘…È{t≤†„;LÚ∫„õLÚ∫Ië«Sˇ.9∆`Åâi–Ï&Óq1ªGò≈W«ÌC‹d≤ÁØåÔ–òCQdYÆ≥ï∂íb*RŒ§hö	™ôï◊‘ §ƒ'Ò∏+ØVO~B^{Óÿâ\œC ]©GTßºÎ…ó¸ £DûGΩá-å˙Q=P+ ˚ó¥7IËÂ∆âÎ,©“M≠™jcø¥ö≥kîP+-Úq≈òKV1FÂÕ1Á´¿r≈ 
[DÀÈvY£»û»Ì*jseÿßñ≠∫
ØÛ´J«$[ëı¸$.#C™Yá^£8M!+Aˇ|yÑ•∆QAaöâ¨ËgB¯&{E;Ídñx√Z≥ûdç@ë{„n&í5ëπz∫ô
N#œ∫ãQ}Æ;ªE««LàÚzÉ¬UuÀµêv3<ıÏ+ıîy‚…äË#;“Ó∂å‰ÅÂa‚],¡TM,xLb°%˝âv«´Õ–Æ8â+KΩ˝¥.0ïZ÷∂?„Ó•ïMnã‘Ó}Ubs|≥ûoT€Ê∆äø…< ?ü]Yπª§ïv*„ig5±Lx§.`õ,ÌÀ*˝ªœ≥_ñ?Ãxòÿöß>ﬂßÖÁÀ∞ïÿ[ò⁄WØ¸ 0êg6ÎG!mx§UÎ˜vWª
ÆœŒàGitÑ—HU«»7¢+£0!ÃˆŸRL.«¥¸‚P	ö"jS∑õ«Ï·H»S RÁﬁ©s'Ä$v"I3¶l-ü$1ÆîküônôÀvR≤0/‹‹¡Ï±{œÜ•U	Ì¯í–áÙ¿¬√Nn˝ã$-î∆"π∆Í•Œ`<xÓ[¨–ÛûsÓÑ+}ºêr¢> ˙Î≥pø¢¸“˜1 /C£¸ä{>¡SQõlëúåÕk\‚»ó 1ìmm!=k8
ìWëı6öÿh ÙóF7Fˆl‘÷qìñØHœ¿Z2Çôi∑d3So… Ü¶ﬂíQå‚ÚK∑Où“®)øä∫È‚ú¯’ìR3N¨ûË"ï>;Z≥.APZ(”WÎQ-e\UŸLå£V≈·"¥ÙMœQ≤  íL≈ÇàT≠#i‡ë(Ïq_èL Xi~µ ^˙ˆ„≤¢Z‡nˇâ∏h'në◊^Ôˆ∑d‰a˝è¿Úâêû5yQã[ﬁ•œßtÿÎÛnR¿ıÜcÀ%Å3πîU±Fth¿˜ÿDãX@$öÃèJânˇ6ΩD3ùkav>^8zÔ1∏£VfRØÒıî7øUµá´0ôüí$∞÷√¡†"HU˙XUE÷	ì«2Iñò;∂ÇF1^…ª°'iÏFaàr™/l‡ëæıçÖÃqH Åë∞’˘eìdóU7TûyÜ™q˝@\&äÚcÂCf©∂ïi™©:_B"ò$„4-RÜ˛j’˙í{+U8îÙs[Øﬂï’´,¶[
å|ÆñÀ™cuŸﬂU\(kGeÀÑÔ|ã≠5üRŒ ‹gz-H¡‘i£]]ªÆz∑ßÃPxté›V‰\5˚ A~ZÏúÒ&©ÙQ°ﬁÑ’•Áò8/ÕÙ√(ÕÙì	@©úéèJí≤G&¶≈íU‰S&∆sÍø>y9(∆Í€ø„IèRKy:#µd•4DÍ9∂Œ±ı∞ı£*ñïB◊)k_ÂsÑ˝#lA'A∂œÕ®ﬁe›¿ÂWââ5	 ã<4íûUUôò¸ÖQé´fÌk‰{óŒ¿≤≠ís0K©'πg[XÃ>⁄4Óf•ÎDUBLŸ°arü…Ñ’›—<ø“"Gñèõ—◊7xhº1Îµ[^
±*Õ^U°`EåœvÜ√
˜za¢oæg&B3Ô	‰Æ â{»aﬁAÏq8Õ?¿Ë¥≤¡ÁÊ.ÉÚ¿˘ ‘nyıRΩ√ÊáZŒZ´º•?∞∫ÌîóY8¥Ü„ê˘ì*,Ì†™sÌrª∏x˚J“›»•ë Úù^”¿PŸ7∂∫O´.¨±‘óLYSpSÁ>|Ì£á0´VÚA)Ï)Í*2Za*&¡)ôêﬁ x«∂Eß–5Í˛=À´õ‘·tÜL(9…◊ü;à∏üÆ7¿æKDùwÅéI≈>S’UR…NSñÇ?r«At¥mv¥∞O‰gûœ∫Ì*éVM†<˛äü‚¶7—A·¡©òe cywçBk6˙_`˚N/oâ¬bmõ{‹πﬂ‰÷^C"W>ÔT?UÙÆ¿ó∫ÌS}U’Ù,›3ñ™¿[Õ-Q¡í-˚ûsvvË‡ê•e”E¬ﬁ¿¶i◊k–Kë¿GÁΩ™p¸LéƒàáKH}`ûñ≤{¸IíÏ£=Ï$Ã´⁄u‰÷TIå≥å@›ä€l¸àÿ≥fÈ:"l<¥f4BY:Zm;":2fjjΩ Z…Kî>wäˆÈW‘ŒåÉ•~TWÅ“ ˘ƒüè∞ül	´`Ôÿã§nS¯h\\+yıü—(Æ◊‚R;ÊdV™«¢*ÉItöh•_
ÕO~M ë,L˙ˆüÇè ï≠Ö”ØiAÆö√†xi√‡TπH%Jﬂ›í‰5ﬁ• amO⁄Ò¥Å-D'3∞÷¬2¯8z>‹ Àè g9CÕËvˆP¶®iö>ipzâ.¿√fU6)&≈ä@:RNê!ùó,Ã˜<◊Û+K‰ˆƒ	]òO¡T £úﬂ
˙ùîh &q«F™ˆH◊Nÿ4;Ü¡ÉÁ|	‹ôSÛÂ%ïppäX^€>ÙBÁ¬#GñÌ{Cñoø°YÂTZëVXî¸íŸ€Ä≠‡>9üqfLN∏ b^óaVö¨/È¿a‡/(Áqë›~‰9å£H
 ›‡r6»ËOø˘˚ˇN¢H#À'|”ÅûƒÄf}$øÆ·9Ü(OèœœiÄ∑-ÀuøÑç‘“s|øHŒ_ÿó⁄âÙÈga#p•Gπ!'‡~ﬂbøb˝õçFÜ’Û|j∏n∂⁄¡+ˆië8-7Zr‹ëŸ¡ı
cﬂl«Ô&Ÿs|©ì-2KZä∂—d&ìYt‚™“◊Î”uc™<°^@’Mπ‰óL8ÈÂS!Ä∫±äí’Ù$4ô{:2ö©jÕÂ¶Ø•LE"ãû∫t`ëÜ9ÄÑòÏ^—6£“ë<qﬂ®ÌåY?çÙxì‡$4}"~*åˆ•ö*Õ}7
†RŒSÌ®4ˆ√å¬ÿ”üMÁ·6ˆJ´}∫•Qò~∑}<>ÂdŸS¢£%UÂãßÀj€ÃÕ¢L"„l°ıwÅ©u]¶¶Øö˘ÒDÏπœ¿á˚áfÔ¡;∞Æ®§=x—}úﬁªëX˝‹w˜®}wê=:œ]?è kóﬁ≠πœnÓ≥õ˚Ï2/m](fsè]·kÓ±ªcè]! Œ˝u…kÓØõ˚Î
^ö˛∫<zÕΩu…kÓ≠K∆ò{ÎÙÔûéªÕ}uzØπØnÓ´K^s_]Â’ü®ØÆêÄŒ=usO›‹S˜Pû∫»¸zO^∫îµ˜|t/«°oÿÀ¯Ó°Kî˚ŸªËé‡zÎú¶}t¸à>Nù«÷>˜œ=jˇ∞G‚ùCàâ}tè…/'Ô“‹+7˜ ÕΩrôó∂÷#ò¬‹'W¯ö˚‰Óÿ'W ~sè\Úö{‰ÊπÇó¶G.ã\s\Úö˚„í1Ê˛8˝ªß·lsoúﬁkÓçõ{„í◊‹Wyı'Íç+ üs_‹‹7˜≈=î/éõ\Ô…'ŸwÔ…ós¨ïÔ6¢®∆q©åôìå™<Zºº5+.Íë/©oπ€V|XÉí<çŒo‡= È&Cíü-ál˘u9p©ÑEÔµ;(¨[âÏth3{ÀJráÕrçNev–32Ùåh∏oÉä?<Á˚Ö›_´$®qıÒó ΩVË˘™>¢Ò«}ÁLŸπtÇæ´tYù§ß™iOYÛé´ÒáVØ|]ˇ¡±¯.»˙Å∑|ÌÿaﬂËéÊ«‘æÂ%ˇW¨åæŸ≥∞VıÊ∑Ëü…a«l
~Ω˛¯H¡F âÇ∏ﬁ∆ı,pIë·∆õ∑⁄(ñeÌª$≠}è‘Z}Àqﬂ{œo√æ¢ç3À™‹∑›Üe)‡≤Ÿ-n	[X±-˙ò≤¢$[nk†÷PŒ¶ú¡»ÚAcyN{}´¨›pb®úäy„”ÅS°/¶wl-ﬁ±ÛlHÙÕìh£$ÀUºgôV≤üõÎ"i33l¡˝t#¿R˛ÕuÓK.Ù2õoÙ&0 Í⁄ª}
´J)s´§ﬂ\≠U);◊4Õ'±•ƒ±Â^¿¡e:'k!æ{≈#,ºRç∫⁄Ó\*úl.ùJ‰Ÿ\B„ò7l‹W0XJüŸ\⁄: ˙#ü@Ehƒ0Æm◊⁄Ïå@*E=¬:%÷®üπ7÷ù¿ER∑≠†ÍYæ]/})≥|ØãØ™È…ôe≥Ì1H)+Öús_à≈ÏEêWåÀø™ó5≈ê¢˘ñ7»k'¿wL'î“ê˝áçlxI˝¢õ·„çgÍÀﬁˇûŸã˚∞≈#DE#GmªZéÓØ‰té4˛ó:rZœ˛ô”ª˝æÁX≈;ºπ‘_1óÿ|ü¡É·àæ”≈√∑M:_º˘lôÆXO≠∑2ô5ü∆õÙ§Oo#ö‘Õß∏@∆í 3æÏ;∂z%;.”Û\≥f≈*jZ~ànò ﬁ
ÛÜN¿ôÄÎÑW†6Vt◊(!÷
Ìrˇ˘ã›€øﬁ}±Cˆˆ…ÓÀØ^Ôø:æ˝õófñ	nmè7^Ñ;rüñpdÙ©;"ñÎúõ8We6)òÂ}sÖ°À
Áâññ%û»øÈ§Q®`_¢”–t{1<ÛÑ7sùôzﬁÎ‹ZÖﬂ¶I/`éÄ€≠”¿s«»ßΩ_öKœ¬ÊÚRá4#fhz…æ¿Ü>ò¿ü&Ó˝ıwTë ôØ:p	êå£	ÍDp÷&ÏDõ|g£o1ˆXƒ◊	·D)Óo˚m*¥c\”rõi†Â_j¯W)–!è ‘√pc‡ ŸBq¿ÊeãÄ^ë≥€ﬂNè∑/†,¸ª±e£'@˚≥==F”Œú–j©ŒS«>ßaK´Ùùlˆ;9‘«ÿÚ‚Nl—∆Ö®.◊∂˜Ov»·˛W«;‰èıœÄ∫ØNˆáüø8Ÿb›ô–4S»•:ÄuGF:3KCmÑßÄn;(q"qîÎ¨rúõÃvT\¡∏OasëZâG@Ã´(f±ôom`s/A7uÄµÌkî-Ï©ïáB+Z∏¥øp£¥¶Œ∏[ƒ#j€K‰∫Q1®;áVÿo¨À∆r‘Õ+s·πgπ‰œ†3ˆ˜zÓ\Rª±ºpÛEıZ´ƒ•˝ïp„WëÍUuZö¨Ò°CÁ4Ûiy#ƒ≥çv{≠LVLù‹ˆ·Ìo≤√®◊ˇÍ»lÄBËﬂÜjTv¢É*2yëÚ«!Ó3≈5E#2“òaKÏÏÎÛ—RCg¥ÿò!Ë∆é∑7Ì_µÖr’Ø¸ÛS´—Èv£ˇ€≠Ó¬€	¬+H–5yèñπå{„X‚gâLã£næxGnn™)ù∆aò∫c>6åAÊ·xæ“å|zqà¬&ÿSF+”#Íús|«óROÈLıè'ã(3Ao∂¯G®€Ë=[Zk#‚$6£∏î´¸Qì˚ù˚éM*§HÓ˘FÚqïâ$∆LQº]ŒZ,√‡≤S¿T€•‰‘˚,ì±H)Õ˙√ÑN«$my˘ÏÁ˚'/^øD∏`(îπRÓk=∆5Rù›c‹äÁ;(èÓCÁÌ
éBö≈øqÒ·£›±√€ø›{±Cæ⁄ﬂmÕ~¨ãÛWÙªÖÿ
Î#›ì£W/æ˚ﬂnˇfF(˙0zkÅ6kÄ…mp	ú{_ÓQfAé?&Ø¨˜H Å∑√ZFû/Ï€òU8`H];aÜå.ß…háë—µR
 -ÏÓx0DSÛKê8∞¬ó„–ıºo…qﬂ¬8ÆädÚRIUïFŒõıÆ%	‰R€ﬁî©2+zM†!U'°Ã>ÑÜù6∑ﬂ€îo™Ü‡S`ÕŒÿC“!4J0øä¿°ºÃ~-&œ„‘eê5üK·Ç5T∫“F¶3ñáæ¬É;ÃÂ·√∑*MA¶Rºú‹⁄U•“@≈Ñs5 æ?l∞˜æ˜ﬂ+s]UI…≈@XÊÕd?ä~ÒÎ]ÄÑWh|æ˝7–»û√≤QIC ÒÇñ*†ó`[Íæé—æ Æ≠ëH¬ê´2€˘ã{í1ÃWG*¢çÖS(›”J@ÃEKQDbêÜq‡p~ô¶0Ç¡Üqò≥ëgbÛQ ©®€Líƒ®Ÿ&ÔënuÅp©∂G\´´&‡èîWD
ÃZ©ﬂ±l¿"Ω\œ≠¬	Ù«÷ÕŸŒa';Xºoeìî÷ã	≥„^1Ë·û¿ î‚°©®kô›ÊÏÄHrAùê«Øœrá"öùıuŸ÷\a§ƒwxƒ∆ÉŒBÀß,(ΩQo’I}±ÆeN∏ÔÕ;°Éë'¢ggπu≤âç¿ï
^-Ñ0À:ì]“@xçÃU˝\’8î¥ÁçÆ‚Ë/dh'¸2brN5›-4È≈)â‡§“X,IÆïí9/≠zÍS⁄ıFé≈SZ…Ì_˚îâX'8Òıo;ƒ¯ÖòÔì?˛„ﬂ˛«øˇ∫ÚLU®Sò{$Õ¢≥Å°†Ÿ∞2†Ó$\<ËA∑ˇ
äPÛ»w0AÜEÎ˜¨qL¿P ∂ßﬂ+ƒ6Ω]ô@xöÀ‹…GB.†Ìa–òs:vÑﬁ‚fÉés ·ã∆uN≈åå≠`‰:a£ﬁ¨#q∆H⁄Xh}‚H£æ‰ya¶bø‰,≥.õ˝ÊõNá=clŸΩjZ„ì≠ˆ˝Îóß®˝∑ }G"†)›ÈÑ√gÄaﬂb¬ÊOu|É‰ì…‡ä∑ÖÇxë ·ª∑ŒÈÀ3n…›*∂\≈f‡/*4∞ |O,¯oxµ–‘∆dπˆY™AX~…iW'(i÷Jj·‹îàu·Ê	Kïe4û(ÖF1-cÄ|s˘#Ëóe(fœòπí •KÎ öôÛâúXz‘7Äv9J˘TtBÛq5”ﬁ }0	Ÿù⁄	S<Ã!((c‚y7L°ß%∑É∫ÓÉm—∏®2¸º:U0¢ZÄÖö$+U¯≠$“TZ}füãXGJï“ﬂí¢okµÌc:VLf˚bk
í™oöÜ»X‡Gü∆RKkö<»)Õ∑⁄?¿rﬂUÖ˘bH}ËD˘ÇÄ¥≤Rl3î,àçx¡<»w˙ _’OÊ{yÑ≤Çb3®ì»º  ˘äÜ≤3A!&;ˆVçhì#¨ÄèWõπÕû≠â<Ü?n¸©Éâî(≠≠2iÕ¿xØÆ!àï`K
≈v´9∞∫:¬Tb}Œ8˙¬·Iwp˚ªÔ∆é≠îÌã•˚uM·>Ö	˚œ,ﬂá%5æ¬• πF1Ñí7ògFñ…è	{”yÔúKê&aÌŒ∞oe–¶±øÎxp£sì˛˚jπÇ
:·‹¬°≤#g“Të]∫ûe3¨€	éæ˙≤Q/ƒ¥;ú≠Që‹\=‚ïn™Ïmd;KUŒJæ\Í∂'≠wWÃzf9óñO^@LLY#wOÏiT´´,ç•Wk≤h¯XM–ÛÅn∞c.;·Yô 	©ãøõ≈ÅΩvÇ±Â:‡–@Ï:°ÆúÉ:äbg ≥;¥.ù[g∂á7MdQû&ÙõO™›∫≤}˘ƒßC{œ
≠H(ﬁ÷©Ö¸ä#eù∫¥’rÜ¿ÉòJ±UÆ¯EçÙYÚ∂¯§‹÷àósÊn√j∂
◊xCñÓQÉ	Ω—hÚ3Ò∑ò6±Aöx{Í¡¶6Huµ≥”¿±Ü_¢ÑÇIÇﬂRî\ë\m’V»Jç0nœr∑ÆYÚÎç∏l´ˆŸŸÚY˜lΩ2U1ûÈ/v.ùÄ=„/(åÃ O’í°÷W≠ï”ßí¶ÜÃÎÄmÉ¨/≤</~É‘ë£’·Ò¥¶˝%õ6ûfıI∑ª∂~W”\·ﬂL¬¬ú‚˘™òà√ÒwÒRñ€ßÎOóÕñ2: \»Qı6˝Â«âÁπ°3"‹∏ íêAÊß‹@„¬"â∑}∞˜öuØ	qŒHG`:NÂÉ⁄Ç÷çë=Ï€Û◊Ã∆Ê˛ikd]!£¯iÀ–¥«ﬂÚ”ü™lW—Kÿ∞ﬁÄöœüX‘T`Û†˝‰ÛkQÄ;k[°w‡aéÔqà¡-ç˙(l>{º˝-ãŒ`<xÓ[LºﬁsŒù∂gus&Ÿº„ª˜Vge:’§¢µÎ,Kó‘quÌEh¬Û=«˙!úœ	s–ÙøÁ“yÔ[(KkÌ"»≥a…'úlÈŒ‚hB+B,éPcO∏UK®B>m‡I *Åpã¯ÁÇnDÉ9s\Pçû≠¬´FN-ˇòß’¥'\Fßb’2ŒVWŒ∫t⁄e§8åó¬Æ|“Ó:mü÷àoŸŒ8ÿ∫~≥∫H‡?`Ì∑7ÊK9¿‘†,ù„><4Ä√áå◊äif—2ƒ·Bjà_∞Z [◊+7 âáf˛YAÿ·	˘{ÒókZ µπî‚¥*¡•ÄÀW⁄°å˚ÙM1Ö ô“Á
=ê‹‘fÛ¸>Ù≤$¡€ﬂy∂w◊∂4•·byÉ0ëF∂T8Cr¯áﬂˇ@¸zÙ?yô<,Î~|y"6Ô?≈±yqº¿äÁ√Z™ªoã‚käP∫YJ“õ;>µd˙M´’Ú(DEßö}ÓŸ{õx%ï“Ò¶Mœäà—Wñˇ%“WﬁBíΩ]¨R]#óÀ[µvç\Ò.;¸¸£◊ëbÀTÔÏÙ’≠Z˜ã´[…∆¢	sÁlç˜íKo]∑[Õ¢”È¡◊ıF◊cKÈ]—pîhlˆ}i+Y]ÖÇÜ›˚ˆπ$?€‹R$ªº◊È—∆r±ÔõêôÙ∏W.≤Û_∞˘cw·≈43TÍ	â2&û-íNI=¶%ı∑:ì!∂Vãº“ö$D†à2MäÀ7B∆˚n„≥Á2BÑ6óbRm≠0f¬7;ﬂd•·»{Æ	5~qæ ¢Po<ªXÙÆ™∑€ßƒD_¿˚¨∆GC+äΩdáÔÅ]QéEÃ;.jçhT√óí=Ùê ≈Ò’ }QÏ*¯—2RP4fœG?I™ù3\ÕÇå3E)ü`⁄,mW2Ô<Òü÷@ƒ≠<]uï≥ÚËÿM¯˝ÔC∏9f<˙˜:pü¸«?ÊoxdZ6»OYÒW§£Ù¿ê∑Ω≥W-®„¶“3á>L
3ãñ1hrt¶≤3aA∑∫Œ ¨_Ô√Ö\L~Ûÿ6#†¨s]Àp§ºÑŸteÿv0qU°Åä—’pû2íºO*© f?•!∞cÛàé√#¢ûèMàX› «=v&‰»ı∞Ú ØïãÊ!√5é¯à≥¯FÏ9¡àWï€êΩ∆Ã«@ÀjÉ‘Û0ëÑ¨¿v«çù‰/…/·w∂LêJóNõ@™Ô·}¨”R ÇXyW∏œ~rÒ 0 9LåàÒ+:DÚ‹	Áq O@t≤Û0ÄO,@∞ƒáéÀ‡ú:ÎÊÔ&n˛n‚€ó]˛3ÙÛO·÷Á÷ú!ìÕM‹?≤?˚ûBJñ ∆ ÌR´˚ˆº6] ANÂ≥‹•èy¶uû„?W=k¡kQ™eYÀo∫ 1´]îh˘ÛÌ†hD9_Ê,:9g8YlÅévƒ“ìq◊2ª X◊Q2òéÇÄy-¸ÅËef $π1SLyÏï√hò‰≠ ∫Òëàr(™∫|ê7Ì∑&Í.æ⁄ÛWiMÑıt£\%$≈N++©
cYú€ìˇ7j•öR3©≠%Ú®üN^çøfyl$r>Úﬂ¡)OA∫∆√h!‡ﬂ(ƒŒ¸J∑ˇÙõ_ˇ◊"Òw£$(ÄæÃtŸêñEr0%_‰‰L≤ ˇ˘wˇÒÔøfr∏· RDà-ìì¬8Iÿ|5¸ıˇ¡≈ƒÁÑƒL≤e29ì6- ®â±ñaI/î'∆blc£§ı#ﬁ)êØXÆ$≥©-t©~[»H>“a/D¥ãƒ	nÙn`Ïö[˚Ö–ªMò«Ÿ}o5Ôa'1ka¨yüÑ.¢º«œÄæ†”7O„∏‘*7ód!ıá=coøwùÄ>xÏLqØ˝E∫.#å‰4 Ì37ﬂa∏ÿ]d˝¸ ÕwqÜe.k?≤5 ∆~∑ÈúRb;ùŒœ*yux÷ òiŒ;Ä|c”;1—‰Våí *·c ìíäTjU\œÄdR≤_yÉS“]+`Mûü]5ÍﬁdMmfí¬ı;πèk¥Éà¬i÷"ˆ≥ÖJ>è8∏¥Bûø≠ı_OÍK÷Ç(ùäYøyßz>5√:º˝D°(ŸñéŸÅœ=Ú≈<ÚÉèó˘†'Ÿ–grìVÅ“Ò2 ï±ßÅ3n·iê)zÛ—s8<ó√$N‡ô¿Òp4ƒÿ˝ é{∂Áwwà)]Z9ÅbfD·a|GíËœàÛC{-2Åb´¸s—Pp˛äåÛ ?3“ÒÓÛk|Û≈ªõÈ‹3H$åt¡ ËLòbÊ”^¯0	flY{‘ãCÖ8Á$¢ì-„ÆRÇSΩõ#º<ì_∆](_ËUj†€˜Úàb&*'è"ò&ü‹c=t•È±©.±k®bˆµ’'´Oçf◊ãì˙Ë-Ií&-U;¬Ç2`N∫Û∫Fvvo®S€HT±±∞Ù⁄ûΩ‡Âv§X¥¢•ñ÷5JAüó9 ó9JmwzØüΩò∞ƒ◊fü9;¿ÌØÄØ˙æ‰Y|9x<ƒ«2pÁa€ö¯ˆ°Ïz:πﬁ≈Ò„∑≈◊í(mL(Í`\@y6Ûc]/˝Ÿ/é^ê[ÏÄ0°•»jk÷ß[R∑ûôè±π,¶XJ…~˘'N…xê%+pñò€{”6œBƒ”m‘Pf ©mß∑ßº(bv˘\√äPª+º‰9<wœÀ»M‹Ë±∏°k	#-Å“≤Ø˚´yR—?"◊T≥`±âHT=*wjÎƒµ<Jµ‡IL„ôÜg¿äAêFœ=”†¿∞]LËbb…˛ª<Ÿ_pÙ9•ÒHﬁ":˘‘é±ﬂÎ!´ê´@”Œ«éHØË7çG¸⁄“sÆúï8€H? Vù»WËø˘¢`]¶ÿóÓ>0«ºÊ•∑g‘KÏ∂πû(x‹«Êª}ä≠Õ£µ?ô K∫L¬Ãx‘˛ô”sDù~õíûá	•»±\sD·ïÚë
«móÓY§Rüﬁ‰wk‹âçÊ©® =Ã9∞Æ®<§ôúm±…]x“¬àœwá6∞ŒÒ∞á˘ΩE+‰ıŸ6r\ñù∫9ümWYS4}EÉ€ﬂŸcègM›7ÜvR≈x£˛]MÓãﬂÚ÷2≈EÎ)6ß≤;'@‰Ëë3Ωut “Gá≈©∞ﬂé∞ZfH}¸-jÄ w„,X—˛wcÁv@àX% ¡‰”nZ>Õ"8[¸·4©÷e–SéÈ_•æC‘?B˚5ÛÀ?w\¶óRrÇ	”VéÄNªΩÙT'4æ√Œ-a™SúMœ¨±õá\q≤N4ø˚Ä[:ÚD∫)‚¿Nö"*;"ÆñF˜aÏ_Qå≤¿æ"î—Áì:'bôkx˚/\∂frªLBc«Z≈°â9YgN¿ÊÌ±f;≈mä¡®∑ˇ<‡¶òv$|BÖ·ye€ÚCBw[ﬁÃΩBDˇ8ø˜¨âN1·ya≤O˙«?&=k∏o;°‹Î∂¨ÎDuØ0ù–´8¥¢omóÓ¡⁄BzúZaôÌXÊó áÿÀ+≤J¨u• 	¸"”Lj¯•Ï¶Ù4±‡"‡}vÙ'Óp⁄.GlÒ‘•ç )@ØÏ˚Q‚âÔc üø‘q‚[AøS¡€»˛eœ;æ‹* çR∏∏)ÓLSõQËK»SíW]ùÖ|O∆ñòU·…õ|˘%ªíj"˙úU«y)¢„ ¿´ºh˙~›&¢˘>;R8  3%=YÂﬁtïÓ§'r◊3Ø76êã≤¥Ø¯É∞|∑≈wr#RC8Ûxkæ≥5å2⁄>Òí¢√E£-ø®låÎ(B1`…&ﬁ®:¡$öí%åx£õËT·Ì6˛QMWñ4≤Éù
©ØúO∆˛∞H)`‹,˜ù≥pR@f7œ°8≈ÏL’l]XékùÇ»äªËÜweoCTÈU)¯Zéc@¿Û†∂£7™e#.î!Ie@∆õ˙±>√?ª,úµ˛ñ/æo∂˙~≤ˆ>Æª?’ögä◊ç".A~Ñ! uÏÁñ√Ω‰ÁÖ{ëñälÈ2^≈óXû÷XH™o*Õ,¶ÀÂ˘»ì¡7§>¢5£0fh}‡`ËD§ÕB|)TÛÀmFBIåÉ°Ú˙bû3ƒmı.ÀÑ˜ÕIFf€áAô·5ŒµFXë≥†™,\_ô‰Ûı©eó®–O©ªÖJ‡r&Ω¸ÏÌ*k$*£ºjäxñî∆p˙S‰éæ”•F´™\)g8ó±˙Ë≈iC˝5ßﬁ•*õ]GÌ≠Î¬2êmØTƒ±™T±Ì9±C]åÎ:ƒràx
Ω"@∑é≥“(^=r+äÎ°¿A42«ouL'^∆õ∑:ì(ÆPfôKê)d≠LtK
1W∫ÌByä)âÑ+åÇ@å<G’Ì_"É ÷)}¬‰®Í€Tuàä-ÃÎRí! Âˆf§ñØn¢™Ã˚•:FiFo	˝©mc¿}’êÂw&5ÊÃÔN”=&ÌN?LîÂ7˝HG‘vÏ¨à5˘∞)w≥N>Ôô!ZˇyË`é∂“ÊmÚf1j@ˆøkM=‘+œ}¶+e7ıhhy%ôÄ£)áÃƒò|1ıÄÃÖ’†Y±ÓIÜ˚ˇ   ˇˇÏΩÎRW÷ ˙ﬂO±Mªªä”EA#R @6Û°À»›sE+©L Ì™ÃÍÃ*¶â8q˛œx"NLÙDÙüôòΩ…<¡<¬YkÌΩ3˜53ê,ŸÆ∞Q’Œ}À}Y˜ã´ªOr˝Qq4ÕN˘ˆ˚ˇ˙˛¢º∫˜ÒBß>6Ò–xõì”4‘LC¥çèÆô¯RH˙5ñ^O/ÃÎ¨yM∏´âûıÿœIo∫ﬂJ>QÖz–~À±∫OXoò›ﬁ ≠±¬ÎZB‰*·y%”ñö%ã“'ÛT/9X®#»Ql∑
Òx®qˇWsÙ$¸\E∂Ò®YhDv´#„5wÀd R¬À≥Ë¢å†|—™⁄(’=Õkl[ò9â˘˚ÕÇõKî
–b6ÙÄﬁqΩø›x˚i-ô,íóÆQ‚£˙ìy—‘P6îiÓørH¯„d0úÜQﬁñÃ_qA../ë_8zÇW”j≥ÚcÚCº°,qæLtÙa∏3—yçf„‘¯ß‡◊öÏO≥V
Û5C\=ŒÅ5ôEÛ–z¶»ÑÉ¢v‚|·/J‘ ÒöÜ‡õÅY´òÊP∞fÿ)¶”Ñ°”iTØQ≈œ‚	Ù‡ÉÂ–Ë«èÓQˇ4K[T)˚‘?≥ÖÏ¿è!Â∫dÑF%^ªÊá∑·˝—uÀ}≤C34]Qó¯˝u±r[ƒE‚êç!›‰ˆbÎ’©ëÖ“πU√tÀÃ9vŒ´&Mö7ŸsÿuÏ‹‘E„	l‰J=Øﬁîq/Z5å QÀÍÀJ~∫ãjéUö+Ôú·°ZòÜ’¢(A`Óî{%l®ÕÊÔ!m>5≈^”7IkTÛ0]ï¬/ß^imÙm ¶$úX‚∂â• ‹g &˘¶ÇCRcπ≠RP+b	Û*çpπÇıÍ¨≤Û†œp<D@´⁄¯4πömJ)⁄2t}õDy’≈Ôu}ó<C’û8’oUèüöÅ¡z«zÁÚ‹.Ä]@¨˙\h8Åè~{Ô@iÁyÆ¢;ü≠7Öê@‡«k˚haaØ∏¸c]ä à °—Y˙É˝*ø®¢∆å™ÈπQÛR›"ï$¶ì|Ï)òC!5ïÿO∆QÚÑªhòä◊˚˝$5jN	Ä≠=™∂•◊˙G¢ÙFì'’ƒ o@≈ZßµÅ|∆¨‘≈7’ï˚ÕŒŸyƒ]|û«É,êR%è[#N·	{€˛™Æ+GéÊﬂ6ÎîD_√D|§Cg†Cîænı¿Õîpjﬁbˇ>	?ﬁöôBÃ“·0'∑f πa®yK»ËXaÖÍ∞&„ø√”§qº˚/§`ƒö#5k!)%/ã∑_ô•∑£QmÑPe—◊ˆ@Yã]±7ŒË≤lØÕëﬂ6õc√hv◊#ÆÊ4ª¨•˙•«}<p£ETh†ÍSﬁE—q=QŒbQZ˘Üî-t	ø’‹ÄÑ+.˘çÖT»U˚ﬂå∏ãLAs™‰˚•$"˝e∞v˘""¨J”ÛßÃ\¯9®æ:z´1”à∫3SıZ3µ3˜>dLk‚øÂ3U»≤$]√¶ª-í≠Q>_µ5hrvD|÷]⁄ˆ“3Öz¶•PU?X›S„Voı—XuÛãÏ>wPµˆøπfﬁD4-eˇÌòZπ˘‹Ùwø÷ÛÙ≥”‹˘ç™®©◊%∆Ì®‰
Ü@3;ó[8y{‹#z¡∑Ÿ˚üœ‚A*S9Àtxë;àI#w+bfu‡Àû¯≤OP~#¨9‡ª:i÷€`á(NÿŒÒ fÄDä∫&Q8&É+ÜAïÃ‡^q‘p⁄¶’/`w_†˘bÚrQ≥‘uE_Tû{qÙòÕkÓUd‰~£Â¶y™Ó—å«y®ﬂî Ò
≥∂¨^©ØÄ@Eºo‘ÓœU’4cŒá<5âjê>ã⁄=∑i@]ﬂz\wÃ‡éLÔÌ¶j ∞˘Ê05±·g…h´≈ø/sŒûºÛqÂÏœ¨EÏxáµZo™≈˝˝‘’ñ˝ÔlîQıﬁ"ø?Úæá™∫›Œ¢@–Jh4:Aèj=74’»®Û\(¡ä…–Ωå≤ø}}v¶Êb>[YãVe…∑n˙’ì“ﬂó¬9Vô„ã(ˇY .ê∞“a¨&V>≤# F“Ø F≤π®k˘æ:éT5NÏo∞›("öM]P≤_FtΩpé±vé(÷Nﬂ}˛°—"9ÅL(&]à#ã))¶…9Ö˙ô“~'SÊ@Q4bˇvæx<ˇ†K#ÃÔòÚÛ√îZvzGn˙˘[«l}P|⁄!à,æbÍ”ºijwÓT!úNx”'Õ“ØÛñóËÄ¡^‡Õõ¥ı•ÀÜKJ˙ÑôbÀKáú≤⁄QD(n$=Tﬁ≤ˆW7£˚ºõ'mA´zt·brÚˆ+]Ã}9ôø≈Òaÿ€∑@‹˛ p◊zS’c•°˙ØÜ“»EN-È-l•ï“ßÜ“X^™§4™”Ï<ëQ[®Ì«¶2]„Å÷PÕ∫q√ç”ã\3∞=yö$—–J5S<9öûb2^ˇ]0†¯gyÀRFl~/ûΩI∑∆xù&)EäÓ∑näØfù49
ﬁEr0†N-≥[pÈ†ŸF/µ[}%hÔ·…6≤L}YªÂÎ1"ª=Òö[7A~ùX[æ˜~∏ÅH÷®V≠Ñ«
]P:∏‚	: Ï¶ÉvàˇüÃ(¿U9‡|1±(;ák8…¶¿-≤‹îù.`∆YÊv)B¯	7≠0|Õ¸ÉTX0ëy
)¿ùî‹‡7p&–ëc£ƒÇc(Î_…¯ 8óÌ%P≤A’ HûIÄæV≈◊¢±^Yª˜à<‹áí¡ΩÜMsú}»áíıãZw8˛˘EMÚ≠"¸öÏÍà ›Åû©∑‡•´±ÔJh≠yQ√ˆü–æß…‡¬±)X~4∏à¬È0∫√v¸B/iºÖ'S◊zej.;‹¥SÔg®˙º*>≥qÜQ]è∏b!˘ì∑⁄ÈZ˜Û=4Ry%S8vI˚ÀX/p“ö¶fôÁV2œZLÔík∂ºt-œ-√±À
Ò%5≥¶Ï$E ’æOÃrœHﬁ@‡¢Â;ÊÓÅ±ha˝·ò}Í[aÏëO{Ì»ŸE≈Ê9DÀ'pñÿO¿Úœ58(ƒ©Á[°l2
NaM·î`<ÆÖﬁbü-–˛“~^Q¡h≤–gó´kÂër¯ÊO°n¢£d_NCñFñ•…¬$˚≈uëÕ t˛5˚Ü?⁄¡@dàü“?O√`HUê ÄÏÑ„Ã}D4äãaDë¥Ô]}∫Ú"]ëfπ7∏µOmZ¡VºŒ£Ï’pöÀ»Î∑÷ïìûºï¢êÃH	3Õêë¥èó°®Vß>ËÜGWòI∏@?«È´›gÌœbõÔ∞õœ‚atUÏ¶ípΩrCEŒtX->ìß¡SÿMzÑÍ»4ª˛oÓ∂Tºl›˝¨€NCÖ˚âÌ(F;Ö˚ml©|€π•	ﬂ—]“ÛâÏßÕ(îíìœbO%^ù< Ç›A7ï ©≥ﬂ≈(∂´E±(mâ~aõ–Ú‚˝?≥8¯t7Ωê¸Êˆ|˚≥3’nx›Â>Œ¢8˚MÇ	
∆ı©@m{√π(‚7∑€Ø't>¨"°À4XU˚Ωáº7%Ô€é“˜ˇ5˝Dvz?ó‚∞œ??‰N7 Ø1KªÒ˚üER ≈òÆΩª˚ LæzÀ˝:|«$,±RC„M)d—Ÿ÷M!à<åŒnI)µ ÂEÒBñ¶∑ÿnÏb2[öÚë‡)mêŸ¶Àb}Ä≠- ‘$ò¥[
_JÍ“,nS"˚kÒ/PL±ºÀ˝%máaÃK¥=m\¿¿ãè°]πÈ+KK.ï°{2e:9ì≤ƒ1ßÔ ü|Lfõï§!göÿˆÙ*∆Å∫DEâcbO≥8:î¥l√©â¿%3ÕÏ˚‡<(&Ö®dG4Ä≠ìTnù"Ãh84hwŒƒ{t€•2]ûîóùÙª´Y4z√äË˘qFIÀ-EsªÜYôØ"a∂˙åâ≈Ùëïœ~ß÷-Øö?,°Ÿ˛r°◊g¯ß⁄∏¥ÿ◊e—µæ7⁄’2÷´ËtﬁIÀ,∂~Âv±J>ZÁ^Ω©ªP≤vZ..&uH†'2ÿ.Lñbòm.^Ù+ÜsŸÉ-ˆ`≈"î~xé1Oñ∫}8tsèøç2ëxëM°ﬁª8G≥»ﬁˇ&‰±£âTàî˝èjû*∑.Áq„ÍÉä%™#jdME]ä±¯ÔS®æ=¶É£h@ôH C:∂Æ˝~^ˆ`ëFç´Ã¨ò]‘⁄ ôS~#%ÅQA+â´Ué ?√s˘M÷}ƒØg›ï¨rÀ<€∞ßgﬂˇ<é√¿ﬂ® f”Ä„U¶1µﬁ9ÚÏ∏Ë^gÛhòN⁄XÇaÉ©'°√D,(˛J(î¸ﬁáu9ÁEò◊í◊¿≈j°mÅ ¨Öé’A=õ]ƒ√l¥”EàÕ∫m¶ä|è´≥â<‹¢W@ã¶âlòpûÂÀ3
7ºƒ‚2ªZ¥„Sëˆ‚™7x°óa`)CGÇ∆dCX£v‘Âße^h‚˘âdNÀm±P0”ú≤0…<9ìê·†qgöM⁄Ì†√NkEºiJ¢∫≈NäÛ‰åˆi¶≥¯åÉ˛*K:aóG=wc8mW/œ⁄∆¨àÊŸÇQ~ À›Ω›ŒÛh›£∫‹y∏ø<îÙhlíû”Hóï%≤˙∂,Ö¡®J]∑ù “TC÷πıV⁄HZKú£S‰iØƒlDbcπA^™f	EÚ	ÜxÅ’ƒÌπ™cπ¡¯æºÈÜ€AÜ‘çÕ„<Vêr‡ﬁíÇ ¨ÂCÚØ¯ÊÂ∑n>=ÂÊfÌ•Œ2:Òø∆ŸÔhÎI’*Ï<´†òßŸ«ÖZFÇÍTS∆.¢äÚ|â◊H≠ÎókiÛ"!˜bì›Ú/aê_D°Ûfö∑∏.ï ë/˜5 ◊¨œ“q0à'◊pëk˝y˝Ñv%i-O7œü∞aqŸ@(æ√†Úºﬂ6dFO˛–_ÈáÀÉ7ü&3zÚá^‘¥|ÍM2˙ôs¢œÇÅ¢≠˝D∏PÚI⁄ ®)2Ç˜‚EÕ–zuÃh)‘ñ…KaÊsf·x@qÚê≈:◊∞êwf ´ÿ«œëyúôu¨8ºM9òj˛Â√≤(Ç¡S{^&‰§µS&Áí</“I˘C<Ë´˙Sﬂñ§7fΩUÛ∑Ët∂JeóıW–™L¿!o…<-î∑0
Âm1LVK[’˙Ñ.Õ√2íﬂ.ÕÄ—Ÿú8)1Ï≠iÀ‡?’tEºëÆ∏≠*¢S¸7oîÌ76m≠⁄ L/´Û+»5Zfû›∏é=h@°ﬂ)ÿFìòÒ'- “'¸®”7y∂Å ´IÎlÃéŒ˘(–µB'µ‹0ˆ§ÎUÎŸ@‰ Ò0VI6„å]ß£π·s√”±büéey:`µÍ˘7Ì3#ˆºπ¿ŒNµÍä™.ËÆäzZ |ÀFk&…_âø¡ﬂ((d~˘E!Î{ëæK∂o&Ì{¨¢ß'õñíüÜ1ùh9õ∆oÂ¡k?Á/˝-,È∏m,Gá^π·éÔ„•v3#ó~Êjim%BºvwÊJ°öûΩRI≤_F€W.Z1;Ô¿s)*lœ2ú◊a: ∂3∏¸$yØ√hCoÁ—Ë^Ãó∫Ÿ/8ùUíâ_	œUÆÔÔL◊ÔLW%”UBM∏ÆÇ—∫oU∫ÒÛXxCø™ÇÌ™ììzÉ ¯)ØÎ≤¸2î*W_ÿ¬}‚j®B'°‹OXOJ¥¥HLÙN ‘˛ı˙ÚÍ“Ÿ}Pª∞j˙ ò]ˆΩ˙K!ˆ"'’≈ß•…ó{’
Dnôî}Ràú2Üo√uàﬂ›œ¶GYèÜV=—O?≈hƒÉy1Ì/S¯Úã#˜O◊ö7Îw;ûﬂ∂ùÕÇáÓëb¬£`˙ª±ı∆Nó ≠ŸFã˙MyJÛk0Âë"∏5ø¯©≤ZI£ã‰´Bæ8Ñµ‰ôíà±1u÷8Ùºƒ˙ÕdÿÕ‚wàçIˆB;∂d+†Òπ¥›ˆ-¬n?>‚∑BßC˘nb‹“,Ÿ]%óüÇ¥Ú#¿∑ªã-Ô'◊£*Nªpœö°ã€˚8ÄMlÃî!ò¿¯lÕ≤Ä˙ÁW£®Ωj•Ëö±Í2tXˇsQ–„ﬂ)Ääû>a
@¿øì N∏$VG°vR‡±Íßk"»%¥°MA±ø£˙ﬂQ˝›Ø‘o◊´Î!˚BÂ}0‡‡ˇá¡˝Ô?8Œ“Ójå_{“Ó¢>IêDÎÒÀÛ˘w”ﬁ—„∫¿M–˙√0ÚÜŸ?0Vˇ®˝ﬁÿ¸s∏6ø$XÏâüJ‹]æy3Ã›`‹*å=;:nö	¿*2É˛ãoU¡ˇ£w¡p*√˘ßzsØ|¥±—Øç‚^?áw±u£ˇ÷Wc†ƒôÕ∑n¥üzMúç<¡2˘÷ç´TogtœŸ‘Û@o=Œ“Qäoyè¢≥å¨çÌ2kƒWéfŒb„y$VY´\„Wªœ‡]+ûÍ˝ƒ˘N¡£‰¸ÂXÑp∑ä¨9Ô€ç\•zª$∫§“Ω"ì¿÷ç]fçı¬—ÃYÏm?…∆hÌ2Ôhj3g±{¥£IêMvYîÉEﬁ±îFÆRΩù;†≥@ˇ¸“[¶˝¥f∑≠W6KÙ˙59fL*0Hì≥8U$¿Î_WGÔÛ¯p{ˇ≈˛ãoˇˆ¸ÂÓÎÉΩ£≠≥D≠ØÁCÒÇΩQÄ\$É»{œÀáÿ ÔtxFòè_pÒ„ñ”ÛÛ(Dø‹≠õÚ˚≠;±@”©‰¡$zpÂÌôΩ*ûÌJxkB2ëO|óRáÈøıuÕ‘Tb[7⁄OΩÊy°˝s˚∞@~ùe(êäÔÆ:Èy*Î‡wˆè0§òŒ Î`≈N‰∞-◊Ω›∫HGë¯JﬁÀWpÜZ#´»b;˘≥kyq ≥.ø Fu≠–¿µŸ*Èh$◊/ s"Zbı∑9>^i˛HΩ‰ºƒ=WΩ∂ZVq≈èÕEºrÖ"fN<ÑK4~ˇOÙâ›…ﬁˇ3å'iŒ"∂Oπ"—ËÊF9√‡qÆ‰O‹<KS‰TÔ˜‡j·r·Î´!]-”Iä˛Fî»∏GÒ¸◊5õNGÇKˆ·åïà)◊Ä.«ı£pÉægÈeµ$É[ﬂÍnh¸ÁU^ÔzØ±GÊú©LkPÿìÙ_ò·9NêÔ_Õú Æ¸èE(7+∆»≤TØ®ùÍ±±5è±@o≠§{d√(q4L7rÖãx„Ëãy¢6?»ƒD‰gtçÀ‡íqN1œIüû`X∫,e\·Q4	r(‡lúC≠‰˝œ√8ß^—˜q¿Cä<îp-£‰ã∏ñÿGíC`ª“NwVvés`	UŒ£|"rHGü∆cË-±àªã„[ºˇW2∫·?Æ ˚=gCÚŸ°»_èªWÍ*Úﬂò∆Æ…û{„•;kI∞va©íwÈ]´g1‚énãOU«{œT6ﬂ8(€aòC{òV-¶˚Ω÷ç˜Z.íí¶I:˜¯˝ìıó˙kÏˇ?ˇÖ}efÆå;TΩ]⁄œÕEﬁ4@I‘E7á#9ºà(√™«ìµ_•„ÈXBNåJ9Ø@L`∞a<,òw
•"pÑ‰ÅNm‘Âh9Èıóﬁ‘=cåR#˙";Ö≥tå˚ö°l£*ã—Úí'åÒNE:òä{`et)å€Eh^$aFäqªÃs‘ ~íi#ØLú¢ﬂ`¯ötcúS#+q´c∆≈·KDFÔP?∂B‰ñ#á‚´;Ãﬂ◊–¸ΩLà3≥Âªæ·ÌÄﬂ∆!X˜	L‹±U«ƒ∫‚¸Õ÷§0N1Yµ%oŒÈˇµ4‘wO›-s{JÉæn≠Ô3—˜•§‚P”q∫B€–†õX47’l∑ΩÅŸxH∂8
∏ÖmÈHÚ∞=¿¶NQX€1µÉ˝¡”†áƒ%’÷ûGV†ÒHYtcÙ"‹d>éV‚Q≠„äX=ˇ§À(∏rÆ q"ÿúX33{ù¸X9¿ÄæE≠Ü´¬[â°{øÊ‘©znÕf5ÓÚ∫éKSÒ· ´<˛\~ƒÛè~≥ÎˇÛü˛ﬂˇèÒ∑<ROw˛1û˘.Å—I"Á€é∏ƒ∂ÃÅª5 ZπÍ_WpCÆ°«£∏YõéÂ—ªûryª≠]p‹ÚJ∏è∞æ∞ü=T∏Ocd£`ÁU™{ÚõπÅ_ç>f¶»}BDqí|Ÿ⁄ÌÒäúıÜÓg›–˝∏6ÕßØ±ˇßªéœﬂˇ|E‚Û~~ÿ•˙•”Âò8ÉŒ≠y™Iw(—
¡‘S—±I	∂£¯˚uiéŒºvF	¿+Z %s◊4jÕ8I‚Ä˘èëh∑äDRvÄ–≥¶Ô:Ç{a<©…òÁ£û§Pß”~ñBÿõ¸"Ω$o\ Ô=+#¥4#Dèà⁄§âÔ¬i”æÑG„Çîló3≤Aw`{ºº˚’W*rz¬h™ÑD∞.d[—èly-î}I∆Ø#Ô>wÕÏçV Ø◊"Ô7ƒÎG?Så∑K±ã;q “∞ÑáJﬁÓ?N3&sÄ∏çúGŒ=>åŒdûÄv√c’Ó◊»>⁄Nk¢î∑w¸b·&3∂Œ∆MÑã ïbò#ó±m≥%'∞yÂc`º‡jÓ¿4¿æÉóõ\lÕ¡vˇqé]D∏÷‚óìxGtΩ<V
ò“€l9¶WÒjkn«\oÕ-˜·KË:;¶göo›|ΩtÀR∏ûEL„ñçÉ•∫€…˘‡*OüÛoÙÄ
Ôhé*àÜ[¬écŒv:Ç≥`±78ûk˘–¸©˝∑ã√+d.0¡ñÕù@Ÿ:¡£[;„Ìº<xyxt%Ïèåˇ¡Å«Ãcsñ»≥xá— ó6?N”·$3.¢õ† ∞˝n†È5MáˇÖ∂™˝Ç¶Ÿ~7?ÔıX›<àŒQ0PmÇ·ˆ0>OPs–j4GÇc 0∆¿nNCµ<æL—NG	Ô@<˜%ü^ÙçÕE«…≥≥ïÀúöZ¢Lå5k‹eºﬁ~πMRÚ≈ävEœUU2Y6Nç`ƒ(∑TK@iÑGmíπY'Æ#rÓá?%“ü@∫∏Vï'TëΩj"≤Ãõ≠êì‘\#Á?£˚¬∂Ö¶≈ÖÄõuõG—MZr.>/™«9“‹h,£U¿B%éÅ≠.ﬁ∑ÎÀÂTZ°U’ß 6eùB›/Ì8d(*k©˙i≈Ü√Yó#≠“ËIˇ≠ı˘Ã®jôΩ*‹*±¢£/™†˛2{PådåGo∫EÕ3_}ﬁ—^™˝äüé^ãäfIY∑©%Ù∞kTµäîÛ VU±PNÇ€Æ∫˚ñ?êﬂ g‹HC<V~h≠’J˙o≠ﬁ~éwŒe£bí_œ£ÂnzôL‚Qt¿ùó7B¥˜=ˆÙ≤ù√k@cﬁ~Ï
FOÚ¯öXÂFª√tôm¥2£˛ääÃz°—‚Uîç‚<¯f6s<QŒ#º˘0¬ß #ßc8è⁄Ô≤á4Äâ·%#nÙcôµèÆì¡A
D√q
@n (◊Œq≤√Ì∂Ë$À∑
T›O äcnÄO]’ﬂ⁄ÕçˆìÒtrà)’_ ∫’ÿˇ ZS´®?ÀZ√Ù<N‘zFÅ÷ﬂÅYŸ.sˆ|4=ÂëbnÖæ FÓrs%L+'«Jà*ÍO≥óƒª˚#∏”≤Ø≤ƒ—£V›.Tw~;≈âigkPZΩ•ﬁR+µ⁄h–SÍÖZ Î◊“OV>	PπÉK¶˝TköH‡•	U*i=Ω<¢^ôwBt*»'ªL_! ™ƒ√Ω+Ä0qîƒ2πû®Ù¡q√ªgØ«¿êÒ‘YÃsÇÀAΩd/ãÖ∞t≥Ñ /a_Ü¿µ:®úJ0„"sBGôBå∑óMÆ«$ÁñYGπ@á&&2d±\gà’Ÿã∫ÄÍœ£	¶åâÚ'›ì%%OS|∆⁄X>oHrE"®(@y«Ù2LP{HmC¨ ´uSÇ•P;»Ê±vÙŒ#"ûd◊¡1ŸVËÊ?Ω|—?è†+ÒO‡‰”·∆`<ÛéG(Ï,ƒ∑≈Œª›0èª#ÒYn>tw]Ùºb∫1à‹xW€Zë≥ZMßD∏ÃãZX”RßÆÊm™ YÌSK¿?ããL ;6I!∞#4∂:è™'°«Œì~•»UçÀ¢íqoﬂ∞n∑ïé4‚Ωü""
0{ë»»$U#ˇ ‹G∑ÛÛukU{“•Ú 7ﬁ}^|*|ZbéçÊUúÍ—8SºÃ]±¶ﬂ"2 1ﬁÎ+µƒU…s0Ça,oãìLpı,O…BpêéX>Dyû~ŸrÃ¯„`2∏ ∏êe&∏1:ﬂÀ≤î)⁄b¿πŸﬂßÒ;2Ë;•ëªŒ!¥í['î¬∂sÃ¥Õ_YI∂æΩvrç'[s›`AÊ4©ä∞AR†ıAÄπÈ9C\bÖˇu·€vF≤πz¿”ö“.‰ÄÊ-ˆe∆»√¢©˘ı7v5ÀjˆD˚â Ïy0πËfÄ0”QìôÒ‘fÀkÛ"—YªﬂaèÊÌÓ#Írã…€á6Bd?‹`ÉiÜ9â.ô“B¬·6\D+»1“h˚G/≈ÄÛ˙÷óA<!hñ⁄!˛⁄!ã~AÑy}«≈¨k8mí Wº¥fÊ	¬P•⁄o…aoHy∏∏Å)†ªIË7˚´ß@∑,	äB©∞}kúQ ™Ça„i~¡eƒ\´ÈBë|≠'ÈèQí%¡1--Õ9-MﬁFcÓ»¿óËl0˙Øﬁ≤è⁄ÙTv€Ö%Êê/ƒv6–A´wØHpCß| E‹∞ó»=Ø”4ƒı÷^f⁄ít™⁄ìP÷Á‚∂˚÷`gh’©º7Kœƒ{ª‡—Y–™›Z∆Òb%·Ç∫[pÿ\lM.R8Ù≠W/èé[GçÇB˘‹ï÷ó'/°◊ÇF¡x<˝/"‡i±[W∏6ú:‚$P|vàâﬁ§√◊æ√÷6†∫ùÔÊôq10è!Ädåi˙
Â ñ(§≈¢.)-:uŸß»Ä∏ï ^lÅ<¡ÔºÖ„JlÃ¡†–ï>™:f˘];5FwååË%ÜÔÇLíÍ√pL4˜rê¯ö≤ÈàÍî≠ò∫s<¬=((€F3¨¢"∆ˆ¨ÚﬁÒ8<qÒ¶p¬Õ•∏S˛ÜÁ:a ÙÇ[sók®X‡∂N`«,†kyCU{@ï˙ â<5ª}ZˆΩÒ~CßQ	ﬂÀß[ﬂZXa_á÷<Öí)Jn±56¥ÊP&I/Û‰¬rﬂ8Z¿FÔ#Æ&zê2êw¿ XF§«_ÅÓ¿!„!x[ˆE4ıÔSêüu<¸É“å§√Œﬁ‰büFVëEWË.Çµ®N `3…ÁH∑0&WÅ8ìt±QêLÉ!^ùMG±gú„ﬂ)∆ÊÜNin&¯Çâ=∆/ ZÓü~t~xˇ3~¶L#eÜï´ËTÃ£ktÎ&0ä;«≥¿Ó#mA?1Äy*÷)öÙ“K˙†„ø.#8©÷ˆÏ]Ü"«üµ5|™!yâ’Ã∂Ÿ`ªQ>åœ9Ûé◊li,\S¨ïıÑ'ú≈|H#¶üFGe¥ôvVµjöaWÏåâ’uFQv„¢ôoÁÓ≥Z≈‚4>=µìÚC \ÜÈ9ó;AÆ≤å~4ƒºM·m°gÊ¶·ªÛ7»U{AªJ„yÑà≠ÔÉÛ¿⁄~~™7ƒø( Æ›éC˘Ö∫≥∫¬-–7 åÛÒ0∏~!f†>äF–ıC¬Vggé˝‘∑Œ‰∂“ëÃÖÂÒhäzc6õs™Ï"*u`å‘p†¯÷éM«´q@?ò€95Yˆ∆ãäÆ†™´Ú<ÿ«|ÌmaçV˙¿Ù«¡5·Prã5¿nl§˙õJ¥V7±Æx°«[liﬁ˝R9“ﬂë®à…CÑ
ÜÂøâ≤`ïµ%ÈTÇE¨Z°ÜÔ}¬kºA6Pù¶ŸΩΩs·êtokmõÃYßG´VUß#œî)˝©ùΩæhıﬂ¨ïjWnóFÕø±ènËˆ∆	•?DSd¨ç≈—Ø 3ò®Æõ6AëŒìS—‡àµ^
,!W¶¬…ı&Æ.F‡'»~Qﬂ∏'ºùyÆºı:ÊíŸgÏ∂Í‘àÌx](ÑÂI€u,;ﬁâkã ¯^€k2æ6ó´ä<k˘∆¢†ÛI™•˙]«jåin∞n∑,NΩqÀg»ª9x “t@µK“Ì	‹∂HZüd÷‰ˇ‹íYR‹ï‹rﬂtÍ2ó·≈J:2ÁTî6„?öãKÃS£úkÂπÇ’k∆˙≈2l*5≥xjî^•™:_n]£˜Ìp7Åjº“nú£.6
Më[ÕVçWvà@'èHõ{êa>ù∆√òlsŒ∫bŸÕªX€†°®‡÷òH˚¿'PJú‡ùÔf—YÂ€„1:Õ£•1ë⁄∆x.‘ÕªËb"$Ñ†‘˝˙&ZÆkqb6øãQªxm^SµÿQÕZ≈UeR*W¢”M…{Bµ
¨≠˙≈Läf’0Ø®Êñˆè≥hêf!<úàyAïô§úúˆ<¬ºDZÁZ1B“Ìã9mgÏY<∏0YØ÷q4bÉ(õD?$¬®?,mPE»Œ∞!™Ô&Y'B•˚4
îë(Ëâ—1_g50é|#úºRUª¬ ª¢ıWSπ«|€D°·-vkûRÛ‹hÌ\««Ï∑⁄(ƒûÜi˚:)f?1¶–d„Õ∫6º÷L˝p€∂\¨æv˚^ ñ •’Ö)p@ﬂ◊¢í¥ï‚ıäjuÙF≥KË[nLC˙6‹¨RøÁÆ÷∂Kf¬yi”Ã´ıP?~@@Ø¸ÆN p› A·`¬m…ƒm“Jı	GA&¿+Ω  4ÿqÈÈv1€pS»åNX⁄•=mµD5h≥6b≥LùG|ª‡»∞WΩ	Æî|Ê¿{”·ÑÁ˚€∫˘ªëv¶≥U{TÌz:úá¶7!Åò2„ëè.W÷b;B®‰‘õj3‚Fƒ,˛z∂∑Í›I#≤ÀÌ¡LŒ(_˛&Î[RFü1ÇYÕœÒ¨^Ω§ó€"…W)gfÕ˙ñ˜âg.\C).ﬂ.:∂>È≠°ú™„æ›OÑ–èe<ï${®æ
3≤zÖˆHÄ’⁄_›à—E4	∂¿ä"iå0ˇ÷-	VV!Ñ1“Z˙1©ﬂj)—EŒ67%±≈ëQÖzoú[Ìí#h}ªƒN’º≈Ôy…x@c,ò,™˝¥8Xä£∑ˆ\3≈)¿∑’Ö ‚∏¿∑’¿ﬁıëõFŒ‰T§*ÉÅ©@mám´\G8.ÌñP¸k„l¿ƒ¶˙~* huò∂≥Ê~Æ÷©àv†E9hä|ÓÖ~ö  ÷UY@››’„¢
l‰¬Gçkù÷úÁΩí«öÎﬁ∏Èæÿ©?Õ∞ê^5ñöOπ1UgPJàÍiêOÌaöﬂKÕéßlLÂŸ¸{c´;‚´Ÿå…jåƒtxÆH@∏ZÕ}ºíEBŸÃ≠xÎÜÏ˝uÁ‡ı˛!KIåç;˚äPOÿ>P(,ãFËÙ˛gÜﬂâ'¬Xß≤z
}I3†2ıà&iWpª÷q†uFÔãF¶%±eW¬?é¢ªÄŸ≤› ùÚ•ÓxS|” ·ß·« DNDØ%°P©ÛˆB ∂ÄBEE¯ÊÄD#ﬂu60É‘‡«ªı&»)›1∏K≤bqÂ÷…äùüÍ–|k=Í†ıb\Ì∑üVKìc©Hø;åÂA∆4ÎZÌrË¥ªwt∞ˇÌˆ°îÇ”,Fê4∂
ŒÜf0iÚ˛_Ô¢!bì
 ›`4§yj¯ô…?ÕÕ—SkíFïöô•·ß÷
å~á´⁄gf∏™›öÜ†Um„$ÓË
ß@.NæÙ/`ëπ”Ìπ‡ü'Ö_è˜ËW‹"±x T7ò;ﬂß©ÕΩi]ÍSÙµ˜ÅE%l
ˇ≤˘ó(˙qx]:BMG õØ}Úl^]T™óf[’-qH”&‹Zü◊Ò‰.©í´îÇ{W¨
«ã÷á¥pä<≠lájc6zƒãä˘TÖ∆®öë›Óû[QùIFï√9≈B3]\^Z“√ßmZΩj7†\8ÁËf¬ó˚Ü[öÂp·–DcÖøÜ1Ç©UÈuù∂F˛ÍÕhãµ1î(MKƒ0’Î0gØR@C53ãsœÙ®å∞s˝U.≥ıEŸYŸ8≈ŸBÙ–Ræê§I§G§‘«onÛ8îØ2Ã&1–¬Ø›hÆY‹5:ô∑S`nÚ$k]ò∏F).\ò≈∏b3∂nnò∂¡ñ:ÏjÉ≠¬?òµ–ŒR˜ë∫UƒÕ‘Zˆ®eŸ∞g7ãÆ‚âc¥æ6⁄™›NçN¨/,e»)b˘C[=©≤ò¬æˆ(¡™ô	X	*æRÌG<Ö••íß‡a1ãP¢F∫véâıò±u—3µËüK‡¿?ó=vQ$ÎïqkÁ¸A.Ω9EFN¶Á!ô)ßåò.Wà¬#∫Çs?≈àÑeı-EÃ’Sw9b’5z1∫oΩ"Æ∏+›ÍÃ…ôÔ∆∫XQ‰8wp’^w’Åﬁ˘◊£TÃÙÔuM€!€b⁄
2çi Uÿ”g—;|ÄˇJ° A',§/R8Ä–∆óG‘ù†iŸ◊v’◊÷—´gı˛Z&>ˆ≈ÑÙewıKØà…Ôä+3>Òt˛ÿ±éπ»aÜsGÊ
wº≈Fë|˚òÙÀùùÿ+ ;V¨Ñ·ehÓ:x·;÷jzîu;I”…“óÜ÷õ∆©>ïrì-aúeºÅ[Sx∆7Ω{M·Z§K¯®%¢∏‡	4$B§≈Il,©,P(
øª¡D¸]gwÖêµΩuÀÎå’e§m†8:ÿ
† ÊÜqôßπhU≈âVÉ&∏es±\ıâ
ø6=öÒS»ˇvaÌ“sã—®OªºT±9‰a‘ÙJF5ÃZúHÀwzÕ‘évg3V⁄[Pü·¡_ÒFå∞£ºÜœ2ﬂ \!ø¬≥ùã4xÏ:«"7©o•äÁ∆"Ÿ/$≥úŒ˙.¿äPÖ>sÙba:0%!Í≥nlQYC‡êxπ∆‚ß}]ﬁex—còû≤-}.Èt2ûN⁄-|f∆Û>VŸΩ><Ë0ôrÙÚSµ¬Ô6∂1ö£tîã∑°aáµ˛∏0˘±’¿ûEÖ"N•C:‡âaÈhU-@VÕDñÆ•ëÑ1f{>«ä™Í+€wèÉâÑã	›œa}ÉaÀ!Ω’ßM˙r˙¶U´ëS77G2¢u†´+œbÍ
RΩ∑Gìt#¿îA<åy˙o∏wp®}˚-´-˙s7≤Œ@éìëtÖ;ì,2jB ı◊Ï%5˙÷ç˙K≥ôÁπ“À¥È4´Ì$‘NÕõ^OSYØp·h7<Jä\!'-Ãoë/ N<™.»B<ñ\∂@·ﬂ0Ω(¨ø˝ òxåoóOÄ¥Ç˙o∫1Zc +‘6Üû∑“CW
Õj≥0˛Ñ|nì<&fP?]§–Dä∞¢£3*Â$R*¢4®êê4¡GO-u˚ïrGÚS‚JˆÑâ!59÷FA_8Y_}waJ¬LâHë’∑Z*Çr∫ÔxÃRÁ;(èì¢+-U≈ê9$ïDWã´Æ<VÓ¨!Óº!ßEæﬂ3á8YÎví◊ª};ÒÊ¥£!W¸êÒmëê˜yä	TÛñπåU#∏Ø:ç≤˜8èrò(√QﬁÂJzXv˛_ü¢=p{Ä%~OÇ˘ªOAö¡núèeNZ8]L§YVpT≤‰® ¸Oß1GÃ˛ìf’f®Æwì¡›y`|ÇÉY≠Õ™]d˚ªˇâ‚˘yÖZè¡0¬tœö2ﬂsäA∫b*Åïâ‘lu÷ûYÜk˙WŸ	ÿÎàù«„ Áü}ÈøÅoÒU:è« N∏≥õr€{îEÄr<ìı˝Øˇ˛PÁÒØ@&;O?é¡˛¡˛#<«˘±ˆøù/c…q Gˆ"≈vb˘Ñ)Ç'¥ãìá:µ{WÒiƒ»zD=Ω$?OhùF<‡(∆Ü©áëÁ‹ﬁ=£†GÂñAqÅ\˘§#Oã±ùøzÒ≠IU Úmˆ˛Á≥xê≤m8¡1¿àVΩXrL	I5AWëË√LjU
*È•+”‡I#≥‹`öÂi∂ 4>tÎwJxÓi_qNQÃ	ÍºÇQ…÷J˘Ë˙ÃÚ—ôv
SUË;√UâÕw"¿Äk^ÏŸ≈„;Ø∂Ï≠r±y6óªàüg_ﬁY“KΩ$BZÚìıTìPû`öºÇHª&]Z£⁄D˛	Ò¿´Ã∂ÍÃFÛõÎxR3êJwö$π&GQê´{
˜ÿÜ±r1ëÜﬁ^©™+)€|¥Aﬂ≥Ù≤P	f∑üT“õ\;¨¶WÖﬂ›’⁄$´}OíU˜l•$ﬂËäñîZà÷©<™.Y3âòq¢®öÏ-ˆŸ]/ö€54‹ÉR®˝ä
BéHÑê˚R œHÌËh¢(€ö{ÂÄ1r5GmàŸ8π“ÌvY;∫⁄``„>∆êä¿ªAáù¯˜]'wÊ´G§¨n$Á|Ò–r‘wí¯« Ä&zÌ"c ‡éÚc_»Ç£ÛÒm
l⁄±q∂”d!åı§ó.πeù7≤4ùNPhœ≠Œ“¡4ﬂ@;FÃ”^˛ Á•≈˛í(VUÚÜ¶OIºzÂT¯…OÂ)3∑»a‰ß
ßiõif&3∂≤Â£2 èÎñqÀí~’5É‚⁄t†*Ÿ1<o¶AU?ﬂƒ#∏;l,ÓTu´™}¿OΩ.V©[Au»O≈˙∫—d˘ôıX4’´*£ºÅ„+4∫FÖøzk”–ãyt_ :Z©´]aÃZÔ∞kËyÌæÆD@baπM@
D∫<ètﬁÖ‚È j∑ÛÈ®√N˛÷a·~{¶#ˆgv9) Tvÿ“¸≠Ä‹¯©-‰¶œ„ÓIﬁæœ@ì[`ﬁß[[§E\•öÖ¸E Ü«
≈H‰h§∏∆„ñ!úf#Ä˛˜ªÕ4‹˚{ı¯¸„]íÍ^yk2–#w˛<ãCÜÑÊ ÉG·F˘≥œÜÁ œek$!⁄xïÚ„öî6b_7‹Ë=»D¯&ÚËÉoVÅŒ˜"É@È÷hÖ∫‘êóÇVõ∞(ªí=S¿ﬁ≤Öÿk¡àﬁöÑ¥GßòÍ”)&∞{∫∞\;™(Ê#èH˜ÎJën±æM†à˜≠]¶b%°ÁA'≥Û ,vÜ)ºfimÊD1p¢Áj0L’íV·2m4†=E~$∞=ﬂ|9´AÀ,ï<‹'íi‚Ü˜◊ú7|@©ûÄÂLáC‰C· W3c¸sC/,"]ÙÂ|npøï)óÈ†]jdCÎòNØ*nAï©eìu´Ω∆˚µO’Õ[~¨÷çS˜Ø‹ê•ÚÜ(wˆ+∑ÉîÎ3".∫x‡±LÑüÕ÷ÇEM3‰ÓJÅî¯ßπ≈6Ó4ä	À
ÀeÌÆ@ÔÙ¥‹0ùpπ-π>∑oΩâ»ÌœÕH≥Ë©˚4Ω≤¢∂d8MnHå ∑;äì[HÕ2`# ™∫,Å{^Î¬5”¸sÓÒL2#Ôô€9èÅÆcÿô—!xíH^Áâ~ØùäNœ‡Ó›XofSIªRXJ>»9èº,NöPHÒIªµ–¬8õ ñsti˝!çìvk±’ã–DöûêÜ}v—3uT[•jî ∆Ó,˜ESSˇé˘ÊÔñÏ~Y$ªØ&ÕL¯’5O“˚ê⁄]ˆÛP®ÉU¨ô°ı©πHñ®°fÁü∞∑/¢‰ø9ÛÀ¢d@~ù!/as_YÇ«π∑u›é8äFEÄãºã¢;9º˚•aÍQ;ä´Wüã®HÇy™v√|OusT Ÿ÷˝ÂÈ(Q5‚À‹©ñ+?Õ8m&€An6S;oõ˘[{>´Ä˚IwŸxx}úEIHπL1ˆõhøü¬6°èbút7öl÷∑ÑÅ˚∑”„ø*4.;bö¸5B≈uWü$Avìuú\ÓÏFr^˛ŸÊî[GÿÛc1ª≠§∆6w`Ã(èÉ‰[K‡ï˛1¬ú≥h2qΩ5∑ÃñÁœI<@{52Åº’∂Ê˛p÷;[={T ˇ∫}ÁÙbˇåƒ‹08çÜse'èVÇÂ”u,∏í}ﬁí# —¨◊Î–/n‰àÙ)`Íñ∏‹9‚§ãVæ^]]{4„”$ÜÕCè∫˜„£]„ﬂ˝pké∂dé•òÂz¬ìXÀ≤bFΩ•”GÎΩ6£C“/OÚ„4N‚±0ù`¯ÿ6©Ñ Ñ∏Ç?Ó∑_LGßQ∆ Ø· :ác…b@)«§^ƒŸ Û\_fB∂#«ãı]/÷Ù"e{åG∫∑ZøπOàá)√2&ë…ægG⁄˜”Ú®≈=¶y>á˘¥á∞¯—`e˝QÌ©5áÈ{ÜÈ˚Ü9[Y>[uy%˙á¿ü_»q–ÿ«◊∑º35õÑ"ZÛ\rmË(MRÄÔ0Ωbp¥:ñc;ëúß˛B@ÔfÂñÖ)YúflÖÁ‡EÕÒnQ∏^≥∑õã(ÙU‹\tÄ^wÂ*
‘§?ÖB≠•ØAwöƒHÂYêT
)tQ\%ÅTÅ ]öÑ;£@’¬¨
Òzø˙CÛ7®∆p%ZS∞›C`∏;!4~ëõ≥\#åx$Ëô•iÿﬁ’$£∏b≈<üª'≠û‡ˇ]5A‚Ñ‰jée‹‚·Sá¡ü•7∑bÓ€x=K≥«ry„dV,Ym%AF_dPØ!x_8C-∑ìa˘q£`ëGb„
D˜ÿx1ﬁΩ˝ÍÜöíhÍ-„qêxm}±≤Íb whÈA˚|>o™^Âì• ÁB⁄qG9„∂‘;åN”Sô∫bN£¥¯w+qÏ⁄Ú⁄⁄Yùà⁄nœ≈Ï£\÷cV¨F“ˆÕås@¢ˆ∑¯∫’5æ}+ft≥ÛÚ‡Â·—	ï≤?2˛SÄÎ7µ¶’¬¢ÕEÒ
UËY’øcÁ≤ÏŒÿY±±Æ¬Œ‹K`B^\u˚‡i Tm’9≥_£äê‚£†Ëx„3=‡o ÔÒ˚Ìﬂﬁ~PD\√.ñË	&T‚:¯}È⁄Ωyöb#Ãë˘Cã<(¯©†`¶`W˚gk31j«hÌâ≤œßÑQú›J.iÜnQD˝‰ÓÓlıQ¥t:Sw™zëÌﬂˇsí¡ıpˆù≠¿ÁÓΩ?èÔˇK‚Î}˝tu0„
?ÜZ·Á¡‰˝?≥8Xxï≈#œ‰ggËã| 2pÔﬂ Èz0€§_NQ&ÓÏmmÂÎïıÍÌ€\î0ˆWÖ\A.’X<;éµ£Y_T£jÎ—é–!û†/¿ﬁ0‚élÈ`:D€+$∏üuÈ6y.\Örå˚˝tU#dHˇ˛†€¨Ã´›gfà∏éÀ8<.ÆúBÄçêª¨ ¸q ï "•ΩoKb’÷¬#¯åØ†ÄPØÚ[Ti≠£Y´£ÖNæ,{
Í†˝5T˘âí∫Æ∆N4çKQ8Dı6ÿ,˛ú™ØÑˆÍ∫ÿ~Œcm≤^hVñØÜ ≤òÔw!Ò»JcÛb≈ÖB[ΩjÏBDú™ÅﬂK@rA5∂ƒ≥Å§î˝°ı-üä¶œÇQ<D÷0í|!è≤¯å&0√2m.^¨hªÁÀ_∂òßRÃŸˆ÷ƒt´&'˝$˜`Kü≤W~Œ˛¯ öªDŒ =⁄^káæ^1vhŸµCñjÑì≠7–˙VR≠7–ÚVP§pÇj&ΩíÌπÈ–U˙@§{®A5&Îf–|x;U§?æ˛J◊q∑9‹A∆0√
j=§O_I1ô∏≈Ò˜	Á%=Áë¿™úÅ_“`‘Á˙®*±ÂWRYw˜/ª(ç˜ˇ
ß)uJéY∆¸®jâeU-±å[ﬁx™˙Év0≠»5Ïÿﬂ`e¨Å|Tï´úóÅj–£È7¬éh∫µ˛ô°»Y÷Í„„H√Kø˝„πÙÕ/g'
∏Á?,∂‘4)^dŸL≈“´Q±<,RúIï‚÷O<$˙ÙLÁ2»·ïM¯òœ¨/ôa>wPë¨√Œ≠ﬁYAÚaë+“hñ®<Wã…¡>…∆Sû◊Kº]˘ì”Ä'È¯MCq˘Àù˚%·≥‡ÖÂˆ4ãÇ1¯Ñ?äeÁkq$ˇjqB”u˙¯¯‡ÆëQ(–ÕsËÊa—@!®ØÁóöâÔ?)∂©πP~v∞ˇPr¯F∂¿m&Çì!Ò
˚¯îÌz¯
Scå’1«ºóX}`Oƒ!°∑'!e‡˜üDJíZe(∫8"‡IÂ,§(wˆY∏%º≥ ç@¡„µß\8ûÁ¡FA{r*y”:§¶∞ıø^î—pï>> PÏÒ4¢à$ÑíÄ"¥¶(9‰4O≥ 'úEc~CÑ©˝^çqºä£jƒa])ha[Õÿóù∂aqºbU\mÕ≠¢⁄~rÌ{By"É0ûÊ[7k´é^·nó5-9j`ÄÃ^l≥z	%∂±ìËÏ»8óÇ~pbtÉ}•EgÂe0ñ∑∂*C®8∑ìs‹∫eªÇ¬5mÖ
7+1‡ßDb	âZ*)≠ï.WÒ∂⁄\Ñ„1˘	∞!4µ~_Áø˘‚ˆõ/æ äÌ,D¨2»0RL9Ö;ñ¡æOS∏≤AÇAåE4·ë8Ò]áX\
ﬁ`<-_Q("o1Ò◊ı	eﬂ’# A˝V*©GlÉqM=gπáK1ñÍY”—'[ƒˇïèŸ?ÜXÉe˙‚”ªrÖŒÉI˜ŸNu∏fZ…«lãµÀ’ÏîãÿQÆc,X«Z¢é±˝µ;⁄õuæ∏-qcÏÛ/˘ËÛ d'”,Ø˚Eë4ó&™Œ†{|e[D`ä»Sê|ä)STkÍúöÀŸb…ÂŒõxÕåMúèÙºQÕ√õ£˙"¯" sL…XΩJT_“˙ l>Œ@j?WoÑutÅ„.ke˛d@ç,)¶a>{ˇØ)†a:ÜÒOH‡êÓ5 hŒ(722a–5—¢»TSxÄâ#vk∏s≠…V≈∫Ø´Òã≠h‰‰UZµ2éè®Å4”À’Ë‘ë9⁄‚"€ao(Èæ@[∏S1ùmı—|Ω“‚†Áh(ä.RÖ´á˛Mk¥€p~tÓ"K[°∞<»¢ˆ)Ú,”¢_}?º¬k§éB˜à¥Ãµóâ˜Öô‚töÔ…K©ÙÕM·¥˛O‘Á¨˜≠fÂıRã˙CË∫KÉ≤VKﬁ€rpqu≈ªàäE~€¢˚3k˜˙KKüÃX@’ª¶üÍ“ØsÒk'$Í”‡µƒπ“˘∏5≤Ù¶ÿÁrUv OYn_[_´?˝IYPÙâDe&&}'oÈãŒK°7Ò|≥ÏKøådû{òˇAze;˘L€[“Æ≠y>â>œ‚ÂõM
èá÷l∂ëa‘ì7Û≈!†à qÏ,√“-}c?Ÿ>˛´Á…¡NﬂﬂÊ’pö{ûæú\ Ë§g_0«v£Ì¡…wWœ·%ıÄªuìH`=L3ª4
£A∫m¸~˙ ,xŒæQ:S‡¨ÅF0¿î©3ÿ¬‚¥Êª07ûr¯5¬7æ∆ºº7¢=•cı"7Ñ±»ﬁÔ¿õﬁ≤ì¶=¿˙π{¿Õh‘Ïço˝∆s`Ø^µp	Ùr*ˆÕè6ﬁ=Ç£?fı/xj`œÅí ß£îGhG®p'¶CÇ®J>E°™û⁄∆™ˇ_îÄNÄ±ö¯d…zÇ´‰~"ﬂP<˝∆ö√s˚,´wŒ>ÈIoÈnÛË-9ÊÒ]teœAé¥^Ÿﬂ∫ÎΩJã˘Z|äè\ìêW›‹qπ∑/Oëää"…U¢'8RÕÂä)$†3$ˆ6ÿ;˘1∫ñî˙,§a…h˜˘ÎÛ¡…&|√ŒÉ·8HÀﬂ4ΩÚ'Ç§cµ-º≈Õ-Õõ(€.—ù%®¬ü¥¬ICç+Üœª¯õ JNT$ÿÔ¢vëAª¯∂?R;9ﬁì‚€ÜÏıõ/
Pı•∫ò∏êo ªl=¬◊.Ë/æ»∆´îIß˘™s/€∞Tñ…ùPäƒf(% ~•∑T(ã ◊ÓπâDÒ)M‰Ÿ˚üi¯ZH.zQ–Á∑€Ø{z©À_·¸˜)ùÒ‰⁄	˝Ï÷ba|Õøp∑¢ur∂)aßFv4™1HBÉ™*ñ√,
¬k∏åp◊3` ÇS`æƒ°V_ÆáN%U_ãY/∆˝Æ∆¨ó£˛z‘]ê⁄+R{I‹◊ƒyQ\W≈}YäÎRfö≤œS—–wK.KcÁõ2Û´æDCÕôy+@úLÖ'∞l!˝+3¯pFÅÉÉıÔÆÛØÂÊYπ“8=JœËZç˛.RÙàxvèñﬁ]®¡‹=)yú…xîí˜HÃ3gI»kC#öqÑÏŸQ‡u‡\„Û¥»ﬂ ~âê-ó™MAµMRU≤ñh”6cwYª;RU	X|âlÓÒn4BÅGÊ]ä˘~¢Rô§ùÿyˇ3Nôƒ1Çu%üÒÁ7û%˘åpˆ
E°í$à\iÚå‰@&S]4cXSòÒx0∂bYj4í-ò·È›1≥°QØ*üÑyÿºπºb Ìv…’◊ÀJ◊PH÷]°˛±„˝ÑXëé8Pcd=p¿ñ âFûÀà…üxÚß”µ‰Y—ï<Èµ∑íB1ï”ûü_Î‡ìΩygÈ«a$3
˜÷ö^MW\O€yu°≤>ÛI¢ãÁˇÇsîR˚]¿£Û©0	ÿül%qn*:i:ﬁ8Ñ2‹ ä	ã©”í7ÿöx:r¯åÓ¡v±wqŒ/(ø∂#ƒ3ò	ÆvÜr€àªzõô	gk∆=ÖQ<Å/ò	(¥tñ ∏8Ùü Za»≠P°-˜£†Ä$”DÉ¢€»6(ÅˇÅö‰]∂ÕP¡ÉåQBJÑ0hÆÉé/<©ì"%1T»&Lâ√·MáÉô`D=9ê{òÌyïS9f±‚‚"kzúø∆–P˜"ÇùƒÕ·\$›˜ªÊ65Öf∆ç}JC†˘Õ¿Û	Ä”az«CÛ·Ä±w„†Ê*◊≠¶(’5˜”∆Á66Gºo¶Ù¶hq]¶⁄PÊ
ñ6ÖÚÕìKm◊e⁄Òﬁ2	ºÅ7Ú}Á@R‚:Â|Ô'·Ò`h:∏Õv5çdQ U4o≠cÊ€p*≥ÄÁ_≈√¡5JG¬3ŒÓp]öq¯>èQe&‚¬Ò}'ÊÖò_s.¨˝âr∑¡%ââ8»Öÿ#F˜?j@∑Xﬁ≈‚nøãœqùs3¨≠#B†7t2QJãÄv≤’G=UÏ`˙ı±T√˜«ùãÃAÍå;J—güÌ<ﬂc;À˛»¢Óﬁ–w¬¬$ q◊(÷Ò.ùŒxÓÒ£’?2!9\dΩî‡˘Ê2K⁄∂O}…∑èˇ˙ KÆ¶l””º9ùØyV|æ~]·◊ﬁ≠~˜∑∞Ó;˝Y˜"ßí=≈}Ãóîc.V˙∑uŒIüÒ ã>ûf„a±Ï‚WÉ£æTı’;ußõ∑ù…„”$AT qÑ¸\°ÈÎ±Ná|O$2"E@(§Ú^âË6¨}c)\Àü5ÒÆ1 BÀJwÛ)˛z\‚«Œ…Éêã*∆%aã4 6
	¡íaB⁄ îi“¨Ñ»{EıÚ@4	]öÍ+¸0ŸöÅÅ5ç¬‡l oÈ∆¨¿¿mæ£[=Í*?®ÙáÆ≥.?÷∫¿`üÀ∫†zÛ#ûó˛Á≤.ù~‘CÉÍOÅÑO≈aî´∏»∂«(M!…G˛°Wâ‘Î3Æëü¨∞
QÀQƒëN!w{£áº:±¡àXˆo\-iëHdŸÀ”÷Àz£ˇ[2Döü*◊gQ˘
Öù	˘™iaòl|oæá©R›I|§ó$ém2kú#W¶Rﬁ≈ É±|_ &ñ≈Öo·`°Û‹M≤jj—•Ä™O*≥ÍWº‰¶P[ô§aùJŸáñÁÛcª}°M–Óﬁ÷Õ≈…≈l}âÑ◊\ﬂ≤',Nˆìx√…}&Ë¢ˆ∂êáŒﬂs Àz	‡ÂËÎcÏ∆¡}ªóÛóÛﬁìÇ’ˆQzö=x˜áE$+∂çî£Ø{(wË¬⁄Œ3∏9°º€ tBtÄ¿ƒó‚D™T≥	xπyy˙C4ÅÛ∂™ıûÁ~ÿÁ˚¶âÇ˛ n•m	µhlÇ‡Îm≠äﬁlà&Ω°a%b.y»§M•˝A√˘äeÀ”◊«{/^CÀIÈèUª´Smh›œ=a≈‘–1õÔˆ˛Z5x<˚l∏‹]fÛ|Ôx˚‡Âé6#gïo´&Ufüt)ôπÀƒ˜vˆw∂w˝Û5ºìÜÁﬁ∂Øˆˆéèºœ˜˜ûoœ˛ Öy·]ﬁ¯ÂÎ„√™∑=⁄·Yl<˚|Ö£sÆÓ+h¯¿òƒ¬ÍAf%¨—ÚÜ¢ùköÌ4’n»œGù–øªÍO`Æ 2‘e ¬;Iå⁄AK§√L©õ1ìUõ¸Â(ÏóÊ?Ï4≤®r„◊UL»>˜xAüírh>tjVÖåÿüP≠ÚÖñ…;≈ÍIπÈ	¸81„≠3n&6ÔCDˆlf3.îgiärÀÄ<8ÚªòyMÓmÊÂ»fŸıhOû`À’Yä˚nrïB·jÁ0eû.?1‰‹PLhªdßÔ™\ì∂ìÓS(€∫/ñŸIjìf∑ﬁ.ÔÇ∂z¢Ïk›¡Œ#ü}UÀm’6«ôjmä‰59z∂-<Z˘D†Tˇ¶l>ãá—1LN
ÂWH(œvÎ∞å˚Úå≥ZmXﬂ˘ ›kÍƒÃâÍ◊yî=¥ZÅ3ùro,œeßﬂ2õB/ËôL^≥ÿÂ…¨˘zå˛WØ˘Cﬁ)Fl&ÉãM˛Û3ÎAùm õjè√ÇwA<DHs£Á“7;'..öF¬ÉÂÁ…vÀ}Ö•ßp·'Ã'⁄—ß÷1ÜÈËù≥“ˇó/Â›@≥	Q4eÜ^È-0+`ÈŒq"#„´Q˝C•†™ÃÇ◊á/Z=}¢'Ko˜£4&€©<GpJ}º*´]m‚´+œ∑ÖFê|Gó{Á4≤pN˝4Í®œ#<ûπ„	ÙóßIçg¸Ä¡^O`˜†!Ö#(ûÓÖÒ§ÙYw6U:V⁄∆9¢eÇÅ3®¯io-÷w˚8›çÄ„„˙Z)–V£<x¬É˝qˇŒ+û›A£ù,‚^óA~ùò
…^2∏_™õœ`ÀJz E6æ S> dfhpï3¥Ü	–®€* $ßÄUØà2w,ü‚¶]m@t:SÊ≠ë…ÓàäÏ˝ø–¬ò˝˛gTg¡_≤È°‹üï≥‡´á∞œÉ…E7CÀ;ŒÇ7‘Âµ˘n>=Öæ⁄˝{§ªÌDó∏⁄*ÃP|‚P·”]+Ê†‹'YÜwE∂ ü≈Y>Ÿ`Ëı1¶‹
˛
|.Ë¿Q¨Àe£˚Òd7¥C¸ˇ¥√Z<¿ﬂhπ[ò”ﬁπk# Åº≈¢HΩÏÍ#±˛ØÛ)∑!,ñõÃY>•–F_≤mË£(√H∞)y
»7û»‹©Y<ä‚,ÃÉïã}vÅ+kGYfÔxÜ 38˛|e˚/hiå3œÔãˇÃ´◊l^;)º@eÁ¸ÓÌá¸“’ª<êÑæË‚6ûƒ∞aî°cx}é Û3‡©5;À`•»ìc/¡‹‚J∑‡€Zt¢ÅxÚ¡¡Y„ø“IX‹8¡_¬mQ'9ØÓ£
3$PPOLHO™ç´k˜N·z¡ÅÓBaöµÁ‰éEW¿v«Â~mÃu∂˚∆Ω¡fu<1ßA2 Ÿ=≈ŸÔ≤c¥@ÖÀHoÀ—Ì*∑v‡0Z8ãpÜiÜ¿uH>(∏ﬂ gÄÖ¢∞√ÄÙ  %D∞⁄GI0Œ/RÄ9¢)` †Éµ/chçf„hŒ˜ìŒQÑv¥S¸›5_eúç‹h~B∆ª©óY¡;:Ég‘πÃÿ√ÏN4hhØ9“\5œÀ
 /ëéÚ ¡·)‹g≈ÎÜR Q™Œ¸ßj«	R®≈‰˚⁄‰#Ó5èaÃ0‰JpŒ°◊ºÕiv;¶—©mÔÎpFA_°YúQÑÛ«gt∏%PÕmóìF.uÓÎKMF.gÉJ'èπ«Ö#GÂvÒ±SµhqiñrQxtú≈Ÿ®L/±á¿ÄÃz4]‚ç
Ö≠úRÊ»‘⁄ÕÍ√ÕíßyŒîÂ§÷‡⁄≠kÅa∑ÃwfÎ÷\‹†&6æóΩ5vÅÑp™–‘I°ï‹©fôOFW¸z¬±∑ç¿h€Øw(∂ïÿˆÂæ3SëO9Ô–ÍœÔp{pé}R∑—°… ”‚2“röia™záââ⁄†˜uóÌ\ô„hƒàé~
j–Äè~
Ñññ(ÕR˚kÜ€ï„≠π!‰≠§Ê¬}OƒUI»ÒÂ«H`¿¿ghwnzW8mª<0—Â(™õ∞®H3o∑fø=!p:7À•îI15ÖÉ¯e§Í[9Ê‰ŒYUÊwÎUZ≤Í•‰∫'›˝u∞ﬂØ≠óë8Æè¯& Är+¸ØŸ–0ƒ,—í ˙å:V¯ı1‘™≈iÖyDç{çÂ¢ìè,á´QÑ√ñ≠rıoºw#kÅˇ#—5ÓE:ä»~N¿&“1ï8IJjÎ≠ÆˇI1£"E;èƒ#^-Ír™\ZtŸãHJÕ'⁄UéÂ¯
ˆ´4(¸j
¶”	Ç¢Ö≈@µm {îdÑN¬k*ì&$‹4›∫Ål+]@ÔQ∂5Gãñ¿—o—uPπ˝|^¸õiúŸÇ¢%s7\Â˚ÔTyàC° ¡>ÒcúüÜ”dÒçÂ÷rñ°Ü(°‘çˇ¯ö‚Bù=∞Ö:GA
:˜ÎgK©T#¥ËÌãIQ$UEÅŒîƒYæ&ÓÏ±∑ûˇúÆ^©¡sÑõ≈èv3˜Æ6ÿ““RœY◊ô›œKyì˛_Ïﬁbü-–ºhAÆ±¿gvpÒ•ã≤õ›!&÷=#Í)vÚØóÄ√P¿ÍpcÑñ*ïBƒÁx4ë%ÍüNs4“/DHÑghceõ‡70ÿt≈èüMydu@‹‰ah
8◊œÖ‹Ëû~ﬁ»Õq®“1@˛ÓssòAµ ·„#…3b”QÄæ’b	yªß]ÉB∆l.ùÇåI≤€bôo√ˇEñÜX	⁄ñŸ›ã∆áßŒ9hÀ⁄1:ÚÈfgõ»æ3WM6ˆΩ,ŒÕâê‹0
?÷2ULòèGáGﬂ√I,ÀŸmßæ°ç2:)5ßy≥n
ìŸ—wıÌuñ“¡⁄Fp*=ËÎ;”ueJgƒéúO•Cv”û\/ˆ-U®}µRø¶¥=JQQ±`èa2-Æ√mDQÁ‚Õf/ŸC'“¢KàÕªÕMKÿ¨≥¢Ã,ƒ˝Ì÷ÌíçSákF±√7ÏK,*
0
¸ìû1C)˙Ü›öÈ|‰ßº7o=ÅÅÿX±(Y5Éû(≠–ø∫Q¥TM&˜Ñµ˜U™Ü'Ù∏ﬁ˙‚0ﬂ-> p“rÖùw≈ãßç‘aƒÕ€KÄ˝ø|ÛQ(ﬂº>g∞æ4˜Y≤£RVd≠rñ˘K˚©fù«ü˛‰2æø‡XﬂT FFÍÀ}‘*≤ª•`ç,]ÑÙú_3∫‹^˜∑çˇÿ˜£!ôÂqı∫ã`_Kçÿ]á|®Ô]ÂMÑCÚûx§CeD≥íî©;Ã‹Ùh‰DÛ4¥à‹¥¯òÌ:ŸÈª¥–cÃ¨
ìjBµ&sH:By£x›ÅVô{\®oóâÄ87v‡ŸÿnÕDà^*ﬁT\,¨Ÿ±lZÈòõ9ﬁXõq‰F‹ëàŒòÄ™ÊÄ£‹”`Ó≤«ÉåtrEE†æQ©eËÀÙ‹ ˜Á‹<\ì}™ÿjj€,∏≈·.àÂN2èa„iIÀxÒ<\|;Ëö&4ËÊaÜèw‘·.*S/ÂÅ;CÍ˛-ItÕ-‡@»;>75VI8cbË:æ«uê‹ƒÜ[—‰jâgÔˇ¯"Œ’£i]ﬂ„„ ›¢z‘»hªv[Åﬂ|2 ‚Èl9#î#.cﬂä‹8ÕK®áG∫bƒìGÂ≈µ:YÍˆ¢ëX
d‰+Ü¨¬˛˛G∆ìÖK´∑‘"»‘ı™VÂ¯©QXMÁ=>¸Ë
Ò¬,ûú4UªT‘hö+áT‘zC%Jåç÷∫}Æù§I~&Òd°ÿéÎ%>Ú5®8&«∞±}«{˜◊ØC#Më´âsﬂÁÕ@V&RΩYΩ°∞b',RÀB¯ãY≤•…QÆ(∂hÊhü>∆«|üéÉS ‘πë∞π ”œ”`»øà	¶Ø‹»äæ„1•‚ÄÛ∏]v—û‹©#m¬º1•êû`27%'S4yf<lcLGö$ﬁ…npÌlOÂÌ∞|Íh{Ñ!-≠¨P≤Âi;<πöxG{IËÌ¶xÊÔ$î≤ôÁ Ì.å^vçáÌëZI?bÕTìn(¶Ì¡√5Ä;æ…ütD4˘«bîoeùzkrw?è©ß,>=Mìox®◊ºﬂ∞–ﬂ~Æ€‹ÛªgGπBzñ-l≥õ^&ìx¡à9\H∫ÜÿÚIÛ¶€I0ºûƒÉôÀ”]¥©oÇí’™]ƒgìÍóúv≥Fò
xò·S@æ”±	ë8€yàÅ|≤àÁOÛ '^ÛË: zúÑõÜﬁÍ8!aAÄ†ã<Ï6¬‹åÁJA™‘-Ê◊°dﬁ∞I≠Ö¸Å®À CÀJ˙'g©Ø‚|?à±T°íí D˚®=åŒ‰AÜØ‹’{Ûª„ÁÙtoHßíüVÇåà≥ç´~§<h' sm2@49Úıq`>m‘——ÙT[Kª≥≤F…âY◊)Ô«ü∑áv5Gg;H≠Ïèî]uu©÷j«é⁄∆nná£8·ÜÚ V‚.Áì`Hä„…öıC kÕ&/è¥~ûEGD÷Yπa÷È•®≤w† éíN=ár˜uKì„,>á” ÕØ_§2ÓpJ‡&I'Q˛D€„Í‹öy˛JÔN>tJ:°£°¸éÖ∞;6öÓîË∏£!·éâk;€—Òh«¬ûGvlÃÿQ`á#ΩNÅ⁄:*jÍ®„G!ùj<—©√ºÔ8Äz«π;^‹±†p«ÜªÄÌ®ê¥c ∏é’:»ÍËÄ™cÇ£éu\†∆¨®îóY"u®—±ÄB«:Lø‰˝fw¥Î‹·w∏„∏∏ÔUÌT›«/,œ6/xGÎ 7ò~hh‰g5_o•Ø˙è‡•uzè(É¥—[Gÿìpø
~Ÿ•ß®ZUŒA˜UjüÚRıÜq¨⁄øT_·eÕRrÂ†≥ô0èz0—å≥	e#å,Q69&›:Ï+⁄`_*;ht$∏Eâ'å’ïÒ9_’®;¡©( 8sπËmg<m‘Ú9e/€ÙKÃgên|ÅRjÚFzÀLp€æútyÔÛwq≈XZjÊã—«à·öK∆◊é(‘%É2`E…≤ùÁ§ØÁ9ô¡„¬JÄb‰HN´ËÙì–“£Ã‰¨a†_3.Ó’¬:û‰?&¯„N·«)∫ŸWgPi¥÷ô7¡Áy<A`*Ù’•“i‰¢kÀ˛ >Aû˘F∫pqÇÅmÁe ë„àb˛g—YîΩˇoì-ËhÔòldŸúü”{•.˛Ä.B”gñU±‚¥¢©&¬çÀÖØq!/æûõ5/âS‡›,ºÇé‚j	˝Hí™ ˙∂êè“tr·?°NS~‘‹b&Æ÷ÉK}π ìÓ'˝X¬Ø¬ñæôPÕVü› ∆"]|qi+\QC hÉÍÎ°-¢-Ë„6oÉ0HÆ¢≈j£ó~÷Ñ¨√8LYìO|!- ª’´R>©GêÄ	W %)ÊÅg_πlZñÄtr‚Eü(˙~=ÏwªÅ‘z¸üBwA¶Üö√∫NhVaÕƒ6ùpn√È∫u[e“ı9È≠ãªﬂùÊôt∏ˆﬁ<<Nπ≤ÆÆØ	–‚ä¿Bòπ∑$Ú˛‘™Sıƒ@˙&b´#|*Ï5∆œá1}Y@è‡Ö”tÇ£Ø∏”ô˘F∏y˚’çJhWÿ’ÙJ+%Tø®!K∞“-+k›$+xu∑µâ˙ÑÅvUçrï
–a†£¯ªÈÑœÚïÍSÏu”nYyãî(ÊUv6õ
ıYÈÁ8ºÊ+{«∏≥Ô\E`0k∂)7
•G„<¨)-«˜"+
Ÿ.ÔD√È0»ZnªÊåî^<´QÈ€°Æ*º 'Káä∑˚>ºˇoJƒàÈ$∆‰MËN0%ÔKP¨Ω˚1BveEÅ”qã·O4b”ëRìr.°óO≈™xî•ﬁ·≤«OL;§Ö˝!¸]ÎQ•Oı0VJ«DÙ
g5C·YX)ø*Vù≠˜Ô„≠Ô+)/úFT3;π.ó £b>xª/‚hÓ\Dp…J¬—´≠º‚Ùÿõ4¿ôÓCg∏ŒÖ”|Ém”—˚SyYg6∏Î›´ObP~^Iñ¯ΩÀ“ê.‹°&kHËuøü‰ÃJBﬁˇºÄ	c‡◊nΩ;Ü—X>`öC Ö'Ôˇ5à≠lbÍ^‹≈Daﬁ÷ÒÊKÛiíØá1R∞e>ê‚ÚARvUÕ…„±9,nl#ÇyŸäVgp®PÙÂL˙Kw∞OÿÚXyu„2Iiù¬K"ècêË…eËFˆÃELreŸ™ÑÎZ-{ïÀ¶P◊xs3V¢ﬁ ;‹»îG⁄’≠˚/09'…≈‹≈+ñ≤WŸÆÜïOu!Õ/‘À£Y∞”òüwI˜˙≠€$&™⁄L/≠eÈ,≠ﬂ+Fµ[ïEps6)hà∆a2L˚ÌÕ»kVØFcû’™$…x´∆¯Øë
©eSëÚèh‘¯í„5W…7ôèÄÈ”Î≤c
πénÄÈ…O∑i|qVhRPí8≥π«s‹§Yÿ⁄9a	œ⁄Äqy˛>¬2B`—˘ÓÊiVΩÎ¯ÈwYÈ°6Îå∂√òîfÏ˝f«OÔs<-gË«◊|Sj∂≠Ód÷ ™@˚_ZxˇÀz¿’=(L{h®÷ÆyàÙ◊`B{W–4	Ü–‘pˇ?   ˇˇÏ]Îr€∏˛ﬂß@5ùJﬁq$[ëc;õ8£» ÆªN‚±ìl;ôùîí`ôª…%%;ª˜]˙´”ŒÏüˆÍ+.$ (ÀéúZ3πX)êƒ˘pp.ﬂg>Æ‚πk∫˘Zî€ß ¡Xx˚ºg¥·*c‹£•bbΩö|Ô<ÅÁÛd∞∑p‹”}Ÿı¶Oá=&≈⁄;ãÅ"ú£oöÃÉ1πRx¨xxDuÑ….ùÏ‘aÛ‡'	SmAÁ4U£˜e{”uÙ˝ô7K∫Q'{A6É0¸iùÏÚ˝‹≠c‹9T‰Å¨∞î a…i…,Ÿ∑¸¸˜z†‰§H5√W*ƒ∞o+
—∫ªÉÏÜ-‰uÉQ˙£÷QÔ@qå∫™#Nˆ˝sDcÁxLûqå à8aÒ Ωo¬ÓíŒ9yà@ùkÁh‡≈1d1©C‚ËQ◊Ë(ás‚G¯T@M≥ﬂK›62® Á+z[\›»—’∫MT3˝Ú⁄=‘¸îØ$!éô•¶»‡∑Qã÷çNééí5g‰ì	˘`>0öW∂®Ô¥ÖÇˆ}W!¬zøŸ‹…•VêB0—z∏Å)⁄N÷√%ì∫kZ∫:ÆÌ£‰bZÌ òçhÔO	Îæ∏ã\ iÜ°*"∑-ö5ÍÇ3ÖXÈÄ<πs!Â>ÚòÇ©ˇ+_ø)Æ·è˛¿"ïË5@äl*Å“jjìµ«ıuTû´áè2Òwz$Ÿ¢ú„Iëë√ûåû]ÁXfïì©ÅKÄn%Vk§/≤LAv”∑hCÄóöwµ∆‰‰∞√√Õ¸—éRbQ∫k&qáMb:∞ô«àõõ“úõâãimxÚ√¥LWÎ 1?3Yín%ë6≈Å/%4°Â4‚â≥)àß¿Å÷öñ˚«2êÕviÑë-ø˘(&Ì aÌ⁄˘a °ädç£˙£»Û;óÌ€PÙè*˙«î/…Ÿ)#eÆ;∞?cûHπÁ%ªáPGòOÃ˘"7¢XtñÛ3,ë¶À6Õ%˝˚öòÇM≤zó›õZ≤†ÉKÛ/#ãuA{ÉÇ
{3∫œ]ÍKîîÄô+¨≥!CQf∫æ¥¥cÀÃ0fN‰ªá#E^4kN#W´nw⁄¨¡ÑÔª&(®‰ñ}È”ﬂ‘O¿j≈ıì∏òcæü«Kò«ºx∏¨2˛∞õò√Zä1çˆJOˇ\}òd‚}Ñõ≥üká1»Î'~0å√ÄÆŒ¥ã¶æn ó◊˜9«vpè7¡ÛÑiDP}?°Îºœc™é
<‚®ü„È3 Ab°ƒ≥ì¿^mÅ‚–Ûà#Ò“~≈±t`≥Æc Éó°»t¢/Rø÷Í›Í–ûá–Í“^h‰”_À ${ÙV°Âs˘n&(≠^x˘-öÇz9c	ú-pêÛ
ô≠dâêSò√◊}Èoúúd¬Çt‚Ê`#’0AC±ãJ}1Ó_¬∫'>d70˜œ0¬(∆>o≈íèˇ∞l¿>ëÑHDq8òêÖÜÚEΩ8∆c∫q Ÿ ã ,E¢˛∆?A˚≤@¯—CÉ°çöòÖ3»˜@4ÉuÉ•«5•s6«2sb}Ü◊)=A˝ôúÖßÙl√ùh‰sÕy¿¯Tpl˚S}ëÈ˝í·%5Ç—7…&é8‡¶o–ù≈b2â∆Çô÷1˙2K˛%–≤Ô{„‡Í? ˘dÀ≈π#å†ë1·À!3âƒ≤†e’uΩﬂ¥‰ïa≥∂«´öM·µVµ‹JÈ‰H´Ãj{ÁõÕvsøﬁ◊çƒÖòP2®)ïås”¬és”B€ﬁ¥†ôBbÉel1p®m(ÜÄé'≈ﬂqÚ∆S=S[B%™„ÙqS∫;∆glôîåPZ}âÖCzâ∂µ_‘®6@áƒ)∂–√)°eÜ#·Uëö[Ê!(ítN‰Ã›ùÓ≠Ûp"∫≤:Ö|„¥"w∑⁄HÓ>ŸCvºæ’à‚2°˜@÷ˆﬁà8§xZ∞≈41y≥◊ßîHÅ6“ÖQÅÀ;åR2oÚﬂ=¯ÀLÁÕGß%ıøst)?ˇ¸'+*Í'^˝vJU€‘7àmòi-RÊöß5HÕt‡%Y‘æ˜ãÖ=ŒQî^yRWUxÅ«™|‹˙=:Æº–g…1ú0§Ïs…∫IN^´	∆©`,»ÊÜ≠ –°)@◊õÕÚ,7S∫ùä G«(»A÷ÂÕREπ…Xﬁ˙i¢Bñaq∫BÓ…ûRjÛÁ≠µŒ$»≠9∂⁄tC©Aı∫©xk!o—û.Jr¿Á¸LuåZ[˛›ï√t^˛)˜#_˝éV◊Sl\2∫gò{;œqbQ¨˛ÅÍÙ±‹`KãÌ›ámbKêìgµf_ xØ"læßw	2πk∏d¿Á=\Æ\Úárc`ô€e|!PyÍ_P∫zπN˛+≤ÉÏÕCÏÀ´%≠n@s√«ªïjm∏…0ìHLã¶Ã∂È¶ËY`‰tå≈›!Ëq’ø~LúS™ﬂxD\ rD:rébmnjs€¥67åa@∏úû'˝qCùW,œÂ'Ç«íWd—Ö⁄o$G†éÆU¶äJØÜ∆fA™< n	fõ…‘9´øKy7ÒÅîsfú£p#fUßS$Pn“P,ªôD÷®?®Ø5cı¶∏±÷¸1ÙÉFΩE÷6]AùÒv™ @îL<>ó†ÇÆ ÈSÎ+‘ˇ8ãÁî˝Ê´Vqë∞§+H{KÜ ¨ †3_]L~|˙•G◊ˆN,å≥kµ»ÜUs•Ìé4[õæ—›‚´•˜Ú˙‰Åæy›=¸Æ{¯∂_!qC©óSM¡≤≤Ö9mH°ßËS¶=®Â1zEØ£∞ò›e*|tBnº7∆M®å$’®OΩ`N¶¿Oﬁò<üÇ∑ˆO'Ø_5√6Æ—ö]·y?6Fg∞éÍI¶?YO¬Å7©Ø≠£OB°A\„%º7≈1–òCQ&∫¥|gãÂ«•£óê	+™ÿfºJ\Àñwﬁh ≥(rÈ¥BÁÉIàˆöL•™›∫ª‰˙ ]?Ö”wﬂÿƒ˛*π´Ä{Ω0&É#K»üxËéÿ«Û◊–-cá>Ò¡Œ-`_⁄Å¢á>ÈBW¯r‹Ò:¯
fÚ™Ä}9Ú˘ªÄÄÏ˙o%˝ò{8,›∞¨2æ¸ÔøECó7´uÄ€ΩfÇ:®6}qBr≤ë‰N¨g˙I‚Å{æ~¬¯†Ísd¿!äxd%úÆ&mÛ
—ÍÔì·‰B©™[Ìˆ*◊Â¥Ô$Ö$óÛV≤≥¨‚™BÉ≥ÆÉYe·Ê%∏πÜ,ì4◊6ÄÑ}—fY90#dí€|m†RßÓTmJ∑ÂRñ&åêx…Ã«^ä-=ô^_÷Ú,˝|¢óè™à^»/ïPW•›|…JÍŸ÷¥pÓiÂö©ÆkN∏·»RL-ÀûçTU”UHQÄ7ì
Ô^W˚RÊ= Å~∆So¬7¸)˛œs<ÕQT“BÙ§§£…÷~l˝UÔü«apL˚xµ›œb‡˘!ä∑7MÖ“∆X±Æ]’Bdaù™·ËîÖªNH∆Œw8’‹'c√æûY[ç∫<æÁbÿƒ4{‘Ôw≥ÀÍV©1!€e°òùº%Ï7k…{C¸H´È.E¥Vä€}∆\©Ë§à_Œ"à@ß‚MŒÃ¸$ìÀmWˆÌtvöYÈ¬6)	`≠íIrNî’3I>0aíÈèïMÚyÏ„S:ÔîYæòB|Ê-≥Gn1 !◊ø°[„0iùñéÊÓ⁄¶QµπJÜövñØñô^ﬂ&&zË˝ÇcWwvEÏÛe»RNê˘";›ë’Ô\∫ùˆGd/Ø#/Â#fÀu«ß|dë7b∞#ÀÚæzf[†V‹—q∞Z[ï¥Å^miCYxES’`|40;í'Ú9"ªí–D&dõêE¶„⁄^7I9e·¬Lîw»£†°O’õ¢y@Èz @XÈå∑·Úªπ^8Ò»˝4å/«ÃÁ{	tÄê¬ÛÄL® knﬁL˚úZˇ¸›s©¶êCK\§e\R¥U‡ŸZ∂ 3y.@ñ-^™Ê _íi¶\HDìËI&väûô©ô˝È%ÒiÓ„ó»õÃû÷ËëG1>Øiñ‚3ˆOH≈®a¨∆∆‰5Ù∏¸˚kg≥Yî<nµíπ∂aÛ¬ˇ»ˇ7ß- –ÚZ€è∂6vv?t∂€É≠á[€;[õù›á€ﬁ∆Ópc{Ä;ªù›≠áªÌøMœ€Õ(◊ÿuÏ„So>ô!∏ÂRv»uÏ†\(!Ωû`Ê˘Å˘äeÖ¢≠4Ù-d5SÖÃén“)3CÃ‚P{¸díÛÍÏòjÀEƒÃ´£TÊÛ0øuåd}Ñné”≥ßOÛh,a ¿“ÛaÛû<≈·G‰AR˘Ì÷Wµ\÷´Åm,ãH$∏‡‘Ë)JSWsÚ¨˘~„s∫Ji·sˆZ¡|‡Å	?Eæ@/|–IÜ7lÃà‘)áFZ≈]˚˜ÇÙR”£îwAºEıä¸;»`êI‡˙ıƒ„°ï7øe"…çÏÎÏe¬Wˇt–ë~{|»ÓÛ,≠1s£kºïƒÿ›ãqm µJZò	∑zÊG¥g®î2 ∞NÍSÏ.øÜÏOvﬂÜÒà¢&;ÖÑU∆C»Ibê¬ÛyÒœs‡Y£Ÿ¨yû‘PÎ◊Xcl± úË∑®Ú<ßT¶≤Z+Oª∂À˜úneåΩ&sN“ÙK∆l£Ó2èÒ>¡a’^ÒºHÿ˝öUœ˜n}}RÖ‰+8_ŸA‹ÎyëwÛ.X·∆ÊO/)óﬁTejIM—À<»4U-¬ë÷È|Ôäπ∏b0ëÓ]1„Î≥∫bõm≈v‹}±&Ó=≤‹áoŒ#;`^Dj êﬂÜSlÊÜ^Mü¨üÃRw,—∆?Ú¿M£·$ﬁ“ögá'üùÖ#&<Iæî4˙÷ù≤‹Ñ_m◊å¡Ï™∫fj@◊P∏ãYI©ÆSr√4ﬂ-îˆRÿ◊Lt∑‘rébπGÛ‰l∆gáaiîc‹∏‡3Yo∆`çQk‰ëG0Ú)N¶aë
˛¡çm“ƒ	DÆY
c]˝ì,îLr6ˆ√,Ê$ÒOÜPÌ£©áÅö<üIµΩ«˝Á›ì˛áì˛ÒªÉ^ˇC∑◊{˝ˆ’õ'-8«¬UNˆÓ‡MˇCz∆w›£É˝ﬂıˇ"ŒxÖÿºé«æ∑]ñ‚D˝ 2!0T˚t»¸ÒìgÑ„8Dµ˜Áƒ»…<B†∆InÔ¨|B‚¸¿-ßVM‘√1<B≤Y~ê–*ı»ög~åhAzº€gr@•ö:ƒC†˘Eû;3uæÀ$nq€∂-ó[†¬RŒ˙`A/œ´W ”÷Ëë!^˝Íf÷ü›D©@’&o¥e‹	ﬂCGêæqŸ⁄C›˝ó‹£7u7€8¨º7ÅmJa∏˙N“Éú	ÛF~Zí£ß“]3πòybgQFœ1[ÛÆÆ√R™âW∂oê*åü°∫‚\‰ºä“jzˆûRT@π¢ÛÒíBpÑÔ 	¿à¬úØ÷ñi√ä»µ‚3≤⁄‡"b™6õÕ
e¸üâ+‰ÛÿÛa8ˆÉ/⁄î'pÖ'ãÿÛ°|‰ΩQØÄQma˙lñb◊Æ~¿2I+n◊÷OÊÉŸ’o3hãiH˜Oo˜ü›Í‰·(⁄;\8ê≤8Smèu¥˙*6oÒVãWÏ˝#ŸKxœˇH≥d¨Z›–è<Z4± AEjëíJ'∂`øÈÿo“{¢+‚QC@#.nıú<Òyt)ÅñÅ≤†FN∂ÖŒÒ≥¶ˇJéuàV‡jßQç¢bå•Â*kÆZ†fÙ‚¡f™>;YdK∫ƒkuAŸÂ≥¨0à¢C≈ÆàŸÏÿ™EM+F•∞≠ 5_÷_Y€{Nl√ãõ-ïñQ€dñûxìs bçîxJªì´EÖÃ¡@óZi¬ ÷„”&¡ëò<∆gÕ!óâSj§%´(÷ó⁄CÜsCYÛ·çX¬ıõ+ò¡€('∂∑íFpL~hnπv–⁄”V±3p[rÏãI´÷q¸Xà¯R√c∫UpÔ¬C˛K∑"gÆç,•˚¨±qÅŸ¶»!à\C©eV1RS˚U¥ÀÙä”$732Nù≠¢≥q[Vy+õrLU¿†I¢‘îU¡∞∑Ê}∫ 1ysﬂ“XP—™ﬂÏw˜_?F›»{h6'û%FÁ·dÊQÜo[$b2tÎ[πJrÖÈøWu],L  ˘¬œÖÆ}3¥–˘'¶‘ç]d9ÒŒãõØ<ûêhê$øAJﬁA˘•6gÃí’ÿx‘Ÿ¶W<ﬂ,
lkEËC·KËÓñ1“˜4€ ˝ñπ≠Ïà‘©îﬁ0ma’7"¯H˛Á›ˇIiƒåPn.≈Úº‡ü!EI˝∆`!WçÖ®GËk≥Í‹˘d<,§j%*µO:„S¨,="˜~˙ﬂµØw˘ıÔ˛  ˇˇ Â˚B