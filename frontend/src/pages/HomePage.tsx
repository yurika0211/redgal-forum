import type { Profile as ApiProfile } from "../api";
import GalleryShowcase from "../components/GalleryShowcase";
import type { PagerState } from "../lib/pagination";
import StatusChip from "../components/StatusChip";
import type {
  DisplayAlbum,
  DisplayPaper,
  DisplayPolaroid,
  DisplayTimeline,
  DisplayTrack,
} from "../types/app";

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

const HOME_SECTION_LINKS = [
  {
    href: "/stories",
    kicker: "文章札记",
    title: "公开文章与感悟区",
    description: "读后感、路线记录、角色笔记，还有一些没来得及在群里说完的话。",
  },
  {
    href: "/forum",
    kicker: "论坛讨论",
    title: "讨论、共赏与站内交流",
    description: "剧情、人物、配音、美术、企划脑洞，都可以在这里慢慢摊开讲。",
  },
  {
    href: "/space",
    kicker: "个人空间",
    title: "收藏、札记与长期归档",
    description: "把喜欢的作品、截图、碎句和时间胶囊放回自己的空间里。",
  },
  {
    href: "/gallery",
    kicker: "展示墙",
    title: "照片墙与活动记忆",
    description: "活动照片、线下展板、群像与那些确实发生过的时刻，都留在这里。",
  },
] as const;

interface HomePageProps {
  articlePager: PagerState;
  collectionTotal: number;
  displayProfile: ApiProfile | null;
  galleryAlbums: DisplayAlbum[];
  galleryPapers: DisplayPaper[];
  galleryPolaroids: DisplayPolaroid[];
  galleryTimeline: DisplayTimeline[];
  galleryTracks: DisplayTrack[];
  threadPager: PagerState;
  wallPager: PagerState;
  onNavigate: (href: string) => void;
}

export default function HomePage({
  articlePager,
  collectionTotal,
  displayProfile,
  galleryAlbums,
  galleryPapers,
  galleryPolaroids,
  galleryTimeline,
  galleryTracks,
  threadPager,
  wallPager,
  onNavigate,
}: HomePageProps) {
  const terminalSpaceID = (displayProfile?.username || "guest").trim();

  return (
    <>
      <section className="hero-panel landing-hero home-hero">
        <div className="landing-hero__copy home-hero__copy">
          <div className="home-terminal">
            <div className="home-terminal__bar">
              <div className="home-terminal__lights" aria-hidden="true">
                <span />
                <span />
                <span />
              </div>
            </div>

            <div className="home-terminal__body">
              <p className="home-terminal__command home-terminal__typing home-terminal__typing--command">
                .$ boot.redgal_forum --mode.console
              </p>
              <p className="home-terminal__status home-terminal__typing home-terminal__typing--status">
                SYSTEM READY:
              </p>
              <p className="home-terminal__prompt home-terminal__typing home-terminal__typing--body-1">
                {terminalSpaceID}@redgal:~$
              </p>
            </div>
          </div>

          <div className="hero-action-row">
            <button className="primary-button" type="button" onClick={() => onNavigate("/forum")}>
              进入论坛讨论
            </button>
            <button className="ghost-button hero-action-button" type="button" onClick={() => onNavigate("/gallery")}>
              查看照片墙
            </button>
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
          <ul className="home-text-list">
            <li className="home-text-list__item">
              <p className="home-text-list__heading">
                <span>文章札记</span>
                <span>{articlePager.total} 篇</span>
              </p>
              <p>把对作品的感想、路线阅读、对白笔记和短札都沉淀下来。</p>
            </li>
            <li className="home-text-list__item">
              <p className="home-text-list__heading">
                <span>论坛讨论</span>
                <span>{threadPager.total} 条</span>
              </p>
              <p>适合长帖、剧情拆解、氛围交流，也保留更轻的即时讨论入口。</p>
            </li>
            <li className="home-text-list__item">
              <p className="home-text-list__heading">
                <span>个人空间</span>
                <span>{displayProfile?.nickname || "Space"}</span>
              </p>
              <p>把收藏、个性、札记与长期归档慢慢放进自己的空间里。</p>
            </li>
          </ul>
        </article>
      </section>

      <section className="panel home-link-list-panel">
        <div className="panel-heading">
          <div>
            <p className="panel-kicker">站内入口</p>
            <h2>按主题浏览内容分区</h2>
          </div>
        </div>
        <ul className="home-link-list">
          {HOME_SECTION_LINKS.map((item) => (
            <li key={item.href}>
              <button className="home-link-list__item" type="button" onClick={() => onNavigate(item.href)}>
                <p className="home-link-list__heading">
                  <span>{item.kicker}</span>
                  <span>
                    {item.href === "/stories"
                      ? `${articlePager.total} 篇内容`
                      : item.href === "/forum"
                        ? `${threadPager.total} 条主题`
                        : item.href === "/space"
                          ? `${collectionTotal} 项个人收藏`
                          : `${wallPager.total} 条公开展墙`}
                  </span>
                </p>
                <p className="home-link-list__title">{item.title}</p>
                <p className="home-link-list__description">{item.description}</p>
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="panel home-rules-list-panel">
        <div className="panel-heading">
          <div>
            <p className="panel-kicker">站内说明</p>
            <h2>权限与秩序规则</h2>
          </div>
        </div>
        <ul className="home-text-list home-text-list--rules">
          {HOME_RULE_CARDS.map((card) => (
            <li className="home-text-list__item" key={card.id}>
              <p className="home-text-list__heading">
                <span>{card.title}</span>
              </p>
              <p>{card.body}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="panel home-gallery-bottom">
        <div className="panel-heading">
          <div>
            <p className="panel-kicker">照片墙下沉</p>
            <h2>把展示墙直接放到首页底部</h2>
          </div>
          <StatusChip tone="neutral">{wallPager.total} 条公开内容</StatusChip>
        </div>
        <GalleryShowcase
          className="gallery-outline home-gallery-showcase"
          galleryAlbums={galleryAlbums}
          galleryPapers={galleryPapers}
          galleryPolaroids={galleryPolaroids}
          galleryTimeline={galleryTimeline}
          galleryTracks={galleryTracks}
        />
      </section>
    </>
  );
}
