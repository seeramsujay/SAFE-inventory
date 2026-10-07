import Foundation
import Combine

@MainActor
public final class WorkerViewModel: ObservableObject {
    @Published public var isLoggedIn: Bool = false
    @Published public var operatorId: String = "OP-8492"
    @Published public var operatorPin: String = "1234"
    
    // Safety Checklist items
    @Published public var checkEyeProtection: Bool = false
    @Published public var checkSafetyBoots: Bool = false
    @Published public var checkReflectiveVest: Bool = false
    @Published public var checkEmergencyStops: Bool = false
    @Published public var checkAirLines: Bool = false
    
    public var isSafetyChecklistComplete: Bool {
        checkEyeProtection && checkSafetyBoots && checkReflectiveVest && checkEmergencyStops && checkAirLines
    }
    
    // Station & Pairing Configuration
    @Published public var serverUrl: String = PreferencesManager.shared.serverUrl
    @Published public var stationToken: String = PreferencesManager.shared.stationToken
    @Published public var stationId: String = PreferencesManager.shared.stationId
    @Published public var stationType: String = PreferencesManager.shared.stationType // "grinder" or "mixer"
    @Published public var isOnline: Bool = false
    
    // Break Status
    @Published public var isOnBreak: Bool = PreferencesManager.shared.isOnBreak
    @Published public var breakDurationSeconds: Int = 0
    private var breakTimer: Timer?
    
    // Active Production Order & Products
    @Published public var activeOrder: Order? = nil
    @Published public var pendingOrders: [Order] = []
    @Published public var currentProduct: Product? = nil
    @Published public var products: [Product] = []
    
    // Timer & Compounding State
    @Published public var isTimerRunning: Bool = false
    @Published public var timeRemainingSeconds: Int = 480
    @Published public var totalBatchDurationSeconds: Int = 480
    @Published public var completedBatchesInShift: Int = 0
    private var batchTimer: Timer?
    
    // Mixer Feedback Modal State
    @Published public var showMixerFeedbackModal: Bool = false
    @Published public var feedbackQuality: String = "Grade A - Optimal"
    @Published public var feedbackTexture: String = "Smooth Homogeneous"
    @Published public var feedbackRating: Int = 5
    @Published public var feedbackNotes: String = "मिश्रण सही एकसमान बना, मक्का अच्छी तरह घुल गया।"
    
    // Extruder Telemetry
    @Published public var telemetry: ExtruderTelemetry = ExtruderTelemetry()
    private var telemetryTimer: Timer?
    
    // Celebration Banner
    @Published public var celebrationMessage: String? = nil
    
    public init() {
        startTelemetrySimulation()
    }
    
    public func performLogin() {
        guard isSafetyChecklistComplete else { return }
        isLoggedIn = true
        PreferencesManager.shared.workerId = operatorId
        PreferencesManager.shared.savePairing(serverUrl: serverUrl, token: stationToken, stationId: stationId, stationType: stationType)
        Task {
            await refreshData()
        }
    }
    
    public func performLogout() {
        isLoggedIn = false
        batchTimer?.invalidate()
        breakTimer?.invalidate()
    }
    
    public func applyPairing(url: String, token: String, station: String, type: String) {
        self.serverUrl = url
        self.stationToken = token
        self.stationId = station
        self.stationType = type.isEmpty ? (station.localizedCaseInsensitiveContains("GRIND") ? "grinder" : "mixer") : type
        PreferencesManager.shared.savePairing(serverUrl: url, token: token, stationId: station, stationType: self.stationType)
        Task {
            await refreshData()
        }
    }
    
    public func refreshData() async {
        do {
            let healthy = try await IndustrialAPIClient.shared.checkHealth(baseUrl: serverUrl)
            self.isOnline = healthy
            
            let prods = try await IndustrialAPIClient.shared.fetchProducts(baseUrl: serverUrl, token: stationToken)
            self.products = prods
            
            let orders = try await IndustrialAPIClient.shared.fetchOrders(baseUrl: serverUrl, token: stationToken)
            self.pendingOrders = orders.filter { $0.status == "Pending" || $0.status == "In Progress" }
            self.activeOrder = pendingOrders.first(where: { $0.status == "In Progress" }) ?? pendingOrders.first
            
            if let active = activeOrder {
                self.currentProduct = prods.first(where: { $0.id == active.recipeId })
                if let dur = currentProduct?.nominalBatchDurationSec, dur > 0 {
                    if !isTimerRunning {
                        self.totalBatchDurationSeconds = dur
                        self.timeRemainingSeconds = dur
                    }
                }
            }
        } catch {
            self.isOnline = false
        }
    }
    
    public func toggleTimer() {
        if isTimerRunning {
            pauseTimer()
        } else {
            startTimer()
        }
    }
    
