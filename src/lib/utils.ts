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

export function formatNum(value: number | string, digits: number = 2): string {
  const num = Number(value);
  if (isNaN(num)) return (0).toFixed(digits);
  const result = num.toFixed(digits);
  if (result === '-0.00' || result === '-0.0' || result === '-0') {
    return (0).toFixed(digits);
  }
  return result;
}
