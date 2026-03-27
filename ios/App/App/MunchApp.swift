import SwiftUI

@main
struct MunchApp: App {
    @UIApplicationDelegateAdaptor(AppDelegate.self) private var appDelegate

    var body: some Scene {
        WindowGroup {
            MunchRootView()
        }
    }
}

private struct MunchRootView: View {
    var body: some View {
        ZStack {
            LinearGradient(
                colors: [
                    Color(red: 0.95, green: 0.98, blue: 0.93),
                    Color(red: 0.99, green: 0.96, blue: 0.89)
                ],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .ignoresSafeArea()

            CapacitorContainerView()
                .ignoresSafeArea()
        }
    }
}

private struct CapacitorContainerView: UIViewControllerRepresentable {
    func makeUIViewController(context: Context) -> CapacitorViewController {
        CapacitorViewController()
    }

    func updateUIViewController(_ uiViewController: CapacitorViewController, context: Context) {
    }
}
