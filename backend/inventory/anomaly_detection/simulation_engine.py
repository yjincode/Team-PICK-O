"""
시뮬레이션 엔진
다양한 시나리오로 합성 데이터를 생성하여 AI 시스템을 테스트
"""
import numpy as np
import pandas as pd
from typing import Dict, List, Any, Optional
import logging
from datetime import datetime, timedelta
import random
from django.utils import timezone

logger = logging.getLogger(__name__)


class SimulationEngine:
    """시뮬레이션 엔진"""
    
    def __init__(self):
        self.scenarios = {
            'peak_season': self._generate_peak_season,
            'typhoon_delay': self._generate_typhoon_delay,
            'normal': self._generate_normal
        }
    
    def generate_simulation_data(
        self,
        scenario: str,
        start_date: datetime,
        end_date: datetime,
        fish_type_ids: List[int],
        intensity: str = 'medium'
    ) -> Dict[str, Any]:
        """
        시뮬레이션 데이터 생성
        
        Args:
            scenario: 시나리오 이름
            start_date: 시작 날짜
            end_date: 종료 날짜
            fish_type_ids: 대상 어종 ID 리스트
            intensity: 강도 (low, medium, high)
            
        Returns:
            Dict: 생성된 시뮬레이션 데이터
        """
        try:
            if scenario not in self.scenarios:
                raise ValueError(f"지원하지 않는 시나리오: {scenario}")
            
            # 시나리오별 데이터 생성
            simulation_data = self.scenarios[scenario](
                start_date, end_date, fish_type_ids, intensity
            )
            
            return {
                'success': True,
                'scenario': scenario,
                'intensity': intensity,
                'start_date': start_date.isoformat(),
                'end_date': end_date.isoformat(),
                'fish_type_ids': fish_type_ids,
                'generated_logs': len(simulation_data.get('logs', [])),
                'data': simulation_data
            }
            
        except Exception as e:
            logger.error(f"시뮬레이션 데이터 생성 실패: {e}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def _generate_peak_season(
        self, 
        start_date: datetime, 
        end_date: datetime, 
        fish_type_ids: List[int], 
        intensity: str
    ) -> Dict[str, Any]:
        """성수기 시나리오: 수요 급증"""
        try:
            # 강도별 계수
            intensity_multipliers = {
                'low': 1.3,
                'medium': 1.6,
                'high': 2.0
            }
            multiplier = intensity_multipliers.get(intensity, 1.6)
            
            logs = []
            current_date = start_date
            
            while current_date <= end_date:
                for fish_type_id in fish_type_ids:
                    # 기본 수요량
                    base_demand = random.randint(10, 50)
                    
                    # 성수기 효과 (주말 더 강함)
                    if current_date.weekday() >= 5:  # 주말
                        demand_multiplier = multiplier * 1.2
                    else:
                        demand_multiplier = multiplier
                    
                    # 수요량 계산
                    demand = int(base_demand * demand_multiplier)
                    
                    # 출고 로그 생성
                    log = {
                        'fish_type_id': fish_type_id,
                        'type': 'out',
                        'change': -demand,
                        'before_quantity': random.randint(100, 200),
                        'after_quantity': random.randint(50, 150),
                        'unit': 'kg',
                        'unit_price': random.randint(5000, 15000),
                        'total_amount': demand * random.randint(5000, 15000),
                        'source_type': 'simulation',
                        'memo': f'성수기 시뮬레이션 - {intensity} 강도',
                        'created_at': current_date,
                        'is_synthetic': True,
                        'scenario': 'peak_season'
                    }
                    logs.append(log)
                
                current_date += timedelta(days=1)
            
            return {
                'logs': logs,
                'description': f'성수기 시뮬레이션 ({intensity} 강도) - 수요 {multiplier:.1f}배 증가'
            }
            
        except Exception as e:
            logger.error(f"성수기 시뮬레이션 생성 실패: {e}")
            return {'logs': [], 'description': '생성 실패'}
    
    def _generate_typhoon_delay(
        self, 
        start_date: datetime, 
        end_date: datetime, 
        fish_type_ids: List[int], 
        intensity: str
    ) -> Dict[str, Any]:
        """태풍 지연 시나리오: 입고 지연"""
        try:
            # 강도별 지연 정도
            delay_multipliers = {
                'low': 0.3,
                'medium': 0.6,
                'high': 0.8
            }
            delay_rate = delay_multipliers.get(intensity, 0.6)
            
            logs = []
            current_date = start_date
            
            while current_date <= end_date:
                for fish_type_id in fish_type_ids:
                    # 태풍 영향일 확률 (30%)
                    if random.random() < 0.3:
                        # 입고 지연
                        expected_in = random.randint(50, 100)
                        actual_in = int(expected_in * (1 - delay_rate))
                        
                        log = {
                            'fish_type_id': fish_type_id,
                            'type': 'in',
                            'change': actual_in,
                            'before_quantity': random.randint(20, 80),
                            'after_quantity': random.randint(70, 120),
                            'unit': 'kg',
                            'unit_price': random.randint(5000, 15000),
                            'total_amount': actual_in * random.randint(5000, 15000),
                            'source_type': 'simulation',
                            'memo': f'태풍 지연 시뮬레이션 - {intensity} 강도 (예상: {expected_in}, 실제: {actual_in})',
                            'created_at': current_date,
                            'is_synthetic': True,
                            'scenario': 'typhoon_delay'
                        }
                        logs.append(log)
                    else:
                        # 정상 입고
                        normal_in = random.randint(50, 100)
                        log = {
                            'fish_type_id': fish_type_id,
                            'type': 'in',
                            'change': normal_in,
                            'before_quantity': random.randint(20, 80),
                            'after_quantity': random.randint(70, 120),
                            'unit': 'kg',
                            'unit_price': random.randint(5000, 15000),
                            'total_amount': normal_in * random.randint(5000, 15000),
                            'source_type': 'simulation',
                            'memo': '정상 입고',
                            'created_at': current_date,
                            'is_synthetic': True,
                            'scenario': 'typhoon_delay'
                        }
                        logs.append(log)
                
                current_date += timedelta(days=1)
            
            return {
                'logs': logs,
                'description': f'태풍 지연 시뮬레이션 ({intensity} 강도) - 입고 {delay_rate*100:.0f}% 지연'
            }
            
        except Exception as e:
            logger.error(f"태풍 지연 시뮬레이션 생성 실패: {e}")
            return {'logs': [], 'description': '생성 실패'}
    
    def _generate_normal(
        self, 
        start_date: datetime, 
        end_date: datetime, 
        fish_type_ids: List[int], 
        intensity: str
    ) -> Dict[str, Any]:
        """정상 시나리오: 일반적인 패턴"""
        try:
            logs = []
            current_date = start_date
            
            while current_date <= end_date:
                for fish_type_id in fish_type_ids:
                    # 정상적인 입출고 패턴
                    if random.random() < 0.6:  # 60% 확률로 출고
                        out_quantity = random.randint(10, 40)
                        log = {
                            'fish_type_id': fish_type_id,
                            'type': 'out',
                            'change': -out_quantity,
                            'before_quantity': random.randint(100, 200),
                            'after_quantity': random.randint(60, 190),
                            'unit': 'kg',
                            'unit_price': random.randint(5000, 15000),
                            'total_amount': out_quantity * random.randint(5000, 15000),
                            'source_type': 'simulation',
                            'memo': '정상 출고',
                            'created_at': current_date,
                            'is_synthetic': True,
                            'scenario': 'normal'
                        }
                        logs.append(log)
                    
                    if random.random() < 0.3:  # 30% 확률로 입고
                        in_quantity = random.randint(30, 80)
                        log = {
                            'fish_type_id': fish_type_id,
                            'type': 'in',
                            'change': in_quantity,
                            'before_quantity': random.randint(20, 100),
                            'after_quantity': random.randint(50, 180),
                            'unit': 'kg',
                            'unit_price': random.randint(5000, 15000),
                            'total_amount': in_quantity * random.randint(5000, 15000),
                            'source_type': 'simulation',
                            'memo': '정상 입고',
                            'created_at': current_date,
                            'is_synthetic': True,
                            'scenario': 'normal'
                        }
                        logs.append(log)
                
                current_date += timedelta(days=1)
            
            return {
                'logs': logs,
                'description': '정상 패턴 시뮬레이션 - 일반적인 입출고 패턴'
            }
            
        except Exception as e:
            logger.error(f"정상 시뮬레이션 생성 실패: {e}")
            return {'logs': [], 'description': '생성 실패'}
    
    def get_available_scenarios(self) -> List[Dict[str, str]]:
        """사용 가능한 시나리오 목록 반환"""
        return [
            {
                'id': 'peak_season',
                'name': '성수기',
                'description': '수요 급증으로 인한 출고 증가'
            },
            {
                'id': 'typhoon_delay',
                'name': '태풍 지연',
                'description': '입고 지연으로 인한 재고 부족'
            },
            {
                'id': 'normal',
                'name': '정상 패턴',
                'description': '일반적인 입출고 패턴'
            }
        ]
    
    def get_intensity_options(self) -> List[Dict[str, str]]:
        """강도 옵션 반환"""
        return [
            {'id': 'low', 'name': '낮음', 'description': '약한 영향'},
            {'id': 'medium', 'name': '중간', 'description': '보통 영향'},
            {'id': 'high', 'name': '높음', 'description': '강한 영향'}
        ]
