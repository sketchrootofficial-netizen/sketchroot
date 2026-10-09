import React from 'react';
import {Composition} from 'remotion';
import {Explainer, FPS} from './Explainer';
import timeline from '../public/timeline.json';

export const Root: React.FC = () => (
  <Composition id="Explainer" component={Explainer} durationInFrames={Math.ceil(timeline.duration * FPS)}
    fps={FPS} width={1080} height={1920} />
);
