"use client";

import { useState, useEffect } from "react";
import { 
  Users, 
  Plus, 
  Search, 
  Shield,
  Edit,
  Trash2,
  Loader2,
  X
} from "lucide-react";
import { createPortal } from 'react-dom';
import { createClient } from "@/lib/supabase/client";
import { getCurrentTenant } from "@/lib/tenant";
import { useLanguage } from "@/lib/context/LanguageContext";
import { formatDate } from "@/lib/utils/format";

interface TeamMember {
  id: string;
  name: string;
  username: string;
  phone?: string;
  role: 'ADMIN' | 'WORKER';
  created_at: string;
  last_login?: string;
}

export default function TeamSettings() {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { t } = useLanguage();
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);
  const [deletingMember, setDeletingMember] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [newMember, setNewMember] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'WORKER' as 'ADMIN' | 'WORKER'
  });
  const [addingMember, setAddingMember] = useState(false);

  useEffect(() => {
    fetchTeamMembers();
  }, []);

  async function fetchTeamMembers() {
    try {
      const supabase = createClient();
      const currentTenant = await getCurrentTenant(supabase);
      
      if (!currentTenant) {
        setLoading(false);
        return;
      }

      // Test if team_invitations table exists
      console.log('Testing team_invitations table existence...');
      const { error: tableError } = await supabase
        .from('team_invitations')
        .select('id')
        .limit(1);
      
      if (tableError) {
        console.error('team_invitations table does not exist:', tableError);
        console.log('Please run the SQL from database-setup.sql in Supabase dashboard');
      }

      // Test if profiles table exists
      console.log('Testing profiles table existence...');
      const { error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .limit(1);
      
      if (profileError) {
        console.error('profiles table does not exist:', profileError);
        console.log('Please run the SQL from database-setup.sql in Supabase dashboard');
      }

      // Fetch actual team members from database
      const { data: dbMembers, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('tenant_id', currentTenant.id)
        .neq('id', (await supabase.auth.getUser()).data.user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch pending invitations from database
      const { data: invitationData, error: inviteError } = await supabase
        .from('team_invitations')
        .select('*')
        .eq('tenant_id', currentTenant.id)
        .eq('status', 'PENDING');

      if (inviteError) {
        console.error('Error fetching invitations:', inviteError);
      }

      // Convert database invitations to TeamMember format
      const pendingMembers = (invitationData || []).map((inv: { id: string; name: string; email: string; phone?: string; role: 'ADMIN' | 'WORKER'; created_at: string }) => ({
        id: inv.id,
        name: inv.name,
        username: `PENDING_${inv.email.split('@')[0]}`,
        phone: inv.phone,
        role: inv.role,
        created_at: inv.created_at,
        last_login: undefined
      }));

      // Combine database members and pending invitations
      const allMembers = [...(dbMembers || []), ...pendingMembers];
      setTeamMembers(allMembers);
      console.log('Fetched team members:', allMembers.length, 'Active:', (dbMembers || []).length, 'Pending:', pendingMembers.length);
    } catch (error) {
      console.error("Error fetching team members:", error);
    } finally {
      setLoading(false);
    }
  }

  const handleAddMember = async () => {
    if (!newMember.name || !newMember.email) {
      alert('Please fill in name and email');
      return;
    }

    setAddingMember(true);
    try {
      const supabase = createClient();
      const currentTenant = await getCurrentTenant(supabase);
      
      if (!currentTenant) {
        alert('No tenant found');
        return;
      }

      // Create a pending team member record in the proper table
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        alert('User not authenticated');
        return;
      }

      if (editingMember) {
        // Update existing member
        const { error: updateError } = await supabase
          .from('team_invitations')
          .update({
            name: newMember.name,
            phone: newMember.phone || null,
            role: newMember.role,
          })
          .eq('id', editingMember.id);
        
        if (updateError) {
          console.error('Member update error:', updateError);
          alert('Failed to update team member: ' + updateError.message);
          return;
        }
        
        alert('Team member updated successfully');
      } else {
        // Create new member
        const { error: memberError } = await supabase
          .from('team_invitations')
          .insert({
            email: newMember.email,
            name: newMember.name,
            phone: newMember.phone || null,
            role: newMember.role,
            tenant_id: currentTenant.id,
            invited_by: user.id,
            expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
            status: 'PENDING'
          });
        
        if (memberError) {
          console.error('Member creation error:', memberError);
          alert('Failed to create team invitation: ' + memberError.message);
          return;
        }
        
        alert(`Team member invitation created for ${newMember.email}!\n\nNext steps:\n1. Send them this link to register: ${window.location.origin}/register?email=${encodeURIComponent(newMember.email)}\n2. Ask them to set their password at that link.\n3. They will be added to your team automatically after signup.`);
      }

      // Reset form and refresh team members
      setNewMember({ name: '', email: '', phone: '', role: 'WORKER' });
      setShowAddModal(false);
      setEditingMember(null);
      fetchTeamMembers();
      
    } catch (error) {
      console.error("Error adding team member:", error);
      alert('Failed to create team invitation');
    } finally {
      setAddingMember(false);
    }
  };

  const filteredMembers = teamMembers.filter(member =>
    member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Helper function to get status from username
  const getMemberStatus = (username: string) => {
    if (username.startsWith('PENDING_')) return 'PENDING';
    return 'ACTIVE';
  };

  // Helper function to get clean username
  // Helper functions
  const getCleanUsername = (username: string) => {
    if (username.startsWith('PENDING_')) return username.replace('PENDING_', '');
    return username;
  };

  const handleEditMember = (member: TeamMember) => {
    setEditingMember(member);
    setShowAddModal(true);
    setNewMember({
      name: member.name,
      email: member.username.replace('PENDING_', '') + '@example.com', // Extract email from username
      phone: member.phone || '',
      role: member.role
    });
  };

  const handleDeleteMember = async (memberId: string) => {
    if (!confirm('Are you sure you want to remove this team member?')) return;
    
    console.log('Attempting to delete member with ID:', memberId);
    
    setDeletingMember(memberId);
    try {
      const supabase = createClient();
      
      // First, try deleting from team_invitations (for pending invitations)
      const { error: inviteError } = await supabase
        .from('team_invitations')
        .delete()
        .eq('id', memberId);
      
      if (inviteError) {
        console.log('Not found in team_invitations, trying profiles table...');
        // If not found in invitations, try profiles table (for actual members)
        const { error: profileError } = await supabase
          .from('profiles')
          .delete()
          .eq('id', memberId);
        
        if (profileError) {
          console.error('Error deleting profile:', profileError);
          alert('Failed to remove team member: ' + profileError.message);
          return;
        }
        console.log('Successfully deleted from profiles');
      } else {
        console.log('Successfully deleted from team_invitations');
      }
      
      alert('Team member removed successfully');
      fetchTeamMembers();
    } catch (error) {
      console.error('Error deleting team member:', error);
      alert('Failed to remove team member: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setDeletingMember(null);
    }
  };

  const activeMembers = teamMembers.filter(m => !m.username.startsWith('PENDING_')).length;
  const pendingMembers = teamMembers.filter(m => m.username.startsWith('PENDING_')).length;
  const adminCount = teamMembers.filter(m => m.role === 'ADMIN').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-normal text-gray-900">Team Management</h3>
          <p className="text-gray-600">Manage your team members and their permissions</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          Add Member
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 p-3 rounded-lg">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Members</p>
              <p className="text-2xl font-normal text-gray-900">{teamMembers.length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="bg-green-100 p-3 rounded-lg">
              <Shield className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Active Members</p>
              <p className="text-2xl font-normal text-gray-900">{activeMembers}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="bg-yellow-100 p-3 rounded-lg">
              <Users className="w-6 h-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Pending Invites</p>
              <p className="text-2xl font-normal text-gray-900">{pendingMembers}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="bg-purple-100 p-3 rounded-lg">
              <Users className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Admins</p>
              <p className="text-2xl font-normal text-gray-900">{adminCount}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="relative">
          <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search team members..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Team Members Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-normal text-gray-500 uppercase tracking-wider">
                  Member
                </th>
                <th className="px-6 py-3 text-left text-xs font-normal text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-normal text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-normal text-gray-500 uppercase tracking-wider">
                  Joined
                </th>
                <th className="px-6 py-3 text-right text-xs font-normal text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredMembers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p>No team members found</p>
                    <p className="text-sm">Add your first team member to get started</p>
                  </td>
                </tr>
              ) : (
                filteredMembers.map((member) => (
                  <tr key={member.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-normal text-gray-900">{member.name}</div>
                        <div className="text-sm text-gray-500">@{getCleanUsername(member.username)}</div>
                        {member.phone && (
                          <div className="text-sm text-gray-500">{member.phone}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-normal ${
                        member.role === 'ADMIN' 
                          ? 'bg-purple-100 text-purple-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        <Shield className="w-3 h-3 mr-1" />
                        {member.role}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-normal ${
                        getMemberStatus(member.username) === 'ACTIVE' 
                          ? 'bg-green-100 text-green-800' 
                          : getMemberStatus(member.username) === 'PENDING'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {getMemberStatus(member.username)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {formatDate(member.created_at)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => handleEditMember(member)}
                          className="text-gray-400 hover:text-gray-600"
                          disabled={deletingMember === member.id}
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDeleteMember(member.id)}
                          className="text-red-400 hover:text-red-600"
                          disabled={deletingMember === member.id}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Member Modal */}
      {showAddModal && mounted && createPortal(
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div 
            className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white">
              <h2 className="text-xl font-normal text-gray-900">
                {editingMember ? 'Edit Team Member' : 'Add Team Member'}
              </h2>
              <button 
                onClick={() => {
                  setShowAddModal(false);
                  setNewMember({ name: '', email: '', phone: '', role: 'WORKER' });
                  setEditingMember(null);
                }}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-4 overflow-y-auto">
              <div>
                <label className="block text-[10px] font-normal text-gray-500 uppercase tracking-widest mb-1.5">Full Name</label>
                <input
                  type="text"
                  value={newMember.name}
                  onChange={(e) => setNewMember({ ...newMember, name: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  placeholder="Enter member name"
                />
              </div>
              <div>
                <label className="block text-[10px] font-normal text-gray-500 uppercase tracking-widest mb-1.5">Email Address</label>
                <input
                  type="email"
                  value={newMember.email}
                  disabled={!!editingMember}
                  onChange={(e) => setNewMember({ ...newMember, email: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all disabled:bg-gray-50 disabled:text-gray-400"
                  placeholder="Enter email address"
                />
              </div>
              <div>
                <label className="block text-[10px] font-normal text-gray-500 uppercase tracking-widest mb-1.5">Phone Number (Optional)</label>
                <input
                  type="tel"
                  value={newMember.phone}
                  onChange={(e) => setNewMember({ ...newMember, phone: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  placeholder="Enter phone number"
                />
              </div>
              <div>
                <label className="block text-[10px] font-normal text-gray-500 uppercase tracking-widest mb-1.5">Access Role</label>
                <div className="grid grid-cols-2 gap-3 mt-1">
                  <button
                    type="button"
                    onClick={() => setNewMember({ ...newMember, role: 'WORKER' })}
                    className={`px-4 py-3 rounded-xl border text-sm font-normal transition-all flex items-center justify-center gap-2 ${
                      newMember.role === 'WORKER'
                        ? 'border-primary bg-primary/5 text-primary'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    Worker
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewMember({ ...newMember, role: 'ADMIN' })}
                    className={`px-4 py-3 rounded-xl border text-sm font-normal transition-all flex items-center justify-center gap-2 ${
                      newMember.role === 'ADMIN'
                        ? 'border-primary bg-primary/5 text-primary'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    <Shield className="w-4 h-4" />
                    Admin
                  </button>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-gray-50 bg-gray-50/50 flex gap-3 sticky bottom-0">
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setNewMember({ name: '', email: '', phone: '', role: 'WORKER' });
                  setEditingMember(null);
                }}
                className="flex-1 px-4 py-3 border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-100 transition-colors font-normal text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleAddMember}
                disabled={addingMember}
                className="flex-1 px-4 py-3 bg-primary text-white rounded-xl hover:bg-primary/90 disabled:opacity-50 transition-all font-normal text-sm shadow-lg shadow-primary/20"
              >
                {addingMember ? (
                  <div className="flex items-center justify-center">
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    {editingMember ? 'Updating...' : 'Adding...'}
                  </div>
                ) : (
                  editingMember ? 'Update Member' : 'Add Member'
                )}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
