import './Cargo.css';
import type { EjectState } from '../PowerHUD';

export default function Cargo({
  ejectState,
  setEjectState,
  triggerEject,
  reduceCargoItem,
}: {
  ejectState: EjectState | null;
  setEjectState: React.Dispatch<React.SetStateAction<EjectState | null>>;
  triggerEject: (amount: number) => void;
  reduceCargoItem: (name: string, amount: number) => void;
}) {
  if (!ejectState) return null;

  return (
    <div className="power-dialog">
      {ejectState.step === 'confirm' && (
        <>
          <p className="power-dialog-title">CARGO MANAGEMENT</p>
          <p className="power-dialog-body">
            Eject {ejectState.item.quantity}x {ejectState.item.name.toUpperCase()} into space?
          </p>
          <div className="power-dialog-actions">
            <button
              type="button"
              className="power-btn power-btn-cancel"
              onClick={() => setEjectState(null)}
            >
              NO
            </button>
            <button
              type="button"
              className="power-btn power-btn-danger"
              onClick={() => setEjectState({ ...ejectState, step: 'quantity' })}
            >
              YES
            </button>
          </div>
        </>
      )}

      {ejectState.step === 'quantity' && (
        <>
          <p className="power-dialog-title">SELECT QUANTITY TO EJECT</p>
          <p className="power-dialog-amount">
            {ejectState.amount}x {ejectState.item.name.toUpperCase()}
          </p>
          <input
            className="power-dialog-range"
            type="range"
            min={1}
            max={ejectState.item.quantity}
            value={ejectState.amount}
            onChange={(e) => setEjectState({ ...ejectState, amount: parseInt(e.target.value) })}
          />
          <div className="power-dialog-actions">
            <button
              type="button"
              className="power-btn power-btn-cancel"
              onClick={() => setEjectState(null)}
            >
              CANCEL
            </button>
            <button
              type="button"
              className="power-btn power-btn-danger"
              onClick={() => {
                triggerEject(ejectState.amount);
                reduceCargoItem(ejectState.item.name, ejectState.amount);
                setEjectState(null);
              }}
            >
              CONFIRM EJECT
            </button>
          </div>
        </>
      )}
    </div>
  );
}
