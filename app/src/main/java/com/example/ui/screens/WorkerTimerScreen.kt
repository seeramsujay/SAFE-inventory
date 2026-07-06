package com.example.ui.screens

import androidx.compose.animation.*
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Build
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.ui.IndustrialViewModel
import com.example.ui.OrderInfo
import com.example.ui.components.SwipeToConfirmSlider
import kotlinx.coroutines.delay

fun getIngredientDisplayName(id: String): String {
    return when (id) {
        "wheat_flour" -> "Wheat Flour (गेंहू का आटा)"
        "refined_sugar" -> "Refined Sugar (चीनी)"
        "vegetable_fats" -> "Vegetable Fats (वनस्पति वसा)"
        "flavor_agents" -> "Flavor Agents (स्वाद एजेंट)"
        "premium_additive" -> "Premium Additive (प्रीमियम एडिटिव)"
        else -> id.replace("_", " ").split(" ").joinToString(" ") { it.replaceFirstChar { char -> char.uppercase() } }
    }
}

@OptIn(ExperimentalAnimationApi::class)
@Composable
fun WorkerTimerScreen(
    viewModel: IndustrialViewModel,
    onNavigateToExtruder: () -> Unit,
    onNavigateToEmergency: () -> Unit
) {
    val batchId by viewModel.batchId.collectAsState()
    val completedBatches by viewModel.activeBatchCountCompleted.collectAsState()
    val totalBatches by viewModel.activeBatchCountTotal.collectAsState()
    val remainingSec by viewModel.timerRemainingSec.collectAsState()
    val activeProductNameHindi by viewModel.activeProductNameHindi.collectAsState()
    val activeProductNameEnglish by viewModel.activeProductNameEnglish.collectAsState()
    val activeProductColorHex by viewModel.activeProductColorHex.collectAsState()
    
    val ordersQueue by viewModel.ordersQueue.collectAsState()
    val isOnBreak by viewModel.isOnBreak.collectAsState()
    val breakDurationSec by viewModel.breakDurationSec.collectAsState()
    val products by viewModel.products.collectAsState()

    val hasActiveOrder = activeProductNameEnglish.isNotBlank()

    val activeProduct = remember(products, activeProductNameEnglish) {
        products.find { it.englishName.equals(activeProductNameEnglish, ignoreCase = true) }
    }

    val cardColor = remember(activeProductColorHex) {
        try {
            Color(android.graphics.Color.parseColor(activeProductColorHex))
        } catch (e: Exception) {
            Color(0xFF00875A)
        }
    }

    val totalBatchWeight = remember(activeProduct) {
        var sum = 0.0
        if (activeProduct != null && !activeProduct.mixtureRatios.isNullOrBlank()) {
            try {
                val jsonArray = org.json.JSONArray(activeProduct.mixtureRatios)
                for (i in 0 until jsonArray.length()) {
                    val obj = jsonArray.getJSONObject(i)
                    sum += obj.optDouble("percentage", 0.0)
                }
            } catch (e: Exception) {}
        }
        if (sum == 0.0) 600.0 else sum
    }

    val nominalDuration = remember(activeProduct) {
        activeProduct?.nominalBatchDurationSec ?: 480
    }

    val uphKgSec = remember(totalBatchWeight, nominalDuration) {
        totalBatchWeight / nominalDuration
    }

    val uphKgHr = remember(totalBatchWeight, nominalDuration) {
        (totalBatchWeight * 3600.0) / nominalDuration
    }

    val ingredientsList = remember(activeProduct, activeProductNameEnglish) {
        val list = mutableListOf<String>()
        if (activeProduct != null && !activeProduct.mixtureRatios.isNullOrBlank()) {
            try {
                val jsonArray = org.json.JSONArray(activeProduct.mixtureRatios)
                for (i in 0 until jsonArray.length()) {
                    val obj = jsonArray.getJSONObject(i)
                    val ingId = obj.optString("ingredientId")
                    val qty = obj.optDouble("percentage", 0.0)
                    if (qty > 0) {
                        list.add("${getIngredientDisplayName(ingId)}: ${qty.toInt()} kg")
                    }
                }
            } catch (e: Exception) {}
        }
        if (list.isEmpty()) {
            list.addAll(getIngredientsForProduct(activeProductNameEnglish))
        }
        list
    }

    var showSuccessFlash by remember { mutableStateOf(false) }

    val formattedTime = remember(remainingSec) {
        val minutes = remainingSec / 60
        val seconds = remainingSec % 60
        String.format("%02d:%02d", minutes, seconds)
    }

    Box(modifier = Modifier.fillMaxSize()) {
        Row(modifier = Modifier.fillMaxSize()) {
            
            // LEFT PANEL: Progress Queue (35% Width)
            Column(
                modifier = Modifier
                    .fillMaxHeight()
                    .weight(0.35f)
                    .background(Color.White)
                    .border(2.dp, Color(0xFF1A1A1A))
                    .padding(20.dp),
                verticalArrangement = Arrangement.SpaceBetween
            ) {
                Column(
                    modifier = Modifier.weight(1f),
                    verticalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    // Screen indicator / Mode toggle helper
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = "BATCH TERMINAL",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            fontFamily = FontFamily.Monospace,
                            color = Color(0xFF1A1A1A).copy(alpha = 0.6f)
                        )
                        Text(
                            text = batchId,
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Black,
                            fontFamily = FontFamily.Monospace,
                            color = Color(0xFF1A1A1A)
                        )
                    }

                    // Active Industrial Card: shows the currently dispatched product
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .background(cardColor)
                            .border(3.dp, Color(0xFF1A1A1A))
                            .padding(16.dp)
                    ) {
                        if (!hasActiveOrder) {
                            Text(
                                text = "आदेश की प्रतीक्षा",
                                color = Color.White.copy(alpha = 0.7f),
                                fontSize = 24.sp,
                                fontWeight = FontWeight.Black,
                                fontFamily = FontFamily.SansSerif
                            )
                            Text(
                                text = "AWAITING ORDER FROM CONSOLE",
                                color = Color.White.copy(alpha = 0.5f),
                                fontSize = 10.sp,
                                fontWeight = FontWeight.Bold,
                                fontFamily = FontFamily.Monospace,
                                modifier = Modifier.padding(top = 4.dp)
                            )
                        } else {
                            Text(
                                text = activeProductNameHindi,
                                color = Color.White,
                                fontSize = 28.sp,
                                fontWeight = FontWeight.Black,
                                fontFamily = FontFamily.SansSerif
                            )
                            Text(
                                text = "ACTIVE: ${activeProductNameEnglish.uppercase()}",
                                color = Color.White.copy(alpha = 0.8f),
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold,
                                fontFamily = FontFamily.Monospace,
                                modifier = Modifier.padding(top = 2.dp)
                            )

                            Spacer(modifier = Modifier.height(12.dp))
                            Text(
                                text = "सामग्री अनुपात (INGREDIENTS):",
                                color = Color.White.copy(alpha = 0.9f),
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold,
                                fontFamily = FontFamily.SansSerif
                            )
                            Spacer(modifier = Modifier.height(4.dp))
                            ingredientsList.forEach { ing ->
                                Text(
                                    text = "\u2022 $ing",
                                    color = Color.White.copy(alpha = 0.85f),
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.Bold,
                                    fontFamily = FontFamily.Monospace,
                                    modifier = Modifier.padding(vertical = 1.dp)
                                )
                            }
                            
                            Spacer(modifier = Modifier.height(8.dp))
                            Divider(color = Color.White.copy(alpha = 0.3f), thickness = 1.dp)
                            Spacer(modifier = Modifier.height(6.dp))
                            
                            Text(
                                text = "TOTAL WEIGHT: ${totalBatchWeight.toInt()} kg",
                                color = Color.White,
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Black,
                                fontFamily = FontFamily.Monospace
                            )
                            Text(
                                text = String.format("BATCH TIME: %.1f minutes", nominalDuration / 60.0),
                                color = Color.White.copy(alpha = 0.9f),
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold,
                                fontFamily = FontFamily.Monospace
                            )
                        }

                        Spacer(modifier = Modifier.height(16.dp))

                        // High contrast status bubble (Plain Black / English Numbers)
                        Box(
                            modifier = Modifier
                                .background(Color(0xFF1A1A1A))
                                .border(1.dp, Color.White)
                                .padding(horizontal = 12.dp, vertical = 6.dp)
                        ) {
                            Text(
                                text = if (hasActiveOrder) "BATCH: $completedBatches / $totalBatches" else "BATCH: -- / --",
                                color = Color.White,
                                fontSize = 14.sp,
                                fontWeight = FontWeight.Black,
                                fontFamily = FontFamily.Monospace
                            )
                        }
                    }

                    // Full day prebatching queue list
                    Text(
                        text = "PRODUCTION QUEUE (उत्पादन कतार):",
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Bold,
                        fontFamily = FontFamily.Monospace,
                        color = Color(0xFF1A1A1A).copy(alpha = 0.6f)
                    )

                    LazyColumn(
                        modifier = Modifier
                            .fillMaxWidth()
                            .weight(1f)
                            .border(1.dp, Color(0xFFD8DADC))
                            .background(Color(0xFFF8F9FA))
                            .padding(6.dp),
                        verticalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        items(ordersQueue) { ord ->
                            val borderCol = try {
                                Color(android.graphics.Color.parseColor(ord.colorHex))
                            } catch (e: Exception) {
                                Color(0xFF1A1A1A)
                            }
                            Column(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .background(Color.White)
                                    .border(2.dp, if (ord.status == "ACTIVE") borderCol else borderCol.copy(alpha = 0.4f))
                                    .padding(8.dp)
                            ) {
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Text(
                                        text = ord.productNameHindi,
                                        fontSize = 13.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = Color.Black
                                    )
                                    Box(
                                        modifier = Modifier
                                            .background(
                                                when (ord.status) {
                                                    "ACTIVE" -> Color(0xFF00875A)
                                                    "PENDING" -> Color(0xFFE65100)
                                                    else -> Color(0xFF7A869A)
                                                }
                                            )
                                            .padding(horizontal = 4.dp, vertical = 1.dp)
                                    ) {
                                        Text(
                                            text = ord.status,
                                            color = Color.White,
                                            fontSize = 8.sp,
                                            fontWeight = FontWeight.Black,
                                            fontFamily = FontFamily.Monospace
                                        )
                                    }
                                }
                                Text(
                                    text = ord.productNameEnglish.uppercase(),
                                    fontSize = 9.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = Color.Gray,
                                    fontFamily = FontFamily.Monospace
                                )
                                Spacer(modifier = Modifier.height(2.dp))
                                Text(
                                    text = "Batches: ${ord.completedBatches} / ${ord.totalBatchesScheduled}",
                                    fontSize = 10.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = Color.Black,
                                    fontFamily = FontFamily.Monospace
                                )
                            }
                        }
                    }

                    // View Extruder details button
                    Button(
                        onClick = onNavigateToExtruder,
                        shape = RoundedCornerShape(0),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = Color.White,
                            contentColor = Color.Black
                        ),
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(44.dp)
                            .border(2.dp, Color(0xFF1A1A1A))
                    ) {
                        Text(
                            text = "मशीन स्थिति / VIEW DIAGRAM →",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Black
                        )
                    }
                }

                Spacer(modifier = Modifier.height(12.dp))

                // Context Menu Actions / Break controls
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Button(
                            onClick = {
                                if (isOnBreak) {
                                    viewModel.endBreak()
                                } else {
                                    viewModel.startBreak()
                                }
                            },
                            shape = RoundedCornerShape(0),
                            colors = ButtonDefaults.buttonColors(
                                containerColor = if (isOnBreak) Color(0xFF4CAF50) else Color(0xFFFF9800),
                                contentColor = Color.White
                            ),
                            modifier = Modifier
                                .weight(1f)
                                .height(44.dp)
                                .border(2.dp, Color(0xFF1A1A1A))
                        ) {
                            Text(
                                text = if (isOnBreak) "RESUME SHIFT" else "LUNCH / BREAK",
                                fontSize = 10.sp,
                                fontWeight = FontWeight.Bold
                            )
                        }

                        Button(
                            onClick = { viewModel.endShift() },
                            shape = RoundedCornerShape(0),
                            colors = ButtonDefaults.buttonColors(
                                containerColor = Color(0xFF37474F),
                                contentColor = Color.White
                            ),
                            modifier = Modifier
                                .weight(1f)
                                .height(44.dp)
                                .border(2.dp, Color(0xFF1A1A1A))
                        ) {
                            Text(
                                text = "END SHIFT",
                                fontSize = 10.sp,
                                fontWeight = FontWeight.Bold
                            )
                        }
                    }

                    Button(
                        onClick = onNavigateToEmergency,
                        shape = RoundedCornerShape(0),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = Color(0xFFD32F2F), // Safety Red
                            contentColor = Color.White
                        ),
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(48.dp)
                            .border(2.dp, Color(0xFF1A1A1A))
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.Center
                        ) {
                            Icon(Icons.Default.Warning, "Emergency stop", modifier = Modifier.size(18.dp))
                            Spacer(modifier = Modifier.width(6.dp))
                            Text(
                                text = "EMERGENCY / आपातकालीन",
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Bold
                            )
                        }
                    }
                }
            }
            
            // RIGHT PANEL: Single-Action Execution Zone (65% Width)
            Column(
                modifier = Modifier
                    .fillMaxHeight()
                    .weight(0.65f)
                    .background(Color(0xFFF4F5F7))
                    .border(2.dp, Color(0xFF1A1A1A))
                    .padding(24.dp),
                verticalArrangement = Arrangement.SpaceBetween,
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                if (!hasActiveOrder) {
                    // ── WAITING STATE ──────────────────────────────────────────
                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.Center,
                        modifier = Modifier.weight(1f)
                    ) {
                        Text(
                            text = "🕐",
                            fontSize = 54.sp,
                            textAlign = TextAlign.Center
                        )
                        Spacer(modifier = Modifier.height(16.dp))
                        Text(
                            text = "कंसोल से आदेश की प्रतीक्षा",
                            color = Color.Black,
                            fontSize = 22.sp,
                            fontWeight = FontWeight.Black,
                            textAlign = TextAlign.Center
                        )
                        Spacer(modifier = Modifier.height(6.dp))
                        Text(
                            text = "WAITING FOR DISPATCH FROM ADMIN CONSOLE",
                            color = Color(0xFF1A1A1A).copy(alpha = 0.5f),
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold,
                            fontFamily = FontFamily.Monospace,
                            textAlign = TextAlign.Center
                        )
                        Spacer(modifier = Modifier.height(24.dp))
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(56.dp)
                                .background(Color(0xFFD0D0D0))
                                .border(2.dp, Color(0xFF9E9E9E)),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(
                                text = "⟶  कोई सक्रिय बैच नहीं / NO ACTIVE BATCH",
                                color = Color(0xFF9E9E9E),
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold,
                                fontFamily = FontFamily.Monospace
                            )
                        }
                    }
                } else {
                    // ── ACTIVE BATCH STATE ─────────────────────────────────────
                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally,
                        modifier = Modifier.padding(top = 8.dp)
                    ) {
                        Text(
                            text = "वर्तमान बैच चल रहा है...",
                            color = Color.Black,
                            fontSize = 24.sp,
                            fontWeight = FontWeight.Black,
                            textAlign = TextAlign.Center
                        )
                        Spacer(modifier = Modifier.height(6.dp))
                        Text(
                            text = "पूरा होने पर दाईं ओर स्वाइप करें।",
                            color = Color(0xFF1A1A1A).copy(alpha = 0.7f),
                            fontSize = 16.sp,
                            fontWeight = FontWeight.Bold,
                            textAlign = TextAlign.Center
                        )
                    }

                    // Dynamic Progress Countdown Ticker Ring (MM:SS)
                    Box(
                        modifier = Modifier.size(240.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        val progressRatio = (remainingSec.toFloat() / nominalDuration.toFloat()).coerceIn(0f, 1f)
                        Canvas(modifier = Modifier.fillMaxSize()) {
                            drawCircle(
                                color = Color.White,
                                radius = size.minDimension / 2 - 8.dp.toPx()
                            )
                            drawArc(
                                color = Color(0xFFD8DADC),
                                startAngle = 0f,
                                sweepAngle = 360f,
                                useCenter = false,
                                style = Stroke(width = 14.dp.toPx(), cap = StrokeCap.Butt)
                            )
                            drawArc(
                                color = Color(0xFF1A1A1A),
                                startAngle = -90f,
                                sweepAngle = 360f * progressRatio,
                                useCenter = false,
                                style = Stroke(width = 14.dp.toPx(), cap = StrokeCap.Butt)
                            )
                        }
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Text(
                                text = formattedTime,
                                color = Color.Black,
                                fontSize = 52.sp,
                                fontWeight = FontWeight.Black,
                                fontFamily = FontFamily.Monospace,
                                letterSpacing = (-1).sp
                            )
                            Text(
                                text = "समय शेष (REMAINING)",
                                color = Color(0xFF1A1A1A).copy(alpha = 0.6f),
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold
                            )
                        }
                    }

                    SwipeToConfirmSlider(
                        text = "बैच पूरा करने के लिए दाईं ओर स्वाइप करें",
                        successText = "बैच पूरा / BATCH CONFIRMED",
                        onConfirm = {
                            viewModel.completeActiveBatch()
                            showSuccessFlash = true
                        }
                    )
                }
            }
        }

        // Celebratory flash Overlay for 1.5 seconds when swipe completes
        AnimatedVisibility(
            visible = showSuccessFlash,
            enter = fadeIn(),
            exit = fadeOut()
        ) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(Color(0xFF00875A).copy(alpha = 0.95f))
                    .border(4.dp, Color(0xFF1A1A1A)),
                contentAlignment = Alignment.Center
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Box(
                        modifier = Modifier
                            .size(100.dp)
                            .background(Color.White)
                            .border(4.dp, Color(0xFF1A1A1A)),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = "✔",
                            color = Color(0xFF00875A),
                            fontSize = 64.sp,
                            fontWeight = FontWeight.Black
                        )
                    }
                    Spacer(modifier = Modifier.height(20.dp))
                    Text(
                        text = "बैच दर्ज किया गया!",
                        color = Color.White,
                        fontSize = 36.sp,
                        fontWeight = FontWeight.Black,
                        fontFamily = FontFamily.SansSerif
                    )
                    Text(
                        text = "BATCH REGISTERED SUCCESSFULLY!",
                        color = Color.White.copy(alpha = 0.8f),
                        fontSize = 14.sp,
                        fontWeight = FontWeight.Bold,
                        fontFamily = FontFamily.Monospace,
                        modifier = Modifier.padding(top = 8.dp)
                    )
                }
            }

            LaunchedEffect(showSuccessFlash) {
                if (showSuccessFlash) {
                    delay(1500)
                    showSuccessFlash = false
                }
            }
        }

        // High contrast full-screen break overlay
        AnimatedVisibility(
            visible = isOnBreak,
            enter = fadeIn(),
            exit = fadeOut()
        ) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(Color(0xFF161920))
                    .border(4.dp, Color(0xFFFF9800)),
                contentAlignment = Alignment.Center
            ) {
                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.Center
                ) {
                    Text(
                        text = "LUNCH / BREAK TIME",
                        color = Color(0xFFFF9800),
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Black,
                        fontFamily = FontFamily.Monospace,
                        letterSpacing = 2.sp
                    )
                    Spacer(modifier = Modifier.height(16.dp))
                    Text(
                        text = "मध्यांतर (BREAK IN PROGRESS)",
                        color = Color.White,
                        fontSize = 28.sp,
                        fontWeight = FontWeight.Bold,
                        fontFamily = FontFamily.SansSerif
                    )
                    Spacer(modifier = Modifier.height(24.dp))
                    
                    val breakTimeFormatted = remember(breakDurationSec) {
                        val mins = breakDurationSec / 60
                        val secs = breakDurationSec % 60
                        String.format("%02d:%02d", mins, secs)
                    }
                    
                    Text(
                        text = breakTimeFormatted,
                        color = Color.White,
                        fontSize = 64.sp,
                        fontWeight = FontWeight.Black,
                        fontFamily = FontFamily.Monospace
                    )
                    
                    Spacer(modifier = Modifier.height(32.dp))
                    
                    Button(
                        onClick = { viewModel.endBreak() },
                        shape = RoundedCornerShape(0),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = Color(0xFFFF9800),
                            contentColor = Color.Black
                        ),
                        modifier = Modifier
                            .width(260.dp)
                            .height(52.dp)
                            .border(2.dp, Color.White)
                    ) {
                        Text(
                            text = "RESUME SHIFT / कार्य फिर से शुरू करें",
                            fontSize = 13.sp,
                            fontWeight = FontWeight.Black
                        )
                    }
                }
            }
        }
    }
}

