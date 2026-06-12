package com.example.ui.screens

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.ui.text.TextStyle
import kotlinx.coroutines.delay
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.data.BatchLogEntity
import com.example.data.ProductEntity
import com.example.ui.IndustrialViewModel
import java.text.SimpleDateFormat
import java.util.*

@Composable
fun AdminDashboardScreen(
    viewModel: IndustrialViewModel,
    onExitAdmin: () -> Unit
) {
    val activeSubScreen by viewModel.adminSubScreen.collectAsState()
    val activeShift by viewModel.activeShift.collectAsState()

    Row(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFFFFFFFF))
    ) {
        
        // 1. LEFT SIDEBAR: Administrative Navigation Drawer (22% Width)
        Column(
            modifier = Modifier
                .fillMaxHeight()
                .width(260.dp)
                .background(Color(0xFF1A1A1A)) // Dark Charcoal Sidebar
                .border(width = 2.dp, color = Color(0xFF1A1A1A))
                .padding(20.dp),
            verticalArrangement = Arrangement.SpaceBetween
        ) {
            Column {
                // Header brand title
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                    modifier = Modifier.padding(bottom = 32.dp)
                ) {
                    Box(
                        modifier = Modifier
                            .size(36.dp)
                            .background(Color.White),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            imageVector = Icons.Default.Settings,
                            contentDescription = "Admin System Icon",
                            tint = Color(0xFF1A1A1A),
                            modifier = Modifier.size(20.dp)
                        )
                    }
                    Text(
                        text = "ADMIN PANEL",
                        color = Color.White,
                        fontSize = 18.sp,
                        fontWeight = FontWeight.Black,
                        fontFamily = FontFamily.SansSerif,
                        letterSpacing = 1.sp
                    )
                }

                // Operator Active Shift Summary Card inside Sidebar
                if (activeShift != null) {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .border(1.dp, Color.White.copy(alpha = 0.3f))
                            .background(Color.White.copy(alpha = 0.05f))
                            .padding(12.dp)
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(
                                imageVector = Icons.Default.AccountBox,
                                contentDescription = "Active operator",
                                tint = Color.LightGray,
                                modifier = Modifier.size(16.dp)
                            )
                            Spacer(modifier = Modifier.width(6.dp))
                            Text(
                                text = "OPERATOR ID",
                                color = Color.Gray,
                                fontSize = 10.sp,
                                fontWeight = FontWeight.Bold,
                                fontFamily = FontFamily.Monospace
                            )
                        }
                        Text(
                            text = activeShift!!.workerId,
                            color = Color.White,
                            fontSize = 16.sp,
                            fontWeight = FontWeight.Black,
                            fontFamily = FontFamily.Monospace
                        )
                    }
                } else {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .border(1.dp, Color.White.copy(alpha = 0.1f))
                            .padding(12.dp)
                    ) {
                        Text(
                            text = "NO ACTIVE WORKER SHIFT",
                            color = Color.Gray,
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            fontFamily = FontFamily.Monospace
                        )
                    }
                }

                Spacer(modifier = Modifier.height(32.dp))

                // Navigation Tabs list
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    AdminNavTab(
                        title = "Plant Overview",
                        subtitle = "संयंत्र सिंहावलोकन",
                        icon = Icons.Default.Home,
                        isSelected = activeSubScreen == "overview",
                        onClick = { viewModel.adminSubScreen.value = "overview" }
                    )
                    AdminNavTab(
                        title = "Batch Logs History",
                        subtitle = "बैच इतिहास रजिस्टर",
                        icon = Icons.Default.List,
                        isSelected = activeSubScreen == "batch_history",
                        onClick = { viewModel.adminSubScreen.value = "batch_history" }
                    )
                    AdminNavTab(
                        title = "Product Catalog",
                        subtitle = "उत्पाद विशिष्टता प्रबंधक",
                        icon = Icons.Default.Menu,
                        isSelected = activeSubScreen == "product_catalog",
                        onClick = { viewModel.adminSubScreen.value = "product_catalog" }
                    )
                    AdminNavTab(
                        title = "Factory Efficiency",
                        subtitle = "दक्षता एवं ओईई विश्लेषण",
                        icon = Icons.Default.Star,
                        isSelected = activeSubScreen == "efficiency",
                        onClick = { viewModel.adminSubScreen.value = "efficiency" }
                    )
                }
            }

            // Exit admin / Terminate simulation mode
            Button(
                onClick = onExitAdmin,
                shape = RoundedCornerShape(0),
                colors = ButtonDefaults.buttonColors(
                    containerColor = Color.White,
                    contentColor = Color.Black
                ),
                modifier = Modifier
                    .fillMaxWidth()
                    .height(56.dp)
                    .border(2.dp, Color(0xFF1A1A1A))
            ) {
                Text(
                    text = "EXIT ADMIN MODE",
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Black
                )
            }
        }

        // 2. MAIN ADMIN CONTENT SPLIT VIEW (78% Width)
        Column(
            modifier = Modifier
                .fillMaxSize()
                .background(Color(0xFFF4F5F7))
                .weight(1f)
                .padding(32.dp)
        ) {
            when (activeSubScreen) {
                "overview" -> AdminOverviewDashboard(viewModel)
                "batch_history" -> AdminBatchHistory(viewModel)
                "product_catalog" -> AdminProductCatalog(viewModel)
                "efficiency" -> AdminFactoryEfficiency(viewModel)
            }
        }
    }
}

