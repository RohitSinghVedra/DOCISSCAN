import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { getClubDocumentCount, getUserDocumentCount, isCloudBackupEnabled, setCloudBackupEnabled } from '../services/documentService';
import * as indexedDBService from '../services/indexedDBService';
import { storeEncryptionPassword, clearEncryptionPassword } from '../utils/storage';

const Dashboard = ({ user, onLogout }) => {
  const [documentCount, setDocumentCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const isClubUser = user?.userType === 'club';

  const [cloudBackupEnabled, setCloudBackupEnabledState] = useState(false);
  const [backupLoading, setBackupLoading] = useState(false);

  useEffect(() => {
    loadDocumentCount();
    checkCloudBackupStatus();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadDocumentCount = async () => {
    try {
      setLoading(true);
      
      // Initialize IndexedDB first
      await indexedDBService.initDB();
      
      // Get count from IndexedDB
      let count = 0;
      if (isClubUser && user?.id) {
        count = await getClubDocumentCount(user.id);
      } else if (user?.id) {
        count = await getUserDocumentCount(user.id);
      }
      
      setDocumentCount(count);
    } catch (error) {
      console.error('Error loading document count:', error);
      setDocumentCount(0);
    } finally {
      setLoading(false);
    }
  };

  const checkCloudBackupStatus = async () => {
    try {
      const clubId = isClubUser ? user?.id : null;
      const userId = isClubUser ? null : user?.id;
      const enabled = await isCloudBackupEnabled(clubId, userId);
      setCloudBackupEnabledState(enabled);
    } catch (error) {
      console.error('Error checking cloud backup status:', error);
    }
  };

  const handleCloudBackupToggle = async () => {
    if (cloudBackupEnabled) {
      // Disable cloud backup
      setBackupLoading(true);
      try {
        const clubId = isClubUser ? user?.id : null;
        const userId = isClubUser ? null : user?.id;
        const userIdForStorage = clubId || userId;
        
        await setCloudBackupEnabled(clubId, userId, false, null);
        clearEncryptionPassword(userIdForStorage);
        setCloudBackupEnabledState(false);
        toast.success('Cloud backup disabled. All data remains local and private.');
      } catch (error) {
        console.error('Error disabling cloud backup:', error);
        toast.error('Failed to disable cloud backup');
      } finally {
        setBackupLoading(false);
      }
    } else {
      // Enable cloud backup - prompt for encryption password
      const password = prompt('Enter a password to encrypt your cloud backup:\n\n(Your data will be encrypted before uploading. You\'ll need this password to restore.)');
      if (!password) {
        return; // User cancelled
      }
      
      if (password.length < 8) {
        toast.error('Password must be at least 8 characters');
        return;
      }
      
      setBackupLoading(true);
      try {
        const clubId = isClubUser ? user?.id : null;
        const userId = isClubUser ? null : user?.id;
        const userIdForStorage = clubId || userId;
        
        await setCloudBackupEnabled(clubId, userId, true, password);
        storeEncryptionPassword(password, userIdForStorage);
        setCloudBackupEnabledState(true);
        toast.success('Cloud backup enabled! Your data will be encrypted before uploading.');
      } catch (error) {
        console.error('Error enabling cloud backup:', error);
        toast.error('Failed to enable cloud backup');
      } finally {
        setBackupLoading(false);
      }
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
          
          <div style={{marginBottom: '24px', padding: '16px', background: '#f5f5f5', borderRadius: '8px'}}>
            <p style={{marginBottom: '8px', fontWeight: 600}}>📊 Document Statistics:</p>
            <p style={{margin: 0, fontSize: '24px', fontWeight: 'bold', color: '#667eea'}}>
              {loading ? '...' : documentCount} {documentCount === 1 ? 'Document' : 'Documents'}
            </p>
            <p style={{marginTop: '8px', fontSize: '12px', color: '#666'}}>
              All documents are stored locally on your device. Your data stays private.
            </p>
          </div>

          {/* Cloud Backup Toggle */}
          <div style={{marginBottom: '24px', padding: '16px', background: cloudBackupEnabled ? '#e8f5e9' : '#fff3e0', borderRadius: '8px', border: `2px solid ${cloudBackupEnabled ? '#4caf50' : '#ff9800'}`}}>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px'}}>
              <div>
                <p style={{margin: 0, fontWeight: 600, fontSize: '14px'}}>
                  {cloudBackupEnabled ? '☁️ Cloud Backup: Enabled' : '🔒 Cloud Backup: Disabled'}
                </p>
                <p style={{margin: '4px 0 0 0', fontSize: '12px', color: '#666'}}>
                  {cloudBackupEnabled 
                    ? 'Your data is encrypted and backed up to cloud' 
                    : 'All data stored locally only (most private)'}
                </p>
              </div>
              <button
                className={`btn ${cloudBackupEnabled ? 'btn-success' : 'btn-secondary'}`}
                onClick={handleCloudBackupToggle}
                disabled={backupLoading}
                style={{padding: '8px 16px', fontSize: '12px', minWidth: '100px'}}
              >
                {backupLoading ? '...' : cloudBackupEnabled ? 'Disable' : 'Enable'}
              </button>
            </div>
            {cloudBackupEnabled && (
              <p style={{margin: '8px 0 0 0', fontSize: '11px', color: '#666', fontStyle: 'italic'}}>
                ⚠️ Remember your encryption password - you'll need it to restore from backup
              </p>
            )}
          </div>
        </div>

        <div className="quick-actions">
          <div className="action-card" onClick={() => navigate('/scan')}>
            <div className="icon">📷</div>
            <h3>Scan Document</h3>
            <p>Camera or Upload</p>
          </div>
          
          <div className="action-card" onClick={() => navigate('/documents')}>
            <div className="icon">📋</div>
            <h3>View Documents</h3>
            <p>See all scanned IDs</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
