// Pokémon GO databáze — čistý HTML/CSS/JS, bez build kroku.
// Data se načítají z otevřených dat PvPoke, obrázky z PokeAPI sprites.

var PVPOKE_BASE = 'https://raw.githubusercontent.com/pvpoke/pvpoke/master/src/data/';
var POGOAPI_BASE = 'https://pogoapi.net/api/v1/';
var SPRITE_BASE = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/';
var ARTWORK_BASE = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/';

// CPM pro levely 1 až 51 s krokem 0,5 (index i => level 1 + i * 0,5).
// Hodnoty převzaté z PvPoke (src/js/pokemon/Pokemon.js): level 40 = 0,7903,
// level 50 = 0,8403, level 51 = 0,8453.
var CPM = [
  0.0939999967813491, 0.135137430784308, 0.166397869586944, 0.192650914456886,
  0.215732470154762, 0.236572655026622, 0.255720049142837, 0.273530381100769,
  0.290249884128570, 0.306057381335773, 0.321087598800659, 0.335445032295077,
  0.349212676286697, 0.362457748778790, 0.375235587358474, 0.387592411085168,
  0.399567276239395, 0.411193549517250, 0.422500014305114, 0.432926413410414,
  0.443107545375824, 0.453059953871985, 0.462798386812210, 0.472336077786704,
  0.481684952974319, 0.490855810259008, 0.499858438968658, 0.508701756943992,
  0.517393946647644, 0.525942508771329, 0.534354329109191, 0.542635762230353,
  0.550792694091796, 0.558830599438087, 0.566754519939422, 0.574569148039264,
  0.582278907299041, 0.589887911977272, 0.597400009632110, 0.604823657502073,
  0.612157285213470, 0.619404110566050, 0.626567125320434, 0.633649181622743,
  0.640652954578399, 0.647580963301656, 0.654435634613037, 0.661219263506722,
  0.667934000492096, 0.674581899290818, 0.681164920330047, 0.687684905887771,
  0.694143652915954, 0.700542893277978, 0.706884205341339, 0.713169102333341,
  0.719399094581604, 0.725575616972598, 0.731700003147125, 0.734741011137376,
  0.737769484519958, 0.740785574597326, 0.743789434432983, 0.746781208702482,
  0.749761044979095, 0.752729105305821, 0.755685508251190, 0.758630366519684,
  0.761563837528228, 0.764486065255226, 0.767397165298461, 0.770297273971590,
  0.773186504840850, 0.776064945942412, 0.778932750225067, 0.781790064808426,
  0.784636974334716, 0.787473583646825, 0.790300011634826, 0.792803950958807,
  0.795300006866455, 0.797803921486970, 0.800300002098083, 0.802803892322847,
  0.805299997329711, 0.807803863460723, 0.810299992561340, 0.812803834895026,
  0.815299987792968, 0.817803806620319, 0.820299983024597, 0.822803778631297,
  0.825299978256225, 0.827803750922782, 0.830299973487854, 0.832803753381377,
  0.835300028324127, 0.837803755931569, 0.840300023555755, 0.842803729034748,
  0.845300018787384
];

function levelOf(index) { return 1 + index * 0.5; }

// CP = floor((útok + IV) * sqrt(obrana + IV) * sqrt(výdrž + IV) * CPM^2 / 10)
function cpFor(base, iv, cpm) {
  return Math.floor(
    (base.atk + iv[0]) * Math.sqrt(base.def + iv[1]) * Math.sqrt(base.hp + iv[2]) * cpm * cpm / 10
  );
}

// Součin statistik s CPM: (základ + IV) * CPM pro každou statistiku.
function productFor(base, iv, cpm) {
  return (base.atk + iv[0]) * cpm * ((base.def + iv[1]) * cpm) * ((base.hp + iv[2]) * cpm);
}

// Nejvyšší level, na kterém se daná IV kombinace vejde pod CP limit.
// CP s levelem roste, takže při prvním překročení limitu můžeme skončit.
function bestLevel(base, iv, cap) {
  var best = null;
  for (var i = 0; i < CPM.length; i++) {
    var cp = cpFor(base, iv, CPM[i]);
    if (cp <= cap) {
      best = { level: levelOf(i), cp: cp, product: productFor(base, iv, CPM[i]) };
    } else {
      break;
    }
  }
  return best;
}

// Všechny 4096 IV kombinace seřazené podle součinu statistik (sestupně).
function rankAllIVs(base, cap) {
  var list = [];
  for (var a = 0; a < 16; a++) {
    for (var d = 0; d < 16; d++) {
      for (var s = 0; s < 16; s++) {
        var b = bestLevel(base, [a, d, s], cap);
        if (b) list.push({ iv: [a, d, s], level: b.level, cp: b.cp, product: b.product });
      }
    }
  }
  list.sort(function (x, y) { return y.product - x.product || y.level - x.level; });
  return list;
}

// Pořadí dané IV kombinace vůči už seřazenému seznamu všech kombinací:
// 1 + počet kombinací s vyšším součinem statistik.
function rankFromList(list, base, iv, cap) {
  var mine = bestLevel(base, iv, cap);
  if (!mine) return { mine: null, rank: null };
  var rank = 1;
  for (var i = 0; i < list.length; i++) {
    if (list[i].product > mine.product + 1e-9) rank++;
    else break;
  }
  return { mine: mine, rank: rank };
}

// Pořadí dané IV kombinace: 1 + počet kombinací s vyšším součinem statistik.
function rankOfIV(base, iv, cap) {
  var list = rankAllIVs(base, cap);
  var r = rankFromList(list, base, iv, cap);
  return { list: list, mine: r.mine, rank: r.rank };
}

// Srovnání až deseti různých IV kombinací pro stejnou ligu. Seznam všech
// 4096 kombinací se počítá jen jednou a každá varianta se vůči němu jen
// zařadí. Výsledek drží pořadí variant, jak je uživatel zadal, a označuje
// nejlepší z nich (vnitřně podle součinu statistik – ten se v aplikaci
// nikde nezobrazuje, slouží jen k určení pořadí kombinací).
var COMPARE_LIMIT = 10;
function markBest(results) {
  var bestProduct = null;
  results.forEach(function (r) {
    if (r.mine && (bestProduct === null || r.mine.product > bestProduct)) bestProduct = r.mine.product;
  });
  results.forEach(function (r) {
    if (r.mine && bestProduct !== null) r.isBest = Math.abs(r.mine.product - bestProduct) < 1e-9;
  });
}

function compareIVs(base, ivs, cap) {
  var list = rankAllIVs(base, cap);
  var results = ivs.slice(0, COMPARE_LIMIT).map(function (iv) {
    var r = rankFromList(list, base, iv, cap);
    return { iv: iv.slice(), mine: r.mine, rank: r.rank, isBest: false };
  });
  markBest(results);
  return { list: list, results: results };
}

// Seznam všech kombinací pro daného Pokémona a ligu. Sdílí cache
// s tabulkami ideálních IV na kartě (ivCache), takže se stejný seznam
// pro stejného Pokémona a ligu nepočítá opakovaně.
function rankedListFor(p, cap) {
  var key = p.speciesId + ':' + cap;
  if (!ivCache[key]) ivCache[key] = rankAllIVs(p.baseStats, cap);
  return ivCache[key];
}

// Srovnání variant pro konkrétního Pokémona přes sdílenou cache seznamů.
function compareForPokemon(p, ivs, cap) {
  var list = rankedListFor(p, cap);
  var results = ivs.slice(0, COMPARE_LIMIT).map(function (iv) {
    var r = rankFromList(list, p.baseStats, iv, cap);
    return { iv: iv.slice(), mine: r.mine, rank: r.rank, isBest: false };
  });
  markBest(results);
  return { list: list, results: results };
}

