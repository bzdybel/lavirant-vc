

// eslint-disable-next-line no-undef
module.exports = {
  apps: [
    {
      name: "lavirant",
      script: "dist/index.js",
      instances: 1,
      exec_mode: "fork",
      node_args: "--enable-source-maps",
      env: {
        NODE_ENV: "production"
      }
    }
  ]
};
