import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import FormRenderer from '../../components/FormRenderer/FormRenderer';
import { changeRequestsAPI } from '../../services/api';
import apiProps from '../../config/apiProps.json';
import './ApiConfiguration.css';

const ApiConfiguration = () => {
  const { teamId, apiId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [formData, setFormData] = useState({});
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [changeRequest, setChangeRequest] = useState(null);
  const [comments, setComments] = useState([]);
  const [history, setHistory] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [addingComment, setAddingComment] = useState(false);

  // Fetch change request data from API
  useEffect(() => {
    if (!apiId || apiId === 'create') {
      // Initialize empty form for new CR
      const initialData = {};
      apiProps.elements.forEach((element) => {
        if (element.type === 'Section') {
          const sectionName = element.props.name;
          if (element.isRepeatable) {
            initialData[sectionName] = [{}];
          } else {
            initialData[sectionName] = {};
          }
          if (element.children) {
            element.children.forEach((child) => {
              const fieldName = child.props.name;
              if (element.isRepeatable) {
                initialData[sectionName][0][fieldName] = getDefaultValue(child);
              } else {
                initialData[sectionName][fieldName] = getDefaultValue(child);
              }
            });
          }
        }
      });
      setFormData(initialData);
      setLoading(false);
      return;
    }

    const fetchChangeRequest = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch change request details
        const crData = await changeRequestsAPI.get(apiId);
        setChangeRequest(crData);
        
        // Fetch comments
        const commentsData = await changeRequestsAPI.getComments(apiId);
        setComments(commentsData);
        
        // Fetch history
        const historyData = await changeRequestsAPI.getHistory(apiId);
        setHistory(historyData);
        
        // Parse and set form data from config_changes_payload
        if (crData.config_changes_payload) {
          try {
            const configData = JSON.parse(crData.config_changes_payload);
            
            // Ensure proper structure for repeatable sections
            apiProps.elements.forEach((element) => {
              if (element.type === 'Section' && element.isRepeatable) {
                const sectionName = element.props.name;
                if (configData[sectionName] && !Array.isArray(configData[sectionName])) {
                  configData[sectionName] = [configData[sectionName]];
                } else if (!configData[sectionName]) {
                  configData[sectionName] = [{}];
                }
              }
            });
            
            setFormData(configData);
          } catch (parseError) {
            console.error('Error parsing config payload:', parseError);
            setFormData({});
          }
        } else {
          // Initialize empty form if no payload
          const initialData = {};
          apiProps.elements.forEach((element) => {
            if (element.type === 'Section') {
              const sectionName = element.props.name;
              if (element.isRepeatable) {
                initialData[sectionName] = [{}];
              } else {
                initialData[sectionName] = {};
              }
            }
          });
          setFormData(initialData);
        }
      } catch (err) {
        setError(err.message || 'Failed to load change request');
        console.error('Error fetching change request:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchChangeRequest();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiId]);

  const getDefaultValue = (element) => {
    if (element.type === 'Select' && element.props.defaultValue !== undefined) {
      return element.props.defaultValue;
    }
    if (element.type === 'Checkbox') {
      return false;
    }
    if (element.type === 'Input' && element.props.dataType === 'number') {
      return '';
    }
    return '';
  };

  const handleFieldChange = (fieldPath, value) => {
    setFormData((prev) => {
      const newData = { ...prev };
      const keys = fieldPath.split('.');
      
      let current = newData;
      for (let i = 0; i < keys.length - 1; i++) {
        const key = keys[i];
        if (!isNaN(key)) {
          const index = parseInt(key);
          if (!Array.isArray(current)) {
            current = [];
          }
          if (!current[index]) {
            current[index] = {};
          }
          current = current[index];
        } else {
          if (!current[key]) {
            const nextKey = keys[i + 1];
            current[key] = !isNaN(nextKey) ? [] : {};
          }
          current = current[key];
        }
      }
      
      const lastKey = keys[keys.length - 1];
      if (Array.isArray(current)) {
        const index = parseInt(lastKey);
        if (!current[index]) {
          current[index] = {};
        }
        current = current[index];
      } else {
        current[lastKey] = value;
      }
      
      return newData;
    });

    // Clear error for this field when user starts typing
    if (errors[fieldPath]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[fieldPath];
        return newErrors;
      });
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    const validateElement = (element, data, path = '') => {
      const fieldPath = path ? `${path}.${element.props?.name || element.id}` : (element.props?.name || element.id);
      
      // Check dependencies
      if (element.dependencies?.showIf) {
        const { field, value } = element.dependencies.showIf;
        let fieldValue = getNestedValue(data, field);
        
        if (fieldValue === undefined && path) {
          const relativePath = `${path}.${field}`;
          fieldValue = getNestedValue(data, relativePath);
        }
        
        if (fieldValue !== value) {
          return;
        }
      }
      
      // Validate required fields
      if (element.props?.required) {
        const value = getNestedValue(data, fieldPath);
        if (value === undefined || value === '' || value === null || 
            (Array.isArray(value) && value.length === 0)) {
          newErrors[fieldPath] = `${element.props.label || fieldPath} is required`;
        }
      }
      
      // Validate URL type
      if (element.type === 'Input' && element.props.dataType === 'url') {
        const value = getNestedValue(data, fieldPath);
        if (value && !/^https?:\/\/.+/.test(value)) {
          newErrors[fieldPath] = 'Must be a valid HTTP/HTTPS URL';
        }
      }
      
      // Recursively validate children
      if (element.children) {
        element.children.forEach((child) => {
          validateElement(child, data, path);
        });
      }
    };
    
    // Validate all elements
    apiProps.elements.forEach((element) => {
      if (element.type === 'Section') {
        const sectionName = element.props.name;
        const sectionData = formData[sectionName];
        
        if (element.isRepeatable && Array.isArray(sectionData)) {
          sectionData.forEach((instance, index) => {
            if (element.children) {
              element.children.forEach((child) => {
                validateElement(child, formData, `${sectionName}.${index}`);
              });
            }
          });
        } else {
          if (element.children) {
            element.children.forEach((child) => {
              validateElement(child, formData, sectionName);
            });
          }
        }
      }
    });
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const getNestedValue = (obj, path) => {
    const keys = path.split('.');
    let value = obj;
    for (const key of keys) {
      if (value && typeof value === 'object') {
        value = value[key];
      } else {
        return undefined;
      }
    }
    return value;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }
    
    if (!changeRequest) {
      alert('Cannot save: Change request not loaded');
      return;
    }

    // Check if user can edit (only requester can edit, and only if not approved)
    if (changeRequest.requester_user_id !== user?.user_id) {
      alert('You can only edit change requests that you created');
      return;
    }

    if (changeRequest.approval_status === 'APPROVED') {
      alert('Cannot edit: This change request has been approved');
      return;
    }

    try {
      setSaving(true);
      const configPayload = JSON.stringify(formData);
      await changeRequestsAPI.update(changeRequest.cr_id, changeRequest.title, configPayload);
      
      // Refresh change request data
      const updatedCR = await changeRequestsAPI.get(apiId);
      setChangeRequest(updatedCR);
      
      alert('Change request updated successfully!');
    } catch (err) {
      alert(err.message || 'Failed to update change request');
      console.error('Error saving change request:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleAddComment = async () => {
    if (!commentText.trim() || !changeRequest) {
      return;
    }

    try {
      setAddingComment(true);
      const newComment = await changeRequestsAPI.addComment(changeRequest.cr_id, commentText);
      setComments(prev => [...prev, newComment]);
      setCommentText('');
    } catch (err) {
      alert(err.message || 'Failed to add comment');
      console.error('Error adding comment:', err);
    } finally {
      setAddingComment(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
  };

  const canEdit = changeRequest &&
    changeRequest.requester_user_id === user?.user_id &&
    changeRequest.approval_status !== 'APPROVED';

  if (loading) {
    return (
      <div className="api-configuration">
        <div className="loading">Loading change request...</div>
      </div>
    );
  }

  if (error && !changeRequest) {
    return (
      <div className="api-configuration">
        <div className="error">Error: {error}</div>
        <button className="btn btn-secondary" onClick={() => navigate(-1)}>
          Go Back
        </button>
      </div>
    );
  }

  if (!changeRequest && apiId !== 'create') {
    return (
      <div className="api-configuration">
        <div className="error">Change request not found</div>
        <button className="btn btn-secondary" onClick={() => navigate(-1)}>
          Go Back
        </button>
      </div>
    );
  }

  if (!apiProps || !apiProps.elements) {
    return (
      <div className="api-configuration">
        <div className="error">Error loading form configuration</div>
      </div>
    );
  }

  return (
    <div className="api-configuration">
      <div className="api-config-header">
        <button className="back-button" onClick={() => navigate(-1)}>
          ← Back
        </button>
        <div className="header-info">
          <h2>{changeRequest?.title || 'Create Change Request'}</h2>
          {changeRequest && (
            <div className="request-meta">
              <span className={`status-badge approval-${changeRequest.approval_status?.toLowerCase()}`}>
                {changeRequest.approval_status}
              </span>
              <span className={`status-badge execution-${changeRequest.execution_status?.toLowerCase()}`}>
                {changeRequest.execution_status}
              </span>
              <span className="meta-info">Team: {changeRequest.requester_team?.name || 'N/A'}</span>
              <span className="meta-info">Requester: {changeRequest.requester_user?.username || 'N/A'}</span>
              <span className="meta-info">Created: {formatDate(changeRequest.created_at)}</span>
            </div>
          )}
        </div>
      </div>

      <div className="api-config-content">
        <div className="config-form-section">
          <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} className={`api-config-form ${!canEdit ? 'read-only' : ''}`}>
            {changeRequest && !canEdit && (
              <div className="read-only-notice">
                {changeRequest.approval_status === 'APPROVED'
                  ? 'This change request has been approved and cannot be edited.'
                  : 'You do not have permission to edit this change request.'}
              </div>
            )}
            {apiProps.elements.map((element) => (
              <FormRenderer
                key={element.id}
                element={element}
                formData={formData}
                errors={errors}
                onChange={canEdit ? handleFieldChange : () => {}}
              />
            ))}
            {canEdit && (
              <div className="config-actions">
                <button type="button" className="btn btn-secondary" onClick={() => navigate(-1)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : 'Save Configuration'}
                </button>
              </div>
            )}
          </form>
        </div>

        {changeRequest && (
          <div className="comments-section">
            <h3>Comments ({comments.length})</h3>
            <div className="comments-list">
              {comments.length === 0 ? (
                <div className="comments-empty">No comments yet</div>
              ) : (
                comments.map((comment) => (
                  <div key={comment.comment_id} className="comment-item">
                    <div className="comment-header">
                      <span className="comment-user">{comment.user?.username || 'Unknown'}</span>
                      <span className="comment-date">{formatDate(comment.created_at)}</span>
                    </div>
                    <div className="comment-text">{comment.comment_text}</div>
                  </div>
                ))
              )}
            </div>
            <div className="comment-form">
              <textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Add a comment..."
                rows={3}
                disabled={addingComment}
              />
              <button
                onClick={handleAddComment}
                disabled={!commentText.trim() || addingComment}
                className="btn btn-primary"
              >
                {addingComment ? 'Adding...' : 'Add Comment'}
              </button>
            </div>
          </div>
        )}

        {changeRequest && history.length > 0 && (
          <div className="history-section">
            <h3>History ({history.length})</h3>
            <div className="history-list">
              {history.map((entry) => {
                const isStatusChange = entry.event_type !== 'COMMENT_ADDED' && 
                                       entry.new_status && 
                                       entry.new_status.trim() !== '';
                
                return (
                  <div key={entry.history_id} className="history-item">
                    <div className="history-header">
                      <span className="history-event">{entry.event_type}</span>
                      <span className="history-date">{formatDate(entry.timestamp)}</span>
                    </div>
                    {isStatusChange && (
                      <>
                        {entry.old_status && (
                          <div className="history-change">
                            <span className="history-label">From:</span> {entry.old_status}
                          </div>
                        )}
                        <div className="history-change">
                          <span className="history-label">To:</span> {entry.new_status}
                        </div>
                      </>
                    )}
                    {entry.changed_by && (
                      <div className="history-user">
                        By: {entry.changed_by.username || 'Unknown'}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ApiConfiguration;
