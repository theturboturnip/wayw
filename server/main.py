#!/usr/bin/env python 2.7

import re,os,mimetypes,json,string,random
from BaseHTTPServer import HTTPServer,BaseHTTPRequestHandler

API_REQUEST_REGEX=re.compile("\/api\/.*")

SERVER_PORT=6901
SERVER_VERSION="1.0"
REGEX_TYPE=type(API_REQUEST_REGEX)

KEY_CHARS=string.ascii_letters+string.digits
def gen_key(length=32):
    key=""
    for i in range(length):
        key+=random.choice(KEY_CHARS)
    return key

class WAYWServer(HTTPServer):
    client_key=""
    control_key=""

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
            "/api/queue/events/":self.get_queue_events
        }, return_file=True)
    def do_POST(self):
        self.do_request({
            "/api/playback/state/":self.apply_playback_state,
            "/api/queue/":self.add_video_to_queue,
            re.compile(r"\/api\/queue\/(\d+)\/"):self.insert_video_in_queue,
        })
    def do_PUT(self):
        self.do_request({
            re.compile(r"\/api\/queue\/(\d+)\/(\d+)\/"):self.reposition_queue_item_from_match
        })
    def do_DELETE(self):
        self.do_request({
            "/api/auth/client/":self.clear_client_key,
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
        #TODO: Use the queue length to clamp the index to under that.
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
            #TODO: Add "new-client-pending" to the playback state
            self.send_error(409)
    def get_control_key(self):
        self.send_response(200)
        self.wfile.write(self.server.get_control_key())
    def get_playback_state(self):
        self.require_either_auth()
        #TODO: Send the playback state as JSON
        self.send_response(200)
        self.wfile.write("{}")
    def get_playback_events(self):
        self.require_client_auth()
        #TODO: Send the playback state delta as JSON
        self.send_response(200)
        self.wfile.write("{}")
    def get_queue(self):
        self.require_either_auth()
        #TODO: Send the whole queue as JSON
        self.send_response(200)
        self.wfile.write("{}")
    def get_queue_length(self):
        self.require_either_auth()
        #TODO: Send the queue length
        self.send_response(200)
        self.wfile.write("0")
    def get_queue_item(self,match):
        self.require_either_auth()
        index=self.clamp_queue_index(int(match.group(1)))
        #TODO: Send the specified item in the queue as JSON
        self.send_response(200)
        self.wfile.write("{}")
    def get_queue_events(self):
        self.require_client_auth()
        #TODO: Send the queue state delta as JSON
        self.send_response(200)
        self.wfile.write("{}")

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
        self.reposition_queue_item(-1,self.clamp_queue_index(int(match.group(1))))

    """

    PUT FUNCTIONS

    """
    def reposition_queue_item_from_match(self,match):
        self.require_control_auth()
        self.reposition_queue_item(self.clamp_queue_index(int(match.group(1))),self.clamp_queue_index(int(match.group(2))))
        self.send_response(204)
    def reposition_queue_item(self,index1,index2):
        if index1==index2:
            return
        #TODO: Move item at index1 to index2

    """

    DELETE FUNCTIONS

    """
    def clear_client_key(self):
        self.require_client_auth()
        self.server.client_key=""
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
