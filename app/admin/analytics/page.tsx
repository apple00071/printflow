"use client";

import { useState, useEffect } from "react";
import { Building2, Users, TrendingUp, CreditCard, ArrowUp, ArrowDown, BarChart3, Activity } from "lucide-react";
import Link from "next/link";

interface Analytics {
  totalTenants: number;
  activeTenants: number;
  totalOrders: number;
  monthlyRevenue: number;
  proPlans: number;
  freePlans: number;
  growthRate: number;
  churnRate: number;
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
    growthRate: 0,
    churnRate: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  async function fetchAnalytics() {
    try {
      const response = await fetch('/api/admin/tenants');
      if (response.ok) {
        const tenants: Tenant[] = await response.json();
        
        const stats = {
          totalTenants: tenants.length,
          activeTenants: tenants.filter((t) => (t.plan_status || t.subscription_status) === 'ACTIVE').length,
          totalOrders: tenants.reduce((sum, t) => sum + (t.orders_this_month || 0), 0),
          monthlyRevenue: tenants.filter((t) => (t.plan || t.subscription_tier) === 'PRO').length * 999,
          proPlans: tenants.filter((t) => (t.plan || t.subscription_tier) === 'PRO').length,
          freePlans: tenants.filter((t) => (t.plan || t.subscription_tier) === 'FREE').length,
          growthRate: 15.3, // Mock data
          churnRate: 2.1, // Mock data
        };
        
        setAnalytics(stats);
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  }

  const revenueGrowth = 23.5; // Mock data
  const orderGrowth = 18.2; // Mock data

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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-xl shadow-sm border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Monthly Revenue</p>
                    <p className="text-2xl font-bold text-gray-900">₹{analytics.monthlyRevenue.toLocaleString()}</p>
                    <div className="flex items-center mt-2 text-sm">
                      <ArrowUp className="w-4 h-4 text-green-500 mr-1" />
                      <span className="text-green-500">{revenueGrowth}%</span>
                      <span className="text-gray-500 ml-1">vs last month</span>
                    </div>
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
                    <div className="flex items-center mt-2 text-sm">
                      <ArrowUp className="w-4 h-4 text-green-500 mr-1" />
                      <span className="text-green-500">{analytics.growthRate}%</span>
                      <span className="text-gray-500 ml-1">growth rate</span>
                    </div>
                  </div>
                  <div className="bg-blue-100 p-3 rounded-lg">
                    <Users className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-sm border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Total Orders</p>
                    <p className="text-2xl font-bold text-gray-900">{analytics.totalOrders}</p>
                    <div className="flex items-center mt-2 text-sm">
                      <ArrowUp className="w-4 h-4 text-green-500 mr-1" />
                      <span className="text-green-500">{orderGrowth}%</span>
                      <span className="text-gray-500 ml-1">vs last month</span>
                    </div>
                  </div>
                  <div className="bg-orange-100 p-3 rounded-lg">
                    <BarChart3 className="w-6 h-6 text-orange-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-sm border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Churn Rate</p>
                    <p className="text-2xl font-bold text-gray-900">{analytics.churnRate}%</p>
                    <div className="flex items-center mt-2 text-sm">
                      <ArrowDown className="w-4 h-4 text-green-500 mr-1" />
                      <span className="text-green-500">0.3%</span>
                      <span className="text-gray-500 ml-1">improvement</span>
                    </div>
                  </div>
                  <div className="bg-red-100 p-3 rounded-lg">
                    <Activity className="w-6 h-6 text-red-600" />
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
                        style={{ width: `${(analytics.proPlans / analytics.totalTenants) * 100}%` }}
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
                        style={{ width: `${(analytics.freePlans / analytics.totalTenants) * 100}%` }}
                      ></div>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      No monthly revenue
                    </p>
                  </div>
                </div>
              </div>

              {/* Top Performing Tenants */}
              <div className="bg-white p-6 rounded-xl shadow-sm border">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Performing</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mr-3">
                        <span className="text-green-600 font-medium text-sm">1</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">Royal Printers</p>
                        <p className="text-xs text-gray-500">234 orders</p>
                      </div>
                    </div>
                    <span className="text-sm font-medium text-gray-900">₹1,999</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                        <span className="text-blue-600 font-medium text-sm">2</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">Digital Press</p>
                        <p className="text-xs text-gray-500">189 orders</p>
                      </div>
                    </div>
                    <span className="text-sm font-medium text-gray-900">₹1,999</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center mr-3">
                        <span className="text-orange-600 font-medium text-sm">3</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">Quick Prints</p>
                        <p className="text-xs text-gray-500">156 orders</p>
                      </div>
                    </div>
                    <span className="text-sm font-medium text-gray-900">₹0</span>
                  </div>
                </div>
              </div>

              {/* Recent Activity */}
              <div className="bg-white p-6 rounded-xl shadow-sm border">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
                <div className="space-y-3">
                  <div className="flex items-start">
                    <div className="w-2 h-2 bg-green-500 rounded-full mt-2 mr-3"></div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-900">New tenant registered</p>
                      <p className="text-xs text-gray-500">Metro Graphics - 2 hours ago</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3"></div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-900">Plan upgrade</p>
                      <p className="text-xs text-gray-500">City Press upgraded to Pro - 5 hours ago</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <div className="w-2 h-2 bg-purple-500 rounded-full mt-2 mr-3"></div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-900">High order volume</p>
                      <p className="text-xs text-gray-500">Royal Printers - 50+ orders today - 6 hours ago</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
