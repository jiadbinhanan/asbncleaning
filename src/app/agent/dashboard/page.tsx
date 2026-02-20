'use client';
import { motion } from 'framer-motion';
import { Calendar, Clock, CheckCircle2, DollarSign, ArrowUpRight } from 'lucide-react';

export default function AgentDashboardPage() {
  const stats = [
    { label: "Today's Tasks", value: '5 Units', icon: Calendar, color: 'text-blue-600', bg: 'bg-blue-100/50', change: '3 Completed' },
    { label: 'Hours Worked', value: '6.5 hrs', icon: Clock, color: 'text-amber-600', bg: 'bg-amber-100/50', change: 'This Week' },
    { label: 'Tasks Completed', value: '23 Units', icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-100/50', change: 'This Month' },
    { label: 'Earnings', value: 'AED 850', icon: DollarSign, color: 'text-purple-600', bg: 'bg-purple-100/50', change: '+12%' },
  ];

  const todaysTasks = [
    { id: 1, unit: 'Villa A-101', time: '09:00 AM', status: 'completed', type: 'Deep Clean' },
    { id: 2, unit: 'Apartment B-205', time: '11:30 AM', status: 'in-progress', type: 'Standard Clean' },
    { id: 3, unit: 'Office C-12', time: '02:00 PM', status: 'pending', type: 'Office Clean' },
    { id: 4, unit: 'Villa D-45', time: '04:30 PM', status: 'pending', type: 'Deep Clean' },
    { id: 5, unit: 'Apartment E-78', time: '06:00 PM', status: 'pending', type: 'Standard Clean' },
  ];

  return (
    <div className="space-y-8 max-w-[1600px] mx-auto">
      {/* Welcome Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Agent Dashboard</h1>
          <p className="text-gray-500 mt-1">Track your daily tasks and performance.</p>
        </div>
        <button className="px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl font-medium shadow-lg shadow-green-200 transition-all flex items-center gap-2">
          <ArrowUpRight size={18} /> View Full History
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

      {/* Today's Tasks */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-6">Today&apos;s Schedule</h2>
        <div className="space-y-4">
          {todaysTasks.map((task, idx) => (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.1 }}
              key={task.id}
              className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className={`w-3 h-3 rounded-full ${
                  task.status === 'completed' ? 'bg-green-500' :
                  task.status === 'in-progress' ? 'bg-blue-500' : 'bg-gray-400'
                }`} />
                <div>
                  <h3 className="font-semibold text-gray-800">{task.unit}</h3>
                  <p className="text-sm text-gray-500">{task.type}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-medium text-gray-800">{task.time}</p>
                <p className={`text-xs capitalize ${
                  task.status === 'completed' ? 'text-green-600' :
                  task.status === 'in-progress' ? 'text-blue-600' : 'text-gray-500'
                }`}>
                  {task.status.replace('-', ' ')}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}