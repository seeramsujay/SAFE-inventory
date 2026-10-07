import SwiftUI

public struct WorkerExtruderView: View {
    @ObservedObject var viewModel: WorkerViewModel
    
    public init(viewModel: WorkerViewModel) {
        self.viewModel = viewModel
    }
    
    public var body: some View {
        ZStack {
            Color(red: 0.07, green: 0.09, blue: 0.13)
                .ignoresSafeArea()
            
            ScrollView {
                VStack(spacing: 20) {
                    // Header
                    HStack {
                        VStack(alignment: .leading, spacing: 2) {
                            Text("EXTRUDER TELEMETRY")
                                .font(.system(size: 20, weight: .black, design: .monospaced))
                                .foregroundColor(.cyan)
                            Text("Real-Time PLC Diagnostic Feed")
                                .font(.caption)
                                .foregroundColor(.gray)
                        }
                        Spacer()
                        
                        HStack(spacing: 6) {
                            Circle()
                                .fill(Color.green)
                                .frame(width: 8, height: 8)
                            Text("PLC ONLINE")
                                .font(.system(size: 11, weight: .bold, design: .monospaced))
                                .foregroundColor(.green)
                        }
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(Color.green.opacity(0.1))
                        .cornerRadius(6)
                    }
                    .padding(.horizontal)
                    .padding(.top, 10)
                    
                    // Temperature Zones Grid
                    VStack(alignment: .leading, spacing: 12) {
                        Text("BARREL TEMPERATURE ZONES (°C)")
                            .font(.system(size: 12, weight: .bold, design: .monospaced))
                            .foregroundColor(.gray)
                        
                        LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
                            metricCard(
                                title: "Zone 1 (Feed)",
                                value: String(format: "%.1f°C", viewModel.telemetry.zone1Temp),
                                target: "185.0°C Target",
                                isNormal: abs(viewModel.telemetry.zone1Temp - 185.0) < 15,
                                color: .orange
                            )
                            
                            metricCard(
                                title: "Zone 2 (Compression)",
                                value: String(format: "%.1f°C", viewModel.telemetry.zone2Temp),
                                target: "195.0°C Target",
                                isNormal: abs(viewModel.telemetry.zone2Temp - 195.0) < 15,
                                color: .orange
                            )
                            
                            metricCard(
                                title: "Zone 3 (Metering)",
                                value: String(format: "%.1f°C", viewModel.telemetry.zone3Temp),
                                target: "205.0°C Target",
                                isNormal: abs(viewModel.telemetry.zone3Temp - 205.0) < 15,
                                color: .orange
                            )
                            
                            metricCard(
                                title: "Die Head",
                                value: String(format: "%.1f°C", viewModel.telemetry.dieHeadTemp),
                                target: "210.0°C Target",
                                isNormal: abs(viewModel.telemetry.dieHeadTemp - 210.0) < 15,
                                color: .red
                            )
                        }
                    }
                    .padding()
                    .background(Color(red: 0.12, green: 0.14, blue: 0.2))
                    .cornerRadius(12)
                    .padding(.horizontal)
                    
                    // Mechanical & Drive Metrics
                    VStack(alignment: .leading, spacing: 12) {
                        Text("DRIVE & PRESSURE METRICS")
                            .font(.system(size: 12, weight: .bold, design: .monospaced))
                            .foregroundColor(.gray)
                        
                        LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
                            metricCard(
                                title: "Melt Pressure",
                                value: String(format: "%.1f bar", viewModel.telemetry.meltPressureBar),
                                target: "140 - 155 bar",
                                isNormal: viewModel.telemetry.meltPressureBar < 170,
                                color: .cyan
                            )
                            
                            metricCard(
                                title: "Screw Motor",
                                value: String(format: "%.0f RPM", viewModel.telemetry.motorRpm),
                                target: "1200 - 1300 RPM",
                                isNormal: true,
                                color: .cyan
                            )
                            
                            metricCard(
                                title: "Feed Rate",
                                value: String(format: "%.0f kg/h", viewModel.telemetry.feedRateKgH),
                                target: "Nominal 450",
                                isNormal: true,
                                color: .green
                            )
                            
                            metricCard(
                                title: "Moisture Content",
                                value: String(format: "%.1f %%", viewModel.telemetry.moisturePercent),
                                target: "< 12.0 % Max",
                                isNormal: viewModel.telemetry.moisturePercent < 12.5,
                                color: .blue
                            )
                        }
                    }
                    .padding()
                    .background(Color(red: 0.12, green: 0.14, blue: 0.2))
                    .cornerRadius(12)
                    .padding(.horizontal)
                    
                    // Scrap Rate Gauge
                    HStack {
                        VStack(alignment: .leading, spacing: 4) {
                            Text("Current Shift Scrap Rate")
                                .font(.system(size: 12, weight: .bold, design: .monospaced))
                                .foregroundColor(.gray)
                            Text(String(format: "%.2f %%", viewModel.telemetry.scrapRatePercent))
                                .font(.system(size: 24, weight: .black, design: .monospaced))
                                .foregroundColor(viewModel.telemetry.scrapRatePercent < 2.0 ? .green : .red)
                        }
                        Spacer()
                        
                        Text(viewModel.telemetry.scrapRatePercent < 2.0 ? "OPTIMAL YIELD" : "REWORK HIGH")
                            .font(.system(size: 11, weight: .bold, design: .monospaced))
                            .padding(.horizontal, 10)
                            .padding(.vertical, 6)
                            .background(viewModel.telemetry.scrapRatePercent < 2.0 ? Color.green.opacity(0.2) : Color.red.opacity(0.2))
                            .foregroundColor(viewModel.telemetry.scrapRatePercent < 2.0 ? .green : .red)
                            .cornerRadius(6)
                    }
                    .padding()
                    .background(Color(red: 0.12, green: 0.14, blue: 0.2))
                    .cornerRadius(12)
                    .padding(.horizontal)
                    .padding(.bottom, 24)
                }
            }
        }
    }
    
    private func metricCard(title: String, value: String, target: String, isNormal: Bool, color: Color) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(title)
                .font(.caption2)
                .foregroundColor(.gray)
            
            Text(value)
                .font(.system(size: 18, weight: .black, design: .monospaced))
                .foregroundColor(.white)
            
            HStack(spacing: 4) {
                Circle()
                    .fill(isNormal ? Color.green : Color.red)
                    .frame(width: 6, height: 6)
                Text(target)
                    .font(.system(size: 10))
                    .foregroundColor(.gray)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(12)
        .background(Color.black.opacity(0.3))
        .cornerRadius(8)
    }
}
