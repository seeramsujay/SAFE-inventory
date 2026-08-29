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

fun parseHexColor(hexString: String?, defaultColor: Color = Color(0xFF00875A)): Color {
    if (hexString.isNullOrBlank()) return defaultColor
    return try {
        val cleanHex = if (hexString.startsWith("#")) hexString else "#$hexString"
        Color(android.graphics.Color.parseColor(cleanHex))
    } catch (e: Exception) {
        defaultColor
    }
}

fun isDarkColor(color: Color): Boolean {
    val luminance = 0.299 * color.red + 0.587 * color.green + 0.114 * color.blue
    return luminance < 0.55
}

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
            nameEn = "Raw Maize (Corn)",
            nameHi = "साबुत मक्का",
            weightKg = percentage,
            percentage = percentage,
            isPipelineGround = false,
            isGrinderRaw = true,
            dosingType = "STAGE 1 GRINDER"
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
    val products by viewModel.products.collectAsState()

    val hasActiveOrder = activeProductNameEnglish.isNotBlank()

    val activeProduct = remember(products, activeProductNameEnglish, activeOrderId) {
        products.find { 
            it.englishName.equals(activeProductNameEnglish, ignoreCase = true) || 
            (activeOrderId.isNotBlank() && it.id.equals(activeOrderId, ignoreCase = true))
        }
    }

    // Dynamic mixture color as specified in the dashboard (web)
    val recipeColor = remember(activeProductColorHex, activeProduct) {
        val hex = activeProduct?.colorHex?.takeIf { it.isNotBlank() && it != "#1A1A1A" }
            ?: activeProductColorHex.takeIf { it.isNotBlank() && it != "#1A1A1A" }
            ?: "#00875A"
        parseHexColor(hex, Color(0xFF00875A))
    }

    // Parse complete formula ingredients of the mixture
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
                        if (isGrind) {
                            list.add(
                                base.copy(
                                    nameEn = if (isGrinder) "Raw Maize (Corn)" else "Ground Maize Powder",
                                    nameHi = if (isGrinder) "साबुत मक्का" else "पिसा हुआ मक्का",
                                    isPipelineGround = !isGrinder,
                                    isGrinderRaw = isGrinder,
                                    dosingType = if (isGrinder) "STAGE 1 GRINDER" else "PIPELINE FROM STAGE 1"
                                )
                            )
                        } else {
                            list.add(base)
                        }
                    }
                }
            } catch (e: Exception) {}
        }
        if (list.isEmpty()) {
            list.add(
                IngredientDetail(
                    id = "ING-006",
                    nameEn = if (isGrinder) "Raw Maize (Corn)" else "Ground Maize Powder",
                    nameHi = if (isGrinder) "साबुत मक्का" else "पिसा हुआ मक्का",
                    weightKg = 120.0,
                    percentage = 120.0,
                    isPipelineGround = !isGrinder,
                    isGrinderRaw = isGrinder,
                    dosingType = if (isGrinder) "STAGE 1 GRINDER" else "PIPELINE FROM STAGE 1"
                )
            )
            list.add(getIngredientDetail("ING-001", 240.0))
            list.add(getIngredientDetail("ING-002", 150.0))
            list.add(getIngredientDetail("ING-003", 60.0))
            list.add(getIngredientDetail("ING-004", 30.0))
        }
        list
    }

    val totalBatchWeight = remember(formulaItems) {
        val sum = formulaItems.sumOf { it.weightKg }
        if (sum == 0.0) 600.0 else sum
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

                    // ── UPCOMING PRODUCTS / ORDERS QUEUE (आगामी उत्पाद कतार) ──────────────────
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = "उत्पाद कतार (ORDER QUEUE):",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Black,
                            fontFamily = FontFamily.Monospace,
                            color = Color(0xFF1A1A1A)
                        )
                        Text(
                            text = "${upcomingBatches.size} products",
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Bold,
                            fontFamily = FontFamily.Monospace,
                            color = Color.Gray
                        )
                    }

                    Text(
                        text = "उत्पाद चुनें और रेसिपी देखें (Select product tile to load)",
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
                        verticalArrangement = Arrangement.spacedBy(8.dp)
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
                                        text = "कतार खाली है / No queued products",
                                        fontSize = 11.sp,
                                        color = Color.Gray,
                                        fontFamily = FontFamily.Monospace
                                    )
                                }
                            }
                        } else {
                            items(upcomingBatches) { oItem ->
                                val isSel = oItem.isSelected
                                val itemColor = parseHexColor(oItem.colorHex, Color(0xFF00875A))
                                val progressFraction = if (oItem.totalBatchesInOrder > 0) {
                                    oItem.completedBatches.toFloat() / oItem.totalBatchesInOrder.toFloat()
                                } else 0f
                                
                                Column(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .background(if (isSel) itemColor.copy(alpha = 0.12f) else Color.White)
                                        .border(
                                            width = if (isSel) 3.dp else 1.5.dp,
                                            color = if (isSel) itemColor else itemColor.copy(alpha = 0.4f)
                                        )
                                        .clickable {
                                            viewModel.selectOrder(oItem)
                                        }
                                        .padding(10.dp)
                                ) {
                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.SpaceBetween,
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Row(
                                            verticalAlignment = Alignment.CenterVertically,
                                            horizontalArrangement = Arrangement.spacedBy(6.dp)
                                        ) {
                                            Box(
                                                modifier = Modifier
                                                    .size(12.dp)
                                                    .background(itemColor)
                                            )
                                            Text(
                                                text = if (isSel) "BATCH ${oItem.currentBatchNumber} OF ${oItem.totalBatchesInOrder}" else "${oItem.totalBatchesInOrder} BATCHES",
                                                fontSize = 11.sp,
                                                fontWeight = FontWeight.Black,
                                                fontFamily = FontFamily.Monospace,
                                                color = if (isSel) Color.Black else Color.DarkGray
                                            )
                                        }
                                        Box(
                                            modifier = Modifier
                                                .background(if (isSel) itemColor else Color(0xFFE2E8F0))
                                                .padding(horizontal = 6.dp, vertical = 2.dp)
                                        ) {
                                            Text(
                                                text = if (isSel) "ACTIVE" else "QUEUED",
                                                color = if (isSel) Color.White else Color(0xFF475569),
                                                fontSize = 8.sp,
                                                fontWeight = FontWeight.Black,
                                                fontFamily = FontFamily.Monospace
                                            )
                                        }
                                    }
                                    Spacer(modifier = Modifier.height(4.dp))
                                    Text(
                                        text = oItem.productNameHindi,
                                        fontSize = 14.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = Color.Black
                                    )
                                    Text(
                                        text = oItem.productNameEnglish.uppercase(),
                                        fontSize = 9.sp,
                                        fontWeight = FontWeight.Medium,
                                        fontFamily = FontFamily.Monospace,
                                        color = Color.Gray
                                    )
                                    
                                    Spacer(modifier = Modifier.height(6.dp))
                                    
                                    // Visual Batch Progress Bar
                                    Column(modifier = Modifier.fillMaxWidth()) {
                                        Row(
                                            modifier = Modifier.fillMaxWidth(),
                                            horizontalArrangement = Arrangement.SpaceBetween
                                        ) {
                                            Text(
                                                text = "प्रगति (Progress): ${oItem.completedBatches}/${oItem.totalBatchesInOrder} Batches",
                                                fontSize = 9.sp,
                                                fontWeight = FontWeight.Bold,
                                                fontFamily = FontFamily.Monospace,
                                                color = Color(0xFF475569)
                                            )
                                            Text(
                                                text = "${(progressFraction * 100).toInt()}%",
                                                fontSize = 9.sp,
                                                fontWeight = FontWeight.Black,
                                                fontFamily = FontFamily.Monospace,
                                                color = itemColor
                                            )
                                        }
                                        Spacer(modifier = Modifier.height(3.dp))
                                        LinearProgressIndicator(
                                            progress = progressFraction,
                                            modifier = Modifier
                                                .fillMaxWidth()
                                                .height(5.dp),
                                            color = itemColor,
                                            trackColor = Color(0xFFE2E8F0)
                                        )
                                    }
                                    
                                    Spacer(modifier = Modifier.height(4.dp))
                                    Text(
                                        text = "Order ID: ${oItem.orderId}",
                                        fontSize = 8.sp,
                                        fontFamily = FontFamily.Monospace,
                                        color = Color(0xFF94A3B8)
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
            // RIGHT PANEL: ACTIVE RECIPE & COMPLETE INGREDIENTS BREAKDOWN (~67% Width)
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
                            text = "📋",
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
                    val isDarkRecipe = isDarkColor(recipeColor)
                    val headerTextColor = if (isDarkRecipe) Color.White else Color(0xFF0F172A)
                    val headerSubtextColor = if (isDarkRecipe) Color.White.copy(alpha = 0.9f) else Color(0xFF1E293B).copy(alpha = 0.9f)
                    val headerBadgeBg = if (isDarkRecipe) Color.Black.copy(alpha = 0.35f) else Color.White.copy(alpha = 0.6f)
                    val headerBadgeText = if (isDarkRecipe) Color.White else Color(0xFF0F172A)
                    val headerDividerColor = if (isDarkRecipe) Color.White.copy(alpha = 0.35f) else Color(0xFF0F172A).copy(alpha = 0.2f)

                    // ── ACTIVE BATCH & RECIPE INGREDIENTS VIEW (SHOWS RECIPE ONLY FOR BOTH STAGES) ───
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .weight(1f),
                        verticalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        // 1. ACTIVE HEADER CARD (Using dynamic mixture color from dashboard)
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .background(recipeColor)
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
                                        .background(headerBadgeBg)
                                        .padding(horizontal = 8.dp, vertical = 3.dp)
                                ) {
                                    Text(
                                        text = if (isGrinder) "STAGE 1: GRINDER (पिसाई)" else "STAGE 2: MIXER (मिश्रण)",
                                        color = headerBadgeText,
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
                                color = headerTextColor,
                                fontSize = 30.sp,
                                fontWeight = FontWeight.Black,
                                fontFamily = FontFamily.SansSerif
                            )
                            Text(
                                text = "RECIPE FORMULA: ${activeProductNameEnglish.uppercase()}",
                                color = headerSubtextColor,
                                fontSize = 13.sp,
                                fontWeight = FontWeight.Bold,
                                fontFamily = FontFamily.Monospace
                            )

                            Spacer(modifier = Modifier.height(10.dp))
                            Divider(color = headerDividerColor, thickness = 1.dp)
                            Spacer(modifier = Modifier.height(8.dp))

                            // Key Batch Info Badges
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.spacedBy(12.dp)
                            ) {
                                Box(
                                    modifier = Modifier
                                        .background(headerBadgeBg)
                                        .padding(horizontal = 10.dp, vertical = 6.dp)
                                ) {
                                    Text(
                                        text = "कुल मिश्रण वजन: ${totalBatchWeight.toInt()} kg",
                                        color = headerBadgeText,
                                        fontSize = 12.sp,
                                        fontWeight = FontWeight.Bold,
                                        fontFamily = FontFamily.Monospace
                                    )
                                }

                                Box(
                                    modifier = Modifier
                                        .background(headerBadgeBg)
                                        .padding(horizontal = 10.dp, vertical = 6.dp)
                                ) {
                                    Text(
                                        text = "${formulaItems.size} INGREDIENTS / सामग्री",
                                        color = headerBadgeText,
                                        fontSize = 12.sp,
                                        fontWeight = FontWeight.Bold,
                                        fontFamily = FontFamily.Monospace
                                    )
                                }
                            }
                        }

                        // 2. COMPLETE MIXTURE RECIPE INGREDIENT BREAKDOWN
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
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                                ) {
                                    Box(
                                        modifier = Modifier
                                            .size(12.dp)
                                            .background(recipeColor)
                                            .border(1.dp, Color(0xFF1A1A1A))
                                    )
                                    Text(
                                        text = "मिश्रण रेसिपी सामग्री सूची (ALL INGREDIENTS OF MIXTURE):",
                                        fontSize = 13.sp,
                                        fontWeight = FontWeight.Black,
                                        fontFamily = FontFamily.Monospace,
                                        color = Color(0xFF1A1A1A)
                                    )
                                }
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
                                    val isGrindStage = item.isGrinderRaw || item.isPipelineGround
                                    val pct = if (totalBatchWeight > 0) ((item.weightKg / totalBatchWeight) * 100).toInt() else 0
                                    Row(
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .background(Color(0xFFF8FAFC))
                                            .border(
                                                width = 1.5.dp,
                                                color = Color(0xFFE2E8F0)
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
                                                if (isGrindStage) {
                                                    Box(
                                                        modifier = Modifier
                                                            .background(Color(0xFF1E293B))
                                                            .padding(horizontal = 6.dp, vertical = 2.dp)
                                                    ) {
                                                        Text(
                                                            text = if (isGrinder) "STAGE 1 GRIND" else "पाइपलाइन से (STAGE 1)",
                                                            color = Color.White,
                                                            fontSize = 9.sp,
                                                            fontWeight = FontWeight.Black,
                                                            fontFamily = FontFamily.Monospace
                                                        )
                                                    }
                                                }
                                            }
                                            Text(
                                                text = "${item.nameEn} • ${item.dosingType} • $pct%",
                                                fontSize = 11.sp,
                                                fontWeight = FontWeight.Bold,
                                                color = Color(0xFF64748B),
                                                fontFamily = FontFamily.Monospace
                                            )
                                        }

                                        Box(
                                            modifier = Modifier
                                                .background(recipeColor)
                                                .border(1.dp, Color(0xFF1A1A1A).copy(alpha = 0.3f))
                                                .padding(horizontal = 12.dp, vertical = 6.dp)
                                        ) {
                                            Text(
                                                text = "${item.weightKg.toInt()} kg",
                                                fontSize = 16.sp,
                                                fontWeight = FontWeight.Black,
                                                fontFamily = FontFamily.Monospace,
                                                color = headerTextColor
                                            )
                                        }
                                    }
                                }
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(10.dp))

                    // 3. EXECUTION ACTION SLIDER AT BOTTOM (Consistent for both stages)
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
                    .background(recipeColor.copy(alpha = 0.95f))
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
                            color = recipeColor,
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

        // High contrast full-screen break overlay (without ticking clock timer)
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
                        fontSize = 14.sp,
                        fontWeight = FontWeight.Black,
                        fontFamily = FontFamily.Monospace,
                        letterSpacing = 2.sp
                    )
                    Spacer(modifier = Modifier.height(16.dp))
                    Text(
                        text = "मध्यांतर (BREAK IN PROGRESS)",
                        color = Color.White,
                        fontSize = 32.sp,
                        fontWeight = FontWeight.Bold,
                        fontFamily = FontFamily.SansSerif
                    )
                    Spacer(modifier = Modifier.height(28.dp))
                    
                    Button(
                        onClick = { viewModel.endBreak() },
                        shape = RoundedCornerShape(0),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = Color(0xFFFF9800),
                            contentColor = Color.Black
                        ),
                        modifier = Modifier
                            .width(280.dp)
                            .height(56.dp)
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
                            color = recipeColor
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
                        colors = ButtonDefaults.buttonColors(containerColor = recipeColor)
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


