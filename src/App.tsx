/**
 * ============================================================================
 * FILE: App.tsx
 * PURPOSE: Central Administrative Companion Portal & Shift Operations Controller
 * PROJECT: Industrial Nexus - Hybrid Shop Floor & Cloud Reconciliation Suite
 *
 * DESCRIPTION:
 * This file serves as the main controller for the Industrial Nexus Companion
 * Dashboard. It mimics operational workflows that bridge the shop floor worker
 * layer (10-inch Android Tablet running SQLite Room) with the high-level
 * executive administration layer (Tally ERP & Cloud Admin Ledgers).
 * 
 * DESIGN DETAILS:
 * - High-contrast steel plate cyberpunk layout themed around industrial panel aesthetics.
 * - Multi-tab layout tracking live operations simulation, job queues, material ledgers,
 *   recipe catalogs, and code integration specs.
 * - Reactive state persistence mapped directly to localStorage keys.
 *
 * RELATIONSHIP TO BROADER ARCHITECTURE:
 * 1. Mocks SQLite schemas (Products Master, Production Jobs, Batch Logs, Inventory Ledgers).
 * 2. Emulates synchronization triggers where tablet batch logging synchronizes to cloud tables.
 * 3. Simulates material inventory loops: receipts arrival, BOM formula production depletion,
 *    and finished goods stock invoices from Tally ERP.
 * 
 * SYSTEM DATA FLOWS:
 * [Raw Material Silos] ──(Arrivals)──► [+] Silo Stock
 *          │
 *          ▼ (Worker Batch Completion via BOM Recipes)
 * [Raw Material Stocks] ──[-] Stock  ──►  [Finished Goods Stock] ──[+] Stock
 *                                                      │
 *                                                      ▼ (Tally Truck Dispatch)
 *                                              [Finished Goods Stock] ──[-] Stock
 * ============================================================================
 */

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
  Link2,
  Scale,
  Calendar,
  Layers,
  ArrowDownToLine,
  Truck
} from 'lucide-react';

// Interfaces mirroring the Android Room schema
interface Product {
  id: String;
  name: string; // Hindi Name
  englishName: string; // English Name
  targetUph: number;
  colorHex: string;
  isActive: boolean;
  nominalBatchWeightKg: number; // 600 or 1000
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

interface ProductionJob {
  jobId: string;
  productKey: string;
  totalBatchesScheduled: number;
  batchesCompleted: number;
  status: 'PENDING' | 'ACTIVE' | 'COMPLETED';
  targetDemandTons: number;
  excessYieldKg: number;
  timestamp: number;
}

interface LedgerEntry {
  entryId: string;
  timestamp: number;
  itemType: 'RAW_MATERIAL' | 'FINISHED_GOOD';
  itemName: string; // e.g. "Maize", "Cream Special"
  transactionType: 'ARRIVAL' | 'DEDUCTION_PRODUCTION' | 'DEDUCTION_DISPATCH' | 'OFFSET_ADJUSTMENT';
  quantityKg: number; // positive or negative
  description: string;
}

// Initial Data mirroring IndustrialRepository.kt
const INITIAL_PRODUCTS: Product[] = [
  { id: "PRD-001", name: "क्रीम स्पेशल", englishName: "Cream Special", targetUph: 1200, colorHex: "#00F0FF", isActive: true, nominalBatchWeightKg: 600, manualFileName: "Cream_Special_Ops_v2.pdf" },
  { id: "PRD-002", name: "प्रीमियम प्लस", englishName: "Premium Plus", targetUph: 850, colorHex: "#FF6B00", isActive: true, nominalBatchWeightKg: 1000, manualFileName: "Premium_Plus_Safety.pdf" },
  { id: "PRD-003", name: "मानक मिश्रण", englishName: "Standard Blend", targetUph: 2500, colorHex: "#10B981", isActive: true, nominalBatchWeightKg: 600 }
];

const INITIAL_LOGS: BatchLog[] = [
  { batchId: "B-4902", productNameHindi: "क्रीम स्पेशल", productNameEnglish: "Cream Special", line: "Line A", unitsProduced: 600, status: "Success", timestamp: Date.now() - 3 * 3600000, targetUnits: 600 },
  { batchId: "B-4901", productNameHindi: "क्रीम स्पेशल", productNameEnglish: "Cream Special", line: "Line B", unitsProduced: 0, status: "Failed", timestamp: Date.now() - 6 * 3600000, targetUnits: 600 },
  { batchId: "B-4900", productNameHindi: "प्रीमियम प्लस", productNameEnglish: "Premium Plus", line: "Line A", unitsProduced: 1000, status: "Success", timestamp: Date.now() - 12 * 3600000, targetUnits: 1000 },
  { batchId: "B-8899", productNameHindi: "क्रीम स्पेशल", productNameEnglish: "Cream Special", line: "Line C", unitsProduced: 600, status: "Success", timestamp: Date.now() - 18 * 3600000, targetUnits: 600 },
  { batchId: "B-8898", productNameHindi: "प्रीमियम प्लस", productNameEnglish: "Premium Plus", line: "Line A", unitsProduced: 0, status: "Failed", timestamp: Date.now() - 24 * 3600000, targetUnits: 1000 }
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

const BOM_RECIPES: Record<string, { maizeRatio: number; riceBranRatio: number; soyMealRatio: number }> = {
  "PRD-001": { maizeRatio: 0.50, riceBranRatio: 0.30, soyMealRatio: 0.20 }, // Cream Special
  "PRD-002": { maizeRatio: 0.40, riceBranRatio: 0.40, soyMealRatio: 0.20 }, // Premium Plus
  "PRD-003": { maizeRatio: 0.60, riceBranRatio: 0.20, soyMealRatio: 0.20 }  // Standard Blend
};

export default function App() {
  // Persistence using localStorage
  const [products, setProducts] = useState<Product[]>(() => {
    try {
      const cached = localStorage.getItem('nexus_products');
      if (!cached) return INITIAL_PRODUCTS;
      const parsed = JSON.parse(cached);
      if (!Array.isArray(parsed)) return INITIAL_PRODUCTS;
      const validated = parsed.filter((p: any) => p && typeof p === 'object' && p.id && typeof p.id === 'string' && p.name && p.englishName && p.nominalBatchWeightKg);
      return validated.length > 0 ? validated : INITIAL_PRODUCTS;
    } catch (e) {
      console.error("Failed to parse products from localStorage:", e);
      return INITIAL_PRODUCTS;
    }
  });

  const [logs, setLogs] = useState<BatchLog[]>(() => {
    try {
      const cached = localStorage.getItem('nexus_logs');
      if (!cached) return INITIAL_LOGS;
      const parsed = JSON.parse(cached);
      if (!Array.isArray(parsed)) return INITIAL_LOGS;
      return parsed.filter((l: any) => l && typeof l === 'object' && l.batchId && typeof l.batchId === 'string' && l.productNameEnglish && l.productNameHindi);
    } catch (e) {
      console.error("Failed to parse logs from localStorage:", e);
      return INITIAL_LOGS;
    }
  });

  const [activeShift, setActiveShift] = useState<ActiveShift | null>(() => {
    try {
      const cached = localStorage.getItem('nexus_active_shift');
      if (!cached) return INITIAL_SHIFT;
      const parsed = JSON.parse(cached);
      if (parsed === null) return null;
      if (typeof parsed !== 'object' || !parsed.workerId || !parsed.pin) return INITIAL_SHIFT;
      return parsed as ActiveShift;
    } catch (e) {
      console.error("Failed to parse activeShift from localStorage:", e);
      return INITIAL_SHIFT;
    }
  });

  // NEW: Production Jobs queue
  const [jobs, setJobs] = useState<ProductionJob[]>(() => {
    try {
      const cached = localStorage.getItem('nexus_jobs');
      if (!cached) return [
        { jobId: "JOB-101", productKey: "PRD-001", totalBatchesScheduled: 14, batchesCompleted: 14, status: "COMPLETED", targetDemandTons: 8, excessYieldKg: 400, timestamp: Date.now() - 24 * 3600000 },
        { jobId: "JOB-102", productKey: "PRD-002", totalBatchesScheduled: 5, batchesCompleted: 2, status: "ACTIVE", targetDemandTons: 5, excessYieldKg: 0, timestamp: Date.now() - 3 * 3600000 }
      ];
      return JSON.parse(cached);
    } catch (e) {
      console.error("Failed to parse jobs:", e);
      return [];
    }
  });

  // NEW: Raw Materials Stock States (in kg)
  const [rawMaizeStock, setRawMaizeStock] = useState<number>(() => {
    const cached = localStorage.getItem('nexus_raw_maize');
    return cached ? parseFloat(cached) : 45000;
  });
  const [rawRiceBranStock, setRawRiceBranStock] = useState<number>(() => {
    const cached = localStorage.getItem('nexus_raw_rice_bran');
    return cached ? parseFloat(cached) : 28000;
  });
  const [rawSoyMealStock, setRawSoyMealStock] = useState<number>(() => {
    const cached = localStorage.getItem('nexus_raw_soy_meal');
    return cached ? parseFloat(cached) : 18500;
  });

  // NEW: Finished Goods Stock States (in kg, mapping productKey -> stock)
  const [finishedStock, setFinishedStock] = useState<Record<string, number>>(() => {
    try {
      const cached = localStorage.getItem('nexus_finished_stock');
      if (!cached) return { "PRD-001": 12000, "PRD-002": 8500, "PRD-003": 4000 };
      return JSON.parse(cached);
    } catch (e) {
      return { "PRD-001": 12000, "PRD-002": 8500, "PRD-003": 4000 };
    }
  });

  // NEW: Inventory Ledger History
  const [ledgerHistory, setLedgerHistory] = useState<LedgerEntry[]>(() => {
    try {
      const cached = localStorage.getItem('nexus_ledger_history');
      if (!cached) return [
        { entryId: "L-101", timestamp: Date.now() - 5 * 3600000, itemType: "RAW_MATERIAL", itemName: "Maize", transactionType: "ARRIVAL", quantityKg: 20000, description: "Bulk arrival from supplier (Receipt #R-892)" },
        { entryId: "L-102", timestamp: Date.now() - 3 * 3600000, itemType: "RAW_MATERIAL", itemName: "Soy Meal", transactionType: "ARRIVAL", quantityKg: 10000, description: "Supplier delivery (Receipt #R-893)" },
        { entryId: "L-103", timestamp: Date.now() - 2 * 3600000, itemType: "FINISHED_GOOD", itemName: "Cream Special", transactionType: "DEDUCTION_DISPATCH", quantityKg: -6000, description: "Dispatch Truck MH-12-Q-4530 (Tally invoice #INV-779)" },
        { entryId: "L-104", timestamp: Date.now() - 1 * 3600000, itemType: "FINISHED_GOOD", itemName: "Premium Plus", transactionType: "DEDUCTION_DISPATCH", quantityKg: -4000, description: "Dispatch Truck KA-03-F-1209 (Tally invoice #INV-780)" }
      ];
      return JSON.parse(cached);
    } catch (e) {
      return [];
    }
  });

  // Navigation state (Active tab)
  const [activeTab, setActiveTab] = useState<'dashboard' | 'jobs' | 'inventory' | 'products' | 'logs' | 'link-integration'>('dashboard');

  // Search and Filter states
  const [searchLog, setSearchLog] = useState('');
  const [lineFilter, setLineFilter] = useState('ALL');
  
  // New ledger filter states
  const [ledgerItemTypeFilter, setLedgerItemTypeFilter] = useState<'ALL' | 'RAW_MATERIAL' | 'FINISHED_GOOD'>('ALL');
  const [ledgerSearch, setLedgerSearch] = useState('');

  // New product form states
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [newProductId, setNewProductId] = useState('');
  const [newProductName, setNewProductName] = useState('');
  const [newProductEnglishName, setNewProductEnglishName] = useState('');
  const [newProductTargetUph, setNewProductTargetUph] = useState(1000);
  const [newProductColor, setNewProductColor] = useState('#00F0FF');
  const [newProductNominalWeight, setNewProductNominalWeight] = useState(600);
  const [newProductManual, setNewProductManual] = useState('');
  const [showAddProductModal, setShowAddProductModal] = useState(false);

  // Job creator states
  const [jobProductKey, setJobProductKey] = useState('PRD-001');
  const [jobDemandTons, setJobDemandTons] = useState(5);

  // Raw material arrival states
  const [arrivalIngredient, setArrivalIngredient] = useState<'Maize' | 'Rice Bran' | 'Soy Meal'>('Maize');
  const [arrivalTons, setArrivalTons] = useState(10);

  // Tally Dispatch Simulation states
  const [dispatchProductKey, setDispatchProductKey] = useState('PRD-001');
  const [dispatchTons, setDispatchTons] = useState(4);

  // Monthly Nullification inputs
  const [nullifyPhysicalCounts, setNullifyPhysicalCounts] = useState<Record<string, string>>({
    'Maize': '', 'Rice Bran': '', 'Soy Meal': '', 'PRD-001': '', 'PRD-002': '', 'PRD-003': ''
  });

  // Machine Simulator states
  const [simulatedUnits, setSimulatedUnits] = useState(0);
  const [selectedSimProduct, setSelectedSimProduct] = useState<Product>(() => {
    try {
      const cachedProductsStr = localStorage.getItem('nexus_products');
      let productsList = INITIAL_PRODUCTS;
      if (cachedProductsStr) {
        const parsed = JSON.parse(cachedProductsStr);
        if (Array.isArray(parsed)) {
          const validated = parsed.filter((p: any) => p && typeof p === 'object' && p.id && typeof p.id === 'string' && p.name && p.englishName && p.nominalBatchWeightKg);
          if (validated.length > 0) productsList = validated;
        }
      }
      return productsList[0] || INITIAL_PRODUCTS[0];
    } catch (e) {
      return INITIAL_PRODUCTS[0];
    }
  });

  // Find active job if any
  const activeJob = jobs.find(j => j.status === 'ACTIVE');
  // If a job is active, override simulator product with the active job's product
  const activeJobProduct = activeJob ? products.find(p => p.id === activeJob.productKey) : null;
  const currentSimProduct = activeJobProduct || products.find(p => p.id === selectedSimProduct?.id) || products[0] || INITIAL_PRODUCTS[0];

  const [simLine, setSimLine] = useState('Line A');
  const [isSimulatorRunning, setIsSimulatorRunning] = useState(true);
  const [emergencyStatus, setEmergencyStatus] = useState<boolean>(false);
  const [downtimeReasons, setDowntimeReasons] = useState<string[]>([]);

  // Clock state
  const [localTime, setLocalTime] = useState(new Date().toLocaleTimeString());

  // Copy success feedback state
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  // Sync state to local storage
  useEffect(() => {
    localStorage.setItem('nexus_products', JSON.stringify(products));
  }, [products]);

  useEffect(() => {
    localStorage.setItem('nexus_logs', JSON.stringify(logs));
  }, [logs]);

  useEffect(() => {
    localStorage.setItem('nexus_active_shift', JSON.stringify(activeShift));
  }, [activeShift]);

  useEffect(() => {
    localStorage.setItem('nexus_jobs', JSON.stringify(jobs));
  }, [jobs]);

  useEffect(() => {
    localStorage.setItem('nexus_raw_maize', rawMaizeStock.toString());
  }, [rawMaizeStock]);

  useEffect(() => {
    localStorage.setItem('nexus_raw_rice_bran', rawRiceBranStock.toString());
  }, [rawRiceBranStock]);

  useEffect(() => {
    localStorage.setItem('nexus_raw_soy_meal', rawSoyMealStock.toString());
  }, [rawSoyMealStock]);

  useEffect(() => {
    localStorage.setItem('nexus_finished_stock', JSON.stringify(finishedStock));
  }, [finishedStock]);

  useEffect(() => {
    localStorage.setItem('nexus_ledger_history', JSON.stringify(ledgerHistory));
  }, [ledgerHistory]);

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
        // Calculate units/sec from product target UPH
        const ratePerSec = currentSimProduct.targetUph / 3600;
        const delta = Math.max(0.2, ratePerSec + (Math.random() - 0.4) * 0.5);
        const next = prev + delta;
        
        // Auto trigger completion in simulator if target (nominal weight) is reached
        const target = currentSimProduct.nominalBatchWeightKg;
        if (next >= target) {
          setTimeout(() => handleSimBatchSubmit('Success'), 10);
          return 0;
        }
        return Math.round(next * 10) / 10;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isSimulatorRunning, emergencyStatus, currentSimProduct, activeShift, jobs]);

