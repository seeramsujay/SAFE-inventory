package com.example.data

import androidx.room.*
import kotlinx.coroutines.flow.Flow

@Dao
interface ProductDao {
    @Query("SELECT * FROM products ORDER BY id ASC")
    fun getAllProducts(): Flow<List<ProductEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertProduct(product: ProductEntity)

    @Update
    suspend fun updateProduct(product: ProductEntity)

    @Delete
    suspend fun deleteProduct(product: ProductEntity)
}

@Dao
interface BatchLogDao {
    @Query("SELECT * FROM batch_logs ORDER BY timestamp DESC")
    fun getAllBatchLogs(): Flow<List<BatchLogEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertBatchLog(batchLog: BatchLogEntity)

    @Query("DELETE FROM batch_logs")
    suspend fun clearAllBatchLogs()
}

@Dao
interface ActiveShiftDao {
    @Query("SELECT * FROM active_shift WHERE id = 1 LIMIT 1")
    fun getActiveShiftFlow(): Flow<ActiveShiftEntity?>

    @Query("SELECT * FROM active_shift WHERE id = 1 LIMIT 1")
    suspend fun getActiveShift(): ActiveShiftEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun saveActiveShift(shift: ActiveShiftEntity)

    @Query("DELETE FROM active_shift WHERE id = 1")
    suspend fun clearActiveShift()
}

@Dao
interface OutboxDao {
    @Query("SELECT * FROM outbox_logs ORDER BY id ASC")
    fun getAllPendingLogsFlow(): Flow<List<OutboxEntity>>

    @Query("SELECT * FROM outbox_logs ORDER BY id ASC")
    suspend fun getAllPendingLogs(): List<OutboxEntity>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertPendingLog(log: OutboxEntity)

    @Delete
    suspend fun deletePendingLog(log: OutboxEntity)

    @Query("DELETE FROM outbox_logs WHERE id IN (:ids)")
    suspend fun deletePendingLogs(ids: List<Int>)
}
