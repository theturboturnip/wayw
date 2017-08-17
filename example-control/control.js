var auth={};

NO_CONTROL_MSG="request control";
CONTROL_PENDING_MSG="getting control key...";
HAS_CONTROL_MSG="relinquish control";
RELINQUISHING_CONTROL_MSG="giving up control key...";

function requestControl(){
	$("#request-control-button > #message").html(CONTROL_PENDING_MSG);
	request("GET","/api/auth/control",auth,getControlKey);
}
function getControlKey(response){
	auth.control=response;

	$("#request-control-button > #message").html(NO_CONTROL_MSG);
	$("#relinquish-control-button > #message").html(HAS_CONTROL_MSG);

	$("#get-control-menu").hide();
	$("#controls-menu").show();

	//setInterval(function(){
		request("GET","/api/playback/state",auth,applyCurrentState);
	//},1000);
}
function applyCurrentState(response){
	state=JSON.parse(response);
	//console.log(state);
	$("#paused-checkbox").prop("checked",state.paused);
	//console.log(document.getElementById("volume-range"));
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

function relinquishControl(){
	$("#relinquish-control-button > #message").html(RELINQUISHING_CONTROL_MSG);
	request("DELETE","/api/auth/control",auth,removeControlKey);
}
function removeControlKey(){
	auth.control=undefined;
	
	$("#get-control-menu").show();
	$("#controls-menu").hide();
}


function updatePaused(isPaused){
	request("POST","/api/playback/state",auth,undefined,JSON.stringify({"paused":isPaused}));
}
function updateVolume(value){
	request("POST","/api/playback/state",auth,undefined,JSON.stringify({"volume":value}));
}
function updateQuality(value){
	request("POST","/api/playback/state",auth,undefined,JSON.stringify({"quality":value}));
}


$("#request-control-button > #message").html(NO_CONTROL_MSG);
