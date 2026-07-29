import React, { useState, useMemo, useEffect } from 'react';
import { 
  X, Calendar, Download, Printer, Copy, Check, Presentation, ChevronLeft, ChevronRight,
  TrendingUp, TrendingDown, Package, Clock, ShieldAlert, Award, FileSpreadsheet,
  Layers, Cpu, Sparkles, AlertCircle, BarChart3, CheckCircle2, MessageSquare, Wrench, Share2
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, PieChart, Pie, Cell } from 'recharts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ProductionEntry, RibbonCuttingEntry, Employee } from '../types';

interface WeeklyProductionSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  productionData: ProductionEntry[];
  ribbonData: RibbonCuttingEntry[];
  employees?: Employee[];
}

// Helper to format weights and numbers nicely
const formatKg = (val: number) => {
  return val.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + ' Kg';
};

const formatM2 = (val: number) => {
  return val.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ' m²';
};

const formatMinToHours = (min: number) => {
  if (!min) return '0h 00m';
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h}h ${m < 10 ? '0' : ''}${m}m`;
};

// Get ISO Week string or Date range
function getWeekRange(date: Date) {
  const d = new Date(date);
  const day = d.getDay();
  // Set to Monday of the week
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diff));
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  return { monday, sunday };
}

function formatDateISO(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function formatDateBR(dateStr: string) {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}

export const WeeklyProductionSummaryModal: React.FC<WeeklyProductionSummaryModalProps> = ({
  isOpen,
  onClose,
  productionData = [],
  ribbonData = [],
  employees = [],
}) => {
  // Current reference week date
  const [refDate, setRefDate] = useState<Date>(() => new Date());
  const [mode, setMode] = useState<'standard' | 'presentation'>('standard');
  const [copiedText, setCopiedText] = useState(false);
  const [activeTab, setActiveTab] = useState<'consolidated' | 'extrusion' | 'ribbon' | 'notes'>('consolidated');

  // Compute week bounds
  const { monday, sunday } = useMemo(() => getWeekRange(refDate), [refDate]);
  const mondayStr = useMemo(() => formatDateISO(monday), [monday]);
  const sundayStr = useMemo(() => formatDateISO(sunday), [sunday]);

  // Notes state saved per week in localStorage
  const weekKey = `meeting_notes_${mondayStr}_${sundayStr}`;
  const [meetingNotes, setMeetingNotes] = useState<string>(() => {
    try {
      return localStorage.getItem(weekKey) || '';
    } catch {
      return '';
    }
  });

  useEffect(() => {
    try {
      const saved = localStorage.getItem(weekKey);
      setMeetingNotes(saved || '');
    } catch {
      setMeetingNotes('');
    }
  }, [weekKey]);

  const handleNotesChange = (txt: string) => {
    setMeetingNotes(txt);
    try {
      localStorage.setItem(weekKey, txt);
    } catch {}
  };

  // Week navigation
  const handlePrevWeek = () => {
    const prev = new Date(refDate);
    prev.setDate(prev.getDate() - 7);
    setRefDate(prev);
  };

  const handleNextWeek = () => {
    const next = new Date(refDate);
    next.setDate(next.getDate() + 7);
    setRefDate(next);
  };

  const handleCurrentWeek = () => {
    setRefDate(new Date());
  };

  // --- FILTER DATA FOR SELECTED WEEK ---
  const weeklyExtrusionData = useMemo(() => {
    return productionData.filter(item => {
      if (!item.date) return false;
      return item.date >= mondayStr && item.date <= sundayStr;
    });
  }, [productionData, mondayStr, sundayStr]);

  const weeklyRibbonData = useMemo(() => {
    return ribbonData.filter(item => {
      if (!item.date) return false;
      return item.date >= mondayStr && item.date <= sundayStr;
    });
  }, [ribbonData, mondayStr, sundayStr]);

  // --- PREVIOUS WEEK DATA FOR COMPARISON ---
  const prevMonday = useMemo(() => {
    const d = new Date(monday);
    d.setDate(d.getDate() - 7);
    return formatDateISO(d);
  }, [monday]);

  const prevSunday = useMemo(() => {
    const d = new Date(sunday);
    d.setDate(d.getDate() - 7);
    return formatDateISO(d);
  }, [sunday]);

  const prevExtrusionData = useMemo(() => {
    return productionData.filter(item => item.date >= prevMonday && item.date <= prevSunday);
  }, [productionData, prevMonday, prevSunday]);

  const prevRibbonData = useMemo(() => {
    return ribbonData.filter(item => item.date >= prevMonday && item.date <= prevSunday);
  }, [ribbonData, prevMonday, prevSunday]);

  // --- EXTRUSION CALCULATIONS ---
  const extStats = useMemo(() => {
    let grossKg = 0;
    let taraKg = 0;
    let netKg = 0;
    let ecoA = 0;
    let ecoBP = 0;
    let ecoBM = 0;
    let borra = 0;
    let maintMin = 0;
    let procMin = 0;
    let otherMin = 0;
    let eremaKg = 0;
    let eremaBags = 0;

    const machineMap: Record<string, { netKg: number; grossKg: number; ecoA: number; borra: number }> = {};
    const opMap: Record<string, { netKg: number; entries: number; ecoA: number; borra: number }> = {};
    const shiftMap: Record<string, { netKg: number; entries: number }> = {};
    const datesSet = new Set<string>();

    const machineDowntimeMap: Record<string, {
      name: string;
      maintMin: number;
      procMin: number;
      otherMin: number;
      totalStopMin: number;
      reasons: string[];
    }> = {
      'Cast 1': { name: 'Cast 1', maintMin: 0, procMin: 0, otherMin: 0, totalStopMin: 0, reasons: [] },
      'Cast 2': { name: 'Cast 2', maintMin: 0, procMin: 0, otherMin: 0, totalStopMin: 0, reasons: [] },
      'Erema':  { name: 'Erema',  maintMin: 0, procMin: 0, otherMin: 0, totalStopMin: 0, reasons: [] },
    };

    weeklyExtrusionData.forEach(e => {
      if (e.date) datesSet.add(e.date);
      const isStopped = e.isMaintenanceEntry || e.isNoWorkDay;

      // Track Machine Downtime by Machine Name
      const rawM = (e.machine || '').trim().toLowerCase();
      let mKey = 'Cast 1';
      if (rawM.includes('cast 1') || rawM.includes('cast1')) mKey = 'Cast 1';
      else if (rawM.includes('cast 2') || rawM.includes('cast2')) mKey = 'Cast 2';
      else if (rawM.includes('erema')) mKey = 'Erema';
      else if (e.machine && e.machine.trim()) mKey = e.machine.trim();

      if (!machineDowntimeMap[mKey]) {
        machineDowntimeMap[mKey] = { name: mKey, maintMin: 0, procMin: 0, otherMin: 0, totalStopMin: 0, reasons: [] };
      }

      const eMaint = Number(e.manutencaoMin || 0);
      const eProc = Number(e.processoMin || 0);
      const eOther = Number(e.outrosMin || 0);
      const eTotalStop = eMaint + eProc + eOther;

      machineDowntimeMap[mKey].maintMin += eMaint;
      machineDowntimeMap[mKey].procMin += eProc;
      machineDowntimeMap[mKey].otherMin += eOther;
      machineDowntimeMap[mKey].totalStopMin += eTotalStop;

      if (e.manutencaoMotivo && e.manutencaoMotivo.trim()) {
        const r = `Manutenção: ${e.manutencaoMotivo.trim()}`;
        if (!machineDowntimeMap[mKey].reasons.includes(r)) machineDowntimeMap[mKey].reasons.push(r);
      }
      if (e.processoMotivo && e.processoMotivo.trim()) {
        const r = `Processo: ${e.processoMotivo.trim()}`;
        if (!machineDowntimeMap[mKey].reasons.includes(r)) machineDowntimeMap[mKey].reasons.push(r);
      }
      if (e.outrosMotivo && e.outrosMotivo.trim()) {
        const r = `Outros: ${e.outrosMotivo.trim()}`;
        if (!machineDowntimeMap[mKey].reasons.includes(r)) machineDowntimeMap[mKey].reasons.push(r);
      }
      if (e.noWorkReason && e.noWorkReason.trim()) {
        const r = `Sem Trabalho: ${e.noWorkReason.trim()}`;
        if (!machineDowntimeMap[mKey].reasons.includes(r)) machineDowntimeMap[mKey].reasons.push(r);
      }

      if (!isStopped) {
        grossKg += Number(e.grossWeight || 0);
        taraKg += Number(e.tara || 0);
        netKg += Number(e.netWeight || 0);
        ecoA += Number(e.ecoA || 0);
        ecoBP += Number(e.ecoBP || 0);
        ecoBM += Number(e.ecoBM || 0);
        borra += Number(e.borraTotal || 0);

        // Machine breakdown
        const m = (e.machine || 'Sem Máquina').toLowerCase().trim();
        if (!machineMap[m]) machineMap[m] = { netKg: 0, grossKg: 0, ecoA: 0, borra: 0 };
        machineMap[m].netKg += Number(e.netWeight || 0);
        machineMap[m].grossKg += Number(e.grossWeight || 0);
        machineMap[m].ecoA += Number(e.ecoA || 0);
        machineMap[m].borra += Number(e.borraTotal || 0);

        // Operator breakdown
        if (e.operator && e.operator !== 'PARADA' && e.operator !== 'SEM APONTAMENTO') {
          const op = e.operator;
          if (!opMap[op]) opMap[op] = { netKg: 0, entries: 0, ecoA: 0, borra: 0 };
          opMap[op].netKg += Number(e.netWeight || 0);
          opMap[op].entries += 1;
          opMap[op].ecoA += Number(e.ecoA || 0);
          opMap[op].borra += Number(e.borraTotal || 0);
        }

        // Shift breakdown
        if (e.shift) {
          const sh = e.shift;
          if (!shiftMap[sh]) shiftMap[sh] = { netKg: 0, entries: 0 };
          shiftMap[sh].netKg += Number(e.netWeight || 0);
          shiftMap[sh].entries += 1;
        }

        // Erema recycled
        if (m.includes('erema')) {
          eremaKg += Number(e.netWeight || 0);
        }
        if (e.recycledUsed) eremaKg += Number(e.recycledUsed || 0);
        if (e.recycledBags) eremaBags += Number(e.recycledBags || 0);
      }

      maintMin += eMaint;
      procMin += eProc;
      otherMin += eOther;
    });

    const activeDays = Math.max(1, datesSet.size);
    const avgDailyNetKg = netKg / activeDays;
    const totalRefuseKg = ecoA + ecoBP + ecoBM + borra;
    const totalStopMin = maintMin + procMin + otherMin;
    const scrapRatio = grossKg > 0 ? (totalRefuseKg / grossKg) * 100 : 0;

    // Sort operators
    const topOperators = Object.entries(opMap)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.netKg - a.netKg)
      .slice(0, 5);

    return {
      grossKg,
      taraKg,
      netKg,
      ecoA,
      ecoBP,
      ecoBM,
      borra,
      totalRefuseKg,
      scrapRatio,
      maintMin,
      procMin,
      otherMin,
      totalStopMin,
      eremaKg,
      eremaBags,
      activeDays,
      avgDailyNetKg,
      machineMap,
      shiftMap,
      topOperators,
      machineDowntimeMap,
      entriesCount: weeklyExtrusionData.length,
    };
  }, [weeklyExtrusionData]);

  // Previous week Extrusion totals
  const prevExtNetKg = useMemo(() => {
    return prevExtrusionData.reduce((acc, curr) => acc + Number(curr.netWeight || 0), 0);
  }, [prevExtrusionData]);

  // --- RIBBON CUTTING CALCULATIONS ---
  const ribbonStats = useMemo(() => {
    let producedM2 = 0;
    let rejectedM2 = 0;
    let wasteKg = 0;
    let jumboM2 = 0;
    let totalRolls = 0;
    let stoppedMin = 0;

    const typeMap: Record<string, { jumboM2: number; producedM2: number; wasteKg: number }> = {};
    const opMap: Record<string, { producedM2: number; rejectedM2: number; wasteKg: number; entries: number }> = {};
    const shiftMap: Record<string, { producedM2: number; entries: number }> = {};
    const datesSet = new Set<string>();

    weeklyRibbonData.forEach(item => {
      if (item.date) datesSet.add(item.date);

      producedM2 += Number(item.producedM2 || 0);
      rejectedM2 += Number(item.rejectedM2 || 0);
      wasteKg += Number(item.wasteWeight || 0);
      jumboM2 += Number(item.jumboM2 || 0);
      totalRolls += Number(item.rollsCount || 0);

      const stMin = Number(item.stoppedMinutes || 0) + Number(item.manutencaoMin || 0) + Number(item.processoMin || 0) + Number(item.outrosMin || 0);
      stoppedMin += stMin;

      // Jumbo type breakdown
      const jt = (item.jumboType || 'Outro').toUpperCase().trim();
      if (!typeMap[jt]) typeMap[jt] = { jumboM2: 0, producedM2: 0, wasteKg: 0 };
      typeMap[jt].jumboM2 += Number(item.jumboM2 || 0);
      typeMap[jt].producedM2 += Number(item.producedM2 || 0);
      typeMap[jt].wasteKg += Number(item.wasteWeight || 0);

      // Operator breakdown
      if (item.operator) {
        const op = item.operator;
        if (!opMap[op]) opMap[op] = { producedM2: 0, rejectedM2: 0, wasteKg: 0, entries: 0 };
        opMap[op].producedM2 += Number(item.producedM2 || 0);
        opMap[op].rejectedM2 += Number(item.rejectedM2 || 0);
        opMap[op].wasteKg += Number(item.wasteWeight || 0);
        opMap[op].entries += 1;
      }

      // Shift breakdown
      if (item.shift) {
        const sh = item.shift;
        if (!shiftMap[sh]) shiftMap[sh] = { producedM2: 0, entries: 0 };
        shiftMap[sh].producedM2 += Number(item.producedM2 || 0);
        shiftMap[sh].entries += 1;
      }
    });

    const activeDays = Math.max(1, datesSet.size);
    const avgDailyProducedM2 = producedM2 / activeDays;
    const yieldRate = jumboM2 > 0 ? (producedM2 / jumboM2) * 100 : 0;
    const jumbosEquivalent = jumboM2 / 6000; // Standard jumbo approx 6000 m²

    // Top cutters
    const topCutters = Object.entries(opMap)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.producedM2 - a.producedM2)
      .slice(0, 5);

    return {
      producedM2,
      rejectedM2,
      wasteKg,
      jumboM2,
      jumbosEquivalent,
      totalRolls,
      stoppedMin,
      yieldRate,
      activeDays,
      avgDailyProducedM2,
      typeMap,
      shiftMap,
      topCutters,
      entriesCount: weeklyRibbonData.length,
    };
  }, [weeklyRibbonData]);

  // Previous week Ribbon totals
  const prevRibbonProducedM2 = useMemo(() => {
    return prevRibbonData.reduce((acc, curr) => acc + Number(curr.producedM2 || 0), 0);
  }, [prevRibbonData]);

  // Variations %
  const extVariation = prevExtNetKg > 0 ? ((extStats.netKg - prevExtNetKg) / prevExtNetKg) * 100 : 0;
  const ribbonVariation = prevRibbonProducedM2 > 0 ? ((ribbonStats.producedM2 - prevRibbonProducedM2) / prevRibbonProducedM2) * 100 : 0;

  // Chart Data: Extrusion daily breakdown for the week
  const dailyExtrusionChart = useMemo(() => {
    const map: Record<string, { date: string; cast1: number; cast2: number; netTotal: number }> = {};
    weeklyExtrusionData.forEach(e => {
      const d = formatDateBR(e.date);
      if (!map[d]) map[d] = { date: d, cast1: 0, cast2: 0, netTotal: 0 };
      const m = (e.machine || '').toLowerCase();
      const net = Number(e.netWeight || 0);
      map[d].netTotal += net;
      if (m.includes('cast 1')) map[d].cast1 += net;
      if (m.includes('cast 2')) map[d].cast2 += net;
    });
    return Object.values(map);
  }, [weeklyExtrusionData]);

  // Chart Data: Ribbon daily breakdown for the week
  const dailyRibbonChart = useMemo(() => {
    const map: Record<string, { date: string; producedM2: number; jumboM2: number }> = {};
    weeklyRibbonData.forEach(r => {
      const d = formatDateBR(r.date);
      if (!map[d]) map[d] = { date: d, producedM2: 0, jumboM2: 0 };
      map[d].producedM2 += Number(r.producedM2 || 0);
      map[d].jumboM2 += Number(r.jumboM2 || 0);
    });
    return Object.values(map);
  }, [weeklyRibbonData]);

  // Chart Data: Jumbo Types Pie
  const jumboPieData = useMemo(() => {
    const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#64748b'];
    return (Object.entries(ribbonStats.typeMap) as [string, { jumboM2: number; producedM2: number; wasteKg: number }][]).map(([type, val], idx) => ({
      name: type,
      value: val.producedM2,
      color: COLORS[idx % COLORS.length]
    })).filter(item => item.value > 0);
  }, [ribbonStats.typeMap]);

  // --- GENERATE PLAIN TEXT SUMMARY (FOR WHATSAPP / EMAIL) ---
  const handleCopyTextSummary = () => {
    const text = `
