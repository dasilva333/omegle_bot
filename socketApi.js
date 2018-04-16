var path = require("path");
var socket_io = require('socket.io');
var _ = require("lodash");
var bot = require("./bot.js");
var io = socket_io();
var socketApi = {};
socketApi.io = io;

io.on('connection', function(socket){
  console.log('A user connected');
  socket.on("message", function(message){
    console.log("message", message);
    if ( message.action == "connect"){
      bot.reconnect();
    } else if ( message.action == "disconnect"){
      bot.disconnect();
    } else if ( message.action == "message"){
      bot.message(message.text);
    } else if ( message.action == "toggleAI"){
      bot.toggleAI();
    } else if ( message.action == "stopTyping" ){
      bot.stopTyping();
    } else if ( message.action == "startTyping" ){
      bot.startTyping();
    } else if ( message.action == "markSpam"){
      bot.markSpam(message.text);
    } else if ( message.action == "saveChat" ){
      bot.saveChat(message.chat);
    } else if ( message.action == "solvedCaptcha"){
      bot.solvedCaptcha(message.solution);
    }
  });  
});

bot.on("chat", function(message){
  //console.log("chat", message);
  io.sockets.emit('chat', message);
});

bot.on("events", function(event){
  //console.log("events", event);
  io.sockets.emit('event', event);
});

bot.on("recaptchaRequired", function(challenge){
  //console.log("recaptchaRequired", challenge);
  io.sockets.emit('recaptchaRequired', challenge);
});

module.exports = socketApi;
