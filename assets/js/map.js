(async function () {
  const config = window.ORBITMAP_CONFIG || {};
  const activeLayerLabel = document.getElementById("activeLayerLabel");
  const overlayLayerLabel = document.getElementById("overlayLayerLabel");
  const cesiumPopup = document.getElementById("cesiumPopup");
  const cesiumPopupTitle = document.getElementById("cesiumPopupTitle");
  const cesiumPopupBody = document.getElementById("cesiumPopupBody");
  const closeCesiumPopup = document.getElementById("closeCesiumPopup");
  const toggleOverlayBtn = document.getElementById("toggleOverlayBtn");

  let activeTileset = null;
  let overlayDataSource = null;
  let selectedOverlayEntity = null;
  let pickableOverlayEntities = [];

  function parseAssetId(value) {
    const assetId = Number.parseInt(value, 10);
    return Number.isFinite(assetId) && assetId > 0 ? assetId : null;
  }

  function numberOrDefault(value, fallback) {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
  }

  function hasUrl(value) {
    return typeof value === "string" && value.trim().length > 0;
  }

  function setActiveLayer(label) {
    if (activeLayerLabel) activeLayerLabel.textContent = label;
  }

  function setOverlayLayer(label) {
    if (overlayLayerLabel) overlayLayerLabel.textContent = label;
  }

  function setOverlayButtonState(isActive) {
    if (!toggleOverlayBtn) return;
    toggleOverlayBtn.classList.toggle("btn-toggle-active", isActive);
    toggleOverlayBtn.classList.toggle("btn-ghost", !isActive);
    toggleOverlayBtn.setAttribute("aria-pressed", String(isActive));
  }

  function getOverlayColor() {
    try {
      return Cesium.Color.fromCssColorString(
        config.geoJsonOverlay?.color || "#ffd166",
      );
    } catch (error) {
      console.warn("Warna overlay tidak valid, memakai kuning default.", error);
      return Cesium.Color.fromCssColorString("#ffd166");
    }
  }

  function getPropertyValue(entity, key) {
    const value = entity?.properties?.[key];
    if (value && typeof value.getValue === "function") {
      return value.getValue(Cesium.JulianDate.now());
    }
    return value;
  }

  function getDisplayProperty(entity, keys, fallback = "-") {
    for (const key of keys) {
      const value = getPropertyValue(entity, key);
      if (value !== undefined && value !== null && value !== "") return value;
    }
    return fallback;
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function getEntityPositions(entity) {
    const hierarchy = entity?.polygon?.hierarchy?.getValue(
      Cesium.JulianDate.now(),
    );
    if (hierarchy?.positions?.length) return hierarchy.positions;

    const positions = entity?.polyline?.positions?.getValue(
      Cesium.JulianDate.now(),
    );
    if (positions?.length) return positions;

    const position = entity?.position?.getValue(Cesium.JulianDate.now());
    return position ? [position] : [];
  }

  function resetOverlaySelection() {
    if (selectedOverlayEntity?.polygon) {
      selectedOverlayEntity.polygon.material =
        getOverlayColor().withAlpha(0.12);
    }
    viewer.selectedEntity = undefined;
    selectedOverlayEntity = null;
  }

  function flyToEntitySmart(entity, opts = {}) {
    const {
      pitchDeg = -90,
      rangeFactor = 7,
      minRange = 140,
      maxRange = 3000,
      heading = viewer.camera.heading,
      duration = 1.0,
    } = opts;
    const positions = getEntityPositions(entity);
    if (!positions.length) return viewer.flyTo(entity, { duration });

    const sphere = Cesium.BoundingSphere.fromPoints(positions);
    const range = Math.max(
      minRange,
      Math.min(maxRange, sphere.radius * rangeFactor),
    );
    return viewer.camera.flyToBoundingSphere(sphere, {
      duration,
      offset: new Cesium.HeadingPitchRange(
        heading,
        Cesium.Math.toRadians(pitchDeg),
        range,
      ),
    });
  }

  async function flyToTilesetSmart(tileset) {
    const sphere = tileset.boundingSphere;
    const range = Math.max(180, Math.min(560, sphere.radius * 0.9));
    return viewer.camera.flyToBoundingSphere(sphere, {
      duration: 1.15,
      offset: new Cesium.HeadingPitchRange(
        0,
        Cesium.Math.toRadians(-25),
        range,
      ),
    });
  }

  function showOverlayPopup(entity) {
    if (!cesiumPopup || !cesiumPopupTitle || !cesiumPopupBody) return;

    const title = getDisplayProperty(
      entity,
      ["NAMA", "Nama", "name", "Nomor", "NIB"],
      "Detail Persil",
    );
    const rows = [
      // ["Nama", ["NAMA", "Nama", "name"]],
      // ["Nomor", ["Nomor", "NOMOR", "No"]],
      ["NIB", ["NIB", "_NIB"]],
      ["Alamat", ["ALAMAT", "Alamat", "_Alamat"]],
      ["Kecamatan", ["KECAMATAN", "Kecamatan", "_Kec"]],
      ["Kelurahan", ["KELURAHAN", "Kelurahan", "_Kel"]],
      ["Luas", ["LUAS", "Luas_Tanah", "Shape_Area", "_Luas"]],
    ];

    const html = rows
      .map(function ([label, keys]) {
        let value = getDisplayProperty(entity, keys, "-");
        if (value === "-") return "";

        if (label === "Luas") {
          value = value + " m²";
        }

        return (
          '<div class="cesium-popup-row"><span>' +
          escapeHtml(label) +
          "</span><strong>" +
          escapeHtml(value) +
          "</strong></div>"
        );
      })
      .join("");

    cesiumPopupTitle.textContent = title;
    cesiumPopupBody.innerHTML =
      html ||
      '<div class="cesium-popup-row"><span>Info</span><strong>Tidak ada atribut.</strong></div>';
    cesiumPopup.hidden = false;
  }

  function hideOverlayPopup() {
    if (cesiumPopup) cesiumPopup.hidden = true;
  }

  if (config.accessToken) {
    Cesium.Ion.defaultAccessToken = config.accessToken;
  }

  const fallbackView = {
    destination: Cesium.Cartesian3.fromDegrees(
      numberOrDefault(config.fallbackView?.longitude, 117.5),
      numberOrDefault(config.fallbackView?.latitude, 2.8),
      numberOrDefault(config.fallbackView?.height, 12000),
    ),
    orientation: {
      heading: Cesium.Math.toRadians(
        numberOrDefault(config.fallbackView?.heading, 0),
      ),
      pitch: Cesium.Math.toRadians(
        numberOrDefault(config.fallbackView?.pitch, -55),
      ),
      roll: 0,
    },
  };

  const viewer = new Cesium.Viewer("cesiumContainer", {
    animation: false,
    baseLayerPicker: false,
    fullscreenButton: false,
    geocoder: false,
    homeButton: false,
    infoBox: false,
    navigationHelpButton: false,
    sceneModePicker: false,
    selectionIndicator: false,
    timeline: false,
    terrainProvider: new Cesium.EllipsoidTerrainProvider(),
    imageryProvider: false,
  });

  viewer.imageryLayers.removeAll();
  viewer.scene.backgroundColor = Cesium.Color.BLACK;
  viewer.scene.skyBox.show = false;
  viewer.scene.skyAtmosphere.show = false;
  viewer.scene.globe.baseColor = Cesium.Color.BLACK;
  viewer.scene.globe.enableLighting = false;
  viewer.scene.camera.setView(fallbackView);

  function getTilesetSourceLabel() {
    if (parseAssetId(config.tiles3dAssetId)) return "Cesium ion";
    if (hasUrl(config.tilesetJsonUrl)) return "tileset.json";
    return "Belum diisi";
  }

  async function createTileset() {
    const assetId = parseAssetId(config.tiles3dAssetId);

    if (assetId) return Cesium.Cesium3DTileset.fromIonAssetId(assetId);
    if (hasUrl(config.tilesetJsonUrl))
      return Cesium.Cesium3DTileset.fromUrl(config.tilesetJsonUrl.trim());

    throw new Error(
      "Isi tiles3dAssetId atau tilesetJsonUrl di assets/js/ion-config.js.",
    );
  }

  async function loadTileset(options = {}) {
    const flyToTiles = options.flyToTiles !== false;

    try {
      setActiveLayer("Memuat 3D Tiles");

      if (activeTileset) {
        viewer.scene.primitives.remove(activeTileset);
        activeTileset = null;
      }

      const tileset = await createTileset();
      activeTileset = tileset;
      viewer.scene.primitives.add(tileset);
      setActiveLayer("3D Tiles aktif");

      if (flyToTiles) await flyToTilesetSmart(tileset);
      return tileset;
    } catch (error) {
      setActiveLayer(getTilesetSourceLabel() + " gagal");
      console.error("Gagal memuat 3D Tiles:", error);
      viewer.camera.flyTo({ ...fallbackView, duration: 1.2 });
      return null;
    }
  }

  async function getGeoJsonResource() {
    const overlay = config.geoJsonOverlay || {};
    const assetId = parseAssetId(overlay.assetId);

    if (assetId) return Cesium.IonResource.fromAssetId(assetId);
    if (hasUrl(overlay.url)) return overlay.url.trim();
    return null;
  }

  function styleGeoJsonOverlay(dataSource) {
    const overlayColor = getOverlayColor();
    const entities = dataSource.entities.values.slice();
    pickableOverlayEntities = [];

    function addParcelBoundaryPolyline(entity, positions) {
      const closedPositions =
        positions.length > 1 &&
        !Cesium.Cartesian3.equals(positions[0], positions[positions.length - 1])
          ? positions.concat([positions[0]])
          : positions;

      const boundary = dataSource.entities.add({
        parent: entity,
        polyline: {
          positions: closedPositions,
          width: 6,
          clampToGround: config.geoJsonOverlay?.clampToGround !== false,
          classificationType: Cesium.ClassificationType.CESIUM_3D_TILE,
          material: overlayColor,
        },
      });
      pickableOverlayEntities.push(boundary);
    }

    entities.forEach(function (entity) {
      if (entity.polygon) {
        const hierarchy = entity.polygon.hierarchy?.getValue(
          Cesium.JulianDate.now(),
        );
        entity.polygon.classificationType =
          Cesium.ClassificationType.CESIUM_3D_TILE;
        entity.polygon.material = overlayColor.withAlpha(0.12);
        entity.polygon.outline = false;
        pickableOverlayEntities.push(entity);

        if (hierarchy?.positions?.length)
          addParcelBoundaryPolyline(entity, hierarchy.positions);
      }

      if (entity.polyline) {
        entity.polyline.material = overlayColor;
        entity.polyline.width = 6;
        entity.polyline.clampToGround =
          config.geoJsonOverlay?.clampToGround !== false;
        entity.polyline.classificationType =
          Cesium.ClassificationType.CESIUM_3D_TILE;
        pickableOverlayEntities.push(entity);
      }

      if (entity.point) {
        entity.point.pixelSize = 10;
        entity.point.color = overlayColor;
        entity.point.outlineColor = Cesium.Color.BLACK;
        entity.point.outlineWidth = 2;
        pickableOverlayEntities.push(entity);
      }
    });
  }

  async function loadGeoJsonOverlay(options = {}) {
    const flyToOverlay = options.flyToOverlay === true;
    const overlay = config.geoJsonOverlay || {};
    const resource = await getGeoJsonResource();

    if (!resource) {
      setOverlayLayer("Overlay belum diisi");
      console.warn(
        "Isi geoJsonOverlay.assetId atau geoJsonOverlay.url di assets/js/ion-config.js.",
      );
      return null;
    }

    if (overlayDataSource) {
      overlayDataSource.show = true;
      setOverlayLayer("Overlay aktif");
      setOverlayButtonState(true);
      if (flyToOverlay) viewer.flyTo(overlayDataSource, { duration: 1.0 });
      return overlayDataSource;
    }

    try {
      const overlayColor = getOverlayColor();
      overlayDataSource = await Cesium.GeoJsonDataSource.load(resource, {
        clampToGround: overlay.clampToGround !== false,
        markerColor: overlayColor,
        stroke: Cesium.Color.TRANSPARENT,
        strokeWidth: 0,
        fill: overlayColor.withAlpha(0.12),
      });
      overlayDataSource.name = "GeoJSON Overlay";
      viewer.dataSources.add(overlayDataSource);
      styleGeoJsonOverlay(overlayDataSource);
      setOverlayLayer("Overlay aktif");
      setOverlayButtonState(true);

      if (flyToOverlay) {
        const primaryEntity = overlayDataSource.entities.values.find(
          function (entity) {
            return getEntityPositions(entity).length > 0;
          },
        );
        if (primaryEntity) {
          flyToEntitySmart(primaryEntity, {
            pitchDeg: -62,
            rangeFactor: 9,
            minRange: 220,
            maxRange: 1600,
            heading: Cesium.Math.toRadians(12),
            duration: 0,
          });
        } else {
          viewer.flyTo(overlayDataSource, { duration: 1.0 });
        }
      }
      return overlayDataSource;
    } catch (error) {
      setOverlayLayer("Overlay gagal");
      console.error("Gagal memuat GeoJSON overlay:", error);
      return null;
    }
  }

  async function toggleGeoJsonOverlay() {
    if (overlayDataSource) {
      overlayDataSource.show = !overlayDataSource.show;
      setOverlayLayer(
        overlayDataSource.show ? "Overlay aktif" : "Overlay nonaktif",
      );
      setOverlayButtonState(overlayDataSource.show);
      if (!overlayDataSource.show) {
        resetOverlaySelection();
        hideOverlayPopup();
      }
      return;
    }

    await loadGeoJsonOverlay({ flyToOverlay: false });
  }

  async function fitTileset() {
    if (overlayDataSource) {
      const primaryEntity = overlayDataSource.entities.values.find(
        function (entity) {
          return getEntityPositions(entity).length > 0;
        },
      );

      if (primaryEntity) {
        return flyToEntitySmart(primaryEntity, {
          pitchDeg: -62,
          rangeFactor: 9,
          minRange: 220,
          maxRange: 1600,
          heading: Cesium.Math.toRadians(12),
          duration: 1.15,
        });
      }
    }

    if (activeTileset) return flyToTilesetSmart(activeTileset);
    return loadTileset({ flyToTiles: true });
  }

  async function autoLoadCesiumAssets() {
    await loadTileset({ flyToTiles: false });
    await loadGeoJsonOverlay({ flyToOverlay: true });
  }

  document
    .getElementById("toggleUiBtn")
    ?.addEventListener("click", function () {
      document.body.classList.toggle("focus-mode");
    });

  toggleOverlayBtn?.addEventListener("click", function () {
    toggleGeoJsonOverlay();
  });

  document
    .getElementById("fitTilesBtn")
    ?.addEventListener("click", function () {
      fitTileset();
    });

  closeCesiumPopup?.addEventListener("click", hideOverlayPopup);

  window.addEventListener("resize", function () {
    viewer.resize();
  });

  const clickHandler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
  clickHandler.setInputAction(function (click) {
    viewer.selectedEntity = undefined;
    const pickedObjects = viewer.scene.drillPick(click.position, 16) || [];
    const pickedEntity = pickedObjects
      .map(function (object) {
        return object.id;
      })
      .find(function (entity) {
        return (
          pickableOverlayEntities.includes(entity) ||
          pickableOverlayEntities.includes(entity?.parent)
        );
      });
    const pickedOverlayEntity = pickedEntity?.parent || pickedEntity;

    if (!pickedOverlayEntity || !overlayDataSource?.show) {
      resetOverlaySelection();
      hideOverlayPopup();
      return;
    }

    if (selectedOverlayEntity !== pickedOverlayEntity) resetOverlaySelection();
    selectedOverlayEntity = pickedOverlayEntity;

    if (pickedOverlayEntity.polygon) {
      pickedOverlayEntity.polygon.material = getOverlayColor().withAlpha(0.28);
    }

    showOverlayPopup(pickedOverlayEntity);
    flyToEntitySmart(pickedOverlayEntity);
  }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

  setActiveLayer("Siap memuat");
  setOverlayLayer("Nonaktif");
  setOverlayButtonState(false);
  await autoLoadCesiumAssets();
})();