  // CORE ADMIN ENGINE 1: Batch Demultiplication & Job Creation
  const handleCreateJob = (e: React.FormEvent) => {
    e.preventDefault();
    const product = products.find(p => p.id === jobProductKey) || products[0] || INITIAL_PRODUCTS[0];
    const nominalWeight = product.nominalBatchWeightKg;
    const targetDemandKg = jobDemandTons * 1000;
    
    // Demultiplication calculation: Total Batches = Ceil(Target / Nominal)
    const totalBatches = Math.ceil(targetDemandKg / nominalWeight);
    const excessYieldKg = (totalBatches * nominalWeight) - targetDemandKg;

    const newJob: ProductionJob = {
      jobId: `JOB-${Math.floor(100 + Math.random() * 900)}`,
      productKey: jobProductKey,
      totalBatchesScheduled: totalBatches,
      batchesCompleted: 0,
      status: 'PENDING',
      targetDemandTons: jobDemandTons,
      excessYieldKg: excessYieldKg,
      timestamp: Date.now()
    };

    setJobs(prev => {
      const hasActive = prev.some(j => j.status === 'ACTIVE');
      if (!hasActive) {
        newJob.status = 'ACTIVE'; // Make active if no active job exists
      }
      return [...prev, newJob];
    });

    alert(`Job created! Demultiplexed ${jobDemandTons} Tons into ${totalBatches} batches of ${product.englishName}. Excess Yield: ${excessYieldKg} kg.`);
  };

  // CORE ADMIN ENGINE 2: Material Consumption (BOM) & Inventory Updates
  const handleSimBatchSubmit = (status: 'Success' | 'Failed' = 'Success') => {
    const activeJobIndex = jobs.findIndex(j => j.status === 'ACTIVE');
    const currentActiveJob = activeJobIndex !== -1 ? jobs[activeJobIndex] : null;

    const product = currentActiveJob
      ? (products.find(p => p.id === currentActiveJob.productKey) || currentSimProduct)
      : currentSimProduct;

    const nominalWeight = product.nominalBatchWeightKg;
    const batchId = `B-${Math.floor(1000 + Math.random() * 9000)}`;

    // Write to Batch Log vault history
    const newLog: BatchLog = {
      batchId: batchId,
      productNameHindi: product.name,
      productNameEnglish: product.englishName,
      line: simLine,
      unitsProduced: status === 'Success' ? nominalWeight : 0,
      status: status,
      timestamp: Date.now(),
      targetUnits: nominalWeight
    };
    setLogs(prev => [newLog, ...prev]);

    if (status === 'Success') {
      // Fetch Recipe BOM formula ratios (default fallback to 50-30-20)
      const recipe = BOM_RECIPES[product.id.toString()] || { maizeRatio: 0.50, riceBranRatio: 0.30, soyMealRatio: 0.20 };
      const maizeDeduct = nominalWeight * recipe.maizeRatio;
      const riceBranDeduct = nominalWeight * recipe.riceBranRatio;
      const soyMealDeduct = nominalWeight * recipe.soyMealRatio;

      // Deduct raw material stocks
      setRawMaizeStock(m => Math.max(0, m - maizeDeduct));
      setRawRiceBranStock(r => Math.max(0, r - riceBranDeduct));
      setRawSoyMealStock(s => Math.max(0, s - soyMealDeduct));

      // Add to finished goods stock
      setFinishedStock(prev => ({
        ...prev,
        [product.id.toString()]: (prev[product.id.toString()] || 0) + nominalWeight
      }));

      // Append raw material & production logs to Ledger history
      const newLedgerEntries: LedgerEntry[] = [
        {
          entryId: `L-${Math.floor(10000 + Math.random() * 90000)}`,
          timestamp: Date.now(),
          itemType: 'RAW_MATERIAL',
          itemName: 'Maize',
          transactionType: 'DEDUCTION_PRODUCTION',
          quantityKg: -maizeDeduct,
          description: `BOM Deduction: batch ${batchId} of ${product.englishName}`
        },
        {
          entryId: `L-${Math.floor(10000 + Math.random() * 90000)}`,
          timestamp: Date.now(),
          itemType: 'RAW_MATERIAL',
          itemName: 'Rice Bran',
          transactionType: 'DEDUCTION_PRODUCTION',
          quantityKg: -riceBranDeduct,
          description: `BOM Deduction: batch ${batchId} of ${product.englishName}`
        },
        {
          entryId: `L-${Math.floor(10000 + Math.random() * 90000)}`,
          timestamp: Date.now(),
          itemType: 'RAW_MATERIAL',
          itemName: 'Soy Meal',
          transactionType: 'DEDUCTION_PRODUCTION',
          quantityKg: -soyMealDeduct,
          description: `BOM Deduction: batch ${batchId} of ${product.englishName}`
        },
        {
          entryId: `L-${Math.floor(10000 + Math.random() * 90000)}`,
          timestamp: Date.now(),
          itemType: 'FINISHED_GOOD',
          itemName: product.englishName,
          transactionType: 'ARRIVAL',
          quantityKg: nominalWeight,
          description: `Production Arrival: Batch ${batchId} logged`
        }
      ];
      setLedgerHistory(prev => [...newLedgerEntries, ...prev]);

      // If completing batches under an active job, increment progress
      if (currentActiveJob) {
        setJobs(prev => {
          const updated = [...prev];
          const job = updated[activeJobIndex];
          job.batchesCompleted += 1;
          
          if (job.batchesCompleted >= job.totalBatchesScheduled) {
            job.status = 'COMPLETED';
            // Auto trigger activation of next pending job in queue
            const nextPendingIndex = updated.findIndex(j => j.status === 'PENDING');
            if (nextPendingIndex !== -1) {
              updated[nextPendingIndex].status = 'ACTIVE';
            }
          }
          return updated;
        });
      }
    } else {
      setIsSimulatorRunning(false);
    }
    setSimulatedUnits(0);
  };

