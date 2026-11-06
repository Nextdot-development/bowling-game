import Image from "next/image";
import { LEAFLET } from "@/data/leaflet";
import { BRAND_ASSETS } from "@/lib/brandAssets";

/**
 * The MIQNAF® leaflet, rebuilt as a page so its text stays sharp at any size.
 * It lays itself out by its own width (container queries, globals.css):
 * one column on a phone, landscape on a wide panel (the hero and the numbers
 * on the left, the four points on the right, the small print across the foot).
 */
export function MiqnafLeaflet() {
  const logo = BRAND_ASSETS.productLogo;
  const [unnumbered, ...references] = LEAFLET.references;
  return (
    <article className="leaflet" aria-label="MIQNAF® leaflet">
      <div className="leaflet-main">
        <div className="leaflet-left">
          <header className="leaflet-hero">
            <Image src={LEAFLET.hero.src} alt="" width={LEAFLET.hero.width} height={LEAFLET.hero.height} className="leaflet-hero-art" draggable={false} priority />
            <div className="leaflet-hero-text">
              <h3 className="leaflet-headline">
                {LEAFLET.headline.map((line) => (
                  <span key={line}>{line} </span>
                ))}
              </h3>
              <Image src={logo.src} alt={`MIQNAF® ${logo.alt}`} width={logo.width} height={logo.height} className="leaflet-logo" draggable={false} priority />
            </div>
          </header>

          <p className="leaflet-tagline">
            <span>{LEAFLET.tagline}</span>
          </p>
          <p className="leaflet-intro">{LEAFLET.intro}</p>

          <ul className="leaflet-stats">
            {LEAFLET.stats.map((s) => (
              <li key={s.value + s.unit}>
                <div className="leaflet-stat-head">
                  <Image src={s.icon} alt="" width={64} height={64} className="leaflet-stat-icon" draggable={false} />
                  <span className="leaflet-stat-value">
                    {s.value}
                    <span className="leaflet-stat-unit">{s.unit}</span>
                  </span>
                </div>
                <p className="leaflet-stat-text">
                  {s.text}
                  <sup>{s.refs}</sup>
                </p>
              </li>
            ))}
          </ul>
        </div>

        <ul className="leaflet-points">
          {LEAFLET.points.map((p) => (
            <li key={p.icon}>
              <Image src={p.icon} alt="" width={184} height={184} className="leaflet-point-icon" draggable={false} />
              <p className="leaflet-point-text">
                {p.text}
                <sup>{p.refs}</sup>
              </p>
            </li>
          ))}
        </ul>
      </div>

      <footer className="leaflet-foot">
        <div className="leaflet-refs">
          <p>
            <strong>References:</strong> {unnumbered}
          </p>
          <ol>
            {references.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ol>
        </div>
        <div className="leaflet-disclaimer">
          <p>{LEAFLET.disclaimer}</p>
          <p className="leaflet-restriction">{LEAFLET.restriction}</p>
        </div>
        <div className="leaflet-contact">
          <Image src={LEAFLET.company.src} alt={LEAFLET.company.alt} width={LEAFLET.company.width} height={LEAFLET.company.height} className="leaflet-company" draggable={false} />
          <p>{LEAFLET.address}</p>
          <div className="leaflet-pv">
            <div>
              <p className="font-semibold">{LEAFLET.pharmacovigilance.heading}</p>
              <p>Email: {LEAFLET.pharmacovigilance.email}</p>
              <p>Toll-Free ADR Reporting Number: {LEAFLET.pharmacovigilance.phone}</p>
            </div>
            <Image src={LEAFLET.qr.src} alt={LEAFLET.qr.alt} width={LEAFLET.qr.width} height={LEAFLET.qr.height} className="leaflet-qr" draggable={false} />
          </div>
        </div>
      </footer>
    </article>
  );
}
