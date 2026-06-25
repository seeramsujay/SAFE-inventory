package com.example.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Build
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import com.example.ui.IndustrialViewModel

@Composable
fun LoginScreen(
    viewModel: IndustrialViewModel
) {
    val workerId by viewModel.workerIdInput.collectAsState()
    val pin by viewModel.pinInput.collectAsState()
    val isHelmetChecked by viewModel.isHelmetChecked.collectAsState()
    val isWorkplaceClean by viewModel.isWorkplaceClean.collectAsState()
    val isMachineNormal by viewModel.isMachineNormal.collectAsState()

    val isFormValid = workerId.isNotBlank() && isHelmetChecked && isWorkplaceClean && isMachineNormal

    val context = androidx.compose.ui.platform.LocalContext.current

    @Composable
    fun CredentialsSection(modifier: Modifier) {
        Column(
            modifier = modifier,
            verticalArrangement = Arrangement.SpaceBetween
        ) {
            Column {
                // Kiosk Branding Block
                Row(
                    modifier = Modifier
                        .size(80.dp)
                        .background(Color(0xFF1A1A1A))
                        .border(2.dp, Color(0xFF1A1A1A)),
                    horizontalArrangement = Arrangement.Center,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        imageVector = Icons.Default.Build,
                        contentDescription = "Industrial Logo",
                        tint = Color.White,
                        modifier = Modifier.size(40.dp)
                    )
                }

                Spacer(modifier = Modifier.height(32.dp))

                // Title Translation Headers
                Text(
                    text = "शिफ्ट लॉगिन (QR)",
                    color = Color(0xFF1A1A1A),
                    fontSize = 34.sp,
                    fontWeight = FontWeight.Black,
                    fontFamily = FontFamily.SansSerif,
                    lineHeight = 40.sp
                )
                Text(
                    text = "QR CODE PAIRING SYSTEM",
                    color = Color(0xFF1A1A1A).copy(alpha = 0.6f),
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Bold,
                    fontFamily = FontFamily.SansSerif,
                    letterSpacing = 1.sp
                )

                Spacer(modifier = Modifier.height(40.dp))

                // QR Scan and simulation UI
                Column(verticalArrangement = Arrangement.spacedBy(20.dp)) {
                    Text(
                        text = "क्यूआर कोड स्कैन करें / SCAN PAIRING QR CODE",
                        color = Color(0xFF1A1A1A),
                        fontSize = 15.sp,
                        fontWeight = FontWeight.Black
                    )

                    // QR Scan Viewport box
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(220.dp)
                            .background(Color.Black)
                            .border(3.dp, Color(0xFF1A1A1A)),
                        contentAlignment = Alignment.Center
                    ) {
                        if (workerId.isBlank()) {
                            QRScannerView(
                                onPairingSuccess = { stationId, token, url ->
                                    viewModel.savePairing(stationId, token, url)
                                },
                                modifier = Modifier.fillMaxSize()
                            )
                        } else {
                            Text(
                                text = "✔ QR SCAN SUCCESSFUL\nSTATION: $workerId\nSTATUS: KEY CONNECTED\nSERVER: ${com.example.data.PreferencesManager.getServerUrl(context)}",
                                color = Color(0xFF00875A),
                                fontSize = 13.sp,
                                fontWeight = FontWeight.Bold,
                                fontFamily = FontFamily.Monospace,
                                textAlign = androidx.compose.ui.text.style.TextAlign.Center
                            )
                        }
                    }

                    if (workerId.isBlank()) {
                        Button(
                            onClick = { 
                                viewModel.savePairing("WORKER-QR-9843", "LONG-LIVED-TOKEN", "http://10.0.2.2:3001")
                            },
                            shape = RoundedCornerShape(0),
                            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF1A1A1A)),
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(52.dp)
                                .border(2.dp, Color(0xFF1A1A1A))
                        ) {
                            Text("SIMULATE QR SCAN / क्यूआर स्कैन करें", fontWeight = FontWeight.Bold, color = Color.White)
                        }
                    } else {
                        Button(
                            onClick = { 
                                viewModel.clearPairing()
                            },
                            shape = RoundedCornerShape(0),
                            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFD32F2F)),
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(52.dp)
                                .border(2.dp, Color(0xFF1A1A1A))
                        ) {
                            Text("DISCONNECT / डिस्कनेक्ट करें", fontWeight = FontWeight.Bold, color = Color.White)
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(32.dp))

            // Connection Terminal Code Indicator / Bypass Link
            Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .border(2.dp, Color(0xFF1A1A1A))
                        .background(Color.White)
                        .padding(16.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    Box(
                        modifier = Modifier
                            .size(16.dp)
                            .border(2.dp, Color(0xFF1A1A1A))
                            .background(Color(0xFF00875A)) // Emerald active dot
                    )
                    Text(
                        text = "SYSTEM CONNECTED: ${if (workerId.isBlank()) "PENDING PAIRING" else workerId}",
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Bold,
                        fontFamily = FontFamily.Monospace,
                        color = Color(0xFF1A1A1A)
                    )
                }
            }
        }
    }

    @Composable
    fun SafetySection(modifier: Modifier) {
        Column(
            modifier = modifier,
            verticalArrangement = Arrangement.SpaceBetween
        ) {
            Column {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .border(width = 3.dp, color = Color(0xFF1A1A1A))
                        .padding(bottom = 16.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.Bottom
                ) {
                    Text(
                        text = "सुरक्षा जांच",
                        color = Color(0xFF1A1A1A),
                        fontSize = 32.sp,
                        fontWeight = FontWeight.Black,
                        fontFamily = FontFamily.SansSerif,
                        modifier = Modifier.padding(16.dp)
                    )
                    Text(
                        text = "SAFETY CHECKLIST",
                        color = Color(0xFF1A1A1A).copy(alpha = 0.6f),
                        fontSize = 16.sp,
                        fontWeight = FontWeight.Bold,
                        fontFamily = FontFamily.SansSerif,
                        modifier = Modifier.padding(16.dp)
                    )
                }

                Spacer(modifier = Modifier.height(32.dp))

                // Interactive safety checklist boxes
                Column(verticalArrangement = Arrangement.spacedBy(20.dp)) {
                    SafetyCheckItem(
                        isChecked = isHelmetChecked,
                        text = "सुरक्षा हेलमेट और दस्ताने पहने हुए हैं",
                        subtitle = "Safety Helmet & Gloves Equipped",
                        onCheckedChange = { viewModel.isHelmetChecked.value = it }
                    )
                    SafetyCheckItem(
                        isChecked = isWorkplaceClean,
                        text = "कार्यस्थल साफ है और कचरे से मुक्त है",
                        subtitle = "Workplace Clean & Obstruction Free",
                        onCheckedChange = { viewModel.isWorkplaceClean.value = it }
                    )
                    SafetyCheckItem(
                        isChecked = isMachineNormal,
                        text = "मशीन की स्थिति सामान्य और परिचालन योग्य है",
                        subtitle = "Machine Parameters Normal & Safe",
                        onCheckedChange = { viewModel.isMachineNormal.value = it }
                    )
                }
            }

            Spacer(modifier = Modifier.height(32.dp))

            // Start Shift Primary Button
            Button(
                onClick = { if (isFormValid) viewModel.completeShiftLogin() },
                enabled = isFormValid,
                shape = RoundedCornerShape(0),
                colors = ButtonDefaults.buttonColors(
                    containerColor = Color(0xFF1A1A1A),
                    disabledContainerColor = Color(0xFFD8DADC),
                    contentColor = Color.White,
                    disabledContentColor = Color(0xFF747878)
                ),
                modifier = Modifier
                    .fillMaxWidth()
                    .height(100.dp)
                    .border(
                        width = 3.dp,
                        color = if (isFormValid) Color(0xFF1A1A1A) else Color(0xFF747878)
                    ),
                contentPadding = PaddingValues()
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(horizontal = 32.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column(horizontalAlignment = Alignment.Start) {
                        Text(
                            text = "शिफ्ट शुरू करें",
                            fontSize = 28.sp,
                            fontWeight = FontWeight.Black,
                            fontFamily = FontFamily.SansSerif
                        )
                        Text(
                            text = "START SHIFT",
                            fontSize = 14.sp,
                            fontWeight = FontWeight.Bold,
                            fontFamily = FontFamily.SansSerif
                        )
                    }

                    Box(
                        modifier = Modifier
                            .size(60.dp)
                            .border(3.dp, if (isFormValid) Color.White else Color(0xFF747878)),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            imageVector = Icons.Default.PlayArrow,
                            contentDescription = "Begin Shift",
                            modifier = Modifier.size(36.dp)
                        )
                    }
                }
            }
        }
    }

    BoxWithConstraints(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFFFFFFFF))
    ) {
        val isPortrait = maxWidth < 768.dp
        
        if (isPortrait) {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .verticalScroll(rememberScrollState())
            ) {
                CredentialsSection(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(Color(0xFFF4F5F7))
                        .border(width = 3.dp, color = Color(0xFF1A1A1A))
                        .padding(24.dp)
                )
                SafetySection(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(24.dp)
                )
            }
        } else {
            Row(
                modifier = Modifier.fillMaxSize()
            ) {
                CredentialsSection(
                    modifier = Modifier
                        .fillMaxHeight()
                        .width(440.dp)
                        .background(Color(0xFFF4F5F7))
                        .border(width = 3.dp, color = Color(0xFF1A1A1A))
                        .padding(40.dp)
                )
                SafetySection(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(40.dp)
                )
            }
        }
    }
}

