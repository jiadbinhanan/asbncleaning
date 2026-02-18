'use client';
import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import AgentSidebar from '@/components/agent/dashboard/Sidebar';
import AgentTopNav from '@/components/agent/TopNav';
import { createClient } from '@/utils/supabase/client';

export default function AgentLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isLoginPage = pathname === '/agent/login';

  // Mobile: Sidebar default CLOSED (false)
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Desktop: Sidebar default OPEN (false means NOT collapsed)
  const [isDesktopCollapsed, setIsDesktopCollapsed] = useState(false);

  useEffect(() => {
    if (isLoginPage) return;

    const checkAuth = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push('/agent/login');
        return;
      }

      // Check role
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (!profile || profile.role !== 'agent') {
        // Redirect to appropriate login based on their role
        if (profile?.role === 'admin') {
          router.push('/admin/login');
        } else if (profile?.role === 'supervisor') {
          router.push('/supervisor/login');
        } else {
          router.push('/login');
        }
      }
    };

    checkAuth();
  }, [pathname, router, isLoginPage]);

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