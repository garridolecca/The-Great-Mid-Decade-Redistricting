/**
 * The Great Mid-Decade Redistricting — App Logic
 * ArcGIS Maps SDK for JavaScript 5.0
 * ================================================
 * Visualizes 2026 mid-decade congressional redistricting
 * in California, Texas, and North Carolina.
 */

// ------------------------------------
// Module imports via $arcgis.import()
// ------------------------------------
const [
  Map,
  MapView,
  FeatureLayer,
  SimpleRenderer,
  UniqueValueRenderer,
  SimpleFillSymbol,
  SimpleLineSymbol,
  LabelClass,
  TextSymbol,
  Graphic,
  reactiveUtils,
  Extent,
  PopupTemplate,
  Color,
] = await $arcgis.import([
  "@arcgis/core/Map.js",
  "@arcgis/core/views/MapView.js",
  "@arcgis/core/layers/FeatureLayer.js",
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
]);

// ------------------------------------
// Constants
// ------------------------------------
const DISTRICTS_URL =
  "https://services.arcgis.com/P3ePLMYs2RVChkJx/ArcGIS/rest/services/USA_119th_Congressional_Districts/FeatureServer/0";

const STATE_EXTENTS = {
  CA: new Extent({ xmin: -124.48, ymin: 32.53, xmax: -114.13, ymax: 42.01, spatialReference: { wkid: 4326 } }),
  TX: new Extent({ xmin: -106.65, ymin: 25.84, xmax: -93.51,  ymax: 36.5,  spatialReference: { wkid: 4326 } }),
  NC: new Extent({ xmin: -84.32,  ymin: 33.84, xmax: -75.46,  ymax: 36.59, spatialReference: { wkid: 4326 } }),
  USA: new Extent({ xmin: -130,   ymin: 23,    xmax: -65,     ymax: 50,    spatialReference: { wkid: 4326 } }),
};

// Hotspot zoom locations — contested boundary areas
const HOTSPOTS = {
  CA: { center: [-118.35, 34.05], zoom: 13 },   // Los Angeles — CA-34/CA-37 boundary
  TX: { center: [-95.45, 29.78],  zoom: 13 },    // Houston — TX-7/TX-2 boundary
  NC: { center: [-78.64, 35.78],  zoom: 13 },    // Raleigh — NC-2/NC-13 boundary
};

// Party-lean color ramp (blue to red)
const PARTY_COLORS = {
  strongD:  [33, 102, 172, 180],   // #2166ac
  leanD:    [103, 169, 207, 180],  // #67a9cf
  tiltD:    [209, 229, 240, 180],  // #d1e5f0
  tossup:   [247, 247, 247, 160],  // #f7f7f7
  tiltR:    [253, 219, 199, 180],  // #fddbc7
  leanR:    [239, 138, 98, 180],   // #ef8a62
  strongR:  [178, 24, 43, 180],    // #b2182b
};

// Simulated partisan lean by state FIPS code for visual rendering
// In production this would come from election data joined to the districts
const STATE_LEAN = {
  "06": "D",  // California
  "48": "R",  // Texas
  "37": "R",  // North Carolina
};

// ------------------------------------
// Create the Map
// ------------------------------------
const map = new Map({
  basemap: "dark-gray-vector",
});

const view = new MapView({
  container: "viewDiv",
  map: map,
  extent: STATE_EXTENTS.USA,
  constraints: {
    minZoom: 3,
    maxZoom: 20,
  },
  popup: {
    dockEnabled: true,
    dockOptions: {
      position: "bottom-right",
      breakpoint: false,
    },
  },
});

// ------------------------------------
// Congressional Districts Layer
// ------------------------------------

// Popup template for districts
const districtPopup = new PopupTemplate({
  title: "{NAME}",
  content: [
    {
      type: "fields",
      fieldInfos: [
        { fieldName: "STATE_ABBR", label: "State" },
        { fieldName: "DISTRICTID", label: "District ID" },
        { fieldName: "NAME", label: "District Name" },
        { fieldName: "PARTY", label: "Party" },
        { fieldName: "SQMI", label: "Area (sq mi)", format: { digitSeparator: true, places: 0 } },
        { fieldName: "POPULATION", label: "Population", format: { digitSeparator: true, places: 0 } },
      ],
    },
  ],
});

