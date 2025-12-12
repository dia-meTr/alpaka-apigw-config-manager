const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080/api/v1';

// Get token from localStorage
const getToken = () => {
  return localStorage.getItem('token');
};

// Set token in localStorage
const setToken = (token) => {
  localStorage.setItem('token', token);
};

// Remove token from localStorage
const removeToken = () => {
  localStorage.removeItem('token');
};

// API request helper
const apiRequest = async (endpoint, options = {}) => {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(errorData.error || errorData.message || `HTTP error! status: ${response.status}`);
  }

  return response.json();
};

// Auth API
export const authAPI = {
  register: async (username, email, password) => {
    const data = await apiRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, email, password }),
    });
    if (data.token) {
      setToken(data.token);
    }
    return data;
  },

  login: async (username, password) => {
    const data = await apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    if (data.token) {
      setToken(data.token);
    }
    return data;
  },

  getCurrentUser: async () => {
    return apiRequest('/auth/me');
  },

  logout: () => {
    removeToken();
  },
};

// Change Requests API
export const changeRequestsAPI = {
  list: async (params = {}) => {
    const queryParams = new URLSearchParams();
    if (params.approval_status) queryParams.append('approval_status', params.approval_status);
    if (params.execution_status) queryParams.append('execution_status', params.execution_status);
    if (params.team_id) queryParams.append('team_id', params.team_id);
    if (params.user_id) queryParams.append('user_id', params.user_id);
    if (params.page) queryParams.append('page', params.page);
    if (params.limit) queryParams.append('limit', params.limit);
    
    const query = queryParams.toString();
    return apiRequest(`/change-requests${query ? `?${query}` : ''}`);
  },

  get: async (id) => {
    return apiRequest(`/change-requests/${id}`);
  },

  create: async (title, configChangesPayload, requesterTeamId) => {
    return apiRequest('/change-requests', {
      method: 'POST',
      body: JSON.stringify({
        title,
        config_changes_payload: configChangesPayload,
        requester_team_id: requesterTeamId,
      }),
    });
  },

  update: async (id, title, configChangesPayload) => {
    return apiRequest(`/change-requests/${id}`, {
      method: 'PUT',
      body: JSON.stringify({
        title,
        config_changes_payload: configChangesPayload,
      }),
    });
  },

  review: async (id, reviewDecision) => {
    return apiRequest(`/change-requests/${id}/review`, {
      method: 'POST',
      body: JSON.stringify({ review_decision: reviewDecision }),
    });
  },

  updateExecutionStatus: async (id, executionStatus) => {
    return apiRequest(`/change-requests/${id}/execution-status`, {
      method: 'PUT',
      body: JSON.stringify({ execution_status: executionStatus }),
    });
  },

  addComment: async (id, commentText) => {
    return apiRequest(`/change-requests/${id}/comments`, {
      method: 'POST',
      body: JSON.stringify({ comment_text: commentText }),
    });
  },

  getComments: async (id) => {
    return apiRequest(`/change-requests/${id}/comments`);
  },

  getHistory: async (id) => {
    return apiRequest(`/change-requests/${id}/history`);
  },
};

// Teams API
export const teamsAPI = {
  list: async () => {
    return apiRequest('/teams');
  },

  getMyTeams: async () => {
    return apiRequest('/teams/my-teams');
  },

  get: async (id) => {
    return apiRequest(`/teams/${id}`);
  },

  create: async (name) => {
    return apiRequest('/teams', {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
  },

  addMember: async (teamId, userId) => {
    return apiRequest(`/teams/${teamId}/members`, {
      method: 'POST',
      body: JSON.stringify({ user_id: userId }),
    });
  },

  removeMember: async (teamId, userId) => {
    return apiRequest(`/teams/${teamId}/members/${userId}`, {
      method: 'DELETE',
    });
  },
};

// Users API (for team management)
export const usersAPI = {
  list: async () => {
    return apiRequest('/users');
  },
};

export { getToken, setToken, removeToken };
