const { FusesPlugin } = require("@electron-forge/plugin-fuses");
const { FuseV1Options, FuseVersion } = require("@electron/fuses");

module.exports = {
  packagerConfig: {
    icon: "./assets/icons/app", // extension inferred per platform
    asar: true,
  },
  rebuildConfig: {},
  makers: [
    {
      name: "@electron-forge/maker-squirrel",
      config: {
        setupIcon: "./assets/icons/app.ico", // installer icon
        iconUrl: "https://raw.githubusercontent.com/MoshRadix/mosh-forms-app/refs/heads/master/assets/icons/app.ico", // public URL to your .ico file
        shortcutName: "Mosh Forms App", // shortcut name in Start Menu/Desktop
        noMsi: true, // skip MSI, only generate .exe
      },
    },
    {
      name: "@electron-forge/maker-zip",
      platforms: ["darwin"],
    },
    {
      name: "@electron-forge/maker-deb",
      config: {},
    },
    {
      name: "@electron-forge/maker-rpm",
      config: {},
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
<<<<<<< HEAD
        draft: true,
        authToken: process.env.GITHUB_TOKEN   // uses the token from .env
=======
        draft: false,
<<<<<<< HEAD
        process.env.GITHUB_TOKEN   // uses the token from .env
=======
<<<<<<< HEAD
        authToken: process.env.GITHUB_TOKEN   // uses the token from .env
>>>>>>> 4a85667 (removed sensitive information)
>>>>>>> 2e056fe (few changes to the auto updater)
=======
        authToken: process.env.GITHUB_TOKEN   // uses the token from .env
>>>>>>> 301d5b5 (removed sensitive information)
      }
    }
  ],
  plugins: [
    {
      name: "@electron-forge/plugin-auto-unpack-natives",
      config: {},
    },
    // Fuses are used to enable/disable various Electron functionality
    // at package time, before code signing the application
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true,
    }),
  ],

};
