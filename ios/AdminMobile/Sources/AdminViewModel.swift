import Foundation
import Combine

@MainActor
public final class AdminViewModel: ObservableObject {
    @Published public var serverUrl: String = "http://100.99.115.49:3001"
    @Published public var isOnline: Bool = false
    
    // Overview metrics
    @Published public var totalBatchesToday: Int = 12
    @Published public var totalUnitsToday: Int = 7200
    @Published public var plantYieldRate: Double = 98.4
    @Published public var activeEmergency: Bool = false
    
    // Products, Orders, Inventory, Logs
    @Published public var products: [AdminProduct] = []
    @Published public var orders: [AdminOrder] = []
    @Published public var inventory: [AdminInventoryItem] = []
    @Published public var batchLogs: [AdminBatchLog] = []
    
    // Stations
    @Published public var stations: [StationStatus] = [
        StationStatus(stationId: "GRINDER-01", stationType: "grinder", isOnBreak: false, breakStartedAt: nil, activeOperator: "OP-8492", isOnline: true),
        StationStatus(stationId: "MIXER-01", stationType: "mixer", isOnBreak: false, breakStartedAt: nil, activeOperator: "OP-3310", isOnline: true),
        StationStatus(stationId: "EXTRUDER-01", stationType: "extruder", isOnBreak: false, breakStartedAt: nil, activeOperator: "OP-9102", isOnline: true)
    ]
    
    // QR Code Pairing Payloads
    @Published public var grinderPairingJson: String = ""
    @Published public var mixerPairingJson: String = ""
    
    // New Order Modal State
    @Published public var showNewOrderSheet: Bool = false
    @Published public var selectedProductId: String = "PRD-001"
    @Published public var targetBatches: Int = 4
    @Published public var selectedLine: String = "Line A"
    
    private var pollTimer: Timer?
    
    public init() {
        updatePairingJson()
        Task {
            await refreshAll()
        }
        startPolling()
    }
    
    public func startPolling() {
        pollTimer?.invalidate()
        pollTimer = Timer.scheduledTimer(withTimeInterval: 5.0, repeats: true) { [weak self] _ in
            guard let self = self else { return }
            Task { @MainActor in
                await self.refreshAll()
            }
        }
    }
    
    public func updatePairingJson() {
        let cleanUrl = serverUrl.trimmingCharacters(in: .whitespacesAndNewlines)
        
        let grinderObj: [String: String] = [
            "url": cleanUrl,
            "token": "TOKEN-GRINDER-STATION",
            "station": "GRINDER-01",
            "stationType": "grinder"
        ]
        
        let mixerObj: [String: String] = [
            "url": cleanUrl,
            "token": "TOKEN-MIXER-STATION",
            "station": "MIXER-01",
            "stationType": "mixer"
        ]
        
        if let gData = try? JSONSerialization.data(withJSONObject: grinderObj, options: [.prettyPrinted]),
           let gStr = String(data: gData, encoding: .utf8) {
            grinderPairingJson = gStr
        }
        
        if let mData = try? JSONSerialization.data(withJSONObject: mixerObj, options: [.prettyPrinted]),
           let mStr = String(data: mData, encoding: .utf8) {
            mixerPairingJson = mStr
        }
    }
    
    public func refreshAll() async {
        do {
            let prods = try await AdminAPIClient.shared.fetchProducts(baseUrl: serverUrl)
            self.products = prods
            self.isOnline = true
            
            let ords = try await AdminAPIClient.shared.fetchOrders(baseUrl: serverUrl)
            self.orders = ords
            
            let inv = try await AdminAPIClient.shared.fetchInventory(baseUrl: serverUrl)
            self.inventory = inv
            
            let logs = try await AdminAPIClient.shared.fetchBatchLogs(baseUrl: serverUrl)
            self.batchLogs = logs
            
            self.totalUnitsToday = logs.reduce(0) { $0 + $1.unitsProduced }
            self.totalBatchesToday = logs.count
        } catch {
            self.isOnline = false
        }
    }
    
    public func dispatchNewOrder() async -> Bool {
        guard let prod = products.first(where: { $0.id == selectedProductId }) else { return false }
        let totalUnits = targetBatches * 600
        let success = (try? await AdminAPIClient.shared.createOrder(
            baseUrl: serverUrl,
            recipeId: prod.id,
            recipeName: prod.englishName,
            recipeHindiName: prod.name,
            targetUnits: totalUnits,
            line: selectedLine
        )) ?? false
        
        if success {
            showNewOrderSheet = false
            await refreshAll()
        }
        return success
    }
    
    public func adjustStock(itemId: String, adjustment: Double, reason: String) async -> Bool {
        let success = (try? await AdminAPIClient.shared.adjustInventory(
            baseUrl: serverUrl,
            itemId: itemId,
            adjustment: adjustment,
            reason: reason
        )) ?? false
        
        if success {
            await refreshAll()
        }
        return success
    }
}
