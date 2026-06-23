import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  Database, 
  Tv, 
  Terminal, 
  TrendingUp, 
  Clock, 
  UserCheck, 
  ShieldAlert, 
  Settings, 
  CheckCircle2, 
  XCircle, 
  Plus, 
  Trash2, 
  Edit3, 
  RefreshCw, 
  Download, 
  Copy, 
  Cpu, 
  AlertTriangle,
  BookOpen,
  Wifi,
  FileSpreadsheet,
  Link2
} from 'lucide-react';

// Interfaces mirroring the Android Room schema
interface Product {
  id: String;
  name: string; // Hindi Name
  englishName: string; // English Name
  targetUph: number;
  colorHex: string;
  isActive: boolean;
  manualFileName?: string;
}

interface BatchLog {
  batchId: string;
  productNameHindi: string;
  productNameEnglish: string;
  line: string;
  unitsProduced: number;
  status: 'Success' | 'Failed';
  timestamp: number;
  targetUnits: number;
}

interface ActiveShift {
  workerId: string;
  pin: string;
  loginTime: number;
  isHelmetChecked: boolean;
  isWorkplaceClean: boolean;
  isMachineNormal: boolean;
  isActive: boolean;
}

// Initial Data mirroring IndustrialRepository.kt
const INITIAL_PRODUCTS: Product[] = [
  { id: "PRD-001", name: "क्रीम स्पेशल", englishName: "Cream Special", targetUph: 1200, colorHex: "#00F0FF", isActive: true, manualFileName: "Cream_Special_Ops_v2.pdf" },
  { id: "PRD-002", name: "प्रीमियम प्लस", englishName: "Premium Plus", targetUph: 850, colorHex: "#FF6B00", isActive: true, manualFileName: "Premium_Plus_Safety.pdf" },
  { id: "PRD-003", name: "मानक मिश्रण", englishName: "Standard Blend", targetUph: 2500, colorHex: "#10B981", isActive: true }
];

const INITIAL_LOGS: BatchLog[] = [
  { batchId: "B-4902", productNameHindi: "क्रीम स्पेशल", productNameEnglish: "Cream Special", line: "Line A", unitsProduced: 12500, status: "Success", timestamp: Date.now() - 3 * 3600000, targetUnits: 12000 },
  { batchId: "B-4901", productNameHindi: "क्रीम स्पेशल", productNameEnglish: "Cream Special", line: "Line B", unitsProduced: 2100, status: "Failed", timestamp: Date.now() - 6 * 3600000, targetUnits: 2500 },
  { batchId: "B-4900", productNameHindi: "प्रीमियम प्लस", productNameEnglish: "Premium Plus", line: "Line A", unitsProduced: 12480, status: "Success", timestamp: Date.now() - 12 * 3600000, targetUnits: 12000 },
  { batchId: "B-8899", productNameHindi: "क्रीम स्पेशल", productNameEnglish: "Cream Special", line: "Line C", unitsProduced: 8900, status: "Success", timestamp: Date.now() - 18 * 3600000, targetUnits: 9000 },
  { batchId: "B-8898", productNameHindi: "प्रीमियम प्लस", productNameEnglish: "Premium Plus", line: "Line A", unitsProduced: 1200, status: "Failed", timestamp: Date.now() - 24 * 3600000, targetUnits: 2500 }
];

const INITIAL_SHIFT: ActiveShift = {
  workerId: "EMP-045",
  pin: "5544",
  loginTime: Date.now() - 4 * 3600000,
  isHelmetChecked: true,
  isWorkplaceClean: true,
  isMachineNormal: true,
  isActive: true
};

