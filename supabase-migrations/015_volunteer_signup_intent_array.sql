-- Convert signup_intent from TEXT to TEXT[] to allow multiple selections
ALTER TABLE volunteers
  ALTER COLUMN signup_intent TYPE TEXT[]
  USING CASE WHEN signup_intent IS NULL THEN NULL ELSE ARRAY[signup_intent] END;
