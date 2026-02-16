'use client';
import { motion } from 'framer-motion';
import { TrendingUp, Users, Clock, CheckCircle2, ArrowUpRight } from 'lucide-react';

export default function AdminDashboardPage() {
  const stats = [
    { label: 'Total Revenue', value: 'AED 12,450', icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-100/50', change: '+12%' },
    { label: 'Active Teams', value: '8 Teams', icon: Users, color: 'text-blue-600', bg: 'bg-blue-100/50', change: 'On track' },
    { label: 'Pending Tasks', value: '14 Units', icon: Clock, color: 'text-amber-600', bg: 'bg-amber-100/50', change: 'Needs Action' },
    { label: 'Completed Today', value: '26 Units', icon: CheckCircle2, color: 'text-purple-600', bg: 'bg-purple-100/50', change: '95% Goal' },
  ];

  return (
    <div className="space-y-8 max-w-[1600px] mx-auto">
      {/* Welcome Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Admin Dashboard</h1>
          <p className="text-gray-500 mt-1">Real-time overview of your cleaning operations.</p>
        </div>
        <button className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium shadow-lg shadow-blue-200 transition-all flex items-center gap-2">
          <ArrowUpRight size={18} /> Generate Report
        </button>
      </div>

      {/* Stats Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, idx) => (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            key={stat.label}
            className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all group"
          >
            <div className="flex justify-between items-start mb-4">
              <div className={`w-12 h-12 ${stat.bg} ${stat.color} rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform`}>
                <stat.icon size={24} strokeWidth={2.5} />
              </div>
              <span className={`text-xs font-bold px-2 py-1 rounded-full ${stat.change.includes('+') ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                {stat.change}
              </span>
            </div>
            <div>
              <p className="text-gray-500 text-sm font-medium">{stat.label}</p>
              <h3 className="text-2xl font-bold text-gray-800 mt-1">{stat.value}</h3>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Content Grid (Charts & Lists) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Chart Area */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-8 border border-gray-100 shadow-sm min-h-[400px]">
          <h3 className="text-lg font-bold text-gray-800 mb-6">Revenue Analytics</h3>
          <div className="w-full h-64 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400 border border-dashed border-gray-200">
            [Chart Component Will Go Here]
          </div>
        </div>

        {/* Recent Activity / Notifications */}
        <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm">
          <h3 className="text-lg font-bold text-gray-800 mb-6">Recent Activity</h3>
          <div className="space-y-6">
            {[1, 2, 3].map((_, i) => (
              <div key={i} className="flex gap-4 items-start">
                <div className="w-2 h-2 mt-2 rounded-full bg-blue-500 flex-shrink-0"></div>
                <div>
                  <p className="text-sm font-medium text-gray-800">New Booking Received</p>
                  <p className="text-xs text-gray-500 mt-1">From Arabian Coast • 2 mins ago</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
