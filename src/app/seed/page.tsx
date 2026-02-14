'use client';
import { createClient } from '@/utils/supabase/client';
import { useState } from 'react';

export default function SeedPage() {
  const supabase = createClient();
  const [status, setStatus] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  // আমাদের ইউজার লিস্ট
  const usersToCreate = [
    { email: 'admin@test.com', password: 'admin123', role: 'admin', username: 'admin' },
    { email: 'supervisor@test.com', password: 'spvr123', role: 'supervisor', username: 'supervisor' },
    { email: 'agent1@test.com', password: 'agent100', role: 'agent', username: 'agent1' },
    { email: 'agent2@test.com', password: 'agent200', role: 'agent', username: 'agent2' },
    { email: 'agent3@test.com', password: 'agent300', role: 'agent', username: 'agent3' },
    { email: 'agent4@test.com', password: 'agent400', role: 'agent', username: 'agent4' },
  ];

  const handleCreateUsers = async () => {
    setLoading(true);
    setStatus([]);
    
    for (const user of usersToCreate) {
      try {
        // ১. সাইন আপ (Sign Up)
        const { data, error } = await supabase.auth.signUp({
          email: user.email,
          password: user.password,
          options: {
            data: {
              role: user.role,
              username: user.username,
            },
          },
        });

        if (error) throw error;

        setStatus((prev) => [...prev, `✅ Created: ${user.username} (${user.role})`]);
        
        // ২. সাথে সাথে সাইন আউট করা যাতে পরের ইউজার ক্রিয়েট করা যায়
        await supabase.auth.signOut();
        
        // একটু বিরতি (Safety delay)
        await new Promise(r => setTimeout(r, 500));

      } catch (err: any) {
        setStatus((prev) => [...prev, `❌ Failed: ${user.username} - ${err.message}`]);
      }
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-10">
      <h1 className="text-3xl font-bold mb-6 text-blue-400">System User Generator</h1>
      
      <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 w-full max-w-lg">
        <p className="text-gray-300 mb-6">
          This tool will create the Admin, Supervisor, and 4 Agents automatically using the official Supabase SDK.
        </p>
        
        <button
          onClick={handleCreateUsers}
          disabled={loading}
          className="w-full py-3 bg-blue-600 hover:bg-blue-500 rounded-lg font-bold transition-all disabled:opacity-50"
        >
          {loading ? 'Creating Users...' : 'Start Creation Process'}
        </button>

        <div className="mt-6 space-y-2 h-64 overflow-y-auto bg-black/30 p-4 rounded-lg font-mono text-sm">
          {status.length === 0 && <span className="text-gray-500">Waiting to start...</span>}
          {status.map((msg, idx) => (
            <div key={idx} className={msg.includes('Failed') ? 'text-red-400' : 'text-green-400'}>
              {msg}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
