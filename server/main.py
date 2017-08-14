#!/usr/bin/env python 2.7

import re,os,mimetypes,string,random,base64
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

def Video(service="youtube",video_type="video",video_id="",timestamp=0):
    return {"service":service,"type":video_type,"id":video_id,"timestamp":timestamp}
    

class WAYWServer(HTTPServer):
    client_key=""
    control_key=""

    queue=[
        Video(video_id="iPXqJ6zJxjU"),
        Video(video_id="0jx3V4-_iXU",timestamp=0)
    ]
    queue_delta=[]
    
    playback_state={
        "paused":True, #true or false
        "volume":1.0, #0.0->1.0 
        "quality":"default", #1080,720,480,360,240,default
        "timestamp":0, #seconds since the start
        "newClientRequested":False
    }
    playback_state_delta={}

    def __init__(self):
        HTTPServer.__init__(self,('',SERVER_PORT),WAYWRequestHandler)

    def is_client_key(self,client_key):
        return client_key==self.client_key
    def is_control_key(self,control_key):
        return control_key==self.control_key

    def is_b64_client_key(self,encoded):
        return self.client_key!="" and encoded==base64.b64encode("Client:"+self.client_key)
    def is_b64_control_key(self,encoded):
        return self.control_key!="" and encoded==base64.b64encode("Control:"+self.control_key) 

    def gen_client_key(self):
        self.client_key=gen_key()
        while self.client_key==self.control_key:
            self.client_key=gen_key()
        return self.client_key
    def gen_control_key(self):
        self.control_key=gen_key()
        while self.control_key==self.client_key:
            self.control_key=gen_key()
        return self.control_key


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
        print "Auth Key: "+key
        self.client_authed=self.server.is_b64_client_key(key)
        self.control_authed=self.server.is_b64_control_key(key)
        
    def require_client_auth(self):
        if not self.client_authed:
            if self.control_authed:
                self.send_error(403)
                raise
            else:
                self.send_error(401)
                raise
    def require_control_auth(self):
        if not self.control_authed:
            if self.client_authed:
                self.send_error(403)
                raise
            else:
                self.send_error(401)
                raise
    def require_either_auth(self):
        if not self.control_authed and not self.client_authed:
            self.send_error(401)
            raise

            
    def do_GET(self):
        self.do_request({
            "/api/version/":self.get_current_version,
            
            "/api/auth/verify/":self.get_auth_level,
            "/api/auth/client/":self.get_client_key,
            "/api/auth/control/":self.get_control_key,
            
            "/api/playback/state/":self.get_playback_state,
            "/api/playback/events/":self.get_playback_events,
            
            "/api/queue/":self.get_queue,
            "/api/queue/length/":self.get_queue_length,
            re.compile(r"\/api\/queue\/(\d+)\/"):self.get_queue_item,
        }, return_file=True)
    def do_POST(self):
        if 'content-length' in self.headers:
            content_length = int(self.headers['Content-Length'])
            self.POST_data=self.rfile.read(content_length)
        else:
            self.POST_data=""
        #print "POST Data: "+self.POST_data
            
        self.do_request({
            "/api/playback/state/":self.apply_playback_state,
            "/api/queue/":self.add_video_to_queue,
            re.compile(r"\/api\/queue\/(\d+)\/"):self.insert_video_in_queue,
        })
    def do_PUT(self):
        self.do_request({
            re.compile(r"\/api\/queue\/(\d+)\/(\d+)\/"):self.reposition_queue_item_from_match,
            re.compile(r"\/api\/queue\/(\d+)\/timestamp\/(\d+)\/"):self.change_queue_item_timestamp,
        })
    def do_DELETE(self):
        self.do_request({
            "/api/auth/client/":self.clear_client_key,
            "/api/auth/control/":self.clear_control_key,
            
            re.compile(r"\/api\/queue\/(\d+)\/"):self.remove_queue_item
        })
    def do_HEAD(self):
        self.do_request({},return_file=True)

    def do_request(self,api_def,return_file=False):
        print "\nNew Request"
        
        print self.path
        self.calc_auth()

        if API_REQUEST_REGEX.match(self.path):
            if self.path[-1]!='/':
                self.path+='/'
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
                self.send_response(200)
                self.send_header("content-type",mimetypes.guess_type(file_path)[0])
                f=open(file_path,"rb")
                file_content=f.read()
                self.send_header("content-length",len(file_content))
                self.end_headers()
                if self.command !="HEAD":
                    self.wfile.write(file_content)
                    f.close()
                return
            
        print "Invalid Request"
        self.send_error(404)

    def clamp_queue_index(self,index):
        if index>=len(self.server.queue):
            return len(self.server.queue)-1
        return index

    def positive_response(self):
        #HACK: Set the content-type as text to avoid any XML parsing errors
        self.send_response(200)
        self.send_header("content-type","text/text")
        self.end_headers()

    """
    
    GET FUNCTIONS

    """
    def get_current_version(self):
        self.wfile.write(SERVER_VERSION)
    def get_auth_level(self):
        self.positive_response()
        if self.client_authed:
            self.wfile.write("client")
        elif self.control_authed:
            self.wfile.write("control")
        else:
            self.wfile.write("none")
    def get_client_key(self):
        if self.server.is_client_key(""):
            self.positive_response()
            self.wfile.write(self.server.gen_client_key())
        else:
            self.server.playback_state_delta["newClientRequested"]=(not self.server.playback_state["newClientRequested"])
            self.server.playback_state["newClientRequested"]=True
            self.send_error(409)
    def get_control_key(self):
        if self.server.is_control_key(""):
            self.positive_response()
            ctrl_key=self.server.gen_control_key()
            #print ctrl_key
            self.wfile.write(ctrl_key)
        else:
            self.send_error(409)
    def get_playback_state(self):
        self.require_either_auth()
        self.positive_response()
        self.wfile.write(json_encode(self.server.playback_state))
    def get_playback_events(self):
        self.require_client_auth()
        self.positive_response()
        self.wfile.write(json_encode(self.server.playback_state_delta))
        self.server.playback_state_delta={}
    def get_queue(self):
        self.require_either_auth()
        self.positive_response()
        self.wfile.write(json_encode(self.server.queue))
    def get_queue_length(self):
        self.require_either_auth()
        self.positive_response()
        self.wfile.write(str(len(self.server.queue)))
    def get_queue_item(self,match):
        self.require_either_auth()
        index=self.clamp_queue_index(int(match.group(1)))
        self.positive_response()
        self.wfile.write(json_encode(self.server.queue[index]))

    """
    
    POST FUNCTIONS

    """
    def apply_playback_state(self):
        self.require_control_auth()
        try:
            playback_state_delta=json_parse(self.POST_data)
            if type(playback_state_delta) is not type({}):
                raise
        except:
            self.send_error(400,"The submitted data should be a JSON dictionary")
            return
        for key in playback_state_delta:
            print key
            if key in self.server.playback_state and key!="newClientRequested":
                if self.server.playback_state[key]!=playback_state_delta[key]:
                    self.server.playback_state_delta[key]=playback_state_delta[key]
                print self.server.playback_state[key],playback_state_delta[key]
                self.server.playback_state[key]=playback_state_delta[key]
        print self.server.playback_state
        self.send_response(204)
    def add_video_to_queue(self):
        self.require_control_auth()
        try:
            video=json_parse(self.POST_data)
            if type(video) is not type({}) or "service" not in video or "id" not in video or "type" not in video:
                raise
        except:
            self.send_error(400,"The submitted data should be a JSON dictionary. See the API definition for the required content.")
            return
        if "timestamp" not in video:
            video["timestamp"]=0
        for key in video:
            if key not in ["service","id","type","timestamp"]:
                self.send_error(400,"'"+key+"' is an invalid attribute for a video object")
                return
        self.server.queue.append(video)
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
        self.server.queue[index]["timestamp"]=int(match.group(2))

    
    """

    DELETE FUNCTIONS

    """
    def clear_client_key(self):
        self.require_client_auth()
        self.server.client_key=""
        self.server.playback_state["newClientRequested"]=False
        self.server.playback_state_delta["newClientRequested"]=False
        self.server.playback_state["paused"]=True
        self.server.playback_state_delta["paused"]=True
        self.send_response(204)
    def clear_control_key(self):
        self.require_control_auth()
        self.server.control_key=""
        self.send_response(204)
    def remove_queue_item(self,match):
        self.require_either_auth()
        index=self.clamp_queue_index(int(match.group(1)))
        print self.server.queue,self.server
        self.server.queue.pop(index)
        self.send_response(204)

    """

    HEAD FUNCTIONS

    """
    def increment_queue(self):
        if len(self.server.queue)>1:
            self.server.queue.pop(0)
            self.positive_response()
            self.wfile.write(json_encode(self.server.queue[0]))
        else:
            self.send_error(403)

if __name__=='__main__':
    server=WAYWServer()
    server.serve_forever()
