import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import '../CSS/Navbar.css';

const Navbar = () => {
  const location = useLocation();
  
  return (
    <nav className="navbar">
      <div className="navbar-container">
        <div className="navbar-logo">
          EU Energy Data
        </div>
        <div className="navbar-links">
          <Link 
            to="/" 
            className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}
          >
            Directory
          </Link>
          <Link 
            to="/country" 
            className={`nav-link ${location.pathname.includes('/country') ? 'active' : ''}`}
          >
            Dashboard
          </Link>
          <a 
            href="../html/Year.html" 
            className="nav-link"
            target="_blank"
            rel="noopener noreferrer"
          >
            EU Electricity
          </a>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;