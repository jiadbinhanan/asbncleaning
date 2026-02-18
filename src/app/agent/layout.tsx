'use client';
import { useState } from 'react';
import { usePathname } from 'next/navigation';
import AgentSidebar from '@/components/agent/dashboard/Sidebar';
import AgentTopNav from '@/components/agent/TopNav';

export default function AgentLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === '/agent/login';

  // Mobile: Sidebar default CLOSED (false)
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Desktop: Sidebar default OPEN (false means NOT collapsed)
  const [isDesktopCollapsed, setIsDesktopCollapsed] = useState(false);

  if (isLoginPage) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-[#F3F4F6] flex relative">

      {/* Sidebar Component */}
      <AgentSidebar
        isMobileOpen={isMobileOpen}
        setIsMobileOpen={setIsMobileOpen}
        isDesktopCollapsed={isDesktopCollapsed}
        setIsDesktopCollapsed={setIsDesktopCollapsed}
      />

      {/* Main Content Area */}
      <div
        className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ease-in-out
          ${/* Mobile: Always full width, no margin needed as sidebar is overlay */ ''}
          w-full

          ${/* Desktop: Adjust margin based on sidebar state */ ''}
          ${isDesktopCollapsed ? 'md:ml-20' : 'md:ml-72'}
        `}
      >
        <AgentTopNav onMenuClick={() => setIsMobileOpen(true)} />

        <main className="p-4 md:p-8 overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}