# signaling/consumers.py
import json
from channels.generic.websocket import AsyncWebsocketConsumer

clients = {}

class CallConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.user_id = self.scope["url_route"]["kwargs"]["user_id"]
        clients[self.user_id] = self
        await self.accept()
        print(f"🟢 {self.user_id} connected. Total clients: {len(clients)}")

    async def disconnect(self, close_code):
        clients.pop(self.user_id, None)
        print(f"❌ {self.user_id} disconnected")

    async def receive(self, text_data):
        message = json.loads(text_data)
        message["from"] = self.user_id
        to_user = message.get("to")

        if to_user in clients:
            await clients[to_user].send(text_data=json.dumps(message))
            print(f"📤 Forwarded message from {self.user_id} to {to_user}")
        else:
            print(f"⚠️ No recipient found with ID: {to_user}")