// Renderer: Color districts using a Visual Variable based on the PARTY field
// Since the live layer may not have a PARTY field, we use state-based coloring
// with unique values on STATE_ABBR for focus states, default gray for others
const districtsRenderer = new UniqueValueRenderer({
  field: "STATE_ABBR",
  defaultSymbol: new SimpleFillSymbol({
    color: [80, 80, 100, 100],
    outline: new SimpleLineSymbol({
      color: [255, 255, 255, 60],
      width: 0.5,
    }),
  }),
  uniqueValueInfos: [
    // California — blue tones (Dem-controlled redistricting)
    {
      value: "CA",
      symbol: new SimpleFillSymbol({
        color: [103, 169, 207, 160],
        outline: new SimpleLineSymbol({ color: [255, 255, 255, 120], width: 1 }),
      }),
      label: "California (Dem-drawn)",
    },
    // Texas — red tones (GOP-drawn)
    {
      value: "TX",
      symbol: new SimpleFillSymbol({
        color: [239, 138, 98, 160],
        outline: new SimpleLineSymbol({ color: [255, 255, 255, 120], width: 1 }),
      }),
      label: "Texas (GOP-drawn)",
    },
    // North Carolina — red tones (GOP-drawn)
    {
      value: "NC",
      symbol: new SimpleFillSymbol({
        color: [178, 24, 43, 140],
        outline: new SimpleLineSymbol({ color: [255, 255, 255, 120], width: 1 }),
      }),
      label: "North Carolina (GOP-drawn)",
    },
  ],
});

// Labels for district names when zoomed in
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
  popupTemplate: districtPopup,
  outFields: ["*"],
  opacity: 0.7,
});

map.add(districtsLayer);

// ------------------------------------
// Highlighted boundary layer for contested areas
// ------------------------------------
const contestedStates = ["CA", "TX", "NC"];

const highlightLayer = new FeatureLayer({
  url: DISTRICTS_URL,
  title: "Contested Boundaries",
  definitionExpression: `STATE_ABBR IN ('CA','TX','NC')`,
  renderer: new SimpleRenderer({
    symbol: new SimpleFillSymbol({
      color: [0, 0, 0, 0],
      outline: new SimpleLineSymbol({
        color: [255, 215, 0, 200],
        width: 2,
        style: "dash",
      }),
    }),
  }),
  minScale: 2000000,
  maxScale: 0,
  legendEnabled: false,
});

map.add(highlightLayer);

// ------------------------------------
// UI: Action Bar Panel Switching
// ------------------------------------
const actionBar = document.getElementById("action-bar");
const panels = {
  states: document.getElementById("states-panel"),
  layers: document.getElementById("layers-panel"),
  legend: document.getElementById("legend-panel"),
};

let activePanel = "states";

actionBar.addEventListener("click", (e) => {
  const action = e.target.closest("calcite-action");
  if (!action) return;

  const panelId = action.dataset.actionId;
  if (!panelId) return;

  // Toggle: if clicking active panel, collapse
  if (panelId === activePanel) {
    document.getElementById("left-panel").collapsed = true;
    activePanel = null;
    actionBar.querySelectorAll("calcite-action").forEach((a) => (a.active = false));
    return;
  }

  // Switch panel
  Object.entries(panels).forEach(([id, panel]) => {
    panel.hidden = id !== panelId;
  });
  actionBar.querySelectorAll("calcite-action").forEach((a) => {
    a.active = a.dataset.actionId === panelId;
  });
  document.getElementById("left-panel").collapsed = false;
  activePanel = panelId;
});

// Set initial active
actionBar.querySelector('[data-action-id="states"]').active = true;

// ------------------------------------
// UI: State Navigation
// ------------------------------------
document.getElementById("btn-ca").addEventListener("click", () => {
  view.goTo(STATE_EXTENTS.CA, { duration: 1200 });
});

document.getElementById("btn-tx").addEventListener("click", () => {
  view.goTo(STATE_EXTENTS.TX, { duration: 1200 });
});

document.getElementById("btn-nc").addEventListener("click", () => {
  view.goTo(STATE_EXTENTS.NC, { duration: 1200 });
});

document.getElementById("btn-usa").addEventListener("click", () => {
  view.goTo(STATE_EXTENTS.USA, { duration: 1200 });
});

// Hotspot chips
document.getElementById("chip-ca-hotspot").addEventListener("click", () => {
  view.goTo({ center: HOTSPOTS.CA.center, zoom: HOTSPOTS.CA.zoom }, { duration: 1500 });
});

document.getElementById("chip-tx-hotspot").addEventListener("click", () => {
  view.goTo({ center: HOTSPOTS.TX.center, zoom: HOTSPOTS.TX.zoom }, { duration: 1500 });
});

document.getElementById("chip-nc-hotspot").addEventListener("click", () => {
  view.goTo({ center: HOTSPOTS.NC.center, zoom: HOTSPOTS.NC.zoom }, { duration: 1500 });
});

// ------------------------------------
// UI: Layer Toggles
// ------------------------------------
document.getElementById("toggle-districts").addEventListener("calciteSwitchChange", (e) => {
  districtsLayer.visible = e.target.checked;
});

