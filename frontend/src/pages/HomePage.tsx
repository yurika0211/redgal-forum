import type { Profile as ApiProfile, WallEntry as ApiWallEntry } from "../api";
import type { PagerState } from "../lib/pagination";
import { excerpt } from "../lib/text";
import StatusChip from "../components/StatusChip";

const HOME_POEM_LINES = [
  "似活水之源之传承，滋润贫瘠精神",
  "仿月出星隐之交替，澄澈臃肿灵魂",
  "拟竹林清风之轮转，氤氲懵懂心灵",
] as const;

const HOME_HISTORY_PARAGRAPHS = [
  "百川乃大视觉小说研建立于 2017 年。它最初并不是一场被郑重规划的成立仪式，而是从一个“需要有地方认真聊 Galgame”的意外契机里生长出来的。",
  "同好会正式出现之前，一部分成员长期在四川大学校级 ACG 社团的群聊里活动。由于视觉小说相关话题常常比普通二次元讨论更私密、更细腻，也更需要单独展开，于是才有了最早的分群与最初的聚拢。",
  "2017 到 2020 年之间，这个群聊并不算很热闹；真正让它重新活起来的，是 2020 年以后不断加入的新生。到了 2024 年，百川乃大视觉小说研这个名字正式确立，同好会也开始以更明确的姿态被大家认识。",
  "这些年里，社团并没有真正完成一部属于自己的视觉小说，但那份“我们来做一部 Galgame 吧”的冲动从未消失。有人离开，有人继续创作，也有人第一次在这里知道，原来校园里还有这样一群愿意认真谈作品、谈叙事、谈制作的人。",
] as const;

const HOME_RULE_CARDS = [
  {
    id: "guest",
    title: "公开访客",
    body: "可以浏览首页、公开札记、部分讨论与展示内容。首页保持开放，但不会把站内更私密的讨论直接摊开给所有人。",
  },
  {
    id: "member",
    title: "认证成员",
    body: "通过认证后，可以参与更多讨论、维护个人空间、投稿展示墙，也能进入更完整的社团内容流。",
  },
  {
    id: "moderation",
    title: "维护与审核",
    body: "管理组负责整理站点秩序、审核投稿与维护讨论环境。规则会尽量温和克制，但会优先保护创作、交流与成员体验。",
  },
] as const;

const HOME_PHOTO_WALL = [
  {
    id: "photo-1",
    src: "/graphs/ex1.png",
    title: "照片墙精选 01",
    note: "把属于社团的线下活动、展板、群像和那些值得被记住的瞬间，直接压到首页底部。",
  },
  {
    id: "photo-2",
    src: "/graphs/ex2.png",
    title: "照片墙精选 02",
    note: "照片墙不只是装饰，它应该像社团的延伸记忆，把过去活动留下的温度继续展示出来。",
  },
] as const;

interface HomePageProps {
  articlePager: PagerState;
  collectionTotal: number;
  displayProfile: ApiProfile | null;
  threadPager: PagerState;
  wallEntries: ApiWallEntry[];
  wallPager: PagerState;
  onNavigate: (href: string) => void;
}