// ---------- Názvy typů česky ----------
var TYPE_NAMES = {
  normal: 'Normální', fire: 'Ohnivý', water: 'Vodní', grass: 'Travní',
  electric: 'Elektrický', ice: 'Ledový', fighting: 'Bojový', poison: 'Jedový',
  ground: 'Zemní', flying: 'Létající', psychic: 'Psychický', bug: 'Hmyzí',
  rock: 'Kamenný', ghost: 'Duchovní', dragon: 'Dračí', dark: 'Temný',
  steel: 'Ocelový', fairy: 'Vílí', none: ''
};
var TYPE_COLORS = {
  normal: '#a8a77a', fire: '#ee8130', water: '#6390f0', grass: '#7ac74c',
  electric: '#f7d02c', ice: '#96d9d6', fighting: '#c22e28', poison: '#a33ea1',
  ground: '#e2bf65', flying: '#a98ff3', psychic: '#f95587', bug: '#a6b91a',
  rock: '#b6a136', ghost: '#735797', dragon: '#6f35fc', dark: '#705746',
  steel: '#b7b7ce', fairy: '#d685ad'
};

function prettyMoveId(id) {
  return id.toLowerCase().split('_').map(function (w) {
    return w.charAt(0).toUpperCase() + w.slice(1);
  }).join(' ');
}

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ---------- Stav aplikace ----------
var pokemon = [];
var moveNames = {};
var moveData = {}; // moveId -> { name, type, power, energy, energyGain, turns, buffs, buffTarget, buffApplyChance }
var groups = {};    // league key -> { speciesId: { fastMove, chargedMoves } }
var rankings = {};  // league key -> { speciesId: { rank, score, moveset, scores } }
var pveFast = {};   // normalizovaný název útoku -> PvE parametry rychlého útoku (gymy/raidy)
var pveCharged = {}; // normalizovaný název útoku -> PvE parametry nabitého útoku (gymy/raidy)
var raidMax = null; // { dps, tdo } nejlepší hodnoty přes všechny Pokémony, počítá se po načtení dat
var raidCache = {}; // speciesId -> výsledek bestRaidSet (nebo null)
var selected = null;
var filtered = [];
var shownCount = 0;
var PAGE_SIZE = 100;
var ivCache = {};   // speciesId + cap -> ranked list

// ---------- Historie vyhledávání ----------
// Posledních 10 zobrazených Pokémonů, nejnovější první. Ukládá se do
// localStorage, takže vydrží i po obnovení stránky; když localStorage
// není dostupné, drží se historie jen v paměti.
var HISTORY_KEY = 'pokemon-go-db-history-v1';
var HISTORY_LIMIT = 10;
var searchHistory = loadHistory();

function loadHistory() {
  try {
    var raw = localStorage.getItem(HISTORY_KEY);
    var arr = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(arr)) return [];
    return arr.filter(function (e) { return e && e.speciesId && e.speciesName; }).slice(0, HISTORY_LIMIT);
  } catch (e) { return []; }
}

function saveHistory() {
  try { localStorage.setItem(HISTORY_KEY, JSON.stringify(searchHistory)); } catch (e) { /* běží dál jen v paměti */ }
}

function addToHistory(p) {
  if (!p || !p.speciesId) return;
  searchHistory = searchHistory.filter(function (e) { return e.speciesId !== p.speciesId; });
  searchHistory.unshift({ speciesId: p.speciesId, speciesName: p.speciesName, dex: (typeof p.dex === 'number' ? p.dex : null) });
  if (searchHistory.length > HISTORY_LIMIT) searchHistory = searchHistory.slice(0, HISTORY_LIMIT);
  saveHistory();
  renderHistory();
}

function clearHistory() {
  searchHistory = [];
  saveHistory();
  renderHistory();
}

function renderHistory() {
  var box = document.getElementById('historyBox');
  if (!box) return;
  if (!searchHistory.length) { box.innerHTML = ''; return; }
  var chips = searchHistory.map(function (e) {
    var img = (typeof e.dex === 'number')
      ? '<img src="' + SPRITE_BASE + e.dex + '.png" alt="" loading="lazy" onerror="this.style.display=\'none\'">'
      : '';
    return '<button type="button" class="hist-chip" data-hist="' + esc(e.speciesId) + '">' + img +
      '<span class="h-name">' + esc(e.speciesName) + '</span>' +
      '<span class="h-dex">#' + (typeof e.dex === 'number' ? e.dex : '?') + '</span></button>';
  }).join('');
  box.innerHTML = '<div class="history"><div class="history-head">' +
    '<span class="history-title">🕘 Historie vyhledávání</span>' +
    '<button type="button" class="history-clear" id="historyClear">Vymazat</button></div>' +
    '<div class="history-strip">' + chips + '</div></div>';
  box.querySelectorAll('.hist-chip').forEach(function (chip) {
    chip.addEventListener('click', function () {
      var target = pokemon.find(function (x) { return x.speciesId === chip.dataset.hist; });
      if (target) showDetail(target);
    });
  });
  var clearBtn = document.getElementById('historyClear');
  if (clearBtn) clearBtn.addEventListener('click', clearHistory);
}

var LEAGUES = [
  { key: 'little', label: 'Malá liga', cap: 500, groupFile: null, rankPath: 'rankings/little/overall/rankings-500.json' },
  { key: 'great', label: 'Velká liga', cap: 1500, groupFile: 'great', rankPath: 'rankings/all/overall/rankings-1500.json' },
  { key: 'ultra', label: 'Ultra liga', cap: 2500, groupFile: 'ultra', rankPath: 'rankings/all/overall/rankings-2500.json' },
  { key: 'master', label: 'Mistrovská liga', cap: Infinity, groupFile: 'master', rankPath: 'rankings/all/overall/rankings-10000.json' }
];

function fetchJson(url) {
  return fetch(url).then(function (r) {
    if (!r.ok) throw new Error('HTTP ' + r.status + ' pro ' + url);
    return r.json();
  });
}

function groupMap(arr) {
  var map = {};
  if (Array.isArray(arr)) {
    arr.forEach(function (e) {
      if (e && e.speciesId) map[e.speciesId] = e;
    });
  }
  return map;
}

function rankingMap(arr) {
  var map = {};
  if (Array.isArray(arr)) {
    arr.forEach(function (e, i) {
      if (e && e.speciesId) {
        map[e.speciesId] = {
          rank: i + 1,
          score: (typeof e.score === 'number' ? e.score : (typeof e.rating === 'number' ? e.rating : null)),
          moveset: (Array.isArray(e.moveset) ? e.moveset : []).filter(function (m) {
            return m && m !== 'none';
          }),
          scores: (Array.isArray(e.scores) ? e.scores : null)
        };
      }
    });
  }
  return map;
}

function moveName(id, isFast) {
  if (moveNames[id]) return moveNames[id];
  return prettyMoveId(id);
}

