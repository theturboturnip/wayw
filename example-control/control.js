var auth={};

function requestControl(){
	request("GET","/api/auth/control",auth,getControlKey);
}
function getControlKey(response){
	auth.control=response;

	$("#message").html("We have control!");
	$("#request-control-button").prop("disabled",true);
	$("#relinquish-control-button").prop("disabled",false);

	$("#controls").show();

	//setInterval(function(){
		request("GET","/api/playback/state",auth,applyCurrentState);
	//},1000);
}
function applyCurrentState(response){
	state=JSON.parse(response);
	console.log(state);
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
	request("DELETE","/api/auth/control",auth,removeControlKey);
}
function removeControlKey(){
	auth.control=undefined;
	$("#controls").hide();

	$("#message").html("We have given up control.");
	$("#request-control-button").prop("disabled",false);
	$("#relinquish-control-button").prop("disabled",true);
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
