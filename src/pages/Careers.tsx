import { Link } from "react-router-dom";
import { Sparkles, Heart, Users, Mail, ArrowLeft, CheckCircle2, Award } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const ATELIER_VALUES = [
  {
    icon: Sparkles,
    title: "Artisanal Integrity",
    description: "We honor ancient maceration rituals, small-batch hand-compounding, and harvest-grade botanicals over industrial speed.",
  },
  {
    icon: Heart,
    title: "Uncompromising Passion",
    description: "Every flacon represents devotion to olfactive storytelling, evocative chords, and enduring skin chemistry.",
  },
  {
    icon: Users,
    title: "Collaborative Craft",
    description: "We cultivate a sanctuary where perfume compounding assistants, bottle artisans, and storytellers refine their senses.",
  },
  {
    icon: Award,
    title: "Heritage & Modernity",
    description: "Rooted in the timeless distilling traditions of India while mastering French haute perfumery aesthetics.",
  },
];

const Careers = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Hero Header */}
      <section className="py-16 lg:py-24 text-center border-b border-border/80 bg-[#F7F4EE] dark:bg-[#141211]">
        <div className="container mx-auto px-4 max-w-3xl">
          <span className="text-[10px] font-semibold tracking-[0.3em] text-[#C5A880] uppercase mb-2 block">
            Atelier Talent & Artisanship
          </span>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-serif font-medium text-foreground tracking-tight mb-4">
            Join Our Atelier
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-xl mx-auto">
            Discover the artisanal devotion behind AURIX. We are an independent fragrance maison rooted in Ahmedabad, crafting olfactory poetry from raw resins, noble woods, and precious botanicals.
          </p>
        </div>
      </section>

      {/* Philosophy & Culture */}
      <section className="py-16 container mx-auto px-4 lg:px-8 max-w-4xl">
        <div className="text-center mb-12">
          <span className="text-xs font-semibold tracking-[0.25em] text-[#C5A880] uppercase mb-2 block">
            Our Olfactive Ethos
          </span>
          <h2 className="text-2xl sm:text-3xl font-serif font-medium text-foreground tracking-tight">
            The Culture of Haute Perfumery
          </h2>
          <div className="w-12 h-[1px] bg-[#C5A880] mx-auto mt-3"></div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16">
          {ATELIER_VALUES.map((val, idx) => (
            <Card key={idx} className="bg-card border-border shadow-sm rounded-xl p-2">
              <CardContent className="p-6 space-y-3">
                <div className="w-10 h-10 rounded-full bg-[#C5A880]/10 flex items-center justify-center text-[#C5A880]">
                  <val.icon className="w-5 h-5" />
                </div>
                <h3 className="font-serif text-lg font-semibold text-foreground">{val.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{val.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Current Vacancies Status Banner */}
        <div className="rounded-xl border border-border bg-card shadow-sm p-8 text-center space-y-4 mb-16">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-muted text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#C5A880]" />
            Atelier Roster Status
          </span>
          <h3 className="font-serif text-2xl font-medium text-foreground">
            Current Vacancy Status
          </h3>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-xl mx-auto leading-relaxed">
            Our atelier compounding and creative positions are currently fully staffed, and there are no active public vacancies at this time. However, as an evolving maison, we always cherish discovering extraordinary talent.
          </p>
        </div>

        {/* Speculative Talent Inquiry Box */}
        <div className="rounded-xl border border-[#C5A880]/50 bg-[#C5A880]/10 p-8 text-center space-y-4">
          <Mail className="w-8 h-8 text-[#C5A880] mx-auto" />
          <h3 className="font-serif text-xl sm:text-2xl font-medium text-foreground">
            Expressions of Interest
          </h3>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-xl mx-auto leading-relaxed">
            If you are an apprentice compounding chemist, evaluated nosologist, botanical sourcer, luxury packaging artisan, or visual storyteller who feels an affinity with AURIX, we welcome your dossier.
          </p>
          <p className="text-xs text-foreground font-mono">
            Send your portfolio or CV to: <a href="mailto:aurixperfume25@gmail.com" className="text-[#C5A880] hover:underline font-bold">aurixperfume25@gmail.com</a>
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-3">
            <Button asChild className="btn-gold text-xs uppercase tracking-wider font-semibold">
              <a href="mailto:aurixperfume25@gmail.com?subject=Atelier%20Talent%20Inquiry%20%E2%80%94%20AURIX">
                Send Talent Inquiry
              </a>
            </Button>
            <Button asChild variant="outline" className="border-border text-foreground hover:bg-muted text-xs uppercase tracking-wider font-semibold">
              <Link to="/about">Explore Our Story</Link>
            </Button>
            <Button asChild variant="outline" className="border-border text-foreground hover:bg-muted text-xs uppercase tracking-wider font-semibold">
              <Link to="/contact">Contact Atelier</Link>
            </Button>
          </div>
        </div>

        {/* Back CTA */}
        <div className="mt-12 text-center">
          <Button asChild variant="ghost" className="text-xs uppercase tracking-wider font-semibold text-muted-foreground hover:text-foreground">
            <Link to="/" className="inline-flex items-center gap-2">
              <ArrowLeft className="w-3.5 h-3.5" /> Return to Maison
            </Link>
          </Button>
        </div>
      </section>
    </div>
  );
};

export default Careers;