document.getElementById("toggle-states").addEventListener("calciteSwitchChange", (e) => {
  highlightLayer.visible = e.target.checked;
});

// Basemap toggle
document.getElementById("basemap-toggle").addEventListener("calciteSegmentedControlChange", (e) => {
  const selected = e.target.querySelector("calcite-segmented-control-item[checked]");
  if (selected) {
    map.basemap = selected.value;
  }
});

// Opacity slider
document.getElementById("opacity-slider").addEventListener("calciteSliderInput", (e) => {
  districtsLayer.opacity = e.target.value / 100;
});

// ------------------------------------
// UI: About Dialog
// ------------------------------------
document.getElementById("btn-info").addEventListener("click", () => {
  document.getElementById("about-dialog").open = true;
});

document.getElementById("close-about").addEventListener("click", () => {
  document.getElementById("about-dialog").open = false;
});

// ------------------------------------
// UI: Right Panel — District Detail on Click
// ------------------------------------
const detailContent = document.getElementById("detail-content");
const rightPanel = document.getElementById("right-panel");
const detailPanel = document.getElementById("detail-panel");

view.on("click", async (event) => {
  const response = await view.hitTest(event, { include: [districtsLayer] });
  const results = response.results;

  if (results.length === 0) {
    rightPanel.collapsed = true;
    return;
  }

  const graphic = results[0].graphic;
  const attrs = graphic.attributes;

  const state = attrs.STATE_ABBR || "N/A";
  const name = attrs.NAME || attrs.NAMELSAD || "District";
  const distId = attrs.DISTRICTID || attrs.CD119FP || "N/A";
  const population = attrs.POPULATION ? Number(attrs.POPULATION).toLocaleString() : "N/A";
  const sqmi = attrs.SQMI ? Number(attrs.SQMI).toLocaleString(undefined, { maximumFractionDigits: 0 }) : "N/A";

  // Determine party lean color
  const lean = STATE_LEAN[attrs.STATE_FIPS] || STATE_LEAN[attrs.STATEFP] || null;
  const leanLabel = lean === "D" ? "Dem-leaning" : lean === "R" ? "GOP-leaning" : "Mixed";
  const leanClass = lean === "D" ? "dem" : lean === "R" ? "rep" : "";
  const isFocusState = contestedStates.includes(state);

  detailContent.innerHTML = `
    <div class="detail-header">${name}</div>
    <div class="detail-grid">
      <div>
        <div class="detail-label">State</div>
        <div class="detail-value">${state}</div>
      </div>
      <div>
        <div class="detail-label">District</div>
        <div class="detail-value">${distId}</div>
      </div>
      <div>
        <div class="detail-label">Population</div>
        <div class="detail-value">${population}</div>
      </div>
      <div>
        <div class="detail-label">Area</div>
        <div class="detail-value">${sqmi} sq mi</div>
      </div>
      <div>
        <div class="detail-label">Redistricting</div>
        <div class="detail-value ${leanClass}">${isFocusState ? "2026 Redrawn" : "No change"}</div>
      </div>
      <div>
        <div class="detail-label">Lean</div>
        <div class="detail-value ${leanClass}">${leanLabel}</div>
      </div>
    </div>
    ${isFocusState ? `
      <calcite-notice open kind="warning" icon="exclamation-mark-triangle" scale="s">
        <span slot="title">Contested District</span>
        <span slot="message">This district was redrawn mid-decade in 2026. Boundary changes here are subject to ongoing legal challenges.</span>
      </calcite-notice>
    ` : `
      <calcite-notice open kind="brand" icon="check-circle" scale="s">
        <span slot="message">This district was not part of the 2026 mid-decade redistricting.</span>
      </calcite-notice>
    `}
  `;

  rightPanel.collapsed = false;
});

// Close right panel
detailPanel.addEventListener("calcitePanelClose", () => {
  rightPanel.collapsed = true;
});

// ------------------------------------
// Zoom-Level Street Notice
// ------------------------------------
const streetNotice = document.getElementById("street-notice");

reactiveUtils.watch(
  () => view.zoom,
  (zoom) => {
    if (zoom >= 14) {
      streetNotice.hidden = false;
    } else {
      streetNotice.hidden = true;
    }
  }
);

// ------------------------------------
// Console welcome
// ------------------------------------
view.when(() => {
  console.log(
    "%c The Great Mid-Decade Redistricting ",
    "background:#1a1a2e; color:#67a9cf; font-size:14px; padding:6px 12px; border-radius:4px;"
  );
  console.log("ArcGIS Maps SDK 5.0 | Map loaded successfully");
});
