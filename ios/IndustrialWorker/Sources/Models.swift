import Foundation

public struct IngredientRatio: Codable, Identifiable, Hashable {
    public var id: String { ingredientId }
    public let ingredientId: String
    public let percentage: Double
    public let stage: String? // "grinder" or "mixer"
    public let requiresGrinding: Bool?
    public let name: String?
    public let hindiName: String?
    
    public init(ingredientId: String, percentage: Double, stage: String? = nil, requiresGrinding: Bool? = nil, name: String? = nil, hindiName: String? = nil) {
        self.ingredientId = ingredientId
        self.percentage = percentage
        self.stage = stage
        self.requiresGrinding = requiresGrinding
        self.name = name
        self.hindiName = hindiName
    }
}

public struct Product: Codable, Identifiable, Hashable {
    public let id: String
    public let name: String // Hindi name
    public let englishName: String
    public let targetUph: Int
    public let colorHex: String
    public let isActive: Bool
    public let manualFileName: String?
    public let nominalBatchDurationSec: Int?
    public let ingredients: [IngredientRatio]?
    
    public init(id: String, name: String, englishName: String, targetUph: Int, colorHex: String, isActive: Bool, manualFileName: String? = nil, nominalBatchDurationSec: Int? = 480, ingredients: [IngredientRatio]? = nil) {
        self.id = id
        self.name = name
        self.englishName = englishName
        self.targetUph = targetUph
        self.colorHex = colorHex
        self.isActive = isActive
        self.manualFileName = manualFileName
        self.nominalBatchDurationSec = nominalBatchDurationSec
        self.ingredients = ingredients
    }
}

public struct Order: Codable, Identifiable, Hashable {
    public let id: String
    public let recipeId: String
    public let recipeName: String
    public let recipeHindiName: String
    public var unitsProduced: Int
    public let targetUnits: Int
    public var status: String // "Pending", "In Progress", "Completed", "Failed"
    public let timestamp: Double
    public var updatedTimestamp: Double?
    public let notes: String?
    public let line: String?
    
    public var progressPercentage: Double {
        guard targetUnits > 0 else { return 0 }
        return min(1.0, Double(unitsProduced) / Double(targetUnits))
    }
    
    public init(id: String, recipeId: String, recipeName: String, recipeHindiName: String, unitsProduced: Int, targetUnits: Int, status: String, timestamp: Double, updatedTimestamp: Double? = nil, notes: String? = nil, line: String? = nil) {
        self.id = id
        self.recipeId = recipeId
        self.recipeName = recipeName
        self.recipeHindiName = recipeHindiName
        self.unitsProduced = unitsProduced
        self.targetUnits = targetUnits
        self.status = status
        self.timestamp = timestamp
        self.updatedTimestamp = updatedTimestamp
        self.notes = notes
        self.line = line
    }
}

public struct BatchLogPayload: Codable {
    public let batchId: String
    public let productNameHindi: String
    public let productNameEnglish: String
    public let line: String
    public let unitsProduced: Int
    public let status: String
    public let timestamp: Double
    public let targetUnits: Int
    public let stage: String
    public let feedbackQuality: String?
    public let feedbackTexture: String?
    public let feedbackNotes: String?
    public let feedbackRating: Int?
    
    public init(batchId: String, productNameHindi: String, productNameEnglish: String, line: String, unitsProduced: Int, status: String = "Success", timestamp: Double = Date().timeIntervalSince1970 * 1000, targetUnits: Int, stage: String, feedbackQuality: String? = nil, feedbackTexture: String? = nil, feedbackNotes: String? = nil, feedbackRating: Int? = nil) {
        self.batchId = batchId
        self.productNameHindi = productNameHindi
        self.productNameEnglish = productNameEnglish
        self.line = line
        self.unitsProduced = unitsProduced
        self.status = status
        self.timestamp = timestamp
        self.targetUnits = targetUnits
        self.stage = stage
        self.feedbackQuality = feedbackQuality
        self.feedbackTexture = feedbackTexture
        self.feedbackNotes = feedbackNotes
        self.feedbackRating = feedbackRating
    }
}

public struct StationBreakPayload: Codable {
    public let stationId: String
    public let isOnBreak: Bool
    
    public init(stationId: String, isOnBreak: Bool) {
        self.stationId = stationId
        self.isOnBreak = isOnBreak
    }
}

public struct EmergencyReportPayload: Codable {
    public let stationId: String
    public let operatorName: String
    public let hazardType: String
    public let severity: String
    public let notes: String
    public let timestamp: Double
    
    public init(stationId: String, operatorName: String, hazardType: String, severity: String, notes: String, timestamp: Double = Date().timeIntervalSince1970 * 1000) {
        self.stationId = stationId
        self.operatorName = operatorName
        self.hazardType = hazardType
        self.severity = severity
        self.notes = notes
        self.timestamp = timestamp
    }
}

public struct ExtruderTelemetry: Codable, Hashable {
    public var zone1Temp: Double
    public var zone2Temp: Double
    public var zone3Temp: Double
    public var dieHeadTemp: Double
    public var meltPressureBar: Double
    public var motorRpm: Double
    public var feedRateKgH: Double
    public var moisturePercent: Double
    public var scrapRatePercent: Double
    
    public init(zone1Temp: Double = 185.0, zone2Temp: Double = 195.0, zone3Temp: Double = 205.0, dieHeadTemp: Double = 210.0, meltPressureBar: Double = 142.5, motorRpm: Double = 1250.0, feedRateKgH: Double = 450.0, moisturePercent: Double = 11.2, scrapRatePercent: Double = 0.8) {
        self.zone1Temp = zone1Temp
        self.zone2Temp = zone2Temp
        self.zone3Temp = zone3Temp
        self.dieHeadTemp = dieHeadTemp
        self.meltPressureBar = meltPressureBar
        self.motorRpm = motorRpm
        self.feedRateKgH = feedRateKgH
        self.moisturePercent = moisturePercent
        self.scrapRatePercent = scrapRatePercent
    }
}
