"use client";

import Link from "next/link";
import {
  createElement,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";

type ExpandableProductTitleProps = {
  name: string;
  /** Se informado, o título vira um link para o produto. */
  href?: string;
  /** Número de linhas no estado recolhido. */
  clampLines: number;
  /** Tag do título quando NÃO é link (preserva semântica, ex.: "h2"). */
  as?: "h2" | "h3" | "p" | "span";
  className?: string;
  style?: CSSProperties;
  buttonClassName?: string;
};

/**
 * Título de produto que mostra "ver mais" apenas quando o texto não cabe no
 * número de linhas recolhido, expandindo/recolhendo no clique. A detecção de
 * corte é feita medindo scrollHeight vs clientHeight no estado recolhido.
 */
export function ExpandableProductTitle({
  name,
  href,
  clampLines,
  as = "span",
  className,
  style,
  buttonClassName,
}: ExpandableProductTitleProps) {
  const ref = useRef<HTMLElement | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [overflowing, setOverflowing] = useState(false);

  useEffect(() => {
    // Só medimos no estado recolhido (com o clamp aplicado).
    if (expanded) return;
    const element = ref.current;
    if (!element) return;

    const check = () => {
      setOverflowing(element.scrollHeight - element.clientHeight > 1);
    };

    check();
    const observer = new ResizeObserver(check);
    observer.observe(element);
    return () => observer.disconnect();
  }, [name, clampLines, expanded]);

  const titleStyle: CSSProperties = expanded
    ? { ...style }
    : {
        ...style,
        display: "-webkit-box",
        WebkitLineClamp: clampLines,
        WebkitBoxOrient: "vertical",
        overflow: "hidden",
      };

  const titleElement = href ? (
    <Link
      ref={ref as React.Ref<HTMLAnchorElement>}
      href={href}
      className={className}
      style={titleStyle}
    >
      {name}
    </Link>
  ) : (
    createElement(
      as,
      { ref, className, style: titleStyle },
      name
    )
  );

  return (
    <>
      {titleElement}
      {overflowing || expanded ? (
        <button
          type="button"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            setExpanded((value) => !value);
          }}
          className={
            buttonClassName ??
            "mt-0.5 self-start text-[11px] font-semibold text-[#007185] hover:underline"
          }
        >
          {expanded ? "ver menos" : "ver mais"}
        </button>
      ) : null}
    </>
  );
}

export default ExpandableProductTitle;
