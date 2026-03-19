import { createClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export async function POST() {
  try {
    const supabase = createClient();
    
    // Add missing columns to tenants table
    const sqlStatements = [
      'ALTER TABLE tenants ADD COLUMN IF NOT EXISTS plan TEXT NOT NULL DEFAULT \'FREE\'',
      'ALTER TABLE tenants ADD COLUMN IF NOT EXISTS plan_status TEXT NOT NULL DEFAULT \'ACTIVE\'',
      'ALTER TABLE tenants ADD COLUMN IF NOT EXISTS orders_this_month INTEGER DEFAULT 0',
      'ALTER TABLE tenants ADD COLUMN IF NOT EXISTS onboarding_complete BOOLEAN DEFAULT FALSE',
      'ALTER TABLE tenants ADD COLUMN IF NOT EXISTS last_invoice_number INTEGER DEFAULT 0',
      'ALTER TABLE tenants ADD COLUMN IF NOT EXISTS last_invoice_month TEXT',
      'ALTER TABLE tenants ADD COLUMN IF NOT EXISTS razorpay_sub_id TEXT',
      'ALTER TABLE tenants ADD COLUMN IF NOT EXISTS language TEXT DEFAULT \'en\'',
      'ALTER TABLE profiles ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id)'
    ];
    
    const results = [];
    
    for (const sql of sqlStatements) {
      try {
        const { error } = await supabase.rpc('exec_sql', { sql });
        if (error) {
          results.push({ sql, error: error.message });
        } else {
          results.push({ sql, success: true });
        }
      } catch (e: unknown) {
        results.push({ sql, error: e instanceof Error ? e.message : String(e) });
      }
    }
    
    return NextResponse.json({
      message: "Database fix attempted",
      results
    });
    
  } catch (error) {
    console.error('Error fixing database:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fix database" },
      { status: 500 }
    );
  }
}
