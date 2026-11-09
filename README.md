# Pokémon GO databáze

Statická webová aplikace (čistý HTML/CSS/JS, žádný build krok). Stačí otevřít
`index.html` v prohlížeči — nebo soubory nasadit na libovolný statický hosting.

Ikona aplikace (lupa nad Pokéballem na modrém pozadí, návrh č. 4 vybraný
uživatelem 3. 11. 2026) je v souborech `icon-512.png` a `icon-192.png`
a je v `index.html` zapojená jako favicon i apple-touch-icon pro přidání
stránky na plochu telefonu.

## Co aplikace umí

- **Vyhledávání** konkrétního Pokémona podle jména (část názvu, bez rozlišení
  velikosti písmen) nebo čísla v Pokédexu. Aplikace je určená k dohledání
  jednoho Pokémona, proto nemá žádné filtry podle typu, generace ani formy.
- **Přehled** všech Pokémonů s obrázkem z PokeAPI sprites.
- **Historie vyhledávání**: pod vyhledávacím polem se jako posuvný proužek
  kulatých tlačítek (obrázek, jméno a číslo v Pokédexu) ukazuje posledních
  10 zobrazených Pokémonů, nejnovější první. Kliknutí znovu otevře kartu,
  opakované otevření stejného Pokémona ho jen přesune na začátek (bez
  duplicit). Historie se ukládá do `localStorage` prohlížeče, takže vydrží
  i po obnovení stránky, a jde vymazat tlačítkem „Vymazat“. Když je historie
  prázdná, proužek se nezobrazuje.
- **Detailní karta** vybraného Pokémona: velký oficiální artwork, typy, základní
  statistiky, **přepínač vývojových fází** (posuvný pás tlačítek s obrázky
  všech fází řady z evolučních řetězců PokeAPI, seřazených podle stupně
  vývoje; kliknutí otevře kartu dané fáze) a pro každou ligu, ve které je
  Pokémon hodnocený (Malá 500 CP, Velká 1500 CP, Ultra 2500 CP, Mistrovská
  bez limitu). Liga, ve které Pokémon hodnocený není, se na kartě vůbec
  nezobrazuje; když není hodnocený v žádné lize, ukáže se místo lig jen
  stručná poznámka:
  - pořadí a skóre v žebříčku PvPoke (pokud se žebříčky podaří načíst),
  - **hvězdičkové hodnocení ligy** (0–5 ★ podle skóre PvPoke, se slovním
    stupněm od „Nevhodné“ po „Absolutní špička“) a **graf rolí v týmu** –
    sloupce vedoucí / střídač / zavírač / útočník z dílčích skóre PvPoke,
    nejsilnější role je zvýrazněná,
  - **top 3 ideální IV kombinace** s levelem, CP a příznakem, zda jsou
    potřeba XL bonbóny (level nad 40) — tabulka ideálních IV je v bloku
    ligy na prvním místě, hned za hodnocením a ještě před nejlepšími
    útoky. Pro Mistrovskou ligu je ideál 15/15/15 na levelu 51,
  - nejlepší útoky z pole `moveset` v žebříčcích PvPoke pro danou ligu
    (rychlý útok + až dva nabité). Když žebříček dané ligy moveset
    neobsahuje, použije se moveset z jiné ligy nebo ze skupin PvPoke;
    samotný výpis všech dostupných útoků Pokémona se nezobrazuje),
  - **grafy vlastností útoků** místo textových popisů: u rychlého útoku
    sloupce energie/tah a poškození/tah, u nabitých síla a cena v energii
    (počítáno z PvP parametrů v gamemasteru PvPoke), plus odznaky STAB
    a efektů na statistiky (např. ↓ útok soupeře).
- **Hodnocení pro gymy a raidy** (blok „Gymy a raidy“ na konci karty, pod
  ligami): hvězdičkové hodnocení 0–5 ★ se stejnými slovními stupni jako
  u lig, sloupce poškození za sekundu (DPS) a celkového poškození (TDO,
  jako % nejlepšího Pokémona) a **nejlepší útoky pro raidy** – rychlý
  a jeden nabitý útok s grafy vlastností z PvE parametrů (u rychlého
  poškození/s a energie/s, u nabitého síla a cena v energii) a odznaky
  STAB a efektů. Blok se ukazuje jen když se podaří načíst PvE data
  a pro daného Pokémona jde kombinace spočítat; samotný výpis všech
  dostupných útoků se ani tady nezobrazuje.
