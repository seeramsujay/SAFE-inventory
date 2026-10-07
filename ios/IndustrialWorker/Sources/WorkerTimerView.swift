import SwiftUI

public struct WorkerTimerView: View {
    @ObservedObject var viewModel: WorkerViewModel
    @State private var sliderOffset: CGFloat = 0
    private let sliderWidth: CGFloat = 280
    
    public init(viewModel: WorkerViewModel) {
        self.viewModel = viewModel
    }
    
    public var body: some View {
        ZStack {
            Color(red: 0.07, green: 0.09, blue: 0.13)
                .ignoresSafeArea()
            
            ScrollView {
                VStack(spacing: 20) {
                    // Station Top Header Bar
                    headerBar
                    
                    // Break Indicator Banner if Active
                    if viewModel.isOnBreak {
                        breakBanner
                    }
                    
                    // Celebration Banner
                    if let message = viewModel.celebrationMessage {
                        HStack {
                            Image(systemName: "checkmark.circle.fill")
                                .foregroundColor(.green)
                            Text(message)
                                .font(.system(size: 14, weight: .bold))
                                .foregroundColor(.white)
                        }
                        .padding()
                        .frame(maxWidth: .infinity)
                        .background(Color.green.opacity(0.2))
                        .cornerRadius(10)
                        .padding(.horizontal)
                    }
                    
                    // Active Production Order Card
                    if let order = viewModel.activeOrder {
                        activeOrderCard(order: order)
                    } else {
                        noOrderCard
                    }
                    
                    // Recipe Ingredients Formula Table (Filtered by station stage)
                    recipeFormulaCard
                    
                    // Production Batch Timer
                    batchTimerCard
                    
                    // Slide to Confirm Completion Slider
                    slideToConfirmSlider
                        .padding(.bottom, 24)
                }
                .padding(.top, 10)
            }
        }
        .sheet(isPresented: $viewModel.showMixerFeedbackModal) {
            mixerFeedbackModal
        }
    }
    
    private var headerBar: some View {
        HStack {
            VStack(alignment: .leading, spacing: 2) {
                HStack(spacing: 8) {
                    Text(viewModel.stationId)
                        .font(.system(size: 18, weight: .black, design: .monospaced))
                        .foregroundColor(.white)
                    
                    Text(viewModel.stationType.uppercased())
                        .font(.system(size: 10, weight: .bold, design: .monospaced))
                        .padding(.horizontal, 6)
                        .padding(.vertical, 2)
                        .background(viewModel.stationType == "grinder" ? Color.orange.opacity(0.3) : Color.cyan.opacity(0.3))
                        .foregroundColor(viewModel.stationType == "grinder" ? .orange : .cyan)
                        .cornerRadius(4)
                }
                
                Text("Operator: \(viewModel.operatorId) • Shift Active")
                    .font(.caption)
                    .foregroundColor(.gray)
            }
            
            Spacer()
            
            // Station Break Button
            Button(action: {
                viewModel.toggleBreak()
            }) {
                HStack(spacing: 6) {
                    Image(systemName: viewModel.isOnBreak ? "cup.and.saucer.fill" : "cup.and.saucer")
                    Text(viewModel.isOnBreak ? "RESUME" : "TAKE BREAK")
                        .font(.system(size: 11, weight: .bold, design: .monospaced))
                }
                .padding(.horizontal, 10)
                .padding(.vertical, 6)
                .background(viewModel.isOnBreak ? Color.yellow : Color.white.opacity(0.1))
                .foregroundColor(viewModel.isOnBreak ? .black : .white)
                .cornerRadius(8)
            }
        }
        .padding(.horizontal)
    }
    
    private var breakBanner: some View {
        HStack {
            Image(systemName: "pause.circle.fill")
                .foregroundColor(.yellow)
            Text("STATION PAUSED ON OPERATOR BREAK (\(viewModel.breakDurationSeconds)s)")
                .font(.system(size: 12, weight: .bold, design: .monospaced))
                .foregroundColor(.yellow)
            Spacer()
        }
        .padding()
        .background(Color.yellow.opacity(0.15))
        .cornerRadius(10)
        .padding(.horizontal)
    }
    
