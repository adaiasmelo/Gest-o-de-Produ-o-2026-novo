import React, { useState, useEffect, useMemo } from 'react';
import { 
  Tv, Maximize2, Minimize2, Play, Pause, ChevronLeft, ChevronRight, 
  Trophy, TrendingUp, Target, Calendar, Clock, Activity, 
  Award, BarChart3, Factory, RefreshCw, X, Sliders, Flame, Users,
  ArrowUpRight, ArrowDownRight, TrendingDown
} from 'lucide-react';
import { 
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis, 
  Tooltip, CartesianGrid, Legend, PieChart, Pie, Cell 
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { ProductionEntry, RibbonCuttingEntry, Collaborator } from '../types';

interface ProjectionDashboardProps {
  productionData: ProductionEntry[];
  ribbonEntries: RibbonCuttingEntry[];
  goals: Record<string, number>;
  dashboardMonth: string; // YYYY-MM
  collaborators: Collaborator[];
  systemName: string;
  systemLogo?: string;
  onClose: () => void;
}

export const ProjectionDashboard: React.FC<ProjectionDashboardProps> = ({
  productionData,
  ribbonEntries,
  goals,
  dashboardMonth,
  collaborators,
  systemName,
  systemLogo,
  onClose,
}) => {
  // States for controls
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentSlide, setCurrentSlide] = useState<number>(0);
  const [isAutoPlay, setIsAutoPlay] = useState<boolean>(true);
  const [slideDuration, setSlideDuration] = useState<number>(30); // Default 30s
  const [timeRemaining, setTimeRemaining] = useState<number>(30);
  const [viewMode, setViewMode] = useState<'slides' | 'grid'>('slides');
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  // Clock tick
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fullscreen & Key listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Esc') {
        if (document.fullscreenElement) {
          document.exitFullscreen().catch(() => {});
        }
        setIsFullscreen(false);
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement && !isFullscreen) {
        if (document.documentElement.requestFullscreen) {
          await document.documentElement.requestFullscreen();
        } else {
          setIsFullscreen(true);
        }
      } else {
        if (document.fullscreenElement) {
          await document.exitFullscreen();
        }
        setIsFullscreen(false);
      }
    } catch (e) {
      console.warn('Erro ao alternar tela cheia:', e);
      setIsFullscreen((prev) => !prev);
    }
  };

  // Auto-play slides logic
  useEffect(() => {
    if (!isAutoPlay || viewMode === 'grid') return;

    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          setCurrentSlide((slide) => (slide + 1) % 4);
          return slideDuration;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isAutoPlay, slideDuration, viewMode]);

  // Reset timer on manual slide change or duration change
  const handleSlideChange = (newSlide: number) => {
    setCurrentSlide(newSlide);
    setTimeRemaining(slideDuration);
  };

  const handleDurationChange = (newDuration: number) => {
    setSlideDuration(newDuration);
    setTimeRemaining(newDuration);
  };

  // Helper formatting with dynamic kg/T conversion and smaller unit font size
  const renderWeight = (
    val: number,
    unitClass: string = 'text-[0.45em] font-extrabold opacity-75 ml-1 select-none',
    suffix: string = ''
  ) => {
    const absVal = Math.abs(val || 0);
    if (absVal >= 1000) {
      const tons = val / 1000;
      const numStr = tons.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 3 });
      return (
        <span className="inline-flex items-baseline">
          <span>{numStr}</span>
          <span className={unitClass}>T{suffix}</span>
        </span>
      );
    }
    const numStr = (val || 0).toLocaleString('pt-BR', { maximumFractionDigits: 0 });
    return (
      <span className="inline-flex items-baseline">
        <span>{numStr}</span>
        <span className={unitClass}>kg{suffix}</span>
      </span>
    );
  };

  const renderM2 = (
    val: number,
    unitClass: string = 'text-[0.45em] font-extrabold opacity-75 ml-1 select-none'
  ) => {
    const numStr = (val || 0).toLocaleString('pt-BR', { maximumFractionDigits: 0 });
    return (
      <span className="inline-flex items-baseline">
        <span>{numStr}</span>
        <span className={unitClass}>m²</span>
      </span>
    );
  };

  const formatWeightStr = (val: number) => {
    const absVal = Math.abs(val || 0);
    if (absVal >= 1000) {
      return (val / 1000).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 3 }) + ' T';
    }
    return (val || 0).toLocaleString('pt-BR', { maximumFractionDigits: 0 }) + ' kg';
  };

  // Calculate Metrics
  const metrics = useMemo(() => {
    const currentGoal = goals[dashboardMonth] || 150000;

    // Filter current month production
    const monthProdEntries = productionData.filter(
      (e) => e && typeof e.date === 'string' && e.date.startsWith(dashboardMonth)
    );

    // Yesterday date string (YYYY-MM-DD)
    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterdayStr = yesterdayDate.toLocaleDateString('sv-SE');

    // Today date string
    const todayStr = new Date().toLocaleDateString('sv-SE');

    let prodMonthTotal = 0; // Excludes Erema
    let eremaMonthTotal = 0;
    let yesterdayProdTotal = 0;
    let todayProdTotal = 0;

    let totalEcoBP = 0;
    let totalEcoBM = 0;
    let totalEcoA = 0;
    let totalBorra = 0;
    let yesterdayEcoB = 0;

    // Operator totals map
    const operatorMap: Record<string, { totalNet: number; count: number; machine: string }> = {};

    // Machine totals map
    const machineMonthMap: Record<string, number> = {
      'Cast 1': 0,
      'Cast 2': 0,
      'Erema': 0,
    };
    const machineYesterdayMap: Record<string, number> = {
      'Cast 1': 0,
      'Cast 2': 0,
      'Erema': 0,
    };

    monthProdEntries.forEach((e) => {
      const net = e.netWeight || 0;
      const isErema = e.machine.toLowerCase().includes('erema');
      const isCast1 = e.machine.toLowerCase().includes('cast 1');
      const isCast2 = e.machine.toLowerCase().includes('cast 2');

      if (isErema) {
        eremaMonthTotal += net;
        machineMonthMap['Erema'] = (machineMonthMap['Erema'] || 0) + net;
      } else {
        prodMonthTotal += net;
        if (isCast1) machineMonthMap['Cast 1'] = (machineMonthMap['Cast 1'] || 0) + net;
        if (isCast2) machineMonthMap['Cast 2'] = (machineMonthMap['Cast 2'] || 0) + net;
      }

      totalEcoBP += e.ecoBP || 0;
      totalEcoBM += e.ecoBM || 0;
      totalEcoA += e.ecoA || 0;
      totalBorra += e.borraTotal || 0;

      // Yesterday
      if (e.date === yesterdayStr) {
        if (!isErema) yesterdayProdTotal += net;
        yesterdayEcoB += (e.ecoBP || 0) + (e.ecoBM || 0);

        if (isErema) machineYesterdayMap['Erema'] += net;
        if (isCast1) machineYesterdayMap['Cast 1'] += net;
        if (isCast2) machineYesterdayMap['Cast 2'] += net;
      }

      // Today
      if (e.date === todayStr) {
        if (!isErema) todayProdTotal += net;
      }

      // Operators ranking
      if (e.operator && e.operator.trim()) {
        const opName = e.operator.trim();
        if (!operatorMap[opName]) {
          operatorMap[opName] = { totalNet: 0, count: 0, machine: e.machine || 'Extrusão' };
        }
        operatorMap[opName].totalNet += net;
        operatorMap[opName].count += 1;
      }
    });

    // Top Operators
    const topOperators = Object.entries(operatorMap)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.totalNet - a.totalNet);

    const bestOperator = topOperators[0] || { name: 'Sem registros', totalNet: 0, machine: '-' };

    // Projection & Daily Goal
    const today = new Date();
    const currentDayNum = dashboardMonth === today.toISOString().slice(0, 7) ? today.getDate() : 30;
    const daysInMonth = 30;

    const avgDailyProd = prodMonthTotal / Math.max(1, currentDayNum);
    const projectedMonthTotal = avgDailyProd * daysInMonth;

    const daysRemaining = Math.max(1, daysInMonth - currentDayNum);
    const remainingGoal = Math.max(0, currentGoal - prodMonthTotal);
    const dailyGoalRequired = remainingGoal / daysRemaining;
    const dailyTargetGoal = currentGoal / daysInMonth;

    const goalPercent = Math.min(100, (prodMonthTotal / Math.max(1, currentGoal)) * 100);

    // Ribbon Cutting Metrics (Corte de Fita)
    const monthRibbonEntries = ribbonEntries.filter(
      (r) => r && typeof r.date === 'string' && r.date.startsWith(dashboardMonth)
    );
    const ribbonMonthM2 = monthRibbonEntries.reduce((sum, r) => sum + (r.producedM2 || 0), 0);
    const ribbonYesterdayM2 = monthRibbonEntries
      .filter((r) => r.date === yesterdayStr)
      .reduce((sum, r) => sum + (r.producedM2 || 0), 0);

    // Previous Month Calculation YYYY-MM
    const [yearStr, monthStr] = dashboardMonth.split('-');
    let prevYear = parseInt(yearStr, 10);
    let prevMonth = parseInt(monthStr, 10) - 1;
    if (prevMonth < 1) {
      prevMonth = 12;
      prevYear -= 1;
    }
    const prevMonthStr = `${prevYear}-${String(prevMonth).padStart(2, '0')}`;
    const prevMonthDate = new Date(prevYear, prevMonth - 1, 1);
    const prevMonthName = prevMonthDate.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });

    // Filter Previous Month Production
    const prevMonthProdEntries = productionData.filter(
      (e) => e && typeof e.date === 'string' && e.date.startsWith(prevMonthStr)
    );

    let prevMonthProdTotal = 0; // Excludes Erema
    let prevMonthEremaTotal = 0;
    let prevMonthEcoB = 0;
    const prevMachineMap: Record<string, number> = {
      'Cast 1': 0,
      'Cast 2': 0,
      'Erema': 0,
    };

    prevMonthProdEntries.forEach((e) => {
      const net = e.netWeight || 0;
      const isErema = e.machine.toLowerCase().includes('erema');
      const isCast1 = e.machine.toLowerCase().includes('cast 1');
      const isCast2 = e.machine.toLowerCase().includes('cast 2');

      if (isErema) {
        prevMonthEremaTotal += net;
        prevMachineMap['Erema'] += net;
      } else {
        prevMonthProdTotal += net;
        if (isCast1) prevMachineMap['Cast 1'] += net;
        if (isCast2) prevMachineMap['Cast 2'] += net;
      }
      prevMonthEcoB += (e.ecoBP || 0) + (e.ecoBM || 0);
    });

    const prevMonthRibbonEntries = ribbonEntries.filter(
      (r) => r && typeof r.date === 'string' && r.date.startsWith(prevMonthStr)
    );
    const prevMonthRibbonM2 = prevMonthRibbonEntries.reduce((sum, r) => sum + (r.producedM2 || 0), 0);

    // Variation calculations vs Previous Month
    const calcVar = (curr: number, prev: number) => {
      if (!prev || prev <= 0) return null;
      return ((curr - prev) / prev) * 100;
    };

    const prodVar = calcVar(prodMonthTotal, prevMonthProdTotal);
    const projVar = calcVar(projectedMonthTotal, prevMonthProdTotal);
    const cast1Var = calcVar(machineMonthMap['Cast 1'] || 0, prevMachineMap['Cast 1'] || 0);
    const cast2Var = calcVar(machineMonthMap['Cast 2'] || 0, prevMachineMap['Cast 2'] || 0);
    const eremaVar = calcVar(eremaMonthTotal, prevMachineMap['Erema'] || 0);
    const ribbonVar = calcVar(ribbonMonthM2, prevMonthRibbonM2);
    const ecoBVar = calcVar(totalEcoBP + totalEcoBM, prevMonthEcoB);

    // Chart daily progression
    const dailyMap: Record<string, { day: string; producao: number; meta: number; cast1: number; cast2: number }> = {};
    for (let d = 1; d <= currentDayNum; d++) {
      const dayStr = `${dashboardMonth}-${String(d).padStart(2, '0')}`;
      dailyMap[dayStr] = {
        day: `${String(d).padStart(2, '0')}/${dashboardMonth.slice(5, 7)}`,
        producao: 0,
        meta: Math.round(dailyTargetGoal),
        cast1: 0,
        cast2: 0,
      };
    }

    monthProdEntries.forEach((e) => {
      if (dailyMap[e.date] && !e.machine.toLowerCase().includes('erema')) {
        const net = e.netWeight || 0;
        dailyMap[e.date].producao += net;
        if (e.machine.toLowerCase().includes('cast 1')) {
          dailyMap[e.date].cast1 += net;
        } else if (e.machine.toLowerCase().includes('cast 2')) {
          dailyMap[e.date].cast2 += net;
        }
      }
    });

    const dailyChartData = Object.values(dailyMap);

    // Shift breakdown
    const shiftMap: Record<string, { cast1: number; cast2: number; erema: number; total: number }> = {
      Diurno: { cast1: 0, cast2: 0, erema: 0, total: 0 },
      Noturno: { cast1: 0, cast2: 0, erema: 0, total: 0 },
    };

    monthProdEntries.forEach((e) => {
      const s = (e.shift || '').toLowerCase();
      const shiftKey = (s.includes('noturno') || s.includes('noite') || s.includes('n1') || s.includes('n2'))
        ? 'Noturno'
        : 'Diurno';

      const net = e.netWeight || 0;
      shiftMap[shiftKey].total += net;

      if (e.machine.toLowerCase().includes('cast 1')) shiftMap[shiftKey].cast1 += net;
      else if (e.machine.toLowerCase().includes('cast 2')) shiftMap[shiftKey].cast2 += net;
      else if (e.machine.toLowerCase().includes('erema')) shiftMap[shiftKey].erema += net;
    });

    // Machine comparison dataset for Recharts including Mês Anterior
    const machineComparisonData = [
      {
        name: 'Cast 1',
        'Acumulado Mês': machineMonthMap['Cast 1'] || 0,
        'Mês Anterior': prevMachineMap['Cast 1'] || 0,
        Ontem: machineYesterdayMap['Cast 1'] || 0,
      },
      {
        name: 'Cast 2',
        'Acumulado Mês': machineMonthMap['Cast 2'] || 0,
        'Mês Anterior': prevMachineMap['Cast 2'] || 0,
        Ontem: machineYesterdayMap['Cast 2'] || 0,
      },
      {
        name: 'Erema',
        'Acumulado Mês': eremaMonthTotal,
        'Mês Anterior': prevMachineMap['Erema'] || 0,
        Ontem: machineYesterdayMap['Erema'] || 0,
      },
    ];

    // Loss / Scrap distribution
    const scrapDistributionData = [
      { name: 'Eco B (Produção)', value: totalEcoBP, color: '#f59e0b' },
      { name: 'Eco B (Manutenção)', value: totalEcoBM, color: '#ea580c' },
      { name: 'Eco A', value: totalEcoA, color: '#10b981' },
      { name: 'Borra', value: totalBorra, color: '#ef4444' },
    ].filter((item) => item.value > 0);

    return {
      currentGoal,
      prodMonthTotal,
      eremaMonthTotal,
      yesterdayProdTotal,
      todayProdTotal,
      totalEcoB: totalEcoBP + totalEcoBM,
      totalEcoBP,
      totalEcoBM,
      totalEcoA,
      totalBorra,
      yesterdayEcoB,
      bestOperator,
      topOperators,
      projectedMonthTotal,
      dailyGoalRequired,
      dailyTargetGoal,
      goalPercent,
      ribbonMonthM2,
      ribbonYesterdayM2,
      machineMonthMap,
      machineYesterdayMap,
      dailyChartData,
      shiftMap,
      machineComparisonData,
      scrapDistributionData,
      currentDayNum,
      // Previous month additions
      prevMonthStr,
      prevMonthName,
      prevMonthProdTotal,
      prevMonthEremaTotal,
      prevMachineMap,
      prevMonthRibbonM2,
      prevMonthEcoB,
      prodVar,
      projVar,
      cast1Var,
      cast2Var,
      eremaVar,
      ribbonVar,
      ecoBVar,
    };
  }, [productionData, ribbonEntries, goals, dashboardMonth]);

  const slideTitles = [
    'Visão Geral & Indicadores',
    'Desempenho por Equipamento',
    'Análise Gráfica & Turnos',
    'Ranking de Operadores',
  ];

  return (
    <div className="fixed inset-0 z-[200] bg-slate-100 text-slate-900 flex flex-col font-sans overflow-hidden select-none">
      {/* Top TV Bar - Crisp Light Mode Header */}
      <header className="bg-white border-b-2 border-slate-200 px-6 py-3 flex items-center justify-between shrink-0 shadow-sm z-10 transition-all">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 md:w-14 md:h-14 bg-gradient-to-br from-blue-600 via-indigo-600 to-blue-700 rounded-2xl flex items-center justify-center text-white shadow-md border border-blue-400/20 shrink-0">
            {systemLogo ? (
              <img src={systemLogo} alt="Logo" className="w-full h-full object-cover rounded-2xl" />
            ) : (
              <Tv className="w-7 h-7 md:w-8 md:h-8 text-white" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl md:text-2xl lg:text-3xl font-black text-slate-900 tracking-tight uppercase">
                {systemName} <span className="text-blue-600 font-black">• PROJEÇÃO TV</span>
              </h1>
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-sm">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span> AO VIVO
              </span>
            </div>
            <p className="text-xs md:text-sm font-extrabold text-slate-500 tracking-wider">
              PAINEL INDUSTRIAL AUTOMÁTICO • EXTRUSÃO & RECURSOS
            </p>
          </div>
        </div>

        {/* Center Navigation / Slide Switcher */}
        {!isFullscreen && (
          <div className="hidden lg:flex items-center gap-2 bg-slate-100 p-2 rounded-2xl border border-slate-200 shadow-inner">
            {slideTitles.map((title, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setViewMode('slides');
                  handleSlideChange(idx);
                }}
                className={`px-4 py-2.5 rounded-xl text-xs md:text-sm font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
                  viewMode === 'slides' && currentSlide === idx
                    ? 'bg-blue-600 text-white shadow-md border border-blue-500'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
                }`}
              >
                <span className="opacity-70">{idx + 1}.</span> {title}
              </button>
            ))}
            <button
              onClick={() => setViewMode('grid')}
              className={`px-4 py-2.5 rounded-xl text-xs md:text-sm font-black uppercase tracking-wider transition-all ${
                viewMode === 'grid'
                  ? 'bg-emerald-600 text-white shadow-md border border-emerald-500'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
              }`}
            >
              Vista Completa
            </button>
          </div>
        )}

        {/* Right Controls: Clock & Actions */}
        <div className="flex items-center gap-4">
          {/* Transition Duration Speed Buttons */}
          {!isFullscreen && (
            <div className="hidden xl:flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
              <span className="text-xs font-black text-slate-500 uppercase px-2 flex items-center gap-1">
                <Sliders className="w-4 h-4 text-slate-600" /> Tempo:
              </span>
              {[20, 30, 45, 60].map((sec) => (
                <button
                  key={sec}
                  onClick={() => handleDurationChange(sec)}
                  className={`px-3 py-1.5 rounded-xl text-xs md:text-sm font-black font-mono transition-all ${
                    slideDuration === sec
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-600 hover:bg-slate-200'
                  }`}
                  title={`Trocar slide a cada ${sec} segundos`}
                >
                  {sec}s
                </button>
              ))}
            </div>
          )}

          {/* Clock (Relógio) */}
          <div className="text-right sm:block bg-slate-50 px-5 py-2 rounded-2xl border border-slate-200 shadow-sm">
            <div className="text-xl md:text-2xl font-mono font-black text-blue-700 tracking-wider flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-600" />
              {currentTime.toLocaleTimeString('pt-BR')}
            </div>
            <div className="text-xs font-extrabold text-slate-500 uppercase tracking-widest">
              {currentTime.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}
            </div>
          </div>

          {/* Control Buttons: Pause, Fullscreen, Exit */}
          <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
            <button
              onClick={() => setIsAutoPlay(!isAutoPlay)}
              className={`p-3 rounded-xl transition-all shadow-sm ${
                isAutoPlay ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'
              }`}
              title={isAutoPlay ? 'Pausar Rotação' : 'Iniciar Rotação Automática'}
            >
              {isAutoPlay ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
            </button>
            <button
              onClick={toggleFullscreen}
              className="p-3 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl transition-all shadow-sm"
              title="Alternar Tela Cheia (Pressione ESC para sair)"
            >
              {isFullscreen ? <Minimize2 className="w-6 h-6" /> : <Maximize2 className="w-6 h-6" />}
            </button>
            <button
              onClick={onClose}
              className="p-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl transition-all shadow-sm"
              title="Sair da Projeção"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>
      </header>

      {/* Rotation Progress Bar */}
      {!isFullscreen && isAutoPlay && viewMode === 'slides' && (
        <div className="w-full bg-slate-200 h-2 relative overflow-hidden shrink-0">
          <div
            className="bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-500 h-full transition-all duration-1000 ease-linear shadow-sm"
            style={{ width: `${((slideDuration - timeRemaining) / slideDuration) * 100}%` }}
          />
        </div>
      )}

      {/* Main Viewport */}
      <main className="flex-1 p-6 md:p-8 lg:p-10 overflow-y-auto relative bg-slate-100 flex flex-col justify-between">
        {viewMode === 'slides' ? (
          <AnimatePresence mode="wait">
            <motion.div
              key={currentSlide}
              initial={{ opacity: 0, scale: 0.98, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: -10 }}
              transition={{ duration: 0.4 }}
              className="w-full flex-1 flex flex-col justify-between gap-6"
            >
              {/* SLIDE 0: VISÃO GERAL DE PRODUÇÃO & METAS */}
              {currentSlide === 0 && (
                <div className="w-full flex-1 flex flex-col justify-between gap-6">
                  {/* Top 4 Key Metric Cards (Extra Large Text for Fullscreen TV) */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {/* Produção de Ontem */}
                    <div className="bg-white border-2 border-blue-200 rounded-3xl p-6 lg:p-8 shadow-md hover:shadow-xl transition-all flex flex-col justify-between min-h-[220px]">
                      <div className="flex items-center justify-between">
                        <span className="text-sm md:text-base lg:text-lg font-black text-blue-700 uppercase tracking-widest flex items-center gap-2">
                          <Calendar className="w-5 h-5 lg:w-6 lg:h-6 text-blue-600 shrink-0" /> Produção de Ontem
                        </span>
                        <span className="text-xs md:text-sm font-black text-blue-700 bg-blue-50 px-3 py-1.5 rounded-full border border-blue-200">
                          Extrusão
                        </span>
                      </div>
                      <div className="text-5xl md:text-6xl lg:text-7xl 2xl:text-8xl font-black text-slate-900 font-mono my-3 tracking-tight">
                        {renderWeight(metrics.yesterdayProdTotal)}
                      </div>
                      <div className="flex items-center justify-between text-sm md:text-base lg:text-lg font-bold text-slate-600 pt-4 border-t-2 border-slate-100 mt-2">
                        <span>Corte de Fita:</span>
                        <span className="font-mono text-indigo-600 font-black text-base lg:text-xl">{renderM2(metrics.ribbonYesterdayM2)}</span>
                      </div>
                    </div>

                    {/* Meta Mensal & Progresso */}
                    <div className="bg-white border-2 border-emerald-200 rounded-3xl p-6 lg:p-8 shadow-md hover:shadow-xl transition-all flex flex-col justify-between min-h-[220px]">
                      <div className="flex items-center justify-between">
                        <span className="text-sm md:text-base lg:text-lg font-black text-emerald-700 uppercase tracking-widest flex items-center gap-2">
                          <Target className="w-5 h-5 lg:w-6 lg:h-6 text-emerald-600 shrink-0" /> Meta do Mês
                        </span>
                        <span className="text-xs md:text-sm font-black text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-300 font-mono">
                          {metrics.goalPercent.toFixed(1)}%
                        </span>
                      </div>
                      <div className="text-5xl md:text-6xl lg:text-7xl 2xl:text-8xl font-black text-slate-900 font-mono my-3 tracking-tight">
                        {renderWeight(metrics.prodMonthTotal)}
                      </div>
                      <div className="w-full bg-slate-100 h-4 rounded-full overflow-hidden my-2 border border-slate-200 p-0.5">
                        <div
                          className="bg-gradient-to-r from-emerald-500 to-teal-500 h-full rounded-full transition-all duration-1000 shadow-sm"
                          style={{ width: `${Math.min(100, metrics.goalPercent)}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-xs md:text-sm lg:text-base font-bold text-slate-600">
                        <span>Meta: {renderWeight(metrics.currentGoal, 'text-[0.7em] font-extrabold opacity-75 ml-0.5')}</span>
                        <span>Falta: {renderWeight(Math.max(0, metrics.currentGoal - metrics.prodMonthTotal), 'text-[0.7em] font-extrabold opacity-75 ml-0.5')}</span>
                      </div>
                      <div className="pt-2 border-t border-slate-100 mt-2 flex items-center justify-between text-xs font-extrabold text-slate-500">
                        <span>Mês Ant. ({metrics.prevMonthName}): <strong className="font-mono text-slate-800">{renderWeight(metrics.prevMonthProdTotal, 'text-[0.7em] font-extrabold opacity-80 ml-0.5')}</strong></span>
                        {metrics.prodVar !== null && (
                          <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md text-xs font-black font-mono ${
                            metrics.prodVar >= 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                          }`}>
                            {metrics.prodVar >= 0 ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                            {metrics.prodVar >= 0 ? '+' : ''}{metrics.prodVar.toFixed(1)}%
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Projeção do Mês */}
                    <div className="bg-white border-2 border-indigo-200 rounded-3xl p-6 lg:p-8 shadow-md hover:shadow-xl transition-all flex flex-col justify-between min-h-[220px]">
                      <div className="flex items-center justify-between">
                        <span className="text-sm md:text-base lg:text-lg font-black text-indigo-700 uppercase tracking-widest flex items-center gap-2">
                          <TrendingUp className="w-5 h-5 lg:w-6 lg:h-6 text-indigo-600 shrink-0" /> Projeção Fechamento
                        </span>
                        <span className="text-xs md:text-sm font-black text-indigo-700 bg-indigo-50 px-3 py-1.5 rounded-full border border-indigo-200">
                          Estimada
                        </span>
                      </div>
                      <div className="text-5xl md:text-6xl lg:text-7xl 2xl:text-8xl font-black text-indigo-600 font-mono my-3 tracking-tight">
                        {renderWeight(metrics.projectedMonthTotal)}
                      </div>
                      <div className="flex items-center justify-between text-xs md:text-sm lg:text-base font-bold text-slate-600 pt-4 border-t-2 border-slate-100 mt-2">
                        <span>Ritmo Diário Nec.:</span>
                        <span className="font-mono text-amber-600 font-black text-base lg:text-xl">{renderWeight(metrics.dailyGoalRequired, 'text-[0.55em] font-extrabold text-amber-700 ml-0.5', '/dia')}</span>
                      </div>
                      <div className="pt-2 border-t border-slate-100 mt-2 flex items-center justify-between text-xs font-extrabold text-slate-500">
                        <span>vs Mês Ant. ({metrics.prevMonthName}):</span>
                        {metrics.projVar !== null ? (
                          <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md text-xs font-black font-mono ${
                            metrics.projVar >= 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                          }`}>
                            {metrics.projVar >= 0 ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                            {metrics.projVar >= 0 ? '+' : ''}{metrics.projVar.toFixed(1)}%
                          </span>
                        ) : (
                          <span className="text-slate-400 font-mono">-</span>
                        )}
                      </div>
                    </div>

                    {/* Total Eco B Produzido */}
                    <div className="bg-white border-2 border-amber-200 rounded-3xl p-6 lg:p-8 shadow-md hover:shadow-xl transition-all flex flex-col justify-between min-h-[220px]">
                      <div className="flex items-center justify-between">
                        <span className="text-sm md:text-base lg:text-lg font-black text-amber-700 uppercase tracking-widest flex items-center gap-2">
                          <Activity className="w-5 h-5 lg:w-6 lg:h-6 text-amber-600 shrink-0" /> Total Eco B Produzido
                        </span>
                        <span className="text-xs md:text-sm font-black text-amber-700 bg-amber-50 px-3 py-1.5 rounded-full border border-amber-200">
                          Refilo
                        </span>
                      </div>
                      <div className="text-5xl md:text-6xl lg:text-7xl 2xl:text-8xl font-black text-amber-600 font-mono my-3 tracking-tight">
                        {renderWeight(metrics.totalEcoB)}
                      </div>
                      <div className="flex items-center justify-between text-xs md:text-sm lg:text-base font-bold text-slate-600 pt-4 border-t-2 border-slate-100 mt-2">
                        <span>Eco BP: {renderWeight(metrics.totalEcoBP, 'text-[0.7em] font-extrabold opacity-80 ml-0.5')}</span>
                        <span>Eco BM: {renderWeight(metrics.totalEcoBM, 'text-[0.7em] font-extrabold opacity-80 ml-0.5')}</span>
                      </div>
                      <div className="pt-2 border-t border-slate-100 mt-2 flex items-center justify-between text-xs font-extrabold text-slate-500">
                        <span>Mês Ant.: <strong className="font-mono text-slate-800">{renderWeight(metrics.prevMonthEcoB, 'text-[0.7em] font-extrabold opacity-80 ml-0.5')}</strong></span>
                        {metrics.ecoBVar !== null && (
                          <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md text-xs font-black font-mono ${
                            metrics.ecoBVar <= 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {metrics.ecoBVar >= 0 ? '+' : ''}{metrics.ecoBVar.toFixed(1)}%
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Middle Row: Best Operator Spotlight & Machine Highlights */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 my-auto">
                    {/* Melhor Operador Spotlight */}
                    <div className="lg:col-span-1 bg-gradient-to-br from-amber-500/10 via-white to-amber-50/60 border-2 border-amber-400 rounded-3xl p-6 lg:p-8 shadow-md flex flex-col justify-between">
                      <div className="flex items-center justify-between border-b-2 border-amber-200 pb-4">
                        <div className="flex items-center gap-3">
                          <Trophy className="w-8 h-8 lg:w-10 lg:h-10 text-amber-500" />
                          <h2 className="text-lg md:text-xl lg:text-2xl font-black text-amber-900 uppercase tracking-wide">
                            Melhor Operador do Mês
                          </h2>
                        </div>
                        <span className="text-4xl">🥇</span>
                      </div>

                      <div className="my-6 flex items-center gap-6">
                        <div className="w-24 h-24 lg:w-28 lg:h-28 bg-gradient-to-tr from-amber-500 to-amber-300 rounded-3xl p-1.5 shadow-md shrink-0">
                          <div className="w-full h-full bg-white rounded-[1.2rem] flex items-center justify-center text-4xl lg:text-5xl font-black text-amber-600 border border-amber-200">
                            {metrics.bestOperator.name ? metrics.bestOperator.name.charAt(0).toUpperCase() : 'O'}
                          </div>
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-2xl md:text-3xl lg:text-4xl font-black text-slate-900 truncate tracking-tight">
                            {metrics.bestOperator.name}
                          </h3>
                          <p className="text-sm md:text-base font-black text-amber-700 uppercase tracking-wider mt-1">
                            Máquina: {metrics.bestOperator.machine || 'Extrusão'}
                          </p>
                          <div className="mt-3 text-3xl lg:text-4xl font-mono font-black text-emerald-600">
                            {renderWeight(metrics.bestOperator.totalNet)}
                          </div>
                        </div>
                      </div>

                      <div className="bg-amber-100/90 border border-amber-300 rounded-2xl p-4 text-center text-xs md:text-sm font-black text-amber-900 tracking-wider uppercase">
                        Líder em Produtividade e Eficiência da Extrusão
                      </div>
                    </div>

                    {/* Machine Cards: Cast 1, Cast 2, Erema */}
                    <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-6">
                      {/* Cast 1 */}
                      <div className="bg-white border-2 border-blue-200 rounded-3xl p-6 lg:p-8 flex flex-col justify-between shadow-md">
                        <div className="flex items-center justify-between">
                          <span className="text-sm md:text-base lg:text-lg font-black text-blue-700 uppercase tracking-widest flex items-center gap-2">
                            <Factory className="w-5 h-5 text-blue-600" /> Cast 1
                          </span>
                          <span className="w-3.5 h-3.5 rounded-full bg-blue-500"></span>
                        </div>
                        <div className="my-4">
                          <p className="text-xs md:text-sm text-slate-400 uppercase font-black">Acumulado Mês</p>
                          <p className="text-4xl lg:text-5xl 2xl:text-6xl font-black text-blue-600 font-mono mt-1">
                            {renderWeight(metrics.machineMonthMap['Cast 1'] || 0)}
                          </p>
                        </div>
                        <div className="pt-4 border-t-2 border-slate-100 text-xs md:text-sm lg:text-base font-bold text-slate-600 space-y-1">
                          <div className="flex justify-between items-center">
                            <span>Ontem:</span>
                            <span className="font-extrabold text-slate-900 font-mono">
                              {renderWeight(metrics.machineYesterdayMap['Cast 1'] || 0, 'text-[0.7em] font-extrabold text-slate-600 ml-0.5')}
                            </span>
                          </div>
                          <div className="flex justify-between items-center text-xs text-slate-500 pt-1 border-t border-slate-100">
                            <span>Mês Ant. ({metrics.prevMonthName}):</span>
                            <span className="font-mono font-bold text-slate-700">
                              {renderWeight(metrics.prevMachineMap['Cast 1'] || 0, 'text-[0.7em] font-extrabold text-slate-600 ml-0.5')}
                              {metrics.cast1Var !== null && (
                                <span className={`ml-1 font-black ${metrics.cast1Var >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                  ({metrics.cast1Var >= 0 ? '+' : ''}{metrics.cast1Var.toFixed(1)}%)
                                </span>
                              )}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Cast 2 */}
                      <div className="bg-white border-2 border-indigo-200 rounded-3xl p-6 lg:p-8 flex flex-col justify-between shadow-md">
                        <div className="flex items-center justify-between">
                          <span className="text-sm md:text-base lg:text-lg font-black text-indigo-700 uppercase tracking-widest flex items-center gap-2">
                            <Factory className="w-5 h-5 text-indigo-600" /> Cast 2
                          </span>
                          <span className="w-3.5 h-3.5 rounded-full bg-indigo-500"></span>
                        </div>
                        <div className="my-4">
                          <p className="text-xs md:text-sm text-slate-400 uppercase font-black">Acumulado Mês</p>
                          <p className="text-4xl lg:text-5xl 2xl:text-6xl font-black text-indigo-600 font-mono mt-1">
                            {renderWeight(metrics.machineMonthMap['Cast 2'] || 0)}
                          </p>
                        </div>
                        <div className="pt-4 border-t-2 border-slate-100 text-xs md:text-sm lg:text-base font-bold text-slate-600 space-y-1">
                          <div className="flex justify-between items-center">
                            <span>Ontem:</span>
                            <span className="font-extrabold text-slate-900 font-mono">
                              {renderWeight(metrics.machineYesterdayMap['Cast 2'] || 0, 'text-[0.7em] font-extrabold text-slate-600 ml-0.5')}
                            </span>
                          </div>
                          <div className="flex justify-between items-center text-xs text-slate-500 pt-1 border-t border-slate-100">
                            <span>Mês Ant. ({metrics.prevMonthName}):</span>
                            <span className="font-mono font-bold text-slate-700">
                              {renderWeight(metrics.prevMachineMap['Cast 2'] || 0, 'text-[0.7em] font-extrabold text-slate-600 ml-0.5')}
                              {metrics.cast2Var !== null && (
                                <span className={`ml-1 font-black ${metrics.cast2Var >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                  ({metrics.cast2Var >= 0 ? '+' : ''}{metrics.cast2Var.toFixed(1)}%)
                                </span>
                              )}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Erema */}
                      <div className="bg-white border-2 border-teal-200 rounded-3xl p-6 lg:p-8 flex flex-col justify-between shadow-md">
                        <div className="flex items-center justify-between">
                          <span className="text-sm md:text-base lg:text-lg font-black text-teal-700 uppercase tracking-widest flex items-center gap-2">
                            <RefreshCw className="w-5 h-5 text-teal-600" /> Erema (Reciclado)
                          </span>
                          <span className="w-3.5 h-3.5 rounded-full bg-teal-500"></span>
                        </div>
                        <div className="my-4">
                          <p className="text-xs md:text-sm text-slate-400 uppercase font-black">Acumulado Mês</p>
                          <p className="text-4xl lg:text-5xl 2xl:text-6xl font-black text-teal-600 font-mono mt-1">
                            {renderWeight(metrics.eremaMonthTotal)}
                          </p>
                        </div>
                        <div className="pt-4 border-t-2 border-slate-100 text-xs md:text-sm lg:text-base font-bold text-slate-600 space-y-1">
                          <div className="flex justify-between items-center">
                            <span>Ontem:</span>
                            <span className="font-extrabold text-slate-900 font-mono">
                              {renderWeight(metrics.machineYesterdayMap['Erema'] || 0, 'text-[0.7em] font-extrabold text-slate-600 ml-0.5')}
                            </span>
                          </div>
                          <div className="flex justify-between items-center text-xs text-slate-500 pt-1 border-t border-slate-100">
                            <span>Mês Ant. ({metrics.prevMonthName}):</span>
                            <span className="font-mono font-bold text-slate-700">
                              {renderWeight(metrics.prevMachineMap['Erema'] || 0, 'text-[0.7em] font-extrabold text-slate-600 ml-0.5')}
                              {metrics.eremaVar !== null && (
                                <span className={`ml-1 font-black ${metrics.eremaVar >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                  ({metrics.eremaVar >= 0 ? '+' : ''}{metrics.eremaVar.toFixed(1)}%)
                                </span>
                              )}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* SLIDE 1: GRÁFICO PROMINENTE DE COMPARAÇÃO DE EQUIPAMENTOS */}
              {currentSlide === 1 && (
                <div className="w-full flex-1 flex flex-col justify-between gap-6">
                  {!isFullscreen && (
                    <div className="flex items-center justify-between border-b-2 border-slate-200 pb-4">
                      <h2 className="text-2xl md:text-3xl lg:text-4xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-3">
                        <Factory className="w-8 h-8 text-blue-600" /> Desempenho Comparativo por Equipamento
                      </h2>
                      <span className="text-sm md:text-base font-mono font-black text-blue-600 bg-blue-50 px-4 py-1.5 rounded-full border border-blue-200">
                        Mês: {dashboardMonth} vs {metrics.prevMonthName}
                      </span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 my-auto min-h-[460px]">
                    {/* Big Prominent Bar Chart */}
                    <div className="lg:col-span-2 bg-white border-2 border-slate-200 rounded-3xl p-6 lg:p-8 shadow-md flex flex-col justify-between">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-base md:text-lg lg:text-xl font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                          <BarChart3 className="w-6 h-6 text-blue-600" /> Volume Atual vs Mês Anterior vs Ontem
                        </h3>
                        <div className="flex items-center gap-4 md:gap-6 text-xs md:text-sm lg:text-base font-extrabold flex-wrap">
                          <span className="flex items-center gap-2 text-blue-600">
                            <span className="w-3.5 h-3.5 rounded-md bg-blue-600"></span> Acumulado Mês
                          </span>
                          <span className="flex items-center gap-2 text-slate-600">
                            <span className="w-3.5 h-3.5 rounded-md bg-slate-500"></span> Mês Ant. ({metrics.prevMonthName})
                          </span>
                          <span className="flex items-center gap-2 text-indigo-500">
                            <span className="w-3.5 h-3.5 rounded-md bg-indigo-500"></span> Ontem
                          </span>
                        </div>
                      </div>

                      <div className="w-full h-[360px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={metrics.machineComparisonData} margin={{ top: 20, right: 30, left: 10, bottom: 10 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" vertical={false} />
                            <XAxis dataKey="name" stroke="#475569" tick={{ fill: '#0f172a', fontSize: 16, fontWeight: 800 }} />
                            <YAxis stroke="#475569" tick={{ fill: '#334155', fontSize: 14, fontWeight: 700 }} tickFormatter={(val: number) => formatWeightStr(val)} />
                            <Tooltip
                              contentStyle={{ backgroundColor: '#ffffff', borderColor: '#cbd5e1', borderRadius: '1rem', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontSize: '16px', fontWeight: 'bold' }}
                              formatter={(value: number) => [formatWeightStr(value), 'Volume']}
                            />
                            <Bar dataKey="Acumulado Mês" name="Acumulado Mês" fill="#2563eb" radius={[10, 10, 0, 0]} barSize={40} />
                            <Bar dataKey="Mês Anterior" name={`Mês Anterior (${metrics.prevMonthName})`} fill="#64748b" radius={[10, 10, 0, 0]} barSize={40} />
                            <Bar dataKey="Ontem" name="Ontem" fill="#6366f1" radius={[10, 10, 0, 0]} barSize={40} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Detailed Cards Column */}
                    <div className="flex flex-col justify-between gap-4">
                      {/* Cast 1 Detail */}
                      <div className="bg-white border-2 border-blue-200 rounded-3xl p-5 shadow-md flex justify-between items-center">
                        <div>
                          <div className="flex items-center gap-2 text-sm md:text-base font-black text-blue-600 uppercase">
                            <span className="w-3.5 h-3.5 rounded-full bg-blue-600"></span> Cast 1
                          </div>
                          <div className="text-2xl lg:text-3xl 2xl:text-4xl font-black text-slate-900 font-mono mt-1">
                            {renderWeight(metrics.machineMonthMap['Cast 1'] || 0)}
                          </div>
                        </div>
                        <div className="text-right space-y-1">
                          <div>
                            <span className="text-xs font-black text-slate-400 uppercase block">Mês Ant. ({metrics.prevMonthName})</span>
                            <span className="text-sm lg:text-base font-black text-slate-700 font-mono">
                              {renderWeight(metrics.prevMachineMap['Cast 1'] || 0, 'text-[0.7em] font-extrabold text-slate-600 ml-0.5')}
                              {metrics.cast1Var !== null && (
                                <span className={`ml-1 text-xs ${metrics.cast1Var >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                  ({metrics.cast1Var >= 0 ? '+' : ''}{metrics.cast1Var.toFixed(1)}%)
                                </span>
                              )}
                            </span>
                          </div>
                          <div>
                            <span className="text-xs font-black text-slate-400 uppercase block">Ontem</span>
                            <span className="text-sm lg:text-base font-black text-blue-600 font-mono">
                              {renderWeight(metrics.machineYesterdayMap['Cast 1'] || 0, 'text-[0.7em] font-extrabold text-blue-600 ml-0.5')}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Cast 2 Detail */}
                      <div className="bg-white border-2 border-indigo-200 rounded-3xl p-5 shadow-md flex justify-between items-center">
                        <div>
                          <div className="flex items-center gap-2 text-sm md:text-base font-black text-indigo-600 uppercase">
                            <span className="w-3.5 h-3.5 rounded-full bg-indigo-600"></span> Cast 2
                          </div>
                          <div className="text-2xl lg:text-3xl 2xl:text-4xl font-black text-slate-900 font-mono mt-1">
                            {renderWeight(metrics.machineMonthMap['Cast 2'] || 0)}
                          </div>
                        </div>
                        <div className="text-right space-y-1">
                          <div>
                            <span className="text-xs font-black text-slate-400 uppercase block">Mês Ant. ({metrics.prevMonthName})</span>
                            <span className="text-sm lg:text-base font-black text-slate-700 font-mono">
                              {renderWeight(metrics.prevMachineMap['Cast 2'] || 0, 'text-[0.7em] font-extrabold text-slate-600 ml-0.5')}
                              {metrics.cast2Var !== null && (
                                <span className={`ml-1 text-xs ${metrics.cast2Var >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                  ({metrics.cast2Var >= 0 ? '+' : ''}{metrics.cast2Var.toFixed(1)}%)
                                </span>
                              )}
                            </span>
                          </div>
                          <div>
                            <span className="text-xs font-black text-slate-400 uppercase block">Ontem</span>
                            <span className="text-sm lg:text-base font-black text-indigo-600 font-mono">
                              {renderWeight(metrics.machineYesterdayMap['Cast 2'] || 0, 'text-[0.7em] font-extrabold text-indigo-600 ml-0.5')}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Erema Detail */}
                      <div className="bg-white border-2 border-teal-200 rounded-3xl p-5 shadow-md flex justify-between items-center">
                        <div>
                          <div className="flex items-center gap-2 text-sm md:text-base font-black text-teal-600 uppercase">
                            <span className="w-3.5 h-3.5 rounded-full bg-teal-600"></span> Erema
                          </div>
                          <div className="text-2xl lg:text-3xl 2xl:text-4xl font-black text-slate-900 font-mono mt-1">
                            {renderWeight(metrics.eremaMonthTotal)}
                          </div>
                        </div>
                        <div className="text-right space-y-1">
                          <div>
                            <span className="text-xs font-black text-slate-400 uppercase block">Mês Ant. ({metrics.prevMonthName})</span>
                            <span className="text-sm lg:text-base font-black text-slate-700 font-mono">
                              {renderWeight(metrics.prevMachineMap['Erema'] || 0, 'text-[0.7em] font-extrabold text-slate-600 ml-0.5')}
                              {metrics.eremaVar !== null && (
                                <span className={`ml-1 text-xs ${metrics.eremaVar >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                  ({metrics.eremaVar >= 0 ? '+' : ''}{metrics.eremaVar.toFixed(1)}%)
                                </span>
                              )}
                            </span>
                          </div>
                          <div>
                            <span className="text-xs font-black text-slate-400 uppercase block">Ontem</span>
                            <span className="text-sm lg:text-base font-black text-teal-600 font-mono">
                              {renderWeight(metrics.machineYesterdayMap['Erema'] || 0, 'text-[0.7em] font-extrabold text-teal-600 ml-0.5')}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Corte de Fita Detail */}
                      <div className="bg-white border-2 border-purple-200 rounded-3xl p-5 shadow-md flex justify-between items-center">
                        <div>
                          <div className="flex items-center gap-2 text-sm md:text-base font-black text-purple-600 uppercase">
                            <span className="w-3.5 h-3.5 rounded-full bg-purple-600"></span> Corte de Fita
                          </div>
                          <div className="text-2xl lg:text-3xl 2xl:text-4xl font-black text-slate-900 font-mono mt-1">
                            {renderM2(metrics.ribbonMonthM2)}
                          </div>
                        </div>
                        <div className="text-right space-y-1">
                          <div>
                            <span className="text-xs font-black text-slate-400 uppercase block">Mês Ant. ({metrics.prevMonthName})</span>
                            <span className="text-sm lg:text-base font-black text-slate-700 font-mono">
                              {renderM2(metrics.prevMonthRibbonM2, 'text-[0.7em] font-extrabold text-slate-600 ml-0.5')}
                              {metrics.ribbonVar !== null && (
                                <span className={`ml-1 text-xs ${metrics.ribbonVar >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                  ({metrics.ribbonVar >= 0 ? '+' : ''}{metrics.ribbonVar.toFixed(1)}%)
                                </span>
                              )}
                            </span>
                          </div>
                          <div>
                            <span className="text-xs font-black text-slate-400 uppercase block">Ontem</span>
                            <span className="text-sm lg:text-base font-black text-purple-600 font-mono">
                              {renderM2(metrics.ribbonYesterdayM2, 'text-[0.7em] font-extrabold text-purple-600 ml-0.5')}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* SLIDE 2: EVOLUÇÃO DIÁRIA & GRÁFICO DE TURNOS E PERDAS */}
              {currentSlide === 2 && (
                <div className="w-full flex-1 flex flex-col justify-between gap-6">
                  {!isFullscreen && (
                    <div className="flex items-center justify-between border-b-2 border-slate-200 pb-4">
                      <h2 className="text-2xl md:text-3xl lg:text-4xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-3">
                        <TrendingUp className="w-8 h-8 text-emerald-600" /> Gráficos de Evolução Diária & Perdas
                      </h2>
                      <span className="text-sm md:text-base font-mono font-black text-emerald-700 bg-emerald-50 px-4 py-1.5 rounded-full border border-emerald-200">
                        Análise de Tendência
                      </span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 my-auto min-h-[460px]">
                    {/* Area Chart: Daily Progression */}
                    <div className="lg:col-span-2 bg-white border-2 border-slate-200 rounded-3xl p-6 lg:p-8 shadow-md flex flex-col justify-between">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-base md:text-lg lg:text-xl font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                          <Activity className="w-6 h-6 text-emerald-600" /> Evolução do Volume de Produção Diário
                        </h3>
                        <div className="flex items-center gap-4 text-sm md:text-base font-extrabold">
                          <span className="flex items-center gap-2 text-blue-600">
                            <span className="w-3.5 h-3.5 rounded-full bg-blue-600"></span> Cast 1
                          </span>
                          <span className="flex items-center gap-2 text-indigo-600">
                            <span className="w-3.5 h-3.5 rounded-full bg-indigo-600"></span> Cast 2
                          </span>
                        </div>
                      </div>

                      <div className="w-full h-[360px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={metrics.dailyChartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                            <defs>
                              <linearGradient id="colorCast1" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#2563eb" stopOpacity={0.8} />
                                <stop offset="95%" stopColor="#2563eb" stopOpacity={0.1} />
                              </linearGradient>
                              <linearGradient id="colorCast2" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.8} />
                                <stop offset="95%" stopColor="#4f46e5" stopOpacity={0.1} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" vertical={false} />
                            <XAxis dataKey="day" stroke="#475569" tick={{ fill: '#334155', fontSize: 13, fontWeight: 800 }} />
                            <YAxis stroke="#475569" tick={{ fill: '#334155', fontSize: 13, fontWeight: 700 }} tickFormatter={(val: number) => formatWeightStr(val)} />
                            <Tooltip
                              contentStyle={{ backgroundColor: '#ffffff', borderColor: '#cbd5e1', borderRadius: '1rem', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontSize: '16px', fontWeight: 'bold' }}
                              formatter={(value: number) => [formatWeightStr(value), 'Volume']}
                            />
                            <Area type="monotone" dataKey="cast1" name="Cast 1" stroke="#2563eb" strokeWidth={4} fillOpacity={1} fill="url(#colorCast1)" stackId="1" />
                            <Area type="monotone" dataKey="cast2" name="Cast 2" stroke="#4f46e5" strokeWidth={4} fillOpacity={1} fill="url(#colorCast2)" stackId="1" />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Scrap / Loss Distribution Donut Chart */}
                    <div className="bg-white border-2 border-slate-200 rounded-3xl p-6 lg:p-8 shadow-md flex flex-col justify-between">
                      <h3 className="text-base md:text-lg font-black text-slate-800 uppercase tracking-widest mb-3 flex items-center gap-2">
                        <Flame className="w-6 h-6 text-amber-500" /> Distribuição de Refilo e Perdas
                      </h3>

                      <div className="w-full h-[240px] relative flex items-center justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={metrics.scrapDistributionData}
                              cx="50%"
                              cy="50%"
                              innerRadius={65}
                              outerRadius={95}
                              paddingAngle={5}
                              dataKey="value"
                            >
                              {metrics.scrapDistributionData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip
                              contentStyle={{ backgroundColor: '#ffffff', borderColor: '#cbd5e1', borderRadius: '1rem', fontSize: '15px', fontWeight: 'bold' }}
                              formatter={(val: number) => [formatWeightStr(val), 'Volume']}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>

                      <div className="space-y-3 pt-4 border-t-2 border-slate-100 mt-2">
                        {metrics.scrapDistributionData.map((item, idx) => (
                          <div key={idx} className="flex items-center justify-between text-sm lg:text-base font-bold text-slate-700">
                            <span className="flex items-center gap-2">
                              <span className="w-4 h-4 rounded-full" style={{ backgroundColor: item.color }}></span>
                              {item.name}:
                            </span>
                            <span className="font-mono font-black text-slate-900">{renderWeight(item.value, 'text-[0.7em] font-extrabold text-slate-600 ml-0.5')}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* SLIDE 3: RANKING DE OPERADORES DE EXTRUSÃO */}
              {currentSlide === 3 && (
                <div className="w-full flex-1 flex flex-col justify-between gap-6">
                  {!isFullscreen && (
                    <div className="flex items-center justify-between border-b-2 border-slate-200 pb-4">
                      <h2 className="text-2xl md:text-3xl lg:text-4xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-3">
                        <Award className="w-8 h-8 text-amber-500" /> Ranking de Melhores Operadores do Mês
                      </h2>
                      <span className="text-sm md:text-base font-mono font-black text-amber-700 bg-amber-50 px-4 py-1.5 rounded-full border border-amber-200">
                        Líderes de Produtividade
                      </span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 my-auto">
                    {metrics.topOperators.slice(0, 6).map((op, index) => {
                      const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`;
                      const isTop3 = index < 3;

                      return (
                        <div
                          key={index}
                          className={`bg-white rounded-3xl p-6 lg:p-8 border-2 shadow-md flex items-center gap-6 relative overflow-hidden transition-all ${
                            index === 0
                              ? 'border-amber-400 bg-gradient-to-br from-amber-50/80 via-white to-amber-100/40 shadow-lg'
                              : isTop3
                              ? 'border-slate-300'
                              : 'border-slate-200'
                          }`}
                        >
                          <div className={`text-3xl lg:text-4xl font-black w-16 h-16 lg:w-20 lg:h-20 flex items-center justify-center rounded-2xl shrink-0 border ${
                            index === 0
                              ? 'bg-amber-400 text-slate-900 border-amber-300 shadow-md'
                              : 'bg-slate-100 text-slate-700 border-slate-200'
                          }`}>
                            {medal}
                          </div>

                          <div className="min-w-0 flex-1">
                            <h3 className="text-2xl md:text-3xl font-black text-slate-900 truncate tracking-tight">{op.name}</h3>
                            <p className="text-sm md:text-base font-bold text-slate-500 uppercase tracking-wider mt-1">{op.machine}</p>
                            <div className="text-3xl lg:text-4xl font-mono font-black text-emerald-600 mt-2">
                              {renderWeight(op.totalNet)}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        ) : (
          /* GRID VIEW: VISTA COMPLETA DE TV */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 h-full overflow-y-auto pr-2 pb-10">
            {/* Yesterday Card */}
            <div className="bg-white border-2 border-blue-200 rounded-3xl p-6 lg:p-8 shadow-md">
              <span className="text-sm md:text-base font-black text-blue-700 uppercase tracking-widest block mb-2">
                Produção Ontem
              </span>
              <div className="text-4xl lg:text-5xl font-black text-slate-900 font-mono my-3">
                {renderWeight(metrics.yesterdayProdTotal)}
              </div>
              <div className="text-sm font-bold text-slate-600 pt-3 border-t-2 border-slate-100">
                Corte de Fita: <span className="text-indigo-600 font-black">{renderM2(metrics.ribbonYesterdayM2, 'text-[0.7em] font-extrabold text-indigo-600 ml-0.5')}</span>
              </div>
            </div>

            {/* Goal Card */}
            <div className="bg-white border-2 border-emerald-200 rounded-3xl p-6 lg:p-8 shadow-md">
              <span className="text-sm md:text-base font-black text-emerald-700 uppercase tracking-widest block mb-2">
                Meta do Mês
              </span>
              <div className="text-4xl lg:text-5xl font-black text-slate-900 font-mono my-3">
                {renderWeight(metrics.prodMonthTotal)}
              </div>
              <div className="text-sm font-bold text-emerald-600">
                {metrics.goalPercent.toFixed(1)}% Atingido da Meta ({renderWeight(metrics.currentGoal, 'text-[0.7em] font-extrabold text-emerald-600 ml-0.5')})
              </div>
            </div>

            {/* Projection Card */}
            <div className="bg-white border-2 border-indigo-200 rounded-3xl p-6 lg:p-8 shadow-md">
              <span className="text-sm md:text-base font-black text-indigo-700 uppercase tracking-widest block mb-2">
                Projeção Fechamento
              </span>
              <div className="text-4xl lg:text-5xl font-black text-indigo-600 font-mono my-3">
                {renderWeight(metrics.projectedMonthTotal)}
              </div>
              <div className="text-sm font-bold text-slate-600">
                Média Necessária: <span className="text-amber-600 font-black">{renderWeight(metrics.dailyGoalRequired, 'text-[0.55em] font-extrabold text-amber-600 ml-0.5', '/dia')}</span>
              </div>
            </div>

            {/* Eco B Card */}
            <div className="bg-white border-2 border-amber-200 rounded-3xl p-6 lg:p-8 shadow-md">
              <span className="text-sm md:text-base font-black text-amber-700 uppercase tracking-widest block mb-2">
                Total Eco B Produzido
              </span>
              <div className="text-4xl lg:text-5xl font-black text-amber-600 font-mono my-3">
                {renderWeight(metrics.totalEcoB)}
              </div>
              <div className="text-sm font-bold text-slate-600">
                Eco BP: {renderWeight(metrics.totalEcoBP, 'text-[0.7em] font-extrabold text-slate-600 ml-0.5')} | Eco BM: {renderWeight(metrics.totalEcoBM, 'text-[0.7em] font-extrabold text-slate-600 ml-0.5')}
              </div>
            </div>

            {/* Big Chart Row */}
            <div className="lg:col-span-3 bg-white border-2 border-slate-200 rounded-3xl p-6 lg:p-8 shadow-md min-h-[420px] flex flex-col justify-between">
              <h3 className="text-base md:text-lg font-black text-slate-800 uppercase mb-4">
                Evolução Diária da Produção x Meta
              </h3>
              <div className="w-full h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={metrics.dailyChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" vertical={false} />
                    <XAxis dataKey="day" stroke="#475569" tick={{ fill: '#334155', fontSize: 13, fontWeight: 700 }} />
                    <YAxis stroke="#475569" tick={{ fill: '#334155', fontSize: 13, fontWeight: 700 }} tickFormatter={(val: number) => formatWeightStr(val)} />
                    <Tooltip formatter={(val: number) => [formatWeightStr(val), 'Volume']} />
                    <Bar dataKey="cast1" name="Cast 1" fill="#2563eb" stackId="a" />
                    <Bar dataKey="cast2" name="Cast 2" fill="#4f46e5" stackId="a" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Best Operator Card */}
            <div className="bg-gradient-to-br from-amber-50 to-white border-2 border-amber-300 rounded-3xl p-6 lg:p-8 shadow-md flex flex-col justify-between">
              <div>
                <span className="text-sm font-black text-amber-800 uppercase tracking-widest flex items-center gap-2">
                  <Trophy className="w-6 h-6 text-amber-500" /> Destaque do Mês
                </span>
                <div className="my-6">
                  <h4 className="text-3xl font-black text-slate-900">{metrics.bestOperator.name}</h4>
                  <p className="text-sm font-black text-amber-700 uppercase mt-2">
                    Equipamento: {metrics.bestOperator.machine}
                  </p>
                </div>
              </div>
              <div className="text-4xl font-mono font-black text-emerald-600">
                {renderWeight(metrics.bestOperator.totalNet)}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer Status Bar */}
      <footer className="bg-white border-t-2 border-slate-200 px-6 py-3 flex items-center justify-between text-xs md:text-sm font-extrabold text-slate-600 shrink-0 shadow-sm">
        <div className="flex items-center gap-6">
          <span className="flex items-center gap-2 text-slate-800">
            <span className="w-3 h-3 rounded-full bg-emerald-500"></span> Sistema de Monitoramento Industrial TV
          </span>
          <span className="hidden md:inline text-slate-400">•</span>
          <span className="hidden md:inline">
            Tempo de Rotação: <strong className="text-slate-900 font-mono">{slideDuration} segundos por slide</strong>
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span>Pressione ESC ou clique em X para sair</span>
        </div>
      </footer>
    </div>
  );
};
