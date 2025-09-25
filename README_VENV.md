This project prefers using a node version manager to create a reproducible "virtual environment" for Node.js tools.

Choose one of the methods below.

1) nvm-windows (recommended on Windows):
- Install nvm-windows from https://github.com/coreybutler/nvm-windows/releases
- Use the version in `.nvmrc`:

```powershell
nvm install 22.14.0
nvm use 22.14.0
npm run setup-env
```

2) Volta (cross-platform):
- Install Volta: https://volta.sh/
- Pin Node (reads `.nvmrc` automatically if present):

```powershell
volta install node@22.14.0
npm run setup-env
```

3) nvs (Node Version Switcher):
- Install nvs: https://github.com/jasongin/nvs

```powershell
nvs add 22.14.0
nvs use 22.14.0
npm run setup-env
```

Notes:
- `npm run setup-env` will install dependencies and run a TypeScript build.
- To run the compiled demo: `npm run start:dist` (after `npm run build`).
- To run without building (development): `npm start` (runs `ts-node` directly).
