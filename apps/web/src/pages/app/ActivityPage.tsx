import { Link } from "react-router-dom";

const blocks = [
  {
    id: "b1",
    title: "Ритм недели",
    meta: "4 сессии · ~40 мин",
    to: "/workouts",
    time: "сегодня",
  },
  {
    id: "b2",
    title: "С тренером",
    meta: "чек-ин и расписание",
    to: "/schedule",
    time: "скоро",
  },
  {
    id: "b3",
    title: "Материалы",
    meta: "статьи и программы",
    to: "/workouts",
    time: "лента",
  },
  {
    id: "b4",
    title: "Отметка посещения",
    meta: "QR / токен",
    to: "/checkin",
    time: "сейчас",
  },
];

export function ActivityPage() {
  return (
    <div className="uw-page uw-feed">
      <header className="uw-social-head">
        <h1 className="uw-h1">Активность</h1>
      </header>

      <ul className="uw-activity-feed">
        {blocks.map((b) => (
          <li key={b.id}>
            <Link to={b.to} className="uw-activity-row">
              <span className="uw-activity-ava">{b.title.slice(0, 1)}</span>
              <div>
                <strong>{b.title}</strong>
                <span className="uw-sub">{b.meta}</span>
              </div>
              <span className="uw-activity-time">{b.time}</span>
            </Link>
          </li>
        ))}
      </ul>

      <Link to="/workouts" className="uw-primary">
        Открыть материалы
      </Link>
    </div>
  );
}
