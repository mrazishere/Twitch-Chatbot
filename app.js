// Require necessary node modules
// Make the variables inside the .env element available to our Node project
require('dotenv').config();
//const keepAlive = require("./server");
const fetch = require('cross-fetch');
const tmi = require('tmi.js');
const fs = require('fs');
const gtrans = require('googletrans').default;
const { Channel_List } = require('./channel_list.js')
const { Channel_Timezone } = require('./channel_data.js')
const { Channel_Party } = require('./channel_data.js')

const TwitchApi = require("node-twitch").default;

const twitch = new TwitchApi({
	client_id: `${process.env.TWITCH_CLIENTID}`,
	client_secret: `${process.env.TWITCH_CLIENTSECRET}`
});

// Setup connection configurations
// These include the channel, username and password
const client = new tmi.Client({
  options: { debug: true, messagesLogLevel: "info" },
  connection: {
    reconnect: true,
    secure: true
  },

  // Lack of the identity tags makes the bot anonymous and able to fetch messages from the channel
  // for reading, supervision, spying, or viewing purposes only
  identity: {
    username: `${process.env.TWITCH_USERNAME}`,
    password: `${process.env.TWITCH_OAUTH}`
  },
  channels: Channel_List
});

//keepAlive();

// Connect to the channel specified using the setings found in the configurations
// Any error found shall be logged out in the console
client.connect().catch(console.error);

// Set variables for Translate script
const tr_lang = {
  'de': ['de', 'sagt'],
  'en': ['en', 'says'],
  'fr': ['fr', 'dit'],
  'pt': ['pt', 'disse'],
  'cn': ['zh', 'says'],
  'tl': ['tl', 'says'],
  'jp': ['ja', 'says'],
  'kr': ['ko', 'says'],
  'id': ['id', 'says'],
  'bm': ['ms', 'kata'],
  'th': ['th', 'says'],
  'pinyin': ['zh', 'says'],
  'romaji': ['ja', 'says']
};

// Sleep/delay function
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const raidSO = [
  "sashimistreamz",
  "mrazishere",
  "mryaoaiaiishere",
  "mingxthing"
]

// This is a function to get game information for a streamer that raided
async function getGame(loginName){
  const users = await twitch.getUsers(loginName);
  const user = users.data[0];
  const userId = user.id;

  const channels = await twitch.getChannelInformation({ broadcaster_id: userId });
  const channelInfo = channels.data[0];
  const game = channelInfo.game_name;
  console.log(game);
  return game;
}

// Clip command
async function createClip(loginName){
  const users = await twitch.getUsers(loginName);
  const user = users.data[0];
  const userId = user.id;

  const channels = await twitch.CreateClipOptions({ broadcaster_id: userId });
  const channelInfo = channels.data[0];
  const clipID = channelInfo.id;
  console.log(clipID);
  return clipID;
}

client.on('raided', (channel, username, viewers, tags) => {
  if(viewers >= 2 && raidSO.some(v => channel.includes(v))) {
    getGame(username).then(function(gameInfo){
      console.log(gameInfo);
      client.say(channel, "Thank you " + username + " for the raid of " + viewers + "! They were last seen playing [" + gameInfo + "]. Check them out @ https://www.twitch.tv/"+username);
    })
    .catch(error =>  console.log("Error getting game info...."));
  }
})

