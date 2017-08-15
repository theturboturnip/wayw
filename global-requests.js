function request(method,apiPath,auth,success,POSTdata,error){
	var ajax={
		method:method,
		url:apiPath,
		success:success,
		dataType:"text",
		error:error
	};
	if (method=="POST" && POSTdata!=undefined)
		ajax.data=POSTdata;
	if (auth.client!=undefined)
		ajax.headers={ "Authorization" : "Basic "+btoa("Client:"+auth.client) };
	else if (auth.control!=undefined)
		ajax.headers={ "Authorization" : "Basic "+btoa("Control:"+auth.control) };
	$.ajax(ajax);
}
