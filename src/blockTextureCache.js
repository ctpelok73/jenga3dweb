// Texture cache for block materials. Lives in its own module (no three.js
// import) so SettingsPanel can call clearTextureCache without dragging the
// THREE chunk into the initial bundle. The .dispose() calls work via duck
// typing on whatever the producer stored.

export const textureCache = new Map();
export const themeMapCache = new Map();

export function clearTextureCache() {
  textureCache.forEach((props) => {
    if (props.map) props.map.dispose();
  });
  textureCache.clear();
  themeMapCache.forEach((maps) => {
    if (maps.normalMap) maps.normalMap.dispose();
    if (maps.roughnessMap) maps.roughnessMap.dispose();
  });
  themeMapCache.clear();
}
