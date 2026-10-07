import SwiftUI

public struct AdminOverviewView: View {
    @ObservedObject var viewModel: AdminViewModel
    
    public init(viewModel: AdminViewModel) {
        self.viewModel = viewModel
    }
    
    public var body: some View {
        ZStack {
            Color(red: 0.07, green: 0.09, blue: 0.13)
                .ignoresSafeArea()
            
            ScrollView {
                VStack(spacing: 20) {
                    // Plant Header
                    HStack {
                        VStack(alignment: .leading, spacing: 2) {
                            Text("INDUSTRIAL NEXUS")
                                .font(.system(size: 22, weight: .black, design: .monospaced))
                                .foregroundColor(.cyan)
                            Text("Plant Manager & Admin Portal")
                                .font(.caption)
                                .foregroundColor(.gray)
                        }
                        Spacer()
                        
                        HStack(spacing: 6) {
                            Circle()
                                .fill(viewModel.isOnline ? Color.green : Color.red)
                                .frame(width: 8, height: 8)
                            Text(viewModel.isOnline ? "ONLINE" : "OFFLINE")
                                .font(.system(size: 11, weight: .bold, design: .monospaced))
                                .foregroundColor(viewModel.isOnline ? .green : .red)
                        }
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(Color.white.opacity(0.05))
                        .cornerRadius(6)
                    }
                    .padding(.horizontal)
                    .padding(.top, 10)
                    
                    // High-Level Plant KPI Grid
                    VStack(alignment: .leading, spacing: 12) {
                        Text("PLANT PERFORMANCE METRICS")
                            .font(.system(size: 12, weight: .bold, design: .monospaced))
                            .foregroundColor(.gray)
                        
                        LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
                            kpiCard(title: "Units Produced", value: "\(viewModel.totalUnitsToday) kg", subtitle: "Shift Total", color: .cyan)
                            kpiCard(title: "Batches Completed", value: "\(viewModel.totalBatchesToday)", subtitle: "All Lines", color: .green)
                            kpiCard(title: "Overall Yield", value: String(format: "%.1f %%", viewModel.plantYieldRate), subtitle: "Optimal > 95%", color: .orange)
                            kpiCard(title: "Active Orders", value: "\(viewModel.orders.filter { $0.status == "In Progress" || $0.status == "Pending" }.count)", subtitle: "In Queue", color: .purple)
                        }
                    }
                    .padding()
                    .background(Color(red: 0.12, green: 0.14, blue: 0.2))
                    .cornerRadius(12)
                    .padding(.horizontal)
                    
                    // Live Factory Station Status
                    VStack(alignment: .leading, spacing: 12) {
                        HStack {
                            Text("FACTORY FLOOR STATIONS")
                                .font(.system(size: 12, weight: .bold, design: .monospaced))
                                .foregroundColor(.gray)
                            Spacer()
                            Text("Real-Time Telemetry")
                                .font(.caption2)
                                .foregroundColor(.gray)
                        }
                        
                        ForEach(viewModel.stations) { st in
                            HStack {
                                VStack(alignment: .leading, spacing: 2) {
                                    Text(st.stationId)
                                        .font(.system(size: 14, weight: .bold, design: .monospaced))
                                        .foregroundColor(.white)
                                    Text("Operator: \(st.activeOperator ?? "Unassigned") • \(st.stationType.capitalized)")
                                        .font(.caption2)
                                        .foregroundColor(.gray)
                                }
                                Spacer()
                                
                                Text(st.isOnBreak ? "ON BREAK" : "ACTIVE")
                                    .font(.system(size: 10, weight: .bold, design: .monospaced))
                                    .padding(.horizontal, 8)
                                    .padding(.vertical, 4)
                                    .background(st.isOnBreak ? Color.yellow.opacity(0.2) : Color.green.opacity(0.2))
                                    .foregroundColor(st.isOnBreak ? .yellow : .green)
                                    .cornerRadius(6)
                            }
                            .padding(.vertical, 6)
                            Divider().background(Color.white.opacity(0.1))
                        }
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
    
    private func kpiCard(title: String, value: String, subtitle: String, color: Color) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(title)
                .font(.caption2)
                .foregroundColor(.gray)
            Text(value)
                .font(.system(size: 20, weight: .black, design: .monospaced))
                .foregroundColor(color)
            Text(subtitle)
                .font(.system(size: 10))
                .foregroundColor(.gray)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(12)
        .background(Color.black.opacity(0.3))
        .cornerRadius(8)
    }
}
