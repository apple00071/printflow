"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentTenant, checkOrderLimit } from "@/lib/tenant";
import { isSuperAdmin } from "@/lib/superadmin";
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
  file_url?: string;
}

interface CustomerData {
  name: string;
  phone: string;
  tenant_id?: string;
}

interface OrderInsertData {
  customer_id: string;
  job_type: string;
  quantity: number;
  paper_type?: string;
  size?: string;
  instructions?: string;
  delivery_date?: string | null;
  total_amount: number;
  advance_paid: number;
  gst_type: string;
  gst_rate: number;
  cgst: number;
  sgst: number;
  igst: number;
  taxable_amount: number;
  total_with_gst: number;
  invoice_number?: string | null;
  invoice_date?: string | null;
  is_inter_state: boolean;
  hsn_code?: string | null;
  file_url?: string | null;
  tenant_id?: string;
}

interface PaymentData {
  order_id: string;
  amount: number;
  method: string;
  tenant_id?: string;
}

export async function createOrder(data: OrderData) {
  const supabase = createClient();
  const superAdmin = await isSuperAdmin(supabase);
  
  // For super admin, create orders without tenant restriction
  // For regular users, require tenant context
  let tenant;
  if (superAdmin) {
    // Super admin can create orders without tenant context
    // Use a default/system tenant or null
    tenant = null;
  } else {
    tenant = await getCurrentTenant(supabase);
    if (!tenant) throw new Error("Unauthorized: Tenant context missing");
  }

  // 0. Plan Enforcement (skip for super admin)
  if (!superAdmin) {
    const limitCheck = await checkOrderLimit(tenant);
    if (!limitCheck.allowed) {
      throw new Error(limitCheck.reason === 'limit_reached' ? "Monthly order limit reached for FREE plan." : "Subscription expired.");
    }
  }

  // 1. Check if customer exists by phone
  let customerQuery = supabase
    .from("customers")
    .select("id")
    .eq("phone", data.phone);
  
  // Only filter by tenant_id if not super admin
  if (!superAdmin) {
    customerQuery = customerQuery.eq("tenant_id", tenant.id);
  }
  
  const { data: customer } = await customerQuery.single();

  let customerId = customer?.id;

  // 2. Auto-create customer if not found
  if (!customer) {
    const customerData: CustomerData = {
      name: data.customerName || data.phone,
      phone: data.phone,
    };
    
    // Only add tenant_id if not super admin
    if (!superAdmin) {
      customerData.tenant_id = tenant.id;
    }

    const { data: newCustomer, error: newCustomerError } = await supabase
      .from("customers")
      .insert(customerData)
      .select("id")
      .single();

    if (newCustomerError) throw newCustomerError;
    customerId = newCustomer.id;
  }

  // 3. Calculate GST if applicable
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

  // 4. Generate invoice number if GST applied
  let invoice_number = null;
  if (data.applyGST && !superAdmin) {
    // Only generate invoice numbers for tenant users, not super admin
    const { data: invoiceData } = await supabase.rpc('generate_invoice_number', {
      p_tenant_id: tenant.id
    });
    invoice_number = invoiceData;
  }

  // 5. Create Order
  const orderData: OrderInsertData = {
    customer_id: customerId,
    job_type: data.jobType,
    quantity: data.quantity,
    paper_type: data.paperType,
    size: data.size,
    instructions: data.instructions,
    delivery_date: data.deliveryDate ? new Date(data.deliveryDate).toISOString() : null,
    total_amount: data.totalAmount,
    advance_paid: data.advancePaid,
    // GST Fields
    gst_type,
    gst_rate: data.applyGST ? (data.gstRate || 0) : 0,
    cgst,
    sgst,
    igst,
    taxable_amount,
    total_with_gst,
    invoice_number,
    invoice_date: data.applyGST && !superAdmin ? new Date().toISOString() : null,
    is_inter_state: !!data.isInterState,
    hsn_code: data.hsnCode || null,
    file_url: data.file_url || null,
  };
  
  // Only add tenant_id if not super admin
  if (!superAdmin) {
    orderData.tenant_id = tenant.id;
  }

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert(orderData)
    .select("id")
    .single();

  if (orderError) throw orderError;

  // 6. Update tenant usage counter (skip for super admin)
  if (!superAdmin) {
    await supabase.from('tenants')
      .update({ orders_this_month: (tenant.orders_this_month || 0) + 1 })
      .eq('id', tenant.id);
  }

  // 7. Record Initial Payment if any
  if (data.advancePaid > 0) {
    const paymentData: PaymentData = {
      order_id: order.id,
      amount: data.advancePaid,
      method: "cash",
    };
    
    // Only add tenant_id if not super admin
    if (!superAdmin) {
      paymentData.tenant_id = tenant.id;
    }
    
    await supabase.from("payments").insert(paymentData);
  }

  return order;
}

