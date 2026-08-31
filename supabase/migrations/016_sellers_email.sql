-- Denormalized email on sellers — avoids an admin.auth.admin.getUserById()
-- round trip per row just to render the admin's sellers list. Populated
-- once at seller-creation time (SellerService.adminAddSellerByEmail);
-- never used for auth decisions (requireSeller() still keys off sellers.id
-- == auth.uid()), so it going stale after an email change is cosmetic only.
alter table public.sellers add column if not exists email text;
