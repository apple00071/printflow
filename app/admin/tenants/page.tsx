"use client";

import { useState, useEffect } from "react";
import { Building2, Users, TrendingUp, Plus, MoreHorizontal, CreditCard, Settings, Search, ArrowUpDown, LogOut, Activity, MoreVertical } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { formatDate } from "@/lib/utils/format";

interface Tenant {
  id: string;
  name: string;
  slug: string;
  business_type: string;
  city: string;
  state: string;
  email: string;
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

export default function TenantsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showActionsModal, setShowActionsModal] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
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
    } catch {
      console.error('Error fetching tenants');
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
        // Success
        setShowCreateModal(false);
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

  async function handleUpdatePlan(newPlan: string) {
    if (!selectedTenant) return;
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/tenants/${selectedTenant.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: newPlan }),
      });

      if (response.ok) {
        setShowActionsModal(false);
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
  }

  async function handleUpdateStatus(newStatus: string) {
    if (!selectedTenant) return;
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/tenants/${selectedTenant.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan_status: newStatus }),
      });

      if (response.ok) {
        setShowActionsModal(false);
        await fetchTenants();
      } else {
        alert('Failed to update status');
        setLoading(false);
      }
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Error updating status');
      setLoading(false);
    }
  }

  async function handleDeleteTenant() {
    if (!selectedTenant) return;
    if (!confirm(`Are you sure you want to delete ${selectedTenant.name}? This action cannot be undone.`)) return;
    
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/tenants/${selectedTenant.id}`, {
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
  }

  const filteredTenants = tenants.filter(tenant => {
    const matchesSearch = tenant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         tenant.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (tenant.profiles?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (tenant.profiles?.username || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesSearch;
  });

  const stats = {
    totalTenants: tenants.length,
    activeTenants: tenants.filter(t => (t.plan_status || t.subscription_status) === 'ACTIVE').length,
    proPlans: tenants.filter(t => (t.plan || t.subscription_tier) === 'PRO').length,
    freePlans: tenants.filter(t => (t.plan || t.subscription_tier) === 'FREE').length,
    totalOrders: tenants.reduce((sum, t) => sum + (t.orders_this_month || 0), 0),
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4 sm:py-6">
            <div className="text-left">
              <h1 className="text-lg sm:text-2xl font-normal text-gray-900 tracking-tight">Tenants</h1>
              <p className="text-[10px] sm:text-sm text-gray-500 font-normal">SaaS Governance</p>
            </div>
            
            <div className="flex items-center gap-2">
              <div className="hidden sm:flex items-center gap-2 mr-2 border-r pr-4 border-gray-100">
                <Link 
                  href="/admin" 
                  className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                  title="Dashboard"
                >
                  <Settings className="w-4 h-4" />
                </Link>
                <Link 
                  href="/admin/analytics" 
                  className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                  title="Analytics"
                >
                  <TrendingUp className="w-4 h-4" />
                </Link>
              </div>

              <button
                onClick={() => setShowCreateModal(true)}
                className="bg-blue-600 text-white p-2 sm:px-5 sm:py-2.5 rounded-xl hover:bg-blue-700 transition-all flex items-center text-xs font-normal active:scale-95 shadow-lg shadow-blue-200"
              >
                <Plus className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">New Tenant</span>
              </button>
              
              <button
                onClick={handleSignOut}
                className="text-gray-400 hover:text-red-600 p-2 rounded-xl transition-all active:scale-95"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-6 mb-8">
          {[
            { label: 'Total', value: stats.totalTenants, icon: Building2, color: 'blue' },
            { label: 'Active', value: stats.activeTenants, icon: Users, color: 'green' },
            { label: 'PRO', value: stats.proPlans, icon: CreditCard, color: 'purple' },
            { label: 'Free', value: stats.freePlans, icon: TrendingUp, color: 'yellow' },
            { label: 'Orders', value: stats.totalOrders, icon: ArrowUpDown, color: 'orange', mobileFull: true }
          ].map((stat, i) => (
            <div 
              key={i} 
              className={`bg-white p-4 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow group ${stat.mobileFull ? 'col-span-2 sm:col-span-1' : ''}`}
            >
              <div className="flex items-center gap-3">
                <div className={`bg-${stat.color}-50 p-2 rounded-xl border border-${stat.color}-100 group-hover:bg-${stat.color}-100 transition-colors`}>
                  <stat.icon className={`w-4 h-4 text-${stat.color}-600`} />
                </div>
                <div>
                  <p className="text-[10px] font-normal text-gray-400 uppercase tracking-widest leading-none mb-1">{stat.label}</p>
                  <p className="text-lg font-normal text-gray-900 leading-none">{stat.value}</p>
                </div>
              </div>
            </div>
          ))}
        </div>


        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 sm:p-6 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h2 className="text-base sm:text-lg font-normal text-gray-900">All Tenants ({filteredTenants.length})</h2>
            <div className="relative group w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors w-4 h-4" />
              <input
                type="text"
                placeholder="Search tenants..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white focus:border-transparent transition-all outline-none text-sm font-normal"
              />
            </div>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden divide-y divide-gray-100">
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
              filteredTenants.map((tenant) => (
                <div key={tenant.id} className="p-4 hover:bg-blue-50/20 transition-all group">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-sm font-normal text-gray-900 truncate group-hover:text-blue-600 transition-colors">{tenant.name}</h3>
                        <span className={`px-2 py-0.5 text-[8px] font-normal rounded-lg border leading-none ${
                          (tenant.plan_status || tenant.subscription_status) === 'ACTIVE' 
                            ? 'bg-green-100 text-green-700 border-green-200' 
                            : 'bg-red-100 text-red-700 border-red-200'
                        }`}>
                          {tenant.plan_status || tenant.subscription_status || 'ACTIVE'}
                        </span>
                      </div>
                      <p className="text-[10px] text-gray-400 font-normal uppercase tracking-widest">{tenant.business_type}</p>
                    </div>
                    <div className="ml-3">
                      <span className={`px-2 py-1 text-[9px] font-normal rounded-lg border shadow-sm ${
                        (tenant.plan || tenant.subscription_tier) === 'BUSINESS'
                          ? 'bg-blue-100 text-blue-800 border-blue-200'
                          : (tenant.plan || tenant.subscription_tier) === 'PRO' 
                            ? 'bg-purple-100 text-purple-800 border-purple-200' 
                            : 'bg-gray-100 text-gray-800 border-gray-200'
                      }`}>
                        {tenant.plan || tenant.subscription_tier || 'FREE'}
                      </span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 mb-4 bg-gray-50/50 p-4 rounded-2xl border border-gray-100/50">
                    <div className="space-y-1">
                      <p className="text-[9px] uppercase text-gray-400 font-normal tracking-widest">Admin</p>
                      <div>
                        <p className="text-xs text-gray-700 font-normal truncate">{tenant.profiles?.name || 'No Admin'}</p>
                        <p className="text-[10px] text-gray-400 font-normal">@{tenant.profiles?.username || 'N/A'}</p>
                      </div>
                    </div>
                    <div className="space-y-1 text-right">
                      <p className="text-[9px] uppercase text-gray-400 font-normal tracking-widest">MTD Sales</p>
                      <div className="flex items-center justify-end gap-1.5 text-blue-600">
                        <Activity className="w-3 h-3" />
                        <p className="text-xs font-normal">{tenant.orders_this_month || 0} Orders</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2.5">
                    <button
                      onClick={() => {
                        setSelectedTenant(tenant);
                        setShowActionsModal(true);
                      }}
                      className="flex-1 bg-white hover:bg-gray-50 text-gray-600 py-2.5 rounded-xl text-xs font-normal transition-all border border-gray-100 flex items-center justify-center gap-2 active:scale-95"
                    >
                      <MoreVertical className="w-3.5 h-3.5 opacity-40" />
                      Manage
                    </button>
                    <Link
                      href={`/admin/tenants/${tenant.id}`}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl text-xs font-normal transition-all shadow-lg shadow-blue-200 active:scale-95 flex items-center justify-center gap-2"
                    >
                      View Details
                    </Link>
                  </div>
                </div>
              ))
            )}
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
                  <th className="px-6 py-4 text-left text-[10px] font-normal text-gray-400 uppercase tracking-widest border-b border-gray-100 hidden md:table-cell">
                    Joined
                  </th>
                  <th className="px-6 py-4 text-right text-[10px] font-normal text-gray-400 uppercase tracking-widest border-b border-gray-100">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {filteredTenants.map((tenant) => (
                  <tr 
                    key={tenant.id} 
                    onClick={() => router.push(`/admin/tenants/${tenant.id}`)}
                    className="hover:bg-blue-50/30 transition-colors group cursor-pointer"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className="text-sm font-normal text-gray-900 group-hover:text-blue-600 transition-colors">{tenant.name}</span>
                        <span className="text-[10px] text-gray-400 font-normal uppercase tracking-tight">{tenant.business_type}</span>
                      </div>
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
                        (tenant.plan || tenant.subscription_tier) === 'BUSINESS'
                          ? 'bg-blue-100 text-blue-800 border-blue-200'
                          : (tenant.plan || tenant.subscription_tier) === 'PRO' 
                            ? 'bg-purple-100 text-purple-800 border-purple-200' 
                            : 'bg-gray-100 text-gray-800 border-gray-200'
                      }`}>
                        {tenant.plan || tenant.subscription_tier || 'FREE'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-normal text-gray-900 hidden xs:table-cell">
                      {tenant.orders_this_month || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2.5 py-1 text-[10px] font-normal rounded-lg border ${
                        (tenant.plan_status || tenant.subscription_status) === 'ACTIVE' 
                          ? 'bg-green-100 text-green-800 border-green-200' 
                          : 'bg-red-100 text-red-800 border-red-200'
                      }`}>
                        {tenant.plan_status || tenant.subscription_status || 'ACTIVE'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-400 font-normal hidden md:table-cell tracking-tighter">
                      {formatDate(tenant.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedTenant(tenant);
                          setShowActionsModal(true);
                        }}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all border border-transparent hover:border-blue-100 active:scale-95"
                      >
                        <MoreHorizontal className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
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
            <div className="p-6 border-b flex justify-between items-center bg-gray-50/50">
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
            
            <div className="flex-1 overflow-y-auto p-6">
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
                
                <div className="grid grid-cols-2 gap-4">
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
                
                <div className="grid grid-cols-2 gap-4">
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
            
            <div className="p-6 border-t bg-gray-50/50 flex space-x-3">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setCreateError('');
                }}
                className="flex-1 bg-white border border-gray-200 text-gray-700 py-3 rounded-xl hover:bg-gray-50 transition-colors font-normal"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateTenant}
                disabled={isCreating || !createFormData.name || !createFormData.email}
                className="flex-1 bg-blue-600 text-white py-3 rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-normal"
              >
                {isCreating ? 'Creating...' : 'Create Tenant'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Actions Modal */}
      {showActionsModal && selectedTenant && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-normal mb-4">Tenant Actions</h3>
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-normal text-gray-900">{selectedTenant.name}</h4>
                <p className="text-sm text-gray-500">{selectedTenant.email}</p>
                <p className="text-sm text-gray-500">Plan: {selectedTenant.plan} ({selectedTenant.plan_status})</p>
              </div>
              
              <div className="space-y-2">
                <button 
                  onClick={() => handleUpdatePlan('BUSINESS')}
                  disabled={selectedTenant.plan === 'BUSINESS'}
                  className="w-full text-left px-4 py-2 border border-blue-300 bg-blue-50/10 text-blue-700 rounded-lg hover:bg-blue-50 transition-all font-normal text-sm active:scale-95 disabled:opacity-50"
                >
                  Upgrade to Business (₹999)
                </button>
                <button 
                  onClick={() => handleUpdatePlan('PRO')}
                  disabled={selectedTenant.plan === 'PRO'}
                  className="w-full text-left px-4 py-2 border border-purple-300 bg-purple-50/10 text-purple-700 rounded-lg hover:bg-purple-50 transition-all font-normal text-sm active:scale-95 disabled:opacity-50"
                >
                  Upgrade to Pro (₹499)
                </button>
                <button 
                  onClick={() => handleUpdatePlan('FREE')}
                  disabled={selectedTenant.plan === 'FREE'}
                  className="w-full text-left px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-all text-gray-600 font-normal text-sm active:scale-95 disabled:opacity-50"
                >
                  Downgrade to Free
                </button>
                <button 
                  onClick={() => handleUpdateStatus(selectedTenant.plan_status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE')}
                  className="w-full text-left px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  {selectedTenant.plan_status === 'ACTIVE' ? 'Suspend Account' : 'Activate Account'}
                </button>
                <button className="w-full text-left px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                  Send Notification
                </button>
                <button 
                  onClick={handleDeleteTenant}
                  className="w-full text-left px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                >
                  Delete Tenant
                </button>
              </div>
            </div>
            <div className="mt-6">
              <button
                onClick={() => setShowActionsModal(false)}
                className="w-full bg-gray-200 text-gray-800 py-2 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
