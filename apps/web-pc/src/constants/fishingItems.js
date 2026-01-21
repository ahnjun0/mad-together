// 낚시 게임에서 낚을 수 있는 아이템 목록
// 서버에서 caughtItemIndex로 인덱스를 전달하면 해당 아이템 정보를 표시

export const FISHING_ITEMS = [
  {
    id: 0,
    name: '황금 물고기',
    emoji: '🐟',
    description: '반짝이는 황금빛 물고기!',
    rarity: 'legendary',
  },
  {
    id: 1,
    name: '거대 문어',
    emoji: '🐙',
    description: '다리가 8개나 되는 거대한 문어!',
    rarity: 'epic',
  },
  {
    id: 2,
    name: '보물 상자',
    emoji: '📦',
    description: '해적의 보물이 들어있을지도?',
    rarity: 'legendary',
  },
  {
    id: 3,
    name: '상어',
    emoji: '🦈',
    description: '무시무시한 상어를 낚았다!',
    rarity: 'epic',
  },
  {
    id: 4,
    name: '복어',
    emoji: '🐡',
    description: '빵빵하게 부풀어오른 복어!',
    rarity: 'rare',
  },
  {
    id: 5,
    name: '열대어',
    emoji: '🐠',
    description: '알록달록한 열대어!',
    rarity: 'common',
  },
  {
    id: 6,
    name: '고래',
    emoji: '🐋',
    description: '거대한 고래를 낚았다!',
    rarity: 'legendary',
  },
  {
    id: 7,
    name: '새우',
    emoji: '🦐',
    description: '통통한 새우!',
    rarity: 'common',
  },
  {
    id: 8,
    name: '게',
    emoji: '🦀',
    description: '집게발이 큰 게!',
    rarity: 'rare',
  },
  {
    id: 9,
    name: '인어',
    emoji: '🧜‍♀️',
    description: '신비로운 인어를 만났다!',
    rarity: 'legendary',
  },
];

// 희귀도별 색상
export const RARITY_COLORS = {
  common: 'text-gray-600',
  rare: 'text-blue-500',
  epic: 'text-purple-500',
  legendary: 'text-yellow-500',
};

export const RARITY_BG_COLORS = {
  common: 'bg-gray-100',
  rare: 'bg-blue-100',
  epic: 'bg-purple-100',
  legendary: 'bg-yellow-100',
};

// 아이템 인덱스로 아이템 정보 가져오기
export const getItemByIndex = (index) => {
  return FISHING_ITEMS[index] || FISHING_ITEMS[0];
};
