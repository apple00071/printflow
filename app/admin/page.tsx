"use client";

import { useState, useEffect } from "react";
import { Building2, TrendingUp, CreditCard, BarChart3, LogOut, Plus, UserCheck, Zap, Power, Trash2, MoreHorizontal, Search, Copy, Check } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface Tenant {
  id: string;
  name: string;
  slug: string;
  email: string;
  business_type: string;
  city: string;
  state: string;
  phone: string;
  subscription_tier: string;
  subscription_status: string;
  created_at: string;
  // Mapped fields for frontend compatibility
  plan?: string;
  plan_status?: string;
  orders_this_month?: number;
  onboarding_complete?: boolean;
  profiles?: {
    id: string;
    username: string;
    name: string;
  };
}

export default function AdminDashboard() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createFormData, setCreateFormData] = useState({
    name: '',
    email: '',
    plan: 'FREE',
    business_type: 'Printing Press',
    city: '',
    state: '',
    phone: ''
  });
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'tenants' | 'subscriptions'>('overview');
  const [searchTerm, setSearchTerm] = useState("");
  const [showActionsModal, setShowActionsModal] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [lastCreatedTenant, setLastCreatedTenant] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  useEffect(() => {
    fetchTenants();
  }, []);

  async function fetchTenants() {
    try {
      const response = await fetch('/api/admin/tenants');
      if (response.ok) {
        const data = await response.json();
        setTenants(data);
      }
    } catch (error) {
      console.error('Error fetching tenants:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateTenant() {
    setIsCreating(true);
    setCreateError('');
    
    try {
      const response = await fetch('/api/admin/tenants', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(createFormData),
      });

      const data = await response.json();

      if (response.ok) {
        // Success - set data and show modal
        setLastCreatedTenant({
          name: data.tenant.name,
          email: createFormData.email,
          password: data.tenant.tempPassword,
          url: `https://${data.tenant.slug}.printflow.shop`
        });
        
        setShowCreateModal(false);
        setShowSuccessModal(true);
        
        setCreateFormData({
          name: '',
          email: '',
          plan: 'FREE',
          business_type: 'Printing Press',
          city: '',
          state: '',
          phone: ''
        });
        await fetchTenants(); // Refresh the list
      } else {
        setCreateError(data.error || 'Failed to create tenant');
      }
    } catch {
      setCreateError('Network error. Please try again.');
    } finally {
      setIsCreating(false);
    }
  }

  const handleUpdatePlan = async (tenantId: string, targetPlan: string) => {
    try {
      setLoading(true);
      
      const response = await fetch(`/api/admin/tenants/${tenantId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: targetPlan }),
      });

      if (response.ok) {
        await fetchTenants();
      } else {
        alert('Failed to update plan');
        setLoading(false);
      }
    } catch (error) {
      console.error('Error updating plan:', error);
      alert('Error updating plan');
      setLoading(false);
    }
  };

  const handleToggleStatus = async (tenantId: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
      setLoading(true);
      
      const response = await fetch(`/api/admin/tenants/${tenantId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan_status: newStatus }),
      });

      if (response.ok) {
        await fetchTenants();
      } else {
        alert('Failed to update status');
        setLoading(false);
      }
    } catch (error) {
      console.error('Error toggling status:', error);
      alert('Error updating status');
      setLoading(false);
    }
  };

  const handleDeleteTenant = async (tenantId: string, tenantName: string) => {
    if (!confirm(`Are you sure you want to delete ${tenantName}? This action cannot be undone and will delete all associated data.`)) return;
    
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/tenants/${tenantId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setShowActionsModal(false);
        await fetchTenants();
      } else {
        alert('Failed to delete tenant');
        setLoading(false);
      }
    } catch (error) {
      console.error('Error deleting tenant:', error);
      alert('Error deleting tenant');
      setLoading(false);
    }
  };

  const filteredTenants = tenants.filter(tenant => {
    const matchesSearch = tenant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         tenant.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (tenant.profiles?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (tenant.profiles?.username || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesSearch;
  });

  const stats = {
    totalTenants: tenants.length,
    activeTenants: tenants.filter(t => (t.plan_status || t.subscription_status || '').toUpperCase() === 'ACTIVE').length,
    totalOrders: tenants.reduce((sum, t) => sum + (t.orders_this_month || 0), 0),
    proPlans: tenants.filter(t => (t.plan || t.subscription_tier || '').toUpperCase() === 'PRO').length,
    businessPlans: tenants.filter(t => (t.plan || t.subscription_tier || '').toUpperCase() === 'BUSINESS').length,
    freePlans: tenants.filter(t => (t.plan || t.subscription_tier || '').toUpperCase() === 'FREE').length,
    monthlyRevenue: 
      (tenants.filter(t => (t.plan || t.subscription_tier || '').toUpperCase() === 'PRO').length * 499) + 
      (tenants.filter(t => (t.plan || t.subscription_tier || '').toUpperCase() === 'BUSINESS').length * 999),
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-center py-4 sm:py-6 space-y-4 sm:space-y-0 text-center sm:text-left">
            <div>
              <h1 className="text-xl sm:text-2xl font-normal text-gray-900 tracking-tight">PrintFlow Admin</h1>
              <p className="text-[10px] sm:text-sm text-gray-500 font-normal">SaaS Platform Management</p>
            </div>
            <div className="w-full sm:w-auto flex items-center justify-between sm:justify-end gap-2 sm:gap-4">
              <div className="flex items-center gap-1 sm:gap-3">
                <Link 
                  href="/admin/analytics"
                  className="flex items-center justify-center p-2 sm:px-3 sm:py-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all font-normal text-xs sm:text-sm border border-transparent hover:border-blue-100"
                  title="Analytics"
                >
                  <BarChart3 className="w-4 h-4 sm:mr-1.5" />
                  <span className="hidden sm:inline">Analytics</span>
                </Link>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="bg-blue-600 text-white px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl hover:bg-blue-700 transition-all flex items-center text-xs sm:text-sm font-normal active:scale-95"
                >
                  <Plus className="w-4 h-4 mr-1 sm:mr-2" />
                  New Tenant
                </button>
                <button
                  onClick={handleSignOut}
                  className="text-gray-500 hover:text-red-600 bg-gray-50 hover:bg-red-50 p-2 sm:p-2.5 rounded-xl transition-all border border-gray-100 hover:border-red-100 active:scale-95"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="bg-white border-b sticky top-0 z-10 overflow-x-auto no-scrollbar">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-6 sm:space-x-12 min-w-max">
            {['overview', 'tenants', 'subscriptions'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as 'overview' | 'tenants' | 'subscriptions')}
                className={`py-4 px-1 border-b-[3px] font-normal text-xs sm:text-sm uppercase tracking-widest transition-all whitespace-nowrap ${
                  activeTab === tab
                    ? 'border-blue-600 text-blue-600 shadow-[0_2px_0_0_rgba(37,99,235,0.1)]'
                    : 'border-transparent text-gray-400 hover:text-gray-600 hover:border-gray-200'
                }`}
              >
                {tab === 'tenants' ? `Tenants (${tenants.length})` : tab}
              </button>
            ))}
          </nav>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div>
            {/* Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-8">
              <div className="bg-white p-3 sm:p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow group">
                <div className="flex items-center justify-between sm:justify-start">
                  <div className="bg-blue-50 p-2 sm:p-3 rounded-xl border border-blue-100 group-hover:bg-blue-100 transition-colors">
                    <Building2 className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
                  </div>
                  <div className="sm:ml-4 text-right sm:text-left">
                    <p className="text-[10px] sm:text-sm font-normal text-gray-400 uppercase tracking-widest">Total Tenants</p>
                    <p className="text-lg sm:text-2xl font-normal text-gray-900 leading-tight">{stats.totalTenants}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-3 sm:p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow group">
                <div className="flex items-center justify-between sm:justify-start">
                  <div className="bg-green-50 p-2 sm:p-3 rounded-xl border border-green-100 group-hover:bg-green-100 transition-colors">
                    <UserCheck className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
                  </div>
                  <div className="sm:ml-4 text-right sm:text-left">
                    <p className="text-[10px] sm:text-sm font-normal text-gray-400 uppercase tracking-widest">Active</p>
                    <p className="text-lg sm:text-2xl font-normal text-gray-900 leading-tight">{stats.activeTenants}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-3 sm:p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow group">
                <div className="flex items-center justify-between sm:justify-start">
                  <div className="bg-purple-50 p-2 sm:p-3 rounded-xl border border-purple-100 group-hover:bg-purple-100 transition-colors">
                    <CreditCard className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" />
                  </div>
                  <div className="sm:ml-4 text-right sm:text-left">
                    <p className="text-[10px] sm:text-sm font-normal text-gray-400 uppercase tracking-widest">Revenue</p>
                    <p className="text-lg sm:text-2xl font-normal text-gray-900 leading-tight">₹{stats.monthlyRevenue.toLocaleString()}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-3 sm:p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow group">
                <div className="flex items-center justify-between sm:justify-start">
                  <div className="bg-orange-50 p-2 sm:p-3 rounded-xl border border-orange-100 group-hover:bg-orange-100 transition-colors">
                    <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-orange-600" />
                  </div>
                  <div className="sm:ml-4 text-right sm:text-left">
                    <p className="text-[10px] sm:text-sm font-normal text-gray-400 uppercase tracking-widest">Orders</p>
                    <p className="text-lg sm:text-2xl font-normal text-gray-900 leading-tight">{stats.totalOrders}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-50 bg-gray-50/30">
                <h3 className="text-sm font-normal text-gray-900 uppercase tracking-tight">System Quick Actions</h3>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <Link 
                    href="/admin/analytics"
                    className="p-6 border border-gray-100 rounded-2xl hover:border-blue-200 hover:bg-blue-50/30 transition-all group active:scale-95 shadow-sm"
                  >
                    <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center mb-4 group-hover:bg-blue-100 transition-colors">
                      <BarChart3 className="w-6 h-6 text-blue-600" />
                    </div>
                    <p className="text-sm font-normal text-gray-900 mb-1">View Analytics</p>
                    <p className="text-[11px] text-gray-400 font-normal leading-relaxed">Access detailed platform metrics and business intelligence reports.</p>
                  </Link>
                  
                  <button 
                    onClick={() => setActiveTab('tenants')}
                    className="p-6 border border-gray-100 rounded-2xl hover:border-green-200 hover:bg-green-50/30 transition-all group text-left active:scale-95 shadow-sm"
                  >
                    <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center mb-4 group-hover:bg-green-100 transition-colors">
                      <UserCheck className="w-6 h-6 text-green-600" />
                    </div>
                    <p className="text-sm font-normal text-gray-900 mb-1">Manage Tenants</p>
                    <p className="text-[11px] text-gray-400 font-normal leading-relaxed">Directly oversee customer accounts, subscriptions, and governance.</p>
                  </button>
                  
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="p-6 border border-gray-100 rounded-2xl hover:border-purple-200 hover:bg-purple-50/30 transition-all group text-left active:scale-95 shadow-sm"
                  >
                    <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center mb-4 group-hover:bg-purple-100 transition-colors">
                      <Plus className="w-6 h-6 text-purple-600" />
                    </div>
                    <p className="text-sm font-normal text-gray-900 mb-1">Create New Tenant</p>
                    <p className="text-[11px] text-gray-400 font-normal leading-relaxed">Provision a new SaaS instance and initialize business operations.</p>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tenants Tab */}
        {activeTab === 'tenants' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-4 sm:p-6 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gray-50/30">
              <div>
                <h2 className="text-base sm:text-lg font-normal text-gray-900">All Tenants ({filteredTenants.length})</h2>
                <p className="text-[10px] text-gray-400 font-normal uppercase tracking-widest mt-0.5">Live Subscription Data</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="relative group w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Search tenants..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none text-xs font-normal"
                  />
                </div>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="bg-blue-600 text-white px-4 py-2 sm:py-2.5 rounded-xl hover:bg-blue-700 transition-all flex items-center text-xs sm:text-sm font-normal active:scale-95 whitespace-nowrap"
                >
                  <Plus className="w-4 h-4 mr-1 sm:mr-2" />
                  Add Tenant
                </button>
              </div>
            </div>
            
            {loading ? (
              <div className="p-12 text-center text-gray-500">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-sm font-normal">Syncing data...</p>
              </div>
            ) : filteredTenants.length === 0 ? (
              <div className="p-12 text-center text-gray-400">
                <Building2 className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p className="text-sm font-normal">No tenants found</p>
              </div>
            ) : (
              <>
                {/* Mobile Card View */}
                <div className="md:hidden divide-y divide-gray-50">
                  {filteredTenants.map((tenant) => (
                    <div 
                      key={tenant.id} 
                      onClick={() => router.push(`/admin/tenants/${tenant.id}`)}
                      className="p-4 hover:bg-gray-50 transition-colors group cursor-pointer"
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-normal text-gray-900 truncate group-hover:text-blue-600 transition-colors">{tenant.name}</h3>
                          <p className="text-[10px] text-gray-400 font-normal uppercase tracking-tighter mt-0.5 group-hover:text-gray-500">{tenant.business_type}</p>
                        </div>
                        <div className="flex items-center gap-1.5 ml-3">
                          <span className={`px-2 py-0.5 text-[9px] font-normal rounded-lg border shadow-sm ${
                            tenant.plan?.toUpperCase() === 'PRO' 
                              ? 'bg-purple-100 text-purple-800 border-purple-200' 
                              : 'bg-blue-100 text-blue-800 border-blue-200'
                          }`}>
                            {tenant.plan}
                          </span>
                          <span className={`px-2 py-0.5 text-[9px] font-normal rounded-lg border shadow-sm ${
                            tenant.plan_status?.toUpperCase() === 'ACTIVE' 
                              ? 'bg-green-100 text-green-800 border-green-200' 
                              : 'bg-red-100 text-red-800 border-red-200'
                          }`}>
                            {tenant.plan_status}
                          </span>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-y-3 mb-6 bg-gray-50/50 p-3 rounded-xl border border-gray-50">
                        <div>
                          <p className="text-[9px] uppercase text-gray-400 font-normal tracking-widest mb-0.5">Admin Profile</p>
                          <p className="text-xs text-gray-800 font-normal truncate">
                            {tenant.profiles?.name || 'No Admin'}
                            <span className="block text-[10px] text-gray-400 font-normal">@{tenant.profiles?.username || 'N/A'}</span>
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-[9px] uppercase text-gray-400 font-normal tracking-widest mb-0.5">Month Activity</p>
                          <p className="text-xs text-gray-900 font-normal">{tenant.orders_this_month || 0} Orders</p>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedTenant(tenant);
                            setShowActionsModal(true);
                          }}
                          className="flex-1 bg-white hover:bg-blue-50 text-blue-600 py-2.5 rounded-xl text-xs font-normal transition-all border border-gray-100 hover:border-blue-100 flex items-center justify-center gap-2 active:scale-95"
                        >
                          <MoreHorizontal className="w-3.5 h-3.5" />
                          Manage
                        </button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteTenant(tenant.id, tenant.name);
                          }}
                          className="bg-white hover:bg-red-50 text-red-500 p-2 rounded-xl border border-gray-100 hover:border-red-100 active:scale-95"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50/50">
                      <tr>
                        <th className="px-6 py-4 text-left text-[10px] font-normal text-gray-400 uppercase tracking-widest border-b border-gray-100">
                          Business
                        </th>
                        <th className="px-6 py-4 text-left text-[10px] font-normal text-gray-400 uppercase tracking-widest border-b border-gray-100 hidden sm:table-cell">
                          Admin
                        </th>
                        <th className="px-6 py-4 text-left text-[10px] font-normal text-gray-400 uppercase tracking-widest border-b border-gray-100 hidden lg:table-cell">
                          Contact
                        </th>
                        <th className="px-6 py-4 text-left text-[10px] font-normal text-gray-400 uppercase tracking-widest border-b border-gray-100">
                          Plan
                        </th>
                        <th className="px-6 py-4 text-left text-[10px] font-normal text-gray-400 uppercase tracking-widest border-b border-gray-100 hidden xs:table-cell">
                          Orders
                        </th>
                        <th className="px-6 py-4 text-left text-[10px] font-normal text-gray-400 uppercase tracking-widest border-b border-gray-100">
                          Status
                        </th>
                        <th className="px-6 py-4 text-right text-[10px] font-normal text-gray-400 uppercase tracking-widest border-b border-gray-100">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-50">
                      {filteredTenants.map((tenant) => (
                        <tr 
                          key={tenant.id} 
                          onClick={() => router.push(`/admin/tenants/${tenant.id}`)}
                          className="hover:bg-blue-50/20 transition-colors group cursor-pointer"
                        >
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-normal text-gray-900 group-hover:text-blue-600">
                            {tenant.name}
                            <span className="block text-[10px] text-gray-400 font-normal uppercase tracking-tight group-hover:text-gray-500">{tenant.business_type}</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap hidden sm:table-cell">
                            <div className="text-sm font-normal text-gray-800">
                              {tenant.profiles?.name || 'No Admin'}
                            </div>
                            <div className="text-[10px] text-gray-400 font-normal">
                              @{tenant.profiles?.username || 'N/A'}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500 hidden lg:table-cell font-normal">
                            <div>{tenant.email}</div>
                            <div className="text-[10px] text-gray-400 font-normal mt-0.5">{tenant.phone}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2.5 py-1 text-[10px] font-normal rounded-lg border ${
                              tenant.plan?.toUpperCase() === 'PRO' 
                                ? 'bg-purple-100 text-purple-800 border-purple-200' 
                                : 'bg-blue-100 text-blue-800 border-blue-200'
                            }`}>
                              {tenant.plan}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-normal text-gray-900 hidden xs:table-cell">
                            {tenant.orders_this_month || 0}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2.5 py-1 text-[10px] font-normal rounded-lg border ${
                              tenant.plan_status?.toUpperCase() === 'ACTIVE' 
                                ? 'bg-green-100 text-green-800 border-green-200' 
                                : 'bg-red-100 text-red-800 border-red-200'
                            }`}>
                              {tenant.plan_status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedTenant(tenant);
                                  setShowActionsModal(true);
                                }}
                                className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 border border-transparent hover:border-blue-100 rounded-xl transition-all active:scale-95"
                                title="Manage Tenant"
                              >
                                <MoreHorizontal className="w-5 h-5" />
                              </button>
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteTenant(tenant.id, tenant.name);
                                }}
                                className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 border border-transparent hover:border-red-100 rounded-xl transition-all active:scale-90"
                                title="Delete Tenant"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        )}

        {/* Subscriptions Tab */}
        {activeTab === 'subscriptions' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 sm:p-6 group hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 mb-6">
                <div className="bg-purple-50 p-2 rounded-xl border border-purple-100">
                  <Zap className="w-5 h-5 text-purple-600" />
                </div>
                <h3 className="text-base sm:text-lg font-normal text-gray-900">Plan Distribution</h3>
              </div>
              <div className="space-y-4">
                <div className="flex justify-between items-center bg-gray-50/50 p-4 rounded-2xl border border-gray-50">
                  <div>
                    <p className="text-sm font-normal text-gray-900">Free Plan</p>
                    <p className="text-[10px] text-gray-400 font-normal uppercase tracking-tight">Unlimited orders</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl sm:text-2xl font-normal text-gray-900">{stats.freePlans}</p>
                    <p className="text-[10px] text-gray-400 font-normal uppercase tracking-widest">Tenants</p>
                  </div>
                </div>
                <div className="flex justify-between items-center bg-purple-50/30 p-4 rounded-2xl border border-purple-100/50">
                  <div>
                    <p className="text-sm font-normal text-purple-900">Pro Plan</p>
                    <p className="text-[10px] text-purple-400 font-normal uppercase tracking-tight">Unlimited orders • ₹499/mo</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl sm:text-2xl font-normal text-purple-900">{stats.proPlans}</p>
                    <p className="text-[10px] text-purple-400 font-normal uppercase tracking-widest">Tenants</p>
                  </div>
                </div>
                <div className="flex justify-between items-center bg-blue-50/30 p-4 rounded-2xl border border-blue-100/50">
                  <div>
                    <p className="text-sm font-normal text-blue-900">Business Plan</p>
                    <p className="text-[10px] text-blue-400 font-normal uppercase tracking-tight">Enterprise Scaling • ₹999/mo</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl sm:text-2xl font-normal text-blue-900">{stats.businessPlans}</p>
                    <p className="text-[10px] text-blue-400 font-normal uppercase tracking-widest">Tenants</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 sm:p-6 group hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 mb-6">
                <div className="bg-green-50 p-2 rounded-xl border border-green-100">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                </div>
                <h3 className="text-base sm:text-lg font-normal text-gray-900">Monthly Revenue</h3>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center text-sm font-normal text-gray-600 px-1">
                  <span>Pro Plans (₹499 × {stats.proPlans})</span>
                  <span className="text-gray-900">₹{(stats.proPlans * 499).toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center text-sm font-normal text-gray-600 px-1">
                  <span>Business Plans (₹999 × {stats.businessPlans})</span>
                  <span className="text-gray-900">₹{(stats.businessPlans * 999).toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center text-sm font-normal text-gray-600 px-1">
                  <span>Free Plans</span>
                  <span className="text-gray-900">₹0</span>
                </div>
                <div className="pt-4 mt-2 border-t border-gray-100">
                  <div className="flex justify-between items-center bg-green-50/50 p-4 rounded-2xl border border-green-100">
                    <div>
                      <span className="text-[10px] text-green-600 font-normal uppercase tracking-widest block mb-0.5">Estimated ARR</span>
                      <span className="text-xs text-green-500 font-normal italic">₹{(stats.monthlyRevenue * 12).toLocaleString()}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-green-600 font-normal uppercase tracking-widest block mb-0.5">Total MRR</span>
                      <span className="text-2xl sm:text-3xl font-normal text-green-700">₹{stats.monthlyRevenue.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Create Tenant Modal */}
      {showCreateModal && (
        <div 
          className="fixed inset-0 bg-black/40 backdrop-blur-sm flex justify-end z-50 transition-opacity duration-300"
          onClick={() => setShowCreateModal(false)}
        >
          <div 
            className="bg-white h-full w-full max-w-md shadow-2xl flex flex-col transform transition-transform duration-300 ease-out translate-x-0"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 sm:p-6 border-b flex justify-between items-center bg-gray-50/50">
              <div>
                <h3 className="text-xl font-normal text-gray-900">Create New Tenant</h3>
                <p className="text-xs text-gray-500 mt-1">Add a new SaaS customer to your platform</p>
              </div>
              <button 
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <Plus className="w-6 h-6 rotate-45" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              {createError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {createError}
                </div>
              )}
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-normal text-gray-700 mb-2">Business Name *</label>
                  <input
                    type="text"
                    required
                    value={createFormData.name}
                    onChange={(e) => setCreateFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="Enter business name"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-normal text-gray-700 mb-2">Tenant Admin Email *</label>
                  <input
                    type="email"
                    required
                    value={createFormData.email}
                    onChange={(e) => setCreateFormData(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="owner@business.com"
                  />
                  <p className="text-xs text-gray-500 mt-2 ml-1 italic">Primary admin for this business</p>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-normal text-gray-700 mb-2">Initial Plan</label>
                    <select
                      value={createFormData.plan}
                      onChange={(e) => setCreateFormData(prev => ({ ...prev, plan: e.target.value }))}
                      className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    >
                      <option value="FREE">Free Plan</option>
                      <option value="PRO">Pro Plan (₹499)</option>
                      <option value="BUSINESS">Business Plan (₹999)</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-normal text-gray-700 mb-2">Business Type</label>
                    <select
                      value={createFormData.business_type}
                      onChange={(e) => setCreateFormData(prev => ({ ...prev, business_type: e.target.value }))}
                      className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    >
                      <option value="Printing Press">Printing Press</option>
                      <option value="Digital Printing">Digital Printing</option>
                      <option value="Offset Printing">Offset Printing</option>
                      <option value="Screen Printing">Screen Printing</option>
                    </select>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-normal text-gray-700 mb-2">City</label>
                    <input
                      type="text"
                      value={createFormData.city}
                      onChange={(e) => setCreateFormData(prev => ({ ...prev, city: e.target.value }))}
                      className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      placeholder="Mumbai"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-normal text-gray-700 mb-2">State</label>
                    <input
                      type="text"
                      value={createFormData.state}
                      onChange={(e) => setCreateFormData(prev => ({ ...prev, state: e.target.value }))}
                      className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      placeholder="Maharashtra"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-normal text-gray-700 mb-2">Phone Number</label>
                  <input
                    type="tel"
                    value={createFormData.phone}
                    onChange={(e) => setCreateFormData(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="+91 98765 43210"
                  />
                </div>
              </div>
            </div>
            
            <div className="p-4 sm:p-6 border-t bg-gray-50/50 flex flex-col-reverse sm:flex-row gap-3">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setCreateError('');
                }}
                className="w-full sm:flex-1 bg-white border border-gray-200 text-gray-700 py-3 rounded-xl hover:bg-gray-50 transition-colors font-normal"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateTenant}
                disabled={isCreating || !createFormData.name || !createFormData.email}
                className="w-full sm:flex-1 bg-blue-600 text-white py-3 rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-normal"
              >
                {isCreating ? 'Creating...' : 'Create Tenant'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Actions Modal */}
      {showActionsModal && selectedTenant && (
        <div 
          className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[60] p-4 transition-opacity duration-300"
          onClick={() => setShowActionsModal(false)}
        >
          <div 
            className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl animate-in zoom-in duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-normal text-gray-900">Tenant Actions</h3>
              <button 
                onClick={() => setShowActionsModal(false)}
                className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <Plus className="w-6 h-6 rotate-45" />
              </button>
            </div>

            <div className="space-y-6">
              <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100">
                <div className="flex items-center gap-4 mb-3">
                  <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center text-white text-lg font-normal shadow-lg shadow-blue-100">
                    {selectedTenant.name.charAt(0)}
                  </div>
                  <div>
                    <h4 className="font-normal text-gray-900 leading-tight">{selectedTenant.name}</h4>
                    <p className="text-xs text-gray-400 mt-0.5">{selectedTenant.email}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <span className={`px-2 py-0.5 text-[9px] font-normal rounded-lg border leading-none ${
                    selectedTenant.plan?.toUpperCase() === 'PRO' 
                      ? 'bg-purple-100 text-purple-700 border-purple-200' 
                      : 'bg-blue-100 text-blue-700 border-blue-200'
                  }`}>
                    {selectedTenant.plan}
                  </span>
                  <span className={`px-2 py-0.5 text-[9px] font-normal rounded-lg border leading-none ${
                    selectedTenant.plan_status?.toUpperCase() === 'ACTIVE' 
                      ? 'bg-green-100 text-green-700 border-green-200' 
                      : 'bg-red-100 text-red-700 border-red-200'
                  }`}>
                    {selectedTenant.plan_status}
                  </span>
                </div>
              </div>
              
              <div className="space-y-2.5">
                <button 
                  onClick={() => {
                    handleUpdatePlan(selectedTenant.id, 'BUSINESS');
                    setShowActionsModal(false);
                  }}
                  disabled={selectedTenant.plan?.toUpperCase() === 'BUSINESS'}
                  className="w-full text-left px-5 py-3 border border-blue-100 bg-blue-50/10 text-blue-700 rounded-2xl hover:bg-blue-50 transition-all font-normal text-sm active:scale-95 disabled:opacity-50 flex items-center justify-between group"
                >
                  <span>Upgrade to Business (₹999)</span>
                  <Zap className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
                <button 
                  onClick={() => {
                    handleUpdatePlan(selectedTenant.id, 'PRO');
                    setShowActionsModal(false);
                  }}
                  disabled={selectedTenant.plan?.toUpperCase() === 'PRO'}
                  className="w-full text-left px-5 py-3 border border-purple-100 bg-purple-50/10 text-purple-700 rounded-2xl hover:bg-purple-50 transition-all font-normal text-sm active:scale-95 disabled:opacity-50 flex items-center justify-between group"
                >
                  <span>Upgrade to Pro (₹499)</span>
                  <Zap className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
                <button 
                  onClick={() => {
                    handleUpdatePlan(selectedTenant.id, 'FREE');
                    setShowActionsModal(false);
                  }}
                  disabled={selectedTenant.plan?.toUpperCase() === 'FREE'}
                  className="w-full text-left px-5 py-3 border border-gray-100 rounded-2xl hover:bg-gray-50 transition-all text-gray-600 font-normal text-sm active:scale-95 disabled:opacity-50 flex items-center justify-between"
                >
                  Downgrade to Free
                </button>
                <button 
                  onClick={() => {
                    handleToggleStatus(selectedTenant.id, selectedTenant.plan_status || 'ACTIVE');
                    setShowActionsModal(false);
                  }}
                  className="w-full text-left px-5 py-3 border border-gray-100 rounded-2xl hover:bg-gray-50 transition-all text-gray-700 font-normal text-sm active:scale-95 flex items-center justify-between"
                >
                  <span>{selectedTenant.plan_status?.toUpperCase() === 'ACTIVE' ? 'Suspend Account' : 'Activate Account'}</span>
                  <Power className="w-4 h-4 opacity-40" />
                </button>
                <button className="w-full text-left px-5 py-3 border border-gray-100 rounded-2xl hover:bg-gray-50 transition-all text-gray-700 font-normal text-sm active:scale-95">
                  Send Notification
                </button>
                <button 
                  onClick={() => handleDeleteTenant(selectedTenant.id, selectedTenant.name)}
                  className="w-full text-left px-5 py-3 border border-red-100 text-red-600 rounded-2xl hover:bg-red-50 transition-all font-normal text-sm active:scale-95 flex items-center justify-between group"
                >
                  <span>Delete Tenant</span>
                  <Trash2 className="w-4 h-4 opacity-40 group-hover:opacity-100 transition-opacity" />
                </button>
              </div>
            </div>
            <div className="mt-8">
              <button
                onClick={() => setShowActionsModal(false)}
                className="w-full bg-gray-100 text-gray-800 py-3 rounded-2xl hover:bg-gray-200 transition-colors font-normal text-sm active:scale-95"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Success Modal */}
      {showSuccessModal && lastCreatedTenant && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-[32px] max-w-md w-full p-8 shadow-2xl animate-in zoom-in duration-200 border border-gray-100">
            <div className="w-16 h-16 bg-green-50 rounded-2xl flex items-center justify-center mb-6 mx-auto border border-green-100">
              <Check className="w-8 h-8 text-green-600" />
            </div>
            
            <h2 className="text-2xl font-normal text-gray-900 mb-2 text-center">Tenant Initialized</h2>
            <p className="text-sm text-gray-500 text-center mb-8 font-normal">Business infrastructure provisioned successfully.</p>
            
            <div className="space-y-4 mb-8">
              <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100 relative group">
                <p className="text-[10px] uppercase text-gray-400 font-normal tracking-widest mb-1">Access URL</p>
                <p className="text-sm font-normal text-blue-600 break-all">{lastCreatedTenant.url}</p>
              </div>
              
              <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100 relative group">
                <p className="text-[10px] uppercase text-gray-400 font-normal tracking-widest mb-1">Administrator Email</p>
                <p className="text-sm font-normal text-gray-900">{lastCreatedTenant.email}</p>
              </div>

              <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100 relative group">
                <p className="text-[10px] uppercase text-gray-400 font-normal tracking-widest mb-1">Secure Password</p>
                <p className="text-sm font-mono font-normal text-gray-900 tracking-wider">{lastCreatedTenant.password}</p>
                <button 
                  onClick={() => {
                    const text = `Business: ${lastCreatedTenant.name}\nURL: ${lastCreatedTenant.url}\nEmail: ${lastCreatedTenant.email}\nPassword: ${lastCreatedTenant.password}`;
                    navigator.clipboard.writeText(text);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-2.5 bg-white border border-gray-100 rounded-xl hover:border-blue-200 hover:text-blue-600 transition-all shadow-sm active:scale-90"
                  title="Copy All Details"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={() => {
                  const message = encodeURIComponent(`*PrintFlow Welcome*\n\nYour business portal is ready!\n\n*Business:* ${lastCreatedTenant.name}\n*Portal:* ${lastCreatedTenant.url}\n*Email:* ${lastCreatedTenant.email}\n*Password:* ${lastCreatedTenant.password}\n\nPlease login and change your password.`);
                  window.open(`https://wa.me/?text=${message}`, '_blank');
                }}
                className="bg-[#25D366] text-white py-3.5 rounded-2xl text-sm font-normal hover:bg-[#20bd5a] transition-all active:scale-95 flex items-center justify-center gap-2 shadow-sm"
              >
                Share via WhatsApp
              </button>
              <button 
                onClick={() => setShowSuccessModal(false)}
                className="bg-gray-900 text-white py-3.5 rounded-2xl text-sm font-normal hover:bg-gray-800 transition-all active:scale-95 shadow-sm"
              >
                Finish
              </button>
            </div>
            {copied && (
              <p className="text-[10px] text-green-600 text-center mt-4 font-normal animate-pulse">✓ Details copied to clipboard</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
