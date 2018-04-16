var unirest = require("unirest");
var Omegle = require('omegle-node');
var _ = require("lodash");
var fs = require("fs");
var path = require("path");
var om = new Omegle(); //create an instance of `Omegle`

// Core dependency
const talkify = require('talkify');
const Bot = talkify.Bot;
 
// Types dependencies
const BotTypes = talkify.BotTypes;
const Message = BotTypes.Message;
const SingleLineMessage = BotTypes.SingleLineMessage;
const MultiLineMessage = BotTypes.MultiLineMessage;
 
// Skills dependencies
const Skill = BotTypes.Skill;
 
// Training dependencies
const TrainingDocument = BotTypes.TrainingDocument;

const customBot = new Bot();

var trainingFile = "training.json";
var trainingEntries = JSON.parse(fs.readFileSync(trainingFile));

_.each(trainingEntries.topics, function(questions, type){
    _.each(questions, function(question){
        //console.log("training-topic", type, "for", question);
        customBot.train( type, question, _.noop );
    });
});


_.each(trainingEntries.skills, function(answer, topic){
    //console.log("topic-skill", topic, "answer", answer)
    customBot.addSkill(new Skill(topic + '_skill', topic, function(context, request, response, next) {
        response.message = new SingleLineMessage(answer);
        next();
    }), { minConfidence: 0.9 });
});

var spamFile = "spam.json";
var spamEntries = JSON.parse(fs.readFileSync(spamFile));
//console.log("spam", spamEntries);

//This will print any errors that might get thrown by functions
om.on('omerror',function(err){
    omegle_bot.emit("events", { event: 'error: ' + err });
    console.log('error: ' + err);
});

//gotID is emitted when you're connected to Omegle 
om.on('gotID',function(id){
    omegle_bot.emit("events", { event: 'connected to the server as: ' + id });
    console.log('connected to the server as: ' + id);
});

//waiting is emitted when you're waiting to connect to a stranger
om.on('waiting', function(){
    omegle_bot.emit("events", { event: 'waiting for a stranger.' });
    console.log('waiting for a stranger.');    
});

om.on("recaptchaRequired", function(challenge){
    console.log("recaptchaRequired", challenge);
    omegle_bot.emit("recaptchaRequired", { challenge: challenge });
});

var isRoomActive = false;
var messageReceived = false;
var idleTimeout;
//emitted when you're connected to a stranger
om.on('connected',function(){    
    console.log("connected to stranger");
    isRoomActive = true;
    messageReceived = false;
    omegle_bot.emit("events", {event: "connected to stranger"});
    messageTimeout0 = setTimeout(function(){
        var initialMessage = _.sample(["hi", "hello", "hey", "hi, how are you?", 'Hello, nice to meet you.', 'How are you doing today?']);
        console.log('Initial Message: ', initialMessage);
        omegle_bot.emit("chat", { source: "Bot", message: initialMessage });
        om.send(initialMessage); //used to send a message to the stranger
    },1000);    
    idleTimeout = setTimeout(function(){
        if ( !messageReceived && isRoomActive ){
            omegle_bot.emit("events", {event: "disconnected after 30s timeout"});
            reconnect();
        }
    }, 30 * 1000);
});

var wpm = 30;
var wpms = (wpm / 60) * 1000;
var isBotActive = true;

var simulateReply = function(message){
    console.log("Reply: ", message); 
    var typingDelay = 2000 + ((message.split(" ").length -1) * wpms);
    omegle_bot.emit("events", { event: "Reply in " + typingDelay + "ms - " + message });
    om.startTyping();
    messageTimeout3 = setTimeout(function(){
        om.stopTyping();
        if ( isBotActive && isRoomActive ){
            console.log("Reply Sent");
            omegle_bot.emit("chat", { source: "Bot", message: message });
            om.send(message); //used to send a message to the stranger                
        }
    }, typingDelay);         
};


var chatId = 1;
//emitted when you get a message
om.on('gotMessage',function(msg){
    console.log('Stranger: ' + msg);
    messageReceived = true;
    omegle_bot.emit("chat", { source: "Stranger", message: msg });
    var resolveStrangerMessage = function(err, messages) {
        if(err) {
            console.log("unresolved", err.message);
            unirest.get("https://acobot-brainshop-ai-v1.p.mashape.com/get?bid=178&key=sX5A2PcYZbsN5EY6&uid=mashape&msg=" + escape(msg))
            .header("X-Mashape-Key", "8ig3djeVPemshoo2gtXYaWwmFehsp1c6jzvjsnt1iLzIVRjKtF")
            .header("Accept", "application/json")
            .end(function (result) {
                simulateReply(result.body.cnt);               
            });
        }
        else {
            simulateReply(_.map(messages, 'content').join(", "));
        }    
    };
    if ( spamEntries.indexOf(msg)> -1 ){
        omegle_bot.emit("events", { event: "Disconnected from spam bot" });
        reconnect();
    }
    else if ( isBotActive && isRoomActive ){
        customBot.resolve(chatId, msg, resolveStrangerMessage);        
    }    
});

