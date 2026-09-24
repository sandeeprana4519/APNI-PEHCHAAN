import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Eye, EyeOff, Lock, User, ArrowLeft, AlertCircle, CheckCircle, ShieldCheck, X } from 'lucide-react';

export const WPLogin: React.FC = () => {
  const { loginAdmin, navigate } = useApp();

  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showLostPasswordModal, setShowLostPasswordModal] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [recoverySent, setRecoverySent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    setTimeout(() => {
      const res = loginAdmin(loginId, password, rememberMe);
      setIsLoading(false);
      if (!res.success) {
        setErrorMessage(res.error || 'Authentication failed. Please verify your credentials.');
      }
    }, 400);
  };

  const handlePasswordResetRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!recoveryEmail.trim()) return;
    setRecoverySent(true);
    setTimeout(() => {
      setRecoverySent(false);
      setShowLostPasswordModal(false);
      setRecoveryEmail('');
    }, 3500);
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

      {/* Lost Password Modal */}
      {showLostPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 relative">
            <button
              onClick={() => setShowLostPasswordModal(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-700 cursor-pointer p-1"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
              <ShieldCheck className="w-5 h-5 text-[#2271b1]" />
              <span>Lost Password</span>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Please enter your username or registered email address. You will receive confirmation to reset your password.
            </p>

            {recoverySent ? (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs p-3 rounded-lg flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Password reset link sent to your registered address!</span>
              </div>
            ) : (
              <form onSubmit={handlePasswordResetRequest} className="space-y-3">
                <input
                  type="text"
                  required
                  placeholder="Username or Email Address"
                  value={recoveryEmail}
                  onChange={(e) => setRecoveryEmail(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[#f6f7f7] border border-[#8c8f94] rounded focus:bg-white focus:border-[#2271b1] focus:ring-1 focus:ring-[#2271b1] text-slate-900 outline-none"
                />
                <button
                  type="submit"
                  className="w-full py-2 bg-[#2271b1] hover:bg-[#135e96] text-white text-xs font-semibold rounded cursor-pointer transition shadow-xs"
                >
                  Get New Password
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
