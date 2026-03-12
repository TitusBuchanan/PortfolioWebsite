import React, { useState, useMemo } from 'react';
import Reveal from './Reveal';
import { PROJECTS, FILTERS } from '../data';

function Projects() {
  const [active, setActive] = useState('all');

  // useMemo: filter only recomputes when the active category changes.
  const filtered = useMemo(
    () => active === 'all' ? PROJECTS : PROJECTS.filter(p => p.cat === active),
    [active]
  );

  return (
    <div className="page">
      <div className="projects-page">
        <div className="resume-label meta">Projects</div>
        <div className="proj-title text-reveal">WO<span className="grad-text">RK</span></div>

        <div className="proj-filters">
          {FILTERS.map(f => (
            <button
              key={f.key}
              className={`proj-filter-btn${active === f.key ? ' active' : ''}`}
              onClick={() => setActive(f.key)}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="proj-grid">
          {filtered.map((p, i) => (
            // Stable key by title: Reveal state (visible) persists across filter changes.
            // Previously key={active+'-'+i} caused full remounts on every filter click.
            <Reveal key={p.title} delay={Math.min(i % 4 + 1, 4)}>
              <a className="proj-cell" href={p.link} target="_blank" rel="noopener noreferrer">
                <div className="proj-cell-idx">{String(i + 1).padStart(2, '0')}</div>
                <span className="proj-cell-arrow">↗</span>
                <h3>{p.title}</h3>
                <p>{p.desc}</p>
                <div className="proj-tags">
                  {p.tags.map(t => <span className="proj-tag" key={t}>{t}</span>)}
                </div>
              </a>
            </Reveal>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Projects;
