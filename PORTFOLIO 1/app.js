// Express Code
var express = require('express');
var app = express();
var serv = require('http').Server(app);
console.log("Here");
app.get('/',function(req, res) {
	res.sendFile(__dirname + '/client/index.html');
});
app.use('/client',express.static(__dirname + '/client'));
console.log("Here2");
serv.listen(2000);
console.log("Server started.");

// Global Variables
var SOCKET_LIST = {};
var
WIDTH  = 500,
HEIGHT = 500;
console.log("Here3");
// Basic Object Constructor
var Entity = function(){
	var self = {
		x:0,
		y:(HEIGHT-100)/2,
		width:30,
		height:30,
		spdY:0,
		id:""
	};
	self.update = function(){
		self.updatePosition();
	}
	self.updatePosition = function(){
		if(self.spdX)
		self.x += self.spdX;
		if(self.spdY)
		self.y += self.spdY;
	}
	console.log("Here4");
	return self;
}

// Player Constructor 
var Player = function(id){
	var self = Entity();
	self.id = id;
	self.pressingUp = false;
	self.pressingDown = false;
	self.pressingRight = false,
	self.pressingLeft = false,
	self.maxSpd = 7;
	
	var super_update = self.update;
	self.update = function(){
		self.updateSpd();
		super_update();
	}
	self.updateSpd = function(){
		if(self.pressingUp) self.spdY = -self.maxSpd;
		else if(self.pressingDown) self.spdY = self.maxSpd;
		else if(self.pressingRight) self.spdX = self.maxSpd;
		else if(self.pressingLeft) self.spdX = self.maxSpd;
		else {self.spdY = 0; self.spdX = 0;}	
	}
	Player.list[id] = self;
	return self;
}
// List of all players in game
Player.list = {};
// Recieves player's input and sets states within the player object
Player.onConnect = function(socket){
	console.log("Here5");
	var player = Player(socket.id);
	socket.on('serveBallButton', function(){
		player.serveBall = true;
	});
	socket.on('keyPress',function(data){
		if(data.inputId === 'up') player.pressingUp = data.state;
		else if(data.inputId === 'down') player.pressingDown = data.state;
	});
}
// On disconnect, the player is removed from the Player List and the ball stops
Player.onDisconnect = function(socket){
	
	delete Player.list[socket.id];
}
// Updates each player's position
Player.update = function(){
	var pack = [];
	var count = 0;
	for(var i in Player.list){
		var player = Player.list[i];
		if(count % 2 === 0){
			player.x = WIDTH-20;
			player.update();
			pack.push({
				x:WIDTH-20,
				y:player.y,
				width:player.width,
				height:player.height
			});	
		}else{
			player.x=0;
			player.update();
			pack.push({
				x:0,
				y:player.y,
				width:player.width,
				height:player.height
			});	
		}
		count++;
	}
	count = 0;
	return pack;
}


// Socket IO Code
var io = require('socket.io')(serv,{});
io.sockets.on('connection', function(socket){
	socket.id = Math.random();
	//LIST OF ALL SOCKETS
	SOCKET_LIST[socket.id] = socket;
	console.log("Here6");
	Player.onConnect(socket);
	
	//HANDLES DISCONNECTS
	socket.on('disconnect',function(){
		delete SOCKET_LIST[socket.id];
		Player.onDisconnect(socket);
	});
	// HANDLES MESSAGES
    socket.on('sendMsgToServer',function(data){
        var playerName = ("" + socket.id).slice(2,7);
        for(var i in SOCKET_LIST){
            SOCKET_LIST[i].emit('addToChat',playerName + ': ' + data);
        }
    });	
});

// Sets the update interval
setInterval(function(){console.log("Here7");
	// DATA TO BE SENT TO ALL PLAYERS
	var pack = {
		player:Player.update(),
		
	}
	// UPDATES ALL PLAYER'S DATA
	for(var i in SOCKET_LIST){
		var socket = SOCKET_LIST[i];
		socket.emit('newPositions',pack);
	}
},1000/25);
