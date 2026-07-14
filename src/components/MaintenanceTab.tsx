import React, { useState, useEffect, useMemo } from 'react';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  onSnapshot 
} from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  Search, 
  Filter, 
  Download, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Trash2, 
  X, 
  CheckSquare, 
  Square,
  FileText,
  Settings,
  HelpCircle,
  Edit2,
  Sparkles,
  Loader2
} from 'lucide-react';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { MaintenanceIssue, MaintenancePriority, MaintenanceStatus, SystemUser, Employee } from '../types';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend
} from 'recharts';

interface MaintenanceTabProps {
  setPdfModal: React.Dispatch<React.SetStateAction<{
    isOpen: boolean;
    doc: any;
    filename: string;
    title: string;
  } | null>>;
  loggedUser: SystemUser | null;
  employees: Employee[];
}

const priorityValue = {
  'Crítica': 4,
  'Alta': 3,
  'Média': 2,
  'Baixa': 1,
};

const priorityColors = {
  'Crítica': { bg: 'bg-red-50 text-red-700 border-red-200', dot: 'bg-red-600', hover: 'hover:bg-red-100' },
  'Alta': { bg: 'bg-orange-50 text-orange-700 border-orange-200', dot: 'bg-orange-500', hover: 'hover:bg-orange-100' },
  'Média': { bg: 'bg-yellow-50 text-yellow-700 border-yellow-200', dot: 'bg-yellow-500', hover: 'hover:bg-yellow-100' },
  'Baixa': { bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500', hover: 'hover:bg-emerald-100' },
};

const statusColors = {
  'Pendente': { text: 'text-slate-600', bg: 'bg-slate-100', icon: Clock },
  'Em Andamento': { text: 'text-blue-600', bg: 'bg-blue-100', icon: Settings },
  'Resolvido': { text: 'text-emerald-600', bg: 'bg-emerald-100', icon: CheckCircle2 },
};

const generateTitleFromCause = (cause: string): string => {
  if (!cause) return '';
  const trimmed = cause.trim();
  // Get first sentence or first 50 chars
  const firstSentence = trimmed.split(/[.:\n]/)[0].trim();
  if (firstSentence.length > 50) {
    const words = firstSentence.split(/\s+/);
    let title = '';
    for (const word of words) {
      if ((title + ' ' + word).length > 47) {
        return title.trim() + '...';
      }
      title += ' ' + word;
    }
    return firstSentence.slice(0, 47) + '...';
  }
  return firstSentence;
};

export const MaintenanceTab: React.FC<MaintenanceTabProps> = ({ setPdfModal, loggedUser, employees }) => {
  const [issues, setIssues] = useState<MaintenanceIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingIssue, setEditingIssue] = useState<MaintenanceIssue | null>(null);
  const [selectedIssueForNotes, setSelectedIssueForNotes] = useState<MaintenanceIssue | null>(null);

  // PDF Export Modal State
  const [isExportPdfModalOpen, setIsExportPdfModalOpen] = useState(false);
  const [pdfStatusOption, setPdfStatusOption] = useState<'Todos' | 'Pendente' | 'Em Andamento' | 'Resolvido'>('Todos');
  const [pdfDateFilterType, setPdfDateFilterType] = useState<'Todos' | 'Dia' | 'Mês' | 'Ano'>('Todos');
  const [pdfSelectedDay, setPdfSelectedDay] = useState(new Date().toISOString().split('T')[0]);
  const [pdfSelectedMonth, setPdfSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [pdfSelectedYear, setPdfSelectedYear] = useState(String(new Date().getFullYear()));

  // Filters State
  const [statusFilter, setStatusFilter] = useState<'Todos' | MaintenanceStatus>('Todos');
  const [priorityFilter, setPriorityFilter] = useState<'Todos' | MaintenancePriority>('Todos');
  const [sectorFilter, setSectorFilter] = useState<string>('Todos');
  const [search, setSearch] = useState('');

  // Form State for adding new issue
  const [formTitle, setFormTitle] = useState('');
  const [formCause, setFormCause] = useState('');
  const [formPriority, setFormPriority] = useState<MaintenancePriority>('Média');
  const [formSector, setFormSector] = useState('');
  const [formMachine, setFormMachine] = useState('');
  const [formReporter, setFormReporter] = useState(loggedUser?.name || '');

  const [isImprovingText, setIsImprovingText] = useState(false);
  const [aiFeedback, setAiFeedback] = useState('');

  const handleImproveTextWithAI = async () => {
    if (!formCause.trim()) return;
    setIsImprovingText(true);
    setAiFeedback('');
    try {
      const response = await fetch('/api/polish-cause', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: formCause }),
      });
      if (!response.ok) throw new Error('Falha ao conectar com o serviço de IA');
      const data = await response.json();
      if (data.polishedText) {
        setFormCause(data.polishedText);
        setAiFeedback('Texto aprimorado com sucesso! ✨');
        setTimeout(() => setAiFeedback(''), 4000);
      }
    } catch (error) {
      console.error(error);
      setAiFeedback('Erro ao aprimorar texto. Tente novamente.');
      setTimeout(() => setAiFeedback(''), 4000);
    } finally {
      setIsImprovingText(false);
    }
  };

  // Update formReporter if loggedUser changes
  useEffect(() => {
    if (loggedUser?.name) {
      setFormReporter(loggedUser.name);
    }
  }, [loggedUser]);

  // Resolution Notes State
  const [resolutionNotes, setResolutionNotes] = useState('');

  // Stats Calculations
  const stats = useMemo(() => {
    const total = issues.length;
    const pending = issues.filter(i => i.status === 'Pendente').length;
    const inProgress = issues.filter(i => i.status === 'Em Andamento').length;
    const resolved = issues.filter(i => i.status === 'Resolvido').length;

    const pendingPct = total > 0 ? ((pending / total) * 100).toFixed(1) : '0';
    const inProgressPct = total > 0 ? ((inProgress / total) * 100).toFixed(1) : '0';
    const resolvedPct = total > 0 ? ((resolved / total) * 100).toFixed(1) : '0';

    const chartData = [
      { name: 'Pendente', value: pending, percentage: pendingPct, color: '#f97316' }, // orange-500
      { name: 'Em Andamento', value: inProgress, percentage: inProgressPct, color: '#3b82f6' }, // blue-500
      { name: 'Resolvido', value: resolved, percentage: resolvedPct, color: '#10b981' } // emerald-500
    ];

    return {
      total,
      pending,
      inProgress,
      resolved,
      pendingPct,
      inProgressPct,
      resolvedPct,
      chartData
    };
  }, [issues]);

  // Auto-fill lists based on database
  const [sectors, setSectors] = useState<string[]>(['Extrusão', 'Reciclagem', 'Corte de Fita', 'Manutenção', 'Administração']);

  // Calculate registered machines dynamically from the personnel page (employees database)
  const machines = useMemo(() => {
    const setOfMachines = new Set<string>();
    if (employees && employees.length > 0) {
      employees.forEach(emp => {
        // Exclude empty, "Geral", "Nenhuma" or marked as "Vaga Excluída"
        if (
          emp.machine && 
          emp.machine.trim() !== '' && 
          emp.machine !== 'Geral' && 
          emp.machine !== 'Nenhuma' && 
          emp.status !== 'Vaga Excluída'
        ) {
          setOfMachines.add(emp.machine);
        }
      });
    }
    // If no machines found in database, fallback to a sensible default list
    if (setOfMachines.size === 0) {
      return ['Cast 1', 'Cast 2', 'Erema 1', 'Ghezzi', 'Lintech', 'Wutec'];
    }
    return Array.from(setOfMachines).sort();
  }, [employees]);

  // Fetch issues real-time
  useEffect(() => {
    const q = collection(db, 'maintenance_issues');
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: MaintenanceIssue[] = [];
      snapshot.forEach((doc) => {
        data.push({ id: doc.id, ...doc.data() } as MaintenanceIssue);
      });
      setIssues(data);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'maintenance_issues');
    });

    return () => unsubscribe();
  }, []);

  // Auto-migrate old machine names and generate missing titles in Firestore based on the cause
  useEffect(() => {
    if (issues.length === 0) return;

    const migrateIssues = async () => {
      for (const issue of issues) {
        const updates: any = {};

        // 1. Machine name migration
        const lowerMachine = (issue.machine || '').toLowerCase().trim();
        let updatedMachine = '';
        if (lowerMachine === 'extrusora 1' || lowerMachine === 'extrusora1') {
          updatedMachine = 'Cast 1';
        } else if (lowerMachine === 'extrusora 2' || lowerMachine === 'extrusora2') {
          updatedMachine = 'Cast 2';
        }
        if (updatedMachine && issue.machine !== updatedMachine) {
          updates.machine = updatedMachine;
        }

        // 2. Generate title based on cause if missing
        if (!issue.title) {
          updates.title = generateTitleFromCause(issue.cause);
        }

        if (Object.keys(updates).length > 0) {
          try {
            console.log(`Migrando ocorrência de manutenção ${issue.id}:`, updates);
            await updateDoc(doc(db, 'maintenance_issues', issue.id), updates);
          } catch (err) {
            console.error(`Erro ao migrar ocorrência de manutenção ${issue.id}:`, err);
          }
        }
      }
    };

    migrateIssues();
  }, [issues]);

  // Filter & Sort Issues
  const filteredAndSortedIssues = useMemo(() => {
    return issues
      .filter(issue => {
        const matchesStatus = statusFilter === 'Todos' || issue.status === statusFilter;
        const matchesPriority = priorityFilter === 'Todos' || issue.priority === priorityFilter;
        const matchesSector = sectorFilter === 'Todos' || issue.sector === sectorFilter;
        const matchesSearch = (issue.title || '').toLowerCase().includes(search.toLowerCase()) ||
                              issue.cause.toLowerCase().includes(search.toLowerCase()) || 
                              issue.machine.toLowerCase().includes(search.toLowerCase()) ||
                              issue.reporter.toLowerCase().includes(search.toLowerCase());
        
        return matchesStatus && matchesPriority && matchesSector && matchesSearch;
      })
      .sort((a, b) => {
        // First sort unresolved vs resolved (Pendente/Em Andamento first, Resolvido last)
        const aIsResolved = a.status === 'Resolvido' ? 1 : 0;
        const bIsResolved = b.status === 'Resolvido' ? 1 : 0;
        
        if (aIsResolved !== bIsResolved) {
          return aIsResolved - bIsResolved;
        }

        // Within same status grouping, sort by priority (Crítica -> Alta -> Média -> Baixa)
        const diff = (priorityValue[b.priority] || 0) - (priorityValue[a.priority] || 0);
        if (diff !== 0) return diff;

        // If same priority, sort by createdAt date descending (newest first)
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }, [issues, statusFilter, priorityFilter, sectorFilter, search]);

  // Group issues by Sector and Machine
  const groupedIssues = useMemo(() => {
    const groups: { [sector: string]: { [machine: string]: MaintenanceIssue[] } } = {};
    
    filteredAndSortedIssues.forEach(issue => {
      const sector = issue.sector || 'Geral';
      const machine = issue.machine || 'Geral / Nenhuma';
      
      if (!groups[sector]) {
        groups[sector] = {};
      }
      if (!groups[sector][machine]) {
        groups[sector][machine] = [];
      }
      groups[sector][machine].push(issue);
    });
    
    return groups;
  }, [filteredAndSortedIssues]);

  // Unique Sectors in existing data to suggest
  useEffect(() => {
    if (issues.length > 0) {
      const uniqueSectors = Array.from(new Set(issues.map(i => i.sector))).filter(Boolean);
      
      setSectors(prev => Array.from(new Set([...prev, ...uniqueSectors])));
    }
  }, [issues]);

  const handleStartEdit = (issue: MaintenanceIssue) => {
    setEditingIssue(issue);
    setFormTitle(issue.title || '');
    setFormCause(issue.cause);
    setFormPriority(issue.priority);
    setFormSector(issue.sector);
    setFormMachine(issue.machine === 'Geral / Nenhuma' ? '' : issue.machine);
    setFormReporter(issue.reporter);
    setIsAddModalOpen(true);
  };

  const handleSubmitIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formCause || !formSector) return;

    const finalTitle = formTitle.trim() || generateTitleFromCause(formCause);

    try {
      if (editingIssue) {
        // Edit existing issue
        await updateDoc(doc(db, 'maintenance_issues', editingIssue.id), {
          title: finalTitle,
          cause: formCause,
          priority: formPriority,
          sector: formSector,
          machine: formMachine || 'Geral / Nenhuma'
        });
      } else {
        // Add new issue
        const newIssue = {
          title: finalTitle,
          cause: formCause,
          priority: formPriority,
          sector: formSector,
          machine: formMachine || 'Geral / Nenhuma',
          reporter: loggedUser?.name || formReporter || auth.currentUser?.displayName || 'Operador',
          status: 'Pendente' as MaintenanceStatus,
          createdAt: new Date().toISOString(),
          userId: auth.currentUser?.uid || 'anonymous'
        };

        await addDoc(collection(db, 'maintenance_issues'), newIssue);
      }

      // Reset form
      setFormTitle('');
      setFormCause('');
      setFormPriority('Média');
      setFormSector('');
      setFormMachine('');
      setFormReporter(loggedUser?.name || '');
      setEditingIssue(null);
      setIsAddModalOpen(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'maintenance_issues');
    }
  };

  const handleDeleteIssue = async (id: string) => {
    if (!window.confirm('Deseja realmente excluir esta causa de manutenção?')) return;
    try {
      await deleteDoc(doc(db, 'maintenance_issues', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `maintenance_issues/${id}`);
    }
  };

  const toggleIssueStatus = async (issue: MaintenanceIssue) => {
    const newStatus: MaintenanceStatus = issue.status === 'Resolvido' ? 'Pendente' : 'Resolvido';
    
    if (newStatus === 'Resolvido') {
      // Open resolution notes modal
      setSelectedIssueForNotes(issue);
      setResolutionNotes(issue.solution || '');
    } else {
      // Toggle back to Pendente directly
      try {
        await updateDoc(doc(db, 'maintenance_issues', issue.id), {
          status: 'Pendente',
          resolvedAt: null
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `maintenance_issues/${issue.id}`);
      }
    }
  };

  const submitResolution = async () => {
    if (!selectedIssueForNotes) return;

    try {
      await updateDoc(doc(db, 'maintenance_issues', selectedIssueForNotes.id), {
        status: 'Resolvido',
        solution: resolutionNotes,
        resolvedAt: new Date().toISOString()
      });
      setSelectedIssueForNotes(null);
      setResolutionNotes('');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `maintenance_issues/${selectedIssueForNotes.id}`);
    }
  };

  const handleUpdateStatus = async (id: string, status: MaintenanceStatus) => {
    try {
      await updateDoc(doc(db, 'maintenance_issues', id), { status });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `maintenance_issues/${id}`);
    }
  };

  // PDF Export
  const exportPDFWithSettings = () => {
    // 1. Start with all issues from the db
    let pdfIssues = [...issues];

    // 2. Filter by Status (unless 'Todos' is selected)
    if (pdfStatusOption !== 'Todos') {
      pdfIssues = pdfIssues.filter(i => i.status === pdfStatusOption);
    } // if 'Todos', it naturally includes both resolved ("solucionadas") and pending issues!

    // 3. Filter by Date (Dia, Mês, Ano)
    if (pdfDateFilterType === 'Dia' && pdfSelectedDay) {
      pdfIssues = pdfIssues.filter(i => {
        const localDate = new Date(i.createdAt);
        const y = localDate.getFullYear();
        const m = String(localDate.getMonth() + 1).padStart(2, '0');
        const d = String(localDate.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}` === pdfSelectedDay;
      });
    } else if (pdfDateFilterType === 'Mês' && pdfSelectedMonth) {
      pdfIssues = pdfIssues.filter(i => {
        const localDate = new Date(i.createdAt);
        const y = localDate.getFullYear();
        const m = String(localDate.getMonth() + 1).padStart(2, '0');
        return `${y}-${m}` === pdfSelectedMonth;
      });
    } else if (pdfDateFilterType === 'Ano' && pdfSelectedYear) {
      pdfIssues = pdfIssues.filter(i => {
        const localDate = new Date(i.createdAt);
        return String(localDate.getFullYear()) === pdfSelectedYear;
      });
    }

    // 4. Respect current filters from the screen if active
    if (sectorFilter !== 'Todos') {
      pdfIssues = pdfIssues.filter(i => i.sector === sectorFilter);
    }
    if (priorityFilter !== 'Todos') {
      pdfIssues = pdfIssues.filter(i => i.priority === priorityFilter);
    }
    if (search) {
      pdfIssues = pdfIssues.filter(i => 
        i.cause.toLowerCase().includes(search.toLowerCase()) || 
        i.machine.toLowerCase().includes(search.toLowerCase()) ||
        i.reporter.toLowerCase().includes(search.toLowerCase())
      );
    }

    // 5. Sort issues
    pdfIssues.sort((a, b) => {
      const aIsResolved = a.status === 'Resolvido' ? 1 : 0;
      const bIsResolved = b.status === 'Resolvido' ? 1 : 0;
      
      if (aIsResolved !== bIsResolved) {
        return aIsResolved - bIsResolved;
      }

      const diff = (priorityValue[b.priority] || 0) - (priorityValue[a.priority] || 0);
      if (diff !== 0) return diff;

      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    // 6. Group issues by Sector and Machine
    const pdfGrouped: { [sector: string]: { [machine: string]: MaintenanceIssue[] } } = {};
    pdfIssues.forEach(issue => {
      const sector = issue.sector || 'Geral';
      const machine = issue.machine || 'Geral / Nenhuma';
      
      if (!pdfGrouped[sector]) {
        pdfGrouped[sector] = {};
      }
      if (!pdfGrouped[sector][machine]) {
        pdfGrouped[sector][machine] = [];
      }
      pdfGrouped[sector][machine].push(issue);
    });

    // 7. Generate PDF
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    
    // Header
    doc.setFillColor(30, 41, 59); // Slate-800
    doc.rect(0, 0, 210, 40, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('MANUTENÇÃO - CONTROLE DE CAUSAS', 15, 18);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(226, 232, 240); // Slate-200
    doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 15, 26);
    
    let periodInfo = 'Todos os Períodos';
    if (pdfDateFilterType === 'Dia') {
      const [y, m, d] = pdfSelectedDay.split('-');
      periodInfo = `Dia: ${d}/${m}/${y}`;
    } else if (pdfDateFilterType === 'Mês') {
      const [y, m] = pdfSelectedMonth.split('-');
      periodInfo = `Mês: ${m}/${y}`;
    } else if (pdfDateFilterType === 'Ano') {
      periodInfo = `Ano: ${pdfSelectedYear}`;
    }

    doc.text(`Filtro Período: ${periodInfo} | Status PDF: ${pdfStatusOption} | Setor: ${sectorFilter}`, 15, 32);

    let currentY = 48;

    const pdfTotal = pdfIssues.length;
    const pdfPending = pdfIssues.filter(i => i.status === 'Pendente').length;
    const pdfInProgress = pdfIssues.filter(i => i.status === 'Em Andamento').length;
    const pdfResolved = pdfIssues.filter(i => i.status === 'Resolvido').length;

    const pdfPendingPct = pdfTotal > 0 ? ((pdfPending / pdfTotal) * 100).toFixed(1) : '0.0';
    const pdfInProgressPct = pdfTotal > 0 ? ((pdfInProgress / pdfTotal) * 100).toFixed(1) : '0.0';
    const pdfResolvedPct = pdfTotal > 0 ? ((pdfResolved / pdfTotal) * 100).toFixed(1) : '0.0';

    // 8. Draw KPI Cards in PDF
    const cardY = currentY;
    const cardHeight = 18;
    const cardWidth = 44;
    const cardGap = 4.6;

    // Card 1: Total (Slate/Gray styling)
    doc.setFillColor(248, 250, 252); // slate-50
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.roundedRect(10, cardY, cardWidth, cardHeight, 2, 2, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139); // slate-500
    doc.text('TOTAL SOLICITAÇÕES', 13, cardY + 5);
    doc.setFontSize(14);
    doc.setTextColor(30, 41, 59); // slate-800
    doc.text(String(pdfTotal), 13, cardY + 12);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text('100% das listadas', 13, cardY + 16);

    // Card 2: Resolvidas (Green styling)
    const card2X = 10 + cardWidth + cardGap;
    doc.setFillColor(236, 253, 245); // emerald-50
    doc.setDrawColor(167, 243, 208); // emerald-200
    doc.roundedRect(card2X, cardY, cardWidth, cardHeight, 2, 2, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(4, 120, 87); // emerald-700
    doc.text('RESOLVIDAS', card2X + 3, cardY + 5);
    doc.setFontSize(14);
    doc.setTextColor(6, 78, 59); // emerald-900
    doc.text(String(pdfResolved), card2X + 3, cardY + 12);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(5, 150, 105); // emerald-600
    doc.text(`${pdfResolvedPct}% do total`, card2X + 3, cardY + 16);

    // Card 3: Pendentes (Orange/Yellow styling)
    const card3X = card2X + cardWidth + cardGap;
    doc.setFillColor(255, 247, 237); // orange-50
    doc.setDrawColor(254, 215, 170); // orange-200
    doc.roundedRect(card3X, cardY, cardWidth, cardHeight, 2, 2, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(194, 65, 12); // orange-700
    doc.text('PENDENTES', card3X + 3, cardY + 5);
    doc.setFontSize(14);
    doc.setTextColor(124, 45, 18); // orange-900
    doc.text(String(pdfPending), card3X + 3, cardY + 12);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(234, 88, 12); // orange-600
    doc.text(`${pdfPendingPct}% do total`, card3X + 3, cardY + 16);

    // Card 4: Em Andamento (Blue styling)
    const card4X = card3X + cardWidth + cardGap;
    doc.setFillColor(239, 246, 255); // blue-50
    doc.setDrawColor(191, 219, 254); // blue-200
    doc.roundedRect(card4X, cardY, cardWidth, cardHeight, 2, 2, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(29, 78, 216); // blue-700
    doc.text('EM ANDAMENTO', card4X + 3, cardY + 5);
    doc.setFontSize(14);
    doc.setTextColor(30, 58, 138); // blue-900
    doc.text(String(pdfInProgress), card4X + 3, cardY + 12);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(37, 99, 235); // blue-600
    doc.text(`${pdfInProgressPct}% do total`, card4X + 3, cardY + 16);

    currentY += cardHeight + 8;

    const checkPageSpace = (neededHeight: number) => {
      if (currentY + neededHeight > 275) {
        doc.addPage();
        currentY = 20; // reset Y to top of new page
      }
    };

    if (Object.keys(pdfGrouped).length === 0) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(11);
      doc.setTextColor(100, 116, 139);
      doc.text('Nenhuma causa de manutenção encontrada para os filtros selecionados.', 15, currentY + 10);
    } else {
      Object.entries(pdfGrouped).forEach(([sector, machinesGroup]) => {
        checkPageSpace(25);
        
        doc.setFillColor(30, 41, 59); // Slate-800
        doc.rect(10, currentY, 190, 8, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(255, 255, 255);
        doc.text(`SETOR: ${sector.toUpperCase()}`, 14, currentY + 6);
        currentY += 12;

        Object.entries(machinesGroup).forEach(([machine, machineIssues]) => {
          checkPageSpace(20);

          doc.setFont('helvetica', 'bold');
          doc.setFontSize(9);
          doc.setTextColor(51, 65, 85); // Slate-700
          doc.text(`EQUIPAMENTO: ${machine.toUpperCase()}`, 12, currentY + 4);
          currentY += 8;

          const tableRows = machineIssues.map((issue) => {
            const dateStr = new Date(issue.createdAt).toLocaleDateString('pt-BR');
            const checkboxStr = issue.status === 'Resolvido' ? '[ X ]' : '[   ]';
            const notesOrSolution = issue.solution || '';
            const displayTitle = issue.title || generateTitleFromCause(issue.cause);
            const formattedCauseText = displayTitle && displayTitle.toLowerCase().trim() !== issue.cause.toLowerCase().trim()
              ? `${displayTitle.toUpperCase()}\n\n${issue.cause}`
              : `${displayTitle.toUpperCase()}\n`;

            const relatorDataStr = issue.status === 'Resolvido' && issue.resolvedAt
              ? `${issue.reporter}\nAberto: ${dateStr}\nResolvido: ${new Date(issue.resolvedAt).toLocaleDateString('pt-BR')}`
              : `${issue.reporter}\nAberto: ${dateStr}\n`;

            return [
              checkboxStr,
              issue.priority,
              formattedCauseText,
              relatorDataStr,
              issue.status,
              notesOrSolution
            ];
          });

          autoTable(doc, {
            startY: currentY,
            head: [['Conf.', 'Prioridade', 'Causa / Descrição', 'Relator / Data', 'Status', 'Solução / Obs.']],
            body: tableRows,
            theme: 'grid',
            headStyles: {
              fillColor: [71, 85, 105], // Slate-600
              textColor: [255, 255, 255],
              fontSize: 8,
              fontStyle: 'bold',
              halign: 'center'
            },
            columnStyles: {
              0: { cellWidth: 15, halign: 'center', cellPadding: 2, fontSize: 10, fontStyle: 'bold' }, // Checkbox
              1: { cellWidth: 25, fontStyle: 'bold', fontSize: 8, halign: 'center' }, // Priority
              2: { cellWidth: 65, fontSize: 8 }, // Cause
              3: { cellWidth: 28, fontSize: 7 }, // Reporter / Date
              4: { cellWidth: 22, fontSize: 8, halign: 'center' }, // Status
              5: { cellWidth: 35, fontSize: 7 }, // Solution / Obs
            },
            styles: {
              overflow: 'linebreak',
              cellPadding: 2.5,
              fontSize: 8,
              valign: 'middle'
            },
            willDrawCell: (data) => {
              if (data.section === 'body') {
                // Clear default text drawing for all columns because we are doing custom drawing
                if ([0, 1, 2, 3, 4, 5].includes(data.column.index)) {
                  data.cell.text = [];
                }
              }
            },
            didDrawCell: (data) => {
              if (data.section === 'body') {
                const cell = data.cell;
                const doc = data.doc;
                const issue = machineIssues[data.row.index];
                if (!issue) return;

                const dateStr = new Date(issue.createdAt).toLocaleDateString('pt-BR');

                if (data.column.index === 0) {
                  // Column 0: Checkbox
                  const size = 5;
                  const boxX = cell.x + (cell.width - size) / 2;
                  const boxY = cell.y + (cell.height - size) / 2;
                  if (issue.status === 'Resolvido') {
                    doc.setFillColor(16, 185, 129); // Emerald-500
                    doc.setDrawColor(16, 185, 129);
                    doc.roundedRect(boxX, boxY, size, size, 1, 1, 'FD');
                    doc.setTextColor(255, 255, 255);
                    doc.setFont('helvetica', 'bold');
                    doc.setFontSize(4.5);
                    doc.text('X', boxX + 1.4, boxY + 3.9);
                  } else {
                    doc.setDrawColor(148, 163, 184); // Slate-400
                    doc.setFillColor(255, 255, 255);
                    doc.roundedRect(boxX, boxY, size, size, 1, 1, 'FD');
                  }
                }
                
                else if (data.column.index === 1) {
                  // Column 1: Priority Badge
                  const priorityColorsMap: { [key: string]: { bg: number[], border: number[], text: number[], dot: number[] } } = {
                    'Crítica': { bg: [254, 242, 242], border: [254, 226, 226], text: [185, 28, 28], dot: [239, 68, 68] },
                    'Alta': { bg: [255, 247, 237], border: [254, 215, 170], text: [194, 65, 12], dot: [249, 115, 22] },
                    'Média': { bg: [255, 251, 235], border: [254, 243, 199], text: [180, 83, 9], dot: [245, 158, 11] },
                    'Baixa': { bg: [240, 253, 245], border: [204, 251, 241], text: [13, 148, 136], dot: [20, 184, 166] }
                  };
                  const colors = priorityColorsMap[issue.priority] || priorityColorsMap['Baixa'];
                  const badgeW = cell.width - 4;
                  const badgeH = 6;
                  const badgeX = cell.x + 2;
                  const badgeY = cell.y + (cell.height - badgeH) / 2;

                  doc.setFillColor(colors.bg[0], colors.bg[1], colors.bg[2]);
                  doc.setDrawColor(colors.border[0], colors.border[1], colors.border[2]);
                  doc.setLineWidth(0.15);
                  doc.roundedRect(badgeX, badgeY, badgeW, badgeH, 1.2, 1.2, 'FD');

                  doc.setFillColor(colors.dot[0], colors.dot[1], colors.dot[2]);
                  doc.circle(badgeX + 2, badgeY + badgeH / 2, 0.6, 'F');

                  doc.setFont('helvetica', 'bold');
                  doc.setFontSize(6.5);
                  doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
                  doc.text(issue.priority.toUpperCase(), badgeX + 4.2, badgeY + badgeH / 2 + 0.8);
                }

                else if (data.column.index === 2) {
                  // Column 2: Causa / Descrição
                  const displayTitle = (issue.title || generateTitleFromCause(issue.cause)).toUpperCase();
                  const causeText = issue.cause;
                  const isSame = displayTitle.toLowerCase().trim() === causeText.toLowerCase().trim();

                  const padX = 2.5;
                  const startX = cell.x + padX;
                  const availableWidth = cell.width - (padX * 2);

                  // 1. Draw Title Background Banner (Highlighted)
                  const bannerHeight = 5.5;
                  const bannerWidth = cell.width - 4;
                  const bannerX = cell.x + 2;
                  const bannerY = cell.y + 2;

                  doc.setFillColor(239, 246, 255); // soft light blue bg (blue-50)
                  doc.setDrawColor(191, 219, 254); // blue-200 border
                  doc.setLineWidth(0.15);
                  doc.roundedRect(bannerX, bannerY, bannerWidth, bannerHeight, 1, 1, 'FD');

                  // 2. Draw Title Text (Centered and Bold)
                  doc.setFont('helvetica', 'bold');
                  doc.setFontSize(7.5);
                  doc.setTextColor(30, 58, 138); // deep blue-900
                  doc.text(displayTitle, cell.x + (cell.width / 2), bannerY + (bannerHeight / 2) + 0.8, { align: 'center' });

                  // 3. Draw Cause Text if it's different from the Title
                  if (!isSame) {
                    const textStartY = bannerY + bannerHeight + 2.5;
                    doc.setFont('helvetica', 'normal');
                    doc.setFontSize(7);
                    doc.setTextColor(71, 85, 105); // slate-600
                    
                    // Wrap text
                    const wrappedCause = doc.splitTextToSize(causeText, availableWidth);
                    doc.text(wrappedCause, startX, textStartY);
                  }
                }

                else if (data.column.index === 3) {
                  // Column 3: Relator / Data
                  const padX = 2;
                  const startX = cell.x + padX;
                  const startY = cell.y + 4;
                  
                  doc.setFont('helvetica', 'normal');
                  doc.setFontSize(6.5);
                  doc.setTextColor(100, 116, 139); // Slate-500
                  
                  doc.text("Por: ", startX, startY);
                  doc.setFont('helvetica', 'bold');
                  doc.setTextColor(71, 85, 105); // Slate-700
                  doc.text(issue.reporter, startX + 5, startY);
                  
                  doc.setFont('helvetica', 'normal');
                  doc.setTextColor(100, 116, 139);
                  doc.text(`Aberto: ${dateStr}`, startX, startY + 3.5);
                  
                  if (issue.status === 'Resolvido' && issue.resolvedAt) {
                    const resolvedDateStr = new Date(issue.resolvedAt).toLocaleDateString('pt-BR');
                    doc.setFont('helvetica', 'bold');
                    doc.setTextColor(16, 185, 129); // Emerald-500
                    doc.text(`Resolvido: ${resolvedDateStr}`, startX, startY + 7);
                  }
                }

                else if (data.column.index === 4) {
                  // Column 4: Status Badge
                  const statusColorsMap: { [key: string]: { bg: number[], border: number[], text: number[] } } = {
                    'Pendente': { bg: [241, 245, 249], border: [226, 232, 240], text: [71, 85, 105] },
                    'Em Andamento': { bg: [239, 246, 255], border: [191, 219, 254], text: [29, 78, 216] },
                    'Resolvido': { bg: [236, 253, 245], border: [167, 243, 208], text: [4, 120, 87] }
                  };
                  const colors = statusColorsMap[issue.status] || statusColorsMap['Pendente'];
                  const badgeW = cell.width - 4;
                  const badgeH = 6;
                  const badgeX = cell.x + 2;
                  const badgeY = cell.y + (cell.height - badgeH) / 2;

                  doc.setFillColor(colors.bg[0], colors.bg[1], colors.bg[2]);
                  doc.setDrawColor(colors.border[0], colors.border[1], colors.border[2]);
                  doc.setLineWidth(0.15);
                  doc.roundedRect(badgeX, badgeY, badgeW, badgeH, 1.2, 1.2, 'FD');

                  doc.setFont('helvetica', 'bold');
                  doc.setFontSize(6.5);
                  doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
                  doc.text(issue.status.toUpperCase(), badgeX + (badgeW / 2), badgeY + (badgeH / 2) + 0.8, { align: 'center' });
                }

                else if (data.column.index === 5) {
                  // Column 5: Solução / Obs
                  if (issue.solution) {
                    const pad = 2;
                    const cardW = cell.width - (pad * 2);
                    const cardH = cell.height - (pad * 2);
                    const cardX = cell.x + pad;
                    const cardY = cell.y + pad;

                    doc.setFillColor(236, 253, 245); // Emerald-50
                    doc.setDrawColor(167, 243, 208); // Emerald-200
                    doc.setLineWidth(0.15);
                    doc.roundedRect(cardX, cardY, cardW, cardH, 1, 1, 'FD');

                    doc.setFont('helvetica', 'bold');
                    doc.setFontSize(6);
                    doc.setTextColor(6, 95, 70); // Emerald-800
                    doc.text("SOLUÇÃO / OBS:", cardX + 1.5, cardY + 2.5);

                    doc.setFont('helvetica', 'normal');
                    doc.setFontSize(6);
                    doc.setTextColor(51, 65, 85); // Slate-700
                    const wrappedText = doc.splitTextToSize(issue.solution, cardW - 3);
                    doc.text(wrappedText, cardX + 1.5, cardY + 5);
                  }
                }
              }
            },
            margin: { left: 10, right: 10 },
            pageBreak: 'auto',
          });

          currentY = (doc as any).lastAutoTable.finalY + 8;
        });
      });
    }

    // Footer/Legend for printed lists
    const totalPages = doc.internal.pages.length - 1;
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184); // Slate-400
      doc.text(`Página ${i} de ${totalPages} - Use as caixas [  ] para marcar fisicamente os problemas resolvidos.`, 10, 287);
    }

    setPdfModal({
      isOpen: true,
      doc,
      filename: `Relatorio_Manutencao_Prioridades_${new Date().toISOString().split('T')[0]}.pdf`,
      title: 'Relatório Completo de Manutenção'
    });
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* Banner / Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 rounded-[2.5rem] p-8 md:p-10 text-white shadow-xl relative overflow-hidden border border-slate-700">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <h1 className="text-3xl md:text-4xl font-black tracking-tight uppercase">
              Controle de Causas da Manutenção
            </h1>
            <p className="text-slate-300 text-sm md:text-base max-w-2xl font-medium">
              Gerenciamento de pendências, defeitos e problemas categorizados por prioridade de execução. Visualize, marque como resolvido e gere relatórios com checkboxes de controle.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => {
                setEditingIssue(null);
                setFormTitle('');
                setFormCause('');
                setFormPriority('Média');
                setFormSector('');
                setFormMachine('');
                setFormReporter(loggedUser?.name || '');
                setIsAddModalOpen(true);
              }}
              className="bg-blue-600 hover:bg-blue-500 text-white font-black text-xs uppercase tracking-wider px-6 py-4 rounded-2xl flex items-center gap-2.5 shadow-lg shadow-blue-500/20 transition-all border border-blue-500"
            >
              <Plus size={16} />
              <span>Nova Causa</span>
            </button>
            <button
              onClick={() => setIsExportPdfModalOpen(true)}
              className="bg-slate-700 hover:bg-slate-600 text-white font-black text-xs uppercase tracking-wider px-6 py-4 rounded-2xl flex items-center gap-2.5 transition-all border border-slate-600"
            >
              <Download size={16} />
              <span>Exportar PDF</span>
            </button>
          </div>
        </div>
        
        {/* Decorative Grid Background */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-20 pointer-events-none"></div>
      </div>

      {/* Dashboard / Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* KPI Summary Cards */}
        <div className="lg:col-span-2 grid grid-cols-2 gap-4">
          {/* Card Total */}
          <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Total de Solicitações</span>
              <div className="p-2 bg-slate-50 text-slate-600 rounded-xl">
                <FileText size={16} />
              </div>
            </div>
            <div className="mt-4">
              <h3 className="text-3xl font-black text-slate-800">{stats.total}</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">100% registradas</p>
            </div>
          </div>

          {/* Card Resolvidas */}
          <div className="bg-emerald-50/50 p-5 rounded-3xl border border-emerald-100 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800">Resolvidas</span>
              <div className="p-2 bg-emerald-100 text-emerald-600 rounded-xl">
                <CheckCircle2 size={16} />
              </div>
            </div>
            <div className="mt-4">
              <h3 className="text-3xl font-black text-emerald-900">{stats.resolved}</h3>
              <p className="text-[10px] text-emerald-600 font-bold uppercase mt-1">{stats.resolvedPct}% do total</p>
            </div>
          </div>

          {/* Card Pendentes */}
          <div className="bg-orange-50/50 p-5 rounded-3xl border border-orange-100 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-orange-800">Pendentes</span>
              <div className="p-2 bg-orange-100 text-orange-600 rounded-xl">
                <Clock size={16} />
              </div>
            </div>
            <div className="mt-4">
              <h3 className="text-3xl font-black text-orange-900">{stats.pending}</h3>
              <p className="text-[10px] text-orange-600 font-bold uppercase mt-1">{stats.pendingPct}% do total</p>
            </div>
          </div>

          {/* Card Em Andamento */}
          <div className="bg-blue-50/50 p-5 rounded-3xl border border-blue-100 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-blue-800">Em Andamento</span>
              <div className="p-2 bg-blue-100 text-blue-600 rounded-xl">
                <Settings size={16} />
              </div>
            </div>
            <div className="mt-4">
              <h3 className="text-3xl font-black text-blue-900">{stats.inProgress}</h3>
              <p className="text-[10px] text-blue-600 font-bold uppercase mt-1">{stats.inProgressPct}% do total</p>
            </div>
          </div>
        </div>

        {/* Donut Chart Visualizer */}
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between pb-3 border-b border-slate-50">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-700">Distribuição Percentual</h3>
            <span className="text-[9px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-bold uppercase">Status</span>
          </div>
          
          <div className="h-[180px] w-full flex items-center justify-center mt-2 relative">
            {stats.total === 0 ? (
              <div className="text-center space-y-1">
                <HelpCircle className="text-slate-300 mx-auto" size={32} />
                <p className="text-xs font-black text-slate-400 uppercase tracking-wider">Sem dados de causas</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={75}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {stats.chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: any, name: any, props: any) => [
                      `${value} (${props.payload.percentage}%)`, 
                      name
                    ]}
                    contentStyle={{ background: '#0f172a', borderRadius: '1rem', border: 'none', color: '#fff', fontSize: '11px', fontWeight: 'bold' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
            
            {/* Center Label for Donut */}
            {stats.total > 0 && (
              <div className="absolute flex flex-col items-center justify-center">
                <span className="text-2xl font-black text-slate-800">{stats.total}</span>
                <span className="text-[8px] font-black uppercase text-slate-400 tracking-wider">Total</span>
              </div>
            )}
          </div>

          {/* Custom Legends */}
          <div className="flex justify-center gap-4 text-[10px] font-bold mt-2">
            <div className="flex items-center gap-1.5 text-slate-600">
              <span className="w-2 h-2 rounded-full bg-orange-500"></span>
              <span>Pendente</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-600">
              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
              <span>Ativo</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-600">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>Resolvido</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter panel */}
      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
        <div className="flex items-center gap-2.5 pb-2 border-b border-slate-50">
          <Filter className="text-blue-500" size={18} />
          <h2 className="text-xs font-black uppercase tracking-wider text-slate-700">
            Filtros & Busca
          </h2>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Search bar */}
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400">
              <Search size={16} />
            </span>
            <input
              type="text"
              placeholder="Buscar por causa, máquina..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-slate-700"
            />
          </div>

          {/* Status filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-slate-700 font-bold"
            >
              <option value="Todos">Status: Todos</option>
              <option value="Pendente">Pendente</option>
              <option value="Em Andamento">Em Andamento</option>
              <option value="Resolvido">Resolvido</option>
            </select>
          </div>

          {/* Priority filter */}
          <div>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value as any)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-slate-700 font-bold"
            >
              <option value="Todos">Prioridade: Todas</option>
              <option value="Crítica">Crítica (Urgente)</option>
              <option value="Alta">Alta</option>
              <option value="Média">Média</option>
              <option value="Baixa">Baixa</option>
            </select>
          </div>

          {/* Sector filter */}
          <div>
            <select
              value={sectorFilter}
              onChange={(e) => setSectorFilter(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-slate-700 font-bold"
            >
              <option value="Todos">Setor: Todos</option>
              {sectors.map((sec) => (
                <option key={sec} value={sec}>{sec}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Main Table / Grid of Causes */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">Carregando Causas de Manutenção...</span>
        </div>
      ) : filteredAndSortedIssues.length === 0 ? (
        <div className="bg-slate-50 rounded-[2rem] p-12 text-center border border-slate-100 flex flex-col items-center justify-center gap-4">
          <HelpCircle size={48} className="text-slate-300" />
          <div className="space-y-1">
            <h3 className="text-slate-700 font-black text-sm uppercase tracking-wider">Nenhuma causa encontrada</h3>
            <p className="text-slate-400 text-xs max-w-sm">
              Não há causas correspondentes aos filtros selecionados. Tente ajustar os filtros ou crie uma nova causa.
            </p>
          </div>
          <button
            onClick={() => {
              setEditingIssue(null);
              setFormTitle('');
              setFormCause('');
              setFormPriority('Média');
              setFormSector('');
              setFormMachine('');
              setFormReporter(loggedUser?.name || '');
              setIsAddModalOpen(true);
            }}
            className="mt-2 bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-black uppercase tracking-wider px-5 py-3 rounded-2xl shadow-md transition-all"
          >
            Adicionar Nova
          </button>
        </div>
      ) : (
        <div className="space-y-10">
          {Object.entries(groupedIssues).map(([sector, machinesGroup]) => (
            <div key={sector} className="bg-slate-50/40 rounded-[2.5rem] p-6 md:p-8 border border-slate-100 space-y-6">
              {/* Sector Header */}
              <div className="flex items-center justify-between border-b border-slate-200/60 pb-3">
                <div className="flex items-center gap-3">
                  <span className="w-3 h-3 rounded-full bg-blue-600 animate-pulse"></span>
                  <h3 className="text-sm md:text-base font-black uppercase tracking-wider text-slate-800">
                    Setor: {sector}
                  </h3>
                </div>
                <span className="bg-blue-50 text-blue-700 text-[10px] font-black uppercase px-3 py-1 rounded-full border border-blue-100">
                  {Object.values(machinesGroup).flat().length} {Object.values(machinesGroup).flat().length === 1 ? 'pendência' : 'pendências'}
                </span>
              </div>

              {/* Machines inside this sector */}
              <div className="space-y-8 pl-1 md:pl-4">
                {Object.entries(machinesGroup).map(([machine, machineIssues]) => (
                  <div key={machine} className="space-y-4">
                    {/* Machine Sub-Header */}
                    <div className="flex items-center gap-2">
                      <Settings className="text-slate-400 w-4 h-4 animate-spin-slow" style={{ animationDuration: '8s' }} />
                      <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wide">
                        Equipamento: <span className="text-slate-900 font-black">{machine}</span>
                      </h4>
                      <span className="bg-slate-200/80 text-slate-700 text-[10px] font-black px-2 py-0.5 rounded-lg font-mono">
                        {machineIssues.length}
                      </span>
                    </div>

                    {/* Cards grid of this machine */}
                    <div className="grid grid-cols-1 gap-4">
                      <AnimatePresence mode="popLayout">
                        {machineIssues.map((issue) => {
                          const dateStr = new Date(issue.createdAt).toLocaleDateString('pt-BR');
                          const resolvedDateStr = issue.resolvedAt ? new Date(issue.resolvedAt).toLocaleDateString('pt-BR') : '';
                          const StatusIcon = statusColors[issue.status]?.icon || Clock;
                          const isResolved = issue.status === 'Resolvido';

                          return (
                            <motion.div
                              layout
                              key={issue.id}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.95 }}
                              className={`bg-white rounded-3xl p-5 md:p-6 border transition-all duration-300 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 ${isResolved ? 'border-emerald-100 bg-emerald-50/20 opacity-85' : 'border-slate-100 hover:shadow-md'}`}
                            >
                              <div className="flex items-start gap-4 flex-1">
                                {/* Quick Resolve Checkbox Checkmark */}
                                <button
                                  onClick={() => toggleIssueStatus(issue)}
                                  title={isResolved ? "Marcar como Pendente" : "Marcar como Resolvido"}
                                  className="mt-1 shrink-0 text-slate-400 hover:text-blue-500 transition-all focus:outline-none"
                                >
                                  {isResolved ? (
                                    <CheckSquare className="w-6 h-6 text-emerald-500" />
                                  ) : (
                                    <Square className="w-6 h-6 hover:scale-105" />
                                  )}
                                </button>

                                <div className="space-y-2.5 flex-1">
                                  {/* Priority and Area Tags */}
                                  <div className="flex flex-wrap gap-2 items-center">
                                    <span className={`px-2.5 py-1 text-[9px] font-black uppercase tracking-wider rounded-lg border ${priorityColors[issue.priority]?.bg}`}>
                                      <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1.5 ${priorityColors[issue.priority]?.dot}`}></span>
                                      {issue.priority}
                                    </span>
                                    
                                    <span className="px-2.5 py-1 text-[9px] font-black uppercase tracking-wider rounded-lg bg-slate-100 text-slate-600 border border-slate-200">
                                      {issue.sector}
                                    </span>

                                    <span className="px-2.5 py-1 text-[9px] font-bold rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-100 font-mono">
                                      {issue.machine}
                                    </span>

                                    <span className={`px-2.5 py-1 text-[9px] font-black uppercase tracking-wider rounded-lg flex items-center gap-1 ${statusColors[issue.status]?.text} ${statusColors[issue.status]?.bg}`}>
                                      <StatusIcon size={12} />
                                      {issue.status}
                                    </span>
                                  </div>

                                  {/* Title and Cause Description */}
                                  <div className="space-y-1">
                                    <h3 className={`text-sm md:text-base font-black text-slate-850 leading-snug ${isResolved ? 'line-through text-slate-400' : ''}`}>
                                      {issue.title || generateTitleFromCause(issue.cause)}
                                    </h3>
                                    {issue.title && issue.title !== issue.cause && (
                                      <p className={`text-xs md:text-sm text-slate-500 whitespace-pre-wrap leading-relaxed ${isResolved ? 'line-through text-slate-400' : ''}`}>
                                        {issue.cause}
                                      </p>
                                    )}
                                  </div>

                                  {/* Footer Info: Reporter, Dates */}
                                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-400 font-medium">
                                    <span>Por: <strong className="text-slate-500">{issue.reporter}</strong></span>
                                    <span>Aberto em: <strong>{dateStr}</strong></span>
                                    {isResolved && issue.resolvedAt && (
                                      <span className="text-emerald-600">Resolvido em: <strong>{resolvedDateStr}</strong></span>
                                    )}
                                  </div>

                                  {issue.solution && (
                                    <div className="mt-2 bg-emerald-50/50 p-3.5 rounded-2xl border border-emerald-100 text-xs text-slate-600">
                                      <strong className="text-emerald-800 block mb-0.5 font-bold uppercase text-[9px] tracking-wider">Solução / Obs:</strong>
                                      {issue.solution}
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Actions column on the right */}
                              <div className="flex md:flex-col items-end gap-2.5 pt-4 md:pt-0 border-t md:border-t-0 border-slate-100 justify-end">
                                
                                {/* Status Dropdown Picker for direct transition (Pendente -> Em Andamento etc) */}
                                {!isResolved && (
                                  <div className="flex gap-2">
                                    <button
                                      onClick={() => handleUpdateStatus(issue.id, 'Pendente')}
                                      className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border ${issue.status === 'Pendente' ? 'bg-slate-200 border-slate-300 text-slate-800 shadow-sm' : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'}`}
                                    >
                                      Pendente
                                    </button>
                                    <button
                                      onClick={() => handleUpdateStatus(issue.id, 'Em Andamento')}
                                      className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border ${issue.status === 'Em Andamento' ? 'bg-blue-600 border-blue-700 text-white shadow-sm shadow-blue-500/10' : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'}`}
                                    >
                                      Em Andamento
                                    </button>
                                  </div>
                                )}

                                <div className="flex gap-2">
                                  <button
                                    onClick={() => handleStartEdit(issue)}
                                    title="Editar Causa"
                                    className="p-3 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-2xl hover:scale-105 transition-all border border-slate-200"
                                  >
                                    <Edit2 size={16} />
                                  </button>

                                  <button
                                    onClick={() => handleDeleteIssue(issue.id)}
                                    title="Excluir Causa"
                                    className="p-3 bg-red-50 hover:bg-red-100 text-red-600 rounded-2xl hover:scale-105 transition-all border border-red-100"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </div>
                              </div>
                            </motion.div>
                          );
                        })}
                      </AnimatePresence>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add New Issue Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-[2rem] shadow-2xl border border-slate-100 w-full max-w-lg overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="p-6 md:p-8 bg-slate-900 text-white flex justify-between items-center">
              <div className="space-y-1">
                <h3 className="text-lg font-black uppercase tracking-wide">
                  {editingIssue ? 'Editar Causa de Manutenção' : 'Lançar Nova Causa de Manutenção'}
                </h3>
                <p className="text-slate-400 text-xs">
                  {editingIssue ? 'Edite os detalhes do problema ou falha técnica.' : 'Preencha os detalhes do problema ou falha técnica.'}
                </p>
              </div>
              <button
                onClick={() => {
                  setIsAddModalOpen(false);
                  setEditingIssue(null);
                }}
                className="p-2 bg-slate-800 hover:bg-slate-700 rounded-xl transition-all"
              >
                <X size={18} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmitIssue} className="p-6 md:p-8 space-y-5 overflow-y-auto max-h-[75vh]">
              {/* Title Input */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Título / Resumo (Opcional)</label>
                <input
                  type="text"
                  placeholder="Ex: Vazamento de óleo, Sensor com defeito, Correia gasta..."
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-slate-700 font-medium"
                />
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wide mt-1">Se deixado em branco, o título será gerado a partir da causa abaixo.</p>
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Causa / Descrição do Problema *</label>
                  <button
                    type="button"
                    onClick={handleImproveTextWithAI}
                    disabled={isImprovingText || !formCause.trim()}
                    className="inline-flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider bg-violet-50 hover:bg-violet-100 text-violet-700 disabled:opacity-40 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400 disabled:border-slate-100 px-2.5 py-1.5 rounded-xl border border-violet-100 hover:scale-102 active:scale-98 transition-all cursor-pointer"
                    title={!formCause.trim() ? "Digite a causa para poder melhorar com IA" : "Melhorar texto com IA"}
                  >
                    {isImprovingText ? (
                      <>
                        <Loader2 className="animate-spin" size={10} />
                        Melhorando...
                      </>
                    ) : (
                      <>
                        <Sparkles size={10} />
                        Melhorar com IA ✨
                      </>
                    )}
                  </button>
                </div>
                <textarea
                  required
                  placeholder="Descreva detalhadamente qual o defeito, ruído, desgaste ou falha a ser resolvida..."
                  value={formCause}
                  onChange={(e) => setFormCause(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-slate-700"
                />
                {aiFeedback && (
                  <p className={`text-[9px] font-black uppercase tracking-wider ${aiFeedback.includes('Erro') ? 'text-red-500' : 'text-emerald-600'} transition-all`}>
                    {aiFeedback}
                  </p>
                )}
              </div>

              {/* Priority */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Prioridade de Execução</label>
                <div className="grid grid-cols-4 gap-2">
                  {(['Baixa', 'Média', 'Alta', 'Crítica'] as MaintenancePriority[]).map((pri) => (
                    <button
                      key={pri}
                      type="button"
                      onClick={() => setFormPriority(pri)}
                      className={`py-2.5 rounded-xl border text-[10px] font-black uppercase tracking-wider transition-all ${formPriority === pri ? priorityColors[pri].bg + ' scale-102 border-current shadow-xs' : 'bg-slate-50 border-slate-200 text-slate-400 hover:bg-slate-100'}`}
                    >
                      {pri}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Sector */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Setor / Área *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Extrusão, Reciclagem"
                    value={formSector}
                    onChange={(e) => setFormSector(e.target.value)}
                    list="sector-suggestions"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-slate-700"
                  />
                  <datalist id="sector-suggestions">
                    {sectors.map(s => <option key={s} value={s} />)}
                  </datalist>
                </div>

                {/* Machine */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Máquina / Equipamento</label>
                  <input
                    type="text"
                    placeholder="Ex: Erema 1, Linha 2"
                    value={formMachine}
                    onChange={(e) => setFormMachine(e.target.value)}
                    list="machine-suggestions"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-slate-700"
                  />
                  <datalist id="machine-suggestions">
                    {machines.map(m => <option key={m} value={m} />)}
                  </datalist>
                </div>
              </div>

              {/* Reporter */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Quem Relatou (Relator)</label>
                <input
                  type="text"
                  value={formReporter}
                  disabled
                  className="w-full px-4 py-3 bg-slate-100 border border-slate-200 rounded-2xl text-xs text-slate-500 cursor-not-allowed font-bold"
                  placeholder="Nome do operador ou inspetor"
                />
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wide mt-1">Definido automaticamente pelo usuário logado</p>
              </div>

              {/* Submit / Cancel */}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setEditingIssue(null);
                  }}
                  className="px-5 py-3 bg-slate-100 hover:bg-slate-200 rounded-2xl text-xs font-black uppercase tracking-wide text-slate-600 transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-500 rounded-2xl text-xs font-black uppercase tracking-wide text-white transition-all shadow-md shadow-blue-500/10"
                >
                  {editingIssue ? 'Salvar Alterações' : 'Salvar'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Resolution Notes Modal (When checking off / resolving an issue) */}
      {selectedIssueForNotes && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-[2rem] shadow-2xl border border-slate-100 w-full max-w-md overflow-hidden"
          >
            <div className="p-6 bg-emerald-600 text-white flex justify-between items-center">
              <div>
                <h3 className="font-black uppercase tracking-wide text-sm md:text-base">Registrar Notas de Resolução</h3>
                <p className="text-emerald-100 text-[11px]">Como esta causa foi resolvida pela manutenção?</p>
              </div>
              <button
                onClick={() => setSelectedIssueForNotes(null)}
                className="p-1.5 bg-emerald-700 hover:bg-emerald-800 rounded-lg text-white"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Problema:</p>
                <p className="text-xs text-slate-700 font-bold leading-relaxed">{selectedIssueForNotes.cause}</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Observações de Solução / Peças Trocadas</label>
                <textarea
                  placeholder="Descreva a ação corretiva realizada, peças trocadas ou ajustes executados..."
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-slate-700"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedIssueForNotes(null)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-black uppercase text-slate-600 transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={submitResolution}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-xs font-black uppercase text-white transition-all shadow-md shadow-emerald-500/10"
                >
                  Concluir & Resolver
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* PDF Export Options Modal */}
      {isExportPdfModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-[2rem] shadow-2xl border border-slate-100 w-full max-w-md overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="p-6 bg-slate-900 text-white flex justify-between items-center">
              <div>
                <h3 className="font-black uppercase tracking-wide text-sm md:text-base">Exportar Relatório PDF</h3>
                <p className="text-slate-400 text-[11px]">Configure os filtros específicos para o documento PDF</p>
              </div>
              <button
                onClick={() => setIsExportPdfModalOpen(false)}
                className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-white transition-all"
              >
                <X size={16} />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-5">
              {/* Status Filter */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">Status das Ocorrências</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPdfStatusOption('Todos')}
                    className={`py-2 rounded-xl text-xs font-bold transition-all border ${pdfStatusOption === 'Todos' ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'}`}
                  >
                    Todos (Pendentes + Resolvidos)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPdfStatusOption('Resolvido')}
                    className={`py-2 rounded-xl text-xs font-bold transition-all border ${pdfStatusOption === 'Resolvido' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'}`}
                  >
                    Apenas Resolvidos
                  </button>
                  <button
                    type="button"
                    onClick={() => setPdfStatusOption('Pendente')}
                    className={`py-2 rounded-xl text-xs font-bold transition-all border col-span-2 ${pdfStatusOption === 'Pendente' ? 'bg-orange-50 border-orange-200 text-orange-700' : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'}`}
                  >
                    Apenas Pendentes
                  </button>
                </div>
              </div>

              {/* Date Filter Selection */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">Filtrar Período de Abertura</label>
                <select
                  value={pdfDateFilterType}
                  onChange={(e) => setPdfDateFilterType(e.target.value as any)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-slate-700 font-bold"
                >
                  <option value="Todos">Todo o Período (Sem Filtro de Data)</option>
                  <option value="Dia">Selecionar Dia Específico</option>
                  <option value="Mês">Selecionar Mês Específico</option>
                  <option value="Ano">Selecionar Ano Específico</option>
                </select>
              </div>

              {/* Day Selector */}
              {pdfDateFilterType === 'Dia' && (
                <div className="space-y-1.5 animate-in fade-in duration-200">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">Escolha o Dia</label>
                  <input
                    type="date"
                    value={pdfSelectedDay}
                    onChange={(e) => setPdfSelectedDay(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-slate-700 font-bold"
                  />
                </div>
              )}

              {/* Month Selector */}
              {pdfDateFilterType === 'Mês' && (
                <div className="space-y-1.5 animate-in fade-in duration-200">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">Escolha o Mês</label>
                  <input
                    type="month"
                    value={pdfSelectedMonth}
                    onChange={(e) => setPdfSelectedMonth(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-slate-700 font-bold"
                  />
                </div>
              )}

              {/* Year Selector */}
              {pdfDateFilterType === 'Ano' && (
                <div className="space-y-1.5 animate-in fade-in duration-200">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">Escolha o Ano</label>
                  <select
                    value={pdfSelectedYear}
                    onChange={(e) => setPdfSelectedYear(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-slate-700 font-bold"
                  >
                    {Array.from({ length: 5 }, (_, i) => String(new Date().getFullYear() - 2 + i)).map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Info Alert */}
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3.5 text-[11px] text-slate-500 flex gap-2">
                <span className="text-blue-500 font-black">ℹ</span>
                <span>O PDF respeitará também a busca e filtros de Setor/Prioridade selecionados na tela se estiverem ativos.</span>
              </div>

              {/* Footer Actions */}
              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsExportPdfModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-black uppercase text-slate-600 transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={exportPDFWithSettings}
                  className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 rounded-xl text-xs font-black uppercase text-white transition-all shadow-md shadow-slate-950/10 flex items-center gap-1.5"
                >
                  <Download size={14} />
                  <span>Gerar Relatório PDF</span>
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

    </div>
  );
};
