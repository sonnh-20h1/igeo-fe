'use client';

import type { ReactNode } from 'react';
import { HomeContactForm } from '@/features/home/home-contact-form';
import { HomeFaq } from '@/features/home/home-faq';
import { HomeHeader } from '@/features/home/home-header';
import { useI18n } from '@/features/i18n/provider';

function SectionHeading({ children }: { children: ReactNode }) {
  return (
    <h2 className='font-[family-name:var(--font-home-display)] text-3xl leading-tight text-[#022648] sm:text-4xl'>
      {children}
    </h2>
  );
}

export function HomePage() {
  const { dictionary } = useI18n();
  const home = dictionary.home;

  return (
    <div id='top' className='home-page min-h-screen text-[#022648]'>
      <HomeHeader />

      <section className='home-hero relative flex min-h-[100svh] items-end overflow-hidden pb-16 pt-28 sm:items-center sm:pb-24 sm:pt-32'>
        <div className='home-hero-atmosphere' aria-hidden />
        <div className='relative z-10 mx-auto w-full max-w-6xl px-4 sm:px-6'>
          <p className='home-reveal font-[family-name:var(--font-home-display)] text-4xl leading-[1.05] tracking-tight text-white sm:text-6xl lg:text-7xl'>
            {home.brand}
          </p>
          <h1 className='home-reveal home-reveal-delay-1 mt-6 max-w-3xl text-lg font-medium leading-relaxed text-[#F2E5D2] sm:text-xl'>
            {home.hero.headline}
          </h1>
          <p className='home-reveal home-reveal-delay-2 mt-5 max-w-2xl text-base leading-relaxed text-white/80 sm:text-lg'>
            {home.hero.description}
          </p>
          <div className='home-reveal home-reveal-delay-3 mt-8 flex flex-wrap gap-3'>
            <a href='/exams' className='home-cta-primary'>
              {home.hero.ctaRegister}
            </a>
            <a href='#about' className='home-cta-secondary'>
              {home.hero.ctaLearnMore}
            </a>
          </div>
        </div>
      </section>

      <section id='about' className='home-section scroll-mt-24'>
        <div className='mx-auto max-w-6xl px-4 sm:px-6'>
          <SectionHeading>{home.about.title}</SectionHeading>
          <div className='mt-8 max-w-3xl space-y-5 text-base leading-relaxed text-[#022648]/82 sm:text-lg'>
            <p>{home.about.p1}</p>
            <p>{home.about.p2}</p>
            <p>{home.about.p3}</p>
          </div>
        </div>
      </section>

      <section id='why' className='home-section home-section-muted scroll-mt-24'>
        <div className='mx-auto max-w-6xl px-4 sm:px-6'>
          <SectionHeading>{home.why.title}</SectionHeading>
          <ul className='mt-10 grid gap-10 sm:grid-cols-2'>
            {home.why.items.map((item, index) => (
              <li key={item.title} className='border-t border-[#022648]/15 pt-6'>
                <p className='font-mono text-xs uppercase tracking-[0.22em] text-[#022648]/45'>
                  {String(index + 1).padStart(2, '0')}
                </p>
                <h3 className='mt-3 font-[family-name:var(--font-home-display)] text-xl text-[#022648] sm:text-2xl'>
                  {item.title}
                </h3>
                <p className='mt-3 text-base leading-relaxed text-[#022648]/78'>{item.body}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section id='igeo' className='home-section scroll-mt-24'>
        <div className='mx-auto max-w-6xl px-4 sm:px-6'>
          <SectionHeading>{home.igeo.title}</SectionHeading>
          <div className='mt-8 max-w-3xl space-y-5 text-base leading-relaxed text-[#022648]/82 sm:text-lg'>
            <p>{home.igeo.p1}</p>
            <p>{home.igeo.p2}</p>
          </div>
          <h3 className='mt-12 font-[family-name:var(--font-home-display)] text-2xl text-[#022648]'>
            {home.igeo.testsTitle}
          </h3>
          <ul className='mt-6 grid gap-8 md:grid-cols-3'>
            {home.igeo.tests.map((test) => (
              <li key={test.title} className='border-l-2 border-[#E0C389] pl-5'>
                <h4 className='text-lg font-semibold text-[#022648]'>{test.title}</h4>
                <p className='mt-3 text-base leading-relaxed text-[#022648]/75'>{test.body}</p>
              </li>
            ))}
          </ul>
          <p className='mt-10 max-w-3xl text-base leading-relaxed text-[#022648]/82 sm:text-lg'>
            {home.igeo.closing}
          </p>
        </div>
      </section>

      <section id='structure' className='home-section home-section-muted scroll-mt-24'>
        <div className='mx-auto max-w-6xl px-4 sm:px-6'>
          <SectionHeading>{home.structure.title}</SectionHeading>
          <p className='mt-6 max-w-3xl text-base leading-relaxed text-[#022648]/82 sm:text-lg'>
            {home.structure.intro}
          </p>

          <div className='mt-12 space-y-12'>
            <article>
              <h3 className='font-[family-name:var(--font-home-display)] text-2xl text-[#022648]'>
                {home.structure.round1Title}
              </h3>
              <p className='mt-3 text-base leading-relaxed text-[#022648]/78'>
                {home.structure.round1Body}
              </p>
              <p className='mt-5 text-sm font-semibold uppercase tracking-[0.14em] text-[#022648]/55'>
                {home.structure.round1EvalTitle}
              </p>
              <ul className='mt-3 list-disc space-y-2 pl-5 text-base text-[#022648]/78'>
                {home.structure.round1Items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <p className='mt-4 text-base leading-relaxed text-[#022648]/78'>
                {home.structure.round1Result}
              </p>
            </article>

            <article>
              <h3 className='font-[family-name:var(--font-home-display)] text-2xl text-[#022648]'>
                {home.structure.round2Title}
              </h3>
              <p className='mt-3 text-base leading-relaxed text-[#022648]/78'>
                {home.structure.round2Body}
              </p>
              <p className='mt-4 text-base leading-relaxed text-[#022648]/78'>
                {home.structure.round2Result}
              </p>
            </article>

            <article>
              <h3 className='font-[family-name:var(--font-home-display)] text-2xl text-[#022648]'>
                {home.structure.trainingTitle}
              </h3>
              <p className='mt-3 text-base leading-relaxed text-[#022648]/78'>
                {home.structure.trainingBody}
              </p>
              <p className='mt-5 text-sm font-semibold uppercase tracking-[0.14em] text-[#022648]/55'>
                {home.structure.trainingEvalTitle}
              </p>
              <ul className='mt-3 list-disc space-y-2 pl-5 text-base text-[#022648]/78'>
                {home.structure.trainingItems.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>
          </div>

          <div className='mt-16'>
            <h3 className='font-[family-name:var(--font-home-display)] text-2xl text-[#022648]'>
              {home.structure.pathTitle}
            </h3>
            <ol className='home-path mt-8'>
              {home.structure.path.map((step, index) => (
                <li key={step} className='home-path-step'>
                  <span className='home-path-index'>{String(index + 1).padStart(2, '0')}</span>
                  <span className='home-path-label'>{step}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      <section id='organizer' className='home-section scroll-mt-24'>
        <div className='mx-auto max-w-6xl px-4 sm:px-6'>
          <SectionHeading>{home.organizer.title}</SectionHeading>
          <p className='mt-4 font-[family-name:var(--font-home-display)] text-xl text-[#022648] sm:text-2xl'>
            {home.organizer.name}
          </p>
          <p className='mt-6 max-w-3xl text-base leading-relaxed text-[#022648]/82 sm:text-lg'>
            {home.organizer.body}
          </p>
        </div>
      </section>

      <section id='faq' className='home-section home-section-muted scroll-mt-24'>
        <div className='mx-auto max-w-3xl px-4 sm:px-6'>
          <SectionHeading>{home.faq.title}</SectionHeading>
          <div className='mt-10'>
            <HomeFaq items={home.faq.items} />
          </div>
        </div>
      </section>

      <section id='contact' className='home-section scroll-mt-24'>
        <div className='mx-auto grid max-w-6xl gap-12 px-4 sm:px-6 lg:grid-cols-[1fr_1.1fr]'>
          <div>
            <SectionHeading>{home.contact.title}</SectionHeading>
            <p className='mt-6 max-w-xl text-base leading-relaxed text-[#022648]/82 sm:text-lg'>
              {home.contact.intro}
            </p>
          </div>
          <HomeContactForm copy={home.contact} />
        </div>
      </section>

      <footer className='border-t border-[#022648]/12 bg-[#022648] px-4 py-8 text-sm text-white/70 sm:px-6'>
        <div className='mx-auto flex max-w-6xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between'>
          <p>{home.footer.rights}</p>
          <p className='font-[family-name:var(--font-home-display)] text-white'>{home.brandShort}</p>
        </div>
      </footer>
    </div>
  );
}
