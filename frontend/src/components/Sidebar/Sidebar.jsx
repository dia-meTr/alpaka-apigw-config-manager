import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { teamsAPI, changeRequestsAPI, usersAPI } from '../../services/api';
import './Sidebar.css';

const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isGatewayEditor } = useAuth();
  
  // Extract teamId and requestId from pathname
  const pathMatch = location.pathname.match(/\/team\/([^/]+)(?:\/api\/(.+))?/);
  const teamId = pathMatch ? pathMatch[1] : null;
  const requestId = pathMatch ? pathMatch[2] : null;
  
  const [teams, setTeams] = useState([]);
  const [teamRequests, setTeamRequests] = useState({}); // { teamId: [requests] }
  const [expandedTeams, setExpandedTeams] = useState(() => {
    if (teamId) {
      return [teamId];
    }
    return [];
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddMemberModal, setShowAddMemberModal] = useState(null);
  const [selectedUser, setSelectedUser] = useState('');
  const [allUsers, setAllUsers] = useState([]);
  const [addingMember, setAddingMember] = useState(false);

  useEffect(() => {
    fetchTeams();
  }, []);

  useEffect(() => {
    if (teamId && !expandedTeams.includes(teamId)) {
      setExpandedTeams(prev => [...prev, teamId]);
    }
  }, [teamId]);

  useEffect(() => {
    // Fetch change requests for all expanded teams
    expandedTeams.forEach(teamId => {
      if (!teamRequests[teamId]) {
        fetchTeamChangeRequests(teamId);
      }
    });
  }, [expandedTeams]);

  const fetchTeams = async () => {
    try {
      setLoading(true);
      const data = await teamsAPI.getMyTeams();
      setTeams(data);
      setError(null);
    } catch (err) {
      setError(err.message || 'Failed to fetch teams');
      console.error('Error fetching teams:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTeamChangeRequests = async (teamId) => {
    try {
      // Ensure teamId is converted to number for the API call
      const teamIdNum = typeof teamId === 'string' ? parseInt(teamId, 10) : teamId;
      const data = await changeRequestsAPI.list({ team_id: teamIdNum });
      setTeamRequests(prev => ({
        ...prev,
        [teamId]: data // Store with string key for consistency
      }));
    } catch (err) {
      console.error(`Error fetching change requests for team ${teamId}:`, err);
      setTeamRequests(prev => ({
        ...prev,
        [teamId]: []
      }));
    }
  };

  const fetchAllUsers = async () => {
    try {
      // Fetch all users from the API
      const users = await usersAPI.list();
      setAllUsers(users);
    } catch (err) {
      console.error('Error fetching users:', err);
      // Fallback: try to get users from teams if API fails
      try {
        const allTeamsData = await teamsAPI.list();
        const usersMap = new Map();
        allTeamsData.forEach(team => {
          team.members?.forEach(member => {
            if (member.user) {
              usersMap.set(member.user.user_id, member.user);
            }
          });
        });
        setAllUsers(Array.from(usersMap.values()));
      } catch (fallbackErr) {
        console.error('Error fetching users from teams:', fallbackErr);
      }
    }
  };

  const toggleTeam = (teamIdToToggle) => {
    setExpandedTeams(prev => 
      prev.includes(teamIdToToggle)
        ? prev.filter(id => id !== teamIdToToggle)
        : [...prev, teamIdToToggle]
    );
  };

  const handleRequestClick = (teamIdClicked, requestIdClicked) => {
    navigate(`/team/${teamIdClicked}/api/${requestIdClicked}`);
  };

  const handleCreateRequestClick = (teamIdClicked) => {
    navigate(`/team/${teamIdClicked}/api/create`);
  };

  const handleAddMemberClick = async (team) => {
    await fetchAllUsers();
    setShowAddMemberModal(team.team_id);
  };

  const handleAddMember = async (teamId) => {
    if (!selectedUser) {
      alert('Please select a user');
      return;
    }

    try {
      setAddingMember(true);
      await teamsAPI.addMember(teamId, parseInt(selectedUser));
      setSelectedUser('');
      setShowAddMemberModal(null);
      fetchTeams(); // Refresh teams to show new member
      alert('Member added successfully');
    } catch (err) {
      alert(err.message || 'Failed to add member');
      console.error('Error adding member:', err);
    } finally {
      setAddingMember(false);
    }
  };

  const isTeamMember = (team) => {
    if (!user) return false;
    return team.members?.some(member => member.user_id === user.user_id) || false;
  };

  const canAddMember = (team) => {
    return isTeamMember(team) || isGatewayEditor;
  };

  if (loading) {
    return (
      <aside className="sidebar">
        <nav className="sidebar-nav">
          <div className="sidebar-section">
            <h3 className="sidebar-section-title">Teams</h3>
            <div className="sidebar-loading">Loading teams...</div>
          </div>
        </nav>
      </aside>
    );
  }

  if (error) {
    return (
      <aside className="sidebar">
        <nav className="sidebar-nav">
          <div className="sidebar-section">
            <h3 className="sidebar-section-title">Teams</h3>
            <div className="sidebar-error">Error: {error}</div>
          </div>
        </nav>
      </aside>
    );
  }

  return (
    <aside className="sidebar">
      <nav className="sidebar-nav">
        <div className="sidebar-section">
          <h3 className="sidebar-section-title">Teams</h3>
          {teams.length === 0 ? (
            <div className="sidebar-empty">No teams found</div>
          ) : (
            <ul className="sidebar-menu">
              {teams.map((team) => {
                const teamIdStr = team.team_id.toString();
                const isExpanded = expandedTeams.includes(teamIdStr);
                const isTeamActive = teamId === teamIdStr;
                const requests = teamRequests[teamIdStr] || [];
                
                return (
                  <li key={team.team_id} className="sidebar-menu-item">
                    <button
                      className={`sidebar-button sidebar-team-button ${isTeamActive ? 'active' : ''}`}
                      onClick={() => toggleTeam(team.team_id.toString())}
                    >
                      <span className="sidebar-icon sidebar-chevron">
                        {isExpanded ? '▼' : '▶'}
                      </span>
                      <span className="sidebar-icon">👥</span>
                      <span className="sidebar-label">{team.name}</span>
                    </button>
                    
                    {isExpanded && (
                      <ul className="sidebar-submenu">
                        {requests.map((cr) => {
                          const isRequestActive = teamId === team.team_id.toString() && requestId === cr.cr_id.toString();
                          return (
                            <li key={cr.cr_id} className="sidebar-submenu-item">
                              <button
                                className={`sidebar-button sidebar-api-button ${isRequestActive ? 'active' : ''}`}
                                onClick={() => handleRequestClick(team.team_id.toString(), cr.cr_id.toString())}
                              >
                                <span className="sidebar-icon">📝</span>
                                <span className="sidebar-label">{cr.title || `CR #${cr.cr_id}`}</span>
                              </button>
                            </li>
                          );
                        })}
                        <li className="sidebar-submenu-item">
                          <button
                            className={`sidebar-button sidebar-api-button ${teamId === team.team_id.toString() && requestId === 'create' ? 'active' : ''}`}
                            onClick={() => handleCreateRequestClick(team.team_id.toString())}
                          >
                            <span className="sidebar-icon">➕</span>
                            <span className="sidebar-label">Create Change Request</span>
                          </button>
                        </li>
                        {canAddMember(team) && (
                          <li className="sidebar-submenu-item">
                            <button
                              className="sidebar-button sidebar-api-button"
                              onClick={() => handleAddMemberClick(team)}
                              style={{ color: '#667eea' }}
                            >
                              <span className="sidebar-icon">👤</span>
                              <span className="sidebar-label">Add Member</span>
                            </button>
                          </li>
                        )}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </nav>

      {/* Add Member Modal */}
      {showAddMemberModal && (
        <div className="sidebar-modal-overlay" onClick={() => setShowAddMemberModal(null)}>
          <div className="sidebar-modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Add Team Member</h3>
            <select
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
              style={{
                width: '100%',
                padding: '0.5rem',
                marginBottom: '1rem',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '1rem'
              }}
            >
              <option value="">Select a user...</option>
              {allUsers
                .filter(user => {
                  // Filter out users who are already members of this team
                  const team = teams.find(t => t.team_id === showAddMemberModal);
                  return !team?.members?.some(m => m.user_id === user.user_id);
                })
                .map((user) => (
                  <option key={user.user_id} value={user.user_id}>
                    {user.username} {user.email ? `(${user.email})` : ''}
                  </option>
                ))}
            </select>
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <button
                className="sidebar-modal-btn sidebar-modal-btn-primary"
                onClick={() => handleAddMember(showAddMemberModal)}
                disabled={addingMember || !selectedUser}
              >
                {addingMember ? 'Adding...' : 'Add'}
              </button>
              <button
                className="sidebar-modal-btn sidebar-modal-btn-secondary"
                onClick={() => {
                  setShowAddMemberModal(null);
                  setSelectedUser('');
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
};

export default Sidebar;
