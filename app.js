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

function genOf(dex) {
  if (dex <= 151) return 1;
  if (dex <= 251) return 2;
  if (dex <= 386) return 3;
  if (dex <= 493) return 4;
  if (dex <= 649) return 5;
  if (dex <= 721) return 6;
  if (dex <= 809) return 7;
  if (dex <= 905) return 8;
  return 9;
}

function formOf(p) {
  var m = (p.speciesName || '').match(/\(([^)]+)\)/);
  return m ? m[1] : 'Standardní';
}

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
var groups = {};    // league key -> { speciesId: { fastMove, chargedMoves } }
var rankings = {};  // league key -> { speciesId: { rank, score } }
var selected = null;
var filtered = [];
var shownCount = 0;
var PAGE_SIZE = 100;
var ivCache = {};   // speciesId + cap -> ranked list

var LEAGUES = [
  { key: 'little', label: 'Malá liga', cap: 500, groupFile: null, rankFile: null },
  { key: 'great', label: 'Velká liga', cap: 1500, groupFile: 'great', rankFile: '1500' },
  { key: 'ultra', label: 'Ultra liga', cap: 2500, groupFile: 'ultra', rankFile: '2500' },
  { key: 'master', label: 'Mistrovská liga', cap: Infinity, groupFile: 'master', rankFile: '10000' }
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
          score: (typeof e.score === 'number' ? e.score : (typeof e.rating === 'number' ? e.rating : null))
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

function recommendedMoves(p, league) {
  var g = null;
  if (league.groupFile && groups[league.groupFile]) {
    g = groups[league.groupFile][p.speciesId] ||
        groups[league.groupFile][p.speciesId.replace(/_shadow$/, '')] || null;
  }
  if (g && g.fastMove) {
    return {
      recommended: true,
      fast: moveName(g.fastMove),
      charged: (g.chargedMoves || []).map(function (m) { return moveName(m); })
    };
  }
  return {
    recommended: false,
    fast: (p.fastMoves || []).map(function (m) { return moveName(m); }).join(', '),
    charged: (p.chargedMoves || []).map(function (m) { return moveName(m); }).join(', ')
  };
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

function applyFilters() {
  var q = (document.getElementById('search').value || '').trim().toLowerCase();
  var type = document.getElementById('typeFilter').value;
  var gen = document.getElementById('genFilter').value;
  var form = document.getElementById('formFilter').value;
  var isNum = q !== '' && /^\d+$/.test(q);
  filtered = pokemon.filter(function (p) {
    if (q) {
      var nameHit = (p.speciesName || '').toLowerCase().indexOf(q) !== -1;
      var dexHit = isNum && typeof p.dex === 'number' && String(p.dex).indexOf(q) === 0;
      if (!nameHit && !dexHit) return false;
    }
    if (type && !(p.types || []).includes(type)) return false;
    if (gen && typeof p.dex === 'number' && genOf(p.dex) !== parseInt(gen, 10)) return false;
    if (gen && typeof p.dex !== 'number') return false;
    if (form && formOf(p) !== form) return false;
    return true;
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
    'podle lig se liší ideální IV níže. Movesety v ligách jsou doporučení PvPoke pro danou ligu.</span></p></div></div>';

  LEAGUES.forEach(function (league) {
    var moves = recommendedMoves(p, league);
    var rankInfo = '';
    if (league.rankFile && rankings[league.rankFile]) {
      var r = rankings[league.rankFile][p.speciesId];
      if (r) {
        rankInfo = '<p>Pořadí v žebříčku PvPoke: <strong>#' + r.rank + '</strong>' +
          (r.score !== null ? ' (skóre ' + r.score + ')' : '') + '</p>';
      }
    }
    var rows = topIVs(p, league).map(ivRow).join('');
    var movesHtml;
    if (moves.recommended) {
      movesHtml = '<p>Rychlý útok: <strong>' + esc(moves.fast) + '</strong><br>' +
        'Nabité útoky: <strong>' + esc(moves.charged.join(', ')) + '</strong></p>';
    } else {
      movesHtml = '<p><em>Doporučený set není v datech PvPoke, dostupné útoky:</em><br>' +
        'Rychlé: ' + esc(moves.fast) + '<br>Nabité: ' + esc(moves.charged) + '</p>';
    }
    var note = league.cap === Infinity
      ? '<p><em>Bez CP limitu je nejlepší kombinace 15/15/15 na levelu 51.</em></p>'
      : '';
    html += '<div class="league"><h3>' + league.label +
      (league.cap === Infinity ? '' : ' (' + league.cap + ' CP)') + '</h3>' +
      rankInfo + movesHtml + note +
      '<table><tr><th>Ideální IV (útok/obrana/výdrž)</th><th>Level</th><th>CP</th><th>Součin statistik</th></tr>' +
      rows + '</table></div>';
  });
  el.innerHTML = html;
  el.classList.add('visible');
  resolvePokebaseLink(p);
  el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  document.getElementById('calcResult').textContent = '';
}

function initFilters() {
  var typeSel = document.getElementById('typeFilter');
  Object.keys(TYPE_NAMES).forEach(function (t) {
    if (t === 'none') return;
    var o = document.createElement('option');
    o.value = t; o.textContent = TYPE_NAMES[t];
    typeSel.appendChild(o);
  });
  var forms = {};
  pokemon.forEach(function (p) { forms[formOf(p)] = true; });
  var formSel = document.getElementById('formFilter');
  Object.keys(forms).sort().forEach(function (f) {
    var o = document.createElement('option');
    o.value = f; o.textContent = f;
    formSel.appendChild(o);
  });
  ['search', 'typeFilter', 'genFilter', 'formFilter'].forEach(function (id) {
    document.getElementById(id).addEventListener('input', applyFilters);
    document.getElementById(id).addEventListener('change', applyFilters);
  });
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
  var core = Promise.all([
    fetchJson(PVPOKE_BASE + 'gamemaster/pokemon.json'),
    fetchJson(PVPOKE_BASE + 'gamemaster/moves.json'),
    fetchJson(PVPOKE_BASE + 'groups/great.json'),
    fetchJson(PVPOKE_BASE + 'groups/ultra.json'),
    fetchJson(PVPOKE_BASE + 'groups/master.json')
  ]);
  // Žebříčky jsou nepovinné: při chybě se pořadí prostě nezobrazí.
  ['1500', '2500', '10000'].forEach(function (cp) {
    fetchJson(PVPOKE_BASE + 'rankings/all/overall/rankings-' + cp + '.json')
      .then(function (arr) { rankings[cp] = rankingMap(arr); })
      .catch(function () { /* pořadí se skryje, aplikace běží dál */ });
  });
  core.then(function (data) {
    pokemon = data[0];
    (Array.isArray(data[1]) ? data[1] : []).forEach(function (m) {
      if (m && m.moveId) moveNames[m.moveId] = m.name || prettyMoveId(m.moveId);
    });
    groups.great = groupMap(data[2]);
    groups.ultra = groupMap(data[3]);
    groups.master = groupMap(data[4]);
    status.textContent = 'Data načtena: ' + pokemon.length.toLocaleString('cs-CZ') + ' záznamů.';
    initFilters();
    applyFilters();
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
