---
title: MangaLabTH Backend
emoji: 📚
colorFrom: indigo
colorTo: purple
sdk: docker
app_port: 7860
---

# MangaLabTH Backend

This is the FastAPI backend for MangaLabTH, running in a Docker container on Hugging Face Spaces.

## Environment Variables Required

When deploying this Space, you must configure the following Secrets (Settings > Variables and secrets > Secrets):

*   `DATABASE_URL`: Your PostgreSQL connection string (e.g., Neon).
*   `CORS_ORIGINS`: The URL of your Vercel frontend (e.g., `https://your-frontend.vercel.app`). You can also use `*` for testing, but it is less secure.
*   `CLERK_PUBLISHABLE_KEY`: Your Clerk publishable key.
*   `CLERK_SECRET_KEY`: Your Clerk secret key.
*   `CLERK_JWKS_URL`: Your Clerk JWKS URL.
*   `R2_ENDPOINT_URL`: Cloudflare R2 endpoint.
*   `R2_ACCESS_KEY_ID`: Cloudflare R2 access key.
*   `R2_SECRET_ACCESS_KEY`: Cloudflare R2 secret key.
*   `R2_BUCKET_NAME`: Cloudflare R2 bucket name.
*   `R2_PUBLIC_URL`: Cloudflare R2 public URL.