@Composable
fun AdminNavTab(
    title: String,
    subtitle: String,
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    isSelected: Boolean,
    onClick: () -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .background(if (isSelected) Color.White else Color.Transparent)
            .border(
                1.dp,
                if (isSelected) Color.White else Color.Transparent
            )
            .clickable { onClick() }
            .padding(horizontal = 16.dp, vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Icon(
            imageVector = icon,
            contentDescription = title,
            tint = if (isSelected) Color.Black else Color.Gray,
            modifier = Modifier.size(24.dp)
        )
        Spacer(modifier = Modifier.width(16.dp))
        Column {
            Text(
                text = title,
                fontSize = 13.sp,
                fontWeight = FontWeight.Black,
                color = if (isSelected) Color.Black else Color.White
            )
            Text(
                text = subtitle,
                fontSize = 9.sp,
                fontWeight = FontWeight.SemiBold,
                color = if (isSelected) Color.Gray else Color.White.copy(alpha = 0.4f)
            )
        }
    }
}

// Sub-Screen 1: GENERAL OVERVIEW PLANT PERFORMANCE DASHBOARD
@Composable
fun AdminOverviewDashboard(viewModel: IndustrialViewModel) {
    val batchLogs by viewModel.batchLogs.collectAsState()

    val successfulCount = batchLogs.filter { it.status == "Success" }.size
    val failedCount = batchLogs.filter { it.status == "Failed" }.size
    val totalProducedToday = batchLogs.sumOf { it.unitsProduced }

    Column(verticalArrangement = Arrangement.spacedBy(24.dp)) {
        // Heading Title Line (English Numbers inside stats)
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column {
                Text(
                    text = "Plant Overview Dashboard",
                    fontSize = 28.sp,
                    fontWeight = FontWeight.Black,
                    color = Color.Black
                )
                Text(
                    text = "संयंत्र उत्पादन सारांश एवं परिचालन KPI विवरण",
                    fontSize = 13.sp,
                    color = Color.Gray,
                    fontWeight = FontWeight.Bold
                )
            }

            Box(
                modifier = Modifier
                    .background(Color.White)
                    .border(2.dp, Color(0xFF1A1A1A))
                    .padding(horizontal = 16.dp, vertical = 8.dp)
            ) {
                val sdf = SimpleDateFormat("dd-MMM-yyyy HH:mm:ss", Locale.ENGLISH)
                Text(
                    text = "LAST UPDATE: ${sdf.format(Date())}",
                    fontSize = 12.sp,
                    color = Color.Black,
                    fontWeight = FontWeight.Bold,
                    fontFamily = FontFamily.Monospace
                )
            }
        }

        // Row of 4 KPI Metric Blocks
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            KpiMetricWidget(
                title = "TOTAL BATCHES TODAY",
                value = "${batchLogs.size}",
                subText = "लक्ष्य: 150 (Completed/Total)",
                color = Color(0xFF1A1A1A),
                modifier = Modifier.weight(1f)
            )
            KpiMetricWidget(
                title = "TOTAL PRODUCED",
                value = String.format("%,d units", totalProducedToday),
                subText = "सफलता दर: ${if (batchLogs.isNotEmpty()) (successfulCount * 100 / batchLogs.size) else 0}%",
                color = Color(0xFF00875A), // High emerald status green
                modifier = Modifier.weight(1f)
            )
            KpiMetricWidget(
                title = "ACTIVE ASSEMBLY LINES",
                value = "8 / 10",
                subText = "Line A, Line B, Line C running",
                color = Color(0xFF2B5BB5),
                modifier = Modifier.weight(1f)
            )
            KpiMetricWidget(
                title = "DOWNTIME WARNING ALERTS",
                value = "$failedCount",
                subText = "सक्रिय सुरक्षा दोष दर्ज की गई",
                color = if (failedCount > 0) Color(0xFFD32F2F) else Color(0xFF00875A),
                modifier = Modifier.weight(1f)
            )
        }

        // Bottom section split: Live queue progress vs. Recent incident reports list
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .weight(1f),
            horizontalArrangement = Arrangement.spacedBy(24.dp)
        ) {
            // Left Half: Assembly list live updates
            Column(
                modifier = Modifier
                    .weight(0.55f)
                    .fillMaxHeight()
                    .background(Color.White)
                    .border(3.dp, Color(0xFF1A1A1A))
                    .padding(20.dp)
            ) {
                Text(
                    text = "Live Assembly Line Progress",
                    fontSize = 18.sp,
                    fontWeight = FontWeight.Black,
                    color = Color.Black
                )
                Text(
                    text = "विधानसभा लाइनों की वास्तविक समय स्थिति संकेत",
                    fontSize = 11.sp,
                    color = Color.Gray,
                    fontWeight = FontWeight.Bold
                )

                Spacer(modifier = Modifier.height(20.dp))

                Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
                    AssemblyLineProgressBlock("Line A - Extrusion (Cream Special)", 0.78f, "78% Completed")
                    AssemblyLineProgressBlock("Line B - Wrapping (Cream Special)", 0.42f, "42% Completed")
                    AssemblyLineProgressBlock("Line C - Packaging (Standard Blend)", 0.90f, "90% Completed")
                    AssemblyLineProgressBlock("CNC 04 - Milling Machine (Standard)", 0.15f, "15% Completed")
                }
            }

            // Right Half: Recent Activity Audit Logs
            Column(
                modifier = Modifier
                    .weight(0.45f)
                    .fillMaxHeight()
                    .background(Color.White)
                    .border(3.dp, Color(0xFF1A1A1A))
                    .padding(20.dp)
            ) {
                Text(
                    text = "Recent Incident Auditing",
                    fontSize = 18.sp,
                    fontWeight = FontWeight.Black,
                    color = Color.Black
                )
                Spacer(modifier = Modifier.height(16.dp))

                LazyColumn(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    val recents = batchLogs.take(5)
                    items(recents) { log ->
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .border(1.dp, Color(0xFF1A1A1A).copy(alpha = 0.1f))
                                .padding(12.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Box(
                                    modifier = Modifier
                                        .size(10.dp)
                                        .background(if (log.status == "Success") Color(0xFF00875A) else Color(0xFFD32F2F))
                                )
                                Spacer(modifier = Modifier.width(12.dp))
                                Column {
                                    Text(
                                        text = log.batchId,
                                        fontSize = 13.sp,
                                        fontWeight = FontWeight.Black,
                                        fontFamily = FontFamily.Monospace
                                    )
                                    Text(
                                        text = log.productNameEnglish,
                                        fontSize = 11.sp,
                                        color = Color.Gray,
                                        fontWeight = FontWeight.SemiBold
                                    )
                                }
                            }

                            Text(
                                text = if (log.status == "Success") "SUCCESS" else "FAILED",
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold,
                                color = if (log.status == "Success") Color(0xFF00875A) else Color(0xFFD32F2F)
                            )
                        }
                    }

                    if (recents.isEmpty()) {
                        item {
                            Box(
                                modifier = Modifier.fillMaxWidth().padding(32.dp),
                                contentAlignment = Alignment.Center
                            ) {
                                Text("No logged incident records found.", color = Color.Gray, fontSize = 13.sp)
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun KpiMetricWidget(
    title: String,
    value: String,
    subText: String,
    color: Color,
    modifier: Modifier = Modifier
) {
    Column(
        modifier = modifier
            .background(Color.White)
            .border(3.dp, Color(0xFF1A1A1A))
            .padding(16.dp),
        verticalArrangement = Arrangement.SpaceBetween
    ) {
        Column {
            Text(
                text = title,
                fontSize = 11.sp,
                fontWeight = FontWeight.Black,
                color = Color.Gray,
                letterSpacing = 0.5.sp
            )
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = value,
                fontSize = 24.sp,
                fontWeight = FontWeight.Black,
                color = color,
                fontFamily = FontFamily.Monospace
            )
        }
        Spacer(modifier = Modifier.height(12.dp))
        Text(
            text = subText,
            fontSize = 11.sp,
            color = Color.DarkGray,
            fontWeight = FontWeight.SemiBold
        )
    }
}

@Composable
fun AssemblyLineProgressBlock(
    lineTitle: String,
    progress: Float,
    percentText: String
) {
    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = lineTitle,
                fontSize = 13.sp,
                fontWeight = FontWeight.Black,
                color = Color.Black
            )
            Text(
                text = percentText,
                fontSize = 12.sp,
                fontWeight = FontWeight.Bold,
                fontFamily = FontFamily.Monospace,
                color = Color.Gray
            )
        }

        // Heavy linear indicator
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(16.dp)
                .background(Color(0xFFE2E8F0))
                .border(1.dp, Color(0xFF1A1A1A))
        ) {
            Box(
                modifier = Modifier
                    .fillMaxHeight()
                    .fillMaxWidth(progress)
                    .background(Color(0xFF1A1A1A))
            )
        }
    }
}


