import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import CountryDirectory from './JS/CountryDirectory';
import CountryDashboard from './JS/CountryDashboard';
import Navbar from './JS/Navbar';
function App() {
  return (
    <BrowserRouter>
      <div className="app">
        <Navbar />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<CountryDirectory />} />
            <Route path="/country" element={<CountryDashboard />} />
            <Route path="/country/:countryId" element={<CountryDashboard />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;