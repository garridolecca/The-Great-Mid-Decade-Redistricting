/**
 * The Great Mid-Decade Redistricting — App Logic
 * ArcGIS Maps SDK for JavaScript 5.0
 * ================================================
 * Educational map: guided tour, per-district coloring,
 * FeatureEffect, annotations, and redistricting analysis.
 */

// ============================================
// Module Imports
// ============================================
const [
  Map, MapView, FeatureLayer, GraphicsLayer,
  SimpleRenderer, UniqueValueRenderer,
  SimpleFillSymbol, SimpleLineSymbol,
  LabelClass, TextSymbol,
  Graphic, reactiveUtils, Extent, PopupTemplate, Color,
  FeatureEffect, FeatureFilter,
  Point, SimpleMarkerSymbol,
] = await $arcgis.import([
  "@arcgis/core/Map.js",
  "@arcgis/core/views/MapView.js",
  "@arcgis/core/layers/FeatureLayer.js",
  "@arcgis/core/layers/GraphicsLayer.js",
  "@arcgis/core/renderers/SimpleRenderer.js",
  "@arcgis/core/renderers/UniqueValueRenderer.js",
  "@arcgis/core/symbols/SimpleFillSymbol.js",
  "@arcgis/core/symbols/SimpleLineSymbol.js",
  "@arcgis/core/layers/support/LabelClass.js",
  "@arcgis/core/symbols/TextSymbol.js",
  "@arcgis/core/Graphic.js",
  "@arcgis/core/core/reactiveUtils.js",
  "@arcgis/core/geometry/Extent.js",
  "@arcgis/core/PopupTemplate.js",
  "@arcgis/core/Color.js",
  "@arcgis/core/layers/support/FeatureEffect.js",
  "@arcgis/core/layers/support/FeatureFilter.js",
  "@arcgis/core/geometry/Point.js",
  "@arcgis/core/symbols/SimpleMarkerSymbol.js",
]);

// ============================================
// Constants & Geography
// ============================================
const DISTRICTS_URL =
  "https://services.arcgis.com/P3ePLMYs2RVChkJx/ArcGIS/rest/services/USA_119th_Congressional_Districts/FeatureServer/0";

const STATE_EXTENTS = {
  CA:  new Extent({ xmin: -124.48, ymin: 32.53, xmax: -114.13, ymax: 42.01, spatialReference: { wkid: 4326 } }),
  TX:  new Extent({ xmin: -106.65, ymin: 25.84, xmax: -93.51,  ymax: 36.5,  spatialReference: { wkid: 4326 } }),
  NC:  new Extent({ xmin: -84.32,  ymin: 33.84, xmax: -75.46,  ymax: 36.59, spatialReference: { wkid: 4326 } }),
  USA: new Extent({ xmin: -130,    ymin: 23,    xmax: -65,      ymax: 50,    spatialReference: { wkid: 4326 } }),
};

const HOTSPOTS = {
  CA: { center: [-118.35, 34.05], zoom: 13 },
  TX: { center: [-95.45, 29.78],  zoom: 13 },
  NC: { center: [-78.64, 35.78],  zoom: 13 },
};

const FOCUS_STATES = ["CA", "TX", "NC"];

