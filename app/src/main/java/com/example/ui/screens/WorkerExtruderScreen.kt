package com.example.ui.screens

import androidx.compose.animation.*
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Build
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.ui.IndustrialViewModel
import com.example.ui.components.SwipeToConfirmSlider
import kotlinx.coroutines.delay

@Composable
fun WorkerExtruderScreen(
    viewModel: IndustrialViewModel,
    onNavigateToTimer: () -> Unit,
    onNavigateToEmergency: () -> Unit
) {
    val batchId by viewModel.batchId.collectAsState()
    val completedBatches by viewModel.activeBatchCountCompleted.collectAsState()
    val totalBatches by viewModel.activeBatchCountTotal.collectAsState()
    val temperature by viewModel.currentTemperature.collectAsState()
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

    var showReadingFlash by remember { mutableStateOf(false) }

    Row(modifier = Modifier.fillMaxSize()) {
        
        // LEFT PANEL (35% Width)
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
                // Header meta info
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "DIAGNOSTICS KIOSK",
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

                // Active Card: Cream Special
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

                // Machine Status metrics block
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(Color.White)
                        .border(3.dp, Color(0xFF1A1A1A))
                        .padding(16.dp)
                ) {
                    Text(
                        text = "मशीन की स्थिति / MACHINERY STATUS",
                        fontSize = 11.sp,
                        color = Color.Gray,
                        fontWeight = FontWeight.Black
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = "RUNNING OPTIMAL",
                            fontSize = 18.sp,
                            fontWeight = FontWeight.Black,
                            color = Color(0xFF00875A)
                        )
                        Box(
                            modifier = Modifier
                                .size(14.dp)
                                .background(Color(0xFF00875A))
                        )
                    }
                }

                // Toggle back to main recipe view button
                Button(
                    onClick = onNavigateToTimer,
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
                        text = "← मुख्य रेसिपी देखें / VIEW RECIPE",
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Black
                    )
                }
            }

            // Bottom controls: Emergency Red STOP button
            Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {

                Button(
                    onClick = onNavigateToEmergency,
                    shape = RoundedCornerShape(0),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = Color(0xFFD32F2F),
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
                        Icon(Icons.Default.Warning, "Emergency Alert", modifier = Modifier.size(24.dp))
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
        
        // RIGHT PANEL: Technical Diagram / Schematic view (65% Width)
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
            // High visibility direction bar in warning orange/amber
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(Color(0xFFFFE0B2)) // Amber background tint
                    .border(3.dp, Color(0xFFE65100))
                    .padding(16.dp)
            ) {
                Text(
                    text = "तापमान १८०°C पर रखें — नियमित जांच आवश्यक",
                    color = Color(0xFFE65100),
                    fontSize = 20.sp,
                    fontWeight = FontWeight.Black,
                    textAlign = TextAlign.Center,
                    modifier = Modifier.fillMaxWidth()
                )
                Text(
                    text = "TARGET: 180°C — SYSTEM TEMPERATURE MAINTENANCE",
                    color = Color(0xFFE65100).copy(alpha = 0.8f),
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Bold,
                    textAlign = TextAlign.Center,
                    modifier = Modifier.fillMaxWidth()
                )
            }

            // Schematic Technical Drawing Box
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .weight(0.6f)
                    .padding(vertical = 24.dp)
                    .background(Color.White)
                    .border(3.dp, Color(0xFF1A1A1A))
                    .padding(16.dp),
                contentAlignment = Alignment.Center
            ) {
                // Custom drawn schematic lines representing an assembly line machine extruder
                Canvas(modifier = Modifier.fillMaxSize()) {
                    val w = size.width
                    val h = size.height

                    // Horizontal center extrusion cylinder line
                    drawRect(
                        color = Color(0xFF1A1A1A),
                        topLeft = Offset(w * 0.15f, h * 0.35f),
                        size = Size(w * 0.6f, h * 0.3f),
                        style = Stroke(width = 3.dp.toPx())
                    )

                    // Funnel hopper loader at left top
                    drawRect(
                        color = Color(0xFF1A1A1A),
                        topLeft = Offset(w * 0.22f, h * 0.12f),
                        size = Size(w * 0.12f, h * 0.23f),
                        style = Stroke(width = 3.dp.toPx())
                    )

                    // Die discharge mouth at right
                    drawRect(
                        color = Color(0xFF1A1A1A),
                        topLeft = Offset(w * 0.75f, h * 0.42f),
                        size = Size(w * 0.1f, h * 0.16f),
                        style = Stroke(width = 3.dp.toPx())
                    )

                    // Inner screw spiral threads
                    var xPos = w * 0.18f
                    while (xPos < w * 0.72f) {
                        drawLine(
                            color = Color(0xFF1A1A1A).copy(alpha = 0.3f),
                            start = Offset(xPos, h * 0.37f),
                            end = Offset(xPos + 20.dp.toPx(), h * 0.63f),
                            strokeWidth = 3.dp.toPx()
                        )
                        xPos += 30.dp.toPx()
                    }
                }

                // Absolute labels overlaying the extruder segments
                // Left Label: Hopper
                Box(
                    modifier = Modifier
                        .align(Alignment.TopCenter)
                        .offset(x = (-160).dp, y = 10.dp)
                        .background(Color(0xFF1A1A1A))
                        .border(1.dp, Color.White)
                        .padding(horizontal = 10.dp, vertical = 4.dp)
                ) {
                    Text("वैकल्पिक फीडर (HOPPER)", color = Color.White, fontSize = 10.sp, fontWeight = FontWeight.Bold)
                }

                // Middle Label: Extruder screw barrel
                Box(
                    modifier = Modifier
                        .align(Alignment.BottomCenter)
                        .offset(x = (-100).dp, y = (-20).dp)
                        .background(Color(0xFF1A1A1A))
                        .border(1.dp, Color.White)
                        .padding(horizontal = 10.dp, vertical = 4.dp)
                ) {
                    Text("हीटिंग बैरल (HEATING BARREL)", color = Color.White, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                }

                // Right Label: Processing nozzle nose
                Box(
                    modifier = Modifier
                        .align(Alignment.BottomCenter)
                        .offset(x = 180.dp, y = (-50).dp)
                        .background(Color(0xFF1A1A1A))
                        .border(1.dp, Color.White)
                        .padding(horizontal = 10.dp, vertical = 4.dp)
                ) {
                    Text("डाई हेड (DIE HEAD)", color = Color.White, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                }

                // Central sensor temperature readout module
                Column(
                    modifier = Modifier
                        .align(Alignment.Center)
                        .offset(x = 60.dp, y = 0.dp)
                        .background(Color.White)
                        .border(3.dp, Color(0xFF1A1A1A))
                        .padding(horizontal = 24.dp, vertical = 12.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Text(
                        text = "$temperature°C",
                        color = if (temperature in 177..179) Color(0xFF00875A) else Color(0xFFE65100),
                        fontSize = 44.sp,
                        fontWeight = FontWeight.Black,
                        fontFamily = FontFamily.Monospace
                    )
                    Text(
                        text = "सेंसर तापमान / TEMP SENSOR",
                        color = Color.Black.copy(alpha = 0.6f),
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold
                    )
                }
            }

            // Swipe to confirm reading slider track
            SwipeToConfirmSlider(
                text = "तापमान सही होने की पुष्टि के लिए स्वाइप करें",
                successText = "तापमान प्रमाणित / TEMP READING CONFIRMED",
                trackColor = Color.White,
                handleColor = Color(0xFF2B5BB5), // Cool Cobalt Blue for verification signatures
                onConfirm = {
                    showReadingFlash = true
                }
            )
        }
    }

    // Secondary successful flash overlay for Extruder confirm actions
    if (showReadingFlash) {
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
                        .size(110.dp)
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
                Spacer(modifier = Modifier.height(24.dp))
                Text(
                    text = "तापमान की पुष्टि हो गई!",
                    color = Color.White,
                    fontSize = 38.sp,
                    fontWeight = FontWeight.Black,
                    fontFamily = FontFamily.SansSerif
                )
                Text(
                    text = "DIAGNOSTICS SPECIFICATIONS LOGGED",
                    color = Color.White.copy(alpha = 0.8f),
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Bold,
                    fontFamily = FontFamily.Monospace,
                    modifier = Modifier.padding(top = 8.dp)
                )
            }
        }

        LaunchedEffect(showReadingFlash) {
            delay(1500)
            showReadingFlash = false
        }
    }
}