fun getIngredientsForProduct(productNameEnglish: String): List<String> {
    val nameNormalized = productNameEnglish.lowercase().trim()
    return when {
        nameNormalized == "cream special" || nameNormalized == "creme special" || nameNormalized == "cream premium" || nameNormalized == "creme premium" -> listOf(
            "Wheat Flour (गेंहू का आटा): 240 kg",
            "Refined Sugar (चीनी): 210 kg",
            "Vegetable Fats (वनस्पति वसा): 90 kg",
            "Cream Flavoring (क्रीम फ्लेवर): 60 kg"
        )
        nameNormalized == "premium plus" || nameNormalized == "premium" -> listOf(
            "Wheat Flour (गेंहू का आटा): 180 kg",
            "Refined Sugar (चीनी): 270 kg",
            "Vegetable Fats (वनस्पति वसा): 90 kg",
            "Premium Additive (प्रीमियम एडिटिव): 60 kg"
        )
        nameNormalized == "standard blend" -> listOf(
            "Wheat Flour (गेंहू का आटा): 420 kg",
            "Refined Sugar (चीनी): 120 kg",
            "Vegetable Fats (वनस्पति वसा): 60 kg"
        )
        else -> listOf(
            "Wheat Flour (गेंहू का आटा): 360 kg",
            "Refined Sugar (चीनी): 120 kg",
            "Vegetable Fats (वनस्पति वसा): 120 kg"
        )
    }
}
