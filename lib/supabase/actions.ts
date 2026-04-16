"use server";

import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@/lib/supabase/admin";
import { getCurrentTenant, checkOrderLimit } from "@/lib/tenant";
import { isSuperAdmin } from "@/lib/superadmin";
import { calculateGST } from "@/lib/gst";

interface OrderData {
  customerName?: string;
  phone?: string;
  jobType: string;
  quantity: string;
  paperType?: string;
  size?: string;
  printingSide?: string;
  lamination?: string;
  printingDate?: string;
  instructions?: string;
  deliveryDate?: string;
  totalAmount: number;
  advancePaid: number;
  // GST Fields
  applyGST?: boolean;
  gstRate?: number;
  isInterState?: boolean;
  gstin?: string;
  hsnCode?: string;
  file_url?: string;
  quotation_id?: string;
  tenantId?: string;
  inventory_id?: string;
  material_units_per_order?: number;
}

interface CustomerData {
  name: string;
  phone: string | null;
  tenant_id?: string;
}

interface OrderInsertData {
  customer_id: string;
  job_type: string;
  quantity: string;
  paper_type?: string;
  size?: string;
  printing_side?: string;
  lamination?: string;
  printing_date?: string | null;
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
  proof_image_url?: string | null;
  proof_status?: string;
  proof_feedback?: string | null;
  proofing_token?: string;
  inventory_id?: string | null;
  material_units_per_order?: number;
  friendly_id?: string | null;
}

export interface Order extends OrderInsertData {
  id: string;
  status: string;
  created_at: string;
  updated_at: string;
  friendly_id?: string;
  actual_delivery_date?: string | null;
  challan_number?: string | null;
  challan_date?: string | null;
  inventory_id?: string | null;
  material_units_per_order?: number;
  total_material_deducted?: number;
  customers?: {
    id: string;
    name: string;
    phone: string | null;
    gstin?: string | null;
  };
  tenants?: {
    name: string;
    city: string | null;
  };
}

interface PaymentData {
  order_id: string;
  amount: number;
  method: string;
  tenant_id?: string;
}

export interface QuotationData {
  customer_id?: string;
  customerName?: string;
  phone?: string | null;
  jobType: string;
  quantity: string;
  paperType?: string;
  size?: string;
  printingSide?: string;
  lamination?: string;
  printingDate?: string;
  instructions?: string;
  taxableAmount: number;
  totalWithGST: number;
  gstType: string;
  gstRate: number;
  cgst: number;
  sgst: number;
  igst: number;
  validUntil?: string;
  status?: string;
}

