#!/usr/bin/env python 2.7

from json import dumps as json_encode,loads as json_parse
from subprocess import check_output as subproc_call,Popen
import os,unittest,time

SERVER_ADDR="localhost:6901"

def call(*cmd):
    print ' '.join(map(str,cmd))
    output=""
    try:
        output=subproc_call(cmd)
    except:
        print "Command Error!"
    return output

def request(req_type="GET",path="/",auth="",POST_upload=""):
    if POST_upload!="" and req_type=="POST":
        return call("curl",SERVER_ADDR+path,"-d",POST_upload,"-u",auth,"--basic","-s")
    elif auth!="":
        return call("curl",SERVER_ADDR+path,"--basic","-X",req_type,"-u",auth,"-s")
    else:
        return call("curl",SERVER_ADDR+path,"-X",req_type,"-s")

class TestMethods(unittest.TestCase):
    server_cmd=None
    client_auth=""
    control_auth=""
    
    def setUp(self):
        self.server_cmd=Popen(["python","/home/samuel/Projects/Personal/Python/wayw/server/main.py"],stdout=open(os.devnull, 'wb'))
        time.sleep(1)
        client_key=request("GET","/api/auth/client")
        control_key=request("GET","/api/auth/control")
        print "Client Key: "+client_key
        print "Control Key: "+control_key
        self.client_auth="Client:"+client_key
        self.control_auth="Control:"+control_key

    def tearDown(self):
        self.server_cmd.terminate()

    def test_keys(self):
        self.assertEqual(request("GET","/api/auth/verify",self.client_auth),"client")
        self.assertEqual(request("GET","/api/auth/verify",self.control_auth),"control")

    def test_playback_control(self):
        request("GET","/api/playback/state",self.client_auth)
        request("POST","/api/playback/state",self.control_auth,"{\"paused\":true}")

        self.assertFalse("paused" in json_parse(request("GET","/api/playback/events",self.client_auth)))
            
        request("POST","/api/playback/state",self.control_auth,"{\"paused\":false}")
    
        self.assertFalse(json_parse(request("GET","/api/playback/state",self.client_auth))["paused"])
        self.assertFalse(json_parse(request("GET","/api/playback/events",self.client_auth))["paused"])

    def test_queue_control(self):
        print "checking if queues are consistent"
        queue=json_parse(request("GET","/api/queue/",self.client_auth))
        self.assertEqual(len(queue),int(request("GET","/api/queue/length/",self.client_auth)))
        for i in range(len(queue)):
            self.assertEqual(json_encode(queue[i]),request("GET","/api/queue/"+str(i),self.client_auth))

        print "adding to queue"
        video_to_add={"service":"youtube","type":"video","id":"oiubwd","timestamp":"0"}
        request("POST","/api/queue/",self.control_auth,json_encode(video_to_add))
        self.assertEqual(len(queue)+1,int(request("GET","/api/queue/length/",self.client_auth)))
        self.assertEqual(json_encode(video_to_add),request("GET","/api/queue/"+str(len(queue)),self.client_auth))

    def test_client_migrate(self):
        request("GET","/api/auth/client")
        playback_delta=json_parse(request("GET","/api/playback/events",self.client_auth))
        self.assertTrue("newClientRequested" in playback_delta)
        self.assertTrue(playback_delta["newClientRequested"])
        request("DELETE","/api/auth/client",self.client_auth)
        new_client_key=request("GET","/api/auth/client")
        self.assertEqual(len(new_client_key),32)
        self.assertEqual(request("GET","/api/auth/verify","Client:"+new_client_key),"client")

if __name__=='__main__':
    print "Beginning Server Tests"

    unittest.main()