📊 *RESUMO EXECUTIVO SEMANAL DE PRODUÇÃO*
🗓️ *Período:* ${formatDateBR(mondayStr)} a ${formatDateBR(sundayStr)}

🏭 *1. EXTRUSÃO (PLÁSTICO & EREMA)*
• Produção Líquida Total: *${formatKg(extStats.netKg)}*
• Média Diária: *${formatKg(extStats.avgDailyNetKg)}/dia* (${extStats.activeDays} dias ativos)
• Taxa de Sucata/Perda: *${extStats.scrapRatio.toFixed(2)}%* (Total Refugo: ${formatKg(extStats.totalRefuseKg)})
• Reciclagem Erema: *${formatKg(extStats.eremaKg)}* (${extStats.eremaBags} bags)
• Paradas Totais: *${formatMinToHours(extStats.totalStopMin)}* (Manut: ${formatMinToHours(extStats.maintMin)}, Proc: ${formatMinToHours(extStats.procMin)})

🎀 *2. CORTE DE FITA ADESIVA*
• Área Produzida Total: *${formatM2(ribbonStats.producedM2)}* (${ribbonStats.totalRolls.toLocaleString('pt-BR')} un)
• Jumbos Consumidos: *${formatM2(ribbonStats.jumboM2)}* (~${ribbonStats.jumbosEquivalent.toFixed(1)} jumbos)
• Rendimento da Fita: *${ribbonStats.yieldRate.toFixed(1)}%*
• Área Não Conforme: *${formatM2(ribbonStats.rejectedM2)}*
• Sucata em Peso: *${formatKg(ribbonStats.wasteKg)}*

