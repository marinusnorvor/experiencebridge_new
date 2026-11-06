import type { Metadata } from "next";
import { Eye, HandHeart, Hammer, MapPin, ScrollText } from "lucide-react";
import { Reveal } from "@/components/marketing/reveal";
import { GuillocheRosette } from "@/components/marketing/guilloche";
import { CtaBand, MarketingFooter, Section, SectionHeading } from "@/components/marketing/layout";

export const metadata: Metadata = {
  title: "About",
  description: "ExperienceBridge is built by Team JAMS to turn real work into verified experience for young people in Ghana and across Africa.",
};

const VALUES = [
  { icon: ScrollText, title: "Proof over promises", body: "What you've actually done matters more than how long you've been somewhere." },
  { icon: HandHeart, title: "Access for everyone", body: "Real experience shouldn't depend on who you know or where you studied." },
  { icon: Eye, title: "Honest evidence", body: "We only record what was reviewed, and we keep each reviewer's verdict separate." },
  { icon: Hammer, title: "Learning by doing", body: "The fastest way to grow is to deliver real work with someone guiding you." },
  { icon: MapPin, title: "Built in Ghana, for Africa", body: "We start with the challenges young people face here, and design for phones first." },
];

export default function AboutPage() {
  return (
    <>
      <main>
        <section className="relative overflow-hidden px-4 pb-16 pt-16 sm:px-6 md:pb-24 md:pt-24">
          <GuillocheRosette className="pointer-events-none absolute -right-40 -top-40 -z-10 size-[560px] text-brand-600/[0.08]" />
          <div className="mx-auto max-w-[1200px]">
            <p className="text-[13px] font-semibold text-brand-600">About ExperienceBridge</p>
            <h1 className="mt-4 max-w-4xl text-[40px] font-semibold leading-[1.04] tracking-[-0.03em] text-ink-900 sm:text-[56px] lg:text-[64px]">
              We&rsquo;re building the bridge between learning and a first job.
            </h1>
            <p className="mt-6 max-w-2xl text-[18px] leading-relaxed text-ink-500">
              Young people finish school with skills but no proof of experience. ExperienceBridge gives them real projects from real organisations, guidance from a mentor, and a verified record of what they delivered.
            </p>
          </div>
        </section>

        <Section className="bg-surface" inner="grid gap-12 md:grid-cols-2">
          <SectionHeading eyebrow="Our mission" title="Make experience something you can earn, not just wait for." />
          <div className="space-y-5 text-[17px] leading-relaxed text-ink-700">
            <p>One in five Ghanaians aged 15–35 is unemployed <span className="text-[13px] text-ink-500">(Ghana Statistical Service, 2025)</span>. At the same time, research shows that years of experience barely predict how well someone does a job <span className="text-[13px] text-ink-500">(Van Iddekinge et al., 2019: r ≈ 0.06)</span>.</p>
            <p>What employers really need to know is what someone has done and who can vouch for it. So we built a place where organisations post short, real projects, students deliver them with a mentor, and every finished project becomes an entry in an Experience Passport.</p>
            <p>Each entry keeps the organisation&rsquo;s decision and the mentor&rsquo;s review separate, so it never claims more than what actually happened.</p>
          </div>
        </Section>

        <Section id="values">
          <SectionHeading eyebrow="What we believe" title="Our values." />
          <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {VALUES.map((v, i) => (
              <Reveal as="li" key={v.title} delay={i * 0.05} className={i === 0 ? "rounded-[20px] bg-ink-900 p-7 text-white sm:col-span-2 lg:col-span-1" : "rounded-[20px] border border-line bg-surface p-7 shadow-card transition hover:-translate-y-0.5"}>
                <v.icon className={i === 0 ? "size-6 text-gold-400" : "size-6 text-brand-600"} aria-hidden />
                <h3 className={i === 0 ? "mt-5 text-[20px] font-semibold text-white" : "mt-5 text-[20px] font-semibold text-ink-900"}>{v.title}</h3>
                <p className={i === 0 ? "mt-2 text-[15px] leading-relaxed text-white/70" : "mt-2 text-[15px] leading-relaxed text-ink-500"}>{v.body}</p>
              </Reveal>
            ))}
          </ul>
        </Section>

        <Section id="team" className="bg-surface">
          <SectionHeading eyebrow="The team" title="Built by Team JAMS for the XANIX Challenge 2026." lede="We're a small team of developers in Ghana building the platform we wish we'd had." />
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-[20px] border border-line bg-canvas p-6">
              <span className="grid size-12 place-items-center rounded-full bg-ink-900 text-sm font-semibold text-white" aria-hidden>MN</span>
              <p className="mt-4 text-[17px] font-semibold text-ink-900">Marinus Norvor</p>
              <p className="text-[15px] text-ink-500">Team lead</p>
            </div>
            <div className="flex items-center rounded-[20px] border border-dashed border-line-strong p-6 text-[15px] text-ink-500 sm:col-span-1 lg:col-span-2">
              Full team bios coming soon.
            </div>
          </div>
        </Section>

        <CtaBand title="Help us build the bridge." lede="Try ExperienceBridge as a student, an organisation or a mentor, and tell us what to improve." />
      </main>
      <MarketingFooter />
    </>
  );
}
