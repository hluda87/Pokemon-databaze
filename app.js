// Pokémon GO databáze — čistý HTML/CSS/JS, bez build kroku.
// Data se načítají z otevřených dat PvPoke, obrázky z PokeAPI sprites.

var PVPOKE_BASE = 'https://raw.githubusercontent.com/pvpoke/pvpoke/master/src/data/';
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

// Pořadí dané IV kombinace: 1 + počet kombinací s vyšším součinem statistik.
function rankOfIV(base, iv, cap) {
  var list = rankAllIVs(base, cap);
  var mine = bestLevel(base, iv, cap);
  if (!mine) return { list: list, mine: null, rank: null };
  var rank = 1;
  for (var i = 0; i < list.length; i++) {
    if (list[i].product > mine.product + 1e-9) rank++;
    else break;
  }
  return { list: list, mine: mine, rank: rank };
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

// ---------- GamePress (dnes PokéBase) ----------
// GamePress se přesunul na pokebase.app. Oddělené movesety pro jednotlivé ligy
// tam nevedou – u každého Pokémona uvádějí jeden společný nejlepší PvP moveset
// a podle lig se liší jen ideální IV. Datové API pro movesety je zamčené,
// takže aplikace na stránku Pokémona odkazuje a přesný odkaz si ověří přes
// veřejné vyhledávací API PokéBase.
var POKEBASE_BASE = 'https://pokebase.app';
var pokebaseCache = {}; // speciesId -> path (např. /pokemon-go/pokemon/azumarill)

function pokebaseSlug(p) {
  var name = (p.speciesName || '').replace(/\s*\([^)]*\)\s*/g, ' ').trim();
  return name.toLowerCase()
    .replace(/['’.]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function pokebaseUrl(p) {
  var path = pokebaseCache[p.speciesId] || ('/pokemon-go/pokemon/' + pokebaseSlug(p));
  return POKEBASE_BASE + path;
}

function resolvePokebaseLink(p) {
  if (pokebaseCache[p.speciesId]) return;
  var q = (p.speciesName || '').replace(/\s*\([^)]*\)\s*/g, ' ').trim();
  fetch(POKEBASE_BASE + '/api/search?site=pokemon-go&q=' + encodeURIComponent(q))
    .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
    .then(function (data) {
      var hits = (data && data.hits) || [];
      var hit = null;
      for (var i = 0; i < hits.length; i++) {
        if (hits[i].collection === 'pokemon-go-pokemon') {
          if (!hit) hit = hits[i];
          if ((hits[i].name || '').toLowerCase() === q.toLowerCase()) { hit = hits[i]; break; }
        }
      }
      if (hit && hit.path) {
        pokebaseCache[p.speciesId] = hit.path;
        var url = POKEBASE_BASE + hit.path;
        document.querySelectorAll('a[data-pokebase="' + p.speciesId + '"]').forEach(function (a) {
          a.href = url;
        });
      }
    })
    .catch(function () { /* zůstane odkaz odvozený ze jména */ });
}

// ---------- Stav aplikace ----------
var pokemon = [];
var moveNames = {};
var moveData = {}; // moveId -> { name, type, power, energy, energyGain, turns, buffs, buffTarget, buffApplyChance }
var groups = {};    // league key -> { speciesId: { fastMove, chargedMoves } }
var rankings = {};  // league key -> { speciesId: { rank, score, moveset, scores } }
var selected = null;
var filtered = [];
var shownCount = 0;
var PAGE_SIZE = 100;
var ivCache = {};   // speciesId + cap -> ranked list

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
  return '<tr><td>' + r.iv.join('/') + '</td><td>' + r.level + '</td><td>' +
    r.cp + ' CP</td><td>' + Math.round(r.product).toLocaleString('cs-CZ') + xl + '</td></tr>';
}

