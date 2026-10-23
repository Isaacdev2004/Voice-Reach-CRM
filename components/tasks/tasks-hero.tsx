import Image from "next/image";
import { Icon } from "@/components/ui/icon";
export function TasksHero({
  name,
  today,
  completed,
  total,
  loading,
  error,
}: {
  name: string;
  today: number;
  completed: number;
  total: number;
  loading: boolean;
  error: boolean;
}) {
  return (
    <section className="tw-hero">
      <div className="tw-hero-photo">
        <Image
          src="/brand/heroes/tasks-home-office.png"
          alt="Sunlit architectural home office with greenery and a refined writing desk"
          fill
          priority
          sizes="(max-width:768px) 100vw, 1400px"
        />
      </div>
      <div className="tw-hero-copy">
        <span>TASKS</span>
        <h1>The details drive the deal.</h1>
        <p>Stay focused on what matters and keep every opportunity moving.</p>
      </div>
      <aside className="tw-greeting">
        <Icon name="light_mode" />
        <div>
          <h2>
            {name ? `Your day, ${name}.` : "Your day, thoughtfully planned."}
          </h2>
          <p>
            {loading
              ? "Loading your priorities…"
              : error
                ? "Refresh to load your priorities."
                : `${today} open ${today === 1 ? "task" : "tasks"} due today.`}
          </p>
          {!loading && !error && total > 0 && (
            <>
              <div className="tw-progress">
                <span style={{ width: `${(completed / total) * 100}%` }} />
              </div>
              <small>
                {completed} of {total} tasks due today completed
              </small>
            </>
          )}
        </div>
      </aside>
    </section>
  );
}
