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
        
        val requestBuilder = Request.Builder()
        if (serverUrl.contains("supabase.co")) {
            val sbUrl = if (serverUrl.contains("/rest/v1")) serverUrl else "$serverUrl/rest/v1/batch_logs"
            requestBuilder.url(sbUrl)
                .post(body)
                .addHeader("apikey", "sb_publishable_XpvCTqc8gmJOxp0Rrwlyng_Sl3GEN1O")
                .addHeader("Authorization", "Bearer sb_publishable_XpvCTqc8gmJOxp0Rrwlyng_Sl3GEN1O")
                .addHeader("Prefer", "resolution=merge-duplicates")
        } else {
            val bulkUrl = if (serverUrl.endsWith("/api/logs/bulk")) serverUrl else "$serverUrl/api/logs/bulk"
            requestBuilder.url(bulkUrl)
                .post(body)
                .addHeader("Authorization", "Bearer $stationToken")
        }
        val request = requestBuilder.build()

        return try {
            client.newCall(request).execute().use { response ->
                if (response.isSuccessful) {
                    val ids = pendingLogs.map { it.id }
                    repository.deletePendingLogs(ids)
                    androidx.work.ListenableWorker.Result.success()
                } else {
                    androidx.work.ListenableWorker.Result.retry()
                }
            }
        } catch (e: Exception) {
            androidx.work.ListenableWorker.Result.retry()
        }
    }
}