// Nejlepší útoky Pokémona pro danou ligu. Hlavní zdroj je pole moveset
// v žebříčcích PvPoke pro danou ligu ([rychlý, nabitý, nabitý]). Když tam
// Pokémon není (např. v Malé lize smí jen některé druhy), vezme se jeho
// moveset z jiné ligy, případně ze skupin PvPoke – pořád jde o nejlepší
// známý PvP set daného Pokémona, ne o výpis všech jeho útoků.
function recommendedMoves(p, league) {
  var ids = [p.speciesId, p.speciesId.replace(/_shadow$/, '')];
  var leagueOrder = [league.key, 'great', 'ultra', 'master', 'little'];
  var seen = {};
  for (var li = 0; li < leagueOrder.length; li++) {
    var lk = leagueOrder[li];
    if (seen[lk]) continue;
    seen[lk] = true;
    var map = rankings[lk];
    if (!map) continue;
    for (var ii = 0; ii < ids.length; ii++) {
      var entry = map[ids[ii]];
      if (entry && entry.moveset && entry.moveset.length >= 2) {
        return {
          recommended: true,
          fast: moveName(entry.moveset[0]),
          fastId: entry.moveset[0],
          charged: entry.moveset.slice(1).map(function (m) { return moveName(m); }),
          chargedIds: entry.moveset.slice(1)
        };
      }
    }
  }
  var groupFiles = [league.groupFile, 'great', 'ultra', 'master'];
  var g = null;
  for (var gi = 0; gi < groupFiles.length && !g; gi++) {
    var gf = groupFiles[gi];
    if (gf && groups[gf]) {
      g = groups[gf][p.speciesId] || groups[gf][p.speciesId.replace(/_shadow$/, '')] || null;
    }
  }
  if (g && g.fastMove) {
    return {
      recommended: true,
      fast: moveName(g.fastMove),
      fastId: g.fastMove,
      charged: (g.chargedMoves || []).map(function (m) { return moveName(m); }),
      chargedIds: (g.chargedMoves || []).slice()
    };
  }
  return { recommended: false };
}

function topIVs(p, league) {
  if (league.cap === Infinity) {
    var cpm = CPM[CPM.length - 1];
    return [{
      iv: [15, 15, 15], level: 51,
      cp: cpFor(p.baseStats, [15, 15, 15], cpm),
      product: productFor(p.baseStats, [15, 15, 15], cpm)
    }];
  }
  var key = p.speciesId + ':' + league.cap;
  if (!ivCache[key]) ivCache[key] = rankAllIVs(p.baseStats, league.cap);
  return ivCache[key].slice(0, 3);
}

function ivRow(r) {
  var xl = r.level > 40 ? ' <span class="xl">(potřeba XL bonbóny)</span>' : '';
  return '<tr><td>' + r.iv.join('/') + '</td><td>' + r.level + xl + '</td><td>' +
    r.cp + ' CP</td></tr>';
}

// ---------- Vykreslování ----------
function typeChips(types) {
  return (types || []).filter(function (t) { return t && t !== 'none'; }).map(function (t) {
    var bg = TYPE_COLORS[t] || '#667085';
    return '<span class="chip" style="background:' + bg + '">' + esc(TYPE_NAMES[t] || t) + '</span>';
  }).join('');
}

function applySearch() {
  var q = fold(document.getElementById('search').value).trim();
  document.getElementById('searchClear').hidden = !q;
  var isNum = q !== '' && /^\d+$/.test(q);
  filtered = pokemon.filter(function (p) {
    if (!q) return true;
    var nameHit = (p._n || (p._n = fold(p.speciesName))).indexOf(q) !== -1;
    var dexHit = isNum && typeof p.dex === 'number' && String(p.dex).indexOf(q) === 0;
    return nameHit || dexHit;
  });
  shownCount = 0;
  document.getElementById('count').textContent =
    'Nalezeno: ' + filtered.length.toLocaleString('cs-CZ') + ' Pokémonů';
  renderGrid(true);
}

function renderGrid(reset) {
  var grid = document.getElementById('grid');
  if (reset) grid.innerHTML = '';
  var next = filtered.slice(shownCount, shownCount + PAGE_SIZE);
  var html = '';
  next.forEach(function (p) {
    var img = (typeof p.dex === 'number')
      ? '<img src="' + SPRITE_BASE + p.dex + '.png" alt="" loading="lazy" onerror="this.style.display=\'none\'">'
      : '';
    html += '<div class="poke-card" data-id="' + esc(p.speciesId) + '">' + favStar(p.speciesId) + img +
      '<div class="dex">#' + (typeof p.dex === 'number' ? p.dex : '?') + '</div>' +
      '<div class="name">' + esc(p.speciesName) + '</div>' +
      '<div class="types">' + (p.types || []).filter(function (t) { return t !== 'none'; })
        .map(function (t) { return TYPE_NAMES[t] || t; }).join(' / ') + '</div></div>';
  });
  grid.insertAdjacentHTML('beforeend', html);
  shownCount += next.length;
  document.getElementById('loadMore').style.display =
    (shownCount < filtered.length) ? 'block' : 'none';
  grid.querySelectorAll('.poke-card').forEach(function (card) {
    if (!card.dataset.bound) {
      card.dataset.bound = '1';
      card.addEventListener('click', function (e) {
        if (e.target.closest('.fav-star')) { toggleFav(card.dataset.id); return; }
        var p = pokemon.find(function (x) { return x.speciesId === card.dataset.id; });
        if (p) showDetail(p);
      });
    }
  });
}

// ---------- Grafické znázornění: hvězdičky, role v týmu, vlastnosti útoků ----------
// Textové popisy se negenerují – vše se ukazuje graficky z dat PvPoke
// (skóre v žebříčku, dílčí skóre rolí a PvP parametry útoků v gamemasteru).
function fmtNum(x) {
  return (Math.round(x * 10) / 10).toString().replace('.', ',');
}

function meterRow(label, pct, valueText, cls) {
  var w = Math.max(0, Math.min(100, Math.round(pct)));
  return '<div class="meter"><span class="lbl">' + esc(label) + '</span>' +
    '<span class="track"><span class="fill ' + cls + '" style="display:block;width:' + w + '%"></span></span>' +
    '<span class="val">' + esc(valueText) + '</span></div>';
}

var STAR_LABELS = ['Nevhodné', 'Slabá volba', 'Omezená volba', 'Silná volba', 'Výborná volba', 'Absolutní špička'];
function starsInfo(score) {
  if (typeof score !== 'number') return null;
  var n = Math.max(0, Math.min(5, Math.round(score / 20)));
  var s = '';
  for (var i = 0; i < 5; i++) s += (i < n ? '★' : '☆');
  return { stars: s, label: STAR_LABELS[n] };
}

// Dílčí skóre rolí v poli scores žebříčku: [celkem, konzistence, lead, switch, closer, charger]
var ROLE_DEFS = [
  { idx: 2, label: 'Vedoucí' },
  { idx: 3, label: 'Střídač' },
  { idx: 4, label: 'Zavírač' },
  { idx: 5, label: 'Útočník' }
];
function roleRowsHtml(entry) {
  if (!entry || !Array.isArray(entry.scores)) return '';
  var best = -1, bestVal = -1;
  ROLE_DEFS.forEach(function (r) {
    var v = entry.scores[r.idx];
    if (typeof v === 'number' && v > bestVal) { bestVal = v; best = r.idx; }
  });
  if (best < 0) return '';
  var rows = ROLE_DEFS.map(function (r) {
    var v = entry.scores[r.idx];
    if (typeof v !== 'number') return '';
    return meterRow(r.label + (r.idx === best ? ' ★' : ''), v, fmtNum(v),
      r.idx === best ? 'role-best' : 'role');
  }).join('');
  return '<div style="margin:6px 0"><p style="margin:2px 0"><strong>Role v týmu</strong> (★ = nejsilnější role):</p>' + rows + '</div>';
}

function buffBadge(move) {
  if (!move || !Array.isArray(move.buffs)) return '';
  var atk = move.buffs[0] || 0, def = move.buffs[1] || 0;
  if (!atk && !def) return '';
  var chance = parseFloat(move.buffApplyChance);
  var parts = [];
  if (atk) parts.push((atk > 0 ? '↑' : '↓') + ' útok ' + (atk > 0 ? '+' : '') + atk);
  if (def) parts.push((def > 0 ? '↑' : '↓') + ' obrana ' + (def > 0 ? '+' : '') + def);
  var txt = parts.join(', ') + (move.buffTarget === 'self' ? ' (vlastní)' : ' (soupeř)');
  if (!isNaN(chance) && chance < 1) txt += ' · ' + Math.round(chance * 100) + ' %';
  return '<span class="badge">' + esc(txt) + '</span>';
}

