# WAYW API Definition, by request type

## GET:

	/api/version/ : Get the current version of the server
	
	/api/auth/verify/ : Verify the key submitted is valid as either a client or a control. Returns "client","control", or "none".
	/api/auth/client/ : Get a client key if a client isn't registered already, otherwise notify the  server that another client wants the video.
	/api/auth/control/ : Get a regenerated control key, stealing control from whichever controller was previously being used.

	/api/playback/state/ **[REQUIRES CLIENT/CONTROL AUTH]** : Get the complete state of playback as JSON
	/api/playback/events/ **[REQUIRES CLIENT AUTH]** : Get the change in state since the last request as JSON

	/api/queue/ **[REQUIRES CLIENT/CONTROL AUTH]** : Get all the videos in the queue, including last used timestamps
	/api/queue/length/ **[REQUIRES CLIENT/CONTROL AUTH]** : Get the length of the queue
	/api/queue/%d/ **[REQUIRES CLIENT/CONTROL AUTH]** : Get the video at a specific index in the queue, including the last used timestamp
	/api/queue/events/ **[REQUIRES CONTROL AUTH]** : Gets the change in queue since the last call

## POST:

	/api/playback/state/ **[REQUIRES CONTROL AUTH]** : Apply a full or partial playback state as JSON to the server state
	
	/api/queue/ **[REQUIRES CONTROL AUTH]** : Add a video to the end of the queue
	/api/queue/%d/ **[REQUIRES CONTROL AUTH]** : Insert a video in a position in the queue, equivalent to a POST /api/queue/ and a PUT /api/queue/-1/%d/

## PUT:

	/api/queue/%d/%d/ **[REQUIRES CONTROL AUTH]** : Move an item in the queue from the first argument to the second argument.

## DELETE:

	/api/auth/client/ **[REQUIRES CLIENT AUTH]** : Resets the client key so a new client can take the video.

	/api/queue/%d/ **[REQUIRES CONTROL AUTH]** : Removes the item at the specified index in the queue from the queue.

## HEAD:

	/api/queue/shift/ **[REQUIRES CLIENT AUTH]** : Removes the item at index 0 of the queue, and returns the new video to play. Equivalent to DELETE /api/queue/0 and GET /api/queue/0, but doesn't require control auth. 


# NOTES:
When referring to queue indicies (i.e. in GET /api/queue/%d/), negative values can be used (i.e. -1 for the final item) but values larger than the length of the queue will be clamped. The video at index 0 is the video currently being played.