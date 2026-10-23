import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { RGBELoader } from "three/addons/loaders/RGBELoader.js";
import { FBXLoader } from "three/addons/loaders/FBXLoader.js";
import { clone as cloneSkinnedScene } from "three/addons/utils/SkeletonUtils.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import "./fps.css";

const MAG_SIZE = 30;
const AK_MAG_SIZE = 30;
const CANNON_MAG_SIZE = 12;
const MISSION_TIME = 210;
const PLAYER_EYE_HEIGHT = 1.62;
const CROUCH_EYE_HEIGHT = 1.12;
const MISSIONS = {
  assault: { id: "assault", name: "SECTOR SWEEP", title: "CLEAR HOSTILES", description: "Suyurin ang buong sector at neutralisahin ang 20 kalaban kasama ang fireteam.", objective: "ELIMINATE HOSTILES", target: 20, seconds: 480 },
  intel: { id: "intel", name: "RECOVER INTEL", title: "KUNIN ANG DATA", description: "Hanapin ang tatlong intelligence drive sa magkakahiwalay na bahagi ng mapa.", objective: "COLLECT INTEL", target: 3, seconds: 360 },
  defense: { id: "defense", name: "HOLD THE LINE", title: "IPAGTANGGOL ANG ZONE", description: "Manatili sa evacuation zone nang 35 segundo habang umaatake ang mga kalaban.", objective: "HOLD ZONE", target: 35, seconds: 360 },
};
const ENEMY_STARTS = [
  [-4.8, -5], [4.4, -15], [-2.4, -26], [5.2, -38], [0.8, -51],
  [-6.2, -64], [2.1, -77], [-3.2, -89], [4.7, -102], [-4.1, -115], [2.4, -128], [-1.8, -141],
  [5.8, -154], [-5.6, -166], [3.5, -177], [-1.1, -188], [-5.4, -46], [5.5, -96], [0.2, -132], [5.7, -181],
];
const MAPS = {
  barangay: {
    id: "barangay", name: "SAN ISIDRO", region: "TROPICAL BARANGAY", code: "01", mood: "SUNRISE / RURAL",
    description: "Mahabang barangay road, mga bahay na puwedeng pasukin, palayan at punong nagbibigay ng takip.",
    environment: "/assets/fps/polyhaven/hdris/citrus_orchard_road_puresky_1k.hdr", groundAsset: "forest_ground_05",
    sky: 0x788a91, fog: 0x777d76, fogFar: 235, groundTint: 0xffffff, roadTint: 0xffffff, houseStyle: "village",
    houses: [[-8.5, 5, 0, 6.2, 6.3], [8.5, -8, 1, 6.2, 6], [-8.5, -25, 2, 6.2, 6.7], [8.5, -40, 3, 6.2, 6.2], [-8.5, -58, 4, 6.2, 6.4], [8.5, -76, 5, 6.2, 6.3], [-8.5, -101, 6, 6.2, 6.5], [8.5, -119, 7, 6.2, 6.1], [-8.5, -137, 8, 6.2, 6.6], [8.5, -155, 9, 6.2, 6.2], [-8.5, -173, 10, 6.2, 6.4], [8.5, -190, 11, 6.2, 6.3]],
    trees: [[-17, 9], [17, 10], [-18, -12], [18, -19], [-17, -37], [17, -43], [-14, -61], [15, -68], [-21, -88], [21, -98], [-25, -118], [26, -130], [-24, -151], [25, -166], [-26, -184], [27, -198]],
    enemies: ENEMY_STARTS, containers: false, sign: "BARANGAY SAN ISIDRO",
  },
  highlands: {
    id: "highlands", name: "CORDILLERA PASS", region: "MOUNTAIN OUTPOST", code: "02", mood: "OVERCAST / HIGHLANDS",
    description: "Mahabang mountain pass na may outpost, bantay-tore, batuhan, at makapal na pine forest.",
    environment: "/assets/fps/polyhaven/hdris/fouriesburg_mountain_cloudy_1k.hdr", groundAsset: "rocky_terrain_02",
    sky: 0x77858b, fog: 0x6e7777, fogFar: 220, groundTint: 0x9aa18b, roadTint: 0xaaa391, houseStyle: "ridge",
    houses: [[-8.5, 4.7, 0, 6.2, 6.3], [8.5, -10, 1, 6.2, 6], [-8.5, -28, 2, 6.2, 6.7], [8.5, -44, 3, 6.2, 6.2], [-8.5, -64, 4, 6.2, 6.4], [8.5, -83, 5, 6.2, 6.3], [-8.5, -103, 6, 6.2, 6.5], [8.5, -122, 7, 6.2, 6.1], [-8.5, -141, 8, 6.2, 6.6], [8.5, -159, 9, 6.2, 6.2], [-8.5, -177, 10, 6.2, 6.4], [8.5, -194, 11, 6.2, 6.3]],
    trees: [[-16, 7], [16, 9], [-18, -14], [18, -20], [-17, -39], [17, -47], [-15, -65], [15, -72], [-20, -91], [21, -101], [-24, -121], [24, -136], [-23, -154], [25, -170], [-25, -190], [27, -202]],
    enemies: ENEMY_STARTS.map(([x, z], index) => [x + (index % 2 ? 0.7 : -0.7), z - (index % 3) * 1.5]),
    containers: false, sign: "CORDILLERA PASS / OUTPOST 04",
  },
  port: {
    id: "port", name: "HARBOR 09", region: "INDUSTRIAL PORT", code: "03", mood: "DUSK / INDUSTRIAL",
    description: "Malawak na night-shift cargo terminal na may pantalan, warehouse at magkakapatong na container.",
    environment: "/assets/fps/polyhaven/hdris/industrial_sunset_02_puresky_1k.hdr", groundAsset: "concrete_rock_path",
    sky: 0x25383e, fog: 0x435054, fogFar: 195, groundTint: 0xb5b5aa, roadTint: 0x9b9b91, houseStyle: "port",
    houses: [[-9.1, 5, 0, 7.2, 8.2], [9.1, -10, 1, 7.2, 8], [-9.1, -28, 2, 7.2, 8.5], [9.1, -45, 3, 7.2, 8.1], [-9.1, -65, 4, 7.2, 8.2], [9.1, -84, 5, 7.2, 8.3], [-9.1, -105, 6, 7.2, 8.2], [9.1, -125, 7, 7.2, 8], [-9.1, -145, 8, 7.2, 8.5], [9.1, -165, 9, 7.2, 8.1], [-9.1, -184, 10, 7.2, 8.2], [9.1, -202, 11, 7.2, 8.3]],
    trees: [], enemies: ENEMY_STARTS.map(([x, z], index) => [x * 0.78, z - (index % 3) * 1.2]),
    containers: true, sign: "HARBOR 09 / LOADING ZONE",
  },
};
const INITIAL_HUD = { kills: 0, health: 100, ammo: MAG_SIZE, ammoMax: MAG_SIZE, weapon: "m4", seconds: MISSION_TIME, accuracy: 0, stamina: 100, heading: "N", radar: [], nearSupply: false, nearHouse: false, nearIntel: false, nearDefense: false, nearWeapon: "", vehicleLabel: "", progress: 0, target: 20, teamSize: 1, reloading: false };

function makeSurfaceTexture(kind, seed = 1) {
  const size = 512;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
  const colors = {
    plaster: ["#77776e", "#9a9887", "#55574f"],
    timber: ["#493b30", "#80644a", "#2e2924"],
    roof: ["#292d2c", "#50504a", "#181e20"],
    road: ["#282d2e", "#414342", "#1b2021"],
    grass: ["#343b2d", "#566047", "#252d24"],
    concrete: ["#5a5d58", "#777871", "#393e3a"],
    sandbag: ["#77705b", "#a39977", "#544f41"],
    metal: ["#303a3c", "#516062", "#20292a"],
  }[kind];
  ctx.fillStyle = colors[0];
  ctx.fillRect(0, 0, size, size);

  if (kind === "timber") {
    for (let y = 0; y < size; y += 44) {
      ctx.fillStyle = y % 88 === 0 ? colors[1] : colors[0];
      ctx.fillRect(0, y, size, 42);
      ctx.fillStyle = "rgba(13,12,10,.48)";
      ctx.fillRect(0, y + 42, size, 3);
      for (let line = 0; line < 5; line += 1) {
        const gy = y + 7 + rand() * 30;
        ctx.strokeStyle = `rgba(24,18,13,${0.08 + rand() * 0.16})`;
        ctx.lineWidth = 1 + rand() * 2;
        ctx.beginPath(); ctx.moveTo(rand() * 70, gy); ctx.bezierCurveTo(160, gy - 4, 310, gy + 3, 512, gy - 2); ctx.stroke();
      }
      if (rand() > 0.55) {
        ctx.strokeStyle = "rgba(18,14,10,.55)"; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.ellipse(100 + rand() * 300, y + 22, 11, 5, 0, 0, Math.PI * 2); ctx.stroke();
      }
    }
  } else if (kind === "roof") {
    for (let row = 0; row < 18; row += 1) {
      const y = row * 30;
      for (let x = (row % 2) * -34; x < size; x += 68) {
        ctx.fillStyle = rand() > 0.48 ? colors[1] : colors[0];
        ctx.fillRect(x + 2, y + 2, 64, 27);
        ctx.strokeStyle = "rgba(10,15,16,.65)"; ctx.lineWidth = 2;
        ctx.strokeRect(x + 2, y + 2, 64, 27);
        ctx.fillStyle = "rgba(255,255,255,.04)"; ctx.fillRect(x + 5, y + 4, 57, 2);
      }
    }
  } else if (kind === "road") {
    for (let i = 0; i < 2400; i += 1) {
      const shade = rand() > 0.5 ? colors[1] : colors[2];
      ctx.globalAlpha = 0.1 + rand() * 0.34;
      ctx.fillStyle = shade;
      const w = 1 + rand() * 5;
      ctx.fillRect(rand() * size, rand() * size, w * 1.8, w);
    }
    ctx.globalAlpha = 1;
    for (let i = 0; i < 12; i += 1) {
      ctx.strokeStyle = `rgba(15,17,17,${0.2 + rand() * 0.4})`; ctx.lineWidth = 1 + rand() * 3;
      ctx.beginPath(); ctx.moveTo(rand() * size, rand() * size); ctx.lineTo(rand() * size, rand() * size); ctx.stroke();
    }
  } else if (kind === "grass") {
    for (let i = 0; i < 7000; i += 1) {
      ctx.globalAlpha = 0.12 + rand() * 0.38;
      ctx.strokeStyle = rand() > 0.5 ? colors[1] : colors[2];
      ctx.lineWidth = 1 + rand() * 2;
      const x = rand() * size; const y = rand() * size;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + rand() * 3 - 1.5, y - 3 - rand() * 5); ctx.stroke();
    }
    ctx.globalAlpha = 1;
  } else {
    for (let i = 0; i < 2800; i += 1) {
      ctx.globalAlpha = 0.06 + rand() * 0.27;
      ctx.fillStyle = rand() > 0.45 ? colors[1] : colors[2];
      const w = 1 + rand() * 9;
      ctx.fillRect(rand() * size, rand() * size, w, w * (0.3 + rand()));
    }
    ctx.globalAlpha = 1;
    if (kind === "plaster") {
      for (let i = 0; i < 20; i += 1) {
        ctx.fillStyle = `rgba(27,29,27,${0.05 + rand() * 0.09})`;
        ctx.fillRect(rand() * size, rand() * size, 8 + rand() * 22, 40 + rand() * 160);
      }
    }
    if (kind === "sandbag") {
      for (let y = 0; y < size; y += 70) {
        ctx.strokeStyle = "rgba(24,22,17,.42)"; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.moveTo(0, y + 34); ctx.bezierCurveTo(150, y + 42, 340, y + 24, 512, y + 34); ctx.stroke();
      }
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = 4;
  return texture;
}

function makeRadialTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 128; canvas.height = 128;
  const ctx = canvas.getContext("2d");
  const gradient = ctx.createRadialGradient(64, 64, 3, 64, 64, 63);
  gradient.addColorStop(0, "rgba(226,224,208,.52)");
  gradient.addColorStop(0.3, "rgba(163,169,153,.28)");
  gradient.addColorStop(0.72, "rgba(113,122,115,.09)");
  gradient.addColorStop(1, "rgba(72,78,76,0)");
  ctx.fillStyle = gradient; ctx.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(canvas);
}

function makeSignTexture(label = "BARANGAY SAN ISIDRO") {
  const canvas = document.createElement("canvas");
  canvas.width = 512; canvas.height = 128;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#363e36"; ctx.fillRect(0, 0, 512, 128);
  ctx.strokeStyle = "#b79b62"; ctx.lineWidth = 7; ctx.strokeRect(8, 8, 496, 112);
  ctx.fillStyle = "#e2d7b8"; ctx.font = "700 33px Arial"; ctx.textAlign = "center";
  ctx.fillText(label, 256, 58);
  ctx.font = "600 15px Arial"; ctx.fillStyle = "#b8baa7";
  ctx.fillText("DISTRICT 04  /  06:40 AM", 256, 88);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createTextureMaterial(kind, seed, options = {}) {
  const map = makeSurfaceTexture(kind, seed);
  map.repeat.set(options.repeatX ?? 1, options.repeatY ?? 1);
  return new THREE.MeshStandardMaterial({
    map,
    color: options.tint ?? 0xffffff,
    roughness: options.roughness ?? 0.88,
    metalness: options.metalness ?? 0.04,
    side: options.side ?? THREE.FrontSide,
  });
}

function addMesh(parent, geometry, material, position, options = {}) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(position[0], position[1], position[2]);
  if (options.rotation) mesh.rotation.set(...options.rotation);
  mesh.castShadow = options.castShadow ?? true;
  mesh.receiveShadow = options.receiveShadow ?? true;
  parent.add(mesh);
  if (options.shotSurface && options.surfaces) options.surfaces.push(mesh);
  return mesh;
}

function mergeHouseMeshes(house, surfaces, surfaceStart) {
  const surfaceMeshes = new Set(surfaces.slice(surfaceStart));
  const batches = new Map();
  const mergedSources = new Set();
  const mergedSurfaces = [];
  house.updateMatrixWorld(true);
  const inverseHouseMatrix = house.matrixWorld.clone().invert();
  const parts = [];
  house.traverse((part) => { if (part.isMesh && !part.isInstancedMesh) parts.push(part); });

  for (const part of parts) {
    if (Array.isArray(part.material)) continue;
    const isSurface = surfaceMeshes.has(part);
    let bySurface = batches.get(part.material);
    if (!bySurface) { bySurface = new Map(); batches.set(part.material, bySurface); }
    if (!bySurface.has(isSurface)) bySurface.set(isSurface, []);
    bySurface.get(isSurface).push(part);
  }

  for (const [material, bySurface] of batches) {
    for (const [isSurface, group] of bySurface) {
      const transformedGeometries = group.map((part) => {
        part.updateWorldMatrix(true, false);
        const localMatrix = inverseHouseMatrix.clone().multiply(part.matrixWorld);
        return part.geometry.clone().applyMatrix4(localMatrix);
      });
      const geometry = mergeGeometries(transformedGeometries, false);
      transformedGeometries.forEach((item) => item.dispose());
      if (!geometry) continue;

      const batch = new THREE.Mesh(geometry, material);
      batch.name = isSurface ? "batched-house-collision-surface" : "batched-house-detail";
      batch.castShadow = group.some((part) => part.castShadow);
      batch.receiveShadow = group.some((part) => part.receiveShadow);
      batch.userData.shotSurface = isSurface;
      house.add(batch);
      group.forEach((part) => mergedSources.add(part));
      if (isSurface) mergedSurfaces.push(batch);
    }
  }

  for (const part of mergedSources) {
    part.removeFromParent();
    part.geometry.dispose();
  }
  for (let index = surfaces.length - 1; index >= surfaceStart; index -= 1) {
    if (mergedSources.has(surfaces[index])) surfaces.splice(index, 1);
  }
  surfaces.push(...mergedSurfaces);
}

function createHouse(scene, surfaces, textures, x, z, index, width = 6.6, depth = 6.1, style = "village") {
  const surfaceStart = surfaces.length;
  const house = new THREE.Group();
  house.position.set(x, 0, z);
  scene.add(house);
  const wallMat = style === "port" ? textures.corrugated : style === "ridge" ? textures.wood : index % 2 ? textures.plasterWarm : textures.plaster;
  const woodMat = style === "port" ? textures.corrugated : index % 2 ? textures.woodLight : textures.wood;
  const wallHeight = 3.15;
  const doorWidth = 1.05;
  const frontZ = depth / 2;
  const add = (geo, mat, pos, shotSurface = false, rotation) => addMesh(house, geo, mat, pos, { shotSurface, surfaces, rotation });

  add(new THREE.BoxGeometry(width, 0.28, depth), textures.concrete, [0, 0.02, 0]);
  add(new THREE.BoxGeometry(width - 0.12, 0.12, depth - 0.12), textures.wood, [0, 0.2, 0]);
  add(new THREE.BoxGeometry(0.2, wallHeight, depth), wallMat, [-width / 2, wallHeight / 2 + 0.22, 0], true);
  add(new THREE.BoxGeometry(0.2, wallHeight, depth), wallMat, [width / 2, wallHeight / 2 + 0.22, 0], true);
  add(new THREE.BoxGeometry(width, wallHeight, 0.2), wallMat, [0, wallHeight / 2 + 0.22, -depth / 2], true);

  const sideWidth = (width - doorWidth) / 2;
  add(new THREE.BoxGeometry(sideWidth, wallHeight, 0.2), wallMat, [-doorWidth / 2 - sideWidth / 2, wallHeight / 2 + 0.22, frontZ], true);
  add(new THREE.BoxGeometry(sideWidth, wallHeight, 0.2), wallMat, [doorWidth / 2 + sideWidth / 2, wallHeight / 2 + 0.22, frontZ], true);
  add(new THREE.BoxGeometry(doorWidth, wallHeight - 2.25, 0.2), wallMat, [0, 2.25 + (wallHeight - 2.25) / 2 + 0.22, frontZ], true);

  const door = add(new THREE.BoxGeometry(doorWidth * 0.88, 2.18, 0.12), woodMat, [doorWidth * 0.38, 1.3, frontZ + 0.11], true);
  door.rotation.y = -1.06;
  add(new THREE.BoxGeometry(0.13, 2.35, 0.14), textures.concrete, [-doorWidth / 2 - 0.03, 1.39, frontZ + 0.08]);
  add(new THREE.BoxGeometry(0.13, 2.35, 0.14), textures.concrete, [doorWidth / 2 + 0.03, 1.39, frontZ + 0.08]);
  add(new THREE.BoxGeometry(doorWidth + 0.24, 0.16, 0.15), textures.concrete, [0, 2.55, frontZ + 0.08]);
  add(new THREE.SphereGeometry(0.045, 8, 8), textures.metal, [doorWidth * 0.72, 1.25, frontZ + 0.19]);

  for (const sign of [-1, 1]) {
    const wx = sign * (width * 0.29);
    const windowGroup = new THREE.Group();
    windowGroup.position.set(wx, 1.82, frontZ + 0.13);
    house.add(windowGroup);
    const glass = addMesh(windowGroup, new THREE.BoxGeometry(1.05, 0.9, 0.09), textures.glass, [0, 0, 0], { shotSurface: true, surfaces });
    glass.material = textures.glass;
    for (const sx of [-0.56, 0.56]) addMesh(windowGroup, new THREE.BoxGeometry(0.08, 1.04, 0.14), textures.concrete, [sx, 0, 0.06]);
    for (const sy of [-0.5, 0.5]) addMesh(windowGroup, new THREE.BoxGeometry(1.18, 0.08, 0.14), textures.concrete, [0, sy, 0.06]);
    addMesh(windowGroup, new THREE.BoxGeometry(0.055, 0.9, 0.13), textures.wood, [0, 0, 0.07]);
    addMesh(windowGroup, new THREE.BoxGeometry(1.05, 0.055, 0.13), textures.wood, [0, 0, 0.07]);

    const sideWindow = new THREE.Group();
    sideWindow.position.set(sign * (width / 2 + 0.105), 1.8, -0.12);
    house.add(sideWindow);
    addMesh(sideWindow, new THREE.BoxGeometry(0.09, 0.92, 1.15), textures.glass, [0, 0, 0]);
    for (const sy of [-0.51, 0.51]) addMesh(sideWindow, new THREE.BoxGeometry(0.15, 0.08, 1.31), textures.concrete, [0, sy, 0]);
    for (const sz of [-0.64, 0.64]) addMesh(sideWindow, new THREE.BoxGeometry(0.15, 1.08, 0.08), textures.concrete, [0, 0, sz]);
    addMesh(sideWindow, new THREE.BoxGeometry(0.16, 0.92, 0.055), textures.wood, [0, 0, 0]);
  }

  // Open room details sit behind the front wall so the room reads clearly from the doorway.
  const roomCenterZ = -0.18;
  const rug = new THREE.MeshStandardMaterial({ color: index % 2 ? 0x555044 : 0x4d5148, roughness: 1 });
  const fabric = new THREE.MeshStandardMaterial({ color: index % 2 ? 0x6d6554 : 0x48534c, roughness: 0.98 });
  add(new THREE.CylinderGeometry(0.055, 0.08, 0.16, 10), textures.metal, [0, 2.88, roomCenterZ]);
  add(new THREE.SphereGeometry(0.16, 12, 8), new THREE.MeshStandardMaterial({ color: 0xffd9a4, emissive: 0xffb65f, emissiveIntensity: 1.3, roughness: 0.5 }), [0, 2.72, roomCenterZ]);
  add(new THREE.BoxGeometry(width - 0.58, 0.035, depth - 0.58), rug, [0, 0.285, roomCenterZ]);
  // A low table and benches leave the center line clear for movement through the door.
  const tableX = index % 2 ? -1.05 : 1.05;
  add(new THREE.BoxGeometry(1.35, 0.1, 0.82), woodMat, [tableX, 0.78, roomCenterZ - 0.35]);
  for (const dx of [-0.55, 0.55]) for (const dz of [-0.28, 0.28]) {
    add(new THREE.CylinderGeometry(0.045, 0.055, 0.72, 8), woodMat, [tableX + dx, 0.42, roomCenterZ - 0.35 + dz]);
  }
  add(new THREE.BoxGeometry(1.55, 0.1, 0.26), woodMat, [tableX, 0.49, roomCenterZ + 0.31]);
  add(new THREE.BoxGeometry(0.44, 0.22, 0.34), textures.metal, [tableX - 0.2, 0.94, roomCenterZ - 0.34]);
  add(new THREE.CylinderGeometry(0.09, 0.1, 0.24, 10), textures.metal, [tableX + 0.28, 0.94, roomCenterZ - 0.36]);
  // Cot, folded blanket, and a wall shelf give each room a lived-in silhouette.
  const cotX = index % 2 ? 1.7 : -1.7;
  add(new THREE.BoxGeometry(1.28, 0.14, 2.05), textures.metal, [cotX, 0.54, -depth * 0.22]);
  add(new THREE.BoxGeometry(1.22, 0.18, 1.86), fabric, [cotX, 0.69, -depth * 0.22]);
  add(new THREE.BoxGeometry(1.18, 0.16, 0.48), textures.sandbag, [cotX, 0.84, -depth * 0.22 + 0.58]);
  for (const dz of [-0.82, 0.82]) {
    add(new THREE.CylinderGeometry(0.035, 0.04, 0.5, 7), textures.metal, [cotX - 0.46, 0.28, -depth * 0.22 + dz]);
    add(new THREE.CylinderGeometry(0.035, 0.04, 0.5, 7), textures.metal, [cotX + 0.46, 0.28, -depth * 0.22 + dz]);
  }
  const shelfX = index % 2 ? width / 2 - 0.42 : -width / 2 + 0.42;
  add(new THREE.BoxGeometry(0.18, 1.42, 0.62), woodMat, [shelfX, 1.04, -depth * 0.2]);
  for (const sy of [0.58, 1.05, 1.51]) {
    add(new THREE.BoxGeometry(0.32, 0.07, 0.72), woodMat, [shelfX - Math.sign(shelfX) * 0.13, sy, -depth * 0.2]);
    for (let item = 0; item < 3; item += 1) {
      const crate = addMesh(house, new THREE.BoxGeometry(0.16, 0.24 + (item % 2) * 0.08, 0.2), item % 2 ? textures.metal : textures.sandbag, [shelfX - Math.sign(shelfX) * (0.22 + item * 0.02), sy + 0.15, -depth * 0.42 + item * 0.24]);
      crate.rotation.y = (item - 1) * 0.08;
    }
  }

  const gable = new THREE.Shape();
  gable.moveTo(-width / 2 - 0.2, 0);
  gable.lineTo(0, 1.5);
  gable.lineTo(width / 2 + 0.2, 0);
  gable.closePath();
  const roofGeometry = style === "port"
    ? new THREE.BoxGeometry(width + 0.4, 0.34, depth + 0.6)
    : new THREE.ExtrudeGeometry(gable, { depth: depth + 0.6, bevelEnabled: false });
  const roofMaterial = style === "port" ? textures.corrugated : style === "ridge" ? textures.sandbag : textures.roof;
  const roofY = style === "port" ? wallHeight + 0.38 : wallHeight + 0.16;
  const roofZ = style === "port" ? 0 : -depth / 2 - 0.3;
  const roof = addMesh(house, roofGeometry, roofMaterial, [0, roofY, roofZ], { shotSurface: true, surfaces });
  roof.castShadow = true;

  for (const px of [-1, 1]) {
    add(new THREE.BoxGeometry(0.12, 2.15, 0.12), textures.wood, [px * (width * 0.34), 1.15, frontZ + 0.75]);
  }
  add(new THREE.BoxGeometry(width * 0.78, 0.15, 1.15), textures.wood, [0, 2.22, frontZ + 0.75]);
  add(new THREE.BoxGeometry(width * 0.78, 0.2, 1.2), textures.concrete, [0, 0.35, frontZ + 0.8]);
  add(new THREE.BoxGeometry(width * 0.68, 0.19, 0.62), textures.concrete, [0, 0.19, frontZ + 1.1]);

  const chimneyX = index % 2 ? width * 0.3 : -width * 0.3;
  add(new THREE.BoxGeometry(0.56, 1.6, 0.62), textures.concrete, [chimneyX, wallHeight + 1.05, -depth * 0.18]);
  add(new THREE.BoxGeometry(0.74, 0.12, 0.82), textures.metal, [chimneyX, wallHeight + 1.86, -depth * 0.18]);

  mergeHouseMeshes(house, surfaces, surfaceStart);
  return { x, z, width, depth, doorHalf: doorWidth * 0.55, left: x - width / 2, right: x + width / 2, back: z - depth / 2, front: z + depth / 2 };
}

