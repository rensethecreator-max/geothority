import { AppSidebar } from "@/components/layout/app-sidebar";
import { ErrorBoundary } from "@/components/shared/error-boundary";
import FloatingHelpChat from "@/components/saas/FloatingHelpChat";
// WillChatbot is rendered in the root layout (app/layout.tsx) so it is
// available on both the public marketing site and the app without duplication.
// WelcomeFlow is only rendered on /dashboard — not here in the layout

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--background)]">
      <AppSidebar />
      <main className="lg:pl-64 pt-14 lg:pt-0">
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
          <ErrorBoundary>{children}</ErrorBoundary>
        </div>
      </main>
      <FloatingHelpChat />
    </div>
  );
}
