CREATE OR REPLACE FUNCTION trg_enforce_slug_immutability()
RETURNS TRIGGER AS $$
BEGIN
  -- Kunci slug HANYA jika acara sudah pernah dipublikasikan
  IF OLD.is_published = true AND OLD.slug IS DISTINCT FROM NEW.slug THEN
    RAISE EXCEPTION 'Slug is immutable and cannot be updated once published.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS check_slug_immutable ON events;
CREATE TRIGGER check_slug_immutable
BEFORE UPDATE ON events
FOR EACH ROW
EXECUTE FUNCTION trg_enforce_slug_immutability();