export async function getOrders(filter: { status?: string; search?: string } = {}) {
  const supabase = createClient();
  const superAdmin = await isSuperAdmin(supabase);
  
  let query = supabase
    .from("orders")
    .select(`
      *,
      customers (*)
    `);

  // If not super admin, filter by tenant
  if (!superAdmin) {
    const tenant = await getCurrentTenant(supabase);
    if (!tenant) throw new Error("Unauthorized");
    query = query.eq("tenant_id", tenant.id);
  } else {
    // For super admin, show orders without tenant restriction
    // This will show all orders including those with null tenant_id
  }

  query = query.order("created_at", { ascending: false });

  if (filter.status && filter.status !== "ALL") {
    query = query.eq("status", filter.status);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function getOrder(id: string) {
  const supabase = createClient();
  const superAdmin = await isSuperAdmin(supabase);
  
  let query = supabase
    .from("orders")
    .select(`
      *,
      customers (*)
    `)
    .eq("id", id);

  // If not super admin, ensure tenant access
  if (!superAdmin) {
    const tenant = await getCurrentTenant(supabase);
    if (!tenant) throw new Error("Unauthorized");
    query = query.eq("tenant_id", tenant.id);
  }

  const { data, error } = await query.single();
  if (error) throw error;
  return data;
}

export async function updateOrderStatus(orderId: string, status: string) {
  const supabase = createClient();
  const superAdmin = await isSuperAdmin(supabase);
  
  let query = supabase
    .from("orders")
    .update({ status })
    .eq("id", orderId);

  // If not super admin, ensure tenant access
  if (!superAdmin) {
    const tenant = await getCurrentTenant(supabase);
    if (!tenant) throw new Error("Unauthorized");
    query = query.eq("tenant_id", tenant.id);
  }

  const { data, error } = await query.select().single();
  if (error) throw error;
  return data;
}

export async function updateOrder(id: string, data: OrderData) {
  const supabase = createClient();
  const superAdmin = await isSuperAdmin(supabase);
  
  // Get tenant context
  let tenant;
  if (superAdmin) {
    // For updates, super admin also needs tenant context
    const { data: existingOrder } = await supabase
      .from("orders")
      .select("tenant_id")
      .eq("id", id)
      .single();
    
    if (!existingOrder) throw new Error("Order not found");
    
    // Get tenant details
    const { data: tenantData } = await supabase
      .from("tenants")
      .select("*")
      .eq("id", existingOrder.tenant_id)
      .single();
    
    tenant = tenantData;
  } else {
    tenant = await getCurrentTenant(supabase);
    if (!tenant) throw new Error("Unauthorized");
  }

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

  const { data: order, error } = await supabase
    .from("orders")
    .update({
      job_type: data.jobType,
      quantity: data.quantity,
      paper_type: data.paperType,
      size: data.size,
      instructions: data.instructions,
      delivery_date: data.deliveryDate ? new Date(data.deliveryDate).toISOString() : null,
      total_amount: data.totalAmount,
      advance_paid: data.advancePaid,
      // GST Fields
      gst_type,
      gst_rate: data.applyGST ? data.gstRate : 0,
      cgst,
      sgst,
      igst,
      taxable_amount,
      total_with_gst,
      is_inter_state: !!data.isInterState,
      hsn_code: data.hsnCode || null,
      file_url: data.file_url || null,
    })
    .eq("id", id)
    .eq("tenant_id", tenant.id)
    .select()
    .single();

  if (error) throw error;
  return order;
}

export async function addPayment(orderId: string, amount: number, method: string) {
  const supabase = createClient();
  const superAdmin = await isSuperAdmin(supabase);
  
  // 1. Get current order to find tenant_id and current advance_paid
  let orderQuery = supabase
    .from("orders")
    .select("tenant_id, advance_paid")
    .eq("id", orderId);
    
  if (!superAdmin) {
    const tenant = await getCurrentTenant(supabase);
    if (!tenant) throw new Error("Unauthorized");
    orderQuery = orderQuery.eq("tenant_id", tenant.id);
  }
  
  const { data: order, error: orderError } = await orderQuery.single();
  if (orderError || !order) throw new Error("Order not found");
  
  // 2. Insert payment record
  const paymentData: PaymentData = {
    order_id: orderId,
    amount: amount,
    method: method,
  };
  
  if (!superAdmin && order.tenant_id) {
    paymentData.tenant_id = order.tenant_id;
  }
  
  const { error: paymentError } = await supabase
    .from("payments")
    .insert(paymentData);
    
  if (paymentError) throw paymentError;
  
  // 3. Update order advance_paid
  const { error: updateError } = await supabase
    .from("orders")
    .update({ 
      advance_paid: (order.advance_paid || 0) + amount 
    })
    .eq("id", orderId);
    
  if (updateError) throw updateError;
  
  return { success: true };
}
