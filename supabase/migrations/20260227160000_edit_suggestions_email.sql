-- Add optional email column to edit_suggestions
-- Allows us to thank correction submitters when their suggestion is applied
ALTER TABLE edit_suggestions ADD COLUMN email TEXT;
