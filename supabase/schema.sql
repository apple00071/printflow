-- SQL Schema for Apple Graphics (Printing Press) - Idempotent Version

-- 1. Custom Types (Checked before creation)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('ADMIN', 'WORKER');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_status') THEN
        CREATE TYPE order_status AS ENUM ('RECEIVED', 'DESIGNING', 'PRINTING', 'READY', 'DELIVERED');
    END IF;
END$$;

-- 2. Profiles (linked to auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  role user_role DEFAULT 'WORKER' NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Ensure username column exists if profile was created without it
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='username') THEN
        ALTER TABLE profiles ADD COLUMN username TEXT UNIQUE;
        -- Set username to name for existing users
        UPDATE profiles SET username = name WHERE username IS NULL;
        ALTER TABLE profiles ALTER COLUMN username SET NOT NULL;
    END IF;
END$$;

-- 3. Customers
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Orders
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id),
  assigned_to_id UUID REFERENCES profiles(id),
  job_type TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  paper_type TEXT,
  size TEXT,
  instructions TEXT,
  file_url TEXT,
  status order_status DEFAULT 'RECEIVED' NOT NULL,
  total_amount NUMERIC(12, 2) NOT NULL,
  advance_paid NUMERIC(12, 2) DEFAULT 0 NOT NULL,
  balance_due NUMERIC(12, 2) GENERATED ALWAYS AS (total_amount - advance_paid) STORED,
  delivery_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Payments
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  amount NUMERIC(12, 2) NOT NULL,
  method TEXT NOT NULL, -- cash / UPI / bank transfer
  paid_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Price Table
CREATE TABLE IF NOT EXISTS price_table (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_type TEXT NOT NULL,
  paper_type TEXT,
  min_qty INTEGER NOT NULL,
  max_qty INTEGER NOT NULL,
  price_per_unit NUMERIC(12, 2) NOT NULL
);

-- RLS (Row Level Security)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_table ENABLE ROW LEVEL SECURITY;

-- Policies (Dropped before creation for idempotency)
DROP POLICY IF EXISTS "Admin full access" ON profiles;
CREATE POLICY "Admin full access" ON profiles FOR ALL USING (true);

DROP POLICY IF EXISTS "Full access for customers" ON customers;
CREATE POLICY "Full access for customers" ON customers FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Full access for orders" ON orders;
CREATE POLICY "Full access for orders" ON orders FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Full access for payments" ON payments;
CREATE POLICY "Full access for payments" ON payments FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public read for price table" ON price_table;
CREATE POLICY "Public read for price table" ON price_table FOR SELECT USING (true);

-- Trigger for auto-profile creation on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, username, name, role)
  VALUES (
    new.id, 
    COALESCE(new.raw_user_meta_data->>'username', new.email), 
    COALESCE(new.raw_user_meta_data->>'name', 'New Worker'), 
    'WORKER'
  )
  ON CONFLICT (id) DO UPDATE 
  SET username = EXCLUDED.username, name = EXCLUDED.name;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
