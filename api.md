# WAYW API Definition

## Videos
A video is defined as an object with 4 properties:

- `service` (`string`, can be `youtube` or `twitch`)
- `type` (`string`, can be `video` or `stream`. can only be `stream` if the service is `twitch`)
- `id` (`string`, the id of the video/vod/streamer being watched)
- `timestamp` (`int`, the number of seconds in to resume from)

## Playback State
The state of playback is returned from the server as a JSON object which can have the following attributes:

- `paused` (`bool`)
- `volume` (`float` between 0 and 1)
- `quality` (`string`, can be `high`,`medium`,`low`, or `default` for player-controlled auto adjustment)
- `timestamp` (`int`)
- `newClientRequested` (`bool`) if true, the client should relinquish the video to a new client by PUT-ing the current timestamp on video 0 and DELETE-ing the client key.
- `hasControl` (`bool`) If true, there's an external control which the client should respect by applying state changes and events.

The change in state will be returned as a JSON object which can have any of the previous attributes.

## Queue
The queue will be returned from the server as a JSON array of video objects i.e.

```javascript
[
	{
		service:"youtube",
		type:"video",
		id:"iPXqJ6zJxjU"
	},
	{
		service:"twitch",
		type:"video",
		id:"166499238",
		timestamp:209
	}
]
```

## Request Authentication
To submit a request with client authentication, use basic HTTP authentication using the username Client and the client key as the password. The same process is used for control authentication, with the username Control and the control key as the password.

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
	/api/queue/save/ **[REQUIRES CLIENT/CONTROL AUTH]** : Request that the queue be saved. Should be called once the control has finished modifying the queue, and when the client increments the video.

### POST

	/api/playback/state/ **[REQUIRES CONTROL AUTH]** : Apply a full or partial playback state as JSON to the server state
	
	/api/queue/ **[REQUIRES CONTROL AUTH]** : Add a video to the end of the queue
	/api/queue/%d/ **[REQUIRES CONTROL AUTH]** : Insert a video in a position in the queue, equivalent to a POST /api/queue/ and a PUT /api/queue/-1/%d/

### PUT

	/api/queue/%d/timestamp/%d **[REQUIRES CLIENT AUTH]** : Modifies the timestamp for a video in the queue.
	/api/queue/%d/%d/ **[REQUIRES CONTROL AUTH]** : Move an item in the queue from the first argument to the second argument.

### DELETE

	/api/auth/client/ **[REQUIRES CLIENT AUTH]** : Resets the client key so a new client can take the video.
	/api/auth/control/ **[REQUIRES CONTROL AUTH]** : Resets the control key so a new controller can take control.

	/api/queue/%d/ **[REQUIRES CLIENT/CONTROL AUTH]** : Removes the item at the specified index in the queue from the queue.


## NOTES
When referring to queue indicies (i.e. in GET /api/queue/%d/), negative values can be used (i.e. -1 for the final item) but values larger than the length of the queue will be clamped. The video at index 0 is the video currently being played.