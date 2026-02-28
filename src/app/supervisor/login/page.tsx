'use client';
import { Suspense } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import SupervisorLoginHeader from '@/components/auth/SupervisorLoginHeader';
import SupervisorLoginForm from '@/components/auth/SupervisorLoginForm';

function SupervisorLoginContent() {
  return (
    <div className="min-h-screen flex">

      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-orange-800 to-amber-900 text-white items-center justify-center p-12">
        <div className="absolute top-0 left-0 w-full h-full opacity-20 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
        <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-white rounded-full mix-blend-overlay filter blur-[100px] opacity-20 animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-white rounded-full mix-blend-overlay filter blur-[100px] opacity-20 animate-pulse delay-700"></div>

        <div className="relative z-10 text-center space-y-6 max-w-lg">
          <h2 className="text-5xl font-extrabold tracking-tight">ASBN Cleaning</h2>
          <p className="text-xl text-white/80 font-light leading-relaxed">
            Monitor & Manage Teams with Supervisor Control.
          </p>
          <div className="pt-8">
            <span className="px-4 py-2 rounded-full border border-white/20 bg-white/10 backdrop-blur-md text-sm font-medium">
              Supervisor Access
            </span>
          </div>
        </div>
      </div>

      <div className="w-full lg:w-1/2 bg-white flex flex-col items-center justify-center p-6 sm:p-12 relative">

        <Link href="/" className="absolute top-8 left-8 p-2 rounded-full hover:bg-gray-100 text-gray-500 transition-colors">
          <ArrowLeft size={24} />
        </Link>

        <div className="w-full max-w-md space-y-8">
          <SupervisorLoginHeader />
          <SupervisorLoginForm />

          <p className="text-center text-xs text-gray-400 mt-10">
            Protected by 256-bit encrypted Auth & Cloud Security. <br />
            Problem logging in? Contact System Admin.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function SupervisorLoginPage() {
  return (
    <Suspense fallback={<div className="h-screen w-full flex items-center justify-center">Loading...</div>}>
      <SupervisorLoginContent />
    </Suspense>
  );
}