// Fixed-width incoming-hail slot shown at the right of a contact row.
// Always occupies the same width so rows stay aligned whether or not a hail is live.

const ROW_HAIL_WAVE_BARS = 7;

export default function RowHailSlot({
  label,
  incoming,
  onAnswer,
}: {
  label: string;
  incoming: boolean;
  onAnswer: () => void;
}) {
  return (
    <span className="comms-row-hail">
      {incoming && (
        <button
          type="button"
          className="comms-row-hail-btn"
          onClick={(e) => {
            e.stopPropagation();
            onAnswer();
          }}
          title={`Answer incoming hail from ${label}`}
          aria-label={`Incoming hail from ${label} — click to answer`}
        >
          <span className="comms-row-hail-wave" aria-hidden>
            {Array.from({ length: ROW_HAIL_WAVE_BARS }, (_, i) => (
              <span
                key={i}
                className="comms-row-hail-bar"
                style={{ animationDelay: `${i * 0.07}s` }}
              />
            ))}
          </span>
          <span className="comms-row-hail-label">INCOMING HAIL</span>
        </button>
      )}
    </span>
  );
}
