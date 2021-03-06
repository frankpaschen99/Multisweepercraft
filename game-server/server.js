var io = require('socket.io')(7865);
const fs = require('fs');

/* Socket IO Cancer Below */
io.on('connection', function(socket) {
    console.log("Socket connected " + socket.id);
    socket.on('join_game', function(id, nickname) { // receive lobbyid and user's nickname
			manager.createGameOrJoin(socket, nickname, id);
    });
	
	// Recieve an updated tile and send the data to all players
	socket.on('bdata', function(state, x, y, op) {
		// try/catch to handle players clicking on board before it starts, crashing the server
		try {
			manager.getGameFromID(clientmanager.getClientFromSocket(socket.id).gameid).updateBoard(state, x, y, op);
		} catch (e) {
			console.log("Don't click the board please.");
		}
	});
	socket.on('trigger_restart', function() {
		manager.getGameFromID(clientmanager.getClientFromSocket(socket.id).gameid).restartGame();
	});
	socket.on('request_init_board', function() {
		manager.getGameFromID(clientmanager.getClientFromSocket(socket.id).gameid).sendBoard();
	});
	
	//  Recieve the initial board from the host. Will not accept from non-hosts
	socket.on('init_board', function(board) {
		if (clientmanager.getClientFromSocket(socket.id).isHost) {
			console.log("recieved board from host");
			manager.getGameFromID(clientmanager.getClientFromSocket(socket.id).gameid).setBoard(board);
		}
	});
	
	// Handle client disconnect
    socket.on('disconnect', function() {
        var client = clientmanager.getClientFromSocket(socket.id);
		if (typeof client != 'undefined') manager.leaveGame(client);
		console.log("Socket disconnected: " + socket.id);
    });
});

class Game {
    constructor(_id) {
        console.log("New game " + _id + " created!");
        this.clients = [];
        this.id = _id;
		this.gameBoard = null;
    }
    /* puts a client into the game. takes a Client object for the parameter */
    joinGame(_client) {
		if (this.clients.length == 0) {
			_client.socketObject.emit('ident_host');
			console.log("Client " + _client.nickname + " made host!");
		}
        this.clients.push(_client);
        clientmanager.addClient(_client);
        console.log("Player " + _client.nickname + " joined! Number of connnected clients: " + this.clients.length);
		
        this.sendPlayerList();
		this.sendBoard();
    }
	restartGame() {
		console.log("restartGame() called");
		this.clients.forEach(function(index) {
			if (!index.isHost) {
				index.socketObject.emit('restart');
			}
        });
		this.sendBoard();
	}
    leaveGame(_client) {
        this.clients.remove(_client);
        clientmanager.removeClient(_client);
        console.log("Player " + _client.nickname + " left! Number of connected clients: " + this.clients.length);
        if (this.clients.length == 0) {
            console.log("Game #" + this.id + " removed. Reason: Lobby empty.");
            manager.games.remove(this);
        }
        this.sendPlayerList();
    }
    sendPlayerList() { // called whenever a player disconnects/joins
        var names = [];
        this.clients.forEach(function(index) {
            names.push(index.nickname);
        });
        this.clients.forEach(function(index) {
            index.socketObject.emit('plist', names);
        });
    }
	// Set the board recieved from the host
	setBoard(_board) {
	//	if (this.board == null) {	// failsafe to ensure only hosts can set the board
			this.board = _board;
	//	}
	}
	// send initial board to non-hosts when they join
	sendBoard() {
		this.clients.forEach(function(index) {
			if (!index.isHost) {	// if not the host, send the inital game board 
				index.socketObject.emit('boardstart', this.board);
				console.log("game board sent to socket: " + index.socketObject.id);
			}
        }.bind(this));
	}
	// send updated tile information to all clients
	updateBoard(state, x, y, op) {
		this.clients.forEach(function(index) {
				index.socketObject.emit('board_update', state, x, y, op);
        });
	}
}
Array.prototype.remove = function(object) {
    var index = this.indexOf(object);
    if (index > -1) this.splice(index, 1);
}
class Client {
    constructor(_socket, _nickname, _gameid, _isHost) {
        this.socketObject = _socket;
        this.socket = _socket.id
        this.gameid = _gameid; // stores game id the client is in
        this.nickname = _nickname;
        this.score = 0;
		this.isHost = _isHost;
		
		if (_nickname == "" || _nickname == " ") {
			this.nickname = "Unnamed Player";
		}
    }
}
class ClientManager {
    constructor() {
        this.clients = [];
    }
    /* returns the Client object that corresponds to a socket. Takes a socket.id */
    getClientFromSocket(socket) {
        for (var i = 0; i < this.clients.length; i++)
            if (this.clients[i].socket == socket) return this.clients[i];
    }
    addClient(client) {
        this.clients.push(client);
    }
    removeClient(client) {
        this.clients.remove(client);
    }
}
class GameManager {
    constructor() {
        this.games = [];
    }
    /* Creates a new Game. Takes an array of clients and a unique lobby ID */
    createGame(_id) {
        var newGame = new Game(_id);
        this.games.push(newGame);
        return newGame;
    }
    /* Puts a player in a game if it already exists, creates one if not. Takes a socket.id, string nickname, number gameid*/
    createGameOrJoin(_socket, _nickname, _id) {
        if (this.games.indexOf(this.getGameFromID(_id)) >= 0) this.getGameFromID(_id).joinGame(new Client(_socket, _nickname, _id, false));
        else this.createGame(_id).joinGame(new Client(_socket, _nickname, _id, true));
    }
    /* Takes an integer ID and returns the game object associated with it */
    getGameFromID(_id) {
        for (var i = 0; i < this.games.length; i++)
            if (this.games[i].id == _id) return this.games[i];
    }
    leaveGame(client) {
        var game = this.getGameFromID(client.gameid);
        game.leaveGame(client);
    }
}


var manager = new GameManager();
var clientmanager = new ClientManager();