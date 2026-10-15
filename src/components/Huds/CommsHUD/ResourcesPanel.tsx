import { listPartnerResources } from '../../../context/DockablePartnerStore';
import TransferRow from '../DockTransferHUD/TransferRow';

interface ResourcesPanelProps {
  partnerId: string;
}

export default function JournalPanel({ partnerId }: ResourcesPanelProps) {
  const kinds = listPartnerResources(partnerId);
  return (
    <div className="dock-station-panel__transfers">
      {kinds.length > 0 ? (
        <>
          {kinds.map((kind) => (
            <TransferRow key={kind} partnerId={partnerId} kind={kind} />
          ))}
        </>
      ) : null}
    </div>
  );
}
