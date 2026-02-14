
import React from 'react';

const Navbar = () => {
  return (
    <nav className="bg-gray-800 text-white p-4">
      <div className="container mx-auto flex justify-between">
        <div className="text-lg font-bold">
          <a href="/">MyApp</a>
        </div>
        <div>
          <a href="/about" className="px-3 hover:text-gray-300">About</a>
          <a href="/contact" className="px-3 hover:text-gray-300">Contact</a>
          <a href="/login" className="px-3 hover:text-gray-300">Login</a>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
