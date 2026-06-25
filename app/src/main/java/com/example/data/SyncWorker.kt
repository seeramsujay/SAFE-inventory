package com.example.data

import android.content.Context
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONArray
import org.json.JSONObject
import java.util.concurrent.TimeUnit

class SyncWorker(
    appContext: Context,
    workerParams: WorkerParameters
) : CoroutineWorker(appContext, workerParams) {

    override suspend fun doWork(): androidx.work.ListenableWorker.Result {
        val database = AppDatabase.getDatabase(applicationContext)
        val repository = IndustrialRepository(
            database.productDao(),
            database.batchLogDao(),
            database.activeShiftDao(),
            database.outboxDao()
        )

        val pendingLogs = repository.getAllPendingLogs()
        if (pendingLogs.isEmpty()) {
            return androidx.work.ListenableWorker.Result.success()
        }

        val serverUrl = PreferencesManager.getServerUrl(applicationContext)
        val stationToken = PreferencesManager.getStationToken(applicationContext)

        val jsonArray = JSONArray()
        for (log in pendingLogs) {
            val item = JSONObject().apply {
                put("batchId", log.batchId)
                put("productNameHindi", log.productNameHindi)
                put("productNameEnglish", log.productNameEnglish)
                put("line", log.line)
                put("unitsProduced", log.unitsProduced)
                put("status", log.status)
                put("timestamp", log.timestamp)
                put("targetUnits", log.targetUnits)
            }
            jsonArray.put(item)
        }

        val client = NetworkUtils.getOkHttpClient()

        val body = jsonArray.toString().toRequestBody("application/json; charset=utf-8".toMediaTypeOrNull())
        
        var cleanUrl = serverUrl.trim()
        while (cleanUrl.endsWith("/")) {
            cleanUrl = cleanUrl.substring(0, cleanUrl.length - 1)
        }

        val requestBuilder = Request.Builder()
        if (cleanUrl.contains("supabase.co")) {
            val sbUrl = if (cleanUrl.contains("/rest/v1")) cleanUrl else "$cleanUrl/rest/v1/batch_logs"
            requestBuilder.url(sbUrl)
                .post(body)
                .addHeader("apikey", "sb_publishable_XpvCTqc8gmJOxp0Rrwlyng_Sl3GEN1O")
                .addHeader("Authorization", "Bearer sb_publishable_XpvCTqc8gmJOxp0Rrwlyng_Sl3GEN1O")
                .addHeader("Prefer", "resolution=merge-duplicates")
        } else {
            val bulkUrl = "$cleanUrl/api/logs/bulk"
            requestBuilder.url(bulkUrl)
                .post(body)
                .addHeader("Authorization", "Bearer $stationToken")
                .addHeader("X-Station-Id", PreferencesManager.getStationId(applicationContext))
        }
        val request = requestBuilder.build()

        return try {
            client.newCall(request).execute().use { response ->
                android.util.Log.d("SyncWorker", "Response code: ${response.code}, successful: ${response.isSuccessful}")
                if (response.isSuccessful) {
                    val ids = pendingLogs.map { it.id }
                    repository.deletePendingLogs(ids)
                    androidx.work.ListenableWorker.Result.success()
                } else {
                    if (response.code == 401 || response.code == 403) {
                        android.util.Log.w("SyncWorker", "Token is invalid or expired. Clearing pairing.")
                        PreferencesManager.clearPairing(applicationContext)
                        androidx.work.ListenableWorker.Result.failure()
                    } else {
                        android.util.Log.e("SyncWorker", "Sync failed with status code ${response.code}: ${response.message}")
                        androidx.work.ListenableWorker.Result.retry()
                    }
                }
            }
        } catch (e: Exception) {
            android.util.Log.e("SyncWorker", "Sync exception: ${e.message}", e)
            androidx.work.ListenableWorker.Result.retry()
        }
    }
}
