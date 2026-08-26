import React, { useState, useEffect } from 'react';
import { 
  Users, 
  UserPlus, 
  Trash2, 
  Edit3, 
  ShieldCheck, 
  Key, 
  Check, 
  X, 
  RefreshCw, 
  AlertCircle, 
  Lock, 
  Eye, 
  EyeOff,
  UserCheck,
  Building2,
  Cpu
} from 'lucide-react';
import { AuthUser } from './LoginPage';

export interface ManagedUser {
  id: string;
  username: string;
  password?: string;
  role: 'admin' | 'inventory-manager' | 'operator';
  name: string;
  nameHi?: string;
  stationType?: 'grinder' | 'mixer';
  stationId?: string;
  createdAt?: number;
}

interface UserManagementProps {
  customFetch: (url: string, options?: RequestInit) => Promise<Response>;
  currentUser: AuthUser | null;
}

export const UserManagement: React.FC<UserManagementProps> = ({ customFetch, currentUser }) => {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Modal / Form States
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingUser, setEditingUser] = useState<ManagedUser | null>(null);
  const [revealedPasswords, setRevealedPasswords] = useState<Record<string, boolean>>({});

  // Form Fields
  const [formUsername, setFormUsername] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formRole, setFormRole] = useState<'admin' | 'inventory-manager' | 'operator'>('inventory-manager');
  const [formName, setFormName] = useState('');
  const [formNameHi, setFormNameHi] = useState('');
  const [formStationType, setFormStationType] = useState<'grinder' | 'mixer'>('grinder');

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const res = await customFetch('/api/users');
      if (res.ok) {
        const data = await res.json();
        setUsers(data || []);
      }
    } catch (err) {
      setErrorMessage('उपयोगकर्ता लोड करने में विफल / Failed to load users');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const resetForm = () => {
    setFormUsername('');
    setFormPassword('');
    setFormRole('inventory-manager');
    setFormName('');
    setFormNameHi('');
    setFormStationType('grinder');
    setEditingUser(null);
    setShowAddModal(false);
    setErrorMessage(null);
  };

  const handleOpenAdd = () => {
    resetForm();
    setShowAddModal(true);
  };

  const handleOpenEdit = (user: ManagedUser) => {
    setEditingUser(user);
    setFormUsername(user.username);
    setFormPassword(user.password || '');
    setFormRole(user.role);
    setFormName(user.name);
    setFormNameHi(user.nameHi || '');
    if (user.stationType) setFormStationType(user.stationType);
    setShowAddModal(true);
    setErrorMessage(null);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formUsername.trim() || !formPassword.trim()) {
      setErrorMessage('यूज़रनेम और पासवर्ड अनिवार्य हैं / Username and password are required');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    const payload = {
      username: formUsername.trim().toLowerCase(),
      password: formPassword.trim(),
      role: formRole,
      name: formName.trim() || formUsername.trim(),
      nameHi: formNameHi.trim() || null,
      stationType: formRole === 'operator' ? formStationType : null,
      stationId: formRole === 'operator' ? (formStationType === 'grinder' ? 'GRINDER-01' : 'MIXER-01') : null
    };

    try {
      let res;
      if (editingUser) {
        res = await customFetch(`/api/users/${editingUser.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } else {
        res = await customFetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }

      const data = await res.json();
      if (res.ok) {
        setSuccessMessage(editingUser ? 'उपयोगकर्ता अपडेट किया गया / User updated' : 'नया उपयोगकर्ता बनाया गया / User created');
        setTimeout(() => setSuccessMessage(null), 3000);
        resetForm();
        fetchUsers();
      } else {
        setErrorMessage(data.error || 'सहेजना विफल / Save failed');
      }
    } catch (err) {
      setErrorMessage('सर्वर त्रुटि / Server error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteUser = async (user: ManagedUser) => {
    if (user.username === 'admin') {
      alert('मुख्य व्यवस्थापक (admin) को हटाया नहीं जा सकता / Cannot delete primary admin');
      return;
    }

    if (!window.confirm(`क्या आप वाकई "${user.username}" (${user.name}) को हटाना चाहते हैं?`)) {
      return;
    }

    setIsLoading(true);
    try {
      const res = await customFetch(`/api/users/${user.id}`, { method: 'DELETE' });
      if (res.ok) {
        setSuccessMessage(`उपयोगकर्ता "${user.username}" हटा दिया गया`);
        setTimeout(() => setSuccessMessage(null), 3000);
        fetchUsers();
      } else {
        const data = await res.json();
        setErrorMessage(data.error || 'हटाना विफल / Delete failed');
      }
    } catch (err) {
      setErrorMessage('सर्वर त्रुटि / Server error');
    } finally {
      setIsLoading(false);
    }
  };

  const togglePasswordVisibility = (id: string) => {
    setRevealedPasswords(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Top Banner & Action Header */}
      <div className="bg-[#12161F] border border-industrial-border rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 text-black font-black">
            <Users className="w-6 h-6 text-black" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-cyan-400 bg-cyan-500/10 border border-cyan-500/30 px-2 py-0.5 rounded">
                ACCESS CONTROL
              </span>
              <span className="text-xs text-gray-400 font-mono">
                {users.length} Active System Users
              </span>
            </div>
            <h2 className="text-xl font-black text-white font-mono mt-1">
              उपयोगकर्ता और भूमिका प्रबंधन (USER MANAGEMENT)
            </h2>
            <p className="text-xs text-gray-400 font-mono">
              Manage system permissions: Administrators get full control; Inventory Managers get isolated inventory access.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchUsers}
            disabled={isLoading}
            className="p-2.5 bg-[#1A1E29] hover:bg-[#252A3A] text-gray-300 hover:text-white rounded-lg border border-industrial-border transition flex items-center gap-2 text-xs font-mono"
            title="रिफ्रेश / Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-cyan-400' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <button
            onClick={handleOpenAdd}
            className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-mono font-black text-xs px-4 py-2.5 rounded-lg shadow-lg shadow-cyan-500/20 transition flex items-center gap-2"
          >
            <UserPlus className="w-4 h-4 text-black" />
            <span>नया उपयोगकर्ता जोड़ें (ADD USER)</span>
          </button>
        </div>
      </div>

      {/* Alert Messages */}
      {errorMessage && (
        <div className="bg-rose-950/40 border border-rose-500/60 text-rose-300 px-4 py-3 rounded-xl text-xs flex items-center gap-2.5 animate-shake font-mono">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{errorMessage}</span>
          <button onClick={() => setErrorMessage(null)} className="ml-auto text-rose-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {successMessage && (
        <div className="bg-emerald-950/40 border border-emerald-500/60 text-emerald-300 px-4 py-3 rounded-xl text-xs flex items-center gap-2.5 font-mono shadow-md">
          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Role Access Matrix Summary Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Admin Card */}
        <div className="p-4 rounded-xl bg-[#0E131A] border border-cyan-500/40 shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-mono font-bold text-cyan-400 uppercase bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/30">
              ROLE: ADMIN
            </span>
            <ShieldCheck className="w-4 h-4 text-cyan-400" />
          </div>
          <h4 className="text-sm font-black text-white">व्यवस्थापक (Administrator)</h4>
          <p className="text-xs text-gray-400 font-mono mt-1">
            ✓ Live Control Panel & Telemetry<br />
            ✓ Product Recipe Formulation<br />
            ✓ Inventory Management<br />
            ✓ User & Access Management<br />
            ✓ QR Pairing & Station Controls
          </p>
        </div>

        {/* Inventory Manager Card */}
        <div className="p-4 rounded-xl bg-[#0B1512] border border-emerald-500/40 shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-mono font-bold text-emerald-400 uppercase bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
              ROLE: INVENTORY-MANAGER
            </span>
            <Building2 className="w-4 h-4 text-emerald-400" />
          </div>
          <h4 className="text-sm font-black text-white">इन्वेंटरी प्रबंधक (Inventory Manager)</h4>
          <p className="text-xs text-gray-400 font-mono mt-1">
            ✓ Stock Levels & Replenishment<br />
            ✓ Raw Material Adjustments<br />
            ✓ Minimum Stock Thresholds<br />
            ✗ Recipes & Order Control Locked<br />
            ✗ User Management Locked
          </p>
        </div>

        {/* Operator Card */}
        <div className="p-4 rounded-xl bg-[#14120D] border border-amber-500/40 shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-mono font-bold text-amber-400 uppercase bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">
              ROLE: OPERATOR
            </span>
            <Cpu className="w-4 h-4 text-amber-400" />
          </div>
          <h4 className="text-sm font-black text-white">फ्लोर ऑपरेटर (Floor Operator)</h4>
          <p className="text-xs text-gray-400 font-mono mt-1">
            ✓ Stage 1 Grinder Milling Terminal<br />
            ✓ Stage 2 Mixer Compounding & Feedback<br />
            ✓ Execution Sliders & Batch Logging<br />
            ✗ Admin Dashboard Restricted
          </p>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-[#12161F] border border-industrial-border rounded-xl shadow-xl overflow-hidden">
        <div className="p-4 border-b border-industrial-border flex items-center justify-between bg-[#151923]">
          <h3 className="text-xs font-black text-white font-mono uppercase tracking-wider flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-cyan-400" />
            पंजीकृत उपयोगकर्ता सूची (REGISTERED USERS)
          </h3>
          <span className="text-[11px] font-mono text-gray-400">Total: {users.length}</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse font-mono text-xs">
            <thead>
              <tr className="bg-[#0B0D12] text-gray-400 border-b border-industrial-border text-[10px] uppercase tracking-wider">
                <th className="py-3 px-4">यूज़रनेम (Username)</th>
                <th className="py-3 px-4">नाम (Full Name)</th>
                <th className="py-3 px-4">भूमिका (Role)</th>
                <th className="py-3 px-4">स्टेशन (Station Scope)</th>
                <th className="py-3 px-4">पासवर्ड (PIN / Password)</th>
                <th className="py-3 px-4 text-right">कार्य (Actions)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-industrial-border text-gray-300">
              {users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-500 font-mono">
                    कोई उपयोगकर्ता नहीं मिला / No users found
                  </td>
                </tr>
              ) : (
                users.map(u => {
                  const isRevealed = revealedPasswords[u.id];
                  return (
                    <tr key={u.id} className="hover:bg-[#161B26] transition">
                      <td className="py-3.5 px-4 font-bold text-white flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                        <span>{u.username}</span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="text-white font-bold">{u.name}</div>
                        {u.nameHi && <div className="text-[10px] text-gray-500">{u.nameHi}</div>}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          u.role === 'admin'
                            ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                            : u.role === 'inventory-manager'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        }`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        {u.stationType ? (
                          <span className={`text-[10px] font-bold uppercase ${u.stationType === 'grinder' ? 'text-amber-400' : 'text-cyan-400'}`}>
                            {u.stationType === 'grinder' ? '1. Grinder' : '2. Mixer'}
                          </span>
                        ) : (
                          <span className="text-gray-500 text-[10px]">ALL / GLOBAL</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-mono bg-[#0B0D12] px-2 py-0.5 rounded border border-gray-800 text-gray-300">
                            {isRevealed ? u.password : '••••••••'}
                          </span>
                          <button
                            type="button"
                            onClick={() => togglePasswordVisibility(u.id)}
                            className="text-gray-500 hover:text-gray-300 p-1"
                            title={isRevealed ? 'Hide' : 'Show'}
                          >
                            {isRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleOpenEdit(u)}
                            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 rounded border border-slate-700 transition"
                            title="संपादित करें / Edit"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          {u.username !== 'admin' && (
                            <button
                              onClick={() => handleDeleteUser(u)}
                              className="p-1.5 bg-slate-800 hover:bg-red-950/60 text-rose-400 hover:text-rose-300 rounded border border-slate-700 hover:border-rose-500/50 transition"
                              title="हटाएं / Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-2xl flex flex-col gap-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-black text-white font-mono flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-cyan-400" />
                {editingUser ? 'उपयोगकर्ता संपादित करें (EDIT USER)' : 'नया उपयोगकर्ता जोड़ें (CREATE USER)'}
              </h3>
              <button onClick={resetForm} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-mono font-bold text-slate-300 uppercase mb-1">
                  यूज़रनेम (Username) *
                </label>
                <input
                  type="text"
                  value={formUsername}
                  onChange={(e) => setFormUsername(e.target.value)}
                  placeholder="e.g. inventory_head"
                  className="w-full bg-slate-950 border border-slate-700 focus:border-cyan-400 text-white rounded-xl px-3.5 py-2 text-sm font-mono outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-mono font-bold text-slate-300 uppercase mb-1">
                  पासवर्ड या पिन (Password / PIN) *
                </label>
                <input
                  type="text"
                  value={formPassword}
                  onChange={(e) => setFormPassword(e.target.value)}
                  placeholder="e.g. securePass123 or PIN 1234"
                  className="w-full bg-slate-950 border border-slate-700 focus:border-cyan-400 text-white rounded-xl px-3.5 py-2 text-sm font-mono outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-mono font-bold text-slate-300 uppercase mb-1">
                  उपयोगकर्ता भूमिका (Access Role) *
                </label>
                <select
                  value={formRole}
                  onChange={(e) => setFormRole(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-700 focus:border-cyan-400 text-white rounded-xl px-3.5 py-2 text-sm font-mono outline-none"
                >
                  <option value="inventory-manager">🌾 Inventory Manager (Only Inventory Page)</option>
                  <option value="admin">⚡ Administrator (Full System Access)</option>
                  <option value="operator">⚙️ Floor Operator (Kiosk Station)</option>
                </select>
              </div>

              {formRole === 'operator' && (
                <div>
                  <label className="block text-xs font-mono font-bold text-slate-300 uppercase mb-1">
                    स्टेशन का प्रकार (Assigned Station)
                  </label>
                  <select
                    value={formStationType}
                    onChange={(e) => setFormStationType(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-700 focus:border-amber-400 text-white rounded-xl px-3.5 py-2 text-sm font-mono outline-none"
                  >
                    <option value="grinder">1. पिसाई स्टेशन (Stage 1: Grinder Kiosk)</option>
                    <option value="mixer">2. मिश्रण स्टेशन (Stage 2: Mixer Kiosk)</option>
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-mono font-bold text-slate-300 uppercase mb-1">
                  पूरा नाम (Full Name)
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Ramesh Kumar"
                  className="w-full bg-slate-950 border border-slate-700 focus:border-cyan-400 text-white rounded-xl px-3.5 py-2 text-sm font-mono outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-mono font-bold text-slate-300 uppercase mb-1">
                  हिंदी नाम (Hindi Name - Optional)
                </label>
                <input
                  type="text"
                  value={formNameHi}
                  onChange={(e) => setFormNameHi(e.target.value)}
                  placeholder="e.g. रमेश कुमार"
                  className="w-full bg-slate-950 border border-slate-700 focus:border-cyan-400 text-white rounded-xl px-3.5 py-2 text-sm font-mono outline-none"
                />
              </div>

              <div className="flex gap-3 mt-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:text-white text-xs font-mono font-bold transition"
                >
                  रद्द करें (CANCEL)
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black text-xs font-mono font-black shadow-lg shadow-cyan-500/20 transition flex items-center justify-center gap-2"
                >
                  <Check className="w-4 h-4 text-black" />
                  <span>सहेजें (SAVE)</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
