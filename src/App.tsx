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
  Lock
} from 'lucide-react';

// Interfaces mirroring the Android Room schema
interface IngredientRatio {
  ingredientId: string;
  percentage: number;
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
      { ingredientId: "ING-001", percentage: 60 },
      { ingredientId: "ING-002", percentage: 20 },
      { ingredientId: "ING-003", percentage: 15 },
      { ingredientId: "ING-004", percentage: 5 }
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
      { ingredientId: "ING-001", percentage: 50 },
      { ingredientId: "ING-002", percentage: 25 },
      { ingredientId: "ING-003", percentage: 15 },
      { ingredientId: "ING-004", percentage: 5 },
      { ingredientId: "ING-005", percentage: 5 }
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
      { ingredientId: "ING-001", percentage: 70 },
      { ingredientId: "ING-002", percentage: 20 },
      { ingredientId: "ING-003", percentage: 10 }
    ]
  }
];

const INITIAL_LOGS: BatchLog[] = [
  { batchId: "ORD-1001", productNameHindi: "क्रीम स्पेशल", productNameEnglish: "Cream Special", line: "Line A", unitsProduced: 5000, status: "Success", timestamp: Date.now() - 3 * 3600000, targetUnits: 5000 },
  { batchId: "ORD-1002", productNameHindi: "प्रीमियम प्लस", productNameEnglish: "Premium Plus", line: "Line B", unitsProduced: 2500, status: "Success", timestamp: Date.now() - 1.5 * 3600000, targetUnits: 2500 }
];

