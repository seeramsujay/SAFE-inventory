import SwiftUI

public struct ContentView: View {
    @StateObject private var viewModel = WorkerViewModel()
    @State private var selectedTab: Int = 0
    
    public init() {}
    
    public var body: some View {
        Group {
            if !viewModel.isLoggedIn {
                LoginView(viewModel: viewModel)
            } else {
                TabView(selection: $selectedTab) {
                    WorkerTimerView(viewModel: viewModel)
                        .tabItem {
                            Label("Production", systemImage: "timer")
                        }
                        .tag(0)
                    
                    WorkerExtruderView(viewModel: viewModel)
                        .tabItem {
                            Label("Extruder PLC", systemImage: "gauge.with.needle")
                        }
                        .tag(1)
                    
                    EmergencyView(viewModel: viewModel)
                        .tabItem {
                            Label("E-Stop", systemImage: "exclamationmark.octagon.fill")
                        }
                        .tag(2)
                }
                .accentColor(.cyan)
            }
        }
    }
}
