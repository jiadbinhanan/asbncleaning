'use client';
import { motion } from 'framer-motion';
import { TrendingUp, Users, Clock, CheckCircle2 } from 'lucide-react';

const stats = [
  { label: 'Total Revenue', value: 'AED 12,450', icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-50' },
  { label: 'Active Teams', value: '8 Teams', icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
  { label: 'Pending Tasks', value: '14', icon: Clock, color: 'text-orange-600', bg: 'bg-orange-50' },
  { label: 'Completed Today', value: '26 Units', icon: CheckCircle2, color: 'text-purple-600', bg: 'bg-purple-50' },
];

export default function AdminDashboard() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard Overview</h1>
        <p className="text-gray-500 mt-1">Welcome back! Here's what's happening today.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, idx) => (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            key={stat.label}
            className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow group"
          >
            <div className={`w-12 h-12 ${stat.bg} ${stat.color} rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
              <stat.icon size={24} />
            </div>
            <p className="text-gray-500 text-sm font-medium">{stat.label}</p>
            <h3 className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</h3>
          </motion.div>
        ))}
      </div>

      {/* Placeholder for Charts or Recent Work Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 h-96 bg-white rounded-3xl border border-gray-100 shadow-sm flex items-center justify-center text-gray-400">
          Activity Chart Placeholder
        </div>
        <div className="h-96 bg-white rounded-3xl border border-gray-100 shadow-sm flex items-center justify-center text-gray-400">
          Recent Notifications
        </div>
      </div>
    </div>
  );
}
