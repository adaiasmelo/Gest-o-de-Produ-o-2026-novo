import React, { useState, useMemo, useEffect } from 'react';
import { 
  X, Sparkles, AlertCircle, Calendar as CalendarIcon, User, Trash2, Edit2, 
  ChevronRight, CalendarDays, RefreshCw, CheckCircle2, UserPlus, Info,
  Search, ShieldAlert, ArrowRightLeft, HelpCircle, Columns, Filter, Check, ArrowLeft
} from 'lucide-react';
import { Employee, Vacation } from '../types';
import ConfirmDialog from './ConfirmDialog';

interface VacationPlanningProps {
  employees: Employee[];
  vacations: Vacation[];
  onSaveVacation: (vacation: Vacation) => Promise<void>;
  onDeleteVacation: (vacationId: string) => Promise<void>;
  onGeneratePlan: (generatedVacations: Vacation[]) => Promise<void>;
  onUpdateEmployee?: (employeeId: string, updates: Partial<Employee>) => Promise<void>;
  onClose: () => void;
  canManage: boolean;
}

// Helper to parse string dates (YYYY-MM-DD, DD/MM/YYYY or ISO)
function parseCustomDate(dateStr: any): Date | null {
  if (!dateStr) return null;
  if (dateStr instanceof Date) return dateStr;
  const str = String(dateStr).trim();
  if (!str) return null;

  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    const parts = str.split('-');
    return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
  }
  // DD/MM/YYYY
  if (/^\d{2}\/\d{2}\/\d{4}/.test(str)) {
    const parts = str.split('/');
    return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
  }

  const parsed = new Date(str);
  if (isNaN(parsed.getTime())) return null;
  return parsed;
}

function formatDateString(date: Date): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

// Calculate Venc do Periodo (Inicio Periodo + 1 ano)
function calculateVencPeriodo(inicioPeriodoStr: string): string {
  const date = parseCustomDate(inicioPeriodoStr);
  if (!date) return '';
  const newDate = new Date(date);
  newDate.setFullYear(newDate.getFullYear() + 1);
  return formatDateString(newDate);
}

// Calculate Data Limite Gozo (Venc do Periodo + 11 meses)
function calculateDataLimiteGozo(vencPeriodoStr: string): string {
  const date = parseCustomDate(vencPeriodoStr);
  if (!date) return '';
  const newDate = new Date(date);
  newDate.setMonth(newDate.getMonth() + 11);
  return formatDateString(newDate);
}

// Calculate Observação Prazo Gozo (Status do Prazo)
function calculatePrazoStatus(dataLimiteGozoStr: string): 'Vencido' | 'Crítico' | 'No Prazo' {
  const limitDate = parseCustomDate(dataLimiteGozoStr);
  if (!limitDate) return 'No Prazo';
  
  const currentDate = new Date();
  currentDate.setHours(0, 0, 0, 0);
  limitDate.setHours(0, 0, 0, 0);

  if (currentDate.getTime() > limitDate.getTime()) {
    return 'Vencido';
  }

  const diffTime = limitDate.getTime() - currentDate.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays <= 60) {
    return 'Crítico';
  }

  return 'No Prazo';
}

function getEmployeeField(emp: any, field: string): any {
  if (!emp) return undefined;
  if (field === 'inicioPeriodo') {
    return emp.inicioPeriodo ?? emp['Inicio Periodo'] ?? emp.inicio_periodo ?? emp.inicioAquisitivo ?? emp['Início Período'];
  }
  if (field === 'vencPeriodo') {
    return emp.vencPeriodo ?? emp['Venc do Periodo'] ?? emp.venc_periodo ?? emp.vencDoPeriodo ?? emp['Venc. Período'] ?? emp['Vencimento do Período'];
  }
  if (field === 'dataLimiteGozo') {
    return emp.dataLimiteGozo ?? emp['Data Limite Gozo'] ?? emp.data_limite_gozo ?? emp['Data Limite'] ?? emp.limiteGozo;
  }
  if (field === 'sldVenc') {
    return emp.sldVenc ?? emp['Sld Venc'] ?? emp.sld_venc ?? emp.saldoVencido ?? emp['Saldo Vencido'];
  }
  if (field === 'inicioGozoPrevisto') {
    return emp.inicioGozoPrevisto ?? emp['Inicio Gozo e Previsto'] ?? emp.inicio_gozo_previsto ?? emp.inicioGozo ?? emp['Início Gozo e Previsto'];
  }
  return emp[field];
}

function parseGozoMonth(gozo: any): number | null {
  if (!gozo) return null;
  if (typeof gozo === 'number') {
    if (gozo >= 1 && gozo <= 12) return gozo;
    return null;
  }
  const str = String(gozo).trim().toLowerCase();
  if (!str) return null;

  const num = parseInt(str);
  if (!isNaN(num) && num >= 1 && num <= 12) {
    return num;
  }

  if (str.includes('jan')) return 1;
  if (str.includes('fev')) return 2;
  if (str.includes('mar')) return 3;
  if (str.includes('abr')) return 4;
  if (str.includes('mai')) return 5;
  if (str.includes('jun')) return 6;
  if (str.includes('jul')) return 7;
  if (str.includes('ago')) return 8;
  if (str.includes('set')) return 9;
  if (str.includes('out')) return 10;
  if (str.includes('nov')) return 11;
  if (str.includes('dez')) return 12;

  const date = parseCustomDate(str);
  if (date) {
    return date.getMonth() + 1;
  }

  return null;
}

interface VacationMetrics {
  inicioPeriodo: string;
  vencPeriodo: string;
  dataLimiteGozo: string;
  sldVenc: number;
  prazoStatus: 'Vencido' | 'Crítico' | 'No Prazo';
}

function calculateEmployeeVacationMetrics(emp: Employee): VacationMetrics {
  const inicioPeriodoRaw = getEmployeeField(emp, 'inicioPeriodo');
  const inicioPeriodo = inicioPeriodoRaw ? String(inicioPeriodoRaw) : '';
  
  let vencPeriodo = '';
  let dataLimiteGozo = '';
  let prazoStatus: 'Vencido' | 'Crítico' | 'No Prazo' = 'No Prazo';
  
  if (inicioPeriodo) {
    const venc = calculateVencPeriodo(inicioPeriodo);
    vencPeriodo = venc;
    const limite = calculateDataLimiteGozo(venc);
    dataLimiteGozo = limite;
    prazoStatus = calculatePrazoStatus(limite);
  }

  const sldVencRaw = getEmployeeField(emp, 'sldVenc');
  const sldVenc = typeof sldVencRaw === 'number' ? sldVencRaw : (sldVencRaw ? parseInt(String(sldVencRaw)) || 0 : 0);

  return {
    inicioPeriodo,
    vencPeriodo,
    dataLimiteGozo,
    sldVenc,
    prazoStatus
  };
}

const formatDateToShow = (dateStr: string) => {
  if (!dateStr) return '';
  const parsed = parseCustomDate(dateStr);
  if (!parsed) return dateStr;
  const dd = String(parsed.getDate()).padStart(2, '0');
  const mm = String(parsed.getMonth() + 1).padStart(2, '0');
  const yyyy = parsed.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
};

const MONTHS = [
  { value: 1, name: 'Janeiro' },
  { value: 2, name: 'Fevereiro' },
  { value: 3, name: 'Março' },
  { value: 4, name: 'Abril' },
  { value: 5, name: 'Maio' },
  { value: 6, name: 'Junho' },
  { value: 7, name: 'Julho' },
  { value: 8, name: 'Agosto' },
  { value: 9, name: 'Setembro' },
  { value: 10, name: 'Outubro' },
  { value: 11, name: 'Novembro' },
  { value: 12, name: 'Dezembro' }
];

