
## Ovládání a novinky (listopad 2026)

- **Karta Pokémona je samostatná obrazovka** s tlačítkem „← Zpět na seznam“. Seznam si pamatuje místo, kde jsi byl. Každý Pokémon má vlastní odkaz (`index.html#charizard`), funguje tlačítko Zpět v prohlížeči.
- **Hledání** ignoruje diakritiku (Flabebe = Flabébé), má tlačítko ✕, Enter otevře první výsledek a pole zůstává nahoře při scrollování.
- **IV kalkulačka je přímo pod kartou** Pokémona. IV jdou zadat tlačítky +/− nebo rychle jako `15/14/13`; výsledek se přepočítá hned při změně.
- **Karta lig a raidů je skládací** (první liga je rozbalená, v záhlaví je hodnocení ★ a pořadí). Nový blok **Slabiny a odolnosti** podle typů (násobky 1,6 / 0,625 / 0,39).
- **Oblíbení** (☆ na kartě i v seznamu, záložka ⭐ Oblíbení) se ukládají do `localStorage`.
- **Srovnání dvou Pokémonů** (záložka Srovnat): základní statistiky, hvězdičky lig a raidů, lepší hodnota se zvýrazní.
- **Tmavý režim** podle telefonu, tlačítko vpravo nahoře přepíná auto / tmavý / světlý.
- **Offline a rychlý start:** `sw.js` ukládá aplikaci i data do cache (stale-while-revalidate, nová data se projeví při dalším otevření) a `manifest.webmanifest` umožňuje instalaci na plochu. Funguje jen při nasazení na https nebo na `localhost`, ne z `file://`.
