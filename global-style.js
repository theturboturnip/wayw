function styleDoc(){
	$("button").addClass("mdl-button mdl-js-button mdl-js-ripple-effect mdl-button--primary");
	$(".card").addClass("mdl-shadow--8dp");
}

styleMutationObserver=new MutationObserver(styleDoc);
function startObservingStyle(){
	styleMutationObserver.observe(document.body, {subtree:true,childList:true});
}

styleDoc();
startObservingStyle();