const getCanonicalSector = (secName: string | undefined | null): string => {
  if (!secName) return '';
  const normalized = secName.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, "");
  if (normalized === 'lideranca') return 'Liderança';
  if (normalized === 'extrusao') return 'Extrusão';
  if (normalized === 'reciclagem') return 'Reciclagem';
  if (normalized === 'fita') return 'Fita';
  return secName.trim();
};

export function VacationPlanning({
  employees,
  vacations,
  onSaveVacation,
  onDeleteVacation,
  onGeneratePlan,
  onUpdateEmployee,
  onClose,
  canManage
}: VacationPlanningProps) {
  // Configurações de Filtros e Visualização
  const [semesterFilter, setSemesterFilter] = useState<'all' | 'first' | 'second'>('all');
  const [selectedSectorFilter, setSelectedSectorFilter] = useState<string>('all');
  const [searchEmployeeName, setSearchEmployeeName] = useState<string>('');
  
  const [isEditingVacation, setIsEditingVacation] = useState<boolean>(false);
  const [editingVacationData, setEditingVacationData] = useState<Partial<Vacation> | null>(null);
  
  // Vacation Metrics states
  const [selectedEmpForScheduler, setSelectedEmpForScheduler] = useState<Employee | null>(null);
  const [formInicioPeriodo, setFormInicioPeriodo] = useState<string>('');
  const [formSldVenc, setFormSldVenc] = useState<number>(0);
  const [formInicioGozoPrevisto, setFormInicioGozoPrevisto] = useState<string>('');
  
  // Custom delete/action confirmations
  const [showConfirmDeleteId, setShowConfirmDeleteId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [addVacationTarget, setAddVacationTarget] = useState<{ sector: string; month: number } | null>(null);

  // Filter active employees who are actually currently on the shift grid
  const activeEmployees = useMemo(() => {
    return employees.filter(e => 
      e.status !== 'Vaga Excluída' && 
      e.status !== 'Desligado'
    );
  }, [employees]);

  // List of unique sectors present dynamically
  const sectors = useMemo(() => {
    const list = Array.from(new Set(activeEmployees.map(e => getCanonicalSector(e.sector)).filter(Boolean))) as string[];
    // Sort sectors alphabetically but keep Leadership/Liderança first if present
    return list.sort((a, b) => {
      const isLidA = a.toLowerCase().includes('lideran');
      const isLidB = b.toLowerCase().includes('lideran');
      if (isLidA && !isLidB) return -1;
      if (!isLidA && isLidB) return 1;
      return a.localeCompare(b);
    });
  }, [activeEmployees]);

  // Filas de meses ativos de acordo com a visualização do Semestre selecionado
  const activeMonths = useMemo(() => {
    if (semesterFilter === 'first') {
      return MONTHS.slice(0, 6);
    }
    if (semesterFilter === 'second') {
      return MONTHS.slice(6, 12);
    }
    return MONTHS;
  }, [semesterFilter]);

  // Filtra os setores a serem exibidos com base no filtro rápido de setores
  const filteredSectors = useMemo(() => {
    if (selectedSectorFilter === 'all') return sectors;
    return sectors.filter(s => s === selectedSectorFilter);
  }, [sectors, selectedSectorFilter]);

  // Group scheduled vacations by [Sector][Month] for high performance access
  const vacationsGrid = useMemo(() => {
    const grid: { [sector: string]: { [month: number]: Vacation[] } } = {};
    
    sectors.forEach(sec => {
      grid[sec] = {};
      MONTHS.forEach(m => {
        grid[sec][m.value] = [];
      });
    });

    // 1. Add scheduled vacations
    vacations.forEach(v => {
      // Encontra o setor e cargo atual do funcionário para garantir consistência visual
      const emp = activeEmployees.find(e => e.id === v.employeeId);
      const sectorToUse = emp?.sector || v.sector;
      const canonicalSec = getCanonicalSector(sectorToUse);
      if (v.year === 2026 && grid[canonicalSec]) {
        if (!grid[canonicalSec][v.month]) {
          grid[canonicalSec][v.month] = [];
        }
        grid[canonicalSec][v.month].push({
          ...v,
          sector: sectorToUse,
          role: emp?.role || v.role
        });
      }
    });

    // 2. Add virtual vacations from employee's `inicioGozoPrevisto` if they don't have a vacation in 2026 already
    const scheduledEmpIds = new Set(vacations.filter(v => v.year === 2026).map(v => v.employeeId));
    activeEmployees.forEach(emp => {
      if (scheduledEmpIds.has(emp.id)) return;

      const gozoField = getEmployeeField(emp, 'inicioGozoPrevisto');
      const month = parseGozoMonth(gozoField);
      const canonicalSec = getCanonicalSector(emp.sector);
      if (month && grid[canonicalSec]) {
        const startDate = `2026-${String(month).padStart(2, '0')}-01`;
        const endDate = `2026-${String(month).padStart(2, '0')}-30`;
        grid[canonicalSec][month].push({
          id: `virtual-${emp.id}`,
          employeeId: emp.id,
          employeeName: emp.name,
          registration: emp.registration || '',
          sector: emp.sector,
          role: emp.role,
          machine: emp.machine || 'Geral',
          shift: emp.shift || 'Integral',
          year: 2026,
          month: month,
          durationDays: 30,
          startDate,
          endDate,
          updatedAt: emp.updatedAt || new Date().toISOString()
        });
      }
    });

    return grid;
  }, [vacations, sectors, activeEmployees]);

  // Calculate stats
  const stats = useMemo(() => {
    const total = activeEmployees.length;
    const scheduledCount = vacations.filter(v => v.year === 2026).length;
    const unscheduledCount = total - scheduledCount;
    
    // Count violations: occurrences in a given sector and month where there is > 1 operator
    let violationsCount = 0;
    sectors.forEach(sec => {
      MONTHS.forEach(m => {
        const list = vacationsGrid[sec]?.[m.value] || [];
        const ops = list.filter(v => v.role.toLowerCase().includes('operador'));
        if (ops.length > 1) {
          violationsCount++;
        }
      });
    });

    return { total, scheduledCount, unscheduledCount, violationsCount };
  }, [activeEmployees, vacations, sectors, vacationsGrid]);

  // Carrega o exemplo de férias do PDF fornecido
  const handleLoadPdfExample = async () => {
    if (!canManage) return;
    if (!window.confirm('Deseja importar a matriz de férias de 2026 com base no anexo fornecido? Isso atualizará o cadastro de 27 colaboradores e as escalas de férias.')) {
      return;
    }
    setIsGenerating(true);
    try {
      const OFFICIAL_EMPLOYEES_DATA = [
        { name: "JOAO AUGUSTO CARVALHO DIAS", registration: "1801", role: "Auxiliar de Produção", sector: "Extrusão", inicioPeriodo: "2024-04-03", sldVenc: 22.5, gozoPrevisto: "2026-02-02", diasGozo: 30 },
        { name: "FABIO ANDRE BELCHIOR MATOS", registration: "1806", role: "Operador de Erema", sector: "Reciclagem", inicioPeriodo: "2024-04-22", sldVenc: 22.5, gozoPrevisto: "2026-02-02", diasGozo: 20 },
        { name: "ERIVAN FONTES DE SOUZA", registration: "1745", role: "Operador de Extrusora II", sector: "Extrusão", inicioPeriodo: "2024-05-12", sldVenc: 20, gozoPrevisto: "2026-03-02", diasGozo: 20 },
        { name: "LENO DA SILVA FERREIRA", registration: "1808", role: "Auxiliar de Produção", sector: "Extrusão", inicioPeriodo: "2024-05-22", sldVenc: 20, gozoPrevisto: "2026-04-06", diasGozo: 20 },
        { name: "JOCELAN FREIRE DE MENEZES", registration: "1833", role: "Operador de Erema", sector: "Reciclagem", inicioPeriodo: "2024-05-22", sldVenc: 20, gozoPrevisto: "2026-04-06", diasGozo: 20 },
        { name: "DEYWIS JUNIO SOUZA MENEZES", registration: "1607", role: "Operador de Extrusora I", sector: "Extrusão", inicioPeriodo: "2024-10-08", sldVenc: 7.5, gozoPrevisto: "2026-05-04", diasGozo: 20 },
        { name: "JOAO VITOR CARVALHO DE MORAES", registration: "1736", role: "Auxiliar de Produção", sector: "Extrusão", inicioPeriodo: "2024-10-18", sldVenc: 7.5, gozoPrevisto: "2026-06-01", diasGozo: 20 },
        { name: "MARCIO PONTES NEVES", registration: "1694", role: "Auxiliar de Produção", sector: "Extrusão", inicioPeriodo: "2024-10-20", sldVenc: 7.5, gozoPrevisto: "2026-07-01", diasGozo: 20 },
        { name: "ADRIANO BRASIL SARAIVA", registration: "1695", role: "Auxiliar de Produção", sector: "Extrusão", inicioPeriodo: "2024-11-03", sldVenc: 5, gozoPrevisto: "2026-07-06", diasGozo: 20 },
        { name: "CARLOS PHILLIP BATISTA DA SILVA", registration: "1698", role: "Operador de Extrusora I", sector: "Extrusão", inicioPeriodo: "2024-11-03", sldVenc: 5, gozoPrevisto: "2026-09-01", diasGozo: 20 },
        { name: "NAHIM VIEIRA DA SILVA", registration: "1704", role: "Operador de Extrusora I", sector: "Extrusão", inicioPeriodo: "2024-11-03", sldVenc: 5, gozoPrevisto: "", diasGozo: 0 },
        { name: "EDILSON DA SILVA BENTES", registration: "1662", role: "Operador de Extrusora I", sector: "Extrusão", inicioPeriodo: "2024-11-06", sldVenc: 5, gozoPrevisto: "2026-08-01", diasGozo: 20 },
        { name: "MARCELO DA SILVA CASTRO", registration: "1611", role: "Operador de Extrusora I", sector: "Extrusão", inicioPeriodo: "2024-11-08", sldVenc: 5, gozoPrevisto: "2026-09-03", diasGozo: 20 },
        { name: "CARLOS ALBERTO DUARTE DOS ANJOS", registration: "1828", role: "Auxiliar de Produção", sector: "Extrusão", inicioPeriodo: "2024-11-25", sldVenc: 5, gozoPrevisto: "2026-09-01", diasGozo: 20 },
        { name: "PAULO VITOR BARROS DE SOUZA", registration: "1827", role: "Auxiliar de Produção", sector: "Extrusão", inicioPeriodo: "2024-11-25", sldVenc: 5, gozoPrevisto: "2026-10-05", diasGozo: 20 },
        { name: "CIDONEIDE OLIVEIRA DE LIMA", registration: "1673", role: "Operador de Extrusora I", sector: "Extrusão", inicioPeriodo: "2025-02-10", sldVenc: 27.5, gozoPrevisto: "", diasGozo: 0 },
        { name: "ENDREY LIMA VIANA", registration: "1792", role: "Auxiliar de Produção", sector: "Extrusão", inicioPeriodo: "2025-02-19", sldVenc: 27.5, gozoPrevisto: "", diasGozo: 0 },
        { name: "ALESSANDRO DE BRITO MARQUES", registration: "1796", role: "Auxiliar de Produção", sector: "Extrusão", inicioPeriodo: "2025-03-11", sldVenc: 25, gozoPrevisto: "", diasGozo: 0 },
        { name: "EVERSON PEREIRA DA SILVA", registration: "1794", role: "Operador de Extrusora II", sector: "Extrusão", inicioPeriodo: "2025-03-11", sldVenc: 25, gozoPrevisto: "", diasGozo: 0 },
        { name: "JORGE BARBOSA OLIVEIRA", registration: "1795", role: "Operador I", sector: "Extrusão", inicioPeriodo: "2025-03-11", sldVenc: 25, gozoPrevisto: "", diasGozo: 0 },
        { name: "OEULER FERREIRA SOARES", registration: "1725", role: "Auxiliar de Produção", sector: "Extrusão", inicioPeriodo: "2025-03-11", sldVenc: 25, gozoPrevisto: "", diasGozo: 0 },
        { name: "NAZARENO SOUZA VITORIA", registration: "1798", role: "Auxiliar de Produção", sector: "Extrusão", inicioPeriodo: "2025-03-11", sldVenc: 25, gozoPrevisto: "", diasGozo: 0 },
        { name: "ADRIANO DA SILVA MACIEL", registration: "1834", role: "Auxiliar de Produção", sector: "Extrusão", inicioPeriodo: "2025-05-07", sldVenc: 20, gozoPrevisto: "", diasGozo: 0 },
        { name: "GILCIMAR CARLOS CORREA ARAUJO", registration: "1844", role: "Auxiliar de Produção", sector: "Extrusão", inicioPeriodo: "2025-08-20", sldVenc: 12.5, gozoPrevisto: "", diasGozo: 0 },
        { name: "ARINETO ALVES DE ANDRADE", registration: "1855", role: "Auxiliar de Produção", sector: "Extrusão", inicioPeriodo: "2025-10-27", sldVenc: 7.5, gozoPrevisto: "", diasGozo: 0 },
        { name: "DIONISON FONSECA CORREA", registration: "1856", role: "Auxiliar de Produção", sector: "Extrusão", inicioPeriodo: "2025-10-27", sldVenc: 7.5, gozoPrevisto: "", diasGozo: 0 },
        { name: "MARIO SANTOS DA SILVA JUNIOR", registration: "1857", role: "Auxiliar de Produção", sector: "Extrusão", inicioPeriodo: "2025-10-27", sldVenc: 7.5, gozoPrevisto: "", diasGozo: 0 }
      ];

      const generated: Vacation[] = [];

      for (const officialEmp of OFFICIAL_EMPLOYEES_DATA) {
        const normalizeStr = (str: string) => 
          str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

        const officialNormalized = normalizeStr(officialEmp.name);
        let matchedEmp = activeEmployees.find(e => {
          const empNormalized = normalizeStr(e.name);
          return empNormalized.includes(officialNormalized) || officialNormalized.includes(empNormalized);
        });

        let employeeId = '';
        let finalSector = officialEmp.sector;
        let finalRole = officialEmp.role;
        let finalMachine = 'Cast 1';
        let finalShift = 'Diurno 1';

        if (matchedEmp) {
          employeeId = matchedEmp.id;
          finalSector = matchedEmp.sector || officialEmp.sector;
          finalRole = matchedEmp.role || officialEmp.role;
          finalMachine = matchedEmp.machine || 'Cast 1';
          finalShift = matchedEmp.shift || 'Diurno 1';
        } else {
          // Criar colaborador se não existir (como o Adriano Brasil Saraiva)
          employeeId = `e-${officialEmp.registration}`;
          if (onUpdateEmployee) {
            await onUpdateEmployee(employeeId, {
              id: employeeId,
              registration: officialEmp.registration,
              name: officialEmp.name,
              role: officialEmp.role,
              sector: officialEmp.sector,
              machine: finalMachine,
              shift: finalShift,
              status: 'Ativo',
              updatedAt: new Date().toISOString()
            });
          }
        }

        const vencPeriodo = calculateVencPeriodo(officialEmp.inicioPeriodo);
        const dataLimiteGozo = calculateDataLimiteGozo(vencPeriodo);

        // Atualizar os dados de férias do colaborador no banco
        if (onUpdateEmployee) {
          await onUpdateEmployee(employeeId, {
            inicioPeriodo: officialEmp.inicioPeriodo,
            vencPeriodo,
            dataLimiteGozo,
            sldVenc: officialEmp.sldVenc,
            inicioGozoPrevisto: officialEmp.gozoPrevisto || ''
          });
        }

        // Se tem férias agendadas para 2026
        if (officialEmp.gozoPrevisto && officialEmp.diasGozo > 0) {
          const startObj = parseCustomDate(officialEmp.gozoPrevisto) || new Date(2026, 0, 1);
          const endObj = new Date(startObj.getTime() + (officialEmp.diasGozo - 1) * 24 * 60 * 60 * 1000);
          const endDateStr = formatDateString(endObj);
          const month = startObj.getMonth() + 1;

          generated.push({
            id: employeeId,
            employeeId,
            employeeName: officialEmp.name,
            registration: officialEmp.registration,
            sector: getCanonicalSector(finalSector),
            role: finalRole,
            machine: finalMachine,
            shift: finalShift,
            year: 2026,
            month,
            durationDays: officialEmp.diasGozo as 20 | 30,
            startDate: officialEmp.gozoPrevisto,
            endDate: endDateStr,
            updatedAt: new Date().toISOString()
          });
        }
      }

      await onGeneratePlan(generated);
      alert('Matriz de férias e cadastro de colaboradores atualizados com sucesso com base no anexo!');
    } catch (err) {
      console.error('Erro ao carregar modelo oficial:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  // Dynamic automatic baseline generator
  const runAutoGeneration = async (silent = false) => {
    if (!silent && !window.confirm('Deseja criar automaticamente a escala ideal de férias de todos os funcionários para 2026? Isso substituirá o planejamento atual.')) {
      return;
    }
    setIsGenerating(true);
    try {
      const generated: Vacation[] = [];
      
      // Let's group active employees by sector
      sectors.forEach(sec => {
        const secEmps = activeEmployees.filter(e => getCanonicalSector(e.sector) === sec);
        const operators = secEmps.filter(e => e.role.toLowerCase().includes('operador'));
        const others = secEmps.filter(e => !e.role.toLowerCase().includes('operador'));
        
        // 1. Distribute Operators (max 1 operator per month rule)
        let opMonth = 1;
        operators.forEach((op) => {
          const m = opMonth > 12 ? (opMonth % 12) || 12 : opMonth;
          const startDate = `2026-${String(m).padStart(2, '0')}-01`;
          const endDate = `2026-${String(m).padStart(2, '0')}-30`;
          
          generated.push({
            id: op.id,
            employeeId: op.id,
            employeeName: op.name,
            registration: op.registration || '',
            sector: op.sector,
            role: op.role,
            machine: op.machine || 'Geral',
            shift: op.shift || 'Integral',
            year: 2026,
            month: m,
            durationDays: 30,
            startDate,
            endDate,
            updatedAt: new Date().toISOString()
          });
          opMonth++;
        });

        // 2. Distribute non-operators evenly to avoid clustering
        let otherMonth = 1;
        others.forEach((emp) => {
          const m = otherMonth > 12 ? (otherMonth % 12) || 12 : otherMonth;
          const startDate = `2026-${String(m).padStart(2, '0')}-01`;
          const endDate = `2026-${String(m).padStart(2, '0')}-30`;
          
          generated.push({
            id: emp.id,
            employeeId: emp.id,
            employeeName: emp.name,
            registration: emp.registration || '',
            sector: emp.sector,
            role: emp.role,
            machine: emp.machine || 'Geral',
            shift: emp.shift || 'Integral',
            year: 2026,
            month: m,
            durationDays: 30,
            startDate,
            endDate,
            updatedAt: new Date().toISOString()
          });
          otherMonth++;
        });
      });

      await onGeneratePlan(generated);
    } catch (err) {
      console.error('Erro na autogeração de férias:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  // If no vacations are registered for 2026, generate immediately on mount
  useEffect(() => {
    const v2026 = vacations.filter(v => v.year === 2026);
    if (activeEmployees.length > 0 && v2026.length === 0 && !isGenerating && canManage) {
      runAutoGeneration(true);
    }
  }, [activeEmployees, vacations, canManage]);

  // Open Edit Dialog
  const startEditVacation = (vac: Vacation) => {
    if (!canManage) return;
    setEditingVacationData({ ...vac });
    
    const emp = activeEmployees.find(e => e.id === vac.employeeId);
    if (emp) {
      setFormInicioPeriodo(getEmployeeField(emp, 'inicioPeriodo') || '');
      setFormSldVenc(typeof getEmployeeField(emp, 'sldVenc') === 'number' ? getEmployeeField(emp, 'sldVenc') : 0);
      setFormInicioGozoPrevisto(String(getEmployeeField(emp, 'inicioGozoPrevisto') || vac.month));
    } else {
      setFormInicioPeriodo('');
      setFormSldVenc(0);
      setFormInicioGozoPrevisto(String(vac.month));
    }
    
    setIsEditingVacation(true);
  };

  const handleSaveEdit = async () => {
    if (!editingVacationData || !editingVacationData.id) return;
    
    const start = editingVacationData.startDate || '2026-01-01';
    const duration = editingVacationData.durationDays || 30;
    const startObj = parseCustomDate(start) || new Date(2026, 0, 1);
    const endObj = new Date(startObj.getTime() + (duration - 1) * 24 * 60 * 60 * 1000);
    const endStr = formatDateString(endObj);
    const targetMonth = editingVacationData.month || 1;
    const targetSector = getCanonicalSector(editingVacationData.sector || '');

    // Conflict validation check: MAX 1 OPERATOR per month/sector
    const isTargetOperator = (editingVacationData.role || '').toLowerCase().includes('operador');
    if (isTargetOperator && targetSector) {
      const existingVacs = vacationsGrid[targetSector]?.[targetMonth] || [];
      const existingOperatorVac = existingVacs.find(v => 
        v.role.toLowerCase().includes('operador') && 
        v.id !== editingVacationData.id && 
        v.employeeId !== editingVacationData.employeeId
      );
      if (existingOperatorVac) {
        alert("Não é possível alterar: Já existe um operador em férias neste setor para o mês de gozo selecionado. (Máximo de 1 operador em férias simultaneamente por setor produtivo).");
        return;
      }
    }

    const updated: Vacation = {
      ...editingVacationData as Vacation,
      endDate: endStr,
      updatedAt: new Date().toISOString()
    };

    try {
      // 1. Update Employee details in Firestore if onUpdateEmployee is supplied
      if (onUpdateEmployee && editingVacationData.employeeId) {
        let vencPeriodo = '';
        let dataLimiteGozo = '';
        if (formInicioPeriodo) {
          vencPeriodo = calculateVencPeriodo(formInicioPeriodo);
          dataLimiteGozo = calculateDataLimiteGozo(vencPeriodo);
        }
        await onUpdateEmployee(editingVacationData.employeeId, {
          inicioPeriodo: formInicioPeriodo,
          vencPeriodo,
          dataLimiteGozo,
          sldVenc: formSldVenc,
          inicioGozoPrevisto: formInicioGozoPrevisto || String(targetMonth)
        });
      }

      // 2. Save vacation details
      await onSaveVacation(updated);
      setIsEditingVacation(false);
      setEditingVacationData(null);
    } catch (err) {
      console.error(err);
    }
  };

  // Delete/Removal handling (ConfirmDialog used below)
  const handleConfirmDelete = async () => {
    if (!showConfirmDeleteId) return;
    try {
      await onDeleteVacation(showConfirmDeleteId);
      setShowConfirmDeleteId(null);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <>
      <div className="bg-white border border-slate-200 rounded-[2.5rem] w-full flex flex-col overflow-hidden shadow-xl animate-in fade-in duration-500 text-slate-800">
        
        {/* TOP COMPONENT: Executive Glassmorphic Header */}
        <div className="px-8 py-5 border-b border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-slate-50/50">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-violet-50 rounded-2xl flex items-center justify-center text-violet-600 border border-violet-100 shadow-sm">
              <CalendarDays size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-extrabold text-slate-900 uppercase tracking-tight">Painel de Férias 2026</h2>
                <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase">Ativo</span>
              </div>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.15em] mt-0.5">Gestão de escalas integrada por setores & prevenção de conflitos</p>
            </div>
          </div>

          {/* Controls & Quick Info Dashboard */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Semester Switch Tab */}
            <div className="bg-slate-100 border border-slate-200 rounded-xl p-1 flex items-center gap-1">
              <button 
                onClick={() => setSemesterFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${semesterFilter === 'all' ? 'bg-violet-600 text-white shadow' : 'text-slate-500 hover:text-slate-900'}`}
              >
                Ano Completo
              </button>
              <button 
                onClick={() => setSemesterFilter('first')}
                className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${semesterFilter === 'first' ? 'bg-violet-600 text-white shadow' : 'text-slate-500 hover:text-slate-900'}`}
              >
                1º Semestre
              </button>
              <button 
                onClick={() => setSemesterFilter('second')}
                className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${semesterFilter === 'second' ? 'bg-violet-600 text-white shadow' : 'text-slate-500 hover:text-slate-900'}`}
              >
                2º Semestre
              </button>
            </div>

            {/* Quick stats tags */}
            <div className="bg-white border border-slate-200 px-3.5 py-2 rounded-xl flex items-center gap-2 shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
              <div className="leading-none">
                <p className="text-[10px] font-extrabold text-slate-700 uppercase">{stats.scheduledCount} / {stats.total} Agendados</p>
              </div>
            </div>

            {stats.violationsCount > 0 && (
              <div className="bg-red-50 border border-red-100 px-3.5 py-2 rounded-xl flex items-center gap-2 animate-pulse">
                <AlertCircle className="text-red-500" size={13} />
                <div className="leading-none">
                  <p className="text-[10px] font-extrabold text-red-600 uppercase">{stats.violationsCount} Conflitos</p>
                </div>
              </div>
            )}





            <button 
              onClick={onClose}
              className="px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 hover:text-slate-900 rounded-xl transition-all cursor-pointer flex items-center gap-2 text-[10px] font-black uppercase tracking-wider shadow-sm"
            >
              <ArrowLeft size={14} />
              Voltar
            </button>
          </div>
        </div>

        {/* QUICK SUBBAR: Live Search & Sector Filters */}
        <div className="px-8 py-3.5 border-b border-slate-200 bg-slate-50/50 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
              <Filter size={12} /> Filtros Rápidos:
            </span>
            
            {/* Sector Selector */}
            <select
              value={selectedSectorFilter}
              onChange={(e) => setSelectedSectorFilter(e.target.value)}
              className="bg-white border border-slate-200 text-xs text-slate-700 rounded-xl px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-violet-500 font-bold uppercase cursor-pointer shadow-sm"
            >
              <option value="all">TODOS OS SETORES</option>
              {sectors.map(s => (
                <option key={s} value={s}>{s.toUpperCase()}</option>
              ))}
            </select>
          </div>

          {/* Base Rule Highlight bar */}
          <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase">
            <div className="w-2 h-2 rounded-full bg-violet-500 shadow-sm animate-pulse" />
            <span>Regra: Máximo de 1 operador em férias simultaneamente por setor produtivo.</span>
          </div>
        </div>

        {/* MAIN BODY CONTAINER */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 bg-slate-50">
          {filteredSectors.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400">
              <Info size={36} className="mb-2 text-slate-300 animate-pulse" />
              <p className="text-xs font-black uppercase tracking-widest text-slate-400">Nenhum setor disponível</p>
              <p className="text-[10px] text-slate-500 mt-1 uppercase">Cadastre colaboradores no Menu Principal da tela de Pessoal.</p>
            </div>
          ) : (
            <div className="w-full inline-block align-middle">
              {/* Matrix Board */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-lg">
                <table className="w-full divide-y divide-slate-200 table-fixed">
                  {/* Columns Header (Months) */}
                  <thead className="bg-slate-100 sticky top-0 z-10">
                    <tr className="border-b border-slate-200">
                      <th scope="col" className="px-3 py-3 text-left text-[9px] font-black uppercase tracking-wider text-slate-600 w-32 border-r border-slate-200">
                        Setores
                      </th>
                      {activeMonths.map(m => (
                        <th key={m.value} scope="col" className="px-1 py-3 text-center text-[9px] font-black uppercase tracking-wider text-slate-600 border-r border-slate-200/60 last:border-r-0">
                          {m.name.substring(0, 3)}
                        </th>
                      ))}
                    </tr>
                  </thead>

                  {/* Sector Rows */}
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {filteredSectors.map(sec => {
                      const totalSecEmps = activeEmployees.filter(e => getCanonicalSector(e.sector) === sec).length;
                      return (
                        <tr key={sec} className="hover:bg-slate-50/50 transition-colors">
                          {/* Left Row Header: Sector visual card */}
                          <td className="px-3 py-3 align-middle whitespace-nowrap bg-slate-50/30 border-r border-slate-200">
                            <div className="flex flex-col">
                              <span className="text-[10px] font-black text-slate-800 uppercase tracking-wide block truncate max-w-[110px]" title={sec}>
                                {sec}
                              </span>
                              <div className="flex items-center gap-1 mt-0.5">
                                <span className="w-1 h-1 rounded-full bg-violet-500" />
                                <span className="text-[8px] text-slate-500 font-extrabold uppercase tracking-tight">
                                  {totalSecEmps} {totalSecEmps === 1 ? 'Colab.' : 'Colabs.'}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Dynamic Month Cells */}
                          {activeMonths.map(m => {
                            const list = vacationsGrid[sec]?.[m.value] || [];
                            const operators = list.filter(v => v.role.toLowerCase().includes('operador'));
                            const hasViolation = operators.length > 1;

                            return (
                              <td 
                                key={m.value}
                                className={`p-1 align-top transition-all border-r border-slate-200/60 last:border-r-0 min-h-[120px] relative ${hasViolation ? 'bg-red-50/40' : ''}`}
                              >
                                <div className="flex flex-col gap-1 h-full justify-between min-h-[80px]">
                                  
                                  {/* Inner cells elements */}
                                  <div className="flex flex-col gap-1">
                                    {list.length === 0 ? (
                                      <div className="text-center py-3 text-slate-400 border border-dashed border-slate-200 rounded-lg bg-slate-50/50 select-none text-[7.5px] font-black uppercase tracking-wider">
                                        Vago
                                      </div>
                                    ) : (
                                      list.map(vac => {
                                        const emp = activeEmployees.find(e => e.id === vac.employeeId);
                                        const metrics = emp ? calculateEmployeeVacationMetrics(emp) : null;
                                        const isVencido = metrics?.prazoStatus === 'Vencido';
                                        const isCritico = metrics?.prazoStatus === 'Crítico';
                                        const isVirtual = (vac as any).isVirtual;
                                        const isOperator = vac.role.toLowerCase().includes('operador');

                                        return (
                                          <div
                                            key={vac.id}
                                            className={`group relative rounded-lg p-1.5 border text-left transition-all hover:scale-[1.02] ${
                                              isVencido
                                                ? 'bg-red-50 hover:bg-red-100/90 border-red-300 text-red-950 shadow ring-1 ring-red-500'
                                                : isCritico
                                                ? 'bg-amber-50 hover:bg-amber-100/90 border-amber-300 text-amber-950 shadow ring-1 ring-amber-500'
                                                : isVirtual
                                                ? 'bg-purple-50 hover:bg-purple-100 border-purple-200 text-purple-900 shadow-sm border-dashed'
                                                : isOperator 
                                                ? 'bg-blue-50 hover:bg-blue-100/80 border-blue-200 text-blue-900 shadow-sm' 
                                                : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-800 shadow-sm'
                                            }`}
                                          >
                                            {/* Badge Info */}
                                            <div className="flex flex-col gap-0.5 mb-1">
                                              <div className="flex items-center gap-0.5 flex-wrap">
                                                <span className={`text-[6px] font-black px-0.5 py-0.2 rounded uppercase ${
                                                  isVencido ? 'bg-red-600 text-white border border-red-700' :
                                                  isCritico ? 'bg-amber-600 text-white border border-amber-700' :
                                                  isVirtual ? 'bg-purple-600 text-white border border-purple-700' :
                                                  isOperator 
                                                    ? 'bg-blue-600 text-white border border-blue-500' 
                                                    : 'bg-slate-200 text-slate-700 border border-slate-300'
                                                }`}>
                                                  {isOperator ? 'OPE' : 'AUX'}
                                                </span>
                                                {isVencido && (
                                                  <span className="text-[5.5px] font-black px-0.5 py-0.2 rounded uppercase bg-red-700 text-white border border-red-800">
                                                    VENC
                                                  </span>
                                                )}
                                                {isCritico && (
                                                  <span className="text-[5.5px] font-black px-0.5 py-0.2 rounded uppercase bg-amber-700 text-white border border-amber-800 animate-pulse">
                                                    CRIT
                                                  </span>
                                                )}
                                                {isVirtual && (
                                                  <span className="text-[5.5px] font-black px-0.5 py-0.2 rounded uppercase bg-purple-700 text-white border border-purple-800">
                                                    PREV
                                                  </span>
                                                )}
                                              </div>
                                              <span className={`text-[6px] font-black px-0.5 py-0.2 rounded border w-max ${
                                                isVencido ? 'text-red-700 bg-white border-red-200' :
                                                isCritico ? 'text-amber-700 bg-white border-amber-200' :
                                                isOperator ? 'text-blue-600 bg-white border-blue-100' : 'text-slate-600 bg-white border-slate-200'
                                              }`}>
                                                {vac.durationDays}d
                                              </span>
                                            </div>
 
                                            {/* Name */}
                                            <h4 className="text-[8.5px] font-extrabold truncate max-w-[80px] leading-tight text-slate-900 uppercase animate-pulse-once" title={vac.employeeName}>
                                              {vac.employeeName}
                                            </h4>
                                            
                                            {/* Dates */}
                                            <p className="text-[7.5px] font-bold text-slate-500 mt-0.5">
                                              {vac.startDate.split('-')[2]}/{vac.startDate.split('-')[1]} a {vac.endDate.split('-')[2]}/{vac.endDate.split('-')[1]}
                                            </p>

                                            {/* Employee Vacation Metrics Detail */}
                                            {metrics && metrics.inicioPeriodo && (
                                              <div className="mt-0.5 pt-0.5 border-t border-slate-200/50 space-y-0.2 text-[6.5px] font-bold text-slate-500 uppercase">
                                                <p>Aq: {formatDateToShow(metrics.inicioPeriodo).substring(0, 5)}</p>
                                                <p className={isVencido ? 'text-red-700 font-black' : isCritico ? 'text-amber-700 font-black' : ''}>
                                                  Lim: {formatDateToShow(metrics.dataLimiteGozo).substring(0, 5)}
                                                </p>
                                                {metrics.sldVenc > 0 && (
                                                  <p className="text-red-700 font-black bg-red-100/50 px-0.5 py-0.2 rounded inline-block">Sld: {metrics.sldVenc}d</p>
                                                )}
                                              </div>
                                            )}
 
                                            {/* Action triggers hover */}
                                            {canManage && !isVirtual && (
                                              <div className="absolute right-0.5 top-0.5 hidden group-hover:flex items-center gap-0.5 bg-white border border-slate-200 rounded p-0.2 shadow-md">
                                                <button 
                                                  onClick={() => startEditVacation(vac)}
                                                  className="p-0.5 hover:bg-slate-100 rounded text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
                                                  title="Ajustar Período"
                                                >
                                                  <Edit2 size={8} />
                                                </button>
                                                <button 
                                                  onClick={() => setShowConfirmDeleteId(vac.id)}
                                                  className="p-0.5 hover:bg-red-50 rounded text-slate-500 hover:text-red-600 transition-colors cursor-pointer"
                                                  title="Remover Férias"
                                                >
                                                  <Trash2 size={8} />
                                                </button>
                                              </div>
                                            )}
                                          </div>
                                        );
                                      })
                                    )}

                                    {/* Conflict Notice inside cell */}
                                    {hasViolation && (
                                      <div className="bg-red-50 border border-red-200 text-red-600 text-[7px] font-black uppercase tracking-tight p-1 rounded flex items-center gap-0.5 animate-pulse">
                                        <ShieldAlert size={8} className="shrink-0" />
                                        <span>Conflito: +1 Op</span>
                                      </div>
                                    )}
                                  </div>

                                  {/* Add button inside cell */}
                                  {canManage && (
                                    <button
                                      onClick={() => setAddVacationTarget({ sector: sec, month: m.value })}
                                      className="mt-1 w-full py-1.5 bg-slate-50 hover:bg-slate-100 border border-dashed border-slate-200 hover:border-slate-300 text-slate-500 hover:text-slate-700 rounded-lg text-[8px] font-black uppercase flex items-center justify-center gap-1 transition-all cursor-pointer"
                                      title="Agendar colaborador neste mês"
                                    >
                                      <UserPlus size={9} />
                                      Agendar
                                    </button>
                                  )}

                                </div>
                              </td>
                            );
                          })}

                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

      </div>

      {/* MODAL: Add Vacation Quick Scheduler */}
      {addVacationTarget && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[60] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-[2rem] p-6 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <UserPlus size={20} className="text-violet-600" />
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                  {selectedEmpForScheduler ? 'Configurar Férias' : 'Agendar Colaborador'}
                </h3>
              </div>
              <button 
                onClick={() => {
                  setAddVacationTarget(null);
                  setSelectedEmpForScheduler(null);
                }} 
                className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-800 transition-all cursor-pointer border border-transparent hover:border-slate-200"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
                <p className="text-[9px] text-slate-500 font-black uppercase">Destino</p>
                <p className="text-xs font-bold text-slate-800 uppercase mt-0.5">
                  Setor: {addVacationTarget.sector} • Mês: {MONTHS.find(m => m.value === addVacationTarget.month)?.name}
                </p>
              </div>

              {!selectedEmpForScheduler ? (
                <div>
                  <label className="block text-[9px] font-black uppercase text-slate-500 tracking-wider mb-2">Selecione um colaborador do setor sem férias programadas em 2026:</label>
                  <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                    {(() => {
                      const scheduledIds = new Set(vacations.filter(v => v.year === 2026).map(v => v.employeeId));
                      const eligibleEmps = activeEmployees.filter(e => 
                        getCanonicalSector(e.sector) === getCanonicalSector(addVacationTarget.sector) && 
                        !scheduledIds.has(e.id)
                      );

                      if (eligibleEmps.length === 0) {
                        return (
                          <p className="text-center py-4 text-xs font-bold text-slate-500 uppercase">
                            Todos os colaboradores deste setor já estão agendados!
                          </p>
                        );
                      }

                      return eligibleEmps.map(emp => {
                        const isOperator = emp.role.toLowerCase().includes('operador');
                        return (
                          <button
                            key={emp.id}
                            onClick={() => {
                              setSelectedEmpForScheduler(emp);
                              // Initialize local form states
                              const initPer = getEmployeeField(emp, 'inicioPeriodo') || '';
                              setFormInicioPeriodo(initPer);
                              setFormSldVenc(typeof getEmployeeField(emp, 'sldVenc') === 'number' ? getEmployeeField(emp, 'sldVenc') : 0);
                              setFormInicioGozoPrevisto(String(addVacationTarget.month));
                            }}
                            className={`w-full text-left bg-white hover:bg-slate-50 border border-slate-200 hover:border-violet-500 rounded-xl p-3 transition-all flex items-center justify-between group cursor-pointer ${
                              isOperator ? 'border-l-4 border-l-blue-500' : 'border-l-4 border-l-slate-400'
                            }`}
                          >
                            <div>
                              <p className="text-xs font-black text-slate-800 group-hover:text-violet-600 transition-colors uppercase">{emp.name}</p>
                              <p className="text-[9px] text-slate-500 font-bold uppercase tracking-tight mt-0.5">{emp.role}</p>
                            </div>
                            <ChevronRight size={14} className="text-slate-400 group-hover:text-violet-600 group-hover:translate-x-1 transition-all" />
                          </button>
                        );
                      });
                    })()}
                  </div>
                </div>
              ) : (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div className="bg-violet-50/50 border border-violet-100 rounded-xl px-4 py-3">
                    <p className="text-[9px] text-violet-600 font-black uppercase">Colaborador Selecionado</p>
                    <p className="text-xs font-bold text-slate-800 uppercase mt-0.5">{selectedEmpForScheduler.name}</p>
                    <p className="text-[9px] text-slate-500 font-bold uppercase mt-0.5">{selectedEmpForScheduler.role}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[9px] font-black uppercase text-slate-500 tracking-wider mb-1">Início Período Aquisitivo</label>
                      <input 
                        type="date"
                        value={formInicioPeriodo}
                        onChange={(e) => setFormInicioPeriodo(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 text-xs font-bold focus:ring-1 focus:ring-violet-500 outline-none text-left"
                      />
                    </div>

                    <div>
                      <label className="block text-[9px] font-black uppercase text-slate-500 tracking-wider mb-1">Saldo Vencido (Dias)</label>
                      <input 
                        type="number"
                        min="0"
                        value={formSldVenc}
                        onChange={(e) => setFormSldVenc(parseInt(e.target.value) || 0)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 text-xs font-bold focus:ring-1 focus:ring-violet-500 outline-none text-left"
                      />
                    </div>
                  </div>

                  {formInicioPeriodo && (
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2">
                      <div className="flex justify-between items-center text-[10px] font-bold text-slate-600 uppercase">
                        <span>Fim do Período (Venc.):</span>
                        <span className="text-slate-900 font-black">{formatDateToShow(calculateVencPeriodo(formInicioPeriodo))}</span>
                      </div>
                      <div className="flex justify-between items-center text-[10px] font-bold text-slate-600 uppercase">
                        <span>Data Limite de Gozo:</span>
                        <span className="text-slate-900 font-black">{formatDateToShow(calculateDataLimiteGozo(calculateVencPeriodo(formInicioPeriodo)))}</span>
                      </div>
                      
                      {(() => {
                        const lim = calculateDataLimiteGozo(calculateVencPeriodo(formInicioPeriodo));
                        const status = calculatePrazoStatus(lim);
                        return (
                          <div className="flex justify-between items-center text-[10px] font-bold text-slate-600 uppercase">
                            <span>Status do Prazo:</span>
                            <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase ${
                              status === 'Vencido' ? 'bg-red-100 text-red-700 border border-red-200' :
                              status === 'Crítico' ? 'bg-amber-100 text-amber-700 border border-amber-200 animate-pulse' :
                              'bg-green-100 text-green-700 border border-green-200'
                            }`}>
                              {status === 'Vencido' ? 'VENCIDO' : status === 'Crítico' ? 'CRÍTICO' : 'NO PRAZO'}
                            </span>
                          </div>
                        );
                      })()}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[9px] font-black uppercase text-slate-500 tracking-wider mb-1">Duração</label>
                      <select 
                        id="new-vacation-duration"
                        defaultValue={30}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 text-xs font-bold focus:ring-1 focus:ring-violet-500 outline-none cursor-pointer"
                      >
                        <option value={20}>20 Dias</option>
                        <option value={30}>30 Dias</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[9px] font-black uppercase text-slate-500 tracking-wider mb-1">Dia de Início</label>
                      <input 
                        type="date"
                        id="new-vacation-start-date"
                        defaultValue={`2026-${String(addVacationTarget.month).padStart(2, '0')}-01`}
                        min={`2026-${String(addVacationTarget.month).padStart(2, '0')}-01`}
                        max={`2026-${String(addVacationTarget.month).padStart(2, '0')}-28`}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 text-xs font-bold focus:ring-1 focus:ring-violet-500 outline-none text-left"
                      />
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex justify-end gap-3">
                    <button
                      onClick={() => setSelectedEmpForScheduler(null)}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer border border-slate-200"
                    >
                      Voltar
                    </button>
                    <button
                      onClick={async () => {
                        const durationSelect = document.getElementById('new-vacation-duration') as HTMLSelectElement;
                        const dateInput = document.getElementById('new-vacation-start-date') as HTMLInputElement;
                        
                        const duration = durationSelect ? parseInt(durationSelect.value) : 30;
                        const startDate = dateInput ? dateInput.value : `2026-${String(addVacationTarget.month).padStart(2, '0')}-01`;
                        
                        const startObj = parseCustomDate(startDate) || new Date(2026, addVacationTarget.month - 1, 1);
                        const endObj = new Date(startObj.getTime() + (duration - 1) * 24 * 60 * 60 * 1000);
                        const endDate = formatDateString(endObj);

                        // Check conflict validation
                        const isTargetOperator = selectedEmpForScheduler.role.toLowerCase().includes('operador');
                        const targetSectorCanonical = getCanonicalSector(addVacationTarget.sector);
                        if (isTargetOperator) {
                          const existingVacs = vacationsGrid[targetSectorCanonical]?.[addVacationTarget.month] || [];
                          const existingOperatorVac = existingVacs.find(v => v.role.toLowerCase().includes('operador'));
                          if (existingOperatorVac) {
                            alert("Não é possível agendar: Já existe um operador em férias neste setor e mês. (Máximo de 1 operador em férias simultaneamente por setor produtivo).");
                            return;
                          }
                        }

                        // 1. Update employee in DB
                        if (onUpdateEmployee) {
                          let vencPeriodo = '';
                          let dataLimiteGozo = '';
                          if (formInicioPeriodo) {
                            vencPeriodo = calculateVencPeriodo(formInicioPeriodo);
                            dataLimiteGozo = calculateDataLimiteGozo(vencPeriodo);
                          }
                          await onUpdateEmployee(selectedEmpForScheduler.id, {
                            inicioPeriodo: formInicioPeriodo,
                            vencPeriodo,
                            dataLimiteGozo,
                            sldVenc: formSldVenc,
                            inicioGozoPrevisto: formInicioGozoPrevisto || String(addVacationTarget.month)
                          });
                        }

                        // 2. Save vacation
                        await onSaveVacation({
                          id: selectedEmpForScheduler.id,
                          employeeId: selectedEmpForScheduler.id,
                          employeeName: selectedEmpForScheduler.name,
                          registration: selectedEmpForScheduler.registration || '',
                          sector: targetSectorCanonical,
                          role: selectedEmpForScheduler.role,
                          machine: selectedEmpForScheduler.machine || 'Geral',
                          shift: selectedEmpForScheduler.shift || 'Integral',
                          year: 2026,
                          month: addVacationTarget.month,
                          durationDays: duration as any,
                          startDate,
                          endDate,
                          updatedAt: new Date().toISOString()
                        });

                        setAddVacationTarget(null);
                        setSelectedEmpForScheduler(null);
                      }}
                      className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-[10px] font-black uppercase tracking-wider rounded-xl shadow-md transition-all cursor-pointer"
                    >
                      Confirmar Agendamento
                    </button>
                  </div>
                </div>
              )}

              {!selectedEmpForScheduler && (
                <div className="pt-3 border-t border-slate-100 flex justify-end">
                  <button
                    onClick={() => setAddVacationTarget(null)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer border border-slate-200"
                  >
                    Fechar
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Adjust/Edit details */}
      {isEditingVacation && editingVacationData && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-[2rem] p-6 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <CalendarDays size={20} className="text-violet-600" />
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">Ajustar Período de Férias</h3>
              </div>
              <button onClick={() => { setIsEditingVacation(false); setEditingVacationData(null); }} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-800 transition-all cursor-pointer border border-transparent hover:border-slate-200">
                <X size={16} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[9px] font-black uppercase text-slate-500 tracking-wider mb-1">Colaborador</label>
                <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 font-bold text-xs uppercase">
                  {editingVacationData.employeeName}
                  <p className="text-[9px] text-slate-500 font-bold uppercase tracking-tight mt-0.5">{editingVacationData.role} • {editingVacationData.sector}</p>
                </div>
              </div>

              {/* Real-time calculated Excel business fields */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[9px] font-black uppercase text-slate-500 tracking-wider mb-1">Início Período Aquisitivo</label>
                  <input 
                    type="date"
                    value={formInicioPeriodo}
                    onChange={(e) => setFormInicioPeriodo(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 text-xs font-bold focus:ring-1 focus:ring-violet-500 outline-none text-left"
                  />
                </div>

                <div>
                  <label className="block text-[9px] font-black uppercase text-slate-500 tracking-wider mb-1">Saldo Vencido (Dias)</label>
                  <input 
                    type="number"
                    min="0"
                    value={formSldVenc}
                    onChange={(e) => setFormSldVenc(parseInt(e.target.value) || 0)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 text-xs font-bold focus:ring-1 focus:ring-violet-500 outline-none text-left"
                  />
                </div>
              </div>

              {formInicioPeriodo && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2">
                  <div className="flex justify-between items-center text-[10px] font-bold text-slate-600 uppercase">
                    <span>Fim do Período (Venc.):</span>
                    <span className="text-slate-900 font-black">{formatDateToShow(calculateVencPeriodo(formInicioPeriodo))}</span>
                  </div>
                  <div className="flex justify-between items-center text-[10px] font-bold text-slate-600 uppercase">
                    <span>Data Limite de Gozo:</span>
                    <span className="text-slate-900 font-black">{formatDateToShow(calculateDataLimiteGozo(calculateVencPeriodo(formInicioPeriodo)))}</span>
                  </div>
                  
                  {(() => {
                    const lim = calculateDataLimiteGozo(calculateVencPeriodo(formInicioPeriodo));
                    const status = calculatePrazoStatus(lim);
                    return (
                      <div className="flex justify-between items-center text-[10px] font-bold text-slate-600 uppercase">
                        <span>Status do Prazo:</span>
                        <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase ${
                          status === 'Vencido' ? 'bg-red-100 text-red-700 border border-red-200' :
                          status === 'Crítico' ? 'bg-amber-100 text-amber-700 border border-amber-200 animate-pulse' :
                          'bg-green-100 text-green-700 border border-green-200'
                        }`}>
                          {status === 'Vencido' ? 'VENCIDO' : status === 'Crítico' ? 'CRÍTICO' : 'NO PRAZO'}
                        </span>
                      </div>
                    );
                  })()}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[9px] font-black uppercase text-slate-500 tracking-wider mb-1">Duração</label>
                  <select 
                    value={editingVacationData.durationDays}
                    onChange={(e) => setEditingVacationData({ ...editingVacationData, durationDays: parseInt(e.target.value) as 20 | 30 })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 text-xs font-bold focus:ring-1 focus:ring-violet-500 outline-none cursor-pointer"
                  >
                    <option value={20} className="bg-white text-slate-800">20 Dias</option>
                    <option value={30} className="bg-white text-slate-800">30 Dias</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[9px] font-black uppercase text-slate-500 tracking-wider mb-1">Mês Base</label>
                  <select 
                    value={editingVacationData.month}
                    onChange={(e) => {
                      const m = parseInt(e.target.value);
                      const currentStart = editingVacationData.startDate || '2026-01-01';
                      const day = currentStart.split('-')[2] || '01';
                      setEditingVacationData({ 
                        ...editingVacationData, 
                        month: m,
                        startDate: `2026-${String(m).padStart(2, '0')}-${day}`
                      });
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 text-xs font-bold focus:ring-1 focus:ring-violet-500 outline-none cursor-pointer"
                  >
                    {MONTHS.map(m => (
                      <option key={m.value} value={m.value} className="bg-white text-slate-800">{m.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[9px] font-black uppercase text-slate-500 tracking-wider mb-1">Data de Início</label>
                <input 
                  type="date"
                  value={editingVacationData.startDate}
                  min="2026-01-01"
                  max="2026-12-31"
                  onChange={(e) => {
                    const start = e.target.value;
                    const month = parseInt(start.split('-')[1]) || 1;
                    setEditingVacationData({ ...editingVacationData, startDate: start, month });
                  }}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 text-xs font-bold focus:ring-1 focus:ring-violet-500 outline-none text-left"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-3">
                <button
                  onClick={() => { setIsEditingVacation(false); setEditingVacationData(null); }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer border border-slate-200"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveEdit}
                  className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-[10px] font-black uppercase tracking-wider rounded-xl shadow-md transition-all cursor-pointer"
                >
                  Confirmar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Strict Confirmation of Deletion */}
      {showConfirmDeleteId && (
        <ConfirmDialog
          isOpen={true}
          title="Confirmar Exclusão de Férias"
          message="Tem certeza de que deseja remover esta programação de férias? Ao confirmar, esta informação será excluída definitivamente de todo o sistema e dos bancos de dados."
          onConfirm={handleConfirmDelete}
          onClose={() => setShowConfirmDeleteId(null)}
          confirmText="Confirmar"
          cancelText="Cancelar"
        />
      )}

    </>
  );
}
