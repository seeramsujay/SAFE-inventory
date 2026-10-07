import SwiftUI

public struct AdminLogsView: View {
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
                    // Header
                    HStack {
                        VStack(alignment: .leading, spacing: 2) {
                            Text("QUALITY & BATCH LOGS")
                                .font(.system(size: 20, weight: .black, design: .monospaced))
                                .foregroundColor(.white)
                            Text("Operator Feedback & Traceability Audit")
                                .font(.caption)
                                .foregroundColor(.gray)
                        }
                        Spacer()
                    }
                    .padding(.horizontal)
                    .padding(.top, 10)
                    
                    if viewModel.batchLogs.isEmpty {
                        VStack(spacing: 8) {
                            Image(systemName: "list.clipboard")
                                .font(.system(size: 32))
                                .foregroundColor(.gray)
                            Text("NO BATCH LOGS RECORDED")
                                .font(.system(size: 13, weight: .bold, design: .monospaced))
                                .foregroundColor(.gray)
                        }
                        .frame(maxWidth: .infinity)
                        .padding(40)
                        .background(Color(red: 0.12, green: 0.14, blue: 0.2))
                        .cornerRadius(12)
                        .padding(.horizontal)
                    } else {
                        ForEach(viewModel.batchLogs) { log in
                            batchLogCard(log: log)
                        }
                        .padding(.horizontal)
                    }
                }
                .padding(.bottom, 24)
            }
        }
    }
    
    private func batchLogCard(log: AdminBatchLog) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text(log.productNameHindi)
                        .font(.system(size: 15, weight: .bold))
                        .foregroundColor(.white)
                    Text("\(log.productNameEnglish) • \(log.line)")
                        .font(.caption)
                        .foregroundColor(.gray)
                }
                Spacer()
                
                Text(log.status.uppercased())
                    .font(.system(size: 10, weight: .bold, design: .monospaced))
                    .padding(.horizontal, 6)
                    .padding(.vertical, 3)
                    .background(Color.green.opacity(0.2))
                    .foregroundColor(.green)
                    .cornerRadius(4)
            }
            
            HStack {
                Text(log.batchId)
                    .font(.system(size: 12, weight: .black, design: .monospaced))
                    .foregroundColor(.cyan)
                
                if let stage = log.stage {
                    Text("• Stage: \(stage.capitalized)")
                        .font(.caption2)
                        .foregroundColor(stage == "grinder" ? .orange : .cyan)
                }
                
                Spacer()
                
                Text("\(log.unitsProduced) kg")
                    .font(.system(size: 14, weight: .bold, design: .monospaced))
                    .foregroundColor(.white)
            }
            
            // Operator Sign-Off Feedback details if present
            if let quality = log.feedbackQuality {
                VStack(alignment: .leading, spacing: 4) {
                    Divider().background(Color.white.opacity(0.1))
                    
                    HStack {
                        Text("Quality: \(quality)")
                            .font(.caption2)
                            .foregroundColor(.green)
                        
                        if let rating = log.feedbackRating {
                            Spacer()
                            Text(String(repeating: "★", count: rating))
                                .font(.caption2)
                                .foregroundColor(.yellow)
                        }
                    }
                    
                    if let texture = log.feedbackTexture {
                        Text("Texture: \(texture)")
                            .font(.caption2)
                            .foregroundColor(.gray)
                    }
                    
                    if let notes = log.feedbackNotes, !notes.isEmpty {
                        Text("“\(notes)”")
                            .font(.caption)
                            .italic()
                            .foregroundColor(.gray.opacity(0.9))
                    }
                }
            }
        }
        .padding(14)
        .background(Color(red: 0.12, green: 0.14, blue: 0.2))
        .cornerRadius(10)
    }
}