// ============================================
// Simulated Per-District Data
// ============================================
// lean: negative=D, positive=R | prevLean: before redistricting
// tactic: packed|cracked|preserved|competitive
// legalStatus: none|pending|challenged|lawsuit|court-upheld
const DISTRICT_DATA = {
  // --- CALIFORNIA (key contested districts) ---
  "CA01": { lean: -5,  prevLean: -3,  pop: 755000, tactic: "preserved",   legalStatus: "none",       affected: 12000,  description: "Rural Northern CA — minimal boundary changes" },
  "CA03": { lean: -8,  prevLean: -5,  pop: 762000, tactic: "packed",      legalStatus: "pending",    affected: 45000,  description: "Sacramento suburbs — packed with additional Dem voters" },
  "CA13": { lean: -4,  prevLean:  1,  pop: 748000, tactic: "cracked",     legalStatus: "challenged", affected: 68000,  description: "Central Valley — Republican voters cracked across neighboring districts" },
  "CA22": { lean:  2,  prevLean:  8,  pop: 751000, tactic: "competitive", legalStatus: "challenged", affected: 72000,  description: "Fresno-area — redrawn to be more competitive" },
  "CA27": { lean: -6,  prevLean: -1,  pop: 760000, tactic: "packed",      legalStatus: "pending",    affected: 58000,  description: "Northern LA suburbs — Dem voters packed in from CA-25" },
  "CA34": { lean: -28, prevLean: -22, pop: 752000, tactic: "packed",      legalStatus: "challenged", affected: 85000,  description: "Downtown LA — heavily packed with Dem voters from adjacent districts" },
  "CA37": { lean: -20, prevLean: -30, pop: 748000, tactic: "cracked",     legalStatus: "challenged", affected: 62000,  description: "South LA — some Dem voters moved to make CA-34 a super-safe seat" },
  "CA40": { lean: -3,  prevLean:  3,  pop: 758000, tactic: "cracked",     legalStatus: "lawsuit",    affected: 91000,  description: "Orange County — formerly R district redrawn toward D" },
  "CA45": { lean: 5,   prevLean: 10,  pop: 755000, tactic: "competitive", legalStatus: "pending",    affected: 54000,  description: "Inland Empire — made more competitive with new boundaries" },
  "CA47": { lean: -2,  prevLean:  4,  pop: 761000, tactic: "cracked",     legalStatus: "lawsuit",    affected: 78000,  description: "Coastal Orange County — R voters cracked to adjacent districts" },
  "CA49": { lean: -7,  prevLean: -2,  pop: 749000, tactic: "packed",      legalStatus: "pending",    affected: 42000,  description: "North San Diego — Dem voters added from redistricting" },

  // --- TEXAS (key contested districts) ---
  "TX02": { lean: 14,  prevLean:  8,  pop: 780000, tactic: "packed",      legalStatus: "lawsuit",    affected: 78000,  description: "NW Houston — packed with rural R voters to shore up GOP" },
  "TX06": { lean: 8,   prevLean:  3,  pop: 772000, tactic: "cracked",     legalStatus: "lawsuit",    affected: 65000,  description: "Arlington — Dem suburban voters cracked into TX-12 and TX-25" },
  "TX07": { lean: 5,   prevLean: -2,  pop: 770000, tactic: "cracked",     legalStatus: "lawsuit",    affected: 95000,  description: "Inner Houston — Dem-trending district cracked, flipped to R-lean" },
  "TX10": { lean: 10,  prevLean:  4,  pop: 765000, tactic: "cracked",     legalStatus: "pending",    affected: 72000,  description: "Austin suburbs — Dem voters cracked across rural districts" },
  "TX15": { lean: 6,   prevLean: -1,  pop: 758000, tactic: "cracked",     legalStatus: "lawsuit",    affected: 83000,  description: "Rio Grande Valley — historically D district redrawn to favor R" },
  "TX23": { lean: 4,   prevLean:  1,  pop: 776000, tactic: "preserved",   legalStatus: "pending",    affected: 31000,  description: "West Texas border — minor changes, remains competitive" },
  "TX24": { lean: 7,   prevLean:  1,  pop: 769000, tactic: "cracked",     legalStatus: "lawsuit",    affected: 88000,  description: "DFW suburbs — Dem-trending area cracked into safe R districts" },
  "TX28": { lean: -3,  prevLean: -8,  pop: 762000, tactic: "packed",      legalStatus: "pending",    affected: 55000,  description: "Laredo — Dem voters from TX-15 packed here" },
  "TX32": { lean: -12, prevLean: -6,  pop: 771000, tactic: "packed",      legalStatus: "pending",    affected: 48000,  description: "North Dallas — packed to become super-safe D to waste Dem votes" },
  "TX34": { lean: -15, prevLean: -10, pop: 756000, tactic: "packed",      legalStatus: "lawsuit",    affected: 61000,  description: "Brownsville — Dem voters concentrated from surrounding districts" },

  // --- NORTH CAROLINA (key contested districts) ---
  "NC01": { lean: -18, prevLean: -12, pop: 765000, tactic: "packed",      legalStatus: "court-upheld", affected: 92000,  description: "NE NC — historically Black district packed further to waste Dem votes" },
  "NC02": { lean: 8,   prevLean: -1,  pop: 768000, tactic: "cracked",     legalStatus: "court-upheld", affected: 110000, description: "Raleigh-area — urban Dem voters cracked across rural districts" },
  "NC04": { lean: -25, prevLean: -18, pop: 760000, tactic: "packed",      legalStatus: "court-upheld", affected: 75000,  description: "Durham — heavily packed to concentrate Dem votes in one seat" },
  "NC05": { lean: 12,  prevLean:  6,  pop: 758000, tactic: "cracked",     legalStatus: "court-upheld", affected: 68000,  description: "Piedmont Triad — Winston-Salem Dem voters cracked out" },
  "NC06": { lean: 14,  prevLean:  8,  pop: 763000, tactic: "cracked",     legalStatus: "court-upheld", affected: 82000,  description: "Greensboro split — Dem voters divided between NC-06 and NC-10" },
  "NC09": { lean: 10,  prevLean:  5,  pop: 770000, tactic: "preserved",   legalStatus: "none",         affected: 22000,  description: "Charlotte suburbs south — minor changes, remains R" },
  "NC10": { lean: 11,  prevLean:  7,  pop: 766000, tactic: "cracked",     legalStatus: "court-upheld", affected: 71000,  description: "Greensboro east — absorbed cracked Dem voters from NC-06" },
  "NC12": { lean: -22, prevLean: -15, pop: 759000, tactic: "packed",      legalStatus: "court-upheld", affected: 88000,  description: "Charlotte core — packed to waste Dem votes on huge margins" },
  "NC13": { lean: 9,   prevLean:  2,  pop: 758000, tactic: "cracked",     legalStatus: "court-upheld", affected: 96000,  description: "Raleigh suburbs — redrawn to split Dem-leaning Wake County" },
  "NC14": { lean: -20, prevLean: -14, pop: 761000, tactic: "packed",      legalStatus: "court-upheld", affected: 64000,  description: "Research Triangle — packed with Dem voters from cracked suburbs" },
};

