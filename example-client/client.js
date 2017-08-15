registerInterval=-1;
playbackStateInterval=-1;
playbackEventInterval=-1;
setTimestampInterval=-1;
getFirstVideoInterval=-1;
auth={};

function beginAttemptRegister(){
	if (registerInterval!=-1) return;

	registerInterval=setInterval(attemptRegister,500);
	$("button").prop('disabled', true);
	$("span").html("Requesting Client Key...");
}
function attemptRegister(){
	console.log("attempting register");
	request("GET","/api/auth/client",auth,acceptClientKey);
}
function acceptClientKey(response){
	auth.client=response;
	if (registerInterval!=-1)
		clearInterval(registerInterval);
	registerInterval=-1;
	$("span").html("We're the client!");

	$("#controls").show();

	getFirstVideoInterval=setInterval(function(){request("GET","/api/queue/0",auth,getVideoToPlay);},1000);
}

function getVideoToPlay(response){
	console.log("Got next video");
	var video=JSON.parse(response);
	console.log(video);
	playVideo(video,getNextVideo);

	if (playbackStateInterval==-1)
		playbackStateInterval=setInterval(checkState,1*1000);
	if (playbackEventInterval==-1)
		playbackEventInterval=setInterval(checkEvents,100);
	if (setTimestampInterval==-1)
		setTimestampInterval=setInterval(applyTimestamp,2000);
	if (getFirstVideoInterval!=-1)
		clearInterval(getFirstVideoInterval);
	getFirstVideoInterval=-1;
}
function applyTimestamp(){
	request("PUT","/api/queue/0/timestamp/"+Math.floor(player.currentTime()),auth);
}
function getNextVideo(){
	request("DELETE","/api/queue/0/",auth,function(){
		request("GET","/api/queue/0",auth,getVideoToPlay);
	});
	clearInterval(playbackStateInterval);
	playbackStateInterval=-1;
	clearInterval(playbackEventInterval);
	playbackEventInterval=-1;
	clearInterval(setTimestampInterval);
	setTimestampInterval=-1;
}

function checkState(){
	request("GET","/api/playback/state",auth,applyState);
}
function checkEvents(){
	request("GET","/api/playback/events",auth,applyEvents);
}
function applyState(response){
	var state=JSON.parse(response);
	if (state.newClientRequested==true){
		$("span").html("Someone wants the client key");
		requestDeleteClientKey();
		state.paused=true;
	}

	if (state.hasControl){
		player.setPaused(state.paused);
		player.setVolume(state.volume);
		//TODO: Set quality, we shouldn't set timestamp from here
	}
}
function applyEvents(response){
	var events=JSON.parse(response);
	if (events.newClientRequested==true){
		$("span").html("Someone wants the client key");
		requestDeleteClientKey();
		//events.paused=true;
	}

	if (events.paused!=undefined)
		player.setPaused(events.paused);
	if (events.volume!=undefined)
		player.setVolume(events.volume);
	//TODO: Set quality
	if (events.timestamp!=undefined)
		player.seek(events.timestamp);
}
function requestDeleteClientKey(){
	request("DELETE","/api/auth/client",auth,giveUpClientKey);
	if (playbackStateInterval!=-1)
		clearInterval(playbackStateInterval);
	playbackStateInterval=-1;
	if (playbackEventInterval!=-1)
		clearInterval(playbackEventInterval);
	playbackEventInterval=-1;
	if (setTimestampInterval!=-1)
		clearInterval(setTimestampInterval);
	setTimestampInterval=-1;

	player.destroy();
	$("#player-parent").hide();
}
function giveUpClientKey(){
	auth.client=undefined;
	$("#controls").hide();

	$("span").html("Gave up the client key");
	$("button").prop('disabled', false);
}
