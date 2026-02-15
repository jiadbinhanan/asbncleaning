import Sidebar from "@/components/admin/dashboard/Sidebar";
import { Search, Bell, UserCircle } from "lucide-react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <Sidebar />
      
      <div className="pl-72 flex flex-col min-h-screen">
        {/* Top Navigation */}
        <header className="h-20 bg-white/70 backdrop-blur-md border-b border-gray-100 px-8 flex items-center justify-between sticky top-0 z-30">
          <div className="relative w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Search anything..." 
              className="w-full pl-10 pr-4 py-2.5 bg-gray-100/50 border-none rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
            />
          </div>

          <div className="flex items-center gap-5">
            <button className="p-2.5 bg-white border border-gray-100 rounded-xl text-gray-500 hover:text-blue-600 hover:border-blue-100 transition-all relative">
              <Bell size={20} />
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
            </button>
            <div className="h-10 w-[1px] bg-gray-100 mx-1"></div>
            <div className="flex items-center gap-3 pl-2">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-bold text-gray-800">Admin User</p>
                <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest">Super Admin</p>
              </div>
              <div className="w-11 h-11 bg-gradient-to-tr from-blue-100 to-blue-50 rounded-xl flex items-center justify-center text-blue-600 border border-blue-100">
                <UserCircle size={28} />
              </div>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="p-8 flex-1">
          {children}
        </main>
      </div>
    </div>
  );
}
