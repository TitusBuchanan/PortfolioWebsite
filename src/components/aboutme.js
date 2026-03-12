import React, { useEffect, useRef } from 'react';
import Reveal from './Reveal';
import { ABOUT_TAGS } from '../data';

// CountUp writes directly to a DOM ref — zero React state updates during animation.
// This eliminates ~528 reconciliation cycles (4 instances × 132 frames) on mount.
function CountUp({ to, suffix }) {
  const spanRef = useRef(null);
  const rafRef = useRef(null);
  const isPercent = suffix === '%';

  useEffect(() => {
    const target = parseFloat(to);
    const duration = 2200;
    const start = Date.now();

    const tick = () => {
      const p = Math.min((Date.now() - start) / duration, 1);
      const val = (1 - Math.pow(1 - p, 4)) * target;
      if (spanRef.current) {
        spanRef.current.textContent = isPercent ? val.toFixed(1) : Math.round(val);
      }
      if (p < 1) rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [to, isPercent]);

  return (
    <span>
      <span ref={spanRef}>{isPercent ? '0.0' : '0'}</span>
      <span className="grad-text">{suffix}</span>
    </span>
  );
}

function About() {
  return (
    <div className="page">
      <div className="about-page">
        <div className="about-header">
          <div className="about-title text-reveal">ABO<span className="grad-text">UT</span></div>
          <div className="meta text-reveal text-reveal-d" style={{paddingTop:'1rem'}}>TITUS BUCHANAN JR<br/>DEVOPS ENGINEER<br/>PROVIDENCE, RI</div>
        </div>

        <div className="about-grid">
          <Reveal><div className="about-cell card-3d">
            <div className="about-cell-label">Years of Experience</div>
            <div className="about-cell-num"><CountUp to={4} suffix="+" /></div>
            <p>Designing, automating, and scaling cloud-native infrastructure across AWS, Azure, and Kubernetes.</p>
          </div></Reveal>
          <Reveal delay={1}><div className="about-cell card-3d">
            <div className="about-cell-label">Uptime Achieved</div>
            <div className="about-cell-num"><CountUp to={99.9} suffix="%" /></div>
            <p>Multi-region Kubernetes deployments on EKS with automated failover and monitoring.</p>
          </div></Reveal>
          <Reveal delay={2}><div className="about-cell card-3d">
            <div className="about-cell-label">Faster Deployments</div>
            <div className="about-cell-num"><CountUp to={40} suffix="%" /></div>
            <p>Automated provisioning with Terraform, reducing manual setup time dramatically.</p>
          </div></Reveal>
          <Reveal delay={3}><div className="about-cell card-3d">
            <div className="about-cell-label">Cost Reduction</div>
            <div className="about-cell-num"><CountUp to={25} suffix="%" /></div>
            <p>Serverless architectures with AWS Lambda improving elastic scalability.</p>
          </div></Reveal>
          <Reveal><div className="about-cell about-wide">
            <div className="about-cell-label">Professional Summary</div>
            <p style={{fontStyle:'italic',lineHeight:'1.8',maxWidth:'700px'}}>
              DevOps Engineer with 4+ years of experience building CI/CD pipelines,
              implementing Infrastructure as Code with Terraform, and enhancing
              system observability with Grafana and Prometheus. Adept at collaborating
              with cross-functional teams to troubleshoot complex cloud and container
              challenges in fast-paced environments.
            </p>
            <div className="about-tags">
              {ABOUT_TAGS.map(t => (
                <span className="about-tag" key={t}><span>{t}</span></span>
              ))}
            </div>
          </div></Reveal>
        </div>
      </div>
    </div>
  );
}

export default About;
