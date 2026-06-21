/**
 * @file wallpaper-preload.js
 * @description Preload script for the hidden, off-screen BrowserWindow used
 * solely to render the Dynamic Wallpaper template before it gets captured as
 * a PNG by the main process. Deliberately tiny — this window never shows any
 * UI to the user and never needs the full electronAPI surface.
 */

const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("wallpaperBridge", {
  /** Registers a one-time listener for the data payload sent by main. */
  onData: (callback) => {
    ipcRenderer.once("wallpaper:data", (event, payload) => callback(payload));
  },

  /** Tells main the template has finished painting and is ready to be captured. */
  ready: () => ipcRenderer.send("wallpaper-render-ready"),
});