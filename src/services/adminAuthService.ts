import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CREDS_FILE = path.join(__dirname, '../../data/admin_creds.json');

export interface AdminCredentialsRecord {
  username: string;
  email: string;
  passwordHash: string; // Plain or hashed
  salt?: string;
  updatedAt: string;
}

export interface RecoverySession {
  code: string;
  token: string;
  email: string;
  username: string;
  expiresAt: number;
  attempts: number;
}

// In-memory recovery sessions map
const recoverySessions = new Map<string, RecoverySession>();

export const DEFAULT_ADMIN_RECORD: AdminCredentialsRecord = {
  username: 'admin',
  email: 'sandeeprana4519@gmail.com',
  passwordHash: 'admin@123',
  updatedAt: new Date().toISOString(),
};

export const loadAdminCredentials = (): AdminCredentialsRecord => {
  try {
    if (fs.existsSync(CREDS_FILE)) {
      const raw = fs.readFileSync(CREDS_FILE, 'utf-8');
      const data = JSON.parse(raw);
      if (data && data.username && data.email) {
        return {
          username: data.username,
          email: data.email,
          passwordHash: data.passwordHash || data.password || 'admin@123',
          updatedAt: data.updatedAt || new Date().toISOString(),
        };
      }
    }
  } catch (err) {
    console.warn('Could not read admin_creds.json, using defaults:', err);
  }
  return DEFAULT_ADMIN_RECORD;
};

export const saveAdminCredentials = (username: string, email: string, newPassword?: string): AdminCredentialsRecord => {
  const current = loadAdminCredentials();
  const updated: AdminCredentialsRecord = {
    username: username.trim() || current.username,
    email: email.trim().toLowerCase() || current.email,
    passwordHash: newPassword && newPassword.trim() ? newPassword.trim() : current.passwordHash,
    updatedAt: new Date().toISOString(),
  };

  try {
    const dir = path.dirname(CREDS_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(CREDS_FILE, JSON.stringify(updated, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to write admin_creds.json:', err);
  }

  return updated;
};

export const createRecoverySession = (email: string, username: string): RecoverySession => {
  // Generate random 6-digit numeric OTP
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const token = crypto.randomBytes(24).toString('hex');
  const session: RecoverySession = {
    code,
    token,
    email: email.toLowerCase().trim(),
    username,
    expiresAt: Date.now() + 15 * 60 * 1000, // 15 minutes
    attempts: 0,
  };

  // Index by token and by email
  recoverySessions.set(token, session);
  recoverySessions.set(session.email, session);
  recoverySessions.set(username.toLowerCase().trim(), session);

  return session;
};

export const verifyRecoveryCode = (
  identifier: string,
  code: string
): { success: boolean; token?: string; error?: string } => {
  const cleanId = identifier.toLowerCase().trim();
  const session = recoverySessions.get(cleanId);

  if (!session) {
    return {
      success: false,
      error: 'No active recovery request found. Please request a new recovery code.',
    };
  }

  if (Date.now() > session.expiresAt) {
    recoverySessions.delete(cleanId);
    return {
      success: false,
      error: 'The recovery code has expired (valid for 15 minutes). Please request a new one.',
    };
  }

  session.attempts += 1;
  if (session.attempts > 5) {
    recoverySessions.delete(cleanId);
    return {
      success: false,
      error: 'Too many invalid attempts. For security, this code was voided. Please request a new one.',
    };
  }

  if (session.code !== code.trim()) {
    return {
      success: false,
      error: `Invalid recovery code. ${5 - session.attempts} attempts remaining.`,
    };
  }

  return {
    success: true,
    token: session.token,
  };
};

export const completePasswordReset = (
  tokenOrCode: string,
  newPassword: string
): { success: boolean; username?: string; email?: string; error?: string } => {
  let session: RecoverySession | undefined;

  for (const [_, s] of recoverySessions.entries()) {
    if (s.token === tokenOrCode || s.code === tokenOrCode) {
      session = s;
      break;
    }
  }

  if (!session) {
    return {
      success: false,
      error: 'Invalid or expired password reset session. Please request a new recovery link.',
    };
  }

  if (Date.now() > session.expiresAt) {
    return {
      success: false,
      error: 'Password reset session has expired. Please start over.',
    };
  }

  if (!newPassword || newPassword.length < 5) {
    return {
      success: false,
      error: 'New password must be at least 5 characters long.',
    };
  }

  // Update credentials
  saveAdminCredentials(session.username, session.email, newPassword);

  // Clear sessions for this admin
  recoverySessions.delete(session.token);
  recoverySessions.delete(session.email);
  recoverySessions.delete(session.username.toLowerCase());

  return {
    success: true,
    username: session.username,
    email: session.email,
  };
};
