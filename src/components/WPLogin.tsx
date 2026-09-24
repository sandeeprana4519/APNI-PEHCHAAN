import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Eye, EyeOff, Lock, User, ArrowLeft, KeyRound, AlertCircle, CheckCircle, ShieldCheck } from 'lucide-react';

export const WPLogin: React.FC = () => {
  const { loginAdmin, adminCredentials, navigate, resetAdminCredentials } = useApp();

  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showLostPasswordModal, setShowLostPasswordModal] = useState(false);
  const [resetFeedback, setResetFeedback] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    setTimeout(() => {
      const res = loginAdmin(loginId, password, rememberMe);
      setIsLoading(false);
      if (!res.success) {
        setErrorMessage(res.error || 'Authentication failed.');
      }
    }, 400);
  };

  const handleFillDemo = () => {
    setLoginId(adminCredentials.username);
    setPassword(adminCredentials.password);
    setErrorMessage(null);
  };

  const handleResetToDefault = () => {
    resetAdminCredentials();
    setLoginId('admin');
    setPassword('admin@123');
    setResetFeedback('Admin credentials have been restored to default: admin / admin@123');
    setTimeout(() => {
      setResetFeedback(null);
    }, 4000);
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
                  placeholder="admin"
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
                  placeholder="••••••••"
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

          {/* Quick Demo Credentials Box */}
          <div className="pt-4 border-t border-slate-200">
            <div className="bg-amber-50/80 border border-amber-200/80 rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-amber-700" />
                  Default WP Credentials
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-200 text-amber-800 font-semibold">
                  Active
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs font-mono bg-white p-2 rounded border border-amber-100 text-slate-800">
                <div>
                  <span className="text-[10px] text-slate-400 block font-sans">Login ID:</span>
                  <span className="font-semibold text-slate-900">{adminCredentials.username}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-sans">Password:</span>
                  <span className="font-semibold text-slate-900">{adminCredentials.password}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={handleFillDemo}
                className="w-full py-1.5 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white text-[11px] font-semibold rounded cursor-pointer transition shadow-xs flex items-center justify-center gap-1.5"
              >
                <span>Auto-Fill Admin Credentials</span>
              </button>
            </div>
          </div>
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

        {/* Privacy & Affiliate Notice */}
        <p className="text-[11px] text-center text-slate-400">
          Protected WordPress 6.5 Admin Area · Session-Encrypted
        </p>
      </div>

      {/* Lost Password Modal */}
      {showLostPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
              <ShieldCheck className="w-5 h-5 text-amber-600" />
              <span>Admin Password Recovery</span>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Your administrator credentials are saved securely in your browser's persistent database. You can either use your active credentials below or reset to factory defaults anytime:
            </p>

            <div className="bg-slate-50 border border-slate-200 rounded p-3 text-xs space-y-1 font-mono">
              <div className="flex justify-between">
                <span className="text-slate-500 font-sans">Active Login ID:</span>
                <span className="font-bold text-slate-900">{adminCredentials.username}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-sans">Active Password:</span>
                <span className="font-bold text-slate-900">{adminCredentials.password}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-sans">Registered Email:</span>
                <span className="font-bold text-slate-900">{adminCredentials.email}</span>
              </div>
            </div>

            {resetFeedback && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs p-2.5 rounded flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{resetFeedback}</span>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={handleResetToDefault}
                className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded cursor-pointer"
              >
                Reset to Default
              </button>
              <button
                type="button"
                onClick={() => {
                  handleFillDemo();
                  setShowLostPasswordModal(false);
                }}
                className="flex-1 py-2 bg-[#2271b1] hover:bg-[#135e96] text-white text-xs font-semibold rounded cursor-pointer"
              >
                Use Credentials
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
