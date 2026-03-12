import React, { useEffect, useRef, useState } from 'react';

const OBSERVER_OPTIONS = { threshold: 0.1, rootMargin: '0px 0px -40px 0px' };

// React.memo prevents re-rendering already-visible children when a parent updates.
const Reveal = React.memo(function Reveal({ children, delay, className }) {
  const [visible, setVisible] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setVisible(true);
        observer.unobserve(el);
      }
    }, OBSERVER_OPTIONS);
    observer.observe(el);
    return () => observer.unobserve(el);
  }, []);

  const cls = ['reveal', visible && 'visible', delay && `reveal-d${delay}`, className]
    .filter(Boolean).join(' ');

  return <div ref={ref} className={cls}>{children}</div>;
});

export default Reveal;
