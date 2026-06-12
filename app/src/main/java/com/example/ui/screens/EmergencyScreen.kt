package com.example.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Info
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
import com.example.ui.IndustrialViewModel
import com.example.ui.components.SwipeToConfirmSlider

@Composable
fun EmergencyScreen(
    viewModel: IndustrialViewModel,
    onNavigateBack: () -> Unit
) {
    val selectedIssues by viewModel.selectedIssues.collectAsState()
    val comments by viewModel.commentsText.collectAsState()

    val issueOptions = listOf(
        Pair("मशीन खराब", "Machine Breakdown"),
        Pair("सामग्री की कमी", "Material Shortage"),
        Pair("बिजली की समस्या", "Power Incident"),
        Pair("गुणवत्ता की समस्या", "Quality Issue")
    )

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFFFFFFFF))
            .padding(32.dp),
        verticalArrangement = Arrangement.SpaceBetween
    ) {
        
        // 1. High Alert Red Block Header
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .background(Color(0xFFD32F2F)) // Safety Red
                .border(3.dp, Color(0xFF1A1A1A))
                .padding(24.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    imageVector = Icons.Default.Warning,
                    contentDescription = "Alert",
                    tint = Color.White,
                    modifier = Modifier.size(44.dp)
                )
                Spacer(modifier = Modifier.width(16.dp))
                Column {
                    Text(
                        text = "आपातकालीन रिपोर्ट",
                        color = Color.White,
                        fontSize = 32.sp,
                        fontWeight = FontWeight.Black,
                        fontFamily = FontFamily.SansSerif
                    )
                    Text(
                        text = "EMERGENCY DOWNTIME REPORTING",
                        color = Color.White.copy(alpha = 0.8f),
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Bold,
                        fontFamily = FontFamily.Monospace
                    )
                }
            }

            // High priority text indicator in standard digits
            Text(
                text = "PRIORITY: LEVEL 1",
                color = Color.White,
                fontSize = 14.sp,
                fontWeight = FontWeight.Black,
                fontFamily = FontFamily.Monospace,
                modifier = Modifier
                    .border(1.dp, Color.White)
                    .padding(horizontal = 12.dp, vertical = 6.dp)
            )
        }

        // 2. Main Content Area: 2x2 Issue Grids & Comments Note Form
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .weight(1f)
                .padding(vertical = 24.dp),
            horizontalArrangement = Arrangement.spacedBy(24.dp)
        ) {
            
            // Left Column: 2x2 Issues Selection Grid
            Column(
                modifier = Modifier
                    .weight(0.55f)
                    .fillMaxHeight(),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                Text(
                    text = "समस्या के प्रकार चुनें / SELECT INCIDENT TYPE",
                    color = Color.Black,
                    fontSize = 16.sp,
                    fontWeight = FontWeight.Black
                )

                Column(
                    modifier = Modifier.fillMaxSize(),
                    verticalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    // Iterate and split into 2 rows of 2 columns
                    for (i in 0 until 4 step 2) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .weight(1f),
                            horizontalArrangement = Arrangement.spacedBy(16.dp)
                        ) {
                            for (j in i..i+1) {
                                val (hindiText, englishText) = issueOptions[j]
                                val isActive = selectedIssues.contains(englishText)
                                
                                Box(
                                    modifier = Modifier
                                        .weight(1f)
                                        .fillMaxHeight()
                                        .background(if (isActive) Color(0xFFF4F5F7) else Color.White)
                                        .border(
                                            width = if (isActive) 3.dp else 2.dp,
                                            color = if (isActive) Color(0xFFD32F2F) else Color(0xFF1A1A1A)
                                        )
                                        .clickable { viewModel.toggleIssue(englishText) }
                                ) {
                                    // Safety red handle strip on left edge when clicked
                                    if (isActive) {
                                        Box(
                                            modifier = Modifier
                                                .fillMaxHeight()
                                                .width(10.dp)
                                                .background(Color(0xFFD32F2F))
                                                .align(Alignment.CenterStart)
                                        )
                                    }

                                    Column(
                                        modifier = Modifier
                                            .fillMaxSize()
                                            .padding(24.dp),
                                        verticalArrangement = Arrangement.Center
                                    ) {
                                        Text(
                                            text = hindiText,
                                            fontSize = 22.sp,
                                            fontWeight = FontWeight.Black,
                                            color = if (isActive) Color(0xFFD32F2F) else Color.Black
                                        )
                                        Spacer(modifier = Modifier.height(4.dp))
                                        Text(
                                            text = englishText.uppercase(),
                                            fontSize = 12.sp,
                                            fontWeight = FontWeight.Bold,
                                            color = Color.Gray
                                        )
                                    }
                                }
                            }
                        }
                    }
                }
            }

            // Right Column: Operator Remarks Field & Guidelines
            Column(
                modifier = Modifier
                    .weight(0.45f)
                    .fillMaxHeight(),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                Text(
                    text = "वैकल्पिक टिप्पणी / OPERATION REMARKS",
                    color = Color.Black,
                    fontSize = 16.sp,
                    fontWeight = FontWeight.Black
                )

                // Large clean remarks field (tactile outline, rounded corners minimized)
                OutlinedTextField(
                    value = comments,
                    onValueChange = { viewModel.commentsText.value = it },
                    placeholder = { Text("दोष या घटना के संदर्भ का विवरण यहाँ दर्ज करें (e.g. Broken mechanical heater band)...", color = Color.Gray) },
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedTextColor = Color.Black,
                        unfocusedTextColor = Color.Black,
                        focusedBorderColor = Color(0xFF1A1A1A),
                        unfocusedBorderColor = Color(0xFF1A1A1A),
                        focusedContainerColor = Color.White,
                        unfocusedContainerColor = Color.White
                    ),
                    modifier = Modifier
                        .fillMaxWidth()
                        .weight(1f)
                        .border(2.dp, Color(0xFF1A1A1A)),
                    shape = androidx.compose.ui.graphics.RectangleShape
                )

                // Emergency Operational guidelines box
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .border(1.dp, Color(0xFF1A1A1A).copy(alpha = 0.2f))
                        .background(Color(0xFFF4F5F7))
                        .padding(16.dp),
                    verticalAlignment = Alignment.Top
                ) {
                    Icon(
                        imageVector = Icons.Default.Info,
                        contentDescription = "Guideline info",
                        tint = Color(0xFF2B5BB5),
                        modifier = Modifier.size(20.dp)
                    )
                    Spacer(modifier = Modifier.width(12.dp))
                    Text(
                        text = "Note: Swiping the emergency report automatically flags this equipment kiosk as disabled, signals line engineers, and logs downtime in the database.",
                        fontSize = 11.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = Color.DarkGray,
                        lineHeight = 16.sp
                    )
                }
            }
        }

        // 3. Execution Footer zone: Slider + Cancel Button
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .height(100.dp),
            horizontalArrangement = Arrangement.spacedBy(20.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Button(
                onClick = onNavigateBack,
                shape = androidx.compose.ui.graphics.RectangleShape,
                colors = ButtonDefaults.buttonColors(
                    containerColor = Color.White,
                    contentColor = Color.Black
                ),
                modifier = Modifier
                    .fillMaxHeight()
                    .width(180.dp)
                    .border(2.dp, Color(0xFF1A1A1A))
            ) {
                Text(
                    text = "रद्द करें / CANCEL",
                    fontSize = 16.sp,
                    fontWeight = FontWeight.Black
                )
            }

            // Slider to Submit Red Emergency Stop Downtime Report
            SwipeToConfirmSlider(
                text = "रिपोर्ट भेजने के लिए दाईं ओर स्वाइप करें",
                successText = "आपातकालीन रिपोर्ट भेजी गई / EMERGENCY REPORTED",
                handleColor = Color(0xFFD32F2F),
                modifier = Modifier
                    .weight(1f)
                    .fillMaxHeight(),
                onConfirm = {
                    viewModel.submitEmergencyReport()
                }
            )
        }
    }
}
