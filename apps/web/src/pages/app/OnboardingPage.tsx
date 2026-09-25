import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { setOnboardingGoal, type OnboardingGoal } from "../app/investData";

const options: { id: OnboardingGoal; title: string; lead: string }[] = [
  {
    id: "invest",
    title: "Инвестиции",
    lead: "Портфель в атлетов, команды и события с прозрачной аналитикой.",
  },
  {
    id: "activity",
    title: "Активность",
    lead: "Тренировки, челленджи и прогресс — ритм, который видно.",
  },
  {
    id: "both",
    title: "Оба направления",
    lead: "Свяжите личные результаты с инвестиционным прогрессом.",
  },
];

export function OnboardingPage() {
  const navigate = useNavigate();
  const [selected, setSelected] = useState<OnboardingGoal>("both");

  function continueNext() {
    setOnboardingGoal(selected);
    navigate("/app", { replace: true });
  }

  return (
    <div className="sx-page sx-onboarding">
      <p className="sx-kicker">Старт</p>
      <h1 className="sx-title">Что для вас важнее?</h1>
      <p className="sx-lead">
        Выберите фокус — интерфейс подстроится. Можно изменить позже в профиле.
      </p>

      <div className="sx-choice-list" role="radiogroup" aria-label="Цель">
        {options.map((opt) => (
          <button
            key={opt.id}
            type="button"
            role="radio"
            aria-checked={selected === opt.id}
            className={`sx-choice ${selected === opt.id ? "is-selected" : ""}`}
            onClick={() => setSelected(opt.id)}
          >
            <span className="sx-choice-check" aria-hidden />
            <span>
              <strong>{opt.title}</strong>
              <span className="sx-muted">{opt.lead}</span>
            </span>
          </button>
        ))}
      </div>

      <button type="button" className="sx-cta" onClick={continueNext}>
        Продолжить
      </button>
    </div>
  );
}
