'use client';
import { motion } from 'framer-motion';
import { TrendingUp, Users, Clock, CheckCircle2, ArrowUpRight, UserCog } from 'lucide-react';

export default function SupervisorDashboardPage() {
  const stats = [
    { label: 'My Teams', value: '3 Teams', icon: Users, color: 'text-blue-600', bg: 'bg-blue-100/50', change: 'Active' },
    { label: 'Pending Tasks', value: '8 Units', icon: Clock, color: 'text-amber-600', bg: 'bg-amber-100/50', change: 'Needs Action' },
    { label: 'Completed Today', value: '12 Units', icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-100/50', change: 'On Track' },
    { label: 'Team Performance', value: '94%', icon: TrendingUp, color: 'text-purple-600', bg: 'bg-purple-100/50', change: '+5%' },
  ];

  return (
    <div className="space-y-8 max-w-[1600px] mx-auto">
      {/* Welcome Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Supervisor Dashboard</h1>
          <p className="text-gray-500 mt-1">Monitor your teams and manage daily operations.</p>
        </div>
        <button className="px-5 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-medium shadow-lg shadow-orange-200 transition-all flex items-center gap-2">
          <ArrowUpRight size={18} /> View Team Reports
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

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-orange-100 text-orange-600 rounded-xl flex items-center justify-center">
              <UserCog size={24} />
            </div>
            <div>
              <h3 className="font-semibold text-gray-800">Manage Teams</h3>
              <p className="text-sm text-gray-500">Assign tasks and monitor progress</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center">
              <Clock size={24} />
            </div>
            <div>
              <h3 className="font-semibold text-gray-800">Daily Schedule</h3>
              <p className="text-sm text-gray-500">View and update team schedules</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-green-100 text-green-600 rounded-xl flex items-center justify-center">
              <CheckCircle2 size={24} />
            </div>
            <div>
              <h3 className="font-semibold text-gray-800">Task Completion</h3>
              <p className="text-sm text-gray-500">Review and approve completed work</p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}