  // CORE ADMIN ENGINE 3: Raw Material Arrival Logging
  const handleLogArrival = (e: React.FormEvent) => {
    e.preventDefault();
    const kg = arrivalTons * 1000;

    if (arrivalIngredient === 'Maize') setRawMaizeStock(p => p + kg);
    else if (arrivalIngredient === 'Rice Bran') setRawRiceBranStock(p => p + kg);
    else if (arrivalIngredient === 'Soy Meal') setRawSoyMealStock(p => p + kg);

    const entry: LedgerEntry = {
      entryId: `L-${Math.floor(10000 + Math.random() * 90000)}`,
      timestamp: Date.now(),
      itemType: 'RAW_MATERIAL',
      itemName: arrivalIngredient,
      transactionType: 'ARRIVAL',
      quantityKg: kg,
      description: `Raw Material Arrival: Logged receipt of ${arrivalTons} Tons`
    };
    setLedgerHistory(prev => [entry, ...prev]);
    alert(`Logged arrival of ${arrivalTons} Tons of ${arrivalIngredient}. Stock updated.`);
  };

  // CORE ADMIN ENGINE 4: Tally Finished Goods Dispatch Simulation
  const handleSimulateDispatch = (e: React.FormEvent) => {
    e.preventDefault();
    const product = products.find(p => p.id === dispatchProductKey) || products[0] || INITIAL_PRODUCTS[0];
    const weightKg = dispatchTons * 1000;

    const currentStock = finishedStock[product.id.toString()] || 0;
    if (currentStock < weightKg) {
      if (!window.confirm(`Warning: Dispatch amount (${weightKg.toLocaleString()} kg) exceeds current warehouse stock (${currentStock.toLocaleString()} kg). Allow negative stock?`)) {
        return;
      }
    }

    setFinishedStock(prev => ({
      ...prev,
      [product.id.toString()]: Math.max(-50000, (prev[product.id.toString()] || 0) - weightKg)
    }));

    const entry: LedgerEntry = {
      entryId: `L-${Math.floor(10000 + Math.random() * 90000)}`,
      timestamp: Date.now(),
      itemType: 'FINISHED_GOOD',
      itemName: product.englishName,
      transactionType: 'DEDUCTION_DISPATCH',
      quantityKg: -weightKg,
      description: `Tally Invoice Dispatch: Shipped ${dispatchTons} Tons MH-truck`
    };
    setLedgerHistory(prev => [entry, ...prev]);
    alert(`Tally Integration: Dispatched ${dispatchTons} Tons of ${product.englishName}. stock depleted.`);
  };

  // CORE ADMIN ENGINE 5: Monthly Inventory Nullification Override
  const handleTriggerNullification = (itemName: string, productId: string | null, isFinishedGood: boolean) => {
    const key = productId || itemName;
    const valueString = nullifyPhysicalCounts[key];
    if (!valueString || isNaN(parseFloat(valueString))) {
      alert("Please enter a valid physical stock count.");
      return;
    }

    const physicalKg = parseFloat(valueString);
    let theoreticalKg = 0;

    if (!isFinishedGood) {
      if (itemName === 'Maize') {
        theoreticalKg = rawMaizeStock;
        setRawMaizeStock(physicalKg);
      } else if (itemName === 'Rice Bran') {
        theoreticalKg = rawRiceBranStock;
        setRawRiceBranStock(physicalKg);
      } else if (itemName === 'Soy Meal') {
        theoreticalKg = rawSoyMealStock;
        setRawSoyMealStock(physicalKg);
      }
    } else if (productId) {
      theoreticalKg = finishedStock[productId] || 0;
      setFinishedStock(prev => ({
        ...prev,
        [productId]: physicalKg
      }));
    }

    const offset = physicalKg - theoreticalKg;

    const entry: LedgerEntry = {
      entryId: `L-${Math.floor(10000 + Math.random() * 90000)}`,
      timestamp: Date.now(),
      itemType: isFinishedGood ? 'FINISHED_GOOD' : 'RAW_MATERIAL',
      itemName: itemName,
      transactionType: 'OFFSET_ADJUSTMENT',
      quantityKg: offset,
      description: `Monthly Stock Take Override. Theoretical: ${theoreticalKg.toLocaleString()} kg, Physical: ${physicalKg.toLocaleString()} kg, Offset Adjustment: ${offset >= 0 ? '+' : ''}${offset.toLocaleString()} kg`
    };

    setLedgerHistory(prev => [entry, ...prev]);

    // Clear count input
    setNullifyPhysicalCounts(prev => ({
      ...prev,
      [key]: ''
    }));

    alert(`Stock override successful! Calculated offset of ${offset >= 0 ? '+' : ''}${offset.toLocaleString()} kg logged to ledger.`);
  };

  // Delete production job from queue
  const handleDeleteJob = (jobId: string) => {
    if (window.confirm(`CONFIRMATION: Remove job ${jobId} from queue?`)) {
      setJobs(prev => prev.filter(j => j.jobId !== jobId));
    }
  };

  // Toggle active job state manually
  const handleToggleJobState = (jobId: string, action: 'ACTIVATE' | 'PAUSE') => {
    setJobs(prev => prev.map(j => {
      if (j.jobId === jobId) {
        return { ...j, status: action === 'ACTIVATE' ? 'ACTIVE' : 'PENDING' };
      }
      // If activating this job, pause any other active jobs
      if (action === 'ACTIVATE' && j.status === 'ACTIVE') {
        return { ...j, status: 'PENDING' };
      }
      return j;
    }));
  };

  // Trigger factory shutdown / emergency stop
  const triggerEmergencyStop = (reason: string) => {
    setEmergencyStatus(true);
    setIsSimulatorRunning(false);
    if (!downtimeReasons.includes(reason)) {
      setDowntimeReasons(prev => [...prev, reason]);
    }

    // Write failed log to db history
    const failedLog: BatchLog = {
      batchId: `DWT-${Math.floor(100 + Math.random() * 900)}`,
      productNameHindi: "मशीन डाउनटाइम",
      productNameEnglish: `EMERGENCY STOP [${reason}]`,
      line: simLine,
      unitsProduced: 0,
      status: 'Failed',
      timestamp: Date.now(),
      targetUnits: currentSimProduct.nominalBatchWeightKg
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

  // Clear batch logs
  const handleClearAllLogs = () => {
    if (window.confirm("CONFIRMATION REQUIRED: Clear all production histories on file?")) {
      setLogs([]);
    }
  };

  // Delete product formula
  const handleDeleteProduct = (pId: string) => {
    if (window.confirm(`CONFIRM: Delete mixture recipe ${pId}?`)) {
      setProducts(prev => prev.filter(p => p.id !== pId));
    }
  };

  // Save new or modified product mixture
  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProductId || !newProductName || !newProductEnglishName) {
      alert("Failure: Fields marked MANDATORY must be filled.");
      return;
    }

    const newItem: Product = {
      id: newProductId.toUpperCase().trim(),
      name: newProductName.trim(),
      englishName: newProductEnglishName.trim(),
      targetUph: newProductTargetUph,
      colorHex: newProductColor,
      nominalBatchWeightKg: newProductNominalWeight,
      isActive: true,
      manualFileName: newProductManual.trim() || undefined
    };

    if (editingProduct) {
      setProducts(prev => prev.map(p => p.id === editingProduct.id ? newItem : p));
      setEditingProduct(null);
    } else {
      if (products.some(p => p.id.toUpperCase() === newProductId.toUpperCase().trim())) {
        alert("Failed: Mixture code ID already registered in SQLite master table.");
        return;
      }
      setProducts(prev => [...prev, newItem]);
    }

    // Reset fields
    setNewProductId('');
    setNewProductName('');
    setNewProductEnglishName('');
    setNewProductTargetUph(1000);
    setNewProductColor('#00F0FF');
    setNewProductNominalWeight(600);
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
    setNewProductNominalWeight(p.nominalBatchWeightKg);
    setNewProductManual(p.manualFileName || '');
    setShowAddProductModal(true);
  };

