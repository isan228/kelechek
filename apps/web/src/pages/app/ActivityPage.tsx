import { Link } from "react-router-dom";

const blocks = [
  {
    id: "b1",
    title: "Ритм недели",
    meta: "4 сессии · ~40 мин",
    status: "open" as const,
    to: "/workouts",
  },
  {
    id: "b2",
    title: "С тренером",
    meta: "чек-ин и расписание",
    status: "open" as const,
    to: "/schedule",
  },
  {
    id: "b3",
    title: "Материалы",
    meta: "статьи и программы",
    status: "open" as const,
    to: "/workouts",
  },
  {
    id: "b4",
    title: "Отметка посещения",
    meta: "QR / токен",
    status: "action" as const,
    to: "/checkin",
  },
];

export function ActivityPage() {
  return (
    <div className="uw-page">
      <header className="uw-top">
        <div>
          <p className="uw-eyebrow">Операции</p>
          <h1 className="uw-h1">Активность</h1>
        </div>
      </header>
      <p className="uw-sub" style={{ marginTop: -8 }}>
        Тренировки, расписание и отметки — всё для серии и накопления.
      </p>

      <ul className="uw-blocks">
        {blocks.map((b) => (
          <li key={b.id}>
            <Link to={b.to} className="uw-block">
              <div>
                <strong>{b.title}</strong>
                <span className="uw-sub">{b.meta}</span>
              </div>
              <span className={`uw-pill ${b.status === "action" ? "is-timed" : ""}`}>
                {b.status === "action" ? "Отметить" : "Открыть"}
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <Link to="/workouts" className="uw-primary">
        Перейти к материалам
      </Link>
    </div>
  );
}
