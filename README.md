# Rolls Pizza & Coffee

Faqe statike në shqip për menynë dhe porositë përmes WhatsApp. Nuk ruan porosi në server dhe nuk ka panel administrimi ose pagesë online.

## Përmbajtja

- `dist/data/menu.json`: kategoritë dhe produktet. Çmimet shkruhen në centë (`250` = 2,50 €). Çdo pizzë ka katër madhësi në `variants`; sanduiçët, pijet dhe salcat kanë `priceCents`.
- `dist/data/business.json`: numri, adresa, orari, zonat e dërgesës dhe çelësi `orderingEnabled`. Ditët janë 0 = e diel deri 6 = e shtunë; orari 10:00–02:00 kalon mesnatën. Për dërgesë falas, çdo zonë ka `feeCents: 0`.
- `dist/assets/rolls-logo.jpg`: logoja e dërguar nga përdoruesi. `menu-original.png` është fotoja e menusë për krahasim.

Porositë aktivizohen vetëm kur `orderingEnabled` është `true`, produktet ekzistojnë dhe ora aktuale bie brenda orarit. Para aktivizimit, plotëso zonat reale të dërgesës dhe adresën e saktë të lokalit në `business.json`, pastaj verifiko të dhënat e menusë me pizzerinë. Lidhja e hartës shfaqet vetëm pasi të jetë plotësuar adresa. Për mbyllje të përkohshme përdor `orderingEnabled: false` ose shto datën te `specialClosures` në formatin YYYY-MM-DD, pastaj publiko sërish.

Klienti e përgatit porosinë në faqe. Dërgimi bëhet vetëm pasi ai shtyp “Dërgo” në WhatsApp; stafi e konfirmon atje. Shporta ruhet vetëm në shfletuesin e klientit.

## Kontroll lokal

Nga folderi `site`: `node --test tests/*.test.mjs`. Për ta parë faqen, shërbe `dist` me një server lokal HTTP; hapja direkte si skedar nuk e ngarkon JSON-in.
