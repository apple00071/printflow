"use client";

import { useState, useEffect } from "react";
import { Building2, Users, TrendingUp, CreditCard, ArrowUp, ArrowDown, BarChart3, Activity, LogOut } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface Analytics {
  totalTenants: number;
  activeTenants: number;
  totalOrders: number;
  monthlyRevenue: number;
  proPlans: number;
  freePlans: number;
  topTenants: Tenant[];
}

interface Tenant {
  id: string;
  name: string;
  plan_status?: string;
  subscription_status?: string;
  orders_this_month?: number;
  plan?: string;
  subscription_tier?: string;
}

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<Analytics>({
    totalTenants: 0,
    activeTenants: 0,
    totalOrders: 0,
    monthlyRevenue: 0,
    proPlans: 0,
    freePlans: 0,
    topTenants: [],
  });
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  async function fetchAnalytics() {
    try {
      const response = await fetch('/api/admin/tenants');
      if (response.ok) {
        const tenants: Tenant[] = await response.json();
        
        const sortedTenants = [...tenants].sort((a, b) => (b.orders_this_month || 0) - (a.orders_this_month || 0)).slice(0, 5);

        const stats = {
          totalTenants: tenants.length,
          activeTenants: tenants.filter((t) => (t.plan_status || t.subscription_status)?.toUpperCase() === 'ACTIVE').length,
          totalOrders: tenants.reduce((sum, t) => sum + (t.orders_this_month || 0), 0),
          monthlyRevenue: tenants.filter((t) => (t.plan || t.subscription_tier)?.toUpperCase() === 'PRO').length * 999,
          proPlans: tenants.filter((t) => (t.plan || t.subscription_tier)?.toUpperCase() === 'PRO').length,
          freePlans: tenants.filter((t) => (t.plan || t.subscription_tier)?.toUpperCase() === 'FREE').length,
          topTenants: sortedTenants
        };
        
        setAnalytics(stats);
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
              <p className="text-sm text-gray-500">SaaS platform performance metrics</p>
            </div>
            <div className="flex items-center space-x-4">
              <Link 
                href="/admin" 
                className="text-gray-600 hover:text-gray-900 flex items-center"
              >
                <Building2 className="w-4 h-4 mr-2" />
                Admin Dashboard
              </Link>
              <Link 
                href="/admin/tenants" 
                className="text-gray-600 hover:text-gray-900 flex items-center"
              >
                <Users className="w-4 h-4 mr-2" />
                Tenants
              </Link>
              <button
                onClick={handleSignOut}
                className="text-gray-500 hover:text-red-600 bg-gray-100 hover:bg-red-50 p-2 rounded-lg transition-colors ml-4"
                title="Sign Out"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-500">Loading analytics...</p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-xl shadow-sm border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Monthly Revenue (Pro Plans)</p>
                    <p className="text-2xl font-bold text-gray-900">₹{analytics.monthlyRevenue.toLocaleString()}</p>
                  </div>
                  <div className="bg-purple-100 p-3 rounded-lg">
                    <CreditCard className="w-6 h-6 text-purple-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-sm border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Active Tenants</p>
                    <p className="text-2xl font-bold text-gray-900">{analytics.activeTenants}</p>
                  </div>
                  <div className="bg-blue-100 p-3 rounded-lg">
                    <Users className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-sm border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Total Platform Orders</p>
                    <p className="text-2xl font-bold text-gray-900">{analytics.totalOrders}</p>
                  </div>
                  <div className="bg-orange-100 p-3 rounded-lg">
                    <BarChart3 className="w-6 h-6 text-orange-600" />
                  </div>
                </div>
              </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Revenue Chart */}
              <div className="bg-white p-6 rounded-xl shadow-sm border">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue Overview</h3>
                <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
                  <div className="text-center">
                    <BarChart3 className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                    <p className="text-gray-500">Revenue chart visualization</p>
                    <p className="text-sm text-gray-400 mt-1">Last 6 months performance</p>
                  </div>
                </div>
              </div>

              {/* Tenant Growth Chart */}
              <div className="bg-white p-6 rounded-xl shadow-sm border">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Tenant Growth</h3>
                <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
                  <div className="text-center">
                    <TrendingUp className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                    <p className="text-gray-500">Growth chart visualization</p>
                    <p className="text-sm text-gray-400 mt-1">New tenants per month</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Plan Distribution */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-xl shadow-sm border">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Plan Distribution</h3>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-gray-700">Pro Plan</span>
                      <span className="text-sm text-gray-500">{analytics.proPlans} tenants</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-purple-600 h-2 rounded-full" 
                        style={{ width: analytics.totalTenants > 0 ? `${(analytics.proPlans / analytics.totalTenants) * 100}%` : '0%' }}
                      ></div>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      ₹{(analytics.proPlans * 999).toLocaleString()} monthly revenue
                    </p>
                  </div>
                  
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-gray-700">Free Plan</span>
                      <span className="text-sm text-gray-500">{analytics.freePlans} tenants</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full" 
                        style={{ width: analytics.totalTenants > 0 ? `${(analytics.freePlans / analytics.totalTenants) * 100}%` : '0%' }}
                      ></div>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      No monthly revenue
                    </p>
                  </div>
                </div>
              </div>

              {/* Top Performing Tenants */}
              <div className="bg-white p-6 rounded-xl shadow-sm border lg:col-span-2">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Performing Tenants</h3>
                {analytics.topTenants.length === 0 ? (
                  <p className="text-sm text-gray-500">No active tenants with orders yet.</p>
                ) : (
                  <div className="space-y-4">
                    {analytics.topTenants.map((tenant, idx) => (
                      <div key={tenant.id} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg transition-colors">
                        <div className="flex items-center">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 ${
                            idx === 0 ? 'bg-green-100 text-green-600' : 
                            idx === 1 ? 'bg-blue-100 text-blue-600' : 
                            'bg-orange-100 text-orange-600'
                          }`}>
                            <span className="font-medium text-sm">{idx + 1}</span>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{tenant.name}</p>
                            <p className="text-xs text-gray-500">{tenant.orders_this_month || 0} orders this month</p>
                          </div>
                        </div>
                        <span className="text-xs px-2 py-1 bg-gray-100 rounded-lg text-gray-600 font-medium uppercase tracking-widest">
                          {tenant.plan || 'FREE'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
