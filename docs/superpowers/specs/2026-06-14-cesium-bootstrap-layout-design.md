# Cesium Bootstrap Layout Design

## Goal

Build a lightweight two-page static website for displaying a Cesium map with a modern, futuristic, dynamic, and responsive Bootstrap-based interface.

## Scope

The project will use plain HTML, CSS, and JavaScript without a build tool. Bootstrap 5 and CesiumJS will be loaded from CDNs. The site will include a main map page and a second content page for future expansion.

## Layout

The main page uses a fixed Bootstrap navbar with a brand label and two navigation links. The Cesium viewer fills the viewport under the navbar. A compact glass-style control panel floats above the map and provides map status, quick actions, and layer toggles.

The second page reuses the same visual language and navbar. It acts as a responsive placeholder page for future content, with modern panels and short sections that can later be replaced.

## Files

- `index.html`: main Cesium map page.
- `page2.html`: second static page placeholder.
- `assets/css/style.css`: responsive futuristic visual styling.
- `assets/js/map.js`: Cesium initialization and map controls.
- `tests/verify-static-site.ps1`: static verification script for required files and markup.

## Constraints

The site must be easy to run under Laragon as static files. It must avoid npm, bundlers, and local package installation. Cesium access token support should be optional through a simple variable in `map.js`.
