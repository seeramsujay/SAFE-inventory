package com.example.ui.screens

import androidx.compose.animation.*
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.data.ProductEntity
import com.example.ui.IndustrialViewModel
import com.example.ui.OrderInfo
import com.example.ui.components.SwipeToConfirmSlider
import kotlinx.coroutines.delay

data class IngredientDetail(
    val id: String,
    val nameEn: String,
    val nameHi: String,
    val weightKg: Double,
    val percentage: Double,
    val isPipelineGround: Boolean,
    val isGrinderRaw: Boolean,
    val dosingType: String
)

fun getIngredientDetail(id: String, percentage: Double): IngredientDetail {
    return when (id) {
        "ING-006", "raw_maize", "maize" -> IngredientDetail(
            id = id,
            nameEn = "Raw Maize",
            nameHi = "साबुत मक्का",
            weightKg = percentage,
            percentage = percentage,
            isPipelineGround = false,
            isGrinderRaw = true,
            dosingType = "GRINDER HOPPER"
        )
        "ING-001", "wheat_flour" -> IngredientDetail(
            id = id,
            nameEn = "Wheat Flour",
            nameHi = "गेंहू का आटा",
            weightKg = percentage,
            percentage = percentage,
            isPipelineGround = false,
            isGrinderRaw = false,
            dosingType = "MIXER HOPPER"
        )
        "ING-002", "refined_sugar", "sugar" -> IngredientDetail(
            id = id,
            nameEn = "Refined Sugar",
            nameHi = "रिफाइंड चीनी",
            weightKg = percentage,
            percentage = percentage,
            isPipelineGround = false,
            isGrinderRaw = false,
            dosingType = "MIXER HOPPER"
        )
        "ING-003", "vegetable_fats", "fats" -> IngredientDetail(
            id = id,
            nameEn = "Vegetable Fats",
            nameHi = "वनस्पति वसा",
            weightKg = percentage,
            percentage = percentage,
            isPipelineGround = false,
            isGrinderRaw = false,
            dosingType = "LIQUID DOSING"
        )
        "ING-004", "flavor_agents", "cream_flavoring" -> IngredientDetail(
            id = id,
            nameEn = "Cream Flavoring",
            nameHi = "क्रीम फ्लेवर",
            weightKg = percentage,
            percentage = percentage,
            isPipelineGround = false,
            isGrinderRaw = false,
            dosingType = "PRE-MIX ADDITIVE"
        )
        "ING-005", "premium_additive" -> IngredientDetail(
            id = id,
            nameEn = "Premium Additive",
            nameHi = "प्रीमियम एडिटिव",
            weightKg = percentage,
            percentage = percentage,
            isPipelineGround = false,
            isGrinderRaw = false,
            dosingType = "MICRO DOSING"
        )
        else -> IngredientDetail(
            id = id,
            nameEn = id.replace("_", " ").split(" ").joinToString(" ") { it.replaceFirstChar { c -> c.uppercase() } },
            nameHi = id,
            weightKg = percentage,
            percentage = percentage,
            isPipelineGround = false,
            isGrinderRaw = false,
            dosingType = "STANDARD HOPPER"
        )
    }
}

