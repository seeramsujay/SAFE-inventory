import SwiftUI

public struct AdminOrdersView: View {
    @ObservedObject var viewModel: AdminViewModel
    
    public init(viewModel: AdminViewModel) {
        self.viewModel = viewModel
    }
    
    public var body: some View {
        ZStack {
            Color(red: 0.07, green: 0.09, blue: 0.13)
                .ignoresSafeArea()
            
            ScrollView {
                VStack(spacing: 16) {
                    // Header & New Order Button
                    HStack {
                        VStack(alignment: .leading, spacing: 2) {
                            Text("PRODUCTION QUEUE")
                                .font(.system(size: 20, weight: .black, design: .monospaced))
                                .foregroundColor(.white)
                            Text("Orders & Batch Dispatch")
                                .font(.caption)
                                .foregroundColor(.gray)
                        }
                        Spacer()
                        
                        Button(action: {
                            viewModel.showNewOrderSheet = true
                        }) {
                            HStack(spacing: 6) {
                                Image(systemName: "plus")
                                Text("NEW ORDER")
                                    .font(.system(size: 12, weight: .bold, design: .monospaced))
                            }
                            .padding(.horizontal, 12)
                            .padding(.vertical, 8)
                            .background(Color.cyan)
                            .foregroundColor(.black)
                            .cornerRadius(8)
                        }
                    }
                    .padding(.horizontal)
                    .padding(.top, 10)
                    
                    // Orders List
                    if viewModel.orders.isEmpty {
                        VStack(spacing: 8) {
                            Image(systemName: "tray")
                                .font(.system(size: 32))
                                .foregroundColor(.gray)
                            Text("NO ORDERS SCHEDULED")
                                .font(.system(size: 13, weight: .bold, design: .monospaced))
                                .foregroundColor(.gray)
                        }
                        .frame(maxWidth: .infinity)
                        .padding(40)
                        .background(Color(red: 0.12, green: 0.14, blue: 0.2))
                        .cornerRadius(12)
                        .padding(.horizontal)
                    } else {
                        ForEach(viewModel.orders) { order in
                            orderCard(order: order)
                        }
                        .padding(.horizontal)
                    }
                }
                .padding(.bottom, 24)
            }
        }
        .sheet(isPresented: $viewModel.showNewOrderSheet) {
            newOrderSheet
        }
    }
    
    private func orderCard(order: AdminOrder) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text(order.recipeHindiName)
                        .font(.system(size: 16, weight: .bold))
                        .foregroundColor(.white)
                    Text(order.recipeName)
                        .font(.caption)
                        .foregroundColor(.gray)
                }
                Spacer()
                
                Text(order.status.uppercased())
                    .font(.system(size: 10, weight: .bold, design: .monospaced))
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(statusColor(status: order.status).opacity(0.2))
                    .foregroundColor(statusColor(status: order.status))
                    .cornerRadius(6)
            }
            
            HStack {
                Text(order.id)
                    .font(.system(size: 12, weight: .black, design: .monospaced))
                    .foregroundColor(.cyan)
                Text("• \(order.line ?? "Line A")")
                    .font(.caption)
                    .foregroundColor(.gray)
                Spacer()
                Text("\(order.unitsProduced) / \(order.targetUnits) kg")
                    .font(.system(size: 12, weight: .bold, design: .monospaced))
                    .foregroundColor(.white)
            }
            
            // Progress Bar
            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    Rectangle()
                        .fill(Color.white.opacity(0.1))
                        .frame(height: 6)
                        .cornerRadius(3)
                    
                    Rectangle()
                        .fill(Color.cyan)
                        .frame(width: geo.size.width * CGFloat(order.progressPercent), height: 6)
                        .cornerRadius(3)
                }
            }
            .frame(height: 6)
        }
        .padding(14)
        .background(Color(red: 0.12, green: 0.14, blue: 0.2))
        .cornerRadius(10)
    }
    
    private func statusColor(status: String) -> Color {
        switch status {
        case "Completed": return .green
        case "In Progress": return .cyan
        case "Pending": return .orange
        default: return .gray
        }
    }
    
    private var newOrderSheet: some View {
        NavigationView {
            Form {
                Section(header: Text("Recipe Selection")) {
                    Picker("Product Recipe", selection: $viewModel.selectedProductId) {
                        ForEach(viewModel.products) { prod in
                            Text("\(prod.englishName) (\(prod.name))").tag(prod.id)
                        }
                    }
                    
                    Picker("Production Line", selection: $viewModel.selectedLine) {
                        Text("Line A").tag("Line A")
                        Text("Line B").tag("Line B")
                        Text("Line C").tag("Line C")
                    }
                }
                
                Section(header: Text("Batch Configuration")) {
                    Stepper("Target Batches: \(viewModel.targetBatches) (\(viewModel.targetBatches * 600) kg)", value: $viewModel.targetBatches, in: 1...20)
                }
                
                Section {
                    Button("Dispatch Order to Floor") {
                        Task {
                            _ = await viewModel.dispatchNewOrder()
                        }
                    }
                    .foregroundColor(.cyan)
                }
            }
            .navigationTitle("New Production Order")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { viewModel.showNewOrderSheet = false }
                }
            }
        }
    }
}
