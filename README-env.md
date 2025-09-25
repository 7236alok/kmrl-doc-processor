Environment variables

- Copy `.env.example` to `.env` and fill in real values.
- `.env` is used for local development only; do NOT commit secrets.
- The project uses `dotenv` to load `.env` when running locally.

Quick start

```powershell
npm install
npm run start
```

Notes

- Offline-first: The pipeline runs fully offline. Abstractive summarization uses `@xenova/transformers` with locally cached models. For long documents we chunk and use `Xenova/distilbart-cnn-6-6` offline.
- LED model optional: `Xenova/led-base-16384` is not required. It needs authenticated downloads during caching and is disabled by default. If you want it, set `HF_API_KEY` in `.env`, run `npm run download-models`, then re-run. Otherwise, everything works offline with DistilBART.
- `OPENAI_API_KEY` is optional in offline mode; leave it unset when staying fully offline.
- `DB_PATH` can be a path to a local folder used by the project for storage.
