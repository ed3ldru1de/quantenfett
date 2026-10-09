# Quantenfett – Bandseite

Statische Seite, Gigs kommen automatisch aus einem Google-Kalender.

## Vorher (für beide Varianten)
1. In Google Kalender einen **eigenen Kalender nur für Gigs** anlegen (nicht den privaten).
2. Einstellungen des Kalenders → „Integrieren" → **Geheime Adresse im iCal-Format** kopieren. Das ist die `ICS_URL`.
3. Gig als normalen Termin eintragen: Titel = Konzertname, Ort = Venue mit Adresse, Beschreibung = Link zu Tickets/Event (erste URL wird als „Infos" verlinkt). Wiederkehrende Termine werden nicht aufgelöst.
4. PDFs in `site/downloads/` legen, exakt benannt `Techrider.pdf` und `Stageplot.pdf`. Fehlt eine Datei, erscheint kein Link.
5. Links in `site/config.json` eintragen (leer = wird nicht angezeigt).
6. Bio-Text in `site/index.html` durch die echte Bio ersetzen.

## Variante A: GitHub Pages
1. Neues GitHub-Repo, Inhalt dieses Ordners hochladen. `varianten/github/pages.yml` nach `.github/workflows/pages.yml` kopieren.
2. Repo → Settings → Secrets and variables → Actions → Secret `ICS_URL` anlegen.
3. Settings → Pages → Source: **GitHub Actions**. Custom Domain dort eintragen.
4. Actions → Workflow einmal manuell starten. Danach baut er bei jedem Push und alle 6 Stunden.
Achtung: GitHub deaktiviert geplante Workflows nach 60 Tagen ohne Repo-Aktivität. Ein Commit (z. B. neuer Techrider) reaktiviert sie.

## Variante B: Cloudflare Pages
1. Repo wie oben (privat geht auch), `varianten/` und `.github` werden nicht gebraucht.
2. Cloudflare → Workers & Pages → Create → Pages → Connect to Git. Build command `node build.js`, Output directory `dist`. Environment variables: `ICS_URL`, `HOSTER` = `Cloudflare, Inc.`, `NODE_VERSION` = `20`.
3. Pages-Projekt → Settings → Builds → **Deploy hooks** → Hook anlegen, URL kopieren.
4. Workers & Pages → Create → Worker → Inhalt von `varianten/cloudflare/worker.js` einfügen → Deploy. Settings → Variables → Secret `DEPLOY_HOOK` = Hook-URL. Settings → Triggers → Cron `0 */6 * * *`.
5. Custom Domain im Pages-Projekt eintragen.

## Lokal testen
`ICS_FILE=test.ics node build.js` und `dist/index.html` im Browser öffnen.

## Rechtliches
Impressum und Datenschutz sind Vorlagen, keine Rechtsberatung. Datenschutz nennt den Hoster über `HOSTER`. Wer Embeds, Analytics oder Google Fonts ergänzt, muss den Text anpassen.