/** Look up simulated data for a district */
function getDistrictData(districtId) {
  return DISTRICT_DATA[districtId] || null;
}

/** Convert lean value to color on the D-R spectrum */
function leanToColor(lean, alpha = 170) {
  if (lean <= -15) return [33, 102, 172, alpha];
  if (lean <= -5)  return [103, 169, 207, alpha];
  if (lean < 0)    return [209, 229, 240, alpha];
  if (lean === 0)  return [200, 200, 200, alpha];
  if (lean < 5)    return [253, 219, 199, alpha];
  if (lean < 15)   return [239, 138, 98, alpha];
  return [178, 24, 43, alpha];
}

// ============================================
// Map & View
// ============================================
const map = new Map({ basemap: "dark-gray-vector" });

const view = new MapView({
  container: "viewDiv",
  map,
  extent: STATE_EXTENTS.USA,
  constraints: { minZoom: 3, maxZoom: 20 },
  popup: {
    dockEnabled: true,
    dockOptions: { position: "bottom-right", breakpoint: false },
  },
});

// ============================================
// Annotations Layer (for tour markers)
// ============================================
const annotationsLayer = new GraphicsLayer({ title: "Annotations", listMode: "hide" });
map.add(annotationsLayer);

// ============================================
// Congressional Districts — Per-District Renderer
// ============================================
// Build unique value infos from DISTRICT_DATA for per-district coloring
const uniqueValueInfos = Object.entries(DISTRICT_DATA).map(([id, data]) => ({
  value: id,
  symbol: new SimpleFillSymbol({
    color: leanToColor(data.lean),
    outline: new SimpleLineSymbol({ color: [255, 255, 255, 120], width: 1 }),
  }),
}));

const districtsRenderer = new UniqueValueRenderer({
  field: "DISTRICTID",
  defaultSymbol: new SimpleFillSymbol({
    color: [70, 70, 90, 90],
    outline: new SimpleLineSymbol({ color: [255, 255, 255, 50], width: 0.4 }),
  }),
  defaultLabel: "Other Districts",
  uniqueValueInfos,
});

// Labels when zoomed in
const districtLabels = new LabelClass({
  labelExpressionInfo: { expression: "$feature.DISTRICTID" },
  symbol: new TextSymbol({
    color: [255, 255, 255, 220],
    haloColor: [0, 0, 0, 200],
    haloSize: 1.5,
    font: { size: 10, weight: "bold", family: "Avenir Next" },
  }),
  minScale: 5000000,
  maxScale: 0,
});

const districtsLayer = new FeatureLayer({
  url: DISTRICTS_URL,
  title: "Congressional Districts (119th)",
  renderer: districtsRenderer,
  labelingInfo: [districtLabels],
  outFields: ["*"],
  opacity: 0.75,
});

map.add(districtsLayer);

// Contested boundaries (dashed gold) for focus states
const contestedLayer = new FeatureLayer({
  url: DISTRICTS_URL,
  title: "Contested Boundaries",
  definitionExpression: "STATE_ABBR IN ('CA','TX','NC')",
  renderer: new SimpleRenderer({
    symbol: new SimpleFillSymbol({
      color: [0, 0, 0, 0],
      outline: new SimpleLineSymbol({ color: [255, 215, 0, 180], width: 2, style: "dash" }),
    }),
  }),
  minScale: 3000000,
  maxScale: 0,
  legendEnabled: false,
});

