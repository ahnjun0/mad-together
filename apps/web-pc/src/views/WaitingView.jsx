// PC (Host) only view - WaitingView with QR code and team lists
export default function WaitingView() {
  return (
    <div className="w-full h-full flex items-center justify-center p-8">
      <div className="w-full max-w-6xl grid grid-cols-3 gap-6">
        {/* QR Code Center */}
        <div className="bg-white/90 rounded-[20px] border-2 border-blue-900 p-8 flex flex-col items-center justify-center">
          <h2 className="text-xl font-bold text-outline text-white mb-4">QR 코드</h2>
          <div className="w-64 h-64 bg-gray-200 rounded-lg flex items-center justify-center border-4 border-gray-400">
            <span className="text-gray-500 text-sm">QR Code</span>
          </div>
          <p className="mt-4 text-sm text-gray-600">Code: 763251</p>
        </div>

        {/* Team A List */}
        <div className="bg-white/90 rounded-[20px] border-2 border-blue-900 p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center">
              <span className="text-white font-bold">A</span>
            </div>
            <h2 className="text-xl font-bold text-outline text-white">Team A</h2>
          </div>
          <div className="space-y-2">
            <div className="p-3 bg-orange-100 rounded-lg border border-orange-300">
              <p className="font-semibold text-gray-800">홍길동</p>
            </div>
            <div className="p-3 bg-orange-100 rounded-lg border border-orange-300">
              <p className="font-semibold text-gray-800">양서영</p>
            </div>
          </div>
        </div>

        {/* Team B List */}
        <div className="bg-white/90 rounded-[20px] border-2 border-blue-900 p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-full bg-cyan-500 flex items-center justify-center">
              <span className="text-white font-bold">B</span>
            </div>
            <h2 className="text-xl font-bold text-outline text-white">Team B</h2>
          </div>
          <div className="space-y-2">
            <div className="p-3 bg-cyan-100 rounded-lg border border-cyan-300">
              <p className="font-semibold text-gray-800">김사랑</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
