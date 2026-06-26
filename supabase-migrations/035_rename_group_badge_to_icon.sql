-- Rename the per-group uploaded image from "badge" to "icon" to match how it's
-- now described in the admin UI and code (the emoji field stays `groups.icon`;
-- this uploaded image is `groups.icon_image`).
--
-- Data is preserved by the rename. The storage bucket keeps its original name
-- (`group-badges`) and object paths (`<id>/badge.png`) so existing stored URLs
-- in this column keep resolving — the bucket name is internal and never shown.

ALTER TABLE groups RENAME COLUMN badge_image TO icon_image;
