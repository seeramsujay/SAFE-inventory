import Foundation

public struct AdminIngredient: Codable, Identifiable, Hashable {
    public var id: String { ingredientId }
    public let ingredientId: String
    public let percentage: Double
    public let stage: String?
    public let requiresGrinding: Bool?
    public let name: String?
    public let hindiName: String?
}

public struct AdminProduct: Codable, Identifiable, Hashable {
    public let id: String
    public let name: String
    public let englishName: String
    public let targetUph: Int
    public let colorHex: String
    public let isActive: Bool
    public let manualFileName: String?
    public let nominalBatchDurationSec: Int?
    public let ingredients: [AdminIngredient]?
}

public struct AdminOrder: Codable, Identifiable, Hashable {
    public let id: String
    public let recipeId: String
    public let recipeName: String
    public let recipeHindiName: String
    public var unitsProduced: Int
    public let targetUnits: Int
    public var status: String
    public let timestamp: Double
    public var updatedTimestamp: Double?
    public let notes: String?
    public let line: String?
    
    public var progressPercent: Double {
        guard targetUnits > 0 else { return 0 }
        return min(1.0, Double(unitsProduced) / Double(targetUnits))
    }
}

public struct AdminInventoryItem: Codable, Identifiable, Hashable {
    public let id: String
    public let name: String
    public let hindiName: String?
    public let type: String // "raw_material" or "finished_good"
    public var stock: Double
    public let unit: String
    public let minStock: Double
    public let requiresGrinding: Bool?
    public let stage: String?
    
    public var isLowStock: Bool {
        return stock <= minStock
    }
}

public struct AdminBatchLog: Codable, Identifiable, Hashable {
    public var id: String { batchId }
    public let batchId: String
    public let productNameHindi: String
    public let productNameEnglish: String
    public let line: String
    public let unitsProduced: Int
    public let status: String
    public let timestamp: Double
    public let targetUnits: Int
    public let stage: String?
    public let feedbackQuality: String?
    public let feedbackTexture: String?
    public let feedbackNotes: String?
    public let feedbackRating: Int?
}

public struct StationStatus: Codable, Identifiable, Hashable {
    public var id: String { stationId }
    public let stationId: String
    public let stationType: String
    public var isOnBreak: Bool
    public var breakStartedAt: Double?
    public var activeOperator: String?
    public var isOnline: Bool
}