// Sub-Screen 2: BATCH HISTORY LOG AUDIT LIST (SQLite CRUD logs operations)
@Composable
fun AdminBatchHistory(viewModel: IndustrialViewModel) {
    val batchLogs by viewModel.batchLogs.collectAsState()
    val searchQuery by viewModel.batchSearchQuery.collectAsState()
    val lineFilterVal by viewModel.lineFilter.collectAsState()

    var showInsertDialog by remember { mutableStateOf(false) }

    val filteredLogs = remember(batchLogs, searchQuery, lineFilterVal) {
        batchLogs.filter { log ->
            val matchQuery = log.batchId.contains(searchQuery, ignoreCase = true) ||
                    log.productNameHindi.contains(searchQuery, ignoreCase = true) ||
                    log.productNameEnglish.contains(searchQuery, ignoreCase = true)
            
            val matchLine = lineFilterVal.isBlank() || log.line.trim().lowercase() == lineFilterVal.trim().lowercase()
            matchQuery && matchLine
        }
    }

    Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column {
                Text(
                    text = "Batch Quality Register",
                    fontSize = 28.sp,
                    fontWeight = FontWeight.Black,
                    color = Color.Black
                )
                Text(
                    text = "पंजीकृत सभी बैच उत्पादन इतिहास, मात्रा और त्रुटि ऑडिट रिपोर्ट की रिकॉर्ड सूची",
                    fontSize = 13.sp,
                    color = Color.Gray,
                    fontWeight = FontWeight.Bold
                )
            }

            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                // Manual Batch Entry button triggers insert to SQLite Room database
                Button(
                    onClick = { showInsertDialog = true },
                    shape = RoundedCornerShape(0),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = Color(0xFF2B5BB5),
                        contentColor = Color.White
                    ),
                    modifier = Modifier
                        .height(50.dp)
                        .border(2.dp, Color(0xFF1A1A1A))
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(imageVector = Icons.Default.Add, contentDescription = "Insert Log")
                        Spacer(modifier = Modifier.width(6.dp))
                        Text("Add Audit Entry", fontWeight = FontWeight.Bold, fontSize = 12.sp)
                    }
                }

                Button(
                    onClick = { viewModel.triggerClearAllBatchLogs() },
                    shape = RoundedCornerShape(0),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = Color.White,
                        contentColor = Color(0xFFD32F2F)
                    ),
                    modifier = Modifier
                        .height(50.dp)
                        .border(2.dp, Color(0xFFD32F2F))
                ) {
                    Text("Clear Register", fontWeight = FontWeight.Bold, fontSize = 12.sp)
                }
            }
        }

        // Search Filters Bar (Brutalist blocks)
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Search textfield
            OutlinedTextField(
                value = searchQuery,
                onValueChange = { viewModel.batchSearchQuery.value = it },
                placeholder = { Text("बैच आईडी या उत्पाद खोजें (e.g. B-4902)...", fontSize = 13.sp) },
                singleLine = true,
                modifier = Modifier
                    .weight(1f)
                    .height(52.dp)
                    .border(2.dp, Color(0xFF1A1A1A)),
                shape = RoundedCornerShape(0),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedTextColor = Color.Black,
                    unfocusedTextColor = Color.Black,
                    focusedContainerColor = Color.White,
                    unfocusedContainerColor = Color.White,
                    focusedBorderColor = Color.Transparent,
                    unfocusedBorderColor = Color.Transparent
                )
            )

            // Line selector tabs
            val lineTabs = listOf("All", "Line A", "Line B", "Line C")
            Row(modifier = Modifier.border(2.dp, Color(0xFF1A1A1A))) {
                lineTabs.forEach { tab ->
                    val isSelected = (tab == "All" && lineFilterVal.isBlank()) || (lineFilterVal.equals(tab, true))
                    Box(
                        modifier = Modifier
                            .background(if (isSelected) Color(0xFF1A1A1A) else Color.White)
                            .clickable {
                                viewModel.lineFilter.value = if (tab == "All") "" else tab
                            }
                            .padding(horizontal = 20.dp, vertical = 14.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = tab,
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold,
                            color = if (isSelected) Color.White else Color.Black
                        )
                    }
                }
            }
        }

        // Header Tabular labels
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .background(Color(0xFF1A1A1A))
                .padding(14.dp),
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Text("BATCH ID", color = Color.White, fontSize = 11.sp, fontWeight = FontWeight.Bold, modifier = Modifier.width(100.dp))
            Text("PRODUCT SPECIFICATION", color = Color.White, fontSize = 11.sp, fontWeight = FontWeight.Bold, modifier = Modifier.weight(1f))
            Text("LINE", color = Color.White, fontSize = 11.sp, fontWeight = FontWeight.Bold, modifier = Modifier.width(120.dp))
            Text("UNITS PRODUCED", color = Color.White, fontSize = 11.sp, fontWeight = FontWeight.Bold, modifier = Modifier.width(140.dp))
            Text("STATUS RESULT", color = Color.White, fontSize = 11.sp, fontWeight = FontWeight.Bold, modifier = Modifier.width(120.dp), textAlign = TextAlign.Center)
        }

        // Real-Time Log Data Lists
        LazyColumn(
            modifier = Modifier
                .fillMaxWidth()
                .weight(1f)
                .background(Color.White)
                .border(2.dp, Color(0xFF1A1A1A)),
            verticalArrangement = Arrangement.spacedBy(0.dp)
        ) {
            items(filteredLogs) { log ->
                val sdf = SimpleDateFormat("dd-MMM HH:mm", Locale.ENGLISH)
                val formattedDate = sdf.format(Date(log.timestamp))

                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .border(1.dp, Color(0xFF1A1A1A).copy(alpha = 0.05f))
                        .padding(horizontal = 14.dp, vertical = 14.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column(modifier = Modifier.width(100.dp)) {
                        Text(
                            text = log.batchId,
                            fontSize = 14.sp,
                            fontWeight = FontWeight.Black,
                            fontFamily = FontFamily.Monospace
                        )
                        Text(
                            text = formattedDate,
                            fontSize = 10.sp,
                            color = Color.Gray,
                            fontWeight = FontWeight.Bold,
                            fontFamily = FontFamily.Monospace
                        )
                    }

                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = log.productNameHindi,
                            fontSize = 13.sp,
                            fontWeight = FontWeight.Black
                        )
                        Text(
                            text = log.productNameEnglish,
                            fontSize = 11.sp,
                            color = Color.Gray,
                            fontWeight = FontWeight.SemiBold
                        )
                    }

                    Text(
                        text = log.line,
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Black,
                        modifier = Modifier.width(120.dp),
                        fontFamily = FontFamily.Monospace
                    )

                    Text(
                        text = String.format("%,d units", log.unitsProduced),
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier.width(140.dp),
                        fontFamily = FontFamily.Monospace
                    )

                    // Audit Status badge
                    Box(
                        modifier = Modifier
                            .width(120.dp)
                            .background(if (log.status == "Success") Color(0xFFE6F4EA) else Color(0xFFFCE8E6))
                            .border(1.dp, if (log.status == "Success") Color(0xFF00875A) else Color(0xFFD32F2F))
                            .padding(vertical = 4.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = log.status.uppercase(),
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            color = if (log.status == "Success") Color(0xFF00875A) else Color(0xFFD32F2F)
                        )
                    }
                }
            }

            if (filteredLogs.isEmpty()) {
                item {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(48.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Text("No matching registered run logs exist.", color = Color.Gray, fontSize = 14.sp)
                    }
                }
            }
        }
    }

    // Modal dialog to insert manually a logging into Room
    if (showInsertDialog) {
        var mBatchId by remember { mutableStateOf("B-4933") }
        var mLine by remember { mutableStateOf("Line A") }
        var mUnits by remember { mutableStateOf("5000") }
        var mIsSuccess by remember { mutableStateOf(true) }

        AlertDialog(
            onDismissRequest = { showInsertDialog = false },
            confirmButton = {
                Button(
                    onClick = {
                        val unitsInt = mUnits.toIntOrNull() ?: 5000
                        viewModel.insertManualBatch(mBatchId, mLine, unitsInt, mIsSuccess)
                        showInsertDialog = false
                    },
                    shape = RoundedCornerShape(0),
                    colors = ButtonDefaults.buttonColors(containerColor = Color.Black)
                ) {
                    Text("Insert Log File")
                }
            },
            dismissButton = {
                TextButton(onClick = { showInsertDialog = false }) {
                    Text("Cancel", color = Color.Black)
                }
            },
            title = { Text("Manual Batch Entry Registration Form", fontWeight = FontWeight.Black) },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    OutlinedTextField(
                        value = mBatchId,
                        onValueChange = { mBatchId = it },
                        label = { Text("Batch ID Code (English)") }
                    )
                    OutlinedTextField(
                        value = mLine,
                        onValueChange = { mLine = it },
                        label = { Text("Assembly Line Location") }
                    )
                    OutlinedTextField(
                        value = mUnits,
                        onValueChange = { mUnits = it },
                        label = { Text("Total Units Produced (English Num)") }
                    )
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Checkbox(checked = mIsSuccess, onCheckedChange = { mIsSuccess = it })
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("Run Status: SUCCESS result badge", fontWeight = FontWeight.Bold)
                    }
                }
            },
            modifier = Modifier.border(3.dp, Color(0xFF1A1A1A)),
            shape = RoundedCornerShape(0),
            containerColor = Color.White
        )
    }
}


