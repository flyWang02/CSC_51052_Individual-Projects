import React, { useState, useEffect } from 'react';
import '../CSS/CountryDashboard.css';
import EnergyCharts from './EnergyCharts';
import allDataFile from '../data/csv/ALLdata.csv';  


const CountryDashboard = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCountry, setSelectedCountry] = useState(null);
    const [countryData, setCountryData] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [fullData, setFullData] = useState(null);
  
    useEffect(() => {
      const loadData = async () => {
        try {
          const response = await fetch(allDataFile);
          const text = await response.text();
          console.log('Loaded CSV data sample:', text.slice(0, 200)); 
          setFullData(text);
        } catch (err) {
          console.error('Error loading CSV:', err);
          setError('Failed to load energy data file');
        }
      };
  
      loadData();
    }, []);
  

    const filterDataByCountry = (data, country) => {
      if (!data) return null;
      
      const rows = data.split('\n');
      const header = rows[0];
      const countryRows = rows.filter((row, index) => {
        if (index === 0) return true; 
        const columns = row.split(',');
        return columns[6] && columns[6].includes(country);
      });
      
      if (countryRows.length <= 1) {
        console.warn(`No data found for ${country}`);
        return null;
      }
  
      const filteredData = [header, ...countryRows.slice(1)].join('\n');
      console.log('Filtered data sample:', filteredData.slice(0, 200));
      return filteredData;
    };
  
    const handleCountrySelect = async (country) => {
      setIsLoading(true);
      setError(null);
      setSelectedCountry(country);
  
      try {
        if (!fullData) {
          throw new Error('Data not loaded yet');
        }
  
        const filteredData = filterDataByCountry(fullData, country);
        if (filteredData) {
          setCountryData(filteredData);
        } else {
          throw new Error(`No data available for ${country}`);
        }
      } catch (err) {
        console.error('Error processing country data:', err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };
  
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
  
    const filteredCountries = Object.entries(countries).filter(([country]) =>
      country.toLowerCase().includes(searchTerm.toLowerCase())
    );
  
    return (
      <div className="dashboard">
        <div className="dashboard-sidebar">
          <div className="dashboard-header">
            <h1>Analysis of EU energy data</h1>
            <p>Select a country to view detailed energy data analysis</p>
            
            <div className="search-box">
              <input
                type="text"
                placeholder="Search countries..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
            </div>
          </div>
          
          <div className="countries-grid">
            {filteredCountries.map(([country, flag]) => (
              <div 
                key={country}
                className={`country-card ${selectedCountry === country ? 'selected' : ''}`}
                onClick={() => handleCountrySelect(country)}
              >
                <div className="country-content">
                  <div className="flag-wrapper">
                    <img
                      src={flag}
                      alt={`${country} flag`}
                      className="flag"
                      loading="lazy"
                    />
                  </div>
                  <h3 className="country-name">{country}</h3>
                </div>
              </div>
            ))}
          </div>
        </div>
  
        <div className="dashboard-content">
        {!selectedCountry ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-500 text-lg">Please select a country to view detailed data</p>
          </div>
        ) : isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center space-y-4">
              <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-gray-600">Loading energy data for {selectedCountry}...</p>
            </div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-red-500 space-y-2">
              <p className="text-lg">Data loading failure</p>
              <p className="text-sm">{error}</p>
              <button 
                onClick={() => handleCountrySelect(selectedCountry)}
                className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
              >
                retry
              </button>
            </div>
          </div>
        ) : countryData ? (
          <div className="h-full overflow-auto">
            <div className="p-6">
              <div className="flex items-center space-x-4 mb-8">
                <h1 className="text-2xl font-bold">{selectedCountry}</h1>
                <h2 >Energy data analysis</h2>
              </div>
              <EnergyCharts countryData={countryData} />
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default CountryDashboard;