function stabBadge(p, move) {
  if (move && (p.types || []).indexOf(move.type) !== -1) return '<span class="badge">STAB</span>';
  return '';
}

function fastMoveHtml(p, id, name) {
  var m = moveData[id];
  var html = '<div class="move"><strong>' + esc(name) + '</strong> (rychlý útok)' + stabBadge(p, m) + buffBadge(m);
  if (m && m.turns) {
    var ept = (m.energyGain || 0) / m.turns;
    var dpt = (m.power || 0) / m.turns;
    html += meterRow('Energie / tah', ept / 5 * 100, fmtNum(ept), 'energy');
    html += meterRow('Poškození / tah', dpt / 5 * 100, fmtNum(dpt), 'dmg');
  }
  return html + '</div>';
}

function chargedMoveHtml(p, id, name) {
  var m = moveData[id];
  var html = '<div class="move"><strong>' + esc(name) + '</strong> (nabitý útok)' + stabBadge(p, m) + buffBadge(m);
  if (m) {
    var costCls = m.energy <= 45 ? 'cost-low' : (m.energy <= 60 ? 'cost-mid' : 'cost-high');
    html += meterRow('Síla', (m.power || 0) / 150 * 100, String(m.power || 0), 'power');
    html += meterRow('Cena (energie)', (m.energy || 0), String(m.energy || 0), costCls);
  }
  return html + '</div>';
}

// ---------- Gymy a raidy ----------
// Hodnocení pro gymy a raidy se počítá z PvE parametrů útoků (PogoAPI:
// síla, trvání a energie v reálném čase, ne tahové PvP hodnoty z PvPoke).
// Pro každého Pokémona se z jeho sad útoků (gamemaster PvPoke) vybere
// kombinace rychlý + nabitý útok s nejvyšším poškozením za sekundu (DPS)
// na levelu 40 s IV 15/15/15 proti neutrálnímu obránci (obrana 150),
// včetně STAB bonusu a bonusu +20 % útoku u Shadow forem. Hvězdičky se
// odvozují z DPS vůči nejlepšímu Pokémonovi stejně jako u lig (skóre/20).
var RAID_CPM = CPM[78]; // level 40
var RAID_DEFENDER_DEF = (150 + 15) * RAID_CPM;

// PogoAPI píše názvy jinak než PvPoke („Weather Ball Fire" místo
// „Weather Ball (Fire)", „Vice Grip" místo „Vise Grip"), proto se názvy
// porovnávají v normalizovaném tvaru a s pár ručními přezdívkami.
var PVE_NAME_ALIASES = { 'vise grip': 'vice grip' };

