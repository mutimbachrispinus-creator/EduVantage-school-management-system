'use client';
import { useSchoolProfile } from '@/lib/school-profile';
import { useProfile } from '@/app/PortalShell';

export default function PrintHeader() {
  const { profile: ctxProfile } = useProfile() || {};
  const localProfile = useSchoolProfile();
  const profile = ctxProfile && Object.keys(ctxProfile).length > 0 ? ctxProfile : localProfile;

  if (!profile?.name) return null;

  return (
    <div className="print-header no-print-hide">
      <div className="ph-content">
        <div className="ph-logo-container">
          <img src={profile.logo || "/eduvantage-logo.png"} alt="School Logo" className="ph-logo" />
        </div>
        <div className="ph-details">
          <h1 className="ph-name">{profile.name || 'SCHOOL PORTAL'}</h1>
          {profile.motto && <div className="ph-motto">"{profile.motto}"</div>}
          <div className="ph-contacts">
            {profile.address && <span>📍 {profile.address}</span>}
            {profile.phone && <span>📞 {profile.phone}</span>}
            {profile.email && <span>✉️ {profile.email}</span>}
            {profile.website && <span>🌐 {profile.website}</span>}
          </div>
        </div>
      </div>
      <style jsx>{`
        .print-header {
          display: none;
          text-align: center;
          margin-bottom: 20px;
          border-bottom: 3px double #000;
          padding-bottom: 15px;
        }
        .ph-content {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 20px;
        }
        .ph-logo-container {
          width: 80px;
          height: 80px;
          flex-shrink: 0;
        }
        .ph-logo {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }
        .ph-details {
          text-align: center;
        }
        .ph-name {
          font-size: 28px;
          font-weight: 900;
          color: #000;
          margin: 0 0 5px 0;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        .ph-motto {
          font-size: 14px;
          font-style: italic;
          font-weight: 600;
          color: #333;
          margin-bottom: 8px;
        }
        .ph-contacts {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 10px 15px;
          font-size: 11px;
          color: #222;
        }
        
        @media print {
          .print-header {
            display: block !important;
          }
        }
      `}</style>
    </div>
  );
}
