"use client";

import { useState, useEffect } from "react";
import { 
  User, 
  Mail, 
  Phone, 
  Shield,
  Edit,
  Loader2,
  Calendar,
  Building
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useLanguage } from "@/lib/context/LanguageContext";
import { formatDate } from "@/lib/utils/format";

interface UserProfile {
  id: string;
  name: string;
  username: string;
  email: string;
  phone?: string;
  role: 'ADMIN' | 'WORKER';
  tenant_id?: string;
  created_at: string;
  last_sign_in_at?: string;
}

interface Tenant {
  id: string;
  name: string;
  email: string;
  subscription_tier: string;
  plan?: string;
  subscription_status: string;
}

export default function ProfileSettings() {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { t } = useLanguage();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: ''
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  async function fetchProfile() {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setLoading(false);
        return;
      }

      // Get user profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileError) throw profileError;
      setProfile(profileData);

      // Get tenant info if user has tenant
      if (profileData.tenant_id) {
        const { data: tenantData, error: tenantError } = await supabase
          .from('tenants')
          .select('*')
          .eq('id', profileData.tenant_id)
          .single();

        if (!tenantError) {
          setTenant(tenantData);
        }
      }

      setFormData({
        name: profileData.name || '',
        phone: profileData.phone || ''
      });

    } catch (error) {
      console.error("Error fetching profile:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return;

      const { error } = await supabase
        .from('profiles')
        .update({
          name: formData.name,
          phone: formData.phone
        })
        .eq('id', user.id);

      if (error) throw error;

      setProfile(prev => prev ? { ...prev, ...formData } : null);
      setEditing(false);
    } catch (error) {
      console.error("Error updating profile:", error);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center py-12">
        <User className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500">Profile not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="border-b border-gray-100 pb-6">
        <h3 className="text-xl font-semibold text-gray-900 tracking-tighter">My Profile</h3>
        <p className="text-xs text-gray-400 uppercase tracking-widest">Manage your personal information and account settings</p>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-10">
          <div className="flex items-center gap-5">
            <div className="bg-blue-500/5 p-5 rounded-full border border-blue-500/10">
              <User className="w-10 h-10 text-blue-500" />
            </div>
            <div>
              <h4 className="text-2xl font-semibold text-gray-900 tracking-tight">{profile.name}</h4>
              <p className="text-sm font-medium text-gray-400">@{profile.username}</p>
            </div>
          </div>
          {!editing && (
            <button
              onClick={() => setEditing(true)}
              className="flex items-center gap-2 bg-blue-500 text-white px-6 py-2.5 rounded-xl font-semibold uppercase tracking-widest text-[10px] shadow-lg shadow-blue-500/20 hover:scale-[1.02] active:scale-95 transition-all"
            >
              <Edit className="w-4 h-4" />
              Edit Profile
            </button>
          )}
        </div>

        <div className="space-y-10">
          {/* Personal Information */}
          <div className="space-y-6">
            <h5 className="text-xs text-gray-400 uppercase tracking-widest font-semibold">Personal Information</h5>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-1.5">
                <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Full Name</label>
                {editing ? (
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-medium"
                  />
                ) : (
                  <div className="flex items-center gap-3 text-gray-900 font-semibold">
                    <User className="w-4 h-4 text-blue-500/40" />
                    {profile.name}
                  </div>
                )}
              </div>
              
              <div className="space-y-1.5">
                <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Username</label>
                <div className="flex items-center gap-3 text-gray-900 font-semibold">
                  <User className="w-4 h-4 text-blue-500/40" />
                  @{profile.username}
                </div>
              </div>
              
              <div className="space-y-1.5">
                <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Email Address</label>
                <div className="flex items-center gap-3 text-gray-900 font-semibold">
                  <Mail className="w-4 h-4 text-blue-500/40" />
                  {profile.email}
                </div>
              </div>
              
              <div className="space-y-1.5">
                <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Phone Number</label>
                {editing ? (
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-medium"
                    placeholder="Add phone number"
                  />
                ) : (
                  <div className="flex items-center gap-3 text-gray-900 font-semibold">
                    <Phone className="w-4 h-4 text-blue-500/40" />
                    {profile.phone || 'Not added'}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Account Information */}
          <div className="space-y-6">
            <h5 className="text-xs text-gray-400 uppercase tracking-widest font-semibold">Account Information</h5>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-1.5">
                <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Role</label>
                <div className="flex items-center gap-3">
                  <Shield className="w-4 h-4 text-blue-500/40" />
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${
                    profile.role === 'ADMIN' 
                      ? 'bg-purple-50 text-purple-600 border border-purple-100' 
                      : 'bg-gray-50 text-gray-600 border border-gray-100'
                  }`}>
                    {profile.role}
                  </span>
                </div>
              </div>
              
              <div className="space-y-1.5">
                <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Member Since</label>
                <div className="flex items-center gap-3 text-gray-900 font-semibold">
                  <Calendar className="w-4 h-4 text-blue-500/40" />
                  {formatDate(profile.created_at)}
                </div>
              </div>
              
              <div className="space-y-1.5">
                <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Last Login</label>
                <div className="flex items-center gap-3 text-gray-900 font-semibold">
                  <Calendar className="w-4 h-4 text-blue-500/40" />
                  {profile.last_sign_in_at 
                    ? formatDate(profile.last_sign_in_at)
                    : 'Never'
                  }
                </div>
              </div>
            </div>
          </div>
        </div>

        {editing && (
          <div className="flex gap-4 mt-10 pt-10 border-t border-gray-100">
            <button
              onClick={() => {
                setEditing(false);
                setFormData({ name: profile.name, phone: profile.phone || '' });
              }}
              className="flex-1 px-6 py-3 bg-gray-50 text-gray-900 rounded-xl font-semibold uppercase tracking-widest text-[10px] hover:bg-gray-100 transition-all active:scale-95"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 px-6 py-3 bg-blue-500 text-white rounded-xl font-semibold uppercase tracking-widest text-[10px] shadow-lg shadow-blue-500/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Save Changes'}
            </button>
          </div>
        )}
      </div>

      {/* Organization Info */}
      {tenant && (
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-2 bg-blue-500/5 rounded-lg border border-blue-500/10">
              <Building className="w-5 h-5 text-blue-500" />
            </div>
            <h4 className="text-lg font-semibold text-gray-900 tracking-tight uppercase tracking-widest">Organization</h4>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="space-y-1">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Company Name</p>
              <p className="text-sm font-semibold text-gray-900">{tenant.name}</p>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Business Email</p>
              <p className="text-sm font-semibold text-gray-900">{tenant.email}</p>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Subscription</p>
              <div>
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${
                  (tenant.subscription_tier || tenant.plan || 'FREE').toString().toUpperCase().trim() === 'PRO' 
                    ? 'bg-purple-50 text-purple-600 border border-purple-100' 
                    : 'bg-gray-50 text-gray-600 border border-gray-100'
                }`}>
                  {tenant.subscription_tier || tenant.plan || 'FREE'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
