import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { initGoogleAPI, signInGoogle, isSignedIn, createSpreadsheet, setClubAccessToken } from '../services/googleAuth';
import { db } from '../firebase-config';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { getClubById } from '../services/adminService';

const Dashboard = ({ user, onLogout }) => {
  const [googleConnected, setGoogleConnected] = useState(false);
  const [spreadsheetUrl, setSpreadsheetUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const isClubUser = user?.userType === 'club';

  useEffect(() => {
    checkGoogleStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const checkGoogleStatus = async () => {
    try {
      await initGoogleAPI();

      // For club users, use their pre-configured Gmail account
      if (isClubUser) {
        const club = await getClubById(user.id);
        
        if (club && club.gmailAccessToken) {
          try {
            // Set both access token and refresh token
            await setClubAccessToken(club.gmailAccessToken, club.gmailRefreshToken || null);
            setGoogleConnected(true);
            
            // Use club's spreadsheet if available
            if (club.spreadsheetId && club.spreadsheetUrl) {
              setSpreadsheetUrl(club.spreadsheetUrl);
            } else {
              // Create spreadsheet for club if it doesn't exist
              await initializeClubSpreadsheet(club);
            }
          } catch (error) {
            console.error('Error using club token:', error);
            const errorMsg = error?.message || 'Unknown error';
            if (errorMsg.includes('refresh') || errorMsg.includes('401') || errorMsg.includes('expired')) {
              toast.error('OAuth token expired. Please contact admin to regenerate tokens using OAuth Playground.');
            } else {
              toast.error(`Failed to connect to club Gmail account: ${errorMsg}`);
            }
          }
          } else {
            toast.warning('Nightclub Gmail account not configured. Please contact admin to add OAuth tokens.');
          }
      } else {
        // Regular user flow
        const signedIn = isSignedIn();
        setGoogleConnected(signedIn);

        if (signedIn) {
          // Check if user has a spreadsheet in Firestore
          const userDocRef = doc(db, 'users', user.id);
          const userDoc = await getDoc(userDocRef);
          if (userDoc.exists() && userDoc.data().spreadsheetUrl) {
            setSpreadsheetUrl(userDoc.data().spreadsheetUrl);
          }
        }
      }
    } catch (error) {
      console.error('Error checking Google status:', error);
    }
  };

  const initializeClubSpreadsheet = async (club) => {
    try {
      // Note: For Google Sheets API, we need OAuth tokens, not password
      // The Gmail password stored is for reference only
      // In production, you'll need to either:
      // 1. Use Google Service Account (recommended)
      // 2. Generate OAuth tokens manually and store them
      // 3. Implement token generation using stored credentials (requires backend)
      
      const result = await createSpreadsheet(`${club.name} - ID Scans`);
      
      // Update club document with spreadsheet info
      const { updateClub } = await import('../services/adminService');
      await updateClub(club.id, {
        spreadsheetId: result.spreadsheetId,
        spreadsheetUrl: result.spreadsheetUrl
      });
      
      setSpreadsheetUrl(result.spreadsheetUrl);
      toast.success('Spreadsheet created for your nightclub!');
    } catch (error) {
      console.error('Error creating nightclub spreadsheet:', error);
      toast.error('Failed to create spreadsheet. Please contact admin to configure Gmail OAuth tokens.');
    }
  };

  const handleGoogleConnect = async () => {
    // Club users don't need to connect - they use pre-configured Gmail
    if (isClubUser) {
      toast.info('Your club Gmail account is already configured by admin.');
      return;
    }

    setLoading(true);
    try {
      // Sign in to Google using OAuth 2.0
      const response = await signInGoogle();
      
      if (response && response.accessToken) {
        // Check if user already has a spreadsheet
        const userDocRef = doc(db, 'users', user.id);
        const userDoc = await getDoc(userDocRef);
        
        let spreadsheetId, spreadsheetUrl;
        
        if (userDoc.exists() && userDoc.data().spreadsheetId) {
          // Use existing spreadsheet
          spreadsheetId = userDoc.data().spreadsheetId;
          spreadsheetUrl = userDoc.data().spreadsheetUrl;
        } else {
          // Create new spreadsheet
          const result = await createSpreadsheet();
          spreadsheetId = result.spreadsheetId;
          spreadsheetUrl = result.spreadsheetUrl;
          
          // Save to Firestore
          await setDoc(userDocRef, {
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
          <h2 style={{marginBottom: '20px'}}>
            Welcome, {isClubUser ? user?.name : user?.email}
          </h2>
          
          {isClubUser && (
            <div style={{marginBottom: '16px', padding: '12px', background: '#e3f2fd', borderRadius: '8px'}}>
              <p style={{margin: 0, fontSize: '14px', color: '#1976d2'}}>
                🏢 Nightclub: {user?.name}
              </p>
            </div>
          )}
          
          <div style={{marginBottom: '24px'}}>
            <p style={{marginBottom: '10px'}}>Google Account Status:</p>
            <span className={`status-badge ${googleConnected ? 'connected' : 'disconnected'}`}>
              {googleConnected ? '✓ Connected' : '✗ Not Connected'}
            </span>
            {isClubUser && googleConnected && (
              <p style={{marginTop: '8px', fontSize: '12px', color: '#666'}}>
                Using nightclub Gmail: {user?.gmail}
              </p>
            )}
          </div>

          {!googleConnected && !isClubUser && (
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