function normalizeMoveName(name) {
  var n = String(name || '').toLowerCase().replace(/[()]/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
  return PVE_NAME_ALIASES[n] || n;
}

// Základ názvu bez koncového typu („hidden power bug" -> „hidden power").
function baseMoveName(norm) {
  var parts = norm.split(' ');
  if (parts.length > 1 && TYPE_NAMES[parts[parts.length - 1]]) {
    return parts.slice(0, -1).join(' ');
  }
  return norm;
}

function buildPveMap(arr) {
  var map = {};
  (Array.isArray(arr) ? arr : []).forEach(function (m) {
    if (!m || !m.name) return;
    var norm = normalizeMoveName(m.name);
    var type = String(m.type || '').toLowerCase();
    if (!map[norm + '|' + type]) map[norm + '|' + type] = m;
    if (!map[norm]) map[norm] = m;
    var base = baseMoveName(norm);
    if (base !== norm && !map[base]) map[base] = m;
  });
  return map;
}

function pveLookup(map, pvpMove) {
  if (!pvpMove || !pvpMove.name) return null;
  var norm = normalizeMoveName(pvpMove.name);
  var type = String(pvpMove.type || '').toLowerCase();
  return map[norm + '|' + type] || map[norm] || map[baseMoveName(norm) + '|' + type] ||
    map[baseMoveName(norm)] || null;
}

function raidDamage(power, atkEff, stab) {
  return Math.floor(0.5 * power * (atkEff / RAID_DEFENDER_DEF) * stab) + 1;
}

// Nejlepší kombinace útoků pro gymy/raidy a její DPS/TDO. Vrací null,
// když se pro Pokémona žádná kombinace nedá spočítat (chybí PvE data).
function bestRaidSet(p) {
  if (Object.prototype.hasOwnProperty.call(raidCache, p.speciesId)) return raidCache[p.speciesId];
  var result = null;
  if (Object.keys(pveFast).length && Object.keys(pveCharged).length) {
    var shadow = (p.tags || []).indexOf('shadow') !== -1;
    var atkEff = (p.baseStats.atk + 15) * RAID_CPM * (shadow ? 1.2 : 1);
    var best = null;
    (p.fastMoves || []).forEach(function (fid) {
      var fm = moveData[fid];
      var pf = pveLookup(pveFast, fm);
      if (!fm || !pf || !(pf.energy_delta > 0)) return;
      var fStab = (p.types || []).indexOf(fm.type) !== -1 ? 1.2 : 1;
      var fDmg = raidDamage(pf.power, atkEff, fStab);
      var fTime = pf.duration / 1000;
      (p.chargedMoves || []).forEach(function (cid) {
        var cm = moveData[cid];
        var pc = pveLookup(pveCharged, cm);
        if (!cm || !pc) return;
        var cost = -pc.energy_delta;
        if (!(cost > 0)) return;
        var cStab = (p.types || []).indexOf(cm.type) !== -1 ? 1.2 : 1;
        var cDmg = raidDamage(pc.power, atkEff, cStab);
        var nFast = Math.ceil(cost / pf.energy_delta);
        var cycleTime = nFast * fTime + pc.duration / 1000;
        var dps = (nFast * fDmg + cDmg) / cycleTime;
        if (!best || dps > best.dps) {
          best = {
            fastId: fid, chargedId: cid, dps: dps,
            fastDmgPerSec: fDmg / fTime, fastEnergyPerSec: pf.energy_delta / fTime,
            chargedPower: pc.power, chargedCost: cost
          };
        }
      });
    });
    if (best) {
      var defEff = (p.baseStats.def + 15) * RAID_CPM / (shadow ? 1.2 : 1);
      var hpEff = (p.baseStats.hp + 15) * RAID_CPM;
      best.tdo = best.dps * defEff * hpEff;
      result = best;
    }
  }
  raidCache[p.speciesId] = result;
  return result;
}

function computeRaidMax() {
  raidMax = null;
  raidCache = {};
  if (!Object.keys(pveFast).length || !Object.keys(pveCharged).length) return;
  var dps = 0, tdo = 0;
  pokemon.forEach(function (p) {
    var r = bestRaidSet(p);
    if (r) {
      if (r.dps > dps) dps = r.dps;
      if (r.tdo > tdo) tdo = r.tdo;
    }
  });
  if (dps > 0) raidMax = { dps: dps, tdo: tdo };
}

function raidFastMoveHtml(p, raid) {
  var m = moveData[raid.fastId];
  var html = '<div class="move"><strong>' + esc(moveName(raid.fastId)) + '</strong> (rychlý útok)' +
    stabBadge(p, m) + buffBadge(m);
  html += meterRow('Poškození / s', raid.fastDmgPerSec / 25 * 100, fmtNum(raid.fastDmgPerSec), 'dmg');
  html += meterRow('Energie / s', raid.fastEnergyPerSec / 15 * 100, fmtNum(raid.fastEnergyPerSec), 'energy');
  return html + '</div>';
}

function raidChargedMoveHtml(p, raid) {
  var m = moveData[raid.chargedId];
  var html = '<div class="move"><strong>' + esc(moveName(raid.chargedId)) + '</strong> (nabitý útok)' +
    stabBadge(p, m) + buffBadge(m);
  var costCls = raid.chargedCost <= 40 ? 'cost-low' : (raid.chargedCost <= 60 ? 'cost-mid' : 'cost-high');
  html += meterRow('Síla', raid.chargedPower / 250 * 100, String(raid.chargedPower), 'power');
  html += meterRow('Cena (energie)', raid.chargedCost, String(raid.chargedCost), costCls);
  return html + '</div>';
}

function raidBlockHtml(p) {
  var raid = bestRaidSet(p);
  if (!raid || !raidMax) return '';
  var score = raid.dps / raidMax.dps * 100;
  var si = starsInfo(score);
  var html = '<details class="league"><summary>Gymy a raidy' + (si ? ' <span class="stars">' + si.stars + '</span>' : '') + '</summary>';
  html += '<p>Hodnocení: ' +
    (si ? '<span class="stars">' + si.stars + '</span> <strong>' + si.label + '</strong> · ' : '') +
    'poškození za sekundu <strong>' + fmtNum(raid.dps) + '</strong></p>';
  html += '<div style="margin:6px 0">' +
    meterRow('Poškození / s', score, fmtNum(raid.dps), 'power') +
    meterRow('Celkové poškození', raid.tdo / raidMax.tdo * 100,
      Math.round(raid.tdo / raidMax.tdo * 100) + ' % nejlepšího', 'role') +
    '</div>';
  html += '<p style="margin-top:8px"><strong>Nejlepší útoky:</strong></p>' +
    raidFastMoveHtml(p, raid) + raidChargedMoveHtml(p, raid);
  return html + '</details>';
}

// ---------- Přepínač vývojových fází ----------
// Řada se načítá z evolučních řetězců PokeAPI (stejný zdroj jako obrázky).
// Fáze jdou zleva doprava podle stupně vývoje, u větvení podle čísla v Pokédexu.
var evoCache = {}; // dex -> Promise<stages|null>

function speciesIdFromApi(name) {
  var id = (name || '').replace(/-/g, '_');
  var special = { nidoran_f: 'nidoran_female', nidoran_m: 'nidoran_male' };
  return special[id] || id;
}

function findSpeciesEntry(apiName, dex) {
  var sid = speciesIdFromApi(apiName);
  var byId = pokemon.find(function (x) { return x.speciesId === sid; });
  if (byId) return byId;
  var byDex = pokemon.filter(function (x) { return x.dex === dex; });
  if (!byDex.length) return null;
  byDex.sort(function (a, b) {
    var sa = /_shadow|\(/.test(a.speciesId) ? 1 : 0;
    var sb = /_shadow|\(/.test(b.speciesId) ? 1 : 0;
    return sa - sb;
  });
  return byDex[0];
}

function loadEvolutionStages(dex) {
  if (evoCache[dex]) return evoCache[dex];
  evoCache[dex] = fetchJson('https://pokeapi.co/api/v2/pokemon-species/' + dex + '/')
    .then(function (sp) { return fetchJson(sp.evolution_chain.url); })
    .then(function (data) {
      var flat = [];
      (function walk(node, depth) {
        var m = /pokemon-species\/(\d+)\//.exec(node.species.url);
        flat.push({ name: node.species.name, dex: m ? parseInt(m[1], 10) : null, depth: depth });
        (node.evolves_to || []).forEach(function (ch) { walk(ch, depth + 1); });
      })(data.chain, 0);
      flat.sort(function (a, b) { return (a.depth - b.depth) || (a.dex - b.dex); });
      return flat;
    })
    .catch(function () { return null; });
  return evoCache[dex];
}

function fillEvolution(p) {
  var box = document.getElementById('evoBox');
  if (!box) return;
  if (typeof p.dex !== 'number') { box.innerHTML = ''; return; }
  loadEvolutionStages(p.dex).then(function (stages) {
    if (!selected || selected.speciesId !== p.speciesId) return; // detail už ukazuje jiného Pokémona
    if (!stages || !stages.length) { box.innerHTML = ''; return; }
    var btns = stages.map(function (st) {
      var entry = findSpeciesEntry(st.name, st.dex);
      if (!entry) return '';
      return '<button class="evo-btn' + (st.dex === p.dex ? ' active' : '') +
        '" data-evo="' + esc(entry.speciesId) + '">' +
        '<img src="' + SPRITE_BASE + st.dex + '.png" alt="" loading="lazy" onerror="this.style.display=\'none\'">' +
        '<span>#' + st.dex + ' ' + esc(entry.speciesName) + '</span></button>';
    }).join('');
    if (!btns) { box.innerHTML = ''; return; }
    box.innerHTML = '<p style="color:var(--muted);font-size:14px;margin:10px 0 0">Vývojová řada:</p>' +
      '<div class="evo-strip">' + btns + '</div>';
    box.querySelectorAll('.evo-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var target = pokemon.find(function (x) { return x.speciesId === btn.dataset.evo; });
        if (target) showDetail(target);
      });
    });
  });
}

function showDetail(p) {
  selected = p;
  addToHistory(p);
  openDetailUI(p);
  var el = document.getElementById('detailBody');
  var img = (typeof p.dex === 'number')
    ? '<img class="artwork" src="' + ARTWORK_BASE + p.dex + '.png" alt="' + esc(p.speciesName) + '" onerror="this.style.display=\'none\'">'
    : '';
  var html = '<div class="detail-head">' + img + '<div><h2 style="margin:0 0 6px">#' +
    (typeof p.dex === 'number' ? p.dex : '?') + ' ' + esc(p.speciesName) + '</h2>' +
    '<div>' + typeChips(p.types) + '</div>' +
    '<p style="color:var(--muted);font-size:14px">Základní statistiky: útok ' + p.baseStats.atk +
    ' · obrana ' + p.baseStats.def + ' · výdrž ' + p.baseStats.hp + '</p></div></div>';
  html += '<div id="evoBox"><p style="color:var(--muted);font-size:14px;margin:10px 0 0">Vývojová řada: načítám…</p></div>';

  html += weakHtml(p);
  var shownLeagues = 0;
  LEAGUES.forEach(function (league) {
    var entry = rankings[league.key] ? rankings[league.key][p.speciesId] : null;
    if (!entry) return; // liga, ve které Pokémon není hodnocený, se na kartě vůbec nezobrazuje
    shownLeagues++;
    var moves = recommendedMoves(p, league);
    var si = starsInfo(entry.score);
    var ratingHtml = '<p>Hodnocení: ' +
      (si ? '<span class="stars">' + si.stars + '</span> <strong>' + si.label + '</strong> · ' : '') +
      'pořadí v žebříčku <strong>#' + entry.rank + '</strong>' +
      (entry.score !== null ? ' · skóre ' + entry.score : '') + '</p>' + roleRowsHtml(entry);
    var rows = topIVs(p, league).map(ivRow).join('');
    var movesHtml = '';
    if (moves.recommended) {
      movesHtml = '<p style="margin-top:8px"><strong>Nejlepší útoky:</strong></p>' +
        fastMoveHtml(p, moves.fastId, moves.fast) +
        (moves.chargedIds || []).map(function (cid, i) {
          return chargedMoveHtml(p, cid, moves.charged[i]);
        }).join('');
    }
    var note = league.cap === Infinity
      ? '<p><em>Bez CP limitu je nejlepší kombinace 15/15/15 na levelu 51.</em></p>'
      : '';
    html += '<details class="league"' + (shownLeagues === 1 ? ' open' : '') + '><summary>' + league.label +
      (league.cap === Infinity ? '' : ' (' + league.cap + ' CP)') +
      (si ? ' <span class="stars">' + si.stars + '</span>' : '') + ' <span class="sum-rank">#' + entry.rank + '</span></summary>' +
      ratingHtml + note +
      '<table><tr><th>Ideální IV</th><th>Level</th><th>CP</th></tr>' +
      rows + '</table>' + movesHtml + '</details>';
  });
  var raidHtml = raidBlockHtml(p);
  html += raidHtml;
  if (!shownLeagues && !raidHtml) {
    html += '<p style="color:var(--muted);font-size:14px;margin-top:12px">Tento Pokémon není hodnocený v žádné lize.</p>';
  }
  el.innerHTML = html;
  fillEvolution(p);
  document.getElementById('calcResult').textContent = '';
  window.scrollTo(0, 0);
}

