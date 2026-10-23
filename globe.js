
/*
  Interactive 3D Earth using Three.js.
  Country markers are populated from destinations.json.
*/
(() => {
  const host = document.getElementById("globe-canvas");

  if (!host || !window.THREE) {
    const loading = document.getElementById("globe-loading");
    if (loading) {
      loading.innerHTML = "<span>3D globe unavailable — use search or the country list.</span>";
    }
    return;
  }

  const THREE = window.THREE;
  let scene, camera, renderer, earth, atmosphere, stars, raycaster, pointer;
  let isDragging = false;
  let moved = false;
  let lastX = 0;
  let lastY = 0;
  let pointerDown = null;
  let autoRotate = true;
  let resizeObserver;

  const markerObjects = [];
  const markerMeta = [];
  const textureLoader = new THREE.TextureLoader();

  textureLoader.crossOrigin = "anonymous";

  function init() {
    scene = new THREE.Scene();

    camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
    camera.position.set(0, 0, 5.1);

    renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true
    });

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputEncoding = THREE.sRGBEncoding;

    renderer.domElement.setAttribute(
      "aria-label",
      "Rotating Earth. Click a glowing marker to explore a country."
    );

    host.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0x8ca9c8, 0.8));

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.7);
    keyLight.position.set(-4, 2, 5);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x438bdf, 1.15);
    rimLight.position.set(4, -1, -4);
    scene.add(rimLight);

    const geometry = new THREE.SphereGeometry(1.6, 72, 72);

    const material = new THREE.MeshPhongMaterial({
      color: 0x9ab9d6,
      shininess: 13,
      specular: new THREE.Color(0x223c5a)
    });

    earth = new THREE.Mesh(geometry, material);
    earth.rotation.y = -0.55;
    scene.add(earth);

    // Load the Earth texture.
    textureLoader.load(
      "https://threejs.org/examples/textures/planets/earth_atmos_2048.jpg",
      texture => {
        texture.encoding = THREE.sRGBEncoding;
        earth.material.map = texture;
        earth.material.color.set(0xffffff);
        earth.material.needsUpdate = true;
        hideLoading();
      },
      undefined,
      () => {
        earth.material.color.set(0x23557b);
        hideLoading();
      }
    );

    // Add a subtle cloud layer.
    const cloudGeometry = new THREE.SphereGeometry(1.625, 64, 64);

    textureLoader.load(
      "https://threejs.org/examples/textures/planets/earth_clouds_1024.png",
      texture => {
        const cloudMaterial = new THREE.MeshPhongMaterial({
          map: texture,
          transparent: true,
          opacity: 0.13,
          depthWrite: false
        });

        atmosphere = new THREE.Mesh(cloudGeometry, cloudMaterial);
        atmosphere.rotation.y = earth.rotation.y;
        scene.add(atmosphere);
      },
      undefined,
      () => {}
    );

    // Soft blue glow around Earth.
    const glowGeometry = new THREE.SphereGeometry(1.68, 64, 64);

    const glowMaterial = new THREE.MeshBasicMaterial({
      color: 0x3d8cdb,
      transparent: true,
      opacity: 0.10,
      side: THREE.BackSide
    });

    scene.add(new THREE.Mesh(glowGeometry, glowMaterial));

    addStars();

    raycaster = new THREE.Raycaster();
    pointer = new THREE.Vector2();

    bindEvents();
    resize();
    animate();

    resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(host);
  }

  function hideLoading() {
    const element = document.getElementById("globe-loading");
    if (element) element.classList.add("hidden");
  }

  function addStars() {
    const positions = [];

    for (let i = 0; i < 1300; i++) {
      const radius = 8 + Math.random() * 25;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      positions.push(
        radius * Math.sin(phi) * Math.cos(theta),
        radius * Math.sin(phi) * Math.sin(theta),
        radius * Math.cos(phi)
      );
    }

    const geometry = new THREE.BufferGeometry();

    geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(positions, 3)
    );

    stars = new THREE.Points(
      geometry,
      new THREE.PointsMaterial({
        color: 0xb7d4f2,
        size: 0.025,
        transparent: true,
        opacity: 0.72
      })
    );

    scene.add(stars);
  }

  // Convert latitude and longitude into a 3D position on the globe.
  function latLonToVector(lat, lon, radius = 1.625) {
    const phi = (90 - lat) * Math.PI / 180;
    const theta = (lon + 180) * Math.PI / 180;

    return new THREE.Vector3(
      -radius * Math.sin(phi) * Math.cos(theta),
      radius * Math.cos(phi),
      radius * Math.sin(phi) * Math.sin(theta)
    );
  }

  // Create glowing markers for all countries in the data.
  function addCountries(countries) {
    markerObjects.forEach(marker => scene.remove(marker));
    markerObjects.length = 0;
    markerMeta.length = 0;

    Object.entries(countries).forEach(([key, country]) => {
      const position = latLonToVector(country.lat, country.lon);

      const marker = new THREE.Group();
      marker.position.copy(position);
      marker.userData.countryKey = key;

      const dot = new THREE.Mesh(
        new THREE.SphereGeometry(0.035, 16, 16),
        new THREE.MeshBasicMaterial({ color: 0xffd99a })
      );

      const halo = new THREE.Mesh(
        new THREE.RingGeometry(0.052, 0.073, 32),
        new THREE.MeshBasicMaterial({
          color: 0xffd99a,
          transparent: true,
          opacity: 0.85,
          side: THREE.DoubleSide
        })
      );

      halo.lookAt(position.clone().multiplyScalar(2));

      marker.add(dot, halo);
      marker.userData.halo = halo;

      scene.add(marker);

      markerObjects.push(marker);
      markerMeta.push({ object: marker, key, country });
    });
  }

  function bindEvents() {
    renderer.domElement.addEventListener("pointerdown", event => {
      isDragging = true;
      moved = false;
      autoRotate = false;

      lastX = event.clientX;
      lastY = event.clientY;

      pointerDown = {
        x: event.clientX,
        y: event.clientY
      };

      renderer.domElement.setPointerCapture?.(event.pointerId);
    });

    renderer.domElement.addEventListener("pointermove", event => {
      if (!isDragging) return;

      const dx = event.clientX - lastX;
      const dy = event.clientY - lastY;

      if (
        Math.abs(event.clientX - pointerDown.x) +
        Math.abs(event.clientY - pointerDown.y) > 5
      ) {
        moved = true;
      }

      earth.rotation.y += dx * 0.005;

      earth.rotation.x = Math.max(
        -0.55,
        Math.min(0.55, earth.rotation.x + dy * 0.003)
      );

      if (atmosphere) {
        atmosphere.rotation.y = earth.rotation.y;
        atmosphere.rotation.x = earth.rotation.x;
      }

      lastX = event.clientX;
      lastY = event.clientY;
    });

    const finishDragging = event => {
      if (!isDragging) return;

      isDragging = false;

      if (!moved) {
        pickCountry(event);
      }

      window.setTimeout(() => {
        autoRotate = true;
      }, 2200);
    };

    renderer.domElement.addEventListener("pointerup", finishDragging);

    renderer.domElement.addEventListener("pointercancel", () => {
      isDragging = false;
    });

    renderer.domElement.addEventListener("pointerleave", () => {
      if (isDragging) isDragging = false;
    });

    renderer.domElement.addEventListener(
      "wheel",
      () => {
        autoRotate = false;
        window.setTimeout(() => {
          autoRotate = true;
        }, 1800);
      },
      { passive: true }
    );
  }

  // Detect whether a glowing country marker was clicked.
  function pickCountry(event) {
    const rect = renderer.domElement.getBoundingClientRect();

    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(pointer, camera);

    const hits = raycaster.intersectObjects(markerObjects, true);

    if (hits.length) {
      let node = hits[0].object;

      while (node && !node.userData.countryKey) {
        node = node.parent;
      }

      if (node && node.userData.countryKey) {
        window.dispatchEvent(
          new CustomEvent("country-selected", {
            detail: { key: node.userData.countryKey }
          })
        );
      }
    }
  }

  function resize() {
    if (!renderer || !host.clientWidth || !host.clientHeight) return;

    const width = host.clientWidth;
    const height = host.clientHeight;

    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }

  // Animation loop: rotate Earth and pulse the country markers.
  function animate() {
    requestAnimationFrame(animate);

    if (earth && autoRotate && !isDragging) {
      earth.rotation.y += 0.0008;

      if (atmosphere) {
        atmosphere.rotation.y = earth.rotation.y;
      }
    }

    if (atmosphere && earth) {
      atmosphere.rotation.x = earth.rotation.x;

      markerObjects.forEach(marker => {
        const vector = marker.position.clone().applyEuler(earth.rotation);

        // Hide markers on the far side of the globe.
        marker.visible = vector.z > -0.15;
        marker.rotation.copy(earth.rotation);

        if (marker.userData.halo) {
          marker.userData.halo.scale.setScalar(
            1 + Math.sin(Date.now() * 0.003) * 0.09
          );
        }
      });
    }

    if (renderer) {
      renderer.render(scene, camera);
    }
  }

  // Expose functions for the main application.
  window.GlobeTrotterGlobe = {
    init,
    addCountries
  };

  init();
})();