function makeSoldier(scene, materials, position, id) {
  const root = new THREE.Group();
  root.position.set(position[0], 0, position[1]);
  root.userData.alive = true;
  root.userData.hp = 100;
  root.userData.id = id;
  root.userData.fireAt = performance.now() + 1300 + Math.random() * 1700;
  root.userData.phase = Math.random() * Math.PI * 2;
  const limbs = [];
  const put = (parent, geometry, material, x, y, z, part = "body", rotation) => {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    if (rotation) mesh.rotation.set(...rotation);
    mesh.castShadow = false;
    mesh.receiveShadow = true;
    mesh.userData.enemyRoot = root;
    mesh.userData.bodyPart = part;
    parent.add(mesh);
    return mesh;
  };
  const bone = (parent, x, y, z) => {
    const group = new THREE.Group();
    group.position.set(x, y, z);
    parent.add(group);
    return group;
  };
  const capsule = (parent, material, x, y, z, radius, length, scale = [1, 1, 1], part = "body") => {
    const mesh = put(parent, new THREE.CapsuleGeometry(radius, length, 5, 10), material, x, y, z, part);
    mesh.scale.set(...scale);
    return mesh;
  };
  const addKit = (parent, material, size, point, part = "body", rotation) => put(parent, new THREE.BoxGeometry(...size), material, ...point, part, rotation);

  const pelvis = bone(root, 0, 0.91, 0);
  capsule(pelvis, materials.uniform, 0, -0.01, 0, 0.22, 0.24, [1.1, 1, 0.9]);
  capsule(pelvis, materials.vest, 0, 0.39, 0, 0.28, 0.48, [1.12, 1.04, 0.76]);
  capsule(pelvis, materials.uniform, 0, 0.4, 0.12, 0.235, 0.42, [1.08, 1, 0.47]);
  addKit(pelvis, materials.strap, [0.48, 0.075, 0.08], [0, 0.14, 0.2], "body", [0, 0, -0.16]);
  addKit(pelvis, materials.strap, [0.48, 0.075, 0.08], [0, 0.5, 0.2], "body", [0, 0, 0.19]);
  addKit(pelvis, materials.strap, [0.54, 0.13, 0.11], [0, -0.04, 0.02]);
  addKit(pelvis, materials.metal, [0.09, 0.11, 0.035], [0, -0.04, 0.087]);
  for (const pouchX of [-0.18, -0.06, 0.06, 0.18]) {
    const pouch = capsule(pelvis, materials.pouch, pouchX, 0.22, 0.25, 0.055, 0.16, [1, 1, 0.68]);
    pouch.rotation.z = -pouchX * 0.35;
    addKit(pelvis, materials.strap, [0.075, 0.025, 0.018], [pouchX, 0.28, 0.294]);
  }
  const backpack = capsule(root, materials.pack, 0, 1.34, 0.26, 0.19, 0.38, [1.3, 1.15, 0.8]);
  backpack.rotation.x = -0.08;
  addKit(root, materials.strap, [0.12, 0.43, 0.055], [-0.21, 1.35, 0.12], "body", [0, 0, -0.17]);
  addKit(root, materials.strap, [0.12, 0.43, 0.055], [0.21, 1.35, 0.12], "body", [0, 0, 0.17]);

  const headRig = bone(root, 0, 1.77, -0.015);
  capsule(headRig, materials.skin, 0, 0.13, 0, 0.145, 0.15, [0.88, 1.04, 0.92], "head");
  capsule(headRig, materials.mask, 0, 0.04, -0.105, 0.119, 0.12, [0.92, 0.86, 0.64], "head");
  const faceGuard = addKit(headRig, materials.goggles, [0.25, 0.068, 0.035], [0, 0.173, -0.122], "head");
  faceGuard.rotation.x = -0.1;
  const helmet = put(headRig, new THREE.SphereGeometry(0.19, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.62), materials.helmet, 0, 0.25, 0.005, "head");
  helmet.scale.set(1.03, 0.82, 1.04);
  capsule(headRig, materials.helmet, 0, 0.19, -0.004, 0.195, 0.035, [1.07, 0.3, 1.02], "head");
  addKit(headRig, materials.goggles, [0.27, 0.072, 0.035], [0, 0.135, -0.146], "head");
  addKit(headRig, materials.helmet, [0.065, 0.1, 0.08], [0, 0.248, -0.19], "head");
  for (const side of [-1, 1]) {
    put(headRig, new THREE.CylinderGeometry(0.052, 0.052, 0.065, 12), materials.helmet, side * 0.185, 0.13, 0.015, "head", [0, 0, Math.PI / 2]);
    put(headRig, new THREE.CylinderGeometry(0.034, 0.034, 0.035, 12), materials.goggles, side * 0.222, 0.13, 0.015, "head", [0, 0, Math.PI / 2]);
  }

  for (const side of [-1, 1]) {
    const hip = bone(root, side * 0.145, 0.89, 0.015);
    capsule(hip, materials.uniform, 0, -0.2, 0, 0.115, 0.28, [1.04, 1, 0.96]);
    const knee = bone(hip, 0, -0.39, 0);
    capsule(knee, materials.uniform, 0, -0.18, 0, 0.086, 0.24, [0.98, 1.08, 0.94]);
    capsule(knee, materials.boot, 0, -0.38, -0.045, 0.095, 0.08, [1.14, 0.65, 1.45]);
    addKit(knee, materials.dark, [0.17, 0.055, 0.22], [0, -0.41, -0.09]);
    addKit(hip, materials.strap, [0.21, 0.11, 0.18], [0, -0.22, -0.03]);
    for (const y of [-0.2, -0.28]) addKit(hip, materials.pouch, [0.2, 0.035, 0.19], [0, y, 0.075]);

    const shoulder = bone(root, side * 0.255, 1.53, -0.01);
    const shoulderPad = capsule(shoulder, materials.vest, side * 0.01, -0.045, 0.005, 0.125, 0.09, [1.18, 0.8, 1.08]);
    shoulderPad.rotation.z = side * 0.3;
    capsule(shoulder, materials.uniform, 0, -0.2, -0.035, 0.082, 0.25, [1, 1.1, 0.9]);
    const elbow = bone(shoulder, 0, -0.38, -0.08);
    capsule(elbow, materials.uniform, 0, -0.17, -0.055, 0.064, 0.21, [0.98, 1.06, 0.92]);
    const glove = capsule(elbow, materials.glove, 0, -0.34, -0.15, 0.063, 0.085, [0.96, 0.7, 0.9]);
    glove.rotation.x = -0.24;
    addKit(elbow, materials.strap, [0.145, 0.07, 0.16], [0, -0.25, -0.06]);
    limbs.push({ leg: hip, arm: shoulder, side });
  }

  // Compact rifle with a stock, receiver, magazine, handguard, optic, barrel and front sight.
  const gun = bone(root, 0.18, 1.25, -0.36);
  addKit(gun, materials.rifle, [0.12, 0.115, 0.48], [0, 0, 0]);
  addKit(gun, materials.polymer, [0.13, 0.13, 0.26], [0, -0.035, 0.34], "body", [0.08, 0, 0]);
  addKit(gun, materials.polymer, [0.11, 0.23, 0.14], [0, -0.17, 0.06], "body", [-0.18, 0, 0]);
  put(gun, new THREE.CylinderGeometry(0.04, 0.045, 0.29, 10), materials.rifle, 0, -0.15, 0.035, "body", [0.22, 0, 0]);
  addKit(gun, materials.rifle, [0.15, 0.12, 0.42], [0, 0.01, -0.4]);
  for (let rib = 0; rib < 5; rib += 1) addKit(gun, materials.dark, [0.16, 0.018, 0.034], [0, 0.083, -0.23 - rib * 0.07]);
  put(gun, new THREE.CylinderGeometry(0.025, 0.025, 0.67, 10), materials.barrel, 0, 0.005, -0.89, "body", [Math.PI / 2, 0, 0]);
  put(gun, new THREE.CylinderGeometry(0.045, 0.045, 0.16, 12), materials.rifle, 0, 0.005, -1.18, "body", [Math.PI / 2, 0, 0]);
  addKit(gun, materials.optic, [0.085, 0.115, 0.13], [0, 0.12, -0.1]);
  put(gun, new THREE.CylinderGeometry(0.044, 0.044, 0.065, 12), materials.opticGlass, 0, 0.12, -0.174, "body", [Math.PI / 2, 0, 0]);
  put(gun, new THREE.CylinderGeometry(0.032, 0.032, 0.07, 10), materials.opticGlass, 0, 0.12, -0.03, "body", [Math.PI / 2, 0, 0]);
  addKit(gun, materials.dark, [0.06, 0.024, 0.055], [0, 0.198, -0.1]);
  const muzzle = { intensity: 0 };
  const contactShadow = new THREE.Mesh(new THREE.CircleGeometry(0.42, 18), materials.groundShadow);
  contactShadow.rotation.x = -Math.PI / 2;
  contactShadow.position.y = 0.014;
  contactShadow.userData.keepRemoteMarker = true;
  contactShadow.renderOrder = 1;
  root.add(contactShadow);
  scene.add(root);
  root.userData.limbs = limbs;
  root.userData.muzzle = muzzle;
  root.userData.gun = gun;
  return root;
}

