import SwiftUI

public struct LoginView: View {
    @ObservedObject var viewModel: WorkerViewModel
    @State private var showSettings: Bool = false
    @State private var pairingUrlInput: String = ""
    @State private var stationTokenInput: String = ""
    @State private var stationIdInput: String = ""
    
    public init(viewModel: WorkerViewModel) {
        self.viewModel = viewModel
    }
    
    public var body: some View {
        ZStack {
            Color(red: 0.07, green: 0.09, blue: 0.13)
                .ignoresSafeArea()
            
            ScrollView {
                VStack(spacing: 24) {
                    // Header Bar
                    HStack {
                        VStack(alignment: .leading, spacing: 4) {
                            Text("INDUSTRIAL NEXUS")
                                .font(.system(size: 24, weight: .black, design: .monospaced))
                                .foregroundColor(.cyan)
                            Text("Floor Tablet & Kiosk Portal")
                                .font(.system(size: 14, weight: .medium))
                                .foregroundColor(.gray)
                        }
                        Spacer()
                        
                        Button(action: {
                            pairingUrlInput = viewModel.serverUrl
                            stationTokenInput = viewModel.stationToken
                            stationIdInput = viewModel.stationId
                            showSettings = true
                        }) {
                            Image(systemName: "gearshape.fill")
                                .font(.system(size: 20))
                                .foregroundColor(.cyan)
                                .padding(10)
                                .background(Color.white.opacity(0.1))
                                .clipShape(Circle())
                        }
                    }
                    .padding(.horizontal)
                    .padding(.top, 16)
                    
                    // Station Mode Selection Card
                    VStack(alignment: .leading, spacing: 12) {
                        Text("1. SELECT STATION ROLE")
                            .font(.system(size: 13, weight: .bold, design: .monospaced))
                            .foregroundColor(.gray)
                        
                        HStack(spacing: 12) {
                            stationTypeButton(
                                title: "Grinder Kiosk (पिसाई)",
                                subtitle: "Stage 1: Raw Grain Pulverization",
                                type: "grinder",
                                defaultId: "GRINDER-01",
                                defaultToken: "TOKEN-GRINDER-STATION",
                                color: .orange
                            )
                            
                            stationTypeButton(
                                title: "Mixer Kiosk (मिश्रण)",
                                subtitle: "Stage 2: Compounding & Blending",
                                type: "mixer",
                                defaultId: "MIXER-01",
                                defaultToken: "TOKEN-MIXER-STATION",
                                color: .cyan
                            )
                        }
                    }
                    .padding()
                    .background(Color(red: 0.12, green: 0.14, blue: 0.2))
                    .cornerRadius(12)
                    .padding(.horizontal)
                    
                    // Operator Credentials Card
                    VStack(alignment: .leading, spacing: 14) {
                        Text("2. OPERATOR SIGN-IN")
                            .font(.system(size: 13, weight: .bold, design: .monospaced))
                            .foregroundColor(.gray)
                        
                        HStack(spacing: 16) {
                            VStack(alignment: .leading, spacing: 6) {
                                Text("Operator Badge ID")
                                    .font(.caption)
                                    .foregroundColor(.gray)
                                TextField("OP-XXXX", text: $viewModel.operatorId)
                                    .textFieldStyle(.plain)
                                    .font(.system(.body, design: .monospaced))
                                    .foregroundColor(.white)
                                    .padding(10)
                                    .background(Color.black.opacity(0.4))
                                    .cornerRadius(8)
                            }
                            
                            VStack(alignment: .leading, spacing: 6) {
                                Text("Security PIN")
                                    .font(.caption)
                                    .foregroundColor(.gray)
                                SecureField("••••", text: $viewModel.operatorPin)
                                    .textFieldStyle(.plain)
                                    .font(.system(.body, design: .monospaced))
                                    .foregroundColor(.white)
                                    .padding(10)
                                    .background(Color.black.opacity(0.4))
                                    .cornerRadius(8)
                            }
                        }
                    }
                    .padding()
                    .background(Color(red: 0.12, green: 0.14, blue: 0.2))
                    .cornerRadius(12)
                    .padding(.horizontal)
                    
                    // Mandatory PPE Checklist Card
                    VStack(alignment: .leading, spacing: 14) {
                        HStack {
                            Text("3. MANDATORY PPE & SAFETY CHECKLIST")
                                .font(.system(size: 13, weight: .bold, design: .monospaced))
                                .foregroundColor(.gray)
                            Spacer()
                            Text(viewModel.isSafetyChecklistComplete ? "VERIFIED (5/5)" : "REQUIRED")
                                .font(.system(size: 11, weight: .black, design: .monospaced))
                                .foregroundColor(viewModel.isSafetyChecklistComplete ? .green : .red)
                        }
                        
                        safetyCheckRow(title: "Eye Protection / Safety Goggles (सुरक्षा चश्मा)", isChecked: $viewModel.checkEyeProtection)
                        safetyCheckRow(title: "Non-slip / Steel-toe Safety Boots (सुरक्षा जूते)", isChecked: $viewModel.checkSafetyBoots)
                        safetyCheckRow(title: "High-visibility Reflective Vest (रिफ्लेक्टिव जैकेट)", isChecked: $viewModel.checkReflectiveVest)
                        safetyCheckRow(title: "Emergency Stop Buttons Verified (ई-स्टॉप बटन जांच)", isChecked: $viewModel.checkEmergencyStops)
                        safetyCheckRow(title: "Air lines & Exhaust Extraction Functional (हवा लाइनें ठीक)", isChecked: $viewModel.checkAirLines)
                    }
                    .padding()
                    .background(Color(red: 0.12, green: 0.14, blue: 0.2))
                    .cornerRadius(12)
                    .padding(.horizontal)
                    
                    // Submit Sign-In Button
                    Button(action: {
                        viewModel.performLogin()
                    }) {
                        HStack {
                            Image(systemName: "lock.open.fill")
                            Text("COMMENCE OPERATOR SHIFT")
                                .font(.system(size: 16, weight: .bold, design: .monospaced))
                        }
                        .foregroundColor(viewModel.isSafetyChecklistComplete ? .black : .gray)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 16)
                        .background(viewModel.isSafetyChecklistComplete ? Color.cyan : Color.gray.opacity(0.3))
                        .cornerRadius(12)
                    }
                    .disabled(!viewModel.isSafetyChecklistComplete)
                    .padding(.horizontal)
                    .padding(.bottom, 24)
                }
            }
        }
        .sheet(isPresented: $showSettings) {
            settingsModal
        }
    }
    
    private func stationTypeButton(title: String, subtitle: String, type: String, defaultId: String, defaultToken: String, color: Color) -> some View {
        let isSelected = (viewModel.stationType == type)
        return Button(action: {
            viewModel.stationType = type
            viewModel.stationId = defaultId
            viewModel.stationToken = defaultToken
        }) {
            VStack(alignment: .leading, spacing: 6) {
                Text(title)
                    .font(.system(size: 14, weight: .bold))
                    .foregroundColor(isSelected ? .white : .gray)
                Text(subtitle)
                    .font(.system(size: 11))
                    .foregroundColor(.gray)
                    .lineLimit(2)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(12)
            .background(isSelected ? color.opacity(0.2) : Color.black.opacity(0.2))
            .overlay(
                RoundedRectangle(cornerRadius: 8)
                    .stroke(isSelected ? color : Color.clear, lineWidth: 2)
            )
            .cornerRadius(8)
        }
    }
    
    private func safetyCheckRow(title: String, isChecked: Binding<Bool>) -> some View {
        Button(action: {
            isChecked.wrappedValue.toggle()
        }) {
            HStack(spacing: 12) {
                Image(systemName: isChecked.wrappedValue ? "checkmark.square.fill" : "square")
                    .font(.system(size: 20))
                    .foregroundColor(isChecked.wrappedValue ? .green : .gray)
                Text(title)
                    .font(.system(size: 13))
                    .foregroundColor(.white)
                    .multilineTextAlignment(.leading)
                Spacer()
            }
            .padding(.vertical, 4)
        }
    }
    
    private var settingsModal: some View {
        NavigationView {
            Form {
                Section(header: Text("Nexus Server Configuration")) {
                    TextField("Server Base URL", text: $pairingUrlInput)
                    TextField("Station ID", text: $stationIdInput)
                    TextField("Station Token", text: $stationTokenInput)
                }
                
                Section {
                    Button("Save Configuration") {
                        viewModel.applyPairing(
                            url: pairingUrlInput,
                            token: stationTokenInput,
                            station: stationIdInput,
                            type: viewModel.stationType
                        )
                        showSettings = false
                    }
                    .foregroundColor(.cyan)
                }
            }
            .navigationTitle("Station Pairing")
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Done") { showSettings = false }
                }
            }
        }
    }
}
