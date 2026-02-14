'use client';
import { motion } from 'framer-motion';
import { ShieldCheck, UserCog, User, Users } from 'lucide-react';

type RoleType = 'admin' | 'supervisor' | 'agent' | 'team';

interface LoginHeaderProps {
  role: RoleType;
}

export default function LoginHeader({ role }: LoginHeaderProps) {
  const roleConfig = {
    admin: {
      title: 'Admin Portal',
      subtitle: 'Master Control Panel',
      icon: <ShieldCheck size={40} className="text-purple-500" />,
      color: 'from-purple-500 to-indigo-600',
    },
    supervisor: {
      title: 'Supervisor Access',
      subtitle: 'Monitor & Manage Tasks',
      icon: <UserCog size={40} className="text-orange-500" />,
      color: 'from-orange-500 to-amber-600',
    },
    agent: {
      title: 'Agent Profile',
      subtitle: 'Personal Work History',
      icon: <User size={40} className="text-green-500" />,
      color: 'from-green-500 to-emerald-600',
    },
    team: {
      title: 'Team Login',
      subtitle: 'Daily Operations Start Here',
      icon: <Users size={40} className="text-blue-500" />,
      color: 'from-blue-500 to-cyan-500',
    },
  };

  const config = roleConfig[role] || roleConfig.agent;

  return (
    <div className="text-center space-y-4 mb-8">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15 }}
        className={`mx-auto w-20 h-20 rounded-2xl bg-gradient-to-tr ${config.color} p-0.5 shadow-xl`}
      >
        <div className="w-full h-full bg-white rounded-[14px] flex items-center justify-center">
          {config.icon}
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <h1 className="text-3xl font-bold text-gray-800">{config.title}</h1>
        <p className="text-gray-500 text-sm mt-1 uppercase tracking-wider font-medium">
          {config.subtitle}
        </p>
      </motion.div>
    </div>
  );
}
