"use client";

import { useState, useEffect } from "react";
import { Building2, Users, TrendingUp, Plus, MoreHorizontal, CreditCard, Settings, BarChart3, UserCheck, Shield } from "lucide-react";
import Link from "next/link";

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
        // Success - show credentials
        alert(`Tenant created successfully!\n\nBusiness: ${data.tenant.name}\nEmail: ${createFormData.email}\nPassword: ${data.tenant.tempPassword}\n\nPlease save these credentials.`);
        
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
    } catch (error) {
      setCreateError('Network error. Please try again.');
    } finally {
      setIsCreating(false);
    }
  }

  const stats = {
    totalTenants: tenants.length,
    activeTenants: tenants.filter(t => (t.plan_status || t.subscription_status) === 'ACTIVE').length,
    totalOrders: tenants.reduce((sum, t) => sum + (t.orders_this_month || 0), 0),
    proPlans: tenants.filter(t => (t.plan || t.subscription_tier) === 'PRO').length,
    freePlans: tenants.filter(t => (t.plan || t.subscription_tier) === 'FREE').length,
    monthlyRevenue: tenants.filter(t => (t.plan || t.subscription_tier) === 'PRO').length * 999, // ₹999 per PRO plan
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">PrintFlow Admin</h1>
              <p className="text-sm text-gray-500">SaaS Platform Management</p>
            </div>
            <div className="flex items-center space-x-4">
              <Link 
                href="/admin/analytics"
                className="text-gray-600 hover:text-gray-900 flex items-center"
              >
                <BarChart3 className="w-4 h-4 mr-2" />
                Analytics
              </Link>
              <Link 
                href="/admin/tenants"
                className="text-gray-600 hover:text-gray-900 flex items-center"
              >
                <UserCheck className="w-4 h-4 mr-2" />
                Tenants
              </Link>
              <Link 
                href="/dashboard" 
                className="text-gray-600 hover:text-gray-900 flex items-center"
              >
                <Settings className="w-4 h-4 mr-2" />
                Business Dashboard
              </Link>
              <Link 
                href="/" 
                className="text-gray-600 hover:text-gray-900"
              >
                Landing Page
              </Link>
              <button
                onClick={() => setShowCreateModal(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center"
              >
                <Plus className="w-4 h-4 mr-2" />
                New Tenant
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('overview')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'overview'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('tenants')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'tenants'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Tenants ({tenants.length})
            </button>
            <button
              onClick={() => setActiveTab('subscriptions')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'subscriptions'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Subscriptions
            </button>
          </nav>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div>
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-white p-6 rounded-xl shadow-sm border">
                <div className="flex items-center">
                  <div className="bg-blue-100 p-3 rounded-lg">
                    <Building2 className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm text-gray-500">Total Tenants</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.totalTenants}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-sm border">
                <div className="flex items-center">
                  <div className="bg-green-100 p-3 rounded-lg">
                    <TrendingUp className="w-6 h-6 text-green-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm text-gray-500">Active Tenants</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.activeTenants}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-sm border">
                <div className="flex items-center">
                  <div className="bg-purple-100 p-3 rounded-lg">
                    <CreditCard className="w-6 h-6 text-purple-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm text-gray-500">Monthly Revenue</p>
                    <p className="text-2xl font-bold text-gray-900">₹{stats.monthlyRevenue.toLocaleString()}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-sm border">
                <div className="flex items-center">
                  <div className="bg-orange-100 p-3 rounded-lg">
                    <Users className="w-6 h-6 text-orange-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm text-gray-500">Total Orders</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.totalOrders}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Link 
                  href="/admin/analytics"
                  className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors block"
                >
                  <BarChart3 className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                  <p className="text-sm font-medium text-gray-900 text-center">View Analytics</p>
                  <p className="text-xs text-gray-500 text-center">Detailed platform metrics</p>
                </Link>
                
                <Link 
                  href="/admin/tenants"
                  className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-green-500 hover:bg-green-50 transition-colors block"
                >
                  <UserCheck className="w-8 h-8 text-green-600 mx-auto mb-2" />
                  <p className="text-sm font-medium text-gray-900 text-center">Manage Tenants</p>
                  <p className="text-xs text-gray-500 text-center">Customer accounts</p>
                </Link>
                
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-colors"
                >
                  <Plus className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                  <p className="text-sm font-medium text-gray-900 text-center">Create New Tenant</p>
                  <p className="text-xs text-gray-500 text-center">Add new SaaS customer</p>
                </button>
                
                <Link 
                  href="/dashboard"
                  className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-orange-500 hover:bg-orange-50 transition-colors block"
                >
                  <Settings className="w-8 h-8 text-orange-600 mx-auto mb-2" />
                  <p className="text-sm font-medium text-gray-900 text-center">Business Dashboard</p>
                  <p className="text-xs text-gray-500 text-center">Your printing operations</p>
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Tenants Tab */}
        {activeTab === 'tenants' && (
          <div className="bg-white rounded-xl shadow-sm border">
            <div className="px-6 py-4 border-b flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-900">All Tenants</h2>
              <button
                onClick={() => setShowCreateModal(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Tenant
              </button>
            </div>
            
            {loading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-gray-500">Loading tenants...</p>
              </div>
            ) : tenants.length === 0 ? (
              <div className="p-8 text-center">
                <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No tenants found</p>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Create First Tenant
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Business
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Admin
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Contact
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Plan
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Orders
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {tenants.map((tenant) => (
                      <tr key={tenant.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{tenant.name}</div>
                            <div className="text-sm text-gray-500">{tenant.business_type}</div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-sm">
                            <div className="font-medium text-gray-900">
                              {tenant.profiles?.name || 'No Admin'}
                            </div>
                            <div className="text-gray-500">
                              {tenant.profiles?.username || 'N/A'}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div>{tenant.email}</div>
                          <div>{tenant.phone}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            tenant.plan === 'PRO' 
                              ? 'bg-purple-100 text-purple-800' 
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {tenant.plan}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {tenant.orders_this_month || 0}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            tenant.plan_status === 'ACTIVE' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {tenant.plan_status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <button className="text-gray-400 hover:text-gray-600">
                            <MoreHorizontal className="w-5 h-5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Subscriptions Tab */}
        {activeTab === 'subscriptions' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Plan Distribution</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-medium text-gray-900">Free Plan</p>
                    <p className="text-sm text-gray-500">Up to 50 orders/month</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-gray-900">{stats.freePlans}</p>
                    <p className="text-sm text-gray-500">tenants</p>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-medium text-gray-900">Pro Plan</p>
                    <p className="text-sm text-gray-500">Unlimited orders</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-gray-900">{stats.proPlans}</p>
                    <p className="text-sm text-gray-500">tenants</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Revenue</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Pro Plans (₹999 × {stats.proPlans})</span>
                  <span className="text-xl font-bold text-gray-900">₹{stats.monthlyRevenue.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Free Plans</span>
                  <span className="text-xl font-bold text-gray-900">₹0</span>
                </div>
                <div className="pt-4 border-t">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-gray-900">Total Monthly Revenue</span>
                    <span className="text-2xl font-bold text-green-600">₹{stats.monthlyRevenue.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Create Tenant Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Create New Tenant</h3>
            <p className="text-gray-600 mb-4">
              This will create a new SaaS customer who can subscribe to your platform.
            </p>
            
            {createError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {createError}
              </div>
            )}
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Business Name *</label>
                <input
                  type="text"
                  required
                  value={createFormData.name}
                  onChange={(e) => setCreateFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter business name"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tenant Admin Email *</label>
                <input
                  type="email"
                  required
                  value={createFormData.email}
                  onChange={(e) => setCreateFormData(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="owner@business.com"
                />
                <p className="text-xs text-gray-500 mt-1">This will be the primary admin for this tenant's business</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Initial Plan</label>
                <select
                  value={createFormData.plan}
                  onChange={(e) => setCreateFormData(prev => ({ ...prev, plan: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="FREE">Free Plan (50 orders/month)</option>
                  <option value="PRO">Pro Plan (₹999/month - Unlimited)</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Business Type</label>
                <select
                  value={createFormData.business_type}
                  onChange={(e) => setCreateFormData(prev => ({ ...prev, business_type: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="Printing Press">Printing Press</option>
                  <option value="Digital Printing">Digital Printing</option>
                  <option value="Offset Printing">Offset Printing</option>
                  <option value="Screen Printing">Screen Printing</option>
                  <option value="Commercial Printing">Commercial Printing</option>
                </select>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                  <input
                    type="text"
                    value={createFormData.city}
                    onChange={(e) => setCreateFormData(prev => ({ ...prev, city: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Mumbai"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                  <input
                    type="text"
                    value={createFormData.state}
                    onChange={(e) => setCreateFormData(prev => ({ ...prev, state: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Maharashtra"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                <input
                  type="tel"
                  value={createFormData.phone}
                  onChange={(e) => setCreateFormData(prev => ({ ...prev, phone: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="+91 98765 43210"
                />
              </div>
            </div>
            
            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setCreateError('');
                }}
                className="flex-1 bg-gray-200 text-gray-800 py-2 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateTenant}
                disabled={isCreating || !createFormData.name || !createFormData.email}
                className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isCreating ? 'Creating...' : 'Create Tenant'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
