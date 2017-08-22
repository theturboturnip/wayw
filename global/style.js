function setSelectWidth(selector) {
    var sel = $(selector);
	sel.each(function(){
		var me=$(this);
		var tempSel = $("<select style='display:none;max-width:10000%;font-size:16px'>")
			.append($("<option>").text(me.find("option:selected").text()));
		tempSel.appendTo($("body"));
		
		me.width(tempSel.width());

		tempSel.remove();
	});
}

function styleDoc(){
	styleMutationObserver.disconnect();
	$("button").addClass("mdl-button mdl-js-button mdl-js-ripple-effect mdl-button--primary");
	$("button[grey]").removeClass("mdl-button--primary");
	$("button[raised]").addClass("mdl-button--raised");
	$("button[type=\"icon\"]").addClass("mdl-button--icon").removeClass("mdl-js-ripple-effect");
	$("button[type=\"icon\"][big]").addClass("big-icon-button");
	//$("input[type=\"range\"]").addClass("mdl-slider mdl-js-slider");
	$("ul[type=\"menu\"]").addClass("mdl-menu mdl-js-menu mdl-js-ripple-effect");
	$("ul[type=\"menu\"] li").addClass("mdl-menu__item");

	$(".video-container:not(.potential-video-container)").attr("shadowed",true).attr("draggable",true);
	$(".potential-video-container").addClass("video-container").html("<div class='material-icons' style='position:relative;top:calc(50% - 0.5em);color:#ccc'>add</div>");
	$("[shadowed]").addClass("mdl-shadow--4dp");
	
	$("[type=\"grid\"]").addClass("mdl-grid");
	$("[type=\"grid\"] > *").addClass("mdl-cell mdl-cell--1-col");

	$("select").addClass("mdl-selectfield__select");
	$("select[dynamic]").on("change", function() {
        setSelectWidth(this);
    });
	setSelectWidth("select[dynamic]");

	$("i").addClass("material-icons");

	$("dialog").addClass("mdl-dialog").each(function(){
		if (!dialog.showModal)
			dialogPolyfill.registerDialog(this);
	});
	$("dialog > #title").addClass("mdl-dialog__title");
	$("dialog > #content").addClass("mdl-dialog__content");
	$("dialog > #actions").addClass("mdl-dialog__actions");
	$("dialog button[close]").on("click",function(){
		$(this).parent("dialog")[0].close();
	});

	//$("ul > *").
	startObservingStyle();
}

styleMutationObserver=new MutationObserver(styleDoc);
function startObservingStyle(){
	styleMutationObserver.observe(document.body, {subtree:true,childList:true});
}

styleDoc();
$("body").css("font-family","Roboto,Arial");
