import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CONFIG_FILE = path.join(__dirname, '../../data/smtp_config.json');
const PROVIDER_FILE = path.join(__dirname, '../../data/mail_provider.json');

const DEFAULT_SUPABASE_URL = 'https://awzkiktbcfssifdxdvxr.supabase.co';
const DEFAULT_SUPABASE_KEY = 'sb_publishable_yicIcn3U8j5n6eCZEI2RUA_7LF_X-19';

export type EmailProviderMode = 'supabase' | 'smtp' | 'both';

export interface MailProviderConfig {
  mode: EmailProviderMode;
  supabaseUrl: string;
  supabaseKey: string;
  updatedAt: string;
}

export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean; // true for 465, false for 587
  user: string;
  pass: string;
  fromName: string;
  fromEmail: string;
}

export const getDefaultSmtpConfig = (): SmtpConfig => {
  return {
    host: process.env.SMTP_HOST || 'smtp.hostinger.com',
    port: Number(process.env.SMTP_PORT) || 465,
    secure: process.env.SMTP_SECURE !== 'false',
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    fromName: process.env.SMTP_FROM_NAME || 'APNI PEHCHAAN Security',
    fromEmail: process.env.SMTP_FROM_EMAIL || 'support@apnipehchaan.in',
  };
};

export const loadProviderConfig = (): MailProviderConfig => {
  try {
    if (fs.existsSync(PROVIDER_FILE)) {
      const data = JSON.parse(fs.readFileSync(PROVIDER_FILE, 'utf-8'));
      if (data && data.mode) {
        return {
          mode: data.mode,
          supabaseUrl: data.supabaseUrl || process.env.SUPABASE_URL || DEFAULT_SUPABASE_URL,
          supabaseKey: data.supabaseKey || process.env.SUPABASE_ANON_KEY || DEFAULT_SUPABASE_KEY,
          updatedAt: data.updatedAt || new Date().toISOString(),
        };
      }
    }
  } catch (err) {
    console.warn('Could not read mail_provider.json, using defaults:', err);
  }

  return {
    mode: 'both', // Both Supabase Auth & SMTP ensure maximum reliability
    supabaseUrl: process.env.SUPABASE_URL || DEFAULT_SUPABASE_URL,
    supabaseKey: process.env.SUPABASE_ANON_KEY || DEFAULT_SUPABASE_KEY,
    updatedAt: new Date().toISOString(),
  };
};

