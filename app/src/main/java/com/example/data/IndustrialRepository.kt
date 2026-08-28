package com.example.data

import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.firstOrNull
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

class IndustrialRepository(
    private val productDao: ProductDao,
    private val batchLogDao: BatchLogDao,
    private val activeShiftDao: ActiveShiftDao,
    private val outboxDao: OutboxDao
) {
    val allProducts: Flow<List<ProductEntity>> = productDao.getAllProducts()
    val allBatchLogs: Flow<List<BatchLogEntity>> = batchLogDao.getAllBatchLogs()
    val activeShiftFlow: Flow<ActiveShiftEntity?> = activeShiftDao.getActiveShiftFlow()
    val allPendingLogs: Flow<List<OutboxEntity>> = outboxDao.getAllPendingLogsFlow()

    suspend fun insertProduct(product: ProductEntity) = withContext(Dispatchers.IO) {
        productDao.insertProduct(product)
    }

    suspend fun updateProduct(product: ProductEntity) = withContext(Dispatchers.IO) {
        productDao.updateProduct(product)
    }

    suspend fun deleteProduct(product: ProductEntity) = withContext(Dispatchers.IO) {
        productDao.deleteProduct(product)
    }

    suspend fun insertBatchLog(batchLog: BatchLogEntity) = withContext(Dispatchers.IO) {
        batchLogDao.insertBatchLog(batchLog)
    }

    suspend fun clearAllBatchLogs() = withContext(Dispatchers.IO) {
        batchLogDao.clearAllBatchLogs()
    }

    suspend fun getActiveShift(): ActiveShiftEntity? = withContext(Dispatchers.IO) {
        activeShiftDao.getActiveShift()
    }

    suspend fun saveActiveShift(shift: ActiveShiftEntity) = withContext(Dispatchers.IO) {
        activeShiftDao.saveActiveShift(shift)
    }

    suspend fun clearActiveShift() = withContext(Dispatchers.IO) {
        activeShiftDao.clearActiveShift()
    }

    suspend fun insertPendingLog(log: OutboxEntity) = withContext(Dispatchers.IO) {
        outboxDao.insertPendingLog(log)
    }

    suspend fun deletePendingLog(log: OutboxEntity) = withContext(Dispatchers.IO) {
        outboxDao.deletePendingLog(log)
    }

    suspend fun deletePendingLogs(ids: List<Int>) = withContext(Dispatchers.IO) {
        outboxDao.deletePendingLogs(ids)
    }

    suspend fun getAllPendingLogs(): List<OutboxEntity> = withContext(Dispatchers.IO) {
        outboxDao.getAllPendingLogs()
    }

    suspend fun populateInitialDataIfEmpty() = withContext(Dispatchers.IO) {
        val currentProducts = allProducts.firstOrNull() ?: emptyList()
        if (currentProducts.isEmpty()) {
            // Add initial products
            productDao.insertProduct(ProductEntity("PRD-001", "क्रीम स्पेशल", "Cream Special", 1200, "#00F0FF", true, "Cream_Special_Ops_v2.pdf", 480))
            productDao.insertProduct(ProductEntity("PRD-002", "प्रीमियम प्लस", "Premium Plus", 850, "#FF6B00", true, "Premium_Plus_Safety.pdf", 540))
            productDao.insertProduct(ProductEntity("PRD-003", "मानक मिश्रण", "Standard Blend", 2500, "#10B981", true, null, 360))
        }

        val currentLogs = allBatchLogs.firstOrNull() ?: emptyList()
        if (currentLogs.isEmpty()) {
            val now = System.currentTimeMillis()
            // Add initial history (with English-labeled data names and standard properties)
            batchLogDao.insertBatchLog(BatchLogEntity("B-4902", "क्रीम स्पेशल", "Cream Special", "Line A", 12500, "Success", now - 3 * 3600000, 5000))
            batchLogDao.insertBatchLog(BatchLogEntity("B-4901", "क्रीम स्पेशल", "Cream Special", "Line B", 4210, "Failed", now - 6 * 3600000, 2500))
            batchLogDao.insertBatchLog(BatchLogEntity("B-4900", "प्रीमियम प्लस", "Premium Plus", "Line A", 12480, "Success", now - 12 * 3600000, 5000))
            batchLogDao.insertBatchLog(BatchLogEntity("B-8899", "क्रीम स्पेशल", "Cream Special", "Line C", 8900, "Success", now - 18 * 3600000, 10000))
            batchLogDao.insertBatchLog(BatchLogEntity("B-8898", "प्रीमियम प्लस", "Premium Plus", "Line A", 1200, "Failed", now - 24 * 3600000, 2500))
        }
    }
}
