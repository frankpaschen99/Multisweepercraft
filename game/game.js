var gameProperties = {
    screenWidth: 32 * 32,
    screenHeight: 32 * 24,
    
    tileWidth: 32,
    tileHeight: 32,
    
    boardWidth: 32,
    boardHeight: 24,
    
    totalMines: 148,
};

var states = {
    game: "game",
};

var graphicAssets = {
    tiles: {URL: 'assets/tiles.png', name: 'tiles', frames: 14},
};

var fontStyles = {
    counterFontStyle: {font: '20px Arial', fill: '#FFFFFF'}
};

var board;

var gameState = function(game){
    this.boardTop;
    this.boardLeft;
    //this.board;
    this.timer;
    this.counter;
    this.tf_replay;
};

var getBoard = function() {
	return board;
};

gameState.prototype = {
    init: function () {
        // center game board relative to game world
        this.boardTop = (gameProperties.screenHeight - (gameProperties.tileHeight * gameProperties.boardHeight)) * 0.5;
        this.boardLeft = (gameProperties.screenWidth - (gameProperties.tileWidth * gameProperties.boardWidth)) * 0.5; 
		console.log("init() called");
		
	},
    
    preload: function () {
        // load spritesheet (has 14 elements)
        game.load.spritesheet(graphicAssets.tiles.name, graphicAssets.tiles.URL, gameProperties.tileWidth, gameProperties.tileHeight, graphicAssets.tiles.frames);
		console.log("preload() called");
	},
    
    create: function () {
        this.initBoard(this.board);
        this.initUI();
		game.canvas.oncontextmenu = function (e) { e.preventDefault(); }
		console.log("create() called");
    },
	
    update: function () {
    },
    
    initBoard: function () {
		
		board = new Board(gameProperties.boardWidth, gameProperties.boardHeight, gameProperties.totalMines);
		
        // move board to center of screen
        board.moveTo(this.boardLeft, this.boardTop);
        
        // listeners for onTileClicked and onEndGame
        board.onTileClicked.addOnce(this.startGame, this);
        board.onTileFlagged.add(this.updateMines, this);
        board.onEndGame.addOnce(this.endGame, this);
		
		console.log("initBoard() called");
		
		// send request for board here so the board object gets initialized before we start fucking with it
		socket.emit("request_init_board");
    },
    
    initUI: function () {
        var top = this.boardTop - 20;
        var left = this.boardLeft;
        var right = left + (gameProperties.boardWidth * gameProperties.tileWidth);
        
        this.tf_replay = game.add.text(game.stage.width * 0.5, top, "Replay?", fontStyles.counterFontStyle);
        this.tf_replay.anchor.set(0.5, 0.5);
        this.tf_replay.inputEnabled = true;
        this.tf_replay.input.useHandCursor = true;
        this.tf_replay.events.onInputDown.add(this.restartGame, this);
        this.tf_replay.visible = false;
		
		console.log("initUI() called");
    },
    
    startGame: function () {
		console.log("startGame() called");
    },
    
    endGame: function () {
        this.tf_replay.visible = true;
    },
    
    restartGame: function () {
        game.state.start(states.game);
    },
    
    updateMines: function (value) {

    }
};

var game = new Phaser.Game(gameProperties.screenWidth, gameProperties.screenHeight, Phaser.AUTO, 'gameDiv');
game.state.add(states.game, gameState);
