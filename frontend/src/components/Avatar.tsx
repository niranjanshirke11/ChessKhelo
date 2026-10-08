interface AvatarProps {
  avatar: string;
  username?: string;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

export default function Avatar({ avatar, username = '', size = 32, className = '', style = {} }: AvatarProps) {
  const isUrl = avatar?.startsWith('http') || avatar?.startsWith('https');
  if (isUrl) {
    return (
      <img
        src={avatar}
        alt={username}
        className={className}
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          objectFit: 'cover',
          display: 'block',
          ...style
        }}
        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
      />
    );
  }
  return (
    <div className={className} style={{ width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center', ...style }}>
      {avatar || '♟'}
    </div>
  );
}