💡 *NOTAS / PAUTAS DA REUNIÃO:*
${meetingNotes.trim() ? meetingNotes.trim() : 'Nenhuma nota registrada para esta semana.'}

----------------------------------------
_Relatório Gerado via Manupackaging Gestão de Produção_
    `.trim();

    navigator.clipboard.writeText(text);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 3000);
  };

  // --- GENERATE PDF REPORT ---
  const handleDownloadPDF = () => {
    const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();

    // Header Background
    doc.setFillColor(15, 23, 42); // slate-900
    doc.rect(0, 0, pageWidth, 35, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(255, 255, 255);
    doc.text('MANUPACKAGING BRASIL', 14, 15);

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(148, 163, 184);
    doc.text('RELATÓRIO SEMANAL EXECUTIVO DE PRODUÇÃO', 14, 22);

    doc.setFontSize(9);
    doc.setTextColor(59, 130, 246);
    doc.text(`Período: ${formatDateBR(mondayStr)} a ${formatDateBR(sundayStr)}`, 14, 29);

    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    doc.text(`Emissão: ${new Date().toLocaleDateString('pt-BR')}`, pageWidth - 14, 29, { align: 'right' });

    let currentY = 42;

    // Extrusion Summary Box
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text('1. RESUMO DE EXTRUSÃO', 14, currentY);
    currentY += 4;

    const extTableData = [
      ['Produção Líquida Total (Kg)', formatKg(extStats.netKg), 'Média Diária (Kg/dia)', formatKg(extStats.avgDailyNetKg)],
      ['Produção Bruta (Kg)', formatKg(extStats.grossKg), 'Taxa de Sucata/Rejeito (%)', `${extStats.scrapRatio.toFixed(2)}%`],
      ['Total Refugo / Perda (Kg)', formatKg(extStats.totalRefuseKg), 'Reciclagem Erema (Kg)', formatKg(extStats.eremaKg)],
      ['Refugo Eco A (Sede)', formatKg(extStats.ecoA), 'Refugo Eco BP', formatKg(extStats.ecoBP)],
      ['Refugo Eco BM', formatKg(extStats.ecoBM), 'Borra Total', formatKg(extStats.borra)],
      ['Tempo Total Paradas', formatMinToHours(extStats.totalStopMin), 'Paradas Manutenção', formatMinToHours(extStats.maintMin)],
    ];

    autoTable(doc, {
      startY: currentY,
      body: extTableData,
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 2.5 },
      headStyles: { fillColor: [30, 41, 59] },
      columnStyles: {
        0: { fontStyle: 'bold', fillColor: [248, 250, 252] },
        1: { fontStyle: 'bold', textColor: [37, 99, 235] },
        2: { fontStyle: 'bold', fillColor: [248, 250, 252] },
        3: { fontStyle: 'bold' },
      },
    });

    currentY = (doc as any).lastAutoTable.finalY + 8;

    // Ribbon Summary Box
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text('2. RESUMO DE CORTE DE FITA ADESIVA', 14, currentY);
    currentY += 4;

    const ribbonTableData = [
      ['Área Produzida Total (m²)', formatM2(ribbonStats.producedM2), 'Rendimento da Fita (%)', `${ribbonStats.yieldRate.toFixed(1)}%`],
      ['Jumbos Consumidos (m²)', formatM2(ribbonStats.jumboM2), 'Equivalente em Jumbos', `~${ribbonStats.jumbosEquivalent.toFixed(1)} Qtd`],
      ['Total de Rollos (unidades)', `${ribbonStats.totalRolls.toLocaleString('pt-BR')} un`, 'Área Não Conforme (m²)', formatM2(ribbonStats.rejectedM2)],
      ['Sucata em Peso (Kg)', formatKg(ribbonStats.wasteKg), 'Tempo de Paradas', formatMinToHours(ribbonStats.stoppedMin)],
    ];

    autoTable(doc, {
      startY: currentY,
      body: ribbonTableData,
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 2.5 },
      columnStyles: {
        0: { fontStyle: 'bold', fillColor: [248, 250, 252] },
        1: { fontStyle: 'bold', textColor: [16, 185, 129] },
        2: { fontStyle: 'bold', fillColor: [248, 250, 252] },
        3: { fontStyle: 'bold' },
      },
    });

    currentY = (doc as any).lastAutoTable.finalY + 8;

    // Operator Rankings Table
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text('3. OPERADORES DESTAQUE DA SEMANA', 14, currentY);
    currentY += 4;

    const opRows = [];
    const maxLen = Math.max(extStats.topOperators.length, ribbonStats.topCutters.length);
    for (let i = 0; i < Math.min(5, maxLen); i++) {
      const extOp = extStats.topOperators[i];
      const ribOp = ribbonStats.topCutters[i];
      opRows.push([
        `#${i + 1} Extrusão`,
        extOp ? extOp.name : '-',
        extOp ? formatKg(extOp.netKg) : '-',
        `#${i + 1} Fita`,
        ribOp ? ribOp.name : '-',
        ribOp ? formatM2(ribOp.producedM2) : '-',
      ]);
    }

    autoTable(doc, {
      startY: currentY,
      head: [['Posição', 'Operador Extrusão', 'Produção (Kg)', 'Posição', 'Operador Fita', 'Produção (m²)']],
      body: opRows,
      theme: 'striped',
      headStyles: { fillColor: [15, 23, 42], fontSize: 8 },
      styles: { fontSize: 8, cellPadding: 2 },
    });

    currentY = (doc as any).lastAutoTable.finalY + 8;

    // Machine Downtime Table
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text('4. INDISPONIBILIDADE DE MÁQUINAS (CAST 1, CAST 2 E EREMA)', 14, currentY);
    currentY += 4;

    const downtimePdfRows = ['Cast 1', 'Cast 2', 'Erema'].map(mName => {
      const dt = extStats.machineDowntimeMap[mName] || { maintMin: 0, procMin: 0, otherMin: 0, totalStopMin: 0, reasons: [] };
      return [
        mName,
        formatMinToHours(dt.maintMin),
        formatMinToHours(dt.procMin),
        formatMinToHours(dt.otherMin),
        formatMinToHours(dt.totalStopMin)
      ];
    });

    autoTable(doc, {
      startY: currentY,
      head: [['Máquina', 'Manutenção', 'Processo', 'Outros', 'Total Parado']],
      body: downtimePdfRows,
      theme: 'grid',
      headStyles: { fillColor: [30, 41, 59], fontSize: 8 },
      styles: { fontSize: 7.5, cellPadding: 2 },
      columnStyles: {
        0: { fontStyle: 'bold', fillColor: [248, 250, 252] },
        4: { fontStyle: 'bold', textColor: [217, 119, 6] },
      }
    });

    currentY = (doc as any).lastAutoTable.finalY + 8;

    // Meeting Notes Section
    if (meetingNotes.trim()) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(15, 23, 42);
      doc.text('5. ATA DA REUNIÃO & PLANO DE AÇÃO', 14, currentY);
      currentY += 5;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(51, 65, 85);

      const splitText = doc.splitTextToSize(meetingNotes, pageWidth - 28);
      doc.text(splitText, 14, currentY);
    }

    // Save PDF
    doc.save(`Resumo_Semanal_Producao_${mondayStr}_a_${sundayStr}.pdf`);
  };

  if (!isOpen) return null;

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-950/80 backdrop-blur-md transition-all animate-in fade-in duration-200 ${
      mode === 'presentation' ? 'p-0 sm:p-0 md:p-0' : ''
    }`}>
      <div className={`bg-slate-900 border border-slate-800 text-white rounded-3xl shadow-2xl flex flex-col w-full overflow-hidden transition-all duration-300 ${
        mode === 'presentation' 
          ? 'h-screen w-screen rounded-none border-none' 
          : 'max-w-6xl max-h-[92vh] h-[92vh]'
      }`}>
        
        {/* TOP BAR / HEADER */}
        <div className="bg-slate-950/90 border-b border-slate-800/80 p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3 shrink-0">
          
          {/* Title & Badge */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20 text-white border border-blue-400/30">
              <Presentation className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg md:text-xl font-black uppercase tracking-wider text-slate-100">
                  Resumo Geral Semanal de Produção
                </h2>
                <span className="px-2.5 py-0.5 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px] font-black uppercase rounded-full tracking-widest hidden sm:inline-block">
                  Apresentação de Reunião
                </span>
              </div>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-0.5 flex items-center gap-2">
                <span>Manupackaging Brasil</span>
                <span className="text-slate-600">•</span>
                <span className="text-emerald-400">Semana Ativa</span>
              </p>
            </div>
          </div>

          {/* Week Selector Bar */}
          <div className="flex items-center gap-1.5 bg-slate-900/90 border border-slate-800 p-1.5 rounded-2xl">
            <button
              onClick={handlePrevWeek}
              className="p-2 hover:bg-slate-800 rounded-xl text-slate-300 hover:text-white transition-all active:scale-95"
              title="Semana Anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="px-3 py-1.5 bg-slate-950 rounded-xl border border-slate-800 text-center min-w-[170px]">
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Semana ({formatDateBR(mondayStr)} a {formatDateBR(sundayStr)})
              </div>
            </div>

            <button
              onClick={handleNextWeek}
              className="p-2 hover:bg-slate-800 rounded-xl text-slate-300 hover:text-white transition-all active:scale-95"
              title="Próxima Semana"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            <button
              onClick={handleCurrentWeek}
              className="px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white border border-blue-500/30 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all"
            >
              Esta Semana
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyTextSummary}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-black uppercase tracking-wider transition-all border border-slate-700 flex items-center gap-1.5 active:scale-95"
              title="Copiar Resumo em Texto para WhatsApp ou Email"
            >
              {copiedText ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              <span className="hidden sm:inline">{copiedText ? 'Copiado!' : 'Copiar Texto'}</span>
            </button>

            <button
              onClick={handleDownloadPDF}
              className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md flex items-center gap-1.5 active:scale-95"
              title="Baixar Relatório Executivo em PDF"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Baixar PDF</span>
            </button>

            <button
              onClick={() => setMode(mode === 'standard' ? 'presentation' : 'standard')}
              className={`px-3 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all border flex items-center gap-1.5 active:scale-95 ${
                mode === 'presentation'
                  ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-lg'
                  : 'bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white border-indigo-500/30'
              }`}
              title="Alternar Modo Apresentação em Tela Cheia"
            >
              <Presentation className="w-4 h-4" />
              <span className="hidden md:inline">{mode === 'presentation' ? 'Sair do Modo TV' : 'Modo TV / Slide'}</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 rounded-xl transition-all"
              title="Fechar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* SUB NAVIGATION TABS */}
        <div className="bg-slate-950/60 border-b border-slate-800/80 px-6 py-2.5 flex items-center gap-2 overflow-x-auto shrink-0">
          <button
            onClick={() => setActiveTab('consolidated')}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 shrink-0 ${
              activeTab === 'consolidated'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Visão Consolidada</span>
          </button>

          <button
            onClick={() => setActiveTab('extrusion')}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 shrink-0 ${
              activeTab === 'extrusion'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Cpu className="w-4 h-4" />
            <span>Extrusão (Plástico)</span>
            <span className="px-2 py-0.5 bg-blue-900/60 text-blue-200 text-[10px] rounded-lg border border-blue-700/50">
              {formatKg(extStats.netKg)}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('ribbon')}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 shrink-0 ${
              activeTab === 'ribbon'
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Corte de Fita</span>
            <span className="px-2 py-0.5 bg-emerald-900/60 text-emerald-200 text-[10px] rounded-lg border border-emerald-700/50">
              {formatM2(ribbonStats.producedM2)}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('notes')}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 shrink-0 ${
              activeTab === 'notes'
                ? 'bg-amber-600 text-white shadow-lg shadow-amber-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>Pautas & Ata da Reunião</span>
            {meetingNotes.trim() && (
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
            )}
          </button>
        </div>

        {/* MAIN SCROLLABLE CONTENT BODY */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 custom-scrollbar">

          {/* TAB 1: CONSOLIDATED EXECUTIVE OVERVIEW */}
          {activeTab === 'consolidated' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              
              {/* COMPARISON BANNER */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Extrusion Card */}
                <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-blue-950/80 rounded-3xl p-6 border border-blue-500/30 shadow-xl relative overflow-hidden">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-blue-500/20 text-blue-400 rounded-2xl border border-blue-500/30">
                        <Cpu className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="text-base font-black text-slate-100 uppercase tracking-wider">Setor de Extrusão</h3>
                        <p className="text-xs text-slate-400 font-bold">Resumo Geral Semanal</p>
                      </div>
                    </div>

                    <div className={`px-3 py-1 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1 border ${
                      extVariation >= 0
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                        : 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                    }`}>
                      {extVariation >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                      <span>{extVariation >= 0 ? `+${extVariation.toFixed(1)}%` : `${extVariation.toFixed(1)}%`} vs sem. ant.</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div className="bg-slate-950/60 rounded-2xl p-3 border border-slate-800">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Produção Líquida</span>
                      <span className="text-lg font-black text-blue-400">{formatKg(extStats.netKg)}</span>
                    </div>

                    <div className="bg-slate-950/60 rounded-2xl p-3 border border-slate-800">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Média Diária</span>
                      <span className="text-lg font-black text-slate-100">{formatKg(extStats.avgDailyNetKg)}</span>
                    </div>

                    <div className="bg-slate-950/60 rounded-2xl p-3 border border-slate-800">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Índice Refugo</span>
                      <span className={`text-lg font-black ${extStats.scrapRatio > 5 ? 'text-rose-400' : 'text-emerald-400'}`}>
                        {extStats.scrapRatio.toFixed(2)}%
                      </span>
                    </div>

                    <div className="bg-slate-950/60 rounded-2xl p-3 border border-slate-800">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Reciclagem Erema</span>
                      <span className="text-lg font-black text-emerald-400">{formatKg(extStats.eremaKg)}</span>
                    </div>

                    <div className="bg-slate-950/60 rounded-2xl p-3 border border-slate-800">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Total Paradas</span>
                      <span className="text-lg font-black text-amber-400">{formatMinToHours(extStats.totalStopMin)}</span>
                    </div>

                    <div className="bg-slate-950/60 rounded-2xl p-3 border border-slate-800">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Dias Ativos</span>
                      <span className="text-lg font-black text-slate-200">{extStats.activeDays} dias</span>
                    </div>
                  </div>
                </div>

                {/* Ribbon Card */}
                <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/80 rounded-3xl p-6 border border-emerald-500/30 shadow-xl relative overflow-hidden">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-2xl border border-emerald-500/30">
                        <Layers className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="text-base font-black text-slate-100 uppercase tracking-wider">Corte de Fita Adesiva</h3>
                        <p className="text-xs text-slate-400 font-bold">Resumo Geral Semanal</p>
                      </div>
                    </div>

                    <div className={`px-3 py-1 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1 border ${
                      ribbonVariation >= 0
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                        : 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                    }`}>
                      {ribbonVariation >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                      <span>{ribbonVariation >= 0 ? `+${ribbonVariation.toFixed(1)}%` : `${ribbonVariation.toFixed(1)}%`} vs sem. ant.</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div className="bg-slate-950/60 rounded-2xl p-3 border border-slate-800">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Área Produzida</span>
                      <span className="text-lg font-black text-emerald-400">{formatM2(ribbonStats.producedM2)}</span>
                    </div>

                    <div className="bg-slate-950/60 rounded-2xl p-3 border border-slate-800">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Total de Rollos</span>
                      <span className="text-lg font-black text-slate-100">{ribbonStats.totalRolls.toLocaleString('pt-BR')} un</span>
                    </div>

                    <div className="bg-slate-950/60 rounded-2xl p-3 border border-slate-800">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Rendimento Fita</span>
                      <span className={`text-lg font-black ${ribbonStats.yieldRate < 85 ? 'text-amber-400' : 'text-emerald-400'}`}>
                        {ribbonStats.yieldRate.toFixed(1)}%
                      </span>
                    </div>

                    <div className="bg-slate-950/60 rounded-2xl p-3 border border-slate-800">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Jumbos Utilizados</span>
                      <span className="text-lg font-black text-blue-400">~{ribbonStats.jumbosEquivalent.toFixed(1)} jumbos</span>
                    </div>

                    <div className="bg-slate-950/60 rounded-2xl p-3 border border-slate-800">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Não Conforme</span>
                      <span className="text-lg font-black text-rose-400">{formatM2(ribbonStats.rejectedM2)}</span>
                    </div>

                    <div className="bg-slate-950/60 rounded-2xl p-3 border border-slate-800">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Sucata Lixo (Kg)</span>
                      <span className="text-lg font-black text-slate-300">{formatKg(ribbonStats.wasteKg)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* TOP OPERATORS OF THE WEEK RANKING */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Top Extrusion Operators */}
                <div className="bg-slate-900 rounded-3xl p-6 border border-slate-800 shadow-lg space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-2">
                      <Award className="w-5 h-5 text-amber-400" />
                      <h4 className="text-sm font-black text-slate-100 uppercase tracking-wider">Top Operadores de Extrusão</h4>
                    </div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Semana Ativa</span>
                  </div>

                  {extStats.topOperators.length === 0 ? (
                    <p className="text-xs text-slate-500 italic text-center py-4">Sem lançamentos de operadores na semana.</p>
                  ) : (
                    <div className="space-y-2.5">
                      {extStats.topOperators.map((op, idx) => (
                        <div key={op.name} className="flex items-center justify-between p-3 bg-slate-950/80 rounded-2xl border border-slate-800/80">
                          <div className="flex items-center gap-3">
                            <span className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-black ${
                              idx === 0 ? 'bg-amber-400 text-slate-950' : idx === 1 ? 'bg-slate-300 text-slate-950' : idx === 2 ? 'bg-amber-700 text-white' : 'bg-slate-800 text-slate-400'
                            }`}>
                              #{idx + 1}
                            </span>
                            <div>
                              <p className="text-xs font-black text-slate-200">{op.name}</p>
                              <p className="text-[10px] text-slate-400 font-medium">{op.entries} apontamento(s)</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="text-sm font-black text-blue-400">{formatKg(op.netKg)}</span>
                            {op.borra > 0 && (
                              <p className="text-[9px] text-rose-400 font-bold">Borra: {formatKg(op.borra)}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Top Ribbon Cutters */}
                <div className="bg-slate-900 rounded-3xl p-6 border border-slate-800 shadow-lg space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-2">
                      <Award className="w-5 h-5 text-emerald-400" />
                      <h4 className="text-sm font-black text-slate-100 uppercase tracking-wider">Top Cortadores de Fita</h4>
                    </div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Semana Ativa</span>
                  </div>

                  {ribbonStats.topCutters.length === 0 ? (
                    <p className="text-xs text-slate-500 italic text-center py-4">Sem lançamentos no setor de fita na semana.</p>
                  ) : (
                    <div className="space-y-2.5">
                      {ribbonStats.topCutters.map((op, idx) => (
                        <div key={op.name} className="flex items-center justify-between p-3 bg-slate-950/80 rounded-2xl border border-slate-800/80">
                          <div className="flex items-center gap-3">
                            <span className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-black ${
                              idx === 0 ? 'bg-emerald-400 text-slate-950' : idx === 1 ? 'bg-slate-300 text-slate-950' : idx === 2 ? 'bg-amber-700 text-white' : 'bg-slate-800 text-slate-400'
                            }`}>
                              #{idx + 1}
                            </span>
                            <div>
                              <p className="text-xs font-black text-slate-200">{op.name}</p>
                              <p className="text-[10px] text-slate-400 font-medium">{op.entries} apontamento(s)</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="text-sm font-black text-emerald-400">{formatM2(op.producedM2)}</span>
                            {op.rejectedM2 > 0 && (
                              <p className="text-[9px] text-rose-400 font-bold">Perda: {formatM2(op.rejectedM2)}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>

              {/* MACHINE DOWNTIME SUMMARY FOR CAST 1, CAST 2, AND EREMA */}
              <div className="bg-slate-900 rounded-3xl p-6 border border-slate-800 shadow-lg space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <Wrench className="w-5 h-5 text-amber-400" />
                    <div>
                      <h4 className="text-sm font-black text-slate-100 uppercase tracking-wider">
                        Indisponibilidade de Máquinas na Semana (Cast 1, Cast 2 e Erema)
                      </h4>
                      <p className="text-xs text-slate-400 font-medium">Tempo de paradas acumulado por categoria (Manutenção, Processo e Outros)</p>
                    </div>
                  </div>
                  <span className="text-xs font-black text-amber-300 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20 uppercase">
                    Total: {formatMinToHours(extStats.totalStopMin)}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {['Cast 1', 'Cast 2', 'Erema'].map((mName) => {
                    const dt = extStats.machineDowntimeMap[mName] || {
                      maintMin: 0, procMin: 0, otherMin: 0, totalStopMin: 0, reasons: []
                    };
                    const isHighStop = dt.totalStopMin > 180; // > 3 horas
                    return (
                      <div key={mName} className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex flex-col justify-between space-y-3">
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-black text-slate-100 uppercase tracking-wide flex items-center gap-2">
                              <span className={`w-2.5 h-2.5 rounded-full ${dt.totalStopMin > 0 ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'}`} />
                              {mName}
                            </span>
                            <span className={`text-xs font-black px-2.5 py-1 rounded-lg border ${
                              dt.totalStopMin === 0 
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                                : isHighStop 
                                ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' 
                                : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                            }`}>
                              {formatMinToHours(dt.totalStopMin)}
                            </span>
                          </div>

                          <div className="grid grid-cols-3 gap-1.5 text-center my-1">
                            <div className="bg-slate-900/80 p-2 rounded-xl border border-slate-800">
                              <span className="text-[9px] font-bold text-slate-400 block uppercase">Manut.</span>
                              <span className="text-xs font-black text-amber-400">{formatMinToHours(dt.maintMin)}</span>
                            </div>
                            <div className="bg-slate-900/80 p-2 rounded-xl border border-slate-800">
                              <span className="text-[9px] font-bold text-slate-400 block uppercase">Proc.</span>
                              <span className="text-xs font-black text-blue-400">{formatMinToHours(dt.procMin)}</span>
                            </div>
                            <div className="bg-slate-900/80 p-2 rounded-xl border border-slate-800">
                              <span className="text-[9px] font-bold text-slate-400 block uppercase">Outros</span>
                              <span className="text-xs font-black text-slate-300">{formatMinToHours(dt.otherMin)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* MEETING NOTES SUMMARY BOX IN CONSOLIDATED TAB */}
              <div className="bg-slate-900 rounded-3xl p-6 border border-slate-800 shadow-lg space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-amber-400" />
                    <h4 className="text-sm font-black text-slate-100 uppercase tracking-wider">Ata e Observações da Reunião de Resultados</h4>
                  </div>
                  <button
                    onClick={() => setActiveTab('notes')}
                    className="text-xs font-black text-amber-400 hover:underline uppercase"
                  >
                    Editar Pautas →
                  </button>
                </div>

                {meetingNotes.trim() ? (
                  <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 text-slate-300 text-xs leading-relaxed whitespace-pre-wrap font-medium">
                    {meetingNotes}
                  </div>
                ) : (
                  <div className="p-6 bg-slate-950/60 rounded-2xl border border-dashed border-slate-800 text-center space-y-2">
                    <p className="text-xs text-slate-500 font-medium">Nenhum plano de ação ou observação digitado para esta semana.</p>
                    <button
                      onClick={() => setActiveTab('notes')}
                      className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase rounded-xl transition-all"
                    >
                      Escrever Notas da Reunião
                    </button>
                  </div>
                )}
              </div>

            </div>
          )}

          {/* TAB 2: EXTRUSION DETAILED ANALYSIS */}
          {activeTab === 'extrusion' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              
              {/* Extrusion Key Stats Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-slate-900 p-5 rounded-3xl border border-slate-800">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Produção Bruta</span>
                  <span className="text-2xl font-black text-slate-100 mt-1 block">{formatKg(extStats.grossKg)}</span>
                  <span className="text-[10px] text-slate-500 mt-1 block">Tara: {formatKg(extStats.taraKg)}</span>
                </div>

                <div className="bg-slate-900 p-5 rounded-3xl border border-slate-800">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Produção Líquida</span>
                  <span className="text-2xl font-black text-blue-400 mt-1 block">{formatKg(extStats.netKg)}</span>
                  <span className="text-[10px] text-blue-300/70 mt-1 block">Média: {formatKg(extStats.avgDailyNetKg)}/dia</span>
                </div>

                <div className="bg-slate-900 p-5 rounded-3xl border border-slate-800">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Refugo / Sucata</span>
                  <span className={`text-2xl font-black mt-1 block ${extStats.scrapRatio > 5 ? 'text-rose-400' : 'text-emerald-400'}`}>
                    {extStats.scrapRatio.toFixed(2)}%
                  </span>
                  <span className="text-[10px] text-slate-400 mt-1 block">Total: {formatKg(extStats.totalRefuseKg)}</span>
                </div>

                <div className="bg-slate-900 p-5 rounded-3xl border border-slate-800">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Erema Reciclagem</span>
                  <span className="text-2xl font-black text-emerald-400 mt-1 block">{formatKg(extStats.eremaKg)}</span>
                  <span className="text-[10px] text-emerald-300/70 mt-1 block">{extStats.eremaBags} Bags Utilizados</span>
                </div>
              </div>

              {/* Extrusion Chart: Daily Output */}
              <div className="bg-slate-900 rounded-3xl p-6 border border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-black text-slate-100 uppercase tracking-wider">Evolução Diária de Produção na Semana</h4>
                    <p className="text-xs text-slate-400 font-medium">Comparativo Cast 1 vs Cast 2 (Kg)</p>
                  </div>
                  <span className="text-[10px] font-black uppercase bg-blue-500/20 text-blue-300 px-3 py-1 rounded-full border border-blue-500/30">
                    Cast 1 / Cast 2
                  </span>
                </div>

                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dailyExtrusionChart} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <XAxis dataKey="date" stroke="#64748b" fontSize={11} />
                      <YAxis stroke="#64748b" fontSize={11} />
                      <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#fff' }} />
                      <Legend />
                      <Bar dataKey="cast1" name="Cast 1 (Kg)" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                      <Bar dataKey="cast2" name="Cast 2 (Kg)" fill="#10b981" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Refuse Breakdown & Downtime Breakdown */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Refuse breakdown */}
                <div className="bg-slate-900 rounded-3xl p-6 border border-slate-800 space-y-4">
                  <h4 className="text-sm font-black text-slate-100 uppercase tracking-wider border-b border-slate-800 pb-3">
                    Detalhamento do Refugo de Extrusão
                  </h4>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-slate-950 rounded-2xl border border-slate-800">
                      <div>
                        <p className="text-xs font-black text-slate-200 uppercase">Eco A (Envio Sede)</p>
                        <p className="text-[10px] text-slate-400 font-medium">Aparas limpas de extrusão</p>
                      </div>
                      <span className="text-sm font-black text-blue-400">{formatKg(extStats.ecoA)}</span>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-slate-950 rounded-2xl border border-slate-800">
                      <div>
                        <p className="text-xs font-black text-slate-200 uppercase">Eco BP (Pequeno)</p>
                        <p className="text-[10px] text-slate-400 font-medium">Bordas e refugo pequeno</p>
                      </div>
                      <span className="text-sm font-black text-amber-400">{formatKg(extStats.ecoBP)}</span>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-slate-950 rounded-2xl border border-slate-800">
                      <div>
                        <p className="text-xs font-black text-slate-200 uppercase">Eco BM (Médio)</p>
                        <p className="text-[10px] text-slate-400 font-medium">Bordas e refugo médio</p>
                      </div>
                      <span className="text-sm font-black text-amber-500">{formatKg(extStats.ecoBM)}</span>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-slate-950 rounded-2xl border border-slate-800">
                      <div>
                        <p className="text-xs font-black text-rose-300 uppercase">Borra Total</p>
                        <p className="text-[10px] text-slate-400 font-medium">Material purgado inoperável</p>
                      </div>
                      <span className="text-sm font-black text-rose-400">{formatKg(extStats.borra)}</span>
                    </div>
                  </div>
                </div>

                {/* Downtime Breakdown */}
                <div className="bg-slate-900 rounded-3xl p-6 border border-slate-800 space-y-4">
                  <h4 className="text-sm font-black text-slate-100 uppercase tracking-wider border-b border-slate-800 pb-3">
                    Tempo de Paradas na Extrusão
                  </h4>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-slate-950 rounded-2xl border border-slate-800">
                      <div className="flex items-center gap-2">
                        <Wrench className="w-4 h-4 text-amber-400" />
                        <div>
                          <p className="text-xs font-black text-slate-200 uppercase">Paradas por Manutenção</p>
                          <p className="text-[10px] text-slate-400 font-medium">Preventiva e corretiva</p>
                        </div>
                      </div>
                      <span className="text-sm font-black text-amber-400">{formatMinToHours(extStats.maintMin)}</span>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-slate-950 rounded-2xl border border-slate-800">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-blue-400" />
                        <div>
                          <p className="text-xs font-black text-slate-200 uppercase">Paradas de Processo</p>
                          <p className="text-[10px] text-slate-400 font-medium">Ajustes e trocas</p>
                        </div>
                      </div>
                      <span className="text-sm font-black text-blue-400">{formatMinToHours(extStats.procMin)}</span>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-slate-950 rounded-2xl border border-slate-800">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-slate-400" />
                        <div>
                          <p className="text-xs font-black text-slate-200 uppercase">Outras Paradas</p>
                          <p className="text-[10px] text-slate-400 font-medium">Diversas e sem energia</p>
                        </div>
                      </div>
                      <span className="text-sm font-black text-slate-300">{formatMinToHours(extStats.otherMin)}</span>
                    </div>

                    <div className="p-3 bg-amber-500/10 rounded-2xl border border-amber-500/20 text-center">
                      <span className="text-xs font-bold text-amber-300">
                        Total Geral de Inoperatividade: {formatMinToHours(extStats.totalStopMin)}
                      </span>
                    </div>
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* TAB 3: RIBBON CUTTING DETAILED ANALYSIS */}
          {activeTab === 'ribbon' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              
              {/* Ribbon Key Stats Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-slate-900 p-5 rounded-3xl border border-slate-800">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Área Produzida</span>
                  <span className="text-2xl font-black text-emerald-400 mt-1 block">{formatM2(ribbonStats.producedM2)}</span>
                  <span className="text-[10px] text-emerald-300/70 mt-1 block">Média: {formatM2(ribbonStats.avgDailyProducedM2)}/dia</span>
                </div>

                <div className="bg-slate-900 p-5 rounded-3xl border border-slate-800">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Rendimento Fita</span>
                  <span className="text-2xl font-black text-blue-400 mt-1 block">{ribbonStats.yieldRate.toFixed(1)}%</span>
                  <span className="text-[10px] text-slate-400 mt-1 block">Meta: {'>'} 85%</span>
                </div>

                <div className="bg-slate-900 p-5 rounded-3xl border border-slate-800">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Jumbos Consumidos</span>
                  <span className="text-2xl font-black text-slate-100 mt-1 block">{formatM2(ribbonStats.jumboM2)}</span>
                  <span className="text-[10px] text-slate-400 mt-1 block">~{ribbonStats.jumbosEquivalent.toFixed(1)} jumbos equiv.</span>
                </div>

                <div className="bg-slate-900 p-5 rounded-3xl border border-slate-800">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Perda Não Conforme</span>
                  <span className="text-2xl font-black text-rose-400 mt-1 block">{formatM2(ribbonStats.rejectedM2)}</span>
                  <span className="text-[10px] text-slate-400 mt-1 block">Sucata: {formatKg(ribbonStats.wasteKg)}</span>
                </div>
              </div>

              {/* Ribbon Chart & Jumbo Pie Breakdown */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Daily Bar Chart */}
                <div className="lg:col-span-2 bg-slate-900 rounded-3xl p-6 border border-slate-800 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-black text-slate-100 uppercase tracking-wider">Produção Diária de Fita (m²)</h4>
                      <p className="text-xs text-slate-400 font-medium">Jumbo vs Produzido</p>
                    </div>
                  </div>

                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={dailyRibbonChart} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <XAxis dataKey="date" stroke="#64748b" fontSize={11} />
                        <YAxis stroke="#64748b" fontSize={11} />
                        <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#fff' }} />
                        <Legend />
                        <Bar dataKey="jumboM2" name="Jumbo (m²)" fill="#64748b" radius={[6, 6, 0, 0]} />
                        <Bar dataKey="producedM2" name="Produzido (m²)" fill="#10b981" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Jumbo Types Pie Chart */}
                <div className="bg-slate-900 rounded-3xl p-6 border border-slate-800 space-y-4 flex flex-col justify-between">
                  <h4 className="text-sm font-black text-slate-100 uppercase tracking-wider border-b border-slate-800 pb-3">
                    Consumo por Tipo de Jumbo
                  </h4>

                  {jumboPieData.length === 0 ? (
                    <p className="text-xs text-slate-500 italic text-center py-8">Sem registros de tipo de jumbo na semana.</p>
                  ) : (
                    <div className="space-y-3">
                      {jumboPieData.map(item => (
                        <div key={item.name} className="flex items-center justify-between p-2.5 bg-slate-950 rounded-2xl border border-slate-800">
                          <div className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></span>
                            <span className="text-xs font-black text-slate-200">{item.name}</span>
                          </div>
                          <span className="text-xs font-black text-emerald-400">{formatM2(item.value)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>

            </div>
          )}

          {/* TAB 4: MEETING NOTES & ACTION ITEMS */}
          {activeTab === 'notes' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="bg-slate-900 rounded-3xl p-6 border border-slate-800 shadow-xl space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-amber-500/20 text-amber-400 rounded-2xl border border-amber-500/30">
                      <MessageSquare className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-base font-black text-slate-100 uppercase tracking-wider">Ata da Reunião de Resultados</h3>
                      <p className="text-xs text-slate-400 font-bold">Defina pautas, apontamentos e planos de ação para esta semana</p>
                    </div>
                  </div>

                  <span className="text-[10px] font-black uppercase text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-full">
                    Salvo Automaticamente
                  </span>
                </div>

                <textarea
                  value={meetingNotes}
                  onChange={(e) => handleNotesChange(e.target.value)}
                  placeholder="Digite aqui as pautas da reunião, decisões tomadas, ações preventivas e observações sobre os operadores/máquinas nesta semana..."
                  rows={12}
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm font-medium leading-relaxed custom-scrollbar"
                />

                <div className="flex items-center justify-between pt-2 text-xs text-slate-400">
                  <span>As notas escritas acima serão incluídas no relatório PDF e no resumo de texto para WhatsApp/E-mail.</span>
                  <button
                    onClick={handleCopyTextSummary}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl uppercase tracking-wider text-xs transition-all flex items-center gap-2"
                  >
                    <Copy className="w-4 h-4" />
                    <span>Copiar Resumo Completo</span>
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* FOOTER */}
        <div className="bg-slate-950 border-t border-slate-800 p-4 px-6 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <div className="flex items-center gap-2 font-bold uppercase tracking-wider text-[10px]">
            <span>Manupackaging Gestão de Produção</span>
            <span>•</span>
            <span className="text-slate-400">Reunião Semanal Executiva</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all"
            >
              Fechar
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
