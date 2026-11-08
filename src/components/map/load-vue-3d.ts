/**
 * The Vue 3D's one door (#95): its renderer and CesiumJS behind it, fetched the first time the 3D
 * is chosen. A dynamic import, so the bundler gives them a chunk of their own and `/` never
 * downloads them — `./load-vue-3d.test.ts` builds the app and checks that it does not. Nothing else
 * may import `./vue-3d-renderer.ts` but for its types: one static import would pull the renderer
 * back into the Page's chunk.
 */
export function loadVue3d() {
  return import("./vue-3d-renderer.ts");
}
