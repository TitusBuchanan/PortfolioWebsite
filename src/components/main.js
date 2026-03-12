import React, { lazy, Suspense } from 'react';
import { Switch, Route } from 'react-router-dom';

// Route-level code splitting: each page is a separate chunk loaded on demand.
// The landing page bundle is the only code fetched on initial visit.
const LandingPage = lazy(() => import('./landingpage'));
const AboutMe     = lazy(() => import('./aboutme'));
const Contact     = lazy(() => import('./contact'));
const Projects    = lazy(() => import('./projects'));
const Resume      = lazy(() => import('./resume'));

const Main = () => (
  <Suspense fallback={<div style={{minHeight:'100vh'}} />}>
    <Switch>
      <Route exact path="/"        component={LandingPage} />
      <Route path="/aboutme"       component={AboutMe} />
      <Route path="/contact"       component={Contact} />
      <Route path="/projects"      component={Projects} />
      <Route path="/resume"        component={Resume} />
    </Switch>
  </Suspense>
);

export default Main;
