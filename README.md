# Pokémon GO databáze

Statická webová aplikace (čistý HTML/CSS/JS, žádný build krok). Stačí otevřít
`index.html` v prohlížeči — nebo soubory nasadit na libovolný statický hosting.

## Co aplikace umí

- **Vyhledávání** konkrétního Pokémona podle jména (část názvu, bez rozlišení
  velikosti písmen) nebo čísla v Pokédexu. Aplikace je určená k dohledání
  jednoho Pokémona, proto nemá žádné filtry podle typu, generace ani formy.
- **Přehled** všech Pokémonů s obrázkem z PokeAPI sprites.
- **Detailní karta** vybraného Pokémona: velký oficiální artwork, typy, základní
  statistiky a pro každou ligu (Malá 500 CP, Velká 1500 CP, Ultra 2500 CP,
  Mistrovská bez limitu):
  - pořadí a skóre v žebříčku PvPoke (pokud se žebříčky podaří načíst),
  - **hvězdičkové hodnocení ligy** (0–5 ★ podle skóre PvPoke, se slovním
    stupněm od „Nevhodné“ po „Absolutní špička“) a **graf rolí v týmu** –
    sloupce vedoucí / střídač / zavírač / útočník z dílčích skóre PvPoke,
    nejsilnější role je zvýrazněná,
  - **grafy vlastností útoků** místo textových popisů: u rychlého útoku
    sloupce energie/tah a poškození/tah, u nabitých síla a cena v energii
    (počítáno z PvP parametrů v gamemasteru PvPoke), plus odznaky STAB
    a efektů na statistiky (např. ↓ útok soupeře),
  - nejlepší útoky z pole `moveset` v žebříčcích PvPoke pro danou ligu
    (rychlý útok + až dva nabité). Když Pokémon v žebříčku dané ligy není,
    použije se jeho moveset z jiné ligy nebo ze skupin PvPoke; samotný výpis
    všech dostupných útoků Pokémona se nezobrazuje),
  - odkaz na ideální PvP moveset podle GamePressu (dnes PokéBase) u každého
    Pokémona. GamePress oddělené movesety podle lig nevede – uvádí jeden
    společný nejlepší PvP moveset; jeho datové API je zamčené, proto aplikace
    na stránku Pokémona odkazuje (přesný odkaz ověřuje přes veřejné
    vyhledávací API PokéBase),
  - top 3 ideální IV kombinace s levelem, CP a příznakem, zda jsou potřeba
    XL bonbóny (level nad 40). Pro Mistrovskou ligu je ideál 15/15/15 na levelu 51.
- **IV kalkulačka**: po výběru Pokémona zadej IV (útok/obrana/výdrž 0–15) a ligu
  — ukáže pořadí kombinace ze všech 4096, nejlepší level, CP a součin statistik.

## Jak se počítají ideální IV

Pro každou z 4096 kombinací IV se najde nejvyšší level (1–51 s krokem 0,5),
na kterém se Pokémon vejde pod CP limit ligy, a kombinace se seřadí podle
součinu statistik (stat product):

- CP = floor((útok + IV) × √(obrana + IV) × √(výdrž + IV) × CPM² / 10)
- efektivní statistika = (základ + IV) × CPM
- součin statistik = efektivní útok × efektivní obrana × efektivní výdrž

CPM je tabulka Combat Power Multiplieru pro levely 1–51, převzatá z PvPoke
(soubor `src/js/pokemon/Pokemon.js`): level 40 = 0,7903, level 50 = 0,8403,
level 51 = 0,8453.

## Zdroje dat (načítají se při otevření stránky)

- PvPoke, otevřená data z repozitáře `pvpoke/pvpoke`:
  `src/data/gamemaster/pokemon.json`, `src/data/gamemaster/moves.json`,
  `src/data/groups/great.json`, `ultra.json`, `master.json` a žebříčky
  `src/data/rankings/all/overall/rankings-1500.json`, `rankings-2500.json`,
  `rankings-10000.json` a `src/data/rankings/little/overall/rankings-500.json`
  (žebříčky obsahují i nejlepší útoky v poli `moveset`; jsou nepovinné — při
  chybě načtení se pořadí/skóre nezobrazí a aplikace funguje dál).
- Obrázky: PokeAPI sprites
  (`raw.githubusercontent.com/PokeAPI/sprites/...`). Chybějící obrázek se
  skryje, aplikace nespadne.

## Vývoj

Aplikace nepotřebuje žádný build ani server. Pro místní test stačí soubory
otevřít v prohlížeči (pozor: některé prohlížeče blokují `fetch` z `file://`
adresy — pak soubory naservíruj třeba příkazem `python3 -m http.server`).
