import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { processDocument } from '../services/ocrService';
import { appendToSpreadsheet, isSignedIn } from '../services/googleAuth';
import { db } from '../firebase-config';
import { doc, getDoc } from 'firebase/firestore';
import './CameraScan.css';

const CameraScan = ({ user }) => {
  const [loading, setLoading] = useState(false);
  const [method, setMethod] = useState('camera');
  const [ocrProgress, setOcrProgress] = useState(0);
  const [stream, setStream] = useState(null);
  const [capturedImage, setCapturedImage] = useState(null);
  const [extractedData, setExtractedData] = useState(null);
  const [documentType, setDocumentType] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const fileInputRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    // For club users, Google Sheets is automatically configured
    // For regular users, check if Google is connected
    if (user?.userType !== 'club' && !isSignedIn()) {
      toast.warning('Please connect your Google account first to save documents');
      navigate('/dashboard');
    }
  }, [navigate, user]);

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  // Update video when stream changes
  useEffect(() => {
    const videoElement = videoRef.current;
    
    if (stream && videoElement) {
      videoElement.srcObject = stream;
      videoElement.onloadedmetadata = () => {
        videoElement.play().catch(err => {
          console.error('Video play error:', err);
        });
      };
      videoElement.play().catch(err => {
        console.error('Video play error:', err);
      });
    }
    
    return () => {
      if (videoElement && !stream) {
        videoElement.srcObject = null;
      }
    };
  }, [stream]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        } 
      });
      setStream(mediaStream);
    } catch (error) {
      toast.error('Camera access denied or not available');
      console.error('Camera error:', error);
    }
  };

  const capturePhoto = async () => {
    if (!videoRef.current || !canvasRef.current || !stream) {
      toast.error('Camera not ready');
      return;
    }

    try {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      
      // Set canvas size to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Convert to blob and create file
      canvas.toBlob(async (blob) => {
        const file = new File([blob], 'document-photo.jpg', { type: 'image/jpeg' });
        const imageUrl = URL.createObjectURL(blob);
        
        // Update captured image
        setCapturedImage({ file, url: imageUrl });

        // Stop camera after capture
        stopCamera();
        
        toast.success('Photo captured! Processing...');
        
        // Process image immediately
        await processCapturedImage(file);
      }, 'image/jpeg', 0.9);
    } catch (error) {
      console.error('Capture error:', error);
      toast.error('Failed to capture photo');
    }
  };

  const processCapturedImage = async (file) => {
    setIsProcessing(true);
    setOcrProgress(0);
    
    let progressInterval = null;
    
    try {
      // Simulate progress for better UX
      progressInterval = setInterval(() => {
        setOcrProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      // Process with OCR
      const ocrResult = await processDocument(file, (progress) => {
        setOcrProgress(Math.round(progress * 100));
      });

      if (progressInterval) {
        clearInterval(progressInterval);
      }
      setOcrProgress(100);

      // Update extracted data
      setExtractedData(ocrResult);
      setDocumentType(ocrResult.documentType);

      toast.success('Document processed successfully!');
      
      // Show preview
      setShowPreview(true);
    } catch (error) {
      console.error('OCR error:', error);
      const errorMessage = error?.message || error?.toString() || 'Unknown error occurred';
      toast.error(`Failed to process document: ${errorMessage}`);
      
      // Reset state on error
      setCapturedImage(null);
      setExtractedData(null);
      setDocumentType(null);
      setShowPreview(false);
    } finally {
      if (progressInterval) {
        clearInterval(progressInterval);
      }
      setIsProcessing(false);
      setOcrProgress(0);
    }
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const imageUrl = URL.createObjectURL(file);
    setCapturedImage({ file, url: imageUrl });

    toast.info('Processing uploaded image...');
    await processCapturedImage(file);
  };

  const retakePhoto = () => {
    setCapturedImage(null);
    setExtractedData(null);
    setDocumentType(null);
    setShowPreview(false);
    if (method === 'camera') {
      startCamera();
    }
  };

  const handleSave = async () => {
    // For club users, check club's spreadsheet
    // For regular users, check if Google is connected
    if (user?.userType !== 'club' && !isSignedIn()) {
      toast.error('Please connect Google account first');
      navigate('/dashboard');
      return;
    }

    setLoading(true);
    
    try {
      let spreadsheetId;
      
      if (user?.userType === 'club') {
        // Club users use their club's spreadsheet
        if (!user.spreadsheetId) {
          toast.error('Nightclub spreadsheet not configured. Please contact admin.');
          return;
        }
        spreadsheetId = user.spreadsheetId;
      } else {
        // Regular users get spreadsheet from Firestore
        const userDocRef = doc(db, 'users', user.id);
        const userDoc = await getDoc(userDocRef);
        
        if (!userDoc.exists() || !userDoc.data().spreadsheetId) {
          toast.error('Spreadsheet not found. Please connect Google account again.');
          navigate('/dashboard');
          return;
        }
        
        spreadsheetId = userDoc.data().spreadsheetId;
      }
      
      // Prepare data for saving
      const dataToSave = {
        documentType: extractedData?.documentType || 'other',
        rawText: extractedData?.rawText || '',
        extractedData: extractedData?.extractedData || {}
      };
      
      // Save to Google Sheets
      await appendToSpreadsheet(spreadsheetId, dataToSave);
      
      // Get spreadsheet URL
      let spreadsheetUrl;
      if (user?.userType === 'club') {
        spreadsheetUrl = user.spreadsheetUrl;
      } else {
        const userDocRef = doc(db, 'users', user.id);
        const userDoc = await getDoc(userDocRef);
        spreadsheetUrl = userDoc.exists() ? userDoc.data().spreadsheetUrl : null;
      }
      
      toast.success('Document saved to Google Sheets!', {
        onClick: () => spreadsheetUrl && window.open(spreadsheetUrl, '_blank'),
        autoClose: 3000
      });

      // Reset everything
      setCapturedImage(null);
      setExtractedData(null);
      setDocumentType(null);
      setShowPreview(false);
      
      // Navigate back after 2 seconds
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);

    } catch (error) {
      console.error('Save error:', error);
      toast.error(error.message || 'Failed to save document');
    } finally {
      setLoading(false);
    }
  };


  return (
    <div>
      <div className="header">
        <div className="header-content">
          <h2>📷 Scan Document</h2>
          <button className="btn btn-secondary" onClick={() => navigate('/dashboard')} style={{padding: '8px 16px', fontSize: '14px'}}>
            Back
          </button>
        </div>
      </div>

      <div className="container">
        <div className="card">
          {/* Method Selection */}
          {!showPreview && (
            <div className="method-selector" style={{marginBottom: '20px'}}>
              <button
                className={`btn ${method === 'camera' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => { setMethod('camera'); stopCamera(); setCapturedImage(null); setExtractedData(null); setShowPreview(false); }}
                style={{width: '48%'}}
                disabled={isProcessing}
              >
                📷 Camera
              </button>
              <button
                className={`btn ${method === 'upload' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => { setMethod('upload'); stopCamera(); setCapturedImage(null); setExtractedData(null); setShowPreview(false); }}
                style={{width: '48%'}}
                disabled={isProcessing}
              >
                📁 Upload
              </button>
            </div>
          )}

          {/* Camera/Upload View */}
          {!showPreview && (
            <>
              {method === 'camera' && (
                <div className="camera-container">
                  {stream && (
                    <div style={{position: 'relative', width: '100%', marginBottom: '20px', background: '#000', borderRadius: '8px', overflow: 'hidden'}}>
                      <video 
                        ref={videoRef} 
                        autoPlay 
                        playsInline 
                        muted
                        style={{
                          width: '100%',
                          height: 'auto',
                          minHeight: '400px',
                          display: 'block',
                          borderRadius: '8px',
                          objectFit: 'cover',
                          backgroundColor: '#000'
                        }}
                      />
                      {/* Focus overlay */}
                      <div style={{
                        position: 'absolute',
                        top: '10%',
                        left: '10%',
                        right: '10%',
                        bottom: '35%',
                        border: '3px solid #667eea',
                        borderRadius: '8px',
                        pointerEvents: 'none',
                        boxShadow: '0 0 20px rgba(102, 126, 234, 0.5)'
                      }} />
                      <div style={{
                        position: 'absolute',
                        bottom: '10px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        background: 'rgba(0,0,0,0.7)',
                        color: 'white',
                        padding: '8px 16px',
                        borderRadius: '20px',
                        fontSize: '14px'
                      }}>
                        Position document within frame
                      </div>
                    </div>
                  )}
                  
                  {!stream && !isProcessing && (
                    <div style={{textAlign: 'center', padding: '40px'}}>
                      <p style={{marginBottom: '20px', color: '#666'}}>
                        Ready to capture document
                      </p>
                      <button className="btn btn-primary" onClick={startCamera} disabled={loading}>
                        Start Camera
                      </button>
                    </div>
                  )}
                  
                  <canvas ref={canvasRef} style={{display: 'none'}} />
                  
                  <div className="camera-controls" style={{textAlign: 'center'}}>
                    {stream && (
                      <button 
                        className="btn btn-primary" 
                        onClick={capturePhoto}
                        style={{fontSize: '18px', padding: '12px 24px'}}
                        disabled={isProcessing}
                      >
                        📸 Capture Photo
                      </button>
                    )}
                  </div>
                </div>
              )}

              {method === 'upload' && (
                <div className="upload-container" style={{textAlign: 'center', padding: '40px'}}>
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    onChange={handleFileSelect}
                    style={{display: 'none'}}
                  />
                  <p style={{marginBottom: '20px', color: '#666'}}>
                    Upload document image
                  </p>
                  <button 
                    className="btn btn-primary" 
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isProcessing || loading}
                  >
                    📁 Select Image
                  </button>
                </div>
              )}

              {/* Processing Indicator */}
              {isProcessing && (
                <div style={{marginTop: '20px', padding: '20px', background: '#f0f0f0', borderRadius: '8px'}}>
                  <div style={{fontSize: '14px', marginBottom: '8px', color: '#666', textAlign: 'center'}}>
                    Processing document... {ocrProgress}%
                  </div>
                  <div style={{height: '8px', background: '#ddd', borderRadius: '4px', overflow: 'hidden'}}>
                    <div style={{
                      height: '100%',
                      background: '#667eea',
                      width: `${ocrProgress}%`,
                      transition: 'width 0.3s'
                    }}></div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Preview Section */}
          {showPreview && (
            <div className="preview-container">
              <h3 style={{marginBottom: '20px', textAlign: 'center'}}>
                📄 Document Preview
              </h3>

              {/* Document Type */}
              {documentType && (
                <div style={{marginBottom: '16px', padding: '12px', background: '#e8f5e9', borderRadius: '8px', textAlign: 'center'}}>
                  <strong>Document Type: </strong>
                  <span style={{textTransform: 'uppercase'}}>{documentType}</span>
                </div>
              )}

              {/* Captured Image */}
              {capturedImage && (
                <div style={{marginBottom: '20px'}}>
                  <img 
                    src={capturedImage.url} 
                    alt="Document" 
                    style={{
                      width: '100%',
                      borderRadius: '8px',
                      border: '2px solid #667eea',
                      maxHeight: '400px',
                      objectFit: 'contain'
                    }} 
                  />
                  {extractedData && (
                    <div style={{marginTop: '12px', padding: '12px', background: '#f5f5f5', borderRadius: '8px', fontSize: '12px'}}>
                      <strong>Extracted Text:</strong>
                      <div style={{marginTop: '8px', maxHeight: '150px', overflow: 'auto'}}>
                        {extractedData.rawText || 'No text extracted'}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Extracted Data Summary */}
              {extractedData && extractedData.extractedData && (
                <div style={{marginBottom: '20px', padding: '16px', background: '#fff9e6', borderRadius: '8px'}}>
                  <h4 style={{marginBottom: '12px', fontSize: '16px'}}>📋 Extracted Information:</h4>
                  <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', fontSize: '14px'}}>
                    {extractedData.extractedData.name && (
                      <div><strong>Name:</strong> {extractedData.extractedData.name}</div>
                    )}
                    {(extractedData.extractedData.aadhaarNumber || extractedData.extractedData.panNumber || extractedData.extractedData.passportNumber || extractedData.extractedData.idNumber) && (
                      <div><strong>ID Number:</strong> {extractedData.extractedData.aadhaarNumber || extractedData.extractedData.panNumber || extractedData.extractedData.passportNumber || extractedData.extractedData.idNumber}</div>
                    )}
                    {extractedData.extractedData.dateOfBirth && (
                      <div><strong>DOB:</strong> {extractedData.extractedData.dateOfBirth}</div>
                    )}
                    {extractedData.extractedData.gender && (
                      <div><strong>Gender:</strong> {extractedData.extractedData.gender}</div>
                    )}
                    {extractedData.extractedData.fatherName && (
                      <div><strong>Father's Name:</strong> {extractedData.extractedData.fatherName}</div>
                    )}
                    {extractedData.extractedData.address && (
                      <div style={{gridColumn: '1 / -1'}}><strong>Address:</strong> {extractedData.extractedData.address}</div>
                    )}
                    {extractedData.extractedData.pincode && (
                      <div><strong>Pincode:</strong> {extractedData.extractedData.pincode}</div>
                    )}
                    {extractedData.extractedData.otherInfo1 && (
                      <div><strong>Info:</strong> {extractedData.extractedData.otherInfo1}</div>
                    )}
                    {extractedData.extractedData.otherInfo2 && (
                      <div><strong>Info:</strong> {extractedData.extractedData.otherInfo2}</div>
                    )}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="preview-controls" style={{display: 'flex', gap: '12px', justifyContent: 'center'}}>
                <button 
                  className="btn btn-secondary" 
                  onClick={retakePhoto} 
                  disabled={loading}
                  style={{flex: 1}}
                >
                  Retake
                </button>
                <button 
                  className="btn btn-primary" 
                  onClick={handleSave} 
                  disabled={loading}
                  style={{flex: 1, fontSize: '16px', padding: '12px'}}
                >
                  {loading ? 'Saving...' : '✓ Save to Google Sheet'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CameraScan;
