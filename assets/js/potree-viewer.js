(function () {
  const pointCloudUrl = "assets/potree/sempaja/metadata.json";
  const pointCloudName = "Sempaja";
  const budgetLabel = document.getElementById("potreeBudgetLabel");
  const classificationLabel = document.getElementById(
    "potreeClassificationLabel",
  );
  const pointBudgetSlider = document.getElementById("pointBudgetSlider");
  const classificationToggles = [
    document.getElementById("classificationGroundToggle"),
    document.getElementById("classificationVegetationToggle"),
    document.getElementById("classificationBuildingToggle"),
  ].filter(Boolean);
  let loadedPointCloud = null;
  let useClassificationColors = false;

  function formatBudget(value) {
    return new Intl.NumberFormat("id-ID").format(value);
  }

  function setBudget(viewer, value) {
    viewer.setPointBudget(value);
    if (budgetLabel) {
      budgetLabel.textContent = formatBudget(value);
    }
    if (pointBudgetSlider) {
      pointBudgetSlider.value = String(value);
    }
  }

  function updateClassificationLabel() {
    if (!classificationLabel) {
      return;
    }

    const visibleClasses = classificationToggles
      .filter(function (toggle) {
        return toggle.checked;
      })
      .map(function (toggle) {
        return toggle.parentElement.textContent.trim();
      });

    classificationLabel.textContent =
      visibleClasses.length === classificationToggles.length
        ? "Semua"
        : visibleClasses.join(", ") || "Kosong";
  }

  function setClassificationVisibility(classId, visible) {
    if (!loadedPointCloud) {
      return;
    }

    const material = loadedPointCloud.material;
    const existing = material.classification[classId] || {
      color: [1, 1, 1, 1],
      visible: true,
      name: "Class " + classId,
    };

    material.classification[classId] = {
      ...existing,
      visible,
    };
    material.recomputeClassification();
    updateClassificationLabel();
  }

  function applyClassificationControls() {
    classificationToggles.forEach(function (toggle) {
      setClassificationVisibility(Number(toggle.value), toggle.checked);
    });
  }

  function setClassificationColorMode(enabled) {
    useClassificationColors = enabled;
    if (!loadedPointCloud) {
      return;
    }

    if (enabled) {
      loadedPointCloud.material.activeAttributeName = "classification";
    } else {
      loadedPointCloud.material.activeAttributeName = "rgba";
    }
  }

  function absoluteProjectUrl(path) {
    return new URL(path, window.location.href).href.replace(/\/$/, "");
  }

  if (!window.Potree) {
    console.error(
      "Potree library belum termuat. Cek koneksi CDN atau salin library Potree ke project.",
    );
    return;
  }

  Potree.resourcePath = absoluteProjectUrl(
    "assets/vendor/potree/build/potree/resources/",
  );
  Potree.scriptPath = absoluteProjectUrl("assets/vendor/potree/build/potree/");
  Potree.workerPath = absoluteProjectUrl(
    "assets/vendor/potree/build/potree/workers/",
  );

  const viewer = new Potree.Viewer(
    document.getElementById("potree_render_area"),
  );
  window.orbitMapPotreeViewer = viewer;

  viewer.setEDLEnabled(true);
  viewer.setFOV(60);
  viewer.setBackground("black");
  viewer.setDescription("");
  setBudget(viewer, 100000);

  Potree.loadPointCloud(pointCloudUrl, pointCloudName, function (event) {
    loadedPointCloud = event.pointcloud;
    const material = loadedPointCloud.material;

    material.size = 1.2;
    material.pointSizeType = Potree.PointSizeType.ADAPTIVE;
    material.shape = Potree.PointShape.SQUARE;
    material.activeAttributeName = "rgba";
    material.classification[2] = {
      visible: true,
      name: "Ground",
      color: [0.35, 0.95, 0.55, 1],
    };
    material.classification[3] = {
      visible: true,
      name: "Vegetasi",
      color: [0.2, 0.75, 0.25, 1],
    };
    material.classification[6] = {
      visible: true,
      name: "Bangunan",
      color: [1, 0.74, 0.24, 1],
    };
    material.recomputeClassification();

    viewer.scene.addPointCloud(loadedPointCloud);
    applyClassificationControls();
    setClassificationColorMode(useClassificationColors);
    viewer.fitToScreen();
  });

  document
    .getElementById("fitPotreeBtn")
    ?.addEventListener("click", function () {
      viewer.fitToScreen();
    });

  document
    .getElementById("budgetLowBtn")
    ?.addEventListener("click", function () {
      setBudget(viewer, 100000);
    });

  document
    .getElementById("budgetHighBtn")
    ?.addEventListener("click", function () {
      setBudget(viewer, 4000000);
    });

  pointBudgetSlider?.addEventListener("input", function (event) {
    setBudget(viewer, Number(event.target.value));
  });

  classificationToggles.forEach(function (toggle) {
    toggle.addEventListener("change", function () {
      setClassificationVisibility(Number(toggle.value), toggle.checked);
    });
  });

  document
    .getElementById("classificationColorBtn")
    ?.addEventListener("click", function (event) {
      setClassificationColorMode(!useClassificationColors);
      event.currentTarget.classList.toggle("btn-neon", useClassificationColors);
      event.currentTarget.classList.toggle(
        "btn-ghost",
        !useClassificationColors,
      );
    });

  updateClassificationLabel();
})();