map.add(contestedLayer);

// ============================================
// FeatureEffect Helper
// ============================================
function applyFeatureEffect(whereClause) {
  if (!whereClause) {
    districtsLayer.featureEffect = null;
    return;
  }
  districtsLayer.featureEffect = new FeatureEffect({
    filter: new FeatureFilter({ where: whereClause }),
    excludedEffect: "blur(2px) brightness(0.35) grayscale(90%)",
    includedEffect: "brightness(1.15) drop-shadow(0px 0px 8px rgba(255,215,0,0.5))",
  });
}

function clearFeatureEffect() {
  districtsLayer.featureEffect = null;
}

// ============================================
// Annotations Helper
// ============================================
function showAnnotations(annotations) {
  annotationsLayer.removeAll();
  if (!annotations || annotations.length === 0) return;

  for (const ann of annotations) {
    if (ann.type === "pulse") {
      annotationsLayer.add(new Graphic({
        geometry: new Point({ longitude: ann.center[0], latitude: ann.center[1] }),
        symbol: new SimpleMarkerSymbol({
          style: "circle",
          color: [255, 215, 0, 100],
          size: 22,
          outline: { color: [255, 215, 0, 220], width: 3 },
        }),
      }));
      // Label
      annotationsLayer.add(new Graphic({
        geometry: new Point({ longitude: ann.center[0], latitude: ann.center[1] }),
        symbol: new TextSymbol({
          text: ann.label || "",
          color: [255, 255, 255],
          haloColor: [0, 0, 0, 220],
          haloSize: 2,
          font: { size: 11, weight: "bold", family: "Avenir Next" },
          yoffset: 22,
        }),
      }));
    }
    if (ann.type === "callout") {
      annotationsLayer.add(new Graphic({
        geometry: new Point({ longitude: ann.center[0], latitude: ann.center[1] }),
        symbol: new TextSymbol({
          text: ann.text,
          color: [255, 235, 150],
          haloColor: [0, 0, 0, 220],
          haloSize: 2,
          font: { size: 12, weight: "bold", family: "Avenir Next" },
          yoffset: -20,
        }),
      }));
    }
  }
}