export const saveProviderConfig = (cfg: Partial<MailProviderConfig>): MailProviderConfig => {
  const current = loadProviderConfig();
  const updated: MailProviderConfig = {
    ...current,
    ...cfg,
    updatedAt: new Date().toISOString(),
  };

  try {
    const dir = path.dirname(PROVIDER_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(PROVIDER_FILE, JSON.stringify(updated, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to save mail_provider.json:', err);
  }

  return updated;
};

export const loadSmtpConfig = (): SmtpConfig => {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const data = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
      return {
        ...getDefaultSmtpConfig(),
        ...data,
      };
    }
  } catch (err) {
    console.warn('Could not read smtp_config.json, using defaults:', err);
  }
  return getDefaultSmtpConfig();
};

export const saveSmtpConfig = (config: Partial<SmtpConfig>): SmtpConfig => {
  const current = loadSmtpConfig();
  const updated: SmtpConfig = {
    ...current,
    ...config,
    port: Number(config.port) || current.port || 465,
    secure: config.secure !== undefined ? Boolean(config.secure) : current.secure,
  };

  try {
    const dir = path.dirname(CONFIG_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(updated, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to save smtp_config.json:', err);
  }

  return updated;
};

export const getTransporter = (customConfig?: SmtpConfig) => {
  const cfg = customConfig || loadSmtpConfig();
  if (!cfg.host || !cfg.user || !cfg.pass) {
    return null;
  }

  return nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure,
    auth: {
      user: cfg.user,
      pass: cfg.pass,
    },
    tls: {
      rejectUnauthorized: false, // Prevents self-signed cert blocks on custom mail hosts
    },
  });
};

export const verifySmtp = async (config?: SmtpConfig): Promise<{ success: boolean; error?: string }> => {
  const cfg = config || loadSmtpConfig();
  if (!cfg.host || !cfg.user || !cfg.pass) {
    return {
      success: false,
      error: 'SMTP host, username, and password are required to send emails.',
    };
  }

  try {
    const transporter = getTransporter(cfg);
    if (!transporter) {
      return { success: false, error: 'Failed to initialize mail transporter.' };
    }
    await transporter.verify();
    return { success: true };
  } catch (err: any) {
    console.error('SMTP verification failed:', err);
    return {
      success: false,
      error: err.message || 'SMTP connection verification failed. Please check host, port, and credentials.',
    };
  }
};

/**
 * Dispatches a password reset email using Supabase Auth Email Template
 */
export const triggerSupabaseAuthRecoveryEmail = async (options: {
  email: string;
  redirectTo?: string;
}): Promise<{ success: boolean; method: string; error?: string }> => {
  const prov = loadProviderConfig();
  const url = prov.supabaseUrl || DEFAULT_SUPABASE_URL;
  const key = prov.supabaseKey || DEFAULT_SUPABASE_KEY;

  if (!url || !key) {
    return { success: false, method: 'supabase', error: 'Supabase credentials not configured' };
  }

  try {
    const client = createClient(url, key, { auth: { persistSession: false } });
    const redirect = options.redirectTo || 'https://apnipehchaan.in/wp-admin';

    // 1. Primary: trigger standard Supabase resetPasswordForEmail
    const { error: resetErr } = await client.auth.resetPasswordForEmail(options.email.trim(), {
      redirectTo: redirect,
    });

    if (!resetErr) {
      console.log(`[SupabaseAuth] Password reset email triggered for ${options.email} via resetPasswordForEmail`);
      return { success: true, method: 'Supabase Auth (resetPasswordForEmail)' };
    }

    console.warn(`[SupabaseAuth] resetPasswordForEmail returned: ${resetErr.message}. Trying signInWithOtp fallback...`);

    // 2. Fallback: trigger signInWithOtp which sends a secure magic link / OTP template
    const { error: otpErr } = await client.auth.signInWithOtp({
      email: options.email.trim(),
      options: {
        emailRedirectTo: redirect,
        shouldCreateUser: true,
      },
    });

    if (!otpErr) {
      console.log(`[SupabaseAuth] Recovery OTP email triggered for ${options.email} via signInWithOtp`);
      return { success: true, method: 'Supabase Auth (signInWithOtp)' };
    }

    return {
      success: false,
      method: 'Supabase Auth',
      error: otpErr.message || resetErr.message,
    };
  } catch (err: any) {
    console.error('[SupabaseAuth] Error triggering recovery email:', err);
    return {
      success: false,
      method: 'Supabase Auth',
      error: err.message || 'Failed to trigger Supabase Auth email',
    };
  }
};

export interface SendRecoveryOptions {
  toEmail: string;
  username: string;
  code: string;
  ipAddress?: string;
  origin?: string;
  config?: SmtpConfig;
}

export interface RecoveryDispatchResult {
  success: boolean;
  supabaseTriggered: boolean;
  smtpTriggered: boolean;
  simulated: boolean;
  message: string;
  messageId?: string;
  error?: string;
}

/**
 * Unified recovery email dispatcher: supports Supabase Auth email template and/or custom SMTP
 */
export const sendPasswordRecoveryEmail = async (
  options: SendRecoveryOptions
): Promise<RecoveryDispatchResult> => {
  const { toEmail, username, code, ipAddress, origin, config } = options;
  const prov = loadProviderConfig();
  const cfg = config || loadSmtpConfig();
  const transporter = getTransporter(cfg);

  let supabaseSuccess = false;
  let supabaseError: string | undefined;
  let smtpSuccess = false;
  let smtpError: string | undefined;
  let smtpMsgId: string | undefined;

  const redirectTo = origin
    ? `${origin}/?view=wp-admin&reset_code=${code}`
    : `https://apnipehchaan.in/?view=wp-admin&reset_code=${code}`;

  // 1. Dispatch via Supabase Auth Email Template if mode is 'supabase' or 'both'
  if (prov.mode === 'supabase' || prov.mode === 'both') {
    const sbRes = await triggerSupabaseAuthRecoveryEmail({
      email: toEmail,
      redirectTo,
    });
    if (sbRes.success) {
      supabaseSuccess = true;
    } else {
      supabaseError = sbRes.error;
    }
  }

  // 2. Dispatch via SMTP if mode is 'smtp' or 'both'
  if (prov.mode === 'smtp' || prov.mode === 'both') {
    if (transporter) {
      const subject = `APNI PEHCHAAN - Admin Password Reset Code: ${code}`;
      const htmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <title>Password Recovery - APNI PEHCHAAN</title>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 24px; }
              .container { max-width: 540px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
              .header { background: #0f172a; padding: 28px 24px; text-align: center; border-bottom: 3px solid #d97706; }
              .title { color: #ffffff; font-size: 20px; font-weight: 800; letter-spacing: 1px; margin: 0; }
              .subtitle { color: #f59e0b; font-size: 11px; text-transform: uppercase; font-weight: 700; margin-top: 4px; letter-spacing: 1.5px; }
              .content { padding: 32px 28px; line-height: 1.6; }
              .greeting { font-size: 16px; font-weight: 600; color: #0f172a; margin-bottom: 12px; }
              .code-box { background: #fffbeb; border: 2px dashed #f59e0b; border-radius: 10px; padding: 20px; text-align: center; margin: 24px 0; }
              .code-label { font-size: 11px; font-weight: 700; text-transform: uppercase; color: #b45309; letter-spacing: 1px; margin-bottom: 6px; }
              .code { font-family: monospace; font-size: 32px; font-weight: 900; letter-spacing: 8px; color: #92400e; }
              .warning { font-size: 12px; color: #64748b; background: #f1f5f9; padding: 12px 16px; border-radius: 8px; margin-top: 20px; }
              .footer { background: #f8fafc; padding: 20px 24px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1 class="title">APNI PEHCHAAN</h1>
                <div class="subtitle">Admin Security & Password Recovery</div>
              </div>
              <div class="content">
                <div class="greeting">Hello ${username || 'Administrator'},</div>
                <p style="margin: 0 0 16px 0; font-size: 14px; color: #475569;">
                  A password reset request was initiated for your <strong>APNI PEHCHAAN</strong> administrative account. Use the one-time verification code below to authorize the change:
                </p>

                <div class="code-box">
                  <div class="code-label">One-Time Recovery Code</div>
                  <div class="code">${code}</div>
                </div>

                <p style="font-size: 13px; color: #475569; margin-bottom: 8px;">
                  ⏱️ This security code is valid for <strong>15 minutes</strong>.
                </p>
                <p style="font-size: 13px; color: #475569; margin-bottom: 0;">
                  Enter this code on the WordPress Admin login screen to create a new password and restore dashboard access.
                </p>

                <div class="warning">
                  <strong>Security Alert:</strong> If you did not make this request, you can safely disregard this message. Your password remains unchanged.
                  ${ipAddress ? `<br><span style="font-size: 11px; color: #94a3b8;">Requested from IP: ${ipAddress}</span>` : ''}
                </div>
              </div>
              <div class="footer">
                APNI PEHCHAAN · Cultural Commerce & Verified Affiliate Network<br>
                Protected by Hostinger & Cloud Run Secure TLS
              </div>
            </div>
          </body>
        </html>
      `;

      try {
        const info = await transporter.sendMail({
          from: `"${cfg.fromName}" <${cfg.fromEmail || cfg.user}>`,
          to: toEmail,
          subject,
          text: `Your APNI PEHCHAAN Admin Password Recovery Code is: ${code}. It expires in 15 minutes.`,
          html: htmlContent,
        });
        smtpSuccess = true;
        smtpMsgId = info.messageId;
      } catch (err: any) {
        smtpError = err.message;
        console.error('[MailService] SMTP send error:', err);
      }
    }
  }

  const isDelivered = supabaseSuccess || smtpSuccess;

  let msg = '';
  if (supabaseSuccess && smtpSuccess) {
    msg = `Password recovery dispatched via both Supabase Auth email template & SMTP server to ${toEmail}.`;
  } else if (supabaseSuccess) {
    msg = `Password recovery email dispatched successfully via Supabase Auth email template to ${toEmail}.`;
  } else if (smtpSuccess) {
    msg = `Password recovery email dispatched successfully via SMTP server to ${toEmail}.`;
  } else {
    msg = `One-time recovery code generated. (SMTP/Supabase auth email was not dispatched; emergency code provided for direct verification).`;
  }

  return {
    success: true, // Local session is always created with valid OTP
    supabaseTriggered: supabaseSuccess,
    smtpTriggered: smtpSuccess,
    simulated: !isDelivered,
    message: msg,
    messageId: smtpMsgId,
    error: isDelivered ? undefined : (smtpError || supabaseError),
  };
};

/**
 * Sends a test email to verify configuration
 */
export const sendTestEmail = async (
  toEmail: string,
  preferredProvider?: EmailProviderMode,
  config?: SmtpConfig
): Promise<{
  success: boolean;
  providerUsed: string;
  messageId?: string;
  error?: string;
}> => {
  const prov = loadProviderConfig();
  const provider = preferredProvider || prov.mode;

  // 1. If testing Supabase Auth
  if (provider === 'supabase') {
    const sbRes = await triggerSupabaseAuthRecoveryEmail({
      email: toEmail,
      redirectTo: 'https://apnipehchaan.in/wp-admin?test=true',
    });
    if (sbRes.success) {
      return {
        success: true,
        providerUsed: 'Supabase Auth Email Template',
      };
    }
    return {
      success: false,
      providerUsed: 'Supabase Auth',
      error: sbRes.error || 'Failed to trigger Supabase Auth email template.',
    };
  }

  // 2. If testing SMTP
  const cfg = config || loadSmtpConfig();
  const transporter = getTransporter(cfg);

  if (provider === 'smtp') {
    if (!transporter) {
      return {
        success: false,
        providerUsed: 'SMTP Server',
        error: 'SMTP host, username, or password is not configured. Please fill in your SMTP credentials below.',
      };
    }

    try {
      const info = await transporter.sendMail({
        from: `"${cfg.fromName}" <${cfg.fromEmail || cfg.user}>`,
        to: toEmail,
        subject: 'APNI PEHCHAAN - SMTP Recovery Email Test Successful',
        text: `Congratulations! Your APNI PEHCHAAN administrative recovery email is working properly. Emails will be delivered to: ${toEmail}`,
        html: `
          <div style="font-family: sans-serif; padding: 24px; max-width: 500px; margin: 0 auto; background: #ffffff; border-radius: 8px; border: 1px solid #e2e8f0;">
            <h2 style="color: #0f172a; margin-top: 0;">APNI PEHCHAAN · Mailer Test</h2>
            <p style="color: #10b981; font-weight: bold; font-size: 16px;">✓ Email Delivery Connection Confirmed!</p>
            <p style="color: #475569; font-size: 14px; line-height: 1.5;">
              Your recovery email address (<strong>${toEmail}</strong>) is verified via custom SMTP (${cfg.host}).
            </p>
            <div style="font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 12px; margin-top: 20px;">
              Sent from APNI PEHCHAAN Admin Panel via ${cfg.host} (${cfg.port})
            </div>
          </div>
        `,
      });

      return {
        success: true,
        providerUsed: `SMTP (${cfg.host})`,
        messageId: info.messageId,
      };
    } catch (err: any) {
      console.error('[MailService] Test email failed:', err);
      return {
        success: false,
        providerUsed: 'SMTP Server',
        error: err.message || 'SMTP delivery failed. Check your host, port, username, and password.',
      };
    }
  }

  // 3. Testing 'both'
  const sbRes = await triggerSupabaseAuthRecoveryEmail({
    email: toEmail,
    redirectTo: 'https://apnipehchaan.in/wp-admin?test=true',
  });

  let smtpWorked = false;
  let smtpErrMsg = '';
  if (transporter) {
    try {
      await transporter.sendMail({
        from: `"${cfg.fromName}" <${cfg.fromEmail || cfg.user}>`,
        to: toEmail,
        subject: 'APNI PEHCHAAN - SMTP Recovery Email Test Successful',
        text: `Test recovery email to ${toEmail}`,
      });
      smtpWorked = true;
    } catch (err: any) {
      smtpErrMsg = err.message;
    }
  }

  if (sbRes.success || smtpWorked) {
    const parts: string[] = [];
    if (sbRes.success) parts.push('Supabase Auth');
    if (smtpWorked) parts.push(`SMTP (${cfg.host})`);
    return {
      success: true,
      providerUsed: parts.join(' + '),
    };
  }

  return {
    success: false,
    providerUsed: 'Both (Supabase Auth + SMTP)',
    error: `Supabase: ${sbRes.error || 'Failed'} | SMTP: ${smtpErrMsg || 'Not configured'}`,
  };
};