//emitted when the stranger disconnects
om.on('strangerDisconnected',function(){
    console.log('stranger disconnected.');
    chatId++;
    isRoomActive = false;
    omegle_bot.emit("events", { event: "Stranger disconnected from chat" });
    reconnect();
});

om.on("typing", function(){
    console.log("stranger is typing...");
    //if the stranger starts typing clear out the 30s timer
    clearTimeout(idleTimeout);
    omegle_bot.emit("events", { event: "stranger is typing..." });
});

var messageTimeout0, messageTimeout1, messageTimeout2, messageTimeout3;

om.on("commonLikes", function(likes){
    omegle_bot.emit("events", { event: "common likes: " + likes.join(", ") });
    messageTimeout1 = setTimeout(function(){
        var followUpMessage;
        if ( likes.length > 1 ){
            followUpMessage = _.sample(["I see you got multiple interests; ", "I see we both like; ", "hey we got this in common; "]) + likes.join(", ");
        } else {
            followUpMessage = _.sample(["you like ", "i see we both like ", "", "I see we're both interested in "]) + _.first(likes) + "?";
        }
        omegle_bot.emit("chat", { source: "Bot", message: followUpMessage });
        om.send(followUpMessage);
    }, 2000);

    messageTimeout2 = setTimeout(function(){
        var randomLike = _.sample(likes);
        if ( randomLike in trainingEntries.questions ){
            var pertinentQuestion = trainingEntries.questions[randomLike];
            omegle_bot.emit("chat", { source: "Bot", message: pertinentQuestion });
            om.send(pertinentQuestion);
        }           
    }, 30 * 1000);
});

var reconnectTimeout;

function reconnect(){
    clearTimeout(messageTimeout0);
    clearTimeout(messageTimeout1);
    clearTimeout(messageTimeout2);
    clearTimeout(messageTimeout3);
    omegle_bot.emit("events", { event: "Reconnecting in 5s" });
    reconnectTimeout = setTimeout(function(){
        om.connect(["politics", "movies", "music", "miami", "broward", "florida", "programming", "developer"]);
    }, 5000);
    
}

var events = require('events');
var omegle_bot = new events.EventEmitter();
var logFolder = "./logs/";

Object.assign(omegle_bot,  {
    toggleAI: function(){
        isBotActive = !isBotActive;
        omegle_bot.emit("events", { event: 'Bot is now ' + (isBotActive ? "active" : "disabled") });
    }, 
    message: function(text){
        omegle_bot.emit("chat", { source: "Me", message: text });
        om.send(text);
    },
    disconnect: function(){
        clearTimeout(reconnectTimeout);
        clearTimeout(messageTimeout0);
        clearTimeout(messageTimeout1);
        clearTimeout(messageTimeout2);
        clearTimeout(messageTimeout3);
        om.disconnect();
        omegle_bot.emit("events", { event: "Disconnected from chat" });
    },
    reconnect: function(){
        reconnect();
    },
    stopTyping: function(){
        if ( isRoomActive ){
            om.stopTyping();
        }        
    },
    startTyping: function(){
        if (isRoomActive){
            om.startTyping();
        }        
    },
    markSpam: function(text){
        spamEntries.push(text);      
        fs.writeFileSync(spamFile, JSON.stringify(spamEntries));
        omegle_bot.emit("events", { event: "Entry added as spam: " + text });
    },
    readLog: function(fileName){
        omegle_bot.emit("chatLogs", { log: fs.readFileSync(path.join(logFolder, fileName)).toString("utf8"), name: fileName });
    },
    listChats: function(){
        var files = _.map(fs.readdirSync(logFolder), function(file){
          return {
              name: file,
              size: fs.statSync(path.join(logFolder, file)).size
          }  
        });
        console.log("files", files);
        omegle_bot.emit("chatLogs", { files: files });
    },
    saveChat: function(chat){
        var todayDate = new Date();
        var formattedDate = todayDate.toISOString().replace(/\:/g,"_").replace(/\./g,"_");
        var chatLogFile = "chats_" + formattedDate + ".html";        
        var logFilePath = path.join(logFolder, chatLogFile);
        fs.writeFileSync(logFilePath, chat, { flag: "w" });
    },
    solvedCaptcha: function(solution){
        om.solveReCAPTCHA(solution);
        setTimeout(function(){
            reconnect();
        }, 2000);
    }
});

module.exports = omegle_bot;