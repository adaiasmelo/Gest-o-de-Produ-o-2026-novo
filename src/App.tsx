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
  const [dragOverSlotKey, setDragOverSlotKey] = useState<string | null>(null);
  const [draggingEmpId, setDraggingEmpId] = useState<string | null>(null);
  
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
      const currentCols = updatedCollaborators || collaborators;
      const silencedColIds = new Set(currentCols.filter(c => c.isSilenced).map(c => c.id));
      const silencedColNames = new Set(currentCols.filter(c => c.isSilenced).map(c => upgradeName(c.name)));
      const silencedColRegs = new Set(currentCols.filter(c => c.isSilenced).map(c => c.registration));

      const operatorNamesSet = new Set<string>();
      
      currentEmployees.forEach(e => {
        const nameNorm = (e.name || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const statusNorm = (e.status || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        if (
          e.isSilenced ||
          statusNorm.includes('silenciad') ||
          nameNorm.includes('excluid') || 
          statusNorm.includes('excluid') || 
          nameNorm.includes('desligad') || 
          statusNorm.includes('desligad') ||
          (e.collaboratorId && silencedColIds.has(e.collaboratorId)) ||
          silencedColNames.has(upgradeName(e.name)) ||
          (e.registration && silencedColRegs.has(e.registration))
        ) {
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

  const handleToggleSilenceCollaborator = async (col: Collaborator, shouldSilence: boolean, reason?: string) => {
    try {
      const now = new Date().toISOString();
      const colRef = doc(db, 'collaborators', col.id);
      const updates: Partial<Collaborator> = {
        isSilenced: shouldSilence,
        silencedAt: shouldSilence ? now : undefined,
        silenceReason: shouldSilence ? (reason || 'Silenciado via Base de Dados') : '',
        updatedAt: now
      };
      await setDoc(colRef, updates, { merge: true });

      // Atualizar logs de pessoal
      const logId = Math.random().toString(36).substring(2, 15);
      await setDoc(doc(db, 'personnelLogs', logId), {
        id: logId,
        userId: currentUser?.uid || '',
        date: now,
        employeeName: col.name,
        action: (shouldSilence ? 'Silenciamento' : 'Reativa√ß√£o') as any,
        details: shouldSilence 
          ? `Colaborador silenciado: ${reason || 'Sem motivo especificado'}. Hist√≥rico de produ√ß√£o preservado.` 
          : `Colaborador reativado na base central.`,
        user: loggedUser?.name || 'Sistema'
      });

      let updatedEmps = [...employees];
      if (shouldSilence) {
        const affected = employees.filter(e => 
          e.collaboratorId === col.id || 
          (e.registration && e.registration === col.registration) || 
          (e.name && e.name === col.name)
        );
        for (const emp of affected) {
          await setDoc(doc(db, 'employees', emp.id), {
            status: 'Em Contrata√ß√£o',
            name: 'Em Contrata√ß√£o',
            collaboratorId: '',
            updatedAt: now,
            userId: currentUser?.uid || ''
          }, { merge: true });
          const idx = updatedEmps.findIndex(x => x.id === emp.id);
          if (idx >= 0) {
            updatedEmps[idx] = { ...updatedEmps[idx], status: 'Em Contrata√ß√£o', name: 'Em Contrata√ß√£o', collaboratorId: '' };
          }
        }
      }

      const updatedCols = collaborators.map(c => c.id === col.id ? { ...c, ...updates } : c);
      setCollaborators(updatedCols);
      await syncOperatorsSetting(updatedEmps, updatedCols);
      addNotification(shouldSilence ? `${col.name} silenciado com sucesso. Hist√≥rico de produ√ß√£o preservado.` : `${col.name} reativado na base central.`);
    } catch (err) {
      console.error('Erro ao alternar silenciamento:', err);
      handleFirestoreError(err, OperationType.WRITE, 'collaborators');
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
    employees.find(e => e.sector === s && e.machine === m && e.shift === sh && e.role === r && !e.isSilenced && e.status !== 'Silenciado' && (e.status === 'Ativo' || e.status === 'Em Contrata√ß√£o'));

  const normalize = (s: string | undefined | null) => 
    (s || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, "");

  const isEmployed = (s: string) => {
    const n = normalize(s);
    if (n.includes('silenciad') || n.includes('excluid') || n.includes('desligad')) return false;
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

  const handleEmployeeMoveOrSwap = async (
    draggedId: string,
    targetSector: string,
    targetMachine: string,
    targetShift: string,
    targetRole: string,
    targetEmp?: Employee
  ) => {
    if (!draggedId || !canManagePersonnel) return;
    const draggedEmp = employees.find(x => x.id === draggedId);
    if (!draggedEmp) return;
    if (targetEmp && targetEmp.id === draggedEmp.id) return;

    const now = new Date().toISOString();

    // 1. Same machine, shift and sector -> Reordering within the card
    if (
      targetEmp &&
      normalize(draggedEmp.sector) === normalize(targetSector) &&
      normalize(draggedEmp.machine) === normalize(targetMachine) &&
      normalize(draggedEmp.shift) === normalize(targetShift)
    ) {
      const cardEmps = employees.filter(x => 
        normalize(x.sector) === normalize(targetSector) && 
        normalize(x.machine) === normalize(targetMachine) && 
        normalize(x.shift) === normalize(targetShift) &&
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
      const toIndex = cardEmps.findIndex(x => x.id === targetEmp.id);
      if (fromIndex === -1 || toIndex === -1) return;

      const reordered = [...cardEmps];
      const [removed] = reordered.splice(fromIndex, 1);
      reordered.splice(toIndex, 0, removed);

      const batchPromises = reordered.map((x, idx) => {
        const docRef = doc(db, 'employees', x.id);
        return setDoc(docRef, { ...x, orderIndex: idx, updatedAt: now }, { merge: true });
      });

      try {
        await Promise.all(batchPromises);
        const updatedList = employees.map(e => {
          const found = reordered.find(r => r.id === e.id);
          return found ? { ...e, orderIndex: reordered.indexOf(found), updatedAt: now } : e;
        });
        setEmployees(updatedList);
        await syncOperatorsSetting(updatedList);
      } catch (err) {
        console.error('Erro ao salvar nova ordena√ß√£o:', err);
      }
      return;
    }

    // 2. Cross-machine, cross-shift or cross-sector movement / transfer / swap
    try {
      const sourceSector = draggedEmp.sector;
      const sourceMachine = draggedEmp.machine;
      const sourceShift = draggedEmp.shift;
      const sourceRole = draggedEmp.role;

      let updatedEmployeesList = [...employees];
      const draggedIdx = updatedEmployeesList.findIndex(e => e.id === draggedId);

      if (targetEmp && targetEmp.id !== draggedEmp.id) {
        const isTargetHiring = targetEmp.status === 'Em Contrata√ß√£o';
        
        const newDraggedData = {
          sector: targetSector,
          machine: targetMachine,
          shift: targetShift,
          role: (targetRole && !isTargetHiring) ? targetRole : (targetEmp.role || draggedEmp.role),
          updatedAt: now,
          userId: currentUser?.uid || ''
        };

        const newTargetData = {
          sector: sourceSector,
          machine: sourceMachine,
          shift: sourceShift,
          role: sourceRole || targetEmp.role,
          updatedAt: now,
          userId: currentUser?.uid || ''
        };

        await setDoc(doc(db, 'employees', draggedEmp.id), newDraggedData, { merge: true });
        await setDoc(doc(db, 'employees', targetEmp.id), newTargetData, { merge: true });

        if (draggedIdx >= 0) {
          updatedEmployeesList[draggedIdx] = { ...updatedEmployeesList[draggedIdx], ...newDraggedData };
        }
        const targetIdx = updatedEmployeesList.findIndex(e => e.id === targetEmp.id);
        if (targetIdx >= 0) {
          updatedEmployeesList[targetIdx] = { ...updatedEmployeesList[targetIdx], ...newTargetData };
        }

        const logId = Math.random().toString(36).substring(2, 15);
        await setDoc(doc(db, 'personnelLogs', logId), {
          id: logId,
          date: now,
          employeeName: draggedEmp.name,
          action: 'Transfer√™ncia',
          details: isTargetHiring
            ? `Movimenta√ß√£o de ${draggedEmp.name} de ${sourceMachine} (${sourceShift}) para ${targetMachine} (${targetShift})`
            : `Troca de postos entre ${draggedEmp.name} (${sourceMachine} - ${sourceShift}) e ${targetEmp.name} (${targetMachine} - ${targetShift}) via arrasto`,
          user: loggedUser?.name || currentUser?.displayName || 'Sistema',
          userId: currentUser?.uid || ''
        });

        setEmployees(updatedEmployeesList);
        await syncOperatorsSetting(updatedEmployeesList);

        addNotification(
          isTargetHiring
            ? `${draggedEmp.name} transferido para ${targetMachine} (${targetShift})`
            : `Troca realizada: ${draggedEmp.name} ‚áÑ ${targetEmp.name} (${targetMachine} - ${targetShift})`
        );
      } else {
        // Moving to empty vacancy slot or machine card
        const newDraggedData = {
          sector: targetSector,
          machine: targetMachine,
          shift: targetShift,
          role: targetRole || draggedEmp.role,
          updatedAt: now,
          userId: currentUser?.uid || ''
        };

        await setDoc(doc(db, 'employees', draggedEmp.id), newDraggedData, { merge: true });

        if (draggedIdx >= 0) {
          updatedEmployeesList[draggedIdx] = { ...updatedEmployeesList[draggedIdx], ...newDraggedData };
        }

        const logId = Math.random().toString(36).substring(2, 15);
        await setDoc(doc(db, 'personnelLogs', logId), {
          id: logId,
          date: now,
          employeeName: draggedEmp.name,
          action: 'Transfer√™ncia',
          details: `Transfer√™ncia de ${draggedEmp.name} de ${sourceMachine} (${sourceShift}) para ${targetMachine} (${targetShift}) via arrasto`,
          user: loggedUser?.name || currentUser?.displayName || 'Sistema',
          userId: currentUser?.uid || ''
        });

        setEmployees(updatedEmployeesList);
        await syncOperatorsSetting(updatedEmployeesList);

        addNotification(`${draggedEmp.name} transferido para ${targetMachine} (${targetShift})`);
      }
    } catch (err) {
      console.error('Erro ao transferir/trocar colaborador via arrasto:', err);
      alert('Erro ao realizar transfer√™ncia via arrasto.');
    }
  };

  const renderSlot = (sector: string, machine: string, shift: string, role: string, label: string, employee?: Employee, keySuffix?: string) => {
    const emp = employee;
    const isHiring = emp?.status === 'Em Contrata√ß√£o';
    const isVacant = !emp || isHiring;
    const slotKey = emp ? emp.id : `${sector}-${machine}-${shift}-${role}${keySuffix || ''}`;
    const isDragOver = dragOverSlotKey === slotKey;
    const isBeingDragged = draggingEmpId === emp?.id;

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
        key={slotKey} 
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
          if (emp && !isHiring) {
            e.dataTransfer.setData('text/plain', emp.id);
            e.dataTransfer.effectAllowed = 'move';
            setDraggingEmpId(emp.id);
          }
        }}
        onDragEnd={() => {
          setDraggingEmpId(null);
          setDragOverSlotKey(null);
        }}
        onDragOver={(e) => {
          if (canManagePersonnel) {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
          }
        }}
        onDragEnter={(e) => {
          if (canManagePersonnel) {
            e.preventDefault();
            setDragOverSlotKey(slotKey);
          }
        }}
        onDragLeave={(e) => {
          if (dragOverSlotKey === slotKey) {
            setDragOverSlotKey(null);
          }
        }}
        onDrop={async (e) => {
          e.preventDefault();
          e.stopPropagation();
          setDragOverSlotKey(null);
          setDraggingEmpId(null);
          const draggedId = e.dataTransfer.getData('text/plain');
          if (!draggedId || draggedId === emp?.id) return;
          await handleEmployeeMoveOrSwap(draggedId, sector, machine, shift, role, emp);
        }}
        className={`flex items-center justify-between p-2.5 rounded-xl transition-all border select-none ${
          isBeingDragged 
            ? 'opacity-40 border-dashed border-blue-400 scale-95'
            : isDragOver
              ? 'ring-2 ring-blue-500 bg-blue-50/90 border-blue-400 scale-[1.02] shadow-md z-10'
              : isVacant 
                ? (isHiring ? 'bg-orange-50/40 border-orange-200 hover:border-orange-300' : 'bg-red-50/10 border-dashed border-red-100 hover:border-blue-300') 
                : 'bg-white border-slate-100 hover:border-blue-400 shadow-sm cursor-grab active:cursor-grabbing'
        }`}
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
    
    return (
      <div 
        className="space-y-3 p-1 rounded-2xl transition-all"
        onDragOver={(e) => {
          if (canManagePersonnel) {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
          }
        }}
        onDrop={async (e) => {
          e.preventDefault();
          const draggedId = e.dataTransfer.getData('text/plain');
          if (!draggedId) return;
          const defaultRole = !machineEmps.some(e => e.role.toLowerCase().includes('operador')) ? 'Operador 1' : 'Auxiliar de Produ√ß√£o';
          await handleEmployeeMoveOrSwap(draggedId, sector, machine, shift, defaultRole, undefined);
        }}
      >
        {slots}
      </div>
    );
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
           xúÏ}€n‰»ï‡˚~EXn[)∑2ï∫∂$KjËVÌó∫Ñí⁄ˆl°‡b&#%∫ôd6…¨íZ0ã}X`Å›¡Ó`ﬂòiÔÜËß¡Éy’üÃÃ|¬û$ÉdD0H•TU›ïËVeÚ◊sNú˚!D˘^ÔŒ≠˜6G˛É˙æ¸ÒÇÄF/◊õ∆ª7Î∑6ÔÑ”$g´oıéÎ$ŒØ)Ïç„OÈú≈Å3¶Ï¸bÛÇÔ®ø{—¿•—·4N¬±˜-uü·e´1N◊ıÇã˝‡¬ßª7´∑µØÏY4∫sH}üå<ﬂﬂù˚Èh}ãˆs$N¢k
S:Gñ∑≥‹lm.∑hggÈ‘£èΩ†√K'J‚Û0ÙoBFa4vÿˆ›õÏ‡6qÇÎ≤ª'n¸ñzóIÁÀÈx@#|`a·÷j8œËlÒÜap~=ÅôΩhË√\ﬁFŒdB£≥‰˜‚˙	í3ÿŒm≤µ»~.∑…¸ Ù›yrk—õ¸!ŒÀ¸‰Œ“O¬ ˆﬁ–CË Ò GLØ,êm“17Èzo»–w‚¯KÄÊ›πÀÓhä€È”+‚%twá4ÄÂ% ∏ıF◊ÈœÑ^%›ÿw⁄]Ì˜Ÿƒª8a~„ÂrrıäLq•ÜNLÁˆŒËò∏4¬iLÜ°O«„ù%Ëﬂ8=∞◊º[ûŸ‡BåwΩO¢p
∏ËvWÆ|2ÈÆÌSë≠Qﬂπ¢Æ<”òÈ å ã≈?‚˙2Æ@e≈.úIwÖØÃòMœô&∫Û4Ö$H⁄ΩY^ªïGŒF0 ÍCÔì¯2ÚÇØª˝¥⁄â'N`ß#oDÅ(=«áΩ!ÄZæ„çaÓ€6 ppQüÔfø?∑wS¿∞'πÏ9É∏OESXö„ax@∫:;–Ú5 è»∑≥ƒ[ﬁ3”ΩõB3{≈f»Ádû\–à8CoÏ7$ùD·ê∆1\&ù˝·›øåß~à£@qøô“Öﬁ<†√|·AÈ˝7°?”HY#ÄcÒtÃ⁄àh|˜Ω;ch≈Da~∆u7≠·¶ˆñ∏°∏s≥Ù‚∏oú`K6¢N2çÄJπ◊plyC‚zc
ÑfH~N∆4âºaLË’ƒ#Ä›_,©&©@©∑ó Û>Ω\Å}z(µ`
K¯∂è’H5§›ÎÓÜ/*ΩÒ≈ñ†°…†ªf†Xöº•4–b_π5&Ø∞∑‹¬[†‰ˇ¿
yÅÎ]Ñ8NÜA‚'íít’ÆÍÈ≠ôtÏÔçó\Ú±“7û9t”ÿ€ÂjÖ,\≈‚ù·◊§H)ÚSÄ$‹F⁄ö Õò€{·¯ìPrr˜Ñ@'¢‹˝iå_wñ.WçôT∆!H∏4Äµ¬·§ [0>!„§ª<∑wDG^‡êêPÔä°ΩsM'–~ê¿5‚ê±'í	˙«uÄ7ã†¯;ÄﬁΩàÓæ„∞≥4ô=ÄõÉiíÑÅû~Ü¡°ÔøÜà1B1Mû¿ë#@∆dtÊ^ó±Q]AÊ«¨¥∆ìÓroΩpÙT_Üoh¥-√6ûR¸™˛K“πÎ_‡ ˘IÄ u`84«™ûΩNº∞πﬂxÒ‘ÒΩoaÂÅ√8á3õ^Rœ—ΩhÿëÁ C∆|%=Ö◊h¥≥ƒ∑¡H≠≠»C}¸”E÷R‰=ëÍ¨âm¡ƒK2˜¢[7›∏ÒP8£>&a¥MˆxGdÍHæyƒ¿«±a.`∫oˇ÷≤õÀ$o≥o^ Ì¯&
äßfù7YcJ ≤¶¶,ùÁˆ‰ôuéÿYw˜¬Ö⁄„9fkcbNòú∏{3é8Ó|€11äq!¢]p/uh.† ^⁄Ë–^‚D4È±.(Iîá∞
Vä«Ã‰
ò›…5∞•2πT/g*‘>»]„‡±·4ﬁépïW‰÷ßQF›IË±3L≥?úç/W◊†k=z	8A∫!vb.ÑN ÁπΩˇ˚ˇÒ…Û	„£ù%˛XÉñ∆Œ¶ã˝˜øˇ∑˛[r¸Õ‘‰øEsÒ•7J∞±ˇı?…˘4
,⁄ ¯d Xs2X!˜	ÂG’)Ï“¶·œ≈7ﬂOyÜ|ÇÄ›|≠—ªÇŸ¸˝è®-}Lt„ À?Û‚§7v&<qikîˇæ¶◊ª7¯Jœso”-MÔÒoL)wkÉ’FƒÏıîFwﬂá w∫“·8º˚3Y3B⁄ï˜i’ìú‚N∞M‹—s8ÛGåπ1ÓûVö(°/1OÒèX¨€Æ‚9ùFpÑ"≈˛«òÏ'S§‘çO”ïﬂèa.„πΩ8⁄b∑hc5kcµuY≠€X˛˝5uÄaY&˚èÕú=aLq &ÕÜæ¨òˇ‚›—ó“Ùj)ãjélj È 
≥¶û>‚πªsàäo<0†õ≤≠›â;ÍÚ˜Õ∆§ˆ$eÂ} )≈ì®û¿‡«•#gÍ'ø·Xcz∂∆pRD?4G¿z√⁄Îıl∞h‡=;ñ≥%·§û))±%·$„H‡Î˛±Äâ©'ÏÆ≤0ˆí0c–º7%5”MÕ"√ N‡xı….qêP®Í¡ëzÏS¸zp˝‘ÌÃõ—c~Oﬁ_ùü<„‰Lº˙ÀöûΩÈ`ø?ˇ9v/8⁄ÒTÜáQrÊ°’5›z /ùºë∫ûo	ıÍªr|äjπS \#ÁM-í8P2ì0•’ÅC|Ä=á8!Ò—D¡¥è«ªr"xe ®;Ω˙”ÿ{ˆÊÎGhºkæm‘ôóÏÖ)IÕ5Ç
-!“ïŸt;¬¢t∑Ñ∫±hf∞aî¥t®§xÃÌ%BfG°ÑÚÄo.ˇq∫¸hTJè°{êÆ'ûOœaé©Vrµ÷†ÃMŸ8Íé¿:e&‚^f++EËE‰πˇ {#o·nÁ?WÈlE’÷‡exØãS ¡√7¥è`b8 S˘ìÈ…èúƒÈ˘4∏H.…Èìœçî~Gaõ' r…%{}Ùzπd¶RÒ´fúàçÅ˘ßÏVÜuË'ıÓ P‚ÆÃë1à(^Ä>	I8Ÿ&Îã$‚û+˝E‚”|Î‚◊A{=Ü øk=ô¡ﬁsÇ/pw∏[«ëHEŒ50‘d5wˆ¯Èhs‰åÜ˛;ø€øÚbqÿÃ9CjfkÕYl‚ÖY˙X¸µ‘Âòùã0∫ûÀ›ò3O>Üµœ÷◊7∂f=kÔ~‡QóÎAéË®ó= ºXl:™w.*π?’ø }÷Fkt›‚˘H∏cΩ»€dˇı_’;0·nÏﬁTWÅkmj_œyú_æ¨ı'1gä }≤ªªKÊSÜdû¸ÒèDıÄ–kÔ3uºÁÅüK'pﬂE∞‰pF•a-≤ÕÎ·R’ûÛ¯©_∂öÛ?ÖÁÂ∑a8ÜÛªŒÆﬁÁ™J{ë≈Ó¸~ëx6l6~∏3◊ˇ›rXΩ9|˛Ï˘ã≥ó˘·_MeÂ	ffªYüKÄiué[)=7√ç‹ªÍúªÀµÎK‘R^ﬁ}GRp˜gn-â—x>âBw ïò√p<qíªÔﬂPØŒÁKªﬁıZÙ' g¿ÂÄÙQX@?n†ﬂ–{à≠ô›æ2ùà≠ÀIµÔ‘∆‰fÇæÎ:ü5Î[Ìãú‹ﬁ≥ªÔ·_ 6Îà∆t‘Ê¯≈Àu„ 4C.ÀπB.KXàê∑˘¿[_wùi≤JÑ.f![MZÅ
∏WVtÄçèì ˜Í÷NJñÇ¯2é§&±(›épÔ°·d;Ω›’€‹ıKgtÃq.€Aã.™:µõ◊oÄ/·>ª≠ÃEÜKU‰®Øßü‡⁄≤cŸ‚y¿ô8T°ì]zsY‹ÃTwÚÕï¬õüÒõ˘”´Î˝˘€◊hÆÅÁ?%À∑ırånÊíh œ« ïPB‡¶ <A¥~cÊ~˛s´ì §z,.˝ÿØ≈©Qè¸±◊˜»üíÓGß)…V∑ˆÕ?eÚV—»W79QKÂy ¡aΩÓﬁ≈y˚πqâ˛Êµ$“”\§ß˙–º∂ùóÌˆ)‰˝Â	ÛTŒZ∫Ê≥ˆje˚‚”5ﬁÈ«bG-€™ +£GËˇÎî)‡Û;6…FlkÑç›£-FYßy5ªSπñ*ò$›’Ù®IÏ˝∫XS
á»-ù?$wIJ„ &gNÔÆdÅGå‘B0≤Tß≥ê=ÿãP;NJ¶ÆÎOX82j¡®Õ7Sä~ﬂLæ'ÜT±•Óñ¬ì;úÊÍ“ª 4∆ßs?M·+&UuQ¨B§ˆ]h]«•qœ∏Ÿ‡”Ÿ“∑;N¬	Œ(FÓx:;—5H∫.qÛ©Ü\\ OÔ|⁄‘´›∏Kû›:68◊¢bÿ*pªw◊3gFwÂﬁFË?êπwg?πwó÷U4RãÔ˚h68dÅIúÎ7Ä	ø deÒ'ßÄ°ÆìNÍ#≤<¿3b>8ÑHˇ˝ºqdÀÎ¿@z!JL1ÿà^xq¬æ?$m∞¬†L‡∫bóﬁ¯"8?A&^√=:€Íπw8%)`S+∞G-sAÜ åôÔLPY`⁄Õ‰N°ö3&âÍCBê Iß_+?Ç:ÆñJ>¥A˙Ì≠œÌ°»∫$\=ìKãFˆ
¶vØ‰Ævœü{ìP óÌ+G”»éYv/úÑ	≥4Y=]A⁄à”Ñ}À.·	£æ[®Å§ùd∫◊Ú@ò·Œ+"ædáãÃ-cÎî*4c˙<πË3 ÊïÍåÃz*Tƒ!µD‚ñ†yïO;¶cØÃÑo6QC ∑sÌπb/û¯^“ôÔŒ/Ù"
#èig°˜œ:ÛKÛ∂Ïz÷rÅ¯aä‹‹u®û¸œâë1•ºuﬂ Y5J±úzeÇ∞‹Z7.ﬁKU^l•=JàêÉóxîûZ9IÂíjóÔÕ'|»®m‡˙í'ò&4`?/AQÁå˚Q∏eóóπÆ®‘‰)èÍÃöK5Rº=˛´⁄ øæ\÷>egHÜÌ\ïı˘0£îÅÂÿ€1Óp0‚?Ï¡° °1≈0sô™LHÜR◊LRÍﬁ%R}öÆä¯’™{˘∞“∫8˘SRV©kôÌnë»(i©∂íIÁ2Lu\ã yX7É ã4ƒª†ÏÍrø<ó“9µAﬁ¬P&ªq·+YHYvNdùIö4ˆ∏çvÃNÅîã’6€h≠õ≤™:∂†^ë√òœò_›f{\Eœs››‰ †0ª•D+ÆJgfSíá0µ	q$…$ı∞O]»ÄW4JöEi©ïêÙ*'°íÇöÔ \z¿˘ .  Fmú˘~‡y£ßF’5+éz¯ÉYW=/F¥6i‡+  S<xAL¿¶oøW'´O æ8K7
'€#ÖÙpD®>‘ËÇ"0|D4£•ﬁ·´WxeŸ¸
ΩÚí&]TcåJõ—ô ì«ÿ€“Îı∞ºlÉ∂…»Aø»[3>J€‰‚–ü‚°$v*;ß∑ÄÎ›Ëg+é$ƒ¿±û†-t±∏wc¥C¿:ÿm¬§ÑŸÓ"slÑÓm≠/‹¯ß≈ŒäfñY˝≈∆;}üa‰ßÛ6nhõÃ≈ÙüCØx0â» :ßﬁh [∂Mê™õï6<”"VRL¨^˘D®8œ≤vÂßÜÁÕı7óí›˘“s] B7iàñ.ZÒ[∆ºîÈ{wCÇ“îõ◊ñ™Œz—´NÉ«ûisA«®ùsÕ⁄…z¿é1Ü<@m⁄…›?πòÑÂ)N2`Ê≥ZT§TË<≠…Éæ\S©„1Áb‚±çÔ/0Œï3ÉÒ≥¿¥^Æ’)jó÷í+}⁄âüJ‚Ü7ã¬ÕZë#Ã—B“`Ω¶Õ¸bΩ˜gj%⁄¨˜e∂`ÎLlj‰,ªß§±ë5fãÙìÒ:å’π—–‡ıÅ‚Âl∆p*a;„˘°]≈†ºÏmbA‘≠6ˆnZ∑Úhôu ◊ÛaEwˇàY©br&:åYJ⁄Us ⁄^¥÷	ÆÒØíÑXRàﬂ¶¨µQª/˙∑1x+∂EË=ñj7&U~Ãx_Dˇ∆m9ß„I»ˆ√«@e◊s-‚
ölK¶Ô·ªb„áSTÇh∂1¢ÓtH;g8\Düêà]¯E>e?SΩ…"È◊ì‘p˙H;0HıUıpêÈ¨RÜ∞;ô˙5÷—m∞»5f∏¯"r∏ŸS8πû3[†»\√@Öùô}ÀJëÒ9)ÇKp«∂eêFñàqúv£‹&Û}nôáÉÿ˜Gﬂ˙óüèCa˙`Ak$Å·ìÃgaÖc&π—¿]∆o‡◊‰≤+˙oÂ<Àﬁú≠-ÁÇÂ∂$áŒ4Ü3ãí˝	:os?Ë:gZ’tt	Ûd¢Pr‘Ê+$B6ZYW9ÂZ†îBô£“è¶ùæ“≤)cò“x¶…˙Ωñçd
á¡¢wö#
ﬂ‚w£ú∆‹u”úh‹ÊmÔ™©Å‚>Zí-€∞v)n–b#ó<né`nw≥5ÚÈ∆¬ÏQÀ\«.Y§ƒ|¶≈d·∂„†PMŒLF»∂g÷'¿¨ÃÍÉ?6Ñªrı5n.⁄ô≤W≥c”Œ†ƒöodP2ÏSçœ_Yç‹k¬l†ñÇ∏‘ª≠Ø®xºz‚gf%ïK‚$B!á’m¬öYòj±Vc¥ÙÀ≠/1ıG¬A˚eIT≥.ÔπÉ©/»∂¶•¸Ë ë"≈W…~Ã6æÒ˛+©ÑJÆêlªjÅÜhlÃYÆ„≤≈ìÉCnÒl2Ú0aÔΩP˚P}.n—Á§¨©hk%˙íG^ °cï√˜â•òO mE‹„ç∆:º˚~‰+<≥è≥Â'kh§·)§Œ‘yTßˆûÙ\OÛnÆfP8@çsù÷’NÒWàµxµÑW l‹ïM°+‰™Î;µU“ﬁ+√˝¥äOXl5):pŒJ∑®øù€Zxw*wgg©b˛lo#Sˇ¢mÙeû˛4 ¡Ó¸"…/∆CKQºñ†òV|ŒÅ¸Øàl¬Øz^0Ùß.ÍRˇÌç≥2Ã-mñM~cw&÷€{öÛÓe«ªóØùÈŒù ﬂ±ïk„ú.Ì{ç°ÛR,w`fµ+ `eÒ6Û.nôVrÈ‰W‘qkïÒJ+û÷…ÿ¬éWpŒúÖÒN·Ç?@ ⁄∆	ø^ˆ/ì&˛T…bı¸1VPH›ÊôíXå71¶yL√¿ü›}ˇÕ‘sc	´ÆS"≈z>ÚÄiâ0¡Û∂‹Ù˝"-€êe‚ôA◊Ç¶]'ë7òzºKË}FÃÎFéi∏ßúÿ≤.hœV˘ ƒ£tö| Coà…°f–©†Á¨[s≤˛⁄ŒÍb9ÿ3
•p‹>ñc∂‡}Äg1ÈCr@N?=!üíÉÆ-‡™?ÛÇKáÌxùc¨"pFá@%Ôæãºpa∆pˇ;≤[ËÔÎãÚGÚ◊p5á{qÒ‹;¡eà/AÄèïyÃíàR≥úå«Wﬁ K& > q‰Z“vI≈ê;Æ¥Ù0üY&Âá≥≈ô<‹»ı"ö∞ùÇ¯Ó/ëÁ§’àLØ∆ÍŒƒ!»EobπRåÉÆu«XÖf∂hıö'™ÁSﬂ&ü‘óNÊIŒQ«dÃE√^®$3g™©</˘¸-@Hä’8]‚ù⁄xÁZë—FúëF”⁄I∏$j°ÄÂáéÀ∂n?>˝Úã2<Ôi‘È˛x‚{Hm-åá∆¢ e-À…RßõıÇ∆pΩË•ë>¥aÚ”(Á¥”∞eıÓø≈4wO«àÕ˜œ¯≥s$ñ⁄ﬁƒﬁi∏Ìˆ+Í•ªÂˆ¶zØls3ïWQE÷r3è €‰RÚ∂ÆÅèÌûÕ@Ñå˛°≠Ô¶ö‘tóAF‹lh(´Ü39G§\Ÿ◊÷k≤ä94‡JÍäÆ„˘◊ÁX{≤Y:√lf≥Lkò5z(&Q»qXÈm9ü!¶.¨&4\ñÆÙ-2ÊChîŸpy¥>⁄jívÉg8Ã“Î±Û”.«·ÚrÎÉYÔ<Ÿ°M6C}o”¿É]%__4ô6Ô¯ˇ>uwÁxH	#Y@¶vHØeÉÀkÜ>Ù‡ Èq≥©ª{√î•∑©”˜ÓÕŒÅóh1S#«n°Ù!nÀ≠†“YSˆcjQhtyEµ*ãiôÿsƒñÂıf É…"3`•√‡té'aúÚN&f‡FõèªÎáq<ófÑp^m4ŸéJü'≈>ÂA]ØõÉı·=z† óˆöI—¸™∫«—⁄ÍhΩQêi%∏1`a¬j‰fC¬¨yÈà™%‚‡Öﬂ2ö|≥v,¬0/4|‡Ö	ÉPûW˘Ô5“ù•µ∂äœkZ®ñ¨MdíŸ0W
÷≤
°ÃJñ«UY⁄ÎÇ¿Oﬁèê5ıã&û~üxÄ3>$>7Ûaüü“¡ˇﬁˆ≈t∆ˆ-ùeèÀh¸÷âa±“!°E8rÔæz¬X=‚V<Ü˝àˇ£iƒÃìLh≥ÊHƒ+˙`ñøE˙Øn≈\ˆë ‰zØl"¿†ﬂáè∞vôHπÑõ2¬ö Œ€d‡M?•‹—S^ZpëÕ4œx¸r Qö<ÍÜ^r√^Ω≈x‘WS5}JxÀπõ˘ÁÉ„Ä9êí*ÿ∏x"Q–€Rl{üπëﬁé¶∂ÕÒøâ˜£uûÔ¯ıæv?πa›æ.g?∆´Ì2 ß˜x1™%±ò∂Ü||‰/ﬁ˛BRÊ◊/⁄Ñæf¯bônﬁ'N£TLA9÷òæ°TŒ‡qÿ	o¯ıÈT¬ﬂå¢¡1ÉﬂoTÈ±¯ÎR0∏¸†[Ë%·t;È,/∞·6>∆ﬁ°ÿ^·n2÷ôïî~m3„ŸA8GŸE*ñ∂Ï‚ô7û–o’Mè÷∑h–∫iY°@é}aRˆDGkôMO'tx˜ß@◊”=5Oüõ3OÑ9≥{ycÕ§Ükõ[ç®äzÛü8pÜ©˜~m∞È¥üÃÛ)&4Q∂º±ˆŸ⁄¶˝÷€U\»ü˛ÒR:òÃŸ7¨´∫êMÈ°Ÿä‹(_ørcX1ÊÌ2§-Ÿ	cÀ±õ˙(∑¡·ôjƒv°’y”ñÂP€É†«∑›Â•V\ÃŒîµ¯úk¯‘£÷à"ød/ˆ‚á≥^•5÷Ê≠~ÜWªsÎ8’fo]∑yÀ√–˝¢x—Vø·HC†˛Ÿ€À´M_/UejÙ.r~9ÿËUf§˛‰ÿ∫`í¸·U_Ï=›ˇíÏ4{˙î,ëÂÕæMç¢j[7∞Îã∞áãdÏπ˚Xa`QﬁõEy©yeMÆ© ∑0 6ìvÛ¬U–Ü‘˘ît§˛HWæπ@~A˙ΩıvΩ]AGC¨s!∫˝_ªaw∫Èƒ·"_Y´rO’>Æ±èÎJ±Ã¢èà&”(h§Ω‡ü<Õ»’ÓÕ’-πﬁΩπNµ+<3;ÎˆÉ·eÌŒ¡(]‘π·∏œ 9Ä£≥LÓŒ!ÂéP5iŒO-òç«	G+˙∞M
ˆ?°≥W‹eÛ^¬6G√}i†PƒèêE(Ïﬁ¨6yπŸD∏‚™ƒ÷ß≤a6*q°h±hk’‚Œúqç^∞95Z÷õ≤~•6:π[≤π¸U˚†9C‚ç¶pSTH#¢◊D¿ pºÇë ÍÿÛOÍR˙®Qûbk]ˆü9@ªÌÖo®ó§IºÎIÈ™î˜g≈2—èqÂ”J´ÖÏö<h˜ø_ ıBﬁ0ûgÜyÃ**∫ò!Lä‘Œ√è√ ‰£»¬Mäñ∏÷ó˝WüÛ"3XÍ±ﬂ<™Ωi‰Ùl[—ã˙∑5wümº±Àèπ±˜äM/Â¬pW=$‰
j#ñÓª^â˛îpMéÑ†2∑W$§‰u¸{á§Î„£Ú‘Bå4¬ì≤(+°ü0@◊RYµëøçRÏî¨à&€§˚≥@¯Æ£·muMÔ´˙l EX·F9ÔçÚLä±p˝m]À<˝¥)—æ)Ùe-5e≈∫ÌÔìûÏ˛%Ÿósì‚jfRî-äçúöÿ†¶>{°ã∂µ⁄g`≈c˝œ¨p˚¨ÙòU‹[Utó?ç´ªÀü¶ïﬁÂè\ı}Y¸oS˜]˛0Gúˆ5‡ÛO3=¬, êÀüŸó$ó?ˆN9l,ı• +è`ÜbÊÃùLd.‹›Ï´(S\49_©	ç
ä¶uΩ≥PEõúÑısÀ }Øˆ€ñ˚.~fR¸[1ˆ˚îáH‚Ã∞∏yÅui«ÓUº‘•¢D¯: ˝z!Éœ∫F∏yA™√WÓQ1º–S3›èfxπ^£yπÏôWJæÁ<öúT•G˘!K∞,€€Â›wBåçß#oàQw¢X)¡¿JâÍ«i—‰Ÿ	∂∆È[ˆÍo?Jñ-´&Kˆ∑€Öé,’ﬂ(´sg¿%wûNÜŒDˆÏ◊Ÿtê=‚Ç¥6ùà{⁄fø‰G0‰◊âºX4#C‹ŒÅ∑8˛5÷¯çGﬂŸt=ôqÈéRœWÈwqY.B«éù˝Sº¸É^S
w≥Ø≈'¬Ä’Sﬂâ7¶ŸÄ§ê˙ßqÂ.KbáÔu`U ‘bã/x∆he{‚û°5â•.Ï∆ä√Jc˙ú,;H^Üò^‘¥òé˙FπA¢˙vuwÔ=W®täGÄÎˆúF°øŒw7+¶∞Òv~•∑ﬁ¥˜Kífã˜˚ò%⁄∫òÑªÀı›µ,!´ıß¿k*¯^õ8yÕÌÀÉ∑(€ç
%¯cU∂{Â>uª•Ã•f ®(·Ωˆê%ºâ∫à∑©LÜMoﬁ‘g|“◊Ô~àöÕGºñ7∑.`¢!)!a%,„3ÍD√Àsç18Í_ˇÊO‰âÁ3ˇIˆ¬‹'Â«nÁ0jjæ&'P€ ‡¶[vIrHv±.W¬s£É:`¶M¶b´Ù)YÍzÖ,ò‚<<<˚Mçøõ4‘+î'ÇÈíÄô5Kúè&Òç*eéåø•T*"Ib∑œÈaóøû^-êN≥„úH¶rÃfÃòtéØÜ‘_hó†÷ çûM"Í∏Ò%•IJ˙5‘†.±J≥}‘f@öØú`ò˘”L ÊD±‘~©∫È„Ä»á‘z€K)êﬁ…~+R)ˆ˚!wSà≠Ö˝ÃÆ=ÊéfÈÉ#`{…9¿79º§û”zOú+o[ª2ã÷∫ºH»·≤“{\*!¸‹"hF¡qv¬6Wô"©bïFÕP&É<Xÿ/Åˆmäf¨≤s√o)Òª!ÅÏ“¶ö£*è7c|yF'è)$œd•™9äf:6>¿Êºﬂe0»ÜtÕ.Y≠}m«&”D≥ı‹æÖ-È@mÏΩÈüFªsß4Ó%v“tây‘GØ◊#zµM®w.‚Ì0Z¥	áŒ"9¯˜çÛ-g{¥ßSÌV∏Õ”!sﬂ°)A9+æ⁄°=8(/h“3ªÀVc&2·HóSXJù6Ò1/ƒ$Ín•j€jÇ¸w+≠Ívâ’ß	+aœ Zé¬·4ﬁ∆ß¿UI?“shi•/.Àuª◊˚˝2≈ÙË*VØΩv*¸©)è6'!ZS•˛ÂÕö7e3T·≥jÛ◊!…$-ân(:)'3Ù/™ïzÙTXêoúòÏ–=o†øY^;ìf¶“}ì∂j∂ı÷⁄2˝ÊZÚ+ºﬁ∆*´R/ë›+ø^jE.˚…◊®‚l%jÃºtécÀ*…èµg∂r‹åÿ†®{¬≥ûÚònêˆ<?Ø O«ã‰ÂÔâ˚äC˝tL>%nès8¬˛ä•Ÿ“äèùxÅtJeGÓ”QÇŒèº †Nùj÷√?Z€ïEKwZ†1QÑÙíåÅ
7«<é∫≠N+'+¶´ÂïL{[Î8’ÃQjÖ\˘ø)ù"Ã80f!})≤˝.2èWF;in/›÷“_.˜6ô∫ïì:ï£`⁄KT¶Tﬁ√^UW®…í≤çBÈö∆&ÀË€†¶†µ7qne◊Î¡≤µ¨7§ŸëpQ≠Y(Ö’¥ZóÀ∑F9d˛ÿÇ~ØhË7jÎ
37&‚‹&Y$®∞ú2⁄X!kÕDµ™Q•#¨+weÿËWºÜ,ã^D„–˜»ZD5©ßoÿúƒ±¬”⁄}AÔÆ–‘Â_≤§”¥q∆håá∂Nûu›Yui?πàüµ	ô’„Ê9CZµO“’À ^∑ØU/rb≠˘îÀ⁄OQ†∂*†UﬂËÙ`=»Q`–“DnÔ–(@ÚWπaµ€X“1Îz¡vÜj•EA"I%πü:ÆDÀÁ`pº@ÌÌúU¥Êg◊$AÜ ˇ®´íY^7¨ˇ¶væ
€ár¿áÈwUÏ˙,KÑŒ¢Æú…'≈¯≤…€¿$˛U÷8êTÍ˝.+‡,GpœÕ¶“ù}TbuSŒ¨a©2u•o´Ë*„°^Ü¿Ú.%ÁEΩòWñì˚9y˝%.ßcGHsÑòﬁô}eÓ0j[û°I €$"R™»yV∞4HöΩMk	4–í&∫ùz1ﬁÇ`π&‡”•eJÖçbA¿rı?ùÀjŸL£”ãôÙÙ&TöüT/⁄⁄Ç“{ãœñû ÓJ◊ÔÈ+Q48∆j?kª!ª|åÊÒë˚x†Üªrß®4·“ë3ıÀˆtCj.ñ¨Zq§zØu¿ssÂ~™ÿ◊™Û◊Ïï˘∆2\•/+Ô5j˙^Ø7ói’sí#©Œiä´zùπZ;^\_tâ˜—k+#VØ¶ÚL≈ÉªV’Ω¨SuÀs≈È†D#%ˇƒıòl1°^$Aà?;û˘∫ë˜hAe»2tÇc◊KN3ˇ7ç5öO3¬
[Ê˙Ù∫LËôËXMPÂUWEe^b\EKW˛8ÇçÕ	j≠o_CÅv¨ò2˚ñ’9/í_Nå∂YQ…Ó÷∫L8æAñ	á¶dêF9w9ÒÂJéGK{‰¯jËOΩà∞µ√<úË±⁄—Ï°R]™'„*ùüÿ‘íªäT)n—¶¥E≤´…coS⁄∑≈V±QqíØ≈·`Çﬁ•ù.,Ã{E°-’-seMSkˇ¨≈tbZ÷‹G]YYX‹˛¨d¯∞ï˝µZË‹^ÄÊì'X0hCà>\·íø:{˛•zc–ó≈®7¶–b_Ø"ÇnîVuIw¶∑p5-UlµpÕﬁ∏R´⁄tF{X,ü*é¬¨Fl:L‡.|gÇÎjÀ‰˚π§ékNd£
≤√Fπü⁄ 9ää'_ó+√∑’Ó’"åï.BAV⁄…{Iá_¬+À¿Rˆ8÷Í—úÛ»ßÜíåKñ#ﬁ·∞◊ﬂ¡N5Vqs∞’Fz#íÛrb&rÎ1Æ∞0Ìéb:®kfL$ÌyÓÇuû∞[B±T¸ΩFÛÚï}wv˙Mª«
D`ç\ÊYPäxπZ÷¬™ÿ⁄R•=ª‘âÇ˛gåLDŒC`fl^∂äÙΩQrÆ3N“3∑á]8ëPΩ’ØΩï6vg)πºeª«ÑÍßP	©S[‚‰√√ä".⁄PÃrˇ<D#ìmΩÄIR<}íÄÃKÍOà„{AWdB¥‘◊>Fa ]Ù´6?•Kf^uî≈>ıryf°∫Ù¨kÃè·LG9úﬂL.Ô3Ω8∞âÄŒ˝\∏›Í´•€œ÷,dhb:ˆòD+¨ß ^+≤QÍäe„F*±Ü‚rA"ﬂ¢›£ˇJ>íIÄ¨üﬂ-B(øh¥{ƒ
G´w±]‚Ñô≤7cõéΩÚ›Êπ)Hk«|§èE÷ËT éˇë«¨d	ö2 ñ‰:d|˜›7S/p>“Ç˜êúàÕ˘H>r3¢rÿ"∑Ö#√»ª†„èT‡=§Á”(?íÄè$`F$Ä¡aæ;CŒîDÑŒ˛"9X$áã‰4#,|§
Ô!U‡a≤…¬G≤0#≤WL}Ô*‚L0_ÍÔ<(:yπ@=	ßXƒıÓ˛|˜ˇ0M»ﬁG˘Aõ√ú=»Î∂œ“ ÇŸ⁄QéSá‰ ö&©GÍ¡É?íèÚáA∆Äç@ç Cp˜/CüÇ§À1xßZÜ˜€‰˛âs ˚…√£ëáæ…zRè1?˛Màßh~¶Òèí*dÜ„à(úˆ»≥ªÔøôzÓá∆:∞’÷%zØ)√èÉqpÜŒ -˛°√òS2¶A≥ÉËj ﬁ!ÖêH? "ÒUåÂwÜtÛ¡ëât…K˘E‰ù¯H,ﬁ9±p)¡§∂aú`.b'ò˙útòcKß Ô–¡·íã¸Å…XÆoˇ£b•KlÖîˆ#≠xó¥‚Ä©b§‰çy"Ÿ$ﬁx,’$”l:‰å=ÈN#‚¿YHÛùsÖÖ0îÿ ˜«©Ω¯p……AÁ¥.ı<ŒGäÚë¢ÿ,fNQ0ˇåÁ{ﬂﬁ}˜Üz,ñ˚õ©„3≈ÿygÏ`πú ÛŸbt∑HÌ¡bæ—;Mz@∞áÓ˛!Â^P1“9~q|≤ˇ„îy>djsÚë⁄|§6Ôñ⁄`û˘°3çyqÒ±îπË#πQëg˛¿t∞aÙ¡YfpôKT&]˘è$ÊùzÉ^M¶—EàÑ√˜∆wâº!V∫˚'ﬂc’åCÿüªÔá^à_ëb¸8U*§óÂ≠Îå?4¶‰C∂‚˛‡ÈÀºr’âr~cÑuqñ
º∆òÔ˛xC}≈®˜¨ ¯„Tü|ê§ìQ~§)«CR‘≤∆4`·iî§
¶,˘H,>bÒ|ä	?íãè‰bÜ‰Çä¶·cé|F»‡ÿç$ƒÍ‰~xq˜=¿.,Kat·ﬁ∑<ú≈˚q˙ìY”é4„œ>_€˙Ò¿Ü$C¯>u\√… tØÂ˘∏J@ª J¸KñâOègÄnö	ÈFó‘&H¢kõ|;Ë5ê/∆tßÍí]¬^ÌyÒó·o√ËÎ#Áö¸ÒèŸ≈Ò;pÇ!≈D6◊u)l"8Î¢¿¢‡ÛNÒ4Ó¢'W&]7Ø≥LgÈ™-≠–î◊∫5[?©d<bæŸ ù¥ı9·8¥∂ ìåœ['	ﬂI\∞Æ6Ã/%{∏,S¢Éπ¶¯ßU∆)˛—Êù™ÓÇ}yÛB*©Fô§¯ÛI’èßIÜ)˛Qdv*w√Q¥„π8j¯˚ì›…‰ú‚ü∆ôß¥£|ŸÎıJ#]ÃÜeüõJ´¡”ñy™¯Á!≥UÂ•õ¨d…·GùÖ™ûÊ´≤îÂO)ëın=÷ÅlÎø‰¡K¿	õ”¨ª"	\aÃó\K´ò¬∫XŸ·≥
£óU¡ëöIß£t˙ÎJk“Q
.pEWJN˜IsV≤ú_∏
ä·M⁄∞á¸Ï`O+yÕôÄ«^g¨[!CY¿´≠òZ˛XrÀö¸—ƒ¿_û‘ù≈ ¬
ºúßtv≈f8©íÑÂä›‰ºô∫éñf,e…L§ON˘MñJyΩØ)£Ê∏ã»*í"7‡BÈúæx~x|vˆúúÓøÿ?zn#=ã˘4Çb]çM€ïhuúÛò∫ﬁt\*}íAN´" ÷àÚP∞ø&Õ /¿uÔæJJπ\
Ô+æÙF…å{‚á|:I¨FıŒâuvP¿i·°4ŸÕ/Ë0q.ËV©FúÉ∑{⁄[(ˆ QòŸ®ô“Éh@k]*Ùı[äO
¶$ö8ÊWfBäÓ1îcRbä™g±¥“Ä∆T$©∫™jÖ4…ó⁄˙†ÇœMG¥&Ùßc#ÏÙX&}¯ñÆﬂt@ÛΩ„axêﬂ_h»1ñ'œ©8+1TRñ‰xSQ8†Rè9tZÔ…Z;*-ån]>'Ø?π)‹º%ø	˝◊\o”Gu}°ÚØÛ'ív$û∏%Á”¡˝;*nñÆ3|äu»˝Âw€m±á¿‚Ï¨ëá§í Ä ÀÎˆ|_≈àØá>uúãXÜ˘z/	œîÙ:»¡±b"ù˘ﬁ¸"ô_˛ç‡\ˆ‚ã_≈å£Ç;äKdxõh˘âwE›Œ≤±e˚ΩQÇt>Q—#˘±Ö€ÖÜ]˝D±Ç@P~¢¬|™ {,˛D>yY¡F
4%Eß√pø!1ø…ﬂLK°‰Wx˛°ftYMñ∑2≤¸Úß[ŒÍ⁄Ú ´•MÜ/ô+Í“ge9Ø¿∏îóz`<| ¡≥yÚ…û2Fk∆cÅåA*O±A≠DB˛ıˇ∑˚Áø%’F∞˜vËÒòËG“É”÷PzpZ”É”>ú¶sº†f≠|ÑTπ§û¥á‘ì*§û¸ ıd&êzÚCÖ‘¢c:*•2]UÜQ¥Ù?Of7á‹¸˝"¯Ê◊Üq>À◊t≠ºxc•øæ¥˙ê[ûﬁ=¿∑“‘Ü5˙A·:t¬/ò±“D”eÍDˆhrﬂîYv◊–néü˚€ŸZ⁄ﬂmä√ó∫)◊km£ìWêÈÔã ≥™’MRßmÃk
*ıKØgNp˜g>∑W¥M≠ﬁ.Ì57’,H√vÊı√`‰E„f[œ?Û‚]^‘œü∆Xı~±EC≤±f˛à∆ÙÀÓ3f)Ü©®·»Ïá~æ¶y]‰œQ
›Ë≈O âœ_∑π_C“∆µ"˝†«Qª7°˜∑éó¿l∞:ËQ8Ï∏¯ˇ`ëÃO2¥N
Ûã≠ù'“‡èì/±"ŸsÄ
}⁄£QFÜ_-m˛N„±k—>≠äöaΩ∞ÛÂX8[¨(⁄iõ©#…åe≥SûË–º∞∑∆˙ıÃkœ‰’7
√DY‡p≥Xö≥ZzSÌﬂG–ôÛÎk ¿	VrÃ™$&%Á◊ZÈÕ™&"úΩ°6qÇ›õçrπQvØ|Zı>ï
o›nŸ_á|7~˜OëÁ∆ˇŸl≥ÜEX+8Å}^‰õı77ô›∑C{√òEO“Qæ÷/∫EÉÑjG¡|5√¡»˘¡*„©≈Ÿõ¬⁄ËÃ§}ƒBOl’‚√“ï4Ìu+˜@ïjÆ•'Æ~|úÆNfùx⁄5≈î¢J`VÛ.t—\ l—ISëØEÕÑ<mÚÓ ;R€T≠˚=ƒÍ‡&ñ;Æﬁ¥©\∫ ÃBˆ˝Ü;û;V:wû≤BB¿ôŒ3ùP˙Îl:»âìp¯ı|Y -ãõú∏Ón ‰GéK‰◊+,¿Õ“/»Ø®ÉÚ€9pÇ æ¸b©Hı™/@–‡ÄÔ&!úŸ£Hgg˘œI´{o°ØX(›´î∏û¿ê«Ó6¢+2Ôìá⁄d!N•R◊  üMèS~KîÜaLQütQ’µˇD¯œ€Ó∫
o¨Iï”aıññÛ)∞0$8d£Ó*SµÑ0™‡tÀ„…&¯-àÕ$›»5ãRﬁ"ËKÌ«∫Çzº’ÃõVö√JilŸØbôﬂ¨âÑç≠Vºo•^V’˚ŒœßgêK›¯í“$˜O%K{dh >%Gﬁ›wë«Ñ”‡˛˛‹_˜4»∂¡Hv$ï≤jÎŸ¨±Ôk≈⁄ˆä	'úî}≥Êi`»1‡‚7S•qúCœâÒvñ.WòÁ¯œq6Váû´VW“Å	ÖkÍ8É`\årQ_ÄîÀHBòá:.q”Â√‘6 Ï{˛%œl3ƒ‚$òº∆Q¿¶3∫˚>ˆÜ!O|#÷zÇk›#œa{bÄ,ƒ]8ıí&	Û◊D_îﬂcÎ¬RÜ±(Ü¬Ù1ï”‡Î°‡¥åãâ_V™±g;Kìzò$ö(£Î{¶-"‡äù”ÒwGÕÚHﬁ†⁄a€+s\,‹‚⁄gE–Ä]àﬁ\Ôôb3Çé=2Gä‡'Av„±jñö£ÚH,aä…kìÔ â»IËRü#œ’ê˙™}“Í‘‘S{ WŒµØ8.Ï≠!?'ø@1õÇOÑ®ˆ†ªà<ó‡\ûË®±ùˇ\e∫Y>Ï˙%@$¸È8ÿ&O«»ëS'†~•œjØ–	¥ﬂEó`N∫U†¿I…≤ÓDÕˆ1;O6x∏˛¡·g⁄ËMﬁRhN%b]ÆV(€ÿµ!¶≤ u„‚._Äï√î6=aî≈∫∫™Äé≤Æı≥H»e‘îîH'ˆ∑!”Vç‰y» ºat
‰“ıú4≈)´#Æ“P'ô")Ü’G‚ÈDﬂL—™ÁW@ò6))ÄE‡jKÅÿ˙H:ÅEvDÜ≤ aı¢Dõ Ïå4™ÆkÿB7a⁄cvœw ∞˚b%éFO_ä[√É”˘¶cî)Vµ»ˆ<?^wñX«⁄a’ƒ!rZçQ˙–ö7é?R≈XÎtD#≤Ëëñ¸„G
§L¡3üÔ“˚äöúöÙX=a!*ç±aπKÖÍrHSïŒW„SD¿;çò.øT9L O≈Y›*j¬âTƒ8ªá–©i.é"mW4⁄ΩÅïv}ät»˛¶…”œ®ÛÜ⁄>NÚ'√âÓI9æX¨ÎJ∫o¿Ó\—…ÈsFùe˝hiÌ3a†H≠MÜƒ±t/-?cx˘âﬁ|‚¬î˜ô¸…"ó+` K	Ë…¬#ﬁ^ˆ{[õØògg ˜Ré¢îh•?Ø–Ìkı™j_úÁÚöøÖ’ºD	rÄÊﬂ
;Û…MqŒ≤Ç3NeÂÏ—ê≤9isÎ#6Qäë»Á:*¥‘ûç0ÖÂπΩ˝X„èûS¡∂ì}8Cî¨∞vÇDkˆ°+8zΩ^82F@ÊEã–êááô3 Ê-4Ùi}bî¢eçÃTJWÚ@≤nJÏ¨û∏Ïm@*°ˇÉTD@É2öE?cûåXJvÆÎuKµ±Ú¸îÅ,l
 uÜC:IvÁzW~|µàMOÁG'\å„ÊHc“lK€≈5+˙>Ùò`:≥µˆ>ùËÆ9Bn&4@~N–çãÜB@‹–Xƒ÷%uãJo˚˚“e
.a^[…’i´ZãöBeÊå–ÒzÒü†Z≥Ä¸1dÏ%2¶"·ÚcOÔÕ∂≥Ô”(9Ù¢°O+4Å∑ª!⁄Ì¶qÎ"Tg.ﬁ6L‰N√\.Œ¡pGI§ñUŸX¯87îrn/#çO±Ï2+ΩÍ:rUK$yß@ûó∂d:9 …ÒkNä∞á˘(∂u{ˇ^∑R“ú®â4Z≈∏'·MË0:∂Mävä‚XYi…‘®GÄ’.ÕÖÅXœß¡Eryã Ú Á´´90¡U2I2V7GLæ&+‹SbóôØa¶ˇΩfÆÜÍ≤ÿ„®f≈îs∆,7/Y$û{≈xz≥ﬂõK0œLﬂUKuëgì\3”Cpi∆]L0•"+}´Eu rây˘”œ6W◊˚£W‰J]8ÖgÁ*ÆvÊ»È%=,Êa·πâèC≠◊/?I›æJç´YSµñQ´¬ƒ*ﬂWn“„Ä¡É“π¥aõä„’ŒíN‰‘I
åî˝eSZûO8%øÙƒavé∞(·'wﬂP;5onµ„Ç∆Tmô–?W5$◊ñ]Z¯Ì‘>≤`tù1i#Ù7kEŒ2¶öS’ÊL)π∆49ïâK'Ä≥–0Õze2~JcÊö¿\ÎW‚hW2õB∆Û¢&ÅÁ∞[kœJ+tƒ∫!Îw˝àÇ$â>Ì÷öΩ»Ï7ÑÛΩg Ê3’ÃÉÏÅΩÚ˛°v ^ÚåÑ¢Ù∫mº;géˇ}VπÚ≠’5e+»°∆`T§ø`=’§ü^^«LÉœ∂ó ÜÚÃ°Øôj}Âﬁ™ı6
uˇº°∂_©(W÷[<ﬁfﬂ£-~/ªÃã ≈k•ûïÆnÔ7^ÃU„y¡ËaÃÄ/åuä~6[eSõ)ˇ§B=%ö+óô÷?’ÙªBÛÔ0Éò)˛S+(V8ãàKÅ«æ§‹∆ôQcnE’r”Z^⁄t†q•uöésÌiLëé}≠∞ﬂ “æM5Ü&©Mc('ıil  ^=_xá†1†FÎèÏÀ&aR™§j}ëíé	≥V_£◊/7`Ø÷◊(ˆô∆J≠b∆z˝î¿ÈO8£»TÄ¥BF–9)ú0∂V ≈âÊò€t§Ku,Áøˇ˝ﬂ˝W“ —VŸAS§—ê%`≥cÊŒ|{ñC_6VŸ™ûT¡\ü‹´Sì¡3∏äÌ%Ö}<u(æMŸ0ß¥J◊záyﬁtåÂÍ”ë–À)uÛ™áOt:Œ"∞°:|ªQDÚÈa8ÚK;v—≤!:£{Í^·l‰ÆŸtûÆ]›N @/ú∆«È≤I›rØ‰B◊/Â˚]≤¸
§bî¥Ω`∫—üà<R"Æ⁄‡†”ÛœÌ•-?ΩhÃlÆ'‡Â<Òú√§Ú=<â~©>o‡≥¥DÖ˜{[ÿ¬d6º0Ç#p0ç±dE,«≈Â™}pÜﬁ}w·q”7≥s°SøVâÓSæƒî«†{óÃœ´∫É¶X"+¢ÈÄæ%å“W±ÍS2æº≤›Ô√Û¶»÷VŒﬁ˚u!~-‡ñõ^.MïøùÑOœûgyiÌ;ü_xŸ•mÍ÷¥è9ÁU⁄ú“ñÜSG˙›˜°ÀÓ÷ ”Øƒt<P=^9◊8ô·;Elf•∫[˙≈˘ú‰1\,?µ»á+„ﬁn#˘UÙ™Âﬂv™=ÚT6i;XÌg·[:ÏP…2˚ŒS‡˝ù˘√¯∂˘¸≤˝≥/“ú¬KÕ}æƒª&ÙëŒΩgá´∞}-‘îﬂ?ˇ]ì«üÆ4l˝‘ü∆M^yû\„ƒ^–ΩQÖª«FÈ’D$r¿}ÀzB`•yå»Œı)^d˘|äøNÀN¯™Ûﬁ∆Á◊ ;K˝ÄÿT¬nÉsw0‘W»_sH04ã$P4ä~„¨s0e	>>›K`ËD$è.ı⁄†/Æˆ}¨5ö◊ ˝ÊENü}u6èªRºŒ.7ö3˘c±mö£ÜU√⁄3√@H8¥rqó∫ê"ÿñÄÁ§ﬂ€ZgxP⁄jº”Ø‹¡çQﬂIóJ‹≠·¬“Åù†ıÉSvƒÓ,˜€nŸÄÂ≈¡˝ä^UñvøiÏd”z^ §nu¯d∂¨áõ€2êi_7px±¿$;Å[b¢Å…'éè±◊¿m¿d"Ígæ°5‡…ä6@´®€6ˇø©tD‰©^ô≈∆]ö>¸K„ìhÿ≤{r‰0;2ˇhõ1?|·¯'¥{ñÌñ›£∏ÍÁÖ«M‘HK5 DnnıîCƒÿ3Skz„/´√ó˛◊Â*ˆ∑,‚Ÿòåµ',Óâ‹˛.6a}∂Úøfç•#˚<˚∂ùveh¡|nˇD`—W5GKÂy‹≥2Ösi1k“<p∞.≠^Õ;Ä˜kLÅªÓ9ÿuèI@›7=y€ÊÑ4m 8|P,œ†Mm›m≈’â¶%)‡ã˝gßÛu•F*0“„+éºbj æ'/RÌGÄ@£éÙ∑™Ì3à∞o›ƒﬁ‡˙!„¢%Ã∆§m&ƒÌ»€,ú	CZπVdÆ°kGÍ;{rgMÏIûôË’§û©¢_÷m#◊†^eU_˚´iƒãÊµÃπÏä;ó•Ì’YmrKpfh©±gÏ∞®rÖâH¥=}ﬂôƒzˇh¶Íı1∏¨`'BG£zßùözs“Éë2?&‹Z/Gq)Õ∏MVkLsÖUfhó≠TÊØŒõ|µlCSî»;º˚ª£ß_<∑)28ã!ÃÌüæxz˜_Ó˛ÛCwZI¿ßYÇ'wˇÈ‡≈”√˝˜d8»„º/ãSi˘l}nÔ¸˘˘˛3Î°Y†úEV™˙äëŸJÿé\∂JæCnû˛ B;∑}«˘<X‡>¥¯#w£µ ‡&´Pe¡⁄êéñÆ∏¬CªDgÇ/
£q âÛ&Ó≈)Z?DÆ"kΩ ºµiı›xîf¢◊ç>V!˚ïÆã$F|u~¸ÂÛyVß&ùXÒv≠ê!wR~Qch7I´ÌØég-‹æˇhπ¶n£=9
Ò¸∞0bÂ#_ò&è‹Rπnt{q|¯ÙŸ˛ë~^‚	Ì§‡æˆ›”„gœéœœ¥˜è_üÏﬂI2eÈ,V‰˘WÁ/L´qˆÙK˝b‡À˜üèY?[úãÕS÷EwŸ'´º[å®ﬁU˝â≠3AñCŸƒfÓˇ∂¥TkÃP…®I~ﬁõ“q–µ/—cü˚¯ÀP)y]
GÕ®≈¨m;m∫ïee P:◊m®Ÿ–KQp=„Î"ÙˆUäDk√"‹“î—h≥Òæˆ Kï<É≤Rñ$ﬁF@¡èøkJ†õ˜gŒ£õ>•Œ”WxFÔMù>¢Úµ7∆Ûí◊ 1R¨Íé∆Iù&J»’$!€‹^öïÏâHA#í‰ZDt©;∆»Üº„™(,Ö‘’:€Z£~{öÔé6)ò‘(h©√j®◊”¯m ÙmöYô<µ~\€ÒOQgw§©kùR∏&yT˘Xˆôb÷°	ªïbŸ≈Ê◊∆_”<˚8&ìbJ~N˛äA∂,ìÚ«f ∞ ]nY@Ω\}†ñ6,6–∫∏¿Îs:&C%Ù[á ïpy]Ä¥@ò∆∏∞mi6+Ê.Ã]B?©˙ô◊9·é¡d·…πØÒ$dŒ£(è®ó8=´Õ
4) †-¿<”O≥bUWUÎÃ˚¶d 0]d∂Ówﬂª!4äß,ınœËV\¯(£SÊΩˇ+'ﬁü&a°QƒRf•HáFëΩÿZ¨ë0ˇ'Ã‡0Ö¬m¨Õ Ì6\_]s÷+k√Z›⁄ÄÏºã—Dë.ÈQ˛©ÿÌù%Y∆ÎıÏ(…´EÛé‹˜¯»I
K,s∆{ïç_1ú,˜<0 +Ã8 RŒ6xÔ√¢&ˆ›x[∑ï◊πæ4Ω2+B ]cb„˙XWÈ*4´˝Ÿ»R˚Î™>ææúXü&˜-é¯ˇ§Ÿy&S?¶s-r‘4KNSdæKÇ∞Œ™9∑˜%.ß„,Opöƒò'îÈ>ŸbîâºX éx<∑˜UåÅî–e·5œ©…O`vö˘ƒèÈT LYMÃ˛û)ÂXm.ÜÍg|ﬂ¸Æ/ËP‚¡ô;È)çòH1≠p‰Vsº*¬Êë≥⁄Äπ«	g{Ë86a{õHâ*~Ì'–PwŸ¬¶_õqtú¶}óGzàrmªñ7ÍÕœ¢n∏w?OLÕ|˛UwVÊı[Ü£¯íbIa|¿&√7⁄ÈÄT¸ó%ÅP|™5YTè‰ÕcJìˆÛ®ã¶ö6≠Ä1u∆tÿ«)ì]±∏rüÊìÃæh°Äõ?&îbÃ
Æ Jüó˙$› °¸v·ñ¢•med““9‡°ëLñ*∆‹e¡vN®ÄÀNL«08(…≤∫å¡ï£Ù™¨ÅeÃdÉ`…FI∂èº\§¬ªlˆÅäÔmÑ‚;M‘Ø˙iF&A{3£ïºA/vdK4≥>Zı—äzf>2úJÚôØÍß≈π~ÍI©ÎçFÓ~√4ú¯<⁄óe

`PÌ{OÈz˙πûzv´ç4!®á»#3='£çÅd%.π⁄*NÛ™{±TÂBwÄ÷ÆOD&R ¥eqI√yôC±tA´é™˙â¶ö∫U]çƒö6Ù ~?¬3 mC’´JqÒ >=ÈHD˜…#¯Î§ñ∫∫Á†ﬂk_út∫˘ mgõæ…kŒØ©¢Œr§a≈pûÖCDπö°n˛R[d≥é”Iß)<]/OÍ∞€hÅÄ8≤‚Í@
é’âD˙I›¿~ëÖ0B±ó∆ﬂ“√¯3}X≠FÂ8¸¯˝Ê®¯¯}gxÒ¯]sƒzÏ~U@ieº“õáƒ!Ô ´Y>Í;ÛZZ$ûÏ¬´Vƒf!~(I⁄–ƒ˘©€—|\õê¢Ωﬁà"pı%Ù¿£næ»¯†Á4Ë∆îp¢&~Ø“¡ì<rœ∂Â’J√YºêU≥™`!ÖáÀ)ÛôVÊDî†ì„ÈÅéDf:Iô5ËÿÊ«±MåcõßI*ú9p⁄$øy§¨7≥Nw” œMì7Õ3€4Ii”<óMì$6≥Õ^”4mçëP4KTS• ÿm°Eæ§!∞¬ò¯}HKS‘˚íí¶2∞Yß£©t–*M•}ö*#Ä*Òë3§%£ :œ*≥êØE√o>)ej—<ˆE1GãÊ©⁄t+ﬁ⁄¸X}è'nñ»¶m3OÒ®≈\≈ì¶g§=6=ÜI”}¥ÙN}GøçZÕzÅìào+ Ë%fx©Äö‚q–Jıcjü°x	Üß«ﬂêŸp˝ÀÈF(ﬁÂ∑ÙØ
∏Pº…Ó®_,@gÈUÈû˛eÕÄÛ[˙W’ŒÓhfZn˝*ìn„ïÒAªÍ∂ç[î!êná‘m÷¢ÄoïSS˝GæNã1†-œ≤ìÉëã€&[Î?[$pFl¸«NˆÖ‡ÑøT~uJá7Ö∆∏nÚ7⁄·¶ÙnC‹îﬁläõ‚’V∏)Ω€7•7€‡fuï%8≥ùë7+€†nªnñwH›f‹‰<ön6C	7Mù‰∏…q≥àâõ≥BE…“ Û∑⁄°dÈ˝ÜhYzª)jJØ∑Bœ“˚Q¥Ùv4UØævMf®CWÂÈ˚hÜ∂™‘∑›}sŸœ
Ö[åßÑ uñé⁄ÍIª‹/ 8¸úÇÁ÷ø¯ùΩ‘ΩãØ7ƒÓ‚ÀMë;ªn_oà⁄≈ó€`∂r›%@l0;^´ˆF€C3¨VÏú∂Â8ùi5¨P∫Ò`J]”õåœÄ∆[≥BWn$KÃD∏Fxˆä≥&»Àõháπ“ª—Vz≥)ŒäW[!¨ÙnClïﬁlÉ™’Uñ¿ÀvF:$≠lÉ∫ÌfËYﬁ!uõ-ìi≠ê≤¡JËhË#G≈Â~ˇg‰˘îÿÿü`Ä/Ö¢DÕ µW©/&K#*Á¬Bw¸>”‚K1È¢4N˘2À{ÖøµX≠RÆÁÂ^"‚˝âEu3ˆïπÿy,∫6fé»Ã«N8§∞õ”¯ÓªÆwá$X“À!îÖ‚‘'ßË:Jû*ç]<H–C'T7µµ∆b0pizºÊ⁄8Öü/6 „‚˙Üú:»õ–òœ*^eÔqµ≠D^*ß}=·∏8¿¯©º≤¶jÕiíΩÔI¡l=üÕÆfJ ûçÛr¡ÃÓŒƒyô0WbïÓ7€≥6‘6ë3‘4)∂¶≠eRjÕT√D~‘\ªDΩì6•K≠j…Ïñ4™U"ÔsMôã6ÂId¯h’ºπ"âWmGﬂ≤IVÌ∫ØkÕ™ﬁà µCìÜ[∏üã÷sKÆºÌíWﬁ.… */≥‚≤EQë‚8ä∆€ÚX™≠Àf€c—‘)é%∑◊ñ;‹‘∑¨)Rlπ`®-[S0§ÿÉÜ,t¶p…∞’49œ z'Ã…™Ωﬂ˝=ÔgË{ˇ@Y7ØUƒóZz2Ûtö•aòÚfæy2K£≠Kà˘A'¿,Õµ&”Â;ÃlYhJIö¯
ä&î,ò∫2∞Ï_"MPbπf¯Ô“yCYMƒ9t(cŸá!cm)H2)KØ•n)oÙkzü±7åöÑo;úäÌiB~júTKÕˆ◊Ìtr˜SØ6…±:gM≠_ıı´Y>ÉπEŒuoÖ„NiX<5+_a>"bg<ÒÈ!_ÏR|[:}¨xÀÊﬁhûå)Éèﬁ=∆◊ï√ï°Û!?œ
Ky÷I>¥œ%ßf„…è⁄R{ÈPÂˆÚ·´€S^L=  ™K»Ë$S«7Mìè‰Y8d•¿^°ó
~qw¢¨vï™¶â‡çpMã6w;œrŒ¥€_Cæ%Ÿ—\Ô\^[_FZ>\∫Wå*_K•Gœ¢ÚGa)±`HÌ;jZØ+ “xÙ‰[V≠‹xr≈ùrZ∆≥ºﬂ†ìÆ\7≈MÄ¶XbÊ1 FïPB%©tx‰nÄë⁄“´IÀ/®}™sñzi”ﬁà2›˝ô%ìH3~v“/˚©æ±õ›€ür8LSÜß◊_P«W´‹ı=™OÀ£óZSX´2‘#ºK#E"m« ®¿úöÜÇ:¸__úÁßu:ê¬õˆ[8•—êü˘≈ù·…h:i'K≈€ 	cz¨m"Î¶ˇ3úu™ ç`±I¢|œ¬»√ZË∆É,áí|˘FàÅ6j)ø_πây÷ë†∫Ñw¸∫{=tÔI˚WÛí›#56æúÈ«ü≠¨Óëh˚ë÷^˜å ,”m±ª£O™©ù.™÷pácßÆ{¿uqîåseÑ2˘i,Â\ √ªÔ∞π-	ì0bkXh”Ë«ô_?◊_*£U•≥Gã6›„5bDv jı	ˆñÖÇó™«ÿÍèÜ.πP∆Rc4÷ËäÜnçñËˇ  ˇˇÏ}moIz‡_©ÂxñTV§(Jî-A“B∂lØw$[g)ûÏ∆∫…nâ=”ÏÊv7e…\	Ç‹!∏ã 9‹ó‹m&_Ç,∞nÉÇ|\˝ì˘ŸüpœSU›]˝ZU$ıbâô/›U’Uœ˚´ Ó-p—aKWπ5`Xe§…ˇ¯ºxù√L—¡™Æµ‹Ûﬂ™xsV¥4•ƒ≠–æpÿ≈ß_ΩÄ˚Ä! `ù{T6}Ó_¯îØV˛ë∞«„°$YPêXû$îC~ﬂ>H§FÂ•4›VÇ^éÂûÖdNÂ•fDœ¬=…Áèô/K˘∏dÎËR±-øèÙ>Œ ËsÓªBò⁄ß˛wVp=q≈{±CçX~HËªı ¥
7@39ˆ-~/»Ã ?‰åÉ_ê¡)ÎŸt‰ÄWçê`¡3FÓ‰>iøïñ`ê^¥Rr]Ú≠ ãÛ/a¬AÀËç~ÍXó(ºMçf°æ•ÔœBÈ˚∫îû:àÌ`‰óœ±°⁄	ásb
ôq´JıêÇ/:RSp∑@vää<eSÃÃS≤kêî’)[G÷ú_[¡˛∞‘x?,2€gW]]ßl—¢a~XbíO≠72∆gßèKÏL£"∞òAq»2ªúæ§W34´“,∂√&yµXº<%à#µ’\Æ˚⁄fYC a¿` pﬂVö¸–!O¨ÎÛã¯4{ôŸ«{#°üŸ°®ÍKWrƒØl.ÍG£ÕGÚáÂ-∑˚ˆàóO¢ô‡-˜æ√2¡ßÑ- ∞$2äàÊõH{MFYi‘BDª‚ xFøœ*«∞Bπ˝>à^¯±ï9fi=—d≈:Î©–\◊T t¶≈L∫ úòâﬂñfºèlãs·¬t‘bcD&µ¯"⁄€s+∑<&Ceø-mM=ä`∂Ë·πΩ";ÿJ—≈âÒb≥[€ÖaÕïè/Ê…∑ K¬6d~ô}+2J∂£p7rﬂΩ+Ä†äé~eE”≈e◊móú&˝7pl˙¶â~∏fœC¯gùòcüí-Ï*PRk=;M‘5[°&}´K´“è`II◊Ìxô•µ›±J8ÌSKq> è}À¯q…	Ì«ù≠.P]R∏†r∏¬ÆVv&⁄Æl"@Ø¨´7ãJ∑)Àt·ˆ∞9U÷2ºE˚Çí‡ìÙ«ïH“ﬂ^¨Kñ7cgıUÖ&‡ }‘Û˝“U[µÛy;¶ìÚ¶È›vq˝˛§≥ ØÚØŸ,]eüÑÁ◊6∫h“ŒÎEçÍÿÅÇ#ø˛W8ÛÊëD@π◊u’tBáΩ¬˛„ÇÃ6…GÀ˙›¯s'g†;∞π—• Ÿán{•”NêÍìxå®µ{˛â?H‘À"[…$Á}Áîù˚∑¬*pYÖ]Ω•ï÷YÇñna˜Ú
i|u$‡‰ÆfˇÚÊ'VDÊ58ù/ΩßÍ+TÌùâ#*Òõm⁄S|f`∫(ñ]˛&‚=J,b"3 ¢≠—á_ñâm⁄ÿvD£%ËúØhjãcc[∏Îˇp1WîÕ–C3&¸áÒv@,˜‹s`ıM#ä:X&òcäÍ2±¬~±ó8˚b∫í·8Ó⁄@∫–ò„yç"%™Ë’jµ^ıæ±˙aÎ[Î2†—‹îK*}¡ ∆â\ïjèˆniâµñ)vÎÂ_)'Œßi„,è€<È>Ëô=ã«≥–x®TŸ ©7¸°ï~FÛ£⁄¸J	¶`AMI\˛|ü≥ø®≠Ä≈—˝≈p!‹â%⁄’BÍ+u·Ω™÷œ=ß ùüÎºjOY‡2)zÈuµ€⁄S¢W›⁄~e∂ÓˆŸé’1”È]‹+∑®ôü÷®»"bdØTzKVUÿh¯Ìf‹Hê∂⁄ŒtèÂ–¥TäùWqc⁄IOZÕáI?êrWÌËaTZ+g^Í≠ªŸŸ˝*nF˜∞∏]àOmw”{ï6Ãπáî⁄!“ØIäﬂ
n`}x)Ña⁄|ê mQ7 aXŸ’OiôT∞Í≥Lú&jta;:-J(pî´<†?B@O©V(e¶å¸ß’®ï≥–Óô>|Á9˛YÁL8†ó@á¶¿
ÿ ÿ]åò' +t—B(5∆Ÿ[—–CØ.°’Ç∆°G∂’>ÜJ/πI+€Ü=+Y‡»É∏,˛åU,2è∂9jœ «7Ç‰¯ 	éOÉZπCÓ#;§ı‡·Ô∂¯Yï¿Cóå§èv)d∞ßÄæ|]Ï√◊≈„Òd(ŒÌ (.h˙ázœ˜"ëo‘ˆ"≥˝yÓÜd·T˙ˇC¶ˇ≈â[†xu
—'ÔÀÈ<á°‰¡$oˇ` ı4›Øì-íøt[∏‘Zæ·ò—≈ı4
’Øﬁk¡eÈ∫
‰àT∞e˘2Âw÷€‰´≥˙'qbQJ–n˘	§ÆO ˜kÆ«î^Ã˚ü<(¿v~Õ“’{òµ‚Á≈Ê´o~≤uëAìØË'tÙ:&4f/iÖﬁ3˚¬2t7éÄë[çz´æLÍÀÙ˙˙ó∑Ñ 7%õ$Á'ó\ıÃå•v‰πÓ©æ¡BÁT›}¿πT¨€W
S¢GP7≥Bg$<2˛À/®∏„Æ¢ºÑÊqxÈX,;! ˚F0ËyÜoí'¯ß<ÚäNîçÌ≤∞1å057b…rCåÂv«æÁÁlãæ˜Ω¯>eSˇfÑˆÈe≥gÖ,À•& u2Í¡ülNbÁ[QŒ £¡ËUa¡∞""å/b6±ÿA–Qè €ul◊Ç91±ˆC≥¢¸Ä˛çéV%öA€qÄ·hÏ ´£Âû{˝ùc√=~Aö‰±·Óıø`Æb‰™ﬂ∑›Îñ«kè!çi£WçÚzÃÍjFëÈ∆4–2ÌÒ∞∂˚∆∆(·c¥ıˇ≥¨$√ìøZoé≈4Çeÿtw‡X_Ä‰˙wnﬂ6»ı?ﬂÍ[†"lØå‰®≠ *
–VaxœC	6¨?m!&N–OÏw¯A"Òÿ1}û6Œ]Ø¶	|•ΩqzÆúÑó#§ÙÚö¬ı¿ÄêDö;xjS uèlÔê∂
{Ò‹'é›ˇvg“–ê@≠8ôñ„5∞¬c~/5~Ï60D¿äæ«ní’w4$J—Å≠Ú–W*âB	 NÌÓ¥ÉC£‡åÑ9^≥NÓéMŸN;Âë5G–û£ÉﬁÚÄ=ÿ!»HÌ‰;aéd‚ÃØôµwU†+¥Cv@Ñw˘mj§¯¸,ª§wΩFNm«Ÿ©πûk’∞éâ˜-⁄òU‡	z®k‰‹∂><ˆ.vjml;Îü¢–∂=2¬Ù Ë~ﬂÌ‘Ë÷Ño1 .Ûı◊∂vj¿jƒ‹©Æv…Í¶”|ÿ|H‡ˇYQñÇGV €+˜+ÂˆBÇƒpâV¨¿D”C˛¢Dë2¥”∑§Úäq∆E’¬EhûBBûb¨WÅB˜hXîF´4˝Ã
[t2EçQxz‰0èF€π¿ÊúÊ˘ÕG®åd±_p}
Ëüäkœ(ë¸Bπmly„êJt2ˆUzn|)ñÚ°÷≈¯C:–Ä—ú$À ê»is‰—É*HÆÜ=ìë¶FJã&hò'∑=ñKÌíVÓz¡àï∫™Ûßﬂ˛˝ﬂ·VY¨≤Vƒ´®)ç4ÄÇÆée‘Ëû3Ü£∂]@4<™7ãdb ]c94a‹0`–&‰∫rL~û^ØQayi‚“ÏyRÌMÇDI∂2—V&€ f`π2 ^Ç¥y‰_ˇ€Ö=dbÁ}î6wwHö8po∑&Ñnó.·∆d”ü,d”{ õäÿ±êM7I◊°4é‹ò`*ªNû®@´ç[¡01n¡{©q–RÒlÎ	zt–ÏvÅˆØK 4ÀÑΩïµ∂íêßb&£V££®»„÷÷A>2m©Ÿï‘Çg;Y+wÇÈ
¿…ñ:EZi<6kI’B∆Ê˘˛ˇ¸Éﬁ˙πS§Ak˘).lN–å‹¸â7ƒz6—Y%›WŒ±¶A:èQ +åŒ⁄g9µRπQ/fLŸD–éö)Ê:Ó®6ˆGPV7Úq™ ´ê:ÌDd¡ÏúNqU"Í±ç◊ƒ.Ô0Ì≠¥•zs1ﬂÑïıÃ∑MÇê†ö:g[…« ôÎ_T¬uºæGûø[æôﬁõ◊	ñÂ3ÖﬁíÙıµD¯5ª)™_Ü±2≠fë¢DÜ#©äÉnô_ñ;ˇ0ó;Ø¨n•NÄzLjVäòï¢“4Ë™ÍïÖô,√º0=ÂÖW~¨◊÷È÷4…Õƒò"=WU±Tt)M¨d^£ÿª¶
°¨FI) ≈®¶∆¯l≠$#'a∂^úk¬ë·‡˙˜ø€¶ß‡®™ò>Õ<2µ+íò@®È¯ÑDDµóVà·mä´–5+8õ(Öy£+(∫îâΩs?"!0¶‚êûb›ÂπüP4∑˙¡:ˆnÌê‚DnŸ±oËÄíôÍ„y<˜„a3kŒ„õ8úõ$∫£ï2≤∫jJl‡N[G•í∑ D°À
\Rë‡#PKlã…:I≈)•ûõ©¿¨ò©†dzzıÙ’/ú3e‡œ}>˙x}Àº+æ≠e¶ÚÚæÌ[6™ëÚ’¢àJ˛M°F“ï,DËyà–ôùè™9 5:∫‰9äŒÇI7óëúœ»,ﬁëÈ∂@¨;r3X5ª¨€ôU÷çYı˙}g’):ı¥X∫!ﬁçÊí,ÔVvÊ¶itQÂlùpp9Ãl#b˝–—Ã”nL$≈∏y˘ƒ¬«!+íRﬁºÆƒRPºZPåâ
ı´/’™≤–Ω—
(æ%·7eüØD©îY~Ó8%N9R≈L∑ÒöE?Œ±CdµT,•õììÔ@
÷¶/≥ √bÜﬂﬁ»˜ŒÒ∞©Qó◊◊“êàÁ^ˆd“–Òû„ã’∫¥-«Ljﬂí®®sOVbéhWñBÀzïØ∆û{kJ-kwál“\Œ‘∑€;0KW}Õb:¯⁄÷À…ÿ‰}éƒP +ñøL¯”ˇî‘S÷ö¥›‚!œÇKhﬁPÙ;˝P?c_¬ÃO/˙ñC;Â$>:ﬂûk8v`¯º>∏Vˆä~˛J—v ’F˝Ã[¢*9ÏUQW†y>Ô∂b@æN0ß°¨÷Œ◊0¢tYƒ<Ê„_5|ìıƒΩ˛◊kÒam∆–vÑñ#∫æ‘ú´+¶\])œ◊:K£—v°*óï¶Å
0MÎôä–◊ëud≥z∂Ï$Â ˝Ãæc˘Ä1∆ÃàA≥SŸäü‘9´0‡WY9≠DCÉ’VK∏)ú≈$≠Ê)Ô∫ûJÆ˙¸õ∫Ú©êOxÁçO∫J°ªRÖ∏	8◊2U’v#ùkÂÛÑr^Ÿ8ré"¥øp1t¸˙;ﬂæüêŒEÏ4®'ŒÉì|ã≥¢}.TÁ/Œ•È?ÃßÈoË›• ïH»]XP'°‡µàœ)Q8“h≤ V¶—®Ì>«˙D„Iv8*ç@ug{]?ˆz>≠ÈÃÀ≈”	è0∑U¸rû{π†@*ÉæXÔÏ¥%4vöù ≈Oäíz[—∫¢Ìú“¨%°T≤BåŸe[É·L¨Ω“€ˆª÷HIÖù…i[YI£∂Á$,iu˛KR◊P3ıZ… â-ËØq€óÅmöpÜÃŒ
G=ΩH»”–I0fˇ“*:!0lãºPpàW_æ'WWªÛâ#Qö{uÍπo¿†pâ‘w°W-m\;?3@JÔ_Uy≈Ö≠∂≤q‡•>|π«>ªNX¨®â’|D§l!aYë"ñ*l`û~vﬁÊI¯ä∫\‡réºÌÊí–JZU|Ÿ›4ﬂv∫îÒ1Ç£∆\^[¡√>∑‡iB‰bü!ËN[ë◊»ÄJz¸ì"9xl¯¨ªÆ	ÿΩ3^ë°·üŸ.Ç–më’ˆ2K$eo±˘{«Z•më.Uw÷ò«
l√•»Rî∞ÜéÅ›,vjkd≠FÄ“RÕrgrj8ÅuÁR}q∫z⁄=›TŒÕÑ˘˛bÔ¬Ëc~e¡¯X=<…Õ˙bs›XÎ=™Q <¶iõWÙ√◊|Sëì’¨Ê[LØä§>ˇ/Ë¸ Ü€‹ îÔL=Ç÷]ÈgUæ5ª)Z7>£J
»F;ì∆9ıK•‘ñse'æ˙I “S ?Ò<'¥G:{$¨uãÓ%]€‘ä_éëü¬¬ó@p©øSﬂ«ËYŒqƒzìÛ@»A¥Ò|¸b’ÍlÆı‡õË¨·K$¢uµ¨PˆÍ√Ω¿«„{@Zœ(}ÕsJ_ıeŒ^¶=pÆÃ}ãüGÑ∂Ÿ!_XÎ—i{¶•©ü‰Åufπ&™Ì2àtE∞†pè‘FFÎh”eÁ∑÷¶1+–L⁄{sßVƒVj	ç…ÙTç“Bøhw≠˜÷àO˜sgÚv}ô¿@I€ÔêÍ^¿Ïy÷ª∫ıfµai≠Éeí46“Úi>±@‹•ﬁ˜·m≥Ô7LXøê˜WÏax5ÖÃìF∆ê/V€ΩÕG´TgÊO]◊ÿiù
´€+∞i3a>6£¯ π17>Àçµçç”U≈≥T/%Òe5…∫@4∏U; ´ùÜˇÇÏî“ S˝ñ≈Ï†Ö÷ıÄ–∫oü€A¶ì5ﬂ÷üêä.÷πÂO-§∂!ïDu
äàDfÂ
i7%ŒŸñ2⁄D7(#&"sMXÉœ^Ï‘∫Í7\jﬁ`ªnƒú)ôQæ—häo|®TéΩFÜiDÔπg»d◊’oåI*≠„£˙àÍÉÒ¨m÷`8©˚OªõVªß£d¨ <}ÍrËß.“C∏iÊ©îÕCcMÖ<ç≈0–fC≈JêyívJõ®+H1cEdyfC}m˜ÿãSn2˜Á—qùŸ®Ò¢ÜÙwõ€#Ω,Ô±†Ω«£≈Ú∂”9*òÃ3•ôª4pµ®‘jé©≤êST†7≤ÏøÂl·ùNM^|±ÆùÛë+sû˝0
‡æ∂[Â–)*#~+ﬁì1·@äíÊ¨˜í
¸p∑I∑ÌÚYkÒ»‰Ä4ﬁæÕ+X/e¢Xòì‡B›Õ¢ÌmüóÜ:w˝TÖã†Ãû%æ“ÿ∑O-ﬂrØˇ≈‡2ClÖn˘Üi»≤êTT◊¬ÚÂ•UAX˘rU%¸Hæ£è˘ô¨-ﬂ„r‹D[b±0Pë·Ò¨!Uïô$©tﬁJÎˆÖﬂè‡Ïå‘ÁÍΩu—∑LSÔçyıñtã‰‘T˚éûˇÈ‘ıªÚ=›ÆÁÈn˝Nz^ßi}N”xú¶ˆ7MÈmö£ØIuÔß‘Ôıµ{ûg£¨„ﬂÆßÈû⁄‘Oër±>-´I.w&mÅÙ{f◊ZMWÿúÄ4™é†â'Ç3‘∆WgdÖúàÓ3äKú≥ÀH≈a§û%∏≤Bﬁ «≤∆¨0ﬁ,„WCÀxÏ[∆“tLQAH≠q?yhá“›—vD1öÇõ){E‰à:]_;Ì≤‡MN›Í⁄˘Ä9LìwàÒ’"®Á^©}\:˛£©`Í“¯‘T˛\≤a•˜î¸êÀé√,∏‘W©â2£¿oÒ˚â—Gﬂ»â—#;;;§Ó€ΩûÁ÷≥mEÀÍ¶<ä€Ÿ.95L˙Ø9ˆ)≥
;©e°Û3;Í éQÔ˚6ì8≥ZJuy‹°ôî«Ö˜
ΩüäKu“í;Ωf>N∂∏œ”ˆ†ì⁄Q˜)7ı≈JJ»öÌi4w⁄>0.-?H´ˆ†ÿo∞IzŒòEéß[6ìpDﬂs,Ùe[hÀ•ﬁ9ê(ÒÕ3ÙÛª2ËlA^mE∞™„“	ei‰ÀÙzfÁYÂ&ÍQÓr¨Nòò:1Ï—ˆK£(f}‰{}+ä*⁄k–äï\É§'}√}j⁄!Kß$π§”nU)zyÒy≈ Xv3@zM1ÙÖYUÙ=∞¬ßÈ´.ËKIµpªÙ*∏p@çz]ÂÚ„Å}*^%’voxm}CK—+ﬂµÑó4’Ó¯9ÇôÚ¯ÙÍ8‘™ÎÀx"÷ﬁxÿH(“7~§>óåX"*SUøœä¡k“Ûo®1òô}≤ƒÏ"l0BΩnöŸ≤˘åßlX‹∏πYXÍæòAn9„Ω„ÖÈKƒ“IzQdz’;!ß¯yÏPÎü^zÁHQaÓKy	xëi∆≥ﬂëHzRÿ¡sÀE‘>Ù˙ﬂÉFLTÜk:ø≈¬ÿ^Ò^Û¨$â7Ü¨§‹PÆwB˜ì∑Ï˛#¿=áœÆÈµZ-
g¯—'ù∂kÛîi WH20äÅ¬∫€gÄp‚—jEÎ“É¬˙™ùlÊ[!B	÷\]®@$˘-(±ˆΩÆ„¶:<•€GLwÆ@h*>ŒIæHj°}ZQïq®|fÄ÷	biz¶·êW∞séqπîñ˜òxD-≥˝\,GñNôR§]9!
=,ºCSõ|l6,Õ8ÛÀjF–zèp¬¶ÔçJº€C◊÷ÇUb§“§çÊŒ	·‘e4Áñ…Â‰‘≈´e[v®6¨¢ß+îiâdÍô¶8¶)åÈäb:Çòûñ∑®›uz!+¯q™›f∑Ω≤—¶∆Ac®|$VÚ&u+Ö.?ƒ	ÜÏâøbé®±L(õÑw≠ÕÓ2AËj°K<¿*Ωª)ÚË£3uBÀqå»†Ä∑vé*é¯¨ÙdvO&™b«9:4.ö¿.ÿªAÛÌf˚|.I§ºd1,ÅÉe<üÍ"Z«	fn˜Ü∏aLb;6Œ≠DRªLı¡n&Csk‘|§–F;Á⁄≠2Ç¨UPry¬Ùm∑º÷
{(1ï(ƒ@L2j7J|ﬂˇ„o˛ÛﬂCêöÉ »y§ë≤®,QÅOø˝˚ˇM®ˆÒ⁄:≥);ﬂ∑ô◊9{yπ9µ∫äºûj<≠Nu˙f~óé©!uãÇπ!uΩ™…!uì™Ÿ!uì≤È!uóí˘!áå˜≈˜hp@ˆ™tBâ$6.NNò&Kı	I…Ñ1v…+l∏'ÿQáU¿ ˚„ΩÒ®¬øBûQ«e˘Ux˛˝?˛œ
‰´nW¿S—A dhJ^*oaUOSŸ˛)é•©ÌÆ∂»ó∫jYTA=÷™Y§I‰¿¶tä«°ËC{<W,ïy"dïD∑©Ûx⁄p#⁄âÿÖø∂u°»˛ˆ
ºrz€ç√Jte$ªÔTßN¬ÃS#o3]‘^˙u|Ø^_iﬂ˙’ÿˆ-≥Ú¢|]ä—ˆöŒ∑ô.l‰ôÜ⁄L\‰#Ö˛“î◊£Î©bï^nY4B)Â\¶$˛Œ!5Z•
x≤ÆØÍpÒÓia/Ê˝ü¸≈J≈< Q‚ãÊ›ƒŸ÷◊jª¥y/|cµZ-µˆ›èÔ4khÓçT≤iS]ÃΩQ‹ΩﬁÓ‚µ©´ì`Âù¬U0ÒdÏª’ÆwéÜtâ7ÅÉTûô$Ω¿æä◊<∞œ87lΩtø„¶›ºﬁ∏≥7#jŸ)Z∂„p–¬∞-¿c˛FÌAõ´ëT]Ÿ≤ﬁ÷˜0ˇ1˛yÇˆÎÔÿC¶y™AÚL|û¡‹ûÂÊÈ÷·ıwÄLÓ=óu£Uﬁı:4˙¿‹iÈø}A¡™•úÇ#AebñÌ˘¿˙¯—™Ì≤ß‚ ç„˝AmóøôjêØ«pkmó˛£2Ä2kˇ¯9ÿ:-Úszuƒ‚≠@Éàk†ı>≥˚£“"†í“"–ó“8∂»¿ü[bDÿ–∞iÒ˚Òêáa™	è3Y∆Nhÿ¿ohxám∏â˘2á∂c¥àá©p»”Yh|Øa⁄à◊ﬂ5/hëW-îÛñè◊ˆß?vËV`ƒÌvÔ—¸?40·Ì VY KE™K…◊»"é«Ω&ı†aºÇOî¶oa'ª“ûB”0U‰©,Ó9çÂß∫ïÂÌ-µB·OíµV %)<•¨Q“"GpVDbΩ∏Z©∆"c&	g>ämΩ≤0Î"6y"†«&Kx`á’?^Õ≈z‰˘†s¶Œ´≠]“àÓŸÖÙ‹ {Ø7kªá4÷ªdh˜}#Xöv®=≤ˆ√H˛üq∏cÇ˝§È?§ÅÕ≤fÓgØN˜^ú‘v£w˙kî≥SïWƒˇó◊ˇ1ƒ4EZm…ƒÚÏçWG˘XóÃ–∑Lr<¨x’jAnéÃ¬8∑¨ÍÕx ¶Y˛NÌÈÊÆw;≤ªzÛ
±ôehMKqÑ!Ó!Õ©ﬁã ‘'5˛s*d–∫¨√?˛·æ¡.gb‡M÷À%ç=êgÓtü\á“ñGp9 ¿ÖX∑Nìkv∞·¿É	E·{l3y‡a$ qË€ÓY£>
õè_◊óÆp∞ˇ@˝	ìˆxPßn}À0_πŒÂmÉwæyb¶µ*<…ıBÙØz,Û∆q‡ •Í#+†)Å˜w4«ÄÙjÁ˚.?°5⁄©µ[´˙æ0⁄Y|	à!Ñ(LKﬁ≈(áœëºK~Æ4È=Ò‹S˚lÏÛ

ÿH…s®¬∏è˘Mı™cù	π~S∂U–!hWµb5eKPë§ ¢ÍXˇ¢oüÇ¬õy»DíTÈÈé]•÷”Rë9äÅÄpˆ¿˜ájTDëéËQíâXóíáÅÄ£th.∏<≠∑å@ƒCËíá2qk‰AöYØí;|˜pxhÖæqf)^4ﬁ`\ïü@®ªl6pdc,‡Òn‡ë±á˘m¶˜Q|í8Wÿ+í¡8a© UílåHﬁ
H
FH^ˇ]ã
k-fq^%
§˜áRR–‘L|ö’ìé± Ã[Lœ«c®ÄÃŒΩÑÃG”AfgêŸ˘BÊ4”7v06–Œ«î∂aGÙgjÈ°â”Zy ç®∏ ;$áÅ5¥≥õö/ì_Uı¶˛Òâ»AÕà[†áæÁûÂsîÿA¢[Ölí2¬,àÈÔ#a≥éçÇÈò3üÍ”pNU˝(q =î√%Á…s/ÓÙ!:íá‡T1˚ùÏS‹–Q‰÷C´7Jx ÌO0oà6e+8f#µ$—(y∏‰ª‰˘⁄¯n.œ(£Ö%s¢@lY4
%Qûä¶ûå¶ôé∆ ‰¸(Â9'ø˛5˘ëh˝W(g8ñ6jGûONçsœ_&A6Âëê˙˝yÅ"ÇÅT√HÂsoäÅµT·»~Tìdh·ãiì]'µÆ“äs√ŒÄ√åi	¨gégÑ)œnF[6iØp¨ÑÍÁ[ﬂéñ@ªŒh–
]8û`üVPi>◊˙cpvÄ«6∑»{åÿ˘ÂÉ	&ÿ¥\ÔCcÈ
>·†EKÖËÑ‚Óßµç•V0ÓÏSgôtóÆﬁ/KÁ˘&Ç-íx≈;;[Z‰◊è‚ﬂä¿B~ìÏ?|˘=í√€äœX~õó∏úŸ^>hÑSNm◊2VÎÊl§DWMAÌÖÀ7˛Ö¡êiÕyæf=jSv◊hA¢ü¶ùÜYøíyÿÁ‚âÿo”ŒƒtGa„"·#øqÙóôÊÈdÊÈîŒ”ôfûaGxòDå Ïˇa˙	:‚ù≤	
û@∆-dd/ùNåƒ-hºmµZ~ÊÀÂàˆΩìr≤\»ô4?9}èJt|áN^w|ìN^7)Úx™ﬂ%Ü¡h,01Í›ƒ<.z˜p≥∏ÊÍò}häõtˆú„ïˆ
sHä,ãu6¢“VBLE™¿ôM3E5≥ÚöZôî¯$∑bÂ’Í…O»∑ÔåÌ»ıÏÚPÓJ=¢:Â]-Hæ‰W%∞<Í}la4àÍÅyzaı«<	Ω‹81…í*’‘™™6ˆ+Î9ªFY µ‘B!ŒWåπ†cdﬁÏsæ
,W†∞Ö@¥ú>`ó1äÏâÃÆ"7WÜÀ0eW·u~UÈòd+≤ûüﬁEdH5ÎPk¥ ß)"$‚"`%ËüØé∞‘8*b<Ë Ã2 ˝LﬂÙcØ	cGùÃoXk˛√ì¨(ro‹ÃD¢°&2Wœ6S¡iƒ·Y71™œ¬uÁ∑Ë¯ò≠!¢º⁄†pïB›r%§›{ûy)ü2O<i}dG ›ñë<–<Lºã&ò âãI,¥§?TÓxµöG pe°∑ü“¿ÊØ“@À⁄ÓÏ¡Ω¥≤…lë ΩØJléo7ÛmÄjªl¬XÒ◊ô‡GÅ‚”++wó„è∞í√Ne<Ìº&	è–Lcì˘¢}Q•ˇ ˚e˘√å›ƒ÷<Û˘>*<_äÄ≠ƒﬁB’æÍxÂ;ÄÅ<≥Ÿ‘8
a√#≠ZΩ∑ª‹ÕPp}vF<J≠#åF™:F∂]·π	aægHó¢s9¶ÂáÄ
Ä◊‰Qõ™›<ÊG\ñòê:∑Hù$æyHö35†k˘L âr•\˚ÃtÀ\∫ìÇÖyÈÍfè›{Z0,¨äkØ¿ó∏á>¥º <Ï‰÷øL““@`,ì	V/µá„·3ﬂ†Öû˜Ì3;hÈ„•îı–_ùÖ+¯≈ó∫èQ|i˙≈W‹Û	û 2………ÿÏ∑∆é|3˘—Œ·“≥Ç£0yYo£âµBitcd?¡6@m7i˘ä‘¨%#ËôvK—3ıñ¢i˙-EÀ .æT˚‘Içö‚´( °õ.Œâ_=,5„ƒÍâ*R©≥#Æ5´©Ö2}µ’RQ∆eïÕ¯8rU.BKﬂÏÒ%´¨,…T,à’:íâ¬˜ı»Äï∂Å`WÀÏ•/-wóı‡µ8–w˝OƒA;qãºÒ˙◊ø##ÎÜOºÄÙç·»ãZ‹≤.}æeπ˝Î&\œ	Ï·»±hÂcdπF |èN¥åD¢…¸®î»˙?∞È%öÈXÀã∞≥Ò˙¿–{è¡µ2ìzç≠ßº˘≠¨=\Ö…¸Ñï$Å–A™“«™*≤Nô<ñI≤ƒ‹±54ä±J.ÿÖ=I„IÜ(¶˙¬¡ﬂ»›@ åÑ≠Œ/õ&ª¨∫°Ú‹3TµÎ“‡2^îá+Ô2Kµ-MSM’˘‚¡4ßiëB3ÙW©÷óÿ[©¬°§û€:y_V3¨≤Dòj)0Ú@.óU;∆Í¢ø´∏.P÷éJó	ﬂ˘]k>•úñπœÙZÇ©”Fª∫,v·}ınœò°~˜Ëª≠»c∏j˛ïÉ¸¥ÿ9#‚MS=ËìBΩ)´K/0qQöÈáQöÈÓ)&ÄR9üî$dèLMã´»ÁLå‘7~}ˆrPå’◊«í?)§Út¶Fj¡J©â‘l]`Î`Î'U,+ÖÆ3÷æ ;˚Fÿ8ÇNÄlüõQΩÀ∫ÅãØk yh#<3™ 21Ÿ£ZÕ⁄!∆»˜.Ï°a[$Á`ROrœ∂¥ú}¥Y‹ÕR◊â¨Ñò¥C√Ù>ì)´ª£y~≠Eé;6£Ø!n–x5¢÷kßºbUöΩ¨B¡/ü+‡mªnÖ{Ω0—7ﬂÅ3°ô˜2WÄ¿=ƒ0Ô ˆ8ÙÚ0ÍU6¯‹~B°<∞?µ[]øÑîÔ∞˛°ñ≥÷*Ø@È¥nª≈ ,Ó8¥\ˆAß M;®Í\ª⁄..ﬁæñtC◊ri§≤ºyß◊40Tˆç≠Ó”™
k4ı%SE‹‰π_˚Ë!å¿jçÇïxP{äºäåRòäNpJ&$Ö5ﬁ3Mﬁ∆)ÙFç˙ê=AﬂÍ:u8mó %Á!¯˙s˜”‚ËwÈ¿Å®Û.–1°ÿg™∫J*Ÿi∆RGŒ8àé∂Mèˆâ¸ÃÛi∑]…— £	§«_ÒS‹Ù&:(<∏ s#`,ÔÆQhÕFˇ´lﬂÓß‚-QX¨Ì2è;ÛõÉ|@€k‰ gùä·ßäﬁ¯í∑}*£Ø≤öû•{FSx´¢≈K#ÿ.Ÿ! ∞Ô€ßßá6–QZ¶µLËÿ4Âzj)¯Ë¨Wéü…ë±p	°Ã£Rvè?	í}¥áù§ÅyUªé‹ö*âqñ»[qÎç{⁄,]EÑçáVåF(KG´ÌF§`KE∆LM≠VY+yÒ“ÁˆP“ﬁ"˝ä⁄ô1∞TèÍ*PZü¯Ûˆì-aÏmsô‘M>j◊J^E˝gäk≈µ∏‰é9ëÜïÍ±®ä¿`¬ï&ZÈóDÛ_S@$ìæ˛ß‡Ä@ik·ÙkVÑ´0»_ 08S.Râ“w≥$yÉu)HX€√v|m`—…MçuÄ∞Ä>éûáW»Ú£ÚY∂´›NJ55C”ßN/—Xÿ¨¡¶≈§XHG
√	≤/ÑÛÖ˘æÁx~e…Ç‹ûÿ°ÛÒ `.ò™†ïÉs‚¡†ì“5†C'ÓXCÂ~ ·⁄){Éf«–xú/Å"sjbæú£†{àÂµ›C/¥œ=rdòæÁ“|˚-≈*ß¬äî¬¢ƒó»ﬁÜt∑…·ÿåscr‹Û∫≥Rd}IA9èãÏˆ#œ¶EPPnó≥AF˙ÌﬂˇE>aõÙ$4çË#Ò5ÅÁpQû:üùYﬁ¥«y©•g¯~ôúΩ0/îÈ”œBG`J#érE(N¿¸æEˇæ§˝õµFÜ’≥|Àp›tµ√◊Ù”2±ßZn¥‰∏#≥çÎÂ(∆«æ⁄çﬂM≥Á¯í'[dñ¥m£ŒL:≥®ƒU•ØWßÎ⁄TyJΩ¿í7Â_"·¥.Fò
‘çV<–ê¨f'°…‹≥ë—LUk:(3}≠d*yXÙ∞ÁXCÉ4º»— $Dg˜*à∂ïéÃ‡â˚~hôˆxòı”è∑ï1	NC”ß!‚7°¬(_™x°‘‹w%*È<’éJm?Ã(å=˝ŸtfcØ¥⁄'@†ZÖÍwª«„s ãû-©*_<ïXV€•˛heg≠øKT≠SË25{’Ù»è«˚`/|x>ºÿ?4ﬁÅqi˘A⁄É—ßÈΩÒ’/|w˜⁄wŸΩÛ‹EsØºvÈ›Z¯Ï>ªÖœ.ÛR÷Öb±ÿæªˆÿ‡¬_óº˛∫ÖøÆ‡•ËØÀ£◊¬[óºﬁ∫dåÖ∑N˝ÓŸ∏€¬WßˆZ¯Íæ∫‰µ’U^˝ô˙Í
	Ë¬S∑‘-<uwÂ©ãÃØ∑‰•KY{Ô¿G˜j˙öΩå‡∫DπüøãÓÆ7Œ¨¥èé—ßÈ°ÛË⁄˛π{Ìüc vOºs1±èÓ>˘Âƒ]ZxÂ^πÖW.ÛR÷z8SX¯‰
_ü‹˚‰
¿o·ëK^è‹¬#WRÙ»eëk·èK^\2∆¬ß~˜,úm·çS{-ºqo\ÚZx„*Ø˛LΩq‰s·ã[¯‚æ∏ªÚ≈1ìÎ-y‚˚Ó-˘·réµÚ›FU8.ô1s:ÉQïGãï∑¶≈E=Ú‹ÚGa€äkX≤ÇG—˘=◊ì êj2$˘	Qr»ñ_óóJ8ëÙ^ªÅ¬∫ï»nπ&µ∑¨U wÿ,◊Ëdf5#ÉFœÿ¿
üö†‚ªgåaø0.µJÇW–kÑû/Î#ﬂp<∞O•ùKßËª:Eó’iz™Íˆî’Ô∏ﬂqhÙ¿◊’{Ä?YC˝!ñØm3h›q@˝ò ∑ºB‡IÀËÎ=mUØã˙ôvÙ¶`◊´èèlê»âõÊmLœ“ ónº}ßåb	QVæK — ˜ç°Â∑ºÏ6Ï+⁄85ú† }[—mXî.ö›‚ñ∞Ö˚7¢è)+J¬±≈∂JaÂlÍ¿é4ñgV`îµNï31è`‹⁄˙bz«6‚;ÀÜÅDﬂ<å6J∞\≈{ñiÂ!˙πô.í63√ˆ¨—nmX øπ…|…Ö^f˝çﬁd9ÊìÅ´J)sÎd–\ØU);+Õ'±•ƒ±·ú√¡•:'m¡ø{Õ",ºRç∫⁄Ó\*úlØúJ‰Ÿ^A„òÁ∂
Ó+,•œlØÏπˆÄ˛»∑†"Vƒ0ÆÌâÁöÙå@*E=¬Ëë„‘œ\àÎÄãN‡"x©õF0ËyÜo÷B_ ,ﬂƒ`´j⁄.95L˙Ø9â!e≠∞ÅsÓæò˝h‚™ÇÒph¯óı≤¶B4ﬂÍyc¯éä‚ƒ"áV»ä˛√∆ 6¨§~—ÅÕÒÒä∆”u¯eÔˇ@Ì≈Xèà‚¢¢ë£∂[-G÷r:GˇKù9≠ÁÈ©›ø˛Æo≈;ºΩ2X”óÿ|√É·àæ›≈√7u:_º˝b’Z3ÔD27j>ä7È-HﬂæãhP7ﬂÇ«2FêTû:Â¿6M–+Èq—òæÁË5√(VQÉ–Ct√TˆÆêò7TŒ< \;ºµ±¢ªF	±ñhóOüΩxr˝WO^Ïë˝ß‰…´óoûæ>æ˛ÎWzñ	fmè7ûá;2üwd,gD«>sõC8Gf6)òÂCsç¢À„âVVû»æÈ§Q®`_¢”‰–t{·ûz‹õπâŒL5Ôun≠‹o”¥ŒaéÄŸç^‡9c‰”ﬁà-Õ±N√ÊÍJá4)#¶hzAø¿Ü>ò¿%Ó˝ÕwTë òØkhS0‚* G‘â‡¨MËâ6ŸŒFﬂbÏ± 0Ø¬âR‹GﬁˆªThá\”pöi†e_*¯W-†CA®á·∆¿‡≥Å‚ÄÕÕÀΩ"ß◊øÏ>k_`—_çç8⁄üÕqËQövjáFKvû*ˆ9[Z•Ôd{–…°>∆ñwbã6.Duπ∂{¯Ùdè>}yºw@æˇÀ‘}}Úq¯Ÿãì= ÷ù)M3Ö\™XD§”C±4‘Fx
Ë∂á'BCπŒ:√πÈlG•Å¡åªõã‘ä∑8b^E1ãÕ|ÎphCìy	∫©¨ÌNPf4∞ßVV
ç0h·“¡“ï‘öV8/‡nè®ÌÆêI£b>Pwçp–ç’®õWÊ¬3œpññ»ü@gÏÔıÃæ∞Ã∆Í“’ó’k≠6óˆW¬ç_G™W’ii∫∆áJù—ÃGÂç3Ã6⁄Ìç2Y1urªá◊ø»•^ﬂˇÂ?ê˘ Ö0<–ø-Ÿ®ÙDï:dÚ"ÂèC<†äkäFd§1ÕñÿŸ7`£•ÜŒh±1C–çoo€ølˇÂ™_˙g=£—Èvó£ˇ€≠Ó“ª	¬KH–Ñ|@À‹∆Ω1,±›y"”2≈®´/ﬂì´´jJßp∫ÓòOcêyÿûØÇ4#ﬂ:?ƒ°éÏ)£ïÈUŒ9æ„˘î‘S8Sı„…‚äƒT–õ/˛YC‘øMÙû≠l¥µqõ”	‹ U˛®»˝Œ|€$¯“ §Ál+˘∏NEm¶(Çﬁ.f-âapY0’ÙA)È9cüf2)•YxÇ–ÈòD†-Øˇ¸È…ã7ØP .
eÆî˚Zçqçdgw∑‚Ÿﬁ „ö˚√yªÇ£êfÒoL|¯dwÏ˙o˜_ÏëóOü¥Ê?∆˘ŸkÎWKW∞∆'∫'GØ_˝¸Èıø˛Î9°Ë√Ë≠⁄¨ &3¥¡˝p~Ï9|IòGô9˛òº6> )ﬁPky>∑ocV·x»Ç!UÌÑ2∫ö&£JF7J)(≥∞;„°ã¶ÊW qaÖØ∆°„yﬂí„ÅÅq\…‰•í™,çú5Î›H»Ö∂Ω)SeVÙöBC™NBô=mfø7-∂©
ÇOÅ5;cIá–H¡¸2?ÑÚ2˚5ü<èSA÷|.Ñ÷PÈJô˙‘X⁄¯ﬁÖ∑©- √áoUöÇt•x1πµ+#J	‡•Åä
˙j@|0‹¢Ô}ÔæóÊ∫ ííãÅ∞ÃõI‰˝‚7ª 	Ø—¯|˝o†-ê}õf£íG‚%%U@-¡∂‘}£}A*\[!ëÑ We∂≥Û$còØ<éîGsß P2k_)1],DÒA⁄Å√i¯•ö¬s„0-j#œƒ8Ê£ RQ∑ô$âQ≥M> ›Í·ímè$∏VUM–¿!ØàòçRøcŸÄEzπö[ÖËè∂©ö≥ù√Nz"∞xﬂ»&)mf€π§–√<Å(≈!.BQQW(2øÕŸë‰‹≤Cø>œäthz÷ì≤≠πƒHâ#Êàçù•ño—†ÙFΩU_&ıÂ∫í9·∂7Ôƒé<=;œ≠30êçoÆTj!ÑÒX÷πÏí¬+dÆ™Á™∆°§}otG!C;Ò‡óïs™Èn°ëH-ñHZà'ï∆b	r≠ê‹»xi’ÉWü“od,•ï\ˇïoQÎ'>µ¸ÎﬂπøÛ}Ú˝?˛Ì˛˚o*œTñÅ:ÉπG–,:[JöÌ ÍKÇ¡≈Ét˝Ø†5è|dh¥^∞tÀ«,b{:ΩBlS€ï)ÑwØπÃù|4·0d⁄>çŸΩ±ÕıèPtú	_4&q852∂Çëcáçz≥éƒ#e¨∆RÎGı œKs˚gôq—4ﬂv:ÙcÀÓe”áòl%±ÔO^ıP˚o.˙∂@@S∫”7áè√æ≈ÑÕ%ñÍ¯…&ì¡Ô
±"A‹woúYØNô%wßÿrõÇ?Ø<–¿ÇD=1‡?˜r©5,ìÂ⁄Kd•zn˘%[§]ù†§Xw(©9Ñ;pU"÷)Ñ3Ë',Uñ—x(˘¥î≤Õeè†^ñ°ò=cÊJ*ó.≠++fŒ'rbÈQ_⁄Â (ÂSYRy≈«UL{+˜¡$dwf'LÒT0ß†îâÁ›0Öûñ‹™∫C4∂E·¢ ÛÍT¡àj*í¨T·∑íHSaıô}.bq(UJKäæm‘vè≠!∑bR€]SêT}Û–44D∆?˙V,µ¥f…Éú—|´¸,!˜]Uò/Ü‘áÅJî/HOœAVämÜÇ>†/X˘Œ‰+€„È¬|o¿"èêC÷Pluy¡Å‰< /≠Pt&Hƒd€‹©1 mR`Ñ∞Òjs∑Ÿ√≥5ë«∞«ç?u0ë•µu*≠iÔÂ5±lI°ÿn5ñWGòI¨œ¿C_8<‚Æˇ´±mJe˚bÈ~SQ∏œF°D¬˛c√˜aIçó∏ ◊(ÜX‰-ÊôëUÚcBﬂtﬁ¡ª˚§IX˚ÅÌå⁄4û¬Ø@ƒ˙ ÃË‹$√?˛°ZÓü"ƒÉÇÇJ877A»Ï»ô4UdóégòÎˆÇ£óœıB¨Aªì∆Ÿj…Õ’#^Î¶ ﬁF∂≥TÂ¨‰Àïn{⁄z∑q≈¨«Ü}a¯‰≈ƒ§·å5r˜˘ûF•±∫““XjÂ∞¶;·¿
ü´	˙>–zÃe'<œ#„$!ubÒwÛ8∞7v06˚#à]'ñc Á∞lI±3ÈŸˆé≠3ﬂ√õ%≤(OÕá’n]—æ|‚[ÆπoÑF$Ô™‘B~m#eÌsÎ	–V√vÅQïbß\ÒÀ–‰m˛I∫≠/gÃ›Ñ’ÏÆÒäˇÃvQÉ	Ω—hÚ3±∑ò6±Eöx€Û`”á[§ã∫å\ãy[Åm∏œQB¡$¡o-î\ë\Ó‘÷»ZçPnﬂpv&4˘ıä_∂S˚‚tı¥{∫Yô™œÙ{v@üÒ+F¶Âßj…PõÎ∆ZÔë†©!Û:`€"õÀÙÀãﬂ"u‰hux<•iAßçßYÿÌnlﬁ‘4ó¯˜ï∞0'Åxæç*&‚p¸]ºî’voÛ—™ﬁR∆Æ¿ÖUm”_[L„8Ò<'¥GÑ@r2H˝î[h\X&. ã—'}ØX˜ö˚î4p™„‘P>®-)›Ÿ√æ={Cm`tÓü∂F∆%2äü∂| MsÏ±} ?˝©ÃvΩ∏Î-®˘ÏâyM:⁄OLx Ê¨mÖﬁÅá9æ«!∑4Í£∞˘¯5ˆ	ZÌ·x¯Ã7®xΩoüŸ!lœ*ÍÊT≤yœvÔù  T™IEkWY ñ.©„*Í ãPÑÁÎÎáÿp>'‘A”∑˝æc’»ﬂ@YÚXhó±@û	K>adKu~GZbqÑ}¬ùZZ@ÂÚiOQ	Ñ[ƒ?t#+®ëS€q ’¨”ux’HœèYZM{ et*ñ—ë-„t}Ì¥kÕ∫éáÒR(¬ïO⁄›¥⁄ΩÒ”;ì∑ÎÀ˛V—~w•øîL “9Ê√C(0|x¿x≠òf-≥@.§Ü¯≠≤3YªI<D0Û∑»¬K»ﬂèø‹P®Ìïßï	.\æ“•›ó`†ìà……î>WËÅd¶6ìÂ˜°?ê&	^ˇﬁ3Ωõ∂•I´[Ñä4¢•¬v…·ˇÒÎ	–ˇåÁe≤∞¨€ÒÂÒÿºˇ«Ê≈Ò. +ûk©Óæ°-äoHBÈÊ)IoÔ˘ñ! –o[≠ê?@!ãw™y <{ÔØ§T:ﬁ6≠”@Å"bÙï·?G˙ä¡[h`C≤˜´T◊»≈ÍN≠]#óÏüã˚ˇ®u§ÿ∆2ïƒ;=}uß÷˝≤FÎV“±ÅhÇƒ‹9›`ﬂΩb¡“;ìv´£Xt:=¯¶⁄Ëjlb%Ω+
éÖÕæ-m%´´–‡B–∞˚ﬂ>‰gìYäDów‡ÿ}´±ZÏ˚¶dD&5Ó≈îãÏ¸Át˛ÿ]x>ÀïzB¢ºçgã§”••eRèiI˝ù dà≠’"´¥&H(¢LÉ‚Íóq∆æ”¯"∆π•å!«ÜÌïòÄT[+¥ÉπÕNƒ7ii8ÚÅiBçØŒñ@ÍèácãﬁUıv˚úòËxﬂá’¯hhE±óÏ±=0+ ±yÁ¬Eçë’µ»æÙë ≈Ò’ }YÿUìe§†hÃüè~ñT;g∏öÁfä
R>≈¥Y⁄.eﬁy‚?´ÅàYy0∫Í2gÂQ±õ∞˚?ÑpsÃx‘Ôv‡>6˘èÃﬁ∞»¥lêü“‚ØHG≠/@ﬁˆ!\Œ^µ$èõJœx˙0)ÃÃ[∆†…iÿô…ŒÑ›Í*k(≥~}óÆp0˘’{`€îÄ“"Ãu%√ëÙj”a€I¿ƒëÖJFó√y HÚ!©§*öI0¸‘
Å]hõGTıºoBƒ˙9Ó”3!GéáïX≠\4Pq˚ñv‹@¿Fúÿ¿0:`ﬂF¨™‹ñË5¶>v ZZ€§ûªâ¯ d∂;fÏ$ø&øÄﬂÈ2A*]9¡oN ©Åá˜—NK†Â]·>€˝Ï‚86`8@rò„Wtà‰ô.‚ >ù8ÄËda üY gâw¿ó¡8u÷ÕﬂM‹¸›ƒ∑/∫¸ÁËÁü¡≠œ¨9.ïÕu‹?¢?˚ñBJñJ∆ ÌR„´˚ˆ¨6[ ANÂ3ú•èz¶Uû„øV=kŒkQ™•YÀoª 1Î]îhŸÛÌ°hd1æÃXtr∂;]lÅävD”ìq◊2ª XWQ2®éÇÄ9·˛@Ù2Seí\È)¶,vÅÇ a4LÚñì’xÜHD9U]6»€ˆ;u_ÌøŸ´¥&¬f:èQ,åÄÖíbßïïTπ±,ŒÌIáˇkµRM©ô‘÷y‘OßØ«Ö_≥Ç<6í9˘Ô∞«Rê&x-¸+âÿô_ÈÓü~˚õˇV$˛nïdÂ–WiÇ.]í√≤H™‰ÛúúiV˘ø˛Ó?ˇ˝7T◊\Yä—e2R'	ÎØÊ˚ﬂ¸_\K|NHÃ4[&í3±aì÷¢¥ö+ñ‘Byb,∆66JÒAÚQ?Å‡ù˘äÊJRõ⁄2A◊Ro…G*ÏÖvë8¡ï⁄îNòµèRµ€∏yúﬁ˜NÒjp‚S—∆ä˜	Ë¬À{|Ùº!Ë*}ÛéKﬁ°r{ER(—3Ü{˝ùc÷ù«Œt˜⁄_¶ÎÇQ¬HzQnüæ˘√≈n"ÎÁhæã3,sY˚ë˝´Å∏t7ˆªßvœ"1”È¸¥BêÀ™√”V∆T∞]ÏX Úçi›àâN#o∞bîTVÒS¥òîT§í´‚j$ùí%¯ úíÓZmÚ¸¯≤Q≤&kr3ì»&Ô≈>Æ—#
ßXãÿœ*yqpaÖ,5Z%6*Íæô‘óÜ¥Q:≥~ı^ˆ|rÜux˝à‡ÆHŸñäŸéœ=Ú≈‹ÛÉèóyß'Ÿ–Ár”VÅRÒ2h ï∂ßÅ1nÓi)zÛQs8‹ó√4N‡ô¬Òp4D€˝¿è{æÁwsà]J9ÖbnD·n|GÇËOâÛ]{-2Åb´¸s—Pp{˛äåÛ ?S“Ò˛¡ﬂ_}˘˛j6˜ƒ	£ù”2:S¶ò˘V?ºõ≥!∂¨=Í«°Båsﬁ…ñrW!¡ä™ﬁÕ^û…/c.î/’Ä*µ–Ì˚˘D1ïìGL”OÓ—∫¬ÙÿTáÿ5T1˚∆˙√ıGZ≥´≈I}Úñ$Aì™aAô;0'›x]#ª€ÅÁ™‘6‚Ul,=Ñvá«/Xπ!≠h©•uç“E–eéÚeéR€ùﬁÎ«/¶,qƒ¥Ÿ«ˆp˚K‡D¡€˙PÚ,æ<â¸c∏≥ã∞mM|˝PvΩ59ﬁ•Ö„«oãØ-$Q òP‘¡∏ÄÚlÁ«ö¨¸ŸWG/»-f@®–Rdµ’kä”-©[OÕ«ÿ\S,Ödø¸åS'àd<»Ç∏KÙÌΩiõg!‚©6j(3Ä‘v”€S^1ª|¶aE®›Â^Úû;ge‰&nÙX‹–µÑëñ@iŸ◊Éı<	©Ëëk™Y∞ÇÿDƒ´ãï;µeqÌˇ  ˇˇÏΩ€rG∂ ˙ÓØH≥›pöAbä&•†H ÊﬁîƒMRΩ{Ü°hQE¢l ÖÆx1ÛÁ˝Ñwƒâ˝‡ó31?0˙ì˘Ç˘ÑYkefU^´
$%K∂6deÂ=◊˝Ç*o«Tz´éôÃ"7R\ *B5o—Â$ Çm7†ÀÔ9˚ÔrgÅ—øG˙=Ró(∫«5J£0øE¯Ωﬁ%¢90
Ì|ÓÈ8˙˛óæG|⁄ ºú#ßgõ˙0ÍÑ°˙G«∏fΩ}zˆÅﬂoûqÛÙÂπ«’+‰∂VNÜW§á…v{¶6ˇ≈o†˚◊˜∏Éû,Œ3¸h8jˇ"Ó∆"N±nÇ•à±˙≥_)°pûvÈ„\%‘ÁÁsoÏ’∫«›…ÖÊöU@Ωõs‹Fiˆ	\ö˚£-rê‹ÖôjFƒx˛p◊∆9v—ø◊5BQü∆∞iaY⁄ıŸÒlªœŒzMè£Ï˝œ·$·^S˚Üv¥`º2◊bﬁÀøÚ‘2Ó†ıüËm÷º;ÔqëÂîç‹:u §œÓkfø∆°X1d˝˚ÎJÄ†f„tåhˇÔì¯
Vé<ÇË”5ù>5/8˛ÂC\≠}ß«”EZ^˝#î_ì^˛E‹'æ4bßË0X `& –i∑ó6ÍòÊAfnkô‚¬Ë"òÙÌ3Ç#.∆â‚˜ÓVzBOä8ã§àïWΩ÷}h˚ÁäÉ·3Ïs]ô⁄Ê|JÊD3ﬂˇ'ß≠…Bnó(4⁄∆q‡æ5ÔÑE~g‘oóíÌd∫hGhå˙˛?\î›éÑN»iûÁÿ˙7	’m∂ò{Öâ¸∞◊îD«E¯âí¡A¬L’IˇÈO¨˜√x¨Ê∫ıeù(œV«Ù*7≠Ë√∞Ì¡ÿ∆—â6BüÏX≈7p1óóîJ¨Ø)FX`$S~UÊ´‘4ëq`q}°¸Üw8lW-∂∏Î“fÜêNØ™˚V‚ÖÓm ùÛ˜j N” ÎuJp€øÈˆ'q™&Ö X”{.¶ÓÃ4e∂NuXû
øj∑¥yÚ—<Sbñô'oÒ·{VEK"˙Ç¢„º÷qæ„Âœ™ø_7â®ùgG1Dz∆ììUÕMW™N˙ZM‡zët'Ÿ&bQr˚ …w[î©âHg<g	œoÕWv≠åûû&xí‰Ê¢–ñWÚµq'-3r6IFÂ&≤KrIFSπ´ı)˛©ÍŒÁ4¥ùù™Ø¸8üN“°ã)†>∆Y>È≈„˚dz˘˜Slúb⁄”Í\q?8íW1´kﬁeæÜ«?´rØ“Œ÷ä√¸d‹Í©¸R5lºæKRjêq÷ÿA#÷Á¯góÃYo˘‡{≥çæWåΩá„Ó=hÃèzØõ.,¡æDì	8ÃÁf›Ω‚Ò¸G°ñöﬁ“>\≈áËwktÇÜÚóº˛èb⁄OœKM'‹^§x≠	¬Ãv≠c4ùêÃ–cê/N6ﬂ/3LbneÛã6f»”Í›¯à˜≠1Ç¶ÂC£L	xÅçÎ#åÇ»—@UÚØœLÚ˛zQzp‘8’ÿ]'∏lx¢˚˜æ‡ÆL!ëÚŒ¿¶àπh√-Kƒ6®}ÊÂf™|•‚·h‚CıÚ√aCı5Á…Mï56’ã¬Ì;gHÉ€ÛrÉh#V÷@ïmªEvTc¿∏9"fQ/à¿≠s"M˜Ë[E8û0Ë|œÒ)ã˙pLÔ=å≥∑u:©®QÈeÆúLAk÷-⁄≈\Yk;È)bgÄ%qU∂k¸ÇúßL—QÂØU≈!rKòü†ƒ  ~y3¬ã ≠N¢ZÈ/0ÓyyØGØ˛Ã=EÉ˚≤&˝o1Êf[á{DÌ>ºÈÂ˜ñé¢0aDî‰#å∏öı˛ÕÒú"ıõqå>2òJõß…{åV3∂ˇ˜÷Éõ:N˙"O¿√€“¨Ï‹J^ôapÙ¿&ì?>∏A“Ga4h
÷˝XÕ•xí´èäõ†©w wﬁˇÁ˚ˇâÚhﬁ«çùv¯¯äá∆€ü'°fÍ¢m|¥xÀƒó\“Ø±Ùzza^g›k¬]N§¨«~NzÀ=+˘0DÍ	@˚m«Í>cÀÎ¿Ï.ØNçﬁ–"ó	ˇKp»´hÿõXø–D∞hàQ∞(}2OıíÅÖ:ÇL≈∂ èá˜op9G_B"Ò¿œedèöÖFd«∞:2^s´H ≈ º<çæ'  ó¨™µR›Û—|∞¢√¶ı`ëôÉòÿ(∏πD° ÕGChéù64„mßF¥0d≤H^¬õFâèÍOûk8‰ED/PCŸP§πˇ !·èá›˛$å≤¶Ï`^¯ääpi•M~·Ë	^N´Õ è…	Ü&xCY‚,|ôhË√pg¢Ò:<ˇÃ∆©ÒOŒØ’Ÿüz1¨ÊkÜ∏zú´3ä˙°ı<Lë›	EÕ8ƒÒ¬_î®˝’¡7≥V2:Ã°`çp!NÜNßVΩZ?<ã'–7Äñı‡•=∫G˝S/mQ©ÏSˇÃ≤?Ü\îÎíxÌñﬁö˜G◊-wx»Õt–t¡œE]‚˜◊˘~»mmàC6Ütì€ãmπJç,îŒùõ
¶;_fŒ±s¶X5ô®Ûzù=á]«∆M]4û¿ZØ‘ÒÍu˜¸≠ö *Y}Y…OwÒO≈±*As≈ù3<Ts”∞J%®ÃùÚ†Ñ’”¨?iÛ©)ˆÍŒ$©PÕ?¬pU
øz©I¥—∂)õíp¢Õm∏œ LÚM9á§∆r[•‘†Vƒfe·b´/‘XeÁAü·xàÄVïÒ3hp€îP¥eË˙6âÚ™ãﬂ˙.yÜ =q gUçüÍÅ¡j«zÁÚ‹.Ä]@¨˙\¨9Äè~{
@iÁyÆ¢{ü≠en
!Å¿∑ˆ—¬¬Â¸Ú√è)V("*;ÑZgÈˆT~?PyçT›s£Ê•z8D*HL'˘∏¨`Ö‘Tb?G…Ó¢>` ß˜˚I kTú$ [{TnKØµèDÈù&O™àA^ÉäµNk˘å-X©äo™+˜Îù≥Ààª¯ºåªi •J∑Zú¬3ˆÆ˘UUSéÃø´◊(âæáâ¯HáŒ@á(|›™Åõ)·‘º≈˛m~º;43Öò&˝~F.nı@rÕPÛñê—±¬
’a∆á'√⁄ÒÓgºêÇ´è‘¨Ö§îº,ﬁ}eñNÉ °˛ˆä¢CÆÌÅ≤ªa5nú—dÒæ6F^<≠7∆öPÔÆˇF0\≈®wYıK)é˚x‡Fã®PC’ßÃE—q=SŒb^Z:C ⁄∆o7‡·
áK~-D!rÂ˛˜c˜ë)hNï|øîD§ø÷.&"¬™‘= »•ÅüÉÍ´¢∑j≥1µ®;3UØ5R;sÔc∆T±˛·Q>SÖ,&ã#ÿt∑E≤’ÀÁ´V‚°≠@Œéàœ∫Kª√^z¶Pœ¥™ÍÁ´{*‹Í≠6j´n~ë›Á™÷˛◊◊Ã˚èÄà¶•ÏøSÎ17ü{Å>‚ÓWzû~vö;øQΩÍuâq;*9ªÇ.–ÃŒÂNﬁà^m˙˛ßã∏õ»TŒ2^‰bRÀ]¿äòY¯rY|Ÿ!(øéë÷]4[ﬁd«(NÿŒÒ fÄDä∫:Q8'É+ÜAôÃ‡Aq‘p⁄¶U/`˜_†˘bÚrQ≥‘uE_Tû{qÙòÕÎÓUdè‰~£Â&Y™Ó—å«y®ﬂ Ò≥∂¨^©/Å@yºo‘Óœï’4cŒá<5âjê>ãöÀn”Ä™∂ı∏Óò¿ôﬁ€LŸ:aÛÕn*b√œí—Vã_‰ú=ªÚqÂÏœ¨AÏ¯k4ﬁñ!ä>˙˚©´ﬂ/⁄Ôﬂ€(£lﬁ"ø?Úæá ö›I£@–Jh4:Fèj=74’»®Û\(¡ä…–Ωà≤ﬂéææ∏Ps1_¨ÆGk≤ÄdÅ€wùÚAiÅÔaäÉ´Ã˛Eîˇ4 xóHX]`¨&V>“ F“)ÀF≤µ§´˘æ<éT9NÏl≤Ω(Î"öMUP≤_FtM8√X;'kßâsül¥HN cäIbœbA¬˙…íB˝åâi^…î9Pÿø^.ùŒË“»Û;¶¸¸0•ñùﬁëõ~~ÍÕìäO"ãØò˙4´õ⁄ù;Uß˛Í≥zÈ◊˘õ◊ËÄ¡^`Êuﬁt§ÀÜKJ˙åôbÀkáú≤‹QDÌ(Ën =Tﬁ±ÊWwÉáºõ'mA£ºw·brˆÓ+]Ã}=ûübˇ–ÌÙ7Ñ?‹5ﬁñµXj®˛´°Å4rCëSKzC[i•Ù©†4V⁄•îFyöùG"2*µ˝ÿRÜk<–^T≥n‹q„Ù<◊lOñáQﬂJ5ì?9ôúc2^ˇ*ËR¸≥¨a)#∂˛"ûıÉ·nç1ù:)EÚÊ∑ÔÚØfùdx\E≤3†N-≥ﬂ‡“AÛΩ‘~Î€hàˆŒNHæ#À‘…⁄oæ!≤€”‹æ≤€aó5Âº¬MD≤∞F@aa’Rxå†–•ÉÎ ££Ã^“mÜ¯ˇ9¿å|q\ŒÁ=ã“K∏Ü„t‹≤!À†Ï∏€Éß©€•·'‹¥T¿5˚Ra¡XÊ)Ï& wrÉﬂƒë@Cé~åé°¨|%√„ëq.õJ†dÉ™n0|Ùµ øÊ/Îïµ{è»√}¯«)‹kÿ4«ŸÁÅ|(Yﬂ©®uè„üı¢húmÁ·◊dS'TÓæÙLΩØ]/˚ÆÑˆ6/™˘˛'¥/˝…∞€sl !ñüt{Q8ÈG˜ÿé_hí∆,<ô∫6JSsŸ·¶ùz?C’ÁUÒô/ß’à+í?y´ùÆı €G#ïó—p«nÿ¸2÷úÙá¶©Y·∆π•Ã≥”ª‡ö-/]ÀsÀpÏ2ºB|IÕ¨!;	ú¢Hπ⁄ÒâY…\¥|«‹=–-¨?≥OΩc>å=ÚiØ9ª®ÿ<áhô¬‚!úÜ≈6˚X˛πÖ8U‡|KîMfG¡9 ¨	úå«µ∏º‘aã¥ø¥ü7T0/vÿı‚⁄zq§Gæ˘Ç«S®€È(ŸóSƒê≈É•ÜëeI
<ƒpqúå¸bÅ™å»f :ˇö}√Ìb 2ƒœ È_&a–ß*H@çv¬éqÊæ"≈≈0¢H⁄˜Æ:]qÅÆH“Ã‹⁄ß6-a+ﬁdQz‘üd2Ú∆‘∫r“ì∑T≤ã)a§)Ú íˆÒ2ÂÍ‘G›Ë3	ÁËÁ49⁄{—¸,∂˘ª˘"ÓGß–Q…n*	◊K7T‰Lá’¬‡3YÙ?Ö›§G®éL“€œÊﬁcK≈d´Óg’v*‹OlG1⁄ÿ9¨ÿocKÂlÂñ˘éÓaêûOd?mF°êú|{*ÒÍ¯Ï.∫©Ñ I˝õ}£ÿÆ≈¢¥%˙^ÑmBÀã˜ˇL„‡”›Ù\bõ€ÛùkÃŒTπ·Uó˚4ç‚°ÿoLP0ÆOj€ŒEøπ›~3é†Ò~	]§¡*€Ô}‰Ω)yﬂNêºˇœ‰ŸÈÉLä√>C¸¸ò;]ÉºÆ≈,Ì≈ÔIÅc∫Êﬁﬁë/ò|˘ñ˚u¯éAXb•ö∆õ$RH£ãÌª\y]LI)µÂãyÒbö$c∑ÿn‰b2[öÚUë‡)líŸ¶Àb}Ä≠Õ‘87
_JÍ“,ÓP"˚÷‡_†ò8byó;mmá°œk¥=lˆ†„•ß^±È´Ì∂KeËLëéDé§(qåÈ;¿'ﬂ„ŸF%i»ô∂3πâ˚q†.Q^‚ÿÛ4é.∫-[sh"p…L#˚Kp‰ÉB‘∞G4Ä≠„Dnù"Ã®94hwéƒ{t€•"]ûîóùuZki4xÀÚË˘Ω8£aÀ-EsªÜYôo"a∂Íåâ˘ûêïœ~ß“-Øö?,°˘˛ı‚ráıO¥±Ω‘—e—ïæ7⁄’2÷+otÊ§e[ø:]*ìèVπWoÈ.<î¨ùñããIË±∂É•f[KΩNIw.{∞vnñ/B·áÁËÛ¨›Í¿°õ{˙mîä<¿KÏdıÆ‚Ã;|ˇ3»c	F))˚9‘<en]Œ„∆’%KTE‘8»öí∫cÒﬂ&P}ßﬂO∫'Qó2ëÜtl’˚Y—ÇEïº\ff≈Ë¢Ê–VŒ‹àÚ)	årZ…H\≠Íp¯È_ o≤Ó~=´Ædô[ép‡ŸÅ•8=s¸˛ßQ˛ó |`∂8^fSÈù#œéãÓïq6O˙…∏â%x6ôzòÉ≈ﬂ‚ÇA	Ö2Éﬂ∞.óºÛZÚ∏X¥-Ñµ–±:®gc≥Ûxòµv:±YµÕTëÔqy6ë«[ÙhQ7ëçÛŒ≥|y·¶óX\a7}ãv\g*“^ZÛœu„2,eË¢1Y÷®µ¯iôöx~b∫ô≈r€C¨Ã$£,LÚOŒ$d8h‹ô§„f3X`ÁÜâ"ﬁ4%Q›fg˘yrF˚$’Y|∆Aô%ù∞À£ñ[1ú∂õ◊Õ cVDÛl—(?ÁÂÓ÷¶Û<Z˜†*wÓ/%=Å§Á4“eµMVﬂÅÂ°¢0U°Î∂SYöj»*∑ﬁR˚IkiÄspé<ÌMçòçHl¨‘»KU/°H6∆/∞ö∏=S†:VjÙÔÀõn∏˝ÁdHUﬂ<Œc	ô!;Æ·-)òœ:PŒaqﬁ%ˇä3/æµ≤…977k∂V–âˇé~7@[O™VbÁY≈<Ø}\®°e$(O5e·<™(œóxã‘∫ûqπí6œr/Âq·0Ÿ-ˇY/
ù7”º≈U…®Té|•£	∏fñåÇn<æÖã\ÈœÎ'¥KIky∫y˛ÑÄıÛs»∫BÒ•Á˝¡¯∞&3zˆáŒj'\Èæ˝4ô—≥?,Gù'+Áﬁ$£ü9'˙"Ë*⁄⁄OÑ%ü§M≤Åö #¯ ^‘≠W≈åBmôºÙf>géó 'ôØsyo≤å}¸ô«ôY«í√[óÉ)Á_>,ãb0!<uŸÀÑú5ˆb ‰ºå$œ´d\¸:ÍÉNÕ‘∑ÈçYo’¸-:ù≠RŸE˝ºU$‡êù7dûñ [ÖÚ∂&´Ö≠juBóz¯a…oóf¿hlNúî.ØkÀ‡üüÍ∫*f§k¶ïAEtäˇÓùÄ≤ù⁄¶≠e†ÄÈu|9πFÀÃ≥W±5(Ù{€®3˛¨D˙òu˙&œ6`iùç——9∫6@Ë§Vj∆ûtMµöDcôd”—œ»u:Í>◊<´ˆÈXëßV´ö”>3‚aœÃvv™UWUïpNw-£h`YÄoŸhÕ$˘+∑"¯πÃ/ÎÂ≤æW…U¬˝z“æß*zZÊƒa˝¿RÚS3¶-g›¯≠¸#xÌó|“ﬂ¬íéö∆r,–ÙWjé°fˇ>^∫f33rÈaÆ⁄Î´‚µ˚3W
’Ù¯ÏïJí˝2⁄æ¬p—äŸyûKQa{ñ1Áºéì1 ∞›Óı'…{G›Zªåbæ‘ı®…~¡È,ìL¸JxÆb}g∫~g∫JôÆr‡®√uÂå÷√x´"–çü«2¿˙UÂlWïú‘T∆HyCóÂ°Tπ˙¬ÓœPA:âÂ~¬zP¢•Ebb˘ÒAÌ_o¨¨µ/Ç⁄ÖU”¡Ï≤Ìµ_
±Á9©Ó)>-Læ‹´ñ#rÀ§ÏìB‰î1|ÆC|ı0õe=jZıÙ¢å—àÛbv{Ìﬂ'ÂGÓüÆ5n÷Ôv<øm;:ö›#≈ÑG¡Ù˜cÎçù. ZΩçıÎÚÊ◊` #EpÎ~ÒSeïíF…WÑ|q+…3%cmÍ¨vËyâıÎ…∞Î	ƒÔˇölO;∂d+†Òπ¥›ˆ-%¬n?>·∑BßC˘Æc‹R/Ÿ}%óüÇ¥Ú#¿∑˚ã-&◊£*Nª œ°ã€˚8ÄulÃî.jò¿¯lÕj≤Ä˙ÁW£®ºjè•Ë|ö±Í2,∞ŒÁ¢†«øS %-}¬Ä‡Å'úpI¨éBÏ&¿!vc’O·◊DêKhMõÇ|%~Gıø£˙˚_©ﬂ(ÆW◊·3Bˆ3Ñ ˚`4¿¿ˇèÉ˚?ﬁtú/§›ÂøÚ§›D}í â÷„óÁÛÔßΩ£«UÅÍ†ı«a‰≥`¨˛Q1˙É±˘Ápm~I<˛∏ÿ?•∏ªòy=Ã]£ﬂ2å=;:Æõ	¿*2É˛ãoe¡ˇ£´†?ë·¸çSΩµ_<Ñ¥æ—Øç‚^øÑ◊€æ”Î´—U‚Ãf€w⁄OΩ&éFû`É|˚ŒU™øgtﬂ˘™ÁÅ˛ˆ(M	ŒÚ4D)Y€eVèGé◊ú≈∆y$VY´X„£Ω0◊íßz;q∂õFhx˘z$B∏[E÷òÏó\•˙{√ËöJ˜ÛL€wvô’◊+«kŒbwo√`Ló∂—.Ûˆ¶æÊ,v˜v2“Ò ã¢≥º»€óÚí´Tœ–ø^†~iÛ-”~Z£€—+õ%z˝äú3&Ë&√ã8î$¿Î_UGoÛÙxÁ‡’¡´oˇˆÚıﬁõ√˝ìÌ;≥D≠ØÁCÒÇΩAÄ‹0v#ÏΩ,‚xß√¬|¸ÇãS÷O./£˝r∑ÔäÔSwbÅ∫C»ÉIÙ‡ €#; üÌIxkB2ëO|èRáÈøıuM’Tb€w⁄OΩÊeÙ°˝3˝X ªÕÄ2H˘wWù√‰2ëu;˚«?RLÄı∞b'rÿëÎﬁlÙíAdæí˜ÚNBLkdô]ÏÑ!v+/NQb÷Â¿®Æx£2[E7åÇ·Ì+¿›àñX˝mˆèWö?R/9/qèUØ≠ñï‹@Òck	Ø\nÄàôè·çﬁˇ}bw”˜ˇ„qí±àPÆH4∫˘üQ∆0∏Aú)˘∑.í˘’˚=∏Yº^¸˙¶œ7ã¡dú†ø%2^¶x˛öMß#¡Ö%˚p∆JƒåÎ@ócÉzàÄA∏Iﬂ”‰∫\í¡≠ou74˛Û&´vΩ◊ÿ#sÃ‘
¶5»ÌI:å/Lˇ»øwn˙fNW˛«<îõxc`Y™W‘NıX€çöGÜX§Y+ÈY?
BÏ”ç‹D°≈"ûƒÿ{¿bÅ(ÑÕ“ 1—˘<]£"∏d<'ÉÁéå§Oœ`X∫,Ω"Æ áp6Œ†÷˝O˝8£V—˜±ÀCä<îp-£a^q-±çaÙÅÌJÜp∫”¢q# K®recëC:˙˚$Ak—ÄE‹]gÒ˛Á·$hÑˇ®ÑÏ˜ú…gá"=Ó^Y®®»c7<∏&{ÓçóbÏ¨%¡⁄É•^%˝´VœbƒÕÊû é#∂û™læqPv¬ 0áv?)[L˜º6åy≠‰IIìa2˜Ù˝ìu⁄ùuˆøˇ˚∞øD)Öô+‚ïoóˆskâÉ7PµA—Õ·Hˆ{eXU‚x≤ÊQ2öå$‰ƒ®îÛ
ƒ∂ _å˚9ÛN°T·èê<–©ç™-gÀùˆ€j£gåQjD_dÁ∞caöåp_Sîmîe1Zi{í¡s ”¡î‹+£Kn‹.BÛr 	#Rå€eû£ÒìLye‡˝√◊$#8£‡í^≤∑:Fú˛ëDd4á ¯±%"∑9üX›a˛æéÊÔEBúô-ﬂı˜h¨¯6¡∫O`‚6à-;&÷Á3[ó¬8≈d’ñº9áˇ◊¬Pﬂ=t∑PÃ-Ïq(:∫µæœDﬂóíäCyL«È
lCÉ÷–¢π©f≥ÈÃ∆C≤≈Ÿs¿-l['¯[@íáÕ.æÍÖ5#P8<u[qH\ReÌydj˜îFó1F/¬MÊ˝h%û’:Æà’ÛœZ|1ÄÇÅ+Á
'ÇÕâ53≥◊…èïË[‘Ja∏*ºï∫˜kNù™Á÷å`V·.ØÎ∏4v∞∆„œe= ûXÙõ]ˇüˇ˜ˇ˘ˇüu‡ëz∫ÛèÒÃwCË›ë$ræÈàKlÎ¿∏[£¨ï´˛uI 7‰ñy7k”1†!z◊S.o∑µé[^
˜÷Áv·≥á
˜iåÏnÏº¶CuO~37´–«ÃπO®Ç(Ní/[ª›_û≥ﬁ–˝l∫◊¶˘„Ù’6„ˇt◊ÒÂ˚üÄØ˙ºüw)Ö~iÜ≈t9&Œ†s´üj“J¥ÑFpıTtlRÇÌ¿(˛ó˝∫4«ŒºvF	¿´Z %s◊4jÕ8I‚Ä˘èëh∑åDRvÄ–≥ÜÔ:Ç˚a<Æ»òÁ£û§P•”~Bÿª¨ó\ì7.Â˜ûïjœ¿—¬#¢6i‚˚0A'⁄∞∆!∆—∏ %€Âål–=ÿ/Ôû¢:•<ß'ÙÅ¶JHÎB∂U˝»◊¬AŸd¸íÒÓsWœﬁhF%Ú˛0qCº~Ù3≈qªª∏`q Kx®‰}·ﬁ£$e2à€»ÈQq‰‹”„ËBÊ	ÿdw<VÌ^pãÏÉ°Õp‡¥:Jy{«{ãg0(±u6Ó"\©√Ñôåm˚îµù¸¡÷qîçÄÒÇ´π√ ˚¶&7Ómœ¡vˇqéı"\kÒÀI≈]/èï<¶Ù6€é·¡UºŸû[√~∫∑€s+¯∫NèÅÈôd€w_∑ß,ÅÎô¿0¶lÑ(’›^ˆ· ÆÒÙ9ˇA®éÊ†Ç®ø-Ï8v·l'8´·!{É„πñÕüö[`qxÉÃf†"ÿ≤µ®#['x4e∞Û–ﬂÓÎ√◊«'gP¬˛»¯±oxÃ<∂ñ`â<ãwuqi≥”$Èè„„"∫1™õWõ Moi8º¯ﬂi´öØhòÕ´˘yØ«Í÷atâÇYÄj„∏Ùw˙ÒÂ5 ≠s$8@ }å Ïf‘_À”ÎÌd0‰àÁæ‰”K˛£±µ‰8y~∂rô”´÷Ö(cÕwØ∑ﬂ@nãî|ÒXÜ¢]’sUUÜL÷ÅçSC£ÒJÜ√-’P·Qßn÷∆	Ö´àúá·OâÙ«<á.ÆUÂ	ÂD‰r9Y‰ÕV»Iz]#Áûæ†˚¬vÑ¶≈ÖÄÎu['—MZ2.>œ´«“‹h,£U¿B%éÅ≠.>∞ÎÀÂTﬁB™™OïÔuruø¥„êU†®®•Íßg]é¥
£'˝∑÷Ê£™Ud∂
®pª¿äé∂®Ç˙ÀlA1í1
≠È5/|ıyC˚√PmW¸t¥öW4Kä∫u-†Ö=£™U§ú±™äÌÄr‹v–‹∑¸Å¸V<„F‚±ÚC{˚X≠§ˇ÷Íd(qÁ\6*&˘µ<0ﬁ‹KÆá„xGpÁ≈çÔ˚{ZŸ˝[@cﬁvÏ
FKÚ¯öXÂ∆{«I?2ﬂ— å˙'(*2_–ç7é¢tg¿7Û5«Â<¬Ã˚I>9¡y‘~ı8§Lìå∏—èUd÷>πv N rì0áWFπvéáª‹nãN≤¸1U†Í¡†8Êv ¯Ñ–U˝≠›‹Ë`8öåè1Ö¢˙KY∑
˚DkjıgQ´ü\∆CµûQ†µwhV∂Àú-üLŒy§ò;G°Øá‚%wππ¶ïìc%DıßŸ .‚›É‹iŸVQ‚hQ´n™;ø‚°igkPÀÌÂv+µ⁄h–SjÖﬁ ÷Ø°ü¨l†róL˚©÷41Ñkî©RÒKkÈı	µ˙ƒº¢QA>Ÿe˙
Q%Óﬂ Ñâ£aW,ìÎâJú¶1Ã=}3Üáåß.bû\vÍ≠ [Y Ö•[y˚“Æ’AÂîÇô„x¡ tî!ƒx{Ÿ¯vDí±>pn©u±±ó:4A7ë!ãÂ:C¨Œ∂Y‘Tç1eLî=kùµï<MÒkb˘º!…â†¢ Â€h–À0AÌ14±*Ø÷JñBÌ ò«ö—ïGD<No=Çcﬁ-≤≠–Ãøúº~’?ã†)1âgp≤I}0ûy«#v‚l±ÒVN7Ã„ÓH|ñô›MÁ≠WAL7ëojG+rV´hîó˘ú`Q+ﬁ‘©´yõ™rV˚∆‘œ“»éçFÏç≠.£ÚAË∆±Û¬§_)rU„ÚÑ®`‹õw¨’jEÖ#MÄxÔ«ààÃ^$22I’¬ø"˜—t~æj≠rcO°Td∆√˚èãÖKå±÷∏Ú≥B-gäóπ+V¥õÁO$∆[=RK\ï<#ËG¿Ú68…W¿ÚÑ,ª…Äeìnîe…ó«xÄ?∆›¿Ö45¡ç—¯~ö&,H–∆€Œ5Hˇ>âØ»†Ôúzn9ª–J¶N(ÖˇÏdòiõæ¢í|{:v≤ç∆€s≠ÔaAÊ4©ä∞AR†ıaÄπÈ9C\`Öˇu·€vF≤πz¿”ö“.‰ÄÊmˆe∆»√¢©˘Ì7v5ÀjˆL˚â õÏe0ÓµR@ò…†â…ÃNxj≥ïıyëË¨ŸY`OÊÌÊ#jrõ…€álÑ»A∏…∫ìs]2°ÑÑ√∏>àVêc§ﬁN^ãÁı≠ÆÉxL–,È6C¸ˇ|Å,˙ÊıÏ≥Æ·`¥A*_ÒB–öô'0Cï.hæ#áΩ>Â·‚¶ppÄÓ&°‹ÏØÓ®üYLŸ0»•¬ˆùqF®
JÑç&Yèï3≠¶EÚµ'?D√Ïdå”““\““dM4÷·é|â.∫ÉøÒÍ®≠AKE≥-Xb˘B<ÅaaÌ‘∞öq∑ä74 Ò∞XƒM{â‹„:OB<PÔÏe¶-I&™˝1	eMq.¶≠w ª@´Neﬁ,πÛv¡£ã†U≥±å‚•,ÜãÍn¡asA∞A4Ó%pËGØONé=ÇBŸ&‹ï∆.ó'/û°◊ÄóÇ—®/⁄_B¿”`SW∏6õú:‚$P|qàâf≤¿◊~Å/‡‘6†öŒ∑ÛÃÅ∏ò«@2∆4=¬Cyà%
i±®IJãNMGˆ)2 n)à◊;õC ]˚ ≥p\âÕ9Ëö“{U˚,æ´}'FÔéûΩdAˇ*HE'âﬁ«DsØª	ÄØ	õ®NÒ”ÄCkŒÅG∏•eõhÜïWƒÿûeﬁ;á'.ﬁN∏ôw ﬂ\'†Ç^0e1ó!pπÜä¶U;f]À™‹™–H‰©Ÿm(Ë”≤Á∞–ËùœCö8çJ¯X>›¢xjaaÑ}¥Ê	\ÄêLQ2ã≠±°5á2√‰Z0O.,˜ç„ÿËƒ’DèRÚXŸ ÀàÙ¯∏P ·2Ç∑a_T@Sˇ6¡˘Y«√ﬂ-ÃHÿ%¿[Ä\ÏÔìà¡*≤Ë›Eû£ñ’I)l&˘ú È∆‰Í!Á0Dl'AØNÑ¶£ÿ2.ÒÔcsC£46|¡¿^„ -˜O?:ﬂøˇ	?ìÜë0√ U4*∆—2öu˘ù„Y`ê∂ áüâ¿<ÎMrÌ%}–Òﬂ óúTk{ˆo∫}ë„œ⁄>‘êºƒ*F[Ø≥Ω(Î«óäy˚´∑4Æ…◊ z¬Œb>§”O££2⁄L;´Z5Õç∞+xv∆ƒj8ùAî^BøhFÊ€πá¨Væ8µOOÂ†¸Äó~rI¿Â^≈CÖ´,#Ãè∫ò∑â#º-ÙÃ‹4ú;ü∏Ò@Æ⁄+⁄˝Pœ#Dl¸%∏¨ÌÁßzS¸ã"‡⁄≠Ó8ﬂî_®9´)‹}¬8ıÉ€WbÍ£h Q;$lu6ÊÿO}ÎLn …\X&®7f}Ä±ß zQ°cÑß.Ä≈Y;6]Ø\ƒqÌ`nw‰‘dŸ[/*∫Å™Æ»Û‡ Ûµ7Ö5Z·C ¿”◊xÑC…-V S∏i∞ë≤ÎoJ—Z‹ƒ∫bBO∑Y{ﬁ=©ÈÔHTƒ‰!èB√ÅÚﬂ°Ë2gïµ%Y(ã>(X∂B5Á}∆kºE6P¶ŸÕﬁπpH∫7µwÎÃYáG´VVgAû)S˙S9z}/,–ÍøYª*’Æ‹.çök›–ÌçJà∫»XÎä£]@f"0Qﬁ]6≠É"ù'Ü¢¡kΩXBÆLπ?ík&Æ.z‡'»û®Øﬂ3˛ûyÆºıÃ%≥œÿ¥Ï‘àÌxù+ÑÂI”u,º◊AΩ.∂◊d|m.WyVÚçyAÊìTJÙªä·’”Ã`›¶,NΩqãg»ª9x ¬t@µK“Ì	‹∂HZüd÷‰ˇ‹íYR‹ó‹rﬂtj2ì·≈
:2„Tî÷„?ÍãKÃS£úkÂπÇ’k∆Á˙≈2l"5≥xjî^•™:^n]£∑Ìp7Åjº“^ú°.6
Më©f´∆+ª:D†ìE§Õ=LÇ0
üO‚~xJ∂9-±ÏÊ]¨|°¶®`j§y‡(%NŒ∑“Ë"ç≤ﬁŒhÑNÛËEi§Ú£?ÍÊM¥0ëB–Í~}-÷5?1[ﬂ≈®]º5Ø©ZÏø®f≠¸™èÅ2)ï+QéÈñåà‰=°ZÖ÷ãV˝|$˘kÂ0/ØÊñˆÂè”®õ§!<ãèyAôô§ú6a&á÷πVåêt˚bN[«){w{&Î’8ç¨•„Ë«ÄdBµ„˚ÄE‚T≤|’w„4äáB•˚4Ü("Q–3£aæŒj`9#ºRUª¬ \Q¯zä´©‹cæm¢–õöß‘<7⁄{Æ„c∂[nb√¥}Á£C®≥Òf]^k&â~∏m[.ñ_˚˚^ ñ §’Ö)p@ﬂ7¢í¥ï‚ıÚjUÙFΩKË[nL]˙6‹¨RΩÁÆ7¨mó6ÃÑ1≤¬¶ôˇVÎ°~¸êÄ^Ò] ‡∫.Ç¬Óò€íâ€§ïÍéÇTÄWö  4ÿ3qÈÈNﬁ€tS»åNXÿ•=mµD5h≥6b´HùG|ª‡»∞Wæ	Æî|Ê¿ºÇIÃÛ˝mﬂ˝›» 8ùÈlUUªûáÁ°ái&$SF<—Â ZÏÑaN»µÅúz]mF\ãò≈_@œ.Ø9Ö@˜“àÏq{0ì≥ óœ¿d]cK Ë3F0´˘9^É’´ñÙr[>¯2ÂÃå¢YﬂÚ~ ÒlÕÖ´)≈Â€E«÷'Ω5îSUb‹wC!Ùc)O%…Æ‚ ’WaJ÷BGhèX≠˘’ùË]Dì`ã,/í∆ÛÔ‹í``ÂBh#≠°ìÍ≠ñ]‰l3SõU®˜÷π’.9Ç÷∂KL‡TÕ[¸ûóå74F¡Ç¡¢⁄OãÉ•8zkœ5Sú|[M®,é|[/X¿ª:≤c›»ô…v†o‹G≥cUì[˚*ËÌ 5™øéí+áç¨‹8vÕÜ0 –∆ª	W_’œÖ¢‘Vªi:kdjùí®	Z¥Ñ∫HÏAh¨"c5qYô%’√Ÿ}0Z5N+¡j.ºV@WIsÕq>øy¨¬å„äÂJ‹È≈u3`ªYÒù„Öq
•Ñû√.·ªΩ L≤˚bªŸÒùçÒ<õˇ`¨wOº7õQZÖ±ôœI
Wœ9†èW¢¢»T(+ÑπÔ<Bï˝øÓæ98f	â√q«a_—ëÍ; Já•— ›âﬁˇƒ;ÒV3UVO†-"ç∫T¶—¥Ìé`À:¥ŒË≈QÀD%∂ÏS¯«Qt0[º˜@ßò‘˝~JÄ~j ¸î !¸Ä»	ÅhZ
∫s/¢ns(îø†Òê»b‰\g3¯±A~º[oÇú¬≠Éª6+ñ_no„ë,Ÿ˘Y°ç∑“„°
˙P+&¿’~˚i5 \•B˛˛0Jî)”¨,hµ«°”ﬁ˛…·¡∑;«P
Œ”A“d ÿ*∏ö”$√˜?_E}8ƒ&= ∫/¿®IÛ8›3ìI~Íõµ·ß“¥ç*’3o√O•5ˇ¸WµœÃpUª55A´˙éì∏£+úq∏h89È_¿"sß€Ö¡?œrˇ Ô—/πEbÒ ®n2w\øORõ{”∏R‘ÀËkÔ·KJ¯˛eÎﬂ£Ëá˛m·Py2 læı…≈yuQ©Z*nU∑ƒ*uS°p´^«ì•L>S( \1/≠ç·#yﬁ≤≥ç—Ëë3J∆Sb£lDˆ{‹äÚå4™<œ)ö1x„Jª≠áa€≤Z’n@±pŒﬁÕƒ).7∑4À·
¢â∆rø£S°ÍÍ1∑Õíøz}⁄Re,&J˜˝E<1Lı^ÃÿQ»°ØfxqÓô›vÆ≥&√nÊ!√(À+%ò$]åÆ -eã√dÈë-µ Ù[;<ûÂQäY)∫Z∑;Õ≈ãªXÁÌTö[<Y[nÄQä/7Ãb\±€wwL!€dÌv≥…÷‡Ã˛hß›zbáÄÒ7µ7óÈÕ‚≈e˚µË&;zÎhΩ≠ŸÔ©QéıÖ•L;yN xWijÖ>¶±Àî»`ÕÃ(¨_©ˆû
Sâv…SöyHR#ÌªƒÑèzÏŸ™(úZ—6√D:œı‚2ÎÂIe¸€9∞Lo`OëŸìÈ˘Lf
È)#ØÀ¢0ãÆ ﬂœ1≤aëå@ù•à›z˝v#GÃªZ£˚∂ú«'w•mù9…Û√aÁ+Íè@Á“∫‹ZÛD≤7C.SJ
f˙	ªÜÌâ¥ÌUm´∆tÇ*Ïié“Ë
‡øR(@–	Èã ¥ÒÂ#u'zZq≈«]s∆«u¥ÍYΩø	î}±%}Yb}A◊Kb˚ª¢Œ ÃQ<-Ü?≠cl ≤Õ·“ë√∑±VD‡&sg9∂Å«*¿éU+Òx‚ª
^¯éµöfe√ŒÉíG’ÙEƒÙ•≥ı¶É™N…\gKym‚÷‰ˆuÔ^›Ñ∫È≈<ŒjÅ(z<áCà¥8…·Ççµ‡Ç
e@a|7ôà„ÎØP≤∂∑nqù±∫åÿ«∂(Äπ~<åÇ‘Û∫∞U≈â÷upÀ÷R±Í~m-y(4=s¿ñêˇÌ¡⁄%ó£”Uü∂x©bª»√±ÈïåXl òµ,8ëëÚÙöâ5œf¨¥Y‰PüÛ¡_bFõå‘£L√pô≥Ä2WË∞b∑óƒ]è}ËH‰8ı≠T˛‹X${B2[Í¨sÊPÑ<ÙôµÁcìÆ)	Qüµ2`ãä⁄JáƒÀñ#8Ñøƒ—ı}∫ëA˙…9€÷«íL∆£…∏Ÿ¿gf\ ·´ïˆ·•7«á≠.&eé^üc W¯›ƒwåWÑq; ≈õ‚k¸p·áFªyÚxóÈÄ'¶K †Uµd i9Y∏0F"TôÌAaD.À´™S∂%ÓGP√_¬˙˝ÜCz´õÙÂÙM´V!ßÆo÷dD˝@óYû’d§|oO∆I˜Ä)›∏Û4‚pÔ‡P˚ˆ[<Vﬂ®0–˝íu2åƒ+‹¢dëQ+©øfó(©Q’∑Ô‘_öÌ=œπ^§_ßQÌCm·‘¸ÎÂq9ïı˜
ÓÅfp√£aûs‰¨Åy2≤Eƒâ@’ià«íÀ¡)å¸"¶)Öı∑ èQÂÌÚ1êVPˇm+Fk`ÖöF◊ÛVöÈR°Ye6«ëœ≠ì≈Ã'ÍßãöHV,(¬åR9âîä(/îHHj˜‡£ß⁄≠N©≈ëÑ≈Ç∏íFaÇIMéµé—‘œ6÷Æz¶$Ãîà‰ŸÅÀ•"(ß˚éG“,‰qæcÅÚ8)⁄±“[ï ôãRIòµ¥Ê áÂŒ>‚Œ?rûÁû1âì’∞n'yœ€∑oN„8Ís≈ÒÊâ}_&òà5kòÀX÷É˚™S/˚W¿y›D)ˆrï)ifŸ·˚üˇ>Aª‚Ê. 1JR¸"Û˜Ç*4ÇΩ8…‹∂p∫òHÀ≥µ<bØd…^¯üOb>GÃ"î§ßØÆwùŒ›˘d|ÇÉY≠ÃŒùg|¯â‚y~ÖZèA?¬¥—0Mô7:¡`_1ï¿ Dä∑«:kœÉ4≈5}Ö+éÏÏuƒŒN„QÄÛOåætﬁ¬∑√¯&ô«cxπ”úrõ˚îùD]Är<#ˆ"¸Øˇˇ±Œ„_ÅLvû~ÏÉ˝É˝Wxé„cÕΩ\:≈í” él/¡˜ƒ:ÚS$Px/>÷©›øâœ#F÷#ÍÈ%˘˘ê÷i¿¡œ$éblzyŒÌ˝3zQn»’ëO pÙ¥;Ÿ—´oM™Ëêo”˜?]ƒ›ÑÌ¿	éF4™≈í#Jl™	∫ÚÑ!fr¨BP©H/]≥ OÍ∫ì4K“E°—°[ó∏S≤¿sœÉ¯àsäÜÓHtÁåJ∂V G7fñèŒ¥SòÚBﬂÆJ¨ø) \Û|® œ2(ﬂ{µek•ãÕ≥¬‹G¸<˚ÚŒí¶Ë%ìá±¨¶öÑÚ”ÌÂD⁄-È“jÂ‚&ÚOàﬂ ^-b.±5g.1ﬂX«ìzÿÅT˙∏”-…59âÇX›s∏¿6ƒàïÛÅàtˆˆJï≠XAŸfÉM˙û&◊πJ0≈¯ß¯§îﬁ‰⁄a5M+¸n≠U&kÌxíµ∫Gõ+%˘FóºI)ähùä£Íí5ìàä™…Â•[§ÎEcª•ÇZÇ˚ºS
Ÿ_RA»âr_J˘©ıÄ&ä“Ìπ£(¸ã∞9jCÃ∆…ïV´≈ö—Õ&ã /‡cÕ8º,∞ã ˇ^?rrgæºG GRÅQ∆-G}'â¨Ïhb°7–Ã3P‡(?ˆÖÃ9:ﬂ¶¿∆Q†•ãO0›¬XOöÍÇ{Q÷y” Kì…Öˆ‹ ·"ÈN≤M¥cƒ|Ô≈°|n/u⁄¢XU…ö>%ÅÎçS·'?•ßÃ‹"?Ñëü2ú¶m¶ô·Ãÿ Üè (>Æ[∆-K:e◊ä+”ä™dGˇ≤ûU˝|w‡Ó∞ë∏SÂoïÌ~™u±J›™C~J÷◊ç&ãœ¨«¢Æ^U±∞pù‡›†i–-*¸’€XôŒ^åÉßS÷—@HEXÂ

:ÏñΩv_ó" ±∞‹& 
Ö"›
ûè:kAÒ§5õŸd∞¿Œ˛∂¿¬∑¸ˆLÏœ,lqR@$∫\`Ì˘©Ä‹@™)‰¶/„!‹ì¨˘êé∆	0∂ÿ¡º#ﬁ∑∂HK∏J˘ã èäë“Hïç«-E8Õ ˝võ9hx%ˆÍÒ˘«ª$Â7ºÙVd≤Õ{0Ó¸eáˇ Õ ¬Õ‚gáı/ïü+÷IB
¥ÒÂŸ5)mƒæn∏÷<»L¯&Ú(ÜoVÅŒyëA†tk4Ñ¬9]j»ÖA´MX‰Ç]…û)`o≈BÏï`ƒ	oMBZÉøÉsLÍÿ=_\©Ï’≥ÅG§˚u©H7_ﬂ:Pƒ;kó©XAËy–…Ï¸É2ä›~”,¨Õú(NÙ\Ü)[“2<C¶ç¥ßí∂ÁÎ/g9hô•íá˚D2M‹Œ∫ÛÜw)eÙ"∞úIøè|(\˘rfåÓh¬!“EPÓË˜[rëV⁄•ˆA6¥äÈDÒä†¬·îôZ÷Y∑ k\≥]˚T›Ω„«j√8Up?j¿i7Dπ≥_π§\üŸ∞p—≈À èÂP¯Ÿ<cX‘$EÓÆHâﬂpölÛ^ΩHë∞Ï!∑\÷Ó
¥NOã”˘ ó€íÎ3}ÁMhnÓöEO’ßÓïµ= √irõCb∏≠A<ú¢@jñkÅ Q’e	ºÏµ.\7Õ?ÁûŒ¡ SÚûôŒyt›Œå—¿ìÙ@Ú:èı{ÌTtz:wÔ∆F=õJ⁄ï‹RÚQŒÅøÁq
–ÑáBìèõç≈∆Î∞ú°KÎ˜I<l6ñı±§Ó	©Y—g=SCïU z)}y J}∫•GmCÔ_fqaX|ì8¥\<iX¿Ø≠k¯LòF‡ f@jwŸœC°VU∞¶Ü÷ß‚"Y¢Üäù∆ﬁΩäÜ=t¸ÊÃ/ãÜ]ÚÎy	õ˚ <ŒΩ´jpƒI4»\dÖX›…a¬ÔN¬ƒ£vVÆ>Qê´$ÚTÌÜ˘ûÍÊ0®@≤≠˚ã”ë+¢*ƒóôS-W|Íq⁄L
∂?Ç‹l¶˜ºÔÃO]Ï˘¨V Ó#$›e„˛ÌiC âZã±ﬂB˚˝∂	}á¿I·FìÕ˙∂0pÔq;=˛´D„≤+Ü…ß*Æª˙∏Ä 	“Àò¨≥‡‰rg7íÛÚØ»6o2†‹Ñ=?≥i)5∂µ}FYøE±^È"Ã]ã&∑€s+leé¡Ò«]¥W#»©®∂=˜áãÂãµã'U ÚØ;7qF˚W`$Ê˙¡y‘ü+y≤¨úo`¡müÏ€ñú àﬁdÀÀÙã9"}
ò∫°@wˆ¯_©«ºá’Ø◊÷÷üÃÿ√d√Ê°ÖG’¸xo∑¯˜ ‹û£-ôc	fÀÛdÿ≤,—r˚¸…∆Ú—1Èó«ŸiíÙ«ÒHéé1mìTBEb]¡wöØ&ÉÛ(ÂèÂWÙp]¬±d1†îSRØu„¥ã˘≤Ø” !€âcb◊ƒ }ÑHŸû‚ë^^´ﬁ‹Á ƒÚ√4Ïû¬2	"ì}œÆ¥Ô9•ÂPã{“O≤lÛr˜aÒ£ÓÍ∆ì Skv”Òt”Òus±∫r±ÊÚJÙwÄ?Î…~–ÿ«◊∂º3õÑ"ZÛ\rmË & ﬂaxyÁhu,˚v"9O/¸;Ωª’)≤8M7Ÿ*œÂãö„Ωºp£bo∑ñ4PË´∏µ‰ ΩÓ e®I
+ÑJK_ÉÓ4àÅ ≥ ©RË¢∏
©A∫4	˜FÅ™ÖY<·ı~	Ù'∫Ê3(«pZS∞›c`∏{!4~ëÜ6gπF*ˇH–3J“∞˝õqJq≈Ú˛p9˜@Z>¿ˇV6@‚Ñ‰jé•‹‚·”É?Ì∑S1ˆºûÖŸc±ºÒpV,Yn%AF_dPØ!ò/ú°Ü€…∞¯∏Q∞å»#±Ò¢{lLÖwÔæ∫£WI4ıéÒ8Hº∂æÖXYu1ê;ºÈA˚|<oÀ¶Ú…“êàs!Ì∏£åq[ÍàGÁ…πLÅ1ßQ⁄
¸õJªæ≤æ~Q%¢∂ﬂÁbˆøQNÏcv≠Z“ˆ≠]ås@¢ˆw]¯∫¯’Ω<}'Ft∑˚˙ıÒ…ï≤?2˛SÄÎ∑ï¶Â¬¢≠%1Ö2Ù¨ÇÍﬂ±sQvoÏ¨ÿXóagÓ%0&/Æ∫˝4™6áÍŸØÖQEHÒQPt‹˝·ÖÇ7ÅÄ˜¯}˙«w”äà+ÿ≈=¡Ä
|ÅA_†/]syûÜX3|d˛–"r~*»ô)ÿ’Œ≈˙Lå⁄)Z{¢ÏÛ9ag≥íKö°Y—E?∫õªX{µœgjNU/≤˝˛˚éS∏Œ÷£ãU¯‹øıóQ˜˝}≠oúØug\·AL+¸2øˇgãGi<~vÜ>ﬂ¿ ˜˛≠ûo≥˙ıe‚Œ÷÷Wø^›(ﬂæ≠%	cU»5◊dRmÄ≈≥„X{1ÍÖAÒEÂ0™±Ì‚	˙Ï˜#Ó»ñt'}¥ΩB“Å˚Ynìó¬U(√∏ﬂœP5BÜÙÔˇ∫ç¡ ÌΩ0Cƒ≈p\F·ÖpqÂlÑ‹e‡èÆ )Ì}´6ü¿gtÑzïﬂ"†Jcç»ZË4·À≤O°–†⁄_Cï)9,‡jlD√–∏πC‘Ú&õ≈üSıï–¶ÆãÌÁ<÷&πfeÂ¶Ø,ã9øûƒ#´,0å≠ﬁ™Ö6ñWÈe"‚T¸n…’XõgIR(˚√r‘y≤r.^}‚>≤ÜY0Ã≥(ç/h 3,”÷RoU»=^>Ÿ|úJ1Gªº.Ü[68È'π[˙ú˝˘%˚3‡7(´Ô9o(˜h{≠˙z’ÿ°◊Y™N∂ﬁ¡€SIµﬁ¡õSAë¬	™Pò,tË≤õ]sê°è$AzÄ‰Im≤nÕá∑QE˙„kˇ±t˜√=d3¨†Ü–£nÚ¸Hä…ƒΩ»èøO8/È…8„àVÖÁÃ˘íΩæ‘{Uâ-_øí ∫wøÁxŸeø@iºˇ9ú$T)9fÈÛ£™%VTµƒ
nyÌ°ñË#⁄¡¥"◊∞cgì±6U	PUÆrV®@èB§_;¢È÷∆gÜ"gY´èè#/˝Êó“7øù(¨·ûˇ∏ÿR”§xëe=ÀrÖäÂqë‚L™∑~‚1—ßg8◊AS6·c6≥ædÜÒ‹CE≤;∑vo…áEÆH£Y¢ÚdT.&œ˚$Ox^/1ª‚'ßœí—€ö‚Ú0ñ):˜K¬g¡+õÏy?`	 ÀŒW‚.H˛’‚Ñ∫ÎÙÒÒ¡}#£P†õó"–Õ„¢Å\P_Õ/’ﬂRlS}°¸Ï`ˇ±‰3ÙlÅ€4Íé?'3@‚€¯îÌz¯
ScÑ’1«| óXΩkƒ!°∑!e‡DBíZe(∫8"‡IÈ(§(wˆQ∏%º≥ çU@A„µ'\8ûe¡fN{r*πì*§&∞ıø^îQsï>> PÏÒ4¢à$Ñí;Ä"¥¶(9‰$K“ úF#~CÑ©˝~q≈Q9‚∞Æºa[Õ‰ÿóù∂°qºbUÌﬁlœ≠°⁄~rÎ{By"éÉ0ûd€wÎkéV·n5û¥5r0@f/∂Y=ÇÑ€XèItvdîIA?81∫…æ“¢≥Úä2À;[ï!Tú;√K‹∫ªÇ¬5mÖ
7+1‡ßDbCµ8TR⁄[∫\≈˚÷÷áè…OPá5°©ı#ˇ:ˇÕ”oæ¯Ç(∂ã†±“ √H1eÓX˚>O‡ Cb,¢	oäƒâWIbq(xìÒ¥|y°àº…˚ƒ_∑gî}Wè ,!Ù[©§±M∆5ıúI‰.y_JL`®gGlˇW>fˇ`bñÈã/xLÔ“B8t«≠ªÂ·öi%ü≤m÷,Vs°Xƒu·å[∞ñh¡Xè}⁄⁄ÃæòÊÅ∏1ˆ˘óº˜y ≤„I:”˝"OéKUG–∫ æ≤)"0E‰)H>˘ê)™55NØÀŸ¢…ÂŒõx›åMúÙºQı√õΩ˙"¯" sL…XΩJT_“˙ l>Œ@j?WoÑtÅ„.kE˛d@ç,)¶aæxˇsÜP?È˝¯G$pH˜4gÇô0hôhQd™…=¿ƒõÓ\Î2ÇUæÓjº∆|+j9yïáV-çc¡£j ÕÙ∆ÚA5:udé∂¥ƒBÿJ∫Ñ/–ÓT|'F[E}4_Ø$?ËJÜ‚ÑãT·Í°€¬Õf ú¸Äª»“ñD(,“®yNÖ<À¥hWÑG?o©Ω–="-sÂe‚ma¶Ö8ôd˚ÚR*msS8≠˝3ı˘"[~ãV≥Úz©EÌ!t›£NY£!Ôm—π∏∫b.¢bûﬂ6Ø«˛ÃßÀùÕv˛ì®z√ÙS]˙u)~Õ„ÄD=cº¢ñ8W:"ü6Êœ⁄oÛ}.Ve/†¸î≈ˆ5ıµ˙”üî•Nü@Tfb“w‚È∂æËºZœ∑äf±ÙÀHÊπáÒ&◊Q∫êœt∞Ω!Ì⁄òÁÉÿ‰„Ã'_oPx<¥◊fÎz={;üä¬«·Ó
,]˚˚…ŒÈ_=Ow;˛wé˙ìÃÛÙı∏†ìû}¡{ÿå∂3ísWœ·5µÄªµÜë¿zòf∂=
£n≤c¸~~dº‰ﬂ(N)p÷@#`J˙TÇlaqÛ-O9¸·_cﬁﬁÒ>•cı<7Ñ±»ﬁs‡ØNYÑISå`˝‹-‡f‘jˆ∆7ÜNÌ1∞£√7'\Ωúä}„£çw˜‡xÅü≥˙<50áÁ@IeìA¬N#¥#T∏Ùªìæ
¡ªT%
ü£PUOMc’ˇ%†`¨&>i[Opï‹O‰≈”o¨1ºƒ∞ﬂ¿≤z«·lìû,∑Ô7éÂ∂cﬂE7ˆdO•Ìm∏ÊUXÃiÒ!>qB^us«Âﬁæ>G*
(äa¶=¡%êBh.ó7H… ù!±∑…ÓÿŸ—≠§‘ﬂbA7	FC∏ó»_òæH6·vÙGAR¸¶·?$ù™EpÄß0ãª)çõ(€—ù®¬ü¥¬ACç+Üœ[¯õ JNT$ÿÔºvûAª¯w†˜dœÚoõ≤’oæ»A’óÍb‚Bæ-Ó≤ıßù”_|ëç©Iß˘™c/Á€–. ‰N(Eb3îe?Ú“© "¿µ{EÆAbë@C|JyÒ˛'ÍæíãVÙ˘ÌŒ·bOÔ"µ¯4éQ«ü —èoù–œ~[,åÔı/‹o—:9ﬂ)`ßF.hTc0™®XÙ”(o·2¬]OÅ)ŒÅ¯BáZ}π:ïT~-fΩª≥^éÍÎQuA*ØHÂ%q_ÁEq]˜e…ØKëi >O˘ãæsXpY;_óô_Û%™œÃ[‚d*‹xÀ“ø2Ég‰88Xˇ÷1ˇZnû’çÛ◊£Ùn’ËÔ"Eèàg˜§}’SÉπ{RÚ8ìÒ(!$êògŒíêWÜF4„Ÿ££¿Î¿π∆óIûøA¸4![.U[Çj'2˛.™d-—¶m∆Ó≤vw§*∞¯$È‹”ΩhÄ èÃUÇ˘~¢Rô§ùÿ}ˇôƒ1Çu%üÒÁ7û%˘åpvÑ¢äPvIDÆ4yAr†Ä„â.öÑ1¨)åx‘Y1Ü¨µjIâÕÙÓòŸÜ–hπ,üÑyÿºπºb Ìv…Â◊ÀJ◊êK6\°˛±·É!∞"q†∆»z‡Ä-ç<#ñí?Ò‰Oßk…≥¢+y“+o%Öb*¶=·?ø÷7¿&{ÎŒ“˝Hf^^Ø{5]q=mÁa‘Ö÷»˙Ãà¬/Bú{˙/Á(•ˆU¿é£Àâ0	ÿül%qf*:i8ﬁ8Ñ2‹ ä	ã©√í7ÿöx2p¯åÓ√v±´8„î_[ò∆ ÒÊ_Ç´ù¢‹6‚Æ¬ffÃŸ⁄ÄqO°nè·fB
-YÑ% .˝'ÄVËsÎ_ThK√˝((< …4—`ÑË6≤¬ˇ@ç≥€·	®‡A (!%B4◊A«û‘Iëí*dácLâ√·Õ3¡Äz2 ˜07⁄,Ú*ßrÃb≈ƒE÷4ø∆–P˜"ÇùƒÕ·\$›˜[Ê6’Öf∆ç}N]†˘Õ&¿Û1Ä”~r	«CÛ·Äæ˜‚†‚*W≠¶(’˜”∆Á66Gºo¶Ù¶hq]¶ PÊ
ñ6ÖÚıìKm∑E⁄ÒÂxSn‰˚2ŒÄ,§ƒu ˘>ÜdƒÉæÈ‡6€’4íE)W—ºµéëÔ¿©Lû_◊(œP8ª#¿}tiF‡˚,Fïôà«˜J$Ã15:æf\X˚#ÂnÉKqê	±GåÓÙ›byÛª}_‚:gfX[GÑ@oËd¢îÌ,jd™éz™ÿ¡t™bÁ®ÜÔè;ôÇ‘wî¢œæ88|πœwW¸ëE›≠°ÔÑÖIî„ÆQ¨£\:-úÒ‹”'kdBr∏ƒ‡{!¡Ûçeñ¥mü˙íÔú˛ıQñ\MŸ¶ßys.:_Û¨¯|˝.∫¡ØÀmZ˝÷oa›w;è≤ÓyN%{ä˚ò∑ïc.V˙∑uŒIüÒ(ã>ö§£~æÏ‚Wç£ﬁ.é˙⁄=é∫”Õ€Œ‰Òií *Äx B~ÆÍõëNá¸ÖHd"DÚÄPHÂâË6¨yg)\ãüÒÆ1 b√JwÛ)>=.Òcó‰ÜåA»E£Ç∞EeπÑ‡{…0!Ìﬂ 4iVB‰Ω¢zy$öÑ.M˘~úÏı¿¿∫Fap6 à∑dsV`‡6ﬂ—≠uïü?T˙c◊«Yèk]†≥œe]PΩ˘œKÁsYâN?Í°Aıßø@¬ß‚8 àU\b;#î¶ê‰#˚–´DÍı◊»OVXÜ®Â$‚H'óªΩà—C¶Nl0"ñ¡óKZ$YÒÚ¥’2DÉﬁ(ƒˇñë∆ß ıYTL!∑3!_5-ìçÔÕyò˙ ’ùƒGzI‚ÿ&≥∆¡y?re*ÂMtì~?…˘R˛0±,.|#ùÁnúñSã.TuRô5ø‚%3Ö⁄  ÎT >¥2˜î#ÿ%hmÇpß∂n-ç{≥µ%^s}Àæ∞89∆›NÓA5wÑ<t˛ÅX÷K /øG_Ëc/⁄ºø˜æ¨6OíÛÙ—õ?Œ#Y±§}ÕCπ#@÷vû¡≠1Â›VÜ¢√( &æ‰'R•öM¿Î»›ÎÛÔ£Æ»ú5U≠˜<˜√æ<0MÙè0@ p+mKËç⁄&æ÷v—: oÕ6Ä®”V"ÊíáL⁄T⁄4lêsP,[ûø9›ı¯ËZJ¨⁄ΩXçj]ÎFxÓ+¶Üé—|∑ˇ◊≤—¿„ŸG√Õ‡Ó3öó˚ß;áØwµ9´|[6h®2˚†…Ã}~ºø{∞{∏≥Á∑®·4<˜æ{¥x∏z‚}æºˇrgˆ)ÁÊÖ˜ôÒÎ7ß«e≥=9xÂü,æ<˚xÖ£s¨Ó+h¯¿òƒ¬ÍAf¨—ÚÜ¢ùköÌ4’n»œ{ù–øµÊO`Æ 2‘e ¬;Iå N§√L©õ1í5õ¸Â»ÌóÊ?Ï0“(r„◊5L»>˜tQírh>p*VÖåŸP•ÚÖñ…;ƒÚAπÈ	¸81„‘7ìàõ˜!"{6≥ó ã$Aπe@Ÿ}Ãº∆6Ûrd≥Ïz¥ßO∞ïÚ,≈µå}r7πR°pπsò2Nóürn(¶¥]≤”wïÆI”I˜)îM›Àl$±I≥©wÅãª†≠û(˚Zw∞Ûƒg_’b[µÕq¶ZÑ"yÕfÜûmãO÷D˛áE(’ø)[/‚~t
ÉìB˘U ÛÖÑ›:.‚¿ææ‡¨V÷wæt˜Í:1s¢˙M•/É!Z≠¿äôNπwñÁ≤”oôM†ÙL&ØYlÚÏ-÷|3Bˇ´7¸!o#∂„noãˇ<¡ÃzPgá ¿ñ⁄¿”ßﬂ∞‡*à˚ié°˜L˙&`„ƒ≈√eC”Hx∞´¸<{À¶‹WXz
Á~¬|†˙–ånÙ∆Y·ˇÀóåÚn†Y¯è(ö2C´4Ã
X∏sú…∆85™¨îΩ£‡ı·ãVOËY˚≠‡~îó…v*ÀúRG≈oµ©-ú∫ÚÏiS∏`√øƒ—5∆ﬁ9OÇ4‹ÑS?â‘g«œÃÒ⁄Àí·0Íœ¯ÉΩ√Ó¡ãé ∫∆„¬g›˘™“∞Únú¡!
_1p!Ì≠≈Z‡nü&{p||Aﬂ(⁄jOx∞?m‚ﬂy≈≥ª√~¥õF‹Î2»ná]¶¬B2ÉóÓóÍÊÛÿ≤Ç^HëéÅ/¿î ô\e≠a4j5r…)`’´;¢ÉÃÀ'8ÑIKÎùŒ‘Çy´g≤ª¢"}ˇ3Z≥ÔﬂˇÑÍ,¯K6=î˚≥t|U‚÷‚e0ÓµR¥º„,∏pC]Yüoeìsh´ŸY`Ot∑ùËW[ÖäO@J#|∫k˘î˚$ÀÆ»∑≤qöçw∫˙D=Gå)∑ÇOÅè8Úuπbt?Ô%›fàˇü/∞7ZÓ¶C«¥7|Ï˘⁄H o±(R/ª˙H¨ˇõl¬mÛÂ&sCñM(¥—ól¡( –lJñ Úç«2wj¢8M Û`Â|üÄ›A‡ öQö⁄;û‚Eá)>Ü‚˝/hiå3œÔãˇÃ´◊l^;)º@eó¸ÓÑ¸“Â’[<êÑæË‚6«∞aî°£m Û3‡Èmvë¬Jë'9∆^Ç±≈în¡∑˛≠hDÒ‰ÉÉ£∆•ì∞∏7pÇøÑ€¢r^›GfH††ûòêûîW”Óù¬ıÇ›Ç¬$mŒ…ãnÄÌéã˝⁄ú[`¯ﬁ7Ó6´„â9Ü]í›Sú˝;ET∏∞åÙˆ∞≠ñr€aé£≈ãGò§\˚‰ÉÇ˚Sæ ,ÖH†\Ü›V˚då≤^!c}4X¿⁄◊1ºçf„hŒ˜ìŒQÑv¥¸›2_iúç‹h~D∆ªÆóY¡ù¡3™\fléav'4¥◊in˙ögåeÖﬂÖI$É≈¨@∞˜YÒ∫°@î™#ˇ1Å⁄Ò)‘|m˜ö«0fr%∏‰–k^çÊ4ª”‡‹∂˜u8£†Ø–,Œ(¬˘cóÉ3:‹®f∂ÀI-óç*wççvÅëÀŸ†‘…cÓiÓ»—Yù.=u™-.ÕR.
èéã8È%ˆêYè¶KºS°∞ïS úÅL°›¨‹,yöó‡LYNj5Æ›Ü∆qÀ|g∂jÕ≈™c„{Ω∏ºŒz¯GßrMùZ…ù™ó˘dp√Ø'{€å∞Ézób[âm_È83˘îÛ≠nˇÚ∑«ÿ!uö¥8-.#-ßô¶™wòhë®ZﬂqŸŒï9ç¨ãËË«Ä°òÒË˚ GhIÅ“,µø∂a∏]i?¢†U#7Ñºï‘¸œ∏Ôâ∏*Cr<A˘1–Ò⁄ùõﬁN€.LtyäÍ&, ”Ã€ƒ∆‘lwqYú.M≈r!eRLEÕC!ƒ ~Ÿá©:VéyπÄÛ˚AZñ˘›ö£JKñMJÓ°;p“˝ßÉÌ~mMF‚L∏>‚õÄ  ≠O≥¶aàY¢%Ùu¨ÚÎc®+Tã”Ûà
˜ÀE'X.:V70¢á5,[‰Íﬂ2ò˜2F÷ˇ6Ë£k‹´dë˝úÄM‘•c(Òp$)©≠∑Ô∏˛'¡åäÌ<wåxµ®≈©rh—e/")5ühW9ñ£ÿØ¬ ˜´E(òL∆ä1"’∂âÏ1º†¸ #t^Sô4!·¶È÷d#X—®≠GÈˆ-NX GgºE◊A˝ÂˆÛe.xo¶qfsäñÃ‹pïÔøSÂ!Ö*Cp˚ƒèqb|Nì≈7Nî[ÀYÑrË£ÑR4˛„häu∫ÿu◊Í‘Ï9(h‹Øü-§Pç–¢∑-&EëT.8Rg˘^qgèùz¸s∫zÖœn?⁄Õ‹øŸdÌv{ŸY◊ô›œKyì˛'	ˆÚRá-“∏hAn±¿gv)pÒÖã≤õ›!&÷="Í)vÚoÄ√P¿ÍpcÄñ*ïBƒóx4ë%ÍüO24“œEHÑßhceõ‡◊0ÿt≈è_Lxdu@‹‚ahr8◊œÖ‹Ëû~ﬁ»Õq®í@>˜π9Ã†ÄZêÈâà‰±… @ﬂj±Ñ¸ª•;]ÉB∆l).ùÏÇåI“iæÃ”ßﬁû•!VÇ∂ev˜¢—ÿ·©ÛA⁄ävÃÑŒá|zÅŸŸ!≤ÔÃïìç/ãswÊ $wå¬è5LÊ£ƒﬁ·—_‡$Âl∫P›å–Fçö”¨^3πÜ…lËªÍ˜uñ“¿!⁄Fp*<Ë´”ueJcƒé\N§Cv›ñ\˚ñÇ*TN≠–Ø)Ôû$®(éÿ!∞«0òÜ◊øÂ6¢®sÒf≥óÏ°i—%ƒ◊[ÕMKÿ¨≥¢ÃÃ≈˝Õ;÷jëç”◊åbÉo7ŸóXî`¯'π`ÜRÙ-õöÈ|‰ß∏wÔ<ÅÅÿH±(X5Éû(¨–ø∫S¥Tu˜å5˜U™ÊÜ'Ù∏ﬁ˙‚0ﬂ-> p“pÖùw≈ãßç‘aƒ›ªkÄ˝=¯_Œ| ôWÁ÷óÊ!BvT ä¨óÆ¡
ü¥œêj÷q¸ÈO.!#‡˚«˙¶
 12R_Ó£Ví˝ÿ-´eÈ"§Á¸ö—Âˆ∫ø∏mÑ¯«æ5…,∑xà´◊]ÀËVÍhƒÓ:‰CáÄË&´#í˜ƒ#*"ö§L’aÊ¶G'öß†°y‰¶•ßl7◊…æJÆí\è1≥
¿+L™UöÃ!ËQ‰ç‚uZeÓiÆæQ\&2 ‚‹ÿÅgcõöâΩTº©Ë-Æ€±lZ·òõ:f¨çÖ8r#ÓHDg@Us¿Q^÷`Óä«Éåt2EE†Œ®–2tdznÄ˚snÆŒ>ïlåµ?±m‹‚pƒr'ô«∞Ò¥§Eºx.æ¥LtÛ0√«;ÍpïâóÚ¿ù!
uˇñ$∫‚p dÉüõ	´$ú11tﬂ„:Hnb√≠hrΩçgØá|Á™—¥ÆÔÒqênQ=jd¥]õñ‡7üå2:[ŒÂàÀÿƒ∑"7N„Í!«ë.ÈÒÏIM˘F~≠Œ⁄≠Âh ñ˘í.À∞øˇë±∆d·“Xn/dÍz’Ààr¸T(¨&Û	~tÖxnOŒ ö™]*j4ÕçÑC*jΩ°%∆FÎ›>◊N“$?„x‹èPl«ıç˘^(9&ß)∞±«{˜◊ØC#MëÎÁæœõÅ6¨L§˙k’Ü¬äù∞dH-·/f…nîOÇ´ºÿb†ô£-|˙Û}:ŒÅPÁFZ¿ÊLøLÇ>ˇ÷%&òær#+˙åFˇ  ˇˇÏ]Îr€8ñ˛ﬂOÅ®∫∆r-€≤;ôƒ)Ev“ﬁqóÂ§w+’ï°$⁄Ê¥D™I v∆ï}ñù_[”U˝gˆ÷/∂8∏ê Ä†,'JoT’ô‚pŒÂ˚ûè›‚ÕlÆI¶
È»‹N¶ {°¸ÿLMΩ…æˇQ{=9ﬁøjÆÌ§eâäﬂA¯µ9Ú\MÙF—»xõ¸7ÛMF‹7Û
kªÂ.˚ èÕâxí<Xüâ)›¯0ò\C,„OË/CìﬂcOy…œ©Œ&◊ﬂgè‹)	É8zÈ¿˘Ãª=ﬂÔ0ïsÓ©Ï‡π#àêÃ≤◊Ï«WQN¸ƒ$C∏Úô˚•›»Ã¬a≠ã˘ÏŒØ©æ<´5NÔ_ÑgYçÛãù∂€E@<é˝—sº¯Œ¶™F¢€Œ ÚI üfPNÙÃ˛«hx6Ëiå5‹ld<ƒ2@¡¬¬'ªá&¿Õx.àÖsÛˆyÑÃ“ ú¸	QQW~ôï‰{ù≈≤æ
”√ØÄÄ•äOíT2V ¡!ƒGOÇ3>ëÒWZÍ˝‰«”WG‰◊É1ôït∂Õk∂"Í}·áf$¸.5 D£æÈGÍØN7ÍœR_ñoVú—s¢.qù~Ù˜Ê∏|öÊf=∞V'¬®Ín)û’5g+£ŸM¬à& C	£úf˛ò2î_˙ê÷Îè±Y´^Ú¶/°Ûô›àòu%.B‹Íã¯äùrpçUADChzäèÎ≈-éNìœVö~˝:Ê∏√1Q7QúÈ3iP—˘§Ú¸’;‘|
;¡ìñ|Ø¥`{Âe⁄+ñcOZÑ=u≠ı4+¨'Ø£^iıÙî5“+Øåû∏ zt—ÛÚ•Õó&OYÄ<Û‚Ÿ◊	Øj-˙ﬁ”(uOßπ=£zˆJZÿ+Î]œ†`=QìzäÇÛ$≠ÊI*Àìïß™#O£Ñ<ù™QOé,ë≤÷JJ¡”È …BÓ…íÌI‚ÏQˆ4ÇÎE’≥…„w• 6¸<ˇíÙ+`ÚáTÅFÍ¨V´≥Ù≈˙Zmıàê&TÎ∞|ZWAÖùWääßÚ6»µ*ÿ⁄'<Ñ‰Ù8÷πÌ_ÑØ@XìòîÚ°ÿå•G∞8ªånäã Y¢∏‰îƒ÷Ò8∞¢«ËÅ0Ç çÿ.C‚±du·˘t_Ât;∂SÇqs9ø[o:s∫Ïsäªt…_¨=¨È¶‡!ó¸Ã´e2∂Yãﬁ}uûRåç∑Zå6 ÜK%;
î{-… ∏˘ë≠2œI[Ê9©QqQ"@Q8RX—«6}‡FHÙ(µä5JIP◊ù{Ω∂¿ìÙè˛@¬)˛c eˆv7–Z-oBŸùg®¡M!_u!ß™9ZÆ©19Ú¯ìÔêt!;3 ∂mÏΩ¨ë√Ä`˛'¡Yê‹˛Üˇ≤ôÅvN≤ë-µ}⁄Íï*¸ŸÖ&;ŒJY≈B—äö=æZ€ÅéºX€i‘Â%—:º›‡’@u‰¢≈‚#Q,w»∑µt«ŸÖyÜjS˘!rL4¨áÖ˙j&ëOÚ«|eπÏ¯õ™’ ·≥X±H¨—E+t(!¡|Ñ/J?ñ]¥π}‹§◊¿Ù£è◊¢=©Aﬂƒ}B≤√®Ny»OLêÖlm⁄ÇO‚$ ÑÂ¢x‡—˜∫ú÷|K@brÏEü	Ò~ˆª¿n 	jõÙü<vARî0GIú ≠¢‘írÍÑ∏öáó[}V&ü˜õª¨√.ÿwmz&ô4zØN≠_Y◊W ¥ËX» ºπ¡x*√©21ê<Hƒ
)á#L!Ïá∫?á‰ÀTØ‚ûﬁ—”ôôûpÛ◊ÔoDC€íW≥YdëP˝Ï~N˙ÑÚŒ⁄UÕ
z∫>€D´}r√@G1¢ljtÑz7ŸŸ∫b*U@πﬂ$)+§H@1∑ÂŸ<¨Ok]úfÚ™Øl|∆‹µs`∞R?t	7
°G£{2‹ß§;ﬁ1Víª‹∆≥±ü¨ËÛ~ê)=ˇ≠"§_Ü∫≤TföLÀ€Ωãá∑ø	à≥,Ú&('˜ë¿˚‚ÁΩ@ﬁ˝4;@Y‡tb¸ø`Çf·L¬πU>ñ^1Kç3BóèÀ~QÛD¿6C¯Î˙√O5l4JîéÖäÿÃã¡*œ<ÛH|V]9Óﬂ©oî⁄$™⁄EÆ[Ö ∞¥§˚"∆£ﬁEÄÖ¨0çëQ´àìüç§Z∫y√@c˛‡‘ò•èQóLΩ?¬Z;	`^Ÿ´&1(>orí%*wI<"Báehdë†¢ÚIäY	@»Ì?÷Äê1ƒ˚uüfÔNÒ”P:Ûq3«Ñ!ånÜ%61q,ÊIQX5¿:ﬁ<PeHÚ|-&I°Ï(3©]6e∑ENCŒa.±NÛV	+¨*·P∞*∏&hÛ/Tô¥7Ê»Oÿg˛X.àrr∑¥¯%áÅ°0à›IóËFÚôsLr°€Ï
B'V[∆çÇ∏À&P◊ π	*ñ^´;•Úº∫]≥ ì‚$ﬁô˚ b1:˛©k◊÷åß™ÑwÅz”Ø≥:MÈ|ÁvØ9ªçØD∂¡4n£%ñŒ"˚›:1ÏIl∂å`ót6Óp\∆Y…Äˆ€»»´ûn_∆Ωe5…ËUŒÎüS8©@äí£¸#6jxÊxÖ(ôÛ÷DÚŸl°SπeÄqÊß>5>ü+§Q¯H‚CÀ{öRäY<¥ñ	èöxQÑÓ˘uÊè
Ñ.ºäÆ∂û˚®√ß›BEÖZ›uG!!(M–Ì°S∂N“uö∑–º^”A©∂™ôY°®∞Ï?(≠˚™ó˚j¥Pù∂h≠Ê¢◊F˙˝Ë5‹†Ék|i‰èè•Œ
ŒE≈Õ´‰ÓhÊkµ‹>a∏µœjF´4\m˜p°:—ZM∂w√¯<ÏÌûúv_º>=¿Ü√•bÌ]$ 	œPﬂü§≥Ëø)kêÅ>"<¬xóéwÍ∞y”î≤∂å†rö∞øë~9O¸âá~∫≥¥;ù¬Õ^‡Õƒ éÒ.?∫ébÁ¯êë?∞¬
•T≠ñúñÃäΩ°qÀœ~◊+
ŒAn—9g¯©
ﬁÏœ´+Jﬁ∫ØGS–õÀ ÍF£$GÎ«ΩØ@e`√®; <‚xﬂ?CƒGpú„1NP«‘†∑Mh/Èåì-Ï\ÄX;C?I äIG√àòF«I<úa;îO›44˚Ω‹l√ç™}ø≤µ≈ÿçM≠œ©’L?ﬁπÜ¿†5oƒLlòYrävëh]ÎdÔ(^sF!ûêkYº6†0ØtQ™-Ê∞Ôè ¨˜õ≠]!¥ÇÄâı≠‰H—÷p“.‘]S“’q-≈/≥ﬁﬁ ¯Ä¢kD€?®˚ºAR@
‘w€4kÆpÃ,•<róú }‰S”Ôl˝&z-∏! ©§ ØTÙ S)§V¡Ø>^Ò– Î¯RΩ|Têøì+ÒÂ2∑n9Ï…»›˘âÄ2´|(MºT+—dX#|ëe
“õòû¢u~“’
ìì¡É[ÿ£%≈¢r-÷L‚ùƒd"Æ—ôGàõõ“úÀxÑ≈¥6<y¿¥ÃWÎ⁄>?≥≤›*<mä_	hB“i¯à”)L ;r
\kZÏKC6€ïF∫¸ä^LRBÀµ≈f †ä$Õ„˙èÛï+óÌ€P¯è∑˛cÇó‰lñR”–ü»±Á%πWG,ÊBQ$∫à˘ñH”kõÊí˛∏∆ß`£ÏÉﬁ•@˜æÜ¬È‡R¸K¡b]¥ΩÅAÖ~ ›yüÙ©JH¿å÷ŸêUQ!∫º¥<c€å0f‰ª*G($¢9X“¨9å\”≠∫c‹Eh£X'¸‘5©ÇZfŸ}˙õÍ	hÆ∏~ócÃﬂÊÒÊ1K^,´?Ï>Ê∞bÃ £Ω‘”_»ì$Ä◊ @∏˚B9å…Aæ“£aGdu&U4+û)^æ≤œ0∂£Kﬁ4ò•î#ÇkÑ)YÁCÊ˚Py$P‰cC˝2ò<$ÍJLzÿ´¡—ÄzÊqƒV⁄ﬂÉD∫∞µ¢C Éè°»Ùº.Rø÷Ú›Ú–ûúƒPÍ“^i5»Õ_´TH1ÙV-B“Áƒj&H≠‚Vx:#í4˘r∆8õ7‡>TŒk2[&»UNiœù˜•Ô8Eu0ê	ª‚‡†˜ß6r˛ìj(WQ©ä˝KóÓq—M»=√ã (	B‚ﬁJ$ˇ:§—Äúë∆cLìx0∆¡ã˙Iúìç–Y`q+V¿ÎÉü‚‰(_#p?ÜÁP`hÉ&¶Ó¸f–j∞¸∫ñtœ÷πå¬úöHü·sNO`∆wFÒyÄ≠ºü◊öEO%HlO0Âôé_a%_P#h}o‚∞nzÇÓ.F%&êhl òi£-≥ Â¬‚†ZˆCˇ<∫˝†|≤≈‚‹5áë1Èó#*=àE©ñe3‘ıv”ÇWÜÕ∆Àj6ÑwZ‘t+•í#œ2kÏ]n∂⁄≠GË¯‰ÕæÆ%.¿Ñ≤ìA-X»°dúãvùã⁄ˆ¢Õ‚,câÅCnC%1T<)÷¯Æì5û„Ëô jAÁ√M‡Ó(û±eRR@m(ı≈·%R÷émQ#€ iÉÿ6®	-#Ø –‹2A§€p#gÏÓ|o-™^ï’)≈'5±ª’“@‹˚xKÈı˙T£óΩO¡Ÿÿ;Â~H>Z∞≈4!y”œM§@
È‚i	À;ûÊ`ﬁ¯Î¸œÁÕZßıÊø9öî_~˛„§”`x˚˚YTmSﬂ@∂aÜ¥Pm¿êkû6 4c‡IÄè$Q˚˛Gzú#)|DPWV¯Ä≈™ún}éÅK$˙¨∏ÜÜT]aNY7—i¿g9ïÜq*äπaKt(
–∆≥èÅ•3•ÓT9:FBº.oV2 çœÂ≠ü∆+diÉ+dñÏÅ∂0üoÕÖˇ˜ÇÇ‹ZêcÀM7§‘ﬂ†õí∑Ê≤V©È" lŒg™a¥æm¿ﬂ]:ùŒ“!‰~$∑ø«£•◊Îπn\∞v/tÓÁ—ÒLOÃ´´ˇø®Í|XÓMaKãÌ◊Ø∂±,ALûÊö˝î˜2™Õ·‰kRôÃ4\∞¬‰Á7uπDÍí Ω)KaóÒQïgaÙ«PîÆVÆì˝äÏJˆ˛UÏ´€ﬂ“ınDb√'∫ïE’⁄Ù&’ô@⁄ ZLa hõnåû%DNG_‹W§z\πƒÔÓgêÍ˜Óó¢S8G97∑ππmíõ'0¿]NÓìˇπ°∫Œk¶Á≤¡∞àå,:W;≈çd®£+ï©√“´Å±ô*è†[Çÿ4uŒÏÔR«ç¸ÇkÇ9≥Ä:GÒ‡oÕ:ùQ
È&ME≤[ÈtfÕïµï’V@æi–\m˝-£Ê :^€t	u∆ÓTôÅ>ßÇ.!Èf˝tpù%3Ç~Û√zyë∞ÑkP{KÇ¿• ¿3_üL>™˙•°K{˝ ãì‚]-¥aıLiª!Móä¶o4∑ÿ™@î“{y˝Ù@/ﬂtè>ºÎΩ=®∏!–À9ß`U⁄¬å$å–StSp*Myå^ì˜(-<fsôıq«˚ÁA2#±äjÆL¸hÜß¿/˛9ü∑ˆﬂ˙o^∑(¬6V\M÷¢U;√Û~<lé‡øÅáV“ÇrÂ|¸Ò ™án8C«Opl$ cIôËìÂ-ñ]k§é^@$¨Ãb[‡*1.[Vy£Qôeí#PüN+¥∞î@B¥ÔdJΩPÂ÷›$◊/ ˘˙…9ò˛Ú“FˆWÀ\Ω◊ã‹8ºÑº±ÖÓ®˚X¸™eÏ™èüÿ˘∫/Ø@—´>ÈEóPÒ	ÿÒ:ıÃ¯SC˜	‡Û_É§Ôˇ°ƒÛMVnXñYæ˙ﬂÕ´]÷´ ∑[ÕXÎå√°ZÙ≈ …ÒFí±=sê¶>ò◊`ÎßØ≤>G £)Ûå¢î¡’‰e^1ﬁ˛c<úÄ\,eu´’^’ºúˆù$ß‰rﬁJvï\U*p÷U0´(‹,W(»2Qs0nÿóeñ¶S@v πsïú8ußjc∫≠¶≤4ÈπÄÁ°å|L’Kπ§ß‡Î+Jû•øÔÉÙÚa“À¯•‚Í™U¢+¶¸Á†ûmM) √ûVﬁô∫
¿mpGV“`jQˆl†≤‚Q9]9X39ÒÓ]π/9`ﬁCAÈGq2Ò«l√ü£‡ˇ:&D%IDO+*ölÂ«÷üz¡eG'§éW[˝Ãﬁëëﬁ4%J}≈∫rUW"Î‘Ué&@ïªãÎ	IÿŸß£ä˚¯‹E∞Ô&÷V°ÆˆÔπ6Õ±˚›‰≤æTjD´Ì*WÃÆhCq˘-JÚN±i›Öê÷J~ª„Ñ1uú∂À©‡T¸ÒÖ9Åé`rµÏ ∂ùNN)ù[&%¨eIÜâ≤|"…∆E2ˇ≥∂H>O¬‡åL∆ØJ,_Ã"N>Û%≥á;ÂêÒﬂêä≠Û8]?´lÕ◊+õFr‘÷2	j^Yæ\bzwsãËëˇ1H\ÕŸ%ëœW19A‰ÔtGVªs·rz0¬{˘ƒC~é;Ü≈ñÒéOXÀ¶˛àV¿é,À˚Úâm	ZqWá¡j-U“:zµ©UÓMVÉqh`v§Ú9∆ªíÿ&dõêe§„∆^7Õ5ré¬PPV!èru™˛Õ"◊ö»
gºwsΩxÏ„˛‰4O@ÊÇ˚Ω8@·˘ ∆Y ÿ;∑Óß|é≠˘ÍπúS»°$n™8e\B¥u‘≥5mAFÚú>¨XºTŒA∂˛§ìÇπê,à&“ìÇÏ=3C3áìsî&√ß¬Èüê?Œû6»ï«IpŸ–,≈ÙüòêQØ°≠∆¬‰UÙ∏˙˘çã,õ¶è◊◊”ø€∞u^≥o√x≤ Z˛˙Œ√Ìç›G:;Ì¡ˆ÷ˆŒÓ∆ˆfÁ—÷éøÒh∏±3:è:è∂∑µˇsrŸnM£Û}è˝‡Ãüç3Ô£º .~è]$∏Ú˜â2?åÃodH(+%mÂÆoN´ô3dvtìNôºaFáZ„'ÉòWg«Põ‡3ØéRöœ5Ë¸.‰1‚ı:‹Ïßß£O‚h4`Ã¿“¯–yèGq8¶x 	˝ˆ˙!Í’l(ãà∏‡÷Ë) CWw˙¨ı~„gs∏Ri·<{-G>AÑü¢(∏B/B‡IÜ6‰ƒ.j≈√+àFZ∆]˚sÅz)åÈQéª¿æ‚&{>  ë∆_è-ÚøÍ‚∑Ç$πY<Œû&Ï÷O7È∑'G¥üÁ@i∞pçô≥]≥‡≠ ∆ÓVåkQ>∞UíƒLËÍ,úíö°J»(√:©±ª4¸¥,ÿÖmä#˘ààÏV!C$IÄF,ä/c‰'øŒ gçD≥f"®°÷Æ±El±“úË∑®Ú<'P¶2[+ª∂´˜úniΩ¶0NÚKÅl£Ó2OÇ	ú¡‘™=„y∑˚≥ûøô]‰s£…◊0æäãò	÷Ûß˛˝õ`•éo/1Wv™≤µÑ¶»kú™‚HÎt˛fäπòb0ëæôb∆œ5≈6€`ãÌ∫€bÖö¯fë	'ﬂüEvH≠‘ÄBn˛O36Ùr⁄diñõc)êæP¸¯ëfq'±íVüõ≈#J<âüD4˙≥e¬Ñ_n”å™Ÿe5ÕTáÆ!q≥äT]ß‡Üiæ[ Ì%∑ØËn°d|π«≥Ùbƒgáfiòc‹∞‡Yˇ<N@ßqÇ•9í[>ÖñOÇtó°‡œÇ!ò±-8œ5axËˆüx°§î≥I>o â2ÑlM8Ãê)∞…≥ô‘ÿ{qxrº€?¯–?8ywÿ;¯–Ìıﬁº}}˙dÓ±áÇ:7{wxz!ø„ªÓÒ·˛áø¸øW‰ó|Û:˚ÿvE`àı+À◊°⁄—¡Û«å«(Hí5ﬁ_b9¿7Û√1Vù–N‹ΩY<¯`'ƒÿ¯Å.'V-‘BºY^KIñ˙¿ö≥0A$à oDw«PÄrNlá!‡¸¬„N»Lù˚cë¿-n€∂≈b‘X i} ,Ë’q`„bıh⁄ö=‹ƒ€ˇÜºôU√y¿õ(%®⁄Ëç∂ç;al{Ë “7>≠Ô°Ó˛+f—õ™õmò	÷Võ@7•–‹ı˝¸"g¿ºQòó‰Ë©‘k&SvÊiÙt≥ÔÍ*,•úxe˚ˆΩîa¸≠(∆Ö`UTf””cJR¡ä˝%%Á€Ab5 -äØ1[P¶4≈Ô\‡’&H¿É¿ßj´’™ë∆ˇÖ∞Bæå<≈ÁaÙáÂ1ºay>íØ¸&‘K ‘ú[òåÕB‰⁄’X$h≈Áïı˛lê›˛ûAYLSÍ?Ω‹q©üá£,Ô‚  ‚µqTæ÷QÍÎ»¸7â∑Jº"Ô◊x/·¸öD…"Xµ¶∏u√pÍìÏ†±E‘Ñ©»ƒqB[ ÙõN	˝&Ô]èÍ1r´Áxƒg”OrH(uj¥-d^ø5ıW≤ØÉüX´ùx5 å1ñí´¢∏jéú—´µÕd}v
œñÙäw™Ç≤”Q/¨¿¿ãª‹g≥kÀ5≠µ‹∂*÷|U}ecÔ9ñ?At∂‘bX2DÌ‡Y⁄˜«ó≈

)É	©NÆÁ2;]r•¡	∫˛$8ka=í‡a|÷2ö8%GZíärép•<zn.a®*>ºI∏{1`1x;»ˆñRN>qﬁ-Vz<cc@j:@*#nKé}1…}’:å_.xî∑
˙.NàÈV‰¬¥ë)†tÁ®lÚè5TJfM#E09æ_MπÃﬂ8r„6C#ì‹ÿ*wëeá∞∂('Ñä$*EY%[riﬁ'•7-Ö5•˙Ì·~wˇÕc‘ù˙Á> fÿ≤–e<Œ|Ç0‡èEÃ\Çn=$dr®zAHL†Ú∫Xê Jä‰àüKU˚f’BÊürA§h⁄E—,}ˇ≤º˘ı	>A£IƒRﬁóZAò%©±·®≥MœxæY¬ÿ—0äêAaKË£m≠∆»èi∂A˙-s[Ÿ©S)Ô0mb’7Ñı#˛èçwõ…a¯åP:óËrëœ¢$vc4ó´FB‘+ÙπY+Ã¯§<4§r%*πO:·S§,øB8û]˝Ûwü˛¸›ˇ  ˇˇ ⁄Ns=