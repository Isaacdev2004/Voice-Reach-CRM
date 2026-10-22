-- Additive, nullable preferences on the existing owned contact record.
-- Apply to an authorized staging database before validating the new fields.
-- No existing contact data, ownership rules, indexes or policies are changed.
begin;
alter table public.contacts
  add column if not exists preferred_property_type text check (preferred_property_type is null or char_length(preferred_property_type) <= 80),
  add column if not exists preferred_sqft numeric check (preferred_sqft is null or (preferred_sqft > 0 and preferred_sqft <= 1000000000)),
  add column if not exists preferred_beds integer check (preferred_beds is null or preferred_beds between 0 and 100),
  add column if not exists preferred_baths numeric check (preferred_baths is null or (preferred_baths >= 0 and preferred_baths <= 1000)),
  add column if not exists preferred_garage_spaces integer check (preferred_garage_spaces is null or preferred_garage_spaces between 0 and 100),
  add column if not exists preferred_lot_sqft numeric check (preferred_lot_sqft is null or (preferred_lot_sqft > 0 and preferred_lot_sqft <= 1000000000000));
notify pgrst, 'reload schema';
commit;
