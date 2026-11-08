/* Ponte per Three.js r187 (moduli ES) -> THREE globale, poi carica in ordine gli script del gioco.
   S3_LK: dal r165 le luci non hanno piu' il modo "legacy": le intensita' di prima vanno moltiplicate per PI. */
import * as T from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { clone } from "three/addons/utils/SkeletonUtils.js";
window.THREE = Object.assign({}, T, { GLTFLoader, SkeletonUtils: { clone } });
window.S3_LK = Math.PI;
const list = window.__GAME_SCRIPTS || [];
for (const src of list) {
  await new Promise((ok, ko) => { const s = document.createElement("script"); s.src = src; s.async = false; s.onload = ok; s.onerror = () => ko(new Error("script " + src)); document.body.appendChild(s); });
}
