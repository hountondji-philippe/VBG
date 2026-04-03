# 🚀 Guide de déploiement VBG — Neon + Render (100% Gratuit)

## ÉTAPE 1 — Créer la base de données sur Neon.tech

1. Va sur **https://neon.tech** → Sign Up (gratuit, sans carte bancaire)
2. Crée un nouveau projet → donne-lui le nom `vbg`
3. Copie la **Connection string** qui ressemble à :
   ```
   postgresql://user:password@ep-xxxxx.neon.tech/neondb?sslmode=require
   ```
4. Clique sur **SQL Editor** dans le menu gauche
5. Colle tout le contenu du fichier `schema.sql` et clique **Run**
6. Tu verras les tables `temoignages`, `admins`, `session` créées ✅

---

## ÉTAPE 2 — Déployer sur Render.com

1. Va sur **https://render.com** → Sign Up avec GitHub
2. Clique **New +** → **Web Service**
3. Connecte ton repo GitHub **VBG**
4. Configure comme suit :
   - **Root Directory** : `backend`
   - **Build Command** : `npm install`
   - **Start Command** : `node server.js`
   - **Instance Type** : Free

5. Dans **Environment Variables**, ajoute ces variables :

| Clé | Valeur |
|-----|--------|
| `DATABASE_URL` | ta Connection string Neon |
| `SESSION_SECRET` | génère avec `openssl rand -hex 64` |
| `ADMIN_USERNAME` | ton email admin |
| `CLOUDINARY_CLOUD_NAME` | depuis ton dashboard Cloudinary |
| `CLOUDINARY_API_KEY` | depuis ton dashboard Cloudinary |
| `CLOUDINARY_API_SECRET` | depuis ton dashboard Cloudinary |
| `FRONTEND_URL` | ton URL Render (ex: https://vbg.onrender.com) |
| `NODE_ENV` | `production` |

6. Clique **Create Web Service** → attends 2-3 minutes 🚀

---

## ÉTAPE 3 — Créer le compte administrateur

Une fois déployé sur Render :
1. Va dans ton service Render → onglet **Shell**
2. Tape :
   ```bash
   node create-admin.js
   ```
3. Entre ton nom d'utilisateur et mot de passe (12 caractères minimum)
4. Ton admin est créé ✅

---

## ÉTAPE 4 — Générer SESSION_SECRET

Sur ton terminal local (ou sur n'importe quel site générateur) :
```bash
openssl rand -hex 64
```
Copie le résultat et mets-le comme valeur de `SESSION_SECRET`.

---

## ✅ Récapitulatif — Ce qui est gratuit et permanent

| Service | Gratuit | Expire ? |
|---------|---------|----------|
| Neon.tech (PostgreSQL) | ✅ | ❌ Jamais |
| Render.com (Node.js) | ✅ | ❌ Jamais |
| Cloudinary (images) | ✅ | ❌ Jamais |
| GitHub (code) | ✅ | ❌ Jamais |

> ⚠️ Render gratuit : l'app s'endort après 15 min d'inactivité
> et se réveille en ~30 secondes à la prochaine visite. C'est normal.
