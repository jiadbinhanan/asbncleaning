import Navbar from "@/components/landing/Navbar";
import HeroSection from "@/components/landing/HeroSection";
import StatsSection from "@/components/landing/StatsSection";
import AboutAndFeatures from "@/components/landing/AboutAndFeatures";
import Testimonials from "@/components/landing/Testimonials";
import BookingForm from "@/components/landing/BookingForm";
import TeamLogin from "@/components/landing/TeamLogin";
import Footer from "@/components/landing/Footer";

export default function Home() {
  return (
    // স্মুথ স্ক্রলিং এবং ওভারঅল ব্যাকগ্রাউন্ড (Smooth scrolling and overall background)
    <main className="min-h-screen bg-[#FDFBF7] font-sans selection:bg-cyan-200 selection:text-cyan-900 scroll-smooth overflow-x-hidden">

      {/* 1. Navigation */}
      <Navbar />

      {/* 2. Hero Section (First Impression) */}
      <HeroSection />

      {/* 3. Company Stats (Trust Builder) */}
      <StatsSection />

      {/* 4. About, Why Choose Us & Before-After Slider */}
      <AboutAndFeatures />

      {/* 5. Fake Reviews / Testimonials */}
      <Testimonials />

      {/* 6. Premium Booking Form */}
      <BookingForm />

      {/* 7. Internal Staff Portal Login (Just before Footer) */}
      <TeamLogin />

      {/* 8. Footer */}
      <Footer />

    </main>
  );
}