function initSearch() {
  document.getElementById('search').addEventListener('input', function () { closeDetail(true); applySearch(); });
  document.getElementById('search').addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && filtered.length) { e.preventDefault(); showDetail(filtered[0]); this.blur(); }
  });
  document.getElementById('loadMore').addEventListener('click', function () { renderGrid(false); });
  document.getElementById('calcBtn').addEventListener('click', runCalculator);
  initCompareSets();
}

// ---------- Srovnání v IV kalkulačce: až deset variant ----------
// Varianta 1 je vždy zobrazená, varianty 2 až 10 se přidávají tlačítkem
// „Přidat srovnání“ (nejvýš deset celkem) a dají se zase odebrat.
function calcSetVisible(n) {
  var el = document.getElementById('calcSet' + n);
  return !!el && el.style.display !== 'none';
}

function updateAddCompareBtn() {
  var btn = document.getElementById('addCompareBtn');
  if (!btn) return;
  var allVisible = true;
  for (var n = 2; n <= COMPARE_LIMIT; n++) {
    if (!calcSetVisible(n)) { allVisible = false; break; }
  }
  btn.style.display = allVisible ? 'none' : '';
}

function initCompareSets() {
  var addBtn = document.getElementById('addCompareBtn');
  if (addBtn) {
    addBtn.addEventListener('click', function () {
      for (var n = 2; n <= COMPARE_LIMIT; n++) {
        if (!calcSetVisible(n)) {
          document.getElementById('calcSet' + n).style.display = '';
          break;
        }
      }
      updateAddCompareBtn();
    });
  }
  document.querySelectorAll('.calc-remove').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var el = document.getElementById('calcSet' + btn.dataset.removeSet);
      if (el) el.style.display = 'none';
      updateAddCompareBtn();
    });
  });
  updateAddCompareBtn();
}

// Přečte IV jedné varianty; vrací null a zapíše chybovou hlášku, když
// některá hodnota není v rozsahu 0–15.
function readVariantIV(n, out) {
  var suffix = n === 1 ? '' : String(n);
  var iv = [
    parseInt(document.getElementById('ivAtk' + suffix).value, 10),
    parseInt(document.getElementById('ivDef' + suffix).value, 10),
    parseInt(document.getElementById('ivSta' + suffix).value, 10)
  ];
  if (iv.some(function (v) { return isNaN(v) || v < 0 || v > 15; })) {
    out.textContent = 'Varianta ' + n + ': zadej IV hodnoty od 0 do 15.';
    return null;
  }
  return iv;
}

function runCalculator() {
  var out = document.getElementById('calcResult');
  if (!selected) {
    out.textContent = 'Nejdřív vyber Pokémona v seznamu výše.';
    return;
  }
  var variants = [];
  for (var n = 1; n <= COMPARE_LIMIT; n++) {
    if (n > 1 && !calcSetVisible(n)) continue;
    var iv = readVariantIV(n, out);
    if (!iv) return;
    variants.push({ n: n, iv: iv });
  }
  var ivs = variants.map(function (v) { return v.iv; });

  // Výsledky se počítají pro všechny ligy najednou – výběr ligy není potřeba.
  if (variants.length === 1) {
    var html = '<p><strong>' + esc(selected.speciesName) + ' ' + variants[0].iv.join('/') +
      '</strong> – výsledky pro všechny ligy:</p>';
    html += '<table><tr><th>Liga</th><th>Pořadí</th><th>Level</th><th>CP</th></tr>';
    LEAGUES.forEach(function (league) {
      var cmp = compareForPokemon(selected, ivs, league.cap);
      var r = cmp.results[0];
      var label = league.label + (league.cap === Infinity ? ' (bez limitu)' : ' (' + league.cap + ' CP)');
      if (!r.mine) {
        html += '<tr><td>' + label + '</td><td colspan="3">nevejde se ani na levelu 1 pod limit ' +
          league.cap + ' CP</td></tr>';
        return;
      }
      var xl = r.mine.level > 40 ? ' <span class="xl">(potřeba XL bonbóny)</span>' : '';
      html += '<tr><td>' + label + '</td><td>#' + r.rank + ' ze ' +
        cmp.list.length.toLocaleString('cs-CZ') + '</td><td>' + r.mine.level + xl + '</td><td>' +
        r.mine.cp + '</td></tr>';
    });
    html += '</table>';
    out.innerHTML = html;
    return;
  }

  // Dvě a více variant: pro každou ligu vlastní srovnávací tabulka,
  // nejlepší varianta se zvýrazní v každé lize zvlášť.
  var out2 = '<p><strong>' + esc(selected.speciesName) + '</strong> – srovnání ' + variants.length +
    ' variant pro všechny ligy:</p>';
  LEAGUES.forEach(function (league) {
    var cmp = compareForPokemon(selected, ivs, league.cap);
    var label = league.label + (league.cap === Infinity ? ' (bez limitu)' : ' (' + league.cap + ' CP)');
    var bestNames = [];
    cmp.results.forEach(function (r, i) { if (r.isBest) bestNames.push('Varianta ' + variants[i].n); });
    out2 += '<div style="margin-top:12px"><p style="margin:2px 0"><strong>' + label + '</strong> (ze ' +
      cmp.list.length.toLocaleString('cs-CZ') + ' kombinací): ';
    out2 += bestNames.length
      ? 'nejlepší je <strong>' + bestNames.join(' a ') + '</strong>.</p>'
      : 'žádná z variant se nevejde pod limit ligy.</p>';
    out2 += '<table><tr><th>Varianta</th><th>IV</th><th>Pořadí</th><th>Level</th><th>CP</th></tr>';
    cmp.results.forEach(function (r, i) {
      var vlabel = 'Varianta ' + variants[i].n + (r.isBest ? '<span class="best-badge">nejlepší</span>' : '');
      if (!r.mine) {
        out2 += '<tr><td>' + vlabel + '</td><td>' + r.iv.join('/') + '</td>' +
          '<td colspan="3">nevejde se ani na levelu 1 pod limit ' + league.cap + ' CP</td></tr>';
        return;
      }
      var xlMark = r.mine.level > 40 ? ' <span class="xl">(XL)</span>' : '';
      out2 += '<tr' + (r.isBest ? ' class="best-row"' : '') + '><td>' + vlabel + '</td><td>' + r.iv.join('/') + '</td>' +
        '<td>#' + r.rank + '</td><td>' + r.mine.level + xlMark + '</td><td>' + r.mine.cp + '</td></tr>';
    });
    out2 += '</table></div>';
  });
  out.innerHTML = out2;
}

