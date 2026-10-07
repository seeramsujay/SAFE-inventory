import SwiftUI

public struct AdminContentView: View {
    @StateObject private var viewModel = AdminViewModel()
    @State private var selectedTab: Int = 0
    
    public init() {}
    
    public var body: some View {
        TabView(selection: $selectedTab) {
            AdminOverviewView(viewModel: viewModel)
                .tabItem {
                    Label("Plant", systemImage: "gauge")
                }
                .tag(0)
            
            AdminOrdersView(viewModel: viewModel)
                .tabItem {
                    Label("Orders", systemImage: "shippingbox.fill")
                }
                .tag(1)
            
            AdminInventoryView(viewModel: viewModel)
                .tabItem {
                    Label("Stock", systemImage: "archivebox.fill")
                }
                .tag(2)
            
            AdminQRPairingView(viewModel: viewModel)
                .tabItem {
                    Label("Pairing", systemImage: "qrcode")
                }
                .tag(3)
            
            AdminLogsView(viewModel: viewModel)
                .tabItem {
                    Label("Quality", systemImage: "checkmark.seal.fill")
                }
                .tag(4)
        }
        .accentColor(.cyan)
    }
}
