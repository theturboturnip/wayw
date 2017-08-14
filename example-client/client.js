registerInterval=-1;
playbackStateInterval=-1;
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
	
	playbackStateInterval=setInterval(checkState,100);
}

function checkState(){
	request("GET","/api/playback/state",auth,getState);
}
function getState(response){
	var state=JSON.parse(response);
	if (state.newClientRequested==true){
		$("span").html("Someone wants the client key");
		requestDeleteClientKey();
	}

	$("#paused-checkbox").prop("checked",state.paused);
	$("#volume-range").val(100*state.volume);
	var val=0;
	var selector=document.getElementById("quality-select");
	for (var i=0;i<selector.options.length;i+=1){
		if (selector.options[i].value==state.quality.trim())
			val=i;
		console.log(selector.options[i].value,state.quality);
	}
	selector.selectedIndex=val;
}
function requestDeleteClientKey(){
	request("DELETE","/api/auth/client",auth,giveUpClientKey);
	if (playbackStateInterval!=-1)
		clearInterval(playbackStateInterval);
	playbackStateInterval=-1;
}
function giveUpClientKey(){
	auth.client=undefined;
	$("#controls").hide();

	$("span").html("Gave up the client key");
	$("button").prop('disabled', false);
}


//$("body").attr("onunload","requestDeleteClientKey();");
