import Navbar from "@/components/landing/Navbar";
import HeroSection from "@/components/landing/HeroSection";
import BookingForm from "@/components/landing/BookingForm";
import TeamLogin from "@/components/landing/TeamLogin";

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-50 font-sans selection:bg-blue-100 selection:text-blue-900">
      <Navbar />
      <HeroSection />
      
      {/* Booking Section with a Title */}
      <div id="booking" className="text-center pt-10">
        <h2 className="text-3xl font-bold text-gray-800">Request a Service</h2>
        <p className="text-gray-500 mt-2">We will confirm your slot shortly</p>
      </div>
      <BookingForm />

      <TeamLogin />
      
      {/* Simple Footer */}
      <footer className="py-8 text-center text-gray-400 text-sm bg-gray-900 border-t border-gray-800">
        © 2026 ASBN Cleaning Services. All rights reserved.
      </footer>
    </main>
  );
}