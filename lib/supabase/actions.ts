"use server";

import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@/lib/supabase/admin";
import { getCurrentTenant } from "@/lib/tenant";
import { isSuperAdmin } from "@/lib/superadmin";
import { calculateGST } from "@/lib/gst";
import { sendWhatsAppMessage, formatStatusMessage } from "@/lib/whatsapp";

interface OrderData {
  customerName?: string;
  phone?: string;
  email?: string;
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
  gmail_message_id?: string;
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
  gmail_message_id?: string | null;
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
    email?: string | null;
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
  const client = superAdmin ? createAdminClient() : supabase;
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let tenant: any;
  if (superAdmin) {
    if (data.tenantId) {
      const { data: tenantData } = await client.from('tenants').select('*').eq('id', data.tenantId).single();
      tenant = tenantData;
    } else {
      tenant = await getCurrentTenant(supabase);
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
  // Unlimited orders model: no hard limit check required here.


  // 1. Check if customer exists by phone (if provided and not empty)
  let customerId = null;
  
  if (data.phone && data.phone.trim() !== "") {
    let customerQuery = client
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
      name: data.customerName || data.phone || data.email || "Unknown",
      phone: data.phone && data.phone.trim() !== "" ? data.phone : null,
    };
    
    if (tenant?.id) {
      customerData.tenant_id = tenant.id;
    }

    const { data: newCustomer, error: newCustomerError } = await client
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
  if (data.applyGST && tenant) {
    const { data: invoiceData } = await client.rpc('generate_invoice_number', {
      p_tenant_id: tenant.id
    });
    invoice_number = invoiceData;
  }

  // 4b. Generate Friendly Order ID
  let friendly_id = null;
  if (tenant) {
    const { data: generatedId, error: rpcError } = await client.rpc('generate_simple_order_id', {
      p_tenant_id: tenant.id,
      p_prefix: tenant.id_prefix || 'ORD'
    });
    
    if (rpcError) {
      console.error('Error generating friendly ID:', rpcError);
    } else {
      friendly_id = generatedId;
    }
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
    gmail_message_id: data.gmail_message_id || null,
  };
  
  if (tenant?.id) {
    orderData.tenant_id = tenant.id;
  }

  const { data: order, error: orderError } = await client
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

  // 8. Send WhatsApp Notification (Async - don't block return)
  if (data.phone) {
    const message = formatStatusMessage(
      "RECEIVED",
      data.customerName || "Customer",
      data.jobType,
      order.friendly_id || order.id,
      tenant?.name || "PrintFlow",
      0 // No balance in RECEIVED message per requirements
    );
    
    // We fire and forget here to keep the UI snappy
    sendWhatsAppMessage({ phone: data.phone, message }).catch(err => 
      console.error("Async WhatsApp error:", err)
    );
  }

  return order;
}

export async function getOrders(filter: { status?: string; search?: string } = {}) {
  const supabase = createClient();
  const superAdmin = await isSuperAdmin(supabase);
  const client = superAdmin ? createAdminClient() : supabase;
  
  let query = client
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
  }

  query = query.order("created_at", { ascending: false });

  if (filter.status && filter.status !== "ALL") {
    query = query.eq("status", filter.status);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function getCustomers() {
  const supabase = createClient();
  const superAdmin = await isSuperAdmin(supabase);
  const tenant = await getCurrentTenant(supabase);
  if (!tenant && !superAdmin) return [];

  const client = superAdmin ? createAdminClient() : supabase;
  let q = client
    .from("customers")
    .select(`
      *,
      orders (
        total_amount,
        advance_paid,
        total_with_gst
      )
    `);

  if (!superAdmin && tenant?.id) {
    q = q.eq("tenant_id", tenant.id);
  }

  const { data, error } = await q;
  if (error) {
    console.error("Error fetching customers:", error);
    return [];
  }
  return data || [];
}

export async function getCustomerDetails(id: string) {
  const supabase = createClient();
  const superAdmin = await isSuperAdmin(supabase);
  const tenant = await getCurrentTenant(supabase);
  if (!tenant && !superAdmin) return null;

  const client = superAdmin ? createAdminClient() : supabase;
  
  let custQuery = client.from("customers").select("*").eq("id", id);
  if (!superAdmin && tenant?.id) {
    custQuery = custQuery.eq("tenant_id", tenant.id);
  }
  const { data: customer, error: custErr } = await custQuery.single();
  if (custErr || !customer) return null;

  let ordsQuery = client.from("orders").select("*").eq("customer_id", id).order("created_at", { ascending: false });
  if (!superAdmin && tenant?.id) {
    ordsQuery = ordsQuery.eq("tenant_id", tenant.id);
  }
  const { data: orders } = await ordsQuery;

  return {
    customer,
    orders: orders || []
  };
}

export async function getOrder(id: string): Promise<Order> {
  const supabase = createClient();
  const superAdmin = await isSuperAdmin(supabase);
  const client = superAdmin ? createAdminClient() : supabase;
  
  let query = client
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

  const client = superAdmin ? createAdminClient() : supabase;
  let query = client
    .from("orders")
    .update(updateData)
    .eq("id", orderId);

  // If not super admin, ensure tenant access
  if (!superAdmin) {
    const tenant = await getCurrentTenant(supabase);
    if (!tenant) throw new Error("Unauthorized");
    query = query.eq("tenant_id", tenant.id);
  }

  const { data, error } = await query.select(`
    *,
    customers (*),
    tenants (name, city)
  `).single();

  if (error) throw error;

  // Send WhatsApp Notification for Status Change
  if (data && data.customers?.phone) {
    const balance = Number(data.total_with_gst || data.total_amount) - Number(data.advance_paid);
    
    let totalBalance = undefined;
    if (status.toUpperCase() === "DELIVERED" && data.customer_id) {
      try {
        const adminSupabase = createAdminClient();
        const { data: customerOrders } = await adminSupabase
          .from("orders")
          .select("total_with_gst, total_amount, advance_paid")
          .eq("customer_id", data.customer_id);

        if (customerOrders && customerOrders.length > 0) {
          totalBalance = customerOrders.reduce((acc: number, o: { total_with_gst?: number | null, total_amount?: number | null, advance_paid?: number | null }) => {
            const t = Number(o.total_with_gst || o.total_amount || 0);
            const p = Number(o.advance_paid || 0);
            return acc + (t - p);
          }, 0);
        }
      } catch (e) {
        console.error("Error calculating total outstanding balance:", e);
      }
    }

    const message = formatStatusMessage(
      status,
      data.customers?.name || "Customer",
      data.job_type,
      data.friendly_id || data.id,
      data.tenants?.name || "PrintFlow",
      balance,
      undefined,
      totalBalance
    );


    if (message) {
      // Fire and forget
      sendWhatsAppMessage({ phone: data.customers.phone, message }).catch(err => 
      console.error("Async WhatsApp error during status update:", err)
      );
    }
  }

  return data;
}

export async function assignChallanNumber(orderId: string) {
  const supabase = createClient();
  const superAdmin = await isSuperAdmin(supabase);
  const tenant = await getCurrentTenant(supabase);
  if (!tenant && !superAdmin) throw new Error("Unauthorized");

  const client = superAdmin ? createAdminClient() : supabase;
  let tenantId = tenant?.id;
  if (!tenantId) {
    const { data: ord } = await client.from("orders").select("tenant_id").eq("id", orderId).single();
    tenantId = ord?.tenant_id;
  }
  if (!tenantId) throw new Error("Tenant not found");

  const { data: challanNumber, error: rpcError } = await client.rpc('generate_document_number', {
    p_tenant_id: tenantId,
    p_prefix: 'DC'
  });

  if (rpcError) throw rpcError;

  let query = client
    .from("orders")
    .update({ 
      challan_number: challanNumber,
      challan_date: new Date().toISOString()
    })
    .eq("id", orderId);

  if (!superAdmin) {
    query = query.eq("tenant_id", tenantId);
  }

  const { data, error: updateError } = await query
    .select(`
      *,
      customers (*),
      tenants (name, city)
    `)
    .single();

  if (updateError) throw updateError;
  return data;
}

export async function assignInvoiceNumber(orderId: string) {
  const supabase = createClient();
  const superAdmin = await isSuperAdmin(supabase);
  const tenant = await getCurrentTenant(supabase);
  if (!tenant && !superAdmin) throw new Error("Unauthorized");

  const client = superAdmin ? createAdminClient() : supabase;
  let tenantId = tenant?.id;
  if (!tenantId) {
    const { data: ord } = await client.from("orders").select("tenant_id").eq("id", orderId).single();
    tenantId = ord?.tenant_id;
  }
  if (!tenantId) throw new Error("Tenant not found");

  const { data: invoiceNumber, error: rpcError } = await client.rpc('generate_invoice_number', {
    p_tenant_id: tenantId
  });

  if (rpcError) throw rpcError;

  let query = client
    .from("orders")
    .update({ 
      invoice_number: invoiceNumber 
    })
    .eq("id", orderId);

  if (!superAdmin) {
    query = query.eq("tenant_id", tenantId);
  }

  const { data, error: updateError } = await query
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
  const superAdmin = await isSuperAdmin(supabase);
  const tenant = await getCurrentTenant(supabase);
  if (!tenant && !superAdmin) throw new Error("Unauthorized");

  const client = superAdmin ? createAdminClient() : supabase;
  const tenantId = tenant?.id;
  if (!tenantId) throw new Error("Active shop/tenant not found");

  // 1. Get/Create Customer
  let customerId = data.customer_id;
  if (!customerId) {
    const { data: customer } = await client
      .from("customers")
      .select("id")
      .eq("phone", data.phone || "")
      .eq("tenant_id", tenantId)
      .maybeSingle();

    if (customer) {
      customerId = customer.id;
    } else {
      const { data: newCustomer, error: custError } = await client
        .from("customers")
        .insert({
          name: data.customerName || data.phone || "Guest",
          phone: data.phone && data.phone.trim() !== "" ? data.phone : null,
          tenant_id: tenantId
        })
        .select("id")
        .single();
      if (custError) throw custError;
      customerId = newCustomer.id;
    }
  }

  // 2. Generate Quotation Number
  const { data: qtnNumber } = await client.rpc('generate_document_number', {
    p_tenant_id: tenantId,
    p_prefix: 'QTN'
  });

  // 3. Insert Quotation
  const { data: quotation, error } = await client
    .from("quotations")
    .insert({
      tenant_id: tenantId,
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
  const superAdmin = await isSuperAdmin(supabase);
  const tenant = await getCurrentTenant(supabase);
  if (!tenant && !superAdmin) throw new Error("Unauthorized");

  const client = superAdmin ? createAdminClient() : supabase;
  let q = client
    .from("quotations")
    .select(`
      *,
      customers (*)
    `);

  if (!superAdmin && tenant?.id) {
    q = q.eq("tenant_id", tenant.id);
  }

  const { data, error } = await q.order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function getQuotation(id: string) {
  const supabase = createClient();
  const superAdmin = await isSuperAdmin(supabase);
  const tenant = await getCurrentTenant(supabase);
  if (!tenant && !superAdmin) throw new Error("Unauthorized");

  const client = superAdmin ? createAdminClient() : supabase;
  let q = client
    .from("quotations")
    .select(`
      *,
      customers (*),
      tenants (name, city, phone, gst_number, logo_url)
    `)
    .eq("id", id);

  if (!superAdmin && tenant?.id) {
    q = q.eq("tenant_id", tenant.id);
  }

  const { data, error } = await q.single();
  if (error) throw error;
  return data;
}

export async function updateQuotationStatus(id: string, status: string) {
  const supabase = createClient();
  const superAdmin = await isSuperAdmin(supabase);
  const tenant = await getCurrentTenant(supabase);
  if (!tenant && !superAdmin) throw new Error("Unauthorized");

  const client = superAdmin ? createAdminClient() : supabase;
  let q = client
    .from("quotations")
    .update({ status })
    .eq("id", id);

  if (!superAdmin && tenant?.id) {
    q = q.eq("tenant_id", tenant.id);
  }

  const { data, error } = await q.select().single();
  if (error) throw error;
  return data;
}

export async function updateOrder(id: string, data: OrderData) {
  const supabase = createClient();
  const superAdmin = await isSuperAdmin(supabase);
  const client = superAdmin ? createAdminClient() : supabase;
  
  // Get tenant context
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let tenant: any;
  if (superAdmin) {
    // For updates, super admin also needs tenant context
    const { data: existingOrder } = await client
      .from("orders")
      .select("tenant_id")
      .eq("id", id)
      .single();
    
    if (!existingOrder) throw new Error("Order not found");
    
    // Get tenant details
    const { data: tenantData } = await client
      .from("tenants")
      .select("*")
      .eq("id", existingOrder.tenant_id)
      .single();
    
    tenant = tenantData;
  } else {
    tenant = await getCurrentTenant(supabase);
    if (!tenant) throw new Error("Unauthorized");
  }

  // 1. Handle Customer Update/Re-link
  let customerId = null;
  const { data: currentOrder } = await client
    .from("orders")
    .select("customer_id")
    .eq("id", id)
    .single();
  
  if (currentOrder?.customer_id) {
    customerId = currentOrder.customer_id;
    
    // If phone is provided, check if it belongs to someone else
    if (data.phone && data.phone.trim() !== "") {
      let customerQuery = client
        .from("customers")
        .select("id")
        .eq("phone", data.phone);
      
      if (!superAdmin && tenant?.id) {
        customerQuery = customerQuery.eq("tenant_id", tenant.id);
      }
      
      const { data: existingCustomer } = await customerQuery.maybeSingle();
      
      if (existingCustomer && existingCustomer.id !== customerId) {
        // Phone belongs to another customer, re-link this order to that customer
        customerId = existingCustomer.id;
      } else {
        // Phone is same or doesn't exist, update current customer record
        await client
          .from("customers")
          .update({
            name: data.customerName,
            phone: data.phone.trim() !== "" ? data.phone : null
          })
          .eq("id", customerId);
      }
    } else {
      // No phone provided, just update name
      await client
        .from("customers")
        .update({
          name: data.customerName,
          phone: null
        })
        .eq("id", customerId);
    }
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

  const { data: order, error } = await client
    .from("orders")
    .update({
      customer_id: customerId, // Update the customer link if it changed
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

export async function searchCustomers(query: string) {
  const supabase = createClient();
  const superAdmin = await isSuperAdmin(supabase);
  const tenant = await getCurrentTenant(supabase);
  if (!tenant && !superAdmin) throw new Error("Unauthorized");

  const client = superAdmin ? createAdminClient() : supabase;
  let q = client
    .from("customers")
    .select("id, name, phone, gstin");

  if (tenant?.id) {
    q = q.eq("tenant_id", tenant.id);
  }

  const { data, error } = await q
    .or(`name.ilike.%${query}%,phone.ilike.%${query}%`)
    .limit(5);

  if (error) {
    console.error("searchCustomers error:", error);
    return [];
  }
  return data || [];
}


export async function addPayment(orderId: string, amount: number, method: string) {
  const supabase = createClient();
  const superAdmin = await isSuperAdmin(supabase);
  const client = superAdmin ? createAdminClient() : supabase;
  
  // 1. Get current order to find tenant_id and current advance_paid
  let orderQuery = client
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
    tenant_id: order.tenant_id
  };
  
  const { error: paymentError } = await client
    .from("payments")
    .insert(paymentData);
    
  if (paymentError) throw paymentError;
  
  // 3. Update order advance_paid
  const { error: updateError } = await client
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
      phone: invite.phone || null,
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
  const superAdmin = await isSuperAdmin(supabase);
  const tenant = await getCurrentTenant(supabase);
  if (!tenant && !superAdmin) throw new Error("Unauthorized");

  const client = superAdmin ? createAdminClient() : supabase;
  let query = client
    .from("orders")
    .update(data)
    .eq("id", orderId);

  if (!superAdmin && tenant?.id) {
    query = query.eq("tenant_id", tenant.id);
  }

  const { data: updatedOrder, error } = await query
    .select(`
      *,
      customers (*),
      tenants (name)
    `)
    .single();

  if (error) throw error;

  // Send WhatsApp Notification if proof is uploaded
  if (data.proof_image_url && updatedOrder && updatedOrder.customers?.phone) {
    const message = formatStatusMessage(
      "PROOF_READY",
      updatedOrder.customers.name,
      updatedOrder.job_type,
      updatedOrder.id, // Must be UUID for the link to work
      updatedOrder.tenants?.name || tenant.name,
      0, // No balance for proofing
      updatedOrder.proofing_token
    );

    if (message) {
      sendWhatsAppMessage({ 
        phone: updatedOrder.customers.phone, 
        message 
      }).catch(err => console.error("Async WhatsApp error during proof update:", err));
    }
  }

  return updatedOrder;
}

/**
 * Handles customer response to a design proof (Approve/Revision)
 * Called from the public proofing page.
 */
export async function submitProofResponse(
  orderId: string, 
  token: string, 
  proofStatus: 'APPROVED' | 'REVISION_REQUESTED', 
  feedback: string
) {
  const supabase = createAdminClient();
  
  // 1. Get current proof image to copy to file_url if approved
  const { data: orderData } = await supabase
    .from("orders")
    .select("proof_image_url")
    .eq("id", orderId)
    .eq("proofing_token", token)
    .single();

  const updateFields: any = { 
    proof_status: proofStatus,
    proof_feedback: feedback
  };

  // If approved, the proof becomes the final downloadable file
  if (proofStatus === 'APPROVED' && orderData?.proof_image_url) {
    updateFields.file_url = orderData.proof_image_url;
  }

  const { data: updatedOrder, error } = await supabase
    .from("orders")
    .update(updateFields)
    .eq("id", orderId)
    .eq("proofing_token", token)
    .select(`
      *,
      customers (name),
      tenants (name, phone)
    `)
    .single();

  if (error) throw error;

  // 2. Notify the SHOP via WhatsApp
  if (updatedOrder && updatedOrder.tenants?.phone) {
    const message = formatStatusMessage(
      "SHOP_NOTIFY_PROOF",
      updatedOrder.customers?.name || "Customer",
      updatedOrder.job_type,
      updatedOrder.friendly_id || updatedOrder.id,
      updatedOrder.tenants.name,
      proofStatus === 'APPROVED' ? 1 : 0, // Abuse 'balance' for status
      feedback // Abuse 'proofingToken' for feedback string
    );

    if (message) {
      sendWhatsAppMessage({ 
        phone: updatedOrder.tenants.phone, 
        message 
      }).catch(err => console.error("Async WhatsApp error during shop notification:", err));
    }
  }

  return { success: true, updatedOrder };
}

export async function updateTenantDetails(data: { name?: string, city?: string, phone?: string, gst_number?: string, logo_url?: string, id_prefix?: string }) {
  const supabase = createClient();
  const superAdmin = await isSuperAdmin(supabase);
  const tenant = await getCurrentTenant(supabase);
  if (!tenant) throw new Error("Unauthorized");

  const client = superAdmin ? createAdminClient() : supabase;
  const oldPrefix = tenant.id_prefix;
  const newPrefix = data.id_prefix;

  const { data: updatedTenant, error } = await client
    .from("tenants")
    .update(data)
    .eq("id", tenant.id)
    .select()
    .single();

  if (error) throw error;

  // If the prefix has changed or is being set for the first time, sync all existing order friendly_ids
  if (newPrefix && newPrefix !== oldPrefix) {
    const { error: syncError } = await client.rpc('sync_order_prefixes', {
      p_tenant_id: tenant.id,
      p_new_prefix: newPrefix
    });

    if (syncError) {
      console.error("Failed to sync legacy order prefixes:", syncError);
    }
  }

  return updatedTenant;
}

export async function markOnboardingComplete() {
  const supabase = createClient();
  const superAdmin = await isSuperAdmin(supabase);
  const tenant = await getCurrentTenant(supabase);
  if (!tenant) return { success: false };

  const client = superAdmin ? createAdminClient() : supabase;
  const { error } = await client
    .from("tenants")
    .update({ onboarding_complete: true })
    .eq("id", tenant.id);

  if (error) throw error;
  return { success: true };
}

/**
 * Specialized order creation for the public QR storefront.
 * Handles customer creation, order saving, and notifying both Shop & Customer.
 */
export async function createStorefrontOrder(data: OrderData & { slug: string }) {
  const supabase = createAdminClient(); // Use admin client for public submissions
  
  // 1. Get Tenant info
  const { data: tenant, error: tError } = await supabase
    .from('tenants')
    .select('*')
    .eq('slug', data.slug)
    .single();

  if (tError || !tenant) throw new Error("Shop not found");

  // 2. Identify/Create Customer
  let customerId = null;
  const { data: existingCustomer } = await supabase
    .from("customers")
    .select("id")
    .eq("phone", data.phone || "")
    .eq("tenant_id", tenant.id)
    .maybeSingle();

  if (existingCustomer) {
    customerId = existingCustomer.id;
  } else {
    const { data: newCustomer, error: cError } = await supabase
      .from("customers")
      .insert({
        name: data.customerName || "Storefront Customer",
        phone: data.phone || null,
        tenant_id: tenant.id
      })
      .select("id")
      .single();
    if (cError) throw cError;
    customerId = newCustomer.id;
  }

  // 3. Generate Friendly ID
  const { data: friendly_id } = await supabase.rpc('generate_simple_order_id', {
    p_tenant_id: tenant.id,
    p_prefix: tenant.id_prefix || 'ORD'
  });

  // 4. Create Order
  const { data: order, error: oError } = await supabase
    .from("orders")
    .insert({
      tenant_id: tenant.id,
      customer_id: customerId,
      job_type: data.jobType,
      quantity: data.quantity,
      paper_type: data.paperType,
      size: data.size,
      printing_side: data.printingSide,
      lamination: data.lamination,
      instructions: data.instructions,
      file_url: data.file_url,
      status: 'RECEIVED',
      friendly_id: friendly_id,
      total_amount: 0,
      advance_paid: 0
    })
    .select("*")
    .single();

  if (oError) throw oError;

  // 5. WhatsApp Notifications
  
  // A. Notify Customer
  if (data.phone) {
    const customerMsg = formatStatusMessage(
      "RECEIVED",
      data.customerName || "Customer",
      data.jobType,
      friendly_id || order.id,
      tenant.name,
      0
    );
    sendWhatsAppMessage({ phone: data.phone, message: customerMsg }).catch(console.error);
  }

  // B. Notify Tenant (Shop)
  if (tenant.phone) {
    const shopMsg = formatStatusMessage(
      "SHOP_NOTIFY_NEW_ORDER",
      data.customerName || "Storefront Customer",
      data.jobType,
      friendly_id || order.id,
      tenant.name,
      0
    );
    sendWhatsAppMessage({ phone: tenant.phone, message: shopMsg }).catch(console.error);
  }

  return { success: true, order };
}

export async function getTenantIntegrations() {
  const supabase = createClient();
  const superAdmin = await isSuperAdmin(supabase);
  const tenant = await getCurrentTenant(supabase);
  if (!tenant) return [];

  const client = superAdmin ? createAdminClient() : supabase;
  const { data, error } = await client
    .from("tenant_integrations")
    .select("*")
    .eq("tenant_id", tenant.id);

  if (error) return [];
  return data || [];
}

export async function disconnectIntegration(type: string) {
  const supabase = createClient();
  const superAdmin = await isSuperAdmin(supabase);
  const tenant = await getCurrentTenant(supabase);
  if (!tenant) return { success: false, error: "No active tenant" };

  const client = superAdmin ? createAdminClient() : supabase;
  const { error } = await client
    .from("tenant_integrations")
    .delete()
    .eq("tenant_id", tenant.id)
    .eq("type", type);

  if (error) throw error;
  return { success: true };
}

// ─── INVENTORY SERVER ACTIONS ──────────────────────────────────────────
export async function getInventory() {
  const supabase = createClient();
  const superAdmin = await isSuperAdmin(supabase);
  const tenant = await getCurrentTenant(supabase);
  if (!tenant && !superAdmin) return [];

  const client = superAdmin ? createAdminClient() : supabase;
  let q = client.from("inventory").select("*").order("name", { ascending: true });
  if (tenant?.id) {
    q = q.eq("tenant_id", tenant.id);
  }
  const { data, error } = await q;
  if (error) {
    console.error("Error fetching inventory:", error);
    return [];
  }
  return data || [];
}

export async function addInventoryItem(form: { name: string; quantity: number; unit?: string; low_stock_limit?: number }) {
  const supabase = createClient();
  const superAdmin = await isSuperAdmin(supabase);
  const tenant = await getCurrentTenant(supabase);
  if (!tenant) throw new Error("Tenant required to add inventory");

  const client = superAdmin ? createAdminClient() : supabase;
  const { data, error } = await client.from("inventory").insert({
    tenant_id: tenant.id,
    name: form.name,
    quantity: form.quantity,
    unit: form.unit || 'Sheets',
    low_stock_limit: form.low_stock_limit || 10
  }).select().single();

  if (error) throw error;
  return data;
}

export async function deleteInventoryItem(id: string) {
  const supabase = createClient();
  const superAdmin = await isSuperAdmin(supabase);
  const client = superAdmin ? createAdminClient() : supabase;

  const { error } = await client.from("inventory").delete().eq("id", id);
  if (error) throw error;
  return true;
}

export async function updateInventoryStock(id: string, quantity: number, isRestock = false) {
  const supabase = createClient();
  const superAdmin = await isSuperAdmin(supabase);
  const client = superAdmin ? createAdminClient() : supabase;

  const updateData: any = { quantity };
  if (isRestock) {
    updateData.last_restocked_at = new Date().toISOString();
  }

  const { error } = await client.from("inventory").update(updateData).eq("id", id);
  if (error) throw error;
  return true;
}

// ─── EXPENSES SERVER ACTIONS ───────────────────────────────────────────
export async function getExpenses() {
  const supabase = createClient();
  const superAdmin = await isSuperAdmin(supabase);
  const tenant = await getCurrentTenant(supabase);
  if (!tenant && !superAdmin) return [];

  const client = superAdmin ? createAdminClient() : supabase;
  let q = client.from("expenses").select("*").order("spent_at", { ascending: false });
  if (tenant?.id) {
    q = q.eq("tenant_id", tenant.id);
  }
  const { data, error } = await q;
  if (error) {
    console.error("Error fetching expenses:", error);
    return [];
  }
  return data || [];
}

export async function addExpense(form: { description: string; amount: number; category: string; payment_method: string }) {
  const supabase = createClient();
  const superAdmin = await isSuperAdmin(supabase);
  const tenant = await getCurrentTenant(supabase);
  if (!tenant) throw new Error("Tenant required to add expense");

  const client = superAdmin ? createAdminClient() : supabase;
  const { data, error } = await client.from("expenses").insert({
    tenant_id: tenant.id,
    description: form.description,
    amount: form.amount,
    category: form.category,
    payment_method: form.payment_method,
    spent_at: new Date().toISOString()
  }).select().single();

  if (error) throw error;
  return data;
}

export async function deleteExpense(id: string) {
  const supabase = createClient();
  const superAdmin = await isSuperAdmin(supabase);
  const client = superAdmin ? createAdminClient() : supabase;

  const { error } = await client.from("expenses").delete().eq("id", id);
  if (error) throw error;
  return true;
}

// ─── DASHBOARD & BILLING SERVER ACTIONS ────────────────────────────────
export async function getDashboardData() {
  const supabase = createClient();
  const superAdmin = await isSuperAdmin(supabase);
  const tenant = await getCurrentTenant(supabase);
  if (!tenant && !superAdmin) return null;

  const client = superAdmin ? createAdminClient() : supabase;

  let ordersQuery = client
    .from("orders")
    .select("*, customers(name)")
    .order("created_at", { ascending: false });

  let paymentsQuery = client
    .from("payments")
    .select("*");

  if (tenant?.id) {
    ordersQuery = ordersQuery.eq("tenant_id", tenant.id);
    paymentsQuery = paymentsQuery.eq("tenant_id", tenant.id);
  }

  const [{ data: dbOrders }, { data: dbPayments }] = await Promise.all([
    ordersQuery,
    paymentsQuery
  ]);

  const orders = dbOrders || [];
  const payments = dbPayments || [];

  const today = new Date().toISOString().split('T')[0];
  const todayOrders = orders.filter(o => o.created_at?.startsWith(today));
  const pendingCount = orders.filter(o => o.status !== 'DELIVERED' && o.status !== 'CANCELLED').length;
  const totalBalanceDue = orders.reduce((acc, curr) => acc + Number(curr.balance_due || 0), 0);

  return {
    tenant: tenant || null,
    orders,
    payments,
    todayOrdersCount: todayOrders.length,
    pendingJobsCount: pendingCount,
    accountReceivables: totalBalanceDue,
    recentOrders: orders.slice(0, 6)
  };
}

export async function getBillingData() {
  const supabase = createClient();
  const superAdmin = await isSuperAdmin(supabase);
  const tenant = await getCurrentTenant(supabase);
  if (!tenant && !superAdmin) return null;

  const client = superAdmin ? createAdminClient() : supabase;
  let q = client
    .from("orders")
    .select("*, customers(name)")
    .order("created_at", { ascending: false });

  if (tenant?.id) {
    q = q.eq("tenant_id", tenant.id);
  }

  const { data: dbOrders, error } = await q;
  if (error) {
    console.error("Error fetching billing data:", error);
    return null;
  }

  const orders = dbOrders || [];
  const totalRevenue = orders.reduce((acc, ord) => acc + Number(ord.advance_paid || 0), 0);
  const outstandingBalance = orders.reduce((acc, ord) => acc + (Number(ord.total_with_gst || ord.total_amount || 0) - Number(ord.advance_paid || 0)), 0);
  const pendingPayments = orders.filter(ord => (Number(ord.total_with_gst || ord.total_amount || 0) - Number(ord.advance_paid || 0)) > 0.01).length;

  return {
    tenant: tenant || null,
    isSuperAdmin: !!superAdmin,
    orders,
    totalRevenue: Math.round(totalRevenue * 100) / 100,
    outstandingBalance: Math.round(outstandingBalance * 100) / 100,
    pendingPayments
  };
}

export async function getTeamData() {
  const supabase = createClient();
  const superAdmin = await isSuperAdmin(supabase);
  const tenant = await getCurrentTenant(supabase);
  if (!tenant && !superAdmin) return { members: [], invitations: [] };

  const client = createAdminClient();
  let profilesQuery = client.from("profiles").select("*");
  let invitesQuery = client.from("team_invitations").select("*");

  if (tenant?.id) {
    profilesQuery = profilesQuery.eq("tenant_id", tenant.id);
    invitesQuery = invitesQuery.eq("tenant_id", tenant.id);
  }

  const [{ data: dbMembers }, { data: invitationData }] = await Promise.all([
    profilesQuery,
    invitesQuery
  ]);

  return {
    members: dbMembers || [],
    invitations: invitationData || []
  };
}

export async function getGSTRates() {
  const supabase = createClient();
  const superAdmin = await isSuperAdmin(supabase);
  const tenant = await getCurrentTenant(supabase);
  if (!tenant && !superAdmin) return [];

  const client = superAdmin ? createAdminClient() : supabase;
  let q = client.from("gst_rates").select("*");
  if (tenant?.id) {
    q = q.eq("tenant_id", tenant.id);
  }
  const { data, error } = await q;
  if (error) return [];
  return data || [];
}

export async function searchGlobal(searchQuery: string) {
  if (!searchQuery?.trim()) return [];
  const supabase = createClient();
  const superAdmin = await isSuperAdmin(supabase);
  const tenant = await getCurrentTenant(supabase);
  if (!tenant && !superAdmin) return [];

  const client = superAdmin ? createAdminClient() : supabase;
  const tenantId = tenant?.id;

  let ordersQuery = client
    .from("orders")
    .select(`
      id, 
      friendly_id, 
      customers (
        name
      )
    `)
    .or(`friendly_id.ilike.%${searchQuery}%,instructions.ilike.%${searchQuery}%`)
    .limit(10);

  let customersQuery = client
    .from("customers")
    .select("id, name, phone")
    .or(`name.ilike.%${searchQuery}%,phone.ilike.%${searchQuery}%`)
    .limit(5);

  if (tenantId) {
    ordersQuery = ordersQuery.eq("tenant_id", tenantId);
    customersQuery = customersQuery.eq("tenant_id", tenantId);
  }

  const [{ data: orders }, { data: customers }] = await Promise.all([
    ordersQuery,
    customersQuery
  ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const combined = [
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ...(orders || []).map((o: any) => ({
      id: o.id,
      type: "order" as const,
      title: o.friendly_id || `Order #${o.id.slice(0, 8)}`,
      subtitle: `Customer: ${o.customers?.name || "Unknown"}`,
      href: `/dashboard/orders/${o.id}`
    })),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ...(customers || []).map((c: any) => ({
      id: c.id,
      type: "customer" as const,
      title: c.name,
      subtitle: c.phone || "No phone",
      href: `/dashboard/customers/${c.id}`
    }))
  ];

  return combined;
}

export async function getOnboardingProgress() {
  const supabase = createClient();
  const superAdmin = await isSuperAdmin(supabase);
  const tenant = await getCurrentTenant(supabase);
  if (!tenant) return null;

  const client = superAdmin ? createAdminClient() : supabase;
  const [{ count: customerCount }, { count: orderCount }, { count: expenseCount }] = await Promise.all([
    client.from("customers").select("*", { count: 'exact', head: true }).eq('tenant_id', tenant.id),
    client.from("orders").select("*", { count: 'exact', head: true }).eq('tenant_id', tenant.id),
    client.from("expenses").select("*", { count: 'exact', head: true }).eq('tenant_id', tenant.id)
  ]);

  return {
    tenant,
    customerCount: customerCount || 0,
    orderCount: orderCount || 0,
    expenseCount: expenseCount || 0
  };
}

export async function inviteTeamMember(data: { name: string; email: string; phone?: string; role: string }) {
  const supabase = createClient();
  const superAdmin = await isSuperAdmin(supabase);
  const tenant = await getCurrentTenant(supabase);
  if (!tenant) throw new Error("No active tenant found");

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const client = superAdmin ? createAdminClient() : supabase;
  const { data: invite, error } = await client
    .from('team_invitations')
    .insert({
      email: data.email,
      name: data.name,
      phone: data.phone || null,
      role: data.role,
      tenant_id: tenant.id,
      invited_by: user.id,
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'PENDING'
    })
    .select()
    .single();

  if (error) throw error;
  return invite;
}

export async function updateTeamMember(id: string, data: { name: string; phone?: string; role: string }) {
  const supabase = createClient();
  const superAdmin = await isSuperAdmin(supabase);
  const client = superAdmin ? createAdminClient() : supabase;

  // Try updating team_invitations
  const { data: inv } = await client
    .from('team_invitations')
    .update({
      name: data.name,
      phone: data.phone || null,
      role: data.role
    })
    .eq('id', id)
    .select()
    .maybeSingle();

  if (inv) return inv;

  // Else try updating profiles
  const { data: prof, error: profError } = await client
    .from('profiles')
    .update({
      name: data.name,
      phone: data.phone || null,
      role: data.role
    })
    .eq('id', id)
    .select()
    .single();

  if (profError) throw profError;
  return prof;
}

export async function deleteTeamMember(id: string) {
  const supabase = createClient();
  const superAdmin = await isSuperAdmin(supabase);
  const client = superAdmin ? createAdminClient() : supabase;

  await Promise.all([
    client.from('team_invitations').delete().eq('id', id),
    client.from('profiles').delete().eq('id', id)
  ]);
  return { success: true };
}

export async function getUserProfile() {
  const supabase = createClient();
  const superAdmin = await isSuperAdmin(supabase);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const client = superAdmin ? createAdminClient() : supabase;
  const { data: profile } = await client
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  const tenant = await getCurrentTenant(supabase);

  return {
    user,
    profile,
    tenant,
    isSuperAdmin: !!superAdmin
  };
}

export async function updateUserProfile(data: { name: string; phone: string }) {
  const supabase = createClient();
  const superAdmin = await isSuperAdmin(supabase);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const client = superAdmin ? createAdminClient() : supabase;
  const { data: profile, error } = await client
    .from('profiles')
    .update({
      name: data.name,
      phone: data.phone
    })
    .eq('id', user.id)
    .select()
    .single();

  if (error) throw error;
  return profile;
}

