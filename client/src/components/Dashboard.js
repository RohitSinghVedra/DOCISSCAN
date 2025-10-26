import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';

const Dashboard = ({ user, onLogout }) => {
  const [googleConnected, setGoogleConnected] = useState(false);
  const [spreadsheetUrl, setSpreadsheetUrl] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    checkGoogleStatus();
  }, []);

  const checkGoogleStatus = async () => {
    try {
      const response = await axios.get('/api/google/status', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setGoogleConnected(response.data.connected);
      setSpreadsheetUrl(response.data.spreadsheetUrl);
    } catch (error) {
      console.error('Error checking Google status:', error);
    }
  };

  const handleGoogleConnect = async () => {
    try {
      const response = await axios.get('/api/google/oauth/url');
      window.location.href = response.data.url;
    } catch (error) {
      toast.error('Failed to initiate Google connection');
    }
  };

  const handleLogout = () => {
    onLogout();
    navigate('/login');
  };

  return (
    <div>
      <div className="header">
        <div className="header-content">
          <h2>📱 IDDocScan</h2>
          <button className="btn btn-secondary" onClick={handleLogout} style={{padding: '8px 16px', fontSize: '14px'}}>
            Logout
          </button>
        </div>
      </div>

      <div className="container">
        <div className="card">
          <h2 style={{marginBottom: '20px'}}>Welcome, {user?.email}</h2>
          
          <div style={{marginBottom: '24px'}}>
            <p style={{marginBottom: '10px'}}>Google Account Status:</p>
            <span className={`status-badge ${googleConnected ? 'connected' : 'disconnected'}`}>
              {googleConnected ? '✓ Connected' : '✗ Not Connected'}
            </span>
          </div>

          {!googleConnected && (
            <button className="btn btn-primary" onClick={handleGoogleConnect} style={{marginBottom: '24px'}}>
              Connect Google Account
            </button>
          )}

          {googleConnected && spreadsheetUrl && (
            <div style={{marginBottom: '24px', padding: '16px', background: '#e8f5e9', borderRadius: '8px'}}>
              <p style={{marginBottom: '10px', fontWeight: 600}}>📊 Your Document Sheet:</p>
              <button 
                className="btn btn-success" 
                onClick={() => window.open(spreadsheetUrl, '_blank')}
                style={{width: '100%'}}
              >
                Open Google Sheet
              </button>
            </div>
          )}
        </div>

        <div className="quick-actions">
          <div className="action-card" onClick={() => navigate('/scan')}>
            <div className="icon">📷</div>
            <h3>Scan Document</h3>
            <p>Camera or Upload</p>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Dashboard;
