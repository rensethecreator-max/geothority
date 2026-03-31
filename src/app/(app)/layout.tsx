import { AppSidebar } from "@/components/layout/app-sidebar";
import { WillChatbot } from "@/components/chat/will-chatbot";
import { ErrorBoundary } from "@/components/shared/error-boundary";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--background)]">
      <AppSidebar />
      <main className="lg:pl-64 pt-14 lg:pt-0">
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
          <ErrorBoundary>{children}</ErrorBoundary>
        </div>
      </main>
      <WillChatbot />
    </div>
  );
}
