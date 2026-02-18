'use client';
import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Sidebar from '@/components/admin/dashboard/Sidebar';
import TopNav from '@/components/admin/TopNav';
import { createClient } from '@/utils/supabase/client';

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
      <div className="min-h-screen bg-[#F3F4F6] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Verifying access...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F3F4F6] flex relative">
      
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
          ${/* Mobile: Always full width, no margin needed as sidebar is overlay */ ''}
          w-full
          
          ${/* Desktop: Adjust margin based on sidebar state */ ''}
          ${isDesktopCollapsed ? 'md:ml-20' : 'md:ml-72'}
        `}
      >
        <TopNav onMenuClick={() => setIsMobileOpen(true)} />

        <main className="p-4 md:p-8 overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
