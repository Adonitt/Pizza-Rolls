# Rolls Pizza & Coffee

Website në shqip për Rolls Pizza & Coffee në Podujevë, ndërtuar me React dhe Vite. Klienti zgjedh produktet, përgatit porosinë për dërgesë ose marrje në lokal dhe e dërgon si mesazh të paraplotësuar në WhatsApp.

## Teknologjitë

- React 19 për komponentët dhe gjendjen e shportës
- Vite për zhvillim dhe build
- CSS i personalizuar për dizajnin responsive
- JavaScript modules për totalet, orarin, validimin dhe WhatsApp
- JSON për menynë dhe të dhënat e biznesit

## Skedarët kryesorë

- `src/App.jsx`: ndërfaqja React dhe komponentët e faqes
- `src/data/menu.json`: kategoritë, produktet dhe çmimet në centë
- `src/data/business.json`: telefoni, lokacioni, orari dhe zonat e dërgesës
- `src/lib/order.js`: logjika e shportës, validimi dhe mesazhi WhatsApp
- `src/styles.css`: dizajni i plotë responsive
- `public/assets`: logoja, menyja origjinale dhe favicon

## Komandat

```bash
npm install
npm run dev
npm test
npm run build
npm run preview
```

Build-i i publikueshëm krijohet në `dist`. Shporta ruhet vetëm në shfletuesin e klientit; faqja nuk ka server, panel administrimi ose pagesë online.
