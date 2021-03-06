var path = require("path");
var socket_io = require('socket.io');
var _ = require("lodash");
var bot = require("./bot.js");
var io = socket_io();
var socketApi = {};
socketApi.io = io;

bot.setSocket(io.sockets);

io.on('connection', function(socket){
  console.log('A user connected');
  io.sockets.emit("status", bot.getStatus());
  socket.on("message", function(message){
    //console.log("message", message);
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
    } else if ( message.action == "requestLogs" ){
      bot.listChats();
    } else if ( message.action == "requestLog" ){
      bot.readLog(message.logName);
    }
  });  
});

module.exports = socketApi;
