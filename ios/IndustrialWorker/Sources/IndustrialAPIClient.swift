import Foundation

public final class IndustrialAPIClient {
    public static let shared = IndustrialAPIClient()
    
    private init() {}
    
    private func createRequest(url: URL, method: String = "GET", token: String? = nil, body: Data? = nil) -> URLRequest {
        var request = URLRequest(url: url)
        request.httpMethod = method
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("true", forHTTPHeaderField: "Bypass-Tunnel-Reminder")
        request.setValue("true", forHTTPHeaderField: "ngrok-skip-browser-warning")
        request.setValue("true", forHTTPHeaderField: "serveo-skip-browser-warning")
        
        if let token = token, !token.isEmpty {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        
        if let body = body {
            request.httpBody = body
        }
        
        return request
    }
    
    public func checkHealth(baseUrl: String) async throws -> Bool {
        guard let url = URL(string: "\(baseUrl)/api/health") else { return false }
        let request = createRequest(url: url)
        let (data, response) = try await URLSession.shared.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 200 else {
            return false
        }
        let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any]
        return (json?["status"] as? String) == "ok"
    }
    
    public func fetchProducts(baseUrl: String, token: String) async throws -> [Product] {
        guard let url = URL(string: "\(baseUrl)/api/products") else { return [] }
        let request = createRequest(url: url, token: token)
        let (data, response) = try await URLSession.shared.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 200 else {
            return []
        }
        
        // Backend returns products with `mixtureRatios` field
        struct BackendProduct: Decodable {
            let id: String
            let name: String
            let englishName: String
            let targetUph: Int
            let colorHex: String
            let isActive: AnyCodableBool
            let manualFileName: String?
            let nominalBatchDurationSec: Int?
            let mixtureRatios: [IngredientRatio]?
        }
        
        struct AnyCodableBool: Decodable {
            let value: Bool
            init(from decoder: Decoder) throws {
                let container = try decoder.singleValueContainer()
                if let b = try? container.decode(Bool.self) {
                    value = b
                } else if let i = try? container.decode(Int.self) {
                    value = (i == 1)
                } else {
                    value = false
                }
            }
        }
        
        let decoder = JSONDecoder()
        let backendProducts = try decoder.decode([BackendProduct].self, from: data)
        return backendProducts.map { bp in
            Product(
                id: bp.id,
                name: bp.name,
                englishName: bp.englishName,
                targetUph: bp.targetUph,
                colorHex: bp.colorHex,
                isActive: bp.isActive.value,
                manualFileName: bp.manualFileName,
                nominalBatchDurationSec: bp.nominalBatchDurationSec ?? 480,
                ingredients: bp.mixtureRatios
            )
        }
    }
    
    public func fetchOrders(baseUrl: String, token: String) async throws -> [Order] {
        guard let url = URL(string: "\(baseUrl)/api/orders") else { return [] }
        let request = createRequest(url: url, token: token)
        let (data, response) = try await URLSession.shared.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 200 else {
            return []
        }
        
        return try JSONDecoder().decode([Order].self, from: data)
    }
    
    public func submitBatchLog(baseUrl: String, token: String, log: BatchLogPayload) async throws -> Bool {
        guard let url = URL(string: "\(baseUrl)/api/logs") else { return false }
        let body = try JSONEncoder().encode(log)
        let request = createRequest(url: url, method: "POST", token: token, body: body)
        let (_, response) = try await URLSession.shared.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse else { return false }
        return httpResponse.statusCode >= 200 && httpResponse.statusCode < 300
    }
    
    public func setStationBreak(baseUrl: String, token: String, payload: StationBreakPayload) async throws -> Bool {
        guard let url = URL(string: "\(baseUrl)/api/station/break") else { return false }
        let body = try JSONEncoder().encode(payload)
        let request = createRequest(url: url, method: "POST", token: token, body: body)
        let (_, response) = try await URLSession.shared.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse else { return false }
        return httpResponse.statusCode >= 200 && httpResponse.statusCode < 300
    }
    
    public func reportEmergency(baseUrl: String, token: String, report: EmergencyReportPayload) async throws -> Bool {
        guard let url = URL(string: "\(baseUrl)/api/emergency") else { return false }
        let body = try JSONEncoder().encode(report)
        let request = createRequest(url: url, method: "POST", token: token, body: body)
        let (_, response) = try await URLSession.shared.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse else { return false }
        return httpResponse.statusCode >= 200 && httpResponse.statusCode < 300
    }
}
