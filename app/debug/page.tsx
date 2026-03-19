"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { getCurrentTenant } from "@/lib/tenant";

export default function DebugPage() {
  const [user, setUser] = useState<any>(null);
  const [tenant, setTenant] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [allOrders, setAllOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const supabase = createClient();
        
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);
        
        // Get current tenant
        const tenantData = await getCurrentTenant(supabase);
        setTenant(tenantData);
        
        // Get user profile to check role
        const { data: profile } = await supabase
          .from('profiles')
          .select('role, tenant_id')
          .eq('id', user?.id)
          .single();
        
        console.log("User profile:", profile);
        setProfile(profile);
        
        // Get orders for this tenant
        let ordersData: any[] = [];
        if (tenantData) {
          const result = await supabase
            .from("orders")
            .select(`
              *,
              customers (*)
            `)
            .eq("tenant_id", tenantData.id);
          
          ordersData = result.data || [];
          setOrders(ordersData);
        }
        
        // Also try to get all orders (for super admin debugging)
        const { data: allOrdersData } = await supabase
          .from("orders")
          .select("id, invoice_number, tenant_id, customers(name)")
          .limit(10);
        
        setAllOrders(allOrdersData || []);
        console.log("All orders:", allOrdersData);
        console.log("User orders:", ordersData);
        
      } catch (error) {
        console.error("Debug error:", error);
      } finally {
        setLoading(false);
      }
    }
    
    fetchData();
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Debug Info</h1>
      
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-2">User:</h2>
        <pre className="bg-gray-100 p-4 rounded">
          {JSON.stringify(user, null, 2)}
        </pre>
      </div>
      
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-2">Profile:</h2>
        <pre className="bg-gray-100 p-4 rounded">
          {JSON.stringify(profile, null, 2)}
        </pre>
      </div>
      
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-2">Tenant:</h2>
        <pre className="bg-gray-100 p-4 rounded">
          {JSON.stringify(tenant, null, 2)}
        </pre>
      </div>
      
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-2">Your Orders ({orders.length}):</h2>
        <pre className="bg-gray-100 p-4 rounded">
          {JSON.stringify(orders, null, 2)}
        </pre>
      </div>
      
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-2">All Orders ({allOrders.length}):</h2>
        <pre className="bg-gray-100 p-4 rounded">
          {JSON.stringify(allOrders, null, 2)}
        </pre>
      </div>
      
      <div>
        <h2 className="text-xl font-semibold mb-2">Check Specific Order:</h2>
        <input 
          type="text" 
          placeholder="Enter order ID"
          className="border p-2 rounded mr-2"
          id="orderId"
        />
        <button 
          onClick={() => {
            const orderId = (document.getElementById('orderId') as HTMLInputElement).value;
            window.open(`/dashboard/billing/invoice/${orderId}`, '_blank');
          }}
          className="bg-blue-500 text-white px-4 py-2 rounded"
        >
          Open Invoice
        </button>
      </div>
    </div>
  );
}
