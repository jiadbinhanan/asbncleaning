import Navbar from "@/components/landing/Navbar";
import HeroSection from "@/components/landing/HeroSection";
import BookingForm from "@/components/landing/BookingForm";
import TeamLogin from "@/components/landing/TeamLogin";
import Footer from '@/components/landing/Footer';

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-50 font-sans selection:bg-blue-100 selection:text-blue-900">
      <Navbar />
      <HeroSection />
      
      {/* Booking Section with a Title */}
      
      <BookingForm />

      <TeamLogin />
      
      <Footer />
    </main>
  );
}