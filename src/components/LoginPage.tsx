import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Lock, 
  User, 
  ArrowRight, 
  Cpu, 
  Flame, 
  RefreshCw, 
  AlertTriangle, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  Sparkles,
  Activity,
  Layers
} from 'lucide-react';

export interface AuthUser {
  id?: string;
  username: string;
  role: 'admin' | 'supervisor' | 'operator' | 'inventory-manager';
  name: string;
  nameHi?: string;
  stationType?: 'grinder' | 'mixer';
  stationId?: string;
}

interface LoginPageProps {
  onLoginSuccess: (user: AuthUser, token: string) => void;
  customFetch: (url: string, options?: RequestInit) => Promise<Response>;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess, customFetch }) => {
  const [activeTab, setActiveTab] = useState<'admin' | 'operator'>('admin');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Quick Demo Auto-Fill Handlers
  const handleQuickDemo = (user: string, pass: string) => {
    setUsername(user);
    setPassword(pass);
    setErrorMessage(null);
  };

  const handleAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setErrorMessage('कृपया यूज़रनेम और पासवर्ड दर्ज करें / Please enter username and password');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await customFetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        onLoginSuccess(data.user, data.token);
      } else {
        setErrorMessage(data.error || 'अमान्य क्रेडेंशियल्स / Authentication failed. Try admin / admin123');
      }
    } catch (err: any) {
      setErrorMessage('सर्वर से कनेक्ट नहीं हो सका / Server connection error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOperatorQuickLaunch = async (stationType: 'grinder' | 'mixer') => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await customFetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stationType })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        onLoginSuccess(data.user, data.token);
      } else {
        setErrorMessage('स्टेशन लोड करने में विफल / Failed to launch station');
      }
    } catch (err: any) {
      setErrorMessage('सर्वर से कनेक्ट नहीं हो सका / Server connection error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#07090E] text-slate-100 flex flex-col justify-between font-sans relative overflow-hidden selection:bg-cyan-500 selection:text-black">
      {/* Background Ambient Industrial Grid & Glow */}
      <div className="absolute inset-0 bg-[radial-gradient(#1E293B_1px,transparent_1px)] [background-size:24px_24px] opacity-30 pointer-events-none" />
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-cyan-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-amber-600/15 rounded-full blur-3xl pointer-events-none" />

      {/* Top Navbar */}
      <header className="relative z-10 w-full max-w-7xl mx-auto p-4 md:p-6 flex items-center justify-between border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 border border-cyan-400/40">
            <Cpu className="w-5 h-5 text-black" />
          </div>
          <div>
            <h1 className="text-base font-black tracking-wider text-white font-mono flex items-center gap-2">
              SAFE INVENTORY <span className="text-cyan-400 font-normal text-xs">// NEXUS NODE</span>
            </h1>
            <p className="text-[10px] text-slate-400 font-mono">
              सुरक्षित खाद्य निर्माण निष्पादन प्रणाली (MES)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
          <span className="text-emerald-400 font-bold hidden sm:inline">SYSTEM ONLINE</span>
          <span className="text-slate-500 text-[11px]">v2.4-PROD</span>
        </div>
      </header>

      {/* Main Login Card Center */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-4 my-6">
        <div className="w-full max-w-md bg-slate-900/90 border border-slate-800 rounded-2xl shadow-2xl backdrop-blur-xl p-6 sm:p-8 flex flex-col gap-6">
          
          {/* Header text */}
          <div className="text-center">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-mono font-bold uppercase mb-3">
              <ShieldCheck className="w-3.5 h-3.5" />
              पोर्टल लॉगिन // SECURE ACCESS
            </div>
            <h2 className="text-2xl font-black text-white tracking-tight">
              कारखाना प्रबंधन पोर्टल
            </h2>
            <p className="text-xs text-slate-400 font-mono mt-1">
              Select access role or enter supervisor credentials
            </p>
          </div>

          {/* Dual Tab Mode Switcher */}
          <div className="grid grid-cols-2 p-1 bg-slate-950/80 border border-slate-800 rounded-xl">
            <button
              type="button"
              onClick={() => { setActiveTab('admin'); setErrorMessage(null); }}
              className={`py-2 px-3 rounded-lg text-xs font-black font-mono transition-all flex items-center justify-center gap-2 ${
                activeTab === 'admin'
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-black shadow-md shadow-cyan-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              प्रबंधन (ADMIN)
            </button>

            <button
              type="button"
              onClick={() => { setActiveTab('operator'); setErrorMessage(null); }}
              className={`py-2 px-3 rounded-lg text-xs font-black font-mono transition-all flex items-center justify-center gap-2 ${
                activeTab === 'operator'
                  ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-black shadow-md shadow-amber-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              स्टेशन (OPERATOR)
            </button>
          </div>

          {/* Error Alert Box */}
          {errorMessage && (
            <div className="bg-rose-950/40 border border-rose-500/60 text-rose-300 px-3.5 py-2.5 rounded-xl text-xs flex items-start gap-2 animate-shake">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div className="font-mono">{errorMessage}</div>
            </div>
          )}

          {/* TAB 1: ADMIN & SUPERVISOR FORM */}
          {activeTab === 'admin' && (
            <form onSubmit={handleAdminSubmit} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-mono font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  यूज़रनेम (Username / ID)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="e.g. admin or supervisor"
                    className="w-full bg-slate-950 border border-slate-700 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 text-white rounded-xl pl-10 pr-4 py-2.5 text-sm font-mono placeholder:text-slate-600 transition outline-none"
                    autoFocus
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  पासवर्ड या पिन (Password / PIN)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="e.g. admin123 or 1234"
                    className="w-full bg-slate-950 border border-slate-700 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 text-white rounded-xl pl-10 pr-10 py-2.5 text-sm font-mono placeholder:text-slate-600 transition outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-300"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-black font-mono py-3 rounded-xl shadow-lg shadow-cyan-500/20 text-sm flex items-center justify-center gap-2 transition active:scale-[0.99] disabled:opacity-50 mt-1"
              >
                {isLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin text-black" />
                ) : (
                  <>
                    <span>डैशबोर्ड में प्रवेश करें (SIGN IN)</span>
                    <ArrowRight className="w-4 h-4 text-black" />
                  </>
                )}
              </button>

              {/* Quick Demo Credentials */}
              <div className="pt-2 border-t border-slate-800">
                <span className="text-[10px] font-mono font-bold text-slate-500 uppercase block mb-1.5 text-center">
                  त्वरित परीक्षण क्रेडेंशियल्स (DEMO ACCOUNTS)
                </span>
                <div className="flex flex-wrap gap-2 justify-center">
                  <button
                    type="button"
                    onClick={() => handleQuickDemo('admin', 'admin123')}
                    className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[11px] font-mono text-cyan-300 border border-slate-700 transition"
                  >
                    Admin (admin123)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickDemo('inventory', 'inv123')}
                    className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[11px] font-mono text-emerald-300 border border-slate-700 transition"
                  >
                    Inventory Mgr (inv123)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickDemo('supervisor', '5678')}
                    className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[11px] font-mono text-amber-300 border border-slate-700 transition"
                  >
                    Supervisor (5678)
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* TAB 2: OPERATOR 1-CLICK FAST LAUNCH */}
          {activeTab === 'operator' && (
            <div className="flex flex-col gap-3.5">
              <p className="text-xs text-slate-300 font-mono text-center">
                टैबलेट कियोस्क या ऑपरेटर स्टेशन सीधे लॉन्च करें:
              </p>

              {/* Grinder Kiosk Card */}
              <button
                type="button"
                onClick={() => handleOperatorQuickLaunch('grinder')}
                disabled={isLoading}
                className="p-4 rounded-xl bg-amber-950/30 hover:bg-amber-950/60 border-2 border-amber-500/50 hover:border-amber-400 transition flex items-center justify-between text-left group shadow-lg shadow-amber-500/10 active:scale-[0.99]"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-amber-500 text-black font-black flex items-center justify-center font-mono">
                    <Flame className="w-5 h-5 text-black" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono font-bold text-amber-400 uppercase bg-amber-500/20 px-1.5 py-0.5 rounded">
                        STAGE 1
                      </span>
                      <h4 className="text-sm font-black text-white group-hover:text-amber-300 transition">
                        1. पिसाई स्टेशन (GRINDER)
                      </h4>
                    </div>
                    <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                      साबुत मक्का पिसाई और पाइपलाइन ट्रांसफर कियोस्क
                    </p>
                  </div>
                </div>
                <ArrowRight className="w-5 h-5 text-amber-400 group-hover:translate-x-1 transition" />
              </button>

              {/* Mixer Kiosk Card */}
              <button
                type="button"
                onClick={() => handleOperatorQuickLaunch('mixer')}
                disabled={isLoading}
                className="p-4 rounded-xl bg-cyan-950/30 hover:bg-cyan-950/60 border-2 border-cyan-500/50 hover:border-cyan-400 transition flex items-center justify-between text-left group shadow-lg shadow-cyan-500/10 active:scale-[0.99]"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-cyan-400 text-black font-black flex items-center justify-center font-mono">
                    <RefreshCw className="w-5 h-5 text-black" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono font-bold text-cyan-400 uppercase bg-cyan-500/20 px-1.5 py-0.5 rounded">
                        STAGE 2
                      </span>
                      <h4 className="text-sm font-black text-white group-hover:text-cyan-300 transition">
                        2. मिश्रण स्टेशन (MIXER)
                      </h4>
                    </div>
                    <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                      कंपाउंड रेसिपी मिश्रण व गुणवत्ता फीडबैक कियोस्क
                    </p>
                  </div>
                </div>
                <ArrowRight className="w-5 h-5 text-cyan-400 group-hover:translate-x-1 transition" />
              </button>
            </div>
          )}

        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 w-full max-w-7xl mx-auto p-4 text-center text-xs font-mono text-slate-500 border-t border-slate-800/60">
        SAFE Food Manufacturing Plant • Node Online • Secure Multi-Station Architecture
      </footer>
    </div>
  );
};
