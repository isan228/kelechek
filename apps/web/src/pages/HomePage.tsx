import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import { useSiteCopy } from "../content/SiteCopyProvider";

export function HomePage() {
  const { s, photo } = useSiteCopy();
  const { user } = useAuth();
  const startTo = user ? "/memberships" : "/login";

  return (
    <>
      <section className="hero">
        <div className="hero-media">
          <img src={photo("hero")} alt="" />
        </div>
        <img className="hero-ornament" src="/ornament.svg" alt="" />
        <div className="hero-inner">
          <p className="kicker">{s("landing.kicker")}</p>
          <h1>{s("landing.title")}</h1>
          <p className="lead">{s("landing.lead")}</p>
          <div className="cta-row">
            <Link to={startTo}>
              <button type="button">{s("landing.ctaStart")}</button>
            </Link>
            <Link to="/about">
              <button className="ghost" type="button">
                {s("landing.ctaAbout")}
              </button>
            </Link>
          </div>
        </div>
      </section>
      <div className="wrap">
        <div className="stats">
          <div className="stat">
            <b>{s("landing.statValue1")}</b>
            <span>{s("landing.stat1")}</span>
          </div>
          <div className="stat">
            <b>
              {s("landing.statValue2")} {s("landing.days")}
            </b>
            <span>{s("landing.stat2")}</span>
          </div>
          <div className="stat">
            <b>
              {s("landing.statValue3")} {s("landing.months")}
            </b>
            <span>{s("landing.stat3")}</span>
          </div>
        </div>
      </div>

      <section className="section">
        <div className="wrap">
          <div className="section-head">
            <p className="kicker">{s("landing.pathKicker")}</p>
            <h2>{s("landing.pathTitle")}</h2>
          </div>
          <div className="path">
            {[1, 2, 3, 4].map((n) => (
              <article className="path-step" key={n}>
                <em>0{n}</em>
                <h3>{s(`landing.step${n}t`)}</h3>
                <p className="muted">{s(`landing.step${n}`)}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="wrap split">
          <div>
            <p className="kicker">{s("landing.whyKicker")}</p>
            <h2>{s("landing.whyTitle")}</h2>
            <p className="lead">{s("landing.whyLead")}</p>
            <div className="cta-row">
              <Link to="/workouts">
                <button type="button">{s("content.title")}</button>
              </Link>
            </div>
          </div>
          <img src={photo("movement")} alt="" />
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <div className="grid two">
            <article className="card photo">
              <img src={photo("goals")} alt="" />
              <div className="pad">
                <span className="badge">{s("landing.card1b")}</span>
                <h3>{s("landing.card1t")}</h3>
                <p className="muted">{s("landing.card1")}</p>
              </div>
            </article>
            <article className="card photo">
              <img src={photo("discipline")} alt="" />
              <div className="pad">
                <span className="badge">{s("landing.card2b")}</span>
                <h3>{s("landing.card2t")}</h3>
                <p className="muted">{s("landing.card2")}</p>
              </div>
            </article>
          </div>
        </div>
      </section>
    </>
  );
}
