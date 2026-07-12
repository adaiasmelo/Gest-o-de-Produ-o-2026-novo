import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getMessaging, Messaging } from 'firebase/messaging';
import { 
  doc, setDoc, getDoc, collection, query, where, onSnapshot, getDocs, deleteDoc,
  getFirestore, getDocFromServer
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);

// Inicialização do Messaging (Client-Side) - Apenas se suportado pelo navegador
export let messaging: Messaging | null = null;
try {
  messaging = getMessaging(app);
} catch (e) {
  console.warn("Firebase Messaging não é suportado neste navegador.");
}

// Inicialização do Firestore usando getFirestore com o Database ID correto
export const db = getFirestore(app, 'ai-studio-f0309e5c-c262-4bce-92fb-80bc63dce14b');

console.log('Firebase Init: Conectando ao Banco: ai-studio-f0309e5c-c262-4bce-92fb-80bc63dce14b');

// Validação de Conexão conforme a Skill
async function testConnection() {
  try {
    // Tenta ler um documento qualquer para testar permissões e conexão
    await getDocFromServer(doc(db, 'settings', 'global'));
    console.log('Firebase Connection: Sucesso!');
  } catch (error) {
    console.error("Firebase Connection Error:", error);
  }
}
testConnection();


export const auth = getAuth();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const isOffline = error instanceof Error && (
    error.message.includes('the client is offline') || 
    error.message.includes('network-error') ||
    error.message.includes('Failed to get document because the client is offline')
  );

  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  }
  
  if (isOffline) {
    console.warn('PWA Offline:', operationType, path);
    // Não lança erro se for apenas offline, permite que o Firestore use o cache silenciosamente
    return;
  }

  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export const seedInitialData = async (data: {
    productionEntries: any[],
    employees: any[],
    logs: any[],
    operators: string[],
    roles: string[],
    goals: any
}) => {
    try {
        // Clear or just add
        const currentUid = auth.currentUser?.uid || 'system';
        
        for (const entry of data.productionEntries) {
            await setDoc(doc(db, 'productionEntries', entry.id), { ...entry, userId: currentUid });
        }
        for (const emp of data.employees) {
            await setDoc(doc(db, 'employees', emp.id), { ...emp, userId: currentUid });
        }
        for (const log of data.logs) {
            await setDoc(doc(db, 'personnelLogs', log.id), { ...log, userId: currentUid });
        }
        
        await setDoc(doc(db, 'settings', 'global'), {
            operators: data.operators,
            availableRoles: data.roles,
            goals: data.goals,
            lastUpdated: new Date().toISOString()
        });
        
    } catch (e) {
        handleFirestoreError(e, OperationType.WRITE, 'seed');
    }
}