// Sub-Screen 3: PRODUCT SPECIFICATIONS & CATALOG WORKFLOW (Database Specifications catalog)
@Composable
fun AdminProductCatalog(viewModel: IndustrialViewModel) {
    val products by viewModel.products.collectAsState()

    // Specification Form states
    val editedId by viewModel.editedProductId.collectAsState()
    val editedName by viewModel.editedProductName.collectAsState()
    val editedHindiName by viewModel.editedProductHindiName.collectAsState()
    val editedTargetUph by viewModel.editedProductTargetUph.collectAsState()
    val editedColorHex by viewModel.editedProductColorToken.collectAsState()
    val editedIsActive by viewModel.editedProductStatusIsActive.collectAsState()
    val editedManualFile by viewModel.editedProductManualFile.collectAsState()

    var showSavedNotification by remember { mutableStateOf(false) }

    Row(
        modifier = Modifier.fillMaxSize(),
        horizontalArrangement = Arrangement.spacedBy(24.dp)
    ) {
        // Left Column: Catalog Selection List (45% Width)
        Column(
            modifier = Modifier
                .weight(0.45f)
                .fillMaxHeight(),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Text(
                        text = "Product Specifications",
                        fontSize = 24.sp,
                        fontWeight = FontWeight.Black,
                        color = Color.Black
                    )
                    Text(
                        text = "उत्पाद विशिष्टता सूची प्रबंधन",
                        fontSize = 12.sp,
                        color = Color.Gray,
                        fontWeight = FontWeight.Bold
                    )
                }

                Button(
                    onClick = { viewModel.createNewProduct() },
                    shape = RoundedCornerShape(0),
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF1A1A1A)),
                    modifier = Modifier.border(1.dp, Color.White)
                ) {
                    Text("+ Add Item", fontSize = 11.sp, fontWeight = FontWeight.Bold)
                }
            }

            LazyColumn(
                modifier = Modifier
                    .fillMaxWidth()
                    .weight(1f)
                    .background(Color.White)
                    .border(3.dp, Color(0xFF1A1A1A)),
                verticalArrangement = Arrangement.spacedBy(0.dp)
            ) {
                items(products) { product ->
                    val isSelected = product.id == editedId
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .background(if (isSelected) Color(0xFFF4F5F7) else Color.White)
                            .border(1.dp, Color(0xFF1A1A1A).copy(alpha = 0.05f))
                            .clickable { viewModel.selectProductForEditing(product) }
                            .padding(16.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            // High Visibility Product color tag indicator
                            Box(
                                modifier = Modifier
                                    .size(24.dp)
                                    .background(Color(android.graphics.Color.parseColor(product.colorHex)))
                                    .border(1.dp, Color(0xFF1A1A1A))
                            )
                            Spacer(modifier = Modifier.width(16.dp))
                            Column {
                                Text(
                                    text = product.name,
                                    fontSize = 16.sp,
                                    fontWeight = FontWeight.Black,
                                    color = Color.Black
                                )
                                Text(
                                    text = "${product.englishName} • ${product.id}",
                                    fontSize = 12.sp,
                                    color = Color.Gray,
                                    fontWeight = FontWeight.SemiBold
                                )
                            }
                        }

                        Column(horizontalAlignment = Alignment.End) {
                            Text(
                                text = "${product.targetUph} UPH",
                                fontSize = 13.sp,
                                fontWeight = FontWeight.Bold,
                                fontFamily = FontFamily.Monospace,
                                color = Color.Black
                            )
                            Text(
                                text = if (product.isActive) "ACTIVE" else "INACTIVE",
                                fontSize = 10.sp,
                                fontWeight = FontWeight.Black,
                                color = if (product.isActive) Color(0xFF00875A) else Color(0xFFD32F2F)
                            )
                        }
                    }
                }
            }
        }

        // Right Column: Spec Sheet Editing Panel (55% Width)
        Column(
            modifier = Modifier
                .weight(0.55f)
                .fillMaxHeight()
                .background(Color.White)
                .border(3.dp, Color(0xFF1A1A1A))
                .padding(24.dp),
            verticalArrangement = Arrangement.SpaceBetween
        ) {
            Column(verticalArrangement = Arrangement.spacedBy(20.dp)) {
                Text(
                    text = "Edit Specifications Card • $editedId",
                    fontSize = 18.sp,
                    fontWeight = FontWeight.Black,
                    color = Color.Black
                )
                Divider(color = Color(0xFF1A1A1A).copy(alpha = 0.1f), thickness = 1.dp)

                // Input field: Hindi Name
                Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    Text("HINDI LABEL NAME / हिंदी नाम", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = Color.Gray)
                    OutlinedTextField(
                        value = editedHindiName,
                        onValueChange = { viewModel.editedProductHindiName.value = it },
                        modifier = Modifier.fillMaxWidth().height(52.dp).border(1.dp, Color(0xFF1A1A1A)),
                        shape = RoundedCornerShape(0),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedTextColor = Color.Black,
                            unfocusedTextColor = Color.Black,
                            focusedContainerColor = Color.White,
                            unfocusedContainerColor = Color.White,
                            focusedBorderColor = Color.Transparent,
                            unfocusedBorderColor = Color.Transparent
                        )
                    )
                }

                // Input field: English Name
                Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    Text("ENGLISH SPECIFICATION NAME", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = Color.Gray)
                    OutlinedTextField(
                        value = editedName,
                        onValueChange = { viewModel.editedProductName.value = it },
                        modifier = Modifier.fillMaxWidth().height(52.dp).border(1.dp, Color(0xFF1A1A1A)),
                        shape = RoundedCornerShape(0),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedTextColor = Color.Black,
                            unfocusedTextColor = Color.Black,
                            focusedContainerColor = Color.White,
                            unfocusedContainerColor = Color.White,
                            focusedBorderColor = Color.Transparent,
                            unfocusedBorderColor = Color.Transparent
                        )
                    )
                }

                // Input: Target Units Per Hour (UPH)
                Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    Text("TARGET UNITS PER HOUR (UPH) - English numbers", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = Color.Gray)
                    OutlinedTextField(
                        value = editedTargetUph,
                        onValueChange = { viewModel.editedProductTargetUph.value = it },
                        modifier = Modifier.fillMaxWidth().height(52.dp).border(1.dp, Color(0xFF1A1A1A)),
                        shape = RoundedCornerShape(0),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedTextColor = Color.Black,
                            unfocusedTextColor = Color.Black,
                            focusedContainerColor = Color.White,
                            unfocusedContainerColor = Color.White,
                            focusedBorderColor = Color.Transparent,
                            unfocusedBorderColor = Color.Transparent
                        ),
                        textStyle = androidx.compose.ui.text.TextStyle(fontFamily = FontFamily.Monospace, fontWeight = FontWeight.Bold)
                    )
                }

                // Input: Color hex picker (or custom slider colors mapping)
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(16.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                        Text("COLOR SPECS HEX", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = Color.Gray)
                        OutlinedTextField(
                            value = editedColorHex,
                            onValueChange = { viewModel.editedProductColorToken.value = it },
                            modifier = Modifier.fillMaxWidth().height(52.dp).border(1.dp, Color(0xFF1A1A1A)),
                            shape = RoundedCornerShape(0),
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedTextColor = Color.Black,
                                unfocusedTextColor = Color.Black,
                                focusedContainerColor = Color.White,
                                unfocusedContainerColor = Color.White,
                                focusedBorderColor = Color.Transparent,
                                unfocusedBorderColor = Color.Transparent
                            ),
                            textStyle = androidx.compose.ui.text.TextStyle(fontFamily = FontFamily.Monospace, fontWeight = FontWeight.Bold)
                        )
                    }

                    Box(
                        modifier = Modifier
                            .align(Alignment.Bottom)
                            .size(52.dp)
                            .background(
                                color = try {
                                    Color(android.graphics.Color.parseColor(editedColorHex))
                                } catch (e: Exception) {
                                    Color.White
                                }
                            )
                            .border(2.dp, Color(0xFF1A1A1A))
                    )
                }

                // Column: Safety manual file name
                Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    Text("INSTRUCTION MANUAL PDF LINK", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = Color.Gray)
                    OutlinedTextField(
                        value = editedManualFile,
                        onValueChange = { viewModel.editedProductManualFile.value = it },
                        modifier = Modifier.fillMaxWidth().height(52.dp).border(1.dp, Color(0xFF1A1A1A)),
                        shape = RoundedCornerShape(0),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedTextColor = Color.Black,
                            unfocusedTextColor = Color.Black,
                            focusedContainerColor = Color.White,
                            unfocusedContainerColor = Color.White,
                            focusedBorderColor = Color.Transparent,
                            unfocusedBorderColor = Color.Transparent
                        ),
                        textStyle = androidx.compose.ui.text.TextStyle(fontFamily = FontFamily.Monospace, fontWeight = FontWeight.Bold)
                    )
                }

                // Switch Row: Status Active
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable { viewModel.editedProductStatusIsActive.value = !editedIsActive }
                        .padding(vertical = 4.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Checkbox(
                        checked = editedIsActive,
                        onCheckedChange = { viewModel.editedProductStatusIsActive.value = it }
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = "Item Active for Production Floor Queues",
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color.Black
                    )
                }
            }

            // Save actions bar
            Column {
                if (showSavedNotification) {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .background(Color(0xFFE6F4EA))
                            .border(1.dp, Color(0xFF00875A))
                            .padding(12.dp)
                    ) {
                        Text(
                            text = "Item configurations saved securely to local DB!",
                            color = Color(0xFF00875A),
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold
                        )
                    }
                    Spacer(modifier = Modifier.height(12.dp))
                }

                Button(
                    onClick = {
                        viewModel.saveProductChanges()
                        showSavedNotification = true
                    },
                    shape = RoundedCornerShape(0),
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF00875A)),
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(60.dp)
                        .border(2.dp, Color(0xFF1A1A1A))
                ) {
                    Text(
                        "SAVE CONFIGURATIONS TO DB",
                        fontWeight = FontWeight.Black,
                        fontSize = 14.sp
                    )
                }
            }
        }
    }

    LaunchedEffect(showSavedNotification) {
        if (showSavedNotification) {
            delay(2000)
            showSavedNotification = false
        }
    }
}


