-- Splits payment-instrument handling out of `payments:*`.
--
-- Storing or detaching a customer's card is a different sensitivity from
-- recording a receipt, so the payment-method routes now demand
-- `payment_methods:read` / `payment_methods:write`. Introducing a permission
-- that no existing role holds would silently revoke that capability from every
-- workspace, so each role that already had the broader permission is granted
-- the narrower one here. The split therefore only changes what a role created
-- *after* this migration can be given.
--
-- Idempotent by construction: the guard excludes any role that already holds
-- the permission, so a re-run inserts nothing.
UPDATE "billing_roles"
   SET "permissions" = array_append("permissions", 'payment_methods:read'),
       "updated_at" = EXTRACT(EPOCH FROM NOW())::int
 WHERE 'payments:read' = ANY("permissions")
   AND NOT ('payment_methods:read' = ANY("permissions"));

UPDATE "billing_roles"
   SET "permissions" = array_append("permissions", 'payment_methods:write'),
       "updated_at" = EXTRACT(EPOCH FROM NOW())::int
 WHERE 'payments:write' = ANY("permissions")
   AND NOT ('payment_methods:write' = ANY("permissions"));
