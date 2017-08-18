function styleDoc(){
	styleMutationObserver.disconnect();
	$("button").addClass("mdl-button mdl-js-button mdl-js-ripple-effect mdl-button--primary");
	$("button[raised]").addClass("mdl-button--raised");
	$("button[type=\"icon\"]").addClass("mdl-button--icon").removeClass("mdl-js-ripple-effect");
	$("button[type=\"icon\"][big]").addClass("big-icon-button");
	//$("input[type=\"range\"]").addClass("mdl-slider mdl-js-slider");
	$("ul[type=\"menu\"]").addClass("mdl-menu mdl-js-menu mdl-js-ripple-effect");
	$("ul[type=\"menu\"] li").addClass("mdl-menu__item");
	$(".potential-video-container").addClass("video-container").html("<div class='material-icons' style='position:relative;top:calc(50% - 0.5em);color:#ccc'>add</div>");
	$(".card").addClass("mdl-shadow--8dp");
	startObservingStyle();
}

styleMutationObserver=new MutationObserver(styleDoc);
function startObservingStyle(){
	styleMutationObserver.observe(document.body, {subtree:true,childList:true});
}

styleDoc();
$("body").css("font-family","Roboto,Arial");
