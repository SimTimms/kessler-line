import { DOCK_ROLE_LABELS, type DockCharacterRole } from '../../config/dockConfig';

export interface DossierData {
  name: string;
  age?: number;
  birthplace?: string;
  company?: string;
  role: DockCharacterRole;
  bio?: string;
}

export default function ContactDossier({ data }: { data: DossierData }) {
  return (
    <div className="comms-chat-dossier">
      <div className="comms-dossier-row">
        <span className="comms-dossier-key">NAME</span>
        <span className="comms-dossier-val">{data.name}</span>
      </div>
      <div className="comms-dossier-row">
        <span className="comms-dossier-key">AGE</span>
        <span className="comms-dossier-val">{data.age}</span>
      </div>
      <div className="comms-dossier-row">
        <span className="comms-dossier-key">BORN</span>
        <span className="comms-dossier-val">{data.birthplace}</span>
      </div>
      <div className="comms-dossier-row">
        <span className="comms-dossier-key">EMPLOYER</span>
        <span className="comms-dossier-val">{data.company ?? 'Independent'}</span>
      </div>
      <div className="comms-dossier-row">
        <span className="comms-dossier-key">ROLE</span>
        <span className="comms-dossier-val">{DOCK_ROLE_LABELS[data.role]}</span>
      </div>
      {data.bio && <p className="comms-dossier-bio">{data.bio}</p>}
    </div>
  );
}
