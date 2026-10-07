import Foundation

public final class AdminAPIClient {
    public static let shared = AdminAPIClient()
    
    private init() {}
    
    private func createRequest(url: URL, method: String = "GET", body: Data? = nil) -> URLRequest {
        var request = URLRequest(url: url)
        request.httpMethod = method
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("true", forHTTPHeaderField: "Bypass-Tunnel-Reminder")
        request.setValue("true", forHTTPHeaderField: "ngrok-skip-browser-warning")
        request.setValue("true", forHTTPHeaderField: "serveo-skip-browser-warning")
        
        if let body = body {
            request.httpBody = body
        }
        
        return request
    }
    
    public func fetchProducts(baseUrl: String) async throws -> [AdminProduct] {
        guard let url = URL(string: "\(baseUrl)/api/products") else { return [] }
        let (data, response) = try await URLSession.shared.data(for: createRequest(url: url))
        guard let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 200 else { return [] }
        
        struct BackendRawProduct: Decodable {
            let id: String
            let name: String
            let englishName: String
            let targetUph: Int
            let colorHex: String
            let isActive: AnyCodableBool
            let manualFileName: String?
            let nominalBatchDurationSec: Int?
            let mixtureRatios: [AdminIngredient]?
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
        let rawList = try decoder.decode([BackendRawProduct].self, from: data)
        return rawList.map { p in
            AdminProduct(
                id: p.id,
                name: p.name,
                englishName: p.englishName,
                targetUph: p.targetUph,
                colorHex: p.colorHex,
                isActive: p.isActive.value,
                manualFileName: p.manualFileName,
                nominalBatchDurationSec: p.nominalBatchDurationSec,
                ingredients: p.mixtureRatios
            )
        }
    }
    
    public func fetchOrders(baseUrl: String) async throws -> [AdminOrder] {
        guard let url = URL(string: "\(baseUrl)/api/orders") else { return [] }
        let (data, response) = try await URLSession.shared.data(for: createRequest(url: url))
        guard let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 200 else { return [] }
        return try JSONDecoder().decode([AdminOrder].self, from: data)
    }
    
    public func createOrder(baseUrl: String, recipeId: String, recipeName: String, recipeHindiName: String, targetUnits: Int, line: String) async throws -> Bool {
        guard let url = URL(string: "\(baseUrl)/api/orders") else { return false }
        let orderPayload: [String: Any] = [
            "id": "ORD-\(UUID().uuidString.prefix(6).uppercased())",
            "recipeId": recipeId,
            "recipeName": recipeName,
            "recipeHindiName": recipeHindiName,
            "targetUnits": targetUnits,
            "unitsProduced": 0,
            "status": "Pending",
            "timestamp": Date().timeIntervalSince1970 * 1000,
            "line": line
        ]
        let body = try JSONSerialization.data(withJSONObject: orderPayload)
        let (_, response) = try await URLSession.shared.data(for: createRequest(url: url, method: "POST", body: body))
        guard let httpResponse = response as? HTTPURLResponse else { return false }
        return httpResponse.statusCode >= 200 && httpResponse.statusCode < 300
    }
    
    public func fetchInventory(baseUrl: String) async throws -> [AdminInventoryItem] {
        guard let url = URL(string: "\(baseUrl)/api/inventory") else { return [] }
        let (data, response) = try await URLSession.shared.data(for: createRequest(url: url))
        guard let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 200 else { return [] }
        return try JSONDecoder().decode([AdminInventoryItem].self, from: data)
    }
    
    public func adjustInventory(baseUrl: String, itemId: String, adjustment: Double, reason: String) async throws -> Bool {
        guard let url = URL(string: "\(baseUrl)/api/inventory/adjust") else { return false }
        let payload: [String: Any] = [
            "itemId": itemId,
            "adjustment": adjustment,
            "reason": reason
        ]
        let body = try JSONSerialization.data(withJSONObject: payload)
        let (_, response) = try await URLSession.shared.data(for: createRequest(url: url, method: "POST", body: body))
        guard let httpResponse = response as? HTTPURLResponse else { return false }
        return httpResponse.statusCode >= 200 && httpResponse.statusCode < 300
    }
    
    public func fetchBatchLogs(baseUrl: String) async throws -> [AdminBatchLog] {
        guard let url = URL(string: "\(baseUrl)/api/logs") else { return [] }
        let (data, response) = try await URLSession.shared.data(for: createRequest(url: url))
        guard let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 200 else { return [] }
        return try JSONDecoder().decode([AdminBatchLog].self, from: data)
    }
}
