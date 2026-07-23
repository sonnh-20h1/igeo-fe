'use client';

import type { ReactNode } from 'react';
import Image from 'next/image';
import { Building2, Droplet, Feather, Globe, GraduationCap, Mail, Map, MapPin, MonitorPlay, Mountain, Sprout, Trophy, Users } from 'lucide-react';
import { boldGecName } from '@/features/home/bold-gec-name';
import { HomeContactForm } from '@/features/home/home-contact-form';
import { HomeFaq } from '@/features/home/home-faq';
import { HomeHeader } from '@/features/home/home-header';
import { useI18n } from '@/features/i18n/provider';

const IGEO_TEST_ICONS = [Feather, MonitorPlay, Mountain] as const;

const STRUCTURE_PATH_ICONS = [MonitorPlay, Users, Map, Trophy, GraduationCap, Globe] as const;

const ORGANIZER_PILLAR_ICONS = [Sprout, Droplet, Globe] as const;

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
      <HomeHeader light />

      <section className='home-hero'>
        <div className='home-hero-inner mx-auto w-full max-w-6xl px-4 sm:px-6'>
          <div className='home-hero-copy'>
            <p className='home-reveal home-hero-brand'>{boldGecName(home.brand)}</p>
            {home.hero.tagline ? (
              <p className='home-reveal home-reveal-delay-1 home-hero-tagline'>
                {home.hero.tagline}
              </p>
            ) : null}
            <h1 className='home-reveal home-reveal-delay-1 home-hero-headline'>
              {home.hero.headline}
            </h1>
            <p className='home-reveal home-reveal-delay-2 home-hero-description'>
              {boldGecName(home.hero.description)}
            </p>
            <div className='home-reveal home-reveal-delay-3 home-hero-actions'>
              <a href='/exams' className='home-cta-primary'>
                {home.hero.ctaRegister}
              </a>
              <a href='#about' className='home-cta-secondary home-cta-secondary--light'>
                {home.hero.ctaLearnMore}
              </a>
            </div>
          </div>
        </div>

        <div className='home-hero-scene' aria-hidden>
          <Image
            src='/images/background_1.png'
            alt=''
            fill
            priority
            sizes='100vw'
            className='home-hero-backdrop-image'
          />
          <div className='home-hero-image-wrap'>
            <Image
              src='/images/hero.png'
              alt=''
              fill
              priority
              sizes='(max-width: 1024px) 100vw, 60vw'
              className='home-hero-image'
            />
          </div>
          <div className='home-hero-scene-fade' />
        </div>
      </section>

      <section id='about' className='home-section home-about scroll-mt-24'>
        <div className='home-about-backdrop' aria-hidden>
          <Image
            src='/images/white_background_1.png'
            alt=''
            fill
            sizes='100vw'
            className='home-about-backdrop-image'
          />
        </div>

        <div className='home-about-inner relative mx-auto grid max-w-6xl items-center gap-10 px-4 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14'>
          <div>
            <h2 className='home-about-title'>{boldGecName(home.about.title)}</h2>
            <span className='home-about-underline' aria-hidden />
            <div className='home-about-body'>
              <p>{boldGecName(home.about.p1)}</p>
              <p>{boldGecName(home.about.p2)}</p>
              <p>{boldGecName(home.about.p3)}</p>
            </div>
          </div>

          <div className='home-about-map'>
            <Image
              src='/images/vn.png'
              alt=''
              width={1400}
              height={900}
              className='home-about-map-image'
              sizes='(max-width: 1024px) 100vw, 45vw'
            />
          </div>
        </div>
      </section>

      <section id='why' className='home-section home-why scroll-mt-24'>
        <div className='home-why-backdrop' aria-hidden>
          <Image
            src='/images/blue_background_1.png'
            alt=''
            fill
            sizes='100vw'
            className='home-why-backdrop-image'
          />
        </div>

        <div className='home-why-inner relative mx-auto max-w-6xl px-4 sm:px-6'>
          <h2 className='home-why-title'>{home.why.title}</h2>

          <div className='home-why-rows'>
            {[0, 2, 4].map((start) => {
              const rowItems = home.why.items.slice(start, start + 2);
              return (
                <div key={start} className='home-why-row'>
                  {rowItems.map((item, offset) => {
                    const index = start + offset;
                    return (
                      <article key={item.title} className='home-why-item'>
                        <span className='home-why-index'>
                          {String(index + 1).padStart(2, '0')}
                        </span>
                        <h3 className='home-why-item-title'>{item.title}</h3>
                        <p className='home-why-item-body'>{item.body}</p>
                      </article>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section id='igeo' className='home-section home-igeo scroll-mt-24'>
        <div className='home-igeo-backdrop' aria-hidden>
          <Image
            src='/images/white_background_1.png'
            alt=''
            fill
            sizes='100vw'
            className='home-igeo-backdrop-image'
          />
        </div>

        <div className='home-igeo-inner relative mx-auto max-w-6xl px-4 sm:px-6'>
          <div className='home-igeo-intro'>
            <div className='home-igeo-copy'>
              <h2 className='home-igeo-title'>{home.igeo.title}</h2>
              <span className='home-igeo-underline' aria-hidden />
              <div className='home-igeo-body'>
                <p>{home.igeo.p1}</p>
                <p>{home.igeo.p2}</p>
              </div>
            </div>

            <div className='home-igeo-compass'>
              <Image
                src='/images/igeo_v2.png'
                alt=''
                width={900}
                height={900}
                className='home-igeo-compass-image'
                sizes='(max-width: 1024px) 70vw, 380px'
              />
            </div>
          </div>

          <div className='home-igeo-tests'>
            <div className='home-igeo-tests-heading'>
              <span className='home-igeo-tests-rule' aria-hidden />
              <h3 className='home-igeo-tests-title'>{home.igeo.testsTitle}</h3>
              <span className='home-igeo-tests-rule' aria-hidden />
            </div>

            <ul className='home-igeo-cards'>
              {home.igeo.tests.map((test, index) => {
                const Icon = IGEO_TEST_ICONS[index] ?? Feather;
                return (
                  <li key={test.title} className='home-igeo-card'>
                    <div className='home-igeo-card-icon'>
                      {index === 2 ? (
                        <span className='home-igeo-card-icon-stack'>
                          <Mountain className='size-5' strokeWidth={1.75} />
                          <MapPin className='size-3.5' strokeWidth={2} />
                        </span>
                      ) : (
                        <Icon className='size-5' strokeWidth={1.75} />
                      )}
                    </div>
                    <h4 className='home-igeo-card-title'>
                      {test.title} ({test.weight})
                    </h4>
                    <span className='home-igeo-card-line' aria-hidden />
                    <p className='home-igeo-card-body'>{test.body}</p>
                  </li>
                );
              })}
            </ul>

            <p className='home-igeo-closing'>{home.igeo.closing}</p>
          </div>
        </div>
      </section>

      <section id='structure' className='home-section home-structure scroll-mt-24'>
        <div className='home-structure-backdrop' aria-hidden>
          <Image
            src='/images/blue_background_1.png'
            alt=''
            fill
            sizes='100vw'
            className='home-structure-backdrop-image'
          />
        </div>

        <div className='home-structure-main'>
          <div className='home-structure-inner relative mx-auto max-w-6xl px-4 sm:px-6'>
          <h2 className='home-structure-title'>{home.structure.title}:</h2>
          <p className='home-structure-intro'>{home.structure.intro}</p>

          <div className='home-structure-timeline'>
            <ol className='home-structure-steps'>
              {home.structure.path.map((step, index) => {
                const Icon = STRUCTURE_PATH_ICONS[index] ?? Globe;
                return (
                  <li key={step} className='home-structure-step'>
                    <div className='home-structure-step-top'>
                      <div className='home-structure-icon'>
                        <Icon className='size-5' strokeWidth={1.75} />
                      </div>
                      <span className='home-structure-caret' aria-hidden />
                    </div>
                    <p className='home-structure-number'>
                      {String(index + 1).padStart(2, '0')}
                    </p>
                    <p className='home-structure-label'>{step}</p>
                  </li>
                );
              })}
            </ol>
          </div>
          </div>
        </div>

        <div className='home-structure-lower'>
          <div className='home-structure-inner mx-auto max-w-6xl px-4 sm:px-6'>
            <h3 className='home-structure-details-title'>{home.structure.detailsTitle}</h3>

            <div className='home-structure-details'>
              <article>
                <h4 className='home-structure-article-title'>{home.structure.round1Title}</h4>
                <p className='home-structure-article-body'>{home.structure.round1Body}</p>
                <p className='home-structure-article-label'>{home.structure.round1EvalTitle}</p>
                <ul className='home-structure-list'>
                  {home.structure.round1Items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
                <p className='home-structure-article-body'>{home.structure.round1Result}</p>
              </article>

              <article>
                <h4 className='home-structure-article-title'>{home.structure.round2Title}</h4>
                <p className='home-structure-article-body'>{home.structure.round2Body}</p>
                <p className='home-structure-article-body'>{home.structure.round2Result}</p>
              </article>

              <article>
                <h4 className='home-structure-article-title'>{home.structure.trainingTitle}</h4>
                <p className='home-structure-article-body'>{home.structure.trainingBody}</p>
                <ul className='home-structure-list'>
                  {home.structure.trainingItems.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </article>
            </div>
          </div>

          <div className='home-finale'>
          <div className='home-finale-inner mx-auto max-w-6xl px-4 sm:px-6'>
            <h4 className='home-finale-title'>{home.structure.finaleTitle}</h4>
            <p className='home-finale-body'>{home.structure.finaleBody}</p>
          </div>
          <div className='home-finale-visual'>
            <Image
              src='/images/mountain.png'
              alt=''
              width={1774}
              height={887}
              className='home-finale-image'
              sizes='100vw'
            />
          </div>
        </div>
        </div>
      </section>

      <section id='organizer' className='home-section home-organizer scroll-mt-24'>
        <div className='home-organizer-inner relative mx-auto grid max-w-7xl items-center gap-10 px-4 sm:px-6 lg:grid-cols-[0.9fr_1.15fr] lg:gap-12'>
          <div className='home-organizer-copy'>
            <div className='home-organizer-label'>
              <span className='home-organizer-label-bar' aria-hidden />
              <Building2 className='home-organizer-label-icon' strokeWidth={2} />
              <span className='home-organizer-label-text'>{home.organizer.title}</span>
            </div>
            <h2 className='home-organizer-name'>
              {home.organizer.nameLines.map((line) => (
                <span key={line} className='home-organizer-name-line'>
                  {line}
                </span>
              ))}
            </h2>
            <span className='home-organizer-underline' aria-hidden />
            <div className='home-organizer-body'>
              <p>{boldGecName(home.organizer.body)}</p>
              <p>{boldGecName(home.organizer.body2)}</p>
            </div>
          </div>

          <div className='home-organizer-visual' role='img' aria-label={home.organizer.brand}>
            <div className='home-organizer-visual-backdrop' aria-hidden>
              <Image
                src='/images/dvtc_v1.png'
                alt=''
                fill
                sizes='(max-width: 1024px) 100vw, 45vw'
                className='home-organizer-visual-image'
              />
            </div>
            <ul className='home-organizer-pillars'>
              {home.organizer.pillars.map((pillar, index) => {
                const Icon = ORGANIZER_PILLAR_ICONS[index] ?? Globe;
                return (
                  <li key={pillar.label} className='home-organizer-pillar'>
                    <span className='home-organizer-pillar-icon' aria-hidden>
                      <Icon className='size-[1.15em]' strokeWidth={1.75} />
                    </span>
                    <span className='home-organizer-pillar-label'>{pillar.label}</span>
                  </li>
                );
              })}
            </ul>
          </div>
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
              {boldGecName(home.contact.intro)}
            </p>
          </div>
          <HomeContactForm copy={home.contact} />
        </div>
      </section>

      <footer className='home-footer'>
        <div className='home-footer-inner'>
          <div className='home-footer-left'>
            <p className='home-footer-rights'>{boldGecName(home.footer.rights)}</p>
          </div>

          <div className='home-footer-right'>
            <p className='home-footer-organized'>
              {home.footer.organizedBy}{' '}
              <span className='home-footer-organizer'>{home.footer.organizer}</span>
            </p>
            <span className='home-footer-divider' aria-hidden />
            <div className='home-footer-socials'>
              <a
                href='https://facebook.com'
                target='_blank'
                rel='noreferrer'
                className='home-footer-social'
                aria-label={home.footer.socialFacebook}
              >
                <svg
                  viewBox='0 0 24 24'
                  className='home-footer-social-facebook'
                  fill='currentColor'
                  aria-hidden
                >
                  <path d='M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978.401 0 .955.042 1.468.103a8.68 8.68 0 0 1 1.141.195v3.325a8.623 8.623 0 0 0-.653-.036c-1.934 0-2.525.931-2.525 2.666v1.305h3.701l-.594 3.667h-3.107v7.98H9.101z' />
                </svg>
              </a>
              <a
                href='https://youtube.com'
                target='_blank'
                rel='noreferrer'
                className='home-footer-social'
                aria-label={home.footer.socialYoutube}
              >
                <svg viewBox='0 0 24 24' className='size-4' fill='currentColor' aria-hidden>
                  <path d='M21.6 7.2a2.7 2.7 0 0 0-1.9-1.9C18 5 12 5 12 5s-6 0-7.7.3A2.7 2.7 0 0 0 2.4 7.2 28.4 28.4 0 0 0 2 12a28.4 28.4 0 0 0 .4 4.8 2.7 2.7 0 0 0 1.9 1.9C6 19 12 19 12 19s6 0 7.7-.3a2.7 2.7 0 0 0 1.9-1.9A28.4 28.4 0 0 0 22 12a28.4 28.4 0 0 0-.4-4.8zM10 15.2V8.8L15.5 12 10 15.2z' />
                </svg>
              </a>
              <a
                href='mailto:contact@gec.vn'
                className='home-footer-social'
                aria-label={home.footer.socialEmail}
              >
                <Mail className='size-4' strokeWidth={1.75} />
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
