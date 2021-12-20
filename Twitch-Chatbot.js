module.exports = {
    apps: [
      {
        name: "Twitch-Chatbot",
        script: "app.js",
        cron_restart: "0 * * * *",
        watch: true,
        watch_options: {
          usePolling: true,
          interval: 1000
        }
    },
    {
        name: "Twitch-Translator",
        script: "translate.js",
        watch: true,
        watch_options: {
          usePolling: true,
          interval: 1000
        }
    }]
}