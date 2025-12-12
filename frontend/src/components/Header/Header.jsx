import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './Header.css';

const Header = () => {
  const { user, logout, isSuperManager, isGatewayEditor } = useAuth();
  const navigate = useNavigate();
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleLogout = () => {
    logout();
    setShowDropdown(false);
    navigate('/login');
  };

  const getInitials = (username) => {
    if (!username) return 'U';
    return username.charAt(0).toUpperCase();
  };

  return (
    <header className="header">
      <div className="header-container">
        <div className="header-left">
          <h1 className="header-title">Alpaka</h1>
        </div>
        <div className="header-right">
          <nav className="header-nav">
            {isSuperManager && (
              <button
                className="header-button"
                onClick={() => navigate('/approvals')}
              >
                Approvals
              </button>
            )}
            {isGatewayEditor && (
              <>
                <button
                  className="header-button"
                  onClick={() => navigate('/teams')}
                >
                  Teams
                </button>
                <button
                  className="header-button"
                  onClick={() => navigate('/execution')}
                >
                  Execution
                </button>
              </>
            )}
            <button className="header-button">Notifications</button>
            <button className="header-button">Settings</button>
            <div className="header-profile" ref={dropdownRef}>
              <div 
                className="profile-avatar" 
                onClick={() => setShowDropdown(!showDropdown)}
                style={{ cursor: 'pointer' }}
              >
                {getInitials(user?.username)}
              </div>
              {showDropdown && (
                <div className="profile-dropdown">
                  <div className="dropdown-user-info">
                    <div className="dropdown-username">{user?.username}</div>
                    <div className="dropdown-email">{user?.email}</div>
                  </div>
                  <div className="dropdown-divider"></div>
                  <button className="dropdown-item" onClick={handleLogout}>
                    Sign out
                  </button>
                </div>
              )}
            </div>
          </nav>
        </div>
      </div>
    </header>
  );
};

export default Header;

