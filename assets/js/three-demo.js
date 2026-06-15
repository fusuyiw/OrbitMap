import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

const terrainFiles = {
  dtm: {
    label: "DTM",
    file: "assets/terrain/dtm-height.png",
    minHeight: 60,
    maxHeight: 101,
    exaggeration: 0.8
  },
  dsm: {
    label: "DSM",
    file: "assets/terrain/dsm-height.png",
    minHeight: 60,
    maxHeight: 101,
    exaggeration: 0.45
  }
};

const contourFile = "assets/terrain/kontur.geojson";
const terrainBounds = {
  minLon: 117.35147180716856,
  minLat: 2.807803357700224,
  maxLon: 117.35561327955557,
  maxLat: 2.80919302540498
};

const terrainWidth = 150;
const terrainDepth =
  terrainWidth *
  ((terrainBounds.maxLat - terrainBounds.minLat) /
    (terrainBounds.maxLon - terrainBounds.minLon));
const verticalScale = 1;
const maxSegments = 260;
const alphaThreshold = 16;

const mount = document.getElementById("three-demo-canvas");
const datasetLabel = document.getElementById("threeDatasetLabel");
const contourLabel = document.getElementById("threeContourLabel");

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
camera.position.set(85, 78, 92);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(mount.clientWidth, mount.clientHeight);
renderer.shadowMap.enabled = true;
mount.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.target.set(0, 18, 0);

scene.add(new THREE.AmbientLight(0xd7e8ff, 0.85));

const sun = new THREE.DirectionalLight(0xffffff, 1.75);
sun.position.set(45, 80, 35);
scene.add(sun);

let terrain = null;
let wire = null;
let contourGroup = new THREE.Group();
let currentGeometry = null;
let contourGeoJson = null;

scene.add(contourGroup);

function setDatasetLabel(value) {
  if (datasetLabel) {
    datasetLabel.textContent = value;
  }
}

function setContourLabel(value) {
  if (contourLabel) {
    contourLabel.textContent = value;
  }
}

function loadImage(src) {
  return new Promise(function (resolve, reject) {
    const image = new Image();
    image.onload = function () {
      resolve(image);
    };
    image.onerror = function () {
      reject(new Error("Gagal memuat image: " + src));
    };
    image.src = src;
  });
}

function readHeightmap(image) {
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;

  const context = canvas.getContext("2d", { willReadFrequently: true });
  context.drawImage(image, 0, 0);

  return {
    width: canvas.width,
    height: canvas.height,
    pixels: context.getImageData(0, 0, canvas.width, canvas.height).data
  };
}

function percentile(values, amount) {
  const sorted = values.slice().sort(function (a, b) {
    return a - b;
  });
  const index = Math.min(
    sorted.length - 1,
    Math.max(0, Math.floor(sorted.length * amount))
  );
  return sorted[index];
}

function luminance(red, green, blue) {
  return red * 0.2126 + green * 0.7152 + blue * 0.0722;
}

function fillInvalidHeightPixels(values, valid, width, height) {
  for (let pass = 0; pass < 5; pass += 1) {
    let filled = 0;
    const nextValues = values.slice();
    const nextValid = valid.slice();

    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const index = y * width + x;
        if (valid[index]) {
          continue;
        }

        let total = 0;
        let count = 0;
        for (let oy = -1; oy <= 1; oy += 1) {
          for (let ox = -1; ox <= 1; ox += 1) {
            if (ox === 0 && oy === 0) {
              continue;
            }

            const nx = x + ox;
            const ny = y + oy;
            if (nx < 0 || ny < 0 || nx >= width || ny >= height) {
              continue;
            }

            const neighborIndex = ny * width + nx;
            if (valid[neighborIndex]) {
              total += values[neighborIndex];
              count += 1;
            }
          }
        }

        if (count > 0) {
          nextValues[index] = total / count;
          nextValid[index] = 1;
          filled += 1;
        }
      }
    }

    values.set(nextValues);
    valid.set(nextValid);

    if (filled === 0) {
      break;
    }
  }
}

function smoothHeightPixels(values, width, height) {
  const smoothed = values.slice();
  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      let total = 0;
      for (let oy = -1; oy <= 1; oy += 1) {
        for (let ox = -1; ox <= 1; ox += 1) {
          total += values[(y + oy) * width + x + ox];
        }
      }
      smoothed[y * width + x] = total / 9;
    }
  }
  return smoothed;
}

function sanitizeHeightmap(heightmap) {
  const pixelCount = heightmap.width * heightmap.height;
  const values = new Float32Array(pixelCount);
  const valid = new Uint8Array(pixelCount);
  const validValues = [];

  for (let i = 0; i < pixelCount; i += 1) {
    const pixelIndex = i * 4;
    const alpha = heightmap.pixels[pixelIndex + 3];
    const value =
      luminance(
        heightmap.pixels[pixelIndex],
        heightmap.pixels[pixelIndex + 1],
        heightmap.pixels[pixelIndex + 2]
      ) / 255;

    values[i] = value;
    if (alpha > alphaThreshold) {
      valid[i] = 1;
      validValues.push(value);
    }
  }

  const low = percentile(validValues, 0.02);
  const high = percentile(validValues, 0.98);
  const range = Math.max(high - low, 0.001);

  for (let i = 0; i < pixelCount; i += 1) {
    if (!valid[i]) {
      values[i] = 0;
      continue;
    }

    values[i] = THREE.MathUtils.clamp((values[i] - low) / range, 0, 1);
  }

  fillInvalidHeightPixels(values, valid, heightmap.width, heightmap.height);

  return {
    width: heightmap.width,
    height: heightmap.height,
    values: smoothHeightPixels(values, heightmap.width, heightmap.height)
  };
}

