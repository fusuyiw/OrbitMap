# Cesium Bootstrap Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a responsive two-page static Cesium map layout using Bootstrap and Cesium CDNs.

**Architecture:** The site is static and split into focused files. HTML files own page structure, CSS owns the futuristic responsive theme, and `map.js` owns Cesium viewer setup and map controls.

**Tech Stack:** HTML5, CSS3, vanilla JavaScript, Bootstrap 5 CDN, Bootstrap Icons CDN, CesiumJS CDN.

---

### Task 1: Static Verification Script

**Files:**
- Create: `tests/verify-static-site.ps1`

- [ ] **Step 1: Write the failing verification script**

```powershell
$root = Split-Path -Parent $PSScriptRoot
$requiredFiles = @(
  'index.html',
  'page2.html',
  'assets/css/style.css',
  'assets/js/map.js'
)

foreach ($file in $requiredFiles) {
  if (-not (Test-Path (Join-Path $root $file))) {
    throw "Missing required file: $file"
  }
}

$index = Get-Content -Raw (Join-Path $root 'index.html')
$page2 = Get-Content -Raw (Join-Path $root 'page2.html')
$css = Get-Content -Raw (Join-Path $root 'assets/css/style.css')
$js = Get-Content -Raw (Join-Path $root 'assets/js/map.js')

if ($index -notmatch 'cdn.jsdelivr.net/npm/bootstrap') { throw 'index.html must load Bootstrap CDN' }
if ($index -notmatch 'cesium.com/downloads/cesiumjs') { throw 'index.html must load Cesium CDN' }
if ($index -notmatch 'id="cesiumContainer"') { throw 'index.html must include #cesiumContainer' }
if ($index -notmatch 'navbar') { throw 'index.html must include a navbar' }
if ($page2 -notmatch 'navbar') { throw 'page2.html must include a navbar' }
if ($css -notmatch 'glass-panel') { throw 'style.css must include glass panel styles' }
if ($js -notmatch 'new Cesium.Viewer') { throw 'map.js must initialize Cesium.Viewer' }

Write-Host 'Static site verification passed.'
```

- [ ] **Step 2: Run the script to verify it fails**

Run: `powershell -ExecutionPolicy Bypass -File tests/verify-static-site.ps1`

Expected: FAIL with `Missing required file: index.html`.

### Task 2: Static Site Files

**Files:**
- Create: `index.html`
- Create: `page2.html`
- Create: `assets/css/style.css`
- Create: `assets/js/map.js`

- [ ] **Step 1: Create the page files**

Create the full static HTML, CSS, and JS files using Bootstrap and Cesium CDNs.

- [ ] **Step 2: Run static verification**

Run: `powershell -ExecutionPolicy Bypass -File tests/verify-static-site.ps1`

Expected: PASS with `Static site verification passed.`

### Task 3: Browser Verification

**Files:**
- Verify: `index.html`
- Verify: `page2.html`

- [ ] **Step 1: Open the local HTML page**

Open `index.html` in the in-app browser with a local file URL.

- [ ] **Step 2: Check responsive rendering**

Verify that the navbar, Cesium container, and floating panel render without overlapping on desktop and mobile widths.
