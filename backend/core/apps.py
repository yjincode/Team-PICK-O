from django.apps import AppConfig


class CoreConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'core'
    
    def ready(self):
        """
        Django 앱이 준비되었을 때 Firebase Admin SDK를 초기화합니다.
        """
        try:
            import firebase_admin
            from firebase_admin import credentials
            from django.conf import settings
            import os
            
            # Firebase Admin SDK가 이미 초기화되었는지 확인
            if not firebase_admin._apps:
                # Firebase Admin SDK 인증서 경로
                cred_path = getattr(settings, 'FIREBASE_ADMIN_CREDENTIALS', None)
                
                if cred_path and os.path.exists(cred_path):
                    print(f"🔍 Firebase 인증서 경로: {cred_path}")
                    print(f"🔍 인증서 파일 존재: {os.path.exists(cred_path)}")
                    
                    cred = credentials.Certificate(cred_path)
                    print("🔍 Firebase 인증서 로드 완료")
                    
                    firebase_admin.initialize_app(cred)
                    print("✅ Firebase Admin SDK 초기화 완료 (Django 앱 시작 시)")
                    print(f"✅ Firebase Apps: {firebase_admin._apps}")
                else:
                    print("⚠️ Firebase Admin SDK Service Account Key가 없습니다.")
                    print(f"   설정된 경로: {cred_path}")
                    print("   Firebase Console에서 Service Account Key를 다운로드하여")
                    print("   firebase-admin-key.json으로 저장하세요.")
            else:
                print("✅ Firebase Admin SDK가 이미 초기화되어 있습니다.")
                
        except Exception as e:
            print(f"❌ Firebase Admin SDK 초기화 실패: {e}")
            print(f"❌ 에러 타입: {type(e).__name__}")
            print("   Firebase Console에서 Service Account Key를 다운로드하세요.") 