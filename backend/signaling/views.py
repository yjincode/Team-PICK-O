# signaling/views.py
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from channels.layers import get_channel_layer
import json

from .consumers import clients

@csrf_exempt
def post_message(request, msg_type):
    try:
        data = json.loads(request.body)
        from_user = data.get("from")
        to_user = data.get("to")
        payload = data.get("sdp") or data.get("candidate") or data.get("text")

        if not all([from_user, to_user, payload]):
            return JsonResponse({"error": "Missing required fields"}, status=400)

        if to_user in clients:
            awaitable = clients[to_user].send(text_data=json.dumps({
                "type": msg_type,
                "from": from_user,
                msg_type: payload
            }))
            return JsonResponse({"status": f"{msg_type} sent"})
        else:
            return JsonResponse({"error": "Target not connected"}, status=400)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)
