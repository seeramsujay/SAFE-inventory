package com.example.ui.screens

import androidx.compose.animation.*
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
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
import com.example.ui.components.SwipeToConfirmSlider
import kotlinx.coroutines.delay

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

    val cardColor = remember(activeProductColorHex) {
        try {
            Color(android.graphics.Color.parseColor(activeProductColorHex))
        } catch (e: Exception) {
            Color(0xFF00875A)
        }
    }

    var showSuccessFlash by remember { mutableStateOf(false) }

    val formattedTime = remember(remainingSec) {
        val minutes = remainingSec / 60
        val seconds = remainingSec % 60
        // ALWAYS use standard English numbers (Format using standard String formatting)
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
                    .padding(24.dp),
                verticalArrangement = Arrangement.SpaceBetween
            ) {
                Column(verticalArrangement = Arrangement.spacedBy(24.dp)) {
                    // Screen indicator / Mode toggle helper
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = "BATCH TERMINAL",
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold,
                            fontFamily = FontFamily.Monospace,
                            color = Color(0xFF1A1A1A).copy(alpha = 0.6f)
                        )
                        Text(
                            text = batchId,
                            fontSize = 14.sp,
                            fontWeight = FontWeight.Black,
                            fontFamily = FontFamily.Monospace,
                            color = Color(0xFF1A1A1A)
                        )
                    }

                    // Active Industrial Card: Cream Special (Saturated Emerald Green)
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .background(cardColor)
                            .border(3.dp, Color(0xFF1A1A1A))
                            .padding(24.dp)
                    ) {
                        Text(
                            text = activeProductNameHindi,
                            color = Color.White,
                            fontSize = 36.sp,
                            fontWeight = FontWeight.Black,
                            fontFamily = FontFamily.SansSerif
                        )
                        Text(
                            text = "ACTIVE: ${activeProductNameEnglish.uppercase()}",
                            color = Color.White.copy(alpha = 0.8f),
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold,
                            fontFamily = FontFamily.Monospace,
                            modifier = Modifier.padding(top = 4.dp)
                        )

                        Spacer(modifier = Modifier.height(28.dp))

                        // High contrast status bubble (Plain Black / English Numbers)
                        Box(
                            modifier = Modifier
                                .background(Color(0xFF1A1A1A))
                                .border(1.dp, Color.White)
                                .padding(horizontal = 16.dp, vertical = 8.dp)
                        ) {
                            Text(
                                text = "BATCH: $completedBatches / $totalBatches",
                                color = Color.White,
                                fontSize = 18.sp,
                                fontWeight = FontWeight.Black,
                                fontFamily = FontFamily.Monospace
                            )
                        }
                    }

                    // Next Job Card below the active card
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .background(Color.White)
                            .border(3.dp, Color(0xFFE65100)) // Deep Amber/Orange border
                            .padding(20.dp)
                    ) {
                        Text(
                            text = "अगला उत्पाद (NEXT JOB):",
                            color = Color(0xFF1A1A1A).copy(alpha = 0.7f),
                            fontSize = 13.sp,
                            fontWeight = FontWeight.Bold,
                            fontFamily = FontFamily.SansSerif
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            text = "प्रीमियम प्लस",
                            color = Color(0xFFE65100),
                            fontSize = 24.sp,
                            fontWeight = FontWeight.Black,
                            fontFamily = FontFamily.SansSerif
                        )
                    }

                    // View Extruder details button to toggle to Extruder diagram screen
                    Button(
                        onClick = onNavigateToExtruder,
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
                            text = "मशीन स्थिति / VIEW DIAGRAM →",
                            fontSize = 13.sp,
                            fontWeight = FontWeight.Black
                        )
                    }
                }

                // Context Menu Actions (Emergency Stop)
                Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {

                    Button(
                        onClick = onNavigateToEmergency,
                        shape = RoundedCornerShape(0),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = Color(0xFFD32F2F), // Safety Red
                            contentColor = Color.White
                        ),
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(64.dp)
                            .border(2.dp, Color(0xFF1A1A1A))
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.Center
                        ) {
                            Icon(Icons.Default.Warning, "Emergency stop button", modifier = Modifier.size(24.dp))
                            Spacer(modifier = Modifier.width(12.dp))
                            Text(
                                text = "EMERGENCY / आपातकालीन",
                                fontSize = 16.sp,
                                fontWeight = FontWeight.Bold,
                                fontFamily = FontFamily.SansSerif
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
                    .padding(32.dp),
                verticalArrangement = Arrangement.SpaceBetween,
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                // Central Status Instruction Messages
                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    modifier = Modifier.padding(top = 16.dp)
                ) {
                    Text(
                        text = "वर्तमान बैच चल रहा है...",
                        color = Color.Black,
                        fontSize = 28.sp,
                        fontWeight = FontWeight.Black,
                        textAlign = TextAlign.Center
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        text = "पूरा होने पर दाईं ओर स्वाइप करें।",
                        color = Color(0xFF1A1A1A).copy(alpha = 0.7f),
                        fontSize = 18.sp,
                        fontWeight = FontWeight.Bold,
                        textAlign = TextAlign.Center
                    )
                }

                // Dynamic Progress Countdown Ticker Ring (MM:SS)
                Box(
                    modifier = Modifier.size(260.dp),
                    contentAlignment = Alignment.Center
                ) {
                    // Custom Draw Canvas Progress Arc (Brutalist thick stroke)
                    val progressRatio = (remainingSec.toFloat() / 480f).coerceIn(0f, 1f)
                    Canvas(modifier = Modifier.fillMaxSize()) {
                        drawCircle(
                            color = Color.White,
                            radius = size.minDimension / 2 - 8.dp.toPx()
                        )
                        // Background track arc
                        drawArc(
                            color = Color(0xFFD8DADC),
                            startAngle = 0f,
                            sweepAngle = 360f,
                            useCenter = false,
                            style = Stroke(width = 16.dp.toPx(), cap = StrokeCap.Butt)
                        )
                        // Progress arc
                        drawArc(
                            color = Color(0xFF1A1A1A),
                            startAngle = -90f,
                            sweepAngle = 360f * progressRatio,
                            useCenter = false,
                            style = Stroke(width = 16.dp.toPx(), cap = StrokeCap.Butt)
                        )
                    }

                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text(
                            text = formattedTime,
                            color = Color.Black,
                            fontSize = 58.sp,
                            fontWeight = FontWeight.Black,
                            fontFamily = FontFamily.Monospace,
                            letterSpacing = (-1).sp
                        )
                        Text(
                            text = "समय शेष (REMAINING)",
                            color = Color(0xFF1A1A1A).copy(alpha = 0.6f),
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold
                        )
                    }
                }

                // Swipe-To-Confirm completion slider track
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
                            .size(120.dp)
                            .background(Color.White)
                            .border(4.dp, Color(0xFF1A1A1A)),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = "✔",
                            color = Color(0xFF00875A),
                            fontSize = 72.sp,
                            fontWeight = FontWeight.Black
                        )
                    }
                    Spacer(modifier = Modifier.height(24.dp))
                    Text(
                        text = "बैच दर्ज किया गया!",
                        color = Color.White,
                        fontSize = 42.sp,
                        fontWeight = FontWeight.Black,
                        fontFamily = FontFamily.SansSerif
                    )
                    Text(
                        text = "BATCH REGISTERED SUCCESSFULLY!",
                        color = Color.White.copy(alpha = 0.8f),
                        fontSize = 16.sp,
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
    }
}
