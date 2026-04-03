import type {
  DisplayActivity,
  DisplayHighlight,
  DisplayJoinStep,
  DisplayPillar,
  DisplayPortalPage,
} from "../types/app";

interface PortalPageProps {
  portalPages: DisplayPortalPage[];
  societyActivities: DisplayActivity[];
  societyHighlights: DisplayHighlight[];
  societyJoinSteps: DisplayJoinStep[];
  societyPillars: DisplayPillar[];
  onNavigate: (href: string) => void;
}

export default function PortalPage({
  portalPages,
  societyActivities,
  societyHighlights,
  societyJoinSteps,
  societyPillars,
  onNavigate,
}: PortalPageProps) {
  return (
    <>
      <section className="panel portal-manifesto">
        <div className="portal-manifesto__head">
          <p className="eyebrow">社团介绍 / manifesto</p>
          <h1>这里聚着一群愿意认真聊视觉小说的人。</h1>
        </div>
        <div className="portal-manifesto__body">
          <div className="portal-manifesto__copy">
            <p>
              百川乃大不是只用来“看作品”的地方。我们会拆剧情、聊角色、做共赏、
              也会把截图、札记、活动照片和那些一闪而过的灵感慢慢收起来。
            </p>
            <p>
              有人偏爱写长评，有人更在意场景和音乐，有人只是想在校园里找到可以认真聊 Galgame 的同类。
              这些差异不会被抹平，反而正是社团最重要的部分。
            </p>
            <p>
              如果你也会在深夜里突然冒出一句“我们来做一部视觉小说吧”，
              那你大概就能明白这个地方为什么会存在。
            </p>
          </div>
          <aside className="portal-manifesto__aside">
            {societyHighlights.map((highlight) => (
              <div className="portal-manifesto__note" key={highlight.id}>
                <span>{highlight.kicker}</span>
                <strong>{highlight.title}</strong>
                <p>{highlight.body}</p>
              </div>
            ))}
          </aside>
        </div>
      </section>

      <section className="page-split-grid portal-brief-grid">
        <article className="panel">
          <div className="panel-heading">
            <div>
              <p className="panel-kicker">平时在做什么</p>
              <h2>社团的几条主线</h2>
            </div>
          </div>
          <div className="portal-brief-list">
            {societyPillars.map((pillar) => (
              <div className="portal-brief-item" key={pillar.id}>
                <strong>{pillar.title}</strong>
                <p>{pillar.description}</p>
              </div>
            ))}
          </div>
        </article>

        <article className="panel">
          <div className="panel-heading">
            <div>
              <p className="panel-kicker">先从哪里看起</p>
              <h2>站内入口</h2>
            </div>
          </div>
          <div className="portal-route-list">
            {portalPages.map((page) => (
              <button
                className="portal-route-item"
                key={page.href}
                type="button"
                onClick={() => onNavigate(page.href)}
              >
                <span>{page.kicker}</span>
                <strong>{page.title}</strong>
                <p>{page.description}</p>
              </button>
            ))}
          </div>
        </article>
      </section>

      <section className="page-split-grid portal-brief-grid">
        <article className="panel">
          <div className="panel-heading">
            <div>
              <p className="panel-kicker">活动与聚会</p>
              <h2>最近会遇到的事情</h2>
            </div>
          </div>
          <div className="portal-brief-list">
            {societyActivities.map((activity) => (
              <div className="portal-brief-item" key={activity.id}>
                <span>{activity.label}</span>
                <strong>{activity.title}</strong>
                <p>{activity.description}</p>
              </div>
            ))}
          </div>
        </article>

        <article className="panel">
          <div className="panel-heading">
            <div>
              <p className="panel-kicker">如果你准备加入</p>
              <h2>不用一下子变得很熟</h2>
            </div>
          </div>
          <div className="portal-step-list">
            {societyJoinSteps.map((step) => (
              <div className="portal-step-item" key={step.id}>
                <span>{step.step}</span>
                <div>
                  <strong>{step.title}</strong>
                  <p>{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <div>
            <p className="panel-kicker">一句实话</p>
            <h2>我们并不完美，但一直有人还想继续做下去</h2>
          </div>
        </div>
        <p className="panel-empty">
          百川乃大未必已经完成过属于自己的视觉小说，站点也还在一点点长出来。
          但社团真正重要的并不是“已经做成了什么”，而是每一年总会有人重新把热情接过来。
        </p>
      </section>
    </>
  );
}
