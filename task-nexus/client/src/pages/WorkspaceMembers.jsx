import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import {
  Users,
  Plus,
  Mail,
  Trash2,
  ArrowLeft,
  AlertCircle,
  CheckCircle,
  Search,
  X,
} from "lucide-react";

const API_BASE = import.meta.env.VITE_API_URL || "https://your-cloud-api.example.com";

export default function WorkspaceMembers() {
  const { workspaceId } = useParams();
  const navigate = useNavigate();
  const [workspace, setWorkspace] = useState(null);
  const [members, setMembers] = useState([]);
  const [filteredMembers, setFilteredMembers] = useState([]);
  const [memberSearchQuery, setMemberSearchQuery] = useState("");
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [email, setEmail] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    fetchData();
  }, [workspaceId]);

  useEffect(() => {
    // Filter members based on search query
    if (!memberSearchQuery.trim()) {
      setFilteredMembers(members);
    } else {
      const query = memberSearchQuery.toLowerCase();
      const filtered = members.filter(
        (member) =>
          member.email.toLowerCase().includes(query) ||
          member.username.toLowerCase().includes(query),
      );
      setFilteredMembers(filtered);
    }
  }, [memberSearchQuery, members]);

  const fetchData = async () => {
    const token = localStorage.getItem("nexus_token");
    const headers = { Authorization: `Bearer ${token}` };

    try {
      const [wsRes, membersRes] = await Promise.all([
        axios.get(`${API_BASE}/api/workspaces/${workspaceId}`, { headers }),
        axios.get(`${API_BASE}/api/workspaces/${workspaceId}/members`, { headers }),
      ]);
      setWorkspace(wsRes.data);
      setMembers(membersRes.data);
      setFilteredMembers(membersRes.data);
    } catch (err) {
      console.error(err);
      setError("Failed to load workspace data");
    } finally {
      setLoading(false);
    }
  };

  const handleSearchEmail = async (searchEmail) => {
    setEmail(searchEmail);
    setError("");
    setSearchResults([]);

    if (!searchEmail.trim() || searchEmail.length < 3) {
      return;
    }

    setSearching(true);
    const token = localStorage.getItem("nexus_token");

    try {
      const response = await axios.get(
        `${API_BASE}/api/users/search?email=${encodeURIComponent(searchEmail)}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );

      // Filter out users who are already members
      const memberEmails = members.map((m) => m.email);
      const filteredResults = response.data.filter(
        (user) => !memberEmails.includes(user.email),
      );

      setSearchResults(filteredResults);
    } catch (err) {
      console.error(err);
      // Don't show error for search, just show no results
    } finally {
      setSearching(false);
    }
  };

  const handleSelectUser = (selectedUser) => {
    setEmail(selectedUser.email);
    setSearchResults([]);
  };

  const handleInvite = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!email.trim()) {
      setError("Please enter an email address");
      return;
    }

    const token = localStorage.getItem("nexus_token");

    try {
      await axios.post(
        `${API_BASE}/api/workspaces/${workspaceId}/invite`,
        { email },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      setSuccess(`Successfully invited ${email}`);
      setEmail("");
      setSearchResults([]);
      setShowInviteForm(false);

      // Refresh members list
      setTimeout(() => {
        fetchData();
        setSuccess("");
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to invite user");
    }
  };

  const clearMemberSearch = () => {
    setMemberSearchQuery("");
  };

  if (loading) {
    return (
      <div className="page-loading">
        <div className="spinner"></div>
        <p>Loading members...</p>
      </div>
    );
  }

  return (
    <div className="page fade-in">
      <div className="page-header">
        <div>
          <button
            className="btn-ghost back-btn"
            onClick={() => navigate(`/dashboard/workspaces/${workspaceId}`)}
          >
            <ArrowLeft size={18} /> Back to Projects
          </button>
          <h2>{workspace?.name} - Members</h2>
          <p className="text-muted">Manage workspace team members</p>
        </div>
        <button
          className="btn-primary"
          onClick={() => setShowInviteForm(!showInviteForm)}
        >
          <Plus size={18} /> Invite Member
        </button>
      </div>

      {error && (
        <div
          className="auth-error"
          style={{ marginBottom: "1rem", position: "relative", zIndex: 1 }}
        >
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div
          className="auth-error"
          style={{
            marginBottom: "1rem",
            background: "hsla(142, 76%, 36%, 0.1)",
            borderColor: "hsla(142, 76%, 36%, 0.2)",
            color: "hsl(142, 76%, 36%)",
            position: "relative",
            zIndex: 1,
          }}
        >
          <CheckCircle size={16} />
          <span>{success}</span>
        </div>
      )}

      {showInviteForm && (
        <form
          onSubmit={handleInvite}
          className="create-form glass fade-in"
          style={{ position: "relative", zIndex: 100, marginBottom: "2rem" }}
        >
          <div className="form-group" style={{ position: "relative" }}>
            <label htmlFor="invite-email">
              <Search size={14} /> Search User by Email
            </label>
            <div className="input-with-icon">
              <Mail size={18} className="input-icon" />
              <input
                id="invite-email"
                type="email"
                value={email}
                onChange={(e) => handleSearchEmail(e.target.value)}
                placeholder="Search by email (e.g., colleague@example.com)"
                required
                autoComplete="off"
              />
            </div>

            {/* Search Results Dropdown */}
            {searchResults.length > 0 && (
              <div
                className="glass"
                style={{
                  position: "absolute",
                  top: "100%",
                  left: 0,
                  right: 0,
                  marginTop: "0.25rem",
                  maxHeight: "250px",
                  overflowY: "auto",
                  overflowX: "hidden",
                  zIndex: 1000,
                  border: "1px solid var(--glass-border)",
                  boxShadow: "0 8px 24px rgba(0, 0, 0, 0.2)",
                  background: "var(--glass)",
                  backdropFilter: "blur(16px)",
                }}
              >
                {searchResults.map((user) => (
                  <div
                    key={user.id}
                    onClick={() => handleSelectUser(user)}
                    style={{
                      padding: "0.75rem 1rem",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.75rem",
                      transition: "background 0.2s ease",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "var(--glass-hover)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "transparent";
                    }}
                  >
                    <div
                      className="user-avatar"
                      style={{ width: "32px", height: "32px", flexShrink: 0 }}
                    >
                      <Users size={16} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: "500", fontSize: "0.9rem" }}>
                        {user.username}
                      </div>
                      <div
                        style={{
                          fontSize: "0.75rem",
                          color: "hsl(var(--text-muted))",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {user.email}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* No Results Message */}
            {searching && (
              <div
                style={{
                  marginTop: "0.5rem",
                  fontSize: "0.85rem",
                  color: "hsl(var(--text-muted))",
                }}
              >
                Searching...
              </div>
            )}

            {!searching && email.length >= 3 && searchResults.length === 0 && (
              <div
                style={{
                  marginTop: "0.5rem",
                  fontSize: "0.85rem",
                  color: "hsl(var(--text-muted))",
                }}
              >
                No users found. You can still invite by entering their email
                directly.
              </div>
            )}
          </div>

          <div className="form-actions">
            <button type="submit" className="btn-primary">
              Send Invite
            </button>
            <button
              type="button"
              className="btn-ghost"
              onClick={() => {
                setShowInviteForm(false);
                setEmail("");
                setSearchResults([]);
                setError("");
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <div
        className="glass"
        style={{ padding: "1.5rem", position: "relative", zIndex: 1 }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "1.5rem",
          }}
        >
          <h3 style={{ fontSize: "1.1rem", margin: 0 }}>
            <Users
              size={20}
              style={{ verticalAlign: "middle", marginRight: "0.5rem" }}
            />
            Team Members ({filteredMembers.length}
            {memberSearchQuery && ` of ${members.length}`})
          </h3>

          {/* Member Search Input */}
          <div style={{ position: "relative", width: "300px" }}>
            <div className="input-with-icon">
              <Search size={16} className="input-icon" />
              <input
                type="text"
                value={memberSearchQuery}
                onChange={(e) => setMemberSearchQuery(e.target.value)}
                placeholder="Search members..."
                style={{
                  paddingLeft: "2.5rem",
                  paddingRight: memberSearchQuery ? "2.5rem" : "1rem",
                  fontSize: "0.9rem",
                }}
              />
              {memberSearchQuery && (
                <button
                  onClick={clearMemberSearch}
                  style={{
                    position: "absolute",
                    right: "0.75rem",
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    padding: "0.25rem",
                    display: "flex",
                    alignItems: "center",
                    color: "hsl(var(--text-muted))",
                    transition: "color 0.2s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = "hsl(var(--text))";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = "hsl(var(--text-muted))";
                  }}
                >
                  <X size={16} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Members List */}
        {filteredMembers.length > 0 ? (
          <div
            style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}
          >
            {filteredMembers.map((member) => (
              <div
                key={member.id}
                className="glass"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "1rem",
                  transition: "all 0.2s ease",
                }}
              >
                <div
                  style={{ display: "flex", alignItems: "center", gap: "1rem" }}
                >
                  <div
                    className="user-avatar"
                    style={{ width: "40px", height: "40px" }}
                  >
                    <Users size={18} />
                  </div>
                  <div>
                    <div style={{ fontWeight: "600", marginBottom: "0.2rem" }}>
                      {member.username}
                    </div>
                    <div
                      style={{
                        fontSize: "0.85rem",
                        color: "hsl(var(--text-muted))",
                      }}
                    >
                      {member.email}
                    </div>
                  </div>
                </div>

                <div
                  style={{ display: "flex", alignItems: "center", gap: "1rem" }}
                >
                  <span
                    className="badge"
                    style={{
                      textTransform: "capitalize",
                      backgroundColor:
                        member.role === "owner"
                          ? "hsla(var(--primary), 0.1)"
                          : member.role === "admin"
                            ? "hsla(var(--purple), 0.1)"
                            : "var(--glass-hover)",
                    }}
                  >
                    {member.role}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div
            style={{
              textAlign: "center",
              padding: "3rem 1rem",
              color: "hsl(var(--text-muted))",
            }}
          >
            <Search size={48} style={{ opacity: 0.3, marginBottom: "1rem" }} />
            <p>No members found matching "{memberSearchQuery}"</p>
            <button
              onClick={clearMemberSearch}
              className="btn-ghost"
              style={{ marginTop: "1rem" }}
            >
              Clear Search
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
