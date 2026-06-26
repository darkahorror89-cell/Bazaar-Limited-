import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

import autoConfig from '../firebase-applet-config.json';

// Default configuration with environment variable support
const env = (import.meta as any).env || {};

const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY || autoConfig.apiKey || "PLACEHOLDER",
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || autoConfig.authDomain || "PLACEHOLDER",
  projectId: env.VITE_FIREBASE_PROJECT_ID || autoConfig.projectId || "PLACEHOLDER",
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || autoConfig.storageBucket || "PLACEHOLDER",
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || autoConfig.messagingSenderId || "PLACEHOLDER",
  appId: env.VITE_FIREBASE_APP_ID || autoConfig.appId || "PLACEHOLDER",
  firestoreDatabaseId: env.VITE_FIREBASE_DATABASE_ID || autoConfig.firestoreDatabaseId || ""
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
}, firebaseConfig.firestoreDatabaseId || undefined);
export const storage = getStorage(app);

// Firestore operation types
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

/**
 * Hardened Firestore error handler required by system guidelines
 * to diagnose permission issues.
 */
export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
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
  };
  console.error('Firestore Error Details: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}
