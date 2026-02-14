import React from 'react';

const HeroSection = () => {
  return (
    <div className="bg-gray-900 text-white text-center p-20">
      <h1 className="text-5xl font-bold mb-4">Welcome to Our Website</h1>
      <p className="text-xl mb-8">We offer the best services in the industry.</p>
      <a href="/booking" className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
        Book Now
      </a>
    </div>
  );
};

export default HeroSection;