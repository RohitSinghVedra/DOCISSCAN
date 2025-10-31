import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { initGoogleAPI, signInGoogle, isSignedIn, createSpreadsheet } from '../services/googleAuth';
import { db } from '../firebase-config';

const Dashboard = ({ user, onLogout }) => {
  const [googleConnected, setGoogleConnected] = useState(false);
  const [spreadsheetUrl, setSpreadsheetUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    checkGoogleStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const checkGoogleStatus = async () => {
    try {
      await initGoogleAPI();
      const signedIn = isSignedIn();
      setGoogleConnected(signedIn);

      if (signedIn) {
        // Check if user has a spreadsheet in Firestore
        const userDoc = await db.collection('users').doc(user.id).get();
        if (userDoc.exists && userDoc.data().spreadsheetUrl) {
          setSpreadsheetUrl(userDoc.data().spreadsheetUrl);
        }
      }
    } catch (error) {
      console.error('Error checking Google status:', error);
      // If Google API not loaded yet, that's okay - user hasn't connected yet
    }
  };

  const handleGoogleConnect = async () => {
    setLoading(true);
    try {
      // Sign in to Google using OAuth 2.0
      const response = await signInGoogle();
      
      if (response && response.accessToken) {
        // Check if user already has a spreadsheet
        const userDoc = await db.collection('users').doc(user.id).get();
        
        let spreadsheetId, spreadsheetUrl;
        
        if (userDoc.exists && userDoc.data().spreadsheetId) {
          // Use existing spreadsheet
          spreadsheetId = userDoc.data().spreadsheetId;
          spreadsheetUrl = userDoc.data().spreadsheetUrl;
        } else {
          // Create new spreadsheet
          const result = await createSpreadsheet();
          spreadsheetId = result.spreadsheetId;
          spreadsheetUrl = result.spreadsheetUrl;
          
          // Save to Firestore
          await db.collection('users').doc(user.id).set({
            googleConnected: true,
            spreadsheetId,
            spreadsheetUrl,
            updatedAt: new Date()
          }, { merge: true });
        }
        
        setGoogleConnected(true);
        setSpreadsheetUrl(spreadsheetUrl);
        toast.success('Google account connected successfully!');
      }
    } catch (error) {
      console.error('Error connecting Google:', error);
      toast.error(error.message || 'Failed to connect Google account');
    } finally {
      setLoading(false);
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
            <button 
              className="btn btn-primary" 
              onClick={handleGoogleConnect} 
              disabled={loading}
              style={{marginBottom: '24px'}}
            >
              {loading ? 'Connecting...' : 'Connect Google Account'}
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
