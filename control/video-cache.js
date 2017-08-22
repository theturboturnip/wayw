var videoCache={
	cache:{},

	getVideoData:function(id){
		return this.cache[id];
	},
	addVideo:function(video){
		if (video.kind!="youtube#video") return;
		this.cache[video.id]=video;
	},
	constructVideoElement:function(video){
		if (this.cache[video])
			video=this.cache[video]
		if (video.kind!="youtube#video") return;
		if (!this.cache[video.id])
			this.cache[video.id]=video;
		
		/*
		  <div class="video-container">
	      <img src="http://img.youtube.com/vi/164hJoIgSCQ/mqdefault.jpg">
	      <div id="content">
	      <span id="title">Video title hear</span>
		  <br>
		  <a id="channel" href="">Channel name</a>
		  <div id="time">12:50</div>
		  </div>
		  </div>*/

		var element=document.createElement("div");
		element.classList.add("video-container");
		var thumb=document.createElement("img");
		thumb.src=video.snippet.thumbnails.medium.url;
		element.appendChild(thumb);
		var content=document.createElement("div");
		content.id="content";
		element.appendChild(content);
		var title=document.createElement("div");
		title.id="title";
		title.innerHTML=video.snippet.title; 
		title.title=video.snippet.title;
		content.appendChild(title);
		//content.appendChild(document.createElement("br"));
		var channel=document.createElement("a");
		channel.id="channel";
		channel.href="#"; //TODO: Add link to open channel
		channel.innerHTML=video.snippet.channelTitle;
		content.appendChild(channel);
		var time=document.createElement("div");
		time.id="time";
		var match=iso8601HourRegex.exec(video.contentDetails.duration);
		var timeString="";
		if (match)
			timeString+=match[1]+":";
		match=iso8601MinuteRegex.exec(video.contentDetails.duration);
		if (match)
			timeString+=match[1]+":";
		else
			timeString+="0:";
		match=iso8601SecondRegex.exec(video.contentDetails.duration);
		if (match)
			timeString+=("0"+match[1]).slice(-2);
		else
			timeString+="00";
		
		time.innerHTML=timeString;
		content.appendChild(time);
		
		return element;


	}
}
