package com.example

import android.app.Application
import android.content.Context
import androidx.room.Room
import androidx.test.core.app.ApplicationProvider
import com.example.data.*
import com.example.ui.IndustrialViewModel
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.firstOrNull
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.test.*
import org.junit.After
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import java.io.IOException

@OptIn(ExperimentalCoroutinesApi::class)
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [36])
class ExampleRobolectricTest {

    private lateinit var db: AppDatabase
    private lateinit var repository: IndustrialRepository
    private lateinit var viewModel: IndustrialViewModel
    private val testDispatcher = UnconfinedTestDispatcher()

    @Before
    fun createDb() {
        Dispatchers.setMain(testDispatcher)
        val context = ApplicationProvider.getApplicationContext<Context>()
        db = Room.inMemoryDatabaseBuilder(context, AppDatabase::class.java)
            .allowMainThreadQueries()
            .build()
        
        repository = IndustrialRepository(
            db.productDao(),
            db.batchLogDao(),
            db.activeShiftDao(),
            db.outboxDao()
        )

        val app = ApplicationProvider.getApplicationContext<Application>()
        viewModel = IndustrialViewModel(app, repository)
    }

    @After
    @Throws(IOException::class)
    fun closeDb() {
        Dispatchers.resetMain()
        db.close()
    }

    @Test
    fun testAppStringsAndInitialDataLoading() = runBlocking {
        val context = ApplicationProvider.getApplicationContext<Context>()
        val appName = context.getString(R.string.app_name)
        assertEquals("Industrial Nexus", appName)

        // Make sure initial data gets loaded
        repository.populateInitialDataIfEmpty()
        
        var productsList: List<ProductEntity> = emptyList()
        for (i in 1..20) {
            Thread.sleep(20)
            productsList = repository.allProducts.first()
            if (productsList.isNotEmpty()) break
        }
        
        assertTrue(productsList.isNotEmpty())
        assertEquals("PRD-001", productsList[0].id)
    }

    @Test
    fun testShiftLoginFlow() = runBlocking {
        // Initially, shift is null or inactive
        val initialShift = viewModel.activeShift.value
        assertNull(initialShift)

        // Set login details
        viewModel.workerIdInput.value = "EMP-045"
        viewModel.pinInput.value = "5544"
        viewModel.isHelmetChecked.value = true
        viewModel.isWorkplaceClean.value = true
        viewModel.isMachineNormal.value = true

        // Complete shift login
        viewModel.completeShiftLogin()

        // Wait up to 1 second for the asynchronous DB write to persist
        var activeShiftInDb: ActiveShiftEntity? = null
        for (i in 1..30) {
            Thread.sleep(20)
            activeShiftInDb = repository.getActiveShift()
            if (activeShiftInDb != null) break
        }

        assertNotNull(activeShiftInDb)
        assertEquals("EMP-045", activeShiftInDb?.workerId)
        assertEquals("5544", activeShiftInDb?.pin)
        assertTrue(activeShiftInDb?.isHelmetChecked == true)
        assertTrue(activeShiftInDb?.isActive == true)

        // Ensure current screen is updated to timer view
        assertEquals("worker_timer", viewModel.currentScreen.value)

        // Test logout resets states
        viewModel.logout()

        var postLogoutShift: ActiveShiftEntity? = ActiveShiftEntity(workerId = "temp", pin = "", loginTime = 0, isHelmetChecked = false, isWorkplaceClean = false, isMachineNormal = false, isActive = false)
        for (i in 1..30) {
            Thread.sleep(20)
            postLogoutShift = repository.getActiveShift()
            if (postLogoutShift == null) break
        }

        assertNull(postLogoutShift)
        assertEquals("", viewModel.workerIdInput.value)
        assertEquals("login", viewModel.currentScreen.value)
    }

