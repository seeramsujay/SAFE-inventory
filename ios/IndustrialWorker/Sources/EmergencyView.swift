import SwiftUI

public struct EmergencyView: View {
    @ObservedObject var viewModel: WorkerViewModel
    @State private var selectedHazard: String = "Mechanical"
    @State private var selectedSeverity: String = "Critical"
    @State private var incidentNotes: String = ""
    @State private var isSubmitting: Bool = false
    @State private var submittedAlert: Bool = false
    
    private let hazards = ["Mechanical", "Electrical", "Chemical", "Fire", "Spill", "Injury"]
    private let severities = ["Low", "Medium", "High", "Critical"]
    
    public init(viewModel: WorkerViewModel) {
        self.viewModel = viewModel
    }
    
    public var body: some View {
        ZStack {
            Color(red: 0.07, green: 0.09, blue: 0.13)
                .ignoresSafeArea()
            
            ScrollView {
                VStack(spacing: 24) {
                    // Header Banner
                    HStack {
                        Image(systemName: "exclamationmark.octagon.fill")
                            .font(.system(size: 28))
                            .foregroundColor(.red)
                        VStack(alignment: .leading, spacing: 2) {
                            Text("EMERGENCY RESPONSE PORTAL")
                                .font(.system(size: 18, weight: .black, design: .monospaced))
                                .foregroundColor(.red)
                            Text("Station Incident & E-Stop Broadcast")
                                .font(.caption)
                                .foregroundColor(.gray)
                        }
                        Spacer()
                    }
                    .padding(.horizontal)
                    .padding(.top, 10)
                    
                    // Giant E-Stop Button
                    Button(action: {
                        triggerInstantEStop()
                    }) {
                        ZStack {
                            Circle()
                                .fill(
                                    RadialGradient(
                                        gradient: Gradient(colors: [Color.red, Color(red: 0.6, green: 0.0, blue: 0.0)]),
                                        center: .center,
                                        startRadius: 20,
                                        endRadius: 90
                                    )
                                )
                                .frame(width: 180, height: 180)
                                .shadow(color: .red.opacity(0.6), radius: 20, x: 0, y: 0)
                            
                            VStack(spacing: 6) {
                                Image(systemName: "hand.raised.fill")
                                    .font(.system(size: 40))
                                    .foregroundColor(.white)
                                Text("EMERGENCY\nSTOP")
                                    .font(.system(size: 16, weight: .black, design: .monospaced))
                                    .foregroundColor(.white)
                                    .multilineTextAlignment(.center)
                            }
                        }
                    }
                    .padding(.vertical, 8)
                    
                    // Incident Reporting Form
                    VStack(alignment: .leading, spacing: 16) {
                        Text("INCIDENT LOG & NOTIFICATION")
                            .font(.system(size: 12, weight: .bold, design: .monospaced))
                            .foregroundColor(.gray)
                        
                        // Hazard Category Picker
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Hazard Category")
                                .font(.caption)
                                .foregroundColor(.gray)
                            
                            ScrollView(.horizontal, showsIndicators: false) {
                                HStack(spacing: 8) {
                                    ForEach(hazards, id: \.self) { hazard in
                                        let isSel = (selectedHazard == hazard)
                                        Button(action: { selectedHazard = hazard }) {
                                            Text(hazard)
                                                .font(.system(size: 12, weight: .bold))
                                                .padding(.horizontal, 12)
                                                .padding(.vertical, 8)
                                                .background(isSel ? Color.red : Color.black.opacity(0.3))
                                                .foregroundColor(.white)
                                                .cornerRadius(8)
                                        }
                                    }
                                }
                            }
                        }
                        
                        // Severity Level Picker
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Severity Level")
                                .font(.caption)
                                .foregroundColor(.gray)
                            
                            HStack(spacing: 8) {
                                ForEach(severities, id: \.self) { sev in
                                    let isSel = (selectedSeverity == sev)
                                    Button(action: { selectedSeverity = sev }) {
                                        Text(sev)
                                            .font(.system(size: 12, weight: .bold))
                                            .frame(maxWidth: .infinity)
                                            .padding(.vertical, 8)
                                            .background(isSel ? Color.orange : Color.black.opacity(0.3))
                                            .foregroundColor(.white)
                                            .cornerRadius(8)
                                    }
                                }
                            }
                        }
                        
                        // Notes Text Area
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Incident Remarks")
                                .font(.caption)
                                .foregroundColor(.gray)
                            
                            TextField("Describe machine behavior, leak, or hazard...", text: $incidentNotes)
                                .textFieldStyle(.plain)
                                .foregroundColor(.white)
                                .padding(12)
                                .background(Color.black.opacity(0.3))
                                .cornerRadius(8)
                        }
                        
                        // Submit Incident Button
                        Button(action: {
                            submitIncidentReport()
                        }) {
                            HStack {
                                Image(systemName: "paperplane.fill")
                                Text("DISPATCH SAFETY ALERT TO SUPERVISOR")
                                    .font(.system(size: 13, weight: .bold, design: .monospaced))
                            }
                            .foregroundColor(.white)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 14)
                            .background(Color.red)
                            .cornerRadius(10)
                        }
                        .disabled(isSubmitting)
                    }
                    .padding()
                    .background(Color(red: 0.12, green: 0.14, blue: 0.2))
                    .cornerRadius(12)
                    .padding(.horizontal)
                    .padding(.bottom, 24)
                }
            }
        }
        .alert(isPresented: $submittedAlert) {
            Alert(
                title: Text("EMERGENCY SIGNAL BROADCAST"),
                message: Text("Emergency signal has been logged on the Industrial Nexus server. Plant supervisors have been notified."),
                dismissButton: .default(Text("Acknowledge"))
            )
        }
    }
    
    private func triggerInstantEStop() {
        Task {
            _ = await viewModel.submitEmergencyStop(
                hazardType: "E-Stop Button Depressed",
                severity: "Critical",
                notes: "Instant physical / UI E-stop triggered by operator \(viewModel.operatorId)"
            )
            submittedAlert = true
        }
    }
    
    private func submitIncidentReport() {
        isSubmitting = true
        Task {
            _ = await viewModel.submitEmergencyStop(
                hazardType: selectedHazard,
                severity: selectedSeverity,
                notes: incidentNotes.isEmpty ? "Hazard reported at \(viewModel.stationId)" : incidentNotes
            )
            isSubmitting = false
            submittedAlert = true
            incidentNotes = ""
        }
    }
}
