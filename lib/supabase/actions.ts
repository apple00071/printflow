import { supabase } from "@/lib/supabase/client";

export async function createOrder(data: any) {
  // 1. Check if customer exists by phone
  const { data: customer, error: customerError } = await supabase
    .from("customers")
    .select("id")
    .eq("phone", data.phone)
    .single();

  let customerId = customer?.id;

  // 2. Auto-create customer if not found
  if (!customer) {
    const { data: newCustomer, error: newCustomerError } = await supabase
      .from("customers")
      .insert({
        name: data.customerName,
        phone: data.phone,
      })
      .select("id")
      .single();

    if (newCustomerError) throw newCustomerError;
    customerId = newCustomer.id;
  }

  // 3. Create Order
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
      total_amount: data.totalAmount,
      advance_paid: data.advancePaid,
      status: "RECEIVED",
    })
    .select("id")
    .single();

  if (orderError) throw orderError;

  // 4. Record Initial Payment if any
  if (data.advancePaid > 0) {
    await supabase.from("payments").insert({
      order_id: order.id,
      amount: data.advancePaid,
      method: "cash", // default for now
    });
  }

  return order;
}

export async function getOrders(filter: { status?: string; search?: string } = {}) {
  let query = supabase
    .from("orders")
    .select(`
      *,
      customers (
        name,
        phone
      )
    `)
    .order("created_at", { ascending: false });

  if (filter.status && filter.status !== "ALL") {
    query = query.eq("status", filter.status);
  }

  if (filter.search) {
    // Note: Cross-table search in Supabase is tricky with .or(). 
    // Usually handled by a view or specialized filtering.
    // Simplifying: search customer name if available.
  }

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function getOrder(id: string) {
  const { data, error } = await supabase
    .from("orders")
    .select(`
      *,
      customers (*)
    `)
    .eq("id", id)
    .single();

  if (error) throw error;
  return data;
}

export async function updateOrderStatus(orderId: string, status: string) {
  const { data, error } = await supabase
    .from("orders")
    .update({ status })
    .eq("id", orderId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateOrder(id: string, data: any) {
  const { error } = await supabase
    .from("orders")
    .update({
      job_type: data.jobType,
      quantity: data.quantity,
      paper_type: data.paperType,
      size: data.size,
      instructions: data.instructions,
      delivery_date: data.deliveryDate || null,
      total_amount: data.totalAmount,
      advance_paid: data.advancePaid,
    })
    .eq("id", id);

  if (error) throw error;
}

