function class_local_session(container,color1,wins1,color2,wins2,dimx,dimy,next) {

	this.canvas = createCanvas(container);
	
	this.ctx = this.canvas.getContext('2d');
	this.fontsize = Math.floor(this.canvas.width/12);
	this.ctx.font =  this.fontsize + "px Georgia";
	
	// canvas offset, used for mouse click mapping
	this.offsetX = container.offsetLeft;
	this.offsetY = container.offsetTop;

	this.player1 = new class_player(1,color1,wins1);
	this.player2 = new class_player(2,color2,wins2);
	
	// linked loop
	this.player1.next = this.player2;
	this.player2.next = this.player1;
	
	this.currentPlayer = {};
	this.nextStarter = (next == 1 ? this.player1 : this.player2); // player that will start the next game
	
	this.field = new class_field(this,dimx,dimy);
	this.logic = new class_gamelogic(this.field);
	
	this.bPlaying = false; // control flag
	
	this.startGame = function() {
	
		this.field.init();
		this.field.draw();
		
		this.player1.points = 2;
		this.player2.points = 2;

		this.currentPlayer = this.nextStarter;
		this.nextStarter = this.nextStarter.next;
		this.bPlaying = true;
	};
	
	this.endGame = function() {
		
		// TODO: replace with canvas graphics
		var msg = "Color " ;
		
		if(this.currentPlayer.points > this.currentPlayer.next.points) {
			this.currentPlayer.wins++;
			msg += this.currentPlayer.color + " won! [";
		}
		else if (this.currentPlayer.points < this.currentPlayer.next.points) {
			this.currentPlayer.next.wins++;
			msg += this.currentPlayer.next.color + " won! [";
		}
		else
			msg = "Draw! ["
		
		msg += this.player1.points + ":" + this.player2.points + "]";
		
		this.canvas.drawText(msg, this.fontsize);
		
		this.ctx.fillStyle = "#000";
		var x = (this.canvas.width / 2) - (this.fontsize * 3);
		var y = (this.canvas.height / 2) + (this.fontsize * 2);
		this.ctx.fillText("Click to play!",x,y);
		
		this.bPlaying = false;
	
	};
	
	this.clickHandler = function(event) {
	
		// mouse position
		var mx = event.clientX-this.offsetX-this.canvas.offsetLeft+pageXOffset;
		var my = event.clientY-this.offsetY-this.canvas.offsetTop+pageYOffset;
		
		// click inside canvas?
		if(mx > 0 && mx < this.field.xsize * this.field.side && my > 0 && my < this.field.ysize * this.field.side) {
		
			if(!this.bPlaying) {
				this.startGame();
				return;
			}
				
			var x = parseInt(mx/this.field.side);
			var y = parseInt(my/this.field.side);
				
			if(this.field.stones[x][y] != 0) return;
				
			var stolenStones = this.logic.makeTurn(this.currentPlayer,x,y);
			if(stolenStones == 0) return; // no turn
			
			// put stone
			this.field.stones[x][y] = this.currentPlayer.stone; 
			this.field.draw();
			this.field.highlight(x,y);
			if(this.bDebug) this.logic.drawFuture(this.ctx);
			
			// change points
			this.currentPlayer.points += stolenStones + 1;
			this.currentPlayer.next.points -= stolenStones;
			
			this.currentPlayer = this.currentPlayer.next;
			// TODO: update info text
			
			// check if next player can make a turn
			// TODO: this function should run in the background
			if(!this.logic.canTurn(this.currentPlayer)) {
				this.currentPlayer = this.currentPlayer.next;
				if(!this.logic.canTurn(this.currentPlayer)) this.endGame(); // TODO: info that no more turns are possible
			}
			
		}
			
	};
	
	this.canvas.onclick = this.clickHandler.bind(this);
	
	this.canvas.drawText("Click to play!", this.fontsize);

} 