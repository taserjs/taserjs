'use client'

import { motion } from 'framer-motion'

import { SectionAccent, SectionHeader } from './section-header'
import { SectionSeparator } from './section-separator'

type Testimonial = {
  quote: string
  name: string
  role: string
  initials: string
}

const testimonials: Testimonial[] = [
  {
    quote:
      'We stopped writing OpenAPI by hand and still got a typed client. The route file is the contract.',
    name: 'Maya Chen',
    role: 'Staff engineer, API platform',
    initials: 'MC',
  },
  {
    quote:
      'Layouts plus middleware typing saved us from bugs we used to catch in staging. Query and body just show up on ctx.',
    name: 'Priya Nair',
    role: 'Senior engineer, fintech',
    initials: 'PN',
  },
  {
    quote:
      'Returns maps for 200 vs 404 made error handling honest. Reviewers stop arguing about response shapes.',
    name: 'Chris Adeyemi',
    role: 'Principal engineer',
    initials: 'CA',
  },
]

function TestimonialCard({ item }: { item: Testimonial }) {
  return (
    <figure className="rounded-xl border border-fd-border bg-fd-card p-5 shadow-sm">
      <blockquote className="text-sm leading-relaxed text-fd-muted-foreground">
        “
        {item.quote}
        ”
      </blockquote>
      <figcaption className="mt-4 flex items-center gap-3">
        <span
          className="flex size-9 items-center justify-center rounded-full border border-fd-border bg-fd-muted text-xs font-semibold text-fd-foreground"
          aria-hidden
        >
          {item.initials}
        </span>
        <div>
          <p className="text-sm font-medium text-fd-foreground">{item.name}</p>
          <p className="text-xs text-fd-muted-foreground">{item.role}</p>
        </div>
      </figcaption>
    </figure>
  )
}

export function TestimonialsSection() {
  return (
    <section className="relative bg-fd-background py-16 md:py-24">
      <SectionSeparator />
      <motion.div
        className="mx-auto max-w-(--fd-layout-width) px-6"
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-80px' }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        <SectionHeader
          className="mb-10"
          animated={false}
          title={
            <>
              What <SectionAccent>builders</SectionAccent> are saying
            </>
          }
          description="Typed routes and a matching client change how APIs get reviewed and shipped."
        />

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {testimonials.map(item => (
            <TestimonialCard key={item.name} item={item} />
          ))}
        </div>
      </motion.div>
    </section>
  )
}