// ============================================
// Story Tour Data
// ============================================
const STORY_STEPS = [
  {
    title: "What Is Redistricting?",
    narrative: "Every 10 years after the Census, states redraw congressional district lines to reflect population changes. Each district represents ~760,000 people. <strong>How those lines are drawn determines which party wins.</strong><br><br>In 2026, three states are doing something unusual: redrawing maps <em>mid-decade</em>. This could reshape who controls the U.S. House of Representatives.",
    target: STATE_EXTENTS.USA,
    filter: null,
    annotations: [],
    stats: null,
  },
  {
    title: "The Gerrymander's Toolkit",
    narrative: "<strong>Packing:</strong> Cramming opposing voters into a few districts so they win those seats by huge margins but waste votes elsewhere. The packed party wins fewer total seats.<br><br><strong>Cracking:</strong> Splitting opposing voters across many districts so they can never form a majority in any single one.<br><br>Both tactics let the party drawing the maps win more seats than their raw vote share would suggest.",
    target: STATE_EXTENTS.USA,
    filter: null,
    annotations: [],
    stats: null,
  },
  {
    title: "California: Prop 50 Changes Everything",
    narrative: "California passed <strong>Proposition 50</strong>, returning map-drawing power to the state legislature for the first time since 2010. The nonpartisan Citizens Redistricting Commission has been bypassed.<br><br>The Democratic supermajority aims to redraw boundaries to gain <strong>4-6 additional House seats</strong>, targeting competitive districts in Orange County, the Central Valley, and the Inland Empire.",
    target: STATE_EXTENTS.CA,
    filter: "STATE_ABBR = 'CA'",
    annotations: [],
    stats: { districts: 52, atStake: "4-6 seats", affectedVoters: "~2.1M" },
  },
  {
    title: "LA Hotspot: Where the Lines Shifted",
    narrative: "In Los Angeles, the <strong>CA-34 and CA-37</strong> boundary was redrawn to pack Democratic voters more densely into CA-34, while making adjacent districts more competitive.<br><br>Over <strong>85,000 voters</strong> were moved between districts. At street level, a single block determines which district &mdash; and which representative &mdash; these voters belong to.",
    target: { center: [-118.35, 34.05], zoom: 13 },
    filter: "STATE_ABBR = 'CA'",
    annotations: [
      { type: "pulse", center: [-118.35, 34.05], label: "CA-34 / CA-37 Boundary" },
      { type: "callout", center: [-118.32, 34.07], text: "85,000 voters reassigned" },
    ],
    stats: null,
  },
  {
    title: "Texas: The Republican Redraw",
    narrative: "Texas Republicans used their <strong>trifecta control</strong> (Governor, House, Senate) to redraw maps mid-cycle. The strategy targets suburban districts around Houston and Dallas-Fort Worth that had been trending Democratic since 2018.<br><br>Incumbent Democrats in at least <strong>3 districts</strong> were drawn out of their own seats. Legal challenges are pending in federal court.",
    target: STATE_EXTENTS.TX,
    filter: "STATE_ABBR = 'TX'",
    annotations: [],
    stats: { districts: 38, atStake: "3-4 seats", affectedVoters: "~1.8M" },
  },
  {
    title: "Houston Hotspot: TX-7 Cracked Apart",
    narrative: "The <strong>TX-7</strong> district, which flipped Democratic in 2018, was <em>cracked</em> apart. Its suburban Democratic voters were divided between the solidly Republican TX-2 and surrounding districts.<br><br>An estimated <strong>95,000 voters</strong> were moved. What was a competitive district is now safely Republican. This is textbook cracking in action.",
    target: { center: [-95.45, 29.78], zoom: 13 },
    filter: "STATE_ABBR = 'TX'",
    annotations: [
      { type: "pulse", center: [-95.45, 29.78], label: "TX-7 / TX-2 Boundary" },
      { type: "callout", center: [-95.42, 29.80], text: "95,000 voters moved" },
    ],
    stats: null,
  },
  {
    title: "North Carolina: A Court Reversal",
    narrative: "In 2022, the NC Supreme Court ruled partisan gerrymandering <strong>unconstitutional</strong>. But after the 2024 election flipped the court's partisan composition, the new conservative majority <strong>reversed its own precedent</strong> in 2025.<br><br>The green light allowed maps that pack Democratic voters into as few districts as possible, particularly in urban areas around Raleigh, Durham, Charlotte, and Greensboro.",
    target: STATE_EXTENTS.NC,
    filter: "STATE_ABBR = 'NC'",
    annotations: [],
    stats: { districts: 14, atStake: "2-3 seats", affectedVoters: "~890K" },
  },
  {
    title: "Raleigh Hotspot: NC-2 & NC-13",
    narrative: "The Raleigh-Durham metro area saw the most dramatic changes. <strong>NC-2</strong> was cracked to spread Democratic-leaning urban voters across multiple rural-dominated districts.<br><br>Over <strong>110,000 voters</strong> were reassigned. Wake County &mdash; one of the fastest-growing and most politically competitive counties in America &mdash; was deliberately split to dilute Democratic votes.",
    target: { center: [-78.64, 35.78], zoom: 13 },
    filter: "STATE_ABBR = 'NC'",
    annotations: [
      { type: "pulse", center: [-78.64, 35.78], label: "NC-2 / NC-13 Boundary" },
      { type: "callout", center: [-78.60, 35.80], text: "110,000 voters reassigned" },
    ],
    stats: null,
  },
  {
    title: "The National Impact",
    narrative: "Combined, these three states' redistricting could shift <strong>9-13 U.S. House seats</strong> &mdash; enough to change which party controls Congress.<br><br>Over <strong>4.8 million voters</strong> are affected. Legal challenges are pending in all three states, with outcomes expected before the November 2026 midterms. The results will shape American governance for the remainder of the decade.",
    target: STATE_EXTENTS.USA,
    filter: "STATE_ABBR IN ('CA','TX','NC')",
    annotations: [],
    stats: { districts: 104, atStake: "9-13 seats", affectedVoters: "~4.8M" },
  },
];

// ============================================
// Story Tour Engine
// ============================================
let currentStep = -1;
let tourActive = false;

const tourContent = document.getElementById("tour-content");
const tourNav = document.getElementById("tour-nav");
const tourProgressTrack = document.getElementById("tour-progress-track");
const tourProgressBar = document.getElementById("tour-progress-bar");
const tourStepLabel = document.getElementById("tour-step-label");
const btnTourPrev = document.getElementById("btn-tour-prev");
const btnTourNext = document.getElementById("btn-tour-next");