// ---------- Ovládání: záložky, karta Pokémona, oblíbení, srovnání, vzhled ----------
function $(id) { return document.getElementById(id); }
function fold(s) { return String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase(); }
function byId(id) { return pokemon.find(function (x) { return x.speciesId === id; }); }
function fm(m) { return String(Math.round(m * 100) / 100).replace('.', ','); }
var THEME_KEY = 'pokemon-go-db-theme', FAV_KEY = 'pokemon-go-db-favs-v1';
var curView = 'search', detailFrom = 'search', scrollY0 = 0, skipHash = false, pushed = false, favs = [];
try { favs = JSON.parse(localStorage.getItem(FAV_KEY) || '[]') || []; } catch (e) { favs = []; }

function setView(v) {
  curView = v;
  ['search', 'fav', 'cmp'].forEach(function (k) { $('view' + k[0].toUpperCase() + k.slice(1)).hidden = k !== v; });
  document.querySelectorAll('#tabs button').forEach(function (b) { b.classList.toggle('on', b.dataset.view === v); });
  if (v === 'fav') renderFavs();
  window.scrollTo(0, 0);
}
function openDetailUI(p) {
  if (!document.body.classList.contains('has-detail')) {
    scrollY0 = window.scrollY;
    detailFrom = curView;
    if (curView !== 'search') setView('search');
  }
  document.body.classList.add('has-detail');
  $('favBtn').dataset.id = p.speciesId;
  refreshFavs();
  if (location.hash !== '#' + p.speciesId) { skipHash = true; pushed = true; location.hash = p.speciesId; }
}
function closeDetail(stay) {
  if (!document.body.classList.contains('has-detail')) return;
  document.body.classList.remove('has-detail');
  if (location.hash) history.replaceState(null, '', location.pathname + location.search);
  if (!stay && detailFrom !== 'search') setView(detailFrom); else window.scrollTo(0, stay ? 0 : scrollY0);
  detailFrom = 'search';
}
function openFromHash() {
  var id = decodeURIComponent(location.hash.slice(1)), p = id && pokemon.length ? byId(id) : null;
  if (p) showDetail(p); else closeDetail();
}

// Oblíbení
function isFav(id) { return favs.indexOf(id) !== -1; }
function favStar(id) {
  return '<span class="fav-star' + (isFav(id) ? ' on' : '') + '" data-id="' + esc(id) + '" role="button" aria-label="Oblíbený">' + (isFav(id) ? '★' : '☆') + '</span>';
}
function toggleFav(id) {
  var i = favs.indexOf(id);
  if (i < 0) favs.push(id); else favs.splice(i, 1);
  try { localStorage.setItem(FAV_KEY, JSON.stringify(favs)); } catch (e) {}
  refreshFavs();
  if (curView === 'fav') renderFavs();
}
function refreshFavs() {
  document.querySelectorAll('.fav-star').forEach(function (s) {
    var on = isFav(s.dataset.id); s.classList.toggle('on', on); s.textContent = on ? '★' : '☆';
  });
  var fb = $('favBtn');
  if (fb && fb.dataset.id) {
    var on = isFav(fb.dataset.id); fb.classList.toggle('on', on);
    fb.textContent = on ? '★ V oblíbených' : '☆ Přidat do oblíbených';
  }
}
function cardHtml(p) {
  var types = (p.types || []).filter(function (t) { return t !== 'none'; }).map(function (t) { return TYPE_NAMES[t] || t; }).join(' / ');
  return '<div class="poke-card" data-id="' + esc(p.speciesId) + '">' + favStar(p.speciesId) +
    (typeof p.dex === 'number' ? '<img src="' + SPRITE_BASE + p.dex + '.png" alt="" loading="lazy" onerror="this.style.display=\'none\'">' : '') +
    '<div class="dex">#' + (typeof p.dex === 'number' ? p.dex : '?') + '</div><div class="name">' + esc(p.speciesName) +
    '</div><div class="types">' + types + '</div></div>';
}
function renderFavs() {
  var list = favs.map(byId).filter(Boolean);
  $('favGrid').innerHTML = list.length ? list.map(cardHtml).join('') :
    '<p class="muted">Zatím tu nic není. Na kartě Pokémona klepni na ☆ a objeví se tady.</p>';
}

// Slabiny a odolnosti podle typů (násobky z Pokémon GO: 1,6 / 0,625 / 0,39)
var TCH = {
  normal: ['', 'rock steel', 'ghost'], fire: ['grass ice bug steel', 'fire water rock dragon', ''],
  water: ['fire ground rock', 'water grass dragon', ''], electric: ['water flying', 'electric grass dragon', 'ground'],
  grass: ['water ground rock', 'fire grass poison flying bug dragon steel', ''], ice: ['grass ground flying dragon', 'fire water ice steel', ''],
  fighting: ['normal ice rock dark steel', 'poison flying psychic bug fairy', 'ghost'], poison: ['grass fairy', 'poison ground rock ghost', 'steel'],
  ground: ['fire electric poison rock steel', 'grass bug', 'flying'], flying: ['grass fighting bug', 'electric rock steel', ''],
  psychic: ['fighting poison', 'psychic steel', 'dark'], bug: ['grass psychic dark', 'fire fighting poison flying ghost steel fairy', ''],
  rock: ['fire ice flying bug', 'fighting ground steel', ''], ghost: ['psychic ghost', 'dark', 'normal'],
  dragon: ['dragon', 'steel', 'fairy'], dark: ['psychic ghost', 'fighting dark fairy', ''],
  steel: ['ice rock fairy', 'fire water electric steel', ''], fairy: ['fighting dragon dark', 'fire poison steel', '']
};
function typeMult(att, types) {
  var m = 1, c = TCH[att];
  (types || []).forEach(function (t) {
    if (!t || t === 'none') return;
    [1.6, 0.625, 0.390625].forEach(function (x, i) { if ((' ' + c[i] + ' ').indexOf(' ' + t + ' ') > -1) m *= x; });
  });
  return m;
}
function weakHtml(p) {
  var weak = [], res = [];
  Object.keys(TCH).forEach(function (a) {
    var m = typeMult(a, p.types);
    if (m > 1.01) weak.push([a, m]); else if (m < 0.99) res.push([a, m]);
  });
  function chips(list, cls) {
    list.sort(function (x, y) { return cls === 'w' ? y[1] - x[1] : x[1] - y[1]; });
    return list.map(function (x) { return '<span class="mchip ' + cls + '">' + esc(TYPE_NAMES[x[0]] || x[0]) + ' ×' + fm(x[1]) + '</span>'; }).join('') || '<span class="muted">žádné</span>';
  }
  return '<details class="league"><summary>Slabiny a odolnosti</summary><p><strong>Slabý proti</strong></p><div>' +
    chips(weak, 'w') + '</div><p><strong>Odolný proti</strong></p><div>' + chips(res, 'r') + '</div></details>';
}

