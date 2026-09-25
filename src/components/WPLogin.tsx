import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Eye, EyeOff, Lock, User, ArrowLeft, AlertCircle, CheckCircle, ShieldCheck, X, KeyRound, Mail, RefreshCw } from 'lucide-react';

export const WPLogin: React.FC = () => {
  const { loginAdmin, navigate, reloadAdminCredentials, showToast } = useApp();

  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Lost Password Modal state
  const [showLostPasswordModal, setShowLostPasswordModal] = useState(false);
  const [recoveryStep, setRecoveryStep] = useState<'request' | 'verify' | 'new_password' | 'success'>('request');
  const [recoveryIdentifier, setRecoveryIdentifier] = useState('');
  const [recoveryCode, setRecoveryCode] = useState('');
  const [recoveryToken, setRecoveryToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [recoveryLoading, setRecoveryLoading] = useState(false);
  const [recoveryError, setRecoveryError] = useState<string | null>(null);
  const [recoveryNotice, setRecoveryNotice] = useState<string | null>(null);
  const [recoveryDevCode, setRecoveryDevCode] = useState<string | null>(null);
  const [maskedEmail, setMaskedEmail] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsLoading(true);

    setTimeout(() => {
      const res = loginAdmin(loginId, password, rememberMe);
      setIsLoading(false);
      if (!res.success) {
        setErrorMessage(res.error || 'Authentication failed. Please verify your credentials.');
      }
    }, 400);
  };

  // Step 1: Send Recovery Email / Generate Code
  const handleRequestRecovery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recoveryIdentifier.trim()) {
      setRecoveryError('Please enter your username or registered recovery email.');
      return;
    }

    setRecoveryLoading(true);
    setRecoveryError(null);
    setRecoveryNotice(null);
    setRecoveryDevCode(null);

    try {
      const res = await fetch('/api/admin/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: recoveryIdentifier.trim() }),
      });

      const data = await res.json();
      setRecoveryLoading(false);

      if (!res.ok || !data.success) {
        setRecoveryError(data.error || 'Account not found. Please check your username or recovery email.');
        return;
      }

      setMaskedEmail(data.email || recoveryIdentifier);
      setRecoveryNotice(data.message || `Recovery instructions and code sent to ${data.email || 'your email'}.`);
      if (data.devCode) {
        setRecoveryDevCode(data.devCode);
        setRecoveryCode(data.devCode); // Pre-fill convenience
      }
      setRecoveryStep('verify');
    } catch (err: any) {
      setRecoveryLoading(false);
      setRecoveryError(err.message || 'Network error while contacting recovery service. Please try again.');
    }
  };

  // Step 2: Verify 6-digit Code
  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recoveryCode.trim() || recoveryCode.trim().length !== 6) {
      setRecoveryError('Please enter the 6-digit code sent to your email.');
      return;
    }

    setRecoveryLoading(true);
    setRecoveryError(null);

    try {
      const res = await fetch('/api/admin/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: recoveryIdentifier.trim(),
          code: recoveryCode.trim(),
        }),
      });

      const data = await res.json();
      setRecoveryLoading(false);

      if (!res.ok || !data.success) {
        setRecoveryError(data.error || 'Invalid or expired code. Please verify and try again.');
        return;
      }

      setRecoveryToken(data.token);
      setRecoveryStep('new_password');
    } catch (err: any) {
      setRecoveryLoading(false);
      setRecoveryError(err.message || 'Failed to verify code.');
    }
  };

  // Step 3: Set New Password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 5) {
      setRecoveryError('New password must be at least 5 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setRecoveryError('Passwords do not match. Please re-type carefully.');
      return;
    }

    setRecoveryLoading(true);
    setRecoveryError(null);

    try {
      const res = await fetch('/api/admin/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: recoveryToken,
          newPassword,
        }),
      });

      const data = await res.json();
      setRecoveryLoading(false);

      if (!res.ok || !data.success) {
        setRecoveryError(data.error || 'Failed to reset password. Session may have expired.');
        return;
      }

      // Reload credentials in context
      await reloadAdminCredentials();

      setRecoveryStep('success');
      setSuccessMessage('Password reset successfully! You can now log in.');
      setLoginId(data.username || recoveryIdentifier || 'admin');
      setPassword(newPassword);

      setTimeout(() => {
        setShowLostPasswordModal(false);
        showToast('Password updated! Please log in.');
      }, 2000);
    } catch (err: any) {
      setRecoveryLoading(false);
      setRecoveryError(err.message || 'Failed to update password.');
    }
  };

  const resetModalState = () => {
    setShowLostPasswordModal(false);
    setRecoveryStep('request');
    setRecoveryIdentifier('');
    setRecoveryCode('');
    setRecoveryToken('');
    setNewPassword('');
    setConfirmPassword('');
    setRecoveryError(null);
    setRecoveryNotice(null);
    setRecoveryDevCode(null);
  };

  return (
    <div className="min-h-screen bg-[#f0f0f1] text-[#3c434a] flex flex-col justify-center items-center px-4 py-12 font-sans">
      {/* Container sizing matches classic WP Login */}
      <div className="w-full max-w-[360px] space-y-6">
        {/* WordPress / Brand Logo Header */}
        <div className="text-center space-y-3">
          <div className="inline-block relative">
            <div className="w-20 h-20 rounded-2xl bg-white p-1.5 shadow-md border border-slate-200 mx-auto overflow-hidden">
              <img
                src="/apni-pehchaan-logo.jpg"
                alt="APNI PEHCHAAN Logo"
                className="w-full h-full object-contain"
                referrerPolicy="no-referrer"
              />
            </div>
            <span className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-slate-900 text-amber-400 border-2 border-white flex items-center justify-center text-[10px] font-black italic shadow-xs">
              W
            </span>
          </div>
          <div>
            <h1 className="font-display text-2xl font-black tracking-wider text-slate-900">
              APNI PEHCHAAN
            </h1>
            <p className="text-xs font-semibold tracking-wider uppercase text-slate-500">
              WordPress Affiliate Administration
            </p>
          </div>
        </div>

        {/* WordPress Classic Success Notice */}
        {successMessage && (
          <div className="bg-white border-l-4 border-emerald-600 p-3.5 shadow-xs text-xs text-slate-800 leading-relaxed rounded-r flex items-start gap-2.5">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <strong className="font-semibold text-emerald-700">SUCCESS: </strong>
              <span>{successMessage}</span>
            </div>
          </div>
        )}

        {/* WordPress Classic Error Notice */}
        {errorMessage && (
          <div className="bg-white border-l-4 border-rose-600 p-3.5 shadow-xs text-xs text-slate-800 leading-relaxed rounded-r flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <strong className="font-semibold text-rose-700">ERROR: </strong>
              <span>{errorMessage}</span>
            </div>
          </div>
        )}

        {/* WordPress Classic Card Form */}
        <div className="bg-white border border-[#c3c4c7] rounded shadow-xs p-6 space-y-5">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username or Email */}
            <div>
              <label
                htmlFor="user_login"
                className="block text-xs font-medium text-slate-700 mb-1.5"
              >
                Username or Email Address
              </label>
              <div className="relative">
                <input
                  id="user_login"
                  type="text"
                  required
                  autoFocus
                  autoComplete="username"
                  value={loginId}
                  onChange={(e) => setLoginId(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm bg-[#f6f7f7] border border-[#8c8f94] rounded focus:bg-white focus:border-[#2271b1] focus:ring-1 focus:ring-[#2271b1] text-slate-900 outline-none transition"
                />
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="user_pass"
                className="block text-xs font-medium text-slate-700 mb-1.5"
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="user_pass"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-10 py-2 text-sm bg-[#f6f7f7] border border-[#8c8f94] rounded focus:bg-white focus:border-[#2271b1] focus:ring-1 focus:ring-[#2271b1] text-slate-900 outline-none transition"
                />
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-1"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Remember Me & Submit Row */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-[#8c8f94] text-[#2271b1] focus:ring-[#2271b1] cursor-pointer"
                />
                <span className="text-xs text-slate-600 font-normal">Remember Me</span>
              </label>

              <button
                type="submit"
                disabled={isLoading}
                className="px-5 py-2 bg-[#2271b1] hover:bg-[#135e96] active:bg-[#0a4b78] text-white text-xs font-bold rounded shadow-xs cursor-pointer transition flex items-center gap-1.5 disabled:opacity-60"
              >
                {isLoading ? (
                  <span className="inline-block w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin"></span>
                ) : (
                  <span>Log In</span>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Footer Sub-links */}
        <div className="flex items-center justify-between text-xs text-[#646970] px-1">
          <button
            onClick={() => setShowLostPasswordModal(true)}
            className="hover:text-[#2271b1] hover:underline cursor-pointer"
          >
            Lost your password?
          </button>
          <button
            onClick={() => navigate('home')}
            className="flex items-center gap-1 hover:text-[#2271b1] hover:underline cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Go to APNI PEHCHAAN</span>
          </button>
        </div>

        {/* Privacy & Security Notice */}
        <p className="text-[11px] text-center text-slate-400">
          Protected WordPress 6.5 Admin Area · Session-Encrypted
        </p>
      </div>

      {/* Interactive Admin Password Recovery Modal */}
      {showLostPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95 relative">
            <button
              onClick={resetModalState}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-700 cursor-pointer p-1.5 rounded-lg hover:bg-slate-100 transition"
              aria-label="Close modal"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Header */}
            <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#2271b1] flex items-center justify-center shadow-xs">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 leading-tight">Admin Password Recovery</h3>
                <p className="text-[11px] text-slate-500">APNI PEHCHAAN Administrative Portal</p>
              </div>
            </div>

            {/* Step 1: Request Code */}
            {recoveryStep === 'request' && (
              <form onSubmit={handleRequestRecovery} className="space-y-4">
                <p className="text-xs text-slate-600 leading-relaxed">
                  Enter your Administrator Login ID or registered recovery email (<strong className="text-slate-800">sandeeprana4519@gmail.com</strong>). We will send a secure 6-digit verification code to reset your password.
                </p>

                {recoveryError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <span>{recoveryError}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Username or Recovery Email Address
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      autoFocus
                      placeholder="e.g. admin or sandeeprana4519@gmail.com"
                      value={recoveryIdentifier}
                      onChange={(e) => setRecoveryIdentifier(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 text-xs bg-[#f6f7f7] border border-[#8c8f94] rounded-lg focus:bg-white focus:border-[#2271b1] focus:ring-1 focus:ring-[#2271b1] text-slate-900 outline-none transition"
                    />
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                <div className="pt-1 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={resetModalState}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={recoveryLoading}
                    className="px-5 py-2.5 bg-[#2271b1] hover:bg-[#135e96] active:bg-[#0a4b78] text-white text-xs font-bold rounded-lg cursor-pointer transition shadow-xs flex items-center gap-2 disabled:opacity-60"
                  >
                    {recoveryLoading ? (
                      <>
                        <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                        <span>Sending Recovery Code...</span>
                      </>
                    ) : (
                      <>
                        <Mail className="w-3.5 h-3.5" />
                        <span>Send Recovery Code</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* Step 2: Enter Verification Code */}
            {recoveryStep === 'verify' && (
              <form onSubmit={handleVerifyCode} className="space-y-4">
                {recoveryNotice && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-900 flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                    <span>{recoveryNotice}</span>
                  </div>
                )}

                {recoveryDevCode && (
                  <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 flex items-center justify-between">
                    <div>
                      <div className="text-[10px] uppercase font-bold text-amber-700 tracking-wider">Active Recovery Code</div>
                      <div className="font-mono text-base font-black text-amber-950 tracking-widest">{recoveryDevCode}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setRecoveryCode(recoveryDevCode)}
                      className="text-[11px] font-semibold text-amber-800 underline hover:text-amber-950 cursor-pointer"
                    >
                      Use Code
                    </button>
                  </div>
                )}

                {recoveryError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <span>{recoveryError}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5 text-center">
                    Enter 6-Digit Verification Code
                  </label>
                  <input
                    type="text"
                    required
                    autoFocus
                    maxLength={6}
                    value={recoveryCode}
                    onChange={(e) => setRecoveryCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="123456"
                    className="w-full text-center font-mono text-2xl font-bold tracking-[8px] py-2.5 bg-[#f6f7f7] border border-[#8c8f94] rounded-lg focus:bg-white focus:border-[#2271b1] focus:ring-1 focus:ring-[#2271b1] text-slate-900 outline-none transition"
                  />
                  <p className="text-[11px] text-center text-slate-500 mt-1.5">
                    Valid for 15 minutes · Sent to registered inbox
                  </p>
                </div>

                <div className="pt-2 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => setRecoveryStep('request')}
                    className="text-xs font-medium text-slate-500 hover:text-slate-800 cursor-pointer flex items-center gap-1"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back</span>
                  </button>
                  <button
                    type="submit"
                    disabled={recoveryLoading || recoveryCode.length !== 6}
                    className="px-5 py-2.5 bg-[#2271b1] hover:bg-[#135e96] text-white text-xs font-bold rounded-lg cursor-pointer transition shadow-xs flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {recoveryLoading ? (
                      <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <KeyRound className="w-3.5 h-3.5" />
                        <span>Verify Code</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* Step 3: Create New Password */}
            {recoveryStep === 'new_password' && (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <p className="text-xs text-slate-600 leading-relaxed">
                  Identity verified! Create a secure new password for your admin account.
                </p>

                {recoveryError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <span>{recoveryError}</span>
                  </div>
                )}

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      New Password (minimum 5 characters) *
                    </label>
                    <div className="relative">
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        required
                        autoFocus
                        minLength={5}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Enter strong password"
                        className="w-full pl-9 pr-10 py-2 text-xs bg-[#f6f7f7] border border-[#8c8f94] rounded-lg focus:bg-white focus:border-[#2271b1] text-slate-900 outline-none"
                      />
                      <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-1"
                      >
                        {showNewPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Confirm New Password *
                    </label>
                    <div className="relative">
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        required
                        minLength={5}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Re-type new password"
                        className="w-full pl-9 pr-3 py-2 text-xs bg-[#f6f7f7] border border-[#8c8f94] rounded-lg focus:bg-white focus:border-[#2271b1] text-slate-900 outline-none"
                      />
                      <KeyRound className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="submit"
                    disabled={recoveryLoading}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-bold rounded-lg cursor-pointer transition shadow-xs flex items-center justify-center gap-1.5 disabled:opacity-60"
                  >
                    {recoveryLoading ? (
                      <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>Save Password & Return to Login</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* Step 4: Success */}
            {recoveryStep === 'success' && (
              <div className="py-6 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center">
                  <CheckCircle className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-slate-900">Password Changed!</h4>
                <p className="text-xs text-slate-600">
                  Your credentials have been securely updated. Logging in...
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