export default function HomePage({
  articlePager,
  collectionTotal,
  displayProfile,
  threadPager,
  wallEntries,
  wallPager,
  onNavigate,
}: HomePageProps) {
  return (
    <>
      <section className="hero-panel landing-hero home-hero">
        <div className="landing-hero__copy home-hero__copy">
          <p className="eyebrow">百川乃大视觉小说研 / Since 2017</p>
          <h1>让对视觉小说的热爱，在校园里继续被传下去。</h1>
          <p className="hero-description home-hero__lead">
            从最早那个专门聊 Galgame 的分群，到后来真正被大家叫出名字的同好会，
            百川乃大一直在校园里慢慢长大。
          </p>
          <p className="home-hero__intro">
            这里放的不只是导航，还有社团这些年留下来的讨论、照片、札记和那句总会反复出现的话：
            “我们来做一部视觉小说吧。”
          </p>
          <div className="hero-action-row">
            <button className="primary-button" type="button" onClick={() => onNavigate("/forum")}>
              进入论坛讨论
            </button>
            <button className="ghost-button hero-action-button" type="button" onClick={() => onNavigate("/gallery")}>
              查看照片墙
            </button>
          </div>

          <div className="home-poem-card">
            <span className="home-poem-card__kicker">社团题记</span>
            {HOME_POEM_LINES.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>

          <div className="hero-metrics landing-hero__metrics home-hero__metrics">
            <div className="metric-card">
              <span>社团起源</span>
              <strong>2017</strong>
              <StatusChip tone="success">从 Galgame 分群开始</StatusChip>
            </div>
            <div className="metric-card">
              <span>名称确立</span>
              <strong>2024</strong>
              <StatusChip tone="accent">百川乃大视觉小说研正式命名</StatusChip>
            </div>
            <div className="metric-card">
              <span>成员规模</span>
              <strong>300+</strong>
              <StatusChip tone="neutral">热爱仍在持续扩散</StatusChip>
            </div>
          </div>
        </div>

        <div className="landing-hero__visual home-hero__visual">
          <div className="landing-hero__glow landing-hero__glow--one" aria-hidden="true" />
          <div className="landing-hero__glow landing-hero__glow--two" aria-hidden="true" />
          <div className="landing-hero__glow landing-hero__glow--three" aria-hidden="true" />

          <div className="art-stage home-hero__art-stage">
            <div className="art-stage__standee home-hero__standee">
              <div className="art-stage__standee-frame" aria-hidden="true" />
              <img
                alt="百川乃大视觉小说研首页主视觉"
                className="art-stage__standee-image"
                src="/bg1.png"
              />
            </div>

            <div className="art-stage__postcard home-hero__postcard">
              <img alt="百川乃大视觉小说研辅助视觉" className="art-stage__postcard-image" src="/bg2.png" />
              <div className="art-stage__postcard-copy">
                <span>Campus Memory</span>
                <strong>从意外起源，到名字被正式说出口</strong>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="page-split-grid home-history-grid">
        <article className="panel home-history-panel">
          <div className="panel-heading">
            <div>
              <p className="panel-kicker">社团沿革</p>
              <h2>从分群、沉寂、活跃，到真正成为同好会</h2>
            </div>
          </div>
          <div className="home-history-copy">
            {HOME_HISTORY_PARAGRAPHS.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
        </article>

        <article className="panel home-history-side">
          <div className="panel-heading">
            <div>
              <p className="panel-kicker">当前内容</p>
              <h2>社团在这里做什么</h2>
            </div>
          </div>
          <div className="stack-list">
            <div className="content-card">
              <div className="content-card__header">
                <h3>文章札记</h3>
                <StatusChip tone="success">{articlePager.total} 篇</StatusChip>
              </div>
              <p>把对作品的感想、路线阅读、对白笔记和短札都沉淀下来。</p>
            </div>
            <div className="content-card">
              <div className="content-card__header">
                <h3>论坛讨论</h3>
                <StatusChip tone="accent">{threadPager.total} 条</StatusChip>
              </div>
              <p>适合长帖、剧情拆解、氛围交流，也保留更轻的即时讨论入口。</p>
            </div>
            <div className="content-card">
              <div className="content-card__header">
                <h3>个人空间</h3>
                <StatusChip tone="neutral">{displayProfile?.nickname || "Space"}</StatusChip>
              </div>
              <p>把收藏、个性、札记与长期归档慢慢放进自己的空间里。</p>
            </div>
          </div>
        </article>
      </section>

      <section className="home-link-grid">
        {[
          {
            href: "/stories",
            kicker: "文章札记",
            title: "公开文章与感悟区",
            description: "读后感、路线记录、角色笔记，还有一些没来得及在群里说完的话。",
            meta: `${articlePager.total} 篇内容`,
          },
          {
            href: "/forum",
            kicker: "论坛讨论",
            title: "讨论、共赏与站内交流",
            description: "剧情、人物、配音、美术、企划脑洞，都可以在这里慢慢摊开讲。",
            meta: `${threadPager.total} 条主题`,
          },
          {
            href: "/space",
            kicker: "个人空间",
            title: "收藏、札记与长期归档",
            description: "把喜欢的作品、截图、碎句和时间胶囊放回自己的空间里。",
            meta: `${collectionTotal} 项个人收藏`,
          },
          {
            href: "/gallery",
            kicker: "展示墙",
            title: "照片墙与活动记忆",
            description: "活动照片、线下展板、群像与那些确实发生过的时刻，都留在这里。",
            meta: `${wallPager.total} 条公开展墙`,
          },
        ].map((item) => (
          <button
            className="portal-card home-link-card"
            key={item.href}
            type="button"
            onClick={() => onNavigate(item.href)}
          >
            <span className="portal-card__kicker">{item.kicker}</span>
            <strong>{item.title}</strong>
            <p>{item.description}</p>
            <span className="home-link-card__meta">{item.meta}</span>
          </button>
        ))}
      </section>

      <section className="panel-grid preview-grid home-rules-grid">
        {HOME_RULE_CARDS.map((card) => (
          <article className="panel home-rule-card" key={card.id}>
            <div className="panel-heading">
              <div>
                <p className="panel-kicker">站内说明</p>
                <h2>{card.title}</h2>
              </div>
            </div>
            <p className="panel-empty">{card.body}</p>
          </article>
        ))}
      </section>

      <section className="showcase-grid home-photo-grid">
        {HOME_PHOTO_WALL.map((photo) => (
          <article className="panel home-photo-card" key={photo.id}>
            <img alt={photo.title} className="home-photo-card__image" src={photo.src} />
            <div className="home-photo-card__copy">
              <p className="panel-kicker">首页照片墙</p>
              <h2>{photo.title}</h2>
              <p>{photo.note}</p>
            </div>
          </article>
        ))}

        <article className="panel showcase-panel--wide home-photo-summary">
          <div className="panel-heading">
            <div>
              <p className="panel-kicker">照片墙下沉</p>
              <h2>把照片墙直接放到首页底部</h2>
            </div>
            <StatusChip tone="neutral">{wallPager.total} 条公开内容</StatusChip>
          </div>
          <p className="panel-empty">
            照片墙不应该藏在二级页面里。它应该成为首页的结尾，让第一次进入的人直接看见这个社团真实存在过、
            活动过、聚在一起过的证据。
          </p>
          <div className="stack-list">
            {wallEntries.slice(0, 3).map((entry) => (
              <div className="content-card" key={entry.id}>
                <div className="content-card__header">
                  <h3>{entry.title}</h3>
                  <StatusChip tone="success">公开展示</StatusChip>
                </div>
                <p>{excerpt(entry.content, 140)}</p>
                <div className="meta-row">
                  <span>{entry.contributor}</span>
                  <span>{entry.images.length} 张图片</span>
                </div>
              </div>
            ))}
            {!wallEntries.length ? (
              <p className="panel-empty">当前还没有公开照片墙内容，后续会从展示墙页持续回流到首页。</p>
            ) : null}
          </div>
          <div className="hero-action-row">
            <button className="primary-button" type="button" onClick={() => onNavigate("/gallery")}>
              进入完整照片墙
            </button>
            <button className="ghost-button" type="button" onClick={() => onNavigate("/forum")}>
              去论坛继续讨论
            </button>
          </div>
        </article>
      </section>
    </>
  );
}
