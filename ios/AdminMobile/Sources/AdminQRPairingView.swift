import SwiftUI
import CoreImage.CIFilterBuiltins

public struct AdminQRPairingView: View {
    @ObservedObject var viewModel: AdminViewModel
    @State private var selectedTab: String = "grinder"
    
    public init(viewModel: AdminViewModel) {
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
                            Text("STATION QR PAIRING")
                                .font(.system(size: 20, weight: .black, design: .monospaced))
                                .foregroundColor(.white)
                            Text("Floor Tablet Onboarding Generator")
                                .font(.caption)
                                .foregroundColor(.gray)
                        }
                        Spacer()
                    }
                    .padding(.horizontal)
                    .padding(.top, 10)
                    
                    // Station Selector Tabs
                    HStack(spacing: 12) {
                        tabButton(title: "Grinder-01 (पिसाई)", type: "grinder", color: .orange)
                        tabButton(title: "Mixer-01 (मिश्रण)", type: "mixer", color: .cyan)
                    }
                    .padding(.horizontal)
                    
                    // QR Code Display Card
                    VStack(spacing: 16) {
                        Text(selectedTab == "grinder" ? "SCAN FOR GRINDER KIOSK" : "SCAN FOR MIXER KIOSK")
                            .font(.system(size: 13, weight: .bold, design: .monospaced))
                            .foregroundColor(selectedTab == "grinder" ? .orange : .cyan)
                        
                        let payload = (selectedTab == "grinder") ? viewModel.grinderPairingJson : viewModel.mixerPairingJson
                        
                        if let cgImage = generateQRCode(from: payload) {
                            Image(decorative: cgImage, scale: 1.0)
                                .interpolation(.none)
                                .resizable()
                                .scaledToFit()
                                .frame(width: 220, height: 220)
                                .padding(12)
                                .background(Color.white)
                                .cornerRadius(12)
                        } else {
                            Rectangle()
                                .fill(Color.gray.opacity(0.2))
                                .frame(width: 220, height: 220)
                                .cornerRadius(12)
                        }
                        
                        Text("Point Floor Tablet Camera to Pair Automatically")
                            .font(.caption)
                            .foregroundColor(.gray)
                    }
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(Color(red: 0.12, green: 0.14, blue: 0.2))
                    .cornerRadius(12)
                    .padding(.horizontal)
                    
                    // Server URL Configuration
                    VStack(alignment: .leading, spacing: 10) {
                        Text("NETWORK SERVER ENDPOINT")
                            .font(.system(size: 11, weight: .bold, design: .monospaced))
                            .foregroundColor(.gray)
                        
                        HStack {
                            TextField("http://...", text: $viewModel.serverUrl)
                                .font(.system(.subheadline, design: .monospaced))
                                .foregroundColor(.white)
                            
                            Button(action: {
                                viewModel.updatePairingJson()
                            }) {
                                Text("UPDATE")
                                    .font(.system(size: 11, weight: .bold, design: .monospaced))
                                    .foregroundColor(.cyan)
                            }
                        }
                        .padding(10)
                        .background(Color.black.opacity(0.3))
                        .cornerRadius(8)
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
    
    private func tabButton(title: String, type: String, color: Color) -> some View {
        let isSel = (selectedTab == type)
        return Button(action: { selectedTab = type }) {
            Text(title)
                .font(.system(size: 13, weight: .bold))
                .foregroundColor(isSel ? .white : .gray)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 10)
                .background(isSel ? color.opacity(0.3) : Color.black.opacity(0.2))
                .overlay(
                    RoundedRectangle(cornerRadius: 8)
                        .stroke(isSel ? color : Color.clear, lineWidth: 1.5)
                )
                .cornerRadius(8)
        }
    }
    
    private func generateQRCode(from string: String) -> CGImage? {
        let context = CIContext()
        let filter = CIFilter.qrCodeGenerator()
        filter.message = Data(string.utf8)
        
        if let outputImage = filter.outputImage {
            let transform = CGAffineTransform(scaleX: 10, y: 10)
            let scaledImage = outputImage.transformed(by: transform)
            return context.createCGImage(scaledImage, from: scaledImage.extent)
        }
        return nil
    }
}
