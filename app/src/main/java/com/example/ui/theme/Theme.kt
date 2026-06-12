package com.example.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable

private val IndustrialColorScheme = lightColorScheme(
    primary = PrimaryColor,
    onPrimary = OnPrimaryColor,
    secondary = SecondaryColor,
    onSecondary = CanvasWhite,
    background = BackgroundColor,
    onBackground = StarkCharcoal,
    surface = SurfaceColor,
    onSurface = PitchBlack,
    error = SafetyRed,
    onError = CanvasWhite
)

@Composable
fun MyApplicationTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit
) {
    // We enforce light theme to avoid washing out under glares on the production floor
    MaterialTheme(
        colorScheme = IndustrialColorScheme,
        typography = Typography,
        content = content
    )
}
