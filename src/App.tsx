import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  Database, 
  Terminal, 
  Clock, 
  Settings, 
  CheckCircle2, 
  XCircle, 
  Plus, 
  Trash2, 
  Edit3, 
  RefreshCw, 
  Copy, 
  Cpu, 
  AlertTriangle,
  BookOpen,
  Wifi,
  FileSpreadsheet,
  Link2,
  QrCode,
  ExternalLink,
  Play,
  Layers,
  UserCheck,
  GripVertical,
  Lock,
  Zap,
  Gauge,
  Wind,
  Check,
  ChevronRight,
  Star,
  MessageSquare,
  ClipboardCheck,
  ThumbsUp,
  CheckSquare,
  LogOut
} from 'lucide-react';
import { LoginPage, AuthUser } from './components/LoginPage';
import { UserManagement } from './components/UserManagement';

// Interfaces mirroring the Android Room schema
interface IngredientRatio {
  ingredientId: string;
  percentage: number;
  stage?: 'grinder' | 'mixer';
  requiresGrinding?: boolean;
  name?: string;
  hindiName?: string;
}

interface Product {
  id: string;
  name: string; // Hindi Name
  englishName: string; // English Name
  targetUph: number;
  colorHex: string;
  isActive: boolean;
  manualFileName?: string;
  ingredients?: IngredientRatio[];
  nominalBatchDurationSec?: number;
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
  stage?: 'grinder' | 'mixer';
  feedbackQuality?: string;
  feedbackTexture?: string;
  feedbackNotes?: string;
  feedbackRating?: number;
}

interface Order {
  id: string;
  recipeId: string;
  recipeName: string;
  recipeHindiName: string;
  unitsProduced: number;
  targetUnits: number;
  status: 'Pending' | 'In Progress' | 'Completed' | 'Failed';
  timestamp: number;
  updatedTimestamp?: number;
  notes?: string;
  line?: string;
}

interface InventoryItem {
  id: string;
  name: string;
  hindiName: string;
  type: 'raw_material' | 'finished_good';
  stock: number;
  unit: string;
  minStock: number;
  requiresGrinding?: boolean;
  stage?: 'grinder' | 'mixer';
}

// Initial Data mirroring IndustrialRepository.kt
const INITIAL_PRODUCTS: Product[] = [
  { 
    id: "PRD-001", 
    name: "क्रीम स्पेशल", 
    englishName: "Cream Special", 
    targetUph: 1200, 
    colorHex: "#00F0FF", 
    isActive: true, 
    manualFileName: "Cream_Special_Ops_v2.pdf",
    ingredients: [
      { ingredientId: "ING-006", percentage: 20, stage: 'grinder', requiresGrinding: true, name: "Raw Maize (Corn)", hindiName: "साबुत मक्का" },
      { ingredientId: "ING-001", percentage: 40, stage: 'mixer', requiresGrinding: false, name: "Wheat Flour", hindiName: "गेंहू का आटा" },
      { ingredientId: "ING-002", percentage: 20, stage: 'mixer', requiresGrinding: false, name: "Refined Sugar", hindiName: "चीनी" },
      { ingredientId: "ING-003", percentage: 15, stage: 'mixer', requiresGrinding: false, name: "Vegetable Fats", hindiName: "वनस्पति वसा" },
      { ingredientId: "ING-004", percentage: 5, stage: 'mixer', requiresGrinding: false, name: "Cream Flavoring", hindiName: "क्रीम फ्लेवर" }
    ]
  },
  { 
    id: "PRD-002", 
    name: "प्रीमियम प्लस", 
    englishName: "Premium Plus", 
    targetUph: 850, 
    colorHex: "#FF6B00", 
    isActive: true, 
    manualFileName: "Premium_Plus_Safety.pdf",
    ingredients: [
      { ingredientId: "ING-006", percentage: 25, stage: 'grinder', requiresGrinding: true, name: "Raw Maize (Corn)", hindiName: "साबुत मक्का" },
      { ingredientId: "ING-001", percentage: 35, stage: 'mixer', requiresGrinding: false, name: "Wheat Flour", hindiName: "गेंहू का आटा" },
      { ingredientId: "ING-002", percentage: 20, stage: 'mixer', requiresGrinding: false, name: "Refined Sugar", hindiName: "चीनी" },
      { ingredientId: "ING-003", percentage: 10, stage: 'mixer', requiresGrinding: false, name: "Vegetable Fats", hindiName: "वनस्पति वसा" },
      { ingredientId: "ING-004", percentage: 5, stage: 'mixer', requiresGrinding: false, name: "Cream Flavoring", hindiName: "क्रीम फ्लेवर" },
      { ingredientId: "ING-005", percentage: 5, stage: 'mixer', requiresGrinding: false, name: "Premium Additive", hindiName: "प्रीमियम एडिटिव" }
    ]
  },
  { 
    id: "PRD-003", 
    name: "मानक मिश्रण", 
    englishName: "Standard Blend", 
    targetUph: 2500, 
    colorHex: "#10B981", 
    isActive: true,
    ingredients: [
      { ingredientId: "ING-001", percentage: 70, stage: 'mixer', requiresGrinding: false, name: "Wheat Flour", hindiName: "गेंहू का आटा" },
      { ingredientId: "ING-002", percentage: 20, stage: 'mixer', requiresGrinding: false, name: "Refined Sugar", hindiName: "चीनी" },
      { ingredientId: "ING-003", percentage: 10, stage: 'mixer', requiresGrinding: false, name: "Vegetable Fats", hindiName: "वनस्पति वसा" }
    ]
  }
];

const INITIAL_LOGS: BatchLog[] = [
  { batchId: "ORD-1001", productNameHindi: "क्रीम स्पेशल", productNameEnglish: "Cream Special", line: "Line A", unitsProduced: 5000, status: "Success", timestamp: Date.now() - 3 * 3600000, targetUnits: 5000 },
  { batchId: "ORD-1002", productNameHindi: "प्रीमियम प्लस", productNameEnglish: "Premium Plus", line: "Line B", unitsProduced: 2500, status: "Success", timestamp: Date.now() - 1.5 * 3600000, targetUnits: 2500 }
];

const INITIAL_INVENTORY: InventoryItem[] = [
  { id: "ING-006", name: "Raw Maize (Corn)", hindiName: "साबुत मक्का", type: 'raw_material', stock: 8500, unit: "kg", minStock: 1500, requiresGrinding: true, stage: 'grinder' },
  { id: "ING-001", name: "Wheat Flour", hindiName: "गेंहू का आटा", type: 'raw_material', stock: 12500, unit: "kg", minStock: 2000 },
  { id: "ING-002", name: "Refined Sugar", hindiName: "चीनी", type: 'raw_material', stock: 5400, unit: "kg", minStock: 1000 },
  { id: "ING-003", name: "Vegetable Fats", hindiName: "वनस्पति वसा", type: 'raw_material', stock: 3200, unit: "kg", minStock: 800 },
  { id: "ING-004", name: "Cream Flavoring", hindiName: "क्रीम फ्लेवर", type: 'raw_material', stock: 650, unit: "kg", minStock: 150 },
  { id: "ING-005", name: "Premium Additive", hindiName: "प्रीमियम एडिटिव", type: 'raw_material', stock: 450, unit: "kg", minStock: 100 },
  
  { id: "FIN-001", name: "Cream Special", hindiName: "क्रीम स्पेशल", type: 'finished_good', stock: 4, unit: "batches", minStock: 2 },
  { id: "FIN-002", name: "Premium Plus", hindiName: "प्रीमियम प्लस", type: 'finished_good', stock: 2, unit: "batches", minStock: 1 },
  { id: "FIN-003", name: "Standard Blend", hindiName: "मानक मिश्रण", type: 'finished_good', stock: 0, unit: "batches", minStock: 1 }
];

const INITIAL_ORDERS: Order[] = [
  { id: "ORD-1001", recipeId: "PRD-001", recipeName: "Cream Special", recipeHindiName: "क्रीम स्पेशल", unitsProduced: 5000, targetUnits: 5000, status: 'Completed', timestamp: Date.now() - 3 * 3600000, updatedTimestamp: Date.now() - 3 * 3600000, line: "Line A" },
  { id: "ORD-1002", recipeId: "PRD-002", recipeName: "Premium Plus", recipeHindiName: "प्रीमियम प्लस", unitsProduced: 2500, targetUnits: 2500, status: 'Completed', timestamp: Date.now() - 1.5 * 3600000, updatedTimestamp: Date.now() - 1.5 * 3600000, line: "Line B" },
  { id: "ORD-1003", recipeId: "PRD-003", recipeName: "Standard Blend", recipeHindiName: "मानक मिश्रण", unitsProduced: 0, targetUnits: 5000, status: 'Pending', timestamp: Date.now() - 10 * 60000 }
];

/**
 * Returns the default pairing URL for the Android Kiosk tablet app.
 * If the dashboard is loaded on localhost or private network IP addresses, it targets port 3001.
 * Otherwise (e.g. deployed on a public domain/tunnel), it targets the base origin.
 */
const getDefaultPairingUrl = () => {
  const hostname = window.location.hostname;
  if (/^100\./.test(hostname)) {
    return `http://${hostname}:3001`;
  }
  return 'http://100.99.115.49:3001';
};

/**
 * Custom fetch wrapper that automatically appends the bypass headers
 * to bypass localtunnel, ngrok, and serveo warning pages and guarantee clean API responses.
 */
const customFetch = (input: RequestInfo | URL, init?: RequestInit) => {
  const headers = new Headers(init?.headers);
  headers.set('Bypass-Tunnel-Reminder', 'true');
  headers.set('ngrok-skip-browser-warning', 'true');
  headers.set('serveo-skip-browser-warning', 'true');
  return fetch(input, { ...init, headers });
};