    public func startTimer() {
        isTimerRunning = true
        batchTimer?.invalidate()
        batchTimer = Timer.scheduledTimer(withTimeInterval: 1.0, repeats: true) { [weak self] _ in
            guard let self = self else { return }
            Task { @MainActor in
                if self.timeRemainingSeconds > 0 {
                    self.timeRemainingSeconds -= 1
                } else {
                    self.isTimerRunning = false
                    self.batchTimer?.invalidate()
                }
            }
        }
    }
    
    public func pauseTimer() {
        isTimerRunning = false
        batchTimer?.invalidate()
    }
    
    public func resetTimer() {
        pauseTimer()
        timeRemainingSeconds = totalBatchDurationSeconds
    }
    
    public func toggleBreak() {
        isOnBreak.toggle()
        PreferencesManager.shared.isOnBreak = isOnBreak
        if isOnBreak {
            breakDurationSeconds = 0
            breakTimer = Timer.scheduledTimer(withTimeInterval: 1.0, repeats: true) { [weak self] _ in
                guard let self = self else { return }
                Task { @MainActor in
                    self.breakDurationSeconds += 1
                }
            }
        } else {
            breakTimer?.invalidate()
            breakDurationSeconds = 0
        }
        
        Task {
            _ = try? await IndustrialAPIClient.shared.setStationBreak(
                baseUrl: serverUrl,
                token: stationToken,
                payload: StationBreakPayload(stationId: stationId, isOnBreak: isOnBreak)
            )
        }
    }
    
    public func confirmBatchCompletion() {
        guard let order = activeOrder else { return }
        
        if stationType == "mixer" {
            showMixerFeedbackModal = true
        } else {
            submitBatchLog(order: order)
        }
    }
    
    public func submitMixerFeedbackAndComplete() {
        guard let order = activeOrder else { return }
        showMixerFeedbackModal = false
        submitBatchLog(
            order: order,
            quality: feedbackQuality,
            texture: feedbackTexture,
            rating: feedbackRating,
            notes: feedbackNotes
        )
    }
    
    private func submitBatchLog(order: Order, quality: String? = nil, texture: String? = nil, rating: Int? = nil, notes: String? = nil) {
        let isGrinder = (stationType == "grinder")
        let stageName = isGrinder ? "grinder" : "mixer"
        let batchId = "\(order.id)-B\(completedBatchesInShift + 1)-\(Int(Date().timeIntervalSince1970) % 10000)"
        let batchUnits = isGrinder ? 120 : 600
        
        let payload = BatchLogPayload(
            batchId: batchId,
            productNameHindi: order.recipeHindiName,
            productNameEnglish: order.recipeName,
            line: order.line ?? "Line A",
            unitsProduced: batchUnits,
            status: "Success",
            targetUnits: order.targetUnits,
            stage: stageName,
            feedbackQuality: quality,
            feedbackTexture: texture,
            feedbackNotes: notes,
            feedbackRating: rating
        )
        
        Task {
            let success = try? await IndustrialAPIClient.shared.submitBatchLog(baseUrl: serverUrl, token: stationToken, log: payload)
            if success == true {
                self.completedBatchesInShift += 1
                self.celebrationMessage = isGrinder ? "✓ दानेदार मक्का पिसाई पूर्ण (Stage 1 Grinding Complete)" : "✓ मिश्रण चक्र सफलतापूर्वक संपन्न (Stage 2 Mixing Complete)"
                self.resetTimer()
                await self.refreshData()
                
                try? await Task.sleep(nanoseconds: 3_000_000_000)
                self.celebrationMessage = nil
            }
        }
    }
    
    public func submitEmergencyStop(hazardType: String, severity: String, notes: String) async -> Bool {
        let report = EmergencyReportPayload(
            stationId: stationId,
            operatorName: operatorId,
            hazardType: hazardType,
            severity: severity,
            notes: notes
        )
        pauseTimer()
        let result = (try? await IndustrialAPIClient.shared.reportEmergency(baseUrl: serverUrl, token: stationToken, report: report)) ?? false
        return result
    }
    
    private func startTelemetrySimulation() {
        telemetryTimer = Timer.scheduledTimer(withTimeInterval: 2.0, repeats: true) { [weak self] _ in
            guard let self = self else { return }
            Task { @MainActor in
                let z1Delta = Double.random(in: -0.8...0.8)
                let z2Delta = Double.random(in: -0.6...0.6)
                let z3Delta = Double.random(in: -0.7...0.7)
                let rpmDelta = Double.random(in: -10...10)
                let pressDelta = Double.random(in: -1.5...1.5)
                
                self.telemetry.zone1Temp = max(170, min(200, self.telemetry.zone1Temp + z1Delta))
                self.telemetry.zone2Temp = max(180, min(210, self.telemetry.zone2Temp + z2Delta))
                self.telemetry.zone3Temp = max(190, min(220, self.telemetry.zone3Temp + z3Delta))
                self.telemetry.motorRpm = max(1150, min(1350, self.telemetry.motorRpm + rpmDelta))
                self.telemetry.meltPressureBar = max(130, min(160, self.telemetry.meltPressureBar + pressDelta))
            }
        }
    }
}
