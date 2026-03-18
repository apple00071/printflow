"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentTenant, checkOrderLimit } from "@/lib/tenant";
import { calculateGST } from "@/lib/gst";

interface OrderData {
  customerName?: string;
  phone: string;
  jobType: string;
  quantity: number;
  paperType?: string;
  size?: string;
  instructions?: string;
  deliveryDate?: string;
  totalAmount: number; // For non-GST orders, this is the final total. For GST orders, this is the taxable amount.
  advancePaid: number;
  // GST Fields
  applyGST?: boolean;
  gstRate?: number;
  isInterState?: boolean;
  gstin?: string;
  hsnCode?: string;
}

export async function createOrder(data: OrderData) {
  const supabase = createClient();
  const tenant = await getCurrentTenant(supabase);
  
  if (!tenant) throw new Error("Unauthorized: Tenant context missing");

  // 0. Plan Enforcement
  const limitCheck = await checkOrderLimit(tenant);
  if (!limitCheck.allowed) {
    throw new Error(limitCheck.reason === 'limit_reached' ? "Monthly order limit reached for FREE plan." : "Subscription expired.");
  }

  // 1. Check if customer exists by phone
  const { data: customer } = await supabase
    .from("customers")
    .select("id")
    .eq("phone", data.phone)
    .eq("tenant_id", tenant.id)
    .single();

  let customerId = customer?.id;

  // 2. Auto-create customer if not found
  if (!customer) {
    const { data: newCustomer, error: newCustomerError } = await supabase
      .from("customers")
      .insert({
        name: data.customerName,
        phone: data.phone,
        tenant_id: tenant.id,
        gstin: data.gstin || null,
        is_gst_client: !!data.gstin,
      })
      .select("id")
      .single();

    if (newCustomerError) throw newCustomerError;
    customerId = newCustomer.id;
  }

  // 3. GST Calculations
  let gst_type = 'NONE';
  let cgst = 0, sgst = 0, igst = 0;
  const taxable_amount = data.totalAmount;
  let total_with_gst = data.totalAmount;

  if (data.applyGST && data.gstRate) {
    const gstResult = calculateGST(taxable_amount, data.gstRate, !!data.isInterState);
    cgst = gstResult.cgst;
    sgst = gstResult.sgst;
    igst = gstResult.igst;
    total_with_gst = gstResult.totalWithGST;
    gst_type = data.isInterState ? 'IGST' : 'CGST_SGST';
  }

  // 4. Generate Invoice Number (RPC)
  let invoice_number = null;
  if (data.applyGST) {
    const { data: invNo, error: rpcError } = await supabase.rpc('generate_invoice_number', { p_tenant_id: tenant.id });
    if (rpcError) console.error("RPC Error:", rpcError);
    invoice_number = invNo;
  }

  // 5. Create Order
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({
      customer_id: customerId,
      job_type: data.jobType,
      quantity: data.quantity,
      paper_type: data.paperType,
      size: data.size,
      instructions: data.instructions,
      delivery_date: data.deliveryDate || null,
      total_amount: total_with_gst, // Keep compatibility for non-GST systems, but use below fields for SaaS
      advance_paid: data.advancePaid,
      status: "RECEIVED",
      tenant_id: tenant.id,
      // Multi-tenant GST Fields
      gst_type,
      gst_rate: data.gstRate || 0,
      cgst,
      sgst,
      igst,
      taxable_amount,
      total_with_gst,
      invoice_number,
      invoice_date: data.applyGST ? new Date().toISOString() : null,
      is_inter_state: !!data.isInterState,
      hsn_code: data.hsnCode || null,
    })
    .select("id")
    .single();

  if (orderError) throw orderError;

  // 6. Update tenant usage counter
  await supabase.from('tenants')
    .update({ orders_this_month: (tenant.orders_this_month || 0) + 1 })
    .eq('id', tenant.id);

  // 7. Record Initial Payment if any
  if (data.advancePaid > 0) {
    await supabase.from("payments").insert({
      order_id: order.id,
      amount: data.advancePaid,
      method: "cash",
      tenant_id: tenant.id,
    });
  }

  return order;
}

export async function getOrders(filter: { status?: string; search?: string } = {}) {
  const supabase = createClient();
  const tenant = await getCurrentTenant(supabase);
  if (!tenant) throw new Error("Unauthorized");

  let query = supabase
    .from("orders")
    .select(`
      *,
      customers (*)
    `)
    .eq("tenant_id", tenant.id)
    .order("created_at", { ascending: false });

  if (filter.status && filter.status !== "ALL") {
    query = query.eq("status", filter.status);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function getOrder(id: string) {
  const supabase = createClient();
  const tenant = await getCurrentTenant(supabase);
  if (!tenant) throw new Error("Unauthorized");

  const { data, error } = await supabase
    .from("orders")
    .select(`
      *,
      customers (*)
    `)
    .eq("id", id)
    .eq("tenant_id", tenant.id)
    .single();

  if (error) throw error;
  return data;
}

export async function updateOrderStatus(orderId: string, status: string) {
  const supabase = createClient();
  const tenant = await getCurrentTenant(supabase);
  if (!tenant) throw new Error("Unauthorized");

  const { data, error } = await supabase
    .from("orders")
    .update({ status })
    .eq("id", orderId)
    .eq("tenant_id", tenant.id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateOrder(id: string, data: OrderData) {
  const supabase = createClient();
  const tenant = await getCurrentTenant(supabase);
  if (!tenant) throw new Error("Unauthorized");

  // Re-calculate GST for update
  let gst_type = 'NONE';
  let cgst = 0, sgst = 0, igst = 0;
  const taxable_amount = data.totalAmount;
  let total_with_gst = data.totalAmount;

  if (data.applyGST && data.gstRate) {
    const gstResult = calculateGST(taxable_amount, data.gstRate, !!data.isInterState);
    cgst = gstResult.cgst;
    sgst = gstResult.sgst;
    igst = gstResult.igst;
    total_with_gst = gstResult.totalWithGST;
    gst_type = data.isInterState ? 'IGST' : 'CGST_SGST';
  }

  const { error } = await supabase
    .from("orders")
    .update({
      job_type: data.jobType,
      quantity: data.quantity,
      paper_type: data.paperType,
      size: data.size,
      instructions: data.instructions,
      delivery_date: data.deliveryDate || null,
      total_amount: total_with_gst,
      advance_paid: data.advancePaid,
      // Multi-tenant GST Fields
      gst_type,
      gst_rate: data.gstRate || 0,
      cgst,
      sgst,
      igst,
      taxable_amount,
      total_with_gst,
      is_inter_state: !!data.isInterState,
      hsn_code: data.hsnCode || null,
    })
    .eq("id", id)
    .eq("tenant_id", tenant.id);

  if (error) throw error;
}
