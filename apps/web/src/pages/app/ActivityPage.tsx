import { Link } from "react-router-dom";

const blocks = [
  {
    id: "b1",
    title: "Блок: ритм недели",
    meta: "4 сессии · ~40 мин",
    status: "available" as const,
    to: "/workouts",
  },
  {
    id: "b2",
    title: "Блок: с тренером",
    meta: "чек-ин и расписание",
    status: "available" as const,
    to: "/schedule",
  },
  {
    id: "b3",
    title: "Блок: материалы",
    meta: "статьи и программы",
    status: "available" as const,
    to: "/workouts",
  },
  {
    id: "b4",
    title: "Блок: отметка",
    meta: "QR / токен",
    status: "timed" as const,
    to: "/checkin",
  },
];

export function ActivityPage() {
  return (
    <div className="uw-page">
      <header className="uw-top">
        <div>
          <p className="uw-eyebrow">Практика</p>
          <h1 className="uw-h1">Блоки</h1>
        </div>
      </header>
      <p className="uw-sub" style={{ marginTop: -8 }}>
        Как учебные блоки: выберите набор и продолжайте с того места, где остановились.
      </p>

      <div className="uw-mode-row" role="group" aria-label="Режим">
        <button type="button" className="uw-mode is-on">
          Tutor
        </button>
        <button type="button" className="uw-mode">
          Timed
        </button>
      </div>

      <ul className="uw-blocks">
        {blocks.map((b) => (
          <li key={b.id}>
            <Link to={b.to} className="uw-block">
              <div>
                <strong>{b.title}</strong>
                <span className="uw-sub">{b.meta}</span>
              </div>
              <span className={`uw-pill ${b.status === "timed" ? "is-timed" : ""}`}>
                {b.status === "timed" ? "Timed" : "Start"}
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <Link to="/workouts" className="uw-primary">
        Продолжить практику
      </Link>
    </div>
  );
}
