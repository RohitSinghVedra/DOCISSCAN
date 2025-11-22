import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { getClubDocuments, getUserDocuments } from '../services/documentService';
import { exportToExcel } from '../utils/excelExport';
import * as indexedDBService from '../services/indexedDBService';

const DocumentList = ({ user }) => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const isClubUser = user?.userType === 'club';

  useEffect(() => {
    fetchDocuments();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      
      // Initialize IndexedDB first
      await indexedDBService.initDB();
      
      // Fetch from IndexedDB (local storage)
      let docs = [];
      
      if (isClubUser && user?.id) {
        docs = await getClubDocuments(user.id);
      } else if (user?.id) {
        docs = await getUserDocuments(user.id);
      }
      
      setDocuments(docs);
    } catch (error) {
      console.error('Error fetching documents:', error);
      toast.error(error.message || 'Failed to fetch documents');
    } finally {
      setLoading(false);
    }
  };

  const handleExportExcel = () => {
    try {
      if (documents.length === 0) {
        toast.warning('No documents to export');
        return;
      }

      const filename = isClubUser 
        ? `${user?.name || 'club'}_documents_${new Date().toISOString().split('T')[0]}.csv`
        : `documents_${new Date().toISOString().split('T')[0]}.csv`;
      
      exportToExcel(documents, filename);
      toast.success(`Exported ${documents.length} documents to Excel!`);
    } catch (error) {
      console.error('Error exporting:', error);
      toast.error('Failed to export documents');
    }
  };

  const getDocumentIcon = (type) => {
    const icons = {
      aadhaar: '🆔',
      passport: '📕',
      pan: '💳',
      driving_license: '🚗',
      voter_id: '🗳️',
      other: '📄'
    };
    return icons[type] || '📄';
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleString();
  };

  const formatExtractedData = (extractedData) => {
    if (!extractedData || Object.keys(extractedData).length === 0) {
      return 'No data extracted';
    }

    const fields = [];
    if (extractedData.name) fields.push(`Name: ${extractedData.name}`);
    if (extractedData.idNumber || extractedData.aadhaarNumber || extractedData.passportNumber || extractedData.panNumber) {
      const id = extractedData.idNumber || extractedData.aadhaarNumber || extractedData.passportNumber || extractedData.panNumber || extractedData.drivingLicenseNumber || extractedData.voterIdNumber;
      fields.push(`ID Number: ${id}`);
    }
    if (extractedData.dateOfBirth) fields.push(`DOB: ${extractedData.dateOfBirth}`);
    if (extractedData.gender) fields.push(`Gender: ${extractedData.gender}`);
    if (extractedData.address) fields.push(`Address: ${extractedData.address}`);
    if (extractedData.fatherName) fields.push(`Father: ${extractedData.fatherName}`);
    if (extractedData.husbandName) fields.push(`Husband: ${extractedData.husbandName}`);
    if (extractedData.nationality) fields.push(`Nationality: ${extractedData.nationality}`);
    if (extractedData.issueDate) fields.push(`Issue Date: ${extractedData.issueDate}`);
    if (extractedData.expiryDate) fields.push(`Expiry Date: ${extractedData.expiryDate}`);
    if (extractedData.state) fields.push(`State: ${extractedData.state}`);
    if (extractedData.district) fields.push(`District: ${extractedData.district}`);
    if (extractedData.pincode) fields.push(`Pincode: ${extractedData.pincode}`);

    return fields.length > 0 ? fields.join('\n') : 'No structured data found';
  };

  return (
    <div>
      <div className="header">
        <div className="header-content">
          <h2>📋 Scanned Documents</h2>
          <div style={{display: 'flex', gap: '10px'}}>
            {documents.length > 0 && (
              <button 
                className="btn btn-success" 
                onClick={handleExportExcel}
                style={{padding: '8px 16px', fontSize: '14px'}}
              >
                📥 Export to Excel
              </button>
            )}
            <button className="btn btn-secondary" onClick={() => navigate('/dashboard')} style={{padding: '8px 16px', fontSize: '14px'}}>
              Back
            </button>
          </div>
        </div>
      </div>

      <div className="container">
        {loading ? (
          <div className="card">
            <p>Loading documents...</p>
          </div>
        ) : documents.length === 0 ? (
          <div className="card">
            <p>No documents yet. <button onClick={() => navigate('/scan')} style={{color: '#667eea', cursor: 'pointer', border: 'none', background: 'transparent', textDecoration: 'underline', padding: 0}}>Scan your first document</button></p>
          </div>
        ) : (
          <>
            <div className="card" style={{marginBottom: '20px', background: '#e8f5e9'}}>
              <p style={{margin: 0, fontWeight: 600}}>
                📊 Total Documents: {documents.length} | 
                <button 
                  onClick={handleExportExcel}
                  style={{marginLeft: '10px', color: '#2e7d32', cursor: 'pointer', border: 'none', background: 'transparent', textDecoration: 'underline', padding: 0, fontWeight: 600}}
                >
                  Export All to Excel
                </button>
              </p>
            </div>
            {documents.map((doc) => (
              <div key={doc.id} className="card" style={{marginBottom: '16px'}}>
                <div style={{display: 'flex', alignItems: 'flex-start', marginBottom: '16px'}}>
                  <span style={{fontSize: '48px', marginRight: '16px'}}>
                    {getDocumentIcon(doc.documentType)}
                  </span>
                  <div style={{flex: 1}}>
                    <h3 style={{marginBottom: '8px', textTransform: 'capitalize'}}>
                      {doc.documentType.replace('_', ' ')}
                    </h3>
                    <p style={{color: '#666', fontSize: '14px'}}>
                      Scanned: {formatDate(doc.scannedAt || doc.createdAt)}
                    </p>
                  </div>
                </div>
                
                <div style={{background: '#f8f9fa', padding: '16px', borderRadius: '8px', marginTop: '16px'}}>
                  <h4 style={{marginBottom: '12px', fontSize: '16px'}}>Extracted Information:</h4>
                  <pre style={{fontSize: '13px', color: '#333', whiteSpace: 'pre-wrap', fontFamily: 'inherit', margin: 0}}>
                    {formatExtractedData(doc.extractedData)}
                  </pre>
                  {doc.rawText && (
                    <details style={{marginTop: '12px'}}>
                      <summary style={{cursor: 'pointer', color: '#667eea', fontSize: '12px'}}>Show Raw OCR Text</summary>
                      <pre style={{fontSize: '11px', color: '#666', whiteSpace: 'pre-wrap', marginTop: '8px', maxHeight: '200px', overflow: 'auto'}}>
                        {doc.rawText}
                      </pre>
                    </details>
                  )}
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
};

export default DocumentList;