// Sub-Screen 4: FACTORY EFFICIENCY COMPREHENSIVE ANALYTICS (Drawings canvas charts OEE, histograms)
@Composable
fun AdminFactoryEfficiency(viewModel: IndustrialViewModel) {
    Column(verticalArrangement = Arrangement.spacedBy(24.dp)) {
        Column {
            Text(
                text = "Plant OEE & Incident Hotmap Analytics",
                fontSize = 28.sp,
                fontWeight = FontWeight.Black,
                color = Color.Black
            )
            Text(
                text = "समय के साथ ओईई (समग्र उपकरण प्रभावशीलता) और विधानसभा लाइन विफलताओं का विश्लेषण",
                fontSize = 13.sp,
                color = Color.Gray,
                fontWeight = FontWeight.Bold
            )
        }

        Row(
            modifier = Modifier
                .fillMaxWidth()
                .weight(1f),
            horizontalArrangement = Arrangement.spacedBy(24.dp)
        ) {
            
            // Left block: Custom Canvas Line Trend chart (78% OEE index)
            Column(
                modifier = Modifier
                    .weight(0.5f)
                    .fillMaxHeight()
                    .background(Color.White)
                    .border(3.dp, Color(0xFF1A1A1A))
                    .padding(24.dp)
            ) {
                Text(
                    text = "Weekly OEE performance Trend Index",
                    fontSize = 16.sp,
                    fontWeight = FontWeight.Black,
                    color = Color.Black
                )
                Text(
                    text = "साप्ताहिक दक्षता रुझान सूचकांक (Target 85%)",
                    fontSize = 11.sp,
                    color = Color.Gray,
                    fontWeight = FontWeight.Bold
                )

                Spacer(modifier = Modifier.height(30.dp))

                // Beautiful Jetpack Compose Custom Canvas Line Graph (OEE indices: 74%, 78%, 81%, 76%, 83%, 79%, 85%)
                Box(
                    modifier = Modifier
                        .weight(1f)
                        .fillMaxWidth()
                        .padding(8.dp)
                ) {
                    Canvas(modifier = Modifier.fillMaxSize()) {
                        val w = size.width
                        val h = size.height
                        val padding = 30.dp.toPx()

                        // Grid bounds
                        val gW = w - padding * 2
                        val gH = h - padding * 2

                        // Draw Grid lines
                        for (i in 0..4) {
                            val yOffset = padding + (gH * i / 4)
                            drawLine(
                                color = Color.LightGray.copy(alpha = 0.5f),
                                start = Offset(padding, yOffset),
                                end = Offset(w - padding, yOffset),
                                strokeWidth = 1.dp.toPx()
                            )
                        }

                        // Coordinates setup (7 values representing Days 1 to 7)
                        val oeeValues = listOf(0.74f, 0.78f, 0.81f, 0.75f, 0.83f, 0.79f, 0.85f)
                        val stepX = gW / (oeeValues.size - 1)

                        // Path calculation for plotting indices
                        val connectionPath = Path()
                        val dotCoordinates = mutableListOf<Offset>()

                        for (idx in oeeValues.indices) {
                            val x = padding + idx * stepX
                            // Invert index inside canvas drawing (bottom is max Y)
                            val y = padding + gH * (1f - oeeValues[idx])
                            dotCoordinates.add(Offset(x, y))

                            if (idx == 0) {
                                connectionPath.moveTo(x, y)
                            } else {
                                connectionPath.lineTo(x, y)
                            }
                        }

                        // Draw line connector
                        drawPath(
                            path = connectionPath,
                            color = Color(0xFF1A1A1A),
                            style = Stroke(width = 3.dp.toPx(), cap = StrokeCap.Round)
                        )

                        // Draw point circles
                        for (dot in dotCoordinates) {
                            drawCircle(
                                color = Color.White,
                                radius = 7.dp.toPx(),
                                center = dot
                            )
                            drawCircle(
                                color = Color(0xFF2B5BB5), // Cobalt points
                                radius = 4.dp.toPx(),
                                center = dot
                            )
                        }
                    }
                }

                // X-axis static indicators (Using English standard numbers)
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 24.dp),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    listOf("Day 1", "Day 2", "Day 3", "Day 4", "Day 5", "Day 6", "Day 7").forEach { day ->
                        Text(day, fontSize = 11.sp, fontWeight = FontWeight.Bold, color = Color.Gray, fontFamily = FontFamily.Monospace)
                    }
                }
            }

            // Right block: Incident heat map matrix
            Column(
                modifier = Modifier
                    .weight(0.5f)
                    .fillMaxHeight()
                    .background(Color.White)
                    .border(3.dp, Color(0xFF1A1A1A))
                    .padding(24.dp)
            ) {
                Text(
                    text = "Downtime Incident Location Heatmap",
                    fontSize = 16.sp,
                    fontWeight = FontWeight.Black,
                    color = Color.Black
                )
                Text(
                    text = "घटना स्थानीयकरण का घनत्व मैट्रिक्स (Line Location vs. Shift Interval)",
                    fontSize = 11.sp,
                    color = Color.Gray,
                    fontWeight = FontWeight.Bold
                )

                Spacer(modifier = Modifier.height(24.dp))

                // Structured Layout Table Grid representing line rows vs shift column boxes
                val lines = listOf("Line A", "Line B", "Line C", "CNC 04")
                val shifts = listOf("Shift 1", "Shift 2", "Shift 3")

                // High visual representation of incident densities represented by colored bricks
                // Map of line indices to shift alarms count
                val densitiesMap = mapOf(
                    0 to listOf(0, 0, 1), // Line A (low incidents)
                    1 to listOf(3, 0, 0), // Line B (high Shift 1 failures)
                    2 to listOf(1, 2, 0), // Line C
                    3 to listOf(0, 0, 0)  // CNC 04 (Clear)
                )

                Column(
                    modifier = Modifier.weight(1f),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    // Header row
                    Row(modifier = Modifier.fillMaxWidth()) {
                        Box(modifier = Modifier.width(90.dp)) // Corner blank space
                        shifts.forEach { shift ->
                            Text(
                                text = shift,
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Black,
                                modifier = Modifier.weight(1f),
                                textAlign = TextAlign.Center,
                                color = Color.Gray
                            )
                        }
                    }

                    // Content rows
                    lines.forEachIndexed { rowIdx, lineTitle ->
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                text = lineTitle,
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Black,
                                modifier = Modifier.width(90.dp),
                                color = Color.Black
                            )

                            densitiesMap[rowIdx]?.forEach { count ->
                                val brickColor = when (count) {
                                    0 -> Color(0xFFE2E8F0) // Blank slate
                                    1 -> Color(0xFFFCE8E6) // Light warning
                                    2 -> Color(0xFFF19E92) // Medium alert
                                    else -> Color(0xFFD32F2F) // Max safety red alert (High occurrence)
                                }

                                Box(
                                    modifier = Modifier
                                        .weight(1f)
                                        .height(48.dp)
                                        .padding(horizontal = 4.dp)
                                        .background(brickColor)
                                        .border(1.dp, Color(0xFF1A1A1A)),
                                    contentAlignment = Alignment.Center
                                ) {
                                    // English numbers inside cells
                                    if (count > 0) {
                                        Text(
                                            text = "$count alerts",
                                            color = if (count > 2) Color.White else Color(0xFFD32F2F),
                                            fontSize = 11.sp,
                                            fontWeight = FontWeight.Bold,
                                            fontFamily = FontFamily.Monospace
                                        )
                                    }
                                }
                            }
                        }
                    }
                }

                // Legend indicator
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(16.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text("Alert Intensity scale:", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = Color.Gray)
                    Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        DensityLegendLabel("0", Color(0xFFE2E8F0))
                        DensityLegendLabel("1-2", Color(0xFFF19E92))
                        DensityLegendLabel("3+", Color(0xFFD32F2F))
                    }
                }
            }
        }
    }
}

@Composable
fun DensityLegendLabel(text: String, color: Color) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        Box(
            modifier = Modifier
                .size(12.dp)
                .background(color)
                .border(0.5.dp, Color.Black)
        )
        Spacer(modifier = Modifier.width(4.dp))
        Text(text, fontSize = 11.sp, fontWeight = FontWeight.Black, fontFamily = FontFamily.Monospace)
    }
}
