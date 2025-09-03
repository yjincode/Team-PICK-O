from django.apps import AppConfig


class PredictionConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'prediction'
    
    def ready(self):
        """Django 앱 시작 시 모델 미리 로드"""
        try:
            # 개발 서버에서만 실행 (runserver 명령어 체크)
            import sys
            if 'runserver' in sys.argv or 'migrate' not in sys.argv:
                # 백그라운드 스레드로 모델 미리 로드
                import threading
                
                def preload_models():
                    try:
                        print("🚀 예측 모델 백그라운드 로딩 시작...")
                        from .views import load_single_species_model
                        
                        # 주요 어종 모델들을 미리 로드
                        species_list = ['우럭', '넙치', '참돔', '농어', '숭어']
                        loaded_count = 0
                        
                        for species in species_list:
                            try:
                                result = load_single_species_model(species)
                                if result:
                                    loaded_count += 1
                                    print(f"📦 {species} 모델 백그라운드 로드 완료")
                            except Exception as e:
                                print(f"⚠️ {species} 백그라운드 로드 실패: {e}")
                        
                        print(f"🎯 예측 모델 백그라운드 로딩 완료: {loaded_count}/{len(species_list)}개")
                    except Exception as e:
                        print(f"❌ 모델 백그라운드 로딩 실패: {e}")
                
                # 3초 후에 백그라운드로 시작
                threading.Timer(3.0, preload_models).start()
        except Exception as e:
            print(f"❌ 모델 백그라운드 로딩 설정 실패: {e}")