// "오늘 어떤 이야기를 하고 싶습니까?" 선택지

export interface TopicOption {
  id: string;
  label: string;
  hint: string;
}

export const TOPIC_OPTIONS: TopicOption[] = [
  { id: 'work', label: '일 때문에 힘들어요', hint: '인정, 의미, 번아웃' },
  { id: 'relationships', label: '인간관계가 힘들어요', hint: '갈등, 거리, 외로움' },
  { id: 'direction', label: '앞으로 어떻게 살아야 할지 모르겠어요', hint: '진로, 방향, 선택' },
  { id: 'lethargy', label: '요즘 무기력해요', hint: '의욕, 아침, 반복' },
  { id: 'love', label: '사랑에 대해 이야기하고 싶어요', hint: '설렘, 이별, 그리움' },
  { id: 'free', label: '그냥 이야기하고 싶어요', hint: '주제 없이' },
];
