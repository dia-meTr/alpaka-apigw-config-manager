import React, { useState, useEffect } from 'react';
import { teamsAPI, usersAPI } from '../../services/api';
import './TeamsManagement.css';

const TeamsManagement = () => {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAddMemberModal, setShowAddMemberModal] = useState(null);
  const [newTeamName, setNewTeamName] = useState('');
  const [selectedUser, setSelectedUser] = useState('');
  const [allUsers, setAllUsers] = useState([]);
  const [creatingTeam, setCreatingTeam] = useState(false);
  const [addingMember, setAddingMember] = useState(false);

  useEffect(() => {
    fetchTeams();
  }, []);

  const fetchTeams = async () => {
    try {
      setLoading(true);
      const data = await teamsAPI.list();
      setTeams(data);
      setError(null);
    } catch (err) {
      setError(err.message || 'Failed to fetch teams');
      console.error('Error fetching teams:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      // Fetch all users from the API
      const users = await usersAPI.list();
      setAllUsers(users);
    } catch (err) {
      console.error('Error fetching users:', err);
      // Fallback: try to get users from teams if API fails
      try {
        const data = await teamsAPI.list();
        const usersMap = new Map();
        data.forEach(team => {
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

  const handleCreateTeam = async (e) => {
    e.preventDefault();
    if (!newTeamName.trim()) {
      alert('Team name is required');
      return;
    }

    try {
      setCreatingTeam(true);
      await teamsAPI.create(newTeamName.trim());
      setNewTeamName('');
      setShowCreateModal(false);
      fetchTeams();
      alert('Team created successfully');
    } catch (err) {
      alert(err.message || 'Failed to create team');
      console.error('Error creating team:', err);
    } finally {
      setCreatingTeam(false);
    }
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
      fetchTeams();
      alert('Member added successfully');
    } catch (err) {
      alert(err.message || 'Failed to add member');
      console.error('Error adding member:', err);
    } finally {
      setAddingMember(false);
    }
  };

  const handleRemoveMember = async (teamId, userId) => {
    if (!window.confirm('Are you sure you want to remove this member from the team?')) {
      return;
    }

    try {
      await teamsAPI.removeMember(teamId, userId);
      fetchTeams();
      alert('Member removed successfully');
    } catch (err) {
      alert(err.message || 'Failed to remove member');
      console.error('Error removing member:', err);
    }
  };

  if (loading) {
    return (
      <div className="teams-management-container">
        <div className="loading">Loading teams...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="teams-management-container">
        <div className="error">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="teams-management-container">
      <div className="teams-management-header">
        <h1>Teams Management</h1>
        <p>Manage teams and their members</p>
        <button
          className="btn btn-primary"
          onClick={() => setShowCreateModal(true)}
        >
          Create New Team
        </button>
      </div>

      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Create New Team</h2>
            <form onSubmit={handleCreateTeam}>
              <div className="form-group">
                <label>
                  Team Name:
                  <input
                    type="text"
                    value={newTeamName}
                    onChange={(e) => setNewTeamName(e.target.value)}
                    placeholder="Enter team name"
                    required
                  />
                </label>
              </div>
              <div className="modal-actions">
                <button type="submit" className="btn btn-primary" disabled={creatingTeam}>
                  {creatingTeam ? 'Creating...' : 'Create Team'}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowCreateModal(false);
                    setNewTeamName('');
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {teams.length === 0 ? (
        <div className="teams-empty">
          <p>No teams found. Create your first team to get started.</p>
        </div>
      ) : (
        <div className="teams-list">
          {teams.map((team) => (
            <div key={team.team_id} className="team-card">
              <div className="team-header">
                <h3>{team.name}</h3>
                <span className="team-id">ID: {team.team_id}</span>
              </div>

              <div className="team-members">
                <div className="members-header">
                  <h4>Members ({team.members?.length || 0})</h4>
                  <button
                    className="btn btn-small btn-primary"
                    onClick={() => {
                      setShowAddMemberModal(team.team_id);
                      fetchUsers();
                    }}
                  >
                    Add Member
                  </button>
                </div>

                {showAddMemberModal === team.team_id && (
                  <div className="add-member-form">
                    <select
                      value={selectedUser}
                      onChange={(e) => setSelectedUser(e.target.value)}
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
                    <div className="add-member-actions">
                      <button
                        className="btn btn-small btn-primary"
                        onClick={() => handleAddMember(team.team_id)}
                        disabled={addingMember || !selectedUser}
                      >
                        {addingMember ? 'Adding...' : 'Add'}
                      </button>
                      <button
                        className="btn btn-small btn-secondary"
                        onClick={() => {
                          setShowAddMemberModal(null);
                          setSelectedUser('');
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {team.members && team.members.length > 0 ? (
                  <ul className="members-list">
                    {team.members.map((member) => (
                      <li key={member.user_id} className="member-item">
                        <div className="member-info">
                          <span className="member-name">
                            {member.user?.username || `User #${member.user_id}`}
                          </span>
                          {member.user?.email && (
                            <span className="member-email">{member.user.email}</span>
                          )}
                        </div>
                        <button
                          className="btn btn-small btn-danger"
                          onClick={() => handleRemoveMember(team.team_id, member.user_id)}
                        >
                          Remove
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="no-members">No members yet</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TeamsManagement;

