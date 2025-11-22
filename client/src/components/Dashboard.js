import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getClubDocuments, getUserDocuments } from '../services/documentService';

const Dashboard = ({ user, onLogout }) => {
  const [documentCount, setDocumentCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const isClubUser = user?.userType === 'club';

  useEffect(() => {
    loadDocumentCount();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadDocumentCount = async () => {
    try {
      setLoading(true);
      let docs = [];
      
      if (isClubUser && user?.id) {
        docs = await getClubDocuments(user.id, 1); // Just get count
      } else if (user?.id) {
        docs = await getUserDocuments(user.id, 1); // Just get count
      }
      
      // Get full count
      if (isClubUser && user?.id) {
        docs = await getClubDocuments(user.id, 1000);
      } else if (user?.id) {
        docs = await getUserDocuments(user.id, 1000);
      }
      
      setDocumentCount(docs.length);
    } catch (error) {
      console.error('Error loading document count:', error);
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
          
          <div style={{marginBottom: '24px', padding: '16px', background: '#f5f5f5', borderRadius: '8px'}}>
            <p style={{marginBottom: '8px', fontWeight: 600}}>📊 Document Statistics:</p>
            <p style={{margin: 0, fontSize: '24px', fontWeight: 'bold', color: '#667eea'}}>
              {loading ? '...' : documentCount} {documentCount === 1 ? 'Document' : 'Documents'}
            </p>
            <p style={{marginTop: '8px', fontSize: '12px', color: '#666'}}>
              All documents are stored securely and can be exported to Excel anytime.
            </p>
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