  // Copy sample code helper
  const triggerCopyCode = (text: string, identifier: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(identifier);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  // Analytical Metrics Computations
  const totalSuccessBatches = logs.filter(l => l.status === 'Success').length;
  const successRatio = logs.length > 0 ? Math.round((totalSuccessBatches / logs.length) * 100) : 100;
  const totalUnits = logs.reduce((sum, l) => sum + (l?.unitsProduced || 0), 0);
  const activeWorkerName = activeShift?.workerId || "Offline";

  // Filter logs list
  const filteredLogs = logs.filter(l => {
    if (!l) return false;
    const batchId = l.batchId || '';
    const nameEng = l.productNameEnglish || '';
    const nameHin = l.productNameHindi || '';
    const searchMatch = batchId.toLowerCase().includes(searchLog.toLowerCase()) || 
                        nameEng.toLowerCase().includes(searchLog.toLowerCase()) ||
                        nameHin.toLowerCase().includes(searchLog.toLowerCase());
    const lineMatch = lineFilter === 'ALL' || l.line === lineFilter;
    return searchMatch && lineMatch;
  });

  // Filter ledger list
  const filteredLedger = ledgerHistory.filter(e => {
    if (!e) return false;
    const itemTypeMatch = ledgerItemTypeFilter === 'ALL' || e.itemType === ledgerItemTypeFilter;
    const searchMatch = e.itemName.toLowerCase().includes(ledgerSearch.toLowerCase()) ||
                        e.description.toLowerCase().includes(ledgerSearch.toLowerCase()) ||
                        e.transactionType.toLowerCase().includes(ledgerSearch.toLowerCase());
    return itemTypeMatch && searchMatch;
  });

  // Interactive Live Demultiplication calculation preview
  const previewProduct = products.find(p => p.id === jobProductKey) || products[0] || INITIAL_PRODUCTS[0];
  const previewBatchesCount = Math.ceil((jobDemandTons * 1000) / previewProduct.nominalBatchWeightKg);
  const previewExcessYield = (previewBatchesCount * previewProduct.nominalBatchWeightKg) - (jobDemandTons * 1000);

  return (
    <div className="min-h-screen bg-[#0F1115] text-[#D1D4DC] flex flex-col font-sans selection:bg-[#00F0FF] selection:text-black">
      {/* 1. STRUCTURAL ENTERPRISE HEADER */}
      <header className="border-b-2 border-industrial-border bg-[#0B0D10] text-[#E2E8F0] py-4 px-6 sticky top-0 z-50 shadow-lg select-none">
        <div className="max-w-[1500px] mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          {/* Logo Brand */}
          <div className="flex items-center gap-3">
            <div className="p-2 border border-industrial-accent bg-industrial-accent/10 rounded">
              <Cpu className="h-6 w-6 text-industrial-accent animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs bg-industrial-accent/20 text-industrial-accent px-2 py-0.5 rounded font-mono font-bold tracking-widest uppercase">
                  Companion Console
                </span>
                <span className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded font-mono">v1.5-Spec</span>
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

            {/* Socket Server Status */}
            <div className="flex items-center gap-2 bg-[#141822] border border-industrial-border px-3 py-1.5 rounded">
              <Wifi className={`w-4 h-4 ${emergencyStatus ? 'text-industrial-danger animate-ping' : 'text-industrial-success animate-pulse'}`} />
              <span>ROOM-DB CONNECTION:</span>
              <span className={`font-bold ${emergencyStatus ? 'text-industrial-danger glow-text-red' : 'text-industrial-success glow-text-success'}`}>
                {emergencyStatus ? 'SHUTDOWN ACTIVE' : 'SECURE READY'}
              </span>
            </div>

            {/* Operator Tag */}
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
          {/* Toggles */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`px-4 py-2 text-sm font-mono font-semibold uppercase tracking-wider border transition-all ${
                activeTab === 'dashboard'
                  ? 'bg-industrial-accent text-black border-industrial-accent font-bold shadow-md shadow-industrial-accent/20'
                  : 'bg-[#161920] text-gray-400 border-industrial-border hover:text-white hover:border-gray-500'
              }`}
            >
              📟 Live Operations
            </button>
            <button
              onClick={() => setActiveTab('jobs')}
              className={`px-4 py-2 text-sm font-mono font-semibold uppercase tracking-wider border transition-all ${
                activeTab === 'jobs'
                  ? 'bg-industrial-accent text-black border-industrial-accent font-bold shadow-md shadow-industrial-accent/20'
                  : 'bg-[#161920] text-gray-400 border-industrial-border hover:text-white hover:border-gray-500'
              }`}
            >
              🥞 Jobs Engine ({jobs.filter(j => j.status !== 'COMPLETED').length} Active)
            </button>
            <button
              onClick={() => setActiveTab('inventory')}
              className={`px-4 py-2 text-sm font-mono font-semibold uppercase tracking-wider border transition-all ${
                activeTab === 'inventory'
                  ? 'bg-industrial-accent text-black border-industrial-accent font-bold shadow-md shadow-industrial-accent/20'
                  : 'bg-[#161920] text-gray-400 border-industrial-border hover:text-white hover:border-gray-500'
              }`}
            >
              ⚖️ Inventory Ledgers
            </button>
            <button
              onClick={() => setActiveTab('products')}
              className={`px-4 py-2 text-sm font-mono font-semibold uppercase tracking-wider border transition-all ${
                activeTab === 'products'
                  ? 'bg-industrial-accent text-black border-industrial-accent font-bold shadow-md shadow-industrial-accent/20'
                  : 'bg-[#161920] text-gray-400 border-industrial-border hover:text-white hover:border-gray-500'
              }`}
            >
              🧪 Recipes ({products.length})
            </button>
            <button
              onClick={() => setActiveTab('logs')}
              className={`px-4 py-2 text-sm font-mono font-semibold uppercase tracking-wider border transition-all ${
                activeTab === 'logs'
                  ? 'bg-industrial-accent text-black border-industrial-accent font-bold shadow-md shadow-industrial-accent/20'
                  : 'bg-[#161920] text-gray-400 border-industrial-border hover:text-white hover:border-gray-500'
              }`}
            >
              📜 Log Vaults
            </button>
            <button
              onClick={() => setActiveTab('link-integration')}
              className={`px-4 py-2 text-sm font-mono font-semibold uppercase tracking-wider border transition-all ${
                activeTab === 'link-integration'
                  ? 'bg-[#10B981] text-black border-[#10B981] font-bold shadow-md shadow-emerald-500/20'
                  : 'bg-[#161920] text-gray-400 border-industrial-border hover:text-white hover:border-gray-500'
              }`}
            >
              🔌 Mappings
            </button>
          </div>

          {/* Quick Stats Summary badges */}
          <div className="flex items-center gap-3 text-xs font-mono">
            <span className="text-gray-500">QUICK COMPLIANCE:</span>
            <span className="bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30 px-2 py-1 rounded">
              SUCCESS RATE: {successRatio}%
            </span>
            <span className="bg-[#FF6B00]/15 text-[#FF6B00] border border-[#FF6B00]/30 px-2 py-1 rounded">
              TOTAL BATCH OUTPUT: {totalUnits.toLocaleString()} kg
            </span>
          </div>
        </div>

        {/* 3. ACTIVE SCENE VIEWPORTS */}
        
        {/* TAB 1: LIVE CONTROL TERMINAL */}
        {activeTab === 'dashboard' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* COLUMN 1: LIVE HARDWARE SIMULATOR */}
            <div className="lg:col-span-2 flex flex-col gap-6">
              
              <div className="bg-industrial-card border-2 border-industrial-border text-[#D1D4DC] overflow-hidden shadow-lg flex flex-col relative">
                <div className="bg-[#0B0D10] border-b-2 border-industrial-border p-4 flex justify-between items-center flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-3.5 w-3.5">
                      <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${isSimulatorRunning && !emergencyStatus ? 'bg-industrial-accent' : 'bg-industrial-danger'} opacity-75`}></span>
                      <span className={`relative inline-flex rounded-full h-3.5 w-3.5 ${isSimulatorRunning && !emergencyStatus ? 'bg-industrial-accent' : 'bg-industrial-danger'}`}></span>
                    </span>
                    <h2 className="text-lg font-black tracking-tight text-white uppercase font-display flex items-center gap-2">
                      <Activity className="w-5 h-5 text-industrial-accent" />
                      {activeJob ? `RUNNING JOB: ${activeJob.jobId}` : 'MOCK EXTRUDER FLOW FEEDBACK'}
                    </h2>
                  </div>
                  
                  <div className="flex items-center gap-2 font-mono text-xs text-gray-400">
                    <span>LINE LOCK:</span>
                    <span className="bg-[#1F2533] px-2.5 py-1 rounded border border-gray-800 text-white font-bold">{simLine}</span>
                  </div>
                </div>

                <div className="p-6 flex-1 flex flex-col gap-6 bg-[#11141B]">
                  
                  {activeJob && (
                    <div className="bg-industrial-accent/5 border border-industrial-accent/25 p-4 rounded flex items-center justify-between flex-wrap gap-4 font-mono text-xs">
                      <div>
                        <span className="text-gray-400 block">ACTIVE PRODUCTION RUN:</span>
                        <span className="text-white font-bold block text-sm">{currentSimProduct.englishName} ({currentSimProduct.name})</span>
                      </div>
                      <div className="flex-1 max-w-[280px]">
                        <div className="flex justify-between mb-1">
                          <span>BATCH PROGRESS:</span>
                          <span className="text-industrial-accent font-bold">{activeJob.batchesCompleted} / {activeJob.totalBatchesScheduled} done</span>
                        </div>
                        <div className="w-full bg-gray-900 h-2.5 rounded overflow-hidden border border-gray-850">
                          <div 
                            className="bg-industrial-accent h-full transition-all duration-300" 
                            style={{ width: `${(activeJob.batchesCompleted / activeJob.totalBatchesScheduled) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                      <div>
                        <span className="text-gray-400 block">NOMINAL WEIGHT:</span>
                        <span className="text-industrial-accent font-bold">{currentSimProduct.nominalBatchWeightKg} kg / batch</span>
                      </div>
                    </div>
                  )}

                  {/* Gauge Display & Telemetry Indicator */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                    
                    {/* Glowing Digital Dashboard Counter */}
                    <div className="bg-[#0B0D10] border border-industrial-border p-6 rounded relative overflow-hidden flex flex-col justify-center items-center h-48">
                      <div className="absolute top-2 left-3 text-[10px] font-mono text-gray-500 uppercase tracking-widest">
                        FEEDBACK CHILLER / NOMINAL FLOW DISCHARGE (kg)
                      </div>
                      <div className="absolute top-2 right-3">
                        <Terminal className="text-industrial-accent/40 w-4.5 h-4.5" />
                      </div>

                      {/* Giant Number Ticker */}
                      <span className={`text-4xl md:text-5xl font-black font-mono tracking-wider ${emergencyStatus ? 'text-industrial-danger glow-text-red' : 'text-industrial-accent glow-text-cyan'}`}>
                        {activeShift ? `${simulatedUnits.toFixed(1)} kg` : "OFFLINE"}
                      </span>
                      
                      <div className="mt-3 flex items-center gap-2">
                        <span className="text-xs text-gray-400 font-mono">NOMINAL TARGET:</span>
                        <span className="text-xs bg-industrial-accent/15 text-industrial-accent border border-industrial-accent/30 px-2 py-0.5 rounded font-mono font-bold">
                          {currentSimProduct.nominalBatchWeightKg} kg
                        </span>
                      </div>

                      <div className="mt-2 w-full bg-gray-900 h-2 rounded overflow-hidden max-w-[80%] border border-gray-850">
                        <div 
                          className={`h-full transition-all duration-300 ${emergencyStatus ? 'bg-industrial-danger' : 'bg-industrial-accent'}`} 
                          style={{ width: `${Math.min(100, (simulatedUnits / currentSimProduct.nominalBatchWeightKg) * 100)}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Simulation parameters panel */}
                    <div className="flex flex-col gap-4 text-sm font-mono">
                      <div className="bg-[#1D212B] p-4 border border-industrial-border rounded flex flex-col gap-3">
                        <h4 className="text-xs font-bold tracking-widest text-[#FF6B00] uppercase">BATCH SPECIFICATION</h4>
                        
                        {/* Selector Product (Disabled if active job dictates production) */}
                        <div>
                          <label className="text-[10px] text-gray-400 block mb-1">SELECTED RECIPE (FORMULA):</label>
                          {activeJob ? (
                            <div className="bg-[#0B0D10] text-[#00F0FF] border border-industrial-accent/30 px-2.5 py-1.5 rounded text-xs font-bold flex items-center justify-between">
                              <span>{currentSimProduct.englishName} ({currentSimProduct.name})</span>
                              <span className="text-[10px] bg-industrial-accent/15 px-1.5 py-0.5 rounded uppercase font-bold">Job Locked</span>
                            </div>
                          ) : (
                            <select 
                              value={selectedSimProduct.id.toString()}
                              onChange={(e) => {
                                const found = products.find(p => p.id === e.target.value);
                                if (found) setSelectedSimProduct(found);
                              }}
                              className="bg-[#0B0D10] text-white border border-industrial-border px-2 py-1.5 rounded w-full text-xs focus:ring-1 focus:ring-industrial-accent outline-none"
                              disabled={!activeShift || emergencyStatus}
                            >
                              {products.map(p => (
                                <option key={p.id.toString()} value={p.id.toString()}>
                                  {p.englishName} ({p.name}) [{p.nominalBatchWeightKg} kg]
                                </option>
                              ))}
                            </select>
                          )}
                        </div>

                        {/* Nominal Ratios indicators */}
                        <div>
                          <label className="text-[10px] text-gray-400 block mb-1">NOMINAL RECIPE BOM BREAKDOWN:</label>
                          <div className="grid grid-cols-3 gap-2 text-[10px] text-center">
                            <div className="bg-[#0B0D10] p-1.5 rounded border border-gray-800">
                              <span className="text-gray-500 block">MAIZE</span>
                              <span className="text-white font-bold">{(BOM_RECIPES[currentSimProduct.id.toString()]?.maizeRatio * 100 || 50)}%</span>
                            </div>
                            <div className="bg-[#0B0D10] p-1.5 rounded border border-gray-800">
                              <span className="text-gray-500 block">RICE BRAN</span>
                              <span className="text-white font-bold">{(BOM_RECIPES[currentSimProduct.id.toString()]?.riceBranRatio * 100 || 30)}%</span>
                            </div>
                            <div className="bg-[#0B0D10] p-1.5 rounded border border-gray-800">
                              <span className="text-gray-500 block">SOY MEAL</span>
                              <span className="text-white font-bold">{(BOM_RECIPES[currentSimProduct.id.toString()]?.soyMealRatio * 100 || 20)}%</span>
                            </div>
                          </div>
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
                        {isSimulatorRunning && !emergencyStatus ? '⏸ Pause Flow' : '▶ Resume Flow'}
                      </button>

                      <button
                        onClick={() => {
                          if (activeShift) {
                            setSimulatedUnits(prev => Math.min(currentSimProduct.nominalBatchWeightKg, prev + 100));
                          }
                        }}
                        className="bg-[#212735] hover:bg-[#2C3345] transition-all px-3 py-2 rounded text-xs font-mono text-white"
                        disabled={!activeShift || emergencyStatus}
                        title="Force 100 kg material output"
                      >
                        ⚡ Simulate Flow +100 kg
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => handleSimBatchSubmit('Success')}
                        className="bg-industrial-success hover:bg-emerald-600 transition px-4 py-2 rounded text-xs text-black font-bold font-mono tracking-wide"
                        disabled={!activeShift || emergencyStatus}
                      >
                        ✔️ Force Complete Batch
                      </button>

                      <button
                        onClick={() => {
                          const cause = prompt("Enter emergency stop issue description:", "Extruder Overpressure");
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
                      <p className="text-xs text-gray-400 mt-1 max-w-[380px] leading-relaxed font-mono">
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

                <div className="w-full h-48 bg-[#0B0D10] border border-industrial-border rounded relative flex items-center justify-center p-2 overscroll-none">
                  {logs.length === 0 ? (
                    <div className="text-center p-4">
                      <FolderPlaceholder />
                      <p className="text-xs text-gray-500 font-mono mt-1">EMPTY HISTORY DATA STREAM: Log mock batches above to populate chart.</p>
                    </div>
                  ) : (
                    <div className="w-full h-full flex flex-col justify-between">
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
                            </g>
                          );
                        })}
                      </svg>

                      <div className="flex justify-between items-center text-[10px] text-gray-500 font-mono mt-1 border-t border-gray-900 pt-1">
                        <span>CHRONOLOGICAL STREAM (RIGHT IS OLDER)</span>
                        <div className="flex gap-3">
                          <div className="flex items-center gap-1">
                            <span className="w-2 h-2 bg-industrial-success rounded-full"></span>
                            <span>Success Run</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="w-2 h-2 bg-industrial-danger rounded-full"></span>
                            <span>Failed Shutdown</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* COLUMN 2: ACTIVE SHIFT & INTEGRATIONS */}
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

              {/* TALLY DISPATCH TRUCK SIMULATOR */}
              <div className="bg-industrial-card border-2 border-industrial-border p-6 rounded flex flex-col gap-4 shadow-lg">
                <h3 className="text-base font-black tracking-tight text-white uppercase font-display flex items-center gap-2">
                  <Truck className="h-5 w-5 text-industrial-accent" />
                  TALLY DISPATCH MOCK
                </h3>
                <p className="text-xs text-gray-400 font-mono">
                  Simulates a truck dispatch event from Tally ERP, deducting finished goods inventory.
                </p>

                <form onSubmit={handleSimulateDispatch} className="flex flex-col gap-3 font-mono text-xs">
                  <div>
                    <label className="text-[10px] text-gray-500 block mb-1">PRODUCT TYPE:</label>
                    <select
                      value={dispatchProductKey}
                      onChange={(e) => setDispatchProductKey(e.target.value)}
                      className="bg-[#0B0D10] text-[#E2E8F0] border border-industrial-border rounded p-2 w-full focus:border-industrial-accent outline-none"
                    >
                      {products.map(p => (
                        <option key={p.id.toString()} value={p.id.toString()}>
                          {p.englishName} ({p.name})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] text-gray-500 block mb-1">DISPATCH VOLUME (TONS):</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0.1"
                      value={dispatchTons}
                      onChange={(e) => setDispatchTons(parseFloat(e.target.value) || 0)}
                      className="bg-[#0B0D10] text-[#E2E8F0] border border-industrial-border rounded p-2 w-full focus:border-industrial-accent outline-none"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-[#FF6B00] text-black hover:bg-orange-500 transition py-2 rounded font-bold uppercase tracking-wider"
                  >
                    🚛 SIMULATE DISPATCH SHIPMENT
                  </button>
                </form>
              </div>

              {/* ADMIN SYSTEM PREFERENCE / CORE ACTIONS */}
              <div className="bg-industrial-card border-2 border-industrial-border p-6 rounded flex flex-col gap-4 shadow-lg">
                <h3 className="text-base font-black tracking-tight text-white uppercase font-display flex items-center gap-2">
                  <Settings className="h-5 w-5 text-industrial-accent" />
                  ADMIN CORE RUN COMMANDS
                </h3>

                <div className="flex flex-col gap-3 font-mono">
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

                  <button
                    onClick={() => {
                      if (window.confirm("CONFIRMATION: Reset database variables and stocks to default setups?")) {
                        setProducts(INITIAL_PRODUCTS);
                        setLogs(INITIAL_LOGS);
                        setJobs([
                          { jobId: "JOB-101", productKey: "PRD-001", totalBatchesScheduled: 14, batchesCompleted: 14, status: "COMPLETED", targetDemandTons: 8, excessYieldKg: 400, timestamp: Date.now() - 24 * 3600000 },
                          { jobId: "JOB-102", productKey: "PRD-002", totalBatchesScheduled: 5, batchesCompleted: 2, status: "ACTIVE", targetDemandTons: 5, excessYieldKg: 0, timestamp: Date.now() - 3 * 3600000 }
                        ]);
                        setRawMaizeStock(45000);
                        setRawRiceBranStock(28000);
                        setRawSoyMealStock(18500);
                        setFinishedStock({ "PRD-001": 12000, "PRD-002": 8500, "PRD-003": 4000 });
                        setLedgerHistory([
                          { entryId: "L-101", timestamp: Date.now() - 5 * 3600000, itemType: "RAW_MATERIAL", itemName: "Maize", transactionType: "ARRIVAL", quantityKg: 20000, description: "Bulk arrival from supplier (Receipt #R-892)" },
                          { entryId: "L-102", timestamp: Date.now() - 3 * 3600000, itemType: "RAW_MATERIAL", itemName: "Soy Meal", transactionType: "ARRIVAL", quantityKg: 10000, description: "Supplier delivery (Receipt #R-893)" },
                          { entryId: "L-103", timestamp: Date.now() - 2 * 3600000, itemType: "FINISHED_GOOD", itemName: "Cream Special", transactionType: "DEDUCTION_DISPATCH", quantityKg: -6000, description: "Dispatch Truck MH-12-Q-4530 (Tally invoice #INV-779)" },
                          { entryId: "L-104", timestamp: Date.now() - 1 * 3600000, itemType: "FINISHED_GOOD", itemName: "Premium Plus", transactionType: "DEDUCTION_DISPATCH", quantityKg: -4000, description: "Dispatch Truck KA-03-F-1209 (Tally invoice #INV-780)" }
                        ]);
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
                </div>
              </div>

            </div>

          </div>
        )}

        {/* TAB 2: JOBS ENGINE */}
        {activeTab === 'jobs' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* COLUMN 1: BATCH DEMULTIPLICATION ENGINE */}
            <div className="lg:col-span-1 bg-industrial-card border-2 border-industrial-border p-6 rounded shadow-lg flex flex-col gap-4">
              <div>
                <h3 className="text-base font-black tracking-tight text-white uppercase font-display flex items-center gap-2">
                  <Scale className="h-5 w-5 text-industrial-accent" />
                  BATCH DEMULTIPLICATION ENGINE
                </h3>
                <p className="text-xs text-gray-400 font-mono mt-0.5">
                  Converts aggregate order demands in Tons into discrete shop floor batch cycles.
                </p>
              </div>

              <form onSubmit={handleCreateJob} className="flex flex-col gap-4 font-mono text-xs">
                <div className="flex flex-col gap-1.5">
                  <label className="text-gray-400">PRODUCT FORMULA:</label>
                  <select
                    value={jobProductKey}
                    onChange={(e) => setJobProductKey(e.target.value)}
                    className="bg-[#0B0D10] text-[#E2E8F0] border border-industrial-border rounded p-2 w-full focus:border-industrial-accent outline-none font-mono"
                  >
                    {products.map(p => (
                      <option key={p.id.toString()} value={p.id.toString()}>
                        {p.englishName} ({p.name}) [Nominal Weight: {p.nominalBatchWeightKg} kg]
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-gray-400">TARGET DEMAND (TONS):</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    value={jobDemandTons}
                    onChange={(e) => setJobDemandTons(parseFloat(e.target.value) || 0)}
                    className="bg-[#0B0D10] text-[#E2E8F0] border border-industrial-border rounded p-2 w-full focus:border-industrial-accent outline-none font-mono"
                  />
                </div>

                {/* Calculation Live Preview Card */}
                <div className="bg-[#0B0D10] p-4 rounded border border-industrial-border flex flex-col gap-2 font-mono text-xs">
                  <span className="text-[#FF6B00] font-bold block mb-1">📊 DEMULTIPLICATION PREVIEW:</span>
                  <div className="flex justify-between border-b border-gray-900 py-1">
                    <span>Target Mass:</span>
                    <span className="text-white">{(jobDemandTons * 1000).toLocaleString()} kg ({jobDemandTons} Tons)</span>
                  </div>
                  <div className="flex justify-between border-b border-gray-900 py-1">
                    <span>Nominal Weight:</span>
                    <span className="text-white">{previewProduct.nominalBatchWeightKg} kg / batch</span>
                  </div>
                  <div className="flex justify-between border-b border-gray-900 py-1">
                    <span>Total Batches:</span>
                    <span className="text-industrial-accent font-bold">{previewBatchesCount} Batches</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span>Flagged Excess:</span>
                    <span className={`font-bold ${previewExcessYield > 0 ? 'text-yellow-500' : 'text-gray-400'}`}>
                      {previewExcessYield} kg ({((previewBatchesCount * previewProduct.nominalBatchWeightKg) / 1000).toFixed(2)} Tons yield)
                    </span>
                  </div>
                </div>

                <button
                  type="submit"
                  className="bg-industrial-accent hover:bg-cyan-500 text-black font-bold py-2 rounded transition uppercase tracking-widest text-xs mt-2"
                >
                  🚀 SCHEDULE & DEPLOY PRODUCTION JOB
                </button>
              </form>
            </div>

            {/* COLUMN 2: JOBS QUEUE DASHBOARD */}
            <div className="lg:col-span-2 bg-industrial-card border-2 border-industrial-border p-6 rounded shadow-lg flex flex-col gap-4">
              <div>
                <h3 className="text-base font-black tracking-tight text-white uppercase font-display flex items-center gap-2">
                  <Layers className="h-5 w-5 text-industrial-accent" />
                  PRODUCTION JOBS QUEUE
                </h3>
                <p className="text-xs text-gray-400 font-mono mt-0.5">
                  Monitor active and pending manufacturing runs on the shop floor.
                </p>
              </div>

              {jobs.length === 0 ? (
                <div className="text-center p-8 bg-[#0B0D10] border border-industrial-border rounded-md">
                  <FolderPlaceholder />
                  <p className="text-xs text-gray-500 font-mono mt-2">NO JOBS SCHEDULED: Use the demultiplication engine to schedule runs.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-4 max-h-[480px] overflow-y-auto">
                  {jobs.map((j) => {
                    const prod = products.find(p => p.id === j.productKey) || INITIAL_PRODUCTS[0];
                    return (
                      <div 
                        key={j.jobId}
                        className={`border rounded p-4 font-mono text-xs transition-all relative ${
                          j.status === 'ACTIVE' 
                            ? 'bg-industrial-accent/5 border-industrial-accent shadow-md' 
                            : j.status === 'COMPLETED'
                              ? 'bg-gray-950/20 border-gray-800 opacity-60'
                              : 'bg-[#12151D] border-industrial-border'
                        }`}
                      >
                        {/* Job status header */}
                        <div className="flex justify-between items-center flex-wrap gap-2 mb-3">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-white">{j.jobId}</span>
                            <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                              j.status === 'ACTIVE'
                                ? 'bg-industrial-accent/15 text-industrial-accent border border-industrial-accent/35'
                                : j.status === 'COMPLETED'
                                  ? 'bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/35'
                                  : 'bg-yellow-500/15 text-yellow-500 border border-yellow-500/35'
                            }`}>
                              {j.status}
                            </span>
                          </div>
                          <span className="text-gray-500">{new Date(j.timestamp).toLocaleString()}</span>
                        </div>

                        {/* Details grid */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3 border-b border-gray-900 pb-3">
                          <div>
                            <span className="text-gray-500 block">PRODUCT:</span>
                            <span className="text-white font-semibold">{prod.englishName}</span>
                          </div>
                          <div>
                            <span className="text-gray-500 block">DEMAND TARGET:</span>
                            <span className="text-white">{j.targetDemandTons} Tons ({(j.targetDemandTons*1000).toLocaleString()} kg)</span>
                          </div>
                          <div>
                            <span className="text-gray-500 block">NOMINAL WEIGHT:</span>
                            <span className="text-white">{prod.nominalBatchWeightKg} kg / batch</span>
                          </div>
                          <div>
                            <span className="text-gray-500 block">EXCESS YIELD:</span>
                            <span className="text-yellow-500 font-bold">{j.excessYieldKg} kg</span>
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex justify-between text-[11px] mb-1">
                              <span>BATCHES COMPLETED:</span>
                              <span className="text-white font-bold">{j.batchesCompleted} / {j.totalBatchesScheduled}</span>
                            </div>
                            <div className="w-full bg-gray-900 h-2.5 rounded overflow-hidden border border-gray-850">
                              <div 
                                className={`h-full transition-all duration-300 ${
                                  j.status === 'ACTIVE'
                                    ? 'bg-industrial-accent'
                                    : j.status === 'COMPLETED'
                                      ? 'bg-industrial-success'
                                      : 'bg-yellow-500'
                                }`} 
                                style={{ width: `${(j.batchesCompleted / j.totalBatchesScheduled) * 100}%` }}
                              ></div>
                            </div>
                          </div>

                          {/* Control Action Links */}
                          <div className="flex gap-2">
                            {j.status === 'PENDING' && (
                              <button
                                onClick={() => handleToggleJobState(j.jobId, 'ACTIVATE')}
                                className="bg-industrial-accent text-black font-bold px-3 py-1.5 rounded hover:bg-cyan-500 transition text-[10px]"
                              >
                                ACTIVATE
                              </button>
                            )}
                            {j.status === 'ACTIVE' && (
                              <button
                                onClick={() => handleToggleJobState(j.jobId, 'PAUSE')}
                                className="bg-yellow-500 text-black font-bold px-3 py-1.5 rounded hover:bg-yellow-600 transition text-[10px]"
                              >
                                PAUSE
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteJob(j.jobId)}
                              className="bg-gray-800 hover:bg-industrial-danger hover:text-white text-gray-400 p-1.5 rounded transition"
                              title="Delete Job"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: INVENTORY LEDGER & MONTHLY NULLIFICATION */}
        {activeTab === 'inventory' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* COLUMN 1: CURRENT RAW STOCK SILOS & GAUGE CARDS */}
            <div className="lg:col-span-2 flex flex-col gap-6">
              
              {/* RAW SILO STOCKS */}
              <div className="bg-industrial-card border-2 border-industrial-border p-6 rounded shadow-lg flex flex-col gap-4">
                <h3 className="text-base font-black tracking-tight text-white uppercase font-display flex items-center gap-2">
                  <Database className="h-5 w-5 text-industrial-accent" />
                  RAW INGREDIENT SILOS STOCK
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 font-mono text-xs">
                  {/* Maize card */}
                  <div className="bg-[#111319] p-4 border border-industrial-border rounded-md flex flex-col gap-2 relative">
                    <span className="text-gray-400 font-bold block">1. CORN MAIZE SILO</span>
                    <span className="text-2xl font-black text-white glow-text-cyan">{(rawMaizeStock/1000).toFixed(2)} T</span>
                    <span className="text-[10px] text-gray-500">Total: {rawMaizeStock.toLocaleString()} kg</span>
                    <div className="mt-2 w-full bg-gray-900 h-2 rounded overflow-hidden border border-gray-850">
                      <div className="bg-[#00F0FF] h-full" style={{ width: `${Math.min(100, (rawMaizeStock / 100000) * 100)}%` }}></div>
                    </div>
                    <span className="text-[9px] text-gray-500 text-right mt-0.5">Capacity: 100 Tons</span>
                  </div>

                  {/* Rice bran card */}
                  <div className="bg-[#111319] p-4 border border-industrial-border rounded-md flex flex-col gap-2 relative">
                    <span className="text-gray-400 font-bold block">2. DE-OILED RICE BRAN</span>
                    <span className="text-2xl font-black text-white glow-text-orange">{(rawRiceBranStock/1000).toFixed(2)} T</span>
                    <span className="text-[10px] text-gray-500">Total: {rawRiceBranStock.toLocaleString()} kg</span>
                    <div className="mt-2 w-full bg-gray-900 h-2 rounded overflow-hidden border border-gray-850">
                      <div className="bg-[#FF6B00] h-full" style={{ width: `${Math.min(100, (rawRiceBranStock / 60000) * 100)}%` }}></div>
                    </div>
                    <span className="text-[9px] text-gray-500 text-right mt-0.5">Capacity: 60 Tons</span>
                  </div>

                  {/* Soy meal card */}
                  <div className="bg-[#111319] p-4 border border-industrial-border rounded-md flex flex-col gap-2 relative">
                    <span className="text-gray-400 font-bold block">3. DE-OILED SOY MEAL</span>
                    <span className="text-2xl font-black text-white glow-text-success">{(rawSoyMealStock/1000).toFixed(2)} T</span>
                    <span className="text-[10px] text-gray-500">Total: {rawSoyMealStock.toLocaleString()} kg</span>
                    <div className="mt-2 w-full bg-gray-900 h-2 rounded overflow-hidden border border-gray-850">
                      <div className="bg-[#10B981] h-full" style={{ width: `${Math.min(100, (rawSoyMealStock / 40000) * 100)}%` }}></div>
                    </div>
                    <span className="text-[9px] text-gray-500 text-right mt-0.5">Capacity: 40 Tons</span>
                  </div>
                </div>
              </div>

              {/* FINISHED GOODS WAREHOUSE STOCK */}
              <div className="bg-industrial-card border-2 border-industrial-border p-6 rounded shadow-lg flex flex-col gap-4">
                <h3 className="text-base font-black tracking-tight text-white uppercase font-display flex items-center gap-2">
                  <Layers className="h-5 w-5 text-industrial-accent" />
                  FINISHED GOODS CATTLE FEED WAREHOUSE STOCK
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 font-mono text-xs">
                  {products.map(p => {
                    const currentStockKg = finishedStock[p.id.toString()] || 0;
                    return (
                      <div key={p.id.toString()} className="bg-[#111319] p-4 border border-industrial-border rounded-md flex flex-col gap-2 relative">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.colorHex }}></span>
                          <span className="text-gray-400 font-bold block uppercase">{p.englishName}</span>
                        </div>
                        <span className="text-2xl font-black text-white" style={{ textShadow: `0 0 8px ${p.colorHex}44` }}>
                          {(currentStockKg/1000).toFixed(2)} T
                        </span>
                        <span className="text-[10px] text-gray-500">Total: {currentStockKg.toLocaleString()} kg</span>
                        <span className="text-[9px] text-gray-400 mt-2">Nominal Pack: {p.nominalBatchWeightKg} kg / unit</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* MONTHLY STOCK OVERRIDE & NULLIFICATION TOOL */}
              <div className="bg-industrial-card border-2 border-industrial-border p-6 rounded shadow-lg flex flex-col gap-4">
                <div>
                  <h3 className="text-base font-black tracking-tight text-white uppercase font-display flex items-center gap-2">
                    <Scale className="h-5 w-5 text-industrial-accent" />
                    MONTHLY STOCK TAKE NULLIFICATION TOOL
                  </h3>
                  <p className="text-xs text-gray-400 font-mono mt-0.5">
                    Align stock database values with manual physical checks, logging positive/negative offset ledger balances.
                  </p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs font-mono">
                    <thead>
                      <tr className="border-b border-industrial-border bg-[#0B0D10] text-gray-400">
                        <th className="py-2.5 px-3">ITEM NAME</th>
                        <th className="py-2.5 px-3">ITEM TYPE</th>
                        <th className="py-2.5 px-3">THEORETICAL STOCK</th>
                        <th className="py-2.5 px-3">PHYSICAL COUNT (kg)</th>
                        <th className="py-2.5 px-3">COMPUTED OFFSET</th>
                        <th className="py-2.5 px-3 text-center">ACTION</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-900 bg-[#12151D]/40">
                      
                      {/* Maize */}
                      <tr className="hover:bg-gray-900/40">
                        <td className="py-3 px-3 font-bold text-white">Maize</td>
                        <td className="py-3 px-3 text-gray-400">RAW MATERIAL</td>
                        <td className="py-3 px-3 text-gray-300">{rawMaizeStock.toLocaleString()} kg</td>
                        <td className="py-2 px-3">
                          <input 
                            type="number"
                            placeholder="e.g. 46000"
                            value={nullifyPhysicalCounts['Maize'] || ''}
                            onChange={(e) => setNullifyPhysicalCounts(prev => ({ ...prev, 'Maize': e.target.value }))}
                            className="bg-[#0B0D10] text-white border border-gray-800 rounded px-2 py-1 w-28 focus:border-industrial-accent outline-none"
                          />
                        </td>
                        <td className="py-3 px-3">
                          {nullifyPhysicalCounts['Maize'] ? (
                            <span className={parseFloat(nullifyPhysicalCounts['Maize']) - rawMaizeStock >= 0 ? 'text-industrial-success font-bold' : 'text-industrial-danger font-bold'}>
                              {(parseFloat(nullifyPhysicalCounts['Maize']) - rawMaizeStock) >= 0 ? '+' : ''}
                              {(parseFloat(nullifyPhysicalCounts['Maize']) - rawMaizeStock).toLocaleString()} kg
                            </span>
                          ) : '--'}
                        </td>
                        <td className="py-2 px-3 text-center">
                          <button
                            onClick={() => handleTriggerNullification('Maize', null, false)}
                            className="bg-gray-800 hover:bg-industrial-accent hover:text-black transition px-2.5 py-1 rounded text-[10px] font-bold"
                          >
                            FORCE RESET
                          </button>
                        </td>
                      </tr>

                      {/* Rice Bran */}
                      <tr className="hover:bg-gray-900/40">
                        <td className="py-3 px-3 font-bold text-white">Rice Bran</td>
                        <td className="py-3 px-3 text-gray-400">RAW MATERIAL</td>
                        <td className="py-3 px-3 text-gray-300">{rawRiceBranStock.toLocaleString()} kg</td>
                        <td className="py-2 px-3">
                          <input 
                            type="number"
                            placeholder="e.g. 27500"
                            value={nullifyPhysicalCounts['Rice Bran'] || ''}
                            onChange={(e) => setNullifyPhysicalCounts(prev => ({ ...prev, 'Rice Bran': e.target.value }))}
                            className="bg-[#0B0D10] text-white border border-gray-800 rounded px-2 py-1 w-28 focus:border-industrial-accent outline-none"
                          />
                        </td>
                        <td className="py-3 px-3">
                          {nullifyPhysicalCounts['Rice Bran'] ? (
                            <span className={parseFloat(nullifyPhysicalCounts['Rice Bran']) - rawRiceBranStock >= 0 ? 'text-industrial-success font-bold' : 'text-industrial-danger font-bold'}>
                              {(parseFloat(nullifyPhysicalCounts['Rice Bran']) - rawRiceBranStock) >= 0 ? '+' : ''}
                              {(parseFloat(nullifyPhysicalCounts['Rice Bran']) - rawRiceBranStock).toLocaleString()} kg
                            </span>
                          ) : '--'}
                        </td>
                        <td className="py-2 px-3 text-center">
                          <button
                            onClick={() => handleTriggerNullification('Rice Bran', null, false)}
                            className="bg-gray-800 hover:bg-industrial-accent hover:text-black transition px-2.5 py-1 rounded text-[10px] font-bold"
                          >
                            FORCE RESET
                          </button>
                        </td>
                      </tr>

                      {/* Soy Meal */}
                      <tr className="hover:bg-gray-900/40">
                        <td className="py-3 px-3 font-bold text-white">Soy Meal</td>
                        <td className="py-3 px-3 text-gray-400">RAW MATERIAL</td>
                        <td className="py-3 px-3 text-gray-300">{rawSoyMealStock.toLocaleString()} kg</td>
                        <td className="py-2 px-3">
                          <input 
                            type="number"
                            placeholder="e.g. 19000"
                            value={nullifyPhysicalCounts['Soy Meal'] || ''}
                            onChange={(e) => setNullifyPhysicalCounts(prev => ({ ...prev, 'Soy Meal': e.target.value }))}
                            className="bg-[#0B0D10] text-white border border-gray-800 rounded px-2 py-1 w-28 focus:border-industrial-accent outline-none"
                          />
                        </td>
                        <td className="py-3 px-3">
                          {nullifyPhysicalCounts['Soy Meal'] ? (
                            <span className={parseFloat(nullifyPhysicalCounts['Soy Meal']) - rawSoyMealStock >= 0 ? 'text-industrial-success font-bold' : 'text-industrial-danger font-bold'}>
                              {(parseFloat(nullifyPhysicalCounts['Soy Meal']) - rawSoyMealStock) >= 0 ? '+' : ''}
                              {(parseFloat(nullifyPhysicalCounts['Soy Meal']) - rawSoyMealStock).toLocaleString()} kg
                            </span>
                          ) : '--'}
                        </td>
                        <td className="py-2 px-3 text-center">
                          <button
                            onClick={() => handleTriggerNullification('Soy Meal', null, false)}
                            className="bg-gray-800 hover:bg-industrial-accent hover:text-black transition px-2.5 py-1 rounded text-[10px] font-bold"
                          >
                            FORCE RESET
                          </button>
                        </td>
                      </tr>

                      {/* Finished Products */}
                      {products.map(p => {
                        const stockKg = finishedStock[p.id.toString()] || 0;
                        const key = p.id.toString();
                        return (
                          <tr key={key} className="hover:bg-gray-900/40 border-t border-gray-900">
                            <td className="py-3 px-3 font-bold text-white uppercase flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.colorHex }}></span>
                              {p.englishName}
                            </td>
                            <td className="py-3 px-3 text-gray-400">FINISHED GOOD</td>
                            <td className="py-3 px-3 text-gray-300">{stockKg.toLocaleString()} kg</td>
                            <td className="py-2 px-3">
                              <input 
                                type="number"
                                placeholder="e.g. 15000"
                                value={nullifyPhysicalCounts[key] || ''}
                                onChange={(e) => setNullifyPhysicalCounts(prev => ({ ...prev, [key]: e.target.value }))}
                                className="bg-[#0B0D10] text-white border border-gray-800 rounded px-2 py-1 w-28 focus:border-industrial-accent outline-none"
                              />
                            </td>
                            <td className="py-3 px-3">
                              {nullifyPhysicalCounts[key] ? (
                                <span className={parseFloat(nullifyPhysicalCounts[key]) - stockKg >= 0 ? 'text-industrial-success font-bold' : 'text-industrial-danger font-bold'}>
                                  {(parseFloat(nullifyPhysicalCounts[key]) - stockKg) >= 0 ? '+' : ''}
                                  {(parseFloat(nullifyPhysicalCounts[key]) - stockKg).toLocaleString()} kg
                                </span>
                              ) : '--'}
                            </td>
                            <td className="py-2 px-3 text-center">
                              <button
                                onClick={() => handleTriggerNullification(p.englishName, p.id.toString(), true)}
                                className="bg-gray-800 hover:bg-industrial-accent hover:text-black transition px-2.5 py-1 rounded text-[10px] font-bold"
                              >
                                FORCE RESET
                              </button>
                            </td>
                          </tr>
                        );
                      })}

                    </tbody>
                  </table>
                </div>
              </div>

            </div>

            {/* COLUMN 2: INVENTORY ACTIONS */}
            <div className="lg:col-span-1 flex flex-col gap-6">
              
              {/* RAW MATERIAL ARRIVAL FORM */}
              <div className="bg-industrial-card border-2 border-industrial-border p-6 rounded shadow-lg flex flex-col gap-4">
                <h3 className="text-base font-black tracking-tight text-white uppercase font-display flex items-center gap-2">
                  <ArrowDownToLine className="h-5 w-5 text-industrial-accent" />
                  LOG MATERIAL ARRIVAL
                </h3>
                <p className="text-xs text-gray-400 font-mono">
                  Record bulk supplier ingredient shipments arriving at plant storage bins.
                </p>

                <form onSubmit={handleLogArrival} className="flex flex-col gap-4 font-mono text-xs">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-gray-400">INGREDIENT SILO:</label>
                    <select
                      value={arrivalIngredient}
                      onChange={(e) => setArrivalIngredient(e.target.value as any)}
                      className="bg-[#0B0D10] text-[#E2E8F0] border border-industrial-border rounded p-2 focus:border-industrial-accent outline-none font-mono"
                    >
                      <option value="Maize">Corn Maize Silo</option>
                      <option value="Rice Bran">De-Oiled Rice Bran</option>
                      <option value="Soy Meal">De-Oiled Soy Meal</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-gray-400">VOLUME ARRIVED (TONS):</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0.1"
                      value={arrivalTons}
                      onChange={(e) => setArrivalTons(parseFloat(e.target.value) || 0)}
                      className="bg-[#0B0D10] text-[#E2E8F0] border border-industrial-border rounded p-2 w-full focus:border-industrial-accent outline-none font-mono"
                    />
                  </div>

                  <button
                    type="submit"
                    className="bg-industrial-accent hover:bg-cyan-500 text-black font-bold py-2 rounded transition uppercase tracking-widest text-xs mt-1"
                  >
                    💾 LOG SHIPMENT & ADD STOCK
                  </button>
                </form>
              </div>

            </div>

          </div>
        )}

        {/* TAB 4: PRODUCT MIXTURE FORMULAS CATALOG */}
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
                  setNewProductNominalWeight(600);
                  setNewProductManual("");
                  setShowAddProductModal(true);
                }}
                className="bg-industrial-accent hover:bg-cyan-400 text-black transition px-4 py-2 rounded text-xs font-mono font-bold tracking-wide flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" /> REGISTER NEW FORMULA
              </button>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 bg-[#11141B]">
              {products.map(p => (
                <div 
                  key={p.id.toString()} 
                  className="bg-[#12141C] border border-industrial-border rounded overflow-hidden flex flex-col relative"
                >
                  <div className="h-2 w-full" style={{ backgroundColor: p.colorHex }}></div>
                  
                  <div className="p-5 flex-1 flex flex-col gap-4 font-mono text-xs">
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <span className="text-[10px] text-gray-500 uppercase">Mixture ID</span>
                        <h3 className="text-base font-bold text-white tracking-wide">{p.id}</h3>
                      </div>
                      <span className="bg-gray-800 text-gray-400 px-2 py-0.5 rounded text-[10px]">Active</span>
                    </div>

                    <div className="flex flex-col gap-1">
                      <span className="text-gray-500 text-[10px] uppercase">Formulation Label</span>
                      <span className="text-sm font-bold text-white">{p.englishName}</span>
                      <span className="text-gray-300 text-xs font-display">{p.name} (Hindi Translate)</span>
                    </div>

                    <div className="bg-[#0B0D10] p-3 rounded border border-gray-850 flex flex-col gap-2 font-mono text-[11px]">
                      <div className="flex justify-between text-gray-400">
                        <span>NOMINAL WEIGHT:</span>
                        <span className="text-white font-bold">{p.nominalBatchWeightKg} kg</span>
                      </div>
                      <div className="flex justify-between text-gray-400">
                        <span>TARGET FREQ:</span>
                        <span className="text-white font-bold">{p.targetUph} UPH</span>
                      </div>
                      <div className="flex justify-between text-gray-400">
                        <span>SAFETY MANUAL:</span>
                        <span className="text-industrial-accent underline truncate max-w-[120px]" title={p.manualFileName || 'N/A'}>
                          {p.manualFileName || 'None Configured'}
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-2.5 mt-auto pt-2 border-t border-gray-900">
                      <button
                        onClick={() => handleStartEditProduct(p)}
                        className="flex-1 bg-gray-850 hover:bg-gray-850/80 text-gray-300 py-1.5 rounded transition flex items-center justify-center gap-1 border border-gray-700"
                      >
                        <Edit3 className="w-3.5 h-3.5" /> Edit Formula
                      </button>
                      <button
                        onClick={() => handleDeleteProduct(p.id.toString())}
                        className="bg-gray-850 hover:bg-industrial-danger hover:text-white text-gray-500 py-1.5 px-3 rounded transition border border-gray-700 hover:border-industrial-danger"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 5: LOG VAULT & INVENTORY LEDGER HISTORY */}
        {activeTab === 'logs' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* COLUMN 1: PRODUCTION BATCH LOG HISTORY */}
            <div className="lg:col-span-1 bg-industrial-card border-2 border-industrial-border rounded-lg overflow-hidden shadow-lg flex flex-col">
              <div className="bg-[#0B0D10] border-b-2 border-industrial-border p-4 flex flex-col gap-3">
                <h2 className="text-base font-black tracking-tight text-white uppercase font-display flex items-center gap-2">
                  <FileSpreadsheet className="text-industrial-accent h-5 w-5" />
                  BATCH TRANSACTION HISTORY
                </h2>
                
                {/* Search / filter inputs */}
                <div className="flex flex-col gap-2 font-mono text-xs">
                  <input
                    type="text"
                    placeholder="Search Batch ID or Product Name..."
                    value={searchLog}
                    onChange={(e) => setSearchLog(e.target.value)}
                    className="bg-[#12151D] text-white border border-gray-850 rounded px-2.5 py-1.5 focus:border-industrial-accent outline-none"
                  />
                  <select
                    value={lineFilter}
                    onChange={(e) => setLineFilter(e.target.value)}
                    className="bg-[#12151D] text-white border border-gray-850 rounded px-2 py-1.5 focus:border-industrial-accent outline-none"
                  >
                    <option value="ALL">All Operational Lines</option>
                    <option value="Line A">Line A (Manual Assembly)</option>
                    <option value="Line B">Line B (Auto Injection)</option>
                    <option value="Line C">Line C (Extrusion Sinter)</option>
                    <option value="CNC-04">CNC-04 Milling Node</option>
                  </select>
                </div>
              </div>

              {/* Batches Table List */}
              <div className="flex-1 bg-[#11141B] max-h-[500px] overflow-y-auto">
                {filteredLogs.length === 0 ? (
                  <div className="text-center p-8">
                    <FolderPlaceholder />
                    <p className="text-xs text-gray-500 font-mono mt-2">NO RECORDS LOCATED: Try clearing searches or seed database above.</p>
                  </div>
                ) : (
                  <div className="flex flex-col divide-y divide-gray-900 font-mono text-xs">
                    {filteredLogs.map(l => (
                      <div key={l.batchId} className="p-4 hover:bg-[#161A24] transition flex flex-col gap-2">
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-white">{l.batchId}</span>
                          <span className={`px-2 py-0.5 rounded font-bold text-[9px] uppercase ${
                            l.status === 'Success' 
                              ? 'bg-industrial-success/15 text-industrial-success border border-industrial-success/30' 
                              : 'bg-industrial-danger/15 text-industrial-danger border border-industrial-danger/30'
                          }`}>
                            {l.status}
                          </span>
                        </div>
                        <div className="flex justify-between text-gray-400 text-[10px]">
                          <span>RECIPE: {l.productNameEnglish}</span>
                          <span>{l.line}</span>
                        </div>
                        <div className="flex justify-between text-[11px] border-t border-gray-950 pt-1">
                          <span className="text-gray-300">OUTPUT: <strong className="text-white">{l.unitsProduced.toLocaleString()} kg</strong></span>
                          <span className="text-gray-500">{new Date(l.timestamp).toLocaleString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* COLUMN 2: INVENTORY LEDGER HISTORY (RAW + FINISHED GOODS) */}
            <div className="lg:col-span-2 bg-industrial-card border-2 border-industrial-border rounded-lg overflow-hidden shadow-lg flex flex-col">
              <div className="bg-[#0B0D10] border-b-2 border-industrial-border p-4 flex flex-col gap-3">
                <h2 className="text-base font-black tracking-tight text-white uppercase font-display flex items-center gap-2">
                  <Scale className="text-industrial-accent h-5 w-5" />
                  INVENTORY LEDGER REGISTRY
                </h2>
                
                {/* Search / filter inputs */}
                <div className="flex flex-col sm:flex-row gap-2 font-mono text-xs">
                  <input
                    type="text"
                    placeholder="Search ledger entries..."
                    value={ledgerSearch}
                    onChange={(e) => setLedgerSearch(e.target.value)}
                    className="bg-[#12151D] text-white border border-gray-850 rounded px-2.5 py-1.5 focus:border-industrial-accent outline-none flex-1"
                  />
                  <select
                    value={ledgerItemTypeFilter}
                    onChange={(e) => setLedgerItemTypeFilter(e.target.value as any)}
                    className="bg-[#12151D] text-white border border-gray-850 rounded px-2 py-1.5 focus:border-industrial-accent outline-none"
                  >
                    <option value="ALL">All Item Types</option>
                    <option value="RAW_MATERIAL">Raw Materials Only</option>
                    <option value="FINISHED_GOOD">Finished Goods Only</option>
                  </select>
                </div>
              </div>

              {/* Ledgers Table List */}
              <div className="flex-1 bg-[#11141B] max-h-[500px] overflow-y-auto">
                {filteredLedger.length === 0 ? (
                  <div className="text-center p-8">
                    <FolderPlaceholder />
                    <p className="text-xs text-gray-500 font-mono mt-2">NO LEDGER HISTORY: Stock transactions will appear here.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto w-full">
                    <table className="w-full text-left border-collapse text-xs font-mono">
                      <thead>
                        <tr className="border-b border-gray-900 bg-[#0B0D10]/50 text-gray-400">
                          <th className="py-2.5 px-3">DATE / TIME</th>
                          <th className="py-2.5 px-3">ITEM</th>
                          <th className="py-2.5 px-3">TYPE</th>
                          <th className="py-2.5 px-3">QTY (kg)</th>
                          <th className="py-2.5 px-3">DESCRIPTION</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-900/60">
                        {filteredLedger.map(e => (
                          <tr key={e.entryId} className="hover:bg-[#161A24] transition">
                            <td className="py-3 px-3 text-gray-400 whitespace-nowrap">{new Date(e.timestamp).toLocaleString()}</td>
                            <td className="py-3 px-3 font-bold text-white">{e.itemName}</td>
                            <td className="py-3 px-3">
                              <span className={`text-[10px] font-bold ${e.itemType === 'RAW_MATERIAL' ? 'text-yellow-500' : 'text-industrial-accent'}`}>
                                {e.itemType}
                              </span>
                            </td>
                            <td className="py-3 px-3">
                              <span className={`font-bold ${e.quantityKg >= 0 ? 'text-industrial-success' : 'text-industrial-danger'}`}>
                                {e.quantityKg >= 0 ? '+' : ''}
                                {e.quantityKg.toLocaleString()} kg
                              </span>
                            </td>
                            <td className="py-3 px-3 text-gray-300 max-w-[240px] truncate" title={e.description}>{e.description}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

          </div>
        )}

        {/* TAB 6: LINK CONNECTIONS PROTOCOLS */}
        {activeTab === 'link-integration' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 select-none">
            
            {/* COLUMN 1: KOTLIN SYNC CODE TEMPLATE */}
            <div className="bg-industrial-card border-2 border-industrial-border p-6 rounded flex flex-col gap-4 shadow-lg text-left">
              <div className="flex justify-between items-center flex-wrap gap-2">
                <h3 className="text-base font-black tracking-tight text-white uppercase font-display flex items-center gap-2">
                  <Link2 className="h-5 w-5 text-industrial-accent" />
                  KOTLIN KTOR DATA SYNCHRONIZATION TEMPLATE
                </h3>
                
                <button
                  onClick={() => triggerCopyCode(SAMPLE_KTOR_CODE, 'ktor')}
                  className="bg-gray-800 hover:bg-gray-700 transition px-3 py-1 rounded text-xs font-mono font-bold text-white"
                >
                  {copiedSection === 'ktor' ? '✔️ COPIED' : '📋 COPY KOTLIN CODE'}
                </button>
              </div>

              <p className="text-xs text-gray-400 font-mono leading-relaxed">
                Replicate this synchronization connector routine inside the Android mobile codebase. It dispatches local SQLite Room database records over REST HTTP Ktor calls during network restoration:
              </p>

              <div className="bg-[#0B0D10] border border-industrial-border rounded-md p-4 overflow-x-auto max-h-[380px] font-mono text-[10.5px] leading-relaxed text-[#00F0FF] select-text">
                <pre>{SAMPLE_KTOR_CODE}</pre>
              </div>
            </div>

            {/* COLUMN 2: SHARED ROOM SQL SCHEMAS */}
            <div className="flex flex-col gap-6">
              
              <div className="bg-industrial-card border-2 border-industrial-border p-6 rounded flex flex-col gap-4 shadow-lg">
                <h3 className="text-base font-black tracking-tight text-white uppercase font-display flex items-center gap-2">
                  <Database className="h-5 w-5 text-industrial-accent" />
                  SHARED SQL SCHEMAS
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

              {/* Nominal Batch Size (select dropdown: 600 or 1000) */}
              <div className="flex flex-col gap-1.5">
                <label className="text-gray-400 uppercase tracking-wide">NOMINAL BATCH WEIGHT (kg):</label>
                <select
                  value={newProductNominalWeight}
                  onChange={(e) => setNewProductNominalWeight(parseInt(e.target.value) || 600)}
                  className="bg-[#0B0D10] text-[#E2E8F0] border border-industrial-border rounded p-2 focus:border-industrial-accent outline-none font-mono"
                >
                  <option value={600}>600 kg</option>
                  <option value={1000}>1000 kg</option>
                </select>
              </div>

              {/* Color code field */}
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

      {/* FOOTER */}
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
