#!/usr/bin/env python 2.7

import re,os,mimetypes,string,random
from BaseHTTPServer import HTTPServer,BaseHTTPRequestHandler
from json import dumps as json_encode,loads as json_parse

API_REQUEST_REGEX=re.compile(r"\/api\/.*")
VIDEO_STRING_REGEX=re.compile(r"(youtube|twitch)#(video|stream):\/\/([a-zA-Z0-9]+)\/?(\d+)?")

SERVER_PORT=6901
SERVER_VERSION="1.0"
REGEX_TYPE=type(API_REQUEST_REGEX)

KEY_CHARS=string.ascii_letters+string.digits
def gen_key(length=32):
    key=""
    for i in range(length):
        key+=random.choice(KEY_CHARS)
    return key

class Video:
    host="" #youtube or twitch
    vid_type="" #video or stream (stream is only used for twitch)
    vid_id="" #the video id for vid_type=video, or the channel id for vid_type=stream
    timestamp="" #time in seconds from start. can be empty.

    def __init__(self,base_string=None,host=None,vid_type=None,vid_id=None,timestamp=None):
        if base_string!=None:
            match=VIDEO_STRING_REGEX.match(base_string)
            if not match:
                return None #TODO: Make a better way of returning from bad data
            self.host=match.group(1)
            self.vid_type=match.group(2)
            self.vid_id=match.group(3)
            self.timestamp=match.group(4)

        if host!=None:
            self.host=str(host)
        if vid_type!=None:
            self.vid_type=str(vid_type)
        if vid_id!=None:
            self.vid_id=str(vid_id)
        if timestamp!=None:
            self.timestamp=str(timestamp)

        self.sanity_check()

    def sanity_check(self):
        if self.host=="youtube":
            self.vid_type="video"
        if self.vid_type=="stream":
            self.timestamp=""

    def __repr__(self):
        return self.host+"#"+self.vid_type+"://"+self.vid_id+"/"+self.timestamp
    def __str__(self):
        return self.__repr__()
    

class WAYWServer(HTTPServer):
    client_key=""
    control_key=""

    queue=[
        Video(base_string="youtube#video://iPXqJ6zJxjU/")
        Video(base_string="youtube#video://0jx3V4-_iXU/")
    ]
    queue_delta=[]
    
    playback_state={
        "paused":True, #true or false
        "volume":1.0, #0.0->1.0 
        "quality":"default", #1080,720,480,360,240,default
        "timestamp":0, #seconds since the start
        "newClientRequest":False
    }
    playback_state_delta={}

    def __init__(self):
        HTTPServer.__init__(self,('',SERVER_PORT),WAYWRequestHandler)

    def is_client_key(self,client_key):
        return client_key==self.client_key
    def is_control_key(self,control_key):
        return control_key==self.control_key

    def gen_client_key(self):
        self.client_key=gen_key()
        while self.client_key==self.control_key:
            self.client_key=gen_key()
        return self.client_key
    def gen_control_key(self):
        self.control_key=gen_key()
        while self.control_key==self.client_key:
            self.control_key=gen_key()
        return self.control_key()


