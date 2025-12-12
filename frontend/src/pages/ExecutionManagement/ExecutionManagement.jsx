import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { changeRequestsAPI } from '../../services/api';
import './ExecutionManagement.css';

const ExecutionManagement = () => {
  const navigate = useNavigate();
  const [changeRequests, setChangeRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterStatus, setFilterStatus] = useState('APPROVED');
  const [updatingId, setUpdatingId] = useState(null);

  useEffect(() => {
    fetchChangeRequests();
  }, [filterStatus]);

  const fetchChangeRequests = async () => {
    try {
      setLoading(true);
      const params = { approval_status: 'APPROVED' };
      if (filterStatus && filterStatus !== 'ALL') {
        params.execution_status = filterStatus;
      }
      const data = await changeRequestsAPI.list(params);
      setChangeRequests(data);
      setError(null);
    } catch (err) {
      setError(err.message || 'Failed to fetch change requests');
      console.error('Error fetching change requests:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (crId, newStatus) => {
    try {
      setUpdatingId(crId);
      await changeRequestsAPI.updateExecutionStatus(crId, newStatus);
      fetchChangeRequests();
      alert('Execution status updated successfully');
    } catch (err) {
      alert(err.message || 'Failed to update execution status');
      console.error('Error updating execution status:', err);
    } finally {
      setUpdatingId(null);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'DRAFT': return '#6c757d';
      case 'IN_PROGRESS': return '#007bff';
      case 'COMPLETED': return '#28a745';
      case 'CANCELED': return '#dc3545';
      default: return '#6c757d';
    }
  };

  if (loading) {
    return (
      <div className="execution-container">
        <div className="loading">Loading approved change requests...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="execution-container">
        <div className="error">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="execution-container">
      <div className="execution-header">
        <h1>Execution Management</h1>
        <p>Manage execution status of approved change requests</p>
      </div>

      <div className="execution-filters">
        <label>
          Filter by execution status:
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="ALL">All</option>
            <option value="DRAFT">Draft</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELED">Canceled</option>
          </select>
        </label>
      </div>

      {changeRequests.length === 0 ? (
        <div className="execution-empty">
          <p>No approved change requests found</p>
        </div>
      ) : (
        <div className="execution-list">
          {changeRequests.map((cr) => (
            <div key={cr.cr_id} className="execution-item">
              <div className="execution-header-item">
                <h3>{cr.title || `Change Request #${cr.cr_id}`}</h3>
                <div className="execution-meta">
                  <span className="meta-label">Team:</span>
                  <span>{cr.requester_team?.name || 'N/A'}</span>
                  <span className="meta-label">Requester:</span>
                  <span>{cr.requester_user?.username || 'N/A'}</span>
                  <span className="meta-label">Created:</span>
                  <span>{formatDate(cr.created_at)}</span>
                </div>
              </div>

              <div className="execution-status">
                <span
                  className="status-badge"
                  style={{ backgroundColor: getStatusColor(cr.execution_status) }}
                >
                  {cr.execution_status}
                </span>
              </div>

              <div className="execution-content">
                <div className="execution-config">
                  <h4>Configuration Changes:</h4>
                  <pre>{JSON.stringify(JSON.parse(cr.config_changes_payload || '{}'), null, 2)}</pre>
                </div>

                <div className="execution-actions">
                  {cr.execution_status === 'DRAFT' && (
                    <button
                      className="btn btn-primary"
                      onClick={() => handleUpdateStatus(cr.cr_id, 'IN_PROGRESS')}
                      disabled={updatingId === cr.cr_id}
                    >
                      {updatingId === cr.cr_id ? 'Updating...' : 'Start Execution'}
                    </button>
                  )}
                  {cr.execution_status === 'IN_PROGRESS' && (
                    <>
                      <button
                        className="btn btn-success"
                        onClick={() => handleUpdateStatus(cr.cr_id, 'COMPLETED')}
                        disabled={updatingId === cr.cr_id}
                      >
                        {updatingId === cr.cr_id ? 'Updating...' : 'Mark Complete'}
                      </button>
                      <button
                        className="btn btn-warning"
                        onClick={() => handleUpdateStatus(cr.cr_id, 'CANCELED')}
                        disabled={updatingId === cr.cr_id}
                      >
                        {updatingId === cr.cr_id ? 'Updating...' : 'Cancel'}
                      </button>
                    </>
                  )}
                  <button
                    className="btn btn-secondary"
                    onClick={() => navigate(`/team/${cr.requester_team_id}/api/${cr.cr_id}`)}
                  >
                    View Details
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ExecutionManagement;

