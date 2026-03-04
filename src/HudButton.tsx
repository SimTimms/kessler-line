export const HudButton = ({
  isActive,
  onClickEvent,
  title,
}: {
  isActive: boolean;
  onClickEvent: () => void;
  title: string;
}) => (
  <button
    onClick={() => {
      onClickEvent();
    }}
    style={{
      padding: '6px 14px',
      background: isActive ? 'rgba(0,200,255,0.05)' : 'rgba(60,60,60,0.1)',
      color: isActive ? '#00cfff' : '#888',
      borderRadius: 0,
      cursor: 'pointer',
      userSelect: 'none',
      outline: 'none',
      width: '100px',
    }}
  >
    {title}
  </button>
);
