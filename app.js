// Require necessary node modules
// Make the variables inside the .env element available to our Node project
require('dotenv').config();
const fetch = require('cross-fetch');
const tmi = require('tmi.js');
const fs = require('fs');
const {Channel_List} = require('./channel_list.js')

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

// Connect to the channel specified using the setings found in the configurations
// Any error found shall be logged out in the console
client.connect().catch(console.error);

// Sleep/delay function
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
    
// Get number of minutes to the next hour Function
function getMinutesUntilNextHour() {
    return 60 - new Date().getMinutes();
} 

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
    
    /**
     * In development: to listen to chatbot chat for request to add or remove chatbot from twitch streamer chat
     * should automatically add into channel list.
     * 
     * !addme will add requestor to TWITCH_CHANNEL in .env
     * !removeme will remove requestor from TWITCH_CHANNEL in .env
     * Hourly Cron Job reloads bot before changes will take effect.
     * 
     * TODO: Find a way to automatically reload bot on .env file change instead of relying on hourly cron job
     * 
     */

    // Add bot Function
    function addme(){
        let file = fs.readFileSync("channel_list.js", "utf8");
        let arr = file.split(/\r?\n/);
        arr.forEach((line, idx)=> {
            if(line.includes("var Channel_List")){
                twitchChannelsArrayString = line.split("= ").pop();
                twitchChannelsArray = JSON.parse(twitchChannelsArrayString.replace(/'/g, '"'));
            }
        });
        
        if (twitchChannelsArray.includes(`#${tags.username}`)) {
            console.log(Channel_List);
            client.say(channel, 'Error: Already added, !removeme to remove me from your channel');
        } else if(twitchChannelsArray.length < 20) {
            twitchChannelsArray.push(`#${tags.username}`);
            twitchChannelsArrayNewString = JSON.stringify(twitchChannelsArray);
            console.log(Channel_List);
            console.log(twitchChannelsArrayString);
            console.log(twitchChannelsArrayNewString);
            fs.readFile("channel_list.js", {encoding: 'utf8'}, function (err,data) {
              const regex = /^var.*/gm;
              const string1 = 'var Channel_List = ';
              var formatted = string1.concat(data.replace(regex, twitchChannelsArrayNewString));
              fs.writeFile("channel_list.js", formatted, 'utf8', function (err) {
                if (err) return console.log(err);
                console.log('adding...');
                client.say(channel, 'Added successfully to ${tags.username}. Check my about page for available commands. Whisper @MrAZisHere if you have any questions.');
              });
            });
        } else {
            client.say(channel, 'Sorry, automatic addition is currently disabled, please whisper @MrAZisHere to request manually.');
        }
        return;
    }

    // Remove bot Function
    function removeme(){
        let file = fs.readFileSync("channel_list.js", "utf8");
        let arr = file.split(/\r?\n/);
        arr.forEach((line, idx)=> {
            if(line.includes("var Channel_List")){
                twitchChannelsArrayString = line.split("= ").pop();
                twitchChannelsArray = JSON.parse(twitchChannelsArrayString.replace(/'/g, '"'));
            }
        });
        if (twitchChannelsArray.includes(`#${tags.username}`)) {
            twitchChannelsArrayNew = twitchChannelsArray.filter(e => e !== `#${tags.username}`);
            twitchChannelsArrayNewString = JSON.stringify(twitchChannelsArrayNew);
            fs.readFile("channel_list.js", {encoding: 'utf8'}, function (err,data) {
              const regex = /^var.*/gm;
              const string1 = 'var Channel_List = ';
              var formatted = string1.concat(data.replace(regex, twitchChannelsArrayNewString));
                fs.writeFile("channel_list.js", formatted, 'utf8', function (err) {
                    if (err) return console.log(err);
                });
            });
            console.log('removing...');
            client.say(channel, 'Removed successfully from ${tags.username}. Whisper @MrAZisHere if you have any questions.');
        } else {
            console.log(Channel_List);
            client.say(channel, 'Error: Already removed, !addme to add me to your channel');
        }
        return;
    }
    

    // Auto accept/deny duel randomly Function
    async function duel(){
        // sample input:
        // StreamElements: @mraiishere, @MrAZisHere wants to duel you for 0 Mingion Chokes, you can !accept or !deny within 2 minutes
        input = message.split(" ");
        var random_boolean = Math.random() < 0.5;
        if (input[0]  ==  `@${process.env.TWITCH_USERNAME},`) {
            await sleep(2000);
            if (random_boolean){
                console.log(random_boolean);
                client.say(channel, '!accept ' + input[1] + ', I am not afraid of you! Gimme that ' + input[7] + ' points');
            } else {
                console.log(random_boolean);
                client.say(channel, '!deny ' + input[1] + ', nah, i dont feel like gambling now!');
            }
        } else {
            return;
        }
        return;
    }

    // Forex Function
    async function forex(){
        input = message.split(" ");
        if (input.length != 4 ) {
            client.say(channel, `@${tags.username}, invalid use of command: !forex<SPACE>[Amount]<SPACE>[FromCurrency]<SPACE>[ToCurrency]`);
        } else if (input.length == 4) {
            const fetchResponse = await fetch('https://api.exchangerate.host/convert?from=' + input[2] + '&to=' + input[3] + '&amount=' + input[1], {method: 'GET', headers: {'accept': 'application/json', 'content-type': 'application/json'}})
            .then(response => {
                if (response.ok) {
                    response.json().then((data) => {
                        var outputArr = JSON.parse(JSON.stringify(data));
                        var output1 = outputArr['result'];
                        var output2 = outputArr['date'];
                        sleep(1000);
                        console.log(input[2] + input[1] + ' = ' + input[3] + output1 + '. Last updated: ' + output2);
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
    async function anime(){
        input = message.slice(7);
        const fetchResponse = await fetch('https://animechan.vercel.app/api/random', {method: 'GET', headers: {'accept': 'application/json', 'content-type': 'application/json'}}).then(response => {
            if (response.ok) {
                response.json().then((data) => {
                    var outputArr = JSON.parse(JSON.stringify(data));
                    var output1 = outputArr['anime'];
                    var output2 = outputArr['character'];
                    var output3 = outputArr['quote'];
                    sleep(1000);
                    if(input === "") {
                        console.log(channel, output3 + " ~ " + output2 + " from " + output1);
                        client.say(channel, output3 + " ~ " + output2 + " from " + output1);
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
    async function dogfacts(){
        input = message.slice(10);
        const fetchResponse = await fetch('https://dog-facts-api.herokuapp.com/api/v1/resources/dogs?number=1', {method: 'GET', headers: {'accept': 'application/json', 'content-type': 'application/json'}})
        .then(response => {
            if (response.ok) {
                response.json().then((data) => {
                    var outputArr = JSON.parse(JSON.stringify(data));
                    var output = outputArr[0]['fact'];
                    sleep(1000);
                    if(input === "") {
                        console.log(output);
                        client.say(channel, output);
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
    async function catfacts(){
        input = message.slice(10);
        const fetchResponse = await fetch('https://meowfacts.herokuapp.com/', {method: 'GET', headers: {'accept': 'application/json', 'content-type': 'application/json'}})
        .then(response => {
            if (response.ok) {
                response.json().then((data) => {
                    var outputArr = JSON.parse(JSON.stringify(data));
                    var output = outputArr['data'][0];
                    sleep(1000);
                    if(input === "") {
                        console.log(output);
                        client.say(channel, output);
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

    // Dad Jokes Function
    async function dad(){
        input = message.slice(5);
        if(input === "") {
            const fetchResponse = await fetch('https://icanhazdadjoke.com/', {method: 'GET', headers: {'accept': 'text/plain', 'content-type': 'text/plain'}})
            .then(response => {
                if (response.ok) {
                    response.text().then((data) => {
                        sleep(1000);
                        console.log(data);
                        client.say(channel, data);
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
            const fetchResponse = await fetch('https://icanhazdadjoke.com/search?term=' + input, {method: 'GET', headers: {'accept': 'application/json', 'content-type': 'application/json'}})
            .then(response => {
                if (response.ok) {
                    response.json().then((data) => {
                        var outputArr = JSON.parse(JSON.stringify(data));
                        sleep(1000);
                        if (outputArr['total_jokes'] == 0) {
                            console.log("No Jokes found");
                            client.say(channel, "Sorry, nothing found with the search term: " + input);
                        } else {
                            var random = Math.floor(Math.random() * outputArr['results'].length);
                            console.log(outputArr['results'][random]['joke']);
                            client.say(channel, outputArr['results'][random]['joke']);
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
    async function advice(){
        input = message.slice(8);
        const fetchResponse = await fetch('https://api.adviceslip.com/advice', {method: 'GET', headers: {'accept': 'application/json', 'content-type': 'application/json'}})
        .then(response => {
            if (response.ok) {
                response.json().then((data) => {
                    var outputArr = JSON.parse(JSON.stringify(data));
                    sleep(1000);
                    if(input === "") {
                        console.log(outputArr['slip']['advice']);
                        client.say(channel, outputArr['slip']['advice']);
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

    // Number Facts Function
    async function numfacts(){
        input = message.split(" ");
        if (input.length > 2) {
            return;
        } else if(input.length == 2) {
            fetchResponse = await fetch('http://numbersapi.com/' + input[1] + '')
            .then(response => {
                if (response.ok) {
                    response.text().then((data) => {
                        sleep(1000);
                        console.log(data);
                        client.say(channel, data);
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
                        console.log(data);
                        client.say(channel, data);
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

    // Yoda Translation Function
    async function yoda(){
        input = message.slice(11)
        if(input === "") {
            console.log('No input');
            client.say(channel, 'No input provided, !yoda<SPACE>Text to be translated');
        } else {
            const fetchResponse = await fetch('http://api.funtranslations.com/translate/yoda?text=' + input, {method: 'GET', headers: {'accept': 'application/json', 'content-type': 'application/json', 'X-Funtranslations-Api-Secret': `${process.env.API_FUNTRANSLATION_SECRET}`}})
            .then(response => {
                if (response.ok) {
                    response.json().then((data) => {
                        var outputArr = JSON.parse(JSON.stringify(data));
                        sleep(1000);
                        console.log(outputArr['contents']['translated']);
                        client.say(channel, outputArr['contents']['translated']);
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

    // Countdown Function
    async function countDown() {
        input = message.split(" ");
        if (input.length > 3 || input.length == 2) {
            client.say(channel, `@${tags.username}, invalid use of command: !snipecd or !snipecd<SPACE>Server<SPACE>Costumes`);
            return;
        } else if (input.length == 3) {
            client.say(channel, `Come join us for snipe games! Server-Mode: ` + input[1] + ' Costume: ' + input[2]);
            await sleep(1000);
        }
        client.say(channel, 'Countdown starting in 10 seconds');
        await sleep(9000);
        client.say(channel, `Get ready....`);
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
        client.say(channel, 'Lets Goooooooo!!');
        return;
    }

    // Commands with input
    if (message.includes("Mingion Chokes, you can !accept or !deny within 2 minutes")) {
        if(isModUp) {
            duel();
        } else {
            //console.log(`${tags.username}`);
            return;
        }
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

    if (message.includes("!yoda")) {
        yoda();
    }

    if (message.includes("!snipecd")) {
        if(isModUp) {
            countDown();
        } else {
            console.log(`${tags.username}`);
            return;
        }
    }

    // Listen only on bot's channel
    if (channel.includes(process.env.TWITCH_USERNAME)) {
        switch (message.toLowerCase()) {
            case '!addme':
                addme();
                break;
            case '!removeme':
                removeme();
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