// When the bot is on, it shall fetch the messages send by user from the specified channel
client.on('message', (channel, tags, message, self) => {
  // Lack of this statement or it's inverse (!self) will make it in active
  if (self) return;
  // Create up a switch statement with some possible commands and their outputs
  // The input shall be converted to lowercase form first
  // The outputs shall be in the chats

  // Set variables for user permission logic
  const badges = tags.badges || {};
  const isBroadcaster = badges.broadcaster || (`${tags.username}` == `${process.env.TWITCH_USERNAME}`);
  const isMod = badges.moderator;
  const isVIP = badges.vip;
  const isModUp = isBroadcaster || isMod;
  const isVIPUp = isVIP || isModUp;
  const channel1 = channel.substring(1);

  //
  // TRANSLATE SCRIPT MERGED INTO MAIN APP
  //

  // Remove whitespace from chat message
  let tMsg = message.trim();

  // Check if the message starts with @name
  // in that case, extract the name and move the @name at the end of the message, and process
  if (tMsg[0] === '@') {
    let atnameEndIndex = tMsg.indexOf(' ');
    let atname = tMsg.substring(0, atnameEndIndex);
    let message = tMsg.substring(atnameEndIndex + 1);
    tMsg = message + ' ' + atname;
    console.info('Changed message :', tMsg);
  }

  // Filter commands (options)
  if (tMsg[0] != '!') return;

  // Extract command
  let cmd = tMsg.split(' ')[0].substring(1).toLowerCase();

  // Name for answering
  let answername = '@' + `${tags.username}`;

  // Command for displaying the commands (in english)
  if (cmd === "lang" || cmd === "translate") {
    client.say(channel, 'I can (approximatevely) translate your messages in many languages. Simply start your message with one of these commands: !en (english) !cn (chinese) !fr (french) !de (german) !pt (portuguese)... ');
    return;
  }

  // Commands for displaying messages explaining the translation feature in various languages
  // TODO: sentences
  const explanations = {
    //    'germans': '',
    //    'spanish': '',
    'english': 'You can use our Translator Bot. Start your message by typing !en To translate your message into English. For example: "!en Bonjour"',
    'chinese': 'Awaiting Chinese Explanation....',
    'japanese': 'Awaiting Japanese Explanation....',
    'korean': 'Awaiting Korean Explanation....',
    'tagalog': 'Awaiting Tagalog Explanation....',
    'indonesian': 'Awaiting Indonesian Explanation....',
    'french': 'Vous pouvez utiliser notre bot traducteur. Commencez votre message par !en pour traduire votre message en anglais. Par exemple "!en Bonjour"',
  }
  if (cmd in explanations) {
    client.say(channel, explanations[cmd]);
    return;
  }

  if (cmd in tr_lang && tMsg[0] == '!') {
    var ll = tr_lang[cmd];
    //console.error(ll);
    var txt = tMsg.substring(1 + cmd.length);

    // Text must be at least 2 characters and max 200 characters
    var lazy = false;
    if (txt.length > 2) {
      if (txt.length > 200) {
        lazy = true;
        txt = "i'm too lazy to translate long sentences ^^";
      }

      // Lazy mode, and english target => no translation, only displays 'lazy' message in english
      if ((lazy === true) && (ll[0].indexOf('en') == 0)) {
        say(channel, `${tags.username}` + ', ' + txt);
        return;
      }

      // Translate text
      gtrans(txt, { to: ll[0] }).then(res => {
        // Tweak to add pinyin to display chinese pronunciation + english translation
        if (cmd == 'pinyin') {
          gtrans(txt, { to: 'en' }).then(enres => {
            client.say(channel, `${tags.username}` + '| pinyin: ' + res.pronunciation + ' | english: ' + enres.text);
          }).catch(err => {
            console.error('Translation Error:', err);
          })
        }
        // Tweak to add romaji to display japanese pronunciation + english translation
        else if (cmd == 'romaji') {
          gtrans(txt, { to: 'en' }).then(enres => {
            client.say(channel, `${tags.username}` + '| romaji: ' + res.pronunciation + ' | english: ' + enres.text);
          }).catch(err => {
            console.error('Translation Error:', err);
          })
        } else if (lazy === true) {
          // lazy mode sentence in english and also in requested language
          client.say(channel, `${tags.username}` + ', ' + txt + '/' + res.text);
        }
        else {
          // Translation
          // TODO: Check is translated text == original text. In that case it
          // means the command was not correctly used (ex: "!en hello friends")
          client.say(channel, `${tags.username}` + ' ' + ll[1] + ': ' + res.text);
        }
      }).catch(err => {
        console.error('Translation Error:', err);
      })
    }
  }

  /**
   * In development: to listen to chatbot chat for request to add or remove chatbot from twitch streamer chat
   * should automatically add into channel list.
   * 
   * !addme will add requestor to TWITCH_CHANNEL in channel_list.js
   * !removeme will remove requestor from TWITCH_CHANNEL in channel_list.js
   * App will be restarted automatically with pm2 ecosystem file watching channel_list.js for any file change
   * No longer require cron job to restart app hourly
   *
   * TODO: Move channel_list.js to use replit db to store channels
   *
   * 
   */

  // Set max number of channels to allow bot to be added to
  const maxChannels = 20;
  
  // Add bot Function
  function addme() {
    let file = fs.readFileSync("channel_list.js", "utf8");
    let arr = file.split(/\r?\n/);
    arr.forEach((line, idx) => {
      if (line.includes("var Channel_List")) {
        twitchChannelsArrayString = line.split("= ").pop();
        twitchChannelsArray = JSON.parse(twitchChannelsArrayString.replace(/'/g, '"'));
      }
    });

    if (twitchChannelsArray.includes(`#${tags.username}`)) {
      //console.log(Channel_List);
      client.say(channel, 'Error: Already added, !removeme to remove me from your channel');
    } else if (twitchChannelsArray.length < maxChannels) {
      twitchChannelsArray.push(`#${tags.username}`);
      twitchChannelsArrayNewString = JSON.stringify(twitchChannelsArray);
      //console.log(Channel_List);
      //console.log(twitchChannelsArrayString);
      //console.log(twitchChannelsArrayNewString);
      fs.readFile("channel_list.js", { encoding: 'utf8' }, function(err, data) {
        const regex = /^var.*/gm;
        const string1 = 'var Channel_List = ';
        var formatted = string1.concat(data.replace(regex, twitchChannelsArrayNewString));
        fs.writeFile("channel_list.js", formatted, 'utf8', function(err) {
          if (err) return console.log(err);
          //console.log('adding...');
          client.say(channel, `Added successfully to #${tags.username} chat. Check my about page for available commands. Whisper @MrAZisHere if you have any questions.`);
        });
      });
    } else {
      client.say(channel, 'Sorry, automatic addition is currently disabled, please whisper @MrAZisHere to request manually.');
    }
    return;
  }

  // Remove bot Function
  function removeme() {
    let file = fs.readFileSync("channel_list.js", "utf8");
    let arr = file.split(/\r?\n/);
    arr.forEach((line, idx) => {
      if (line.includes("var Channel_List")) {
        twitchChannelsArrayString = line.split("= ").pop();
        twitchChannelsArray = JSON.parse(twitchChannelsArrayString.replace(/'/g, '"'));
      }
    });
    if (twitchChannelsArray.includes(`#${tags.username}`)) {
      twitchChannelsArrayNew = twitchChannelsArray.filter(e => e !== `#${tags.username}`);
      twitchChannelsArrayNewString = JSON.stringify(twitchChannelsArrayNew);
      fs.readFile("channel_list.js", { encoding: 'utf8' }, function(err, data) {
        const regex = /^var.*/gm;
        const string1 = 'var Channel_List = ';
        var formatted = string1.concat(data.replace(regex, twitchChannelsArrayNewString));
        fs.writeFile("channel_list.js", formatted, 'utf8', function(err) {
          if (err) return console.log(err);
        });
      });
      //console.log('removing...');
      client.say(channel, `Removed successfully from #${tags.username} chat. Whisper @MrAZisHere if you have any questions.`);
    } else {
      //console.log(Channel_List);
      client.say(channel, 'Error: Already removed, !addme to add me to your channel');
    }
    return;
  }


  // Auto accept/deny duel randomly Function
  async function duel() {
    // sample input:
    // StreamElements: @mraiishere, @MrAZisHere wants to duel you for 0 Mingion Chokes, you can !accept or !deny within 2 minutes
    input = message.split(" ");
    console.log(input);
    var random_boolean = Math.random() < 0.5;
    if (input[0] == '@mraiishere,') {
      await sleep(2000);
      if (random_boolean) {
        //console.log(random_boolean);
        client.say(channel, '!accept ' + input[1] + ', I am not afraid of you! Gimme that ' + input[7] + ' points');
      } else {
        //console.log(random_boolean);
        client.say(channel, '!deny ' + input[1] + ', nah, i dont feel like gambling now!');
      }
    } else {
      return;
    }
    return;
  }

  // Retrieve Party Queue Function
  // Relies on Channel_Party information in channel_data.js
  // 
  async function queue() {
    input = message.split(" ");
    var partyCommand = input[1];
    var partyStatus = Channel_Party[channel1][0];
    var partyTotal = Channel_Party[channel1].length;
    partyTotal -=1 ;
    var partyMembers = Channel_Party[channel1].slice(1);
    if (input.length > 2) {
      client.say(channel, `@${tags.username}, Invalid use of command, '!queue' to check current queue or '!queue join' to join the queue.`);
    } else if (input.length == 1) {
      //console.log(channel);
        if(partyStatus == "enabled"){
          console.log("Queue order as follows: "+ partyMembers);
          client.say(channel, "Queue order as follows: "+ partyMembers);
        } else {
          console.log("Broadcaster has not enabled Party function. Broadcaster can enable by sending '!queue enable'");
          client.say(channel, "Broadcaster has not enabled Party function. Broadcaster can enable by sending '!queue enable'");
        }
    } else if (isModUp && partyTotal >= 1 && partyCommand == "clear") {
      let file = fs.readFileSync("channel_data.js", "utf8");
      let arr = file.split(/\r?\n/);
      arr.forEach((line, idx) => {
        console.log(line);
        if (line.includes("var Channel_Party =")) {
          var channelPartyString = line.split("= ").pop();
          channelPartyObject = JSON.parse(channelPartyString.replace(/'/g, '"'));
        }
      });
      channelPartyObject[channel1] = [partyStatus];
      channelPartyNewString = JSON.stringify(channelPartyObject);
      fs.readFile("channel_data.js", { encoding: 'utf8' }, function(err, data) {
        const regex = /^var.*/gm;
        const string1 = 'var Channel_Party =';
        var formatted = string1.concat(data.replace(regex, channelPartyNewString));
        fs.writeFile("channel_data.js", formatted, 'utf8', function(err) {
          if (err) return console.log(err);
          //console.log('adding...');
          client.say(channel, channel + `'s Queue successfully cleared.`);
        });
      });
    }
    return;
  }

  // Set Timezone Function
  async function settimezone() {
    input = message.split(" ");
    if (input.length != 2) {
      client.say(channel, `@${tags.username}, invalid use of command. !settimezone[SPACE]<Zone ID> - refer to https://nodatime.org/TimeZones`);
    } else {
      var chTZ = input[1];
      const fetchResponse = await fetch('https://www.timeapi.io/api/TimeZone/zone?timeZone=' + chTZ, { method: 'GET', headers: { 'accept': 'application/json', 'content-type': 'application/json' } })
      .then(response => {
        if (response.ok) {
          response.json().then((data) => {
            var outputArr = JSON.parse(JSON.stringify(data));
            //console.log(data);
          });
          let file = fs.readFileSync("channel_data.js", "utf8");
          let arr = file.split(/\r?\n/);
          arr.forEach((line, idx) => {
            console.log(line);
            if (line.includes("var Channel_Timezone =")) {
              var channelTimezoneString = line.split("= ").pop();
              channelTimezoneObject = JSON.parse(channelTimezoneString.replace(/'/g, '"'));
            }
          });
          channelTimezoneObject[`#${tags.username}`] = chTZ;
          channelTimezoneNewString = JSON.stringify(channelTimezoneObject);
          fs.readFile("channel_data.js", { encoding: 'utf8' }, function(err, data) {
            const regex = /^var.*/gm;
            const string1 = 'var Channel_Timezone = ';
            var formatted = string1.concat(data.replace(regex, channelTimezoneNewString));
            fs.writeFile("channel_data.js", formatted, 'utf8', function(err) {
              if (err) return console.log(err);
              //console.log('adding...');
              client.say(channel, `Timezone for #${tags.username} successfully set to ` + chTZ + `. !clock to display current local time.`);
            });
          });
        } else {
          client.say(channel, "Invalid Zone ID! Make sure you enter valid Zone ID per https://nodatime.org/TimeZones");
        }
      }).
      catch(error => {
        console.log(error);
      });
    }
    return;
  }

  // Retrieve Time Function
  // Relies on Timzone information in channel_data.js
  // Set timezone with !settimezone
  async function clock() {
    input = message.split(" ");
    if (input.length != 1) {
      client.say(channel, `@${tags.username}, This command does not accept any input, just enter !clock to get ` + channel + `'s local time.`);
    } else if (input.length == 1) {
      console.log(channel);
      console.log(Channel_Timezone);
        if(Channel_Timezone.hasOwnProperty(channel)){
          var chTZ = Channel_Timezone[channel];
          console.log(chTZ);
          const fetchResponse = await fetch('https://www.timeapi.io/api/Time/current/zone?timeZone=' + chTZ, { method: 'GET', headers: { 'accept': 'application/json', 'content-type': 'application/json' } })
          .then(response => {
            if (response.ok) {
              response.json().then((data) => {
                var outputArr = JSON.parse(JSON.stringify(data));
                var output1 = outputArr['date'];
                var output2 = outputArr['time'];
                var output3 = outputArr['timeZone'].split("/");
                var output4 = outputArr['dayOfWeek'];
                sleep(1000);
                console.log("The current time in " + output3[output3.length - 1] + " is " + output2 + "h - " + output4 + ", " + output1);
                client.say(channel, "The current time in " + output3[output3.length - 1] + " is " + output2 + "h - " + output4 + ", " + output1);
                //console.log(data);
              });
            } else {
              client.say(channel, "Sorry, API is unavailable right now. Please try again later.");
            }
          }).
          catch(error => {
            console.log(error);
          });
        } else {
          console.log("No timezone set for: " + channel + ". !settimezone[SPACE]<Zone ID> - refer to https://nodatime.org/TimeZones");
          client.say(channel, "No timezone set for: " + channel + ". !settimezone[SPACE]<Zone ID> - refer to https://nodatime.org/TimeZones");
        }
    }
    return;
  }

  // Forex Function
  async function forex() {
    input = message.split(" ");
    if (input.length != 4) {
      client.say(channel, `@${tags.username}, invalid use of command: !forex<SPACE>[Amount]<SPACE>[FromCurrency]<SPACE>[ToCurrency]`);
    } else if (input.length == 4) {
      const fetchResponse = await fetch('https://api.exchangerate.host/convert?from=' + input[2] + '&to=' + input[3] + '&amount=' + input[1], { method: 'GET', headers: { 'accept': 'application/json', 'content-type': 'application/json' } })
        .then(response => {
          if (response.ok) {
            response.json().then((data) => {
              var outputArr = JSON.parse(JSON.stringify(data));
              var output1 = outputArr['result'];
              var output2 = outputArr['date'];
              sleep(1000);
              //console.log(input[2] + input[1] + ' = ' + input[3] + output1 + '. Last updated: ' + output2);
              client.say(channel, input[2] + input[1] + ' = ' + input[3] + output1 + '. Last updated: ' + output2);
              //console.log(data);
            });
          } else {
            client.say(channel, "Sorry, API is unavailable right now. Please try again later.");
          }
        }).
        catch(error => {
          console.log(error);
        });
    }
    return;
  }

  // Anime Quotes Function
  async function anime() {
    input = message.slice(7);
    const fetchResponse = await fetch('https://animechan.vercel.app/api/random', { method: 'GET', headers: { 'accept': 'application/json', 'content-type': 'application/json' } }).then(response => {
      if (response.ok) {
        response.json().then((data) => {
          var outputArr = JSON.parse(JSON.stringify(data));
          var output1 = outputArr['anime'];
          var output2 = outputArr['character'];
          var output3 = outputArr['quote'];
          sleep(1000);
          if (input === "") {
            //console.log(channel, output3 + " ~ " + output2 + " from " + output1);
            client.say(channel, `@${tags.username}, ` + output3 + " ~ " + output2 + " from " + output1);
          }
          //console.log(data);
        });
      } else {
        client.say(channel, "Sorry, API is unavailable right now. Please try again later.");
      }
    }).
      catch(error => {
        console.log(error);
      });
    return;
  }

  // Dog Facts Function
  async function dogfacts() {
    input = message.slice(10);
    const fetchResponse = await fetch('https://dog-facts-api.herokuapp.com/api/v1/resources/dogs?number=1', { method: 'GET', headers: { 'accept': 'application/json', 'content-type': 'application/json' } })
      .then(response => {
        if (response.ok) {
          response.json().then((data) => {
            var outputArr = JSON.parse(JSON.stringify(data));
            var output = outputArr[0]['fact'];
            sleep(1000);
            if (input === "") {
              //console.log(output);
              client.say(channel, `@${tags.username}, ` + output);
            }
            //console.log(data);
          });
        } else {
          client.say(channel, "Sorry, API is unavailable right now. Please try again later.");
        }
      }).
      catch(error => {
        console.log(error);
      });
    return;
  }

  // Meow Facts Function
  async function catfacts() {
    input = message.slice(10);
    const fetchResponse = await fetch('https://meowfacts.herokuapp.com/', { method: 'GET', headers: { 'accept': 'application/json', 'content-type': 'application/json' } })
      .then(response => {
        if (response.ok) {
          response.json().then((data) => {
            var outputArr = JSON.parse(JSON.stringify(data));
            var output = outputArr['data'][0];
            sleep(1000);
            if (input === "") {
              //console.log(output);
              client.say(channel, `@${tags.username}, ` + output);
            }
            //console.log(data);
          });
        } else {
          client.say(channel, "Sorry, API is unavailable right now. Please try again later.");
        }
      }).
      catch(error => {
        console.log(error);
      });
    return;
  }

  // Catch Pokemon Function
  async function pokecatch() {
    input = message.slice(7);
    if (input === "") {
      const fetchResponse = await fetch('https://us-central1-caffs-personal-projects.cloudfunctions.net/pokeselect', { method: 'GET', headers: { 'accept': 'text/plain', 'content-type': 'text/plain' } })
        .then(response => {
          if (response.ok) {
            response.text().then((data) => {
              sleep(1000);
              output = data.slice(0,data.search("https"));
              //console.log(data);
              client.say(channel, `@${tags.username}, ` + output);
            });
          } else {
            client.say(channel, "Sorry, API is unavailable right now. Please try again later.");
          }
        }).
        catch(error => {
          console.log(error);
        });
    } else {
        client.say(channel, "No input required, just do !catch");
    }
    return;
  }
  
  // Dad Jokes Function
  async function dad() {
    input = message.slice(5);
    if (input === "") {
      const fetchResponse = await fetch('https://icanhazdadjoke.com/', { method: 'GET', headers: { 'accept': 'text/plain', 'content-type': 'text/plain' } })
        .then(response => {
          if (response.ok) {
            response.text().then((data) => {
              sleep(1000);
              //console.log(data);
              client.say(channel, `@${tags.username}, ` + data);
              //console.log(data);
            });
          } else {
            client.say(channel, "Sorry, API is unavailable right now. Please try again later.");
          }
        }).
        catch(error => {
          console.log(error);
        });
    } else {
      const fetchResponse = await fetch('https://icanhazdadjoke.com/search?term=' + input, { method: 'GET', headers: { 'accept': 'application/json', 'content-type': 'application/json' } })
        .then(response => {
          if (response.ok) {
            response.json().then((data) => {
              var outputArr = JSON.parse(JSON.stringify(data));
              sleep(1000);
              if (outputArr['total_jokes'] == 0) {
                //console.log("No Jokes found");
                client.say(channel, "Sorry, nothing found with the search term: " + input);
              } else {
                var random = Math.floor(Math.random() * outputArr['results'].length);
                //console.log(outputArr['results'][random]['joke']);
                client.say(channel, `@${tags.username}, ` + outputArr['results'][random]['joke']);
              }
            });
          } else {
            client.say(channel, "Sorry, API is unavailable right now. Please try again later.");
          }
        }).
        catch(error => {
          console.log(error);
        });
    }
    return;
  }

  // Advice Function
  async function advice() {
    input = message.slice(8);
    if (input === "") {
    const fetchResponse = await fetch('https://api.adviceslip.com/advice', { method: 'GET', headers: { 'accept': 'application/json', 'content-type': 'application/json' } })
      .then(response => {
        if (response.ok) {
          response.json().then((data) => {
            var outputArr = JSON.parse(JSON.stringify(data));
            sleep(1000);
            //console.log(outputArr['slip']['advice']);
            client.say(channel, `@${tags.username}, ` + outputArr['slip']['advice']);
            //console.log(data);
          });
        } else {
          client.say(channel, "Sorry, API is unavailable right now. Please try again later.");
        }
      }).
      catch(error => {
        console.log(error);
      });
    } else {
    const fetchResponse = await fetch('https://api.adviceslip.com/advice/search/' + input, { method: 'GET', headers: { 'accept': 'application/json', 'content-type': 'application/json' } })
      .then(response => {
        if (response.ok) {
          response.json().then((data) => {
            var outputArr = JSON.parse(JSON.stringify(data));
            //console.log(outputArr);
            sleep(1000);
            if (outputArr.hasOwnProperty('slips')) {
              var random = Math.floor(Math.random() * outputArr['slips'].length);
              //console.log(outputArr['slips'][random]['advice']);
              client.say(channel, `@${tags.username}, ` + outputArr['slips'][random]['advice']);
            } else {
              //console.log("No advice found");
              client.say(channel, "Sorry, nothing found with the search term: " + input);
            }
            //console.log(data);
          });
        } else {
          client.say(channel, "Sorry, API is unavailable right now. Please try again later.");
        }
      }).
      catch(error => {
        console.log(error);
      });
    }
    return;
  }

  // Number Facts Function
  async function numfacts() {
    input = message.split(" ");
    if (input.length > 2) {
      return;
    } else if (input.length == 2) {
      fetchResponse = await fetch('http://numbersapi.com/' + input[1] + '')
        .then(response => {
          if (response.ok) {
            response.text().then((data) => {
              sleep(1000);
              //console.log(data);
              client.say(channel, `@${tags.username}, ` + data);
              //console.log(data);
            });
          } else {
            client.say(channel, "Sorry, API is unavailable right now. Please try again later.");
          }
        }).
        catch(error => {
          console.log(error);
        });
    } else {
      fetchResponse = await fetch('http://numbersapi.com/random')
        .then(response => {
          if (response.ok) {
            response.text().then((data) => {
              sleep(1000);
              //console.log(data);
              client.say(channel, `@${tags.username}, ` + data);
            });
          } else {
            client.say(channel, "Sorry, API is unavailable right now. Please try again later.");
          }
        }).
        catch(error => {
          console.log(error);
        });
    }
    return;
  }

  // Yoda Translation Function
  async function yoda() {
    input = message.slice(6)
    if (input === "") {
      //console.log('No input');
      client.say(channel, 'No input provided, !yoda<SPACE>Text to be translated');
    } else {
      const fetchResponse = await fetch('http://api.funtranslations.com/translate/yoda?text=' + input, { method: 'GET', headers: { 'accept': 'application/json', 'content-type': 'application/json', 'X-Funtranslations-Api-Secret': `${process.env.API_FUNTRANSLATION_SECRET}` } })
        .then(response => {
          if (response.ok) {
            response.json().then((data) => {
              var outputArr = JSON.parse(JSON.stringify(data));
              sleep(1000);
              //console.log(outputArr['contents']['translated']);
              client.say(channel, `@${tags.username}, ` + outputArr['contents']['translated']);
            });
          } else {
            client.say(channel, "Sorry, API is unavailable right now. Please try again later.");
          }
        }).
        catch(error => {
          console.log(error);
        });
    }
    return;
  }

  // Countdown Function
  async function countDown() {
    input = message.split(" ");
    cd = 10;
    if (input.length == 3) {
      client.say(channel, `Come join us for snipe games! Server-Mode: ` + input[1] + ' Costume: ' + input[2]);
      await sleep(1000);
    } else if (input.length == 2 && !isNaN(input[1])) {
      cd = input[1];
    } else if (input.length == 1) {
      cd = 10;
    } else {
      client.say(channel, `@${tags.username}, invalid use of command: !snipecd or !snipecd<SPACE>Server<SPACE>Costumes`);
      return;
    }
    client.say(channel, `Countdown starting in ` + cd + ` seconds`);
    cd = cd * 1000;
    await sleep(cd);
    client.say(channel, `Ready up on GO!`);
    await sleep(1000);
    client.say(channel, `5`);
    await sleep(1000);
    client.say(channel, `4`);
    await sleep(1000);
    client.say(channel, `3`);
    await sleep(1000);
    client.say(channel, `2`);
    await sleep(1000);
    client.say(channel, `1`);
    await sleep(1000);
    client.say(channel, `Lets Goooooooo!!`);
    return;
  }

  async function marbles() {
    await sleep(4200);
    client.say(channel, `!play`);
  }

  // Commands with input
  if (message.includes("!clip")) {
    if (isVIPUp) {
      createClip(channel).then(function(clipID){
        console.log(clipID);
        sleep(10000);
        //client.say(channel, "https://clips.twitch.tv/" + clipID);
        console.log("https://clips.twitch.tv/" + clipID);
      })
      //.catch(error =>  client.say(channel, "Error clipping, is stream online?"));
      .catch(error =>  console.log("Error clipping, is stream online?"));
    } else {
      console.log(`${tags.username}`);
      return;
    }
  }

  if (message.includes("Hi Back, I'm StreamElements")) {
    client.say(channel, `Hi @${tags.username}, I'm Mr Yao Ai Ai :) `);
  }

  if (message.includes("!clock")) {
    clock();
  }

  if (message.includes("!settimezone")) {
    settimezone();
  }

  if (message.includes("!daddy")) {
    return;
  }

  if (message.includes("!forex")) {
    forex();
  }

  if (message.includes("!anime")) {
    anime();
  }

  if (message.includes("!dogfacts")) {
    dogfacts();
  }

  if (message.includes("!catfacts")) {
    catfacts();
  }

  if (message.includes("!dad")) {
    dad();
  }

  if (message.includes("!advice")) {
    advice();
  }

  if (message.includes("!numfacts")) {
    numfacts();
  }

  if (message.includes("!catch")) {
    pokecatch();
  }

  if (message.includes("!getgame")) {

  }

  if (message.includes("!yoda")) {
    yoda();
  }

  if (message.includes("!snipecd")) {
    if (isModUp) {
      countDown();
    } else {
      console.log(`${tags.username}`);
      return;
    }
  }

  if (message.includes("!play to get in the race!")) {
    marbles();
  }

  if (message.includes("!queue")) {
    //queue();
  }

  // Listen only on bot's channel
  if (channel.includes(process.env.TWITCH_USERNAME) || channel.includes(tags.username)) {
    switch (message.toLowerCase()) {
      case '!addme':
        addme();
        break;
      case '!removeme':
        removeme();
        break;
      case '!settimezone':
        settimezone();
        break;
      default:
        // We shall convert the message into a string in which we shall check for its first word
        // and use the others for output
        let mymessage = message.toString();

    }
  }

  /**
  // Commands without input
  switch (message.toLowerCase()) {
      
      // Use 'tags' to obtain the username of the one who has keyed in a certain input
      // 'channel' shall be used to specify the channel name in which the message is going to be displayed
      //For one to send a message in a channel, you specify the channel name, then the message
      // We shall use backticks when using tags to support template interpolation in JavaScript
                 
      // In case the message in lowercase is equal to the string '!name', send the sender of that message the name of the chatbot
      case '!test':
          break;           
          
          // In case the message in lowercase is none of the above, check whether it is equal to '!upvote' or '!cheers'
          // these are used to  like certain users' messages or celebrate them due to an achievement
          
      default:
          // We shall convert the message into a string in which we shall check for its first word
          // and use the others for output
          let mymessage = message.toString();
          
  }
  */
});