const INITIAL_INVENTORY: InventoryItem[] = [
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
  const isLocal = hostname === 'localhost' || 
                  hostname === '127.0.0.1' || 
                  /^192\.168\./.test(hostname) || 
                  /^10\./.test(hostname) || 
                  /^100\./.test(hostname) || 
                  /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname);
  
  if (isLocal) {
    return `http://${hostname}:3001`;
  } else {
    return window.location.origin;
  }
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

  // Navigation state (Active tab on admin dashboard)
  const [activeTab, setActiveTab] = useState<'dashboard' | 'products' | 'logs' | 'link-integration' | 'inventory'>('dashboard');

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
  const [pairingStationId, setPairingStationId] = useState('KIOSK-01');
  const [pairingServerUrl, setPairingServerUrl] = useState(() => getDefaultPairingUrl());
  const [generatedPairingJson, setGeneratedPairingJson] = useState(() => {
    const fallback = {
      url: getDefaultPairingUrl(),
      token: 'DASHBOARD-DEV-TOKEN',
      station: 'KIOSK-01'
    };
    return JSON.stringify(fallback);
  });

  // Automatically adjust pairing URL to point to intranet IP instead of localhost
  useEffect(() => {
    if (serverLocalIp && serverLocalIp !== 'localhost' && serverLocalIp !== '127.0.0.1') {
      const hostname = window.location.hostname;
      if (hostname === 'localhost' || hostname === '127.0.0.1') {
        setPairingServerUrl(`http://${serverLocalIp}:3001`);
      }
    }
  }, [serverLocalIp]);
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
          }));
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
        if (data && data.localIp) {
          setServerLocalIp(data.localIp);
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
      const activeOrder = orders.find(o => o.status === 'In Progress');
      if (activeOrder) {
        if (activeWorkerOrderId !== activeOrder.id) {
          setActiveWorkerOrderId(activeOrder.id);
        }
        if (workerUnitsProducedInput !== activeOrder.unitsProduced) {
          setWorkerUnitsProducedInput(activeOrder.unitsProduced);
        }
      } else {
        if (activeWorkerOrderId !== null) {
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
        if (activeOrder) {
          setWorkerUnitsProducedInput(activeOrder.unitsProduced);
        }
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

  const handleWorkerCompleteOrder = async (status: 'Success' | 'Failed') => {
    if (!activeWorkerOrderId) return;
    const order = orders.find(o => o.id === activeWorkerOrderId);
    if (!order) return;

    const batchSize = getProductBatchSize(order.recipeId);
    const batchesCompleted = Math.round(order.unitsProduced / batchSize);
    const newLog = {
      batchId: `${order.id}-B${batchesCompleted + 1}`,
      productNameHindi: order.recipeHindiName,
      productNameEnglish: order.recipeName,
      line: workerProcessingLine,
      unitsProduced: batchSize,
      status: status,
      timestamp: Date.now(),
      targetUnits: batchSize
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
        setActiveWorkerOrderId(null);
        setWorkerUnitsProducedInput(0);
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

  // Construct generated QR URL
  const workerUrl = `${window.location.origin}${window.location.pathname}?workerToken=DASHBOARD-DEV-TOKEN`;
  const qrCodeImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(generatedPairingJson)}&color=00f0ff&bgcolor=161920`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(generatedPairingJson);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleGeneratePairingQR = async () => {
    try {
      const response = await customFetch('/api/auth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stationId: pairingStationId })
      });
      if (response.ok) {
        const data = await response.json();
        const payload = {
          url: pairingServerUrl.trim(),
          token: data.token,
          station: data.stationId
        };
        setGeneratedPairingJson(JSON.stringify(payload));
      }
    } catch (err) {
      console.error("Failed to generate station pairing token:", err);
    }
  };

  // ----------------------------------------------------
  // WORKER PORTAL VIEW (loads when workerToken is active)
  // ----------------------------------------------------
  if (workerToken) {
    const activeOrderDetails = orders.find(o => o.id === activeWorkerOrderId);

    return (
      <div className="min-h-screen bg-[#0A0C10] text-[#D1D4DC] flex flex-col font-sans selection:bg-[#FF6B00] selection:text-black">
        {/* Floor Handheld Kiosk Header */}
        <header className="border-b border-[#FF6B00]/40 bg-[#12151C] py-4 px-6 sticky top-0 z-50 shadow-md">
          <div className="max-w-[800px] mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-2.5 h-2.5 rounded-full bg-[#FF6B00] animate-ping"></div>
              <div>
                <span className="text-[10px] text-[#FF6B00] font-mono tracking-widest uppercase font-bold">Floor Kiosk Uplink</span>
                <h1 className="text-base font-black text-white font-display">WORKER TERMINAL</h1>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-mono bg-gray-900 border border-gray-800 text-gray-400 px-2.5 py-1 rounded">
                SECURE TOKEN OK
              </span>
              <button 
                onClick={handleExitWorkerMode}
                className="bg-gray-800 hover:bg-red-950/40 text-xs font-mono font-semibold px-3 py-1.5 rounded border border-gray-700 hover:border-red-500/50 transition-all text-white"
              >
                Exit Worker Mode
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 max-w-[800px] mx-auto w-full p-4 md:p-6 flex flex-col gap-6">
          {/* Active processing detail view */}
          {activeWorkerOrderId && activeOrderDetails ? (
            <div className="bg-gradient-to-b from-[#1E2330] to-[#12151D] border-2 border-[#FF6B00] rounded-xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
              <div className="bg-[#12151D] border-b border-gray-800 p-4 md:p-6 flex justify-between items-center">
                <div>
                  <span className="text-[10px] font-mono text-[#FF6B00] bg-[#FF6B00]/10 border border-[#FF6B00]/25 px-2 py-0.5 rounded font-bold uppercase">
                    Running Batch
                  </span>
                  <h2 className="text-2xl font-black text-white font-mono mt-1">{activeOrderDetails.id}</h2>
                </div>
                <div className="text-right">
                  <span className="text-xs text-gray-400 block font-mono">TARGET DEMAND</span>
                  <span className="text-lg font-bold text-white font-mono">{activeOrderDetails.targetUnits.toLocaleString()} units</span>
                </div>
              </div>

              <div className="p-6 flex flex-col gap-6">
                {/* Product Profile */}
                <div className="bg-[#0A0C10] p-4 rounded-lg border border-gray-800 flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-bold text-white leading-tight">{activeOrderDetails.recipeName}</h3>
                    <h4 className="text-sm text-gray-400 font-display mt-0.5">{activeOrderDetails.recipeHindiName}</h4>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: INITIAL_PRODUCTS.find(p => p.id === activeOrderDetails.recipeId)?.colorHex || '#FFF' }}></span>
                    <span className="text-xs font-mono font-semibold text-white">{activeOrderDetails.recipeId}</span>
                  </div>
                </div>

                {/* Progress Visualizer */}
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between items-end">
                    <span className="text-xs font-mono text-gray-400">UNITS PRODUCED</span>
                    <div className="flex items-baseline gap-1 font-mono">
                      <span className="text-4xl font-black text-[#FF6B00] tracking-wider">{workerUnitsProducedInput.toLocaleString()}</span>
                      <span className="text-xs text-gray-500">/ {activeOrderDetails.targetUnits.toLocaleString()}</span>
                    </div>
                  </div>
                  
                  <div className="w-full bg-[#0A0C10] border border-gray-800 h-6 rounded-full overflow-hidden p-1">
                    <div 
                      className="bg-gradient-to-r from-[#FF6B00] to-yellow-500 h-full rounded-full transition-all duration-300 shadow-[0_0_10px_rgba(255,107,0,0.3)]"
                      style={{ width: `${Math.min(100, (workerUnitsProducedInput / activeOrderDetails.targetUnits) * 100)}%` }}
                    ></div>
                  </div>
                </div>

                {/* Big Unit Adjuster Buttons */}
                <div className="flex flex-col gap-3 mt-2">
                  <span className="text-xs font-mono text-gray-400 font-bold uppercase tracking-wider">Tap to increment units</span>
                  
                  <div className="grid grid-cols-3 gap-3">
                    <button
                      onClick={() => handleWorkerUpdateProgress(Math.min(activeOrderDetails.targetUnits, workerUnitsProducedInput + 100))}
                      className="bg-[#242936] hover:bg-[#2F3547] text-white py-4 rounded-xl border border-gray-700 text-sm font-mono font-black transition active:scale-95"
                    >
                      +100
                    </button>
                    <button
                      onClick={() => handleWorkerUpdateProgress(Math.min(activeOrderDetails.targetUnits, workerUnitsProducedInput + 500))}
                      className="bg-[#242936] hover:bg-[#2F3547] text-white py-4 rounded-xl border border-gray-700 text-sm font-mono font-black transition active:scale-95"
                    >
                      +500
                    </button>
                    <button
                      onClick={() => handleWorkerUpdateProgress(Math.min(activeOrderDetails.targetUnits, workerUnitsProducedInput + 1000))}
                      className="bg-[#242936] hover:bg-[#2F3547] text-white py-4 rounded-xl border border-gray-700 text-sm font-mono font-black transition active:scale-95"
                    >
                      +1,000
                    </button>
                  </div>

                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] font-mono text-gray-500 uppercase">Set custom count:</span>
                    <input
                      type="number"
                      min="0"
                      max={activeOrderDetails.targetUnits}
                      value={workerUnitsProducedInput}
                      onChange={(e) => {
                        const val = Math.min(activeOrderDetails.targetUnits, Math.max(0, parseInt(e.target.value) || 0));
                        handleWorkerUpdateProgress(val);
                      }}
                      className="w-28 bg-[#0B0D10] text-[#E2E8F0] border border-gray-800 rounded px-2 py-1 text-xs focus:border-[#FF6B00] outline-none font-mono"
                    />
                  </div>

                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleWorkerUpdateProgress(0)}
                      className="bg-gray-900 hover:bg-gray-800 text-gray-400 text-xs font-mono font-semibold px-4 py-2 border border-gray-850 rounded"
                    >
                      Reset Count
                    </button>
                    <button 
                      onClick={() => handleWorkerUpdateProgress(activeOrderDetails.targetUnits)}
                      className="bg-gray-900 hover:bg-gray-800 text-[#00F0FF] text-xs font-mono font-semibold px-4 py-2 border border-gray-850 rounded ml-auto"
                    >
                      Set to Full ({activeOrderDetails.targetUnits})
                    </button>
                  </div>
                </div>

                {/* Line selector */}
                <div className="flex flex-col gap-2">
                  <label className="text-xs text-gray-400 font-mono">Assigned Factory Line</label>
                  <select 
                    value={workerProcessingLine}
                    onChange={(e) => setWorkerProcessingLine(e.target.value)}
                    className="bg-[#0A0C10] border border-gray-850 p-3 rounded-lg text-white font-mono text-sm outline-none focus:border-[#FF6B00]"
                  >
                    <option value="Line A">Line A (Assembly Floor)</option>
                    <option value="Line B">Line B (Auto Injection)</option>
                    <option value="Line C">Line C (Extrusion Sinter)</option>
                  </select>
                </div>

                {/* Complete / Fail Buttons */}
                <div className="grid grid-cols-2 gap-4 border-t border-gray-800 pt-6 mt-4">
                  <button
                    onClick={() => {
                      const reason = prompt("Enter failure downtime reason:", "Feedstock Blockage");
                      if (reason !== null) {
                        handleWorkerCompleteOrder('Failed');
                      }
                    }}
                    className="bg-red-950/20 hover:bg-red-900/30 text-red-500 border border-red-900/50 py-4 px-6 rounded-xl font-bold font-mono text-sm transition tracking-wider flex items-center justify-center gap-2"
                  >
                    <XCircle className="w-5 h-5" />
                    REPORT ALARM FAULT
                  </button>

                  <button
                    onClick={() => handleWorkerCompleteOrder('Success')}
                    className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-black py-4 px-6 rounded-xl font-black font-mono text-sm transition shadow-lg shadow-emerald-950/25 tracking-wider flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 className="w-5 h-5 text-black" />
                    COMPLETE SUCCESS
                  </button>
                </div>

                <button 
                  onClick={() => {
                    setActiveWorkerOrderId(null);
                    setWorkerUnitsProducedInput(0);
                  }}
                  className="w-full text-center text-gray-500 hover:text-white transition text-xs font-mono underline mt-2"
                >
                  Cancel and Release Batch Back to Queue
                </button>

              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              {/* Batch Queue Overview */}
              <div className="bg-[#161920] border border-gray-850 p-5 rounded-xl">
                <h3 className="text-base font-black text-white uppercase tracking-tight flex items-center gap-2 mb-1">
                  <Layers className="text-[#FF6B00] w-5 h-5" />
                  PENDING DISPATCH QUEUE
                </h3>
                <p className="text-xs text-gray-400 font-mono mb-4">Select an ordered recipe from the queue to start processing.</p>

                <div className="flex flex-col gap-3">
                  {orders.filter(o => o.status === 'Pending' || o.status === 'In Progress').length === 0 ? (
                    <div className="p-8 text-center bg-[#0F1115] border border-dashed border-gray-800 rounded-lg">
                      <p className="text-xs text-gray-500 font-mono">NO ACTIVE ORDERS ASSIGNED</p>
                      <p className="text-[10px] text-gray-650 font-mono mt-1">Awaiting recipe dispatches from the administrative console...</p>
                    </div>
                  ) : (
                    orders.filter(o => o.status === 'Pending' || o.status === 'In Progress').map(o => (
                      <div 
                        key={o.id}
                        className={`bg-[#0F1115] border rounded-lg p-4 transition-all ${
                          o.status === 'In Progress' 
                            ? 'border-[#FF6B00] shadow-[0_0_10px_rgba(255,107,0,0.1)]' 
                            : 'border-gray-850 hover:border-gray-700'
                        }`}
                      >
                        <div className="flex justify-between items-start gap-4">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold font-mono text-white tracking-widest">{o.id}</span>
                              <span className={`text-[9px] font-mono px-2 py-0.5 rounded font-bold ${
                                o.status === 'In Progress' 
                                  ? 'bg-[#FF6B00]/15 text-[#FF6B00] border border-[#FF6B00]/25' 
                                  : 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20'
                              }`}>
                                {o.status === 'In Progress' ? 'ACTIVE PROCESSING' : 'PENDING START'}
                              </span>
                            </div>
                            <h4 className="text-base font-bold text-white mt-1 leading-tight">{o.recipeName}</h4>
                            <span className="text-xs text-gray-500 font-display block leading-none mt-0.5">{o.recipeHindiName}</span>
                          </div>
                          
                          <div className="text-right">
                            <span className="text-[10px] font-mono text-gray-400 block uppercase">Demand target</span>
                            <span className="text-sm font-bold text-white font-mono">{o.targetUnits.toLocaleString()} Units</span>
                          </div>
                        </div>

                        <div className="border-t border-gray-850 mt-3 pt-3 flex items-center justify-between">
                          <span className="text-[10px] text-gray-500 font-mono">Ordered: {new Date(o.timestamp).toLocaleTimeString()}</span>
                          <button
                            onClick={() => handleWorkerStartOrder(o.id)}
                            className="bg-[#FF6B00] hover:bg-[#E05F00] text-black font-black font-mono text-xs px-4 py-2 rounded-lg transition active:scale-95 flex items-center gap-1.5 shadow-md"
                          >
                            <Play className="w-3.5 h-3.5 fill-black text-black" />
                            {o.status === 'In Progress' ? 'RESUME WORK' : 'START PRODUCTION'}
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Complete logs section for workers */}
              <div className="bg-[#161920] border border-gray-850 p-5 rounded-xl">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">RECIPES HISTORY (TODAY)</h3>
                
                <div className="flex flex-col gap-2 font-mono text-xs">
                  {orders.filter(o => (o.status === 'Completed' || o.status === 'Failed') && new Date(o.timestamp).toDateString() === new Date().toDateString()).map(o => (
                    <div key={o.id} className="bg-[#0F1115] border border-gray-850 p-3 rounded flex justify-between items-center">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-white font-bold">{o.id}</span>
                          <span className="text-gray-400">{o.recipeName}</span>
                        </div>
                        <span className="text-[10px] text-gray-500">{new Date(o.updatedTimestamp || o.timestamp).toLocaleTimeString()}</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        o.status === 'Completed' 
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                          : 'bg-red-500/10 text-red-400 border border-red-500/20'
                      }`}>
                        {o.status === 'Completed' ? 'SUCCESS' : 'ALARM'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </main>

        <footer className="border-t border-gray-850 py-4 px-6 bg-[#12151C] text-center mt-auto">
          <p className="text-[10px] text-gray-500 font-mono uppercase tracking-wider">
            Industrial Nexus Floor Terminal App | Self-Hosted Express Console
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
          </div>
        </div>
      </header>

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
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {products.length === 0 ? (
                  <div className="col-span-full py-12 text-center text-gray-500 border border-dashed border-gray-800 rounded">
                    <FolderPlaceholder />
                    <p className="mt-2 text-sm text-gray-500 font-mono">NO ACTIVE FORMULAS IN DIRECTORY REGISTER</p>
                  </div>
                ) : (
                  products.map(p => (
                    <div 
                      key={p.id} 
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
                            <span className="text-gray-500">PER BATCH TIME:</span>
                            <span className="text-white font-bold">
                              {p.nominalBatchDurationSec ? (p.nominalBatchDurationSec / 60).toFixed(1) : '8.0'} min
                            </span>
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
                      <th className="p-4">STATUS</th>
                      <th className="p-4">LOG TIMESTAMP</th>
                    </tr>
                  </thead>
                  
                  <tbody className="divide-y divide-gray-850">
                    {filteredLogs.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center p-8 text-gray-500 italic">
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
                  {inventory.filter(item => item.type === 'raw_material').map(item => {
                    const pct = Math.min(100, (item.stock / 20000) * 100);
                    const isLow = item.stock < item.minStock;
                    return (
                      <div key={item.id} className="bg-[#0B0D10] border border-industrial-border p-4 rounded-lg flex flex-col gap-2">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-bold text-white text-sm">{item.name}</div>
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
                  {inventory.filter(item => item.type === 'finished_good').map(item => {
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
              
              {/* STATION PAIRING QR CODE */}
              <div className="bg-industrial-card border-2 border-industrial-border p-6 rounded flex flex-col gap-4 shadow-lg relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-industrial-accent/5 rounded-full filter blur-2xl pointer-events-none"></div>
                
                <h3 className="text-base font-black tracking-tight text-white uppercase font-display flex items-center gap-2">
                  <QrCode className="h-5 w-5 text-industrial-accent" />
                  STATION PAIRING CONTROL
                </h3>
                <p className="text-xs text-gray-400 font-mono leading-relaxed">
                  Generate a pairing configuration payload and QR code to sync mobile/handheld tablet terminals.
                </p>

                <div className="flex flex-col gap-3 font-mono text-xs">
                  <div className="flex flex-col gap-1">
                    <label className="text-gray-400 font-bold uppercase">Station ID:</label>
                    <input
                      type="text"
                      value={pairingStationId}
                      onChange={(e) => setPairingStationId(e.target.value)}
                      className="bg-[#0B0D10] text-[#E2E8F0] border border-industrial-border rounded px-3 py-2 focus:border-industrial-accent outline-none font-mono"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-gray-400 font-bold uppercase">Server URL endpoint:</label>
                    <input
                      type="text"
                      value={pairingServerUrl}
                      onChange={(e) => setPairingServerUrl(e.target.value)}
                      className="bg-[#0B0D10] text-[#E2E8F0] border border-industrial-border rounded px-3 py-2 focus:border-industrial-accent outline-none font-mono"
                    />
                  </div>

                  <button
                    onClick={handleGeneratePairingQR}
                    className="bg-industrial-accent hover:bg-cyan-500 font-bold font-mono text-black py-2 rounded transition uppercase tracking-widest text-xs mt-1 shadow-md shadow-industrial-accent/25"
                  >
                    Generate Pairing Payload
                  </button>
                </div>

                <div className="border-t border-gray-800 pt-4 flex flex-col gap-4 items-center">
                  <div className="bg-[#161920] p-3 rounded-lg border border-[#00F0FF]/20 flex items-center justify-center shadow-inner">
                    <img 
                      src={qrCodeImageUrl} 
                      alt="Pairing QR Code" 
                      className="w-48 h-48 rounded border border-gray-800 p-2 bg-[#12151C]"
                    />
                  </div>

                  <div className="w-full flex flex-col gap-1.5 font-mono text-[10px]">
                    <span className="text-gray-500 uppercase">Generated configuration JSON:</span>
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        readOnly 
                        value={generatedPairingJson} 
                        className="bg-[#0B0D10] text-gray-400 border border-gray-800 rounded px-2 py-1 flex-1 font-mono text-[10px] outline-none text-ellipsis overflow-hidden" 
                      />
                      <button 
                        onClick={handleCopyLink}
                        className="bg-gray-800 hover:bg-gray-700 text-white px-2 py-1 rounded border border-gray-700 hover:border-gray-600 transition flex items-center gap-1 font-bold whitespace-nowrap"
                      >
                        <Copy className="w-3 h-3" />
                        {copiedLink ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                  </div>
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

      {/* DIALOG ADD RAW MATERIAL */}
      {showAddMaterialModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 select-none">
          <div className="bg-industrial-card border-2 border-industrial-accent rounded-lg max-w-md w-full overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-[#0B0D10] border-b border-industrial-border p-4 flex justify-between items-center bg-gray-950">
              <h3 className="text-sm font-bold font-mono tracking-widest text-[#00F0FF] uppercase">
                REGISTER NEW RAW MATERIAL
              </h3>
              
              <button 
                onClick={() => setShowAddMaterialModal(false)}
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
                  onChange={(e) => setNewMaterialId(e.target.value)}
                  className="bg-[#0B0D10] text-[#E2E8F0] border border-industrial-border rounded p-2 focus:border-industrial-accent outline-none font-mono"
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
                <label className="text-gray-400 uppercase tracking-wide">INITIAL STOCK QUANTITY:</label>
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
                Register Raw Material
              </button>

            </form>
          </div>
        </div>
      )}

      {/* FOOTER ENTERPRISE FOOTER */}
      <footer className="border-t border-industrial-border py-6 px-6 bg-[#0B0D10] text-center select-none mt-auto">
        <div className="max-w-[1500px] mx-auto text-xs text-gray-400 font-mono flex flex-col sm:flex-row justify-between items-center gap-4">
          <span>INDUSTRIAL NEXUS INC. COGNIZANT PLATFORMS CO. ALL RIGHTS RESERVED.</span>
          <span>SECURED TERMINAL ADDRESS: localhost:3005 | SERVERLESS SYNC ROUTE: LOCALSTORAGE SECURE</span>
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