- **IV kalkulačka**: po výběru Pokémona zadej IV (útok/obrana/výdrž 0–15) —
  výsledky se ukážou pro všechny ligy najednou, liga se nevybírá. S jednou
  variantou je výsledek jedna tabulka (liga, pořadí ze všech 4096
  kombinací, level, CP). Součin statistik se v aplikaci nikde nezobrazuje
  (slouží jen vnitřně k určení pořadí kombinací).
  Tlačítkem „Přidat srovnání“ lze porovnat až deset různých IV kombinací
  najednou: pro každou ligu se ukáže vlastní srovnávací tabulka (varianta,
  IV, pořadí, level, CP) a nejlepší varianta se zvýrazní v každé lize
  zvlášť; přidané varianty jdou zase odebrat. Seznamy kombinací se pro
  daného Pokémona a ligu počítají jen jednou a sdílí se s tabulkami
  ideálních IV na kartě (cache), takže opakované výpočty jsou okamžité.

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

## Jak se počítá hodnocení pro gymy a raidy

Z celé sady útoků Pokémona (gamemaster PvPoke) se pro každou dvojici
rychlý + nabitý útok spočítá průměrné poškození za sekundu (DPS) v cyklu
„nabíjení rychlými útoky → nabitý útok“ a vybere se nejlepší dvojice.
Počítá se pro level 40 a IV 15/15/15 standardním vzorcem poškození
Pokémon GO proti neutrálnímu obránci (efektivní obrana z obrany 150):

- poškození zásahu = floor(0,5 × síla útoku × efektivní útok útočníka /
  efektivní obrana obránce × STAB) + 1, kde STAB = 1,2 při shodě typu
  útoku s typem Pokémona; u Shadow forem má útočník útok × 1,2 a obranu
  ÷ 1,2,
- PvE parametry útoků (síla, trvání v sekundách, energie) pocházejí
  z PogoAPI (`fast_moves.json`, `charged_moves.json`) — liší se od
  tahových PvP hodnot v gamemasteru PvPoke. Názvy útoků se mezi zdroji
  párují v normalizovaném tvaru (lišit se mohou zápisy jako „Weather
  Ball (Fire)“ vs. „Weather Ball Fire“),
- hvězdičky = DPS vůči nejvyššímu DPS ze všech Pokémonů, přepočtené
  stejně jako u lig (skóre 0–100, hvězdy = skóre / 20). Celkové
  poškození (TDO) = DPS × efektivní obrana × efektivní výdrž, uvádí se
  jako procento nejlepšího Pokémona.

Jde o neutrální odhad bez konkrétního raid bosse (bez typové
efektivity proti obránci a bez počasí); proti konkrétnímu bossovi se
pořadí útočníků podle typů může lišit.

## Zdroje dat (načítají se při otevření stránky)

- PvPoke, otevřená data z repozitáře `pvpoke/pvpoke`:
  `src/data/gamemaster/pokemon.json`, `src/data/gamemaster/moves.json`,
  `src/data/groups/great.json`, `ultra.json`, `master.json` a žebříčky
  `src/data/rankings/all/overall/rankings-1500.json`, `rankings-2500.json`,
  `rankings-10000.json` a `src/data/rankings/little/overall/rankings-500.json`
  (žebříčky obsahují i nejlepší útoky v poli `moveset`; jsou nepovinné — při
  chybě načtení se pořadí/skóre nezobrazí a aplikace funguje dál).
- PogoAPI (`pogoapi.net/api/v1/fast_moves.json` a `charged_moves.json`) —
  PvE parametry útoků pro hodnocení gymů a raidů. Také nepovinné: při
  chybě načtení se blok „Gymy a raidy“ na kartě jen nezobrazí.
- Obrázky: PokeAPI sprites
  (`raw.githubusercontent.com/PokeAPI/sprites/...`). Chybějící obrázek se
  skryje, aplikace nespadne.
- GamePress (dnes PokéBase, `pokebase.app`) — pouze referenční zdroj
  uvedený zde pro úplnost informací o tom, odkud se informace o ideálních
  PvP movesetech ověřovaly. GamePress oddělené movesety podle lig nevede –
  uvádí jeden společný nejlepší PvP moveset pro všechny ligy a podle lig se
  liší jen ideální IV; jeho datové API pro movesety je zamčené. Aplikace
  sama na PokéBase neodkazuje a data z něj nenačítá — hvězdičkové hodnocení,
  role v týmu i grafy u útoků se počítají z dat PvPoke popsaných výše a tyto
  vysvětlivky jsou záměrně jen v tomto README, ne v aplikaci.

## Vývoj

Aplikace nepotřebuje žádný build ani server. Pro místní test stačí soubory
otevřít v prohlížeči (pozor: některé prohlížeče blokují `fetch` z `file://`
adresy — pak soubory naservíruj třeba příkazem `python3 -m http.server`).