function FpsArena({ playerName, onLogout, mapId = "barangay", missionId = "assault", onBackToMaps }) {
  const selectedMapMeta = MAPS[mapId] || MAPS.barangay;
  const selectedMissionMeta = MISSIONS[missionId] || MISSIONS.assault;
  const enemyWaveSize = selectedMissionMeta.id === "assault" ? selectedMissionMeta.target : 8;
  const stageRef = useRef(null);
  const [phase, setPhase] = useState("ready");
  const [hud, setHud] = useState({ ...INITIAL_HUD, seconds: selectedMissionMeta.seconds, target: selectedMissionMeta.target });
  const [error, setError] = useState("");
  const [hitPulse, setHitPulse] = useState(0);
  const [damagePulse, setDamagePulse] = useState(0);
  const [aiming, setAiming] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const [notice, setNotice] = useState("");
  const [networkStatus, setNetworkStatus] = useState("CONNECTING");
  const launchRef = useRef(null);
  const soundRef = useRef(true);

  useEffect(() => {
    const mount = stageRef.current;
    if (!mount) return undefined;
    const activeMap = selectedMapMeta;
    let renderer;
    let disposed = false;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: "high-performance" });
    } catch {
      setError("Hindi available ang WebGL graphics sa browser na ito. Buksan ang laro sa updated desktop Chrome.");
      return undefined;
    }

    let renderScale = (navigator.hardwareConcurrency || 8) <= 4 ? 0.78 : 0.9;
    const updateRenderResolution = () => {
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.1) * renderScale);
      renderer.setSize(mount.clientWidth, mount.clientHeight, false);
    };
    updateRenderResolution();
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.className = "combat-canvas";
    renderer.domElement.setAttribute("aria-label", "Jacob Frontline tactical 3D combat scene");
    mount.prepend(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(activeMap.sky);
    scene.fog = new THREE.Fog(activeMap.fog, activeMap.fogFar * 0.38, activeMap.fogFar);
    let backgroundTexture = null;
    let environmentTarget = null;
    const hdrLoader = new RGBELoader();
    hdrLoader.load(activeMap.environment, (hdr) => {
      if (disposed) { hdr.dispose(); return; }
      hdr.mapping = THREE.EquirectangularReflectionMapping;
      const pmrem = new THREE.PMREMGenerator(renderer);
      pmrem.compileEquirectangularShader();
      environmentTarget = pmrem.fromEquirectangular(hdr);
      pmrem.dispose();
      backgroundTexture = hdr;
      scene.background = hdr;
      scene.environment = environmentTarget.texture;
      scene.backgroundIntensity = 0.88;
      scene.environmentIntensity = activeMap.id === "port" ? 0.46 : 0.58;
    }, undefined, () => {});
    const camera = new THREE.PerspectiveCamera(72, mount.clientWidth / mount.clientHeight, 0.1, 260);
    camera.position.set(0, PLAYER_EYE_HEIGHT, 14.5);
    camera.rotation.order = "YXZ";
    scene.add(camera);

    const maxAnisotropy = renderer.capabilities.getMaxAnisotropy();
    const textures = {
      grass: createTextureMaterial(activeMap.id === "port" ? "concrete" : "grass", 213, { repeatX: 18, repeatY: 18, tint: activeMap.groundTint, roughness: 1 }),
      road: createTextureMaterial("road", 852, { repeatX: 2, repeatY: 18, tint: activeMap.roadTint, roughness: 0.96 }),
      concrete: createTextureMaterial("concrete", 447, { repeatX: 4, repeatY: 4, roughness: 0.92 }),
      plaster: createTextureMaterial("plaster", 531, { repeatX: 2, repeatY: 1.5, roughness: 0.95 }),
      plasterWarm: createTextureMaterial("plaster", 392, { repeatX: 2.4, repeatY: 1.8, tint: 0xb3a58a, roughness: 0.96 }),
      wood: createTextureMaterial("timber", 128, { repeatX: 1.6, repeatY: 1.2, roughness: 0.91 }),
      woodLight: createTextureMaterial("timber", 645, { repeatX: 1.8, repeatY: 1.3, tint: 0xa88a63, roughness: 0.92 }),
      corrugated: createTextureMaterial("metal", 773, { repeatX: 2.5, repeatY: 1.7, metalness: 0.48, roughness: 0.72 }),
      roof: createTextureMaterial("roof", 941, { repeatX: 1.7, repeatY: 1.8, side: THREE.DoubleSide, roughness: 0.86 }),
      sandbag: createTextureMaterial("sandbag", 241, { repeatX: 1.7, repeatY: 0.8, roughness: 1 }),
      metal: createTextureMaterial("metal", 774, { repeatX: 1, repeatY: 1, metalness: 0.46, roughness: 0.58 }),
      glass: new THREE.MeshStandardMaterial({ color: 0x36504c, metalness: 0.5, roughness: 0.22, emissive: 0x1b3028, emissiveIntensity: 0.85 }),
    };
    Object.values(textures).forEach((material) => { if (material.map) material.map.anisotropy = maxAnisotropy; });

    const containerMaterials = activeMap.containers ? [
      new THREE.MeshStandardMaterial({ color: 0x566b64, metalness: 0.5, roughness: 0.76 }),
      new THREE.MeshStandardMaterial({ color: 0x77704f, metalness: 0.46, roughness: 0.78 }),
    ] : [];
    const textureLoader = new THREE.TextureLoader();
    const loadScannedMaterial = (asset, materials, repeat) => {
      if (!materials.length) return;
      const assetBase = `/assets/fps/polyhaven/${asset}/${asset}`;
      const loadChannel = (channel, suffix, colorSpace) => {
        textureLoader.load(`${assetBase}_${suffix}_1k.jpg`, (loaded) => {
          if (disposed) { loaded.dispose(); return; }
          loaded.colorSpace = colorSpace;
          loaded.wrapS = THREE.RepeatWrapping;
          loaded.wrapT = THREE.RepeatWrapping;
          loaded.repeat.set(repeat[0], repeat[1]);
          loaded.anisotropy = Math.min(8, maxAnisotropy);
          for (const material of materials) {
            const previous = material[channel];
            material[channel] = loaded;
            if (previous && previous !== loaded) previous.dispose();
            material.needsUpdate = true;
          }
        }, undefined, () => {});
      };
      loadChannel("map", "diff", THREE.SRGBColorSpace);
      loadChannel("normalMap", "nor_gl", THREE.NoColorSpace);
    };
    loadScannedMaterial(activeMap.groundAsset, [textures.grass], [56, 56]);
    loadScannedMaterial("asphalt_02", [textures.road], [2, 46]);
    loadScannedMaterial("oak_wood_planks", [textures.wood, textures.woodLight], [1.8, 1.3]);
    if (activeMap.houseStyle === "village") {
      loadScannedMaterial("rough_plaster_03", [textures.plaster, textures.plasterWarm], [2, 1.5]);
    }
    if (activeMap.containers) {
      loadScannedMaterial("corrugated_iron_02", [textures.corrugated, ...containerMaterials], [2.5, 1.7]);
    }

    scene.add(new THREE.HemisphereLight(activeMap.id === "port" ? 0x9bb9ce : 0xc5d9df, activeMap.id === "port" ? 0x1b282b : 0x3b3227, 1.15));
    scene.add(new THREE.AmbientLight(activeMap.id === "port" ? 0x637d89 : 0x88938e, 0.28));
    const sun = new THREE.DirectionalLight(activeMap.id === "port" ? 0x8fb9d5 : activeMap.id === "highlands" ? 0xc8d4df : 0xffd2a0, activeMap.id === "port" ? 1.05 : 2.25);
    sun.position.set(activeMap.id === "port" ? -10 : -24, 34, activeMap.id === "highlands" ? -12 : 15);
    sun.castShadow = true;
    sun.shadow.mapSize.set(512, 512);
    sun.shadow.autoUpdate = false;
    sun.shadow.needsUpdate = true;
    sun.shadow.camera.left = -34; sun.shadow.camera.right = 34;
    sun.shadow.camera.top = 35; sun.shadow.camera.bottom = -35;
    sun.shadow.camera.near = 1; sun.shadow.camera.far = 90;
    sun.shadow.bias = -0.00025;
    scene.add(sun);

    const worldSurfaces = [];
    const playerBlockers = [];
    const houses = [];
    const effects = [];
    const smoke = [];
    const enemies = [];
    const weaponDrops = [];
    const remotePlayers = new Map();
    const squadBots = [];
    let soldierTemplate = null;
    const keys = new Set();
    const raycaster = new THREE.Raycaster();
    const coverRaycaster = new THREE.Raycaster();
    raycaster.far = 75;
    const centerAim = new THREE.Vector2(0, 0);
    const clock = new THREE.Clock();
    const movementForward = new THREE.Vector3();
    const movementRight = new THREE.Vector3();
    const movementStep = new THREE.Vector3();
    const movementFrom = new THREE.Vector3();
    const movementNext = new THREE.Vector3();
    const movementUp = new THREE.Vector3(0, 1, 0);
    const instanceTransform = new THREE.Object3D();
    const poseEuler = new THREE.Euler();
    const poseQuaternion = new THREE.Quaternion();
    const radialTexture = makeRadialTexture();
    const signTexture = makeSignTexture(activeMap.sign);

    const addWorld = (parent, geo, material, position, options = {}) => addMesh(parent, geo, material, position, { ...options, surfaces: worldSurfaces });
    const addInstancedWorld = (geometry, material, count, options = {}) => {
      const mesh = new THREE.InstancedMesh(geometry, material, count);
      mesh.name = options.name || "static-world-instances";
      mesh.castShadow = options.castShadow ?? false;
      mesh.receiveShadow = options.receiveShadow ?? false;
      mesh.instanceMatrix.setUsage(THREE.StaticDrawUsage);
      scene.add(mesh);
      if (options.shotSurface) worldSurfaces.push(mesh);
      return mesh;
    };
    const ground = addWorld(scene, new THREE.PlaneGeometry(270, 270), textures.grass, [0, -0.24, -80], { rotation: [-Math.PI / 2, 0, 0], shotSurface: true, castShadow: false });
    ground.receiveShadow = true;
    const road = addWorld(scene, new THREE.BoxGeometry(10, 0.16, 245), textures.road, [0, -0.12, -78.5], { shotSurface: true, castShadow: false });
    road.receiveShadow = true;
    addWorld(scene, new THREE.BoxGeometry(12, 0.18, 245), textures.concrete, [0, -0.18, -78.5], { shotSurface: true, castShadow: false });
    addWorld(scene, new THREE.BoxGeometry(1.15, 0.2, 243), textures.concrete, [-5.65, -0.1, -78.5], { castShadow: false });
    addWorld(scene, new THREE.BoxGeometry(1.15, 0.2, 243), textures.concrete, [5.65, -0.1, -78.5], { castShadow: false });
    const centerPaint = new THREE.MeshStandardMaterial({ color: 0xb3a578, roughness: 0.92 });
    for (let z = 39; z > -198; z -= 9) addWorld(scene, new THREE.BoxGeometry(0.12, 0.018, 4.2), centerPaint, [0, -0.025, z], { castShadow: false });

    // Side roads form four usable cross routes and connect the main street to flanking compounds.
    const branchRoads = activeMap.id === "barangay"
      ? [-49, -88, -146, -181]
      : activeMap.id === "highlands"
        ? [-54, -93, -131, -168]
        : [-36, -74, -115, -175];
    for (const z of branchRoads) {
      addWorld(scene, new THREE.BoxGeometry(70, 0.14, 7), textures.road, [0, -0.105, z], { shotSurface: true, castShadow: false });
      addWorld(scene, new THREE.BoxGeometry(70, 0.16, 9), textures.concrete, [0, -0.16, z], { shotSurface: true, castShadow: false });
      for (const side of [-1, 1]) {
        const checkpoint = new THREE.Group();
        checkpoint.position.set(side * 24, 0, z + 5.8);
        scene.add(checkpoint);
        addWorld(checkpoint, new THREE.BoxGeometry(3.2, 0.22, 2.2), textures.sandbag, [0, 0.11, 0], { shotSurface: true });
        addWorld(checkpoint, new THREE.BoxGeometry(0.22, 1.45, 0.22), textures.metal, [-1.45, 0.83, 0], { castShadow: false });
        addWorld(checkpoint, new THREE.BoxGeometry(0.22, 1.45, 0.22), textures.metal, [1.45, 0.83, 0], { castShadow: false });
        addWorld(checkpoint, new THREE.BoxGeometry(3.1, 0.12, 0.15), textures.metal, [0, 1.47, 0], { castShadow: false });
      }
    }

    for (const [x, z, index, width, depth] of activeMap.houses) {
      const bounds = createHouse(scene, worldSurfaces, textures, x, z, index, width, depth, activeMap.houseStyle);
      houses.push(bounds);
      addWorld(scene, new THREE.BoxGeometry(0.62, 0.86, 0.58), textures.metal, [x + (index % 2 ? -1 : 1) * (width / 2 + 0.55), 0.45, z + 0.5], { shotSurface: true });
      playerBlockers.push({ type: "house", ...bounds });
    }
    if (activeMap.containers) {
      const ribGeometry = new THREE.BoxGeometry(0.055, 2.55, 0.055);
      const containerPlacements = [[-7.8, -6, 0], [7.8, -6, 1], [-7.8, -30, 1], [7.8, -30, 0], [-7.8, -54, 0], [7.8, -54, 1], [-7.8, -78, 1], [7.8, -78, 0], [-7.8, -102, 0], [7.8, -102, 1], [-7.8, -126, 1], [7.8, -126, 0], [-7.8, -150, 0], [7.8, -150, 1], [-7.8, -174, 1], [7.8, -174, 0], [-7.8, -198, 0], [7.8, -198, 1]];
      for (const [x, z, palette] of containerPlacements) {
        const container = new THREE.Group();
        container.position.set(x, 0, z);
        scene.add(container);
        addWorld(container, new THREE.BoxGeometry(2.15, 2.65, 7.3), containerMaterials[palette], [0, 1.36, 0], { shotSurface: true, castShadow: false });
        addWorld(container, new THREE.BoxGeometry(2.2, 0.11, 7.35), textures.corrugated, [0, 2.72, 0], { castShadow: false });
        const ribs = new THREE.InstancedMesh(ribGeometry, containerMaterials[palette], 28);
        const ribTransform = new THREE.Object3D();
        let ribIndex = 0;
        for (const side of [-1, 1]) for (let rib = 0; rib < 14; rib += 1) {
          ribTransform.position.set(side * 1.08, 1.34, -3.25 + rib * 0.5);
          ribTransform.updateMatrix();
          ribs.setMatrixAt(ribIndex, ribTransform.matrix);
          ribIndex += 1;
        }
        ribs.instanceMatrix.needsUpdate = true;
        ribs.castShadow = false;
        container.add(ribs);
        playerBlockers.push({ type: "circle", x, z, radius: 2.1 });
      }
    }
    const fenceMat = new THREE.MeshStandardMaterial({ color: activeMap.id === "port" ? 0x5a6865 : 0x514638, metalness: activeMap.id === "port" ? 0.68 : 0.02, roughness: 0.82 });
    const fencePosts = addInstancedWorld(new THREE.BoxGeometry(0.1, 1.15, 0.1), fenceMat, 162, { castShadow: true, receiveShadow: true, name: "fence-posts" });
    const fenceRails = addInstancedWorld(new THREE.BoxGeometry(2.5, 0.09, 0.1), fenceMat, 36, { castShadow: true, receiveShadow: true, name: "fence-rails" });
    let fencePostIndex = 0;
    let fenceRailIndex = 0;
    for (const side of [-1, 1]) {
      for (const z of [8, -18, -44, -70, -96, -122, -148, -174, -196]) {
        for (let index = 0; index < 9; index += 1) {
          const px = side * (6.5 + index * 0.28);
          instanceTransform.position.set(px, 0.52, z);
          instanceTransform.rotation.set(0, 0, 0);
          instanceTransform.scale.set(1, 1, 1);
          instanceTransform.updateMatrix();
          fencePosts.setMatrixAt(fencePostIndex++, instanceTransform.matrix);
        }
        for (const y of [0.83, 0.34]) {
          instanceTransform.position.set(side * 7.62, y, z);
          instanceTransform.rotation.set(0, 0, 0);
          instanceTransform.scale.set(1, 1, 1);
          instanceTransform.updateMatrix();
          fenceRails.setMatrixAt(fenceRailIndex++, instanceTransform.matrix);
        }
      }
    }
    fencePosts.instanceMatrix.needsUpdate = true;
    fenceRails.instanceMatrix.needsUpdate = true;
    fencePosts.computeBoundingSphere();
    fenceRails.computeBoundingSphere();

    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x55483a, roughness: 1 });
    const leafMats = [
      new THREE.MeshStandardMaterial({ color: 0x4a5440, roughness: 1, flatShading: false }),
      new THREE.MeshStandardMaterial({ color: 0x586149, roughness: 1, flatShading: false }),
      new THREE.MeshStandardMaterial({ color: 0x35483d, roughness: 1, flatShading: false }),
    ];
    const treePositions = activeMap.trees;
    const trunks = treePositions.length ? addInstancedWorld(new THREE.CylinderGeometry(0.22, 0.48, 1, 7), trunkMat, treePositions.length, { castShadow: true, receiveShadow: true, name: "tree-trunks" }) : null;
    const branches = treePositions.length ? addInstancedWorld(new THREE.CylinderGeometry(0.045, 0.13, 1, 7), trunkMat, treePositions.length * 5, { castShadow: false, receiveShadow: true, name: "tree-branches" }) : null;
    const leafGeometry = treePositions.length ? new THREE.SphereGeometry(1, 10, 7) : null;
    const leafInstances = treePositions.length ? leafMats.map((material, index) => addInstancedWorld(leafGeometry, material, treePositions.length * 10, { name: `tree-leaves-${index}` })) : [];
    let branchIndex = 0;
    const leafIndices = [0, 0, 0];
    for (let index = 0; index < treePositions.length; index += 1) {
      const [x, z] = treePositions[index];
      const height = 4.2 + (index % 3) * 0.55;
      instanceTransform.position.set(x, height / 2 - 0.02, z);
      instanceTransform.rotation.set(0, 0, 0);
      instanceTransform.scale.set(1, height, 1);
      instanceTransform.updateMatrix();
      trunks.setMatrixAt(index, instanceTransform.matrix);
      playerBlockers.push({ type: "circle", x, z, radius: 0.48 });
      for (let branch = 0; branch < 5; branch += 1) {
        const angle = branch * 1.256 + index * 0.31;
        const startY = height * (0.43 + (branch % 2) * 0.08);
        const endX = x + Math.cos(angle) * (0.8 + (branch % 2) * 0.24);
        const endY = height * (0.68 + (branch % 3) * 0.06);
        const endZ = z + Math.sin(angle) * (0.8 + (branch % 2) * 0.24);
        movementForward.set(endX - x, endY - startY, endZ - z);
        const branchLength = movementForward.length();
        movementForward.normalize();
        instanceTransform.position.set(x + (endX - x) * 0.5, (startY + endY) * 0.5, z + (endZ - z) * 0.5);
        instanceTransform.quaternion.setFromUnitVectors(movementUp, movementForward);
        instanceTransform.scale.set(1, branchLength, 1);
        instanceTransform.updateMatrix();
        branches.setMatrixAt(branchIndex++, instanceTransform.matrix);
      }
      for (let cluster = 0; cluster < 10; cluster += 1) {
        const materialIndex = (index + cluster) % leafMats.length;
        const radius = 1.1 + ((index + cluster) % 4) * 0.19;
        instanceTransform.position.set(x + Math.sin(cluster * 2.2 + index) * 1.18, height * 0.76 + Math.cos(cluster * 1.7) * 0.88, z + Math.cos(cluster * 1.5 + index) * 1.12);
        instanceTransform.rotation.set(0, 0, 0);
        instanceTransform.scale.set(radius * (1 + (cluster % 3) * 0.16), radius * (0.84 + (cluster % 4) * 0.08), radius * (0.96 + (cluster % 2) * 0.18));
        instanceTransform.updateMatrix();
        leafInstances[materialIndex].setMatrixAt(leafIndices[materialIndex]++, instanceTransform.matrix);
      }
    }
    if (trunks) { trunks.instanceMatrix.needsUpdate = true; trunks.computeBoundingSphere(); }
    if (branches) { branches.instanceMatrix.needsUpdate = true; branches.computeBoundingSphere(); }
    for (const leaves of leafInstances) {
      leaves.count = leafIndices[leafInstances.indexOf(leaves)];
      leaves.instanceMatrix.needsUpdate = true;
      leaves.computeBoundingSphere();
    }
    const lampMat = new THREE.MeshStandardMaterial({ color: 0x303a3b, metalness: 0.7, roughness: 0.45 });
    const lampGlow = new THREE.MeshStandardMaterial({ color: 0xffd6a1, emissive: 0xffa65b, emissiveIntensity: 2.8 });
    const lampOff = new THREE.MeshStandardMaterial({ color: 0x514b3e, emissive: 0x15130d, emissiveIntensity: 0.2 });
    for (const side of [-1, 1]) {
      for (const z of [-2, -32, -62, -92, -122, -152, -182]) {
        addWorld(scene, new THREE.CylinderGeometry(0.09, 0.16, 7.8, 8), lampMat, [side * 5.9, 3.9, z], { castShadow: true });
        addWorld(scene, new THREE.BoxGeometry(1.6, 0.13, 0.16), lampMat, [side * 5.45, 7.7, z]);
        addWorld(scene, new THREE.BoxGeometry(0.72, 0.13, 0.42), lampGlow, [side * 4.75, 7.62, z]);
      }
    }

    const polePositions = activeMap.id === "port" ? [] : [[-18, -3], [18, -28], [-18, -55], [18, -82], [-18, -108], [18, -134], [-18, -160], [18, -186], [-18, -204]];
    for (const [x, z] of polePositions) {
      addWorld(scene, new THREE.CylinderGeometry(0.14, 0.21, 9, 7), trunkMat, [x, 4.5, z], { castShadow: true });
      addWorld(scene, new THREE.BoxGeometry(3.4, 0.13, 0.12), lampMat, [x, 8.2, z]);
    }
    const wireMat = new THREE.LineBasicMaterial({ color: 0x292c2b, transparent: true, opacity: 0.7 });
    for (let wire = 0; polePositions.length && wire < 3; wire += 1) {
      const points = polePositions.map(([x, z], index) => new THREE.Vector3(x, 8.2 - wire * 0.34 - Math.sin(index / 3 * Math.PI) * 0.8, z));
      const cable = new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), wireMat);
      scene.add(cable);
    }

    const barrelMaterial = new THREE.MeshStandardMaterial({ color: activeMap.id === "port" ? 0x354044 : 0x544b3d, metalness: activeMap.id === "port" ? 0.72 : 0.5, roughness: 0.7 });
    const lidMaterial = new THREE.MeshStandardMaterial({ color: 0x78694e, metalness: 0.45, roughness: 0.7 });
    const coverSpots = [[-5.9, 1.8], [5.9, -16], [-4.7, -38], [6.2, -59], [-5.6, -79], [5.8, -101], [-5.8, -126], [5.8, -148], [-5.8, -174], [5.8, -194]];
    for (let index = 0; index < coverSpots.length; index += 1) {
      const [x, z] = coverSpots[index];
      addWorld(scene, new THREE.CylinderGeometry(0.38, 0.38, 1.15, 12), barrelMaterial, [x, 0.62, z], { shotSurface: true });
      addWorld(scene, new THREE.CylinderGeometry(0.39, 0.39, 0.08, 12), lidMaterial, [x, 1.24, z], { shotSurface: true });
      playerBlockers.push({ type: "circle", x, z, radius: 0.62 });
    }
    const sandbags = activeMap.id !== "port" ? addInstancedWorld(new THREE.BoxGeometry(0.88, 0.56, 0.52), textures.sandbag, 44, { shotSurface: true, castShadow: true, receiveShadow: true, name: "sandbag-cover" }) : null;
    let sandbagIndex = 0;
    for (let line = 0; activeMap.id !== "port" && line < 11; line += 1) {
      const x = line % 2 ? 5 : -5;
      const z = -line * 17 - 4;
      for (let bag = 0; bag < 4; bag += 1) {
        const px = x + (bag % 2) * 0.86 - 0.43;
        const pz = z + Math.floor(bag / 2) * 0.48;
        instanceTransform.position.set(px, 0.28, pz);
        instanceTransform.rotation.set(0, 0, 0);
        instanceTransform.scale.set(1, 1, 1);
        instanceTransform.updateMatrix();
        sandbags.setMatrixAt(sandbagIndex++, instanceTransform.matrix);
        playerBlockers.push({ type: "circle", x: px, z: pz, radius: 0.52 });
      }
    }
    if (sandbags) { sandbags.instanceMatrix.needsUpdate = true; sandbags.computeBoundingSphere(); }

    const sign = new THREE.Mesh(new THREE.PlaneGeometry(5.4, 1.25), new THREE.MeshBasicMaterial({ map: signTexture, side: THREE.DoubleSide }));
    sign.position.set(0, 5.3, -207);
    scene.add(sign);
    addWorld(scene, new THREE.BoxGeometry(5.3, 0.13, 0.17), lampMat, [0, 5.96, -207]);
    addWorld(scene, new THREE.CylinderGeometry(0.11, 0.15, 5.3, 8), lampMat, [-2.35, 2.75, -207]);
    addWorld(scene, new THREE.CylinderGeometry(0.11, 0.15, 5.3, 8), lampMat, [2.35, 2.75, -207]);

    const smokeMaterial = new THREE.SpriteMaterial({ map: radialTexture, color: 0x9c9f96, transparent: true, opacity: 0.14, depthWrite: false, blending: THREE.NormalBlending });
    for (const [x, z] of [[-11, -2], [12, -27], [-14, -51], [9, -76], [-11, -98], [13, -126], [-14, -154], [11, -184], [-10, -199]]) {
      const sprite = new THREE.Sprite(smokeMaterial.clone());
      const baseY = 4.2 + Math.random() * 1.8;
      sprite.position.set(x, baseY, z);
      sprite.scale.set(6.5, 8, 1);
      scene.add(sprite);
      smoke.push({ sprite, baseY, phase: Math.random() * Math.PI * 2 });
    }

    const supplyCrates = [];
    for (const [id, x, z] of [[0, 0, 18], [1, -24, -59], [2, 24, -148]]) {
      const crate = new THREE.Group();
      crate.position.set(x, 0, z);
      scene.add(crate);
      addWorld(crate, new THREE.BoxGeometry(1.25, 0.78, 0.9), textures.metal, [0, 0.42, 0], { shotSurface: true });
      addWorld(crate, new THREE.BoxGeometry(1.35, 0.12, 0.98), textures.concrete, [0, 0.86, 0], { shotSurface: true });
      const statusLamp = addWorld(crate, new THREE.BoxGeometry(0.78, 0.1, 0.08), lampGlow, [0, 0.92, 0.47]);
      const supplyLight = new THREE.PointLight(0xffc778, 2, 4, 2);
      supplyLight.position.set(0, 1.4, 0);
      crate.add(supplyLight);
      supplyCrates.push({ id, group: crate, statusLamp, used: false });
      playerBlockers.push({ type: "circle", x, z, radius: 0.85 });
    }

    const vehicleMaterials = {
      armor: new THREE.MeshStandardMaterial({ color: activeMap.id === "port" ? 0x3b4845 : 0x53604a, metalness: 0.58, roughness: 0.72 }),
      edge: new THREE.MeshStandardMaterial({ color: 0x252c29, metalness: 0.72, roughness: 0.52 }),
      glass: new THREE.MeshStandardMaterial({ color: 0x20383d, metalness: 0.62, roughness: 0.25, emissive: 0x102326, emissiveIntensity: 0.3 }),
      rubber: new THREE.MeshStandardMaterial({ color: 0x171b19, roughness: 0.98 }),
      lamp: new THREE.MeshStandardMaterial({ color: 0xffd890, emissive: 0xffa44a, emissiveIntensity: 2.4 }),
      parachute: new THREE.MeshStandardMaterial({ color: 0xb7c6b8, roughness: 0.92, side: THREE.DoubleSide }),
      cord: new THREE.LineBasicMaterial({ color: 0xe5dfc8, transparent: true, opacity: 0.85 }),
      rotorWash: new THREE.MeshBasicMaterial({ color: 0x9daaa1, transparent: true, opacity: 0.055, depthWrite: false, side: THREE.DoubleSide }),
    };
    const vehicleMesh = (parent, geometry, material, position, rotation) => {
      const mesh = addWorld(parent, geometry, material, position, { rotation, castShadow: false, receiveShadow: true });
      mesh.userData.vehicleSurface = true;
      return mesh;
    };
    const apc = new THREE.Group();
    apc.position.set(-9, 0, 19);
    scene.add(apc);
    vehicleMesh(apc, new THREE.BoxGeometry(2.8, 1.2, 4.6), vehicleMaterials.armor, [0, 1.05, 0]);
    vehicleMesh(apc, new THREE.BoxGeometry(2.35, 1.2, 2.55), vehicleMaterials.armor, [0, 2.03, -0.28], [0.05, 0, 0]);
    vehicleMesh(apc, new THREE.BoxGeometry(2.05, 0.05, 2.36), vehicleMaterials.edge, [0, 2.67, -0.28]);
    vehicleMesh(apc, new THREE.BoxGeometry(1.72, 0.58, 0.09), vehicleMaterials.glass, [0, 2.22, -1.58], [-0.18, 0, 0]);
    const apcCannon = new THREE.Group();
    apcCannon.position.set(0, 2.78, -0.28);
    vehicleMesh(apcCannon, new THREE.CylinderGeometry(0.76, 0.82, 0.16, 16), vehicleMaterials.edge, [0, 0, 0]);
    vehicleMesh(apcCannon, new THREE.BoxGeometry(1.35, 0.58, 1.5), vehicleMaterials.armor, [0, 0.34, -0.12]);
    vehicleMesh(apcCannon, new THREE.BoxGeometry(0.86, 0.18, 0.78), vehicleMaterials.edge, [0, 0.71, -0.16]);
    vehicleMesh(apcCannon, new THREE.CylinderGeometry(0.13, 0.16, 2.05, 12), vehicleMaterials.edge, [0, 0.45, -1.42], [Math.PI / 2, 0, 0]);
    vehicleMesh(apcCannon, new THREE.CylinderGeometry(0.21, 0.21, 0.28, 12), vehicleMaterials.edge, [0, 0.45, -2.47], [Math.PI / 2, 0, 0]);
    const cannonMuzzle = new THREE.Object3D();
    cannonMuzzle.position.set(0, 0.45, -2.62);
    apcCannon.add(cannonMuzzle);
    const cannonFlash = new THREE.PointLight(0xffa84f, 0, 15, 2);
    cannonFlash.position.copy(cannonMuzzle.position);
    apcCannon.add(cannonFlash);
    apc.add(apcCannon);
    const apcWheels = [];
    for (const side of [-1, 1]) {
      vehicleMesh(apc, new THREE.BoxGeometry(0.09, 0.36, 1.35), vehicleMaterials.edge, [side * 1.38, 1.65, -0.18]);
      vehicleMesh(apc, new THREE.BoxGeometry(0.08, 0.34, 1.28), vehicleMaterials.glass, [side * 1.426, 2.21, -0.29]);
      for (const z of [-1.46, -0.48, 0.5, 1.48]) apcWheels.push(vehicleMesh(apc, new THREE.CylinderGeometry(0.43, 0.43, 0.2, 16), vehicleMaterials.rubber, [side * 1.42, 0.65, z], [0, 0, Math.PI / 2]));
    }
    for (const x of [-0.91, 0.91]) vehicleMesh(apc, new THREE.SphereGeometry(0.15, 10, 8), vehicleMaterials.lamp, [x, 1.45, -2.33]);
    apc.userData.kind = "apc";
    apc.userData.label = "ARMORED PERSONNEL CARRIER";
    apc.userData.wheels = apcWheels;
    apc.userData.cannon = apcCannon;
    apc.userData.cannonHomePosition = apcCannon.position.clone();
    apc.userData.cannonMuzzle = cannonMuzzle;
    apc.userData.cannonFlash = cannonFlash;
    apc.userData.cannonFlashOffAt = 0;
    const helicopter = new THREE.Group();
    helicopter.position.set(9, 0, 19);
    scene.add(helicopter);
    vehicleMesh(helicopter, new THREE.SphereGeometry(1, 16, 12), vehicleMaterials.armor, [0, 1.53, 0]);
    helicopter.children[0].scale.set(1.24, 0.79, 1.76);
    vehicleMesh(helicopter, new THREE.BoxGeometry(1.56, 0.78, 1.14), vehicleMaterials.glass, [0, 1.76, -1.1]);
    vehicleMesh(helicopter, new THREE.CylinderGeometry(0.18, 0.3, 3.65, 10), vehicleMaterials.armor, [0, 1.66, 2.05], [Math.PI / 2, 0, 0]);
    vehicleMesh(helicopter, new THREE.BoxGeometry(0.2, 0.12, 1.12), vehicleMaterials.armor, [0, 2.88, 3.25]);
    vehicleMesh(helicopter, new THREE.BoxGeometry(0.62, 0.11, 0.56), vehicleMaterials.edge, [0, 2.95, 0.1]);
    const mainRotor = new THREE.Group();
    mainRotor.name = "rotor-main";
    mainRotor.position.set(0, 3.08, 0.1);
    vehicleMesh(mainRotor, new THREE.BoxGeometry(0.17, 0.045, 8.2), vehicleMaterials.edge, [0, 0, 0]);
    vehicleMesh(mainRotor, new THREE.BoxGeometry(8.2, 0.045, 0.17), vehicleMaterials.edge, [0, 0.015, 0]);
    helicopter.add(mainRotor);
    const rotorWash = new THREE.Mesh(new THREE.CircleGeometry(3.35, 32), vehicleMaterials.rotorWash);
    rotorWash.rotation.x = -Math.PI / 2;
    rotorWash.position.y = 3.095;
    rotorWash.renderOrder = 2;
    helicopter.add(rotorWash);
    const tailRotor = new THREE.Group();
    tailRotor.name = "rotor-tail";
    tailRotor.position.set(0, 1.78, 3.87);
    vehicleMesh(tailRotor, new THREE.BoxGeometry(0.1, 1.5, 0.12), vehicleMaterials.edge, [0, 0, 0]);
    vehicleMesh(tailRotor, new THREE.BoxGeometry(1.5, 0.1, 0.12), vehicleMaterials.edge, [0, 0, 0]);
    helicopter.add(tailRotor);
    for (const side of [-1, 1]) {
      vehicleMesh(helicopter, new THREE.CylinderGeometry(0.055, 0.055, 1.2, 8), vehicleMaterials.edge, [side * 0.68, 0.65, 0.2], [0, 0, Math.PI / 2]);
      vehicleMesh(helicopter, new THREE.CylinderGeometry(0.045, 0.045, 2.45, 8), vehicleMaterials.edge, [side * 0.87, 0.3, 0.15], [0, 0, Math.PI / 2]);
    }
    helicopter.userData.kind = "helicopter";
    helicopter.userData.label = "UTILITY HELICOPTER";
    helicopter.userData.mainRotor = mainRotor;
    helicopter.userData.tailRotor = tailRotor;
    const parachuteTemplate = new THREE.Group();
    parachuteTemplate.visible = false;
    const canopy = new THREE.Mesh(new THREE.SphereGeometry(2.15, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), vehicleMaterials.parachute);
    canopy.position.y = 4.6;
    canopy.scale.z = 0.68;
    canopy.castShadow = false;
    parachuteTemplate.add(canopy);
    for (let line = 0; line < 8; line += 1) {
      const angle = (line / 8) * Math.PI * 2;
      const top = new THREE.Vector3(Math.cos(angle) * 1.8, 4.47, Math.sin(angle) * 1.22);
      const harness = new THREE.Vector3(Math.cos(angle) * 0.25, 1.55, Math.sin(angle) * 0.2);
      parachuteTemplate.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([top, harness]), vehicleMaterials.cord));
    }
    parachuteTemplate.position.set(0, -200, 0);
    scene.add(parachuteTemplate);

    const intelPickups = [];
    const objectiveGlow = new THREE.MeshStandardMaterial({ color: 0x65cfe0, emissive: 0x2197ac, emissiveIntensity: 2.1, metalness: 0.28, roughness: 0.22 });
    const objectiveMetal = new THREE.MeshStandardMaterial({ color: 0x354547, metalness: 0.74, roughness: 0.42 });
    if (selectedMissionMeta.id === "intel") {
      for (const [index, [x, z]] of [[-24, -31], [24, -121], [-24, -166]].entries()) {
        const pickup = new THREE.Group();
        pickup.position.set(x, 0, z);
        scene.add(pickup);
        addWorld(pickup, new THREE.CylinderGeometry(0.58, 0.72, 0.16, 18), objectiveMetal, [0, 0.08, 0]);
        const drive = addWorld(pickup, new THREE.BoxGeometry(0.42, 0.22, 0.31), objectiveGlow, [0, 0.36, 0], { castShadow: false });
        drive.rotation.y = -0.18;
        const beacon = new THREE.PointLight(0x57ccdf, 1.4, 4, 2);
        beacon.position.y = 0.8;
        pickup.add(beacon);
        intelPickups.push({ id: index, group: pickup, collected: false, phase: index * 1.7 });
      }
    }
    let defenseZone = null;
    let defenseRing = null;
    if (selectedMissionMeta.id === "defense") {
      defenseZone = new THREE.Group();
      defenseZone.position.set(24, 0, -121);
      scene.add(defenseZone);
      addWorld(defenseZone, new THREE.CylinderGeometry(5.8, 5.8, 0.05, 32), new THREE.MeshStandardMaterial({ color: 0x5e783f, transparent: true, opacity: 0.2, roughness: 1 }), [0, 0.015, 0]);
      defenseRing = new THREE.Mesh(new THREE.TorusGeometry(5.5, 0.08, 6, 40), objectiveGlow);
      defenseRing.rotation.x = -Math.PI / 2;
      defenseRing.position.y = 0.14;
      defenseZone.add(defenseRing);
      const beacon = addWorld(defenseZone, new THREE.CylinderGeometry(0.18, 0.28, 2.4, 8), objectiveMetal, [0, 1.2, 0]);
      addWorld(defenseZone, new THREE.OctahedronGeometry(0.38, 0), objectiveGlow, [0, 2.65, 0], { castShadow: false });
      const beaconLight = new THREE.PointLight(0x62c9db, 2.2, 8, 2);
      beaconLight.position.y = 2.9;
      defenseZone.add(beaconLight);
      beacon.rotation.y = 0.2;
    }

    const enemyMaterials = {
      uniform: createCamouflageMaterial(),
      friendlyUniform: (() => { const material = createCamouflageMaterial(); material.color.setHex(0xb3cbd0); return material; })(),
      vest: new THREE.MeshStandardMaterial({ color: 0x393b34, roughness: 0.94 }),
      friendlyVest: new THREE.MeshStandardMaterial({ color: 0x435a55, roughness: 0.94 }),
      strap: new THREE.MeshStandardMaterial({ color: 0x7c745d, roughness: 0.9 }),
      friendlyStrap: new THREE.MeshStandardMaterial({ color: 0x788b82, roughness: 0.92 }),
      pouch: new THREE.MeshStandardMaterial({ color: 0x5a5649, roughness: 0.9 }),
      friendlyPouch: new THREE.MeshStandardMaterial({ color: 0x62786e, roughness: 0.92 }),
      pack: new THREE.MeshStandardMaterial({ color: 0x4b5144, roughness: 0.98 }),
      friendlyPack: new THREE.MeshStandardMaterial({ color: 0x4a625a, roughness: 0.98 }),
      vestBack: new THREE.MeshStandardMaterial({ color: 0x30382f, roughness: 0.98 }),
      friendlyVestBack: new THREE.MeshStandardMaterial({ color: 0x344541, roughness: 0.98 }),
      friendlyPatch: new THREE.MeshStandardMaterial({ color: 0x9fb5aa, roughness: 0.88 }),
      skin: createSkinMaterial(),
      helmet: new THREE.MeshStandardMaterial({ color: 0x45513f, roughness: 0.86 }),
      friendlyHelmet: new THREE.MeshStandardMaterial({ color: 0x52665e, roughness: 0.88 }),
      goggles: new THREE.MeshStandardMaterial({ color: 0x171f22, metalness: 0.36, roughness: 0.25 }),
      mask: new THREE.MeshStandardMaterial({ color: 0x343a35, roughness: 0.95 }),
      glove: new THREE.MeshStandardMaterial({ color: 0x353a33, roughness: 0.9 }),
      boot: new THREE.MeshStandardMaterial({ color: 0x272d2a, roughness: 0.92 }),
      friendlyBoot: new THREE.MeshStandardMaterial({ color: 0x293934, roughness: 0.93 }),
      rifle: new THREE.MeshStandardMaterial({ color: 0x252d2c, metalness: 0.65, roughness: 0.5 }),
      barrel: new THREE.MeshStandardMaterial({ color: 0x171c1b, metalness: 0.76, roughness: 0.37 }),
      polymer: new THREE.MeshStandardMaterial({ color: 0x242a27, roughness: 0.85 }),
      dark: new THREE.MeshStandardMaterial({ color: 0x121817, metalness: 0.55, roughness: 0.38 }),
      metal: new THREE.MeshStandardMaterial({ color: 0x4b514e, metalness: 0.78, roughness: 0.34 }),
      optic: new THREE.MeshStandardMaterial({ color: 0x131b1b, metalness: 0.65, roughness: 0.25 }),
      opticGlass: new THREE.MeshStandardMaterial({ color: 0x315b57, emissive: 0x15312c, emissiveIntensity: 0.18, metalness: 0.3, roughness: 0.16 }),
      akWood: new THREE.MeshStandardMaterial({ color: 0x744a27, roughness: 0.82 }),
      akWoodEdge: new THREE.MeshStandardMaterial({ color: 0x94633a, roughness: 0.78 }),
      groundShadow: new THREE.MeshBasicMaterial({ color: 0x09100f, transparent: true, opacity: 0.28, depthWrite: false, side: THREE.DoubleSide }),
    };
    const weaponDropRingGeometry = new THREE.RingGeometry(0.31, 0.42, 20);
    const weaponDropRingMaterial = new THREE.MeshBasicMaterial({ color: 0x88c9a7, transparent: true, opacity: 0.48, depthWrite: false, side: THREE.DoubleSide, toneMapped: false });
    const bodyClothesGeometry = {
      torso: new THREE.CapsuleGeometry(0.205, 0.22, 8, 20),
      plate: new RoundedBoxGeometry(0.45, 0.42, 0.16, 4, 0.045),
      pouch: new RoundedBoxGeometry(0.094, 0.14, 0.075, 3, 0.016),
      arm: new THREE.CapsuleGeometry(0.069, 0.14, 8, 18),
      forearm: new THREE.CapsuleGeometry(0.06, 0.17, 8, 18),
      thigh: new THREE.CapsuleGeometry(0.094, 0.24, 8, 18),
      calf: new THREE.CapsuleGeometry(0.077, 0.25, 8, 18),
      knee: new RoundedBoxGeometry(0.16, 0.14, 0.055, 3, 0.025),
      boot: new RoundedBoxGeometry(0.14, 0.16, 0.25, 4, 0.03),
      helmet: new THREE.SphereGeometry(0.155, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.62),
      buckle: new RoundedBoxGeometry(0.36, 0.09, 0.11, 3, 0.018),
    };
    const soldierWearGeometryCache = new Map();
    let rifleTemplate = null;
    const makeDetailedRifle = (targetLength, zOffset) => {
      if (!rifleTemplate) return null;
      const model = rifleTemplate.clone(true);
      const originalBounds = new THREE.Box3().setFromObject(model);
      const originalSize = originalBounds.getSize(new THREE.Vector3());
      if (originalSize.x >= originalSize.z && originalSize.x >= originalSize.y) model.rotation.y = Math.PI / 2;
      else if (originalSize.y >= originalSize.z) model.rotation.x = -Math.PI / 2;
      model.updateMatrixWorld(true);
      const bounds = new THREE.Box3().setFromObject(model);
      const center = bounds.getCenter(new THREE.Vector3());
      const size = bounds.getSize(new THREE.Vector3());
      const scale = targetLength / Math.max(size.x, size.y, size.z, 0.001);
      model.scale.setScalar(scale);
      model.position.set(-center.x * scale, -center.y * scale, -center.z * scale + zOffset);
      model.traverse((part) => {
        if (!part.isMesh) return;
        part.castShadow = false;
        part.receiveShadow = false;
        part.userData.sharedAsset = true;
        part.material = Array.isArray(part.material) ? part.material.map((material) => material.clone()) : part.material.clone();
        part.userData.ownsMaterial = true;
      });
      const rifleAssembly = new THREE.Group();
      rifleAssembly.add(model);
      if (targetLength > 1.5) {
        const sourceMagazine = model.getObjectByName("Magazine");
        if (sourceMagazine?.isMesh) {
          model.updateMatrixWorld(true);
          rifleAssembly.updateMatrixWorld(true);
          const localMatrix = sourceMagazine.matrixWorld.clone().premultiply(rifleAssembly.matrixWorld.clone().invert());
          const magazine = sourceMagazine.clone();
          localMatrix.decompose(magazine.position, magazine.quaternion, magazine.scale);
          magazine.visible = true;
          rifleAssembly.add(magazine);
          sourceMagazine.visible = false;
          rifleAssembly.userData.detachableMagazine = magazine;
        }
      }
      if (targetLength > 1.5) {
        const attachments = new THREE.Group();
        attachments.position.z = zOffset;
        const metal = new THREE.MeshStandardMaterial({ color: 0x202522, metalness: 0.82, roughness: 0.34 });
        const polymer = new THREE.MeshStandardMaterial({ color: 0x171b19, roughness: 0.82 });
        const lens = new THREE.MeshStandardMaterial({ color: 0x537b79, emissive: 0x142b2b, emissiveIntensity: 0.22, metalness: 0.34, roughness: 0.2, transparent: true, opacity: 0.76, side: THREE.DoubleSide });
        const reticle = new THREE.MeshBasicMaterial({ color: 0xff4438, toneMapped: false });
        const opticAssembly = new THREE.Group();
        opticAssembly.position.set(0, 0.09, 0.08);
        attachments.add(opticAssembly);
        const accessory = (geometry, material, position, rotation = [0, 0, 0], parent = attachments) => {
          const mesh = new THREE.Mesh(geometry, material);
          mesh.position.set(...position);
          mesh.rotation.set(...rotation);
          mesh.castShadow = false;
          mesh.receiveShadow = false;
          parent.add(mesh);
          return mesh;
        };
        const tube = (radius, length, z) => accessory(
          new THREE.CylinderGeometry(radius, radius, length, 20), metal, [0, 0.225, z], [Math.PI / 2, 0, 0], opticAssembly,
        );

        // Compact magnified optic with an objective bell, eyepiece, lenses and adjustment turrets.
        accessory(new THREE.BoxGeometry(0.13, 0.045, 0.19), metal, [0, 0.14, 0.025], [0, 0, 0], opticAssembly);
        accessory(new THREE.BoxGeometry(0.08, 0.035, 0.1), polymer, [0, 0.18, 0.025], [0, 0, 0], opticAssembly);
        tube(0.045, 0.24, 0.015);
        tube(0.062, 0.075, -0.14);
        tube(0.054, 0.07, 0.155);
        accessory(new THREE.TorusGeometry(0.061, 0.008, 8, 24), metal, [0, 0.225, -0.176], [0, 0, 0], opticAssembly);
        accessory(new THREE.TorusGeometry(0.053, 0.007, 8, 24), metal, [0, 0.225, 0.192], [0, 0, 0], opticAssembly);
        accessory(new THREE.CylinderGeometry(0.047, 0.047, 0.006, 24), lens, [0, 0.225, 0.198], [Math.PI / 2, 0, 0], opticAssembly);
        accessory(new THREE.CircleGeometry(0.008, 12), reticle, [0, 0.225, 0.202], [0, 0, 0], opticAssembly);
        accessory(new THREE.CylinderGeometry(0.026, 0.026, 0.045, 16), metal, [0, 0.272, 0.015], [0, 0, 0], opticAssembly);
        accessory(new THREE.CylinderGeometry(0.023, 0.023, 0.04, 16), metal, [0.07, 0.225, 0.015], [0, 0, Math.PI / 2], opticAssembly);

        // Hand stop, angled foregrip and a compact side-mounted weapon light.
        accessory(new THREE.BoxGeometry(0.14, 0.04, 0.2), metal, [0, -0.085, -0.37]);
        accessory(new THREE.CylinderGeometry(0.031, 0.038, 0.17, 12), polymer, [0, -0.17, -0.39], [-0.26, 0, 0]);
        accessory(new THREE.BoxGeometry(0.075, 0.055, 0.2), metal, [0.15, 0.015, -0.41]);
        accessory(new THREE.CylinderGeometry(0.036, 0.036, 0.19, 16), polymer, [0.15, 0.025, -0.43], [Math.PI / 2, 0, 0]);
        accessory(new THREE.CylinderGeometry(0.03, 0.03, 0.006, 16), lens, [0.15, 0.025, -0.529], [Math.PI / 2, 0, 0]);
        rifleAssembly.add(attachments);
      }
      return rifleAssembly;
    };
    const attachDetailedRifle = (enemy) => {
      if (!rifleTemplate || !enemy.userData.gun || enemy.userData.detailedRifleLoaded || enemy.userData.loadout === "ak47") return;
      const detailed = makeDetailedRifle(0.95, -0.28);
      if (!detailed) return;
      enemy.userData.gun.traverse((part) => { if (part.isMesh) part.visible = false; });
      enemy.userData.gun.add(detailed);
      enemy.userData.detailedRifle = detailed;
      enemy.userData.detailedRifleLoaded = true;
    };
    let ak47Template = null;
    const buildAK47Template = () => {
      if (ak47Template) return ak47Template;
      const model = new THREE.Group();
      const steel = enemyMaterials.rifle;
      const darkSteel = enemyMaterials.dark;
      const wood = enemyMaterials.akWood;
      const woodEdge = enemyMaterials.akWoodEdge;
      const matrix = new THREE.Matrix4();
      const offset = new THREE.Vector3();
      const scale = new THREE.Vector3(1, 1, 1);
      const euler = new THREE.Euler();
      const quaternion = new THREE.Quaternion();
      const partSet = () => new Map();
      const addPart = (parts, geometry, material, position, rotation = [0, 0, 0]) => {
        const transformed = geometry.clone();
        offset.set(...position);
        euler.set(...rotation);
        matrix.compose(offset, quaternion.setFromEuler(euler), scale);
        transformed.applyMatrix4(matrix);
        const materialParts = parts.get(material) || [];
        materialParts.push(transformed);
        parts.set(material, materialParts);
      };
      const finishParts = (parent, parts) => {
        for (const [material, geometries] of parts) {
          const merged = geometries.length === 1 ? geometries[0] : mergeGeometries(geometries, false);
          if (!merged) {
            geometries.forEach((geometry) => {
              const mesh = new THREE.Mesh(geometry, material);
              mesh.castShadow = false;
              mesh.receiveShadow = false;
              mesh.userData.sharedAsset = true;
              parent.add(mesh);
            });
            continue;
          }
          if (merged !== geometries[0]) geometries.forEach((geometry) => geometry.dispose());
          merged.computeBoundingSphere();
          const mesh = new THREE.Mesh(merged, material);
          mesh.castShadow = false;
          mesh.receiveShadow = false;
          mesh.userData.sharedAsset = true;
          parent.add(mesh);
        }
      };
      const mainParts = partSet();

      // Stamped receiver, wooden furniture, steel barrel and front sight.
      addPart(mainParts, new RoundedBoxGeometry(0.15, 0.14, 0.34, 4, 0.018), steel, [0, 0, -0.08]);
      addPart(mainParts, new RoundedBoxGeometry(0.142, 0.046, 0.31, 4, 0.012), darkSteel, [0, 0.085, -0.09]);
      addPart(mainParts, new RoundedBoxGeometry(0.13, 0.115, 0.33, 4, 0.022), wood, [0, -0.005, -0.37]);
      addPart(mainParts, new RoundedBoxGeometry(0.105, 0.052, 0.29, 4, 0.016), woodEdge, [0, 0.09, -0.365]);
      addPart(mainParts, new RoundedBoxGeometry(0.115, 0.115, 0.34, 4, 0.018), wood, [0, -0.025, 0.245], [0.025, 0, 0]);
      addPart(mainParts, new RoundedBoxGeometry(0.125, 0.12, 0.055, 4, 0.012), darkSteel, [0, -0.025, 0.42]);
      addPart(mainParts, new RoundedBoxGeometry(0.075, 0.2, 0.095, 4, 0.012), wood, [0, -0.155, 0.035], [-0.22, 0, 0]);
      addPart(mainParts, new RoundedBoxGeometry(0.065, 0.05, 0.09, 3, 0.008), darkSteel, [0, -0.055, 0.005]);
      addPart(mainParts, new THREE.CylinderGeometry(0.025, 0.027, 0.67, 12), darkSteel, [0, 0.01, -0.66], [Math.PI / 2, 0, 0]);
      addPart(mainParts, new THREE.CylinderGeometry(0.043, 0.046, 0.12, 12), steel, [0, 0.01, -1.045], [Math.PI / 2, 0, 0]);
      addPart(mainParts, new RoundedBoxGeometry(0.1, 0.07, 0.065, 3, 0.01), steel, [0, 0.075, -0.73]);
      addPart(mainParts, new RoundedBoxGeometry(0.035, 0.18, 0.045, 3, 0.008), darkSteel, [0, 0.105, -0.91]);
      addPart(mainParts, new RoundedBoxGeometry(0.05, 0.045, 0.055, 3, 0.008), steel, [0, 0.105, -0.13]);
      finishParts(model, mainParts);

      const magazine = new THREE.Group();
      magazine.name = "ak47-magazine";
      const magazineParts = partSet();
      const magazineShape = new THREE.Shape();
      magazineShape.moveTo(-0.055, 0.015);
      magazineShape.lineTo(0.055, 0.015);
      magazineShape.lineTo(0.064, -0.12);
      magazineShape.quadraticCurveTo(0.075, -0.23, 0.14, -0.315);
      magazineShape.lineTo(0.068, -0.33);
      magazineShape.quadraticCurveTo(-0.01, -0.245, -0.025, -0.12);
      magazineShape.closePath();
      const curvedMagazine = new THREE.ExtrudeGeometry(magazineShape, {
        depth: 0.098, bevelEnabled: true, bevelSegments: 2, bevelSize: 0.006, bevelThickness: 0.008,
      });
      curvedMagazine.rotateY(Math.PI / 2);
      addPart(magazineParts, curvedMagazine, darkSteel, [-0.049, -0.095, -0.025]);
      addPart(magazineParts, new RoundedBoxGeometry(0.108, 0.025, 0.09, 3, 0.006), steel, [0, -0.405, -0.135]);
      addPart(magazineParts, new RoundedBoxGeometry(0.022, 0.045, 0.08, 3, 0.006), darkSteel, [0.077, -0.15, -0.08]);
      finishParts(magazine, magazineParts);
      model.add(magazine);
      model.userData.detachableMagazine = magazine;
      ak47Template = model;
      return model;
    };
    const cloneAK47 = (enemy = null) => {
      const model = buildAK47Template().clone(true);
      model.userData.detachableMagazine = model.getObjectByName("ak47-magazine");
      model.traverse((part) => {
        if (!part.isMesh) return;
        part.castShadow = false;
        part.receiveShadow = false;
        part.userData.sharedAsset = true;
        if (enemy) {
          part.userData.enemyRoot = enemy;
          part.userData.bodyPart = "body";
        }
      });
      return model;
    };
    const attachEnemyAK47 = (enemy) => {
      const gun = enemy.userData.gun;
      if (!gun || enemy.userData.ak47Loaded) return;
      gun.traverse((part) => { if (part.isMesh) part.visible = false; });
      const ak47 = cloneAK47(enemy);
      ak47.scale.setScalar(0.62);
      gun.add(ak47);
      gun.userData.weaponClass = "ak47";
      enemy.userData.ak47Model = ak47;
      enemy.userData.ak47Loaded = true;
    };
    const setSoldierLoadout = (soldier, weapon) => {
      const loadout = weapon === "ak47" ? "ak47" : "m4";
      if (loadout === "ak47" && !soldier.userData.ak47Loaded) attachEnemyAK47(soldier);
      soldier.userData.loadout = loadout;
      const gun = soldier.userData.gun;
      if (!gun) return;
      const akModel = soldier.userData.ak47Model;
      const detailedRifle = soldier.userData.detailedRifle;
      for (const child of gun.children) {
        if (child === akModel) child.visible = loadout === "ak47";
        else if (child === detailedRifle) child.visible = loadout !== "ak47";
        else child.visible = loadout !== "ak47" && !detailedRifle;
      }
    };
    const attachImportedSoldier = (enemy) => {
      if (!soldierTemplate || enemy.userData.modelLoaded) return;
      const model = cloneSkinnedScene(soldierTemplate.scene);
      model.traverse((part) => {
        if (!part.isMesh) return;
        part.castShadow = false;
        part.receiveShadow = false;
        part.userData.enemyRoot = enemy;
        part.userData.bodyPart = "body";
        part.userData.sharedAsset = true;
        part.material = enemyMaterials.skin;
      });
      const actor = new THREE.Group();
      actor.userData.sharedAsset = true;
      actor.add(model);
      const bones = Object.fromEntries([
        "pelvis", "spine_01", "spine_02", "spine_03", "head", "upperarm_l", "upperarm_r",
        "lowerarm_l", "lowerarm_r", "hand_l", "hand_r", "thigh_l", "thigh_r", "calf_l", "calf_r",
        "foot_l", "foot_r",
      ].map((name) => [name, model.getObjectByName(name)]));
      const isFriendly = Boolean(enemy.userData.isFriendly);
      const teamKey = isFriendly ? "friendly" : "hostile";
      const uniform = isFriendly ? enemyMaterials.friendlyUniform : enemyMaterials.uniform;
      const teamVest = isFriendly ? enemyMaterials.friendlyVest : enemyMaterials.vest;
      const teamStrap = isFriendly ? enemyMaterials.friendlyStrap : enemyMaterials.strap;
      const pouches = isFriendly ? enemyMaterials.friendlyPouch : enemyMaterials.pouch;
      const packBack = isFriendly ? enemyMaterials.friendlyVestBack : enemyMaterials.vestBack;
      const teamHelmet = isFriendly ? enemyMaterials.friendlyHelmet : enemyMaterials.helmet;
      const teamBoot = isFriendly ? enemyMaterials.friendlyBoot : enemyMaterials.boot;
      const teamPatch = isFriendly ? enemyMaterials.friendlyPatch : enemyMaterials.strap;
      const cachedWear = soldierWearGeometryCache.get(teamKey);
      const wearBatches = new Map();
      const attachedBatches = new Set();
      const sharedWearShapes = new Set(Object.values(bodyClothesGeometry));
      const wearParentKey = (parent) => parent.userData.soldierWearKey || parent.name;
      const carrier = new THREE.Group();
      carrier.name = "soldier-vest-carrier";
      carrier.userData.soldierWearKey = "carrier";
      carrier.position.set(0, 0.14, 0.015);
      bones.spine_02?.add(carrier);
      for (const [name, bone] of Object.entries(bones)) if (bone) bone.userData.soldierWearKey = name;
      const wear = (parent, geometry, material, position, rotation = [0, 0, 0]) => {
        if (!parent) return null;
        const parentKey = wearParentKey(parent);
        const batchKey = `${parentKey}:${material.uuid}`;
        if (cachedWear) {
          if (!attachedBatches.has(batchKey)) {
            attachedBatches.add(batchKey);
            for (const cachedGeometry of cachedWear.get(batchKey) || []) {
              const mesh = new THREE.Mesh(cachedGeometry, material);
              mesh.castShadow = false;
              mesh.receiveShadow = false;
              mesh.userData.sharedAsset = true;
              mesh.userData.enemyRoot = enemy;
              mesh.userData.bodyPart = "body";
              parent.add(mesh);
            }
          }
          if (!sharedWearShapes.has(geometry)) geometry.dispose();
          return null;
        }
        const geometryPart = geometry.clone();
        const transform = new THREE.Matrix4().compose(
          new THREE.Vector3(...position),
          new THREE.Quaternion().setFromEuler(new THREE.Euler(...rotation)),
          new THREE.Vector3(1, 1, 1),
        );
        geometryPart.applyMatrix4(transform);
        if (!sharedWearShapes.has(geometry)) geometry.dispose();
        const batch = wearBatches.get(batchKey) || { parent, material, geometries: [] };
        batch.geometries.push(geometryPart);
        wearBatches.set(batchKey, batch);
        return null;
      };
      wear(bones.pelvis, bodyClothesGeometry.torso, uniform, [0, 0.32, 0]);
      wear(carrier, bodyClothesGeometry.plate, teamVest, [0, 0.015, 0.025]);
      wear(carrier, bodyClothesGeometry.buckle, packBack, [0, -0.245, 0.11]);
      for (const side of [-1, 1]) {
        wear(carrier, new RoundedBoxGeometry(0.055, 0.39, 0.055, 3, 0.016), teamStrap,
          [side * 0.15, 0.015, 0.11], [0, 0, side * 0.17]);
      }
      for (const x of [-0.157, -0.052, 0.052, 0.157]) {
        wear(carrier, bodyClothesGeometry.pouch, pouches, [x, -0.135, 0.125]);
        wear(carrier, new RoundedBoxGeometry(0.084, 0.036, 0.016, 3, 0.007), teamStrap, [x, -0.075, 0.168]);
        wear(carrier, new RoundedBoxGeometry(0.012, 0.022, 0.012, 2, 0.004), enemyMaterials.metal, [x, -0.074, 0.18]);
      }
      wear(carrier, new RoundedBoxGeometry(0.13, 0.065, 0.018, 3, 0.01),
        teamPatch,
        [0, 0.155, 0.116]);
      wear(bones.pelvis, new RoundedBoxGeometry(0.43, 0.1, 0.28, 4, 0.025), packBack, [0, 0.03, 0.08]);
      wear(bones.pelvis, bodyClothesGeometry.pouch, pouches, [-0.225, 0.02, 0.09]);
      wear(bones.pelvis, bodyClothesGeometry.pouch, pouches, [0.225, 0.02, 0.09]);

      for (const side of [-1, 1]) {
        const upper = side < 0 ? bones.upperarm_l : bones.upperarm_r;
        const lower = side < 0 ? bones.lowerarm_l : bones.lowerarm_r;
        const thigh = side < 0 ? bones.thigh_l : bones.thigh_r;
        const calf = side < 0 ? bones.calf_l : bones.calf_r;
        const foot = side < 0 ? bones.foot_l : bones.foot_r;
        wear(upper, bodyClothesGeometry.arm, uniform, [0, 0.115, 0]);
        wear(lower, bodyClothesGeometry.forearm, uniform, [0, 0.125, 0]);
        wear(thigh, bodyClothesGeometry.thigh, uniform, [0, 0.195, 0]);
        wear(thigh, bodyClothesGeometry.knee, packBack, [0, 0.02, 0.085]);
        wear(calf, bodyClothesGeometry.calf, uniform, [0, 0.19, 0]);
        wear(foot, bodyClothesGeometry.boot, teamBoot, [0, -0.025, -0.055]);
      }
      wear(bones.head, bodyClothesGeometry.helmet, teamHelmet, [0, 0.085, 0.004]);
      wear(bones.head, new RoundedBoxGeometry(0.34, 0.035, 0.16, 3, 0.012), teamHelmet, [0, 0.015, 0]);
      for (const side of [-1, 1]) {
        wear(bones.head, new THREE.CylinderGeometry(0.052, 0.052, 0.052, 16), packBack,
          [side * 0.145, 0.01, 0.002], [0, 0, Math.PI / 2]);
      }

      if (!cachedWear) {
        const wearCache = new Map();
        for (const [batchKey, batch] of wearBatches) {
          const merged = batch.geometries.length === 1 ? batch.geometries[0] : mergeGeometries(batch.geometries, false);
          const parts = merged ? [merged] : batch.geometries;
          if (merged && merged !== batch.geometries[0]) batch.geometries.forEach((geometry) => geometry.dispose());
          wearCache.set(batchKey, parts);
          for (const geometry of parts) {
            geometry.computeBoundingSphere();
            const mesh = new THREE.Mesh(geometry, batch.material);
            mesh.castShadow = false;
            mesh.receiveShadow = false;
            mesh.userData.sharedAsset = true;
            mesh.userData.enemyRoot = enemy;
            mesh.userData.bodyPart = "body";
            batch.parent.add(mesh);
          }
        }
        soldierWearGeometryCache.set(teamKey, wearCache);
      }

      model.updateMatrixWorld(true);
      const modelBounds = new THREE.Box3().setFromObject(model);
      const modelHeight = Math.max(0.1, modelBounds.max.y - modelBounds.min.y);
      const actorScale = 1.82 / modelHeight;
      actor.scale.setScalar(actorScale);
      actor.position.y = -modelBounds.min.y * actorScale;
      actor.rotation.y = Math.PI;

      const headBone = bones.head;
      if (headBone) {
        const hitZone = new THREE.Mesh(
          new THREE.SphereGeometry(0.13, 14, 12),
          new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, colorWrite: false, depthWrite: false }),
        );
        hitZone.position.set(0, 0.045, -0.015);
        hitZone.userData.enemyRoot = enemy;
        hitZone.userData.bodyPart = "head";
        headBone.add(hitZone);
      }

      enemy.children.slice().forEach((child) => {
        if (child === enemy.userData.gun || child.userData.keepRemoteMarker) return;
        enemy.remove(child);
        child.traverse((part) => { if (part.geometry) part.geometry.dispose(); });
      });
      enemy.add(actor);
      enemy.userData.limbs = [];
      enemy.userData.actor = actor;
      enemy.userData.rigBones = bones;
      enemy.userData.restPose = Object.fromEntries(Object.entries(bones).filter(([, bone]) => bone).map(([name, bone]) => [name, bone.quaternion.clone()]));
      enemy.userData.restPoseEntries = Object.entries(enemy.userData.restPose);
      enemy.userData.mixer = null;
      enemy.userData.actions = {};
      enemy.userData.motion = "idle";
      enemy.userData.modelLoaded = true;
      attachDetailedRifle(enemy);
    };

    const soldierLoader = new GLTFLoader();
    soldierLoader.load("/assets/fps/human-soldier-base.glb", (gltf) => {
      if (disposed) return;
      soldierTemplate = gltf;
      enemies.forEach(attachImportedSoldier);
      remotePlayers.forEach(attachImportedSoldier);
      squadBots.forEach(attachImportedSoldier);
    });

    const rifleLoader = new FBXLoader();
    rifleLoader.load("/assets/fps/m4a1-source/M4A1/M4A1.fbx", (model) => {
      if (disposed) return;
      const textures = new THREE.TextureLoader();
      const loadMap = (filename, colorSpace = THREE.NoColorSpace) => {
        const map = textures.load(`/assets/fps/m4a1-source/M4A1/${filename}`);
        map.colorSpace = colorSpace;
        return map;
      };
      const maps = {
        map: loadMap("M4A1_Base_Color.png", THREE.SRGBColorSpace),
        normalMap: loadMap("M4A1_Normal.png"),
        metalnessMap: loadMap("M4A1_Metallic.png"),
        roughnessMap: loadMap("M4A1_Roughness.png"),
      };
      model.traverse((part) => {
        if (!part.isMesh) return;
        const materials = Array.isArray(part.material) ? part.material : [part.material];
        materials.forEach((material) => {
          Object.assign(material, maps, { metalness: 0.72, roughness: 0.5 });
          material.needsUpdate = true;
        });
      });
      rifleTemplate = model;
      const detailedViewModel = makeDetailedRifle(2, -0.43);
      if (detailedViewModel) {
        rifleFallbackModel.visible = false;
        rifleModel.add(detailedViewModel);
        if (detailedViewModel.userData.detachableMagazine) {
          m4MagazineMesh = detailedViewModel.userData.detachableMagazine;
          m4MagazineHome = m4MagazineMesh.position.clone();
        }
      }
      enemies.forEach(attachDetailedRifle);
      remotePlayers.forEach(attachDetailedRifle);
      squadBots.forEach(attachDetailedRifle);
    });

    const setEnemyMotion = (enemy, motion) => {
      if (enemy.userData.motion === motion) return;
      enemy.userData.motion = motion;
    };

    const poseRiggedSoldier = (enemy, elapsed, motion = "idle", phase = 0) => {
      const bones = enemy.userData.rigBones;
      const rest = enemy.userData.restPose;
      const restEntries = enemy.userData.restPoseEntries;
      if (!bones || !rest || !restEntries) return;
      const moving = motion === "run" ? 1 : motion === "walk" ? 0.45 : 0;
      const gait = elapsed * (motion === "run" ? 8.8 : 5.2) + phase;
      const swing = Math.sin(gait) * moving * 0.38;
      const apply = (name, x = 0, y = 0, z = 0) => {
        const bone = bones[name];
        if (!bone || !rest[name]) return;
        poseEuler.set(x, y, z);
        poseQuaternion.setFromEuler(poseEuler);
        bone.quaternion.copy(rest[name]).multiply(poseQuaternion);
      };
      for (const [name, base] of restEntries) if (bones[name]) bones[name].quaternion.copy(base);
      apply("upperarm_l", -0.42 - swing * 0.12, 0, 0.37);
      apply("upperarm_r", -0.42 + swing * 0.12, 0, -0.37);
      apply("lowerarm_l", -0.62, 0, -0.06);
      apply("lowerarm_r", -0.62, 0, 0.06);
      apply("thigh_l", swing, 0, 0);
      apply("thigh_r", -swing, 0, 0);
      apply("calf_l", Math.max(0, -swing) * 0.58, 0, 0);
      apply("calf_r", Math.max(0, swing) * 0.58, 0, 0);
      apply("spine_02", 0, 0, Math.sin(gait) * moving * 0.025);
    };

    const makeRemoteNameplate = (name) => {
      const canvas = document.createElement("canvas");
      canvas.width = 512; canvas.height = 112;
      const context = canvas.getContext("2d");
      context.fillStyle = "rgba(12, 28, 38, .84)";
      context.beginPath(); context.roundRect(12, 12, 488, 88, 18); context.fill();
      context.strokeStyle = "rgba(111, 202, 241, .86)"; context.lineWidth = 4; context.stroke();
      context.fillStyle = "#e3f5ff"; context.font = "600 40px Arial"; context.textAlign = "center";
      context.fillText(name.slice(0, 26), 256, 66);
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false });
      const label = new THREE.Sprite(material);
      label.scale.set(2.1, 0.46, 1);
      label.position.y = 2.32;
      return { label, material };
    };
    const squadSlots = [{ side: -4.8, forward: 1.8 }, { side: 4.8, forward: 1.8 }, { side: 0, forward: -6.4 }];
    const squadHomeFor = (index, origin = camera.position, yaw = camera.rotation.y) => {
      const forward = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw));
      const right = new THREE.Vector3(-forward.z, 0, forward.x);
      const slot = squadSlots[index];
      return origin.clone().addScaledVector(right, slot.side).addScaledVector(forward, slot.forward).setY(0);
    };
    for (const [index, callSign] of ["ECHO", "VEGA", "REYES"].entries()) {
      const home = squadHomeFor(index);
      const ally = makeSoldier(scene, enemyMaterials, [home.x, home.z], 100 + index);
      ally.userData.isFriendly = true;
      ally.userData.callSign = callSign;
      ally.userData.homePosition = home;
      ally.userData.desiredPosition = new THREE.Vector3();
      ally.userData.engageTargetId = null;
      ally.userData.allyFireAt = performance.now() + 1800 + index * 550;
      ally.userData.teamOffset = index;
      const { label, material } = makeRemoteNameplate(callSign);
      label.material.color.setHex(0x83d6ff);
      label.userData.keepRemoteMarker = true;
      ally.add(label);
      ally.userData.nameplate = material;
      const markerMaterial = new THREE.MeshBasicMaterial({ color: 0x69d6ff, emissive: 0x2683aa });
      const marker = new THREE.Mesh(new THREE.SphereGeometry(0.075, 8, 6), markerMaterial);
      marker.userData.keepRemoteMarker = true;
      marker.position.set(0, 2.15, 0);
      ally.add(marker);
      ally.userData.markerMaterial = markerMaterial;
      ally.traverse((part) => {
        if (!part.isMesh || part.userData.sharedAsset || part.userData.bodyPart !== "body") return;
        const material = part.material.clone();
        material.color.lerp(new THREE.Color(0x1d779a), 0.34);
        part.material = material;
      });
      squadBots.push(ally);
      if (soldierTemplate) attachImportedSoldier(ally);
    }
    const addRemotePlayer = (state) => {
      const numericId = [...state.id].reduce((value, char) => (value * 31 + char.charCodeAt(0)) >>> 0, 0);
      const remote = makeSoldier(scene, enemyMaterials, [state.x, state.z], numericId);
      remote.userData.isFriendly = true;
      setSoldierLoadout(remote, state.weapon);
      remote.userData.targetPosition = new THREE.Vector3(state.x, state.parachute ? state.y || 0 : 0, state.z);
      remote.userData.targetYaw = state.yaw;
      remote.userData.targetMoving = false;
      remote.userData.health = state.health;
      remote.userData.remoteId = state.id;
      const { label, material } = makeRemoteNameplate(state.name || "ALLY");
      label.userData.keepRemoteMarker = true;
      remote.add(label);
      remote.userData.nameplate = material;
      const markerMaterial = new THREE.MeshBasicMaterial({ color: 0x77d6ff, emissive: 0x2683aa });
      const marker = new THREE.Mesh(new THREE.SphereGeometry(0.075, 8, 6), markerMaterial);
      marker.userData.keepRemoteMarker = true;
      marker.position.set(0, 2.15, 0);
      remote.add(marker);
      remote.userData.markerMaterial = markerMaterial;
      remote.userData.targetVehicleY = 0;
      remotePlayers.set(state.id, remote);
      if (soldierTemplate) attachImportedSoldier(remote);
      return remote;
    };
    const removeRemotePlayer = (id) => {
      const remote = remotePlayers.get(id);
      if (!remote) return;
      remote.userData.mixer?.stopAllAction();
      remote.userData.remoteVehicle?.removeFromParent();
      remote.userData.remoteParachute?.removeFromParent();
      remote.removeFromParent();
      remote.traverse((part) => {
        if (!part.isMesh && !part.isSprite) return;
        if (part.geometry && !part.userData.sharedAsset) part.geometry.dispose();
        if (part.userData.ownsMaterial) {
          const materials = Array.isArray(part.material) ? part.material : [part.material];
          materials.forEach((material) => material.dispose());
        }
      });
      remote.userData.nameplate?.map?.dispose();
      remote.userData.nameplate?.dispose();
      remote.userData.markerMaterial?.dispose();
      remotePlayers.delete(id);
    };
    let networkSocket = null;
    let localNetworkId = "";
    let localSpawnX = 0;
    let localSpawnZ = 14.5;
    let connectedPlayerCount = 1;
    let lastTeamHudCount = 1;
    let sharedProgress = 0;
    let sharedMissionComplete = false;
    let collectedIntel = 0;
    let defenseProgress = 0;
    let lastNetworkSync = 0;
    let lastDefenseProgressAt = 0;
    const syncRemotePlayers = (states) => {
      const visibleIds = new Set();
      for (const state of states || []) {
        if (!state?.id || state.id === localNetworkId) continue;
        visibleIds.add(state.id);
        const remote = remotePlayers.get(state.id) || addRemotePlayer(state);
        setSoldierLoadout(remote, state.weapon);
        remote.userData.targetPosition.set(state.x, state.parachute ? state.y || 0 : 0, state.z);
        remote.userData.targetVehicleY = state.vehicle === "helicopter" ? state.y || 0 : 0;
        remote.userData.targetYaw = state.yaw;
        remote.userData.targetMoving = state.moving;
        remote.userData.health = state.health;
        const vehicleTemplate = state.vehicle === "apc" ? apc : state.vehicle === "helicopter" ? helicopter : null;
        if (vehicleTemplate) {
          remote.userData.remoteParachute?.removeFromParent();
          remote.userData.remoteParachute = null;
          if (remote.userData.remoteVehicle?.userData.kind !== state.vehicle) {
            remote.userData.remoteVehicle?.removeFromParent();
            const model = vehicleTemplate.clone(true);
            model.userData.kind = state.vehicle;
            model.name = `remote-${state.vehicle}-${state.id}`;
            scene.add(model);
            remote.userData.remoteVehicle = model;
          }
          remote.visible = false;
        } else {
          remote.userData.remoteVehicle?.removeFromParent();
          remote.userData.remoteVehicle = null;
          remote.visible = true;
          if (state.parachute) {
            if (!remote.userData.remoteParachute) {
              remote.userData.remoteParachute = parachuteTemplate.clone(true);
              remote.userData.remoteParachute.visible = true;
              scene.add(remote.userData.remoteParachute);
            }
          } else {
            remote.userData.remoteParachute?.removeFromParent();
            remote.userData.remoteParachute = null;
          }
        }
        setEnemyMotion(remote, state.moving ? "run" : "idle");
      }
      for (const id of remotePlayers.keys()) if (!visibleIds.has(id)) removeRemotePlayer(id);
    };
    const socketProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    networkSocket = new WebSocket(`${socketProtocol}//${window.location.host}/multiplayer`);
    networkSocket.addEventListener("open", () => {
      networkSocket.send(JSON.stringify({ type: "join", mapId: activeMap.id, missionId: selectedMissionMeta.id }));
      setNetworkStatus("MATCHMAKING");
    });
    networkSocket.addEventListener("message", (event) => {
      let packet;
      try { packet = JSON.parse(event.data); } catch { return; }
      if (packet.type === "full") { setNetworkStatus("ROOM FULL"); return; }
      if (packet.type === "joined") {
        localNetworkId = packet.id;
        localSpawnX = packet.spawn?.[0] ?? 0;
        localSpawnZ = packet.spawn?.[1] ?? 14.5;
        camera.position.set(localSpawnX, PLAYER_EYE_HEIGHT, localSpawnZ);
        squadBots.forEach((ally, index) => {
          ally.userData.homePosition.copy(squadHomeFor(index));
          ally.position.copy(ally.userData.homePosition);
        });
        sharedProgress = packet.progress || 0;
        sharedMissionComplete = Boolean(packet.completed);
        const collected = new Set(packet.items || []);
        for (const pickup of intelPickups) { pickup.collected = collected.has(pickup.id); pickup.group.visible = !pickup.collected; }
        syncRemotePlayers(packet.players);
        connectedPlayerCount = (packet.players?.length || 0) + 1;
        lastTeamHudCount = connectedPlayerCount;
        setNetworkStatus("ONLINE CO-OP");
        publishHud();
      }
      if (packet.type === "players") {
        const previousProgress = sharedProgress;
        connectedPlayerCount = packet.count || 1;
        sharedProgress = packet.progress || 0;
        sharedMissionComplete = Boolean(packet.completed);
        if (selectedMissionMeta.id === "intel") {
          const collected = new Set(packet.items || []);
          for (const pickup of intelPickups) { pickup.collected = collected.has(pickup.id); pickup.group.visible = !pickup.collected; }
          collectedIntel = collected.size;
        }
        syncRemotePlayers(packet.players);
        if (sharedMissionComplete && phaseValue === "playing") endRound("complete");
        if (connectedPlayerCount !== lastTeamHudCount || sharedProgress !== previousProgress) { lastTeamHudCount = connectedPlayerCount; publishHud(); }
      }
      if (packet.type === "join") { setNotice(`${packet.player?.name || "Operator"} joined the operation.`); window.setTimeout(() => setNotice(""), 2400); }
      if (packet.type === "leave") { setNotice("An operator left the operation."); window.setTimeout(() => setNotice(""), 2400); }
    });
    networkSocket.addEventListener("close", () => { if (!disposed) setNetworkStatus("SERVER DISCONNECTED"); });
    networkSocket.addEventListener("error", () => { if (!disposed) setNetworkStatus("SERVER DISCONNECTED"); });
    const reportObjective = (action, eventId, item) => {
      if (networkSocket?.readyState === WebSocket.OPEN) networkSocket.send(JSON.stringify({ type: "objective", action, eventId, item }));
    };

    let spawned = 0;
    let kills = 0;
    let shots = 0;
    let hits = 0;
    let score = 0;
    let weaponMode = "m4";
    let ammo = MAG_SIZE;
    let rifleAmmo = MAG_SIZE;
    let pistolAmmo = 17;
    let akAmmo = AK_MAG_SIZE;
    let hasAk47 = false;
    let health = 100;
    let stamina = 100;
    let elapsedSeconds = 0;
    let remainingSeconds = selectedMissionMeta.seconds;
    let roundStartedAt = 0;
    let phaseValue = "ready";
    let pointerLocked = false;
    let reloading = false;
    const ammoBoxUsed = new Set();
    let mouseHeld = false;
    let aimingNow = false;
    let recoil = 0;
    let pitch = 0;
    let recoilRoll = 0;
    let nextShotAt = 0;
    let reloadTimeout = null;
    let supplyToastTimeout = null;
    let spawnTimeouts = [];
    let lastHudUpdate = 0;
    let staminaRefillDelay = 0;
    let feetBounce = 0;
    let jumpVelocity = 0;
    let activeVehicle = null;
    let vehicleSpeed = 0;
    let helicopterForwardSpeed = 0;
    let rotorSpeed = 0;
    let parachuteActive = false;
    let nextCannonShotAt = 0;
    let cannonAmmo = CANNON_MAG_SIZE;
    let cannonReserve = CANNON_MAG_SIZE * 3;
    let cannonReloading = false;
    let cannonReloadTimeout = null;
    const effectsTexture = radialTexture;
    let audioContext = null;
    let noiseBuffer = null;
    const audioBuffers = {};
    const audioLoads = {};
    const baseWeapon = new THREE.Group();
    const rifleModel = new THREE.Group();
    const rifleFallbackModel = new THREE.Group();
    rifleModel.add(rifleFallbackModel);
    const pistolModel = new THREE.Group();
    const armsModel = new THREE.Group();
    baseWeapon.add(rifleModel, pistolModel, armsModel);
    pistolModel.visible = false;
    const weaponMaterials = {
      receiver: new THREE.MeshStandardMaterial({ color: 0x46514c, emissive: 0x111613, emissiveIntensity: 0.45, metalness: 0.78, roughness: 0.34 }),
      dark: new THREE.MeshStandardMaterial({ color: 0x202725, emissive: 0x080b0a, emissiveIntensity: 0.45, metalness: 0.64, roughness: 0.42 }),
      polymer: new THREE.MeshStandardMaterial({ color: 0x373e38, roughness: 0.82 }),
      olive: new THREE.MeshStandardMaterial({ color: 0x66634d, roughness: 0.79 }),
      optic: new THREE.MeshStandardMaterial({ color: 0x141b1c, metalness: 0.5, roughness: 0.2 }),
      opticGlass: new THREE.MeshStandardMaterial({ color: 0x71d6d1, emissive: 0x208b85, emissiveIntensity: 0.5, metalness: 0.25, roughness: 0.12 }),
      glove: new THREE.MeshStandardMaterial({ color: 0x353e38, roughness: 0.95 }),
      skin: enemyMaterials.skin,
      nail: new THREE.MeshStandardMaterial({ color: 0xa98270, roughness: 0.66 }),
      sleeve: new THREE.MeshStandardMaterial({ color: 0x68715f, roughness: 0.98 }),
      flash: new THREE.MeshBasicMaterial({ color: 0xffd39a, transparent: true, opacity: 0.94, blending: THREE.AdditiveBlending, depthWrite: false }),
      flashOuter: new THREE.MeshBasicMaterial({ color: 0xff772e, transparent: true, opacity: 0.72, blending: THREE.AdditiveBlending, depthWrite: false }),
    };
    const addWeapon = (geo, material, pos, rotation) => addMesh(rifleFallbackModel, geo, material, pos, { rotation, castShadow: false, receiveShadow: false });
    const addArms = (geo, material, pos, rotation, parent = armsModel) => addMesh(parent, geo, material, pos, { rotation, castShadow: false, receiveShadow: false });
    addWeapon(new THREE.BoxGeometry(0.24, 0.2, 0.63), weaponMaterials.receiver, [0.02, 0, -0.13]);
    addWeapon(new THREE.BoxGeometry(0.19, 0.11, 0.45), weaponMaterials.dark, [0.02, 0.14, -0.18]);
    addWeapon(new THREE.BoxGeometry(0.19, 0.23, 0.42), weaponMaterials.polymer, [0.02, -0.02, 0.36], [0, 0.05, 0]);
    addWeapon(new THREE.BoxGeometry(0.14, 0.22, 0.17), weaponMaterials.dark, [0.04, -0.18, 0.02], [-0.21, 0, 0]);
    addWeapon(new THREE.BoxGeometry(0.17, 0.25, 0.38), weaponMaterials.polymer, [0.18, -0.14, -0.22], [0.18, 0, -0.16]);
    addWeapon(new THREE.BoxGeometry(0.1, 0.25, 0.1), weaponMaterials.olive, [0.2, -0.04, -0.18]);
    const fallbackMagazine = new THREE.Group();
    rifleFallbackModel.add(fallbackMagazine);
    addMesh(fallbackMagazine, new THREE.BoxGeometry(0.18, 0.4, 0.18), weaponMaterials.polymer, [0.03, -0.31, -0.15], { rotation: [0.11, 0, 0], castShadow: false, receiveShadow: false });
    addMesh(fallbackMagazine, new THREE.BoxGeometry(0.2, 0.045, 0.2), weaponMaterials.dark, [0.03, -0.52, -0.18], { rotation: [0.11, 0, 0], castShadow: false, receiveShadow: false });
    addWeapon(new THREE.CylinderGeometry(0.055, 0.06, 0.76, 12), weaponMaterials.dark, [0.02, 0.04, -0.73], [Math.PI / 2, 0, 0]);
    addWeapon(new THREE.CylinderGeometry(0.085, 0.085, 0.18, 12), weaponMaterials.receiver, [0.02, 0.04, -1.13], [Math.PI / 2, 0, 0]);
    addWeapon(new THREE.CylinderGeometry(0.045, 0.045, 0.19, 10), weaponMaterials.dark, [0.02, 0.04, -1.32], [Math.PI / 2, 0, 0]);
    addWeapon(new THREE.BoxGeometry(0.34, 0.055, 0.48), weaponMaterials.dark, [0.02, 0.17, -0.4]);
    for (let rail = 0; rail < 4; rail += 1) addWeapon(new THREE.BoxGeometry(0.28, 0.023, 0.035), weaponMaterials.receiver, [0.02, 0.207, -0.22 - rail * 0.09]);
    addWeapon(new THREE.BoxGeometry(0.1, 0.19, 0.1), weaponMaterials.dark, [0.02, 0.3, -0.91]);
    addWeapon(new THREE.BoxGeometry(0.1, 0.025, 0.13), weaponMaterials.dark, [0.02, 0.405, -0.91]);
    for (let vent = 0; vent < 6; vent += 1) addWeapon(new THREE.BoxGeometry(0.012, 0.055, 0.035), weaponMaterials.dark, [0.143, 0.015, -0.25 - vent * 0.085]);
    addWeapon(new THREE.BoxGeometry(0.08, 0.13, 0.13), weaponMaterials.optic, [0.02, 0.29, -0.35]);
    addWeapon(new THREE.BoxGeometry(0.065, 0.07, 0.035), weaponMaterials.opticGlass, [0.02, 0.31, -0.41]);
    addWeapon(new THREE.BoxGeometry(0.08, 0.025, 0.06), weaponMaterials.dark, [0.02, 0.39, -0.35]);
    // Small M4A1 details: ejection port, bolt, selector and front sight block.
    addWeapon(new THREE.BoxGeometry(0.018, 0.075, 0.16), weaponMaterials.dark, [0.139, 0.015, -0.1]);
    addWeapon(new THREE.BoxGeometry(0.012, 0.035, 0.105), weaponMaterials.receiver, [0.151, 0.017, -0.1]);
    addWeapon(new THREE.CylinderGeometry(0.027, 0.027, 0.055, 8), weaponMaterials.dark, [0.02, 0.105, -0.93]);
    addWeapon(new THREE.BoxGeometry(0.055, 0.13, 0.035), weaponMaterials.receiver, [0.02, 0.18, -0.91]);
    addWeapon(new THREE.BoxGeometry(0.016, 0.095, 0.025), weaponMaterials.dark, [0.02, 0.25, -0.91]);
    addWeapon(new THREE.TorusGeometry(0.064, 0.009, 5, 14), weaponMaterials.receiver, [0.02, 0.04, -1.02]);
    addWeapon(new THREE.TorusGeometry(0.064, 0.009, 5, 14), weaponMaterials.receiver, [0.02, 0.04, -1.1]);
    addWeapon(new THREE.BoxGeometry(0.035, 0.07, 0.08), weaponMaterials.dark, [0.15, -0.02, -0.04]);
    addArms(new THREE.CylinderGeometry(0.09, 0.07, 0.18, 10), weaponMaterials.glove, [-0.01, -0.09, -0.48], [Math.PI / 2, 0, 0]);
    const supportArm = new THREE.Group();
    const firingArm = new THREE.Group();
    armsModel.add(supportArm, firingArm);
    const supportSleeve = addArms(new THREE.CapsuleGeometry(0.103, 0.35, 8, 18), enemyMaterials.uniform, [-0.02, -0.24, 0.47], [-0.1, 0, 0.12], supportArm);
    supportSleeve.scale.set(1.34, 1.16, 1.08);
    const firingSleeve = addArms(new THREE.CapsuleGeometry(0.103, 0.34, 8, 18), enemyMaterials.uniform, [0.28, -0.29, -0.28], [-0.1, 0, -0.22], firingArm);
    firingSleeve.scale.set(1.3, 1.12, 1.08);
    const makeHumanGripHand = (armGroup, handPosition) => {
      const hand = new THREE.Group();
      hand.position.set(...handPosition);
      hand.rotation.set(0.28, -0.06, 0.03);
      armGroup.add(hand);
      const skin = weaponMaterials.skin;
      const palm = addArms(new THREE.SphereGeometry(1, 20, 14), skin, [0, 0, 0], undefined, hand);
      palm.scale.set(0.078, 0.049, 0.103);
      const wrist = addArms(new THREE.CapsuleGeometry(0.045, 0.075, 6, 12), skin, [0, -0.002, 0.075], [-Math.PI / 2, 0, 0], hand);
      wrist.scale.set(1, 0.9, 1.08);
      hand.userData.fingerGroups = [];

      for (let finger = 0; finger < 4; finger += 1) {
        const x = (finger - 1.5) * 0.036;
        const length = [0.079, 0.092, 0.087, 0.071][finger];
        const width = [0.014, 0.015, 0.014, 0.012][finger];
        const digit = new THREE.Group();
        digit.position.set(x, 0, -0.032);
        // Keep the index finger slightly forward for the trigger; curl the
        // remaining fingers around the grip/handguard.
        digit.userData.homeFlex = finger === 3 ? 0.62 : 0.92 + (finger === 0 ? 0.08 : 0);
        hand.add(digit);
        hand.userData.fingerGroups.push(digit);
        const proximal = addArms(new THREE.CapsuleGeometry(width, length * 0.53, 6, 12), skin,
          [0, -0.004, -0.029], [-1.46, 0, (finger - 1.5) * 0.045], digit);
        proximal.scale.set(1, 0.88, 1);
        addArms(new THREE.SphereGeometry(width * 0.96, 12, 8), skin,
          [0, 0, -0.062], undefined, digit);
        addArms(new THREE.CapsuleGeometry(width * 0.82, length * 0.34, 6, 12), skin,
          [(finger - 1.5) * 0.003, 0.004, -0.081], [-1.24, 0, (finger - 1.5) * 0.075], digit);
        addArms(new RoundedBoxGeometry(width * 1.1, 0.0045, 0.018, 3, 0.002), weaponMaterials.nail,
          [0, 0.016, -0.092], undefined, digit);
      }
      const thumb = new THREE.Group();
      thumb.position.set(0.06, -0.005, -0.005);
      thumb.rotation.set(-0.48, -0.1, -0.73);
      hand.add(thumb);
      hand.userData.thumb = thumb;
      hand.userData.thumbHomeRotation = thumb.rotation.clone();
      addArms(new THREE.CapsuleGeometry(0.018, 0.065, 6, 12), skin, [0.005, 0, -0.035], [-1.18, 0, -0.12], thumb);
      addArms(new THREE.SphereGeometry(0.018, 14, 10), skin, [0.008, 0, -0.069], undefined, thumb);
      addArms(new THREE.CapsuleGeometry(0.015, 0.045, 6, 12), skin, [0, 0.002, -0.084], [-1.04, 0, 0.12], thumb);
      return hand;
    };
    const supportHand = makeHumanGripHand(supportArm, [-0.01, -0.12, 0.14]);
    const firingHand = makeHumanGripHand(firingArm, [0.23, -0.14, -0.34]);
    const alignSleeveToHand = (sleeve, handOffset) => {
      const direction = handOffset.clone();
      const reach = direction.length();
      sleeve.position.copy(handOffset).multiplyScalar(0.48);
      sleeve.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
      sleeve.scale.set(1.18, reach / 0.556, 1.08);
    };
    const supportArmHome = new THREE.Vector3(-0.32, -0.4, 0.14);
    const supportHandRiflePosition = new THREE.Vector3(0.34, 0.38, -0.53);
    supportArm.position.copy(supportArmHome);
    supportHand.position.copy(supportHandRiflePosition);
    supportHand.rotation.set(0.18, Math.PI / 2, -0.04);
    alignSleeveToHand(supportSleeve, supportHandRiflePosition);

    const firstPersonGripPose = {
      m4: {
        shoulder: new THREE.Vector3(0.54, -0.5, 0.12),
        wrist: new THREE.Vector3(0.12, -0.13, -0.1),
        handRotation: new THREE.Euler(0.24, -0.04, -0.03),
      },
      ak47: {
        shoulder: new THREE.Vector3(0.54, -0.5, 0.12),
        wrist: new THREE.Vector3(0.12, -0.13, -0.1),
        handRotation: new THREE.Euler(0.24, -0.04, -0.03),
      },
      glock: {
        shoulder: new THREE.Vector3(0.54, -0.5, 0.12),
        wrist: new THREE.Vector3(0.23, -0.14, -0.34),
        handRotation: new THREE.Euler(0.28, -0.06, 0.03),
      },
    };
    const initialGripPose = firstPersonGripPose.m4;
    firingArm.position.copy(initialGripPose.shoulder);
    firingHand.position.copy(initialGripPose.wrist).sub(initialGripPose.shoulder);
    firingHand.rotation.copy(initialGripPose.handRotation);
    alignSleeveToHand(firingSleeve, firingHand.position);
    const supportHandHomeRotation = supportHand.rotation.clone();
    addWeapon(new THREE.TorusGeometry(0.11, 0.014, 8, 20), weaponMaterials.dark, [0.02, -0.12, -0.08]);
    addWeapon(new THREE.BoxGeometry(0.07, 0.13, 0.045), weaponMaterials.receiver, [0.13, 0.055, -0.11]);
    addWeapon(new THREE.BoxGeometry(0.08, 0.08, 0.12), weaponMaterials.dark, [-0.085, 0.15, -0.08]);
    addWeapon(new THREE.BoxGeometry(0.075, 0.13, 0.045), weaponMaterials.dark, [-0.1, 0.19, -0.78]);
    addWeapon(new THREE.BoxGeometry(0.075, 0.13, 0.045), weaponMaterials.dark, [-0.1, 0.19, -0.94]);
    for (let groove = 0; groove < 4; groove += 1) {
      addWeapon(new THREE.BoxGeometry(0.13, 0.018, 0.24), weaponMaterials.dark, [0.02, -0.13 - groove * 0.026, 0.17]);
    }
    rifleModel.scale.setScalar(0.48);
    const ak47Model = cloneAK47();
    ak47Model.scale.setScalar(0.62);
    ak47Model.visible = false;
    baseWeapon.add(ak47Model);
    const akMagazineMesh = ak47Model.userData.detachableMagazine;
    const akMagazineHome = akMagazineMesh.position.clone();

    const buildWeaponEffects = (parent, muzzlePosition, casingPosition) => {
      const flash = new THREE.Group();
      const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.14, 0), weaponMaterials.flash);
      core.scale.set(0.7, 0.7, 1.7);
      flash.add(core);
      const outer = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.42, 7), weaponMaterials.flashOuter);
      outer.rotation.x = -Math.PI / 2;
      outer.position.z = -0.16;
      flash.add(outer);
      flash.position.set(...muzzlePosition);
      flash.visible = false;
      parent.add(flash);
      const light = { intensity: 0 };
      const muzzle = new THREE.Object3D();
      muzzle.position.set(...muzzlePosition);
      parent.add(muzzle);
      const casing = new THREE.Object3D();
      casing.position.set(...casingPosition);
      parent.add(casing);
      return { flash, light, muzzle, casing };
    };
    const rifleEffects = buildWeaponEffects(rifleModel, [0.02, 0.04, -1.39], [0.17, 0.03, -0.16]);

    // A Glock 17 style sidearm: squared steel slide, polymer frame, trigger guard, sights, and magazine base.
    const pistolMetal = new THREE.MeshStandardMaterial({ color: 0x252a29, metalness: 0.78, roughness: 0.3 });
    const pistolPolymer = new THREE.MeshStandardMaterial({ color: 0x202522, roughness: 0.89 });
    const pistolMarking = new THREE.MeshStandardMaterial({ color: 0x666a60, metalness: 0.42, roughness: 0.52 });
    const addPistol = (geo, mat, pos, rotation) => addMesh(pistolModel, geo, mat, pos, { rotation, castShadow: false, receiveShadow: false });
    addPistol(new THREE.BoxGeometry(0.2, 0.17, 0.64), pistolMetal, [0.2, -0.075, -0.59]);
    addPistol(new THREE.BoxGeometry(0.12, 0.075, 0.42), pistolPolymer, [0.2, -0.178, -0.48]);
    addPistol(new THREE.CylinderGeometry(0.038, 0.038, 0.43, 14), pistolMetal, [0.2, -0.06, -0.77], [Math.PI / 2, 0, 0]);
    addPistol(new THREE.BoxGeometry(0.07, 0.09, 0.16), pistolMarking, [0.2, -0.054, -0.47]);
    addPistol(new THREE.BoxGeometry(0.11, 0.025, 0.035), pistolMetal, [0.2, 0.026, -0.89]);
    addPistol(new THREE.BoxGeometry(0.105, 0.025, 0.035), pistolMetal, [0.2, 0.026, -0.29]);
    addPistol(new THREE.BoxGeometry(0.045, 0.12, 0.045), pistolPolymer, [0.2, -0.27, -0.32], [0.18, 0, 0]);
    addPistol(new THREE.BoxGeometry(0.18, 0.3, 0.19), pistolPolymer, [0.2, -0.37, -0.24], [-0.2, 0, 0]);
    addPistol(new THREE.BoxGeometry(0.16, 0.055, 0.19), pistolMetal, [0.2, -0.53, -0.26], [-0.2, 0, 0]);
    addPistol(new THREE.TorusGeometry(0.105, 0.014, 7, 18), pistolMetal, [0.2, -0.23, -0.42]);
    addPistol(new THREE.BoxGeometry(0.034, 0.035, 0.075), pistolMarking, [0.2, -0.22, -0.43], [0.24, 0, 0]);
    for (let grip = 0; grip < 5; grip += 1) {
      addPistol(new THREE.BoxGeometry(0.155, 0.012, 0.018), pistolMarking, [0.2, -0.31 - grip * 0.041, -0.137 - grip * 0.025], [-0.2, 0, 0]);
    }
    for (let serration = 0; serration < 5; serration += 1) {
      addPistol(new THREE.BoxGeometry(0.012, 0.12, 0.018), pistolPolymer, [0.302, -0.07, -0.38 + serration * 0.045]);
    }
    addPistol(new THREE.BoxGeometry(0.012, 0.035, 0.1), pistolMarking, [0.306, -0.09, -0.58]);
    addPistol(new THREE.BoxGeometry(0.014, 0.035, 0.075), pistolPolymer, [0.306, -0.19, -0.45]);
    const detachablePistolMagazine = new THREE.Group();
    detachablePistolMagazine.position.set(0.2, -0.48, -0.24);
    pistolModel.add(detachablePistolMagazine);
    addMesh(detachablePistolMagazine, new THREE.BoxGeometry(0.12, 0.29, 0.15), pistolPolymer, [0, -0.035, 0], { castShadow: false, receiveShadow: false });
    addMesh(detachablePistolMagazine, new THREE.BoxGeometry(0.15, 0.025, 0.17), pistolMetal, [0, -0.19, 0], { castShadow: false, receiveShadow: false });
    for (let rib = 0; rib < 4; rib += 1) addMesh(detachablePistolMagazine, new THREE.BoxGeometry(0.124, 0.012, 0.156), pistolMarking, [0, -0.11 - rib * 0.035, 0], { castShadow: false, receiveShadow: false });
    pistolModel.position.set(0.182, -0.051, -0.282);
    pistolModel.scale.setScalar(0.24);
    const pistolEffects = buildWeaponEffects(pistolModel, [0.2, -0.06, -0.94], [0.35, -0.03, -0.56]);
    const ak47Effects = buildWeaponEffects(ak47Model, [0, 0.01, -1.1], [0.1, 0.01, -0.08]);
    const weaponEffects = { m4: rifleEffects, glock: pistolEffects, ak47: ak47Effects };
    let muzzleFlash = rifleEffects.flash;
    let muzzleLight = rifleEffects.light;
    let muzzleSocket = rifleEffects.muzzle;
    let casingSocket = rifleEffects.casing;
    let m4MagazineMesh = fallbackMagazine;
    let m4MagazineHome = fallbackMagazine.position.clone();
    let pistolMagazineMesh = detachablePistolMagazine;
    let pistolMagazineHome = detachablePistolMagazine.position.clone();
    let reloadSpareMagazine = null;
    let reloadSpareMagazineStart = null;
    let reloadSpareMagazineCursor = 0;
    let reloadStartedAt = 0;
    let reloadDuration = 0;
    baseWeapon.scale.setScalar(0.92);
    baseWeapon.position.set(0.39, -0.34, -0.58);
    camera.add(baseWeapon);

    const playerGear = new THREE.Group();
    playerGear.position.set(0, -0.91, -1.12);
    const gearMesh = (geometry, material, position, rotation = [0, 0, 0], parent = playerGear) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(...position);
      mesh.rotation.set(...rotation);
      mesh.castShadow = false;
      mesh.receiveShadow = false;
      parent.add(mesh);
      return mesh;
    };
    gearMesh(new RoundedBoxGeometry(0.96, 0.72, 0.2, 5, 0.065), enemyMaterials.vest, [0, 0, 0]);
    gearMesh(new RoundedBoxGeometry(0.78, 0.045, 0.025, 3, 0.009), enemyMaterials.strap, [0, 0.16, 0.115]);
    gearMesh(new RoundedBoxGeometry(0.17, 0.63, 0.07, 4, 0.025), enemyMaterials.strap, [-0.32, 0.1, 0.01], [0, 0, -0.16]);
    gearMesh(new RoundedBoxGeometry(0.17, 0.63, 0.07, 4, 0.025), enemyMaterials.strap, [0.32, 0.1, 0.01], [0, 0, 0.16]);
    gearMesh(new RoundedBoxGeometry(0.88, 0.055, 0.035, 3, 0.012), enemyMaterials.strap, [0, 0.28, 0.11]);
    gearMesh(new RoundedBoxGeometry(0.22, 0.13, 0.05, 4, 0.025), enemyMaterials.pack, [-0.36, 0.26, 0.115]);
    gearMesh(new RoundedBoxGeometry(0.22, 0.13, 0.05, 4, 0.025), enemyMaterials.pack, [0.36, 0.26, 0.115]);
    const reloadMagazineProps = [];
    const makeVestMagazine = (kind, pouchX, pouchIndex) => {
      const group = new THREE.Group();
      const isPistol = kind === "glock";
      const bodyMaterial = isPistol ? pistolPolymer : weaponMaterials.polymer;
      const ribMaterial = isPistol ? pistolMarking : weaponMaterials.dark;
      const bodyWidth = isPistol ? 0.047 : kind === "ak47" ? 0.08 : 0.074;
      const bodyHeight = isPistol ? 0.145 : 0.19;
      const bodyDepth = isPistol ? 0.031 : 0.036;
      const tilt = kind === "m4" ? -0.08 : kind === "ak47" ? -0.16 : 0;
      gearMesh(new RoundedBoxGeometry(bodyWidth, bodyHeight, bodyDepth, 3, 0.008), bodyMaterial, [0, 0, 0], [0.08, 0, tilt], group);
      for (let rib = 0; rib < (isPistol ? 3 : 5); rib += 1) {
        const ribY = -bodyHeight * 0.3 + rib * (bodyHeight * 0.14);
        gearMesh(new RoundedBoxGeometry(bodyWidth * 0.82, 0.008, bodyDepth * 1.04, 2, 0.002), ribMaterial, [0, ribY, bodyDepth * 0.12], [0, 0, 0], group);
      }
      gearMesh(new RoundedBoxGeometry(bodyWidth * 1.1, 0.018, bodyDepth * 1.16, 3, 0.004), ribMaterial, [0, -bodyHeight * 0.49, 0], [0, 0, 0], group);
      group.position.set(pouchX, -0.195, 0.196);
      playerGear.add(group);
      reloadMagazineProps.push({ kind, group, home: group.position.clone(), pouchIndex });
      return group;
    };
    for (let pouch = 0; pouch < 4; pouch += 1) {
      const x = -0.31 + pouch * 0.205;
      gearMesh(new RoundedBoxGeometry(0.16, 0.19, 0.115, 4, 0.025), enemyMaterials.pouch, [x, -0.2, 0.13]);
      gearMesh(new RoundedBoxGeometry(0.15, 0.04, 0.12, 3, 0.009), enemyMaterials.strap, [x, -0.105, 0.135]);
      gearMesh(new RoundedBoxGeometry(0.02, 0.07, 0.014, 3, 0.004), enemyMaterials.metal, [x, -0.2, 0.195]);
      gearMesh(new RoundedBoxGeometry(0.045, 0.16, 0.055, 3, 0.008), enemyMaterials.strap, [x, -0.205, 0.202]);
      const magazineKind = pouch === 0 || pouch === 3 ? "glock" : pouch === 1 ? "m4" : "ak47";
      const vestMagazine = makeVestMagazine(magazineKind, x, pouch);
      if (magazineKind === "ak47") vestMagazine.visible = false;
    }
    gearMesh(new RoundedBoxGeometry(0.36, 0.11, 0.04, 4, 0.018), enemyMaterials.helmet, [0, 0.35, 0.01], [0, 0, 0]);
    camera.add(playerGear);

    const dropEnemyWeapon = (enemy) => {
      if (enemy.userData.weaponDropped || enemy.userData.loadout !== "ak47") return;
      const group = new THREE.Group();
      group.position.set(enemy.position.x + 0.18, 0, enemy.position.z + 0.12);
      group.rotation.y = enemy.rotation.y;
      const ring = new THREE.Mesh(weaponDropRingGeometry, weaponDropRingMaterial);
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.018;
      ring.userData.sharedAsset = true;
      group.add(ring);
      const weapon = cloneAK47();
      weapon.scale.setScalar(0.62);
      weapon.rotation.z = Math.PI / 2;
      weapon.position.y = 0.12;
      group.add(weapon);
      scene.add(group);
      weaponDrops.push({ group, weapon, collected: false, label: "AK-47" });
      enemy.userData.weaponDropped = true;
    };

    const spawnEnemy = () => {
      if (spawned >= enemyWaveSize || disposed) return null;
      const enemyStarts = selectedMapMeta.enemies || ENEMY_STARTS;
      const [x, z] = enemyStarts[spawned % enemyStarts.length];
      const enemy = makeSoldier(scene, enemyMaterials, [x + Math.sin(spawned * 1.7) * 0.65, z + Math.cos(spawned * 1.3) * 0.7], spawned);
      enemy.userData.loadout = "ak47";
      attachEnemyAK47(enemy);
      spawned += 1;
      enemies.push(enemy);
      attachImportedSoldier(enemy);
      return enemy;
    };
    for (let index = 0; index < 5; index += 1) spawnEnemy();

    let healthBar = health;
    const prepareAudio = () => {
      try {
        const AudioContextType = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextType) return;
        if (!audioContext) audioContext = new AudioContextType();
        if (audioContext.state === "suspended") audioContext.resume();
        const files = {
          m4: "/assets/fps/m4a1-shot.mp3",
          glock: "/assets/fps/glock-shot.mp3",
          m4reload: "/assets/fps/m4reload.mp3",
          glockreload: "/assets/fps/glockreload.mp3",
        };
        Object.entries(files).forEach(([name, url]) => {
          if (audioBuffers[name] || audioLoads[name]) return;
          audioLoads[name] = fetch(url).then((response) => {
            if (!response.ok) throw new Error("Audio asset unavailable");
            return response.arrayBuffer();
          }).then((bytes) => audioContext.decodeAudioData(bytes)).then((buffer) => { audioBuffers[name] = buffer; }).catch(() => {}).finally(() => { audioLoads[name] = null; });
        });
      } catch { /* Game audio remains optional. */ }
    };
    const playRecordedSound = (name, volume = 0.72, pitch = 1) => {
      const buffer = audioBuffers[name];
      if (!audioContext || !buffer) return false;
      const source = audioContext.createBufferSource();
      const gain = audioContext.createGain();
      source.buffer = buffer;
      source.playbackRate.value = pitch;
      gain.gain.value = volume;
      source.connect(gain); gain.connect(audioContext.destination);
      source.start();
      return true;
    };
    const playShotSound = () => {
      if (!soundRef.current) return;
      prepareAudio();
      try {
        const isGlock = weaponMode === "glock";
        const sampleName = isGlock ? "glock" : "m4";
        const samplePitch = weaponMode === "ak47" ? 0.92 + Math.random() * 0.04 : 0.98 + Math.random() * 0.04;
        if (playRecordedSound(sampleName, isGlock ? 0.72 : weaponMode === "ak47" ? 0.7 : 0.64, samplePitch)) return;
        if (!noiseBuffer) {
          noiseBuffer = audioContext.createBuffer(1, Math.floor(audioContext.sampleRate * 0.14), audioContext.sampleRate);
          const channel = noiseBuffer.getChannelData(0);
          for (let index = 0; index < channel.length; index += 1) channel[index] = (Math.random() * 2 - 1) * (1 - index / channel.length);
        }
        const source = audioContext.createBufferSource();
        source.buffer = noiseBuffer;
        const filter = audioContext.createBiquadFilter();
        filter.type = "lowpass"; filter.frequency.value = isGlock ? 2200 : weaponMode === "ak47" ? 1320 : 1550;
        const gain = audioContext.createGain();
        gain.gain.setValueAtTime(0.18, audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.12);
        source.connect(filter); filter.connect(gain); gain.connect(audioContext.destination); source.start();
        const thump = audioContext.createOscillator();
        const thumpGain = audioContext.createGain();
        thump.frequency.setValueAtTime(isGlock ? 116 : weaponMode === "ak47" ? 82 : 92, audioContext.currentTime);
        thump.frequency.exponentialRampToValueAtTime(42, audioContext.currentTime + 0.08);
        thumpGain.gain.setValueAtTime(0.16, audioContext.currentTime);
        thumpGain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.095);
        thump.connect(thumpGain); thumpGain.connect(audioContext.destination); thump.start(); thump.stop(audioContext.currentTime + 0.1);
      } catch { /* Audio is optional; the range still works without it. */ }
    };
    const playReloadSound = () => {
      if (!soundRef.current) return;
      prepareAudio();
      const sample = weaponMode === "glock" ? "glockreload" : "m4reload";
      if (!playRecordedSound(sample, 0.54)) {
        try {
          const click = audioContext.createOscillator();
          const gain = audioContext.createGain();
          click.type = "triangle";
          click.frequency.setValueAtTime(680, audioContext.currentTime);
          click.frequency.exponentialRampToValueAtTime(190, audioContext.currentTime + 0.055);
          gain.gain.setValueAtTime(0.12, audioContext.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.08);
          click.connect(gain); gain.connect(audioContext.destination); click.start(); click.stop(audioContext.currentTime + 0.09);
        } catch { /* Audio is optional. */ }
      }
    };

    const changePhase = (next) => { phaseValue = next; setPhase(next); };
    const magazineSizeFor = (mode) => mode === "glock" ? 17 : mode === "ak47" ? AK_MAG_SIZE : MAG_SIZE;
    const storedAmmoFor = (mode) => mode === "glock" ? pistolAmmo : mode === "ak47" ? akAmmo : rifleAmmo;
    const storeCurrentAmmo = () => {
      if (weaponMode === "glock") pistolAmmo = ammo;
      else if (weaponMode === "ak47") akAmmo = ammo;
      else rifleAmmo = ammo;
    };
    const findNearestWeaponDrop = (range = 2.7) => {
      if (phaseValue !== "playing" || activeVehicle || parachuteActive) return null;
      let nearest = null;
      let nearestDistance = range;
      for (const drop of weaponDrops) {
        if (drop.collected) continue;
        const distance = Math.hypot(camera.position.x - drop.group.position.x, camera.position.z - drop.group.position.z);
        if (distance < nearestDistance) { nearest = drop; nearestDistance = distance; }
      }
      return nearest;
    };
    const publishHud = () => {
      const player = camera.position;
      const radar = enemies.filter((enemy) => enemy.userData.alive).map((enemy) => ({
        x: THREE.MathUtils.clamp(50 + (enemy.position.x - player.x) * 1.25, 8, 92),
        y: THREE.MathUtils.clamp(50 + (enemy.position.z - player.z) * 1.25, 8, 92),
      }));
      const headingDegrees = (THREE.MathUtils.radToDeg(camera.rotation.y) % 360 + 360) % 360;
      const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
      const nearestIntel = intelPickups.find((pickup) => !pickup.collected && Math.hypot(camera.position.x - pickup.group.position.x, camera.position.z - pickup.group.position.z) < 2.65);
      const nearestWeapon = findNearestWeaponDrop();
      const nearbyVehicle = [apc, helicopter].find((vehicle) => {
        const closeEnough = Math.hypot(camera.position.x - vehicle.position.x, camera.position.z - vehicle.position.z) < (vehicle === helicopter ? 6.2 : 4.8);
        return closeEnough && (vehicle === helicopter || Math.abs(camera.position.y - (vehicle.position.y + 1.7)) < 2.4);
      });
      const vehicleLabel = activeVehicle
        ? activeVehicle.userData.kind === "apc" ? "APC · LMB FIRE · R RELOAD · F EXIT" : "HELI · SPACE UP / CTRL DOWN · F EXIT"
        : nearbyVehicle ? `BOARD ${nearbyVehicle.userData.label}` : "";
      const usingCannon = activeVehicle === apc;
      setHud({
        kills, health, ammo: usingCannon ? cannonAmmo : ammo, ammoMax: usingCannon ? CANNON_MAG_SIZE : magazineSizeFor(weaponMode),
        weapon: usingCannon ? "cannon" : weaponMode, seconds: remainingSeconds,
        accuracy: shots ? Math.round((hits / shots) * 100) : 0,
        stamina: Math.round(stamina), heading: directions[Math.round(headingDegrees / 45) % 8],
        radar, nearSupply: supplyCrates.some((crate) => !crate.used && Math.hypot(camera.position.x - crate.group.position.x, camera.position.z - crate.group.position.z) < 3.1),
        nearHouse: houses.some((house) => Math.abs(camera.position.x - house.x) < 1.35 && Math.abs(camera.position.z - house.front) < 2.2),
        nearIntel: Boolean(nearestIntel), nearWeapon: nearestWeapon?.label || "", nearDefense: Boolean(defenseZone && Math.hypot(camera.position.x - defenseZone.position.x, camera.position.z - defenseZone.position.z) < 6.8),
        vehicleLabel, progress: sharedProgress, target: selectedMissionMeta.target, teamSize: connectedPlayerCount,
        reloading: usingCannon ? cannonReloading : reloading,
      });
    };
    const setWeapon = (nextWeapon) => {
      if (phaseValue !== "playing" || reloading || weaponMode === nextWeapon || (nextWeapon === "ak47" && !hasAk47)) return;
      storeCurrentAmmo();
      weaponMode = nextWeapon;
      ammo = storedAmmoFor(weaponMode);
      rifleModel.visible = weaponMode === "m4";
      pistolModel.visible = weaponMode === "glock";
      ak47Model.visible = weaponMode === "ak47";
      muzzleFlash.visible = false;
      muzzleLight.intensity = 0;
      const activeEffects = weaponEffects[weaponMode];
      muzzleFlash = activeEffects.flash;
      muzzleLight = activeEffects.light;
      muzzleSocket = activeEffects.muzzle;
      casingSocket = activeEffects.casing;
      recoil = 0;
      nextShotAt = performance.now() + 180;
      setNotice(weaponMode === "m4" ? "M4A1 · 5.56 × 45 mm" : weaponMode === "ak47" ? "AK-47 · 7.62 × 39 mm" : "GLOCK 17 · 9 × 19 mm");
      window.setTimeout(() => setNotice(""), 1400);
      publishHud();
    };

    const removeEffect = (effect) => {
      scene.remove(effect.object);
      if (effect.object.geometry) effect.object.geometry.dispose();
      if (effect.object.material) {
        if (Array.isArray(effect.object.material)) effect.object.material.forEach((material) => material.dispose());
        else effect.object.material.dispose();
      }
    };
    const addTracer = (start, end, color, life = 0.12, opacity = 0.9) => {
      const geometry = new THREE.BufferGeometry().setFromPoints([start.clone(), end.clone()]);
      const material = new THREE.LineBasicMaterial({ color, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending });
      const line = new THREE.Line(geometry, material);
      scene.add(line);
      effects.push({ type: "line", object: line, life, maxLife: life });
    };
    const addImpact = (point, color = 0xffb35e) => {
      const count = 8;
      const positions = new Float32Array(count * 3);
      const velocities = [];
      for (let index = 0; index < count; index += 1) {
        positions[index * 3] = point.x; positions[index * 3 + 1] = point.y; positions[index * 3 + 2] = point.z;
        velocities.push(new THREE.Vector3((Math.random() - 0.5) * 5, Math.random() * 4 + 0.7, (Math.random() - 0.5) * 5));
      }
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      const material = new THREE.PointsMaterial({ color, size: 0.075, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true });
      const points = new THREE.Points(geometry, material);
      scene.add(points);
      effects.push({ type: "particles", object: points, velocities, life: 0.3, maxLife: 0.3 });

      const spriteMat = new THREE.SpriteMaterial({ map: effectsTexture, color, transparent: true, opacity: 0.78, depthWrite: false, blending: THREE.AdditiveBlending });
      const puff = new THREE.Sprite(spriteMat);
      puff.position.copy(point);
      puff.scale.set(0.48, 0.48, 1);
      scene.add(puff);
      effects.push({ type: "sprite", object: puff, life: 0.18, maxLife: 0.18, growth: 1.8 });
    };
    const ejectCasing = () => {
      const position = new THREE.Vector3(); casingSocket.getWorldPosition(position);
      const casingLength = weaponMode === "glock" ? 0.019 : 0.045;
      const casingRadius = weaponMode === "glock" ? 0.005 : 0.0048;
      const shell = new THREE.Mesh(new THREE.CylinderGeometry(casingRadius, casingRadius, casingLength, 8), new THREE.MeshStandardMaterial({ color: 0xb58c50, metalness: 0.86, roughness: 0.25 }));
      shell.rotation.set(Math.random() * 2, 0, Math.PI / 2);
      shell.position.copy(position);
      scene.add(shell);
      effects.push({ type: "shell", object: shell, velocity: new THREE.Vector3(2.8 + Math.random(), 2.1 + Math.random(), 0.6), life: 1.6, maxLife: 1.6 });
    };
    const pointAt = (enemy) => new THREE.Vector3(enemy.position.x, 1.48, enemy.position.z);

    const checkHouseCollision = (from, to) => {
      for (const house of houses) {
        const betweenSides = (from.z >= house.back && from.z <= house.front) || (to.z >= house.back && to.z <= house.front);
        const crossesLeft = (from.x > house.left && to.x <= house.left) || (from.x < house.left && to.x >= house.left);
        const crossesRight = (from.x < house.right && to.x >= house.right) || (from.x > house.right && to.x <= house.right);
        if ((crossesLeft || crossesRight) && betweenSides) return true;
        const insideWidth = (from.x > house.left && from.x < house.right) || (to.x > house.left && to.x < house.right);
        const crossesBack = (from.z > house.back && to.z <= house.back) || (from.z < house.back && to.z >= house.back);
        if (crossesBack && insideWidth) return true;
        const crossesFront = (from.z > house.front && to.z <= house.front) || (from.z < house.front && to.z >= house.front);
        const midX = (from.x + to.x) / 2;
        if (crossesFront && insideWidth && Math.abs(midX - house.x) > house.doorHalf) return true;
      }
      return false;
    };
    const playerBlocked = (from, to) => {
      if (checkHouseCollision(from, to)) return true;
      for (const blocker of playerBlockers) {
        if (blocker.type !== "circle") continue;
        if (Math.hypot(to.x - blocker.x, to.z - blocker.z) < blocker.radius) return true;
      }
      return false;
    };
    const setVehicleCamera = () => {
      if (!activeVehicle) return;
      camera.position.set(activeVehicle.position.x, activeVehicle.position.y + 1.92, activeVehicle.position.z);
      camera.rotation.y = activeVehicle.rotation.y;
      camera.rotation.x = pitch;
      camera.rotation.z = 0;
    };
    const interactVehicle = () => {
      if (activeVehicle) {
        const exitedVehicle = activeVehicle;
        const wasAirborne = exitedVehicle.userData.kind === "helicopter" && exitedVehicle.position.y > 2.4;
        const exitOffset = new THREE.Vector3(exitedVehicle.userData.kind === "apc" ? -2.6 : -2.1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), exitedVehicle.rotation.y);
        camera.position.set(exitedVehicle.position.x + exitOffset.x, exitedVehicle.position.y + PLAYER_EYE_HEIGHT, exitedVehicle.position.z + exitOffset.z);
        camera.rotation.set(pitch, activeVehicle.rotation.y, 0, "YXZ");
        const exitedKind = exitedVehicle.userData.kind.toUpperCase();
        activeVehicle = null;
        vehicleSpeed = 0;
        helicopterForwardSpeed = 0;
        parachuteActive = wasAirborne;
        parachuteTemplate.visible = parachuteActive;
        if (parachuteActive) parachuteTemplate.position.set(camera.position.x, camera.position.y - PLAYER_EYE_HEIGHT, camera.position.z);
        baseWeapon.visible = !parachuteActive;
        setNotice(parachuteActive ? `PARACHUTE OPEN · steer gamit ang WASD` : `LUMABAS SA ${exitedKind}`);
        publishHud();
        window.setTimeout(() => setNotice(""), 1500);
        return;
      }
      const candidate = [apc, helicopter]
        .filter((vehicle) => Math.hypot(camera.position.x - vehicle.position.x, camera.position.z - vehicle.position.z) < (vehicle === helicopter ? 6.2 : 4.8)
          && (vehicle === helicopter || Math.abs(camera.position.y - (vehicle.position.y + 1.7)) < 2.4))
        .sort((left, right) => camera.position.distanceTo(left.position) - camera.position.distanceTo(right.position))[0];
      if (!candidate || (candidate === helicopter && candidate.position.y > 2.4)) return;
      activeVehicle = candidate;
      pitch = 0;
      aimingNow = false;
      mouseHeld = false;
      setAiming(false);
      baseWeapon.visible = false;
      setVehicleCamera();
      setNotice(`Nakasakay: ${candidate.userData.label} · F para bumaba`);
      publishHud();
      window.setTimeout(() => setNotice(""), 2300);
    };

    const endRound = (next) => {
      changePhase(next);
      mouseHeld = false;
      aimingNow = false;
      setAiming(false);
      if (document.pointerLockElement === renderer.domElement) document.exitPointerLock();
      publishHud();
    };
    const killEnemy = (enemy, headshot, credited = true) => {
      if (!enemy.userData.alive) return;
      enemy.userData.alive = false;
      enemy.userData.deadAt = performance.now() + 1450;
      dropEnemyWeapon(enemy);
      enemy.rotation.z = Math.random() > 0.5 ? 1.18 : -1.18;
      if (credited) {
        kills += 1;
        score += headshot ? 150 : 100;
        setHitPulse((value) => value + 1);
      }
      addImpact(pointAt(enemy), 0xffa066);
      if (selectedMissionMeta.id === "assault") {
        reportObjective("kill", `kill-${enemy.userData.id}-${credited ? "operator" : `squad-${Math.floor(performance.now())}`}`);
        if (networkSocket?.readyState !== WebSocket.OPEN) {
          sharedProgress = Math.min(selectedMissionMeta.target, sharedProgress + 1);
          if (sharedProgress >= selectedMissionMeta.target) endRound("complete");
        }
      }
      publishHud();
      if (spawned < enemyWaveSize) {
        const timeout = window.setTimeout(() => spawnEnemy(), 950);
        spawnTimeouts.push(timeout);
      }
    };
    const updateSquadAI = (delta, now, elapsed) => {
      const forwardX = -Math.sin(camera.rotation.y);
      const forwardZ = -Math.cos(camera.rotation.y);
      for (const [index, ally] of squadBots.entries()) {
        ally.userData.mixer?.update(delta);
        let closestEnemy = null;
        let closestDistance = 46;
        for (const enemy of enemies) {
          if (!enemy.userData.alive) continue;
          const distance = Math.hypot(enemy.position.x - ally.position.x, enemy.position.z - ally.position.z);
          if (distance < closestDistance) { closestEnemy = enemy; closestDistance = distance; }
        }
        ally.userData.engageTargetId = closestEnemy?.userData.id ?? null;
        const desired = ally.userData.desiredPosition;
        if (closestEnemy) {
          const orbitAngle = index * (Math.PI * 2 / 3) + closestEnemy.userData.phase * 0.2;
          desired.set(
            closestEnemy.position.x + Math.cos(orbitAngle) * 6.4,
            0,
            closestEnemy.position.z + Math.sin(orbitAngle) * 6.4,
          );
        } else desired.copy(ally.userData.homePosition);
        desired.y = 0;
        desired.x = THREE.MathUtils.clamp(desired.x, -20, 20);
        desired.z = THREE.MathUtils.clamp(desired.z, -111, 27);
        const distanceToPost = Math.hypot(desired.x - ally.position.x, desired.z - ally.position.z);
        const followBlend = 1 - Math.exp(-delta * (closestEnemy ? 1.55 : 1.9));
        ally.position.x = THREE.MathUtils.lerp(ally.position.x, desired.x, followBlend);
        ally.position.z = THREE.MathUtils.lerp(ally.position.z, desired.z, followBlend);
        ally.position.y = distanceToPost > 0.32 ? Math.abs(Math.sin(elapsed * 8 + index)) * 0.026 : 0;
        if (!closestEnemy) {
          ally.rotation.y = Math.atan2(-forwardX, -forwardZ);
          setEnemyMotion(ally, distanceToPost > 1.2 ? "run" : "idle");
          poseRiggedSoldier(ally, elapsed + index * 0.23, ally.userData.motion, index * 0.7);
          continue;
        }
        const dx = closestEnemy.position.x - ally.position.x;
        const dz = closestEnemy.position.z - ally.position.z;
        ally.rotation.y = Math.atan2(-dx, -dz);
        setEnemyMotion(ally, distanceToPost > 1.2 ? "run" : "idle");
        poseRiggedSoldier(ally, elapsed + index * 0.23, ally.userData.motion, index * 0.7);
        if (now < ally.userData.allyFireAt) continue;
        ally.userData.allyFireAt = now + 950 + Math.random() * 700;
        const aim = pointAt(closestEnemy);
        const origin = new THREE.Vector3();
        ally.userData.gun.getWorldPosition(origin);
        const ray = aim.clone().sub(origin);
        const distance = ray.length();
        ray.normalize();
        coverRaycaster.set(origin, ray);
        coverRaycaster.far = distance;
        const cover = coverRaycaster.intersectObjects(worldSurfaces, false)[0];
        if (cover && cover.distance < distance - 0.75) continue;
        const spread = Math.random() > 0.72 ? 0.6 : 0.16;
        const end = aim.add(new THREE.Vector3((Math.random() - 0.5) * spread, (Math.random() - 0.5) * spread, (Math.random() - 0.5) * spread));
        addTracer(origin, end, 0x83d6ff, 0.1, 0.72);
        if (soundRef.current) playRecordedSound("m4", 0.2, 0.94 + Math.random() * 0.12);
        if (Math.random() > 0.22) {
          closestEnemy.userData.hp -= 30;
          addImpact(end, 0x83d6ff);
          if (closestEnemy.userData.hp <= 0) killEnemy(closestEnemy, false, false);
        }
      }
    };
    const fire = (now) => {
      if (phaseValue !== "playing" || activeVehicle || parachuteActive || reloading || now < nextShotAt) return;
      if (ammo <= 0) { startReload(); return; }
      nextShotAt = now + (aimingNow ? 105 : 92);
      if (weaponMode === "glock") nextShotAt = now + (aimingNow ? 190 : 165);
      ammo -= 1;
      storeCurrentAmmo();
      shots += 1;
      const weaponRecoil = weaponMode === "m4"
        ? (aimingNow ? 0.028 : 0.042)
        : weaponMode === "ak47" ? (aimingNow ? 0.038 : 0.056) : (aimingNow ? 0.055 : 0.075);
      recoil = Math.min(recoil + weaponRecoil, 0.2);
      recoilRoll = (Math.random() - 0.5) * 0.018;
      muzzleFlash.visible = true;
      muzzleLight.intensity = 58;
      playShotSound();
      ejectCasing();

      const livingEnemies = enemies.filter((enemy) => enemy.userData.alive);
      const targets = [...worldSurfaces, ...livingEnemies];
      raycaster.setFromCamera(centerAim, camera);
      raycaster.near = 0;
      raycaster.far = 90;
      const aimHit = raycaster.intersectObjects(targets, true)[0];
      const aimPoint = aimHit ? aimHit.point.clone() : raycaster.ray.origin.clone().addScaledVector(raycaster.ray.direction, 68);
      const start = new THREE.Vector3();
      muzzleSocket.getWorldPosition(start);
      const shotDirection = aimPoint.clone().sub(start);
      const shotDistance = shotDirection.length();
      shotDirection.normalize();
      raycaster.set(start, shotDirection);
      raycaster.near = 0;
      raycaster.far = shotDistance + 0.15;
      const hit = raycaster.intersectObjects(targets, true)[0];
      const end = hit ? hit.point.clone() : aimPoint;
      addTracer(start, end, 0xffd08a, 0.085, 0.9);

      if (hit) {
        const enemy = hit.object.userData.enemyRoot;
        if (enemy?.userData.alive) {
          const headshot = hit.object.userData.bodyPart === "head";
          enemy.userData.hp -= headshot ? 125 : 52;
          hits += 1;
          setHitPulse((value) => value + 1);
          addImpact(hit.point, headshot ? 0xffdd91 : 0xffa66e);
          if (enemy.userData.hp <= 0) killEnemy(enemy, headshot);
        } else {
          addImpact(hit.point, 0xe5bd83);
        }
      }
      publishHud();
    };
    const fireCannon = (now) => {
      if (phaseValue !== "playing" || activeVehicle !== apc || cannonReloading || now < nextCannonShotAt) return;
      if (cannonAmmo <= 0) { startCannonReload(); return; }
      nextCannonShotAt = now + 760;
      cannonAmmo -= 1;
      raycaster.setFromCamera(centerAim, camera);
      raycaster.near = 0;
      raycaster.far = 100;
      const livingEnemies = enemies.filter((enemy) => enemy.userData.alive);
      const firingSurfaces = worldSurfaces.filter((surface) => !surface.userData.vehicleSurface);
      const hit = raycaster.intersectObjects([...firingSurfaces, ...livingEnemies], true)[0];
      const end = hit ? hit.point.clone() : raycaster.ray.origin.clone().addScaledVector(raycaster.ray.direction, 88);
      const start = new THREE.Vector3();
      apc.userData.cannonMuzzle.getWorldPosition(start);
      addTracer(start, end, 0xffc078, 0.2, 1);
      addImpact(end, 0xffa74e);
      apc.userData.cannonFlash.intensity = 24;
      apc.userData.cannonFlashOffAt = now + 90;
      apc.userData.cannon.position.z = apc.userData.cannonHomePosition.z + 0.16;
      recoil = Math.min(recoil + 0.09, 0.18);
      if (soundRef.current) {
        prepareAudio();
        try {
          if (audioContext) {
            const blast = audioContext.createOscillator();
            const lowpass = audioContext.createBiquadFilter();
            const gain = audioContext.createGain();
            blast.type = "sawtooth";
            blast.frequency.setValueAtTime(86, audioContext.currentTime);
            blast.frequency.exponentialRampToValueAtTime(28, audioContext.currentTime + 0.28);
            lowpass.type = "lowpass";
            lowpass.frequency.value = 210;
            gain.gain.setValueAtTime(0.42, audioContext.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.34);
            blast.connect(lowpass); lowpass.connect(gain); gain.connect(audioContext.destination);
            blast.start(); blast.stop(audioContext.currentTime + 0.36);
          }
        } catch { /* The cannon can still fire when audio is unavailable. */ }
      }
      if (hit) {
        const enemy = hit.object.userData.enemyRoot;
        if (enemy?.userData.alive) {
          enemy.userData.hp -= 165;
          if (enemy.userData.hp <= 0) killEnemy(enemy, false);
          else publishHud();
        }
      }
      publishHud();
      if (cannonAmmo === 0) startCannonReload();
    };
    function startReload() {
      const magazineSize = magazineSizeFor(weaponMode);
      if (phaseValue !== "playing" || reloading || ammo === magazineSize) return;
      const matchingMagazineProps = reloadMagazineProps.filter((magazine) => magazine.kind === weaponMode);
      if (matchingMagazineProps.length) {
        reloadSpareMagazine = matchingMagazineProps[reloadSpareMagazineCursor % matchingMagazineProps.length];
        reloadSpareMagazineCursor += 1;
        reloadSpareMagazineStart = reloadSpareMagazine.home.clone();
        reloadSpareMagazine.group.position.copy(reloadSpareMagazineStart);
        reloadSpareMagazine.group.visible = true;
      }
      aimingNow = false;
      setAiming(false);
      reloading = true;
      reloadStartedAt = performance.now();
      reloadDuration = weaponMode === "glock" ? 1750 : weaponMode === "ak47" ? 2100 : 1950;
      playReloadSound();
      publishHud();
      if (reloadTimeout) window.clearTimeout(reloadTimeout);
      reloadTimeout = window.setTimeout(() => {
        reloading = false;
        ammo = magazineSize;
        m4MagazineMesh.position.copy(m4MagazineHome);
        m4MagazineMesh.visible = true;
        pistolMagazineMesh.position.copy(pistolMagazineHome);
        pistolMagazineMesh.visible = true;
        if (reloadSpareMagazine) {
          reloadSpareMagazine.group.position.copy(reloadSpareMagazine.home);
          reloadSpareMagazine.group.rotation.set(0, 0, 0);
          reloadSpareMagazine.group.visible = true;
        }
        reloadSpareMagazine = null;
        reloadSpareMagazineStart = null;
        supportArm.position.set(0, 0, 0);
        storeCurrentAmmo();
        publishHud();
      }, reloadDuration);
    }
    const startCannonReload = () => {
      if (phaseValue !== "playing" || activeVehicle !== apc || cannonReloading || cannonAmmo === CANNON_MAG_SIZE || cannonReserve <= 0) return;
      cannonReloading = true;
      publishHud();
      if (cannonReloadTimeout) window.clearTimeout(cannonReloadTimeout);
      cannonReloadTimeout = window.setTimeout(() => {
        const loaded = Math.min(CANNON_MAG_SIZE, cannonReserve);
        cannonAmmo = loaded;
        cannonReserve -= loaded;
        cannonReloading = false;
        publishHud();
      }, 2400);
    };
    const resupply = () => {
      const weaponDrop = findNearestWeaponDrop();
      if (weaponDrop) {
        weaponDrop.collected = true;
        weaponDrop.group.visible = false;
        hasAk47 = true;
        akAmmo = AK_MAG_SIZE;
        reloadMagazineProps.filter((magazine) => magazine.kind === "ak47").forEach((magazine) => { magazine.group.visible = true; });
        if (weaponMode === "ak47") {
          ammo = akAmmo;
          setNotice("AK-47 AMMO TOPPED UP · 30 ROUNDS");
          window.setTimeout(() => setNotice(""), 1500);
        } else setWeapon("ak47");
        publishHud();
        return;
      }
      if (selectedMissionMeta.id === "intel") {
        const pickup = intelPickups.find((item) => !item.collected && Math.hypot(camera.position.x - item.group.position.x, camera.position.z - item.group.position.z) < 2.65);
        if (pickup) {
          pickup.collected = true;
          pickup.group.visible = false;
          collectedIntel += 1;
          reportObjective("intel", `intel-${pickup.id}`, pickup.id);
          if (networkSocket?.readyState !== WebSocket.OPEN) { sharedProgress = Math.min(selectedMissionMeta.target, sharedProgress + 1); if (sharedProgress >= selectedMissionMeta.target) endRound("complete"); }
          setNotice(`INTEL RECOVERED / ${Math.max(sharedProgress, collectedIntel)} OF ${selectedMissionMeta.target}`);
          publishHud();
          supplyToastTimeout = window.setTimeout(() => setNotice(""), 2200);
          return;
        }
      }
      const crate = supplyCrates.find((item) => !item.used && Math.hypot(camera.position.x - item.group.position.x, camera.position.z - item.group.position.z) < 3.1);
      if (!crate) return;
      crate.used = true;
      crate.statusLamp.material = lampOff;
      ammoBoxUsed.add(crate.id);
      ammo = magazineSizeFor(weaponMode);
      cannonReserve = Math.max(cannonReserve, CANNON_MAG_SIZE * 2);
      storeCurrentAmmo();
      health = Math.min(100, health + 48);
      setNotice("SUPPLY SECURED - AMMO FULL - HEALTH RESTORED");
      publishHud();
      supplyToastTimeout = window.setTimeout(() => setNotice(""), 2200);
    };
    const updateDefenseZone = (delta, now) => {
      if (selectedMissionMeta.id !== "defense" || !defenseZone || phaseValue !== "playing") return;
      const withinZone = Math.hypot(camera.position.x - defenseZone.position.x, camera.position.z - defenseZone.position.z) < 5.5;
      if (networkSocket?.readyState !== WebSocket.OPEN && withinZone && now - lastDefenseProgressAt >= 1000) {
        lastDefenseProgressAt = now;
        sharedProgress = Math.min(selectedMissionMeta.target, sharedProgress + 1);
        if (sharedProgress >= selectedMissionMeta.target) endRound("complete");
      }
      if (defenseRing) defenseRing.material.emissiveIntensity = withinZone ? 3.2 : 1.5;
      if (defenseProgress !== sharedProgress) { defenseProgress = sharedProgress; publishHud(); }
    };
    const showMouseFallback = () => {
      setNotice("MOUSE LOCK BLOCKED · galawin ang mouse sa game area para tumingin");
      window.setTimeout(() => setNotice(""), 3600);
    };
    const requestLock = () => {
      try {
        if (typeof renderer.domElement.requestPointerLock !== "function") { showMouseFallback(); return; }
        const request = renderer.domElement.requestPointerLock();
        if (request && typeof request.catch === "function") request.catch(showMouseFallback);
      } catch { showMouseFallback(); }
    };
    const resetRun = () => {
      spawnTimeouts.forEach((timeout) => window.clearTimeout(timeout)); spawnTimeouts = [];
      enemies.forEach((enemy) => {
        scene.remove(enemy);
        enemy.userData.mixer?.stopAllAction();
        enemy.traverse((part) => {
          if (!part.isMesh) return;
          if (part.geometry && !part.userData.sharedAsset) part.geometry.dispose();
          if (part.userData.ownsMaterial) {
            const parts = Array.isArray(part.material) ? part.material : [part.material];
            parts.forEach((material) => material.dispose());
          }
        });
      });
      enemies.length = 0;
      weaponDrops.forEach((drop) => scene.remove(drop.group));
      weaponDrops.length = 0;
      spawned = 0; kills = 0; shots = 0; hits = 0; score = 0; weaponMode = "m4"; ammo = MAG_SIZE; rifleAmmo = MAG_SIZE; pistolAmmo = 17; akAmmo = AK_MAG_SIZE; hasAk47 = false; health = 100; stamina = 100;
      cannonAmmo = CANNON_MAG_SIZE; cannonReserve = CANNON_MAG_SIZE * 3; cannonReloading = false;
      if (cannonReloadTimeout) window.clearTimeout(cannonReloadTimeout);
      elapsedSeconds = 0; remainingSeconds = selectedMissionMeta.seconds; ammoBoxUsed.clear(); supplyCrates.forEach((crate) => { crate.used = false; crate.statusLamp.material = lampGlow; }); reloading = false; reloadStartedAt = 0; reloadDuration = 0;
      m4MagazineMesh.position.copy(m4MagazineHome); m4MagazineMesh.visible = true;
      pistolMagazineMesh.position.copy(pistolMagazineHome); pistolMagazineMesh.visible = true;
      akMagazineMesh.position.copy(akMagazineHome); akMagazineMesh.visible = true; ak47Model.visible = false;
      rifleModel.visible = true; pistolModel.visible = false;
      reloadMagazineProps.filter((magazine) => magazine.kind === "ak47").forEach((magazine) => { magazine.group.visible = false; });
      muzzleFlash.visible = false; muzzleLight.intensity = 0;
      muzzleFlash = weaponEffects.m4.flash; muzzleLight = weaponEffects.m4.light; muzzleSocket = weaponEffects.m4.muzzle; casingSocket = weaponEffects.m4.casing;
      supportArm.position.set(0, 0, 0);
      collectedIntel = 0;
      for (const pickup of intelPickups) { pickup.collected = false; pickup.group.visible = true; }
      camera.position.set(localSpawnX, PLAYER_EYE_HEIGHT, localSpawnZ); camera.rotation.set(0, 0, 0); pitch = 0; recoil = 0;
      activeVehicle = null;
      vehicleSpeed = 0;
      helicopterForwardSpeed = 0;
      rotorSpeed = 0;
      parachuteActive = false;
      parachuteTemplate.visible = false;
      nextCannonShotAt = 0;
      apc.position.set(-9, 0, 19); apc.rotation.set(0, 0, 0);
      apc.userData.cannon.rotation.set(0, 0, 0);
      apc.userData.cannon.position.copy(apc.userData.cannonHomePosition);
      apc.userData.cannonFlash.intensity = 0;
      helicopter.position.set(9, 0, 19); helicopter.rotation.set(0, 0, 0);
      baseWeapon.visible = true;
      for (const [index, ally] of squadBots.entries()) {
        ally.userData.homePosition.copy(squadHomeFor(index, camera.position, 0));
        ally.position.copy(ally.userData.homePosition);
        ally.userData.engageTargetId = null;
        ally.userData.allyFireAt = performance.now() + 1800 + index * 450;
      }
      for (let index = 0; index < 8; index += 1) spawnEnemy();
      publishHud();
    };
    const startGame = (restart = false) => {
      prepareAudio();
      if (sharedMissionComplete) { changePhase("complete"); return; }
      if (restart || phaseValue === "ready" || phaseValue === "complete" || phaseValue === "failed") {
        if (reloadTimeout) window.clearTimeout(reloadTimeout);
        resetRun();
        roundStartedAt = performance.now();
      } else {
        roundStartedAt = performance.now() - elapsedSeconds * 1000;
      }
      changePhase("playing");
      requestLock();
    };
    const pauseGame = () => {
      if (phaseValue !== "playing") return;
      elapsedSeconds = Math.min(selectedMissionMeta.seconds, (performance.now() - roundStartedAt) / 1000);
      mouseHeld = false; aimingNow = false; setAiming(false);
      changePhase("paused");
      if (document.pointerLockElement === renderer.domElement) document.exitPointerLock();
    };
    launchRef.current = startGame;

    const onPointerLockChange = () => {
      const wasPointerLocked = pointerLocked;
      pointerLocked = document.pointerLockElement === renderer.domElement;
      if (wasPointerLocked && !pointerLocked && phaseValue === "playing") pauseGame();
    };
    const onPointerLockError = () => {
      pointerLocked = false;
      if (phaseValue === "playing") showMouseFallback();
    };
    const onMouseMove = (event) => {
      if (phaseValue !== "playing" || (!pointerLocked && !mount.contains(event.target))) return;
      pitch = THREE.MathUtils.clamp(pitch - event.movementY * 0.00165, -1.15, 1.05);
      if (activeVehicle) {
        activeVehicle.rotation.y -= event.movementX * 0.00165;
        setVehicleCamera();
      } else camera.rotation.y -= event.movementX * 0.00185;
    };
    const onMouseDown = (event) => {
      if (phaseValue !== "playing") return;
      if (!pointerLocked) requestLock();
      if (event.button === 0) mouseHeld = true;
      if (event.button === 2) { aimingNow = true; setAiming(true); }
    };
    const onMouseUp = (event) => {
      if (event.button === 0) mouseHeld = false;
      if (event.button === 2) { aimingNow = false; setAiming(false); }
    };
    const onKeyDown = (event) => {
      if (["Space", "Tab", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.code)) event.preventDefault();
      keys.add(event.code);
      if (event.code === "Escape") pauseGame();
      if (event.code === "KeyR") activeVehicle === apc ? startCannonReload() : startReload();
      if (event.code === "KeyE" && phaseValue === "playing" && !event.repeat) resupply();
      if (event.code === "KeyF" && phaseValue === "playing" && !event.repeat) interactVehicle();
      if (event.code === "Digit1" || event.code === "KeyQ") setWeapon("m4");
      if (event.code === "Digit2") setWeapon("glock");
      if (event.code === "Digit3") setWeapon("ak47");
    };
    const onKeyUp = (event) => keys.delete(event.code);
    const onContextMenu = (event) => event.preventDefault();
    const onResize = () => {
      if (!mount.isConnected) return;
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
      updateRenderResolution();
    };
    renderer.domElement.addEventListener("mousedown", onMouseDown);
    renderer.domElement.addEventListener("contextmenu", onContextMenu);
    document.addEventListener("mouseup", onMouseUp);
    document.addEventListener("pointerlockchange", onPointerLockChange);
    document.addEventListener("pointerlockerror", onPointerLockError);
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("keyup", onKeyUp);
    window.addEventListener("resize", onResize);

    let animationId = 0;
    let renderSamples = 0;
    let renderTimeTotal = 0;
    let lastRenderScale = renderScale;
    const animate = () => {
      if (disposed) return;
      const delta = Math.min(clock.getDelta(), 0.04);
      renderTimeTotal += delta * 1000;
      renderSamples += 1;
      if (renderSamples >= 60) {
        const averageFrameTime = renderTimeTotal / renderSamples;
        if (averageFrameTime > 21.5 && renderScale > 0.64) renderScale = Math.max(0.64, renderScale - 0.1);
        else if (averageFrameTime < 16.5 && renderScale < 1) renderScale = Math.min(1, renderScale + 0.035);
        if (renderScale !== lastRenderScale) {
          lastRenderScale = renderScale;
          updateRenderResolution();
        }
        renderSamples = 0;
        renderTimeTotal = 0;
      }
      const now = performance.now();
      const elapsed = clock.elapsedTime;
      if (networkSocket?.readyState === WebSocket.OPEN && now - lastNetworkSync > 100) {
        const movingNow = phaseValue === "playing" && (keys.has("KeyW") || keys.has("KeyA") || keys.has("KeyS") || keys.has("KeyD"));
        const inDefenseZone = phaseValue === "playing" && defenseZone && Math.hypot(camera.position.x - defenseZone.position.x, camera.position.z - defenseZone.position.z) < 5.5;
        const networkY = activeVehicle ? activeVehicle.position.y : parachuteActive ? Math.max(0, camera.position.y - PLAYER_EYE_HEIGHT) : 0;
        networkSocket.send(JSON.stringify({ type: "state", x: camera.position.x, y: networkY, z: camera.position.z, yaw: camera.rotation.y, health, weapon: weaponMode, vehicle: activeVehicle?.userData.kind || null, parachute: parachuteActive, moving: movingNow, zone: Boolean(inDefenseZone) }));
        lastNetworkSync = now;
      }

      if (phaseValue === "playing") {
        elapsedSeconds = Math.min(selectedMissionMeta.seconds, (now - roundStartedAt) / 1000);
        remainingSeconds = Math.max(0, Math.ceil(selectedMissionMeta.seconds - elapsedSeconds));
        if (elapsedSeconds >= selectedMissionMeta.seconds) endRound("failed");

        const forwardInput = Number(keys.has("KeyW") || keys.has("ArrowUp")) - Number(keys.has("KeyS") || keys.has("ArrowDown"));
        const sideInput = Number(keys.has("KeyD") || keys.has("ArrowRight")) - Number(keys.has("KeyA") || keys.has("ArrowLeft"));
        const sprinting = keys.has("ShiftLeft") || keys.has("ShiftRight");
        const crouching = keys.has("ControlLeft") || keys.has("ControlRight") || keys.has("KeyC");
        const moving = Boolean(forwardInput || sideInput);
        const isSprinting = moving && sprinting && stamina > 3 && !crouching;
        if (isSprinting) { stamina = Math.max(0, stamina - 31 * delta); staminaRefillDelay = 0.75; }
        else if (staminaRefillDelay > 0) staminaRefillDelay -= delta;
        else stamina = Math.min(100, stamina + 20 * delta);

        if (activeVehicle && pointerLocked) {
          if (activeVehicle.userData.kind === "apc") {
            const targetSpeed = forwardInput > 0 ? 9.5 : forwardInput < 0 ? -4.1 : 0;
            vehicleSpeed = THREE.MathUtils.lerp(vehicleSpeed, targetSpeed, 1 - Math.exp(-delta * 1.8));
            activeVehicle.rotation.y += sideInput * (0.32 + Math.abs(vehicleSpeed) * 0.035) * delta * (vehicleSpeed < -0.2 ? -1 : 1);
            activeVehicle.userData.cannon.rotation.x = THREE.MathUtils.lerp(activeVehicle.userData.cannon.rotation.x, THREE.MathUtils.clamp(pitch, -0.32, 0.38), 1 - Math.exp(-delta * 7));
            movementForward.set(-Math.sin(activeVehicle.rotation.y), 0, -Math.cos(activeVehicle.rotation.y));
            movementFrom.copy(activeVehicle.position);
            movementNext.copy(movementFrom).addScaledVector(movementForward, vehicleSpeed * delta);
            if (!playerBlocked(movementFrom, movementNext)) {
              activeVehicle.position.x = THREE.MathUtils.clamp(movementNext.x, -42, 42);
              activeVehicle.position.z = THREE.MathUtils.clamp(movementNext.z, -214, 38);
            } else vehicleSpeed = 0;
            for (const wheel of activeVehicle.userData.wheels) wheel.rotation.x += vehicleSpeed * delta * 0.82;
          } else {
            helicopterForwardSpeed = THREE.MathUtils.lerp(helicopterForwardSpeed, forwardInput * 11.5, 1 - Math.exp(-delta * 1.3));
            activeVehicle.rotation.y += sideInput * 0.66 * delta;
            movementForward.set(-Math.sin(activeVehicle.rotation.y), 0, -Math.cos(activeVehicle.rotation.y));
            activeVehicle.position.addScaledVector(movementForward, helicopterForwardSpeed * delta);
            activeVehicle.position.x = THREE.MathUtils.clamp(activeVehicle.position.x, -48, 48);
            activeVehicle.position.z = THREE.MathUtils.clamp(activeVehicle.position.z, -220, 38);
            const verticalInput = Number(keys.has("Space")) - Number(keys.has("ControlLeft") || keys.has("ControlRight"));
            if (verticalInput) activeVehicle.position.y = THREE.MathUtils.clamp(activeVehicle.position.y + verticalInput * 4.1 * delta, 0, 20);
            else activeVehicle.position.y = THREE.MathUtils.lerp(activeVehicle.position.y, 2.8, 1 - Math.exp(-delta * 1.25));
            activeVehicle.rotation.x = THREE.MathUtils.lerp(activeVehicle.rotation.x, -helicopterForwardSpeed * 0.012, 1 - Math.exp(-delta * 2.8));
            activeVehicle.rotation.z = THREE.MathUtils.lerp(activeVehicle.rotation.z, -sideInput * 0.12, 1 - Math.exp(-delta * 3.2));
            rotorSpeed = THREE.MathUtils.lerp(rotorSpeed, 16, 1 - Math.exp(-delta * 0.5));
            activeVehicle.userData.mainRotor.rotation.y += rotorSpeed * delta;
            activeVehicle.userData.tailRotor.rotation.z += rotorSpeed * delta * 1.8;
          }
          setVehicleCamera();
        } else if (pointerLocked && moving) {
          camera.getWorldDirection(movementForward);
          movementForward.y = 0;
          movementForward.normalize();
          movementRight.crossVectors(movementForward, camera.up).normalize();
          movementStep.copy(movementForward).multiplyScalar(forwardInput).addScaledVector(movementRight, sideInput).normalize();
          const speed = parachuteActive ? 2.8 : isSprinting ? 8.4 : crouching ? 2.5 : 4.7;
          movementStep.multiplyScalar(speed * delta);
          movementFrom.copy(camera.position);
          movementNext.copy(camera.position);
          movementNext.x += movementStep.x;
          if (!playerBlocked(movementFrom, movementNext)) camera.position.x = THREE.MathUtils.clamp(movementNext.x, -42, 42);
          movementNext.copy(camera.position);
          movementNext.z += movementStep.z;
          if (!playerBlocked(movementFrom, movementNext)) camera.position.z = THREE.MathUtils.clamp(movementNext.z, -214, 38);
        }
        if (!activeVehicle && !parachuteActive && pointerLocked && keys.has("Space") && camera.position.y <= PLAYER_EYE_HEIGHT + 0.02) jumpVelocity = 5.1;
        if (parachuteActive) {
          camera.position.y = Math.max(PLAYER_EYE_HEIGHT, camera.position.y - 2.25 * delta);
          parachuteTemplate.position.set(camera.position.x, camera.position.y - PLAYER_EYE_HEIGHT, camera.position.z);
          parachuteTemplate.rotation.z = Math.sin(elapsed * 1.6) * 0.035;
          if (camera.position.y <= PLAYER_EYE_HEIGHT) {
            parachuteActive = false;
            parachuteTemplate.visible = false;
            baseWeapon.visible = true;
            setNotice("LUMAPAG KA NANG LIGTAS");
            window.setTimeout(() => setNotice(""), 1800);
          }
        } else if (!activeVehicle && (camera.position.y > CROUCH_EYE_HEIGHT || jumpVelocity > 0)) {
          jumpVelocity -= 13.6 * delta;
          const baseHeight = crouching ? CROUCH_EYE_HEIGHT : PLAYER_EYE_HEIGHT;
          camera.position.y = Math.max(baseHeight, camera.position.y + jumpVelocity * delta);
          if (camera.position.y === baseHeight) jumpVelocity = 0;
      } else if (!activeVehicle && !crouching) camera.position.y = THREE.MathUtils.lerp(camera.position.y, PLAYER_EYE_HEIGHT, 1 - Math.exp(-12 * delta));

        if (mouseHeld) {
          if (activeVehicle === apc) fireCannon(now);
          else if (!activeVehicle) fire(now);
        }
        updateDefenseZone(delta, now);
        const scopedAiming = aimingNow && weaponMode === "m4" && !reloading && !activeVehicle && !parachuteActive;
        const sprintFov = activeVehicle?.userData.kind === "helicopter" && Math.abs(helicopterForwardSpeed) > 7 ? 82 : activeVehicle?.userData.kind === "apc" && Math.abs(vehicleSpeed) > 6 ? 78 : isSprinting ? 78 : 72;
        const targetFov = scopedAiming ? 19 : aimingNow ? 44 : sprintFov;
        const nextFov = THREE.MathUtils.lerp(camera.fov, targetFov, 1 - Math.exp(-8 * delta));
        if (Math.abs(nextFov - camera.fov) > 0.015) {
          camera.fov = nextFov;
          camera.updateProjectionMatrix();
        }
        recoil = THREE.MathUtils.lerp(recoil, 0, 1 - Math.exp(-10 * delta));
        recoilRoll = THREE.MathUtils.lerp(recoilRoll, 0, 1 - Math.exp(-9 * delta));
        camera.rotation.x = THREE.MathUtils.clamp(pitch + recoil, -1.18, 1.12);
        camera.rotation.z = recoilRoll;
        feetBounce = THREE.MathUtils.lerp(feetBounce, !activeVehicle && moving && !crouching ? Math.sin(elapsed * (isSprinting ? 15 : 10)) * (isSprinting ? 0.025 : 0.014) : 0, delta * 7);
        const targetWeapon = weaponMode === "glock"
          ? (aimingNow ? [0.03, -0.2, -0.52] : [0.16, -0.3 + feetBounce, -0.55])
          : (aimingNow ? [-0.005, -0.2, -0.4] : [0.38, -0.29 + feetBounce, -0.48]);
        const sway = aimingNow ? (moving ? 0.24 : 0.08) : moving ? (isSprinting ? 1 : 0.68) : 0.12;
        const swayRate = isSprinting ? 12 : 7.5;
        const swayX = Math.sin(elapsed * swayRate) * 0.012 * sway;
        const swayY = Math.cos(elapsed * swayRate * 2) * 0.009 * sway;
        const gripPose = firstPersonGripPose[weaponMode];
        const gripPoseBlend = 1 - Math.exp(-14 * delta);
        const firingHandOffset = gripPose.wrist.clone().sub(gripPose.shoulder);
        const firingSleeveDirection = firingHandOffset.clone();
        const firingSleeveReach = firingSleeveDirection.length();
        firingArm.position.lerp(gripPose.shoulder, gripPoseBlend);
        firingHand.position.lerp(firingHandOffset, gripPoseBlend);
        firingHand.quaternion.slerp(new THREE.Quaternion().setFromEuler(gripPose.handRotation), gripPoseBlend);
        firingSleeve.position.lerp(firingHandOffset.clone().multiplyScalar(0.48), gripPoseBlend);
        firingSleeve.quaternion.slerp(
          new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), firingSleeveDirection.normalize()),
          gripPoseBlend,
        );
        firingSleeve.scale.y = THREE.MathUtils.lerp(firingSleeve.scale.y, firingSleeveReach / 0.556, gripPoseBlend);
        playerGear.position.x = Math.sin(elapsed * swayRate) * 0.018 * (moving ? 1 : 0.18);
        playerGear.position.y = -0.91 + feetBounce * 0.55 + swayY * 0.35;
        playerGear.rotation.z = -swayX * 0.22;
        const reloadProgress = reloading && reloadDuration > 0 ? THREE.MathUtils.clamp((now - reloadStartedAt) / reloadDuration, 0, 1) : 0;
        const activeMagazine = weaponMode === "m4" ? m4MagazineMesh : weaponMode === "ak47" ? akMagazineMesh : pistolMagazineMesh;
        const magazineHome = weaponMode === "m4" ? m4MagazineHome : weaponMode === "ak47" ? akMagazineHome : pistolMagazineHome;
        const magazineDrop = weaponMode === "glock" ? 0.78 : 0.68;
        supportArm.visible = weaponMode !== "glock" || reloading;
        if (reloading) {
          if (reloadProgress < 0.35) {
            activeMagazine.visible = true;
            activeMagazine.position.y = magazineHome.y - magazineDrop * THREE.MathUtils.smoothstep(reloadProgress, 0.11, 0.31);
          } else if (reloadProgress < 0.61) activeMagazine.visible = false;
          else {
            activeMagazine.visible = true;
            activeMagazine.position.y = magazineHome.y - magazineDrop * (1 - THREE.MathUtils.smoothstep(reloadProgress, 0.62, 0.84));
          }
          if (reloadSpareMagazine && reloadSpareMagazineStart) {
            const pickupT = THREE.MathUtils.smoothstep(reloadProgress, 0.22, 0.60);
            const gearParent = reloadSpareMagazine.group.parent;
            const magazineParent = activeMagazine.parent;
            magazineParent?.updateWorldMatrix(true, false);
            gearParent?.updateWorldMatrix(true, false);
            const socketWorld = magazineParent ? magazineParent.localToWorld(magazineHome.clone()) : new THREE.Vector3();
            const socketInGear = gearParent ? gearParent.worldToLocal(socketWorld) : reloadSpareMagazine.home.clone();
            reloadSpareMagazine.group.visible = reloadProgress >= 0.18 && reloadProgress < 0.68;
            reloadSpareMagazine.group.position.copy(reloadSpareMagazineStart).lerp(socketInGear, pickupT);
            reloadSpareMagazine.group.position.y += Math.sin(pickupT * Math.PI) * 0.09;
            reloadSpareMagazine.group.rotation.z = THREE.MathUtils.lerp(-0.08, weaponMode === "ak47" ? -0.16 : weaponMode === "m4" ? 0.04 : 0, pickupT);

            reloadSpareMagazine.group.updateWorldMatrix(true, false);
            const grabBlend = THREE.MathUtils.smoothstep(reloadProgress, 0.07, 0.20)
              * (1 - THREE.MathUtils.smoothstep(reloadProgress, 0.64, 0.84));
            supportArm.rotation.set(-0.18 * grabBlend, 0.08 * grabBlend, 0.22 * grabBlend);
            supportArm.updateMatrix();
            const magazineWorld = reloadSpareMagazine.group.getWorldPosition(new THREE.Vector3());
            const magazineRotation = reloadSpareMagazine.group.getWorldQuaternion(new THREE.Quaternion());
            magazineWorld.add(new THREE.Vector3(0, -0.006, 0.052).applyQuaternion(magazineRotation));
            supportArm.parent.updateWorldMatrix(true, false);
            const handTargetInArmParent = supportArm.parent.worldToLocal(magazineWorld);
            const handOffsetInArmParent = supportHand.position.clone().applyMatrix4(supportArm.matrix).sub(supportArm.position);
            const targetArmPosition = handTargetInArmParent.sub(handOffsetInArmParent);
            supportArm.position.copy(supportArmHome).lerp(targetArmPosition, grabBlend);
            supportHand.rotation.set(
              supportHandHomeRotation.x + 0.55 * grabBlend,
              supportHandHomeRotation.y + 0.2 * grabBlend,
              supportHandHomeRotation.z - 0.52 * grabBlend,
            );
            supportHand.userData.fingerGroups.forEach((digit) => {
              digit.rotation.x = digit.userData.homeFlex + 0.52 * grabBlend;
            });
            supportHand.userData.thumb.rotation.x = supportHand.userData.thumbHomeRotation.x + 0.2 * grabBlend;
          }
        } else {
          m4MagazineMesh.position.copy(m4MagazineHome);
          pistolMagazineMesh.position.copy(pistolMagazineHome);
          if (reloadSpareMagazine) {
            reloadSpareMagazine.group.position.copy(reloadSpareMagazine.home);
            reloadSpareMagazine.group.rotation.set(0, 0, 0);
            reloadSpareMagazine.group.visible = true;
          }
          supportArm.position.lerp(supportArmHome, 1 - Math.exp(-18 * delta));
          supportArm.rotation.set(0, 0, 0);
          supportHand.rotation.copy(supportHandHomeRotation);
          supportHand.userData.fingerGroups.forEach((digit) => { digit.rotation.x = digit.userData.homeFlex; });
          supportHand.userData.thumb.rotation.copy(supportHand.userData.thumbHomeRotation);
        }
        baseWeapon.visible = !activeVehicle && !parachuteActive && !scopedAiming;
        playerGear.visible = !scopedAiming;
        baseWeapon.position.x = THREE.MathUtils.lerp(baseWeapon.position.x, targetWeapon[0] + swayX, 1 - Math.exp(-12 * delta));
        const reloadDip = reloading ? Math.sin(reloadProgress * Math.PI) * 0.11 : 0;
        baseWeapon.position.y = THREE.MathUtils.lerp(baseWeapon.position.y, targetWeapon[1] + swayY - reloadDip, 1 - Math.exp(-12 * delta));
        baseWeapon.position.z = THREE.MathUtils.lerp(baseWeapon.position.z, targetWeapon[2] + recoil * 0.72, 1 - Math.exp(-16 * delta));
        const reloadReach = reloading ? THREE.MathUtils.smoothstep(reloadProgress, 0.04, 0.18) * (1 - THREE.MathUtils.smoothstep(reloadProgress, 0.78, 0.96)) : 0;
        baseWeapon.rotation.x = THREE.MathUtils.lerp(baseWeapon.rotation.x, reloading ? 0.12 * reloadReach : 0, 1 - Math.exp(-10 * delta));
        baseWeapon.rotation.z = THREE.MathUtils.lerp(baseWeapon.rotation.z, -swayX * 0.8 + recoilRoll * 1.8 - reloadReach * 0.18, 1 - Math.exp(-10 * delta));

        if (remainingSeconds === 0) endRound("failed");
        if (now - lastHudUpdate > 180) { publishHud(); lastHudUpdate = now; }
      }

      for (const enemy of enemies) {
        if (!enemy.userData.alive) {
          if (now > enemy.userData.deadAt && !enemy.userData.cleaned) { scene.remove(enemy); enemy.userData.cleaned = true; }
          continue;
        }
        enemy.userData.mixer?.update(delta);
        if (phaseValue === "playing") {
          const dx = camera.position.x - enemy.position.x;
          const dz = camera.position.z - enemy.position.z;
          const distance = Math.max(0.1, Math.hypot(dx, dz));
          enemy.rotation.y = Math.atan2(-dx, -dz);
          const approach = distance > 8.5;
          const strafe = Math.sin(elapsed * 0.65 + enemy.userData.phase) * 0.16;
          if (approach) {
            enemy.position.x += (dx / distance) * 1.05 * delta;
            enemy.position.z += (dz / distance) * 1.05 * delta;
          } else {
            enemy.position.x += (dx / distance * 0.22 + strafe) * delta;
            enemy.position.z += (dz / distance * 0.22) * delta;
          }
          enemy.position.x = THREE.MathUtils.clamp(enemy.position.x, -42, 42);
          enemy.position.z = THREE.MathUtils.clamp(enemy.position.z, -210, 30);
          setEnemyMotion(enemy, approach ? "run" : distance > 2.2 ? "walk" : "idle");
          const gait = elapsed * (approach ? 8.8 : 5.1) + enemy.userData.phase;
          enemy.position.y = approach ? Math.abs(Math.sin(gait)) * 0.025 : Math.sin(gait) * 0.012;
          const rigUpdateInterval = distance > 82 ? 180 : distance > 42 ? 72 : 0;
          if (!rigUpdateInterval || now - (enemy.userData.lastPoseAt || 0) >= rigUpdateInterval) {
            poseRiggedSoldier(enemy, elapsed, enemy.userData.motion, enemy.userData.phase);
            enemy.userData.limbs.forEach(({ leg, arm, side }) => {
              const swing = Math.sin(gait) * (approach ? 0.34 : 0.11);
              leg.rotation.x = swing * side;
              arm.rotation.x = -0.22 + Math.sin(gait + Math.PI) * (approach ? 0.11 : 0.035);
              arm.rotation.z = side * (0.04 + Math.sin(gait) * 0.018);
            });
            enemy.userData.lastPoseAt = now;
          }

          if (now > enemy.userData.fireAt && distance < 34) {
            enemy.userData.fireAt = now + 1250 + Math.random() * 1650;
            if (soundRef.current) playRecordedSound("m4", 0.24, 0.92 + Math.random() * 0.16);
            enemy.userData.muzzle.intensity = 17;
            enemy.userData.muzzleOffAt = now + 55;
            const origin = new THREE.Vector3();
            enemy.userData.gun.getWorldPosition(origin);
            const target = camera.position.clone();
            const clearRay = target.clone().sub(origin);
            const shotDistance = clearRay.length();
            clearRay.normalize();
            coverRaycaster.set(origin, clearRay);
            coverRaycaster.far = shotDistance;
            const cover = coverRaycaster.intersectObjects(worldSurfaces, false)[0];
            if (!cover || cover.distance > shotDistance - 0.9) {
              const end = target.clone().add(new THREE.Vector3((Math.random() - 0.5) * 2.1, (Math.random() - 0.5) * 1.8, 0));
              addTracer(origin, end, 0xff6546, 0.15, 0.8);
              if (end.distanceTo(target) < 1.15 && Math.random() > 0.24) {
                health = Math.max(0, health - (7 + Math.floor(Math.random() * 7)));
                setDamagePulse((value) => value + 1);
                publishHud();
                if (health <= 0) endRound("failed");
              }
            } else {
              addImpact(cover.point, 0xd5985d);
            }
          }
        }
        if (now > (enemy.userData.muzzleOffAt || 0)) enemy.userData.muzzle.intensity = 0;
      }

      if (phaseValue === "playing") updateSquadAI(delta, now, elapsed);
      if (now > apc.userData.cannonFlashOffAt) apc.userData.cannonFlash.intensity = 0;
      apc.userData.cannon.position.z = THREE.MathUtils.lerp(apc.userData.cannon.position.z, apc.userData.cannonHomePosition.z, 1 - Math.exp(-delta * 22));
      if (activeVehicle !== helicopter) {
        const patrol = elapsed * 0.12;
        helicopter.position.set(9 + Math.cos(patrol) * 2.1, THREE.MathUtils.lerp(helicopter.position.y, 3.25 + Math.sin(elapsed * 1.4) * 0.16, 1 - Math.exp(-delta * 0.8)), 19 + Math.sin(patrol) * 2.1);
        helicopter.rotation.y = Math.PI - patrol;
        helicopter.rotation.x = Math.sin(elapsed * 0.8) * 0.018;
        helicopter.rotation.z = Math.cos(elapsed * 0.8) * 0.026;
        helicopter.userData.mainRotor.rotation.y += 14 * delta;
        helicopter.userData.tailRotor.rotation.z += 19 * delta;
      }

      for (const remote of remotePlayers.values()) {
        if (remote.userData.targetPosition) {
          remote.position.lerp(remote.userData.targetPosition, 1 - Math.exp(-delta * 14));
          const yawDelta = Math.atan2(Math.sin(remote.userData.targetYaw - remote.rotation.y), Math.cos(remote.userData.targetYaw - remote.rotation.y));
          remote.rotation.y += yawDelta * (1 - Math.exp(-delta * 11));
          if (remote.userData.targetPosition.y <= 0) remote.position.y = remote.userData.targetMoving ? Math.abs(Math.sin(elapsed * 9 + (remote.userData.remoteId || "").length)) * 0.025 : 0;
          if (remote.userData.remoteParachute) {
            remote.userData.remoteParachute.position.set(remote.position.x, remote.position.y, remote.position.z);
            remote.userData.remoteParachute.rotation.z = Math.sin(elapsed * 1.7 + (remote.userData.remoteId || "").length) * 0.035;
          }
          if (remote.userData.remoteVehicle) {
            remote.userData.remoteVehicle.position.set(remote.position.x, THREE.MathUtils.lerp(remote.userData.remoteVehicle.position.y, remote.userData.targetVehicleY || 0, 1 - Math.exp(-delta * 8)), remote.position.z);
            const yawDelta = Math.atan2(Math.sin(remote.userData.targetYaw - remote.userData.remoteVehicle.rotation.y), Math.cos(remote.userData.targetYaw - remote.userData.remoteVehicle.rotation.y));
            remote.userData.remoteVehicle.rotation.y += yawDelta * (1 - Math.exp(-delta * 11));
            const mainRotorCopy = remote.userData.remoteVehicle.getObjectByName("rotor-main");
            const tailRotorCopy = remote.userData.remoteVehicle.getObjectByName("rotor-tail");
            if (mainRotorCopy) mainRotorCopy.rotation.y += 13 * delta;
            if (tailRotorCopy) tailRotorCopy.rotation.z += 20 * delta;
          }
        }
        remote.userData.mixer?.update(delta);
        poseRiggedSoldier(remote, elapsed, remote.userData.targetMoving ? "run" : "idle", (remote.userData.remoteId || "").length);
      }

      for (let index = effects.length - 1; index >= 0; index -= 1) {
        const effect = effects[index];
        effect.life -= delta;
        const fade = Math.max(0, effect.life / effect.maxLife);
        if (effect.type === "line") effect.object.material.opacity = fade * 0.9;
        if (effect.type === "sprite") {
          effect.object.material.opacity = fade * 0.74;
          const growth = 1 + (1 - fade) * (effect.growth || 1.5);
          effect.object.scale.multiplyScalar(growth);
        }
        if (effect.type === "particles") {
          const position = effect.object.geometry.attributes.position;
          for (let p = 0; p < effect.velocities.length; p += 1) {
            const velocity = effect.velocities[p];
            position.array[p * 3] += velocity.x * delta;
            position.array[p * 3 + 1] += velocity.y * delta;
            position.array[p * 3 + 2] += velocity.z * delta;
            velocity.y -= 10 * delta;
          }
          position.needsUpdate = true;
          effect.object.material.opacity = fade;
        }
        if (effect.type === "shell") {
          effect.object.position.addScaledVector(effect.velocity, delta);
          effect.velocity.y -= 8.5 * delta;
          effect.object.rotation.x += delta * 8;
          effect.object.rotation.z += delta * 11;
          if (effect.object.position.y < 0.08) { effect.object.position.y = 0.08; effect.velocity.y *= -0.22; effect.velocity.x *= 0.5; effect.velocity.z *= 0.5; }
        }
        if (effect.life <= 0) { removeEffect(effect); effects.splice(index, 1); }
      }

      for (const plume of smoke) {
        plume.sprite.position.y = plume.baseY + Math.sin(elapsed * 0.28 + plume.phase) * 0.65;
        plume.sprite.position.x += Math.sin(elapsed * 0.08 + plume.phase) * 0.001;
        plume.sprite.material.opacity = 0.09 + (Math.sin(elapsed * 0.42 + plume.phase) + 1) * 0.035;
      }
      for (const pickup of intelPickups) if (!pickup.collected) {
        pickup.group.rotation.y = Math.sin(elapsed * 0.7 + pickup.phase) * 0.18;
        pickup.group.children[1].position.y = 0.34 + Math.sin(elapsed * 1.8 + pickup.phase) * 0.08;
      }
      muzzleFlash.visible = now < nextShotAt - 40 && mouseHeld;
      muzzleLight.intensity = muzzleFlash.visible ? 35 : 0;

      // Let the player glance down toward the vest while reloading without
      // changing the movement/collision height used by gameplay.
      const reloadViewProgress = reloading && reloadDuration > 0
        ? THREE.MathUtils.clamp((now - reloadStartedAt) / reloadDuration, 0, 1)
        : 0;
      const reloadViewBlend = reloading
        ? THREE.MathUtils.smoothstep(reloadViewProgress, 0.04, 0.25)
          * (1 - THREE.MathUtils.smoothstep(reloadViewProgress, 0.76, 0.97))
        : 0;
      const reloadCameraDrop = 0.13 * reloadViewBlend;
      const reloadLookDown = 0.25 * reloadViewBlend;
      camera.position.y -= reloadCameraDrop;
      camera.rotation.x = THREE.MathUtils.clamp(pitch + recoil - reloadLookDown, -1.18, 1.12);
      renderer.render(scene, camera);
      camera.position.y += reloadCameraDrop;
      camera.rotation.x = THREE.MathUtils.clamp(pitch + recoil, -1.18, 1.12);
      animationId = requestAnimationFrame(animate);
    };
    animationId = requestAnimationFrame(animate);

    return () => {
      disposed = true;
      cancelAnimationFrame(animationId);
      if (reloadTimeout) window.clearTimeout(reloadTimeout);
      if (cannonReloadTimeout) window.clearTimeout(cannonReloadTimeout);
      if (supplyToastTimeout) window.clearTimeout(supplyToastTimeout);
      spawnTimeouts.forEach((timeout) => window.clearTimeout(timeout));
      if (networkSocket?.readyState === WebSocket.OPEN || networkSocket?.readyState === WebSocket.CONNECTING) networkSocket.close(1000, "Operation closed");
      for (const id of remotePlayers.keys()) removeRemotePlayer(id);
      renderer.domElement.removeEventListener("mousedown", onMouseDown);
      renderer.domElement.removeEventListener("contextmenu", onContextMenu);
      document.removeEventListener("mouseup", onMouseUp);
      document.removeEventListener("pointerlockchange", onPointerLockChange);
      document.removeEventListener("pointerlockerror", onPointerLockError);
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("resize", onResize);
      if (document.pointerLockElement === renderer.domElement) document.exitPointerLock();
      effects.forEach(removeEffect);
      const releasedMaterials = new Set();
      const releasedTextures = new Set();
      const releaseMaterial = (material) => {
        if (!material || releasedMaterials.has(material)) return;
        releasedMaterials.add(material);
        for (const value of Object.values(material)) {
          if (value?.isTexture && value !== radialTexture && !releasedTextures.has(value)) {
            releasedTextures.add(value);
            value.dispose();
          }
        }
        material.dispose();
      };
      scene.traverse((item) => {
        if (item.isMesh || item.isLine || item.isSprite || item.isPoints) {
          if (item.geometry) item.geometry.dispose();
          if (item.material) {
            const materialsToDispose = Array.isArray(item.material) ? item.material : [item.material];
            materialsToDispose.forEach(releaseMaterial);
          }
        }
      });
      backgroundTexture?.dispose();
      environmentTarget?.dispose();
      Object.values(textures).forEach(releaseMaterial);
      containerMaterials.forEach(releaseMaterial);
      Object.values(enemyMaterials).forEach(releaseMaterial);
      Object.values(weaponMaterials).forEach(releaseMaterial);
      [objectiveGlow, objectiveMetal, wireMat, centerPaint].forEach(releaseMaterial);
      radialTexture.dispose(); signTexture.dispose();
      renderer.dispose();
      renderer.domElement.remove();
      if (audioContext) audioContext.close().catch(() => {});
      launchRef.current = null;
    };
  }, []);

  const accuracyLabel = `${hud.accuracy}%`;
  const intro = phase === "ready";
  const closed = phase === "complete" || phase === "failed";

  return (
    <div className="operation-shell">
      <header className="operation-header">
        <div className="operation-brand"><span className="operation-brand-mark">J</span><div><b>JACOB</b><span>FRONTLINE</span></div></div>
        <div className="operation-header-center"><span className="header-live-dot" /> {networkStatus} / SQUAD 4 · {hud.teamSize} ONLINE <i /> {selectedMapMeta.name} <i /> {selectedMissionMeta.name}</div>
        <div className="account-controls"><span className="account-chip">OPERATOR <b>{playerName}</b></span><button className="account-logout" type="button" onClick={onLogout}>LOG OUT</button>
        <button className={soundOn ? "sound-toggle" : "sound-toggle muted"} type="button" onClick={() => { soundRef.current = !soundRef.current; setSoundOn(soundRef.current); }} aria-label={soundOn ? "Patayin ang tunog" : "Buksan ang tunog"}>{soundOn ? "SOUND ON" : "SOUND OFF"}<span>{soundOn ? "◖" : "◗"}</span></button>
        </div>
      </header>

      <main className={`combat-stage ${phase === "playing" ? "combat-active" : ""}`} ref={stageRef}>
        <div className="world-vignette" />
        <div className="world-grain" />
        <div className="combat-topline">
          <div className="mission-panel"><span className="mission-eyebrow"><i /> MISSION {selectedMissionMeta.id.toUpperCase()} <b>·</b> LIVE CO-OP</span><strong>{phase === "complete" ? "OBJECTIVE COMPLETE" : selectedMissionMeta.name}</strong><small>{selectedMissionMeta.objective} <b>{selectedMissionMeta.id === "defense" ? Math.floor(hud.progress) : hud.progress}/{hud.target}</b></small></div>
          <div className="compass-readout"><span>HEADING</span><b>{hud.heading}</b><i>{hud.heading === "N" ? "000" : hud.heading === "E" ? "090" : hud.heading === "S" ? "180" : hud.heading === "W" ? "270" : "045"}°</i></div>
          <div className="radar" aria-label="Kalapit na hostiles">
            <div className="radar-cross radar-horizontal" /><div className="radar-cross radar-vertical" /><div className="radar-ring radar-ring-one" /><div className="radar-ring radar-ring-two" />
            <span className="radar-player" />
            {hud.radar.map((dot, index) => <i className="radar-enemy" style={{ left: `${dot.x}%`, top: `${dot.y}%` }} key={index} />)}
            <small>RADAR</small>
          </div>
          <div className="mission-clock"><span>TIME REMAINING</span><b className={hud.seconds <= 20 ? "clock-critical" : ""}>{String(Math.floor(hud.seconds / 60)).padStart(2, "0")}:{String(hud.seconds % 60).padStart(2, "0")}</b><small>LOCAL 06:40</small></div>
        </div>

        {phase === "playing" && <>
          {aiming && hud.weapon === "m4" && !hud.reloading ? <div className="scope-overlay" aria-label="Magnified rifle scope view"><span className="scope-crosshair" /></div> : <div className={aiming ? "combat-reticle ads-reticle" : "combat-reticle"} aria-hidden="true"><i /><i /><i /><i /><b /></div>}
          <div key={hitPulse} className={hitPulse ? "hit-confirmation visible" : "hit-confirmation"} aria-hidden="true"><i /><i /><i /><i /></div>
          <div key={damagePulse} className={damagePulse ? "damage-vignette pulse" : "damage-vignette"} aria-hidden="true" />
          {hud.nearWeapon && <div className="supply-prompt weapon-pickup-prompt"><kbd>E</kbd> PICK UP <b>{hud.nearWeapon}</b> <span>· add to arsenal</span></div>}
          {!hud.nearWeapon && hud.nearIntel && <div className="supply-prompt"><kbd>E</kbd> RECOVER INTEL <span>· shared objective</span></div>}
          {hud.nearDefense && <div className="supply-prompt"><kbd>ZONE</kbd> HOLD THE LINE <span>· team progress</span></div>}
          {!hud.nearWeapon && !hud.nearIntel && hud.nearSupply && <div className="supply-prompt"><kbd>E</kbd> RESUPPLY <span>· ammo + health</span></div>}
          {hud.vehicleLabel && <div className="supply-prompt vehicle-prompt"><kbd>F</kbd> {hud.vehicleLabel} <span>· vehicle</span></div>}
          {hud.nearHouse && <div className="house-prompt">OPEN HOUSE <span>· CLEAR THE ROOM</span></div>}
          {notice && <div className="combat-notice">{notice}</div>}
        </>}

        <div className="combat-bottomline">
          <div className="health-panel"><div className="health-label"><span>VITALS</span><b>{String(hud.health).padStart(3, "0")}</b></div><div className="health-track"><i style={{ width: `${hud.health}%` }} /></div><div className="stamina-track"><span>STAMINA</span><i><b style={{ width: `${hud.stamina}%` }} /></i></div></div>
          <div className="bottom-objective"><span>TEAM OBJECTIVE</span><b>{closed && phase === "complete" ? "AREA SECURED" : selectedMissionMeta.objective}</b><small>{selectedMissionMeta.id === "assault" ? `${hud.progress} OF ${hud.target} TEAM ELIMINATIONS` : selectedMissionMeta.id === "intel" ? `${hud.progress} OF ${hud.target} DATA DRIVES` : `${Math.floor(hud.progress)} OF ${hud.target} SECONDS HELD`}</small></div>
          <div className="weapon-status"><div className="weapon-text"><span>{hud.weapon === "cannon" ? "VEHICLE / MAIN CANNON" : hud.weapon === "glock" ? "SECONDARY / SIDEARM" : hud.weapon === "ak47" ? "LOOTED / ASSAULT RIFLE" : "PRIMARY / ASSAULT RIFLE"}</span><b>{hud.weapon === "cannon" ? <>APC <i>75 MM</i></> : hud.weapon === "ak47" ? <>AK-47 <i>RIFLE</i></> : hud.weapon === "m4" ? <>M4A1 <i>CARBINE</i></> : <>GLOCK <i>17</i></>}</b><small>{hud.reloading ? "RELOADING" : hud.weapon === "cannon" ? "HE SHELL · LMB FIRE · R RELOAD" : hud.weapon === "ak47" ? "7.62 x 39 MM - FULL AUTO" : hud.weapon === "m4" ? "5.56 x 45 MM - SEMI / AUTO" : "9 x 19 MM - SEMI-AUTO"}</small></div><strong>{String(hud.ammo).padStart(2, "0")}<small> / {hud.ammoMax}</small></strong><div className="ammo-pips">{Array.from({ length: hud.ammoMax }, (_, index) => <i className={index < hud.ammo ? "loaded" : ""} key={index} />)}</div></div>
        </div>

        {error && <div className="mission-overlay"><div className="mission-card"><span className="mission-kicker">GRAPHICS ERROR</span><h1>Hindi mabuksan<br /><em>ang mission.</em></h1><p>{error}</p></div></div>}
        {!error && phase !== "playing" && <div className="mission-overlay">
          <div className="overlay-grid-mark" />
          <section className="mission-card">
            <div className="mission-kicker"><i /> JACOB: FRONTLINE <span>·</span> {selectedMapMeta.region}</div>
            <h1>{intro ? <>{selectedMissionMeta.name.split(" ")[0]}<br /><em>operation.</em></> : phase === "paused" ? <>Naka-pause ang<br /><em>mission.</em></> : phase === "complete" ? <>Objective<br /><em>complete.</em></> : <>Mission<br /><em>failed.</em></>}</h1>
            <p>{intro ? `${selectedMapMeta.name}: ${selectedMissionMeta.description} Kasama mo agad ang tatlong AI squadmates; maaari ring makalaro ang hanggang pitong online operator.` : phase === "paused" ? "Naka-hinto ang operasyon. Bumalik sa mission kapag handa ka na." : phase === "complete" ? `Natapos ng team ang objective. ${hud.kills} hostile ang na-neutralize at ${accuracyLabel} ang accuracy mo.` : `Hindi natapos ang mission. ${hud.kills} hostile ang na-neutralize.`}</p>
            <div className="briefing-data"><div><span>DEPLOYMENT</span><b>{selectedMapMeta.name}</b></div><div><span>MISSION</span><b>{selectedMissionMeta.name}</b></div><div><span>TIME LIMIT</span><b>{String(Math.floor(selectedMissionMeta.seconds / 60)).padStart(2, "0")} MIN</b></div></div>
            <div className="control-guide">
              <div><span className="key-cluster"><kbd>W</kbd><span><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd></span></span><small>MOVE</small></div>
              <div><kbd className="key-wide">SHIFT</kbd><small>SPRINT</small></div>
              <div><kbd className="key-wide">MOUSE</kbd><small>AIM / FIRE</small></div>
              <div><kbd className="key-wide">R</kbd><small>RELOAD</small></div>
              <div><kbd className="key-wide">E</kbd><small>RESUPPLY / PICK UP</small></div>
              <div><kbd className="key-wide">F</kbd><small>BOARD / EXIT · HELI EXIT HAS PARACHUTE</small></div>
              <div><kbd className="key-wide">SPACE / CTRL</kbd><small>HELI UP / DOWN</small></div>
              <div><kbd className="key-wide">1 / 2 / 3</kbd><small>SWITCH WEAPON</small></div>
            </div>
            <div className="mission-actions">
              <button className="deploy-button" type="button" onClick={() => launchRef.current?.(phase !== "paused")}>{intro ? "DEPLOY TO OPERATION" : phase === "paused" ? "IPAGPATULOY ANG MISSION" : phase === "complete" ? "ULITIN ANG MISSION" : "SUBUKAN MULI"}<span>↗</span></button>
              {onBackToMaps && <button className="mission-map-button" type="button" onClick={onBackToMaps}>PALITAN ANG MAPA</button>}
              <small>ESC TO PAUSE <i /> DESKTOP CONTROLS RECOMMENDED</small>
            </div>
          </section>
          <div className="overlay-coordinates"><span>14°35' N</span><i /><span>120°58' E</span><i /><span>06:40:12</span></div>
        </div>}
      </main>

      <footer className="operation-footer"><span><i /> DEPLOYMENT STATUS <b>{phase === "playing" ? "ACTIVE" : phase === "complete" ? "SUCCESS" : phase === "failed" ? "FAILED" : phase === "paused" ? "PAUSED" : "STANDBY"}</b></span><span>WEBGL RENDER <b>THREE.JS</b></span><span className="footer-controls">WASD MOVE <i /> 1 / 2 / 3 WEAPON <i /> SHIFT SPRINT <i /> F VEHICLE <i /> LMB FIRE</span></footer>
    </div>
  );
}

