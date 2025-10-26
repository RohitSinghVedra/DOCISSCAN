import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import './CameraScan.css';

const CameraScan = ({ token, user }) => {
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState(null);
  const [method, setMethod] = useState('camera');
  const fileInputRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [stream, setStream] = useState(null);
  const navigate = useNavigate();

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

    setLoading(true);
    try {
      // Convert preview URL to File
      const response = await fetch(preview);
      const blob = await response.blob();
      const file = new File([blob], 'document.jpg', { type: 'image/jpeg' });

      const formData = new FormData();
      formData.append('image', file);

      // Step 1: Process document with OCR
      const processResponse = await axios.post('/api/documents/process', formData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      toast.info('Saving to Google Sheets...');

      // Step 2: Save to Google Sheets
      const saveResponse = await axios.post('/api/google/sheets/save', {
        data: processResponse.data
      }, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      toast.success('Document saved to Google Sheets!', {
        onClick: () => window.open(saveResponse.data.spreadsheetUrl, '_blank')
      });

      // Reset for next scan
      setPreview(null);
      
      // Navigate back to dashboard after 2 seconds
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);

    } catch (error) {
      console.error('Error:', error);
      toast.error(error.response?.data?.message || 'Failed to process document');
    } finally {
      setLoading(false);
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
                accept="image/*"
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
              <div className="preview-controls">
                <button className="btn btn-secondary" onClick={retakePhoto}>
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