class WAYWRequestHandler(BaseHTTPRequestHandler):
    client_authed=False
    control_authed=False

    def calc_auth(self):
        self.client_authed=False
        self.control_authed=False
        try:
            auth_type,key=self.headers["authorization"].split(" ")
        except:
            return
        if key=="":
            return
        self.client_authed=self.server.is_client_key(key)
        self.control_authed=self.server.is_control_key(key)
        
    def require_client_auth(self):
        if not self.client_authed:
            if self.control_authed:
                self.send_error(403)
            else:
                self.send_error(401)
    def require_control_auth(self):
        if not self.control_authed:
            if self.client_authed:
                self.send_error(403)
            else:
                self.send_error(401)
    def require_either_auth(self):
        if not self.control_authed and not self.client_authed:
            self.send_error(401)

            
    def do_GET(self):
        self.do_request({
            "/api/version/":self.get_current_version,
            
            "/api/auth/verify/":self.get_auth_level,
            "/api/auth/client/":self.get_client_key,
            "/api/auth/control/":self.get_control_key,
            
            "/api/playback/state/":self.get_playback_state,
            "/api/playback/events/":self.get_playback_events,
            
            "/api/queue/":self.get_queue,
            "/api/queue/length":self.get_queue_length,
            re.compile(r"\/api\/queue\/(\d+)\/"):self.get_queue_item,
        }, return_file=True)
    def do_POST(self):
        self.do_request({
            "/api/playback/state/":self.apply_playback_state,
            "/api/queue/":self.add_video_to_queue,
            re.compile(r"\/api\/queue\/(\d+)\/"):self.insert_video_in_queue,
        })
    def do_PUT(self):
        self.do_request({
            re.compile(r"\/api\/queue\/(\d+)\/(\d+)\/"):self.reposition_queue_item_from_match,
            re.compile(r"\/api\/queue\/(\d+)\/timestamp\/"):self.change_queue_item_timestamp,
        })
    def do_DELETE(self):
        self.do_request({
            "/api/auth/client/":self.clear_client_key,
            "/api/auth/control/":self.clear_control_key,
            
            re.compile(r"\/api\/queue\/(\d+)\/"):self.remove_queue_item
        })
    def do_HEAD(self):
        self.do_request({
            "/api/queue/shift/":self.increment_queue
        })

    def do_request(self,api_def,return_file=False):
        print "\nNew Request"
        print self.path
        self.calc_auth()

        if API_REQUEST_REGEX.match(self.path):
            for key in api_def:
                if (type(key) is REGEX_TYPE):
                    match=key.match(self.path)
                    if match==None:
                        continue
                    api_def[key](match)
                    return
                if self.path==key:
                    api_def[key]()
                    return
            self.send_error(400)
            
        if return_file:
            file_path="."+self.path
            print "Client wants "+file_path
            if os.path.isfile(file_path):
                print "Found "+file_path
                f=open(file_path,"rb")
                self.send_response(200)
                self.send_header("content-type",mimetypes.guess_type(file_path))
                self.end_headers()
                self.wfile.write(f.read())
                f.close()
                return
            
        print "Invalid Request"
        self.send_error(404)

    def clamp_queue_index(self,index):
        if index>=len(self.server.queue):
            return len(self.server.queue)-1
        return index

    """
    
    GET FUNCTIONS

    """
    def get_current_version(self):
        self.wfile.write(SERVER_VERSION)
    def get_auth_level(self):
        self.send_response(200)
        if self.client_authed:
            self.wfile.write("client")
        elif self.control_authed:
            self.wfile.write("control")
        else:
            self.wfile.write("none")
    def get_client_key(self):
        if self.server.is_client_key(""):
            self.send_response(200)
            self.wfile.write(self.server.gen_client_key())
        else:
            self.server.playback_state_delta["newClientRequested"]=(not self.server.playback_state["newClientRequested"])
            self.server.playback_state["newClientRequested"]=True
            self.send_error(409)
    def get_control_key(self):
        if self.server.is_control_key(""):
            self.send_response(200)
            self.wfile.write(self.server.get_control_key())
        else:
            self.send_error(409)
    def get_playback_state(self):
        self.require_either_auth()
        self.send_response(200)
        self.wfile.write(json_encode(self.server.playback_state))
    def get_playback_events(self):
        self.require_client_auth()
        self.send_response(200)
        self.wfile.write(json_encode(self.server.playback_state_delta))
        self.server.playback_state_delta={}
    def get_queue(self):
        self.require_either_auth()
        self.send_response(200)
        self.wfile.write(json_encode(self.server.queue))
    def get_queue_length(self):
        self.require_either_auth()
        self.send_response(200)
        self.wfile.write(str(len(self.server.queue)))
    def get_queue_item(self,match):
        self.require_either_auth()
        index=self.clamp_queue_index(int(match.group(1)))
        self.send_response(200)
        self.wfile.write(json_encode(self.server.queue(index)))

    """
    
    POST FUNCTIONS

    """
    def apply_playback_state(self):
        self.require_control_auth()
        #TODO: Apply the playback delta to the server playback object
        self.send_response(204)
    def add_video_to_queue(self):
        self.require_control_auth()
        #TODO: Add the video to the end of the queue
        self.send_response(204)
    def insert_video_in_queue(self,match):
        self.add_video_to_queue()
        self.reposition_queue_item(-1,int(match.group(1)))

    """

    PUT FUNCTIONS

    """
    def reposition_queue_item_from_match(self,match):
        self.require_control_auth()
        self.reposition_queue_item(int(match.group(1)),int(match.group(2)))
        self.send_response(204)
    def reposition_queue_item(self,index1,index2):
        index1=self.clamp_queue_index(index1)
        index2=self.clamp_queue_index(index2)
        if index1==index2:
            return
        self.server.queue.insert(index2,self.server.queue.pop(index2))

    def change_queue_item_timestamp(self,match):
        self.require_client_auth()
        index=self.clamp_queue_index(int(match.group(1)))
        #TODO: Modify the timestamp for the video at index

    
    """

    DELETE FUNCTIONS

    """
    def clear_client_key(self):
        self.require_client_auth()
        self.server.client_key=""
        self.send_response(204)
    def clear_client_key(self):
        self.require_control_auth()
        self.server.control_key=""
        self.send_response(204)
    def remove_queue_item(self,match):
        self.require_control_auth()
        index=self.clamp_queue_index(int(match.group(1)))
        #TODO: Remove item at index

    """

    HEAD FUNCTIONS

    """
    def increment_queue(self):
        #TODO: Increment queue, return item at index 0
        self.send_response(200)
        self.wfile.write("{}")

if __name__=='__main__':
    server=WAYWServer()
    server.serve_forever()