function sampleHeight(heightmap, x, y, dataset) {
  const sourceX = Math.min(
    heightmap.width - 1,
    Math.max(0, Math.round(x * (heightmap.width - 1)))
  );
  const sourceY = Math.min(
    heightmap.height - 1,
    Math.max(0, Math.round(y * (heightmap.height - 1)))
  );
  const index = sourceY * heightmap.width + sourceX;
  const normalized = heightmap.values[index];
  const realHeight = THREE.MathUtils.lerp(
    dataset.minHeight,
    dataset.maxHeight,
    normalized
  );

  return {
    normalized,
    displayHeight:
      (realHeight - dataset.minHeight) * verticalScale * dataset.exaggeration
  };
}

function colorFromHeight(normalized) {
  const color = new THREE.Color();
  color.setHSL(0.62 - normalized * 0.62, 0.94, 0.48 + normalized * 0.18);
  return color;
}

function disposeTerrain() {
  if (terrain) {
    terrain.geometry.dispose();
    terrain.material.dispose();
    scene.remove(terrain);
    terrain = null;
  }

  if (wire) {
    wire.geometry.dispose();
    wire.material.dispose();
    scene.remove(wire);
    wire = null;
  }
}

async function buildTerrain(datasetKey) {
  const dataset = terrainFiles[datasetKey];
  setDatasetLabel("Memuat " + dataset.label);

  const image = await loadImage(dataset.file);
  const heightmap = sanitizeHeightmap(readHeightmap(image));
  const widthSegments = Math.min(maxSegments, heightmap.width - 1);
  const depthSegments = Math.max(
    24,
    Math.round(widthSegments * (heightmap.height / heightmap.width))
  );
  const geometry = new THREE.PlaneGeometry(
    terrainWidth,
    terrainDepth,
    widthSegments,
    depthSegments
  );
  geometry.rotateX(-Math.PI / 2);

  const colors = [];
  const position = geometry.attributes.position;
  for (let i = 0; i < position.count; i += 1) {
    const u = (position.getX(i) + terrainWidth / 2) / terrainWidth;
    const v = (position.getZ(i) + terrainDepth / 2) / terrainDepth;
    const height = sampleHeight(heightmap, u, 1 - v, dataset);
    const color = colorFromHeight(height.normalized);

    position.setY(i, height.displayHeight);
    colors.push(color.r, color.g, color.b);
  }

  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();

  disposeTerrain();

  terrain = new THREE.Mesh(
    geometry,
    new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.68,
      metalness: 0.04,
      side: THREE.DoubleSide
    })
  );
  terrain.receiveShadow = true;
  scene.add(terrain);

  wire = new THREE.LineSegments(
    new THREE.WireframeGeometry(geometry),
    new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.1
    })
  );
  wire.visible = false;
  scene.add(wire);

  currentGeometry = geometry;
  setDatasetLabel(dataset.label);
  rebuildContours();
}

function projectCoordinate(lon, lat, height) {
  const x =
    ((lon - terrainBounds.minLon) /
      (terrainBounds.maxLon - terrainBounds.minLon) -
      0.5) *
    terrainWidth;
  const z =
    (0.5 -
      (lat - terrainBounds.minLat) /
        (terrainBounds.maxLat - terrainBounds.minLat)) *
    terrainDepth;
  const y = Math.max(
    0.4,
    (height - terrainFiles.dtm.minHeight) * verticalScale * terrainFiles.dtm.exaggeration + 0.55
  );

  return new THREE.Vector3(x, y, z);
}

function extractLineStrings(geometry) {
  if (geometry.type === "LineString") {
    return [geometry.coordinates];
  }

  if (geometry.type === "MultiLineString") {
    return geometry.coordinates;
  }

  return [];
}

async function loadContours() {
  setContourLabel("Memuat");
  const response = await fetch(contourFile);
  contourGeoJson = await response.json();
  rebuildContours();
}

function rebuildContours() {
  contourGroup.clear();

  if (!contourGeoJson || !currentGeometry) {
    return;
  }

  contourGeoJson.features.forEach(function (feature) {
    const contourHeight = Number(feature.properties?.Contour) || terrainFiles.dtm.minHeight;
    const lineStrings = extractLineStrings(feature.geometry);

    lineStrings.forEach(function (lineString) {
      if (lineString.length < 2) {
        return;
      }

      const points = lineString.map(function (coordinate) {
        return projectCoordinate(coordinate[0], coordinate[1], contourHeight);
      });
      const line = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(points),
        new THREE.LineBasicMaterial({
          color: 0xffffff,
          transparent: true,
          opacity: 0.76
        })
      );
      contourGroup.add(line);
    });
  });

  setContourLabel(contourGroup.children.length + " garis");
}

function resize() {
  const width = mount.clientWidth;
  const height = mount.clientHeight;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
}

function resetCamera() {
  camera.position.set(85, 78, 92);
  controls.target.set(0, 18, 0);
  controls.update();
}

document.getElementById("loadDtmBtn")?.addEventListener("click", function () {
  buildTerrain("dtm");
});

document.getElementById("loadDsmBtn")?.addEventListener("click", function () {
  buildTerrain("dsm");
});

document.getElementById("toggleWireBtn")?.addEventListener("click", function () {
  if (wire) {
    wire.visible = !wire.visible;
  }
});

document.getElementById("toggleContourBtn")?.addEventListener("click", function () {
  contourGroup.visible = !contourGroup.visible;
  setContourLabel(contourGroup.visible ? contourGroup.children.length + " garis" : "Nonaktif");
});

document.getElementById("resetCameraBtn")?.addEventListener("click", resetCamera);

window.addEventListener("resize", resize);
resize();
resetCamera();

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}

animate();

await Promise.all([buildTerrain("dtm"), loadContours()]);