// ---------- Vykreslování ----------
function typeChips(types) {
  return (types || []).filter(function (t) { return t && t !== 'none'; }).map(function (t) {
    var bg = TYPE_COLORS[t] || '#667085';
    return '<span class="chip" style="background:' + bg + '">' + esc(TYPE_NAMES[t] || t) + '</span>';
  }).join('');
}

function applySearch() {
  var q = (document.getElementById('search').value || '').trim().toLowerCase();
  var isNum = q !== '' && /^\d+$/.test(q);
  filtered = pokemon.filter(function (p) {
    if (!q) return true;
    var nameHit = (p.speciesName || '').toLowerCase().indexOf(q) !== -1;
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
    html += '<div class="poke-card" data-id="' + esc(p.speciesId) + '">' + img +
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
      card.addEventListener('click', function () {
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
  var el = document.getElementById('detail');
  var img = (typeof p.dex === 'number')
    ? '<img class="artwork" src="' + ARTWORK_BASE + p.dex + '.png" alt="' + esc(p.speciesName) + '" onerror="this.style.display=\'none\'">'
    : '';
  var html = '<div class="detail-head">' + img + '<div><h2 style="margin:0 0 6px">#' +
    (typeof p.dex === 'number' ? p.dex : '?') + ' ' + esc(p.speciesName) + '</h2>' +
    '<div>' + typeChips(p.types) + '</div>' +
    '<p style="color:var(--muted);font-size:14px">Základní statistiky: útok ' + p.baseStats.atk +
    ' · obrana ' + p.baseStats.def + ' · výdrž ' + p.baseStats.hp + '</p>' +
    '<p style="font-size:14px">Ideální PvP moveset podle GamePressu: ' +
    '<a class="gp-link" data-pokebase="' + esc(p.speciesId) + '" href="' + esc(pokebaseUrl(p)) +
    '" target="_blank" rel="noopener">otevřít na GamePress (PokéBase)</a><br>' +
    '<span style="color:var(--muted)">GamePress uvádí jeden společný nejlepší PvP moveset pro všechny ligy; ' +
    'podle lig se liší ideální IV níže. Hvězdičkové hodnocení, role v týmu i grafy u útoků počítá aplikace z dat PvPoke.</span></p></div></div>';
  html += '<div id="evoBox"><p style="color:var(--muted);font-size:14px;margin:10px 0 0">Vývojová řada: načítám…</p></div>';

  LEAGUES.forEach(function (league) {
    var moves = recommendedMoves(p, league);
    var entry = rankings[league.key] ? rankings[league.key][p.speciesId] : null;
    var ratingHtml;
    if (entry) {
      var si = starsInfo(entry.score);
      ratingHtml = '<p>Hodnocení: ' +
        (si ? '<span class="stars">' + si.stars + '</span> <strong>' + si.label + '</strong> · ' : '') +
        'pořadí v žebříčku PvPoke <strong>#' + entry.rank + '</strong>' +
        (entry.score !== null ? ' · skóre ' + entry.score : '') + '</p>' + roleRowsHtml(entry);
    } else {
      ratingHtml = '<p>Hodnocení: <span class="stars">☆☆☆☆☆</span> v žebříčku této ligy se neumístil</p>';
    }
    var rows = topIVs(p, league).map(ivRow).join('');
    var movesHtml = '';
    if (moves.recommended) {
      movesHtml = '<p style="margin-top:8px"><strong>Nejlepší útoky (PvPoke):</strong></p>' +
        fastMoveHtml(p, moves.fastId, moves.fast) +
        (moves.chargedIds || []).map(function (cid, i) {
          return chargedMoveHtml(p, cid, moves.charged[i]);
        }).join('');
    }
    var note = league.cap === Infinity
      ? '<p><em>Bez CP limitu je nejlepší kombinace 15/15/15 na levelu 51.</em></p>'
      : '';
    html += '<div class="league"><h3>' + league.label +
      (league.cap === Infinity ? '' : ' (' + league.cap + ' CP)') + '</h3>' +
      ratingHtml + movesHtml + note +
      '<table><tr><th>Ideální IV (útok/obrana/výdrž)</th><th>Level</th><th>CP</th><th>Součin statistik</th></tr>' +
      rows + '</table></div>';
  });
  el.innerHTML = html;
  el.classList.add('visible');
  fillEvolution(p);
  resolvePokebaseLink(p);
  el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  document.getElementById('calcResult').textContent = '';
}

function initSearch() {
  document.getElementById('search').addEventListener('input', applySearch);
  document.getElementById('loadMore').addEventListener('click', function () { renderGrid(false); });
  document.getElementById('calcBtn').addEventListener('click', runCalculator);
}

function runCalculator() {
  var out = document.getElementById('calcResult');
  if (!selected) {
    out.textContent = 'Nejdřív vyber Pokémona v seznamu výše.';
    return;
  }
  var a = parseInt(document.getElementById('ivAtk').value, 10);
  var d = parseInt(document.getElementById('ivDef').value, 10);
  var s = parseInt(document.getElementById('ivSta').value, 10);
  var cap = parseFloat(document.getElementById('calcLeague').value);
  if ([a, d, s].some(function (v) { return isNaN(v) || v < 0 || v > 15; })) {
    out.textContent = 'Zadej IV hodnoty od 0 do 15.';
    return;
  }
  var res = rankOfIV(selected.baseStats, [a, d, s], cap);
  if (!res.mine) {
    out.innerHTML = 'Kombinace ' + [a, d, s].join('/') + ' se ani na levelu 1 nevejde pod limit ' +
      (cap === Infinity ? '' : cap + ' CP') + '.';
    return;
  }
  var xl = res.mine.level > 40 ? ' <span class="xl">(potřeba XL bonbóny)</span>' : '';
  out.innerHTML = '<strong>' + esc(selected.speciesName) + ' ' + [a, d, s].join('/') + '</strong>: ' +
    'pořadí <strong>#' + res.rank + '</strong> ze ' + res.list.length.toLocaleString('cs-CZ') +
    ' kombinací · nejlepší level <strong>' + res.mine.level + '</strong>' + xl +
    ' · CP <strong>' + res.mine.cp + '</strong>' +
    ' · součin statistik <strong>' + Math.round(res.mine.product).toLocaleString('cs-CZ') + '</strong>.';
}

function init() {
  var status = document.getElementById('status');
  // Žebříčky (včetně nejlepších útoků) jsou nepovinné: když se některý
  // nenačte, aplikace běží dál a útoky se vezmou ze skupin PvPoke.
  var rankingLoads = LEAGUES.map(function (league) {
    return fetchJson(PVPOKE_BASE + league.rankPath)
      .then(function (arr) { return rankingMap(arr); })
      .catch(function () { return null; });
  });
  var core = Promise.all([
    fetchJson(PVPOKE_BASE + 'gamemaster/pokemon.json'),
    fetchJson(PVPOKE_BASE + 'gamemaster/moves.json'),
    fetchJson(PVPOKE_BASE + 'groups/great.json'),
    fetchJson(PVPOKE_BASE + 'groups/ultra.json'),
    fetchJson(PVPOKE_BASE + 'groups/master.json')
  ].concat(rankingLoads));
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
    status.textContent = 'Data načtena: ' + pokemon.length.toLocaleString('cs-CZ') + ' záznamů.';
    initSearch();
    applySearch();
  }).catch(function (err) {
    status.textContent = 'Nepodařilo se načíst data z PvPoke. Zkontroluj připojení a obnov stránku. (' + err.message + ')';
    status.classList.add('error');
  });
}

if (typeof document !== 'undefined') {
  init();
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { CPM: CPM, cpFor: cpFor, productFor: productFor, bestLevel: bestLevel, rankAllIVs: rankAllIVs, rankOfIV: rankOfIV };
}
