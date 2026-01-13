"use client";

import { useEffect, useRef, useState } from "react";

export function useScrollDirection(threshold = 10) {
  const [show, setShow] = useState(true);
  const lastScrollY = useRef(0);

  useEffect(() => {
    function onScroll() {
      const current = window.scrollY;
      const diff = current - lastScrollY.current;

      if (diff > threshold && current > 80) {
        setShow(false);
      }

      if (diff < -threshold) {
        setShow(true);
      }

      lastScrollY.current = current;
    }

    window.addEventListener("scroll", onScroll, {
      passive: true,
    });

    return () =>
      window.removeEventListener("scroll", onScroll);
  }, [threshold]);

  return show;
}
