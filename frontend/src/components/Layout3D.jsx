import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { itemHeight } from "../services/skidHeights.js";

const COLORS = {
  tank: "#dfe8f0",
  controller: "#d9dee4",
  coolingHx: "#e8e2d6",
  default: "#ffffff",
  process: "#4c7899",
  chemical: "#947342",
};
const CONTROLLERS = ["controlPanel", "dosingController", "skidController"];

function tagFor(item, equipment) {
  const index = Number(item.key.split("-").at(-1)) - 1;
  return equipment.items.find((e) => e.id === item.equipmentId)?.tags?.[index];
}

function buildScene(layout, equipment, heights, palette) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(palette.background);
  scene.add(new THREE.HemisphereLight("#ffffff", "#b8c0ca", 2.2));
  const sun = new THREE.DirectionalLight("#ffffff", 1.6);
  sun.position.set(-4, 8, 6);
  scene.add(sun);

  const { length, width } = layout.dimensions;
  const base = heights.frame ?? 0.15;
  const edgeMaterial = new THREE.LineBasicMaterial({ color: palette.edge });
  const pickable = [];
  const add = (geometry, color, position, label) => {
    const mesh = new THREE.Mesh(
      geometry,
      new THREE.MeshStandardMaterial({ color, roughness: 0.75 }),
    );
    mesh.position.set(...position);
    mesh.userData.label = label;
    mesh.add(
      new THREE.LineSegments(
        new THREE.EdgesGeometry(geometry, 30),
        edgeMaterial,
      ),
    );
    scene.add(mesh);
    if (label) pickable.push(mesh);
    return mesh;
  };

  add(
    new THREE.BoxGeometry(length, base, width),
    palette.frame,
    [length / 2, base / 2, width / 2],
    null,
  );

  const centres = {};
  for (const item of layout.items) {
    const height = itemHeight(item, heights);
    const x = item.x + item.length / 2;
    const z = item.y + item.width / 2;
    centres[item.key] = { x, z, height };
    const tag = tagFor(item, equipment);
    const label = [tag, item.name, item.rating].filter(Boolean).join(" · ");
    if (item.equipmentId === "tank") {
      const radius = (Math.min(item.length, item.width) / 2) * 0.85;
      add(
        new THREE.CylinderGeometry(radius, radius, height, 48),
        COLORS.tank,
        [x, base + height / 2, z],
        label,
      );
    } else {
      add(
        new THREE.BoxGeometry(item.length, height, item.width),
        CONTROLLERS.includes(item.equipmentId)
          ? COLORS.controller
          : (COLORS[item.equipmentId] ?? COLORS.default),
        [x, base + height / 2, z],
        label,
      );
    }
  }

  const pipeY = base + 0.35;
  for (const connection of layout.connections) {
    const from = centres[connection.from];
    const to = centres[connection.to];
    const start =
      connection.from === "inlet"
        ? new THREE.Vector3(-0.6, pipeY, to.z)
        : new THREE.Vector3(from.x, pipeY, from.z);
    const end =
      connection.to === "outlet"
        ? new THREE.Vector3(length + 0.6, pipeY, from.z)
        : new THREE.Vector3(to.x, pipeY, to.z);
    const elbow = new THREE.Vector3(end.x, pipeY, start.z);
    const path = new THREE.CurvePath();
    if (start.distanceTo(elbow) > 1e-6)
      path.add(new THREE.LineCurve3(start, elbow));
    if (elbow.distanceTo(end) > 1e-6)
      path.add(new THREE.LineCurve3(elbow, end));
    if (!path.curves.length) continue;
    const chemical = connection.kind === "chemical";
    add(
      new THREE.TubeGeometry(path, 32, chemical ? 0.02 : 0.035, 8, false),
      chemical ? COLORS.chemical : COLORS.process,
      [0, 0, 0],
      null,
    );
  }

  const tallest = Math.max(...Object.values(centres).map((c) => c.height), 1);
  return { scene, pickable, length, width, tallest };
}

export default function Layout3D({ layout, equipment, heights }) {
  const mount = useRef(null);
  const [hover, setHover] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const element = mount.current;
    if (!element || !layout.dimensions) return;
    const css = getComputedStyle(document.documentElement);
    const token = (name, fallback) =>
      css.getPropertyValue(name).trim() || fallback;
    const palette = {
      background: token("--color-surface", "#ffffff"),
      frame: token("--color-surface-alt", "#f3f5f7"),
      edge: token("--color-border", "#c9ced5"),
    };

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true });
    } catch {
      setFailed(true);
      return;
    }
    const { scene, pickable, length, width, tallest } = buildScene(
      layout,
      equipment,
      heights,
      palette,
    );
    renderer.setPixelRatio(window.devicePixelRatio);
    element.appendChild(renderer.domElement);

    const top = tallest + (heights.frame ?? 0.15);
    const centre = new THREE.Vector3(length / 2, top / 2, width / 2);
    const radius = Math.hypot(length, width, top) / 2;
    const fov = 40;
    const distance =
      (radius / Math.sin(THREE.MathUtils.degToRad(fov / 2))) * 1.05;
    const camera = new THREE.PerspectiveCamera(fov, 1, 0.05, distance * 10);
    camera.position
      .copy(new THREE.Vector3(0.55, 0.5, 0.85).normalize())
      .multiplyScalar(distance)
      .add(centre);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.copy(centre);
    controls.maxPolarAngle = Math.PI / 2.05;
    controls.update();

    const render = () => renderer.render(scene, camera);
    const resize = () => {
      const w = element.clientWidth;
      const h = Math.max(320, Math.min(560, w * 0.6));
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      render();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(element);
    controls.addEventListener("change", render);

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const onMove = (event) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.set(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        -((event.clientY - rect.top) / rect.height) * 2 + 1,
      );
      raycaster.setFromCamera(pointer, camera);
      const hit = raycaster.intersectObjects(pickable, false)[0];
      setHover(
        hit
          ? {
              label: hit.object.userData.label,
              x: event.clientX - rect.left,
              y: event.clientY - rect.top,
              flip: event.clientX - rect.left > rect.width / 2,
              width: rect.width,
            }
          : null,
      );
    };
    const onLeave = () => setHover(null);
    renderer.domElement.addEventListener("pointermove", onMove);
    renderer.domElement.addEventListener("pointerleave", onLeave);
    resize();

    return () => {
      observer.disconnect();
      controls.dispose();
      renderer.domElement.removeEventListener("pointermove", onMove);
      renderer.domElement.removeEventListener("pointerleave", onLeave);
      scene.traverse((object) => {
        object.geometry?.dispose();
        object.material?.dispose();
      });
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [layout, equipment, heights]);

  if (!layout.dimensions)
    return (
      <p className="muted">
        3D view unavailable until the equipment selection is complete.
      </p>
    );
  if (failed)
    return (
      <p className="muted">
        3D view is not supported on this device or browser.
      </p>
    );
  return (
    <div
      className="layout-3d"
      ref={mount}
      role="img"
      aria-label="Schematic 3D view of the preliminary skid layout. Drag to rotate, scroll to zoom."
    >
      {hover && (
        <div
          className="layout-3d-tooltip"
          style={
            hover.flip
              ? { right: hover.width - hover.x + 12, top: hover.y + 12 }
              : { left: hover.x + 12, top: hover.y + 12 }
          }
        >
          {hover.label}
        </div>
      )}
    </div>
  );
}
