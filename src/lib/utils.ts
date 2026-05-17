import { Info } from 'lucide-react';

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
  authInfo?: any;
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export function getSiteId(): string {
  if (typeof window === 'undefined') return 'appSettings';
  const host = window.location.hostname;
  const path = window.location.pathname.replace(/\/$/, '');
  
  // Custom domains or GitHub pages with path
  let id = `${host}${path}`.replace(/[^a-zA-Z0-9]/g, '_');
  
  // If it's localhost or an AI Studio preview environment, group them
  if (host === 'localhost' || host.includes('run.app') || host.includes('webcontainer.io')) {
    id = 'appSettings_dev';
  }
  
  return id || 'appSettings_default';
}

export function formatNum(value: number | string, digits: number = 2): string {
  const num = Number(value);
  if (isNaN(num)) return (0).toFixed(digits);
  const result = num.toFixed(digits);
  if (result === '-0.00' || result === '-0.0' || result === '-0') {
    return (0).toFixed(digits);
  }
  return result;
}