function startTour() {
  tourActive = true;
  tourNav.hidden = false;
  tourProgressTrack.hidden = false;
  goToStep(0);
}

function endTour() {
  tourActive = false;
  currentStep = -1;
  tourNav.hidden = true;
  tourProgressTrack.hidden = true;
  clearFeatureEffect();
  annotationsLayer.removeAll();
  view.goTo(STATE_EXTENTS.USA, { duration: 1200 });

  // Reset panel to intro
  tourContent.innerHTML = `
    <div class="tour-intro">
      <calcite-icon icon="tour" scale="l"></calcite-icon>
      <h3>Explore the 2026 Redistricting</h3>
      <p class="info-text">Take a 9-step guided tour through the most consequential mid-decade redistricting in modern American history.</p>
      <calcite-button id="btn-start-tour" width="full" icon-start="play" kind="brand" appearance="solid">Start Guided Tour</calcite-button>
    </div>
  `;
  document.getElementById("btn-start-tour").addEventListener("click", startTour);
}

async function goToStep(index) {
  if (index < 0 || index >= STORY_STEPS.length) return;
  currentStep = index;
  const step = STORY_STEPS[index];

  // Update UI
  updateTourPanel(step, index);

  // Fly to target
  await view.goTo(step.target, { duration: 1800 });

  // Apply FeatureEffect
  applyFeatureEffect(step.filter);

  // Show annotations
  showAnnotations(step.annotations);
}

function updateTourPanel(step, index) {
  const total = STORY_STEPS.length;

  let statsHTML = "";
  if (step.stats) {
    statsHTML = `
      <div class="tour-stats">
        <div class="tour-stat-item"><span class="tour-stat-value">${step.stats.districts}</span><span class="tour-stat-label">Districts</span></div>
        <div class="tour-stat-item"><span class="tour-stat-value">${step.stats.atStake}</span><span class="tour-stat-label">At Stake</span></div>
        <div class="tour-stat-item"><span class="tour-stat-value">${step.stats.affectedVoters}</span><span class="tour-stat-label">Voters Affected</span></div>
      </div>
    `;
  }

  tourContent.innerHTML = `
    <div class="tour-step-counter">Step ${index + 1} of ${total}</div>
    <h3 class="tour-title">${step.title}</h3>
    <p class="tour-narrative">${step.narrative}</p>
    ${statsHTML}
  `;

  // Nav buttons
  btnTourPrev.disabled = index === 0;
  btnTourNext.textContent = index === total - 1 ? "Finish" : "Next";
  btnTourNext.iconEnd = index === total - 1 ? "check" : "chevron-right";
  tourStepLabel.textContent = `${index + 1} / ${total}`;

  // Progress bar
  const pct = ((index + 1) / total) * 100;
  tourProgressBar.style.width = `${pct}%`;
}

// Tour event listeners
document.getElementById("btn-start-tour").addEventListener("click", startTour);
document.getElementById("btn-tour-close").addEventListener("click", endTour);
btnTourPrev.addEventListener("click", () => goToStep(currentStep - 1));
btnTourNext.addEventListener("click", () => {
  if (currentStep === STORY_STEPS.length - 1) {
    endTour();
  } else {
    goToStep(currentStep + 1);
  }
});

// ============================================
// Panel Switching (Action Bar)
// ============================================
const actionBar = document.getElementById("action-bar");
const panels = {
  tour:   document.getElementById("tour-panel"),
  states: document.getElementById("states-panel"),
  learn:  document.getElementById("learn-panel"),
  layers: document.getElementById("layers-panel"),
  legend: document.getElementById("legend-panel"),
};

let activePanel = "tour";

actionBar.addEventListener("click", (e) => {
  const action = e.target.closest("calcite-action");
  if (!action) return;
  const panelId = action.dataset.actionId;
  if (!panelId) return;

  if (panelId === activePanel) {
    document.getElementById("left-panel").collapsed = true;
    activePanel = null;
    actionBar.querySelectorAll("calcite-action").forEach((a) => (a.active = false));
    return;
  }

  Object.entries(panels).forEach(([id, panel]) => {
    panel.hidden = id !== panelId;
  });
  actionBar.querySelectorAll("calcite-action").forEach((a) => {
    a.active = a.dataset.actionId === panelId;
  });
  document.getElementById("left-panel").collapsed = false;
  activePanel = panelId;
});

// Set initial active panel
actionBar.querySelector('[data-action-id="tour"]').active = true;

