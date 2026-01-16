import { useState, useEffect } from 'react';

/**
 * 모바일 가속도 센서(Accelerometer)를 제어하는 Custom Hook
 * 역할: DeviceMotion 이벤트를 리스닝하여 가속도(x,y,z)와 힘(power)을 계산
 */
export const useAccelSensor = () => {
  // [State] UI 렌더링 및 로직 처리를 위한 센서 데이터
  const [data, setData] = useState({ x: 0, y: 0, z: 0 });
  const [power, setPower] = useState(0);
  
  // [State] iOS 13+ 권한 상태 ('unknown' | 'granted' | 'denied')
  const [permission, setPermission] = useState('unknown');

  /**
   * [Core] 권한 요청 함수
   * iOS 13 이상에서는 사용자 인터랙션(클릭)이 있어야만 센서 접근이 가능함.
   * UI의 '권한 허용 버튼'과 연결됨.
   */
  const requestPermission = async () => {
    // 안드로이드 또는 구형 iOS는 권한 요청 API가 없으므로 바로 허용 처리
    if (typeof DeviceMotionEvent.requestPermission !== 'function') {
      setPermission('granted');
      return;
    }

    try {
      // iOS 전용 권한 요청
      const response = await DeviceMotionEvent.requestPermission();
      setPermission(response);
    } catch (error) {
      console.error('Sensor permission failed:', error);
      setPermission('denied');
    }
  };

  /**
   * [Core] 센서 이벤트 리스너 등록/해제
   * permission 상태가 'granted'일 때만 작동함.
   */
  useEffect(() => {
    if (permission !== 'granted') return;

    const handleMotion = (event) => {
      // 가속도 센서 값 추출 (중력 가속도 포함: 가만히 있어도 약 9.8 측정됨)
      // Connection: 이 값들은 추후 정밀한 모션 인식(방향 등)에 사용될 수 있음
      const { x, y, z } = event.accelerationIncludingGravity || { x: 0, y: 0, z: 0 };
      
      setData({ x, y, z });

      // [Logic] 휘두르는 힘(Power) 계산
      // 피타고라스 정리를 이용한 벡터의 크기 계산 (방향 무관, 절대적인 힘의 크기)
      // Connection: 이 값이 Threshold를 넘으면 'Casting' 판정을 내리고 소켓 전송 트리거가 됨
      const totalForce = Math.sqrt(x * x + y * y + z * z);
      setPower(totalForce);
    };

    window.addEventListener('devicemotion', handleMotion);

    // Cleanup: 컴포넌트 언마운트 시 리스너 제거 (메모리 누수 방지)
    return () => {
      window.removeEventListener('devicemotion', handleMotion);
    };
  }, [permission]);

  return { data, power, permission, requestPermission };
};