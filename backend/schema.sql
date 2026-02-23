-- VBG — Base de données
-- Exécutez ce fichier une seule fois pour créer toute la structure.
-- Commande : mysql -u root -p < schema.sql

CREATE DATABASE IF NOT EXISTS vbg_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE vbg_db;

-- Table des témoignages anonymes
CREATE TABLE IF NOT EXISTS temoignages (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  message       TEXT         CHARACTER SET utf8mb4 NULL,
  fichiers_json JSON         NULL,
  statut        ENUM('nouveau','en_cours','traite','archive') NOT NULL DEFAULT 'nouveau',
  notes_admin   TEXT         CHARACTER SET utf8mb4 NULL,
  date_envoi    DATETIME     NOT NULL DEFAULT (NOW()),
  date_maj      DATETIME     NULL ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table des administrateurs (mots de passe hachés bcrypt)
CREATE TABLE IF NOT EXISTS admins (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  username      VARCHAR(50)  NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at    DATETIME     NOT NULL DEFAULT (NOW())
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Index pour accélérer les recherches fréquentes
CREATE INDEX IF NOT EXISTS idx_statut     ON temoignages (statut);
CREATE INDEX IF NOT EXISTS idx_date_envoi ON temoignages (date_envoi);

-- Utilisateur MySQL avec droits limités (jamais root pour l'application)
CREATE USER IF NOT EXISTS 'vbg_user'@'localhost'
  IDENTIFIED BY 'Vbg@2025!SecurePass';

GRANT SELECT, INSERT, UPDATE ON vbg_db.temoignages TO 'vbg_user'@'localhost';
GRANT SELECT                 ON vbg_db.admins      TO 'vbg_user'@'localhost';

FLUSH PRIVILEGES;

-- ─────────────────────────────────────────────────────────────
-- Après avoir créé le schéma, créez votre admin avec :
--   node scripts/create-admin.js
-- ─────────────────────────────────────────────────────────────g