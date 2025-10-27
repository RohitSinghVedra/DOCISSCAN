import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { processDocument } from '../services/ocrService';
import { appendToSpreadsheet, isSignedIn } from '../services/googleAuth';
import { db } from '../firebase-config';
import './CameraScan.css';

const CameraScan = ({ user }) => {
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState(null);
  const [method, setMethod] = useState('camera');
  const [ocrProgress, setOcrProgress] = useState(0);
  const fileInputRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [stream, setStream] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if Google is connected
    if (!isSignedIn()) {
      toast.warning('Please connect your Google account first to save documents');
      navigate('/dashboard');
    }
  }, [navigate]);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (error) {
      toast.error('Camera access denied or not available');
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0);
      canvas.toBlob(blob => {
        const file = new File([blob], 'photo.jpg', { type: 'image/jpeg' });
        setPreview(URL.createObjectURL(file));
        stopCamera();
      });
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPreview(URL.createObjectURL(file));
    }
  };

  const processImage = async () => {
    if (!preview) {
      toast.error('Please capture or select an image first');
      return;
    }

    if (!isSignedIn()) {
      toast.error('Please connect Google account first');
      navigate('/dashboard');
      return;
    }

    setLoading(true);
    setOcrProgress(0);

    try {
      // Convert preview URL to File
      const response = await fetch(preview);
      const blob = await response.blob();
      const file = new File([blob], 'document.jpg', { type: ' تحمل موقعات/jpeg' });

      toast.info('Processing document with OCR...');
      
      // Step 1: Process document with Tesseract.js OCR
      const ocrResult = await processDocument(file);
      
      toast.info('Saving to Google Sheets...');
      
      // Step 2: Get user's spreadsheet ID from Firestore
      const userDoc = await db.collection('users').doc(user.id).get();
      if (!userDoc.exists || !userDoc.data().spreadsheetId) {
        toast.error('Spreadsheet not found. Please connect Google account again.');
        navigate('/dashboard');
        return;
      }
      
      const spreadsheetId = userDoc.data().spreadsheetId;
      
      // Step 3: Append to Google Sheets
      await appendToSpreadsheet(spreadsheetId, ocrResult);
      
      const spreadsheetUrl = userDoc.data().spreadsheetUrl;
      
      toast.success('Document saved to Google Sheets!', {
        onClick: () => window.open(spreadsheetUrl, '_blank')
      });

      // Reset for next scan
      setPreview(null);
      
      // Navigate back to dashboard after 2 seconds
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);

    } catch (error) {
      console.error('Error:', error);
      toast.error(error.message || 'Failed to process document');
    } finally {
      setLoading(false);
      setOcrProgress(0);
    }
  };

  const retakePhoto = () => {
    setPreview(null);
    if (method === 'camera') {
      startCamera();
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
          <div className="method-selector">
            <button
              className={`btn ${method === 'camera' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => { setMethod('camera'); setPreview(null); stopCamera(); }}
              style={{width: '48%'}}
            >
              📷 Camera
            </button>
            <button
              className={`btn ${method === 'upload' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => { setMethod('upload'); setPreview(null); stopCamera(); }}
              style={{width: '48%'}}
            >
              📁 Upload
            </button>
          </div>

          {/* Camera View */}
          {method === 'camera' && !preview && (
            <div className="camera-container">
              {stream && (
                <video ref={videoRef} autoPlay playsInline style={{width: '100%', borderRadius: '8px'}} />
              )}
              {!stream && (
                <div style={{textAlign: 'center', padding: '40px'}}>
                  <p style={{marginBottom: '20px', color: '#666'}}>Ready to capture document</p>
                </div>
              )}
              <canvas ref={canvasRef} style={{display: 'none'}} />
              <div className="camera-controls">
                {!stream ? (
                  <button className="btn btn-primary" onClick={startCamera}>
                    Start Camera
                  </button>
                ) : (
                  <button className="btn btn-primary" onClick={capturePhoto}>
                    Capture Photo
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Upload View */}
          {method === 'upload' && !preview && (
            <div className="upload-container">
              <input
                type="file"
                ref={fileInputRef}
                accept="image/* "+"
                onChange={handleFileSelect}
                style={{display: 'none'}}
              />
              <button className="btn btn-primary" onClick={() => fileInputRef.current?.click()}>
                Select Image
              </button>
            </div>
          )}

          {/* Preview */}
          {preview && (
            <div className="preview-container">
              <img src={preview} alt="Preview" style={{width: '100%', borderRadius: '8px'}} />
              
              {/* OCR Progress Bar */}
              {loading && ocrProgress > 0 && (
                <div style={{margin: '16px 0', padding: '8px', background: '#f0f0f0', borderRadius: '4px'}}>
                  <div style={{fontSize: '12px', marginBottom: '4px', color: '#666'}}>Processing: {ocrProgress}%</div>
                  <div style={{height: '8px', background: '#ddd', borderRadius: '4px', overflow: 'hidden'}}>
                    <div style={{height: '100%', background: '#667eea', width: `${ocrProgress}%`, transition: 'width 0.3s'}}></div>
                  </div>
                </div>
              )}
              
              <div className="preview-controls">
                <button className="btn btn-secondary" onClick={retakePhoto} disabled={loading}>
                  Retake
                </button>
                <button className="btn btn-primary" onClick={processImage} disabled={loading}>
                  {loading ? 'Processing...' : 'Scan Document'}
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
