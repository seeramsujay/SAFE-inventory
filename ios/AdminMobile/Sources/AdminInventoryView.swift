import SwiftUI

public struct AdminInventoryView: View {
    @ObservedObject var viewModel: AdminViewModel
    @State private var adjustingItem: AdminInventoryItem? = nil
    @State private var adjustmentAmount: String = ""
    @State private var adjustmentReason: String = "Shift Stock Count"
    
    public init(viewModel: AdminViewModel) {
        self.viewModel = viewModel
    }
    
    public var body: some View {
        ZStack {
            Color(red: 0.07, green: 0.09, blue: 0.13)
                .ignoresSafeArea()
            
            ScrollView {
                VStack(spacing: 16) {
                    // Header
                    HStack {
                        VStack(alignment: .leading, spacing: 2) {
                            Text("RAW MATERIALS STOCK")
                                .font(.system(size: 20, weight: .black, design: .monospaced))
                                .foregroundColor(.white)
                            Text("Real-Time Inventory Levels")
                                .font(.caption)
                                .foregroundColor(.gray)
                        }
                        Spacer()
                    }
                    .padding(.horizontal)
                    .padding(.top, 10)
                    
                    // Materials List
                    ForEach(viewModel.inventory.filter { $0.type == "raw_material" }) { item in
                        materialCard(item: item)
                    }
                    .padding(.horizontal)
                }
                .padding(.bottom, 24)
            }
        }
        .sheet(item: $adjustingItem) { item in
            adjustmentSheet(item: item)
        }
    }
    
    private func materialCard(item: AdminInventoryItem) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text(item.name)
                        .font(.system(size: 15, weight: .bold))
                        .foregroundColor(.white)
                    if let hi = item.hindiName {
                        Text(hi)
                            .font(.caption)
                            .foregroundColor(.gray)
                    }
                }
                Spacer()
                
                if item.isLowStock {
                    HStack(spacing: 4) {
                        Image(systemName: "exclamationmark.triangle.fill")
                        Text("LOW STOCK")
                            .font(.system(size: 10, weight: .bold, design: .monospaced))
                    }
                    .padding(.horizontal, 6)
                    .padding(.vertical, 3)
                    .background(Color.red.opacity(0.2))
                    .foregroundColor(.red)
                    .cornerRadius(4)
                }
            }
            
            HStack(alignment: .bottom) {
                VStack(alignment: .leading, spacing: 2) {
                    Text("Stock Available")
                        .font(.caption2)
                        .foregroundColor(.gray)
                    Text("\(Int(item.stock)) \(item.unit)")
                        .font(.system(size: 20, weight: .black, design: .monospaced))
                        .foregroundColor(item.isLowStock ? .red : .white)
                }
                
                Spacer()
                
                Button(action: {
                    adjustingItem = item
                    adjustmentAmount = "500"
                }) {
                    Text("ADJUST STOCK")
                        .font(.system(size: 11, weight: .bold, design: .monospaced))
                        .padding(.horizontal, 10)
                        .padding(.vertical, 6)
                        .background(Color.white.opacity(0.1))
                        .foregroundColor(.cyan)
                        .cornerRadius(6)
                }
            }
        }
        .padding(14)
        .background(Color(red: 0.12, green: 0.14, blue: 0.2))
        .cornerRadius(10)
    }
    
    private func adjustmentSheet(item: AdminInventoryItem) -> some View {
        NavigationView {
            Form {
                Section(header: Text("Material: \(item.name)")) {
                    Text("Current Stock: \(Int(item.stock)) \(item.unit)")
                    TextField("Adjustment Amount (+/- kg)", text: $adjustmentAmount)
                    TextField("Reason", text: $adjustmentReason)
                }
                
                Section {
                    Button("Save Stock Adjustment") {
                        if let adj = Double(adjustmentAmount) {
                            Task {
                                _ = await viewModel.adjustStock(itemId: item.id, adjustment: adj, reason: adjustmentReason)
                                adjustingItem = nil
                            }
                        }
                    }
                    .foregroundColor(.green)
                }
            }
            .navigationTitle("Stock Adjustment")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { adjustingItem = nil }
                }
            }
        }
    }
}
