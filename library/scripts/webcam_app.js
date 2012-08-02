$(function() {

	// has the user got the functionality enabled
	function hasGetUserMedia() {
		// Note: Opera builds are unprefixed.
		return !!(navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia);
	}

	// error function
	var webcamError = function(e) {
		alert('Webcam error!', e);
	};
	
	// set up audio
	var AudioContext = (window.AudioContext || window.webkitAudioContext || null);
	
	// set the position of the notes
	var notesPos = [0, 82, 159, 238, 313, 390, 468, 544];
	
	// get the canvas areas and set some vars
	var timeOut, lastImageData;
	var canvasSource = $("#canvas-source")[0];
	var canvasBlended = $("#canvas-blended")[0];
	
	// set canvas to 2d
	var contextSource = canvasSource.getContext('2d');
	var contextBlended = canvasBlended.getContext('2d');
	
	// get the audio ready
	var soundContext;
	var bufferLoader;
	var notes = [];

	// mirror video
	contextSource.translate(canvasSource.width, 0);
	contextSource.scale(-1, 1);
	
	var c = 5;
	
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
				
				// click filters or take photos on click
				basicClickFunctions(stream);
				
				if(!AudioContext){
					alert("AudioContext not supported!");
				} else {
					loadSounds();
				}
			
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
	
	// load and buffer sounds
	function loadSounds() {
		soundContext = new AudioContext();
		bufferLoader = new BufferLoader(soundContext,
			['library/sounds/note1.mp3', 'library/sounds/note2.mp3', 'library/sounds/note3.mp3', 'library/sounds/note4.mp3', 'library/sounds/note5.mp3', 'library/sounds/note6.mp3', 'library/sounds/note7.mp3', 'library/sounds/note8.mp3'],
			finishedLoading
		);
		bufferLoader.load();
	}
	
	// load and buffer sounds
	function finishedLoading(bufferList) {
		for (var i=0; i<8; i++) {
			var source = soundContext.createBufferSource();
			source.buffer = bufferList[i];
			source.connect(soundContext.destination);
			var note = {
				note: source,
				ready: true,
				visual: $("#note" + i)[0]
			};
			note.area = {x:notesPos[i], y:0, width:note.visual.width, height:100};
			notes.push(note);
		}
		start();
	}
	
	// the play sound action
	function playSound(obj) {
		if (!obj.ready) return;
		var source = soundContext.createBufferSource();
		source.buffer = obj.note.buffer;
		source.connect(soundContext.destination);
		source.noteOn(0);
		obj.ready = false;
		// throttle the note
		setTimeout(setNoteReady, 400, obj);
	}
	
	function setNoteReady(obj) {
		obj.ready = true;
	}
	
	// start the app
	function start() {
		$(canvasSource).show();
		$(canvasBlended).show();
		$("#xylo").show();
		$("#message").hide();
		$("#description").show();
		update();
	}

	// check the video ouput
	// called every 60 seconds
	function update() {
		drawVideo();
		blend();
		checkAreas();
		timeOut = setTimeout(update, 1000/60);
	}
	
	// draw the video to the canvas
	function drawVideo() {
		contextSource.drawImage(video, 0, 0, video.width, video.height);
	}

	// blend the images together to check theyre likeness
	function blend() {
		var width = canvasSource.width;
		var height = canvasSource.height;
		// get webcam image data
		var sourceData = contextSource.getImageData(0, 0, width, height);
		// create an image if the previous image doesn’t exist
		if (!lastImageData) lastImageData = contextSource.getImageData(0, 0, width, height);
		// create a ImageData instance to receive the blended result
		var blendedData = contextSource.createImageData(width, height);
		// blend the 2 images
		differenceAccuracy(blendedData.data, sourceData.data, lastImageData.data);
		// draw the result in a canvas
		contextBlended.putImageData(blendedData, 0, 0);
		// store the current webcam image
		lastImageData = sourceData;
	}

	// the blending helper
	function fastAbs(value) {
		// funky bitwise, equal Math.abs
		return (value ^ (value >> 31)) - (value >> 31);
	}

	// the threshold for difference measuring
	function threshold(value) {
		return (value > 0x15) ? 0xFF : 0;
	}
	
	// check the difference between pixels
	function difference(target, data1, data2) {
		// blend mode difference
		if (data1.length != data2.length) return null;
		var i = 0;
		while (i < (data1.length * 0.25)) {
			target[4*i] = data1[4*i] == 0 ? 0 : fastAbs(data1[4*i] - data2[4*i]);
			target[4*i+1] = data1[4*i+1] == 0 ? 0 : fastAbs(data1[4*i+1] - data2[4*i+1]);
			target[4*i+2] = data1[4*i+2] == 0 ? 0 : fastAbs(data1[4*i+2] - data2[4*i+2]);
			target[4*i+3] = 0xFF;
			++i;
		}
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

	// loop through the pixels
	// check one against each other
	function checkAreas() {
		// loop over the note areas
		for (var r=0; r<8; ++r) {
			// get the pixels in a note area from the blended image
			var blendedData = contextBlended.getImageData(notes[r].area.x, notes[r].area.y, notes[r].area.width, notes[r].area.height);
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
				// play a note and show a visual feedback to the user
				playSound(notes[r]);
				notes[r].visual.style.display = "block";
				$(notes[r].visual).fadeOut();
			}
		}
	}
	
	/* BASIC FUNCTIONALITY */
	
	// basic click filter and click photo functions
	function basicClickFunctions(stream){
		
		// get the canvas element
		var snapshotCanvas = $('#snapshot')[0];
		
		// add filters
		var idx = 0;
		var filters = ['grayscale', 'sepia', 'blur', 'brightness', 'contrast', 'hue-rotate', 'hue-rotate2', 'hue-rotate3', 'saturate', 'invert', ''];
		
		// set some parameters
		var ctx = snapshotCanvas.getContext('2d');
		ctx.translate(snapshot.width, 0);
		ctx.scale(-1, 1);
		var localMediaStream = null;
		
		// create the stream to pass to the snapshot function
		localMediaStream = stream;
		
		// if video clicked
		$('#canvas-source').click(function (e){

			// on video click call snapshot
			if(localMediaStream){
				ctx.drawImage(video, 0, 0);
				// "image/webp" works in Chrome 18. In other browsers, this will fall back to image/png.
				document.querySelector('img').src = snapshotCanvas.toDataURL('image/webp');
			}
			
			// change the filter
			var el = e.target;
			el.className = '';
			var effect = filters[idx++ % filters.length]; // loop through filters.
			if(effect){
				
				// add class to canvas video
				el.classList.add(effect);
				
				// add class to snapshot
				$('#snapshot').addClass(effect);
				
			} else {
				
				$('#snapshot').removeClass();
				
			}
			
		});
	
	}
	
	/* END BASIC FUNCTIONALITY */

});