// ============================================
// State Navigation
// ============================================
function flyToState(state) {
  view.goTo(STATE_EXTENTS[state], { duration: 1200 });
  if (state !== "USA") {
    applyFeatureEffect(`STATE_ABBR = '${state}'`);
  } else {
    clearFeatureEffect();
  }
  annotationsLayer.removeAll();
}

document.getElementById("btn-ca").addEventListener("click",  () => flyToState("CA"));
document.getElementById("btn-tx").addEventListener("click",  () => flyToState("TX"));
document.getElementById("btn-nc").addEventListener("click",  () => flyToState("NC"));
document.getElementById("btn-usa").addEventListener("click", () => flyToState("USA"));

// Hotspot chips
document.getElementById("chip-ca-hotspot").addEventListener("click", () => {
  view.goTo({ center: HOTSPOTS.CA.center, zoom: HOTSPOTS.CA.zoom }, { duration: 1500 });
  applyFeatureEffect("STATE_ABBR = 'CA'");
  showAnnotations([{ type: "pulse", center: HOTSPOTS.CA.center, label: "CA-34 / CA-37 Boundary" }]);
});
document.getElementById("chip-tx-hotspot").addEventListener("click", () => {
  view.goTo({ center: HOTSPOTS.TX.center, zoom: HOTSPOTS.TX.zoom }, { duration: 1500 });
  applyFeatureEffect("STATE_ABBR = 'TX'");
  showAnnotations([{ type: "pulse", center: HOTSPOTS.TX.center, label: "TX-7 / TX-2 Boundary" }]);
});
document.getElementById("chip-nc-hotspot").addEventListener("click", () => {
  view.goTo({ center: HOTSPOTS.NC.center, zoom: HOTSPOTS.NC.zoom }, { duration: 1500 });
  applyFeatureEffect("STATE_ABBR = 'NC'");
  showAnnotations([{ type: "pulse", center: HOTSPOTS.NC.center, label: "NC-2 / NC-13 Boundary" }]);
});

// ============================================
// Layer Toggles
// ============================================
document.getElementById("toggle-districts").addEventListener("calciteSwitchChange", (e) => {
  districtsLayer.visible = e.target.checked;
});
document.getElementById("toggle-contested").addEventListener("calciteSwitchChange", (e) => {
  contestedLayer.visible = e.target.checked;
});
document.getElementById("basemap-toggle").addEventListener("calciteSegmentedControlChange", (e) => {
  const selected = e.target.querySelector("calcite-segmented-control-item[checked]");
  if (selected) map.basemap = selected.value;
});
document.getElementById("opacity-slider").addEventListener("calciteSliderInput", (e) => {
  districtsLayer.opacity = e.target.value / 100;
});

// ============================================
// About Dialog
// ============================================
document.getElementById("btn-info").addEventListener("click", () => {
  document.getElementById("about-dialog").open = true;
});
document.getElementById("close-about").addEventListener("click", () => {
  document.getElementById("about-dialog").open = false;
});

// ============================================
// District Detail — Enhanced Click Handler
// ============================================
const detailContent = document.getElementById("detail-content");
const rightPanel = document.getElementById("right-panel");
const detailPanel = document.getElementById("detail-panel");

