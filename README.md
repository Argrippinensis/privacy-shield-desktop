# PrivacyShield Desktop

Desktop-App für das PrivacyShield Tool — automatisch via CI/CD gebaut.

## Entwicklung

npm install
npm start

## Build

Windows: npm run build:win
macOS: npm run build:mac
Linux: npm run build:linux

## Release

git tag v1.0.0
git push --tags

→ GitHub Actions baut automatisch alle Plattformen und erstellt ein Release.
