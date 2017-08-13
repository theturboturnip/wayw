# WAYW API Definition

## Videos
A video is defined as a string with the following parts:
1. The Supplier (Can be `youtube#video`,`twitch#video`,`twitch#stream`. YouTube livestreams can be accessed with `youtube#video`.)
2. "://"
3. The ID (Either the video ID or the streamer name if it's a livestream)
4. "/"
4. [OPTIONAL] The Timestamp in seconds since the start of the video.

Examples:
`youtube#video://iPXqJ6zJxjU/` : A YouTube video with ID iPXqJ6zJxjU
`twitch#video://166499238/209` : A Twitch VOD with ID 166499238, starting 209 seconds in.
`twitch#stream://shenpai/` : A Twitch livestream from channel Shenpai.

## Playback State
The state of playback is returned from the server as a JSON object which can have the following attributes:

1. paused (bool)
2. volume (float between 0 and 1)
3. quality (string, can be "high","medium","low", or "default" for player-controlled auto adjustment)
4. timestamp (int)
5. newClientRequest (bool). if true, the client should relinquish the video to a new client by PUT-ing the current timestamp on video 0 and DELETE-ing the client key.

The change in state will be returned as a JSON object which can have any of the previous attributes.

## Queue
The queue will be returned from the server as a JSON array i.e.

```javascript
[
	"youtube#video://iPXqJ6zJxjU/",
	"twitch#video://166499238/209"
]
```

## Requests
### GET

	/api/version/ : Get the current version of the server
	
	/api/auth/verify/ : Verify the key submitted is valid as either a client or a control. Returns "client","control", or "none".
	/api/auth/client/ : Get a client key if a client isn't registered already, otherwise notify the server that another client wants the video.
	/api/auth/control/ : Get a control key if a controller isn't registered already.

	/api/playback/state/ **[REQUIRES CLIENT/CONTROL AUTH]** : Get the complete state of playback as JSON
	/api/playback/events/ **[REQUIRES CLIENT AUTH]** : Get the change in state since the last request as JSON

	/api/queue/ **[REQUIRES CLIENT/CONTROL AUTH]** : Get all the videos in the queue, including last used timestamps
	/api/queue/length/ **[REQUIRES CLIENT/CONTROL AUTH]** : Get the length of the queue
	/api/queue/%d/ **[REQUIRES CLIENT/CONTROL AUTH]** : Get the video at a specific index in the queue, including the last used timestamp

### POST

	/api/playback/state/ **[REQUIRES CONTROL AUTH]** : Apply a full or partial playback state as JSON to the server state
	
	/api/queue/ **[REQUIRES CONTROL AUTH]** : Add a video to the end of the queue
	/api/queue/%d/ **[REQUIRES CONTROL AUTH]** : Insert a video in a position in the queue, equivalent to a POST /api/queue/ and a PUT /api/queue/-1/%d/

### PUT

	/api/queue/%d/timestamp/ **[REQUIRES CLIENT AUTH]** : Modifies the timestamp for a video in the queue.
	/api/queue/%d/%d/ **[REQUIRES CONTROL AUTH]** : Move an item in the queue from the first argument to the second argument.

### DELETE

	/api/auth/client/ **[REQUIRES CLIENT AUTH]** : Resets the client key so a new client can take the video.
	/api/auth/control/ **[REQUIRES CONTROL AUTH]** : Resets the control key so a new controller can take control.

	/api/queue/%d/ **[REQUIRES CONTROL AUTH]** : Removes the item at the specified index in the queue from the queue.

### HEAD

	/api/queue/shift/ **[REQUIRES CLIENT AUTH]** : Removes the item at index 0 of the queue, and returns the new video to play. Equivalent to DELETE /api/queue/0 and GET /api/queue/0, but doesn't require control auth. 


## NOTES
When referring to queue indicies (i.e. in GET /api/queue/%d/), negative values can be used (i.e. -1 for the final item) but values larger than the length of the queue will be clamped. The video at index 0 is the video currently being played.