view.on("click", async (event) => {
  const response = await view.hitTest(event, { include: [districtsLayer] });
  if (response.results.length === 0) {
    rightPanel.collapsed = true;
    return;
  }

  const attrs = response.results[0].graphic.attributes;
  const state = attrs.STATE_ABBR || "N/A";
  const name = attrs.NAME || "District";
  const distId = attrs.DISTRICTID || "N/A";
  const sqmi = attrs.SQMI ? Number(attrs.SQMI).toLocaleString(undefined, { maximumFractionDigits: 0 }) : "N/A";
  const party = attrs.PARTY || "N/A";
  const rep = attrs.LAST_NAME || "Unknown";
  const isFocusState = FOCUS_STATES.includes(state);
  const dData = getDistrictData(distId);

  if (dData && isFocusState) {
    // === REDISTRICTING-ENHANCED DETAIL ===
    const leanLabel = dData.lean < 0 ? `D+${Math.abs(dData.lean)}` : dData.lean > 0 ? `R+${dData.lean}` : "Even";
    const prevLabel = dData.prevLean < 0 ? `D+${Math.abs(dData.prevLean)}` : dData.prevLean > 0 ? `R+${dData.prevLean}` : "Even";
    const shift = dData.lean - dData.prevLean;
    const shiftLabel = shift > 0 ? `R+${shift} shift` : shift < 0 ? `D+${Math.abs(shift)} shift` : "No shift";
    const shiftClass = shift > 0 ? "shift-rep" : shift < 0 ? "shift-dem" : "shift-none";
    const leanClass = dData.lean < 0 ? "dem" : dData.lean > 0 ? "rep" : "";
    // Map lean to percentage position on bar (D=-25 maps to 5%, R=+25 maps to 95%)
    const barPct = Math.max(5, Math.min(95, 50 + dData.lean * 1.8));

    const tacticLabels = {
      packed: "Packed (voters concentrated)",
      cracked: "Cracked (voters split)",
      preserved: "Preserved (minimal change)",
      competitive: "Made competitive",
    };

    const legalLabels = {
      none: "No legal challenge",
      pending: "Lawsuit pending",
      challenged: "Under legal challenge",
      lawsuit: "Active litigation",
      "court-upheld": "Court upheld new map",
      "struck-down": "Map struck down",
    };

    const legalKind = ["lawsuit", "challenged", "struck-down"].includes(dData.legalStatus) ? "danger"
      : dData.legalStatus === "pending" ? "warning" : "brand";

    detailContent.innerHTML = `
      <div class="detail-header">${name}</div>

      <div class="detail-label">Current Partisan Lean</div>
      <div class="lean-bar-container">
        <div class="lean-bar"></div>
        <div class="lean-indicator" style="left:${barPct}%"></div>
      </div>
      <div class="lean-labels">
        <span class="dem">D</span>
        <span class="lean-value ${leanClass}">${leanLabel}</span>
        <span class="rep">R</span>
      </div>

      <div class="detail-grid">
        <div><div class="detail-label">Representative</div><div class="detail-value">${rep} (${party})</div></div>
        <div><div class="detail-label">Area</div><div class="detail-value">${sqmi} sq mi</div></div>
        <div><div class="detail-label">Est. Population</div><div class="detail-value">${dData.pop.toLocaleString()}</div></div>
        <div><div class="detail-label">Lean Shift</div><div class="detail-value"><span class="shift-badge ${shiftClass}">${prevLabel} &rarr; ${leanLabel}</span></div></div>
      </div>

      <div class="impact-section">
        <div class="impact-title">Redistricting Impact</div>
        <div class="impact-row"><span class="impact-row-label">Tactic Used</span><span class="impact-row-value">${tacticLabels[dData.tactic]}</span></div>
        <div class="impact-row"><span class="impact-row-label">Voters Reassigned</span><span class="impact-row-value">${dData.affected.toLocaleString()}</span></div>
        <div class="impact-row"><span class="impact-row-label">Legal Status</span><span class="impact-row-value">${legalLabels[dData.legalStatus]}</span></div>
        <div class="impact-row"><span class="impact-row-label">Net Shift</span><span class="impact-row-value"><span class="shift-badge ${shiftClass}">${shiftLabel}</span></span></div>
      </div>

      <calcite-notice open kind="${legalKind}" icon="exclamation-mark-triangle" scale="s">
        <span slot="title">2026 Redistricting</span>
        <span slot="message">${dData.description}</span>
      </calcite-notice>
    `;
  } else {
    // === BASIC DETAIL (non-focus district) ===
    detailContent.innerHTML = `
      <div class="detail-header">${name}</div>
      <div class="detail-grid">
        <div><div class="detail-label">State</div><div class="detail-value">${state}</div></div>
        <div><div class="detail-label">District</div><div class="detail-value">${distId}</div></div>
        <div><div class="detail-label">Representative</div><div class="detail-value">${rep} (${party})</div></div>
        <div><div class="detail-label">Area</div><div class="detail-value">${sqmi} sq mi</div></div>
      </div>
      <calcite-notice open kind="brand" icon="check-circle" scale="s">
        <span slot="message">This district was not part of the 2026 mid-decade redistricting.</span>
      </calcite-notice>
    `;
  }

  rightPanel.collapsed = false;
});

detailPanel.addEventListener("calcitePanelClose", () => {
  rightPanel.collapsed = true;
});

// ============================================
// Street-Level Zoom Notice
// ============================================
const streetNotice = document.getElementById("street-notice");

reactiveUtils.watch(
  () => view.zoom,
  (zoom) => { streetNotice.hidden = zoom < 14; }
);

// ============================================
// Ready
// ============================================
view.when(() => {
  console.log(
    "%c The Great Mid-Decade Redistricting ",
    "background:#1a1a2e; color:#67a9cf; font-size:14px; padding:6px 12px; border-radius:4px;"
  );
  console.log("ArcGIS Maps SDK 5.0 | Educational redistricting map loaded");
});
