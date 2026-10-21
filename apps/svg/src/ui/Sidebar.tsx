/* Scene list: numbered entries, the current one marked with the accent. */
interface Props {
  items: readonly { id: string; name: string }[];
  current: number;
  onSelect(index: number): void;
}

export function Sidebar({ items, current, onSelect }: Props) {
  return (
    <nav className="nav" aria-label="Các cảnh">
      {items.map((s, i) => (
        <button key={s.id} type="button" aria-current={i === current} onClick={() => onSelect(i)}>
          <span className="n">{String(i + 1).padStart(2, '0')}</span>
          <span>{s.name}</span>
        </button>
      ))}
    </nav>
  );
}
