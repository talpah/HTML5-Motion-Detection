$(function() {
	
	// globals
	var CANVAS_WIDTH = 640;
	var CANVAS_HEIGHT = 480;
	var ENEMY_WIDTH = 32;
	var ENEMY_HEIGHT = 32;
	var SPEED = 60;
	
	// create the canvas'
	var canvasElement = $('<canvas id="gameCanvas" width="' + CANVAS_WIDTH + '" height="' + CANVAS_HEIGHT + '"></canvas>');
	var blendedElement = $('<canvas id="blendedCanvas"></canvas>');
	var canvas = canvasElement.get(0).getContext("2d");
	var blend = blendedElement.get(0).getContext("2d");
	canvasElement.appendTo('body');
	blendedElement.appendTo('body');
	
	// flip the canvas object
	canvas.translate(CANVAS_WIDTH, 0);
	canvas.scale(-1, 1);
	
	// error function
	var webcamError = function(e) {
		alert('Webcam error!', e);
	};
	
	// has the user got the functionality enabled
	function hasGetUserMedia() {
		// Note: Opera builds are unprefixed.
		return !!(navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia);
	}
	
	// get the canvas areas and set some vars
	var timeOut, lastImageData;
	
	// if the users has html5 webcam enabled
	if(hasGetUserMedia()){
		
		// hide info and show the message
		$("#info").hide();
		$("#message").show();
	
		var video = $('#webcam')[0];
		
		// make get video cross browser compatible
		window.URL = window.URL || window.webkitURL;
		navigator.getUserMedia  = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia;
		
		// if we have webcam element
		if(navigator.getUserMedia){
			
			// enable the video stream
			navigator.getUserMedia({audio: true, video: true}, function(stream) {

				// send the stream to the video element
				video.src = window.URL.createObjectURL(stream);
				
				// start the game
				start();
				
			}, webcamError);
		
		// fallback
		} else {

			//video.src = 'somevideo.webm'; // fallback.

		}
	
	// if the users hasnt a html5 webcam enabled
	} else {
		
		// show the info and play the demo video
		$("#info").show();
		$("#message").hide();
		$("#video-demo").show();
		$("#video-demo")[0].play();
		return;

	}
	
	// create the game updating at regular rate
	function start() {
		$(canvasElement).show();
		$(blendedElement).show();
		$("#message").hide();
		$("#description").show();
		
		update();
	}
	
	// create the update function
	function update() {
		
		// draw video to canvas
		canvas.drawImage(video, 0, 0, video.width, video.height);
		
		// create the blend
		blendAction();
		
		// check the blend for movement
		checkAreas();
		
		// keep soming back to this function
		timeOut = setTimeout(update, 1000/SPEED);
		
		// draw enemies
		enemies.forEach(function(enemy) {
			enemy.draw();
		});
		
		// look at the enemies
		enemies.forEach(function(enemy) {
			enemy.update();
		});
		
		// filter the enemies
		enemies = enemies.filter(function(enemy) {
			return enemy.active;
		});
		
		// create enemies
		if(enemies.length < 10 && Math.random() < 0.1) {
			enemies.push(Enemy());
		}
		
	}
	
	// blend the images together to check theyre likeness
	function blendAction() {
	
		// get webcam image data
		var sourceData = canvas.getImageData(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
		
		// create an image if the previous image doesn’t exist
		if (!lastImageData) lastImageData = canvas.getImageData(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
		
		// create a ImageData instance to receive the blended result
		var blendedData = canvas.createImageData(CANVAS_WIDTH, CANVAS_WIDTH);
		
		// blend the 2 images
		differenceAccuracy(blendedData.data, sourceData.data, lastImageData.data);
		
		// draw the result in a canvas
		blend.putImageData(blendedData, 0, 0);
		
		// store the current webcam image
		lastImageData = sourceData;
		
	}
	
	// create black and white image and detect difference
	function differenceAccuracy(target, data1, data2) {
		if (data1.length != data2.length) return null;
		var i = 0;
		while (i < (data1.length * 0.25)) {
			var average1 = (data1[4*i] + data1[4*i+1] + data1[4*i+2]) / 3;
			var average2 = (data2[4*i] + data2[4*i+1] + data2[4*i+2]) / 3;
			var diff = threshold(fastAbs(average1 - average2));
			target[4*i] = diff;
			target[4*i+1] = diff;
			target[4*i+2] = diff;
			target[4*i+3] = 0xFF;
			++i;
		}
	}
	
	// the threshold for difference measuring
	function threshold(value) {
		return (value > 0x15) ? 0xFF : 0;
	}
	
	// the blending helper
	function fastAbs(value) {
		// funky bitwise, equal Math.abs
		return (value ^ (value >> 31)) - (value >> 31);
	}
	
	// loop through the pixels
	// check one against each other
	function checkAreas() {
	
		// if we have enemies on the screen
		if(enemies.length > 0){

			// loop over the note areas
			enemies.forEach(function(enemy) {
				
				// get the pixels in a enemy area from the blended image
				var blendedData = blend.getImageData(enemy.x, enemy.y, enemy.width, enemy.height);
				var i = 0;
				var average = 0;
				
				// loop over the pixels
				while (i < (blendedData.data.length * 0.25)) {
					// make an average between the color channel
					average += (blendedData.data[i*4] + blendedData.data[i*4+1] + blendedData.data[i*4+2]) / 3;
					++i;
				}
				
				// calculate an average between of the color values of the note area
				average = Math.round(average / (blendedData.data.length * 0.25));
				if (average > 10) {
					// over a small limit, consider that a movement is detected
					enemy.explode();
				}
			});
			
		}
		
	}
	
	// create some enemies
	enemies = [];
	function Enemy(I) {
		I = I || {};
		
		// set the enemy to active and expiry
		I.active = true;
		I.age = Math.floor(Math.random() * 128);
		
		// enemy color
		I.color = "#A2B";
		
		// create the speed and position of the enemey
		I.x = CANVAS_WIDTH / 4 + Math.random() * CANVAS_WIDTH / 2;
		I.y = 0;
		I.xVelocity = 0
		I.yVelocity = 2;
		
		// enemy width and height
		I.width = ENEMY_WIDTH;
		I.height = ENEMY_HEIGHT;
		
		// instatiate some enemies
		I.inBounds = function() {
			return I.x >= 0 && I.x <= CANVAS_WIDTH && I.y >= 0 && I.y <= CANVAS_HEIGHT;
		};
		
		// create the appearence of the enemy
		I.sprite = Sprite("enemy");
		I.draw = function() {
			this.sprite.draw(canvas, this.x, this.y);
		};
		
		// create the movement
		I.update = function() {
			I.x += I.xVelocity;
			I.y += I.yVelocity;
			
			I.xVelocity = 3 * Math.sin(I.age * Math.PI / 64);
			
			I.age++;
			
			I.active = I.active && I.inBounds();
		};
		
		// create the explosion action
		I.explode = function() {
			Sound.play("explosion");
		
			this.active = false;
		};
		
		return I;
	};

	
});