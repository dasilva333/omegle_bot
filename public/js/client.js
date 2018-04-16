var omegleBot = new (function(){
    var self = this;

    this.socket = null;

    this.chatLog = ko.observable("");
    this.customMessage = ko.observable("");
    this.connected = ko.observable(false);
    this.aiBotEnabled = ko.observable(false);

    var hidden, visibilityState, visibilityChange, focused = true;

    if (typeof document.hidden !== "undefined") {
      hidden = "hidden", visibilityChange = "visibilitychange", visibilityState = "visibilityState";
    } else if (typeof document.msHidden !== "undefined") {
      hidden = "msHidden", visibilityChange = "msvisibilitychange", visibilityState = "msVisibilityState";
    }

    var document_hidden = document[hidden];

    document.addEventListener(visibilityChange, function() {
      if(document_hidden != document[hidden]) {
        if(document[hidden]) {
          // Document hidden
          focused = false;
        } else {
          // Document shown
          focused = true;
          document.title = "Omegle Chat";
        }

        document_hidden = document[hidden];
      }
    });

    this.startTyping = _.throttle(function(){
      self.socket.emit("message", { action: "startTyping" });
    }, 5000, { leading: true, trailing: false });

    this.messageEventHandler = function(viewModel, event){
      if ( event.keyCode == 13 ){
        if ( self.customMessage() != "" ){
          self.socket.emit("message", { action: "message", text: self.customMessage() });
          self.customMessage("");
        }          
        self.socket.emit("message", { action: "stopTyping" });
      } else {
        self.startTyping();
      }
    };

    _.templateSettings = {
      interpolate: /\{\{(.+?)\}\}/g
    };
    var eventTemplate = _.template('<div class="event">{{ event }}</div>');
    var captchaTemplate = _.template('<div id="catpcha"></div>');
    var messageTemplate = _.template('<div class="chat-message {{source}}"><strong>{{ source }}</strong> {{ message }}</div>');
    /*
      Desired Functionality:
      train stranger messages for spam
      train stranger messages with response
    */
    var strangerTemplate = _.template('<div class="chat-message {{source}}"><strong>{{ source }}</strong> <a href="#" onclick="omegleBot.options(this)">{{ message }}</a></div>');

    this.activeMessage = null;
    var dropdown = $("#dropdownOptions");
    this.options = function(anchor){
      self.activeMessage = anchor.innerHTML;        
      $("#dropdownOptions").toggle();
      $("#dropdownOptions").position({
        of: $( anchor ),
        my: "left top",
        at: "right bottom"
      });
      console.log("options", arguments);
    };

    this.train = function(){
      //self.socket.emit("message", { "action": "trainResponse", "text": self.activeMessage });
    };

    this.openLink = function(){
      $("#dropdownOptions").hide();
      window.open(self.activeMessage, "_blank");
    };

    this.markSpam = function(){
      $("#dropdownOptions").hide();
      self.socket.emit("message", { "action": "markSpam", "text": self.activeMessage });
    };

    this.recaptchaReady = function(){
        console.log("recaptchaReady");
    };

    this.init = function(){
      ko.applyBindings(self);
      
      self.socket = io();

      self.socket.on('connection', function(socket){
        console.log('connected');
      });

      self.socket.on("status", function(response){
        console.log("status", response);
        self.aiBotEnabled(response.aiBotEnabled);
      });

      var chatLogSection = $("#chatLog");
      self.socket.on("recaptchaRequired", function(response){
            console.log("recaptchaRequired", response.challenge);
            self.chatLog(self.chatLog() + captchaTemplate());
            grecaptcha.render('catpcha', {
                'sitekey' : response.challenge,
                'callback': function(solution){
                    self.socket.emit("message", { action: "solvedCaptcha", solution: solution });
                }
            });
      });
      
      self.socket.on('event', function(event){
        console.log("event", event);
        if ( event.event.indexOf("connected to stranger") > -1 ){
          self.chatLog("");
        } else if ( event.event.toLowerCase().indexOf("disconnected from chat") > -1 && self.chatLog().indexOf("Stranger") > -1 ){
          self.socket.emit("message",{ action:"saveChat", chat: self.chatLog() });
        }
        self.chatLog(self.chatLog() + eventTemplate(event));
        chatLogSection.scrollTop(chatLogSection[0].scrollHeight);
      });

      self.socket.on('chat', function(chat){
        console.log("chat", chat);
        if ( chat.source == "Stranger"){
          self.chatLog(self.chatLog() + strangerTemplate(chat));
          if (!focused){
            document.title = "-New Message-";            
          }
        } else {
          self.chatLog(self.chatLog() + messageTemplate(chat));
        }          
        chatLogSection.scrollTop(chatLogSection[0].scrollHeight);
      });

    };

    this.disconnect = function(){
        console.log("emit disconnect");
        $("#customMessage").focus();
        self.socket.emit("message", { "action": "disconnect" });
    };

    this.toggleConnection = function(){
        console.log("emit connect");
        $("#customMessage").focus();
        self.socket.emit("message", { "action": "connect" });
    };

    this.toggleAI = function(){
        console.log("emit toggleAI");
        $("#customMessage").focus();
        self.socket.emit("message", { "action": "toggleAI" });
    };

  });
  $(document).ready(omegleBot.init);