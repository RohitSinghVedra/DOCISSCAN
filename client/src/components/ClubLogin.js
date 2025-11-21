import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { authenticateClub } from '../services/adminService';
import './Login.css';

const ClubLogin = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const club = await authenticateClub(username, password);
      
      // Store club session
      const clubSession = {
        id: club.id,
        name: club.name,
        username: club.username,
        gmail: club.gmail,
        spreadsheetId: club.spreadsheetId,
        spreadsheetUrl: club.spreadsheetUrl,
        userType: 'club'
      };

      onLogin(null, clubSession); // No Firebase token for club users
      toast.success(`Welcome, ${club.name}!`);
      navigate('/dashboard');
    } catch (error) {
      console.error('Login error:', error);
      toast.error(error.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="container">
        <div className="card">
          <div className="card-header">
            <h1>📱 IDDocScan</h1>
            <p>Nightclub Login</p>
            <p style={{fontSize: '14px', color: '#666', marginTop: '8px'}}>
              Mandatory ID scanning for all visitors
            </p>
          </div>
          
          <form onSubmit={handleSubmit} style={{padding: '20px'}}>
            <div className="form-group">
              <label>Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                placeholder="Enter your club username"
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label>Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Enter your password"
                disabled={loading}
              />
            </div>

            <button 
              type="submit" 
              className="btn btn-primary" 
              disabled={loading}
              style={{width: '100%', marginTop: '20px'}}
            >
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>

          <div style={{textAlign: 'center', padding: '20px', borderTop: '1px solid #e0e0e0'}}>
            <p style={{color: '#666', fontSize: '14px'}}>
              Admin? <a href="/admin-login" style={{color: '#667eea'}}>Admin Login</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClubLogin;

