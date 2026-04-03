-- VBG — Base de données PostgreSQL (Neon)
-- Exécutez ce fichier UNE SEULE FOIS dans l'éditeur SQL de Neon

-- Table des témoignages anonymes
CREATE TABLE IF NOT EXISTS temoignages (
  id            SERIAL PRIMARY KEY,
  message       TEXT         NULL,
  fichiers_json JSONB        NULL,
  statut        VARCHAR(20)  NOT NULL DEFAULT 'nouveau'
                CHECK (statut IN ('nouveau','en_cours','traite','archive')),
  notes_admin   TEXT         NULL,
  date_envoi    TIMESTAMP    NOT NULL DEFAULT NOW(),
  date_maj      TIMESTAMP    NULL
);

-- Mise à jour automatique de date_maj
CREATE OR REPLACE FUNCTION update_date_maj()
RETURNS TRIGGER AS $$
BEGIN
  NEW.date_maj = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trig_date_maj
BEFORE UPDATE ON temoignages
FOR EACH ROW EXECUTE FUNCTION update_date_maj();

-- Table des administrateurs (mots de passe hachés bcrypt)
CREATE TABLE IF NOT EXISTS admins (
  id            SERIAL PRIMARY KEY,
  username      VARCHAR(50)  NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at    TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- Index pour les performances
CREATE INDEX IF NOT EXISTS idx_statut     ON temoignages (statut);
CREATE INDEX IF NOT EXISTS idx_date_envoi ON temoignages (date_envoi);

-- ─────────────────────────────────────────────────────────────
-- Après avoir exécuté ce fichier, créez votre admin avec :
--   node create-admin.js
-- ─────────────────────────────────────────────────────────────
