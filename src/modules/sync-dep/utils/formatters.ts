export const getInitials = (name: string) => {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
};

export const truncateText = (text: string, length: number = 50) => {
  if (text.length <= length) return text;
  return text.substring(0, length) + '...';
};
