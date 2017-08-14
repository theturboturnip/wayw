player={};

youtubePlayer={
	YTPlayerObject:undefined,
	videoEndCallback:undefined,
	videoObject:undefined,
	currentPlayerState:undefined,
	hasPlayed:false,
	
	create:function(video,onVideoEnd){
		youtubePlayer.videoObject=video;

		youtubePlayer.YTPlayerObject= new YT.Player(
			"player",
			{
				width:"100%",
				height:"100%",
				videoId:video.id,
				playerVars:{
					autoplay:0,
					enablejsapi:1,
					modestbranding:1,
					origin:"localhost",
					start:youtubePlayer.videoObject.timestamp
				},
				events:{
					"onReady":function(){
						//youtubePlayer.YTPlayerObject.seekTo(youtubePlayer.videoObject.timestamp,true);
					},
					"onStateChange":youtubePlayer.onStateChange
				},
			}
		);
		youtubePlayer.videoEndCallback=onVideoEnd;
	},
	destroy:function(){
		youtubePlayer.YTPlayerObject.destroy();
		youtubePlayer.YTPlayerObject=undefined;
		youtubePlayer.videoEndCallback=undefined;
		youtubePlayer.videoObject=undefined;
		youtubePlayer.hasPlayed=false;
	},

	setPaused:function(paused){
		if (paused && youtubePlayer.currentPlayerState==YT.PlayerState.PLAYING)
			youtubePlayer.YTPlayerObject.pauseVideo();
		else if (!paused && youtubePlayer.currentPlayerState!=YT.PlayerState.PLAYING)
			youtubePlayer.YTPlayerObject.playVideo();
	},
	setVolume:function(volume){
		//We start with a 0.0-1.0 value => multiply by 100
		youtubePlayer.YTPlayerObject.setVolume(100*volume);
	},
	seek:function(seconds){
		//console.log("seeking to "+seconds);
		youtubePlayer.YTPlayerObject.seekTo(seconds);
	},
	currentTime:function(){
		return youtubePlayer.YTPlayerObject.getCurrentTime();
	},

	onStateChange:function(event){
		if (event.data == YT.PlayerState.PLAYING && !youtubePlayer.hasPlayed){
			setTimeout(function(){
				if (abs(youtubePlayer.YTPlayerObject.getCurrentTime()-youtubePlayer.videoObject.timestamp)>5)
					youtubePlayer.YTPlayerObject.seekTo(youtubePlayer.videoObject.timestamp,true);
			},100);
			youtubePlayer.hasPlayed=true;
		}
		if (event.data == YT.PlayerState.ENDED && youtubePlayer.videoEndCallback!=undefined)
			youtubePlayer.videoEndCallback();
		youtubePlayer.currentPlayerState=event.data;
	},
};

function playVideo(video,onVideoEnd){
	if (player.destroy!=undefined)
		player.destroy();
	if (video.service=="youtube")
		player=youtubePlayer;
	else
		return;
	player.create(video,onVideoEnd);
	$("#player").show();
}
