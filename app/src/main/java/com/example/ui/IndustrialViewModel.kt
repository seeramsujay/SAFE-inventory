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

data class OrderInfo(
    val id: String,
    val productNameHindi: String,
    val productNameEnglish: String,
    val totalBatchesScheduled: Int,
    val completedBatches: Int,
    val colorHex: String,
    val status: String,
    val timestamp: Long = 0L
)

data class UpcomingOrderItem(
    val orderId: String,
    val currentBatchNumber: Int,
    val completedBatches: Int,
    val totalBatchesInOrder: Int,
    val productNameHindi: String,
    val productNameEnglish: String,
    val colorHex: String,
    val isSelected: Boolean = false,
    val status: String = "ACTIVE"
)

class IndustrialViewModel(
    application: Application,
    private val repository: IndustrialRepository
) : AndroidViewModel(application) {

    // Reactive Station Pairing State
    private val _stationId = MutableStateFlow("")
    val stationId: StateFlow<String> = _stationId.asStateFlow()

    private val _stationType = MutableStateFlow("mixer")
    val stationType: StateFlow<String> = _stationType.asStateFlow()

    private val _serverUrl = MutableStateFlow(com.example.data.PreferencesManager.getServerUrl(application))
    val serverUrl: StateFlow<String> = _serverUrl.asStateFlow()

    // 3. Login / Shift Entry Session State
    val workerIdInput = MutableStateFlow("")
    val pinInput = MutableStateFlow("")
    val isHelmetChecked = MutableStateFlow(false)
    val isWorkplaceClean = MutableStateFlow(false)
    val isMachineNormal = MutableStateFlow(false)

    // Full day order queue state
    private val _ordersQueue = MutableStateFlow<List<OrderInfo>>(emptyList())
    val ordersQueue: StateFlow<List<OrderInfo>> = _ordersQueue.asStateFlow()

    // Active order ID being operated on
    val activeOrderId = MutableStateFlow("")

    // Selected batch number for active working formula
    val selectedBatchNumber = MutableStateFlow(1)

    // Reactive stream of product order tiles in the queue (1 product per single tile)
    val upcomingOrders: StateFlow<List<UpcomingOrderItem>> = kotlinx.coroutines.flow.combine(
        _ordersQueue,
        activeOrderId,
        selectedBatchNumber
    ) { orders, actId, selNum ->
        val list = mutableListOf<UpcomingOrderItem>()
        for (ord in orders) {
            if (ord.status == "ACTIVE" || ord.status == "PENDING" || ord.status.equals("In Progress", ignoreCase = true)) {
                val isSel = (ord.id == actId)
                val currBatch = if (isSel) selNum else minOf(ord.totalBatchesScheduled, ord.completedBatches + 1)
                list.add(
                    UpcomingOrderItem(
                        orderId = ord.id,
                        currentBatchNumber = currBatch,
                        completedBatches = ord.completedBatches,
                        totalBatchesInOrder = ord.totalBatchesScheduled,
                        productNameHindi = ord.productNameHindi,
                        productNameEnglish = ord.productNameEnglish,
                        colorHex = ord.colorHex,
                        isSelected = isSel,
                        status = ord.status
                    )
                )
            }
        }
        list
    }.stateIn(viewModelScope, SharingStarted.Eagerly, emptyList())

    // Backward compatibility alias if needed
    val upcomingBatches = upcomingOrders

    fun selectOrder(item: UpcomingOrderItem) {
        activeOrderId.value = item.orderId
        val nextBatch = minOf(item.totalBatchesInOrder, item.completedBatches + 1)
        selectedBatchNumber.value = nextBatch
        activeProductNameEnglish.value = item.productNameEnglish
        activeProductNameHindi.value = item.productNameHindi
        activeProductColorHex.value = item.colorHex
        activeBatchCountTotal.value = item.totalBatchesInOrder
        activeBatchCountCompleted.value = item.completedBatches
        val isGrind = stationType.value == "grinder"
        batchId.value = "B-${item.orderId}-$nextBatch${if (isGrind) "-GRIND" else "-MIX"}"
    }

    fun selectBatch(item: UpcomingOrderItem) {
        selectOrder(item)
    }

    // Break/Lunch status states
    private val _isOnBreak = MutableStateFlow(false)
    val isOnBreak: StateFlow<Boolean> = _isOnBreak.asStateFlow()

    private val _breakDurationSec = MutableStateFlow(0)
    val breakDurationSec: StateFlow<Int> = _breakDurationSec.asStateFlow()

    private var breakJob: Job? = null

    // 2. Active Screen State/Layout state
    // Screens: "login", "worker_timer", "worker_extruder", "emergency", "admin"
    private val _currentScreen = MutableStateFlow(
        if (com.example.data.PreferencesManager.isPaired(application)) "worker_timer" else "login"
    )
    val currentScreen: StateFlow<String> = _currentScreen.asStateFlow()

    // Initialize database pre-population
    init {
        viewModelScope.launch {
            repository.populateInitialDataIfEmpty()
        }
        startLiveMonitoring()
        startPollingActiveOrders()
        
        // Initialize pairing state from preferences
        val savedStation = com.example.data.PreferencesManager.getStationId(application)
        _stationId.value = savedStation
        _stationType.value = com.example.data.PreferencesManager.getStationType(application)
        
        // Load persistent break state
        _isOnBreak.value = com.example.data.PreferencesManager.getIsOnBreak(application)
        if (_isOnBreak.value) {
            val startTime = com.example.data.PreferencesManager.getBreakStartTime(application)
            val elapsed = ((System.currentTimeMillis() - startTime) / 1000).toInt()
            _breakDurationSec.value = maxOf(0, elapsed)
            breakJob?.cancel()
            breakJob = viewModelScope.launch {
                while (_isOnBreak.value) {
                    delay(1000)
                    _breakDurationSec.value += 1
                }
            }
            syncBreakStatusToServer(true)
        }

        if (com.example.data.PreferencesManager.isPaired(application)) {
            workerIdInput.value = savedStation
            pinInput.value = com.example.data.PreferencesManager.getStationToken(application)
            _currentScreen.value = "worker_timer"
            triggerOfflineSync()
        }
    }

    // 1. Database Streams
    val activeShift: StateFlow<ActiveShiftEntity?> = repository.activeShiftFlow
        .stateIn(viewModelScope, SharingStarted.Eagerly, null)

    val products: StateFlow<List<ProductEntity>> = repository.allProducts
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val batchLogs: StateFlow<List<BatchLogEntity>> = repository.allBatchLogs
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val pendingLogs: StateFlow<List<OutboxEntity>> = repository.allPendingLogs
        .stateIn(viewModelScope, SharingStarted.Eagerly, emptyList())

    fun savePairing(stationId: String, token: String, url: String, stationType: String = "") {
        var cleanedUrl = url.trim()
        if (cleanedUrl.isNotBlank() && !cleanedUrl.startsWith("http://") && !cleanedUrl.startsWith("https://")) {
            cleanedUrl = "http://$cleanedUrl"
        }
        if (cleanedUrl.endsWith("/")) {
            cleanedUrl = cleanedUrl.substring(0, cleanedUrl.length - 1)
        }
        val finalType = if (stationType.isNotBlank()) stationType else if (stationId.contains("GRIND", ignoreCase = true)) "grinder" else "mixer"
        com.example.data.PreferencesManager.savePairing(getApplication(), cleanedUrl, token, stationId, finalType)
        _stationId.value = stationId
        _stationType.value = finalType
        _serverUrl.value = cleanedUrl
        workerIdInput.value = stationId
        pinInput.value = token
        _currentScreen.value = "worker_timer"
        triggerOfflineSync()
    }

    fun clearPairing() {
        com.example.data.PreferencesManager.clearPairing(getApplication())
        _stationId.value = ""
        _stationType.value = "mixer"
        _serverUrl.value = ""
        workerIdInput.value = ""
        pinInput.value = ""
        _currentScreen.value = "login"
    }

    // 4. Active Job state (Worker views) — all initialized to neutral/empty state.
    // These get overwritten by the first successful poll from the server (~2s after boot).
    val activeBatchCountCompleted = MutableStateFlow(0)
    val activeBatchCountTotal = MutableStateFlow(0)
    val batchId = MutableStateFlow("--")
    val activeProductNameEnglish = MutableStateFlow("")
    val activeProductNameHindi = MutableStateFlow("")
    val activeProductColorHex = MutableStateFlow("#1A1A1A")

    // Next pending order name — shown in the NEXT JOB card on WorkerTimerScreen
    val nextPendingOrderNameHindi = MutableStateFlow("--")
    val nextPendingOrderNameEnglish = MutableStateFlow("--")

    // Countdown Timer logic removed as per requirements (kept zeroed/dummy for backwards compatibility)
    private val _timerRemainingSec = MutableStateFlow(0)
    val timerRemainingSec: StateFlow<Int> = _timerRemainingSec.asStateFlow()

    private var monitorJob: Job? = null

    private fun startLiveMonitoring() {
        monitorJob = viewModelScope.launch {
            while (true) {
                delay(1000)
                // Fluctuating temperature between 176 and 181 for diagnostics
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
            // Reset checklist state for next shift worker, but keep paired station ID and token connected
            isHelmetChecked.value = false
            isWorkplaceClean.value = false
            isMachineNormal.value = false
            
            // Re-populate paired station ID & token if device is paired (Set-and-forget pairing)
            val savedStation = com.example.data.PreferencesManager.getStationId(getApplication())
            val savedToken = com.example.data.PreferencesManager.getStationToken(getApplication())
            if (savedStation.isNotBlank()) {
                workerIdInput.value = savedStation
                pinInput.value = savedToken
            } else {
                workerIdInput.value = ""
                pinInput.value = ""
            }
            _currentScreen.value = "login"
        }
    }

    fun startBreak() {
        val now = System.currentTimeMillis()
        _isOnBreak.value = true
        _breakDurationSec.value = 0
        com.example.data.PreferencesManager.setIsOnBreak(getApplication(), true)
        com.example.data.PreferencesManager.setBreakStartTime(getApplication(), now)
        breakJob?.cancel()
        breakJob = viewModelScope.launch {
            while (_isOnBreak.value) {
                delay(1000)
                _breakDurationSec.value += 1
            }
        }
        syncBreakStatusToServer(true)
    }

    fun endBreak() {
        _isOnBreak.value = false
        com.example.data.PreferencesManager.setIsOnBreak(getApplication(), false)
        com.example.data.PreferencesManager.setBreakStartTime(getApplication(), 0L)
        breakJob?.cancel()
        syncBreakStatusToServer(false)
    }

    fun endShift() {
        viewModelScope.launch {
            endBreak()
            logout()
        }
    }

    // 7. Batch completion action via Swipe-To-Confirm Slider
    fun completeActiveBatch(
        feedbackQuality: String? = null,
        feedbackTexture: String? = null,
        feedbackNotes: String? = null,
        feedbackRating: Int = 5
    ) {
        viewModelScope.launch {
            val currentProductHindi = activeProductNameHindi.value
            val currentProductEnglish = activeProductNameEnglish.value
            val currentOrderId = activeOrderId.value
            val currentBatchNum = selectedBatchNumber.value
            val isGrind = stationType.value == "grinder"
            val nextBatchId = "B-$currentOrderId-$currentBatchNum${if (isGrind) "-GRIND" else "-MIX"}"

            val completed = activeBatchCountCompleted.value + 1
            val total = activeBatchCountTotal.value
            activeBatchCountCompleted.value = completed

            if (completed < total) {
                selectedBatchNumber.value = completed + 1
                val isNextGrind = stationType.value == "grinder"
                batchId.value = "B-$currentOrderId-${completed + 1}${if (isNextGrind) "-GRIND" else "-MIX"}"
            }

            // Optimistically update orders queue so UI reflects the progress instantly
            val updatedQueue = _ordersQueue.value.map { ord ->
                if (ord.id == currentOrderId) {
                    val newCompleted = ord.completedBatches + 1
                    val newStatus = if (newCompleted >= ord.totalBatchesScheduled) "COMPLETED" else "ACTIVE"
                    ord.copy(completedBatches = newCompleted, status = newStatus)
                } else ord
            }
            _ordersQueue.value = updatedQueue

            // If this order completed all batches, automatically activate the next pending order
            if (completed >= total && total > 0) {
                val nextOrder = updatedQueue.firstOrNull { it.status == "PENDING" && it.id != currentOrderId }
                if (nextOrder != null) {
                    activeOrderId.value = nextOrder.id
                    activeProductNameEnglish.value = nextOrder.productNameEnglish
                    activeProductNameHindi.value = nextOrder.productNameHindi
                    activeProductColorHex.value = nextOrder.colorHex
                    activeBatchCountTotal.value = nextOrder.totalBatchesScheduled
                    activeBatchCountCompleted.value = nextOrder.completedBatches
                    val nextBatch = minOf(nextOrder.totalBatchesScheduled, nextOrder.completedBatches + 1)
                    selectedBatchNumber.value = nextBatch
                    val isNextGrind = stationType.value == "grinder"
                    batchId.value = "B-${nextOrder.id}-$nextBatch${if (isNextGrind) "-GRIND" else "-MIX"}"
                }
            }

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

            // Direct notify backend
            viewModelScope.launch(kotlinx.coroutines.Dispatchers.IO) {
                try {
                    val serverUrl = com.example.data.PreferencesManager.getServerUrl(getApplication())
                    val stationToken = com.example.data.PreferencesManager.getStationToken(getApplication())
                    if (serverUrl.isNotBlank()) {
                        val json = org.json.JSONObject().apply {
                            put("batchId", nextBatchId)
                            put("orderId", currentOrderId)
                            put("productNameEnglish", currentProductEnglish)
                            put("productNameHindi", currentProductHindi)
                            put("stage", if (isGrind) "grinder" else "mixer")
                            put("status", "Success")
                            put("unitsProduced", 1250)
                            put("timestamp", System.currentTimeMillis())
                            if (!isGrind) {
                                put("feedbackQuality", feedbackQuality ?: "Grade A - Optimal")
                                put("feedbackTexture", feedbackTexture ?: "Smooth Homogeneous")
                                put("feedbackNotes", feedbackNotes ?: "")
                                put("feedbackRating", feedbackRating)
                            }
                        }.toString()
                        val client = NetworkUtils.getOkHttpClient()
                        val body = json.toRequestBody("application/json; charset=utf-8".toMediaTypeOrNull())
                        val request = okhttp3.Request.Builder()
                            .url("$serverUrl/api/logs")
                            .post(body)
                            .addHeader("Authorization", "Bearer $stationToken")
                            .build()
                        client.newCall(request).execute().use { }
                    }
                } catch (e: Exception) {
                    android.util.Log.e("NexusComplete", "Failed logging batch: ${e.message}")
                }
            }

            // Completed active batch state
        }
    }

    // Grinder Bulk Pulverize: Allows grinding the entire remaining batch set in one go
    fun completeBulkGrind(orderId: String, totalBatches: Int) {
        viewModelScope.launch {
            val currentProductHindi = activeProductNameHindi.value
            val currentProductEnglish = activeProductNameEnglish.value
            val bulkBatchId = "B-$orderId-BULK-GRIND-${System.currentTimeMillis() % 1000000}"

            val entity = BatchLogEntity(
                batchId = bulkBatchId,
                productNameHindi = "$currentProductHindi [थोक पिसाई]",
                productNameEnglish = "$currentProductEnglish [BULK GRIND: $totalBatches BATCHES]",
                line = "Line A",
                unitsProduced = totalBatches * 1250,
                status = "Success",
                timestamp = System.currentTimeMillis(),
                targetUnits = totalBatches * 1250
            )

            repository.insertBatchLog(entity)
            sendBatchLogToWeb(entity)

            // Notify backend of bulk pulverization
            viewModelScope.launch(kotlinx.coroutines.Dispatchers.IO) {
                try {
                    val serverUrl = com.example.data.PreferencesManager.getServerUrl(getApplication())
                    val stationToken = com.example.data.PreferencesManager.getStationToken(getApplication())
                    if (serverUrl.isNotBlank()) {
                        val json = org.json.JSONObject().apply {
                            put("batchId", bulkBatchId)
                            put("orderId", orderId)
                            put("productNameEnglish", currentProductEnglish)
                            put("productNameHindi", currentProductHindi)
                            put("stage", "grinder")
                            put("bulkGrind", true)
                            put("batchesCount", totalBatches)
                            put("status", "Success")
                            put("unitsProduced", totalBatches * 1250)
                            put("timestamp", System.currentTimeMillis())
                        }.toString()
                        val client = NetworkUtils.getOkHttpClient()
                        val body = json.toRequestBody("application/json; charset=utf-8".toMediaTypeOrNull())
                        val request = okhttp3.Request.Builder()
                            .url("$serverUrl/api/logs")
                            .post(body)
                            .addHeader("Authorization", "Bearer $stationToken")
                            .build()
                        client.newCall(request).execute().use { }
                    }
                } catch (e: Exception) {
                    android.util.Log.e("NexusBulkGrind", "Failed bulk grind log: ${e.message}")
                }
            }
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
    val editedProductNominalBatchDurationMin = MutableStateFlow("8.0")
    val editedProductColorToken = MutableStateFlow("#00875A")
    val editedProductStatusIsActive = MutableStateFlow(true)
    val editedProductManualFile = MutableStateFlow("Cream_Special_Ops_v2.pdf")

    fun selectProductForEditing(product: ProductEntity) {
        editedProductId.value = product.id
        editedProductName.value = product.englishName
        editedProductHindiName.value = product.name
        editedProductNominalBatchDurationMin.value = (product.nominalBatchDurationSec / 60.0).toString()
        editedProductColorToken.value = product.colorHex
        editedProductStatusIsActive.value = product.isActive
        editedProductManualFile.value = product.manualFileName ?: "None"
    }

    fun saveProductChanges() {
        viewModelScope.launch {
            val minutesDouble = editedProductNominalBatchDurationMin.value.toDoubleOrNull() ?: 8.0
            val durationSec = Math.round(minutesDouble * 60.0).toInt()
            val uphInt = Math.round(1250.0 * 60.0 / minutesDouble).toInt()
            
            val existing = products.value.find { it.id == editedProductId.value }
            val existingRatios = existing?.mixtureRatios

            val pEntity = ProductEntity(
                id = editedProductId.value,
                name = editedProductHindiName.value,
                englishName = editedProductName.value,
                targetUph = uphInt,
                colorHex = editedProductColorToken.value,
                isActive = editedProductStatusIsActive.value,
                manualFileName = if (editedProductManualFile.value == "None") null else editedProductManualFile.value,
                nominalBatchDurationSec = durationSec,
                mixtureRatios = existingRatios
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
        // KEEP: never cancel a running sync mid-flight. If sync is already running,
        // leave it. WorkManager will pick up any remaining outbox items on the next trigger.
        androidx.work.WorkManager.getInstance(getApplication())
            .enqueueUniqueWork("nexus_offline_sync", androidx.work.ExistingWorkPolicy.KEEP, syncWorkRequest)
    }

    private var pollJob: kotlinx.coroutines.Job? = null

    fun startPollingActiveOrders() {
        pollJob?.cancel()
        pollJob = viewModelScope.launch(kotlinx.coroutines.Dispatchers.IO) {
            val client = NetworkUtils.getOkHttpClient()
            while (true) {
                if (com.example.data.PreferencesManager.isPaired(getApplication())) {
                    val serverUrl = com.example.data.PreferencesManager.getServerUrl(getApplication())
                    val stationToken = com.example.data.PreferencesManager.getStationToken(getApplication())

                    // 1. Sync products first so the screen can always resolve product names
                    try {
                        val prodUrl = "$serverUrl/api/products"
                        val prodRequest = okhttp3.Request.Builder()
                            .url(prodUrl)
                            .addHeader("Authorization", "Bearer $stationToken")
                            .build()
                        client.newCall(prodRequest).execute().use { response ->
                            if (response.isSuccessful) {
                                val bodyStr = response.body?.string()
                                if (!bodyStr.isNullOrBlank()) {
                                    val jsonArray = org.json.JSONArray(bodyStr)
                                    for (i in 0 until jsonArray.length()) {
                                        val obj = jsonArray.getJSONObject(i)
                                        val id = obj.optString("id")
                                        val name = obj.optString("name")
                                        val englishName = obj.optString("englishName")
                                        val targetUph = obj.optInt("targetUph", 1000)
                                        val colorHex = obj.optString("colorHex", "#00875A")
                                        val isActiveProd = obj.optBoolean("isActive", true)
                                        val manualFile = if (obj.isNull("manualFileName")) null else obj.optString("manualFileName")
                                        val nominalDuration = obj.optInt("nominalBatchDurationSec", 480)
                                        val mixtureRatiosStr = obj.optJSONArray("mixtureRatios")?.toString() ?: "[]"
                                        val productEntity = com.example.data.ProductEntity(
                                            id = id,
                                            name = name,
                                            englishName = englishName,
                                            targetUph = targetUph,
                                            colorHex = colorHex,
                                            isActive = isActiveProd,
                                            manualFileName = if (manualFile == "null" || manualFile.isNullOrEmpty()) null else manualFile,
                                            nominalBatchDurationSec = nominalDuration,
                                            mixtureRatios = mixtureRatiosStr
                                        )
                                        repository.insertProduct(productEntity)
                                    }
                                }
                            }
                        }
                    } catch (e: Exception) {
                        android.util.Log.e("NexusPoll", "Failed to sync products: ${e.message}")
                    }

                    // 2. Fetch and apply active orders — the primary data the screen needs
                    try {
                        val ordUrl = "$serverUrl/api/orders"
                        val request = okhttp3.Request.Builder()
                            .url(ordUrl)
                            .addHeader("Authorization", "Bearer $stationToken")
                            .build()
                        client.newCall(request).execute().use { response ->
                            if (response.isSuccessful) {
                                val bodyStr = response.body?.string()
                                if (!bodyStr.isNullOrBlank()) {
                                    val jsonArray = org.json.JSONArray(bodyStr)
                                    val tempOrders = mutableListOf<OrderInfo>()
                                    var foundActive = false
                                    var firstPendingHindi = "--"
                                    var firstPendingEnglish = "--"
                                    for (i in 0 until jsonArray.length()) {
                                        val obj = jsonArray.getJSONObject(i)
                                        val status = obj.optString("status")
                                        val id = obj.optString("id")
                                        val productKey = obj.optString("productKey")
                                        val nameEng = obj.optString("productNameEnglish")
                                        val nameHin = obj.optString("productNameHindi")
                                        val scheduled = obj.optInt("totalBatchesScheduled")
                                        val completed = obj.optInt("completedBatches")
                                        val color = obj.optString("colorHex", "#00875A")
                                        val timestamp = obj.optLong("timestamp", 0L)

                                        if (status == "ACTIVE" || isTimestampToday(timestamp)) {
                                            tempOrders.add(
                                                OrderInfo(
                                                    id = id,
                                                    productNameHindi = nameHin,
                                                    productNameEnglish = nameEng,
                                                    totalBatchesScheduled = scheduled,
                                                    completedBatches = completed,
                                                    colorHex = color,
                                                    status = status,
                                                    timestamp = timestamp
                                                )
                                            )
                                        }

                                        if (status == "ACTIVE" && !foundActive) {
                                            foundActive = true
                                            viewModelScope.launch(kotlinx.coroutines.Dispatchers.Main) {
                                                val isNewOrder = activeOrderId.value != id
                                                activeOrderId.value = id
                                                activeProductNameEnglish.value = nameEng
                                                activeProductNameHindi.value = nameHin
                                                activeProductColorHex.value = color
                                                activeBatchCountTotal.value = scheduled
                                                activeBatchCountCompleted.value = completed
                                                if (isNewOrder || selectedBatchNumber.value <= completed || selectedBatchNumber.value > scheduled) {
                                                    selectedBatchNumber.value = completed + 1
                                                }

                                                val targetBatchId = "B-${id}-${selectedBatchNumber.value}"
                                                if (batchId.value != targetBatchId) {
                                                     batchId.value = targetBatchId
                                                }
                                            }
                                         }

                                         if (status == "PENDING" && firstPendingHindi == "--") {
                                             firstPendingHindi = nameHin
                                             firstPendingEnglish = nameEng
                                         }
                                     }

                                     viewModelScope.launch(kotlinx.coroutines.Dispatchers.Main) {
                                         _ordersQueue.value = tempOrders
                                         nextPendingOrderNameHindi.value = firstPendingHindi
                                         nextPendingOrderNameEnglish.value = firstPendingEnglish
                                     }

                                     if (!foundActive) {
                                         viewModelScope.launch(kotlinx.coroutines.Dispatchers.Main) {
                                             activeOrderId.value = ""
                                             activeProductNameEnglish.value = ""
                                             activeProductNameHindi.value = ""
                                             activeProductColorHex.value = "#1A1A1A"
                                             activeBatchCountCompleted.value = 0
                                             activeBatchCountTotal.value = 0
                                             batchId.value = "--"
                                         }
                                     }
                                 }
                             }
                         }
                     } catch (e: Exception) {
                         android.util.Log.e("NexusPoll", "Failed loading orders: ${e.message}")
                     }

                     // 3. Validate token check — logs status without unpairing station
                     try {
                         val valUrl = "$serverUrl/api/auth/validate"
                         val valRequest = okhttp3.Request.Builder()
                             .url(valUrl)
                             .addHeader("Authorization", "Bearer $stationToken")
                             .build()
                         client.newCall(valRequest).execute().use { response ->
                             if (response.isSuccessful) {
                                 val bodyStr = response.body?.string()
                                 if (!bodyStr.isNullOrBlank()) {
                                     val json = org.json.JSONObject(bodyStr)
                                     if (!json.optBoolean("valid", true)) {
                                         android.util.Log.w("NexusPoll", "Token validation notice: ${json.optString("reason")}")
                                     }
                                 }
                             }
                         }
                     } catch (e: Exception) {
                         android.util.Log.w("NexusPoll", "Validate check skipped (network): ${e.message}")
                     }
                }
                kotlinx.coroutines.delay(2000)
            }
        }
    }

    fun navigationTo(screen: String) {
        _currentScreen.value = screen
    }

    override fun onCleared() {
        super.onCleared()
        breakJob?.cancel()
        monitorJob?.cancel()
        pollJob?.cancel()
    }

    private fun isTimestampToday(timeMs: Long): Boolean {
        val cal1 = java.util.Calendar.getInstance()
        cal1.timeInMillis = timeMs
        val cal2 = java.util.Calendar.getInstance()
        cal2.timeInMillis = System.currentTimeMillis()
        return cal1.get(java.util.Calendar.YEAR) == cal2.get(java.util.Calendar.YEAR) &&
                cal1.get(java.util.Calendar.DAY_OF_YEAR) == cal2.get(java.util.Calendar.DAY_OF_YEAR)
    }

    private fun syncBreakStatusToServer(isOn: Boolean) {
        viewModelScope.launch(kotlinx.coroutines.Dispatchers.IO) {
            val serverUrl = com.example.data.PreferencesManager.getServerUrl(getApplication())
            val stationToken = com.example.data.PreferencesManager.getStationToken(getApplication())
            if (serverUrl.isNullOrBlank() || stationToken.isNullOrBlank()) return@launch

            try {
                val url = "$serverUrl/api/stations/break"
                val jsonPayload = org.json.JSONObject().apply {
                    put("isOnBreak", isOn)
                }
                val requestBody = jsonPayload.toString()
                    .toRequestBody("application/json".toMediaTypeOrNull())

                val request = okhttp3.Request.Builder()
                    .url(url)
                    .post(requestBody)
                    .addHeader("Authorization", "Bearer $stationToken")
                    .build()

                okhttp3.OkHttpClient().newCall(request).execute().use { response ->
                    if (!response.isSuccessful) {
                        android.util.Log.e("NexusBreak", "Sync break failed code: ${response.code}")
                    }
                }
            } catch (e: Exception) {
                android.util.Log.e("NexusBreak", "Error syncing break status: ${e.message}")
            }
        }
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
