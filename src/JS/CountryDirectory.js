// CountryDirectory.js
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../CSS/CountryDirectory.css';

const CountryDirectory = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  const countries = {
    "Austria": "https://flagcdn.com/at.svg",
    "Belgium": "https://flagcdn.com/be.svg",
    "Bulgaria": "https://flagcdn.com/bg.svg",
    "Croatia": "https://flagcdn.com/hr.svg",
    "Denmark": "https://flagcdn.com/dk.svg",
    "Estonia": "https://flagcdn.com/ee.svg",
    "Finland": "https://flagcdn.com/fi.svg",
    "France": "https://flagcdn.com/fr.svg",
    "Germany": "https://flagcdn.com/de.svg",
    "Greece": "https://flagcdn.com/gr.svg",
    "Hungary": "https://flagcdn.com/hu.svg",
    "Ireland": "https://flagcdn.com/ie.svg",
    "Italy": "https://flagcdn.com/it.svg",
    "Latvia": "https://flagcdn.com/lv.svg",
    "Lithuania": "https://flagcdn.com/lt.svg",
    "Luxembourg": "https://flagcdn.com/lu.svg",
    "Malta": "https://flagcdn.com/mt.svg",
    "Netherlands": "https://flagcdn.com/nl.svg",
    "Norway": "https://flagcdn.com/no.svg",
    "Poland": "https://flagcdn.com/pl.svg",
    "Portugal": "https://flagcdn.com/pt.svg",
    "Romania": "https://flagcdn.com/ro.svg",
    "Slovakia": "https://flagcdn.com/sk.svg",
    "Slovenia": "https://flagcdn.com/si.svg",
    "Spain": "https://flagcdn.com/es.svg",
    "Sweden": "https://flagcdn.com/se.svg"
  };

  const handleCountrySelect = (country) => {
    // navigate(`/country/${country.toLowerCase()}`);
    navigate(`/country`, { state: { selectedCountry: country } });
  };

  const filteredCountries = Object.entries(countries).filter(([country]) =>
    country.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="directory-container">
      <div className="directory-header">
        <h1>Analysis of EU energy data</h1>
        <p>Select a country to view detailed energy data analysis</p>
        
        <div className="search-container">
          <input
            type="text"
            placeholder="Search countries..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
      </div>
      
      <div className="countries-container">
        {filteredCountries.map(([country, flag]) => (
          <div 
            key={country}
            className="country-card"
            onClick={() => handleCountrySelect(country)}
          >
            <div className="card-content">
              <div className="flag-container">
                <img
                  src={flag}
                  alt={`${country} flag`}
                  className="flag-image"
                  loading="lazy"
                />
              </div>
              <h3 className="country-name">{country}</h3>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CountryDirectory;