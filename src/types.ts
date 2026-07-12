
export interface ProductionEntry {
  id: string;
  date: string;
  operator: string;
  machine: string;
  shift: string;
  grossWeight: number;
  tara: number;
  netWeight: number;
  volumes: number;
  tubetes: number;
  tubetesEcoB?: number;
  ecoA: number;
  ecoBP: number;
  ecoBM: number;
  borraTotal: number;
  manutencaoMin: number;
  manutencaoMotivo?: string;
  processoMin: number;
  processoMotivo?: string;
  outrosMin: number;
  outrosMotivo?: string;
  isMaintenanceEntry?: boolean;
  isNoWorkDay?: boolean;
  noWorkReason?: string;
  updatedAt: string;
  userId: string;
  eremaWeight1?: number;
  eremaWeight2?: number;
  eremaWeight3?: number;
  eremaWeight4?: number;
  recycledUsed?: number;
  recycledBags?: number;
  ecoAMotivo?: string;
  ecoBPMotivo?: string;
  ecoBMMotivo?: string;
  borraTotalMotivo?: string;
  materialType?: 'LC3' | 'LC2' | 'ATX' | 'ATX Plus' | string;
  materials?: Array<{
    id: string;
    materialType: string;
    volumes: number;
    tubetes: number;
    tubetesEcoB: number;
  }>;
}

export interface SummaryStats {
  totalNet: number;
  ecoA: number;
  ecoBP: number;
  ecoBM: number;
  borra: number;
  paradas: number;
}

export interface Shift {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  type: 'Diurno' | 'Noturno';
}

export interface Collaborator {
  id: string;
  registration: string; // Matricula
  name: string;
  role: string;
  birthDate?: string;
  address?: string;
  contact?: string;
  updatedAt: string;
  isBrigadista?: boolean;
}

export type EmployeeStatus = 'Ativo' | 'Férias' | 'Atestado' | 'Desligado' | 'Em Contratação' | 'Vaga Excluída';

export interface Employee {
  id: string;
  registration: string; // Matricula
  collaboratorId?: string; // Link to the central database
  name: string;
  role: string; // Changed from strict union to string to allow dynamic roles
  sector: string; // Extrusão, Reciclagem, Fita
  machine: string;
  shift: string;
  status: EmployeeStatus;
  statusDetails?: string; // Motivo do atestado, observações
  returnDate?: string; // Data de retorno para Férias/Atestado
  updatedAt: string;
  isBrigadista?: boolean;
  orderIndex?: number;
  inicioPeriodo?: string;
  vencPeriodo?: string;
  dataLimiteGozo?: string;
  sldVenc?: number;
  inicioGozoPrevisto?: string | number;
}

export interface Vacation {
  id: string; // Firestore document ID
  employeeId: string;
  employeeName: string;
  registration: string;
  sector: string;
  role: string;
  machine: string;
  shift: string;
  year: number; // 2026
  month: number; // 1-12
  durationDays: 20 | 30;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  updatedAt: string;
}

export interface PersonnelLog {
  id: string;
  date: string;
  employeeName: string;
  action: 'Contratação' | 'Alteração' | 'Férias' | 'Atestado' | 'Transferência' | 'Desligamento' | 'Retorno';
  details: string;
  user: string; // Quem fez a alteração
  userId: string;
}

// Interfaces para Estrutura Dinâmica
export interface MachineStructure {
  name: string;
  roles: string[]; // Lista de cargos (slots) dessa máquina
}

export interface ShiftStructure {
  name: string; // ou 'shift' para extrusão
  machines?: MachineStructure[]; // Para estrutura tipo Extrusão
  roles?: string[]; // Para estrutura tipo Erema/Fita onde roles estão direto no turno dentro da maquina
}

export interface SectorStructureExtrusao {
  shift: string;
  machines: MachineStructure[];
}

export interface SectorStructureStandard {
  name: string;
  shifts: { name: string; roles: string[] }[];
}

export interface SectorStructureLeadership {
  shift: string;
  roles: string[];
}

export interface PersonnelStructure {
  leadership: SectorStructureLeadership[];
  extrusao: SectorStructureExtrusao[];
  erema: SectorStructureStandard[];
  fitaAdesiva: SectorStructureStandard[];
}

export interface TrainingRecord {
  id: string;
  training: string;
  date: string;
  duration: string;
  location: string;
  instructor: string;
  content: string;
  participants: {
    registration: string;
    name: string;
  }[];
  createdAt: string;
  updatedAt?: string;
}

export interface OperatorTrainingModule {
  completed: boolean;
  date?: string;
  notes?: string;
}

export interface OperatorTrainingSheet {
  id: string;
  employeeId: string;
  employeeName: string;
  registration: string;
  instructorName: string;
  startDate: string;
  lastUpdated: string;
  progress: number; // 0 to 100
  modules: {
    [key: string]: OperatorTrainingModule;
  };
  targetRole?: string;
  currentRole?: string;
}

export interface TrainingTemplate {
  id: string;
  companyName: string;
  subCompanyName: string;
  subtitle: string;
  formCode: string;
  baseFontSize: number;
  titleFontSize: number;
  footerText: string;
  logoBase64?: string;
}

export interface UserPermissions {
  canViewDashboard: boolean;
  canViewReports: boolean;
  canViewPersonnel: boolean;
  canManageSettings: boolean;
  canEditProduction: boolean;
  canManagePersonnel: boolean;
  isReadOnly: boolean;
}

export interface SystemUser {
  id: string;
  name: string;
  registration: string; // Matricula
  role: string;
  password?: string;
  isFirstAccess: boolean;
  biometricId?: string;
  permissions?: UserPermissions;
}

export interface StockItem {
  code: string;
  name: string; // descrição
  quantity: number;
  location: 'Fábrica' | 'Galpão' | string;
}

export interface StockEntry {
  id: string;
  date: string;
  items: StockItem[];
  totalWeight: number;
  updatedAt: string;
  userId: string;
}

export interface RibbonCuttingEntry {
  id: string;
  date: string;
  operator: string;
  shift: string;
  producedM2: number; // metros quadrados produzido
  rejectedM2: number; // não conforme em metros quadrados
  wasteWeight: number; // lixo em peso (Kg)
  jumboM2: number; // quantidade de jumbos em metros quadrados
  jumboType: string; // tipo de jumbo utilizado (AA40, AS50, Hotmalt, AR9)
  updatedAt: string;
  userId: string;
  machine?: string;
  rollsCount?: number;
  rollWidth?: number;
  rollLength?: number;
  orderNumber?: string;
  rollsTipo1?: number;
  rollsTipo2?: number;
  m2Tipo1?: number;
  m2Tipo2?: number;
  jumboItems?: Array<{
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
  }>;
  stoppedMinutes?: number;
  stoppedReason?: string;
  manutencaoMin?: number;
  manutencaoMotivo?: string;
  processoMin?: number;
  processoMotivo?: string;
  outrosMin?: number;
  outrosMotivo?: string;
}

export interface StopItem {
  id: string;
  de: string;
  ate: string;
  motivo: string;
}

export type MaintenancePriority = 'Baixa' | 'Média' | 'Alta' | 'Crítica';
export type MaintenanceStatus = 'Pendente' | 'Em Andamento' | 'Resolvido';

export interface MaintenanceIssue {
  id: string;
  title?: string;
  cause: string;
  priority: MaintenancePriority;
  sector: string;
  machine: string;
  reporter: string;
  status: MaintenanceStatus;
  notes?: string;
  solution?: string;
  createdAt: string;
  resolvedAt?: string;
  userId: string;
}


