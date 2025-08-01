from django.http import JsonResponse
from django.shortcuts import render


def handler404(request, exception):
    """404 에러 핸들러"""
    return JsonResponse({
        "error": "Not Found",
        "message": "요청한 리소스를 찾을 수 없습니다.",
        "status_code": 404
    }, status=404)


def handler500(request):
    """500 에러 핸들러"""
    return JsonResponse({
        "error": "Internal Server Error", 
        "message": "서버 내부 오류가 발생했습니다.",
        "status_code": 500
    }, status=500)