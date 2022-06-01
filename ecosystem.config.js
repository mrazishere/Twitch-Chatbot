module.exports = {
  apps : [{
    name   : "Twitch-Chatbot",
    watch: ["./channel_list.js", "./channel_data.js", "./app.js"],
    script : "./app.js",
    max_memory_restart: '200M'
  }]
}