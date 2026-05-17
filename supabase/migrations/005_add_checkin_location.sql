-- Add location coordinates to wfh_checkins
ALTER TABLE wfh_checkins 
ADD COLUMN location_lat NUMERIC,
ADD COLUMN location_lng NUMERIC;
