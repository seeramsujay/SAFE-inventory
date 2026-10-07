// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "AdminMobile",
    platforms: [
        .iOS(.v16),
        .macOS(.v13)
    ],
    products: [
        .library(name: "AdminMobile", targets: ["AdminMobile"])
    ],
    targets: [
        .target(
            name: "AdminMobile",
            dependencies: [],
            path: "Sources"
        )
    ]
)