// Srovnání dvou Pokémonů
function fillNames() {
  $('names').innerHTML = pokemon.map(function (p) { return '<option value="' + esc(p.speciesName) + '">'; }).join('');
}
function renderCmp() {
  function pick(v) { var q = fold(v).trim(); return q && pokemon.find(function (p) { return fold(p.speciesName) === q; }); }
  var a = pick($('cmpA').value), b = pick($('cmpB').value), out = $('cmpOut');
  if (!a || !b) { out.innerHTML = '<p class="muted">Vyber dva Pokémony ze seznamu. Lepší hodnota v řádku se zvýrazní.</p>'; return; }
  function row(label, va, vb, f) {
    return '<tr><th>' + label + '</th><td class="' + (va > vb ? 'win' : '') + '">' + f(va) + '</td><td class="' + (vb > va ? 'win' : '') + '">' + f(vb) + '</td></tr>';
  }
  function head(p) {
    return (typeof p.dex === 'number' ? '<img src="' + SPRITE_BASE + p.dex + '.png" alt=""><br>' : '') + esc(p.speciesName);
  }
  var rows = '<tr><th></th><td>' + head(a) + '</td><td>' + head(b) + '</td></tr>';
  [['Útok', 'atk'], ['Obrana', 'def'], ['Výdrž', 'hp']].forEach(function (r) { rows += row(r[0], a.baseStats[r[1]], b.baseStats[r[1]], String); });
  function stars(s) { var si = s < 0 ? null : starsInfo(s); return si ? '<span class="stars">' + si.stars + '</span>' : '–'; }
  LEAGUES.forEach(function (l) {
    var ea = (rankings[l.key] || {})[a.speciesId], eb = (rankings[l.key] || {})[b.speciesId];
    rows += row(l.label, ea && ea.score != null ? ea.score : -1, eb && eb.score != null ? eb.score : -1, stars);
  });
  var ra = bestRaidSet(a), rb = bestRaidSet(b);
  if (raidMax && (ra || rb)) rows += row('Gymy a raidy', ra ? ra.dps / raidMax.dps * 100 : -1, rb ? rb.dps / raidMax.dps * 100 : -1, stars);
  out.innerHTML = '<div style="overflow-x:auto"><table class="cmp-table">' + rows + '</table></div>';
}

function initUi() {
  var th = null; try { th = localStorage.getItem(THEME_KEY); } catch (e) {}
  var ICON = { '': '🌓', dark: '🌙', light: '☀️' };
  $('themeBtn').textContent = ICON[th || ''] || '🌓';
  $('themeBtn').addEventListener('click', function () {
    var cur = document.documentElement.dataset.theme || '', nxt = cur === '' ? 'dark' : cur === 'dark' ? 'light' : '';
    if (nxt) document.documentElement.dataset.theme = nxt; else delete document.documentElement.dataset.theme;
    try { localStorage.setItem(THEME_KEY, nxt); } catch (e) {}
    this.textContent = ICON[nxt];
  });
  $('grid').innerHTML = new Array(13).join('<div class="poke-card skel"></div>');
  $('tabs').addEventListener('click', function (e) { var b = e.target.closest('button'); if (b) setView(b.dataset.view); });
  $('backBtn').addEventListener('click', function () { if (pushed) history.back(); else closeDetail(); });
  $('favBtn').addEventListener('click', function () { if (this.dataset.id) toggleFav(this.dataset.id); });
  $('favGrid').addEventListener('click', function (e) {
    var s = e.target.closest('.fav-star');
    if (s) { toggleFav(s.dataset.id); return; }
    var c = e.target.closest('.poke-card'), p = c && byId(c.dataset.id);
    if (p) showDetail(p);
  });
  $('searchClear').addEventListener('click', function () { $('search').value = ''; $('search').focus(); closeDetail(true); applySearch(); });
  window.addEventListener('hashchange', function () { if (skipHash) { skipHash = false; return; } openFromHash(); });
  // IV: tlačítka +/−, rychlé zadání „15/14/13“ a výpočet hned při změně
  var panel = $('calcPanel'), timer;
  panel.addEventListener('click', function (e) {
    var b = e.target.closest('[data-step]');
    if (!b) return;
    var inp = $(b.dataset.for);
    inp.value = Math.max(0, Math.min(15, (parseInt(inp.value, 10) || 0) + Number(b.dataset.step)));
    inp.dispatchEvent(new Event('input', { bubbles: true }));
  });
  panel.addEventListener('input', function (e) {
    var q = e.target;
    if (q.classList.contains('iv-quick')) {
      var m = q.value.match(/(\d{1,2})\D+(\d{1,2})\D+(\d{1,2})/), s = q.dataset.set === '1' ? '' : q.dataset.set;
      if (m) ['ivAtk', 'ivDef', 'ivSta'].forEach(function (k, i) { $(k + s).value = Math.min(15, Number(m[i + 1])); });
    }
    clearTimeout(timer);
    timer = setTimeout(function () { if (selected) runCalculator(); }, 250);
  });
  $('cmpA').addEventListener('input', renderCmp);
  $('cmpB').addEventListener('input', renderCmp);
  renderCmp();
  if ('serviceWorker' in navigator && /^https?:/.test(location.protocol)) navigator.serviceWorker.register('sw.js').catch(function () {});
}

function init() {
  initUi();
  var status = document.getElementById('status');
  // Žebříčky (včetně nejlepších útoků) jsou nepovinné: když se některý
  // nenačte, aplikace běží dál a útoky se vezmou ze skupin PvPoke.
  var rankingLoads = LEAGUES.map(function (league) {
    return fetchJson(PVPOKE_BASE + league.rankPath)
      .then(function (arr) { return rankingMap(arr); })
      .catch(function () { return null; });
  });
  // PvE data pro gymy/raidy jsou také nepovinná: když se nenačtou,
  // karta prostě blok „Gymy a raidy" nezobrazí.
  var pveLoads = [
    fetchJson(POGOAPI_BASE + 'fast_moves.json').catch(function () { return null; }),
    fetchJson(POGOAPI_BASE + 'charged_moves.json').catch(function () { return null; })
  ];
  var core = Promise.all([
    fetchJson(PVPOKE_BASE + 'gamemaster/pokemon.json'),
    fetchJson(PVPOKE_BASE + 'gamemaster/moves.json'),
    fetchJson(PVPOKE_BASE + 'groups/great.json'),
    fetchJson(PVPOKE_BASE + 'groups/ultra.json'),
    fetchJson(PVPOKE_BASE + 'groups/master.json')
  ].concat(rankingLoads).concat(pveLoads));
  core.then(function (data) {
    pokemon = data[0];
    (Array.isArray(data[1]) ? data[1] : []).forEach(function (m) {
      if (m && m.moveId) {
        moveNames[m.moveId] = m.name || prettyMoveId(m.moveId);
        moveData[m.moveId] = m;
      }
    });
    groups.great = groupMap(data[2]);
    groups.ultra = groupMap(data[3]);
    groups.master = groupMap(data[4]);
    LEAGUES.forEach(function (league, i) {
      if (data[5 + i]) rankings[league.key] = data[5 + i];
    });
    var pveBase = 5 + LEAGUES.length;
    if (data[pveBase]) pveFast = buildPveMap(data[pveBase]);
    if (data[pveBase + 1]) pveCharged = buildPveMap(data[pveBase + 1]);
    computeRaidMax();
    status.textContent = 'Data načtena: ' + pokemon.length.toLocaleString('cs-CZ') + ' záznamů.';
    initSearch();
    renderHistory();
    applySearch();
    fillNames();
    if (location.hash) openFromHash();
  }).catch(function (err) {
    status.textContent = 'Nepodařilo se načíst data. Zkontroluj připojení a obnov stránku. (' + err.message + ')';
    status.classList.add('error');
  });
}

if (typeof document !== 'undefined') {
  init();
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { CPM: CPM, cpFor: cpFor, productFor: productFor, bestLevel: bestLevel, rankAllIVs: rankAllIVs, rankOfIV: rankOfIV, compareIVs: compareIVs, compareForPokemon: compareForPokemon, rankedListFor: rankedListFor, COMPARE_LIMIT: COMPARE_LIMIT, buildPveMap: buildPveMap, pveLookup: pveLookup, bestRaidSet: bestRaidSet, computeRaidMax: computeRaidMax, raidBlockHtml: raidBlockHtml, starsInfo: starsInfo, _setData: function (d) { pokemon = d.pokemon || []; moveData = d.moveData || {}; moveNames = d.moveNames || {}; pveFast = d.pveFast || {}; pveCharged = d.pveCharged || {}; raidCache = {}; raidMax = null; } };
}
