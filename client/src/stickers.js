// 贴纸数据定义

export const STICKER_CATEGORIES = {
  basic: {
    name: '基础',
    description: '经典 Emoji 贴纸'
  },
  emotions: {
    name: '表情',
    description: '表达情绪和感受'
  },
  animals: {
    name: '动物',
    description: '可爱的动物贴纸'
  },
  food: {
    name: '食物',
    description: '美食饮料'
  },
  items: {
    name: '物品',
    description: '日常生活物品'
  },
  marks: {
    name: '标记',
    description: '标记和符号'
  }
};

export const STICKERS = {
  // 基础类
  basic: [],
  // 表情类
  emotions: [
    '😀', '😂', '🤣', '😊', '😍', '🥰', '😎', '🥳',
    '🤩', '😇', '😈', '👻', '💀', '🤡', '👽', '🤔',
    '😱', '😈', '🤡', '💩', '👻', '💀', '🤖', '👾'
  ],
  // 动物类
  animals: [
    '🐱', '🐶', '🐼', '🦁', '🐰', '🦊', '🐸', '🐵',
    '🦉', '🦄', '🐲', '🦖', '🐢', '🦀', '🐙', '🦋',
    '🐌', '🐞', '🐜', '🐝', '🦋', '🐛', '🐢', '🦎'
  ],
  // 食物类
  food: [
    '🍔', '🍕', '🍜', '🍰', '🍦', '🎂', '☕', '🍵',
    '🍷', '🥤', '🍎', '🥕', '🍌', '🍇', '🍓', '🍒',
    '🍩', '🍪', '🥨', '🥐', '🥞', '🧇', '🍚', '🍜'
  ],
  // 物品类
  items: [
    '⭐', '💎', '🎁', '🎮', '🎸', '🏀', '🎾', '🚀',
    '🎈', '🎂', '🌈', '🌸', '🌲', '🏠', '🏢', '🏰',
    '💻', '📱', '🎧', '📷', '📸', '💡', '🔌', '📡'
  ],
  // 标记类
  marks: [
    '❌', '✅', '⭕', '🔴', '🟢', '🔵', '🌟', '🔥',
    '💯', '⭐', '⚠️', '📍', '🏁', '🏆', '💬', '📌',
    '🏳️', '🏴', '🏵️', '🏷️', '🔖', '📎', '📍', '✂️'
  ]
};

// 获取所有贴纸
export const getAllStickers = () => {
  const all = {};
  Object.keys(STICKERS).forEach(category => {
    all[category] = STICKERS[category];
  });
  return all;
};

// 根据分类获取贴纸
export const getStickersByCategory = (category) => {
  return STICKERS[category] || [];
};

// 获取推荐贴纸（根据当前主题）
export const getRecommendedStickers = (currentWord) => {
  if (!currentWord) return [];

  const word = currentWord.toLowerCase();
  const recommendations = [];

  if (word.includes('生日') || word.includes('蛋糕') || word.includes('蜡烛')) {
    recommendations.push('🎂', '🕯️', '🎉', '🎈', '✨');
  } else if (word.includes('动物') || word.includes('猫') || word.includes('狗')) {
    recommendations.push('🌿', '🌸', '🏠', '🌳', '🌲');
  } else if (word.includes('太空') || word.includes('火箭') || word.includes('星')) {
    recommendations.push('🚀', '⭐', '🌙', '👽', '🌌');
  } else if (word.includes('海') || word.includes('水') || word.includes('鱼')) {
    recommendations.push('🌊', '🏖️', '🦀', '🐚', '🐠');
  } else if (word.includes('山') || word.includes('树') || word.includes('花')) {
    recommendations.push('🌲', '🌸', '🌻', '☀️', '🌈');
  }

  return recommendations;
};
