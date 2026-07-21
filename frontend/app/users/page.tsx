'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useRequireAuth } from '@/lib/hooks';
import { useAuthStore } from '@/lib/store';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { StatusBadge, Spinner, Modal } from '@/components/ui';
import DashboardLayout from '@/components/DashboardLayout';
import toast from 'react-hot-toast';
import { Users, UserPlus, Shield, Mail, Phone, Calendar, Trash2, Edit2, Check, X } from 'lucide-react';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  phone?: string;
  isActive: boolean;
  lastLoginAt?: string;
  createdAt: string;
}

export default function UsersPage() {
  const router = useRouter();
  const { isReady, isAuthenticated } = useRequireAuth();
  const { tenant } = useAuthStore();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteRole, setInviteRole] = useState('user');
  const [invitePhone, setInvitePhone] = useState('');
  const [inviting, setInviting] = useState(false);
  const [editingRole, setEditingRole] = useState<string | null>(null);
  const [newRole, setNewRole] = useState('');

  useEffect(() => {
    if (!isReady || !isAuthenticated) return;
    fetchUsers();
  }, [isReady, isAuthenticated]);

  const fetchUsers = async () => {
    try {
      const response = await api.get('/users');
      setUsers(response.data);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async () => {
    if (!inviteEmail || !inviteName) {
      toast.error('Email and name are required');
      return;
    }

    setInviting(true);
    try {
      const response = await api.post('/users', {
        email: inviteEmail,
        name: inviteName,
        role: inviteRole,
        phone: invitePhone || undefined,
      });

      toast.success(response.data.message);
      setShowInviteModal(false);
      setInviteEmail('');
      setInviteName('');
      setInviteRole('user');
      setInvitePhone('');
      fetchUsers();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to invite user');
    } finally {
      setInviting(false);
    }
  };

  const handleRoleChange = async (userId: string) => {
    if (!newRole) return;

    try {
      await api.put(`/users/${userId}/role`, { role: newRole });
      toast.success('Role updated');
      setEditingRole(null);
      fetchUsers();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to update role');
    }
  };

  const handleDeactivate = async (userId: string) => {
    if (!confirm('Deactivate this user?')) return;

    try {
      await api.delete(`/users/${userId}`);
      toast.success('User deactivated');
      fetchUsers();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to deactivate user');
    }
  };

  const handleActivate = async (userId: string) => {
    try {
      await api.post(`/users/${userId}/activate`);
      toast.success('User activated');
      fetchUsers();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to activate user');
    }
  };

  const getRoleBadge = (role: string) => {
    const colors: Record<string, string> = {
      owner: 'bg-purple-100 text-purple-700',
      admin: 'bg-blue-100 text-blue-700',
      user: 'bg-gray-100 text-gray-700',
    };
    return colors[role] || colors.user;
  };

  if (loading) {
    return (
      <DashboardLayout title="Team Members">
        <Spinner size="lg" className="py-20" />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="Team Members"
      subtitle="Manage your team and their access"
      actions={
        <button
          onClick={() => setShowInviteModal(true)}
          className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
        >
          <UserPlus className="h-4 w-4 mr-2" />
          Invite Member
        </button>
      }
    >
      {/* Users list */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="divide-y divide-gray-100">
          {users.map((user) => (
            <div key={user.id} className="px-6 py-4 flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <span className="text-sm font-semibold text-green-600">
                    {user.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <p className="font-medium text-gray-900">{user.name}</p>
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getRoleBadge(user.role)}`}>
                      {user.role}
                    </span>
                    {!user.isActive && (
                      <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-700">
                        Inactive
                      </span>
                    )}
                  </div>
                  <div className="flex items-center space-x-4 text-sm text-gray-500 mt-1">
                    <span className="flex items-center">
                      <Mail className="h-3 w-3 mr-1" />
                      {user.email}
                    </span>
                    {user.phone && (
                      <span className="flex items-center">
                        <Phone className="h-3 w-3 mr-1" />
                        {user.phone}
                      </span>
                    )}
                    <span className="flex items-center">
                      <Calendar className="h-3 w-3 mr-1" />
                      Joined {formatDate(user.createdAt)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                {editingRole === user.id ? (
                  <>
                    <select
                      value={newRole}
                      onChange={(e) => setNewRole(e.target.value)}
                      className="px-2 py-1 border border-gray-300 rounded text-sm"
                    >
                      <option value="user">User</option>
                      <option value="admin">Admin</option>
                      <option value="owner">Owner</option>
                    </select>
                    <button
                      onClick={() => handleRoleChange(user.id)}
                      className="p-1 text-green-600 hover:text-green-700"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setEditingRole(null)}
                      className="p-1 text-gray-400 hover:text-gray-500"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </>
                ) : (
                  <>
                    {user.role !== 'owner' && (
                      <button
                        onClick={() => {
                          setEditingRole(user.id);
                          setNewRole(user.role);
                        }}
                        className="p-1 text-gray-400 hover:text-gray-600"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                    )}
                    {user.isActive ? (
                      <button
                        onClick={() => handleDeactivate(user.id)}
                        className="p-1 text-gray-400 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    ) : (
                      <button
                        onClick={() => handleActivate(user.id)}
                        className="px-2 py-1 text-xs text-green-600 border border-green-300 rounded hover:bg-green-50"
                      >
                        Activate
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Invite Modal */}
      <Modal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        title="Invite Team Member"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
            <input
              type="text"
              value={inviteName}
              onChange={(e) => setInviteName(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm"
              placeholder="John Doe"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm"
              placeholder="john@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone (optional)</label>
            <input
              type="tel"
              value={invitePhone}
              onChange={(e) => setInvitePhone(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm"
              placeholder="+27 82 123 4567"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm"
            >
              <option value="user">User - Can view and create</option>
              <option value="admin">Admin - Can manage customers and invoices</option>
              <option value="owner">Owner - Full access</option>
            </select>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-700">
            A temporary password will be generated. Share it securely with the new member.
          </div>

          <div className="flex justify-end space-x-3 pt-2">
            <button
              onClick={() => setShowInviteModal(false)}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleInvite}
              disabled={inviting}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              {inviting ? 'Inviting...' : 'Send Invite'}
            </button>
          </div>
        </div>
      </Modal>
    </DashboardLayout>
  );
}
