# Montage Studio

Studio multi-marques pour gérer le branding, le planning éditorial, les
montages et la publication sociale de Nourya, Projet IA et Mission Sourates.

## Démarrage

```bash
npm install
cp .env.example .env.local
npm run dev
```

Ouvrir [http://localhost:3000/login](http://localhost:3000/login), choisir
« S’inscrire », puis créer le premier compte. Les trois espaces de marque sont
créés automatiquement et stockés dans PostgreSQL.

## Variables requises

- `AUTH_SECRET` : secret aléatoire d’au moins 32 caractères.
- `DATABASE_URL` : URL PostgreSQL. Le schéma est créé automatiquement.
- `BLOB_READ_WRITE_TOKEN` : stockage public des exports vidéo.
- `OPENAI_API_KEY` : génération de contenus et outils IA.

Voir [.env.example](.env.example) pour les intégrations sociales.

## Connexions sociales

Dans un montage, ouvrir l’onglet « Publier ».

### YouTube

1. Activer YouTube Data API v3 dans Google Cloud.
2. Créer un client OAuth Web.
3. Ajouter l’URI de redirection
   `https://votre-domaine/api/oauth/youtube/callback`.
4. Définir `YOUTUBE_CLIENT_ID`, `YOUTUBE_CLIENT_SECRET` et
   `YOUTUBE_REDIRECT_URI`.
5. Cliquer « Se connecter avec YouTube » dans le projet concerné.

### TikTok

1. Configurer Login Kit et Content Posting API dans TikTok for Developers.
2. Autoriser les scopes `user.info.basic`, `video.publish` et `video.upload`.
3. Ajouter l’URI
   `https://votre-domaine/api/oauth/tiktok/callback`.
4. Définir `TIKTOK_CLIENT_KEY`, `TIKTOK_CLIENT_SECRET` et
   `TIKTOK_REDIRECT_URI`.
5. Vérifier le domaine Vercel Blob utilisé pour les vidéos publiques.
6. Cliquer « Se connecter avec TikTok ».

### Instagram

Renseigner dans l’onglet « Publier » l’Instagram User ID professionnel et son
token Meta longue durée. Ils sont chiffrés et isolés par projet.

## Workflow vidéo complète + extraits

1. Cliquer « Exporter » pour générer et stocker la vidéo complète.
2. Publier cette version sur YouTube depuis l’onglet « Publier ».
3. Choisir 15, 30, 45 ou 60 secondes pour l’extrait.
4. Cliquer « Extrait » dans la barre de l’éditeur.
5. Publier l’extrait sur Instagram et TikTok avec le CTA vers YouTube.

## Vérifications

```bash
npx tsc --noEmit
npm run lint
npm run build
```
