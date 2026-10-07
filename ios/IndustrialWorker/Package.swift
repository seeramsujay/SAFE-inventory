// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "IndustrialWorker",
    platforms: [
        .iOS(.v16),
        .macOS(.v13)
    ],
    products: [
        .library(name: "IndustrialWorker", targets: ["IndustrialWorker"])
    ],
    targets: [
        .target(
            name: "IndustrialWorker",
            dependencies: [],
            path: "Sources"
        )
    ]
)
