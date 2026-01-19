import { useState } from 'react';
import { useMobileStore } from '../store/useMobileStore';
import { useMobileSocket } from '../hooks/useMobileSocket';

const SERVER_URL = import.meta.env.VITE_API_URL || 'https://madcamp.cloud';

export default function ProfileSetupView() {
  const { nickname, profileImage, token, setNickname } = useMobileStore();
  const { joinRoom } = useMobileSocket();
  
  const [inputNickname, setInputNickname] = useState(nickname || '');
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(profileImage || null); // 구글 프로필 이미지를 기본값으로 사용
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result);
      };
      reader.readAsDataURL(file);
    }
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
        throw new Error('Failed to update profile');
      }

      const data = await response.json();
      setNickname(data.nickname); // Store nickname update

      // 2. Join Room
      const targetCode = useMobileStore.getState().pendingRoomCode;
      if (targetCode) {
          await joinRoom(targetCode, data.nickname, null);
      }

    } catch (err) {
      console.error(err);
      setError('프로필 설정에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full h-full flex items-center justify-center p-6 bg-slate-900">
      <div className="w-full max-sm bg-white/10 backdrop-blur-md border border-white/20 p-8 rounded-2xl shadow-xl">
        <h1 className="text-2xl font-bold text-white text-center mb-6">프로필 설정</h1>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Image Upload */}
          <div className="flex flex-col items-center">
            <div className="w-24 h-24 rounded-full bg-slate-700 border-2 border-white/30 overflow-hidden mb-4 relative">
              {previewUrl ? (
                <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
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
