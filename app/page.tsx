import Image from 'next/image'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { Section, Kicker, GoldDivider } from '@/components/Section'

export default function Home() {
  return (
    <>
      <Header />

      <main style={{ paddingTop: '64px' }}>

        {/* ─── HERO ─────────────────────────────────────────── */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            padding: '3rem 1.5rem 4rem',
            position: 'relative',
            zIndex: 1,
          }}
        >
          {/* Ambient glow behind image */}
          <div
            aria-hidden
            style={{
              position: 'absolute',
              top: '40%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '800px',
              height: '500px',
              borderRadius: '50%',
              background: 'radial-gradient(ellipse, rgba(210,57,248,0.15) 0%, rgba(200,168,72,0.05) 50%, transparent 70%)',
              pointerEvents: 'none',
              filter: 'blur(40px)',
            }}
          />

          {/* Event label */}
          <p
            style={{
              fontSize: '0.7rem',
              letterSpacing: '0.3em',
              textTransform: 'uppercase',
              color: '#D239F8',
              marginBottom: '2rem',
              opacity: 0.85,
            }}
          >
            What If 2026 · Theme Camp
          </p>

          {/* Hero image */}
          <div
            style={{
              position: 'relative',
              width: '100%',
              maxWidth: '900px',
              borderRadius: '1.25rem',
              overflow: 'hidden',
              boxShadow: '0 0 60px rgba(210, 57, 248, 0.25), 0 0 120px rgba(200, 168, 72, 0.1), 0 32px 80px rgba(0,0,0,0.6)',
              border: '1px solid rgba(200, 168, 72, 0.2)',
            }}
          >
            <Image
              src="/glaum-camp.png"
              alt="Glåüm Camp — Gather, Connect, Attune. Sponsored by Shrimp™"
              width={1200}
              height={675}
              priority
              style={{ width: '100%', height: 'auto', display: 'block' }}
            />
          </div>

          {/* Tagline + CTAs */}
          <p
            style={{
              fontSize: 'clamp(1rem, 3vw, 1.2rem)',
              fontStyle: 'italic',
              maxWidth: '480px',
              lineHeight: 1.75,
              opacity: 0.8,
              marginTop: '2.5rem',
              marginBottom: '2.25rem',
            }}
          >
            Built by many hands. Held by many hearts.
          </p>
        </div>

        <div style={{ height: '1px', background: 'linear-gradient(90deg, transparent, rgba(210,57,248,0.4), transparent)' }} />

        {/* ─── ABOUT ────────────────────────────────────────── */}
        <Section id="about">
          <Kicker>What is this, exactly</Kicker>
          <h2 style={{ fontFamily: 'TokyoDreams, serif', fontSize: 'clamp(2rem, 5vw, 3rem)', marginBottom: '1.5rem', lineHeight: 1.15, textAlign: 'center' }}>
            A camp. A collective.
          </h2>
          <p style={{ fontSize: '1.05rem', lineHeight: 1.8, marginBottom: '1.25rem' }}>
            Glåüm is a participatory theme camp rooted in art, absurdity, care, and the belief that humans do better when they have spaces to gather, create, and feel connected. We arrive at What If with carpets, strange music, soft lighting, improbable conversations, and an unwavering commitment to making people feel genuinely welcomed.
          </p>
          <p style={{ fontSize: '1.05rem', lineHeight: 1.8, marginBottom: '0.5rem' }}>
            We are sponsored by Shrimp™.
          </p>
          <p style={{ fontSize: '1.05rem', lineHeight: 1.8, marginBottom: '1.25rem' }}>
            The exact nature of this sponsorship remains unclear, but signs of approval continue to accumulate.
          </p>
          <p style={{ fontSize: '1.05rem', lineHeight: 1.8, fontStyle: 'italic', opacity: 0.7 }}>
            Glåüm is satirical in form and sincere in practice. We borrow from the aesthetics of mysterious organizations, ceremonial weirdness, and light bureaucratic absurdity because it's funny — but also because ritual, participation, and shared meaning genuinely matter.
          </p>
        </Section>

        <div style={{ height: '1px', background: 'linear-gradient(90deg, transparent, rgba(200,168,72,0.2), transparent)' }} />

        {/* ─── PARTICIPATE ──────────────────────────────────── */}
        <Section id="participate">
          <Kicker>How to be in it</Kicker>
          <h2 style={{ fontFamily: 'TokyoDreams, serif', fontSize: 'clamp(2rem, 5vw, 3rem)', marginBottom: '1.5rem', textAlign: 'center' }}>
            This Camp Runs on Participation
          </h2>
          <p style={{ fontSize: '1.05rem', lineHeight: 1.8, marginBottom: '2.5rem' }}>
            The Many Hands hold us all up. Sometimes we do the carrying. Sometimes we are carried. Everyone contributes in some way: setup, teardown, cooking, welcoming, cleaning, decorating, emotional support, infrastructure, care.
          </p>
          <div style={{ textAlign: 'center' }}>
          <a
            href="/apply"
            style={{
              display: 'inline-block',
              padding: '0.9rem 2.75rem',
              borderRadius: '9999px',
              border: '1px solid rgba(200,168,72,0.5)',
              color: '#FFFACD',
              textDecoration: 'none',
              letterSpacing: '0.12em',
              fontSize: '0.85rem',
              fontFamily: 'TokyoDreams, serif',
              backgroundColor: 'transparent',
              transition: 'all 0.25s',
            }}
          >
            Apply to Camp
          </a>
          </div>
        </Section>

        <div style={{ height: '1px', background: 'linear-gradient(90deg, transparent, rgba(200,168,72,0.2), transparent)' }} />

        {/* ─── SCHEDULE ─────────────────────────────────────── */}
        <Section id="schedule" style={{ backgroundColor: 'rgba(210, 57, 248, 0.03)' }}>
          <Kicker>When things happen</Kicker>
          <h2 style={{ fontFamily: 'TokyoDreams, serif', fontSize: 'clamp(2rem, 5vw, 3rem)', marginBottom: '0.5rem', textAlign: 'center' }}>
            Schedule
          </h2>
          <p style={{ opacity: 0.6, fontStyle: 'italic', marginBottom: '3rem', fontSize: '0.9rem' }}>
            All times approximate. Attunement is not bound by the clock.
          </p>

          {[
            {
              day: 'Tuesday, July 22',
              events: [
                { time: null, title: 'Early Arrival / Infrastructure Setup', desc: null },
              ],
            },
            {
              day: 'Wednesday, July 23',
              events: [
                { time: 'Morning / Afternoon', title: 'Decor & Atmosphere Day', desc: null },
                { time: 'Evening', title: 'Glåüm Salon — Soft Opening', desc: '8pm–1am' },
              ],
            },
            {
              day: 'Thursday, July 24',
              events: [
                { time: 'Evening', title: 'Glåüm Salon', desc: '8pm–2am' },
              ],
            },
            {
              day: 'Friday, July 25',
              events: [
                { time: '4pm–7pm', title: 'Glåüm Initiation Ceremony', desc: null },
                { time: 'Evening', title: 'Glåüm Salon', desc: '9pm–2am' },
              ],
            },
            {
              day: 'Saturday, July 26',
              events: [
                { time: 'Evening', title: 'Glåüm Salon', desc: '8pm–1am' },
              ],
            },
            {
              day: 'Sunday, July 27',
              events: [
                { time: null, title: 'Teardown / Departure', desc: null },
              ],
            },
          ].map(({ day, events }) => (
            <div key={day} style={{ marginBottom: '2.5rem' }}>
              <h3
                style={{
                  fontFamily: 'TokyoDreams, serif',
                  fontSize: '1.2rem',
                  color: '#D239F8',
                  marginBottom: '1rem',
                  paddingBottom: '0.5rem',
                  borderBottom: '1px solid rgba(210,57,248,0.2)',
                }}
              >
                {day}
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {events.map(({ time, title, desc }) => (
                  <div
                    key={title}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: time ? '140px 1fr' : '1fr',
                      gap: '1rem',
                      padding: '0.85rem 1rem',
                      borderRadius: '0.5rem',
                      backgroundColor: 'rgba(255,255,255,0.02)',
                      border: '1px solid rgba(200,168,72,0.08)',
                    }}
                  >
                    {time && (
                      <span style={{ fontSize: '0.8rem', color: '#C8A848', opacity: 0.65, paddingTop: '0.15rem', letterSpacing: '0.04em' }}>
                        {time}
                      </span>
                    )}
                    <div>
                      <p style={{ fontWeight: 700, fontSize: '0.95rem', color: '#F3EDE6', marginBottom: desc ? '0.2rem' : 0 }}>{title}</p>
                      {desc && <p style={{ fontSize: '0.82rem', opacity: 0.5, letterSpacing: '0.04em' }}>{desc}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </Section>


      </main>

      <Footer />
    </>
  )
}
