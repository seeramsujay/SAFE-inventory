package com.example.ui.components

import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.spring
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.gestures.Orientation
import androidx.compose.foundation.gestures.draggable
import androidx.compose.foundation.gestures.rememberDraggableState
import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowForward
import androidx.compose.material.icons.filled.Check
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.onSizeChanged
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.launch
import kotlin.math.roundToInt

@Composable
fun SwipeToConfirmSlider(
    modifier: Modifier = Modifier,
    text: String,
    successText: String = "READING CONFIRMED",
    isConfirmed: Boolean = false,
    trackColor: Color = Color(0xFFF4F5F7),
    handleColor: Color = Color(0xFFD32F2F), // Safety Red
    onConfirm: () -> Unit
) {
    val coroutineScope = rememberCoroutineScope()
    var width by remember { mutableStateOf(0) }
    var handleWidth by remember { mutableStateOf(0) }
    val maxOffset = remember(width, handleWidth) {
        (width - handleWidth).coerceAtLeast(0).toFloat()
    }

    var dragOffsetRaw by remember { mutableStateOf(0f) }
    val dragOffset = remember { Animatable(0f) }

    LaunchedEffect(isConfirmed, maxOffset) {
        if (!isConfirmed) {
            dragOffset.snapTo(0f)
            dragOffsetRaw = 0f
        } else if (maxOffset > 0f) {
            dragOffset.snapTo(maxOffset)
            dragOffsetRaw = maxOffset
        }
    }

    val density = LocalDensity.current

    Box(
        modifier = modifier
            .fillMaxWidth()
            .height(84.dp)
            .onSizeChanged { width = it.width }
            .background(if (isConfirmed) Color(0xFF00875A) else trackColor)
            .border(3.dp, Color(0xFF1A1A1A))
            .padding(2.dp),
        contentAlignment = Alignment.CenterStart
    ) {
        // Track watermark/background text in English characters (to fulfill the numbers and standard legibility rules)
        if (!isConfirmed) {
            Box(
                modifier = Modifier.fillMaxSize(),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = text,
                    color = Color(0xFF1A1A1A).copy(alpha = 0.5f),
                    fontSize = 16.sp,
                    fontWeight = FontWeight.Bold,
                    textAlign = TextAlign.Center,
                    modifier = Modifier.padding(horizontal = 64.dp)
                )
            }
        } else {
            Box(
                modifier = Modifier.fillMaxSize(),
                contentAlignment = Alignment.Center
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.Center
                ) {
                    Icon(
                        imageVector = Icons.Default.Check,
                        contentDescription = "Success",
                        tint = Color.White,
                        modifier = Modifier.size(28.dp)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = successText,
                        color = Color.White,
                        fontSize = 18.sp,
                        fontWeight = FontWeight.Bold,
                        textAlign = TextAlign.Center
                    )
                }
            }
        }

        // Draggable Swipe Handle
        if (!isConfirmed) {
            val draggableState = rememberDraggableState { delta ->
                dragOffsetRaw = (dragOffsetRaw + delta).coerceIn(0f, maxOffset)
            }

            Box(
                modifier = Modifier
                    .offset { IntOffset(dragOffsetRaw.roundToInt(), 0) }
                    .onSizeChanged { handleWidth = it.width }
                    .fillMaxHeight()
                    .width(100.dp)
                    .background(handleColor)
                    .border(2.dp, Color(0xFF1A1A1A))
                    .draggable(
                        state = draggableState,
                        orientation = Orientation.Horizontal,
                        onDragStopped = { velocity ->
                            coroutineScope.launch {
                                dragOffset.snapTo(dragOffsetRaw)
                                if (dragOffsetRaw >= maxOffset * 0.9f) {
                                    dragOffset.animateTo(maxOffset, spring(dampingRatio = 0.85f)) {
                                        dragOffsetRaw = this.value
                                    }
                                    onConfirm()
                                } else {
                                    dragOffset.animateTo(0f, spring(dampingRatio = 0.75f)) {
                                        dragOffsetRaw = this.value
                                    }
                                }
                            }
                        }
                    ),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = Icons.Default.ArrowForward,
                    contentDescription = "Swipe Arrow",
                    tint = Color.White,
                    modifier = Modifier.size(36.dp)
                )
            }
        }
    }
}
