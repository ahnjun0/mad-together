import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import { useAccelSensor } from './hooks/useAccelSensor';

function App() {
  // Hook 연결: 센서 데이터 및 권한 제어 함수 가져오기
  const { data, power, permission, requestPermission } = useAccelSensor();

  // [Config] 캐스팅 판정 역치값 (Threshold)
  // 중력가속도(약 9.8)가 포함된 값이므로, 30 이상은 되어야 의도적으로 흔든 것으로 간주
  // Connection: 추후 이 변수는 별도 상수 파일(constants.js)로 분리하여 관리 권장
  const THRESHOLD = 30; 
  const isShaking = power > THRESHOLD;

  return (
    <div className={`flex flex-col items-center justify-center h-screen p-4 transition-colors duration-200 
      ${isShaking ? 'bg-red-600' : 'bg-gray-900'}`}>
      
      <h1 className="text-3xl font-bold text-white mb-8">Fishing Controller</h1>

      {/* Case 1: 권한이 없을 경우 (초기 진입 시) */}
      {permission !== 'granted' ? (
        <div className="text-center space-y-4">
          <p className="text-gray-400">게임을 위해 센서 권한이 필요합니다.</p>
          {/* Connection: 클릭 시 Hook 내부의 requestPermission 함수 실행 */}
          <button 
            onClick={requestPermission}
            className="px-6 py-3 bg-blue-500 text-white font-bold rounded-lg shadow-lg active:scale-95 transition-transform"
          >
            센서 권한 허용
          </button>
        </div>
      ) : (
        /* Case 2: 권한 획득 후 (HUD 표시) */
        <div className="w-full max-w-xs space-y-6">
          
          {/* Main Display: 계산된 Power 값 시각화 */}
          <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700">
            <h2 className="text-gray-400 text-sm font-medium mb-2 uppercase tracking-wider">Total Power</h2>
            <div className="flex items-end gap-2">
              <span className={`text-5xl font-mono font-bold ${isShaking ? 'text-red-400' : 'text-green-400'}`}>
                {power.toFixed(1)}
              </span>
              <span className="text-gray-500 mb-2">m/s²</span>
            </div>
            {/* Visual Feedback: 게이지 바 */}
            <div className="mt-4 h-4 bg-gray-700 rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all duration-75 ${isShaking ? 'bg-red-500' : 'bg-blue-500'}`}
                style={{ width: `${Math.min((power / 50) * 100, 100)}%` }}
              />
            </div>
          </div>

          {/* Debug Info: Raw Data 확인용 (x, y, z) */}
          {/* Connection: 센서가 정상 작동하는지 축별로 확인하기 위함 */}
          <div className="grid grid-cols-3 gap-4 text-center">
            {['x', 'y', 'z'].map((axis) => (
              <div key={axis} className="bg-gray-800 p-3 rounded-lg">
                <div className="text-gray-500 text-xs uppercase mb-1">{axis}</div>
                <div className="font-mono text-white text-sm">
                  {data[axis] ? data[axis].toFixed(1) : '0.0'}
                </div>
              </div>
            ))}
          </div>

          <p className="text-center text-gray-500 text-sm mt-8">
            {isShaking ? "CASTING DETECTED" : "Swing your phone"}
          </p>
        </div>
      )}
    </div>
  );
}

export default App;