import React from 'react';
import { AnimatedBackground } from '@/components/animated-background';
import { ExamMarquee } from '@/components/exam-marquee';
import { HomeInteractionManager } from '@/components/home-interaction-manager';

export default function HomePage() {
  return (
    <>
      {/* Background stays separate and preloaded */}
      <AnimatedBackground />

      {/* State management is loaded, passing the pre-rendered Marquee */}
      <HomeInteractionManager marquee={<ExamMarquee />} />
    </>
  );
}