    private func activeOrderCard(order: Order) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text(order.recipeHindiName)
                        .font(.system(size: 20, weight: .bold))
                        .foregroundColor(.white)
                    Text(order.recipeName)
                        .font(.system(size: 13, weight: .medium))
                        .foregroundColor(.gray)
                }
                Spacer()
                
                VStack(alignment: .trailing, spacing: 2) {
                    Text(order.id)
                        .font(.system(size: 14, weight: .black, design: .monospaced))
                        .foregroundColor(.cyan)
                    Text(order.line ?? "Line A")
                        .font(.caption2)
                        .foregroundColor(.gray)
                }
            }
            
            // Progress Bar
            VStack(alignment: .leading, spacing: 4) {
                HStack {
                    Text("Production Progress")
                        .font(.caption2)
                        .foregroundColor(.gray)
                    Spacer()
                    Text("\(order.unitsProduced) / \(order.targetUnits) kg")
                        .font(.system(size: 12, weight: .bold, design: .monospaced))
                        .foregroundColor(.white)
                }
                
                GeometryReader { geo in
                    ZStack(alignment: .leading) {
                        Rectangle()
                            .fill(Color.white.opacity(0.1))
                            .frame(height: 8)
                            .cornerRadius(4)
                        
                        Rectangle()
                            .fill(Color.cyan)
                            .frame(width: geo.size.width * CGFloat(order.progressPercentage), height: 8)
                            .cornerRadius(4)
                    }
                }
                .frame(height: 8)
            }
        }
        .padding()
        .background(Color(red: 0.12, green: 0.14, blue: 0.2))
        .cornerRadius(12)
        .padding(.horizontal)
    }
    
    private var noOrderCard: some View {
        VStack(spacing: 8) {
            Image(systemName: "tray")
                .font(.system(size: 32))
                .foregroundColor(.gray)
            Text("NO ACTIVE PRODUCTION ORDER")
                .font(.system(size: 14, weight: .bold, design: .monospaced))
                .foregroundColor(.gray)
            Text("Waiting for supervisor dispatch from Admin Panel...")
                .font(.caption)
                .foregroundColor(.gray.opacity(0.8))
        }
        .frame(maxWidth: .infinity)
        .padding(28)
        .background(Color(red: 0.12, green: 0.14, blue: 0.2))
        .cornerRadius(12)
        .padding(.horizontal)
    }
    
    private var recipeFormulaCard: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                Text(viewModel.stationType == "grinder" ? "STAGE 1: GRINDER INGREDIENTS" : "STAGE 2: MIXER INGREDIENTS")
                    .font(.system(size: 12, weight: .bold, design: .monospaced))
                    .foregroundColor(viewModel.stationType == "grinder" ? .orange : .cyan)
                Spacer()
                Text("Recipe Ratios")
                    .font(.caption2)
                    .foregroundColor(.gray)
            }
            
            let filtered = (viewModel.currentProduct?.ingredients ?? []).filter { ing in
                if viewModel.stationType == "grinder" {
                    return ing.stage == "grinder" || ing.requiresGrinding == true
                } else {
                    return ing.stage == "mixer" || ing.requiresGrinding != true
                }
            }
            
            if filtered.isEmpty {
                Text("No specific ingredients mapped for this station.")
                    .font(.caption)
                    .foregroundColor(.gray)
            } else {
                ForEach(filtered) { ing in
                    HStack {
                        VStack(alignment: .leading, spacing: 2) {
                            Text(ing.hindiName ?? ing.name ?? ing.ingredientId)
                                .font(.system(size: 14, weight: .semibold))
                                .foregroundColor(.white)
                            Text(ing.name ?? ing.ingredientId)
                                .font(.caption2)
                                .foregroundColor(.gray)
                        }
                        Spacer()
                        Text("\(Int(ing.percentage))%")
                            .font(.system(size: 14, weight: .black, design: .monospaced))
                            .foregroundColor(.white)
                    }
                    .padding(.vertical, 4)
                    Divider().background(Color.white.opacity(0.1))
                }
            }
        }
        .padding()
        .background(Color(red: 0.12, green: 0.14, blue: 0.2))
        .cornerRadius(12)
        .padding(.horizontal)
    }
    
    private var batchTimerCard: some View {
        VStack(spacing: 16) {
            // Circular Timer
            ZStack {
                Circle()
                    .stroke(Color.white.opacity(0.1), lineWidth: 10)
                    .frame(width: 150, height: 150)
                
                let progress = Double(viewModel.timeRemainingSeconds) / Double(max(1, viewModel.totalBatchDurationSeconds))
                Circle()
                    .trim(from: 0, to: CGFloat(progress))
                    .stroke(viewModel.isTimerRunning ? Color.cyan : Color.orange, style: StrokeStyle(lineWidth: 10, lineCap: .round))
                    .frame(width: 150, height: 150)
                    .rotationEffect(.degrees(-90))
                
                VStack(spacing: 4) {
                    let mins = viewModel.timeRemainingSeconds / 60
                    let secs = viewModel.timeRemainingSeconds % 60
                    Text(String(format: "%02d:%02d", mins, secs))
                        .font(.system(size: 32, weight: .black, design: .monospaced))
                        .foregroundColor(.white)
                    
                    Text(viewModel.isTimerRunning ? "CYCLE RUNNING" : "HOLD")
                        .font(.system(size: 10, weight: .bold, design: .monospaced))
                        .foregroundColor(viewModel.isTimerRunning ? .green : .orange)
                }
            }
            .padding(.top, 8)
            
            // Timer Action Buttons
            HStack(spacing: 16) {
                Button(action: {
                    viewModel.toggleTimer()
                }) {
                    HStack {
                        Image(systemName: viewModel.isTimerRunning ? "pause.fill" : "play.fill")
                        Text(viewModel.isTimerRunning ? "PAUSE" : "START")
                            .font(.system(size: 13, weight: .bold, design: .monospaced))
                    }
                    .foregroundColor(.black)
                    .padding(.horizontal, 24)
                    .padding(.vertical, 10)
                    .background(viewModel.isTimerRunning ? Color.orange : Color.cyan)
                    .cornerRadius(8)
                }
                
                Button(action: {
                    viewModel.resetTimer()
                }) {
                    HStack {
                        Image(systemName: "arrow.counterclockwise")
                        Text("RESET")
                            .font(.system(size: 13, weight: .bold, design: .monospaced))
                    }
                    .foregroundColor(.white)
                    .padding(.horizontal, 16)
                    .padding(.vertical, 10)
                    .background(Color.white.opacity(0.1))
                    .cornerRadius(8)
                }
            }
        }
        .frame(maxWidth: .infinity)
        .padding()
        .background(Color(red: 0.12, green: 0.14, blue: 0.2))
        .cornerRadius(12)
        .padding(.horizontal)
    }
    
    private var slideToConfirmSlider: some View {
        VStack(spacing: 8) {
            Text("SWIPE TO COMPLETE BATCH")
                .font(.system(size: 11, weight: .bold, design: .monospaced))
                .foregroundColor(.gray)
            
            ZStack(alignment: .leading) {
                // Background Track
                RoundedRectangle(cornerRadius: 30)
                    .fill(Color(red: 0.15, green: 0.18, blue: 0.25))
                    .frame(width: sliderWidth, height: 56)
                
                Text(">>> Slide to Dispatch >>>")
                    .font(.system(size: 13, weight: .bold, design: .monospaced))
                    .foregroundColor(.gray)
                    .frame(width: sliderWidth, alignment: .center)
                
                // Draggable Thumb
                Circle()
                    .fill(Color.green)
                    .frame(width: 48, height: 48)
                    .padding(4)
                    .offset(x: sliderOffset)
                    .gesture(
                        DragGesture()
                            .onChanged { value in
                                if value.translation.width > 0 && value.translation.width <= (sliderWidth - 56) {
                                    sliderOffset = value.translation.width
                                }
                            }
                            .onEnded { value in
                                if sliderOffset > (sliderWidth - 80) {
                                    sliderOffset = sliderWidth - 56
                                    viewModel.confirmBatchCompletion()
                                    DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
                                        sliderOffset = 0
                                    }
                                } else {
                                    sliderOffset = 0
                                }
                            }
                    )
            }
        }
    }
    
    private var mixerFeedbackModal: some View {
        NavigationView {
            Form {
                Section(header: Text("Batch Compounding Quality")) {
                    Picker("Quality Rating", selection: $viewModel.feedbackQuality) {
                        Text("Grade A - Optimal").tag("Grade A - Optimal")
                        Text("Grade B - Acceptable").tag("Grade B - Acceptable")
                        Text("Rework Required").tag("Rework Required")
                    }
                    
                    Picker("Texture Evaluation", selection: $viewModel.feedbackTexture) {
                        Text("Smooth Homogeneous").tag("Smooth Homogeneous")
                        Text("Slightly Grainy").tag("Slightly Grainy")
                        Text("Too Dry").tag("Too Dry")
                        Text("Too Sticky").tag("Too Sticky")
                    }
                    
                    Stepper("Operator Rating: \(viewModel.feedbackRating) Stars", value: $viewModel.feedbackRating, in: 1...5)
                }
                
                Section(header: Text("Shift Remarks (Hindi/English)")) {
                    TextEditor(text: $viewModel.feedbackNotes)
                        .frame(height: 80)
                }
                
                Section {
                    Button("Submit Sign-Off & Dispatch") {
                        viewModel.submitMixerFeedbackAndComplete()
                    }
                    .foregroundColor(.green)
                }
            }
            .navigationTitle("Mixer Operator Sign-Off")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { viewModel.showMixerFeedbackModal = false }
                }
            }
        }
    }
}