function LoginPage({ onAuthenticated }) {
  const [mode, setMode] = useState("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const glassPanelRef = useRef(null);
  const creating = mode === "create";

  const updateGlassTilt = (event) => {
    const panel = glassPanelRef.current;
    if (!panel || event.pointerType === "touch") return;
    const bounds = panel.getBoundingClientRect();
    const horizontal = (event.clientX - bounds.left) / bounds.width - 0.5;
    const vertical = (event.clientY - bounds.top) / bounds.height - 0.5;
    panel.style.setProperty("--tilt-x", `${horizontal * 3.2}deg`);
    panel.style.setProperty("--tilt-y", `${vertical * -3.2}deg`);
    panel.style.setProperty("--pointer-x", `${event.clientX - bounds.left}px`);
    panel.style.setProperty("--pointer-y", `${event.clientY - bounds.top}px`);
  };
  const resetGlassTilt = () => {
    const panel = glassPanelRef.current;
    if (!panel) return;
    panel.style.setProperty("--tilt-x", "0deg");
    panel.style.setProperty("--tilt-y", "0deg");
    panel.style.setProperty("--pointer-x", "50%");
    panel.style.setProperty("--pointer-y", "50%");
  };

  const authenticate = async (action, accountName, accountPassword) => {
    setError("");
    const normalizedName = accountName.trim();
    if (normalizedName.length < 3) { setError("Gumamit ng username na may hindi bababa sa 3 character."); return; }
    if (accountPassword.length < 8) { setError("Kailangan ng password na hindi bababa sa 8 character."); return; }
    setBusy(true);
    try {
      const response = await fetch(`/api/auth/${action}`, { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "same-origin", body: JSON.stringify({ username: normalizedName, password: accountPassword }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Hindi natuloy ang login.");
      onAuthenticated(result.user);
    } catch (authError) {
      setError(authError instanceof TypeError ? "Hindi makakonekta sa game server. Buksan ang site sa localhost o simulan muli ang server." : authError.message || "Hindi natuloy ang login. Subukan ulit.");
    } finally { setBusy(false); }
  };
  const submit = (event) => {
    event.preventDefault();
    authenticate(creating ? "register" : "login", username, password);
  };
  const demoLogin = () => {
    setMode("login"); setUsername("demo"); setPassword("JacobDemo2026!");
    authenticate("login", "demo", "JacobDemo2026!");
  };

  return (
    <main className="login-shell">
      <div className="login-glass-scene" aria-hidden="true">
        <svg className="login-glass-ribbons" viewBox="0 0 1000 620" preserveAspectRatio="none">
          <defs>
            <linearGradient id="glass-ribbon-spectrum" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#6734ff" />
              <stop offset=".28" stopColor="#ef35a0" />
              <stop offset=".57" stopColor="#ff663e" />
              <stop offset=".78" stopColor="#f0b42f" />
              <stop offset="1" stopColor="#a8ed37" />
            </linearGradient>
            <linearGradient id="glass-ribbon-lower" x1="0" y1="0" x2="1" y2=".35">
              <stop offset="0" stopColor="#602cff" />
              <stop offset=".38" stopColor="#e735b1" />
              <stop offset=".7" stopColor="#ff703c" />
              <stop offset="1" stopColor="#d8f33c" />
            </linearGradient>
          </defs>
          <g className="glass-ribbon glass-ribbon-top">
            <path className="glass-ribbon-shadow" d="M-130 142 C42 -8 162 12 257 104 S401 225 510 126 682 18 770 105 918 224 1130 73" />
            <path className="glass-ribbon-line" d="M-130 142 C42 -8 162 12 257 104 S401 225 510 126 682 18 770 105 918 224 1130 73" />
            <path className="glass-ribbon-refraction" d="M-130 142 C42 -8 162 12 257 104 S401 225 510 126 682 18 770 105 918 224 1130 73" />
            <path className="glass-ribbon-glint" d="M-130 119 C42 -31 162 -11 257 81 S401 202 510 103 682 -5 770 82 918 201 1130 50" />
          </g>
          <g className="glass-ribbon glass-ribbon-middle">
            <path className="glass-ribbon-shadow" d="M-145 345 C7 207 139 190 247 270 S411 417 526 310 695 177 806 260 970 412 1145 250" />
            <path className="glass-ribbon-line glass-ribbon-line-middle" d="M-145 345 C7 207 139 190 247 270 S411 417 526 310 695 177 806 260 970 412 1145 250" />
            <path className="glass-ribbon-refraction" d="M-145 345 C7 207 139 190 247 270 S411 417 526 310 695 177 806 260 970 412 1145 250" />
            <path className="glass-ribbon-glint" d="M-145 322 C7 184 139 167 247 247 S411 394 526 287 695 154 806 237 970 389 1145 227" />
          </g>
          <g className="glass-ribbon glass-ribbon-bottom">
            <path className="glass-ribbon-shadow glass-ribbon-shadow-lower" d="M-150 548 C20 401 169 375 288 456 S451 592 579 496 751 374 864 462 1005 580 1150 442" />
            <path className="glass-ribbon-line glass-ribbon-line-lower" d="M-150 548 C20 401 169 375 288 456 S451 592 579 496 751 374 864 462 1005 580 1150 442" />
            <path className="glass-ribbon-refraction" d="M-150 548 C20 401 169 375 288 456 S451 592 579 496 751 374 864 462 1005 580 1150 442" />
            <path className="glass-ribbon-glint" d="M-150 525 C20 378 169 352 288 433 S451 569 579 473 751 351 864 439 1005 557 1150 419" />
          </g>
        </svg>
        <div className="glass-scene-orb glass-scene-orb-one" />
        <div className="glass-scene-orb glass-scene-orb-two" />
      </div>
      <div
        className="login-glass-panel"
        ref={glassPanelRef}
        onPointerMove={updateGlassTilt}
        onPointerLeave={resetGlassTilt}
      >
      <section className="login-hero">
        <div className="login-hero-sweep" />
        <div className="login-world-shape login-world-shape-back" />
        <div className="login-world-shape login-world-shape-front" />
        <div className="login-road" />
        <div className="login-radar"><i /><i /><i /><b /></div>
        <div className="login-hero-brand"><span>J</span><div><b>JACOB</b><small>TACTICAL FPS</small></div></div>
        <div className="login-hero-copy"><small><i /> INDEPENDENT CAMPAIGN / 3 OPERATIONS</small><h1>TAKE BACK<br /><em>THE FRONTLINE</em></h1><p>Mag-deploy sa tatlong mapa, pumasok sa mga gusali, at piliin ang tamang armas para sa bawat laban.</p></div>
        <div className="login-hero-footer"><span>TACTICAL SIMULATION</span><b>14°35' N <i /> 120°58' E</b></div>
      </section>
      <section className="login-card">
        <div className="login-mark">J<span>OPS</span></div>
        <div className="login-kicker"><i /> OPERATOR ACCESS / SERVER ACCOUNT</div>
        <h1>{creating ? <>CREATE YOUR<br /><em>OPERATOR ID</em></> : <>WELCOME<br /><em>BACK, OPERATOR</em></>}</h1>
        <p className="login-intro">{creating ? "Gumawa ng account para maglaro sa alinmang device na may access sa server." : "Mag-sign in para bumalik sa campaign at makasama ang ibang operators."}</p>
        <form className="login-form" onSubmit={submit}>
          <label htmlFor="operator-name">OPERATOR USERNAME</label>
          <input id="operator-name" type="text" autoComplete="username" minLength={3} maxLength={24} value={username} onChange={(event) => setUsername(event.target.value)} placeholder="Ilagay ang username" required />
          <label htmlFor="operator-password">PASSWORD</label>
          <div className="login-password-wrap"><input id="operator-password" type={showPassword ? "text" : "password"} autoComplete={creating ? "new-password" : "current-password"} minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Hindi bababa sa 8 character" required /><button type="button" className="password-peek" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? "Itago ang password" : "Ipakita ang password"}>{showPassword ? "HIDE" : "SHOW"}</button></div>
          {error && <p className="login-error" role="alert">{error}</p>}
          <button className="login-submit" type="submit" disabled={busy}>{busy ? "SANDALI…" : creating ? "GUMAWA NG ACCOUNT" : "MAG-LOG IN"}<span>→</span></button>
        </form>
        <button className="login-mode-toggle" type="button" onClick={() => { setError(""); setMode(creating ? "login" : "create"); }}>{creating ? "May account ka na? Mag-log in" : "Bagong operator? Gumawa ng account"}</button>
        <button className="demo-login-button" type="button" onClick={demoLogin} disabled={busy}><span>TRY THE CO-OP DEMO</span><b>demo <i>/</i> JacobDemo2026!</b><small>MAGLARO AGAD SA DEMO ACCOUNT</small></button>
        <div className="login-divider"><span>ACCESS DETAILS</span></div>
        <p className="login-local-note">Server-side scrypt password hash at HttpOnly session. Gumamit ng localhost o HTTPS para sa personal account. Pampublikong demo lang ang demo login.</p>
      </section>
      <div className="login-side-note"><span>SECTOR 04 <i /> SAN ISIDRO</span><b>MISSION ACCESS<br />RESTRICTED</b><small>TACTICAL TRAINING · AI SQUAD / ONLINE CO-OP</small></div>
      </div>
    </main>
  );
}

function createSkinMaterial() {
  const size = 512;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");
  context.fillStyle = "#b78065";
  context.fillRect(0, 0, size, size);
  let seed = 7193;
  const random = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
  for (let patch = 0; patch < 120; patch += 1) {
    const light = random() > 0.48;
    const shade = light ? "rgba(238,190,157,.045)" : "rgba(79,42,33,.035)";
    const radius = 5 + random() * 26;
    context.fillStyle = shade;
    context.beginPath();
    context.ellipse(random() * size, random() * size, radius * 1.2, radius, random() * Math.PI, 0, Math.PI * 2);
    context.fill();
  }
  for (let pore = 0; pore < 3000; pore += 1) {
    const light = random() > 0.52;
    context.fillStyle = light ? "rgba(244,205,179,.10)" : "rgba(74,43,35,.085)";
    context.beginPath();
    context.ellipse(random() * size, random() * size, 0.35 + random() * 0.8, 0.45 + random() * 1.1, random() * Math.PI, 0, Math.PI * 2);
    context.fill();
  }
  const colorMap = new THREE.CanvasTexture(canvas);
  colorMap.colorSpace = THREE.SRGBColorSpace;
  colorMap.wrapS = THREE.RepeatWrapping;
  colorMap.wrapT = THREE.RepeatWrapping;

  const bumpCanvas = document.createElement("canvas");
  bumpCanvas.width = size;
  bumpCanvas.height = size;
  const bumpContext = bumpCanvas.getContext("2d");
  const bumpPixels = bumpContext.createImageData(size, size);
  for (let pixel = 0; pixel < bumpPixels.data.length; pixel += 4) {
    const value = 120 + Math.floor(random() * 16);
    bumpPixels.data[pixel] = value;
    bumpPixels.data[pixel + 1] = value;
    bumpPixels.data[pixel + 2] = value;
    bumpPixels.data[pixel + 3] = 255;
  }
  bumpContext.putImageData(bumpPixels, 0, 0);
  const bumpMap = new THREE.CanvasTexture(bumpCanvas);
  bumpMap.wrapS = THREE.RepeatWrapping;
  bumpMap.wrapT = THREE.RepeatWrapping;
  return new THREE.MeshStandardMaterial({ map: colorMap, bumpMap, bumpScale: 0.0025, color: 0xffffff, roughness: 0.83, metalness: 0 });
}

function createCamouflageMaterial() {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const context = canvas.getContext("2d");
  const colors = ["#303c2b", "#49523a", "#747052", "#8c8263", "#252e24"];
  context.fillStyle = colors[0];
  context.fillRect(0, 0, canvas.width, canvas.height);
  let seed = 8341;
  const random = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
  for (let i = 0; i < 1250; i += 1) {
    const color = colors[Math.floor(random() * colors.length)];
    const x = random() * canvas.width;
    const y = random() * canvas.height;
    const width = 6 + random() * 32;
    const height = 5 + random() * 25;
    context.fillStyle = color;
    context.globalAlpha = 0.48 + random() * 0.4;
    context.beginPath();
    context.ellipse(x, y, width, height, random() * Math.PI, 0, Math.PI * 2);
    context.fill();
  }
  context.globalAlpha = 1;
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1.35, 1.4);
  texture.anisotropy = 4;
  return new THREE.MeshStandardMaterial({ map: texture, color: 0xffffff, roughness: 0.96, metalness: 0 });
}

function MapSelectionPage({ playerName, selectedMap, selectedMission, onSelectMap, onSelectMission, onDeploy, onLogout }) {
  const currentMap = MAPS[selectedMap] || MAPS.barangay;
  const currentMission = MISSIONS[selectedMission] || MISSIONS.assault;
  return (
    <main className="map-select-shell">
      <header className="map-select-header">
        <div className="operation-brand"><span className="operation-brand-mark">J</span><div><b>JACOB</b><span>FRONTLINE</span></div></div>
        <div className="map-select-status"><i /> SQUAD + 8-PLAYER CO-OP <b>AUTO-MATCH BY MAP + MISSION</b></div>
        <div className="map-select-account"><span>OPERATOR <b>{playerName}</b></span><button type="button" onClick={onLogout}>SIGN OUT</button></div>
      </header>
      <section className="map-select-content">
        <div className="map-select-intro"><div><span className="map-select-kicker"><i /> CO-OP OPERATIONS / QUICK MATCH</span><h1>CHOOSE YOUR<br /><em>DEPLOYMENT.</em></h1><p>Pumili ng lugar at mission. May tatlong squadmates ka kahit wala pang online na operator.</p></div><div className="map-select-coordinates"><span>ACTIVE OPERATOR</span><b>{playerName.toUpperCase()}</b><small>3 SQUADMATES / UP TO 8 ONLINE OPERATORS</small></div></div>
        <div className="map-cards">
          {Object.values(MAPS).map((map) => (
            <button key={map.id} type="button" className={`map-card map-card-${map.id}${selectedMap === map.id ? " selected" : ""}`} onClick={() => onSelectMap(map.id)} aria-pressed={selectedMap === map.id}>
              <div className="map-card-art" aria-hidden="true"><div className="map-art-sky" /><div className="map-art-ridge map-art-ridge-one" /><div className="map-art-ridge map-art-ridge-two" /><div className="map-art-road" /><div className="map-art-scan" /><span className="map-art-marker">{map.code}</span><small>{map.mood}</small></div>
              <div className="map-card-copy"><span>{map.code} / {map.region}</span><b>{map.name}</b><p>{map.description}</p><small>{selectedMap === map.id ? "SELECTED LOCATION" : "SELECT TO PREVIEW"}</small></div>
            </button>
          ))}
        </div>
        <section className="mission-select-section"><div className="mission-select-heading"><span>OPERATION BOARD</span><small>3 MISSIONS / SHARED MATCHMAKING</small></div><div className="mission-select-grid">{Object.values(MISSIONS).map((mission, index) => <button key={mission.id} type="button" className={`mission-choice${selectedMission === mission.id ? " selected" : ""}`} onClick={() => onSelectMission(mission.id)} aria-pressed={selectedMission === mission.id}><span>OPERATION 0{index + 1} / {Math.floor(mission.seconds / 60)} MIN</span><b>{mission.name}</b><p>{mission.description}</p><small>{selectedMission === mission.id ? "SELECTED OPERATION" : mission.objective}</small></button>)}</div></section>
        <footer className="map-select-footer"><div><span>DEPLOYMENT / OPERATION</span><b>{currentMap.name} / {currentMission.name}</b><small>{currentMap.region} / {currentMission.objective}</small></div><button type="button" className="map-deploy-button" onClick={() => onDeploy(selectedMap, selectedMission)}>DEPLOY TO {currentMap.name}<span>→</span></button></footer>
      </section>
      <div className="map-select-bottomline"><span>JACOB: FRONTLINE <i /> CO-OP FIELD OPERATIONS</span><span>3 AI SQUADMATES <i /> UP TO 8 ONLINE OPERATORS</span></div>
    </main>
  );
}

function FpsGame() {
  const [playerName, setPlayerName] = useState("");
  const [selectedMap, setSelectedMap] = useState("barangay");
  const [selectedMission, setSelectedMission] = useState("assault");
  const [deployed, setDeployed] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  useEffect(() => { document.title = "JACOB: FRONTLINE - Tactical FPS"; }, []);
  useEffect(() => {
    let active = true;
    fetch("/api/auth/session", { credentials: "same-origin" }).then(async (response) => {
      if (!response.ok) return null;
      return response.json();
    }).then((result) => { if (active && result?.user) setPlayerName(result.user.displayName); }).catch(() => {}).finally(() => { if (active) setAuthReady(true); });
    return () => { active = false; };
  }, []);
  const login = (user) => {
    setPlayerName(user.displayName || user.username);
  };
  const logout = async () => {
    try { await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" }); } catch { /* Return to the login screen if the server is unavailable. */ }
    setPlayerName("");
    setDeployed(false);
  };
  if (!authReady) return <main className="auth-loading"><span className="auth-loading-mark">J</span><b>JACOB: FRONTLINE</b><small>CONNECTING TO THE OPERATION SERVER</small></main>;
  if (!playerName) return <LoginPage onAuthenticated={login} />;
  if (!deployed) return <MapSelectionPage playerName={playerName} selectedMap={selectedMap} selectedMission={selectedMission} onSelectMap={setSelectedMap} onSelectMission={setSelectedMission} onDeploy={(map, mission) => { setSelectedMap(map); setSelectedMission(mission); setDeployed(true); }} onLogout={logout} />;
  return <FpsArena key={`${selectedMap}:${selectedMission}`} playerName={playerName} mapId={selectedMap} missionId={selectedMission} onLogout={logout} onBackToMaps={() => setDeployed(false)} />;
}

export default FpsGame;
