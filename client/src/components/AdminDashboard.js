import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { getAllClubs, createClub, updateClub, deleteClub } from '../services/adminService';
import './AdminDashboard.css';

const AdminDashboard = ({ user, onLogout }) => {
  const [clubs, setClubs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingClub, setEditingClub] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    password: '',
    gmail: '',
    gmailPassword: ''
  });
  const navigate = useNavigate();

  useEffect(() => {
    loadClubs();
  }, []);

  const loadClubs = async () => {
    setLoading(true);
    try {
      const allClubs = await getAllClubs();
      setClubs(allClubs);
    } catch (error) {
      console.error('Error loading clubs:', error);
      toast.error('Failed to load clubs');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateClub = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!formData.name || !formData.username || !formData.password || !formData.gmail) {
        toast.error('Please fill all required fields');
        return;
      }

      await createClub({
        ...formData,
        createdBy: user?.id || 'admin'
      });

      toast.success('Nightclub added successfully!');
      setShowCreateModal(false);
      resetForm();
      loadClubs();
    } catch (error) {
      console.error('Error creating club:', error);
      toast.error(error.message || 'Failed to create club');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateClub = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await updateClub(editingClub.id, formData);
      toast.success('Nightclub updated successfully!');
      setEditingClub(null);
      resetForm();
      loadClubs();
    } catch (error) {
      console.error('Error updating club:', error);
      toast.error(error.message || 'Failed to update club');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClub = async (clubId) => {
    if (!window.confirm('Are you sure you want to delete this nightclub?')) {
      return;
    }

    setLoading(true);
    try {
      await deleteClub(clubId);
      toast.success('Nightclub deleted successfully!');
      loadClubs();
    } catch (error) {
      console.error('Error deleting club:', error);
      toast.error('Failed to delete club');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (club) => {
    setEditingClub(club);
    setFormData({
      name: club.name || '',
      username: club.username || '',
      password: '', // Don't show existing password
      gmail: club.gmail || '',
      gmailPassword: '' // Don't show existing Gmail password
    });
    setShowCreateModal(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      username: '',
      password: '',
      gmail: '',
      gmailPassword: ''
    });
    setEditingClub(null);
  };

  const handleLogout = () => {
    onLogout();
    navigate('/login');
  };

  return (
    <div>
      <div className="header">
        <div className="header-content">
          <h2>🔐 Admin Dashboard</h2>
          <div style={{display: 'flex', gap: '10px', alignItems: 'center'}}>
            <span style={{fontSize: '14px', color: '#666'}}>{user?.email}</span>
            <button className="btn btn-secondary" onClick={handleLogout} style={{padding: '8px 16px', fontSize: '14px'}}>
              Logout
            </button>
          </div>
        </div>
      </div>

      <div className="container">
        <div className="card">
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px'}}>
            <h2>Nightclub Management</h2>
            <button 
              className="btn btn-primary" 
              onClick={() => {
                resetForm();
                setShowCreateModal(true);
              }}
            >
              + Add New Nightclub
            </button>
          </div>

          {loading && !showCreateModal && (
            <div style={{textAlign: 'center', padding: '40px'}}>Loading clubs...</div>
          )}

          {!loading && clubs.length === 0 && (
            <div style={{textAlign: 'center', padding: '40px', color: '#666'}}>
              No nightclubs found. Add your first nightclub to get started.
            </div>
          )}

          {clubs.length > 0 && (
            <div className="clubs-table">
              <table>
                <thead>
                  <tr>
                    <th>Nightclub Name</th>
                    <th>Username</th>
                    <th>Gmail Account</th>
                    <th>Spreadsheet</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {clubs.map(club => (
                    <tr key={club.id}>
                      <td>{club.name}</td>
                      <td>{club.username}</td>
                      <td>{club.gmail || 'Not set'}</td>
                      <td>
                        {club.spreadsheetUrl ? (
                          <a href={club.spreadsheetUrl} target="_blank" rel="noopener noreferrer" style={{color: '#667eea'}}>
                            View Sheet
                          </a>
                        ) : (
                          <span style={{color: '#999'}}>Not created</span>
                        )}
                      </td>
                      <td>
                        <span className={`status-badge ${club.isActive ? 'connected' : 'disconnected'}`}>
                          {club.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td>
                        <div style={{display: 'flex', gap: '8px'}}>
                          <button 
                            className="btn btn-small btn-secondary" 
                            onClick={() => handleEdit(club)}
                          >
                            Edit
                          </button>
                          <button 
                            className="btn btn-small btn-danger" 
                            onClick={() => handleDeleteClub(club.id)}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => { setShowCreateModal(false); resetForm(); }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingClub ? 'Edit Nightclub' : 'Add New Nightclub'}</h3>
              <button className="modal-close" onClick={() => { setShowCreateModal(false); resetForm(); }}>×</button>
            </div>
            
            <form onSubmit={editingClub ? handleUpdateClub : handleCreateClub}>
              <div className="form-group">
                <label>Nightclub Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  required
                  placeholder="e.g., Mumbai Nightclub, Delhi Bar & Club"
                />
              </div>

              <div className="form-group">
                <label>Username *</label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({...formData, username: e.target.value.toLowerCase()})}
                  required
                  placeholder="e.g., mumbai_cricket"
                  disabled={editingClub}
                />
                {editingClub && <small style={{color: '#666'}}>Username cannot be changed</small>}
              </div>

              <div className="form-group">
                <label>Password {editingClub ? '(leave blank to keep current)' : '*'}</label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  required={!editingClub}
                  placeholder="Enter password"
                />
              </div>

              <div className="form-group">
                <label>Gmail Account *</label>
                <input
                  type="email"
                  value={formData.gmail}
                  onChange={(e) => setFormData({...formData, gmail: e.target.value})}
                  required
                  placeholder="nightclub.mumbai@gmail.com"
                />
                <small style={{color: '#666'}}>Gmail account created for this nightclub (you'll provide credentials to club owner)</small>
              </div>

              <div className="form-group">
                <label>Gmail Password *</label>
                <input
                  type="password"
                  value={formData.gmailPassword}
                  onChange={(e) => setFormData({...formData, gmailPassword: e.target.value})}
                  required
                  placeholder="Gmail account password"
                />
                <small style={{color: '#666'}}>Password for the Gmail account (stored securely, given to club owner)</small>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => { setShowCreateModal(false); resetForm(); }}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? 'Saving...' : editingClub ? 'Update Nightclub' : 'Add Nightclub'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;

