import { Link } from 'react-router-dom';
import { Store, Bell, User, Settings } from 'lucide-react';
import './Navbar.css';

const Navbar = () => {
  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <Store className="brand-icon" />
        <span className="brand-text">Dark Store Intelligence</span>
      </div>
      
      <div className="navbar-actions">
        <button className="icon-button" title="Notifications">
          <Bell size={20} />
          <span className="badge">3</span>
        </button>
        
        <button className="icon-button" title="Settings">
          <Settings size={20} />
        </button>
        
        <div className="user-menu">
          <button className="user-button">
            <User size={20} />
            <span>Admin</span>
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
