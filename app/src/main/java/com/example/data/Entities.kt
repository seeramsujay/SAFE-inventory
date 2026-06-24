package com.example.data

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "products")
data class ProductEntity(
    @PrimaryKey val id: String,
    val name: String, // Hindi Name: क्रीम स्पेशल
    val englishName: String, // English Name: Cream Special
    val targetUph: Int, // Target units per hour: e.g. 1200
    val colorHex: String, // Saturated color token: e.g. #00875A
    val isActive: Boolean,
    val manualFileName: String? = null, // PDF manuals
    val nominalBatchDurationSec: Int = 420
)

@Entity(tableName = "batch_logs")
data class BatchLogEntity(
    @PrimaryKey val batchId: String, // e.g. "B-4902"
    val productNameHindi: String,
    val productNameEnglish: String,
    val line: String, // Line A, Line B, Line C, CNC 04
    val unitsProduced: Int,
    val status: String, // "Success", "Failed"
    val timestamp: Long = System.currentTimeMillis(),
    val targetUnits: Int // e.g. 5000
)

@Entity(tableName = "active_shift")
data class ActiveShiftEntity(
    @PrimaryKey val id: Int = 1, // Singleton row
    val workerId: String,
    val pin: String,
    val loginTime: Long,
    val isHelmetChecked: Boolean,
    val isWorkplaceClean: Boolean,
    val isMachineNormal: Boolean,
    val isActive: Boolean
)

@Entity(tableName = "outbox_logs")
data class OutboxEntity(
    @PrimaryKey(autoGenerate = true) val id: Int = 0,
    val batchId: String,
    val productNameHindi: String,
    val productNameEnglish: String,
    val line: String,
    val unitsProduced: Int,
    val status: String,
    val timestamp: Long,
    val targetUnits: Int
)
