/**
 * @file forge.config.js
 * @description Build & packaging rules for Mosh Forms App.
 */

const { FusesPlugin } = require("@electron-forge/plugin-fuses");
const { FuseV1Options, FuseVersion } = require("@electron/fuses");

module.exports = {
  packagerConfig: {
    icon: "./assets/icons/app", 
    asar: true, // Optimizes loading speeds by packing files into an archive
  },
  rebuildConfig: {},
  makers: [
    {
      name: "@electron-forge/maker-squirrel", // Windows builds
      config: {
        setupIcon: "./assets/icons/app.ico",
        iconUrl: "https://raw.githubusercontent.com/MoshRadix/mosh-forms-app/refs/heads/master/assets/icons/app.ico",
        shortcutName: "Mosh Forms App",
        noMsi: true,
      },
    },
    {
      name: "@electron-forge/maker-zip", // macOS builds
      platforms: ["darwin"],
    },
  ],
  publishers: [
    {
      name: '@electron-forge/publisher-github',
      config: {
        repository: {
          owner: 'moshradix',
          name: 'mosh-forms-app'
        },
        prerelease: false,
        draft: false,
        authToken: process.env.GITHUB_TOKEN, // Ingested securely from .env file
      }
    }
  ],
  plugins: [
    {
      name: "@electron-forge/plugin-auto-unpack-natives",
      config: {},
    },
    // Fuses harden the final executable binary against runtime code-injection exploits
    new FusesPlugin({
      version: FuseVersion.V1,
      resetAdHocCodeSigning: true,
      fuses: {
        [FuseV1Options.RunAsNode]: false, // Prevents malicious scripts from hijacking the binary via CLI flags
        [FuseV1Options.EnableCookieEncryption]: true,
        [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
        [FuseV1Options.EnableNodeCliInspectArguments]: false,
        [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true, // Verifies ASAR code has not been altered
      },
    }),
  ],
};