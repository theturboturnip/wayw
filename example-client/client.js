registerInterval=-1;
playbackStateInterval=-1;
playbackEventInterval=-1;
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

	request("GET","/api/queue/0",auth,getVideoToPlay);
}

function getVideoToPlay(response){
	console.log(response);
	var video=JSON.parse(response);
	console.log(video);
	playVideo(video,getNextVideo);

	if (playbackStateInterval==-1)
		playbackStateInterval=setInterval(checkState,1000);
	if (playbackEventInterval==-1)
		playbackEventInterval=setInterval(checkEvents,100);
}
function getNextVideo(){
	request("DELETE","/api/queue/0/",auth,function(){
		request("GET","/api/queue/0",auth,getVideoToPlay);
	});
	clearInterval(playbackStateInterval);
	playbackStateInterval=-1;
	clearInterval(playbackEventInterval);
	playbackEventInterval=-1;
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

	player.setPaused(state.paused);
	player.setVolume(state.volume);
	//TODO: Set quality, timestamp
}
function applyEvents(response){
	var events=JSON.parse(response);
	if (events.paused!=undefined)
		player.setPaused(events.paused);
	if (events.volume!=undefined)
		player.setVolume(events.volume);
	//TODO: Set quality, timestamp
}
function requestDeleteClientKey(){
	request("DELETE","/api/auth/client",auth,giveUpClientKey);
	if (playbackStateInterval!=-1)
		clearInterval(playbackStateInterval);
	playbackStateInterval=-1;
	if (playbackEventInterval!=-1)
		clearInterval(playbackEventInterval);
	playbackEventInterval=-1;
}
function giveUpClientKey(){
	auth.client=undefined;
	$("#controls").hide();

	$("span").html("Gave up the client key");
	$("button").prop('disabled', false);
}


//$("body").attr("onunload","requestDeleteClientKey();");
