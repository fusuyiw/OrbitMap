(function () {
  const pointCloudUrl = "assets/potree/sempaja/metadata.json";
  const pointCloudName = "Sempaja";
  const budgetLabel = document.getElementById("potreeBudgetLabel");
  const classificationLabel = document.getElementById(
    "potreeClassificationLabel",
  );
  const pointBudgetSlider = document.getElementById("pointBudgetSlider");
  const togglePotreePanelBtn = document.getElementById("togglePotreePanelBtn");
  const classificationColorBtn = document.getElementById(
    "classificationColorBtn",
  );
  const classificationToggles = [
    document.getElementById("classificationGroundToggle"),
    document.getElementById("classificationVegetationToggle"),
    document.getElementById("classificationBuildingToggle"),
  ].filter(Boolean);
  let loadedPointCloud = null;
  let useClassificationColors = true;

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
        return toggle.dataset.label || toggle.parentElement.textContent.trim();
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
    setClassificationColorMode(true);
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
    material.needsUpdate = true;
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
      if (classificationColorBtn) {
        classificationColorBtn.classList.toggle("btn-neon", enabled);
        classificationColorBtn.classList.toggle("btn-ghost", !enabled);
      }
      return;
    }

    if (enabled) {
      loadedPointCloud.material.activeAttributeName = "classification";
    } else {
      loadedPointCloud.material.activeAttributeName = "rgba";
    }

    if (classificationColorBtn) {
      classificationColorBtn.classList.toggle("btn-neon", enabled);
      classificationColorBtn.classList.toggle("btn-ghost", !enabled);
    }
  }

  function absoluteProjectUrl(path) {
    return new URL(path, window.location.href).href.replace(/\/$/, "");
  }

  function isPhoneViewport() {
    return window.matchMedia("(max-width: 575.98px)").matches;
  }

  function setPotreePanelCollapsed(collapsed) {
    document.body.classList.toggle("potree-panel-collapsed", collapsed);

    if (!togglePotreePanelBtn) {
      return;
    }

    togglePotreePanelBtn.setAttribute("aria-expanded", String(!collapsed));
    togglePotreePanelBtn.setAttribute(
      "aria-label",
      collapsed ? "Tampilkan panel" : "Sembunyikan panel",
    );

    const icon = togglePotreePanelBtn.querySelector("i");
    if (icon) {
      icon.classList.toggle("bi-chevron-down", !collapsed);
      icon.classList.toggle("bi-chevron-up", collapsed);
    }
  }

  function fitPointCloudView() {
    if (!loadedPointCloud || !viewer.scene.pointclouds.length) {
      viewer.fitToScreen();
      return;
    }

    if (!isPhoneViewport()) {
      viewer.fitToScreen();
      return;
    }

    const box = viewer.getBoundingBox(viewer.scene.pointclouds);
    const center = box.min.clone().add(box.max).multiplyScalar(0.5);
    const size = box.max.clone().sub(box.min);
    const distance = Math.max(size.x, size.y, size.z, 1) * 1.65;
    const position = center.clone();
    position.z += distance;

    viewer.scene.view.setView(position, center, 0);
    viewer.scene.view.yaw = 0;
    viewer.scene.view.pitch = -Math.PI / 2;
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
      color: [0.58, 0.36, 0.18, 1],
    };
    material.classification[3] = {
      visible: true,
      name: "Vegetasi",
      color: [0.32, 0.8, 0.32, 1],
    };
    material.classification[6] = {
      visible: true,
      name: "Bangunan",
      color: [1, 0.74, 0.24, 1],
    };
    material.recomputeClassification();
    material.needsUpdate = true;

    viewer.scene.addPointCloud(loadedPointCloud);
    applyClassificationControls();
    setClassificationColorMode(useClassificationColors);
    fitPointCloudView();
  });

  document
    .getElementById("fitPotreeBtn")
    ?.addEventListener("click", function () {
      fitPointCloudView();
    });

  window.addEventListener("resize", function () {
    fitPointCloudView();
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

  classificationColorBtn?.addEventListener("click", function () {
    setClassificationColorMode(!useClassificationColors);
  });

  togglePotreePanelBtn?.addEventListener("click", function () {
    setPotreePanelCollapsed(
      !document.body.classList.contains("potree-panel-collapsed"),
    );
  });

  setPotreePanelCollapsed(isPhoneViewport());
  setClassificationColorMode(useClassificationColors);
  updateClassificationLabel();
})();
