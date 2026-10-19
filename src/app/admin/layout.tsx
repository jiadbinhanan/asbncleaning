'use client';
import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Sidebar from '@/components/admin/dashboard/Sidebar';
import TopNav from '@/components/admin/TopNav';
import { createClient } from '@/utils/supabase/client';

// Import the global modals
import TeamsManagerModal from '@/components/admin/TeamsManagerModal';
import BookingsManagerModal from '@/components/admin/BookingsManagerModal';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isLoginPage = pathname === '/admin/login';
  const [isLoading, setIsLoading] = useState(!isLoginPage);

  // Mobile: Sidebar default CLOSED (false)
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Desktop: Sidebar default OPEN (false means NOT collapsed)
  const [isDesktopCollapsed, setIsDesktopCollapsed] = useState(false);

  useEffect(() => {
    if (isLoginPage) return;

    const checkAuth = async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          router.push('/admin/login');
          return;
        }

        // Check role
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();

        if (!profile || profile.role !== 'admin') {
          // Redirect to appropriate login based on their role
          if (profile?.role === 'supervisor') {
            router.push('/supervisor/login');
          } else if (profile?.role === 'agent') {
            router.push('/agent/login');
          } else {
            router.push('/login');
          }
          return;
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        router.push('/admin/login');
        return;
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [pathname, router, isLoginPage]);

  if (isLoginPage) {
    return <>{children}</>;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F3F4F6] dark:bg-[#070b14] flex items-center justify-center transition-colors duration-300">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-slate-400 font-medium text-sm">Verifying access...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F3F4F6] dark:bg-[#070b14] text-slate-900 dark:text-slate-100 flex relative transition-colors duration-300">

      {/* Static GPU-friendly ambient background glows (Dark mode only) */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0 hidden dark:block opacity-35">
        <div className="absolute -top-32 right-1/4 w-[600px] h-[600px] bg-blue-900/10 rounded-full blur-[140px]" />
        <div className="absolute top-1/2 left-1/3 w-[500px] h-[500px] bg-indigo-950/15 rounded-full blur-[150px]" />
        <div className="absolute bottom-10 right-10 w-[550px] h-[550px] bg-cyan-950/10 rounded-full blur-[130px]" />
      </div>

      {/* Sidebar Component */}
      <Sidebar 
        isMobileOpen={isMobileOpen} 
        setIsMobileOpen={setIsMobileOpen}
        isDesktopCollapsed={isDesktopCollapsed}
        setIsDesktopCollapsed={setIsDesktopCollapsed}
      />

      {/* Main Content Area */}
      <div 
        className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ease-in-out
          ${/* Desktop: Adjust margin based on sidebar state so it doesn't overlap content */ ''}
          ${isDesktopCollapsed ? 'md:ml-[64px]' : 'md:ml-[210px]'}
        `}
      >
        <TopNav onMenuClick={() => setIsMobileOpen(true)} />

        {/* Padding and Margin set to 0 completely */}
        <main className="p-0 m-0 overflow-x-hidden">
          {children}
        </main>
      </div>

      {/* Global Modals (Accessible from anywhere via TopNav) */}
      <TeamsManagerModal />
      <BookingsManagerModal />

    </div>
  );
}