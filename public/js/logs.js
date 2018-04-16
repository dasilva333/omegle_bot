var chatLogs = new (function(){
    var self = this;

    this.logFiles = ko.observableArray([]);
    this.logContents = ko.observableArray([]);

    this.init = function(){
        console.log("init chat logs");
        ko.applyBindings(self);
      
        self.socket = io();

        self.socket.emit("message", { action: "requestLogs" });

        self.socket.on("chatLogs", function(response){
            console.log("response", response);
            if ( response && response.files ){
                self.logFiles(response.files);
            } else {
                self.logContents.push(response);
            }            
      });
    };

    this.logContent = function(fileName){
        return ko.computed(function(){
            return _.findWhere( self.logContents() , { name: fileName });
        });
    };

    this.viewLog = function(log){
        self.socket.emit("message", { action: "requestLog", logName: log.name });        
        return true;
    };
});

$(document).ready(chatLogs.init);