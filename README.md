# The Great Mid-Decade Redistricting

**[Live Demo](https://garridolecca.github.io/The-Great-Mid-Decade-Redistricting/)**

Interactive map application visualizing the 2026 mid-decade congressional redistricting in the United States.

## Overview

In an unusual move for 2026, several U.S. states are redrawing their congressional maps mid-decade. This app lets you explore how redistricting reshapes political representation — from statewide overviews down to individual streets.

### Focus States

- **California (Prop 50)** — Legislature-drawn map aims to shift House control by redrawing liberal and conservative strongholds
- **Texas** — Redraws significantly favor Republicans, sparking intense legal battles
- **North Carolina** — Reversed precedent enables partisan gerrymandering

## Features

- Congressional district boundaries color-coded by party control
- Navigate to focus states (CA, TX, NC) with one click
- Street-level zoom to see how a single boundary shift can flip a district
- Hotspot views for contested boundary areas
- Layer toggles, basemap switching, and opacity controls
- District detail panel with demographics on click

## Tech Stack

- **ArcGIS Maps SDK for JavaScript 5.0**
- **Calcite Design System** (dark theme)
- **Esri Living Atlas** — USA 119th Congressional Districts

## Getting Started

1. Clone the repository
2. Open the project folder in VS Code
3. Use the Live Server extension (or any local HTTP server) to serve `index.html`
4. The app loads directly from CDN — no build step required

```bash
# Example with Python
cd The-Great-Mid-Decade-Redistricting
python -m http.server 8080
```

Then open `http://localhost:8080` in your browser.

## Project Structure

```
The-Great-Mid-Decade-Redistricting/
├── index.html          # Main HTML with Calcite shell layout
├── css/
│   └── styles.css      # App styles and theming
├── js/
│   └── app.js          # Map logic, layer config, UI interactions
├── assets/             # (reserved for future static assets)
├── .gitignore
└── README.md
```

## Data Sources

- [Esri Living Atlas — USA 119th Congressional Districts](https://services.arcgis.com/P3ePLMYs2RVChkJx/ArcGIS/rest/services/USA_119th_Congressional_Districts/FeatureServer)
- U.S. Census Bureau

## License

MIT
