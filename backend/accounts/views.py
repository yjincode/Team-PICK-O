from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_user_profile(request):
    """사용자 프로필 조회 (추후 구현)"""
    return Response({
        "username": request.user.username,
        "email": request.user.email,
        "message": "사용자 관리 API는 추후 구현될 예정입니다."
    })