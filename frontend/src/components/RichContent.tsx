import type { ReactNode } from "react";

function renderInlineFormattedText(text: string, keyPrefix: string): ReactNode[] {
  const tokens = text.split(/(\[[^\]]+]\((?:https?:\/\/|\/)[^)]+\)|`[^`]+`|\*\*[^*]+\*\*)/g);

  return tokens.filter(Boolean).map((token, index) => {
    const key = `${keyPrefix}-${index}`;
    const linkMatch = token.match(/^\[([^\]]+)\]\(((?:https?:\/\/|\/)[^)]+)\)$/);
    if (linkMatch) {
      const [, label, href] = linkMatch;
      return (
        <a
          className="detail-body__link"
          href={href}
          key={key}
          rel={href.startsWith("http") ? "noreferrer" : undefined}
          target={href.startsWith("http") ? "_blank" : undefined}
        >
          {label}
        </a>
      );
    }

    if (/^`[^`]+`$/.test(token)) {
      return <code key={key}>{token.slice(1, -1)}</code>;
    }

    if (/^\*\*[^*]+\*\*$/.test(token)) {
      return <strong key={key}>{token.slice(2, -2)}</strong>;
    }

    return <span key={key}>{token}</span>;
  });
}

interface RichContentProps {
  content: string;
}

export default function RichContent({ content }: RichContentProps) {
  const normalized = content.replace(/\r/g, "").trim();
  if (!normalized) {
    return <p className="panel-empty">内容暂时为空。</p>;
  }

  const blocks = normalized
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);

  return (
    <>
      {blocks.map((block, blockIndex) => {
        const key = `detail-block-${blockIndex}`;
        const lines = block.split("\n");
        const imageLines = lines
          .map((line) => line.trim().match(/^!\[([^\]]*)\]\((https?:\/\/[^)\s]+)\)$/))
          .filter(Boolean) as RegExpMatchArray[];

        if (imageLines.length === lines.length && imageLines.length > 0) {
          return (
            <div className="detail-body__gallery" key={key}>
              {imageLines.map((match, imageIndex) => (
                <figure className="detail-body__figure" key={`${key}-image-${imageIndex}`}>
                  <img alt={match[1] || "详情图片"} src={match[2]} />
                  {match[1] ? <figcaption>{match[1]}</figcaption> : null}
                </figure>
              ))}
            </div>
          );
        }

        const headingMatch = block.match(/^(#{1,4})\s+(.+)$/);
        if (headingMatch) {
          const [, marks, title] = headingMatch;
          if (marks.length === 1) {
            return (
              <h2 className="detail-body__heading" key={key}>
                {title}
              </h2>
            );
          }
          if (marks.length === 2) {
            return (
              <h3 className="detail-body__heading" key={key}>
                {title}
              </h3>
            );
          }
          return (
            <h4 className="detail-body__heading" key={key}>
              {title}
            </h4>
          );
        }

        if (lines.every((line) => /^\d+\.\s+/.test(line.trim()))) {
          return (
            <ol className="detail-body__list" key={key}>
              {lines.map((line, index) => (
                <li key={`${key}-li-${index}`}>
                  {renderInlineFormattedText(
                    line.replace(/^\d+\.\s+/, ""),
                    `${key}-li-${index}`,
                  )}
                </li>
              ))}
            </ol>
          );
        }

        if (lines.every((line) => /^[-*+]\s+/.test(line.trim()))) {
          return (
            <ul className="detail-body__list" key={key}>
              {lines.map((line, index) => (
                <li key={`${key}-li-${index}`}>
                  {renderInlineFormattedText(
                    line.replace(/^[-*+]\s+/, ""),
                    `${key}-li-${index}`,
                  )}
                </li>
              ))}
            </ul>
          );
        }

        if (lines.every((line) => /^>\s?/.test(line.trim()))) {
          return (
            <blockquote className="detail-body__quote" key={key}>
              {lines.map((line, index) => (
                <p key={`${key}-quote-${index}`}>
                  {renderInlineFormattedText(
                    line.replace(/^>\s?/, ""),
                    `${key}-quote-${index}`,
                  )}
                </p>
              ))}
            </blockquote>
          );
        }

        if (block.startsWith("```") && block.endsWith("```")) {
          const code = block.replace(/^```[^\n]*\n?/, "").replace(/\n?```$/, "");
          return (
            <pre className="detail-body__code" key={key}>
              <code>{code}</code>
            </pre>
          );
        }

        return (
          <p className="detail-body__paragraph" key={key}>
            {lines.map((line, lineIndex) => (
              <span key={`${key}-line-${lineIndex}`}>
                {renderInlineFormattedText(line, `${key}-line-${lineIndex}`)}
                {lineIndex < lines.length - 1 ? <br /> : null}
              </span>
            ))}
          </p>
        );
      })}
    </>
  );
}
