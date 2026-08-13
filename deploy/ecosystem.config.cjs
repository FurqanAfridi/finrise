module.exports = {
  apps: [
    {
      name: "finrise",
      cwd: "/var/www/finrise",
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3001 -H 0.0.0.0",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
        PORT: "3001",
      },
      max_memory_restart: "512M",
      time: true,
    },
  ],
};
