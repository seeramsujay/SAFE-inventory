package com.example.ui

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.example.data.*
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import kotlin.random.Random
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.RequestBody.Companion.toRequestBody

class IndustrialViewModel(
    application: Application,
    private val repository: IndustrialRepository
) : AndroidViewModel(application) {

    // Initialize database pre-population
    init {
        viewModelScope.launch {
            repository.populateInitialDataIfEmpty()
        }
        startLiveMonitoring()
        startPollingActiveOrders()
    }

    // 1. Database Streams
    val activeShift: StateFlow<ActiveShiftEntity?> = repository.activeShiftFlow
        .stateIn(viewModelScope, SharingStarted.Eagerly, null)

    val products: StateFlow<List<ProductEntity>> = repository.allProducts
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val batchLogs: StateFlow<List<BatchLogEntity>> = repository.allBatchLogs
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val pendingLogs: StateFlow<List<OutboxEntity>> = repository.allPendingLogs
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    // 2. Active Screen State/Layout state
    // Screens: "login", "worker_timer", "worker_extruder", "emergency", "admin"
    private val _currentScreen = MutableStateFlow("login")
    val currentScreen: StateFlow<String> = _currentScreen.asStateFlow()

    // 3. Login / Shift Entry Session State
    val workerIdInput = MutableStateFlow("")
    val pinInput = MutableStateFlow("")
    val isHelmetChecked = MutableStateFlow(false)
    val isWorkplaceClean = MutableStateFlow(false)
    val isMachineNormal = MutableStateFlow(false)

    // 4. Active Job state (Worker views)
    val activeBatchCountCompleted = MutableStateFlow(4)
    val activeBatchCountTotal = MutableStateFlow(14)
    val batchId = MutableStateFlow("B-4902")
    val activeProductNameEnglish = MutableStateFlow("Cream Special")
    val activeProductNameHindi = MutableStateFlow("क्रीम स्पेशल")
    val activeProductColorHex = MutableStateFlow("#00875A")
    val activeOrderId = MutableStateFlow("ORD-1001")

    // Countdown Timer logic: Starting from 6:42 (402 seconds)
    private val _timerRemainingSec = MutableStateFlow(402)
    val timerRemainingSec: StateFlow<Int> = _timerRemainingSec.asStateFlow()

    private var timerJob: Job? = null

    private fun startLiveMonitoring() {
        // Ticking countdown timer
        timerJob = viewModelScope.launch {
            while (true) {
                delay(1000)
                if (_timerRemainingSec.value > 0) {
                    _timerRemainingSec.value -= 1
                } else {
                    // Loop timer (e.g. reset to 8 mins of next batch)
                    _timerRemainingSec.value = 480
                }
                
                // Fluctuating temperature between 176 and 181
                val offset = Random.nextInt(-2, 3)
                val targetTemp = 178 + offset
                _currentTemperature.value = targetTemp
            }
        }
    }

    // Dynamic temperature state (for diagrams)
    private val _currentTemperature = MutableStateFlow(178)
    val currentTemperature: StateFlow<Int> = _currentTemperature.asStateFlow()

    // 5. Emergency state
    val selectedIssues = MutableStateFlow<Set<String>>(emptySet())
    val commentsText = MutableStateFlow("")

    fun toggleIssue(issue: String) {
        val current = selectedIssues.value
        if (current.contains(issue)) {
            selectedIssues.value = current - issue
        } else {
            selectedIssues.value = current + issue
        }
    }

    fun submitEmergencyReport() {
        viewModelScope.launch {
            val issueList = selectedIssues.value.joinToString(", ")
            val logsCount = batchLogs.value.size
            val nextInt = 4900 + logsCount + 1
            
            val entity = BatchLogEntity(
                batchId = "EMG-$nextInt",
                productNameHindi = "आपातकालीन: $issueList",
                productNameEnglish = "DOWNTIME: $issueList",
                line = "Line A",
                unitsProduced = 0,
                status = "Failed",
                timestamp = System.currentTimeMillis(),
                targetUnits = 0
            )

            // Insert emergency audit log to room DB
            repository.insertBatchLog(entity)

            // Sync to web companion app
            sendBatchLogToWeb(entity)

            // Reset emergency state
            selectedIssues.value = emptySet()
            commentsText.value = ""
            // Switch to safety status indicator or back
            _currentScreen.value = "worker_timer"
        }
    }

    // 6. Login authentication mechanics
    fun completeShiftLogin() {
        viewModelScope.launch {
            val shift = ActiveShiftEntity(
                workerId = workerIdInput.value,
                pin = pinInput.value,
                loginTime = System.currentTimeMillis(),
                isHelmetChecked = isHelmetChecked.value,
                isWorkplaceClean = isWorkplaceClean.value,
                isMachineNormal = isMachineNormal.value,
                isActive = true
            )
            repository.saveActiveShift(shift)
            _currentScreen.value = "worker_timer"
        }
    }

    fun logout() {
        viewModelScope.launch {
            repository.clearActiveShift()
            // Reset state
            workerIdInput.value = ""
            pinInput.value = ""
            isHelmetChecked.value = false
            isWorkplaceClean.value = false
            isMachineNormal.value = false
            _currentScreen.value = "login"
        }
    }

    // 7. Batch completion action via Swipe-To-Confirm Slider
    fun completeActiveBatch() {
        viewModelScope.launch {
            val currentProductHindi = activeProductNameHindi.value
            val currentProductEnglish = activeProductNameEnglish.value
            
            val nextBatchNum = System.currentTimeMillis() % 1000000
            val nextBatchId = "B-$nextBatchNum"

            val completed = activeBatchCountCompleted.value + 1
            activeBatchCountCompleted.value = completed

            val entity = BatchLogEntity(
                batchId = nextBatchId,
                productNameHindi = currentProductHindi,
                productNameEnglish = currentProductEnglish,
                line = "Line A",
                unitsProduced = 1250,
                status = "Success",
                timestamp = System.currentTimeMillis(),
                targetUnits = 1250
            )

            // Insert into SQLite database
            repository.insertBatchLog(entity)

            // Sync to web companion app
            sendBatchLogToWeb(entity)

            // PATCH update to the server
            viewModelScope.launch(kotlinx.coroutines.Dispatchers.IO) {
                try {
                    val serverUrl = com.example.data.PreferencesManager.getServerUrl(getApplication())
                    val orderId = activeOrderId.value
                    val newStatus = if (completed >= activeBatchCountTotal.value) "COMPLETED" else "ACTIVE"
                    if (orderId.isNotBlank() && serverUrl.isNotBlank()) {
                        val json = """
                            {
                              "completedBatches": $completed,
                              "status": "$newStatus"
                            }
                        """.trimIndent()
                        val client = NetworkUtils.getOkHttpClient()
                        val body = json.toRequestBody("application/json; charset=utf-8".toMediaTypeOrNull())
                        val request = okhttp3.Request.Builder()
                            .url("$serverUrl/api/orders/$orderId/status")
                            .patch(body)
                            .build()
                        client.newCall(request).execute().use { response ->
                            // Update successful
                        }
                    }
                } catch (e: java.lang.Exception) {
                    android.util.Log.e("NexusSync", "Failed patching order: ${e.message}")
                }
            }

            // Find matching product to set nominal timer
            val prod = products.value.find { it.englishName == currentProductEnglish }
            val nominalDuration = prod?.nominalBatchDurationSec ?: 420
            _timerRemainingSec.value = nominalDuration
        }
    }

    // 8. Admin States & Functions
    fun triggerClearAllBatchLogs() {
        viewModelScope.launch {
            repository.clearAllBatchLogs()
        }
    }

    // Active admin sub-screens: "overview", "batch_history", "product_catalog", "efficiency"
    val adminSubScreen = MutableStateFlow("overview")
    val batchSearchQuery = MutableStateFlow("")
    val lineFilter = MutableStateFlow("")
    val productFilter = MutableStateFlow("")

    // Product Specifications editing form variables
    val editedProductId = MutableStateFlow("PRD-001")
    val editedProductName = MutableStateFlow("Cream Special")
    val editedProductHindiName = MutableStateFlow("क्रीम स्पेशल")
    val editedProductTargetUph = MutableStateFlow("1200")
    val editedProductColorToken = MutableStateFlow("#00875A")
    val editedProductStatusIsActive = MutableStateFlow(true)
    val editedProductManualFile = MutableStateFlow("Cream_Special_Ops_v2.pdf")

    fun selectProductForEditing(product: ProductEntity) {
        editedProductId.value = product.id
        editedProductName.value = product.englishName
        editedProductHindiName.value = product.name
        editedProductTargetUph.value = product.targetUph.toString()
        editedProductColorToken.value = product.colorHex
        editedProductStatusIsActive.value = product.isActive
        editedProductManualFile.value = product.manualFileName ?: "None"
    }

    fun saveProductChanges() {
        viewModelScope.launch {
            val uphInt = editedProductTargetUph.value.toIntOrNull() ?: 1200
            val pEntity = ProductEntity(
                id = editedProductId.value,
                name = editedProductHindiName.value,
                englishName = editedProductName.value,
                targetUph = uphInt,
                colorHex = editedProductColorToken.value,
                isActive = editedProductStatusIsActive.value,
                manualFileName = if (editedProductManualFile.value == "None") null else editedProductManualFile.value
            )
            repository.updateProduct(pEntity)
        }
    }

    fun createNewProduct() {
        viewModelScope.launch {
            val logsCount = products.value.size
            val nextId = "PRD-00${logsCount + 1}"
            val pEntity = ProductEntity(
                id = nextId,
                name = "नया उत्पाद (New)",
                englishName = "New Product",
                targetUph = 1000,
                colorHex = "#3B82F6",
                isActive = true,
                manualFileName = null
            )
            repository.insertProduct(pEntity)
            selectProductForEditing(pEntity)
        }
    }

    fun insertManualBatch(batchIdInput: String, lines: String, units: Int, isSuccess: Boolean) {
        viewModelScope.launch {
            val entity = BatchLogEntity(
                batchId = batchIdInput,
                productNameHindi = "क्रीम स्पेशल",
                productNameEnglish = "Cream Special",
                line = lines,
                unitsProduced = units,
                status = if (isSuccess) "Success" else "Failed",
                timestamp = System.currentTimeMillis(),
                targetUnits = units
            )
            repository.insertBatchLog(entity)
            sendBatchLogToWeb(entity)
        }
    }

    private fun sendBatchLogToWeb(entity: BatchLogEntity) {
        viewModelScope.launch {
            val outboxItem = OutboxEntity(
                batchId = entity.batchId,
                productNameHindi = entity.productNameHindi,
                productNameEnglish = entity.productNameEnglish,
                line = entity.line,
                unitsProduced = entity.unitsProduced,
                status = entity.status,
                timestamp = entity.timestamp,
                targetUnits = entity.targetUnits
            )
            repository.insertPendingLog(outboxItem)
            triggerOfflineSync()
        }
    }

    fun triggerOfflineSync() {
        val constraints = androidx.work.Constraints.Builder()
            .setRequiredNetworkType(androidx.work.NetworkType.CONNECTED)
            .build()
        val syncWorkRequest = androidx.work.OneTimeWorkRequest.Builder(SyncWorker::class.java)
            .setConstraints(constraints)
            .build()
        androidx.work.WorkManager.getInstance(getApplication())
            .enqueueUniqueWork("nexus_offline_sync", androidx.work.ExistingWorkPolicy.KEEP, syncWorkRequest)
    }

    private var pollJob: kotlinx.coroutines.Job? = null

    fun startPollingActiveOrders() {
        pollJob?.cancel()
        pollJob = viewModelScope.launch(kotlinx.coroutines.Dispatchers.IO) {
            val client = NetworkUtils.getOkHttpClient()
            while (true) {
                val serverUrl = com.example.data.PreferencesManager.getServerUrl(getApplication())
                if (serverUrl.isNotBlank()) {
                    try {
                        val requestBuilder = okhttp3.Request.Builder()
                        if (serverUrl.contains("supabase.co")) {
                            val sbUrl = if (serverUrl.contains("/rest/v1")) serverUrl else "$serverUrl/rest/v1/orders"
                            requestBuilder.url(sbUrl)
                                .addHeader("apikey", "sb_publishable_XpvCTqc8gmJOxp0Rrwlyng_Sl3GEN1O")
                                .addHeader("Authorization", "Bearer sb_publishable_XpvCTqc8gmJOxp0Rrwlyng_Sl3GEN1O")
                        } else {
                            val ordUrl = if (serverUrl.endsWith("/api/orders")) serverUrl else "$serverUrl/api/orders"
                            requestBuilder.url(ordUrl)
                        }
                        val request = requestBuilder.build()
                        client.newCall(request).execute().use { response ->
                            if (response.isSuccessful) {
                                val bodyStr = response.body?.string()
                                if (!bodyStr.isNullOrBlank()) {
                                    val jsonArray = org.json.JSONArray(bodyStr)
                                    var foundActive = false
                                    for (i in 0 until jsonArray.length()) {
                                        val obj = jsonArray.getJSONObject(i)
                                        if (obj.optString("status") == "ACTIVE") {
                                            foundActive = true
                                            val id = obj.optString("id")
                                            val productKey = obj.optString("productKey")
                                            val nameEng = obj.optString("productNameEnglish")
                                            val nameHin = obj.optString("productNameHindi")
                                            val scheduled = obj.optInt("totalBatchesScheduled")
                                            val completed = obj.optInt("completedBatches")
                                            val color = obj.optString("colorHex", "#00875A")

                                            viewModelScope.launch(kotlinx.coroutines.Dispatchers.Main) {
                                                activeOrderId.value = id
                                                activeProductNameEnglish.value = nameEng
                                                activeProductNameHindi.value = nameHin
                                                activeProductColorHex.value = color
                                                activeBatchCountTotal.value = scheduled
                                                activeBatchCountCompleted.value = completed

                                                val prod = products.value.find { it.id == productKey || it.englishName == nameEng }
                                                val nominalDuration = prod?.nominalBatchDurationSec ?: 420
                                                if (batchId.value != "B-${id}") {
                                                    _timerRemainingSec.value = nominalDuration
                                                    batchId.value = "B-${id}"
                                                }
                                            }
                                            break
                                        }
                                    }
                                    if (!foundActive) {
                                        viewModelScope.launch(kotlinx.coroutines.Dispatchers.Main) {
                                            activeOrderId.value = ""
                                            activeProductNameEnglish.value = "No Active Order"
                                            activeProductNameHindi.value = "कोई सक्रिय आदेश नहीं"
                                            activeProductColorHex.value = "#7F7F7F"
                                        }
                                    }
                                }
                            }
                        }
                    } catch (e: Exception) {
                        android.util.Log.e("NexusPoll", "Failed loading orders: ${e.message}")
                    }
                }
                kotlinx.coroutines.delay(10000)
            }
        }
    }

    fun navigationTo(screen: String) {
        _currentScreen.value = screen
    }

    override fun onCleared() {
        super.onCleared()
        timerJob?.cancel()
        pollJob?.cancel()
    }
}

class IndustrialViewModelFactory(
    private val application: Application,
    private val repository: IndustrialRepository
) : ViewModelProvider.Factory {
    @Suppress("UNCHECKED_CAST")
    override fun <T : ViewModel> create(modelClass: Class<T>): T {
        if (modelClass.isAssignableFrom(IndustrialViewModel::class.java)) {
            return IndustrialViewModel(application, repository) as T
        }
        throw IllegalArgumentException("Unknown ViewModel class")
    }
}
