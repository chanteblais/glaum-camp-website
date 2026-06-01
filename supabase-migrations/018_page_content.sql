-- Editable homepage content blocks
CREATE TABLE IF NOT EXISTS page_content (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Default values
INSERT INTO page_content (key, value) VALUES
  ('home_tagline',             'Built by many hands. Held by many hearts.'),
  ('home_about_heading',       'A camp. A collective.'),
  ('home_about_body',          'Glåüm is a participatory theme camp rooted in art, absurdity, care, and the belief that humans do better when they have spaces to gather, create, and feel connected. We arrive at What If with carpets, strange music, soft lighting, improbable conversations, and an unwavering commitment to making people feel genuinely welcomed.

We are sponsored by Shrimp™.

The exact nature of this sponsorship remains unclear, but signs of approval continue to accumulate.

Glåüm is satirical in form and sincere in practice. We borrow from the aesthetics of mysterious organizations, ceremonial weirdness, and light bureaucratic absurdity because it''s funny — but also because ritual, participation, and shared meaning genuinely matter.'),
  ('home_participate_heading', 'This Camp Runs on Participation'),
  ('home_participate_body',    'The Many Hands hold us all up. Sometimes we do the carrying. Sometimes we are carried. Everyone contributes in some way: setup, teardown, cooking, welcoming, cleaning, decorating, emotional support, infrastructure, care.')
ON CONFLICT (key) DO NOTHING;