export default function App() {
  // State initialized with fallbacks, synced with backend database
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [logs, setLogs] = useState<BatchLog[]>(INITIAL_LOGS);
  const [orders, setOrders] = useState<Order[]>(INITIAL_ORDERS);

  // Check query parameter or local storage for worker access
  const [workerToken, setWorkerToken] = useState<string | null>(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('workerToken');
    if (token) {
      localStorage.setItem('nexus_worker_token', token);
      return token;
    }
    return localStorage.getItem('nexus_worker_token');
  });

  // Worker Station Mode: 1. Grinder (पिसाई) or 2. Mixer (मिश्रण)
  const [workerStationType, setWorkerStationType] = useState<'grinder' | 'mixer'>(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const stationParam = urlParams.get('stationType') || urlParams.get('station');
    if (stationParam === 'grinder' || (stationParam && stationParam.toLowerCase().includes('grind'))) {
      localStorage.setItem('nexus_worker_station_type', 'grinder');
      return 'grinder';
    }
    if (stationParam === 'mixer' || (stationParam && stationParam.toLowerCase().includes('mix'))) {
      localStorage.setItem('nexus_worker_station_type', 'mixer');
      return 'mixer';
    }
    const token = urlParams.get('workerToken') || localStorage.getItem('nexus_worker_token') || '';
    if (token.toLowerCase().includes('grind')) return 'grinder';
    const saved = localStorage.getItem('nexus_worker_station_type');
    return (saved === 'grinder' || saved === 'mixer') ? saved : 'mixer';
  });

  // Authentication State
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => {
    try {
      const saved = localStorage.getItem('nexus_auth_user');
      if (saved) return JSON.parse(saved);
    } catch {}
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('workerToken');
    const st = urlParams.get('stationType');
    if (token) {
      const isG = st === 'grinder' || token.toLowerCase().includes('grind');
      return {
        username: isG ? 'grinder' : 'mixer',
        role: 'operator',
        name: isG ? 'Grinder Operator' : 'Mixer Operator',
        nameHi: isG ? 'पिसाई ऑपरेटर' : 'मिश्रण ऑपरेटर',
        stationType: isG ? 'grinder' : 'mixer',
        stationId: isG ? 'GRINDER-01' : 'MIXER-01'
      };
    }
    return null;
  });

  const handleLoginSuccess = (user: AuthUser, token: string) => {
    setCurrentUser(user);
    localStorage.setItem('nexus_auth_user', JSON.stringify(user));
    localStorage.setItem('nexus_auth_token', token);

    if (user.stationType) {
      setWorkerStationType(user.stationType);
      setWorkerToken(token);
      localStorage.setItem('nexus_worker_station_type', user.stationType);
      localStorage.setItem('nexus_worker_token', token);
    } else {
      setWorkerToken(null);
      localStorage.removeItem('nexus_worker_token');
      localStorage.removeItem('nexus_worker_station_type');
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setWorkerToken(null);
    localStorage.removeItem('nexus_auth_user');
    localStorage.removeItem('nexus_auth_token');
    localStorage.removeItem('nexus_worker_token');
    localStorage.removeItem('nexus_worker_station_type');
    window.history.replaceState({}, document.title, window.location.pathname);
  };

  const [workerCelebration, setWorkerCelebration] = useState<{ active: boolean; title: string; subtitle: string; stage: 'grinder' | 'mixer' } | null>(null);

  // Mixer Operator Feedback State
  const [mixerFeedbackQuality, setMixerFeedbackQuality] = useState<'Grade A - Optimal' | 'Grade B - Acceptable' | 'Rework Required'>('Grade A - Optimal');
  const [mixerFeedbackTexture, setMixerFeedbackTexture] = useState<'Smooth Homogeneous' | 'Slightly Grainy' | 'Too Dry' | 'Too Sticky'>('Smooth Homogeneous');
  const [mixerFeedbackNotes, setMixerFeedbackNotes] = useState<string>('मिश्रण 8.0 मिनट में सही एकसमान बना, मक्का अच्छी तरह घुल गया।');
  const [mixerFeedbackRating, setMixerFeedbackRating] = useState<number>(5);

  // Navigation state (Active tab on admin dashboard)
  const [activeTab, setActiveTab] = useState<'dashboard' | 'products' | 'logs' | 'link-integration' | 'inventory' | 'users'>('dashboard');

  // Enforce inventory-only access for inventory-manager role
  useEffect(() => {
    if (currentUser?.role === 'inventory-manager' && activeTab !== 'inventory') {
      setActiveTab('inventory');
    }
  }, [currentUser, activeTab]);

  // Inventory Management State
  const [inventory, setInventory] = useState<InventoryItem[]>(INITIAL_INVENTORY);

  // State for ingredient ratio editor (keys are ingredientId, values are percentages)
  const [recipeIngredients, setRecipeIngredients] = useState<{[key: string]: number}>({});

  // Preset recipe order form states
  const [selectedProductId, setSelectedProductId] = useState<string>('PRD-001');
  const [productionMode, setProductionMode] = useState<'weight' | 'batches'>('weight');
  const [orderTargetUnits, setOrderTargetUnits] = useState<number>(5000);
  const [orderTargetBatches, setOrderTargetBatches] = useState<number>(4);
  const [orderTargetWeightUnit, setOrderTargetWeightUnit] = useState<'kg' | 'tonnes'>('kg');
  const [adminQueueFilter, setAdminQueueFilter] = useState<'active' | 'today'>('today');

  const getProductBatchSize = (pId: string) => {
    const prod = products.find(p => p.id === pId);
    if (!prod || !prod.ingredients || prod.ingredients.length === 0) {
      const initProd = INITIAL_PRODUCTS.find(p => p.id === pId);
      if (initProd) {
        const sum = (initProd.ingredients || []).reduce((sum, ing) => sum + ing.percentage, 0);
        if (sum === 100) return 600;
        return sum > 0 ? sum : 600;
      }
      return 600;
    }
    const sum = prod.ingredients.reduce((sum, ing) => sum + ing.percentage, 0);
    if (sum === 100) return 600;
    return sum > 0 ? sum : 600;
  };

  const handleUnitsChange = (val: number, prodId: string = selectedProductId) => {
    setOrderTargetUnits(val);
    const batchSize = getProductBatchSize(prodId);
    setOrderTargetBatches(Math.ceil(val / batchSize));
  };

  const handleBatchesChange = (val: number, prodId: string = selectedProductId) => {
    setOrderTargetBatches(val);
    const batchSize = getProductBatchSize(prodId);
    setOrderTargetUnits(val * batchSize);
  };
  const [selectedOrderLine, setSelectedOrderLine] = useState<string>('Line A');

  // Search and Filter states
  const [searchLog, setSearchLog] = useState('');
  const [lineFilter, setLineFilter] = useState('ALL');

  // New product form states
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [newProductId, setNewProductId] = useState('');
  const [newProductName, setNewProductName] = useState('');
  const [newProductEnglishName, setNewProductEnglishName] = useState('');
  const [newProductBatchTimeMin, setNewProductBatchTimeMin] = useState(8.0);
  const [draggedOrderId, setDraggedOrderId] = useState<string | null>(null);
  const [stationsOnBreak, setStationsOnBreak] = useState<{stationId: string, isOnBreak: number, breakStartedAt: number}[]>([]);
  const [newProductColor, setNewProductColor] = useState('#00F0FF');
  const [newProductManual, setNewProductManual] = useState('');
  const [showAddProductModal, setShowAddProductModal] = useState(false);

  // New material form states
  const [editingMaterial, setEditingMaterial] = useState<InventoryItem | null>(null);
  const [showAddMaterialModal, setShowAddMaterialModal] = useState(false);
  const [newMaterialId, setNewMaterialId] = useState('');
  const [newMaterialName, setNewMaterialName] = useState('');
  const [newMaterialHindiName, setNewMaterialHindiName] = useState('');
  const [newMaterialStock, setNewMaterialStock] = useState<number>(0);
  const [newMaterialUnit, setNewMaterialUnit] = useState('kg');
  const [newMaterialMinStock, setNewMaterialMinStock] = useState<number>(100);
  const [isHindiNameManuallyEdited, setIsHindiNameManuallyEdited] = useState(false);
  const [isMaterialHindiNameManuallyEdited, setIsMaterialHindiNameManuallyEdited] = useState(false);

  // Translation helper call to server
  const translateText = async (text: string): Promise<string> => {
    if (!text) return '';
    try {
      const res = await customFetch(`/api/translate?text=${encodeURIComponent(text)}`);
      if (res.ok) {
        const data = await res.json();
        return data.translated || '';
      }
    } catch (err) {
      console.error("Failed to translate:", err);
    }
    return '';
  };

  const handleProductEnglishNameBlur = async () => {
    if (newProductEnglishName && (!newProductName || !isHindiNameManuallyEdited)) {
      const translated = await translateText(newProductEnglishName);
      if (translated) setNewProductName(translated);
    }
  };

  const handleMaterialNameBlur = async () => {
    if (newMaterialName && (!newMaterialHindiName || !isMaterialHindiNameManuallyEdited)) {
      const translated = await translateText(newMaterialName);
      if (translated) setNewMaterialHindiName(translated);
    }
  };

  const handleStartEditMaterial = (item: InventoryItem) => {
    setEditingMaterial(item);
    setNewMaterialId(item.id.replace(/^ING-/i, ''));
    setNewMaterialName(item.name);
    setNewMaterialHindiName(item.hindiName || '');
    setNewMaterialStock(item.stock);
    setNewMaterialUnit(item.unit || 'kg');
    setNewMaterialMinStock(item.minStock || 100);
    setIsMaterialHindiNameManuallyEdited(true);
    setShowAddMaterialModal(true);
  };

  const handleDeleteMaterial = async (itemId: string) => {
    if (window.confirm(`CONFIRM: Delete raw material ${itemId}?`)) {
      try {
        const res = await customFetch(`/api/inventory/${itemId}`, {
          method: 'DELETE'
        });
        if (res.ok) {
          fetchInventory();
        } else {
          alert(`Failed to delete raw material ${itemId}`);
        }
      } catch (err) {
        console.error("Failed to delete raw material:", err);
      }
    }
  };

  const handleSaveMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMaterialId || !newMaterialName) {
      alert("Material ID and English Name are mandatory.");
      return;
    }

    const payload = {
      itemId: newMaterialId.toUpperCase().startsWith('ING-') ? newMaterialId.toUpperCase() : `ING-${newMaterialId.toUpperCase()}`,
      name: newMaterialName,
      hindiName: newMaterialHindiName || undefined,
      type: 'raw_material',
      stock: newMaterialStock,
      unit: newMaterialUnit,
      minStock: newMaterialMinStock
    };

    try {
      const res = await customFetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        fetchInventory();
        setShowAddMaterialModal(false);
        setEditingMaterial(null);
        setNewMaterialId('');
        setNewMaterialName('');
        setNewMaterialHindiName('');
        setNewMaterialStock(0);
        setNewMaterialUnit('kg');
        setNewMaterialMinStock(100);
      }
    } catch (err) {
      console.error("Failed to save material:", err);
    }
  };

  // Worker Panel specific states
  const [activeWorkerOrderId, setActiveWorkerOrderId] = useState<string | null>(null);
  const [selectedWorkerBatchNum, setSelectedWorkerBatchNum] = useState<number>(1);
  const [workerUnitsProducedInput, setWorkerUnitsProducedInput] = useState<number>(0);
  const [workerProcessingLine, setWorkerProcessingLine] = useState<string>('Line A');

  // Local clock state
  const [localTime, setLocalTime] = useState(new Date().toLocaleTimeString());

  // Copy/action feedback state
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  // Relative time since last batch log update
  const [timeSinceLastUpdate, setTimeSinceLastUpdate] = useState<string>('Never');

  // Pairing QR Generator states
  const [serverLocalIp, setServerLocalIp] = useState<string>('localhost');
  const [tailscaleIp, setTailscaleIp] = useState<string | null>(null);
  const [lanIp, setLanIp] = useState<string | null>(null);
  const [pairingServerUrl, setPairingServerUrl] = useState(() => getDefaultPairingUrl());

  // 1. Grinder Station State (पिसाई)
  const [grinderStationId, setGrinderStationId] = useState('GRINDER-01');
  const [grinderToken, setGrinderToken] = useState('TOKEN-GRINDER-STATION');
  const [grinderCopied, setGrinderCopied] = useState(false);
  const [grinderPairingJson, setGrinderPairingJson] = useState(() => {
    return JSON.stringify({
      url: getDefaultPairingUrl(),
      token: 'TOKEN-GRINDER-STATION',
      station: 'GRINDER-01',
      stationType: 'grinder'
    });
  });

  // 2. Mixer Station State (मिश्रण)
  const [mixerStationId, setMixerStationId] = useState('MIXER-01');
  const [mixerToken, setMixerToken] = useState('TOKEN-MIXER-STATION');
  const [mixerCopied, setMixerCopied] = useState(false);
  const [mixerPairingJson, setMixerPairingJson] = useState(() => {
    return JSON.stringify({
      url: getDefaultPairingUrl(),
      token: 'TOKEN-MIXER-STATION',
      station: 'MIXER-01',
      stationType: 'mixer'
    });
  });

  // Compatibility aliases
  const [pairingStationId, setPairingStationId] = useState('GRINDER-01');
  const [generatedPairingJson, setGeneratedPairingJson] = useState(() => grinderPairingJson);

  // Sync JSON payloads when URL or IDs change
  useEffect(() => {
    setGrinderPairingJson(JSON.stringify({
      url: pairingServerUrl.trim(),
      token: grinderToken,
      station: grinderStationId,
      stationType: 'grinder'
    }));
    setMixerPairingJson(JSON.stringify({
      url: pairingServerUrl.trim(),
      token: mixerToken,
      station: mixerStationId,
      stationType: 'mixer'
    }));
    setGeneratedPairingJson(JSON.stringify({
      url: pairingServerUrl.trim(),
      token: grinderToken,
      station: grinderStationId,
      stationType: 'grinder'
    }));
  }, [pairingServerUrl, grinderToken, grinderStationId, mixerToken, mixerStationId]);

  // Automatically adjust pairing URL to point to Tailscale/LAN IP instead of localhost
  // Automatically adjust pairing URL to point to Tailscale IP
  useEffect(() => {
    const targetIp = tailscaleIp || (serverLocalIp && serverLocalIp !== 'localhost' && serverLocalIp !== '127.0.0.1' ? serverLocalIp : '100.99.115.49');
    if (targetIp) {
      setPairingServerUrl(`http://${targetIp}:3001`);
    }
  }, [serverLocalIp, tailscaleIp]);
  // Handle live clock update
  useEffect(() => {
    const timer = setInterval(() => {
      setLocalTime(new Date().toLocaleTimeString());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Poll all states from the SQLite production backend server
  const fetchProducts = async () => {
    try {
      const res = await customFetch('/api/products');
      if (res.ok) {
        const data = await res.json();
        if (data && data.length > 0) {
          const mapped = data.map((p: any) => ({
            id: p.id,
            name: p.name,
            englishName: p.englishName,
            targetUph: p.targetUph,
            colorHex: p.colorHex,
            isActive: p.isActive,
            manualFileName: p.manualFileName,
            ingredients: p.mixtureRatios || []
          }));
          setProducts(mapped);
        }
      }
    } catch (err) {
      console.error("Failed to fetch products:", err);
    }
  };

  const fetchOrders = async () => {
    try {
      const res = await customFetch('/api/orders');
      if (res.ok) {
        const data = await res.json();
        if (data) {
          const mapped = data.map((o: any) => {
            const batchSize = getProductBatchSize(o.productKey);
            return {
              id: o.id,
              recipeId: o.productKey,
              recipeName: o.productNameEnglish,
              recipeHindiName: o.productNameHindi,
              unitsProduced: o.completedBatches * batchSize,
              targetUnits: o.totalBatchesScheduled * batchSize,
              status: o.status === 'ACTIVE' ? 'In Progress' : o.status === 'COMPLETED' ? 'Completed' : o.status === 'FAILED' ? 'Failed' : 'Pending',
              timestamp: o.timestamp,
              updatedTimestamp: o.timestamp,
              line: o.line || undefined
            };
          });
          setOrders(mapped);
        }
      }
    } catch (err) {
      console.error("Failed to fetch orders:", err);
    }
  };

  const handleDragStart = (e: React.DragEvent, orderId: string) => {
    setDraggedOrderId(orderId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDragEnd = () => {
    setDraggedOrderId(null);
  };

  const handleDrop = async (e: React.DragEvent, targetOrderId: string) => {
    e.preventDefault();
    if (!draggedOrderId || draggedOrderId === targetOrderId) return;

    const draggedOrder = orders.find(o => o.id === draggedOrderId);
    const targetOrder = orders.find(o => o.id === targetOrderId);
    if (!draggedOrder || !targetOrder) return;

    // Safety constraint: do not move or reorder if either is In Progress
    if (draggedOrder.status === 'In Progress' || targetOrder.status === 'In Progress') {
      return;
    }

    // Find active/pending orders
    const activeOrders = orders.filter(o => o.status === 'Pending' || o.status === 'In Progress');
    const draggedIdx = activeOrders.findIndex(o => o.id === draggedOrderId);
    const targetIdx = activeOrders.findIndex(o => o.id === targetOrderId);

    if (draggedIdx !== -1 && targetIdx !== -1) {
      const reorderedActive = [...activeOrders];
      const [moved] = reorderedActive.splice(draggedIdx, 1);
      reorderedActive.splice(targetIdx, 0, moved);

      // Optimistically update frontend state
      const nonActive = orders.filter(o => o.status !== 'Pending' && o.status !== 'In Progress');
      setOrders([...reorderedActive, ...nonActive]);

      try {
        const res = await customFetch('/api/orders/reorder', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderIds: reorderedActive.map(o => o.id) })
        });
        if (res.ok) {
          fetchOrders();
        }
      } catch (err) {
        console.error("Failed to reorder active orders:", err);
      }
    }
    setDraggedOrderId(null);
  };

  const fetchInventory = async () => {
    try {
      const res = await customFetch('/api/inventory');
      if (res.ok) {
        const data = await res.json();
        if (data) {
          const mapped = data.map((d: any) => ({
            id: d.itemId,
            name: d.name,
            hindiName: d.hindiName || d.name,
            type: d.type || 'raw_material',
            stock: d.stock || 0.0,
            unit: d.unit || 'kg',
            minStock: d.minStock || 0.0
          })).sort((a: any, b: any) => b.stock - a.stock);
          setInventory(mapped);
        }
      }
    } catch (err) {
      console.error("Failed to fetch inventory:", err);
    }
  };

  const fetchLogs = async () => {
    try {
      const res = await customFetch('/api/logs');
      if (res.ok) {
        const data = await res.json();
        if (data) {
          setLogs(data);
        }
      }
    } catch (err) {
      console.error("Failed to fetch logs:", err);
    }
  };

  const fetchServerInfo = async () => {
    try {
      const res = await customFetch('/api/info');
      if (res.ok) {
        const data = await res.json();
        if (data) {
          if (data.tailscaleIp) setTailscaleIp(data.tailscaleIp);
          if (data.lanIp) setLanIp(data.lanIp);
          if (data.localIp) {
            setServerLocalIp(data.localIp);
          }
          const preferredHost = data.tailscaleIp || data.localIp || '100.99.115.49';
          if (preferredHost && preferredHost !== 'localhost' && preferredHost !== '127.0.0.1') {
            setPairingServerUrl(`http://${preferredHost}:3001`);
          }
        }
      }
    } catch (err) {
      console.error("Failed to fetch server info:", err);
    }
  };

  const fetchStationsOnBreak = async () => {
    try {
      const res = await customFetch('/api/stations/breaks');
      if (res.ok) {
        const data = await res.json();
        setStationsOnBreak(data || []);
      }
    } catch (err) {
      console.error("Failed to fetch station breaks:", err);
    }
  };

  useEffect(() => {
    fetchProducts();
    fetchOrders();
    fetchInventory();
    fetchLogs();
    fetchServerInfo();
    fetchStationsOnBreak();

    const interval = setInterval(() => {
      fetchProducts();
      fetchOrders();
      fetchInventory();
      fetchLogs();
      fetchStationsOnBreak();
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  // Calculate time since the last batch update
  useEffect(() => {
    const updateRelativeTime = () => {
      if (logs.length === 0) {
        setTimeSinceLastUpdate('No batches logged yet');
        return;
      }
      const timestamps = logs.map(l => l.timestamp);
      const latestTimestamp = Math.max(...timestamps);
      const diffMs = Date.now() - latestTimestamp;
      
      if (diffMs < 0) {
        setTimeSinceLastUpdate('Just now');
        return;
      }
      
      const diffSec = Math.floor(diffMs / 1000);
      if (diffSec < 60) {
        setTimeSinceLastUpdate(`${diffSec}s ago`);
      } else {
        const diffMin = Math.floor(diffSec / 60);
        const remainingSec = diffSec % 60;
        if (diffMin < 60) {
          setTimeSinceLastUpdate(`${diffMin}m ${remainingSec}s ago`);
        } else {
          const diffHr = Math.floor(diffMin / 60);
          const remainingMin = diffMin % 60;
          setTimeSinceLastUpdate(`${diffHr}h ${remainingMin}m ago`);
        }
      }
    };

    updateRelativeTime();
    const interval = setInterval(updateRelativeTime, 1000);
    return () => clearInterval(interval);
  }, [logs]);

  // Keep worker active order and progress synced with the backend orders state in real-time
  useEffect(() => {
    if (workerToken) {
      const currentSelected = activeWorkerOrderId ? orders.find(o => o.id === activeWorkerOrderId) : null;
      if (currentSelected && currentSelected.status !== 'Completed') {
        if (workerUnitsProducedInput !== currentSelected.unitsProduced) {
          setWorkerUnitsProducedInput(currentSelected.unitsProduced);
        }
      } else {
        const nextOrder = orders.find(o => o.status === 'In Progress') || orders.find(o => o.status === 'Pending');
        if (nextOrder) {
          setActiveWorkerOrderId(nextOrder.id);
          const bSize = getProductBatchSize(nextOrder.recipeId);
          const comp = Math.floor(nextOrder.unitsProduced / bSize);
          setSelectedWorkerBatchNum(comp + 1);
          setWorkerUnitsProducedInput(nextOrder.unitsProduced);
        } else {
          setActiveWorkerOrderId(null);
          setWorkerUnitsProducedInput(0);
        }
      }
    }
  }, [orders, workerToken, activeWorkerOrderId, workerUnitsProducedInput]);

  // Place order for preset recipe
  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    const product = products.find(p => p.id === selectedProductId);
    if (!product) {
      alert("Invalid product selection");
      return;
    }

    const hasActiveOrder = orders.some(o => o.status === 'In Progress');
    const newOrder = {
      id: `ORD-${Date.now()}`,
      productKey: product.id,
      productNameEnglish: product.englishName,
      productNameHindi: product.name,
      totalBatchesScheduled: productionMode === 'batches' ? orderTargetBatches : Math.ceil(orderTargetUnits / getProductBatchSize(product.id)),
      completedBatches: 0,
      status: hasActiveOrder ? 'PENDING' : 'ACTIVE',
      colorHex: product.colorHex
    };

    try {
      const res = await customFetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newOrder)
      });
      if (res.ok) {
        fetchOrders();
      }
    } catch (err) {
      console.error("Failed to place order:", err);
    }
  };

  // Exit worker view and restore admin dashboard
  const handleExitWorkerMode = () => {
    localStorage.removeItem('nexus_worker_token');
    // Clear query parameter from address bar
    window.history.replaceState({}, document.title, window.location.pathname);
    setWorkerToken(null);
  };

  // Clear batch logs
  const handleClearAllLogs = async () => {
    if (window.confirm("CONFIRMATION REQUIRED: Clear all production histories on file?")) {
      try {
        const res = await customFetch('/api/reset', { method: 'POST' });
        if (res.ok) {
          fetchLogs();
          fetchOrders();
          fetchInventory();
        }
      } catch (err) {
        console.error("Failed to clear logs:", err);
      }
    }
  };

  // Reseed datasets
  const handleReseedData = async () => {
    if (window.confirm("CONFIRMATION: Reset and seed default recipe arrays and logs?")) {
      try {
        const res = await customFetch('/api/reseed', { method: 'POST' });
        if (res.ok) {
          fetchProducts();
          fetchLogs();
          fetchOrders();
          fetchInventory();
          alert("Database variables restored to initial setup.");
        }
      } catch (err) {
        console.error("Failed to reseed logs:", err);
      }
    }
  };

  // Delete product
  const handleDeleteProduct = async (pId: string) => {
    if (window.confirm(`CONFIRM: Delete mixture recipe ${pId}?`)) {
      const product = products.find(p => p.id === pId);
      if (!product) return;
      try {
        await customFetch('/api/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...product, isActive: false, mixtureRatios: product.ingredients })
        });
        fetchProducts();
      } catch (err) {
        console.error("Failed to delete product:", err);
      }
    }
  };

  // Save or modify product
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProductId || !newProductName || !newProductEnglishName) {
      alert("All fields are mandatory.");
      return;
    }

    const ingredientsArray = Object.entries(recipeIngredients)
      .filter(([_, percentage]) => percentage > 0)
      .map(([ingredientId, percentage]) => ({ ingredientId, percentage }));

    const totalPercentage = Object.values(recipeIngredients).reduce((sum, val) => sum + val, 0);
    if (totalPercentage !== 100 && totalPercentage !== 600 && totalPercentage !== 1000) {
      alert(`VALIDATION FAILED: Ingredients total must sum to exactly 100% (or 600 kg for a standard batch, or 1000 kg/1 Ton). Current sum: ${totalPercentage}`);
      return;
    }

    const payload = {
      id: newProductId.toUpperCase(),
      name: newProductName,
      englishName: newProductEnglishName,
      targetUph: Math.round(1250 * 60 / newProductBatchTimeMin),
      colorHex: newProductColor,
      isActive: true,
      manualFileName: newProductManual || undefined,
      nominalBatchDurationSec: Math.round(newProductBatchTimeMin * 60),
      mixtureRatios: ingredientsArray
    };

    try {
      const res = await customFetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        fetchProducts();
        setEditingProduct(null);
        setNewProductId('');
        setNewProductName('');
        setNewProductEnglishName('');
        setNewProductBatchTimeMin(8.0);
        setNewProductColor('#00F0FF');
        setNewProductManual('');
        setShowAddProductModal(false);
      }
    } catch (err) {
      console.error("Failed to save product:", err);
    }
  };

  const handleStartEditProduct = (p: Product) => {
    setEditingProduct(p);
    setNewProductId(p.id);
    setNewProductName(p.name);
    setNewProductEnglishName(p.englishName);
    setNewProductBatchTimeMin(p.nominalBatchDurationSec ? p.nominalBatchDurationSec / 60 : 8.0);
    setNewProductColor(p.colorHex);
    setNewProductManual(p.manualFileName || '');
    setIsHindiNameManuallyEdited(true);

    // Set ingredients ratios from product or empty object
    const ingredientMap: {[key: string]: number} = {};
    inventory.filter(item => item.type === 'raw_material').forEach(ing => {
      const match = p.ingredients?.find(ri => ri.ingredientId === ing.id);
      ingredientMap[ing.id] = match ? match.percentage : 0;
    });
    setRecipeIngredients(ingredientMap);

    setShowAddProductModal(true);
  };

  // Helper for inventory restocking/dispatch adjustments on the server
  const adjustInventoryOnServer = async (itemId: string, adjustAmount: number) => {
    const item = inventory.find(i => i.id === itemId);
    if (!item) return;
    const newStock = Math.max(0, Number((item.stock + adjustAmount).toFixed(2)));
    try {
      const response = await customFetch('/api/inventory/adjust', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId: itemId, stock: newStock })
      });
      if (response.ok) {
        fetchInventory();
      }
    } catch (err) {
      console.error("Failed to adjust inventory on server:", err);
    }
  };

  const handleDispatchOrder = async (orderId: string) => {
    try {
      // Deactivate any currently active/in-progress orders to ensure only one is active at a time
      const activeOrders = orders.filter(o => o.status === 'In Progress');
      for (const ao of activeOrders) {
        await customFetch(`/api/orders/${ao.id}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'PENDING' })
        });
      }

      const res = await customFetch(`/api/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'ACTIVE' })
      });
      if (res.ok) {
        fetchOrders();
      }
    } catch (err) {
      console.error("Failed to dispatch order:", err);
    }
  };

  // Worker controls
  const handleWorkerStartOrder = async (orderId: string) => {
    try {
      const res = await customFetch(`/api/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'ACTIVE' })
      });
      if (res.ok) {
        fetchOrders();
        setActiveWorkerOrderId(orderId);
        const activeOrder = orders.find(o => o.id === orderId);
}
    } catch (err) {
      console.error("Failed to start worker order:", err);
    }
  };

  const handleWorkerUpdateProgress = async (val: number) => {
    if (!activeWorkerOrderId) return;
    const order = orders.find(o => o.id === activeWorkerOrderId);
    const batchSize = order ? getProductBatchSize(order.recipeId) : 600;
    try {
      const res = await customFetch(`/api/orders/${activeWorkerOrderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completedBatches: Math.round(val / batchSize) })
      });
      if (res.ok) {
        fetchOrders();
        setWorkerUnitsProducedInput(val);
      }
    } catch (err) {
      console.error("Failed to update progress:", err);
    }
  };

  const handleWorkerCompleteOrder = async (
    status: 'Success' | 'Failed',
    options?: { bulkGrind?: boolean; batchesCount?: number; targetBatchNum?: number }
  ) => {
    if (!activeWorkerOrderId) return;
    const order = orders.find(o => o.id === activeWorkerOrderId);
    if (!order) return;

    const batchSize = getProductBatchSize(order.recipeId);
    const batchesCompleted = Math.round(order.unitsProduced / batchSize);
    const isGrinder = workerStationType === 'grinder';
    const isBulk = Boolean(options?.bulkGrind && (options?.batchesCount || 1) > 1);
    const batchesCount = isBulk ? (options?.batchesCount || 1) : 1;
    const batchNum = options?.targetBatchNum || (batchesCompleted + 1);

    const newLog: any = {
      batchId: isBulk 
        ? `${order.id}-BULK-GRIND-${Date.now()}` 
        : `${order.id}-B${batchNum}${isGrinder ? '-GRIND' : '-MIX'}`,
      orderId: order.id,
      productNameHindi: isGrinder 
        ? (isBulk ? `${order.recipeHindiName} [थोक पिसाई: ${batchesCount} बैच]` : `${order.recipeHindiName} [पिसाई]`) 
        : order.recipeHindiName,
      productNameEnglish: isGrinder 
        ? (isBulk ? `${order.recipeName} [BULK GRIND: ${batchesCount} BATCHES]` : `${order.recipeName} [GRINDER: POWDERED]`) 
        : order.recipeName,
      line: workerProcessingLine,
      unitsProduced: isGrinder ? (120 * batchesCount) : batchSize,
      status: status,
      timestamp: Date.now(),
      targetUnits: isGrinder ? (120 * batchesCount) : batchSize,
      stage: workerStationType,
      bulkGrind: isBulk,
      batchesCount: batchesCount,
      feedbackQuality: !isGrinder ? mixerFeedbackQuality : undefined,
      feedbackTexture: !isGrinder ? mixerFeedbackTexture : undefined,
      feedbackNotes: !isGrinder ? mixerFeedbackNotes : undefined,
      feedbackRating: !isGrinder ? mixerFeedbackRating : undefined
    };

    try {
      const res = await customFetch('/api/logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer DASHBOARD-DEV-TOKEN'
        },
        body: JSON.stringify(newLog)
      });
      if (res.ok) {
        fetchLogs();
        fetchOrders();
        fetchInventory();

        if (status === 'Success') {
          if (isGrinder) {
            setWorkerCelebration({
              active: true,
              title: isBulk 
                ? `थोक पिसाई पूरी! (${batchesCount} बैच)` 
                : "मक्का पीसा गया और पाइपलाइन में भेजा गया!",
              subtitle: isBulk 
                ? `${batchesCount * 120} KG RAW MAIZE BULK PULVERIZED & DISPATCHED TO MIXER PIPELINE` 
                : "120 KG RAW MAIZE PULVERIZED (< 200 µm) & TRANSFERRED TO MIXER PIPELINE",
              stage: 'grinder'
            });
          } else {
            setWorkerCelebration({
              active: true,
              title: "बैच मिश्रण व फीडबैक दर्ज!",
              subtitle: `QUALITY: ${mixerFeedbackQuality} (${mixerFeedbackRating}★) // ${mixerFeedbackTexture}`,
              stage: 'mixer'
            });
          }
          setTimeout(() => {
            setWorkerCelebration(null);
            if (!isGrinder) {
              setActiveWorkerOrderId(null);
              setWorkerUnitsProducedInput(0);
            }
          }, 2400);
        } else {
          setActiveWorkerOrderId(null);
          setWorkerUnitsProducedInput(0);
        }
      }
    } catch (err) {
      console.error("Failed to complete order:", err);
    }
  };

  const triggerCopyCode = (text: string, identifier: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(identifier);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  // Calculations for Admin Panel
  const batchesDoneCount = logs.filter(l => l.status === 'Success').length;
  const batchesOrderedCount = orders.length;
  const successRatio = logs.length > 0 ? Math.round((batchesDoneCount / logs.length) * 100) : 100;
  const totalUnitsProduced = logs.reduce((sum, l) => sum + l.unitsProduced, 0);

  const filteredLogs = logs.filter(l => {
    const searchMatch = l.batchId.toLowerCase().includes(searchLog.toLowerCase()) || 
                        l.productNameEnglish.toLowerCase().includes(searchLog.toLowerCase()) ||
                        l.productNameHindi.toLowerCase().includes(searchLog.toLowerCase());
    const lineMatch = lineFilter === 'ALL' || l.line === lineFilter;
    return searchMatch && lineMatch;
  });

  // Construct generated QR URLs for Grinder and Mixer stations
  const grinderQrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(grinderPairingJson)}&color=f59e0b&bgcolor=161920`;
  const mixerQrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(mixerPairingJson)}&color=00f0ff&bgcolor=161920`;

  // Backward compatibility aliases
  const workerUrl = `${window.location.origin}${window.location.pathname}?workerToken=TOKEN-GRINDER-STATION&stationType=grinder`;
  const qrCodeImageUrl = grinderQrImageUrl;

  const handleCopyGrinder = () => {
    navigator.clipboard.writeText(grinderPairingJson);
    setGrinderCopied(true);
    setTimeout(() => setGrinderCopied(false), 2000);
  };

  const handleCopyMixer = () => {
    navigator.clipboard.writeText(mixerPairingJson);
    setMixerCopied(true);
    setTimeout(() => setMixerCopied(false), 2000);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(grinderPairingJson);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleGenerateGrinderQR = async () => {
    try {
      const response = await customFetch('/api/auth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stationId: grinderStationId, stationType: 'grinder' })
      });
      if (response.ok) {
        const data = await response.json();
        setGrinderToken(data.token);
        const payload = {
          url: pairingServerUrl.trim(),
          token: data.token,
          station: data.stationId,
          stationType: 'grinder'
        };
        setGrinderPairingJson(JSON.stringify(payload));
      }
    } catch (err) {
      console.error("Failed to generate grinder station pairing token:", err);
    }
  };

  const handleGenerateMixerQR = async () => {
    try {
      const response = await customFetch('/api/auth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stationId: mixerStationId, stationType: 'mixer' })
      });
      if (response.ok) {
        const data = await response.json();
        setMixerToken(data.token);
        const payload = {
          url: pairingServerUrl.trim(),
          token: data.token,
          station: data.stationId,
          stationType: 'mixer'
        };
        setMixerPairingJson(JSON.stringify(payload));
      }
    } catch (err) {
      console.error("Failed to generate mixer station pairing token:", err);
    }
  };

  const handleGeneratePairingQR = async () => {
    await handleGenerateGrinderQR();
    await handleGenerateMixerQR();
  };

  // ----------------------------------------------------
  // LOGIN PORTAL VIEW (if unauthenticated)
  // ----------------------------------------------------
  if (!currentUser && !workerToken) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} customFetch={customFetch} />;
  }

  // ----------------------------------------------------
  // WORKER PORTAL VIEW (loads when workerToken is active)
  // ----------------------------------------------------
  if (workerToken) {
    const activeOrderDetails = orders.find(o => o.id === activeWorkerOrderId);
    const isGrinder = workerStationType === 'grinder';
    const activeProduct = activeOrderDetails 
      ? (products.find(p => p.id === activeOrderDetails.recipeId) || INITIAL_PRODUCTS.find(p => p.id === activeOrderDetails.recipeId))
      : null;

    const allIngredients = activeProduct?.ingredients || [];
    // Grinder ONLY shows ingredients requiring milling (e.g. Raw Maize / साबुत मक्का)
    const grinderOnlyIngredients = allIngredients.filter(ing => 
      ing.stage === 'grinder' || ing.requiresGrinding || ing.ingredientId === 'ING-006' || (ing.name && ing.name.toLowerCase().includes('maize'))
    );
    const mixerIngredients = allIngredients;

    const grinderBatchWeight = grinderOnlyIngredients.reduce((s, ing) => s + ing.percentage, 0) || 120;
    const mixerBatchWeight = activeOrderDetails ? getProductBatchSize(activeOrderDetails.recipeId) : 600;

    const orderBatchSize = activeOrderDetails ? getProductBatchSize(activeOrderDetails.recipeId) : 600;
    const totalOrderBatches = activeOrderDetails ? Math.max(1, Math.ceil(activeOrderDetails.targetUnits / orderBatchSize)) : 1;
    const completedOrderBatches = activeOrderDetails ? Math.floor(activeOrderDetails.unitsProduced / orderBatchSize) : 0;
    const remainingOrderBatches = Math.max(1, totalOrderBatches - completedOrderBatches);

    // Compute sequential upcoming batches across all active/pending orders
    const upcomingBatches = orders
      .filter(o => o.status === 'In Progress' || o.status === 'Pending')
      .flatMap(o => {
        const bSize = getProductBatchSize(o.recipeId);
        const total = Math.max(1, Math.ceil(o.targetUnits / bSize));
        const comp = Math.floor(o.unitsProduced / bSize);
        const rem = Math.max(0, total - comp);
        const list = [];
        for (let i = 1; i <= rem; i++) {
          const bNum = comp + i;
          list.push({
            batchId: `${o.id}-B${bNum}`,
            orderId: o.id,
            batchNumber: bNum,
            totalBatches: total,
            productHindi: o.recipeHindiName || o.recipeName,
            productEnglish: o.recipeName,
            recipeId: o.recipeId,
            orderStatus: o.status,
            isSelected: o.id === activeWorkerOrderId && bNum === selectedWorkerBatchNum
          });
        }
        return list;
      });

    return (
      <div className={`min-h-screen ${isGrinder ? 'bg-[#0E0C09] text-[#E2E0D8]' : 'bg-[#090D12] text-[#D1D4DC]'} flex flex-col font-sans selection:bg-${isGrinder ? 'amber-500' : 'cyan-500'} selection:text-black transition-colors duration-500`}>
        
        {/* Full-Screen Smooth Celebration Overlay */}
        {workerCelebration?.active && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md animate-in fade-in duration-300">
            <div className={`max-w-md w-full mx-4 p-8 rounded-2xl border-2 ${isGrinder ? 'border-amber-500 bg-amber-950/40 shadow-[0_0_50px_rgba(245,158,11,0.3)]' : 'border-[#00F0FF] bg-[#00F0FF]/10 shadow-[0_0_50px_rgba(0,240,255,0.3)]'} text-center flex flex-col items-center gap-4`}>
              <div className={`w-20 h-20 rounded-full flex items-center justify-center ${isGrinder ? 'bg-amber-500 text-black' : 'bg-[#00F0FF] text-black'} text-4xl font-black shadow-lg animate-bounce`}>
                ✓
              </div>
              <span className={`text-xs font-mono font-bold tracking-widest uppercase px-3 py-1 rounded-full ${isGrinder ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'}`}>
                {isGrinder ? 'STAGE 1: PULVERIZATION DISPATCHED' : 'STAGE 2: COMPOUND BATCH REGISTERED'}
              </span>
              <h3 className="text-2xl font-black text-white font-display">
                {workerCelebration.title}
              </h3>
              <p className="text-xs font-mono text-gray-300 leading-relaxed">
                {workerCelebration.subtitle}
              </p>
              <div className="w-full bg-gray-900 rounded-full h-1.5 overflow-hidden mt-2">
                <div className={`h-full ${isGrinder ? 'bg-amber-500' : 'bg-[#00F0FF]'} animate-pulse w-full`}></div>
              </div>
            </div>
          </div>
        )}

        {/* Floor Handheld Kiosk Header with Station Role Identity */}
        <header className={`border-b ${isGrinder ? 'border-amber-500/40 bg-[#14120D]' : 'border-[#00F0FF]/40 bg-[#0E131A]'} py-3 px-4 md:px-6 sticky top-0 z-40 shadow-xl backdrop-blur-md`}>
          <div className="max-w-[900px] mx-auto flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${isGrinder ? 'bg-amber-500 shadow-[0_0_12px_#F59E0B]' : 'bg-[#00F0FF] shadow-[0_0_12px_#00F0FF]'} animate-ping`}></div>
              <div>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-mono font-black tracking-widest uppercase px-2 py-0.5 rounded ${isGrinder ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'}`}>
                    {isGrinder ? 'STAGE 1 // MILL' : 'STAGE 2 // MIX'}
                  </span>
                  <span className="text-[10px] text-gray-400 font-mono">KIOSK SECURE</span>
                </div>
                <h1 className="text-base md:text-lg font-black text-white font-display flex items-center gap-2 mt-0.5">
                  {isGrinder ? (
                    <>
                      <Zap className="w-5 h-5 text-amber-500" />
                      1. GRINDER TERMINAL (पिसाई)
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-5 h-5 text-[#00F0FF]" />
                      2. MIXER TERMINAL (मिश्रण)
                    </>
                  )}
                </h1>
              </div>
            </div>

            {/* Quick Switcher & Controls */}
            <div className="flex items-center gap-2">
              <div className="bg-black/60 p-1 rounded-lg border border-gray-800 flex gap-1 font-mono text-xs">
                <button
                  onClick={() => {
                    setWorkerStationType('grinder');
                    localStorage.setItem('nexus_worker_station_type', 'grinder');
                  }}
                  className={`px-3 py-1 rounded transition font-bold flex items-center gap-1.5 ${
                    isGrinder 
                      ? 'bg-amber-500 text-black shadow-md shadow-amber-500/25 font-black' 
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <Zap className="w-3.5 h-3.5" />
                  1. Grinder
                </button>
                <button
                  onClick={() => {
                    setWorkerStationType('mixer');
                    localStorage.setItem('nexus_worker_station_type', 'mixer');
                  }}
                  className={`px-3 py-1 rounded transition font-bold flex items-center gap-1.5 ${
                    !isGrinder 
                      ? 'bg-[#00F0FF] text-black shadow-md shadow-cyan-500/25 font-black' 
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  2. Mixer
                </button>
              </div>

              <button 
                onClick={handleLogout}
                className="bg-gray-900 hover:bg-red-950/40 text-xs font-mono font-semibold px-3 py-1.5 rounded border border-gray-800 hover:border-red-500/50 transition-all text-gray-300 hover:text-red-400 flex items-center gap-1.5"
                title="लॉगआउट / Logout"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 max-w-[1400px] mx-auto w-full p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* LEFT 1/3rd PANEL: NEXT UP & PRODUCTION QUEUE (4 Cols) */}
          <div className="lg:col-span-4 flex flex-col gap-4">
            
            {/* Station Status Card */}
            <div className={`p-4 rounded-xl border ${isGrinder ? 'bg-[#14120D] border-amber-500/40' : 'bg-[#0E131A] border-[#00F0FF]/40'} shadow-lg`}>
              <div className="flex items-center justify-between">
                <div>
                  <span className={`text-[10px] font-mono font-black tracking-widest uppercase px-2 py-0.5 rounded ${isGrinder ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'}`}>
                    {isGrinder ? 'STAGE 1: GRINDER' : 'STAGE 2: MIXER'}
                  </span>
                  <h3 className="text-base font-black text-white mt-1">
                    {isGrinder ? '1. पिसाई स्टेशन (GRINDER)' : '2. मिश्रण स्टेशन (MIXER)'}
                  </h3>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-gray-500 font-mono block">STATION ID</span>
                  <span className="text-xs font-mono font-bold text-gray-300">KIOSK-01</span>
                </div>
              </div>
            </div>

            {/* UPCOMING BATCHES QUEUE (Left 1/3rd) */}
            <div className={`flex-1 p-4 rounded-xl border ${isGrinder ? 'bg-[#14120D] border-amber-500/30' : 'bg-[#0E131A] border-[#00F0FF]/30'} flex flex-col gap-3 shadow-xl`}>
              <div className="flex items-center justify-between border-b border-gray-800 pb-2">
                <div className="flex items-center gap-2">
                  <Layers className={`w-4 h-4 ${isGrinder ? 'text-amber-400' : 'text-[#00F0FF]'}`} />
                  <div>
                    <h3 className="text-xs font-black text-white uppercase font-mono tracking-wide">
                      आगामी बैच (UPCOMING BATCHES)
                    </h3>
                    <p className="text-[9px] text-gray-500 font-mono">
                      बैच चुनें और फॉर्मूला देखें / Click to load formula
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-mono font-bold text-gray-400">
                  {upcomingBatches.length} queued
                </span>
              </div>

              <div className="flex flex-col gap-2 overflow-y-auto max-h-[520px] pr-1">
                {upcomingBatches.length === 0 ? (
                  <div className="p-6 text-center bg-black/40 border border-dashed border-gray-800 rounded-lg">
                    <p className="text-xs text-gray-500 font-mono uppercase">कतार खाली है / No Upcoming Batches</p>
                  </div>
                ) : (
                  upcomingBatches.map(b => {
                    const isSelected = b.isSelected;
                    return (
                      <div
                        key={b.batchId}
                        onClick={() => {
                          setActiveWorkerOrderId(b.orderId);
                          setSelectedWorkerBatchNum(b.batchNumber);
                        }}
                        className={`p-3 rounded-lg border transition cursor-pointer ${
                          isSelected
                            ? isGrinder
                              ? 'bg-amber-950/40 border-amber-500 shadow-md shadow-amber-500/10 ring-1 ring-amber-500'
                              : 'bg-cyan-950/40 border-[#00F0FF] shadow-md shadow-cyan-500/10 ring-1 ring-[#00F0FF]'
                            : 'bg-black/40 border-gray-800 hover:border-gray-600'
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className={`text-[10px] font-mono font-bold ${isSelected ? (isGrinder ? 'text-amber-400' : 'text-[#00F0FF]') : 'text-gray-400'}`}>
                                BATCH #{b.batchNumber} / {b.totalBatches}
                              </span>
                              <span className={`text-[8px] font-mono px-1.5 py-0.5 rounded font-black tracking-wider uppercase ${
                                isSelected
                                  ? isGrinder ? 'bg-amber-500 text-black' : 'bg-[#00F0FF] text-black'
                                  : 'bg-gray-800 text-gray-400'
                              }`}>
                                {isSelected ? 'SELECTED' : 'UPCOMING'}
                              </span>
                            </div>
                            <h5 className="text-xs font-bold text-white mt-1 leading-tight">{b.productHindi}</h5>
                            <span className="text-[10px] text-gray-400 font-mono block">{b.productEnglish}</span>
                            <span className="text-[9px] text-gray-500 font-mono block mt-1">Order: {b.orderId}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

          </div>

          {/* RIGHT 2/3rds PANEL: ACTIVE BATCH & FORMULA (8 Cols) */}
          <div className="lg:col-span-8 flex flex-col gap-6">
            {activeWorkerOrderId && activeOrderDetails ? (
              <div className={`bg-gradient-to-b ${isGrinder ? 'from-[#1B1812] to-[#100E0A] border-2 border-amber-500/80 shadow-[0_0_30px_rgba(245,158,11,0.15)]' : 'from-[#121822] to-[#0A0E15] border-2 border-[#00F0FF]/80 shadow-[0_0_30px_rgba(0,240,255,0.15)]'} rounded-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200`}>
                
                {/* 1. Card Top Banner: What is Going On Now */}
                <div className={`${isGrinder ? 'bg-[#14120D] border-b border-amber-500/30' : 'bg-[#0E131A] border-b border-[#00F0FF]/30'} p-4 md:p-6 flex justify-between items-center`}>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-mono ${isGrinder ? 'text-amber-400 bg-amber-500/10 border-amber-500/30' : 'text-[#00F0FF] bg-[#00F0FF]/10 border-[#00F0FF]/30'} border px-2.5 py-0.5 rounded-full font-bold uppercase`}>
                        {isGrinder ? 'STAGE 1: GRINDER RUNNING' : 'STAGE 2: MIXER COMPOUNDING'}
                      </span>
                      <span className={`text-xs font-mono font-black px-2 py-0.5 rounded ${isGrinder ? 'bg-amber-500/20 text-amber-300' : 'bg-cyan-500/20 text-cyan-300'}`}>
                        BATCH #{selectedWorkerBatchNum} OF {totalOrderBatches}
                      </span>
                      <span className="text-xs font-mono text-gray-400">{activeOrderDetails.id}</span>
                    </div>
                    <h2 className="text-2xl md:text-3xl font-black text-white font-mono mt-1">
                      {activeOrderDetails.recipeHindiName || activeOrderDetails.recipeName}
                    </h2>
                    <h3 className="text-sm font-semibold text-gray-400 font-display mt-0.5">
                      ACTIVE FORMULA: {activeOrderDetails.recipeName.toUpperCase()}
                    </h3>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-gray-400 block font-mono uppercase tracking-wider">
                      {isGrinder ? 'STATION BATCH WEIGHT' : 'TOTAL BATCH WEIGHT'}
                    </span>
                    <span className={`text-xl md:text-2xl font-black font-mono ${isGrinder ? 'text-amber-400' : 'text-[#00F0FF]'}`}>
                      {isGrinder ? `${grinderBatchWeight} kg Raw Maize` : `${mixerBatchWeight} kg Compound`}
                    </span>
                  </div>
                </div>

                <div className="p-4 md:p-6 flex flex-col gap-6">

                  {/* 2. THE RECIPE FORMULA & INGREDIENTS (Centerpiece replacing old timer) */}
                  {isGrinder ? (
                    /* GRINDER FORMULA VIEW */
                    <div className="flex flex-col gap-4">
                      <div className="border-l-4 border-amber-500 pl-3 flex justify-between items-center">
                        <div>
                          <h4 className="text-sm md:text-base font-black text-amber-400 uppercase font-mono tracking-wide flex items-center gap-2">
                            <ClipboardCheck className="w-5 h-5 text-amber-400" />
                            पिसाई सामग्री और कार्य सूची (MATERIALS TO GRIND & CHECKLIST)
                          </h4>
                          <p className="text-xs text-gray-400 font-mono mt-0.5">
                            Pulverize raw grain into fine powder and transfer to Mixer Stage via pipeline.
                          </p>
                        </div>
                        <span className="text-[10px] font-mono font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2.5 py-1 rounded-full uppercase">
                          CHECKLIST ONLY // NO FEEDBACK REQUIRED
                        </span>
                      </div>

                      {/* Highlighted Material Box */}
                      <div className="bg-[#14120D] border-2 border-amber-500/50 rounded-xl p-4 flex justify-between items-center shadow-lg">
                        <div>
                          <span className="text-[10px] font-mono text-amber-400 uppercase font-bold">RAW MATERIAL FOR MILLING</span>
                          <h5 className="text-lg font-black text-white">साबुत मक्का (Raw Maize / ING-006)</h5>
                          <span className="text-xs text-gray-400 font-mono">Particle size: &lt; 200 µm (Pass Mesh 80) • Moisture: &lt; 12.5%</span>
                        </div>
                        <div className="bg-amber-500 text-black px-4 py-2 rounded-lg font-mono font-black text-xl">
                          {grinderBatchWeight} kg
                        </div>
                      </div>

                      {/* 4 Step Tasks */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                        <div className="bg-[#14120D] border border-amber-500/40 rounded-xl p-3 flex items-start gap-2.5">
                          <div className="w-7 h-7 rounded bg-amber-500 text-black font-black font-mono flex items-center justify-center text-xs shrink-0">1</div>
                          <div>
                            <h6 className="text-xs font-black text-white">कच्चा माल फीड करें (LOAD MAIZE)</h6>
                            <p className="text-[11px] text-gray-300 font-mono mt-0.5">हॉपर में 120 kg साबुत मक्का लोड करें।</p>
                          </div>
                        </div>
                        <div className="bg-[#14120D] border border-amber-500/40 rounded-xl p-3 flex items-start gap-2.5">
                          <div className="w-7 h-7 rounded bg-amber-500 text-black font-black font-mono flex items-center justify-center text-xs shrink-0">2</div>
                          <div>
                            <h6 className="text-xs font-black text-white">हैमर मिल चालू करें (START MILL)</h6>
                            <p className="text-[11px] text-gray-300 font-mono mt-0.5">रोटर गति 1,480 RPM पर स्थिर होने दें।</p>
                          </div>
                        </div>
                        <div className="bg-[#14120D] border border-amber-500/40 rounded-xl p-3 flex items-start gap-2.5">
                          <div className="w-7 h-7 rounded bg-amber-500 text-black font-black font-mono flex items-center justify-center text-xs shrink-0">3</div>
                          <div>
                            <h6 className="text-xs font-black text-white">कण आकार छलनी जांच (INSPECT SIEVE)</h6>
                            <p className="text-[11px] text-gray-300 font-mono mt-0.5">&lt; 200 माइक्रोन बारीक पाउडर की जांच करें।</p>
                          </div>
                        </div>
                        <div className="bg-[#14120D] border border-amber-500/40 rounded-xl p-3 flex items-start gap-2.5">
                          <div className="w-7 h-7 rounded bg-amber-500 text-black font-black font-mono flex items-center justify-center text-xs shrink-0">4</div>
                          <div>
                            <h6 className="text-xs font-black text-white">ब्लोअर ट्रांसफर (PIPELINE DISPATCH)</h6>
                            <p className="text-[11px] text-gray-300 font-mono mt-0.5">वाल्व खोलकर मक्का मिक्सर चेंबर में भेजें।</p>
                          </div>
                        </div>
                      </div>

                      {/* Notice */}
                      <div className="bg-amber-950/30 border border-amber-500/30 rounded-lg p-3 text-xs text-amber-300 font-mono">
                        ★ ग्राइंडर पर फीडबैक की आवश्यकता नहीं है। मक्का पीसकर सीधे पाइपलाइन में भेजें। गुणवत्ता फीडबैक मिक्सर ऑपरेटर द्वारा दिया जाएगा।
                      </div>

                      {/* Bulk Grinding Option: If order has > 1 remaining batches */}
                      {remainingOrderBatches > 1 && (
                        <div className="bg-amber-950/40 border-2 border-amber-500/60 rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-3 shadow-lg">
                          <div>
                            <h5 className="text-xs font-black text-amber-400 uppercase font-mono tracking-wide flex items-center gap-2">
                              <Zap className="w-4 h-4 text-amber-400" />
                              थोक पिसाई (BULK GRIND ALL REMAINING BATCHES)
                            </h5>
                            <p className="text-[11px] text-gray-300 font-mono mt-0.5">
                              ग्राइंडर एक साथ 100 टन तक पीस सकता है। पूरे ऑर्डर के सभी {remainingOrderBatches} बैच ({remainingOrderBatches * 120} kg मक्का) एक साथ पीसें।
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleWorkerCompleteOrder('Success', { bulkGrind: true, batchesCount: remainingOrderBatches })}
                            className="whitespace-nowrap bg-amber-500 hover:bg-amber-400 text-black font-black text-xs font-mono px-4 py-2.5 rounded-lg shadow-md transition flex items-center gap-2 shrink-0"
                          >
                            ⚡ सभी {remainingOrderBatches} बैच एक साथ पीसें ({remainingOrderBatches * 120} KG)
                          </button>
                        </div>
                      )}

                      {/* Action Slider / Button Preserved */}
                      <button
                        onClick={() => handleWorkerCompleteOrder('Success', { targetBatchNum: selectedWorkerBatchNum })}
                        className="w-full bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black py-4 px-6 rounded-xl font-black font-mono text-base transition shadow-xl shadow-amber-500/20 active:scale-[0.99] flex items-center justify-center gap-3 tracking-wider"
                      >
                        <Wind className="w-5 h-5 text-black animate-pulse" />
                        <span>1 बैच मक्का पीसकर पाइपलाइन में भेजें (SEND 1 BATCH: 120 KG)</span>
                        <ChevronRight className="w-5 h-5 text-black" />
                      </button>
                    </div>
                  ) : (
                    /* MIXER FORMULA VIEW */
                    <div className="flex flex-col gap-4">
                      <div className="border-l-4 border-[#00F0FF] pl-3 flex justify-between items-center">
                        <div>
                          <h4 className="text-sm md:text-base font-black text-[#00F0FF] uppercase font-mono tracking-wide flex items-center gap-2">
                            <RefreshCw className="w-4 h-4 text-[#00F0FF]" />
                            रेसिपी फॉर्मूला और सामग्री विवरण (RECIPE INGREDIENT FORMULA)
                          </h4>
                          <p className="text-xs text-gray-400 font-mono mt-0.5">
                            Exact formula breakdown for this batch. Add ingredients in sequence.
                          </p>
                        </div>
                        <span className="text-[10px] font-mono font-bold bg-[#00F0FF]/20 text-[#00F0FF] border border-[#00F0FF]/30 px-2.5 py-1 rounded-full uppercase">
                          FEEDBACK REQUIRED BEFORE SIGN-OFF
                        </span>
                      </div>

                      {/* Formula Composition Cards */}
                      <div className="bg-[#0B1017] border-2 border-[#00F0FF]/40 rounded-xl p-4 flex flex-col gap-2.5 shadow-lg">
                        <div className="flex justify-between items-center border-b border-gray-800 pb-2">
                          <span className="text-xs font-mono text-gray-400 uppercase font-bold">Recipe Composition Table</span>
                          <span className="text-xs font-mono text-[#00F0FF] font-bold">Total Batch Weight: {mixerBatchWeight} kg</span>
                        </div>

                        <div className="flex flex-col md:flex-row md:overflow-x-auto gap-2.5 font-mono text-xs max-h-[320px] md:max-h-none overflow-y-auto pb-1 scrollbar-thin scrollbar-thumb-[#00F0FF]/30">
                          {mixerIngredients.map((ing, idx) => {
                            const isMaize = ing.ingredientId === 'ING-006' || (ing.name && ing.name.toLowerCase().includes('maize'));
                            return (
                              <div 
                                key={ing.ingredientId || idx}
                                className={`p-3 rounded-lg border flex flex-row md:flex-col justify-between md:min-w-[200px] shrink-0 transition ${
                                  isMaize 
                                    ? 'bg-amber-950/20 border-amber-500/40 text-amber-300' 
                                    : 'bg-black/40 border-gray-800 text-gray-200'
                                }`}
                              >
                                <div className="flex items-start gap-2.5">
                                  <span className="w-5 h-5 rounded-full bg-gray-800 flex items-center justify-center text-[10px] font-bold text-gray-300 shrink-0 mt-0.5">
                                    {idx + 1}
                                  </span>
                                  <div>
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <strong className="text-white text-sm">
                                        {isMaize ? 'Ground Maize Powder (पिसा हुआ मक्का)' : (ing.hindiName || ing.name || ing.ingredientId)}
                                      </strong>
                                      {isMaize && (
                                        <span className="text-[9px] font-mono bg-amber-500/20 text-amber-400 border border-amber-500/30 px-1.5 py-0.2 rounded font-bold">
                                          FROM PIPELINE
                                        </span>
                                      )}
                                    </div>
                                    <span className="text-[10px] text-gray-400 block mt-0.5">{ing.name}</span>
                                  </div>
                                </div>
                                <div className="text-right md:text-left md:mt-3 md:pt-2 md:border-t md:border-gray-800/60 font-mono flex md:justify-between items-end md:items-center">
                                  <span className="text-sm font-black text-white">{ing.percentage} kg</span>
                                  <span className="text-[9px] text-gray-500 block">
                                    {isMaize ? 'Pipeline Transfer' : 'Direct Addition'}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Mixing Instructions */}
                      <div className="bg-[#0B1520] border border-[#00F0FF]/30 rounded-lg p-3 text-xs text-cyan-200 font-mono">
                        ★ निर्देश: आटा, चीनी और पाइपलाइन से आया मक्का 3 मिनट मिलाएं, फिर वसा डालकर 5 मिनट में एकसमान मिश्रण बनाएं।
                      </div>

                      {/* Mixer Operator Feedback Form */}
                      <div className="bg-[#0D1520] border-2 border-[#00F0FF]/60 rounded-xl p-4 md:p-5 flex flex-col gap-4 shadow-xl">
                        <div className="flex items-center justify-between border-b border-gray-800 pb-3">
                          <div className="flex items-center gap-2">
                            <MessageSquare className="w-5 h-5 text-[#00F0FF]" />
                            <h5 className="text-sm font-black text-white uppercase font-display tracking-wide">
                              मिक्सर ऑपरेटर गुणवत्ता फीडबैक (OPERATOR QUALITY SIGN-OFF)
                            </h5>
                          </div>
                          <span className="text-[10px] font-mono bg-cyan-500/20 text-[#00F0FF] border border-[#00F0FF]/40 px-2 py-0.5 rounded font-bold uppercase">
                            MANDATORY
                          </span>
                        </div>

                        {/* Texture */}
                        <div className="flex flex-col gap-2">
                          <label className="text-xs font-mono text-gray-300 font-bold uppercase flex items-center justify-between">
                            <span>1. मिश्रण की बनावट (Texture & Consistency):</span>
                            <span className="text-[#00F0FF] text-[10px]">{mixerFeedbackTexture}</span>
                          </label>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 font-mono text-xs">
                            {(['Smooth Homogeneous', 'Slightly Grainy', 'Too Dry', 'Too Sticky'] as const).map(tex => (
                              <button
                                key={tex}
                                type="button"
                                onClick={() => setMixerFeedbackTexture(tex)}
                                className={`p-2 rounded border transition text-left ${
                                  mixerFeedbackTexture === tex
                                    ? 'bg-[#00F0FF]/20 border-[#00F0FF] text-white font-bold'
                                    : 'bg-black/40 border-gray-800 text-gray-400 hover:text-gray-200'
                                }`}
                              >
                                {tex}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Rating */}
                        <div className="flex flex-col gap-2">
                          <label className="text-xs font-mono text-gray-300 font-bold uppercase">
                            2. गुणवत्ता रेटिंग (Batch Quality Rating):
                          </label>
                          <div className="flex items-center gap-2">
                            <div className="flex gap-1">
                              {[1, 2, 3, 4, 5].map(star => (
                                <button
                                  key={star}
                                  type="button"
                                  onClick={() => setMixerFeedbackRating(star)}
                                  className="p-1 hover:scale-110 transition"
                                >
                                  <Star 
                                    className={`w-6 h-6 ${
                                      star <= mixerFeedbackRating 
                                        ? 'text-amber-400 fill-amber-400 filter drop-shadow-[0_0_6px_rgba(245,158,11,0.5)]' 
                                        : 'text-gray-700'
                                    }`} 
                                  />
                                </button>
                              ))}
                            </div>
                            <span className="text-xs font-mono text-gray-400 ml-3">
                              {mixerFeedbackRating} / 5 Stars
                            </span>
                          </div>
                        </div>

                        {/* Complete Button */}
                        <button
                          onClick={() => handleWorkerCompleteOrder('Success')}
                          className="w-full bg-gradient-to-r from-[#00F0FF] via-cyan-400 to-teal-400 hover:from-cyan-400 hover:to-teal-300 text-black py-4 px-6 rounded-xl font-black font-mono text-base transition shadow-xl shadow-cyan-500/25 active:scale-[0.99] flex items-center justify-center gap-3 tracking-wider mt-1"
                        >
                          <ClipboardCheck className="w-5 h-5 text-black" />
                          <span>फीडबैक दर्ज कर बैच पूरा करें (SUBMIT & COMPLETE BATCH)</span>
                          <ChevronRight className="w-5 h-5 text-black" />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Fault / Release Controls */}
                  <div className="flex items-center justify-between border-t border-gray-850 pt-4 mt-2 font-mono text-xs">
                    <button
                      onClick={() => {
                        const reason = prompt("Enter failure downtime reason:", isGrinder ? "Maize Mill Sieve Blockage" : "Viscosity Overload");
                        if (reason !== null) {
                          handleWorkerCompleteOrder('Failed');
                        }
                      }}
                      className="text-red-400 hover:text-red-300 flex items-center gap-1.5 py-1.5 px-3 rounded border border-red-900/40 hover:bg-red-950/30 transition"
                    >
                      <XCircle className="w-4 h-4" />
                      Report Fault / Jam
                    </button>

                    <button 
                      onClick={() => {
                        setActiveWorkerOrderId(null);
                        setWorkerUnitsProducedInput(0);
                      }}
                      className="text-gray-500 hover:text-gray-300 underline"
                    >
                      Return Batch to Queue
                    </button>
                  </div>

                </div>
              </div>
            ) : (
              /* Idle state when waiting for order */
              <div className={`p-8 rounded-2xl border ${isGrinder ? 'bg-[#14120D] border-amber-500/30' : 'bg-[#0E131A] border-[#00F0FF]/30'} shadow-xl text-center flex flex-col items-center justify-center min-h-[400px]`}>
                <Layers className={`w-16 h-16 ${isGrinder ? 'text-amber-500/40' : 'text-[#00F0FF]/40'} mb-4`} />
                <h3 className="text-xl font-black text-white">कंसोल से आदेश की प्रतीक्षा / WAITING FOR DISPATCH</h3>
                <p className="text-xs text-gray-400 font-mono mt-1 max-w-md">
                  Select an active batch from the production queue on the left to view recipe formula and begin processing.
                </p>
              </div>
            )}
          </div>

        </main>

        <footer className={`border-t ${isGrinder ? 'border-amber-500/30 bg-[#14120D]' : 'border-[#00F0FF]/30 bg-[#0E131A]'} py-3 px-6 text-center mt-auto`}>
          <p className="text-[10px] text-gray-500 font-mono uppercase tracking-wider">
            Safe Inventory // Industrial Floor Terminal • {isGrinder ? '1. Grinder Kiosk' : '2. Mixer Kiosk'}
          </p>
        </footer>
      </div>
    );
  }

  // ----------------------------------------------------
  // ADMIN DASHBOARD VIEW
  // ----------------------------------------------------
  return (
    <div className="min-h-screen bg-[#0F1115] text-[#D1D4DC] flex flex-col font-sans selection:bg-[#00F0FF] selection:text-black">
      {/* 1. STRUCTURAL ENTERPRISE HEADER */}
      <header className="border-b-2 border-industrial-border bg-[#0B0D10] text-[#E2E8F0] py-4 px-6 sticky top-0 z-50 shadow-lg select-none">
        <div className="max-w-[1500px] mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          {/* Logo Brand Brand */}
          <div className="flex items-center gap-3">
            <div className="p-2 border border-[#00F0FF]/30 bg-[#00F0FF]/10 rounded">
              <Cpu className="h-6 w-6 text-industrial-accent animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs bg-[#00F0FF]/25 text-industrial-accent px-2 py-0.5 rounded font-mono font-bold tracking-widest uppercase">
                  Companion Console
                </span>
                <span className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded font-mono">v2.0-Remodeled</span>
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
              <Wifi className="w-4 h-4 text-industrial-success animate-pulse" />
              <span>UPLINK STATUS:</span>
              <span className="font-bold text-industrial-success glow-text-success">
                ONLINE SYNC
              </span>
            </div>

            {/* Tailscale Network Status */}
            <div className="flex items-center gap-2 bg-[#141822] border border-emerald-500/40 px-3 py-1.5 rounded">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="text-gray-400">TAILSCALE:</span>
              <span className="font-bold text-emerald-400 font-mono">
                {tailscaleIp || '100.99.115.49'}
              </span>
            </div>

            {/* User Profile & Logout */}
            {currentUser && (
              <div className="flex items-center gap-2 bg-[#141822] border border-cyan-500/30 px-3 py-1.5 rounded">
                <div className="w-2 h-2 rounded-full bg-cyan-400"></div>
                <span className="text-gray-300 font-bold">{currentUser.name || currentUser.username}</span>
                <span className="text-[10px] text-cyan-400 bg-cyan-500/10 px-1.5 py-0.5 rounded font-mono uppercase">{currentUser.role}</span>
                <button
                  onClick={handleLogout}
                  title="लॉगआउट / Logout"
                  className="ml-2 p-1 hover:bg-red-500/20 text-gray-400 hover:text-red-400 rounded transition flex items-center gap-1 text-xs"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Logout</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* MAIN CONTAINER LAYOUT */}
      <div className="max-w-[1500px] mx-auto w-full p-4 md:p-6 flex-1 flex flex-col gap-6">
        
        {/* 2. TAB TOGGLES BLOCK */}
        <div className="flex justify-between items-center flex-wrap gap-4 border-b border-industrial-border pb-2">
          {/* Main Toggles */}
          <div className="flex flex-wrap gap-2">
            {currentUser?.role === 'inventory-manager' ? (
              <button
                onClick={() => setActiveTab('inventory')}
                className="px-4 py-2 text-sm font-mono font-semibold uppercase tracking-wider border transition-all bg-emerald-500 text-black border-emerald-500 font-bold shadow-md shadow-emerald-500/20"
              >
                🌾 Inventory Management (स्टॉक प्रबंधन)
              </button>
            ) : (
              <>
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
                  onClick={() => setActiveTab('inventory')}
                  className={`px-4 py-2 text-sm font-mono font-semibold uppercase tracking-wider border transition-all ${
                    activeTab === 'inventory'
                      ? 'bg-industrial-accent text-black border-industrial-accent font-bold shadow-md shadow-industrial-accent/20'
                      : 'bg-[#161920] text-gray-400 border-industrial-border hover:text-white hover:border-gray-500'
                  }`}
                >
                  🌾 Inventory Management
                </button>
                <button
                  onClick={() => setActiveTab('users')}
                  className={`px-4 py-2 text-sm font-mono font-semibold uppercase tracking-wider border transition-all ${
                    activeTab === 'users'
                      ? 'bg-industrial-accent text-black border-industrial-accent font-bold shadow-md shadow-industrial-accent/20'
                      : 'bg-[#161920] text-gray-400 border-industrial-border hover:text-white hover:border-gray-500'
                  }`}
                >
                  👥 User Management
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
              </>
            )}
          </div>

          {/* Quick Stats Summary badges */}
          <div className="flex items-center gap-3 text-xs font-mono">
            <span className="text-gray-500">QUICK COMPLIANCE:</span>
            <span className="bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30 px-2 py-1 rounded">
              SUCCESS RATE: {successRatio}%
            </span>
            <span className="bg-[#FF6B00]/15 text-[#FF6B00] border border-[#FF6B00]/30 px-2 py-1 rounded">
              TOTAL COMPLETED: {totalUnitsProduced.toLocaleString()} units
            </span>
          </div>
        </div>

        {/* 3. ACTIVE SCENE VIEWPORTS */}
        
        {/* TAB 1: LIVE CONTROL TERMINAL */}
        {activeTab === 'dashboard' && (
          <div className="flex flex-col gap-6">
            {stationsOnBreak.length > 0 && (
              <div className="bg-[#1E1010] border-2 border-red-500/40 p-4 rounded-xl flex items-center gap-3 animate-pulse shadow-lg">
                <span className="text-xl">⚠️</span>
                <div className="flex-1">
                  <h4 className="text-xs font-bold text-red-400 uppercase tracking-wider font-mono">
                    OPERATOR LUNCH BREAK ALERT
                  </h4>
                  <p className="text-xs text-gray-300 font-mono mt-0.5">
                    {stationsOnBreak.map(s => {
                      const timeStr = s.breakStartedAt ? new Date(s.breakStartedAt).toLocaleTimeString() : 'Unknown';
                      return `${s.stationId} is on break (since ${timeStr})`;
                    }).join(', ')}
                  </p>
                </div>
              </div>
            )}
            
            {/* THREE METRICS ROW */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Card 1: Time Since Last Update */}
              <div className="bg-gradient-to-br from-[#161920] to-[#0D1016] border-2 border-industrial-border hover:border-industrial-accent/40 rounded-xl p-6 shadow-xl relative overflow-hidden transition-all duration-300 group">
                <div className="absolute top-0 right-0 w-24 h-24 bg-industrial-accent/5 rounded-full filter blur-xl pointer-events-none group-hover:bg-industrial-accent/10 transition-all duration-300"></div>
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-xs font-mono font-semibold tracking-wider text-gray-400 uppercase">TIME SINCE LAST UPDATE</span>
                    <div className="text-2xl md:text-3xl font-black text-white font-mono tracking-tight mt-2 glow-text-cyan">
                      {timeSinceLastUpdate}
                    </div>
                  </div>
                  <div className="p-2 border border-industrial-accent/20 bg-industrial-accent/10 rounded-lg">
                    <Clock className="w-5 h-5 text-industrial-accent animate-pulse" />
                  </div>
                </div>
                <p className="text-[10px] text-gray-550 font-mono text-gray-500 mt-4 uppercase">
                  Dynamic interval reading since latest floor checkin
                </p>
              </div>

              {/* Card 2: Batches Completed */}
              <div className="bg-gradient-to-br from-[#161920] to-[#0D1016] border-2 border-industrial-border hover:border-industrial-success/40 rounded-xl p-6 shadow-xl relative overflow-hidden transition-all duration-300 group">
                <div className="absolute top-0 right-0 w-24 h-24 bg-industrial-success/5 rounded-full filter blur-xl pointer-events-none group-hover:bg-industrial-success/10 transition-all duration-300"></div>
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-xs font-mono font-semibold tracking-wider text-gray-400 uppercase">BATCHES DONE</span>
                    <div className="text-3xl md:text-4xl font-black text-white font-mono tracking-tight mt-2 glow-text-success">
                      {batchesDoneCount}
                    </div>
                  </div>
                  <div className="p-2 border border-[#10B981]/20 bg-[#10B981]/10 rounded-lg">
                    <CheckCircle2 className="w-5 h-5 text-[#10B981]" />
                  </div>
                </div>
                <p className="text-[10px] text-gray-500 font-mono mt-4 uppercase">
                  Successful floor runs pushed to SQLite database
                </p>
              </div>

              {/* Card 3: Batches Ordered */}
              <div className="bg-gradient-to-br from-[#161920] to-[#0D1016] border-2 border-industrial-border hover:border-industrial-safety/40 rounded-xl p-6 shadow-xl relative overflow-hidden transition-all duration-300 group">
                <div className="absolute top-0 right-0 w-24 h-24 bg-industrial-safety/5 rounded-full filter blur-xl pointer-events-none group-hover:bg-industrial-safety/10 transition-all duration-300"></div>
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-xs font-mono font-semibold tracking-wider text-gray-400 uppercase">BATCHES ORDERED</span>
                    <div className="text-3xl md:text-4xl font-black text-white font-mono tracking-tight mt-2 glow-text-orange">
                      {batchesOrderedCount}
                    </div>
                  </div>
                  <div className="p-2 border border-[#FF6B00]/20 bg-[#FF6B00]/10 rounded-lg">
                    <Layers className="w-5 h-5 text-industrial-safety" />
                  </div>
                </div>
                <p className="text-[10px] text-gray-500 font-mono mt-4 uppercase">
                  Total preset dispatches triggered by admin panel
                </p>
              </div>

            </div>

            {/* MAIN TWO COLUMN LAYOUT */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* COLUMN 1 & 2: RECIPE DISPATCHER & FLOORS MONITOR */}
              <div className="lg:col-span-2 flex flex-col gap-6">
                
                {/* PRESET RECIPE DISPATCHER PANEL */}
                <div className="bg-industrial-card border-2 border-industrial-border rounded-xl shadow-lg overflow-hidden flex flex-col">
                  <div className="bg-[#0B0D10] border-b-2 border-industrial-border p-4 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <Layers className="h-5 w-5 text-industrial-accent" />
                      <h2 className="text-base font-black tracking-tight text-white uppercase font-display">
                        PRESET RECIPE DISPATCH CONSOLE
                      </h2>
                    </div>
                    <span className="text-[10px] font-mono bg-industrial-accent/10 border border-industrial-accent/20 text-industrial-accent px-2 py-0.5 rounded font-bold">
                      ADMIN REMOTE ORDER
                    </span>
                  </div>

                  <form onSubmit={handlePlaceOrder} className="p-6 flex flex-col md:flex-row gap-6 items-end bg-[#11141B]">
                    {/* Selector Preset */}
                    <div className="flex-1 flex flex-col gap-2 text-xs font-mono w-full">
                      <label className="text-gray-400 font-bold uppercase tracking-wider">Select Preset Recipe Formula:</label>
                      <select 
                        value={selectedProductId}
                        onChange={(e) => {
                          const nextId = e.target.value;
                          setSelectedProductId(nextId);
                          if (productionMode === 'batches') {
                            handleBatchesChange(orderTargetBatches, nextId);
                          } else {
                            handleUnitsChange(orderTargetUnits, nextId);
                          }
                        }}
                        className="bg-[#0B0D10] text-white border-2 border-industrial-border px-3 py-3 rounded-lg w-full font-mono text-sm focus:border-industrial-accent outline-none cursor-pointer"
                      >
                        {products.map(p => (
                          <option key={p.id} value={p.id}>
                            {p.englishName} ({p.name}) [Batch Time: {p.nominalBatchDurationSec ? (p.nominalBatchDurationSec / 60).toFixed(1) : '8.0'} min]
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Mode Toggle */}
                    <div className="flex flex-col gap-2 text-xs font-mono w-full md:w-auto">
                      <label className="text-gray-400 font-bold uppercase tracking-wider">Production Mode:</label>
                      <div className="flex bg-[#0B0D10] border-2 border-industrial-border p-1 rounded-lg">
                        <button
                          type="button"
                          onClick={() => setProductionMode('weight')}
                          className={`px-3 py-1.5 rounded-md font-bold text-xs uppercase transition-all ${
                            productionMode === 'weight'
                              ? 'bg-industrial-accent text-black font-black'
                              : 'text-gray-400 hover:text-white'
                          }`}
                        >
                          Weight-Wise
                        </button>
                        <button
                          type="button"
                          onClick={() => setProductionMode('batches')}
                          className={`px-3 py-1.5 rounded-md font-bold text-xs uppercase transition-all ${
                            productionMode === 'batches'
                              ? 'bg-industrial-accent text-black font-black'
                              : 'text-gray-400 hover:text-white'
                          }`}
                        >
                          Batch-Wise
                        </button>
                      </div>
                    </div>

                    {/* Quantity Demand Input (Weight or Batch) */}
                    {productionMode === 'weight' ? (
                      <div className="flex-1 flex flex-col gap-2 text-xs font-mono w-full">
                        <label className="text-gray-400 font-bold uppercase tracking-wider">Target Units Demand ({orderTargetWeightUnit}):</label>
                        <div className="flex gap-2">
                          <input
                            type="number"
                            step={orderTargetWeightUnit === 'tonnes' ? "0.001" : "1"}
                            value={orderTargetWeightUnit === 'tonnes' ? parseFloat((orderTargetUnits / 1000).toFixed(3)) : orderTargetUnits}
                            onChange={(e) => {
                              const rawVal = parseFloat(e.target.value) || 0;
                              const valInKg = orderTargetWeightUnit === 'tonnes' ? Math.round(rawVal * 1000) : Math.round(rawVal);
                              handleUnitsChange(valInKg);
                            }}
                            className="bg-[#0B0D10] text-white border-2 border-industrial-border px-3 py-3 rounded-lg flex-1 font-mono text-sm focus:border-industrial-accent outline-none"
                          />
                          <select
                            value={orderTargetWeightUnit}
                            onChange={(e) => setOrderTargetWeightUnit(e.target.value as 'kg' | 'tonnes')}
                            className="bg-[#0B0D10] text-white border-2 border-industrial-border px-2 py-3 rounded-lg font-mono text-sm focus:border-industrial-accent outline-none cursor-pointer"
                          >
                            <option value="kg">kg</option>
                            <option value="tonnes">Tonnes</option>
                          </select>
                          <button
                            type="button"
                            onClick={() => handleUnitsChange(Math.max(1000, orderTargetUnits - 1000))}
                            className="bg-gray-800 hover:bg-gray-700 border border-gray-700 text-white px-3 py-1 rounded text-xs font-bold font-mono"
                          >
                            -1K
                          </button>
                          <button
                            type="button"
                            onClick={() => handleUnitsChange(orderTargetUnits + 1000)}
                            className="bg-gray-800 hover:bg-gray-700 border border-gray-700 text-white px-3 py-1 rounded text-xs font-bold font-mono"
                          >
                            +1K
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex-1 flex flex-col gap-2 text-xs font-mono w-full">
                        <label className="text-gray-400 font-bold uppercase tracking-wider">Target Batch Count:</label>
                        <div className="flex gap-2">
                          <input
                            type="number"
                            value={orderTargetBatches}
                            onChange={(e) => handleBatchesChange(Math.max(1, parseInt(e.target.value) || 0))}
                            className="bg-[#0B0D10] text-white border-2 border-industrial-border px-3 py-3 rounded-lg flex-1 font-mono text-sm focus:border-industrial-accent outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => handleBatchesChange(Math.max(1, orderTargetBatches - 1))}
                            className="bg-gray-800 hover:bg-gray-700 border border-gray-700 text-white px-3 py-1 rounded text-xs font-bold font-mono"
                          >
                            -1
                          </button>
                          <button
                            type="button"
                            onClick={() => handleBatchesChange(orderTargetBatches + 1)}
                            className="bg-gray-800 hover:bg-gray-700 border border-gray-700 text-white px-3 py-1 rounded text-xs font-bold font-mono"
                          >
                            +1
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Submit Order */}
                    <button
                      type="submit"
                      className="bg-gradient-to-r from-industrial-accent to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-black font-black font-mono text-xs py-3 px-6 rounded-lg transition-all tracking-wider shadow-lg shadow-cyan-950/20 w-full md:w-auto h-[48px] uppercase flex items-center justify-center gap-1.5"
                    >
                      <Plus className="w-4 h-4 text-black" strokeWidth={3} />
                      Order Recipe
                    </button>
                  </form>
                </div>

                 {/* ACTIVE FLOOR ORDERS QUEUE */}
                <div className="bg-industrial-card border-2 border-industrial-border rounded-xl shadow-lg overflow-hidden flex flex-col">
                  <div className="bg-[#0B0D10] border-b-2 border-industrial-border p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <h3 className="text-base font-black tracking-tight text-white uppercase font-display flex items-center gap-2">
                      <Terminal className="h-5 w-5 text-industrial-accent" />
                      ACTIVE FLOOR ASSEMBLY QUEUE
                    </h3>
                    <div className="flex items-center gap-4">
                      <div className="flex bg-[#161920] border border-industrial-border p-0.5 rounded-lg text-[10px] font-mono">
                        <button
                          type="button"
                          onClick={() => setAdminQueueFilter('active')}
                          className={`px-3 py-1.5 rounded transition-all font-bold ${
                            adminQueueFilter === 'active'
                              ? 'bg-industrial-accent text-black font-black'
                              : 'text-gray-400 hover:text-white'
                          }`}
                        >
                          Active / Pending
                        </button>
                        <button
                          type="button"
                          onClick={() => setAdminQueueFilter('today')}
                          className={`px-3 py-1.5 rounded transition-all font-bold ${
                            adminQueueFilter === 'today'
                              ? 'bg-industrial-accent text-black font-black'
                              : 'text-gray-400 hover:text-white'
                          }`}
                        >
                          Today's Entire Queue
                        </button>
                      </div>
                      <span className="text-[10px] font-mono text-gray-500 hidden md:inline">SYNCED IN REAL-TIME</span>
                    </div>
                  </div>

                  <div className="p-6">
                    <div className="w-full overflow-x-auto rounded border border-industrial-border">
                      <table className="w-full text-left font-mono text-xs border-collapse">
                        <thead>
                          <tr className="bg-[#0B0D10] text-[#868A94] uppercase tracking-wider text-[10px] border-b border-industrial-border">
                            <th className="p-4 w-10"></th>
                            <th className="p-4">ORDER ID</th>
                            <th className="p-4">RECIPE DETAILS</th>
                            <th className="p-4">PROGRESS (PRODUCED/TARGET)</th>
                            <th className="p-4">ASSIGNED LINE</th>
                            <th className="p-4">STATUS</th>
                            <th className="p-4 text-right">ACTIONS</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-850">
                          {(() => {
                            const filteredOrders = orders.filter(o => {
                              if (adminQueueFilter === 'active') {
                                  return o.status === 'Pending' || o.status === 'In Progress';
                              } else {
                                return new Date(o.timestamp).toDateString() === new Date().toDateString();
                              }
                            });

                            if (filteredOrders.length === 0) {
                              return (
                                <tr>
                                  <td colSpan={7} className="text-center p-8 text-gray-500 italic">
                                    {adminQueueFilter === 'active' 
                                      ? 'NO ACTIVE FLOOR ORDERS. DISPATCH A RECIPE ABOVE TO START.'
                                      : 'NO ORDERS PLACED TODAY.'}
                                  </td>
                                </tr>
                              );
                            }

                            return filteredOrders.map(o => (
                              <tr
                                key={o.id}
                                className={`hover:bg-[#12141C] transition-all border-b border-gray-850/30 ${o.status === 'Pending' ? 'cursor-move' : ''} ${
                                  draggedOrderId === o.id ? 'opacity-40 bg-[#0B0D10]' : ''
                                }`}
                                draggable={o.status === 'Pending'}
                                onDragStart={(e) => {
                                  if (o.status !== 'Pending') {
                                    e.preventDefault();
                                    return;
                                  }
                                  handleDragStart(e, o.id);
                                }}
                                onDragOver={handleDragOver}
                                onDragEnd={handleDragEnd}
                                onDrop={(e) => {
                                  if (o.status !== 'Pending') return;
                                  handleDrop(e, o.id);
                                }}
                              >
                                <td className="p-4 text-center">
                                  {o.status === 'In Progress' ? (
                                    <span title="Locked - Processing"><Lock className="w-3.5 h-3.5 text-red-500/60" /></span>
                                  ) : o.status === 'Pending' ? (
                                    <GripVertical className="w-4 h-4 text-gray-500 hover:text-industrial-accent cursor-grab active:cursor-grabbing" />
                                  ) : (
                                    <span className="text-gray-650 font-mono text-[9px]">-</span>
                                  )}
                                </td>
                                <td className="p-4 font-bold text-white tracking-widest">{o.id}</td>
                                <td className="p-4">
                                  <div className="text-sm font-semibold text-[#D1D4DC]">{o.recipeName}</div>
                                  <div className="text-xs text-gray-500">{o.recipeHindiName}</div>
                                </td>
                                <td className="p-4 w-64">
                                  <div className="flex justify-between items-center mb-1 text-[10px] text-gray-400">
                                    <span>{o.unitsProduced.toLocaleString()} units</span>
                                    <span>{Math.round((o.unitsProduced / o.targetUnits) * 100)}%</span>
                                  </div>
                                  <div className="w-full bg-gray-900 h-2 rounded overflow-hidden border border-gray-800">
                                    <div 
                                      className={`h-full transition-all duration-300 ${
                                        o.status === 'In Progress' ? 'bg-[#FF6B00]' : 
                                        o.status === 'Completed' ? 'bg-industrial-success' :
                                        o.status === 'Failed' ? 'bg-red-500' :
                                        'bg-yellow-500'
                                      }`} 
                                      style={{ width: `${Math.min(100, (o.unitsProduced / o.targetUnits) * 100)}%` }}
                                    ></div>
                                  </div>
                                </td>
                                <td className="p-4 text-gray-400 font-bold">{o.line || 'Not started'}</td>
                                <td className="p-4">
                                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[10.5px] font-bold border ${
                                    o.status === 'In Progress' 
                                      ? 'bg-[#FF6B00]/15 text-[#FF6B00] border-[#FF6B00]/20 glow-text-orange' 
                                      : o.status === 'Completed'
                                      ? 'bg-industrial-success/15 text-industrial-success border-industrial-success/20'
                                      : o.status === 'Failed'
                                      ? 'bg-red-500/15 text-red-500 border-red-500/20'
                                      : 'bg-yellow-500/15 text-yellow-500 border-yellow-500/20'
                                  }`}>
                                    <span className={`w-1.5 h-1.5 rounded-full ${
                                      o.status === 'In Progress' ? 'bg-[#FF6B00] animate-pulse' : 
                                      o.status === 'Completed' ? 'bg-industrial-success' : 
                                      o.status === 'Failed' ? 'bg-red-500' : 'bg-yellow-500'
                                    }`}></span>
                                    {o.status === 'In Progress' ? 'IN PROGRESS' : 
                                     o.status === 'Completed' ? 'COMPLETED' : 
                                     o.status === 'Failed' ? 'FAILED' : 'QUEUED / PENDING'}
                                  </span>
                                </td>
                                <td className="p-4 text-right">
                                  <div className="flex gap-2 justify-end">
                                    {o.status === 'Pending' && (
                                      <button
                                        onClick={() => handleDispatchOrder(o.id)}
                                        className="bg-industrial-accent hover:bg-cyan-400 text-black font-bold font-mono text-[10px] px-2.5 py-1.5 rounded transition active:scale-95 inline-flex items-center gap-1 uppercase"
                                      >
                                        <Play className="w-3 h-3 fill-black text-black" />
                                        Dispatch
                                      </button>
                                    )}
                                    <button
                                      onClick={async () => {
                                        const confirmText = o.status === 'Completed' || o.status === 'Failed' ? 'Delete' : 'Cancel';
                                        if (window.confirm(`CONFIRM: ${confirmText} order ${o.id}?`)) {
                                          try {
                                            const res = await customFetch(`/api/orders/${o.id}`, {
                                              method: 'DELETE'
                                            });
                                            if (res.ok) {
                                              fetchOrders();
                                            }
                                          } catch (err) {
                                            console.error("Failed to delete order:", err);
                                          }
                                        }
                                      }}
                                      className="bg-red-500/20 hover:bg-red-500 text-red-400 hover:text-white border border-red-500/40 px-2 py-1 rounded text-[10.5px] font-black font-mono transition-all uppercase"
                                    >
                                      {o.status === 'Completed' || o.status === 'Failed' ? 'Delete' : 'Cancel'}
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ));
                          })()}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

              </div>

              {/* COLUMN 3: ADMIN QUICK COMMANDS */}
              <div className="flex flex-col gap-6">

                {/* QUICK RUN COMMANDS */}
                <div className="bg-industrial-card border-2 border-industrial-border p-6 rounded-xl flex flex-col gap-4 shadow-lg">
                  <h3 className="text-base font-black tracking-tight text-white uppercase font-display flex items-center gap-2">
                    <Settings className="h-5 w-5 text-industrial-accent" />
                    ADMIN COMMANDS
                  </h3>

                  <div className="flex flex-col gap-3 font-mono">
                    <button
                      onClick={handleClearAllLogs}
                      className="w-full text-left bg-[#1B1D25] hover:bg-industrial-danger/10 p-3 rounded border border-industrial-border hover:border-industrial-danger transition-all text-xs flex justify-between items-center group text-gray-300 hover:text-industrial-danger"
                    >
                      <div>
                        <span className="font-bold block uppercase tracking-wide">CLEAR LOGS HISTORY</span>
                        <span className="text-[10px] text-gray-500 group-hover:text-industrial-danger/75">Drops logged batch transactions</span>
                      </div>
                      <Trash2 className="w-4 h-4 text-gray-500 group-hover:text-industrial-danger" />
                    </button>

                    <button
                      onClick={handleReseedData}
                      className="w-full text-left bg-[#1B1D25] hover:bg-industrial-accent/10 p-3 rounded border border-industrial-border hover:border-industrial-accent transition-all text-xs flex justify-between items-center group text-gray-300 hover:text-industrial-accent"
                    >
                      <div>
                        <span className="font-bold block uppercase tracking-wide">RESEED DEFAULT DATASETS</span>
                        <span className="text-[10px] text-gray-500 group-hover:text-industrial-accent/75">Re-populates formulas & logs</span>
                      </div>
                      <RefreshCw className="w-4 h-4 text-gray-500 group-hover:text-industrial-accent" />
                    </button>
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
                  const ids = products.map(p => {
                    const match = p.id.match(/^PRD-(\d+)$/i);
                    return match ? parseInt(match[1], 10) : 0;
                  });
                  const maxId = ids.length > 0 ? Math.max(...ids) : 0;
                  const nextIdVal = maxId + 1;
                  const nextId = `PRD-${String(nextIdVal).padStart(3, '0')}`;
                  
                  setNewProductId(nextId);
                  setNewProductName("");
                  setNewProductEnglishName("");
                  setNewProductBatchTimeMin(8.0);
                  setNewProductColor("#00F0FF");
                  setNewProductManual("");
                  setIsHindiNameManuallyEdited(false);
                  const ingredientMap: {[key: string]: number} = {};
                  inventory.filter(item => item.type === 'raw_material').forEach(ing => {
                    ingredientMap[ing.id] = 0;
                  });
                  setRecipeIngredients(ingredientMap);
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
              
              <div className="flex gap-6 overflow-x-auto pb-4 pt-1 snap-x scrollbar-thin scrollbar-thumb-industrial-accent/30 scrollbar-track-black/40">
                {products.length === 0 ? (
                  <div className="w-full py-12 text-center text-gray-500 border border-dashed border-gray-800 rounded">
                    <FolderPlaceholder />
                    <p className="mt-2 text-sm text-gray-500 font-mono">NO ACTIVE FORMULAS IN DIRECTORY REGISTER</p>
                  </div>
                ) : (
                  products.map(p => (
                    <div 
                      key={p.id} 
                      className="bg-[#12141C] border border-industrial-border rounded overflow-hidden flex flex-col relative min-w-[320px] max-w-[360px] shrink-0 snap-start shadow-md hover:border-industrial-accent/50 transition-all"
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
                            <span className="text-gray-500">PER BATCH TIME:</span>
                            <span className="text-white font-bold">
                              {p.nominalBatchDurationSec ? (p.nominalBatchDurationSec / 60).toFixed(1) : '8.0'} min
                            </span>
                          </div>
                          
                          <div className="flex justify-between items-center">
                            <span className="text-gray-500">DOCUMENT MANUAL:</span>
                            {p.manualFileName ? (
                              <span className="text-industrial-accent flex items-center gap-1 text-[11px] truncate max-w-[170px]" title={p.manualFileName}>
                                <BookOpen className="w-3.5 h-3.5 shrink-0" />
                                <span className="truncate">{p.manualFileName}</span>
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
                            className="text-gray-400 hover:text-industrial-accent font-semibold flex items-center gap-1 px-2.5 py-1.5 rounded bg-gray-900 hover:bg-gray-800 border border-gray-800 transition text-xs font-mono"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            EDIT
                          </button>
                          
                          <button
                            onClick={() => handleDeleteProduct(p.id)}
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
                <input
                  type="text"
                  placeholder="QUERY BATCH OR MIXTURE..."
                  value={searchLog}
                  onChange={(e) => setSearchLog(e.target.value)}
                  className="bg-[#11141C] border border-industrial-border text-white rounded px-3 py-2 w-52 outline-none focus:border-industrial-accent"
                />

                <select
                  value={lineFilter}
                  onChange={(e) => setLineFilter(e.target.value)}
                  className="bg-[#11141C] border border-industrial-border text-white rounded px-3 py-2 w-44 outline-none focus:border-industrial-accent cursor-pointer"
                >
                  <option value="ALL">FILTER ALL LINES</option>
                  <option value="Line A">Line A (Manual Assembly)</option>
                  <option value="Line B">Line B (Auto Injection)</option>
                  <option value="Line C">Line C (Extrusion Sinter)</option>
                </select>

                <button
                  onClick={handleClearAllLogs}
                  className="bg-industrial-danger/10 text-industrial-danger hover:bg-industrial-danger hover:text-white border border-industrial-danger/30 hover:border-industrial-danger transition px-4 py-2 rounded text-xs font-mono font-bold uppercase tracking-wider h-9"
                >
                  CLEAR LOGS HISTORY
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
                      <th className="p-4">FEEDBACK & OPERATOR SIGN-OFF</th>
                      <th className="p-4">STATUS</th>
                      <th className="p-4">LOG TIMESTAMP</th>
                    </tr>
                  </thead>
                  
                  <tbody className="divide-y divide-gray-850">
                    {filteredLogs.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="text-center p-8 text-gray-500 italic">
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
                            {l.stage === 'grinder' || l.batchId.includes('-GRIND') ? (
                              <div className="flex flex-col gap-0.5">
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-400 bg-amber-950/40 border border-amber-800/40 px-2 py-0.5 rounded w-fit">
                                  🌾 120 kg Pulverized (&lt; 200 µm)
                                </span>
                                <span className="text-[10px] text-gray-500 font-mono">Checklist only • In pipeline to Mixer</span>
                              </div>
                            ) : (
                              <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-amber-400 font-bold text-[11px]">
                                    {'★'.repeat(l.feedbackRating || 5)}{'☆'.repeat(Math.max(0, 5 - (l.feedbackRating || 5)))}
                                  </span>
                                  <span className="text-[10px] font-bold bg-cyan-950/50 text-[#00F0FF] border border-[#00F0FF]/30 px-1.5 py-0.2 rounded">
                                    {l.feedbackQuality || 'Grade A - Optimal'}
                                  </span>
                                </div>
                                {l.feedbackTexture && (
                                  <span className="text-[10px] text-gray-300 font-mono">
                                    Texture: <strong className="text-white">{l.feedbackTexture}</strong>
                                  </span>
                                )}
                                {l.feedbackNotes && (
                                  <span className="text-[10px] text-cyan-300/80 italic font-mono truncate max-w-xs" title={l.feedbackNotes}>
                                    "{l.feedbackNotes}"
                                  </span>
                                )}
                              </div>
                            )}
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
                          <td className="p-4 text-gray-400 font-medium">
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

        {/* TAB 3.5: INVENTORY MANAGEMENT */}
        {activeTab === 'inventory' && (
          <div className="flex flex-col gap-6 animate-in fade-in duration-200">
            <div className="bg-[#12151C] border-2 border-industrial-border p-6 rounded-xl shadow-lg">
              <h2 className="text-lg font-black text-white uppercase font-display flex items-center gap-2">
                <Layers className="h-6 w-6 text-industrial-accent" />
                Raw Materials & Finished Goods Inventory
              </h2>
              <p className="text-xs text-gray-400 font-mono mt-0.5">
                Real-time tracking of raw material inputs consumed and finished output batches registered.
              </p>
            </div>

            {/* Quick stock adjustment form */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Input Raw Materials */}
              <div className="bg-industrial-card border-2 border-industrial-border p-6 rounded-xl flex flex-col gap-4 shadow-lg">
                <div className="flex justify-between items-center border-b border-industrial-border pb-2">
                  <h3 className="text-sm font-bold text-white font-mono tracking-widest uppercase text-industrial-accent">
                    🌾 Input Raw Materials (Consumables)
                  </h3>
                  <button
                    onClick={() => {
                      const materialIds = inventory
                        .filter(item => item.type === 'raw_material')
                        .map(item => {
                          const match = item.id.match(/^ING-(\d+)$/i);
                          return match ? parseInt(match[1], 10) : 0;
                        });
                      const maxMatId = materialIds.length > 0 ? Math.max(...materialIds) : 0;
                      const nextMatIdVal = maxMatId + 1;
                      const nextMatIdStr = String(nextMatIdVal).padStart(3, '0');
                      
                      setNewMaterialId(nextMatIdStr);
                      setNewMaterialName("");
                      setNewMaterialHindiName("");
                      setNewMaterialStock(0);
                      setNewMaterialUnit("kg");
                      setNewMaterialMinStock(100);
                      setIsMaterialHindiNameManuallyEdited(false);
                      setShowAddMaterialModal(true);
                    }}
                    className="bg-industrial-accent text-black hover:bg-cyan-500 font-mono font-bold text-[10px] px-2.5 py-1 rounded flex items-center gap-1 transition"
                  >
                    <Plus className="w-3 h-3 text-black" strokeWidth={3} />
                    ADD MATERIAL
                  </button>
                </div>
                <div className="flex flex-col gap-4">
                  {inventory
                    .filter(item => item.type === 'raw_material')
                    .sort((a, b) => b.stock - a.stock)
                    .map(item => {
                    const pct = Math.min(100, (item.stock / 20000) * 100);
                    const isLow = item.stock < item.minStock;
                    return (
                      <div key={item.id} className="bg-[#0B0D10] border border-industrial-border hover:border-industrial-accent/40 p-4 rounded-lg flex flex-col gap-2 transition-all">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-white text-sm">{item.name}</span>
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleStartEditMaterial(item)}
                                  title="Edit Material Details"
                                  className="text-gray-400 hover:text-industrial-accent p-1 rounded hover:bg-gray-800 transition"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteMaterial(item.id)}
                                  title="Delete Material"
                                  className="text-gray-500 hover:text-industrial-danger p-1 rounded hover:bg-red-950/30 transition"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                            <div className="text-xs text-gray-500">{item.hindiName} ({item.id})</div>
                          </div>
                          <div className="text-right">
                            <div className={`font-mono text-sm font-bold ${isLow ? 'text-industrial-safety font-black' : 'text-[#A8FF60]'}`}>
                              {item.stock.toLocaleString()} {item.unit}
                            </div>
                            {isLow && (
                              <span className="inline-block text-[9px] font-mono font-bold bg-industrial-safety/20 text-industrial-safety border border-industrial-safety/30 px-1.5 py-0.5 rounded mt-0.5 uppercase">
                                Low Stock Alert
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Progress bar */}
                        <div className="w-full bg-gray-800 h-2 rounded-full overflow-hidden mt-1">
                          <div 
                            className={`h-full rounded-full transition-all duration-300 ${isLow ? 'bg-industrial-safety' : 'bg-industrial-accent'}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>

                        {/* Adjust stock actions */}
                        <div className="flex justify-between items-center gap-2 mt-2 pt-2 border-t border-gray-900">
                          {/* Keyboard entry input */}
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              placeholder="Adjust +/-"
                              defaultValue=""
                              id={`adjust-input-${item.id}`}
                              className="w-24 bg-[#12141C] text-white border border-gray-800 rounded px-2 py-1 text-[11px] font-mono focus:border-industrial-accent outline-none"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  const val = parseFloat((e.currentTarget as HTMLInputElement).value);
                                  if (!isNaN(val) && val !== 0) {
                                    adjustInventoryOnServer(item.id, val);
                                    (e.currentTarget as HTMLInputElement).value = '';
                                  }
                                }
                              }}
                            />
                            <button
                              onClick={() => {
                                const inputEl = document.getElementById(`adjust-input-${item.id}`) as HTMLInputElement;
                                const val = parseFloat(inputEl?.value);
                                if (!isNaN(val) && val !== 0) {
                                  adjustInventoryOnServer(item.id, val);
                                  if (inputEl) inputEl.value = '';
                                }
                              }}
                              className="bg-industrial-accent text-black hover:bg-cyan-500 font-mono font-bold text-[10px] px-2 py-1 rounded transition"
                            >
                              Go
                            </button>
                          </div>

                          {/* Quick tap buttons */}
                          <div className="flex gap-1">
                            <button
                              onClick={() => adjustInventoryOnServer(item.id, 1000)}
                              className="bg-[#1C1F2E] hover:bg-gray-800 text-white font-mono text-[9px] px-2 py-1 rounded transition border border-gray-700"
                            >
                              +1k
                            </button>
                            <button
                              onClick={() => adjustInventoryOnServer(item.id, 5000)}
                              className="bg-[#1C1F2E] hover:bg-gray-800 text-white font-mono text-[9px] px-2 py-1 rounded transition border border-gray-700"
                            >
                              +5k
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Output Finished Goods */}
              <div className="bg-industrial-card border-2 border-industrial-border p-6 rounded-xl flex flex-col gap-4 shadow-lg">
                <h3 className="text-sm font-bold text-white font-mono tracking-widest uppercase text-industrial-success border-b border-industrial-border pb-2">
                  📦 Output Finished Goods (Produced)
                </h3>
                <div className="flex flex-col gap-4">
                  {inventory
                    .filter(item => item.type === 'finished_good')
                    .sort((a, b) => b.stock - a.stock)
                    .map(item => {
                    return (
                      <div key={item.id} className="bg-[#0B0D10] border border-industrial-border p-4 rounded-lg flex flex-col gap-2">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-bold text-white text-sm">{item.name}</div>
                            <div className="text-xs text-gray-500">{item.hindiName} ({item.id})</div>
                          </div>
                          <div className="text-right">
                            <div className="font-mono text-sm font-bold text-industrial-success">
                              {item.stock.toFixed(2)} {item.unit}
                            </div>
                            <div className="text-[10px] text-gray-500 font-mono mt-0.5">
                              (= {(item.stock * getProductBatchSize(item.id.replace('FIN-', 'PRD-'))).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })} kg)
                            </div>
                          </div>
                        </div>

                        {/* Adjust stock actions */}
                        <div className="flex justify-between items-center gap-2 mt-2 pt-2 border-t border-gray-900">
                          {/* Keyboard entry input */}
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              placeholder="Adjust +/-"
                              defaultValue=""
                              id={`adjust-input-${item.id}`}
                              className="w-24 bg-[#12141C] text-white border border-gray-800 rounded px-2 py-1 text-[11px] font-mono focus:border-industrial-success outline-none"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  const val = parseFloat((e.currentTarget as HTMLInputElement).value);
                                  if (!isNaN(val) && val !== 0) {
                                    adjustInventoryOnServer(item.id, val);
                                    (e.currentTarget as HTMLInputElement).value = '';
                                  }
                                }
                              }}
                            />
                            <button
                              onClick={() => {
                                const inputEl = document.getElementById(`adjust-input-${item.id}`) as HTMLInputElement;
                                const val = parseFloat(inputEl?.value);
                                if (!isNaN(val) && val !== 0) {
                                  adjustInventoryOnServer(item.id, val);
                                  if (inputEl) inputEl.value = '';
                                }
                              }}
                              className="bg-industrial-success text-black hover:bg-green-500 font-mono font-bold text-[10px] px-2 py-1 rounded transition"
                            >
                              Go
                            </button>
                          </div>

                          {/* Quick tap buttons */}
                          <div className="flex gap-1">
                            <button
                              disabled={item.stock < 1}
                              onClick={() => adjustInventoryOnServer(item.id, -1)}
                              className="bg-[#1C1F2E] hover:bg-gray-800 disabled:opacity-40 text-white font-mono text-[9px] px-2 py-1 rounded transition border border-gray-700"
                            >
                              -1b
                            </button>
                            <button
                              disabled={item.stock < 5}
                              onClick={() => adjustInventoryOnServer(item.id, -5)}
                              className="bg-[#1C1F2E] hover:bg-gray-800 disabled:opacity-40 text-white font-mono text-[9px] px-2 py-1 rounded transition border border-gray-700"
                            >
                              -5b
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Ingredients ratio quick reference */}
            <div className="bg-industrial-card border-2 border-industrial-border p-6 rounded-xl shadow-lg flex flex-col gap-4">
              <h3 className="text-sm font-bold text-white font-mono tracking-widest uppercase text-industrial-accent border-b border-industrial-border pb-2">
                📋 ACTIVE FORMULA RATIOS QUICK REFERENCE
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {products.map(p => (
                  <div key={p.id} className="bg-[#0B0D10] border border-industrial-border p-4 rounded-lg flex flex-col gap-2">
                    <div className="flex items-center justify-between border-b border-gray-800 pb-1">
                      <span className="font-bold text-white text-xs">{p.englishName}</span>
                      <span className="text-[9px] font-mono px-2 py-0.5 rounded" style={{ backgroundColor: p.colorHex + '20', color: p.colorHex, border: `1px solid ${p.colorHex}40` }}>{p.id}</span>
                    </div>
                    <div className="flex flex-col gap-1 text-[10px] font-mono text-gray-400">
                      {p.ingredients && p.ingredients.length > 0 ? (
                        p.ingredients.map(ing => {
                          const itemDetail = inventory.find(i => i.id === ing.ingredientId);
                          return (
                            <div key={ing.ingredientId} className="flex justify-between">
                              <span>{itemDetail?.name || ing.ingredientId}:</span>
                              <span className="text-white font-bold">{ing.percentage}%</span>
                            </div>
                          );
                        })
                      ) : (
                        <span className="text-gray-600 italic">No ratios registered</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: DATABASE INTEGRATION & BRIDGING LINKS DETAILS */}
        {activeTab === 'link-integration' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
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

                  <pre className="bg-[#0B0D10] text-[#A6E22E] p-4 rounded overflow-x-auto text-[11px] font-mono border border-gray-800 max-h-72 select-text text-left leading-relaxed">
                    {SAMPLE_KTOR_CODE}
                  </pre>
                </div>
              </div>

            </div>

            <div className="flex flex-col gap-6">
              
              {/* TWO SEQUENTIAL STATION PAIRING QR CODES: 1. GRINDER and 2. MIXER */}
              
              {/* CARD 1: 1. GRINDER STATION PAIRING CONTROL */}
              <div className="bg-[#12100C] border-2 border-amber-500/60 p-6 rounded-xl flex flex-col gap-4 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full filter blur-2xl pointer-events-none"></div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                      <Zap className="h-5 w-5 text-amber-400" />
                    </div>
                    <div>
                      <span className="text-[10px] font-mono text-amber-400 uppercase tracking-widest font-black block">
                        STAGE 1 // RAW GRAIN PULVERIZATION
                      </span>
                      <h3 className="text-base font-black tracking-tight text-white uppercase font-display">
                        1. GRINDER (पिसाई स्टेशन)
                      </h3>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono font-bold bg-amber-500/20 text-amber-400 border border-amber-500/40 px-2.5 py-0.5 rounded-full uppercase">
                    ONLY TELLS WHAT TO GRIND
                  </span>
                </div>

                <p className="text-xs text-amber-200/80 font-mono leading-relaxed bg-amber-950/30 p-3 rounded-lg border border-amber-500/20">
                  ★ <strong>भूमिका (Role):</strong> यह स्टेशन केवल उन कच्चे अनाजों (जैसे साबुत मक्का / Maize) को प्रदर्शित करता है जिन्हें पहले बारीक पाउडर (&lt; 200µm) में पीसकर पाइपलाइन में भेजना आवश्यक है।
                </p>

                <div className="flex flex-col gap-3 font-mono text-xs">
                  <div className="flex flex-col gap-1">
                    <label className="text-gray-400 font-bold uppercase">Grinder Station ID:</label>
                    <input
                      type="text"
                      value={grinderStationId}
                      onChange={(e) => setGrinderStationId(e.target.value)}
                      className="bg-[#080705] text-[#E2E8F0] border border-amber-500/40 rounded px-3 py-2 focus:border-amber-400 outline-none font-mono"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-gray-400 font-bold uppercase">Server URL Endpoint:</label>
                    <input
                      type="text"
                      value={pairingServerUrl}
                      onChange={(e) => setPairingServerUrl(e.target.value)}
                      className="bg-[#080705] text-[#E2E8F0] border border-gray-800 rounded px-3 py-2 focus:border-amber-400 outline-none font-mono"
                    />
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      {tailscaleIp && (
                        <button
                          type="button"
                          onClick={() => setPairingServerUrl(`http://${tailscaleIp}:3001`)}
                          className={`px-2 py-1 rounded text-[10px] font-mono font-bold transition flex items-center gap-1.5 border ${
                            pairingServerUrl.includes(tailscaleIp)
                              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50'
                              : 'bg-gray-800/80 text-gray-400 border-gray-700 hover:text-emerald-400'
                          }`}
                        >
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                          Tailscale: {tailscaleIp}:3001 (Remote Internet)
                        </button>
                      )}
                      {lanIp && lanIp !== 'localhost' && (
                        <button
                          type="button"
                          onClick={() => setPairingServerUrl(`http://${lanIp}:3001`)}
                          className={`px-2 py-1 rounded text-[10px] font-mono font-bold transition flex items-center gap-1.5 border ${
                            pairingServerUrl.includes(lanIp)
                              ? 'bg-amber-500/20 text-amber-400 border-amber-500/50'
                              : 'bg-gray-800/80 text-gray-400 border-gray-700 hover:text-amber-400'
                          }`}
                        >
                          LAN: {lanIp}:3001 (Local WiFi)
                        </button>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={handleGenerateGrinderQR}
                    className="bg-amber-500 hover:bg-amber-400 font-black font-mono text-black py-2.5 rounded transition uppercase tracking-widest text-xs mt-1 shadow-md shadow-amber-500/25 flex items-center justify-center gap-2"
                  >
                    <QrCode className="w-4 h-4 text-black" />
                    Generate 1. Grinder Pairing QR
                  </button>
                </div>

                <div className="border-t border-gray-800 pt-4 flex flex-col gap-4 items-center">
                  <div className="bg-[#18140E] p-3 rounded-xl border-2 border-amber-500/40 flex items-center justify-center shadow-inner">
                    <img 
                      src={grinderQrImageUrl} 
                      alt="1. Grinder Pairing QR Code" 
                      className="w-48 h-48 rounded border border-amber-500/30 p-2 bg-[#12100C]"
                    />
                  </div>

                  <div className="w-full flex flex-col gap-1.5 font-mono text-[10px]">
                    <span className="text-gray-400 uppercase font-bold">1. Grinder Configuration Payload:</span>
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        readOnly 
                        value={grinderPairingJson} 
                        className="bg-[#080705] text-amber-300 border border-gray-800 rounded px-2 py-1.5 flex-1 font-mono text-[10px] outline-none text-ellipsis overflow-hidden" 
                      />
                      <button 
                        onClick={handleCopyGrinder}
                        className="bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 px-3 py-1.5 rounded border border-amber-500/40 transition flex items-center gap-1 font-bold whitespace-nowrap"
                      >
                        <Copy className="w-3 h-3" />
                        {grinderCopied ? 'Copied' : 'Copy JSON'}
                      </button>
                    </div>
                  </div>

                  <a
                    href={`?workerToken=${grinderToken}&stationType=grinder`}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full text-center py-2 rounded border border-amber-500/50 hover:bg-amber-500/10 text-amber-400 font-mono text-xs font-bold transition flex items-center justify-center gap-1.5"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Launch 1. Grinder Tablet Terminal ↗
                  </a>
                </div>
              </div>

              {/* CARD 2: 2. MIXER STATION PAIRING CONTROL */}
              <div className="bg-[#0C1218] border-2 border-[#00F0FF]/60 p-6 rounded-xl flex flex-col gap-4 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-[#00F0FF]/10 rounded-full filter blur-2xl pointer-events-none"></div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-[#00F0FF]/10 border border-[#00F0FF]/30 rounded-lg">
                      <RefreshCw className="h-5 w-5 text-[#00F0FF]" />
                    </div>
                    <div>
                      <span className="text-[10px] font-mono text-[#00F0FF] uppercase tracking-widest font-black block">
                        STAGE 2 // PIPELINE COMPOUNDING & BLENDING
                      </span>
                      <h3 className="text-base font-black tracking-tight text-white uppercase font-display">
                        2. MIXER (मिश्रण स्टेशन)
                      </h3>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono font-bold bg-[#00F0FF]/20 text-[#00F0FF] border border-[#00F0FF]/40 px-2.5 py-0.5 rounded-full uppercase">
                    TELLS WHAT TO MIX
                  </span>
                </div>

                <p className="text-xs text-cyan-200/80 font-mono leading-relaxed bg-[#00F0FF]/5 p-3 rounded-lg border border-[#00F0FF]/20">
                  ★ <strong>भूमिका (Role):</strong> यह स्टेशन सभी सामग्रियों को मिलाने का काम करता है (स्टेज 1 पाइपलाइन से प्राप्त पिसे हुए मक्के को आटा, चीनी, वसा और एडिटिव्स के साथ मिलाना)।
                </p>

                <div className="flex flex-col gap-3 font-mono text-xs">
                  <div className="flex flex-col gap-1">
                    <label className="text-gray-400 font-bold uppercase">Mixer Station ID:</label>
                    <input
                      type="text"
                      value={mixerStationId}
                      onChange={(e) => setMixerStationId(e.target.value)}
                      className="bg-[#070B0F] text-[#E2E8F0] border border-[#00F0FF]/40 rounded px-3 py-2 focus:border-[#00F0FF] outline-none font-mono"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-gray-400 font-bold uppercase">Server URL Endpoint:</label>
                    <input
                      type="text"
                      value={pairingServerUrl}
                      onChange={(e) => setPairingServerUrl(e.target.value)}
                      className="bg-[#070B0F] text-[#E2E8F0] border border-gray-800 rounded px-3 py-2 focus:border-[#00F0FF] outline-none font-mono"
                    />
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      {tailscaleIp && (
                        <button
                          type="button"
                          onClick={() => setPairingServerUrl(`http://${tailscaleIp}:3001`)}
                          className={`px-2 py-1 rounded text-[10px] font-mono font-bold transition flex items-center gap-1.5 border ${
                            pairingServerUrl.includes(tailscaleIp)
                              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50'
                              : 'bg-gray-800/80 text-gray-400 border-gray-700 hover:text-emerald-400'
                          }`}
                        >
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                          Tailscale: {tailscaleIp}:3001 (Remote Internet)
                        </button>
                      )}
                      {lanIp && lanIp !== 'localhost' && (
                        <button
                          type="button"
                          onClick={() => setPairingServerUrl(`http://${lanIp}:3001`)}
                          className={`px-2 py-1 rounded text-[10px] font-mono font-bold transition flex items-center gap-1.5 border ${
                            pairingServerUrl.includes(lanIp)
                              ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/50'
                              : 'bg-gray-800/80 text-gray-400 border-gray-700 hover:text-cyan-400'
                          }`}
                        >
                          LAN: {lanIp}:3001 (Local WiFi)
                        </button>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={handleGenerateMixerQR}
                    className="bg-[#00F0FF] hover:bg-cyan-400 font-black font-mono text-black py-2.5 rounded transition uppercase tracking-widest text-xs mt-1 shadow-md shadow-[#00F0FF]/25 flex items-center justify-center gap-2"
                  >
                    <QrCode className="w-4 h-4 text-black" />
                    Generate 2. Mixer Pairing QR
                  </button>
                </div>

                <div className="border-t border-gray-800 pt-4 flex flex-col gap-4 items-center">
                  <div className="bg-[#0F1620] p-3 rounded-xl border-2 border-[#00F0FF]/40 flex items-center justify-center shadow-inner">
                    <img 
                      src={mixerQrImageUrl} 
                      alt="2. Mixer Pairing QR Code" 
                      className="w-48 h-48 rounded border border-[#00F0FF]/30 p-2 bg-[#0C1218]"
                    />
                  </div>

                  <div className="w-full flex flex-col gap-1.5 font-mono text-[10px]">
                    <span className="text-gray-400 uppercase font-bold">2. Mixer Configuration Payload:</span>
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        readOnly 
                        value={mixerPairingJson} 
                        className="bg-[#070B0F] text-cyan-300 border border-gray-800 rounded px-2 py-1.5 flex-1 font-mono text-[10px] outline-none text-ellipsis overflow-hidden" 
                      />
                      <button 
                        onClick={handleCopyMixer}
                        className="bg-[#00F0FF]/20 hover:bg-[#00F0FF]/30 text-[#00F0FF] px-3 py-1.5 rounded border border-[#00F0FF]/40 transition flex items-center gap-1 font-bold whitespace-nowrap"
                      >
                        <Copy className="w-3 h-3" />
                        {mixerCopied ? 'Copied' : 'Copy JSON'}
                      </button>
                    </div>
                  </div>

                  <a
                    href={`?workerToken=${mixerToken}&stationType=mixer`}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full text-center py-2 rounded border border-[#00F0FF]/50 hover:bg-[#00F0FF]/10 text-[#00F0FF] font-mono text-xs font-bold transition flex items-center justify-center gap-1.5"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Launch 2. Mixer Tablet Terminal ↗
                  </a>
                </div>
              </div>

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
              </div>

              <div className="bg-industrial-card border-2 border-industrial-border p-6 rounded flex flex-col gap-4 shadow-lg">
                <h3 className="text-base font-black tracking-tight text-white uppercase font-display flex items-center gap-2">
                  <Wifi className="h-5 w-5 text-industrial-accent" />
                  SELF-HOSTED EXPRESS CONFIG
                </h3>
                <p className="text-xs text-gray-400 font-mono leading-relaxed">
                  Excellent! The workspace is configured for local or LAN deployments:
                </p>

                <ul className="text-xs font-mono flex flex-col gap-2.5 text-gray-300 list-disc list-inside">
                  <li><strong>DATABASE:</strong> Local persistent SQLite stored in <code className="bg-gray-900 border border-gray-800 text-industrial-accent px-1.5 py-0.5 rounded">nexus.db</code>.</li>
                  <li><strong>API BACKEND:</strong> Express server listening on port <code className="bg-gray-900 border border-gray-800 text-industrial-accent px-1.5 py-0.5 rounded">3001</code>.</li>
                  <li><strong>FRONTEND PORT:</strong> Vite development server running on port <code className="bg-gray-900 border border-gray-800 text-industrial-accent px-1.5 py-0.5 rounded">3005</code>.</li>
                  <li><strong>PRODUCTION RUN:</strong> Static assets from <code className="bg-gray-900 border border-gray-800 text-industrial-accent px-1.5 py-0.5 rounded">dist</code> are served by Express.</li>
                </ul>
              </div>

            </div>

          </div>
        )}

        {/* TAB 5: USER MANAGEMENT (ADMIN ONLY) */}
        {activeTab === 'users' && currentUser?.role === 'admin' && (
          <UserManagement customFetch={customFetch} currentUser={currentUser} />
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

              <div className="flex flex-col gap-1.5">
                <label className="text-gray-400 uppercase tracking-wide">ENGLISH TECHNICAL NAME:</label>
                <input
                  type="text"
                  placeholder="e.g. Standard Blend (MANDATORY)"
                  value={newProductEnglishName}
                  onChange={(e) => setNewProductEnglishName(e.target.value)}
                  onBlur={handleProductEnglishNameBlur}
                  className="bg-[#0B0D10] text-[#E2E8F0] border border-industrial-border rounded p-2 focus:border-industrial-accent outline-none font-mono"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-gray-400 uppercase tracking-wide">HINDI LAUNCHER LABEL TRANSLATION:</label>
                <input
                  type="text"
                  placeholder="e.g. मानक मिश्रण (OPTIONAL - AUTO TRANSLATES)"
                  value={newProductName}
                  onChange={(e) => {
                    setNewProductName(e.target.value);
                    setIsHindiNameManuallyEdited(true);
                  }}
                  className="bg-[#0B0D10] text-[#E2E8F0] border border-industrial-border rounded p-2 focus:border-industrial-accent outline-none font-mono"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-gray-400 uppercase tracking-wide">PER BATCH TIME (MINUTES):</label>
                <input
                  type="number"
                  step="0.1"
                  value={newProductBatchTimeMin}
                  onChange={(e) => setNewProductBatchTimeMin(Math.max(0.1, parseFloat(e.target.value) || 0.1))}
                  className="bg-[#0B0D10] text-[#E2E8F0] border border-industrial-border rounded p-2 focus:border-industrial-accent outline-none font-mono"
                />
              </div>

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

              {/* Interactive Ingredient Ratios Section */}
              <div className="bg-[#0B0D10] border border-industrial-border p-4 rounded flex flex-col gap-3">
                <div className="flex justify-between items-center border-b border-industrial-border pb-1">
                  <span className="text-gray-400 font-bold uppercase tracking-wider text-[10px]">
                    INGREDIENT MIXTURE RATIOS:
                  </span>
                  <span className={`font-mono text-xs font-bold ${
                    (Object.values(recipeIngredients).reduce((sum, v) => sum + v, 0) === 100 || 
                     Object.values(recipeIngredients).reduce((sum, v) => sum + v, 0) === 600 || 
                     Object.values(recipeIngredients).reduce((sum, v) => sum + v, 0) === 1000)
                      ? 'text-industrial-success font-black'
                      : 'text-industrial-safety font-black'
                  }`}>
                    TOTAL: {Object.values(recipeIngredients).reduce((sum, v) => sum + v, 0)} {Object.values(recipeIngredients).reduce((sum, v) => sum + v, 0) > 100 ? 'kg' : '%'}
                  </span>
                </div>

                <div className="flex flex-col gap-3">
                  {inventory.filter(item => item.type === 'raw_material').map(ing => {
                    const currentVal = recipeIngredients[ing.id] || 0;
                    return (
                      <div key={ing.id} className="flex flex-col gap-1">
                        <div className="flex justify-between items-center text-[10px]">
                          <span className="text-white font-bold">{ing.name} ({ing.hindiName})</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <input
                            type="range"
                            min="0"
                            max="1000"
                            step="1"
                            value={currentVal}
                            onChange={(e) => {
                              const val = parseInt(e.target.value) || 0;
                              setRecipeIngredients(prev => ({
                                ...prev,
                                [ing.id]: val
                              }));
                            }}
                            className="flex-1 h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-industrial-accent"
                          />
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              min="0"
                              max="1000"
                              value={currentVal}
                              onChange={(e) => {
                                const val = Math.min(1000, Math.max(0, parseInt(e.target.value) || 0));
                                setRecipeIngredients(prev => ({
                                  ...prev,
                                  [ing.id]: val
                                }));
                              }}
                              className="w-12 bg-[#0B0D10] text-[#E2E8F0] border border-industrial-border rounded px-1.5 py-0.5 text-center focus:border-industrial-accent outline-none font-mono text-[11px]"
                            />
                            <span className="text-[10px] text-gray-500 font-mono">
                              {Object.values(recipeIngredients).reduce((sum, v) => sum + v, 0) > 100 ? 'kg' : '%'}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

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

      {/* DIALOG ADD/EDIT RAW MATERIAL */}
      {showAddMaterialModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 select-none">
          <div className="bg-industrial-card border-2 border-industrial-accent rounded-lg max-w-md w-full overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-[#0B0D10] border-b border-industrial-border p-4 flex justify-between items-center bg-gray-950">
              <h3 className="text-sm font-bold font-mono tracking-widest text-[#00F0FF] uppercase">
                {editingMaterial ? 'EDIT RAW MATERIAL DETAILS' : 'REGISTER NEW RAW MATERIAL'}
              </h3>
              
              <button 
                onClick={() => {
                  setShowAddMaterialModal(false);
                  setEditingMaterial(null);
                }}
                className="text-gray-400 hover:text-white font-mono text-sm uppercase px-1.5 py-0.5 border border-transparent hover:border-gray-700 transition"
              >
                Close
              </button>
            </div>

            <form onSubmit={handleSaveMaterial} className="p-6 flex flex-col gap-4 font-mono text-xs text-left animate-in fade-in zoom-in-95 duration-200">
              
              <div className="flex flex-col gap-1.5">
                <label className="text-gray-400 uppercase tracking-wide">MATERIAL ID CODE (e.g. ING-006):</label>
                <input
                  type="text"
                  placeholder="e.g. 006 (ING- prefix auto-appended)"
                  value={newMaterialId}
                  disabled={!!editingMaterial}
                  onChange={(e) => setNewMaterialId(e.target.value)}
                  className={`bg-[#0B0D10] text-[#E2E8F0] border border-industrial-border rounded p-2 focus:border-industrial-accent outline-none font-mono ${editingMaterial ? 'opacity-50 cursor-not-allowed' : ''}`}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-gray-400 uppercase tracking-wide">ENGLISH TECHNICAL NAME:</label>
                <input
                  type="text"
                  placeholder="e.g. Vanilla Extract"
                  value={newMaterialName}
                  onChange={(e) => setNewMaterialName(e.target.value)}
                  onBlur={handleMaterialNameBlur}
                  className="bg-[#0B0D10] text-[#E2E8F0] border border-industrial-border rounded p-2 focus:border-industrial-accent outline-none font-mono"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-gray-400 uppercase tracking-wide">HINDI LABEL TRANSLATION:</label>
                <input
                  type="text"
                  placeholder="e.g. वेनिला एक्सट्रैक्ट (OPTIONAL - AUTO TRANSLATES)"
                  value={newMaterialHindiName}
                  onChange={(e) => {
                    setNewMaterialHindiName(e.target.value);
                    setIsMaterialHindiNameManuallyEdited(true);
                  }}
                  className="bg-[#0B0D10] text-[#E2E8F0] border border-industrial-border rounded p-2 focus:border-industrial-accent outline-none font-mono"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-gray-400 uppercase tracking-wide">STOCK QUANTITY ({newMaterialUnit}):</label>
                <input
                  type="number"
                  value={newMaterialStock}
                  onChange={(e) => setNewMaterialStock(parseFloat(e.target.value) || 0)}
                  className="bg-[#0B0D10] text-[#E2E8F0] border border-industrial-border rounded p-2 focus:border-industrial-accent outline-none font-mono"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-gray-400 uppercase tracking-wide">STOCK METRIC UNIT:</label>
                <select
                  value={newMaterialUnit}
                  onChange={(e) => setNewMaterialUnit(e.target.value)}
                  className="bg-[#0B0D10] text-[#E2E8F0] border border-industrial-border rounded p-2 focus:border-industrial-accent outline-none font-mono cursor-pointer"
                >
                  <option value="kg">kg</option>
                  <option value="tonnes">tonnes</option>
                  <option value="batches">batches</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-gray-400 uppercase tracking-wide">MINIMUM STOCK WARNING ALERT THRESHOLD:</label>
                <input
                  type="number"
                  value={newMaterialMinStock}
                  onChange={(e) => setNewMaterialMinStock(parseFloat(e.target.value) || 0)}
                  className="bg-[#0B0D10] text-[#E2E8F0] border border-industrial-border rounded p-2 focus:border-industrial-accent outline-none font-mono"
                />
              </div>

              <button
                type="submit"
                className="bg-industrial-accent hover:bg-cyan-500 font-bold font-mono text-black py-2.5 rounded transition uppercase tracking-widest text-xs mt-3 shadow-md shadow-industrial-accent/25"
              >
                {editingMaterial ? 'UPDATE RAW MATERIAL' : 'REGISTER RAW MATERIAL'}
              </button>

            </form>
          </div>
        </div>
      )}

      {/* FOOTER ENTERPRISE FOOTER */}
      <footer className="border-t border-industrial-border py-6 px-6 bg-[#0B0D10] text-center select-none mt-auto">
        <div className="max-w-[1500px] mx-auto text-xs text-gray-400 font-mono flex flex-col sm:flex-row justify-between items-center gap-4">
          <span>INDUSTRIAL NEXUS INC. COGNIZANT PLATFORMS CO. ALL RIGHTS RESERVED.</span>
          <span>SECURED TERMINAL ADDRESS: {tailscaleIp || '100.99.115.49'}:3005 | TAILSCALE ENDPOINT: {tailscaleIp || '100.99.115.49'}:3001</span>
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
    private val serverUrl: String = "http://<server-ip>:3001/api/logs/bulk"
) {
    suspend fun synchronizeOfflineBatches(): Boolean {
        // 1. Fetch un-synced entries locally from Room database
        val localBatchList: List<BatchLogEntity> = batchLogDao.getUnsyncedBatches()
        if (localBatchList.isEmpty()) return true

        return try {
            // 2. Marshall record set into JSON payloads
            val jsonPayload = Json.encodeToString(localBatchList)

            // 3. Dispatch to self-hosted Express bulk logs endpoint
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