export default function App() {
  // Persistence using localStorage
  const [products, setProducts] = useState<Product[]>(() => {
    const cached = localStorage.getItem('nexus_products');
    return cached ? JSON.parse(cached) : INITIAL_PRODUCTS;
  });

  const [logs, setLogs] = useState<BatchLog[]>(() => {
    const cached = localStorage.getItem('nexus_logs');
    return cached ? JSON.parse(cached) : INITIAL_LOGS;
  });

  const [activeShift, setActiveShift] = useState<ActiveShift | null>(() => {
    const cached = localStorage.getItem('nexus_active_shift');
    return cached ? JSON.parse(cached) : INITIAL_SHIFT;
  });

  // Navigation state (Active tab)
  const [activeTab, setActiveTab] = useState<'dashboard' | 'products' | 'logs' | 'link-integration'>('dashboard');

  // Search and Filter states
  const [searchLog, setSearchLog] = useState('');
  const [lineFilter, setLineFilter] = useState('ALL');

  // New product form states
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [newProductId, setNewProductId] = useState('');
  const [newProductName, setNewProductName] = useState('');
  const [newProductEnglishName, setNewProductEnglishName] = useState('');
  const [newProductTargetUph, setNewProductTargetUph] = useState(1000);
  const [newProductColor, setNewProductColor] = useState('#00F0FF');
  const [newProductManual, setNewProductManual] = useState('');
  const [showAddProductModal, setShowAddProductModal] = useState(false);

  // Machine Simulator states
  const [simulatedUnits, setSimulatedUnits] = useState(4820);
  const [selectedSimProduct, setSelectedSimProduct] = useState<Product>(products[0] || INITIAL_PRODUCTS[0]);
  const [simLine, setSimLine] = useState('Line A');
  const [isSimulatorRunning, setIsSimulatorRunning] = useState(true);
  const [emergencyStatus, setEmergencyStatus] = useState<boolean>(false);
  const [downtimeReasons, setDowntimeReasons] = useState<string[]>([]);

  // Clock state
  const [localTime, setLocalTime] = useState(new Date().toLocaleTimeString());

  // Copy success feedback state
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  // Sync to local storage
  useEffect(() => {
    localStorage.setItem('nexus_products', JSON.stringify(products));
  }, [products]);

  useEffect(() => {
    localStorage.setItem('nexus_logs', JSON.stringify(logs));
  }, [logs]);

  useEffect(() => {
    localStorage.setItem('nexus_active_shift', JSON.stringify(activeShift));
  }, [activeShift]);

  // Handle live clock update
  useEffect(() => {
    const timer = setInterval(() => {
      setLocalTime(new Date().toLocaleTimeString());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Live units counter simulator
  useEffect(() => {
    if (!isSimulatorRunning || emergencyStatus || !activeShift) return;
    const interval = setInterval(() => {
      setSimulatedUnits(prev => {
        const ratePerSec = selectedSimProduct.targetUph / 3600;
        // Random fluctuation for realistic industrial dashboard
        const delta = Math.max(0.2, ratePerSec + (Math.random() - 0.4) * 0.5);
        return Math.round((prev + delta) * 10) / 10;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isSimulatorRunning, emergencyStatus, selectedSimProduct, activeShift]);

  // Trigger simulated batch completion
  const handleSimBatchSubmit = (status: 'Success' | 'Failed' = 'Success') => {
    const roundedUnits = Math.floor(simulatedUnits);
    const targetDemand = 5000;
    
    const newLog: BatchLog = {
      batchId: `B-${Math.floor(1000 + Math.random() * 9000)}`,
      productNameHindi: selectedSimProduct.name,
      productNameEnglish: selectedSimProduct.englishName,
      line: simLine,
      unitsProduced: roundedUnits,
      status: status,
      timestamp: Date.now(),
      targetUnits: targetDemand
    };

    setLogs(prev => [newLog, ...prev]);
    // Reset simulator units for next container batch
    setSimulatedUnits(0);
    if (status === 'Failed') {
      setIsSimulatorRunning(false);
    }
  };

  // Trigger factory shutdown / emergency stop
  const triggerEmergencyStop = (reason: string) => {
    setEmergencyStatus(true);
    setIsSimulatorRunning(false);
    if (!downtimeReasons.includes(reason)) {
      setDowntimeReasons(prev => [...prev, reason]);
    }

    // Automatically write failed log to db history
    const failedLog: BatchLog = {
      batchId: `DWT-${Math.floor(100 + Math.random() * 900)}`,
      productNameHindi: "मशीन डाउनटाइम",
      productNameEnglish: `EMERGENCY STOP [${reason}]`,
      line: simLine,
      unitsProduced: Math.floor(simulatedUnits),
      status: 'Failed',
      timestamp: Date.now(),
      targetUnits: 5000
    };
    setLogs(prev => [failedLog, ...prev]);
  };

  // Recover machine from emergency shutdown
  const resetEmergencyShutdown = () => {
    setEmergencyStatus(false);
    setDowntimeReasons([]);
    setSimulatedUnits(0);
    setIsSimulatorRunning(true);
  };

  // Toggle shift mock parameters
  const loginMockWorker = (empId: string) => {
    const newShift: ActiveShift = {
      workerId: empId,
      pin: "1234",
      loginTime: Date.now(),
      isHelmetChecked: true,
      isWorkplaceClean: true,
      isMachineNormal: true,
      isActive: true
    };
    setActiveShift(newShift);
  };

  const logoutMockWorker = () => {
    setActiveShift(null);
  };

  // Clear batch logs (matching Android viewModel's clear BatchLogs action)
  const handleClearAllLogs = () => {
    if (window.confirm("CONFIRMATION REQUIRED: Clear all production histories on file?")) {
      setLogs([]);
    }
  };

  // Delete product
  const handleDeleteProduct = (pId: string) => {
    if (window.confirm(`CONFIRM: Delete mixture recipe ${pId}?`)) {
      setProducts(prev => prev.filter(p => p.id !== pId));
    }
  };

  // Save new or modified product mixture
  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProductId || !newProductName || !newProductEnglishName) {
      alert("All fields are mandatory.");
      return;
    }

    if (editingProduct) {
      // Edit mode
      setProducts(prev => prev.map(p => p.id === editingProduct.id ? {
        ...p,
        name: newProductName,
        englishName: newProductEnglishName,
        targetUph: newProductTargetUph,
        colorHex: newProductColor,
        manualFileName: newProductManual || undefined
      } : p));
      setEditingProduct(null);
    } else {
      // Create mode
      if (products.some(p => p.id.toLowerCase() === newProductId.toLowerCase())) {
        alert("This mixture product ID already exists!");
        return;
      }
      const newItem: Product = {
        id: newProductId.toUpperCase(),
        name: newProductName,
        englishName: newProductEnglishName,
        targetUph: newProductTargetUph,
        colorHex: newProductColor,
        isActive: true,
        manualFileName: newProductManual || undefined
      };
      setProducts(prev => [...prev, newItem]);
    }

    // Reset clean fields
    setNewProductId('');
    setNewProductName('');
    setNewProductEnglishName('');
    setNewProductTargetUph(1000);
    setNewProductColor('#00F0FF');
    setNewProductManual('');
    setShowAddProductModal(false);
  };

  // Trigger modification filling form
  const handleStartEditProduct = (p: Product) => {
    setEditingProduct(p);
    setNewProductId(p.id.toString());
    setNewProductName(p.name);
    setNewProductEnglishName(p.englishName);
    setNewProductTargetUph(p.targetUph);
    setNewProductColor(p.colorHex);
    setNewProductManual(p.manualFileName || '');
    setShowAddProductModal(true);
  };

  // Copy sample code help utils
  const triggerCopyCode = (text: string, identifier: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(identifier);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  // Analytical Metrics Computations
  const totalSuccessBatches = logs.filter(l => l.status === 'Success').length;
  const successRatio = logs.length > 0 ? Math.round((totalSuccessBatches / logs.length) * 100) : 100;
  const totalUnits = logs.reduce((sum, l) => sum + l.unitsProduced, 0);
  const activeWorkerName = activeShift?.workerId || "Offline";

  // Filter logs list
  const filteredLogs = logs.filter(l => {
    const searchMatch = l.batchId.toLowerCase().includes(searchLog.toLowerCase()) || 
                        l.productNameEnglish.toLowerCase().includes(searchLog.toLowerCase()) ||
                        l.productNameHindi.toLowerCase().includes(searchLog.toLowerCase());
    const lineMatch = lineFilter === 'ALL' || l.line === lineFilter;
    return searchMatch && lineMatch;
  });

  return (
    <div className="min-h-screen bg-[#0F1115] text-[#D1D4DC] flex flex-col font-sans selection:bg-[#00F0FF] selection:text-black">
      {/* 1. STRUCTURAL ENTERPRISE HEADER */}
      <header className="border-b-2 border-industrial-border bg-[#0B0D10] text-[#E2E8F0] py-4 px-6 sticky top-0 z-50 shadow-lg select-none">
        <div className="max-w-[1500px] mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          {/* Logo Brand Brand */}
          <div className="flex items-center gap-3">
            <div className="p-2 border border-industrial-accent bg-industrial-accent/10 rounded">
              <Cpu className="h-6 w-6 text-industrial-accent animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs bg-industrial-accent/20 text-industrial-accent px-2 py-0.5 rounded font-mono font-bold tracking-widest uppercase">
                  Companion Console
                </span>
                <span className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded font-mono">v1.2-Cloud</span>
              </div>
              <h1 className="text-xl md:text-2xl font-black font-display tracking-tight text-white flex items-center gap-2">
                INDUSTRIAL NEXUS <span className="text-industrial-accent">●</span> <span className="text-gray-400 font-mono text-sm leading-none">ADMIN BOARD</span>
              </h1>
            </div>
          </div>

          {/* Telemetry Clock Indicators */}
          <div className="flex flex-wrap items-center gap-6 text-xs md:text-sm font-mono">
            {/* Clock */}
            <div className="flex items-center gap-2 bg-[#141822] border border-industrial-border px-3 py-1.5 rounded text-gray-300">
              <Clock className="w-4 h-4 text-industrial-accent" />
              <span>TERMINAL LOCAL:</span>
              <span className="text-industrial-accent font-bold glow-text-cyan">{localTime}</span>
            </div>

            {/* Socket Server simulation status */}
            <div className="flex items-center gap-2 bg-[#141822] border border-industrial-border px-3 py-1.5 rounded">
              <Wifi className={`w-4 h-4 ${emergencyStatus ? 'text-industrial-danger animate-ping' : 'text-industrial-success animate-pulse'}`} />
              <span>ROOM-DB CONNECTION:</span>
              <span className={`font-bold ${emergencyStatus ? 'text-industrial-danger glow-text-red' : 'text-industrial-success glow-text-success'}`}>
                {emergencyStatus ? 'SHUTDOWN ACTIVE' : 'SECURE READY'}
              </span>
            </div>

            {/* Shift Tracker */}
            <div className="flex items-center gap-2 bg-[#141822] border border-industrial-border px-3 py-1.5 rounded">
              <UserCheck className="w-4 h-4 text-industrial-safety" />
              <span>OPERATOR:</span>
              <span className="text-white font-bold">{activeWorkerName}</span>
            </div>
          </div>
        </div>
      </header>

      {/* EMERGENCY SYSTEM STATS ROW */}
      {emergencyStatus && (
        <div className="bg-industrial-danger/10 border-b border-industrial-danger text-industrial-danger py-3 px-6 select-none animate-pulse">
          <div className="max-w-[1500px] mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 animate-bounce" />
              <div>
                <span className="font-bold underline tracking-widest text-[#EF4444] font-mono uppercase">! CRITICAL ALARM STATUS ACTIVE !</span>
                <p className="text-xs text-gray-300 mt-0.5">
                  Downtime declared on {simLine}. Reasons listed (simulated Room schema conflict): <span className="font-bold text-white font-mono bg-red-950 px-2 py-0.5 rounded">{downtimeReasons.join(', ')}</span>
                </p>
              </div>
            </div>
            <button 
              onClick={resetEmergencyShutdown}
              className="bg-white text-black hover:bg-industrial-accent hover:text-black transition px-4 py-1.5 rounded text-xs font-mono font-bold tracking-wide shadow-md"
            >
              RESOLVE & RESET BREAKDOWN
            </button>
          </div>
        </div>
      )}

      {/* MAIN CONTAINER LAYOUT */}
      <div className="max-w-[1500px] mx-auto w-full p-4 md:p-6 flex-1 flex flex-col gap-6">
        
        {/* 2. TAB TOGGLES BLOCK */}
        <div className="flex justify-between items-center flex-wrap gap-4 border-b border-industrial-border pb-2">
          {/* Main Toggles */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`px-4 py-2 text-sm font-mono font-semibold uppercase tracking-wider border transition-all ${
                activeTab === 'dashboard'
                  ? 'bg-industrial-accent text-black border-industrial-accent font-bold shadow-md shadow-industrial-accent/20'
                  : 'bg-[#161920] text-gray-400 border-industrial-border hover:text-white hover:border-gray-500'
              }`}
            >
              📟 Live Control Panel
            </button>
            <button
              onClick={() => setActiveTab('products')}
              className={`px-4 py-2 text-sm font-mono font-semibold uppercase tracking-wider border transition-all ${
                activeTab === 'products'
                  ? 'bg-industrial-accent text-black border-industrial-accent font-bold shadow-md shadow-industrial-accent/20'
                  : 'bg-[#161920] text-gray-400 border-industrial-border hover:text-white hover:border-gray-500'
              }`}
            >
              🥞 Product Recipes ({products.length})
            </button>
            <button
              onClick={() => setActiveTab('logs')}
              className={`px-4 py-2 text-sm font-mono font-semibold uppercase tracking-wider border transition-all ${
                activeTab === 'logs'
                  ? 'bg-industrial-accent text-black border-industrial-accent font-bold shadow-md shadow-industrial-accent/20'
                  : 'bg-[#161920] text-gray-400 border-industrial-border hover:text-white hover:border-gray-500'
              }`}
            >
              📜 Log Vault ({logs.length})
            </button>
            <button
              onClick={() => setActiveTab('link-integration')}
              className={`px-4 py-2 text-sm font-mono font-semibold uppercase tracking-wider border transition-all ${
                activeTab === 'link-integration'
                  ? 'bg-[#10B981] text-black border-[#10B981] font-bold shadow-md shadow-emerald-500/20'
                  : 'bg-[#161920] text-gray-400 border-industrial-border hover:text-white hover:border-gray-500'
              }`}
            >
              🔌 Link Connection Architecture
            </button>
          </div>

          {/* Quick Stats Summary badges */}
          <div className="flex items-center gap-3 text-xs font-mono">
            <span className="text-gray-500">QUICK COMPLIANCE:</span>
            <span className="bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30 px-2 py-1 rounded">
              SUCCESS RATE: {successRatio}%
            </span>
            <span className="bg-[#FF6B00]/15 text-[#FF6B00] border border-[#FF6B00]/30 px-2 py-1 rounded">
              TOTAL UNIT WEIGHT: {totalUnits.toLocaleString()} units
            </span>
          </div>
        </div>

        {/* 3. ACTIVE SCENE VIEWPORTS */}
        
        {/* TAB 1: LIVE CONTROL TERMINAL */}
        {activeTab === 'dashboard' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* COLUMN 1: LIVE HARDWARE SIMULATOR */}
            <div className="lg:col-span-2 flex flex-col gap-6">
              
              <div className="bg-industrial-card border-2 border-industrial-border text-[#D1D4DC] overflow-hidden shadow-lg flex flex-col">
                <div className="bg-[#0B0D10] border-b-2 border-industrial-border p-4 flex justify-between items-center flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-3.5 w-3.5">
                      <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${isSimulatorRunning && !emergencyStatus ? 'bg-industrial-accent' : 'bg-industrial-danger'} opacity-75`}></span>
                      <span className={`relative inline-flex rounded-full h-3.5 w-3.5 ${isSimulatorRunning && !emergencyStatus ? 'bg-industrial-accent' : 'bg-industrial-danger'}`}></span>
                    </span>
                    <h2 className="text-lg font-black tracking-tight text-white uppercase font-display">SIMULATED EXTRUDER FEEDBACK (ACTIVE LINE)</h2>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-gray-400">FEEDBACK UPDATE INTERVAL: 1s</span>
                  </div>
                </div>

                <div className="p-6 flex-1 flex flex-col gap-6 bg-[#11141B]">
                  {/* Gauge Display & Telemetry Indicator */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                    
                    {/* Glowing Digital Dashboard Counter */}
                    <div className="bg-[#0B0D10] border border-industrial-border p-6 rounded relative overflow-hidden flex flex-col justify-center items-center h-48">
                      <div className="absolute top-2 left-3 text-[10px] font-mono text-gray-500 uppercase tracking-widest">
                        BATCH TOTAL CHILLER / UNIT RECIPE REGISTERED
                      </div>
                      <div className="absolute top-2 right-3">
                        <Terminal className="text-industrial-accent/40 w-4.5 h-4.5" />
                      </div>

                      {/* Giant Number Ticker */}
                      <span className={`text-4xl md:text-5xl font-black font-mono tracking-wider ${emergencyStatus ? 'text-industrial-danger glow-text-red' : 'text-industrial-accent glow-text-cyan'}`}>
                        {activeShift ? simulatedUnits.toFixed(1) : "OFFLINE"}
                      </span>
                      
                      <div className="mt-3 flex items-center gap-2">
                        <span className="text-xs text-gray-400 font-mono">PRODUCT TARGET:</span>
                        <span className="text-xs bg-industrial-accent/15 text-industrial-accent border border-industrial-accent/30 px-2 py-0.5 rounded font-mono font-bold">
                          5,000 Units
                        </span>
                      </div>

                      <div className="mt-1 w-full bg-gray-900 h-2 rounded overflow-hidden max-w-[80%] border border-gray-800">
                        <div 
                          className={`h-full transition-all duration-300 ${emergencyStatus ? 'bg-industrial-danger' : 'bg-industrial-accent'}`} 
                          style={{ width: `${Math.min(100, (simulatedUnits / 5000) * 100)}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Simulation parameters panel */}
                    <div className="flex flex-col gap-4 text-sm">
                      <div className="bg-[#1D212B] p-4 border border-industrial-border rounded flex flex-col gap-2.5">
                        <h4 className="text-xs font-bold font-mono tracking-widest text-[#FF6B00] uppercase">MOCK EXTRUDER CONTROLS</h4>
                        
                        {/* Selector Product */}
                        <div>
                          <label className="text-xs text-gray-400 font-mono block mb-1">Mixture Recipe Target:</label>
                          <select 
                            value={selectedSimProduct.id.toString()}
                            onChange={(e) => {
                              const found = products.find(p => p.id === e.target.value);
                              if (found) setSelectedSimProduct(found);
                            }}
                            className="bg-[#0B0D10] text-white border border-industrial-border px-2 py-1.5 rounded w-full font-mono text-xs focus:ring-1 focus:ring-industrial-accent outline-none"
                            disabled={!activeShift || emergencyStatus}
                          >
                            {products.map(p => (
                              <option key={p.id.toString()} value={p.id.toString()}>
                                {p.englishName} ({p.name}) [Target UPH: {p.targetUph}]
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Select Line */}
                        <div>
                          <label className="text-xs text-gray-400 font-mono block mb-1">Operational Area Line:</label>
                          <select 
                            value={simLine} 
                            onChange={(e) => setSimLine(e.target.value)}
                            className="bg-[#0B0D10] text-white border border-industrial-border px-2 py-1.5 rounded w-full font-mono text-xs focus:ring-1 focus:ring-industrial-accent outline-none"
                            disabled={!activeShift || emergencyStatus}
                          >
                            <option value="Line A">Line A (Manual Assembly)</option>
                            <option value="Line B">Line B (Auto Injection)</option>
                            <option value="Line C">Line C (Extrusion Sinter)</option>
                            <option value="CNC-04">CNC-04 Milling Node</option>
                          </select>
                        </div>
                      </div>
                    </div>

                  </div>

                  {/* Simulator Control Action Buttons */}
                  <div className="border-t border-industrial-border pt-4 flex flex-wrap gap-3 items-center justify-between">
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => setIsSimulatorRunning(!isSimulatorRunning)}
                        className={`px-4 py-2 rounded text-xs font-mono font-bold uppercase transition-all tracking-wider ${
                          isSimulatorRunning && !emergencyStatus
                            ? 'bg-yellow-500 text-black hover:bg-yellow-600'
                            : 'bg-industrial-accent text-black hover:bg-[#00D0DF]'
                        }`}
                        disabled={!activeShift || emergencyStatus}
                      >
                        {isSimulatorRunning && !emergencyStatus ? '⏸ Pause Extruder' : '▶ Resume Extruder'}
                      </button>

                      <button
                        onClick={() => {
                          if (activeShift) {
                            setSimulatedUnits(prev => prev + 100);
                          }
                        }}
                        className="bg-[#212735] hover:bg-[#2C3345] transition-all px-3 py-2 rounded text-xs font-mono text-white"
                        disabled={!activeShift || emergencyStatus}
                        title="Quick force increments (+100 units)"
                      >
                        ⚡ Simulate Flow +100
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => handleSimBatchSubmit('Success')}
                        className="bg-industrial-success hover:bg-emerald-600 transition px-4 py-2 rounded text-xs text-black font-bold font-mono tracking-wide"
                        disabled={!activeShift || emergencyStatus}
                      >
                        ✔️ Complete & Log Batch
                      </button>

                      <button
                        onClick={() => {
                          const cause = prompt("Enter emergency stop issue description:", "Mechanical Jam");
                          if (cause) triggerEmergencyStop(cause);
                        }}
                        className="bg-industrial-danger hover:bg-red-600 transition px-4 py-2 rounded text-xs text-white font-bold font-mono tracking-wide"
                        disabled={!activeShift}
                      >
                        🚨 EMERGENCY STOP
                      </button>
                    </div>
                  </div>

                  {!activeShift && (
                    <div className="bg-[#0B0D10]/95 absolute inset-0 flex flex-col justify-center items-center p-6 text-center z-20">
                      <ShieldAlert className="w-12 h-12 text-industrial-safety mb-3 animate-pulse" />
                      <h4 className="text-lg font-black text-white font-display">ROUTINE SECURITY LOCK ACTIVE</h4>
                      <p className="text-xs text-gray-400 mt-1 max-w-[380px] leading-relaxed">
                        To run live extruder telemetry feedback or log active batches, you must have an active Worker shifts signed in on the secure tablet workspace.
                      </p>
                      
                      <button
                        onClick={() => loginMockWorker("EMP-045")}
                        className="mt-4 bg-industrial-accent text-black font-mono font-bold text-xs px-4 py-2 rounded hover:bg-cyan-400 transition"
                      >
                        ACTIVATE MOCK SHIFT LOGIN (EMP-045)
                      </button>
                    </div>
                  )}

                </div>
              </div>

              {/* FACTORY TELEMETRY FLOW PLOTS */}
              <div className="bg-industrial-card border-2 border-industrial-border p-6 flex flex-col gap-4 shadow-lg bg-[#0F1115]">
                <div className="flex justify-between items-center flex-wrap gap-2">
                  <h3 className="text-base font-black tracking-tight text-white uppercase font-display flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-industrial-accent" />
                    LIVE PRODUCTION FLUX GRAPH (TARGET OUTLINE VS REAL)
                  </h3>
                  <span className="text-xs font-mono text-gray-500">REALTIME DATA SENSORS STREAMING</span>
                </div>

                {/* SVG Live Custom Chart to ensure zero dependency crash */}
                <div className="w-full h-48 bg-[#0B0D10] border border-industrial-border rounded relative flex items-center justify-center p-2 overscroll-none">
                  {logs.length === 0 ? (
                    <div className="text-center p-4">
                      <FolderPlaceholder />
                      <p className="text-xs text-gray-500 font-mono mt-1">EMPTY HISTORY DATA STREAM: Log mock batches above to populate chart.</p>
                    </div>
                  ) : (
                    <div className="w-full h-full flex flex-col justify-between">
                      {/* Interactive mock SVG chart based on actual logs timeline */}
                      <svg viewBox="0 0 500 120" className="w-full h-full overflow-visible">
                        {/* Grid lines */}
                        <line x1="0" y1="20" x2="500" y2="20" stroke="#1F2937" strokeWidth="0.5" strokeDasharray="3" />
                        <line x1="0" y1="60" x2="500" y2="60" stroke="#1F2937" strokeWidth="0.5" strokeDasharray="3" />
                        <line x1="0" y1="100" x2="500" y2="100" stroke="#1F2937" strokeWidth="0.5" strokeDasharray="3" />
                        
                        {/* Target rate line */}
                        <line x1="0" y1="50" x2="500" y2="50" stroke="#FF6B00" strokeWidth="1" strokeDasharray="5" opacity="0.7" />
                        <text x="495" y="45" fill="#FF6B00" fontSize="8" textAnchor="end" fontFamily="monospace">BATCH TARGET</text>

                        {/* Production Path Plot */}
                        <path
                          d={`M ${logs.map((l, i) => {
                            const x = Math.min(500, (i / Math.max(1, logs.length - 1)) * 480 + 10);
                            // Scale outputs between 10 and 110 y range
                            const percentageOfTarget = l.unitsProduced / Math.max(1, l.targetUnits);
                            const y = Math.max(10, Math.min(110, 110 - (percentageOfTarget * 45)));
                            return `${x} ${y}`;
                          }).join(' L ')}`}
                          fill="none"
                          stroke="#00F0FF"
                          strokeWidth="2.5"
                          className="drop-shadow-[0_0_6px_rgba(0,240,255,0.4)]"
                        />

                        {/* Nodes */}
                        {logs.map((l, i) => {
                          const x = Math.min(500, (i / Math.max(1, logs.length - 1)) * 480 + 10);
                          const percentageOfTarget = l.unitsProduced / Math.max(1, l.targetUnits);
                          const y = Math.max(10, Math.min(110, 110 - (percentageOfTarget * 45)));
                          const isSuccess = l.status === 'Success';
                          return (
                            <g key={l.batchId} className="group cursor-pointer">
                              <circle
                                cx={x}
                                cy={y}
                                r="4"
                                fill={isSuccess ? "#10B981" : "#EF4444"}
                                stroke="#FFFFFF"
                                strokeWidth="1"
                              />
                              <text x={x} y={y - 8} fill="#FFFFFF" fontSize="6.5" textAnchor="middle" fontFamily="monospace" className="hidden group-hover:block bg-black px-1">
                                {l.batchId}: {l.unitsProduced}
                              </text>
                            </g>
                          );
                        })}
                      </svg>
                      
                      <div className="flex justify-between text-[9px] font-mono text-gray-500 border-t border-gray-900 pt-1">
                        <span>LATEST DISCHARGES</span>
                        <span>CHRONOLOGICAL STREAM (RIGHT IS OLDER)</span>
                        <span>HISTORIC RECORDS</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex gap-4 items-center justify-center flex-wrap text-xs font-mono">
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 bg-industrial-accent rounded"></span>
                    <span className="text-gray-400">Production Yield</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3.5 h-0.5 bg-industrial-safety border-b border-dashed border-industrial-safety w-6"></span>
                    <span className="text-gray-400">Compliance Limit Metric</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 bg-industrial-success rounded-full"></span>
                    <span className="text-gray-400">Success Run</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 bg-industrial-danger rounded-full"></span>
                    <span className="text-gray-400">Failed Shutdown / Fault</span>
                  </div>
                </div>

              </div>

            </div>

            {/* COLUMN 2: ACTIVE SHIFT & SYSTEM CONTROLS */}
            <div className="flex flex-col gap-6">
              
              {/* CURRENT ACTIVE SHIFT CONTROLLER */}
              <div className="bg-industrial-card border-2 border-industrial-border p-6 rounded flex flex-col gap-4 shadow-lg">
                <h3 className="text-base font-black tracking-tight text-white uppercase font-display flex items-center gap-2">
                  <UserCheck className="h-5 w-5 text-industrial-safety" />
                  ACTIVE WORKER SHIFT STATUS
                </h3>

                {activeShift ? (
                  <div className="flex flex-col gap-4">
                    <div className="bg-[#12151D] p-4 border border-industrial-border rounded flex flex-col gap-2 font-mono text-xs">
                      <div className="flex justify-between py-1 border-b border-gray-800">
                        <span className="text-gray-400">WORKER COMPID:</span>
                        <span className="text-white font-bold">{activeShift.workerId}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-gray-800">
                        <span className="text-gray-400">RESTRICTED PIN:</span>
                        <span className="text-white">**** ({activeShift.pin})</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-gray-800">
                        <span className="text-gray-400">SIGN-IN LOG:</span>
                        <span className="text-gray-300">{new Date(activeShift.loginTime).toLocaleTimeString()}</span>
                      </div>
                    </div>

                    {/* Operational Guidelines Safety Check Status */}
                    <div className="flex flex-col gap-2">
                      <span className="text-xs font-mono font-bold text-gray-400 tracking-wider uppercase">SAFETY MANDATE COMPLIANCE:</span>
                      
                      <div className="flex items-center justify-between text-xs font-mono p-2.5 bg-gray-900 rounded border border-gray-850">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-industrial-success" />
                          <span>Helmet Checked</span>
                        </div>
                        <span className="text-industrial-success font-bold text-[10px]">VERIFIED</span>
                      </div>

                      <div className="flex items-center justify-between text-xs font-mono p-2.5 bg-gray-900 rounded border border-gray-850">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-industrial-success" />
                          <span>Clean Workplace Zone</span>
                        </div>
                        <span className="text-industrial-success font-bold text-[10px]">VERIFIED</span>
                      </div>

                      <div className="flex items-center justify-between text-xs font-mono p-2.5 bg-gray-900 rounded border border-gray-850">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-industrial-success" />
                          <span>Machine Check completed</span>
                        </div>
                        <span className="text-industrial-success font-bold text-[10px]">VERIFIED</span>
                      </div>
                    </div>

                    <button
                      onClick={logoutMockWorker}
                      className="w-full bg-[#2E3545] hover:bg-industrial-danger hover:text-white transition py-2 rounded text-xs font-mono text-gray-300 font-bold uppercase tracking-wider mt-2 border border-gray-700 hover:border-industrial-danger"
                    >
                      🚪 Terminate Active Shift
                    </button>
                  </div>
                ) : (
                  <div className="bg-[#0B0D10] border border-industrial-border p-5 rounded text-center">
                    <p className="text-xs text-gray-400 mb-4 leading-relaxed font-mono">
                      No shift records currently active. Trigger mock operator sign-in simulation to unlock control panel operations.
                    </p>
                    
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => loginMockWorker("EMP-045")}
                        className="bg-industrial-accent hover:bg-cyan-500 text-black font-semibold text-xs font-mono py-2 rounded transition"
                      >
                        Sign In EMP-045 (Supervisor)
                      </button>

                      <button
                        onClick={() => loginMockWorker("EMP-012")}
                        className="bg-gray-800 hover:bg-gray-700 text-white text-xs font-mono py-2 rounded transition"
                      >
                        Sign In EMP-012 (Operator J)
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* ADMIN SYSTEM PREFERENCE / CORE ACTIONS */}
              <div className="bg-industrial-card border-2 border-industrial-border p-6 rounded flex flex-col gap-4 shadow-lg">
                <h3 className="text-base font-black tracking-tight text-white uppercase font-display flex items-center gap-2">
                  <Settings className="h-5 w-5 text-industrial-accent" />
                  ADMIN CORE RUN COMMANDS
                </h3>

                <div className="flex flex-col gap-3 font-mono">
                  {/* Clear history */}
                  <button
                    onClick={handleClearAllLogs}
                    className="w-full text-left bg-[#1B1D25] hover:bg-industrial-danger/10 p-3 rounded border border-industrial-border hover:border-industrial-danger transition-all text-xs flex justify-between items-center group text-gray-300 hover:text-industrial-danger"
                  >
                    <div>
                      <span className="font-bold block uppercase tracking-wide">CLEAR HISTORIC BATCH LOGS</span>
                      <span className="text-[10px] text-gray-500 group-hover:text-industrial-danger/75">Executes remote clearAllBatchLogs()</span>
                    </div>
                    <Trash2 className="w-4 h-4 text-gray-500 group-hover:text-industrial-danger" />
                  </button>

                  {/* Seed Database */}
                  <button
                    onClick={() => {
                      if (window.confirm("CONFIRMATION: Reset and database seed recipe arrays?")) {
                        setProducts(INITIAL_PRODUCTS);
                        setLogs(INITIAL_LOGS);
                        alert("Database variables restored to initial setup.");
                      }
                    }}
                    className="w-full text-left bg-[#1B1D25] hover:bg-industrial-accent/10 p-3 rounded border border-industrial-border hover:border-industrial-accent transition-all text-xs flex justify-between items-center group text-gray-300 hover:text-industrial-accent"
                  >
                    <div>
                      <span className="font-bold block uppercase tracking-wide">RESEED DEFAULT DATASETS</span>
                      <span className="text-[10px] text-gray-500 group-hover:text-industrial-accent/75">Re-populates default formulas & history</span>
                    </div>
                    <RefreshCw className="w-4 h-4 text-gray-500 group-hover:text-industrial-accent" />
                  </button>

                  <div className="bg-[#111319] p-3 rounded border border-industrial-border text-[11px] leading-relaxed text-gray-400">
                    <span className="font-bold text-[#FF6B00] block mb-1">💡 TABLET COMPANION EXCURSIONS:</span>
                    The companion console mimics data flows that happen on the Android factory tablet. In the Android App, operations insert logs into the Room database, which triggers state alterations.
                  </div>
                </div>
              </div>

            </div>

          </div>
        )}

        {/* TAB 2: PRODUCT MIXTURE FORMULAS CATALOG */}
        {activeTab === 'products' && (
          <div className="bg-industrial-card border-2 border-industrial-border rounded-lg overflow-hidden shadow-lg flex flex-col">
            <div className="bg-[#0B0D10] border-b-2 border-industrial-border p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-black tracking-tight text-white uppercase font-display flex items-center gap-2">
                  <Database className="text-industrial-accent" />
                  FACTORY INDUSTRIAL REGISTER (PRODUCT DIRECTORY)
                </h2>
                <p className="text-xs text-gray-400 font-mono mt-0.5">MANAGE SYSTEM FORMULAS TRANSLATED DIRECTLY TO ANDROID RECIPE SQL DATABASE</p>
              </div>

              <button
                onClick={() => {
                  setEditingProduct(null);
                  setNewProductId("");
                  setNewProductName("");
                  setNewProductEnglishName("");
                  setNewProductTargetUph(1200);
                  setNewProductColor("#00F0FF");
                  setNewProductManual("");
                  setShowAddProductModal(true);
                }}
                className="bg-industrial-accent text-black hover:bg-cyan-500 font-mono font-bold text-xs px-4 py-2 rounded flex items-center gap-2 transition ml-auto"
              >
                <Plus className="w-4 h-4 text-black" strokeWidth={3} />
                REGISTER NEW MIXTURE FORMULA
              </button>
            </div>

            {/* List products */}
            <div className="p-6">
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {products.length === 0 ? (
                  <div className="col-span-full py-12 text-center text-gray-550 border border-dashed border-gray-800 rounded">
                    <FolderPlaceholder />
                    <p className="mt-2 text-sm text-gray-500 font-mono">NO ACTIVE FORMULAS IN DIRECTORY REGISTER</p>
                  </div>
                ) : (
                  products.map(p => (
                    <div 
                      key={p.id.toString()} 
                      className="bg-[#12141C] border border-industrial-border rounded overflow-hidden flex flex-col relative"
                    >
                      {/* Product Accent visual banner */}
                      <div className="h-2" style={{ backgroundColor: p.colorHex }}></div>
                      
                      {/* Details Box */}
                      <div className="p-5 flex-1 flex flex-col gap-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-[10px] font-mono text-[#00F0FF] bg-industrial-accent/10 px-2 py-0.5 rounded border border-industrial-accent/20">
                              {p.id}
                            </span>
                            <h3 className="text-lg font-extrabold text-white mt-1.5">{p.englishName}</h3>
                            <h4 className="text-sm text-gray-400 font-medium font-display leading-tight">{p.name}</h4>
                          </div>

                          <span className={`text-[10px] uppercase font-mono font-bold px-2 py-0.5 rounded-full ${
                            p.isActive 
                              ? 'bg-industrial-success/10 text-industrial-success border border-industrial-success/20' 
                              : 'bg-gray-800 text-gray-400 border border-gray-700'
                          }`}>
                            {p.isActive ? 'RUN READY' : 'OFFLINE'}
                          </span>
                        </div>

                        <div className="border-t border-gray-850 pt-3 flex flex-col gap-1.5 text-xs font-mono">
                          <div className="flex justify-between">
                            <span className="text-gray-500">TARGET UPH OUTFLOW:</span>
                            <span className="text-white font-bold">{p.targetUph} Units/Hr</span>
                          </div>
                          
                          <div className="flex justify-between items-center">
                            <span className="text-gray-500">DOCUMENT MANUAL:</span>
                            {p.manualFileName ? (
                              <span className="text-industrial-accent flex items-center gap-1 text-[11px]" title={p.manualFileName}>
                                <BookOpen className="w-3.5 h-3.5" />
                                {p.manualFileName}
                              </span>
                            ) : (
                              <span className="text-gray-600 text-[11px]">Unregistered</span>
                            )}
                          </div>

                          <div className="flex justify-between items-center">
                            <span className="text-gray-500">HEX CHANNELS CODE:</span>
                            <span className="text-white font-bold flex items-center gap-1.5">
                              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.colorHex }}></span>
                              {p.colorHex}
                            </span>
                          </div>
                        </div>

                        {/* Actions control bar */}
                        <div className="mt-auto border-t border-gray-850 pt-4 flex gap-2 justify-end">
                          <button
                            onClick={() => handleStartEditProduct(p)}
                            className="text-gray-440 hover:text-industrial-accent font-semibold flex items-center gap-1 px-2.5 py-1.5 rounded bg-gray-900 hover:bg-gray-800 border border-gray-800 transition text-xs font-mono"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            EDIT
                          </button>
                          
                          <button
                            onClick={() => handleDeleteProduct(p.id.toString())}
                            className="text-gray-450 hover:text-industrial-danger font-semibold flex items-center gap-1 px-2.5 py-1.5 rounded bg-gray-950 hover:bg-red-950/20 border border-gray-900 hover:border-industrial-danger/20 transition text-xs font-mono"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            DELETE
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

            </div>
          </div>
        )}

        {/* TAB 3: BATCH LOGS HISTORY PANEL */}
        {activeTab === 'logs' && (
          <div className="bg-industrial-card border-2 border-industrial-border rounded-lg overflow-hidden shadow-lg flex flex-col">
            <div className="bg-[#0B0D10] border-b-2 border-industrial-border p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-black tracking-tight text-white uppercase font-display flex items-center gap-2">
                  <Terminal className="text-industrial-accent" />
                  SECURED LOG REGISTRY VAULT
                </h2>
                <p className="text-xs text-gray-400 font-mono mt-0.5">READ-ONLY EXTRUDER SHIPMENT EVENTS RETRIEVED FROM ROOM STORAGE SYSTEM</p>
              </div>

              {/* Advanced search modifiers filters */}
              <div className="flex flex-wrap items-center gap-4 text-xs font-mono">
                {/* Search query input */}
                <input
                  type="text"
                  placeholder="QUERY BATCH OR MIXTURE..."
                  value={searchLog}
                  onChange={(e) => setSearchLog(e.target.value)}
                  className="bg-[#11141C] border border-industrial-border text-white rounded px-3 py-2 w-52 outline-none focus:border-industrial-accent"
                />

                {/* Dropdown line modifier */}
                <select
                  value={lineFilter}
                  onChange={(e) => setLineFilter(e.target.value)}
                  className="bg-[#11141C] border border-industrial-border text-white rounded px-3 py-2 w-44 outline-none focus:border-industrial-accent cursor-pointer"
                >
                  <option value="ALL">FILTER ALL LINES</option>
                  <option value="Line A">Line A (Manual Assembly)</option>
                  <option value="Line B">Line B (Auto Injection)</option>
                  <option value="Line C">Line C (Extrusion Sinter)</option>
                  <option value="CNC-04">CNC-04 Milling Node</option>
                </select>

                {/* Master clear remote trigger */}
                <button
                  onClick={handleClearAllLogs}
                  className="bg-industrial-danger/10 text-industrial-danger hover:bg-industrial-danger hover:text-white border border-industrial-danger/30 hover:border-industrial-danger transition px-4 py-2 rounded text-xs font-mono font-bold uppercase tracking-wider h-9"
                >
                  CLEAR TRANSACTION HISTORY
                </button>
              </div>
            </div>

            {/* List log items table */}
            <div className="p-6">
              
              <div className="w-full overflow-x-auto rounded border border-industrial-border">
                <table className="w-full text-left font-mono text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#0B0D10] text-[#868A94] uppercase tracking-wider text-[10px] border-b border-industrial-border">
                      <th className="p-4">BATCH ID</th>
                      <th className="p-4">MIXTURE (ENGLISH / HINDI)</th>
                      <th className="p-4">RUN SITE LINE</th>
                      <th className="p-4">UNITS OUTFLOW</th>
                      <th className="p-4">SAFETY COGNIZANCES STATUS</th>
                      <th className="p-4">LOG TIMESTAMP</th>
                    </tr>
                  </thead>
                  
                  <tbody className="divide-y divide-gray-850">
                    {filteredLogs.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center p-8 text-gray-550 italic font-mono text-gray-500">
                          NO ACTIVE HISTORIES CAPTURED FOR FILTER DIRECTIVES
                        </td>
                      </tr>
                    ) : (
                      filteredLogs.map(l => (
                        <tr key={l.batchId} className="hover:bg-[#12141C] transition-colors">
                          <td className="p-4 font-bold text-white tracking-widest">{l.batchId}</td>
                          <td className="p-4">
                            <div className="text-sm font-semibold text-[#D1D4DC]">{l.productNameEnglish}</div>
                            <div className="text-xs text-gray-400 font-display leading-tight">{l.productNameHindi}</div>
                          </td>
                          <td className="p-4 text-gray-300 font-medium">{l.line}</td>
                          <td className="p-4">
                            <span className="text-white font-bold">{l.unitsProduced.toLocaleString()}</span>
                            <span className="text-xs text-gray-500 ml-1">/ {l.targetUnits.toLocaleString()}</span>
                          </td>
                          <td className="p-4">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-[10.5px] font-bold border ${
                              l.status === 'Success' 
                                ? 'bg-industrial-success/15 text-industrial-success border-industrial-success/20 glow-text-success' 
                                : 'bg-industrial-danger/15 text-industrial-danger border-industrial-danger/20 glow-text-red'
                            }`}>
                              {l.status === 'Success' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                              {l.status === 'Success' ? 'YIELD OK' : 'ALARM / FAULT'}
                            </span>
                          </td>
                          <td className="p-4 text-gray-405 text-gray-400 font-medium">
                            {new Date(l.timestamp).toLocaleString()}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

            </div>
          </div>
        )}

        {/* TAB 4: DATABASE INTEGRATION & BRIDGING LINKS DETAILS */}
        {activeTab === 'link-integration' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* COLUMN 1 & 2: CONVERTING LOCAL STORAGE ROOM REPOSITORY TO API ENDPOINTS */}
            <div className="lg:col-span-2 flex flex-col gap-6">
              
              <div className="bg-[#12151D] border-2 border-[#10B981]/40 p-6 rounded-lg flex flex-col gap-6 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full filter blur-3xl pointer-events-none"></div>
                
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-emerald-500/10 border border-[#10B981]/30 rounded">
                    <Link2 className="h-6 w-6 text-emerald-400" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-white font-display uppercase tracking-tight">
                      🔌 DATABASE BRIDGING & REMOTE CONNECTIVITY PROTOCOLS
                    </h2>
                    <p className="text-xs text-emerald-400 font-mono">EXPLAINING HOW THE TABLET APP SYNCHRONIZES DATA TO THE CENTRALISED SERVER</p>
                  </div>
                </div>

                <div className="text-sm leading-relaxed text-gray-300 flex flex-col gap-4">
                  <p>
                    The factory terminal tablet operates <strong>completely offline-first</strong> inside the assembly line to prevent data loss in the event of industrial Wi-Fi disruptions or mechanical high-frequency noise interference. It logs operator events directly into a local <strong>Room Database</strong> (SQLite).
                  </p>

                  <p>
                    To bridge the Tablet App with this central Cloud Administration Web Console, we configure an external database connector layer. Below are the standard ways of implementing and wiring this bidirectional link:
                  </p>

                  {/* Options timeline cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
                    
                    <div className="bg-[#191D28] p-4 border border-gray-800 rounded flex flex-col gap-2.5">
                      <span className="font-mono text-xs font-bold text-emerald-400">PROTOCOL I</span>
                      <h4 className="text-xs font-extrabold text-white uppercase tracking-wider font-display">Ktor REST Sync Client</h4>
                      <p className="text-[11px] text-gray-400 leading-relaxed font-sans">
                        The Tablet runs a Worker-backed background job that polls a POST API periodically. It bundles local batch Room rows and ships them safely as a compressed JSON array.
                      </p>
                    </div>

                    <div className="bg-[#191D28] p-4 border border-gray-800 rounded flex flex-col gap-2.5">
                      <span className="font-mono text-xs font-bold text-emerald-400">PROTOCOL II</span>
                      <h4 className="text-xs font-extrabold text-white uppercase tracking-wider font-display">Websocket Uplink</h4>
                      <p className="text-[11px] text-gray-400 leading-relaxed font-sans">
                        For low-latency telemetry (like the real-time extruder unit metrics), target machines push high-frequency updates via WebSocket packets.
                      </p>
                    </div>

                    <div className="bg-[#191D28] p-4 border border-gray-800 rounded flex flex-col gap-2.5">
                      <span className="font-mono text-xs font-bold text-emerald-400">PROTOCOL III</span>
                      <h4 className="text-xs font-extrabold text-white uppercase tracking-wider font-display">Firebase Sync Node</h4>
                      <p className="text-[11px] text-gray-400 leading-relaxed font-sans">
                        Integrating the Firebase SDK into our Gradle builds allows Room DAO logs to mirror directly to a Firestore instance, auto-syncing both online and offline states seamlessly.
                      </p>
                    </div>

                  </div>
                </div>

                {/* Code viewer container */}
                <div className="border-t border-gray-800 pt-4 flex flex-col gap-3">
                  <div className="flex justify-between items-center text-xs font-mono text-gray-400">
                    <span className="flex items-center gap-1.5"><Terminal className="w-4 h-4 text-emerald-400" /> SOURCE: RoomToWebSyncManagerService.kt</span>
                    
                    <button 
                      onClick={() => triggerCopyCode(SAMPLE_KTOR_CODE, 'ktor')}
                      className="flex items-center gap-1 hover:text-white transition bg-gray-800 hover:bg-gray-700 font-semibold px-2 py-1 rounded"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      {copiedSection === 'ktor' ? 'Copied' : 'Copy Template'}
                    </button>
                  </div>

                  <pre className="bg-[#0B0D10] text-[#A6E22E] p-4 rounded overflow-x-auto text-[11px] font-mono border border-gray-805 max-h-72 select-text text-left leading-relaxed">
                    {SAMPLE_KTOR_CODE}
                  </pre>
                </div>
              </div>

            </div>

            {/* COLUMN 3: DIRECTORY EXCEL SCHEMA SCHEMES */}
            <div className="flex flex-col gap-6">
              
              <div className="bg-industrial-card border-2 border-industrial-border p-6 rounded flex flex-col gap-4 shadow-lg">
                <h3 className="text-base font-black tracking-tight text-white uppercase font-display flex items-center gap-2">
                  <FileSpreadsheet className="h-5 w-5 text-industrial-accent" />
                  DATABASE SQL SCHEMA LAYOUTS
                </h3>
                <p className="text-xs text-gray-500 font-mono">Schema attributes matching Room Entity setup for easy replication into PostgreSQL or MongoDB.</p>

                <div className="bg-[#0B0D10] border border-industrial-border p-4 rounded-md font-mono text-[11.5px] leading-relaxed select-text text-left text-[#A8FF60]">
                  <span className="font-bold text-white block mb-1">-- SQLite / Postgres Schema mapping:</span>
                  <pre className="text-gray-300">
{`CREATE TABLE batch_logs (
    batchId VARCHAR(32) PRIMARY KEY,
    productNameHindi TEXT,
    productNameEnglish TEXT,
    line VARCHAR(16),
    unitsProduced INT,
    status VARCHAR(16),
    timestamp BIGINT,
    targetUnits INT
);`}
                  </pre>
                </div>

                <div className="bg-[#0B0D10]/50 p-3 rounded text-[11.5px] leading-relaxed text-gray-400 font-mono">
                  <span className="font-bold text-[#FF6B00] block mb-1">💡 CLOUD COMPATIBILITY PRO-TIP:</span>
                  By importing standard SQL schemas identical to our Room DB entities onto a Supabase or Neon DB backend, we ensure zero discrepancy when marshaling values over REST wrappers.
                </div>
              </div>

              {/* Vercel build configs guidance */}
              <div className="bg-industrial-card border-2 border-industrial-border p-6 rounded flex flex-col gap-4 shadow-lg">
                <h3 className="text-base font-black tracking-tight text-white uppercase font-display flex items-center gap-2">
                  <Wifi className="h-5 w-5 text-[#10B981]" />
                  VERCEL OUT-OF-THE-BOX CONFIG
                </h3>
                <p className="text-xs text-gray-400 font-mono leading-relaxed">
                  Excellent! This workspace is pre-integrated. When pushing or linking to Vercel:
                </p>

                <ul className="text-xs font-mono flex flex-col gap-2.5 text-gray-300 list-disc list-inside">
                  <li><strong>ROOT IDENTIFIER:</strong> Vercel auto-scans package.json directly.</li>
                  <li><strong>BUILD INSTRUCTION:</strong> Executes <code className="bg-gray-900 border border-gray-800 text-industrial-accent px-1.5 py-0.5 rounded">npm run build</code> seamlessly.</li>
                  <li><strong>OUTPUT DIRECTORY:</strong> Styled HTML / React bundle is dumped into the <code className="bg-gray-900 border border-gray-800 text-industrial-accent px-1.5 py-0.5 rounded">dist</code> directory.</li>
                  <li><strong>ZERO DATABASE INSTANCES COST:</strong> Runs fully serverless with client-side reactive localStorage fallback! Ready to demo in seconds.</li>
                </ul>
              </div>

            </div>

          </div>
        )}

      </div>

      {/* 4. DIALOG ADD/EDIT RECIPE MIXTURE */}
      {showAddProductModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 select-none">
          <div className="bg-industrial-card border-2 border-industrial-accent rounded-lg max-w-md w-full overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-[#0B0D10] border-b border-industrial-border p-4 flex justify-between items-center bg-gray-950">
              <h3 className="text-sm font-bold font-mono tracking-widest text-[#00F0FF] uppercase">
                {editingProduct ? 'EDIT MIXTURE RECIPE FORMULA' : 'REGISTER NEW MIXTURE RECIPE'}
              </h3>
              
              <button 
                onClick={() => setShowAddProductModal(false)}
                className="text-gray-400 hover:text-white font-mono text-sm uppercase px-1.5 py-0.5 border border-transparent hover:border-gray-700 transition"
              >
                Close
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="p-6 flex flex-col gap-4 font-mono text-xs">
              
              {/* Product ID field */}
              <div className="flex flex-col gap-1.5">
                <label className="text-gray-400 uppercase tracking-wide">MIXTURE SPECIFICATION CODE ID:</label>
                <input
                  type="text"
                  placeholder="e.g. PRD-004 (MANDATORY)"
                  value={newProductId}
                  onChange={(e) => setNewProductId(e.target.value)}
                  className="bg-[#0B0D10] text-[#E2E8F0] border border-industrial-border rounded p-2 focus:border-industrial-accent outline-none font-mono"
                  disabled={editingProduct !== null}
                />
              </div>

              {/* English Name field */}
              <div className="flex flex-col gap-1.5">
                <label className="text-gray-400 uppercase tracking-wide">ENGLISH TECHNICAL NAME:</label>
                <input
                  type="text"
                  placeholder="e.g. Standard Blend (MANDATORY)"
                  value={newProductEnglishName}
                  onChange={(e) => setNewProductEnglishName(e.target.value)}
                  className="bg-[#0B0D10] text-[#E2E8F0] border border-industrial-border rounded p-2 focus:border-industrial-accent outline-none font-mono"
                />
              </div>

              {/* Hindi Translation field */}
              <div className="flex flex-col gap-1.5">
                <label className="text-gray-400 uppercase tracking-wide">HINDI LAUNCHER LABEL TRANSLATION:</label>
                <input
                  type="text"
                  placeholder="e.g. मानक मिश्रण (MANDATORY)"
                  value={newProductName}
                  onChange={(e) => setNewProductName(e.target.value)}
                  className="bg-[#0B0D10] text-[#E2E8F0] border border-industrial-border rounded p-2 focus:border-industrial-accent outline-none font-mono"
                />
              </div>

              {/* Target units UPH field */}
              <div className="flex flex-col gap-1.5">
                <label className="text-gray-400 uppercase tracking-wide">TARGET OUTPUT FREQUENCY (UPH):</label>
                <input
                  type="number"
                  value={newProductTargetUph}
                  onChange={(e) => setNewProductTargetUph(Math.max(1, parseInt(e.target.value) || 0))}
                  className="bg-[#0B0D10] text-[#E2E8F0] border border-industrial-border rounded p-2 focus:border-industrial-accent outline-none font-mono"
                />
              </div>

              {/* Saturated Color code field */}
              <div className="flex flex-col gap-1.5">
                <label className="text-gray-400 uppercase tracking-wide">LINE ACCENT COLOR CHANNELS:</label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={newProductColor}
                    onChange={(e) => setNewProductColor(e.target.value)}
                    className="w-10 h-8 rounded border-0 bg-transparent cursor-pointer"
                  />
                  <input
                    type="text"
                    value={newProductColor}
                    onChange={(e) => setNewProductColor(e.target.value)}
                    className="bg-[#0B0D10] text-[#E2E8F0] border border-industrial-border rounded p-2 flex-1 focus:border-industrial-accent outline-none font-mono uppercase"
                  />
                </div>
              </div>

              {/* Document manual file */}
              <div className="flex flex-col gap-1.5">
                <label className="text-gray-400 uppercase tracking-wide">MANUAL PDF FILE REGISTRATION (OPTIONAL):</label>
                <input
                  type="text"
                  placeholder="e.g. standard_mix_ops_v1.pdf"
                  value={newProductManual}
                  onChange={(e) => setNewProductManual(e.target.value)}
                  className="bg-[#0B0D10] text-[#E2E8F0] border border-industrial-border rounded p-2 focus:border-industrial-accent outline-none font-mono"
                />
              </div>

              {/* Trigger save button */}
              <button
                type="submit"
                className="bg-industrial-accent hover:bg-cyan-500 font-bold font-mono text-black py-2.5 rounded transition uppercase tracking-widest text-xs mt-3 shadow-md shadow-industrial-accent/25"
              >
                {editingProduct ? 'Update Recipe Record' : 'Register Formula Record'}
              </button>

            </form>
          </div>
        </div>
      )}

      {/* FOOTER ENTERPRISE FOOTER */}
      <footer className="border-t border-industrial-border py-6 px-6 bg-[#0B0D10] text-center select-none mt-auto">
        <div className="max-w-[1500px] mx-auto text-xs text-gray-400 font-mono flex flex-col sm:flex-row justify-between items-center gap-4">
          <span>INDUSTRIAL NEXUS INC. COGNIZANT PLATFORMS CO. ALL RIGHTS RESERVED.</span>
          <span>SECURED TERMINAL ADDRESS: localhost:3000 | SERVERLESS SYNC ROUTE: LOCALSTORAGE SECURE</span>
        </div>
      </footer>
    </div>
  );
}

// Vector Folder Placeholder SVG Component
function FolderPlaceholder() {
  return (
    <svg className="mx-auto h-12 w-12 text-gray-600 border border-transparent rounded p-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
    </svg>
  );
}

// Technical Copy Templates code segments
const SAMPLE_KTOR_CODE = `package com.example.service

import com.example.data.*
import io.ktor.client.*
import io.ktor.client.request.*
import io.ktor.client.statement.*
import io.ktor.http.*
import kotlinx.serialization.json.Json
import kotlinx.serialization.encodeToString

class CentralDatabaseSynchronizer(
    private val client: HttpClient,
    private val batchLogDao: BatchLogDao,
    private val serverUrl: String = "https://industrial-nexus-web.vercel.app/api/sync"
) {
    suspend fun synchronizeOfflineBatches(): Boolean {
        // 1. Fetch un-synced entries locally from Room database
        val localBatchList: List<BatchLogEntity> = batchLogDao.getUnsyncedBatches()
        if (localBatchList.isEmpty()) return true

        return try {
            // 2. Marshall record set into JSON payloads
            val jsonPayload = Json.encodeToString(localBatchList)

            // 3. Dispatch to remote Vercel / Central serverless POST endpoint
            val response: HttpResponse = client.post(serverUrl) {
                contentType(ContentType.Application.Json)
                setBody(jsonPayload)
            }

            if (response.status == HttpStatusCode.OK) {
                // 4. Update syncked status flag on successfully saved databases
                batchLogDao.markAsSynced(localBatchList.map { it.batchId })
                true
            } else {
                false
            }
        } catch (e: Exception) {
            e.printStackTrace()
            false
        }
    }
}`;
