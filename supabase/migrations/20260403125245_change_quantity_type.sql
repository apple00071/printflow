-- Change quantity column type from INTEGER to VARCHAR to support expressions like '500+500'
ALTER TABLE orders ALTER COLUMN quantity TYPE VARCHAR(255);
ALTER TABLE quotations ALTER COLUMN quantity TYPE VARCHAR(255);