@Composable
fun SafetyCheckItem(
    isChecked: Boolean,
    text: String,
    subtitle: String,
    onCheckedChange: (Boolean) -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .border(2.dp, Color(0xFF1A1A1A))
            .background(if (isChecked) Color(0xFFF4F5F7) else Color.White)
            .clickable { onCheckedChange(!isChecked) }
            .padding(24.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        // Massive check target (48dp+)
        Box(
            modifier = Modifier
                .size(64.dp)
                .border(3.dp, Color(0xFF1A1A1A))
                .background(if (isChecked) Color(0xFF1A1A1A) else Color.White),
            contentAlignment = Alignment.Center
        ) {
            if (isChecked) {
                Icon(
                    imageVector = Icons.Default.Check,
                    contentDescription = "Selected",
                    tint = Color.White,
                    modifier = Modifier.size(36.dp)
                )
            }
        }

        Spacer(modifier = Modifier.width(24.dp))

        Column {
            Text(
                text = text,
                fontSize = 20.sp,
                fontWeight = FontWeight.Black,
                color = Color(0xFF1A1A1A)
            )
            Text(
                text = subtitle,
                fontSize = 13.sp,
                fontWeight = FontWeight.Bold,
                color = Color(0xFF1A1A1A).copy(alpha = 0.5f)
            )
        }
    }
}
