import { useState } from 'react';
import { useMobileStore } from '../store/useMobileStore';
import { useMobileSocket } from '../hooks/useMobileSocket';

const SERVER_URL = import.meta.env.VITE_API_URL || 'https://madcamp.cloud';

// 허용되는 이미지 형식
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/heic', 'image/heif'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export default function ProfileSetupView() {
  const { nickname, profileImage, token, setNickname } = useMobileStore();
  const { joinRoom } = useMobileSocket();

  const [inputNickname, setInputNickname] = useState(nickname || '');
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(profileImage || null); // 구글 프로필 이미지를 기본값으로 사용
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [imageError, setImageError] = useState(false);

  const getImageUrl = (url) => {
    if (!url) return null;
    if (url.startsWith('data:') || url.startsWith('blob:')) return url;
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    return `${SERVER_URL}${url}`;
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // 파일 크기 검증
    if (file.size > MAX_FILE_SIZE) {
      setError('이미지 크기는 10MB 이하여야 합니다.');
      return;
    }

    // 파일 형식 검증 (MIME type 또는 확장자)
    const isValidType = ALLOWED_TYPES.includes(file.type) ||
      /\.(jpg|jpeg|png|gif|webp|heic|heif)$/i.test(file.name);

    if (!isValidType) {
      setError('지원되지 않는 이미지 형식입니다. (JPG, PNG, GIF, WebP 지원)');
      return;
    }

    setError('');
    setImageError(false);
    setSelectedFile(file);

    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result);
    };
    reader.onerror = () => {
      setError('이미지를 읽을 수 없습니다. 다른 이미지를 선택해주세요.');
      setSelectedFile(null);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!inputNickname.trim()) {
      setError('닉네임을 입력해주세요.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // 1. Upload Profile
      const formData = new FormData();
      formData.append('nickname', inputNickname);
      if (selectedFile) {
        formData.append('file', selectedFile);
      }

      const response = await fetch(`${SERVER_URL}/api/auth/profile`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData,
      });

      if (!response.ok) {
        // 서버에서 반환하는 에러 메시지 처리
        let errorMessage = '프로필 설정에 실패했습니다.';
        try {
          const errData = await response.json();
          if (errData.message) {
            errorMessage = errData.message;
          }
        } catch {
          // JSON 파싱 실패 시 상태 코드 기반 메시지
          if (response.status === 413) {
            errorMessage = '이미지 크기가 너무 큽니다. 10MB 이하의 이미지를 선택해주세요.';
          } else if (response.status === 400) {
            errorMessage = '지원되지 않는 이미지 형식입니다.';
          }
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      setNickname(data.nickname); // Store nickname update

      // 2. Join Room
      const targetCode = useMobileStore.getState().pendingRoomCode;
      if (targetCode) {
          // 서버에서 반환된 profileImage를 joinRoom에 전달 (null 아님)
          await joinRoom(targetCode, data.nickname, data.profileImage);
      }

    } catch (err) {
      console.error(err);
      setError(err.message || '프로필 설정에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full h-full flex items-center justify-center p-6 bg-slate-900">
      {/* 업로드 중 풀스크린 오버레이 모달 */}
      {loading && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-slate-800 border border-white/20 p-8 rounded-2xl text-center shadow-2xl">
            <div className="w-12 h-12 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-white font-medium text-lg">프로필 저장 중...</p>
            <p className="text-blue-200 text-sm mt-2">잠시만 기다려주세요</p>
          </div>
        </div>
      )}
      <div className="w-full max-sm bg-white/10 backdrop-blur-md border border-white/20 p-8 rounded-2xl shadow-xl">
        <h1 className="text-2xl font-bold text-white text-center mb-6">프로필 설정</h1>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Image Upload */}
          <div className="flex flex-col items-center">
            <div className="w-24 h-24 rounded-full bg-slate-700 border-2 border-white/30 overflow-hidden mb-4 relative">
              {previewUrl && !imageError ? (
                <img
                  src={getImageUrl(previewUrl)}
                  alt="Preview"
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                  onError={() => {
                    setImageError(true);
                    setError('이미지를 표시할 수 없습니다. 다른 이미지를 선택해주세요.');
                  }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-4xl">👤</div>
              )}
              <input 
                type="file" 
                accept="image/*" 
                onChange={handleFileChange}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
            </div>
            <p className="text-blue-200 text-sm">사진을 눌러 변경하세요</p>
          </div>

          {/* Nickname Input */}
          <div className="space-y-2">
            <label className="text-blue-200 text-sm font-bold ml-1">닉네임</label>
            <input
              type="text"
              value={inputNickname}
              onChange={(e) => setInputNickname(e.target.value)}
              className="w-full px-5 py-3 bg-slate-800/50 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
              placeholder="닉네임을 입력하세요"
            />
          </div>

          {error && <p className="text-red-400 text-sm text-center">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-all disabled:opacity-50"
          >
            {loading ? '저장 중...' : '설정 완료 및 입장'}
          </button>
        </form>
      </div>
    </div>
  );
}
