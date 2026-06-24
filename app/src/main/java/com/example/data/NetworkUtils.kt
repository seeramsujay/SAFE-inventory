package com.example.data

import okhttp3.Interceptor
import okhttp3.OkHttpClient
import okhttp3.Response
import java.security.SecureRandom
import java.security.cert.X509Certificate
import java.util.concurrent.TimeUnit
import javax.net.ssl.SSLContext
import javax.net.ssl.TrustManager
import javax.net.ssl.X509TrustManager

/**
 * Utility object that provides a robust OkHttpClient configuration for the Industrial Nexus system.
 * Highly commented to ensure extreme clarity for production diagnostics and connectivity stability.
 */
object NetworkUtils {
    
    /**
     * Creates and returns an OkHttpClient configured for industrial tunnel connectivity:
     * 1. Bypasses SSL certificate checks (critical when connecting via temporary local/dynamic tunnels).
     * 2. Automatically injects the 'Bypass-Tunnel-Reminder: true' header to bypass localtunnel reminder pages.
     * 3. Configures custom timeouts for connection stability on the factory floor.
     */
    fun getOkHttpClient(): OkHttpClient {
        try {
            // Create a trust manager that does not validate certificate chains
            // This is required because temporary development tunnels (e.g. localtunnel) often
            // serve dynamic subdomains with self-signed or unverified SSL certificates,
            // which otherwise trigger trust anchor or cert path validation failures in OkHttp.
            val trustAllCerts = arrayOf<TrustManager>(
                object : X509TrustManager {
                    override fun checkClientTrusted(chain: Array<out X509Certificate>?, authType: String?) {}
                    override fun checkServerTrusted(chain: Array<out X509Certificate>?, authType: String?) {}
                    override fun getAcceptedIssuers(): Array<X509Certificate> = arrayOf()
                }
            )

            // Initialize the SSLContext with our trust-all trust manager
            val sslContext = SSLContext.getInstance("SSL")
            sslContext.init(null, trustAllCerts, SecureRandom())
            val sslSocketFactory = sslContext.socketFactory

            return OkHttpClient.Builder()
                // Apply the permissive SSL socket factory and trust manager
                .sslSocketFactory(sslSocketFactory, trustAllCerts[0] as X509TrustManager)
                // Relax hostname verification to trust all hostnames (e.g. *.loca.lt, *.ngrok-free.app, etc.)
                .hostnameVerifier { _, _ -> true }
                // Set production-grade timeouts for factory-floor connectivity stability
                .connectTimeout(15, TimeUnit.SECONDS)
                .readTimeout(20, TimeUnit.SECONDS)
                .writeTimeout(20, TimeUnit.SECONDS)
                // Add interceptor to automatically add the bypass header for local tunnels
                .addInterceptor(object : Interceptor {
                    override fun intercept(chain: Interceptor.Chain): Response {
                        val originalRequest = chain.request()
                        val newRequest = originalRequest.newBuilder()
                            // Tunnel services (localtunnel, ngrok, serveo) serve warning pages to check for phishing abuse.
                            // Adding these headers bypasses those warning/interstitial pages and returns direct API JSON.
                            .header("Bypass-Tunnel-Reminder", "true")
                            .header("ngrok-skip-browser-warning", "true")
                            .header("serveo-skip-browser-warning", "true")
                            .build()
                        return chain.proceed(newRequest)
                    }
                })
                .build()
        } catch (e: Exception) {
            // In case of any cryptographic exception, fall back to a standard OkHttpClient configuration
            return OkHttpClient.Builder()
                .connectTimeout(15, TimeUnit.SECONDS)
                .readTimeout(20, TimeUnit.SECONDS)
                .writeTimeout(20, TimeUnit.SECONDS)
                .build()
        }
    }
}