export async function createOrder(data: OrderData) {
  const supabase = createClient();
  const superAdmin = await isSuperAdmin(supabase);
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let tenant: any;
  if (superAdmin) {
    // Super admin can create orders directly (optionally for a tenant if tenantId is provided)
    if (data.tenantId) {
      const { data: tenantData } = await supabase.from('tenants').select('*').eq('id', data.tenantId).single();
      tenant = tenantData;
    } else {
      tenant = null;
    }
  } else {
    // If not super admin, we either have a session tenant or we are a public user for a specific tenant
    tenant = await getCurrentTenant(supabase);
    
    // If no session tenant, check if tenantId was passed (Public Page scenario)
    if (!tenant && data.tenantId) {
      const { data: tenantData } = await supabase.from('tenants').select('*').eq('id', data.tenantId).single();
      tenant = tenantData;
    }

    if (!tenant) throw new Error("Unauthorized: Tenant context missing");
  }

  // 0. Plan Enforcement (skip for super admin)
  if (!superAdmin) {
    const limitCheck = await checkOrderLimit(tenant);
    if (!limitCheck.allowed) {
      throw new Error(limitCheck.reason === 'limit_reached' ? "Monthly order limit reached for FREE plan." : "Subscription expired.");
    }
  }

  // 1. Check if customer exists by phone (if provided and not empty)
  let customerId = null;
  
  if (data.phone && data.phone.trim() !== "") {
    let customerQuery = supabase
      .from("customers")
      .select("id")
      .eq("phone", data.phone);
    
    if (!superAdmin && tenant?.id) {
      customerQuery = customerQuery.eq("tenant_id", tenant.id);
    }
    
    const { data: customer } = await customerQuery.maybeSingle();
    customerId = customer?.id;
  }

  // 2. Auto-create customer if not found
  if (!customerId) {
    const customerData: CustomerData = {
      name: data.customerName || data.phone || "Unknown",
      phone: data.phone && data.phone.trim() !== "" ? data.phone : null,
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

  // 4b. Generate Friendly Order ID
  let friendly_id = null;
  if (!superAdmin && tenant) {
    const { data: generatedId, error: rpcError } = await supabase.rpc('generate_simple_order_id', {
      p_tenant_id: tenant.id,
      p_prefix: tenant.id_prefix || 'ORD'
    });
    
    if (rpcError) {
      console.error('Error generating friendly ID:', rpcError);
      // Fallback or throw a more descriptive error
      throw new Error(`Failed to generate Order ID: ${rpcError.message}. Please ensure the database migrations have been applied.`);
    }
    friendly_id = generatedId;
  }

  // 5. Create Order
  const orderData: OrderInsertData = {
    customer_id: customerId,
    job_type: data.jobType,
    quantity: data.quantity,
    paper_type: data.paperType,
    size: data.size,
    printing_side: data.printingSide,
    lamination: data.lamination,
    printing_date: data.printingDate ? new Date(data.printingDate).toISOString() : null,
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
    inventory_id: data.inventory_id || null,
    material_units_per_order: data.material_units_per_order || 1,
    friendly_id: friendly_id,
  };
  
  // Only add tenant_id if not super admin
  if (!superAdmin) {
    orderData.tenant_id = tenant.id;
  }

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert(orderData)
    .select("id, friendly_id")
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

export async function getOrder(id: string): Promise<Order> {
  const supabase = createClient();
  const superAdmin = await isSuperAdmin(supabase);
  
  let query = supabase
    .from("orders")
    .select(`
      *,
      customers (*),
      tenants (name, city)
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

export async function updateOrderStatus(orderId: string, status: string, actualDeliveryDate?: string) {
  const supabase = createClient();
  const superAdmin = await isSuperAdmin(supabase);
  
  const updateData: { status: string; actual_delivery_date?: string | null } = { status };
  if (actualDeliveryDate) {
    updateData.actual_delivery_date = actualDeliveryDate;
  } else if (status !== "DELIVERED") {
    // If we move away from DELIVERED, clear the actual_delivery_date
    updateData.actual_delivery_date = null;
  }

  let query = supabase
    .from("orders")
    .update(updateData)
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

export async function assignChallanNumber(orderId: string) {
  const supabase = createClient();
  const tenant = await getCurrentTenant(supabase);
  if (!tenant) throw new Error("Unauthorized");

  const { data: challanNumber, error: rpcError } = await supabase.rpc('generate_document_number', {
    p_tenant_id: tenant.id,
    p_prefix: 'DC'
  });

  if (rpcError) throw rpcError;

  const { data, error: updateError } = await supabase
    .from("orders")
    .update({ 
      challan_number: challanNumber,
      challan_date: new Date().toISOString()
    })
    .eq("id", orderId)
    .eq("tenant_id", tenant.id)
    .select(`
      *,
      customers (*),
      tenants (name, city)
    `)
    .single();

  if (updateError) throw updateError;
  return data;
}

export async function createQuotation(data: QuotationData) {
  const supabase = createClient();
  const tenant = await getCurrentTenant(supabase);
  if (!tenant) throw new Error("Unauthorized");

  // 1. Get/Create Customer
  let customerId = data.customer_id;
  if (!customerId) {
    const { data: customer } = await supabase
      .from("customers")
      .select("id")
      .eq("phone", data.phone || "")
      .eq("tenant_id", tenant.id)
      .maybeSingle();

    if (customer) {
      customerId = customer.id;
    } else {
      const { data: newCustomer, error: custError } = await supabase
        .from("customers")
        .insert({
          name: data.customerName || data.phone || "Guest",
          phone: data.phone && data.phone.trim() !== "" ? data.phone : null,
          tenant_id: tenant.id
        })
        .select("id")
        .single();
      if (custError) throw custError;
      customerId = newCustomer.id;
    }
  }

  // 2. Generate Quotation Number
  const { data: qtnNumber } = await supabase.rpc('generate_document_number', {
    p_tenant_id: tenant.id,
    p_prefix: 'QTN'
  });

  // 3. Insert Quotation
  const { data: quotation, error } = await supabase
    .from("quotations")
    .insert({
      tenant_id: tenant.id,
      customer_id: customerId,
      job_type: data.jobType,
      quantity: data.quantity,
      paper_type: data.paperType,
      size: data.size,
      printing_side: data.printingSide,
      lamination: data.lamination,
      printing_date: data.printingDate ? new Date(data.printingDate).toISOString() : null,
      instructions: data.instructions,
      taxable_amount: data.taxableAmount,
      total_with_gst: data.totalWithGST,
      gst_type: data.gstType,
      gst_rate: data.gstRate,
      cgst: data.cgst,
      sgst: data.sgst,
      igst: data.igst,
      quotation_number: qtnNumber,
      status: data.status || 'DRAFT',
      valid_until: data.validUntil || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    })
    .select()
    .single();

  if (error) throw error;
  return quotation;
}

export async function getQuotations() {
  const supabase = createClient();
  const tenant = await getCurrentTenant(supabase);
  if (!tenant) throw new Error("Unauthorized");

  const { data, error } = await supabase
    .from("quotations")
    .select(`
      *,
      customers (*)
    `)
    .eq("tenant_id", tenant.id)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
}

export async function getQuotation(id: string) {
  const supabase = createClient();
  const tenant = await getCurrentTenant(supabase);
  if (!tenant) throw new Error("Unauthorized");

  const { data, error } = await supabase
    .from("quotations")
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

export async function updateQuotationStatus(id: string, status: string) {
  const supabase = createClient();
  const tenant = await getCurrentTenant(supabase);
  if (!tenant) throw new Error("Unauthorized");

  const { data, error } = await supabase
    .from("quotations")
    .update({ status })
    .eq("id", id)
    .eq("tenant_id", tenant.id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateOrder(id: string, data: OrderData) {
  const supabase = createClient();
  const superAdmin = await isSuperAdmin(supabase);
  
  // Get tenant context
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let tenant: any;
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
      printing_side: data.printingSide,
      lamination: data.lamination,
      printing_date: data.printingDate ? new Date(data.printingDate).toISOString() : null,
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

export async function getInvitation(email: string) {
  const adminSupabase = createAdminClient();
  
  const { data, error } = await adminSupabase
    .from("team_invitations")
    .select("*, tenants(name)")
    .ilike("email", email)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Error fetching invitation:", error);
    return { error: error.message };
  }
  
  return { data };
}

export async function acceptInvitation(email: string, userId: string, name: string) {
  const adminSupabase = createAdminClient();

  // 1. Get invitation
  const { data: invite, error: inviteError } = await adminSupabase
    .from("team_invitations")
    .select("*")
    .ilike("email", email)
    .eq("status", "PENDING")
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();

  if (inviteError || !invite) {
    return { error: "No valid invitation found" };
  }

  // 2. Create Profile
  const { error: profileError } = await adminSupabase
    .from("profiles")
    .upsert({
      id: userId,
      username: email.split("@")[0].toLowerCase(),
      name: name,
      role: invite.role,
      tenant_id: invite.tenant_id,
      status: 'ACTIVE'
    });

  if (profileError) {
    console.error("Error creating profile:", profileError);
    return { error: profileError.message };
  }

  // 3. Mark invitation as ACCEPTED
  const { error: updateError } = await adminSupabase
    .from("team_invitations")
    .update({ 
      status: "ACCEPTED",
      accepted_at: new Date().toISOString()
    })
    .eq("id", invite.id);

  if (updateError) {
    console.error("Error updating invitation:", updateError);
  }

  return { success: true };
}

export async function updateOrderProof(orderId: string, data: { proof_image_url?: string, proof_status?: string }) {
  const supabase = createClient();
  const tenant = await getCurrentTenant(supabase);
  if (!tenant) throw new Error("Unauthorized");

  const { data: updatedOrder, error } = await supabase
    .from("orders")
    .update(data)
    .eq("id", orderId)
    .eq("tenant_id", tenant.id)
    .select()
    .single();

  if (error) throw error;
  return updatedOrder;
}

export async function updateTenantDetails(data: { name?: string, city?: string, phone?: string, gst_number?: string, logo_url?: string, id_prefix?: string }) {
  const supabase = createClient();
  const tenant = await getCurrentTenant(supabase);
  if (!tenant) throw new Error("Unauthorized");

  const { data: updatedTenant, error } = await supabase
    .from("tenants")
    .update(data)
    .eq("id", tenant.id)
    .select()
    .single();

  if (error) throw error;
  return updatedTenant;
}

export async function markOnboardingComplete() {
  const supabase = createClient();
  const tenant = await getCurrentTenant(supabase);
  if (!tenant) throw new Error("Unauthorized");

  const { error } = await supabase
    .from("tenants")
    .update({ onboarding_complete: true })
    .eq("id", tenant.id);

  if (error) throw error;
  return { success: true };
}