    @Test
    fun testBatchCompletion() = runBlocking {
        repository.populateInitialDataIfEmpty()
        
        // Wait for database pre-population logs flow
        var initialLogs: List<BatchLogEntity> = emptyList()
        for (i in 1..30) {
            Thread.sleep(20)
            initialLogs = repository.allBatchLogs.first()
            if (initialLogs.isNotEmpty()) break
        }
        val initialLogsCount = initialLogs.size

        // Set the active product names in the viewmodel
        viewModel.activeProductNameHindi.value = "क्रीम स्पेशल"
        viewModel.activeProductNameEnglish.value = "Cream Special"

        // Complete the active batch
        viewModel.completeActiveBatch()

        // Verify count completed has incremented
        val completedCount = viewModel.activeBatchCountCompleted.value
        assertEquals(1, completedCount)

        // Wait to make sure the success batch log was recorded in the database
        var updatedLogs: List<BatchLogEntity> = emptyList()
        for (i in 1..30) {
            Thread.sleep(20)
            updatedLogs = repository.allBatchLogs.first()
            if (updatedLogs.size == initialLogsCount + 1) break
        }

        assertEquals(initialLogsCount + 1, updatedLogs.size)
        assertEquals("Success", updatedLogs.first().status)
        assertEquals("क्रीम स्पेशल", updatedLogs.first().productNameHindi)
    }

    @Test
    fun testEmergencyDowntimeReport() = runBlocking {
        repository.populateInitialDataIfEmpty()
        
        // Wait for database pre-population logs flow
        var initialLogs: List<BatchLogEntity> = emptyList()
        for (i in 1..30) {
            Thread.sleep(20)
            initialLogs = repository.allBatchLogs.first()
            if (initialLogs.isNotEmpty()) break
        }
        val initialLogsCount = initialLogs.size

        // Select issues
        viewModel.toggleIssue("Mechanical Jam")
        viewModel.toggleIssue("Electrical Grid Trip")
        assertTrue(viewModel.selectedIssues.value.contains("Mechanical Jam"))

        viewModel.submitEmergencyReport()

        // Wait up to 1 second for the log write to complete
        var updatedLogs: List<BatchLogEntity> = emptyList()
        for (i in 1..30) {
            Thread.sleep(20)
            updatedLogs = repository.allBatchLogs.first()
            if (updatedLogs.size == initialLogsCount + 1) break
        }

        // Verify report resets state and records a log with Failed status
        assertTrue(viewModel.selectedIssues.value.isEmpty())
        assertEquals(initialLogsCount + 1, updatedLogs.size)
        assertEquals("Failed", updatedLogs.first().status)
        assertTrue(updatedLogs.first().productNameEnglish.contains("DOWNTIME"))

        // Ensure we navigated back to timer screen
        assertEquals("worker_timer", viewModel.currentScreen.value)
    }

    @Test
    fun testAdminProductCatalogModifications() = runBlocking {
        repository.populateInitialDataIfEmpty()

        // Wait for database pre-population products flow
        var productsList: List<ProductEntity> = emptyList()
        for (i in 1..30) {
            Thread.sleep(20)
            productsList = repository.allProducts.first()
            if (productsList.isNotEmpty()) break
        }
        val targetProduct = productsList.first { it.id == "PRD-001" }

        // Select the product in viewModel
        viewModel.selectProductForEditing(targetProduct)
        assertEquals("PRD-001", viewModel.editedProductId.value)
        assertEquals("Cream Special", viewModel.editedProductName.value)

        // Modify Hindi Name and save
        viewModel.editedProductHindiName.value = "क्रीम स्पेशल (संशोधित)"
        viewModel.saveProductChanges()

        // Wait up to 1 second for the persistence change
        var updatedProduct: ProductEntity? = null
        for (i in 1..30) {
            Thread.sleep(20)
            val updatedProductsList = repository.allProducts.first()
            updatedProduct = updatedProductsList.firstOrNull { it.id == "PRD-001" }
            if (updatedProduct?.name == "क्रीम स्पेशल (संशोधित)") break
        }

        assertNotNull(updatedProduct)
        assertEquals("क्रीम स्पेशल (संशोधित)", updatedProduct?.name)
    }
}
