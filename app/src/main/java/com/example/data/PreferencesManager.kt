package com.example.data

import android.content.Context
import android.content.SharedPreferences
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKeys

object PreferencesManager {
    private const val PREFS_NAME = "nexus_secure_prefs"
    private const val KEY_SERVER_URL = "server_url"
    private const val KEY_STATION_TOKEN = "station_token"
    private const val KEY_STATION_ID = "station_id"

    private fun getSharedPrefs(context: Context): SharedPreferences {
        return try {
            val masterKeyAlias = MasterKeys.getOrCreate(MasterKeys.AES256_GCM_SPEC)
            EncryptedSharedPreferences.create(
                PREFS_NAME,
                masterKeyAlias,
                context,
                EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
                EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
            )
        } catch (e: Exception) {
            context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        }
    }

    fun savePairing(context: Context, serverUrl: String, token: String, stationId: String) {
        val prefs = getSharedPrefs(context)
        prefs.edit().apply {
            putString(KEY_SERVER_URL, serverUrl)
            putString(KEY_STATION_TOKEN, token)
            putString(KEY_STATION_ID, stationId)
            apply()
        }
    }

    fun getServerUrl(context: Context): String {
        return getSharedPrefs(context).getString(KEY_SERVER_URL, "") ?: ""
    }

    fun getStationToken(context: Context): String {
        return getSharedPrefs(context).getString(KEY_STATION_TOKEN, "") ?: ""
    }

    fun getStationId(context: Context): String {
        return getSharedPrefs(context).getString(KEY_STATION_ID, "") ?: ""
    }

    fun isPaired(context: Context): Boolean {
        return getStationToken(context).isNotBlank() && getServerUrl(context).isNotBlank()
    }

    fun clearPairing(context: Context) {
        getSharedPrefs(context).edit().clear().apply()
    }
}
