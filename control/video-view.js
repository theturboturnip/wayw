var searchData={
	channels:[],
	targetChannelCount:-1,
	channelFilter:"all",
	query:"",
	videoCount:-1,
	videoIds:[],
	//videoObjects:[],
	searching:false,
};
var iso8601HourRegex=/(\d+)H/;
var iso8601MinuteRegex=/(\d+)M/;
var iso8601SecondRegex=/(\d+)S/;

function updateVideoView(){
	if (searchData.searching) return;
	//Accumulate the videos
	searchData.channels=[];
	searchData.videoIds=[];
	searchData.channelFilter=$("select#channel-filter").val();
	searchData.query=$("input#search-input").val();
	searchData.videoCount=parseInt($("input#video-count").val());
	searchData.sortType=$("select#sort-filter").val();
	$("#video-view").html("");
	searchData.searching=true;
	
	if (searchData.channelFilter=="all"){
		searchVideosFromAll();
	}else if (searchData.channelFilter=="subscribed"){
		searchData.channels=google.subscribedChannels.slice();
		searchVideosFromChannels();
	}else if (searchData.channelFilter=="specific"){
		searchForChannels($("input#channel-name-input").val().split(","));
	}
	//Construct the things
}
function addChannelIdToList(response){
	if (response.items==[] || response.items[0].id.channelId==undefined)
		searchData.targetChannelCount-=1;
	else
		searchData.channels.push(response.items[0].id.channelId);
	if (searchData.channels.length>=searchData.targetChannelCount)
		searchVideosFromChannels();
}
function searchForChannels(queries){
	//console.log(queries);
	searchData.targetChannelCount=queries.length;
	for (i in queries){
		google.buildApiRequest("GET",
							   "/youtube/v3/search",
							   {
								   "maxResults": "25",
								   "part": "snippet",
								   "q": queries[i],
								   "type": "channel"
							   },
							  addChannelIdToList);
	}
}
function searchVideosFromChannels(){
	
}
function searchVideosFromAll(){
	console.log("searching through all");
	google.buildApiRequest("GET",
						   "/youtube/v3/search",
						   {
							   "maxResults": "50",
							   "part": "snippet",
							   "q": searchData.query,
							   "type": "video",
							   "order":searchData.sortType,
						   },
						   getVideoIdsFromGlobalSearch);
}
function getVideoIdsFromGlobalSearch(response){
	for (i in response.items){
		searchData.videoIds.push(response.items[i].id.videoId);
		if (searchData.videoIds.length>=searchData.videoCount)
			break;
	}
	if (searchData.videoIds.length>=searchData.videoCount)
		getVideoObjectsFromIds();
	else if (response.nextPageToken!=undefined)
		//Next page
		google.buildApiRequest("GET",
							   "/youtube/v3/search",
							   {
								   "maxResults": "50",
								   "part": "snippet",
								   "q": searchData.query,
								   "type": "video",
								   "order":searchData.sortType,
								   "pageToken":response.nextPageToken
							   },
							   getVideoIdsFromGlobalSearch);
	else getVideoObjectFromIds();
}
function getVideoObjectsFromIds(){
	//console.log(searchData.videoIds);
	//searchData.videoObjects=[];
	//Batch the youtube#video requests
	searchData.videoIdBatches=[];
	for (var i=0;i<searchData.videoIds.length;i+=50)
		searchData.videoIdBatches.push(searchData.videoIds.splice(0,50).join(","));
	if (searchData.videoIds.length>0)
		searchData.videoIdBatches.push(searchData.videoIds.join(","));
	//console.log(searchData.videoIdBatches);
	requestNextVideoIdBatch();
}
function requestNextVideoIdBatch(){
	if (searchData.videoIdBatches.length==0){
		buildHTMLVideoElements();
		return;
	}
	google.buildApiRequest("GET",
						   "/youtube/v3/videos/",
						   {
							   "part":"snippet,contentDetails",
							   "id":searchData.videoIdBatches.pop()
						   },
						   receiveVideoIdBatch
						  );
}
function receiveVideoIdBatch(response){
	//searchData.videoObjects=searchData.videoObjects.concat(response.items);
	for (i in response.items)
		videoCache.addVideo(response.items[i]);
	requestNextVideoIdBatch();
}

function buildHTMLVideoElements(){
	var elements=[];
	for (i in searchData.videoIds)
		elements.push(videoCache.constructVideoElement(searchData.videoIds[i]));
	var videoViewElement=document.getElementById("video-view");
	for (i in elements)
		videoViewElement.appendChild(elements[i]);
	searchData.searching=false;
}

console.log("loaded video-view.js");
