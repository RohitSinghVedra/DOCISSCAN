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
  const [capturedImages, setCapturedImages] = useState({ front: null, back: null });
  const [extractedData, setExtractedData] = useState({ front: null, back: null });
  const [currentSide, setCurrentSide] = useState('front'); // 'front' or 'back'
  const [documentType, setDocumentType] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const fileInputRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const navigate = useNavigate();

  // Documents that need back side
  const DOCUMENTS_WITH_BACK = ['aadhaar', 'pan', 'driving_license'];

  useEffect(() => {
    if (!isSignedIn()) {
      toast.warning('Please connect your Google account first to save documents');
      navigate('/dashboard');
    }
  }, [navigate]);

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

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
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play();
      }
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
        const file = new File([blob], `${currentSide}-photo.jpg`, { type: 'image/jpeg' });
        const imageUrl = URL.createObjectURL(blob);
        
        // Update captured images
        setCapturedImages(prev => ({
          ...prev,
          [currentSide]: { file, url: imageUrl }
        }));

        // Stop camera after capture
        stopCamera();
        
        toast.success('Photo captured! Processing...');
        
        // Process image immediately
        await processCapturedImage(file, currentSide);
      }, 'image/jpeg', 0.9);
    } catch (error) {
      console.error('Capture error:', error);
      toast.error('Failed to capture photo');
    }
  };

  const processCapturedImage = async (file, side) => {
    setIsProcessing(true);
    setOcrProgress(0);
    
    try {
      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setOcrProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      // Process with OCR
      const ocrResult = await processDocument(file, (progress) => {
        setOcrProgress(Math.round(progress * 100));
      });

      clearInterval(progressInterval);
      setOcrProgress(100);

      // Update extracted data
      setExtractedData(prev => ({
        ...prev,
        [side]: ocrResult
      }));

      // Set document type from first side
      if (side === 'front' && !documentType) {
        setDocumentType(ocrResult.documentType);
      }

      toast.success(`${side === 'front' ? 'Front' : 'Back'} side processed!`);
      
      // Check if back side is needed
      if (side === 'front' && DOCUMENTS_WITH_BACK.includes(ocrResult.documentType)) {
        toast.info('This document requires a back side scan', {
          autoClose: 3000
        });
        setCurrentSide('back');
      } else {
        // Show preview
        setShowPreview(true);
      }
    } catch (error) {
      console.error('OCR error:', error);
      toast.error(`Failed to process ${side} side`);
    } finally {
      setIsProcessing(false);
      setOcrProgress(0);
    }
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const imageUrl = URL.createObjectURL(file);
    setCapturedImages(prev => ({
      ...prev,
      [currentSide]: { file, url: imageUrl }
    }));

    toast.info('Processing uploaded image...');
    await processCapturedImage(file, currentSide);
  };

  const captureBackSide = () => {
    setCurrentSide('back');
    setShowPreview(false);
    if (method === 'camera') {
      startCamera();
    }
  };

  const retakePhoto = () => {
    if (currentSide === 'back') {
      setCapturedImages(prev => ({ ...prev, back: null }));
      setExtractedData(prev => ({ ...prev, back: null }));
    } else {
      setCapturedImages({ front: null, back: null });
      setExtractedData({ front: null, back: null });
      setDocumentType(null);
      setCurrentSide('front');
    }
    setShowPreview(false);
    if (method === 'camera') {
      startCamera();
    }
  };

  const handleSave = async () => {
    if (!isSignedIn()) {
      toast.error('Please connect Google account first');
      navigate('/dashboard');
      return;
    }

    setLoading(true);
    
    try {
      // Get user's spreadsheet ID
      const userDocRef = doc(db, 'users', user.id);
      const userDoc = await getDoc(userDocRef);
      
      if (!userDoc.exists() || !userDoc.data().spreadsheetId) {
        toast.error('Spreadsheet not found. Please connect Google account again.');
        navigate('/dashboard');
        return;
      }
      
      const spreadsheetId = userDoc.data().spreadsheetId;
      
      // Combine front and back data if available
      const frontData = extractedData.front;
      const backData = extractedData.back;
      
      // Merge extracted data from both sides
      const mergedData = {
        documentType: frontData?.documentType || 'other',
        rawText: [frontData?.rawText, backData?.rawText].filter(Boolean).join('\n\n---BACK SIDE---\n\n'),
        extractedData: {
          ...frontData?.extractedData,
          ...backData?.extractedData
        }
      };
      
      // Save to Google Sheets
      await appendToSpreadsheet(spreadsheetId, mergedData);
      
      const spreadsheetUrl = userDoc.data().spreadsheetUrl;
      
      toast.success('Document saved to Google Sheets!', {
        onClick: () => window.open(spreadsheetUrl, '_blank'),
        autoClose: 3000
      });

      // Reset everything
      setCapturedImages({ front: null, back: null });
      setExtractedData({ front: null, back: null });
      setDocumentType(null);
      setCurrentSide('front');
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

  const continueWithoutBack = () => {
    toast.info('Continuing without back side...');
    setShowPreview(true);
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
                onClick={() => { setMethod('camera'); stopCamera(); }}
                style={{width: '48%'}}
                disabled={isProcessing}
              >
                📷 Camera
              </button>
              <button
                className={`btn ${method === 'upload' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => { setMethod('upload'); stopCamera(); }}
                style={{width: '48%'}}
                disabled={isProcessing}
              >
                📁 Upload
              </button>
            </div>
          )}

          {/* Side Indicator */}
          {!showPreview && capturedImages.front && currentSide === 'back' && (
            <div style={{marginBottom: '20px', padding: '12px', background: '#fff3cd', borderRadius: '8px', textAlign: 'center'}}>
              <p style={{margin: 0, fontWeight: 600, color: '#856404'}}>
                📄 Now capture the BACK side of your {documentType?.toUpperCase() || 'document'}
              </p>
            </div>
          )}

          {/* Camera/Upload View */}
          {!showPreview && (
            <>
              {method === 'camera' && (
                <div className="camera-container">
                  {stream && (
                    <div style={{position: 'relative', width: '100%', marginBottom: '20px'}}>
                      <video 
                        ref={videoRef} 
                        autoPlay 
                        playsInline 
                        style={{
                          width: '100%',
                          borderRadius: '8px',
                          maxHeight: '60vh',
                          objectFit: 'contain'
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
                        Ready to capture {currentSide === 'front' ? 'FRONT' : 'BACK'} side
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
                    Upload {currentSide === 'front' ? 'FRONT' : 'BACK'} side image
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
                    Processing {currentSide === 'front' ? 'front' : 'back'} side... {ocrProgress}%
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

              {/* Prompt for back side */}
              {capturedImages.front && !capturedImages.back && 
               DOCUMENTS_WITH_BACK.includes(documentType) && 
               !isProcessing && (
                <div style={{marginTop: '20px', padding: '16px', background: '#e3f2fd', borderRadius: '8px', textAlign: 'center'}}>
                  <p style={{marginBottom: '12px', fontWeight: 600}}>
                    This document requires a back side scan
                  </p>
                  <div style={{display: 'flex', gap: '10px', justifyContent: 'center'}}>
                    <button className="btn btn-primary" onClick={captureBackSide}>
                      Capture Back Side
                    </button>
                    <button className="btn btn-secondary" onClick={continueWithoutBack}>
                      Continue Without Back
                    </button>
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

              {/* Captured Images */}
              <div style={{display: 'grid', gridTemplateColumns: capturedImages.back ? '1fr 1fr' : '1fr', gap: '16px', marginBottom: '20px'}}>
                {capturedImages.front && (
                  <div>
                    <h4 style={{marginBottom: '8px', fontSize: '14px', color: '#666'}}>Front Side</h4>
                    <img 
                      src={capturedImages.front.url} 
                      alt="Front" 
                      style={{
                        width: '100%',
                        borderRadius: '8px',
                        border: '2px solid #667eea',
                        maxHeight: '300px',
                        objectFit: 'contain'
                      }} 
                    />
                    {extractedData.front && (
                      <div style={{marginTop: '12px', padding: '12px', background: '#f5f5f5', borderRadius: '8px', fontSize: '12px'}}>
                        <strong>Extracted Text:</strong>
                        <div style={{marginTop: '8px', maxHeight: '150px', overflow: 'auto'}}>
                          {extractedData.front.rawText || 'No text extracted'}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                
                {capturedImages.back && (
                  <div>
                    <h4 style={{marginBottom: '8px', fontSize: '14px', color: '#666'}}>Back Side</h4>
                    <img 
                      src={capturedImages.back.url} 
                      alt="Back" 
                      style={{
                        width: '100%',
                        borderRadius: '8px',
                        border: '2px solid #667eea',
                        maxHeight: '300px',
                        objectFit: 'contain'
                      }} 
                    />
                    {extractedData.back && (
                      <div style={{marginTop: '12px', padding: '12px', background: '#f5f5f5', borderRadius: '8px', fontSize: '12px'}}>
                        <strong>Extracted Text:</strong>
                        <div style={{marginTop: '8px', maxHeight: '150px', overflow: 'auto'}}>
                          {extractedData.back.rawText || 'No text extracted'}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Extracted Data Summary */}
              {extractedData.front && (
                <div style={{marginBottom: '20px', padding: '16px', background: '#fff9e6', borderRadius: '8px'}}>
                  <h4 style={{marginBottom: '12px', fontSize: '16px'}}>📋 Extracted Information:</h4>
                  <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', fontSize: '14px'}}>
                    {extractedData.front.extractedData.name && (
                      <div><strong>Name:</strong> {extractedData.front.extractedData.name}</div>
                    )}
                    {(extractedData.front.extractedData.aadhaarNumber || extractedData.front.extractedData.panNumber || extractedData.front.extractedData.passportNumber) && (
                      <div><strong>ID Number:</strong> {extractedData.front.extractedData.aadhaarNumber || extractedData.front.extractedData.panNumber || extractedData.front.extractedData.passportNumber}</div>
                    )}
                    {extractedData.front.extractedData.dateOfBirth && (
                      <div><strong>DOB:</strong> {extractedData.front.extractedData.dateOfBirth}</div>
                    )}
                    {extractedData.front.extractedData.gender && (
                      <div><strong>Gender:</strong> {extractedData.front.extractedData.gender}</div>
                    )}
                    {extractedData.front.extractedData.address && (
                      <div style={{gridColumn: '1 / -1'}}><strong>Address:</strong> {extractedData.front.extractedData.address}</div>
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
