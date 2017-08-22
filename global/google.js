var YOUTUBE_API_KEY="";
var YOUTUBE_OAUTH_CLIENT_ID="";
var SCOPE="https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/youtube";

$.get("/keys.txt",function(response){
	keys=response.split("\n");
	YOUTUBE_API_KEY=keys[0];
	YOUTUBE_OAUTH_CLIENT_ID=keys[1];
	google.handleClientLoad();
});

var google={
	subscribedChannels:[],

	createResource:function (properties) {
		var resource = {};
		var normalizedProps = properties;
		for (var p in properties) {
			var value = properties[p];
			if (p && p.substr(-2, 2) == '[]') {
				var adjustedName = p.replace('[]', '');
				if (value) {
					normalizedProps[adjustedName] = value.split(',');
				}
				delete normalizedProps[p];
			}
		}
		for (var p in normalizedProps) {
			// Leave properties that don't have values out of inserted resource.
			if (normalizedProps.hasOwnProperty(p) && normalizedProps[p]) {
				var propArray = p.split('.');
				var ref = resource;
				for (var pa = 0; pa < propArray.length; pa++) {
					var key = propArray[pa];
					if (pa == propArray.length - 1) {
						ref[key] = normalizedProps[p];
					} else {
						ref = ref[key] = ref[key] || {};
					}
				}
			};
		}
		return resource;
	},
	
	removeEmptyParams:function (params) {
		for (var p in params) {
			if (!params[p] || params[p] == 'undefined') {
				delete params[p];
			}
		}
		return params;
	},
	
	executeRequest:function (request,callback) {
		request.execute(callback);
	},
	
	buildApiRequest:function (requestMethod, path, params, callback,properties) {
		params = google.removeEmptyParams(params);
		var request;
		if (properties) {
			var resource = google.createResource(properties);
			request = gapi.client.request({
				'body': resource,
				'method': requestMethod,
				'path': path,
				'params': params
			});
		}else{
			request = gapi.client.request({
				'method': requestMethod,
				'path': path,
				'params': params
			});
		}
		google.executeRequest(request,callback);
	},
	
	getVideoId:function(videoData){
		if (videoData.kind=="youtube#playlistItem")
			return videoData.snippet.resourceId.videoId;
		else if (videoData.kind=="youtube#searchResult")
			return videoData.id.videoId;
		else if (videoData.kind=="youtube#video" || videoData.kind=="custom")
			return videoData.id;
		console.log("!!!!!!!!!!!!!!!!!!! COULDN'T FIND VIDEO ID! PLEASE EDIT TO SUPPORT KIND:");
		console.log(videoData.kind);
		console.log(videoData);
		return undefined;
	}
};
google.refreshToken=function(){
	gapi.auth.authorize({
		'client_id': YOUTUBE_OAUTH_CLIENT_ID,
		'scope': SCOPE,
		immediate:true,
	});
	google.setRefreshTimer();
}
google.setRefreshTimer=function(){
	setInterval(google.refreshToken,45*60*1000);
}

/**
 * Load the API's client and auth2 modules.
 * Call the initClient function after the modules load.
 */
google.handleClientLoad=function () {
	gapi.load('client:auth2', google.initClient);
}

google.initClient=function () {
	// Initialize the gapi.client object, which app uses to make API requests.
	// Get API key and client ID from API Console.
	// 'scope' field specifies space-delimited list of access scopes
	gapi.client.init({
		'clientId': YOUTUBE_OAUTH_CLIENT_ID,
		'discoveryDocs': ['https://www.googleapis.com/discovery/v1/apis/youtube/v3/rest'],
		'scope': SCOPE,
		'apiKey':YOUTUBE_API_KEY
	}).then(
		function () {
			console.log("initClient.then");
			google.GoogleAuth = gapi.auth2.getAuthInstance();
			console.log(google.GoogleAuth);
			
			// Listen for sign-in state changes.
			console.log("listening for signin state change");
			google.GoogleAuth.isSignedIn.listen(google.updateSigninStatus);
			
			// Handle initial sign-in state. (Determine if user is already signed in.)
			console.log("calling setSigninStatus");
			google.setSigninStatus();
			
			// Call handleAuthClick function when user clicks on "Authorize" button.
			$('#login-request-button').click(google.handleAuthClick);

			google.setRefreshTimer();
		},
		function(reason){
			console.log("gapi.client.init encountered an error because ",reason);
		}
	);
	console.log("finished executing gapi.client.init");
	//If you're encountering an 'uncaught exeption: [object Object]' error, it probably occurs between the gapi.client.init call and the .then function taking place.
	//This error was caused by either the API key not having a specific use case, or the Client application not having the current domain authed. 
}

google.handleAuthClick=function (event) {
	// Sign user in after click on auth button.
	google.GoogleAuth.signIn();
}

google.setSigninStatus=function () {
	var user = google.GoogleAuth.currentUser.get();
	isAuthorized = user.hasGrantedScopes('https://www.googleapis.com/auth/youtube') || google.GoogleAuth.isSignedIn.get();
	if (!isAuthorized){
	}else{
		console.log("confirmed login");
		if (applyLoginStyle)
			applyLoginStyle();
		google.loadSubscriptions();
	}
}

google.updateSigninStatus=function (isSignedIn) {
	console.log("signed in: ",isSignedIn);
	google.setSigninStatus(isSignedIn);
}

google.loadSubscriptions=function (){
	google.buildApiRequest('GET',
						   '/youtube/v3/subscriptions',
						   {'mine': 'true',
							'part': 'snippet',
							'maxResults':'50'},
						   google.loadSubscriptionsFromData
						  );
}
google.loadSubscriptionsFromData=function (searchData){
	google.subscribedChannels=[];
	for (var i=0;i<searchData.items.length;i+=1)
		google.subscribedChannels.push(searchData.items[i].snippet.resourceId.channelId);
}
