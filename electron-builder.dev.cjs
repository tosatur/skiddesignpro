const { build } = require("./package.json");

module.exports = {
  ...build,
  appId: "com.spn.skiddesigner.dev",
  productName: "SPN Skid Designer Dev",
  directories: { ...build.directories, output: "release/dev" },
  extraMetadata: {
    name: "spn-skid-designer-dev",
    productName: "SPN Skid Designer Dev",
    main: "electron/dev.js",
  },
  artifactName: "SPN-Skid-Designer-Dev-${version}-portable.${ext}",
};
