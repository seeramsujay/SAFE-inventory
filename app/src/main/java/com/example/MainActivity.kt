package com.example

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.ViewModelProvider
import com.example.data.AppDatabase
import com.example.data.IndustrialRepository
import com.example.ui.IndustrialViewModel
import com.example.ui.IndustrialViewModelFactory
import com.example.ui.screens.*
import com.example.ui.theme.MyApplicationTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        // Kiosk Auto-Recovery Uncaught Exception Handler
        Thread.setDefaultUncaughtExceptionHandler { thread, throwable ->
            android.util.Log.e("NexusCrash", "CRITICAL UNCAUGHT EXCEPTION in ${thread.name}", throwable)
            val intent = packageManager.getLaunchIntentForPackage(packageName)?.apply {
                addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK or android.content.Intent.FLAG_ACTIVITY_CLEAR_TASK)
            }
            startActivity(intent)
            android.os.Process.killProcess(android.os.Process.myPid())
            java.lang.System.exit(10)
        }

        enableEdgeToEdge()

        // Initialize SQLite persistence repository
        val database = AppDatabase.getDatabase(applicationContext)
        val repository = IndustrialRepository(
            database.productDao(),
            database.batchLogDao(),
            database.activeShiftDao(),
            database.outboxDao()
        )

        // Construct standard ViewModel
        val factory = IndustrialViewModelFactory(application, repository)
        val viewModel = ViewModelProvider(this, factory)[IndustrialViewModel::class.java]

        setContent {
            MyApplicationTheme {
                val currentScreen by viewModel.currentScreen.collectAsState()

                Scaffold(
                    modifier = Modifier.fillMaxSize(),
                    bottomBar = {
                        // Standardized global Footer status indicator block
                        FooterStatusIndicator(viewModel)
                    }
                ) { innerPadding ->
                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(innerPadding)
                    ) {
                        when (currentScreen) {
                            "login" -> {
                                LoginScreen(
                                    viewModel = viewModel
                                )
                            }
                            "worker_timer" -> {
                                WorkerTimerScreen(
                                    viewModel = viewModel,
                                    onNavigateToExtruder = { viewModel.navigationTo("worker_extruder") },
                                    onNavigateToEmergency = { viewModel.navigationTo("emergency") }
                                )
                            }
                            "worker_extruder" -> {
                                WorkerExtruderScreen(
                                    viewModel = viewModel,
                                    onNavigateToTimer = { viewModel.navigationTo("worker_timer") },
                                    onNavigateToEmergency = { viewModel.navigationTo("emergency") }
                                )
                            }
                            "emergency" -> {
                                EmergencyScreen(
                                    viewModel = viewModel,
                                    onNavigateBack = { viewModel.navigationTo("worker_timer") }
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun FooterStatusIndicator(viewModel: IndustrialViewModel) {
    val pendingLogs by viewModel.pendingLogs.collectAsState()
    val pendingCount = pendingLogs.size

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .height(40.dp)
            .background(Color.White)
            .border(width = 1.dp, color = Color(0xFF1A1A1A).copy(alpha = 0.2f))
            .padding(horizontal = 24.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            Box(
                modifier = Modifier
                    .size(8.dp)
                    .background(if (pendingCount > 0) Color(0xFFD32F2F) else Color(0xFF00875A)) // Red if unsynced, Emerald if synced
            )
            Text(
                text = if (pendingCount > 0) "असिंक किए गए बैच: $pendingCount (UNSYNCED: $pendingCount)" else "सिस्टम ऑनलाइन (ONLINE / SYNCED)",
                fontSize = 11.sp,
                fontWeight = FontWeight.Bold,
                color = Color(0xFF1A1A1A)
            )
        }

        val stationName by viewModel.stationId.collectAsState()
        Text(
            text = "STATION: ${if (stationName.isBlank()) "UNPAIRED" else stationName} | IP: 192.168.1.14",
            fontSize = 11.sp,
            fontWeight = FontWeight.Bold,
            fontFamily = FontFamily.Monospace,
            color = Color(0xFF1A1A1A).copy(alpha = 0.6f)
        )
    }
}
