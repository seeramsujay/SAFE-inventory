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
    }

    // 1. Database Streams
    val activeShift: StateFlow<ActiveShiftEntity?> = repository.activeShiftFlow
        .stateIn(viewModelScope, SharingStarted.Eagerly, null)

    val products: StateFlow<List<ProductEntity>> = repository.allProducts
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val batchLogs: StateFlow<List<BatchLogEntity>> = repository.allBatchLogs
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
            // Success log insertion to Room
            val currentProductHindi = "क्रीम स्पेशल"
            val currentProductEnglish = "Cream Special"
            
            val logsCount = batchLogs.value.size
            val nextBatchNum = 4903 + logsCount
            val nextBatchId = "B-$nextBatchNum"

            // Increment count
            val completed = activeBatchCountCompleted.value + 1
            activeBatchCountCompleted.value = completed
            batchId.value = nextBatchId

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

            // Reset Swipe Countdown Timer
            _timerRemainingSec.value = 420 // reset to 7:00
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
        viewModelScope.launch(kotlinx.coroutines.Dispatchers.IO) {
            try {
                val json = """
                    {
                      "batchId": "${entity.batchId}",
                      "productNameHindi": "${entity.productNameHindi}",
                      "productNameEnglish": "${entity.productNameEnglish}",
                      "line": "${entity.line}",
                      "unitsProduced": ${entity.unitsProduced},
                      "status": "${entity.status}",
                      "timestamp": ${entity.timestamp},
                      "targetUnits": ${entity.targetUnits}
                    }
                """.trimIndent()

                val client = okhttp3.OkHttpClient()
                val body = json.toRequestBody("application/json; charset=utf-8".toMediaTypeOrNull())
                
                val urls = listOf(
                    "https://safe-inventory.vercel.app/api/logs",
                    "http://10.63.97.203:3000/api/logs",
                    "http://10.0.2.2:3000/api/logs"
                )

                for (url in urls) {
                    try {
                        val request = okhttp3.Request.Builder()
                            .url(url)
                            .post(body)
                            .build()
                        client.newCall(request).execute().use { response ->
                            if (response.isSuccessful) {
                                android.util.Log.d("NexusSync", "Synced successfully to $url")
                                return@launch
                            }
                        }
                    } catch (e: Exception) {
                        android.util.Log.e("NexusSync", "Failed syncing to $url: ${e.message}")
                    }
                }
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }

    fun navigationTo(screen: String) {
        _currentScreen.value = screen
    }

    override fun onCleared() {
        super.onCleared()
        timerJob?.cancel()
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