@OptIn(ExperimentalAnimationApi::class)
@Composable
fun WorkerTimerScreen(
    viewModel: IndustrialViewModel,
    onNavigateToExtruder: () -> Unit = {},
    onNavigateToEmergency: () -> Unit = {}
) {
    val batchId by viewModel.batchId.collectAsState()
    val completedBatches by viewModel.activeBatchCountCompleted.collectAsState()
    val totalBatches by viewModel.activeBatchCountTotal.collectAsState()
    val activeProductNameHindi by viewModel.activeProductNameHindi.collectAsState()
    val activeProductNameEnglish by viewModel.activeProductNameEnglish.collectAsState()
    val activeProductColorHex by viewModel.activeProductColorHex.collectAsState()
    val stationType by viewModel.stationType.collectAsState()
    val isGrinder = stationType == "grinder"
    
    val ordersQueue by viewModel.ordersQueue.collectAsState()
    val upcomingBatches by viewModel.upcomingBatches.collectAsState()
    val selectedBatchNumber by viewModel.selectedBatchNumber.collectAsState()
    val activeOrderId by viewModel.activeOrderId.collectAsState()
    val isOnBreak by viewModel.isOnBreak.collectAsState()
    val breakDurationSec by viewModel.breakDurationSec.collectAsState()
    val products by viewModel.products.collectAsState()

    val hasActiveOrder = activeProductNameEnglish.isNotBlank()

    val activeProduct = remember(products, activeProductNameEnglish) {
        products.find { it.englishName.equals(activeProductNameEnglish, ignoreCase = true) }
    }

    // Identify next upcoming order in the queue
    val nextPendingOrder = remember(ordersQueue) {
        ordersQueue.firstOrNull { it.status == "PENDING" }
    }

    val cardColor = remember(activeProductColorHex, isGrinder) {
        if (isGrinder) {
            Color(0xFFD97706) // Industrial Amber for Grinder
        } else {
            try {
                Color(android.graphics.Color.parseColor(activeProductColorHex))
            } catch (e: Exception) {
                Color(0xFF00875A) // Industrial Emerald for Mixer
            }
        }
    }

    // Parse structured formula items from JSON
    val formulaItems = remember(activeProduct, isGrinder) {
        val list = mutableListOf<IngredientDetail>()
        if (activeProduct != null && !activeProduct.mixtureRatios.isNullOrBlank()) {
            try {
                val jsonArray = org.json.JSONArray(activeProduct.mixtureRatios)
                for (i in 0 until jsonArray.length()) {
                    val obj = jsonArray.getJSONObject(i)
                    val ingId = obj.optString("ingredientId")
                    val isGrind = obj.optString("stage") == "grinder" || obj.optBoolean("requiresGrinding", false) || ingId.contains("006") || ingId.contains("maize", ignoreCase = true)
                    val qty = obj.optDouble("percentage", 0.0)
                    if (qty > 0) {
                        val base = getIngredientDetail(ingId, qty)
                        if (isGrinder) {
                            if (isGrind) list.add(base)
                        } else {
                            if (isGrind) {
                                list.add(
                                    base.copy(
                                        nameEn = "Ground Maize Powder",
                                        nameHi = "पिसा हुआ मक्का पाउडर",
                                        isPipelineGround = true,
                                        dosingType = "PIPELINE FROM STAGE 1"
                                    )
                                )
                            } else {
                                list.add(base)
                            }
                        }
                    }
                }
            } catch (e: Exception) {}
        }
        if (list.isEmpty()) {
            if (isGrinder) {
                list.add(getIngredientDetail("ING-006", 120.0))
            } else {
                list.add(
                    IngredientDetail(
                        id = "ING-006",
                        nameEn = "Ground Maize Powder",
                        nameHi = "पिसा हुआ मक्का",
                        weightKg = 120.0,
                        percentage = 120.0,
                        isPipelineGround = true,
                        isGrinderRaw = false,
                        dosingType = "PIPELINE TRANSFER"
                    )
                )
                list.add(getIngredientDetail("ING-001", 240.0))
                list.add(getIngredientDetail("ING-002", 150.0))
                list.add(getIngredientDetail("ING-003", 60.0))
                list.add(getIngredientDetail("ING-004", 30.0))
            }
        }
        list
    }

    val totalBatchWeight = remember(formulaItems) {
        val sum = formulaItems.sumOf { it.weightKg }
        if (sum == 0.0) (if (isGrinder) 120.0 else 600.0) else sum
    }

    val nominalDuration = remember(activeProduct) {
        activeProduct?.nominalBatchDurationSec ?: 480
    }

    var showSuccessFlash by remember { mutableStateOf(false) }
    var showMixerFeedbackDialog by remember { mutableStateOf(false) }
    var selectedTexture by remember { mutableStateOf("Smooth Homogeneous") }
    var selectedRating by remember { mutableStateOf(5) }
    var feedbackNotes by remember { mutableStateOf("मिश्रण सही बना, मक्का अच्छी तरह घुल गया") }

    Box(modifier = Modifier.fillMaxSize()) {
        Row(modifier = Modifier.fillMaxSize()) {
            
            // =========================================================================
            // LEFT PANEL: WHAT IS NEXT & PRODUCTION QUEUE (~33% Width)
            // =========================================================================
            Column(
                modifier = Modifier
                    .fillMaxHeight()
                    .weight(0.33f)
                    .background(Color.White)
                    .border(2.dp, Color(0xFF1A1A1A))
                    .padding(16.dp),
                verticalArrangement = Arrangement.SpaceBetween
            ) {
                Column(
                    modifier = Modifier.weight(1f),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    // Station Banner Header
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .background(if (isGrinder) Color(0xFFFFFBEB) else Color(0xFFF0FDF4))
                            .border(1.5.dp, if (isGrinder) Color(0xFFD97706) else Color(0xFF00875A))
                            .padding(horizontal = 10.dp, vertical = 8.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column {
                            Text(
                                text = if (isGrinder) "1. GRINDER (पिसाई)" else "2. MIXER (मिश्रण)",
                                fontSize = 13.sp,
                                fontWeight = FontWeight.Black,
                                fontFamily = FontFamily.SansSerif,
                                color = if (isGrinder) Color(0xFFB45309) else Color(0xFF00875A)
                            )
                            Text(
                                text = if (isGrinder) "STAGE 1 // MILLING" else "STAGE 2 // BLENDING",
                                fontSize = 9.sp,
                                fontWeight = FontWeight.Bold,
                                fontFamily = FontFamily.Monospace,
                                color = Color.Gray
                            )
                        }
                        Box(
                            modifier = Modifier
                                .background(Color(0xFF1A1A1A))
                                .padding(horizontal = 8.dp, vertical = 4.dp)
                        ) {
                            Text(
                                text = if (batchId.isNotBlank()) batchId else "KIOSK-01",
                                fontSize = 10.sp,
                                fontWeight = FontWeight.Bold,
                                fontFamily = FontFamily.Monospace,
                                color = Color.White
                            )
                        }
                    }

                    // ── UPCOMING BATCHES QUEUE (आगामी बैच कतार) ──────────────────
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = "आगामी बैच (UPCOMING):",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Black,
                            fontFamily = FontFamily.Monospace,
                            color = Color(0xFF1A1A1A)
                        )
                        Text(
                            text = "${upcomingBatches.size} queued",
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Bold,
                            fontFamily = FontFamily.Monospace,
                            color = Color.Gray
                        )
                    }

                    Text(
                        text = "बैच चुनें और फॉर्मूला देखें (Click to load formula)",
                        fontSize = 9.sp,
                        fontWeight = FontWeight.Medium,
                        color = Color.Gray
                    )

                    LazyColumn(
                        modifier = Modifier
                            .fillMaxWidth()
                            .weight(1f)
                            .border(1.5.dp, Color(0xFFD8DADC))
                            .background(Color(0xFFFAFAFA))
                            .padding(6.dp),
                        verticalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        if (upcomingBatches.isEmpty()) {
                            item {
                                Box(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(20.dp),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Text(
                                        text = "कतार खाली है / No upcoming batches",
                                        fontSize = 11.sp,
                                        color = Color.Gray,
                                        fontFamily = FontFamily.Monospace
                                    )
                                }
                            }
                        } else {
                            items(upcomingBatches) { bItem ->
                                val isSel = bItem.isSelected
                                val accentCol = if (isGrinder) Color(0xFFD97706) else Color(0xFF00875A)
                                Column(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .background(if (isSel) (if (isGrinder) Color(0xFFFFFBEB) else Color(0xFFF0FDF4)) else Color.White)
                                        .border(
                                            width = if (isSel) 2.5.dp else 1.dp,
                                            color = if (isSel) accentCol else Color(0xFFE2E8F0)
                                        )
                                        .clickable {
                                            viewModel.selectBatch(bItem)
                                        }
                                        .padding(8.dp)
                                ) {
                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.SpaceBetween,
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Text(
                                            text = "BATCH #${bItem.batchNumber} / ${bItem.totalBatchesInOrder}",
                                            fontSize = 10.sp,
                                            fontWeight = FontWeight.Black,
                                            fontFamily = FontFamily.Monospace,
                                            color = if (isSel) accentCol else Color.DarkGray
                                        )
                                        Box(
                                            modifier = Modifier
                                                .background(if (isSel) accentCol else Color(0xFFE2E8F0))
                                                .padding(horizontal = 5.dp, vertical = 2.dp)
                                        ) {
                                            Text(
                                                text = if (isSel) "SELECTED" else "UPCOMING",
                                                color = if (isSel) Color.White else Color(0xFF475569),
                                                fontSize = 8.sp,
                                                fontWeight = FontWeight.Black,
                                                fontFamily = FontFamily.Monospace
                                            )
                                        }
                                    }
                                    Spacer(modifier = Modifier.height(4.dp))
                                    Text(
                                        text = bItem.productNameHindi,
                                        fontSize = 13.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = Color.Black
                                    )
                                    Text(
                                        text = bItem.productNameEnglish.uppercase(),
                                        fontSize = 9.sp,
                                        fontWeight = FontWeight.Medium,
                                        fontFamily = FontFamily.Monospace,
                                        color = Color.Gray
                                    )
                                    Spacer(modifier = Modifier.height(2.dp))
                                    Text(
                                        text = "Order: ${bItem.orderId}",
                                        fontSize = 9.sp,
                                        fontFamily = FontFamily.Monospace,
                                        color = Color(0xFF64748B)
                                    )
                                }
                            }
                        }
                    }
                }

                Spacer(modifier = Modifier.height(10.dp))

                // Bottom Shift & Emergency Controls
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
                            containerColor = Color(0xFFD32F2F),
                            contentColor = Color.White
                        ),
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(44.dp)
                            .border(2.dp, Color(0xFF1A1A1A))
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.Center
                        ) {
                            Icon(Icons.Default.Warning, "Emergency stop", modifier = Modifier.size(16.dp))
                            Spacer(modifier = Modifier.width(6.dp))
                            Text(
                                text = "EMERGENCY / आपातकालीन",
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold
                            )
                        }
                    }
                }
            }
            
            // =========================================================================
            // RIGHT PANEL: WHAT IS GOING ON NOW & THE FORMULA (~67% Width)
            // =========================================================================
            Column(
                modifier = Modifier
                    .fillMaxHeight()
                    .weight(0.67f)
                    .background(Color(0xFFF4F5F7))
                    .border(2.dp, Color(0xFF1A1A1A))
                    .padding(20.dp),
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
                            text = "⏳",
                            fontSize = 52.sp,
                            textAlign = TextAlign.Center
                        )
                        Spacer(modifier = Modifier.height(16.dp))
                        Text(
                            text = "कंसोल से आदेश की प्रतीक्षा",
                            color = Color.Black,
                            fontSize = 26.sp,
                            fontWeight = FontWeight.Black,
                            textAlign = TextAlign.Center
                        )
                        Spacer(modifier = Modifier.height(6.dp))
                        Text(
                            text = "AWAITING PRODUCTION ORDER FROM ADMIN CONSOLE",
                            color = Color(0xFF1A1A1A).copy(alpha = 0.6f),
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold,
                            fontFamily = FontFamily.Monospace,
                            textAlign = TextAlign.Center
                        )
                        Spacer(modifier = Modifier.height(24.dp))
                        Box(
                            modifier = Modifier
                                .fillMaxWidth(0.8f)
                                .height(52.dp)
                                .background(Color(0xFFE2E8F0))
                                .border(2.dp, Color(0xFF94A3B8)),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(
                                text = "⟶  कोई सक्रिय बैच नहीं / NO ACTIVE BATCH",
                                color = Color(0xFF64748B),
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Bold,
                                fontFamily = FontFamily.Monospace
                            )
                        }
                    }
                } else {
                    // ── ACTIVE BATCH & FORMULA VIEW ────────────────────────────
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .weight(1f),
                        verticalArrangement = Arrangement.spacedBy(14.dp)
                    ) {
                        // 1. ACTIVE HEADER CARD: WHAT IS GOING ON NOW
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .background(cardColor)
                                .border(3.dp, Color(0xFF1A1A1A))
                                .padding(16.dp)
                        ) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Box(
                                    modifier = Modifier
                                        .background(Color.White.copy(alpha = 0.25f))
                                        .padding(horizontal = 8.dp, vertical = 3.dp)
                                ) {
                                    Text(
                                        text = if (isGrinder) "STAGE 1: GRINDER RUNNING (पिसाई)" else "STAGE 2: MIXER COMPOUNDING (मिश्रण)",
                                        color = Color.White,
                                        fontSize = 11.sp,
                                        fontWeight = FontWeight.Black,
                                        fontFamily = FontFamily.Monospace
                                    )
                                }

                                Box(
                                    modifier = Modifier
                                        .background(Color(0xFF1A1A1A))
                                        .border(1.dp, Color.White)
                                        .padding(horizontal = 12.dp, vertical = 4.dp)
                                ) {
                                    Text(
                                        text = "BATCH $selectedBatchNumber / $totalBatches",
                                        color = Color.White,
                                        fontSize = 14.sp,
                                        fontWeight = FontWeight.Black,
                                        fontFamily = FontFamily.Monospace
                                    )
                                }
                            }

                            Spacer(modifier = Modifier.height(8.dp))

                            Text(
                                text = activeProductNameHindi,
                                color = Color.White,
                                fontSize = 32.sp,
                                fontWeight = FontWeight.Black,
                                fontFamily = FontFamily.SansSerif
                            )
                            Text(
                                text = "ACTIVE FORMULA: ${activeProductNameEnglish.uppercase()}",
                                color = Color.White.copy(alpha = 0.9f),
                                fontSize = 13.sp,
                                fontWeight = FontWeight.Bold,
                                fontFamily = FontFamily.Monospace
                            )

                            Spacer(modifier = Modifier.height(10.dp))
                            Divider(color = Color.White.copy(alpha = 0.35f), thickness = 1.dp)
                            Spacer(modifier = Modifier.height(8.dp))

                            // Key Batch Info Badges
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.spacedBy(12.dp)
                            ) {
                                Box(
                                    modifier = Modifier
                                        .background(Color.Black.copy(alpha = 0.35f))
                                        .padding(horizontal = 10.dp, vertical = 6.dp)
                                ) {
                                    Text(
                                        text = "कुल बैच वजन: ${totalBatchWeight.toInt()} kg",
                                        color = Color.White,
                                        fontSize = 12.sp,
                                        fontWeight = FontWeight.Bold,
                                        fontFamily = FontFamily.Monospace
                                    )
                                }

                                Box(
                                    modifier = Modifier
                                        .background(Color.Black.copy(alpha = 0.35f))
                                        .padding(horizontal = 10.dp, vertical = 6.dp)
                                ) {
                                    Text(
                                        text = String.format("अनुमानित समय: %.1f min", nominalDuration / 60.0),
                                        color = Color.White,
                                        fontSize = 12.sp,
                                        fontWeight = FontWeight.Bold,
                                        fontFamily = FontFamily.Monospace
                                    )
                                }
                            }
                        }

                        // 2. THE FORMULA & INGREDIENT LISTING (IN PLACE OF THE OLD TIMER)
                        if (isGrinder) {
                            // ── GRINDER STAGE: PULVERIZATION FORMULA & OPERATOR TASKS ─
                            Column(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .weight(1f),
                                verticalArrangement = Arrangement.spacedBy(10.dp)
                            ) {
                                Text(
                                    text = "पिसाई सामग्री और फॉर्मूला (MATERIALS TO GRIND):",
                                    fontSize = 13.sp,
                                    fontWeight = FontWeight.Black,
                                    fontFamily = FontFamily.Monospace,
                                    color = Color(0xFFB45309)
                                )

                                // Highlighted Raw Material Box
                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .background(Color(0xFFFFFBEB))
                                        .border(2.dp, Color(0xFFD97706))
                                        .padding(12.dp),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Column {
                                        Text(
                                            text = "साबुत मक्का (Raw Maize / ING-006)",
                                            fontSize = 16.sp,
                                            fontWeight = FontWeight.Black,
                                            color = Color.Black
                                        )
                                        Text(
                                            text = "कण आकार: < 200 माइक्रोन बारीक पाउडर | नमी: < 12.5%",
                                            fontSize = 11.sp,
                                            fontWeight = FontWeight.Bold,
                                            color = Color(0xFF78350F),
                                            fontFamily = FontFamily.Monospace
                                        )
                                    }
                                    Box(
                                        modifier = Modifier
                                            .background(Color(0xFFD97706))
                                            .padding(horizontal = 14.dp, vertical = 8.dp)
                                    ) {
                                        Text(
                                            text = "${totalBatchWeight.toInt()} kg",
                                            fontSize = 20.sp,
                                            fontWeight = FontWeight.Black,
                                            fontFamily = FontFamily.Monospace,
                                            color = Color.White
                                        )
                                    }
                                }

                                Text(
                                    text = "चरणबद्ध कार्य सूची (STEP-BY-STEP CHECKLIST):",
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.Black,
                                    fontFamily = FontFamily.Monospace,
                                    color = Color(0xFF1A1A1A)
                                )

                                LazyColumn(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .weight(1f),
                                    verticalArrangement = Arrangement.spacedBy(8.dp)
                                ) {
                                    item {
                                        TaskCheckItem(
                                            step = "1",
                                            title = "लोड (LOAD)",
                                            desc = "हॉपर में 120 kg साबुत मक्का लोड करें। विदेशी कणों की जांच करें।"
                                        )
                                    }
                                    item {
                                        TaskCheckItem(
                                            step = "2",
                                            title = "ग्राइंडर चालू (START)",
                                            desc = "हैमर मिल चालू कर रोटर 1,480 RPM पर स्थिर होने दें।"
                                        )
                                    }
                                    item {
                                        TaskCheckItem(
                                            step = "3",
                                            title = "छलनी जांच (INSPECT)",
                                            desc = "पाउडर 200µm से बारीक पिसना चाहिए (Mesh 80 Pass 99.4%)।"
                                        )
                                    }
                                    item {
                                        TaskCheckItem(
                                            step = "4",
                                            title = "पाइपलाइन ट्रांसफर (TRANSFER)",
                                            desc = "न्यूमेटिक ब्लोअर वाल्व खोलें और पिसा हुआ मक्का मिक्सर को भेजें।"
                                        )
                                    }
                                }
                            }
                        } else {
                            // ── MIXER STAGE: COMPLETE FORMULA RECIPE BREAKDOWN ────────
                            Column(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .weight(1f),
                                verticalArrangement = Arrangement.spacedBy(8.dp)
                            ) {
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Text(
                                        text = "मिश्रण रेसिपी फॉर्मूला (RECIPE INGREDIENT FORMULA):",
                                        fontSize = 13.sp,
                                        fontWeight = FontWeight.Black,
                                        fontFamily = FontFamily.Monospace,
                                        color = Color(0xFF00875A)
                                    )
                                    Text(
                                        text = "कुल: ${totalBatchWeight.toInt()} kg",
                                        fontSize = 12.sp,
                                        fontWeight = FontWeight.Black,
                                        fontFamily = FontFamily.Monospace,
                                        color = Color(0xFF1A1A1A)
                                    )
                                }

                                LazyColumn(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .weight(1f)
                                        .border(1.5.dp, Color(0xFFD8DADC))
                                        .background(Color.White)
                                        .padding(8.dp),
                                    verticalArrangement = Arrangement.spacedBy(8.dp)
                                ) {
                                    items(formulaItems) { item ->
                                        Row(
                                            modifier = Modifier
                                                .fillMaxWidth()
                                                .background(if (item.isPipelineGround) Color(0xFFFFFBEB) else Color(0xFFF8FAFC))
                                                .border(
                                                    width = 1.5.dp,
                                                    color = if (item.isPipelineGround) Color(0xFFD97706) else Color(0xFFCBD5E1)
                                                )
                                                .padding(horizontal = 12.dp, vertical = 10.dp),
                                            horizontalArrangement = Arrangement.SpaceBetween,
                                            verticalAlignment = Alignment.CenterVertically
                                        ) {
                                            Column(modifier = Modifier.weight(1f)) {
                                                Row(
                                                    verticalAlignment = Alignment.CenterVertically,
                                                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                                                ) {
                                                    Text(
                                                        text = item.nameHi,
                                                        fontSize = 15.sp,
                                                        fontWeight = FontWeight.Black,
                                                        color = Color.Black
                                                    )
                                                    if (item.isPipelineGround) {
                                                        Box(
                                                            modifier = Modifier
                                                                .background(Color(0xFFD97706))
                                                                .padding(horizontal = 6.dp, vertical = 2.dp)
                                                        ) {
                                                            Text(
                                                                text = "पाइपलाइन से (STAGE 1)",
                                                                color = Color.White,
                                                                fontSize = 9.sp,
                                                                fontWeight = FontWeight.Black,
                                                                fontFamily = FontFamily.Monospace
                                                            )
                                                        }
                                                    }
                                                }
                                                Text(
                                                    text = "${item.nameEn} • ${item.dosingType}",
                                                    fontSize = 11.sp,
                                                    fontWeight = FontWeight.Bold,
                                                    color = Color.Gray,
                                                    fontFamily = FontFamily.Monospace
                                                )
                                            }

                                            Box(
                                                modifier = Modifier
                                                    .background(if (item.isPipelineGround) Color(0xFFD97706) else Color(0xFF1A1A1A))
                                                    .padding(horizontal = 12.dp, vertical = 6.dp)
                                            ) {
                                                Text(
                                                    text = "${item.weightKg.toInt()} kg",
                                                    fontSize = 16.sp,
                                                    fontWeight = FontWeight.Black,
                                                    fontFamily = FontFamily.Monospace,
                                                    color = Color.White
                                                )
                                            }
                                        }
                                    }
                                }

                                // Mixing instructions footer
                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .background(Color(0xFFF0FDF4))
                                        .border(1.dp, Color(0xFF86EFAC))
                                        .padding(8.dp),
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Text(
                                        text = "★ निर्देश: ड्राई इंग्रीडिएंट्स + पाइपलाइन मक्का 3 मिनट मिलाएं, फिर लिक्विड वसा डालकर 5 मिनट होमोजिनाइज करें।",
                                        fontSize = 11.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = Color(0xFF166534)
                                    )
                                }
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(10.dp))

                    // Grinder Bulk Action: Pulverize all remaining batches in one shot if > 1 remaining
                    val remainingBatches = maxOf(1, totalBatches - completedBatches)
                    if (isGrinder && remainingBatches > 1) {
                        val totalRemainingMaizeKg = remainingBatches * 120
                        Button(
                            onClick = {
                                viewModel.completeBulkGrind(activeOrderId, remainingBatches)
                                showSuccessFlash = true
                            },
                            shape = RoundedCornerShape(0),
                            colors = ButtonDefaults.buttonColors(
                                containerColor = Color(0xFFD97706),
                                contentColor = Color.White
                            ),
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(46.dp)
                                .border(2.dp, Color(0xFF1A1A1A))
                        ) {
                            Text(
                                text = "⚡ पूरे ऑर्डर के सभी बैच पीसें (BULK GRIND ALL $remainingBatches BATCHES: ${totalRemainingMaizeKg} KG)",
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Black,
                                fontFamily = FontFamily.Monospace
                            )
                        }
                        Spacer(modifier = Modifier.height(8.dp))
                    }

                    // 3. EXECUTION ACTION SLIDER AT BOTTOM (Preserved as requested)
                    SwipeToConfirmSlider(
                        text = if (isGrinder) "मक्का पीसकर पाइपलाइन में भेजें (SEND TO PIPELINE)" else "फीडबैक दर्ज कर बैच पूरा करें (SWIPE FOR FEEDBACK)",
                        successText = if (isGrinder) "पिसाई पूरी - पाइपलाइन में भेजा गया" else "फीडबैक आवश्यक / FEEDBACK REQUIRED",
                        onConfirm = {
                            if (isGrinder) {
                                viewModel.completeActiveBatch()
                                showSuccessFlash = true
                            } else {
                                showMixerFeedbackDialog = true
                            }
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
                    .background((if (isGrinder) Color(0xFFD97706) else Color(0xFF00875A)).copy(alpha = 0.95f))
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
                            color = if (isGrinder) Color(0xFFD97706) else Color(0xFF00875A),
                            fontSize = 64.sp,
                            fontWeight = FontWeight.Black
                        )
                    }
                    Spacer(modifier = Modifier.height(20.dp))
                    Text(
                        text = if (isGrinder) "पिसाई पूरी! पाइपलाइन में भेजा गया" else "बैच दर्ज किया गया!",
                        color = Color.White,
                        fontSize = 32.sp,
                        fontWeight = FontWeight.Black,
                        fontFamily = FontFamily.SansSerif
                    )
                    Text(
                        text = if (isGrinder) "MAIZE PULVERIZED & TRANSFERRED TO PIPELINE" else "BATCH REGISTERED SUCCESSFULLY!",
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

        // Mixer Operator Feedback Dialog Modal
        if (showMixerFeedbackDialog) {
            AlertDialog(
                onDismissRequest = { showMixerFeedbackDialog = false },
                title = {
                    Column {
                        Text(
                            text = "मिक्सर ऑपरेटर फीडबैक",
                            fontSize = 20.sp,
                            fontWeight = FontWeight.Black,
                            color = Color(0xFF00875A)
                        )
                        Text(
                            text = "STAGE 2 COMPOUND QUALITY SIGN-OFF",
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Bold,
                            fontFamily = FontFamily.Monospace,
                            color = Color.Gray
                        )
                    }
                },
                text = {
                    Column(
                        modifier = Modifier.fillMaxWidth(),
                        verticalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        Text(
                            text = "1. मिश्रण की बनावट (Texture & Consistency):",
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold
                        )
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(6.dp)
                        ) {
                            listOf("Smooth", "Grainy", "Too Dry", "Too Wet").forEach { tex ->
                                FilterChip(
                                    selected = selectedTexture.contains(tex),
                                    onClick = { selectedTexture = tex },
                                    label = { Text(tex, fontSize = 10.sp) }
                                )
                            }
                        }

                        Text(
                            text = "2. गुणवत्ता रेटिंग (Rating): $selectedRating / 5 ★",
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold
                        )
                        Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                            (1..5).forEach { star ->
                                TextButton(onClick = { selectedRating = star }) {
                                    Text(
                                        text = if (star <= selectedRating) "★" else "☆",
                                        fontSize = 22.sp,
                                        color = if (star <= selectedRating) Color(0xFFFFB300) else Color.Gray
                                    )
                                }
                            }
                        }

                        Text(
                            text = "3. ऑपरेटर टिप्पणियां (Remarks):",
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold
                        )
                        OutlinedTextField(
                            value = feedbackNotes,
                            onValueChange = { feedbackNotes = it },
                            modifier = Modifier.fillMaxWidth(),
                            textStyle = androidx.compose.ui.text.TextStyle(fontSize = 12.sp)
                        )
                    }
                },
                confirmButton = {
                    Button(
                        onClick = {
                            showMixerFeedbackDialog = false
                            viewModel.completeActiveBatch(
                                feedbackQuality = "Grade A - Optimal",
                                feedbackTexture = selectedTexture,
                                feedbackNotes = feedbackNotes,
                                feedbackRating = selectedRating
                            )
                            showSuccessFlash = true
                        },
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF00875A))
                    ) {
                        Text("फीडबैक दर्ज कर बैच पूरा करें (SUBMIT)")
                    }
                },
                dismissButton = {
                    TextButton(onClick = { showMixerFeedbackDialog = false }) {
                        Text("रद्द करें (CANCEL)")
                    }
                }
            )
        }
    }
}

@Composable
fun TaskCheckItem(step: String, title: String, desc: String) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .background(Color.White)
            .border(1.5.dp, Color(0xFFCBD5E1))
            .padding(10.dp),
        horizontalArrangement = Arrangement.spacedBy(10.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Box(
            modifier = Modifier
                .size(28.dp)
                .background(Color(0xFFD97706)),
            contentAlignment = Alignment.Center
        ) {
            Text(
                text = step,
                color = Color.White,
                fontSize = 13.sp,
                fontWeight = FontWeight.Black,
                fontFamily = FontFamily.Monospace
            )
        }
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = title,
                fontSize = 13.sp,
                fontWeight = FontWeight.Black,
                color = Color.Black
            )
            Text(
                text = desc,
                fontSize = 11.sp,
                color = Color(0xFF475569),
                fontWeight = FontWeight.Medium
            )
        }
    }
}

