-- Image credit/attribution shown under event images. Optional — many
-- sources don't expose photographer/illustrator info. Used both for
-- visual attribution on the site and as a signal for whether a third-
-- party image can be safely re-shared (e.g. on social media).
ALTER TABLE events
  ADD COLUMN image_credit TEXT;

COMMENT ON COLUMN events.image_credit IS
  'Photographer/illustrator credit shown under the image. Null when unknown.';
