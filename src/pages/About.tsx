import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { BookOpen, Sparkles, User, Users, HeartHandshake } from "lucide-react";
import { Link } from "react-router-dom";
import philosophyImage from "@/assets/philosophy-image.jpg";
import usamaMalikPhoto from "@/assets/usama-malik.jpg";
import michelLambertPhoto from "@/assets/michel-lambert.jpg";
import amelieRouxPhoto from "@/assets/amelie-roux.jpg";
import thomasMartinPhoto from "@/assets/thomas-martin.jpg";

const About = () => {
  return (
    <div className="container mx-auto px-4 lg:px-8 py-12 max-w-6xl">
      {/* Hero Section */}
      <div className="text-center mb-14 sm:mb-16 max-w-2xl mx-auto px-2">
        <span className="text-[10px] sm:text-xs font-semibold tracking-[0.3em] text-[#C5A880] uppercase mb-2 block">
          Heritage & Vision
        </span>
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-medium text-foreground tracking-tight mb-3 sm:mb-4">
          The Story of AURIX
        </h1>
        <p className="text-muted-foreground text-xs sm:text-sm leading-relaxed">
          Founded on a devotion to rare botanical harvests and traditional distillation, AURIX crafts perfumes that honor the historic lineage of French and Oriental perfumery.
        </p>
      </div>

      {/* Brand Philosophy */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-10 lg:gap-16 mb-20 sm:mb-24 items-center">
        <div className="rounded-xl overflow-hidden border border-border shadow-md">
          <img 
            src={philosophyImage} 
            alt="Artisanal perfume compounding" 
            className="aspect-[4/3] sm:aspect-auto sm:h-96 w-full object-cover hover:scale-105 transition-transform duration-700" 
          />
        </div>
        <div className="space-y-6">
          <span className="text-xs font-semibold tracking-[0.25em] text-[#C5A880] uppercase block">
            Our Guiding Creed
          </span>
          <h2 className="text-2xl sm:text-3xl font-serif font-medium text-foreground tracking-tight">
            An Intimate Expression of Identity
          </h2>
          <p className="text-muted-foreground text-xs sm:text-sm leading-relaxed">
            At AURIX, we perceive fragrance as a silent language. It unfolds uniquely upon each skin chemistry, evoking cherished memories, subtle magnetism, and enduring elegance.
          </p>
          <p className="text-muted-foreground text-xs sm:text-sm leading-relaxed">
            Our creative process adheres strictly to three tenets: wild-harvested sustainable absolutes, rigorous maceration periods, and emotionally resonant compositions that never compromise on longevity.
          </p>
          <div className="grid grid-cols-2 gap-4 pt-2">
            <div className="flex items-center gap-3">
              <BookOpen className="text-[#C5A880] w-5 h-5 shrink-0" />
              <span className="text-xs font-semibold text-foreground">Artisanal Small-Batch</span>
            </div>
            <div className="flex items-center gap-3">
              <Sparkles className="text-[#C5A880] w-5 h-5 shrink-0" />
              <span className="text-xs font-semibold text-foreground">Ethical Raw Sourcing</span>
            </div>
            <div className="flex items-center gap-3">
              <User className="text-[#C5A880] w-5 h-5 shrink-0" />
              <span className="text-xs font-semibold text-foreground">Bespoke Identity</span>
            </div>
            <div className="flex items-center gap-3">
              <Users className="text-[#C5A880] w-5 h-5 shrink-0" />
              <span className="text-xs font-semibold text-foreground">Collaborative Mastery</span>
            </div>
          </div>
        </div>
      </div>

      {/* Our Process */}
      <div className="mb-20 sm:mb-24">
        <div className="text-center mb-10 sm:mb-12">
          <span className="text-xs font-semibold tracking-[0.25em] text-[#C5A880] uppercase mb-2 block">
            Craftsmanship
          </span>
          <h2 className="text-2xl sm:text-3xl font-serif font-medium text-foreground tracking-tight">
            From Blossom to Flacon
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
          {[
            {
              title: "Ethical Harvest",
              description: "We work directly with artisanal growers to source Bulgarian Damask roses, aged Cambodian agarwood, and Bourbon vanilla."
            },
            {
              title: "Artisanal Maceration",
              description: "Compositions mature undisturbed for up to 60 days in dark glass vessels, ensuring full olfactive synergy and roundness."
            },
            {
              title: "Precision Bottling",
              description: "Each numbered flacon is hand-filled, sealed with a magnetic cap, and packaged in our signature presentation cases."
            }
          ].map((step, index) => (
            <Card key={index} className="bg-card border border-border rounded-xl shadow-sm p-5 sm:p-6 hover:border-[#C5A880]/50 transition-colors">
              <CardContent className="p-0">
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mb-4 text-[#C5A880] font-serif font-bold text-sm">
                  0{index + 1}
                </div>
                <h3 className="font-serif text-lg font-medium text-foreground mb-2">{step.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{step.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Meet Our Team */}
      <div className="mb-20 sm:mb-24">
        <div className="text-center mb-10 sm:mb-12">
          <span className="text-xs font-semibold tracking-[0.25em] text-[#C5A880] uppercase mb-2 block">
            The Atelier
          </span>
          <h2 className="text-2xl sm:text-3xl font-serif font-medium text-foreground tracking-tight">
            The Hands Behind AURIX
          </h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
          {[
            {
              name: "Usama Malik",
              position: "Founder & Creative Director",
              bio: "Bringing a lifelong passion for heritage attars and modern French perfumery to steer the creative vision of AURIX.",
              photo: usamaMalikPhoto
            },
            {
              name: "Michel Lambert",
              position: "Master Perfumer",
              bio: "ISIPCA alumnus with 15 years dedicated to crafting complex ambery and woody bouquets with exceptional sillage.",
              photo: michelLambertPhoto
            },
            {
              name: "Amélie Roux",
              position: "Naturals Specialist",
              bio: "Curates relationships with heritage distillers globally to guarantee raw material purity and sustainability.",
              photo: amelieRouxPhoto
            },
            {
              name: "Thomas Martin",
              position: "Design & Presentation",
              bio: "Sculpts the visual identity and bespoke glass flacons so the tactile experience mirrors the luxury within.",
              photo: thomasMartinPhoto
            }
          ].map((member, index) => (
            <Card key={index} className="overflow-hidden bg-card border border-border rounded-xl shadow-sm hover:shadow-md transition-shadow flex flex-col">
              {member.photo ? (
                <div className="aspect-[4/5] sm:h-64 sm:aspect-auto overflow-hidden bg-muted/40">
                  <img 
                    src={member.photo} 
                    alt={member.name} 
                    loading="lazy"
                    className="h-full w-full object-cover hover:scale-105 transition-transform duration-500" 
                  />
                </div>
              ) : (
                <div className="aspect-[4/5] sm:h-64 sm:aspect-auto bg-muted"></div>
              )}
              <CardContent className="p-3.5 sm:p-5 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="font-serif text-sm sm:text-base font-semibold text-foreground mb-0.5">{member.name}</h3>
                  <p className="text-[#C5A880] text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider mb-2">{member.position}</p>
                  <p className="text-[11px] sm:text-xs text-muted-foreground leading-relaxed line-clamp-3 sm:line-clamp-none">{member.bio}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Commitment */}
      <div className="bg-card border border-border/80 p-6 sm:p-12 rounded-xl mb-16 sm:mb-20 shadow-sm">
        <div className="max-w-2xl mx-auto text-center space-y-4">
          <HeartHandshake className="w-8 h-8 text-[#C5A880] mx-auto" />
          <h2 className="text-2xl sm:text-3xl font-serif font-medium text-foreground">Our Ethical Pledge</h2>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            We pledge total transparency in our sourcing, cruelty-free formulating, and recyclable glass flacons. A portion of every harvest fund supports the communities where our botanical crops are hand-gathered.
          </p>
          <Separator className="my-6 bg-border/80" />
          <p className="font-serif italic text-sm text-foreground/80">
            "To bottle a fragrance is to encapsulate a memory—a fleeting instant that can be vividly resurrected with a single breath."
          </p>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[#C5A880]">— Usama Malik, Founder</p>
        </div>
      </div>

      {/* Call to Action */}
      <div className="text-center max-w-xl mx-auto">
        <h2 className="text-2xl sm:text-3xl font-serif font-medium text-foreground mb-3">Experience Haute Perfumery</h2>
        <p className="text-xs sm:text-sm text-muted-foreground mb-8 leading-relaxed">
          Explore our collection of meticulously blended perfumes and traditional attars.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button asChild className="btn-gold px-8 py-3.5">
            <Link to="/products">Explore Collection</Link>
          </Button>
          <Button asChild variant="outline" className="rounded-md border-border text-foreground hover:bg-muted text-xs uppercase tracking-wider font-semibold px-8 py-3.5">
            <Link to="/contact">Contact Concierge</Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default About;
