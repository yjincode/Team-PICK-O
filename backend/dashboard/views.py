from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response


@api_view(['GET'])
@permission_classes([IsAdminUser])
def get_dashboard_stats(request):
    """관리자 대시보드 통계 (추후 구현)"""
    return Response({
        "message": "관리자 대시보드 API는 추후 구현될 예정입니다.",
        "total_analyses": 0,
        "total_users": 0,
        "recent_activity": []
    })