"use client";

import { useState, useEffect } from "react";
import { 
  Users, 
  ArrowLeft, 
  CreditCard, 
  Settings, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar,
  ShieldCheck,
  Zap,
  Clock,
  ExternalLink,
  Activity,
  ChevronRight,
  Plus
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatDate } from "@/lib/utils/format";

interface TenantDetails {
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
  plan: string;
  plan_status: string;
  orders_this_month: number;
  profiles: {
    id: string;
    username: string;
    name: string;
  };
}

export default function TenantDetailPage({ params }: { params: { id: string } }) {
  const [tenant, setTenant] = useState<TenantDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [showPurgeConfirm, setShowPurgeConfirm] = useState(false);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const router = useRouter();

  useEffect(() => {
    async function fetchTenantDetails() {
      try {
        setLoading(true);
        const response = await fetch(`/api/admin/tenants/${params.id}`);
        if (response.ok) {
          const data = await response.json();
          setTenant(data);
        } else {
          console.error("Failed to fetch tenant details");
          // If not found or error, redirect back
          router.push("/admin/tenants");
        }
      } catch (error) {
        console.error("Error fetching tenant details:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchTenantDetails();
  }, [params.id, router]);

  async function refreshTenantDetails() {
    try {
      const response = await fetch(`/api/admin/tenants/${params.id}`);
      if (response.ok) {
        const data = await response.json();
        setTenant(data);
      }
    } catch (error) {
      console.error("Error refreshing tenant details:", error);
    }
  }

  async function handleUpdatePlan(newPlan: string) {
    if (!tenant) return;
    try {
      setUpdating(true);
      const response = await fetch(`/api/admin/tenants/${tenant.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: newPlan }),
      });

      if (response.ok) {
        setShowPlanModal(false);
        await refreshTenantDetails();
      } else {
        alert('Failed to update plan');
      }
    } catch (error) {
      console.error('Error updating plan:', error);
    } finally {
      setUpdating(false);
    }
  }

  async function handleUpdateStatus(newStatus: string) {
    if (!tenant) return;
    try {
      setUpdating(true);
      const response = await fetch(`/api/admin/tenants/${tenant.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan_status: newStatus }),
      });

      if (response.ok) {
        await refreshTenantDetails();
      } else {
        alert('Failed to update status');
      }
    } catch (error) {
      console.error('Error updating status:', error);
    } finally {
      setUpdating(false);
    }
  }

  async function handlePurgeTenant() {
    if (!tenant) return;
    try {
      setUpdating(true);
      const response = await fetch(`/api/admin/tenants/${tenant.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        router.push("/admin");
      } else {
        alert('Failed to purge tenant data');
      }
    } catch (error) {
      console.error('Error purging tenant:', error);
    } finally {
      setUpdating(false);
      setShowPurgeConfirm(false);
    }
  }

  const currentPlan = (tenant?.subscription_tier || tenant?.plan || 'FREE').toUpperCase();
  const isPaid = ['PRO', 'BUSINESS', 'ENTERPRISE'].includes(currentPlan);
  const usagePercent = 100; // Orders are now unlimited for all plans
  const isNearLimit = false;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-500 font-normal">Loading tenant insights...</p>
        </div>
      </div>
    );
  }

  if (!tenant) return null;

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Top Banner / Header */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-5 flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-5 w-full sm:w-auto">
              <Link 
                href="/admin" 
                className="p-2.5 hover:bg-gray-50 rounded-2xl transition-all border border-gray-100 hover:border-gray-200 shadow-sm"
              >
                <ArrowLeft className="w-5 h-5 text-gray-500" />
              </Link>
              <div className="min-w-0">
                <div className="flex items-center gap-3 mb-0.5">
                  <h1 className="text-2xl font-normal text-gray-900 truncate tracking-tight">{tenant.name}</h1>
                  <span className={`px-2.5 py-1 text-[10px] font-normal rounded-xl border shadow-sm ${
                    tenant.plan === 'BUSINESS'
                      ? 'bg-blue-600 text-white border-blue-500'
                      : tenant.plan === 'PRO' 
                        ? 'bg-purple-100 text-purple-800 border-purple-200' 
                        : 'bg-blue-50 text-blue-800 border-blue-100'
                  }`}>
                    {tenant.subscription_tier || tenant.plan}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <p className="text-[10px] text-gray-400 uppercase tracking-[0.2em] font-normal">Governance Engine</p>
                  <span className="w-1 h-1 rounded-full bg-gray-200"></span>
                  <p className="text-[10px] text-blue-500 font-normal">ID: {tenant.id.split('-')[0].toUpperCase()}</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button 
                onClick={() => handleUpdateStatus(tenant.plan_status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE')}
                disabled={updating}
                className={`flex-1 sm:flex-none px-5 py-2.5 rounded-2xl text-xs font-normal transition-all border shadow-sm ${
                  tenant.plan_status === 'ACTIVE'
                    ? 'bg-white text-red-600 border-red-100 hover:bg-red-50'
                    : 'bg-green-600 text-white border-green-500 hover:bg-green-700'
                } active:scale-95 disabled:opacity-50`}
              >
                {tenant.plan_status === 'ACTIVE' ? 'Suspend Access' : 'Restore Access'}
              </button>
              <button 
                onClick={() => setShowPlanModal(true)}
                disabled={updating}
                className="flex-1 sm:flex-none px-5 py-2.5 bg-blue-600 text-white rounded-2xl text-xs font-normal hover:bg-blue-700 transition-all border border-blue-500 shadow-lg shadow-blue-100 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Zap className="w-4 h-4" />
                Change Plan
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column: Business Info & Admin */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                <Activity className="w-4 h-4 text-blue-500 mb-2" />
                <p className="text-[10px] text-gray-400 uppercase tracking-widest font-normal mb-1">MTD Orders</p>
                <p className="text-xl font-normal text-gray-900">{tenant.orders_this_month}</p>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                <Users className="w-4 h-4 text-purple-500 mb-2" />
                <p className="text-[10px] text-gray-400 uppercase tracking-widest font-normal mb-1">Business Type</p>
                <p className="text-sm font-normal text-gray-900 truncate">{tenant.business_type}</p>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                <ShieldCheck className="w-4 h-4 text-green-500 mb-2" />
                <p className="text-[10px] text-gray-400 uppercase tracking-widest font-normal mb-1">Status</p>
                <div className="flex items-center gap-1.5">
                  <div className={`w-1.5 h-1.5 rounded-full ${tenant.plan_status === 'ACTIVE' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  <p className="text-sm font-normal text-gray-900">{tenant.plan_status}</p>
                </div>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                <Calendar className="w-4 h-4 text-orange-500 mb-2" />
                <p className="text-[10px] text-gray-400 uppercase tracking-widest font-normal mb-1">Joined</p>
                <p className="text-sm font-normal text-gray-900">{formatDate(tenant.created_at)}</p>
              </div>
            </div>

            {/* Detailed Info Sections */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between">
                <h3 className="text-sm font-normal text-gray-900 uppercase tracking-tight">Business Profile</h3>
                <Settings className="w-4 h-4 text-gray-300" />
              </div>
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div>
                    <label className="text-[9px] uppercase text-gray-400 font-normal tracking-widest block mb-1">Legal Name</label>
                    <p className="text-sm text-gray-900 font-normal">{tenant.name}</p>
                  </div>
                  <div>
                    <label className="text-[9px] uppercase text-gray-400 font-normal tracking-widest block mb-1">Public URL</label>
                    <Link 
                      href={`/order/${tenant.slug}`}
                      target="_blank"
                      className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 hover:underline cursor-pointer group font-normal transition-colors"
                    >
                      <span className="truncate max-w-[200px] sm:max-w-none">printflow.ai/{tenant.slug}</span>
                      <ExternalLink className="w-3 h-3 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform flex-shrink-0" />
                    </Link>
                  </div>
                  <div>
                    <label className="text-[9px] uppercase text-gray-400 font-normal tracking-widest block mb-1">Location</label>
                    <div className="flex items-start gap-2 text-sm text-gray-700 font-normal">
                      <MapPin className="w-4 h-4 text-gray-300 mt-0.5" />
                      <span>{tenant.city}, {tenant.state}<br/><span className="text-[10px] text-gray-400 uppercase">Registered Address</span></span>
                    </div>
                  </div>
                </div>
                <div className="space-y-6">
                  <div>
                    <label className="text-[9px] uppercase text-gray-400 font-normal tracking-widest block mb-1">Contact Email</label>
                    <div className="flex items-center gap-2 text-sm text-gray-700 font-normal">
                      <Mail className="w-4 h-4 text-gray-300" />
                      <span>{tenant.email}</span>
                    </div>
                  </div>
                  <div>
                    <label className="text-[9px] uppercase text-gray-400 font-normal tracking-widest block mb-1">Phone Number</label>
                    <div className="flex items-center gap-2 text-sm text-gray-700 font-normal">
                      <Phone className="w-4 h-4 text-gray-300" />
                      <span>{tenant.phone || 'Not Provided'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Admin Profile Details */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between">
                <h3 className="text-sm font-normal text-gray-900 uppercase tracking-tight">Tenant Administrator</h3>
                <Zap className="w-4 h-4 text-gray-300" />
              </div>
              <div className="p-6 flex items-center gap-6">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xl font-normal shadow-lg shadow-blue-200">
                  {tenant.profiles.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-lg font-normal text-gray-900 truncate">{tenant.profiles.name}</h4>
                  <p className="text-xs text-gray-500 font-normal">@{tenant.profiles.username} • Account ID: {tenant.profiles.id.split('-')[0]}</p>
                </div>
                <button className="px-4 py-2 border border-gray-200 rounded-xl text-xs font-normal text-gray-600 hover:bg-gray-50 transition-all active:scale-95">
                  Reset Password
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Billing & Activity */}
          <div className="space-y-8">
            
            {/* Plan Status Card */}
            <div className={`p-6 rounded-2xl border shadow-lg transition-all ${
              tenant.plan === 'BUSINESS'
                ? 'bg-gradient-to-br from-blue-900 to-indigo-900 text-white border-blue-800'
                : tenant.plan === 'PRO' 
                  ? 'bg-gradient-to-br from-indigo-900 to-purple-900 text-white border-purple-800' 
                  : 'bg-white text-gray-900 border-gray-100'
            }`}>
              <div className="flex items-center justify-between mb-8">
                <p className="text-[10px] uppercase tracking-[0.2em] font-normal opacity-60">Subscription</p>
                <div className={`p-2 rounded-lg ${tenant.plan === 'PRO' ? 'bg-white/10' : 'bg-blue-50'}`}>
                  <CreditCard className={`w-5 h-5 ${tenant.plan === 'PRO' ? 'text-blue-200' : 'text-blue-600'}`} />
                </div>
              </div>
              <div className="space-y-1 mb-8">
                <h3 className="text-3xl font-normal">{tenant.subscription_tier || tenant.plan}</h3>
                <p className={`text-xs font-normal ${isPaid ? 'opacity-60' : 'text-gray-400'}`}>
                  {tenant.plan === 'BUSINESS' ? 'Enterprise Scaling License' : tenant.plan === 'PRO' ? 'Professional Business License' : 'Standard Free Tier'}
                </p>
              </div>
              <div className={`p-4 rounded-xl border ${
                tenant.plan === 'PRO' ? 'bg-white/5 border-white/10' : 'bg-gray-50 border-gray-100'
              }`}>
                <div className="flex justify-between text-[10px] uppercase tracking-wider font-normal mb-2 opacity-60">
                  <span>Usage Cycle</span>
                  <span>{usagePercent}% used</span>
                </div>
                <div className="h-1.5 w-full bg-gray-200/20 rounded-full overflow-hidden mb-1">
                  <div 
                    className={`h-full rounded-full transition-all duration-1000 ${
                      isNearLimit ? 'bg-orange-400' : (tenant.plan === 'PRO' ? 'bg-blue-400' : 'bg-blue-600')
                    }`} 
                    style={{ width: `${usagePercent}%` }}
                  ></div>
                </div>
                <p className={`text-[9px] font-normal ${tenant.plan === 'PRO' ? 'opacity-40' : 'text-gray-400'}`}>
                  {tenant.orders_this_month} orders this month — Unlimited
                </p>
              </div>
            </div>

            {/* Quick Actions List */}
            <div className="space-y-3">
              <h3 className="text-[10px] uppercase tracking-widest text-gray-400 font-normal ml-1 mb-2">Platform Governance</h3>
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-50">
                <button className="w-full px-5 py-4 flex items-center justify-between group hover:bg-gray-50 transition-all text-left">
                  <div className="flex items-center gap-3">
                    <Clock className="w-4 h-4 text-gray-400" />
                    <span className="text-sm font-normal text-gray-700">View Audit Logs</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-300 group-hover:translate-x-1 transition-transform" />
                </button>
                <button className="w-full px-5 py-4 flex items-center justify-between group hover:bg-gray-50 transition-all text-left">
                  <div className="flex items-center gap-3">
                    <ShieldCheck className="w-4 h-4 text-gray-400" />
                    <span className="text-sm font-normal text-gray-700">Permission Override</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-300 group-hover:translate-x-1 transition-transform" />
                </button>
                <button 
                  onClick={() => setShowPurgeConfirm(true)}
                  className="w-full px-5 py-4 flex items-center justify-between group hover:bg-red-50 transition-all text-left text-red-600"
                >
                  <div className="flex items-center gap-3">
                    <ShieldCheck className="w-4 h-4 opacity-40" />
                    <span className="text-sm font-normal">Purge Tenant Data</span>
                  </div>
                  <ChevronRight className="w-4 h-4 opacity-40 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </div>

            {/* Support context */}
            <div className="bg-blue-50/50 p-6 rounded-2xl border border-blue-100">
              <h4 className="text-xs font-normal text-blue-900 mb-2">Need to manual intervene?</h4>
              <p className="text-[10px] leading-relaxed text-blue-700/70 font-normal">
                As a Super Admin, you have full authority to override tenant settings, manage their billing manually, or impersonate an admin for support purposes. All actions are logged.
              </p>
            </div>

          </div>
        </div>
      </div>

      {/* Change Plan Modal */}
      {showPlanModal && (
        <div 
          className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[60] p-4 transition-opacity duration-300"
          onClick={() => setShowPlanModal(false)}
        >
          <div 
            className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl animate-in zoom-in duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-normal text-gray-900">Change Subscription</h3>
              <button 
                onClick={() => setShowPlanModal(false)}
                className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <Plus className="w-6 h-6 rotate-45" />
              </button>
            </div>

            <div className="space-y-3">
              <button 
                onClick={() => handleUpdatePlan('BUSINESS')}
                disabled={tenant.plan === 'BUSINESS' || updating}
                className={`w-full text-left px-5 py-4 border rounded-2xl transition-all font-normal text-sm active:scale-95 disabled:opacity-50 flex items-center justify-between group ${
                  tenant.plan === 'BUSINESS' ? 'bg-blue-600 border-blue-600 text-white' : 'border-blue-100 bg-blue-50/10 text-blue-700 hover:bg-blue-50'
                }`}
              >
                <div>
                  <p className="font-normal">Business Plan (₹999)</p>
                  <p className={`text-[10px] ${tenant.plan === 'BUSINESS' ? 'opacity-80' : 'text-blue-400'}`}>Full Enterprise Governance</p>
                </div>
                <Zap className="w-5 h-5 opacity-40" />
              </button>

              <button 
                onClick={() => handleUpdatePlan('PRO')}
                disabled={tenant.plan === 'PRO' || updating}
                className={`w-full text-left px-5 py-4 border rounded-2xl transition-all font-normal text-sm active:scale-95 disabled:opacity-50 flex items-center justify-between group ${
                  tenant.plan === 'PRO' ? 'bg-purple-600 border-purple-600 text-white' : 'border-purple-100 bg-purple-50/10 text-purple-700 hover:bg-purple-50'
                }`}
              >
                <div>
                  <p className="font-normal">Pro Plan (₹499)</p>
                  <p className={`text-[10px] ${tenant.plan === 'PRO' ? 'opacity-80' : 'text-purple-400'}`}>Professional Business License</p>
                </div>
                <Zap className="w-5 h-5 opacity-40" />
              </button>

              <button 
                onClick={() => handleUpdatePlan('FREE')}
                disabled={tenant.plan === 'FREE' || updating}
                className={`w-full text-left px-5 py-4 border rounded-2xl transition-all font-normal text-sm active:scale-95 disabled:opacity-50 flex items-center justify-between group ${
                  tenant.plan === 'FREE' ? 'bg-gray-600 border-gray-600 text-white' : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                <div>
                  <p className="font-normal">Free Plan (₹0)</p>
                  <p className={`text-[10px] ${tenant.plan === 'FREE' ? 'opacity-80' : 'text-gray-400'}`}>Standard Trial Tier</p>
                </div>
                <Clock className="w-5 h-5 opacity-40" />
              </button>
            </div>

            <div className="mt-8">
              <button
                onClick={() => setShowPlanModal(false)}
                className="w-full bg-gray-100 text-gray-800 py-3 rounded-2xl hover:bg-gray-200 transition-colors font-normal text-sm active:scale-95"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Purge Confirmation Modal */}
      {showPurgeConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-8 shadow-2xl animate-in zoom-in duration-200">
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center text-red-600 mx-auto mb-6">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-normal text-gray-900 text-center mb-2">Purge Tenant Data?</h3>
            <p className="text-sm text-gray-500 text-center font-normal mb-8">
              This action is irreversible. All business data, users, and orders associated with <strong className="text-gray-900">{tenant.name}</strong> will be permanently deleted.
            </p>
            <div className="space-y-3">
              <button
                onClick={handlePurgeTenant}
                disabled={updating}
                className="w-full py-3 bg-red-600 text-white rounded-xl text-sm font-normal hover:bg-red-700 transition-all active:scale-95 disabled:opacity-50"
              >
                {updating ? 'Purging...' : 'Confirm Destruction'}
              </button>
              <button
                onClick={() => setShowPurgeConfirm(false)}
                disabled={updating}
                className="w-full py-3 bg-white text-gray-600 border border-gray-100 rounded-xl text-sm font-normal hover:bg-gray-50 transition-all active:scale-95"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
