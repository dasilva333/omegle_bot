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
    omegle_bot.socket.emit("event", { event: 'error: ' + err });
    console.log('error: ' + err);
});

//gotID is emitted when you're connected to Omegle 
om.on('gotID',function(id){
    omegle_bot.socket.emit("event", { event: 'connected to the server as: ' + id });
    console.log('connected to the server as: ' + id);
});

//waiting is emitted when you're waiting to connect to a stranger
om.on('waiting', function(){
    omegle_bot.socket.emit("event", { event: 'waiting for a stranger.' });
    console.log('waiting for a stranger.');    
});

om.on("recaptchaRequired", function(challenge){
    console.log("recaptchaRequired", challenge);
    omegle_bot.socket.emit("recaptchaRequired", { challenge: challenge });
});

var isRoomActive = false;
var messageReceived = false;
var messagesSent = 0;
var wpm = 40;
var wpms = (wpm / 60) * 1000;
var thinkingDelay = 2500;
var followUpDelay = 2000;
var pertinentQuestionDelay = 25 * 1000;
var reconnectTimeoutDelay = 5000;
var initialMessageDelay = 500;
var isBotActive = true;
var messageQueue = [];
var idleTimeout;
var idleTimeoutDelay = 30 * 1000;

//emitted when you're connected to a stranger
om.on('connected',function(){    
    console.log("connected to stranger");
    isRoomActive = true;
    messageReceived = false;
    messagesSent = 0;
    omegle_bot.socket.emit("event", {event: "connected to stranger"});
    var initialMessage = _.sample(trainingEntries.initialMessages);
    simulateReply(initialMessage, true, initialMessageDelay);
    idleTimeout = setTimeout(function(){
        if ( !messageReceived && isRoomActive ){
            omegle_bot.socket.emit("event", {event: "disconnected after 30s timeout"});
            reconnect();
        }
    }, idleTimeoutDelay);
});

var simulateReply = function(message, required, delay){
    var additionalDelay = 0 || delay;
    var typingDelay = additionalDelay + thinkingDelay + ((message.split(" ").length -1) * wpms);
    omegle_bot.socket.emit("event", { event: (required ? "[Required]" : "") + " Reply in " + (typingDelay/1000).toFixed(1) + "s - " + message });
    messageQueue.push({ delay: typingDelay, message: message, required: required });            
};

/* this message queue handler takes care of the array of messages for the current session */
setInterval(function(){
    if ( messageQueue.length && isRoomActive ){
        if ( (messageReceived) || (!messageReceived && messagesSent == 0) ){
            //om.startTyping();
            messageQueue = _.map(messageQueue, function(item){
                item.delay = item.delay - 1000;
                return item;
            });
            var isRequired = false;
            var nextMessage = _.reduce(messageQueue, function(memo, item, index){
                if ( memo == "" && item.delay <= 0 ) {
                    memo = item.message;
                    isRequired = item.required;
                    messageQueue.splice(index, 1);
                }    
                return memo;
            }, "");
            if ( nextMessage != "" ){
                //om.stopTyping();
                if ( (isBotActive && isRoomActive) || (!isBotActive && isRoomActive && isRequired) ){
                    messagesSent = true;
                    omegle_bot.socket.emit("chat", { source: "Bot", message: nextMessage });
                    om.send(nextMessage); //used to send a message to the stranger                
                } 
            }
        }
    } else if (isRoomActive) {        
        om.stopTyping();
    }
}, 1000);


var chatId = 1;
//emitted when you get a message
om.on('gotMessage', _.throttle(function(msg){
    messageReceived = true;
    omegle_bot.socket.emit("chat", { source: "Stranger", message: msg });
    var resolveStrangerMessage = function(err, messages) {
        if(err) {
            console.log("unresolved", err.message);
            unirest.get("https://acobot-brainshop-ai-v1.p.mashape.com/get?bid=178&key=sX5A2PcYZbsN5EY6&uid=mashape&msg=" + escape(msg))
            .header("X-Mashape-Key", "8ig3djeVPemshoo2gtXYaWwmFehsp1c6jzvjsnt1iLzIVRjKtF")
            .header("Accept", "application/json")
            .end(function (result) {
                simulateReply(result.body.cnt, false, 0);               
            });
        }
        else {
            simulateReply(_.map(messages, 'content').join(", "), false, 0);
        }    
    };
    if ( spamEntries.indexOf(msg)> -1 ){
        omegle_bot.socket.emit("event", { event: "Disconnected from spam bot" });
        reconnect();
    }
    else if ( isBotActive && isRoomActive ){
        customBot.resolve(chatId, msg, resolveStrangerMessage);        
    }    
}, 5000, { leading: false }));

//emitted when the stranger disconnects
om.on('strangerDisconnected',function(){
    omegle_bot.socket.emit("event", { event: "Stranger disconnected from chat" });
    reconnect();
});

om.on("typing", function(){
    //if the stranger starts typing clear out the 30s timer
    clearTimeout(idleTimeout);
    omegle_bot.socket.emit("event", { event: "stranger_typing" });
});

om.on("commonLikes", function(likes){
    omegle_bot.socket.emit("event", { event: "common likes: " + likes.join(", ") });
    
    var followUpMessage;
    if ( likes.length > 1 ){
        followUpMessage = _.sample(trainingEntries.followUpMessagesMulti) + _.take(likes, 2).join(" and ");
    } else {
        followUpMessage = _.sample(trainingEntries.followUpMessagesSingle) + _.first(likes) + "?";
    }
    simulateReply(followUpMessage, true, followUpDelay);

    var randomLike = _.sample(likes);
    if ( randomLike in trainingEntries.questions ){
        var pertinentQuestion = trainingEntries.questions[randomLike];
        simulateReply(pertinentQuestion, true, pertinentQuestionDelay);
    }
});

var reconnectTimeout;

function reconnect(){
    omegle_bot.socket.emit("event", { event: "Reconnecting in 5s" });
    reconnectTimeout = setTimeout(function(){
        chatId++;
        isRoomActive = false;
        messageQueue = [];        
        om.connect(trainingEntries.likes);
    }, reconnectTimeoutDelay);
    
}

var events = require('events');
var omegle_bot = new events.EventEmitter();
var logFolder = "./logs/";

Object.assign(omegle_bot,  {
    setSocket: function(socket){
        omegle_bot.socket = socket;
    },
    toggleAI: function(){
        isBotActive = !isBotActive;
        omegle_bot.socket.emit("event", { event: 'Bot is now ' + (isBotActive ? "active" : "disabled") });
        omegle_bot.socket.emit("status", omegle_bot.getStatus());
    }, 
    message: function(text){
        omegle_bot.socket.emit("chat", { source: "Me", message: text });
        om.send(text);
    },
    disconnect: function(){
        clearTimeout(reconnectTimeout);
        om.disconnect();
        chatId++;
        isRoomActive = false;
        omegle_bot.socket.emit("event", { event: "Disconnected from chat" });
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
        omegle_bot.socket.emit("event", { event: "Entry added as spam: " + text });
    },
    readLog: function(fileName){
        omegle_bot.socket.emit("chatLogs", { log: fs.readFileSync(path.join(logFolder, fileName)).toString("utf8"), name: fileName });
    },
    listChats: function(){
        var files = _.map(fs.readdirSync(logFolder), function(file){
          return {
              name: file,
              size: fs.statSync(path.join(logFolder, file)).size
          }  
        });
        omegle_bot.socket.emit("chatLogs", { files: files });
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
    },
    getStatus: function(){
        return {
            aiBotEnabled: isBotActive
        };
    }
});

module.exports = omegle_bot;