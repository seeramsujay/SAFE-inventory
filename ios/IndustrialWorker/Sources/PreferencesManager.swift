import Foundation

public final class PreferencesManager {
    public static let shared = PreferencesManager()
    
    private let userDefaults = UserDefaults.standard
    
    private let keyServerUrl = "nexus_server_url"
    private let keyStationToken = "nexus_station_token"
    private let keyStationId = "nexus_station_id"
    private let keyStationType = "nexus_station_type"
    private let keyIsOnBreak = "nexus_is_on_break"
    private let keyBreakStartTime = "nexus_break_start_time"
    private let keyWorkerId = "nexus_worker_id"
    
    private init() {}
    
    public var serverUrl: String {
        get { userDefaults.string(forKey: keyServerUrl) ?? "http://100.99.115.49:3001" }
        set { userDefaults.set(newValue, forKey: keyServerUrl) }
    }
    
    public var stationToken: String {
        get { userDefaults.string(forKey: keyStationToken) ?? "TOKEN-GRINDER-STATION" }
        set { userDefaults.set(newValue, forKey: keyStationToken) }
    }
    
    public var stationId: String {
        get { userDefaults.string(forKey: keyStationId) ?? "GRINDER-01" }
        set { userDefaults.set(newValue, forKey: keyStationId) }
    }
    
    public var stationType: String {
        get {
            let saved = userDefaults.string(forKey: keyStationType) ?? ""
            if !saved.isEmpty { return saved }
            return stationId.localizedCaseInsensitiveContains("GRIND") ? "grinder" : "mixer"
        }
        set { userDefaults.set(newValue, forKey: keyStationType) }
    }
    
    public var isOnBreak: Bool {
        get { userDefaults.bool(forKey: keyIsOnBreak) }
        set { userDefaults.set(newValue, forKey: keyIsOnBreak) }
    }
    
    public var breakStartTime: Double {
        get { userDefaults.double(forKey: keyBreakStartTime) }
        set { userDefaults.set(newValue, forKey: keyBreakStartTime) }
    }
    
    public var workerId: String {
        get { userDefaults.string(forKey: keyWorkerId) ?? "OP-8492" }
        set { userDefaults.set(newValue, forKey: keyWorkerId) }
    }
    
    public var isPaired: Bool {
        return !stationToken.isEmpty && !serverUrl.isEmpty
    }
    
    public func savePairing(serverUrl: String, token: String, stationId: String, stationType: String = "") {
        let finalType: String
        if !stationType.isEmpty {
            finalType = stationType
        } else if stationId.localizedCaseInsensitiveContains("GRIND") {
            finalType = "grinder"
        } else {
            finalType = "mixer"
        }
        
        self.serverUrl = serverUrl
        self.stationToken = token
        self.stationId = stationId
        self.stationType = finalType
    }
    
    public func clearPairing() {
        userDefaults.removeObject(forKey: keyServerUrl)
        userDefaults.removeObject(forKey: keyStationToken)
        userDefaults.removeObject(forKey: keyStationId)
        userDefaults.removeObject(forKey: keyStationType)
    }
}
