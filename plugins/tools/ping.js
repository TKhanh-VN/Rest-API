module.exports = {
  config: {
    name: "ping",
    description: "Kiểm tra API",
    method: "get",
    enabled: true,
    auth: false
  },

  onload: async function ({ logger }) {
    logger.info("Plugin ping đã được load");
  },

  call: async function ({ res }) {
    return res.json({
      success: true,
      message: "Pong",
      data: {
        time: new Date().toISOString()
      }
    });
  }
};
