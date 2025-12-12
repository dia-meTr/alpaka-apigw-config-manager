import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { changeRequestsAPI } from '../../services/api';
import './Approvals.css';

const Approvals = () => {
  const navigate = useNavigate();
  const [changeRequests, setChangeRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reviewingId, setReviewingId] = useState(null);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewDecision, setReviewDecision] = useState('APPROVED');

  useEffect(() => {
    fetchChangeRequests();
  }, []);

  const fetchChangeRequests = async () => {
    try {
      setLoading(true);
      const data = await changeRequestsAPI.list({ approval_status: 'PENDING_APPROVAL' });
      setChangeRequests(data);
      setError(null);
    } catch (err) {
      setError(err.message || 'Failed to fetch change requests');
      console.error('Error fetching change requests:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async (crId) => {
    try {
      setReviewingId(crId);
      await changeRequestsAPI.review(crId, reviewDecision);
      
      // Add comment if provided
      if (reviewComment.trim()) {
        await changeRequestsAPI.addComment(crId, reviewComment);
      }
      
      setReviewComment('');
      setReviewDecision('APPROVED');
      fetchChangeRequests();
      alert('Change request reviewed successfully');
    } catch (err) {
      alert(err.message || 'Failed to review change request');
      console.error('Error reviewing change request:', err);
    } finally {
      setReviewingId(null);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
  };

  if (loading) {
    return (
      <div className="approvals-container">
        <div className="loading">Loading change requests...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="approvals-container">
        <div className="error">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="approvals-container">
      <div className="approvals-header">
        <h1>Pending Approvals</h1>
        <p>Review and approve or reject pending change requests</p>
      </div>

      {changeRequests.length === 0 ? (
        <div className="approvals-empty">
          <p>No pending change requests to review</p>
        </div>
      ) : (
        <div className="approvals-list">
          {changeRequests.map((cr) => (
            <div key={cr.cr_id} className="approval-item">
              <div className="approval-header">
                <h3>{cr.title || `Change Request #${cr.cr_id}`}</h3>
                <div className="approval-meta">
                  <span className="meta-label">Team:</span>
                  <span>{cr.requester_team?.name || 'N/A'}</span>
                  <span className="meta-label">Requester:</span>
                  <span>{cr.requester_user?.username || 'N/A'}</span>
                  <span className="meta-label">Created:</span>
                  <span>{formatDate(cr.created_at)}</span>
                </div>
              </div>

              <div className="approval-content">
                <div className="approval-config">
                  <h4>Configuration Changes:</h4>
                  <pre>{JSON.stringify(JSON.parse(cr.config_changes_payload || '{}'), null, 2)}</pre>
                </div>

                {reviewingId === cr.cr_id ? (
                  <div className="review-form">
                    <div className="review-decision">
                      <label>
                        <input
                          type="radio"
                          value="APPROVED"
                          checked={reviewDecision === 'APPROVED'}
                          onChange={(e) => setReviewDecision(e.target.value)}
                        />
                        Approve
                      </label>
                      <label>
                        <input
                          type="radio"
                          value="REJECTED"
                          checked={reviewDecision === 'REJECTED'}
                          onChange={(e) => setReviewDecision(e.target.value)}
                        />
                        Reject
                      </label>
                    </div>
                    <textarea
                      value={reviewComment}
                      onChange={(e) => setReviewComment(e.target.value)}
                      placeholder="Add a comment (optional)..."
                      rows={3}
                    />
                    <div className="review-actions">
                      <button
                        className="btn btn-primary"
                        onClick={() => handleReview(cr.cr_id)}
                      >
                        Submit Review
                      </button>
                      <button
                        className="btn btn-secondary"
                        onClick={() => {
                          setReviewingId(null);
                          setReviewComment('');
                          setReviewDecision('APPROVED');
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="approval-actions">
                    <button
                      className="btn btn-primary"
                      onClick={() => {
                        setReviewingId(cr.cr_id);
                        setReviewDecision('APPROVED');
                      }}
                    >
                      Review
                    </button>
                    <button
                      className="btn btn-secondary"
                      onClick={() => navigate(`/team/${cr.requester_team_id}/api/${cr.cr_id}`)}
                    >
                      View Details
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Approvals;

