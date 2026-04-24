module.exports = {
  config: {
    name: "info",
    description: "Thông tin hệ thống cơ bản",
    method: "get",
    enabled: true,
    auth: false
  },

  call: async function ({ res, manager }) {
    return res.json({
      success: true,
      message: "System info",
      data: {
        node: process.version,
        uptime: process.uptime(),
        plugins: manager.getPluginList().length,
        endpoints: manager.getEndpoints().length
      }
    });
  }
};
